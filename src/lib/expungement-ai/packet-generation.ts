import "server-only";

import {
  getBriefcaseItem,
  getBriefcaseItemForWebhook,
  isPartnerSponsoredPacketItem,
  updateBriefcasePacketMetadata,
  updateBriefcasePacketMetadataForWebhook
} from "@/lib/expungement-ai/briefcase";
import { isConsumerPaymentAllowed } from "@/lib/expungement-ai/eligibility-adapter";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { emitLegalEaseOsEvent, type LegalEaseOsEventOptions } from "@/lib/legalese-os-events";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";

export type ConsumerPacketArtifactRefs = {
  provider: "rcap_source_engine";
  packetId: string;
  fileName: string;
  contentType: "text/plain" | "application/pdf";
  generatedAt: string;
  source: "source_driven_packet_plan";
  packetPlanId: string;
  downloadPath: string;
  text: string;
} | {
  provider: "rcap_legacy_mississippi";
  packetId: string;
  fileName: string;
  contentType: "application/pdf";
  generatedAt: string;
  source: "mississippi_legacy_petition_packet";
  downloadPath: string;
  courtPacketDownloadPath: string;
} | {
  provider: "rcap_legacy_mississippi";
  packetId: string;
  fileName: string;
  generatedAt: string;
  source: "mississippi_petition_information_required";
  actionPath: string;
  missingFields: string[];
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
  webhookMode = false,
  legalEaseOsConfigEnv,
  legalEaseOsFetch,
  now
}: {
  userId: string;
  briefcaseItemId: string;
  dryRunMode?: boolean;
  webhookMode?: boolean;
  legalEaseOsConfigEnv?: LegalEaseOsEventOptions["configEnv"];
  legalEaseOsFetch?: LegalEaseOsEventOptions["fetcher"];
  now?: LegalEaseOsEventOptions["now"];
}): Promise<ConsumerPacketStatus> {
  const item = webhookMode
    ? await requireWebhookOwnedPacketItem(userId, briefcaseItemId)
    : await requireOwnedPacketItem(userId, briefcaseItemId);
  assertPacketGenerationAllowed(item, dryRunMode, { paymentRequired: !(await isPartnerSponsoredPacketItem(item)) });

  const existing = artifactRefsFor(item);
  if (item.packetStatus === "ready" && existing) {
    return { packetStatus: "ready", artifactRefs: existing, canDownload: true };
  }

  await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: { packetStatus: "pending" } });
  await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: { packetStatus: "generating" } });

  try {
    const artifactRefs = buildConsumerPacketArtifact(item);
    await attachPacketToBriefcaseItem({ userId, item, artifactRefs, webhookMode });
    await emitPacketGeneratedEvent(item, artifactRefs, {
      configEnv: legalEaseOsConfigEnv,
      fetcher: legalEaseOsFetch,
      now
    });
    return { packetStatus: "ready", artifactRefs, canDownload: true };
  } catch (error) {
    await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: { packetStatus: "failed" } });
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
  assertPacketGenerationAllowed(item, item.paymentProvider === "dry_run", { paymentRequired: !(await isPartnerSponsoredPacketItem(item)) });
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
  assertPacketGenerationAllowed(item, item.paymentProvider === "dry_run", { paymentRequired: !(await isPartnerSponsoredPacketItem(item)) });
  const artifactRefs = artifactRefsFor(item);
  if (item.packetStatus !== "ready" || !artifactRefs || !("text" in artifactRefs)) {
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
  artifactRefs,
  webhookMode = false
}: {
  userId: string;
  item: ConsumerBriefcaseItem;
  artifactRefs: ConsumerPacketArtifactRefs;
  webhookMode?: boolean;
}) {
  return updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
    packetStatus: "ready",
    artifactRefs
  } });
}

export async function attachMississippiPacketInformationRequest({
  userId,
  briefcaseItemId
}: {
  userId: string;
  briefcaseItemId: string;
}): Promise<ConsumerPacketStatus> {
  const item = await requireOwnedPacketItem(userId, briefcaseItemId);
  await assertMississippiPartnerPacketReady(item);

  const existing = artifactRefsFor(item);
  if (item.packetStatus === "ready" && existing) {
    return { packetStatus: "ready", artifactRefs: existing, canDownload: "downloadPath" in existing };
  }
  if (existing?.source === "mississippi_petition_information_required") {
    return { packetStatus: item.packetStatus ?? "pending", artifactRefs: existing, canDownload: false };
  }

  const artifactRefs = buildMississippiPacketInformationArtifact(item);
  await updatePacketMetadata({ userId, itemId: item.id, webhookMode: false, metadata: {
    packetStatus: "pending",
    artifactRefs
  } });
  return { packetStatus: "pending", artifactRefs, canDownload: false };
}

export async function attachMississippiLegacyPacketArtifact({
  userId,
  briefcaseItemId,
  rcapPacketId
}: {
  userId: string;
  briefcaseItemId: string;
  rcapPacketId: string;
}): Promise<ConsumerPacketStatus> {
  const item = await requireOwnedPacketItem(userId, briefcaseItemId);
  await assertMississippiPartnerPacketReady(item);

  const existing = artifactRefsFor(item);
  if (item.packetStatus === "ready" && existing?.source === "mississippi_legacy_petition_packet" && existing.packetId === rcapPacketId) {
    return { packetStatus: "ready", artifactRefs: existing, canDownload: true };
  }

  const artifactRefs: ConsumerPacketArtifactRefs = {
    provider: "rcap_legacy_mississippi",
    packetId: rcapPacketId,
    fileName: "mississippi-petition-packet.pdf",
    contentType: "application/pdf",
    generatedAt: new Date().toISOString(),
    source: "mississippi_legacy_petition_packet",
    downloadPath: `/api/rcap/documents/${encodeURIComponent(rcapPacketId)}/pdf/full`,
    courtPacketDownloadPath: `/api/rcap/documents/${encodeURIComponent(rcapPacketId)}/pdf/court`
  };
  await attachPacketToBriefcaseItem({ userId, item, artifactRefs });
  return { packetStatus: "ready", artifactRefs, canDownload: true };
}

export async function requireOwnedPacketItem(userId: string, briefcaseItemId: string) {
  const item = await getBriefcaseItem(userId, briefcaseItemId);
  if (!item) throw new ConsumerPacketNotFoundError();
  return item;
}

export async function requireWebhookOwnedPacketItem(userId: string, briefcaseItemId: string) {
  const item = await getBriefcaseItemForWebhook(userId, briefcaseItemId);
  if (!item) throw new ConsumerPacketNotFoundError();
  return item;
}

export function assertPacketGenerationAllowed(
  item: ConsumerBriefcaseItem,
  dryRunMode = false,
  options: { paymentRequired?: boolean } = {}
) {
  const resultCode = item.resultCode ?? "guidance_only";
  const paymentRequired = options.paymentRequired ?? true;
  const packetReadyResult = resultCode === "packet_ready" || resultCode === "packet_ready_with_caution";

  if (!packetReadyResult || (paymentRequired && !isConsumerPaymentAllowed(resultCode, item.paymentAllowed))) {
    throw new ConsumerPacketNotAllowedError(resultCode);
  }

  if (paymentRequired && item.paymentStatus !== "paid" && !(dryRunMode && item.paymentProvider === "dry_run")) {
    throw new ConsumerPacketPaymentRequiredError();
  }
}

function buildConsumerPacketArtifact(item: ConsumerBriefcaseItem): ConsumerPacketArtifactRefs {
  const generatedAt = new Date().toISOString();
  const profile = getProfileByJurisdiction(item.state);
  const pathwayId = item.pathwayLabel;
  const plan = profile && pathwayId ? packetPlanForPathway(profile, pathwayId) : undefined;
  if (!profile || !pathwayId || !plan) {
    throw new ConsumerPacketGenerationError("A source-driven jurisdiction/pathway packet plan is required.");
  }
  const text = renderSourceDrivenPacket(item, profile.jurisdiction.name, plan);
  const fileName = `${slug(item.state)}-${slug(item.pathwayLabel ?? item.title)}-packet.txt`;

  return {
    provider: "rcap_source_engine",
    packetId: item.id,
    fileName,
    contentType: "text/plain",
    generatedAt,
    source: "source_driven_packet_plan",
    packetPlanId: plan.pathwayId,
    downloadPath: `/api/expungement-ai/packet/download?briefcaseItemId=${encodeURIComponent(item.id)}`,
    text
  };
}

function buildMississippiPacketInformationArtifact(item: ConsumerBriefcaseItem): ConsumerPacketArtifactRefs {
  const actionPath = `/documents/we-must-vote/form?briefcaseItemId=${encodeURIComponent(item.id)}`;
  return {
    provider: "rcap_legacy_mississippi",
    packetId: item.id,
    fileName: "Mississippi petition packet information",
    generatedAt: new Date().toISOString(),
    source: "mississippi_petition_information_required",
    actionPath,
    missingFields: [
      "courtType",
      "courtCounty",
      "courtName",
      "jurisdiction",
      "causeNumber",
      "charge",
      "arrestDate",
      "offenseDate",
      "arrestingAgency",
      "agencyCaseNumber",
      "dispositionDate",
      "convictionDate",
      "sentenceCompletionDate",
      "convictionLevel",
      "hasZeroBalance",
      "firstOffenderSignal",
      "nonTrafficSignal",
      "excludedOffenseScreening",
      "oneFelonyExpungementSignal"
    ]
  };
}

async function assertMississippiPartnerPacketReady(item: ConsumerBriefcaseItem) {
  const state = item.state.trim().toLowerCase();
  if (state !== "ms" && state !== "mississippi") {
    throw new ConsumerPacketNotAllowedError(item.resultCode ?? "guidance_only");
  }
  assertPacketGenerationAllowed(item, false, { paymentRequired: false });
  if (!(await isPartnerSponsoredPacketItem(item))) {
    throw new ConsumerPacketPaymentRequiredError();
  }
}

async function updatePacketMetadata({
  userId,
  itemId,
  metadata,
  webhookMode
}: {
  userId: string;
  itemId: string;
  metadata: {
    packetStatus: ConsumerBriefcaseItem["packetStatus"];
    artifactRefs?: Record<string, unknown>;
  };
  webhookMode: boolean;
}) {
  return webhookMode
    ? updateBriefcasePacketMetadataForWebhook(userId, itemId, metadata)
    : updateBriefcasePacketMetadata(userId, itemId, metadata);
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
    packet_type: item.packetType ?? artifactRefs.source,
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

function renderSourceDrivenPacket(item: ConsumerBriefcaseItem, jurisdictionName: string, plan: NonNullable<ReturnType<typeof packetPlanForPathway>>) {
  return [
    `${jurisdictionName} Source-Driven Record-Clearing Packet`,
    "",
    item.summary,
    "",
    `Jurisdiction: ${item.state}`,
    `Pathway: ${plan.pathwayId}`,
    `Packet mode: ${plan.mode}`,
    `Form mapping status: ${plan.formMappingStatus}`,
    `Result: ${item.resultCode}`,
    `Source forms: ${plan.sourceFormIds.length > 0 ? plan.sourceFormIds.join(", ") : "not required"}`,
    `Source rule refs: ${plan.sourceRuleRefs.join(", ")}`,
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
    refs?.provider === "rcap_source_engine" &&
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
