import "server-only";

import { absoluteExpungementAiUrl } from "@/lib/app-url";
import { getStripeServerClient, isProductionRuntime, isStripeConfigurationError } from "@/lib/stripe/server";
import { isConsumerPaymentAllowed } from "@/lib/expungement-ai/eligibility-adapter";
import { componentDeferralForTrack, exactDeferralForPathway, exactDeferralForTrack } from "@/lib/rcap/documents/guidance-packet-registry";
import { getBriefcaseItem, updateBriefcaseCheckoutSessionMetadata } from "@/lib/expungement-ai/briefcase";
import type { ConsumerBriefcaseItem, ExpungementAiEligibilityResult } from "@/lib/expungement-ai/types";

export const consumerPacketPriceCents = 5000;

export type ConsumerPaymentIntent = {
  enabled: boolean;
  amountCents?: 5000;
  label: string;
};

export type ConsumerCheckoutResult = {
  mode: "stripe" | "dry_run";
  checkoutSessionId: string;
  checkoutUrl: string;
  amountCents: 5000;
  briefcaseItemId: string;
  alreadyPaid?: boolean;
};

export function consumerPacketReadyUrl(briefcaseItemId: string): string {
  return absoluteExpungementAiUrl(`/packet-ready?briefcaseItemId=${encodeURIComponent(briefcaseItemId)}`);
}

export type ConsumerCheckoutStatus = {
  paid: boolean;
  mode: "stripe" | "dry_run";
  checkoutSessionId: string;
  paymentIntentId?: string;
  receiptUrl?: string;
  amountCents: 5000;
};

export function createConsumerPaymentPlaceholder(result: ExpungementAiEligibilityResult): ConsumerPaymentIntent {
  // The placeholder is the first surface a participant sees. A component
  // deferral shows no amount at all, independently of the result booleans.
  const deferred = result.treatmentClassification === "component_deferral"
    || result.treatmentClassification === "exact_supported_deferral"
    || Boolean(componentDeferralForTrack(result.selectedTrackId ?? null))
    || Boolean(exactDeferralForTrack(result.selectedTrackId ?? null))
    || Boolean(exactDeferralForPathway(result.state, result.pathwayLabel ?? null));
  const enabled = !deferred && isConsumerPaymentAllowed(result.resultCode, result.paymentAllowed);

  return {
    enabled,
    amountCents: enabled ? consumerPacketPriceCents : undefined,
    label: enabled ? "$50 one-time self-help packet payment" : "No payment available for this result"
  };
}

export async function createConsumerPacketCheckout({
  userId,
  item,
  successUrl,
  cancelUrl
}: {
  userId: string;
  item: ConsumerBriefcaseItem;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<ConsumerCheckoutResult> {
  assertCheckoutAllowed(item);

  // P0 double-charge guard: an already-paid Briefcase item must never mint a new
  // Stripe Checkout Session or reset payment state. Send the user to their packet.
  if (item.paymentStatus === "paid") {
    return {
      mode: item.paymentProvider === "dry_run" ? "dry_run" : "stripe",
      checkoutSessionId: item.checkoutSessionId ?? "",
      checkoutUrl: consumerPacketReadyUrl(item.id),
      amountCents: consumerPacketPriceCents,
      briefcaseItemId: item.id,
      alreadyPaid: true
    };
  }

  const defaultSuccessUrl = absoluteExpungementAiUrl(`/packet-ready?briefcaseItemId=${encodeURIComponent(item.id)}&session_id={CHECKOUT_SESSION_ID}`);
  const defaultCancelUrl = absoluteExpungementAiUrl(`/pay?briefcaseItemId=${encodeURIComponent(item.id)}`);

  try {
    const stripe = getStripeServerClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl ?? defaultSuccessUrl,
      cancel_url: cancelUrl ?? defaultCancelUrl,
      client_reference_id: item.id,
      metadata: {
        channel: "expungement_ai_consumer",
        user_id: userId,
        briefcase_item_id: item.id,
        result_code: item.resultCode ?? "",
        source_session_id: item.sourceSessionId ?? "",
        jurisdiction: item.state,
        packet_type: item.packetType ?? "",
        pathway_label: item.pathwayLabel ?? ""
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: consumerPacketPriceCents,
            product_data: {
              name: "Expungement.ai self-help packet"
            }
          }
        }
      ]
    });

    await updateBriefcaseCheckoutSessionMetadata(userId, item.id, {
      paymentStatus: "unpaid",
      paymentProvider: "stripe",
      checkoutSessionId: session.id,
      amountCents: consumerPacketPriceCents,
      packetStatus: "not_started"
    });

    return {
      mode: "stripe",
      checkoutSessionId: session.id,
      checkoutUrl: session.url ?? defaultCancelUrl,
      amountCents: consumerPacketPriceCents,
      briefcaseItemId: item.id
    };
  } catch (error) {
    if (!isStripeConfigurationError(error)) throw error;
    if (!isConsumerCheckoutDryRunEnabled()) {
      throw new ConsumerCheckoutTemporarilyUnavailableError();
    }

    const dryRunSessionId = dryRunCheckoutSessionId(item.id);
    await updateBriefcaseCheckoutSessionMetadata(userId, item.id, {
      paymentStatus: "unpaid",
      paymentProvider: "dry_run",
      checkoutSessionId: dryRunSessionId,
      amountCents: consumerPacketPriceCents,
      packetStatus: "not_started"
    });

    return {
      mode: "dry_run",
      checkoutSessionId: dryRunSessionId,
      checkoutUrl: absoluteExpungementAiUrl(`/packet-ready?briefcaseItemId=${encodeURIComponent(item.id)}&session_id=${encodeURIComponent(dryRunSessionId)}&dry_run=1`),
      amountCents: consumerPacketPriceCents,
      briefcaseItemId: item.id
    };
  }
}

export async function getConsumerCheckoutStatus({
  item,
  checkoutSessionId
}: {
  item: ConsumerBriefcaseItem;
  checkoutSessionId: string;
}): Promise<ConsumerCheckoutStatus> {
  if (checkoutSessionId.startsWith("dryrun_") || item.paymentProvider === "dry_run") {
    if (!isConsumerCheckoutDryRunEnabled()) {
      return {
        paid: false,
        mode: "dry_run",
        checkoutSessionId,
        amountCents: consumerPacketPriceCents
      };
    }

    return {
      paid: true,
      mode: "dry_run",
      checkoutSessionId,
      amountCents: consumerPacketPriceCents
    };
  }

  const stripe = getStripeServerClient();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["payment_intent"]
  });
  const paymentIntent = typeof session.payment_intent === "string" ? undefined : session.payment_intent;

  // Bind the retrieved Stripe session to THIS Briefcase item before honoring "paid".
  // Without this, a user who legitimately paid for one item could pass that item's
  // paid session id to the confirm/status path for a different, unpaid item they own
  // and unlock a second packet for free. Mirror the bindings the signed webhook
  // enforces in checkout-reconciliation.ts. Fail closed (paid: false) on any mismatch.
  const sessionBoundToItem =
    session.client_reference_id === item.id &&
    session.metadata?.briefcase_item_id === item.id &&
    session.metadata?.channel === "expungement_ai_consumer" &&
    (!item.checkoutSessionId || item.checkoutSessionId === session.id);

  return {
    paid: sessionBoundToItem && session.payment_status === "paid",
    mode: "stripe",
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntent?.id,
    receiptUrl: paymentIntent?.latest_charge && typeof paymentIntent.latest_charge !== "string" ? paymentIntent.latest_charge.receipt_url ?? undefined : undefined,
    amountCents: consumerPacketPriceCents
  };
}

/**
 * Reports the server-recorded payment state when the user returns from Stripe.
 *
 * This used to write `payment_status = 'paid'` itself, through the participant's
 * own Supabase client. That made it a second payment writer, and the weaker of
 * the two: it ran on a browser-initiated return, whereas the webhook runs on a
 * signature-verified event. Two writers also meant two provider identities for
 * one payment — the session/intent id here, the event id there — which can flip
 * `provider_event_id` on a row that the receipt uniqueness index depends on.
 *
 * So it now reads rather than writes. The signature-verified webhook is the only
 * thing that records a payment, and this reports what it recorded.
 *
 * The consequence worth naming: a user who returns before the webhook lands sees
 * an unpaid item for those seconds. That is the honest answer — the payment is
 * not yet server-recorded — and the webhook's own recovery path already handles
 * finishing a packet whose first delivery attempt failed.
 */
export async function recordConsumerPaymentConfirmation({
  userId,
  item,
  status
}: {
  userId: string;
  item: ConsumerBriefcaseItem;
  status: ConsumerCheckoutStatus;
}): Promise<ConsumerBriefcaseItem | null> {
  if (!status.paid) return item;

  // Re-read rather than trust the caller's copy: the webhook may have recorded
  // the payment between the page load and this call.
  const current = await getBriefcaseItem(userId, item.id);
  return current ?? item;
}

/**
 * A composed route whose official-form component is deferred can never be
 * checked out, whatever the item's stored booleans say. This reads the
 * server-owned track identity and denies BEFORE already-paid handling and
 * before any Stripe or dry-run session is created, so a mutated
 * paymentAllowed=true cannot buy an incomplete packet.
 */
/**
 * An exact supported deferral is refused independently of the item's own
 * booleans, matched by track id or by the pathway the item was saved under. A
 * corrupted item claiming packet_ready with paymentAllowed=true on a deferred
 * route still gets nothing.
 */
function assertNotExactDeferral(item: ConsumerBriefcaseItem) {
  const trackId = (item.artifactRefs?.selectedTrackId as string | undefined) ?? item.selectedTrackId ?? null;
  const classification = (item.artifactRefs?.treatmentClassification as string | undefined) ?? item.treatmentClassification ?? null;
  const deferred = classification === "exact_supported_deferral"
    || Boolean(exactDeferralForTrack(trackId))
    || Boolean(exactDeferralForPathway(item.state, item.pathwayLabel ?? null));
  if (deferred) {
    throw new ConsumerCheckoutNotAllowedError("exact_supported_deferral");
  }
}

function assertNotComponentDeferral(item: ConsumerBriefcaseItem) {
  const trackId = (item.artifactRefs?.selectedTrackId as string | undefined) ?? item.selectedTrackId ?? null;
  const classification = (item.artifactRefs?.treatmentClassification as string | undefined) ?? item.treatmentClassification ?? null;
  if (classification === "component_deferral" || componentDeferralForTrack(trackId)) {
    throw new ConsumerCheckoutNotAllowedError("component_deferral");
  }
}

export function assertCheckoutAllowed(item: ConsumerBriefcaseItem) {
  assertNotExactDeferral(item);
  assertNotComponentDeferral(item);
  if (!item.paymentAllowed || !isConsumerPaymentAllowed(item.resultCode ?? "guidance_only", item.paymentAllowed)) {
    throw new ConsumerCheckoutNotAllowedError(item.resultCode ?? "missing_result_code");
  }
}

export function isConsumerCheckoutDryRunEnabled(): boolean {
  return process.env.EXPUNGEMENT_AI_CHECKOUT_DRY_RUN === "true" && !isProductionRuntime();
}

export class ConsumerCheckoutNotAllowedError extends Error {
  constructor(readonly resultCode: string) {
    super(`Consumer checkout is not allowed for ${resultCode}.`);
    this.name = "ConsumerCheckoutNotAllowedError";
  }
}

export class ConsumerCheckoutTemporarilyUnavailableError extends Error {
  constructor() {
    super("Consumer checkout is temporarily unavailable.");
    this.name = "ConsumerCheckoutTemporarilyUnavailableError";
  }
}

function dryRunCheckoutSessionId(itemId: string) {
  return `dryrun_${itemId.replaceAll("-", "_")}`;
}
