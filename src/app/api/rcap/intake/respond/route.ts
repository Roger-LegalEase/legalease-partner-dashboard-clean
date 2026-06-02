import { NextResponse } from "next/server";
import { respondToRcapIntake } from "@/lib/rcap-intake/repository";
import { rcapIntakeStepOrder } from "@/lib/rcap-intake/questions";
import type { RcapIntakeStepId } from "@/lib/rcap-intake/types";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const stepId = typeof body.stepId === "string" && rcapIntakeStepOrder.includes(body.stepId as RcapIntakeStepId)
    ? (body.stepId as RcapIntakeStepId)
    : undefined;

  if (!stepId) {
    return NextResponse.json({ error: "A valid intake step is required." }, { status: 400 });
  }

  const result = await respondToRcapIntake({ sessionId, stepId, value: body.value });
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
