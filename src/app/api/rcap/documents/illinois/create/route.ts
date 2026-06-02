import { NextResponse } from "next/server";
import { createIllinoisDocumentPacket } from "@/lib/rcap/documents/illinois/repository";
import type { IllinoisDocumentPacketInput } from "@/lib/rcap/documents/illinois/types";
import { verifyRcapCaptchaToken } from "@/lib/security/rcap-captcha";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const captcha = await verifyRcapCaptchaToken(body.turnstileToken);
  if (!captcha.ok) return NextResponse.json({ error: captcha.error }, { status: 403 });

  const partnerSlug = readText(body.partnerSlug) ?? "";
  const intakeSessionId = readText(body.intakeSessionId);
  const result = await createIllinoisDocumentPacket({ ...readIllinoisInput(body), partnerSlug, intakeSessionId, state: "IL" });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ packet: result.packet, persisted: result.persisted });
}

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readIllinoisInput(body: Record<string, unknown>): Partial<IllinoisDocumentPacketInput> {
  return {
    county: readText(body.county),
    cookCountyDistrict: readText(body.cookCountyDistrict),
    caseOrArrestNumber: readText(body.caseOrArrestNumber),
    arrestingAgency: readText(body.arrestingAgency),
    arrestDate: readText(body.arrestDate),
    charge: readText(body.charge),
    disposition: readText(body.disposition),
    dispositionDate: readText(body.dispositionDate),
    supervisionCompletedDate: readText(body.supervisionCompletedDate),
    qualifiedProbationCompletedDate: readText(body.qualifiedProbationCompletedDate),
    sentenceTerminationDate: readText(body.sentenceTerminationDate),
    educationWaiverSignal: readBoolean(body.educationWaiverSignal),
    cannabisSignal: readBoolean(body.cannabisSignal),
    excludedOffenseSignal: readBoolean(body.excludedOffenseSignal),
    hasRapSheet: readBoolean(body.hasRapSheet),
    needsRapSheet: readBoolean(body.needsRapSheet),
    feeWaiverRequested: readBoolean(body.feeWaiverRequested),
    remedyType: body.remedyType === "expungement" || body.remedyType === "sealing" ? body.remedyType : undefined
  };
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}
