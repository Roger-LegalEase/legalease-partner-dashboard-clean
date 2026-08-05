// Florida process guidance — automatic sealing, and the allowance worth saving.
//
// One assigned route. The Department of Law Enforcement automatically seals
// certain favourable records once the clerk transmits the certified
// disposition. Nothing is filed by the participant and nothing is paid.
//
// The design's instruction for this sheet is unusually commercial, and it runs
// against the grain of selling anybody anything:
//
//   For many Florida participants with a clean dismissal, the right advice is
//   to do nothing and save the allowance.
//
// That is the point of the page. A court-ordered expunction is a once-per-
// lifetime allowance in Florida and it costs an application fee. Automatic
// sealing does not consume that allowance. So a participant whose record
// already sealed itself, who then spends the allowance and the fee on a
// court-ordered expunction, has bought something they may well have needed more
// later — and there is no second one.
//
// The sheet therefore does three things and refuses a fourth. It tells the
// participant the automatic sealing exists; it shows them how to verify it
// actually happened, through the clerk and through a Department personal review
// that costs nothing; and it says honestly when a court-ordered expunction
// would still be worth the spend. It does not sell a filing to someone whose
// record is already sealed.
//
// The qualifying dispositions are precise and one exclusion inside them is easy
// to miss: a not-guilty verdict on all counts qualifies UNLESS it was not
// guilty by reason of insanity, which is outside the route entirely.
//
// A record that still shows is not a dead end here and is deliberately not a
// stop. It is the reason someone reads this page, and the answer is to check
// with the clerk whether the certified disposition was transmitted at all —
// because the sealing begins with that transmission, and a disposition that
// never reached the Department is the ordinary explanation for a record that
// should have sealed and did not.
//
// What this template never does: turn guidance into a court filing, generate an
// expunction application, tell a participant their own record has or has not
// sealed, promise a date, or push a once-per-lifetime filing at someone who
// does not need it.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Florida is
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
 * the packet proof are integration-owned and name no Florida track, so
 * `FLORIDA_COUNSEL_ADOPTED` is false on this branch and the verifier proves it.
 */
export const FLORIDA_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const FLORIDA_COUNSEL_ADOPTED = false;

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not answer this participant; a destination is named. */
export class FloridaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "FloridaGuidanceStopError";
  }
}

/** The participant belongs on a different Florida route, which is named. */
export class FloridaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "FloridaRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class FloridaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "FloridaBranchError";
  }
}

export const FL_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * How every count ended.
 *
 * A not-guilty verdict on all counts qualifies, except where it was not guilty
 * by reason of insanity — which is the exclusion inside the qualifying answer.
 */
export const FL_DISPOSITIONS: Readonly<Record<string, string>> = {
  no_charging_document_filed: "no charging document was ever filed",
  all_counts_dismissed: "every count was dismissed",
  all_counts_nolle_prossed: "every count was nolle prossed",
  not_guilty_all_counts: "there was a not-guilty verdict on every count",
  acquitted_all_counts: "there was a judgment of acquittal on every count",
  not_guilty_by_reason_of_insanity: "not_guilty_by_reason_of_insanity",
  convicted_or_some_counts_survived: "convicted_or_some_counts_survived"
};

/** Whether the record is still showing, and whether it has been checked. */
export const FL_VISIBILITY: Readonly<Record<string, string>> = {
  no_longer_appears: "no_longer_appears",
  still_appears: "still_appears",
  have_not_checked: "have_not_checked"
};

/** What the participant wants from this route. */
export const FL_GOALS: Readonly<Record<string, string>> = {
  verify_whether_it_happened: "verify_whether_it_happened",
  argue_or_challenge_the_record: "argue_or_challenge_the_record"
};

const FL_HELP =
  "a Florida legal aid organisation or a public defender records-sealing clinic";
const FL_COURT_ROUTE =
  "the Florida court-ordered sealing and expunction routes, which are a court filing, cost an application fee and use the once-per-lifetime allowance";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new FloridaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Florida stops, and routes to the
 * correct Florida mechanism.
 *
 * A record that still shows is deliberately not a stop. It is why the page is
 * read, and the sheet's answer — check with the clerk whether the certified
 * disposition was transmitted — is the whole point of the verification half.
 */
export function deriveFloridaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (branch(trackId, "immigrationMatter", FL_YES_NO, facts.immigrationMatter).resolved) {
    throw new FloridaGuidanceStopError(
      trackId,
      "immigration_matter_in_play",
      "A sealed Florida record still exists and how it is treated federally is decided under federal law rather than by the sealing. The order in which record steps and an immigration matter are handled can matter more than the sealing itself.",
      `an immigration lawyer before any record step is taken, and only then ${FL_HELP}`
    );
  }

  const disposition = branch(trackId, "disposition", FL_DISPOSITIONS, facts.disposition);
  if (disposition.value === "not_guilty_by_reason_of_insanity") {
    throw new FloridaRouteMismatchError(
      trackId,
      "not_guilty_by_reason_of_insanity_is_excluded",
      "A not-guilty verdict on all counts is what this route reaches, but a verdict of not guilty by reason of insanity is expressly outside it. That exclusion sits inside the answer that otherwise qualifies, which is why it is easy to miss.",
      `${FL_HELP}, taking the judgment so the form of the verdict is read from the record rather than from memory`
    );
  }
  if (disposition.value === "convicted_or_some_counts_survived") {
    throw new FloridaRouteMismatchError(
      trackId,
      "not_every_count_ended_favourably",
      "The automatic sealing reaches a case where every count ended favourably. Where any count ended in a conviction or otherwise survived, the case is outside it — but that does not mean nothing is available.",
      `${FL_COURT_ROUTE}; to work out whether your record qualifies for one of them, ${FL_HELP}`
    );
  }
  derived.dispositionAllegation = disposition.resolved;

  const goal = branch(trackId, "goal", FL_GOALS, facts.goal);
  if (goal.value === "argue_or_challenge_the_record") {
    throw new FloridaGuidanceStopError(
      trackId,
      "wants_to_argue_rather_than_verify",
      "This route is administrative: the Department seals when the clerk sends it a qualifying certified disposition. There is nobody here to argue with and no hearing to be heard at, so a dispute about the record is a different kind of matter.",
      `${FL_HELP} to work out what kind of proceeding the dispute actually belongs in; if what you want is a court order about the record, that is ${FL_COURT_ROUTE}`
    );
  }

  derived.recordVisibility = branch(
    trackId,
    "recordStillVisible",
    FL_VISIBILITY,
    facts.recordStillVisible
  ).value;

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route and nothing to pay. The Department of Law Enforcement seals the record once the clerk sends it the certified disposition, without any application from you.";

const SAVE_THE_ALLOWANCE =
  "The most valuable thing on this page for many people is permission to do nothing. A court-ordered expunction in Florida is a once-in-a-lifetime allowance and it carries an application fee of about seventy-five dollars — confirm the current amount before paying anything. Automatic sealing does not use that allowance up. So if your record has already sealed itself, spending the allowance now buys you something you may need far more later, and there is no second one.";

const HOW_TO_CHECK =
  "Verify it in two places. Ask the clerk of the court whether the certified disposition was transmitted to the Department, because that transmission is what starts the sealing. Then request a personal review of your own criminal history record from the Department, which charges no fee for it. LegalEase does not obtain, receive or inspect either one — you check your own.";

const NO_OUTCOME_ASSERTED =
  "This page does not tell you whether your own record has or has not been sealed. It cannot see the Department's data. What it can tell you is where to look and what each answer means.";

const FL_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal or expunge anything, and cannot make a clerk or the Department of Law Enforcement act.",
  "LegalEase cannot tell you whether you qualify, and never asserts an outcome for a particular record.",
  "LegalEase does not obtain, receive, inspect or hold your criminal history record. You request and read your own.",
  "LegalEase does not file the court-ordered sealing or expunction routes named here; those are separate routes with their own requirements."
];

const FL_SOURCES: readonly string[] = [
  "§ 943.0595, Fla. Stat. (automatic sealing), created by s. 52, ch. 2019-167 and amended by s. 1, ch. 2023-189.",
  "Florida Department of Law Enforcement, personal review of your own criminal history record.",
  "The clerk of the court where the case was heard, for the certified disposition and its transmission.",
  "Florida court-ordered sealing and expunction, for the once-per-lifetime allowance and its application fee."
];

export const FLORIDA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "fl-auto-seal-guidance": {
    templateId: "fl-auto-seal-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Automatic sealing of a case that ended in your favour",
    whyNotAFiling:
      "The Department of Law Enforcement seals qualifying records after the clerk transmits the certified disposition. There is no petition, no application and no fee on this route, so nothing is generated — this page explains what it does, how to check it happened, and when a court filing would still be worth it.",
    processType: "agency",
    prerequisites: [
      "Every count in the case ended favourably: no charging document was filed, or all counts were dismissed or nolle prossed, or there was a not-guilty verdict or judgment of acquittal on every count.",
      "The verdict was not one of not guilty by reason of insanity, which is outside this route.",
      "Nothing else. This sealing is not applied for."
    ],
    documentsToObtain: [
      "The certified disposition from the clerk of the court where the case was heard.",
      "A personal review of your own criminal history record from the Department of Law Enforcement, which is free."
    ],
    participantDataToGather: [
      "How every count in the case ended.",
      "Whether the record still appears on a background check.",
      "The county and the case number, so the clerk can find the disposition."
    ],
    officialDestination: {
      name: "The Florida Department of Law Enforcement",
      detail:
        "The sealing occurs after the clerk transmits an eligible certified disposition to the Department. Nothing is filed by the participant and no office receives anything from you."
    },
    actionSequence: [
      NOTHING_TO_FILE,
      SAVE_THE_ALLOWANCE,
      "Check that every count qualifies, not just the one you remember. The route reaches a case where no charging document was filed, or where all counts were dismissed or nolle prossed, or where there was a not-guilty verdict or a judgment of acquittal on every count. One surviving count takes the case out of it.",
      "Watch the exclusion hiding inside the qualifying answer: a verdict of not guilty by reason of insanity does not qualify, even though an ordinary not-guilty verdict on all counts does.",
      HOW_TO_CHECK,
      "If the record no longer appears, the sealing reached you and there is nothing further to do — and you still have your once-in-a-lifetime allowance.",
      "If it still appears, start with the clerk rather than assuming the sealing failed. The Department seals on receiving the certified disposition, so a disposition that was never transmitted is the ordinary reason a record that should have sealed has not.",
      "Only then consider whether a court-ordered expunction is worth the allowance and the fee. For a clean dismissal that already sealed, it usually is not.",
      NO_OUTCOME_ASSERTED
    ],
    submissionMethod:
      "There is nothing to submit. The Department acts on the certified disposition it receives from the clerk.",
    fees:
      "No fee on this route, and the Department charges nothing for a personal review of your own record. The separate court-ordered expunction carries an application fee of about seventy-five dollars; confirm the current amount before paying it.",
    feeWaiver: "Not applicable. There is no fee to waive on this route.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "Nobody is required to tell you when a record has been sealed, which is why checking is the participant's part."
    ],
    expectedNextStage:
      "Your Department personal review no longer shows the case, or you know from the clerk whether the certified disposition was ever transmitted.",
    legalEaseCanPrepare: [
      "This explanation of what seals automatically and what does not.",
      "The two-place verification, starting with the clerk and the transmission.",
      "An honest account of when the once-per-lifetime expunction is worth spending, which for many clean dismissals is not now."
    ],
    legalEaseCannotPerform: FL_CANNOT_PERFORM,
    escalationTriggers: [
      "Any immigration matter.",
      "The verdict was not guilty by reason of insanity.",
      "Any count ended in a conviction or otherwise survived.",
      "You want to argue about the record rather than verify it."
    ],
    officialSourceReferences: FL_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!FLORIDA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Florida guidance template ${templateId} is registered.`);
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

const FLORIDA_STATUSES = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  // Built and put forward, not adopted. `legal_review_pending` is the in-type
  // expression of `recommended_for_counsel_adoption`.
  legal: "legal_review_pending"
} as const;

const FLORIDA_REQUIRED_INPUTS: readonly RequiredInput[] = [
  {
    key: "immigrationMatter",
    label: "Is there any immigration matter in play for you?",
    required: true
  },
  {
    key: "disposition",
    label: "Did every count end in dismissal, nolle prosequi, acquittal or a not-guilty verdict?",
    required: true
  },
  {
    key: "goal",
    label: "What are you trying to do — verify whether the sealing happened, or argue about the record?",
    required: true
  },
  {
    key: "recordStillVisible",
    label: "Does the record still appear on a background check?",
    required: true
  }
];

export const FLORIDA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "FL",
    trackId: "fl-auto-seal",
    publicName: "Automatic Sealing",
    mechanism: "automatic_sealing_by_fdle_on_certified_disposition_from_the_clerk",
    authority:
      "§ 943.0595, Fla. Stat., created by s. 52, ch. 2019-167, amended by s. 1, ch. 2023-189",
    recordTypes: ["arrest", "charge"],
    dispositions: [
      "no charging document filed",
      "a charging document filed but all counts dismissed, nolle prossed, or dismissed by the court",
      "a not-guilty verdict on all counts, unless not guilty by reason of insanity",
      "a judgment of acquittal on all counts"
    ],
    courtLevel: "not_a_court_process",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet("fl-auto-seal", "fl-auto-seal-process-guidance-1", "fl-auto-seal-guidance"),
    requiredInputs: FLORIDA_REQUIRED_INPUTS,
    statuses: {
      ...FLORIDA_STATUSES,
      runtime: computeRuntimeStatus({
        statuses: FLORIDA_STATUSES,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "Automatic-Sealing-Verification",
    assembledPacketTitle: "Automatic sealing of a case that ended in your favour",
    customerDeliverableDescription:
      "A guidance sheet explaining that the Department of Law Enforcement seals qualifying favourable records once the clerk transmits the certified disposition with nothing filed and nothing paid, how to verify it through the clerk and a free Department personal review, and honestly when a court-ordered expunction is worth its once-per-lifetime allowance and application fee — which for many clean dismissals is not now.",
    notes:
      "The design's packet instruction is to tell the participant the route exists, how to verify it actually happened through the clerk and a Department personal review, and honestly when a court-ordered expunction would still be worth the once-per-lifetime spend and the application fee, adding that for many Florida participants with a clean dismissal the right advice is to do nothing and save the allowance. That advice is the centre of the sheet, and the fee is written in words with an instruction to confirm the current amount rather than printed as a figure that may go stale. The exclusion of a verdict of not guilty by reason of insanity sits inside the otherwise-qualifying not-guilty answer and is a typed route mismatch. A record that still appears is deliberately not a stop: it is why the page is read, and the sheet routes it to the clerk to ask whether the certified disposition was ever transmitted, since that transmission is what starts the sealing. The design's two stop conditions — any immigration matter, and a participant who wants to argue rather than verify — are both typed stops with named destinations."
  }
];
