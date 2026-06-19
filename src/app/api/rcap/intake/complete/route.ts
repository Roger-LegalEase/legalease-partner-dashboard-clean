import { NextResponse } from "next/server";
import { createLaunchOsEvent, sourceDomainFromRequest } from "@/lib/legalease/launch-os-events";
import { completeRcapIntakeSession } from "@/lib/rcap-intake/repository";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

  const result = await completeRcapIntakeSession(sessionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const osEvent = await createLaunchOsEvent({
    sourceProduct: "rcap_partner",
    sourceDomain: sourceDomainFromRequest(request),
    sourceRoute: "/api/rcap/intake/complete",
    workflowType: "rcap_intake_completed",
    loopCategory: "rcap_intake_review",
    partnerSlug: result.session.partnerSlug,
    email: result.session.userEmail,
    message: `RCAP intake completed for partner ${result.session.partnerSlug}.`,
    userAgent: request.headers.get("user-agent"),
    metadata: {
      persisted: result.persisted,
      session_status: result.session.status,
      eligibility_signal: result.summary.eligibilitySignal,
      state: result.session.state ?? null,
      county: result.session.county ?? null
    }
  });

  if (!osEvent.ok) {
    return NextResponse.json({ error: "Intake event routing is temporarily unavailable." }, { status: 503 });
  }

  return NextResponse.json({
    session: result.session,
    summary: result.summary,
    persisted: result.persisted
  });
}

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
