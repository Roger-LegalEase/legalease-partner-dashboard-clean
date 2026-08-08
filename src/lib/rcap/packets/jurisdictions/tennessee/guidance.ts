// Tennessee process guidance — two routes, neither of which the participant
// files anything on, for two entirely different reasons.
//
//   - `tn_acquittal_immediate` is the immediate expunction order on acquittal
//     under T.C.A. § 40-32-106. On a not-guilty verdict on every count the
//     presiding judge must ask the acquitted person whether they want the
//     records removed and destroyed, and on a yes the court issues the order
//     there and then. No petition, no form and no fee: § 40-32-106(a)(1)
//     requires the qualifying public records to be removed and destroyed
//     without cost. The relief has usually happened before the participant
//     leaves the courtroom, so the deliverable is not a filing — it is an
//     account of what should have happened, a way to check whether it did, and
//     a route out for the cases where the question was never put.
//   - `tn_trafficking_40_32_105` is the human trafficking victim expunction
//     provision. The adopted readiness record puts it outside the current
//     LegalEase self-help scope, and independently the showing it needs is a
//     contested evidentiary one presented in a survivor-sensitive setting. The
//     node detects, names and refers. It states no eligibility condition and
//     no filing vehicle, because the current text of § 40-32-105 could not be
//     retrieved from any official Tennessee source and asserting its contents
//     would be inventing law.
//
// Four boundaries this module holds, each of them a real Tennessee trap:
//
//   - **The court's order is not a participant filing.** TBI form BI-0333 is
//     captioned "Order for the Expungement of Criminal Offender Record" and
//     closes with an approved-for-entry block signed by defence counsel, the
//     district attorney general and the judge. It is a court order. Nothing
//     here generates it, pre-completes it or predicts what it will say.
//   - **Where a Tennessee petition exists, the district attorney general
//     prepares it.** On the § 40-32-107 conviction routes the operative
//     petition and proposed order are prosecutor instruments under
//     § 40-32-108(e), and the § 40-32-109(c) record search and certification
//     is a clerk instrument. None of the three is prepared here, and neither
//     of these two tracks reaches them.
//   - **Nothing is expunged automatically in Tennessee.** A dismissal or a
//     completed diversion stays on a background check until somebody acts.
//     The design records that as the most common Tennessee misunderstanding,
//     so both sheets lead with the position rather than burying it.
//   - **The chapter was renumbered and the published guidance has not caught
//     up.** Public Chapter 268 of 2025, effective 24 April 2025, rewrote
//     § 40-32-101 into a definitions section and moved the operative grounds
//     into §§ 40-32-106 to 40-32-110; Public Chapter 608, the 2026 Code Bill,
//     codified the result on 25 March 2026. The Administrative Office of the
//     Courts' own expunction page is still titled to say updated information
//     is coming and still reasons from § 40-32-101. So every sheet tells the
//     participant to confirm the section number with the clerk or the district
//     attorney general rather than assuming either numbering.
//
// What is left open and stays open on the page: whether a person whom the
// judge never asked in fact routes to the non-conviction petition is the
// design's reading of § 40-32-106(a)(1) rather than a confirmed statement of
// official practice, and it is said that way; the current text of
// § 40-32-105 is not asserted at all; and the prior-expunction asymmetry
// across the § 40-32-107 subsections is not decided here, by implication or
// otherwise, because neither assigned track runs on that section.
//
// No conditional component and no fact placeholder appears in this family:
// both adopted packet sets carry a single required component and no template
// interpolates a participant answer. A second fixture on the same track would
// render byte-for-byte the same packet, so this job adds no regression
// variant; the branches that matter are typed stops and all twelve are
// exercised as negative cases in the committed verifier.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Tennessee
// is not an enabled jurisdiction and this job does not enable one. The
// petition routes named in the copy belong to the Tennessee custom-pleading
// job and are untouched here.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Tennessee legal help, named once so no stop is a dead end. */
const TN_LEGAL_HELP =
  "a Tennessee legal aid office, a Tennessee law school legal clinic, an expunction clinic run by a local bar association, or a Tennessee attorney who does record-clearing work";

/** Said on both routes in this family. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page explains how a process works. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether a particular record qualifies.";

/** The most common Tennessee misunderstanding, said first on both sheets. */
const NOTHING_CLEARS_ITSELF =
  "The thing to get straight before anything else, because it is the most common Tennessee misunderstanding: expunction is not automatic. A charge that was dismissed, a case that ended in a diversion you completed, even a case you won — none of it comes off a background check on its own. Somebody has to act, and which somebody depends on the route.";

/** The renumbering, and why it matters to a participant rather than a lawyer. */
const THE_CHAPTER_WAS_RENUMBERED =
  "One practical warning about section numbers, because it will save you an argument at a counter. Public Chapter 268 of 2025, effective 24 April 2025, reorganised Tennessee's expunction chapter: section 40-32-101 became a definitions section and the operative grounds moved into sections 40-32-106 to 40-32-110. Public Chapter 608, the 2026 Code Bill, codified that on 25 March 2026. Published guidance has not all caught up — the Administrative Office of the Courts' own expunction page is titled to say updated information is coming and still reasons from section 40-32-101. So if a clerk or a form uses the old numbering, that is not a sign anybody is wrong. Confirm the section number with the clerk of the court or the district attorney general's office before you rely on it.";

/** The instrument boundary. Nothing on either route is generated here. */
const THE_ORDER_IS_THE_COURT_S =
  "The document that does the work here is a court order, and it is the court's document rather than yours. The Tennessee Bureau of Investigation publishes the form the courts use, form BI-0333, captioned Order for the Expungement of Criminal Offender Record, and it is signed by the judge with the district attorney general and defence counsel approving it for entry. LegalEase does not generate it, does not fill it in and cannot tell you what a court will put on it.";

/** What a Tennessee expunction does, stated once. */
const WHAT_EXPUNCTION_DOES =
  "What the order does, when it is made, is set out at section 40-32-110: expunction restores the person, in contemplation of law, to the status they occupied before the arrest, the indictment or information, the trial and any conviction. That is the whole point of it, and it is worth knowing what you were being offered.";

const TN_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge, remove or destroy anything, and cannot make a court, a clerk, a prosecutor or a records agency act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains how a process works; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been expunged. Only your own criminal history from the Bureau shows that, and you are the one who reads it.",
  "LegalEase does not prepare, complete, sign or file the expunction order. That is a court document, made by a judge.",
  "LegalEase does not prepare a petition or a proposed order that Tennessee law puts in the hands of the district attorney general, and does not prepare the record search and certification that Tennessee law puts in the hands of the clerk.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal history. You order your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you how long any office will take. Where this page gives a period, it is the one the statute gives, not a prediction."
];

/**
 * The sources behind copy that appears on both sheets.
 *
 * A source list is not decoration: it tells the reader what the page rests on.
 * The court-order form belongs to the acquittal route alone and is added there
 * rather than here, because a trafficking sheet listing the form the courts use
 * for an ordinary expunction order implies a mechanism this node expressly does
 * not assert.
 */
const TN_SOURCES: readonly string[] = [
  "Tennessee Public Chapter 268 (2025), SB1055 and HB1257, the expunction reorganisation act, effective 24 April 2025, enrolled chapter read on 6 August 2026.",
  "Senate Amendment 1 (SA0362) to SB1055, the governing text of Public Chapter 268, which created T.C.A. sections 40-32-106 to 40-32-110, read on 6 August 2026.",
  "Tennessee Public Chapter 608, SB1586 and HB1811, the 2026 Code Bill, signed and effective 25 March 2026.",
  "Diversions, Expungements and Dispositions, Tennessee Bureau of Investigation, read on 6 August 2026.",
  "Expungements, Tennessee Administrative Office of the Courts self-help centre, read on 6 August 2026. Its own page title states that updated information is coming to reflect changes to T.C.A. section 40-32-101."
];

/** Read for the acquittal route's instrument boundary, and cited only there. */
const TN_COURT_ORDER_SOURCE =
  "TBI form BI-0333 (rev. 04/2025), Order for the Expungement of Criminal Offender Record, read on 6 August 2026. It is a court order and is not a participant filing.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class TennesseeGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "TennesseeGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Tennessee route. */
export class TennesseeRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "TennesseeRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class TennesseeBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "TennesseeBranchError";
  }
}

export const TN_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Tennessee expunction reaches Tennessee state records and nothing else. */
export const TN_RECORD_JURISDICTIONS: Readonly<Record<string, string>> = {
  tennessee_state: "within",
  another_state: "outside",
  federal: "outside",
  military: "outside",
  tribal: "outside"
};

/** A partial acquittal is a different analysis, so it is its own answer. */
export const TN_ACQUITTAL_SCOPE: Readonly<Record<string, string>> = {
  every_count: "all",
  some_counts: "partial"
};

/** Whether the court put the statutory question at the verdict. */
export const TN_VERDICT_QUESTION: Readonly<Record<string, string>> = {
  yes: "asked",
  no: "not_asked",
  do_not_remember: "unknown"
};

/** What the acquitted person answered, where the question was put. */
export const TN_VERDICT_ANSWER: Readonly<Record<string, string>> = {
  asked_for_removal: "accepted",
  declined: "declined",
  do_not_remember: "unknown"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new TennesseeBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const OUT_OF_JURISDICTION_STOP =
  "Tennessee expunction reaches Tennessee state records. It does not reach a federal, military, tribal or out-of-state record, and neither of these Tennessee routes touches one.";

const IMMIGRATION_STOP =
  "Immigration status, federal employment and security clearances are governed by federal rules, and a Tennessee expunction does not reach a federal record. A record that a Tennessee court has ordered expunged can still matter in those settings, and a diversion guilty plea in particular may remain visible on a clearance check.";

/** The non-conviction petition route, named the same way by every stop that points at it. */
const NON_CONVICTION_PETITION_ROUTE =
  "the Tennessee non-conviction expunction petition, which is a separate route in the Tennessee intake and is not prepared on this page";

/**
 * Validates participant answers and routes to the correct Tennessee node.
 *
 * The order is the design's: record jurisdiction first, because Tennessee
 * expunction does not reach anything else; then the immigration and clearance
 * exposure the design records on both tracks; then each route's own questions,
 * in the order the design asks them.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveTennesseeGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Tennessee law reaches Tennessee records.
  const jurisdiction = branch(trackId, "recordJurisdiction", TN_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (jurisdiction.resolved === "outside") {
    throw new TennesseeRouteMismatchError(
      trackId,
      "record_is_not_a_tennessee_state_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal, military or tribal authority that holds the record",
      "Take the record to that authority and ask what its own law provides for clearing it. If you also hold Tennessee state records, those are handled separately and only those are served here."
    );
  }

  // Gate 2. Immigration and clearance exposure, a stop condition on both tracks.
  const federalExposure = branch(
    trackId,
    "citizenshipOrClearanceQuestion",
    TN_YES_NO,
    facts.citizenshipOrClearanceQuestion
  );
  if (federalExposure.resolved) {
    throw new TennesseeGuidanceStopError(
      trackId,
      "immigration_or_security_clearance_consequences_in_play",
      IMMIGRATION_STOP,
      "an immigration attorney, or for a clearance question an attorney who handles security-clearance matters",
      "Speak to one of them about the record before you rely on any Tennessee expunction, and take your criminal history with you."
    );
  }

  if (trackId === "tn_acquittal_immediate") {
    // The route rests on the participant having seen their own record.
    const history = branch(
      trackId,
      "obtainedTbiCriminalHistory",
      TN_YES_NO,
      facts.obtainedTbiCriminalHistory
    );
    if (!history.resolved) {
      throw new TennesseeGuidanceStopError(
        trackId,
        "tbi_criminal_history_not_yet_obtained",
        "Nothing useful can be checked about a record nobody has looked at. The criminal history the Tennessee Bureau of Investigation holds is what a background check draws on, it is what shows whether the case is still there, and it carries the state control number that an expunction order cannot be completed without.",
        "the Tennessee Bureau of Investigation",
        "Order your own Tennessee criminal history from the Bureau and read it. Come back to this route with it in front of you."
      );
    }

    const scope = branch(trackId, "acquittedOnEveryCount", TN_ACQUITTAL_SCOPE, facts.acquittedOnEveryCount);
    if (scope.resolved === "partial") {
      throw new TennesseeRouteMismatchError(
        trackId,
        "acquittal_was_not_on_every_count",
        "The immediate order runs on a not-guilty verdict on every count in the case. Where some counts ended another way, the case is a mixed one and what can be done about it is the redaction analysis rather than this route. They are different questions with different answers, and running the wrong one produces a confident answer to a question you did not ask.",
        "the Tennessee redaction route, which is a separate route in the Tennessee intake, and " + TN_LEGAL_HELP,
        "Go back to the Tennessee intake with the disposition for every count in the case, and ask about redaction rather than about the immediate order."
      );
    }

    const question = branch(trackId, "courtPutTheQuestion", TN_VERDICT_QUESTION, facts.courtPutTheQuestion);
    if (question.resolved === "unknown") {
      throw new TennesseeGuidanceStopError(
        trackId,
        "whether_the_court_put_the_question_is_not_remembered",
        "This is worth finding out rather than guessing at, and it is findable. A verdict is a court event with a record, and if an expunction order was entered it is in the case file. Guessing costs you either an unnecessary petition or a wrongly abandoned one.",
        "the clerk of the county criminal, circuit or general sessions court where the case was tried",
        "Ask the clerk for the case file or the docket entries for the verdict date, and ask specifically whether an expunction order was entered. Come back with the answer."
      );
    }
    if (question.resolved === "not_asked") {
      throw new TennesseeRouteMismatchError(
        trackId,
        "court_did_not_put_the_question_at_the_verdict",
        "The immediate order is the one the court makes on its own question at the verdict, so where the question was never put there is nothing on this route to check. That is not the end of it: a verdict of not guilty is one of the grounds for a free expunction on petition, so the petition route is open. What has not been confirmed against any official statement of Tennessee practice is whether that is how a court will handle a question it should have asked years ago, and this page does not pretend otherwise.",
        NON_CONVICTION_PETITION_ROUTE + ", and " + TN_LEGAL_HELP,
        "Go back to the Tennessee intake and ask about the non-conviction petition. Take the disposition and your criminal history with you, and ask whoever helps you how a court in that county handles an acquittal where the question was not put."
      );
    }

    const answer = branch(trackId, "answerGivenAtTheVerdict", TN_VERDICT_ANSWER, facts.answerGivenAtTheVerdict);
    if (answer.resolved === "declined") {
      throw new TennesseeRouteMismatchError(
        trackId,
        "records_removal_was_declined_at_the_verdict",
        "Where the question was put and the answer was no, no order was made and there is nothing on this route to verify. Changing your mind is allowed and is common — people say no at a verdict without understanding what is being offered. The route for it is the petition rather than this one, and the same statutory ground is available.",
        NON_CONVICTION_PETITION_ROUTE + ", and " + TN_LEGAL_HELP,
        "Go back to the Tennessee intake and ask about the non-conviction petition, and say plainly that the question was put at the verdict and declined."
      );
    }
    if (answer.resolved === "unknown") {
      throw new TennesseeGuidanceStopError(
        trackId,
        "answer_given_at_the_verdict_is_not_remembered",
        "What you said at the verdict decides which of two routes you are on, so it is worth establishing from the record rather than from memory. If you asked for removal and an order was made, it is in the case file. If it is not there, no order was made.",
        "the clerk of the county criminal, circuit or general sessions court where the case was tried",
        "Ask the clerk whether an expunction order was entered on the verdict date, and get a copy if it was. Come back with what the file shows."
      );
    }

    const opposed = branch(
      trackId,
      "prosecutionIndicatesOpposition",
      TN_YES_NO,
      facts.prosecutionIndicatesOpposition
    );
    if (opposed.resolved) {
      throw new TennesseeGuidanceStopError(
        trackId,
        "prosecution_has_indicated_it_will_oppose",
        "A dispute with the district attorney general's office about whether a record can be cleared is a contested matter, and a contested matter is not a self-help matter. It is also a signal worth taking seriously rather than arguing with over a counter.",
        TN_LEGAL_HELP,
        "Take the disposition, your criminal history and anything the office has said to one of them, and ask what the dispute is actually about before you respond to it."
      );
    }

    return derived;
  }

  if (trackId === "tn_trafficking_40_32_105") {
    const connection = branch(
      trackId,
      "recordAroseFromTrafficking",
      TN_YES_NO,
      facts.recordAroseFromTrafficking
    );
    if (!connection.resolved) {
      throw new TennesseeRouteMismatchError(
        trackId,
        "no_trafficking_connection_on_this_record",
        "This route exists for records that came out of somebody being trafficked or coerced. Where that is not what happened, it is the wrong route, and the ordinary Tennessee routes are the ones to look at — which of them depends on how the case ended rather than on anything decided here.",
        "the Tennessee intake, which sorts records by how the case ended",
        "Go back to the Tennessee intake with the disposition for the case and take the route it gives you."
      );
    }
    return derived;
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

/**
 * Fees, fee waiver and notice are required rather than defaulted.
 *
 * Tennessee's two guidance routes have opposite fee positions — the acquittal
 * route is free by statute, and nothing about the trafficking route's costs is
 * established — so a family default is the one thing guaranteed to put one
 * route's law on the other's sheet.
 */
type SheetInput = {
  templateId: string;
  mechanismName: string;
  whyNotAFiling: string;
  processType: GuidanceTemplate["processType"];
  prerequisites: readonly string[];
  documentsToObtain: readonly string[];
  gather: readonly string[];
  destination: { name: string; detail: string };
  sequence: readonly string[];
  submissionMethod: string;
  fees: string;
  feeWaiver: string;
  noticeOrService: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  escalations: readonly string[];
  extraSources?: readonly string[];
};

function sheet(input: SheetInput): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: input.processType,
    prerequisites: input.prerequisites,
    documentsToObtain: input.documentsToObtain,
    participantDataToGather: input.gather,
    officialDestination: input.destination,
    actionSequence: input.sequence,
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: TN_CANNOT_PERFORM,
    escalationTriggers: [
      "The record is a federal, military, tribal or out-of-state record.",
      "Your immigration status, a federal job or a security clearance could be affected.",
      "Anything turns on whether an office is using the pre-2025 or the reorganised section numbering.",
      ...input.escalations
    ],
    officialSourceReferences: [...TN_SOURCES, ...(input.extraSources ?? [])]
  };
}

export const TENNESSEE_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "tn-acquittal-immediate-order-guidance": sheet({
    templateId: "tn-acquittal-immediate-order-guidance",
    mechanismName: "The order the court should have made the day you were found not guilty",
    whyNotAFiling:
      "Nothing is filed by you on this route, because the relief is meant to have happened already. Under T.C.A. section 40-32-106 the presiding judge must ask an acquitted person whether they want the records removed and destroyed, and on a yes the court issues the order there and then, with no petition and at no cost. LegalEase generates nothing here: what this page does is tell you what should have happened, help you check whether it did, and point you somewhere useful if it did not.",
    processType: "court_adjacent",
    prerequisites: [
      "The case was a Tennessee state case.",
      "The case ended in a verdict of not guilty on every count.",
      "You have, or can get, your own Tennessee criminal history from the Bureau."
    ],
    documentsToObtain: [
      "Your own Tennessee criminal history from the Tennessee Bureau of Investigation. It is what a background check draws on, it shows whether the case is still there, and it carries the state control number an expunction order cannot be completed without.",
      "The disposition from the clerk of the county criminal, circuit or general sessions court where the case was tried. It establishes exactly how the case ended, which is the fact the whole route turns on.",
      "A copy of the expunction order, if one was entered. The clerk has it, and it is the only thing that proves an order was made."
    ],
    gather: [
      "Which court handled the case, and in which county.",
      "The docket or case number.",
      "What the charge was, and exactly how the case ended.",
      "The date the case ended.",
      "The state control number shown on your criminal history.",
      "Every other conviction you have anywhere, including federal and out-of-state ones.",
      "Whether the judge asked you at the verdict about removing the records, and what you said.",
      "Whether the case still shows on your criminal history today."
    ],
    destination: {
      name: "The trial court, in open court at the verdict — and afterwards, its clerk",
      detail:
        "The order is made by the presiding judge at the verdict, on the judge's own question. Nothing is submitted by the participant, then or later. Afterwards the office that holds the answers is the clerk of the county criminal, circuit or general sessions court where the case was tried: the case file, the docket entries and any order that was entered are all there."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_CLEARS_ITSELF,
      "This route is the one exception worth knowing about, and it is a good one. On a verdict of not guilty on every count, the presiding judge must ask the acquitted person whether they want the records of the case removed and destroyed. If the answer is yes, the court issues the order immediately. There is no petition to bring, no form for you to complete and no waiting period, and no fee may be charged: section 40-32-106(a)(1) requires the qualifying public records to be removed and destroyed without cost to the person.",
      WHAT_EXPUNCTION_DOES,
      THE_ORDER_IS_THE_COURT_S,
      "Now the part this page is really for, which is checking. An order made in open court is only the first half. The court sends the order to the Tennessee Bureau of Investigation within thirty days, and until it arrives and is processed nothing changes on a background check. So an acquittal in March and a background check in April can perfectly well show the case still there without anything having gone wrong.",
      "How to check, in order. Order your own criminal history from the Bureau and look for the case. If it is gone, that is your answer and it is the only answer worth having — nobody writes to tell you. If it is still there, ask the clerk of the court that tried the case whether an expunction order was entered on the verdict date, and get a copy if it was.",
      "What those two answers mean together. An order in the file and the case still on your criminal history usually means transmission or processing, not refusal, and the useful question to the clerk is whether the order went to the Bureau and when. No order in the file means no order was made, which puts you on a different route rather than in a dispute.",
      "Keep a copy of the order permanently if you get one. Once the public records are removed and destroyed there may be nothing left to ask for, and the order is what you will want if an old record surfaces on a private background-check database that never got the message.",
      "One thing not to do while you are checking. Do not tell an employer, a landlord or a licensing body that a record has been cleared because a judge said it would be. Until your own criminal history shows it, that is not something you can stand behind.",
      THE_CHAPTER_WAS_RENUMBERED,
      "And where the question was never put to you at the verdict, or you said no and have since changed your mind, that is not a dead end. A verdict of not guilty is one of the grounds for a free expunction on petition, and the petition route is a separate route in the Tennessee intake. What has not been confirmed against any official statement of Tennessee practice is how a court handles a question it should have asked years ago, so ask before you assume."
    ],
    submissionMethod:
      "There is nothing for you to submit on this route. The order is made by the court on its own question and sent by the court to the Tennessee Bureau of Investigation. No petition, application or request is generated here.",
    fees:
      "None, and this is in the statute rather than a matter of practice: section 40-32-106(a)(1) requires the qualifying public records to be removed and destroyed without cost to the person. If somebody asks you to pay for the order on this route, that is worth questioning before you pay it. Ordering your own criminal history from the Bureau, and getting copies from the clerk, are separate services that may have their own charges.",
    feeWaiver:
      "Not applicable on this route, because no fee is charged for the expunction itself and there is nothing here to waive.",
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify.",
      "The court sends the order to the Tennessee Bureau of Investigation within thirty days. That is the court's step, not yours.",
      "Nobody is required to write and tell you when a record has been removed, which is why the only reliable check is your own criminal history."
    ],
    expectedNextStage:
      "You leave this sheet knowing what should have happened at the verdict, how to find out whether it did, what the two possible answers mean, and which route to take if the question was never put to you.",
    canPrepare: [
      "This account of what the court must do at an acquittal and of what the order is worth.",
      "The checking sequence: your own criminal history first, then the clerk's file, and what each answer means.",
      "The list of what to gather before you ask anybody anything, so that one call does the work of three.",
      "The warning about section numbering, which is what a counter argument usually turns out to be about.",
      "A plain statement of where this route ends and the petition route begins."
    ],
    escalations: [
      "The district attorney general's office disputes that the record can be cleared, or indicates it will oppose.",
      "You were acquitted long ago, were never asked, and an employer or a licensing body has since relied on the record.",
      "The clerk's file shows an order but your criminal history still shows the case months later.",
      "Some counts in the case ended in a conviction, so the acquittal was only partial.",
      "You have other convictions anywhere, including federal or out-of-state ones, and want to know what else can be done.",
      "There are unpaid court costs, fines or restitution in any of your cases.",
      "Any of your cases involves driving under the influence, a sexual offence or a registration requirement.",
      "Any of your cases involves domestic violence or a child victim."
    ],
    extraSources: [TN_COURT_ORDER_SOURCE]
  }),

  "tn-trafficking-detect-name-refer": sheet({
    templateId: "tn-trafficking-detect-name-refer",
    mechanismName: "Clearing a Tennessee record that came out of being trafficked",
    whyNotAFiling:
      "Nothing is generated on this route and nothing is filed. Tennessee has a separate expunction provision for people whose records came out of being trafficked, at T.C.A. section 40-32-105, and LegalEase does not prepare filings on it. That is a deliberate limit rather than an oversight: showing that an offence happened as a consequence of being trafficked is a contested evidentiary matter argued by an advocate, in a setting where being handled carefully matters as much as being handled correctly. This page tells you the route exists, where it sits in the law, and who to take it to.",
    processType: "court_adjacent",
    prerequisites: [
      "The record is a Tennessee state record.",
      "The charge or conviction came out of a situation where somebody was forcing, coercing or trafficking you.",
      "You are willing to be told that this is a route LegalEase refers out rather than prepares."
    ],
    documentsToObtain: [
      "Nothing is required by this page, and you are not asked to gather evidence of what happened to you.",
      "Your own Tennessee criminal history from the Tennessee Bureau of Investigation is worth having when you speak to a lawyer, because it is the list of what is actually on the record. It is not needed to make the referral."
    ],
    gather: [
      "Which court handled each case, and in which county, if you know.",
      "Roughly when each case happened, if you know.",
      "Nothing about the trafficking itself. You do not have to explain any of it here, and this page does not ask you to."
    ],
    destination: {
      name: "A Tennessee attorney who does this work, and a trafficking survivor services organisation",
      detail:
        "Nothing is sent anywhere by this page and nothing is submitted on your behalf. The people to reach are an attorney who handles record-clearing and post-conviction work, found through a Tennessee legal aid office or a Tennessee law school legal clinic, and a trafficking survivor services organisation in Tennessee, which a legal aid office can name for your area. If a case is still open, the court where it is pending is where a lawyer will start."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_CLEARS_ITSELF,
      "What this page is here to tell you is short and worth knowing. Tennessee has a separate expunction provision for people whose criminal records came out of being trafficked. It sits at section 40-32-105 of the Tennessee Code, inside the same expunction chapter as the ordinary routes, and it is a real and operative route rather than a historical one.",
      "How that is known, since it matters that this is not a rumour. The enacted text of Public Chapter 268 refers to it twice from other sections: section 40-32-102(c)(2) directs the Tennessee Bureau of Investigation to certify whether an offence is eligible for expunction under section 40-32-107 or section 40-32-105, and section 40-32-106(c)(1) refers to a trafficking victim applying for expunction relief under section 40-32-105. Two provisions of the current law point at it, which is how you know it is there.",
      "Now the honest limit, and it is a real one. The current text of section 40-32-105 could not be retrieved from any official Tennessee source. It was not created or rewritten by any act that publishes its own text, and the Tennessee Code is a licensed publication rather than a free one. So this page does not tell you who qualifies, what has to be shown, where a request goes or what it must contain — not because those things are secret, but because stating them without having read the section would be inventing law, and you would be the one relying on it.",
      "What LegalEase does not do on this route, said plainly. It does not prepare a petition, an application or any other document for this provision. It does not decide, suggest or record whether a particular record came out of being trafficked. And it does not ask you to describe what happened.",
      "Why it is referred out rather than built. Establishing that an offence was committed as a consequence of being trafficked is a contested evidentiary showing — somebody has to gather it, present it and argue it — and it is done in a setting where a survivor's safety and privacy are part of the work. That is advocacy by a person, not a document produced by a service. It is also the reason not to attempt it alone.",
      "Who to take it to. An attorney who handles record-clearing and post-conviction work, which a Tennessee legal aid office or a Tennessee law school legal clinic can help you find, and a trafficking survivor services organisation in Tennessee, which a legal aid office can also name for your area. Ask for somebody who has done a section 40-32-105 matter before, and ask early — the question of what can be shown is one a lawyer will want to think about rather than answer at a counter. And if the first office you reach cannot take it on, ask them who can: that is a normal question and legal aid offices and clinics refer work to each other. Nobody is going to call you back about this on their own, so a referral you were promised and did not receive is worth chasing rather than reading as a refusal.",
      "What you can check for yourself in the meantime, and it is worth doing before any appointment. Order your own Tennessee criminal history from the Bureau. It is the list of what is actually on the record, which is not always the list you would expect, and it makes a first meeting far more useful. Nothing on this page asks you to do anything with it beyond bring it.",
      "The ordinary routes are not closed to you either. If a case ended in a dismissal, an acquittal or a completed diversion, the ordinary Tennessee routes may reach it regardless of how it came about, and they are separate routes in the Tennessee intake. A lawyer looking at the whole record is the right person to say which route fits which case.",
      THE_CHAPTER_WAS_RENUMBERED,
      "One last thing, because it is the question people ask. Nothing on this page is a judgement about your case, and nothing here is recorded anywhere as a finding that you were trafficked. This is a signpost."
    ],
    submissionMethod:
      "Nothing is submitted, by you or by LegalEase, and no document is generated. The next step on this route is a conversation with a lawyer, not a filing.",
    fees:
      "Not established. The costs on this route were not confirmed from an official Tennessee source and none is stated here. A legal aid office or a law school clinic may do the work at no charge, and that is the first question worth asking.",
    feeWaiver:
      "Not established. Whether any fee on this route can be waived was not confirmed from an official Tennessee source, so nothing is stated about it here. Ask the lawyer you speak to.",
    noticeOrService: [
      "Nothing is served and nobody is notified by you as a result of reading this page.",
      "What notice or service the provision itself requires was not established, and none is stated here."
    ],
    expectedNextStage:
      "You leave this sheet knowing that a Tennessee route exists for records that came out of being trafficked, where it sits in the law, that LegalEase does not prepare filings on it, and who to take it to.",
    canPrepare: [
      "This account of where the provision sits and how its operative status is known.",
      "A plain statement of what is not established about it, so that nobody hands you a confident answer nobody has.",
      "The referral: who to look for, where to look, and what to ask them.",
      "The suggestion to order your own criminal history before any appointment, and the reason it helps.",
      "The reminder that the ordinary Tennessee routes may also reach some of the same cases."
    ],
    escalations: [
      "You want to know whether a particular record can be cleared under this provision.",
      "A case connected with the trafficking is still open or is being prosecuted now.",
      "You are being asked to give evidence, or to talk to anybody, about what happened to you.",
      "Your safety is affected by the record, or by anybody knowing you are asking about it."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
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
      if (!TENNESSEE_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Tennessee guidance template ${component.templateId} is registered.`
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

/** Asked on both Tennessee routes in this family, in this order. */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label:
      "Is the record a Tennessee state record, another state's, a federal record, a military one, or a tribal court record?",
    required: true
  },
  {
    key: "citizenshipOrClearanceQuestion",
    label:
      "Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
    required: true
  }
];

function tennesseeTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  components: readonly ComponentSpec[];
  requiredInputs: readonly RequiredInput[];
  assembledPacketName: string;
  assembledPacketTitle: string;
  customerDeliverableDescription: string;
  notes: string;
}): ReliefTrack {
  const statuses = {
    research: "research_draft_complete",
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "not_submitted"
  } as const;

  return {
    jurisdiction: "TN",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "not_applicable",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(input.trackId, input.components),
    requiredInputs: input.requiredInputs,
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
    assembledPacketName: input.assembledPacketName,
    assembledPacketTitle: input.assembledPacketTitle,
    customerDeliverableDescription: input.customerDeliverableDescription,
    notes: input.notes
  };
}

export const TENNESSEE_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  tennesseeTrack({
    trackId: "tn_acquittal_immediate",
    publicName: "The judge should clear your record the day you are found not guilty",
    mechanism: "immediate_court_ordered_expunction_at_acquittal_with_no_participant_filing",
    authority:
      "T.C.A. § 40-32-106, with § 40-32-106(a)(1)(E), § 40-32-106(e)(2), § 40-32-102(d) and § 40-32-110, as reorganised by Public Chapter 268 (2025) and codified by Public Chapter 608 (2026)",
    recordTypes: ["charge", "court_record"],
    dispositions: ["acquitted"],
    components: [
      {
        componentId: "tn_acquittal_immediate-process-guidance-1",
        templateId: "tn-acquittal-immediate-order-guidance"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "obtainedTbiCriminalHistory",
        label:
          "Have you ordered your own Tennessee criminal history from the Bureau to see what is actually on it?",
        required: true
      },
      {
        key: "acquittedOnEveryCount",
        label: "Were you found not guilty on every count, or only on some of them?",
        required: true
      },
      {
        key: "courtPutTheQuestion",
        label:
          "At the verdict, did the judge ask whether you wanted the records removed and destroyed?",
        required: true
      },
      {
        key: "answerGivenAtTheVerdict",
        label: "If the judge asked, what did you say?",
        required: true
      },
      {
        key: "prosecutionIndicatesOpposition",
        label:
          "Has the district attorney general's office disputed that the record can be cleared, or indicated it will oppose?",
        required: true
      },
      {
        key: "originatingCourt",
        label:
          "Which court handled the case, and in which county? Each county where you have a case is looked at separately.",
        required: true
      },
      { key: "docketNumber", label: "What is the docket or case number?", required: true },
      {
        key: "offenceAndDisposition",
        label: "What was the charge, and exactly how did the case end?",
        required: true
      },
      { key: "dispositionDate", label: "On what date did the case end?", required: true },
      {
        key: "stateControlNumber",
        label:
          "What is the state control number on your Tennessee criminal history? An expunction order cannot be completed without it.",
        required: true
      },
      {
        key: "otherConvictions",
        label: "List every other conviction you have anywhere, including federal and out-of-state.",
        required: true
      },
      {
        key: "recordStillShows",
        label: "Does the case still show on your Tennessee criminal history?",
        required: true
      }
    ],
    assembledPacketName: "tennessee-acquittal-immediate-order",
    assembledPacketTitle: "Tennessee acquittal — the order the court makes, and how to check it was made",
    customerDeliverableDescription:
      "Tells a Tennessee participant who was acquitted on every count what T.C.A. § 40-32-106 requires the court to do at the verdict — put the question, and on a yes issue the expunction order immediately and without cost — and then does the thing the participant actually needs, which is to check whether it happened. Sets out the thirty-day transmission to the Tennessee Bureau of Investigation so that a record still showing a month later is read correctly, gives the two-step check of criminal history then clerk's file, explains what each answer means, and routes the participant who was never asked, or who declined at the time, to the non-conviction petition while saying plainly that Tennessee practice on that point was not confirmed. Nothing is filed and nothing is generated: the expunction order is the court's document.",
    notes:
      "Process guidance only. No participant filing exists on this route — the order issues in open court on the judge's own question — and none may be generated. TBI form BI-0333 is a court order and is never prepared, pre-completed or predicted. Where the question was not put at the verdict the participant is handed off to the non-conviction petition track, which is a separate route; that handoff is the design's reading of § 40-32-106(a)(1) and is stated as unconfirmed against official practice. Nothing here decides the prior-expunction asymmetry across the § 40-32-107 subsections, which this track does not run on."
  }),

  tennesseeTrack({
    trackId: "tn_trafficking_40_32_105",
    publicName: "Clearing a record that came from being trafficked",
    mechanism: "detect_name_and_refer_for_a_provision_outside_the_adopted_self_help_scope",
    authority:
      "T.C.A. § 40-32-105, with § 40-32-102(c)(2), § 40-32-106(c)(1) and § 40-32-110, as reorganised by Public Chapter 268 (2025) and codified by Public Chapter 608 (2026)",
    recordTypes: ["charge", "conviction", "court_record"],
    dispositions: ["convicted", "charged"],
    components: [
      {
        componentId: "tn_trafficking_40_32_105-process-guidance-1",
        templateId: "tn-trafficking-detect-name-refer"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "recordAroseFromTrafficking",
        label:
          "Did the charge or conviction come out of a situation where somebody was forcing, coercing or trafficking you? You do not have to explain it here.",
        required: true
      },
      {
        key: "referralWanted",
        label:
          "Would you like the details of a lawyer and of survivor services who handle this kind of record clearing?",
        required: true
      }
    ],
    assembledPacketName: "tennessee-trafficking-expunction-referral",
    assembledPacketTitle: "Tennessee trafficking victim expunction — what exists, and who to take it to",
    customerDeliverableDescription:
      "Tells a Tennessee participant whose record came out of being trafficked that a separate expunction provision exists at T.C.A. § 40-32-105, shows how its operative status is known from the enacted cross-references at § 40-32-102(c)(2) and § 40-32-106(c)(1), and then stops exactly where the evidence stops: the current text of the section could not be retrieved from any official Tennessee source, so no eligibility condition, filing vehicle or required content is stated. Explains that LegalEase refers this route out rather than preparing it, because the showing is a contested evidentiary one made in a survivor-sensitive setting, and gives the participant a real destination and the one thing worth doing before an appointment. Nothing is generated and nothing is filed.",
    notes:
      "Process guidance only, on an adopted product-scope exclusion and on two preserved guidance rationales. Detect, name, refer — and assert nothing about the mechanism: the current text of § 40-32-105 was not retrievable from an official Tennessee source, so eligibility conditions, filing vehicle, contents, fees, waiver and notice are all recorded as not established and none is stated in participant copy. No filing, no evidence-gathering instruction and no request that the participant describe the victimisation."
  })
];
