import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * The application's single writer of consumer payment facts.
 *
 * Phase 52 took `payment_status`, `amount_cents`, `currency`, `provider_event_id`
 * and friends away from every role a browser can reach, and moved legitimate
 * writes behind `record_consumer_packet_payment`, which only `service_role` may
 * execute. Before Phase 52 the application wrote those columns directly through
 * the participant-authenticated client — which is exactly the privilege the
 * audit proved a hostile payer could use to mark their own row paid.
 *
 * So this module is not a convenience wrapper. It is the only remaining way the
 * application can record that money changed hands, and it exists so that there
 * is exactly one such way. Two payment writers would mean two places to get the
 * evidence rules right.
 *
 * Every caller must have obtained its evidence from the provider server-side:
 * either a signature-verified webhook event, or a Checkout Session retrieved
 * from Stripe with the secret key. Nothing here may be driven by a request body.
 */

export const CONSUMER_PACKET_PRICE_CENTS = 5000;
export const CONSUMER_PACKET_CURRENCY = "usd";

/**
 * Which server proved the payment. The database constrains this column to these
 * two values, so an application that invents a third is refused rather than
 * silently trusted.
 */
export type ConsumerPaymentAuthority = "server_webhook" | "server_admin";

export type ConsumerPaymentOutcome =
  | "recorded_paid"
  | "recorded_refunded"
  | "recorded_unpaid"
  | "duplicate_provider_event"
  | "invalid_payment_evidence"
  | "invalid_authority"
  | "invalid_item"
  | "item_not_found"
  | "storage_unavailable"
  | "evidence_rejected";

export type ConsumerPaymentRecord = {
  outcome: ConsumerPaymentOutcome;
  briefcaseItemId: string | null;
  providerEventId: string | null;
  /** Present only on a refusal, for logs and typed route responses. */
  reason?: string;
};

export type RecordConsumerPaymentInput = {
  briefcaseItemId: string;
  paymentStatus: "paid" | "refunded" | "unpaid";
  amountCents: number | null;
  currency: string | null;
  paymentProvider: string;
  /** The provider's own event identity. This is what makes a replay detectable. */
  providerEventId: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  receiptUrl?: string | null;
  authority: ConsumerPaymentAuthority;
  /** Free-text provenance for the audit trail, e.g. the route that recorded it. */
  recordedBy: string;
};

/**
 * Amount, currency and receipt identity are checked here AND in the database.
 *
 * The duplication is deliberate. The database check is the one that actually
 * defends the money, because it holds even if this file is wrong. This check
 * exists so that a mismatched provider event fails as a typed application
 * outcome we can log and assert on, instead of arriving at the RPC and coming
 * back as an opaque refusal. Neither is a substitute for the other.
 */
function rejectEvidence(input: RecordConsumerPaymentInput): string | null {
  if (input.paymentStatus !== "paid") return null;
  if (input.amountCents !== CONSUMER_PACKET_PRICE_CENTS) {
    return `amount_cents must be ${CONSUMER_PACKET_PRICE_CENTS}`;
  }
  if ((input.currency ?? "").toLowerCase() !== CONSUMER_PACKET_CURRENCY) {
    return `currency must be ${CONSUMER_PACKET_CURRENCY}`;
  }
  if (!input.providerEventId || !input.providerEventId.trim()) {
    return "a provider event id is required";
  }
  return null;
}

export async function recordConsumerPacketPayment(
  input: RecordConsumerPaymentInput
): Promise<ConsumerPaymentRecord> {
  const evidenceProblem = rejectEvidence(input);
  if (evidenceProblem) {
    return {
      outcome: "evidence_rejected",
      briefcaseItemId: input.briefcaseItemId,
      providerEventId: null,
      reason: evidenceProblem
    };
  }

  // Service role only. Deliberately not the participant-authenticated client:
  // after Phase 52 that client holds no privilege here, and before it, using it
  // would be the bypass itself.
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      outcome: "storage_unavailable",
      briefcaseItemId: input.briefcaseItemId,
      providerEventId: null,
      reason: "the service-role Supabase client is not configured"
    };
  }

  const { data, error } = await supabase.rpc("record_consumer_packet_payment", {
    p_briefcase_item_id: input.briefcaseItemId,
    p_payment_status: input.paymentStatus,
    p_amount_cents: input.amountCents,
    p_currency: input.currency,
    p_payment_provider: input.paymentProvider,
    p_provider_event_id: input.providerEventId,
    p_checkout_session_id: input.checkoutSessionId ?? null,
    p_payment_intent_id: input.paymentIntentId ?? null,
    p_receipt_url: input.receiptUrl ?? null,
    p_authority: input.authority,
    p_recorded_by: input.recordedBy
  });

  if (error) {
    // A refusal from the gate is information, not a crash. Callers decide
    // whether to retry; none of them may proceed as though payment happened.
    return {
      outcome: "evidence_rejected",
      briefcaseItemId: input.briefcaseItemId,
      providerEventId: null,
      reason: error.message
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.outcome) {
    return {
      outcome: "evidence_rejected",
      briefcaseItemId: input.briefcaseItemId,
      providerEventId: null,
      reason: "the payment writer returned no outcome"
    };
  }

  return {
    outcome: row.outcome as ConsumerPaymentOutcome,
    briefcaseItemId: row.briefcase_item_id ?? input.briefcaseItemId,
    providerEventId: row.provider_event_id ?? null
  };
}

export type ConsumerPaymentAuthorityProbe = {
  valid: boolean;
  reason: string;
  providerEventId: string | null;
};

/**
 * Asks the database whether this item's payment authorizes this user.
 *
 * The probe is the same one finalization uses, so a route that consults it
 * cannot reach a different conclusion than the gate will. It compares the item's
 * canonical owner to the supplied user itself — the caller does not get to
 * assert the relationship — and refuses anything that is not a server-recorded
 * $50 USD payment carrying a provider receipt.
 */
export async function consumerPacketPaymentAuthority(
  briefcaseItemId: string,
  consumerAuthUserId: string
): Promise<ConsumerPaymentAuthorityProbe> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { valid: false, reason: "storage_unavailable", providerEventId: null };
  }

  const { data, error } = await supabase.rpc("consumer_packet_payment_authority", {
    p_briefcase_item_id: briefcaseItemId,
    p_consumer_auth_user_id: consumerAuthUserId
  });

  if (error) return { valid: false, reason: error.message, providerEventId: null };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { valid: false, reason: "no_authority_row", providerEventId: null };

  return {
    valid: row.valid === true,
    reason: String(row.reason ?? "unknown"),
    providerEventId: row.provider_event_id ?? null
  };
}

/** True only for outcomes that mean the item is now genuinely paid. */
export function isPaidOutcome(outcome: ConsumerPaymentOutcome): boolean {
  return outcome === "recorded_paid";
}

/**
 * A replay is a success for the caller's purposes — the payment is already
 * recorded and no second entitlement was created — but it must never be
 * reported as a fresh payment.
 */
export function isAlreadyRecordedOutcome(outcome: ConsumerPaymentOutcome): boolean {
  return outcome === "duplicate_provider_event";
}
