// New York process guidance — four routes, none of which the participant files
// anything on.
//
// New York seals. It does not expunge, and the one exception — the marijuana
// destruction remedy — is a composed route owned by another job and is not
// touched here. Every sheet in this family says so, because a participant who
// reads "sealed" as "gone" has been misled by the word rather than by anything
// CPL § 160.50 or § 160.57 says.
//
// Four assigned tracks, all `process_guidance` in the adopted design:
//
//   - `ny_160_50_nonconviction` is relief by direction of the court. Where a
//     criminal action terminates in the defendant's favour — a dismissal, an
//     acquittal, a declination to prosecute, an adjournment in contemplation of
//     dismissal that is then dismissed, or a vacated conviction — the record is
//     sealed by direction of the court at disposition. No waiting period, no
//     application, nothing to file.
//   - `ny_clean_slate_convictions` is relief by operation of statute and by
//     another body's act. Under CPL § 160.57(1)(b) an eligible misdemeanour
//     seals three years after release from incarceration, or after imposition
//     of sentence where there was none, and an eligible felony at eight years
//     on the same measure. The design records the point in terms: nothing is
//     filed and *nothing can be filed*, because the section carries no petition
//     mechanism for the ordinary case. The Unified Court System must seal
//     eligible convictions no later than 16 November 2027, and until then the
//     back catalogue is still being worked through.
//   - `ny_clean_slate_dwai` is the same mechanism on its own paragraph. CPL
//     § 160.57(1)(a) provides that a conviction under VTL § 1192(1) shall be
//     sealed after three years. The track exists so that a participant with a
//     DWAI is routed correctly rather than told Clean Slate does not reach
//     traffic matters — but the design forbids any eligibility statement on it
//     until two release blockers close, and no sheet here makes one.
//   - `ny_clean_slate_manual_review` is routing and an honest account of a
//     procedure that does not yet exist. Where a record should have sealed and
//     has not, New York Courts states the form for requesting court review will
//     be published no later than 16 November 2027. As of the design's reading
//     there is no published form and no published procedure, so the deliverable
//     is what should have happened, how to verify it, and a referral.
//
// The design's first instruction, on all four tracks: never tell a participant
// their record is already sealed. Tell them what should have happened and how
// to verify it through a DCJS Record Review. That rule shapes every sheet here
// and the committed verifier holds it.
//
// Five things the design preserves, which no sheet here resolves:
//
//   - The full text of CPL § 160.50 was not read at source, including the
//     prosecutor's ability to move to keep a record unsealed in the interests
//     of justice.
//   - Whether a vacated conviction seals automatically or needs a court
//     direction, and what the remedy is where sealing did not occur.
//   - Assembly Bill A10951, which would broaden the supervision prohibitor and
//     add same-docket conditions. As of the design's reading it sits in the
//     Assembly Codes Committee, referred on 14 April 2026, and is **not
//     enacted**. It is a standing monitor, and enactment would narrow
//     eligibility for people screened as eligible today.
//   - Whether CPL § 160.57 carries a life-sentence exclusion. Counsel recorded
//     one; the section as read did not surface it. The screen excludes life
//     sentences because that is what counsel recorded, and the point is
//     returned for confirmation rather than decided against counsel here.
//   - On the DWAI paragraph: whether the paragraph (b) conditions reach it at
//     all, what event starts its three years, and how it interacts with the
//     CPL § 160.55 traffic-infraction sealing.
//
// No conditional component and no fact placeholder appears anywhere in this
// family: the adopted packet sets make all eighteen components required, and no
// template interpolates a participant answer. A second fixture on the same
// track would therefore render byte-for-byte the same packet, so this job adds
// no regression variant. The branches that matter are typed stops, and every
// one is exercised as a negative case by the committed verifier.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. New York
// is not an enabled jurisdiction and this job does not enable one. The MRTA
// marijuana destruction route is a composed track owned by another job, and
// nothing here prepares any part of it.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** New York legal help, named once so no stop is a dead end. */
const NY_LEGAL_HELP =
  "a New York legal aid or public defender office, a New York law school clinic, the lawyer referral service run by your county or city bar association, or a New York attorney";

/** Said on every route in this family. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes what the law does. It does not tell you what has happened in your case, and LegalEase has not looked. Nothing here is a decision about whether your record qualifies.";

/**
 * The design's first packet instruction, on all four tracks.
 *
 * "Never tell a participant their record is already sealed. Tell them what
 * should have happened and how to verify."
 */
const NEVER_ASSUME_IT_IS_SEALED =
  "Nothing on this page tells you the state of your own record. Sealing is something you confirm, not something you assume, and the only way to confirm it is to run a Record Review with the New York State Division of Criminal Justice Services and read what it says. Until you have done that, treat the position as unknown.";

/** New York seals; it does not expunge. On every sheet. */
const NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE =
  "New York seals records; it does not erase them. Sealing means the record stops being visible to most people who look — employers, housing providers and other non-law-enforcement entities running an ordinary background check — and that a person may generally answer that they have no criminal record. The file itself continues to exist, and the list of people and bodies who can still reach it is not a short one.";

/** The enumerated access exceptions. Required on every effect description. */
const WHO_CAN_STILL_SEE_A_SEALED_RECORD =
  "A sealed New York record remains reachable by law enforcement, prosecutors and the courts in a new criminal case; by entities permitted or required to run fingerprint-based background checks for work with children, the elderly and people with disabilities; by entities that are mandated by law to consider sealed records; by the New York State Education Department for hiring, discipline and licensing; by private transportation network companies; by police and peace officer employers; and for firearms licensing.";

/** The two limits people are most often not told about. */
const PREDICATE_AND_FEDERAL_LIMITS =
  "Two limits beyond that list. A sealed conviction still counts as a predicate for sentence enhancement if there is a later case. And New York sealing reaches New York State records only: federal and immigration authorities may still reach a sealed record, and a conviction from another state or from a federal court is untouched by any of this.";

/** How the participant verifies. Step one on every New York route. */
const DCJS_RECORD_REVIEW =
  "The fingerprint-based Record Review from the New York State Division of Criminal Justice Services is step one on every New York route. It confirms the dispositions, fixes the dates the waiting periods run from, and is where sealing would show. It carries its own fee, which is charged by that agency and not by LegalEase.";

/** Nothing on any of these four routes is a document the participant files. */
const NOTHING_IS_FILED_ON_THIS_ROUTE =
  "There is no petition, motion or application on this route for you to file, and LegalEase does not generate one. Where the step belongs to a court or an agency and it has not been taken, the answer is to verify, to ask, and then to get advice — not to file something the law does not provide for.";

/** The implementation deadline, stated as the system's and not the person's. */
const IMPLEMENTATION_DEADLINE =
  "One date to hold on to, and it is the court system's deadline rather than yours: the Unified Court System must seal eligible convictions no later than 16 November 2027. Until then the back catalogue is still being worked through, and a record that has not sealed yet is not necessarily a record that will not.";

const NY_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal or unseal anything, and cannot make a court, a clerk, a prosecutor, the Office of Court Administration or the Division of Criminal Justice Services act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been sealed. Only your own Record Review from the Division of Criminal Justice Services shows that, and you are the one who reads it.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

const NY_SEALING_SOURCES: readonly string[] = [
  "N.Y. Crim. Proc. Law § 160.50, sealing of records where a criminal action terminates in favour of the accused, at the New York State Senate published statutes.",
  "N.Y. Crim. Proc. Law § 160.57, automatic sealing of certain convictions, read at the New York State Senate published-statutes channel on 6 August 2026.",
  "New York State's Clean Slate Act, New York Courts criminal history record search pages, at nycourts.gov, retrieved 6 August 2026.",
  "L.2023 ch.631, the Clean Slate Act, in force 16 November 2024."
];

const NY_CLEAN_SLATE_SOURCES: readonly string[] = [
  "N.Y. Crim. Proc. Law § 160.57, automatic sealing of certain convictions, read at the New York State Senate published-statutes channel on 6 August 2026.",
  "N.Y. Correct. Law § 168-a, definitions of sex offence and sexually violent offence, at the New York State Senate published statutes.",
  "N.Y. Penal Law article 220, controlled substance offences, at the New York State Senate published statutes.",
  "New York State's Clean Slate Act, New York Courts criminal history record search pages, at nycourts.gov, retrieved 6 August 2026.",
  "L.2023 ch.631, the Clean Slate Act, in force 16 November 2024."
];

const NY_DWAI_SOURCES: readonly string[] = [
  "N.Y. Crim. Proc. Law § 160.57(1)(a), read at the New York State Senate published-statutes channel on 6 August 2026.",
  "N.Y. Veh. & Traf. Law § 1192, operating a motor vehicle while under the influence, at the New York State Senate published statutes.",
  "N.Y. Crim. Proc. Law § 160.55, sealing of records of a traffic infraction, at the New York State Senate published statutes.",
  "New York State's Clean Slate Act, New York Courts criminal history record search pages, at nycourts.gov, retrieved 6 August 2026."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class NewYorkGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NewYorkGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different New York route. */
export class NewYorkRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NewYorkRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class NewYorkBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "NewYorkBranchError";
  }
}

export const NY_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Only a New York record is reached by any of these four routes. */
export const NY_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  new_york: true,
  another_state: false,
  federal: false,
  tribal: false,
  military: false
};

/** How a CPL § 160.50 case ended. */
export const NY_FAVOURABLE_TERMINATIONS: Readonly<Record<string, string>> = {
  dismissed: "favourable",
  acquitted: "favourable",
  declined_to_prosecute: "favourable",
  acd_dismissed: "favourable",
  conviction_vacated: "favourable_but_unresolved",
  acd_pending: "not_yet",
  convicted: "conviction"
};

/** Where the case is still showing, which decides which problem it is. */
export const NY_STILL_APPEARING: Readonly<Record<string, string>> = {
  no: "clear",
  yes_official_record: "official",
  yes_private_vendor: "vendor"
};

/**
 * The Clean Slate offence classes.
 *
 * Both class A values stop. The design's stop condition is "any class A felony,
 * pending the Penal Law article 220 determination" — so the article 220
 * carve-back is described in the copy as what the section says, and is not
 * applied by this module as an eligibility answer.
 */
export const NY_OFFENCE_CLASSES: Readonly<Record<string, string>> = {
  misdemeanor: "within",
  felony_below_class_a: "within",
  class_a_felony: "class_a",
  class_a_felony_article_220: "class_a",
  not_known_from_the_record: "unknown"
};

/** Which VTL § 1192 subdivision the conviction was under. */
export const NY_DWAI_SUBDIVISIONS: Readonly<Record<string, string>> = {
  subdivision_one: "within",
  another_subdivision: "outside",
  not_sure: "unresolvable_from_recollection"
};

/** Whether the Clean Slate conditions were actually checked. */
export const NY_ELIGIBILITY_CONFIRMED: Readonly<Record<string, string>> = {
  yes: "checked_and_met",
  no: "a_condition_is_not_met",
  not_checked: "not_checked"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new NewYorkBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualised legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

const OUT_OF_JURISDICTION_STOP =
  "New York sealing reaches New York State records only. It does not reach a federal, tribal, military or out-of-state record, and none of these four New York routes touches one.";

const IMMIGRATION_STOP =
  "Sealing does not remove immigration consequences, and a sealed New York record remains reachable by immigration authorities. That is true on every route here, and getting it wrong is not a mistake that can be undone afterwards.";

const FIREARMS_STOP =
  "Firearms licensing is one of the enumerated purposes for which a sealed New York record can still be seen. Nothing on these routes changes that, and whether a particular person may hold a licence is a question these pages do not answer.";

/**
 * Validates participant answers and routes to the correct New York node.
 *
 * The order is the design's: the eligibility-advice boundary first, because no
 * sheet here decides eligibility; then record jurisdiction, which every one of
 * the four tracks lists as a stop condition; then immigration exposure and
 * firearms licensing, which the design records identically on all four. Then
 * the route's own questions.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveNewYorkGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Nobody is served an eligibility opinion by a guidance sheet.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", NY_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new NewYorkGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      NY_LEGAL_HELP,
      "Take your Record Review from the Division of Criminal Justice Services and the court papers to one of them and ask about your own record."
    );
  }

  // Gate 2. Record jurisdiction, a stop condition on all four tracks.
  const jurisdiction = branch(trackId, "recordJurisdiction", NY_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (!jurisdiction.resolved) {
    throw new NewYorkRouteMismatchError(
      trackId,
      "record_is_not_a_new_york_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal, tribal or military authority that holds the record",
      "Take the record to that authority and ask what its own law provides. If you also hold New York records, those are handled separately and only those are served here."
    );
  }

  // Gate 3. Immigration exposure, a stop condition on all four tracks.
  const immigration = branch(trackId, "immigrationQuestion", NY_YES_NO, facts.immigrationQuestion);
  if (immigration.resolved) {
    throw new NewYorkGuidanceStopError(
      trackId,
      "immigration_consequences_in_play",
      IMMIGRATION_STOP,
      "an immigration attorney",
      "Speak to an immigration attorney about the record before you rely on sealing for anything."
    );
  }

  // Gate 4. Firearms licensing, a stop condition on all four tracks.
  const firearms = branch(trackId, "firearmsLicensingGoal", NY_YES_NO, facts.firearmsLicensingGoal);
  if (firearms.resolved) {
    throw new NewYorkGuidanceStopError(
      trackId,
      "firearms_licensing_goal",
      FIREARMS_STOP,
      NY_LEGAL_HELP + ", asking specifically about licensing rather than about the record",
      "Ask that question directly of somebody who does licensing work, and do not treat a sealing route as an answer to it."
    );
  }

  if (trackId === "ny_160_50_nonconviction") {
    const disposition = branch(
      trackId,
      "dispositionType",
      NY_FAVOURABLE_TERMINATIONS,
      facts.dispositionType
    );
    if (disposition.resolved === "not_yet") {
      throw new NewYorkGuidanceStopError(
        trackId,
        "adjournment_in_contemplation_of_dismissal_has_not_been_dismissed",
        "An adjournment in contemplation of dismissal is not a favourable termination until the period runs and the case is actually dismissed. Until then there is no sealing to verify, and the case is still live in a way that makes anything else premature.",
        "the attorney representing you in the adjourned case, and otherwise the clerk of the court that adjourned it",
        "Find out the date the adjournment period ends and what has to happen in the meantime. Come back to this route once the case has been dismissed."
      );
    }
    if (disposition.resolved === "conviction") {
      throw new NewYorkRouteMismatchError(
        trackId,
        "the_case_ended_in_a_conviction",
        "CPL § 160.50 is about a case that ended in the defendant's favour. A conviction is not within it, and what reaches a conviction in New York is the Clean Slate sealing under CPL § 160.57 instead.",
        "the New York Clean Slate route for convictions under CPL § 160.57",
        "Go back to the New York intake and answer the questions for a conviction, taking the disposition from the court record rather than from memory."
      );
    }
    derived.favourableTerminationBranch = disposition.value;
    derived.vacaturSealingIsUnresolved = disposition.resolved === "favourable_but_unresolved";

    const stillAppearing = branch(trackId, "stillAppearing", NY_STILL_APPEARING, facts.stillAppearing);
    if (stillAppearing.resolved === "official") {
      throw new NewYorkGuidanceStopError(
        trackId,
        "record_still_appears_on_an_official_record_after_a_favourable_termination",
        "The case ended in your favour and it is still showing on an official record. What the remedy is where sealing did not occur is unresolved: no settled answer to it was found, and the full text of CPL § 160.50 — including the prosecutor's ability to move to keep a record unsealed in the interests of justice — was not read at source. So nobody should tell you either that this is normal or that a particular application will fix it.",
        "the clerk of the court that disposed of the case, and then " + NY_LEGAL_HELP,
        "Ask the clerk in writing what the court's record shows and whether a sealing direction was entered, keep the reply with a dated copy of your Record Review, and take that pair to a lawyer. Do not file a petition on this route: none is established, and this packet does not prepare one."
      );
    }
    if (stillAppearing.resolved === "vendor") {
      throw new NewYorkGuidanceStopError(
        trackId,
        "sealed_case_still_appearing_with_a_private_background_check_vendor",
        "A case that is sealed with the court but still appearing in a commercial background-check report is a different problem from a record the court never sealed. It is governed by the law about consumer reports rather than by CPL § 160.50, and it is answered by a different kind of practitioner.",
        "a consumer-reporting or background-check attorney, and otherwise " + NY_LEGAL_HELP,
        "Keep the report that shows the case, note the date and the vendor, and take both. Ask about the law that governs consumer reports rather than about sealing."
      );
    }
    return derived;
  }

  if (trackId === "ny_clean_slate_convictions") {
    const sexOffence = branch(trackId, "sexOffenceScreen", NY_YES_NO, facts.sexOffenceScreen);
    if (sexOffence.resolved) {
      throw new NewYorkGuidanceStopError(
        trackId,
        "the_offence_may_be_a_sex_offence_under_correction_law_168_a",
        "A conviction for an offence defined as a sex offence or a sexually violent offence under Correction Law § 168-a is outside Clean Slate. Whether a particular offence falls inside that definition is a legal question, and an unclear answer is treated here exactly as a yes.",
        NY_LEGAL_HELP,
        "Take the court record showing the offence and its Penal Law citation and ask whether § 168-a reaches it."
      );
    }

    const offenceClass = branch(trackId, "offenceClass", NY_OFFENCE_CLASSES, facts.offenceClass);
    if (offenceClass.resolved === "unknown") {
      throw new NewYorkGuidanceStopError(
        trackId,
        "the_penal_law_article_and_class_are_not_known_from_the_record",
        "The offence label alone will not resolve either the class A drug split or the sex offence definition. The Penal Law article and class have to come from the court record, and until they do, nothing on this route can be worked out at all.",
        "the clerk of the court of conviction, and the Division of Criminal Justice Services for your own Record Review",
        "Ask for the court record showing the Penal Law citation and the class for each conviction, and run the Record Review. Come back to this route with both in front of you."
      );
    }
    if (offenceClass.resolved === "class_a") {
      throw new NewYorkGuidanceStopError(
        trackId,
        "a_class_a_felony_pending_the_article_220_determination",
        "Clean Slate excludes class A felony convictions, except that class A felony offences defined in Penal Law article 220 are carved back in — which is the opposite of the CPL § 160.59 list, where all class A felonies including drug felonies are excluded. Whether a particular class A conviction sits inside the article 220 carve-back is a legal determination, and this sheet does not make it either way.",
        NY_LEGAL_HELP,
        "Take the court record with the Penal Law citation and class and ask whether the article 220 carve-back reaches this conviction."
      );
    }
    derived.offenceClassBranch = offenceClass.value;

    const lifeSentence = branch(trackId, "lifeSentence", NY_YES_NO, facts.lifeSentence);
    if (lifeSentence.resolved) {
      throw new NewYorkGuidanceStopError(
        trackId,
        "a_life_sentence_was_imposed",
        "Counsel recorded that a person who received a life sentence is outside Clean Slate, and this screen follows that. It is worth being straight about the basis: the section as read did not surface an explicit life-sentence exclusion, so the point has been returned for confirmation rather than settled. Either way it is not a question to answer from a sheet.",
        NY_LEGAL_HELP,
        "Take the sentencing record and ask whether Clean Slate reaches a conviction carrying that sentence."
      );
    }

    const supervision = branch(trackId, "currentSupervision", NY_YES_NO, facts.currentSupervision);
    if (supervision.resolved) {
      throw new NewYorkGuidanceStopError(
        trackId,
        "currently_under_probation_or_parole_supervision_for_the_conviction",
        "CPL § 160.57(1)(b) requires that the defendant not currently be under the supervision of any probation or parole department for the conviction eligible for sealing. While that supervision is running, the condition is not met and the conviction does not seal.",
        "your probation or parole officer, for the date supervision is due to end, and then this route again once it has",
        "Get the end date in writing, write it down, and come back to this route after it has passed. Nothing needs to be filed in the meantime."
      );
    }

    const pending = branch(trackId, "pendingChargeInNewYork", NY_YES_NO, facts.pendingChargeInNewYork);
    if (pending.resolved) {
      throw new NewYorkGuidanceStopError(
        trackId,
        "a_criminal_charge_is_pending_in_new_york",
        "Clean Slate requires that no subsequent criminal charge is pending in this state. A live charge suspends the whole question, and it also matters for a second reason: a later conviction re-anchors the earlier conviction's clock.",
        "the attorney representing you in the pending case",
        "Deal with the pending case first. Come back to this route once nothing is pending, and bring the disposition with you."
      );
    }

    const multicategory = branch(trackId, "multicategoryDocket", NY_YES_NO, facts.multicategoryDocket);
    if (multicategory.resolved) {
      throw new NewYorkGuidanceStopError(
        trackId,
        "a_multicategory_docket_question",
        "Where one docket carries convictions of more than one category, how Clean Slate treats them together is the subject of a pending technical-corrections bill rather than of a settled rule. This sheet will not guess at it.",
        NY_LEGAL_HELP,
        "Take the full docket, showing every count and its disposition, and ask how the categories interact on that docket."
      );
    }

    const overdue = branch(trackId, "shouldHaveSealedButHasNot", NY_YES_NO, facts.shouldHaveSealedButHasNot);
    if (overdue.resolved) {
      throw new NewYorkRouteMismatchError(
        trackId,
        "the_conviction_should_have_sealed_and_has_not",
        "Where the period has run, every condition is met and the record still shows, the question stops being about eligibility and becomes about an overdue sealing. That is a separate route with a separate and unfinished answer.",
        "the New York overdue Clean Slate review route",
        "Go back to the New York intake and answer the questions for a record that should have sealed and has not. Bring your Record Review from the Division of Criminal Justice Services with you."
      );
    }
    derived.cleanSlateScreenPassed = true;
    return derived;
  }

  if (trackId === "ny_clean_slate_dwai") {
    const subdivision = branch(trackId, "vtlSubdivision", NY_DWAI_SUBDIVISIONS, facts.vtlSubdivision);
    if (subdivision.resolved === "outside") {
      throw new NewYorkRouteMismatchError(
        trackId,
        "the_conviction_was_under_another_subdivision_of_vtl_1192",
        "CPL § 160.57(1)(a) reaches a conviction under subdivision one of Vehicle and Traffic Law § 1192 and nothing else. Which subdivision the conviction was under is the entire eligibility test on this route, and any other impaired-driving conviction is outside it.",
        NY_LEGAL_HELP + ", and the New York Clean Slate route for convictions where the offence is a crime rather than a traffic infraction",
        "Take the court record showing the exact subdivision and ask what reaches a conviction under it."
      );
    }
    if (subdivision.resolved === "unresolvable_from_recollection") {
      throw new NewYorkGuidanceStopError(
        trackId,
        "which_subdivision_the_conviction_was_under_is_not_known",
        "The answer has to come from the court record rather than from recollection: subdivision one is a traffic infraction with its own paragraph and its own three-year rule, and the other subdivisions are not in this paragraph at all. An uncertain answer stops this route rather than being guessed at.",
        "the clerk of the court that decided the case, and the Division of Criminal Justice Services for your own Record Review",
        "Ask for the record showing the exact subdivision you were convicted under. Come back to this route with it in front of you."
      );
    }
    derived.dwaiSubdivisionBranch = subdivision.value;
    return derived;
  }

  if (trackId === "ny_clean_slate_manual_review") {
    const toldCanPetition = branch(
      trackId,
      "toldAPetitionCanBeMadeNow",
      NY_YES_NO,
      facts.toldAPetitionCanBeMadeNow
    );
    if (toldCanPetition.resolved) {
      throw new NewYorkGuidanceStopError(
        trackId,
        "told_that_a_manual_review_petition_can_be_made_now",
        "Somebody has told you something this packet cannot confirm. New York Courts states that the form for requesting court review of an overdue Clean Slate sealing will be published no later than 16 November 2027, and as things stand there is no published form and no published procedure. If a specific court or organisation has told you otherwise, that is worth taking seriously and worth checking with somebody who can look at it — but it is not something this packet can act on.",
        NY_LEGAL_HELP,
        "Ask whoever told you where the procedure is published, write down what you are told, and take it to a lawyer rather than to a court counter."
      );
    }

    const confirmed = branch(
      trackId,
      "eligibilityConditionsChecked",
      NY_ELIGIBILITY_CONFIRMED,
      facts.eligibilityConditionsChecked
    );
    if (confirmed.resolved === "a_condition_is_not_met") {
      throw new NewYorkRouteMismatchError(
        trackId,
        "a_clean_slate_condition_is_not_met",
        "The commonest reason a record has not sealed is not that the court system is behind, but that one of the conditions is not met — most often current probation or parole supervision for the conviction itself, or a pending charge. A record in that position is not overdue.",
        "the New York Clean Slate eligibility route for convictions under CPL § 160.57",
        "Go back to the New York intake and work through the conditions one at a time. Come back here only if every one of them is met and the record still has not sealed."
      );
    }
    if (confirmed.resolved === "not_checked") {
      throw new NewYorkGuidanceStopError(
        trackId,
        "the_clean_slate_conditions_have_not_been_checked_yet",
        "This route is about a record that should have sealed. Whether it should have is the question the conditions answer, and until they have been worked through there is nothing here to be overdue about.",
        "the New York Clean Slate eligibility route for convictions, and the Division of Criminal Justice Services for your own Record Review",
        "Work through the conditions first and run the Record Review. Come back here with both done."
      );
    }

    const dcjs = branch(trackId, "dcjsRecordReviewRun", NY_YES_NO, facts.dcjsRecordReviewRun);
    if (!dcjs.resolved) {
      throw new NewYorkGuidanceStopError(
        trackId,
        "no_record_review_has_been_run",
        "Nothing on this route can be said about a record nobody has looked at. The Record Review from the Division of Criminal Justice Services is what shows whether sealing has been applied, and it is the thing every later conversation runs on.",
        "the New York State Division of Criminal Justice Services",
        "Request the fingerprint-based Record Review and pay its fee. Read what it says about the conviction, and come back to this route with it."
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
  sources: readonly string[];
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
      "None for the sealing itself. The Record Review from the Division of Criminal Justice Services carries its own fee, charged by that agency.",
    feeWaiver: input.feeWaiver ?? "Not applicable. There is no filing fee to waive where there is nothing to file.",
    noticeOrService: input.noticeOrService ?? [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you when a record has been sealed, which is why this packet tells you to go and check."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...NY_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "The record is a federal, tribal, military or out-of-state record.",
      "Your immigration status could be affected by the record.",
      "You are relying on sealing for a firearms licence.",
      ...input.escalations
    ],
    officialSourceReferences: input.sources
  };
}

const COURT_AND_DCJS = {
  name: "The court that handled the case, and the New York State Division of Criminal Justice Services",
  detail:
    "The court holds the case file and the docket. The Division of Criminal Justice Services holds the state criminal history record and will release your own copy to you through a fingerprint-based Record Review. LegalEase contacts neither and reads neither."
};

export const NEW_YORK_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- ny_160_50_nonconviction ---------------------------------------------
  "ny-160-50-eligibility-screen": sheet({
    templateId: "ny-160-50-eligibility-screen",
    mechanismName: "A New York case that ended in your favour: what CPL § 160.50 does at disposition",
    whyNotAFiling:
      "Nothing is filed by you. Where a criminal action terminates in the defendant's favour, CPL § 160.50 has the record sealed by direction of the court at disposition. There is no waiting period, no application and nothing to file, so LegalEase generates no filing for it.",
    processType: "automatic",
    prerequisites: [
      "The record is a New York arrest, charge or court record.",
      "The case ended in a dismissal, an acquittal, a declination to prosecute, an adjournment in contemplation of dismissal that has since been dismissed, or a conviction that a court later vacated.",
      "You are prepared to check the position rather than assume it."
    ],
    documentsToObtain: [
      "Your own fingerprint-based Record Review from the New York State Division of Criminal Justice Services. This is the record that shows whether sealing has been applied.",
      "The court's disposition record for the case, from the clerk of the court that disposed of it, showing how and when the case ended."
    ],
    gather: [
      "The county and the court, the docket or indictment number, the arrest date and the charge.",
      "How the case ended, and on what date.",
      "If it was an adjournment in contemplation of dismissal, whether the period has finished and the case has actually been dismissed.",
      "Whether the case is still showing anywhere, and exactly where you saw it."
    ],
    destination: {
      name: "No destination. Sealing is directed by the court at disposition under CPL § 160.50",
      detail:
        "There is nowhere for you to send anything. The direction to seal is the court's and it is given at disposition. What this packet does is tell you what should have happened, how to check it, and what to do if the check comes back wrong."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What the section reaches. A criminal action that terminates in the defendant's favour: a dismissal, an acquittal, a declination to prosecute, an adjournment in contemplation of dismissal that is then dismissed, or a conviction that is later vacated or overturned.",
      "When it happens. At disposition, by direction of the court. There is no period to wait out and nothing to apply for.",
      "One thing about that list is unsettled and this page does not settle it. Whether a vacated conviction is sealed automatically on the vacatur, or whether it needs a separate direction from the court, is an open question. If that is your situation, treat the sealing as something to check rather than something to count on.",
      "If your case was an adjournment in contemplation of dismissal that has not yet been dismissed, none of this applies yet. The period has to run and the case has to be dismissed first.",
      "A second point, and it is about the limits of this page rather than about the law. The full text of CPL § 160.50 was not read in full at source when this was written, including the prosecutor's ability to move to keep a record unsealed in the interests of justice. So a case can end in your favour and still not be sealed for a reason this page cannot describe.",
      NEVER_ASSUME_IT_IS_SEALED,
      "So the next sheet in this packet is the important one: how to run the Record Review and what to look for on it.",
      NOTHING_IS_FILED_ON_THIS_ROUTE,
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE
    ],
    expectedNextStage:
      "The next sheet is the verification step. Until it is done, the position of your record is unknown, and this packet will not tell you otherwise.",
    canPrepare: [
      "This explanation of what CPL § 160.50 reaches and when it operates.",
      "The verification sheet and the escalation sheet that follow it in this packet.",
      "The account of what sealing does and does not reach, which is the last sheet in this packet."
    ],
    escalations: [
      "The case was an adjournment in contemplation of dismissal that has not been dismissed.",
      "A conviction in the case was vacated and you need to know whether that seals of itself.",
      "You were told the prosecutor asked the court to keep the record unsealed."
    ],
    sources: NY_SEALING_SOURCES
  }),

  "ny-160-50-verification": sheet({
    templateId: "ny-160-50-verification",
    mechanismName: "Checking whether the sealing actually happened",
    whyNotAFiling:
      "This is a plan for requesting your own criminal history record and reading it. Nothing on it is filed, and CPL § 160.50 provides no participant application for LegalEase to prepare.",
    processType: "automatic",
    prerequisites: [
      "The case ended in your favour, and you know how and when.",
      "You have read the sheet before this one in the packet."
    ],
    documentsToObtain: [
      "The fingerprint-based Record Review from the New York State Division of Criminal Justice Services.",
      "The court's disposition record for the case, from the clerk of the court that disposed of it."
    ],
    gather: [
      "The docket or indictment number, the county and the court.",
      "The disposition and its date, exactly as the court record states them.",
      "The date of each check you make, and what the record showed on that date.",
      "Where else the case has appeared — which employer, which report, which website — and when."
    ],
    destination: COURT_AND_DCJS,
    sequence: [
      DCJS_RECORD_REVIEW,
      "Request it in your own name and read it yourself. This is not something LegalEase does for you and not something it sees.",
      "Then ask the clerk of the court that disposed of the case for the disposition record. The court record and the state criminal history record are held by different bodies and one can be updated before the other, so a difference between them is information rather than an error.",
      "Compare what each shows against how you know the case ended. If the disposition on the record is not the disposition you remember, that difference is the thing to chase first, because everything else depends on it.",
      "Where the Record Review shows the case sealed, keep a dated copy. Nobody is required to write and tell you that it happened, so a copy you obtained yourself may be the only evidence of it you hold.",
      NEVER_ASSUME_IT_IS_SEALED,
      "Where the case is still showing, the next question is where you saw it, because the answer decides which problem you have. A case showing on an official record is one thing. A case showing in a commercial background-check report after the court has sealed it is a different thing, governed by different law and answered by a different kind of practitioner.",
      "The escalation sheet that follows takes both of those in turn.",
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE
    ],
    expectedNextStage:
      "Either the Record Review shows the case sealed, in which case keep a dated copy, or it does not, in which case the escalation sheet sets out the two paths and says plainly which one has an unfinished answer.",
    canPrepare: [
      "This verification plan and the list of what to look for.",
      "The distinction between an official record and a commercial report, which decides where the problem goes.",
      "The escalation sheet that follows it in this packet."
    ],
    escalations: [
      "The disposition on the record is not the one you remember.",
      "The court record and the state criminal history record disagree.",
      "You cannot get the Record Review because of a fingerprinting or identity difficulty."
    ],
    sources: NY_SEALING_SOURCES
  }),

  "ny-160-50-escalation": sheet({
    templateId: "ny-160-50-escalation",
    mechanismName: "Where a New York case that ended in your favour is still showing",
    whyNotAFiling:
      "This page is escalation guidance. Nothing on it is filed. What the remedy is where sealing did not occur is not settled, so there is no application to prepare, and inventing one would be worse than saying so.",
    processType: "automatic",
    prerequisites: [
      "The case ended in your favour.",
      "You have run the Record Review and the case is still showing somewhere.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "A dated copy of your Record Review from the Division of Criminal Justice Services.",
      "A dated copy of the court's disposition record.",
      "The report or screenshot showing the case, where it appeared in a commercial background check, with the vendor's name and the date."
    ],
    gather: [
      "Where exactly the case appeared, and on what date.",
      "The docket or indictment number, the county and the court.",
      "What you asked each office, when you asked it, and what they said.",
      "Any consequence that has already followed — a job, a tenancy, a licence — and its date."
    ],
    destination: {
      name: "The clerk of the disposing court and the Division of Criminal Justice Services, and then a New York lawyer",
      detail:
        "Where an official record is still showing the case, the two bodies that hold it are the first ask. Where a commercial vendor is the one showing it, that is consumer-report territory rather than sealing territory. Both roads end with a person rather than with a form, because no participant application is established on either."
    },
    sequence: [
      "Say the honest thing first. What a person does when a favourable termination has not been sealed is unresolved. No settled answer to it was found, and the full text of CPL § 160.50 — including the prosecutor's ability to move to keep a record unsealed in the interests of justice — was not read at source. So this sheet gives you a route to a person, not a remedy.",
      "First separate the two situations, because they go to different places. An official record still showing the case is a question for the court and the Division of Criminal Justice Services. A commercial background-check report still showing a case the court has sealed is a question about consumer reports.",
      "On the official-record side: ask the clerk of the disposing court, in writing, what the court's record shows and whether a sealing direction was entered. Put the docket or indictment number and the disposition date in the request, and keep a copy of what you sent.",
      "Ask the Division of Criminal Justice Services, in writing, what its record shows for the case, and keep a copy of that request too.",
      "Keep every reply, or the absence of one, with the dated copies. That file is the whole of the evidence that sealing was owed and has not appeared, and it is the first thing anyone you take this to will ask for.",
      "On the commercial-report side: keep the report itself, with the vendor's name and the date you obtained it. That document is the case, and without it there is nothing to show.",
      NOTHING_IS_FILED_ON_THIS_ROUTE,
      "Then take the file to " + NY_LEGAL_HELP + ". Where a commercial report is the problem, ask specifically for somebody who works on consumer reports.",
      "Nothing here is a finding that any court, clerk or agency has done anything wrong, and nothing on this page says a record has been sealed or has failed to be. It records what each record showed on the day you looked at it.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet with a dated record of what was owed and what has appeared, and with a destination that can act on it. What happens after that depends on advice this packet cannot give.",
    canPrepare: [
      "This escalation plan and the separation of the two situations.",
      "The list of what to ask each office and what to keep.",
      "The account of what is unsettled, stated as unsettled."
    ],
    escalations: [
      "An employer, landlord or licensing body has already acted on the case.",
      "The court and the Division of Criminal Justice Services each say the other holds the record.",
      "You are told the prosecutor moved to keep the record unsealed and you do not know what that means."
    ],
    sources: NY_SEALING_SOURCES
  }),

  "ny-160-50-effect-and-limits": sheet({
    templateId: "ny-160-50-effect-and-limits",
    mechanismName: "What sealing a favourable termination does, and what it does not reach",
    whyNotAFiling:
      "This page explains the effect of a statute. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "automatic",
    prerequisites: [
      "You have read the sheets before this one in the packet.",
      "You want to know what sealing actually gets you before you rely on it."
    ],
    documentsToObtain: [
      "Your own Record Review from the Division of Criminal Justice Services, so that what follows is read against the record rather than against memory."
    ],
    gather: [
      "Every application, licence or clearance you expect to be affected, and the exact wording of the question each one asks.",
      "Whether any federal, immigration or firearms question is in play, because none of them is reached by New York sealing."
    ],
    destination: {
      name: "No destination. This sheet is an explanation rather than a step",
      detail:
        "Nothing here is sent anywhere. It is the part of the packet that says what sealing does, so that nobody relies on the word for more than it carries."
    },
    sequence: [
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE,
      "What that gets you in practice, and it is a great deal. A sealed record does not appear on background checks run by employers, housing providers and other non-law-enforcement entities, and a person may generally answer that they have no criminal record.",
      WHO_CAN_STILL_SEE_A_SEALED_RECORD,
      PREDICATE_AND_FEDERAL_LIMITS,
      "The practical way to use that list is to work backwards from the specific question you are being asked. What a particular application, licence or clearance is entitled to see is a more useful question than whether sealing is strong in the abstract.",
      NEVER_ASSUME_IT_IS_SEALED,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this packet knowing what should have happened at disposition, how to confirm it, what to do if it did not, and what sealing does and does not reach.",
    canPrepare: [
      "This account of what sealing does and of the enumerated exceptions to it.",
      "The list of what is not reached, which is the part most people are not told.",
      "The three sheets before this one."
    ],
    escalations: [
      "A specific employer or licensing body is the problem and you need to know what it is entitled to see.",
      "You have been told a sealed record cannot be used against you at all.",
      "A later case is being charged and a sealed conviction is being raised as a predicate."
    ],
    sources: NY_SEALING_SOURCES
  }),

  // ---- ny_clean_slate_convictions -------------------------------------------
  "ny-clean-slate-eligibility-analysis": sheet({
    templateId: "ny-clean-slate-eligibility-analysis",
    mechanismName: "New York Clean Slate: what the conditions are, and what none of them is",
    whyNotAFiling:
      "Nothing is filed by you, and nothing can be. CPL § 160.57 contains no petition mechanism for the ordinary case: eligible convictions are sealed automatically by the Office of Court Administration and the Division of Criminal Justice Services. LegalEase generates no filing because none exists to generate.",
    processType: "automatic",
    prerequisites: [
      "The conviction is a New York conviction.",
      "You have, or can get, the court record showing the Penal Law article and class for each conviction. The offence label alone is not enough.",
      "You accept that this packet explains conditions rather than deciding whether you meet them."
    ],
    documentsToObtain: [
      "Your own fingerprint-based Record Review from the New York State Division of Criminal Justice Services.",
      "The court records showing, for each conviction, the Penal Law article and class, the sentencing date, and any incarceration and release dates, from the court of conviction.",
      "An FBI Identity History Summary, where you also have convictions outside New York and want a complete picture. New York sealing does not reach them, but knowing what is there changes what you plan for."
    ],
    gather: [
      "For each New York conviction: the county, the court, the docket or indictment number, the charge with its Penal Law citation and class, the sentencing date, and any incarceration and release dates.",
      "Whether you are currently on probation, parole or post-release supervision for the conviction you want sealed.",
      "Whether any criminal charge is pending against you in New York.",
      "Whether you have been convicted of anything since the conviction you want sealed.",
      "Whether any conviction was for an offence requiring sex offender registration, or defined as a sex offence or sexually violent offence.",
      "Whether you have convictions outside New York, in another state or in a federal court."
    ],
    destination: {
      name: "The Office of Court Administration and the Division of Criminal Justice Services",
      detail:
        "The sealing is theirs to do and nothing is submitted to them. The Unified Court System must seal eligible convictions no later than 16 November 2027, and until then the back catalogue is still being worked through, so many eligible records are not yet sealed."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "The conditions, all of which must be satisfied. The waiting period must have run; you must not currently be under the supervision of any probation or parole department for the conviction eligible for sealing; no subsequent criminal charge may be pending in this state; the conviction must not be for an offence defined as a sex offence or a sexually violent offence under Correction Law § 168-a; and it must not be a class A felony.",
      "One carve-back that is easy to get backwards. Class A felony offences defined in Penal Law article 220 are carved back into Clean Slate. That is the opposite of the CPL § 160.59 list, where all class A felonies including drug felonies are excluded. If you have read that the two work the same way, you have read something that does not apply here.",
      "The supervision condition is the one most often left out of summaries, and it is the one most likely to be the reason a record has not sealed. It is about supervision for the conviction eligible for sealing, and while that supervision is running the condition is not met.",
      "Why the class matters more than the offence name. The Penal Law article and class are what resolve both the class A drug split and the sex offence definition, and they have to come from the court record. An offence label from memory will not do it.",
      "A condition being unmet is not always permanent. Supervision ends; a pending charge is disposed of. Where that is the position, the answer is a date to come back on rather than a door closed.",
      IMPLEMENTATION_DEADLINE,
      NEVER_ASSUME_IT_IS_SEALED,
      NOTHING_IS_FILED_ON_THIS_ROUTE,
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE
    ],
    expectedNextStage:
      "The next sheet works out the timing, which is the part people most often get wrong — particularly where there has been a later conviction.",
    canPrepare: [
      "This account of the Clean Slate conditions and of the article 220 carve-back.",
      "The timing sheet and the supervision screen that follow it in this packet.",
      "The verification sheet, the monitoring disclosure and the account of what sealing reaches."
    ],
    escalations: [
      "You cannot get the Penal Law article and class from the court record.",
      "A conviction might be a sex offence or sexually violent offence under Correction Law § 168-a.",
      "A conviction is a class A felony and you need to know whether the article 220 carve-back reaches it.",
      "One docket carries convictions of more than one category."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
  }),

  "ny-clean-slate-timing-calculation": sheet({
    templateId: "ny-clean-slate-timing-calculation",
    mechanismName: "Working out the Clean Slate date, including what a later conviction does to it",
    whyNotAFiling:
      "This page is arithmetic and a reading of a statute. Nothing on it is filed, and there is no application on this route to prepare.",
    processType: "automatic",
    prerequisites: [
      "You have the sentencing date for each conviction, and any incarceration and release dates.",
      "You have read the sheet before this one in the packet."
    ],
    documentsToObtain: [
      "The court record for each conviction showing the sentencing date and the class of the offence.",
      "Records showing the date you were last released from incarceration for that sentence, where there was one."
    ],
    gather: [
      "For each conviction: whether it was a misdemeanour or a felony.",
      "The date of imposition of sentence.",
      "Where there was incarceration, the date you were last released from it for that sentence.",
      "The date of any later conviction, because it moves the earlier conviction's start date."
    ],
    destination: {
      name: "No destination. This sheet is a calculation rather than a step",
      detail:
        "Nothing here is sent anywhere. The point of it is that you can tell whether the period has run before you spend anything on the question."
    },
    sequence: [
      "The two periods. A misdemeanour seals when at least three years have passed. A felony seals when at least eight years have passed.",
      "What the clock runs from, which is the part summaries get wrong. For a misdemeanour it runs from the defendant's release from incarceration, or from the imposition of sentence where there was no sentence of incarceration. For a felony it runs from the date the defendant was last released from incarceration for the sentence of the conviction eligible for sealing, or again from the imposition of sentence where there was none.",
      "So the date to write down is a release date where there was incarceration, and a sentencing date where there was not. Take it from the record, not from memory.",
      "Now the rule that catches people out. Where a person is subsequently convicted of a crime before a prior conviction is sealed, the calculation of time for the prior conviction starts on the same date as the calculation for the subsequent conviction. That is a re-anchoring rule, not a pause: the earlier conviction's clock does not stop and later resume, it restarts from the later conviction's start date.",
      "The practical consequence is worth spelling out. A later conviction can push an old conviction's sealing date years further out than the person expects, and it does that even where the later matter was minor.",
      "One thing that is genuinely unsettled and this page does not settle. Where a person has both a misdemeanour and a felony, how the three-year and eight-year clocks interact is an open question. If that is your position, the arithmetic here gives you each period on its own and stops there.",
      IMPLEMENTATION_DEADLINE,
      "So a date that has passed does not mean the record is sealed today, and a record that is not sealed today does not mean the date was wrong.",
      NEVER_ASSUME_IT_IS_SEALED,
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE
    ],
    expectedNextStage:
      "You leave this sheet with a date for each conviction, and with an honest note where the interaction between two of them is unresolved. The next sheet is the supervision screen.",
    canPrepare: [
      "This calculation and the account of what each clock runs from.",
      "The explanation of the re-anchoring rule, which is the commonest surprise on this route.",
      "The supervision screen and the verification sheet that follow it in this packet."
    ],
    escalations: [
      "You have both a misdemeanour and a felony and need to know how the two clocks interact.",
      "You cannot establish the date you were last released from incarceration.",
      "There has been a later conviction and you need to know what it did to the earlier date."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
  }),

  "ny-clean-slate-supervision-screen": sheet({
    templateId: "ny-clean-slate-supervision-screen",
    mechanismName: "The supervision condition, and the bill that would widen it",
    whyNotAFiling:
      "This page is a screen and a monitoring note. Nothing on it is filed, and no application exists on this route for LegalEase to prepare.",
    processType: "automatic",
    prerequisites: [
      "You know whether you are currently under probation, parole or post-release supervision, and for which conviction.",
      "You have read the two sheets before this one in the packet."
    ],
    documentsToObtain: [
      "Written confirmation from your probation or parole officer of whether supervision is running and when it is due to end.",
      "Your own Record Review from the Division of Criminal Justice Services."
    ],
    gather: [
      "Whether you are currently under supervision, and for which conviction specifically.",
      "The date supervision is due to end, or the date it ended.",
      "Whether any criminal charge is pending against you in New York."
    ],
    destination: {
      name: "Your probation or parole department, for the dates; nothing is submitted anywhere",
      detail:
        "The condition is about a fact rather than about a document. The department that supervises you is where the date comes from, and nothing is filed with anybody."
    },
    sequence: [
      "The condition as the section states it: the defendant must not currently be under the supervision of any probation or parole department for the conviction eligible for sealing. Note the last five words, because they are doing work.",
      "So the question is not whether you are under supervision at all, but whether you are under supervision for the conviction you want sealed. Get that distinction right before drawing any conclusion, and get the answer from the department rather than from memory.",
      "Where supervision is running, the condition is not met and there is nothing to do but note the end date and come back to it. Nothing is filed in the meantime and nothing is gained by trying.",
      "Now the standing monitor, and it matters precisely because it could change the answer above. Assembly Bill A10951 would broaden the supervision prohibitor from supervision for the conviction eligible for sealing to any probation or parole supervision, and would add conditions requiring that all other criminal convictions on the same docket also be eligible before any is sealed.",
      "That bill is not law. As matters stood when this was written it sat in the Assembly Codes Committee, its last action a referral to that committee on 14 April 2026, and it had not been enacted. Nothing on this page applies it, and nobody should tell you that it does.",
      "The reason it is worth knowing about is the direction it runs in: if it were enacted it would narrow eligibility for people screened as eligible today. So a position that is comfortable now is worth re-checking rather than banking.",
      "The same is true of the pending technical-corrections bill on multicategory dockets — where one docket carries convictions of more than one category, how they are treated together is not settled.",
      NEVER_ASSUME_IT_IS_SEALED,
      NOTHING_IS_FILED_ON_THIS_ROUTE
    ],
    expectedNextStage:
      "You leave this sheet knowing whether the supervision condition is met today, and knowing which pending bill could change the conditions you were screened against.",
    canPrepare: [
      "This screen and the reading of the supervision condition as the section states it.",
      "The account of the pending bill, stated as pending.",
      "The verification sheet that follows it in this packet."
    ],
    escalations: [
      "You are under supervision and cannot tell which conviction it is for.",
      "You have been told the pending bill already applies to you.",
      "One docket carries convictions of more than one category."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
  }),

  "ny-clean-slate-verification": sheet({
    templateId: "ny-clean-slate-verification",
    mechanismName: "Checking whether Clean Slate has reached your record",
    whyNotAFiling:
      "This is a plan for requesting your own criminal history record and reading it. Nothing on it is filed, and CPL § 160.57 contains no petition mechanism for the ordinary case.",
    processType: "automatic",
    prerequisites: [
      "You have worked out the date for each conviction.",
      "You have read the sheets before this one in the packet."
    ],
    documentsToObtain: [
      "The fingerprint-based Record Review from the New York State Division of Criminal Justice Services.",
      "The court record for each conviction, where the Record Review and your own understanding disagree."
    ],
    gather: [
      "The date you ran the Record Review, and what it showed for each conviction.",
      "The date each conviction's period ran out, from the timing sheet.",
      "Anything on the Record Review you do not understand, written down exactly as it appears."
    ],
    destination: COURT_AND_DCJS,
    sequence: [
      DCJS_RECORD_REVIEW,
      "Request it in your own name and read it yourself. LegalEase does not obtain it, does not see it and cannot interpret it for you.",
      "Read it against the dates from the timing sheet, conviction by conviction. What you are looking for is whether each conviction whose period has run is shown as sealed.",
      "Here is an honest limit on this step, and it is a live open question rather than a quibble. How a person verifies Clean Slate status in practice, and whether the Record Review shows sealed status clearly, is not settled. This whole route rests on that verification, so if the document does not plainly answer the question, that is a known gap and not a failure on your part.",
      "Where something is unclear on the document, write down exactly what it says rather than paraphrasing it. The precise wording is what somebody advising you will need.",
      IMPLEMENTATION_DEADLINE,
      "So a conviction whose period has run and which is not yet shown as sealed is, on its face, a record the system has not reached yet rather than a record that has been refused.",
      "Where every condition is met, the period has run and the record still shows, that is the overdue-review route, and it is a separate sheet in a separate packet with a separate and unfinished answer.",
      NEVER_ASSUME_IT_IS_SEALED,
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE
    ],
    expectedNextStage:
      "Either the Record Review shows the conviction sealed, in which case keep a dated copy, or it does not, in which case the monitoring sheet explains what that does and does not mean.",
    canPrepare: [
      "This verification plan and the list of what to compare against what.",
      "The honest statement that whether the document answers the question clearly is itself unsettled.",
      "The monitoring disclosure and the account of what sealing reaches, which follow in this packet."
    ],
    escalations: [
      "The Record Review does not clearly show whether a conviction is sealed.",
      "The Record Review shows a disposition you do not recognise.",
      "Every condition is met, the period has run, and the record still shows."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
  }),

  "ny-clean-slate-monitoring-disclosure": sheet({
    templateId: "ny-clean-slate-monitoring-disclosure",
    mechanismName: "What a record that has not sealed yet does and does not mean",
    whyNotAFiling:
      "This page sets expectations against a statutory implementation deadline. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "automatic",
    prerequisites: [
      "You have run the Record Review and read it against your dates.",
      "You want to know what to do with a record that has not sealed yet."
    ],
    documentsToObtain: [
      "A dated copy of your Record Review, kept so that a later one can be compared against it."
    ],
    gather: [
      "The date each conviction's period ran out.",
      "The date of each Record Review you run, so that you can tell one from another.",
      "Anything that changes in the meantime — the end of supervision, the disposition of a pending charge — and its date."
    ],
    destination: {
      name: "No destination. This sheet is an expectation rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because the gap between the date a person's own clock ran out and the date the system reaches their record is the single most common source of alarm on this route."
    },
    sequence: [
      IMPLEMENTATION_DEADLINE,
      "So the honest expectation is this: a conviction whose period has run may not be sealed yet, and that is what the back catalogue being worked through looks like from the outside.",
      "What follows practically. Keep the dated Record Review. Run another one later rather than assuming nothing has changed, and compare the two. That comparison is the only reliable record of whether anything moved.",
      "What not to do. Do not tell an employer, a landlord or a licensing body that a record is sealed on the strength of a date having passed. Until the Record Review shows it, it is not something you can stand behind.",
      "What would change the answer. Supervision for the conviction ending; a pending charge being disposed of; and, in the other direction, a later conviction re-anchoring the clock. Each of those is a reason to run the check again.",
      "And the standing monitor, again because it runs the wrong way: Assembly Bill A10951 would narrow eligibility if it were enacted, and it has not been. A position that is comfortable now is worth re-checking rather than banking.",
      "Where every condition is met, the period has run well past, and the record still shows, that is the overdue-review route rather than this one.",
      NEVER_ASSUME_IT_IS_SEALED,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet knowing what a record that has not sealed yet does and does not tell you, and knowing when to check again.",
    canPrepare: [
      "This account of the implementation deadline and of what the wait means.",
      "The list of what would change the answer and when to re-check.",
      "The account of what sealing reaches, which is the last sheet in this packet."
    ],
    escalations: [
      "An employer or landlord has acted on a conviction whose period ran out long ago.",
      "You have been asked to confirm in writing that a record is sealed.",
      "The period ran out years ago and nothing has moved."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
  }),

  "ny-clean-slate-effect-and-limits": sheet({
    templateId: "ny-clean-slate-effect-and-limits",
    mechanismName: "What Clean Slate sealing does, and who can still see the record",
    whyNotAFiling:
      "This page explains the effect of a statute. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "automatic",
    prerequisites: [
      "You have read the sheets before this one in the packet.",
      "You want to know what sealing actually gets you before you rely on it."
    ],
    documentsToObtain: [
      "Your own Record Review from the Division of Criminal Justice Services, so that what follows is read against the record rather than against memory."
    ],
    gather: [
      "Every application, licence or clearance you expect to be affected, and the exact wording of the question each one asks.",
      "Whether any federal, immigration or firearms question is in play, because none of them is reached by New York sealing."
    ],
    destination: {
      name: "No destination. This sheet is an explanation rather than a step",
      detail:
        "Nothing here is sent anywhere. It is the part of the packet that says what sealing does, so that nobody relies on the word for more than it carries."
    },
    sequence: [
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE,
      "What that gets you in practice, and it is substantial. A sealed record does not appear on background checks run by employers, housing providers and other non-law-enforcement entities, and a person may generally answer that they have no criminal record.",
      WHO_CAN_STILL_SEE_A_SEALED_RECORD,
      PREDICATE_AND_FEDERAL_LIMITS,
      "There is a further honest limit on this page itself. The full text of CPL § 160.57 beyond its first subdivision — the sealing effect provisions, the enumerated access exceptions and any employer notice obligations — was not read in full at source when this was written. The list above is what counsel recorded, and it is worth treating as the shape of the answer rather than as its last word.",
      "The practical way to use it is to work backwards from the specific question you are being asked. What a particular application is entitled to see is a more useful question than whether sealing is strong in the abstract.",
      NEVER_ASSUME_IT_IS_SEALED,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this packet knowing the conditions, the dates, how to verify, what the wait means, and what sealing does and does not reach.",
    canPrepare: [
      "This account of what Clean Slate sealing does and of the enumerated exceptions.",
      "The honest note that the effect provisions themselves were not read in full at source, so the list is the shape of the answer rather than its last word.",
      "The list of what is not reached, which is the part most people are not told.",
      "The five sheets before this one."
    ],
    escalations: [
      "A specific employer or licensing body is the problem and you need to know what it is entitled to see.",
      "You have been told a sealed record cannot be used against you at all.",
      "A later case is being charged and a sealed conviction is being raised as a predicate."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
  }),

  // ---- ny_clean_slate_dwai --------------------------------------------------
  "ny-dwai-subdivision-screen": sheet({
    templateId: "ny-dwai-subdivision-screen",
    mechanismName: "A New York DWAI and Clean Slate: which subdivision decides everything",
    whyNotAFiling:
      "Nothing is filed by you. CPL § 160.57(1)(a) provides that convictions under subdivision one of Vehicle and Traffic Law § 1192 shall be sealed after three years. There is no application and nothing to file, so LegalEase generates no filing for it.",
    processType: "automatic",
    prerequisites: [
      "The conviction is a New York conviction.",
      "You have, or can get, the court record showing the exact subdivision of VTL § 1192 you were convicted under.",
      "You accept that this packet routes and explains, and makes no statement about whether your record qualifies."
    ],
    documentsToObtain: [
      "The court record for the case, showing the charge as written and the exact subdivision of VTL § 1192.",
      "Your own fingerprint-based Record Review from the New York State Division of Criminal Justice Services."
    ],
    gather: [
      "The county, the court, the docket number, and the charge as written on the record.",
      "Which subdivision of VTL § 1192 the conviction was under, according to the court record.",
      "The date you were convicted and what sentence was imposed.",
      "Any other New York convictions or pending charges you have."
    ],
    destination: {
      name: "The Office of Court Administration and the Division of Criminal Justice Services",
      detail:
        "Nothing is filed. This route exists so that somebody with a DWAI is routed correctly rather than told that Clean Slate does not reach traffic matters, which is what silence on the point would produce."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Why this route exists at all. A conviction under VTL § 1192(1) is a traffic infraction rather than a crime, and it sits in its own paragraph of the Clean Slate section with its own three-year rule. Somebody who is told Clean Slate is only about crimes has been told something incomplete.",
      "What the paragraph says. Convictions for subdivision one of Vehicle and Traffic Law § 1192 shall be sealed after three years.",
      "What decides whether you are on this route: the subdivision, and nothing else. Subdivision one is within the paragraph. Any other impaired-driving conviction is not, and no amount of similarity in the offence name changes that.",
      "Get the subdivision from the court record. This is not a detail to supply from recollection, because the whole route turns on it and the offence names are easy to confuse.",
      "Now the part this packet will not do, and it is deliberate. This route makes no statement about whether your record qualifies, and the sheets that follow explain why: two questions about this paragraph are open, and until they close an eligibility statement would be a guess dressed as an answer.",
      "What the packet does instead is put the paragraph in front of you, tell you what is unresolved about it, show you how to check your own record, and explain how this sits alongside the other sealing route for traffic infractions.",
      NEVER_ASSUME_IT_IS_SEALED,
      NOTHING_IS_FILED_ON_THIS_ROUTE,
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE
    ],
    expectedNextStage:
      "The next sheet is how to check your own record. The two after it set out what is unresolved and how this paragraph sits alongside CPL § 160.55. Read all three before you draw a conclusion, because the middle one is where this packet explains what it will not tell you and why.",
    canPrepare: [
      "This account of what CPL § 160.57(1)(a) says and of what decides whether it is your route.",
      "The verification sheet that follows it in this packet.",
      "The disclosure of the two open questions, and the account of how this sits alongside the traffic-infraction sealing route."
    ],
    escalations: [
      "You cannot tell from the record which subdivision the conviction was under.",
      "The conviction was under a subdivision other than subdivision one.",
      "You have other New York convictions or a pending charge and need to know whether they matter here."
    ],
    sources: NY_DWAI_SOURCES
  }),

  "ny-dwai-verification": sheet({
    templateId: "ny-dwai-verification",
    mechanismName: "Checking what your own record shows for the DWAI",
    whyNotAFiling:
      "This is a plan for requesting your own criminal history record and reading it. Nothing on it is filed, and no application exists on this route to prepare.",
    processType: "automatic",
    prerequisites: [
      "The court record shows the conviction was under subdivision one of VTL § 1192.",
      "You have read the sheet before this one in the packet."
    ],
    documentsToObtain: [
      "The fingerprint-based Record Review from the New York State Division of Criminal Justice Services.",
      "The court record for the case, showing the subdivision, the conviction date and the sentence."
    ],
    gather: [
      "The docket number, the county and the court.",
      "The conviction date and the sentence imposed.",
      "The date you ran the Record Review and what it showed for this case.",
      "Any other New York convictions or pending charges, with their dates."
    ],
    destination: COURT_AND_DCJS,
    sequence: [
      DCJS_RECORD_REVIEW,
      "Request it in your own name and read it yourself. LegalEase does not obtain it and does not see it.",
      "Read it alongside the court record for the case. What you are looking for first is the subdivision, because that is what decides which paragraph you are under, and what you are looking for second is how the case is currently shown.",
      "Write down what the document says rather than what you conclude from it. On this route in particular, the precise wording is what somebody advising you will need, because the questions that remain open are about the paragraph rather than about your facts.",
      "Collect the other facts too, even though this paragraph does not on its face require them: your other New York convictions, any pending charge, and any supervision. Whether the conditions in the neighbouring paragraph reach this one is unresolved, so the facts that would matter under those conditions are worth having either way.",
      "Keep a dated copy of everything. Run the Record Review again later rather than assuming nothing has changed, and compare the two.",
      IMPLEMENTATION_DEADLINE,
      NEVER_ASSUME_IT_IS_SEALED,
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE
    ],
    expectedNextStage:
      "You leave this sheet with the subdivision confirmed from the record, a dated Record Review, and the surrounding facts collected. The next sheet says plainly what is still unresolved about this paragraph.",
    canPrepare: [
      "This verification plan.",
      "The list of surrounding facts worth collecting even though the paragraph does not on its face require them.",
      "A record of what your own criminal history record showed and on what date, which is the thing any later conversation runs on.",
      "The open-question disclosure and the interaction disclosure that follow it in this packet."
    ],
    escalations: [
      "The Record Review and the court record disagree about the subdivision.",
      "The Record Review does not clearly show the status of the case.",
      "You cannot obtain the Record Review because of a fingerprinting or identity difficulty."
    ],
    sources: NY_DWAI_SOURCES
  }),

  "ny-dwai-open-question-disclosure": sheet({
    templateId: "ny-dwai-open-question-disclosure",
    mechanismName: "The two things about this paragraph that are not settled",
    whyNotAFiling:
      "This page states what is unresolved. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "automatic",
    prerequisites: [
      "You have read the two sheets before this one in the packet.",
      "You would rather be told what is uncertain than be given a confident answer that might be wrong."
    ],
    documentsToObtain: [
      "Nothing further for this sheet. It explains two questions rather than asking you to obtain anything."
    ],
    gather: [
      "The facts the neighbouring paragraph's conditions would turn on, in case they apply: supervision status, any pending New York charge, and any other convictions.",
      "The conviction date and the sentence date, in case either turns out to be what the three years run from."
    ],
    destination: {
      name: "No destination. This sheet is a disclosure rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because this route is one where an honest account of what is unknown is more useful than a confident answer."
    },
    sequence: [
      "The first open question. Paragraph (a) states the three-year rule for a VTL § 1192(1) conviction in a single sentence. It does not on its face carry the conditions that the neighbouring paragraph (b) applies to convictions generally — the conditions about pending charges, supervision status, sex offences and class A felonies. Whether those conditions nonetheless reach this paragraph is unresolved.",
      "Why that matters to you. If they do apply, a pending charge or current supervision would matter here as much as it does on the ordinary Clean Slate route. If they do not, this paragraph would run on the three years alone. Those are materially different answers and this page does not choose between them.",
      "The second open question. Paragraph (a) states the period without naming the event it runs from, unlike paragraph (b), which names release from incarceration or imposition of sentence. So what starts the three years is not established.",
      "Why that matters to you. It means a date cannot be calculated with confidence on this route, only estimated from the most likely starting points — which is why the verification sheet asks you to collect both the conviction date and the sentence date.",
      "What follows from both. This packet makes no statement about whether your record qualifies or when it would seal, and it will not until those questions close. That is a deliberate limit rather than an omission.",
      "What you can do in the meantime, which is not nothing. Confirm the subdivision from the record. Run the Record Review and keep it dated. Collect the surrounding facts. If the answer turns out to be the wider reading, you will already have what it needs.",
      "And take the question itself to somebody who can answer it. A practitioner who does impaired-driving work in New York will know more about how this paragraph is being applied than any general guidance can.",
      NEVER_ASSUME_IT_IS_SEALED,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "The last sheet in this packet explains how this paragraph sits alongside the other sealing route that reaches traffic infractions.",
    canPrepare: [
      "This statement of the two open questions and of what each would change.",
      "The list of what is worth doing while they remain open.",
      "The interaction disclosure that follows it in this packet."
    ],
    escalations: [
      "You need an answer about timing rather than an account of why one cannot be given.",
      "Somebody has told you a specific date on which this conviction will seal.",
      "You have a pending charge or current supervision and need to know whether it matters here."
    ],
    sources: NY_DWAI_SOURCES
  }),

  "ny-dwai-interaction-disclosure": sheet({
    templateId: "ny-dwai-interaction-disclosure",
    mechanismName: "How this sits alongside the other sealing route for traffic infractions",
    whyNotAFiling:
      "This page compares two statutory routes. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "automatic",
    prerequisites: [
      "You have read the three sheets before this one in the packet.",
      "You want to know whether there is more than one way this record could be reached."
    ],
    documentsToObtain: [
      "Your own Record Review from the Division of Criminal Justice Services, if you have not already obtained it."
    ],
    gather: [
      "Whether the record shows the case as a traffic infraction or as something else.",
      "Every application, licence or clearance you expect to be affected, and the exact wording of the question each one asks.",
      "Whether the driving record, as opposed to the criminal record, is what is actually causing you the problem."
    ],
    destination: {
      name: "No destination. This sheet is an explanation rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists so that nobody concludes there is only one route when the position is less tidy than that."
    },
    sequence: [
      "Two provisions can look like they reach the same record. CPL § 160.55 deals with the sealing of records of a traffic infraction. CPL § 160.57(1)(a) gives a VTL § 1192(1) conviction its own three-year rule inside the Clean Slate section. A conviction under subdivision one is a traffic infraction, so both are in the neighbourhood.",
      "How the two interact is an open question, and this sheet does not resolve it. What it does is tell you that the question exists, so that a confident statement from any direction can be treated with the caution it deserves.",
      "The practical consequence. If somebody tells you your DWAI is covered by one route and not the other, ask which provision they mean and why. That is a fair question and a practitioner will not mind it.",
      "One thing worth separating out. Your driving record and your criminal record are different records held by different bodies. Nothing on this route is about the driving record, and if the problem you actually have is a licence or an insurance consequence, that is a different question from sealing.",
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE,
      WHO_CAN_STILL_SEE_A_SEALED_RECORD,
      PREDICATE_AND_FEDERAL_LIMITS,
      NEVER_ASSUME_IT_IS_SEALED,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this packet with the subdivision confirmed, a dated Record Review, an honest account of what is unresolved, and a clear question to put to a practitioner.",
    canPrepare: [
      "This comparison of the two provisions and of the question between them.",
      "The account of what sealing reaches and of the enumerated exceptions.",
      "The separation of the driving record from the criminal record, which is often the real question."
    ],
    escalations: [
      "Somebody has told you confidently which provision governs and you want that checked.",
      "The problem you have is about your licence or your insurance rather than about a background check.",
      "A specific employer or licensing body is the problem and you need to know what it is entitled to see."
    ],
    sources: NY_DWAI_SOURCES
  }),

  // ---- ny_clean_slate_manual_review -----------------------------------------
  "ny-manual-review-status-disclosure": sheet({
    templateId: "ny-manual-review-status-disclosure",
    mechanismName: "When Clean Slate has not reached your record: where the review procedure stands",
    whyNotAFiling:
      "Nothing is filed, because there is nothing to file with. New York Courts states that the form for requesting court review of an overdue Clean Slate sealing will be published no later than 16 November 2027. As things stand there is no published form and no published procedure, so LegalEase prepares nothing and says so rather than sending you to a court counter.",
    processType: "court_adjacent",
    prerequisites: [
      "The conviction is a New York conviction and you have worked through the Clean Slate conditions.",
      "Every condition is met and the waiting period has run.",
      "You accept that this packet tells you where a procedure stands rather than giving you one."
    ],
    documentsToObtain: [
      "Your own fingerprint-based Record Review from the New York State Division of Criminal Justice Services, dated.",
      "The court record for the conviction, showing the sentencing date and any release date."
    ],
    gather: [
      "Whether you have checked that the conviction meets every Clean Slate condition, including that you are not on probation or parole for it.",
      "Whether you have run a Record Review, and what it showed.",
      "How long it has been since the three-year or eight-year period ran out."
    ],
    destination: {
      name: "Not yet established",
      detail:
        "New York Courts states the manual-review form will be published no later than 16 November 2027. Until it is, nothing is filed and nothing is generated, and you are told that plainly rather than sent somewhere that has no procedure for you."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "The position, stated plainly. Where a record should have been sealed under Clean Slate and has not been, the person or their lawyer may seek court review. New York Courts states that the form for requesting that review will be published no later than 16 November 2027. There is no published form and no published procedure as this is written.",
      "So there is nothing to file today, and this packet does not pretend otherwise. Whether any interim mechanism exists before the form is published is an open question, and no interim procedure is published.",
      "That is an uncomfortable answer and it is the true one. Being sent to a court counter with no procedure costs a day and produces nothing.",
      IMPLEMENTATION_DEADLINE,
      "Which means the first thing to establish is whether your record is actually overdue, as opposed to simply not reached yet. Those look identical from the outside and they are not the same thing.",
      "And the commonest reason of all is neither: it is that a condition is not met. Current probation or parole supervision for the conviction itself, and a pending charge in New York, are the two that catch most people. A record in that position is not overdue at all.",
      "So the order of work is: confirm the conditions, then verify with a Record Review, and only then treat the record as overdue. The next sheet is the verification step.",
      NEVER_ASSUME_IT_IS_SEALED,
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE
    ],
    expectedNextStage:
      "The next sheet is how to verify. The one after it is where to take a record that is genuinely overdue, given that no procedure is published. The last one sets out what to watch, in both directions, while the position develops.",
    canPrepare: [
      "This account of where the review procedure stands and of what is not yet published.",
      "The distinction between a record that is overdue and a record the system has not reached yet.",
      "The verification sheet, the referral sheet and the monitoring disclosure that follow in this packet."
    ],
    escalations: [
      "You have been told you can petition for this review now.",
      "The period ran out long ago and every condition is met.",
      "You cannot tell whether a condition is met."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
  }),

  "ny-manual-review-verification": sheet({
    templateId: "ny-manual-review-verification",
    mechanismName: "Establishing that the record is actually overdue",
    whyNotAFiling:
      "This is a plan for requesting your own criminal history record and reading it against the conditions. Nothing on it is filed and no procedure exists to file it under.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheet before this one in the packet.",
      "You have, or can get, the court record showing the sentencing date and any release date."
    ],
    documentsToObtain: [
      "The fingerprint-based Record Review from the New York State Division of Criminal Justice Services.",
      "The court record for the conviction, showing the Penal Law article and class, the sentencing date and any release date.",
      "Written confirmation from your probation or parole department of whether supervision is running, and when it ended if it has."
    ],
    gather: [
      "The date the three-year or eight-year period ran out, worked from the release date or the sentencing date.",
      "The date you ran the Record Review, and what it showed for the conviction.",
      "Whether supervision for that conviction has ended, and on what date.",
      "Whether any charge is pending against you in New York.",
      "Whether there has been any later conviction, and when."
    ],
    destination: COURT_AND_DCJS,
    sequence: [
      DCJS_RECORD_REVIEW,
      "Run it in your own name and read it yourself. Without it there is nothing to discuss on this route, because the whole question is what the record shows.",
      "Then work through the conditions one at a time against the court record, rather than from memory. The period must have run; you must not currently be under supervision of any probation or parole department for that conviction; no charge may be pending in New York; the conviction must not be a sex offence or sexually violent offence under Correction Law § 168-a; and it must not be a class A felony.",
      "Check the re-anchoring point specifically, because it is the most common reason a date a person has calculated is wrong. A conviction after the one you want sealed restarts the earlier conviction's clock from the later conviction's start date.",
      "Only where every condition is met and the period has genuinely run is the record overdue. Where a condition is not met, this is not the route: the answer is the ordinary Clean Slate route and a date to come back on.",
      "Here is a known gap in this step, and it is worth naming. Whether the Record Review shows sealed status clearly enough to answer the question is itself unresolved. If the document does not plainly say, write down exactly what it does say and take that wording with you.",
      "Keep a dated copy of the Record Review and of everything you were told. Run another one later and compare. That pair is what makes an overdue record demonstrable rather than merely asserted.",
      IMPLEMENTATION_DEADLINE,
      NEVER_ASSUME_IT_IS_SEALED,
      NOTHING_IS_FILED_ON_THIS_ROUTE
    ],
    expectedNextStage:
      "Either a condition turns out not to be met, in which case the ordinary Clean Slate route is where this belongs, or the record is genuinely overdue and the next sheet is where to take it.",
    canPrepare: [
      "This verification plan and the condition-by-condition check.",
      "The re-anchoring point, which is the commonest reason a calculated date is wrong.",
      "The referral sheet and the monitoring disclosure that follow it in this packet."
    ],
    escalations: [
      "The Record Review does not clearly show whether the conviction is sealed.",
      "You cannot establish the release date the period runs from.",
      "A later conviction has moved the date and you need it worked out."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
  }),

  "ny-manual-review-referral": sheet({
    templateId: "ny-manual-review-referral",
    mechanismName: "Where to take a genuinely overdue Clean Slate record",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed. No form and no procedure are published for court review of an overdue Clean Slate sealing, so there is nothing for LegalEase to prepare and it does not invent one.",
    processType: "court_adjacent",
    prerequisites: [
      "Every Clean Slate condition is met and the period has run.",
      "You have a dated Record Review showing the conviction is not sealed.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "A dated copy of your Record Review from the Division of Criminal Justice Services.",
      "The court record for the conviction, showing the Penal Law article and class, the sentencing date and any release date.",
      "Anything confirming that supervision has ended and that nothing is pending."
    ],
    gather: [
      "The date the period ran out and how you calculated it.",
      "The date of the Record Review and what it showed.",
      "The county, the court and the docket or indictment number.",
      "Any consequence that has already followed — a job, a tenancy, a licence — and its date, because it changes how urgent the matter is to whoever takes it."
    ],
    destination: {
      name: "A New York legal aid or public defender office, a law school clinic, or a New York attorney",
      detail:
        "New York Courts states that a person or their lawyer may seek court review of an overdue sealing, and that the form for it is not yet published. So the destination is somebody who can take the question forward as the procedure develops, rather than a counter that has nothing to accept. LegalEase has not contacted any of them and does not know what any of them will say."
    },
    sequence: [
      "Take the dated Record Review, the court record and the condition check. Those three are what turn a complaint into a case somebody can look at.",
      "Ask two questions in this order. First: is this record in fact overdue on these documents? Second: is there anything that can be done about it now, before the review form is published?",
      "Be ready for the second answer to be no, and understand why that is not a brush-off. Whether any interim mechanism exists before the form is published is an open question, and no interim procedure is published.",
      "One honest note about this referral. Whether legal-aid organisations are handling overdue Clean Slate records now by other means is not established. So this sheet names the kind of destination rather than promising that a particular one will take it on.",
      "If somebody does tell you there is a way to bring this before a court now, ask them where the procedure is published and write down what you are told. That is worth knowing and worth checking, and it is not something this packet can confirm.",
      "Keep running the Record Review periodically and keep the dated copies. If the matter is eventually taken up, the history of what the record showed and when is the most useful thing you can bring to it.",
      NOTHING_IS_FILED_ON_THIS_ROUTE,
      "Nothing here is a finding that the court system has done anything wrong. The implementation deadline has not passed, and a record that has not been reached yet is not a record that has been refused.",
      NEVER_ASSUME_IT_IS_SEALED
    ],
    expectedNextStage:
      "You leave this sheet with the papers gathered, two questions in order, and a destination that can act as the procedure develops. The last sheet explains what to watch.",
    canPrepare: [
      "This referral and the list of what to take and what to ask.",
      "The account of what is not published and what is not established, stated as such.",
      "The record of what you checked and when, which is what makes an overdue record demonstrable rather than merely asserted.",
      "The monitoring disclosure that follows it in this packet."
    ],
    escalations: [
      "An employer, landlord or licensing body has acted on the conviction.",
      "You cannot find an organisation willing to look at it.",
      "You are told there is a way to petition now and you want that checked."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
  }),

  "ny-manual-review-monitoring-disclosure": sheet({
    templateId: "ny-manual-review-monitoring-disclosure",
    mechanismName: "What to watch, and what would change the answer",
    whyNotAFiling:
      "This page sets expectations against a statutory implementation deadline and a pending bill. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the three sheets before this one in the packet.",
      "You want to know what to check for and when, rather than to be told to wait."
    ],
    documentsToObtain: [
      "A dated copy of each Record Review you run, kept so that a later one can be compared against it."
    ],
    gather: [
      "The date of each Record Review and what it showed.",
      "The date supervision ended or a pending charge was disposed of, where either applies.",
      "The date of any later conviction, because it moves the earlier conviction's date."
    ],
    destination: {
      name: "No destination. This sheet is an expectation rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because on this route the useful thing is knowing what would change the answer, rather than being told to be patient."
    },
    sequence: [
      "The first thing to watch is the review form itself. New York Courts states it will be published no later than 16 November 2027, and when it appears this route stops being a referral and becomes a procedure.",
      IMPLEMENTATION_DEADLINE,
      "The second thing to watch is your own record. Run the Record Review again rather than assuming nothing has changed, and keep each dated copy. Two dated copies showing the same unsealed conviction are worth considerably more than one.",
      "The third is a bill that runs the other way. Assembly Bill A10951 would broaden the supervision condition from supervision for the conviction eligible for sealing to any probation or parole supervision, and would add conditions requiring that other convictions on the same docket also be eligible before any is sealed.",
      "That bill is not law. As matters stood when this was written it sat in the Assembly Codes Committee, its last action a referral to that committee on 14 April 2026. Nothing here applies it. It is worth knowing about because if it were enacted it would narrow eligibility for people who screen as eligible today — so a record that is overdue now could stop being eligible at all.",
      "There is also a pending technical-corrections bill on multicategory dockets, where one docket carries convictions of more than one category. How they are treated together is not settled.",
      "What all of that adds up to practically: check your own record periodically, keep the dated copies, and take the question to a lawyer sooner rather than later if a consequence has already followed.",
      NEVER_ASSUME_IT_IS_SEALED,
      NEW_YORK_SEALS_IT_DOES_NOT_EXPUNGE,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this packet knowing where the procedure stands, how to show your record is overdue, where to take it, and what would change the answer in either direction.",
    canPrepare: [
      "This account of what to watch and of what each change would mean.",
      "The account of the pending bills, stated as pending rather than applied.",
      "The reasons to run the Record Review again, and the value of holding two dated copies rather than one.",
      "The three sheets before this one."
    ],
    escalations: [
      "You have been told the pending bill already applies to you.",
      "The review form has been published and you need to know what to do with it.",
      "A consequence has already followed from the unsealed conviction."
    ],
    sources: NY_CLEAN_SLATE_SOURCES
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
      if (!NEW_YORK_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no New York guidance template ${component.templateId} is registered.`
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
 * Asked on every New York route in this family, in this order.
 *
 * The last two are the design's own stop conditions and it records them
 * identically on all four assigned tracks: sealing does not remove immigration
 * consequences and sealed records remain reachable by immigration authorities,
 * and firearms licensing is one of the enumerated purposes for which a sealed
 * record can still be seen. Both are asked before anything else, because a
 * participant holding either expectation should learn it is misplaced before
 * reading a word about waiting periods.
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
      "Is the record from New York, another state, the federal courts, a tribal court, or a military court?",
    required: true
  },
  {
    key: "immigrationQuestion",
    label:
      "Could your immigration status be affected by this — for example, are you not a United States citizen?",
    required: true
  },
  {
    key: "firearmsLicensingGoal",
    label: "Are you doing this because of a firearms licence?",
    required: true
  }
];

function newYorkTrack(input: {
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
    jurisdiction: "NY",
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

export const NEW_YORK_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  newYorkTrack({
    trackId: "ny_160_50_nonconviction",
    publicName: "Your New York case that ended in your favor should already be sealed",
    mechanism: "sealing_by_direction_of_the_court_on_a_termination_in_the_defendants_favour",
    authority: "N.Y. Crim. Proc. Law § 160.50",
    recordTypes: ["arrest", "charge", "court_record"],
    dispositions: ["dismissed", "acquitted", "declined_to_prosecute", "acd_dismissed", "conviction_vacated"],
    components: [
      {
        componentId: "ny_160_50_nonconviction-eligibility-screen-1",
        templateId: "ny-160-50-eligibility-screen"
      },
      {
        componentId: "ny_160_50_nonconviction-verification-instructions-2",
        templateId: "ny-160-50-verification"
      },
      {
        componentId: "ny_160_50_nonconviction-escalation-instructions-3",
        templateId: "ny-160-50-escalation"
      },
      {
        componentId: "ny_160_50_nonconviction-effect-and-limits-disclosure-4",
        templateId: "ny-160-50-effect-and-limits"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "caseDetails",
        label:
          "For the case: which county and court, the docket or indictment number, the arrest date, the charge, and how and when it ended?",
        required: true
      },
      {
        key: "dispositionType",
        label:
          "How did the case end — dismissed, found not guilty, the prosecutor declined, an ACD that has been dismissed, an ACD still running, a conviction that was later vacated, or a conviction that stands?",
        required: true
      },
      {
        key: "stillAppearing",
        label:
          "Does the case still show up anywhere — no, yes on an official record, or yes in a commercial background-check report?",
        required: true
      }
    ],
    assembledPacketName: "new-york-favourable-termination-sealing",
    assembledPacketTitle: "New York CPL § 160.50 — a case that ended in your favour",
    customerDeliverableDescription:
      "Explains that a New York case terminating in the defendant's favour is sealed by direction of the court at disposition with no application and nothing to file, shows how to verify that through a fingerprint-based Record Review from the Division of Criminal Justice Services, separates a record the court never sealed from a sealed case still appearing with a commercial vendor, and states what sealing does and does not reach. Nothing is filed by the participant and no fee is charged by LegalEase.",
    notes:
      "Process guidance only. Sealing is directed by the court at disposition; never generate a petition, and never tell a participant their record is already sealed. Three open questions are preserved on the sheets: the full text of CPL § 160.50 was not read at source including the prosecutor's interests-of-justice motion, whether a vacated conviction seals automatically, and what the remedy is where sealing did not occur."
  }),

  newYorkTrack({
    trackId: "ny_clean_slate_convictions",
    publicName: "New York Clean Slate",
    mechanism: "automatic_sealing_of_eligible_convictions_under_cpl_160_57_1_b",
    authority:
      "N.Y. Crim. Proc. Law § 160.57(1)(b), N.Y. Correct. Law § 168-a, N.Y. Penal Law art. 220 and L.2023 ch.631",
    recordTypes: ["conviction", "court_record"],
    dispositions: ["convicted"],
    components: [
      {
        componentId: "ny_clean_slate_convictions-eligibility-analysis-1",
        templateId: "ny-clean-slate-eligibility-analysis"
      },
      {
        componentId: "ny_clean_slate_convictions-timing-calculation-2",
        templateId: "ny-clean-slate-timing-calculation"
      },
      {
        componentId: "ny_clean_slate_convictions-supervision-screen-3",
        templateId: "ny-clean-slate-supervision-screen"
      },
      {
        componentId: "ny_clean_slate_convictions-verification-instructions-4",
        templateId: "ny-clean-slate-verification"
      },
      {
        componentId: "ny_clean_slate_convictions-monitoring-disclosure-5",
        templateId: "ny-clean-slate-monitoring-disclosure"
      },
      {
        componentId: "ny_clean_slate_convictions-effect-and-limits-disclosure-6",
        templateId: "ny-clean-slate-effect-and-limits"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "convictionDetails",
        label:
          "For each New York conviction: the county, court, docket or indictment number, the charge with its Penal Law citation and class, the sentencing date, and any incarceration and release dates?",
        required: true
      },
      {
        key: "offenceClass",
        label:
          "From the court record, what is each conviction — a misdemeanour, a felony below class A, a class A felony, a class A felony under Penal Law article 220, or not known from the record?",
        required: true
      },
      {
        key: "sexOffenceScreen",
        label:
          "Was any conviction for an offence that requires sex offender registration, or that is defined as a sex offence or sexually violent offence? Answer yes if you are not sure.",
        required: true
      },
      {
        key: "lifeSentence",
        label: "Was a life sentence imposed on any conviction?",
        required: true
      },
      {
        key: "currentSupervision",
        label:
          "Are you currently on probation, parole or post-release supervision for the conviction you want sealed?",
        required: true
      },
      {
        key: "pendingChargeInNewYork",
        label: "Is any criminal charge pending against you in New York?",
        required: true
      },
      {
        key: "subsequentConviction",
        label: "Have you been convicted of anything since the conviction you want sealed?",
        required: true
      },
      {
        key: "multicategoryDocket",
        label: "Does one docket carry convictions of more than one category?",
        required: true
      },
      {
        key: "shouldHaveSealedButHasNot",
        label:
          "Has the waiting period already run, with every condition met, and the record still shows?",
        required: true
      },
      {
        key: "otherJurisdictionConvictions",
        label: "Do you have convictions outside New York, in another state or in federal court?",
        required: true
      }
    ],
    assembledPacketName: "new-york-clean-slate-conviction-sealing",
    assembledPacketTitle: "New York Clean Slate — automatic sealing under CPL § 160.57",
    customerDeliverableDescription:
      "Sets out every Clean Slate condition including the supervision condition that summaries omit and the Penal Law article 220 carve-back that runs opposite to CPL § 160.59, works out the three-year and eight-year periods and explains the re-anchoring rule that a later conviction triggers, screens supervision, shows how to verify through a Record Review, sets expectations against the 16 November 2027 implementation deadline, and states what sealing does and does not reach. Nothing is filed by the participant, and the section provides no petition mechanism for the ordinary case.",
    notes:
      "Process guidance only. CPL § 160.57 carries no petition mechanism for the ordinary case; never generate one, and never tell a participant their record is already sealed. Four release blockers are preserved on the sheets rather than resolved: the A10951 standing monitor, how Clean Slate status is verified in practice, whether the section carries a life-sentence exclusion, and how the three-year and eight-year clocks interact."
  }),

  newYorkTrack({
    trackId: "ny_clean_slate_dwai",
    publicName: "New York DWAI records and Clean Slate",
    mechanism: "automatic_sealing_of_a_vtl_1192_1_conviction_under_cpl_160_57_1_a",
    authority:
      "N.Y. Crim. Proc. Law § 160.57(1)(a), N.Y. Veh. & Traf. Law § 1192(1) and N.Y. Crim. Proc. Law § 160.55",
    recordTypes: ["conviction", "court_record"],
    dispositions: ["convicted"],
    components: [
      {
        componentId: "ny_clean_slate_dwai-subdivision-screen-1",
        templateId: "ny-dwai-subdivision-screen"
      },
      {
        componentId: "ny_clean_slate_dwai-verification-instructions-2",
        templateId: "ny-dwai-verification"
      },
      {
        componentId: "ny_clean_slate_dwai-open-question-disclosure-3",
        templateId: "ny-dwai-open-question-disclosure"
      },
      {
        componentId: "ny_clean_slate_dwai-interaction-disclosure-4",
        templateId: "ny-dwai-interaction-disclosure"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "dwaiCaseDetails",
        label:
          "For the DWAI case: the county, court, docket number, the charge as written on the record, and when it was decided?",
        required: true
      },
      {
        key: "vtlSubdivision",
        label:
          "Which subdivision of Vehicle and Traffic Law § 1192 were you convicted under, according to the court record — subdivision one, another subdivision, or are you not sure?",
        required: true
      },
      {
        key: "dwaiConvictionDate",
        label: "On what date were you convicted, and what sentence was imposed?",
        required: true
      },
      {
        key: "dwaiOtherMatters",
        label: "Do you have any other New York convictions or pending charges?",
        required: true
      }
    ],
    assembledPacketName: "new-york-dwai-clean-slate-routing",
    assembledPacketTitle: "New York DWAI and Clean Slate — CPL § 160.57(1)(a)",
    customerDeliverableDescription:
      "Routes a participant with a Vehicle and Traffic Law § 1192(1) conviction to the paragraph that actually reaches it rather than leaving them to conclude Clean Slate does not touch traffic matters, shows how to confirm the subdivision from the court record and verify through a Record Review, and states without resolving the two open questions on the paragraph — whether the neighbouring paragraph's conditions apply to it and what event starts its three years — together with how it sits alongside CPL § 160.55. Makes no eligibility statement, by design.",
    notes:
      "Process guidance only. The design forbids any eligibility statement on this track until its release blockers close, and no sheet makes one. Never generate a petition and never tell a participant their record is already sealed."
  }),

  newYorkTrack({
    trackId: "ny_clean_slate_manual_review",
    publicName: "When Clean Slate has not reached your record yet",
    mechanism: "routing_and_status_disclosure_for_an_overdue_clean_slate_sealing",
    authority: "N.Y. Crim. Proc. Law § 160.57 and the Office of Court Administration implementation procedure",
    recordTypes: ["conviction", "court_record"],
    dispositions: ["convicted"],
    components: [
      {
        componentId: "ny_clean_slate_manual_review-status-disclosure-1",
        templateId: "ny-manual-review-status-disclosure"
      },
      {
        componentId: "ny_clean_slate_manual_review-verification-instructions-2",
        templateId: "ny-manual-review-verification"
      },
      {
        componentId: "ny_clean_slate_manual_review-referral-instructions-3",
        templateId: "ny-manual-review-referral"
      },
      {
        componentId: "ny_clean_slate_manual_review-monitoring-disclosure-4",
        templateId: "ny-manual-review-monitoring-disclosure"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "eligibilityConditionsChecked",
        label:
          "Have you checked that your conviction actually meets every Clean Slate condition, including that you are not on probation or parole for it — yes, no, or not checked yet?",
        required: true
      },
      {
        key: "dcjsRecordReviewRun",
        label: "Have you run a Record Review with the Division of Criminal Justice Services?",
        required: true
      },
      {
        key: "dcjsRecordReviewShowed",
        label: "What did the Record Review show for the conviction?",
        required: false
      },
      {
        key: "timeElapsedSincePeriodRan",
        label: "How long has it been since the three-year or eight-year period ran out?",
        required: true
      },
      {
        key: "toldAPetitionCanBeMadeNow",
        label: "Has anyone told you that you can petition a court for this review now?",
        required: true
      }
    ],
    assembledPacketName: "new-york-clean-slate-overdue-review",
    assembledPacketTitle: "New York Clean Slate — when the sealing has not happened",
    customerDeliverableDescription:
      "States plainly that New York Courts has not yet published the form or the procedure for court review of an overdue Clean Slate sealing and that the form is due no later than 16 November 2027, separates a record that is genuinely overdue from one the system has not reached yet and from one where a condition is simply not met, shows how to establish which it is, refers the participant onward with the papers gathered, and sets out what to watch in both directions. No petition is prepared, because none is published.",
    notes:
      "Process guidance only, and a referral rather than a filing route. No form and no procedure are published; never suggest a petition can be brought today and never tell a participant their record is already sealed. Whether any interim mechanism exists is a preserved release blocker, and whether legal-aid organisations are handling these now is a recorded research note."
  })
];
