import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { betaAccessMessage, canStartMonitoringCheckout, inviteCodeFromRequest } from "@/lib/beta";
import { createMonitoringCheckoutSession } from "@/lib/billing/checkout";
import { isMonitoringPlanKey } from "@/lib/billing/products";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse } from "@/lib/security/api-errors";
import { checkCompositeRateLimit, rateLimitIdentity } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json().catch(() => null)) as { inviteCode?: string; planKey?: string } | null;
  const planKey = body?.planKey;

	  if (!planKey || !isMonitoringPlanKey(planKey)) {
	    return NextResponse.json({ error: "Invalid monitoring plan." }, { status: 400 });
	  }
  const access = canStartMonitoringCheckout(user, { inviteCode: inviteCodeFromRequest(request, body) });
  if (!access.allowed) {
    return NextResponse.json({ error: betaAccessMessage(access.reason) }, { status: 403 });
  }

  const rateLimit = await checkCompositeRateLimit({
    scope: "checkout:monitoring",
    identity: rateLimitIdentity(request, { email: user.email, deviceId: planKey }),
    limit: 20,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.resetAt);
  }

  const session = await createMonitoringCheckoutSession(user, planKey);
  await trackAnalyticsEvent(prisma, {
    event: "checkout_started",
    actorUserId: user.id,
    actorEmail: user.email,
    targetType: "SubscriptionEntitlement",
    metadata: {
      productKey: planKey,
      checkoutUrlCreated: Boolean(session.url)
    }
  });

  return NextResponse.json({ url: session.url }, { status: 201 });
}
