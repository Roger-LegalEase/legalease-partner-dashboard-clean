// Indiana process guidance — the court's own-motion expungement, and why
// "nothing yet" is not the same as "it failed".
//
// One assigned route. For a person charged or alleged delinquent after 30 June
// 2022, the court orders expungement on its own motion where the matter ended
// favourably. No petition is needed and the adopted design records that plainly,
// so nothing is generated here.
//
// Three corrections carry this sheet, all from the adopted design.
//
//   1. Nothing is destroyed. In Indiana, expungement under this chapter means
//      records are sealed or restricted. The Office of Judicial Administration
//      states that court records are not deleted or destroyed under the
//      chapter, so no artifact here says destroyed, deleted or erased.
//
//   2. The timing is staggered and the honest version matters. An order on a
//      non-prosecution takes effect immediately. An order on a dismissal or an
//      acquittal takes effect not earlier than sixty days, and the prosecutor
//      may move to delay it by up to a year. So a record still showing two
//      months after an acquittal is very often the statute working exactly as
//      written — not a failure to be fixed by filing something.
//
//   3. The expungement case file is public until the order is granted. A
//      participant who does not know that can be badly surprised by what a
//      search turns up while they are waiting.
//
// The failure this sheet is written against is a participant filing the wrong
// petition because the automatic order has not appeared yet. The design routes
// a genuinely missing order to the Section 1 petition tracks, but it does not
// treat delay as absence — and neither does this page. The sixty-day floor and
// the prosecutor's one-year delay motion are stated first, precisely so that
// nobody spends a filing fee on a route they did not need.
//
// What this template never does: turn guidance into a court filing, invent a
// petition under the automatic subsection, invent a filing fee, prosecutor
// service or a hearing, promise a processing date, or say an Indiana record was
// destroyed.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Indiana is
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
 * the packet proof are integration-owned and name no Indiana track, so
 * `INDIANA_COUNSEL_ADOPTED` is false on this branch and the verifier proves it.
 */
export const INDIANA_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const INDIANA_COUNSEL_ADOPTED = false;

/** The cutoff the automatic route runs from. */
export const IN_CHARGE_CUTOFF = "30 June 2022";

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not answer this participant; a destination is named. */
export class IndianaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "IndianaGuidanceStopError";
  }
}

/** The participant belongs on a different Indiana route, which is named. */
export class IndianaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "IndianaRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class IndianaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "IndianaBranchError";
  }
}

export const IN_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** How the matter ended. */
export const IN_DISPOSITIONS: Readonly<Record<string, string>> = {
  all_charges_dismissed: "all charges or allegations were dismissed",
  acquitted_all_charges: "you were acquitted of all charges",
  vacated: "the conviction was vacated",
  no_true_finding: "there was a no-true finding",
  one_year_no_disposition: "a year passed with no disposition",
  convicted: "convicted"
};

/** Whether the court has already made the order. */
export const IN_COURT_ACTION: Readonly<Record<string, string>> = {
  order_entered: "order_entered",
  no_order_yet: "no_order_yet",
  have_not_checked: "have_not_checked"
};

const IN_PETITION_TRACKS =
  "the Indiana Section 1 expungement petition routes, which are participant filings with their own requirements";
const IN_CLERK =
  "the clerk of the court that handled the charge, quoting the cause number, to ask whether an expungement order has been entered";
const IN_HELP =
  "an Indiana legal aid organisation or a public defender expungement clinic";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new IndianaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Indiana stops, and routes to the
 * correct Indiana mechanism.
 *
 * An order that has not appeared is deliberately not treated as a failure. The
 * statute's own sixty-day floor and the prosecutor's one-year delay motion mean
 * "not yet" is the normal case, and the sheet exists to stop someone filing the
 * wrong petition because of it.
 */
export function deriveIndianaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (!branch(trackId, "chargedAfterJune2022", IN_YES_NO, facts.chargedAfterJune2022).resolved) {
    throw new IndianaRouteMismatchError(
      trackId,
      "case_predates_the_cutoff",
      `The court's own-motion expungement reaches a person charged, or alleged delinquent, after ${IN_CHARGE_CUTOFF}. An earlier case is outside it however favourably it ended — which does not mean nothing is available, only that it will not arrive on its own.`,
      `${IN_PETITION_TRACKS}; to identify which one fits your disposition, ${IN_HELP}`
    );
  }

  const disposition = branch(trackId, "disposition", IN_DISPOSITIONS, facts.disposition);
  if (disposition.value === "convicted") {
    throw new IndianaRouteMismatchError(
      trackId,
      "matter_ended_in_a_conviction",
      "This route runs on a matter that ended without a conviction — a dismissal, an acquittal, a vacatur, a no-true finding, or a year with no disposition. A conviction is not reached by the court's own motion here.",
      `${IN_PETITION_TRACKS}, which are the routes that can reach a conviction`
    );
  }
  derived.dispositionAllegation = disposition.resolved;

  if (branch(trackId, "inPretrialDiversion", IN_YES_NO, facts.inPretrialDiversion).resolved) {
    throw new IndianaGuidanceStopError(
      trackId,
      "currently_in_a_pretrial_diversion_programme",
      "While you are still in a pretrial diversion programme the matter has not ended, so there is no favourable disposition yet for the court to act on. What happens to the record depends on how the programme finishes.",
      "your defence lawyer or the programme supervisor, to confirm what disposition will be entered when you complete it; then come back to this route once the case has ended"
    );
  }

  if (branch(trackId, "prosecutorMovedToDelay", IN_YES_NO, facts.prosecutorMovedToDelay).resolved) {
    throw new IndianaGuidanceStopError(
      trackId,
      "prosecutor_moved_to_delay_the_order",
      "The prosecutor may move to delay the order by up to a year, and where that motion has been made the timing is now a contested question in your case rather than a matter of waiting out the ordinary period.",
      `${IN_HELP}, taking the cause number and the prosecutor's motion; and ask ${IN_CLERK} for the current setting`
    );
  }

  derived.courtAction = branch(trackId, "courtHasActed", IN_COURT_ACTION, facts.courtHasActed).value;

  return derived;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route and no fee to pay. The court orders the expungement on its own motion, and there is no petition under this part for you to bring.";

const NOT_DESTROYED =
  "Nothing is destroyed. In Indiana this kind of expungement means the records are sealed or restricted, and the Office of Judicial Administration says plainly that court records are not deleted or destroyed under this chapter. Expect the record to become restricted rather than to vanish.";

const TIMING =
  "The timing is staggered, and knowing it is what stops people spending money they did not need to. An order on a non-prosecution takes effect immediately. An order on a dismissal or an acquittal takes effect not earlier than sixty days — and the prosecutor may move to delay it by up to a year.";

const NOT_YET_IS_NOT_FAILURE =
  "So do not read a record that still shows as a failure. Two months after an acquittal, a record that has not changed is very often the statute working exactly as written. Filing a petition at that point buys you something you were about to be given.";

const CASE_FILE_PUBLIC =
  "One thing to be ready for: the expungement case file itself is public until the order is granted. If you search while you are waiting, you may find the expungement proceeding as well as the underlying case.";

const HOW_TO_CHECK =
  "Check in two places, because they are different systems. Ask the clerk of the court that handled the charge whether an expungement order has been entered, quoting the cause number. Then look at your own Indiana criminal history record to see what a background check returns. LegalEase does not obtain, receive or inspect either — you check your own.";

const IN_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge anything, and cannot make a court, a clerk or a prosecutor act.",
  "LegalEase cannot tell you whether you qualify, and never asserts that a particular order has or has not been entered.",
  "LegalEase does not obtain, receive, inspect or hold your court record or criminal history. You check your own.",
  "LegalEase does not file the petition routes named here; those are separate routes with their own requirements."
];

const IN_SOURCES: readonly string[] = [
  "I.C. 35-38-9-1(a), (b), (e), (f) and (k) (expungement on the court's own motion).",
  "Office of Judicial Administration guidance that court records are not deleted or destroyed under I.C. 35-38-9.",
  "The clerk of the court that handled the charge, for whether an order has been entered.",
  "Indiana criminal history record request, for what a background check returns."
];

export const INDIANA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "in-auto-expungement-guidance": {
    templateId: "in-auto-expungement-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Automatic clearing of a case that ended without a conviction",
    whyNotAFiling:
      "The court orders this expungement on its own motion. No petition is needed and none exists under this part for you to bring, so nothing is generated — this page explains what the order does, when it takes effect, and how to tell the difference between an order that is merely not due yet and one that is genuinely missing.",
    processType: "automatic",
    prerequisites: [
      `You were charged, or alleged delinquent, after ${IN_CHARGE_CUTOFF}.`,
      "The matter ended without a conviction: all charges or allegations dismissed, an acquittal on all charges, a vacatur, a no-true finding, or a year with no disposition.",
      "Nothing else. There is no petition under this part."
    ],
    documentsToObtain: [
      "The chronological case summary or docket for the case, from the clerk.",
      "Your own Indiana criminal history record, for what a background check returns."
    ],
    participantDataToGather: [
      `Whether you were charged, or alleged delinquent, after ${IN_CHARGE_CUTOFF}.`,
      "How the matter ended, and on what date.",
      "Whether the court has already entered an expungement order on its own.",
      "Whether you are currently in a pretrial diversion programme."
    ],
    officialDestination: {
      name: "The court that handled the charge, acting on its own motion",
      detail:
        "The court orders expungement without a petition. There is nothing for the participant to file and no office receives anything from you."
    },
    actionSequence: [
      NOTHING_TO_FILE,
      NOT_DESTROYED,
      TIMING,
      NOT_YET_IS_NOT_FAILURE,
      CASE_FILE_PUBLIC,
      HOW_TO_CHECK,
      "If the clerk confirms an order has been entered, that is your answer, and the criminal history record should follow it rather than the other way round.",
      "If no order has been entered and the period has clearly run — well past sixty days on a dismissal or acquittal, with no delay motion — that is when the petition routes become the sensible next step rather than a duplicate of something already coming.",
      "Keep the two kinds of route apart. This one arrives on the court's own motion for a favourable disposition after the cutoff. The petition routes are filings you bring yourself, they reach records this one does not, and they are where an older case or a conviction goes."
    ],
    submissionMethod: "There is nothing to submit. The court acts on its own motion.",
    fees: "No fee, because there is no filing on this route.",
    feeWaiver: "Not applicable. There is no filing and no fee to waive.",
    noticeOrService: [
      "You serve nobody and notify nobody.",
      "The source review states no participant notice mechanism for the automatic order, which is why asking the clerk is the reliable way to find out."
    ],
    expectedNextStage:
      "The clerk confirms whether an expungement order has been entered, and your criminal history record reflects the restriction.",
    legalEaseCanPrepare: [
      "This explanation of an order that arrives without a petition, and what it does to the record.",
      "The staggered timing, so a record still showing is read correctly rather than as a failure.",
      "The distinction between this route and the petition routes, so the wrong one is not filed."
    ],
    legalEaseCannotPerform: IN_CANNOT_PERFORM,
    escalationTriggers: [
      `The case predates ${IN_CHARGE_CUTOFF}.`,
      "The matter ended in a conviction.",
      "The prosecutor has moved to delay the order.",
      "You are currently in a pretrial diversion programme.",
      "The period has clearly run and no order has been entered."
    ],
    officialSourceReferences: IN_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!INDIANA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Indiana guidance template ${templateId} is registered.`);
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

const INDIANA_STATUSES = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "legal_review_pending"
} as const;

const INDIANA_REQUIRED_INPUTS: readonly RequiredInput[] = [
  {
    key: "chargedAfterJune2022",
    label: "Were you charged, or alleged delinquent, after 30 June 2022?",
    required: true
  },
  {
    key: "disposition",
    label:
      "How did the matter end — all charges dismissed, acquitted, vacated, a no-true finding, or a year with no disposition?",
    required: true
  },
  { key: "dispositionDate", label: "On what date did that happen?", required: true },
  {
    key: "courtHasActed",
    label: "Has the court already entered an expungement order on its own?",
    required: true
  },
  {
    key: "inPretrialDiversion",
    label: "Are you currently participating in a pretrial diversion programme?",
    required: true
  },
  {
    key: "prosecutorMovedToDelay",
    label: "Has the prosecutor moved to delay the expungement order?",
    required: true
  }
];

export const INDIANA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "IN",
    trackId: "in_auto_expungement",
    publicName: "Automatic clearing of a case that ended without a conviction",
    mechanism: "court_ordered_expungement_on_its_own_motion_after_a_favourable_disposition",
    authority: "I.C. 35-38-9-1(a), (b), (e), (f), (k)",
    recordTypes: ["arrest", "charge", "juvenile_allegation", "court_record"],
    dispositions: [
      "all_charges_dismissed",
      "acquitted_all_charges",
      "vacated",
      "no_true_finding",
      "one_year_no_disposition"
    ],
    courtLevel: "court_that_handled_the_charge",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet("in_auto_expungement", "in_auto_expungement-process-guidance-1", "in-auto-expungement-guidance"),
    requiredInputs: INDIANA_REQUIRED_INPUTS,
    statuses: {
      ...INDIANA_STATUSES,
      runtime: computeRuntimeStatus({
        statuses: INDIANA_STATUSES,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "Court-Own-Motion-Expungement-Explainer",
    assembledPacketTitle: "Automatic clearing of a case that ended without a conviction",
    customerDeliverableDescription:
      "A guidance sheet explaining that the court orders expungement on its own motion for a favourable disposition after 30 June 2022 with no petition to bring, that Indiana expungement seals or restricts rather than destroys, that non-prosecution orders take effect immediately while dismissal and acquittal orders take effect not earlier than sixty days with a possible one-year prosecutor delay, that the expungement case file is public until the order is granted, and how to check with the clerk and the criminal history record before filing anything.",
    notes:
      "The adopted design's conclusion that the automatic mechanism requires no participant petition is preserved: no petition under this part is described or generated. Its three packet instructions are carried — never say records are destroyed, because Indiana expungement means sealed or restricted and the Office of Judicial Administration states court records are not deleted or destroyed under the chapter; give the honest timing, with non-prosecution orders immediate, dismissal and acquittal orders not earlier than sixty days and a possible one-year prosecutor delay; and disclose that the expungement case file is public until the order is granted. The sheet's central job is preventing a participant filing the wrong petition merely because the automatic order has not appeared, so delay is distinguished from absence and the Section 1 petition routes are named as the destination only once the period has clearly run. A case predating the cutoff and a conviction are typed route mismatches; a live pretrial diversion programme and a prosecutor delay motion are typed stops with named destinations."
  }
];
