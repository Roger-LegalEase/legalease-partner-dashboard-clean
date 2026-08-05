// Pennsylvania process guidance — three routes that clear a record without a
// petition, and how to tell whether they worked.
//
// Three assigned routes, all three implemented. None has a participant filing:
// a full acquittal expunges by statute, an ARD dismissal carries its own
// expungement order, and Clean Slate seals through the courts and the State
// Police on a fixed cycle. In each case the deliverable is the same shape —
// verify that it happened, and escalate where it did not.
//
// The commercial instruction the design gives is unusually blunt and is worth
// stating plainly, because it is what these sheets are for:
//
//   Check whether the relief already happened before offering anyone a
//   petition. Generating a petition for a record the Commonwealth already
//   cleared charges a participant for work that was already done.
//
// So each sheet leads with the check, and none of them offers a filing.
//
// Two clocks are kept apart, because conflating them is the mistake the design
// specifically calls out. The summary-conviction Clean Slate clock runs five
// years from ENTRY OF THE JUDGMENT of conviction. The separate expungement
// clock runs five years FREE OF ARREST OR PROSECUTION following the conviction.
// They start at different moments and measure different things, and a
// participant told the wrong one will wait the wrong length of time.
//
// Three Clean Slate details are carried because getting them wrong costs
// participants real relief:
//
//   - Not every first-degree misdemeanour is out. Any misdemeanour punishable
//     by imprisonment for no more than two years qualifies, so routing all of
//     them away from the track is wrong.
//   - Outstanding fines and costs do not block Clean Slate sealing. Restitution
//     remains a condition. Someone who believes an unpaid balance disqualifies
//     them may never check.
//   - The phase-in dates are stated: the Act was signed 14 December 2023, its
//     petition provisions took effect 12 February 2024, and the automated
//     sealing provisions took effect 11 June 2024.
//
// On the acquittal route the design's instruction is not to file inside the
// twelve months. The statute gives the Commonwealth sixty days to object and
// provides for expungement no later than twelve months from the acquittal, so
// the sheet is a verification path and a diary rather than a reason to act
// early. Escalation belongs after the twelve months, not before.
//
// On the ARD route one citation is corrected deliberately. The sexual-offence
// limit lives in 18 Pa.C.S. § 9122(b.1), not in Rule 320, and the design
// instructs that the statute be cited when the limit is explained. Where ARD
// was granted for an enumerated sexual offence and the victim was under 18, the
// court has no authority to expunge the arrest record at all.
//
// One onward route is honestly incomplete and is described that way. Where a
// Clean Slate record should have sealed and did not, the design routes to a
// failure-correction track that is deferred pending research. The sheet says
// so, and sends the participant somewhere real in the meantime rather than to
// a route that does not yet exist.
//
// What these templates never do: turn guidance into a court filing, generate a
// petition for a record that may already be cleared, promise a sealing or
// expungement date, quote a fee, or tell a participant that unpaid fines and
// costs have disqualified them.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`.
// Pennsylvania is not an enabled jurisdiction and this job does not enable one.

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
 * the packet proof are integration-owned and name no Pennsylvania track, so
 * `PENNSYLVANIA_COUNSEL_ADOPTED` is false and the verifier proves it.
 */
export const PENNSYLVANIA_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const PENNSYLVANIA_COUNSEL_ADOPTED = false;

/** Where a participant goes when a route has run out without clearing. */
export const PA_RECORD_CLEARING_HELP =
  "a Pennsylvania legal aid or record-clearing clinic, such as a county public defender's expungement clinic or a Pennsylvania Legal Aid Network member programme";

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not answer this participant; a destination is named. */
export class PennsylvaniaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "PennsylvaniaGuidanceStopError";
  }
}

/** The participant belongs on a different Pennsylvania route, which is named. */
export class PennsylvaniaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "PennsylvaniaRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class PennsylvaniaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "PennsylvaniaBranchError";
  }
}

export const PA_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Whether the acquittal covered every charge from the same conduct. */
export const PA_ACQUITTAL_SCOPE: Readonly<Record<string, string>> = {
  all_charges: "all_charges",
  some_charges_only: "some_charges_only"
};

/** Where the participant sits against the twelve-month statutory outside date. */
export const PA_ACQUITTAL_ELAPSED: Readonly<Record<string, string>> = {
  under_twelve_months: "under_twelve_months",
  twelve_months_or_more: "twelve_months_or_more"
};

/** What the participant wants from Clean Slate. */
export const PA_CLEAN_SLATE_GOALS: Readonly<Record<string, string>> = {
  check_whether_it_sealed: "check_whether_it_sealed",
  wants_expungement_not_sealing: "wants_expungement_not_sealing"
};

/** Whether the record is still publicly visible. */
export const PA_VISIBILITY: Readonly<Record<string, string>> = {
  no_longer_appears: "no_longer_appears",
  still_appears: "still_appears",
  have_not_checked: "have_not_checked"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new PennsylvaniaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Pennsylvania stops, and routes to
 * the correct Pennsylvania mechanism.
 *
 * A record that has not cleared is handled per route and is never a bare
 * refusal: on the acquittal route it becomes an escalation once the twelve
 * months have run, and on Clean Slate it routes onward while saying plainly
 * that the correction track is still being researched.
 */
export function derivePennsylvaniaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (trackId === "pa_acquittal_auto") {
    const scope = branch(trackId, "acquittedOfAllCharges", PA_ACQUITTAL_SCOPE, facts.acquittedOfAllCharges);
    if (scope.value === "some_charges_only") {
      throw new PennsylvaniaRouteMismatchError(
        trackId,
        "partial_acquittal",
        "This route runs on an acquittal of every charge based on the same conduct or the same criminal episode. A partial acquittal, where some charges survived, is not reached by it and is handled on what happened to the remaining charges instead.",
        `the Pennsylvania Clean Slate limited access route for the charges that did not end in conviction, and ${PA_RECORD_CLEARING_HELP} for the rest of the case`
      );
    }

    if (!branch(trackId, "sameCriminalEpisode", PA_YES_NO, facts.sameCriminalEpisode).resolved) {
      throw new PennsylvaniaRouteMismatchError(
        trackId,
        "charges_from_different_conduct",
        "The statute reaches charges based on the same conduct or arising from the same criminal episode. Where the acquitted charges and the others came out of different incidents, the acquittal does not carry the rest of the record with it.",
        `${PA_RECORD_CLEARING_HELP}, taking the docket sheets for each case so the incidents can be separated properly`
      );
    }

    const elapsed = branch(trackId, "monthsSinceAcquittal", PA_ACQUITTAL_ELAPSED, facts.monthsSinceAcquittal);
    derived.acquittalElapsed = elapsed.value;
    const visibility = branch(trackId, "stillAppearsPublicly", PA_VISIBILITY, facts.stillAppearsPublicly);
    derived.recordVisibility = visibility.value;

    // The design's instruction is not to file inside the twelve months. Only
    // once the outside date has passed and the record is still showing does
    // this become an escalation.
    if (elapsed.value === "twelve_months_or_more" && visibility.value === "still_appears") {
      throw new PennsylvaniaGuidanceStopError(
        trackId,
        "twelve_months_passed_and_record_has_not_cleared",
        "The statute provides for the expungement to occur no later than twelve months from the acquittal. That date has passed and the record is still showing, so this is no longer a matter of waiting — something did not happen that should have.",
        `the clerk of courts for the county where you were acquitted, quoting the docket number and asking what became of the expungement that follows an acquittal on all charges; if that does not resolve it, ${PA_RECORD_CLEARING_HELP}`
      );
    }
  }

  if (trackId === "pa_ard_expungement") {
    if (branch(trackId, "sexualOffenseMinorVictim", PA_YES_NO, facts.sexualOffenseMinorVictim).resolved) {
      throw new PennsylvaniaGuidanceStopError(
        trackId,
        "section_9122_b_1_removes_authority_to_expunge",
        "Where ARD was granted for an enumerated sexual offence and the victim was under 18, the court has no authority to expunge the arrest record. That limit is in 18 Pa.C.S. § 9122(b.1) rather than in the rule that governs the dismissal, so it is not something the dismissal order can cure.",
        `${PA_RECORD_CLEARING_HELP}, to ask what if anything remains available for the record given the § 9122(b.1) limit`
      );
    }

    if (!branch(trackId, "ardCompleted", PA_YES_NO, facts.ardCompleted).resolved) {
      throw new PennsylvaniaGuidanceStopError(
        trackId,
        "ard_not_successfully_completed",
        "The expungement order follows the dismissal, and the dismissal follows successful completion of the programme. Until the programme is completed there is nothing for the order to attach to.",
        "the ARD supervision office or probation officer handling your programme, to confirm what remains outstanding and when completion will be recorded"
      );
    }

    const dismissed = branch(trackId, "dismissalEntered", PA_YES_NO, facts.dismissalEntered);
    if (!dismissed.resolved) {
      throw new PennsylvaniaGuidanceStopError(
        trackId,
        "dismissal_not_yet_entered",
        "The expungement order is made when the judge orders dismissal of the charges. Where the dismissal has not been entered yet, the order that clears the arrest record has not been triggered.",
        "the clerk of courts for the county, quoting the docket number, to ask when the dismissal order will be entered following your completion of ARD"
      );
    }

    if (branch(trackId, "commonwealthObjected", PA_YES_NO, facts.commonwealthObjected).resolved) {
      throw new PennsylvaniaGuidanceStopError(
        trackId,
        "commonwealth_objected_to_the_expungement",
        "The Commonwealth may object within thirty days after service of the motion for dismissal, and must then show compelling reasons to retain the record. An objection makes this a contested matter that is argued rather than administered.",
        `${PA_RECORD_CLEARING_HELP} without delay, because an objection runs on a court timetable rather than yours`
      );
    }

    derived.recordVisibility = branch(
      trackId,
      "stillAppearsPublicly",
      PA_VISIBILITY,
      facts.stillAppearsPublicly
    ).value;
  }

  if (trackId === "pa_9122_2_clean_slate") {
    const goal = branch(trackId, "goal", PA_CLEAN_SLATE_GOALS, facts.goal);
    if (goal.value === "wants_expungement_not_sealing") {
      throw new PennsylvaniaRouteMismatchError(
        trackId,
        "wants_expungement_rather_than_sealing",
        "Clean Slate gives limited access — the record is sealed from most public view but it is not destroyed, and it remains available to the courts, law enforcement and certain employers. Where you need the record expunged rather than sealed, that is a different remedy on a different clock.",
        `the Pennsylvania expungement routes, whose clock runs five years free of arrest or prosecution following the conviction rather than from entry of judgment; to identify which applies, ${PA_RECORD_CLEARING_HELP}`
      );
    }

    if (branch(trackId, "section9122_3Exclusion", PA_YES_NO, facts.section9122_3Exclusion).resolved) {
      throw new PennsylvaniaGuidanceStopError(
        trackId,
        "section_9122_3_exclusion_applies",
        "Section 9122.3 lists records that automatic limited access does not reach. Where one of those exclusions applies to your record, the automated cycle will not seal it however long you wait.",
        `${PA_RECORD_CLEARING_HELP}, taking your docket sheets, to check whether a petition-based route reaches the record even though the automatic one does not`
      );
    }

    if (branch(trackId, "disqualifyingChargeSameCase", PA_YES_NO, facts.disqualifyingChargeSameCase).resolved) {
      throw new PennsylvaniaGuidanceStopError(
        trackId,
        "disqualifying_charge_in_the_same_case",
        "A disqualifying charge filed in the same case can keep the whole case out of the automatic cycle, even where the charge you are asking about would qualify on its own.",
        `${PA_RECORD_CLEARING_HELP}, taking the full docket for the case so the effect of the other charges can be assessed`
      );
    }

    const visibility = branch(trackId, "stillAppearsPublicly", PA_VISIBILITY, facts.stillAppearsPublicly);
    derived.recordVisibility = visibility.value;
    if (visibility.value === "still_appears") {
      throw new PennsylvaniaGuidanceStopError(
        trackId,
        "record_should_have_sealed_and_has_not",
        "Where the record met the criteria and the automated cycle has run without sealing it, that is a failure of the process rather than a sign you were ineligible. Be aware that the dedicated correction route for this is still being researched and is not yet available, so this page does not pretend otherwise.",
        `the clerk of courts for the county, quoting the docket number, to ask whether a limited access order was issued for it; and ${PA_RECORD_CLEARING_HELP}, which can raise a Clean Slate failure that the automated cycle missed`
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route and no fee to pay. Pennsylvania does this one itself, so the work here is checking whether it happened.";

const CHECK_BEFORE_PAYING =
  "Check before you pay anyone. If this already happened, a petition prepared for the same record charges you for work the Commonwealth has already done — and that is the single most common way people lose money on Pennsylvania record clearing.";

const HOW_TO_CHECK =
  "Look at your own record. Search the public docket for the case by docket number, and obtain your Pennsylvania State Police criminal history record if you need to see what a background check returns. LegalEase does not obtain, receive or inspect either one — you check your own.";

const NO_PROMISED_DATE =
  "This page does not tell you the day your record will clear. The statutory schedules say when the work is to be done, not when a particular record will move, and nobody is required to notify you when it has.";

const PA_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge or seal anything, and cannot make a court, a clerk of courts, the Administrative Office of Pennsylvania Courts or the State Police act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, receive, inspect or hold your criminal history or docket. You check your own.",
  "LegalEase does not file the petition routes named here; those are separate routes with their own requirements."
];

const PA_SOURCES: readonly string[] = [
  "18 Pa.C.S. § 9122(a) (expungement following acquittal on all charges).",
  "Pa.R.Crim.P. 320 and 18 Pa.C.S. § 9122(b.1) (ARD dismissal expungement and its sexual-offence limit).",
  "18 Pa.C.S. § 9122.2, § 9122.3, § 9102 and § 9122.5 (automatic limited access).",
  "Act 83 of 2020 (fines and costs); Act 36 of 2023 (Clean Slate 3.0 phase-in).",
  "Pennsylvania unified judicial system public docket sheets; Pennsylvania State Police criminal history record."
];

function paGuidance(input: {
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
    actionSequence: [NOTHING_TO_FILE, CHECK_BEFORE_PAYING, ...input.sequence, NO_PROMISED_DATE],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? PA_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: PA_SOURCES
  };
}

export const PENNSYLVANIA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "pa-acquittal-auto-guidance": paGuidance({
    templateId: "pa-acquittal-auto-guidance",
    mechanismName: "Check that a full acquittal cleared your record automatically",
    processType: "automatic",
    whyNotAFiling:
      "Where a person is acquitted of all charges based on the same conduct or arising from the same criminal episode, the statute provides for expungement without any petition. Nothing is filed by you — this page is the verification path and the diary.",
    destination: {
      name: "The court that entered the acquittal, on the statutory schedule",
      detail:
        "The Commonwealth has sixty days to object, and where the statutory requirements are met the expungement occurs no later than twelve months from the date of acquittal. Nothing is filed by the participant."
    },
    prerequisites: [
      "You were found not guilty of every charge that arose from the same conduct or the same criminal episode.",
      "Nothing else. This expungement is not applied for."
    ],
    documents: [
      "The public docket sheet for the case, which is where the entry showing expungement will appear.",
      "Your Pennsylvania State Police criminal history record, if you need to see what a background check returns."
    ],
    gather: [
      "The docket number for the case you were acquitted in.",
      "The date of the acquittal.",
      "Whether you were acquitted of every charge from the incident, or only some.",
      "Whether all of the charges arose from the same conduct or incident.",
      "How many months have passed since the acquittal."
    ],
    sequence: [
      "Understand the timetable before you do anything, because it is the whole answer for the first year. The Commonwealth has sixty days to object. Where the statutory requirements are met, the expungement is to occur no later than twelve months from the date of the acquittal.",
      "So do not file anything inside those twelve months for a clean, total acquittal. There is nothing to gain by it and it costs money that the statute is about to make unnecessary.",
      "Diary the date instead. Count twelve months from the acquittal and put that date somewhere you will see it.",
      HOW_TO_CHECK,
      "If the docket shows the case expunged, you are done and there was never anything to file.",
      "If the twelve months have passed and the record is still showing, that is when this stops being a waiting game and becomes something to chase — starting with the clerk of courts for the county, quoting the docket number.",
      "One limit worth knowing now rather than later: this only reaches an acquittal on all of the charges from the same conduct. If some charges survived, or if other charges came from a different incident, the acquittal does not carry them with it."
    ],
    submissionMethod: "There is nothing to submit. The expungement follows the acquittal by statute.",
    fees: "No fee for the automatic route, because there is no petition on it.",
    feeWaiver: "Not applicable. There is no fee to waive on this route.",
    noticeOrService: [
      "You serve nobody and notify nobody.",
      "The Commonwealth has sixty days to object. Nobody is required to tell you when the expungement has been completed."
    ],
    expectedNextStage:
      "The public docket for the case shows it expunged, within twelve months of the acquittal.",
    canPrepare: [
      "This explanation of the sixty-day objection window and the twelve-month outside date.",
      "The reason not to file anything inside those twelve months.",
      "The check to run, and the point at which chasing it becomes the right move."
    ],
    escalations: [
      "The acquittal was partial rather than complete.",
      "The acquitted and remaining charges came from different incidents.",
      "Twelve months have passed and the record has not cleared."
    ]
  }),

  "pa-ard-expungement-guidance": paGuidance({
    templateId: "pa-ard-expungement-guidance",
    mechanismName: "Check that finishing ARD cleared your arrest record",
    processType: "automatic",
    whyNotAFiling:
      "When the judge orders dismissal of the charges after successful completion of ARD, the rule provides that the judge shall also order expungement of the arrest record. The order comes with the dismissal, so nothing is filed by you — this page is how you confirm it happened.",
    destination: {
      name: "The court that entered the ARD dismissal",
      detail:
        "The expungement order issues with the dismissal by operation of the rule, subject to a Commonwealth objection filed within thirty days after service of the motion for dismissal, on which the Commonwealth must show compelling reasons to retain the record."
    },
    prerequisites: [
      "You successfully completed the ARD programme.",
      "The court has entered an order dismissing the charges.",
      "The ARD offence was not an enumerated sexual offence with a victim under 18."
    ],
    documents: [
      "The public docket sheet for the case, showing the dismissal and any expungement order.",
      "Your completion paperwork from the ARD programme, if you have it."
    ],
    gather: [
      "The docket number for the case in which you were admitted to ARD.",
      "Whether you successfully completed the programme.",
      "Whether the court has entered an order dismissing the charges, and when.",
      "Whether the ARD offence was a sexual offence in which the victim was under 18.",
      "Whether the Commonwealth objected to the expungement."
    ],
    sequence: [
      "Know what should have happened, because it is more than people expect. The dismissal is not the end of it: the rule says the judge shall also order expungement of your arrest record when the charges are dismissed. Completing ARD is meant to clear the arrest, not merely close the case.",
      "Know the Commonwealth's window. It may object within thirty days after service of the motion for dismissal, and if it does it must show compelling reasons to retain the record.",
      HOW_TO_CHECK,
      "Look for two separate things on the docket: the dismissal order, and the expungement order. It is possible for the first to appear without the second, and that gap is the reason this page exists.",
      "If the dismissal was entered but no expungement order followed, that is worth raising with the clerk of courts rather than assuming the rule did not apply to you.",
      "One limit, and its source matters. Where ARD was granted for an enumerated sexual offence and the victim was under 18, the court has no authority to expunge the arrest record. That limit is in 18 Pa.C.S. § 9122(b.1) — it is not in the rule that governs the dismissal, which is why reading the rule alone can mislead."
    ],
    submissionMethod: "There is nothing to submit. The expungement order accompanies the dismissal.",
    fees: "No fee identified for the expungement that accompanies the dismissal.",
    feeWaiver: "Not applicable. There is no fee to waive on this route.",
    noticeOrService: [
      "You serve nobody. The motion for dismissal is served and the Commonwealth has thirty days after that to object.",
      "Nobody is required to tell you when the expungement has been completed."
    ],
    expectedNextStage:
      "The public docket shows both the dismissal and the expungement of the arrest record.",
    canPrepare: [
      "This explanation that the dismissal should carry an expungement order with it.",
      "The two things to look for separately on the docket.",
      "The correct source of the sexual-offence limit, which is the statute rather than the rule."
    ],
    escalations: [
      "The ARD offence was a sexual offence with a victim under 18.",
      "ARD was not completed, or the dismissal has not been entered.",
      "The Commonwealth objected to the expungement.",
      "The dismissal was entered but no expungement order followed."
    ]
  }),

  "pa-9122-2-clean-slate-guidance": paGuidance({
    templateId: "pa-9122-2-clean-slate-guidance",
    mechanismName: "Check whether Clean Slate has sealed your record automatically",
    processType: "automatic",
    whyNotAFiling:
      "Automatic limited access operates without any petition. The Administrative Office of Pennsylvania Courts transmits eligible records to the State Police central repository, the State Police validate eligibility or return a notification of ineligibility, and the courts of common pleas issue limited access orders on the statutory cycle. Nothing is filed by you.",
    destination: {
      name: "The Administrative Office of Pennsylvania Courts and the State Police central repository",
      detail:
        "The Office transmits eligible records and removes those for which a notification of ineligibility is received. The courts of common pleas issue the limited access orders. There is no participant filing."
    },
    prerequisites: [
      "Nothing. Automatic limited access is not applied for.",
      "To check whether it reached your record, you need the docket number."
    ],
    documents: [
      "The public docket sheet for the case.",
      "Your Pennsylvania State Police criminal history record, if you need to see what a background check returns."
    ],
    gather: [
      "The docket number for the record you are asking about.",
      "The offence and how it was graded.",
      "The date of the conviction, or the date the case ended without one.",
      "The date of your most recent conviction for any offence punishable by imprisonment of one or more years.",
      "For a summary conviction, the date the judgment of conviction was entered.",
      "What other charges were filed in the same case.",
      "Whether a conditional pardon was granted.",
      "Whether the record still appears on a search."
    ],
    sequence: [
      "Know which route within Clean Slate reaches your record, because there are several and their clocks differ. A second-degree misdemeanour, or a misdemeanour punishable by no more than two years, is reached where you have been free for seven years from conviction for any offence punishable by a year or more. A qualifying offence is reached on the same terms after ten years. Charges that ended in something other than a conviction are reached, as is a conviction for which a conditional pardon was granted. A summary conviction is reached when five years have elapsed since entry of the judgment.",
      "Keep the two five-year clocks apart, because this is where people go wrong. The summary-conviction Clean Slate clock runs five years from ENTRY OF THE JUDGMENT of conviction. The separate expungement clock runs five years FREE OF ARREST OR PROSECUTION following the conviction. They start at different moments and they are not interchangeable.",
      "Do not assume a first-degree misdemeanour is out. Any misdemeanour punishable by imprisonment for no more than two years qualifies, and some first-degree misdemeanours fall inside that. Being told all of them are excluded is wrong and costs people relief.",
      "Do not assume money you owe has disqualified you. Outstanding fines and costs do not block Clean Slate sealing. Restitution does remain a condition, which is a narrower thing than any unpaid balance.",
      "Know the dates the current scheme runs from: the Act was signed on 14 December 2023, its petition provisions took effect on 12 February 2024, and the automated sealing provisions took effect on 11 June 2024.",
      HOW_TO_CHECK,
      "Understand what sealing gives you. Limited access means the record is shielded from most public view. It is not destroyed, and the courts, law enforcement and certain employers continue to see it. If you need the record gone rather than shielded, that is the expungement route and a different clock.",
      "If the record met the criteria and still appears after the cycle has run, that is a failure of the process rather than proof you were ineligible — and the dedicated correction route for it is still being researched, so this page will not pretend it exists."
    ],
    submissionMethod: "There is nothing to submit. Section 9122.2 operates without a petition.",
    fees: "No fee for the automatic route, because there is no petition on it.",
    feeWaiver: "Not applicable. There is no fee to waive on this route.",
    noticeOrService: [
      "You serve nobody and notify nobody.",
      "The State Police return a notification of ineligibility to the Administrative Office where a record does not qualify. Nobody is required to tell you when a record has been sealed."
    ],
    expectedNextStage:
      "The record no longer appears on a public docket search, or you have identified that it should have sealed and has not.",
    canPrepare: [
      "This explanation of which Clean Slate route reaches which record, and on what clock.",
      "The two five-year clocks kept apart, and the misdemeanour and fines misconceptions corrected.",
      "The check to run before anyone prepares a petition for the same record."
    ],
    escalations: [
      "A statutory exclusion applies to the record.",
      "A disqualifying charge was filed in the same case.",
      "The record should have sealed and has not.",
      "You want the record expunged rather than sealed."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!PENNSYLVANIA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Pennsylvania guidance template ${templateId} is registered.`);
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

function pennsylvaniaTrack(input: {
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
    jurisdiction: "PA",
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

const VISIBILITY_INPUT: RequiredInput = {
  key: "stillAppearsPublicly",
  label: "Does this record still appear when your Pennsylvania criminal history or public docket is searched?",
  required: true
};

export const PENNSYLVANIA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  pennsylvaniaTrack({
    trackId: "pa_acquittal_auto",
    publicName: "Check that a full acquittal cleared your record automatically",
    mechanism: "automatic_expungement_following_acquittal_on_all_charges",
    authority: "18 Pa.C.S. § 9122(a)",
    recordTypes: ["arrest", "charge", "court_case_record"],
    dispositions: ["acquitted_of_all_charges_same_conduct_or_criminal_episode"],
    courtLevel: "court_that_entered_the_acquittal",
    componentId: "pa_acquittal_auto-process-guidance-1",
    templateId: "pa-acquittal-auto-guidance",
    requiredInputs: [
      { key: "docketNumber", label: "What is the docket number for the case you were acquitted in?", required: true },
      { key: "acquittalDate", label: "On what date were you acquitted?", required: true },
      {
        key: "acquittedOfAllCharges",
        label:
          "Were you found not guilty of every charge that arose from the same incident, or only some of them?",
        required: true
      },
      {
        key: "sameCriminalEpisode",
        label: "Did all of the charges arise from the same conduct or the same incident?",
        required: true
      },
      { key: "monthsSinceAcquittal", label: "How many months have passed since the acquittal?", required: true },
      VISIBILITY_INPUT
    ],
    assembledPacketName: "Acquittal-Automatic-Expungement-Verification",
    assembledPacketTitle: "Check that a full acquittal cleared your record automatically",
    customerDeliverableDescription:
      "A guidance sheet explaining that an acquittal on all charges from the same conduct expunges without a petition, that the Commonwealth has sixty days to object and the expungement is to occur no later than twelve months from the acquittal, why nothing should be filed inside those twelve months, and what to do once they have passed and the record has not cleared.",
    notes:
      "The design's instruction is not to file for a clean total acquittal inside the twelve months but to verify instead and escalate only if the record has not cleared, so the deliverable is a verification path and a twelve-month diary. A still-visible record is not treated as a stop on its own: it becomes an escalation only once the twelve-month outside date has passed, and that escalation names the clerk of courts for the county with the docket number in hand before any clinic referral. A partial acquittal and charges arising from different conduct are typed route mismatches."
  }),

  pennsylvaniaTrack({
    trackId: "pa_ard_expungement",
    publicName: "Check that finishing ARD cleared your arrest record",
    mechanism: "expungement_order_accompanying_ard_dismissal",
    authority: "Pa.R.Crim.P. 320; 18 Pa.C.S. § 9122(b.1)",
    recordTypes: ["arrest", "charge"],
    dispositions: ["ard_completed_and_charges_dismissed"],
    courtLevel: "court_that_entered_the_ard_dismissal",
    componentId: "pa_ard_expungement-process-guidance-1",
    templateId: "pa-ard-expungement-guidance",
    requiredInputs: [
      {
        key: "docketNumber",
        label: "What is the docket number for the case in which you were admitted to ARD?",
        required: true
      },
      { key: "ardCompleted", label: "Did you successfully complete the ARD programme?", required: true },
      { key: "dismissalEntered", label: "Has the court entered an order dismissing the charges?", required: true },
      { key: "dismissalDate", label: "On what date were the charges dismissed?", required: false },
      {
        key: "sexualOffenseMinorVictim",
        label: "Was the ARD offence a sexual offence in which the victim was under 18?",
        required: true
      },
      {
        key: "commonwealthObjected",
        label: "Did the attorney for the Commonwealth object to the expungement?",
        required: true
      },
      VISIBILITY_INPUT
    ],
    assembledPacketName: "ARD-Dismissal-Expungement-Verification",
    assembledPacketTitle: "Check that finishing ARD cleared your arrest record",
    customerDeliverableDescription:
      "A guidance sheet explaining that the judge who dismisses charges after successful ARD completion shall also order expungement of the arrest record, that the Commonwealth may object within thirty days on compelling reasons, how to check the docket for both the dismissal and the expungement order separately, and that the sexual-offence limit comes from § 9122(b.1) rather than the rule.",
    notes:
      "The design instruction is that the sexual-offence exclusion is located in 18 Pa.C.S. § 9122(b.1) and not in Pa.R.Crim.P. 320, and that the statute be cited when explaining the limit — the sheet does exactly that and says why reading the rule alone misleads. Where § 9122(b.1) applies the court has no authority to expunge the arrest record, which is a typed stop. Incomplete ARD, an unentered dismissal, a Commonwealth objection, and a dismissal entered without an expungement order are each handled with their own destination, the last of them being the gap the sheet is written to catch."
  }),

  pennsylvaniaTrack({
    trackId: "pa_9122_2_clean_slate",
    publicName: "Check whether Clean Slate has sealed your record automatically",
    mechanism: "automatic_limited_access_without_petition",
    authority: "18 Pa.C.S. § 9122.2; § 9122.3; § 9102; § 9122.5",
    recordTypes: ["conviction", "charge"],
    dispositions: [
      "misdemeanor_second_degree_or_punishable_no_more_than_two_years",
      "qualifying_offense_as_defined_at_section_9102",
      "final_disposition_other_than_a_conviction",
      "summary_conviction",
      "conviction_for_which_a_conditional_pardon_was_granted"
    ],
    courtLevel: "not_a_court_process",
    componentId: "pa_9122_2_clean_slate-process-guidance-1",
    templateId: "pa-9122-2-clean-slate-guidance",
    requiredInputs: [
      { key: "docketNumber", label: "What is the docket number for the record you are asking about?", required: true },
      { key: "offenseAndGrading", label: "What was the offence and how was it graded?", required: true },
      {
        key: "convictionOrDispositionDate",
        label: "On what date were you convicted, or on what date did the case end without a conviction?",
        required: true
      },
      {
        key: "mostRecentConviction",
        label:
          "What is the date of your most recent conviction for any offence punishable by imprisonment of one or more years?",
        required: true
      },
      {
        key: "summaryJudgmentEntryDate",
        label: "For a summary conviction, on what date was the judgment of conviction entered?",
        required: false
      },
      { key: "sameCaseCharges", label: "What other charges were filed in the same case?", required: true },
      { key: "conditionalPardon", label: "Was a conditional pardon granted for this conviction?", required: true },
      {
        key: "goal",
        label: "What are you trying to do — check whether the record sealed, or have it expunged rather than sealed?",
        required: true
      },
      {
        key: "section9122_3Exclusion",
        label: "Does a statutory exclusion under § 9122.3 apply to this record?",
        required: true
      },
      {
        key: "disqualifyingChargeSameCase",
        label: "Was a disqualifying charge filed in the same case?",
        required: true
      },
      VISIBILITY_INPUT
    ],
    assembledPacketName: "Clean-Slate-Limited-Access-Verification",
    assembledPacketTitle: "Check whether Clean Slate has sealed your record automatically",
    customerDeliverableDescription:
      "A guidance sheet explaining which Clean Slate subsection reaches which record and on what clock, keeping the summary-conviction five-year clock apart from the expungement five-year clock, correcting the belief that all first-degree misdemeanours and any unpaid fines disqualify a record, carrying the Act 36 phase-in dates, and telling the participant to check before anyone prepares a petition.",
    notes:
      "The design's packet instructions are carried in full: check whether Clean Slate has already acted before offering any petition, because generating one for a record that sealed automatically charges the participant for work the Commonwealth already did; the § 9122.2(a)(3) summary-conviction clock runs five years from entry of the judgment and is not the § 9122(b) expungement clock which runs five years free of arrest or prosecution; some first-degree misdemeanours are eligible because any misdemeanour punishable by no more than two years qualifies, so they must not all be routed away; outstanding fines and costs do not block sealing under Act 83 of 2020 while restitution remains a condition; and the Act 36 phase-in dates of 14 December 2023, 12 February 2024 and 11 June 2024 are stated. Where the record should have sealed and has not, the design routes to a failure-correction track that is deferred pending research — the sheet says so rather than implying the route exists, and names the clerk of courts and a clinic as the real interim destinations."
  })
];
