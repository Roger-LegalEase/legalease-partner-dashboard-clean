// Illinois process guidance — the four automatic routes, and when not to wait
// for them.
//
// Four assigned routes, all four implemented. None has a participant filing:
// the Illinois State Police, local law enforcement and the circuit court clerks
// do the work, on statutory schedules, without anybody applying.
//
// The design is explicit that verification is an instruction and a separate
// workflow, not a filing packet. So these sheets do three things: explain what
// the mechanism does and when, send the participant to the one free check that
// tells them whether it happened, and name the petition route to use instead
// where waiting is the wrong answer.
//
// Two dates and one condition run through the whole family, and getting them
// wrong is the failure mode the design guards against:
//
//   - 1 January 2028 for municipal ordinance violations and Class C
//     misdemeanours, and for the Class 4 felony prostitution sealing.
//   - 1 January 2029 for the general Clean Slate sealing, phased in through
//     1 January 2034 for older records.
//   - Both the State Police and the circuit clerk duties are subject to
//     appropriations, so even the 2029 date is conditional rather than
//     promised.
//
// The design instruction is therefore absolute and the verifier enforces it:
// never say a record will be cleared automatically before the operative date.
// No sheet here predicts a completion date, and none says a particular record
// has already been cleared.
//
// Sealing is not expungement, and on the general route that distinction is the
// reason to file rather than wait. The automatic system seals; it never
// expunges. It also does not touch records the eligibility subsection excludes,
// even where petition sealing would still reach them. Those are the two reasons
// the design says to give a participant for filing anyway, and both are on the
// sheet.
//
// Verification is the free ISP Access and Review transcript. On the cannabis
// route the statute requires the State Police to allow Access and Review for
// exactly this purpose and to publicise it, so pointing the participant there
// is not a workaround — it is the mechanism the legislature built. Running it
// first is what stops someone paying to petition for a record that was already
// cleared.
//
// Every typed stop in this family routes to the same statewide destination the
// design names: the Office of the State Appellate Defender, Expungement Unit,
// on 866-787-1776. Stops that also have a specific alternate route name it as
// well, so a participant is never left with a refusal and no address.
//
// One content restriction is carried from the design and must not be relaxed:
// the prostitution route does not ask graphic questions about the circumstances
// of the offence. Where a participant indicates their involvement resulted from
// trafficking, the stronger route is the trafficking provision and the
// questioning changes rather than continuing.
//
// What these templates never do: turn guidance into a court filing, generate a
// petition or motion, promise a completion date, state that a particular record
// has already been sealed or expunged without verification, quote a fee, or
// tell a participant to wait where the design says to file.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Illinois
// is not an enabled jurisdiction and this job does not enable one.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * The worker-branch legal-output position for this family.
 *
 * Built and put forward; counsel has not adopted it. The adoption records and
 * the packet proof are integration-owned and name no Illinois guidance track,
 * so `ILLINOIS_COUNSEL_ADOPTED` is false on this branch and the verifier proves
 * it rather than trusting it.
 */
export const ILLINOIS_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const ILLINOIS_COUNSEL_ADOPTED = false;

/** The statewide referral destination the design names for every stop. */
export const OSAD_EXPUNGEMENT_UNIT =
  "the Office of the State Appellate Defender, Expungement Unit, on 866-787-1776";

/** Operative dates. Nothing in this module predicts a completion date. */
export const IL_ORDINANCE_CLASS_C_DATE = "1 January 2028";
export const IL_PROSTITUTION_SEALING_DEADLINE = "1 January 2028";
export const IL_GENERAL_CLEAN_SLATE_DATE = "1 January 2029";
export const IL_PHASE_IN_COMPLETION_DATE = "1 January 2034";

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The automatic route does not answer this participant; a destination is named. */
export class IllinoisGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "IllinoisGuidanceStopError";
  }
}

/** The participant belongs on a different Illinois route, which is named. */
export class IllinoisRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "IllinoisRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class IllinoisBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "IllinoisBranchError";
  }
}

export const IL_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** How the cannabis matter ended. */
export const IL_CANNABIS_DISPOSITIONS: Readonly<Record<string, string>> = {
  no_charges_filed: "no charges were ever filed",
  dismissed: "the charges were dismissed",
  vacated: "the charges were vacated",
  acquitted: "the case ended in acquittal",
  civil_law_violation: "it was a civil law violation",
  conviction: "conviction"
};

/** Whether the free Access and Review transcript has been run, and what it showed. */
export const IL_ACCESS_AND_REVIEW: Readonly<Record<string, string>> = {
  not_yet_requested: "not_yet_requested",
  requested_record_gone: "requested_record_gone",
  requested_record_still_shows: "requested_record_still_shows"
};

const PETITION_TRACKS =
  "the Illinois petition routes — sealing after two or three years, or expungement of a non-conviction where destruction rather than sealing is what you need";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new IllinoisBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Illinois stops, and routes to the
 * correct Illinois mechanism.
 *
 * A transcript that still shows the record is handled per route. On the
 * cannabis route the design makes it a stop, because the statutory deadlines
 * have passed and the answer is investigation rather than a paid petition — so
 * it hands off to a named destination rather than terminating. Everywhere else
 * a record that has not yet cleared is exactly who the sheet is written for and
 * is carried through.
 */
export function deriveIllinoisGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (trackId === "il-auto-seal-2029") {
    if (branch(trackId, "wantsReliefBefore2029", IL_YES_NO, facts.wantsReliefBefore2029).resolved) {
      throw new IllinoisRouteMismatchError(
        trackId,
        "relief_needed_before_the_operative_date",
        `The general automatic sealing is not operative until ${IL_GENERAL_CLEAN_SLATE_DATE}, older records are phased in through ${IL_PHASE_IN_COMPLETION_DATE}, and both the State Police and the clerk duties are subject to appropriations. Nothing about your record will happen on its own before then, so waiting is the wrong answer where you need this now.`,
        `${PETITION_TRACKS}; for help choosing between them, ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    if (branch(trackId, "wantsExpungementNotSealing", IL_YES_NO, facts.wantsExpungementNotSealing).resolved) {
      throw new IllinoisRouteMismatchError(
        trackId,
        "wants_expungement_which_automatic_sealing_never_gives",
        "The automatic system seals. It never expunges, so if what you need is the record destroyed rather than hidden from most background checks, waiting for it will not get you there no matter how long you wait.",
        `the Illinois expungement petition route for a non-conviction; to check which applies to your record, ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    if (branch(trackId, "recordMayBeExcludedFromAuto", IL_YES_NO, facts.recordMayBeExcludedFromAuto).resolved) {
      throw new IllinoisRouteMismatchError(
        trackId,
        "record_may_be_excluded_from_automatic_sealing",
        "The eligibility subsection leaves out several categories, including many felonies, Article 9 and Article 11 offences, Class X felonies and offences requiring registration. A record it leaves out is not swept up in 2029 — but petition sealing may still reach it, which is a different question with a different answer.",
        `${PETITION_TRACKS}; confirm the category against your transcript, then ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    if (
      branch(trackId, "currentlyServingOrPendingCharges", IL_YES_NO, facts.currentlyServingOrPendingCharges)
        .resolved
    ) {
      throw new IllinoisGuidanceStopError(
        trackId,
        "sentence_or_charges_not_yet_resolved",
        "The automatic timing runs from the end of a sentence, supervision or qualified probation, and a pending charge keeps the clock from starting. While either is live there is nothing for the automatic route to act on yet.",
        `wait until the sentence, supervision or probation has ended and any pending charge is resolved, then request a fresh Access and Review transcript and check again; for the timing on your own record, ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }
  }

  if (trackId === "il-auto-seal-2028") {
    const ordinance = branch(trackId, "isOrdinanceOrClassC", IL_YES_NO, facts.isOrdinanceOrClassC);
    if (!ordinance.resolved) {
      throw new IllinoisRouteMismatchError(
        trackId,
        "not_an_ordinance_violation_or_class_c_misdemeanor",
        `This earlier ${IL_ORDINANCE_CLASS_C_DATE} schedule covers municipal ordinance violations and Class C misdemeanours only. Anything else falls under the general automatic sealing, which starts later and on different terms.`,
        `the general Illinois automatic sealing route beginning ${IL_GENERAL_CLEAN_SLATE_DATE}; first confirm how the case was actually classified by requesting your free Access and Review transcript, since the classification is what decides which schedule you are on, and if the transcript is unclear ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    if (branch(trackId, "wantsReliefBefore2028", IL_YES_NO, facts.wantsReliefBefore2028).resolved) {
      throw new IllinoisRouteMismatchError(
        trackId,
        "relief_needed_before_the_operative_date",
        `The clerks' sealing runs from ${IL_ORDINANCE_CLASS_C_DATE} and then each 1 January and 1 July, and it is subject to appropriations. Nothing happens on your record before that date, so where you need it sooner the petition route is the one that moves.`,
        `the Illinois sealing petition route; for help with it, ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    derived.caseClosedDate = typeof facts.caseClosedDate === "string" ? facts.caseClosedDate.trim() : "";
  }

  if (trackId === "il-cannabis-auto") {
    const disposition = branch(trackId, "cannabisDisposition", IL_CANNABIS_DISPOSITIONS, facts.cannabisDisposition);
    if (disposition.value === "conviction") {
      throw new IllinoisRouteMismatchError(
        trackId,
        "cannabis_conviction_rather_than_arrest_record",
        "The automatic clearing reached arrest records where no charges were filed or the charges ended without a conviction. A cannabis conviction is a different mechanism: it is vacated and expunged on a motion, which is something you take to the court rather than something that happens on its own.",
        `the Illinois cannabis conviction vacatur and expungement motion route; for help preparing it, ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }
    derived.dispositionAllegation = disposition.resolved;

    if (!branch(trackId, "cannabisOffenceBeforeJune2019", IL_YES_NO, facts.cannabisOffenceBeforeJune2019).resolved) {
      throw new IllinoisRouteMismatchError(
        trackId,
        "offence_on_or_after_25_june_2019",
        "The automatic cannabis clearing reached minor cannabis offences committed before 25 June 2019. Something that happened on or after that date was not part of it.",
        `the Illinois petition routes for a non-conviction record; to confirm which fits, ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    if (!branch(trackId, "quantityUnder30Grams", IL_YES_NO, facts.quantityUnder30Grams).resolved) {
      throw new IllinoisRouteMismatchError(
        trackId,
        "quantity_above_the_minor_cannabis_threshold",
        "The automatic clearing was for minor cannabis offences, which are limited by quantity. More than thirty grams is outside it.",
        `${PETITION_TRACKS}; to confirm the quantity on the record itself, request an Access and Review transcript, then ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    const accessReview = branch(trackId, "hasRunAccessAndReview", IL_ACCESS_AND_REVIEW, facts.hasRunAccessAndReview);
    if (accessReview.value === "requested_record_still_shows") {
      throw new IllinoisGuidanceStopError(
        trackId,
        "record_still_shows_after_the_statutory_deadline",
        "The statutory deadlines for this clearing have all passed, so a record that still appears on your own transcript is not a matter of waiting longer — something did not happen that should have. That needs looking into, and it is specifically not a reason to pay to petition for relief you may already be entitled to.",
        `${OSAD_EXPUNGEMENT_UNIT}, taking your Access and Review transcript with you, and ask them to check why the record was not cleared before paying for any petition`
      );
    }
    derived.accessAndReview = accessReview.value;
  }

  if (trackId === "il-prostitution-j-auto") {
    // Asked once, plainly, and never followed up with questions about the
    // circumstances of the offence. The design forbids that questioning.
    if (branch(trackId, "isTraffickingSurvivor", IL_YES_NO, facts.isTraffickingSurvivor).resolved) {
      throw new IllinoisRouteMismatchError(
        trackId,
        "trafficking_route_is_stronger",
        "Where involvement resulted from trafficking, Illinois has a separate and stronger route, and the questions that route asks are different from these. Continuing here would give you the weaker remedy.",
        `the Illinois trafficking-survivor record relief route; to be taken through it without repeating your history unnecessarily, ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    if (!branch(trackId, "isClass4FelonyProstitution", IL_YES_NO, facts.isClass4FelonyProstitution).resolved) {
      throw new IllinoisGuidanceStopError(
        trackId,
        "record_not_clearly_class_4_felony_prostitution",
        "This automatic sealing is written for Class 4 felony prostitution records specifically. Where the transcript does not clearly show that classification, the route cannot be confirmed from here, and guessing at the class would send you to the wrong remedy.",
        `request the free Access and Review transcript to read the exact classification, then take it to ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    if (branch(trackId, "wantsReliefBefore2028", IL_YES_NO, facts.wantsReliefBefore2028).resolved) {
      throw new IllinoisRouteMismatchError(
        trackId,
        "relief_needed_before_the_sealing_deadline",
        `The agencies and the clerks have until ${IL_PROSTITUTION_SEALING_DEADLINE} to complete this sealing. Where you need the record dealt with sooner, there is a participant motion that does not wait on that deadline.`,
        `the Illinois participant motion to vacate and seal a prostitution record; for help preparing it, ${OSAD_EXPUNGEMENT_UNIT}`
      );
    }

    derived.accessAndReview = branch(
      trackId,
      "hasRunAccessAndReview",
      IL_ACCESS_AND_REVIEW,
      facts.hasRunAccessAndReview
    ).value;
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route and no fee to pay. Illinois does this one itself — the only step that is yours is checking whether it happened.";

const ACCESS_AND_REVIEW =
  "Request your free Access and Review transcript from the Illinois State Police. You attend an Illinois law enforcement or correctional facility, or a licensed fingerprint vendor, give fingerprints and identifying details, and receive your statewide criminal history transcript. Access and Review is free on the State Police fee schedule. LegalEase does not obtain, receive or inspect that transcript — you read your own.";

const NO_PROMISED_DATE =
  "This page does not tell you the day your record will clear, and nobody honestly can. Both the State Police duties and the circuit clerk duties are subject to appropriations, so the schedule is a statutory instruction rather than a guarantee.";

const SEALING_IS_NOT_EXPUNGEMENT =
  "Sealing is not expungement. A sealed record still exists and remains visible to some employers and agencies that are entitled to see it; an expunged record is destroyed. The automatic system only ever seals.";

const CORRECT_YOUR_ANSWER =
  "If the transcript and your recollection disagree, the transcript is the thing that governs. Correct your answers to match it before relying on anything here.";

const IL_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal or expunge anything, and cannot make the State Police, a law enforcement agency or a circuit clerk act.",
  "LegalEase cannot tell you whether you qualify, and cannot tell you that your own record has already been cleared. Only your transcript shows that.",
  "LegalEase does not obtain, receive, inspect or hold your criminal history transcript. You request and read your own.",
  "LegalEase does not file the petition or motion routes named here; those are separate routes with their own requirements."
];

const IL_SOURCES: readonly string[] = [
  "20 ILCS 2630/5.2(k), (k)(1), (k)(3), (k)(4), (k)(5), (k)(11) and (k)(12); P.A. 104-0459 (Clean Slate Act).",
  "20 ILCS 2630/5.2(l) (ordinance violations and Class C misdemeanours).",
  "20 ILCS 2630/5.2(i)(1), (i)(8) and (i)(11); § 5.2(a)(2.5); § 5.2(a)(1)(G-5); 410 ILCS 705/10-5 (cannabis).",
  "20 ILCS 2630/5.2(j)(1), (j)(2) and (j)(6); § 5.2(c)(2); § 5.2(a)(3)(C)(i) (prostitution records).",
  "Illinois State Police Access and Review; Office of the State Appellate Defender, Expungement Unit, 866-787-1776."
];

function ilGuidance(input: {
  templateId: string;
  mechanismName: string;
  processType: GuidanceTemplate["processType"];
  whyNotAFiling: string;
  destination: { name: string; detail: string };
  prerequisites: readonly string[];
  gather: readonly string[];
  documents: readonly string[];
  sequence: readonly string[];
  submissionMethod: string;
  fees: string;
  feeWaiver: string;
  noticeOrService: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  cannotPerform?: readonly string[];
  escalations: readonly string[];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: input.processType,
    prerequisites: input.prerequisites,
    documentsToObtain: input.documents,
    participantDataToGather: input.gather,
    officialDestination: input.destination,
    actionSequence: [NOTHING_TO_FILE, ...input.sequence, NO_PROMISED_DATE],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? IL_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: IL_SOURCES
  };
}

export const ILLINOIS_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "il-auto-seal-2029-guidance": ilGuidance({
    templateId: "il-auto-seal-2029-guidance",
    mechanismName: "Automatic sealing starting in 2029, and why you may still want to file now",
    processType: "agency",
    whyNotAFiling:
      "Under the Clean Slate Act the State Police identify eligible records and seal them, then notify the circuit clerks, who seal their own records. No petition is filed by anybody. This page explains what that will and will not do for you, and when waiting for it is the wrong choice.",
    destination: {
      name: "The Illinois State Police and the circuit court clerks",
      detail:
        "The State Police identify and seal, then notify the circuit clerks through the e-filing system at least quarterly. The clerks seal their electronic records within ninety days of that notice. There is no participant filing at any stage."
    },
    prerequisites: [
      `You are willing to wait until ${IL_GENERAL_CLEAN_SLATE_DATE} at the earliest, and possibly until the phase-in completes on ${IL_PHASE_IN_COMPLETION_DATE} for an older record.`,
      "Any sentence, supervision or qualified probation has ended and you have no charges pending.",
      "Sealing rather than expungement is enough for what you need."
    ],
    documents: [
      "Your free Illinois State Police Access and Review transcript, which is the only reliable statement of what is on your record now.",
      "Your case numbers and the counties, so you can tell which records the schedule would reach."
    ],
    gather: [
      "Whether you need your record cleared before 2029.",
      "Whether you want the record destroyed rather than sealed.",
      "Whether the record is a felony, an Article 9 or Article 11 offence, a Class X felony, or an offence requiring registration.",
      "Whether you are currently serving a sentence, supervision or qualified probation, or have charges pending."
    ],
    sequence: [
      `Know the dates before anything else. The general automatic sealing becomes operative on ${IL_GENERAL_CLEAN_SLATE_DATE}. Records created from 1970 onwards that meet the eligibility and timing criteria are sealed without a petition, and older records are phased in through ${IL_PHASE_IN_COMPLETION_DATE}.`,
      SEALING_IS_NOT_EXPUNGEMENT,
      "There are two reasons to file a petition anyway rather than wait. The first is that the automatic system seals but never expunges, so it cannot give you destruction of the record at all. The second is that it does not touch records the eligibility subsection excludes — and petition sealing may still reach some of those.",
      ACCESS_AND_REVIEW,
      CORRECT_YOUR_ANSWER,
      "Watch the mechanics if you are tracking it. The State Police notify the circuit clerks at least quarterly, and the clerks then have ninety days to seal their electronic records — so the two systems do not update on the same day, and a record can be sealed in one and not yet the other."
    ],
    submissionMethod: "There is nothing to submit. The State Police and the clerks act on the statutory schedule.",
    fees: "No fee for the automatic route, because there is no petition. Access and Review is free on the State Police fee schedule.",
    feeWaiver: "Not applicable. There is no fee to waive on this route.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "The State Police notify the circuit clerks. Nobody is required to notify you, which is why checking is your job."
    ],
    expectedNextStage:
      "Either you decide to wait for the automatic sealing, or you decide the petition route gives you something it cannot and you go there instead.",
    canPrepare: [
      "This explanation of what the automatic sealing does, when, and subject to what condition.",
      "The two reasons the design gives for filing anyway rather than waiting.",
      "The free check that tells you what is actually on your record now."
    ],
    escalations: [
      "You need relief before 2029.",
      "You want the record destroyed rather than sealed.",
      "The record may be in an excluded category.",
      "You are still serving a sentence, supervision or probation, or have charges pending."
    ]
  }),

  "il-auto-seal-2028-guidance": ilGuidance({
    templateId: "il-auto-seal-2028-guidance",
    mechanismName: "Automatic sealing of ordinance violations and Class C misdemeanors starting in 2028",
    processType: "agency",
    whyNotAFiling:
      "The circuit court clerks seal these records themselves on a fixed schedule. There is no petition and no fee, and nothing is filed by anybody — this page explains the schedule and the one check that tells you whether your record was reached.",
    destination: {
      name: "The circuit court clerks",
      detail:
        `Beginning ${IL_ORDINANCE_CLASS_C_DATE}, and on each 1 January and 1 July after that, the clerks seal records of arrests or charges that resulted in charges or convictions for municipal ordinance violations or Class C misdemeanours, where one year has elapsed since the case was closed. There is no participant filing.`
    },
    prerequisites: [
      "The case was a municipal ordinance violation or a Class C misdemeanour.",
      "One year has elapsed since the case was closed.",
      `You are willing to wait until ${IL_ORDINANCE_CLASS_C_DATE} or the following cycle.`
    ],
    documents: [
      "Your free Illinois State Police Access and Review transcript.",
      "The court record or disposition showing how the case was classified and when it closed."
    ],
    gather: [
      "Whether the case was a municipal ordinance violation or a Class C misdemeanour.",
      "When the case was closed.",
      "Whether you need the record cleared before 2028."
    ],
    sequence: [
      `Know your date. This schedule is the earliest of the Illinois automatic routes: it begins ${IL_ORDINANCE_CLASS_C_DATE} and then runs on each 1 January and 1 July. It applies where one year has elapsed since the case was closed.`,
      `Know where it sits among the others, because the dates are easy to confuse. Ordinance violations and Class C misdemeanours are ${IL_ORDINANCE_CLASS_C_DATE}. The general automatic sealing is ${IL_GENERAL_CLEAN_SLATE_DATE}, phased in through ${IL_PHASE_IN_COMPLETION_DATE} for older records.`,
      SEALING_IS_NOT_EXPUNGEMENT,
      ACCESS_AND_REVIEW,
      CORRECT_YOUR_ANSWER,
      "If your case is not in this category, that does not mean nothing will happen — it means the general schedule applies to you instead, on the later date."
    ],
    submissionMethod: "There is nothing to submit. The clerks act on the statutory schedule.",
    fees: "No fee. There is no petition on this route. Access and Review is free on the State Police fee schedule.",
    feeWaiver: "Not applicable. There is no fee to waive on this route.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "Nobody is required to tell you when it has been done."
    ],
    expectedNextStage:
      "Your Access and Review transcript no longer shows the ordinance violation or Class C misdemeanour case.",
    canPrepare: [
      "This explanation of the earliest Illinois automatic schedule and who is on it.",
      "The three dates side by side, so the wrong one is not relied on.",
      "The free check that tells you whether your record was reached."
    ],
    escalations: [
      "You need relief before 2028.",
      "The case was not an ordinance violation or a Class C misdemeanour.",
      "A year has not yet passed since the case closed."
    ]
  }),

  "il-cannabis-auto-guidance": ilGuidance({
    templateId: "il-cannabis-auto-guidance",
    mechanismName: "Checking whether your old cannabis arrest was already cleared automatically",
    processType: "agency",
    whyNotAFiling:
      "Minor cannabis arrest records from before 25 June 2019 were expunged automatically by law enforcement, on statutory deadlines that have now all passed. There was never anything to file and there is nothing to file now — the only question left is whether it reached your record, and there is a free way to find out.",
    destination: {
      name: "The Illinois State Police and the arresting agency",
      detail:
        "The agency performs the expungement. Verification is through the State Police Access and Review process, which the statute requires the State Police to allow for exactly this purpose and to publicise."
    },
    prerequisites: [
      "The cannabis offence was committed before 25 June 2019.",
      "The amount was thirty grams or less.",
      "No charges were filed, or the charges were dismissed or vacated, or the case ended in acquittal."
    ],
    documents: [
      "Your free Illinois State Police Access and Review transcript. On this route the statute specifically requires that this be available to you for checking.",
      "Anything you have showing the date and the amount, if the transcript is unclear."
    ],
    gather: [
      "Whether the arrest was for something that happened before 25 June 2019.",
      "Whether the amount was thirty grams or less.",
      "How the matter ended.",
      "Whether you have already requested your free Access and Review transcript."
    ],
    sequence: [
      "Run the free check first, before spending anything. This is the single most valuable instruction on this page: the deadlines for the automatic clearing have passed, so many of these records are already gone, and paying to petition for a record that was already expunged is the mistake this page exists to prevent.",
      ACCESS_AND_REVIEW,
      "Note that the law is on your side here specifically. The statute requires the State Police to allow Access and Review for exactly this purpose, and to publicise that it is available — so asking for it is using the mechanism as intended, not making a special request.",
      "If the transcript no longer shows the arrest, the clearing reached you and there is nothing further to do.",
      "If it still shows, do not assume you simply need to wait or to pay for a petition. The deadlines have passed, so a record that is still there means something did not happen that should have, and that is worth having looked into first.",
      "There is a separate route for a cannabis conviction, as opposed to an arrest record. A conviction is vacated and expunged on a motion to the court, which does not happen on its own.",
      CORRECT_YOUR_ANSWER
    ],
    submissionMethod:
      "Nothing is submitted on this route. Access and Review is a request for your own transcript, not an application for relief.",
    fees: "No fee. Access and Review is free on the State Police fee schedule, and there is no petition on this route.",
    feeWaiver: "Not applicable. The check is free and there is no petition fee on this route.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage:
      "Your Access and Review transcript either no longer shows the cannabis arrest, or it does and you have taken that transcript to be looked at before paying for anything.",
    canPrepare: [
      "This explanation of what was cleared automatically and when.",
      "The instruction to run the free check before paying for any petition.",
      "The distinction between a cannabis arrest record and a cannabis conviction, which are different routes."
    ],
    escalations: [
      "The transcript still shows the record even though the deadlines have passed.",
      "The record is a cannabis conviction rather than an arrest.",
      "The offence was on or after 25 June 2019, or the amount was above the threshold."
    ]
  }),

  "il-prostitution-j-auto-guidance": ilGuidance({
    templateId: "il-prostitution-j-auto-guidance",
    mechanismName: "Automatic sealing of Class 4 felony prostitution records by January 2028",
    processType: "agency",
    whyNotAFiling:
      "The State Police and local law enforcement seal these records themselves, and the circuit clerks do the same for the court records and case files. There is no petition on this branch — this page explains the deadline, the free way to check, and the participant motion that exists where waiting is not workable.",
    destination: {
      name: "The Illinois State Police, local law enforcement and the circuit court clerks",
      detail:
        `The agencies seal the law enforcement records and the clerks seal the court records and case files, both no later than ${IL_PROSTITUTION_SEALING_DEADLINE}. Verification is through Access and Review. There is no participant filing on this branch.`
    },
    prerequisites: [
      "The record is a Class 4 felony prostitution arrest, a charge not initiated by arrest, or a conviction.",
      `You are able to wait until ${IL_PROSTITUTION_SEALING_DEADLINE}.`
    ],
    documents: [
      "Your free Illinois State Police Access and Review transcript, which is what shows the exact classification.",
      "Nothing else. You are not asked to document the circumstances of the offence."
    ],
    gather: [
      "Whether your record shows the prostitution charge or conviction as a Class 4 felony.",
      "Whether you have requested your free Access and Review transcript.",
      "Whether you need the record cleared before 2028.",
      "Whether you would like information about relief designed for people whose involvement resulted from trafficking."
    ],
    sequence: [
      `Know the deadline. The agencies and the clerks are to complete this sealing no later than ${IL_PROSTITUTION_SEALING_DEADLINE}, without any petition from you.`,
      "Know why this route exists at all, because it is unusual. Article 11 offences are generally excluded from sealing, but prostitution is expressly carved back in — and that carve-in is the whole reason this mechanism reaches your record.",
      ACCESS_AND_REVIEW,
      "Check the classification on the transcript rather than from memory. This route is written for Class 4 felony prostitution records specifically, and the class is the thing that decides whether it applies.",
      "Nothing here asks you about the circumstances of the offence, and you do not need to explain them to use this page.",
      "If you need the record dealt with before the deadline, there is a participant motion for that, which does not wait on the agencies.",
      CORRECT_YOUR_ANSWER
    ],
    submissionMethod:
      "Nothing is submitted on this branch. The agencies and the clerks act on the statutory deadline.",
    fees: "No fee. There is no petition on this branch, and Access and Review is free on the State Police fee schedule.",
    feeWaiver: "Not applicable. There is no fee to waive on this branch.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "Nobody is required to tell you when the sealing has been done."
    ],
    expectedNextStage:
      "Your Access and Review transcript no longer shows the Class 4 felony prostitution record, or you have moved to the participant motion instead.",
    canPrepare: [
      "This explanation of the deadline and of the carve-in that makes the route work.",
      "The free check that shows the exact classification.",
      "The participant motion route where the deadline is too far away."
    ],
    escalations: [
      "You need the record cleared before 2028.",
      "The transcript does not clearly show a Class 4 felony prostitution record.",
      "Your involvement resulted from trafficking, where a stronger route applies."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!ILLINOIS_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Illinois guidance template ${templateId} is registered.`);
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

function illinoisTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  componentId: string;
  templateId: string;
  requiredInputs: readonly RequiredInput[];
  assembledPacketName: string;
  assembledPacketTitle: string;
  customerDeliverableDescription: string;
  notes: string;
}): ReliefTrack {
  // Built and put forward, not adopted. `legal_review_pending` is the in-type
  // expression of `recommended_for_counsel_adoption`.
  const statuses = {
    research: "research_draft_complete",
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "legal_review_pending"
  } as const;

  return {
    jurisdiction: "IL",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: input.courtLevel,
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(input.trackId, input.componentId, input.templateId),
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

export const ILLINOIS_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  illinoisTrack({
    trackId: "il-auto-seal-2029",
    publicName: "Automatic sealing starting in 2029, and why you may still want to file now",
    mechanism: "clean_slate_automatic_sealing_operative_2029_phased_to_2034",
    authority: "20 ILCS 2630/5.2(k), (k)(1), (k)(3), (k)(4), (k)(5), (k)(11), (k)(12); P.A. 104-0459",
    recordTypes: ["arrest", "charge_not_initiated_by_arrest", "conviction"],
    dispositions: [
      "non_conviction",
      "supervision_terminated",
      "qualified_probation_terminated",
      "misdemeanor_conviction",
      "felony_conviction"
    ],
    courtLevel: "not_a_court_process",
    componentId: "il-auto-seal-2029-process-guidance-1",
    templateId: "il-auto-seal-2029-guidance",
    requiredInputs: [
      { key: "wantsReliefBefore2029", label: "Do you need your record cleared before 2029?", required: true },
      {
        key: "wantsExpungementNotSealing",
        label: "Do you want the record destroyed rather than sealed?",
        required: true
      },
      {
        key: "recordMayBeExcludedFromAuto",
        label:
          "Is your record a felony, an Article 9 or Article 11 offense, a Class X felony, or an offense requiring registration?",
        required: true
      },
      {
        key: "currentlyServingOrPendingCharges",
        label:
          "Are you currently serving a sentence, supervision or qualified probation, or do you have charges pending?",
        required: true
      }
    ],
    assembledPacketName: "Clean-Slate-2029-Automatic-Sealing-Explainer",
    assembledPacketTitle: "Automatic sealing starting in 2029, and why you may still want to file now",
    customerDeliverableDescription:
      "A guidance sheet explaining that Clean Slate automatic sealing becomes operative on 1 January 2029 with a phase-in through 1 January 2034 and subject to appropriations, that it seals but never expunges and does not reach excluded categories, how to verify the record through free ISP Access and Review, and the two reasons the design gives for filing a petition instead of waiting.",
    notes:
      "The design instruction is to state the 2029 operative date, the phase-in to 2034 and the appropriations condition, to say that the mechanism seals rather than expunges, and never to say a record will be cleared automatically before then — so no completion date is predicted anywhere. The two reasons to file anyway are carried verbatim in substance: the automatic system never expunges, and it does not touch records excluded by the eligibility subsection even where petition sealing remains available. Verification through Access and Review is an instruction and a separate workflow, not a filing packet. Every typed stop routes to the Office of the State Appellate Defender Expungement Unit on 866-787-1776, which the design names as the statewide referral destination for every stop condition."
  }),

  illinoisTrack({
    trackId: "il-auto-seal-2028",
    publicName: "Automatic sealing of ordinance violations and Class C misdemeanors starting in 2028",
    mechanism: "clerk_automatic_sealing_of_ordinance_violations_and_class_c_misdemeanors",
    authority: "20 ILCS 2630/5.2(l); P.A. 104-0459",
    recordTypes: ["arrest", "charge_not_initiated_by_arrest", "conviction"],
    dispositions: ["municipal_ordinance_violation", "class_c_misdemeanor"],
    courtLevel: "not_a_court_process",
    componentId: "il-auto-seal-2028-process-guidance-1",
    templateId: "il-auto-seal-2028-guidance",
    requiredInputs: [
      {
        key: "isOrdinanceOrClassC",
        label: "Was the case a municipal ordinance violation or a Class C misdemeanor?",
        required: true
      },
      { key: "caseClosedDate", label: "When was the case closed?", required: true },
      {
        key: "wantsReliefBefore2028",
        label: "Do you need the record cleared before January 1, 2028?",
        required: true
      }
    ],
    assembledPacketName: "Ordinance-And-Class-C-Automatic-Sealing-Explainer",
    assembledPacketTitle: "Automatic sealing of ordinance violations and Class C misdemeanors starting in 2028",
    customerDeliverableDescription:
      "A guidance sheet explaining that circuit clerks seal municipal ordinance violations and Class C misdemeanours beginning 1 January 2028 and each 1 January and 1 July after that where one year has elapsed since the case closed, how that date sits against the general 2029 date and the 2034 phase-in, and how to verify through free ISP Access and Review.",
    notes:
      "The design instruction is to deliver the 1 January 2028 ordinance and Class C date together with the 1 January 2029 general date, the phase-in to 2034 and the appropriations condition, and never to say a record will be cleared automatically before the operative date. All four appear on the sheet and no completion date is predicted. A case that is not an ordinance violation or Class C misdemeanour is routed to the general automatic sealing route rather than stopped, and a participant who needs relief before 2028 is routed to the petition route."
  }),

  illinoisTrack({
    trackId: "il-cannabis-auto",
    publicName: "Checking whether your old cannabis arrest was already cleared automatically",
    mechanism: "automatic_law_enforcement_expungement_of_minor_cannabis_arrest_records",
    authority:
      "20 ILCS 2630/5.2(i)(1), (i)(8), (i)(11); § 5.2(a)(2.5); § 5.2(a)(1)(G-5); 410 ILCS 705/10-5",
    recordTypes: ["arrest"],
    dispositions: ["no_charges_filed", "dismissed", "vacated", "acquitted", "civil_law_violation"],
    courtLevel: "not_a_court_process",
    componentId: "il-cannabis-auto-process-guidance-1",
    templateId: "il-cannabis-auto-guidance",
    requiredInputs: [
      {
        key: "cannabisOffenceBeforeJune2019",
        label: "Was the cannabis arrest for something that happened before June 25, 2019?",
        required: true
      },
      { key: "quantityUnder30Grams", label: "Was the amount 30 grams or less?", required: true },
      {
        key: "cannabisDisposition",
        label: "Were charges never filed, or were they dismissed, vacated, or did the case end in acquittal?",
        required: true
      },
      {
        key: "hasRunAccessAndReview",
        label:
          "Have you already requested your free ISP Access and Review transcript to check whether the record is still there?",
        required: true
      }
    ],
    assembledPacketName: "Cannabis-Automatic-Expungement-Check",
    assembledPacketTitle: "Checking whether your old cannabis arrest was already cleared automatically",
    customerDeliverableDescription:
      "A guidance sheet explaining that minor cannabis arrest records from before 25 June 2019 were expunged automatically on statutory deadlines that have now passed, instructing the participant to run the free ISP Access and Review check before paying for any petition, and routing a cannabis conviction to the participant motion route instead.",
    notes:
      "The design instructions are to run Access and Review first, not to let a participant pay to petition for something already expunged, and never to state that an individual record has already been expunged without verification — so the sheet asserts no individual outcome and leads with the free check. The statute requires the State Police to allow Access and Review for exactly this purpose and to publicise it, which the sheet says. A transcript that still shows the record after the deadlines have passed is a typed stop that hands off for investigation with the transcript in hand rather than terminating or recommending a paid petition. A cannabis conviction rather than an arrest routes to the participant motion track."
  }),

  illinoisTrack({
    trackId: "il-prostitution-j-auto",
    publicName: "Automatic sealing of Class 4 felony prostitution records by January 2028",
    mechanism: "automatic_sealing_of_class_4_felony_prostitution_records",
    authority: "20 ILCS 2630/5.2(j)(1), (j)(2), (j)(6); § 5.2(c)(2); § 5.2(a)(3)(C)(i)",
    recordTypes: ["arrest", "charge_not_initiated_by_arrest", "conviction"],
    dispositions: [
      "class_4_felony_prostitution_arrest",
      "class_4_felony_prostitution_charge",
      "class_4_felony_prostitution_conviction"
    ],
    courtLevel: "not_a_court_process",
    componentId: "il-prostitution-j-auto-process-guidance-1",
    templateId: "il-prostitution-j-auto-guidance",
    requiredInputs: [
      {
        key: "isClass4FelonyProstitution",
        label: "Does your record say the prostitution charge or conviction was a Class 4 felony?",
        required: true
      },
      {
        key: "isTraffickingSurvivor",
        label:
          "Would you like information about relief designed for people whose involvement resulted from trafficking?",
        required: true
      },
      {
        key: "hasRunAccessAndReview",
        label: "Have you requested your free ISP Access and Review transcript to check the current status of the record?",
        required: true
      },
      {
        key: "wantsReliefBefore2028",
        label: "Do you need the record cleared before January 1, 2028?",
        required: true
      }
    ],
    assembledPacketName: "Prostitution-Record-Automatic-Sealing-Explainer",
    assembledPacketTitle: "Automatic sealing of Class 4 felony prostitution records by January 2028",
    customerDeliverableDescription:
      "A guidance sheet explaining that the State Police, local law enforcement and the circuit clerks are to seal Class 4 felony prostitution records no later than 1 January 2028 without any petition, that the Article 11 exclusion is expressly carved back in for prostitution which is what makes the mechanism work, how to verify the classification through free ISP Access and Review, and the participant motion available where the deadline is too far away.",
    notes:
      "The design forbids stating that an individual record has already been sealed without verification through Access and Review, and forbids asking graphic questions about the circumstances of the offence — the sheet asserts no individual outcome and asks nothing about circumstances, and says so on its face. Where the participant indicates their involvement resulted from trafficking, the design records that the trafficking route is stronger and the questioning must change, so that is a typed route mismatch handled before the classification question rather than after. A record not clearly shown as Class 4 felony prostitution is a typed stop that sends the participant to read the exact classification on the transcript first."
  })
];
