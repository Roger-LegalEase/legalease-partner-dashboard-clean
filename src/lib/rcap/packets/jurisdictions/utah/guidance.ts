// Utah process guidance — three automatic routes, one out-of-scope appellate
// route, and one adjacent routing node.
//
// Five assigned routes, all `process_guidance`, and none of them produces a
// participant submission.
//
// Three are relief by operation of law, and they are the commercially dangerous
// ones. Utah deletes traffic offense records on the court's own initiative under
// 77-40a-202; it expunges acquittals and dismissals with prejudice under
// 77-40a-206; and Clean Slate expunges qualifying misdemeanour convictions under
// 77-40a-205. Since 1 January 2026 the court identifies eligible cases on its
// own initiative under 77-40a-204(3), and form 1200EX is retired as an
// eligibility mechanism. Nothing is applied for on any of the three.
//
// The adopted design says why this family exists, and it is the opposite of an
// upsell:
//
//   Any Utah intake must screen for clean slate and automatic eligibility
//   before quoting a petition, and must show the participant the no-cost
//   automatic route and its timing before payment.
//
// So every sheet here leads with the free route and the timing, and the paid
// petition is named only as what to do when the free route does not reach the
// case or the participant cannot wait for it.
//
// Four things the adopted design forbids, and which no template here does.
//
// It does not say expungement deletes anything. Utah says "expungement", but
// under 77-40a-101 to expunge means to seal or otherwise restrict access to a
// record held by an agency. It is not destruction: BCI retains an expungement
// file released only on court order. The design records in terms that the BCI
// page's description of expungement as completely deleting all information about
// the charge must not be reproduced, so the statutory definition is what every
// sheet uses.
//
// It does not reproduce the retired form process. The BCI Clean Slate page still
// describes the 1 October 2024 to 1 January 2026 form process in the present
// tense; its eligibility lists remain usable and its process narrative must not
// be reproduced. These sheets say the form is no longer used and that the court
// identifies cases itself.
//
// It expresses no view on the statutory tension the design flags as a release
// blocker. Sections 77-40a-205(1)(a) and 77-40a-206(1)(a) still condition the
// court's order on a form submitted during the retired window, and those
// conditions were not conformed to the 77-40a-204(3) cutover. The design records
// that as a genuine internal tension and expressly takes no view on how it
// resolves. Neither does any sheet here: they report what the Utah Courts state
// about current practice, say plainly that part of the statutory text has not
// been squared with it and that LegalEase does not resolve it, and turn that
// into the practical instruction the design already gives — verify on My Court
// Case rather than assume.
//
// And it states no BCI processing time. The design records that the number moves
// and must be read live at intake, never stored, so no sheet carries one.
//
// The other two routes are boundaries. Appellate record expungement under
// Standing Order No. 12 is a drafted appellate petition with a proposed redacted
// judicial opinion, there are no forms for it, and the adopted readiness record
// places it outside self-help scope: that sheet refers out and explains what the
// route is so the referral is useful. And the 402 reduction node is not a
// record-clearing mechanism at all — the design places it in the Utah decision
// tree as a "not yet, but here is the path" branch, so that sheet names the
// reduction, explains why it can open an expungement route later, and refers the
// motion itself out as a sentencing remedy outside this product.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Utah is not
// an enabled jurisdiction and this job does not enable one. Utah's petition and
// official-form tracks are other jobs and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Where a Utah participant looks the case up. Named once. */
const UT_RECORD_CHECK =
  "the case itself on My Court Case, the Utah Courts public case search, and your own criminal history from the Bureau of Criminal Identification";

/** The commercial instruction the adopted design puts on the Utah intake. */
const FREE_ROUTE_FIRST =
  "Look at the free route and its timing before you pay for anything. Utah clears a great many records on the court's own initiative, at no cost, and a participant whose case is already on one of those routes should not be sold a petition.";

/** Said on every sheet in this family. */
const AUTOMATIC_IS_NOT_A_REPORT =
  "Automatic describes what the law requires of the court, not what has happened in your case. Nothing on this page tells you that the record has been cleared, and LegalEase has not looked. Checking for yourself is the only way to know.";

/**
 * The definition that governs, on every sheet.
 *
 * The design forbids reproducing the BCI page's "completely deletes all
 * information" description, and gives the statutory definition to use instead.
 */
const EXPUNGE_MEANS_SEAL =
  "Utah calls this expungement, and the word promises more than the statute delivers. Under 77-40a-101, to expunge means to seal or otherwise restrict access to a record held by an agency. It is not destruction. The Bureau of Criminal Identification keeps an expungement file, and that file is released on a court order.";

/** The 2026 cutover, stated without reproducing the retired form process. */
const COURT_IDENTIFIES_NOW =
  "Since 1 January 2026 the court identifies eligible cases on its own initiative under 77-40a-204(3). Form 1200EX, the Request for Automatic Expungement, is no longer used as a way of becoming eligible. If you have been told to send that form in, that guidance is out of date.";

/**
 * The release blocker, reported rather than resolved.
 *
 * The design records a genuine internal tension in the statute and expressly
 * takes no view on how it resolves. Neither does this sentence.
 */
const STATUTE_NOT_YET_SQUARED =
  "One caution about timing, and it is an honest one. Parts of the statutory text still refer to the retired form, and those parts have not been squared with the provision under which the court now identifies cases itself. LegalEase does not resolve that, and no page here takes a view on it. It is a reason to check the case rather than assume a date.";

/** Four bullets, deliberately — see the pagination note on the sources list. */
const UT_SOURCES: readonly string[] = [
  "Utah Code 77-40a-101 (definitions), 77-40a-202 (traffic offense records), 77-40a-204 (identification), 77-40a-205 (Clean Slate convictions), 77-40a-206 (acquittals and dismissals with prejudice) and 77-40a-303 (conviction limits).",
  "Utah Code 76-3-402 (reduction of conviction); Utah Code 77-40a-306; Utah Code 58-37-8(2)(a)(i).",
  "Utah Supreme Court Standing Order No. 12 (appellate record expungement).",
  "Utah Courts self-help materials on expungement and the My Court Case search; Utah Department of Public Safety, Bureau of Criminal Identification, expungement pages."
];

const UT_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge, seal or delete anything, and cannot make a court, a clerk, a prosecuting agency or the Bureau of Criminal Identification act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the process is; it is not legal advice.",
  "LegalEase does not obtain, inspect, hold or authenticate your criminal history or your court file. You look those up yourself.",
  "LegalEase has not contacted any court, prosecuting agency or bureau about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class UtahGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "UtahGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Utah route. */
export class UtahRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "UtahRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class UtahBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "UtahBranchError";
  }
}

export const UT_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** DUI and reckless driving are expressly not traffic offenses in Utah. */
export const UT_TRAFFIC_OFFENCE_TYPES: Readonly<Record<string, boolean>> = {
  ordinary_traffic: true,
  dui_or_reckless_driving: false
};

/** The traffic-offense definition reaches infractions and class B or C only. */
export const UT_TRAFFIC_LEVELS: Readonly<Record<string, string>> = {
  infraction: "five years",
  class_c_misdemeanour: "five years",
  class_b_misdemeanour: "six years",
  higher: "outside"
};

/** How a nonconviction case ended. Without prejudice is a different route. */
export const UT_NONCONVICTION_DISPOSITIONS: Readonly<Record<string, string>> = {
  acquitted: "60 days after the acquittal",
  dismissed_with_prejudice: "180 days after the day of dismissal, if no appeal was filed",
  dismissed_without_prejudice: "not_this_route"
};

/** The Clean Slate waiting periods, by the level of the conviction. */
export const UT_CLEAN_SLATE_LEVELS: Readonly<Record<string, string>> = {
  infraction: "five years",
  class_c_misdemeanour: "five years",
  class_b_misdemeanour: "six years",
  class_a_drug_possession: "seven years",
  higher_or_other_class_a: "outside"
};

/** What actually stopped the participant, on the adjacent reduction node. */
export const UT_ELIGIBILITY_BARS: Readonly<Record<string, string>> = {
  waiting_period_has_not_run: "waiting_period",
  offence_level_too_high: "offence_level",
  too_many_convictions: "conviction_count"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new UtahBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualized legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

/** Utah free and low-cost help, named once so no stop is a dead end. */
const UT_LEGAL_HELP =
  "Utah Legal Services, the Utah Courts Self-Help Center, or a Utah attorney";

/**
 * Validates participant answers and routes to the correct Utah node.
 *
 * Two gates run on every route. Eligibility advice is not what a guidance sheet
 * is for. And immigration exposure is a self-help boundary the design records on
 * the traffic, nonconviction, Clean Slate and reduction nodes alike, so it is
 * asked everywhere rather than on some sheets and not others: clearing a Utah
 * record has consequences a non-citizen needs advised on first.
 *
 * Fails closed on any answer outside a closed list. Every stop and mismatch
 * carries a reason, a destination and the next step to take there.
 */
export function deriveUtahGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", UT_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new UtahGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      UT_LEGAL_HELP,
      "Take your court records and your criminal history to one of them and ask about your own case."
    );
  }

  const immigration = branch(
    trackId,
    "immigrationStatusInPlay",
    UT_YES_NO,
    facts.immigrationStatusInPlay
  );
  if (immigration.resolved) {
    throw new UtahGuidanceStopError(
      trackId,
      "immigration_consequences_need_advice_first",
      "Clearing a Utah record has consequences for a person who is not a United States citizen, and those are governed by federal law that no Utah mechanism reaches. This is asked before anything else so that the question is answered first rather than afterwards.",
      "an immigration attorney, and then " + UT_LEGAL_HELP,
      "Speak to an immigration attorney about what clearing this record would and would not do for you, before you rely on any Utah route."
    );
  }

  if (trackId === "ut_auto_traffic") {
    const type = branch(trackId, "offenceType", UT_TRAFFIC_OFFENCE_TYPES, facts.offenceType);
    if (!type.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "dui_or_reckless_driving_is_not_a_traffic_offense",
        "Utah excludes driving under the influence and reckless driving from the definition of a traffic offense, along with the boating equivalents and substantially similar local ordinances. A DUI does not reach this route at all, and it is also outside Clean Slate.",
        UT_LEGAL_HELP,
        "Ask which Utah route, if any, reaches a driving-under-the-influence or reckless-driving record. Do not wait for an automatic deletion that will not come."
      );
    }

    const level = branch(trackId, "offenceLevel", UT_TRAFFIC_LEVELS, facts.offenceLevel);
    if (level.resolved === "outside") {
      throw new UtahGuidanceStopError(
        trackId,
        "offence_above_class_b_is_outside_the_traffic_definition",
        "The traffic-offense definition reaches infractions and class B and C misdemeanours. Anything above that falls outside it entirely.",
        UT_LEGAL_HELP,
        "Ask which Utah route reaches the level of offence you actually have; the conviction routes are a different analysis."
      );
    }
    derived.utTrafficWait = level.resolved;

    const abeyance = branch(trackId, "pleaInAbeyance", UT_YES_NO, facts.pleaInAbeyance);
    if (abeyance.resolved) {
      throw new UtahRouteMismatchError(
        trackId,
        "dismissal_from_a_completed_plea_in_abeyance",
        "A dismissal with prejudice that resulted from successfully completing a plea in abeyance is expressly carved out of the automatic deletion. The automatic route does not run on it.",
        "the Utah petition routes",
        "Go back to the Utah intake and answer the questions for a petition, which is the analysis that reaches a plea-in-abeyance dismissal."
      );
    }

    const faster = branch(trackId, "needsFasterRelief", UT_YES_NO, facts.needsFasterRelief);
    if (faster.resolved) {
      throw new UtahRouteMismatchError(
        trackId,
        "participant_cannot_wait_for_the_automatic_deletion",
        "The automatic deletion is free but it runs on the statute's timetable. Where you cannot wait, Utah has a paid petition for a traffic conviction that does not make you wait.",
        "the Utah traffic conviction petition route",
        "Go back to the Utah intake and answer the questions for clearing an old traffic conviction now. Read the timing on this page first, so you are choosing to pay rather than paying by default."
      );
    }

    const overdue = branch(trackId, "pastStatutoryTimeline", UT_YES_NO, facts.pastStatutoryTimeline);
    if (overdue.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "traffic_record_not_deleted_well_past_the_timeline",
        "The case meets the published criteria and the statutory timetable has long since run, and it has still not been deleted. That is a question for the court, and it is worth noting that it is not a question for the Bureau of Criminal Identification.",
        "the court that handled the traffic case, and then " + UT_LEGAL_HELP,
        "Contact that court. The Bureau does not receive or index expunged traffic offenses, so traffic enquiries go to the court, not to the Bureau."
      );
    }

    const needsProof = branch(trackId, "needsProofOfDeletion", UT_YES_NO, facts.needsProofOfDeletion);
    if (needsProof.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "no_certificate_of_traffic_deletion_identified",
        "There is no document here to give an employer or a licensing body. The Bureau does not index traffic expungements and cannot certify one, and while My Court Case shows the status on screen, that screen is not a certificate. No route to written proof of a traffic deletion has been identified.",
        "the court that handled the traffic case, and " + UT_LEGAL_HELP,
        "Ask that court whether it will give you anything in writing. Do not promise an employer a certificate before you know whether one exists."
      );
    }
  }

  if (trackId === "ut_auto_nonconviction") {
    const disposition = branch(
      trackId,
      "dispositionType",
      UT_NONCONVICTION_DISPOSITIONS,
      facts.dispositionType
    );
    if (disposition.resolved === "not_this_route") {
      throw new UtahRouteMismatchError(
        trackId,
        "dismissal_without_prejudice_is_not_within_the_automatic_route",
        "The automatic expungement reaches an acquittal on all charges and a dismissal with prejudice. A dismissal without prejudice is not within it at all, because the State can still bring the case.",
        "the Utah dismissed-without-prejudice petition route",
        "Go back to the Utah intake and answer the questions for a case dismissed without prejudice."
      );
    }
    derived.utNonconvictionWait = disposition.resolved;

    const abeyance = branch(trackId, "pleaInAbeyance", UT_YES_NO, facts.pleaInAbeyance);
    if (abeyance.resolved) {
      throw new UtahRouteMismatchError(
        trackId,
        "dismissal_from_a_completed_plea_in_abeyance",
        "A dismissal with prejudice that came from successfully completing a plea in abeyance agreement is excluded from the automatic track, and needs the petition analysis instead.",
        "the Utah petition routes",
        "Go back to the Utah intake and answer the questions for a petition. Being excluded here does not mean nothing reaches the case."
      );
    }

    const insanity = branch(trackId, "insanityFinding", UT_YES_NO, facts.insanityFinding);
    if (insanity.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "not_guilty_by_reason_of_insanity_is_excluded",
        "A case in which the person was found not guilty by reason of insanity is excluded from the automatic expungement.",
        UT_LEGAL_HELP,
        "Take the disposition to one of them and ask what, if anything, reaches a case that ended that way."
      );
    }

    // The verification step, and the design's own fallback when it fails.
    const stillShowing = branch(trackId, "stillShowsOnMyCourtCase", UT_YES_NO, facts.stillShowsOnMyCourtCase);
    const wellPast = branch(trackId, "wellPastTheTimeline", UT_YES_NO, facts.wellPastTheTimeline);
    if (stillShowing.resolved && wellPast.resolved) {
      throw new UtahRouteMismatchError(
        trackId,
        "automatic_expungement_has_not_occurred_past_the_timeline",
        "The case still shows on My Court Case well past the statutory point, and past the practical allowance for the court running the job monthly. Section 77-40a-204 does not preclude filing a petition for a case that is eligible for automatic expungement where the automatic expungement has not occurred.",
        "the Utah acquittal or dismissal-with-prejudice petition route",
        "Go back to the Utah intake and answer the questions for a petition on the disposition you have. The petition is a genuine fallback here, not a duplicate of the free route."
      );
    }
  }

  if (trackId === "ut_auto_clean_slate") {
    const level = branch(trackId, "highestConvictionLevel", UT_CLEAN_SLATE_LEVELS, facts.highestConvictionLevel);
    if (level.resolved === "outside") {
      throw new UtahGuidanceStopError(
        trackId,
        "case_contains_a_conviction_outside_clean_slate",
        "Clean Slate requires every conviction in the case to be an infraction, a class C or class B misdemeanour, or a class A misdemeanour for possession of a controlled substance. A felony, or any other class A misdemeanour, takes the whole case outside it.",
        UT_LEGAL_HELP + ", and the Utah conviction petition route",
        "Ask which Utah route reaches the conviction you actually have. A petition may, and a reduction in the offence level may open one later."
      );
    }
    derived.utCleanSlateWait = level.resolved;

    const excluded = branch(trackId, "excludedOffenceType", UT_YES_NO, facts.excludedOffenceType);
    if (excluded.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "case_involves_an_excluded_offence",
        "Clean Slate excludes a long list of offences, among them driving under the influence and reckless driving, domestic violence, weapons offences, offences against a person, sexual battery, lewdness, registerable sex and child abuse offences, and damage to a communication device. Any one of them takes the case out.",
        UT_LEGAL_HELP,
        "Ask which Utah route reaches your conviction. Do not wait for an automatic expungement on a case the statute excludes."
      );
    }

    const pending = branch(trackId, "pendingProceeding", UT_YES_NO, facts.pendingProceeding);
    if (pending.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "misdemeanour_or_felony_proceeding_pending",
        "A pending misdemeanour or felony proceeding stops Clean Slate. While anything is pending, the route is closed.",
        UT_LEGAL_HELP,
        "Deal with the pending case first, then check this one again."
      );
    }

    const supervision = branch(
      trackId,
      "supervisionSince20250101",
      UT_YES_NO,
      facts.supervisionSince20250101
    );
    if (supervision.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "incarceration_probation_or_parole_since_1_january_2025",
        "Incarceration, probation or parole as of 1 January 2025, for a person seeking automatic expungement on or after that date, is an exclusion.",
        UT_LEGAL_HELP,
        "Ask how the exclusion applies to your own dates before relying on the automatic route."
      );
    }

    const debt = branch(trackId, "stateDebtOutstanding", UT_YES_NO, facts.stateDebtOutstanding);
    if (debt.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "unsatisfied_state_debt_or_transferred_receivable",
        "Unsatisfied state debt, or a criminal accounts receivable entered as a civil judgment and transferred to the Office of State Debt Collection, is an exclusion. Where you cannot establish whether it is cleared, that is the thing to settle first.",
        "the Office of State Debt Collection, and " + UT_LEGAL_HELP,
        "Find out what is outstanding and whether it has been cleared. Until you know, you cannot tell whether the route is open."
      );
    }

    const countNearLimit = branch(
      trackId,
      "convictionCountNearTheLimits",
      UT_YES_NO,
      facts.convictionCountNearTheLimits
    );
    if (countNearLimit.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "conviction_count_near_the_statutory_limits",
        "The conviction limits in 77-40a-303 run on your total criminal history across all states, and they count cases that have already been expunged. Where the count is anywhere near those limits, it is not something to work out from a guidance sheet.",
        UT_LEGAL_HELP,
        "Take your full criminal history, from every state, to someone who can do the counting with you."
      );
    }

    const objected = branch(trackId, "prosecutorObjected", UT_YES_NO, facts.prosecutorObjected);
    if (objected.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "prosecuting_agency_objected_to_clean_slate",
        "The prosecuting agency receives notice and may object in writing. Where it has objected, the automatic route is contested, and a contested objection is not self-help work.",
        UT_LEGAL_HELP,
        "Take the objection to one of them. Ask what it says and what, if anything, answers it."
      );
    }

    const stillShowing = branch(trackId, "stillShowsOnMyCourtCase", UT_YES_NO, facts.stillShowsOnMyCourtCase);
    const wellPast = branch(trackId, "wellPastTheTimeline", UT_YES_NO, facts.wellPastTheTimeline);
    if (stillShowing.resolved && wellPast.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "clean_slate_expungement_has_not_occurred_past_the_timeline",
        "The case meets every published criterion, the timetable has run, the practical allowance for the court's monthly job and the objection window has passed, and the case still shows.",
        "the court that entered the conviction, and then " + UT_LEGAL_HELP,
        "Contact that court. If it does not resolve, take it to legal help — and note that the paid petition routes remain available, so this is not a dead end."
      );
    }
  }

  if (trackId === "ut_pet_appellate") {
    const districtOrder = branch(
      trackId,
      "districtCourtOrderEntered",
      UT_YES_NO,
      facts.districtCourtOrderEntered
    );
    if (!districtOrder.resolved) {
      throw new UtahRouteMismatchError(
        trackId,
        "district_court_expungement_order_is_a_prerequisite",
        "Standing Order No. 12 starts from an existing district court order expunging the entire trial court record and the records held by other government entities. That order is a prerequisite, not a step on this route.",
        "the Utah district court expungement routes",
        "Go back to the Utah intake and get the trial court record expunged first. Nothing can be done about the appellate record until that order exists."
      );
    }

    const objected = branch(
      trackId,
      "attorneyGeneralObjected",
      UT_YES_NO,
      facts.attorneyGeneralObjected
    );
    if (objected.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "attorney_general_objected",
        "The Attorney General has thirty days from service to object to the expungement or to the proposed redaction. Where an objection has been made, this is contested appellate litigation.",
        "a Utah attorney",
        "Take the objection to a Utah attorney. LegalEase does not act on this route at any stage."
      );
    }

    const wantsPrepared = branch(
      trackId,
      "wantsPetitionPrepared",
      UT_YES_NO,
      facts.wantsPetitionPrepared
    );
    if (wantsPrepared.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "appellate_petition_is_outside_self_help_scope",
        "This route needs a drafted appellate petition and a proposed redacted version of a published judicial opinion. Utah Courts state expressly that there are no forms for it, and the adopted readiness record places the mechanism outside self-help scope.",
        "a Utah attorney",
        "Take it to a Utah attorney. Bring the certified district court expungement order and the citation of the published opinion; both will be asked for."
      );
    }
  }

  if (trackId === "ut_adj_reduction_402") {
    const bar = branch(trackId, "barEncountered", UT_ELIGIBILITY_BARS, facts.barEncountered);
    derived.utBar = bar.resolved;
    if (bar.resolved === "conviction_count") {
      throw new UtahGuidanceStopError(
        trackId,
        "the_bar_was_the_conviction_count_not_the_offence_level",
        "A reduction changes the level of a conviction. Where what stopped you was how many convictions you have rather than how serious this one is, reducing it may not open a route at all, and the counting runs on your total criminal history across all states including expunged cases.",
        UT_LEGAL_HELP,
        "Take your full criminal history to someone who can do the counting before you spend anything on a reduction."
      );
    }

    const wantsMotion = branch(
      trackId,
      "wantsReductionMotionPrepared",
      UT_YES_NO,
      facts.wantsReductionMotionPrepared
    );
    if (wantsMotion.resolved) {
      throw new UtahGuidanceStopError(
        trackId,
        "reduction_motion_is_outside_the_record_clearing_product",
        "A motion to reduce a conviction is a sentencing remedy under Title 76. It is not record clearing, and it is outside what this product covers. It is named here so you know the path exists; it is not prepared here.",
        "a Utah attorney, or " + UT_LEGAL_HELP,
        "Take the conviction to one of them and ask about a reduction under 76-3-402. Come back to expungement afterwards if the level changes."
      );
    }

    const alreadyGranted = branch(
      trackId,
      "reductionAlreadyGranted",
      UT_YES_NO,
      facts.reductionAlreadyGranted
    );
    if (alreadyGranted.resolved) {
      throw new UtahRouteMismatchError(
        trackId,
        "reduction_already_granted_so_re_run_the_expungement_analysis",
        "This node exists to name a path for someone who is not eligible today. Where the reduction has already been granted, the level and the waiting period may now line up, and the expungement question should be asked again rather than answered here.",
        "the Utah expungement routes, starting with the automatic ones",
        "Go back to the Utah intake and run the eligibility questions again on the reduced level. Bring the amended judgment; whether the Bureau sees a granted reduction on its own has not been established, so have the document with you."
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

/** An automatic route's sheet: free route first, then the timing, then how to check. */
function automaticGuidance(input: {
  templateId: string;
  mechanismName: string;
  whyNotAFiling: string;
  destination: { name: string; detail: string };
  prerequisites: readonly string[];
  documentsToObtain?: readonly string[];
  gather: readonly string[];
  sequence: readonly string[];
  expectedNextStage: string;
  extraCanPrepare?: readonly string[];
  extraCannotPerform?: readonly string[];
  escalations: readonly string[];
  noticeOrService?: readonly string[];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: "automatic",
    prerequisites: input.prerequisites,
    documentsToObtain: input.documentsToObtain ?? [`A copy of ${UT_RECORD_CHECK}.`],
    participantDataToGather: input.gather,
    officialDestination: input.destination,
    actionSequence: [FREE_ROUTE_FIRST, AUTOMATIC_IS_NOT_A_REPORT, ...input.sequence, EXPUNGE_MEANS_SEAL],
    submissionMethod:
      "There is nothing to submit. No application, petition or form exists for this route, and the form that once existed is no longer used as a way of becoming eligible.",
    fees: "None. There is nothing to file, so there is nothing to pay.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: input.noticeOrService ?? [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody writes to tell you when a record has been cleared. Looking the case up is how you find out."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: [
      "This explanation of what the automatic route does, and when it is due to happen.",
      "A plain list of what to check and where to check it.",
      ...(input.extraCanPrepare ?? [])
    ],
    legalEaseCannotPerform: [
      ...UT_CANNOT_PERFORM,
      "LegalEase cannot tell you that a record has been cleared. Nothing here is a report about your case.",
      ...(input.extraCannotPerform ?? [])
    ],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "You are not a United States citizen and want to know what clearing a record would mean for you.",
      ...input.escalations
    ],
    officialSourceReferences: UT_SOURCES
  };
}

export const UTAH_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "ut-auto-traffic-guidance": automaticGuidance({
    templateId: "ut-auto-traffic-guidance",
    mechanismName: "Traffic cases Utah deletes on its own",
    whyNotAFiling:
      "Nothing is filed and nothing is applied for. Under Utah Code 77-40a-202 the court deletes traffic offense records on its own initiative, and the duty is mandatory. There is no petition, application or form on this route, so none is generated.",
    destination: {
      name: "The court that handled the traffic case",
      detail:
        "The court identifies the case and deletes the record. The Bureau of Criminal Identification does not receive or index expunged traffic offenses, so any enquiry about a traffic expungement goes to the court and not to the Bureau. Nothing is submitted by you."
    },
    prerequisites: [
      "The case is a Utah traffic matter: an infraction or a class B or C misdemeanour under the traffic, driver licence or boating chapters, or a substantially similar local ordinance.",
      "It is not driving under the influence or reckless driving. Utah excludes both from the definition of a traffic offense, together with the boating equivalents, so a DUI is not on this route at all.",
      "The case ended in an acquittal on all charges, a dismissal with prejudice, or an adjudication.",
      "The dismissal with prejudice did not come from successfully completing a plea in abeyance, which is carved out."
    ],
    gather: [
      "What the offence was, and whether it was a DUI or reckless driving matter.",
      "Whether it was an infraction, a class C misdemeanour or a class B misdemeanour.",
      "How the case ended, and the date of the acquittal, dismissal or adjudication.",
      "Whether the case came through a plea in abeyance that was later dismissed.",
      "Whether you need this cleared sooner than the automatic timeline allows."
    ],
    sequence: [
      "Work out which timetable applies. After an acquittal on all charges or a dismissal with prejudice, there is no waiting period beyond the court identifying the case. After an adjudication, it is five years for a class C misdemeanour or an infraction, and six years for a class B misdemeanour.",
      "The commencement date matters too. Where the qualifying event happened on or after 1 May 2020, the court deletes on identifying the case; where it happened before that date, the court deletes within one year of identifying it.",
      `Look the case up on ${UT_RECORD_CHECK}.`,
      "Enquire at the court, not at the Bureau. The Bureau does not receive or index expunged traffic offenses, so it is not the place to ask whether a traffic case has been deleted.",
      "If you need a document proving the deletion for an employer or a licensing body, be careful. My Court Case shows the status on a screen, and a screen is not a certificate. No route to written proof of a traffic deletion has been identified, and LegalEase will not tell you one exists.",
      "If you cannot wait, Utah has a paid petition for clearing an old traffic conviction now. Read the timing above before you choose it, so that paying is a decision rather than a default."
    ],
    expectedNextStage:
      "You look the case up after the applicable period and see whether it still shows. Until you have looked, treat the deletion as pending rather than done.",
    extraCanPrepare: [
      "The line between a traffic offense and a DUI, which decides whether this route reaches your case at all.",
      "The warning that traffic enquiries go to the court rather than to the Bureau."
    ],
    extraCannotPerform: [
      "LegalEase cannot give you a certificate or any other proof that a traffic record was deleted, and has not identified anyone who can."
    ],
    escalations: [
      "The case is a DUI or reckless driving matter, which this route does not reach.",
      "The case meets every published criterion and has not been deleted well past the timeline.",
      "You need written proof of the deletion for an employer or a licensing body."
    ]
  }),

  "ut-auto-nonconviction-guidance": automaticGuidance({
    templateId: "ut-auto-nonconviction-guidance",
    mechanismName: "Acquittals and dismissals with prejudice that Utah clears on its own",
    whyNotAFiling:
      "Nothing is filed and nothing is applied for. Under Utah Code 77-40a-206 the court expunges the case after an acquittal on all charges or a dismissal with prejudice, and since 1 January 2026 it identifies the case itself under 77-40a-204(3). The duty is mandatory once the case is identified, so no petition or application is generated here.",
    destination: {
      name: "The court that decided the case, with the Bureau of Criminal Identification applying the resulting order",
      detail:
        "The court identifies eligible cases and expunges them. The Bureau receives and applies the order. Nothing is submitted by you; where the automatic expungement has not happened, the petition route is the fallback and is a separate track."
    },
    prerequisites: [
      "The case is a Utah case and ended in an acquittal on all charges, or a dismissal with prejudice.",
      "The dismissal with prejudice did not come from successfully completing a plea in abeyance agreement, which is excluded.",
      "You were not found not guilty by reason of insanity, which is also excluded.",
      "A dismissal without prejudice is not within this route at all, because the State can still bring the case."
    ],
    gather: [
      "How the case ended, and the date of the acquittal or dismissal.",
      "Whether the dismissal came from completing a plea in abeyance agreement.",
      "Whether you were found not guilty by reason of insanity.",
      "Whether an appeal was filed in the case.",
      "Whether the case still shows when you look it up, or shows as expunged."
    ],
    sequence: [
      COURT_IDENTIFIES_NOW,
      "Work out the point at which the court's duty falls due. After an acquittal on all charges, it is sixty days after the acquittal. After a dismissal with prejudice with no appeal filed, it is one hundred and eighty days after the day of dismissal. Where an appeal was filed, it is after a final non-appealable order.",
      "Then allow for how the work actually happens. The court runs the automatic job monthly and must allow the prosecutor's objection window, so it can take up to a further one hundred and twenty days beyond the statutory point.",
      STATUTE_NOT_YET_SQUARED,
      `Look the case up on ${UT_RECORD_CHECK}. That is the check.`,
      "If the case still shows well past all of that, you are not stuck. Section 77-40a-204 does not preclude filing a petition for a case that is eligible for automatic expungement where the automatic expungement has not occurred, so the petition route is a genuine fallback rather than a duplicate."
    ],
    expectedNextStage:
      "You look the case up after the applicable point and the practical allowance, and see whether it still shows. Until then, treat it as pending.",
    extraCanPrepare: [
      "The two timetables, and the practical allowance on top of them, so you know when it is fair to start chasing.",
      "The fact that the petition remains available where the automatic route has not run, which is the thing that stops this being a dead end."
    ],
    escalations: [
      "The case meets every published criterion and still shows well past the timeline and the practical allowance.",
      "The dismissal came from completing a plea in abeyance, which needs the petition analysis instead.",
      "You were found not guilty by reason of insanity."
    ]
  }),

  "ut-auto-clean-slate-guidance": automaticGuidance({
    templateId: "ut-auto-clean-slate-guidance",
    mechanismName: "Convictions that clear themselves under Utah's Clean Slate",
    whyNotAFiling:
      "Nothing is filed and nothing is applied for. Under Utah Code 77-40a-205 the court expunges qualifying convictions, and since 1 January 2026 it identifies eligible cases itself under 77-40a-204(3). The prosecuting agency is notified and may object; if thirty-five days pass without a written objection the court proceeds. There is no petition or application from you on this route.",
    destination: {
      name: "The court that entered the conviction, with the Bureau of Criminal Identification applying the resulting order",
      detail:
        "The court identifies eligible cases, notifies the prosecuting agency, and expunges if no written objection is filed within thirty-five days. The Bureau receives and applies the order. Nothing is submitted by you."
    },
    prerequisites: [
      "Every conviction in the case is an infraction, a class C misdemeanour, a class B misdemeanour, or a class A misdemeanour for possession of a controlled substance. One felony or one other class A misdemeanour takes the whole case out.",
      "The case does not involve any of the excluded offences, among them driving under the influence and reckless driving, domestic violence, weapons offences, offences against a person, sexual battery, lewdness, registerable sex and child abuse offences, and damage to a communication device.",
      "You have no misdemeanour or felony proceeding pending, and were not incarcerated or on probation or parole as of 1 January 2025 if you are seeking automatic expungement on or after that date.",
      "There is no unsatisfied state debt, and no criminal accounts receivable entered as a civil judgment and transferred to the Office of State Debt Collection.",
      "Your total conviction count is within the statutory limits, which count your history across all states including cases already expunged."
    ],
    gather: [
      "Every conviction in the case, and the level of each.",
      "The date you were adjudicated.",
      "Whether any conviction was for possession of a controlled substance.",
      "Whether any misdemeanour or felony proceeding is pending now.",
      "Whether you were in jail or prison, or on probation or parole, on 1 January 2025 or since.",
      "Whether any state debt is outstanding, or a criminal accounts receivable has gone to the Office of State Debt Collection.",
      "How many convictions you have in total, anywhere, including any already expunged.",
      "Whether the prosecuting agency has objected in writing, so far as you know. If you do not know, say so; that is a normal answer here rather than a gap in what you have, and the objection window is the court's business rather than yours.",
      "Whether the case still shows when you look it up, or shows as expunged."
    ],
    sequence: [
      COURT_IDENTIFIES_NOW,
      "Work out the waiting period from the day you were adjudicated: five years for a class C misdemeanour or an infraction, six years for a class B misdemeanour, and seven years for a class A misdemeanour for possession of a controlled substance.",
      "The prosecuting agency is given notice and has thirty-five days to object in writing. If it does not object in that window, the court proceeds.",
      "Then allow for how the work happens. For a case adjudicated on or after 1 May 2020 that is not a traffic offense, the target is expungement within thirty days of the court determining the requirements are satisfied; for a case adjudicated or dismissed before that date, within one year of identification. In practice it can take up to one hundred and twenty days, because the court runs the job monthly and must allow the objection window.",
      STATUTE_NOT_YET_SQUARED,
      `Look the case up on ${UT_RECORD_CHECK}. That is the check.`,
      "If you are asking the Bureau how long its own work takes, ask the Bureau. That figure moves, and no figure is printed here, because a stale one is worse than none.",
      "Be careful with the counting. The conviction limits run on your total criminal history across all states, and they count cases that have already been expunged. If your count is anywhere near them, this is not something to work out from a sheet, and a record you think of as gone still counts.",
      "If the case does not qualify, or the wait has not run, the paid petition routes are the alternative — and they are an alternative, not the first thing to look at. Where what stopped you was the level of the conviction rather than the wait, a reduction of that level is a further path, and Utah's own self-help materials point ineligible people towards it."
    ],
    expectedNextStage:
      "You look the case up after the waiting period and the practical allowance, and see whether it still shows. Until then, treat it as pending.",
    extraCanPrepare: [
      "The three waiting periods, and the exclusions that take a case out before the wait even matters.",
      "The warning that the conviction limits count your history in every state, including records already expunged."
    ],
    escalations: [
      "The prosecuting agency has objected to a Clean Slate expungement.",
      "The case meets every published criterion and still shows well past the timeline and the practical allowance.",
      "Your conviction count is anywhere near the statutory limits.",
      "There is state debt or a transferred criminal accounts receivable and you cannot establish whether it is cleared."
    ]
  }),

  "ut-pet-appellate-guidance": {
    templateId: "ut-pet-appellate-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Expunging Utah appellate court records",
    whyNotAFiling:
      "This page is not the petition and is not filed. It explains a route that LegalEase does not deliver as a packet, so that you can decide whether to pursue it with an attorney. The petition itself is drafted from scratch: Utah Courts state expressly that there are no forms for this.",
    processType: "court_adjacent",
    prerequisites: [
      "A district court has already entered an order expunging the entire trial court record and the records held by other government entities. That order is a prerequisite, not a step on this route.",
      "There is a published appellate opinion, or an appellate record, that you want sealed or redacted.",
      "You understand that this route is run by an attorney. There are no forms, and LegalEase does not prepare the petition."
    ],
    documentsToObtain: [
      "A certified copy of the district court expungement order.",
      "A copy of the district court expungement petition.",
      "The citation of the published appellate opinion, and a copy of it."
    ],
    participantDataToGather: [
      "Whether the district court has already expunged the trial court record and the records held by other government entities.",
      "Whether there is a published appellate opinion, and its citation.",
      "Which identifying details appear in the opinion — your name, address, birthdate, or government identification numbers."
    ],
    officialDestination: {
      name: "The Utah Supreme Court, with service on the Utah Attorney General",
      detail:
        "The petition is filed with the Utah Supreme Court and served on the Attorney General. LegalEase does not prepare, file or serve anything on this route."
    },
    actionSequence: [
      "Everyone who reaches this route is referred out. This page exists to explain what the route is and what it takes, so that the referral is a useful one rather than a shrug.",
      "Get the trial court record expunged first, if it has not been. Standing Order No. 12 starts from an existing district court order expunging the entire trial court record and the records held by other government entities, and without that order there is nothing to build on.",
      "What is filed with the Utah Supreme Court, and served on the Attorney General, is a written petition, a copy of the district court expungement petition, a certified copy of the district court expungement order, and a proposed redacted version of the appellate opinion — your name replaced with initials or a pseudonym, and your address, birthdate and government identification numbers redacted.",
      "The Attorney General has thirty days from service to object, either to the expungement or to the proposed redaction.",
      "If it is granted, the appellate records including the briefs are sealed, the published opinion is replaced with the redacted version, and the appellate courts notify LexisNexis and Westlaw.",
      "Know the limit of that before you start. Other publishers are not legally required to redact. A copy of the opinion held somewhere else may stay exactly where it is, and nothing in this order reaches it.",
      EXPUNGE_MEANS_SEAL,
      "Take it to a Utah attorney, with the certified district court order and the citation of the opinion. LegalEase does not prepare the petition or the proposed redaction, and does not appear on either."
    ],
    submissionMethod:
      "Filed with the Utah Supreme Court and served on the Utah Attorney General, by whoever is running it. There are no forms; the petition and the proposed redacted opinion are drafted. LegalEase does not prepare or submit them.",
    fees: "Any filing fee is set by the Utah Supreme Court. LegalEase charges nothing on this route, because it does nothing on it.",
    feeWaiver:
      "Not addressed here. An attorney running the petition can tell you what fee relief, if any, is available in the appellate court.",
    noticeOrService: [
      "The petition is served on the Utah Attorney General, who has thirty days to object.",
      "If it is granted, the appellate courts notify LexisNexis and Westlaw. Other publishers are not notified and are not legally required to redact."
    ],
    expectedNextStage:
      "A Utah attorney tells you whether the route is worth pursuing on your facts, and runs it if it is.",
    legalEaseCanPrepare: [
      "This explanation of what the route requires, what it reaches, and what it does not.",
      "The list of what to bring to the attorney, so the first meeting is not spent gathering.",
      "The limit that matters most: publishers other than LexisNexis and Westlaw are not required to redact."
    ],
    legalEaseCannotPerform: [
      ...UT_CANNOT_PERFORM,
      "LegalEase does not prepare, file or serve the appellate petition, and does not prepare the proposed redacted opinion. Every participant on this route is referred out.",
      "LegalEase cannot make any publisher other than the appellate courts' own notified services redact anything."
    ],
    escalationTriggers: [
      "You want to pursue this route. It needs an attorney, and there are no forms.",
      "The district court has not yet expunged the trial court record, so the prerequisite does not exist.",
      "The Attorney General has objected to the expungement or to the proposed redaction.",
      "You are not a United States citizen and want to know what clearing a record would mean for you."
    ],
    officialSourceReferences: UT_SOURCES
  },

  "ut-adj-reduction-402-guidance": {
    templateId: "ut-adj-reduction-402-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Not eligible yet: when reducing the conviction level can open a route",
    whyNotAFiling:
      "Nothing is filed here, and nothing is generated here. This page is not a record-clearing route at all. It exists because Utah's own self-help materials send people who are not eligible for expungement towards a reduction, and because a reduction can change the answer later.",
    processType: "court_adjacent",
    prerequisites: [
      "You have already looked at the Utah expungement routes and something stopped you.",
      "You know which conviction is the problem, and what level it is now."
    ],
    documentsToObtain: [
      `A copy of ${UT_RECORD_CHECK}.`,
      "The judgment in the case whose level you are asking about."
    ],
    participantDataToGather: [
      "Which problem came up — the waiting period has not run, the offence level is too high, or you have too many convictions.",
      "What level the conviction is now.",
      "Whether you have already asked the court to reduce it, and what happened."
    ],
    officialDestination: {
      name: "None of its own. The court that entered the conviction, for the reduction this page names",
      detail:
        "Nothing is submitted here. This page explains why you are not eligible today, whether a reduction would change that, and where the reduction itself is run. LegalEase does not prepare it."
    },
    actionSequence: [
      FREE_ROUTE_FIRST,
      "Start with the right question: what actually stopped you. There are three answers, and they do not have the same fix.",
      "If the waiting period has not run, nothing needs reducing. The clock is the clock, and the free automatic routes may reach the case when it has run. Note the date and come back.",
      "If the offence level is too high, a reduction under Utah Code 76-3-402 may change that. Reducing the level changes both the waiting period that applies and the counting maths, so a conviction that is out of reach today can be in reach afterwards.",
      "If you have too many convictions, a reduction may not help at all. The conviction limits run on your total criminal history across all states and count cases already expunged, so that is a counting question and it needs a lawyer rather than a sheet.",
      "The reduction itself is a sentencing remedy under Title 76, not record clearing, and it is outside what this product covers. It is named here so that you know the path exists. It is not prepared here.",
      "If a reduction is granted, come back and run the expungement questions again on the new level. Bring the amended judgment with you: whether the Bureau of Criminal Identification picks up a granted reduction on its own has not been established, so do not assume it has.",
      EXPUNGE_MEANS_SEAL
    ],
    submissionMethod:
      "There is nothing to submit. This page screens and routes; it is not a step towards a document prepared here.",
    fees: "None. Nothing is filed on this page and nothing is charged for it.",
    feeWaiver: "Not applicable. There is no fee to waive where there is nothing to file.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve on this page.",
      "Nobody writes to tell you that a different route might work later. That is what this page is for."
    ],
    expectedNextStage:
      "Either you note the date the waiting period runs and come back to the free routes, or you take the reduction question to someone who can run it.",
    legalEaseCanPrepare: [
      "This explanation of which bar you hit, and whether a reduction is capable of moving it.",
      "The reason a reduction changes the expungement analysis at all: it changes the level, and the level drives both the wait and the counting.",
      "A plain warning that a conviction-count problem is a different problem."
    ],
    legalEaseCannotPerform: [
      ...UT_CANNOT_PERFORM,
      "LegalEase does not prepare or file a motion to reduce a conviction. That is a sentencing remedy outside this product.",
      "LegalEase cannot tell you whether a court will grant a reduction, or whether one would make you eligible."
    ],
    escalationTriggers: [
      "You want the reduction motion itself prepared, which is outside this product.",
      "What stopped you was the conviction count rather than the offence level.",
      "You are not a United States citizen; a reduction and a later expungement both carry consequences that need advice first.",
      "You want advice about whether a particular record qualifies."
    ],
    officialSourceReferences: UT_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!UTAH_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Utah guidance template ${templateId} is registered.`);
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

/**
 * Asked on every Utah route.
 *
 * Immigration exposure is a self-help boundary the design records across this
 * family, so it is screened everywhere rather than on some sheets and not
 * others.
 */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want advice about whether your particular record qualifies?",
    required: true
  },
  {
    key: "immigrationStatusInPlay",
    label:
      "Are you asking about what clearing this record would mean for your immigration status — for example, are you not a United States citizen?",
    required: true
  }
];

function utahTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  componentId: string;
  templateId: string;
  extraInputs: readonly RequiredInput[];
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
    jurisdiction: "UT",
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
    packetSet: packetSet(input.trackId, input.componentId, input.templateId),
    requiredInputs: [...SHARED_INPUTS, ...input.extraInputs],
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

export const UTAH_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  utahTrack({
    trackId: "ut_auto_traffic",
    publicName: "Utah deletes old traffic cases automatically",
    mechanism: "automatic_deletion_of_traffic_offense_records",
    authority: "Utah Code 77-40a-202; Utah Code 77-40a-101; Utah Code 77-40a-204",
    recordTypes: ["arrest", "charge", "citation", "conviction"],
    dispositions: ["acquitted", "dismissed_with_prejudice", "convicted"],
    componentId: "ut_auto_traffic-process-guidance-1",
    templateId: "ut-auto-traffic-guidance",
    extraInputs: [
      {
        key: "offenceType",
        label:
          "What was the offence — a speeding or other ordinary traffic matter, or a DUI or reckless driving charge?",
        required: true
      },
      {
        key: "offenceLevel",
        label: "Was it an infraction, a class C misdemeanour, a class B misdemeanour, or higher?",
        required: true
      },
      {
        key: "dispositionType",
        label: "How did the case end — found not guilty, dismissed with prejudice, or adjudicated?",
        required: true
      },
      {
        key: "dispositionDate",
        label: "What is the date of the acquittal, dismissal or adjudication?",
        required: true
      },
      {
        key: "pleaInAbeyance",
        label: "Did the case come through a plea in abeyance that was later dismissed?",
        required: true
      },
      {
        key: "needsFasterRelief",
        label: "Do you need this cleared sooner than the automatic timeline allows?",
        required: true
      },
      {
        key: "pastStatutoryTimeline",
        label: "Has the automatic timetable long since run without the case being deleted?",
        required: true
      },
      {
        key: "needsProofOfDeletion",
        label: "Do you need a document proving the deletion for an employer or a licensing body?",
        required: true
      }
    ],
    assembledPacketName: "Traffic-Automatic-Deletion-Verification",
    assembledPacketTitle: "Traffic cases Utah deletes on its own",
    customerDeliverableDescription:
      "A guidance sheet explaining that the court deletes qualifying traffic offense records on its own initiative with nothing to file and no fee, which timetable applies to which ending, that DUI and reckless driving are not traffic offenses in Utah, that traffic enquiries go to the court rather than the Bureau, and that no route to written proof of a deletion has been identified.",
    notes:
      "The commercial instruction the design puts on this family leads every sheet: show the no-cost route and its timing before payment. A participant who cannot wait is routed to the paid traffic petition as a choice rather than a default. The unresolved question about written proof is stated as unresolved rather than answered, and no page reproduces the description of expungement as deletion of all information."
  }),

  utahTrack({
    trackId: "ut_auto_nonconviction",
    publicName: "Utah clears acquittals and dismissals automatically",
    mechanism: "automatic_expungement_after_acquittal_or_dismissal_with_prejudice",
    authority: "Utah Code 77-40a-206; Utah Code 77-40a-204(3)",
    recordTypes: ["arrest", "charge"],
    dispositions: ["acquitted", "dismissed_with_prejudice"],
    componentId: "ut_auto_nonconviction-process-guidance-1",
    templateId: "ut-auto-nonconviction-guidance",
    extraInputs: [
      {
        key: "dispositionType",
        label:
          "How did the case end — found not guilty, dismissed with prejudice, or dismissed without prejudice?",
        required: true
      },
      { key: "dispositionDate", label: "What is the date of the acquittal or dismissal?", required: true },
      {
        key: "pleaInAbeyance",
        label: "Did the dismissal come from completing a plea in abeyance agreement?",
        required: true
      },
      {
        key: "insanityFinding",
        label: "Were you found not guilty by reason of insanity?",
        required: true
      },
      { key: "appealFiled", label: "Was an appeal filed in the case?", required: true },
      {
        key: "stillShowsOnMyCourtCase",
        label: "When you look the case up on My Court Case, does it still show?",
        required: true
      },
      {
        key: "wellPastTheTimeline",
        label:
          "Are you well past the statutory point, and past the further allowance for the court's monthly job and the objection window?",
        required: true
      }
    ],
    assembledPacketName: "Nonconviction-Automatic-Expungement-Verification",
    assembledPacketTitle: "Acquittals and dismissals with prejudice that Utah clears on its own",
    customerDeliverableDescription:
      "A guidance sheet explaining that the court expunges an acquittal sixty days after it and a dismissal with prejudice one hundred and eighty days after it with nothing to file, that the court now identifies cases itself and form 1200EX is no longer used, what the practical timing allowance is, and that a petition remains available where the automatic expungement has not occurred.",
    notes:
      "The design records a genuine internal tension between the subsections that still refer to the retired form and the provision under which the court now identifies cases itself, and expressly takes no view on how it resolves. The sheet reports the tension, says LegalEase does not resolve it, and turns it into the instruction to verify rather than assume. No BCI processing time is stated, because the design requires that number to be read live rather than stored."
  }),

  utahTrack({
    trackId: "ut_auto_clean_slate",
    publicName: "Utah's Clean Slate: some convictions clear themselves",
    mechanism: "clean_slate_automatic_expungement_of_convictions",
    authority: "Utah Code 77-40a-205; Utah Code 77-40a-204(3); Utah Code 77-40a-303",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    componentId: "ut_auto_clean_slate-process-guidance-1",
    templateId: "ut-auto-clean-slate-guidance",
    extraInputs: [
      {
        key: "highestConvictionLevel",
        label:
          "What is the most serious conviction in this case — an infraction, a class C or class B misdemeanour, a class A misdemeanour for drug possession, or something higher?",
        required: true
      },
      { key: "adjudicationDate", label: "On what date were you adjudicated in this case?", required: true },
      {
        key: "excludedOffenceType",
        label:
          "Did the case involve DUI or reckless driving, domestic violence, a weapons offence, an offence against a person, sexual battery, lewdness, a registerable sex or child abuse offence, or damage to a communication device?",
        required: true
      },
      {
        key: "pendingProceeding",
        label: "Do you have any misdemeanour or felony proceeding pending right now?",
        required: true
      },
      {
        key: "supervisionSince20250101",
        label: "Were you in jail or prison, or on probation or parole, on 1 January 2025 or since?",
        required: true
      },
      {
        key: "stateDebtOutstanding",
        label:
          "Do you owe any unsatisfied state debt, or has a criminal accounts receivable on this case gone to the Office of State Debt Collection?",
        required: true
      },
      {
        key: "convictionCountNearTheLimits",
        label:
          "Counting every conviction you have anywhere, including any already expunged, is your total anywhere near the statutory limits?",
        required: true
      },
      {
        key: "prosecutorObjected",
        label: "Has the prosecuting agency objected to a Clean Slate expungement in this case?",
        required: true
      },
      {
        key: "stillShowsOnMyCourtCase",
        label: "When you look the case up on My Court Case, does it still show?",
        required: true
      },
      {
        key: "wellPastTheTimeline",
        label:
          "Are you well past the waiting period, and past the further allowance for the court's monthly job and the objection window?",
        required: true
      }
    ],
    assembledPacketName: "Clean-Slate-Verification",
    assembledPacketTitle: "Convictions that clear themselves under Utah's Clean Slate",
    customerDeliverableDescription:
      "A guidance sheet explaining which convictions Clean Slate reaches and the five, six and seven year waiting periods, the exclusions that take a case out entirely, the prosecutor's thirty-five day objection window, the practical timing, how to check, and that the conviction limits count criminal history across all states including records already expunged.",
    notes:
      "The design calls this the highest-risk Utah track for selling something the participant does not need, and requires the intake to show the no-cost route and its timing before payment; the sheet leads with that. The statutory definition of expunge as sealing or restricting access is used throughout, and the description of expungement as deleting all information about a charge is not reproduced."
  }),

  utahTrack({
    trackId: "ut_pet_appellate",
    publicName: "Expunging appellate court records",
    mechanism: "appellate_record_expungement_standing_order_12",
    authority: "Utah Supreme Court Standing Order No. 12; Utah Code 77-40a-306",
    recordTypes: ["appellate_record", "published_opinion"],
    dispositions: ["expunged_at_trial_court"],
    componentId: "ut_pet_appellate-process-guidance-1",
    templateId: "ut-pet-appellate-guidance",
    extraInputs: [
      {
        key: "districtCourtOrderEntered",
        label:
          "Has a district court already entered an order expunging the entire trial court record and the records held by other government entities?",
        required: true
      },
      {
        key: "publishedOpinionExists",
        label: "Is there a published appellate opinion in your case, and do you know its citation?",
        required: true
      },
      {
        key: "identifyingDetailsInOpinion",
        label:
          "What identifying details appear in the opinion — your name, address, birthdate, or government identification numbers?",
        required: true
      },
      {
        key: "attorneyGeneralObjected",
        label: "Has the Attorney General objected to the expungement or to the proposed redaction?",
        required: true
      },
      {
        key: "wantsPetitionPrepared",
        label: "Do you want the appellate petition and the proposed redacted opinion prepared for you?",
        required: true
      }
    ],
    assembledPacketName: "Appellate-Record-Expungement-Explainer",
    assembledPacketTitle: "Expunging Utah appellate court records",
    customerDeliverableDescription:
      "A guidance sheet explaining that Standing Order No. 12 requires an existing district court expungement order, a drafted petition, a certified copy of that order and a proposed redacted opinion served on the Attorney General who has thirty days to object, that a grant seals the appellate records and notifies LexisNexis and Westlaw, that other publishers are not required to redact, and that LegalEase refers this route out.",
    notes:
      "The adopted readiness record places this mechanism outside self-help scope, and Utah Courts state expressly that there are no forms for it, so the sheet explains the route rather than pretending to be it. Every participant reaching it is referred out. The limit that a published opinion may survive elsewhere is stated up front rather than left to be discovered."
  }),

  utahTrack({
    trackId: "ut_adj_reduction_402",
    publicName: "Not eligible yet? Reducing the conviction level may open a route",
    mechanism: "adjacent_routing_node_for_conviction_level_reduction",
    authority: "Utah Code 76-3-402; Utah Code 77-40a-303; Utah Code 77-40a-205",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    componentId: "ut_adj_reduction_402-process-guidance-1",
    templateId: "ut-adj-reduction-402-guidance",
    extraInputs: [
      {
        key: "barEncountered",
        label:
          "Which problem came up — the waiting period has not run, the offence level is too high, or you have too many convictions?",
        required: true
      },
      {
        key: "convictionLevel",
        label: "What level is the conviction now — class A, B or C misdemeanour, or felony?",
        required: true
      },
      {
        key: "reductionAlreadyGranted",
        label: "Has a court already granted a reduction of this conviction?",
        required: true
      },
      {
        key: "wantsReductionMotionPrepared",
        label: "Do you want the reduction motion itself prepared for you?",
        required: true
      }
    ],
    assembledPacketName: "Reduction-Routing",
    assembledPacketTitle: "Not eligible yet: when reducing the conviction level can open a route",
    customerDeliverableDescription:
      "A guidance sheet that separates the three reasons a Utah expungement can be out of reach — the wait, the offence level, and the conviction count — explains that a reduction under 76-3-402 changes the level and therefore both the wait and the counting, and refers the reduction motion itself out as a sentencing remedy outside this product.",
    notes:
      "The design places this in the Utah decision tree as an adjacent non-relief routing node and expressly not as a relief track, so the sheet screens and routes and generates nothing else. Whether the Bureau picks up a granted reduction on its own has not been established, so the sheet tells the participant to bring the amended judgment rather than asserting either way."
  })
];
