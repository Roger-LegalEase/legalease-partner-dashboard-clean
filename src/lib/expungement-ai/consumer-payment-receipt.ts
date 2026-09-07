import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";

import {
  CONSUMER_PACKET_CURRENCY,
  CONSUMER_PACKET_PRICE_CENTS,
  CONSUMER_PACKET_PRODUCT_ID,
  consumerPacketPaymentAuthority
} from "@/lib/expungement-ai/consumer-payment-authority";
import { consumerMatterIdForItem } from "@/lib/expungement-ai/consumer-identity";
import { getStripeServerClient } from "@/lib/stripe/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const RECEIPT_REFERENCE_VERSION = "v1";
const RECEIPT_REFERENCE_TTL_SECONDS = 10 * 60;
const MAX_CLOCK_SKEW_SECONDS = 30;
const RECEIPT_HOST = "pay.stripe.com";

type ConsumerPaymentReceiptRow = {
  id: string;
  user_id: string;
  payment_status: string;
  payment_provider: string | null;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  receipt_url: string | null;
  provider_event_id: string | null;
  payment_authority: string | null;
  payment_product_id: string | null;
  payment_person_id: string | null;
  payment_matter_id: string | null;
  source_session_id: string | null;
};

export type ConsumerPaymentReceiptAction = {
  actionPath: string;
  amountCents: typeof CONSUMER_PACKET_PRICE_CENTS;
  currency: "USD";
  provider: "Stripe";
  status: "paid" | "refunded";
  expiresAt: string;
};

type ReceiptResolution =
  | { status: "available"; receiptUrl: string }
  | { status: "denied" }
  | { status: "temporarily_unavailable" };

/**
 * Creates a short-lived reference to a receipt, never a provider receipt URL.
 *
 * The per-payment HMAC key is derived from protected, server-written Stripe
 * evidence. The browser receives only the matter id, expiry and MAC. Changing
 * the user, matter, provider payment, amount, currency or expiry invalidates
 * the reference. A refund revokes fulfillment but deliberately preserves this
 * financial-history authority; an unpaid/revoked record still fails closed.
 */
export async function createConsumerPaymentReceiptAction(input: {
  consumerAuthUserId: string;
  briefcaseItemId: string;
  now?: Date;
}): Promise<ConsumerPaymentReceiptAction | null> {
  const row = await readReceiptRow(input.consumerAuthUserId, input.briefcaseItemId);
  if (!row || !(await receiptRowAuthorized(row, input.consumerAuthUserId))) return null;

  const now = input.now ?? new Date();
  const expires = Math.floor(now.getTime() / 1000) + RECEIPT_REFERENCE_TTL_SECONDS;
  const reference = receiptReference(row, input.consumerAuthUserId, expires);
  const params = new URLSearchParams({
    briefcaseItemId: row.id,
    reference
  });
  return {
    actionPath: `/api/expungement-ai/payment/receipt?${params.toString()}`,
    amountCents: CONSUMER_PACKET_PRICE_CENTS,
    currency: "USD",
    provider: "Stripe",
    status: row.payment_status as "paid" | "refunded",
    expiresAt: new Date(expires * 1000).toISOString()
  };
}

/** Revalidates the current owner and payment before resolving a receipt. */
export async function resolveConsumerPaymentReceipt(input: {
  consumerAuthUserId: string;
  briefcaseItemId: string;
  reference: string;
  now?: Date;
}): Promise<ReceiptResolution> {
  const row = await readReceiptRow(input.consumerAuthUserId, input.briefcaseItemId);
  if (!row || !(await receiptRowAuthorized(row, input.consumerAuthUserId))) return { status: "denied" };
  if (!validReceiptReference(row, input.consumerAuthUserId, input.reference, input.now ?? new Date())) {
    return { status: "denied" };
  }

  const storedReceipt = safeStripeReceiptUrl(row.receipt_url);
  if (storedReceipt) return { status: "available", receiptUrl: storedReceipt };

  try {
    const stripe = getStripeServerClient();
    const session = await stripe.checkout.sessions.retrieve(row.checkout_session_id!, {
      expand: ["payment_intent.latest_charge"]
    });
    if (!stripeSessionMatchesReceiptRow(session, row)) return { status: "denied" };
    const receiptUrl = await receiptUrlFromStripeSession(session, stripe);
    return receiptUrl
      ? { status: "available", receiptUrl }
      : { status: "temporarily_unavailable" };
  } catch {
    return { status: "temporarily_unavailable" };
  }
}

/**
 * Resolve a receipt URL from Stripe-owned Checkout evidence for webhook storage.
 * A missing receipt is recoverable: the owner-scoped receipt route resolves it
 * from Stripe later without accepting a URL from the participant browser.
 */
export async function stripeReceiptUrlForCheckoutSession(
  signedSession: Stripe.Checkout.Session
): Promise<string | null> {
  return receiptUrlFromStripeSession(signedSession);
}

async function readReceiptRow(
  consumerAuthUserId: string,
  briefcaseItemId: string
): Promise<ConsumerPaymentReceiptRow | null> {
  if (!consumerAuthUserId || !briefcaseItemId) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .select("id, user_id, payment_status, payment_provider, checkout_session_id, payment_intent_id, amount_cents, currency, receipt_url, provider_event_id, payment_authority, payment_product_id, payment_person_id, payment_matter_id, source_session_id")
    .eq("id", briefcaseItemId)
    .eq("user_id", consumerAuthUserId)
    .maybeSingle<ConsumerPaymentReceiptRow>();
  if (error || !data) return null;
  return data;
}

async function receiptRowAuthorized(
  row: ConsumerPaymentReceiptRow,
  consumerAuthUserId: string
): Promise<boolean> {
  const matterId = consumerMatterIdForItem(row.id);
  if (row.user_id !== consumerAuthUserId
    || !["paid", "refunded"].includes(row.payment_status)
    || row.payment_provider !== "stripe"
    || row.amount_cents !== CONSUMER_PACKET_PRICE_CENTS
    || row.currency?.toLowerCase() !== CONSUMER_PACKET_CURRENCY
    || row.payment_authority !== "server_webhook"
    || row.payment_product_id !== CONSUMER_PACKET_PRODUCT_ID
    || row.payment_matter_id !== matterId
    || !row.payment_person_id
    || !row.provider_event_id
    || !row.checkout_session_id?.startsWith("cs_")
    || !row.payment_intent_id?.startsWith("pi_")) return false;

  if (row.source_session_id && await sourceSessionIsSponsored(row.source_session_id)) return false;
  // Refunds remove packet-generation authority, not access to the retained
  // financial record. The immutable Stripe identity and server-only bindings
  // above are the separate receipt-history boundary; never call the paid-only
  // fulfillment probe for this status.
  if (row.payment_status === "refunded") return true;
  const authority = await consumerPacketPaymentAuthority(row.id, consumerAuthUserId, {
    productId: CONSUMER_PACKET_PRODUCT_ID,
    personId: row.payment_person_id,
    matterId
  });
  return authority.valid && authority.providerEventId === row.provider_event_id;
}

async function sourceSessionIsSponsored(sourceSessionId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return true;
  const { data, error } = await supabase
    .from("screening_sessions")
    .select("flow_mode, partner_benefit_active, partner_slug")
    .eq("session_id", sourceSessionId)
    .maybeSingle<{ flow_mode: string | null; partner_benefit_active: boolean | null; partner_slug: string | null }>();
  if (error) return true;
  return data?.flow_mode === "rcap" && data.partner_benefit_active === true && Boolean(data.partner_slug);
}

function receiptReference(row: ConsumerPaymentReceiptRow, userId: string, expires: number): string {
  const payload = receiptReferencePayload(row, userId, expires);
  const signature = createHmac("sha256", receiptReferenceKey(row)).update(payload).digest("base64url");
  return `${RECEIPT_REFERENCE_VERSION}.${expires}.${signature}`;
}

function validReceiptReference(
  row: ConsumerPaymentReceiptRow,
  userId: string,
  reference: string,
  now: Date
): boolean {
  const match = /^v1\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(reference);
  if (!match) return false;
  const expires = Number(match[1]);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (!Number.isSafeInteger(expires)
    || expires < nowSeconds - MAX_CLOCK_SKEW_SECONDS
    || expires > nowSeconds + RECEIPT_REFERENCE_TTL_SECONDS + MAX_CLOCK_SKEW_SECONDS) return false;
  const expected = receiptReference(row, userId, expires);
  return timingSafeTextEqual(expected, reference);
}

function receiptReferencePayload(row: ConsumerPaymentReceiptRow, userId: string, expires: number): string {
  return [
    RECEIPT_REFERENCE_VERSION,
    userId,
    row.id,
    consumerMatterIdForItem(row.id),
    row.payment_intent_id,
    CONSUMER_PACKET_PRODUCT_ID,
    CONSUMER_PACKET_PRICE_CENTS,
    CONSUMER_PACKET_CURRENCY,
    expires
  ].join("\n");
}

function receiptReferenceKey(row: ConsumerPaymentReceiptRow): Buffer {
  return createHash("sha256")
    .update(`${RECEIPT_REFERENCE_VERSION}\n${row.provider_event_id}\n${row.checkout_session_id}\n${row.payment_intent_id}`)
    .digest();
}

function timingSafeTextEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function stripeSessionMatchesReceiptRow(
  session: Stripe.Checkout.Session,
  row: ConsumerPaymentReceiptRow
): boolean {
  return session.id === row.checkout_session_id
    && session.mode === "payment"
    && session.payment_status === "paid"
    && session.client_reference_id === row.id
    && session.amount_total === CONSUMER_PACKET_PRICE_CENTS
    && session.currency?.toLowerCase() === CONSUMER_PACKET_CURRENCY
    && session.metadata?.channel === "expungement_ai_consumer"
    && session.metadata.user_id === row.user_id
    && session.metadata.briefcase_item_id === row.id
    && session.metadata.product_id === CONSUMER_PACKET_PRODUCT_ID
    && session.metadata.person_id === row.payment_person_id
    && session.metadata.matter_id === row.payment_matter_id
    && paymentIntentId(session) === row.payment_intent_id;
}

async function receiptUrlFromStripeSession(
  session: Stripe.Checkout.Session,
  stripe?: Stripe
): Promise<string | null> {
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  if (!intent) return null;
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  if (charge) return safeStripeReceiptUrl(charge.receipt_url);
  if (typeof intent.latest_charge === "string" && stripe) {
    const retrieved = await stripe.charges.retrieve(intent.latest_charge);
    return safeStripeReceiptUrl(retrieved.receipt_url);
  }
  return null;
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

function safeStripeReceiptUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === RECEIPT_HOST ? url.toString() : null;
  } catch {
    return null;
  }
}
