// West Virginia process guidance — three routes, none of which the participant
// files anything on.
//
// Three assigned tracks, all `process_guidance` in the adopted design:
//
//   - `wv_common_conv_procedure` is a screening and routing node. It produces
//     no relief of its own. It runs the complete W. Va. Code § 61-11-26(c)
//     exclusion screen in its fifteen subdivisions and the § 61-11-26b
//     commercial-driving bar, establishes whether the once-per-lifetime relief
//     at § 61-11-26(o) has already been spent, inventories every conviction
//     that could be bundled into the single petition, applies the temporal
//     requirement at § 61-11-26(b), and then routes to whichever conviction
//     track fits. Nothing is filed here; the route it selects is a verified
//     petition owned by another job.
//   - `wv_common_nc_procedure` is the same shape for § 61-11-25. It screens the
//     two threshold bars — any prior felony conviction closes the whole section,
//     and a dismissal given in exchange for a guilty plea to another offence is
//     excluded — confirms the 60-day bar has run, and routes to the acquittal
//     and dismissal track or the diversion and deferred-adjudication track.
//   - `wv_dui_test_and_lock_dismissal` is court action without a participant
//     filing. Under § 17C-5-2(j)(1), where a person under 21 charged with a
//     first alcohol-driving offence at a concentration of at least two
//     hundredths but less than eight hundredths of one percent moves for a
//     continuance and completes the Motor Vehicle Test and Lock Program, the
//     court shall dismiss the charge and expunge the person's record as it
//     relates to the alleged offence. There is no petition, no application and
//     no waiting period after the continuance motion, and that motion — being
//     charge-stage criminal defence — is outside what this service does.
//
// What every sheet here carries:
//
//   - One petition, one lifetime. Section 61-11-26(o) allows the relief under
//     §§ 61-11-26 and 61-11-26a only once, and the design says in terms that
//     this must be said before money changes hands and must drive bundling
//     advice. The conviction sheet says it first and says it twice.
//   - The two effects are different, and the difference matters. Under
//     § 61-11-26(l) an expunged conviction must still be disclosed by an
//     applicant for a position involving the prevention, detection,
//     investigation, prosecution or incarceration of law violators, and
//     entities required by law to obtain criminal history checks may still
//     learn of it. Under § 61-11-25(e) there is no such carve-out. The design
//     says the § 61-11-26 exceptions must not be applied to § 61-11-25 relief,
//     so the two sheets state their own effect and neither borrows the other's.
//   - The Division of Motor Vehicles record is not expunged. The criminal
//     record can be cleared; the driving record cannot.
//   - Section 61-11-25 relief is discretionary in form — on finding no current
//     charges or proceedings pending, the court *may* grant the petition — and
//     the design forbids describing it as automatic.
//
// And the release blockers the design preserves, which no sheet here closes and
// no stop here decides:
//
//   - Venue on a multi-county conviction petition. The current text names only
//     the circuit court of conviction; the residence-county option the review
//     described is not in it. The sheet directs a multi-county participant to
//     the circuit court of conviction and tells them to check locally.
//   - Whether relief under § 60A-4-407 or § 17C-5-2b counts against the
//     once-per-lifetime limit. The textual reading is that they are separate
//     limits in separate statutes, but the sheet does not decide it.
//   - Whether the circuit clerk's civil filing fee is charged in full in every
//     circuit and whether any circuit waives it for indigency.
//   - What a participant does where the test and lock programme was completed
//     and the court has not dismissed and expunged. The subsection imposes the
//     duty in mandatory terms and describes no remedy; no enforcement pleading
//     is generated.
//   - How far the § 17C-5-2(j)(1) expungement reaches — court record only, or
//     State Police and arresting-agency records too. It changes what a later
//     background check will show, and the sheet says so rather than guessing.
//
// No conditional component and no fact placeholder appears anywhere in this
// family: the adopted packet sets make all four components required, and no
// template interpolates a participant answer. A second fixture on the same
// track would therefore render byte-for-byte the same packet, so this job adds
// no regression variant. The branches that matter are typed stops, and every
// one is exercised as a negative case by the committed verifier.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. West
// Virginia is not an enabled jurisdiction and this job does not enable one. The
// conviction and non-conviction petition tracks these nodes route to are other
// jobs and are untouched here.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Where a West Virginia participant looks the record up. Named once. */
const WV_RECORD_CHECK =
  "the certified disposition, judgment order and sentencing order from the clerk of the county of disposition, and the docket for every case on your list";

/** West Virginia help, named once so no stop is a dead end. */
const WV_LEGAL_HELP =
  "a West Virginia legal aid office, a West Virginia law school clinic, the lawyer referral service run by the West Virginia State Bar, or a West Virginia attorney";

/** Said on every route in this family. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes what the law does. It does not tell you what has happened in your case, and LegalEase has not looked. Nothing here is a decision about whether your record qualifies.";

/** The design's first instruction: say it before money changes hands. */
const ONCE_PER_LIFETIME =
  "Read this before you spend anything. Under W. Va. Code § 61-11-26(o) a person may obtain the relief afforded by §§ 61-11-26 and 61-11-26a only once. One petition, one lifetime. That is why the first job on this route is not to file anything, but to write down every conviction you have that could go into the same petition — including the old ones, including the ones you had forgotten, including traffic citations — so that the one petition you get is spent on the whole record you can clear rather than on the first record you thought of.";

/** Section 61-11-26(l). Narrower than the § 61-11-25 effect, and said so. */
const CONVICTION_EFFECT_LIMITS =
  "An expungement under § 61-11-26 does not mean the conviction is gone from every purpose. Subsection (l) requires an applicant for a position involving the prevention, detection, investigation, prosecution or incarceration of law violators to disclose an expunged conviction, and entities that are required by state or federal law to obtain criminal history checks may still learn of it. Nobody should tell you otherwise, and this packet will not.";

/** Section 61-11-25(e). The design forbids importing the § 61-11-26 carve-outs. */
const NON_CONVICTION_EFFECT =
  "The effect of a § 61-11-25 order is wide. The proceedings are considered never to have occurred, the court and the agencies reply that no record exists, and you need not disclose the record on an application for employment, credit or any other type of application. The section states no law-enforcement-employment exception and no legally-required-background-check exception. Those two exceptions belong to the conviction section, § 61-11-26, and they are not carried across to this one.";

/** The § 61-11-25 grant is discretionary in form. Never described as automatic. */
const DISCRETIONARY_NOT_AUTOMATIC =
  "One word in the section matters. On finding that there are no current charges or proceedings pending relating to the matter, the court may grant the petition. May, not shall. This route is not automatic, nothing on this page says it is, and a delay is not the same thing as a refusal.";

/** The DMV record is untouched on every West Virginia route here. */
const DMV_RECORD_NOT_EXPUNGED =
  "Your driving record is a separate thing and it is not cleared by any of this. No record held by the Division of Motor Vehicles may be expunged by virtue of an order entered under § 17C-5-2b, and § 61-11-26b independently bars a court from expunging a motor vehicle traffic control conviction for a person who held a commercial driver's licence or was driving a commercial vehicle, and from masking such a charge from a commercial driving record. The criminal record can be cleared; the driving record cannot.";

/** Nothing on any of these three nodes is a document the participant files. */
const NOTHING_IS_FILED_ON_THIS_NODE =
  "Nothing is filed on this page, and LegalEase generates no petition, motion or application here. What this page does is screen, explain and point you at the right next step. Where the step belongs to a court or an agency and it has not been taken, the answer is to ask them and then to get advice — not to file something the statute does not provide for.";

const WV_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge, seal or remove anything, and cannot make a circuit court, a clerk, a prosecuting attorney, the State Police or the Division of Motor Vehicles act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been expunged. Only the court file and your own record show that, and you are the one who reads them.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copies and you read them.",
  "LegalEase has not contacted any court, clerk, prosecuting attorney or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

const WV_CONVICTION_SOURCES: readonly string[] = [
  "W. Va. Code § 61-11-26, expungement of certain criminal convictions, procedures and effect, read in full at code.wvlegislature.gov on 6 August 2026.",
  "W. Va. Code § 61-11-26a, expungement with approved treatment or recovery and a job programme, at code.wvlegislature.gov, retrieved 6 August 2026.",
  "W. Va. Code § 61-11-26b, limitation on expungement for certain motor vehicle traffic control offences, at code.wvlegislature.gov, retrieved 6 August 2026.",
  "W. Va. Code § 59-1-11, fees to be charged by the clerk of the circuit court, at code.wvlegislature.gov, retrieved 6 August 2026.",
  "S.B. 562 (2020 Regular Session), expunging certain criminal convictions, in force 5 June 2020.",
  "West Virginia Judiciary court forms index, at courtswv.gov, retrieved 6 August 2026."
];

const WV_NON_CONVICTION_SOURCES: readonly string[] = [
  "W. Va. Code § 61-11-25, expungement for those found not guilty or against whom charges have been dismissed, and on completion of a deferred adjudication or pretrial diversion, read in full at code.wvlegislature.gov on 6 August 2026.",
  "W. Va. Code § 61-11-22, pretrial diversion agreements, and § 61-11-22a, deferred adjudication, at code.wvlegislature.gov, retrieved 6 August 2026.",
  "W. Va. Code § 17C-5-2b, deferral of further proceedings on condition of participation in the Motor Vehicle Alcohol Test and Lock Program, at code.wvlegislature.gov, retrieved 6 August 2026.",
  "H.B. 4399 (2024 Regular Session), creating the equitable right to expungement, in force 7 June 2024."
];

const WV_DUI_SOURCES: readonly string[] = [
  "W. Va. Code § 17C-5-2, driving under the influence, penalties, read in full at code.wvlegislature.gov on 6 August 2026; subsection (j)(1) is the provision that carries this route.",
  "W. Va. Code § 17C-5A-3a, the Motor Vehicle Alcohol Test and Lock Program, at code.wvlegislature.gov, retrieved 6 August 2026.",
  "W. Va. Code § 61-11-26b, limitation on expungement for certain motor vehicle traffic control offences, at code.wvlegislature.gov, retrieved 6 August 2026.",
  "H.B. 4712 (2026 Regular Session), in force 12 June 2026."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class WestVirginiaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "WestVirginiaGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different West Virginia route. */
export class WestVirginiaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "WestVirginiaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class WestVirginiaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "WestVirginiaBranchError";
  }
}

export const WV_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Only a West Virginia record is reached by any of these three routes. */
export const WV_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  west_virginia: true,
  another_state: false,
  federal: false,
  tribal: false,
  military: false
};

/** Whether the dismissal-for-plea question can be answered from the papers. */
export const WV_DISMISSAL_FOR_PLEA: Readonly<Record<string, string>> = {
  no: "within",
  yes: "excluded",
  cannot_tell: "unresolvable_from_the_papers"
};

/** How a § 61-11-25 case ended. Decides which route the node selects. */
export const WV_NON_CONVICTION_DISPOSITIONS: Readonly<Record<string, string>> = {
  acquitted: "acquittal_or_dismissal",
  dismissed: "acquittal_or_dismissal",
  pretrial_diversion_completed: "diversion_or_deferred",
  deferred_adjudication_completed: "diversion_or_deferred",
  cannot_tell: "unresolvable_from_the_papers",
  still_pending: "not_finished"
};

/** The § 17C-5-2(j)(1) population is under 21. */
export const WV_AGE_AT_OFFENSE: Readonly<Record<string, string>> = {
  under_21: "within",
  twenty_one_or_over: "outside"
};

/** The subsection reaches at least 0.02 and less than 0.08 percent. */
export const WV_ALCOHOL_CONCENTRATION: Readonly<Record<string, string>> = {
  between_002_and_008: "within",
  "008_or_more": "outside",
  not_known: "check_the_record"
};

/** Whether the test and lock programme was in fact completed. */
export const WV_PROGRAMME_OUTCOME: Readonly<Record<string, string>> = {
  completed: "within",
  not_completed: "outside",
  removed: "outside"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new WestVirginiaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualised legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

const OUT_OF_JURISDICTION_STOP =
  "The West Virginia Code reaches West Virginia records. It does not reach a federal, tribal, military or out-of-state record, and none of these three West Virginia routes touches one.";

const COLLATERAL_STOP =
  "Firearm rights, immigration status, professional licensing, law-enforcement or corrections employment, childcare, healthcare, security clearance and federal records are all governed outside these sections, and an expungement order does not settle any of them. Getting one of those wrong costs more than the record does.";

/**
 * Validates participant answers and routes to the correct West Virginia node.
 *
 * The order is the design's: the eligibility-advice boundary first; then record
 * jurisdiction, which every one of the three tracks lists as a stop condition;
 * then the collateral-consequence question, which all three list identically;
 * then each node's own screen. On the conviction node the prior-expungement and
 * exclusion questions come before anything else, because the design's first
 * instruction is that the once-per-lifetime limit must be said before money
 * changes hands. On the non-conviction node the prior-felony question is asked
 * first for the same reason: it closes the whole of § 61-11-25.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveWestVirginiaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Nobody is served an eligibility opinion by a guidance sheet.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", WV_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new WestVirginiaGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      WV_LEGAL_HELP,
      "Take the case papers and the certified dispositions to one of them and ask about your own record."
    );
  }

  // Gate 2. Record jurisdiction, a stop condition on all three tracks.
  const jurisdiction = branch(trackId, "recordJurisdiction", WV_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (!jurisdiction.resolved) {
    throw new WestVirginiaRouteMismatchError(
      trackId,
      "record_is_not_a_west_virginia_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal, tribal or military authority that holds the record",
      "Take the record to that authority and ask what its own law provides. If you also hold West Virginia records, those are handled separately and only those are served here."
    );
  }

  // Gate 3. Collateral consequences, a stop condition on all three tracks.
  const collateral = branch(
    trackId,
    "firearmsImmigrationOrLicensingQuestion",
    WV_YES_NO,
    facts.firearmsImmigrationOrLicensingQuestion
  );
  if (collateral.resolved) {
    throw new WestVirginiaGuidanceStopError(
      trackId,
      "collateral_consequence_question_in_play",
      COLLATERAL_STOP,
      "an immigration attorney where status is in play, and otherwise " + WV_LEGAL_HELP,
      "Ask about that consequence directly, and do not treat anything on a records route as an answer to it."
    );
  }

  if (trackId === "wv_common_conv_procedure") {
    const priorExpungement = branch(
      trackId,
      "priorExpungementGranted",
      WV_YES_NO,
      facts.priorExpungementGranted
    );
    if (priorExpungement.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "a_prior_expungement_has_probably_spent_the_once_per_lifetime_relief",
        "Section 61-11-26(o) allows the relief under §§ 61-11-26 and 61-11-26a only once. An expungement you already hold very likely exhausts it, and whether relief under § 60A-4-407 or § 17C-5-2b counts against the same limit is genuinely unsettled — subsection (o) by its terms reaches only the two conviction sections, and neither of the other two cross-references it. That is a textual reading, not a settled answer, and it is not one to act on unadvised when the whole of your one petition turns on it.",
        WV_LEGAL_HELP,
        "Take the earlier expungement order with you and ask which section it was granted under, and whether it spends the § 61-11-26 limit."
      );
    }

    const exclusion = branch(trackId, "exclusionScreen", WV_YES_NO, facts.exclusionScreen);
    if (exclusion.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "conviction_falls_within_the_statutory_exclusion_list",
        "Section 61-11-26(c) excludes fifteen categories, and the list is long and technical: a felony offence of violence against the person, a misdemeanour involving intentional physical injury to a minor or a law-enforcement officer, a felony with a minor victim, a § 61-8B-1 sexual offence, an offence involving a deadly weapon or dangerous instrument, the domestic and household-member offences, strangulation, driving under the influence, driving while a licence was revoked for DUI, the § 61-8-12 and § 61-8-19 offences, child neglect, the § 61-8B-8 and § 61-8B-9 offences, burglary of a structure regularly used as a dwelling, any conviction the sentencing judge found sexually motivated, and conspiracy or attempt at most of those. Whether a particular conviction falls inside one of them is a legal conclusion.",
        WV_LEGAL_HELP,
        "Take the certified disposition and the judgment order for every conviction on your list and ask which of them, if any, fall inside § 61-11-26(c)."
      );
    }

    const commercial = branch(trackId, "commercialDriving", WV_YES_NO, facts.commercialDriving);
    if (commercial.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "commercial_driver_or_commercial_vehicle",
        "Section 61-11-26b bars a court from expunging a motor vehicle traffic control conviction for a person who held a commercial driver's licence or permit, or was operating a commercial motor vehicle, at the time of the offence, and bars any action masking such a charge or conviction from a commercial driving record. That is a hard bar on the traffic part of the record, and what it leaves available on the rest of the record is a question for a lawyer.",
        WV_LEGAL_HELP,
        "Say at the outset that you hold, or held, a commercial licence. It changes what is available and it is not something to discover after the petition is filed."
      );
    }

    const felony = branch(trackId, "anyFelonyConviction", WV_YES_NO, facts.anyFelonyConviction);
    if (felony.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "a_felony_conviction_is_on_the_inventory",
        "Any felony on the list goes to legal review. The nonviolent determination that a felony petition turns on, and the same-transaction analysis that decides how convictions group, are legal conclusions rather than questions a participant can be asked to answer about themselves.",
        WV_LEGAL_HELP,
        "Take the certified disposition, the judgment order and the sentencing order for the felony and ask whether it is a nonviolent felony within § 61-11-26(b)(3), and how it groups with anything else on your list."
      );
    }

    const sameTransaction = branch(
      trackId,
      "sameTransactionUnclear",
      WV_YES_NO,
      facts.sameTransactionUnclear
    );
    if (sameTransaction.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "same_transaction_or_series_question_is_unclear",
        "Whether convictions arose from the same transaction, or from a connected series of transactions, decides how they group in a single petition and therefore what the one lifetime petition can cover. It is a legal conclusion, and getting it wrong on a once-per-lifetime petition is not a recoverable mistake.",
        WV_LEGAL_HELP,
        "Take the full inventory, with the certified disposition for each case, and ask how the convictions group before anything is filed."
      );
    }

    const pending = branch(trackId, "pendingCharges", WV_YES_NO, facts.pendingCharges);
    if (pending.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "criminal_charges_are_pending",
        "A pending charge changes what is available and in what order. Nothing on this page applies cleanly while something is still open, and the once-per-lifetime petition is the last thing to spend while the record is still moving.",
        "the clerk of the court where the matter is open, and then " + WV_LEGAL_HELP,
        "Find out what is still open and deal with that first. Come back to this route once nothing is pending."
      );
    }

    const orders = branch(trackId, "protectiveOrders", WV_YES_NO, facts.protectiveOrders);
    if (orders.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "a_restitution_protection_or_no_contact_order_exists",
        "Section 61-11-26(d)(7) requires a current restitution, protection, restraining or other no-contact order to be attached to the petition, and a past one to be disclosed in it. What a live order means for the petition, and how it interacts with the victim-service and opposition provisions, is a legal question rather than a form-filling one.",
        WV_LEGAL_HELP,
        "Get a copy of the order from the clerk of the court that entered it, and take it with you."
      );
    }

    const victim = branch(trackId, "identifiedVictimMayOppose", WV_YES_NO, facts.identifiedVictimMayOppose);
    if (victim.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "an_identified_victim_may_oppose",
        "Under § 61-11-26(f) the prosecuting attorney serves identified victims, and under subsection (g) any person served may file a notice of opposition within 30 days. An opposed petition is a contested proceeding with a clear-and-convincing burden on six elements, and that is advocacy rather than paperwork.",
        WV_LEGAL_HELP,
        "Say at the outset that a victim may oppose. It is the single fact most likely to change what the petition needs to say."
      );
    }
    derived.convictionRouteScreenPassed = true;
    return derived;
  }

  if (trackId === "wv_common_nc_procedure") {
    // Asked first: a prior felony conviction closes the whole section.
    const priorFelony = branch(trackId, "priorFelonyConviction", WV_YES_NO, facts.priorFelonyConviction);
    if (priorFelony.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "a_prior_felony_conviction_closes_the_whole_section",
        "Any prior felony conviction, in West Virginia or anywhere else, bars a person from filing under § 61-11-25 at all — whatever the disposition of the case you want cleared. That is a threshold bar on the whole section rather than an objection to one charge, and it is asked first so that nobody spends anything before knowing it.",
        WV_LEGAL_HELP,
        "Ask whether anything else reaches this record, including whether the conviction itself could be dealt with under the conviction sections. Do not pay for a § 61-11-25 petition on this record."
      );
    }

    const plea = branch(trackId, "dismissalForPlea", WV_DISMISSAL_FOR_PLEA, facts.dismissalForPlea);
    if (plea.resolved === "excluded") {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "dismissal_was_given_in_exchange_for_a_guilty_plea",
        "A dismissal given in exchange for a guilty plea to another offence resulting in a conviction is excluded from § 61-11-25. The dismissed charge and the conviction came out of the same bargain, and the section does not treat the dismissed half as a clean non-conviction.",
        WV_LEGAL_HELP,
        "Ask what the conviction half of the bargain leaves available, which is a conviction-section question rather than a § 61-11-25 one."
      );
    }
    if (plea.resolved === "unresolvable_from_the_papers") {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "whether_the_dismissal_was_for_a_plea_cannot_be_told_from_the_papers",
        "Whether a dismissal was given in exchange for a guilty plea is usually not apparent from the dismissal order itself; it takes reading the plea agreement or the docket. The design records this as the question that cannot safely be automated, so where it is not clear this route stops rather than guesses.",
        WV_LEGAL_HELP,
        "Take the dismissal order, the plea agreement if you have it, and the full docket, and ask what the dismissal was given for."
      );
    }

    const disposition = branch(
      trackId,
      "dispositionType",
      WV_NON_CONVICTION_DISPOSITIONS,
      facts.dispositionType
    );
    if (disposition.resolved === "not_finished") {
      throw new WestVirginiaRouteMismatchError(
        trackId,
        "the_case_has_not_ended_yet",
        "Section 61-11-25 works from an order of acquittal or dismissal. While the case is still going on neither exists, and the 60-day period the section imposes has not begun.",
        "the attorney representing you in the open case",
        "Deal with the open case first. Come back to this route once an order of acquittal or dismissal has been entered."
      );
    }
    if (disposition.resolved === "unresolvable_from_the_papers") {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "pretrial_diversion_and_deferred_adjudication_cannot_be_told_apart",
        "A pretrial diversion under § 61-11-22 and a deferred adjudication under § 61-11-22a are different things, and which one it was decides whether the family-or-household-member carve-out applies at all. Where the record does not say, or you cannot tell, this route stops rather than picking one.",
        "the clerk of the court that entered it, or the prosecuting attorney's office that signed the diversion agreement, and then " + WV_LEGAL_HELP,
        "Ask for the agreement or the order itself, and for the order recording full and successful completion. The document will usually name which of the two it was."
      );
    }
    derived.nonConvictionRoute = disposition.resolved;

    if (disposition.resolved === "diversion_or_deferred") {
      const household = branch(
        trackId,
        "familyOrHouseholdVictim",
        WV_YES_NO,
        facts.familyOrHouseholdVictim
      );
      if (household.resolved) {
        throw new WestVirginiaGuidanceStopError(
          trackId,
          "family_or_household_member_carve_out_may_apply",
          "Charges dismissed on full and successful completion of a deferred adjudication are excluded where the offence was one of the § 61-2-28 or § 61-2-9 offences and the alleged victim was a family or household member as defined in § 48-27-204. Whether the carve-out reaches a particular case turns on the offence charged and on the statutory definition, and both are legal questions.",
          WV_LEGAL_HELP,
          "Take the deferred-adjudication order and the charging document and ask whether the carve-out applies here."
        );
      }
    }

    const pending = branch(trackId, "pendingCharges", WV_YES_NO, facts.pendingCharges);
    if (pending.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "charges_or_proceedings_relating_to_the_matter_are_pending",
        "The court grants a § 61-11-25 petition on finding that there are no current charges or proceedings pending relating to the matter. While something related is still open, the finding the section requires cannot be made.",
        "the clerk of the court where the matter is open, and then " + WV_LEGAL_HELP,
        "Find out exactly what is still pending and how it relates to this case. Come back to this route once nothing related is open."
      );
    }
    return derived;
  }

  if (trackId === "wv_dui_test_and_lock_dismissal") {
    const stillLive = branch(trackId, "chargeStillLive", WV_YES_NO, facts.chargeStillLive);
    if (stillLive.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "the_charge_is_still_live_and_that_stage_is_outside_scope",
        "The motion for a continuance to enter the test and lock programme is made while the charge is still live. That is criminal defence at the charging stage, and this service does not advise at that stage. This is time-sensitive: the route this page describes only exists if that motion is made and the programme is entered.",
        WV_LEGAL_HELP + ", and the public defender's office or the court's own duty counsel if you have no lawyer",
        "Speak to a lawyer now rather than later. Ask specifically about a continuance under § 17C-5-2(j)(1) to take part in the Motor Vehicle Test and Lock Program."
      );
    }

    const age = branch(trackId, "ageAtOffense", WV_AGE_AT_OFFENSE, facts.ageAtOffense);
    if (age.resolved === "outside") {
      throw new WestVirginiaRouteMismatchError(
        trackId,
        "the_person_was_twenty_one_or_over_at_the_offence",
        "Subsection (j)(1) is written around a person under the age of 21. Somebody who was 21 or over at the time of the offence is outside it, whatever the recorded concentration was.",
        "the West Virginia non-conviction route under § 61-11-25 where the case ended in an acquittal or a dismissal, and otherwise " + WV_LEGAL_HELP,
        "Go back to the West Virginia intake and answer the questions for how the case actually ended."
      );
    }

    const concentration = branch(
      trackId,
      "alcoholConcentration",
      WV_ALCOHOL_CONCENTRATION,
      facts.alcoholConcentration
    );
    if (concentration.resolved === "outside") {
      throw new WestVirginiaRouteMismatchError(
        trackId,
        "the_recorded_concentration_is_at_or_above_the_subsection_limit",
        "Subsection (j)(1) reaches a concentration of at least two hundredths of one percent but less than eight hundredths. A recorded concentration of eight hundredths or more is a § 17C-5-2(e) or (f) offence and is not this subsection, and a DUI conviction is separately excluded from conviction expungement by § 61-11-26(c)(7) and § 61-11-26b.",
        WV_LEGAL_HELP,
        "Ask what the recorded concentration was and what the charge actually was, and then ask what is available for a case of that kind."
      );
    }
    derived.concentrationBranch = concentration.value;

    const first = branch(
      trackId,
      "firstOffenseUnderSubsection",
      WV_YES_NO,
      facts.firstOffenseUnderSubsection
    );
    if (!first.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "a_second_or_subsequent_offence_under_the_subsection",
        "The continuance and the dismissal-and-expungement in subsection (j)(1) are for a first offence under that subsection. For a second or subsequent one the subsection provides no continuance and no expungement.",
        WV_LEGAL_HELP,
        "Ask what is available for the later charge, and deal with the live case first if it is still open."
      );
    }

    const commercial = branch(trackId, "commercialDriving", WV_YES_NO, facts.commercialDriving);
    if (commercial.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "commercial_driver_or_commercial_vehicle",
        "Section 61-11-26b bars any action masking a motor vehicle charge or conviction from a commercial driving record, and bars expungement of a motor vehicle traffic control conviction for a person who held a commercial driver's licence or was operating a commercial motor vehicle. A commercial licence changes this route and it changes what the driving record will show afterwards.",
        WV_LEGAL_HELP,
        "Say at the outset that you hold, or held, a commercial licence, and ask what the bar means for both the criminal record and the driving record."
      );
    }

    const programme = branch(trackId, "programmeOutcome", WV_PROGRAMME_OUTCOME, facts.programmeOutcome);
    if (programme.resolved === "outside") {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "the_programme_was_not_completed_or_the_person_was_removed",
        "The court's duty to dismiss and expunge arises upon successful completion of the programme. Where the programme was not completed, or the person was removed from it, the subsection has the court proceed to adjudication of the alleged offence instead, and nothing on this page applies.",
        WV_LEGAL_HELP + ", and the attorney representing you if the charge is still before the court",
        "Ask what the position is now that the programme has ended, and whether anything can still be done about the programme itself."
      );
    }
    derived.programmeCompleted = true;

    const stillAppears = branch(trackId, "recordStillAppears", WV_YES_NO, facts.recordStillAppears);
    if (stillAppears.resolved) {
      throw new WestVirginiaGuidanceStopError(
        trackId,
        "record_still_appears_although_the_programme_was_completed",
        "The programme was completed and the charge is still showing. Subsection (j)(1) puts the duty on the court in mandatory terms — the court shall dismiss the charge and expunge the record as it relates to the alleged offence — but it describes no application, no motion to enforce and no remedy where the court has not acted. Whether a motion to enforce lies at all is unresolved, and this packet does not generate one.",
        "the clerk of the court in which the charge was pending, and then " + WV_LEGAL_HELP,
        "Ask the clerk in writing what the docket shows and whether an order of dismissal was entered, keep the reply with the Division of Motor Vehicles completion record, and take that pair to a lawyer."
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
  fees: string;
  feeWaiver: string;
  noticeOrService: readonly string[];
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
      "There is nothing to submit on this page and nothing for LegalEase to file. No petition, motion or application is generated here.",
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...WV_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "The record is a federal, tribal, military or out-of-state record.",
      "Firearm rights, immigration, professional licensing, law-enforcement or corrections employment, childcare, healthcare, a security clearance or a federal record is in play.",
      ...input.escalations
    ],
    officialSourceReferences: input.sources
  };
}

export const WEST_VIRGINIA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- wv_common_conv_procedure -------------------------------------------
  "wv-common-conv-procedure": sheet({
    templateId: "wv-common-conv-procedure",
    mechanismName:
      "Before you file: West Virginia gives you one conviction expungement, ever",
    whyNotAFiling:
      "Nothing is filed on this page. This is the screen that runs before any West Virginia conviction petition: the § 61-11-26(c) exclusion list, the § 61-11-26b commercial-driving bar, the once-per-lifetime limit at § 61-11-26(o), the inventory of everything that could go into a single petition, and the waiting period at § 61-11-26(b). The petition itself is a separate step, filed in the circuit court in which the conviction or convictions occurred, and it is not generated here.",
    processType: "court_adjacent",
    prerequisites: [
      "The convictions are West Virginia convictions.",
      "You are prepared to list every conviction you have, not only the one you came here about.",
      "You accept that this page screens and explains, and files nothing."
    ],
    documentsToObtain: [
      "A certified copy of the disposition, the judgment order and the sentencing order for every conviction on your list, from the clerk of the county of disposition. Ask for every case, not only the one you came in for, because the petition is once per lifetime. Most counties charge a per-copy fee.",
      "Written confirmation from the probation office of the date supervision ended, and from the institution of confinement of the date of release. The waiting period runs from the later of conviction, release and end of supervision, so this date is usually the one that decides eligibility.",
      "A copy of any restitution, protection, restraining or other no-contact order that is currently in force, from the clerk of the court that entered it. Section 61-11-26(d)(7) requires a current order to be attached to the petition; a past order is disclosed rather than attached."
    ],
    gather: [
      "Every West Virginia conviction on your record, however old, including traffic citations — the offence, the county, and the date of conviction for each.",
      "For each conviction, the date you finished any jail or prison term and any probation, parole or other supervision.",
      "Every name and alias you have used, and every address from the date of the offence to today. Section 61-11-26(d) requires both in the petition.",
      "Whether any court anywhere has ever granted you an expungement or similar relief.",
      "Whether you held a commercial driver's licence or permit, or were driving a commercial vehicle, at the time of any traffic offence on the list.",
      "Whether you have a medically documented history of substance abuse with successful compliance with an approved treatment or recovery programme, or have graduated from an approved job readiness adult training course.",
      "Whether any restitution, protection, restraining or other no-contact order was ever entered in any of these cases, and whether any of them is still in force today."
    ],
    destination: {
      name: "No destination of its own — the circuit court in which the conviction or convictions occurred, for the route this screen selects",
      detail:
        "Nothing is submitted here. Once the screen is clear, the route it selects is filed as a verified petition in the circuit court in which the conviction or convictions occurred. Where convictions are in more than one county, the current text of § 61-11-26 supports a single petition that groups the information by circuit court and is served on the prosecuting attorney of each county of conviction."
    },
    sequence: [
      ONCE_PER_LIFETIME,
      NOT_A_REPORT_ON_YOUR_CASE,
      "So begin with the inventory, not with the petition. Write down every West Virginia conviction you have, however old, including traffic citations. Get the certified disposition for each. This is the work that decides whether the one petition is worth what it costs.",
      "Then take the waiting period, which runs from the later of the conviction, the completion of any sentence of incarceration, and the completion of any period of supervision: one year for a single misdemeanour, two years from the last conviction for multiple misdemeanours, and five years for a nonviolent felony. The accelerated route at § 61-11-26a runs on shorter periods where there is documented treatment or recovery compliance, or an approved job readiness course.",
      "Then the exclusions, and there are fifteen of them at § 61-11-26(c). Violence to a person, injury to a minor or a law-enforcement officer, a minor victim, sexual offences, a deadly weapon, the domestic and household-member offences, strangulation, driving under the influence, driving while revoked for DUI, and burglary of a structure regularly used as a dwelling are all outside. Burglary of a building that is not a dwelling is not excluded. One point is worth stating plainly because it is often got wrong: a DUI conviction does not automatically block expungement of an unrelated otherwise expungeable felony if the DUI conviction is at least five years old when the petition is filed.",
      "Then the commercial-driving bar at § 61-11-26b, which is separate and absolute for the traffic part of the record.",
      "A note on where a multi-county petition goes, because you may be told two different things. The current text of § 61-11-26 says to petition the circuit court in which the conviction or convictions occurred, and § 61-11-26a says the circuit court or circuit courts in which they occurred. Neither names a county of residence, although a residence-county option has been described elsewhere. Until that is resolved, this page directs you to the circuit court of conviction and tells you to ask the clerk there what that circuit expects.",
      "What the petition itself involves, so that you know what you are being routed towards: it is verified under oath, it carries the twelve content items at § 61-11-26(d), and the petitioner serves five recipients under subsection (e) — the Superintendent of the State Police, the prosecuting attorney of each county of conviction, the chief law-enforcement officer of the arresting agency, the superintendent, warden or Commissioner of Corrections of any institution of confinement, and the court that disposed of the charge. The prosecuting attorney, not you, serves identified victims under subsection (f).",
      "The timings, which are the statute's rather than an estimate: anyone served has 30 days to file a notice of opposition, you have 30 days to reply, the court has 60 days to act, and on a grant the agencies have 60 days to certify that they have complied. Under subsection (h) the burden is clear and convincing evidence on six elements.",
      CONVICTION_EFFECT_LIMITS,
      DMV_RECORD_NOT_EXPUNGED,
      NOTHING_IS_FILED_ON_THIS_NODE
    ],
    fees:
      "On the route this screen selects, not on this page. The circuit clerk charges the same fee as for instituting a civil action under § 59-1-11(a)(1), which the official text sets at $200, and a person obtaining an order of expungement pays a further $100 to the records division of the West Virginia State Police under § 61-11-26(n). Whether every circuit charges the civil filing fee in full on an expungement petition is not established here, so ask the clerk of the circuit court of conviction what it will actually cost before you commit to it.",
    feeWaiver:
      "The $100 State Police processing fee is waived for a petition filed under § 61-11-26a. The circuit clerk's civil filing fee is not waived by either section; any waiver would be under the ordinary indigency practice of the circuit court, and whether any circuit applies one to an expungement petition is not established here. Ask the clerk.",
    noticeOrService: [
      "Nothing is served by you on this page.",
      "On the route this screen selects, the petitioner serves five recipients under § 61-11-26(e) and the prosecuting attorney serves identified victims under § 61-11-26(f). Anyone served, and any other interested person or agency, may file a notice of opposition within 30 days of receipt."
    ],
    expectedNextStage:
      "You leave this page with a complete inventory, a certified disposition for each case, a supervision-completion date and a clear view of whether anything on the list is excluded. That is what the petition route needs before it can start, and it is what decides whether spending the one lifetime petition is worth it.",
    canPrepare: [
      "This screen, the exclusion list and the waiting-period calculation.",
      "The inventory and records checklist that the petition route runs on.",
      "A plain account of what the petition involves, who is served and what the timings are.",
      "The statement of what an expungement under this section does and does not reach."
    ],
    escalations: [
      "Any felony conviction is on the inventory.",
      "You cannot tell whether convictions arose from the same transaction or a connected series.",
      "You hold, or held, a commercial driver's licence, or were driving a commercial vehicle.",
      "A restitution, protection, restraining or no-contact order exists or ever existed.",
      "An identified victim may oppose the petition.",
      "You have already been granted an expungement anywhere.",
      "Your convictions are in more than one county and you have been told to file where you live."
    ],
    sources: WV_CONVICTION_SOURCES
  }),

  // ---- wv_common_nc_procedure ----------------------------------------------
  "wv-common-nc-procedure": sheet({
    templateId: "wv-common-nc-procedure",
    mechanismName:
      "Before you file: what West Virginia checks on a non-conviction expungement",
    whyNotAFiling:
      "Nothing is filed on this page. This is the screen that runs before either West Virginia non-conviction petition: the two threshold bars in § 61-11-25, the 60-day rule, and which of the two routes the case belongs to. The petition itself is a separate step, filed as a civil petition in the circuit court in which the charges were filed, and it is not generated here.",
    processType: "court_adjacent",
    prerequisites: [
      "The charges are West Virginia charges.",
      "The case ended in a finding of not guilty, a dismissal, or completion of a pretrial diversion or a deferred adjudication.",
      "You accept that this page screens and explains, and files nothing."
    ],
    documentsToObtain: [
      "A certified copy of the order of acquittal or dismissal, from the clerk of the court that disposed of the charge. The order carries the date the 60-day period runs from and usually the stated reason for the dismissal.",
      "Where the case ended in a diversion or a deferred adjudication: the agreement or the order, and the order recording full and successful completion, from the clerk or from the prosecuting attorney's office that signed it. Which of the two it was decides whether the family-or-household-member carve-out applies at all."
    ],
    gather: [
      "Whether you have ever been convicted of a felony, in West Virginia or anywhere else. This is asked first because it closes the whole section.",
      "How the case ended, and the exact date of the order of acquittal or dismissal.",
      "Whether the charges were dismissed as part of a deal in which you pleaded guilty to a different offence.",
      "The county the charges were filed in, and whether the case was heard in municipal, magistrate or circuit court.",
      "Whether any criminal charge or proceeding relating to this matter is pending now.",
      "Whether this was a driving case, because your driving record is a separate question."
    ],
    destination: {
      name: "No destination of its own — the circuit court in which the charges were filed, for the route this screen selects",
      detail:
        "Nothing is submitted here. Section 61-11-25 puts the petition in the circuit court in which the charges were filed, even where the case itself was heard in a magistrate or municipal court. That catches people out, so it is worth reading twice."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Start with the question that closes the section. Any prior felony conviction, anywhere, bars you from filing under § 61-11-25 at all — whatever happened in the case you want cleared. It is asked first so that nobody pays for a route that was never open.",
      "Then the 60-day rule. The petition may not be filed sooner than 60 days after the order of acquittal or dismissal. Work that date out from the certified order rather than from memory.",
      "Then how the case ended, because it decides which of the two routes you are on: a straight acquittal or dismissal, or a dismissal after full and successful completion of a pretrial diversion under § 61-11-22 or a deferred adjudication under § 61-11-22a.",
      "Then the exclusion that is easiest to miss: a dismissal given in exchange for a guilty plea to another offence resulting in a conviction is outside the section. Whether that is what happened is often not apparent from the dismissal order, and where it is not clear this route stops rather than guessing.",
      "One correction worth having, because it is widely got wrong. The section's exemption for records relating to offences subject to § 15-12-1 et seq. applies only where the person was found not guilty by reason of mental illness, intellectual disability or addiction. It is a narrow not-guilty-by-reason-of carve-out, not a general sexual-offence exclusion, and read the wide way it would wrongly turn away people whose charges were dismissed outright.",
      "There is one more thing you were entitled to be told. Under § 61-11-25(b) any court entering an order of acquittal or dismissal shall inform the person of the right to petition for expungement. If nobody told you, that does not affect your right to file.",
      "The petition is free. Section 61-11-25(g) provides that no filing fees are charged and no costs assessed for filing an action under the section.",
      "A hearing is discretionary. The court need not set one, and only if it does are the prosecuting attorney and the arresting agency notified. So silence is not a signal, in either direction.",
      DISCRETIONARY_NOT_AUTOMATIC,
      NON_CONVICTION_EFFECT,
      "Two further things the section does that are worth knowing: under subsection (d) the orders enforcing the expungement are themselves sealed, and under subsection (f) the sealed records may later be inspected only on a motion by you, or on a prosecutor's petition showing the records are necessary to an investigation or prosecution.",
      DMV_RECORD_NOT_EXPUNGED,
      "One practical caution. Whether any of West Virginia's circuits impose local requirements on a § 61-11-25 petition — a cover sheet, a proposed order, a local service practice — has not been tested. Ask the circuit clerk what that circuit expects before you file.",
      NOTHING_IS_FILED_ON_THIS_NODE
    ],
    fees:
      "None, on this page or on the route it selects. Section 61-11-25(g) provides that there shall be no filing fees charged and no costs assessed for filing an action pursuant to that section. If a clerk asks you for a filing fee on a § 61-11-25 petition, that is worth querying, politely and with the subsection in your hand.",
    feeWaiver: "Not applicable. No fee is charged, so there is nothing to waive.",
    noticeOrService: [
      "Nothing is served by you on this page.",
      "On the route this screen selects, notice is discretionary: § 61-11-25(c) requires the court to notify the prosecuting attorney and the arresting agency only if it sets a hearing."
    ],
    expectedNextStage:
      "You leave this page knowing whether the section is open to you at all, when the 60 days run out, which of the two routes the case belongs to, and what the order would actually do.",
    canPrepare: [
      "This screen and the two threshold bars.",
      "The 60-day calculation and the records checklist the petition route runs on.",
      "A plain account of what a § 61-11-25 order does, and of the two things it does not reach.",
      "The correction about the narrow not-guilty-by-reason-of carve-out, which is widely misdescribed."
    ],
    escalations: [
      "You have any prior felony conviction anywhere.",
      "You cannot tell from the papers whether the dismissal was given in exchange for a guilty plea.",
      "The case ended in a deferred adjudication and the alleged victim may be a family or household member.",
      "You cannot tell a pretrial diversion from a deferred adjudication.",
      "A charge or proceeding relating to this matter is still pending."
    ],
    sources: WV_NON_CONVICTION_SOURCES
  }),

  // ---- wv_dui_test_and_lock_dismissal --------------------------------------
  "wv-dui-test-and-lock-guidance": sheet({
    templateId: "wv-dui-test-and-lock-guidance",
    mechanismName:
      "An under-21 first alcohol-driving charge the court clears itself when you finish the test and lock program",
    whyNotAFiling:
      "Nothing is filed by you on this route, and LegalEase generates no petition or application for it. Under W. Va. Code § 17C-5-2(j)(1), upon successful completion of the Motor Vehicle Test and Lock Program the court shall dismiss the charge and expunge the person's record as it relates to the alleged offence. The subsection describes no petition, no application and no waiting period after the continuance motion — so there is nothing to generate.",
    processType: "automatic",
    submissionMethod:
      "There is nothing to submit and nothing for LegalEase to file. The court acts on its own once the programme is completed, so there is no form to send, no office to send it to and no receipt to keep. What you do instead is check, and the next sheet in this packet is how.",
    prerequisites: [
      "You were under 21 at the time of the offence.",
      "The recorded alcohol concentration was at least two hundredths of one percent and less than eight hundredths. If you do not know what was recorded, the checklist in this packet is how you find out.",
      "It was a first offence under § 17C-5-2(j).",
      "A continuance was granted and you entered the Motor Vehicle Test and Lock Program, and you completed it."
    ],
    documentsToObtain: [
      "The Division of Motor Vehicles record showing successful completion of the Motor Vehicle Test and Lock Program, with the completion date. This is the fact the court's duty turns on.",
      "The court's order of dismissal and the docket entry, from the clerk of the court in which the charge was pending."
    ],
    gather: [
      "Your age on the date of the offence.",
      "The recorded blood alcohol concentration, if you know it, and where it is written down.",
      "Whether this was your first charge of this kind.",
      "The date you completed the test and lock programme.",
      "Which court the charge was in, and in which county.",
      "Whether anyone has told you the charge was dismissed, and whether you have seen the order."
    ],
    destination: {
      name: "The magistrate or municipal court in which the § 17C-5-2(j) charge was pending",
      detail:
        "Nothing is submitted by you after the continuance. On successful completion of the programme the court dismisses the charge and expunges the record as it relates to the alleged offence, on the statute's own terms. What this packet does is tell you how to confirm that the court has in fact done it, and what to do if it has not."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What the subsection says. Section 17C-5-2(j)(1) covers a person under 21 who drove with an alcohol concentration of at least two hundredths of one percent but less than eight hundredths, charged with a first offence under that subsection. Such a person may move for a continuance, from time to time, to take part in the Motor Vehicle Test and Lock Program under § 17C-5A-3a. On successful completion the court shall dismiss the charge and expunge the record as it relates to the alleged offence.",
      "Shall, not may. The dismissal and the expungement are mandatory on completion, and there is no petition to file, no application to make and no period to wait out.",
      "Two things the subsection also says, which are worth knowing. If the person fails to complete the programme the court proceeds to adjudication of the alleged offence. And a motion for a continuance may not be construed as an admission, or used as evidence.",
      "Where this packet does not go. The motion for the continuance is made while the charge is still live, and that is charge-stage criminal defence — legal work done while the case is still in front of the court. This service does not advise at that stage, and if that is where you are, the thing to do is speak to a lawyer now rather than read further here.",
      "So this page is about the stage after completion: confirming that the court did what the subsection requires. The checklist that follows sets out exactly what to ask for and from whom.",
      "Now the two things that are genuinely unsettled, stated rather than smoothed over. The first: how far the expungement reaches. The subsection expunges the person's record as it relates to the alleged offence and names no agency, unlike §§ 61-11-25 and 61-11-26, which reach agency and law-enforcement records expressly and impose a 60-day certification duty. Whether the State Police record and the arresting agency's record are cleared, or only the court record, is not established — and it changes what a later background check will show. Do not assume either way.",
      "The second: what happens if the court has not acted. The duty is on the court in mandatory terms, but the subsection describes no application, no motion to enforce and no remedy where the court does not dismiss and expunge. Whether a motion to enforce lies at all is unresolved, so no enforcement document is generated here. The route is the clerk first, then a lawyer.",
      DMV_RECORD_NOT_EXPUNGED,
      NOTHING_IS_FILED_ON_THIS_NODE
    ],
    fees:
      "None stated in § 17C-5-2(j)(1) for the dismissal or the expungement, and nothing is charged by this packet. The fine and the licence suspension attach to a conviction, which is what completing the programme avoids. Whether the programme itself carries a cost is a question for the Division of Motor Vehicles, and no figure for it is stated here.",
    feeWaiver: "Not applicable. The subsection states no fee for the dismissal or the expungement.",
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify.",
      "The subsection provides for no notice, no opposition window and no hearing on the dismissal and expungement. Nobody is required to write and tell you it has happened, which is exactly why the next sheet tells you to go and check."
    ],
    expectedNextStage:
      "The next sheet in this packet is the checklist: the two records to obtain, who holds each, and what a mismatch between them means.",
    canPrepare: [
      "This explanation of what § 17C-5-2(j)(1) requires of the court and of what it leaves unstated.",
      "The records checklist that follows it in this packet.",
      "An honest account of the two questions the subsection does not answer."
    ],
    escalations: [
      "The charge is still live and no continuance has been sought.",
      "You did not complete the programme, or were removed from it.",
      "You were 21 or over, or the recorded concentration was eight hundredths of one percent or higher.",
      "It was a second or subsequent charge of this kind.",
      "You hold, or held, a commercial driver's licence, or were driving a commercial vehicle.",
      "The programme was completed and the charge is still showing."
    ],
    sources: WV_DUI_SOURCES
  }),

  "wv-dui-test-and-lock-records-checklist": sheet({
    templateId: "wv-dui-test-and-lock-records-checklist",
    mechanismName: "Checking that the court dismissed and expunged: the two records to get",
    whyNotAFiling:
      "This is a checklist for obtaining two records and reading them against each other. Nothing on it is filed, and § 17C-5-2(j)(1) provides no participant application for LegalEase to prepare.",
    processType: "automatic",
    prerequisites: [
      "You completed the Motor Vehicle Test and Lock Program.",
      "You have read the sheet before this one, including the two things it says are unsettled."
    ],
    documentsToObtain: [
      "From the West Virginia Division of Motor Vehicles: the record showing that you successfully completed the Motor Vehicle Test and Lock Program, and the completion date.",
      "From the clerk of the court in which the charge was pending: the order dismissing the charge, and the docket entry for the case."
    ],
    gather: [
      "The completion date from the Division of Motor Vehicles record.",
      "The case number, the court and the county.",
      "The date of each check you make, and what each record showed on that date, in your own words.",
      "The name of anyone at the clerk's office who tells you something about the case, and when they told you."
    ],
    destination: {
      name: "The West Virginia Division of Motor Vehicles, and the clerk of the court in which the charge was pending",
      detail:
        "The Division of Motor Vehicles holds the programme completion record. The clerk holds the order and the docket. LegalEase contacts neither and reads neither; you request your own copies and you read them."
    },
    sequence: [
      "Get the Division of Motor Vehicles completion record first. It is the fact the court's duty turns on, and without it the conversation with the clerk has nothing behind it.",
      "Then ask the clerk of the court in which the charge was pending for the order of dismissal and for the docket entry.",
      "Read the two against each other. What you are looking for is a dismissal entered after the completion date, and a docket that no longer shows the charge as open or as a conviction.",
      "Where the docket still shows the charge as open, or as a conviction, that is the mismatch to raise with the clerk. Raise it as a question about what the record shows rather than as an accusation, because the most common explanation is that a step has not been processed rather than that anything was refused.",
      "Keep a dated copy of everything you are given, and a note of anything you are told. Nobody is required to write and tell you the dismissal has happened, so a copy you obtained yourself may be the only evidence of it you hold.",
      "Where the programme was completed and the clerk will not or cannot correct the record, this is where automated help ends. There is no enforcement document to file: the subsection imposes the duty on the court but describes no remedy, and whether a motion to enforce lies is unresolved. Take the pair of records to a lawyer.",
      "Remember what may not change even when everything works. The expungement reaches the person's record as it relates to the alleged offence; whether it also reaches the State Police record and the arresting agency's record is not established, so a later background check is worth checking for yourself rather than assuming.",
      DMV_RECORD_NOT_EXPUNGED,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    fees:
      "None charged by this packet. The Division of Motor Vehicles and the clerk of the court may each charge for copies of their own records; ask each what a copy costs before you request it.",
    feeWaiver: "Not applicable. There is no filing fee on this route, because there is nothing to file.",
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify.",
      "Nobody is required to tell you when the court has dismissed and expunged, which is why this checklist exists."
    ],
    expectedNextStage:
      "Either the two records agree and you keep a dated copy of each, or they do not, in which case you leave with a dated record of the mismatch and the one destination that exists for it.",
    canPrepare: [
      "This checklist and the order to work in.",
      "The account of what a mismatch between the two records means and how to raise it.",
      "The record of what you checked and when, which is what a lawyer will want first."
    ],
    escalations: [
      "The Division of Motor Vehicles cannot produce a completion record.",
      "The clerk cannot tell you whether an order of dismissal was entered.",
      "The docket still shows the charge as a conviction.",
      "A background check is still showing the charge after the court has dismissed it."
    ],
    sources: WV_DUI_SOURCES
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
      if (!WEST_VIRGINIA_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no West Virginia guidance template ${component.templateId} is registered.`
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
 * Asked on every West Virginia route in this family, in this order.
 *
 * The third is the design's own stop condition and it is recorded identically
 * on all three assigned tracks: firearm rights, immigration, professional
 * licensing, law-enforcement or corrections employment, childcare, healthcare,
 * a security clearance and federal records are all outside what an expungement
 * order settles, and a participant holding one of those questions should learn
 * so before reading a word about waiting periods.
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
      "Is the record from West Virginia, another state, the federal courts, a tribal court, or a military court?",
    required: true
  },
  {
    key: "firearmsImmigrationOrLicensingQuestion",
    label:
      "Is this about firearm rights, immigration, a professional licence, law-enforcement or corrections employment, childcare, healthcare, a security clearance, or a federal record?",
    required: true
  }
];

function westVirginiaTrack(input: {
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
    jurisdiction: "WV",
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

export const WEST_VIRGINIA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  westVirginiaTrack({
    trackId: "wv_common_conv_procedure",
    publicName: "Before you file: West Virginia gives you one conviction expungement, ever",
    mechanism: "shared_conviction_expungement_screen_bundling_counsel_and_routing_node",
    authority: "W. Va. Code §§ 61-11-26, 61-11-26a, 61-11-26b and 59-1-11(a)(1)",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    components: [
      {
        componentId: "wv_common_conv_procedure-process-guidance-1",
        templateId: "wv-common-conv-procedure"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "priorExpungementGranted",
        label:
          "Has any court in West Virginia, another state, or a federal court ever granted you an expungement or similar relief for a criminal conviction?",
        required: true
      },
      {
        key: "convictionInventory",
        label:
          "List every West Virginia conviction on your record, however old, including traffic citations — not just the one you came here about. What was each offence, in which county, and on what date were you convicted?",
        required: true
      },
      {
        key: "anyFelonyConviction",
        label: "Is any conviction on that list a felony?",
        required: true
      },
      {
        key: "supervisionCompletionDate",
        label:
          "For each conviction, on what date did you finish any jail or prison term and any probation, parole or other supervision?",
        required: true
      },
      {
        key: "exclusionScreen",
        label:
          "Did any of these convictions involve violence to a person, a minor victim, a sexual offence, a deadly weapon, a domestic or household-member victim, strangulation, driving under the influence, driving while your licence was revoked for DUI, or burglary of a home?",
        required: true
      },
      {
        key: "sameTransactionUnclear",
        label:
          "Is it unclear whether any of these convictions came out of the same incident, or a connected series of incidents?",
        required: true
      },
      {
        key: "commercialDriving",
        label:
          "At the time of any traffic offence on your list, did you hold a commercial driver's licence or permit, or were you driving a commercial vehicle?",
        required: true
      },
      {
        key: "pendingCharges",
        label: "Do you have any criminal charges pending against you right now?",
        required: true
      },
      {
        key: "protectiveOrders",
        label:
          "Is there now, or has there ever been, an order for restitution, protection, a restraining order or another no-contact order stopping you contacting a victim in any of these cases?",
        required: true
      },
      {
        key: "identifiedVictimMayOppose",
        label: "Is there an identified victim in any of these cases who might oppose the petition?",
        required: true
      },
      {
        key: "treatmentOrJobReadiness",
        label:
          "Do you have a medically documented history of substance abuse and successful compliance with an approved treatment or recovery and counselling programme, or have you graduated from an approved job readiness adult training course?",
        required: true
      },
      {
        key: "convictionCounties",
        label: "In which West Virginia county or counties were these convictions entered?",
        required: true
      }
    ],
    assembledPacketName: "west-virginia-conviction-expungement-screen",
    assembledPacketTitle: "West Virginia conviction expungement — the screen before the petition",
    customerDeliverableDescription:
      "Runs the complete W. Va. Code § 61-11-26(c) exclusion screen and the § 61-11-26b commercial-driving bar, states the once-per-lifetime limit before any money is spent and turns it into bundling advice, sets out the waiting periods and what the petition itself involves including who is served and the statutory timings, and explains what an expungement under this section does not reach. Nothing is filed by the participant on this node and no petition is generated.",
    notes:
      "Process guidance only. This node produces no relief; it screens, counsels bundling and routes to the conviction petition tracks. Three release blockers are preserved on the sheet rather than resolved: multi-county venue, whether relief under § 60A-4-407 or § 17C-5-2b spends the once-per-lifetime limit, and whether the circuit clerk's civil filing fee is charged in full and ever waived."
  }),

  westVirginiaTrack({
    trackId: "wv_common_nc_procedure",
    publicName: "Before you file: what West Virginia checks on a non-conviction expungement",
    mechanism: "shared_non_conviction_expungement_threshold_screen_and_routing_node",
    authority: "W. Va. Code §§ 61-11-25, 61-11-22, 61-11-22a and 17C-5-2b",
    recordTypes: ["arrest", "charge"],
    dispositions: [
      "acquitted",
      "dismissed",
      "pretrial_diversion_completed",
      "deferred_adjudication_completed"
    ],
    components: [
      {
        componentId: "wv_common_nc_procedure-process-guidance-1",
        templateId: "wv-common-nc-procedure"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "priorFelonyConviction",
        label: "Have you ever been convicted of a felony, in West Virginia or anywhere else?",
        required: true
      },
      {
        key: "dispositionType",
        label:
          "How did the case end — found not guilty, charges dismissed outright, dismissed after you completed a pretrial diversion agreement, dismissed after you completed a deferred adjudication, is it still going on, or can you not tell?",
        required: true
      },
      {
        key: "dispositionDate",
        label: "What is the date of the order of acquittal or dismissal?",
        required: true
      },
      {
        key: "dismissalForPlea",
        label:
          "Were these charges dismissed as part of a deal in which you pleaded guilty to a different offence and were convicted of it?",
        required: true
      },
      {
        key: "chargeCourtCounty",
        label:
          "In which county were the charges filed, and was the case heard in municipal, magistrate or circuit court?",
        required: true
      },
      {
        key: "familyOrHouseholdVictim",
        label:
          "On the deferred-adjudication route only: was the alleged victim your spouse, someone you have a child with, someone you lived with, or another family or household member?",
        required: false
      },
      {
        key: "pendingCharges",
        label:
          "Do you have any criminal charges or proceedings pending right now that relate to this matter?",
        required: true
      },
      {
        key: "drivingCase",
        label: "Was this a driving case, so that you may also be thinking about your driving record?",
        required: true
      }
    ],
    assembledPacketName: "west-virginia-non-conviction-expungement-screen",
    assembledPacketTitle: "West Virginia non-conviction expungement — the screen before the petition",
    customerDeliverableDescription:
      "Runs the two W. Va. Code § 61-11-25 threshold bars — any prior felony conviction, and a dismissal given in exchange for a guilty plea — confirms the 60-day rule, decides which of the two non-conviction routes the case belongs to, corrects the widely misdescribed not-guilty-by-reason-of carve-out, and states what a § 61-11-25 order actually does without importing the conviction section's exceptions. Nothing is filed by the participant on this node and no petition is generated.",
    notes:
      "Process guidance only. This node produces no relief; it screens and routes to the two non-conviction petition tracks. The § 61-11-26 law-enforcement-employment and legally-required-background-check exceptions must never be applied to § 61-11-25 relief, and the grant is discretionary in form and must not be described as automatic."
  }),

  westVirginiaTrack({
    trackId: "wv_dui_test_and_lock_dismissal",
    publicName:
      "An under-21 first alcohol-driving charge that the court clears itself when you finish the test and lock program",
    mechanism: "court_ordered_dismissal_and_expungement_on_completion_of_the_test_and_lock_program",
    authority: "W. Va. Code §§ 17C-5-2(j)(1), 17C-5A-3a and 61-11-26b",
    recordTypes: ["arrest", "charge"],
    dispositions: ["dismissed", "program_completion_dismissal"],
    components: [
      {
        componentId: "wv_dui_test_and_lock_dismissal-process-guidance-1",
        templateId: "wv-dui-test-and-lock-guidance"
      },
      {
        componentId: "wv_dui_test_and_lock_dismissal-records-checklist-2",
        templateId: "wv-dui-test-and-lock-records-checklist"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "chargeStillLive",
        label: "Is the charge still before the court, with no continuance yet granted?",
        required: true
      },
      {
        key: "ageAtOffense",
        label: "How old were you on the date of the offence — under 21, or 21 or over?",
        required: true
      },
      {
        key: "alcoholConcentration",
        label:
          "What blood alcohol concentration was recorded — at least 0.02 and under 0.08, 0.08 or more, or do you not know?",
        required: true
      },
      {
        key: "firstOffenseUnderSubsection",
        label: "Was this your first charge of this kind — an under-21 alcohol driving offence?",
        required: true
      },
      {
        key: "commercialDriving",
        label:
          "Did you hold a commercial driver's licence or permit, or were you driving a commercial vehicle, at the time?",
        required: true
      },
      {
        key: "programmeOutcome",
        label:
          "Did you complete the Motor Vehicle Test and Lock Program, not complete it, or were you removed from it?",
        required: true
      },
      {
        key: "programmeCompletionDate",
        label: "On what date did you complete the programme?",
        required: false
      },
      { key: "chargeCourt", label: "Which court was the charge in, and in which county?", required: true },
      {
        key: "dismissalConfirmed",
        label: "Has the court told you the charge was dismissed, and have you seen the order?",
        required: true
      },
      {
        key: "recordStillAppears",
        label: "Does the charge still appear on a court record search or a background check?",
        required: true
      }
    ],
    assembledPacketName: "west-virginia-test-and-lock-dismissal",
    assembledPacketTitle:
      "West Virginia test and lock dismissal — what the court does on its own under § 17C-5-2(j)(1)",
    customerDeliverableDescription:
      "Explains that on successful completion of the Motor Vehicle Test and Lock Program the court shall dismiss an under-21 first alcohol-driving charge and expunge the record as it relates to the alleged offence, with no petition and no waiting period, and gives the participant a checklist for confirming that the court did so against the Division of Motor Vehicles completion record and the court docket. Nothing is filed by the participant and no enforcement document is generated.",
    notes:
      "Process guidance only. The continuance motion is charge-stage criminal defence and is outside scope. Two release blockers are preserved on the sheets rather than resolved: whether a motion to enforce lies where the court has not dismissed and expunged, and whether the expungement reaches State Police and arresting-agency records or only the court record."
  })
];
