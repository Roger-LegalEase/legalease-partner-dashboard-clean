import { NextResponse } from "next/server";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { createDocumentPrepCheckoutSession } from "@/lib/billing/checkout";
import { prisma } from "@/lib/prisma";
import { safeErrorResponse, rateLimitedResponse } from "@/lib/security/api-errors";
import { checkCompositeRateLimit, rateLimitIdentity } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Wilma session is required." }, { status: 400 });
    }

    const wilmaSession = await prisma.wilmaChatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        leadEmail: true,
        decisionId: true,
        decision: true
      }
    });

    if (!wilmaSession?.leadEmail || !wilmaSession.decisionId) {
      return NextResponse.json({ error: "Wilma email capture and decision are required." }, { status: 400 });
    }
    const rateLimit = await checkCompositeRateLimit({
      scope: "checkout:document-prep",
      identity: rateLimitIdentity(request, { email: wilmaSession.leadEmail, deviceId: sessionId }),
      limit: 20,
      windowMs: 60_000
    });

    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.resetAt);
    }

    const decision = wilmaSession.decision as { status?: string } | null;
    if (decision?.status !== "likely_eligible_for_document_prep") {
      return NextResponse.json({ error: "Document-prep checkout is not available for this decision." }, { status: 400 });
    }

    const session = await createDocumentPrepCheckoutSession({
      email: wilmaSession.leadEmail,
      userId: wilmaSession.userId,
      wilmaSessionId: wilmaSession.id,
      wilmaDecisionId: wilmaSession.decisionId
    });
    await trackAnalyticsEvent(prisma, {
      event: "checkout_started",
      actorUserId: wilmaSession.userId,
      actorEmail: wilmaSession.leadEmail,
      targetType: "WilmaChatSession",
      targetId: wilmaSession.id,
      metadata: {
        productKey: "document_prep",
        wilmaDecisionId: wilmaSession.decisionId,
        checkoutUrlCreated: Boolean(session.url)
      }
    });

    return NextResponse.json({ url: session.url }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Checkout is unavailable.");
  }
}
