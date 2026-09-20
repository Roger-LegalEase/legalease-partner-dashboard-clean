import "server-only";

import { createHash } from "node:crypto";
import type { ScreeningEvaluation } from "@/lib/rcap-engine/contracts";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const COLORADO_JUVENILE_PATHWAY = "juvenile-expungement-19-1-306";

export type ClinicReviewTreatment = {
  queueStatus: "attorney_review";
  routeDisposition: "referral";
  participantSafeMessage: string;
  internalNotes: string;
};

export function clinicReviewTreatmentFor(evaluation: ScreeningEvaluation): ClinicReviewTreatment | null {
  if (
    evaluation.jurisdiction !== "CO"
    || evaluation.pathwayId !== COLORADO_JUVENILE_PATHWAY
    || evaluation.resultCode !== "guidance_only"
  ) return null;

  return {
    queueStatus: "attorney_review",
    routeDisposition: "referral",
    participantSafeMessage:
      "Your Colorado juvenile-expungement matter is saved. The required JDF 302 filing packet cannot currently be safely generated. Clinic staff will follow up with guidance or attorney-review options. No payment is due, no packet credit is used, and no render job is started.",
    internalNotes:
      "CO juvenile § 19-1-306 release treatment: registry gap; no approved JDF 302 packet set or deterministic renderer. Preserve the matter and route to attorney review; do not promise or simulate a packet."
  };
}

export type ClinicCaseTreatment = {
  queueStatus: "attorney_review" | "packet_ready";
  routeDisposition: "referral" | "packet";
};

/**
 * Bind every packet-capable Clinic claim to its saved matter before sponsored
 * finalization. Non-packet outcomes remain unchanged unless they have an
 * explicit Clinic review treatment above.
 */
export function clinicCaseTreatmentFor(evaluation: ScreeningEvaluation): ClinicCaseTreatment | null {
  if (evaluation.resultCode === "packet_ready" || evaluation.resultCode === "packet_ready_with_caution") {
    return { queueStatus: "packet_ready", routeDisposition: "packet" };
  }
  const review = clinicReviewTreatmentFor(evaluation);
  return review ? { queueStatus: review.queueStatus, routeDisposition: review.routeDisposition } : null;
}

export async function createClinicReviewFollowUpForSavedMatter(input: {
  participantUserId: string;
  screeningSessionId: string;
  matterId: string;
  evaluation: ScreeningEvaluation;
}) {
  const caseTreatment = clinicCaseTreatmentFor(input.evaluation);
  if (!caseTreatment) return { outcome: "not_required" as const, followUpId: null };
  const reviewTreatment = clinicReviewTreatmentFor(input.evaluation);

  const db = getSupabaseAdminClient();
  if (!db) throw new Error("clinic_follow_up_database_unavailable");

  const assisted = await db
    .from("clinic_assisted_sessions")
    .select("id,event_id")
    .eq("screening_session_id", input.screeningSessionId)
    .eq("participant_user_id", input.participantUserId)
    .in("status", ["active", "handed_off"])
    .gt("expires_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; event_id: string }>();
  if (assisted.error) throw new Error("clinic_follow_up_session_lookup_failed");
  if (!assisted.data) return { outcome: "not_clinic" as const, followUpId: null };

  const clinicCase = await db.rpc("clinic_upsert_case", {
    p_event_id: assisted.data.event_id,
    p_assisted_session_id: assisted.data.id,
    p_participant_user_id: input.participantUserId,
    p_screening_session_id: input.screeningSessionId,
    p_matter_id: input.matterId,
    p_queue_status: caseTreatment.queueStatus,
    p_route_disposition: caseTreatment.routeDisposition,
    p_jurisdiction: input.evaluation.jurisdiction
  });
  if (clinicCase.error || typeof clinicCase.data !== "string") {
    throw new Error("clinic_follow_up_case_binding_failed");
  }

  if (!reviewTreatment) return { outcome: "case_bound" as const, followUpId: null };

  const followUpId = stableUuid(`clinic-review:${clinicCase.data}:${COLORADO_JUVENILE_PATHWAY}`);
  const followUp = await db.from("clinic_follow_ups").upsert({
    id: followUpId,
    event_id: assisted.data.event_id,
    clinic_case_id: clinicCase.data,
    owner_event_staff_id: null,
    due_at: null,
    status: "open",
    communication_state: "draft",
    participant_safe_message: reviewTreatment.participantSafeMessage,
    internal_notes: reviewTreatment.internalNotes,
    created_by: input.participantUserId,
    completed_at: null
  }, { onConflict: "id", ignoreDuplicates: true });
  if (followUp.error) throw new Error("clinic_follow_up_write_failed");

  return { outcome: "created" as const, followUpId };
}

function stableUuid(value: string) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}
