import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import { getConsumerCheckoutStatus, recordConsumerPaymentConfirmation } from "@/lib/expungement-ai/payment-adapter";
import { recordServerFunnelEvent } from "@/lib/analytics/server-events";

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
    return NextResponse.json({ error: "Briefcase item not found." }, { status: 404 });
  }
  if (await isPartnerSponsoredPacketItem(item)) {
    return NextResponse.json({ error: "Payment confirmation is not used for partner-sponsored RCAP sessions." }, { status: 403 });
  }

  const status = await getConsumerCheckoutStatus({ item, checkoutSessionId });
  const updatedItem = await recordConsumerPaymentConfirmation({ userId: auth.userId, item, status });

  // Server-confirmed checkout completion. Idempotent per checkout session (this route is polled),
  // fire-and-forget so it never affects the payment response. No PII or payment identifiers stored.
  if (status.paid) {
    void recordServerFunnelEvent(request, "checkout_completed", {
      idempotencySeed: status.checkoutSessionId ?? checkoutSessionId,
      state: item.state ?? undefined,
      // `amount_cents` is an amount, not an identifier — it carries the Command Center funnel's
      // revenue figure. No payment identifiers are included.
      meta: { result: "paid", mode: status.mode, amount_cents: status.amountCents ?? undefined }
    });
  }

  return NextResponse.json({
    paid: status.paid,
    mode: status.mode,
    checkoutSessionId: status.checkoutSessionId,
    paymentIntentId: status.paymentIntentId,
    receiptUrl: status.receiptUrl,
    amountCents: status.amountCents,
    packetStatus: updatedItem?.packetStatus ?? item.packetStatus,
    briefcaseItemId
  });
}
