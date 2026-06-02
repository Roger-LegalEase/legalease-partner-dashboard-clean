import { NextResponse } from "next/server";
import { completeRcapIntakeSession } from "@/lib/rcap-intake/repository";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

  const result = await completeRcapIntakeSession(sessionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
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
