import "server-only";

import type {
  DcDocumentPacketInput,
  IllinoisDocumentPacketInput,
  MississippiDocumentPacketInput,
  PennsylvaniaDocumentPacketInput,
  RcapDocumentPacket,
  SourceDocumentPacketInput,
  TexasHarrisDocumentPacketInput
} from "@/lib/rcap/documents/types";
import { buildFilingNextStepsPacket } from "@/lib/rcap/documents/filing-next-steps";

const packets = new Map<string, RcapDocumentPacket>();

type PacketResult = Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }>;

export async function createMississippiDocumentPacket(input: MississippiDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "MS" });
}

export async function createIllinoisDocumentPacket(input: IllinoisDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "IL" });
}

export async function createDcDocumentPacket(input: DcDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "DC" });
}

export async function createPennsylvaniaDocumentPacket(input: PennsylvaniaDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "PA" });
}

export async function createTexasHarrisDocumentPacket(input: TexasHarrisDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "TX", county: "Harris" });
}

export async function getRcapDocumentPacket(packetId: string) {
  return packets.get(packetId) ?? null;
}

export async function generateSavedMississippiDocumentPacket(packetId: string): PacketResult {
  return generateSavedSourceDocumentPacket(packetId);
}

export async function generateSavedDcDocumentPacket(packetId: string): PacketResult {
  return generateSavedSourceDocumentPacket(packetId);
}

export async function saveMississippiDocumentPacketInputs(packetId: string, input: Partial<MississippiDocumentPacketInput>): PacketResult {
  return saveSourceDocumentPacketInputs(packetId, input);
}

export async function saveDcDocumentPacketInputs(packetId: string, input: Partial<DcDocumentPacketInput>): PacketResult {
  return saveSourceDocumentPacketInputs(packetId, input);
}

export async function getPartnerDocumentActivitySummary(partnerSlug?: string) {
  void partnerSlug;
  const allPackets = Array.from(packets.values());
  return {
    totalPackets: packets.size,
    missingInformationPackets: allPackets.filter((packet) => packet.status === "missing_information").length,
    readyForReviewPackets: allPackets.filter((packet) => packet.status === "ready_for_review").length,
    blockedReviewRequired: allPackets.filter((packet) => packet.status === "blocked_review_required").length,
    briefcaseItems: allPackets.filter((packet) => packet.briefcaseId).length,
    latestPacketDate: allPackets.map((packet) => packet.updatedAt ?? packet.createdAt).filter(Boolean).sort().at(-1) ?? null,
    pathwayBreakdown: countBy(allPackets.map((packet) => packet.pathway)),
    stateBreakdown: countBy(allPackets.map((packet) => packet.state))
  };
}

async function createSourceDocumentPacket(input: SourceDocumentPacketInput): PacketResult {
  if (!input.partnerSlug) return { ok: false, error: "A partner slug is required." };
  const packet = packetFromInput(input);
  packets.set(packet.id, packet);
  return { ok: true, packet, persisted: false };
}

async function generateSavedSourceDocumentPacket(packetId: string): PacketResult {
  const packet = packets.get(packetId);
  if (!packet) return { ok: false, error: "Document packet not found." };
  const generated = {
    ...packet,
    status: "preview_generated" as const,
    completedAt: new Date().toISOString()
  };
  packets.set(packetId, generated);
  return { ok: true, packet: generated, persisted: false };
}

async function saveSourceDocumentPacketInputs(packetId: string, input: Partial<SourceDocumentPacketInput>): PacketResult {
  const packet = packets.get(packetId);
  if (!packet) return { ok: false, error: "Document packet not found." };
  const updated = packetFromInput({
    ...packet,
    ...input,
    partnerSlug: packet.partnerSlug,
    state: packet.state
  });
  packets.set(packetId, { ...updated, id: packetId });
  return { ok: true, packet: packets.get(packetId) as RcapDocumentPacket, persisted: false };
}

function packetFromInput(input: SourceDocumentPacketInput): RcapDocumentPacket {
  const state = String(input.state ?? "US").toUpperCase();
  const now = new Date().toISOString();
  const filingNextStepsPacket = buildFilingNextStepsPacket({
    state,
    county: typeof input.county === "string" ? input.county : undefined,
    documentType: "source_driven_packet",
    pathway: "source_engine_packet_plan",
    countyCourtInstructions: ["Confirm court contact and location from the source-driven packet plan."],
    filingInstructions: ["Use the source-driven RCAP engine packet plan for this jurisdiction/pathway."],
    safetyDisclaimer: "This source-driven packet shell is not legal advice and requires review before filing."
  });
  return {
    id: crypto.randomUUID(),
    partnerSlug: input.partnerSlug,
    intakeSessionId: stringValue(input.intakeSessionId),
    userId: stringValue(input.userId),
    briefcaseId: stringValue(input.briefcaseId),
    state,
    county: stringValue(input.county),
    documentType: "source_driven_packet",
    pathway: "source_engine_packet_plan",
    status: "ready_for_review",
    petitionerFirstName: stringValue(input.petitionerFirstName),
    petitionerLastName: stringValue(input.petitionerLastName),
    courtType: stringValue(input.courtType),
    courtCounty: stringValue(input.courtCounty),
    courtName: stringValue(input.courtName),
    jurisdiction: stringValue(input.jurisdiction),
    causeNumber: stringValue(input.causeNumber ?? input.caseNumber ?? input.docketNumber),
    charge: stringValue(input.charge),
    offenseDate: stringValue(input.offenseDate),
    arrestDate: stringValue(input.arrestDate),
    arrestingAgency: stringValue(input.arrestingAgency),
    agencyCaseNumber: stringValue(input.agencyCaseNumber),
    dispositionDate: stringValue(input.dispositionDate),
    convictionDate: stringValue(input.convictionDate),
    sentenceCompletionDate: stringValue(input.sentenceCompletionDate),
    hasZeroBalance: booleanValue(input.hasZeroBalance),
    hasCourtDocuments: booleanValue(input.hasCourtDocuments),
    firstOffenderSignal: booleanValue(input.firstOffenderSignal),
    nonTrafficSignal: booleanValue(input.nonTrafficSignal),
    excludedOffenseScreening: booleanValue(input.excludedOffenseScreening),
    oneFelonyExpungementSignal: booleanValue(input.oneFelonyExpungementSignal),
    needsRecordReview: true,
    generatedHtml: "<p>Source-driven packet plan pending review.</p>",
    generatedPlainText: "Source-driven packet plan pending review.",
    filingInstructions: filingNextStepsPacket.afterFiling,
    countyCourtInstructions: filingNextStepsPacket.courtContactOrLocationGuidance,
    filingNextStepsPacket,
    missingFields: [],
    safetyDisclaimer: filingNextStepsPacket.safetyDisclaimer,
    createdAt: now,
    updatedAt: now
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}
