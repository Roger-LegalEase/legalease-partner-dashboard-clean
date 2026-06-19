import "server-only";

import { generateDcDocumentDraft } from "@/lib/rcap/documents/dc/generator";
import { generateIllinoisDocumentDraft } from "@/lib/rcap/documents/illinois/generator";
import { generateMississippiPetitionDraft } from "@/lib/rcap/documents/mississippi/generator";
import { generatePennsylvaniaDocumentDraft } from "@/lib/rcap/documents/pennsylvania/generator";
import { generateTexasHarrisDocumentDraft } from "@/lib/rcap/documents/texas-harris/generator";
import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import { getBriefcaseItem, updateBriefcasePacketMetadata } from "@/lib/expungement-ai/briefcase";
import { isConsumerPaymentAllowed } from "@/lib/expungement-ai/eligibility-adapter";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { emitLegalEaseOsEvent, type LegalEaseOsEventOptions } from "@/lib/legalese-os-events";

export type ConsumerPacketArtifactRefs = {
  provider: "local_fallback";
  packetId: string;
  fileName: string;
  contentType: "text/plain";
  generatedAt: string;
  source: "legacy_generator" | "rcap_state_pack_fallback";
  legacyGenerator?: "mississippi" | "illinois" | "dc" | "pennsylvania" | "texas-harris";
  downloadPath: string;
  text: string;
};

export type ConsumerPacketStatus = {
  packetStatus: NonNullable<ConsumerBriefcaseItem["packetStatus"]>;
  artifactRefs?: ConsumerPacketArtifactRefs;
  canDownload: boolean;
};

export type ConsumerPacketDownload = {
  fileName: string;
  contentType: string;
  body: string;
};

type PacketGenerationEventOptions = Pick<LegalEaseOsEventOptions, "configEnv" | "fetcher" | "now">;

export async function generatePaidConsumerPacket({
  userId,
  briefcaseItemId,
  dryRunMode = false,
  legalEaseOsConfigEnv,
  legalEaseOsFetch,
  now
}: {
  userId: string;
  briefcaseItemId: string;
  dryRunMode?: boolean;
  legalEaseOsConfigEnv?: LegalEaseOsEventOptions["configEnv"];
  legalEaseOsFetch?: LegalEaseOsEventOptions["fetcher"];
  now?: LegalEaseOsEventOptions["now"];
}): Promise<ConsumerPacketStatus> {
  const item = await requireOwnedPacketItem(userId, briefcaseItemId);
  assertPacketGenerationAllowed(item, dryRunMode);

  const existing = artifactRefsFor(item);
  if (item.packetStatus === "ready" && existing) {
    return { packetStatus: "ready", artifactRefs: existing, canDownload: true };
  }

  await updateBriefcasePacketMetadata(userId, item.id, { packetStatus: "pending" });
  await updateBriefcasePacketMetadata(userId, item.id, { packetStatus: "generating" });

  try {
    const artifactRefs = buildConsumerPacketArtifact(item);
    await attachPacketToBriefcaseItem({ userId, item, artifactRefs });
    await emitPacketGeneratedEvent(item, artifactRefs, {
      configEnv: legalEaseOsConfigEnv,
      fetcher: legalEaseOsFetch,
      now
    });
    return { packetStatus: "ready", artifactRefs, canDownload: true };
  } catch (error) {
    await updateBriefcasePacketMetadata(userId, item.id, { packetStatus: "failed" });
    await emitPacketGenerationFailureHealthEvent(item, {
      configEnv: legalEaseOsConfigEnv,
      fetcher: legalEaseOsFetch,
      now
    });
    throw new ConsumerPacketGenerationError(error instanceof Error ? error.message : "Packet generation failed.");
  }
}

export async function getConsumerPacketStatus({
  userId,
  briefcaseItemId
}: {
  userId: string;
  briefcaseItemId: string;
}): Promise<ConsumerPacketStatus> {
  const item = await requireOwnedPacketItem(userId, briefcaseItemId);
  assertPacketGenerationAllowed(item, item.paymentProvider === "dry_run");
  const artifactRefs = artifactRefsFor(item);
  return {
    packetStatus: item.packetStatus ?? "not_started",
    artifactRefs,
    canDownload: item.packetStatus === "ready" && Boolean(artifactRefs)
  };
}

export async function getConsumerPacketDownload({
  userId,
  briefcaseItemId
}: {
  userId: string;
  briefcaseItemId: string;
}): Promise<ConsumerPacketDownload> {
  const item = await requireOwnedPacketItem(userId, briefcaseItemId);
  assertPacketGenerationAllowed(item, item.paymentProvider === "dry_run");
  const artifactRefs = artifactRefsFor(item);
  if (item.packetStatus !== "ready" || !artifactRefs) {
    throw new ConsumerPacketNotReadyError();
  }

  return {
    fileName: artifactRefs.fileName,
    contentType: artifactRefs.contentType,
    body: artifactRefs.text
  };
}

export async function attachPacketToBriefcaseItem({
  userId,
  item,
  artifactRefs
}: {
  userId: string;
  item: ConsumerBriefcaseItem;
  artifactRefs: ConsumerPacketArtifactRefs;
}) {
  return updateBriefcasePacketMetadata(userId, item.id, {
    packetStatus: "ready",
    artifactRefs
  });
}

export async function requireOwnedPacketItem(userId: string, briefcaseItemId: string) {
  const item = await getBriefcaseItem(userId, briefcaseItemId);
  if (!item) throw new ConsumerPacketNotFoundError();
  return item;
}

export function assertPacketGenerationAllowed(item: ConsumerBriefcaseItem, dryRunMode = false) {
  if (!isConsumerPaymentAllowed(item.resultCode ?? "guidance_only", item.paymentAllowed)) {
    throw new ConsumerPacketNotAllowedError(item.resultCode ?? "missing_result_code");
  }

  if (item.paymentStatus !== "paid" && !(dryRunMode && item.paymentProvider === "dry_run")) {
    throw new ConsumerPacketPaymentRequiredError();
  }
}

function buildConsumerPacketArtifact(item: ConsumerBriefcaseItem): ConsumerPacketArtifactRefs {
  const generatedAt = new Date().toISOString();
  const legacy = legacyGeneratorFor(item);
  const text = legacy ? renderLegacyGeneratorPacket(item, legacy) : renderAll51FallbackPacket(item);
  const fileName = `${slug(item.state)}-${slug(item.pathwayLabel ?? item.title)}-packet.txt`;

  return {
    provider: "local_fallback",
    packetId: item.id,
    fileName,
    contentType: "text/plain",
    generatedAt,
    source: legacy ? "legacy_generator" : "rcap_state_pack_fallback",
    ...(legacy ? { legacyGenerator: legacy } : {}),
    downloadPath: `/api/expungement-ai/packet/download?briefcaseItemId=${encodeURIComponent(item.id)}`,
    text
  };
}

async function emitPacketGeneratedEvent(
  item: ConsumerBriefcaseItem,
  artifactRefs: ConsumerPacketArtifactRefs,
  options: PacketGenerationEventOptions
) {
  await emitLegalEaseOsEvent({
    event_type: "packet.generated",
    source_system: "expungement_ai",
    subject_type: "packet_generation",
    subject_ref: `consumer_packet:${item.id}:${artifactRefs.source}`,
    jurisdiction: item.state,
    pathway_key: item.resultCode,
    packet_type: item.packetType ?? artifactRefs.legacyGenerator ?? artifactRefs.source,
    metrics: {
      reason_code_count: 0,
      next_step_count: item.nextSteps.length,
      has_packet_artifact: true,
      generator_source: artifactRefs.source
    },
    summary: "Document-prep packet generation completed.",
    recommended_operator_action: "Review packet generation trends if failures increase.",
    pii_classification: "hashed_reference_only"
  }, legalEaseOsEventOptions(options));
}

async function emitPacketGenerationFailureHealthEvent(
  item: ConsumerBriefcaseItem,
  options: PacketGenerationEventOptions
) {
  await emitLegalEaseOsEvent({
    event_type: "engine.health_changed",
    source_system: "expungement_ai",
    subject_type: "packet_generation",
    subject_ref: `consumer_packet_failure:${item.id}:${item.packetType ?? item.resultCode ?? "packet"}`,
    jurisdiction: item.state,
    pathway_key: item.resultCode,
    packet_type: item.packetType,
    metrics: {
      status: "fulfillment_failed",
      reason_code_count: 0,
      next_step_count: item.nextSteps.length,
      failure_stage: "packet_generation"
    },
    summary: "Document-prep fulfillment failed before packet completion.",
    recommended_operator_action: "Review fulfillment health and retry manually if needed.",
    pii_classification: "hashed_reference_only"
  }, legalEaseOsEventOptions(options));
}

function legalEaseOsEventOptions(options: PacketGenerationEventOptions): LegalEaseOsEventOptions {
  return {
    ...(options.configEnv ? { configEnv: options.configEnv } : {}),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.now ? { now: options.now } : {})
  };
}

function renderLegacyGeneratorPacket(item: ConsumerBriefcaseItem, legacyGenerator: NonNullable<ConsumerPacketArtifactRefs["legacyGenerator"]>) {
  const session = intakeSessionFor(item);
  const generated = (() => {
    if (legacyGenerator === "mississippi") return generateMississippiPetitionDraft(session, {});
    if (legacyGenerator === "illinois") return generateIllinoisDocumentDraft(session, {});
    if (legacyGenerator === "dc") return generateDcDocumentDraft(session, {});
    if (legacyGenerator === "pennsylvania") return generatePennsylvaniaDocumentDraft(session, {});
    return generateTexasHarrisDocumentDraft(session, {});
  })();

  return [
    generated.draftTitle,
    "",
    generated.draftPlainText,
    "",
    "FILING CHECKLIST",
    ...item.nextSteps.map((step) => `- ${step}`),
    "",
    "PAYMENT LINKAGE",
    paymentLinkageText(item)
  ].join("\n");
}

function renderAll51FallbackPacket(item: ConsumerBriefcaseItem) {
  return [
    `${item.state} Self-Help Record-Clearing Packet`,
    "",
    item.summary,
    "",
    `Jurisdiction: ${item.state}`,
    `Pathway: ${item.pathwayLabel ?? item.resultCode ?? "Packet-ready pathway"}`,
    `Result: ${item.resultCode}`,
    "",
    "FILING CHECKLIST",
    ...item.nextSteps.map((step) => `- ${step}`),
    "",
    "NEXT STEPS",
    "- Review every generated document before filing.",
    "- Confirm court filing instructions and fees before submission.",
    "- Keep a copy of your receipt and filed documents.",
    "",
    "PAYMENT LINKAGE",
    paymentLinkageText(item)
  ].join("\n");
}

function intakeSessionFor(item: ConsumerBriefcaseItem): RcapIntakeSession {
  return {
    id: item.id,
    partnerSlug: "expungement-ai-consumer",
    status: "completed",
    currentStep: "completed",
    state: item.state,
    county: "County to be confirmed",
    recordType: "not_sure_what_shows",
    chargeOrCaseType: item.pathwayLabel ?? item.title,
    caseOutcome: item.resultCode === "packet_ready_with_caution" ? "not_sure" : "dismissed",
    approximateCaseYear: "Unknown",
    hasDocuments: false,
    needsRecordCheck: true,
    pathwaySummary: item.summary,
    suggestedNextStep: item.nextSteps[0],
    eligibilitySignal: "possible_pathway",
    legalDisclaimerAccepted: true,
    createdAt: item.createdAt,
    completedAt: new Date().toISOString()
  };
}

function paymentLinkageText(item: ConsumerBriefcaseItem) {
  return [
    `Payment status: ${item.paymentStatus ?? "unknown"}`,
    `Provider: ${item.paymentProvider ?? "unknown"}`,
    `Checkout session: ${item.checkoutSessionId ?? "not recorded"}`,
    `Payment intent: ${item.paymentIntentId ?? "not recorded"}`,
    `Amount cents: ${item.amountCents ?? 5000}`,
    `Receipt: ${item.receiptUrl ?? "not recorded"}`
  ].join("\n");
}

function artifactRefsFor(item: ConsumerBriefcaseItem): ConsumerPacketArtifactRefs | undefined {
  const refs = item.artifactRefs;
  if (
    refs?.provider === "local_fallback" &&
    typeof refs.packetId === "string" &&
    typeof refs.fileName === "string" &&
    refs.contentType === "text/plain" &&
    typeof refs.generatedAt === "string" &&
    typeof refs.downloadPath === "string" &&
    typeof refs.text === "string"
  ) {
    return refs as ConsumerPacketArtifactRefs;
  }

  return undefined;
}

function legacyGeneratorFor(item: ConsumerBriefcaseItem): ConsumerPacketArtifactRefs["legacyGenerator"] | undefined {
  const state = item.state.toUpperCase();
  if (state === "MS") return "mississippi";
  if (state === "IL") return "illinois";
  if (state === "DC") return "dc";
  if (state === "PA") return "pennsylvania";
  if (state === "TX-HARRIS" || state === "TX_HARRIS") return "texas-harris";
  return undefined;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "packet";
}

export class ConsumerPacketNotFoundError extends Error {
  constructor() {
    super("Briefcase item not found.");
    this.name = "ConsumerPacketNotFoundError";
  }
}

export class ConsumerPacketPaymentRequiredError extends Error {
  constructor() {
    super("Payment confirmation is required before packet generation.");
    this.name = "ConsumerPacketPaymentRequiredError";
  }
}

export class ConsumerPacketNotAllowedError extends Error {
  constructor(readonly resultCode: string) {
    super(`Consumer packet generation is not allowed for ${resultCode}.`);
    this.name = "ConsumerPacketNotAllowedError";
  }
}

export class ConsumerPacketNotReadyError extends Error {
  constructor() {
    super("Packet is not ready for download.");
    this.name = "ConsumerPacketNotReadyError";
  }
}

export class ConsumerPacketGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsumerPacketGenerationError";
  }
}
