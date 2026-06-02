import { NextResponse } from "next/server";
import { getPartnerPackage } from "@/lib/partners/packages";
import {
  getPartnerRecordById,
  getPartnerRecordBySlug,
  markPartnerCheckoutStarted
} from "@/lib/partners/partner-repository";
import { getStripeServerClient } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutRequestBody = {
  packageId?: unknown;
  partnerId?: unknown;
  partnerSlug?: unknown;
};

export async function POST(request: Request) {
  let body: CheckoutRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const packageId = typeof body.packageId === "string" ? body.packageId.trim() : "";
  const partnerId = typeof body.partnerId === "string" ? body.partnerId.trim() : "";
  const partnerSlug = typeof body.partnerSlug === "string" ? body.partnerSlug.trim() : "";
  const partnerPackage = getPartnerPackage(packageId);

  if (!partnerPackage) {
    return NextResponse.json({ error: "Unsupported partner package." }, { status: 400 });
  }

  const stripePriceId = process.env[partnerPackage.stripePriceEnvVar];
  if (!stripePriceId) {
    return NextResponse.json({ error: `${partnerPackage.stripePriceEnvVar} is not configured.` }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is not configured." }, { status: 500 });
  }

  try {
    const partner = partnerSlug
      ? await getPartnerRecordBySlug(partnerSlug)
      : partnerId
        ? await getPartnerRecordById(partnerId)
        : undefined;
    const resolvedPartnerSlug = partner?.partnerSlug ?? partnerSlug;
    const resolvedPartnerId = partner?.partnerId ?? partnerId;
    const successUrl = `${appUrl}/partners/checkout/success?session_id={CHECKOUT_SESSION_ID}${
      resolvedPartnerSlug ? `&partner_slug=${encodeURIComponent(resolvedPartnerSlug)}` : ""
    }`;

    const stripe = getStripeServerClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: stripePriceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: `${appUrl}/partners/start`,
      metadata: {
        packageId: partnerPackage.id,
        packageName: partnerPackage.name,
        ...(resolvedPartnerId ? { partnerId: resolvedPartnerId } : {}),
        ...(resolvedPartnerSlug ? { partnerSlug: resolvedPartnerSlug } : {}),
        product: "legalease-partner-journey-os",
        program: "record-clearing-access-program"
      }
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }

    if (partner) {
      const writeResult = await markPartnerCheckoutStarted({
        slug: partner.partnerSlug,
        selectedPackageId: partnerPackage.id,
        selectedPackageName: partnerPackage.name
      });

      if (!writeResult.success) {
        console.info("Partner checkout_started update skipped", {
          partnerSlug: partner.partnerSlug,
          packageId: partnerPackage.id,
          mode: writeResult.mode,
          persisted: writeResult.persisted,
          message: writeResult.message
        });
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create a Stripe Checkout session." },
      { status: 500 }
    );
  }
}
