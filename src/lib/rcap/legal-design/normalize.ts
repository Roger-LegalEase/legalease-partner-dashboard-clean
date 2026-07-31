// Normalizes a validated legal-design memo into implementation artifacts.
//
// Two rules govern this module.
//
// First, `legalStatusFor`: counsel approving a track's legal DESIGN never yields
// `legal_approved`. Design approval says the mechanism, venue and components are
// right. It says nothing about the document the renderer produced, which is a
// separate review of a separate artifact. So an imported track lands at
// `legal_review_pending` at best, and because `computeRuntimeStatus` requires
// legal approval plus visual approval plus technical proof plus a current source
// plus runtime enablement, an imported track is `runtime_disabled` no matter how
// emphatic the memo is.
//
// Second, `splitRequirements`: LegalEase is a self-help packet generator. The
// court, clerk, prosecutor or agency is the authority. So the things a memo
// records are sorted into five kinds that behave differently:
//
//   generation requirement       what LegalEase must ask before it can produce
//                                the correct forms. An unanswered question is
//                                the only participant-side reason not to
//                                generate.
//   participant filing           what the court or agency wants from the
//   requirement                  participant — a certified disposition, a
//                                criminal history, fingerprints, a fee, service
//                                on the prosecutor. LegalEase names these and
//                                says where they come from. It never requires,
//                                accepts, inspects or authenticates them, and
//                                they never delay generation.
//   manual completion item       a field the packet leaves blank on purpose.
//   self-help boundary           where automated assistance ends.
//   legal-design blocker         counsel has not determined the mechanism, the
//                                form, the venue, the geographic scope or the
//                                output strategy. This is the only one of the
//                                five that stops a track being built.
//
// A track can therefore be entirely buildable — and, once the other gates pass,
// reach `packet_ready` — while the participant still has records to obtain,
// fields to complete, a signature to give, a notary to visit, a fee to pay and
// parties to serve. Those are things they do after we hand them the packet.

import {
  IMPLEMENTABLE_DESIGN_STATUSES,
  PRESERVED_GUIDANCE_RATIONALES,
  REREVIEWABLE_GUIDANCE_RATIONALES,
  type AffectedElement,
  type ClassificationProvenance,
  type GuidanceRationale,
  type LegalDesignLimitation,
  type LegalDesignMemo,
  type LegalDesignStatus,
  type ManualCompletionItem,
  type ParticipantInput,
  type ProposedReliefTrack,
  type SupportingDocument,
  type UnresolvedQuestion
} from "@/lib/rcap/legal-design/types";
import {
  computeRuntimeStatus,
  type GeographicScope,
  type LegalStatus,
  type OutputStrategy,
  type RuntimeStatus
} from "@/lib/rcap/packets/types";

export type ImplementationStrategyQueue =
  | "A_official_pdf_acroform"
  | "B_official_pdf_overlay"
  | "C_custom_pleading"
  | "D_staged_or_process_guidance"
  | "E_local_variant"
  | "F_source_problem";

export type NormalizedComponent = {
  componentId: string;
  role: string;
  requirement: "required" | "conditional";
  conditionDescription: string | null;
  outputStrategy: OutputStrategy;
  officialFormId: string | null;
  officialSourceUrl: string | null;
  order: number;
};

/**
 * Something the participant does, after LegalEase has handed them the packet.
 *
 * None of these is a fulfillment step for LegalEase. They are printed in the
 * packet's instructions and that is the whole of our involvement.
 */
export type ParticipantAction = {
  kind:
    | "obtain_document"
    | "answer_question"
    | "confirm_answer"
    | "complete_field"
    | "sign"
    | "notarize"
    | "pay_fee"
    | "apply_fee_waiver"
    | "serve_party"
    | "file";
  description: string;
  /** Where it comes from, for `obtain_document`. */
  obtainedFrom?: string;
  requirement: "required" | "conditional";
  conditionDescription?: string;
  /** True when it must happen before the participant files. */
  requiredBeforeFiling: boolean;
};

/**
 * Why a track cannot be built yet.
 *
 * `legal_design_blocker` is counsel's undetermined design. The remaining kinds
 * are the platform's own gates and were already required before this change;
 * they are labelled here so that a reader can tell a legal question from an
 * engineering one without parsing prose.
 */
export type TrackBlockerKind =
  | "legal_design_blocker"
  | "release_blocker"
  | "output_review_gate"
  | "visual_review_gate"
  | "technical_proof_gate"
  | "source_gate";

export type TrackBlocker = {
  kind: TrackBlockerKind;
  statement: string;
};

export type NormalizedTrack = {
  jurisdiction: string;
  trackId: string;
  legalName: string;
  publicName: string;
  mechanism: string;
  authority: readonly string[];
  reviewedAsOf: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  exclusions: readonly string[];
  waitingPeriods: readonly { condition: string; duration: string }[];
  outputStrategy: OutputStrategy;
  geographicScope: GeographicScope;
  geographyKeys: readonly string[];
  venue: string;
  destination: { kind: string; name: string; detail: string };
  packetSet: {
    packetSetId: string;
    version: string;
    components: readonly NormalizedComponent[];
    /** Everything the participant must do. Never a fulfillment step for us. */
    participantActionRequired: readonly ParticipantAction[];
    /** The subset that must happen before the filing goes in. */
    requiredBeforeFiling: readonly string[];
  };
  officialSources: readonly { title: string; url: string; retrievedOn: string; sha256: string | null }[];
  rules: ProposedReliefTrack["rules"];
  /** The questions LegalEase asks. Answers drive generation. */
  generationRequirements: readonly ParticipantInput[];
  /** Records the participant obtains and attaches. Never a generation gate. */
  participantFilingRequirements: readonly SupportingDocument[];
  manualCompletionItems: readonly ManualCompletionItem[];
  selfHelpBoundaries: readonly string[];
  /** Limitation text that belongs in the generated packet. */
  packetInstructions: readonly string[];
  /** Limitation text that becomes a question asked before generating. */
  participantQuestions: readonly string[];
  /** Limitation text that narrows who or where the track is offered to. */
  scopeRestrictions: readonly string[];
  /** Open questions that stop us knowing what to implement. */
  buildBlockers: readonly UnresolvedQuestion[];
  /** Open questions that permit the build but forbid packet_ready. */
  releaseBlockers: readonly UnresolvedQuestion[];
  /** Open questions whose impact counsel has not classified. Withhold release. */
  awaitingCounselClassification: readonly UnresolvedQuestion[];
  /** Where the packet generates but assistance ends at a contested event. */
  postGenerationHandoffs: readonly string[];
  /** True when anything on this track is waiting on counsel to answer. */
  counselConfirmationRequired: boolean;
  /** The exact questions counsel is being asked. */
  counselQuestions: readonly string[];
  /** Open questions that block neither, and are still owed an answer. */
  openLegalQuestions: readonly UnresolvedQuestion[];
  selfHelpStopConditions: readonly string[];
  unresolvedQuestions: readonly UnresolvedQuestion[];
  guidanceRationales: readonly GuidanceRationale[];
  /**
   * True when this is a guidance track whose every stated reason is an external
   * dependency. Counsel is asked whether a partial packet would serve; nothing
   * is reclassified here.
   */
  guidanceRereviewCandidate: boolean;
  legalDesignStatus: LegalDesignStatus;
  legalDesignLimitations: readonly LegalDesignLimitation[];
  /** Derived. Design approval never yields legal_approved. */
  legalStatus: LegalStatus;
  /** Always runtime_disabled on import. Recorded so the reason is legible. */
  runtimeDisabledReason: string;
  implementationQueue: ImplementationStrategyQueue;
  /** Only counsel's undetermined design elements. */
  legalDesignBlockers: readonly string[];
  /** Everything holding the track back, typed. */
  blockers: readonly TrackBlocker[];
};

/**
 * A track counsel marked `legal_research_required`.
 *
 * Deferred is not missing. Counsel has not identified the governing mechanism,
 * whether the route exists, the correct output strategy, or the legally
 * accepted filing vehicle — so there is nothing to build, and inventing a
 * strategy to make the record importable would be the exact failure this
 * pipeline exists to prevent.
 *
 * The track keeps everything counsel did establish, stays visible in the
 * legal-research queue and the final reconciliation, and is absent from every
 * runtime artifact: no registry record, no packet-set manifest, no
 * specification, no implementation batch. It is unreachable rather than
 * disabled, because it was never registered.
 */
export type DeferredTrack = {
  jurisdiction: string;
  trackId: string;
  publicName: string;
  legalDesignStatus: LegalDesignStatus;
  legalDesignRationale: string;
  authority: readonly string[];
  mechanism: string;
  destination: { kind: string; name: string; detail: string };
  unresolvedQuestions: readonly UnresolvedQuestion[];
  /** Why counsel could not settle the design, in their words. */
  deferralReasons: readonly { statement: string; affectedElement: AffectedElement }[];
  /** What must be researched before the track can be built. */
  requiredLegalResearch: readonly string[];
  provenance: readonly ClassificationProvenance[];
};

export type NormalizedMemo = {
  jurisdiction: string;
  memoVersion: string;
  submittedAt: string;
  tracks: readonly NormalizedTrack[];
  /** Tracks counsel returned that are not yet implementable. */
  deferredTrackIds: readonly string[];
  /** The same tracks, with everything counsel did establish preserved. */
  deferredTracks: readonly DeferredTrack[];
};

export type TrackSourceRelationship = {
  jurisdiction: string;
  trackId: string;
  componentId: string;
  officialFormId: string | null;
  officialSourceUrl: string | null;
  sha256: string | null;
  /** Whether the named source is present in the local corpus. */
  corpusState: "unchecked" | "present" | "missing";
};

/**
 * Maps counsel's design decision onto the track's legal status.
 *
 * The whole point of this function is that the first two cases do NOT return
 * `legal_approved`.
 */
export function legalStatusFor(status: LegalDesignStatus): LegalStatus {
  switch (status) {
    case "legal_design_approved":
    case "legal_design_approved_with_limitations":
    case "output_review_pending":
      // Design is settled; the produced document has not been reviewed.
      return "legal_review_pending";
    case "legal_approved":
      // Counsel has approved the completed output, not merely the design.
      return "legal_approved";
    case "legal_rejected":
      return "legal_rejected";
    case "legal_research_required":
      return "not_submitted";
  }
}

export function normalizeMemo(memo: LegalDesignMemo): NormalizedMemo {
  const tracks: NormalizedTrack[] = [];
  const deferred: DeferredTrack[] = [];

  for (const track of memo.tracks) {
    if (!IMPLEMENTABLE_DESIGN_STATUSES.includes(track.legalDesignDecision.status)) {
      deferred.push(deferTrack(memo.jurisdiction, track));
      continue;
    }
    tracks.push(normalizeTrack(memo.jurisdiction, track));
  }

  return {
    jurisdiction: memo.jurisdiction,
    memoVersion: memo.memoVersion,
    submittedAt: memo.submittedAt,
    tracks,
    deferredTrackIds: deferred.map((entry) => entry.trackId),
    deferredTracks: deferred
  };
}

/** Preserves what counsel established on a track that cannot yet be built. */
function deferTrack(jurisdiction: string, track: ProposedReliefTrack): DeferredTrack {
  const blockers = track.legalDesignDecision.limitations.filter(
    (limitation) => limitation.classification === "legal_design_blocker"
  );

  return {
    jurisdiction,
    trackId: track.trackId,
    publicName: track.publicName,
    legalDesignStatus: track.legalDesignDecision.status,
    legalDesignRationale: track.legalDesignDecision.rationale,
    authority: track.controllingAuthority.citations,
    mechanism: track.controllingAuthority.summary,
    destination: track.destination,
    unresolvedQuestions: track.unresolvedQuestions,
    deferralReasons: blockers.map((limitation) => ({
      statement: limitation.statement,
      // A blocker always names its element; the validator refuses one without.
      affectedElement: limitation.undeterminedElement ?? "governing_mechanism"
    })),
    requiredLegalResearch: track.unresolvedQuestions
      .filter((question) => question.impact === "build_blocker")
      .map((question) => question.question),
    provenance: [
      ...blockers.map((limitation) => limitation.provenance),
      ...track.unresolvedQuestions.map((question) => question.provenance)
    ]
  };
}

/** Sorts counsel's open questions by what each one costs. */
export function splitUnresolvedQuestions(track: ProposedReliefTrack): {
  buildBlockers: UnresolvedQuestion[];
  releaseBlockers: UnresolvedQuestion[];
  researchNotes: UnresolvedQuestion[];
  awaitingCounselClassification: UnresolvedQuestion[];
} {
  const buildBlockers: UnresolvedQuestion[] = [];
  const releaseBlockers: UnresolvedQuestion[] = [];
  const researchNotes: UnresolvedQuestion[] = [];
  const awaitingCounselClassification: UnresolvedQuestion[] = [];

  for (const question of track.unresolvedQuestions) {
    switch (question.impact) {
      case "build_blocker":
        buildBlockers.push(question);
        break;
      case "release_blocker":
        releaseBlockers.push(question);
        break;
      case "nonblocking_research_note":
        researchNotes.push(question);
        break;
      case "counsel_classification_required":
        // Nobody has said what this costs. It withholds release, because
        // failing closed asserts nothing about the law and shipping would.
        awaitingCounselClassification.push(question);
        break;
    }
  }

  return { buildBlockers, releaseBlockers, researchNotes, awaitingCounselClassification };
}

/**
 * True when every reason counsel gave for choosing guidance is an external
 * dependency — someone else signs, an agency certifies, the participant fetches
 * a record, a certificate is attached later, another body decides.
 *
 * None of those, by itself, means we could not prepare the participant's part
 * of a form. A track with any preserved rationale (negotiation, individualized
 * advocacy, a contested evidentiary showing, or no filing existing at all) is
 * not a candidate, because guidance is then the right answer regardless.
 */
export function isGuidanceRereviewCandidate(track: ProposedReliefTrack): boolean {
  if (track.outputStrategy !== "process_guidance") return false;
  const rationales = track.guidanceRationales ?? [];
  if (rationales.length === 0) return false;
  if (rationales.some((rationale) => PRESERVED_GUIDANCE_RATIONALES.includes(rationale))) return false;
  return rationales.every((rationale) => REREVIEWABLE_GUIDANCE_RATIONALES.includes(rationale));
}

/** Sorts counsel's limitations into the five kinds, by their classification. */
export function splitRequirements(track: ProposedReliefTrack): {
  packetInstructions: string[];
  participantQuestions: string[];
  requiredBeforeFilingStatements: string[];
  scopeRestrictions: string[];
  manualCompletionStatements: string[];
  postGenerationHandoffs: string[];
  selfHelpBoundaries: string[];
  legalDesignBlockers: string[];
} {
  const packetInstructions: string[] = [];
  const participantQuestions: string[] = [];
  const requiredBeforeFilingStatements: string[] = [];
  const scopeRestrictions: string[] = [];
  const manualCompletionStatements: string[] = [];
  const postGenerationHandoffs: string[] = [];
  const selfHelpBoundaries: string[] = [];
  const legalDesignBlockers: string[] = [];

  for (const limitation of track.legalDesignDecision.limitations) {
    switch (limitation.classification) {
      case "packet_instruction":
        packetInstructions.push(limitation.statement);
        break;
      case "participant_question":
        participantQuestions.push(limitation.statement);
        break;
      case "required_before_filing":
        requiredBeforeFilingStatements.push(limitation.statement);
        break;
      case "scope_restriction":
        scopeRestrictions.push(limitation.statement);
        break;
      case "manual_completion_item":
        manualCompletionStatements.push(limitation.statement);
        break;
      case "post_generation_handoff":
        // The packet is generated. Assistance stops at an actual contested
        // event, which is a boundary on what happens next rather than a reason
        // to withhold the initial packet.
        postGenerationHandoffs.push(limitation.statement);
        break;
      case "self_help_boundary":
        selfHelpBoundaries.push(limitation.statement);
        break;
      case "legal_design_blocker":
        legalDesignBlockers.push(
          `${limitation.statement} (undetermined: ${limitation.undeterminedElement ?? "unspecified"})`
        );
        break;
    }
  }

  return {
    packetInstructions,
    participantQuestions,
    requiredBeforeFilingStatements,
    scopeRestrictions,
    manualCompletionStatements,
    postGenerationHandoffs,
    selfHelpBoundaries,
    legalDesignBlockers
  };
}

/**
 * Everything the participant does after we hand them the packet.
 *
 * Supporting documents lead, because that is the requirement most often
 * mistaken for a reason to withhold the packet. Signature, notarization, fees
 * and service follow from the rules counsel stated.
 */
export function participantActionsFor(track: ProposedReliefTrack): ParticipantAction[] {
  const actions: ParticipantAction[] = [];

  for (const document of track.supportingDocuments) {
    actions.push({
      kind: "obtain_document",
      description: `Obtain ${document.name}. ${document.howToObtain}`,
      obtainedFrom: document.obtainedFrom,
      requirement: document.requirement,
      ...(document.conditionDescription ? { conditionDescription: document.conditionDescription } : {}),
      requiredBeforeFiling: document.requiredBeforeFiling
    });

    // Where the record is the authoritative version of something the
    // participant told us, the packet asks them to check their own answer
    // against it. We generated from their answer and never see the record, so
    // this is the participant confirming their own facts — not us verifying
    // them, and not a reason to have withheld the packet.
    const confirmed = track.participantInputs.find((input) => input.key === document.confirms);
    if (confirmed) {
      actions.push({
        kind: "confirm_answer",
        description: `Check your answer to "${confirmed.question}" against ${document.name}, and correct the packet if they disagree.`,
        requirement: document.requirement,
        ...(document.conditionDescription ? { conditionDescription: document.conditionDescription } : {}),
        requiredBeforeFiling: true
      });
    }
  }

  for (const item of track.manualCompletionItems) {
    actions.push({
      kind: "complete_field",
      description: `${item.item} — ${item.whereInPacket}.`,
      requirement: "required",
      requiredBeforeFiling: true
    });
  }

  if (!isNone(track.rules.participantSignature)) {
    actions.push({
      kind: "sign",
      description: track.rules.participantSignature,
      requirement: "required",
      requiredBeforeFiling: true
    });
  }
  if (!isNone(track.rules.notarization)) {
    actions.push({
      kind: "notarize",
      description: track.rules.notarization,
      requirement: "required",
      requiredBeforeFiling: true
    });
  }
  if (!isNone(track.rules.fees)) {
    actions.push({
      kind: "pay_fee",
      description: track.rules.fees,
      requirement: "required",
      requiredBeforeFiling: true
    });
  }
  if (!isNone(track.rules.feeWaiver)) {
    actions.push({
      kind: "apply_fee_waiver",
      description: track.rules.feeWaiver,
      requirement: "conditional",
      conditionDescription: "Applies only when the participant cannot pay the filing fee.",
      requiredBeforeFiling: true
    });
  }
  if (!isNone(track.rules.service)) {
    actions.push({
      kind: "serve_party",
      description: track.rules.service,
      requirement: "required",
      // Service is ordinarily done at or after filing, not before it. Counsel's
      // filing rule is what says otherwise, and we do not infer that here.
      requiredBeforeFiling: false
    });
  }
  actions.push({
    kind: "file",
    description: track.rules.filing,
    requirement: "required",
    requiredBeforeFiling: false
  });

  return actions;
}

function normalizeTrack(jurisdiction: string, track: ProposedReliefTrack): NormalizedTrack {
  const components: NormalizedComponent[] = track.components.map((component, index) => ({
    componentId: `${track.trackId}-${slug(component.role)}-${index + 1}`,
    role: component.role,
    requirement: component.requirement,
    conditionDescription: component.conditionDescription ?? null,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId ?? null,
    officialSourceUrl: component.officialSourceUrl ?? null,
    order: index + 1
  }));

  const split = splitRequirements(track);
  const questions = splitUnresolvedQuestions(track);
  const participantActions = participantActionsFor(track);
  const blockers = deriveBlockers(track, components, split.legalDesignBlockers, questions);

  return {
    jurisdiction,
    trackId: track.trackId,
    legalName: track.legalName,
    publicName: track.publicName,
    mechanism: track.controllingAuthority.summary,
    authority: track.controllingAuthority.citations,
    reviewedAsOf: track.effectiveDates.reviewedAsOf,
    effectiveFrom: track.effectiveDates.effectiveFrom,
    effectiveTo: track.effectiveDates.effectiveTo,
    recordTypes: track.eligibleRecordTypes,
    dispositions: track.eligibleDispositions,
    exclusions: track.exclusions,
    waitingPeriods: track.waitingPeriods,
    outputStrategy: track.outputStrategy,
    geographicScope: track.geography.scope,
    geographyKeys: track.geography.keys,
    venue: track.geography.venue,
    destination: track.destination,
    packetSet: {
      packetSetId: `${track.trackId}-set`,
      version: "1.0.0",
      components,
      participantActionRequired: participantActions,
      requiredBeforeFiling: participantActions
        .filter((action) => action.requiredBeforeFiling)
        .map((action) => action.description)
    },
    officialSources: track.officialSources.map((source) => ({
      title: source.title,
      url: source.url,
      retrievedOn: source.retrievedOn,
      sha256: source.sha256 ?? null
    })),
    rules: track.rules,
    generationRequirements: track.participantInputs,
    participantFilingRequirements: track.supportingDocuments,
    manualCompletionItems: [
      ...track.manualCompletionItems,
      ...split.manualCompletionStatements.map((statement) => ({
        item: statement,
        whereInPacket: "Recorded by counsel as a limitation; place when the packet is drafted.",
        why: "Counsel classified this as an item the participant completes."
      }))
    ],
    selfHelpBoundaries: [
      ...track.selfHelpStopConditions,
      ...split.selfHelpBoundaries,
      ...split.postGenerationHandoffs
    ],
    postGenerationHandoffs: split.postGenerationHandoffs,
    packetInstructions: [...split.packetInstructions, ...split.requiredBeforeFilingStatements],
    participantQuestions: split.participantQuestions,
    scopeRestrictions: split.scopeRestrictions,
    buildBlockers: questions.buildBlockers,
    releaseBlockers: questions.releaseBlockers,
    awaitingCounselClassification: questions.awaitingCounselClassification,
    openLegalQuestions: questions.researchNotes,
    counselConfirmationRequired:
      questions.awaitingCounselClassification.length > 0 ||
      track.legalDesignDecision.limitations.some(
        (limitation) => limitation.provenance.classificationBasis === "counsel_confirmation_required"
      ) ||
      track.unresolvedQuestions.some(
        (question) => question.provenance.classificationBasis === "counsel_confirmation_required"
      ),
    counselQuestions: [
      ...track.legalDesignDecision.limitations,
      ...track.unresolvedQuestions
    ]
      .map((entry) => entry.provenance.counselQuestion)
      .filter((question): question is string => typeof question === "string" && question.length > 0),
    selfHelpStopConditions: track.selfHelpStopConditions,
    unresolvedQuestions: track.unresolvedQuestions,
    guidanceRationales: track.guidanceRationales ?? [],
    guidanceRereviewCandidate: isGuidanceRereviewCandidate(track),
    legalDesignStatus: track.legalDesignDecision.status,
    legalDesignLimitations: track.legalDesignDecision.limitations,
    legalStatus: legalStatusFor(track.legalDesignDecision.status),
    runtimeDisabledReason:
      "Imported from a legal-design memo. Output review, visual review and technical proof are all outstanding.",
    implementationQueue: queueFor(track),
    legalDesignBlockers: blockers
      .filter((blocker) => blocker.kind === "legal_design_blocker")
      .map((blocker) => blocker.statement),
    blockers
  };
}

/**
 * The runtime status an imported track would have if every platform gate passed.
 *
 * Exists so a release blocker is enforced rather than merely recorded: a track
 * with one open cannot reach `packet_ready` however green everything else is.
 */
export function readinessCeilingFor(track: NormalizedTrack): RuntimeStatus {
  return computeRuntimeStatus({
    statuses: {
      research: "research_draft_complete",
      technical: "technical_proof_passed",
      visual: "visual_review_passed",
      legal: "legal_approved"
    },
    sourceCurrent: true,
    runtimeDisabled: false,
    outputStrategy: track.outputStrategy,
    openReleaseBlockers: track.releaseBlockers.length + track.awaitingCounselClassification.length
  });
}

/** Assigns the implementation batch, narrowest problem first. */
export function queueFor(track: ProposedReliefTrack): ImplementationStrategyQueue {
  const missingHash = track.officialSources.some((source) => !source.sha256);
  const needsForm = track.components.some((component) => component.outputStrategy === "official_pdf_fill");

  if (needsForm && (track.officialSources.length === 0 || missingHash)) {
    return "F_source_problem";
  }
  if (["county", "circuit", "district", "court_specific"].includes(track.geography.scope)) {
    return "E_local_variant";
  }
  if (track.outputStrategy === "process_guidance") {
    return "D_staged_or_process_guidance";
  }
  if (track.outputStrategy === "custom_pleading") {
    return "C_custom_pleading";
  }
  // An official-form track whose sources carry hashes is a candidate for the
  // AcroForm batch; whether the form actually has usable fields is a corpus
  // question answered by the source registry, not by counsel.
  return "B_official_pdf_overlay";
}

/**
 * What is holding the track back.
 *
 * Note what is NOT here. A certified disposition the participant has to obtain,
 * a fee they have to pay, a signature, a notarization, a party they have to
 * serve — none of those appears, because none of them prevents LegalEase from
 * generating the correct forms and instructions. They are printed in the packet
 * as things to do before filing.
 */
function deriveBlockers(
  track: ProposedReliefTrack,
  components: readonly NormalizedComponent[],
  legalDesignBlockers: readonly string[],
  questions: {
    buildBlockers: readonly UnresolvedQuestion[];
    releaseBlockers: readonly UnresolvedQuestion[];
    awaitingCounselClassification: readonly UnresolvedQuestion[];
  }
): readonly TrackBlocker[] {
  const blockers: TrackBlocker[] = [
    {
      kind: "output_review_gate",
      statement: "Output review pending: counsel approved the design, not the produced document."
    },
    { kind: "visual_review_gate", statement: "Visual review not started." },
    { kind: "technical_proof_gate", statement: "Technical proof not started." }
  ];

  for (const statement of legalDesignBlockers) {
    blockers.push({ kind: "legal_design_blocker", statement: `Design undetermined: ${statement}` });
  }

  // An open question counsel called a build blocker means we do not know what
  // to implement. That is the same condition as an undetermined design element,
  // and it is recorded as one.
  for (const question of questions.buildBlockers) {
    blockers.push({
      kind: "legal_design_blocker",
      statement: `Open question blocks the build (${question.affectedElement}): ${question.question}`
    });
  }

  // A release blocker permits the build and forbids the ship. It is carried
  // separately so it survives runtime enablement instead of expiring with it.
  for (const question of questions.releaseBlockers) {
    blockers.push({
      kind: "release_blocker",
      statement: `Open question blocks release (${question.affectedElement}): ${question.question}`
    });
  }

  // Nobody has said what these cost. They withhold release for that reason
  // alone, which is a statement about our uncertainty and not about the law.
  for (const question of questions.awaitingCounselClassification) {
    blockers.push({
      kind: "release_blocker",
      statement: `Impact unclassified, returned to counsel (${question.affectedElement}): ${question.question}`
    });
  }

  // A component that says "fill an official form" without naming the form is
  // counsel not having determined the correct form. That is a real blocker.
  for (const component of components) {
    if (component.outputStrategy === "official_pdf_fill" && !component.officialFormId) {
      blockers.push({
        kind: "legal_design_blocker",
        statement: `Component ${component.componentId} names no official form.`
      });
    }
  }

  if (track.officialSources.some((source) => !source.sha256)) {
    blockers.push({
      kind: "source_gate",
      statement: "One or more official sources have no recorded SHA-256, so staleness cannot be detected."
    });
  }

  return blockers;
}

export function sourceRelationships(normalized: NormalizedMemo): readonly TrackSourceRelationship[] {
  const rows: TrackSourceRelationship[] = [];
  for (const track of normalized.tracks) {
    for (const component of track.packetSet.components) {
      if (component.outputStrategy !== "official_pdf_fill") continue;
      const source = track.officialSources.find((entry) => entry.url === component.officialSourceUrl);
      rows.push({
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        componentId: component.componentId,
        officialFormId: component.officialFormId,
        officialSourceUrl: component.officialSourceUrl,
        sha256: source?.sha256 ?? null,
        corpusState: "unchecked"
      });
    }
  }
  return rows;
}

/** Counsel writes "none" when a rule does not apply. That is not an action. */
function isNone(value: string): boolean {
  return value.trim().toLowerCase().replace(/[.\s]+$/, "") === "none";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
