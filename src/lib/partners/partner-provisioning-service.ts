import "server-only";

import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  PARTNER_PROVISIONING_SCHEMA_VERSION,
  validatePartnerProvisioningInput,
  type PartnerProvisioningInput,
  type ValidPartnerProvisioningInput
} from "./partner-provisioning-domain";

// The single canonical partner-provisioning implementation.
//
// The internal provisioning route, the production canary command, and the
// focused verifier all call provisionPartner. There is deliberately no second
// path: a script that wrote these records itself would be a second definition of
// what a provisioned partner is, and the two would drift.
//
// Every write happens inside one database function so a failed child record
// rolls the whole operation back. Nothing here creates an Auth user, a
// membership, an invitation, an access code, an allocation, billing state, or
// any publication or activation.

export type PartnerProvisioningErrorCode =
  | "invalid_input"
  | "not_configured"
  | "forbidden"
  | "slug_conflict"
  | "ambiguous_existing_records"
  | "idempotency_conflict"
  | "write_failed";

export class PartnerProvisioningError extends Error {
  constructor(
    readonly code: PartnerProvisioningErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PartnerProvisioningError";
  }
}

export type PartnerProvisioningResult = {
  created: boolean;
  replayed: boolean;
  partnerSlug: string;
  organizationName: string;
  programName: string;
  administratorName: string;
  administratorEmail: string;
  workspaceStatus: string;
  sectionCount: number;
  milestoneCount: number;
  pageConfigurationCreated: boolean;
  publicationState: "private";
  programActivationState: "inactive";
  participantIntakeState: "inactive";
  accessCodeState: "absent";
  allocationState: "absent";
  billingState: "absent";
  launchedAt: null;
  authUserCreated: false;
  membershipCreated: false;
  invitationCreated: false;
};

export type PartnerProvisioningState = {
  partnerExists: boolean;
  workspaceExists: boolean;
  pageConfigurationExists: boolean;
  sectionCount: number;
  milestoneCount: number;
  membershipCount: number;
  accessCodeCount: number;
  entitlementExists: boolean;
  publicationAuthorized: boolean;
  activationAuthorized: boolean;
  launchedAt: string | null;
};

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type ProvisionRpcRow = {
  partner_record_id: string | null;
  workspace_id: string | null;
  workspace_status: string | null;
  section_count: number | null;
  milestone_count: number | null;
  page_configuration_id: string | null;
  created: boolean | null;
};

export async function provisionPartner(input: {
  values: PartnerProvisioningInput;
  operatorUserId: string;
}): Promise<PartnerProvisioningResult> {
  const validated = validatePartnerProvisioningInput(input.values);
  if (!validated.ok) {
    throw new PartnerProvisioningError("invalid_input", validated.error);
  }
  if (!isUuid(input.operatorUserId)) {
    throw new PartnerProvisioningError(
      "forbidden",
      "An internal LegalEase administrator session is required."
    );
  }
  const value = validated.value;
  const supabase = admin();

  const { data, error } = await supabase.rpc("rcap_service_provision_partner", {
    p_partner_slug: value.partnerSlug,
    p_organization_name: value.organizationName,
    p_legal_organization_name: value.legalOrganizationName,
    p_program_name: value.programName,
    p_program_purpose: value.programPurpose,
    p_administrator_name: value.administratorName,
    p_administrator_email: value.administratorEmail,
    p_clearance_reason: value.clearanceReason,
    p_actor_user_id: input.operatorUserId,
    p_request_id: value.idempotencyKey,
    p_schema_version: PARTNER_PROVISIONING_SCHEMA_VERSION,
    p_payload_hash: provisioningPayloadHash(value)
  });
  if (error) throw provisioningError(error);

  const row = firstRow(data);
  if (!row) {
    throw new PartnerProvisioningError(
      "write_failed",
      "Provisioning did not return a result. Nothing was created."
    );
  }

  return {
    created: row.created === true,
    replayed: row.created !== true,
    partnerSlug: value.partnerSlug,
    organizationName: value.organizationName,
    programName: value.programName,
    administratorName: value.administratorName,
    administratorEmail: value.administratorEmail,
    // Deliberately not the raw ids: identifiers are internal detail and never
    // reach the operator surface or the command output.
    workspaceStatus: String(row.workspace_status ?? "unknown"),
    sectionCount: Number(row.section_count ?? 0),
    milestoneCount: Number(row.milestone_count ?? 0),
    pageConfigurationCreated: Boolean(row.page_configuration_id),
    publicationState: "private",
    programActivationState: "inactive",
    participantIntakeState: "inactive",
    accessCodeState: "absent",
    allocationState: "absent",
    billingState: "absent",
    launchedAt: null,
    authUserCreated: false,
    membershipCreated: false,
    invitationCreated: false
  };
}

/**
 * Read-only provisioning facts, for the canary command's preflight and for the
 * runbook's confirmation steps. Counts and booleans only: no identifier, no
 * email, and nothing that would disclose an unrelated tenant.
 */
export async function readPartnerProvisioningState(
  partnerSlugValue: string
): Promise<PartnerProvisioningState> {
  const supabase = admin();
  const partnerSlug = String(partnerSlugValue ?? "").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/.test(partnerSlug)) {
    throw new PartnerProvisioningError(
      "invalid_input",
      "Enter a valid partner page address."
    );
  }

  const [partner, workspace, pageConfig, memberships, codes, entitlement] =
    await Promise.all([
      supabase
        .from("partner_records")
        .select("payment_status, qualification_status, provisioning_status")
        .eq("partner_slug", partnerSlug)
        .maybeSingle(),
      supabase
        .from("partner_onboarding")
        .select("id, status, landing_page_ready, internal_approved_at, launched_at")
        .eq("partner_slug", partnerSlug)
        .maybeSingle(),
      supabase
        .from("partner_events")
        .select("id", { count: "exact", head: true })
        .eq("partner_slug", partnerSlug)
        .eq("event_type", "partner_page_configuration_record"),
      supabase
        .from("partner_users")
        .select("id", { count: "exact", head: true })
        .eq("partner_slug", partnerSlug),
      supabase
        .from("partner_access_codes")
        .select("id", { count: "exact", head: true })
        .eq("partner_slug", partnerSlug),
      supabase
        .from("partner_entitlement")
        .select("partner_slug")
        .eq("partner_slug", partnerSlug)
        .maybeSingle()
    ]);

  if (partner.error || workspace.error || pageConfig.error || memberships.error || codes.error || entitlement.error) {
    throw new PartnerProvisioningError(
      "write_failed",
      "Provisioning state could not be read right now."
    );
  }

  const workspaceRow = workspace.data as {
    id: string;
    status: string;
    landing_page_ready: boolean;
    internal_approved_at: string | null;
    launched_at: string | null;
  } | null;
  const partnerRow = partner.data as {
    payment_status: string | null;
    qualification_status: string | null;
    provisioning_status: string | null;
  } | null;

  let sectionCount = 0;
  if (workspaceRow) {
    const sections = await supabase
      .from("partner_onboarding_sections")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceRow.id);
    if (sections.error) {
      throw new PartnerProvisioningError(
        "write_failed",
        "Provisioning state could not be read right now."
      );
    }
    sectionCount = sections.count ?? 0;
  }
  const milestones = await supabase
    .from("partner_onboarding_tasks")
    .select("id", { count: "exact", head: true })
    .eq("partner_slug", partnerSlug);
  if (milestones.error) {
    throw new PartnerProvisioningError(
      "write_failed",
      "Provisioning state could not be read right now."
    );
  }

  return {
    partnerExists: Boolean(partnerRow),
    workspaceExists: Boolean(workspaceRow),
    pageConfigurationExists: (pageConfig.count ?? 0) > 0,
    sectionCount,
    milestoneCount: milestones.count ?? 0,
    membershipCount: memberships.count ?? 0,
    accessCodeCount: codes.count ?? 0,
    entitlementExists: Boolean(entitlement.data),
    publicationAuthorized: Boolean(
      workspaceRow &&
        workspaceRow.status === "live" &&
        workspaceRow.landing_page_ready &&
        workspaceRow.internal_approved_at &&
        workspaceRow.launched_at
    ),
    activationAuthorized: Boolean(
      partnerRow &&
        (partnerRow.payment_status === "paid" ||
          partnerRow.payment_status === "demo_paid") &&
        partnerRow.qualification_status === "qualified" &&
        (partnerRow.provisioning_status === "provisioned" ||
          partnerRow.provisioning_status === "active")
    ),
    launchedAt: workspaceRow?.launched_at ?? null
  };
}

/**
 * Whether this exact idempotency key already provisioned this exact partner.
 *
 * A retry after a crashed run has to be able to tell "someone else already took
 * this slug", which must stop, from "my own earlier attempt got this far",
 * which must be allowed to continue so the invitation step can finish. Without
 * this the documented retry is a dead end: the tenant exists, so every re-run
 * refuses, and the operator is pushed toward a new key that then collides on
 * slug uniqueness.
 */
export async function isPartnerProvisioningReplay(input: {
  partnerSlug: string;
  idempotencyKey: string;
}): Promise<boolean> {
  const supabase = admin();
  const partnerSlug = String(input.partnerSlug ?? "").trim().toLowerCase();
  const requestId = String(input.idempotencyKey ?? "").trim().toLowerCase();
  if (!isUuid(requestId)) return false;
  const { data, error } = await supabase
    .from("partner_onboarding_idempotency")
    .select("request_id")
    .eq("request_id", requestId)
    .eq("operation_key", `partner:provision:${partnerSlug}`)
    .maybeSingle();
  if (error) {
    throw new PartnerProvisioningError(
      "write_failed",
      "Provisioning state could not be read right now."
    );
  }
  return Boolean(data);
}

export function provisioningPayloadHash(
  value: ValidPartnerProvisioningInput
): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        PARTNER_PROVISIONING_SCHEMA_VERSION,
        value.partnerSlug,
        value.organizationName,
        value.legalOrganizationName,
        value.programName,
        value.programPurpose,
        value.administratorName,
        value.administratorEmail
      ]),
      "utf8"
    )
    .digest("hex");
}

function admin(): SupabaseAdmin {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new PartnerProvisioningError(
      "not_configured",
      "Partner provisioning is not configured."
    );
  }
  return supabase;
}

/**
 * Database failures are translated here and nowhere else, so no caller ever
 * forwards a Postgres message, constraint name, or identifier to a person.
 */
function provisioningError(error: {
  code?: string;
  message?: string;
}): PartnerProvisioningError {
  const message = error.message ?? "";
  if (error.code === "42501" || /internal administrator/i.test(message)) {
    return new PartnerProvisioningError(
      "forbidden",
      "This operation is not available for your account."
    );
  }
  if (error.code === "22023" || /invalid partner provisioning/i.test(message)) {
    return new PartnerProvisioningError(
      "invalid_input",
      "Check the provisioning details and try again."
    );
  }
  if (/idempotency request mismatch/i.test(message)) {
    return new PartnerProvisioningError(
      "idempotency_conflict",
      "That retry does not match the original request."
    );
  }
  if (/ambiguous existing records/i.test(message)) {
    return new PartnerProvisioningError(
      "ambiguous_existing_records",
      "Records already exist for that page address. Nothing was created."
    );
  }
  if (error.code === "23505" || /already exists/i.test(message)) {
    return new PartnerProvisioningError(
      "slug_conflict",
      "That partner page address is already in use."
    );
  }
  return new PartnerProvisioningError(
    "write_failed",
    "Provisioning did not complete. Nothing was created."
  );
}

function firstRow(data: unknown): ProvisionRpcRow | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object" ? (first as ProvisionRpcRow) : null;
  }
  return data && typeof data === "object" ? (data as ProvisionRpcRow) : null;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}
