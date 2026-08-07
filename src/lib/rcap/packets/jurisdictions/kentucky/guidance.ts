// Kentucky process guidance — two routes, neither of which the participant
// files anything on.
//
// Two assigned tracks, both `process_guidance` in the adopted design, one
// component each:
//
//   - `ky_automatic_nonconviction_expungement_verification` is relief by
//     operation of law. Where a person is acquitted, or an order dismisses with
//     prejudice all criminal charges in a case and the dismissal was not in
//     exchange for a guilty plea to another charge, the court enters an order of
//     automatic expungement thirty days after the judgment becomes final, and
//     KRS 431.076(1)(a) says that order **shall not require any action by the
//     person**. So there is nothing to file, and this packet is a way of
//     checking that what should have happened on its own actually did.
//   - `ky_diversion_disposition_routing` reads a disposition and routes. On
//     successful completion of pretrial diversion the charges are listed as
//     dismissed-diverted under KRS 533.258 and do not constitute a criminal
//     conviction; the person need not disclose the disposition on an
//     application for employment, licensure or otherwise unless federal law
//     requires it, and diversion records may not be introduced as evidence
//     without the defendant's consent. **That is not expungement.** The record
//     still exists and still shows until it is expunged, and the design says in
//     terms that the participant must not be told otherwise.
//
// Two rules from the design shape every line of copy here.
//
// The first: never tell a participant their case has cleared. The automatic
// order is entered by the court without telling anybody to do anything, which
// is exactly what makes it invisible — nobody writes to say it happened. The
// packet's job is to send the participant to the circuit court clerk to confirm
// the order was entered, and to be honest that until they do, nobody knows.
//
// The second, on the diversion node: until the prejudice question is
// classified, no diverted participant may be told their case has already
// cleared automatically. The controlling review records that a diversion
// dismissal order commonly does not say whether it is with or without
// prejudice — silence is the norm rather than the exception — and the automatic
// subsection turns on a dismissal with prejudice that was not in exchange for a
// guilty plea. That question is not resolved, so this module does not resolve
// it: a silent order ends automated assistance and routes to a person.
//
// The sixty-day point is a real deadline that the design establishes, and it is
// the one deadline stated here. The court distributes the order to a standard
// list of agencies; distribution beyond that list has to be asked for within
// sixty days of the expungement. The packet flags it at the point the order is
// confirmed, because that is when it starts to matter and when it is easiest to
// miss. The packet does not write the request: making it is the participant's,
// and nothing on either route is prepared for signature.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Kentucky is
// not an enabled jurisdiction and this job does not enable one. The Kentucky
// petition routes, including `ky_nonconviction_expungement`, are other jobs with
// real forms and are untouched here — both of these sheets route to them by
// name and prepare nothing for them.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Kentucky help, named once, with no organisation held out as the answer. */
const KY_LEGAL_HELP =
  "a Kentucky legal aid office, a Kentucky law school clinic, the lawyer referral service run by the Kentucky Bar Association, or a Kentucky attorney who does expungement work";

/** The petition route this service does not prepare and does not file. */
const KY_PETITION_ROUTE =
  "the Kentucky expungement petition route, which is a real petition on a real court form";

/** Said on both sheets, because it is the thing most likely to go wrong. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes what the law does. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether your record qualifies.";

/** The automatic route's own honesty problem, stated on its sheet. */
const NOBODY_WILL_WRITE_AND_TELL_YOU =
  "Nobody is required to write and tell you that the order was entered. That is the awkward side of a route that happens on its own: it can be done and you would not know, and it can have been missed and you would not know that either. Confirming it with the circuit court clerk is the only way to find out.";

/** Nothing is generated on either route. */
const NOTHING_IS_GENERATED_HERE =
  "There is no petition, motion, application or request on this route for LegalEase to prepare, and none is generated. What this packet does is explain the rule, tell you what to ask, and tell you where the answer comes from.";

const KY_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge anything, and cannot make a court, a clerk, a records office or anybody else act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you whether an order was entered in your case. The circuit court clerk holds that answer and you are the one who asks for it.",
  "LegalEase does not obtain, hold, inspect or authenticate your records, and does not want documents sent to it.",
  "LegalEase has not contacted any court, clerk, prosecutor or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

const KY_AUTO_SOURCES: readonly string[] = [
  "KRS 431.076, expungement of records of acquittal or dismissal, official statute text.",
  "KRS 431.076(1)(a), the automatic order entered thirty days after the judgment becomes final, which shall not require any action by the person.",
  "KRS 431.076(4), the records the section reaches, which do not include Cabinet for Health and Family Services records.",
  "KRS 431.076(8), which makes the section retroactive except for subsection (1)(a).",
  "Kentucky Circuit Court Clerks' Manual, July 2026."
];

const KY_DIVERSION_SOURCES: readonly string[] = [
  "KRS 533.258, effect of successful completion of pretrial diversion, official statute text.",
  "KRS 533.250, pretrial diversion eligibility.",
  "KRS 431.076, expungement of records of acquittal or dismissal, for the route this node may lead to.",
  "Kentucky Circuit Court Clerks' Manual, July 2026."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class KentuckyGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "KentuckyGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Kentucky route. */
export class KentuckyRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "KentuckyRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class KentuckyBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "KentuckyBranchError";
  }
}

export const KY_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Only a Kentucky record is reached by either route. */
export const KY_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  kentucky: true,
  another_state: false,
  federal: false,
  tribal: false,
  military: false
};

/**
 * How the case ended, as the order records it.
 *
 * The automatic subsection reaches an acquittal, and an order dismissing with
 * prejudice all criminal charges in the case. A dismissal without prejudice is
 * a different thing and is not within it, which is why the two are kept apart
 * rather than collapsed into "dismissed".
 */
export const KY_DISPOSITION_TYPES: Readonly<Record<string, string>> = {
  acquitted: "within",
  dismissed_with_prejudice: "within",
  dismissed_without_prejudice: "outside_the_automatic_subsection",
  convicted_or_other_disposition: "not_this_route",
  not_sure: "unresolvable_without_the_order"
};

/**
 * Whether the case ended before 15 July 2020.
 *
 * KRS 431.076(8) makes the section retroactive except for subsection (1)(a),
 * so the automatic route does not reach a disposition before that date. The
 * petition route is not so limited, which is where an earlier case goes.
 */
export const KY_BEFORE_CUTOFF: Readonly<Record<string, string>> = {
  yes: "before_the_cutoff",
  no: "on_or_after_the_cutoff",
  not_sure: "unresolvable_without_the_order"
};

/** Whether the clerk has been asked, and what the clerk said. */
export const KY_ORDER_STATUS: Readonly<Record<string, string>> = {
  not_checked_yet: "not_checked_yet",
  entered: "entered",
  not_entered_after_thirty_days: "not_entered_after_thirty_days"
};

/** Whether distribution beyond the standard list is wanted, and when it is asked for. */
export const KY_DISTRIBUTION_REQUEST: Readonly<Record<string, string>> = {
  not_wanted: "not_wanted",
  wanted_within_sixty_days_of_entry: "inside_the_window",
  wanted_more_than_sixty_days_after_entry: "outside_the_window"
};

/** What the diversion dismissal order says on its face about prejudice. */
export const KY_PREJUDICE_ON_ORDER: Readonly<Record<string, string>> = {
  with_prejudice: "stated_with_prejudice",
  without_prejudice: "stated_without_prejudice",
  order_does_not_say: "silent",
  order_not_in_hand: "not_read"
};

/** Felony or misdemeanour, which decides which petition route a case would take. */
export const KY_CHARGE_CLASSES: Readonly<Record<string, string>> = {
  felony: "felony",
  misdemeanor: "misdemeanor",
  both: "both"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new KentuckyBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const OUT_OF_JURISDICTION_STOP =
  "Kentucky's expungement law reaches Kentucky records. Neither of these routes reaches a federal, out-of-state, military or tribal record, and no Kentucky order obliges any of those authorities to do anything.";

const READ_THE_ORDER_FIRST =
  "the circuit court clerk in the county where the case was heard";

/**
 * Validates participant answers and routes to the correct Kentucky node.
 *
 * Record jurisdiction is screened first on both tracks. After that each route
 * asks its own questions, and both fail closed rather than guessing: where the
 * answer to a question is in a court order that has not been read, the order is
 * the answer and this function says so instead of proceeding.
 *
 * Every stop and every mismatch carries a reason, a destination and the next
 * step to take there.
 */
export function deriveKentuckyGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  const jurisdiction = branch(trackId, "recordJurisdiction", KY_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (!jurisdiction.resolved) {
    throw new KentuckyRouteMismatchError(
      trackId,
      "record_is_not_a_kentucky_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal, tribal or military authority that holds the record",
      "Take the record to that authority and ask what its own law provides. If you also hold Kentucky records, those are handled separately and only those are served here."
    );
  }

  if (trackId === "ky_automatic_nonconviction_expungement_verification") {
    const disposition = branch(trackId, "autoDispositionType", KY_DISPOSITION_TYPES, facts.autoDispositionType);
    if (disposition.resolved === "outside_the_automatic_subsection") {
      throw new KentuckyRouteMismatchError(
        trackId,
        "the_dismissal_was_not_with_prejudice",
        "The automatic order under KRS 431.076(1)(a) follows an acquittal, or an order dismissing with prejudice all criminal charges in the case. A dismissal without prejudice leaves the charges capable of being brought again, and the automatic subsection does not reach it.",
        KY_PETITION_ROUTE,
        "Go back to the Kentucky intake and answer the questions for a dismissal without prejudice. Take the wording from the order rather than from memory, because the two words change the route."
      );
    }
    if (disposition.resolved === "not_this_route") {
      throw new KentuckyRouteMismatchError(
        trackId,
        "the_case_did_not_end_in_acquittal_or_dismissal",
        "This route is only about a case that ended in an acquittal or in a dismissal of all the charges. A conviction, or any other disposition, is reached by different Kentucky provisions with different conditions.",
        "the Kentucky expungement routes for convictions and for other dispositions",
        "Go back to the Kentucky intake and answer the questions for how the case actually ended."
      );
    }
    if (disposition.resolved === "unresolvable_without_the_order") {
      throw new KentuckyGuidanceStopError(
        trackId,
        "how_the_case_ended_is_not_known_without_reading_the_order",
        "Everything on this route turns on what the order says, and the difference between a dismissal with prejudice and one without prejudice is not something to settle from recollection. The words are on the order.",
        READ_THE_ORDER_FIRST,
        "Ask the clerk for a copy of the order that ended the case, read what it says, and come back to this route with the wording in front of you."
      );
    }
    derived.dispositionBranch = disposition.value;

    const cutoff = branch(trackId, "autoDispositionBefore15July2020", KY_BEFORE_CUTOFF, facts.autoDispositionBefore15July2020);
    if (cutoff.resolved === "before_the_cutoff") {
      throw new KentuckyRouteMismatchError(
        trackId,
        "the_case_ended_before_15_july_2020",
        "KRS 431.076(8) makes the section retroactive except for subsection (1)(a), which is the automatic one. So a case that ended before 15 July 2020 is not reached by the automatic order, however clearly it would otherwise fit. That is a limit on this route only: the petition route is not confined to cases after that date.",
        KY_PETITION_ROUTE,
        "Go back to the Kentucky intake and answer the questions for the petition route. Being outside the automatic subsection is not the same as being outside expungement."
      );
    }
    if (cutoff.resolved === "unresolvable_without_the_order") {
      throw new KentuckyGuidanceStopError(
        trackId,
        "whether_the_case_ended_before_15_july_2020_is_not_known",
        "The automatic subsection does not reach a disposition before 15 July 2020, so the date the case ended decides which route this is. A date either side of that line is worth getting from the record rather than estimating.",
        READ_THE_ORDER_FIRST,
        "Ask the clerk for the date of the judgment or the order of dismissal, and come back to this route with it."
      );
    }

    const allCharges = branch(trackId, "autoAllChargesResolvedThatWay", KY_YES_NO, facts.autoAllChargesResolvedThatWay);
    if (!allCharges.resolved) {
      throw new KentuckyRouteMismatchError(
        trackId,
        "only_some_of_the_charges_in_the_case_were_resolved_that_way",
        "The automatic subsection reaches an order dismissing all criminal charges in a case. Where some charges went one way and some another, the case is not within it, and what is available depends on what happened to each charge.",
        KY_PETITION_ROUTE + ", and " + KY_LEGAL_HELP,
        "Take the full docket, showing every charge and how each one ended, and ask what is available for the case as a whole."
      );
    }

    const pleaExchange = branch(trackId, "autoDismissedInExchangeForAPlea", KY_YES_NO, facts.autoDismissedInExchangeForAPlea);
    if (pleaExchange.resolved) {
      throw new KentuckyRouteMismatchError(
        trackId,
        "charges_were_dismissed_in_exchange_for_a_guilty_plea_to_another_charge",
        "The automatic subsection does not reach a dismissal given in exchange for a guilty plea to another charge. Where that is what happened, the dismissal and the plea are one disposition, and it is the plea that decides what is available.",
        "the Kentucky expungement routes for convictions",
        "Go back to the Kentucky intake and answer the questions for the charge you pleaded to, because that is the record that is doing the damage."
      );
    }

    const traffic = branch(trackId, "autoTrafficInfraction", KY_YES_NO, facts.autoTrafficInfraction);
    if (traffic.resolved) {
      throw new KentuckyRouteMismatchError(
        trackId,
        "the_charge_was_a_traffic_infraction_rather_than_a_misdemeanor",
        "A traffic infraction that is not otherwise classified as a misdemeanor is outside this route. It is also, usually, a different kind of record with different consequences, and it is worth asking the clerk what it actually is before assuming either way.",
        READ_THE_ORDER_FIRST + ", and then " + KY_LEGAL_HELP,
        "Ask the clerk how the charge is classified on the record. If it is classified as a misdemeanor, come back to this route and say so."
      );
    }

    const orderStatus = branch(trackId, "autoOrderStatusFromClerk", KY_ORDER_STATUS, facts.autoOrderStatusFromClerk);
    if (orderStatus.resolved === "not_entered_after_thirty_days") {
      throw new KentuckyGuidanceStopError(
        trackId,
        "no_expungement_order_was_entered_after_the_thirty_days",
        "The thirty days have run and the clerk cannot show an order of automatic expungement. That is not something this packet can fix and not something you can prompt by filing under this subsection, because the subsection provides nothing for you to file. It is either an error to raise or a case that belongs on the petition route.",
        KY_PETITION_ROUTE + ", and " + KY_LEGAL_HELP,
        "Ask the clerk in writing what the docket shows and keep the reply. Then take that, with the order that ended the case, and ask whether this is an error to raise or a petition to bring."
      );
    }
    derived.orderStatusBranch = orderStatus.value;

    if (orderStatus.resolved === "entered") {
      const stillShowing = branch(trackId, "autoStillOnBackgroundCheck", KY_YES_NO, facts.autoStillOnBackgroundCheck);
      if (stillShowing.resolved) {
        throw new KentuckyGuidanceStopError(
          trackId,
          "the_record_still_appears_on_a_background_check_after_the_order_was_entered",
          "An order was entered and the record is still turning up on a background check. That is not a court problem to solve by filing something else: it is usually a copy of the record held by somebody the order has to reach, or by a commercial screening company that took a copy before the order and has not refreshed it.",
          "the circuit court clerk, and then " + KY_LEGAL_HELP,
          "Get a dated copy of the order and a dated copy of the background check that shows the record, and take both. Which of the two is out of step decides what can be done about it."
        );
      }

      const distribution = branch(
        trackId,
        "autoDistributionBeyondStandardList",
        KY_DISTRIBUTION_REQUEST,
        facts.autoDistributionBeyondStandardList
      );
      if (distribution.resolved === "outside_the_window") {
        throw new KentuckyGuidanceStopError(
          trackId,
          "distribution_beyond_the_standard_list_is_wanted_more_than_sixty_days_after_entry",
          "Distribution of the order beyond the standard list of agencies has to be asked for within sixty days of the expungement, and more than sixty days have passed since the order was entered. Whether anything can still be done about that is a question for somebody who can look at the case, not a question this packet should answer.",
          KY_LEGAL_HELP,
          "Take the order, its date, and the name of each agency you want it to reach, and ask what is still possible."
        );
      }
      derived.distributionBranch = distribution.value;
    }

    return derived;
  }

  if (trackId === "ky_diversion_disposition_routing") {
    const completed = branch(trackId, "divCompletedSuccessfully", KY_YES_NO, facts.divCompletedSuccessfully);
    if (!completed.resolved) {
      throw new KentuckyRouteMismatchError(
        trackId,
        "the_diversion_was_voided_rather_than_completed",
        "Everything on this page follows from successful completion of the diversion. Where the diversion was voided instead, the case went back to being a criminal case and was disposed of on that footing, and it is that disposition rather than the diversion that decides what is available.",
        "the Kentucky expungement routes for how the case actually ended",
        "Go back to the Kentucky intake and answer the questions for the disposition the court entered after the diversion was voided."
      );
    }

    const entered = branch(trackId, "divDismissalEntered", KY_YES_NO, facts.divDismissalEntered);
    if (!entered.resolved) {
      throw new KentuckyGuidanceStopError(
        trackId,
        "the_dismissal_order_has_not_been_entered",
        "You completed the diversion and the court has not entered an order dismissing the charges. Until that order exists there is no dismissed-diverted designation to rely on, and the record still shows the charges as they were. Getting the order entered is a correction to the record, and it needs a lawyer rather than a form.",
        KY_LEGAL_HELP,
        "Take your diversion agreement, your proof of completion and the docket, and ask what is needed to get the dismissal entered."
      );
    }

    const prejudice = branch(trackId, "divPrejudiceOnTheOrder", KY_PREJUDICE_ON_ORDER, facts.divPrejudiceOnTheOrder);
    if (prejudice.resolved === "not_read") {
      throw new KentuckyGuidanceStopError(
        trackId,
        "the_dismissal_order_has_not_been_read",
        "The routing on this page turns on what the dismissal order says on its face, so an order nobody has read cannot route anything. This is the one thing to get before anything else.",
        READ_THE_ORDER_FIRST,
        "Ask the clerk for a copy of the dismissal order, read what it says about prejudice, and come back to this route with it."
      );
    }
    if (prejudice.resolved === "silent") {
      throw new KentuckyGuidanceStopError(
        trackId,
        "the_dismissal_order_does_not_say_whether_it_is_with_or_without_prejudice",
        "The order does not say whether the dismissal is with or without prejudice, and that silence is the ordinary case rather than an oddity in yours. It matters because the automatic expungement route turns on a dismissal with prejudice, and reading the silence either way would be a guess presented as an answer. Automated help stops here rather than doing that.",
        KY_LEGAL_HELP,
        "Take the dismissal order and the diversion agreement and ask what the dismissal counts as. That question decides which expungement route, if any, the case is on."
      );
    }
    if (prejudice.resolved === "stated_without_prejudice") {
      throw new KentuckyRouteMismatchError(
        trackId,
        "the_dismissal_order_says_the_dismissal_is_without_prejudice",
        "The order says the dismissal is without prejudice. The automatic expungement subsection turns on a dismissal with prejudice, so it is not that route, and what remains is the petition route with its own conditions.",
        KY_PETITION_ROUTE,
        "Go back to the Kentucky intake and answer the questions for the petition route, taking the wording from the order."
      );
    }
    derived.prejudiceBranch = prejudice.value;

    const waiver = branch(trackId, "divExpungementWaiver", KY_YES_NO, facts.divExpungementWaiver);
    if (waiver.resolved) {
      throw new KentuckyGuidanceStopError(
        trackId,
        "the_diversion_agreement_contains_an_expungement_waiver",
        "Your diversion agreement contains a clause giving up the right to seek expungement. Whether such a clause binds you, and what it reaches, is an argument rather than a lookup, and it is not one this packet is going to have on your behalf or quietly assume the answer to.",
        KY_LEGAL_HELP,
        "Take the diversion agreement itself, with the clause in it, and ask what it does and does not prevent."
      );
    }

    const chargeClass = branch(trackId, "divChargeClass", KY_CHARGE_CLASSES, facts.divChargeClass);
    derived.chargeClassBranch = chargeClass.value;
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

/**
 * Builds one guidance sheet.
 *
 * Fees, fee waiver and notice are required on every sheet rather than defaulted,
 * so that no route can inherit another route's law by omission.
 */
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
      "There is nothing to submit and nothing for LegalEase to file. No petition, motion, application or request is generated on this route.",
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...KY_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "The record is a federal, out-of-state, military or tribal record.",
      ...input.escalations
    ],
    officialSourceReferences: input.sources
  };
}

export const KENTUCKY_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "ky-automatic-nonconviction-verification": sheet({
    templateId: "ky-automatic-nonconviction-verification",
    mechanismName:
      "A Kentucky acquittal or dismissal with prejudice: the order the court enters on its own",
    whyNotAFiling:
      "Nothing is filed by you. Under KRS 431.076(1)(a) the court enters an order of automatic expungement thirty days after the judgment becomes final, and the statute says that order shall not require any action by the person. There is nothing on this subsection for LegalEase to prepare, so nothing is prepared.",
    processType: "automatic",
    prerequisites: [
      "The record is a Kentucky record.",
      "The case ended in an acquittal, or in an order dismissing with prejudice all of the charges.",
      "The case ended on or after 15 July 2020.",
      "You can get a copy of the order that ended the case, and reach the circuit court clerk in that county."
    ],
    documentsToObtain: [
      "A copy of the judgment of acquittal, or of the order dismissing the charges, from the circuit court clerk in the county where the case was heard.",
      "Later, a copy of the order of automatic expungement itself, if the clerk confirms one was entered."
    ],
    gather: [
      "The county the case was heard in, and the case number.",
      "The date the case ended, taken from the order rather than from memory.",
      "Whether the order says the dismissal is with prejudice, in those words.",
      "Whether every charge in the case was resolved that way, or only some of them.",
      "The date of each enquiry you make, and what you were told."
    ],
    destination: {
      name: "No destination. The order is entered by the court under KRS 431.076(1)(a)",
      detail:
        "There is nowhere for you to send anything. The court enters the order thirty days after the judgment becomes final, and the statute says it shall not require any action by the person. The circuit court clerk in the county where the case was heard is where you confirm that it happened."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What the rule is. Where a person is acquitted, or an order dismisses with prejudice all the criminal charges in a case and the dismissal was not in exchange for a guilty plea to another charge, the court enters an order of automatic expungement thirty days after the judgment becomes final.",
      "The part worth reading twice: the statute says that order shall not require any action by the person. Nothing is filed, nothing is applied for, and nobody has to ask.",
      "What the order does. The criminal records in the custody of the court and of any other agency, including law enforcement records, are expunged, and the proceedings are deemed never to have occurred.",
      "One limit on that reach, which is easy to be caught out by. KRS 431.076(4) does not extend to records held by the Cabinet for Health and Family Services, so a Cabinet record is not dealt with by this order.",
      "Another limit, and the one that most often decides whether this route is yours at all. KRS 431.076(8) makes the section retroactive except for the automatic subsection, so a case that ended before 15 July 2020 is not reached by the automatic order. That is not the end of expungement for it — the petition route is not confined to cases after that date.",
      NOBODY_WILL_WRITE_AND_TELL_YOU,
      "So the whole of what this packet asks you to do is one thing: ring or write to the circuit court clerk in the county where the case was heard, give the case number, and ask whether an order of automatic expungement has been entered.",
      "Ask for a copy of the order if there is one, and keep it with the date you got it. Nobody sends it to you unprompted, and a copy you obtained yourself may be the only evidence of it you ever hold.",
      "If the thirty days have not yet run, note the date they will, and ask after that rather than before. The clock starts when the judgment becomes final, not when the hearing happened.",
      "When the clerk confirms an order was entered, there is one deadline on this route and this is the moment it starts to matter. The court distributes the order to a standard list of agencies. Distribution beyond that list has to be asked for within sixty days of the expungement. Ask the clerk what the standard list covers, and if some other agency holds the record, make the request inside those sixty days — you make it, not this packet.",
      "And if the clerk says no order was entered, do not read that as a refusal or as a finding about your case. It is a fact to take to somebody, along with the order that ended the case.",
      NOTHING_IS_GENERATED_HERE
    ],
    fees: "None. There is no filing on this route, so there is nothing on it to pay for. The clerk may charge for copies of documents; ask what the charge is before you ask for copies.",
    feeWaiver: "Not applicable. There is no filing fee to waive where there is nothing to file.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "The court distributes the order to a standard list of agencies. Ask the clerk what that list covers in your county.",
      "Distribution beyond the standard list has to be asked for within sixty days of the expungement, and the request is yours to make."
    ],
    expectedNextStage:
      "You leave this packet with one question to put to the circuit court clerk, the date from which it is worth asking it, and a clear idea of what the answer means either way. What you do not leave with is a belief about what has already happened to your record, because nobody knows that yet.",
    canPrepare: [
      "This account of the automatic subsection and of the two limits on it.",
      "The question to put to the circuit court clerk, and the date from which to put it.",
      "The note about the sixty-day window for distribution beyond the standard list.",
      "The list of what to keep, and of what each answer from the clerk means."
    ],
    escalations: [
      "The thirty days have run and the clerk cannot show an order.",
      "The record is still turning up on a background check after an order was entered.",
      "An agency outside the standard list holds the record and more than sixty days have passed.",
      "Only some of the charges in the case were dismissed."
    ],
    sources: KY_AUTO_SOURCES
  }),

  "ky-diversion-disposition-routing": sheet({
    templateId: "ky-diversion-disposition-routing",
    mechanismName:
      "A completed Kentucky pretrial diversion: what the disposition counts as, and what it does not",
    whyNotAFiling:
      "Nothing is filed at this point. This page reads a disposition and works out which route the case is on. KRS 533.258 gives a completed diversion a particular status; it does not expunge anything, and there is nothing here for LegalEase to prepare.",
    processType: "court_adjacent",
    prerequisites: [
      "The record is a Kentucky record.",
      "You completed the diversion rather than having it voided.",
      "You have, or can get, a copy of the order dismissing the charges and a copy of your diversion agreement."
    ],
    documentsToObtain: [
      "The order dismissing the charges, from the circuit court clerk in the county where the case was heard.",
      "Your pretrial diversion agreement, which you should have a copy of and which the clerk's file will also hold."
    ],
    gather: [
      "The county the case was heard in, and the case number.",
      "The date you finished the diversion programme.",
      "What the dismissal order says about prejudice, in its own words.",
      "Whether the diversion agreement contains a clause giving up the right to seek expungement.",
      "Whether the charges were felonies or misdemeanours."
    ],
    destination: {
      name: "No destination. This page reads the order and routes; the answer is in the circuit court clerk's file",
      detail:
        "There is nowhere to send anything from this page. The clerk in the county where the case was heard holds the dismissal order and the diversion agreement, and those two documents decide which expungement route, if any, the case is on."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What completing a diversion gets you. Under KRS 533.258 the charges are listed as dismissed-diverted and do not constitute a criminal conviction.",
      "Two practical consequences of that, both worth knowing precisely. You need not disclose the disposition on an application for employment, for licensure or otherwise, unless federal law requires it. And the diversion records may not be introduced as evidence without your consent.",
      "Now the part that this whole page exists to say. The dismissed-diverted designation is not expungement. The record still exists and it still shows until it is expunged, and anybody who tells you the case is gone because you completed the diversion is telling you something the statute does not say.",
      "That is why the disclosure rule and the records rule above matter so much: for the time being they are what you have, and they are worth knowing exactly rather than approximately.",
      "So the question this page answers is which expungement route the case is on, and that turns on a single line in the dismissal order.",
      "Get the order and look for the words with prejudice or without prejudice. The automatic expungement route under KRS 431.076 turns on a dismissal with prejudice; a dismissal without prejudice is not on that route.",
      "Very often the order says neither. That silence is the ordinary case in a diverted matter rather than something odd about yours, and it is the point at which automated help stops. What the dismissal counts as is then a question for a lawyer, and reading it either way here would be a guess dressed up as an answer.",
      "Whatever the order says, do not treat the case as already cleared. Even where the words with prejudice are on the face of it, whether the automatic route has operated on a diverted case is not settled here, and the only way to find out whether an order was entered is to ask the circuit court clerk.",
      "Check the diversion agreement too, for a clause giving up the right to seek expungement. If there is one, stop and take advice: whether it binds you is an argument, not a lookup.",
      "Note whether the charges were felonies or misdemeanours. It does not change anything on this page, but it decides which petition route the case would take, and it is the first thing you will be asked.",
      NOTHING_IS_GENERATED_HERE
    ],
    fees: "None. Nothing is filed at this point, so there is nothing to pay for. The clerk may charge for copies of the order or the agreement; ask what the charge is first.",
    feeWaiver: "Not applicable. There is no filing fee to waive where there is nothing to file.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nothing is distributed to any agency as a result of this page."
    ],
    expectedNextStage:
      "You leave this page knowing what the dismissed-diverted designation does and does not do, with the one line in the order that decides the route, and with the two documents anybody you take this to will ask for first. Where the order is silent, what you leave with is the reason it stops here rather than a guess about which way it goes.",
    canPrepare: [
      "This account of what KRS 533.258 gives you, stated precisely rather than optimistically.",
      "The disclosure rule and the evidence rule, which are what you have until the record is expunged.",
      "The single question to put to the dismissal order, and what each answer routes to.",
      "The warning about an expungement waiver in the diversion agreement."
    ],
    escalations: [
      "The dismissal order does not say whether it is with or without prejudice.",
      "The court never entered an order dismissing the charges.",
      "The diversion agreement contains a clause giving up the right to seek expungement.",
      "Somebody has told you the record is gone because the diversion was completed."
    ],
    sources: KY_DIVERSION_SOURCES
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
      if (!KENTUCKY_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Kentucky guidance template ${component.templateId} is registered.`
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

/** Asked on both Kentucky routes: neither reaches a record from anywhere else. */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label:
      "Is the record from Kentucky, another state, the federal courts, a tribal court, or a military court?",
    required: true
  }
];

function kentuckyTrack(input: {
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
    jurisdiction: "KY",
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

export const KENTUCKY_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  kentuckyTrack({
    trackId: "ky_automatic_nonconviction_expungement_verification",
    publicName: "Check whether your dismissed or acquitted Kentucky case already cleared itself",
    mechanism: "verification_of_the_automatic_expungement_order_under_krs_431_076_1_a",
    authority:
      "KRS 431.076(1)(a), KRS 431.076(4), KRS 431.076(5)(a), KRS 431.076(6) and KRS 431.076(8)",
    recordTypes: ["charge", "court_record", "arrest"],
    dispositions: ["acquitted", "dismissed_with_prejudice"],
    components: [
      {
        componentId: "ky_automatic_nonconviction_expungement_verification-process-guidance-1",
        templateId: "ky-automatic-nonconviction-verification"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      { key: "autoCounty", label: "In which Kentucky county was the case?", required: true },
      { key: "autoCaseNumber", label: "What is the case number?", required: true },
      { key: "autoDispositionDate", label: "On what date did the case end?", required: true },
      {
        key: "autoDispositionType",
        label:
          "How did the case end — were you acquitted, were the charges dismissed with prejudice, were they dismissed without prejudice, did it end some other way, or are you not sure?",
        required: true
      },
      {
        key: "autoDispositionBefore15July2020",
        label: "Did the case end before 15 July 2020?",
        required: true
      },
      {
        key: "autoAllChargesResolvedThatWay",
        label: "Were all of the charges in the case resolved that way, rather than only some of them?",
        required: true
      },
      {
        key: "autoDismissedInExchangeForAPlea",
        label:
          "Were any charges dismissed as part of a deal where you pleaded guilty to something else?",
        required: true
      },
      {
        key: "autoTrafficInfraction",
        label: "Was the charge a traffic infraction rather than a misdemeanor?",
        required: true
      },
      {
        key: "autoOrderStatusFromClerk",
        label:
          "Have you asked the circuit court clerk whether an order of automatic expungement was entered — not yet, yes and it was, or yes and it was not even though the thirty days have passed?",
        required: true
      },
      {
        key: "autoStillOnBackgroundCheck",
        label: "Is the case still appearing on background checks?",
        required: false
      },
      {
        key: "autoDistributionBeyondStandardList",
        label:
          "Do you need the order sent to an agency outside the court's standard list — no, yes and it is within sixty days of the expungement, or yes and it is more than sixty days after it?",
        required: false
      }
    ],
    assembledPacketName: "kentucky-automatic-expungement-verification",
    assembledPacketTitle:
      "Kentucky automatic expungement — checking that the order the court owes you was entered",
    customerDeliverableDescription:
      "Explains that under KRS 431.076(1)(a) a Kentucky acquittal, or an order dismissing with prejudice all charges in a case where the dismissal was not in exchange for a guilty plea, produces an order of automatic expungement thirty days after the judgment becomes final, and that the statute says the order shall not require any action by the person. States the two limits that decide whether the route applies: the section does not reach Cabinet for Health and Family Services records, and the automatic subsection does not reach dispositions before 15 July 2020. Gives the participant the single question to put to the circuit court clerk, flags the sixty-day window for distribution beyond the standard list at the point the order is confirmed, and never tells the participant their case has cleared.",
    notes:
      "Process guidance only. Relief is automatic by operation of KRS 431.076(1)(a); nothing is filed and nothing is prepared. Never tell a participant their case has cleared — the packet routes to the circuit court clerk for confirmation. Where the thirty days have run and no order was entered, the route hands off to the Kentucky expungement petition route rather than inventing an application under this subsection."
  }),

  kentuckyTrack({
    trackId: "ky_diversion_disposition_routing",
    publicName: "Work out what your diverted Kentucky case counts as",
    mechanism: "routing_of_a_completed_pretrial_diversion_disposition_under_krs_533_258",
    authority: "KRS 533.258(1), KRS 533.258(2), KRS 533.258(3), KRS 533.250(1)(f) and KRS 431.076",
    recordTypes: ["charge", "court_record"],
    dispositions: ["dismissed_diverted"],
    components: [
      {
        componentId: "ky_diversion_disposition_routing-process-guidance-1",
        templateId: "ky-diversion-disposition-routing"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      { key: "divCounty", label: "In which Kentucky county was the case?", required: true },
      { key: "divCaseNumber", label: "What is the case number?", required: true },
      {
        key: "divCompletionDate",
        label: "On what date did you finish the diversion programme?",
        required: true
      },
      {
        key: "divCompletedSuccessfully",
        label: "Did you complete the diversion, rather than having it voided?",
        required: true
      },
      {
        key: "divDismissalEntered",
        label: "Has the court entered an order dismissing the charges?",
        required: true
      },
      {
        key: "divPrejudiceOnTheOrder",
        label:
          "Look at the dismissal order. Does it say the charges are dismissed with prejudice, without prejudice, does it not say either way, or do you not have the order?",
        required: true
      },
      {
        key: "divExpungementWaiver",
        label:
          "Does your diversion agreement contain a clause where you gave up the right to seek expungement?",
        required: true
      },
      {
        key: "divChargeClass",
        label: "Were the charges felonies, misdemeanors, or both?",
        required: true
      }
    ],
    assembledPacketName: "kentucky-diversion-disposition-routing",
    assembledPacketTitle:
      "Kentucky pretrial diversion — what a completed diversion counts as, and what it does not",
    customerDeliverableDescription:
      "Explains that on successful completion of pretrial diversion the charges are listed as dismissed-diverted under KRS 533.258 and do not constitute a criminal conviction, that the disposition need not be disclosed on an application for employment, licensure or otherwise unless federal law requires it, and that diversion records may not be introduced as evidence without the defendant's consent — while stating plainly that the designation is not expungement and that the record still exists and still shows until it is expunged. Reads the dismissal order to route the case, and stops rather than guessing where the order does not say whether the dismissal is with or without prejudice, which the controlling review records as the norm.",
    notes:
      "Process guidance only. Nothing is filed at this node. The dismissed-diverted designation is not expungement and the participant must not be told otherwise. Until the prejudice question is classified, no diverted participant may be told their case has already cleared automatically; a silent or ambiguous dismissal order, or an expungement waiver in the diversion agreement, ends automated assistance and routes to counsel."
  })
];
