import { NextResponse } from "next/server";
import { processWilmaPaidCheckout } from "@/wilma/orders/createWilmaOrder";
import type {
  WilmaDocumentGenerationBackend,
  WilmaOrderBackend,
  WilmaPaidCheckoutEvent,
  WilmaTrackerBackend
} from "@/wilma/orders/types";

type VerifyPaymentSuccess = (request: Request) => Promise<WilmaPaidCheckoutEvent>;

type WilmaPaymentSuccessRouteDependencies = {
  /**
   * Test seam only. Production payment success must be derived from a verified
   * payment-provider webhook, never from a browser redirect or client JSON.
   */
  verifyPaymentSuccess?: VerifyPaymentSuccess;
  orderBackend?: WilmaOrderBackend;
  documentGenerationBackend?: WilmaDocumentGenerationBackend;
  trackerBackend?: WilmaTrackerBackend;
};

export function createWilmaPaymentSuccessRouteHandler(dependencies: WilmaPaymentSuccessRouteDependencies = {}) {
  return async function POST(request: Request) {
    try {
      const event = await (dependencies.verifyPaymentSuccess ?? verifyStripePaymentSuccess)(request);
      const result = await processWilmaPaidCheckout(event, {
        orderBackend: dependencies.orderBackend ?? (await import("@/wilma/adapters/orderBackend")).createBackendWilmaOrderAdapter(),
        documentGenerationBackend:
          dependencies.documentGenerationBackend ??
          (await import("@/wilma/adapters/documentGenerationBackend")).createBackendWilmaDocumentGenerationAdapter(),
        trackerBackend: dependencies.trackerBackend ?? (await import("@/wilma/adapters/trackerBackend")).createBackendWilmaTrackerAdapter()
      });

      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(
        {
          order: result.order,
          duplicate: result.duplicate
        },
        { status: result.duplicate ? 200 : 201 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wilma payment success could not be verified.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  };
}

export const POST = createWilmaPaymentSuccessRouteHandler();

async function verifyStripePaymentSuccess(request: Request): Promise<WilmaPaidCheckoutEvent> {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    throw new Error("Missing Stripe signature. Wilma payment success must come from a verified payment webhook.");
  }

  const [{ stripe }, { env }] = await Promise.all([import("@/lib/billing/stripe"), import("@/lib/env")]);
  const stripeEvent = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);

  if (stripeEvent.type !== "checkout.session.completed") {
    return {
      type: "checkout.session.completed",
      paid: false,
      amountCents: 0,
      paymentProvider: "stripe",
      checkoutSessionId: stripeEvent.id,
      metadata: {}
    };
  }

  const session = stripeEvent.data.object as {
    id: string;
    payment_status?: string;
    amount_total?: number | null;
    currency?: string | null;
    payment_intent?: string | { id: string } | null;
    metadata?: Record<string, string> | null;
  };

  return {
    type: "checkout.session.completed",
    paid: session.payment_status === "paid",
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    paymentProvider: "stripe",
    checkoutSessionId: session.id,
    paymentIntentId: getId(session.payment_intent),
    metadata: {
      product: session.metadata?.product,
      productKey: session.metadata?.productKey,
      wilmaSessionId: session.metadata?.wilmaSessionId
    }
  };
}

function getId(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return typeof value === "string" ? value : value.id;
}
