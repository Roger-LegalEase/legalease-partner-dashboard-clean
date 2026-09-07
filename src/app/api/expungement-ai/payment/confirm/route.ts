import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import { getConsumerCheckoutStatus, recordConsumerPaymentConfirmation } from "@/lib/expungement-ai/payment-adapter";
import { scheduleConsumerCheckoutCompleted } from "@/lib/expungement-ai/checkout-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession();
  const body = await request.json().catch(() => null) as { briefcaseItemId?: string; checkoutSessionId?: string } | null;
  const briefcaseItemId = body?.briefcaseItemId?.trim();
  const checkoutSessionId = body?.checkoutSessionId?.trim();

  if (!briefcaseItemId || !checkoutSessionId) {
    return NextResponse.json({ error: "briefcaseItemId and checkoutSessionId are required." }, { status: 400 });
  }

  const item = await getBriefcaseItem(auth.userId, briefcaseItemId);
  if (!item) {
    return NextResponse.json({ error: "We couldn’t find this case. Return to your Briefcase and try again. Contact support if the problem continues." }, { status: 404 });
  }
  if (await isPartnerSponsoredPacketItem(item)) {
    return NextResponse.json({ error: "Payment confirmation is not used for partner-sponsored RCAP sessions." }, { status: 403 });
  }

  const status = await getConsumerCheckoutStatus({ item, checkoutSessionId });
  const updatedItem = await recordConsumerPaymentConfirmation({ userId: auth.userId, item, status });

  // Server-confirmed checkout completion. Idempotent per checkout session (this route is polled, and
  // the Stripe webhook emits the same event), fire-and-forget so it never affects the payment
  // response. No PII or payment identifiers stored.
  if (status.paid) {
    scheduleConsumerCheckoutCompleted({
      request,
      checkoutSessionId: status.checkoutSessionId ?? checkoutSessionId,
      state: item.state ?? undefined,
      amountCents: status.amountCents,
      mode: status.mode
    });
  }

  return NextResponse.json({
    paid: status.paid,
    mode: status.mode,
    checkoutSessionId: status.checkoutSessionId,
    paymentIntentId: status.paymentIntentId,
    receiptAvailable: status.paid && status.mode === "stripe",
    amountCents: status.amountCents,
    packetStatus: updatedItem?.packetStatus ?? item.packetStatus,
    briefcaseItemId
  });
}
