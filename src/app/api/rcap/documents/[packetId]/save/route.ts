import { NextResponse } from "next/server";
import { saveDcDocumentPacketInputs } from "@/lib/rcap/documents/dc/repository";
import type { DcDocumentPacketInput } from "@/lib/rcap/documents/dc/types";
import { saveMississippiDocumentPacketInputs } from "@/lib/rcap/documents/mississippi/repository";
import type { MississippiDocumentPacketInput } from "@/lib/rcap/documents/mississippi/types";

export async function POST(
  request: Request,
  {
    params
  }: {
    params: Promise<{ packetId: string }>;
  }
) {
  const { packetId } = await params;
  const body = await safeJson(request);
  const result = body.state === "DC"
    ? await saveDcDocumentPacketInputs(packetId, readDcInput(body))
    : await saveMississippiDocumentPacketInputs(packetId, readDocumentInput(body));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ packet: result.packet, persisted: result.persisted });
}

function readDcInput(body: Record<string, unknown>): Partial<DcDocumentPacketInput> {
  return {
    state: "DC",
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
    convictionLevel: body.convictionLevel === "misdemeanor" || body.convictionLevel === "felony" || body.convictionLevel === "unknown" ? body.convictionLevel : undefined,
    reliefTrack: body.reliefTrack === "automatic_expungement" || body.reliefTrack === "automatic_sealing" || body.reliefTrack === "actual_innocence_expungement" || body.reliefTrack === "interests_of_justice_sealing" || body.reliefTrack === "needs_review" ? body.reliefTrack : undefined,
    prosecutorOffice: body.prosecutorOffice === "USAO" || body.prosecutorOffice === "OAG" || body.prosecutorOffice === "unknown" ? body.prosecutorOffice : undefined,
    serviceMethod: body.serviceMethod === "email" || body.serviceMethod === "mail" || body.serviceMethod === "hand_delivery" || body.serviceMethod === "unknown" ? body.serviceMethod : undefined,
    hasMpdRecord: typeof body.hasMpdRecord === "boolean" ? body.hasMpdRecord : undefined,
    hasCourtDisposition: typeof body.hasCourtDisposition === "boolean" ? body.hasCourtDisposition : undefined,
    openOrPendingCharges: typeof body.openOrPendingCharges === "boolean" ? body.openOrPendingCharges : undefined,
    masterGridGroupOneToThree: typeof body.masterGridGroupOneToThree === "boolean" ? body.masterGridGroupOneToThree : undefined,
    automaticExcludedOffenseConcern: typeof body.automaticExcludedOffenseConcern === "boolean" ? body.automaticExcludedOffenseConcern : undefined,
    decriminalizedLegalizedOrUnconstitutionalOffense: typeof body.decriminalizedLegalizedOrUnconstitutionalOffense === "boolean" ? body.decriminalizedLegalizedOrUnconstitutionalOffense : undefined,
    marijuanaRelatedSignal: typeof body.marijuanaRelatedSignal === "boolean" ? body.marijuanaRelatedSignal : undefined,
    actualInnocenceStatement: readLongText(body.actualInnocenceStatement),
    interestsOfJusticeStatement: readLongText(body.interestsOfJusticeStatement),
    motionArgument: readLongText(body.motionArgument, 2400)
  };
}

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readDocumentInput(body: Record<string, unknown>): Partial<MississippiDocumentPacketInput> {
  return {
    county: readText(body.county),
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

function readLongText(value: unknown, max = 1200) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function readConvictionLevel(value: unknown): MississippiDocumentPacketInput["convictionLevel"] {
  return value === "felony" || value === "misdemeanor" ? value : undefined;
}
