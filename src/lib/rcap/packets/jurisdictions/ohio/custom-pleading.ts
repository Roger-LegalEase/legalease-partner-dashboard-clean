// Ohio sealing and expungement applications — custom pleading, clean tracks.
//
// SCOPE. This is the clean-track split of the Ohio assignment. Four relief
// tracks, four assigned custom-pleading components — one statutory-content
// application on each of
//
//   oh_2953_32_sealing        ORC 2953.32, sealing a conviction record
//   oh_2953_32_expungement    ORC 2953.32, expunging a conviction record
//   oh_2953_33_nonconviction  ORC 2953.33, after acquittal, dismissal or no bill
//   oh_2953_35_firearm        ORC 2953.35, the obsolete concealed-handgun
//                             notification offence
//
// `oh_marijuana_expungement` is NOT part of this assignment. It carries an
// unresolved governing-mechanism release blocker about whether Issue 2 created
// separate or automatic relief alongside the ORC 2953.321 application route, so
// the captain split it out. Nothing in this module implements it, and no
// document mentions it: a participant on this route would only be confused by a
// reference to a route this packet cannot take them down.
//
// Each track carries four further components that are NOT this lane's work:
// three `process_guidance` components (local-form, record-gathering, and
// hearing-and-objection instructions) and one `official_pdf_fill` component
// (the BCI transmission). None of them is implemented here.
//
// WHAT THE DOCUMENT IS. Ohio publishes no statewide mandatory packet.
// Applications are obtained from the court where the charge was filed, and
// courts commonly maintain different packets for convictions and
// non-convictions. There is therefore no form identity to fill. What the
// statute prescribes is the CONTENT, and that is what this module drafts: a
// statement of the statutorily required content which the participant
// transcribes onto, or files with, their own court's application. Every
// document says so on its face, because a participant who thinks this IS the
// court's form will file the wrong thing.
//
// WHAT THIS MODULE NEVER DOES. It never elects between sealing and expungement:
// that election is a legal judgment with different waits and different
// exclusions, and it is the participant's or their lawyer's, so a participant
// who has not made it is stopped rather than defaulted. It computes no waiting
// period — the ORC 2953.32 felony expungement clock is compound, running ten
// years from the sealing eligibility date rather than from discharge, and this
// packet states the rule without applying it. It prints no fee amount. It never
// says the prosecutor did not object, that a hearing happened, or that the
// court found anything.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export const OH_LAWYER_REFERRAL =
  "The Ohio Justice and Policy Center, the legal aid society for your county, Ohio Free Legal Answers, or the Ohio State Bar Association lawyer referral service.";

export const OH_COURT_RECORD_REFERRAL =
  "The clerk of the court that handled the case holds the docket, the disposition and the case number. Ask that clerk before answering from memory.";

export const OH_LOCAL_FORM_REFERRAL =
  "The clerk of the court you will file in publishes that court's own application. Ask that clerk for it; Ohio has no statewide mandatory packet and the local packets differ.";

export const OH_REMEDY_CHOICE_REFERRAL =
  "The Ohio Justice and Policy Center or a lawyer, because choosing between sealing and expungement is a legal judgment with different waits and different exclusions, and it is not a preference this packet can settle for you.";

export const OH_REFERRALS: readonly string[] = [
  OH_LAWYER_REFERRAL,
  OH_COURT_RECORD_REFERRAL,
  OH_LOCAL_FORM_REFERRAL,
  OH_REMEDY_CHOICE_REFERRAL
];

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

export class OhioEligibilityStopError extends Error {
  readonly stopId: string;
  readonly trackId: string;
  readonly destination: string;
  readonly nextStep: string;

  constructor(stopId: string, trackId: string, reason: string, destination: string, nextStep: string) {
    super(reason);
    this.name = "OhioEligibilityStopError";
    this.stopId = stopId;
    this.trackId = trackId;
    this.destination = destination;
    this.nextStep = nextStep;
  }
}

export class OhioBranchError extends Error {
  readonly trackId: string;
  readonly key: string;
  readonly value: string;
  readonly permitted: readonly string[];

  constructor(trackId: string, key: string, value: string, permitted: readonly string[]) {
    super(`Answer "${value}" for ${key} on ${trackId} is not one of: ${permitted.join(", ")}.`);
    this.name = "OhioBranchError";
    this.trackId = trackId;
    this.key = key;
    this.value = value;
    this.permitted = permitted;
  }
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export const OH_SEALING_TRACK = "oh_2953_32_sealing";
export const OH_EXPUNGEMENT_TRACK = "oh_2953_32_expungement";
export const OH_NONCONVICTION_TRACK = "oh_2953_33_nonconviction";
export const OH_FIREARM_TRACK = "oh_2953_35_firearm";

/** The four clean tracks, as a closed list. */
export const OH_ASSIGNED_TRACK_IDS: readonly string[] = [
  OH_SEALING_TRACK,
  OH_EXPUNGEMENT_TRACK,
  OH_NONCONVICTION_TRACK,
  OH_FIREARM_TRACK
];

/**
 * The track the captain split out of this assignment.
 *
 * Recorded so that a reader can see it was excluded deliberately rather than
 * forgotten, and so a verifier can assert that no document mentions it.
 */
export const OH_EXCLUDED_TRACK_ID = "oh_marijuana_expungement";

/** The components this lane does not implement, on every one of the four tracks. */
export const OH_EXCLUDED_COMPONENTS: readonly {
  componentIdSuffix: string;
  role: string;
  strategy: string;
}[] = [
  { componentIdSuffix: "-local-form-instructions-2", role: "local_form_instructions", strategy: "process_guidance" },
  { componentIdSuffix: "-record-gathering-instructions-3", role: "record_gathering_instructions", strategy: "process_guidance" },
  { componentIdSuffix: "-hearing-and-objection-instructions-4", role: "hearing_and_objection_instructions", strategy: "process_guidance" },
  { componentIdSuffix: "-bci-transmission-5", role: "bci_transmission", strategy: "official_pdf_fill" }
];

export const OH_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

export const OH_YES_NO_UNSURE: Readonly<Record<string, "yes" | "no" | "unsure">> = {
  yes: "yes",
  no: "no",
  unsure: "unsure"
};

/** How a non-conviction case ended. Each has its own timing rule. */
export const OH_DISPOSITION_TYPES: Readonly<Record<string, string>> = {
  not_guilty: "a finding of not guilty by a jury or by the court",
  dismissed: "a dismissal of the complaint, indictment or information",
  no_bill: "a no bill entered by a grand jury",
  pardon: "a pardon",
  unsure: "unsure"
};

/** With or without prejudice, which decides whether the route is open at all. */
export const OH_DISMISSAL_PREJUDICE: Readonly<Record<string, string>> = {
  with_prejudice: "with prejudice",
  without_prejudice: "without prejudice",
  not_a_dismissal: "not a dismissal",
  unsure: "unsure"
};

/** The election this packet never makes for the participant. */
export const OH_REMEDY_CHOICES: Readonly<Record<string, string>> = {
  sealing: "sealing",
  expungement: "expungement",
  undecided: "undecided"
};

/**
 * The declared participant-input keys, per track.
 *
 * `resolvePacket` checks every declared key against the fact bag, so each is
 * echoed into the derived facts even where no template prints it. Listed here
 * so the echo cannot drift from the declaration.
 */
export const OH_TRACK_INPUT_KEYS: Readonly<Record<string, readonly string[]>> = {
  [OH_SEALING_TRACK]: [
    "slsFullLegalName",
    "slsDateOfBirth",
    "slsCourt",
    "slsCaseNumber",
    "slsOffenceDetails",
    "slsFinalDischarge",
    "slsCourtCostsOnly",
    "slsAllChargesFromIncident",
    "slsOtherConvictions",
    "slsRegistrationHistory",
    "slsExclusionScreen",
    "slsPendingProceedings",
    "slsOutOfState",
    "slsIndigent"
  ],
  [OH_EXPUNGEMENT_TRACK]: [
    "expFullLegalName",
    "expDateOfBirth",
    "expCourt",
    "expCaseNumber",
    "expOffenceDetails",
    "expFinalDischarge",
    "expCourtCostsOnly",
    "expAllChargesFromIncident",
    "expOtherConvictions",
    "expRegistrationHistory",
    "expExclusionScreen",
    "expPendingProceedings",
    "expOutOfState",
    "expIndigent"
  ],
  [OH_NONCONVICTION_TRACK]: [
    "ncvFullLegalName",
    "ncvDateOfBirth",
    "ncvCourt",
    "ncvCaseNumber",
    "ncvOffenceDetails",
    "ncvAllChargesFromIncident",
    "ncvPendingProceedings",
    "ncvOtherOhioCases",
    "ncvDispositionType",
    "ncvDismissalPrejudice",
    "ncvNoBillDate",
    "ncvRemedyChoice"
  ],
  [OH_FIREARM_TRACK]: [
    "frmFullLegalName",
    "frmDateOfBirth",
    "frmCourt",
    "frmCaseNumber",
    "frmOffenceDetails",
    "frmConduct",
    "frmLicensee",
    "frmAllChargesFromIncident",
    "frmIndigent"
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
    throw new OhioEligibilityStopError(
      "oh-answer-missing",
      trackId,
      `The answer to "${key}" is needed before this application can be drafted, and it has not been given. Nothing in this packet is written from an assumption about a participant's own case.`,
      OH_COURT_RECORD_REFERRAL,
      "Answer the question from your own court record and run the packet again."
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
    throw new OhioBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

/** The same validation returning the answer's own key, for branch predicates. */
const branchKey = (
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, unknown>>
): string => {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new OhioBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return normalized;
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), OH_YES_NO);

const yesNoUnsure = (trackId: string, answers: Answers, key: string): "yes" | "no" | "unsure" =>
  branch(trackId, key, need(trackId, answers, key), OH_YES_NO_UNSURE);

function echoInputs(trackId: string, answers: Answers): Record<string, string> {
  const echoed: Record<string, string> = {};
  for (const key of OH_TRACK_INPUT_KEYS[trackId] ?? []) echoed[key] = str(answers, key);
  return echoed;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

/**
 * The two screens every one of the four routes shares.
 *
 * ORC 2953.35 declares no pending-proceedings question — the design carries it
 * there as a printed self-help boundary rather than as an input — so on that
 * route the answer is read only if it is volunteered. An undeclared answer may
 * stop the route; it may never be relied on to conclude that nothing is
 * pending, which is why the boundary is printed on the face of the document
 * either way.
 */
function screenCommon(trackId: string, answers: Answers, prefix: string): void {
  const pendingDeclared = (OH_TRACK_INPUT_KEYS[trackId] ?? []).includes(`${prefix}PendingProceedings`);
  const pendingVolunteered = str(answers, `${prefix}PendingProceedings`);
  if (pendingDeclared || pendingVolunteered) {
    if (yesNo(trackId, answers, `${prefix}PendingProceedings`)) {
      throw new OhioEligibilityStopError(
        "oh-pending-proceedings",
        trackId,
        "A criminal case is pending somewhere, or a warrant is open. An application filed while a case is pending asks the court to act on a record that is still moving, and the pendency is itself a ground of refusal.",
        OH_LAWYER_REFERRAL,
        "Resolve the pending matter first, and take the docket to one of those offices if you are not sure it is resolved."
      );
    }
  }
  const incident = need(trackId, answers, `${prefix}AllChargesFromIncident`);
  if (/different|separate|convicted|guilty|pending|not (all|every)/i.test(incident)) {
    throw new OhioEligibilityStopError(
      "oh-2953-61-multiple-dispositions",
      trackId,
      "The incident produced more than one charge and they did not all end the same way. ORC 2953.61 governs that situation and it changes when, and whether, anything can be sealed or expunged; drafting one application as though the incident produced one disposition would misstate the record.",
      OH_LAWYER_REFERRAL,
      "Take the full docket for the incident to one of those offices before filing anything."
    );
  }
}

/** The exclusion screen the two ORC 2953.32 routes share. */
function screenConvictionExclusions(trackId: string, answers: Answers, prefix: string): void {
  const exclusion = yesNoUnsure(trackId, answers, `${prefix}ExclusionScreen`);
  if (exclusion !== "no") {
    throw new OhioEligibilityStopError(
      "oh-2953-32-excluded-offence",
      trackId,
      exclusion === "yes"
        ? "The offence is one ORC 2953.32 excludes: a traffic or motor-vehicle chapter offence including OVI, a felony offence of violence, a sexually oriented offence, an offence where the victim was under thirteen, theft in office, or first or second degree domestic violence. The exclusion is on the face of the section."
        : "Whether the offence is one ORC 2953.32 excludes has not been established. The section's own text was not read at source in the controlling design, so this route screens hard and stops rather than certifying that an exclusion does not apply.",
      OH_LAWYER_REFERRAL,
      "Take the charging document and the judgment entry to one of those offices and ask whether the section reaches this offence."
    );
  }
  if (yesNo(trackId, answers, `${prefix}RegistrationHistory`)) {
    throw new OhioEligibilityStopError(
      "oh-2953-32-registration-history",
      trackId,
      "There is a history of registration under Chapter 2950. That is outside this route.",
      OH_LAWYER_REFERRAL,
      "Ask one of those offices whether any Ohio relief reaches a record with a registration history."
    );
  }
  if (yesNo(trackId, answers, `${prefix}OutOfState`)) {
    throw new OhioEligibilityStopError(
      "oh-2953-32-out-of-state-venue",
      trackId,
      "An out-of-state or federal conviction is to be cleared. That moves the venue to a court of common pleas rather than the sentencing court, and it is a different application in a different court from the one this packet is captioned for.",
      OH_LAWYER_REFERRAL,
      "Ask one of those offices which common pleas court takes the application, before anything is filed."
    );
  }
  const others = need(trackId, answers, `${prefix}OtherConvictions`);
  if (/third degree|f3|felony of the third/i.test(others)) {
    throw new OhioEligibilityStopError(
      "oh-2953-32-third-degree-counting-rule",
      trackId,
      "There is more than one third degree felony in the history. The exact terms of the third-degree-felony counting rule, which decides whether a person with more than one is barred, are an open question in the controlling design, so this route stops rather than guessing which way the rule runs.",
      OH_LAWYER_REFERRAL,
      "Take the full conviction history to one of those offices and ask how the counting rule applies."
    );
  }
}

/** The election this packet never makes. */
function screenRemedyElection(trackId: string, answers: Answers, key: string): string {
  const choice = branchKey(trackId, key, need(trackId, answers, key), OH_REMEDY_CHOICES);
  if (choice === "undecided") {
    throw new OhioEligibilityStopError(
      "oh-remedy-election-not-made",
      trackId,
      "Whether to ask for sealing or for expungement has not been decided. Ohio treats them as different remedies with different waiting periods and different exclusions, and the choice is a legal judgment about which is better for this record. This packet does not make it, and it does not default to one.",
      OH_REMEDY_CHOICE_REFERRAL,
      "Get advice on which remedy fits this record, then run the packet again with the answer."
    );
  }
  return choice;
}

// ---------------------------------------------------------------------------
// Derived facts
// ---------------------------------------------------------------------------

const CONTENT_NOT_A_FORM =
  "Ohio publishes no statewide mandatory sealing or expungement packet. Applications are obtained from the court where the charge was filed, and courts commonly maintain different packets for convictions and non-convictions. What follows is the content the statute prescribes, drafted so that it can be transcribed onto, or filed with, that court's own application. It is NOT that court's form and it is not a substitute for one.";

const NOT_ASSERTED =
  "This application does not say that the applicant is entitled to the relief. It does not say that the prosecutor has not objected or will not object; nothing has been obtained from that office, and the prosecutor may object. It does not say that any hearing has been held, that any finding has been made, or that any order has been entered. Nobody at LegalEase has read the court file, the docket or any record in this matter.";

const NO_PERIOD_COMPUTED =
  "This application states no waiting period as having run, and it computes none. The applicant states the dates from their own record and the court applies the statute to them.";

const FEE_BOUNDARY =
  "This application prints no amount. ORC 2953.32 provides for an application fee and for it to be excused where the applicant is indigent; ask the clerk of the court you are filing in what the fee is now and what that court wants to see in support of excusing it.";

export function deriveOhioFacts(trackId: string, answers: Answers): Record<string, string> {
  if (!OH_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new OhioBranchError(trackId, "trackId", trackId, OH_ASSIGNED_TRACK_IDS);
  }

  const shared = {
    ohContentNotAForm: CONTENT_NOT_A_FORM,
    ohNotAssertedStatement: NOT_ASSERTED,
    ohNoPeriodStatement: NO_PERIOD_COMPUTED,
    ohFeeStatement: FEE_BOUNDARY,
    ohLocalFormReferral: OH_LOCAL_FORM_REFERRAL,
    ohReferralLine: OH_LAWYER_REFERRAL
  };

  switch (trackId) {
    case OH_SEALING_TRACK:
    case OH_EXPUNGEMENT_TRACK: {
      const isExpungement = trackId === OH_EXPUNGEMENT_TRACK;
      const prefix = isExpungement ? "exp" : "sls";
      screenCommon(trackId, answers, prefix);
      screenConvictionExclusions(trackId, answers, prefix);

      const name = need(trackId, answers, `${prefix}FullLegalName`);
      const dob = need(trackId, answers, `${prefix}DateOfBirth`);
      const court = need(trackId, answers, `${prefix}Court`);
      const caseNumber = need(trackId, answers, `${prefix}CaseNumber`);
      const offence = need(trackId, answers, `${prefix}OffenceDetails`);
      const discharge = need(trackId, answers, `${prefix}FinalDischarge`);
      const costsOnly = yesNo(trackId, answers, `${prefix}CourtCostsOnly`);
      const indigent = yesNo(trackId, answers, `${prefix}Indigent`);

      return {
        ...echoInputs(trackId, answers),
        ...shared,
        ohRemedy: isExpungement ? "expungement" : "sealing",
        ohSectionCitation: "ORC 2953.32",
        ohTitleRemedy: isExpungement ? "EXPUNGE" : "SEAL",
        ohCourtLine: court.toUpperCase(),
        ohCourtName: court,
        ohApplicantName: name,
        ohApplicantDob: dob,
        ohCaseNumber: caseNumber,
        ohIdentityStatement: `The applicant is ${name}, born ${dob}.`,
        ohCaseStatement: `The case is ${caseNumber} in ${court}.`,
        ohOffenceStatement: `The applicant states the offence as: ${offence}`,
        ohDischargeStatement: `The applicant states that final discharge, including any parole and the payment of all fines and restitution, was completed as: ${discharge}`,
        ohCostsStatement: costsOnly
          ? "The applicant states that court costs remain outstanding, but that no fine and no restitution does. ORC 2953.32 was reorganized by Senate Bill 288, and whether outstanding court costs alone prevent an application is a question for the court on this record; it is stated here rather than argued."
          : "The applicant states that no court costs, fine or restitution remain outstanding.",
        ohIndigentStatement: indigent
          ? "The applicant asks the court to excuse the application fee on the ground of indigency, and will provide whatever that court requires in support."
          : "The applicant does not ask for the application fee to be excused.",
        ohReliefRequested: isExpungement
          ? "The applicant asks the court to expunge the record of the conviction identified above under ORC 2953.32."
          : "The applicant asks the court to seal the record of the conviction identified above under ORC 2953.32.",
        // The compound clock is stated as a rule, never applied.
        ohWaitingRuleStatement: isExpungement
          ? "ORC 2953.32 measures the expungement wait for a felony as ten years from the date the person first becomes eligible to apply for SEALING of that felony, and not ten years from final discharge. That is a compound calculation, and this application does not perform it: the applicant states the dates and the court applies the rule."
          : "ORC 2953.32 measures the sealing wait from final discharge, and the length depends on the degree of the offence. This application does not compute it: the applicant states the dates and the court applies the rule.",
        ohStructuralNote:
          "Senate Bill 288, effective April 4, 2023, modified and reorganized Ohio's sealing and expungement law and removed the former \"eligible offender\" definition and its numeric cap. Any expectation formed under pre-2023 Ohio law about how many records a person may clear does not survive that reorganization.",
        ohSplitNote: isExpungement
          ? "Sealing and expungement are different remedies with different waits and different exclusions. Third and fourth degree misdemeanour domestic violence under ORC 2919.25, and protection order violations under ORC 2919.27 or a substantially similar municipal ordinance, are sealable but not expungeable. That split is easy to miss."
          : "Sealing and expungement are different remedies with different waits and different exclusions. This application asks for sealing, which restricts access to the record; expungement, which deletes it, is a separate request with its own conditions.",
        packetCaseReference: caseNumber
      };
    }

    case OH_NONCONVICTION_TRACK: {
      screenCommon(trackId, answers, "ncv");
      const remedy = screenRemedyElection(trackId, answers, "ncvRemedyChoice");

      const disposition = branchKey(
        trackId,
        "ncvDispositionType",
        need(trackId, answers, "ncvDispositionType"),
        OH_DISPOSITION_TYPES
      );
      if (disposition === "unsure") {
        throw new OhioEligibilityStopError(
          "oh-2953-33-disposition-not-established",
          trackId,
          "How the case ended has not been established. ORC 2953.33 opens on a finding of not guilty, a dismissal, a grand jury no bill or a pardon, and each of those has its own timing rule, so the route cannot be drafted without knowing which it was.",
          OH_COURT_RECORD_REFERRAL,
          "Read the disposition off the journal entry, or ask the clerk, and run the packet again."
        );
      }

      const prejudice = branchKey(
        trackId,
        "ncvDismissalPrejudice",
        need(trackId, answers, "ncvDismissalPrejudice"),
        OH_DISMISSAL_PREJUDICE
      );
      if (disposition === "dismissed" && prejudice !== "with_prejudice") {
        throw new OhioEligibilityStopError(
          "oh-2953-33-dismissal-without-prejudice",
          trackId,
          prejudice === "without_prejudice"
            ? "The case was dismissed without prejudice, and the limitations period has not been shown to have expired. A record that can still be refiled is not ready to be sealed, and telling this applicant their record can be cleared would be wrong."
            : "Whether the dismissal was with or without prejudice has not been established. It decides whether this route is open at all, and the journal entry says which it was.",
          prejudice === "without_prejudice" ? OH_LAWYER_REFERRAL : OH_COURT_RECORD_REFERRAL,
          prejudice === "without_prejudice"
            ? "Ask one of those offices when the limitations period expires for this charge."
            : "Read the dismissal entry, or ask the clerk, and run the packet again."
        );
      }

      const name = need(trackId, answers, "ncvFullLegalName");
      const dob = need(trackId, answers, "ncvDateOfBirth");
      const court = need(trackId, answers, "ncvCourt");
      const caseNumber = need(trackId, answers, "ncvCaseNumber");
      const offence = need(trackId, answers, "ncvOffenceDetails");
      const noBillDate = str(answers, "ncvNoBillDate");
      if (disposition === "no_bill" && !noBillDate) {
        throw new OhioEligibilityStopError(
          "oh-2953-33-no-bill-date-not-established",
          trackId,
          "A grand jury returned a no bill and the date it was reported has not been given. The no-bill route runs two years from the date the foreperson or deputy foreperson reported it, so that date is the one the timing turns on.",
          OH_COURT_RECORD_REFERRAL,
          "Ask the clerk for the date the no bill was reported and run the packet again."
        );
      }

      return {
        ...echoInputs(trackId, answers),
        ...shared,
        ohRemedy: remedy,
        ohSectionCitation: "ORC 2953.33",
        ohTitleRemedy: remedy === "expungement" ? "EXPUNGE" : "SEAL",
        ohCourtLine: court.toUpperCase(),
        ohCourtName: court,
        ohApplicantName: name,
        ohApplicantDob: dob,
        ohCaseNumber: caseNumber,
        ohIdentityStatement: `The applicant is ${name}, born ${dob}.`,
        ohCaseStatement: `The case is ${caseNumber} in ${court}.`,
        ohOffenceStatement: `The applicant states the charge as: ${offence}`,
        ohDispositionStatement: `The applicant states that the case ended in ${OH_DISPOSITION_TYPES[disposition]}.`,
        ohTimingStatement:
          disposition === "no_bill"
            ? `ORC 2953.33 permits the application two years after the date the foreperson or deputy foreperson reported the no bill to the court. The applicant states that date as ${noBillDate}. This application does not say that the two years have run; the court computes it.`
            : disposition === "not_guilty"
              ? "ORC 2953.33 permits the application at any time after the finding of not guilty is entered upon the minutes of the court or the journal, whichever entry occurs first. No period runs before it."
              : disposition === "dismissed"
                ? "ORC 2953.33 permits the application at any time after the dismissal is entered upon the minutes or the journal, whichever occurs first. No period runs before it."
                : "The application follows the pardon. The applicant states the pardon from their own record; nothing here is obtained from the Governor's office.",
        ohPrejudiceStatement:
          disposition === "dismissed"
            ? "The applicant states that the dismissal was with prejudice."
            : "This is not a dismissal route, so no question of prejudice arises on it.",
        ohDivisionCNote:
          "ORC 2953.33 division (C) limits which records may be EXPUNGED as opposed to sealed. Its text was not read at source in the controlling design, so this application does not assert that the record qualifies for expungement rather than sealing; it asks for the remedy the applicant chose and leaves the division (C) question to the court.",
        ohWaitingRuleStatement:
          "The timing rule for this disposition is stated above. This application does not apply it.",
        ohSplitNote:
          "Sealing restricts access to the record. Expungement deletes it. They are different remedies and the applicant has chosen between them; this packet did not choose.",
        packetCaseReference: caseNumber
      };
    }

    case OH_FIREARM_TRACK: {
      screenCommon(trackId, answers, "frm");
      const conduct = need(trackId, answers, "frmConduct");
      const licensee = yesNoUnsure(trackId, answers, "frmLicensee");
      if (licensee !== "yes") {
        throw new OhioEligibilityStopError(
          "oh-2953-35-not-a-licensee",
          trackId,
          licensee === "no"
            ? "The applicant did not hold a concealed handgun licence at the time. ORC 2953.35 reaches convictions under the obsolete notification requirement, which applied to licensees; a firearm conviction outside that is not reached by this section."
            : "Whether the applicant held a concealed handgun licence at the time has not been established. The obsolete notification requirement applied to licensees, so the answer decides whether this section reaches the conviction.",
          licensee === "no" ? OH_LAWYER_REFERRAL : OH_COURT_RECORD_REFERRAL,
          licensee === "no"
            ? "Ask one of those offices what reaches a firearm conviction outside the notification offence."
            : "Check your own licence record and the charging document, and run the packet again."
        );
      }
      if (!/notif|inform|disclos|announce|tell/i.test(conduct)) {
        throw new OhioEligibilityStopError(
          "oh-2953-35-not-the-notification-offence",
          trackId,
          "What the applicant describes is not the obsolete concealed-handgun notification offence. This is NOT a general firearm expungement: it is tied to specific former versions of ORC 2923.16 and ORC 2923.12 and to the notification language they carried, and any other firearm conviction is outside it.",
          OH_LAWYER_REFERRAL,
          "Take the charging document to one of those offices and ask which section and which version it was brought under."
        );
      }

      const name = need(trackId, answers, "frmFullLegalName");
      const dob = need(trackId, answers, "frmDateOfBirth");
      const court = need(trackId, answers, "frmCourt");
      const caseNumber = need(trackId, answers, "frmCaseNumber");
      const offence = need(trackId, answers, "frmOffenceDetails");
      const indigent = yesNo(trackId, answers, "frmIndigent");

      return {
        ...echoInputs(trackId, answers),
        ...shared,
        ohRemedy: "expungement",
        ohSectionCitation: "ORC 2953.35",
        ohTitleRemedy: "EXPUNGE",
        ohCourtLine: court.toUpperCase(),
        ohCourtName: court,
        ohApplicantName: name,
        ohApplicantDob: dob,
        ohCaseNumber: caseNumber,
        ohIdentityStatement: `The applicant is ${name}, born ${dob}.`,
        ohCaseStatement: `The case is ${caseNumber} in ${court}.`,
        ohOffenceStatement: `The applicant states the conviction as: ${offence}`,
        ohConductStatement: `The applicant states what they were accused of doing as: ${conduct}`,
        ohLicenceStatement:
          "The applicant states that they held a concealed handgun licence at the time.",
        ohObsolescenceStatement:
          "ORC 2953.35 reaches a conviction under the concealed-handgun notification requirement that has since been repealed. The applicant states the conduct above so that the court can see whether it would still violate the provision. Whether it would is the court's finding, and this application asks the court to make it rather than asserting it.",
        ohNarrownessStatement:
          "This is not a general firearm expungement. It is tied to specific former statutory versions and to their notification language, and any other firearm conviction is outside it.",
        ohVersionQuestionStatement:
          "Which former version of ORC 2923.16 or ORC 2923.12 applied, and whether the September 30, 2011 date some Ohio guides state is a statutory cutoff or a practical one, are not settled in the controlling design. This application states the conviction date rather than asserting that a cutoff is met.",
        ohIndigentStatement: indigent
          ? "The applicant asks the court to excuse the application fee on the ground of indigency, and will provide whatever that court requires in support."
          : "The applicant does not ask for the application fee to be excused.",
        ohWaitingRuleStatement:
          "The controlling design states no waiting period for this section beyond the obsolescence of the conduct. This application states none and computes none.",
        ohSplitNote:
          "This section provides expungement. It is narrow, and it does not reach a firearm conviction of any other kind.",
        packetCaseReference: caseNumber
      };
    }

    default:
      throw new OhioBranchError(trackId, "trackId", trackId, OH_ASSIGNED_TRACK_IDS);
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type Section = { heading?: string; numbered?: boolean; paragraphs: readonly string[] };

const CAPTION_LEFT: readonly string[] = [
  "STATE OF OHIO,",
  "",
  "Plaintiff,",
  "",
  "vs.",
  "",
  "{{ohApplicantName}},",
  "",
  "Defendant/Applicant."
];

const WHAT_THIS_IS_SECTION: Section = {
  heading: "WHAT THIS DOCUMENT IS, AND WHAT IT IS NOT",
  numbered: false,
  paragraphs: [
    "{{ohContentNotAForm}}",
    "Get your court's own application from its clerk. {{ohLocalFormReferral}}",
    "Where that court publishes an application, put this content on it or file this with it. Where it publishes none, this content is what the statute requires the application to say."
  ]
};

const NOT_ASSERTED_SECTION: Section = {
  heading: "WHAT THIS APPLICATION DOES NOT SAY",
  numbered: false,
  paragraphs: ["{{ohNotAssertedStatement}}", "{{ohNoPeriodStatement}}", "{{ohSplitNote}}"]
};

const FEE_SECTION: Section = {
  heading: "THE FEE",
  numbered: false,
  paragraphs: ["{{ohFeeStatement}}", "{{ohIndigentStatement}}"]
};

const STOP_SECTION: Section = {
  heading: "WHERE THIS PACKET STOPS",
  numbered: false,
  paragraphs: [
    "LegalEase prepares documents from what the applicant says. It gives no legal advice, reads no record, decides no eligibility question and files nothing.",
    "An objection by the prosecutor, and any victim objection where one applies.",
    "Any incident that produced more than one charge with different dispositions, which ORC 2953.61 governs.",
    "Any pending criminal proceeding or open warrant, anywhere.",
    "Choosing between sealing and expungement, which is a legal judgment with different waits and different exclusions.",
    "Any immigration exposure, which an Ohio order does not resolve.",
    "Where any of these applies, speak to a lawyer before filing. {{ohReferralLine}}"
  ]
};

const VERIFICATION =
  "I am the applicant. I have read this document and the statements in it are mine and are true to the best of my knowledge. I understand that nobody at LegalEase has seen my records, decided whether I am eligible, obtained anything from the prosecutor, or given me legal advice, and that whether this record may be sealed or expunged is for the court to decide.";

const SIGNATURE_BLOCK: readonly string[] = [
  "",
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Date: ______________________________________",
  "",
  "Sign and date this by hand, in ink. Do not have it notarized unless the clerk of your court asks for that; if that clerk does, ask what form it wants.",
  "File it with the clerk of the court named above, on that court's own application where it publishes one, and keep a copy."
];

function applicationTemplate(spec: {
  trackId: string;
  title: string;
  captionRight: string;
  preamble: string;
  bodySections: readonly Section[];
  prayer: readonly string[];
}): PleadingTemplate {
  return {
    templateId: `${spec.trackId}-application`,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "IN THE {{ohCourtLine}}",
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: ["Case No. {{ohCaseNumber}}", "", spec.captionRight]
    },
    title: spec.title,
    preamble: spec.preamble,
    sections: [WHAT_THIS_IS_SECTION, ...spec.bodySections, NOT_ASSERTED_SECTION, FEE_SECTION, STOP_SECTION],
    prayer: spec.prayer,
    verification: VERIFICATION,
    signatureLabel: "Applicant, self-represented",
    signatureBlock: SIGNATURE_BLOCK
  };
}

const CONVICTION_BODY: readonly Section[] = [
  {
    heading: "I. THE APPLICANT AND THE CONVICTION",
    numbered: true,
    paragraphs: [
      "{{ohIdentityStatement}}",
      "{{ohCaseStatement}}",
      "{{ohOffenceStatement}}",
      "{{ohDischargeStatement}}",
      "{{ohCostsStatement}}"
    ]
  },
  {
    heading: "II. THE STATUTE AND THE TIMING",
    numbered: false,
    paragraphs: ["{{ohWaitingRuleStatement}}", "{{ohStructuralNote}}"]
  }
];

const SEALING_APPLICATION = applicationTemplate({
  trackId: OH_SEALING_TRACK,
  title: "APPLICATION TO SEAL A RECORD OF CONVICTION — ORC 2953.32",
  captionRight: "APPLICATION TO SEAL",
  preamble:
    "The applicant, appearing without a lawyer, applies under ORC 2953.32 to seal the record of the conviction identified below, and states as follows. LegalEase prepared this content from the applicant's own answers, has seen no court record, has decided nothing, represents nobody and has filed nothing.",
  bodySections: CONVICTION_BODY,
  prayer: [
    "{{ohReliefRequested}}",
    "Nothing in this application reports a decision by anyone. It asks."
  ]
});

const EXPUNGEMENT_APPLICATION = applicationTemplate({
  trackId: OH_EXPUNGEMENT_TRACK,
  title: "APPLICATION TO EXPUNGE A RECORD OF CONVICTION — ORC 2953.32",
  captionRight: "APPLICATION TO EXPUNGE",
  preamble:
    "The applicant, appearing without a lawyer, applies under ORC 2953.32 to expunge the record of the conviction identified below, and states as follows. LegalEase prepared this content from the applicant's own answers, has seen no court record, has decided nothing, represents nobody and has filed nothing.",
  bodySections: CONVICTION_BODY,
  prayer: [
    "{{ohReliefRequested}}",
    "Nothing in this application reports a decision by anyone. It asks."
  ]
});

const NONCONVICTION_APPLICATION = applicationTemplate({
  trackId: OH_NONCONVICTION_TRACK,
  title: "APPLICATION TO {{ohTitleRemedy}} A RECORD AFTER A NON-CONVICTION — ORC 2953.33",
  captionRight: "APPLICATION UNDER ORC 2953.33",
  preamble:
    "The applicant, appearing without a lawyer, applies under ORC 2953.33 in respect of a case that did not end in a conviction, and states as follows. LegalEase prepared this content from the applicant's own answers, has seen no court record, has decided nothing, represents nobody and has filed nothing.",
  bodySections: [
    {
      heading: "I. THE APPLICANT AND THE CASE",
      numbered: true,
      paragraphs: [
        "{{ohIdentityStatement}}",
        "{{ohCaseStatement}}",
        "{{ohOffenceStatement}}",
        "{{ohDispositionStatement}}",
        "{{ohPrejudiceStatement}}"
      ]
    },
    {
      heading: "II. THE TIMING RULE FOR THIS DISPOSITION",
      numbered: false,
      paragraphs: ["{{ohTimingStatement}}"]
    },
    {
      heading: "III. SEALING AND EXPUNGEMENT UNDER DIVISION (C)",
      numbered: false,
      paragraphs: ["{{ohDivisionCNote}}"]
    }
  ],
  prayer: [
    "The applicant asks the court for the relief identified in the caption above, under ORC 2953.33.",
    "Nothing in this application reports a decision by anyone. It asks."
  ]
});

const FIREARM_APPLICATION = applicationTemplate({
  trackId: OH_FIREARM_TRACK,
  title: "APPLICATION TO EXPUNGE A CONVICTION UNDER THE OBSOLETE NOTIFICATION LAW — ORC 2953.35",
  captionRight: "APPLICATION UNDER ORC 2953.35",
  preamble:
    "The applicant, appearing without a lawyer, applies under ORC 2953.35 to expunge a conviction under the concealed-handgun notification requirement that has since been repealed, and states as follows. LegalEase prepared this content from the applicant's own answers, has seen no court record, has decided nothing, represents nobody and has filed nothing.",
  bodySections: [
    {
      heading: "I. THE APPLICANT AND THE CONVICTION",
      numbered: true,
      paragraphs: [
        "{{ohIdentityStatement}}",
        "{{ohCaseStatement}}",
        "{{ohOffenceStatement}}",
        "{{ohLicenceStatement}}",
        "{{ohConductStatement}}"
      ]
    },
    {
      heading: "II. WHY THE SECTION REACHES THIS CONVICTION",
      numbered: false,
      paragraphs: ["{{ohObsolescenceStatement}}", "{{ohVersionQuestionStatement}}"]
    },
    {
      heading: "III. HOW NARROW THIS IS",
      numbered: false,
      paragraphs: ["{{ohNarrownessStatement}}", "{{ohWaitingRuleStatement}}"]
    }
  ],
  prayer: [
    "The applicant asks the court to expunge the conviction identified above under ORC 2953.35.",
    "Nothing in this application reports a decision by anyone. It asks."
  ]
});

export const OH_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [SEALING_APPLICATION.templateId]: SEALING_APPLICATION,
  [EXPUNGEMENT_APPLICATION.templateId]: EXPUNGEMENT_APPLICATION,
  [NONCONVICTION_APPLICATION.templateId]: NONCONVICTION_APPLICATION,
  [FIREARM_APPLICATION.templateId]: FIREARM_APPLICATION
};

// ---------------------------------------------------------------------------
// Packet sets and tracks
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Design role → engine role. One role on each of the four tracks. */
export const OH_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing"
};

function packetSet(trackId: string): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId: `${trackId}-primary-filing-1`,
        role: OH_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: `${trackId}-application`,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide",
        requirement: "required",
        order: 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      }
      // Components 2, 3 and 4 are process_guidance and component 5 is
      // official_pdf_fill. None belongs to this lane.
    ]
  };
}

const statuses = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

const CONVICTION_INPUTS = (prefix: string): readonly RequiredInput[] => [
  { key: `${prefix}FullLegalName`, label: "What is your full legal name, and have you used any other names?", required: true },
  { key: `${prefix}DateOfBirth`, label: "What is your date of birth?", required: true },
  { key: `${prefix}Court`, label: "Which Ohio court sentenced you, and in which county?", required: true },
  { key: `${prefix}CaseNumber`, label: "What is the case number?", required: true },
  {
    key: `${prefix}OffenceDetails`,
    label: "What was the offence called, which Revised Code section was cited, and what degree was it?",
    required: true
  },
  {
    key: `${prefix}FinalDischarge`,
    label: "When did you finish the sentence, including any parole, all fines and all restitution?",
    required: true
  },
  {
    key: `${prefix}CourtCostsOnly`,
    label: "Do you still owe court costs, as opposed to fines or restitution? Answer yes or no.",
    required: true
  },
  {
    key: `${prefix}AllChargesFromIncident`,
    label:
      "What every charge was that came out of the same incident, and how each one ended. Where they did not all end the same way, ORC 2953.61 governs and this packet stops.",
    required: true
  },
  {
    key: `${prefix}OtherConvictions`,
    label: "What other convictions do you have, in Ohio or anywhere else, with the degree and the date?",
    required: true
  },
  {
    key: `${prefix}RegistrationHistory`,
    label: "Have you ever had to register under Chapter 2950? Answer yes or no.",
    required: true
  },
  {
    key: `${prefix}ExclusionScreen`,
    label:
      "Was the offence a traffic or OVI matter, a felony of violence, a sexually oriented offence, an offence against a child under 13, theft in office, or first or second degree domestic violence? Answer yes, no or unsure.",
    required: true
  },
  {
    key: `${prefix}PendingProceedings`,
    label: "Is any criminal case pending against you now, anywhere? Answer yes or no.",
    required: true
  },
  {
    key: `${prefix}OutOfState`,
    label:
      "Do you have any out-of-state or federal convictions you want cleared? Answer yes or no. Those move the venue to a court of common pleas.",
    required: true
  },
  {
    key: `${prefix}Indigent`,
    label: "Do you need to ask the court to excuse the application fee? Answer yes or no.",
    required: true
  }
];

const NONCONVICTION_INPUTS: readonly RequiredInput[] = [
  { key: "ncvFullLegalName", label: "What is your full legal name, and have you used any other names?", required: true },
  { key: "ncvDateOfBirth", label: "What is your date of birth?", required: true },
  { key: "ncvCourt", label: "Which Ohio court handled the case, and in which county?", required: true },
  { key: "ncvCaseNumber", label: "What is the case number?", required: true },
  {
    key: "ncvOffenceDetails",
    label: "What was the charge called, which Revised Code section was cited, and on what date did it happen?",
    required: true
  },
  {
    key: "ncvAllChargesFromIncident",
    label: "What every charge was that came out of the same incident, and how each one ended.",
    required: true
  },
  { key: "ncvPendingProceedings", label: "Is any criminal case pending against you now, anywhere? Answer yes or no.", required: true },
  { key: "ncvOtherOhioCases", label: "What other Ohio cases do you have, in any court?", required: true },
  {
    key: "ncvDispositionType",
    label:
      "How did the case end? Answer not guilty, dismissed, no bill or pardon. Answer unsure if you do not know, and this packet will stop.",
    required: true
  },
  {
    key: "ncvDismissalPrejudice",
    label:
      "If it was dismissed, was it with prejudice or without prejudice? Answer with prejudice, without prejudice, not a dismissal, or unsure.",
    required: true
  },
  { key: "ncvNoBillDate", label: "If a grand jury returned a no bill, on what date was it reported?", required: false },
  {
    key: "ncvRemedyChoice",
    label:
      "Do you want the record sealed or expunged? Answer sealing, expungement or undecided. This packet does not choose for you and it does not default to one.",
    required: true
  }
];

const FIREARM_INPUTS: readonly RequiredInput[] = [
  { key: "frmFullLegalName", label: "What is your full legal name, and have you used any other names?", required: true },
  { key: "frmDateOfBirth", label: "What is your date of birth?", required: true },
  { key: "frmCourt", label: "Which Ohio court sentenced you, and in which county?", required: true },
  { key: "frmCaseNumber", label: "What is the case number?", required: true },
  { key: "frmOffenceDetails", label: "Which Revised Code section were you convicted under, and on what date?", required: true },
  { key: "frmConduct", label: "What were you actually accused of doing?", required: true },
  {
    key: "frmLicensee",
    label: "Did you hold a concealed handgun licence at the time? Answer yes, no or unsure.",
    required: true
  },
  {
    key: "frmAllChargesFromIncident",
    label: "What every charge was that came out of the same incident, and how each one ended.",
    required: true
  },
  { key: "frmIndigent", label: "Do you need to ask the court to excuse the fee? Answer yes or no.", required: true }
];

function ohioTrack(spec: {
  trackId: string;
  publicName: string;
  authority: string;
  mechanism: string;
  courtLevel: string;
  inputs: readonly RequiredInput[];
  packetName: string;
  packetTitle: string;
  deliverable: string;
  notes: string;
}): ReliefTrack {
  return {
    jurisdiction: "OH",
    trackId: spec.trackId,
    publicName: spec.publicName,
    mechanism: spec.mechanism,
    authority: spec.authority,
    recordTypes: spec.trackId === OH_NONCONVICTION_TRACK ? ["non_conviction_record"] : ["conviction_record"],
    dispositions: spec.trackId === OH_NONCONVICTION_TRACK ? ["not_guilty", "dismissed", "no_bill", "pardon"] : ["conviction"],
    courtLevel: spec.courtLevel,
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSet(spec.trackId),
    requiredInputs: spec.inputs,
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
    assembledPacketName: spec.packetName,
    assembledPacketTitle: spec.packetTitle,
    customerDeliverableDescription: spec.deliverable,
    notes: spec.notes
  };
}

const NO_FORM_NOTE =
  "Ohio publishes no statewide mandatory packet, so there is no form identity to fill: this lane drafts the content the statute prescribes and the participant puts it on their own court's application. The track becomes official_pdf_fill the moment a county form set is catalogued, and how many distinct local packets exist is a recorded open question rather than something this module guesses at.";

export const OH_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  ohioTrack({
    trackId: OH_SEALING_TRACK,
    publicName: "Seal an Ohio conviction record",
    authority: "ORC § 2953.32",
    mechanism: "application_to_seal_conviction_record",
    courtLevel: "the_sentencing_court",
    inputs: CONVICTION_INPUTS("sls"),
    packetName: "oh-2953-32-sealing-application",
    packetTitle: "Ohio application to seal a conviction record — ORC § 2953.32",
    deliverable:
      "The statutorily prescribed content of an ORC 2953.32 sealing application, drafted from the applicant's own answers for the applicant to put on their own court's application. Every exclusion the section carries is screened before anything is drafted, no waiting period is computed, no fee amount is printed, and the prosecutor's position is never stated.",
    notes: `${NO_FORM_NOTE} The section's own text was not read at source in the controlling design, which is why the exclusion screen stops rather than certifying, and why an unsure answer to it is treated as a stop.`
  }),
  ohioTrack({
    trackId: OH_EXPUNGEMENT_TRACK,
    publicName: "Expunge an Ohio conviction record",
    authority: "ORC § 2953.32",
    mechanism: "application_to_expunge_conviction_record",
    courtLevel: "the_sentencing_court",
    inputs: CONVICTION_INPUTS("exp"),
    packetName: "oh-2953-32-expungement-application",
    packetTitle: "Ohio application to expunge a conviction record — ORC § 2953.32",
    deliverable:
      "The statutorily prescribed content of an ORC 2953.32 expungement application, drafted from the applicant's own answers. The compound felony clock — ten years from the sealing eligibility date rather than from discharge — is stated as the rule the court applies, and this packet does not perform the calculation.",
    notes: `${NO_FORM_NOTE} The compound expungement clock is the controlling design's central instruction on this track, and it is stated rather than computed. Third and fourth degree misdemeanour domestic violence and protection-order violations are sealable but not expungeable, and that split is printed rather than left to be discovered.`
  }),
  ohioTrack({
    trackId: OH_NONCONVICTION_TRACK,
    publicName: "Clear an Ohio record that did not end in a conviction",
    authority: "ORC § 2953.33",
    mechanism: "application_after_non_conviction",
    courtLevel: "the_court_where_the_case_was_pending_dismissed_or_tried",
    inputs: NONCONVICTION_INPUTS,
    packetName: "oh-2953-33-nonconviction-application",
    packetTitle: "Ohio application after a non-conviction — ORC § 2953.33",
    deliverable:
      "The statutorily prescribed content of an ORC 2953.33 application after a finding of not guilty, a dismissal, a grand jury no bill or a pardon. Each disposition carries its own timing rule, printed as the rule rather than applied, and a dismissal without prejudice stops the route rather than producing a filing on a record that can still be refiled.",
    notes: `${NO_FORM_NOTE} ORC 2953.33 division (C) limits which records may be expunged rather than sealed and its text was not read at source, so this application asks for the remedy the applicant chose and leaves the division (C) question to the court. The controlling design directs that this track be built first and that ORC 2953.61 be screened before anything else, and both are done.`
  }),
  ohioTrack({
    trackId: OH_FIREARM_TRACK,
    publicName: "Expunge an Ohio conviction under the repealed concealed-handgun notification law",
    authority: "ORC § 2953.35",
    mechanism: "application_to_expunge_obsolete_notification_conviction",
    courtLevel: "the_sentencing_court",
    inputs: FIREARM_INPUTS,
    packetName: "oh-2953-35-firearm-application",
    packetTitle: "Ohio application to expunge an obsolete notification conviction — ORC § 2953.35",
    deliverable:
      "The statutorily prescribed content of an ORC 2953.35 application, which reaches only a conviction under the repealed concealed-handgun notification requirement. The applicant's account of the conduct is carried through so the court can decide whether it would still violate the provision; the packet does not decide it.",
    notes: `${NO_FORM_NOTE} The controlling design's warning is carried on the face of the document: this is not a general firearm expungement, and the failure mode is a participant who reads the name and expects it to reach a conviction it does not touch. Which former statutory version applied, and whether the September 30, 2011 date is a statutory cutoff, are unsettled, so the packet screens hard and states the conviction date rather than asserting a cutoff is met.`
  })
];
