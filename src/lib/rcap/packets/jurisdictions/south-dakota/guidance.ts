// South Dakota process guidance — four routes, none of which the participant
// files anything on.
//
// Four assigned tracks, all `process_guidance` in the adopted design:
//
//   - `sd_diversion` is prosecutor-driven. Under SDCL §§ 23A-3-35 to 23A-3-37,
//     where a person completed every term of a diversion programme and has not
//     been charged with a new crime other than a petty offence or minor traffic
//     citation within one year and thirty days of completion, the State's
//     Attorney files the dismissal of all charges and the notice of completion,
//     and the court then grants the expungement without a motion or any further
//     action. The statute routes around the participant entirely.
//   - `sd_23a_3_34_auto` is relief by operation of statute. A case whose highest
//     charged offence was a petty offence, a municipal ordinance violation or a
//     Class 2 misdemeanor is automatically removed from the public record after
//     five years where the court-ordered conditions were satisfied and there
//     was no further conviction in the period.
//   - `sd_sis_sealing` is court action on the court's own obligation. Section
//     23A-27-17 provides that upon the discharge and dismissal the court shall
//     order the records sealed. No participant motion exists, which is why the
//     design dropped the official-form fallback counsel had left open.
//   - `sd_pardon_24_14_11` is routing. The chapter 24-14 pardon application is
//     Board of Pardons and Paroles advocacy and is outside the adopted scope;
//     the sealing that follows a granted pardon is the Governor's order. So the
//     deliverable is detection, the chapter 24-14 explanation, the referral and
//     an honest account of what a pardon does not do.
//
// Two things the design insists on and every sheet here carries:
//
//   - What survives. A nonpublic disposition stays with the Division of
//     Criminal Investigation on nearly every route; a § 23A-3-34 removal leaves
//     the record available to court personnel, by order of the court, and for
//     use as an enhancement in a later prosecution; and a pardon may still
//     count as a prior conviction for later sentencing, habitual-offender
//     proceedings and later DUI sentencing. None of these sheets says a record
//     is gone.
//   - Never a motion. On all four routes the filing, the order or the grant
//     belongs to somebody else, and the design says in terms that no motion is
//     to be generated. Where the other body has not done its part, the route is
//     escalation, not a document.
//
// And three things the design expressly leaves unresolved, which no sheet here
// resolves:
//
//   - What a participant does where the State's Attorney has not filed the
//     § 23A-3-36 dismissal and notice. The design records that as a release
//     blocker on the filing process and identifies no statutory remedy. The
//     sheet says so and escalates.
//   - What the remedy is where a discharge and dismissal issued under
//     § 23A-27-14 but the § 23A-27-17 sealing did not follow. Same treatment.
//   - Sections 23A-27-13 and 23A-27-14 have not been read subsection by
//     subsection, which the design carries as a build blocker. So the
//     once-only limits on a suspended imposition of sentence and the exact
//     reach of the teacher-licensing carve-out are stated as the controlling
//     review states them, and marked as not confirmed at source.
//
// The teacher-licensing warning is the design's one conditional component. It
// is a self-help boundary, and the design also lists that combination as a stop
// condition — but encoding it as a typed stop would mean the assigned component
// never renders. It is therefore implemented as the design models it: a
// conditional sheet that says plainly the question is outside self-help and
// names where to take it.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. South
// Dakota is not an enabled jurisdiction and this job does not enable one. The
// arrest-expungement composed route and the two deferred tracks are other
// jobs and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** The two places a South Dakota participant looks the case up. Named once. */
const SD_RECORD_CHECK =
  "your own South Dakota criminal history record from the Division of Criminal Investigation, and the case file itself through the Clerk of Courts in the county where it was filed";

/** Free and low-cost South Dakota help, named once so no stop is a dead end. */
const SD_LEGAL_HELP =
  "a South Dakota legal aid office, a South Dakota law school clinic, or a South Dakota attorney";

/** Said on every automatic or other-body route in this family. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes what the law does. It does not tell you what has happened in your case, and LegalEase has not looked. Treat the route as pending until you have checked for yourself.";

/**
 * The disclosure the design puts on nearly every South Dakota track.
 *
 * A participant who reads "sealed" or "removed" as "gone" has been misled by
 * the words rather than by anything the statute says, so the sheets say what
 * the state keeps.
 */
const DCI_NONPUBLIC_RECORD =
  "A nonpublic disposition record survives with the South Dakota Division of Criminal Investigation on nearly every route here. It is kept for law enforcement, for prosecutors and for the courts — for sentencing on a later offence, for whether a suspended imposition of sentence is available to you again, and for habitual-offender determinations. Sealing and removal in South Dakota mean the public cannot see the record. They do not mean the state has stopped holding it.";

/** The § 23A-3-34 carve-out. Required in every description of that track. */
const ENHANCEMENT_CARVE_OUT =
  "Removal under § 23A-3-34 is removal from the public record and nothing wider. The section says in terms that the case record remains available to court personnel or as authorized by order of the court, and that it may be used as an enhancement in the prosecution of a later offence as provided by law. Nobody should tell you that automatic removal of a Class 2 misdemeanor means the record can never be used again.";

/** Restoration of status and the perjury protection, from the SIS sections. */
const RESTORATION_AND_PERJURY_PROTECTION =
  "Where the sealing is ordered, § 23A-27-17 restores you to the status you occupied before the arrest, the indictment or the information, and provides that you are not guilty of perjury or of giving a false statement for failing to recite or acknowledge the arrest, the indictment or information, the trial or the finding of guilt. That protection is unusually explicit in South Dakota and it is worth knowing you have it.";

/** Why South Dakota participants meet the pardon route so often. */
const HISTORICAL_CONTEXT =
  "Some context that helps this make sense. Before § 23A-3-34 was enacted in 2016, an executive pardon was the only mechanism in South Dakota for taking a conviction record out of public view. That history is why the state's conviction relief is still thin, and why the pardon route comes up here far more often than it would elsewhere.";

/** Nothing on any of these four routes is a document the participant files. */
const NO_MOTION_TO_FILE =
  "There is no motion, application or petition on this route for you to file, and LegalEase does not generate one. Where the body that owes the step has not taken it, the answer is to ask them and then to get advice — not to file something the statute does not provide for.";

const SD_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge, seal or remove anything, and cannot make a State's Attorney, a Clerk of Courts, a judge, the Board of Pardons and Paroles, the Governor or the Division of Criminal Investigation act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal history. You request your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor, board or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

const SD_SOURCES: readonly string[] = [
  "SDCL § 23A-3-34, automatic removal of non-felony charges or convictions from a defendant's public record, read at sdlegislature.gov on 5 August 2026 (SL 2016 ch 134 § 1; SL 2021 ch 106 § 1).",
  "SDCL §§ 23A-3-35 to 23A-3-37, diversion-programme eligibility, the State's Attorney's dismissal and notice, and the court's grant of expungement, read at sdlegislature.gov on 5 August 2026 (SL 2018 ch 143).",
  "SDCL §§ 23A-27-13, 23A-27-14 and 23A-27-17, suspended imposition of sentence, discharge and dismissal, and sealing on discharge, at sdlegislature.gov.",
  "SDCL § 24-14-11 and chapter 24-14, the effects of a pardon and the Board of Pardons and Paroles process, read at sdlegislature.gov on 5 August 2026 (SL 1983 ch 199 § 3; SL 2003 ch 140 § 1)."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class SouthDakotaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "SouthDakotaGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different South Dakota route. */
export class SouthDakotaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "SouthDakotaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class SouthDakotaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "SouthDakotaBranchError";
  }
}

export const SD_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Only a South Dakota record is reached by any of these four routes. */
export const SD_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  south_dakota: true,
  another_state: false,
  federal: false,
  tribal: false,
  military: false
};

/** The § 23A-3-34 test is the highest charged offence in the case. */
export const SD_HIGHEST_CHARGED_OFFENCES: Readonly<Record<string, string>> = {
  petty_offense: "within",
  municipal_ordinance_violation: "within",
  class_2_misdemeanor: "within",
  more_serious: "outside"
};

/** One felony and one misdemeanor suspended imposition of sentence per person. */
export const SD_SIS_LEVELS: Readonly<Record<string, string>> = {
  misdemeanor: "misdemeanor",
  felony: "felony"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new SouthDakotaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualised legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

const OUT_OF_JURISDICTION_STOP =
  "No South Dakota statute reaches a federal, tribal, military or out-of-state record. Relief, if any, lies under the law of the authority that holds it, and none of these four South Dakota routes touches it.";

const IMMIGRATION_STOP =
  "Immigration consequences are governed by federal law and no South Dakota expungement, removal or sealing order reaches them.";

/**
 * Validates participant answers and routes to the correct South Dakota node.
 *
 * The order is the design's: the eligibility-advice boundary first, because a
 * guidance sheet does not decide eligibility; then record jurisdiction, which
 * is a stop condition on all four assigned tracks; then immigration, which the
 * design names on the diversion and pardon tracks and which is screened on all
 * four because the consequence does not vary by route; then the route's own
 * questions.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveSouthDakotaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Nobody is served an eligibility opinion by a guidance sheet.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", SD_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new SouthDakotaGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      SD_LEGAL_HELP,
      "Take the case papers and your criminal history record to one of them and ask about your own case."
    );
  }

  // Gate 2. Record jurisdiction, a stop condition on all four assigned tracks.
  const jurisdiction = branch(trackId, "recordJurisdiction", SD_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (!jurisdiction.resolved) {
    throw new SouthDakotaRouteMismatchError(
      trackId,
      "record_is_not_a_south_dakota_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal, tribal or military authority that holds the record",
      "Take the record to that authority and ask what it provides. If you also hold South Dakota records, those are handled separately and only those are served here."
    );
  }

  // Gate 3. Immigration exposure.
  const immigration = branch(trackId, "immigrationQuestion", SD_YES_NO, facts.immigrationQuestion);
  if (immigration.resolved) {
    throw new SouthDakotaGuidanceStopError(
      trackId,
      "immigration_consequences_in_play",
      IMMIGRATION_STOP,
      "an immigration attorney",
      "Speak to an immigration attorney about the record before you rely on anything on this route."
    );
  }

  if (trackId === "sd_diversion") {
    const terms = branch(trackId, "diversionTermsCompleted", SD_YES_NO, facts.diversionTermsCompleted);
    if (!terms.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "diversion_terms_not_all_satisfied",
        "Section 23A-3-35 turns on successful completion of all the terms of the programme. An unsatisfied term means the eligibility the section describes has not arisen, and nothing further follows from it.",
        "the State's Attorney's office that administered the diversion programme, and then " + SD_LEGAL_HELP,
        "Ask that office what it records as outstanding and what completing it would take. Come back to this sheet if and when the programme is recorded as completed."
      );
    }

    const entireRecord = branch(trackId, "entireArrestRecordCovered", SD_YES_NO, facts.entireArrestRecordCovered);
    if (!entireRecord.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "diversion_does_not_cover_the_entire_arrest_record",
        "The section is framed around the entire criminal record related to that arrest. Where part of the arrest was dealt with some other way, the partial disposition defeats the route rather than shrinking it.",
        SD_LEGAL_HELP,
        "Take the whole case file, not just the diverted charge, and ask what the mixed disposition means for this section."
      );
    }

    const newCharges = branch(trackId, "newChargesSinceCompletion", SD_YES_NO, facts.newChargesSinceCompletion);
    if (newCharges.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "new_charge_within_one_year_and_thirty_days",
        "Section 23A-3-35 requires that the person has not been charged with any new crime, other than a petty offence or a minor traffic citation, within one year and thirty days from the date of successful completion. A new charge inside that window is the thing the section is written to exclude.",
        SD_LEGAL_HELP,
        "Ask what the new charge means for this route and whether any other South Dakota route reaches the diverted case."
      );
    }

    const windowRun = branch(trackId, "oneYearThirtyDaysHasRun", SD_YES_NO, facts.oneYearThirtyDaysHasRun);
    if (!windowRun.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "one_year_and_thirty_day_window_has_not_run",
        "The window is one year and thirty days from the date of successful completion. Until it has run, the State's Attorney's filing obligation under § 23A-3-36 has not arisen and there is nothing yet to check for.",
        "this sheet again once the window has run, and the Clerk of Courts in the county where the charges were filed",
        "Work out the date one year and thirty days after your completion date, write it down, and check the docket then."
      );
    }

    const filed = branch(trackId, "stateAttorneyFiled", SD_YES_NO, facts.stateAttorneyFiled);
    if (!filed.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "state_attorney_has_not_filed_after_the_window_has_run",
        "The window has run and the State's Attorney has not filed the dismissal and the notice of completion. What a participant does about that is genuinely unsettled: the adopted design records it as an open question and identifies no statutory remedy, and there is no participant filing that substitutes for the one § 23A-3-36 puts on the State's Attorney.",
        "the State's Attorney's office that administered the diversion programme, and then " + SD_LEGAL_HELP,
        "Ask that office in writing whether the § 23A-3-36 filing has been made and keep the reply. Then take it to a lawyer. Do not file a motion: none exists on this route and this packet does not prepare one."
      );
    }
    derived.diversionWindowHasRun = true;
    return derived;
  }

  if (trackId === "sd_23a_3_34_auto") {
    const highest = branch(trackId, "highestChargedOffense", SD_HIGHEST_CHARGED_OFFENCES, facts.highestChargedOffense);
    if (highest.resolved === "outside") {
      throw new SouthDakotaRouteMismatchError(
        trackId,
        "highest_charged_offence_exceeded_a_class_2_misdemeanor",
        "Section 23A-3-34 reaches a case where a petty offence, a municipal ordinance violation or a Class 2 misdemeanor was the highest charged offence. The test is the highest charge in the case, not the charge you were convicted of, and a more serious charge anywhere in the case takes it outside the section.",
        "the South Dakota suspended-imposition-of-sentence route where one was granted, and otherwise the chapter 24-14 pardon route",
        "Go back to the South Dakota intake and answer the questions for the route that matches the case, taking the highest charge from the docket rather than from memory."
      );
    }
    derived.autoRemovalBranch = highest.value;

    const conditions = branch(trackId, "conditionsSatisfied", SD_YES_NO, facts.conditionsSatisfied);
    if (!conditions.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "court_ordered_conditions_remain_unsatisfied",
        "The section requires that all court-ordered conditions on the case have been satisfied. Outstanding fines, costs, classes, community service or probation keep the case outside it, and the five years do not carry the case past them.",
        "the Clerk of Courts in the county where the case was filed",
        "Ask the clerk what remains outstanding on the case and what satisfying it involves. Come back to this sheet once the docket shows the conditions satisfied."
      );
    }

    const further = branch(trackId, "furtherConvictions", SD_YES_NO, facts.furtherConvictions);
    if (further.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "further_conviction_within_the_five_years",
        "Section 23A-3-34 requires that the defendant has not been convicted of any further offence within the five years. A conviction inside that period is the express proviso the section carries.",
        SD_LEGAL_HELP,
        "Ask what the later conviction means for this section and whether the chapter 24-14 pardon route is the realistic answer for this record."
      );
    }

    const fiveYears = branch(trackId, "fiveYearsHaveRun", SD_YES_NO, facts.fiveYearsHaveRun);
    if (!fiveYears.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "five_year_period_has_not_run",
        "Removal happens after five years. Until the period has run there is nothing to check for, and the section provides nothing that brings the date forward.",
        "this sheet again once the five years have run",
        "Work out the date five years after the case ended, write it down, and check the public record then."
      );
    }

    const stillShowing = branch(trackId, "stillShowingOnRecord", SD_YES_NO, facts.stillShowingOnRecord);
    if (stillShowing.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "case_still_public_after_the_five_years",
        "The five years have run, the conditions were satisfied, there has been no further conviction, and the case is still showing. Section 23A-3-34 provides no motion for that situation, so this is an escalation rather than a filing.",
        "the Clerk of Courts in the county where the case was filed, and then " + SD_LEGAL_HELP,
        "Ask the clerk what the docket shows and keep a dated copy of what you were told. Take that to a lawyer. Do not file a motion under this section: there is none."
      );
    }
    return derived;
  }

  if (trackId === "sd_sis_sealing") {
    const granted = branch(trackId, "sisGranted", SD_YES_NO, facts.sisGranted);
    if (!granted.resolved) {
      throw new SouthDakotaRouteMismatchError(
        trackId,
        "no_suspended_imposition_of_sentence_was_granted",
        "Sections 23A-27-13 to 23A-27-17 run on a suspended imposition of sentence. Where the court did not grant one, the discharge and dismissal these sections turn on never arises and this route has nothing to describe.",
        "the South Dakota automatic public-record removal route under § 23A-3-34, or the chapter 24-14 pardon route",
        "Go back to the South Dakota intake and answer the questions for the disposition the case actually had."
      );
    }

    const level = branch(trackId, "sisOffenceLevel", SD_SIS_LEVELS, facts.sisOffenceLevel);
    if (level.resolved === "felony") {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "felony_suspended_imposition_of_sentence",
        "The adopted design puts any felony matter outside self-help on this route. The consequences of a felony suspended imposition of sentence, and the once-only limit that goes with it, turn on the participant's whole history rather than on this case.",
        SD_LEGAL_HELP,
        "Take the suspended-imposition order and the discharge and dismissal order to one of them and ask about your own record."
      );
    }

    const priorFelony = branch(trackId, "priorFelonyConviction", SD_YES_NO, facts.priorFelonyConviction);
    if (priorFelony.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "prior_felony_conviction_before_the_suspended_imposition",
        "A suspended imposition of sentence is available where the person has never before been convicted of a felony. Where there is an earlier felony conviction, what that means for this case is a legal question about the order itself, and a guidance sheet is the wrong place to answer it.",
        SD_LEGAL_HELP,
        "Take the suspended-imposition order and the record of the earlier conviction to one of them and ask what it means for the sealing."
      );
    }

    const priorSis = branch(trackId, "priorSuspendedImposition", SD_YES_NO, facts.priorSuspendedImposition);
    if (priorSis.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "an_earlier_suspended_imposition_of_sentence_exists",
        "The controlling review records that South Dakota permits one felony suspended imposition of sentence and one misdemeanor suspended imposition of sentence per person. That limit has not been read at source subsection by subsection here, so this sheet will not apply it to your case either way.",
        SD_LEGAL_HELP,
        "Take both orders to one of them and ask what the once-only limit means for the sealing on this case."
      );
    }

    const conditions = branch(trackId, "conditionsCompleted", SD_YES_NO, facts.conditionsCompleted);
    if (!conditions.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "court_conditions_not_completed",
        "The discharge and dismissal under § 23A-27-14 follow completion of all the court's conditions, and the sealing under § 23A-27-17 follows the discharge and dismissal. With conditions outstanding, none of that chain has started.",
        "the Clerk of Courts in the county where the case was heard",
        "Ask the clerk what the court still has outstanding on the case, and come back to this sheet once the docket shows a discharge and dismissal."
      );
    }

    const discharged = branch(trackId, "dischargeAndDismissalIssued", SD_YES_NO, facts.dischargeAndDismissalIssued);
    if (!discharged.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "discharge_and_dismissal_has_not_issued_or_is_unclear",
        "Section 23A-27-17 is triggered by the discharge and dismissal. Where no such order appears on the docket, or where the docket is unclear about it, the sealing obligation has not been engaged and nothing on this sheet applies yet.",
        "the Clerk of Courts in the county where the case was heard",
        "Ask the clerk for the order of discharge and dismissal, or for confirmation that none has been entered, and keep what you are given."
      );
    }

    const stillPublic = branch(trackId, "recordsStillPublic", SD_YES_NO, facts.recordsStillPublic);
    if (stillPublic.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "records_not_sealed_although_the_discharge_and_dismissal_issued",
        "The discharge and dismissal issued and the case is still showing publicly. Section 23A-27-17 makes the sealing the court's obligation, so the remedy where a court has not done what the section directs is a question the adopted design leaves open. It identifies no participant application, and this packet does not invent one.",
        "the Clerk of Courts in the county where the case was heard, and then " + SD_LEGAL_HELP,
        "Ask the clerk in writing whether a sealing order under § 23A-27-17 was entered after the discharge and dismissal, keep the reply, and take it to a lawyer."
      );
    }

    // The design's one conditional component. Not a stop: encoding it as one
    // would mean the assigned sheet never renders.
    const teaching = branch(trackId, "teachingLicence", SD_YES_NO, facts.teachingLicence);
    const sexOffence = branch(trackId, "sexOffenceStatutes", SD_YES_NO, facts.sexOffenceStatutes);
    derived.sisTeacherLicensingWarningApplies = teaching.resolved && sexOffence.resolved;
    return derived;
  }

  if (trackId === "sd_pardon_24_14_11") {
    const wantsApplication = branch(
      trackId,
      "wantsPardonApplicationPrepared",
      SD_YES_NO,
      facts.wantsPardonApplicationPrepared
    );
    if (wantsApplication.resolved) {
      throw new SouthDakotaGuidanceStopError(
        trackId,
        "pardon_application_is_outside_the_adopted_scope",
        "The chapter 24-14 application to the Board of Pardons and Paroles is an advocacy process rather than a form-filling one, and the adopted scope does not reach it. LegalEase does not prepare pardon applications. That is a decision about what this service does, not a finding that the application cannot be made.",
        "a South Dakota clemency programme, or " + SD_LEGAL_HELP,
        "Ask about representation for the Board application itself. This sheet explains the route and what a pardon does; it does not prepare the application."
      );
    }

    const granted = branch(trackId, "pardonGranted", SD_YES_NO, facts.pardonGranted);
    derived.pardonAlreadyGranted = granted.resolved;
    if (granted.resolved) {
      const chapter = branch(
        trackId,
        "pardonUnderChapter2414",
        SD_YES_NO,
        facts.pardonUnderChapter2414
      );
      if (!chapter.resolved) {
        throw new SouthDakotaGuidanceStopError(
          trackId,
          "pardon_was_granted_outside_the_chapter_24_14_process",
          "Section 24-14-11 attaches the sealing to a pardon granted under the provisions of chapter 24-14, and says that a pardon granted without following the chapter may not be sealed. A pardon that did not go through the Board process therefore carries the release from disabilities without the sealing.",
          SD_LEGAL_HELP,
          "Take the pardon document to one of them and ask what it did and did not do to the record. Do not assume the records were sealed with it."
        );
      }

      const stillPublic = branch(trackId, "recordsStillPublic", SD_YES_NO, facts.recordsStillPublic);
      if (stillPublic.resolved) {
        throw new SouthDakotaGuidanceStopError(
          trackId,
          "records_still_public_after_a_chapter_24_14_pardon",
          "A chapter 24-14 pardon was granted and the records are still showing. Two things can explain that and this sheet decides neither: the Governor's certifying document filed with the secretary of state is a public document for five years before it is sealed, and separately the sealing order may not have reached every holder of the record.",
          "the South Dakota Board of Pardons and Paroles, and then " + SD_LEGAL_HELP,
          "Ask the Board what the sealing order covered and when it issued, keep the reply, and take it to a lawyer if the record is still being disclosed after that."
        );
      }
    }
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
      "There is nothing to submit and nothing for LegalEase to file. No motion, application or petition exists on this route, so none is generated.",
    fees: input.fees ?? "None. There is nothing to file on this route, so there is nothing to pay for on it.",
    feeWaiver: input.feeWaiver ?? "Not applicable. There is no fee to waive where there is no fee.",
    noticeOrService: input.noticeOrService ?? [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you when the step this page describes has been taken, which is why this packet tells you to go and check."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...SD_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "The record is a federal, tribal, military or out-of-state record.",
      "Your immigration status could be affected by the record.",
      ...input.escalations
    ],
    officialSourceReferences: SD_SOURCES
  };
}

const CLERK_AND_DCI = {
  name: "The Clerk of Courts in the county where the case was filed, and the South Dakota Division of Criminal Investigation",
  detail:
    "The Clerk of Courts holds the case file and the docket, which is where an order shows up. The Division of Criminal Investigation holds the state criminal history record and will provide you your own copy. LegalEase contacts neither and reads neither."
};

export const SOUTH_DAKOTA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- sd_diversion --------------------------------------------------------
  "sd-diversion-eligibility-and-timing": sheet({
    templateId: "sd-diversion-eligibility-and-timing",
    mechanismName: "After a South Dakota diversion programme: the timing the State's Attorney's filing runs on",
    whyNotAFiling:
      "Nothing is filed by you. Under SDCL § 23A-3-36 the State's Attorney files the dismissal of all charges related to the arrest and the notice that you completed the diversion programme, and under § 23A-3-37 the court then grants the expungement without the filing of a motion or any further action by the court. There is no participant application on this route, so none is generated.",
    processType: "prosecutor",
    prerequisites: [
      "The case is a South Dakota case that went into a diversion programme.",
      "You completed every term of the programme, and you know the date of successful completion.",
      "You have not been charged with any new crime, other than a petty offence or a minor traffic citation, within one year and thirty days from that date.",
      "The route is about the entire criminal record related to that arrest. A partial disposition defeats it rather than shrinking it."
    ],
    documentsToObtain: [
      "The diversion agreement and written confirmation that you completed the programme, including the completion date, from the State's Attorney's office that administered it.",
      "The court docket for the diverted charges from the Clerk of Courts, which is where the dismissal, the notice of completion and any expungement order would appear."
    ],
    gather: [
      "The date you successfully completed the diversion programme. Everything on this route is measured from it.",
      "Whether every term of the programme was completed, and anything that was not.",
      "Every new charge since completion, and whether each was a petty offence or a minor traffic citation.",
      "The South Dakota county where the programme was administered, and the case number for the diverted charges.",
      "Whether the whole arrest went into diversion, or only part of it.",
      "Whether you know if the State's Attorney has filed the dismissal and the notice of completion."
    ],
    destination: {
      name: "The State's Attorney who administered the diversion programme",
      detail:
        "Section 23A-3-36 puts the filing on the State's Attorney: the dismissal of all charges related to the arrest, and the notice of completion of the programme. On that filing the court grants the expungement without a motion or any further action. You file nothing at any point."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Start from the completion date. Section 23A-3-35 gives eligibility where the person successfully completed all the terms of the programme and has not been charged with a new crime, other than a petty offence or a minor traffic citation, within one year and thirty days from the date of successful completion.",
      "Work out that date and write it down: one year and thirty days after the day you completed. That is the point at which the section's condition has been met and there is something to check for.",
      "Count what falls inside the window honestly. A new charge in that period, unless it is a petty offence or a minor traffic citation, is exactly what the section excludes — and it is a charge that counts, not a conviction.",
      "Check that every term of the programme was satisfied, not most of them. The section is written around successful completion of all the terms.",
      "Check that the whole arrest went into diversion. This route is framed around the entire criminal record related to that arrest, so a charge from the same arrest that was dealt with some other way is a problem for the route rather than a detail.",
      "Then stop and wait, and use the next sheet in this packet to check whether the State's Attorney has filed. There is nothing for you to do in the meantime and nothing to pay.",
      NO_MOTION_TO_FILE,
      DCI_NONPUBLIC_RECORD
    ],
    expectedNextStage:
      "Once the one year and thirty days have run, the State's Attorney's obligation under § 23A-3-36 has arisen. The next sheet in this packet is how you find out whether it has been met.",
    canPrepare: [
      "This timing calculation and the list of what the section requires.",
      "A plain statement of what the State's Attorney does and what the court does.",
      "The status-check sheet and the escalation sheet that follow it in this packet."
    ],
    escalations: [
      "You cannot tell from the papers whether every term of the programme was completed.",
      "You were charged with something in the window and cannot tell whether it was a petty offence or a minor traffic citation.",
      "Part of the arrest was dealt with outside the diversion programme."
    ]
  }),

  "sd-diversion-status-verification": sheet({
    templateId: "sd-diversion-status-verification",
    mechanismName: "Checking whether the State's Attorney has filed and the court has granted the expungement",
    whyNotAFiling:
      "This is a plan for reading a court docket and asking a prosecutor's office a question. Nothing on it is filed, and §§ 23A-3-36 and 23A-3-37 provide no participant application for LegalEase to prepare.",
    processType: "prosecutor",
    prerequisites: [
      "One year and thirty days have passed since you successfully completed the diversion programme.",
      "You have read the timing sheet that comes before this one in the packet."
    ],
    documentsToObtain: [
      "The court docket for the diverted charges, from the Clerk of Courts in the county where they were filed.",
      "Written confirmation of your completion date from the State's Attorney's office, if you do not already hold it."
    ],
    gather: [
      "The case number for the diverted charges and the county they were filed in.",
      "Your completion date, and the date one year and thirty days after it.",
      "The date of each check you make on the docket, so you can tell one from another."
    ],
    destination: CLERK_AND_DCI,
    sequence: [
      "Ask the Clerk of Courts for the docket in the diverted case. That is the record where anything that has happened will appear.",
      "Look for three things in order: a dismissal of the charges related to the arrest, a notice that you completed the diversion programme, and an order granting the expungement. The first two are the State's Attorney's filing under § 23A-3-36 and the third is the court's grant under § 23A-3-37.",
      "Where all three appear, note the dates and keep a dated copy of the docket. Whether the court notifies a person when it grants the expungement is not settled, so a copy you obtained yourself may be the only record of it you hold.",
      "Where the dismissal and notice are not there, ask the State's Attorney's office directly and in writing whether the filing has been made, and keep the reply.",
      "Where they are there but the expungement order is not, that is a question for the Clerk of Courts about the court's own record rather than something to file about.",
      NOT_A_REPORT_ON_YOUR_CASE,
      "Do not read a delay as a refusal. Nothing on this page tells you how long any of it takes, because nobody has told us.",
      DCI_NONPUBLIC_RECORD,
      "If the filing has not been made and the window has run, the escalation sheet in this packet is the next page to read."
    ],
    expectedNextStage:
      "Either the docket shows the dismissal, the notice and the expungement order, in which case keep a dated copy, or it does not, in which case the escalation sheet sets out the only route the design identifies.",
    canPrepare: [
      "This status-check plan.",
      "The list of exactly what to look for on the docket and in what order.",
      "The escalation sheet that follows it in this packet."
    ],
    escalations: [
      "The Clerk of Courts cannot tell you whether an expungement order was entered.",
      "The State's Attorney's office will not say whether the filing has been made.",
      "The docket shows a dismissal but no notice of completion, or the reverse."
    ]
  }),

  "sd-diversion-escalation": sheet({
    templateId: "sd-diversion-escalation",
    mechanismName: "Where the South Dakota State's Attorney has not filed after the window has run",
    whyNotAFiling:
      "This page is escalation guidance. Nothing on it is filed, and the design records no statutory remedy for this situation — so there is no application to prepare and inventing one would be worse than saying so.",
    processType: "prosecutor",
    prerequisites: [
      "One year and thirty days have passed since you successfully completed the diversion programme.",
      "You have checked the docket and the § 23A-3-36 dismissal and notice of completion are not there.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "A dated copy of the court docket showing what has and has not been filed.",
      "Your written request to the State's Attorney's office, and any reply."
    ],
    gather: [
      "Your completion date and the date the one year and thirty days ran out.",
      "The case number, the county and the name of the State's Attorney's office that administered the programme.",
      "What you asked that office, when you asked it, and what they said."
    ],
    destination: {
      name: "The State's Attorney's office that administered the diversion programme, and then a South Dakota lawyer",
      detail:
        "The filing obligation under § 23A-3-36 is the State's Attorney's. Asking that office is the first step because it is the body that owes the step. Where that does not produce it, the design's answer is a lawyer, and it says so rather than pointing at a form."
    },
    sequence: [
      "Say the honest thing first: what a participant does when the State's Attorney has not filed is unresolved. The adopted design records it as the only realistic failure mode on this route, identifies no statutory remedy for it, and holds it open. This sheet does not pretend to close it.",
      "Ask the State's Attorney's office in writing whether the § 23A-3-36 dismissal and notice of completion have been filed, and if not, what is outstanding. Put the case number, the completion date and the date the window ran out in the request, and keep a copy.",
      "Keep the reply, or the absence of one, with the dated docket copy. That pair is the whole of the evidence that the step was owed and not taken, and it is the first thing anyone you take this to will ask for.",
      NO_MOTION_TO_FILE,
      "Take the file to " + SD_LEGAL_HELP + ". The design's own answer to this failure mode is a lawyer, and that is not a fob-off: it is the honest position where the statute provides the participant with nothing.",
      "Nothing here is a finding that the State's Attorney has done anything wrong, and nothing here says a record has come off or failed to. It records what the docket showed on the day you looked.",
      DCI_NONPUBLIC_RECORD
    ],
    expectedNextStage:
      "You leave this sheet with a dated record of what was owed and not taken, and with the one destination the design identifies. What happens next depends on advice this packet cannot give.",
    canPrepare: [
      "This escalation explanation, and the statement that the remedy is unresolved.",
      "The list of what to gather before you ask anyone for help.",
      "A plain account of who owes which step under §§ 23A-3-36 and 23A-3-37."
    ],
    extraCannotPerform: [
      "LegalEase cannot make a State's Attorney file the dismissal and notice of completion, and does not prepare any application asking a court to order it. The design identifies no such application and this packet does not invent one."
    ],
    escalations: [
      "The State's Attorney's office says the filing was made but the docket does not show it.",
      "You are told the diversion programme was not successfully completed and you disagree.",
      "A job, a licence or a housing application turns on this record by a particular date."
    ]
  }),

  // ---- sd_23a_3_34_auto ----------------------------------------------------
  "sd-23a-3-34-eligibility-and-timing": sheet({
    templateId: "sd-23a-3-34-eligibility-and-timing",
    mechanismName: "Which South Dakota cases come off the public record after five years, and when",
    whyNotAFiling:
      "Nothing is filed and nothing is applied for. SDCL § 23A-3-34 provides that a qualifying charge or conviction shall be automatically removed from a defendant's public record after five years. There is no application, no motion and no fee on this route, so nothing is generated for you to file.",
    processType: "automatic",
    prerequisites: [
      "The case is a South Dakota case, and the highest offence charged in it was a petty offence, a municipal ordinance violation or a Class 2 misdemeanor. The test is the highest charge in the case, not the one you were convicted of.",
      "All the conditions the court ordered on the case have been satisfied.",
      "You have not been convicted of any further offence in the five years since the case ended."
    ],
    documentsToObtain: [
      "The court docket for the case from the Clerk of Courts, which shows every charge and whether fines, costs and other conditions were satisfied.",
      `A copy of ${SD_RECORD_CHECK}.`
    ],
    gather: [
      "The most serious offence charged in the case, from the docket rather than from memory.",
      "The date the case ended, which is what the five years run from.",
      "Whether every condition the court ordered — fines, costs, classes, community service, probation — has been satisfied, and the date the last one was.",
      "Every conviction anywhere in the five years since the case ended.",
      "The South Dakota county the case was filed in.",
      "Whether the case still shows up on a public record search now, and the date you last looked."
    ],
    destination: {
      name: "Operation of SDCL § 23A-3-34",
      detail:
        "There is no office to apply to. Removal from the public record happens by operation of the section once the five years have run and the conditions are met. Your task is to work out the date, check that removal has happened, and understand what survives it."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Read the section's test carefully, because it is about the case rather than about you. It reaches any charge or conviction resulting from a case where a petty offence, a municipal ordinance violation or a Class 2 misdemeanor was the highest charged offence. A more serious charge anywhere in the case takes the whole case outside it, even if it was dropped.",
      "The period is five years. Section 23A-3-34 reads 'after five years' at the official South Dakota Legislature publication, which is worth saying because some commercial write-ups state ten. Where you have read ten somewhere, the statute is what governs.",
      "Check the two provisos. All court-ordered conditions on the case must have been satisfied, and there must have been no conviction of any further offence within those five years.",
      "Work out the date five years after the case ended and write it down. That is the earliest point at which there is anything to check for.",
      ENHANCEMENT_CARVE_OUT,
      DCI_NONPUBLIC_RECORD,
      HISTORICAL_CONTEXT,
      NO_MOTION_TO_FILE
    ],
    expectedNextStage:
      "Once the five years have run and both provisos hold, the case is the kind § 23A-3-34 is written for. Whether removal has actually happened is a separate question, and the next sheet in this packet is how you find out.",
    canPrepare: [
      "This eligibility and timing analysis against the section's own test.",
      "A plain list of what to gather and what to check.",
      "The status-check sheet and the effect sheet that follow it in this packet."
    ],
    escalations: [
      "You cannot tell from the docket what the highest charge in the case was.",
      "You are not sure whether a court-ordered condition was ever satisfied.",
      "Something happened in the five years and you cannot tell whether it counts as a conviction."
    ]
  }),

  "sd-23a-3-34-status-verification": sheet({
    templateId: "sd-23a-3-34-status-verification",
    mechanismName: "Checking whether a South Dakota case has come off the public record",
    whyNotAFiling:
      "This is a plan for checking a public record. Nothing on it is filed, and § 23A-3-34 provides no motion, application or petition for LegalEase to prepare.",
    processType: "automatic",
    prerequisites: [
      "Five years have passed since the case ended.",
      "You have read the timing sheet that comes before this one in the packet."
    ],
    documentsToObtain: [
      `A copy of ${SD_RECORD_CHECK}.`,
      "Your note of the date you checked, kept with whatever you were given."
    ],
    gather: [
      "The name the case was brought under, and any other name it could sit under.",
      "Your date of birth.",
      "The county, the case number and the date the case ended.",
      "The date of each check you make, so you can tell one from another."
    ],
    destination: CLERK_AND_DCI,
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Search the public record for the case yourself, and ask the Clerk of Courts in the county where it was filed what the file shows. Those are two different questions and it is worth asking both.",
      "Read what you find against what you wrote down: the highest charge in the case, the date it ended, and whether the conditions show as satisfied. The record is what counts where it and your memory disagree.",
      "Write down what you found and the date you found it, and keep it. Nothing is sent to you when a case comes off the public record, so a dated copy is the only evidence you will hold either way.",
      "Where the case is no longer showing publicly, that is what the section describes. It does not mean the record has stopped existing, and the effect sheet in this packet says what remains.",
      "Where it is still showing and the five years have run, do not file anything about it. There is no motion under this section to bring. The stop on this route takes you to the Clerk of Courts and then to a lawyer, with the dated copy in hand.",
      "Commercial background-check companies keep their own copies and refresh them on their own schedules. An official record can change and a vendor's report can lag it by months. A South Dakota court reaches South Dakota records; it does not reach a copy a private company has already sold on.",
      DCI_NONPUBLIC_RECORD
    ],
    expectedNextStage:
      "Either the case is no longer on the public record, in which case keep the dated copy and read the effect sheet, or it is, in which case the route is the clerk and then advice rather than a filing.",
    canPrepare: [
      "This status-check plan.",
      "The list of what to look for and where to look for it.",
      "The effect sheet that follows it in this packet."
    ],
    escalations: [
      "The Clerk of Courts and the public search disagree about the case.",
      "The record shows a charge you do not recognise in the same case.",
      "The case is still showing well after the five years have run."
    ]
  }),

  "sd-23a-3-34-legal-effect": sheet({
    templateId: "sd-23a-3-34-legal-effect",
    mechanismName: "What automatic removal under § 23A-3-34 does, and what it leaves behind",
    whyNotAFiling:
      "This page explains the effect of a statutory removal. Nothing on it is filed and § 23A-3-34 provides nothing for a participant to submit.",
    processType: "automatic",
    prerequisites: [
      "You have read the timing and status sheets that come before this one in the packet.",
      "You are prepared to hear what removal does not do as well as what it does."
    ],
    documentsToObtain: [
      `A copy of ${SD_RECORD_CHECK}, so that what follows is read against your actual record.`
    ],
    gather: [
      "What the public record showed when you last checked, and the date.",
      "Whether anything you are applying for — a job, a licence, housing — asks about records that are not public.",
      "Whether you have any later case in which this one could be raised."
    ],
    destination: {
      name: "Operation of SDCL § 23A-3-34, with the record retained by the courts and the Division of Criminal Investigation",
      detail:
        "Removal is from the public record. The courts keep the case record, it remains available as authorized by order of the court, and the Division of Criminal Investigation keeps its own nonpublic disposition. Nothing is submitted by you at any stage."
    },
    sequence: [
      ENHANCEMENT_CARVE_OUT,
      "So the accurate way to describe this route is that the public stops seeing the case. That is worth a great deal and it is not the same as the case ceasing to exist.",
      DCI_NONPUBLIC_RECORD,
      "Where a form asks whether you have been convicted of an offence, this section does not answer that question for you. Section 23A-3-34 says what happens to the public record; it does not give you a disclosure rule, and this sheet is not legal advice about how to answer.",
      "That is different from the suspended-imposition route, which does carry an express protection about not reciting a matter. This section does not carry one, and it would be wrong to read one across.",
      HISTORICAL_CONTEXT,
      "If what you need is something wider than removal from the public record, the chapter 24-14 pardon route is the other South Dakota answer, and it is a separate LegalEase track with its own packet.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet knowing what removal under this section reaches and what it does not, and knowing which questions still need a lawyer rather than a page.",
    canPrepare: [
      "This explanation of the effect of the section and of the enhancement carve-out.",
      "The account of what the Division of Criminal Investigation keeps.",
      "A plain statement of which questions this page cannot answer."
    ],
    escalations: [
      "An application asks about records that are not public and you do not know how to answer it.",
      "A prosecutor has raised the case as an enhancement in a later matter.",
      "You need relief wider than removal from the public record."
    ]
  }),

  // ---- sd_sis_sealing ------------------------------------------------------
  "sd-sis-status-verification": sheet({
    templateId: "sd-sis-status-verification",
    mechanismName: "After a South Dakota suspended imposition of sentence: confirming the sealing the court owes",
    whyNotAFiling:
      "Nothing is filed by you. Section 23A-27-17 provides that upon the discharge and dismissal of a person under § 23A-27-14 a court shall order that all official records be sealed. The obligation is the court's, there is no participant motion, and none is generated here.",
    processType: "court_adjacent",
    prerequisites: [
      "The court granted you a suspended imposition of sentence in this case.",
      "You completed all of the conditions the court ordered.",
      "The court entered an order discharging you and dismissing the case, or you are about to find out whether it did."
    ],
    documentsToObtain: [
      "The suspended-imposition-of-sentence order and the order of discharge and dismissal, from the Clerk of Courts. Together these establish that the § 23A-27-17 obligation was triggered.",
      `A copy of ${SD_RECORD_CHECK}, so you can see what remains visible.`
    ],
    gather: [
      "The county, the case number and the year of the case.",
      "The date the court granted the suspended imposition of sentence, and the date of the discharge and dismissal if you have it.",
      "Whether the suspended imposition was for a felony or a misdemeanor.",
      "Whether the case still appears on a public record search now, and the date you last looked."
    ],
    destination: {
      name: "The court that entered the discharge and dismissal, through its Clerk of Courts",
      detail:
        "Section 23A-27-17 directs the court to order the records sealed upon the discharge and dismissal. You file nothing. The task is to confirm the discharge and dismissal issued, confirm the sealing order followed it, and escalate where it did not."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Ask the Clerk of Courts for two orders by name: the order granting the suspended imposition of sentence, and the order of discharge and dismissal under § 23A-27-14. The second is what triggers the sealing.",
      "Then ask whether a sealing order under § 23A-27-17 was entered after the discharge and dismissal. It is a specific order and a specific section, so it is a specific question rather than a vague one.",
      "Search the public record for the case yourself as well. What the clerk's file says and what a public search shows are two different things and both are worth knowing.",
      "Write down what you found and the date you found it, and keep whatever you were given. Nothing is sent to you when records are sealed.",
      "Where the discharge and dismissal issued and the case is no longer showing publicly, that is what the section describes. Read the effect sheet in this packet before you decide what it means for you.",
      "Where the discharge and dismissal issued and the case is still showing, do not file anything about it. The escalation sheet in this packet is the next page, and the sealing is the court's obligation rather than something you apply for.",
      NO_MOTION_TO_FILE,
      DCI_NONPUBLIC_RECORD
    ],
    expectedNextStage:
      "Either the docket shows the discharge and dismissal followed by a sealing order, in which case the effect sheet says what that means, or it does not, in which case the escalation sheet is the route.",
    canPrepare: [
      "This status-check plan and the two orders to ask for by name.",
      "The specific § 23A-27-17 question to put to the Clerk of Courts.",
      "The effect sheet and the escalation sheet that follow it in this packet."
    ],
    escalations: [
      "The Clerk of Courts cannot say whether a sealing order was entered.",
      "The discharge and dismissal order cannot be found.",
      "You are not sure whether what you were granted was a suspended imposition of sentence or a suspended sentence."
    ]
  }),

  "sd-sis-legal-effect": sheet({
    templateId: "sd-sis-legal-effect",
    mechanismName: "What sealing after a suspended imposition of sentence does, and what the state still keeps",
    whyNotAFiling:
      "This page explains the effect of an order the court makes on its own. Nothing on it is filed and §§ 23A-27-14 and 23A-27-17 provide nothing for a participant to submit.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the status sheet that comes before this one in the packet.",
      "You are prepared to hear what the sealing does not do as well as what it does."
    ],
    documentsToObtain: [
      "The order of discharge and dismissal, so what follows is read against the actual order.",
      `A copy of ${SD_RECORD_CHECK}.`
    ],
    gather: [
      "What the public record showed when you last checked, and the date.",
      "Whether anything you are applying for asks about records that are not public.",
      "Whether you hold, or are seeking, a South Dakota certified teaching licence, and whether the charge was under SDCL § 22-22-1 or § 22-22-7."
    ],
    destination: {
      name: "The court that entered the discharge and dismissal, with a nonpublic record retained by the Division of Criminal Investigation",
      detail:
        "The sealing order is the court's. The Division of Criminal Investigation is told of the discharge and dismissal and keeps a nonpublic disposition. Nothing on this route is submitted by you."
    },
    sequence: [
      "Start with what the discharge and dismissal itself does. Under § 23A-27-14 the person is discharged and the case dismissed without adjudication of guilt, and the discharge and dismissal are not deemed a conviction for the purposes of disqualifications or disabilities imposed by law.",
      "Section 23A-27-17 then directs that all official records be sealed — the arrest, the indictment or information, the trial, the finding of guilt, and the dismissal and discharge — other than the nonpublic records retained by the Division of Criminal Investigation, which the section expressly excludes.",
      RESTORATION_AND_PERJURY_PROTECTION,
      DCI_NONPUBLIC_RECORD,
      "So the honest summary is this: a suspended imposition of sentence that ends in discharge, dismissal and sealing is real relief and it is better than most of what South Dakota offers. It is not the record ceasing to exist, and anyone who tells you a suspended imposition puts the case beyond every reach has told you something the statute does not say.",
      "The exclusion of the Division's records is in the section itself. It is not an oversight and it is not something an order can be asked to fix.",
      "One thing is worth flagging rather than glossed. The full text of §§ 23A-27-13 and 23A-27-14 has not been read subsection by subsection in the work behind this sheet, so the once-only limits on a suspended imposition of sentence, and the exact reach of the teaching-licence carve-out, are stated here as the controlling review states them and are not confirmed at source.",
      "If you hold or are seeking a South Dakota certified teaching licence and the charge was under § 22-22-1 or § 22-22-7, there is a further sheet in this packet and it matters. Read it.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet knowing what the sealing reaches, what the Division of Criminal Investigation keeps, and which questions need advice rather than a page.",
    canPrepare: [
      "This explanation of the discharge, the dismissal and the sealing.",
      "The account of the restoration of status and the perjury protection.",
      "The account of what the Division of Criminal Investigation keeps, and of what has not been confirmed at source."
    ],
    escalations: [
      "An application asks about records that are not public and you do not know how to answer it.",
      "You are told the case is a conviction for some purpose and you do not know whether that is right.",
      "You hold or are seeking a certified teaching licence and the charge was under § 22-22-1 or § 22-22-7."
    ]
  }),

  "sd-sis-escalation": sheet({
    templateId: "sd-sis-escalation",
    mechanismName: "Where a South Dakota discharge and dismissal issued but the records were not sealed",
    whyNotAFiling:
      "This page is escalation guidance. Nothing on it is filed. Section 23A-27-17 puts the sealing on the court and provides the participant with no application, so there is nothing here to prepare and the design does not pretend otherwise.",
    processType: "court_adjacent",
    prerequisites: [
      "The court entered an order discharging you and dismissing the case.",
      "You have checked and the case is still appearing publicly.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "The order of discharge and dismissal.",
      "A dated copy or note of the public search showing the case still visible.",
      "Your written question to the Clerk of Courts, and any reply."
    ],
    gather: [
      "The county, the case number and the date of the discharge and dismissal.",
      "What the public search showed and on what date.",
      "What you asked the Clerk of Courts, when, and what you were told."
    ],
    destination: {
      name: "The Clerk of Courts for the court that entered the discharge and dismissal, and then a South Dakota lawyer",
      detail:
        "The sealing obligation is the court's own, so the clerk's office is where the question belongs first. Where that does not resolve it, the design's answer is a lawyer, because the remedy for a court that has not done what the section directs is an open question."
    },
    sequence: [
      "Say the honest thing first. Section 23A-27-17 says the court shall order the sealing upon the discharge and dismissal. What happens where a court has not is not settled: the adopted design holds it open, identifies no participant application, and this sheet does not invent one.",
      "Ask the Clerk of Courts in writing whether a sealing order under § 23A-27-17 was entered after the discharge and dismissal, and if so on what date. Put the case number and the discharge date in the request and keep a copy.",
      "Keep the reply together with the dated note of what the public search showed. That pair is the evidence that the order was owed and the case is still visible, and it is the first thing anyone you take this to will ask for.",
      "Some of what remains visible is meant to be. The Division of Criminal Investigation's nonpublic records are expressly excluded from the sealing order, so a record showing up in a law-enforcement or court context is not necessarily a failure of the order.",
      NO_MOTION_TO_FILE,
      "Take the file to " + SD_LEGAL_HELP + ". That is the design's answer here, and it is the honest one where the statute gives the participant nothing to file.",
      "Nothing on this page says the court did anything wrong, and nothing on it says a record has been sealed or has not been. It records what you were shown on the day you looked.",
      DCI_NONPUBLIC_RECORD
    ],
    expectedNextStage:
      "You leave this sheet with a dated record of what was owed and what is still visible, and with the destination the design identifies. What happens next depends on advice this packet cannot give.",
    canPrepare: [
      "This escalation explanation, and the statement that the remedy is unresolved.",
      "The specific § 23A-27-17 question to put to the Clerk of Courts in writing.",
      "The list of what to gather before you ask anyone for help."
    ],
    extraCannotPerform: [
      "LegalEase cannot make a court enter a sealing order, and does not prepare any application asking it to. The design identifies no such application and this packet does not invent one."
    ],
    escalations: [
      "The Clerk of Courts says a sealing order was entered but the case is still visible.",
      "You are told the discharge and dismissal was never entered and you believed it had been.",
      "A job, a licence or a housing application turns on this record by a particular date."
    ]
  }),

  "sd-sis-teacher-licensing-warning": sheet({
    templateId: "sd-sis-teacher-licensing-warning",
    mechanismName: "Teaching licensure and a sealed South Dakota record under § 22-22-1 or § 22-22-7",
    whyNotAFiling:
      "This page is a warning and a referral. Nothing on it is filed, and nothing on this route is generated for a participant to submit.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the status and effect sheets that come before this one in the packet.",
      "You hold, or are seeking, a South Dakota certified teaching licence.",
      "The underlying charge was under SDCL § 22-22-1 or § 22-22-7."
    ],
    documentsToObtain: [
      "The order granting the suspended imposition of sentence, which names the section the charge was brought under.",
      "The order of discharge and dismissal."
    ],
    gather: [
      "The exact section and subdivision the charge was brought under, from the order rather than from memory.",
      "Whether you currently hold a certified teaching licence or are applying for one.",
      "Whether any licensure application or renewal is pending, and when."
    ],
    destination: {
      name: "A South Dakota lawyer, before any licensure application or renewal",
      detail:
        "This combination is outside what a self-help sheet can answer. There is no application to prepare and no office for LegalEase to write to; the point of this page is that you should not rely on the sealing here without advice."
    },
    sequence: [
      "This sheet exists because the sealing does not do here what it does elsewhere. The controlling review records that, notwithstanding §§ 23A-27-14 and 23A-27-17, a person who received a § 23A-27-13 order for a conviction under a specified subdivision of § 22-22-1 or under § 22-22-7, and who is licensed or seeks licensure as a certified teacher, may have the application refused or the licence revoked.",
      "So sealed does not mean invisible to the teaching-licensure authority for those offences. That is the whole of the point and it is worth reading twice.",
      "Be careful with the word 'specified'. Which subdivisions of § 22-22-1 are caught has not been read at source subsection by subsection in the work behind this sheet, and the design carries that as an open build question. This page therefore does not tell you whether your subdivision is one of them, and nobody should read it as saying that it is or is not.",
      "The adopted design puts this combination outside self-help altogether. That is a decision about what a guidance sheet can responsibly answer, not a finding that nothing can be done.",
      "Take the order granting the suspended imposition of sentence, which names the section and subdivision, to " + SD_LEGAL_HELP + " before you make or renew a licensure application. Ask specifically what the carve-out means for your subdivision.",
      "Do not answer a licensure question on the strength of the sealing alone. A page cannot tell you how to answer it and this one is not trying to.",
      DCI_NONPUBLIC_RECORD,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet knowing that the sealing may not hold against a teaching-licensure decision for these offences, that the exact reach of the carve-out is unconfirmed, and who to ask before you act.",
    canPrepare: [
      "This warning and the reason it exists.",
      "A plain statement of what has and has not been confirmed at source.",
      "The list of what to take with you when you ask."
    ],
    extraCannotPerform: [
      "LegalEase cannot tell you whether your subdivision is one of the specified ones, cannot advise on how to answer a licensure question, and does not contact any licensing authority."
    ],
    escalations: [
      "A licensure application or renewal is pending now.",
      "A licensing authority has already asked about the case.",
      "You cannot tell from the order which subdivision the charge was brought under."
    ]
  }),

  // ---- sd_pardon_24_14_11 --------------------------------------------------
  "sd-pardon-route-detection": sheet({
    templateId: "sd-pardon-route-detection",
    mechanismName: "The South Dakota pardon route, and why the chapter 24-14 process is the part that matters",
    whyNotAFiling:
      "Nothing on this page is filed and nothing is generated. The chapter 24-14 application is a Board of Pardons and Paroles process rather than a form to fill in, and the sealing that follows a granted pardon is the Governor's order under § 24-14-11.",
    processType: "agency",
    prerequisites: [
      "The conviction is a South Dakota conviction.",
      "You are willing to hear that the route runs through a Board process this service does not run.",
      "You understand that a pardon granted outside chapter 24-14 does not carry sealing."
    ],
    documentsToObtain: [
      "The pardon document and any Board of Pardons and Paroles decision, where a pardon has already been granted. These establish whether the pardon went through the chapter 24-14 process.",
      `A copy of ${SD_RECORD_CHECK}.`
    ],
    gather: [
      "The conviction: the offence, the county, the case number and the year.",
      "Whether a pardon has already been granted, and if so, on what date.",
      "Whether the pardon followed an application to the South Dakota Board of Pardons and Paroles.",
      "Whether the records still appear on a public record search, and the date you last looked."
    ],
    destination: {
      name: "The South Dakota Board of Pardons and Paroles, and the Office of the Governor",
      detail:
        "The application goes to the Board. The pardon is the Governor's, and on granting a chapter 24-14 pardon the Governor orders the records sealed. Neither step is one you file for through this service, and LegalEase does not contact either body."
    },
    sequence: [
      HISTORICAL_CONTEXT,
      "So the pardon route is surfaced here early and deliberately. In most states it is an exotic fallback. In South Dakota, where conviction relief is otherwise so thin, it is the realistic answer for a much larger share of people, and treating it as a footnote would be doing you a disservice.",
      "The chapter is the part that matters. Section 24-14-11 attaches the sealing to a pardon granted under the provisions of chapter 24-14, and says in terms that a pardon granted without following the chapter may not be sealed. A pardon that did not go through the Board process releases the disabilities and leaves the records where they are.",
      "Where a chapter 24-14 pardon is granted, the Governor shall order that all official records relating to the arrest, the indictment or information, the trial, the finding of guilt, the pardon application and the Board's proceedings be sealed. That order is the Governor's; you do not apply for it separately.",
      "One part stays public for a while by design. The Governor files a public document with the secretary of state certifying the pardon, and that document remains public for five years before it is sealed. A record still visible in that window is not a sign that anything has gone wrong.",
      NOT_A_REPORT_ON_YOUR_CASE,
      "The application itself is where this service stops, and the next sheet in this packet says who to take it to.",
      DCI_NONPUBLIC_RECORD
    ],
    expectedNextStage:
      "You leave this sheet knowing whether the pardon route is the one that fits, what the chapter 24-14 requirement means, and that the sealing follows the grant rather than being applied for.",
    canPrepare: [
      "This explanation of the route and of the chapter 24-14 requirement.",
      "The account of what the Governor's order covers and of the five-year public certifying document.",
      "A plain statement of the point at which this service stops, which is the Board application itself.",
      "The referral sheet and the effect sheet that follow it in this packet."
    ],
    escalations: [
      "You hold a pardon and cannot tell whether it went through the Board process.",
      "You need relief on a timetable and want to know how long the Board process takes.",
      "The conviction is one you believe should never have been entered, which is a different question again."
    ]
  }),

  "sd-pardon-referral": sheet({
    templateId: "sd-pardon-referral",
    mechanismName: "Where to take a South Dakota pardon application, and why not here",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed, and LegalEase does not prepare pardon applications: the chapter 24-14 process is advocacy before the Board of Pardons and Paroles and the adopted scope does not reach it.",
    processType: "agency",
    prerequisites: [
      "You have read the route sheet that comes before this one in the packet.",
      "You accept that the application itself is not something this service prepares."
    ],
    documentsToObtain: [
      "The judgment and sentence for the conviction, and the docket, from the Clerk of Courts in the county of conviction.",
      `A copy of ${SD_RECORD_CHECK}.`,
      "Proof of what you have done since: employment, treatment, training, community involvement. A pardon application is an argument, and these are what it is made of."
    ],
    gather: [
      "The conviction: the offence, the county, the case number, the year and the sentence.",
      "The date the sentence was completed, and everything since.",
      "Why you are asking, in your own words. That is the centre of a pardon application and it is yours rather than anyone else's.",
      "Whether anyone will speak for you, and who."
    ],
    destination: {
      name: "A South Dakota clemency programme, a law school clinic, or a South Dakota attorney",
      detail:
        "The chapter 24-14 application is prepared and presented by you or by someone representing you, not by LegalEase. This sheet names the kinds of help that exist; it does not make the application and it does not contact the Board."
    },
    sequence: [
      "Be clear about the boundary. LegalEase does not prepare a pardon application and this packet contains none. That is a decision about what this service does — a pardon application is individualised advocacy rather than a form — and it is not a finding that the application cannot be made or that you should not make it.",
      "The application goes to the South Dakota Board of Pardons and Paroles. It is the Board's process, and this page does not describe its forms, its fees or its timetable, because none of that has been established here and guessing at it would be worse than saying so.",
      "Take it to " + SD_LEGAL_HELP + ", or to a clemency programme if one is running. Ask about representation for a Board application specifically, rather than about record clearing generally, because they are different pieces of work.",
      "Gather the documents listed above before you go. An application is an argument built out of the judgment, the sentence, what you completed and what you have done since, and arriving with those makes the first conversation a useful one.",
      "Ask the person you go to about the chapter 24-14 requirement directly. It is the thing that decides whether sealing follows the pardon, and it is worth confirming at the outset rather than discovering afterwards.",
      "Nothing here is a view about whether a pardon will be granted. LegalEase cannot tell you that and would be wrong to hint at it.",
      NO_MOTION_TO_FILE
    ],
    expectedNextStage:
      "You leave this sheet knowing where the application belongs, what to take when you go, and that this service stops at the referral rather than at the Board's door.",
    canPrepare: [
      "This referral explanation and the reason for the boundary.",
      "The list of records and material to gather before the first conversation.",
      "The effect sheet that follows it in this packet, so you know what a pardon does before you ask for one."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare, submit or argue a chapter 24-14 pardon application, and does not contact the Board of Pardons and Paroles or the Office of the Governor."
    ],
    escalations: [
      "You cannot find a clemency programme or a lawyer who takes Board applications.",
      "A deadline in your own life turns on the conviction and you need to know whether any faster route exists.",
      "You have applied before and were refused."
    ]
  }),

  "sd-pardon-legal-effect": sheet({
    templateId: "sd-pardon-legal-effect",
    mechanismName: "What a South Dakota pardon does to a record, and what it does not",
    whyNotAFiling:
      "This page explains the effect of a pardon and of the sealing order that follows a chapter 24-14 grant. Nothing on it is filed and nothing is generated for you to submit.",
    processType: "agency",
    prerequisites: [
      "You have read the route sheet and the referral sheet that come before this one in the packet.",
      "You are prepared to hear what a pardon does not do as well as what it does."
    ],
    documentsToObtain: [
      "The pardon document and the Board's decision, where a pardon has been granted.",
      `A copy of ${SD_RECORD_CHECK}.`
    ],
    gather: [
      "Whether a pardon has been granted, and on what date.",
      "Whether it followed an application to the Board of Pardons and Paroles.",
      "Whether the records still appear on a public record search, and the date you last looked."
    ],
    destination: {
      name: "The Office of the Governor, with the certifying document filed with the South Dakota secretary of state",
      detail:
        "On granting a chapter 24-14 pardon the Governor orders the records sealed and files a public document with the secretary of state certifying the pardon. That certifying document is public for five years and is then sealed. Nothing on either step is submitted by you."
    },
    sequence: [
      "Start with what a pardon does. A person granted a pardon under chapter 24-14 is released from all the disabilities that followed the conviction, and the Governor orders the official records sealed — the arrest, the indictment or information, the trial, the finding of guilt, the pardon application, and the proceedings of the Board of Pardons and Paroles.",
      "It also restores you to the status you held before the arrest, indictment or information, and protects you against perjury or false-statement liability for failing to acknowledge the matter. That is real and it is more than most South Dakota routes give.",
      "Now what it does not do, which matters just as much. A pardoned conviction may still count as a prior conviction for sentencing on a later offence, in habitual-offender proceedings, and in later driving-under-the-influence sentencing. Anyone who tells you a pardon means the conviction never counts again has told you something the law does not say.",
      DCI_NONPUBLIC_RECORD,
      "And the chapter matters here too. Section 24-14-11 says a pardon granted without following the provisions of chapter 24-14 may not be sealed. Where a pardon came some other way, the release from disabilities is not accompanied by the sealing.",
      "The certifying document the Governor files with the secretary of state stays public for five years from filing before it is sealed. If a record is still findable inside that window, that is the statute working rather than failing.",
      NOT_A_REPORT_ON_YOUR_CASE,
      "Where a chapter 24-14 pardon was granted and the records are still being disclosed after all that, the route is the Board and then a lawyer. There is nothing on this route for you to file."
    ],
    expectedNextStage:
      "You leave this sheet knowing what a chapter 24-14 pardon reaches, what still counts afterwards, and why a record may remain findable for five years without anything having gone wrong.",
    canPrepare: [
      "This explanation of the effect of a pardon and of the sealing order.",
      "The account of what still counts afterwards.",
      "The account of the five-year public certifying document."
    ],
    escalations: [
      "A prosecutor has raised a pardoned conviction as a prior in a later matter.",
      "You hold a pardon and the records are still being disclosed more than five years after it was granted.",
      "An application asks about pardoned convictions and you do not know how to answer it."
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
      if (!SOUTH_DAKOTA_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no South Dakota guidance template ${component.templateId} is registered.`
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
 * Asked on every South Dakota route in this family, in this order.
 *
 * Record jurisdiction is a stop condition on all four assigned tracks, so it is
 * asked on all four. Immigration is named by the design on the diversion and
 * pardon tracks; it is asked on all four because the consequence does not vary
 * by route and screening it late would be screening it too late.
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
      "Is the record from South Dakota, another state, the federal courts, a tribal court, or a military court?",
    required: true
  },
  {
    key: "immigrationQuestion",
    label:
      "Could your immigration status be affected by this — for example, are you not a United States citizen?",
    required: true
  }
];

function southDakotaTrack(input: {
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
    jurisdiction: "SD",
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

export const SOUTH_DAKOTA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  southDakotaTrack({
    trackId: "sd_diversion",
    publicName: "Clear a record after completing a diversion programme",
    mechanism: "expungement_on_state_attorney_filing_after_diversion_completion",
    authority: "SDCL §§ 23A-3-35, 23A-3-36 and 23A-3-37",
    recordTypes: ["arrest", "charge"],
    dispositions: ["diversion_successfully_completed"],
    components: [
      {
        componentId: "sd_diversion-eligibility-and-timing-analysis-1",
        templateId: "sd-diversion-eligibility-and-timing"
      },
      {
        componentId: "sd_diversion-status-verification-instructions-2",
        templateId: "sd-diversion-status-verification"
      },
      { componentId: "sd_diversion-escalation-instructions-3", templateId: "sd-diversion-escalation" }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "diversionCompletionDate",
        label: "On what date did you successfully complete the diversion programme?",
        required: true
      },
      {
        key: "diversionTermsCompleted",
        label: "Did you complete every term of the diversion programme?",
        required: true
      },
      {
        key: "entireArrestRecordCovered",
        label: "Did the whole arrest go into the diversion programme, or only part of it?",
        required: true
      },
      {
        key: "newChargesSinceCompletion",
        label:
          "Have you been charged with any new crime since completing diversion, other than a petty offence or a minor traffic citation?",
        required: true
      },
      {
        key: "oneYearThirtyDaysHasRun",
        label: "Have one year and thirty days passed since the date you completed?",
        required: true
      },
      {
        key: "diversionCounty",
        label: "In which South Dakota county was the diversion programme administered?",
        required: true
      },
      { key: "diversionCaseNumber", label: "What is the case number for the diverted charges?", required: true },
      {
        key: "stateAttorneyFiled",
        label:
          "Do you know whether the State's Attorney has filed the dismissal and the notice that you completed diversion?",
        required: true
      }
    ],
    assembledPacketName: "south-dakota-diversion-expungement",
    assembledPacketTitle: "South Dakota diversion expungement — what the State's Attorney files",
    customerDeliverableDescription:
      "Works out the one year and thirty days from the date a South Dakota diversion programme was completed, explains that the State's Attorney files the dismissal and notice and the court then grants the expungement without a motion, shows how to check the docket, and sets out the escalation where the filing has not been made. Nothing is filed by the participant and no fee is charged.",
    notes:
      "Process guidance only. The statute routes around the participant entirely; never generate a motion. The remedy where the State's Attorney has not filed is a preserved release blocker."
  }),

  southDakotaTrack({
    trackId: "sd_23a_3_34_auto",
    publicName: "Automatic removal of a minor case from your public record",
    mechanism: "automatic_removal_of_non_felony_charges_from_the_public_record",
    authority: "SDCL § 23A-3-34",
    recordTypes: ["charge", "conviction"],
    dispositions: ["convicted", "charged_not_convicted"],
    components: [
      {
        componentId: "sd_23a_3_34_auto-eligibility-and-timing-analysis-1",
        templateId: "sd-23a-3-34-eligibility-and-timing"
      },
      {
        componentId: "sd_23a_3_34_auto-status-verification-instructions-2",
        templateId: "sd-23a-3-34-status-verification"
      },
      {
        componentId: "sd_23a_3_34_auto-legal-effect-explanation-3",
        templateId: "sd-23a-3-34-legal-effect"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "highestChargedOffense",
        label:
          "What was the most serious offence charged in the case — a petty offence, a municipal ordinance violation, a Class 2 misdemeanor, or something more serious?",
        required: true
      },
      { key: "caseDispositionDate", label: "On what date did the case end?", required: true },
      {
        key: "conditionsSatisfied",
        label:
          "Have all the conditions the court ordered in that case — fines, costs, classes, community service, probation — been satisfied?",
        required: true
      },
      {
        key: "furtherConvictions",
        label: "Have you been convicted of any further offence in the five years since that case ended?",
        required: true
      },
      { key: "fiveYearsHaveRun", label: "Have five years passed since the case ended?", required: true },
      {
        key: "stillShowingOnRecord",
        label: "Does the case still show up on your public record now?",
        required: true
      },
      { key: "caseCounty", label: "In which South Dakota county was the case filed?", required: true }
    ],
    assembledPacketName: "south-dakota-automatic-public-record-removal",
    assembledPacketTitle: "South Dakota automatic removal from the public record",
    customerDeliverableDescription:
      "Explains which South Dakota cases come off the public record after five years under § 23A-3-34, how to work out the date and check it, and what the section leaves behind — including that the record stays available to the courts and can be used as an enhancement later. Nothing is filed and no fee is charged.",
    notes:
      "Process guidance only. Removal is by operation of the section; there is no motion to file and the enhancement carve-out belongs in every description of the track."
  }),

  southDakotaTrack({
    trackId: "sd_sis_sealing",
    publicName: "Seal a record after a suspended imposition of sentence",
    mechanism: "sealing_on_discharge_and_dismissal_after_suspended_imposition_of_sentence",
    authority: "SDCL §§ 23A-27-13, 23A-27-14 and 23A-27-17",
    recordTypes: ["arrest", "charge", "conviction"],
    dispositions: ["suspended_imposition_of_sentence_discharged_and_dismissed"],
    components: [
      {
        componentId: "sd_sis_sealing-status-verification-instructions-1",
        templateId: "sd-sis-status-verification"
      },
      { componentId: "sd_sis_sealing-legal-effect-explanation-2", templateId: "sd-sis-legal-effect" },
      { componentId: "sd_sis_sealing-escalation-instructions-3", templateId: "sd-sis-escalation" },
      {
        componentId: "sd_sis_sealing-teacher-licensing-warning-4",
        templateId: "sd-sis-teacher-licensing-warning",
        requirement: "conditional",
        conditionKey: "sisTeacherLicensingWarningApplies"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "sisGranted",
        label: "Did the court grant you a suspended imposition of sentence in this case?",
        required: true
      },
      {
        key: "sisOffenceLevel",
        label: "Was the suspended imposition of sentence for a felony or a misdemeanor?",
        required: true
      },
      {
        key: "priorFelonyConviction",
        label: "Had you ever been convicted of a felony before this case?",
        required: true
      },
      {
        key: "priorSuspendedImposition",
        label: "Have you ever had a suspended imposition of sentence in any other case?",
        required: true
      },
      {
        key: "conditionsCompleted",
        label: "Did you complete all of the conditions the court ordered?",
        required: true
      },
      {
        key: "dischargeAndDismissalIssued",
        label: "Did the court enter an order discharging you and dismissing the case?",
        required: true
      },
      {
        key: "recordsStillPublic",
        label: "Does the case still appear on a public record search now?",
        required: true
      },
      {
        key: "teachingLicence",
        label: "Do you hold, or are you seeking, a South Dakota certified teaching licence?",
        required: true
      },
      {
        key: "sexOffenceStatutes",
        label: "Was the underlying charge under SDCL § 22-22-1 or § 22-22-7?",
        required: true
      },
      { key: "caseCounty", label: "In which South Dakota county was the case?", required: true }
    ],
    assembledPacketName: "south-dakota-suspended-imposition-sealing",
    assembledPacketTitle: "South Dakota sealing after a suspended imposition of sentence",
    customerDeliverableDescription:
      "Shows how to confirm that a South Dakota discharge and dismissal issued and that the § 23A-27-17 sealing order followed it, explains the restoration of status and the perjury protection alongside what the Division of Criminal Investigation keeps, sets out the escalation where the sealing did not follow, and adds the teaching-licence warning where the charge was under § 22-22-1 or § 22-22-7. Nothing is filed and no fee is charged.",
    notes:
      "Process guidance only. The sealing is the court's obligation on discharge and dismissal; no participant motion exists. The remedy where a court has not sealed is a preserved release blocker, and §§ 23A-27-13 and 23A-27-14 remain unread subsection by subsection."
  }),

  southDakotaTrack({
    trackId: "sd_pardon_24_14_11",
    publicName: "Records sealed after a governor's pardon",
    mechanism: "sealing_on_the_grant_of_a_chapter_24_14_pardon",
    authority: "SDCL § 24-14-11 and chapter 24-14",
    recordTypes: ["arrest", "charge", "conviction"],
    dispositions: ["pardoned_under_chapter_24_14"],
    components: [
      {
        componentId: "sd_pardon_24_14_11-route-detection-and-explanation-1",
        templateId: "sd-pardon-route-detection"
      },
      { componentId: "sd_pardon_24_14_11-referral-instructions-2", templateId: "sd-pardon-referral" },
      {
        componentId: "sd_pardon_24_14_11-legal-effect-explanation-3",
        templateId: "sd-pardon-legal-effect"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "wantsPardonApplicationPrepared",
        label: "Do you want LegalEase to prepare the pardon application itself?",
        required: true
      },
      {
        key: "pardonGranted",
        label: "Have you already been granted a pardon by the Governor of South Dakota?",
        required: true
      },
      {
        key: "convictionDetails",
        label: "What was the conviction — the offence, the county, the case number and the year?",
        required: true
      },
      {
        key: "pardonUnderChapter2414",
        label: "Was the pardon granted after an application to the South Dakota Board of Pardons and Paroles?",
        required: false
      },
      { key: "pardonDate", label: "On what date was the pardon granted?", required: false },
      {
        key: "recordsStillPublic",
        label: "Do the records still appear on a public record search?",
        required: false
      }
    ],
    assembledPacketName: "south-dakota-pardon-route",
    assembledPacketTitle: "South Dakota pardon route — chapter 24-14 and what a pardon does",
    customerDeliverableDescription:
      "Surfaces the South Dakota pardon route and explains why the chapter 24-14 Board process is the part that decides whether sealing follows, names where to take the application because LegalEase does not prepare one, and sets out what a pardon does and does not do — including that it may still count as a prior conviction and that the certifying document stays public for five years. Nothing is filed and no fee is charged.",
    notes:
      "Process guidance only. The application is Board advocacy and is outside the adopted scope; the sealing is the Governor's order on the grant. The route is surfaced early because South Dakota conviction relief is otherwise narrow."
  })
];
