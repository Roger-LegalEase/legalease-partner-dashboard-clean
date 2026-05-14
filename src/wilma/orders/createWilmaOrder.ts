import type {
  WilmaOrderBackend,
  WilmaPaidCheckoutEvent,
  WilmaPaymentBlockedReason,
  WilmaPaymentSuccessResult
} from "@/wilma/orders/types";
import { fulfillWilmaOrder } from "@/wilma/orders/fulfillWilmaOrder";
import type { WilmaDocumentGenerationBackend, WilmaTrackerBackend } from "@/wilma/orders/types";
import { trackWilmaEvent } from "@/wilma/analytics/trackWilmaEvent";

export async function processWilmaPaidCheckout(
  event: WilmaPaidCheckoutEvent,
  dependencies: {
    orderBackend: WilmaOrderBackend;
    documentGenerationBackend: WilmaDocumentGenerationBackend;
    trackerBackend: WilmaTrackerBackend;
    now?: () => Date;
  }
): Promise<WilmaPaymentSuccessResult> {
  const blockedReason = validatePaidEvent(event);
  if (blockedReason) {
    return blocked(blockedReason);
  }

  const existing = await dependencies.orderBackend.findOrderByPayment({
    checkoutSessionId: event.checkoutSessionId,
    paymentIntentId: event.paymentIntentId
  });
  if (existing) {
    return { ok: true, order: existing, duplicate: true };
  }

  const session = await dependencies.orderBackend.loadSession({ sessionId: event.metadata.wilmaSessionId ?? "" });
  if (!session) {
    return blocked("missing_session");
  }

  const decision = session.decision;
  if (decision?.status !== "likely_eligible_for_document_prep" || decision.allowPaidCta !== true) {
    return blocked("not_likely_eligible");
  }

  const email = session.email?.trim().toLowerCase();
  if (!email) {
    return blocked("email_not_captured");
  }

  const state = session.facts.state;
  if (!state) {
    return blocked("missing_session");
  }

  const now = (dependencies.now?.() ?? new Date()).toISOString();
  const order = await dependencies.orderBackend.createOrder({
    order: {
      wilmaSessionId: session.id,
      leadEmail: email,
      state,
      documentTarget: decision.documentTarget,
      decisionStatus: "likely_eligible_for_document_prep",
      ruleVersion: decision.ruleVersion,
      reasonCodes: decision.reasonCodes,
      priceCents: 5000,
      paymentProvider: event.paymentProvider,
      paymentProviderCheckoutSessionId: event.checkoutSessionId,
      paymentProviderPaymentIntentId: event.paymentIntentId,
      status: "paid_pending_fulfillment"
    }
  });
  await trackWilmaEvent(dependencies.orderBackend, {
    event: "wilma_payment_succeeded",
    wilmaSessionId: session.id,
    actorEmail: email,
    state,
    decisionStatus: decision.status,
    documentTarget: decision.documentTarget,
    ruleVersion: decision.ruleVersion,
    orderId: order.id,
    checkoutSessionId: event.checkoutSessionId,
    paymentProvider: event.paymentProvider,
    reasonCodes: decision.reasonCodes,
    facts: session.facts,
    metadata: {
      orderId: order.id,
      checkoutSessionId: event.checkoutSessionId,
      paymentIntentId: event.paymentIntentId,
      priceCents: 5000,
      product: "wilma_document_prep"
    }
  });
  await trackWilmaEvent(dependencies.orderBackend, {
    event: "wilma_order_created",
    wilmaSessionId: session.id,
    actorEmail: email,
    state,
    decisionStatus: decision.status,
    documentTarget: decision.documentTarget,
    ruleVersion: decision.ruleVersion,
    orderId: order.id,
    checkoutSessionId: event.checkoutSessionId,
    paymentProvider: event.paymentProvider,
    reasonCodes: decision.reasonCodes,
    facts: session.facts,
    metadata: {
      orderId: order.id,
      checkoutSessionId: event.checkoutSessionId,
      paymentIntentId: event.paymentIntentId,
      priceCents: 5000,
      product: "wilma_document_prep"
    }
  });

  await fulfillWilmaOrder(order, session, {
    orderBackend: dependencies.orderBackend,
    documentGenerationBackend: dependencies.documentGenerationBackend,
    trackerBackend: dependencies.trackerBackend,
    now: () => new Date(now)
  });

  const fulfilled = await dependencies.orderBackend.findOrderByPayment({
    checkoutSessionId: event.checkoutSessionId,
    paymentIntentId: event.paymentIntentId
  });

  return { ok: true, order: fulfilled ?? order, duplicate: false };
}

function validatePaidEvent(event: WilmaPaidCheckoutEvent): WilmaPaymentBlockedReason | null {
  if (!event.paid || event.type !== "checkout.session.completed") {
    return "not_paid";
  }
  if (event.metadata.product !== "wilma_document_prep" && event.metadata.productKey !== "wilma_document_prep") {
    return "wrong_product";
  }
  if (event.amountCents !== 5000) {
    return "wrong_amount";
  }
  if (!event.metadata.wilmaSessionId) {
    return "missing_wilma_session";
  }
  return null;
}

function blocked(reason: WilmaPaymentBlockedReason): WilmaPaymentSuccessResult {
  return {
    ok: false,
    error: "wilma_order_not_created",
    reason
  };
}
