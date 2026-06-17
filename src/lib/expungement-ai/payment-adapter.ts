import "server-only";

import { absoluteAppUrl } from "@/lib/app-url";
import { getStripeServerClient, isStripeConfigurationError } from "@/lib/stripe/server";
import { isConsumerPaymentAllowed } from "@/lib/expungement-ai/eligibility-adapter";
import { updateBriefcasePaymentMetadata } from "@/lib/expungement-ai/briefcase";
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
};

export type ConsumerCheckoutStatus = {
  paid: boolean;
  mode: "stripe" | "dry_run";
  checkoutSessionId: string;
  paymentIntentId?: string;
  receiptUrl?: string;
  amountCents: 5000;
};

export function createConsumerPaymentPlaceholder(result: ExpungementAiEligibilityResult): ConsumerPaymentIntent {
  const enabled = isConsumerPaymentAllowed(result.resultCode, result.paymentAllowed);

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

  const defaultSuccessUrl = absoluteAppUrl(`/expungement-ai/packet-ready?briefcaseItemId=${encodeURIComponent(item.id)}&session_id={CHECKOUT_SESSION_ID}`);
  const defaultCancelUrl = absoluteAppUrl(`/expungement-ai/pay?briefcaseItemId=${encodeURIComponent(item.id)}`);

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
        result_code: item.resultCode ?? ""
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

    await updateBriefcasePaymentMetadata(userId, item.id, {
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
    const dryRunSessionId = dryRunCheckoutSessionId(item.id);
    await updateBriefcasePaymentMetadata(userId, item.id, {
      paymentStatus: "unpaid",
      paymentProvider: "dry_run",
      checkoutSessionId: dryRunSessionId,
      amountCents: consumerPacketPriceCents,
      packetStatus: "not_started"
    });

    return {
      mode: "dry_run",
      checkoutSessionId: dryRunSessionId,
      checkoutUrl: absoluteAppUrl(`/expungement-ai/packet-ready?briefcaseItemId=${encodeURIComponent(item.id)}&session_id=${encodeURIComponent(dryRunSessionId)}&dry_run=1`),
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

  return {
    paid: session.payment_status === "paid",
    mode: "stripe",
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntent?.id,
    receiptUrl: paymentIntent?.latest_charge && typeof paymentIntent.latest_charge !== "string" ? paymentIntent.latest_charge.receipt_url ?? undefined : undefined,
    amountCents: consumerPacketPriceCents
  };
}

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

  return updateBriefcasePaymentMetadata(userId, item.id, {
    paymentStatus: "paid",
    paymentProvider: status.mode,
    checkoutSessionId: status.checkoutSessionId,
    paymentIntentId: status.paymentIntentId,
    amountCents: status.amountCents,
    receiptUrl: status.receiptUrl,
    packetStatus: "ready"
  });
}

export function assertCheckoutAllowed(item: ConsumerBriefcaseItem) {
  if (!item.paymentAllowed || !isConsumerPaymentAllowed(item.resultCode ?? "guidance_only", item.paymentAllowed)) {
    throw new ConsumerCheckoutNotAllowedError(item.resultCode ?? "missing_result_code");
  }
}

export class ConsumerCheckoutNotAllowedError extends Error {
  constructor(readonly resultCode: string) {
    super(`Consumer checkout is not allowed for ${resultCode}.`);
    this.name = "ConsumerCheckoutNotAllowedError";
  }
}

function dryRunCheckoutSessionId(itemId: string) {
  return `dryrun_${itemId.replaceAll("-", "_")}`;
}
