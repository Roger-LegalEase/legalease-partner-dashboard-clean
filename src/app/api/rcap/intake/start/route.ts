import { NextResponse } from "next/server";
import { startRcapIntakeSession } from "@/lib/rcap-intake/repository";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const partnerSlug = typeof body.partnerSlug === "string" ? body.partnerSlug.trim() : "";
  const legalDisclaimerAccepted = body.legalDisclaimerAccepted === true;

  const result = await startRcapIntakeSession({ partnerSlug, legalDisclaimerAccepted });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
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
