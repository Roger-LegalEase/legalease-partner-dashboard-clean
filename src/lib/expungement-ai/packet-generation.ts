import "server-only";

import {
  getBriefcaseItem,
  getBriefcaseItemForWebhook,
  isPartnerSponsoredPacketItem,
  partnerSlugForPacketItem,
  updateBriefcasePacketMetadata,
  updateBriefcasePacketMetadataForWebhook
} from "@/lib/expungement-ai/briefcase";
import { isConsumerPaymentAllowed } from "@/lib/expungement-ai/eligibility-adapter";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { emitLegalEaseOsEvent, type LegalEaseOsEventOptions } from "@/lib/legalese-os-events";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { partnerPacketInformationActionPath } from "@/lib/expungement-ai/partner-packet-links";
import {
  CurrentPacketVerificationRequiredError,
  requireCurrentPacketVerification
} from "@/lib/expungement-ai/packet-information";

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
  const partnerSponsored = await isPartnerSponsoredPacketItem(item);
  const existing = readyPacketArtifactAccess(item, partnerSponsored);
  if (existing) {
    return { packetStatus: "ready", artifactRefs: existing, canDownload: true };
  }
  const verification = assertPacketGenerationAllowed(item, dryRunMode, { paymentRequired: !partnerSponsored });

  if (!(await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
    packetStatus: "pending",
    expectedVerificationHash: verification.hash
  } }))) throw new CurrentPacketVerificationRequiredError("verification_changed_before_generation");
  if (!(await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
    packetStatus: "generating",
    expectedVerificationHash: verification.hash
  } }))) throw new CurrentPacketVerificationRequiredError("verification_changed_before_generation");

  try {
    const artifactRefs = buildConsumerPacketArtifact(item, verification);
    // Sponsored artifacts become Ready only inside the captain-owned atomic
    // credit-consumption/finalization RPC. Returning the prepared artifact is
    // non-durable; a refusal leaves the item generating and inaccessible.
    if (partnerSponsored) {
      return { packetStatus: "generating", artifactRefs, canDownload: false };
    }
    await attachPacketToBriefcaseItem({
      userId,
      item,
      artifactRefs,
      webhookMode,
      expectedVerificationHash: verification.hash
    });
    await emitPacketGeneratedEvent(item, artifactRefs, {
      configEnv: legalEaseOsConfigEnv,
      fetcher: legalEaseOsFetch,
      now
    });
    return { packetStatus: "ready", artifactRefs, canDownload: true };
  } catch (error) {
    await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
      packetStatus: "failed",
      expectedVerificationHash: verification.hash
    } });
    await emitPacketGenerationFailureHealthEvent(item, {
      configEnv: legalEaseOsConfigEnv,
      fetcher: legalEaseOsFetch,
      now
    });
    if (error instanceof CurrentPacketVerificationRequiredError) throw error;
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
  const partnerSponsored = await isPartnerSponsoredPacketItem(item);
  return consumerPacketStatusForItem(item, partnerSponsored);
}

export function consumerPacketStatusForItem(
  item: ConsumerBriefcaseItem,
  partnerSponsored = false
): ConsumerPacketStatus {
  const readyArtifact = readyPacketArtifactAccess(item, partnerSponsored);
  if (readyArtifact) return { packetStatus: "ready", artifactRefs: readyArtifact, canDownload: true };
  assertPacketGenerationAllowed(item, item.paymentProvider === "dry_run", { paymentRequired: !partnerSponsored });
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
  const partnerSponsored = await isPartnerSponsoredPacketItem(item);
  const artifactRefs = readyPacketArtifactAccess(item, partnerSponsored);
  if (!artifactRefs) {
    assertPacketGenerationAllowed(item, item.paymentProvider === "dry_run", { paymentRequired: !partnerSponsored });
  }
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
  webhookMode = false,
  expectedVerificationHash
}: {
  userId: string;
  item: ConsumerBriefcaseItem;
  artifactRefs: ConsumerPacketArtifactRefs;
  webhookMode?: boolean;
  expectedVerificationHash: string;
}) {
  const updated = await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
    packetStatus: "ready",
    artifactRefs: mergePacketArtifactEnvelope(item.artifactRefs, artifactRefs),
    expectedVerificationHash
  } });
  if (!updated) throw new CurrentPacketVerificationRequiredError("verification_changed_before_artifact_attach");
  return updated;
}

export function mergePacketArtifactEnvelope(
  current: Record<string, unknown> | undefined,
  artifact: ConsumerPacketArtifactRefs
): Record<string, unknown> {
  return { ...(current ?? {}), ...artifact };
}

/** Existing immutable packet bytes stay accessible without retroactive verification. */
export function readyPacketArtifactAccess(
  item: ConsumerBriefcaseItem,
  partnerSponsored = false
): ConsumerPacketArtifactRefs | undefined {
  if (item.packetStatus !== "ready") return undefined;
  if (item.paymentStatus !== "paid" && item.paymentProvider !== "dry_run" && !partnerSponsored) return undefined;
  return artifactRefsFor(item);
}

export async function attachMississippiPacketInformationRequest({
  userId,
  briefcaseItemId
}: {
  userId: string;
  briefcaseItemId: string;
}): Promise<ConsumerPacketStatus> {
  const item = await requireOwnedPacketItem(userId, briefcaseItemId);
  const verification = await assertMississippiPartnerPacketReady(item);

  const existing = artifactRefsFor(item);
  if (item.packetStatus === "ready" && existing) {
    return { packetStatus: "ready", artifactRefs: existing, canDownload: "downloadPath" in existing };
  }
  if (existing?.source === "mississippi_petition_information_required") {
    return { packetStatus: item.packetStatus ?? "pending", artifactRefs: existing, canDownload: false };
  }

  // Route the packet-information form to the item's actual sponsoring partner,
  // not a hardcoded slug. assertMississippiPartnerPacketReady already confirmed
  // this item is partner-sponsored, so a slug must resolve; fail closed rather
  // than send the user to the wrong partner's form.
  const partnerSlug = await partnerSlugForPacketItem(item);
  if (!partnerSlug) {
    throw new ConsumerPacketGenerationError("A sponsoring partner slug is required to build the Mississippi packet information form.");
  }
  const artifactRefs = buildMississippiPacketInformationArtifact(item, partnerSlug);
  const updated = await updatePacketMetadata({ userId, itemId: item.id, webhookMode: false, metadata: {
    packetStatus: "pending",
    artifactRefs,
    expectedVerificationHash: verification.hash
  } });
  if (!updated) throw new CurrentPacketVerificationRequiredError("verification_changed_before_packet_information_attach");
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
  const verification = await assertMississippiPartnerPacketReady(item);

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
  await attachPacketToBriefcaseItem({
    userId,
    item,
    artifactRefs,
    expectedVerificationHash: verification.hash
  });
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
  const verification = requireCurrentPacketVerification(item);
  const resultCode = item.resultCode ?? "guidance_only";
  const paymentRequired = options.paymentRequired ?? true;
  const packetReadyResult = resultCode === "packet_ready" || resultCode === "packet_ready_with_caution";

  if (!packetReadyResult || (paymentRequired && !isConsumerPaymentAllowed(resultCode, item.paymentAllowed))) {
    throw new ConsumerPacketNotAllowedError(resultCode);
  }

  if (paymentRequired && item.paymentStatus !== "paid" && !(dryRunMode && item.paymentProvider === "dry_run")) {
    throw new ConsumerPacketPaymentRequiredError();
  }
  return verification;
}

function buildConsumerPacketArtifact(
  item: ConsumerBriefcaseItem,
  verification: ReturnType<typeof requireCurrentPacketVerification>
): ConsumerPacketArtifactRefs {
  const generatedAt = new Date().toISOString();
  const profile = getProfileByJurisdiction(item.state);
  const pathwayId = verification.snapshot.pathwayId;
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

export function buildMississippiPacketInformationArtifact(item: ConsumerBriefcaseItem, partnerSlug: string): ConsumerPacketArtifactRefs {
  const actionPath = partnerPacketInformationActionPath(partnerSlug, item.id);
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
  const verification = assertPacketGenerationAllowed(item, false, { paymentRequired: false });
  if (!(await isPartnerSponsoredPacketItem(item))) {
    throw new ConsumerPacketPaymentRequiredError();
  }
  return verification;
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
    expectedVerificationHash?: string;
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

  if (
    refs?.provider === "rcap_legacy_mississippi" &&
    typeof refs.packetId === "string" &&
    typeof refs.fileName === "string" &&
    typeof refs.generatedAt === "string" &&
    refs.source === "mississippi_legacy_petition_packet" &&
    refs.contentType === "application/pdf" &&
    typeof refs.downloadPath === "string" &&
    typeof refs.courtPacketDownloadPath === "string"
  ) {
    return refs as ConsumerPacketArtifactRefs;
  }

  if (
    refs?.provider === "rcap_legacy_mississippi" &&
    typeof refs.packetId === "string" &&
    typeof refs.fileName === "string" &&
    typeof refs.generatedAt === "string" &&
    refs.source === "mississippi_petition_information_required" &&
    typeof refs.actionPath === "string" &&
    Array.isArray(refs.missingFields) &&
    refs.missingFields.every((field) => typeof field === "string")
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
