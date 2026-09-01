import "server-only";

import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
import { clampAuthoritativeMatterInput } from "@/lib/expungement-ai/briefcase";
import { buildSaveInput } from "@/lib/expungement-ai/save-result-policy";
import { claimTokenHash, isWellFormedClaimToken } from "@/lib/expungement-ai/claim/claim-token";
import { exactMatterPath } from "@/lib/expungement-ai/claim/matter-path";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ScreeningAnswerValue, ScreeningEvaluation } from "@/lib/rcap-engine/contracts";
import type { CreateConsumerBriefcaseItemInput } from "@/lib/expungement-ai/types";

/**
 * The one claim service. Expungement.ai and RCAP both come through here.
 *
 * Contract §7. The whole ownership transfer is a single database transaction --
 * `public.claim_pending_screening_result` -- which locks the pending result,
 * verifies the single-use token, creates exactly one participant-owned matter
 * keyed by `source_pending_result_id`, marks the pending result claimed and
 * writes an append-only audit event. There is no arrangement in which a matter
 * exists and the pending result is not claimed, and no arrangement in which a
 * failure to record the claim still reports success.
 *
 * Analytics and follow-up work happen strictly after that transaction commits,
 * are idempotent, and can never turn a successful claim into a failure.
 */

export type ClaimOutcome =
  | "claimed"
  | "idempotent_replay"
  | "denied_invalid_token"
  | "denied_expired"
  | "denied_revoked"
  | "denied_other_user"
  | "denied_product_mismatch";

export type ClaimResult =
  | {
      ok: true;
      outcome: "claimed" | "idempotent_replay";
      matterId: string;
      redirectTo: string;
      pending: PendingResultRow;
      evaluation: ScreeningEvaluation;
    }
  | { ok: false; reason: ClaimOutcome | "auth_required" | "unverified_account" | "storage_unavailable" | "could_not_verify" };

export type PendingResultRow = {
  pending_id: string;
  product: "expungement_ai_dtc" | "rcap_partner";
  jurisdiction: string;
  screening_answers: Record<string, ScreeningAnswerValue>;
  profile_version: string | null;
  screening_correlation_id: string | null;
  anonymous_session_id: string | null;
  locale: string | null;
  partner_slug: string | null;
  program_id: string | null;
  event_id: string | null;
  campaign_name: string | null;
  access_code_id: string | null;
  consent_grant_id: string | null;
  status: string;
};

const PENDING_COLUMNS =
  "pending_id, product, jurisdiction, screening_answers, profile_version, screening_correlation_id, "
  + "anonymous_session_id, locale, partner_slug, program_id, event_id, campaign_name, access_code_id, "
  + "consent_grant_id, status";

export async function claimPendingScreeningResult(input: {
  claimToken: string;
  authenticatedUserId: string;
  accountVerified: boolean;
  requestId?: string;
}): Promise<ClaimResult> {
  if (!input.authenticatedUserId) return { ok: false, reason: "auth_required" };

  // Contract §8 and Correction 4: an unverified signup record does not receive a
  // matter or a Briefcase. The pending result stays claimable, so the
  // participant lands on it once they finish verifying.
  if (!input.accountVerified) return { ok: false, reason: "unverified_account" };

  if (!isWellFormedClaimToken(input.claimToken)) return { ok: false, reason: "denied_invalid_token" };

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: "storage_unavailable" };

  // Read the stored inputs the re-evaluation needs. This read decides nothing:
  // every authorization question is settled inside the transaction below, under
  // the row lock, against the hash of the presented token.
  const pending = await supabase
    .from("consumer_pending_screening_results")
    .select(PENDING_COLUMNS)
    .eq("claim_token_hash", claimTokenHash(input.claimToken))
    .maybeSingle<PendingResultRow>();

  if (pending.error) return { ok: false, reason: "storage_unavailable" };
  if (!pending.data) return { ok: false, reason: "denied_invalid_token" };

  const row = pending.data;
  if (!row.profile_version || !row.screening_correlation_id) return { ok: false, reason: "could_not_verify" };

  // The coarse result columns stored during the anonymous handoff are never
  // trusted to choose a pathway, packet type, payment posture or status. The
  // engine decides again, from the stored answers.
  let authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  try {
    authoritative = evaluateAuthoritativeScreeningResult({
      jurisdiction: row.jurisdiction,
      profileVersion: row.profile_version,
      matterId: row.screening_correlation_id,
      answers: row.screening_answers ?? {}
    });
  } catch {
    return { ok: false, reason: "could_not_verify" };
  }

  const { evaluation, pathwayLabel, packetType, selectedTrackId } = authoritative;
  const isPartnerSession = row.product === "rcap_partner" && Boolean(row.partner_slug);

  const saveInput = clampAuthoritativeMatterInput(buildSaveInput({
    userId: input.authenticatedUserId,
    jurisdiction: evaluation.jurisdiction,
    resultCode: evaluation.resultCode,
    pathwayLabel: pathwayLabel ?? evaluation.pathwayId ?? undefined,
    packetType,
    paymentAllowed: evaluation.paymentAllowed,
    summary: evaluation.userLabel,
    nextSteps: evaluation.nextSteps,
    sourceSessionId: isPartnerSession ? row.anonymous_session_id ?? undefined : row.pending_id,
    selectedTrackId,
    treatmentClassification: evaluation.treatmentClassification ?? null,
    deferralComponentIds: evaluation.deferralComponentIds ?? []
  }, { isPartnerSession }));

  saveInput.artifactRefs = {
    ...(saveInput.artifactRefs ?? {}),
    selectedTrackId,
    ...(isPacketResult(evaluation.resultCode) ? { productId: "expungement_packet" } : {}),
    // Attribution travels with the matter. It records who sponsored the work; it
    // never records who owns it.
    attribution: {
      product: row.product,
      partnerSlug: row.partner_slug,
      programId: row.program_id,
      eventId: row.event_id,
      campaignName: row.campaign_name,
      accessCodeId: row.access_code_id,
      consentGrantId: row.consent_grant_id,
      locale: row.locale
    },
    commercialFlow: initialCommercialFlow({
      evaluation,
      pathwayLabel,
      packetType,
      screeningAnswers: row.screening_answers ?? {},
      isPartnerSession
    })
  };

  const claim = await supabase.rpc("claim_pending_screening_result", {
    p_claim_token: input.claimToken,
    p_user_id: input.authenticatedUserId,
    p_matter: matterPayload(saveInput, row),
    p_request_id: input.requestId ?? null
  });

  if (claim.error) return { ok: false, reason: "storage_unavailable" };

  const returned = Array.isArray(claim.data) ? claim.data[0] : claim.data;
  const outcome = (returned?.outcome ?? "denied_invalid_token") as ClaimOutcome;
  const matterId = returned?.matter_id as string | null | undefined;

  if ((outcome === "claimed" || outcome === "idempotent_replay") && matterId) {
    return {
      ok: true,
      outcome,
      matterId,
      redirectTo: exactMatterPath(matterId),
      pending: row,
      evaluation
    };
  }

  return { ok: false, reason: outcome };
}

/**
 * Maps the clamped matter onto the column shape the claim function inserts.
 * Nothing here is browser-supplied: every value comes from the re-evaluation or
 * from the server's own pending record.
 */
function matterPayload(input: CreateConsumerBriefcaseItemInput, row: PendingResultRow) {
  return {
    product: row.product,
    item_type: input.itemType,
    jurisdiction: input.jurisdiction,
    pathway_label: input.pathwayLabel ?? null,
    result_code: input.resultCode ?? null,
    packet_type: input.packetType ?? null,
    payment_allowed: input.paymentAllowed,
    status: input.status,
    summary_json: { text: input.summary },
    next_steps_json: input.nextSteps,
    artifact_refs_json: input.artifactRefs ?? {},
    payment_status: input.paymentAllowed ? "unpaid" : "not_applicable",
    amount_cents: input.paymentAllowed ? 5000 : null,
    packet_status: input.packetStatus ?? "not_started",
    reminder_at: input.reminderAt ?? null,
    source_session_id: input.sourceSessionId ?? null
  };
}

function isPacketResult(resultCode: string) {
  return resultCode === "packet_ready" || resultCode === "packet_ready_with_caution";
}

function initialCommercialFlow(input: {
  evaluation: ScreeningEvaluation;
  pathwayLabel: string | null;
  packetType: string | undefined;
  screeningAnswers: Record<string, ScreeningAnswerValue>;
  isPartnerSession: boolean;
}) {
  const requiredInputIds = input.evaluation.packetPlan?.requiredInputIds ?? [];
  const serverFacts: Record<string, ScreeningAnswerValue> = {
    jurisdiction: input.evaluation.jurisdiction,
    ...(input.evaluation.pathwayId ? { pathway_id: input.evaluation.pathwayId } : {})
  };
  const prefilledAnswers = Object.fromEntries(
    requiredInputIds
      .filter((id) => id in input.screeningAnswers)
      .map((id) => [id, input.screeningAnswers[id]])
  );

  return {
    version: 1,
    entitlementSource: input.isPartnerSession ? "partner_sponsorship" : "consumer_payment",
    productId: isPacketResult(input.evaluation.resultCode) ? "expungement_packet" : null,
    screening: {
      profileVersion: input.evaluation.profileVersion,
      screeningCorrelationId: input.evaluation.matterId,
      pathwayId: input.evaluation.pathwayId ?? null,
      pathwayLabel: input.pathwayLabel,
      resultCode: input.evaluation.resultCode,
      paymentAllowed: input.evaluation.paymentAllowed,
      packetType: input.packetType ?? null,
      packetPlan: input.evaluation.packetPlan ?? null,
      answers: input.screeningAnswers
    },
    packetInformation: {
      stage: "not_started",
      requiredInputIds,
      serverFacts,
      prefilledAnswers,
      answers: {},
      missingInputIds: requiredInputIds.filter((id) => !(id in serverFacts) && !(id in prefilledAnswers)),
      updatedAt: null,
      reviewedAt: null
    },
    verification: {
      status: "unverified",
      reason: "final_verification_not_completed"
    }
  };
}
