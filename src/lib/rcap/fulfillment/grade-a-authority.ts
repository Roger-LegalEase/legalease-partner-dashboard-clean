import "server-only";

/**
 * The single server-authoritative Grade-A fulfillment contract.
 *
 * Every commercial admission in this product — consumer checkout, sponsored
 * entitlement, packet-credit admission, generation admission, provider dispatch,
 * commercially-deliverable artifact attachment, Briefcase Ready, private
 * download, and the launch graph's commercial status — asks exactly one question
 * of exactly one authority: is there a current fulfillment record for this route
 * whose every proof is present, current and bound?
 *
 * Before this module the answer was assembled per admission point. The route
 * resolver decided `sellable` from a jurisdiction list and a registry; the
 * payment adapter decided deliverability from a route kind; the launch graph
 * computed nine operational gates in a generator; visual review, output-level
 * legal approval and final-verification binding were recorded in evidence files
 * that no runtime path consulted at all. Nine partial answers is not an
 * authority — it is nine places to get the rule wrong, and the failure mode is
 * that a participant is charged $50 for a packet nobody proved.
 *
 * So this file states the rule once, as data plus pure functions:
 *
 *   * an authority is a versioned record binding a route to the identity and
 *     hash of every input that made it Grade A;
 *   * only `COMPLETE_PACKET_PROVEN` authorizes anything commercial;
 *   * every other state — including "we have no record for this route" — denies;
 *   * the record is compared against what the server observes right now, so a
 *     change to a source, spec, provider, review or verification input closes
 *     the authority without anyone having to remember to close it.
 *
 * What this module deliberately does NOT do: execute a payment, allocate a
 * sponsorship, run a renderer, store an artifact, move a claim, or write the
 * captain-owned global fulfillment ledger. It decides eligibility. The lanes
 * that act on that decision keep owning the acting.
 */

import {
  collectPacketCompletenessGaps,
  type PacketCompletenessProof
} from "@/lib/rcap/fulfillment/grade-a-packet-proof";
import {
  collectContextDenials,
  type FulfillmentRequestContext
} from "@/lib/rcap/fulfillment/grade-a-request-context";

export const GRADE_A_AUTHORITY_SCHEMA_VERSION = "rcap-grade-a-fulfillment-authority/v1";

/**
 * The schema a record must declare before it may admit anything commercial.
 *
 * v1 records bind provenance. v2 adds the fileability proof — proposed order,
 * service and notice, filing destination, fee and waiver, copy requirements,
 * post-filing steps, hearing stops, custom-pleading authority, and a
 * filing-format artifact with its own hash.
 *
 * The two versions are handled differently on purpose, and the difference is the
 * whole point of versioning this rather than quietly tightening v1:
 *
 *   * EVALUATION keeps v1 semantics for a v1 record. Its state and its list of
 *     missing proofs mean today exactly what they meant yesterday, so the
 *     generated projection does not silently change under a report someone is
 *     reading, and a v1 record keeps its own history rather than becoming
 *     unreadable.
 *   * ADMISSION refuses every v1 record outright. Being evaluable is not being
 *     sellable. A record written before fileability was a question cannot answer
 *     it, and a rule that let it try would be the fail-open this contract exists
 *     to prevent.
 *
 * So a v1 record can report COMPLETE_PACKET_PROVEN and still admit nothing. That
 * reads as a contradiction and is not one: the state describes the proofs the
 * record was written to carry, and admission describes the proofs this product
 * now requires. Reconciling them is a record migration, which is a decision with
 * an owner, not a side effect of deploying this file.
 */
export const GRADE_A_ADMISSION_SCHEMA_VERSION = "rcap-grade-a-fulfillment-authority/v2";

/** Schemas this authority can evaluate at all. Anything else fails closed. */
export const GRADE_A_EVALUABLE_SCHEMA_VERSIONS = [
  GRADE_A_AUTHORITY_SCHEMA_VERSION,
  GRADE_A_ADMISSION_SCHEMA_VERSION
] as const;

/**
 * The one authorizing state. Named as a constant rather than written inline at
 * each comparison so that a grep for the literal finds every place the product
 * claims proof, and so that the string cannot drift between modules.
 */
export const COMPLETE_PACKET_PROVEN = "COMPLETE_PACKET_PROVEN";

export type FulfillmentAuthorityState =
  /** Every proof present, current, bound, and the disposition is a paid packet. */
  | "COMPLETE_PACKET_PROVEN"
  /** A record exists but at least one proof was never obtained. */
  | "INCOMPLETE"
  /** Every proof was obtained, but at least one no longer matches the world. */
  | "STALE"
  /** Withdrawn by a named authority for a recorded reason. */
  | "REVOKED"
  /** A later version of this route's authority exists; this one no longer decides. */
  | "SUPERSEDED"
  /**
   * No record binds this route at all. Distinct from UNSUPPORTED_ROUTE because
   * "nobody has written a record for this" and "a record exists that this
   * authority cannot evaluate" are different operational facts, and an operator
   * chasing one should not be handed the other. Both fail closed.
   */
  | "NO_RECORD"
  /** A record exists but this authority cannot evaluate it. Fails closed. */
  | "UNSUPPORTED_ROUTE";

/**
 * The service dispositions this product recognises, using the vocabulary the
 * sellable-pathway closure ledger already froze. Only a paid packet can ever be
 * commercially eligible; the other four describe routes we deliberately do not
 * sell, and a record carrying one of them can never reach COMPLETE_PACKET_PROVEN
 * however much proof it accumulates.
 */
export const SERVICE_DISPOSITIONS = [
  "paid_packet_intended",
  "non_filing_guidance",
  "product_scope_exclusion",
  "legally_unavailable",
  "exact_external_deferral"
] as const;

export type ServiceDisposition = (typeof SERVICE_DISPOSITIONS)[number];

export type ReviewState = "passed" | "failed" | "pending" | "not_required";
export type LegalAuthorityStatus = "approved_by_decision_owner" | "pending" | "withdrawn" | "superseded";
export type ArtifactValidationState = "validated" | "failed" | "not_run";
export type FinalVerificationState = "bound" | "unbound" | "failed";

export type LegalAuthorityProof = {
  recordId: string;
  /** The legal-decision version this record was written against, not "the latest". */
  version: string;
  status: LegalAuthorityStatus;
  effectiveDate: string;
  /** Hash of the decision's scope statement, so a re-scoped decision reads as stale. */
  scopeSha256: string;
};

export type PacketSpecificationProof = {
  specId: string;
  sha256: string;
  complete: boolean;
};

/**
 * A governed source-availability proof.
 *
 * This deliberately does not ask whether Git holds the court's PDF. `private/`
 * is git-ignored and this repository judges a source by its identity rather
 * than by whether Git holds the bytes, so a "held in repository" test could
 * only ever be satisfied by breaking another rule -- and while it stood, no
 * route in this product could reach COMPLETE_PACKET_PROVEN however much proof
 * it accumulated.
 *
 * What it asks instead is answerable and can fail: the digest the packet was
 * built against, and the digest the corpus import verified on disk, must both
 * be present and exactly equal. The two come from records written by different
 * processes at different times, which is what makes their agreement evidence.
 * Absent or mismatched, the source is not proven and the route is denied.
 */
export type OfficialSourceProof = {
  sourceId: string;
  /**
   * The content digest this record binds. Kept as `sha256` because it is the
   * value `collectStaleness` compares against the server's current observation.
   */
  sha256: string;
  /** The digest the packet's own official-form source record was built against. */
  expectedSha256: string;
  /** The digest the corpus import verified against the installed bytes. */
  installedSha256: string;
  /** The corpus release the installed bytes came from. */
  corpusReleaseId: string;
  /** The digest of that release's archive. */
  corpusArchiveSha256: string;
  /** When the two records were reconciled. */
  verifiedAt: string;
  /** The committed record carrying this proof, so a reader can check it. */
  verificationRecord: string;
};

export type ProviderProof = {
  providerId: string;
  rendererKind: string;
  rendererVersion: string;
  /** The immutable registry digest of the worker image that rendered the proof. */
  imageDigest: string;
};

export type FixtureProof = {
  fixtureId: string;
  sha256: string;
  deterministic: boolean;
};

export type ArtifactValidationProof = {
  state: ArtifactValidationState;
  artifactSha256: string | null;
  validatedAt: string | null;
};

export type VisualReviewProof = {
  state: ReviewState;
  /** Page-by-page: a review that covered fewer pages than the artifact has is not a pass. */
  pagesReviewed: number;
  pageCount: number;
  evidenceSha256: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type OutputLegalApprovalProof = {
  state: ReviewState;
  reviewerId: string | null;
  decidedAt: string | null;
  scopeSha256: string | null;
};

export type FinalVerificationProof = {
  state: FinalVerificationState;
  verifierId: string | null;
  /**
   * Hash over the exact proof identities this verification was run against. It
   * is what makes "verified" mean "verified against these inputs" rather than
   * "verified at some point".
   */
  boundInputsSha256: string | null;
  verifiedAt: string | null;
};

export type AuthorityChangeKind =
  | "created"
  | "proof_added"
  | "proof_invalidated"
  | "revoked"
  | "superseded"
  | "reinstated";

export type AuthorityHistoryEntry = {
  version: number;
  changeKind: AuthorityChangeKind;
  changedAt: string;
  /** Who or what changed the authority. Never null: an unattributed change is a defect. */
  changedBy: string;
  reason: string;
  /** Hash of the record as it stood after this change. */
  recordSha256: string;
  /** Hash of the immediately preceding record, or null for the first version. */
  supersedesRecordSha256: string | null;
};

export type RevocationRecord = {
  revoked: boolean;
  reason: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
};

export type GradeAFulfillmentRecord = {
  schemaVersion: string;
  recordId: string;
  /** `<JURISDICTION>:<pathwayId>`, the key every admission point already has. */
  routeId: string;
  jurisdiction: string;
  pathwayId: string;
  packetFamilyId: string | null;
  serviceDisposition: ServiceDisposition;
  version: number;
  effectiveFrom: string;
  supersededBy: string | null;
  supersededAt: string | null;
  revocation: RevocationRecord;
  legalAuthority: LegalAuthorityProof;
  packetSpecification: PacketSpecificationProof;
  officialSources: OfficialSourceProof[];
  provider: ProviderProof;
  fixture: FixtureProof;
  artifactValidation: ArtifactValidationProof;
  /**
   * What the packet proves about its own fileability. Optional in the type and
   * mandatory in the rule: a record without it is INCOMPLETE, never exempt. It is
   * optional here only so that a v1 record written before this dimension existed
   * parses rather than failing to load — and a record that parses and then denies
   * is the correct outcome, where a record that fails to load would silently
   * become "no record" and lose its own history.
   */
  packetCompleteness?: PacketCompletenessProof | null;
  visualReview: VisualReviewProof;
  outputLegalApproval: OutputLegalApprovalProof;
  finalVerification: FinalVerificationProof;
  history: AuthorityHistoryEntry[];
};

/**
 * What the server sees right now, resolved server-side from the current
 * repository and runtime — never from a request. Staleness is defined as a
 * disagreement between what the record bound and what this observation reports,
 * which is why the observation carries hashes rather than booleans: a boolean
 * "still fine" would be exactly the client-controlled authority this contract
 * exists to remove.
 *
 * A null observation is not "no change". It is "the server could not establish
 * the current world", and it closes authority, because an authority that cannot
 * be re-checked is not a current authority.
 */
export type FulfillmentObservation = {
  observedAt: string;
  legalAuthority: { version: string; status: LegalAuthorityStatus; scopeSha256: string };
  packetSpecificationSha256: string;
  /** Every official source the server can currently account for, by id. */
  officialSourceSha256ById: Record<string, string>;
  /**
   * The corpus release the server is currently serving sources from.
   *
   * A record proves its sources against one release. If the platform is moved
   * to another release, or the same release is republished under a different
   * archive, every source proof written against the old one is stale even when
   * the individual digests happen to still match -- the provenance chain the
   * proof rests on no longer exists.
   */
  corpusReleaseId: string;
  corpusArchiveSha256: string;
  provider: ProviderProof;
  fixtureSha256: string;
  artifactSha256: string | null;
  visualReviewEvidenceSha256: string | null;
  outputLegalApprovalScopeSha256: string | null;
  finalVerificationBoundInputsSha256: string | null;
};

export type CommercialStatus = "commercially_eligible" | "not_commercially_eligible";

/**
 * The nine truthful dispositions. Every route reaches exactly one.
 *
 * The authority states are about the RECORD; a disposition is what an operator,
 * a status page or a launch report should say about the ROUTE. They are not the
 * same vocabulary and collapsing them loses the distinction that matters most —
 * "we have not built this yet" and "we built it and counsel has not signed it"
 * are both denials and are not the same news.
 */
export const ROUTE_DISPOSITIONS = [
  "COMPLETE_PACKET_PROVEN",
  "ARTIFACT_GENERATION_REQUIRED",
  "ARTIFACT_REVIEW_REQUIRED",
  "SOURCE_OR_CONFIGURATION_GATE",
  "GUIDANCE_OR_AUTOMATIC",
  "NOT_YET",
  "FUTURE_EFFECTIVE",
  "ATTORNEY_OR_PARTNER_HANDOFF",
  "UNKNOWN_FAIL_CLOSED"
] as const;

export type RouteDisposition = (typeof ROUTE_DISPOSITIONS)[number];

/**
 * Exactly one disposition per decision, chosen by the FIRST matching rule so the
 * mapping is total and deterministic. The order encodes what an operator should
 * be told first: an unknown route before a known-blocked one, a legal hold before
 * a technical one, a missing artifact before a missing review of it.
 */
export function dispositionFor(decision: FulfillmentAuthorityDecision): RouteDisposition {
  if (decision.state === "COMPLETE_PACKET_PROVEN") return "COMPLETE_PACKET_PROVEN";

  // No record and unevaluable records are the same news to an operator: nobody
  // can say what this route is, so nothing may happen on it.
  if (decision.state === "NO_RECORD" || decision.state === "UNSUPPORTED_ROUTE") return "UNKNOWN_FAIL_CLOSED";

  // A route we deliberately do not sell is not a route that is behind.
  if (decision.serviceDisposition === "non_filing_guidance") return "GUIDANCE_OR_AUTOMATIC";
  if (decision.serviceDisposition === "exact_external_deferral") return "ATTORNEY_OR_PARTNER_HANDOFF";
  if (decision.serviceDisposition === "product_scope_exclusion") return "GUIDANCE_OR_AUTOMATIC";
  if (decision.serviceDisposition === "legally_unavailable") return "FUTURE_EFFECTIVE";

  // A revoked or superseded authority is a configuration fact, not a build gap.
  if (decision.state === "REVOKED" || decision.state === "SUPERSEDED") return "SOURCE_OR_CONFIGURATION_GATE";
  if (decision.state === "STALE") return "SOURCE_OR_CONFIGURATION_GATE";

  const open = decision.missingProof;
  const opens = (prefix: string) => open.some((entry) => entry.startsWith(prefix));

  if (opens("legal_authority")) return "SOURCE_OR_CONFIGURATION_GATE";
  if (opens("official_sources")) return "SOURCE_OR_CONFIGURATION_GATE";
  if (opens("provider") || opens("fixture") || opens("packet_specification")) return "SOURCE_OR_CONFIGURATION_GATE";
  if (opens("artifact_validation") || opens("packet_completeness")) return "ARTIFACT_GENERATION_REQUIRED";
  if (opens("visual_review") || opens("output_legal_approval") || opens("final_verification")) return "ARTIFACT_REVIEW_REQUIRED";

  // An INCOMPLETE record with no gap this mapping recognises is a rule someone
  // added without teaching the disposition about it. Say so rather than guess.
  return open.length > 0 ? "NOT_YET" : "UNKNOWN_FAIL_CLOSED";
}

export type FulfillmentAuthorityDecision = {
  state: FulfillmentAuthorityState;
  /** The single boolean every caller reads. True only when state is COMPLETE_PACKET_PROVEN. */
  authorized: boolean;
  commercialStatus: CommercialStatus;
  routeId: string;
  jurisdiction: string | null;
  packetFamilyId: string | null;
  serviceDisposition: ServiceDisposition | null;
  recordId: string | null;
  recordVersion: number | null;
  /** Proofs that were never obtained. Ordered, so two runs produce identical output. */
  missingProof: string[];
  /** Proofs that were obtained but no longer match the observed world. */
  stalenessReasons: string[];
  revocationReason: string | null;
  /** One sentence a log or an operator can read without re-deriving the rule. */
  reason: string;
};

/** Every commercial admission point that must consume this authority. */
export const COMMERCIAL_ADMISSION_POINTS = [
  "consumer_checkout",
  "sponsored_entitlement",
  "packet_credit_admission",
  "generation_admission",
  "provider_dispatch",
  "artifact_commercial_attachment",
  "briefcase_ready",
  "private_download",
  // A repeat download is its own admission. The product contract requires an
  // artifact to be "reusable for repeat downloads without a second payment or
  // credit", which means the second download must be admitted WITHOUT
  // re-consuming an entitlement — a rule that only exists if the second download
  // is a decision the authority makes rather than a replay of the first.
  "repeat_download",
  "launch_graph_commercial_status"
] as const;

export type CommercialAdmissionPoint = (typeof COMMERCIAL_ADMISSION_POINTS)[number];

/**
 * The identity an admission point asks about. Three strings and nothing else:
 * there is no field here through which a caller could assert a conclusion, which
 * is why a hostile request body cannot elevate authority — the shape gives it
 * nowhere to put the lie.
 */
export type AdmissionRequestIdentity = {
  routeId: string;
  jurisdiction: string;
  packetFamilyId: string | null;
};

export type CommercialAdmissionDecision = {
  admissionPoint: CommercialAdmissionPoint;
  admitted: boolean;
  authority: FulfillmentAuthorityDecision;
  /** The one truthful disposition for this route, for status and launch reporting. */
  disposition: RouteDisposition;
  /** Why the participant, not the route, was refused. Empty when the route was. */
  contextDenials: string[];
  /** Set only on a denial, so a route can return a typed refusal. */
  denialCode: string | null;
  reason: string;
};

const REQUIRED_PROOF_ORDER = [
  "service_disposition",
  "legal_authority",
  "packet_specification",
  "official_sources",
  "provider",
  "fixture",
  "artifact_validation",
  "packet_completeness",
  "visual_review",
  "output_legal_approval",
  "final_verification"
] as const;

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Which proofs a record simply does not have. Computed before staleness, because
 * "you never obtained this" and "this changed under you" are different facts and
 * an operator needs to be told which one is true.
 */
function collectMissingProof(record: GradeAFulfillmentRecord): string[] {
  const missing: string[] = [];

  if (record.serviceDisposition !== "paid_packet_intended") {
    missing.push(`service_disposition: ${record.serviceDisposition} is not a paid packet, so no proof can make this route commercially eligible`);
  }

  if (record.legalAuthority.status !== "approved_by_decision_owner") {
    missing.push(`legal_authority: status is ${record.legalAuthority.status}, not approved_by_decision_owner`);
  }
  if (!nonEmpty(record.legalAuthority.version) || !nonEmpty(record.legalAuthority.scopeSha256)) {
    missing.push("legal_authority: a decision version and scope hash are required");
  }

  if (!record.packetSpecification.complete) {
    missing.push("packet_specification: the specification is not complete");
  }
  if (!nonEmpty(record.packetSpecification.sha256)) {
    missing.push("packet_specification: a specification hash is required");
  }

  if (record.officialSources.length === 0) {
    missing.push("official_sources: no official source is bound to this route");
  }
  for (const source of record.officialSources) {
    // Every field is required, and the two digests must agree exactly. A source
    // with one record and not the other is a source nobody has corroborated;
    // two records that disagree is a source that has changed under us. Both are
    // denials, and neither is cured by the bytes being in Git.
    if (!nonEmpty(source.expectedSha256)) {
      missing.push(`official_sources: ${source.sourceId} has no expected content hash from a packet source record`);
    }
    if (!nonEmpty(source.installedSha256)) {
      missing.push(`official_sources: ${source.sourceId} has no installed content hash from a verified corpus`);
    }
    if (nonEmpty(source.expectedSha256) && nonEmpty(source.installedSha256)
      && source.expectedSha256 !== source.installedSha256) {
      missing.push(`official_sources: ${source.sourceId} expected ${source.expectedSha256} but the verified corpus holds ${source.installedSha256}`);
    }
    if (!nonEmpty(source.corpusReleaseId) || !nonEmpty(source.corpusArchiveSha256)) {
      missing.push(`official_sources: ${source.sourceId} does not name the corpus release and archive its bytes were verified from`);
    }
    if (!nonEmpty(source.verifiedAt) || !nonEmpty(source.verificationRecord)) {
      missing.push(`official_sources: ${source.sourceId} has no source verification record`);
    }
    if (!nonEmpty(source.sha256)) {
      missing.push(`official_sources: ${source.sourceId} has no content hash`);
    } else if (nonEmpty(source.expectedSha256) && source.sha256 !== source.expectedSha256) {
      // The bound digest is what staleness compares. If it drifts from the
      // corroborated digest the record is citing one document and proving
      // another.
      missing.push(`official_sources: ${source.sourceId} binds ${source.sha256}, which is not the corroborated digest`);
    }
  }

  if (!nonEmpty(record.provider.providerId) || !nonEmpty(record.provider.rendererVersion) || !nonEmpty(record.provider.imageDigest)) {
    missing.push("provider: a provider identity, renderer version and image digest are required");
  }

  if (!record.fixture.deterministic || !nonEmpty(record.fixture.sha256)) {
    missing.push("fixture: a deterministic fixture and its hash are required");
  }

  if (record.artifactValidation.state !== "validated" || !nonEmpty(record.artifactValidation.artifactSha256)) {
    missing.push(`artifact_validation: state is ${record.artifactValidation.state} with artifact hash ${record.artifactValidation.artifactSha256 ?? "absent"}`);
  }

  // Fileability. A perfectly provenanced packet with no proposed order, no
  // service list or no filing destination is not a Grade-A packet, and until
  // this dimension existed the authority could not tell the difference.
  //
  // Reported only for records that declare the schema which HAS this dimension.
  // A v1 record is not silently forgiven for lacking it — admission refuses every
  // v1 record whatever its state — but its evaluated state keeps meaning what it
  // meant when it was written.
  if (record.schemaVersion === GRADE_A_ADMISSION_SCHEMA_VERSION) {
    for (const gap of collectPacketCompletenessGaps(record.packetCompleteness ?? null)) {
      missing.push(gap);
    }
  }

  // "not_required" is a legitimate visual-review outcome elsewhere in this
  // product, but not here: a commercially deliverable packet is a thing a
  // participant files with a court, and every page of it is reviewed. A route
  // that wants to skip visual review does not become Grade A.
  if (record.visualReview.state !== "passed") {
    missing.push(`visual_review: state is ${record.visualReview.state}, and Grade A requires a page-by-page pass`);
  } else if (record.visualReview.pageCount <= 0 || record.visualReview.pagesReviewed < record.visualReview.pageCount) {
    missing.push(`visual_review: ${record.visualReview.pagesReviewed} of ${record.visualReview.pageCount} pages were reviewed`);
  } else if (!nonEmpty(record.visualReview.evidenceSha256) || !nonEmpty(record.visualReview.reviewedBy)) {
    missing.push("visual_review: review evidence and a named reviewer are required");
  }

  if (record.outputLegalApproval.state !== "passed") {
    missing.push(`output_legal_approval: state is ${record.outputLegalApproval.state}`);
  } else if (!nonEmpty(record.outputLegalApproval.reviewerId) || !nonEmpty(record.outputLegalApproval.scopeSha256)) {
    missing.push("output_legal_approval: a named reviewer and an approved-output scope hash are required");
  }

  if (record.finalVerification.state !== "bound") {
    missing.push(`final_verification: state is ${record.finalVerification.state}`);
  } else if (!nonEmpty(record.finalVerification.boundInputsSha256) || !nonEmpty(record.finalVerification.verifierId)) {
    missing.push("final_verification: a verifier identity and a bound-inputs hash are required");
  }

  return missing.sort();
}

/**
 * Which proofs the record holds that the world no longer agrees with. Every
 * comparison is hash or identity equality, so a change anywhere upstream closes
 * the authority by arithmetic rather than by anyone remembering to close it.
 */
function collectStaleness(record: GradeAFulfillmentRecord, observation: FulfillmentObservation): string[] {
  const stale: string[] = [];

  if (observation.legalAuthority.version !== record.legalAuthority.version) {
    stale.push(`legal_authority: bound version ${record.legalAuthority.version}, observed ${observation.legalAuthority.version}`);
  }
  if (observation.legalAuthority.status !== record.legalAuthority.status) {
    stale.push(`legal_authority: bound status ${record.legalAuthority.status}, observed ${observation.legalAuthority.status}`);
  }
  if (observation.legalAuthority.scopeSha256 !== record.legalAuthority.scopeSha256) {
    stale.push("legal_authority: the decision scope changed since this record was written");
  }

  if (observation.packetSpecificationSha256 !== record.packetSpecification.sha256) {
    stale.push("packet_specification: the specification changed since this record was written");
  }

  for (const source of record.officialSources) {
    const observed = observation.officialSourceSha256ById[source.sourceId];
    if (observed === undefined) {
      stale.push(`official_sources: ${source.sourceId} is no longer accounted for`);
    } else if (observed !== source.sha256) {
      stale.push(`official_sources: ${source.sourceId} changed since this record was written`);
    }
    if (nonEmpty(source.corpusReleaseId) && observation.corpusReleaseId !== source.corpusReleaseId) {
      stale.push(`official_sources: ${source.sourceId} was verified against corpus release ${source.corpusReleaseId}, and the server now serves ${observation.corpusReleaseId || "no release"}`);
    }
    if (nonEmpty(source.corpusArchiveSha256) && observation.corpusArchiveSha256 !== source.corpusArchiveSha256) {
      stale.push(`official_sources: ${source.sourceId} was verified against corpus archive ${source.corpusArchiveSha256}, and the server now serves ${observation.corpusArchiveSha256 || "no archive"}`);
    }
  }

  if (observation.provider.providerId !== record.provider.providerId
    || observation.provider.rendererKind !== record.provider.rendererKind
    || observation.provider.rendererVersion !== record.provider.rendererVersion
    || observation.provider.imageDigest !== record.provider.imageDigest) {
    stale.push(`provider: bound ${record.provider.providerId}@${record.provider.rendererVersion}/${record.provider.imageDigest}, observed ${observation.provider.providerId}@${observation.provider.rendererVersion}/${observation.provider.imageDigest}`);
  }

  if (observation.fixtureSha256 !== record.fixture.sha256) {
    stale.push("fixture: the deterministic fixture changed since this record was written");
  }

  if (observation.artifactSha256 !== record.artifactValidation.artifactSha256) {
    stale.push("artifact_validation: the validated artifact is not the artifact the server now produces");
  }

  if (observation.visualReviewEvidenceSha256 !== record.visualReview.evidenceSha256) {
    stale.push("visual_review: the reviewed pages are not the pages the server now produces");
  }

  if (observation.outputLegalApprovalScopeSha256 !== record.outputLegalApproval.scopeSha256) {
    stale.push("output_legal_approval: the approved output scope changed since this record was written");
  }

  if (observation.finalVerificationBoundInputsSha256 !== record.finalVerification.boundInputsSha256) {
    stale.push("final_verification: the verification is bound to inputs that are no longer the current inputs");
  }

  return stale.sort();
}

function deny(
  state: FulfillmentAuthorityState,
  routeId: string,
  reason: string,
  extra: Partial<FulfillmentAuthorityDecision> = {}
): FulfillmentAuthorityDecision {
  return {
    state,
    authorized: false,
    commercialStatus: "not_commercially_eligible",
    routeId,
    jurisdiction: null,
    packetFamilyId: null,
    serviceDisposition: null,
    recordId: null,
    recordVersion: null,
    missingProof: [],
    stalenessReasons: [],
    revocationReason: null,
    reason,
    ...extra
  };
}

/**
 * The whole rule, in one place.
 *
 * A null record is the unsupported-route case and denies: this product does not
 * have an implicit default for a route nobody wrote a record for. A null
 * observation denies for the same reason a null record does — an authority the
 * server cannot re-check right now is not an authority it may act on.
 */
export function evaluateFulfillmentAuthority(
  record: GradeAFulfillmentRecord | null | undefined,
  observation: FulfillmentObservation | null | undefined,
  routeId: string
): FulfillmentAuthorityDecision {
  if (!record) {
    return deny("NO_RECORD", routeId, `No Grade-A fulfillment record binds ${routeId || "(no route)"}; a route nobody has written a record for fails closed.`);
  }

  if (!GRADE_A_EVALUABLE_SCHEMA_VERSIONS.includes(record.schemaVersion as (typeof GRADE_A_EVALUABLE_SCHEMA_VERSIONS)[number])) {
    return deny("UNSUPPORTED_ROUTE", routeId, `The record for ${record.routeId} declares schema ${record.schemaVersion}, which this authority does not evaluate.`);
  }

  const identity = {
    jurisdiction: record.jurisdiction,
    packetFamilyId: record.packetFamilyId,
    serviceDisposition: record.serviceDisposition,
    recordId: record.recordId,
    recordVersion: record.version
  };

  if (record.supersededBy) {
    return deny("SUPERSEDED", record.routeId, `Version ${record.version} of ${record.routeId} was superseded by ${record.supersededBy}; only the current version decides.`, identity);
  }

  if (record.revocation.revoked) {
    return deny("REVOKED", record.routeId, `Authority for ${record.routeId} was revoked by ${record.revocation.revokedBy ?? "an unnamed authority"}: ${record.revocation.reason ?? "no reason recorded"}.`, {
      ...identity,
      revocationReason: record.revocation.reason
    });
  }

  const missingProof = collectMissingProof(record);
  if (missingProof.length > 0) {
    return deny("INCOMPLETE", record.routeId, `${record.routeId} is missing ${missingProof.length} proof(s) required for Grade-A fulfillment.`, {
      ...identity,
      missingProof
    });
  }

  if (!observation) {
    return deny("STALE", record.routeId, `${record.routeId} holds every proof, but the server could not observe the current world to confirm they still hold.`, {
      ...identity,
      stalenessReasons: ["observation: the current world could not be established"]
    });
  }

  const stalenessReasons = collectStaleness(record, observation);
  if (stalenessReasons.length > 0) {
    return deny("STALE", record.routeId, `${record.routeId} holds every proof, but ${stalenessReasons.length} of them no longer match the current world.`, {
      ...identity,
      stalenessReasons
    });
  }

  return {
    state: "COMPLETE_PACKET_PROVEN",
    authorized: true,
    commercialStatus: "commercially_eligible",
    routeId: record.routeId,
    ...identity,
    missingProof: [],
    stalenessReasons: [],
    revocationReason: null,
    reason: `${record.routeId} version ${record.version} is COMPLETE_PACKET_PROVEN against legal decision ${record.legalAuthority.version}, spec ${record.packetSpecification.specId}, provider ${record.provider.providerId}@${record.provider.rendererVersion} and fixture ${record.fixture.fixtureId}.`
  };
}

/**
 * The one function every commercial admission point calls.
 *
 * The route identity the caller asks about is checked against the record's own
 * identity before the authority is honoured. That is what stops a caller from
 * presenting a proven Oregon record to admit a North Dakota charge, or a proven
 * expungement family to admit a sealing packet: the record proves one route, and
 * asking about a different one is a denial rather than a near miss.
 */
export function admitCommercialAction(input: {
  admissionPoint: CommercialAdmissionPoint;
  request: AdmissionRequestIdentity;
  record: GradeAFulfillmentRecord | null | undefined;
  observation: FulfillmentObservation | null | undefined;
  /**
   * Server-resolved participant facts. Required by every admission point except
   * `launch_graph_commercial_status`, which asks about a route with nobody in
   * front of it. Omitting it where it is required is a denial, not a bypass.
   */
  context?: FulfillmentRequestContext | null;
}): CommercialAdmissionDecision {
  const { admissionPoint, request, record, observation, context } = input;

  const refuse = (
    authority: FulfillmentAuthorityDecision,
    denialCode: string,
    reason: string,
    contextDenials: string[] = []
  ): CommercialAdmissionDecision => {
    const computed = dispositionFor(authority);
    return {
      admissionPoint,
      admitted: false,
      authority,
      // A refused admission never reports COMPLETE_PACKET_PROVEN. The state can
      // legitimately be proven while the admission is refused — a v1 record with
      // every v1 proof is exactly that case — but "proven" is what an operator
      // reads on a status page, and a route nobody may sell must not appear
      // there as one that is finished. What blocks it is the record's own
      // configuration, so that is what it is called.
      disposition: computed === "COMPLETE_PACKET_PROVEN" ? "SOURCE_OR_CONFIGURATION_GATE" : computed,
      contextDenials,
      denialCode,
      reason
    };
  };

  if (!COMMERCIAL_ADMISSION_POINTS.includes(admissionPoint)) {
    const message = `${String(admissionPoint)} is not a recognised commercial admission point.`;
    return refuse(deny("UNSUPPORTED_ROUTE", request?.routeId ?? "", message), "unknown_admission_point", message);
  }

  const authority = evaluateFulfillmentAuthority(record, observation, request?.routeId ?? "");

  // A record proves one route. Checked before the authority's own verdict is
  // honoured, so a proven record offered for the wrong route is a mismatch rather
  // than an admission.
  if (record && authority.state !== "NO_RECORD" && authority.state !== "UNSUPPORTED_ROUTE") {
    const jurisdictionMismatch = request.jurisdiction !== record.jurisdiction;
    const familyMismatch = (request.packetFamilyId ?? null) !== (record.packetFamilyId ?? null);
    const routeMismatch = request.routeId !== record.routeId;
    if (jurisdictionMismatch || familyMismatch || routeMismatch) {
      const message = `The record offered for ${request.routeId} proves ${record.routeId} (${record.jurisdiction}/${record.packetFamilyId ?? "no family"}); a record proves one route only.`;
      return refuse(deny("UNSUPPORTED_ROUTE", request.routeId, message), "route_binding_mismatch", message);
    }
  }

  // The authority's own verdict first, so a record this authority cannot even
  // evaluate is refused as unsupported rather than as an old schema. Both fail
  // closed; they send an operator to different places.
  if (!authority.authorized) {
    return refuse(authority, `fulfillment_${authority.state.toLowerCase()}`, `${admissionPoint} is denied: ${authority.reason}`);
  }

  // Evaluable and proven is still not admissible. A record below the admission
  // schema cannot have answered the fileability question — a v1 record with
  // every v1 proof is precisely the dangerous case, because nothing about it
  // looks wrong.
  if (record && record.schemaVersion !== GRADE_A_ADMISSION_SCHEMA_VERSION) {
    const message = `${record.routeId} declares ${record.schemaVersion}; commercial admission requires ${GRADE_A_ADMISSION_SCHEMA_VERSION}, which carries the packet fileability proof.`;
    return refuse(authority, "fulfillment_schema_below_admission_minimum", `${admissionPoint} is denied: ${message}`);
  }

  // The route is proven. Now the participant.
  //
  // Deliberately second: a route that is not Grade A is refused identically for
  // every participant, so no request-shaped probe can distinguish "your matter is
  // wrong" from "this route was never proven" and learn something about another
  // participant's state from the difference.
  const contextDenials = collectContextDenials({
    admissionPoint,
    context,
    routeId: authority.routeId,
    packetFamilyId: authority.packetFamilyId
  });

  if (contextDenials.length > 0) {
    return refuse(
      authority,
      "participant_context_denied",
      `${admissionPoint} is denied on a proven route: ${contextDenials.length} participant condition(s) not met.`,
      contextDenials
    );
  }

  return {
    admissionPoint,
    admitted: true,
    authority,
    disposition: dispositionFor(authority),
    contextDenials: [],
    denialCode: null,
    reason: `${admissionPoint} is admitted by ${COMPLETE_PACKET_PROVEN} on ${authority.routeId} version ${authority.recordVersion}.`
  };
}

/**
 * Keys a request body must never be allowed to contribute. None of them is read
 * by anything in this module — the sanitiser exists so that an attempt to send
 * one is a recorded event rather than a silent no-op, and so a route can answer
 * a hostile body with a typed refusal instead of quietly ignoring it.
 */
export const ADMISSION_IDENTITY_KEYS = ["routeId", "jurisdiction", "packetFamilyId"] as const;

/**
 * Every field name the authority itself uses, derived from an exemplar of each
 * of its own shapes rather than hand-listed.
 *
 * The hand-written list below caught the keys someone thought of. It did not
 * catch `visualReview`, `officialSources`, `artifactValidation`,
 * `finalVerification`, `packetCompleteness`, `entitlement` or
 * `matterOwnerUserId` — every one of which is a fact a hostile body would love to
 * assert, and every one of which sailed through as an "ignored" key. Deriving the
 * set from the shapes means a proof dimension added tomorrow is defended today.
 */
function authorityVocabulary(): Set<string> {
  const names = new Set<string>();
  const walk = (value: unknown, depth: number): void => {
    if (depth > 6 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, depth + 1);
      return;
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      names.add(key);
      walk(nested, depth + 1);
    }
  };
  walk(AUTHORITY_SHAPE_EXEMPLAR, 0);
  for (const key of ADMISSION_IDENTITY_KEYS) names.delete(key);
  return names;
}

/**
 * One value of every shape the authority reasons about. Its VALUES are
 * meaningless — only its key names are read. It is deliberately built by hand
 * rather than by reflection so that adding a proof dimension without adding it
 * here fails the vocabulary test rather than silently widening what a body may
 * send.
 */
const AUTHORITY_SHAPE_EXEMPLAR = {
  record: {
    schemaVersion: "", recordId: "", routeId: "", jurisdiction: "", pathwayId: "",
    packetFamilyId: "", serviceDisposition: "", version: 0, effectiveFrom: "",
    supersededBy: "", supersededAt: "",
    revocation: { revoked: false, reason: "", revokedAt: "", revokedBy: "" },
    legalAuthority: { recordId: "", version: "", status: "", effectiveDate: "", scopeSha256: "" },
    packetSpecification: { specId: "", sha256: "", complete: false },
    officialSources: [{
      sourceId: "", sha256: "", expectedSha256: "", installedSha256: "",
      corpusReleaseId: "", corpusArchiveSha256: "", verifiedAt: "", verificationRecord: ""
    }],
    provider: { providerId: "", rendererKind: "", rendererVersion: "", imageDigest: "" },
    fixture: { fixtureId: "", sha256: "", deterministic: false },
    artifactValidation: { state: "", artifactSha256: "", validatedAt: "" },
    packetCompleteness: {
      specificationId: "", specificationVersion: "", specificationSha256: "",
      filingApplication: { state: "", basis: "" }, proposedOrder: { state: "", basis: "" },
      attachmentsAndSchedules: { state: "", basis: "" }, serviceAndNotice: { state: "", basis: "" },
      filingDestination: { state: "", basis: "" }, feeAndWaiverInstructions: { state: "", basis: "" },
      copyRequirements: { state: "", basis: "" }, postFilingSteps: { state: "", basis: "" },
      hearingAndObjectionStopConditions: { state: "", basis: "" },
      customPleadingAuthority: { required: false, approved: false, authorityId: "" },
      filingFormatArtifact: { format: "", sha256: "", pageCount: 0 }
    },
    visualReview: { state: "", pagesReviewed: 0, pageCount: 0, evidenceSha256: "", reviewedBy: "", reviewedAt: "" },
    outputLegalApproval: { state: "", reviewerId: "", decidedAt: "", scopeSha256: "" },
    finalVerification: { state: "", verifierId: "", boundInputsSha256: "", verifiedAt: "" },
    history: [{ version: 0, changeKind: "", changedAt: "", changedBy: "", reason: "", recordSha256: "", supersedesRecordSha256: "" }]
  },
  observation: {
    observedAt: "", legalAuthority: { version: "", status: "", scopeSha256: "" },
    packetSpecificationSha256: "", officialSourceSha256ById: {},
    provider: { providerId: "", rendererKind: "", rendererVersion: "", imageDigest: "" },
    fixtureSha256: "", artifactSha256: "", visualReviewEvidenceSha256: "",
    outputLegalApprovalScopeSha256: "", finalVerificationBoundInputsSha256: ""
  },
  context: {
    participantUserId: "", matterId: "", matterOwnerUserId: "",
    finalVerification: {
      snapshotId: "", outcome: "", matterId: "", ownerUserId: "", boundRouteId: "",
      boundPacketFamilyId: "", routeContractVersion: "", legalRuleVersion: "",
      factSnapshotSha256: "", formSetVersion: "", formSetSha256: "", verifiedAt: "",
      invalidated: false, invalidationReason: ""
    },
    entitlement: { kind: "", idempotencyKey: "", alreadyConsumed: false, serverVerified: false },
    storage: { privateStorage: false, artifactSha256: "", repeatDownload: false }
  },
  decision: {
    state: "", authorized: false, commercialStatus: "", routeId: "", jurisdiction: "",
    packetFamilyId: "", serviceDisposition: "", recordId: "", recordVersion: 0,
    missingProof: [], stalenessReasons: [], revocationReason: "", reason: "",
    admissionPoint: "", admitted: false, denialCode: "", authority: {}, disposition: "",
    contextDenials: []
  }
} as const;

export const CLIENT_FORBIDDEN_AUTHORITY_KEYS = [
  "authorized",
  "authority",
  "state",
  "commercialStatus",
  "sellable",
  "creditConsumable",
  "deliverable",
  "gradeA",
  "completePacketProven",
  "fulfillmentRecord",
  "record",
  "observation",
  "missingProof",
  "stalenessReasons",
  "packetProven",
  "overrideAuthority",
  "skipAuthority"
] as const;

export type SanitizedAdmissionRequest = {
  identity: AdmissionRequestIdentity | null;
  /** Authority-bearing keys the caller tried to send. Non-empty means refuse. */
  rejectedKeys: string[];
  /** Non-authority keys that were simply not identity, for completeness in logs. */
  ignoredKeys: string[];
};

/**
 * Reduce an untrusted request body to route identity and nothing else.
 *
 * A client may say which route it is asking about. It may not say what is true
 * about that route. Everything outside `routeId`, `jurisdiction` and
 * `packetFamilyId` is dropped, and anything in the forbidden list is reported so
 * the caller can refuse rather than proceed on a sanitised body.
 */
export function sanitizeAdmissionRequest(body: unknown): SanitizedAdmissionRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { identity: null, rejectedKeys: [], ignoredKeys: [] };
  }

  const source = body as Record<string, unknown>;
  // Two sources, unioned: the explicit list of words that mean "let me through",
  // and every field name the authority itself reasons about. Neither alone is
  // enough — the explicit list knows about `overrideAuthority`, which appears in
  // no shape, and the derived set knows about every proof dimension, including
  // the ones added after this function was written.
  const forbidden = new Set<string>([...CLIENT_FORBIDDEN_AUTHORITY_KEYS, ...authorityVocabulary()]);
  const identity = new Set<string>(ADMISSION_IDENTITY_KEYS);
  const rejectedKeys: string[] = [];
  const ignoredKeys: string[] = [];

  for (const key of Object.keys(source)) {
    if (identity.has(key)) continue;
    if (forbidden.has(key)) rejectedKeys.push(key);
    else ignoredKeys.push(key);
  }

  const routeId = typeof source.routeId === "string" ? source.routeId.trim() : "";
  const jurisdiction = typeof source.jurisdiction === "string" ? source.jurisdiction.trim().toUpperCase() : "";
  const packetFamilyId = typeof source.packetFamilyId === "string" && source.packetFamilyId.trim()
    ? source.packetFamilyId.trim()
    : null;

  return {
    identity: routeId && jurisdiction ? { routeId, jurisdiction, packetFamilyId } : null,
    rejectedKeys: rejectedKeys.sort(),
    ignoredKeys: ignoredKeys.sort()
  };
}

/** The proof dimensions, in the order this authority reports them. */
export function requiredProofDimensions(): readonly string[] {
  return REQUIRED_PROOF_ORDER;
}

export function routeIdFor(jurisdiction: string, pathwayId: string): string {
  return `${String(jurisdiction).trim().toUpperCase()}:${String(pathwayId).trim()}`;
}
