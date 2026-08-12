import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import {
  ConsumerCheckoutNotAllowedError,
  ConsumerCheckoutTemporarilyUnavailableError,
  createConsumerPacketCheckout
} from "@/lib/expungement-ai/payment-adapter";
import { componentDeferralForTrack } from "@/lib/rcap/documents/guidance-packet-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession();
  const body = await request.json().catch(() => null) as { briefcaseItemId?: string } | null;
  const briefcaseItemId = body?.briefcaseItemId?.trim();

  if (!briefcaseItemId) {
    return NextResponse.json({ error: "briefcaseItemId is required." }, { status: 400 });
  }

  const item = await getBriefcaseItem(auth.userId, briefcaseItemId);
  if (!item) {
    return NextResponse.json({ error: "Briefcase item not found." }, { status: 404 });
  }
  // Component deferral is answered before sponsored and payment handling, so an
  // incomplete composed route is refused the same way for a sponsored
  // participant and a direct-to-consumer one. No URL, no session, no amount.
  // The payment adapter denies it again independently; this is the first guard,
  // not the only one.
  const deferralTrackId = item.selectedTrackId
    ?? (typeof item.artifactRefs?.selectedTrackId === "string" ? item.artifactRefs.selectedTrackId : null);
  if (item.treatmentClassification === "component_deferral" || componentDeferralForTrack(deferralTrackId)) {
    return NextResponse.json({
      error: "Checkout is not available while this route is missing an official form we do not supply.",
      resultCode: "component_deferral"
    }, { status: 403 });
  }

  if (await isPartnerSponsoredPacketItem(item)) {
    return NextResponse.json({ error: "Checkout is not used for partner-sponsored RCAP sessions." }, { status: 403 });
  }

  try {
    const checkout = await createConsumerPacketCheckout({ userId: auth.userId, item });
    return NextResponse.json({
      checkoutUrl: checkout.checkoutUrl,
      checkoutSessionId: checkout.checkoutSessionId,
      mode: checkout.mode,
      amountCents: checkout.amountCents,
      briefcaseItemId: checkout.briefcaseItemId,
      alreadyPaid: checkout.alreadyPaid ?? false,
      outcome: checkout.alreadyPaid ? "already_paid" : "checkout_created"
    });
  } catch (error) {
    if (error instanceof ConsumerCheckoutNotAllowedError) {
      return NextResponse.json({ error: "Checkout is not available for this result.", resultCode: error.resultCode }, { status: 403 });
    }

    if (error instanceof ConsumerCheckoutTemporarilyUnavailableError) {
      return NextResponse.json({ error: "We could not start checkout right now. Please try again." }, { status: 503 });
    }

    throw error;
  }
}
