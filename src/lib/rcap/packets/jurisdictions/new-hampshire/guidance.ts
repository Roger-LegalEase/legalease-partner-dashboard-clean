// New Hampshire process guidance — three routes, none of which the participant
// files anything on.
//
// New Hampshire calls this annulment. It is not expungement and it is not
// destruction, and every sheet in this family says so, because a participant
// who reads "annulled" as "gone" has been misled by the word rather than by
// anything RSA 651:5 says.
//
// Three assigned tracks, all `process_guidance` in the adopted design:
//
//   - `nh_auto_nonconviction` is relief by operation of statute. Under
//     RSA 651:5, II-a(a), where a person is found not guilty on all the charges
//     that resulted from the arrest, or the case is dismissed or not
//     prosecuted, and the offence was disposed of on or after 1 January 2019,
//     the arrest record and the court record shall be annulled thirty days
//     after the finding if no appeal is taken under RSA 606:10, or on final
//     determination of an appeal affirming the dismissal. There is no petition,
//     no fee, no hearing and nothing to file.
//   - `nh_auto_vacated` is the same mechanism on a different trigger. Under
//     RSA 651:5, II-a(b), where a conviction is subsequently vacated by a court
//     and the offence was disposed of on or after 1 January 2019, the arrest
//     record and the court record shall be annulled. Unlike II-a(a) this
//     subparagraph states no thirty-day clock and no appeal trigger on its
//     face. The track begins only after a vacatur already exists; obtaining one
//     is post-conviction litigation and is outside the adopted scope.
//   - `nh_supreme_court_record` is routing. RSA 651:5, XV allows a petition for
//     annulment to be brought in the supreme court as to a supreme court
//     record, except that no supreme court record relating to an opinion
//     published in the New Hampshire Reports may be annulled. No form is
//     published for it and appellate practice is not self-help territory, so
//     the adopted deliverable is detection, the naming of the section, the
//     published-opinion disclosure and a referral. No filing is generated.
//
// Four things the design insists on, carried by every sheet here:
//
//   - Annulment is not erasure. RSA 651:5, X(a) treats the person as if never
//     arrested, convicted or sentenced, and X(c) seals the court record behind
//     a limited access list — but XI(b) lets law enforcement keep and share the
//     records, a prior conviction may still be considered at a later sentencing
//     and may count toward habitual offender status under RSA 259:39, and
//     XVI and XVII put no penalty on anyone who publishes an annulled record or
//     who declines to correct an earlier report of it. That last paragraph is
//     the statutory reason a commercial database keeps showing the case.
//   - Screen hard on the disposition date. The design says in terms that a
//     post-2018 participant should be told the relief is automatic and free,
//     not sold a petition.
//   - RSA 651:5, X(f) prescribes the only permitted form of inquiry. The design
//     records that the reference material does not carry it and that it is
//     directly useful participant-facing content, so every sheet quotes it.
//   - Never a filing. On all three routes the annulment, the order or the
//     petition belongs to somebody else, and no motion, petition or application
//     is generated on any of them.
//
// And five things the adopted design expressly leaves unresolved, which no
// sheet here resolves and no stop here decides:
//
//   - What a participant does when the automatic annulment does not happen.
//     RSA 651:5 provides no express enforcement route. Release blocker.
//   - Whether RSA 651:5, VI can block an automatic annulment where the person
//     has other convictions. Release blocker.
//   - Whether "not prosecuted" covers a nolle prosequi in New Hampshire
//     practice. Release blocker.
//   - Whether "disposed of on or after January 1, 2019" in II-a(b) refers to
//     the original disposition or to the vacatur. Release blocker.
//   - Whether the II-a(b) annulment is immediate on vacatur, no clock being
//     stated. Release blocker.
//
// Each is stated on the sheet it belongs to as an open question, with the
// participant routed to a person rather than to a document. None is answered
// here and none is answered by a typed stop, because a stop that fired on an
// unresolved reading would be this module choosing a side the design refused to
// choose.
//
// No conditional component and no fact placeholder appears anywhere in this
// family: the adopted packet sets make all eleven components required, and no
// template interpolates a participant answer. A second fixture on the same
// track would therefore render byte-for-byte the same packet, so this job adds
// no regression variant. The branches that do matter are typed stops, and every
// one of them is exercised as a negative case by the committed verifier.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. New
// Hampshire is not an enabled jurisdiction and this job does not enable one.
// The New Hampshire petition tracks are official-form work owned by other jobs
// and are untouched here.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** The two places a New Hampshire participant looks the case up. Named once. */
const NH_RECORD_CHECK =
  "your own New Hampshire criminal history record from the State Police Criminal Records Unit, and the case file itself from the clerk of the court that handled the case";

/** Free and low-cost New Hampshire help, named once so no stop is a dead end. */
const NH_LEGAL_HELP =
  "a New Hampshire legal aid office, a New Hampshire law school clinic, the lawyer referral service run by the New Hampshire Bar Association, or a New Hampshire attorney";

/** Said on every automatic route in this family. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes what the law does. It does not tell you what has happened in your case, and LegalEase has not looked. Treat the route as pending until you have checked for yourself.";

/**
 * The disclosure the design puts on every New Hampshire track.
 *
 * The statute uses the word annulment, and the design's list of statements
 * LegalEase must never make includes any suggestion that New Hampshire
 * expunges, deletes or destroys records. So the sheets say what the word means.
 */
const ANNULMENT_IS_NOT_ERASURE =
  "New Hampshire calls this annulment, not expungement. Nothing on any of these routes deletes or destroys a record. RSA 651:5, X(a) provides that a person whose record is annulled is treated in all respects as if never arrested, convicted or sentenced, and X(c) seals the court record behind a limited list of people who may still see it. The paper and the database entries continue to exist.";

/** What the state and the police keep. Required in every description. */
const LAW_ENFORCEMENT_RETENTION =
  "RSA 651:5, XI(b) allows law enforcement to retain the records and to share them for legitimate investigative purposes, in the defence of a civil suit arising out of the arrest, and with the police standards and training council. A prior conviction may still be considered when a court sentences a person for a later crime, and may count toward habitual offender status under RSA 259:39.";

/** Paragraphs XVI and XVII, and why a commercial database keeps showing it. */
const PRIVATE_DATABASE_LIMIT =
  "RSA 651:5, XVI and XVII put no penalty on a journalist, a person or an entity for publishing an annulled record, or for declining to remove or correct an earlier report of one. That is the statutory reason a commercial background-check database can keep showing a case the state has annulled, and it is why nobody should promise you the case will disappear from the internet.";

/** The X(f) inquiry, which the design says the reference material lacks. */
const PERMITTED_INQUIRY =
  "RSA 651:5, X(f) prescribes the only permitted form of inquiry about a criminal record: \"Have you ever been arrested for or convicted of a crime that has not been annulled by a court?\" The wording matters, because it asks only about a crime that has not been annulled. What that means for a particular question on a particular application form is a legal question, and this page does not answer it. Paragraph XII, which once made disclosure of an annulled record an offence, has been repealed, so nobody commits a crime by disclosing one.";

/** The two things annulment does not reach, on every sheet in the family. */
const NO_FEDERAL_AND_NO_FIREARMS =
  "A New Hampshire annulment has no federal effect and no immigration effect, and it does not restore firearm rights. Federal authorities, immigration authorities and other states apply their own law to the record, and none of them is bound by RSA 651:5.";

/** Nothing on any of these three routes is a document the participant files. */
const NO_FILING_ON_THIS_ROUTE =
  "There is no petition, motion or application on this route for you to file, and LegalEase does not generate one. Where the step the statute describes has not happened, the answer is to check the record, to ask the office that holds it, and then to get advice — not to file something RSA 651:5 does not provide for.";

const NH_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot annul, seal or remove anything, and cannot make a court, a clerk, a prosecutor, an arresting agency or the State Police Criminal Records Unit act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been annulled. Only the court file and your own criminal history record show that, and you are the one who reads them.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal history. You request your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor, agency or police unit about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

const NH_SOURCES: readonly string[] = [
  "RSA 651:5, Annulment of Criminal Records, New Hampshire General Court, last amended 2020, 12:1, effective 14 September 2020, read at gc.nh.gov on 6 August 2026.",
  "Annulment of Criminal Records Checklist (08/24/2020), New Hampshire Judicial Branch, Court Service Center, at courts.nh.gov, retrieved 6 August 2026.",
  "RSA 606:10, appeal by the state, New Hampshire General Court, at gc.nh.gov, named by RSA 651:5, II-a(a) as the provision that suspends the thirty-day period.",
  "RSA 259:39, habitual offender, New Hampshire General Court, at gc.nh.gov, named by RSA 651:5 as a provision under which an annulled conviction may still count."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class NewHampshireGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NewHampshireGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different New Hampshire route. */
export class NewHampshireRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NewHampshireRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class NewHampshireBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "NewHampshireBranchError";
  }
}

export const NH_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Only a New Hampshire record is reached by any of these three routes. */
export const NH_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  new_hampshire: true,
  another_state: false,
  federal: false,
  tribal: false,
  military: false
};

/** The II-a(a) trigger. A conviction belongs to the petition route instead. */
export const NH_NONCONVICTION_DISPOSITIONS: Readonly<Record<string, string>> = {
  not_guilty: "within",
  dismissed: "within",
  not_prosecuted: "within",
  convicted: "outside",
  still_pending: "outside"
};

/** Whether every charge from the arrest ended the same way. II-a(a) needs all. */
export const NH_CHARGE_COVERAGE: Readonly<Record<string, boolean>> = {
  all_charges: true,
  some_charges: false
};

/** II-a(b) reaches a conviction "subsequently vacated" and nothing else. */
export const NH_POST_CONVICTION_ORDER_TYPES: Readonly<Record<string, string>> = {
  vacated: "within",
  reversed: "outside",
  set_aside: "outside",
  new_trial: "outside",
  sentence_modified: "outside"
};

/**
 * Which of the two II-a(b) dates falls on or after 1 January 2019.
 *
 * Whether the subparagraph measures from the original disposition or from the
 * vacatur is a preserved release blocker, so only `neither` — outside the
 * subparagraph on either reading — is allowed to stop the route. The other
 * three values are carried into the copy as the open question they are.
 */
export const NH_VACATUR_CUTOVER: Readonly<Record<string, string>> = {
  both: "within_on_either_reading",
  original_only: "depends_on_the_unresolved_reading",
  vacatur_only: "depends_on_the_unresolved_reading",
  neither: "outside_on_either_reading"
};

/** RSA 651:5, XV forbids annulment of a record relating to a published opinion. */
export const NH_PUBLISHED_OPINION: Readonly<Record<string, string>> = {
  published: "forbidden",
  not_published: "open",
  do_not_know: "open"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new NewHampshireBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualised legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

const OUT_OF_JURISDICTION_STOP =
  "RSA 651:5 reaches New Hampshire arrest records and New Hampshire court records. It does not reach a federal, tribal, military or out-of-state record, and none of these three New Hampshire routes touches one.";

const FEDERAL_RECOGNITION_STOP =
  "A New Hampshire annulment has no federal effect and no immigration effect. Federal authorities and immigration authorities apply their own law to a record, and RSA 651:5 does not bind them. Nothing on these routes will make an annulment count where federal law is what is being applied.";

const PRIVATE_DATABASE_STOP =
  "RSA 651:5, XVII says in terms that no person or entity is subject to any penalty for failing to remove or correct an earlier report of a record that has since been annulled. A commercial background-check database may therefore keep showing the case, and no step on this route compels it to stop.";

const FIREARM_STOP =
  "Annulment under RSA 651:5 does not restore firearm rights. Whether a particular person may lawfully possess a firearm turns on state and federal prohibitions this route does not touch, and getting that wrong is a criminal matter rather than a records one.";

/**
 * Validates participant answers and routes to the correct New Hampshire node.
 *
 * The order is the design's: the eligibility-advice boundary first, because a
 * guidance sheet does not decide eligibility; then record jurisdiction, which
 * the exclusions put outside RSA 651:5 on all three tracks; then the three
 * expectation stops the design records identically on all three tracks —
 * federal or immigration recognition, private-database removal and firearm
 * rights — because each is a promise the statute refuses to make and a
 * participant who holds it should learn so before reading anything else; then
 * the route's own questions.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveNewHampshireGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Nobody is served an eligibility opinion by a guidance sheet.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", NH_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new NewHampshireGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      NH_LEGAL_HELP,
      "Take the case papers and your criminal history record to one of them and ask about your own case."
    );
  }

  // Gate 2. Record jurisdiction, an exclusion on all three assigned tracks.
  const jurisdiction = branch(trackId, "recordJurisdiction", NH_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (!jurisdiction.resolved) {
    throw new NewHampshireRouteMismatchError(
      trackId,
      "record_is_not_a_new_hampshire_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal, tribal or military authority that holds the record",
      "Take the record to that authority and ask what its own law provides. If you also hold New Hampshire records, those are handled separately and only those are served here."
    );
  }

  // Gate 3. Federal or immigration recognition, a stop on all three tracks.
  const federal = branch(
    trackId,
    "needsFederalOrImmigrationRecognition",
    NH_YES_NO,
    facts.needsFederalOrImmigrationRecognition
  );
  if (federal.resolved) {
    throw new NewHampshireGuidanceStopError(
      trackId,
      "federal_or_immigration_recognition_needed",
      FEDERAL_RECOGNITION_STOP,
      "an immigration attorney where immigration status is in play, and otherwise " + NH_LEGAL_HELP,
      "Speak to one of them about the record itself before you rely on a New Hampshire annulment for anything federal."
    );
  }

  // Gate 4. The commercial-database expectation, a stop on all three tracks.
  const database = branch(
    trackId,
    "expectsPrivateDatabaseRemoval",
    NH_YES_NO,
    facts.expectsPrivateDatabaseRemoval
  );
  if (database.resolved) {
    throw new NewHampshireGuidanceStopError(
      trackId,
      "private_database_removal_expected",
      PRIVATE_DATABASE_STOP,
      "a consumer-reporting or background-check attorney, or " + NH_LEGAL_HELP,
      "Ask about the federal and state law that governs consumer reports, which is a different body of law from RSA 651:5 and is not what these routes are about."
    );
  }

  // Gate 5. The firearm-rights expectation, a stop on all three tracks.
  const firearms = branch(trackId, "expectsFirearmRightsRestored", NH_YES_NO, facts.expectsFirearmRightsRestored);
  if (firearms.resolved) {
    throw new NewHampshireGuidanceStopError(
      trackId,
      "firearm_rights_restoration_expected",
      FIREARM_STOP,
      NH_LEGAL_HELP,
      "Ask a lawyer about firearm eligibility directly, and do not treat anything on a records route as an answer to it."
    );
  }

  if (trackId === "nh_auto_nonconviction") {
    const disposition = branch(
      trackId,
      "dispositionType",
      NH_NONCONVICTION_DISPOSITIONS,
      facts.dispositionType
    );
    if (disposition.resolved === "outside") {
      throw new NewHampshireRouteMismatchError(
        trackId,
        "case_did_not_end_in_a_non_conviction",
        "RSA 651:5, II-a(a) runs on a finding of not guilty, a dismissal or a decision not to prosecute. A conviction, or a case that is still open, is not within the subparagraph and nothing automatic follows from it.",
        "the New Hampshire annulment petition routes, which are where a conviction is dealt with, and where a case that is still open goes once it ends",
        "Go back to the New Hampshire intake and answer the questions for the disposition the case actually had, taking it from the docket rather than from memory."
      );
    }
    derived.nonConvictionDispositionBranch = disposition.value;

    const cutover = branch(trackId, "disposedOnOrAfterJanuary2019", NH_YES_NO, facts.disposedOnOrAfterJanuary2019);
    if (!cutover.resolved) {
      throw new NewHampshireRouteMismatchError(
        trackId,
        "case_disposed_of_before_january_1_2019",
        "The automatic route reaches an offence disposed of on or after 1 January 2019. An offence disposed of before that date is not annulled by operation of the subparagraph, and relief for it runs through a petition under RSA 651:5, II instead.",
        "the New Hampshire non-conviction annulment petition route",
        "Go back to the New Hampshire intake and answer the questions for the petition route. Check the disposition date on the docket first, because this one date decides which route you are on."
      );
    }

    const coverage = branch(trackId, "allChargesFromTheArrest", NH_CHARGE_COVERAGE, facts.allChargesFromTheArrest);
    if (!coverage.resolved) {
      throw new NewHampshireGuidanceStopError(
        trackId,
        "only_some_charges_from_the_arrest_ended_that_way",
        "RSA 651:5, II-a(a) is written around a finding of not guilty on all the charges that resulted from the arrest. Where only some of the charges ended that way, the automatic route does not reach the arrest, and what is available for the rest is a legal question rather than a timing one.",
        NH_LEGAL_HELP,
        "Take the whole docket, not just the charge that ended in your favour, and ask what the mixed disposition means for the arrest record."
      );
    }

    const appeal = branch(trackId, "stateAppealTaken", NH_YES_NO, facts.stateAppealTaken);
    if (appeal.resolved) {
      throw new NewHampshireGuidanceStopError(
        trackId,
        "state_appeal_taken_under_rsa_606_10",
        "An appeal under RSA 606:10 suspends the thirty-day period. The subparagraph then works from the final determination of an appeal affirming the dismissal, so nothing runs while the appeal is live and this sheet's timing does not apply to you yet.",
        "the clerk of the court that handled the case, and " + NH_LEGAL_HELP,
        "Ask the clerk what the status of the appeal is, and ask a lawyer what the outcome would mean for the record. Come back to this sheet only once an appeal affirming the dismissal has been finally determined."
      );
    }

    const thirtyDays = branch(trackId, "thirtyDaysHaveRun", NH_YES_NO, facts.thirtyDaysHaveRun);
    if (!thirtyDays.resolved) {
      throw new NewHampshireGuidanceStopError(
        trackId,
        "thirty_day_period_has_not_run",
        "The subparagraph annuls the records thirty days after the finding, where no appeal is taken. Until those thirty days have run there is nothing to check for, and nothing in RSA 651:5 brings the date forward.",
        "this sheet again once the thirty days have run, and then the clerk of the court that handled the case",
        "Work out the date thirty days after the finding, write it down, and check the record then."
      );
    }

    const stillAppears = branch(trackId, "recordStillAppears", NH_YES_NO, facts.recordStillAppears);
    if (stillAppears.resolved) {
      throw new NewHampshireGuidanceStopError(
        trackId,
        "record_still_appears_after_the_thirty_days",
        "The thirty days have run, no appeal was taken, every charge from the arrest ended in your favour, and the record is still showing. What a participant does about that is genuinely unsettled: RSA 651:5 provides no express enforcement route, no settled answer exists, and there is no petition on this route that substitutes for the annulment the subparagraph already requires.",
        "the clerk of the court that handled the case and the State Police Criminal Records Unit, and then " + NH_LEGAL_HELP,
        "Ask each of them in writing what their record shows and keep the replies with a dated copy of your criminal history record. Take that file to a lawyer. Do not file a petition on this route: none exists, and this packet does not prepare one."
      );
    }
    derived.automaticAnnulmentWindowHasRun = true;
    return derived;
  }

  if (trackId === "nh_auto_vacated") {
    const seeking = branch(trackId, "seekingTheVacatur", NH_YES_NO, facts.seekingTheVacatur);
    if (seeking.resolved) {
      throw new NewHampshireGuidanceStopError(
        trackId,
        "obtaining_the_vacatur_is_post_conviction_litigation",
        "Getting a conviction vacated is post-conviction litigation, and this service does not do that work. This route begins only after a vacatur already exists. That is a decision about what this service does, not a finding that a vacatur cannot be obtained.",
        NH_LEGAL_HELP,
        "Ask about representation for a post-conviction motion. Come back to this route only if and when a court has vacated the conviction."
      );
    }

    const order = branch(trackId, "postConvictionOrderType", NH_POST_CONVICTION_ORDER_TYPES, facts.postConvictionOrderType);
    if (order.resolved === "outside") {
      throw new NewHampshireGuidanceStopError(
        trackId,
        "order_is_not_a_vacatur",
        "RSA 651:5, II-a(b) reaches a conviction that was subsequently vacated, and says nothing about a reversal, a set-aside, an order for a new trial or a modified sentence. Whether a particular order is a vacatur for the purposes of the subparagraph is a question about the wording of that order, and the design sends any dispute about it to counsel rather than deciding it on a sheet.",
        NH_LEGAL_HELP,
        "Take the order itself to one of them and ask what it did. Do not rely on the label on the docket entry; the wording of the order is what the subparagraph turns on."
      );
    }
    derived.postConvictionOrderBranch = order.value;

    const cutover = branch(trackId, "januaryTwentyNineteenCutover", NH_VACATUR_CUTOVER, facts.januaryTwentyNineteenCutover);
    if (cutover.resolved === "outside_on_either_reading") {
      throw new NewHampshireRouteMismatchError(
        trackId,
        "neither_date_falls_on_or_after_january_1_2019",
        "The subparagraph reaches an offence disposed of on or after 1 January 2019. Whether that phrase measures from the original disposition or from the vacatur is unresolved — but where both dates fall before 1 January 2019 the case is outside the subparagraph on either reading, so this route does not reach it and no reading of the phrase would change that.",
        "the New Hampshire annulment petition routes, which are where a conviction disposed of before 1 January 2019 is dealt with",
        "Go back to the New Hampshire intake and answer the questions for the petition route, taking both dates from the court file."
      );
    }
    derived.vacaturCutoverBranch = cutover.value;
    derived.vacaturCutoverIsUnresolved = cutover.resolved === "depends_on_the_unresolved_reading";

    const stillAppears = branch(trackId, "recordStillAppears", NH_YES_NO, facts.recordStillAppears);
    if (stillAppears.resolved) {
      throw new NewHampshireGuidanceStopError(
        trackId,
        "record_still_appears_after_the_vacatur",
        "The conviction was vacated and the record is still showing. Two things about this subparagraph are unresolved and this sheet decides neither: it states no period at all, so whether the annulment is immediate on vacatur is an open question, and RSA 651:5 provides no express enforcement route where an annulment it requires has not happened.",
        "the clerk of the court that vacated the conviction and the State Police Criminal Records Unit, and then " + NH_LEGAL_HELP,
        "Ask each of them in writing what their record shows, keep the replies with a dated copy of your criminal history record, and take that file to a lawyer. Do not file a petition on this route: none exists, and this packet does not prepare one."
      );
    }
    return derived;
  }

  if (trackId === "nh_supreme_court_record") {
    const appealed = branch(trackId, "caseWentToTheSupremeCourt", NH_YES_NO, facts.caseWentToTheSupremeCourt);
    if (!appealed.resolved) {
      throw new NewHampshireRouteMismatchError(
        trackId,
        "case_did_not_go_to_the_supreme_court",
        "RSA 651:5, XV is about a record held by the supreme court. Where the case never went up on appeal there is no supreme court record to describe, and the trial-court record is reached by the ordinary New Hampshire routes instead.",
        "the ordinary New Hampshire annulment routes for the trial-court record",
        "Go back to the New Hampshire intake and answer the questions for the trial-court disposition the case had."
      );
    }

    const wantsPetition = branch(
      trackId,
      "wantsSupremeCourtPetitionPrepared",
      NH_YES_NO,
      facts.wantsSupremeCourtPetitionPrepared
    );
    if (wantsPetition.resolved) {
      throw new NewHampshireGuidanceStopError(
        trackId,
        "supreme_court_petition_is_outside_the_packet_product",
        "A petition under RSA 651:5, XV is brought in the supreme court. No form is published for it, appellate work is not something a packet you complete yourself can do, and this service does not prepare it. That is a decision about what this service does, not a finding that the petition cannot be brought.",
        NH_LEGAL_HELP + ", asking specifically about appellate work",
        "Ask about representation for a petition in the supreme court. This sheet explains the route and its one absolute limit; it does not prepare the petition."
      );
    }

    const published = branch(trackId, "supremeCourtOpinionPublished", NH_PUBLISHED_OPINION, facts.supremeCourtOpinionPublished);
    if (published.resolved === "forbidden") {
      throw new NewHampshireGuidanceStopError(
        trackId,
        "published_opinion_cannot_be_annulled",
        "RSA 651:5, XV excepts from annulment any supreme court record relating to an opinion published in the New Hampshire Reports. That exception is absolute on the face of the paragraph, and a published opinion is a permanent and searchable artifact that no amount of trial-court relief will reach. There is nothing on this route to prepare for a record in that position.",
        "the ordinary New Hampshire annulment routes for the trial-court record, and " + NH_LEGAL_HELP,
        "Ask what is available for the trial-court record, which is a separate question, and ask a lawyer what a published opinion means in practice for you. Do not spend anything on the supreme court record itself in the expectation that the published opinion can be reached."
      );
    }
    derived.publishedOpinionBranch = published.value;
    return derived;
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

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
  submissionMethod?: string;
  fees?: string;
  feeWaiver?: string;
  noticeOrService?: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  extraCannotPerform?: readonly string[];
  escalations: readonly string[];
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
    submissionMethod:
      input.submissionMethod ??
      "There is nothing to submit and nothing for LegalEase to file. No petition, motion or application exists on this route, so none is generated.",
    fees:
      input.fees ??
      "None. There is nothing to file on this route, so there is nothing to pay for on it.",
    feeWaiver: input.feeWaiver ?? "Not applicable. There is no fee to waive where there is no fee.",
    noticeOrService: input.noticeOrService ?? [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you when the step this page describes has been taken, which is why this packet tells you to go and check."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...NH_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "The record is a federal, tribal, military or out-of-state record.",
      "You need the record to count as annulled for a federal or immigration purpose.",
      "You are relying on annulment to restore firearm rights.",
      ...input.escalations
    ],
    officialSourceReferences: NH_SOURCES
  };
}

/**
 * The three families differ on two sections, so neither is a family default.
 *
 * Fees: RSA 651:5, IX and X(d) exempt a person from the Department of
 * Corrections investigation fee and the Department of Safety and state police
 * fees on a case that ended in a finding of not guilty, a dismissal or a
 * decision not to prosecute. Whether those exemptions would reach a vacated
 * conviction is an open question the design does not answer, and paragraph XV
 * states nothing at all about what a supreme court petition costs.
 *
 * Notice: the order-of-annulment notification is the II-a mechanism. Paragraph
 * XV states no notice provision, so the sentence does not belong on that route.
 */
const AUTOMATIC_ROUTE_NOTICE: readonly string[] = [
  "There is nobody for you to notify and nothing to serve. On entry of an order of annulment the court notifies the state police criminal records unit, the prosecuting agency and the arresting agency.",
  "Nobody is required to write and tell you when the step this page describes has been taken, which is why this packet tells you to go and check."
];

const NON_CONVICTION_FEES =
  "None. There is nothing to file on this route, so there is nothing to pay for on it. Even where a petition is filed for a case that ended in a finding of not guilty, a dismissal or a decision not to prosecute, RSA 651:5, IX and X(d) exempt the person from the Department of Corrections investigation fee and from the Department of Safety and state police fees.";

const VACATED_CONVICTION_FEES =
  "None on this route. There is nothing to file, so there is nothing to pay for. Whether the RSA 651:5, IX and X(d) fee exemptions would reach a vacated conviction, if a petition were needed instead of this route, is an open question and this packet does not answer it.";

const SUPREME_COURT_NOTICE: readonly string[] = [
  "There is nobody for you to notify and nothing to serve through this packet.",
  "Paragraph XV states nothing about notice, and nothing is stated here in its place."
];

function nonConvictionSheet(input: SheetInput): GuidanceTemplate {
  return sheet({ ...input, fees: input.fees ?? NON_CONVICTION_FEES, noticeOrService: input.noticeOrService ?? AUTOMATIC_ROUTE_NOTICE });
}

function vacatedSheet(input: SheetInput): GuidanceTemplate {
  return sheet({ ...input, fees: input.fees ?? VACATED_CONVICTION_FEES, noticeOrService: input.noticeOrService ?? AUTOMATIC_ROUTE_NOTICE });
}

function supremeCourtSheet(input: SheetInput): GuidanceTemplate {
  return sheet({ ...input, noticeOrService: input.noticeOrService ?? SUPREME_COURT_NOTICE });
}

const CLERK_AND_CRIMINAL_RECORDS_UNIT = {
  name: "The clerk of the court that handled the case, and the New Hampshire State Police Criminal Records Unit",
  detail:
    "The clerk holds the case file and the docket, which is where an order of annulment shows up. The State Police Criminal Records Unit holds the state criminal history record and will release your own copy to you on the Criminal Record Release Authorization, form NHJB-2956, with its fee. LegalEase contacts neither and reads neither."
};

export const NEW_HAMPSHIRE_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- nh_auto_nonconviction ----------------------------------------------
  "nh-auto-nonconviction-eligibility-screen": nonConvictionSheet({
    templateId: "nh-auto-nonconviction-eligibility-screen",
    mechanismName:
      "A New Hampshire case that ended in your favour on or after 1 January 2019: what the statute does on its own",
    whyNotAFiling:
      "Nothing is filed by you. Under RSA 651:5, II-a(a) the arrest record and the court record shall be annulled thirty days after a finding of not guilty on all the charges that resulted from the arrest, or after a dismissal or a decision not to prosecute, where the offence was disposed of on or after 1 January 2019 and no appeal is taken under RSA 606:10. There is no petition, no hearing and no fee on this route, so LegalEase generates no filing for it.",
    processType: "automatic",
    prerequisites: [
      "The record is a New Hampshire arrest record or a New Hampshire court record.",
      "The offence was disposed of on or after 1 January 2019. This one date decides whether the relief is automatic and free or runs through a paid petition instead.",
      "Every charge that resulted from the arrest ended in a finding of not guilty, a dismissal, or a decision not to prosecute.",
      "No appeal has been taken under RSA 606:10, or an appeal affirming the dismissal has been finally determined."
    ],
    documentsToObtain: [
      "The court record showing the disposition and its date, from the clerk of the Circuit Court District Division or the Superior Court that disposed of the case. The disposition date decides which route you are on, so it is read off the record rather than recalled.",
      "Your own New Hampshire criminal history record from the State Police Criminal Records Unit, on the Criminal Record Release Authorization, form NHJB-2956, with its fee. Nothing is filed with a court, so this is verification rather than an attachment."
    ],
    gather: [
      "The date the case ended, exactly as the docket states it.",
      "How it ended — a finding of not guilty, a dismissal, or a decision by the prosecutor not to pursue it.",
      "Whether every charge from that arrest ended that way, or only some of them.",
      "Whether the State appealed the dismissal or the finding of not guilty.",
      "Which court handled the case, and where.",
      "The case number, if you have it, so the verification step can find the case."
    ],
    destination: {
      name: "No destination. The annulment occurs by operation of RSA 651:5, II-a(a)",
      detail:
        "There is nowhere for you to send anything. The court and the New Hampshire State Police Criminal Records Unit execute the annulment between them, and on entry of an order of annulment the court notifies the criminal records unit, the prosecuting agency and the arresting agency. The participant files nothing at any point on this route."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Start with the disposition date, because it decides everything else. The automatic route reaches an offence disposed of on or after 1 January 2019. An older case is not annulled by operation of this subparagraph and runs through a petition under RSA 651:5, II instead.",
      "Check how the case ended. RSA 651:5, II-a(a) runs on a finding of not guilty, a dismissal, or a decision not to prosecute — and on nothing else.",
      "One thing about that list is genuinely unsettled and this page does not settle it: whether the words \"not prosecuted\" reach a nolle prosequi in New Hampshire practice. The statute uses the phrase without defining it, and no settled answer to the point was found. If your docket shows a nolle prosequi, treat the route as uncertain rather than as decided either way.",
      "Check that every charge from the arrest ended that way. The subparagraph is written around all the charges that resulted from the arrest, so a charge from the same arrest that ended some other way is a problem for the route rather than a detail of it.",
      "Check whether the State appealed. An appeal under RSA 606:10 suspends the thirty-day period, and the subparagraph then works from the final determination of an appeal affirming the dismissal.",
      "Then count thirty days from the finding and write the date down. That is the point at which the subparagraph says the records shall be annulled, and the point at which there is something to check for.",
      "A second open question belongs here rather than in the small print: whether RSA 651:5, VI can block an automatic annulment where the person has other convictions. Paragraph VI is written around petitions and convictions and does not on its face gate the automatic route, and the question has no settled answer. If you have other convictions, nobody should tell you either way on the strength of this sheet.",
      "Then stop and wait. There is nothing for you to do in the meantime, nothing to pay and nothing to sign. Use the next sheet in this packet to check whether the annulment has happened.",
      NO_FILING_ON_THIS_ROUTE,
      ANNULMENT_IS_NOT_ERASURE
    ],
    expectedNextStage:
      "Once the thirty days have run and no appeal was taken, the subparagraph's condition has been met. The next sheet in this packet is how you find out whether the annulment shows on the record.",
    canPrepare: [
      "This timing calculation and the list of what the subparagraph requires.",
      "A plain statement of what the court does and what the State Police Criminal Records Unit does.",
      "The verification sheet and the escalation sheet that follow it in this packet.",
      "The account of what annulment does and does not reach, which is the last sheet in this packet."
    ],
    escalations: [
      "Only some of the charges from the arrest ended in your favour.",
      "The State appealed the dismissal or the finding of not guilty.",
      "The docket shows a nolle prosequi and you need to know whether it counts.",
      "You have other convictions and need to know whether RSA 651:5, VI affects this route."
    ]
  }),

  "nh-auto-nonconviction-verification": nonConvictionSheet({
    templateId: "nh-auto-nonconviction-verification",
    mechanismName: "Checking whether the automatic annulment has happened",
    whyNotAFiling:
      "This is a plan for reading a court docket and your own criminal history record. Nothing on it is filed, and RSA 651:5, II-a(a) provides no participant application for LegalEase to prepare.",
    processType: "automatic",
    prerequisites: [
      "Thirty days have passed since the finding, and no appeal was taken under RSA 606:10.",
      "You have read the eligibility sheet that comes before this one in the packet."
    ],
    documentsToObtain: [
      "The court docket for the case, from the clerk of the court that disposed of it.",
      "Your own New Hampshire criminal history record from the State Police Criminal Records Unit, on the Criminal Record Release Authorization, form NHJB-2956, with its fee."
    ],
    gather: [
      "The case number and the court that handled the case.",
      "The disposition date, and the date thirty days after it.",
      "The date of each check you make, so you can tell one from another.",
      "What the record showed on each of those dates, in your own words."
    ],
    destination: CLERK_AND_CRIMINAL_RECORDS_UNIT,
    sequence: [
      "Request your own criminal history record from the State Police Criminal Records Unit. The Criminal Record Release Authorization, form NHJB-2956, is what that request runs on, and the unit charges a fee for it. You are not filing anything with a court by doing this.",
      "Ask the clerk of the disposing court for the docket. An order of annulment, if one has been entered, appears there.",
      "Compare the two. The criminal history record is what an employer or a licensing body is most likely to see, and the docket is what the court itself holds. They are separate records maintained by separate bodies, and one can be updated before the other.",
      "Check the disposition date on the record against what you believed it to be, and correct your own notes if they disagree. The date is the thing this whole route turns on.",
      "Where both records show the case annulled, keep a dated copy of each. Nobody is required to write and tell you that this has happened, so a copy you obtained yourself may be the only evidence of it you hold.",
      NOT_A_REPORT_ON_YOUR_CASE,
      "Do not read a delay as a refusal. Nothing on this page tells you how long any of it takes in practice, because nobody has told us.",
      "Where the thirty days have run and the case is still showing on either record, the escalation sheet in this packet is the next page to read.",
      ANNULMENT_IS_NOT_ERASURE
    ],
    expectedNextStage:
      "Either both records show the case annulled, in which case keep a dated copy of each, or one of them does not, in which case the escalation sheet sets out the only route there is.",
    canPrepare: [
      "This verification plan.",
      "The list of exactly what to ask each office for, and in what order.",
      "The escalation sheet that follows it in this packet."
    ],
    escalations: [
      "The clerk cannot tell you whether an order of annulment was entered.",
      "The criminal history record and the court docket disagree with each other.",
      "The disposition date on the record is not the date you believed it to be."
    ]
  }),

  "nh-auto-nonconviction-escalation": nonConvictionSheet({
    templateId: "nh-auto-nonconviction-escalation",
    mechanismName: "Where the New Hampshire record still shows the case after the thirty days",
    whyNotAFiling:
      "This page is escalation guidance. Nothing on it is filed. RSA 651:5 provides no express enforcement route where an automatic annulment has not happened, so there is no application to prepare, and inventing one would be worse than saying so.",
    processType: "automatic",
    prerequisites: [
      "Thirty days have passed since the finding and no appeal was taken, or an appeal affirming the dismissal has been finally determined.",
      "You have checked the docket and your own criminal history record, and the case is still showing on one or both.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "A dated copy of the court docket showing what has and has not been entered.",
      "A dated copy of your own New Hampshire criminal history record.",
      "Your written request to each office, and any reply."
    ],
    gather: [
      "The disposition date and the date the thirty days ran out.",
      "The case number, the court, and the name of the arresting and prosecuting agencies if you know them.",
      "What you asked each office, when you asked it, and what they said."
    ],
    destination: {
      name: "The clerk of the disposing court and the State Police Criminal Records Unit, and then a New Hampshire lawyer",
      detail:
        "The annulment is owed by operation of the subparagraph, so asking the two bodies that hold the record is the first step. Where that does not produce it, the honest answer is a lawyer rather than a form that does not exist."
    },
    sequence: [
      "Say the honest thing first. What a participant does when the automatic annulment does not happen is unresolved. RSA 651:5 provides no express enforcement route, no settled answer to the point was found, and this sheet does not pretend to invent one.",
      "Ask the clerk of the disposing court in writing whether an order of annulment has been entered under RSA 651:5, II-a(a), and if not, what the court's record shows. Put the case number and the disposition date in the request, and keep a copy of it.",
      "Ask the State Police Criminal Records Unit in writing what its record shows for the case, and keep a copy of that request too.",
      "Keep every reply, or the absence of one, with the dated copies of the docket and your criminal history record. That file is the whole of the evidence that the annulment was owed and has not appeared, and it is the first thing anyone you take this to will ask for.",
      NO_FILING_ON_THIS_ROUTE,
      "Take the file to " + NH_LEGAL_HELP + ". A lawyer is the only answer there is to this, and that is not a fob-off: it is the honest position where the statute gives the participant nothing to file.",
      "Nothing here is a finding that any court, clerk or agency has done anything wrong, and nothing on this page says a record has been annulled or has failed to be. It records what each record showed on the day you looked at it.",
      PRIVATE_DATABASE_LIMIT
    ],
    expectedNextStage:
      "You leave this sheet with a dated record of what was owed and what has appeared, and with the one destination that exists for it. Keep that file even if the record is corrected later, because it is the only contemporaneous evidence of what the record showed while it was still wrong. What happens after that depends on advice this packet cannot give.",
    canPrepare: [
      "This escalation plan and the list of what to ask each office.",
      "The account of what is unsettled, stated as unsettled.",
      "The record of what you checked and when, which is what a lawyer will want first."
    ],
    escalations: [
      "The court and the criminal records unit each say the other holds the record.",
      "An employer or a licensing body has acted on the case since the thirty days ran out.",
      "You are told the annulment cannot happen and you are not told why."
    ]
  }),

  "nh-auto-nonconviction-effect-and-limits": nonConvictionSheet({
    templateId: "nh-auto-nonconviction-effect-and-limits",
    mechanismName: "What a New Hampshire annulment does, and what it does not reach",
    whyNotAFiling:
      "This page explains the effect of a statute. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "automatic",
    prerequisites: [
      "You have read the eligibility and verification sheets that come before this one in the packet.",
      "You want to know what the word annulment actually means before you rely on it."
    ],
    documentsToObtain: [
      "Your own New Hampshire criminal history record, so that what follows is read against the record rather than against memory."
    ],
    gather: [
      "Every application, licence or clearance you expect to be affected, and the exact wording of the question each one asks.",
      "Whether any federal, immigration or firearm question is in play, because none of them is reached by this route."
    ],
    destination: {
      name: "No destination. This sheet is an explanation rather than a step",
      detail:
        "Nothing here is sent anywhere. It is the part of the packet that says what the statute does, so that nobody relies on the word annulment for more than it carries."
    },
    sequence: [
      ANNULMENT_IS_NOT_ERASURE,
      "The limited access list at RSA 651:5, X(c) is the practical shape of the sealing. The court record is not open to general public inspection after annulment, but it is not gone, and the paragraph names who may still reach it.",
      "The arresting agency and the prosecuting agency are required to identify the annulment clearly in their own files and electronic records. That is a marking obligation, not a deletion obligation.",
      LAW_ENFORCEMENT_RETENTION,
      PRIVATE_DATABASE_LIMIT,
      PERMITTED_INQUIRY,
      NO_FEDERAL_AND_NO_FIREARMS,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet knowing what annulment reaches, what still holds the record afterwards, and which expectations RSA 651:5 refuses to meet.",
    canPrepare: [
      "This account of the effect of annulment and of its limits.",
      "The quotation of the only permitted form of inquiry.",
      "The account of what the arresting and prosecuting agencies must mark in their own files, which is a marking obligation rather than a deletion one.",
      "The list of what is not reached, which is the part most people are not told."
    ],
    escalations: [
      "An application asks about your record in some other form of words than the one RSA 651:5, X(f) prescribes.",
      "A prosecutor has raised the annulled case as a prior in a later matter.",
      "A commercial background-check report is still showing the case and it is costing you something."
    ]
  }),

  // ---- nh_auto_vacated -----------------------------------------------------
  "nh-auto-vacated-eligibility-screen": vacatedSheet({
    templateId: "nh-auto-vacated-eligibility-screen",
    mechanismName: "A New Hampshire conviction that a court has vacated: what the statute does on its own",
    whyNotAFiling:
      "Nothing is filed by you. Under RSA 651:5, II-a(b), where a criminal conviction is subsequently vacated by a court and the offence was disposed of on or after 1 January 2019, the arrest record and the court record shall be annulled. Relief is mandatory and there is nothing to file, so LegalEase generates no filing for it.",
    processType: "automatic",
    prerequisites: [
      "The record is a New Hampshire arrest record or a New Hampshire court record.",
      "A court has already vacated the conviction. This route begins after that has happened; getting a conviction vacated is post-conviction litigation and is outside what this service does.",
      "You hold, or can obtain, the order itself — not just the docket entry describing it."
    ],
    documentsToObtain: [
      "The order vacating the conviction, from the clerk of the court that entered it. Nothing is filed with it, but the order is what shows the annulment is owed, and its wording decides whether the case is within the subparagraph at all.",
      "Your own New Hampshire criminal history record from the State Police Criminal Records Unit, on the Criminal Record Release Authorization, form NHJB-2956, with its fee."
    ],
    gather: [
      "What the court order actually says — that the conviction was vacated, reversed or set aside, that a new trial was granted, or that the sentence was modified.",
      "The date the conviction was vacated.",
      "The date the original case was decided.",
      "Which court entered the conviction, and which court vacated it.",
      "The case number."
    ],
    destination: {
      name: "No destination. The annulment occurs by operation of RSA 651:5, II-a(b)",
      detail:
        "There is nowhere for you to send anything. As on the non-conviction route, the court and the State Police Criminal Records Unit execute the annulment between them and the court notifies the criminal records unit, the prosecuting agency and the arresting agency. The participant files nothing."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Start with the order. RSA 651:5, II-a(b) reaches a conviction that was subsequently vacated, and says nothing about a reversal, a set-aside, an order granting a new trial or a modified sentence. Read the order itself rather than the docket summary of it, because the wording is what the subparagraph turns on.",
      "Then take both dates: the date the original case was decided, and the date the conviction was vacated.",
      "Here is the part this sheet will not decide for you. The subparagraph reaches an offence \"disposed of on or after 1 January 2019\", and whether that phrase measures from the original disposition or from the vacatur is unresolved. No settled answer to it was found, and it decides whether an old case with a recent vacatur is automatic or needs a petition instead. Where one of your two dates falls on each side of 1 January 2019, nobody should tell you which reading governs on the strength of this sheet.",
      "Note what the subparagraph does not say. Unlike the non-conviction route it states no thirty-day clock and no appeal trigger of any kind. Whether the annulment is immediate on the vacatur is a second open question, so this sheet gives you no date to count to and no deadline to meet.",
      "Because there is no stated period, the honest advice is to check rather than to wait for a particular day. Use the next sheet in this packet to do that.",
      NO_FILING_ON_THIS_ROUTE,
      ANNULMENT_IS_NOT_ERASURE
    ],
    expectedNextStage:
      "You leave this sheet knowing what the subparagraph requires, and knowing which two things about it are unsettled. The next sheet is how you check what the record shows.",
    canPrepare: [
      "This account of what RSA 651:5, II-a(b) requires and of what it leaves unstated.",
      "A plain statement of what the court does and what the State Police Criminal Records Unit does.",
      "The verification sheet and the escalation sheet that follow it in this packet.",
      "The account of what annulment does and does not reach, which is the last sheet in this packet."
    ],
    escalations: [
      "The order might be a reversal, a set-aside, a new trial order or a sentence modification rather than a vacatur.",
      "One of your two dates falls before 1 January 2019 and the other falls after it.",
      "You want the conviction vacated and it has not been, which is post-conviction litigation rather than a records question."
    ]
  }),

  "nh-auto-vacated-verification": vacatedSheet({
    templateId: "nh-auto-vacated-verification",
    mechanismName: "Checking whether the annulment has followed the vacatur",
    whyNotAFiling:
      "This is a plan for reading a court docket and your own criminal history record. Nothing on it is filed, and RSA 651:5, II-a(b) provides no participant application for LegalEase to prepare.",
    processType: "automatic",
    prerequisites: [
      "A court has vacated the conviction and you hold, or can obtain, the order.",
      "You have read the eligibility sheet that comes before this one in the packet, including the two questions it leaves open."
    ],
    documentsToObtain: [
      "The order vacating the conviction, from the clerk of the court that entered it.",
      "The court docket for the case, from the same clerk.",
      "Your own New Hampshire criminal history record from the State Police Criminal Records Unit, on the Criminal Record Release Authorization, form NHJB-2956, with its fee."
    ],
    gather: [
      "The case number, the court that entered the conviction and the court that vacated it.",
      "The date of the vacatur and the date of the original disposition.",
      "The date of each check you make, so you can tell one from another.",
      "What each record showed on each of those dates, in your own words."
    ],
    destination: CLERK_AND_CRIMINAL_RECORDS_UNIT,
    sequence: [
      "Ask the clerk of the court that vacated the conviction for a copy of the order and for the docket. Read the order rather than the entry describing it.",
      "Request your own criminal history record from the State Police Criminal Records Unit on form NHJB-2956, with its fee. You are not filing anything with a court by doing this.",
      "Compare the two. The criminal history record is what an employer or a licensing body is most likely to see; the docket is what the court itself holds. They are separate records kept by separate bodies and one can be updated before the other.",
      "Because the subparagraph states no period at all, there is no particular day on which to expect the change. Check, note the date you checked, and check again rather than treating any interval as the right one.",
      "Where both records show the case annulled, keep a dated copy of each. Nobody is required to tell you that it has happened.",
      NOT_A_REPORT_ON_YOUR_CASE,
      "Do not read a delay as a refusal. Nothing on this page tells you how long any of it takes in practice, because the statute states nothing and nobody has told us.",
      "Where the record still shows the case, the escalation sheet in this packet is the next page to read.",
      ANNULMENT_IS_NOT_ERASURE
    ],
    expectedNextStage:
      "Either both records show the case annulled, in which case keep a dated copy of each, or one of them does not, in which case the escalation sheet sets out the only route there is.",
    canPrepare: [
      "This verification plan.",
      "The list of exactly what to ask each office for, and in what order.",
      "The escalation sheet that follows it in this packet."
    ],
    escalations: [
      "The clerk cannot tell you whether an order of annulment was entered after the vacatur.",
      "The criminal history record and the court docket disagree with each other.",
      "The record still describes the case as a conviction."
    ]
  }),

  "nh-auto-vacated-escalation": vacatedSheet({
    templateId: "nh-auto-vacated-escalation",
    mechanismName: "Where the record still shows a vacated New Hampshire conviction",
    whyNotAFiling:
      "This page is escalation guidance. Nothing on it is filed. RSA 651:5 provides no express enforcement route where an annulment it requires has not happened, so there is no application to prepare, and inventing one would be worse than saying so.",
    processType: "automatic",
    prerequisites: [
      "A court has vacated the conviction.",
      "You have checked the docket and your own criminal history record, and the case is still showing on one or both.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "A dated copy of the order vacating the conviction.",
      "A dated copy of the court docket and of your own New Hampshire criminal history record.",
      "Your written request to each office, and any reply."
    ],
    gather: [
      "The date of the vacatur, the date of the original disposition, and the case number.",
      "The court that entered the conviction and the court that vacated it.",
      "What you asked each office, when you asked it, and what they said."
    ],
    destination: {
      name: "The clerk of the court that vacated the conviction and the State Police Criminal Records Unit, and then a New Hampshire lawyer",
      detail:
        "The annulment is owed by operation of the subparagraph, so asking the two bodies that hold the record is the first step. Where that does not produce it, the honest answer is a lawyer rather than a form that does not exist."
    },
    sequence: [
      "Say the honest thing first, and there are two of them here. The subparagraph states no period, so whether the annulment is immediate on the vacatur is unresolved. And RSA 651:5 provides no express enforcement route where an annulment it requires has not happened. Neither question has a settled answer and this sheet does not invent one.",
      "Ask the clerk of the court that vacated the conviction, in writing, whether an order of annulment has been entered under RSA 651:5, II-a(b), and if not, what the court's record shows. Put the case number and both dates in the request, and keep a copy.",
      "Ask the State Police Criminal Records Unit in writing what its record shows for the case, and keep a copy of that request too.",
      "Keep every reply, or the absence of one, with the dated copies of the vacatur order, the docket and your criminal history record. That file is the whole of the evidence that the annulment was owed and has not appeared.",
      NO_FILING_ON_THIS_ROUTE,
      "Take the file to " + NH_LEGAL_HELP + ". A lawyer is the only answer there is to this, and that is the honest position where the statute gives the participant nothing to file.",
      "Nothing here is a finding that any court, clerk or agency has done anything wrong, and nothing on this page says a record has been annulled or has failed to be. It records what each record showed on the day you looked at it.",
      PRIVATE_DATABASE_LIMIT
    ],
    expectedNextStage:
      "You leave this sheet with a dated record of what was owed and what has appeared, and with the one destination that exists for it. What happens after that depends on advice this packet cannot give.",
    canPrepare: [
      "This escalation plan and the list of what to ask each office.",
      "The account of what is unsettled, stated as unsettled.",
      "The record of what you checked and when, which is what a lawyer will want first."
    ],
    escalations: [
      "You are told the vacatur was not a vacatur.",
      "The court and the criminal records unit each say the other holds the record.",
      "An employer or a licensing body has acted on the case since the conviction was vacated."
    ]
  }),

  "nh-auto-vacated-effect-and-limits": vacatedSheet({
    templateId: "nh-auto-vacated-effect-and-limits",
    mechanismName: "What annulment after a vacatur does, and what it does not reach",
    whyNotAFiling:
      "This page explains the effect of a statute. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "automatic",
    prerequisites: [
      "You have read the eligibility and verification sheets that come before this one in the packet.",
      "You want to know what the word annulment actually means before you rely on it."
    ],
    documentsToObtain: [
      "Your own New Hampshire criminal history record, so that what follows is read against the record rather than against memory."
    ],
    gather: [
      "Every application, licence or clearance you expect to be affected, and the exact wording of the question each one asks.",
      "Whether any federal, immigration or firearm question is in play, because none of them is reached by this route."
    ],
    destination: {
      name: "No destination. This sheet is an explanation rather than a step",
      detail:
        "Nothing here is sent anywhere. It is the part of the packet that says what the statute does, so that nobody relies on the word annulment for more than it carries."
    },
    sequence: [
      ANNULMENT_IS_NOT_ERASURE,
      "The limited access list at RSA 651:5, X(c) is the practical shape of the sealing. The court record is not open to general public inspection after annulment, but it is not gone, and the paragraph names who may still reach it.",
      "The arresting agency and the prosecuting agency are required to identify the annulment clearly in their own files and electronic records. That is a marking obligation, not a deletion obligation.",
      LAW_ENFORCEMENT_RETENTION,
      "That last point matters more on this route than on any other in the family, because the case began as a conviction. A vacatur followed by an annulment is not the same thing as the conviction never having been entered, and anyone who tells you the two are identical is going further than RSA 651:5 does.",
      PRIVATE_DATABASE_LIMIT,
      PERMITTED_INQUIRY,
      NO_FEDERAL_AND_NO_FIREARMS,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet knowing what annulment reaches, what still holds the record afterwards, and which expectations RSA 651:5 refuses to meet.",
    canPrepare: [
      "This account of the effect of annulment and of its limits.",
      "The quotation of the only permitted form of inquiry.",
      "The list of what is not reached, which is the part most people are not told."
    ],
    escalations: [
      "A prosecutor has raised the vacated conviction as a prior in a later matter.",
      "An application asks about your record in some other form of words than the one RSA 651:5, X(f) prescribes.",
      "A commercial background-check report is still showing the conviction and it is costing you something."
    ]
  }),

  // ---- nh_supreme_court_record --------------------------------------------
  "nh-supreme-court-detection-and-naming": supremeCourtSheet({
    templateId: "nh-supreme-court-detection-and-naming",
    mechanismName: "Records of a New Hampshire appeal: what RSA 651:5, XV is, and why this packet stops here",
    whyNotAFiling:
      "LegalEase generates no filing for this route. RSA 651:5, XV allows a petition for annulment to be brought in the supreme court as to a supreme court record. No form is published for it, appellate work is not something a packet you complete yourself can do, and this service does not prepare it — so this packet names the paragraph and refers, and prepares nothing.",
    processType: "court_adjacent",
    prerequisites: [
      "Your case went to the New Hampshire Supreme Court on appeal, so there is a supreme court record as well as a trial-court one.",
      "You understand before you read further that this packet prepares no document on this route."
    ],
    documentsToObtain: [
      "Anything you hold that identifies the appeal — the notice of appeal, correspondence from the court, or an order or opinion in the case.",
      "The trial-court docket, because the trial-court record is a separate question dealt with by the ordinary New Hampshire routes."
    ],
    gather: [
      "What the case was called on appeal, and the Supreme Court docket number if you know it.",
      "Whether the Supreme Court issued a written opinion in the case, and whether it was published.",
      "Which trial court the case came from, and its case number."
    ],
    destination: {
      name: "The New Hampshire Supreme Court",
      detail:
        "The petition RSA 651:5, XV describes is brought in the supreme court itself. LegalEase generates nothing for that destination: it identifies that the case went up on appeal, names the paragraph, discloses the one absolute limit the paragraph carries, and refers you on. Work in the supreme court is outside what this service prepares."
    },
    sequence: [
      "First, what this route is. RSA 651:5, XV provides that a petition for annulment authorised by RSA 651:5 may be brought in the supreme court with respect to any such record in the supreme court. The trial-court record and the supreme court record are separate things, and this paragraph is about the second of them.",
      "Second, what it excepts, which is the next sheet in this packet and the reason it exists: no supreme court record relating to an opinion published in the New Hampshire Reports may be annulled.",
      "Third, what this packet does. It detects that your case went up on appeal, names the paragraph, states that exception, and refers you. It prepares no petition, and there is no published form for one.",
      "That is a decision about what this service does, not a finding that the petition cannot be brought. Somebody who practises in the supreme court can tell you whether it is worth bringing in your case; this packet cannot and does not.",
      "Deal with the trial-court record separately. It is reached by the ordinary New Hampshire routes rather than by this paragraph, and it is usually the record that an employer or a licensing body actually sees.",
      NOT_A_REPORT_ON_YOUR_CASE,
      ANNULMENT_IS_NOT_ERASURE
    ],
    submissionMethod:
      "There is nothing to submit and nothing for LegalEase to file. A petition under RSA 651:5, XV is brought in the supreme court by somebody who practises there, and no petition, motion or application is generated by this packet.",
    fees:
      "Not determined. RSA 651:5, XV does not state what a petition in the supreme court costs, and no figure is stated here rather than one being guessed at.",
    feeWaiver:
      "Not determined. The paragraph states nothing about a waiver, and this packet does not invent one.",
    expectedNextStage:
      "You leave this sheet knowing what the paragraph is, that this packet prepares nothing on it, and that the published-opinion exception on the next sheet may decide the question before anything else does.",
    canPrepare: [
      "This explanation of what RSA 651:5, XV is and of how the supreme court record differs from the trial-court record.",
      "The published-opinion disclosure that follows it in this packet.",
      "The referral sheet that follows that, including what to take with you."
    ],
    escalations: [
      "You do not know whether the Supreme Court issued an opinion in your case.",
      "You want the supreme court record dealt with and need somebody who practises there.",
      "The trial-court record and the appellate record are being confused with each other by whoever is asking you about them."
    ]
  }),

  "nh-supreme-court-published-opinion": supremeCourtSheet({
    templateId: "nh-supreme-court-published-opinion",
    mechanismName: "The one absolute limit: a published opinion can never be annulled",
    whyNotAFiling:
      "This page states a statutory exception. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheet before this one and know that this packet prepares no petition on this route.",
      "You want to know, before spending anything, whether the record you are asking about is one the statute puts out of reach."
    ],
    documentsToObtain: [
      "Any written decision the Supreme Court issued in the case, and anything showing whether it was published in the New Hampshire Reports."
    ],
    gather: [
      "Whether the Supreme Court issued a written opinion in your case at all.",
      "If it did, whether that opinion was published.",
      "What the case was called on appeal, because a published opinion is indexed and searchable under that name."
    ],
    destination: {
      name: "No destination. This sheet is a disclosure rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because a participant should learn about an absolute statutory bar before spending time or money on a route it closes."
    },
    sequence: [
      "RSA 651:5, XV excepts from annulment any supreme court record relating to an opinion published in the New Hampshire Reports. The exception is stated without qualification.",
      "The practical consequence is worth being blunt about. A published opinion is a permanent and searchable artifact. It is indexed, reported, quoted in later cases and carried by commercial legal databases, and no amount of trial-court relief will reach it.",
      "So a participant whose case produced a published opinion should know that before anything else is considered. This is not a discouraging opinion about the merits; it is what the paragraph says.",
      "Where you do not know whether an opinion was published, that is a question for somebody who practises in the supreme court, and it is worth answering early because it can decide the whole question.",
      "None of this affects the trial-court record, which is reached by the ordinary New Hampshire routes and is a separate matter.",
      PRIVATE_DATABASE_LIMIT,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    submissionMethod:
      "There is nothing to submit and nothing for LegalEase to file. This sheet is a disclosure, and no petition, motion or application is generated on this route.",
    fees: "None. This sheet is an explanation and there is nothing on it to pay for.",
    feeWaiver: "Not applicable. There is no fee to waive where there is no fee.",
    expectedNextStage:
      "You leave this sheet knowing whether the paragraph's absolute exception is in play, or knowing that finding out is the first thing to ask about.",
    extraCannotPerform: [
      "LegalEase cannot tell you whether the Supreme Court published an opinion in your case. That is a question for somebody who practises in that court, and it can decide this whole route before anything else is considered."
    ],
    canPrepare: [
      "This disclosure of the published-opinion exception and of what it means in practice.",
      "The referral sheet that follows it in this packet."
    ],
    escalations: [
      "You need to know whether the opinion in your case was published.",
      "A published opinion in your case is being used against you and you need to know what can be done about that.",
      "You are being told that a published opinion can be removed."
    ]
  }),

  "nh-supreme-court-referral": supremeCourtSheet({
    templateId: "nh-supreme-court-referral",
    mechanismName: "Where to take a New Hampshire supreme court record, and what to take with you",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed. A petition under RSA 651:5, XV is brought in the supreme court by somebody who practises there, and this packet prepares no petition.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the two sheets before this one, including the published-opinion exception.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "Whatever identifies the appeal: the notice of appeal, the Supreme Court docket number, any order or opinion, and correspondence from the court.",
      "The trial-court docket and disposition, because the two records are dealt with separately.",
      "Your own New Hampshire criminal history record, so that whoever advises you is working from the record rather than from memory."
    ],
    gather: [
      "The name of the case on appeal and the Supreme Court docket number, if you know it.",
      "Whether an opinion was issued and whether it was published.",
      "What you actually want — the supreme court record dealt with, the trial-court record dealt with, or both.",
      "Any deadline somebody else has imposed on you, such as an application closing date, so that it can be taken into account."
    ],
    destination: {
      name: "A New Hampshire lawyer who practises in the supreme court",
      detail:
        "The paragraph puts the petition in the supreme court, and no form is published for it. That combination is why this route ends in a referral rather than a packet, and the referral is the deliverable rather than a stage on the way to one."
    },
    sequence: [
      "Take the appeal papers, the trial-court docket and your own criminal history record to " + NH_LEGAL_HELP + ", and ask specifically about appellate work. Not every practitioner does it.",
      "Ask two questions in this order. First, was an opinion published in the case — because if it was, RSA 651:5, XV excepts that record from annulment and the rest of the conversation changes. Second, what a petition in the supreme court would involve and what it would cost.",
      "Ask separately about the trial-court record. It is reached by the ordinary New Hampshire routes and it is usually the record an employer or a licensing body actually sees, so it may be the more useful thing to deal with first.",
      "What a petition under RSA 651:5, XV looks like as an instrument, and what it costs, is not settled here: no published form for it was found. Nothing on this page tells you the answer, because nobody has it.",
      "Paragraph XV states no time limit of its own. If somebody else has given you a deadline, that deadline is theirs and not the paragraph's.",
      NOT_A_REPORT_ON_YOUR_CASE,
      ANNULMENT_IS_NOT_ERASURE,
      NO_FEDERAL_AND_NO_FIREARMS
    ],
    submissionMethod:
      "There is nothing to submit and nothing for LegalEase to file. The referral is the deliverable on this route, and no petition, motion or application is generated.",
    fees:
      "Not determined. RSA 651:5, XV does not state what a petition in the supreme court costs, and this packet does not guess at a figure.",
    feeWaiver:
      "Not determined. The paragraph states nothing about a waiver, and this packet does not invent one.",
    expectedNextStage:
      "You leave this packet with the paragraph named, the absolute exception disclosed, the papers gathered and a destination that can actually act on them. What happens next is a conversation this packet cannot have for you.",
    canPrepare: [
      "This referral, and the list of what to take and what to ask.",
      "The account of what is not settled about the instrument itself, stated as unsettled.",
      "The separation of the appellate record from the trial-court record, which is the thing most often confused when somebody asks you about the case.",
      "The two sheets before this one, which explain the paragraph and its exception."
    ],
    escalations: [
      "You cannot find a practitioner who does appellate work.",
      "You are told the supreme court record has been dealt with and you have nothing showing it.",
      "Somebody has quoted you a fee for a petition and you have no way to judge it."
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
      if (!NEW_HAMPSHIRE_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no New Hampshire guidance template ${component.templateId} is registered.`
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

/**
 * Asked on every New Hampshire route in this family, in this order.
 *
 * The last three are the design's own stop conditions, and it records the same
 * three identically on all three assigned tracks: a participant who needs the
 * annulment recognised federally or for immigration, who expects a commercial
 * database to remove the record, or who expects firearm rights restored, is
 * outside what RSA 651:5 does on any of these routes. Asking them first means
 * the disappointment arrives before the reading rather than after it.
 */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want advice about whether your particular record qualifies?",
    required: true
  },
  {
    key: "recordJurisdiction",
    label:
      "Is the record from New Hampshire, another state, the federal courts, a tribal court, or a military court?",
    required: true
  },
  {
    key: "needsFederalOrImmigrationRecognition",
    label:
      "Do you need this record to count as cleared for a federal purpose or for immigration — for example, are you not a United States citizen?",
    required: true
  },
  {
    key: "expectsPrivateDatabaseRemoval",
    label:
      "Are you expecting a commercial background-check website or database to take the case down?",
    required: true
  },
  {
    key: "expectsFirearmRightsRestored",
    label: "Are you expecting this to restore your right to possess a firearm?",
    required: true
  }
];

function newHampshireTrack(input: {
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
    jurisdiction: "NH",
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

export const NEW_HAMPSHIRE_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  newHampshireTrack({
    trackId: "nh_auto_nonconviction",
    publicName: "Your dismissed or not-guilty New Hampshire case should clear itself",
    mechanism: "automatic_annulment_of_a_non_conviction_disposed_of_on_or_after_1_january_2019",
    authority: "RSA 651:5, II-a(a), RSA 651:5, X, RSA 651:5, XI(b), RSA 606:10 and RSA 259:39",
    recordTypes: ["arrest", "court_record"],
    dispositions: ["not_guilty_all_charges", "dismissed", "not_prosecuted"],
    components: [
      {
        componentId: "nh_auto_nonconviction-eligibility-screen-1",
        templateId: "nh-auto-nonconviction-eligibility-screen"
      },
      {
        componentId: "nh_auto_nonconviction-verification-instructions-2",
        templateId: "nh-auto-nonconviction-verification"
      },
      {
        componentId: "nh_auto_nonconviction-escalation-instructions-3",
        templateId: "nh-auto-nonconviction-escalation"
      },
      {
        componentId: "nh_auto_nonconviction-effect-and-limits-disclosure-4",
        templateId: "nh-auto-nonconviction-effect-and-limits"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      { key: "dispositionDate", label: "On what date did the case end?", required: true },
      {
        key: "dispositionType",
        label:
          "How did it end — not guilty, dismissed, the prosecutor decided not to pursue it, a conviction, or is it still open?",
        required: true
      },
      {
        key: "disposedOnOrAfterJanuary2019",
        label: "Did the case end on or after 1 January 2019?",
        required: true
      },
      {
        key: "allChargesFromTheArrest",
        label: "Did every charge from that arrest end that way, or only some of them?",
        required: true
      },
      {
        key: "stateAppealTaken",
        label: "Did the State appeal the dismissal or the not-guilty finding?",
        required: true
      },
      {
        key: "thirtyDaysHaveRun",
        label: "Have thirty days passed since the case ended?",
        required: true
      },
      {
        key: "recordStillAppears",
        label: "Does the case still appear on your court record or your criminal history record now?",
        required: true
      },
      { key: "disposingCourt", label: "Which court handled the case, and where?", required: true },
      { key: "caseNumber", label: "What is the case number, if you have it?", required: false }
    ],
    assembledPacketName: "new-hampshire-automatic-annulment-non-conviction",
    assembledPacketTitle: "New Hampshire automatic annulment — a case that ended in your favour",
    customerDeliverableDescription:
      "Screens a New Hampshire non-conviction on the disposition date, explains that RSA 651:5, II-a(a) annuls the arrest and court records thirty days after the finding with no petition, no hearing and no fee, shows how to verify it against the court docket and the state criminal history record, sets out the escalation where the record still shows the case, and states what annulment does not reach. Nothing is filed by the participant and no fee is charged.",
    notes:
      "Process guidance only. Relief is by operation of RSA 651:5, II-a(a); never generate a petition. Three release blockers are preserved on the sheets rather than resolved: the absence of any enforcement route, the reach of paragraph VI where the person has other convictions, and whether a nolle prosequi is a decision not to prosecute."
  }),

  newHampshireTrack({
    trackId: "nh_auto_vacated",
    publicName: "Your vacated New Hampshire conviction should clear itself",
    mechanism: "automatic_annulment_after_a_vacated_conviction_disposed_of_on_or_after_1_january_2019",
    authority: "RSA 651:5, II-a(b), RSA 651:5, X and RSA 651:5, XI(b)",
    recordTypes: ["arrest", "court_record", "conviction"],
    dispositions: ["conviction_vacated"],
    components: [
      {
        componentId: "nh_auto_vacated-eligibility-screen-1",
        templateId: "nh-auto-vacated-eligibility-screen"
      },
      {
        componentId: "nh_auto_vacated-verification-instructions-2",
        templateId: "nh-auto-vacated-verification"
      },
      {
        componentId: "nh_auto_vacated-escalation-instructions-3",
        templateId: "nh-auto-vacated-escalation"
      },
      {
        componentId: "nh_auto_vacated-effect-and-limits-disclosure-4",
        templateId: "nh-auto-vacated-effect-and-limits"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "seekingTheVacatur",
        label: "Are you asking LegalEase to help get the conviction vacated?",
        required: true
      },
      {
        key: "postConvictionOrderType",
        label:
          "What did the court order say — that the conviction was vacated, reversed, set aside, that you were granted a new trial, or that the sentence was modified?",
        required: true
      },
      { key: "vacaturDate", label: "On what date was the conviction vacated?", required: true },
      {
        key: "originalDispositionDate",
        label: "On what date was the original case decided?",
        required: true
      },
      {
        key: "januaryTwentyNineteenCutover",
        label:
          "Which of those two dates falls on or after 1 January 2019 — both, the original disposition only, the vacatur only, or neither?",
        required: true
      },
      {
        key: "convictingAndVacatingCourt",
        label: "Which court entered the conviction, and which court vacated it?",
        required: true
      },
      { key: "caseNumber", label: "What is the case number?", required: true },
      {
        key: "recordStillAppears",
        label: "Does the case still appear on your court record or your criminal history record now?",
        required: true
      }
    ],
    assembledPacketName: "new-hampshire-automatic-annulment-vacated-conviction",
    assembledPacketTitle: "New Hampshire automatic annulment — a conviction a court has vacated",
    customerDeliverableDescription:
      "Explains that RSA 651:5, II-a(b) annuls the arrest and court records where a conviction has been vacated, screens on what the order actually says, shows how to verify the result against the court docket and the state criminal history record, sets out the escalation where the record still shows the case, and states what annulment does not reach. Nothing is filed by the participant and no fee is charged.",
    notes:
      "Process guidance only. Obtaining the vacatur is post-conviction litigation and outside scope; never generate a petition. Two release blockers are preserved on the sheets rather than resolved: whether the 1 January 2019 cutover measures from the original disposition or from the vacatur, and whether the annulment is immediate on vacatur where no period is stated."
  }),

  newHampshireTrack({
    trackId: "nh_supreme_court_record",
    publicName: "Records of a New Hampshire appeal",
    mechanism: "referral_for_annulment_of_a_supreme_court_record_under_rsa_651_5_xv",
    authority: "RSA 651:5, XV and RSA 651:5, X",
    recordTypes: ["appellate_record"],
    dispositions: ["appealed"],
    components: [
      {
        componentId: "nh_supreme_court_record-detection-and-naming-1",
        templateId: "nh-supreme-court-detection-and-naming"
      },
      {
        componentId: "nh_supreme_court_record-published-opinion-disclosure-2",
        templateId: "nh-supreme-court-published-opinion"
      },
      {
        componentId: "nh_supreme_court_record-referral-instructions-3",
        templateId: "nh-supreme-court-referral"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "caseWentToTheSupremeCourt",
        label: "Did your case go to the New Hampshire Supreme Court on appeal?",
        required: true
      },
      {
        key: "wantsSupremeCourtPetitionPrepared",
        label: "Do you want LegalEase to prepare the supreme court petition itself?",
        required: true
      },
      {
        key: "supremeCourtOpinionPublished",
        label:
          "Did the Supreme Court issue a written opinion in your case that was published — published, not published, or you do not know?",
        required: true
      },
      {
        key: "supremeCourtCaseIdentifiers",
        label: "What was the case called and, if you know it, what was the Supreme Court docket number?",
        required: false
      },
      {
        key: "trialCourtIdentifiers",
        label: "Which trial court did the case come from, and what was its case number?",
        required: false
      }
    ],
    assembledPacketName: "new-hampshire-supreme-court-record-referral",
    assembledPacketTitle: "New Hampshire supreme court record — RSA 651:5, XV and where it goes",
    customerDeliverableDescription:
      "Identifies that a participant's case went to the New Hampshire Supreme Court, names RSA 651:5, XV, discloses that no supreme court record relating to an opinion published in the New Hampshire Reports may ever be annulled, separates the appellate record from the trial-court record, and refers the participant to a practitioner with the papers gathered. No petition is prepared and no fee is charged.",
    notes:
      "Process guidance only, and a referral rather than a packet route. Appellate practice is outside the adopted scope and no form is published for the RSA 651:5, XV petition; never generate one. What the instrument is and what it costs remains a recorded research note and is stated as unsettled."
  })
];
