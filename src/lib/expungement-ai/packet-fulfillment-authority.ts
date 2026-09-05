import "server-only";

import fulfillmentRecords from "@/../data/rcap-ledger/packet-fulfillment-records.json";
import { fulfillmentAuthorityFor } from "@/lib/rcap/fulfillment/grade-a-admission";
import { getCurrentFulfillmentRecord } from "@/lib/rcap/fulfillment/grade-a-registry";
import { consumerSpecificationBinding } from "@/lib/rcap/fulfillment/consumer-specification-binding";

/**
 * The one server-authoritative answer to "may this route take money".
 *
 * Six surfaces used to answer that question independently — checkout creation,
 * consumer payment authority, sponsored entitlement, packet generation,
 * packet-credit consumption and participant delivery — and each of them read a
 * different proxy for the same fact. A route could satisfy every one of them
 * and still hand a participant a text file.
 *
 * That is what happened. `buildConsumerPacketArtifact` took no branch on
 * jurisdiction, pathway, packet family or plan mode: it returned
 * `contentType: "text/plain"` with the route's own metadata and the packet
 * plan's readiness conditions under a heading that read FILING CHECKLIST.
 * Fifty-four routes could take money or a sponsored credit and every one of
 * them would have delivered that. Twenty-six had checkout open.
 *
 * None of the proxies could have caught it, and this gate refuses each of them
 * by name:
 *
 *   - an evaluator result code says the participant is eligible, not that a
 *     packet exists;
 *   - a packet plan says which facts a packet would need, not that anything
 *     renders one;
 *   - a packet family name is a legal statement about what a route produces,
 *     not evidence that it was built;
 *   - legacy-jurisdiction status classifies a STATE, and says nothing about
 *     one route inside it;
 *   - `paymentAllowed` copied from a profile is a stored opinion, and the
 *     thing that must be true is a present fact about an artifact.
 *
 * ADR-0004 added the sixth: an owner decision that the five legacy generators
 * are not approved commercial fulfillment paths at all. So commercial authority
 * is granted only by an exact Grade-A fulfillment record, and the absence of a
 * record is a refusal rather than a gap.
 *
 * TWO QUESTIONS, NOT ONE
 *
 * "Is this packet proven" and "may this surface sell it" are different
 * questions, and collapsing them is how a build gets pressured into opening
 * payment to make a proof pass. A record proves the packet exists, is complete
 * against its own hashed specification, and renders to a real PDF. Whether a
 * participant may be charged for it is a separate posture on the same record,
 * and a held posture is a decision with a named reason rather than an absence.
 *
 * So the money surfaces require the record AND an open posture AND an approved
 * artifact status. Generation and delivery require only the record — they are
 * reachable only through an entitlement the money surfaces already gated, and
 * re-gating them on posture would block the internal proof without protecting
 * anyone.
 */

export type PacketFulfillmentSurface =
  | "checkout creation"
  | "consumer payment authority"
  | "sponsored entitlement"
  | "packet generation"
  | "packet credit consumption"
  | "participant delivery";

/** The surfaces where money or an entitlement changes hands. */
const MONEY_SURFACES: ReadonlySet<PacketFulfillmentSurface> = new Set([
  "checkout creation",
  "consumer payment authority",
  "sponsored entitlement",
  "packet credit consumption"
]);

export type PacketFulfillmentSourceIdentity = {
  sourceId: string;
  kind: string;
  /**
   * Whether the identity was checked against bytes present here, or is carried
   * from an ingestion record made elsewhere. The distinction has to survive
   * into the record: an asserted hash read as a live verification is a claim
   * nobody actually made.
   */
  verification: "present_in_repository" | "asserted_by_ingestion";
  location?: string;
  note?: string;
  ownerLegalDecisionRecordId?: string;
};

export type PacketFulfillmentRecord = {
  routeKey: string;
  jurisdiction: string;
  pathwayId: string;

  packetFamily: string;
  packetFamilyLabel: string;

  packetSpecificationId: string;
  packetSpecificationVersion: string;
  packetSpecificationPath: string;
  packetSpecificationSha256: string;
  /** Canonical authority pins the whole source file, including its metadata. */
  packetSpecificationFileSha256?: string;

  packetComponents: string[];
  sourceIdentities: PacketFulfillmentSourceIdentity[];

  artifactProvider: string;
  artifactProviderVersion: string;
  renderer: string;
  rendererVersion: string;
  contentType: string;

  requiredFacts: string[];
  finalVerificationRequirements: string[];
  verificationBinding: string;

  privateDelivery: boolean;
  repeatDownload: boolean;

  artifactApprovalStatus: string;
  consumerPosture: "open" | "held";
  sponsoredPosture: "open" | "held";
  holdReason: string;

  provenBy: string;
  provenOn: string;
  proofSummary?: string;
};

export type PacketFulfillmentDecision =
  | { allowed: true; record: PacketFulfillmentRecord }
  | { allowed: false; reason: string; missing: string[]; record?: PacketFulfillmentRecord };

/**
 * Providers that may deliver a purchased packet.
 *
 * `rcap_grade_a_composer_v1` is the forward architecture. The two legacy names
 * are deliberately absent: ADR-0004 retired them as commercial fulfillment
 * paths, and leaving them here would mean a legacy record could still be
 * written. A text summary was never on this list and must never be.
 */
const APPROVED_ARTIFACT_PROVIDERS = new Set(["rcap_grade_a_composer_v1"]);

/**
 * Content types a filing packet may be delivered as.
 *
 * `text/plain` is deliberately absent and must stay absent. Adding it would
 * make the defect this gate exists for indistinguishable from a fixed route.
 */
const APPROVED_CONTENT_TYPES = new Set(["application/pdf"]);

/**
 * Artifact-approval states that may carry a sale.
 *
 * A packet that machine-verification proves complete is not yet a packet
 * counsel has read. Only the reviewed states appear here, so a record can be
 * written the moment the packet is built — which is when the evidence is
 * freshest — without that act opening a sale.
 */
const SELLABLE_ARTIFACT_APPROVAL = new Set([
  "counsel_reviewed",
  "counsel_reviewed_and_visually_verified"
]);

/** Every component a purchased filing packet must carry. */
export const REQUIRED_PACKET_COMPONENTS = [
  "primary filing or application",
  "proposed order where required",
  "attachments or schedules",
  "filing destination",
  "fee or waiver instructions",
  "service or notice",
  "post-filing steps"
] as const;

const RECORDS: ReadonlyMap<string, PacketFulfillmentRecord> = new Map(
  ((fulfillmentRecords as { records?: PacketFulfillmentRecord[] }).records ?? [])
    .map((record) => [record.routeKey, record])
);

export function packetFulfillmentRouteKey(jurisdiction: string | null | undefined, pathwayId: string | null | undefined) {
  return `${String(jurisdiction ?? "").trim().toUpperCase()}:${String(pathwayId ?? "").trim()}`;
}

/**
 * What a record is missing, as a pure function of the record.
 *
 * Separated from the lookup so it can be exercised directly. Testing it by
 * writing rows into the ledger and re-importing the module would mean mutating
 * a tracked file to prove a rule about tracked files, and a module cache makes
 * the second import a lie anyway.
 *
 * Every field is checked rather than trusted for being present, because a
 * record that merely exists is the same class of evidence as a packet family
 * name — a statement about intent.
 */
export function packetFulfillmentShortfall(record: PacketFulfillmentRecord | undefined): string[] {
  if (!record) return ["fulfillment record"];
  const missing: string[] = [];

  if (!record.packetFamily?.trim()) missing.push("packet family");
  if (!record.packetFamilyLabel?.trim()) missing.push("packet family label");

  if (!record.packetSpecificationId?.trim()) missing.push("packet specification id");
  if (!/^\d+\.\d+\.\d+$/.test(String(record.packetSpecificationVersion))) missing.push("packet specification version");
  if (!record.packetSpecificationPath?.trim()) missing.push("packet specification path");
  if (!/^[0-9a-f]{64}$/.test(String(record.packetSpecificationSha256))) {
    missing.push("packet specification sha256 — the record has to pin the exact document set it vouches for");
  }

  if (!APPROVED_ARTIFACT_PROVIDERS.has(record.artifactProvider)) {
    missing.push(`approved artifact provider (got ${record.artifactProvider})`);
  }
  if (!record.artifactProviderVersion?.trim()) missing.push("artifact provider version");
  if (!record.renderer?.trim()) missing.push("renderer");
  if (!record.rendererVersion?.trim()) missing.push("renderer version");
  if (!APPROVED_CONTENT_TYPES.has(record.contentType)) missing.push(`approved content type (got ${record.contentType})`);

  for (const component of REQUIRED_PACKET_COMPONENTS) {
    if (!record.packetComponents?.includes(component)) missing.push(`component: ${component}`);
  }

  if (!(record.sourceIdentities?.length > 0)) {
    missing.push("current source or form identities");
  } else if (!record.sourceIdentities.every((entry) =>
    entry.sourceId?.trim()
    && (entry.verification === "present_in_repository" || entry.verification === "asserted_by_ingestion"))) {
    missing.push("a verification state on every source identity");
  }

  if (!(record.requiredFacts?.length > 0)) missing.push("the facts the packet needs");
  if (!(record.finalVerificationRequirements?.length > 0)) missing.push("final-verification requirements");
  if (!record.verificationBinding?.trim()) missing.push("current final-verification binding");

  if (record.privateDelivery !== true) missing.push("private delivery support");
  if (record.repeatDownload !== true) missing.push("repeat-download support");

  if (!record.artifactApprovalStatus?.trim()) missing.push("artifact approval status");
  if (record.consumerPosture !== "open" && record.consumerPosture !== "held") missing.push("consumer posture");
  if (record.sponsoredPosture !== "open" && record.sponsoredPosture !== "held") missing.push("sponsored posture");
  if ((record.consumerPosture === "held" || record.sponsoredPosture === "held") && !record.holdReason?.trim()) {
    missing.push("a named reason for the hold — a hold is a decision, not an absence");
  }

  if (!record.provenBy?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(record.provenOn))) {
    missing.push("the proof that established it, and the date");
  }
  return missing;
}

/** Which posture governs a surface, or null where none does. */
function postureFor(record: PacketFulfillmentRecord, surface: PacketFulfillmentSurface): "open" | "held" | null {
  if (!MONEY_SURFACES.has(surface)) return null;
  if (surface === "sponsored entitlement" || surface === "packet credit consumption") return record.sponsoredPosture;
  return record.consumerPosture;
}

/**
 * Whether this route may proceed.
 *
 * Called with no surface, it answers the narrower question: does a complete
 * record prove this route delivers a packet. Called with a surface, it also
 * applies that surface's posture and, for the money surfaces, the artifact
 * approval status.
 */
export function packetFulfillmentAuthority(
  jurisdiction: string | null | undefined,
  pathwayId: string | null | undefined,
  surface?: PacketFulfillmentSurface,
  binding?: { trackId?: string | null; packetFamilyId?: string | null }
): PacketFulfillmentDecision {
  const routeKey = packetFulfillmentRouteKey(jurisdiction, pathwayId);
  const authority = fulfillmentAuthorityFor(routeKey);
  const canonical = getCurrentFulfillmentRecord(routeKey);
  if (!canonical || authority.commercialStatus !== "commercially_eligible"
    || canonical.schemaVersion !== "rcap-grade-a-fulfillment-authority/v2") {
    return {
      allowed: false,
      reason: `${routeKey}: ${authority.state}. ${authority.reason}`,
      missing: [canonical ? `canonical authority: ${authority.state}` : "fulfillment record"]
    };
  }
  const resolved = consumerSpecificationBinding(canonical, binding);
  if (!resolved) {
    return { allowed: false, reason: `${routeKey}: exact track, family, provider or specification binding mismatch.`, missing: ["exact fulfillment binding"] };
  }
  const { specification, path: specificationPath } = resolved;
  const legacy = RECORDS.get(routeKey);
  // The old ledger may retain a stricter channel posture. It is never proof,
  // and its absence cannot veto canonical authority. Provider and document
  // metadata come from the independently registered specification.
  const record: PacketFulfillmentRecord = {
    routeKey, jurisdiction: canonical.jurisdiction, pathwayId: canonical.pathwayId,
    packetFamily: specification.packetFamily, packetFamilyLabel: specification.packetFamilyLabel,
    packetSpecificationId: specification.specificationId,
    packetSpecificationVersion: specification.specificationVersion,
    packetSpecificationPath: specificationPath,
    packetSpecificationSha256: specification.specificationSha256 ?? canonical.packetSpecification.sha256,
    packetSpecificationFileSha256: canonical.packetSpecification.sha256,
    packetComponents: [...REQUIRED_PACKET_COMPONENTS], sourceIdentities: specification.sourceIdentities,
    artifactProvider: "rcap_grade_a_composer_v1", artifactProviderVersion: canonical.provider.rendererVersion,
    renderer: canonical.provider.rendererKind, rendererVersion: canonical.provider.rendererVersion,
    contentType: "application/pdf", requiredFacts: specification.requiredFacts.map((fact) => fact.factId),
    finalVerificationRequirements: specification.finalVerificationRequirements,
    verificationBinding: canonical.finalVerification.boundInputsSha256 ?? "",
    privateDelivery: true, repeatDownload: true,
    artifactApprovalStatus: "counsel_reviewed_and_visually_verified",
    consumerPosture: legacy?.consumerPosture ?? "open", sponsoredPosture: legacy?.sponsoredPosture ?? "open",
    holdReason: legacy?.holdReason ?? "", provenBy: canonical.recordId, provenOn: canonical.effectiveFrom
  };

  if (surface) {
    const posture = postureFor(record, surface);
    if (posture === "held") {
      return {
        allowed: false,
        reason: `${routeKey} has a proven packet, and ${surface} is held: ${record.holdReason}`,
        missing: [`an open posture for ${surface}`],
        record
      };
    }
    if (MONEY_SURFACES.has(surface) && !SELLABLE_ARTIFACT_APPROVAL.has(record.artifactApprovalStatus)) {
      return {
        allowed: false,
        reason: `${routeKey} is at artifact approval status ${record.artifactApprovalStatus}, which does not carry a sale. `
          + "Machine verification proves a packet is complete against its own specification; it does not prove the specification is right.",
        missing: ["a reviewed artifact approval status"],
        record
      };
    }
  }

  return { allowed: true, record };
}

export class PacketFulfillmentNotProvenError extends Error {
  constructor(readonly routeKey: string, readonly missing: string[], surface: string, readonly detail?: string) {
    super(`${surface} refused: ${routeKey} cannot prove it delivers the packet it promises (missing ${missing.join(", ")}).`);
    this.name = "PacketFulfillmentNotProvenError";
  }
}

/**
 * The assertion each commercial surface calls. The surface name is required so
 * a refusal says which boundary refused, rather than leaving six identical
 * errors to be told apart by a stack trace.
 */
export function assertPacketFulfillmentProven(
  jurisdiction: string | null | undefined,
  pathwayId: string | null | undefined,
  surface: PacketFulfillmentSurface,
  binding?: { trackId?: string | null; packetFamilyId?: string | null }
): void {
  const decision = packetFulfillmentAuthority(jurisdiction, pathwayId, surface, binding);
  if (decision.allowed) return;
  throw new PacketFulfillmentNotProvenError(
    packetFulfillmentRouteKey(jurisdiction, pathwayId),
    decision.missing,
    surface,
    decision.reason
  );
}
