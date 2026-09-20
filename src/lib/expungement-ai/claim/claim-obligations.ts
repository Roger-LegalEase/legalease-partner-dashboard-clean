import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Post-claim obligations that did not complete.
 *
 * Contract §4 puts follow-up creation strictly after the ownership transaction,
 * so a follow-up failure can no longer roll a claim back -- the matter is
 * already durable and owned. That leaves one question: where does the unmet
 * obligation go?
 *
 * It goes here, into the append-only claim audit, so the obligation outlives the
 * request that dropped it. Two things then recover it: the follow-up itself is
 * idempotent and is re-attempted on every replay of the claim, which is what a
 * returning participant produces; and the row is queryable, so an operator can
 * see every matter still carrying an unmet obligation.
 *
 * Nothing recorded here is participant data. It is identifiers and jurisdiction.
 */

export async function recordOutstandingClinicFollowUp(input: {
  pendingResultId: string;
  matterId: string;
  actorUserId: string;
  product: string;
  jurisdiction: string;
  partnerSlug: string | null;
  eventId: string | null;
  requestId?: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  await supabase
    .from("participant_claim_events")
    .insert({
      event: "clinic_follow_up_outstanding",
      pending_result_id: input.pendingResultId,
      matter_id: input.matterId,
      actor_user_id: input.actorUserId,
      product: input.product,
      jurisdiction: input.jurisdiction,
      partner_slug: input.partnerSlug,
      event_id: input.eventId,
      request_id: input.requestId ?? null,
      detail: { obligation: "clinic_attorney_review_follow_up", retry: "on_next_claim_replay" }
    })
    // The claim already succeeded. If this record cannot be written the
    // participant's answer still stands; the security log above carries it.
    .then(() => undefined, () => undefined);
}
