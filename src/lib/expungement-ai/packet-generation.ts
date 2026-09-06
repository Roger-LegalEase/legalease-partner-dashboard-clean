import "server-only";

import { createHash } from "node:crypto";
import { requestConsumerPacketRender, requestConsumerPacketRenderForWebhook } from "@/lib/expungement-ai/consumer-render-request";
import { enqueueVerifiedSponsoredRender, getRenderJob, hasFinalizedPersonalizedRender } from "@/lib/rcap/render/job-queue";
import { PERSONALIZED_DELIVERY_ROUTE, preparePersonalizedPacket } from "@/lib/rcap/render/personalized-packet";
import { finalizeSponsoredRenderArtifact, sponsoredRenderDeliveryReady } from "@/lib/rcap/render/sponsored-packet";
import { resolveConsumerDeliveryAccess } from "@/lib/rcap/render/consumer-delivery-control";

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
import {
  assertPacketFulfillmentProven,
  packetFulfillmentAuthority,
  type PacketFulfillmentRecord
} from "@/lib/expungement-ai/packet-fulfillment-authority";
import { composeGradeAPacket } from "@/lib/rcap/grade-a/composer";
import { composablePacketSpecificationFor, packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import { gradeAPacketFilename, renderGradeAPacketPdf } from "@/lib/rcap/grade-a/renderer";
import { assertValidArtifact } from "@/lib/rcap/render/artifact-validation";
import { admitCommercial } from "@/lib/rcap/fulfillment/grade-a-admission";
import {
  artifactStorageContext,
  commercialRouteIdentity,
  entitlementContext,
  finalVerificationSnapshotFrom,
  fulfillmentRequestContext,
  governCommercialAdmission,
  governPacketDownloadAdmission
} from "@/lib/rcap/render/commercial-admission";
import { consumerMatterIdForItem, resolveConsumerPersonId } from "@/lib/expungement-ai/consumer-identity";
import type { EntitlementContext } from "@/lib/rcap/fulfillment/grade-a-request-context";
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
  provider: "rcap_durable_render_v1";
  source: "verified_render_job";
  packetId: string;
  renderJobId: string;
  artifactSha256: string;
  pageCount: number;
  fileName: string;
  contentType: "application/pdf";
  generatedAt: string;
  downloadPath: string;
} | {
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
} | {
  /**
   * The Grade-A artifact.
   *
   * It carries the specification's identity and hash rather than the packet
   * bytes. The document set is a deterministic function of the specification
   * and the verified matter, so the download path recomposes it — which is what
   * makes repeat download work without a blob store, and what makes a changed
   * specification visible as a changed hash rather than as a silently different
   * packet under the same receipt.
   */
  provider: "rcap_grade_a_composer_v1";
  packetId: string;
  fileName: string;
  contentType: "application/pdf";
  generatedAt: string;
  source: "grade_a_packet_specification";
  packetSpecificationId: string;
  packetSpecificationVersion: string;
  packetSpecificationSha256: string;
  packetFamily: string;
  documentCount: number;
  verificationHash: string;
  downloadPath: string;
  /**
   * The SHA-256 of the rendered bytes, computed at attachment.
   *
   * This is what binds delivery to an artifact rather than to a filename. It is
   * meaningful only because the Grade-A renderer is deterministic, so a repeat
   * download re-renders and compares rather than trusting storage.
   */
  artifactSha256: string;
  /** Pages in the rendered artifact, checked again before every delivery. */
  pageCount: number;
};

export type ConsumerPacketStatus = {
  packetStatus: NonNullable<ConsumerBriefcaseItem["packetStatus"]>;
  artifactRefs?: ConsumerPacketArtifactRefs;
  canDownload: boolean;
  renderJobId?: string;
  protectedSponsorship?: {
    sourceSessionId: string;
    expectedVerificationHash: string;
    entitlement: EntitlementContext;
  };
};

export type ConsumerPacketDownload = {
  fileName: string;
  contentType: string;
  /**
   * A string for the legacy text path; bytes for a rendered PDF. The download
   * route hands either to NextResponse unchanged, so widening this does not
   * widen what may be delivered — `packetFulfillmentAuthority` already refuses
   * every content type but application/pdf for a purchased packet.
   */
  body: string | Uint8Array;
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
    return existing.provider === "rcap_durable_render_v1"
      ? getConsumerPacketStatus({ userId, briefcaseItemId })
      : { packetStatus: "ready", artifactRefs: existing, canDownload: true };
  }
  const currentVerification = await requireCurrentPacketVerification(userId, item);
  const sponsorship = await requireCurrentPacketSponsorshipAuthority(userId, item);
  const partnerSponsored = sponsorship.sponsored;
  const verification = await assertPacketGenerationAllowed(userId, item, dryRunMode, {
    paymentRequired: !partnerSponsored,
    verification: currentVerification,
    entitlement: sponsorship.sponsored ? sponsorship.entitlement : undefined
  });

  if (`${verification.snapshot.jurisdiction}:${verification.snapshot.pathwayId}` === PERSONALIZED_DELIVERY_ROUTE) {
    if (!resolveConsumerDeliveryAccess({ subjectId: userId }).allowed) {
      throw new ConsumerPacketGenerationError("Consumer delivery is disabled.");
    }
    if (partnerSponsored) {
      const person = await resolveConsumerPersonId(userId);
      if (!person.ok) throw new ConsumerPacketGenerationError("Participant identity is unavailable.");
      const prepared = preparePersonalizedPacket({ authUserId: userId, briefcaseItemId: item.id,
        personId: person.personId, matterId: sponsorship.matterId,
        verificationHash: verification.hash, snapshot: verification.snapshot });
      const identity = commercialRouteIdentity({ jurisdiction: verification.snapshot.jurisdiction,
        pathwayId: verification.snapshot.pathwayId });
      governCommercialAdmission("provider_dispatch", identity, fulfillmentRequestContext({
        participantUserId: userId, matterId: sponsorship.matterId, matterOwnerUserId: userId,
        finalVerification: finalVerificationSnapshotFrom({ snapshot: verification.snapshot,
          verificationHash: verification.hash, matterId: sponsorship.matterId,
          ownerUserId: userId, packetFamilyId: identity.packetFamilyId }),
        entitlement: sponsorship.entitlement
      }));
      const job = await enqueueVerifiedSponsoredRender(prepared.spec, { authUserId: userId,
        briefcaseItemId: item.id, sourceSessionId: sponsorship.sourceSessionId, partnerSlug: sponsorship.partnerSlug,
        personId: person.personId, matterId: sponsorship.matterId, verificationHash: verification.hash }, prepared.payload);
      if (!job) throw new ConsumerPacketGenerationError("Verified sponsored render queue refused the request.");
      // Recover a publication interrupted after technical artifact finalization.
      // The same protected finalizer is idempotent and consumes no second unit.
      if (["artifact_validated", "delivered"].includes(job.status)
        && await finalizeSponsoredRenderArtifact(job.id)) return getConsumerPacketStatus({ userId, briefcaseItemId });
      return { packetStatus: job.status === "failed" ? "failed" : "generating", canDownload: false, renderJobId: job.id };
    }
    const result = await (webhookMode ? requestConsumerPacketRenderForWebhook : requestConsumerPacketRender)({
      authUserId: userId, briefcaseItemId: item.id
    });
    if (result.status !== "queued") throw new ConsumerPacketGenerationError(`Render queue refused: ${result.status}`);
    const job = await getRenderJob(result.jobId);
    return { packetStatus: job?.status === "failed" ? "failed" : "generating", canDownload: false, renderJobId: result.jobId };
  }

  if (!(await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
    packetStatus: "pending"
  } }))) throw new CurrentPacketVerificationRequiredError("verification_changed_before_generation");
  if (!(await updatePacketMetadata({ userId, itemId: item.id, webhookMode, metadata: {
    packetStatus: "generating"
  } }))) throw new CurrentPacketVerificationRequiredError("verification_changed_before_generation");

  try {
    const artifactRefs = await buildConsumerPacketArtifact(item, verification);
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
          expectedVerificationHash: verification.hash,
          entitlement: sponsorship.entitlement
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
  if (ready) {
    if (ready.provider === "rcap_durable_render_v1") {
      const job = await getRenderJob(ready.renderJobId);
      if (!job || (job.partnerId && !await sponsoredRenderDeliveryReady(job, userId))) {
        return { packetStatus: "pending", canDownload: false };
      }
    }
    /**
     * Grade-A commercial admission, point 7 of 10 — `briefcase_ready`.
     *
     * This is the statement that tells a participant to expect a download, so
     * it is the transition the authority governs. A route the authority will
     * not admit presents as saved-and-pending instead — the information is
     * still theirs and still safe, they are simply not told a packet is
     * waiting when the download surface would refuse them.
     *
     * Deliberately not a throw. Every other point refuses an action the
     * participant asked for; this one only decides what they are shown, and
     * turning a status read into an error would break a Briefcase page over a
     * route that is merely unproven.
     */
    const readyVerification = await requireCurrentPacketVerification(userId, item);
    const readyMatterId = consumerMatterIdForItem(item.id);
    const readyIdentity = commercialRouteIdentity({
      jurisdiction: readyVerification.snapshot.jurisdiction,
      pathwayId: readyVerification.snapshot.pathwayId
    });
    const readyDecision = admitCommercial("briefcase_ready", readyIdentity, fulfillmentRequestContext({
      participantUserId: userId,
      matterId: readyMatterId,
      matterOwnerUserId: userId,
      finalVerification: finalVerificationSnapshotFrom({
        snapshot: readyVerification.snapshot,
        verificationHash: readyVerification.hash,
        matterId: readyMatterId,
        ownerUserId: userId,
        packetFamilyId: readyIdentity.packetFamilyId
      }),
      storage: artifactStorageContext({
        privateStorage: true,
        artifactSha256: artifactSha256Of(ready),
        repeatDownload: item.packetStatus === "downloaded"
      })
    }));
    if (!readyDecision.admitted) return { packetStatus: "pending", canDownload: false };
    return { packetStatus: "ready", artifactRefs: ready, canDownload: true };
  }
  const currentVerification = await requireCurrentPacketVerification(userId, item);
  const sponsorship = await requireCurrentPacketSponsorshipAuthority(userId, item);
  const partnerSponsored = sponsorship.sponsored;
  await assertPacketGenerationAllowed(userId, item, item.paymentProvider === "dry_run", {
    paymentRequired: !partnerSponsored,
    verification: currentVerification,
    entitlement: sponsorship.sponsored ? sponsorship.entitlement : undefined
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
  if (!artifactRefs) throw new ConsumerPacketNotReadyError();

  if (artifactRefs.provider === "rcap_grade_a_composer_v1") {
    return gradeAPacketDownload(userId, item, artifactRefs);
  }

  if (!("text" in artifactRefs)) throw new ConsumerPacketNotReadyError();
  return {
    fileName: artifactRefs.fileName,
    contentType: artifactRefs.contentType,
    body: artifactRefs.text
  };
}

/**
 * Recomposes and renders the Grade-A packet for its owner.
 *
 * Repeat download works because composition is deterministic: the same
 * specification and the same verified facts produce the same document set every
 * time. Nothing is stored, so nothing can drift out of sync with what the
 * fulfillment record vouches for.
 *
 * The verification hash is compared before anything is rendered. A participant
 * who changed an answer after generating has a superseded packet, and handing
 * them the old one — built on a fact they have since corrected — is worse than
 * telling them to generate again.
 */
async function gradeAPacketDownload(
  userId: string,
  item: ConsumerBriefcaseItem,
  artifactRefs: Extract<ConsumerPacketArtifactRefs, { provider: "rcap_grade_a_composer_v1" }>
): Promise<ConsumerPacketDownload> {
  const verification = await requireCurrentPacketVerification(userId, item);
  if (verification.hash !== artifactRefs.verificationHash) {
    throw new ConsumerPacketNotReadyError();
  }

  // Delivery is a commercial surface. It consults the one authority like every
  // other one, so a record withdrawn after an artifact was attached closes the
  // download too. The route identity comes from the server-held verification
  // snapshot and never from the Briefcase item, which a client can influence.
  assertPacketFulfillmentProven(
    verification.snapshot.jurisdiction,
    verification.snapshot.pathwayId,
    "participant delivery",
    { trackId: verification.snapshot.selectedTrackId }
  );

  /**
   * Grade-A commercial admission, points 8 and 9 of 10 — `private_download`
   * and `repeat_download`.
   *
   * One statement, and exactly one of the two points, chosen by whether this
   * participant has downloaded this artifact before. They are separate points
   * because they are separate questions: the first asks whether bytes may leave
   * the building at all, and the second asks whether they may leave again for
   * someone who already has them — which must be true, and must cost neither a
   * second payment nor a second credit.
   *
   * Before the bytes are rendered, not after: a download that is going to be
   * refused should never have composed the packet.
   */
  // Delegated to the one shared treatment, which the RCAP job-id download also
  // calls. Two endpoints serve packet bytes; a second admitCommercial call here
  // would be a second commercial rule the moment either was edited.
  const downloadMatterId = consumerMatterIdForItem(item.id);
  governPacketDownloadAdmission({
    jurisdiction: verification.snapshot.jurisdiction,
    pathwayId: verification.snapshot.pathwayId,
    participantUserId: userId,
    matterId: downloadMatterId,
    matterOwnerUserId: userId,
    verificationSnapshot: verification.snapshot,
    verificationHash: verification.hash,
    artifactSha256: artifactSha256Of(artifactRefs),
    repeatDownload: item.packetStatus === "downloaded"
  });

  // Composable, not merely registered. A specification whose legal sections are
  // still undecided resolves for identity and never composes: it would hand a
  // participant a packet with a filing destination, a fee rule and a service
  // rule that no legal-design owner has decided.
  const specification = composablePacketSpecificationFor(`${verification.snapshot.jurisdiction}:${verification.snapshot.pathwayId ?? ""}`);
  if (!specification || specification.specificationVersion !== artifactRefs.packetSpecificationVersion) {
    throw new ConsumerPacketNotReadyError();
  }

  const facts: Record<string, string> = {};
  for (const source of [
    verification.snapshot.screeningAnswers,
    verification.snapshot.prefilledAnswers,
    verification.snapshot.serverFacts,
    verification.snapshot.packetAnswers
  ]) {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (typeof value === "string" && value.trim()) facts[key] = value;
      else if (typeof value === "number") facts[key] = String(value);
    }
  }

  const packet = composeGradeAPacket(specification, {
    routeKey: specification.routeKey,
    jurisdiction: verification.snapshot.jurisdiction,
    pathwayId: String(verification.snapshot.pathwayId ?? ""),
    facts,
    verificationHash: verification.hash,
    verifiedAt: verification.snapshot.verifiedAt
  });

  /**
   * Re-render and check the bytes against the digest recorded at attachment.
   *
   * This is what makes a substituted object undeliverable. Composition is
   * deterministic, so the correct packet always reproduces its own hash; bytes
   * that do not are not this packet, whatever storage returned them.
   */
  const bytes = await renderGradeAPacketPdf(packet);
  assertValidArtifact({
    bytes,
    expectedContentType: "application/pdf",
    expectedSha256: artifactRefs.artifactSha256 ?? null,
    expectedPageCount: artifactRefs.pageCount ?? null
  });

  return {
    fileName: artifactRefs.fileName,
    contentType: "application/pdf",
    body: Buffer.from(bytes)
  };
}

/**
 * The recorded artifact digest, where the provider records one.
 *
 * Legacy providers do not, and returning null for them is the truthful answer:
 * the authority refuses a storage context with no digest, which is the correct
 * outcome for an artifact nothing can bind delivery to.
 */
function artifactSha256Of(artifactRefs: ConsumerPacketArtifactRefs): string | null {
  return "artifactSha256" in artifactRefs && typeof artifactRefs.artifactSha256 === "string"
    ? artifactRefs.artifactSha256
    : null;
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
  /**
   * Grade-A commercial admission, point 6 of 10 — `artifact_commercial_attachment`.
   *
   * Before the artifact is marked deliverable, because attachment is what makes
   * the Briefcase say a packet exists. An unproven route may still produce an
   * internal-preview artifact; it may not produce a commercially deliverable
   * one, and this is the line between those two.
   */
  const attachVerification = await requireCurrentPacketVerification(userId, item);
  const attachMatterId = consumerMatterIdForItem(item.id);
  const attachIdentity = commercialRouteIdentity({
    jurisdiction: attachVerification.snapshot.jurisdiction,
    pathwayId: attachVerification.snapshot.pathwayId
  });
  governCommercialAdmission("artifact_commercial_attachment", attachIdentity, fulfillmentRequestContext({
    participantUserId: userId,
    matterId: attachMatterId,
    matterOwnerUserId: userId,
    finalVerification: finalVerificationSnapshotFrom({
      snapshot: attachVerification.snapshot,
      verificationHash: attachVerification.hash,
      matterId: attachMatterId,
      ownerUserId: userId,
      packetFamilyId: attachIdentity.packetFamilyId
    }),
    storage: artifactStorageContext({
      privateStorage: true,
      artifactSha256: artifactSha256Of(artifactRefs),
      // Attachment is by definition the first time this artifact exists, so
      // this is never a repeat. `repeat_download` is a different point.
      repeatDownload: false
    })
  }));

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
  const { verification, sponsorship, admission } = await assertMississippiPartnerPacketReady(userId, item);

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
    artifactRefs,
    admission
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
    /**
     * The sponsored credit backing this generation. Supplied by the sponsored
     * path, which has an entitlement the consumer payment probe cannot see.
     */
    entitlement?: EntitlementContext;
  } = {}
) {
  const verification = options.verification ?? await requireCurrentPacketVerification(userId, item);
  // Packet generation. Ahead of the result code, because a ready result on a
  // route that produces a text summary is exactly the state this refuses.
  assertPacketFulfillmentProven(
    verification.snapshot.jurisdiction,
    verification.snapshot.pathwayId,
    "packet generation",
    { trackId: verification.snapshot.selectedTrackId }
  );
  const resultCode = verification.snapshot.resultCode ?? "guidance_only";
  const paymentRequired = options.paymentRequired ?? true;
  const packetReadyResult = resultCode === "packet_ready" || resultCode === "packet_ready_with_caution";

  if (!packetReadyResult || (paymentRequired && !isConsumerPaymentAllowed(resultCode, verification.snapshot.paymentAllowed))) {
    throw new ConsumerPacketNotAllowedError(resultCode);
  }

  let entitlement = options.entitlement ?? null;
  if (!paymentRequired && (
    entitlement?.kind !== "sponsored_credit"
    || entitlement.serverVerified !== true
    || !entitlement.idempotencyKey
  )) {
    throw new ConsumerPacketSponsorshipAuthorityUnavailableError("protected_sponsored_entitlement_missing");
  }
  if (paymentRequired && !(dryRunMode && item.paymentProvider === "dry_run")) {
    const payment = await consumerPacketPaymentAuthority(item.id, userId);
    if (!payment.valid) throw new ConsumerPacketPaymentRequiredError();
    // The provider event id is the single-use receipt. Using it as the
    // idempotency key is what makes a replayed webhook and a double-clicked
    // generate resolve to the same entitlement rather than two.
    entitlement ??= entitlementContext({
      kind: "consumer_payment",
      idempotencyKey: payment.providerEventId,
      alreadyConsumed: packetAlreadyGenerated(item),
      serverVerified: true
    });
  }

  /**
   * Grade-A commercial admission, point 4 of 10 — `generation_admission`.
   *
   * Here rather than at the four call sites, so all of them inherit one gate.
   * It runs after the entitlement is established and before the caller can
   * enqueue a render, which is the first act that queues work against a matter.
   *
   * A dry run still passes through: it carries a dry-run entitlement rather
   * than none, because "no entitlement" and "an entitlement that cost nothing"
   * are different facts and only the second one may generate.
   */
  const generationMatterId = consumerMatterIdForItem(item.id);
  const generationIdentity = commercialRouteIdentity({
    jurisdiction: verification.snapshot.jurisdiction,
    pathwayId: verification.snapshot.pathwayId
  });
  const regeneration = generationIdentity.routeId === PERSONALIZED_DELIVERY_ROUTE
    && await hasFinalizedPersonalizedRender(userId, item.id, !paymentRequired);
  governCommercialAdmission(regeneration ? "provider_dispatch" : "generation_admission", generationIdentity, fulfillmentRequestContext({
    participantUserId: userId,
    matterId: generationMatterId,
    matterOwnerUserId: userId,
    finalVerification: finalVerificationSnapshotFrom({
      snapshot: verification.snapshot,
      verificationHash: verification.hash,
      matterId: generationMatterId,
      ownerUserId: userId,
      packetFamilyId: generationIdentity.packetFamilyId
    }),
    entitlement: entitlement ?? entitlementContext({
      kind: "consumer_payment",
      idempotencyKey: dryRunMode && item.paymentProvider === "dry_run" ? `dry-run:${item.id}` : null,
      alreadyConsumed: packetAlreadyGenerated(item),
      serverVerified: dryRunMode && item.paymentProvider === "dry_run"
    })
  }));

  return verification;
}

/**
 * Whether this matter's entitlement has already produced a packet.
 *
 * Read from the packet status rather than counted, because the question the
 * authority asks is "has this been consumed", and a downloaded packet is a
 * consumed entitlement exactly as a ready one is.
 */
function packetAlreadyGenerated(item: ConsumerBriefcaseItem): boolean {
  return item.packetStatus === "ready" || item.packetStatus === "downloaded";
}

async function buildConsumerPacketArtifact(
  item: ConsumerBriefcaseItem,
  verification: Awaited<ReturnType<typeof requireCurrentPacketVerification>>
): Promise<ConsumerPacketArtifactRefs> {
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
  const fulfillment = packetFulfillmentAuthority(verification.snapshot.jurisdiction, pathwayId, undefined, { trackId: verification.snapshot.selectedTrackId });
  if (!fulfillment.allowed) {
    throw new ConsumerPacketGenerationError(
      `No proven packet fulfillment for ${verification.snapshot.jurisdiction}:${pathwayId} (missing ${fulfillment.missing.join(", ")}). A purchased packet is not a route summary.`
    );
  }
  if (fulfillment.record.artifactProvider === "rcap_grade_a_composer_v1") {
    return await buildGradeAArtifact(item, verification, fulfillment.record, generatedAt);
  }
  throw new ConsumerPacketGenerationError(
    `${fulfillment.record.artifactProvider} is recorded as the approved provider for ${verification.snapshot.jurisdiction}:${pathwayId}, and no dispatch to it is implemented in this path yet. Failing closed rather than substituting a summary.`
  );
}

/**
 * Composes the Grade-A packet and returns its identity.
 *
 * Composition happens HERE, at generation, and not at download. The composer is
 * the thing that refuses a matter with a missing fact, and a refusal has to
 * happen while the participant is still in a flow that can ask them for it —
 * not when they click download and get an error instead of a filing.
 */
async function buildGradeAArtifact(
  item: ConsumerBriefcaseItem,
  verification: Awaited<ReturnType<typeof requireCurrentPacketVerification>>,
  record: PacketFulfillmentRecord,
  generatedAt: string
): Promise<ConsumerPacketArtifactRefs> {
  const snapshot = verification.snapshot;
  const registered = packetSpecificationFor(record.routeKey);
  if (!registered) {
    throw new ConsumerPacketGenerationError(
      `${record.routeKey} has a fulfillment record naming specification ${record.packetSpecificationId}, and no such specification is registered. Failing closed.`
    );
  }
  // Registered and composable are different questions, and the second one is
  // the one that decides whether a document may be produced.
  const specification = composablePacketSpecificationFor(record.routeKey);
  if (!specification) {
    throw new ConsumerPacketGenerationError(
      `${record.routeKey}: specification ${record.packetSpecificationId} is registered but its legal sections are not bound `
      + `(${(registered as { unboundLegalSections?: string[] }).unboundLegalSections?.join(", ") ?? "unspecified"}). `
      + "A packet is never composed from a specification whose legal statements nobody has decided."
    );
  }
  if (specification.specificationVersion !== record.packetSpecificationVersion) {
    throw new ConsumerPacketGenerationError(
      `${record.routeKey}: the fulfillment record vouches for specification v${record.packetSpecificationVersion} and the registered specification is v${specification.specificationVersion}. `
      + "A record may only authorize the exact document set it was written against."
    );
  }

  // Later sources win: a fact confirmed at packet information supersedes the
  // approximate answer the same person gave during anonymous screening.
  const facts: Record<string, string> = {};
  for (const source of [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.serverFacts, snapshot.packetAnswers]) {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (typeof value === "string" && value.trim()) facts[key] = value;
      else if (typeof value === "number") facts[key] = String(value);
    }
  }

  const packet = composeGradeAPacket(specification, {
    routeKey: record.routeKey,
    jurisdiction: snapshot.jurisdiction,
    pathwayId: String(snapshot.pathwayId ?? ""),
    facts,
    verificationHash: verification.hash,
    verifiedAt: snapshot.verifiedAt
  });

  /**
   * Render now, and validate the bytes before any of this becomes an artifact
   * anyone can be told about. Composition already refuses a matter with a
   * missing fact; this refuses a render that produced something that is not a
   * multi-page PDF, which is the failure composition cannot see.
   */
  const bytes = await renderGradeAPacketPdf(packet);
  const validation = assertValidArtifact({ bytes, expectedContentType: "application/pdf" });

  return {
    provider: "rcap_grade_a_composer_v1",
    packetId: item.id,
    fileName: gradeAPacketFilename(packet),
    contentType: "application/pdf",
    generatedAt,
    source: "grade_a_packet_specification",
    packetSpecificationId: packet.specificationId,
    packetSpecificationVersion: packet.specificationVersion,
    packetSpecificationSha256: record.packetSpecificationSha256,
    packetFamily: packet.packetFamily,
    documentCount: packet.documents.length,
    verificationHash: packet.verificationHash,
    downloadPath: `/api/expungement-ai/packet/${item.id}/download`,
    artifactSha256: validation.sha256,
    pageCount: validation.pageCount
  };
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
  const sponsorship = await requireCurrentPacketSponsorshipAuthority(userId, item);
  if (!sponsorship.sponsored) {
    throw new ConsumerPacketPaymentRequiredError();
  }
  const verification = await assertPacketGenerationAllowed(userId, item, false, {
    paymentRequired: false,
    entitlement: sponsorship.entitlement
  });
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
  const matterId = consumerMatterIdForItem(item.id);
  const identity = commercialRouteIdentity({
    jurisdiction: verification.snapshot.jurisdiction,
    pathwayId: verification.snapshot.pathwayId
  });
  return {
    verification,
    sponsorship,
    admission: {
      identity,
      context: fulfillmentRequestContext({
        participantUserId: userId,
        matterId,
        matterOwnerUserId: userId,
        finalVerification: finalVerificationSnapshotFrom({
          snapshot: verification.snapshot,
          verificationHash: verification.hash,
          matterId,
          ownerUserId: userId,
          packetFamilyId: identity.packetFamilyId
        }),
        entitlement: sponsorship.entitlement
      })
    }
  };
}

async function requireCurrentPacketSponsorshipAuthority(
  userId: string,
  item: ConsumerBriefcaseItem
): Promise<
  | { sponsored: false; sourceSessionId: null }
  | {
    sponsored: true;
    sourceSessionId: string;
    partnerSlug: string;
    matterId: string;
    entitlement: EntitlementContext;
  }
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
  const matterId = consumerMatterIdForItem(item.id);
  if (source.value.matterId !== matterId) {
    throw new ConsumerPacketSponsorshipAuthorityUnavailableError("protected_partner_matter_mismatch");
  }
  const idempotencyKey = createHash("sha256")
    .update(`rcap-sponsored-credit/v1\0${source.value.sourceSessionId}\0${item.id}\0${matterId}`)
    .digest("hex");
  return {
    sponsored: true,
    sourceSessionId: source.value.sourceSessionId,
    partnerSlug: source.value.partnerSlug,
    matterId,
    entitlement: entitlementContext({
      kind: "sponsored_credit",
      idempotencyKey,
      alreadyConsumed: packetAlreadyGenerated(item),
      serverVerified: true
    })
  };
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
  // DEL-B stores the registered composition descriptor. A protected descriptor
  // naming a render job is presented through that job's existing download path.
  if (refs?.provider === "rcap_grade_a_composer_v1" && refs.source === "grade_a_packet_specification"
    && typeof refs.renderJobId === "string" && typeof refs.renderPacketId === "string") {
    refs = { ...refs, provider: "rcap_durable_render_v1", source: "verified_render_job", packetId: refs.renderPacketId };
  }
  if (refs?.provider === "rcap_durable_render_v1" && refs.source === "verified_render_job"
    && typeof refs.packetId === "string" && typeof refs.renderJobId === "string"
    && typeof refs.artifactSha256 === "string" && /^[a-f0-9]{64}$/.test(refs.artifactSha256)
    && refs.contentType === "application/pdf" && typeof refs.fileName === "string"
    && typeof refs.generatedAt === "string" && typeof refs.downloadPath === "string"
    && typeof refs.pageCount === "number" && refs.pageCount > 0) {
    return refs as ConsumerPacketArtifactRefs;
  }
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
