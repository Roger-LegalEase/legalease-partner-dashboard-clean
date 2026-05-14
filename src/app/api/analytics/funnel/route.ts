import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isAnalyticsFunnelEvent, trackAnalyticsEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { safeErrorResponse, rateLimitedResponse } from "@/lib/security/api-errors";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";

type FunnelEventBody = {
  event?: string;
  targetType?: string;
  targetId?: string;
  metadata?: unknown;
  anonymousId?: string;
};

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit({
    key: rateLimitKey(request, "analytics:funnel"),
    limit: 60,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.resetAt);
  }

  try {
    const body = (await request.json().catch(() => null)) as FunnelEventBody | null;

    if (!body?.event || !isAnalyticsFunnelEvent(body.event)) {
      return NextResponse.json({ error: "Unsupported analytics event." }, { status: 400 });
    }

    const user = await currentUser();
    await trackAnalyticsEvent(prisma, {
      event: body.event,
      actorUserId: user?.id,
      actorEmail: user?.email,
      targetType: body.targetType ?? "Funnel",
      targetId: body.targetId,
      metadata: {
        anonymousId: body.anonymousId,
        ...(isRecord(body.metadata) ? body.metadata : {})
      }
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Analytics event could not be recorded.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
