import { NextRequest, NextResponse } from "next/server";

import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { resolveConsumerPaymentReceipt } from "@/lib/expungement-ai/consumer-payment-receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genericUnavailable = "This receipt link is unavailable. Return to Payment history and request a new link.";

export async function GET(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession("/briefcase/payments");
  const briefcaseItemId = request.nextUrl.searchParams.get("briefcaseItemId")?.trim() ?? "";
  const reference = request.nextUrl.searchParams.get("reference")?.trim() ?? "";
  if (!briefcaseItemId || !reference) return unavailableResponse(404);

  const result = await resolveConsumerPaymentReceipt({
    consumerAuthUserId: auth.userId,
    briefcaseItemId,
    reference
  });
  if (result.status === "denied") return unavailableResponse(404);
  if (result.status === "temporarily_unavailable") return unavailableResponse(503);

  const response = NextResponse.redirect(result.receiptUrl, 303);
  response.headers.set("cache-control", "private, no-store, max-age=0");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}

function unavailableResponse(status: 404 | 503) {
  return NextResponse.json(
    { error: genericUnavailable },
    {
      status,
      headers: {
        "cache-control": "private, no-store, max-age=0"
      }
    }
  );
}
