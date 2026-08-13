import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import {
  ConsumerCheckoutNotAllowedError,
  ConsumerCheckoutTemporarilyUnavailableError,
  createConsumerPacketCheckout
} from "@/lib/expungement-ai/payment-adapter";
import { componentDeferralForTrack, exactDeferralForPathway, exactDeferralForTrack, terminalTreatmentForTrack } from "@/lib/rcap/documents/guidance-packet-registry";

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
  if (item.treatmentClassification === "exact_supported_deferral"
    || exactDeferralForTrack(deferralTrackId)
    || exactDeferralForPathway(item.state, item.pathwayLabel ?? null)) {
    return NextResponse.json({
      error: "No packet is prepared or sold for this route; it is served as an exact supported deferral.",
      resultCode: "exact_supported_deferral"
    }, { status: 403 });
  }

  // A terminalization-window treatment is refused here on the same terms and
  // before the same sponsored/payment handling. The open independent review does
  // not soften the refusal; it is recorded on the response so a caller can tell a
  // pending treatment from an accepted one without either becoming sellable.
  if (item.treatmentClassification === "terminal_treatment_candidate" || terminalTreatmentForTrack(deferralTrackId)) {
    return NextResponse.json({
      error: "No packet is prepared, promised or sold for this route; it is served as a complete terminal treatment.",
      resultCode: "terminal_treatment_candidate",
      treatmentReviewState: "pending_independent_review"
    }, { status: 403 });
  }

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
