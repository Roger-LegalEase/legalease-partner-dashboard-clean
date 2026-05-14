import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { betaAccessMessage, canStartRecordCheckCheckout, inviteCodeFromRequest } from "@/lib/beta";
import { createRecordCheckCheckoutSession } from "@/lib/billing/checkout";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse } from "@/lib/security/api-errors";
import { checkCompositeRateLimit, rateLimitIdentity } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const user = await requireUser();
  const access = canStartRecordCheckCheckout(user, { inviteCode: inviteCodeFromRequest(request) });
  if (!access.allowed) {
    return NextResponse.json({ error: betaAccessMessage(access.reason) }, { status: 403 });
  }

  const rateLimit = await checkCompositeRateLimit({
    scope: "checkout:record-check",
    identity: rateLimitIdentity(request, { email: user.email }),
    limit: 20,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.resetAt);
  }

  const session = await createRecordCheckCheckoutSession(user);
  await trackAnalyticsEvent(prisma, {
    event: "checkout_started",
    actorUserId: user.id,
    actorEmail: user.email,
    targetType: "ProductOrder",
    metadata: {
      productKey: "record_check",
      checkoutUrlCreated: Boolean(session.url)
    }
  });

  return NextResponse.json({ url: session.url }, { status: 201 });
}
