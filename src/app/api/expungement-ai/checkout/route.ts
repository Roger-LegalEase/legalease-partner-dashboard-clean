import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import {
  ConsumerCheckoutNotAllowedError,
  ConsumerCheckoutReviewRequiredError,
  ConsumerCheckoutTemporarilyUnavailableError,
  ConsumerPacketNotDeliverableError,
  createConsumerPacketCheckout
} from "@/lib/expungement-ai/payment-adapter";
import { CurrentPacketVerificationRequiredError } from "@/lib/expungement-ai/packet-information";
import {
  CommercialAdmissionDeniedError,
  commercialAdmissionRefusalBody
} from "@/lib/rcap/render/commercial-admission";

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
    return NextResponse.json({ error: "We couldn’t find this case. Return to your Briefcase and try again. Contact support if the problem continues." }, { status: 404 });
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
      currency: checkout.currency,
      briefcaseItemId: checkout.briefcaseItemId,
      alreadyPaid: checkout.alreadyPaid ?? false,
      paymentPending: checkout.paymentPending ?? false,
      outcome: checkout.outcome,
      // Only present when a stored Checkout Session id could not be resolved
      // and the order continued regardless. Carrying it on the SUCCESS response
      // is the point: a recovery that only shows up when it fails cannot be
      // audited, and this names the provider's classification and the request
      // id of the lookup that was overruled.
      storedSessionRecovery: checkout.storedSessionRecovery ?? null
    });
  } catch (error) {
    // The Grade-A authority refused this route or this participant. The refusal
    // carries a denial code and one sentence; `contextDenials` names matter and
    // owner ids and stays on the server.
    if (error instanceof CommercialAdmissionDeniedError) {
      return NextResponse.json(commercialAdmissionRefusalBody(error), { status: error.httpStatus });
    }

    // A route that cannot produce an artifact does not take money. The route is
    // still an intended paid pathway with an open blocker recorded against it;
    // what is refused here is the charge, not the pathway.
    if (error instanceof ConsumerPacketNotDeliverableError) {
      return NextResponse.json({
        error: "We can’t prepare the packet for this route yet, so there is nothing to pay for. Your information is saved in your Briefcase.",
        resultCode: "packet_not_deliverable",
        routeKind: error.routeKind
      }, { status: 409 });
    }

    if (error instanceof ConsumerCheckoutNotAllowedError) {
      return NextResponse.json({ error: "Payment isn’t available for this case. Your information is still saved. Return to your Briefcase to review the next step." }, { status: 403 });
    }

    if (error instanceof ConsumerCheckoutReviewRequiredError) {
      return NextResponse.json({
        error: "Complete and review your packet information before starting checkout.",
        outcome: "review_required"
      }, { status: 409 });
    }

    if (error instanceof CurrentPacketVerificationRequiredError) {
      return NextResponse.json({ error: "Complete the final packet-information verification before checkout.", outcome: "verification_required" }, { status: 409 });
    }

    if (error instanceof ConsumerCheckoutTemporarilyUnavailableError) {
      // `providerFailure` is the payment provider's own public classification of
      // the call that refused — which step, its error type, code and param. None
      // of it is a credential, and it reaches only the authenticated owner of
      // this matter. Without it, every distinct configuration fault on this path
      // is the same sentence, which is what made the last one undiagnosable.
      return NextResponse.json({
        error: "We couldn’t start payment for this case. Your information is still saved. Return to your Briefcase and try again. Contact support if the problem continues.",
        resultCode: "checkout_provider_unavailable",
        providerFailure: error.providerFailure
      }, { status: 503 });
    }

    // A payment route must never answer an unhandled 500 with an empty body. It
    // leaves the participant with a page that silently does nothing, and leaves
    // an operator with no name for the fault. Anything reaching here is still a
    // fault to fix, but it answers with a sentence and with the error's class —
    // its constructor name only, never its message, parameters or stack.
    console.error("[expungement-ai/checkout] unclassified checkout failure", error);
    return NextResponse.json({
      error: "We couldn’t start payment for this case. Your information is still saved. Return to your Briefcase and try again. Contact support if the problem continues.",
      resultCode: "checkout_failed",
      failureClass: error instanceof Error ? error.name : typeof error
    }, { status: 503 });
  }
}
