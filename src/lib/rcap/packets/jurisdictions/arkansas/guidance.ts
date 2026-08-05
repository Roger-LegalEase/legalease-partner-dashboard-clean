// Arkansas process guidance — pre-adjudication probation, which is negotiated
// rather than applied for.
//
// One assigned route. Placement on pre-adjudication probation happens inside an
// active criminal case and requires the prosecuting attorney to concur. That
// concurrence is a negotiation with the other side, not a form, and the adopted
// design says so in terms: prosecutor concurrence inside an active disposition
// is not itself a participant packet.
//
// So there is nothing here for LegalEase to generate, and the sheet is honest
// about why rather than dressing the route up as something a self-help service
// can deliver. Two things follow, and they are the whole value of the page.
//
//   1. If your case is still open, this belongs to your defence lawyer. The
//      placement is decided at the disposition stage, with the prosecutor's
//      agreement, and a record-clearing service cannot ask for it on your
//      behalf or advise you while the case is live.
//
//   2. If your case is finished, the useful question is a different one:
//      finding out what you actually have. Someone who was placed on
//      pre-adjudication probation and completed it may not know how their
//      record now reads, and that is worth checking before spending money on
//      clearing something whose status they have not established.
//
// One limit is stated plainly because inventing around it would be the easy
// mistake: no independent participant-initiated post-completion filing has been
// confirmed for this route. This module does not invent one, and it does not
// imply that completing the programme comes with a form to send afterwards.
//
// The design records no fee for the route, does not address a fee waiver and
// does not state a notarization requirement. None of the three is filled in
// here — an unstated rule is reported as unstated rather than guessed at.
//
// What this template never does: turn guidance into a court filing, generate a
// placement request or a post-completion filing, approach a prosecutor on
// anyone's behalf, advise inside a live prosecution, or quote a fee,
// notarization or waiver the source review does not state.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Arkansas
// is not an enabled jurisdiction and this job does not enable one.

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
 * the packet proof are integration-owned and name no Arkansas track, so
 * `ARKANSAS_COUNSEL_ADOPTED` is false on this branch and the verifier proves it.
 */
export const ARKANSAS_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const ARKANSAS_COUNSEL_ADOPTED = false;

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not answer this participant; a destination is named. */
export class ArkansasGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "ArkansasGuidanceStopError";
  }
}

/** The participant belongs on a different Arkansas route, which is named. */
export class ArkansasRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "ArkansasRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class ArkansasBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "ArkansasBranchError";
  }
}

export const AR_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Whether the criminal case is still live. */
export const AR_CASE_STATUS: Readonly<Record<string, string>> = {
  still_active: "still_active",
  finished: "finished"
};

/** Whether the prosecutor has been approached about placement. */
export const AR_PROSECUTOR_DISCUSSION: Readonly<Record<string, string>> = {
  yes: "yes",
  no: "no",
  not_applicable: "not_applicable"
};

/** What the participant wants from this route. */
export const AR_GOALS: Readonly<Record<string, string>> = {
  understand_what_i_already_have: "understand_what_i_already_have",
  seek_placement_now: "seek_placement_now"
};

const AR_DEFENCE =
  "the lawyer representing you in that case, or the public defender's office for that judicial district";
const AR_HELP =
  "an Arkansas legal aid organisation or a records-sealing clinic";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new ArkansasBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Arkansas stops, and routes to the
 * correct destination.
 *
 * Both of the design's stop conditions are about who is entitled to act: an
 * active case belongs to defence counsel, and seeking the prosecutor's
 * concurrence is negotiation rather than self-help. Neither is a refusal — each
 * names the person who can actually do the thing.
 */
export function deriveArkansasGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  const status = branch(trackId, "caseActive", AR_CASE_STATUS, facts.caseActive);
  if (status.value === "still_active") {
    throw new ArkansasGuidanceStopError(
      trackId,
      "active_case_belongs_to_defence_counsel",
      "Pre-adjudication probation is decided inside a live criminal case, at the disposition stage. While the case is open, everything about it — including whether to ask for this placement — belongs to the lawyer defending it, and a record-clearing service cannot advise you or ask on your behalf.",
      `${AR_DEFENCE}, asking them specifically whether pre-adjudication probation is available in your case and whether they will raise it with the prosecutor`
    );
  }
  derived.caseStatus = status.value;

  const goal = branch(trackId, "goal", AR_GOALS, facts.goal);
  if (goal.value === "seek_placement_now") {
    throw new ArkansasGuidanceStopError(
      trackId,
      "prosecutor_concurrence_is_negotiation_not_self_help",
      "The prosecuting attorney has to concur before anyone can be placed on pre-adjudication probation. Asking for that concurrence is a negotiation with the other side of a criminal case, which is not something a self-help packet can carry and not something to attempt alone.",
      `${AR_DEFENCE}, who is the person who approaches the prosecuting attorney; LegalEase does not make that request for you`
    );
  }

  derived.prosecutorDiscussed = branch(
    trackId,
    "prosecutorDiscussed",
    AR_PROSECUTOR_DISCUSSION,
    facts.prosecutorDiscussed
  ).value;

  return derived;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route. Pre-adjudication probation is not applied for on a form — it is agreed inside an active criminal case, with the prosecuting attorney's concurrence.";

const NO_POST_COMPLETION_FILING =
  "No separate filing that you could make after completing the programme has been confirmed for this route. That means this page will not hand you one, and it is worth being sceptical of anyone who offers you a form for it.";

const CHECK_WHAT_YOU_HAVE =
  "If you were placed on pre-adjudication probation and completed it, the useful next step is finding out how your record actually reads now, rather than assuming either that it is clear or that it is not. Request your own Arkansas criminal history record and look at it before spending anything on clearing a record whose status you have not established.";

const UNSTATED_RULES =
  "Three things the source review does not settle, reported as unsettled rather than guessed at: it records no fee for this route, it does not address a fee waiver, and it does not state a notarization requirement. Ask the court or your lawyer rather than relying on an assumption about any of them.";

const AR_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot obtain pre-adjudication probation for you, and cannot ask a prosecuting attorney to concur.",
  "LegalEase cannot advise you inside a live criminal case. That is defence work.",
  "LegalEase cannot tell you whether you qualify. This page explains what the route is; it is not legal advice.",
  "LegalEase does not obtain, receive, inspect or hold your record. You request and read your own."
];

const AR_SOURCES: readonly string[] = [
  "A.C.A. §§ 5-4-901 to 5-4-907 (pre-adjudication probation).",
  "The prosecuting attorney's office for the judicial district, whose concurrence the statute requires.",
  "The public defender's office for the judicial district, for a case that is still open.",
  "Arkansas criminal history record request, for checking how a completed case now reads."
];

export const ARKANSAS_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "ar-preadjudication-probation-guidance": {
    templateId: "ar-preadjudication-probation-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Pre-adjudication probation, and why it is not something you apply for",
    whyNotAFiling:
      "Placement on pre-adjudication probation is negotiated inside an active criminal case and requires the prosecuting attorney to concur. There is no application, and prosecutor concurrence inside a live disposition is not a participant packet — so nothing is generated here and this page explains who can actually act.",
    processType: "court_adjacent",
    prerequisites: [
      "Your criminal case is finished. While it is open, this is a question for your defence lawyer rather than for this page.",
      "You are trying to understand what you already have, rather than to obtain a placement now."
    ],
    documentsToObtain: [
      "Your court records for the case, showing how it was resolved and whether you were discharged.",
      "Your own Arkansas criminal history record, if you want to see what a background check shows."
    ],
    participantDataToGather: [
      "Whether your criminal case is still active.",
      "Whether you or your lawyer have discussed pre-adjudication probation with the prosecutor.",
      "The court and county the case was in, and the case number."
    ],
    officialDestination: {
      name: "The underlying criminal court",
      detail:
        "The placement is made inside the active case and the prosecuting attorney must concur. No independent participant-initiated post-completion filing has been confirmed, so nothing is submitted by the participant."
    },
    actionSequence: [
      NOTHING_TO_FILE,
      "Know where the decision sits. The prosecuting attorney has to agree, and the placement is made at the disposition stage of a live case. That makes it a defence matter and a negotiation, not a form to send.",
      "So if your case is still open, the single most useful thing you can do is raise it with the lawyer defending it — and raise it before the disposition, because that is when the decision is made rather than after.",
      NO_POST_COMPLETION_FILING,
      CHECK_WHAT_YOU_HAVE,
      UNSTATED_RULES
    ],
    submissionMethod:
      "There is nothing to submit. Placement is negotiated inside the active case, and no post-completion filing has been confirmed.",
    fees: "The source review records no fee for this route. It is not a filing you make, so there is nothing here for you to pay through LegalEase.",
    feeWaiver: "The source review does not address a fee waiver, so none is described here. Ask the court.",
    noticeOrService: [
      "You serve nobody and notify nobody.",
      "The prosecuting attorney must concur in the placement. That concurrence is sought through your lawyer, not by you sending anything."
    ],
    expectedNextStage:
      "Either your defence lawyer is raising the placement in a live case, or you know how your completed case actually reads on your own record.",
    legalEaseCanPrepare: [
      "This explanation of why the route is negotiated rather than applied for.",
      "The reason to raise it before the disposition rather than after.",
      "The check on what a completed case actually left on your record."
    ],
    legalEaseCannotPerform: AR_CANNOT_PERFORM,
    escalationTriggers: [
      "Your criminal case is still active, which is defence work.",
      "You want to seek the placement now, which requires the prosecuting attorney's concurrence.",
      "You are unsure how a completed case now reads on your record."
    ],
    officialSourceReferences: AR_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!ARKANSAS_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Arkansas guidance template ${templateId} is registered.`);
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

const ARKANSAS_STATUSES = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  // Built and put forward, not adopted. `legal_review_pending` is the in-type
  // expression of `recommended_for_counsel_adoption`.
  legal: "legal_review_pending"
} as const;

const ARKANSAS_REQUIRED_INPUTS: readonly RequiredInput[] = [
  { key: "caseActive", label: "Is your criminal case still active?", required: true },
  {
    key: "prosecutorDiscussed",
    label: "Have you or your lawyer discussed pre-adjudication probation with the prosecutor?",
    required: true
  },
  {
    key: "goal",
    label:
      "What are you trying to do — understand what you already have, or seek placement on pre-adjudication probation now?",
    required: true
  }
];

export const ARKANSAS_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "AR",
    trackId: "ar-preadjudication-probation",
    publicName: "Pre-Adjudication Probation",
    mechanism: "placement_negotiated_inside_the_active_case_with_prosecutor_concurrence",
    authority: "A.C.A. §§ 5-4-901 to 5-4-907",
    recordTypes: ["charge"],
    dispositions: ["placement on pre-adjudication probation"],
    courtLevel: "underlying_criminal_court",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(
      "ar-preadjudication-probation",
      "ar-preadjudication-probation-process-guidance-1",
      "ar-preadjudication-probation-guidance"
    ),
    requiredInputs: ARKANSAS_REQUIRED_INPUTS,
    statuses: {
      ...ARKANSAS_STATUSES,
      runtime: computeRuntimeStatus({
        statuses: ARKANSAS_STATUSES,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "Pre-Adjudication-Probation-Route-Explainer",
    assembledPacketTitle: "Pre-adjudication probation, and why it is not something you apply for",
    customerDeliverableDescription:
      "A guidance sheet explaining that pre-adjudication probation is negotiated inside an active criminal case and requires the prosecuting attorney's concurrence rather than being applied for, that an open case belongs to defence counsel and the placement should be raised before the disposition, that no participant post-completion filing has been confirmed, and how to check what a completed case actually left on the record.",
    notes:
      "The adopted design records that prosecutor concurrence is required, that this is negotiation rather than self-help, and that concurrence inside an active disposition is not itself a participant packet — so nothing is generated and both design stop conditions are typed stops naming the defence lawyer or public defender's office as the person who can actually act. No independent participant-initiated post-completion filing has been confirmed, and the sheet says so rather than inventing one, warning the participant to be sceptical of anyone offering a form for it. The source review records no fee, does not address a fee waiver and does not state a notarization requirement; all three are reported as unstated rather than filled in. A participant whose case is finished keeps the packet, because establishing how a completed case now reads is the useful question for them."
  }
];
