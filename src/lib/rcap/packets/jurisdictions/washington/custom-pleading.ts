// Washington custom pleading, clean tracks.
//
// SCOPE. This is the clean-track split of the Washington assignment. Two relief
// tracks, three assigned custom-pleading components:
//
//   wa_del_nonconviction              RCW 10.97.060 — a written request to the
//     -primary-filing-1                Washington State Patrol. No court.
//
//   wa_vac_post_probation_9_95_240    RCW 9.95.240 — a motion in the sentencing
//     -primary-filing-1                court, and
//     -proposed-order-2                a proposed order, unsigned and undated.
//
// `wa_crop_certificate_of_restoration` is NOT part of this assignment. RCW
// 9.97.020 permits certain superior courts to decline to consider certificate
// applications and which have declined is not established, so the captain split
// it out rather than let a packet name a court that will not hear the
// participant. Nothing here implements it and no document mentions it.
//
// Five further components on these two tracks are `process_guidance` and belong
// to another lane: the records checklist, the expectation-setting sheet and the
// accuracy-remedy guidance on the deletion route, and the records checklist and
// filing instructions on the vacation route. None is implemented here.
//
// TWO ROUTES, TWO DESTINATIONS. The deletion request goes to an agency, not a
// court: there is no cause number, no venue, no hearing, no fee prescribed by
// RCW 10.97.060 and no order. The vacation motion goes to the sentencing court
// and carries a proposed order whose findings, date and signature are the
// judge's and are printed blank.
//
// WHAT THIS MODULE NEVER DOES. It prints no fee: the WSP figures are to be
// verified live at intake rather than stored, and Washington court filing fees
// were not established. It never says the agency will act, that the prosecutor
// does not object, that a period has run, or that a court has found anything.
// It never tells a participant that a Washington Courts pattern form exists for
// RCW 9.95.240; none was identified, which is why this is a drafted pleading.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export const WA_LAWYER_REFERRAL =
  "The Washington State Office of Public Defense, your county's volunteer lawyer programme, Washington Free Legal Answers, or the Washington State Bar Association's lawyer referral service.";

export const WA_COURT_RECORD_REFERRAL =
  "The clerk of the sentencing court holds the judgment and sentence and the cause number. Ask that clerk, or use the Washington Courts case search, before answering from memory.";

export const WA_WSP_REFERRAL =
  "The Washington State Patrol identification and criminal history section, which holds the record and publishes what its current request process and fee are.";

export const WA_FIREARM_REFERRAL =
  "LegalEase's own Washington routing: restoring the right to possess a firearm is a separate proceeding under RCW 9.41.041, and neither of these routes produces it.";

export const WA_REFERRALS: readonly string[] = [
  WA_LAWYER_REFERRAL,
  WA_COURT_RECORD_REFERRAL,
  WA_WSP_REFERRAL,
  WA_FIREARM_REFERRAL
];

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

export class WashingtonEligibilityStopError extends Error {
  readonly stopId: string;
  readonly trackId: string;
  readonly destination: string;
  readonly nextStep: string;

  constructor(stopId: string, trackId: string, reason: string, destination: string, nextStep: string) {
    super(reason);
    this.name = "WashingtonEligibilityStopError";
    this.stopId = stopId;
    this.trackId = trackId;
    this.destination = destination;
    this.nextStep = nextStep;
  }
}

export class WashingtonBranchError extends Error {
  readonly trackId: string;
  readonly key: string;
  readonly value: string;
  readonly permitted: readonly string[];

  constructor(trackId: string, key: string, value: string, permitted: readonly string[]) {
    super(`Answer "${value}" for ${key} on ${trackId} is not one of: ${permitted.join(", ")}.`);
    this.name = "WashingtonBranchError";
    this.trackId = trackId;
    this.key = key;
    this.value = value;
    this.permitted = permitted;
  }
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export const WA_DELETION_TRACK = "wa_del_nonconviction";
export const WA_VACATION_TRACK = "wa_vac_post_probation_9_95_240";

export const WA_ASSIGNED_TRACK_IDS: readonly string[] = [WA_DELETION_TRACK, WA_VACATION_TRACK];

/** The track the captain split out, on an unresolved venue release blocker. */
export const WA_EXCLUDED_TRACK_ID = "wa_crop_certificate_of_restoration";

/** The components on these two tracks that belong to another lane. */
export const WA_EXCLUDED_COMPONENTS: readonly {
  trackId: string;
  componentIdSuffix: string;
  role: string;
  strategy: string;
}[] = [
  { trackId: WA_DELETION_TRACK, componentIdSuffix: "-records-checklist-2", role: "records_checklist", strategy: "process_guidance" },
  { trackId: WA_DELETION_TRACK, componentIdSuffix: "-expectation-setting-3", role: "expectation_setting", strategy: "process_guidance" },
  { trackId: WA_DELETION_TRACK, componentIdSuffix: "-accuracy-remedy-guidance-4", role: "accuracy_remedy_guidance", strategy: "process_guidance" },
  { trackId: WA_VACATION_TRACK, componentIdSuffix: "-records-checklist-3", role: "records_checklist", strategy: "process_guidance" },
  { trackId: WA_VACATION_TRACK, componentIdSuffix: "-filing-instructions-4", role: "filing_instructions", strategy: "process_guidance" }
];

export const WA_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

export const WA_YES_NO_UNSURE: Readonly<Record<string, "yes" | "no" | "unsure">> = {
  yes: "yes",
  no: "no",
  unsure: "unsure"
};

/** Which limb of RCW 9.95.240 the case is on. They ask for different things. */
export const WA_VACATION_LIMBS: Readonly<Record<string, string>> = {
  subsection_one: "subsection (1)",
  subsection_two: "subsection (2)(a)",
  unsure: "unsure"
};

/** What the conviction rested on, which decides what subsection (1) asks to undo. */
export const WA_PLEA_OR_VERDICT: Readonly<Record<string, string>> = {
  plea: "a plea of guilty",
  verdict: "a verdict",
  unsure: "unsure"
};

export const WA_TRACK_INPUT_KEYS: Readonly<Record<string, readonly string[]>> = {
  [WA_DELETION_TRACK]: [
    "applicantName",
    "dateOfBirth",
    "arrestDetails",
    "dispositionDetail",
    "deferredProsecution",
    "priorConvictions",
    "interveningArrests",
    "fugitiveOrActive"
  ],
  [WA_VACATION_TRACK]: [
    "applicantName",
    "dateOfBirth",
    "convictionIdentity",
    "sentencingCourt",
    "causeNumber",
    "sentencingDates",
    "pendingCharges",
    "newConvictions",
    "probationFulfilled",
    "probationEndDate",
    "offenseBefore1984",
    "maximumPunishmentPeriod",
    "pleaOrVerdict"
  ]
};

type Answers = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Answer readers
// ---------------------------------------------------------------------------

const str = (answers: Answers, key: string): string => {
  const value = answers[key];
  return typeof value === "string" ? value.trim() : "";
};

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    throw new WashingtonEligibilityStopError(
      "wa-answer-missing",
      trackId,
      `The answer to "${key}" is needed before this document can be drafted, and it has not been given. Nothing in this packet is written from an assumption about a participant's own case.`,
      WA_COURT_RECORD_REFERRAL,
      "Answer the question from your own record and run the packet again."
    );
  }
  return value;
};

const branch = <T>(
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, T>>
): T => {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new WashingtonBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

/** The same validation returning the key, for branch predicates. */
const branchKey = (
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, unknown>>
): string => {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new WashingtonBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return normalized;
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), WA_YES_NO);

const yesNoUnsure = (trackId: string, answers: Answers, key: string): "yes" | "no" | "unsure" =>
  branch(trackId, key, need(trackId, answers, key), WA_YES_NO_UNSURE);

function echoInputs(trackId: string, answers: Answers): Record<string, string> {
  const echoed: Record<string, string> = {};
  for (const key of WA_TRACK_INPUT_KEYS[trackId] ?? []) echoed[key] = str(answers, key);
  return echoed;
}

// ---------------------------------------------------------------------------
// Derived facts
// ---------------------------------------------------------------------------

const NO_FEE_STATEMENT =
  "This packet prints no amount. The Washington State Patrol's own fee figures change and are to be checked live rather than stored, and Washington court filing fees, together with whatever additional requirements a county imposes under the Washington Courts local-rule warning, were not established here. Ask the receiving office or the clerk what is charged and what that county requires before you send or file anything.";

const LOCAL_RULE_STATEMENT =
  "Washington Courts warn that counties impose additional local requirements. Which counties impose what was not established, so ask the clerk of the court named above what that county requires of a self-represented filer before you file.";

export function deriveWashingtonFacts(trackId: string, answers: Answers): Record<string, string> {
  if (!WA_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new WashingtonBranchError(trackId, "trackId", trackId, WA_ASSIGNED_TRACK_IDS);
  }

  const name = need(trackId, answers, "applicantName");
  const dob = need(trackId, answers, "dateOfBirth");

  const shared = {
    ...echoInputs(trackId, answers),
    waApplicantName: name,
    waApplicantDob: dob,
    waFeeStatement: NO_FEE_STATEMENT,
    waReferralLine: WA_LAWYER_REFERRAL,
    waFirearmStatement:
      "This route does not restore the right to possess a firearm. That is a separate proceeding under RCW 9.41.041, and nothing in this document asks for it or produces it."
  };

  switch (trackId) {
    case WA_DELETION_TRACK: {
      if (yesNo(trackId, answers, "deferredProsecution")) {
        throw new WashingtonEligibilityStopError(
          "wa-10-97-060-deferred-prosecution",
          trackId,
          "The case was resolved by a deferred prosecution or a similar diversion. That is one of the common grounds on which the Washington State Patrol refuses a deletion request, and a request that walks into it asks an agency to do something it routinely declines.",
          WA_LAWYER_REFERRAL,
          "Ask one of those offices whether any other Washington route reaches this record."
        );
      }
      if (yesNo(trackId, answers, "priorConvictions")) {
        throw new WashingtonEligibilityStopError(
          "wa-10-97-060-prior-conviction",
          trackId,
          "There is a prior felony or gross misdemeanour conviction. That is another of the common refusal grounds on this route.",
          WA_LAWYER_REFERRAL,
          "Ask one of those offices what reaches a record with a prior conviction behind it."
        );
      }
      if (yesNo(trackId, answers, "interveningArrests")) {
        throw new WashingtonEligibilityStopError(
          "wa-10-97-060-intervening-arrest",
          trackId,
          "There has been an arrest for or a charge of another crime in the intervening period. That is the third of the common refusal grounds.",
          WA_LAWYER_REFERRAL,
          "Ask one of those offices whether the request is worth making on these facts."
        );
      }
      if (yesNo(trackId, answers, "fugitiveOrActive")) {
        throw new WashingtonEligibilityStopError(
          "wa-10-97-060-fugitive-or-active",
          trackId,
          "There is an outstanding warrant, or the case remains under active prosecution. A record that is still live is not non-conviction data that anybody will delete.",
          WA_LAWYER_REFERRAL,
          "Resolve the warrant or the pending matter first, and take the docket to one of those offices if you are not sure it is resolved."
        );
      }

      const arrest = need(trackId, answers, "arrestDetails");
      const disposition = need(trackId, answers, "dispositionDetail");
      return {
        ...shared,
        waRouteCitation: "RCW 10.97.060",
        waAddresseeShortName: "Washington State Patrol",
        waIdentityStatement: `The requester is ${name}, born ${dob}.`,
        waArrestStatement: `The requester states the arrest or citation as: ${arrest}`,
        waDispositionStatement: `The requester states the disposition and its date as: ${disposition}`,
        waNotAFilingStatement:
          "This is a written request to an agency. It is not a court filing, no cause number attaches to it, no venue arises, there is no hearing, and no order issues on it. The Washington State Patrol decides.",
        waNonConvictionCaveat:
          "Whether this record is non-conviction criminal history record information within RCW 10.97.030(2) is the threshold question, and it is the Patrol's to answer. RCW 10.97.060 and RCW 10.97.030(2) were not read at source in the controlling design, so this request does not assert that the record qualifies; it states the disposition and asks.",
        waConditionsStatement:
          "The requester states that the disposition was not a deferred prosecution or a similar diversion, that they have no prior felony or gross misdemeanour conviction, that they have not been arrested for or charged with another crime in the intervening period, that they are not a fugitive, and that the case is not under active prosecution. Each of those is the requester's own statement from their own records, and each is a ground on which this office commonly refuses.",
        waFingerprintCardStatement:
          "This is a request to DELETE non-conviction data. It is not the fingerprint-card record review that most people reach for first, and the two are different products with different fees. Sending the wrong one gets a copy of your record back rather than a deletion.",
        waRefusalStatement:
          "The Patrol may refuse. Where it does, RCW 10.97.110 is the challenge route, and that is a matter for a lawyer rather than for a second copy of this request.",
        waNotAssertedStatement:
          "This request does not say that the Patrol will delete anything, that it has acted, or that the record qualifies as a matter of law. Nobody at LegalEase has seen the requester's criminal history or any agency file in this matter.",
        packetCaseReference: "Washington non-conviction deletion request"
      };
    }

    case WA_VACATION_TRACK: {
      if (yesNo(trackId, answers, "pendingCharges")) {
        throw new WashingtonEligibilityStopError(
          "wa-9-95-240-pending-charge",
          trackId,
          "A charge is pending in Washington, in another state, in federal court or in a tribal court. Relief under RCW 9.95.240 is discretionary on both limbs, and a motion filed with a charge pending asks the court to exercise that discretion against the worst possible background.",
          WA_LAWYER_REFERRAL,
          "Resolve the pending matter first, and take the docket to one of those offices if you are not sure it is resolved."
        );
      }
      if (yesNo(trackId, answers, "newConvictions")) {
        throw new WashingtonEligibilityStopError(
          "wa-9-95-240-new-conviction",
          trackId,
          "There has been a new conviction since. That bears directly on the discretion the section leaves to the court, and it is argued rather than recited.",
          WA_LAWYER_REFERRAL,
          "Take the full history to one of those offices before filing."
        );
      }

      // The design declares no "which limb" question, so the limb is derived
      // from the answers it does declare, using the section's own tests. A
      // participant or their adviser may still state it, and where they do the
      // stated answer governs; but nothing here asks a question the design did
      // not, and nothing guesses when the answers leave the choice open.
      const before1984 = yesNoUnsure(trackId, answers, "offenseBefore1984");
      const fulfilledForLimb = yesNoUnsure(trackId, answers, "probationFulfilled");
      const maxPeriodForLimb = yesNoUnsure(trackId, answers, "maximumPunishmentPeriod");
      const statedLimb = str(answers, "vacationLimb");
      const subsectionOneOpen = fulfilledForLimb === "yes" && maxPeriodForLimb === "yes";
      const subsectionTwoOpen = before1984 === "yes";
      let limb: string;
      if (statedLimb) {
        limb = branchKey(trackId, "vacationLimb", statedLimb, WA_VACATION_LIMBS);
      } else if (subsectionOneOpen && !subsectionTwoOpen) {
        limb = "subsection_one";
      } else if (subsectionTwoOpen && !subsectionOneOpen) {
        limb = "subsection_two";
      } else {
        limb = "unsure";
      }
      if (limb === "unsure") {
        throw new WashingtonEligibilityStopError(
          "wa-9-95-240-limb-not-established",
          trackId,
          subsectionOneOpen && subsectionTwoOpen
            ? "Both limbs of RCW 9.95.240 appear open on these answers. Subsection (1) asks leave to withdraw a plea or set aside a verdict and to dismiss the information or indictment; subsection (2)(a) applies for vacation under RCW 9.94A.640 by the pre-1 July 1984 equivalence. They ask the court for different things and they lead to different orders, and choosing between them is a legal judgment this packet does not make."
            : "Neither limb of RCW 9.95.240 is open on these answers. Subsection (1) needs the conditions of probation to have been fulfilled, or a discharge before their expiration, with the maximum period of punishment still running; subsection (2)(a) needs an offence committed before 1 July 1984.",
          WA_LAWYER_REFERRAL,
          subsectionOneOpen && subsectionTwoOpen
            ? "Ask one of those offices which limb fits this record, then run the packet again."
            : "Ask one of those offices whether any other Washington route reaches this record."
        );
      }

      if (limb === "subsection_two" && before1984 !== "yes") {
        throw new WashingtonEligibilityStopError(
          "wa-9-95-240-offence-date-not-established",
          trackId,
          before1984 === "no"
            ? "The offence was committed on or after 1 July 1984. Subsection (2)(a) applies the RCW 9.94A.640(2) tests as they would apply to a person convicted of a crime committed BEFORE that date, which is what fixes this as the pre-Sentencing Reform Act route; a later offence is outside it."
            : "Whether the offence was committed before 1 July 1984 has not been established. That single date is what puts a case on the subsection (2)(a) limb at all.",
          before1984 === "no" ? WA_LAWYER_REFERRAL : WA_COURT_RECORD_REFERRAL,
          before1984 === "no"
            ? "Ask one of those offices which Washington vacation route reaches an offence after that date."
            : "Read the offence date off the charging document and run the packet again."
        );
      }

      const fulfilled = fulfilledForLimb;
      if (limb === "subsection_one" && fulfilled !== "yes") {
        throw new WashingtonEligibilityStopError(
          "wa-9-95-240-probation-not-fulfilled",
          trackId,
          fulfilled === "no"
            ? "The conditions of probation were not fulfilled and there was no early discharge. Subsection (1) opens to a defendant who fulfilled the conditions of probation or was discharged before their expiration, so neither door is open on these facts."
            : "Whether the conditions of probation were fulfilled, or whether there was a discharge before their expiration, has not been established. Subsection (1) turns on it.",
          fulfilled === "no" ? WA_LAWYER_REFERRAL : WA_COURT_RECORD_REFERRAL,
          fulfilled === "no"
            ? "Ask one of those offices whether any other Washington route reaches this record."
            : "Ask the clerk for the order of discharge and run the packet again."
        );
      }

      const maxPeriod = maxPeriodForLimb;
      if (limb === "subsection_one" && maxPeriod !== "yes") {
        throw new WashingtonEligibilityStopError(
          "wa-9-95-240-maximum-period-expired",
          trackId,
          maxPeriod === "no"
            ? "The maximum period of punishment for the offence has already expired. Subsection (1) permits the application at any time BEFORE that period expires, so the window this limb depends on has closed."
            : "Whether the maximum period of punishment for the offence has expired has not been established. Subsection (1) is available only before it does, so the answer decides whether the motion can be made at all.",
          maxPeriod === "no" ? WA_LAWYER_REFERRAL : WA_COURT_RECORD_REFERRAL,
          maxPeriod === "no"
            ? "Ask one of those offices whether the subsection (2)(a) limb or any other route is open instead."
            : "Take the judgment and sentence to the clerk or to a lawyer to establish the maximum period, and run the packet again."
        );
      }

      const pleaOrVerdict = branchKey(
        trackId,
        "pleaOrVerdict",
        need(trackId, answers, "pleaOrVerdict"),
        WA_PLEA_OR_VERDICT
      );
      if (limb === "subsection_one" && pleaOrVerdict === "unsure") {
        throw new WashingtonEligibilityStopError(
          "wa-9-95-240-plea-or-verdict-not-established",
          trackId,
          "Whether the conviction rested on a plea of guilty or on a verdict has not been established. Subsection (1) asks leave to withdraw the plea, or to set aside the verdict, and the motion has to ask for the one that fits the record.",
          WA_COURT_RECORD_REFERRAL,
          "Read the judgment and sentence and run the packet again."
        );
      }

      const court = need(trackId, answers, "sentencingCourt");
      const cause = need(trackId, answers, "causeNumber");
      const conviction = need(trackId, answers, "convictionIdentity");
      const sentencingDates = need(trackId, answers, "sentencingDates");
      const probationEnd = str(answers, "probationEndDate");

      return {
        ...shared,
        waRouteCitation: "RCW 9.95.240",
        waLimb: limb,
        waCourtLine: court.toUpperCase(),
        waCourtName: court,
        waCauseNumber: cause,
        waIdentityStatement: `The defendant is ${name}, born ${dob}.`,
        waConvictionStatement: `The defendant states the conviction as: ${conviction}`,
        waSentencingStatement: `The defendant states the sentencing dates as: ${sentencingDates}`,
        waProbationStatement:
          limb === "subsection_one"
            ? `The defendant states that the conditions of probation were fulfilled, or that there was a discharge before their expiration${probationEnd ? `, and states the date as ${probationEnd}` : ""}.`
            : "This motion is on the subsection (2)(a) limb, which is reached after probation has expired rather than during it.",
        waLimbStatement:
          limb === "subsection_one"
            ? `This motion is made under subsection (1) of RCW 9.95.240. It asks the Court ${pleaOrVerdict === "plea" ? "for leave to withdraw the plea of guilty and to enter a plea of not guilty" : "to set aside the verdict"}, and for dismissal of the information or indictment. Subsection (1) permits the application at any time before the maximum period of punishment for the offence expires, and it carries a proviso preserving the conviction for pleading and proof in any later prosecution.`
            : "This motion is made under subsection (2)(a) of RCW 9.95.240. It applies for vacation of the record of conviction under RCW 9.94A.640, the Court applying the equivalent of the RCW 9.94A.640(2) tests as they would apply to a person convicted of a crime committed before 1 July 1984. That equivalence is what fixes this as the pre-Sentencing Reform Act route.",
        waReliefRequested:
          limb === "subsection_one"
            ? `The defendant asks the Court ${pleaOrVerdict === "plea" ? "for leave to withdraw the plea of guilty and to enter a plea of not guilty" : "to set aside the verdict"}, and for an order dismissing the information or indictment, under RCW 9.95.240(1).`
            : "The defendant asks the Court to vacate the record of conviction under RCW 9.95.240(2)(a) and RCW 9.94A.640.",
        waDiscretionStatement:
          "Relief under RCW 9.95.240 is discretionary on both limbs. This motion does not say that it will be granted, and it does not say that the Court must grant it.",
        waProvisoStatement:
          limb === "subsection_one"
            ? "Subsection (1) carries a proviso: the conviction may be pleaded and proved in any subsequent prosecution. An order under this limb does not make the conviction disappear for every purpose, and this motion does not say that it does."
            : "A vacation under RCW 9.94A.640 has its own effect and its own limits, and this motion does not describe them beyond what the section provides.",
        waNoPatternFormStatement:
          "No Washington Courts pattern form for RCW 9.95.240 was identified by the controlling design or on this pass, and the section itself prescribes none. This motion is drafted on the RCW 9.94A.640 model that Washington clerks expect. It is not a pattern form and it does not claim to be one.",
        waLocalRuleStatement: LOCAL_RULE_STATEMENT,
        waNotAssertedStatement:
          "This motion does not say that the defendant is entitled to the relief. It does not say that the prosecuting attorney agrees or will not object; nothing has been obtained from that office. It does not say that any hearing has been held or that any finding has been made. Nobody at LegalEase has read the court file or the probation record in this matter.",
        packetCaseReference: cause
      };
    }

    default:
      throw new WashingtonBranchError(trackId, "trackId", trackId, WA_ASSIGNED_TRACK_IDS);
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const DELETION_REQUEST: PleadingTemplate = {
  templateId: `${WA_DELETION_TRACK}-request`,
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "WRITTEN REQUEST UNDER RCW 10.97.060 — THIS IS NOT A COURT FILING",
    partyBlockLeft: ["TO:", "", "The Washington State Patrol", "identification and criminal", "history section"],
    partyBlockRight: ["RCW 10.97.060", "", "Written request", "", "Not a court filing"]
  },
  title: "REQUEST TO DELETE NON-CONVICTION CRIMINAL HISTORY RECORD INFORMATION",
  preamble:
    "Prepared by LegalEase from the requester's own answers, for the requester to sign and send. LegalEase has seen no criminal history record, has decided nothing and sends nothing.",
  sections: [
    {
      heading: "COMPLETE THESE LINES BEFORE SENDING",
      numbered: false,
      paragraphs: [
        "Requester's return address: ___________________________________________",
        "______________________________________________________________________",
        "The section's current postal address: _________________________________",
        "______________________________________________________________________",
        "Date sent: ____________________________________________________________"
      ]
    },
    {
      heading: "WHAT THIS REQUEST IS",
      numbered: false,
      paragraphs: ["{{waNotAFilingStatement}}", "{{waFingerprintCardStatement}}"]
    },
    {
      heading: "I. THE REQUESTER AND THE RECORD",
      numbered: true,
      paragraphs: [
        "{{waIdentityStatement}}",
        "{{waArrestStatement}}",
        "{{waDispositionStatement}}",
        "{{waConditionsStatement}}"
      ]
    },
    {
      heading: "II. WHAT THIS REQUEST DOES NOT SAY",
      numbered: false,
      paragraphs: ["{{waNonConvictionCaveat}}", "{{waNotAssertedStatement}}", "{{waFirearmStatement}}"]
    },
    {
      heading: "IF THE REQUEST IS REFUSED",
      numbered: false,
      paragraphs: ["{{waRefusalStatement}}", "{{waFeeStatement}}"]
    },
    {
      heading: "WHERE THIS PACKET STOPS",
      numbered: false,
      paragraphs: [
        "LegalEase prepares documents from what the requester says. It gives no legal advice, reads no record, decides no eligibility question and sends nothing.",
        "Any doubt about whether the record is non-conviction data under RCW 10.97.030(2).",
        "A deferred prosecution or similar diversion, a prior felony or gross misdemeanour conviction, or an arrest or charge in the intervening period — each a common refusal ground.",
        "Any outstanding warrant, or a case still under active prosecution.",
        "A refusal the requester wants to challenge, which is the RCW 10.97.110 remedy.",
        "Any immigration consequence, which a Washington deletion does not resolve.",
        "Where any of these applies, speak to a lawyer before sending anything. {{waReferralLine}}"
      ]
    }
  ],
  prayer: [
    "The requester asks that the non-conviction criminal history record information described above be deleted, as RCW 10.97.060 provides.",
    "This request reports no decision by anybody. It asks."
  ],
  verification:
    "The requester states that the facts set out above are true and correct to the best of the requester's knowledge and belief. RCW 10.97.060 prescribes no verification and no notarization for this request; if the office you send it to asks for one, ask that office what form it wants before you sign.",
  signatureLabel: "The requester, in their own name",
  signatureBlock: [
    "",
    "Printed name: ______________________________",
    "Date: ______________________________________",
    "",
    "Sign and date this by hand before sending it. Send it so that receipt can be evidenced, and keep a copy.",
    "Write the section's current postal address into the block above from your own look-up; none is printed here."
  ]
};

const VACATION_MOTION: PleadingTemplate = {
  templateId: `${WA_VACATION_TRACK}-motion`,
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{waCourtLine}}",
    partyBlockLeft: ["STATE OF WASHINGTON,", "", "Plaintiff,", "", "vs.", "", "{{waApplicantName}},", "", "Defendant."],
    partyBlockRight: ["No. {{waCauseNumber}}", "", "MOTION UNDER RCW 9.95.240"]
  },
  title: "MOTION FOR RELIEF UNDER RCW 9.95.240",
  preamble:
    "The defendant, appearing without a lawyer, moves this Court under RCW 9.95.240 for the relief set out below, and states as follows. LegalEase prepared this motion from the defendant's own answers, has seen no court record and no probation file, has decided nothing, represents nobody and has filed nothing.",
  sections: [
    {
      heading: "WHICH LIMB THIS MOTION IS ON",
      numbered: false,
      paragraphs: ["{{waLimbStatement}}", "{{waNoPatternFormStatement}}"]
    },
    {
      heading: "I. THE DEFENDANT AND THE CONVICTION",
      numbered: true,
      paragraphs: [
        "{{waIdentityStatement}}",
        "{{waConvictionStatement}}",
        "{{waSentencingStatement}}",
        "{{waProbationStatement}}"
      ]
    },
    {
      heading: "II. WHAT THIS MOTION DOES NOT SAY",
      numbered: false,
      paragraphs: [
        "{{waNotAssertedStatement}}",
        "{{waDiscretionStatement}}",
        "{{waProvisoStatement}}",
        "{{waFirearmStatement}}"
      ]
    },
    {
      heading: "BEFORE YOU FILE",
      numbered: false,
      paragraphs: ["{{waLocalRuleStatement}}", "{{waFeeStatement}}"]
    },
    {
      heading: "WHERE THIS PACKET STOPS",
      numbered: false,
      paragraphs: [
        "LegalEase prepares documents from what the defendant says. It gives no legal advice, reads no record, decides no eligibility question and files nothing.",
        "Any pending charge in Washington, in another state, in federal court or in a tribal court, and any new conviction since.",
        "Any domestic violence element, any protection, no-contact, antiharassment or civil restraining order in effect or violated in the last five years.",
        "Any DUI, physical control, or alcohol or drug related driving offence, including a reduced charge.",
        "Any firearm, deadly weapon or sexual motivation enhancement, and any question about the offence class or the exact RCW.",
        "Any immigration consequence, and any aim of restoring firearm rights, which is a separate proceeding under RCW 9.41.041.",
        "Where any of these applies, speak to a lawyer before filing. {{waReferralLine}}"
      ]
    }
  ],
  prayer: ["{{waReliefRequested}}", "Nothing in this motion reports a decision by anyone. It asks."],
  verification:
    "I am the defendant. I have read this motion and the statements in it are mine and are true to the best of my knowledge. I understand that nobody at LegalEase has seen my records, decided whether I am eligible, obtained anything from the prosecuting attorney, or given me legal advice, and that whether this relief is granted is for the Court to decide.",
  signatureLabel: "Defendant, self-represented",
  signatureBlock: [
    "",
    "Printed name: ______________________________",
    "Address: ___________________________________",
    "Telephone: _________________________________",
    "Date: ______________________________________",
    "",
    "Sign and date this by hand, in ink, before you file it.",
    "File it with the clerk of the court named in the caption and serve the prosecuting attorney as that county's rules require."
  ]
};

const VACATION_ORDER: PleadingTemplate = {
  templateId: `${WA_VACATION_TRACK}-order`,
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{waCourtLine}}",
    partyBlockLeft: ["STATE OF WASHINGTON,", "", "Plaintiff,", "", "vs.", "", "{{waApplicantName}},", "", "Defendant."],
    partyBlockRight: ["No. {{waCauseNumber}}", "", "ORDER UNDER RCW 9.95.240"]
  },
  title: "PROPOSED ORDER UNDER RCW 9.95.240",
  preamble:
    "This is a proposed order, tendered for the Court's consideration with the motion it accompanies. Every finding, date and signature below is left blank for the Court. It has been granted by nobody and signed by nobody.",
  sections: [
    {
      numbered: false,
      paragraphs: [
        "THIS MATTER came before the Court on the defendant's motion under RCW 9.95.240.",
        "The Court, having considered the motion, FINDS:"
      ]
    },
    {
      numbered: false,
      paragraphs: [
        "(  ) that the defendant fulfilled the conditions of probation, or was discharged before their expiration;",
        "(  ) that the maximum period of punishment for the offence has not expired;",
        "(  ) that no charge is pending against the defendant; and",
        "(  ) that the tests the section applies are met."
      ]
    },
    {
      numbered: false,
      paragraphs: [
        "IT IS HEREBY ORDERED that the relief sought in the motion be granted, in the terms the Court directs below.",
        "The relief ordered: ___________________________________________________",
        "______________________________________________________________________",
        "IT IS FURTHER ORDERED, as RCW 9.95.240(2)(b) directs, that a copy of this order be transmitted to the Washington State Patrol identification section and to any local police agency holding criminal history information relating to this conviction.",
        "The agencies to which this order is to be transmitted: ________________",
        "______________________________________________________________________",
        "An agency left off the line above does not receive this order. The line is completed by the defendant from the record and settled by the Court."
      ]
    }
  ],
  prayer: [],
  // The court signs a proposed order.
  signatureLabel: null,
  signatureBlock: [
    "",
    "_____________________________________",
    "JUDGE / COURT COMMISSIONER",
    "",
    "Dated: ______________________",
    "",
    "The findings, the date and the signature above are the Court's. They are printed blank, and LegalEase has made no finding and signed nothing."
  ]
};

export const WA_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [DELETION_REQUEST.templateId]: DELETION_REQUEST,
  [VACATION_MOTION.templateId]: VACATION_MOTION,
  [VACATION_ORDER.templateId]: VACATION_ORDER
};

// ---------------------------------------------------------------------------
// Packet sets and tracks
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * Design role → engine role.
 *
 * The deletion request is a `primary_filing` even though nothing is filed: it
 * is the participant's own principal document on that route, and the engine's
 * closed role list has no separate value for an agency request.
 */
export const WA_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order"
};

const DELETION_PACKET_SET: PacketSet = {
  packetSetId: `${WA_DELETION_TRACK}-set`,
  version: VERSION,
  components: [
    {
      componentId: `${WA_DELETION_TRACK}-primary-filing-1`,
      role: WA_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: DELETION_REQUEST.templateId,
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

const VACATION_PACKET_SET: PacketSet = {
  packetSetId: `${WA_VACATION_TRACK}-set`,
  version: VERSION,
  components: [
    {
      componentId: `${WA_VACATION_TRACK}-primary-filing-1`,
      role: WA_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: VACATION_MOTION.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${WA_VACATION_TRACK}-proposed-order-2`,
      role: WA_DESIGN_ROLE_TO_ENGINE_ROLE.proposed_order,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: VACATION_ORDER.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 2,
      approval: PENDING_APPROVAL,
      version: VERSION
    }
  ]
};

const statuses = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

const DELETION_INPUTS: readonly RequiredInput[] = [
  { key: "applicantName", label: "What is your full legal name, and have you used any other names?", required: true },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  {
    key: "arrestDetails",
    label: "Which agency arrested or cited you, on what date, and under what incident or case number?",
    required: true
  },
  {
    key: "dispositionDetail",
    label: "How did the matter end, and on what date? Take it from the disposition record rather than memory.",
    required: true
  },
  {
    key: "deferredProsecution",
    label:
      "Was it a deferred prosecution or a similar diversion? Answer yes or no. This is the most common ground of refusal.",
    required: true
  },
  {
    key: "priorConvictions",
    label: "Do you have a prior felony or gross misdemeanour conviction? Answer yes or no.",
    required: true
  },
  {
    key: "interveningArrests",
    label: "Have you been arrested for or charged with another crime since? Answer yes or no.",
    required: true
  },
  {
    key: "fugitiveOrActive",
    label: "Is there an outstanding warrant, or is the case still under active prosecution? Answer yes or no.",
    required: true
  }
];

const VACATION_INPUTS: readonly RequiredInput[] = [
  { key: "applicantName", label: "What is your full legal name, and have you used any other names?", required: true },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  {
    key: "convictionIdentity",
    label: "What was the offence, and which RCW section was it under?",
    required: true
  },
  { key: "sentencingCourt", label: "Which court sentenced you, and in which county?", required: true },
  { key: "causeNumber", label: "What is the cause number?", required: true },
  { key: "sentencingDates", label: "On what date were you sentenced?", required: true },
  {
    key: "pendingCharges",
    label:
      "Is any charge pending against you in Washington, another state, federal court or a tribal court? Answer yes or no.",
    required: true
  },
  { key: "newConvictions", label: "Has there been any new conviction since? Answer yes or no.", required: true },
  {
    key: "probationFulfilled",
    label:
      "Did you fulfil the conditions of probation, or were you discharged before they expired? Answer yes, no or unsure.",
    required: true
  },
  { key: "probationEndDate", label: "On what date did probation end?", required: false },
  {
    key: "offenseBefore1984",
    label:
      "Was the offence committed before 1 July 1984? Answer yes, no or unsure. That date is what puts a case on the subsection (2)(a) limb.",
    required: true
  },
  {
    key: "maximumPunishmentPeriod",
    label:
      "Is the maximum period of punishment for the offence still running — that is, has it NOT yet expired? Answer yes, no or unsure. Subsection (1) is available only before it expires.",
    required: true
  },
  {
    key: "pleaOrVerdict",
    label: "Did the conviction rest on a plea of guilty or on a verdict? Answer plea, verdict or unsure.",
    required: true
  }
  // The design declares no "which limb" question. `vacationLimb` is read where
  // it is volunteered, but it is not asked and it is not declared, so a
  // participant is never required to make a classification the design left to
  // the answers it does ask for.
];

export const WA_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "WA",
    trackId: WA_DELETION_TRACK,
    publicName: "Ask the Washington State Patrol to delete a non-conviction record",
    mechanism: "written_request_to_delete_non_conviction_criminal_history_record_information",
    authority: "RCW § 10.97.060",
    recordTypes: ["non_conviction_criminal_history_record_information"],
    dispositions: ["non_conviction"],
    // Not a court level, and deliberately: nothing on this route is filed.
    courtLevel: "not_a_court_filing_the_request_goes_to_the_washington_state_patrol",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: DELETION_PACKET_SET,
    requiredInputs: DELETION_INPUTS,
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "custom_pleading"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "wa-non-conviction-deletion-request",
    assembledPacketTitle: "Washington request to delete non-conviction record information — RCW § 10.97.060",
    customerDeliverableDescription:
      "A signed written request to the Washington State Patrol to delete non-conviction criminal history record information, drafted from the requester's own answers. Each of the three common refusal grounds is screened before anything is drafted and stated on the face of the request; the request says on its face that it is not a court filing, that no order issues on it and that the agency decides; and it distinguishes itself from the fingerprint-card record review most people reach for first. No amount is printed.",
    notes:
      "The controlling review classified this as process guidance only. The reclassification is the design's, not this module's: a participant-facing written request plainly exists, its destination, scope and required contents are identified, and it can be generated from participant-supplied facts. Agency discretion, an agency destination and a hard eligibility test are reasons to set expectations honestly rather than to withhold a packet, which is what the document does before anyone pays. RCW 10.97.060 and RCW 10.97.030(2) were not read at source, so the request states the disposition and asks rather than asserting that the record qualifies as non-conviction data."
  },
  {
    jurisdiction: "WA",
    trackId: WA_VACATION_TRACK,
    publicName: "Vacate a pre-1984 Washington conviction after probation",
    mechanism: "motion_for_dismissal_after_probation_or_vacation_of_a_pre_1984_conviction",
    authority: "RCW § 9.95.240",
    recordTypes: ["conviction_record"],
    dispositions: ["conviction"],
    courtLevel: "the_sentencing_court",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: VACATION_PACKET_SET,
    requiredInputs: VACATION_INPUTS,
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "custom_pleading"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "wa-9-95-240-vacation-motion",
    assembledPacketTitle: "Washington motion under RCW § 9.95.240, with proposed order",
    customerDeliverableDescription:
      "A motion in the participant's own sentencing court under whichever limb of RCW 9.95.240 their answers put them on — subsection (1), asking leave to withdraw a plea or set aside a verdict and to dismiss the information or indictment, or subsection (2)(a), applying for vacation under RCW 9.94A.640 by the pre-1984 equivalence — together with a proposed order carrying the subsection (2)(b) transmittal directions, whose findings, date and signature are printed blank for the Court.",
    notes:
      "No Washington Courts pattern form for this section was identified by the controlling review or on this pass, and the section prescribes none, which is why the strategy is custom pleading rather than unresolved; the motion says so on its face rather than implying it is a form. Relief is discretionary on both limbs and the motion says so. Which counties impose additional local requirements under the Washington Courts local-rule warning was not established, so the motion sends the participant to their own clerk rather than stating a requirement it cannot support."
  }
];
