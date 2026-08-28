import "server-only";

import {
  getBriefcaseItem,
  getBriefcaseItemForWebhook,
  partnerSlugForPacketItem,
  updateBriefcasePacketMetadata,
  updateBriefcasePacketMetadataForWebhook
} from "@/lib/expungement-ai/briefcase";
import { isConsumerPaymentAllowed } from "@/lib/expungement-ai/eligibility-adapter";
import { consumerPacketPaymentAuthority } from "@/lib/expungement-ai/consumer-payment-authority";
import { readTrustedBriefcasePresentationSource } from "@/lib/expungement-ai/briefcase-presentation-authority";
import { finalizeSponsoredPacketGeneration } from "@/lib/expungement-ai/rcap-slot-lifecycle";
import { assertPacketFulfillmentProven, packetFulfillmentAuthority } from "@/lib/expungement-ai/packet-fulfillment-authority";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { emitLegalEaseOsEvent, type LegalEaseOsEventOptions } from "@/lib/legalese-os-events";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { partnerPacketInformationActionPath } from "@/lib/expungement-ai/partner-packet-links";
import {
  CurrentPacketVerificationRequiredError,
  requireCurrentPacketVerification
} from "@/lib/expungement-ai/packet-information";
import {
  attachConsumerPacketArtifactIfVerified,
  readProtectedPacketArtifact,
  validProtectedLegacyArtifactEvidence,
  type ProtectedPacketArtifactRecord
} from "@/lib/expungement-ai/verification-cas";

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
  protectedSponsorship?: {
    sourceSessionId: string;
    expectedVerificationHash: string;
  };
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
  const protectedArtifactRead = await readProtectedPacketArtifact({
    consumerAuthUserId: userId,
    briefcaseItemId: item.id
  });
  if (!protectedArtifactRead.ok) {
    throw new ConsumerPacketArtifactAuthorityUnavailableError(protectedArtifactRead.reason);
  }
  const existing = readyPacketArtifactAccess(item, protectedArtifactRead.value);
  if (existing) {
    return { packetStatus: "ready", artifactRefs: existing, canDownload: true };
  }
  const currentVerification = await requireCurrentPacketVerification(userId, item);
  const sponsorship = await requireCurrentPacketSponsorshipAuthority(userId, item);
  const partnerSponsored = sponsorship.sponsored;
  const verification = await assertPacketGenerationAllowed(userId, item, dryRunMode, {
    paymentRequired: !partnerSponsored,
    verification: currentVerification
  });

  if (!(await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
    packetStatus: "pending"
  } }))) throw new CurrentPacketVerificationRequiredError("verification_changed_before_generation");
  if (!(await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
    packetStatus: "generating"
  } }))) throw new CurrentPacketVerificationRequiredError("verification_changed_before_generation");

  try {
    const artifactRefs = buildConsumerPacketArtifact(item, verification);
    // Sponsored artifacts become Ready only inside the captain-owned atomic
    // credit-consumption/finalization RPC. Returning the prepared artifact is
    // non-durable; a refusal leaves the item generating and inaccessible.
    if (partnerSponsored) {
      return {
        packetStatus: "generating",
        artifactRefs,
        canDownload: false,
        protectedSponsorship: {
          sourceSessionId: sponsorship.sourceSessionId,
          expectedVerificationHash: verification.hash
        }
      };
    }
    await attachPacketToBriefcaseItem({
      userId,
      item,
      artifactRefs,
      expectedVerificationHash: verification.hash,
      entitlementSource: "consumer_payment"
    });
    await emitPacketGeneratedEvent(item, artifactRefs, {
      configEnv: legalEaseOsConfigEnv,
      fetcher: legalEaseOsFetch,
      now
    });
    return { packetStatus: "ready", artifactRefs, canDownload: true };
  } catch (error) {
    await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
      packetStatus: "failed"
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
  const protectedArtifact = await requireProtectedPacketArtifact(userId, item.id);
  const ready = readyPacketArtifactAccess(item, protectedArtifact);
  if (ready) return { packetStatus: "ready", artifactRefs: ready, canDownload: true };
  const currentVerification = await requireCurrentPacketVerification(userId, item);
  const sponsorship = await requireCurrentPacketSponsorshipAuthority(userId, item);
  const partnerSponsored = sponsorship.sponsored;
  await assertPacketGenerationAllowed(userId, item, item.paymentProvider === "dry_run", {
    paymentRequired: !partnerSponsored,
    verification: currentVerification
  });
  return { packetStatus: "not_started", canDownload: false };
}

export function consumerPacketStatusForItem(
  item: ConsumerBriefcaseItem,
  protectedArtifact: ProtectedPacketArtifactRecord | null
): ConsumerPacketStatus {
  const readyArtifact = readyPacketArtifactAccess(item, protectedArtifact);
  if (readyArtifact) return { packetStatus: "ready", artifactRefs: readyArtifact, canDownload: true };
  return { packetStatus: "not_started", canDownload: false };
}

export async function getConsumerPacketDownload({
  userId,
  briefcaseItemId
}: {
  userId: string;
  briefcaseItemId: string;
}): Promise<ConsumerPacketDownload> {
  const item = await requireOwnedPacketItem(userId, briefcaseItemId);
  const protectedArtifact = await requireProtectedPacketArtifact(userId, item.id);
  const artifactRefs = readyPacketArtifactAccess(item, protectedArtifact);
  if (!artifactRefs || !("text" in artifactRefs)) {
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
  expectedVerificationHash,
  entitlementSource = "consumer_payment"
}: {
  userId: string;
  item: ConsumerBriefcaseItem;
  artifactRefs: ConsumerPacketArtifactRefs;
  expectedVerificationHash: string;
  entitlementSource?: "consumer_payment" | "partner_sponsorship";
}) {
  const attached = await attachConsumerPacketArtifactIfVerified({
    consumerAuthUserId: userId,
    briefcaseItemId: item.id,
    expectedVerificationHash,
    entitlementSource,
    artifact: artifactRefs
  });
  if (!attached.ok) throw new CurrentPacketVerificationRequiredError("verification_changed_before_artifact_attach");
  return attached.value;
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
  protectedArtifact: ProtectedPacketArtifactRecord | null
): ConsumerPacketArtifactRefs | undefined {
  void item;
  if (protectedArtifact?.status !== "ready" || !protectedArtifact.artifact) return undefined;
  if (protectedArtifact.entitlementSource === "legacy_backfill"
    && !validProtectedLegacyArtifactEvidence(protectedArtifact)) return undefined;
  return artifactRefsForValue(protectedArtifact.artifact);
}

export async function attachMississippiPacketInformationRequest({
  userId,
  briefcaseItemId
}: {
  userId: string;
  briefcaseItemId: string;
}): Promise<ConsumerPacketStatus> {
  const item = await requireOwnedPacketItem(userId, briefcaseItemId);
  const protectedArtifact = await requireProtectedPacketArtifact(userId, item.id);
  const protectedReady = readyPacketArtifactAccess(item, protectedArtifact);
  if (protectedReady) {
    return { packetStatus: "ready", artifactRefs: protectedReady, canDownload: "downloadPath" in protectedReady };
  }
  const { sponsorship } = await assertMississippiPartnerPacketReady(userId, item);

  const existing = artifactRefsFor(item);
  if (existing?.source === "mississippi_petition_information_required") {
    return { packetStatus: "pending", artifactRefs: existing, canDownload: false };
  }

  // Route the packet-information form to the item's actual sponsoring partner,
  // not a hardcoded slug. assertMississippiPartnerPacketReady already confirmed
  // this item is partner-sponsored, so a slug must resolve; fail closed rather
  // than send the user to the wrong partner's form.
  const partnerSlug = await partnerSlugForPacketItem({ ...item, sourceSessionId: sponsorship.sourceSessionId });
  if (!partnerSlug) {
    throw new ConsumerPacketGenerationError("A sponsoring partner slug is required to build the Mississippi packet information form.");
  }
  const artifactRefs = buildMississippiPacketInformationArtifact(item, partnerSlug);
  const updated = await updatePacketMetadata({ userId, itemId: item.id, webhookMode: false, metadata: {
    packetStatus: "pending",
    artifactRefs
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
  const protectedArtifact = await requireProtectedPacketArtifact(userId, item.id);
  const protectedReady = readyPacketArtifactAccess(item, protectedArtifact);
  if (protectedReady?.source === "mississippi_legacy_petition_packet" && protectedReady.packetId === rcapPacketId) {
    return { packetStatus: "ready", artifactRefs: protectedReady, canDownload: true };
  }
  const { verification, sponsorship } = await assertMississippiPartnerPacketReady(userId, item);

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
  const finalization = await finalizeSponsoredPacketGeneration({
    sessionId: sponsorship.sourceSessionId,
    briefcaseItemId: item.id,
    expectedVerificationHash: verification.hash,
    artifactRefs
  });
  if (!finalization.ok) {
    throw new ConsumerPacketGenerationError("Partner packet coverage could not be finalized for this matter.");
  }
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

export async function assertPacketGenerationAllowed(
  userId: string,
  item: ConsumerBriefcaseItem,
  dryRunMode = false,
  options: {
    paymentRequired?: boolean;
    verification?: Awaited<ReturnType<typeof requireCurrentPacketVerification>>;
  } = {}
) {
  const verification = options.verification ?? await requireCurrentPacketVerification(userId, item);
  // Packet generation. Ahead of the result code, because a ready result on a
  // route that produces a text summary is exactly the state this refuses.
  assertPacketFulfillmentProven(
    verification.snapshot.jurisdiction,
    verification.snapshot.pathwayId,
    "packet generation"
  );
  const resultCode = verification.snapshot.resultCode ?? "guidance_only";
  const paymentRequired = options.paymentRequired ?? true;
  const packetReadyResult = resultCode === "packet_ready" || resultCode === "packet_ready_with_caution";

  if (!packetReadyResult || (paymentRequired && !isConsumerPaymentAllowed(resultCode, verification.snapshot.paymentAllowed))) {
    throw new ConsumerPacketNotAllowedError(resultCode);
  }

  if (paymentRequired && !(dryRunMode && item.paymentProvider === "dry_run")) {
    const payment = await consumerPacketPaymentAuthority(item.id, userId);
    if (!payment.valid) throw new ConsumerPacketPaymentRequiredError();
  }
  return verification;
}

function buildConsumerPacketArtifact(
  item: ConsumerBriefcaseItem,
  verification: Awaited<ReturnType<typeof requireCurrentPacketVerification>>
): ConsumerPacketArtifactRefs {
  const generatedAt = new Date().toISOString();
  const profile = getProfileByJurisdiction(verification.snapshot.jurisdiction);
  const pathwayId = verification.snapshot.pathwayId;
  const plan = profile && pathwayId ? packetPlanForPathway(profile, pathwayId) : undefined;
  if (!profile || !pathwayId || !plan) {
    throw new ConsumerPacketGenerationError("A source-driven jurisdiction/pathway packet plan is required.");
  }
  /**
   * The purchased packet is dispatched through the governed provider, and there
   * is no fallback.
   *
   * This function used to end by returning a text/plain summary built from the
   * route's own metadata and the packet plan's readiness conditions. It took no
   * branch on jurisdiction, pathway, packet family or plan mode, so that was
   * the artifact for every paid packet in every state — fifty-four commercially
   * open routes, twenty-six of them with checkout open. A route summary, a rule
   * list and a generic checklist are not the packet a person paid for, and
   * relabelling them as one is the failure this refuses.
   *
   * `assertPacketFulfillmentProven` has already run at the generation surface,
   * so reaching this point means a fulfillment record exists and named an
   * approved provider. Dispatch on it. Until a family is implemented behind one
   * of those providers, the record cannot exist and generation never gets here.
   */
  const fulfillment = packetFulfillmentAuthority(verification.snapshot.jurisdiction, pathwayId);
  if (!fulfillment.allowed) {
    throw new ConsumerPacketGenerationError(
      `No proven packet fulfillment for ${verification.snapshot.jurisdiction}:${pathwayId} (missing ${fulfillment.missing.join(", ")}). A purchased packet is not a route summary.`
    );
  }
  throw new ConsumerPacketGenerationError(
    `${fulfillment.record.artifactProvider} is recorded as the approved provider for ${verification.snapshot.jurisdiction}:${pathwayId}, and no dispatch to it is implemented in this path yet. Failing closed rather than substituting a summary.`
  );
}

/**
 * Kept, unreferenced by the paid path, and deliberately not deleted.
 *
 * This is what a purchased packet used to be. A guidance route may still save
 * material like it — it is an honest description of a route — but it is not a
 * filing and it may not be sold, so nothing in the paid path calls it. Deleting
 * it would remove the record of what the defect actually looked like; leaving it
 * reachable from generation would let it come back.
 */
export function renderRouteSummaryForSavedGuidance(
  jurisdictionName: string,
  plan: NonNullable<ReturnType<typeof packetPlanForPathway>>,
  verification: Awaited<ReturnType<typeof requireCurrentPacketVerification>>
) {
  return renderSourceDrivenPacket(jurisdictionName, plan, verification);
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

async function assertMississippiPartnerPacketReady(userId: string, item: ConsumerBriefcaseItem) {
  const verification = await assertPacketGenerationAllowed(userId, item, false, { paymentRequired: false });
  if (verification.snapshot.jurisdiction !== "MS") {
    throw new ConsumerPacketNotAllowedError(verification.snapshot.resultCode ?? "guidance_only");
  }
  // Sponsored entitlement. A sponsored credit buys the same packet a payment
  // buys, so it answers to the same proof; being partner-funded is not a
  // reason to deliver something a paying participant would be refused.
  assertPacketFulfillmentProven(
    verification.snapshot.jurisdiction,
    verification.snapshot.pathwayId,
    "sponsored entitlement"
  );
  const sponsorship = await requireCurrentPacketSponsorshipAuthority(userId, item);
  if (!sponsorship.sponsored) {
    throw new ConsumerPacketPaymentRequiredError();
  }
  return { verification, sponsorship };
}

async function requireCurrentPacketSponsorshipAuthority(
  userId: string,
  item: ConsumerBriefcaseItem
): Promise<
  | { sponsored: false; sourceSessionId: null }
  | { sponsored: true; sourceSessionId: string }
> {
  const source = await readTrustedBriefcasePresentationSource({
    consumerAuthUserId: userId,
    item
  });
  if (!source.ok) throw new ConsumerPacketSponsorshipAuthorityUnavailableError(source.reason);
  if (source.value.product !== "rcap_partner") return { sponsored: false, sourceSessionId: null };
  if (!source.value.partnerBenefitActive || !source.value.partnerSlug || !source.value.sourceSessionId) {
    throw new ConsumerPacketSponsorshipAuthorityUnavailableError("protected_partner_source_missing");
  }
  return { sponsored: true, sourceSessionId: source.value.sourceSessionId };
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

function renderSourceDrivenPacket(
  jurisdictionName: string,
  plan: NonNullable<ReturnType<typeof packetPlanForPathway>>,
  verification: Awaited<ReturnType<typeof requireCurrentPacketVerification>>
) {
  const authoritativeSummary = `Authoritative screening result: ${verification.snapshot.resultCode ?? "packet_ready"} for ${jurisdictionName}.`;
  const authoritativeChecklist = plan.packetReadyWhen;
  return [
    `${jurisdictionName} Source-Driven Record-Clearing Packet`,
    "",
    authoritativeSummary,
    "",
    `Jurisdiction: ${verification.snapshot.jurisdiction}`,
    `Pathway: ${plan.pathwayId}`,
    `Packet mode: ${plan.mode}`,
    `Form mapping status: ${plan.formMappingStatus}`,
    `Result: ${verification.snapshot.resultCode}`,
    `Source forms: ${plan.sourceFormIds.length > 0 ? plan.sourceFormIds.join(", ") : "not required"}`,
    `Source rule refs: ${plan.sourceRuleRefs.join(", ")}`,
    "",
    "FILING CHECKLIST",
    ...authoritativeChecklist.map((step) => `- ${step}`),
    "",
    "NEXT STEPS",
    "- Review every generated document before filing.",
    "- Confirm court filing instructions and fees before submission.",
    "- Keep a copy of your receipt and filed documents.",
    "",
    `Protected verification: ${verification.hash}`
  ].join("\n");
}

function artifactRefsFor(item: ConsumerBriefcaseItem): ConsumerPacketArtifactRefs | undefined {
  return artifactRefsForValue(item.artifactRefs);
}

function artifactRefsForValue(refs: Record<string, unknown> | undefined | null): ConsumerPacketArtifactRefs | undefined {
  if (
    refs?.provider === "rcap_source_engine" &&
    typeof refs.packetId === "string" &&
    typeof refs.fileName === "string" &&
    refs.contentType === "text/plain" &&
    typeof refs.generatedAt === "string" &&
    refs.source === "source_driven_packet_plan" &&
    typeof refs.packetPlanId === "string" &&
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

async function requireProtectedPacketArtifact(userId: string, briefcaseItemId: string) {
  const result = await readProtectedPacketArtifact({
    consumerAuthUserId: userId,
    briefcaseItemId
  });
  if (!result.ok) throw new ConsumerPacketArtifactAuthorityUnavailableError(result.reason);
  return result.value;
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

export class ConsumerPacketArtifactAuthorityUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`Protected packet artifact authority is unavailable: ${reason}`);
    this.name = "ConsumerPacketArtifactAuthorityUnavailableError";
  }
}

export class ConsumerPacketSponsorshipAuthorityUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`Protected packet sponsorship authority is unavailable: ${reason}`);
    this.name = "ConsumerPacketSponsorshipAuthorityUnavailableError";
  }
}
