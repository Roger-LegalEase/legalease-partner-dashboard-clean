import { NextResponse } from "next/server";
import { getStripeServerClient } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook secret is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeServerClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    console.info("Stripe checkout.session.completed received", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      packageId: session.metadata?.packageId ?? null,
      partnerId: session.metadata?.partnerId ?? null,
      partnerSlug: session.metadata?.partnerSlug ?? null,
      product: session.metadata?.product ?? null,
      program: session.metadata?.program ?? null
    });

    // TODO Phase 13: activate paid partner provisioning after verified payment confirmation.
  }

  return NextResponse.json({ received: true });
}
