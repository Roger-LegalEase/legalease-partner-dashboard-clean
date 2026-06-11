import "server-only";

import { logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { requireInternalAdminSession } from "@/lib/partners/session-partner";
import { isPilotRequestStatus, type PilotRequestStatus } from "@/lib/partners/pilot-request-status";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type InternalPilotRequest = {
  id: string;
  createdAt: string;
  contactName: string;
  organizationName: string;
  email: string;
  phone?: string;
  roleTitle?: string;
  organizationType: string;
  stateOrJurisdiction: string;
  communityServed: string;
  estimatedPeopleServed?: string;
  interestedWorkflow?: string;
  message?: string;
  status: PilotRequestStatus;
  source: string;
};

type PilotRequestRow = {
  id: string;
  created_at: string;
  contact_name: string;
  organization_name: string;
  email: string;
  phone: string | null;
  role_title: string | null;
  organization_type: string;
  state_or_jurisdiction: string;
  community_served: string;
  estimated_people_served: string | null;
  interested_workflow: string | null;
  message: string | null;
  status: string;
  source: string;
};

export async function listPilotRequestsForInternalAdmin() {
  try {
    await requireInternalAdminSession();
    logSecurityInfo({ event: "pilot_queue access allowed", route: "/internal/pilot-requests", outcome: "allowed" });
  } catch (error) {
    logSecurityWarn({ event: "pilot_queue access denied", route: "/internal/pilot-requests", outcome: "denied", error });
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    logSecurityError({ event: "pilot_queue load fail", route: "/internal/pilot-requests", outcome: "supabase_not_configured" });
    throw new Error("Supabase service-role client is not configured.");
  }

  const { data, error } = await supabase
    .from("partner_pilot_requests")
    .select(
      [
        "id",
        "created_at",
        "contact_name",
        "organization_name",
        "email",
        "phone",
        "role_title",
        "organization_type",
        "state_or_jurisdiction",
        "community_served",
        "estimated_people_served",
        "interested_workflow",
        "message",
        "status",
        "source"
      ].join(", ")
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    logSecurityError({ event: "pilot_queue load fail", route: "/internal/pilot-requests", outcome: "db_error", error });
    throw new Error(`Unable to load pilot requests: ${error.message}`);
  }

  return ((data ?? []) as unknown as PilotRequestRow[]).map(mapPilotRequestRow);
}

export async function updatePilotRequestStatusForInternalAdmin(id: string, status: PilotRequestStatus) {
  try {
    await requireInternalAdminSession();
    logSecurityInfo({ event: "pilot_queue update gate allowed", route: "/api/internal/pilot-requests/status", outcome: "allowed", metadata: { row_id: id, new_status: status } });
  } catch (error) {
    logSecurityWarn({ event: "pilot_queue update gate denied", route: "/api/internal/pilot-requests/status", outcome: "denied", error });
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    logSecurityError({ event: "pilot_queue status_update failure", route: "/api/internal/pilot-requests/status", outcome: "supabase_not_configured", metadata: { row_id: id, new_status: status } });
    throw new Error("Supabase service-role client is not configured.");
  }

  const { error } = await supabase
    .from("partner_pilot_requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    logSecurityError({ event: "pilot_queue status_update failure", route: "/api/internal/pilot-requests/status", outcome: "db_error", error, metadata: { row_id: id, new_status: status } });
    throw new Error(`Unable to update pilot request: ${error.message}`);
  }
}

function mapPilotRequestRow(row: PilotRequestRow): InternalPilotRequest {
  return {
    id: row.id,
    createdAt: row.created_at,
    contactName: row.contact_name,
    organizationName: row.organization_name,
    email: row.email,
    phone: optionalString(row.phone),
    roleTitle: optionalString(row.role_title),
    organizationType: row.organization_type,
    stateOrJurisdiction: row.state_or_jurisdiction,
    communityServed: row.community_served,
    estimatedPeopleServed: optionalString(row.estimated_people_served),
    interestedWorkflow: optionalString(row.interested_workflow),
    message: optionalString(row.message),
    status: isPilotRequestStatus(row.status) ? row.status : "new",
    source: row.source
  };
}

function optionalString(value: string | null) {
  return value?.trim() ? value : undefined;
}
