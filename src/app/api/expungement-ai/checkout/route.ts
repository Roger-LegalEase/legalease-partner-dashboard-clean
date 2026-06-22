import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import {
  ConsumerCheckoutNotAllowedError,
  ConsumerCheckoutTemporarilyUnavailableError,
  createConsumerPacketCheckout
} from "@/lib/expungement-ai/payment-adapter";

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
      briefcaseItemId: checkout.briefcaseItemId
    });
  } catch (error) {
    if (error instanceof ConsumerCheckoutNotAllowedError) {
      return NextResponse.json({ error: "Checkout is not available for this result.", resultCode: error.resultCode }, { status: 403 });
    }

    if (error instanceof ConsumerCheckoutTemporarilyUnavailableError) {
      return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    throw error;
  }
}
