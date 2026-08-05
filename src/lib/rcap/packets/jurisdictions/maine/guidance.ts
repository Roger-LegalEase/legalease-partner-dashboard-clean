// Maine process guidance — the deferred disposition, which is a routing node
// and not a remedy.
//
// One assigned route, and the first thing the sheet has to say is what it is
// not:
//
//   A deferred disposition is not a record-clearing mechanism. It produces no
//   relief of its own, and nothing here seals, expunges or destroys anything.
//
// The adopted design models this track as a routing node for exactly that
// reason. It is a disposition status with two possible outcomes and one sharp
// cross-track consequence, so the packet classifies the outcome, sends the
// participant to the track that can actually reach the record, and warns about
// the consequence before it does damage.
//
// The two outcomes route differently:
//
//   - The charge is dismissed. That is a non-conviction, and the non-conviction
//     track is where it goes. The statute that governs the deferred disposition
//     itself says nothing about confidentiality or sealing, so the dismissal
//     does not carry any clearing with it.
//
//   - You are convicted of a lesser offence instead. That conviction is judged
//     on its own terms and can be sealed only if it lands inside the eligible
//     set, which is the general sealing track's question rather than this
//     node's.
//
// The cross-track consequence is the reason this node exists at all, and it is
// counter-intuitive enough that a participant will not see it coming. A charge
// dismissed as the result of a deferred disposition, occurring since the person
// fully satisfied the sentence for their most recent eligible conviction, is an
// absolute disqualifier for the general sealing track. So a deferred
// disposition is good news for the case it resolves and bad news for an older
// conviction the participant was hoping to seal. Where both are in play the
// design makes it an attorney handoff, and this module does not attempt the
// analysis.
//
// One boundary is preserved deliberately. Getting a sealed record off a
// background check is a separate adopted mechanism with its own track, and this
// node does not absorb it. Where the participant's real problem is what a
// screening company is reporting, they are sent there rather than served a
// half-version of it here.
//
// What this template never does: claim a record has been sealed, expunged or
// destroyed; invent statewide automatic adult sealing; turn a routing node into
// a relief mechanism; merge this node with the record-screening mechanism; or
// generate any participant document.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Maine is
// not an enabled jurisdiction and this job does not enable one.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * The worker-branch legal-output position for this family.
 *
 * Built and put forward; counsel has not adopted it. The adoption records and
 * the packet proof are integration-owned and name no Maine track, so
 * `MAINE_COUNSEL_ADOPTED` is false on this branch and the verifier proves it.
 */
export const MAINE_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const MAINE_COUNSEL_ADOPTED = false;

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The node does not answer this participant; a destination is named. */
export class MaineGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MaineGuidanceStopError";
  }
}

/** The participant belongs on a different Maine track, which is named. */
export class MaineRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MaineRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class MaineBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "MaineBranchError";
  }
}

export const ME_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Whether the deferral ran to completion. */
export const ME_DEFERRAL_STATUS: Readonly<Record<string, string>> = {
  completed: "completed",
  still_running: "still_running",
  compliance_disputed: "compliance_disputed"
};

/** The two outcomes a completed deferral can produce. */
export const ME_OUTCOMES: Readonly<Record<string, string>> = {
  charge_dismissed: "charge_dismissed",
  reduced_conviction: "reduced_conviction",
  cannot_tell_from_the_record: "cannot_tell_from_the_record"
};

const ME_NONCONVICTION_TRACK =
  "the Maine track for cases that did not end in a conviction, which is where a dismissal is dealt with";
const ME_SEALING_TRACK =
  "the Maine general conviction sealing track, which judges the reduced conviction on its own terms";
const ME_SCREENING_TRACK =
  "the separate Maine mechanism for getting a sealed record off a background check, which is its own route";
const ME_CLERK =
  "the clerk of the court that handled the case, asking for the docket entries showing exactly how the deferral ended";
const ME_HELP =
  "a Maine legal aid organisation or a defence lawyer who handles sealing";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new MaineBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Classifies the deferred-disposition outcome and routes to the track that can
 * actually reach the record.
 *
 * Every path off this node is a route to somewhere else, because the node
 * itself grants nothing. The one hard stop is the cross-track disqualifier,
 * which the design makes an attorney matter.
 */
export function deriveMaineGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (branch(trackId, "usCitizen", ME_YES_NO, facts.usCitizen).resolved === false) {
    throw new MaineGuidanceStopError(
      trackId,
      "participant_is_not_a_us_citizen",
      "How a Maine disposition is treated for immigration purposes is decided under federal law, and a deferred disposition that looks favourable in state court does not necessarily read the same way federally.",
      `an immigration lawyer before relying on the disposition for anything, and only then ${ME_HELP}`
    );
  }

  const deferral = branch(trackId, "deferralComplete", ME_DEFERRAL_STATUS, facts.deferralComplete);
  if (deferral.value === "still_running") {
    throw new MaineGuidanceStopError(
      trackId,
      "deferral_period_has_not_ended",
      "Until the deferral period ends and you have done everything the agreement required, there is no outcome to classify. Which of the two outcomes you get is what decides every question after this one.",
      "your defence lawyer or the court that entered the agreement, to confirm what remains outstanding and the date the deferral ends; then come back once the outcome is entered"
    );
  }
  if (deferral.value === "compliance_disputed") {
    throw new MaineGuidanceStopError(
      trackId,
      "compliance_with_the_agreement_is_disputed",
      "Where whether you complied is contested, the outcome of the deferral is contested too, and that is argued in the criminal case rather than resolved on a record-clearing page.",
      `your defence lawyer, or ${ME_HELP} if you no longer have one, because the disputed compliance decides which outcome is entered`
    );
  }
  derived.deferralStatus = deferral.value;

  const outcome = branch(trackId, "outcomeType", ME_OUTCOMES, facts.outcomeType);
  if (outcome.value === "cannot_tell_from_the_record") {
    throw new MaineGuidanceStopError(
      trackId,
      "outcome_not_clear_from_the_court_record",
      "Whether the charge was dismissed or you were convicted of a lesser offence sends you to two completely different tracks, and it is not a thing to work out from memory. The docket is where it is written.",
      `${ME_CLERK}; once you know which it was, come back and the routing follows from it`
    );
  }
  derived.outcomeType = outcome.value;

  // The cross-track disqualifier. This is the fact the node exists to surface.
  const otherConviction = branch(trackId, "otherConvictionToSeal", ME_YES_NO, facts.otherConvictionToSeal);
  if (otherConviction.resolved && outcome.value === "charge_dismissed") {
    throw new MaineGuidanceStopError(
      trackId,
      "deferred_dismissal_may_disqualify_an_earlier_conviction_from_sealing",
      "This is the part nobody sees coming. A charge dismissed as the result of a deferred disposition, where the dismissal came after you finished the sentence for your most recent eligible conviction, is an absolute disqualifier for the general sealing track. The deferred disposition that helped the new case may have cost you the sealing of the old one, and whether it did turns on the two dates.",
      `${ME_HELP} before doing anything else, taking the dates you finished the earlier sentence and the date the deferred charge was dismissed — the interaction is dispositive and it is not something to work out alone`
    );
  }

  if (outcome.value === "charge_dismissed") {
    throw new MaineRouteMismatchError(
      trackId,
      "dismissal_is_handled_by_the_non_conviction_track",
      "The deferred disposition itself gives you nothing to clear the record with — the statute governing it says nothing about confidentiality or sealing. What you have is a dismissal, which is a non-conviction, and that is dealt with on its own track.",
      ME_NONCONVICTION_TRACK
    );
  }

  if (outcome.value === "reduced_conviction") {
    throw new MaineRouteMismatchError(
      trackId,
      "reduced_conviction_is_judged_on_its_own_terms",
      "Ending in a conviction of a lesser offence means you have a conviction, and the deferred disposition does not clear it. Whether it can be sealed depends on the offence and its class landing inside the eligible set, which is a different track's question.",
      ME_SEALING_TRACK
    );
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const NOT_A_RELIEF_MECHANISM =
  "A deferred disposition is not a record-clearing mechanism. It produces no relief of its own, and nothing on this page seals, expunges or destroys anything. It is a disposition status, and its value here is telling you which route can actually reach your record.";

const NOTHING_TO_FILE =
  "There is nothing for you to file on this page and nothing to pay. Nothing is submitted here at all — this classifies what happened and points you to the track that does the work.";

const TWO_OUTCOMES =
  "A completed deferral produces one of two outcomes, and they go to completely different places. Either the charge is dismissed, which is a non-conviction, or you are convicted of a lesser offence instead, which is a conviction judged on its own terms.";

const NO_AUTOMATIC_SEALING =
  "Maine does not clear adult records automatically. Nothing happens to your record because time passed or because the deferral went well, so do not wait for a change that is not coming.";

const CROSS_TRACK_WARNING =
  "One consequence is worth knowing before it costs you something. A charge dismissed through a deferred disposition, where the dismissal came after you finished the sentence for your most recent eligible conviction, is an absolute disqualifier for sealing that earlier conviction. The deferred disposition is good news for the new case and can be bad news for an old one you hoped to seal.";

const SCREENING_IS_SEPARATE =
  "If your real problem is what a background-check company is reporting rather than what the court record says, that is a separate Maine mechanism with its own route. It is not this page and it is not the sealing track.";

const HOW_TO_CHECK =
  "Read the docket rather than relying on memory. Ask the clerk of the court that handled the case for the entries showing exactly how the deferral ended — dismissal or reduced conviction — and on what date. LegalEase does not obtain, receive or inspect your court record; you request your own.";

const ME_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal, expunge or destroy anything, and this page does not claim any of those happened.",
  "LegalEase cannot tell you whether the cross-track disqualifier applies to you. That turns on two dates and is an attorney's assessment.",
  "LegalEase does not obtain, receive, inspect or hold your court record. You request and read your own.",
  "LegalEase generates no document on this page and files nothing on the tracks it points you to."
];

const ME_SOURCES: readonly string[] = [
  "17-A M.R.S. ch. 67, subch. 4; 17-A M.R.S. § 1901 and § 1903 (deferred disposition, agreement and dismissal).",
  "15 M.R.S. § 2262(3) (the deferred-dismissal disqualifier for the general sealing track).",
  "15 M.R.S. § 2261(6) (the eligible set for a conviction to be sealed).",
  "16 M.R.S. § 703; the clerk of the court that handled the case, for the docket entries."
];

export const MAINE_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "me-deferred-guidance": {
    templateId: "me-deferred-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Cases resolved through a deferred disposition — what it is, and what it is not",
    whyNotAFiling:
      "Nothing is filed on this page because there is nothing here to file for. A deferred disposition grants no record relief of its own; it produces an outcome, and the outcome decides which track can reach your record. This page classifies that outcome and routes you.",
    processType: "court_adjacent",
    prerequisites: [
      "You resolved a charge through a deferred disposition agreement.",
      "The deferral period has ended and you know how it ended."
    ],
    documentsToObtain: [
      "The docket entries from the clerk of the court that handled the case, showing how the deferral ended and on what date.",
      "If you have an earlier conviction you hoped to seal, the date you finished that sentence."
    ],
    participantDataToGather: [
      "Whether the deferral period has ended and you completed everything the agreement required.",
      "Whether the charge was dismissed, or you were convicted of a lesser offence instead, and on what date.",
      "If a lesser offence, what it was and what class of crime it was.",
      "Whether you have a different, earlier conviction you were hoping to get sealed."
    ],
    officialDestination: {
      name: "None of its own — the original criminal case, for the underlying record only",
      detail:
        "No submission is made on this node. It classifies the outcome and routes to the non-conviction track where the case was dismissed, or to the general sealing track where it ended in a reduced conviction inside the eligible set."
    },
    actionSequence: [
      NOT_A_RELIEF_MECHANISM,
      NOTHING_TO_FILE,
      NO_AUTOMATIC_SEALING,
      TWO_OUTCOMES,
      HOW_TO_CHECK,
      "If the charge was dismissed, that is a non-conviction and it goes to the non-conviction track. The deferred disposition statute says nothing about confidentiality or sealing, so the dismissal does not carry any clearing with it.",
      "If you were convicted of a lesser offence, you have a conviction. Whether it can be sealed depends on the offence and its class landing inside the eligible set, and that is the general sealing track's question rather than this one's.",
      CROSS_TRACK_WARNING,
      SCREENING_IS_SEPARATE
    ],
    submissionMethod:
      "Nothing is submitted. This page classifies an outcome and routes to another track.",
    fees: "No fee. Nothing is filed on this page.",
    feeWaiver: "Not applicable. There is nothing to file and no fee to waive.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "No notice, objection period or hearing arises from this page."
    ],
    expectedNextStage:
      "You know which of the two outcomes you have, which track it goes to, and whether the cross-track disqualifier needs looking at before you do anything.",
    legalEaseCanPrepare: [
      "This classification of what a deferred disposition does and, more importantly, does not do.",
      "The routing to the track that can actually reach your record.",
      "The cross-track warning, before a deferred dismissal quietly costs you the sealing of an older conviction."
    ],
    legalEaseCannotPerform: ME_CANNOT_PERFORM,
    escalationTriggers: [
      "You have both a deferred disposition and an earlier conviction you want sealed.",
      "The court record does not make clear whether the case ended in dismissal or in a reduced conviction.",
      "The deferral period has not ended, or compliance is disputed.",
      "You are not a US citizen."
    ],
    officialSourceReferences: ME_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!MAINE_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Maine guidance template ${templateId} is registered.`);
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId,
        role: "process_guidance",
        outputStrategy: "process_guidance",
        rendererStrategy: "process_guidance",
        templateId,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide",
        requirement: "required",
        order: 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      }
    ]
  };
}

const ME_STATUSES = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "legal_review_pending"
} as const;

const ME_REQUIRED_INPUTS: readonly RequiredInput[] = [
  {
    key: "deferralComplete",
    label: "Has the deferral period ended, and did you complete everything the agreement required?",
    required: true
  },
  {
    key: "outcomeType",
    label: "When the deferral ended, was the charge dismissed, or were you convicted of a lesser offence instead?",
    required: true
  },
  { key: "outcomeDate", label: "On what date did that happen?", required: true },
  {
    key: "reducedOffenseName",
    label: "If you were convicted of a lesser offence, what was it and what class of crime was it?",
    required: false
  },
  {
    key: "otherConvictionToSeal",
    label: "Do you have a different, earlier conviction that you were hoping to get sealed?",
    required: true
  },
  {
    key: "otherConvictionCompletionDate",
    label: "If so, on what date did you finish the sentence for that earlier conviction?",
    required: false
  },
  { key: "usCitizen", label: "Are you a United States citizen?", required: true }
];

export const MAINE_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "ME",
    trackId: "me-deferred",
    publicName: "Cases resolved through a deferred disposition",
    mechanism: "deferred_disposition_routing_node_producing_no_relief_of_its_own",
    authority:
      "17-A M.R.S. ch. 67, subch. 4; 17-A M.R.S. § 1901; § 1903; 15 M.R.S. § 2262(3); 15 M.R.S. § 2261(6); 16 M.R.S. § 703",
    recordTypes: ["charge", "court_record"],
    dispositions: ["deferred_disposition_dismissed", "deferred_disposition_reduced_conviction"],
    courtLevel: "original_criminal_court",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet("me-deferred", "me-deferred-process-guidance-1", "me-deferred-guidance"),
    requiredInputs: ME_REQUIRED_INPUTS,
    statuses: {
      ...ME_STATUSES,
      runtime: computeRuntimeStatus({
        statuses: ME_STATUSES,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "Deferred-Disposition-Classification-And-Routing",
    assembledPacketTitle: "Cases resolved through a deferred disposition — what it is, and what it is not",
    customerDeliverableDescription:
      "A guidance sheet stating plainly that a deferred disposition is not a record-clearing mechanism and produces no relief of its own, classifying the two outcomes a completed deferral can produce, routing a dismissal to the non-conviction track and a reduced conviction to the general sealing track, and warning that a deferred dismissal occurring after the sentence for an earlier eligible conviction is an absolute disqualifier for sealing that conviction.",
    notes:
      "The adopted design models this as a routing node rather than a relief mechanism, and the sheet says so on its face: no claim is made that any record has been sealed, expunged or destroyed, because the deferred-disposition statute says nothing about confidentiality or sealing. No statewide automatic adult sealing is invented — the sheet states the opposite. The node is not merged with the separate record-screening mechanism, which is named as its own route where the participant's real problem is what a background-check company reports. The two outcomes route to the two adopted tracks that can actually reach the record. The cross-track consequence under the disqualifier provision is the reason the node exists and is a typed stop to a lawyer, since the interaction turns on two dates and is dispositive; the design records it as an attorney handoff and this module does not attempt the analysis."
  }
];
