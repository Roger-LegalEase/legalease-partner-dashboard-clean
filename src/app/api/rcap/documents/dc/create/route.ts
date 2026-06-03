import { NextResponse } from "next/server";
import { createDcDocumentPacket } from "@/lib/rcap/documents/dc/repository";
import type { DcDocumentPacketInput } from "@/lib/rcap/documents/dc/types";
import { verifyRcapCaptchaToken } from "@/lib/security/rcap-captcha";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const captcha = await verifyRcapCaptchaToken(body.turnstileToken);
  if (!captcha.ok) return NextResponse.json({ error: captcha.error }, { status: 403 });

  const partnerSlug = readText(body.partnerSlug) ?? "";
  const intakeSessionId = readText(body.intakeSessionId);
  const result = await createDcDocumentPacket({ ...readDcInput(body), partnerSlug, intakeSessionId, state: "DC" });
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

function readDcInput(body: Record<string, unknown>): Partial<DcDocumentPacketInput> {
  return {
    petitionerFirstName: readText(body.petitionerFirstName),
    petitionerLastName: readText(body.petitionerLastName),
    caseNumber: readText(body.caseNumber),
    charge: readText(body.charge),
    arrestingAgency: readText(body.arrestingAgency),
    offenseDate: readText(body.offenseDate),
    arrestDate: readText(body.arrestDate),
    disposition: readText(body.disposition),
    dispositionDate: readText(body.dispositionDate),
    sentenceCompletionDate: readText(body.sentenceCompletionDate),
    convictionLevel: readConvictionLevel(body.convictionLevel),
    reliefTrack: readReliefTrack(body.reliefTrack),
    prosecutorOffice: readProsecutorOffice(body.prosecutorOffice),
    serviceMethod: readServiceMethod(body.serviceMethod),
    hasMpdRecord: readBoolean(body.hasMpdRecord),
    hasCourtDisposition: readBoolean(body.hasCourtDisposition),
    openOrPendingCharges: readBoolean(body.openOrPendingCharges),
    masterGridGroupOneToThree: readBoolean(body.masterGridGroupOneToThree),
    automaticExcludedOffenseConcern: readBoolean(body.automaticExcludedOffenseConcern),
    decriminalizedLegalizedOrUnconstitutionalOffense: readBoolean(body.decriminalizedLegalizedOrUnconstitutionalOffense),
    marijuanaRelatedSignal: readBoolean(body.marijuanaRelatedSignal),
    actualInnocenceStatement: readText(body.actualInnocenceStatement, 1200),
    interestsOfJusticeStatement: readText(body.interestsOfJusticeStatement, 1200),
    motionArgument: readText(body.motionArgument, 2400)
  };
}

function readText(value: unknown, max = 200) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readConvictionLevel(value: unknown): DcDocumentPacketInput["convictionLevel"] {
  return value === "misdemeanor" || value === "felony" || value === "unknown" ? value : undefined;
}

function readReliefTrack(value: unknown): DcDocumentPacketInput["reliefTrack"] {
  return value === "automatic_expungement" || value === "automatic_sealing" || value === "actual_innocence_expungement" || value === "interests_of_justice_sealing" || value === "needs_review" ? value : undefined;
}

function readProsecutorOffice(value: unknown): DcDocumentPacketInput["prosecutorOffice"] {
  return value === "USAO" || value === "OAG" || value === "unknown" ? value : undefined;
}

function readServiceMethod(value: unknown): DcDocumentPacketInput["serviceMethod"] {
  return value === "email" || value === "mail" || value === "hand_delivery" || value === "unknown" ? value : undefined;
}
