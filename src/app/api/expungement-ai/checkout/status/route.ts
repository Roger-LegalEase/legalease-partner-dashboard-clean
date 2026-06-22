import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import { getConsumerCheckoutStatus } from "@/lib/expungement-ai/payment-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession();
  const briefcaseItemId = request.nextUrl.searchParams.get("briefcaseItemId")?.trim();
  const checkoutSessionId = request.nextUrl.searchParams.get("session_id")?.trim();

  if (!briefcaseItemId || !checkoutSessionId) {
    return NextResponse.json({ error: "briefcaseItemId and session_id are required." }, { status: 400 });
  }

  const item = await getBriefcaseItem(auth.userId, briefcaseItemId);
  if (!item) {
    return NextResponse.json({ error: "Briefcase item not found." }, { status: 404 });
  }
  if (await isPartnerSponsoredPacketItem(item)) {
    return NextResponse.json({ error: "Checkout status is not used for partner-sponsored RCAP sessions." }, { status: 403 });
  }

  const status = await getConsumerCheckoutStatus({ item, checkoutSessionId });

  return NextResponse.json({
    paid: status.paid,
    mode: status.mode,
    checkoutSessionId: status.checkoutSessionId,
    amountCents: status.amountCents,
    briefcaseItemId
  });
}
