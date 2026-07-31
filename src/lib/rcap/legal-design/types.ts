// Legal-design memo intake.
//
// An attorney returns one memo per jurisdiction describing the relief tracks
// that jurisdiction should offer. This module defines what a memo must contain
// and, just as importantly, what it must not.
//
// Three rules shape everything here:
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
//
//   3. LegalEase is a self-help packet generator, not a legal-review,
//      record-verification, document-collection or eligibility-determination
//      service. The court, clerk, prosecutor or agency is the authority.
//      LegalEase asks structured questions, relies on the answers, generates
//      the applicable packet, names the documents the participant may need to
//      obtain and attach, and gives filing instructions. It does not require,
//      accept, inspect or authenticate third-party records, does not
//      independently determine eligibility, does not judge whether a
//      participant's evidence is sufficient, does not approve an individual
//      filing, and does not guarantee court or agency action.
//
// Rule 3 is why this schema separates a *generation requirement* — something
// LegalEase needs in order to produce the correct forms — from a *participant
// filing requirement*, which is something the court or agency wants from the
// participant and which LegalEase never holds.

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

// ---------------------------------------------------------------------------
// Limitations
// ---------------------------------------------------------------------------

/**
 * What a limitation actually constrains.
 *
 * Almost everything counsel writes under "limitations" is not a reason to
 * withhold a packet. It is text that belongs *in* the packet, a question to ask
 * the participant first, a narrowing of who the track is offered to, a field
 * the participant completes by hand, or the point where automated help stops.
 *
 * Only `legal_design_blocker` withholds anything, and only for the reasons
 * enumerated in `UndeterminedDesignElement`.
 */
export type LimitationClassification =
  | "packet_instruction"
  | "participant_question"
  | "required_before_filing"
  | "scope_restriction"
  | "manual_completion_item"
  | "post_generation_handoff"
  | "self_help_boundary"
  | "legal_design_blocker";

export const LIMITATION_CLASSIFICATIONS: readonly LimitationClassification[] = [
  "packet_instruction",
  "participant_question",
  "required_before_filing",
  "scope_restriction",
  "manual_completion_item",
  "post_generation_handoff",
  "self_help_boundary",
  "legal_design_blocker"
];

export const LIMITATION_CLASSIFICATION_MEANINGS: Readonly<Record<LimitationClassification, string>> = {
  packet_instruction:
    "Text the generated packet must carry — a filing step, a document to obtain and attach, a fee, a deadline, a warning.",
  participant_question:
    "Something LegalEase must ask before generating, so the answer selects or fills the right output.",
  required_before_filing:
    "The packet generates now; the participant obtains or attaches the item before filing or submission.",
  scope_restriction: "A narrowing of who or where the track is offered to. The track still generates within that scope.",
  manual_completion_item:
    "A field the packet deliberately leaves blank for the participant to complete, sign, date or notarize.",
  post_generation_handoff:
    "The initial packet generates. Self-help stops only when an actual event requires individualized advocacy — opposition, a contested or evidentiary hearing, disputed material facts, an appeal. A routine or automatically scheduled hearing is not by itself a blocker.",
  self_help_boundary: "The point at which LegalEase's automated assistance ends and a person needs a lawyer.",
  legal_design_blocker:
    "Counsel has not determined an element of the design itself. The track cannot be built until they do."
};

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/**
 * Where a classification came from.
 *
 * Recorded on every limitation and every unresolved question so that a reader
 * can tell counsel's conclusion from the normalizer's restructuring of it. The
 * distinction is the whole safeguard: an operator's reading must never wear
 * counsel's approval.
 */
export type ClassificationBasis =
  /** The state's controlling addendum says so. */
  | "explicit_state_addendum"
  /** The Batch 1 Amendment Decision Matrix says so. */
  | "batch_decision_matrix"
  /** The general Packet-Only Product Model Amendment says so. */
  | "general_packet_only_rule"
  /** Restructuring of a conclusion expressly stated in the controlling materials. */
  | "mechanical_translation"
  /** The source does not clearly support a classification. Counsel must answer. */
  | "counsel_confirmation_required";

export const CLASSIFICATION_BASES: readonly ClassificationBasis[] = [
  "explicit_state_addendum",
  "batch_decision_matrix",
  "general_packet_only_rule",
  "mechanical_translation",
  "counsel_confirmation_required"
];

/** Bases that assert counsel decided this. A normalizer reading may not claim one. */
export const COUNSEL_AUTHORED_BASES: readonly ClassificationBasis[] = [
  "explicit_state_addendum",
  "batch_decision_matrix",
  "general_packet_only_rule"
];

export type ClassificationProvenance = {
  classificationBasis: ClassificationBasis;
  /** The controlling file the statement was read from. */
  sourceFile: string;
  /** The heading it sat under, so a reader can find it. */
  sourceHeading: string;
  /** Counsel's words, preserved exactly. Never paraphrased. */
  sourceStatement: string;
  /**
   * True only for mechanical restructuring of an expressly stated conclusion.
   * Never a way to supply missing law: the validator refuses this flag
   * alongside a basis that asserts counsel decided the point.
   */
  normalizerInferred?: boolean;
  /** The exact question counsel must answer. Required when the basis is counsel_confirmation_required. */
  counselQuestion?: string;
};

/**
 * What part of the design an open legal question bears on.
 *
 * The first five are the elements that decide whether a track can be built at
 * all. The remaining seven are things a track can be built around but not
 * released without — the eligibility branch, the waiting period, which
 * components go in the packet, how it is filed, who gets notice, what the
 * participant is told to do, and what legal effect or warning the packet
 * asserts.
 *
 * A `legal_design_blocker` limitation must name one of these. That requirement
 * is what keeps "the participant needs a certified disposition" out of the
 * classification: obtaining a third-party record is a participant filing
 * requirement, not an element of the design.
 */
export type AffectedElement =
  | "governing_mechanism"
  | "correct_form"
  | "output_strategy"
  | "venue"
  | "geographic_scope"
  | "eligibility_branch"
  | "waiting_period"
  | "packet_components"
  | "filing_process"
  | "notice_or_service"
  | "participant_instructions"
  | "legal_effect_or_warning";

export const AFFECTED_ELEMENTS: readonly AffectedElement[] = [
  "governing_mechanism",
  "correct_form",
  "output_strategy",
  "venue",
  "geographic_scope",
  "eligibility_branch",
  "waiting_period",
  "packet_components",
  "filing_process",
  "notice_or_service",
  "participant_instructions",
  "legal_effect_or_warning"
];

/** Retained name for the five build-deciding elements. */
export type UndeterminedDesignElement = AffectedElement;
export const UNDETERMINED_DESIGN_ELEMENTS: readonly AffectedElement[] = AFFECTED_ELEMENTS;

// ---------------------------------------------------------------------------
// Unresolved questions
// ---------------------------------------------------------------------------

/**
 * What an open legal question costs.
 *
 * An unresolved question is never merely a note to be filed away. It either
 * stops us knowing what to build, stops us shipping what we built, or is
 * genuinely research that can run alongside. Counsel says which.
 *
 * The distinction matters because every track is `runtime_disabled` today. If
 * open questions were only recorded as prose, they would vanish the moment
 * runtime enablement arrived, having never been anyone's job to close.
 */
export type UnresolvedQuestionImpact =
  | "build_blocker"
  | "release_blocker"
  | "nonblocking_research_note"
  | "counsel_classification_required";

export const UNRESOLVED_QUESTION_IMPACTS: readonly UnresolvedQuestionImpact[] = [
  "build_blocker",
  "release_blocker",
  "nonblocking_research_note",
  "counsel_classification_required"
];

export const UNRESOLVED_QUESTION_IMPACT_MEANINGS: Readonly<Record<UnresolvedQuestionImpact, string>> = {
  build_blocker:
    "The answer changes what packet or route must be built. Nothing is built until it closes.",
  release_blocker:
    "The packet identity is known, but the track cannot safely launch until a source, timing, fee, service, instruction or warning is confirmed.",
  nonblocking_research_note:
    "The answer affects neither packet selection, content, geography, filing instructions, warnings nor release. Still owed an answer.",
  counsel_classification_required:
    "The impact is not clear from the controlling materials. Returned to counsel to classify rather than guessed at. Treated as release-blocking until they answer, which withholds the track without asserting why."
};

export type UnresolvedQuestion = {
  question: string;
  impact: UnresolvedQuestionImpact;
  /** Which part of the design the question bears on. */
  affectedElement: AffectedElement;
  /** Where the question and its impact came from. */
  provenance: ClassificationProvenance;
};

/**
 * Impacts that withhold release.
 *
 * `counsel_classification_required` is here because failing closed is the only
 * safe direction when nobody has said what a question costs. Declining to ship
 * asserts nothing about the law; shipping would.
 */
export const RELEASE_WITHHOLDING_IMPACTS: readonly UnresolvedQuestionImpact[] = [
  "release_blocker",
  "counsel_classification_required"
];

/**
 * Whether counsel settled the output strategy, and on what footing.
 *
 * `unresolved` exists so that "counsel has not decided" can be said without
 * inventing a renderer strategy to say it with. It is a *status about* the
 * strategy, never a strategy: nothing renders from it, the resolver never sees
 * it, and a track carrying it is deferred and unreachable.
 */
/**
 * One stage of a staged route.
 *
 * Counsel sometimes settles a route whose first step is guidance and whose
 * second step is a real packet — Arkansas AR-7 through AR-11, Colorado CO-5,
 * Hawaii HI-2 through HI-8. Composing that from component ordering alone loses
 * the fact that the stages are sequential and independently gated, which is the
 * thing counsel actually decided.
 *
 * A stage's `outputStrategy` is one of the three renderer strategies, or is
 * omitted where counsel left that branch unresolved. An omitted stage strategy
 * makes the stage unavailable; it never makes the whole track unresolved, and a
 * concrete strategy is never invented to fill it.
 */
export type TrackStage = {
  stage: number;
  label: string;
  /** Omitted only where counsel left this branch's vehicle unresolved. */
  outputStrategy?: "custom_pleading" | "official_pdf_fill" | "process_guidance";
  outputStrategyStatus?: OutputStrategyStatus;
  /** What this stage produces or explains. */
  description: string;
  /** False while a blocker keeps the stage from being offered. */
  available: boolean;
  /** Why the stage is unavailable, when it is. */
  unavailableReason?: string;
};

export type OutputStrategyStatus = "resolved" | "provisional" | "unresolved";

export const OUTPUT_STRATEGY_STATUSES: readonly OutputStrategyStatus[] = [
  "resolved",
  "provisional",
  "unresolved"
];

export type LegalDesignLimitation = {
  classification: LimitationClassification;
  /** What counsel said, in their words. Preserved exactly, never paraphrased. */
  statement: string;
  /** Required when, and only when, classification is `legal_design_blocker`. */
  undeterminedElement?: AffectedElement;
  /** Where this classification came from. Required on every limitation. */
  provenance: ClassificationProvenance;
};

// ---------------------------------------------------------------------------
// The four kinds of requirement, kept apart
// ---------------------------------------------------------------------------

/**
 * A generation requirement: a fact LegalEase asks the participant for, whose
 * answer drives which forms are produced and what goes on them.
 *
 * This is an *answer*, never a record. "What was the disposition of the case?"
 * is a participant input. The certified disposition itself is a
 * `SupportingDocument`.
 */
export type ParticipantInput = {
  /** Stable key the generator reads. */
  key: string;
  /** The question as the participant would be asked it. */
  question: string;
  requirement: "required" | "conditional";
  conditionDescription?: string;
};

/**
 * A participant filing requirement: a record the participant may need to obtain
 * and attach.
 *
 * LegalEase names it and says where it comes from. LegalEase does not require
 * it before generating, does not accept it as an upload, does not inspect or
 * authenticate it, and does not judge whether it is sufficient.
 */
export type SupportingDocument = {
  name: string;
  /** The court, clerk, agency or repository that issues it. */
  obtainedFrom: string;
  requirement: "required" | "conditional";
  conditionDescription?: string;
  /** True when the court or agency wants it with the filing. */
  requiredBeforeFiling: boolean;
  /** What the participant does to get it. Becomes packet instruction text. */
  howToObtain: string;
  /**
   * The `ParticipantInput.key` this record corroborates, when it corroborates
   * one.
   *
   * We generate from the participant's answer and never see the record. So
   * where the record is the authoritative version of something they told us,
   * the packet tells them to check their answer against it once they have it.
   * That is the participant verifying their own answer — not us verifying it,
   * and not a gate on generating.
   */
  confirms?: string;
};

// ---------------------------------------------------------------------------
// Why a track is process guidance
// ---------------------------------------------------------------------------

/**
 * Counsel's reason for choosing `process_guidance` over a generated packet.
 *
 * The split matters. The first five reasons are all forms of "something outside
 * LegalEase has to happen" — and none of them, on its own, means we cannot
 * prepare the participant's portion of a form and tell them how to get the rest.
 * The last four are reasons no packet is the right answer at all.
 *
 * Tracks whose reasons are entirely in the first group go to a legal re-review
 * queue that asks counsel the question. Nothing is reclassified without them.
 */
export type GuidanceRationale =
  // Re-reviewable: an external dependency, not an absence of a filing.
  | "third_party_signature"
  | "agency_certification"
  | "participant_obtains_record"
  | "certificate_attached_later"
  | "another_entity_decides"
  // Preserved: guidance is genuinely the right output.
  | "requires_negotiation"
  | "individualized_advocacy"
  | "contested_evidentiary_showing"
  | "no_participant_filing_exists";

export const GUIDANCE_RATIONALES: readonly GuidanceRationale[] = [
  "third_party_signature",
  "agency_certification",
  "participant_obtains_record",
  "certificate_attached_later",
  "another_entity_decides",
  "requires_negotiation",
  "individualized_advocacy",
  "contested_evidentiary_showing",
  "no_participant_filing_exists"
];

/** Reasons that are an external dependency rather than an absence of a filing. */
export const REREVIEWABLE_GUIDANCE_RATIONALES: readonly GuidanceRationale[] = [
  "third_party_signature",
  "agency_certification",
  "participant_obtains_record",
  "certificate_attached_later",
  "another_entity_decides"
];

/** Reasons that keep a track on process guidance. */
export const PRESERVED_GUIDANCE_RATIONALES: readonly GuidanceRationale[] = [
  "requires_negotiation",
  "individualized_advocacy",
  "contested_evidentiary_showing",
  "no_participant_filing_exists"
];

/** The one question the re-review queue asks counsel. Asked, never answered here. */
export const GUIDANCE_REREVIEW_QUESTION =
  "Can LegalEase prepare the participant-facing portion of the form or packet, leave external sections incomplete, and instruct the participant how to obtain the required signature, certificate, or document?";

/** Something the generated packet deliberately leaves for the participant. */
export type ManualCompletionItem = {
  item: string;
  /** Which component and where on it. */
  whereInPacket: string;
  why: string;
};

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
  /**
   * One of the three approved strategies, or omitted entirely.
   *
   * Omitted is only legal on a `legal_research_required` track whose
   * `outputStrategyStatus` is `unresolved`. There is no fourth strategy and no
   * "unknown" member: naming one would make it addressable by the renderer and
   * the resolver, which is the opposite of what an unresolved strategy means.
   * A deferred track is absent from runtime resolution, so it has nothing to
   * name.
   *
   * A concrete strategy must never stand in for "unknown". `process_guidance`
   * in particular is a substantive conclusion — it says the relief is not a
   * participant filing — and is not a placeholder.
   */
  outputStrategy?: "custom_pleading" | "official_pdf_fill" | "process_guidance" | "staged";
  /**
   * Whether counsel settled the output strategy.
   *
   * `resolved` is the default and requires `outputStrategy`.
   * `provisional` requires `outputStrategy` and is legal only where the
   * controlling legal source expressly authorises the provisional
   * classification, as the Idaho addendum did for ID-3 and ID-4.
   * `unresolved` forbids `outputStrategy` and forces deferral.
   */
  outputStrategyStatus?: OutputStrategyStatus;
  /** Whether the packet counsel would produce is identified. */
  packetIdentity?: "identified" | "unresolved";
  /**
   * The ordered stages of a `staged` route. Required when, and only when,
   * `outputStrategy` is `staged`.
   *
   * Each stage carries one of the three renderer strategies, or omits it when
   * counsel left that branch unresolved. `staged` is never itself rendered:
   * `renderableStrategyFor` resolves a track to the concrete strategy of the
   * stage being produced, and the verifier proves no renderer or resolver path
   * receives `staged`.
   */
  stages?: readonly TrackStage[];
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
  /** What LegalEase asks. Empty array is a valid answer for a guidance track. */
  participantInputs: readonly ParticipantInput[];
  /** What the participant obtains and attaches. Never a generation gate. */
  supportingDocuments: readonly SupportingDocument[];
  /** What the packet leaves blank on purpose. Empty array is valid. */
  manualCompletionItems: readonly ManualCompletionItem[];
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
    /**
     * Who among the participants must sign, and whether it must be a wet
     * signature. Named `participantSignature` rather than `signature` because a
     * bare `signature` key is reserved: the validator rejects it everywhere as
     * attorney metadata, and that guard is worth more than the shorter name.
     */
    participantSignature: string;
    /** Whether anything must be notarized, and which component. */
    notarization: string;
  };
  /**
   * Why this track is process guidance rather than a generated packet.
   *
   * Required when `outputStrategy` is `process_guidance`, absent otherwise. At
   * least one rationale; a track may have several.
   */
  guidanceRationales?: readonly GuidanceRationale[];
  /** When self-help must stop and a person needs a lawyer. */
  selfHelpStopConditions: readonly string[];
  /** Anything counsel could not resolve. Empty array is a valid answer. */
  unresolvedQuestions: readonly UnresolvedQuestion[];
  legalDesignDecision: {
    status: LegalDesignStatus;
    rationale: string;
    limitations: readonly LegalDesignLimitation[];
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

/**
 * Keys that must never appear anywhere in a memo because they describe a
 * fulfillment model LegalEase does not operate.
 *
 * LegalEase takes no uploads of third-party records, runs no document review,
 * and has no staff-approval step between a participant and their packet. A memo
 * that assumes one is rejected rather than quietly reinterpreted.
 */
export const FORBIDDEN_FULFILLMENT_KEYS: readonly string[] = [
  "documentUpload",
  "uploadRequired",
  "requiredUploads",
  "documentReview",
  "reviewQueue",
  "staffApproval",
  "staffReview",
  "manualApproval",
  "operatorApproval",
  "eligibilityDetermination",
  "verifyRecords",
  "recordVerification",
  "filingComplete",
  "filing_complete"
];

/** The eighteen things a proposed track must carry to be importable. */
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
  { key: "participantInputs", label: "questions LegalEase asks the participant" },
  { key: "supportingDocuments", label: "documents the participant obtains and attaches" },
  { key: "manualCompletionItems", label: "items the participant completes by hand" },
  { key: "officialSources", label: "official sources" },
  { key: "rules", label: "filing, fee, notice, service, signature and notarization rules" },
  { key: "selfHelpStopConditions", label: "self-help stop conditions" },
  { key: "unresolvedQuestions", label: "unresolved questions" },
  { key: "legalDesignDecision", label: "legal-design decision" }
];
