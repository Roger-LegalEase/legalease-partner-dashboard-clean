import { NextResponse } from "next/server";
import { createMississippiDocumentPacket } from "@/lib/rcap/documents/source-repository";
import type { MississippiDocumentPacketInput } from "@/lib/rcap/documents/types";
import { verifyRcapCaptchaToken } from "@/lib/security/rcap-captcha";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const captcha = await verifyRcapCaptchaToken(body.turnstileToken);
  if (!captcha.ok) {
    return NextResponse.json({ error: captcha.error }, { status: 403 });
  }
  const partnerSlug = typeof body.partnerSlug === "string" ? body.partnerSlug.trim() : "";
  const intakeSessionId = typeof body.intakeSessionId === "string" ? body.intakeSessionId.trim() : undefined;
  const result = await createMississippiDocumentPacket({ ...readDocumentInput(body), partnerSlug, intakeSessionId, state: "MS" });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ packet: result.packet, persisted: result.persisted });
}

function readDocumentInput(body: Record<string, unknown>): Partial<MississippiDocumentPacketInput> {
  return {
    courtType: readText(body.courtType),
    courtCounty: readText(body.courtCounty),
    courtName: readText(body.courtName),
    jurisdiction: readText(body.jurisdiction),
    causeNumber: readText(body.causeNumber),
    charge: readText(body.charge),
    arrestDate: readText(body.arrestDate),
    offenseDate: readText(body.offenseDate),
    arrestingAgency: readText(body.arrestingAgency),
    agencyCaseNumber: readText(body.agencyCaseNumber),
    dispositionDate: readText(body.dispositionDate),
    convictionDate: readText(body.convictionDate),
    sentenceCompletionDate: readText(body.sentenceCompletionDate),
    hasZeroBalance: typeof body.hasZeroBalance === "boolean" ? body.hasZeroBalance : undefined,
    firstOffenderSignal: typeof body.firstOffenderSignal === "boolean" ? body.firstOffenderSignal : undefined,
    nonTrafficSignal: typeof body.nonTrafficSignal === "boolean" ? body.nonTrafficSignal : undefined,
    excludedOffenseScreening: typeof body.excludedOffenseScreening === "boolean" ? body.excludedOffenseScreening : undefined,
    oneFelonyExpungementSignal: typeof body.oneFelonyExpungementSignal === "boolean" ? body.oneFelonyExpungementSignal : undefined,
    convictionLevel: readConvictionLevel(body.convictionLevel)
  };
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : undefined;
}

function readConvictionLevel(value: unknown): MississippiDocumentPacketInput["convictionLevel"] {
  return value === "felony" || value === "misdemeanor" ? value : undefined;
}

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
