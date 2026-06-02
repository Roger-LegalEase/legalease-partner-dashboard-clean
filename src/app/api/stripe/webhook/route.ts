import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPartnerPackage } from "@/lib/partners/packages";
import { activatePaidPartnerProvisioning, getPartnerRecordById, getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
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
    await handleCheckoutSessionCompleted(event.data.object);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const packageId = session.metadata?.packageId ?? "";
  const partnerId = session.metadata?.partnerId ?? "";
  const partnerSlug = session.metadata?.partnerSlug ?? "";
  const product = session.metadata?.product ?? "";
  const program = session.metadata?.program ?? "";
  const partnerPackage = getPartnerPackage(packageId);

  const safeLogContext = {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    packageId: packageId || null,
    partnerId: partnerId || null,
    partnerSlug: partnerSlug || null,
    product: product || null,
    program: program || null
  };

  if (!partnerPackage || product !== "legalease-partner-journey-os" || program !== "record-clearing-access-program") {
    console.info("Stripe checkout.session.completed ignored for unsupported LegalEase metadata", safeLogContext);
    return;
  }

  if (session.payment_status !== "paid") {
    console.info("Stripe checkout.session.completed received before paid status", safeLogContext);
    return;
  }

  const partner = partnerSlug
    ? await getPartnerRecordBySlug(partnerSlug)
    : partnerId
      ? await getPartnerRecordById(partnerId)
      : undefined;

  if (!partner) {
    console.info("Stripe checkout.session.completed missing partner context for provisioning activation", safeLogContext);
    return;
  }

  const writeResult = await activatePaidPartnerProvisioning({
    slug: partner.partnerSlug,
    selectedPackageId: partnerPackage.id,
    selectedPackageName: partnerPackage.name,
    stripeCheckoutSessionId: session.id,
    stripeCustomerId: stripeObjectId(session.customer),
    stripePaymentIntentId: stripeObjectId(session.payment_intent),
    paidAt: session.created ? new Date(session.created * 1000).toISOString() : new Date().toISOString(),
    paymentAmount: session.amount_total ?? undefined,
    paymentCurrency: session.currency ?? undefined
  });

  console.info("Stripe checkout.session.completed provisioning activation processed", {
    ...safeLogContext,
    partnerSlug: partner.partnerSlug,
    persisted: writeResult.persisted,
    mode: writeResult.mode,
    success: writeResult.success
  });
}

function stripeObjectId(value: string | { id: string } | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return typeof value === "string" ? value : value.id;
}
