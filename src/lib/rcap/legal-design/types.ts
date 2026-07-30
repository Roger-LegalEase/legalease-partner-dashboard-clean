// Legal-design memo intake.
//
// An attorney returns one memo per jurisdiction describing the relief tracks
// that jurisdiction should offer. This module defines what a memo must contain
// and, just as importantly, what it must not.
//
// Two rules shape everything here:
//
//   1. No attorney metadata. There is no reviewer identity, contact detail, bar
//      number, firm or signature anywhere in this schema, and the validator
//      actively rejects a memo that carries any. This is not a reviewer
//      database and must never become one.
//
//   2. Legal-design approval is not output approval. Counsel approving the
//      design of a track says the mechanism, venue and components are right. It
//      says nothing about the document the renderer actually produced. Those
//      are separate gates and `packet_ready` still needs both.

/** Counsel's decision about the legal design of a proposed track. */
export type LegalDesignStatus =
  | "legal_design_approved"
  | "legal_design_approved_with_limitations"
  | "legal_research_required"
  | "output_review_pending"
  | "legal_approved"
  | "legal_rejected";

export const LEGAL_DESIGN_STATUSES: readonly LegalDesignStatus[] = [
  "legal_design_approved",
  "legal_design_approved_with_limitations",
  "legal_research_required",
  "output_review_pending",
  "legal_approved",
  "legal_rejected"
];

/**
 * Statuses that permit implementation to begin. None of them permits
 * fulfillment: a track may be built against these and still cannot be served.
 */
export const IMPLEMENTABLE_DESIGN_STATUSES: readonly LegalDesignStatus[] = [
  "legal_design_approved",
  "legal_design_approved_with_limitations"
];

export type ProposedPacketComponent = {
  role: string;
  requirement: "required" | "conditional";
  conditionDescription?: string;
  outputStrategy: "custom_pleading" | "official_pdf_fill" | "process_guidance";
  /** Official form identity when the component is a form. */
  officialFormId?: string;
  officialSourceUrl?: string;
  notes?: string;
};

export type ProposedReliefTrack = {
  /** Stable across memo revisions. The implementation keys on this. */
  trackId: string;
  legalName: string;
  publicName: string;
  controllingAuthority: {
    citations: readonly string[];
    summary: string;
  };
  effectiveDates: {
    effectiveFrom: string;
    effectiveTo: string | null;
    /** The date counsel checked the authority. Drives staleness. */
    reviewedAsOf: string;
  };
  eligibleRecordTypes: readonly string[];
  eligibleDispositions: readonly string[];
  exclusions: readonly string[];
  waitingPeriods: readonly { condition: string; duration: string }[];
  outputStrategy: "custom_pleading" | "official_pdf_fill" | "process_guidance";
  geography: {
    scope: "statewide" | "county" | "circuit" | "district" | "court_specific" | "agency_specific";
    /** Normalized keys when narrower than statewide. Empty for statewide. */
    keys: readonly string[];
    venue: string;
  };
  destination: {
    kind: "court" | "agency" | "prosecutor" | "portal" | "automatic" | "clerk";
    name: string;
    detail: string;
  };
  components: readonly ProposedPacketComponent[];
  officialSources: readonly {
    title: string;
    url: string;
    retrievedOn: string;
    sha256?: string;
  }[];
  rules: {
    filing: string;
    fees: string;
    feeWaiver: string;
    notice: string;
    service: string;
  };
  /** When self-help must stop and a person needs a lawyer. */
  selfHelpStopConditions: readonly string[];
  /** Anything counsel could not resolve. Empty array is a valid answer. */
  unresolvedQuestions: readonly string[];
  legalDesignDecision: {
    status: LegalDesignStatus;
    rationale: string;
    limitations: readonly string[];
  };
};

export type LegalDesignMemo = {
  schemaVersion: 1;
  jurisdiction: string;
  memoVersion: string;
  submittedAt: string;
  tracks: readonly ProposedReliefTrack[];
};

/**
 * Keys that must never appear anywhere in a memo, at any depth.
 *
 * The attorneys were explicit that they will not supply reviewer profiles, and
 * a schema that merely omits those fields would still accept them in an extra
 * property. The validator rejects on these instead, so the constraint is
 * enforced rather than assumed.
 */
export const FORBIDDEN_MEMO_KEYS: readonly string[] = [
  "attorney",
  "attorneyName",
  "attorneys",
  "reviewer",
  "reviewerName",
  "reviewedBy",
  "approvedBy",
  "signedBy",
  "signature",
  "barNumber",
  "barId",
  "licenseNumber",
  "firm",
  "firmName",
  "lawFirm",
  "email",
  "emailAddress",
  "phone",
  "phoneNumber",
  "telephone",
  "contact",
  "contactInfo",
  "address",
  "mailingAddress",
  "author",
  "authorName"
];

/** The fifteen things a proposed track must carry to be importable. */
export const REQUIRED_TRACK_FIELDS: readonly { key: string; label: string }[] = [
  { key: "trackId", label: "stable track ID" },
  { key: "names", label: "legal and public name" },
  { key: "controllingAuthority", label: "controlling authority" },
  { key: "effectiveDates", label: "effective dates" },
  { key: "eligibility", label: "eligible record and disposition types" },
  { key: "exclusionsAndWaitingPeriods", label: "exclusions and waiting periods" },
  { key: "outputStrategy", label: "output strategy" },
  { key: "geography", label: "geography and venue" },
  { key: "destination", label: "filing or process destination" },
  { key: "components", label: "packet or process components" },
  { key: "officialSources", label: "official sources" },
  { key: "rules", label: "filing, fee, notice and service rules" },
  { key: "selfHelpStopConditions", label: "self-help stop conditions" },
  { key: "unresolvedQuestions", label: "unresolved questions" },
  { key: "legalDesignDecision", label: "legal-design decision" }
];
