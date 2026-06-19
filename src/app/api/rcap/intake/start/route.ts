import { NextResponse } from "next/server";
import { createLaunchOsEvent, sourceDomainFromRequest } from "@/lib/legalease/launch-os-events";
import { startRcapIntakeSession } from "@/lib/rcap-intake/repository";
import { verifyRcapCaptchaToken } from "@/lib/security/rcap-captcha";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const partnerSlug = typeof body.partnerSlug === "string" ? body.partnerSlug.trim() : "";
  const legalDisclaimerAccepted = body.legalDisclaimerAccepted === true;
  const captcha = await verifyRcapCaptchaToken(body.turnstileToken);
  if (!captcha.ok) {
    return NextResponse.json({ error: captcha.error }, { status: 403 });
  }

  const result = await startRcapIntakeSession({ partnerSlug, legalDisclaimerAccepted });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const osEvent = await createLaunchOsEvent({
    sourceProduct: "rcap_partner",
    sourceDomain: sourceDomainFromRequest(request),
    sourceRoute: "/api/rcap/intake/start",
    workflowType: "rcap_intake_started",
    loopCategory: "rcap_intake_review",
    partnerSlug,
    message: `RCAP intake started for partner ${partnerSlug}.`,
    userAgent: request.headers.get("user-agent"),
    metadata: {
      persisted: result.persisted,
      session_status: result.session.status,
      state: result.session.state ?? null,
      county: result.session.county ?? null
    }
  });

  if (!osEvent.ok) {
    return NextResponse.json({ error: "Intake event routing is temporarily unavailable." }, { status: 503 });
  }

  return NextResponse.json({
    session: result.session,
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
