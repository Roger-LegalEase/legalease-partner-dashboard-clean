// New Jersey process guidance — one route, and the whole of its value is
// telling a participant that the thing they have heard about is not running.
//
// `nj_automated_clean_slate` is the automated "Clean Slate" process at
// N.J.S.A. 2C:52-5.4. The section directs the State to develop and implement
// an automated process by which all convictions and related records are
// rendered inaccessible to the public — by sealing, expungement or an
// equivalent process — for a person convicted of one or more crimes or
// offences, unless the person has a conviction not subject to expungement
// under N.J.S.A. 2C:52-2(b) or (c), upon the expiration of ten years. A task
// force was established to design it and reported in 2022. The process does
// not exist. Assembly Bill A5095, introduced on 14 May 2026, says so in terms:
// eligible people must still file a petition with the court, and the bill
// would require any backlog to be cleared before 1 January 2030.
//
// So nothing is filed on this track and nothing can be, because there is
// nothing to file into. The design keeps the node as a real participant-facing
// deliverable rather than a status note, and the reason is practical: somebody
// who has been told that New Jersey clears records automatically after ten
// years will otherwise wait for something that is not running, while the
// petition route that is running stays open and costs nothing to file.
//
// Three sheets, and the design names each:
//
//   - **Status.** What the section actually directs, that it has not been
//     implemented, and how that is known — from the Legislature's own bill,
//     not from an absence of news. The petition alternative is named as the
//     thing to use, and it is a separate route in the New Jersey intake.
//   - **Monitoring.** Where the answer would change, and the reason to watch
//     it is sharper than curiosity: when the automated process is established
//     the Clean Slate petition route closes by operation of N.J.S.A.
//     2C:52-5.3. Waiting therefore risks losing the route that works.
//   - **Restoration risk.** N.J.S.A. 2C:52-5.4 requires that a person's
//     convictions and criminal history be restored in certain circumstances
//     if the person is subsequently convicted of a crime not subject to
//     expungement. The design records that this appears in no internal
//     reference, and it is the one disclosure on this track that could change
//     what somebody does next.
//
// Four boundaries the design fixes and this module holds:
//
//   - **Expungement in New Jersey isolates rather than destroys.** N.J.S.A.
//     2C:52-1 defines it as the extraction and isolation of criminal justice
//     records. In most contexts the person may then answer that the event did
//     not occur, but certain law enforcement, judicial and specified licensing
//     uses survive under N.J.S.A. 2C:52-27.
//   - **Title 39 is outside the chapter entirely.** N.J.S.A. 2C:52-28 puts
//     motor vehicle matters, including driving while intoxicated, outside
//     chapter 52. The design requires that exclusion on every screen and
//     script, so it is a typed route mismatch here rather than a footnote.
//   - **New Jersey records only, and no federal immigration effect.** An
//     out-of-state or federal conviction is untouched by New Jersey relief and
//     still counts when eligibility and the offence counts are assessed.
//   - **No second automatic remedy is invented.** This page describes one
//     statutory scheme that has not been implemented. It does not suggest an
//     alternative automatic route, and where the design leaves a question open
//     — whether any partial automation is already running for cannabis records
//     under N.J.S.A. 2C:52-5.2 and 2C:52-6.1 — the page says it is open.
//
// No conditional component and no fact placeholder appears here: the adopted
// packet set makes all three components required and no template interpolates
// a participant answer, so a second fixture on this track would render
// byte-for-byte the same packet. The branches that matter are typed stops, and
// all six are exercised as negative cases in the committed verifier.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. New Jersey
// is not an enabled jurisdiction and this job does not enable one. The
// petition routes and their official court forms belong to other jobs, are not
// named here, and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** New Jersey legal help, named once so no stop is a dead end. */
const NJ_LEGAL_HELP =
  "a New Jersey legal aid office, a New Jersey law school legal clinic, an expungement clinic run by a county bar association, or a New Jersey attorney who does record-clearing work";

/** The petition alternative, named the same way by every stop that points at it. */
const NJ_PETITION_ROUTES =
  "the New Jersey petition routes, which are separate routes in the New Jersey intake";

/** The office that publishes an individual record's expungement status. */
const NJSP_PORTAL =
  "the New Jersey State Police expungement status portal";

// ---------------------------------------------------------------------------
// Shared participant copy
// ---------------------------------------------------------------------------

/** No sheet reports on the participant's own record. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page explains how a process works. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether a particular record qualifies.";

/** The position, stated from the statute and from a bill rather than from silence. */
const WHERE_THE_AUTOMATION_STANDS =
  "The position, stated plainly and with the reason it is known. New Jersey's Clean Slate law directs the State to build an automated process that would render qualifying convictions and their related records inaccessible to the public after ten years, at N.J.S.A. 2C:52-5.4. A task force was set up to design it and reported in 2022. The process does not exist. That is not an inference from an absence of announcements: Assembly Bill A5095, introduced in the Legislature on 14 May 2026, states that the automated process still does not exist and that eligible people must still file a petition with the court.";

/** The petition alternative, which is the actionable half of every sheet. */
const THE_PETITION_ROUTE_IS_OPEN =
  "What is open, and it is open today. Expungement on petition to the court runs now and is what the New Jersey intake serves. The Judiciary's own self-help material states that there is no filing fee for an expungement application, and applications are made through the courts' electronic expungement system. Those routes are separate routes in the New Jersey intake and are not prepared on this page, but nothing here is a reason to wait instead of asking about them.";

/** Expungement isolates. It does not destroy, and it is not total. */
const ISOLATION_NOT_DESTRUCTION =
  "One thing to get straight about what New Jersey expungement is, because the word promises more than the statute delivers. N.J.S.A. 2C:52-1 defines expungement as the extraction and isolation of criminal justice records, not their destruction. In most contexts a person whose record has been expunged may answer that the event did not occur. But certain law enforcement, judicial and specified licensing uses survive under N.J.S.A. 2C:52-27, so the record is put out of ordinary reach rather than out of existence.";

/** Reach: New Jersey records only, and out-of-state history still counts. */
const REACH_AND_LIMITS =
  "Two limits on reach that matter more than they sound. New Jersey relief clears New Jersey records; a federal or out-of-state record is untouched by it. But an out-of-state or federal conviction still counts when eligibility is assessed and when offences are counted, so a record New Jersey cannot clear can still decide what New Jersey will clear. And New Jersey expungement has no federal immigration effect at all.";

/** Title 39 is outside chapter 52 entirely. */
const TITLE_39_IS_OUTSIDE =
  "The exclusion most people are surprised by. Motor vehicle matters under Title 39, including driving while intoxicated, are put outside the expungement chapter entirely by N.J.S.A. 2C:52-28. That is not a waiting period and not a discretion; those matters are not within the chapter this page describes, and no route on this page reaches one.";

/** Nothing is filed here, and nothing can be. */
const NOTHING_CAN_BE_FILED =
  "Nothing is filed on this route and nothing can be, because there is nowhere to file it and no process to file into. LegalEase generates no petition, motion, application, request or letter here. What this page does is tell you where the process actually stands, so that you can decide what to do with that.";

/** The residuals, stated on every sheet rather than buried on one. */
const WHAT_IS_STILL_OPEN =
  "Now the limits of this page, stated rather than buried. When the automated process will be established is not knowable from anything published, and this page does not guess at a date. Whether A5095 or any companion bill will pass is not established. And whether any partial automation is already running separately for cannabis records, under N.J.S.A. 2C:52-5.2 and 2C:52-6.1, was left open and is not resolved here. Nothing on this page fills any of that with a guess.";

const NJ_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge, seal or remove anything, and cannot make a court, a clerk, a prosecutor or a records agency act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains how a process works; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been expunged or sealed. Only a check of your own record shows that, and you are the one who reads it.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when the automated process will start working. No date for it is published, and this page does not invent one.",
  "LegalEase does not prepare a petition on this route, because there is no petition on this route to prepare."
];

const NJ_SOURCES: readonly string[] = [
  "N.J.S.A. 2C:52-5.4, the automated Clean Slate process, as enacted by P.L.2019, c.269.",
  "P.L.2019, c.269, the expungement reform act, enacted text read at the New Jersey Legislature on 6 August 2026.",
  "Assembly Bill A5095, 222nd Legislature, introduced 14 May 2026 — \"Implements procedures for automated 'Clean Slate' expungements\" — read at the New Jersey Legislature on 6 August 2026. It states that the automated process still does not yet exist.",
  "N.J.S.A. 2C:52-1, which defines expungement as extraction and isolation; N.J.S.A. 2C:52-27, which sets out the uses that survive; and N.J.S.A. 2C:52-28, which puts Title 39 motor vehicle matters outside the chapter.",
  "Expunging Your Court Record, New Jersey Courts self-help, read on 6 August 2026.",
  "New Jersey State Police expungement status portal, read on 6 August 2026."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class NewJerseyGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NewJerseyGuidanceStopError";
  }
}

/** Raised where an honest answer belongs somewhere other than this route. */
export class NewJerseyRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NewJerseyRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class NewJerseyBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "NewJerseyBranchError";
  }
}

export const NJ_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** New Jersey chapter 52 relief reaches New Jersey records and nothing else. */
export const NJ_RECORD_JURISDICTIONS: Readonly<Record<string, string>> = {
  new_jersey_state: "within",
  another_state: "outside",
  federal: "outside",
  tribal: "outside"
};

/** Title 39 sits outside the chapter, so the matter type is a gate, not a detail. */
export const NJ_MATTER_TYPES: Readonly<Record<string, string>> = {
  indictable_crime: "within",
  disorderly_persons_offence: "within",
  municipal_ordinance_violation: "within",
  title_39_motor_vehicle_or_dwi: "outside"
};

/** What the participant intends to do with the answer. */
export const NJ_WAITING_INTENT: Readonly<Record<string, string>> = {
  waiting_for_automatic_clearing: "waiting",
  asking_about_the_petition_routes: "petitioning",
  not_decided_yet: "undecided"
};

/** Whether the participant has looked at the State Police status portal. */
export const NJ_PORTAL_CHECK: Readonly<Record<string, string>> = {
  checked_it: "checked",
  not_checked_it: "unchecked"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new NewJerseyBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers and routes to the correct New Jersey node.
 *
 * The order is the design's own list of self-help stop conditions, with the
 * two boundary questions first because they decide whether chapter 52 is in
 * play at all: record jurisdiction, then Title 39, then immigration exposure,
 * then the reliance question this whole track exists to answer, then the
 * restoration rule, then any request for an eligibility opinion.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveNewJerseyGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. New Jersey relief reaches New Jersey records.
  const jurisdiction = branch(
    trackId,
    "recordJurisdiction",
    NJ_RECORD_JURISDICTIONS,
    facts.recordJurisdiction
  );
  if (jurisdiction.resolved === "outside") {
    throw new NewJerseyRouteMismatchError(
      trackId,
      "record_is_not_a_new_jersey_state_record",
      "New Jersey's expungement chapter reaches New Jersey records. It does not reach a federal, tribal or out-of-state record, and neither the automated process nor the petition routes touch one. Worth knowing all the same: a conviction New Jersey cannot clear still counts when New Jersey eligibility and offence counts are worked out.",
      "the state, federal or tribal authority that holds the record, and " + NJ_LEGAL_HELP,
      "Take the record to that authority and ask what its own law provides for clearing it. If you also have New Jersey matters, those are handled separately and only those are served here."
    );
  }

  // Gate 2. Title 39 is outside chapter 52 entirely.
  const matter = branch(trackId, "matterType", NJ_MATTER_TYPES, facts.matterType);
  if (matter.resolved === "outside") {
    throw new NewJerseyRouteMismatchError(
      trackId,
      "title_39_motor_vehicle_matter_is_outside_the_expungement_chapter",
      "A Title 39 motor vehicle matter, and that includes driving while intoxicated, is put outside the expungement chapter entirely by N.J.S.A. 2C:52-28. This is not a waiting period you can serve or a discretion somebody might exercise in your favour. The automated process is a process within that chapter, so it would not reach the matter either, and no route on this page does.",
      NJ_LEGAL_HELP,
      "Ask one of them whether anything outside the expungement chapter reaches a Title 39 matter. Take the abstract or the judgment with you so the question is asked about the actual charge rather than about the label."
    );
  }

  // Gate 3. Immigration, which New Jersey relief does not touch.
  const immigration = branch(
    trackId,
    "immigrationExposure",
    NJ_YES_NO,
    facts.immigrationExposure
  );
  if (immigration.resolved) {
    throw new NewJerseyGuidanceStopError(
      trackId,
      "immigration_exposure_in_play",
      "New Jersey expungement has no federal immigration effect. A record cleared under chapter 52 is still available to federal authorities, so a decision made on the assumption that clearing it solves an immigration problem is a decision made on a false basis. That is a reason to get the immigration advice first and the record advice second, rather than the other way round.",
      "an immigration attorney, and afterwards " + NJ_LEGAL_HELP,
      "Speak to an immigration attorney about the record before you plan anything around clearing it, and take the disposition for every case with you."
    );
  }

  // Gate 4. The reliance this track exists to correct.
  const intent = branch(trackId, "waitingIntent", NJ_WAITING_INTENT, facts.waitingIntent);
  if (intent.resolved === "waiting") {
    throw new NewJerseyGuidanceStopError(
      trackId,
      "relying_on_automatic_clearing_that_does_not_exist",
      "Waiting for New Jersey's automatic clearing instead of applying is the one decision this page exists to prevent. The automated process at N.J.S.A. 2C:52-5.4 has not been built: Assembly Bill A5095, introduced on 14 May 2026, states that it still does not exist and that eligible people must still file a petition with the court. No date for it is published. And there is a sting in the tail — when the automated process is established, the Clean Slate petition route closes by operation of N.J.S.A. 2C:52-5.3, so waiting risks losing the route that currently works rather than shortening it.",
      NJ_PETITION_ROUTES + ", and " + NJ_LEGAL_HELP,
      "Go back to the New Jersey intake and ask about the petition routes. Decide to wait only after somebody has looked at your actual record and told you what waiting would be for."
    );
  }

  // Gate 5. The restoration rule, which the design requires be disclosed.
  const restoration = branch(
    trackId,
    "convictedSinceAPreviousClearance",
    NJ_YES_NO,
    facts.convictedSinceAPreviousClearance
  );
  if (restoration.resolved) {
    throw new NewJerseyGuidanceStopError(
      trackId,
      "restoration_of_a_previously_cleared_record_is_in_play",
      "This is the disclosure on this track that can change what somebody does next. N.J.S.A. 2C:52-5.4 requires that a person's convictions and criminal history be restored in certain circumstances where the person is subsequently convicted of a crime not subject to expungement. Which circumstances those are, and whether they reach a particular history, is an individualised legal judgment about your whole record rather than about one case, and this page does not make it.",
      NJ_LEGAL_HELP,
      "Take the whole history — what was cleared, when, and everything that has happened since — to one of them and ask what the restoration rule means for it before you rely on anything being out of reach."
    );
  }

  // Gate 6. Eligibility opinions are not what a page can give.
  const advice = branch(
    trackId,
    "wantsEligibilityAdvice",
    NJ_YES_NO,
    facts.wantsEligibilityAdvice
  );
  if (advice.resolved) {
    throw new NewJerseyGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      "Whether a particular record qualifies is an individualised legal judgment, and under this scheme it is a hard one. The automated process would exclude anybody with a conviction not subject to expungement under N.J.S.A. 2C:52-2(b) or (c), the offence counts are worked out across a whole history rather than one case, and out-of-state and federal convictions count towards them even though New Jersey cannot clear those records. This guidance explains where the process stands; it does not decide eligibility.",
      NJ_LEGAL_HELP,
      "Ask one of them for an eligibility opinion, and bring a full list of every case in every state so the counting is done on the real history."
    );
  }

  // Not a stop, but the answer the monitoring sheet is written against.
  const portal = branch(trackId, "portalCheck", NJ_PORTAL_CHECK, facts.portalCheck);
  derived.njPortalAlreadyChecked = portal.resolved === "checked";

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

type SheetInput = {
  templateId: string;
  mechanismName: string;
  whyNotAFiling: string;
  prerequisites: readonly string[];
  documentsToObtain: readonly string[];
  gather: readonly string[];
  destination: { name: string; detail: string };
  sequence: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  escalations: readonly string[];
  noticeOrService: readonly string[];
};

/**
 * Builds one sheet.
 *
 * `fees`, `feeWaiver` and `submissionMethod` are shared because all three
 * sheets describe the same statutory scheme, in which there is no filing and
 * therefore nothing to charge for. `noticeOrService` is required per sheet
 * rather than defaulted: notice is the one thing that differs in emphasis
 * between describing a process that does not run and describing what would
 * happen if it did, and a shared default is exactly how one sheet's law ends
 * up on another's page.
 */
function sheet(input: SheetInput): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: "automatic",
    prerequisites: [...input.prerequisites],
    documentsToObtain: [...input.documentsToObtain],
    participantDataToGather: [...input.gather],
    officialDestination: input.destination,
    actionSequence: [...input.sequence],
    submissionMethod:
      "There is nothing to submit and nowhere to submit it. No petition, motion, application, request or letter is generated on this route, and nothing is sent on your behalf.",
    fees:
      "None on this route, because there is nothing on it to pay for. The petition alternative is where any cost would sit, and the Judiciary's own self-help material states that there is no filing fee for an expungement application. Obtaining copies of your own records from a court or an agency is a separate service that may carry its own charge.",
    feeWaiver:
      "Not applicable on this route. There is no fee here to waive, because there is nothing here to file.",
    noticeOrService: [...input.noticeOrService],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: [...input.canPrepare],
    legalEaseCannotPerform: NJ_CANNOT_PERFORM,
    escalationTriggers: [...input.escalations],
    officialSourceReferences: NJ_SOURCES
  };
}

const NJ_COMMON_ESCALATIONS: readonly string[] = [
  "The record is a federal, tribal or out-of-state record.",
  "The matter is a Title 39 motor vehicle matter or a driving while intoxicated matter.",
  "Your immigration status could be affected by the record.",
  "You want advice about whether a particular record qualifies."
];

export const NEW_JERSEY_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "nj-automated-clean-slate-status-disclosure": sheet({
    templateId: "nj-automated-clean-slate-status-disclosure",
    mechanismName: "New Jersey's automatic Clean Slate clearing, and where it stands",
    whyNotAFiling:
      "Nothing is filed by you and nothing can be. The automated Clean Slate process at N.J.S.A. 2C:52-5.4 is something the State was directed to build, and it has not been built. There is no application, no form and no queue to join, so LegalEase generates nothing here. What this page does is tell you the true status and point you at the route that is running.",
    prerequisites: [
      "The record is a New Jersey record.",
      "You have heard, or been told, that New Jersey clears records automatically after ten years.",
      "You are willing to be told that it does not yet."
    ],
    documentsToObtain: [
      "A list of every case you have, in New Jersey and anywhere else, with the county, the court and how each one ended. Eligibility under this scheme is counted across a whole history rather than one case."
    ],
    gather: [
      "Exactly what you were told about automatic clearing, and who told you.",
      "Whether each New Jersey matter was an indictable crime, a disorderly persons offence or a municipal ordinance violation.",
      "Whether any of your matters is a Title 39 motor vehicle matter, because those sit outside the chapter.",
      "Whether you have a deadline of your own — a job, a licence, a housing application — and when it falls."
    ],
    destination: {
      name: "The State of New Jersey, if and when the automated process is established",
      detail:
        "Nothing is submitted anywhere on this route and nothing can be, because the process the statute directs does not exist. For an individual record's expungement status the place to look is the New Jersey State Police expungement status portal. LegalEase contacts nobody about your case."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      WHERE_THE_AUTOMATION_STANDS,
      "What the section would do if it were built, so that you know what is being waited for. It directs the State to develop and implement an automated process by which convictions and their related records are rendered inaccessible to the public — through sealing, expungement or an equivalent process — for a person convicted of one or more crimes or offences, once ten years have expired. It excludes anybody who has a conviction that is not subject to expungement under N.J.S.A. 2C:52-2(b) or (c).",
      "How far the work has actually got. A task force was established to design the automated process and reported in 2022. A5095 would implement procedures for it and would require any backlog to be cleared before 1 January 2030. A bill that has been introduced is not a law, and this page does not treat it as one; what it does establish, because the Legislature says it in the bill's own text, is that the automation is not running now.",
      "What that means for the thing you were probably told. The ten-year period in the section describes when the automated process would reach a record once the process exists. It is not a rule that something happens to a record at the ten-year mark today, and it is not a queue you are already standing in. If somebody has told you that ten years have passed and your record is therefore dealt with, the useful next question is which process they think did it, because the one this page is about has not been built.",
      THE_PETITION_ROUTE_IS_OPEN,
      "And the reason that is more urgent than it sounds. When the automated process is established, the Clean Slate petition route closes by operation of N.J.S.A. 2C:52-5.3. So the two routes are not a choice between a slow free one and a fast paid one that will both stay available. Waiting risks losing the one that works today.",
      ISOLATION_NOT_DESTRUCTION,
      TITLE_39_IS_OUTSIDE,
      REACH_AND_LIMITS,
      WHAT_IS_STILL_OPEN,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "The next sheet is about what to watch and where, so that checking back is a plan with a date rather than an open wait. The last sheet is the one disclosure on this track that can change what you do: the rule that can put a cleared record back.",
    canPrepare: [
      "This account of what the Clean Slate section directs and of why it is not running, written from the statute and from the Legislature's own bill rather than from a news report.",
      "The warning that the petition route closes when the automation arrives, which is the reason waiting is not free.",
      "The explanation of what New Jersey expungement actually does, which is isolation rather than destruction.",
      "The monitoring sheet that follows it in this packet, and the restoration-risk sheet after that.",
      "A plain statement of what is still open, so that you are not relying on a confident answer nobody has."
    ],
    escalations: [
      ...NJ_COMMON_ESCALATIONS,
      "Somebody has told you that a record of yours will be cleared automatically on a particular date.",
      "You are deciding whether to wait rather than apply, and something turns on the answer.",
      "A record was cleared for you before and you have been convicted of something since."
    ],
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve on this route.",
      "Nobody is required to write and tell you that a record has been cleared, and no notice arrives when it happens.",
      "Because the automated process does not exist, there is no notice it could send you either."
    ]
  }),

  "nj-automated-clean-slate-monitoring": sheet({
    templateId: "nj-automated-clean-slate-monitoring",
    mechanismName: "What to watch, where to check it, and when to stop waiting",
    whyNotAFiling:
      "This page sets expectations against a statutory direction that has not yet produced a process. Nothing on it is filed and nothing on it is generated for you to sign.",
    prerequisites: [
      "You have read the sheet before this one and know that the automation is not running.",
      "You want to know what would change the answer rather than to be told to be patient."
    ],
    documentsToObtain: [
      "A dated record of what the State Police expungement status portal showed for you, kept so that a later look can be compared against it."
    ],
    gather: [
      "The date you last checked the State Police expungement status portal, and what it showed.",
      "Anything an official source tells you about automatic clearing, and the date you were told it.",
      "Whether your own circumstances change in a way that affects a petition route."
    ],
    destination: {
      name: "No destination. This sheet is a plan for checking rather than a step",
      detail:
        "Nothing here is sent anywhere. Two places carry the answers between them: the New Jersey Legislature's own bill pages, for whether the law has moved, and the New Jersey State Police expungement status portal, for what has happened to an individual record."
    },
    sequence: [
      "The first thing to watch is the law itself, and the place to watch it is the Legislature's own bill pages rather than a summary of them. A5095 is the bill that would implement procedures for the automated process; a companion bill may be introduced in the other house. What you are looking for is whether either is enacted, because that is the event that turns this from a direction into a process.",
      "Be careful about what a bill is. Introduction is the beginning of a process and not the end of one, and most bills do not become law. So the honest way to hold this is that A5095 tells you where things stand today, not what will happen.",
      "The second thing to watch is your own record, and " + NJSP_PORTAL + " is the place the State publishes an individual record's expungement status. Look at it, note the date you looked, and look again later. Two dated observations are worth considerably more than one, because the comparison is the only thing that shows movement.",
      "The third thing is your own circumstances. A new job, a licence application or a housing application changes what the answer is worth, and the petition route is the one that can be made to happen on a date you choose.",
      "Now the change that would cut the other way, and it is the reason this sheet has a date rather than an open horizon. When the automated process is established, the Clean Slate petition route closes by operation of N.J.S.A. 2C:52-5.3. If you are waiting for the automation and it arrives, the route you were keeping in reserve may not still be there. Give yourself a review date and decide in advance what would make you stop waiting and apply.",
      THE_PETITION_ROUTE_IS_OPEN,
      "What not to do while you are checking. Do not tell an employer, a landlord or a licensing body that a record has been cleared because ten years have passed, or because somebody said you were eligible. Until a check of your own record shows it, that is not something you can stand behind.",
      "And one thing worth knowing about who is asking. A free government process is exactly the shape that paid intermediaries imitate. If something asks you to pay to be entered into automatic clearing, that is a reason to stop, because there is no process to be entered into.",
      WHAT_IS_STILL_OPEN,
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "You leave this sheet with a plan: where to look, how often, what would change the answer, and what would make waiting the wrong choice. The last sheet is the rule that can put a cleared record back.",
    canPrepare: [
      "This account of what to watch, where the official channels are, and what each change would mean.",
      "The warning that the petition route closes when the automation arrives, restated where the decision is actually made.",
      "The value of holding two dated observations of the status portal rather than one.",
      "The warning about paid intermediaries imitating a free government process.",
      "The restoration-risk sheet that follows it in this packet."
    ],
    escalations: [
      ...NJ_COMMON_ESCALATIONS,
      "An official source tells you the automated process has started and you want to know what it means for you.",
      "You have been asked to confirm in writing that a record has been cleared.",
      "You are being asked to pay to be entered into automatic clearing."
    ],
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody writes to tell you that a record has been cleared, which is why the portal check is the plan on this sheet.",
      "No official body is required to tell you when the automated process is established either, which is why the bill pages are on this sheet at all."
    ]
  }),

  "nj-automated-clean-slate-restoration-risk": sheet({
    templateId: "nj-automated-clean-slate-restoration-risk",
    mechanismName: "The rule that can put a cleared record back",
    whyNotAFiling:
      "This page is a disclosure. Nothing on it is filed, and there is nothing on this route that could be filed.",
    prerequisites: [
      "You have read the two sheets before this one in the packet.",
      "You want to know what clearing a record does and does not put beyond reach."
    ],
    documentsToObtain: [
      "Any order or notice you were given when a record was cleared for you before. If a record is ever restored, that document is what establishes what had been cleared and when."
    ],
    gather: [
      "Whether any New Jersey record has been cleared for you before, and roughly when.",
      "Everything that has happened since, in any state and in the federal courts.",
      "Whether anything is pending against you now."
    ],
    destination: {
      name: "No destination. This sheet is a disclosure rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because the restoration rule sits in the same section as the automated process and is easy to miss, and because a person who does not know about it may believe a cleared record is permanently out of reach when it is not."
    },
    sequence: [
      "The rule, stated first because it is the point of this sheet. N.J.S.A. 2C:52-5.4 requires that a person's convictions and criminal history be restored in certain circumstances where the person is subsequently convicted of a crime not subject to expungement. So clearing is not necessarily the end of the story: a later conviction of the wrong kind can bring back what had been put out of reach.",
      "What this page does not do with that rule. It does not tell you which circumstances trigger restoration, whether they would reach your history, or what would follow if they did. Those are individualised legal judgments about a whole record, and getting them from a page rather than from a person is how people end up planning around something that was never true of them.",
      "Why it belongs in the same packet as the automation. The restoration requirement sits in the same section as the automated process, so if that process is ever built it will carry this rule with it. Anybody who is waiting for automatic clearing is waiting for something that comes with a condition attached.",
      ISOLATION_NOT_DESTRUCTION,
      "Put the two together and the practical picture is this. A cleared New Jersey record is out of ordinary public reach, may in most contexts be answered for as though the event did not occur, is still available for certain law enforcement, judicial and specified licensing purposes, and can in certain circumstances be restored by a later conviction. All four of those are true at once, and any one of them on its own gives a misleading picture.",
      REACH_AND_LIMITS,
      "One thing that is worth doing whatever else you decide. If a record has been cleared for you before, keep whatever document you were given about it, permanently. If a question ever arises about what was cleared and when, that document is the answer and there may be nothing else left to ask for.",
      "And the honest limit on the reassurance. Nobody can tell you from a page that a record is safely and permanently beyond reach. What somebody can tell you, having looked at the whole history, is what the risk actually is for you.",
      WHAT_IS_STILL_OPEN,
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "You leave this packet knowing that the automation is not running, that the petition route is open and closes when the automation arrives, where to watch for change, and that a cleared record carries a condition rather than a guarantee.",
    canPrepare: [
      "This account of the restoration requirement and of why it belongs with the automation rather than apart from it.",
      "The explanation of what a cleared New Jersey record is and is not, held together rather than one piece at a time.",
      "The instruction to keep whatever document you were given when a record was cleared before.",
      "A plain statement of the questions that need a person rather than a page.",
      "The two sheets before this one."
    ],
    escalations: [
      ...NJ_COMMON_ESCALATIONS,
      "A record was cleared for you before and you have been convicted of something since.",
      "Somebody has told you that a previously cleared record has come back.",
      "You are being asked about a matter you were told you could answer for as though it had not happened."
    ],
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you that a cleared record has been restored, which is why keeping your own copy of any clearing document matters.",
      "This sheet asks nothing of you and sends nothing anywhere."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

type ComponentSpec = {
  componentId: string;
  templateId: string;
  requirement?: "required" | "conditional";
  conditionKey?: string;
};

function packetSet(trackId: string, components: readonly ComponentSpec[]): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: components.map((component, index) => {
      if (!NEW_JERSEY_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no New Jersey guidance template ${component.templateId} is registered.`
        );
      }
      return {
        componentId: component.componentId,
        role: "process_guidance" as const,
        outputStrategy: "process_guidance" as const,
        rendererStrategy: "process_guidance" as const,
        templateId: component.templateId,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide" as const,
        requirement: component.requirement ?? ("required" as const),
        ...(component.conditionKey ? { conditionKey: component.conditionKey } : {}),
        order: index + 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      };
    })
  };
}

const NJ_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label:
      "Is the record a New Jersey record, or is it another state's, federal or tribal?",
    required: true
  },
  {
    key: "matterType",
    label:
      "Was the matter an indictable crime, a disorderly persons offence, a municipal ordinance violation, or a Title 39 motor vehicle matter including driving while intoxicated?",
    required: true
  },
  {
    key: "immigrationExposure",
    label:
      "Could your immigration status be affected by this record? New Jersey expungement has no federal immigration effect.",
    required: true
  },
  {
    key: "waitingIntent",
    label:
      "Are you waiting for automatic clearing, asking about the petition routes, or not decided yet?",
    required: true
  },
  {
    key: "convictedSinceAPreviousClearance",
    label:
      "Has a New Jersey record been cleared for you before, and have you been convicted of anything since?",
    required: true
  },
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want to be told whether a particular record qualifies?",
    required: true
  },
  {
    key: "portalCheck",
    label:
      "Have you checked your record on the New Jersey State Police expungement status portal?",
    required: true
  },
  {
    key: "heardAboutAutomaticClearing",
    label:
      "Have you been told that New Jersey clears records automatically after ten years? If so, what exactly were you told?",
    required: true
  },
  {
    key: "caseDetails",
    label:
      "List every case you have, in New Jersey and anywhere else, with the county, the court and how each one ended.",
    required: true
  }
];

export const NEW_JERSEY_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  (() => {
    const statuses = {
      research: "research_draft_complete",
      technical: "renderer_ready",
      visual: "not_reviewed",
      legal: "not_submitted"
    } as const;

    return {
      jurisdiction: "NJ",
      trackId: "nj_automated_clean_slate",
      publicName: "New Jersey's automatic record clearing, and where it stands",
      mechanism:
        "status_disclosure_monitoring_and_restoration_risk_for_an_automated_process_that_has_not_been_implemented",
      authority:
        "N.J.S.A. 2C:52-5.4, with N.J.S.A. 2C:52-5.3, 2C:52-2(b) and (c), 2C:52-1, 2C:52-27 and 2C:52-28, as enacted by P.L.2019, c.269",
      recordTypes: ["arrest", "conviction", "court_record"],
      dispositions: ["convicted"],
      courtLevel: "not_applicable",
      geographicScope: "statewide",
      geographyKeys: [],
      outputStrategy: "process_guidance",
      packetSet: packetSet("nj_automated_clean_slate", [
        {
          componentId: "nj_automated_clean_slate-status-disclosure-1",
          templateId: "nj-automated-clean-slate-status-disclosure"
        },
        {
          componentId: "nj_automated_clean_slate-monitoring-instructions-2",
          templateId: "nj-automated-clean-slate-monitoring"
        },
        {
          componentId: "nj_automated_clean_slate-restoration-risk-disclosure-3",
          templateId: "nj-automated-clean-slate-restoration-risk"
        }
      ]),
      requiredInputs: NJ_INPUTS,
      statuses: {
        ...statuses,
        runtime: computeRuntimeStatus({
          statuses,
          sourceCurrent: true,
          runtimeDisabled: true,
          outputStrategy: "process_guidance"
        })
      },
      sourceCurrent: true,
      technicalFixture: true,
      runtimeDisabled: true,
      assembledPacketName: "new-jersey-automated-clean-slate-status",
      assembledPacketTitle:
        "New Jersey Clean Slate automation — where it stands, what to watch, and the rule that can put a record back",
      customerDeliverableDescription:
        "Tells a New Jersey participant who has heard that the State clears records automatically after ten years that the automated process at N.J.S.A. § 2C:52-5.4 has not been built, and establishes that from the Legislature's own text rather than from silence: Assembly Bill A5095, introduced 14 May 2026, states that the process still does not exist and that eligible people must still file a petition. Names the petition routes as the thing that works, and carries the fact most summaries omit — that when the automation is established the Clean Slate petition route closes by operation of § 2C:52-5.3, so waiting risks losing the working route rather than shortening it. Gives a monitoring plan across the Legislature's bill pages and the State Police expungement status portal. Discloses the § 2C:52-5.4 restoration requirement, under which a later conviction of a crime not subject to expungement can in certain circumstances bring a cleared record back. Holds the chapter's boundaries throughout: expungement isolates rather than destroys, certain law enforcement, judicial and licensing uses survive under § 2C:52-27, Title 39 motor vehicle matters and driving while intoxicated sit outside the chapter under § 2C:52-28, and there is no federal immigration effect. Nothing is filed and nothing can be.",
      notes:
        "Process guidance only, on the ground that no participant filing exists — the automated process the statute directs has not been implemented, so there is nothing to file into. Never suggest the automation exists, never invent a date for it, and never generate a petition, application, request or letter on this track. No second automatic remedy is described. The petition-based Clean Slate route and the other petition routes stay open, are named as separate routes in the New Jersey intake and are not prepared here; their official court forms belong to other jobs and are not named on any sheet. The § 2C:52-5.4 restoration rule is a required disclosure. Whether any partial automation is already running for cannabis records under §§ 2C:52-5.2 and 2C:52-6.1 is preserved as open."
    };
  })()
];
