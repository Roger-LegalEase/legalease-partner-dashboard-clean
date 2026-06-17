import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { getConsumerCheckoutStatus, recordConsumerPaymentConfirmation } from "@/lib/expungement-ai/payment-adapter";

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

  const status = await getConsumerCheckoutStatus({ item, checkoutSessionId });
  const updatedItem = await recordConsumerPaymentConfirmation({ userId: auth.userId, item, status });

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
