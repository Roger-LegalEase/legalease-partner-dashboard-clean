// Ohio process guidance — three routes, none of which the participant files
// anything on.
//
// Three assigned tracks, all `process_guidance` in the adopted design:
//
//   - `oh_2953_36_trafficking` is an adopted product-scope exclusion. ORC
//     2953.36 lets a human-trafficking survivor apply to expunge a conviction:
//     a prostitution-related offence under ORC 2907.24, 2907.241 or 2907.25 on
//     a preponderance of the evidence, or a misdemeanour or fourth or fifth
//     degree felony whose commission resulted from being a victim, on clear and
//     convincing evidence. Establishing that in a proceeding where the
//     prosecutor may object is survivor-sensitive advocacy rather than packet
//     work, so the design's deliverable is detection, the alternative-route
//     screen, a referral and the scope disclosure. No application is generated.
//   - `oh_2953_521_trafficking_nonconviction` is the same exclusion on the
//     non-conviction side. ORC 2953.521 reaches a person found not guilty, or
//     named in a dismissed complaint, indictment or information, where the case
//     resulted from being a victim of human trafficking. The standard is a
//     preponderance, but the court also weighs whether a dismissal was with or
//     without prejudice, whether the limitations period has expired, whether
//     proceedings are pending, any prosecutor objection and the governmental
//     interest. Same four-component deliverable, same reason.
//   - `oh_2953_39_prosecutor` is prosecutor action without a participant
//     filing. For a low-level controlled substance offence — a Chapter 2925
//     violation that is a misdemeanour of the fourth degree or a minor
//     misdemeanour, or a substantially equivalent municipal ordinance — the
//     prosecuting attorney, and only the prosecuting attorney, may apply to the
//     sentencing court after the corresponding ORC 2953.32 waiting period has
//     run. The subject person and any victim may object. There is no
//     participant application on the section at all.
//
// Five things the design insists on, carried by the sheets here:
//
//   - Sealing and expungement are different remedies and neither is erasure.
//     Sealing hides the record from most public access; the record still exists
//     and stays visible to certain employers, licensing boards, prosecutors,
//     judges and police. Expungement is stronger and the statute uses destroy,
//     delete and erase language — but on a conviction expungement under ORC
//     2953.32 the Bureau of Criminal Identification and Investigation keeps a
//     limited record for law-enforcement employment qualification and
//     disqualification. The design calls this the single most important
//     disclosure in Ohio record-clearing copy and forbids the phrase
//     "completely gone from everywhere". Every sheet here carries it.
//   - The ORC 2953.61 multiple-charge trap. Where two or more offences arose
//     from the same act and at least one has a different final disposition, a
//     person generally cannot clear only part of the record. The design calls
//     it Ohio's most common eligibility failure, which is why every route here
//     asks about every charge from the incident rather than the one charge the
//     participant came in about.
//   - Unpaid court costs do not delay eligibility. Final discharge means
//     completion of the sentence, parole, fines and restitution, and "sentence"
//     does not include court costs. The design records this as a common and
//     expensive misunderstanding worth stating explicitly.
//   - "Eligible offender" no longer exists. SB 288 removed that definition from
//     ORC 2953.31 and with it the numeric cap on how many convictions a person
//     could clear. The phrase appears nowhere in this module, and the committed
//     verifier fails if it reappears.
//   - Screen the ordinary route first. A survivor whose case was dismissed may
//     have an ordinary ORC 2953.33 route that requires no trafficking proof at
//     all, and the design says to screen for that before anything else because
//     it may reach the same result with far less exposure. That screen is an
//     assigned component on both trafficking tracks, so it is a sheet rather
//     than a stop: a participant who says yes to it must read it, not be thrown
//     out of the packet by it.
//
// And three things the design leaves open, which no sheet here closes:
//
//   - The full text of ORC 2953.36 was not read at source. Coverage, standards
//     and exclusions are the review's account corroborated by county law
//     library guides.
//   - The same for ORC 2953.521.
//   - The full text of ORC 2953.39 was not read at source, including whether a
//     person has any way to prompt a prosecutor to consider an application and
//     what happens if the prosecutor declines. That is the participant's first
//     question on the route and this packet does not answer it.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Ohio is not
// an enabled jurisdiction and this job does not enable one. The ordinary Ohio
// sealing and expungement routes named in the copy are other jobs and are
// untouched here.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** The two places an Ohio participant looks the case up. Named once. */
const OH_RECORD_CHECK =
  "your own Ohio criminal record from the Bureau of Criminal Identification and Investigation, and the case file itself from the clerk of the court where the case was heard";

/** Ohio help for the two survivor routes. No organisation is named for you. */
const OH_SURVIVOR_HELP =
  "an Ohio legal aid office, a law school clinic that works with trafficking survivors, or an Ohio attorney who does survivor work";

/** Ordinary Ohio help, for the prosecutor route and the general stops. */
const OH_LEGAL_HELP =
  "an Ohio legal aid office, an Ohio law school clinic, or an Ohio attorney";

/** Said on every route in this family. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes what the law does. It does not tell you what has happened in your case, and LegalEase has not looked. Nothing here is a decision about whether your record qualifies.";

/**
 * The design's single most important Ohio disclosure, on every sheet.
 *
 * The prohibition on "completely gone from everywhere" is the design's own
 * wording, and the committed verifier holds it.
 */
const SEALING_IS_NOT_EXPUNGEMENT =
  "Ohio has two different remedies and they are not the same thing. Sealing hides a record from most public access, but the record still exists and stays visible to certain employers, licensing boards, prosecutors, judges and police. Expungement is the stronger one, and for many sections the statute uses destroy, delete and erase language. Neither of them is the same as the record ceasing to exist everywhere, and this packet will not describe either of them that way.";

/** The BCI carve-out. The design calls this the disclosure that matters most. */
const BCI_RETENTION =
  "One thing is worth knowing before you rely on the word expungement. On a conviction expungement under ORC 2953.32 the Bureau of Criminal Identification and Investigation keeps a limited record, used to decide whether a person qualifies or is disqualified for law-enforcement employment, while the other entities that receive notice of the order must destroy, delete and erase what they hold. So even the stronger remedy leaves something behind in one place, by design.";

/** Ohio's most common eligibility failure. Asked about on all three routes. */
const MULTIPLE_CHARGE_TRAP =
  "Ohio's most common reason for a record-clearing application to fail is ORC 2953.61. Where a person was charged with two or more offences arising from the same act and at least one of those charges ended differently from the others, they generally cannot clear only part of the record. That is why anyone helping you needs every charge from the incident, not only the charge you came in about. Get the whole docket, not the one line.";

/** Court costs do not delay eligibility. A common and expensive belief. */
const COURT_COSTS_DO_NOT_DELAY =
  "Final discharge means you finished the sentence, including parole, fines and restitution. It does not include paying court costs, so unpaid court costs do not push back the date you become eligible. People wait years on that misunderstanding, and it is worth checking rather than assuming.";

/** SB 288 removed the numeric cap and the "eligible offender" definition. */
const SB_288_CHANGED_THE_LIMITS =
  "Anything you read about Ohio record clearing that was written before April 2023 may be out of date. Senate Bill 288 removed the definition that used to limit how many convictions a person could clear, so an older guide that tells you there is a numeric cap is describing law that no longer applies.";

/** LegalEase prepares nothing on any of these three routes. */
const NO_APPLICATION_IS_PREPARED =
  "There is no application, motion or petition on this route for LegalEase to prepare, and none is generated. This packet explains the route, names the section and tells you where to take it. That is the whole of what it does.";

const OH_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal, expunge or remove anything, and cannot make a court, a clerk, a prosecutor or the Bureau of Criminal Identification and Investigation act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been sealed or expunged. Only the court file and your own criminal record show that, and you are the one who reads them.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

const OH_COMMON_SOURCES: readonly string[] = [
  "Ohio Rev. Code § 2953.32, sealing and expungement of convictions, and § 2953.33, records of a case that did not end in a conviction, at codes.ohio.gov, retrieved 6 August 2026.",
  "Ohio Rev. Code § 2953.61, multiple charges arising from the same act, at codes.ohio.gov, retrieved 6 August 2026.",
  "Am. Sub. S.B. 288 of the 134th General Assembly, in force 4 April 2023, which rewrote the Ohio record-clearing sections named here."
];

const OH_SURVIVOR_SOURCES: readonly string[] = [
  "Ohio Rev. Code § 2953.36, expungement of records of human trafficking victims, at codes.ohio.gov, retrieved 6 August 2026.",
  "Ohio Rev. Code § 2953.521, expungement of non-conviction records of human trafficking victims, at codes.ohio.gov, retrieved 6 August 2026.",
  ...OH_COMMON_SOURCES
];

const OH_PROSECUTOR_SOURCES: readonly string[] = [
  "Ohio Rev. Code § 2953.39, prosecutor-initiated sealing or expungement of a low-level controlled substance offence, at codes.ohio.gov, retrieved 6 August 2026.",
  "Ohio Rev. Code ch. 2925, controlled substance offences, at codes.ohio.gov, retrieved 6 August 2026.",
  ...OH_COMMON_SOURCES
];

/**
 * The design records that the statutory text behind these routes was not read
 * at source, so every sheet says where its description came from.
 *
 * Stating this to the participant is the only honest way to carry a build
 * blocker into copy: it is not a reason to withhold the route, and it is not
 * something to bury either.
 */
const DESCRIPTION_NOT_READ_AT_SOURCE =
  "One more thing, and it is about this page rather than about the law. What is said here about who the section covers, what has to be proved and what it leaves out comes from a legal review of the section and from county law-library guides to it, rather than from a reading of the section's own text. Treat it as a description to check with the person you take this to, not as the section itself.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class OhioGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "OhioGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Ohio route. */
export class OhioRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "OhioRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class OhioBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "OhioBranchError";
  }
}

export const OH_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Only an Ohio record is reached by any of these three routes. */
export const OH_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  ohio: true,
  another_state: false,
  federal: false,
  tribal: false,
  military: false
};

/** How the case ended. Decides which of the two survivor sections applies. */
export const OH_DISPOSITIONS: Readonly<Record<string, string>> = {
  convicted: "conviction",
  not_guilty: "non_conviction",
  dismissed: "non_conviction",
  still_pending: "not_finished"
};

/** ORC 2953.39 reaches a narrow band of Chapter 2925 offences and nothing else. */
export const OH_LOW_LEVEL_CONTROLLED_SUBSTANCE: Readonly<Record<string, string>> = {
  chapter_2925_fourth_degree_misdemeanor: "within",
  chapter_2925_minor_misdemeanor: "within",
  equivalent_municipal_ordinance: "within",
  something_else: "outside"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new OhioBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualised legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

const OUT_OF_JURISDICTION_STOP =
  "The Ohio Revised Code reaches Ohio records. It does not reach a federal, tribal, military or out-of-state record, and none of these three Ohio routes touches one.";

const IMMIGRATION_STOP =
  "Immigration consequences are governed by federal law, and no Ohio sealing or expungement order reaches them. On a route that already turns on what happened to you, getting this wrong is expensive in a way that cannot be undone later.";

const MULTIPLE_CHARGE_STOP =
  "ORC 2953.61 is the point. Where two or more offences arose from the same act and at least one of them ended differently from the others, a person generally cannot clear only part of the record. This is Ohio's most common eligibility failure and it is a legal question about the whole incident rather than about one charge.";

const PENDING_PROCEEDINGS_STOP =
  "A pending criminal proceeding or an open warrant changes what is available and in what order, on every Ohio route. Nothing on this page applies cleanly while something is still open.";

const SEALING_VERSUS_EXPUNGEMENT_STOP =
  "Choosing between sealing and expungement is a legal judgment. The two remedies carry different waiting periods, different exclusions and different consequences, and picking the wrong one can cost a year or more.";

const OBJECTION_STOP =
  "An objection changes the proceeding into a contested one. Answering a prosecutor's objection, or a victim's, is advocacy, and no guidance sheet is a substitute for somebody who can appear and argue.";

/**
 * Validates participant answers and routes to the correct Ohio node.
 *
 * The order is the design's: the eligibility-advice boundary first; then record
 * jurisdiction; then the five conditions the design records identically as stop
 * conditions on all three assigned tracks — immigration exposure, the ORC
 * 2953.61 multiple-charge trap, pending proceedings or open warrants, choosing
 * between sealing and expungement, and an objection by the prosecutor or a
 * victim; then the route's own questions.
 *
 * Two questions the design records are deliberately *not* stops. Whether the
 * participant would rather have the ordinary ORC 2953.33 route checked first,
 * and whether they want survivor-organisation details, are both answered by
 * assigned components — so throwing on them would mean the sheet the design
 * commissioned to answer the question never renders.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveOhioGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Nobody is served an eligibility opinion by a guidance sheet.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", OH_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new OhioGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      OH_LEGAL_HELP,
      "Take the case papers and your own criminal record to one of them and ask about your own case."
    );
  }

  // Gate 2. Record jurisdiction.
  const jurisdiction = branch(trackId, "recordJurisdiction", OH_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (!jurisdiction.resolved) {
    throw new OhioRouteMismatchError(
      trackId,
      "record_is_not_an_ohio_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal, tribal or military authority that holds the record",
      "Take the record to that authority and ask what its own law provides. If you also hold Ohio records, those are handled separately and only those are served here."
    );
  }

  // Gate 3. Immigration exposure, a stop condition on all three tracks.
  const immigration = branch(trackId, "immigrationQuestion", OH_YES_NO, facts.immigrationQuestion);
  if (immigration.resolved) {
    throw new OhioGuidanceStopError(
      trackId,
      "immigration_consequences_in_play",
      IMMIGRATION_STOP,
      "an immigration attorney",
      "Speak to an immigration attorney about the record before you rely on anything on this route."
    );
  }

  // Gate 4. The ORC 2953.61 multiple-charge trap.
  const multipleCharges = branch(
    trackId,
    "chargesFromTheSameIncidentEndedDifferently",
    OH_YES_NO,
    facts.chargesFromTheSameIncidentEndedDifferently
  );
  if (multipleCharges.resolved) {
    throw new OhioGuidanceStopError(
      trackId,
      "charges_from_the_same_act_ended_differently",
      MULTIPLE_CHARGE_STOP,
      OH_LEGAL_HELP,
      "Take the full docket for the incident, showing every charge and how each one ended, and ask what ORC 2953.61 means for the record as a whole."
    );
  }

  // Gate 5. Pending proceedings or open warrants.
  const pending = branch(trackId, "pendingProceedingsOrWarrants", OH_YES_NO, facts.pendingProceedingsOrWarrants);
  if (pending.resolved) {
    throw new OhioGuidanceStopError(
      trackId,
      "pending_proceedings_or_open_warrant",
      PENDING_PROCEEDINGS_STOP,
      "the clerk of the court where the matter is open, and then " + OH_LEGAL_HELP,
      "Find out what is still open and deal with that first. Come back to this route once nothing is pending."
    );
  }

  // Gate 6. Choosing between the two remedies is a legal judgment.
  const chooseRemedy = branch(
    trackId,
    "wantsSealingVersusExpungementAdvice",
    OH_YES_NO,
    facts.wantsSealingVersusExpungementAdvice
  );
  if (chooseRemedy.resolved) {
    throw new OhioGuidanceStopError(
      trackId,
      "choice_between_sealing_and_expungement_requested",
      SEALING_VERSUS_EXPUNGEMENT_STOP,
      OH_LEGAL_HELP,
      "Ask which of the two remedies is available to you and what each would and would not reach. This packet explains the difference; it does not choose for you."
    );
  }

  // Gate 7. An objection makes the proceeding contested.
  const objection = branch(
    trackId,
    "prosecutorOrVictimObjection",
    OH_YES_NO,
    facts.prosecutorOrVictimObjection
  );
  if (objection.resolved) {
    throw new OhioGuidanceStopError(
      trackId,
      "prosecutor_or_victim_objection_raised",
      OBJECTION_STOP,
      OH_LEGAL_HELP,
      "Take the objection itself, in writing if you have it, to somebody who can appear in the case. Do not wait for the hearing date to do it."
    );
  }

  if (trackId === "oh_2953_36_trafficking") {
    const wantsApplication = branch(
      trackId,
      "wantsApplicationPrepared",
      OH_YES_NO,
      facts.wantsApplicationPrepared
    );
    if (wantsApplication.resolved) {
      throw new OhioGuidanceStopError(
        trackId,
        "trafficking_application_is_outside_what_this_service_prepares",
        "An application under ORC 2953.36 turns on establishing that your part in the offence resulted from being trafficked — on a preponderance of the evidence for a prostitution-related charge, and on clear and convincing evidence for the wider misdemeanour and fourth or fifth degree felony category — in a proceeding where the prosecutor may object. That is advocacy about what happened to you, and this service does not prepare it. That is a decision about what LegalEase does, not a finding that the application cannot be made.",
        OH_SURVIVOR_HELP,
        "Ask about representation for the application itself. This packet explains the route and where to take it; it does not prepare the application."
      );
    }

    const disposition = branch(trackId, "caseDisposition", OH_DISPOSITIONS, facts.caseDisposition);
    if (disposition.resolved === "non_conviction") {
      throw new OhioRouteMismatchError(
        trackId,
        "case_did_not_end_in_a_conviction",
        "ORC 2953.36 is the conviction section. A case that ended in a finding of not guilty, or in a dismissal, is reached by ORC 2953.521 instead — and, importantly, may also be reached by the ordinary ORC 2953.33 route, which asks you to prove nothing at all about what happened to you.",
        "the Ohio non-conviction survivor route under ORC 2953.521, and the ordinary ORC 2953.33 route for a case that ended without a conviction",
        "Go back to the Ohio intake and answer the questions for how the case actually ended. Ask about the ordinary route first: it may reach the same result with far less exposure."
      );
    }
    if (disposition.resolved === "not_finished") {
      throw new OhioRouteMismatchError(
        trackId,
        "case_has_not_ended_yet",
        "The section works on a conviction that already exists. While the case is still open there is no final disposition for it to reach, and what happens in the open case may change what is available afterwards.",
        "the attorney representing you in the open case, and otherwise " + OH_SURVIVOR_HELP,
        "Deal with the open case first, and raise what happened to you with whoever is representing you in it. Come back to this route once the case has ended."
      );
    }
    derived.traffickingConvictionRoute = true;

    const excluded = branch(trackId, "excludedOffence", OH_YES_NO, facts.excludedOffence);
    if (excluded.resolved) {
      throw new OhioGuidanceStopError(
        trackId,
        "offence_is_excluded_from_the_section",
        "Aggravated murder, murder and rape under ORC 2903.01, 2903.02 and 2907.02 are excluded from the conviction route. Nothing on this section reaches a conviction for one of them, whatever the circumstances behind it were.",
        OH_SURVIVOR_HELP,
        "Ask what else may be available for a record in that position. Do not spend anything on this section for it."
      );
    }
    return derived;
  }

  if (trackId === "oh_2953_521_trafficking_nonconviction") {
    const wantsApplication = branch(
      trackId,
      "wantsApplicationPrepared",
      OH_YES_NO,
      facts.wantsApplicationPrepared
    );
    if (wantsApplication.resolved) {
      throw new OhioGuidanceStopError(
        trackId,
        "trafficking_application_is_outside_what_this_service_prepares",
        "An application under ORC 2953.521 turns on establishing that the case resulted from you being trafficked, on a preponderance of the evidence, in a proceeding where the prosecutor may object and where the court also weighs the governmental interest. That is advocacy about what happened to you, and this service does not prepare it. That is a decision about what LegalEase does, not a finding that the application cannot be made.",
        OH_SURVIVOR_HELP,
        "Ask about representation for the application itself. This packet explains the route and where to take it; it does not prepare the application."
      );
    }

    const disposition = branch(trackId, "caseDisposition", OH_DISPOSITIONS, facts.caseDisposition);
    if (disposition.resolved === "conviction") {
      throw new OhioRouteMismatchError(
        trackId,
        "case_ended_in_a_conviction",
        "ORC 2953.521 is the non-conviction section: a finding of not guilty, or a dismissed complaint, indictment or information. A conviction is reached by ORC 2953.36 instead, on a different and in places higher standard.",
        "the Ohio conviction survivor route under ORC 2953.36",
        "Go back to the Ohio intake and answer the questions for how the case actually ended, taking the disposition from the docket rather than from memory."
      );
    }
    if (disposition.resolved === "not_finished") {
      throw new OhioRouteMismatchError(
        trackId,
        "case_has_not_ended_yet",
        "The section works from the entry of the not-guilty finding or the dismissal. While the case is still open neither exists, and what happens in it may change what is available afterwards.",
        "the attorney representing you in the open case, and otherwise " + OH_SURVIVOR_HELP,
        "Deal with the open case first, and raise what happened to you with whoever is representing you in it. Come back to this route once the case has ended."
      );
    }
    derived.traffickingNonConvictionRoute = true;
    return derived;
  }

  if (trackId === "oh_2953_39_prosecutor") {
    const wantsToApply = branch(
      trackId,
      "wantsToApplyUnderThisSection",
      OH_YES_NO,
      facts.wantsToApplyUnderThisSection
    );
    if (wantsToApply.resolved) {
      throw new OhioGuidanceStopError(
        trackId,
        "only_the_prosecutor_may_apply_under_this_section",
        "ORC 2953.39 gives the application to the prosecuting attorney. A person cannot apply under it themselves, so there is nothing on this section for you to file and nothing for LegalEase to prepare. That is the section's own design rather than a limit on this service.",
        "the ordinary Ohio sealing and expungement routes, which you can apply for yourself, and " + OH_LEGAL_HELP,
        "Go back to the Ohio intake and ask about the ordinary routes. The next sheet in this packet explains why they are usually the better answer anyway."
      );
    }

    const offence = branch(
      trackId,
      "lowLevelControlledSubstanceOffence",
      OH_LOW_LEVEL_CONTROLLED_SUBSTANCE,
      facts.lowLevelControlledSubstanceOffence
    );
    if (offence.resolved === "outside") {
      throw new OhioRouteMismatchError(
        trackId,
        "offence_is_not_a_low_level_controlled_substance_offence",
        "The section reaches a low-level controlled substance offence: a Chapter 2925 violation that is a misdemeanour of the fourth degree or a minor misdemeanour, or a substantially equivalent municipal ordinance. Anything else is outside it, however minor it feels.",
        "the ordinary Ohio sealing and expungement routes",
        "Go back to the Ohio intake with the Revised Code section and the degree taken from the docket, and answer the questions for the ordinary routes."
      );
    }
    derived.lowLevelControlledSubstanceBranch = offence.value;

    const waitingPeriod = branch(
      trackId,
      "correspondingWaitingPeriodHasRun",
      OH_YES_NO,
      facts.correspondingWaitingPeriodHasRun
    );
    if (!waitingPeriod.resolved) {
      throw new OhioGuidanceStopError(
        trackId,
        "corresponding_waiting_period_has_not_run",
        "The prosecutor may file only after the waiting period that ORC 2953.32 sets for the equivalent sealing has expired. Until it has run there is nothing for a prosecutor to do and nothing to check for.",
        "the clerk of the sentencing court, for the date of final discharge, and then " + OH_LEGAL_HELP,
        "Work out the date of final discharge from the docket and ask which ORC 2953.32 period applies to the offence. Remember that unpaid court costs do not push that date back."
      );
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
  sources?: readonly string[];
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
      "There is nothing to submit and nothing for LegalEase to file. No application, motion or petition is generated on this route.",
    fees: input.fees ?? "None charged by this packet. Nothing here is filed, so nothing here is paid for.",
    feeWaiver: input.feeWaiver ?? "Not applicable to anything in this packet.",
    noticeOrService: input.noticeOrService ?? [
      "There is nothing for you to serve and nobody for you to notify through this packet.",
      "Nobody is required to write and tell you when a step described here has been taken, which is why this packet tells you to go and check."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...OH_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "The record is a federal, tribal, military or out-of-state record.",
      "Your immigration status could be affected by the record.",
      "More than one charge came out of the same incident and they ended differently.",
      "A criminal case is still open, or there is a warrant out.",
      "The prosecutor or a victim has objected, or has said they will.",
      ...input.escalations
    ],
    officialSourceReferences: input.sources ?? OH_COMMON_SOURCES
  };
}

/**
 * The two survivor sections carry a court fee; the prosecutor section does not
 * reach the participant at all. Neither is a family default.
 */
const SURVIVOR_ROUTE_FEES =
  "The court fee on an application under these sections is fifty dollars unless the applicant is indigent, and indigency excuses it. LegalEase charges nothing for this packet's explanation, does not prepare the application and does not collect that fee.";

const SURVIVOR_ROUTE_FEE_WAIVER =
  "Indigency excuses the court fee. Ask the clinic or lawyer you take this to how that is shown in the court where your case was heard.";

const PROSECUTOR_ROUTE_FEES =
  "Not applicable to you. Only the prosecuting attorney may apply under ORC 2953.39, so there is no application of yours to pay for. The ordinary routes you can apply for yourself have their own fees, and this packet says where to ask about those.";

const SURVIVOR_ROUTE_NOTICE: readonly string[] = [
  "There is nothing for you to serve and nobody for you to notify through this packet.",
  "The prosecutor may object to an application under these sections. That is one of the reasons the route ends in a referral rather than in a document."
];

const PROSECUTOR_ROUTE_NOTICE: readonly string[] = [
  "There is nothing for you to serve and nobody for you to notify through this packet.",
  "Where a prosecutor does apply, ORC 2953.39 allows the subject person and any victim to object. You would be the subject person, so an application about your record is something you are entitled to be heard on."
];

function survivorSheet(input: SheetInput): GuidanceTemplate {
  return sheet({
    ...input,
    sources: input.sources ?? OH_SURVIVOR_SOURCES,
    fees: input.fees ?? SURVIVOR_ROUTE_FEES,
    feeWaiver: input.feeWaiver ?? SURVIVOR_ROUTE_FEE_WAIVER,
    noticeOrService: input.noticeOrService ?? SURVIVOR_ROUTE_NOTICE
  });
}

function prosecutorSheet(input: SheetInput): GuidanceTemplate {
  return sheet({
    ...input,
    sources: input.sources ?? OH_PROSECUTOR_SOURCES,
    fees: input.fees ?? PROSECUTOR_ROUTE_FEES,
    feeWaiver: input.feeWaiver ?? "Not applicable. There is no application of yours on this section to waive a fee for.",
    noticeOrService: input.noticeOrService ?? PROSECUTOR_ROUTE_NOTICE
  });
}

const COURT_AND_BCI = {
  name: "The clerk of the Ohio court that handled the case, and the Bureau of Criminal Identification and Investigation",
  detail:
    "The clerk holds the case file and the docket, which is where every charge from the incident and its disposition appears. The Bureau of Criminal Identification and Investigation holds the state criminal record and will release your own copy to you. LegalEase contacts neither and reads neither."
};

export const OHIO_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- oh_2953_36_trafficking ---------------------------------------------
  "oh-2953-36-detection-and-naming": survivorSheet({
    templateId: "oh-2953-36-detection-and-naming",
    mechanismName:
      "Clearing an Ohio conviction that came out of being trafficked: what ORC 2953.36 is",
    whyNotAFiling:
      "LegalEase generates no application on this route. ORC 2953.36 lets a survivor apply to the court to expunge a conviction, but the application turns on establishing that your part in the offence resulted from being trafficked, in a proceeding where the prosecutor may object. That is advocacy about what happened to you rather than form-filling, so this packet names the section, explains what it offers and what it asks for, and tells you where to take it.",
    processType: "court_adjacent",
    prerequisites: [
      "The record is an Ohio conviction.",
      "You are willing to have the connection between the offence and what happened to you looked at by somebody who can act on it. You do not have to write any of that down here, and this packet does not ask you to.",
      "You understand before you read further that this packet prepares no application."
    ],
    documentsToObtain: [
      "The full docket for the case from the clerk of the court that handled it, showing every charge from the incident and how each one ended.",
      "Your own Ohio criminal record from the Bureau of Criminal Identification and Investigation, so that what is discussed is what the record actually says."
    ],
    gather: [
      "What you were convicted of, which Revised Code section was cited, and the degree of the offence.",
      "Every other charge that came out of the same incident, and how each of those ended.",
      "The county and the court, and the case number.",
      "The date you finished the sentence, including parole, fines and restitution.",
      "Nothing about what happened to you. That belongs to the person you take this to, not to a form."
    ],
    destination: {
      name: "The Ohio court that handled the case, reached through a clinic or a lawyer rather than through this packet",
      detail:
        "An application under ORC 2953.36 goes to the sentencing court, or to the court where the case was tried or dismissed. LegalEase prepares nothing for that destination. It identifies the route, names the section, sets out what the section offers and requires, and refers."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What the section covers. ORC 2953.36 reaches two groups: people convicted of prostitution-related offences under ORC 2907.24, 2907.241 or 2907.25, and people convicted of a misdemeanour or a fourth or fifth degree felony where their participation in the offence resulted from being a victim of human trafficking.",
      "What has to be shown, and it differs. For the prostitution-related group the standard is a preponderance of the evidence. For the wider misdemeanour and fourth or fifth degree felony group it is clear and convincing evidence, which is a materially higher bar.",
      "What it excludes. Aggravated murder, murder and rape under ORC 2903.01, 2903.02 and 2907.02 are outside the conviction route.",
      "The timing is unusually open. An application may be made at any time, and it may cover more than one offence, although the court considers each one separately.",
      "What a grant does. Where the court grants the application, the record cannot be used for a criminal-record check, and both you and the court may reply that no record exists.",
      "Why this packet stops here. Establishing the connection to what happened to you, to an evidentiary standard, in a proceeding where the prosecutor may object, is advocacy. The next sheets in this packet screen for a route that may not require any of that, and then tell you where to go.",
      NO_APPLICATION_IS_PREPARED,
      SEALING_IS_NOT_EXPUNGEMENT
    ],
    expectedNextStage:
      "The next sheet in this packet asks a question worth asking before anything else: whether an ordinary Ohio route reaches this record without you having to establish anything about what happened to you.",
    canPrepare: [
      "This explanation of what ORC 2953.36 covers, what it asks for and what it excludes.",
      "The alternative-route screen that follows it in this packet.",
      "The referral sheet, including what to take and what to ask.",
      "The disclosure of what sealing and expungement actually do in Ohio."
    ],
    escalations: [
      "You want the application itself prepared and argued.",
      "You are not sure which of the two groups in the section your conviction falls into.",
      "You have more than one conviction you want dealt with."
    ]
  }),

  "oh-2953-36-alternative-route-screen": survivorSheet({
    templateId: "oh-2953-36-alternative-route-screen",
    mechanismName: "Before anything else: is there a route that asks you to prove nothing?",
    whyNotAFiling:
      "This page is a screen, not a filing. It exists because the ordinary Ohio routes may reach the same record without requiring you to establish anything about being trafficked, and finding that out first can save you the whole of the harder route.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheet before this one and know that this packet prepares no application.",
      "You have, or can get, the full docket for the incident."
    ],
    documentsToObtain: [
      "The full docket for the case, showing every charge from the incident and how each one ended.",
      "Your own Ohio criminal record from the Bureau of Criminal Identification and Investigation."
    ],
    gather: [
      "Every charge from the incident and its final disposition. Not the one charge — all of them.",
      "The date of final discharge: when the sentence, parole, fines and restitution were finished.",
      "Whether anything is still open, anywhere, including a warrant.",
      "The Revised Code section and degree for each charge."
    ],
    destination: COURT_AND_BCI,
    sequence: [
      "Ask the ordinary question first. Ohio's ordinary routes — ORC 2953.32 for a conviction, and ORC 2953.33 where a case did not end in one — do not ask you to establish anything about what happened to you. If one of them reaches this record, it may get the same result with far less exposure, and it is the first thing anybody helping you should check.",
      MULTIPLE_CHARGE_TRAP,
      COURT_COSTS_DO_NOT_DELAY,
      SB_288_CHANGED_THE_LIMITS,
      "So the order to work in is this. First, get the full docket for the incident. Second, work out the date of final discharge from it. Third, ask whether an ordinary route reaches the record on those facts. Only if the answer is no does the trafficking section become the question.",
      "None of that means the trafficking route is a worse one. It means it asks more of you, and nobody should be asked for more than the result requires.",
      NOT_A_REPORT_ON_YOUR_CASE,
      SEALING_IS_NOT_EXPUNGEMENT
    ],
    expectedNextStage:
      "You leave this sheet with the docket, a discharge date and one question to put to somebody: does an ordinary route reach this record? The referral sheet that follows is where to put it.",
    canPrepare: [
      "This screen and the order to work in.",
      "The account of the ORC 2953.61 multiple-charge trap, which is the most common way an Ohio application fails.",
      "The correction about court costs, which is the most common way people wait longer than they need to.",
      "The referral sheet that follows it in this packet."
    ],
    escalations: [
      "The docket shows charges you did not know about.",
      "You cannot work out the date of final discharge from what you have.",
      "A guide you have read tells you there is a limit on how many convictions can be cleared."
    ]
  }),

  "oh-2953-36-referral-instructions": survivorSheet({
    templateId: "oh-2953-36-referral-instructions",
    mechanismName: "Where to take an ORC 2953.36 matter, and what to take with you",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed, and no application is prepared. The route ends with a person who can act on it rather than with a document.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the two sheets before this one.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "The full docket for the incident, and your own Ohio criminal record.",
      "Anything you already hold that relates to the case — the sentencing entry, any probation paperwork, any correspondence.",
      "Nothing about what happened to you needs to be gathered for this packet. What is needed for the application itself is a conversation to have with the person you take this to."
    ],
    gather: [
      "The county, the court and the case number.",
      "Every charge from the incident, with the Revised Code section, the degree and the disposition of each.",
      "The date of final discharge.",
      "What you want: the record cleared, a specific job or licence unblocked, or an answer about what is possible at all.",
      "Any date somebody else has given you, such as an application closing date, so that it can be taken into account."
    ],
    destination: {
      name: "An Ohio legal aid office, a law school clinic that works with trafficking survivors, or an Ohio attorney who does survivor work",
      detail:
        "The application under ORC 2953.36 is made to the court by somebody acting for you. These are the places that do that work. LegalEase has not contacted any of them, does not refer you to any particular one, and does not know what any of them will say."
    },
    sequence: [
      "Take the docket, your own criminal record and the case papers. Those three are what any first conversation runs on, and having them turns a long conversation into a short one.",
      "Ask three questions in this order. First: does an ordinary Ohio route reach this record, without the trafficking section? Second: if not, which group in ORC 2953.36 does the conviction fall into, and what standard applies to it? Third: what does the application involve, and what would it cost?",
      "Ask about the multiple-charge point directly, because it is the thing most likely to defeat the application quietly: did every charge from the incident end the same way, and if not, what does ORC 2953.61 mean for it?",
      "You do not have to set out what happened to you in order to make that appointment, and nothing in this packet asks you to. What the application needs is a matter for the person who would make it.",
      NO_APPLICATION_IS_PREPARED,
      "Nothing on this route is time-limited by the section: an application under ORC 2953.36 may be made at any time. If somebody else has given you a deadline, that deadline is theirs and not the section's.",
      NOT_A_REPORT_ON_YOUR_CASE,
      DESCRIPTION_NOT_READ_AT_SOURCE
    ],
    expectedNextStage:
      "You leave this sheet with the papers gathered, three questions in order, and a destination that can act. What happens next is a conversation this packet cannot have for you.",
    canPrepare: [
      "This referral, and the list of what to take and what to ask.",
      "The account of the multiple-charge point, which is the question to raise first.",
      "The two sheets before this one, which explain the section and screen for an easier route.",
      "The disclosure sheet that follows, on what sealing and expungement actually do."
    ],
    escalations: [
      "You cannot find a clinic or a lawyer who does this work.",
      "You are asked for a fee you cannot pay and nobody has mentioned indigency.",
      "Somebody has told you the record is already cleared and you have nothing showing it."
    ]
  }),

  "oh-2953-36-scope-disclosure": survivorSheet({
    templateId: "oh-2953-36-scope-disclosure",
    mechanismName: "What sealing and expungement actually do in Ohio",
    whyNotAFiling:
      "This page explains what two words mean. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheets before this one in the packet.",
      "You want to know what you would actually be getting before you spend anything on getting it."
    ],
    documentsToObtain: [
      "Your own Ohio criminal record, so that what follows is read against the record rather than against memory."
    ],
    gather: [
      "Every application, licence or clearance you expect to be affected, and the exact wording of the question each one asks.",
      "Whether any federal, immigration or firearm question is in play, because an Ohio order does not reach federal law."
    ],
    destination: {
      name: "No destination. This sheet is an explanation rather than a step",
      detail:
        "Nothing here is sent anywhere. It is the part of the packet that says what the remedies do, so that nobody spends a year pursuing a word rather than a result."
    },
    sequence: [
      SEALING_IS_NOT_EXPUNGEMENT,
      BCI_RETENTION,
      "The practical consequence is worth stating plainly. Ask what a particular remedy would do about the particular check that is causing you the problem — a specific employer, a specific licence, a specific landlord. That is a more useful question than which of the two words is stronger.",
      "A grant under ORC 2953.36 does carry a real and specific effect: the record cannot be used for a criminal-record check, and both you and the court may reply that no record exists. That is a strong answer to most of what an ordinary background question is trying to reach.",
      "It does not follow that the record has ceased to exist anywhere, and this packet will not tell you that it has.",
      SB_288_CHANGED_THE_LIMITS,
      NOT_A_REPORT_ON_YOUR_CASE,
      DESCRIPTION_NOT_READ_AT_SOURCE
    ],
    expectedNextStage:
      "You leave this packet knowing what the section offers, whether an easier route exists, where to take it, and what the result would and would not do.",
    canPrepare: [
      "This account of what sealing and expungement do and do not reach in Ohio.",
      "The disclosure about what the Bureau of Criminal Identification and Investigation keeps.",
      "The correction about pre-2023 guidance, which is still in wide circulation."
    ],
    escalations: [
      "A specific employer or licensing body is the problem and you need to know what would actually clear it.",
      "You have been told a record was wiped out entirely and you are being asked about it anyway.",
      "A background-check report is showing something you believe was already dealt with."
    ]
  }),

  // ---- oh_2953_39_prosecutor ----------------------------------------------
  "oh-2953-39-explanation": prosecutorSheet({
    templateId: "oh-2953-39-explanation",
    mechanismName:
      "When an Ohio prosecutor can clear a low-level drug record: what ORC 2953.39 is",
    whyNotAFiling:
      "There is nothing for you to file on this section. ORC 2953.39 gives the application to the prosecuting attorney, who applies to the sentencing court to seal or expunge the record. A person cannot apply under it themselves, so no application is generated for you and none exists to generate.",
    processType: "prosecutor",
    prerequisites: [
      "The record is an Ohio conviction for a drug offence.",
      "You understand that this section belongs to the prosecutor, so nothing on it is yours to file."
    ],
    documentsToObtain: [
      "The full docket for the case from the clerk of the sentencing court, showing the Revised Code section, the degree of the offence and the date of final discharge.",
      "Your own Ohio criminal record from the Bureau of Criminal Identification and Investigation."
    ],
    gather: [
      "The exact charge: which Revised Code section was cited, and what degree the offence was.",
      "Whether the charge was a state offence or a municipal ordinance violation.",
      "The date you finished the sentence, including parole, fines and restitution.",
      "Every other charge from the same incident and how each ended.",
      "The county and the name of the prosecuting attorney's office that handled the case."
    ],
    destination: {
      name: "The prosecuting attorney for the county, who applies to the sentencing court",
      detail:
        "The application under ORC 2953.39 is the prosecutor's. It goes to the sentencing court. LegalEase generates nothing for that destination, and cannot make a prosecutor consider anything."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What the section reaches. A low-level controlled substance offence means certain Chapter 2925 violations that are misdemeanours of the fourth degree or minor misdemeanours, or a substantially equivalent municipal ordinance. That is a narrow band, and the degree on the docket is what decides it.",
      "Who applies. The prosecuting attorney, and only the prosecuting attorney. There is no application on this section that you can make yourself.",
      "When. The prosecutor may file after the waiting period that ORC 2953.32 sets for the equivalent sealing has expired. So the timing on this route is the ordinary timing, measured from final discharge.",
      COURT_COSTS_DO_NOT_DELAY,
      "Who can object. The subject person and any victim may object to the prosecutor's application. You would be the subject person, which means an application about your record is something you are entitled to be heard on rather than something that simply happens to you.",
      "Now the honest part, and it is the question most people ask first. Whether there is any way to prompt a prosecutor to consider an application, and what happens if they decline, is not settled here. The section's own text has not been read to the bottom on that point, and this packet will not invent an answer to it. Ask the prosecutor's office and ask a lawyer; do not assume either that asking is futile or that asking obliges anybody.",
      "Which is why the next sheet in this packet matters more than this one: the ordinary routes you can apply for yourself do not depend on anybody else deciding to act.",
      NO_APPLICATION_IS_PREPARED,
      SEALING_IS_NOT_EXPUNGEMENT
    ],
    expectedNextStage:
      "The next sheet screens you for the ordinary Ohio routes, which are applied for by the person themselves and are usually the better answer precisely because they do not wait on somebody else. Read it even if you intend to ask the prosecutor's office as well, because the two questions are asked of different offices and only one of the answers is within your control.",
    canPrepare: [
      "This explanation of what ORC 2953.39 is, who may use it and when.",
      "The parallel screen for the ordinary routes that follows it in this packet.",
      "The referral sheet, including what to take and what to ask.",
      "An honest account of what is not known about prompting a prosecutor."
    ],
    escalations: [
      "You want to know whether asking a prosecutor to consider this is worth doing, and what happens if they decline.",
      "You cannot tell from the docket what degree the offence was.",
      "A prosecutor has already applied and you want to be heard on it."
    ]
  }),

  "oh-2953-39-parallel-screen": prosecutorSheet({
    templateId: "oh-2953-39-parallel-screen",
    mechanismName: "The routes you can use yourself, which do not wait on a prosecutor",
    whyNotAFiling:
      "This page is a screen, not a filing. Ohio's ordinary sealing and expungement routes are applied for by the person themselves, and this sheet is about working out whether one of them reaches your record. Nothing here is generated or filed by LegalEase.",
    processType: "prosecutor",
    prerequisites: [
      "You have read the sheet before this one and know that ORC 2953.39 belongs to the prosecutor.",
      "You have, or can get, the full docket for the incident."
    ],
    documentsToObtain: [
      "The full docket for the case, showing every charge from the incident and how each one ended.",
      "Your own Ohio criminal record from the Bureau of Criminal Identification and Investigation."
    ],
    gather: [
      "Every charge from the incident and its final disposition. Not the drug charge alone — all of them.",
      "The date of final discharge: when the sentence, parole, fines and restitution were finished.",
      "Whether anything is still open, anywhere, including a warrant.",
      "The Revised Code section and degree for each charge."
    ],
    destination: COURT_AND_BCI,
    sequence: [
      "Start from the point that matters. The ordinary Ohio sealing and expungement routes are yours to apply for. They do not depend on a prosecutor deciding to act, which is the single biggest practical difference between them and ORC 2953.39.",
      "So the ordinary routes are usually the better answer even where the prosecutor route is available, and they are the only answer where it is not.",
      MULTIPLE_CHARGE_TRAP,
      COURT_COSTS_DO_NOT_DELAY,
      SB_288_CHANGED_THE_LIMITS,
      "The order to work in: get the full docket, work out the date of final discharge from it, then ask which ordinary route reaches the record on those facts and what waiting period applies to it.",
      "Nothing here stops a prosecutor applying under ORC 2953.39 as well. The two are not alternatives you have to choose between; one of them is simply within your control and the other is not.",
      NOT_A_REPORT_ON_YOUR_CASE,
      SEALING_IS_NOT_EXPUNGEMENT
    ],
    expectedNextStage:
      "You leave this sheet with the docket, a discharge date and one question to put to somebody: which ordinary route reaches this record, and when. The referral sheet that follows is where to put it.",
    canPrepare: [
      "This screen and the order to work in.",
      "The account of the ORC 2953.61 multiple-charge trap, which is the most common way an Ohio application fails.",
      "The correction about court costs, which is the most common way people wait longer than they need to.",
      "The referral sheet that follows it in this packet."
    ],
    escalations: [
      "The docket shows charges you did not know about.",
      "You cannot work out the date of final discharge from what you have.",
      "A guide you have read tells you there is a limit on how many convictions can be cleared."
    ]
  }),

  "oh-2953-39-referral-instructions": prosecutorSheet({
    templateId: "oh-2953-39-referral-instructions",
    mechanismName: "Where to take a low-level Ohio drug record, and what to take with you",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed. The section's application belongs to the prosecutor and the ordinary routes are a separate matter, so what this sheet produces is a destination rather than a document.",
    processType: "prosecutor",
    prerequisites: [
      "You have read the two sheets before this one.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "The full docket for the incident, and your own Ohio criminal record.",
      "The sentencing entry, and anything showing when the sentence, parole, fines and restitution were finished."
    ],
    gather: [
      "The county, the court and the case number.",
      "The Revised Code section and degree of the drug charge, and whether it was a municipal ordinance violation.",
      "Every other charge from the incident and its disposition.",
      "The date of final discharge.",
      "What you want: the record cleared, or an answer about what is possible at all."
    ],
    destination: {
      name: "The prosecuting attorney's office for the county, and an Ohio legal aid office, law school clinic or attorney",
      detail:
        "The prosecutor's office is where an ORC 2953.39 application would come from, so it is the office to ask about that section. Legal aid, a clinic or an attorney is where to ask about the ordinary routes you can apply for yourself. Both are worth asking; only the second is within your control. LegalEase has contacted neither."
    },
    sequence: [
      "Ask the ordinary question first, of legal aid, a clinic or an attorney: does an ordinary Ohio route reach this record, and when. That is the route you control.",
      "Then, if you want to, ask the prosecuting attorney's office about ORC 2953.39 for the same record. Put the case number, the Revised Code section, the degree and the date of final discharge in the request, and keep a copy of what you sent.",
      "Be clear with yourself about what that second question is. Whether there is any way to prompt a prosecutor to consider an application, and what follows if they decline, is not settled here, so asking may produce nothing and that would not mean you did anything wrong.",
      "Keep whatever reply you get. If a prosecutor does apply, you are the subject person and are entitled to be heard on it, and the reply is the first thing you would want in front of you.",
      "Ask about the multiple-charge point directly, because it is the thing most likely to defeat an application quietly: did every charge from the incident end the same way, and if not, what does ORC 2953.61 mean for it?",
      NO_APPLICATION_IS_PREPARED,
      NOT_A_REPORT_ON_YOUR_CASE,
      BCI_RETENTION,
      DESCRIPTION_NOT_READ_AT_SOURCE
    ],
    expectedNextStage:
      "You leave this packet with the papers gathered, two questions asked of two different offices, and a clear sense of which of the two answers is within your control.",
    canPrepare: [
      "This referral, and the list of what to take and what to ask of each office.",
      "The account of the multiple-charge point, which is the question to raise first.",
      "The two sheets before this one, which explain the section and screen for the routes you can use yourself.",
      "An honest account of what is not known about prompting a prosecutor."
    ],
    escalations: [
      "The prosecutor's office will not say whether it will consider an application.",
      "A prosecutor has applied and you or a victim want to object.",
      "You cannot find anyone to advise you on the ordinary routes."
    ]
  }),

  // ---- oh_2953_521_trafficking_nonconviction -------------------------------
  "oh-2953-521-detection-and-naming": survivorSheet({
    templateId: "oh-2953-521-detection-and-naming",
    mechanismName:
      "Clearing an Ohio case that came out of being trafficked and did not end in a conviction: what ORC 2953.521 is",
    whyNotAFiling:
      "LegalEase generates no application on this route. ORC 2953.521 lets a survivor apply to expunge a non-conviction record, but the application turns on establishing that the case resulted from being trafficked, in a proceeding where the prosecutor may object and the court weighs the governmental interest. That is advocacy about what happened to you rather than form-filling, so this packet names the section, explains what it offers and what it asks for, and tells you where to take it.",
    processType: "court_adjacent",
    prerequisites: [
      "The record is an Ohio case that ended in a finding of not guilty, or in a dismissed complaint, indictment or information.",
      "You are willing to have the connection between the case and what happened to you looked at by somebody who can act on it. You do not have to write any of that down here.",
      "You understand before you read further that this packet prepares no application."
    ],
    documentsToObtain: [
      "The full docket for the case from the clerk of the court that handled it, showing every charge from the incident and how each one ended, and — this matters here — whether a dismissal was with or without prejudice.",
      "Your own Ohio criminal record from the Bureau of Criminal Identification and Investigation."
    ],
    gather: [
      "How the case ended: a finding of not guilty, or a dismissal, and the date it was entered.",
      "Whether a dismissal was with prejudice or without it, if the docket says.",
      "Every other charge that came out of the same incident, and how each of those ended.",
      "The county, the court and the case number.",
      "Nothing about what happened to you. That belongs to the person you take this to, not to a form."
    ],
    destination: {
      name: "The Ohio court that handled the case, reached through a clinic or a lawyer rather than through this packet",
      detail:
        "An application under ORC 2953.521 goes to the court where the case was tried or dismissed. LegalEase prepares nothing for that destination. It identifies the route, names the section, sets out what the section offers and requires, and refers."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What the section covers. ORC 2953.521 reaches a person found not guilty, or named in a complaint, indictment or information that was dismissed, where the case resulted from the person being a victim of human trafficking.",
      "What has to be shown. The standard on the trafficking connection is a preponderance of the evidence, which is lower than the clear and convincing standard the conviction section applies to its wider category.",
      "What else the court looks at, and this is the part people are not told. It checks whether a dismissal was with or without prejudice and whether the limitations period has expired, it checks for pending proceedings, it considers any objection from the prosecutor, and it weighs the governmental interest in keeping the record against your interest in having it cleared.",
      "The timing. The application may be made at any time after the not-guilty finding or the dismissal is entered. There is no waiting period on this section.",
      "Why this packet stops here. Even on the lower standard, establishing the connection in a proceeding where the prosecutor may object is advocacy. The next sheets screen for a route that may not require any of that, and then tell you where to go.",
      NO_APPLICATION_IS_PREPARED,
      SEALING_IS_NOT_EXPUNGEMENT
    ],
    expectedNextStage:
      "The next sheet in this packet asks the question that matters most on a dismissed case: whether the ordinary Ohio non-conviction route reaches it without you having to establish anything at all.",
    canPrepare: [
      "This explanation of what ORC 2953.521 covers, what it asks for and what else the court weighs.",
      "The alternative-route screen that follows it in this packet.",
      "The referral sheet, including what to take and what to ask.",
      "The disclosure of what sealing and expungement actually do in Ohio."
    ],
    escalations: [
      "You want the application itself prepared and argued.",
      "The docket does not say whether a dismissal was with or without prejudice.",
      "You have more than one case you want dealt with."
    ]
  }),

  "oh-2953-521-alternative-route-screen": survivorSheet({
    templateId: "oh-2953-521-alternative-route-screen",
    mechanismName: "The route that asks you to prove nothing, and why to check it first",
    whyNotAFiling:
      "This page is a screen, not a filing. A case that was dismissed or ended in a finding of not guilty may be reached by the ordinary ORC 2953.33 route, which requires no trafficking proof at all. Finding that out first can save you the whole of the harder route.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheet before this one and know that this packet prepares no application.",
      "You have, or can get, the full docket for the incident."
    ],
    documentsToObtain: [
      "The full docket for the case, showing every charge from the incident, how each one ended, and whether any dismissal was with or without prejudice.",
      "Your own Ohio criminal record from the Bureau of Criminal Identification and Investigation."
    ],
    gather: [
      "Every charge from the incident and its final disposition. Not the one charge — all of them.",
      "The date the not-guilty finding or the dismissal was entered.",
      "Whether anything is still open, anywhere, including a warrant.",
      "The Revised Code section for each charge."
    ],
    destination: COURT_AND_BCI,
    sequence: [
      "This is the most important sheet in the packet, so it says the point first. A case that was dismissed, or that ended in a finding of not guilty, may be reached by the ordinary ORC 2953.33 route — and that route asks you to prove nothing whatever about what happened to you.",
      "So it is worth checking before anything else. It may reach the same result with far less exposure, and it does not put you in a proceeding where you have to establish that you were trafficked.",
      MULTIPLE_CHARGE_TRAP,
      COURT_COSTS_DO_NOT_DELAY,
      SB_288_CHANGED_THE_LIMITS,
      "The order to work in: get the full docket for the incident, note how each charge ended and whether any dismissal was with or without prejudice, then ask whether the ordinary non-conviction route reaches the record on those facts. Only if the answer is no does ORC 2953.521 become the question.",
      "None of that means the trafficking section is a worse route. It means it asks more of you, and nobody should be asked for more than the result requires.",
      NOT_A_REPORT_ON_YOUR_CASE,
      SEALING_IS_NOT_EXPUNGEMENT
    ],
    expectedNextStage:
      "You leave this sheet with the docket and one question to put to somebody: does the ordinary non-conviction route reach this record? The referral sheet that follows is where to put it.",
    canPrepare: [
      "This screen and the order to work in.",
      "The account of the ORC 2953.61 multiple-charge trap, which is the most common way an Ohio application fails.",
      "The correction about court costs, which is the most common way people wait longer than they need to.",
      "The referral sheet that follows it in this packet."
    ],
    escalations: [
      "The docket shows charges you did not know about.",
      "You cannot tell whether the dismissal was with or without prejudice.",
      "A guide you have read tells you there is a limit on how many records can be cleared."
    ]
  }),

  "oh-2953-521-referral-instructions": survivorSheet({
    templateId: "oh-2953-521-referral-instructions",
    mechanismName: "Where to take an ORC 2953.521 matter, and what to take with you",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed, and no application is prepared. The route ends with a person who can act on it rather than with a document.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the two sheets before this one.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "The full docket for the incident, and your own Ohio criminal record.",
      "Anything you already hold that relates to the case, including any dismissal entry.",
      "Nothing about what happened to you needs to be gathered for this packet. What is needed for the application itself is a conversation to have with the person you take this to."
    ],
    gather: [
      "The county, the court and the case number.",
      "Every charge from the incident, with the Revised Code section and the disposition of each.",
      "The date the not-guilty finding or the dismissal was entered, and whether a dismissal was with or without prejudice.",
      "What you want: the record cleared, a specific job or licence unblocked, or an answer about what is possible at all.",
      "Any date somebody else has given you, such as an application closing date, so that it can be taken into account."
    ],
    destination: {
      name: "An Ohio legal aid office, a law school clinic that works with trafficking survivors, or an Ohio attorney who does survivor work",
      detail:
        "The application under ORC 2953.521 is made to the court by somebody acting for you. These are the places that do that work. LegalEase has not contacted any of them, does not refer you to any particular one, and does not know what any of them will say."
    },
    sequence: [
      "Take the docket, your own criminal record and the case papers. Those three are what any first conversation runs on.",
      "Ask three questions in this order. First: does the ordinary ORC 2953.33 route reach this record, without the trafficking section? Second: if not, what does an ORC 2953.521 application involve here? Third: what does the court's weighing of the governmental interest tend to mean in this county?",
      "Ask about the dismissal itself, because the section's own checks turn on it: was it with or without prejudice, and has the limitations period expired?",
      "Ask about the multiple-charge point directly, because it is the thing most likely to defeat the application quietly: did every charge from the incident end the same way, and if not, what does ORC 2953.61 mean for it?",
      "You do not have to set out what happened to you in order to make that appointment, and nothing in this packet asks you to.",
      NO_APPLICATION_IS_PREPARED,
      "Nothing on this route is time-limited by the section: an application may be made at any time after the finding or the dismissal is entered. If somebody else has given you a deadline, that deadline is theirs and not the section's.",
      NOT_A_REPORT_ON_YOUR_CASE,
      DESCRIPTION_NOT_READ_AT_SOURCE
    ],
    expectedNextStage:
      "You leave this sheet with the papers gathered, four questions in order, and a destination that can act. What happens next is a conversation this packet cannot have for you.",
    canPrepare: [
      "This referral, and the list of what to take and what to ask.",
      "The account of the dismissal and multiple-charge points, which are the questions to raise first.",
      "The two sheets before this one, which explain the section and screen for an easier route.",
      "The disclosure sheet that follows, on what sealing and expungement actually do."
    ],
    escalations: [
      "You cannot find a clinic or a lawyer who does this work.",
      "You are asked for a fee you cannot pay and nobody has mentioned indigency.",
      "Somebody has told you the record is already cleared and you have nothing showing it."
    ]
  }),

  "oh-2953-521-scope-disclosure": survivorSheet({
    templateId: "oh-2953-521-scope-disclosure",
    mechanismName: "What clearing a non-conviction record actually does in Ohio",
    whyNotAFiling:
      "This page explains what two words mean. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheets before this one in the packet.",
      "You want to know what you would actually be getting before you spend anything on getting it."
    ],
    documentsToObtain: [
      "Your own Ohio criminal record, so that what follows is read against the record rather than against memory."
    ],
    gather: [
      "Every application, licence or clearance you expect to be affected, and the exact wording of the question each one asks.",
      "Whether any federal, immigration or firearm question is in play, because an Ohio order does not reach federal law."
    ],
    destination: {
      name: "No destination. This sheet is an explanation rather than a step",
      detail:
        "Nothing here is sent anywhere. It is the part of the packet that says what the remedies do, so that nobody spends a year pursuing a word rather than a result."
    },
    sequence: [
      SEALING_IS_NOT_EXPUNGEMENT,
      BCI_RETENTION,
      "That carve-out is written around a conviction expungement, and this route is about a case that did not end in a conviction. Whether and how it bears on a non-conviction record is a question for the person you take this to; this sheet states the disclosure rather than deciding its edges.",
      "The practical consequence is worth stating plainly. Ask what a particular remedy would do about the particular check that is causing you the problem — a specific employer, a specific licence, a specific landlord. That is a more useful question than which of the two words is stronger.",
      "It is worth knowing that a dismissed case or a finding of not guilty can go on showing up until something is done about it. That is exactly why the route exists, and it is not a sign that anything has gone wrong.",
      SB_288_CHANGED_THE_LIMITS,
      NOT_A_REPORT_ON_YOUR_CASE,
      DESCRIPTION_NOT_READ_AT_SOURCE
    ],
    expectedNextStage:
      "You leave this packet knowing what the section offers, whether an easier route exists, where to take it, and what the result would and would not do.",
    canPrepare: [
      "This account of what sealing and expungement do and do not reach in Ohio.",
      "The disclosure about what the Bureau of Criminal Identification and Investigation keeps.",
      "The correction about pre-2023 guidance, which is still in wide circulation."
    ],
    escalations: [
      "A specific employer or licensing body is the problem and you need to know what would actually clear it.",
      "You have been told a record was wiped out entirely and you are being asked about it anyway.",
      "A background-check report is showing a case that never ended in a conviction."
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
      if (!OHIO_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Ohio guidance template ${component.templateId} is registered.`
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
 * Asked on every Ohio route in this family, in this order.
 *
 * The last five are the design's own stop conditions, recorded identically on
 * all three assigned tracks: immigration exposure, the ORC 2953.61
 * multiple-charge trap, pending proceedings or open warrants, the choice
 * between sealing and expungement, and an objection by the prosecutor or a
 * victim. Each is asked before the route's own questions, because each one
 * decides whether the route is worth reading at all.
 */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want advice about whether your particular record qualifies?",
    required: true
  },
  {
    key: "recordJurisdiction",
    label: "Is the record from Ohio, another state, the federal courts, a tribal court, or a military court?",
    required: true
  },
  {
    key: "immigrationQuestion",
    label:
      "Could your immigration status be affected by this — for example, are you not a United States citizen?",
    required: true
  },
  {
    key: "chargesFromTheSameIncidentEndedDifferently",
    label:
      "Did more than one charge come out of the same incident, and did any of them end differently from the others?",
    required: true
  },
  {
    key: "pendingProceedingsOrWarrants",
    label: "Is any criminal case still open against you anywhere, or is there a warrant out?",
    required: true
  },
  {
    key: "wantsSealingVersusExpungementAdvice",
    label: "Do you want us to tell you whether to ask for sealing or for expungement?",
    required: true
  },
  {
    key: "prosecutorOrVictimObjection",
    label: "Has a prosecutor or a victim objected, or told you they will?",
    required: true
  }
];

/** The two survivor routes ask the same three questions the design records. */
const SURVIVOR_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsApplicationPrepared",
    label: "Do you want LegalEase to prepare the application under this section?",
    required: true
  },
  {
    key: "caseDisposition",
    label:
      "How did the case end — a conviction, a finding of not guilty, a dismissal, or is it still going on?",
    required: true
  },
  {
    key: "checkOrdinaryRouteFirst",
    label:
      "Would you like us to check first whether the ordinary route clears this record, without you having to prove anything about what happened to you?",
    required: true
  },
  {
    key: "wantsSurvivorOrganisationDetails",
    label: "Would you like the details of organisations that help survivors with this?",
    required: false
  },
  { key: "caseCounty", label: "In which Ohio county was the case heard?", required: true },
  { key: "caseNumber", label: "What is the case number?", required: false }
];

function ohioTrack(input: {
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
    jurisdiction: "OH",
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

export const OHIO_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  ohioTrack({
    trackId: "oh_2953_36_trafficking",
    publicName: "Clearing an Ohio conviction that came from being trafficked",
    mechanism: "referral_for_expungement_of_a_human_trafficking_survivor_conviction",
    authority: "Ohio Rev. Code §§ 2953.36, 2953.33 and 2953.61",
    recordTypes: ["conviction", "charge", "court_record"],
    dispositions: ["convicted"],
    components: [
      {
        componentId: "oh_2953_36_trafficking-detection-and-naming-1",
        templateId: "oh-2953-36-detection-and-naming"
      },
      {
        componentId: "oh_2953_36_trafficking-alternative-route-screen-2",
        templateId: "oh-2953-36-alternative-route-screen"
      },
      {
        componentId: "oh_2953_36_trafficking-referral-instructions-3",
        templateId: "oh-2953-36-referral-instructions"
      },
      {
        componentId: "oh_2953_36_trafficking-scope-disclosure-4",
        templateId: "oh-2953-36-scope-disclosure"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      ...SURVIVOR_INPUTS,
      {
        key: "excludedOffence",
        label:
          "Was the conviction for aggravated murder, murder or rape under ORC 2903.01, 2903.02 or 2907.02?",
        required: true
      },
      {
        key: "offenceSectionAndDegree",
        label: "Which Revised Code section was cited, and what degree was the offence?",
        required: true
      },
      {
        key: "finalDischargeDate",
        label: "When did you finish the sentence, including parole, fines and restitution?",
        required: true
      }
    ],
    assembledPacketName: "ohio-trafficking-survivor-conviction-referral",
    assembledPacketTitle: "Ohio ORC 2953.36 — a conviction that came out of being trafficked",
    customerDeliverableDescription:
      "Identifies an Ohio conviction that may fall within the human-trafficking survivor expungement section, explains what ORC 2953.36 covers, the two different standards of proof it applies and what it excludes, screens first for an ordinary route that requires no trafficking proof at all, refers the participant to survivor legal help with the papers gathered, and discloses what sealing and expungement actually do in Ohio. No application is prepared and nothing is filed.",
    notes:
      "Process guidance only, and a referral rather than a filing route. The application requires proving trafficking victimisation to an evidentiary standard where the prosecutor may object; never generate one. The statutory text was not read at source, and every sheet says so to the participant."
  }),

  ohioTrack({
    trackId: "oh_2953_39_prosecutor",
    publicName: "When an Ohio prosecutor can clear a low-level drug record for you",
    mechanism: "prosecutor_initiated_sealing_or_expungement_of_a_low_level_controlled_substance_offence",
    authority: "Ohio Rev. Code §§ 2953.39 and 2953.32, and Ohio Rev. Code ch. 2925",
    recordTypes: ["conviction", "court_record"],
    dispositions: ["convicted"],
    components: [
      {
        componentId: "oh_2953_39_prosecutor-explanation-1",
        templateId: "oh-2953-39-explanation"
      },
      {
        componentId: "oh_2953_39_prosecutor-parallel-screen-2",
        templateId: "oh-2953-39-parallel-screen"
      },
      {
        componentId: "oh_2953_39_prosecutor-referral-instructions-3",
        templateId: "oh-2953-39-referral-instructions"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "wantsToApplyUnderThisSection",
        label: "Do you want to apply under ORC 2953.39 yourself?",
        required: true
      },
      {
        key: "lowLevelControlledSubstanceOffence",
        label:
          "What was the drug charge — a Chapter 2925 violation that was a fourth degree misdemeanour, a Chapter 2925 minor misdemeanour, an equivalent municipal ordinance, or something else?",
        required: true
      },
      {
        key: "offenceSectionAndDegree",
        label: "Which Revised Code section was cited, and what degree was the offence?",
        required: true
      },
      {
        key: "finalDischargeDate",
        label: "When did you finish the sentence, including fines and restitution?",
        required: true
      },
      {
        key: "correspondingWaitingPeriodHasRun",
        label:
          "Has the ORC 2953.32 waiting period for the equivalent sealing passed since your final discharge?",
        required: true
      },
      {
        key: "wantsOwnApplicationChecked",
        label:
          "Would you like us to check whether you can apply to seal or expunge this yourself, rather than waiting for a prosecutor?",
        required: true
      },
      { key: "caseCounty", label: "In which Ohio county was the case heard?", required: true },
      { key: "caseNumber", label: "What is the case number?", required: false }
    ],
    assembledPacketName: "ohio-prosecutor-initiated-drug-record-referral",
    assembledPacketTitle: "Ohio ORC 2953.39 — when a prosecutor can clear a low-level drug record",
    customerDeliverableDescription:
      "Explains that ORC 2953.39 gives the application to the prosecuting attorney rather than to the person, sets out which narrow band of Chapter 2925 offences it reaches and when a prosecutor may file, states plainly that whether a person can prompt a prosecutor is unresolved, screens the participant in parallel for the ordinary routes they can apply for themselves, and names both offices to ask. Nothing is filed by the participant and no application is prepared.",
    notes:
      "Process guidance only. Only the prosecutor may apply under the section; never generate a participant application. Whether a person can prompt a prosecutor to consider one, and what happens if the prosecutor declines, is a preserved release blocker and is stated as unresolved on the sheet."
  }),

  ohioTrack({
    trackId: "oh_2953_521_trafficking_nonconviction",
    publicName: "Clearing an Ohio case that came from being trafficked and did not end in conviction",
    mechanism: "referral_for_expungement_of_a_human_trafficking_survivor_non_conviction_record",
    authority: "Ohio Rev. Code §§ 2953.521, 2953.33 and 2953.61",
    recordTypes: ["conviction", "charge", "court_record"],
    dispositions: ["not_guilty", "dismissed"],
    components: [
      {
        componentId: "oh_2953_521_trafficking_nonconviction-detection-and-naming-1",
        templateId: "oh-2953-521-detection-and-naming"
      },
      {
        componentId: "oh_2953_521_trafficking_nonconviction-alternative-route-screen-2",
        templateId: "oh-2953-521-alternative-route-screen"
      },
      {
        componentId: "oh_2953_521_trafficking_nonconviction-referral-instructions-3",
        templateId: "oh-2953-521-referral-instructions"
      },
      {
        componentId: "oh_2953_521_trafficking_nonconviction-scope-disclosure-4",
        templateId: "oh-2953-521-scope-disclosure"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      ...SURVIVOR_INPUTS,
      {
        key: "dismissalWithPrejudice",
        label:
          "If the case was dismissed, does the docket say whether it was with prejudice or without it?",
        required: false
      },
      {
        key: "dispositionEntryDate",
        label: "On what date was the not-guilty finding or the dismissal entered?",
        required: true
      }
    ],
    assembledPacketName: "ohio-trafficking-survivor-non-conviction-referral",
    assembledPacketTitle: "Ohio ORC 2953.521 — a case that came out of being trafficked and did not end in conviction",
    customerDeliverableDescription:
      "Identifies an Ohio non-conviction record that may fall within the human-trafficking survivor expungement section, explains what ORC 2953.521 covers, the preponderance standard and the further things the court weighs including prejudice, limitations and the governmental interest, screens first for the ordinary ORC 2953.33 route that requires no trafficking proof at all, refers the participant to survivor legal help with the papers gathered, and discloses what sealing and expungement actually do in Ohio. No application is prepared and nothing is filed.",
    notes:
      "Process guidance only, and a referral rather than a filing route. Even on the preponderance standard the application is contested advocacy; never generate one. The statutory text was not read at source, and every sheet says so to the participant."
  })
];
