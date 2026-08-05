// Montana process guidance — automatic non-conviction removal, and the two
// searches that tell you what actually happened.
//
// One assigned route. The Department of Justice states that after 1 July 2017
// the state criminal history system automatically removes all non-conviction
// arrest data, and that no Record Removal Form is required. The trigger is the
// court reporting the disposition to the state repository, which the statute
// requires within fourteen business days. Relief is mandatory and automatic,
// there is no waiting period and no case-count limit, and there is no petition,
// application, motion or form for a participant to submit — so nothing is
// generated here.
//
// Montana uses three words that are not interchangeable, and the design
// requires participant copy to keep them apart:
//
//   - EXPUNGEMENT means permanently destroying, deleting or erasing a record
//     from the criminal history record information system the Department
//     maintains.
//   - SEALING is what happens at the courts, the law-enforcement agencies and
//     the prosecutors' offices. It is not destruction.
//   - REMOVAL is the Department's word for deleting a non-conviction record,
//     and removal is what this route does.
//
// The most important practical fact on this route is a limit rather than a
// benefit: a Department removal does not reach public county court records.
// Montana has no centralised court records system, so a participant whose
// Department record is genuinely clear can still find the case sitting on a
// county court portal. That is why the two-portal court search is a required
// step here rather than a suggestion — one search of the district court portal
// and a separate one of the courts of limited jurisdiction portal — and why no
// sheet here promises that every local record disappears.
//
// The only real question this route raises is diagnostic. A record that has not
// been removed is either outside the rule, or it is the product of a court that
// never reported the disposition. The second is a records problem rather than a
// legal one, and its answer is to contact the court of jurisdiction and ask it
// to send the final outcome to the Department. Only after that does the separate
// participant-requested removal route come into play — and that request is a
// different, already-adopted route, not evidence that this automatic mechanism
// has a filing hiding inside it. Nothing here generates it.
//
// What this template never does: turn guidance into a court filing, generate a
// Record Removal Form or any other participant document, promise that county or
// court records will disappear, state that verification is free, or name a
// superseded form or a legacy web address.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Montana is
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
 * the packet proof are integration-owned and name no Montana track, so
 * `MONTANA_COUNSEL_ADOPTED` is false on this branch and the verifier proves it.
 */
export const MONTANA_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const MONTANA_COUNSEL_ADOPTED = false;

/** The date the automatic removal practice runs from. */
export const MT_AUTOMATIC_FROM = "1 July 2017";

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not answer this participant; a destination is named. */
export class MontanaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MontanaGuidanceStopError";
  }
}

/** The participant belongs on a different Montana route, which is named. */
export class MontanaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MontanaRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class MontanaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "MontanaBranchError";
  }
}

export const MT_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** How the matter ended. Only non-convictions are removed automatically. */
export const MT_DISPOSITIONS: Readonly<Record<string, string>> = {
  charges_dismissed: "the charges were dismissed",
  deferred_prosecution_dismissed: "a deferred prosecution ended in dismissal",
  acquitted: "you were acquitted",
  charges_dropped: "the charges were dropped",
  charges_not_filed: "charges were never filed",
  released_without_charges: "you were released without charges",
  convicted: "convicted",
  revoked_deferred: "revoked_deferred"
};

/** Whether the disposition falls on or after the automatic-practice date. */
export const MT_DISPOSITION_PERIOD: Readonly<Record<string, string>> = {
  on_or_after_1_july_2017: "on_or_after_1_july_2017",
  before_1_july_2017: "before_1_july_2017",
  unsure: "unsure"
};

/** What the state criminal history check showed. */
export const MT_CHECK_RESULT: Readonly<Record<string, string>> = {
  no_longer_appears: "no_longer_appears",
  still_appears: "still_appears",
  have_not_checked: "have_not_checked"
};

const MT_REQUEST_ROUTE =
  "the separate Montana non-conviction record removal request route, which is its own adopted route with its own form — this page does not generate it";
const MT_COURT_SEAL_ROUTE =
  "the Montana court record sealing routes, which are what reach a court file";
const MT_COURT =
  "the court of jurisdiction that handled the case, asking it to send the final outcome to the Department of Justice";
const MT_HELP =
  "a Montana legal aid organisation or a public defender records clinic";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new MontanaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Montana stops, and routes to the
 * correct Montana mechanism.
 *
 * A record still showing is deliberately not a stop. The design says the only
 * real question is whether a record that has not been removed is ineligible or
 * is the product of a court that never reported the disposition — a records
 * problem — and answering that is what this sheet is for.
 */
export function deriveMontanaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (branch(trackId, "usCitizen", MT_YES_NO, facts.usCitizen).resolved === false) {
    throw new MontanaGuidanceStopError(
      trackId,
      "participant_is_not_a_us_citizen",
      "How an arrest record is treated for immigration purposes is decided under federal law, and a record removed from the state system does not necessarily read as removed federally. The sequence matters and it needs advice before any record step.",
      `an immigration lawyer before relying on any removal, and only then ${MT_HELP}`
    );
  }

  const disposition = branch(trackId, "dispositionType", MT_DISPOSITIONS, facts.dispositionType);
  if (disposition.value === "convicted") {
    throw new MontanaRouteMismatchError(
      trackId,
      "matter_ended_in_a_conviction",
      "This route removes non-conviction arrest data. A conviction is not non-conviction data, and nothing about it is removed automatically.",
      `${MT_COURT_SEAL_ROUTE}, and ${MT_HELP} to identify which Montana route reaches a conviction`
    );
  }
  if (disposition.value === "revoked_deferred") {
    throw new MontanaGuidanceStopError(
      trackId,
      "revoked_deferred_sentence_or_prosecution",
      "Where a deferred sentence or a deferred prosecution was revoked, the favourable ending the automatic removal depends on did not happen. What the record now shows follows the revocation rather than the original deferral.",
      `${MT_HELP}, taking the docket showing the revocation, to work out what remains available for the record as it now stands`
    );
  }
  derived.dispositionAllegation = disposition.resolved;

  const period = branch(trackId, "dispositionPeriod", MT_DISPOSITION_PERIOD, facts.dispositionPeriod);
  if (period.value === "before_1_july_2017") {
    throw new MontanaRouteMismatchError(
      trackId,
      "disposition_predates_the_automatic_practice",
      `The automatic removal applies to dispositions on or after ${MT_AUTOMATIC_FROM}. An earlier one was not swept up by it, which does not mean the record cannot be removed — only that it will not happen on its own.`,
      MT_REQUEST_ROUTE
    );
  }
  derived.dispositionPeriod = period.value;

  if (branch(trackId, "courtWillNotReport", MT_YES_NO, facts.courtWillNotReport).resolved) {
    throw new MontanaGuidanceStopError(
      trackId,
      "court_will_not_report_the_disposition",
      "The whole mechanism is triggered by the court reporting the disposition to the state repository. Where the court will not do that, the automatic removal has nothing to act on, and no amount of waiting changes it.",
      `${MT_HELP}, taking the docket and a note of who you spoke to at the court, because a court refusing to report a disposition is a problem that needs someone able to press it`
    );
  }

  if (branch(trackId, "needsCourtRecordAddressed", MT_YES_NO, facts.needsCourtRecordAddressed).resolved) {
    throw new MontanaRouteMismatchError(
      trackId,
      "participant_needs_the_court_record_addressed",
      "This route reaches the Department's criminal history record and nothing else. If what is hurting you is the case sitting on a county court portal, removal from the state system will not take it down — Montana has no centralised court records system and the court file is its own thing.",
      MT_COURT_SEAL_ROUTE
    );
  }

  derived.checkResult = branch(
    trackId,
    "stillShowingOnChoprs",
    MT_CHECK_RESULT,
    facts.stillShowingOnChoprs
  ).value;

  return derived;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route. The Department of Justice states that after 1 July 2017 the state criminal history system automatically removes all non-conviction arrest data, and that no Record Removal Form is required. Nobody should be selling you a form for it.";

const THREE_WORDS =
  "Montana uses three words that are not interchangeable, and mixing them up is how people end up disappointed. Expungement means permanently destroying a record from the Department's criminal history system. Sealing is what happens at the courts, the law-enforcement agencies and the prosecutors' offices, and it is not destruction. Removal is the Department's word for deleting a non-conviction record, and removal is what this route does.";

const TRIGGER =
  "What sets it off is the court reporting the disposition to the state repository, which the statute requires within fourteen business days. There is no waiting period beyond that, no limit on how many cases it reaches, and no application.";

const DOES_NOT_REACH_COURT_RECORDS =
  "Here is the limit that matters most, and this page will not soften it: a Department removal does not reach public county court records. Montana has no centralised court records system, so you can have a genuinely clear Department record and still find the case on a county court portal.";

const TWO_PORTAL_SEARCH =
  "So two court searches are a required step, not a suggestion. Search the Montana Public Access Portal for District Courts, and then search separately for the Courts of Limited Jurisdiction. They are different portals and one does not cover the other. Some misdemeanour convictions do not appear on the state background check at all.";

const HOW_TO_VERIFY =
  "Verify through the current Montana criminal history record check rather than by guessing. Expect a hold of up to seventy-two hours on the request. There is a fee for the background check itself — this page does not quote it, so confirm the current amount with the Department when you order. LegalEase does not obtain, receive or inspect your record; you request and read your own.";

const IF_IT_PERSISTS =
  "If the record still shows, the question is not whether the law failed you but whether the court ever reported the disposition. That is a records problem rather than a legal one. Contact the court of jurisdiction and ask it to send the final outcome to the Department of Justice — and only if that does not resolve it does the separate participant-requested removal route come into play. That request is its own adopted route with its own form, and this page does not generate it; a fallback request existing is not evidence that this automatic route has a filing hidden inside it.";

const MT_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot remove, seal or expunge anything, and cannot make a court or the Department of Justice act.",
  "LegalEase cannot tell you whether you qualify, and never asserts that a particular record has or has not been removed.",
  "LegalEase does not obtain, receive, inspect or hold your criminal history record. You request and read your own.",
  "LegalEase does not generate a Record Removal Form on this route, and does not file the separate request or court sealing routes named here."
];

const MT_SOURCES: readonly string[] = [
  "Mont. Code Ann. § 44-5-202 and § 44-5-213; Ch. 321, L. 2017 (automatic non-conviction removal).",
  "Mont. Code Ann. § 46-18-1103(1) (expungement) and § 46-18-1110(2)(a) (sealing at courts and agencies).",
  "Montana Department of Justice, Non-Conviction Removal and Sealing information, and the current criminal history record check.",
  "Montana Public Access Portal for District Courts, and the separate portal for Courts of Limited Jurisdiction."
];

export const MONTANA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "mt-auto-nonconviction-guidance": {
    templateId: "mt-auto-nonconviction-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Automatic removal of a non-conviction arrest, and the records it does not reach",
    whyNotAFiling:
      "The Department of Justice removes non-conviction arrest data from the state criminal history system without any request, once the court reports the disposition. There is no petition, application, motion or form for you to submit, so nothing is generated — this page explains what is removed, what is not, and how to check.",
    processType: "agency",
    prerequisites: [
      `The matter ended without a conviction and the disposition is on or after ${MT_AUTOMATIC_FROM}.`,
      "The court reported, or will report, the disposition to the state repository.",
      "Nothing else. There is no application and no form on this route."
    ],
    documentsToObtain: [
      "Your Montana criminal history record, through the current record-check process.",
      "The docket for the case, if you need to confirm the disposition and its date."
    ],
    participantDataToGather: [
      "Your full legal name and any aliases the record might be under, and your date of birth.",
      "The arrest date, the arresting agency, and the county and city of arrest.",
      "What you were charged with, how it ended, and on what date.",
      "Which court handled the case.",
      "Whether the non-conviction still appears on your Montana criminal history record."
    ],
    officialDestination: {
      name: "The Montana Department of Justice criminal history system, acting on the court's disposition report",
      detail:
        "No submission is made by the participant. The Department states that no Record Removal Form is required for a post-2017 non-conviction. Where the record persists, the participant contacts the court of jurisdiction and asks it to send the final outcome to the Department."
    },
    actionSequence: [
      NOTHING_TO_FILE,
      THREE_WORDS,
      TRIGGER,
      DOES_NOT_REACH_COURT_RECORDS,
      TWO_PORTAL_SEARCH,
      HOW_TO_VERIFY,
      IF_IT_PERSISTS,
      "Keep the four things apart, because they are separate and only one of them happens by itself: the automatic removal described here; the participant-requested removal, which is its own route with its own form; sealing a court record, which is a different remedy at a different place; and the Department's criminal history record, which is not the same as a county court file."
    ],
    submissionMethod:
      "There is nothing to submit. The Department acts on the court's disposition report, and no Record Removal Form is required on this route.",
    fees:
      "No fee for the removal itself, because nothing is filed. The background check you use to verify has its own fee, which this page does not quote — confirm the current amount with the Department.",
    feeWaiver: "None established for the record check. Ask the Department when you order it.",
    noticeOrService: [
      "You serve nobody and notify nobody. There is no notice, no objection period and no hearing.",
      "Nobody is required to tell you when a record has been removed, which is why checking is the participant's part."
    ],
    expectedNextStage:
      "Your Montana criminal history record no longer shows the non-conviction, and you know separately what each of the two court portals shows.",
    legalEaseCanPrepare: [
      "This explanation of what is removed automatically and what is untouched by it.",
      "The two-portal court search, which is the step people skip and then get surprised by.",
      "The diagnosis for a record that persists: a court that never reported, rather than a law that failed."
    ],
    legalEaseCannotPerform: MT_CANNOT_PERFORM,
    escalationTriggers: [
      "The court will not report the disposition to the Department.",
      "You are not a US citizen.",
      "You need the court record addressed, which this route does not reach.",
      "A deferred sentence or deferred prosecution was revoked."
    ],
    officialSourceReferences: MT_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!MONTANA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Montana guidance template ${templateId} is registered.`);
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

const MT_STATUSES = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "legal_review_pending"
} as const;

const MT_REQUIRED_INPUTS: readonly RequiredInput[] = [
  { key: "fullName", label: "What is your full legal name, and any aliases the record might be under?", required: true },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  { key: "arrestDate", label: "On what date were you arrested?", required: true },
  { key: "arrestingAgency", label: "Which agency arrested you?", required: true },
  { key: "arrestCountyCity", label: "In which county and city were you arrested?", required: true },
  { key: "charges", label: "What were you charged with?", required: true },
  { key: "dispositionType", label: "How did it end?", required: true },
  { key: "dispositionDate", label: "On what date did it end that way?", required: true },
  {
    key: "dispositionPeriod",
    label: "Was that disposition on or after 1 July 2017, or before it?",
    required: true
  },
  { key: "courtOfJurisdiction", label: "Which court handled the case?", required: true },
  {
    key: "stillShowingOnChoprs",
    label: "After running a Montana criminal history check, does the non-conviction still appear?",
    required: true
  },
  {
    key: "courtWillNotReport",
    label: "Has the court said it will not report the disposition to the Department of Justice?",
    required: true
  },
  {
    key: "needsCourtRecordAddressed",
    label: "Do you need the court record itself addressed, rather than the state criminal history record?",
    required: true
  },
  { key: "usCitizen", label: "Are you a United States citizen?", required: true }
];

export const MONTANA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "MT",
    trackId: "mt_auto_nonconviction",
    publicName: "Automatic non-conviction removal",
    mechanism: "automatic_department_removal_of_non_conviction_arrest_data_on_the_courts_disposition_report",
    authority: "Mont. Code Ann. § 44-5-202; § 44-5-213; Ch. 321, L. 2017",
    recordTypes: ["arrest", "criminal_history_record"],
    dispositions: [
      "charges_dismissed",
      "deferred_prosecution_dismissed",
      "acquitted",
      "charges_dropped",
      "charges_not_filed",
      "released_without_charges"
    ],
    courtLevel: "not_a_court_process",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet("mt_auto_nonconviction", "mt_auto_nonconviction-process-guidance-1", "mt-auto-nonconviction-guidance"),
    requiredInputs: MT_REQUIRED_INPUTS,
    statuses: {
      ...MT_STATUSES,
      runtime: computeRuntimeStatus({
        statuses: MT_STATUSES,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "Automatic-Non-Conviction-Removal-Verification",
    assembledPacketTitle: "Automatic removal of a non-conviction arrest, and the records it does not reach",
    customerDeliverableDescription:
      "A guidance sheet explaining that the Department of Justice automatically removes post-2017 non-conviction arrest data with no Record Removal Form required, keeping expungement, sealing and removal apart, stating that the removal does not reach public county court records and that both Montana court portals must be searched separately, describing the current verification process with its hold and its own fee, and diagnosing a persistent record as a court that never reported the disposition.",
    notes:
      "The design's packet instructions are carried in full. Montana's three words are kept apart: expungement is permanent destruction from the Department's system, sealing is what happens at courts, agencies and prosecutors' offices and is not destruction, and removal is the Department's term for deleting a non-conviction record. The sheet states that a Department removal does not reach public county court records because Montana has no centralised court records system, and treats the two-portal court search as a required participant step rather than a suggestion. No Record Removal Form is generated for this route, and no superseded form or legacy web address is named. The participant-requested removal is identified as a separate adopted route with its own form, which this job does not generate, and the sheet says the fallback request is not evidence that the automatic mechanism has a filing. Verification is described through the current criminal history process with its up-to-seventy-two-hour hold, and the background-check fee is acknowledged without quoting an amount rather than claiming the process is free. A record still showing is deliberately not a stop: the design records the only real question as whether an unremoved record is ineligible or the product of a court that failed to report, which is a records problem, so the sheet routes to the court of jurisdiction first."
  }
];
