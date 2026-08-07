// Virginia process guidance — four automatic-sealing routes and one
// post-writ court route.
//
// Five assigned tracks, all `process_guidance` in the adopted design, and not
// one of them produces a participant submission:
//
//   - `va_auto_seal_convictions`, `va_auto_seal_nonconvictions` and
//     `va_auto_seal_clean_record` run on the Chapter 23.2 machinery. The
//     Virginia State Police identify finalised dispositions by electronic
//     review, the Office of the Executive Secretary distributes lists to
//     participating circuit court clerks, and the courts enter the orders. The
//     participant initiates nothing, signs nothing and pays nothing.
//   - `va_auto_seal_without_order` is narrower still: § 19.2-392.6:1 seals
//     former marijuana possession offences without entry of any court order and
//     § 19.2-392.17 deems traffic infractions sealed. There is not even an
//     order to wait for.
//   - `va_exp_actual_innocence` is court action on a court's own duty. Under
//     § 19.2-392.2(J), on receiving a copy of a writ vacating a conviction
//     under § 19.2-327.5 or § 19.2-327.13 the court shall enter an order
//     requiring expungement. No petition, no application, no waiting period and
//     no fee are prescribed. The writ litigation that produces the trigger is
//     appellate post-conviction work, which the adopted scope excludes and for
//     which the participant is represented by the time the writ issues.
//
// So the deliverable on all five is the explanation, the verification plan and
// the honest routing — which is exactly what the controlling review specifies
// LegalEase can prepare. Nothing here is guidance chosen because a form was
// missing.
//
// Three things the adopted design insists on, and which every sheet carries:
//
//   - Automatic does not mean immediate, and it does not mean done. The
//     statutory distribution cadence is at least annual, the State Police
//     verification portal is due 1 October 2026, and the State Police are not
//     required to list an offence whose eligibility cannot be determined by
//     electronic review. A paper-era or ambiguous disposition may never be
//     picked up at all.
//   - Sealing restricts access; expungement removes. Section 19.2-392.13 keeps
//     sealed records available for firearm eligibility determinations and NICS,
//     for AFIS fingerprint comparison, for three named research bodies and for
//     law-enforcement employees. A participant choosing between free automatic
//     sealing and a petition is making a real choice and is entitled to see it
//     stated plainly rather than steered.
//   - The petition routes stay open. Section 19.2-392.6(D) says so expressly,
//     and every fallback sheet here tests § 19.2-392.12:1 before § 19.2-392.12
//     because the former has no cap, no manifest-injustice showing and no
//     felony-history bars.
//
// And one thing the design expressly refuses to resolve, which no sheet here
// resolves either: § 19.2-392.2 is published in a version effective until
// 1 December 2026 and a version effective from that date, and § 19.2-392.6
// carries one subsection A effective until 1 July 2027 and a second effective
// from that date after 2026 Sp. Sess. I, c. 1. The memo records that as a
// release blocker on the governing mechanism and does not choose between them.
// These sheets state the uncertainty, name both dates, and take no view.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Virginia
// is not an enabled jurisdiction and this job does not enable one. Virginia's
// expungement, absolute-pardon, identity-misuse and Chapter 23.2 petition
// tracks are other jobs and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** The one place a Virginia participant looks themselves up. Named once. */
const VA_RECORD_CHECK =
  "your own Virginia criminal history record from the Central Criminal Records Exchange, which the Virginia State Police maintain";

/** Free and low-cost Virginia help, named once so no stop is a dead end. */
const VA_LEGAL_HELP = "a Virginia legal aid office, a Virginia law school clinic, or a Virginia attorney";

/**
 * Said on every automatic sheet in this family.
 *
 * "Automatic" is a statement about the mechanism, not about the participant's
 * case. A sheet that blurs the two has told somebody their record is gone.
 */
const AUTOMATIC_IS_NOT_A_REPORT =
  "Automatic describes what the law does, not what has happened in your case. Nothing on this page tells you that a record has come off, and LegalEase has not looked. Treat this route as pending until you have checked for yourself.";

/** The phasing disclosure. No promise about timing may be made past this. */
const PHASING_DISCLOSURE =
  "Chapter 23.2 took effect on 1 July 2026, but the machinery behind it is still being stood up. The Virginia State Police are required to build a secure verification portal by 1 October 2026, and the Norfolk Circuit Court Clerk describes automatic sealing as phasing in on that date. Lists pass from the State Police to the Office of the Executive Secretary and on to participating circuit court clerks on an at-least-annual cadence, so waiting on this route is measured in quarters rather than weeks. LegalEase takes no view on when any particular record will be reached and makes no promise about timing.";

/** Why a record can sit in the machinery and never come out of it. */
const ELECTRONIC_REVIEW_LIMIT =
  "The State Police are not required to list an offence whose eligibility cannot be determined by electronic review. A paper-era or ambiguous disposition may therefore never be picked up at all. That is a limit of the mechanism rather than a finding about your case, and it is the strongest reason to check the record instead of waiting on it.";

/** The distinction the review puts on every Virginia sheet. */
const SEALING_IS_NOT_EXPUNGEMENT =
  "Sealing restricts access to a record. Expungement removes it. They are different remedies with different consequences, and a sealed record is not a removed one.";

/** What § 19.2-392.13 preserves. Stated so nobody reads sealing as erasure. */
const SEALED_RECORD_STILL_USED =
  "Section 19.2-392.13 keeps sealed records available for a defined list of purposes: firearm eligibility determinations and the National Instant Criminal Background Check System, fingerprint comparison in the Automated Fingerprint Identification System, research by the Virginia Criminal Sentencing Commission, the State Crime Commission and the Joint Legislative Audit and Review Commission, and access by law-enforcement employees. Sealing is worth having and it is not erasure.";

/** Section 19.2-392.6(D), which the design requires be stated expressly. */
const PETITION_ROUTES_REMAIN_OPEN =
  "Section 19.2-392.6(D) says expressly that automatic sealing does not stop a person from seeking sealing in the circuit court under § 19.2-392.12 or § 19.2-392.12:1. Those petition routes stay open whether or not the automatic machinery ever reaches the record.";

/**
 * The tension the adopted design refuses to resolve.
 *
 * Two published versions of each governing section, two future dates, and no
 * decision on record about which one a packet builds against. The design marks
 * that a release blocker on the governing mechanism. This paragraph states the
 * uncertainty and stops there; it does not pick a version and it does not
 * imply which way the question comes out.
 */
const STATUTORY_VERSION_UNSETTLED =
  "One thing is genuinely unsettled and this page does not pretend otherwise. Section 19.2-392.2 is published in two versions, one effective until 1 December 2026 and one effective from that date, and the later one describes the expungement gateway differently. Section 19.2-392.6 is published with one subsection A effective until 1 July 2027 and a second effective from that date, following 2026 Sp. Sess. I, c. 1. Which version governs a particular record on either side of those dates has not been settled here, and this page does not decide it. Read anything here about the current text as subject to change on 1 December 2026 and again on 1 July 2027, and check the Code before you rely on it.";

/** Never charge for a record that seals by force of statute. */
const NO_CHARGE_FOR_STATUTORY_SEALING =
  "There is nothing to pay. No fee attaches to a record that seals by force of statute, and nobody should be charging you for one.";

/** Background-check vendors are outside every Virginia authority's reach. */
const PRIVATE_VENDORS =
  "Commercial background-check vendors keep their own copies and refresh them on their own schedules. An official record can change and a vendor's report can lag behind it for months. A Virginia court order reaches Virginia records; it does not reach a copy a private company has already sold on.";

const VA_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal, expunge or remove anything, and cannot make the Virginia State Police, the Office of the Executive Secretary, a circuit court clerk or a judge act.",
  "LegalEase cannot compile the State Police list, cannot carry out the Executive Secretary's distribution to circuit court clerks, and cannot enter the court's order. Those three steps are the whole of this mechanism and not one of them is ours.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal history. You request your own copy from the Central Criminal Records Exchange and you read it.",
  "LegalEase has not contacted any court, clerk, agency or officer about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No date on this page is a promise about your case."
];

const VA_SOURCES: readonly string[] = [
  "Code of Virginia Title 19.2, Chapter 23.2, sealing of criminal history record information and court records, read at law.lis.virginia.gov on 6 August 2026.",
  "Code of Virginia §§ 19.2-392.6, 19.2-392.6:1, 19.2-392.7, 19.2-392.8, 19.2-392.10, 19.2-392.11, 19.2-392.12, 19.2-392.12:1, 19.2-392.13 and 19.2-392.17; § 17.1-502(B1); § 19.2-390(A).",
  "Code of Virginia § 19.2-392.2, expungement of police and court records, in both published versions, read at law.lis.virginia.gov on 6 August 2026.",
  "Virginia State Police, petition-based record sealing, at vsp.virginia.gov; Virginia State Crime Commission, Sealing of Criminal Records Update, January 2026.",
  "Norfolk Circuit Court Clerk, expungement and record sealing, dated 1 July 2026, used only as one locality's description of how the process is running there."
];

const VA_INNOCENCE_SOURCES: readonly string[] = [
  "Code of Virginia § 19.2-392.2(J) and (K), expungement of police and court records, read at law.lis.virginia.gov on 6 August 2026.",
  "Code of Virginia §§ 19.2-327.5 and 19.2-327.13, the biological-evidence and non-biological-evidence writs of actual innocence.",
  "Code of Virginia § 19.2-392.13, disposition and permitted uses of sealed records.",
  "Virginia State Police, Central Criminal Records Exchange, for a person's own criminal history record."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class VirginiaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "VirginiaGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Virginia route. */
export class VirginiaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "VirginiaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class VirginiaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "VirginiaBranchError";
  }
}

export const VA_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * Where the § 19.2-392.6(A) automatic list and the § 19.2-392.12:1(A) petition
 * list part company.
 *
 * The automatic list was read at source and is narrower than the petition list:
 * § 4.1-305 and subsection A of § 18.2-265.3 appear on the petition list and not
 * on the automatic one, so a conviction under either will never be picked up
 * automatically and can only be reached by petitioning.
 */
export const VA_AUTOMATIC_OFFENCE_LIST: Readonly<Record<string, string>> = {
  enumerated_automatic: "automatic",
  section_4_1_305: "petition_only",
  section_18_2_265_3_a: "petition_only",
  other: "neither_list"
};

/** How the matter ended, in the terms Chapter 23.2 uses. */
export const VA_DISPOSITION_CATEGORIES: Readonly<Record<string, string>> = {
  convicted: "conviction",
  acquitted: "non_conviction",
  nolle_prosequi: "non_conviction",
  dismissed: "non_conviction"
};

/** Misdemeanour or felony. Section 19.2-392.11 reaches only the first. */
export const VA_CHARGE_LEVELS: Readonly<Record<string, string>> = {
  misdemeanor: "misdemeanor",
  felony: "felony"
};

/** The two things §§ 19.2-392.6:1 and 19.2-392.17 seal without any order. */
export const VA_STATUTORY_SEAL_CATEGORIES: Readonly<Record<string, string>> = {
  former_marijuana_possession: "19.2-392.6:1",
  traffic_infraction: "19.2-392.17",
  neither: "neither"
};

/** Which writ vacated the conviction, where the paperwork says. */
export const VA_WRIT_SECTIONS: Readonly<Record<string, string>> = {
  section_19_2_327_5: "biological_evidence",
  section_19_2_327_13: "non_biological_evidence",
  not_a_writ_of_actual_innocence: "other"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new VirginiaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualised legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

const IMMIGRATION_STOP =
  "Immigration consequences are governed by federal law, and no Virginia sealing or expungement order reaches them. A sealed Virginia record is still a record for federal purposes.";

const FIREARM_STOP =
  "Section 19.2-392.13 expressly preserves the use of sealed records for firearm eligibility determinations and for the National Instant Criminal Background Check System. Sealing does not answer a firearm question, and this page will not be read as if it did.";

/** Named once. Both petition routes, in the order the design tests them. */
const PETITION_ROUTE_DESTINATION =
  "the Virginia circuit-court sealing petitions under § 19.2-392.12:1 and § 19.2-392.12, in that order";

const PETITION_ROUTE_NEXT_STEP =
  "Take § 19.2-392.12:1 first: it has no cap on the number of offences, no manifest-injustice showing and no felony-history bars. Section 19.2-392.12 is the wider discretionary route behind it. Both are separate LegalEase tracks and neither is served by this sheet.";

const EXPUNGEMENT_ROUTE_DESTINATION = "the Virginia expungement route under § 19.2-392.2";

/**
 * Validates participant answers and routes to the correct Virginia node.
 *
 * The order is the design's order: the eligibility-advice boundary first,
 * because nobody is served an opinion by a guidance sheet; then immigration,
 * which the design stops on for every one of these five tracks; then firearm
 * eligibility, which the design stops on for the four automatic tracks because
 * § 19.2-392.13 preserves exactly that use; then the route's own questions.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there, so
 * no negative case terminates without somewhere to go.
 */
export function deriveVirginiaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Nobody is served an eligibility opinion by a guidance sheet.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", VA_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new VirginiaGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      VA_LEGAL_HELP,
      "Take your criminal history record and your court papers to one of them and ask about your own case."
    );
  }

  // Gate 2. Immigration, a stop condition on all five assigned tracks.
  const immigration = branch(trackId, "immigrationQuestion", VA_YES_NO, facts.immigrationQuestion);
  if (immigration.resolved) {
    throw new VirginiaGuidanceStopError(
      trackId,
      "immigration_consequences_in_play",
      IMMIGRATION_STOP,
      "an immigration attorney",
      "Speak to an immigration attorney about the record before you rely on anything on this route."
    );
  }

  if (trackId === "va_exp_actual_innocence") {
    const category = branch(trackId, "recordCategory", VA_DISPOSITION_CATEGORIES, facts.recordCategory);
    if (category.resolved !== "conviction") {
      throw new VirginiaRouteMismatchError(
        trackId,
        "charge_did_not_end_in_a_conviction",
        "Subsection J is about a conviction that a writ of actual innocence has vacated. A charge that ended in acquittal, a nolle prosequi or a dismissal was never a conviction, and subsection A is the provision that reaches it.",
        EXPUNGEMENT_ROUTE_DESTINATION,
        "Go back to the Virginia intake and answer the questions for a charge that did not end in a conviction."
      );
    }

    const writ = branch(trackId, "writSection", VA_WRIT_SECTIONS, facts.writSection);
    if (writ.resolved === "other") {
      throw new VirginiaRouteMismatchError(
        trackId,
        "conviction_was_not_vacated_by_a_writ_of_actual_innocence",
        "Subsection J is triggered by a writ under § 19.2-327.5 or § 19.2-327.13 and by nothing else. A conviction set aside some other way does not start the court's duty under that subsection.",
        "the Virginia expungement and sealing routes, and " + VA_LEGAL_HELP,
        "Take the order that disposed of the conviction to one of them and ask which Virginia route the record now sits on."
      );
    }
    derived.writBasis = writ.resolved;

    const granted = branch(trackId, "writGranted", VA_YES_NO, facts.writGranted);
    if (!granted.resolved) {
      throw new VirginiaGuidanceStopError(
        trackId,
        "writ_of_actual_innocence_has_not_been_granted",
        "Nothing happens under § 19.2-392.2(J) until a court has granted the writ. Obtaining one is appellate post-conviction litigation in the Court of Appeals or the Supreme Court of Virginia, and the adopted product scope does not reach it.",
        "an attorney who handles Virginia appellate post-conviction work, or " + VA_LEGAL_HELP,
        "Ask about the writ itself first. This sheet describes what happens after one is granted and is of no use before that."
      );
    }

    const represented = branch(trackId, "representedByCounsel", VA_YES_NO, facts.representedByCounsel);
    derived.stillRepresented = represented.resolved;

    const orderEntered = branch(trackId, "orderEntered", VA_YES_NO, facts.orderEntered);
    const stillVisible = branch(trackId, "recordStillVisible", VA_YES_NO, facts.recordStillVisible);
    if (!orderEntered.resolved && stillVisible.resolved) {
      throw new VirginiaGuidanceStopError(
        trackId,
        "order_not_entered_although_the_court_holds_the_writ",
        "The duty under § 19.2-392.2(J) is the circuit court's and it arises on receipt of the writ. Where the court has the writ and no order has been entered, that is a question about the court's own record, not something a new self-help filing addresses.",
        represented.resolved
          ? "the counsel who obtained the writ, and the clerk of the circuit court that entered the vacated conviction"
          : "the clerk of the circuit court that entered the vacated conviction, and then " + VA_LEGAL_HELP,
        "Ask for the case's order book entries and whether an order under § 19.2-392.2(J) has been entered. Bring the copy of the writ with you."
      );
    }
    derived.expungementOrderEntered = orderEntered.resolved;
    return derived;
  }

  // Gate 3. Firearm eligibility, a stop condition on all four automatic tracks.
  const firearm = branch(trackId, "firearmEligibilityQuestion", VA_YES_NO, facts.firearmEligibilityQuestion);
  if (firearm.resolved) {
    throw new VirginiaGuidanceStopError(
      trackId,
      "firearm_eligibility_is_the_question",
      FIREARM_STOP,
      VA_LEGAL_HELP,
      "Ask about firearm eligibility as its own question, on its own facts, before you rely on a sealed record for it."
    );
  }

  // Gate 4. Removal rather than restriction, and the Dotson screen behind it.
  const wantsRemoval = branch(trackId, "wantsRemovalNotRestriction", VA_YES_NO, facts.wantsRemovalNotRestriction);
  if (wantsRemoval.resolved) {
    const stipulated = branch(
      trackId,
      "dismissedAfterFactsSufficientForGuilt",
      VA_YES_NO,
      facts.dismissedAfterFactsSufficientForGuilt
    );
    if (stipulated.resolved) {
      throw new VirginiaGuidanceStopError(
        trackId,
        "removal_sought_where_the_dismissal_followed_facts_sufficient_for_guilt",
        "Where a charge was dismissed after a stipulation or a judicial finding of facts sufficient to find guilt, the expungement door is the one that is shut, not the sealing one. Sealing may still reach the record; removal is the remedy that does not.",
        PETITION_ROUTE_DESTINATION,
        PETITION_ROUTE_NEXT_STEP
      );
    }
    throw new VirginiaRouteMismatchError(
      trackId,
      "participant_wants_removal_rather_than_restriction",
      "Automatic sealing restricts access to the record and leaves it in existence. A participant who wants the record removed is asking for expungement, which is a different remedy on a different track.",
      EXPUNGEMENT_ROUTE_DESTINATION,
      "Go back to the Virginia intake and answer the questions for expungement rather than for automatic sealing."
    );
  }

  // Gate 5. Waiting is not a plan where the participant cannot afford to wait.
  const timetable = branch(trackId, "needsReliefOnATimetable", VA_YES_NO, facts.needsReliefOnATimetable);
  if (timetable.resolved) {
    throw new VirginiaRouteMismatchError(
      trackId,
      "relief_is_needed_on_a_timetable_the_automatic_route_cannot_hold",
      "The automatic route runs on an at-least-annual distribution cadence and no participant-facing status source exists for it yet. Where a job, a licence or a housing application turns on the record by a particular date, waiting on this route is not a plan.",
      PETITION_ROUTE_DESTINATION,
      PETITION_ROUTE_NEXT_STEP
    );
  }

  // Gate 6. The record the machine may never see.
  const paperEra = branch(trackId, "dispositionIsPaperEraOrAmbiguous", VA_YES_NO, facts.dispositionIsPaperEraOrAmbiguous);
  if (paperEra.resolved) {
    throw new VirginiaGuidanceStopError(
      trackId,
      "disposition_is_paper_era_or_ambiguous",
      "The State Police identify eligible dispositions by electronic review and are not required to list an offence whose eligibility cannot be determined that way. A paper-era or ambiguous disposition may sit outside the machinery indefinitely, and no amount of waiting changes that.",
      PETITION_ROUTE_DESTINATION,
      PETITION_ROUTE_NEXT_STEP
    );
  }

  if (trackId === "va_auto_seal_convictions") {
    const category = branch(trackId, "recordCategory", VA_DISPOSITION_CATEGORIES, facts.recordCategory);
    if (category.resolved !== "conviction") {
      throw new VirginiaRouteMismatchError(
        trackId,
        "disposition_is_not_a_conviction",
        "Section 19.2-392.6 is the automatic route for offences that resulted in a conviction. A charge that ended in acquittal, a nolle prosequi or a dismissal runs on the non-conviction sections instead.",
        "the Virginia automatic sealing route for non-convictions under §§ 19.2-392.8 and 19.2-392.10",
        "Go back to the Virginia intake and answer the questions for a charge that did not end in a conviction."
      );
    }

    const listed = branch(trackId, "automaticOffenceList", VA_AUTOMATIC_OFFENCE_LIST, facts.automaticOffenceList);
    if (listed.resolved === "petition_only") {
      throw new VirginiaRouteMismatchError(
        trackId,
        "offence_is_on_the_petition_list_but_not_the_automatic_list",
        "Section 4.1-305 and subsection A of § 18.2-265.3 appear on the § 19.2-392.12:1(A) petition list and do not appear on the § 19.2-392.6(A) automatic list. A conviction under either will not be picked up by the automatic machinery no matter how long it is left.",
        PETITION_ROUTE_DESTINATION,
        PETITION_ROUTE_NEXT_STEP
      );
    }
    if (listed.resolved === "neither_list") {
      throw new VirginiaRouteMismatchError(
        trackId,
        "offence_is_on_neither_the_automatic_nor_the_petition_list",
        "Section 19.2-392.6(A) is a closed list of seven provisions. An offence outside it is not reached by automatic sealing, and whether any other Virginia route reaches it is a question about that offence rather than about this mechanism.",
        VA_LEGAL_HELP + ", and the Virginia circuit-court sealing petitions",
        "Take the charge and the Code section it was brought under and ask which Virginia route, if any, reaches it."
      );
    }

    const before1986 = branch(trackId, "offenceDateBefore1986", VA_YES_NO, facts.offenceDateBefore1986);
    if (before1986.resolved) {
      throw new VirginiaRouteMismatchError(
        trackId,
        "offence_date_precedes_the_1_january_1986_floor",
        "Section 19.2-392.6(A) reaches offences with an offence date on or after 1 January 1986. An earlier offence date is outside the automatic route entirely.",
        PETITION_ROUTE_DESTINATION,
        PETITION_ROUTE_NEXT_STEP
      );
    }

    const sameDate = branch(trackId, "sameDateIneligibleConviction", VA_YES_NO, facts.sameDateIneligibleConviction);
    if (sameDate.resolved) {
      throw new VirginiaRouteMismatchError(
        trackId,
        "ineligible_conviction_entered_on_the_same_date",
        "Section 19.2-392.6(C) blocks automatic sealing where, on the date of the conviction, the person was convicted of another offence that is not eligible for automatic sealing. The second conviction takes the first one out of the route.",
        PETITION_ROUTE_DESTINATION,
        PETITION_ROUTE_NEXT_STEP
      );
    }

    const convictedSince = branch(trackId, "reportableConvictionSince", VA_YES_NO, facts.reportableConvictionSince);
    if (convictedSince.resolved) {
      throw new VirginiaGuidanceStopError(
        trackId,
        "reportable_conviction_during_the_seven_years",
        "Section 19.2-392.6(B) requires seven years since the conviction date with no conviction during that period of any law requiring a report to the Central Criminal Records Exchange under § 19.2-390(A), or of any other state, the District of Columbia, the United States or any territory. Virginia traffic infractions under Title 46.2 are excluded from that count; nothing else is.",
        PETITION_ROUTE_DESTINATION,
        PETITION_ROUTE_NEXT_STEP
      );
    }

    const sevenYears = branch(trackId, "sevenYearsHaveRun", VA_YES_NO, facts.sevenYearsHaveRun);
    if (!sevenYears.resolved) {
      throw new VirginiaGuidanceStopError(
        trackId,
        "seven_year_period_has_not_run",
        "The seven years run from the date of the conviction. Until they have run, there is nothing for the automatic machinery to pick up, and this sheet is describing a route that has not opened yet.",
        PETITION_ROUTE_DESTINATION + ", or this sheet again once the period has run",
        "Note the date the seven years end, and check the record then. If you cannot wait, the petition routes do not require the seven years to have run in the same way and are worth asking about now."
      );
    }
    derived.autoSealBranch = "enumerated_conviction";
    return derived;
  }

  if (trackId === "va_auto_seal_nonconvictions") {
    const category = branch(trackId, "recordCategory", VA_DISPOSITION_CATEGORIES, facts.recordCategory);
    if (category.resolved === "conviction") {
      throw new VirginiaRouteMismatchError(
        trackId,
        "disposition_is_a_conviction",
        "Sections 19.2-392.8 and 19.2-392.10 reach offences that did not result in a conviction. A conviction runs on § 19.2-392.6 and its seven-year clean period instead.",
        "the Virginia automatic sealing route for enumerated convictions under §§ 19.2-392.6 and 19.2-392.7",
        "Go back to the Virginia intake and answer the questions for a conviction."
      );
    }
    derived.autoSealBranch = "non_conviction";
    return derived;
  }

  if (trackId === "va_auto_seal_clean_record") {
    const category = branch(trackId, "recordCategory", VA_DISPOSITION_CATEGORIES, facts.recordCategory);
    if (category.resolved === "conviction") {
      throw new VirginiaRouteMismatchError(
        trackId,
        "disposition_is_a_conviction",
        "Section 19.2-392.11 reaches misdemeanour offences that did not result in a conviction. A conviction is outside it on its face.",
        "the Virginia automatic sealing route for enumerated convictions under §§ 19.2-392.6 and 19.2-392.7",
        "Go back to the Virginia intake and answer the questions for a conviction."
      );
    }

    const level = branch(trackId, "chargeLevel", VA_CHARGE_LEVELS, facts.chargeLevel);
    if (level.resolved === "felony") {
      throw new VirginiaRouteMismatchError(
        trackId,
        "non_conviction_charge_was_a_felony",
        "Section 19.2-392.11 is confined to misdemeanour offences. A felony charge that ended without a conviction is reached by the general non-conviction sections rather than by this one.",
        "the Virginia automatic sealing route for non-convictions under §§ 19.2-392.8 and 19.2-392.10",
        "Go back to the Virginia intake and answer the questions for a felony charge that ended without a conviction."
      );
    }

    const clean = branch(trackId, "otherwiseCleanRecord", VA_YES_NO, facts.otherwiseCleanRecord);
    if (!clean.resolved) {
      throw new VirginiaRouteMismatchError(
        trackId,
        "record_carries_another_conviction_or_a_deferred_dismissal",
        "Section 19.2-392.11 is confined to a person with no convictions and no deferred and dismissed offences on their criminal history record. A single entry of either kind, anywhere on the record, takes the participant out of this section entirely.",
        "the Virginia automatic sealing route for non-convictions under §§ 19.2-392.8 and 19.2-392.10",
        "Go back to the Virginia intake and answer the questions for a non-conviction where the rest of the record is not clean."
      );
    }
    derived.autoSealBranch = "clean_record_misdemeanor";
    return derived;
  }

  if (trackId === "va_auto_seal_without_order") {
    const sealed = branch(
      trackId,
      "statutorySealCategory",
      VA_STATUTORY_SEAL_CATEGORIES,
      facts.statutorySealCategory
    );
    if (sealed.resolved === "neither") {
      throw new VirginiaRouteMismatchError(
        trackId,
        "record_is_neither_a_former_marijuana_possession_offence_nor_a_traffic_infraction",
        "Sections 19.2-392.6:1 and 19.2-392.17 reach former possession of marijuana offences and traffic infractions and nothing else. Any other record runs on the ordinary automatic-sealing sections, which do require an order.",
        "the Virginia automatic sealing routes under §§ 19.2-392.6, 19.2-392.8, 19.2-392.10 and 19.2-392.11",
        "Go back to the Virginia intake and answer the questions for the kind of record you actually hold."
      );
    }
    derived.statutorySealBasis = sealed.resolved;

    const ancillary = branch(trackId, "ancillaryMatterAttached", VA_YES_NO, facts.ancillaryMatterAttached);
    if (ancillary.resolved) {
      throw new VirginiaRouteMismatchError(
        trackId,
        "ancillary_matter_attached_to_the_sealed_offence",
        "A probation violation, a contempt, a failure to appear or a bail appeal attached to a § 19.2-392.6:1 sealed offence is not sealed along with it. Section 19.2-392.12:1(B) is the route for that matter, and unlike the rest of Chapter 23.2 it applies whatever the offence date.",
        "the Virginia ancillary-matter sealing petition under § 19.2-392.12:1(B)",
        "Go back to the Virginia intake and answer the questions for an ancillary matter attached to a sealed offence. The 1 January 1986 floor does not bite there."
      );
    }
    return derived;
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

/** Shared shell for the four automatic-sealing families. */
function automaticSheet(input: {
  templateId: string;
  mechanismName: string;
  whyNotAFiling: string;
  prerequisites: readonly string[];
  documentsToObtain?: readonly string[];
  gather: readonly string[];
  sequence: readonly string[];
  expectedNextStage: string;
  extraCanPrepare?: readonly string[];
  escalations: readonly string[];
  processType?: GuidanceTemplate["processType"];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: input.processType ?? "automatic",
    prerequisites: input.prerequisites,
    documentsToObtain: input.documentsToObtain ?? [
      `A copy of ${VA_RECORD_CHECK}, together with the date you requested it.`,
      "The court papers for the case, if you still hold them, so the charge, the Code section and the disposition date can be read off something other than memory."
    ],
    participantDataToGather: input.gather,
    officialDestination: {
      name: "Virginia State Police and the Office of the Executive Secretary, with orders entered by circuit court clerks",
      detail:
        "Nothing is submitted by you. The State Police identify eligible finalised dispositions by electronic review and provide lists to the Office of the Executive Secretary and to participating circuit court clerks, and the courts enter the orders. Former marijuana possession offences and traffic infractions seal with no order at all."
    },
    actionSequence: input.sequence,
    submissionMethod:
      "There is nothing to submit and nothing for LegalEase to file. No petition, application or request exists on this route, so none is generated.",
    fees: NO_CHARGE_FOR_STATUTORY_SEALING,
    feeWaiver: "Not applicable. There is no fee to waive where there is no fee.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "You are not notified as of right when a record is sealed. Until the State Police verification portal is built, there is no participant-facing status source for this at all, which is why the checking step below exists."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: [
      "This explanation of what the mechanism is and who runs it.",
      "A plain list of what to gather and what to check.",
      ...(input.extraCanPrepare ?? [])
    ],
    legalEaseCannotPerform: VA_CANNOT_PERFORM,
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "Your immigration status could be affected by the record.",
      "The question you actually have is about firearm eligibility.",
      ...input.escalations
    ],
    officialSourceReferences: VA_SOURCES
  };
}

/** Shared shell for the four verification-plan sheets. */
function verificationSheet(input: {
  templateId: string;
  mechanismName: string;
  whyNotAFiling: string;
  whatToLookFor: readonly string[];
  cadence: string;
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: "automatic",
    prerequisites: [
      "You have read the explanation sheet that comes before this one in the packet.",
      "You accept that nobody will write to tell you what has happened, and that checking is the only way to find out."
    ],
    documentsToObtain: [
      `A copy of ${VA_RECORD_CHECK}, requested in your own name.`,
      "Your note of the date you requested it, kept with the copy. A record pulled six months ago answers a question about six months ago."
    ],
    participantDataToGather: [
      "The name you used at the time of the arrest, and any other name the record could sit under.",
      "Your date of birth.",
      "The Virginia city or county where the case was disposed of, and whether it was in general district court, juvenile and domestic relations district court, or circuit court.",
      "The charge, the Code section it was brought under, and the date the case ended.",
      "The date of each check you make, so you can tell one from another."
    ],
    officialDestination: {
      name: "Virginia State Police, Central Criminal Records Exchange",
      detail:
        "The Central Criminal Records Exchange holds the Virginia criminal history record and will provide a person their own copy for the fee it charges. That copy is what tells you the current state of the record. LegalEase does not request it, receive it or read it."
    },
    actionSequence: [
      AUTOMATIC_IS_NOT_A_REPORT,
      `Request ${VA_RECORD_CHECK}. Ask for it in your own name and pay the fee the State Police charge for it. This is your copy, for you to read.`,
      ...input.whatToLookFor,
      input.cadence,
      "Write down what you found and the date you found it. Where a record has in fact been sealed, that dated copy is the only proof you will hold that it happened, because no order is sent to you.",
      "Where the record still shows and you believe the machinery should have reached it, do not file anything about it in the criminal case. There is no motion on this route to bring. Take the dated copy to the fallback sheet in this packet instead.",
      PRIVATE_VENDORS,
      STATUTORY_VERSION_UNSETTLED
    ],
    submissionMethod:
      "Nothing on this sheet is submitted anywhere. The request you make to the Central Criminal Records Exchange is your own record request and is not a filing.",
    fees: "The Central Criminal Records Exchange charges a fee for a person's own criminal history record. LegalEase does not set it, collect it or state an amount for it; ask the State Police what it is when you request the copy.",
    feeWaiver: "None is recorded for a record request. There is no court fee on this route because there is no filing.",
    noticeOrService: [
      "Nothing is served and nobody is notified.",
      "You are not told when a record is sealed. That is the whole reason this sheet exists."
    ],
    expectedNextStage:
      "Either the entry has been sealed on the copy you pulled, in which case keep that copy with its date, or it has not, in which case the fallback sheet in this packet sets out what is still open. Nothing about this route makes it your fault if the answer is the second one.",
    legalEaseCanPrepare: [
      "This verification plan.",
      "The list of what to look for on the copy and when to look again.",
      "The fallback sheet that follows it in this packet."
    ],
    legalEaseCannotPerform: VA_CANNOT_PERFORM,
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "Your immigration status could be affected by the record.",
      "The question you actually have is about firearm eligibility.",
      "The copy you pulled does not match the case as you remember it, in the charge, the Code section or the disposition date.",
      "You need the record dealt with by a particular date."
    ],
    officialSourceReferences: VA_SOURCES
  };
}

/** Shared shell for the four fallback-routing sheets. */
function fallbackSheet(input: {
  templateId: string;
  mechanismName: string;
  whyNotAFiling: string;
  whyItMayNotHaveSealed: readonly string[];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: "court_adjacent",
    prerequisites: [
      "You have checked the record and it has not been sealed, or you have read the explanation sheet and concluded the automatic route will not reach it.",
      "You are ready to consider a route that does involve filing something in a circuit court, on a different LegalEase track."
    ],
    documentsToObtain: [
      `A copy of ${VA_RECORD_CHECK}, with the date you pulled it.`,
      "The court papers for the case: the charge, the Code section, the disposition and its date."
    ],
    participantDataToGather: [
      "Everything on the verification sheet, plus what you found when you checked and the date you checked.",
      "Whether you were convicted of anything else on the same date as this case.",
      "Whether you have been convicted of anything, anywhere, since the case ended. Virginia traffic infractions under Title 46.2 do not count.",
      "Whether there is a date by which you need the record dealt with, and what turns on it."
    ],
    officialDestination: {
      name: "The circuit court of the Virginia city or county where the case was disposed of",
      detail:
        "The Chapter 23.2 sealing petitions are heard by the circuit court of the locality of disposition. Nothing on this sheet goes there. This sheet tells you which petition route to look at and why; the petition itself is a separate LegalEase track with its own packet."
    },
    actionSequence: [
      PETITION_ROUTES_REMAIN_OPEN,
      ...input.whyItMayNotHaveSealed,
      "Look at § 19.2-392.12:1 first. It has no cap on the number of offences, no manifest-injustice showing and no felony-history bars, so it is the cleaner route where it is available at all.",
      "Section 19.2-392.12 is the wider discretionary petition behind it. It reaches more, and it asks more of the petitioner.",
      "Both of those are separate LegalEase tracks with their own packets and their own questions. This sheet does not prepare either one and nothing on it is filed.",
      SEALING_IS_NOT_EXPUNGEMENT,
      "Where the record is a non-conviction and what you want is removal rather than restriction, expungement under § 19.2-392.2 is the remedy to ask about instead. It is a petition in the circuit court, and it is a different track again.",
      "Take the dated copy of your criminal history record with you to whichever route you choose. It is the document every one of them starts from.",
      STATUTORY_VERSION_UNSETTLED
    ],
    submissionMethod:
      "Nothing on this sheet is submitted. It is a routing page. The route it points at has its own packet, its own instructions and its own filing step.",
    fees: "This sheet carries no fee. The petition routes it describes are filed in a circuit court and the clerk of that court sets what is payable there; ask the clerk before you file.",
    feeWaiver:
      "A circuit court's own fee-waiver process, where one applies, is dealt with on the petition track rather than here.",
    noticeOrService: [
      "Nothing is served on this sheet.",
      "The petition routes have their own notice and service requirements, which belong to those tracks."
    ],
    expectedNextStage:
      "You leave this sheet knowing which Virginia route is still open to you and why the automatic one may not have reached the record. The next step happens on that route, not on this one.",
    legalEaseCanPrepare: [
      "This routing explanation.",
      "The comparison between the two Chapter 23.2 petition routes, in the order the design tests them.",
      "A list of what to take with you to whichever route you choose."
    ],
    legalEaseCannotPerform: VA_CANNOT_PERFORM,
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "Your immigration status could be affected by the record.",
      "The question you actually have is about firearm eligibility.",
      "You cannot tell from the record which of the two petition routes fits.",
      "A date is running against you and you need to know which route is quickest."
    ],
    officialSourceReferences: VA_SOURCES
  };
}

export const VIRGINIA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- va_auto_seal_convictions -------------------------------------------
  "va-auto-seal-convictions-what-seals": automaticSheet({
    templateId: "va-auto-seal-convictions-what-seals",
    mechanismName: "Which minor Virginia convictions seal themselves, and what that does and does not mean",
    whyNotAFiling:
      "Nothing is filed and nothing is applied for. Sections 19.2-392.6 and 19.2-392.7 put the work on the Virginia State Police, the Office of the Executive Secretary and the circuit court clerks: the State Police identify eligible finalised dispositions by electronic review, the lists are distributed, and the courts enter the orders. No petition, application or request exists for this route, so none is generated.",
    prerequisites: [
      "The conviction is a Virginia conviction and it is one of the seven provisions listed in § 19.2-392.6(A): a misdemeanor violation of § 18.2-96 or § 18.2-103; § 18.2-119, § 18.2-120 or § 18.2-134; a misdemeanor violation of § 18.2-248.1; or § 18.2-415.",
      "The offence date is on or after 1 January 1986. That is the floor § 19.2-392.6(A) sets, and it is an offence date rather than a conviction date.",
      "Seven years have passed since the date of the conviction, with no conviction during that period of any law requiring a report to the Central Criminal Records Exchange under § 19.2-390(A), or of any other state, the District of Columbia, the United States or any territory. Virginia traffic infractions under Title 46.2 do not count against you.",
      "You were not convicted, on the date of that conviction, of another offence that is not eligible for automatic sealing. Section 19.2-392.6(C) blocks the route where you were."
    ],
    gather: [
      "Your full legal name, and the full name you used at the time of the arrest.",
      "Your date of birth.",
      "The Virginia city or county where the case was disposed of, and which court it was in.",
      "The charge and the Code section it was brought under. The section is what decides whether the automatic list reaches it at all.",
      "The date of the arrest and the agency that made it. It is not what the section turns on, but it is how the clerk and the State Police find the case.",
      "The date of the offence, which is the date the 1 January 1986 floor is measured against.",
      "The date of the conviction, which is the date the seven years run from.",
      "Every conviction anywhere since that date, other than a Virginia traffic infraction under Title 46.2.",
      "Anything else you were convicted of on the same date as this case."
    ],
    sequence: [
      AUTOMATIC_IS_NOT_A_REPORT,
      "Check the Code section first. Section 19.2-392.6(A) is a closed list of seven provisions, and an offence outside it is not reached by this route however long it is left. Section 4.1-305 and subsection A of § 18.2-265.3 are worth naming here because they sit on the § 19.2-392.12:1(A) petition list and not on the automatic one: a conviction under either will only ever be reached by petitioning.",
      "Check the offence date against the 1 January 1986 floor. It is the date of the offence, not the date of the conviction or the arrest.",
      "Count the seven years from the date of the conviction, and count what falls inside them honestly. A conviction anywhere in that period, of any law requiring a report to the Central Criminal Records Exchange under § 19.2-390(A) or of any other state, the District of Columbia, the United States or any territory, resets what the section requires. Virginia traffic infractions under Title 46.2 are the one exclusion.",
      "Check what else was entered on the date of the conviction. Section 19.2-392.6(C) blocks automatic sealing where the person was convicted on that same date of another offence not eligible for automatic sealing.",
      PHASING_DISCLOSURE,
      ELECTRONIC_REVIEW_LIMIT,
      SEALING_IS_NOT_EXPUNGEMENT,
      SEALED_RECORD_STILL_USED,
      PETITION_ROUTES_REMAIN_OPEN,
      STATUTORY_VERSION_UNSETTLED
    ],
    expectedNextStage:
      "If the section, the offence date, the seven years and the same-date test all hold, the record is the kind § 19.2-392.6 is written for. Whether and when the machinery reaches it is a separate question, and the verification sheet in this packet is how you find out.",
    extraCanPrepare: [
      "The read of the § 19.2-392.6(A) list against the charge you describe, and of where that list parts company with the § 19.2-392.12:1(A) petition list."
    ],
    escalations: [
      "You cannot tell from the papers which Code section the charge was brought under.",
      "You are not sure whether something that happened in the seven years counts as a reportable conviction.",
      "More than one thing was entered on the date of the conviction and you cannot tell what."
    ]
  }),

  "va-auto-seal-convictions-verification-plan": verificationSheet({
    templateId: "va-auto-seal-convictions-verification-plan",
    mechanismName: "Checking whether an enumerated Virginia conviction has in fact been sealed",
    whyNotAFiling:
      "This is a plan for reading your own criminal history record. Nothing on it is filed, and there is no petition, application or request on the § 19.2-392.6 route for LegalEase to prepare.",
    whatToLookFor: [
      "Find the entry for this case on the copy. Read the charge, the Code section and the disposition date against what you wrote down, and treat the record as the thing that counts where they disagree — the section on the record is what the State Police will have run their electronic review against.",
      "A sealed entry is restricted rather than absent. What the copy shows you is whether the record is still being disclosed in the ordinary way, which is the question this route turns on.",
      "Check whether anything else was entered on the date of the conviction that you had forgotten. Section 19.2-392.6(C) turns on exactly that, and the record is where you will see it."
    ],
    cadence:
      "Check again on the mechanism's own cadence rather than continuously. Lists move to participating circuit court clerks on an at-least-annual basis, so a check every few months tells you as much as a check every week and costs a great deal less. Once the State Police verification portal exists, that is where to look."
  }),

  "va-auto-seal-convictions-fallback-routing": fallbackSheet({
    templateId: "va-auto-seal-convictions-fallback-routing",
    mechanismName: "What is still open where an enumerated Virginia conviction has not sealed itself",
    whyNotAFiling:
      "This page routes you. Nothing on it is filed and nothing on it is a petition; the routes it names are separate LegalEase tracks with their own packets.",
    whyItMayNotHaveSealed: [
      "The charge may sit outside the seven provisions in § 19.2-392.6(A). Section 4.1-305 and subsection A of § 18.2-265.3 are the two that catch people out, because they are on the § 19.2-392.12:1(A) petition list and not on the automatic one.",
      "The offence date may fall before 1 January 1986, which is the floor the automatic route sets.",
      "A conviction during the seven years, or another ineligible conviction entered on the same date under § 19.2-392.6(C), may have taken the record out of the route.",
      ELECTRONIC_REVIEW_LIMIT,
      "Or the machinery may simply not have reached it yet. Nothing on this sheet tells you which of these it is, and neither the State Police nor the court will write to tell you."
    ]
  }),

  // ---- va_auto_seal_nonconvictions ----------------------------------------
  "va-auto-seal-nonconvictions-seal-or-expunge": automaticSheet({
    templateId: "va-auto-seal-nonconvictions-seal-or-expunge",
    mechanismName: "A Virginia charge that ended without a conviction: sealing, expungement, and the choice between them",
    whyNotAFiling:
      "Nothing is filed and nothing is applied for on the automatic route. Sections 19.2-392.8 and 19.2-392.10 work through the State Police electronic review, the Office of the Executive Secretary and the circuit court clerks. The comparison on this page names a petition route, but no petition is generated here and nothing on this sheet is filed anywhere.",
    prerequisites: [
      "The case is a Virginia case and it ended without a conviction: an acquittal, a nolle prosequi, or a dismissal.",
      "You understand that this route restricts access to the record rather than removing it.",
      "You have read what § 19.2-392.13 keeps sealed records available for, below, before deciding that sealing is what you want."
    ],
    gather: [
      "Your full legal name, and the full name you used at the time of the arrest.",
      "Your date of birth.",
      "The Virginia city or county where the case was disposed of, and which court it was in.",
      "The charge and the Code section it was brought under.",
      "The date of the arrest and the agency that made it.",
      "How the case ended and on what date.",
      "Whether the dismissal followed a stipulation, or a judicial finding of facts sufficient to find guilt. This is the one answer that changes which remedy is open to you.",
      "Whether the record still shows on a background check."
    ],
    sequence: [
      AUTOMATIC_IS_NOT_A_REPORT,
      "There are two remedies here and they are not the same thing. Automatic sealing under §§ 19.2-392.8 and 19.2-392.10 costs nothing, requires no filing and restricts access to the record. Expungement under § 19.2-392.2 is a petition in the circuit court, carries no court filing fee under subsection A of that section, and removes the record. This page presents that choice and does not steer it.",
      SEALING_IS_NOT_EXPUNGEMENT,
      SEALED_RECORD_STILL_USED,
      "One answer decides whether the expungement door is open at all. Where a charge was dismissed after a stipulation, or after a judicial finding of facts sufficient to find guilt, that is the situation the Dotson line of authority addresses and expungement is the remedy that does not reach it. Sealing may still reach the record. That is a real difference and it is worth knowing before you choose.",
      PHASING_DISCLOSURE,
      ELECTRONIC_REVIEW_LIMIT,
      PETITION_ROUTES_REMAIN_OPEN,
      "Cost is a fair thing to weigh. Sealing is free and you wait; the petition routes move on your timetable and involve a court. Neither answer is the right one for everybody and LegalEase is not going to tell you which is yours.",
      STATUTORY_VERSION_UNSETTLED
    ],
    expectedNextStage:
      "You leave this sheet knowing which of the two remedies fits what you actually want. If it is sealing, the verification sheet tells you how to check. If it is removal, the expungement track is a different packet and this one does not prepare it.",
    extraCanPrepare: [
      "The side-by-side comparison of automatic sealing and expungement, with what each one does to the record.",
      "The list of what § 19.2-392.13 keeps a sealed record available for, so the comparison is made on the real terms rather than on the word sealed."
    ],
    escalations: [
      "You cannot tell from the papers whether the dismissal followed a stipulation or a finding of facts sufficient for guilt.",
      "The choice between restriction and removal turns on something specific to your situation, such as a licensing body's rules."
    ]
  }),

  "va-auto-seal-nonconvictions-verification-plan": verificationSheet({
    templateId: "va-auto-seal-nonconvictions-verification-plan",
    mechanismName: "Checking whether a Virginia non-conviction has in fact been sealed",
    whyNotAFiling:
      "This is a plan for reading your own criminal history record. Nothing on it is filed, and no petition, application or request exists on the automatic non-conviction route for LegalEase to prepare.",
    whatToLookFor: [
      "Find the entry for this case on the copy and read the disposition against what you wrote down. An acquittal, a nolle prosequi and a dismissal are three different entries and they are not always recorded the way people remember them.",
      "Check whether the entry is still being disclosed in the ordinary way. That, rather than the absence of the entry, is what this route changes.",
      "If you are weighing expungement instead, read the disposition line carefully for any note that the case was dismissed after a stipulation or a finding of facts sufficient for guilt. That is the answer that decides whether removal is available."
    ],
    cadence:
      "Check again on the mechanism's own cadence rather than continuously. Distribution to participating circuit court clerks runs on an at-least-annual basis, so a check every few months is proportionate. Once the State Police verification portal exists, that is where to look."
  }),

  "va-auto-seal-nonconvictions-fallback-routing": fallbackSheet({
    templateId: "va-auto-seal-nonconvictions-fallback-routing",
    mechanismName: "What is still open where a Virginia non-conviction has not sealed itself",
    whyNotAFiling:
      "This page routes you. Nothing on it is filed and nothing on it is a petition; the routes it names are separate LegalEase tracks with their own packets.",
    whyItMayNotHaveSealed: [
      "The disposition may not be recorded the way you remember it, and the electronic review reads the record rather than your account of it.",
      ELECTRONIC_REVIEW_LIMIT,
      "Or the machinery may simply not have reached it yet, and nobody will write to tell you either way.",
      "Where what you want is removal rather than restriction, none of that matters much: expungement under § 19.2-392.2 is the remedy to ask about, and it does not wait on the automatic machinery at all."
    ]
  }),

  // ---- va_auto_seal_clean_record ------------------------------------------
  "va-auto-seal-clean-record-who-it-reaches": automaticSheet({
    templateId: "va-auto-seal-clean-record-who-it-reaches",
    mechanismName: "The Virginia misdemeanour non-conviction route for a person with no other record",
    whyNotAFiling:
      "Nothing is filed and nothing is applied for. Section 19.2-392.11 works through the State Police electronic review, the Office of the Executive Secretary and those circuit court clerks whose case management systems interface with the State Police under § 17.1-502(B1). No petition, application or request exists for this route, so none is generated.",
    prerequisites: [
      "The case is a Virginia case, the charge was a misdemeanour, and it ended in an acquittal, a nolle prosequi or a dismissal.",
      "Your criminal history record carries no convictions and no deferred and dismissed offences. Section 19.2-392.11 is written for an otherwise clean record and a single entry of either kind takes you out of it.",
      "You understand that a record can be reached by a different section of Chapter 23.2 even where this one does not reach it."
    ],
    gather: [
      "Your full legal name, and the full name you used at the time of the arrest.",
      "Your date of birth.",
      "The Virginia city or county where the case was disposed of, and which court it was in.",
      "Whether the charge was a misdemeanour or a felony.",
      "The charge, the Code section it was brought under, and how and when the case ended.",
      "Every other entry on your criminal history record, including any deferred and dismissed offence. This section turns on the rest of the record, not just on this case."
    ],
    sequence: [
      AUTOMATIC_IS_NOT_A_REPORT,
      "Read the eligibility rule plainly, because it is stricter than people expect. Section 19.2-392.11 reaches misdemeanour offences that ended in acquittal, nolle prosequi or dismissal, for a person with no convictions and no deferred and dismissed offences on their criminal history record. One conviction anywhere, or one deferred dismissal, and this section is not the one that reaches the case.",
      "That does not mean nothing reaches it. Sections 19.2-392.8 and 19.2-392.10 are the general non-conviction sections and they do not carry the clean-record condition. Being outside this section is not being outside Chapter 23.2.",
      "The mechanism is why the timing is uneven. The State Police list goes to the Office of the Executive Secretary and to circuit court clerks whose case management systems interface with the State Police under § 17.1-502(B1), and the Executive Secretary distributes to participating clerks on an at-least-annual basis. Two identical records can therefore seal at different times in different courts, and neither participant has done anything differently.",
      "There is no participant-facing status source for this before the State Police verification portal is built. That is a gap in the machinery, not a gap in your case, and the verification sheet in this packet is how you work around it.",
      PHASING_DISCLOSURE,
      ELECTRONIC_REVIEW_LIMIT,
      SEALING_IS_NOT_EXPUNGEMENT,
      SEALED_RECORD_STILL_USED,
      STATUTORY_VERSION_UNSETTLED
    ],
    expectedNextStage:
      "If the charge was a misdemeanour, the case ended without a conviction and the rest of the record is clean, this is the section written for it. When the machinery reaches the record is a separate question, and the verification sheet is how you find out.",
    extraCanPrepare: [
      "The read of the clean-record condition, and of which other Chapter 23.2 section takes over where it is not met.",
      "The explanation of why two identical records can seal at different times, so an unsealed record is not read as a refusal."
    ],
    escalations: [
      "You are not sure whether something on your record counts as a deferred and dismissed offence.",
      "You do not know whether the circuit court in your locality interfaces with the State Police under § 17.1-502(B1).",
      "The record shows an entry you do not recognise."
    ]
  }),

  "va-auto-seal-clean-record-verification-plan": verificationSheet({
    templateId: "va-auto-seal-clean-record-verification-plan",
    mechanismName: "Checking whether a Virginia misdemeanour non-conviction has in fact been sealed",
    whyNotAFiling:
      "This is a plan for reading your own criminal history record. Nothing on it is filed, and no petition, application or request exists on the § 19.2-392.11 route for LegalEase to prepare.",
    whatToLookFor: [
      "Find the entry for this case and read the charge level, the Code section and the disposition against what you wrote down.",
      "Read the rest of the record as carefully as you read this entry. Section 19.2-392.11 turns on the whole record being clean, and a deferred and dismissed offence you had stopped thinking about is exactly the sort of thing that shows up here.",
      "Note which locality the case was disposed of in. Timing under this section varies by court, so a record that has not sealed in one place tells you nothing about a record in another."
    ],
    cadence:
      "Check again on the mechanism's own cadence rather than continuously. The Executive Secretary distributes to participating circuit court clerks on an at-least-annual basis, so a check every few months is proportionate. Once the State Police verification portal exists, that is where to look."
  }),

  "va-auto-seal-clean-record-fallback-routing": fallbackSheet({
    templateId: "va-auto-seal-clean-record-fallback-routing",
    mechanismName: "What is still open where the Virginia clean-record sealing route has not reached a case",
    whyNotAFiling:
      "This page routes you. Nothing on it is filed and nothing on it is a petition; the routes it names are separate LegalEase tracks with their own packets.",
    whyItMayNotHaveSealed: [
      "The record may carry a conviction or a deferred and dismissed offence, which takes the case outside § 19.2-392.11 whatever else is true of it.",
      "The charge may have been a felony rather than a misdemeanour, in which case the general non-conviction sections are the ones to look at.",
      "The circuit court where the case was disposed of may not yet be one whose case management system interfaces with the State Police under § 17.1-502(B1).",
      ELECTRONIC_REVIEW_LIMIT,
      "Or the at-least-annual distribution may simply not have come round yet for that court.",
      "Whichever of those it is, the record itself is where you find out. There is no participant-facing status source for § 19.2-392.11 before the State Police verification portal is built, and nobody writes to tell you which of these five applies to you."
    ]
  }),

  // ---- va_auto_seal_without_order -----------------------------------------
  "va-auto-seal-without-order-already-sealed": automaticSheet({
    templateId: "va-auto-seal-without-order-already-sealed",
    mechanismName: "Former Virginia marijuana possession offences and traffic infractions, sealed without any court order",
    whyNotAFiling:
      "Nothing is filed, nothing is applied for and no order is entered. Section 19.2-392.6:1 seals former possession of marijuana offences without entry of any court order, and § 19.2-392.17 deems traffic infractions sealed. Both operate by force of statute, so there is no petition, application or request for LegalEase to prepare.",
    prerequisites: [
      "The record is a former Virginia possession of marijuana offence under § 19.2-392.6:1, or a traffic infraction reached by § 19.2-392.17.",
      "You understand that this route produces no order and no notice, so there is no document coming to you and nothing arriving in the post to confirm it.",
      "You have read the case papers for anything docketed alongside the offence, because that is the part these two sections do not reach."
    ],
    documentsToObtain: [
      `A copy of ${VA_RECORD_CHECK}, together with the date you requested it.`,
      "The court papers for any probation violation, contempt, failure to appear or bail appeal attached to the same case, if there was one. Those are the matters this route does not reach."
    ],
    gather: [
      "Your full legal name, and the full name you used at the time of the arrest.",
      "Your date of birth.",
      "The Virginia city or county where the case was disposed of, and which court it was in.",
      "Whether the record is a former marijuana possession offence or a traffic infraction. Those are the only two things these sections reach.",
      "The date of the arrest and the agency that made it, and the date of the offence and the date the case ended.",
      "Whether anything else was attached to the same case: a probation violation, a contempt, a failure to appear or a bail appeal."
    ],
    sequence: [
      "These records are sealed by force of statute. Section 19.2-392.6:1 seals former possession of marijuana offences without entry of any court order, and § 19.2-392.17 deems traffic infractions sealed. There is no petition, no order, no fee and nothing for you to do.",
      NO_CHARGE_FOR_STATUTORY_SEALING,
      AUTOMATIC_IS_NOT_A_REPORT,
      SEALING_IS_NOT_EXPUNGEMENT,
      SEALED_RECORD_STILL_USED,
      "One thing on the same case may still need dealing with. An ancillary matter attached to a § 19.2-392.6:1 sealed offence — a probation violation, a contempt, a failure to appear or a bail appeal — is not sealed along with the offence it hangs off. Section 19.2-392.12:1(B) is the route for that matter, and it is worth knowing that it applies whatever the offence date: this is the one place in Chapter 23.2 where the 1 January 1986 floor does not bite.",
      "So the practical question on this route is usually not whether the offence is sealed but whether something attached to it is not. Read the case papers for anything that was docketed alongside it.",
      "The wider Chapter 23.2 automatic-sealing machinery is still phasing in and cannot be relied on: it took effect on 1 July 2026, the Virginia State Police verification portal is due on 1 October 2026, and the Norfolk Circuit Court Clerk describes automatic sealing as phasing in on that date. This route does not wait on any of that, because §§ 19.2-392.6:1 and 19.2-392.17 do their work without a list and without an order. It matters only for anything else on your record.",
      "Confirm the position against your own record rather than assuming it. The verification sheet in this packet sets out how.",
      "Because these two sections do the work themselves, there is no list for the State Police to compile on this route and no clerk to wait on. The distribution through the Office of the Executive Secretary that the rest of Chapter 23.2 runs on does not apply here at all, which is why nothing on this route has a timetable attached to it.",
      PRIVATE_VENDORS,
      STATUTORY_VERSION_UNSETTLED
    ],
    expectedNextStage:
      "Nothing is pending on the offence itself; the statute has already done what it does. What may be pending is an ancillary matter attached to the same case, and the fallback sheet in this packet names the route for it.",
    extraCanPrepare: [
      "The explanation of which ancillary matters are left outside § 19.2-392.6:1, and of the § 19.2-392.12:1(B) route that reaches them."
    ],
    escalations: [
      "You cannot tell from the papers whether something was docketed alongside the offence.",
      "The offence is not clearly a former marijuana possession offence or a traffic infraction.",
      "A vendor's report still shows the record long after you have confirmed the official position."
    ]
  }),

  "va-auto-seal-without-order-verification-plan": verificationSheet({
    templateId: "va-auto-seal-without-order-verification-plan",
    mechanismName: "Confirming the position on a Virginia record sealed without a court order",
    whyNotAFiling:
      "This is a plan for reading your own criminal history record. Nothing on it is filed, and §§ 19.2-392.6:1 and 19.2-392.17 provide no petition, application or request for LegalEase to prepare.",
    whatToLookFor: [
      "Find the entry and read what kind of record it is recorded as. The two sections reach former marijuana possession offences and traffic infractions; anything recorded as something else runs on a different part of Chapter 23.2.",
      "Look for anything docketed alongside it — a probation violation, a contempt, a failure to appear, a bail appeal. Those are not sealed with the offence and they are the reason to read the whole case rather than the one line.",
      "Because no order is entered on this route, there is no order to look for and none will be sent to you. The copy you pull is the whole of the evidence you will hold."
    ],
    cadence:
      "There is no distribution cadence to wait on here, because nothing is being distributed: the sealing is done by the statute. One check confirms the position, and a second is only worth making if something about the case changes."
  }),

  "va-auto-seal-without-order-fallback-routing": fallbackSheet({
    templateId: "va-auto-seal-without-order-fallback-routing",
    mechanismName: "What is still open on a Virginia case sealed without a court order",
    whyNotAFiling:
      "This page routes you. Nothing on it is filed and nothing on it is a petition; the routes it names are separate LegalEase tracks with their own packets.",
    whyItMayNotHaveSealed: [
      "The record may not be a former marijuana possession offence or a traffic infraction at all, in which case the ordinary automatic-sealing sections are the ones to look at and they do involve an order.",
      "An ancillary matter attached to the offence — a probation violation, a contempt, a failure to appear or a bail appeal — is not sealed with it. Section 19.2-392.12:1(B) is the route for that matter, and it applies whatever the offence date, which is the one place in Chapter 23.2 where the 1 January 1986 floor does not bite.",
      "A commercial vendor's report may lag the official record by months, which is a problem with the vendor rather than with the sealing.",
      SEALED_RECORD_STILL_USED,
      "Or nothing may be wrong at all. There is no order to look for on this route, so a copy that shows nothing unusual may simply be showing you a record doing what §§ 19.2-392.6:1 and 19.2-392.17 say it does.",
      ELECTRONIC_REVIEW_LIMIT
    ]
  }),

  // ---- va_exp_actual_innocence --------------------------------------------
  "va-exp-actual-innocence-what-happens-next": {
    templateId: "va-exp-actual-innocence-what-happens-next",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "After a Virginia writ of actual innocence: the expungement the court enters on its own",
    whyNotAFiling:
      "Nothing is filed by you and nothing is applied for. Under Va. Code § 19.2-392.2(J), on receiving a copy of a writ vacating a conviction under § 19.2-327.5 or § 19.2-327.13, the court shall enter an order requiring expungement of the police and court records relating to the charge and conviction, and the order shall state that it is entered under that subsection. No petition, no application, no waiting period and no fee are prescribed, so none is generated here.",
    processType: "court_adjacent",
    prerequisites: [
      "A court has granted a writ of actual innocence under Va. Code § 19.2-327.5 or § 19.2-327.13 vacating the conviction.",
      "You know which circuit court entered the conviction that was vacated. That is the court whose duty this is.",
      "You have, or can get, a copy of the writ. The court's duty turns on its receipt of that document."
    ],
    documentsToObtain: [
      "A copy of the writ vacating the conviction, from the counsel who obtained it or from the clerk of the court that granted it. It is the document § 19.2-392.2(J) turns on.",
      `A copy of ${VA_RECORD_CHECK}, requested in your own name, with the date you requested it.`
    ],
    participantDataToGather: [
      "The date the writ was granted, and which court granted it.",
      "Which of § 19.2-327.5 or § 19.2-327.13 the writ was granted under, if the paperwork says.",
      "Which circuit court entered the conviction that was vacated, and the case number there.",
      "Whether you still have the lawyer who obtained the writ, and how to reach them.",
      "Whether the conviction still shows on your criminal history record, and the date you last looked."
    ],
    officialDestination: {
      name: "The circuit court that entered the vacated conviction",
      detail:
        "Nothing is submitted by you. The order issues on that court's receipt of the writ, and the order itself must state that it is entered under § 19.2-392.2(J). This sheet explains what you should see happen and how to confirm it."
    },
    actionSequence: [
      "Start with what the subsection actually does. On receiving a copy of the writ, the court shall enter an order requiring expungement of the police and court records relating to the charge and the conviction. The duty is the court's, the trigger is its receipt of the writ, and there is nothing on your side of it.",
      "Be clear about what is outside this packet. Obtaining a writ of actual innocence under § 19.2-327.5 or § 19.2-327.13 is appellate post-conviction litigation in the Court of Appeals or the Supreme Court of Virginia. The adopted product scope does not reach it, and by the time a writ issues the person who holds it has been represented. LegalEase does not prepare that litigation and does not attempt it. That is a decision about what this service does, not a finding that the route cannot be run.",
      "So the first practical step is the one people skip: make sure the court that entered the conviction has a copy of the writ. Ask your counsel whether it was transmitted, and ask the clerk of that circuit court whether it was received.",
      "Then confirm the result rather than assuming it. Ask the Central Criminal Records Exchange for your own Virginia criminal history record, in your own name, and read the entry for the vacated conviction on it.",
      "Expect the record and the court's file to move at different speeds. The Central Criminal Records Exchange validates the accuracy of what it holds; it does not decide whether an expungement was due, and it acts on what it receives.",
      SEALING_IS_NOT_EXPUNGEMENT,
      PRIVATE_VENDORS,
      "Where the court has the writ and no order has been entered, that is a question about the court's own record. Raise it with the counsel who obtained the writ, or with the clerk of that circuit court. It is not something a new self-help filing addresses, and this packet does not prepare one.",
      "One date is worth noting. Section 19.2-392.2 is published in two versions, one effective until 1 December 2026 and one effective from that date, and this sheet was written against the earlier one. Which version governs on either side of that date has not been settled here, and this page does not decide it."
    ],
    submissionMethod:
      "There is nothing to submit. No petition, application or request exists on this route, and the request you make to the Central Criminal Records Exchange is your own record request rather than a filing.",
    fees: "No fee is stated in § 19.2-392.2(J) for the order. The Central Criminal Records Exchange charges its own fee for a person's own criminal history record; ask the State Police what it is when you request the copy.",
    feeWaiver: "None is recorded. There is no court fee on this route because there is no filing.",
    noticeOrService: [
      "No notice is prescribed and nothing is served by you.",
      "Nobody is required to write and tell you when the order has been entered, which is why the confirming step above is on the sheet."
    ],
    expectedNextStage:
      "The circuit court enters the expungement order on its receipt of the writ, and the entry for the vacated conviction should in time stop being disclosed in the ordinary way. Confirm that on your own copy of the record rather than taking it on trust.",
    legalEaseCanPrepare: [
      "This explanation of what § 19.2-392.2(J) requires of the court and what it does not require of you.",
      "The verification plan that follows it in this packet.",
      "A plain statement of what sits outside this service and who to take it to."
    ],
    legalEaseCannotPerform: [
      ...VA_CANNOT_PERFORM,
      "LegalEase does not prepare or litigate a writ of actual innocence under § 19.2-327.5 or § 19.2-327.13. That is appellate post-conviction work and it is outside the adopted scope. It is not a finding that the writ cannot be sought."
    ],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "Your immigration status could be affected by the record.",
      "The writ has not been granted yet, in which case the writ itself, not this sheet, is the thing to be working on.",
      "The court has the writ and no order has been entered.",
      "You no longer have the counsel who obtained the writ and do not know who to ask."
    ],
    officialSourceReferences: VA_INNOCENCE_SOURCES
  },

  "va-exp-actual-innocence-verification-plan": {
    templateId: "va-exp-actual-innocence-verification-plan",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Confirming that the Virginia expungement order after a writ of actual innocence has been entered",
    whyNotAFiling:
      "This is a plan for reading your own criminal history record and for asking the right person the right question. Nothing on it is filed, and § 19.2-392.2(J) provides no petition, application or request for LegalEase to prepare.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the explanation sheet that comes before this one in the packet.",
      "You know which circuit court entered the vacated conviction, and you have or can get a copy of the writ."
    ],
    documentsToObtain: [
      "A copy of the writ vacating the conviction.",
      `A copy of ${VA_RECORD_CHECK}, requested in your own name, with the date you requested it.`
    ],
    participantDataToGather: [
      "The name the conviction was entered under, and any other name the record could sit under.",
      "Your date of birth.",
      "The circuit court that entered the vacated conviction, and the case number there.",
      "The date the writ was granted and the date, if you know it, that a copy reached that circuit court.",
      "The date of each check you make on the record."
    ],
    officialDestination: {
      name: "The clerk of the circuit court that entered the vacated conviction, and the Virginia State Police, Central Criminal Records Exchange",
      detail:
        "The clerk's office is where the court's own order book is kept, so that is where the question whether an order under § 19.2-392.2(J) has been entered is answered. The Central Criminal Records Exchange is where the criminal history record is held and is where you request your own copy. Neither is contacted by LegalEase."
    },
    actionSequence: [
      "Confirm first that the circuit court has the writ, because the duty under § 19.2-392.2(J) arises on its receipt of that copy and on nothing else. Ask your counsel whether it was transmitted; ask the clerk whether it was received.",
      "Ask the clerk of that circuit court whether an order has been entered under § 19.2-392.2(J). The subsection requires the order to say on its face that it is entered under that subsection, so it is a specific thing to ask for rather than a vague one.",
      "Then ask the Central Criminal Records Exchange for your own Virginia criminal history record, in your own name, and read the entry for the vacated conviction on it.",
      "Allow for the two records moving at different speeds. A court order and a criminal history record are kept by different bodies, and the second follows the first rather than arriving with it.",
      "Record what you found and the date you found it, and keep the dated copy. Where a record has in fact been expunged, that copy is the evidence you will hold that it happened.",
      "Check again after a reasonable interval rather than continuously, and do not read a lag as a refusal. Nothing on this page tells you how long the court or the Exchange will take, because nobody has told us.",
      PRIVATE_VENDORS,
      "Where the court has the writ and nothing has been entered after that, take it to the counsel who obtained the writ. If you no longer have that counsel, take it to the clerk of the circuit court first and then to " + VA_LEGAL_HELP + ". Do not file a new self-help application about it: § 19.2-392.2(J) does not contemplate one and this packet does not prepare one."
    ],
    submissionMethod:
      "Nothing on this sheet is submitted anywhere. The questions it sets out are questions to ask, and the record request is your own.",
    fees: "No fee is stated for the order. The Central Criminal Records Exchange charges its own fee for a person's own criminal history record.",
    feeWaiver: "None is recorded, and there is no court fee on this route because there is no filing.",
    noticeOrService: [
      "Nothing is served and nobody is notified by you.",
      "You are not written to when the order is entered, which is why this sheet asks you to go and look."
    ],
    expectedNextStage:
      "Either the order has been entered and the record follows it, or the court has the writ and something has not moved, in which case the person to raise it with is the counsel who obtained the writ rather than a new filing.",
    legalEaseCanPrepare: [
      "This verification plan.",
      "The specific questions to put to the clerk of the circuit court.",
      "A plain statement of where the route goes when the order has not been entered.",
      "The referral back to the counsel who obtained the writ, which is where a stalled order belongs rather than in a new self-help filing."
    ],
    legalEaseCannotPerform: [
      ...VA_CANNOT_PERFORM,
      "LegalEase does not prepare or litigate a writ of actual innocence under § 19.2-327.5 or § 19.2-327.13, and does not prepare any follow-up application about an order the court has not entered."
    ],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "Your immigration status could be affected by the record.",
      "The clerk tells you no order has been entered and cannot say whether the writ was received.",
      "The record still shows the conviction long after the order was entered.",
      "You no longer have the counsel who obtained the writ."
    ],
    officialSourceReferences: VA_INNOCENCE_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

type ComponentSpec = { componentId: string; templateId: string };

function packetSet(trackId: string, components: readonly ComponentSpec[]): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: components.map((component, index) => {
      if (!VIRGINIA_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Virginia guidance template ${component.templateId} is registered.`
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
        requirement: "required" as const,
        order: index + 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      };
    })
  };
}

/**
 * Asked on every Virginia route in this family, in this order.
 *
 * The eligibility-advice boundary and the immigration screen run on all five
 * assigned tracks because the design stops on both everywhere. The firearm
 * screen is asked on the four automatic tracks, where § 19.2-392.13 makes it a
 * live trap; the post-writ track does not carry it.
 */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want advice about whether your particular record qualifies?",
    required: true
  },
  {
    key: "immigrationQuestion",
    label:
      "Could your immigration status be affected by this — for example, are you not a United States citizen?",
    required: true
  }
];

const AUTOMATIC_SHARED_INPUTS: readonly RequiredInput[] = [
  ...SHARED_INPUTS,
  {
    key: "firearmEligibilityQuestion",
    label: "Is the question you actually have about whether you may possess a firearm?",
    required: true
  },
  {
    key: "wantsRemovalNotRestriction",
    label: "Do you want the record removed altogether, rather than access to it restricted?",
    required: true
  },
  {
    key: "dismissedAfterFactsSufficientForGuilt",
    label:
      "Was the case dismissed after you stipulated, or after a judge found facts sufficient to find guilt?",
    required: true
  },
  {
    key: "needsReliefOnATimetable",
    label: "Is there a date by which you need this record dealt with?",
    required: true
  },
  {
    key: "dispositionIsPaperEraOrAmbiguous",
    label:
      "Is the case old enough, or the disposition unclear enough, that it may only exist on paper?",
    required: true
  },
  { key: "petitionerName", label: "What is your full legal name, and the full name you used at the time of arrest?", required: true },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  { key: "dispositionLocality", label: "In which Virginia county or city was the case disposed of?", required: true },
  {
    key: "courtLevel",
    label:
      "Was the case in general district court, juvenile and domestic relations district court, or circuit court?",
    required: true
  },
  { key: "chargeIdentity", label: "What was the charge, and which Code section was it under?", required: true },
  { key: "arrestDate", label: "On what date were you arrested, and which agency arrested you?", required: true },
  { key: "dispositionDetail", label: "How did the case end, and on what date?", required: true },
  { key: "offenseDate", label: "On what date did the offence happen?", required: true },
  {
    key: "recordCategory",
    label: "Did the case end in a conviction, an acquittal, a nolle prosequi, or a dismissal?",
    required: true
  },
  {
    key: "recordStillVisible",
    label: "Does the record still show up on a background check or on your criminal history?",
    required: true
  }
];

function virginiaTrack(input: {
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
    jurisdiction: "VA",
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

export const VIRGINIA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  virginiaTrack({
    trackId: "va_auto_seal_convictions",
    publicName: "Some minor Virginia convictions seal themselves after seven clean years",
    mechanism: "automatic_sealing_of_enumerated_misdemeanor_convictions",
    authority: "Va. Code §§ 19.2-392.6 and 19.2-392.7; § 19.2-390(A); § 19.2-392.13",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    components: [
      {
        componentId: "va_auto_seal_convictions-process-guidance-1",
        templateId: "va-auto-seal-convictions-what-seals"
      },
      {
        componentId: "va_auto_seal_convictions-verification-plan-2",
        templateId: "va-auto-seal-convictions-verification-plan"
      },
      {
        componentId: "va_auto_seal_convictions-fallback-routing-3",
        templateId: "va-auto-seal-convictions-fallback-routing"
      }
    ],
    requiredInputs: [
      ...AUTOMATIC_SHARED_INPUTS,
      {
        key: "automaticOffenceList",
        label:
          "Is the offence one of the seven provisions on the automatic list in § 19.2-392.6(A), or is it § 4.1-305, or subsection A of § 18.2-265.3, or something else?",
        required: true
      },
      { key: "offenceDateBefore1986", label: "Did the offence happen before 1 January 1986?", required: true },
      {
        key: "sameDateIneligibleConviction",
        label: "Were you convicted of anything else on the same date as this conviction?",
        required: true
      },
      {
        key: "reportableConvictionSince",
        label:
          "Have you been convicted of anything, anywhere, since that conviction? Virginia traffic infractions under Title 46.2 do not count.",
        required: true
      },
      {
        key: "sevenYearsHaveRun",
        label: "Have seven years passed since the date of the conviction?",
        required: true
      }
    ],
    assembledPacketName: "virginia-automatic-sealing-convictions",
    assembledPacketTitle: "Virginia automatic sealing — enumerated convictions",
    customerDeliverableDescription:
      "Explains which minor Virginia convictions seal themselves under §§ 19.2-392.6 and 19.2-392.7, how to check whether it has happened, and which petition route remains open if it has not. Nothing is filed and no fee is charged.",
    notes:
      "Process guidance only. Nothing is submitted by the participant at any point: the State Police compile the lists, the Executive Secretary distributes them and the courts enter the orders."
  }),

  virginiaTrack({
    trackId: "va_auto_seal_nonconvictions",
    publicName: "Virginia charges that ended without a conviction can seal themselves",
    mechanism: "automatic_sealing_of_offences_not_resulting_in_conviction",
    authority: "Va. Code §§ 19.2-392.8 and 19.2-392.10; § 19.2-392.13; § 19.2-392.2",
    recordTypes: ["charge", "arrest"],
    dispositions: ["acquitted", "nolle_prosequi", "dismissed"],
    components: [
      {
        componentId: "va_auto_seal_nonconvictions-process-guidance-1",
        templateId: "va-auto-seal-nonconvictions-seal-or-expunge"
      },
      {
        componentId: "va_auto_seal_nonconvictions-verification-plan-2",
        templateId: "va-auto-seal-nonconvictions-verification-plan"
      },
      {
        componentId: "va_auto_seal_nonconvictions-fallback-routing-3",
        templateId: "va-auto-seal-nonconvictions-fallback-routing"
      }
    ],
    requiredInputs: AUTOMATIC_SHARED_INPUTS,
    assembledPacketName: "virginia-automatic-sealing-nonconvictions",
    assembledPacketTitle: "Virginia automatic sealing — charges that ended without a conviction",
    customerDeliverableDescription:
      "Sets automatic sealing and expungement side by side for a Virginia charge that ended without a conviction, explains what sealing leaves available under § 19.2-392.13, and shows how to check and where to go next. Nothing is filed and no fee is charged.",
    notes:
      "Process guidance only. The choice between free automatic sealing and a petition for removal is presented rather than steered."
  }),

  virginiaTrack({
    trackId: "va_auto_seal_clean_record",
    publicName: "A Virginia misdemeanour charge that ended without a conviction, for someone with no other record",
    mechanism: "automatic_sealing_of_misdemeanor_non_convictions_clean_record",
    authority: "Va. Code § 19.2-392.11; § 17.1-502(B1); § 19.2-392.13",
    recordTypes: ["charge", "arrest"],
    dispositions: ["acquitted", "nolle_prosequi", "dismissed"],
    components: [
      {
        componentId: "va_auto_seal_clean_record-process-guidance-1",
        templateId: "va-auto-seal-clean-record-who-it-reaches"
      },
      {
        componentId: "va_auto_seal_clean_record-verification-plan-2",
        templateId: "va-auto-seal-clean-record-verification-plan"
      },
      {
        componentId: "va_auto_seal_clean_record-fallback-routing-3",
        templateId: "va-auto-seal-clean-record-fallback-routing"
      }
    ],
    requiredInputs: [
      ...AUTOMATIC_SHARED_INPUTS,
      { key: "chargeLevel", label: "Was the charge a misdemeanour or a felony?", required: true },
      {
        key: "otherwiseCleanRecord",
        label:
          "Apart from this case, is your criminal history record free of any conviction and of any deferred and dismissed offence?",
        required: true
      }
    ],
    assembledPacketName: "virginia-automatic-sealing-clean-record",
    assembledPacketTitle: "Virginia automatic sealing — misdemeanour non-conviction, otherwise clean record",
    customerDeliverableDescription:
      "Explains the § 19.2-392.11 route for a Virginia misdemeanour that ended without a conviction where the rest of the record is clean, why the timing is uneven between courts, and which Chapter 23.2 section takes over where the clean-record condition is not met. Nothing is filed and no fee is charged.",
    notes:
      "Process guidance only. The clean-record condition is strict and the sheet says so; being outside § 19.2-392.11 is not being outside Chapter 23.2."
  }),

  virginiaTrack({
    trackId: "va_auto_seal_without_order",
    publicName: "Old Virginia marijuana possession charges and traffic infractions are already sealed",
    mechanism: "sealing_by_operation_of_statute_without_court_order",
    authority: "Va. Code §§ 19.2-392.6:1 and 19.2-392.17; § 19.2-392.12:1(B); § 19.2-392.13",
    recordTypes: ["conviction", "charge", "arrest"],
    dispositions: ["convicted", "acquitted", "nolle_prosequi", "dismissed"],
    components: [
      {
        componentId: "va_auto_seal_without_order-process-guidance-1",
        templateId: "va-auto-seal-without-order-already-sealed"
      },
      {
        componentId: "va_auto_seal_without_order-verification-plan-2",
        templateId: "va-auto-seal-without-order-verification-plan"
      },
      {
        componentId: "va_auto_seal_without_order-fallback-routing-3",
        templateId: "va-auto-seal-without-order-fallback-routing"
      }
    ],
    requiredInputs: [
      ...AUTOMATIC_SHARED_INPUTS,
      {
        key: "statutorySealCategory",
        label:
          "Is the record a former marijuana possession offence, a traffic infraction, or neither?",
        required: true
      },
      {
        key: "ancillaryMatterAttached",
        label:
          "Was anything else docketed with the case — a probation violation, a contempt, a failure to appear, or a bail appeal?",
        required: true
      }
    ],
    assembledPacketName: "virginia-sealed-without-a-court-order",
    assembledPacketTitle: "Virginia records sealed without a court order",
    customerDeliverableDescription:
      "Explains that former Virginia marijuana possession offences and traffic infractions are sealed by force of statute with no petition, order or fee, how to confirm the position, and the § 19.2-392.12:1(B) route for an ancillary matter that is not sealed with them. Nothing is filed and no fee is charged.",
    notes:
      "Process guidance only. Nobody is charged for a record that seals by operation of law; the live question on this route is usually the ancillary matter."
  }),

  virginiaTrack({
    trackId: "va_exp_actual_innocence",
    publicName: "Clearing a Virginia conviction vacated by a writ of actual innocence",
    mechanism: "expungement_on_court_receipt_of_a_writ_of_actual_innocence",
    authority: "Va. Code § 19.2-392.2(J) and (K); §§ 19.2-327.5 and 19.2-327.13",
    recordTypes: ["conviction"],
    dispositions: ["conviction_vacated", "actual_innocence"],
    components: [
      {
        componentId: "va_exp_actual_innocence-process-guidance-1",
        templateId: "va-exp-actual-innocence-what-happens-next"
      },
      {
        componentId: "va_exp_actual_innocence-verification-plan-2",
        templateId: "va-exp-actual-innocence-verification-plan"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "recordCategory",
        label: "Did the case end in a conviction, an acquittal, a nolle prosequi, or a dismissal?",
        required: true
      },
      {
        key: "writGranted",
        label: "Has a court granted a writ of actual innocence vacating your conviction?",
        required: true
      },
      { key: "writGrantedDate", label: "On what date was the writ granted?", required: true },
      {
        key: "writSection",
        label: "Was the writ granted under Va. Code § 19.2-327.5 or § 19.2-327.13, if the paperwork says?",
        required: true
      },
      {
        key: "convictingCourt",
        label: "Which circuit court entered the conviction that was vacated?",
        required: true
      },
      { key: "representedByCounsel", label: "Do you still have the lawyer who obtained the writ?", required: true },
      {
        key: "orderEntered",
        label: "Has that circuit court entered an order under § 19.2-392.2(J)?",
        required: true
      },
      {
        key: "recordStillVisible",
        label: "Does the conviction still show on your criminal history record?",
        required: true
      }
    ],
    assembledPacketName: "virginia-expungement-after-actual-innocence",
    assembledPacketTitle: "Virginia expungement after a writ of actual innocence",
    customerDeliverableDescription:
      "Explains the expungement order a Virginia circuit court must enter under § 19.2-392.2(J) on receiving a writ of actual innocence, what sits outside this service, how to confirm the order was entered, and who to raise it with if it was not. Nothing is filed and no fee is charged.",
    notes:
      "Process guidance only. The writ litigation itself is appellate post-conviction work and is outside the adopted scope; the deliverable is the downstream explanation, the verification plan and the referral back to counsel."
  })
];
