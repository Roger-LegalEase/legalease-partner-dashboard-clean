// New Mexico process guidance — two cannabis routes, neither of which LegalEase
// files anything on.
//
// Two assigned tracks, both `process_guidance` in the adopted design:
//
//   - `nm_cannabis` is relief by operation of law plus an agency verification
//     procedure. Under NMSA 1978, Section 29-3A-8(A), where a person was
//     charged with a cannabis offence that is no longer a crime on 29 June
//     2021, or that would have resulted in a lesser offence had the Cannabis
//     Regulation Act been in effect, all public records held by a court or a
//     state or local agency relating to the arrest or conviction are
//     automatically expunged two years after the conviction date, or two years
//     after the arrest date where there was no conviction. For somebody under
//     eighteen at the time the records are retained for two years or until they
//     turn eighteen, whichever comes first, and are then expunged. Subsection
//     (B) requires the Administrative Office of the Courts to implement a
//     procedure for verifying whether that has happened and for requesting
//     expedited expungement where it has not, and subsection (D) makes the
//     request confidential.
//   - `nm_cannabis_sentence` is Section 29-3A-9, which is sentence relief
//     rather than record clearing: a facility notifies the court that a case
//     may be reopened, the court reopens and dismisses a legally invalid
//     sentence, and a person who has completed such a sentence is entitled to
//     dismissal and expungement or redesignation as a penalty assessment
//     citation. The design puts the whole track outside self-help scope —
//     detect, name, refer, and say that no fee or cost may be imposed.
//
// The most important thing this family carries, and the reason one of its six
// components exists at all: **the court route is gone.** Rule 1-077.1(A) NMRA
// now excepts cannabis records from the expungement rule, the former Section
// 29-3A-8 district court action at Rule 1-077.1(B)(4) was deleted, and Form
// 4-954 NMRA was withdrawn — all effective 31 December 2025. A participant who
// finds the New Mexico Judiciary's district "Steps to Filing" packets, which
// are dated rev. 1/28/22 and rev. 7/12/22 and still describe a district court
// petition, will believe a filing route exists. It does not.
//
// Two further things the design insists on:
//
//   - **Verify before doing anything.** The AOC procedure is verification
//     first. The commonest true answer is that the record is already gone, and
//     a participant who cannot find the case on the courts' search may be
//     looking at exactly that.
//   - **A mixed case is not automatically expunged.** Automatic expungement
//     under subsection (A) reaches public records involving *only* cannabis and
//     cannabis paraphernalia charges. Where the arrest or case also carried a
//     non-cannabis charge, the eligible cannabis charges are reached only
//     through the subsection (C) request to the AOC, and the non-cannabis
//     charges are a different track entirely. That is the design's one
//     conditional component and it renders only where the case is mixed.
//
// And what the design preserves, which no sheet here resolves: how the AOC
// procedure actually operates — how a request is submitted, what the AOC
// returns, how long it takes, and what a participant is told when a record is
// found ineligible; whether the stale Judiciary district packets have been
// withdrawn or reissued; whether automatic expungement has in fact been
// executed at scale; on the sentence track, what route remains for somebody
// never reached by the statutory sweep, whose dates passed in 2022 with no
// published procedure for asserting the subsection (C) entitlement now; and
// whether a Section 29-3A-9 dismissal needs a separate Section 29-3A-8 step.
//
// Nothing in this module generates the AOC's application. The design is
// explicit that it is the Administrative Office of the Courts' own online
// application and not a LegalEase output: this packet explains what the form
// asks for and helps the participant have those answers ready, and the
// participant makes the request. The committed verifier holds that line.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. New Mexico
// is not an enabled jurisdiction and this job does not enable one. The
// official-form petition tracks are other jobs and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** New Mexico legal help, named once so no stop is a dead end. */
const NM_LEGAL_HELP =
  "a New Mexico legal aid office, a New Mexico law school clinic, the lawyer referral service run by the State Bar of New Mexico, or a New Mexico attorney";

/** Said on both routes in this family. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes what the law does. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether your record qualifies.";

/** The design's first packet instruction: verify through the AOC first. */
const VERIFY_THROUGH_THE_AOC_FIRST =
  "Verification comes before everything else on this route. The expungement is automatic, so the first question is not what to file but whether it has already happened — and the Administrative Office of the Courts is the body required to answer that. Do not spend anything, and do not act on anybody's account of your record, before you have asked.";

/** The court route no longer exists. The reason a whole sheet exists. */
const THE_COURT_ROUTE_NO_LONGER_EXISTS =
  "There is no court petition on this route any more. Rule 1-077.1(A) NMRA now excepts cannabis records from the expungement rule, the former district court action at Rule 1-077.1(B)(4) was deleted, and Form 4-954 NMRA was withdrawn — all with effect from 31 December 2025. If you are told to file a petition to expunge a cannabis record, you are being told something that stopped being true.";

/** The AOC application is the AOC's own. LegalEase does not produce it. */
const THE_APPLICATION_IS_THE_AOCS_OWN =
  "One thing to be clear about before you read the next part. The Application for Expungement of Court Records involving Cannabis is the Administrative Office of the Courts' own application, published by the courts and submitted to them. LegalEase does not produce it, does not fill it in, does not sign it and does not send it. What this packet does is tell you what the application asks for so that you have your answers ready, and then step aside.";

/** Automatic expungement here means destruction, which is unusual. */
const THIS_ONE_IS_DESTRUCTION =
  "New Mexico expungement usually means sealing rather than destroying. Cannabis is one of the two exceptions: automatic expungement under this section requires the records to be destroyed. So where it has worked, there is genuinely nothing left to find — which is worth knowing, because not finding your case on a court search may be the answer rather than a problem.";

/** A mixed case is not automatically expunged. Stated on the main sheets too. */
const MIXED_CASES_ARE_NOT_AUTOMATIC =
  "Automatic expungement reaches public records involving only cannabis and cannabis paraphernalia charges. If the same arrest or the same case carried any other charge, the automatic route does not clear it, and the cannabis charges within it are reached only by asking the Administrative Office of the Courts under subsection (C).";

/** Confidentiality of the request. Worth saying: it is a real protection. */
const THE_REQUEST_IS_CONFIDENTIAL =
  "The request itself is protected. Section 29-3A-8(D) provides that a request made under this procedure is confidential and not subject to disclosure, so asking is not a way of drawing attention to the record.";

/** Nothing is filed in court on either route, and LegalEase generates nothing. */
const NOTHING_IS_FILED_IN_COURT =
  "Nothing is filed in court on this route, and LegalEase generates no petition, motion, application or request. Where the step belongs to a court or an agency and it has not happened, the answer is to verify, to ask, and then to get advice — not to file something that no longer exists.";

const NM_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge or destroy anything, and cannot make a court, a clerk, the Administrative Office of the Courts or any state or local agency act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been expunged. Only the Administrative Office of the Courts can tell you that, and you are the one who asks.",
  "LegalEase does not produce, complete, sign or submit the Administrative Office of the Courts' application, and does not collect, inspect or hold your identification.",
  "LegalEase has not contacted any court, clerk, agency or the Administrative Office of the Courts about your case, and has not filed anything for you.",
  "LegalEase cannot tell you how long the Administrative Office of the Courts takes to answer, or what it will say. No period on this page is a promise about your case."
];

const NM_CANNABIS_SOURCES: readonly string[] = [
  "House Bill 314, Laws 2023, Chapter 74, amending NMSA 1978, Section 29-3A-8, at nmlegis.gov, retrieved 6 August 2026.",
  "Rule 1-077.1 NMRA, expungement, approved by the Supreme Court on 31 October 2025 and effective 31 December 2025, excepting cannabis records from the rule and deleting the former Section 29-3A-8 district court action, at supremecourt.nmcourts.gov.",
  "Withdrawn Form 4-954 NMRA, petition to expunge arrest records and public records, marked withdrawn, approved 31 October 2025, at supremecourt.nmcourts.gov.",
  "Expungement, New Mexico Courts, Office of General Counsel, carrying the Application for Expungement of Court Records involving Cannabis, at nmcourts.gov, retrieved 6 August 2026.",
  "Cannabis Regulation Act, NMSA 1978, Sections 26-2C-1 to 26-2C-42."
];

const NM_SENTENCE_SOURCES: readonly string[] = [
  "NMSA 1978, Section 29-3A-9, dismissal of sentences, published by the New Mexico Supreme Court in its criminal record expungement handout, at supremecourt.nmcourts.gov, retrieved 6 August 2026.",
  "Senate Bill 2, Laws 2021 (1st Special Session), Chapter 3, Section 6, enacting the dismissal-of-sentences provision, at nmlegis.gov, retrieved 6 August 2026.",
  "Cannabis Regulation Act, NMSA 1978, Sections 26-2C-1 to 26-2C-42."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class NewMexicoGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NewMexicoGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different New Mexico route. */
export class NewMexicoRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NewMexicoRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class NewMexicoBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "NewMexicoBranchError";
  }
}

export const NM_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Only a New Mexico record is reached by either route. */
export const NM_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  new_mexico: true,
  another_state: false,
  federal: false,
  tribal: false,
  military: false
};

/** Whether the participant was, or is, in custody on the cannabis charge. */
export const NM_CUSTODY_STATUS: Readonly<Record<string, string>> = {
  never: "never_in_custody",
  formerly: "formerly_in_custody",
  currently: "currently_in_custody"
};

/** What the Administrative Office of the Courts came back with. */
export const NM_AOC_OUTCOME: Readonly<Record<string, string>> = {
  not_asked_yet: "not_asked_yet",
  already_expunged: "already_expunged",
  pending_or_no_answer: "pending_or_no_answer",
  not_expunged_and_not_eligible: "not_eligible"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new NewMexicoBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular offence is one that is no longer a crime under the Cannabis Regulation Act, or one that would have been a lesser offence had that Act been in force, is a legal judgment about the charge. This guidance explains the mechanism; it does not make that judgment, and it does not decide eligibility.";

const OUT_OF_JURISDICTION_STOP =
  "Section 29-3A-8 and Section 29-3A-9 reach New Mexico records. Neither reaches a record of another state, or a federal, tribal or military record, and no New Mexico expungement obliges any of those authorities to do anything.";

const NON_CITIZEN_STOP =
  "The New Mexico Judiciary's own expungement materials direct a person who is not a United States citizen to seek legal advice about the consequences of expungement before pursuing it. That direction is followed here rather than second-guessed: expungement can change what a record looks like in ways that matter for immigration, and the advice needs to come before the request.";

/**
 * Validates participant answers and routes to the correct New Mexico node.
 *
 * The order is the design's: the offence-classification boundary first, because
 * whether an offence is no longer a crime under the Cannabis Regulation Act is
 * the one judgment this family will not make; then record jurisdiction; then
 * citizenship, because the Judiciary's own materials put that advice before the
 * request rather than after it; then each route's own questions.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveNewMexicoGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. The offence-classification question is not one this family answers.
  const wantsAdvice = branch(
    trackId,
    "wantsOffenceClassificationAdvice",
    NM_YES_NO,
    facts.wantsOffenceClassificationAdvice
  );
  if (wantsAdvice.resolved) {
    throw new NewMexicoGuidanceStopError(
      trackId,
      "offence_classification_judgment_requested",
      ADVICE_STOP,
      NM_LEGAL_HELP,
      "Take the charging document or the docket, with the charge in the words the record uses, and ask whether that offence is one the Cannabis Regulation Act decriminalised or reduced."
    );
  }

  // Gate 2. Record jurisdiction, an exclusion on both tracks.
  const jurisdiction = branch(trackId, "recordJurisdiction", NM_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (!jurisdiction.resolved) {
    throw new NewMexicoRouteMismatchError(
      trackId,
      "record_is_not_a_new_mexico_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal, tribal or military authority that holds the record",
      "Take the record to that authority and ask what its own law provides for cannabis offences. If you also hold New Mexico records, those are handled separately and only those are served here."
    );
  }

  // Gate 3. The Judiciary's own direction to non-citizens, followed as given.
  const nonCitizen = branch(trackId, "isNotAUnitedStatesCitizen", NM_YES_NO, facts.isNotAUnitedStatesCitizen);
  if (nonCitizen.resolved) {
    throw new NewMexicoGuidanceStopError(
      trackId,
      "non_citizen_directed_to_legal_advice_first",
      NON_CITIZEN_STOP,
      "an immigration attorney, and otherwise " + NM_LEGAL_HELP,
      "Speak to an immigration attorney about what expungement of this record would and would not do for you, before you ask the Administrative Office of the Courts for anything."
    );
  }

  if (trackId === "nm_cannabis") {
    const custody = branch(trackId, "custodyOnThisCharge", NM_CUSTODY_STATUS, facts.custodyOnThisCharge);
    if (custody.resolved !== "never_in_custody") {
      throw new NewMexicoRouteMismatchError(
        trackId,
        "custody_on_the_cannabis_charge_belongs_to_the_sentence_route",
        "Somebody who is in custody now on a cannabis charge, or who has served a sentence on one, is in a different section. Section 29-3A-9 deals with reopening the case, dismissing a sentence that is legally invalid, and dismissal, expungement or redesignation for a person who has completed such a sentence. That is sentence relief, and it is not what this record-clearing section does.",
        "the New Mexico cannabis sentence and vacatur route under Section 29-3A-9",
        "Go back to the New Mexico intake and answer the questions for a cannabis sentence. Bring the judgment and sentence with you if you have it."
      );
    }

    const aoc = branch(trackId, "administrativeOfficeOutcome", NM_AOC_OUTCOME, facts.administrativeOfficeOutcome);
    if (aoc.resolved === "not_eligible") {
      throw new NewMexicoGuidanceStopError(
        trackId,
        "the_administrative_office_reports_the_record_not_expunged_and_not_eligible",
        "The Administrative Office of the Courts has come back and said the record was not expunged and is not eligible. That is an answer about the classification of the offence, which is exactly the judgment this guidance does not make. It is also not the end of the road: it is the point at which somebody needs to look at the charge itself.",
        NM_LEGAL_HELP,
        "Keep whatever the Administrative Office of the Courts told you, in writing if you have it, and take it with the charging document to somebody who can look at whether the offence really is outside the Cannabis Regulation Act."
      );
    }
    derived.administrativeOfficeOutcomeBranch = aoc.value;

    const stillShowing = branch(
      trackId,
      "agencyStillShowingAfterConfirmation",
      NM_YES_NO,
      facts.agencyStillShowingAfterConfirmation
    );
    if (stillShowing.resolved) {
      throw new NewMexicoGuidanceStopError(
        trackId,
        "an_agency_still_shows_the_charge_after_expungement_was_confirmed",
        "The Administrative Office of the Courts has confirmed the expungement and an agency is still showing the charge. What a person does about that is not settled here: the section requires the records to be expunged and destroyed, but no published procedure describes what happens when a particular agency has not done it, and this packet does not invent one.",
        "the agency that is still showing the record, and then " + NM_LEGAL_HELP,
        "Ask that agency in writing what its record shows and on what basis, keep the reply with the confirmation from the Administrative Office of the Courts, and take that pair to a lawyer."
      );
    }

    // The design's one conditional component. Not a stop: making it one would
    // mean the sheet the design commissioned for exactly this case never
    // renders.
    const mixed = branch(trackId, "mixedCannabisAndOtherCharges", NM_YES_NO, facts.mixedCannabisAndOtherCharges);
    derived.mixedCaseRoutingApplies = mixed.resolved;
    return derived;
  }

  if (trackId === "nm_cannabis_sentence") {
    const custody = branch(trackId, "custodyOnThisCharge", NM_CUSTODY_STATUS, facts.custodyOnThisCharge);
    if (custody.resolved === "never_in_custody") {
      throw new NewMexicoRouteMismatchError(
        trackId,
        "no_sentence_was_ever_served_on_this_charge",
        "Section 29-3A-9 is about sentences: reopening a case, dismissing a sentence that is legally invalid, and what follows for a person who has completed one. Where there was never a sentence and what you want is the record cleared, the automatic expungement section is the one that reaches it.",
        "the New Mexico cannabis record clearing route under Section 29-3A-8",
        "Go back to the New Mexico intake and answer the questions for clearing a cannabis record rather than for a sentence."
      );
    }
    if (custody.resolved === "currently_in_custody") {
      throw new NewMexicoGuidanceStopError(
        trackId,
        "currently_in_custody_on_the_cannabis_charge",
        "Where somebody is in custody now, the route the section describes runs through the facility and the court rather than through anything a person does on their own. The facility holding a person for a cannabis offence that is no longer a crime, or that would have been a lesser offence, was required to notify the court that the case may be reopened. That is a different kind of process from a self-help packet, and it is time-sensitive in a way this page cannot manage.",
        "the records or classification office at the facility, the attorney who represented you in the case, and " + NM_LEGAL_HELP,
        "Ask the facility whether the notification under Section 29-3A-9(A) has been made for your case, and get the question in front of a lawyer quickly rather than working through it alone."
      );
    }
    derived.custodyBranch = custody.value;

    const challenge = branch(trackId, "prosecutorChallenge", NM_YES_NO, facts.prosecutorChallenge);
    if (challenge.resolved) {
      throw new NewMexicoGuidanceStopError(
        trackId,
        "a_prosecutor_is_challenging_the_dismissal_expungement_or_redesignation",
        "A prosecutor challenge turns this into a contested matter about whether a conviction is legally invalid under the Cannabis Regulation Act. That is argument rather than paperwork, and nothing on a guidance page substitutes for somebody who can appear.",
        "the attorney who represented you in the case, and otherwise " + NM_LEGAL_HELP,
        "Take whatever the prosecutor has filed or said, together with the judgment and sentence, to somebody who can respond to it."
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
      "There is nothing for LegalEase to submit and nothing for it to file. No petition, motion or application is generated on this route.",
    fees: input.fees ?? "None. There is no filing on this route, so there is nothing on it to pay for.",
    feeWaiver: input.feeWaiver ?? "Not applicable. There is no fee to waive.",
    noticeOrService: input.noticeOrService ?? [
      "There is nobody for you to notify and nothing to serve. No party is served on this route.",
      "Nobody is required to write and tell you when an automatic expungement has happened, which is why this packet tells you to ask."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...NM_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want a judgment about whether the offence is one the Cannabis Regulation Act decriminalised or reduced.",
      "The record is from another state, or is a federal, tribal or military record.",
      "You are not a United States citizen.",
      ...input.escalations
    ],
    officialSourceReferences: input.sources
  };
}

/**
 * The two sections differ on fees and on notice, so neither is a family default.
 *
 * Section 29-3A-8 carries the confidentiality provision at subsection (D) and
 * the history of the deleted no-filing-fee provision; Section 29-3A-9 carries
 * its own no-fee-for-sentence-review rule and a set of notifications that are
 * somebody else's obligations. Rendering either set on the other route would
 * describe the wrong statute.
 */
const CANNABIS_RECORD_FEES =
  "None. The statute imposes no fee for the verification and expedited-request procedure, and there is no court filing to pay for. The former no-filing-fee provision at Rule 1-077.1(B)(4) NMRA was deleted along with the court action it applied to.";

const CANNABIS_RECORD_NOTICE: readonly string[] = [
  "There is nobody for you to notify and nothing to serve. No party is served on this route.",
  "Section 29-3A-8(D) makes a request under this procedure confidential and not subject to disclosure."
];

const SENTENCE_FEES =
  "No fee or cost may be imposed for sentence review under Section 29-3A-9. There is no filing generated here to pay for either.";

const SENTENCE_NOTICE: readonly string[] = [
  "There is nothing for you to serve and nobody for you to notify through this packet.",
  "The notifications this section contemplates belong to other people. The facility notifies the court under Section 29-3A-9(A), and the Department of Public Safety was to notify the corrections department, prosecutors and defence counsel of record about potentially eligible convictions."
];

function cannabisRecordSheet(input: SheetInput): GuidanceTemplate {
  return sheet({
    ...input,
    fees: input.fees ?? CANNABIS_RECORD_FEES,
    noticeOrService: input.noticeOrService ?? CANNABIS_RECORD_NOTICE
  });
}

function sentenceSheet(input: SheetInput): GuidanceTemplate {
  return sheet({
    ...input,
    fees: input.fees ?? SENTENCE_FEES,
    feeWaiver:
      input.feeWaiver ??
      "Not applicable. No fee or cost may be imposed for sentence review under this section, so there is nothing to waive.",
    noticeOrService: input.noticeOrService ?? SENTENCE_NOTICE
  });
}

const AOC = {
  name: "The New Mexico Administrative Office of the Courts",
  detail:
    "Section 29-3A-8(B) requires the Administrative Office of the Courts to run the procedure for verifying whether an automatic cannabis expungement has happened and for requesting an expedited one where it has not. It publishes its own Application for Expungement of Court Records involving Cannabis on the New Mexico Courts expungement page. LegalEase does not produce that application, does not submit it, and has not contacted the Administrative Office of the Courts about anything."
};

export const NEW_MEXICO_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- nm_cannabis ----------------------------------------------------------
  "nm-cannabis-verification-first": cannabisRecordSheet({
    templateId: "nm-cannabis-verification-first",
    mechanismName: "New Mexico cannabis records: what the law already did, and how to check",
    whyNotAFiling:
      "Nothing is filed in court and LegalEase generates no filing. Under NMSA 1978, Section 29-3A-8(A) the public records of an eligible cannabis arrest or conviction are automatically expunged by operation of law — two years after the conviction, or two years after the arrest where there was no conviction. There is no petition to bring, and since 31 December 2025 there is no court action on this section at all.",
    processType: "automatic",
    prerequisites: [
      "The record is a New Mexico cannabis arrest or conviction record.",
      "The charge was a cannabis or cannabis paraphernalia charge.",
      "You are prepared to check the position before acting on it."
    ],
    documentsToObtain: [
      "Case documentation for the cannabis charge, where you can still find it. Use the New Mexico Courts \"Find a Case\" search to locate the case, then ask the clerk for the docket sheet. If the record has already been expunged and destroyed you may not find it — and that is itself the answer you were looking for.",
      "Picture identification, which the Administrative Office of the Courts asks for with its own application. You supply it directly to them; LegalEase never collects, inspects or holds it."
    ],
    gather: [
      "Your full legal name, and any other name the record might be under.",
      "Your date of birth.",
      "The full case number of the cannabis case, and which court handled it, in which county.",
      "The date of the arrest, and the date of the conviction if there was one.",
      "Whether you were under eighteen at the time.",
      "The charge, in the words the record uses.",
      "Whether the same arrest or case included any charge that was not about cannabis or cannabis paraphernalia."
    ],
    destination: AOC,
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What the section does on its own. Where a person was charged with a cannabis offence that is no longer a crime as of 29 June 2021, or that would have resulted in a lesser offence had the Cannabis Regulation Act been in effect, all public records held by a court or by a state or local agency relating to that arrest or conviction are automatically expunged. Nobody has to ask for it.",
      "When. Two years after the date of the conviction, or two years after the date of the arrest where there was no conviction.",
      "If you were under eighteen at the time, the rule is different: the records are retained for two years or until you turn eighteen, whichever comes first, and are then automatically expunged.",
      THIS_ONE_IS_DESTRUCTION,
      VERIFY_THROUGH_THE_AOC_FIRST,
      "So the first practical step is to try to find the case yourself, using the New Mexico Courts case search. Not finding it is not proof of anything on its own, but it is a useful first signal.",
      "Then ask the Administrative Office of the Courts. The next sheet in this packet sets out what its application asks for so that you have the answers ready before you start.",
      THE_REQUEST_IS_CONFIDENTIAL,
      MIXED_CASES_ARE_NOT_AUTOMATIC,
      NOTHING_IS_FILED_IN_COURT
    ],
    expectedNextStage:
      "The next sheet is about the Administrative Office of the Courts' own application: what it asks for, and what this packet does and does not do about it.",
    canPrepare: [
      "This explanation of what the section does automatically and when.",
      "The list of what to have ready before you approach the Administrative Office of the Courts.",
      "The sheets that follow: what the application asks, the disclosure that the old court route is gone, what expungement here actually means, and what to do afterwards."
    ],
    escalations: [
      "You cannot tell whether the charge was a cannabis or paraphernalia charge.",
      "You were under eighteen at the time and cannot work out which rule applies.",
      "You are in custody now, or have served a sentence, on this cannabis charge."
    ],
    sources: NM_CANNABIS_SOURCES
  }),

  "nm-cannabis-aoc-application-instructions": cannabisRecordSheet({
    templateId: "nm-cannabis-aoc-application-instructions",
    mechanismName: "The Administrative Office of the Courts' application: what it asks, and who fills it in",
    whyNotAFiling:
      "This page explains somebody else's form. The Application for Expungement of Court Records involving Cannabis belongs to the Administrative Office of the Courts, and this packet neither produces it nor submits it. Nothing here is filed in court, and LegalEase generates no application.",
    processType: "agency",
    prerequisites: [
      "You have read the verification sheet before this one.",
      "You have your case details, or you have established that you cannot find the case.",
      "You have picture identification available to supply to the Administrative Office of the Courts."
    ],
    documentsToObtain: [
      "Picture identification, which you supply directly to the Administrative Office of the Courts.",
      "Case documentation for the cannabis charge, which the application takes as optional. If you cannot obtain it because the record is gone, that is worth saying in the request rather than treating as a failure."
    ],
    gather: [
      "Your full legal name, and any other name the record might be under.",
      "Your date of birth.",
      "The full case number. The application asks for it in full.",
      "The last four digits of your social security number, which the application asks for. Supply it to the Administrative Office of the Courts and to nobody else.",
      "Where the Administrative Office of the Courts should write to you, and how else to reach you."
    ],
    destination: AOC,
    sequence: [
      THE_APPLICATION_IS_THE_AOCS_OWN,
      "What the application asks for, so that nothing catches you out: your name, your date of birth, the full case number, the last four digits of your social security number, where to write to you, contact details, a picture ID, and case documentation if you have it.",
      "Two of those are worth a word each. The full case number is the item people most often do not have to hand, and it is on the docket sheet or in the courts' case search. The last four digits of a social security number are asked for by the Administrative Office of the Courts on its own form — you give them to that office, and no legitimate intermediary needs them.",
      "You complete and submit the application, and you supply the identification. That is not a limitation this packet is apologising for: it is the design of the procedure, and it keeps the request in your hands and out of anybody else's.",
      THE_REQUEST_IS_CONFIDENTIAL,
      "What the request can do is two things. It can verify whether the automatic expungement has already happened. And where it has not, it can ask for an expedited automatic expungement.",
      "Where the case carried both cannabis and non-cannabis charges, this same application is the route to the eligible cannabis charges. That situation has its own sheet in this packet.",
      "Now the honest limit, and it matters because it is about what happens after you send it. How the procedure operates in practice — what the Administrative Office of the Courts returns, how long it takes, and what you are told if a record is found not to be eligible — is not something this packet can tell you. The statute requires the procedure and the application exists; no published description of the response does.",
      "So do not read silence as a refusal, and do not assume a timescale. Keep a note of the date you submitted the request.",
      "And keep a copy of what you sent. There is no other copy of the record to fall back on if the expungement has worked, because this section requires the records to be destroyed, so your own file is the only history of the request that will exist.",
      NOTHING_IS_FILED_IN_COURT
    ],
    expectedNextStage:
      "The next sheet is the one to read before anybody sends you to a courthouse: the old court route no longer exists, and the materials describing it are still in circulation.",
    canPrepare: [
      "This account of what the Administrative Office of the Courts' application asks for.",
      "The list of answers to have ready before you start it.",
      "The statement of what the request can do, and of what is not known about how it is answered.",
      "The sheets that follow on the withdrawn court route, on what expungement means here, and on what to do afterwards."
    ],
    escalations: [
      "You cannot find the full case number anywhere.",
      "Somebody other than the Administrative Office of the Courts has asked you for your identification or your social security number for this.",
      "You submitted a request and have heard nothing, and something turns on the answer."
    ],
    sources: NM_CANNABIS_SOURCES
  }),

  "nm-cannabis-mixed-case-routing": cannabisRecordSheet({
    templateId: "nm-cannabis-mixed-case-routing",
    mechanismName: "Where the case had cannabis and non-cannabis charges together",
    whyNotAFiling:
      "This page is routing. Nothing on it is filed and LegalEase generates nothing for it. The cannabis charges in a mixed case are reached by asking the Administrative Office of the Courts under Section 29-3A-8(C); the rest of the case is a different route entirely.",
    processType: "agency",
    prerequisites: [
      "The same arrest, or the same case, carried at least one charge that was not about cannabis or cannabis paraphernalia.",
      "You have read the sheets before this one in the packet."
    ],
    documentsToObtain: [
      "The docket sheet for the case, showing every charge and how each one ended. On a mixed case this matters more than on any other, because the charges are treated separately."
    ],
    gather: [
      "Every charge on the case, in the words the record uses, and how each one ended.",
      "Which of them were cannabis or cannabis paraphernalia charges.",
      "The full case number, the court and the county."
    ],
    destination: AOC,
    sequence: [
      MIXED_CASES_ARE_NOT_AUTOMATIC,
      "So a mixed case has two halves and they go to different places. The eligible cannabis charges are reached by the request to the Administrative Office of the Courts under Section 29-3A-8(C). The non-cannabis charges are not reached by this section at all, and belong to whichever New Mexico route fits how they ended — the release-without-conviction route or the conviction route.",
      "That is worth being blunt about, because it is the single most common misunderstanding on this section: cannabis expungement does not clear the whole case just because a cannabis charge was in it.",
      "What follows practically. Get the docket sheet and list every charge with its disposition before you ask for anything. On a mixed case the list is the work.",
      "Then make the request to the Administrative Office of the Courts for the cannabis charges, using its own application, exactly as the previous sheet describes.",
      "And deal with the non-cannabis charges separately, on their own route. Doing them in the wrong order does no harm; assuming one covers the other does.",
      "One limit worth stating on this sheet in particular. What the Administrative Office of the Courts does with a mixed case, and how it reports back on the part it can reach, is not described in any published procedure. So expect an answer about the cannabis charges and check what it actually says about the rest.",
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_IS_FILED_IN_COURT
    ],
    expectedNextStage:
      "You leave this sheet with the two halves of the case separated, and with the cannabis half going to the Administrative Office of the Courts and the rest going to its own route.",
    canPrepare: [
      "This separation of the cannabis charges from the rest of the case.",
      "The list of what the docket sheet needs to show before you ask for anything.",
      "The statement of what is not known about how a mixed case is answered."
    ],
    escalations: [
      "You need to know what will and will not be reached before you decide whether it is worth asking.",
      "You cannot tell from the docket which charges were cannabis charges.",
      "The non-cannabis charges are the ones actually causing you the problem."
    ],
    sources: NM_CANNABIS_SOURCES
  }),

  "nm-cannabis-withdrawn-route-disclosure": cannabisRecordSheet({
    templateId: "nm-cannabis-withdrawn-route-disclosure",
    mechanismName: "The court petition for cannabis records no longer exists",
    whyNotAFiling:
      "This page exists to stop you filing something. There is no court action on this section any more, so nothing is filed and nothing is generated — and if you have been handed a petition form for this, it has been withdrawn.",
    processType: "automatic",
    prerequisites: [
      "You have read the sheets before this one in the packet.",
      "You may have been told, or may have found materials saying, that a petition has to be filed in district court."
    ],
    documentsToObtain: [
      "Nothing further for this sheet. It exists to tell you what not to do with something you may already have found."
    ],
    gather: [
      "Where you were told to file a petition, and when — a website, a packet, a person, a court counter.",
      "The date printed on any packet or form you were given, if there is one."
    ],
    destination: {
      name: "No destination. This sheet is a correction rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because the materials describing the old route are still in circulation, and following them costs a wasted trip at best."
    },
    sequence: [
      THE_COURT_ROUTE_NO_LONGER_EXISTS,
      "What that means in practice. Rule 1-077.1(A) NMRA excepts cannabis records from the expungement rule. The former Section 29-3A-8 district court action, at Rule 1-077.1(B)(4) NMRA, was deleted. Form 4-954 NMRA, the petition to expunge arrest records and public records, was withdrawn and is now marked as withdrawn. All of that took effect on 31 December 2025.",
      "Why you are being told this so directly. The New Mexico Judiciary's district \"Steps to Filing\" packets for cannabis expungement, dated rev. 1/28/22 and rev. 7/12/22, still describe a district court petition. Whether those packets have been withdrawn or reissued since Form 4-954 was withdrawn is not established here. A participant who finds one will reasonably believe a filing route exists.",
      "So if you are holding a packet that tells you to file a petition to expunge a cannabis record, check its date. If it predates 31 December 2025, it is describing a route that has been removed.",
      "The route that does exist is the one in this packet: the expungement happens by operation of law, and the Administrative Office of the Courts verifies it or expedites it.",
      "One more thing that went with the old action. There used to be an express no-filing-fee provision for it. That provision was deleted along with the action, which changes nothing about cost — because there is no filing to pay for — but it does mean that a reference to \"no filing fee for a Section 29-3A-8 action\" is describing something that no longer exists either.",
      "If a court counter tells you to file, ask them about Rule 1-077.1 as amended and about the withdrawal of Form 4-954. That is not a confrontation; the change is recent and not everybody will have caught up with it.",
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_IS_FILED_IN_COURT
    ],
    expectedNextStage:
      "You leave this sheet knowing not to file, knowing why materials telling you to file are still out there, and knowing which route is the live one.",
    canPrepare: [
      "This correction, with the rule and form changes and their effective date.",
      "The warning about the dated Judiciary packets still describing a petition.",
      "The account of what happened to the old no-filing-fee provision."
    ],
    escalations: [
      "A court counter or an organisation is telling you to file a petition for a cannabis record.",
      "You have already paid somebody to prepare a cannabis expungement petition.",
      "You have been given a form numbered 4-954."
    ],
    sources: NM_CANNABIS_SOURCES
  }),

  "nm-cannabis-effect-and-limits": cannabisRecordSheet({
    templateId: "nm-cannabis-effect-and-limits",
    mechanismName: "What cannabis expungement here actually does, and what it does not reach",
    whyNotAFiling:
      "This page explains the effect of a statute. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "automatic",
    prerequisites: [
      "You have read the sheets before this one in the packet.",
      "You want to know what this expungement is worth before you rely on it."
    ],
    documentsToObtain: [
      "Nothing further for this sheet."
    ],
    gather: [
      "Every application, licence or clearance you expect to be affected, and the exact wording of the question each one asks.",
      "Whether any federal, tribal, military or out-of-state record is also in play, because none of them is reached."
    ],
    destination: {
      name: "No destination. This sheet is an explanation rather than a step",
      detail:
        "Nothing here is sent anywhere. It is the part of the packet that says what the word means here, so that nobody relies on it for more than it carries."
    },
    sequence: [
      THIS_ONE_IS_DESTRUCTION,
      "What is reached: all public records held by a court or by a state or local agency relating to the eligible cannabis arrest or conviction.",
      "What is not reached, and this is the limit that matters most. A New Mexico expungement does not reach the record of another state, and it does not reach a federal, tribal or military record. No New Mexico order or operation of law obliges any of those authorities to do anything.",
      MIXED_CASES_ARE_NOT_AUTOMATIC,
      "So on a mixed case, the honest expectation is that the cannabis part can be cleared and the rest of the case remains exactly where it was.",
      "One thing nobody can tell you from a page. Whether the automatic expungement has in fact been carried out at scale is not established, which is precisely why the verification step exists and why this packet puts it first rather than last.",
      "The practical way to use all of this is to work backwards from the specific question you are being asked. What a particular application or licence is entitled to see is a more useful question than whether expungement is strong in the abstract.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "The last sheet in this packet is the follow-up checklist: what to do after you have asked, and what to do if the answer does not arrive or does not match.",
    canPrepare: [
      "This account of what the expungement reaches and of what it does not.",
      "The statement that destruction, not sealing, is what this section requires.",
      "The honest note that whether it has happened at scale is not established.",
      "The follow-up checklist that closes this packet."
    ],
    escalations: [
      "A specific employer or licensing body is the problem and you need to know what it is entitled to see.",
      "You also hold an out-of-state, federal or tribal cannabis record.",
      "You have been told the expungement clears everything everywhere."
    ],
    sources: NM_CANNABIS_SOURCES
  }),

  "nm-cannabis-followup-checklist": cannabisRecordSheet({
    templateId: "nm-cannabis-followup-checklist",
    mechanismName: "After you have asked: what to keep, what to watch, and what to do if it does not match",
    whyNotAFiling:
      "This page is a checklist for after the request. Nothing on it is filed, and no procedure exists that this packet could file under.",
    processType: "agency",
    prerequisites: [
      "You have read the sheets before this one in the packet.",
      "You have asked the Administrative Office of the Courts, or you are about to."
    ],
    documentsToObtain: [
      "A dated copy of whatever you sent to the Administrative Office of the Courts, and of whatever it sends back.",
      "A dated note of any court-search result you obtained yourself, before and after."
    ],
    gather: [
      "The date you submitted the request.",
      "What the Administrative Office of the Courts told you, in its own words rather than paraphrased.",
      "Where the charge is still appearing, if it is, and on what date you saw it.",
      "Any consequence that has already followed — a job, a licence, a tenancy — and its date."
    ],
    destination: AOC,
    sequence: [
      "Keep a dated record of the request. Nobody is required to write and tell you that an automatic expungement has happened, so what you keep is what you will be able to show.",
      "When an answer comes, write down what it actually says rather than what you take it to mean. On this route the precise wording is what anybody advising you will need, because there is no published description of what the answers look like.",
      "Where the answer is that the record is already expunged, keep it. That is the most useful single document you will hold about this case, and there is no other copy of the record to fall back on — the section requires destruction.",
      "Where the answer is that it has not happened yet, that is what the expedited request is for, and it is what you asked for.",
      "Where no answer arrives, do not read that as a refusal. How long the procedure takes is not published, and this packet will not invent a period for you. Keep the dated record and ask again.",
      "Where the answer is that the record was not expunged and is not eligible, that is a judgment about the charge, and it is the point at which this route ends and somebody needs to look at the offence itself.",
      "And where the Administrative Office of the Courts confirms the expungement but an agency is still showing the charge, no published procedure describes what to do about that particular agency. Ask it in writing, keep the reply with the confirmation, and take the pair to a lawyer. Do not file anything: there is nothing to file.",
      "Do not tell an employer, a landlord or a licensing body that a record has been expunged before you have something from the Administrative Office of the Courts saying so.",
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_IS_FILED_IN_COURT
    ],
    expectedNextStage:
      "You leave this packet with the request made, a dated record of it, and a plan for each of the answers that can come back, including the two that have no settled answer yet.",
    canPrepare: [
      "This checklist and the account of what each possible answer means.",
      "The list of what to keep and why keeping it matters more here than elsewhere.",
      "The honest statement that no timescale and no correction procedure is published."
    ],
    escalations: [
      "The Administrative Office of the Courts says the record is not eligible.",
      "An agency is still showing the charge after expungement was confirmed.",
      "A consequence has already followed and you cannot wait for an answer."
    ],
    sources: NM_CANNABIS_SOURCES
  }),

  // ---- nm_cannabis_sentence -------------------------------------------------
  "nm-cannabis-sentence-detection-and-naming": sentenceSheet({
    templateId: "nm-cannabis-sentence-detection-and-naming",
    mechanismName: "A New Mexico cannabis sentence that may no longer be valid: what Section 29-3A-9 is",
    whyNotAFiling:
      "LegalEase generates no filing on this route. Section 29-3A-9 is about sentences rather than records: a facility notifies the court that a case may be reopened, the court reopens and dismisses a sentence that is legally invalid, and a person who has completed such a sentence is entitled to dismissal and expungement, or redesignation as a penalty assessment citation. Whether a sentence is legally invalid is a legal analysis, and this packet names the section and refers rather than preparing anything.",
    processType: "court_adjacent",
    prerequisites: [
      "The conviction is a New Mexico cannabis conviction.",
      "You are in custody now on it, or you have served a sentence on it.",
      "You understand before you read further that this packet prepares no document on this route."
    ],
    documentsToObtain: [
      "The judgment and sentence for the cannabis conviction, from the clerk of the court that entered it. Nothing in this packet depends on it; it is named because whoever takes the referral will want it."
    ],
    gather: [
      "What the conviction was, in which court, and on what date.",
      "The charge in the words the record uses.",
      "Whether you have finished the sentence, and if so when.",
      "Who represented you in that case, if you know."
    ],
    destination: {
      name: "The New Mexico court that entered the cannabis conviction, reached through a lawyer rather than through this packet",
      detail:
        "Section 29-3A-9(A) puts the notification on the facility; subsection (B) has the court reopen and dismiss a legally invalid sentence; and subsection (C) gives a person who has completed such a sentence an entitlement to dismissal and expungement, or to redesignation as a penalty assessment citation. LegalEase generates nothing for that destination. It identifies the situation, names the section, states that no fee or cost may be imposed, and refers."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "What the section covers. A cannabis offence that is no longer a crime, or that would have been a lesser offence had the Cannabis Regulation Act been in effect, where a person was sentenced for it.",
      "Who was supposed to do what. A correctional facility, county jail or juvenile correctional facility holding somebody for such an offence was required to notify the court that the case may be reopened for dismissal of the sentence or expungement. The court must reopen the case and dismiss the sentence if it is legally invalid.",
      "And for somebody who has already finished the sentence: subsection (C) states an entitlement to have the conviction dismissed and expunged as legally invalid, or redesignated as a penalty assessment citation.",
      "There was also meant to be a sweep. The Department of Public Safety was to identify potentially eligible past convictions and notify the corrections department, prosecutors and defence counsel, and prosecutors had until 1 July 2022 to decide whether to challenge a dismissal, expungement or redesignation.",
      "Why this packet stops here. Whether a particular sentence or conviction is legally invalid under the Cannabis Regulation Act is a legal analysis, not a form-filling exercise. For somebody in custody it also runs through a facility and a court on a timetable a self-help packet cannot manage. The design puts the whole of this outside what this service prepares.",
      "That is a decision about what LegalEase does, not a finding that the relief is unavailable. The next sheets tell you what it costs — which is nothing — and where to take it.",
      "One boundary worth stating plainly. This section is about the sentence and the conviction. Clearing the underlying arrest and public records is the other cannabis section, and whether a dismissal under this one needs a separate step under that one is not settled. Ask about both.",
      "There is no petition, motion or application on this route for LegalEase to prepare, and none is generated."
    ],
    expectedNextStage:
      "The next sheet is short and worth having in writing: no fee or cost may be imposed for sentence review under this section. The two after it say where to take this and how it differs from clearing the record, which are easy to confuse and lead to different places.",
    canPrepare: [
      "This explanation of what Section 29-3A-9 covers and of who was required to do what.",
      "The no-fee disclosure that follows it in this packet.",
      "The referral sheet, including what to take and what to ask.",
      "The scope disclosure, which separates sentence relief from record clearing."
    ],
    escalations: [
      "You are in custody now on this cannabis charge.",
      "You want to know whether the sentence is legally invalid.",
      "A prosecutor is challenging a dismissal, expungement or redesignation."
    ],
    sources: NM_SENTENCE_SOURCES
  }),

  "nm-cannabis-sentence-no-fee": sentenceSheet({
    templateId: "nm-cannabis-sentence-no-fee",
    mechanismName: "No fee or cost may be imposed for sentence review under this section",
    whyNotAFiling:
      "This page states a rule about money. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheet before this one in the packet.",
      "You are about to speak to somebody about a cannabis sentence."
    ],
    documentsToObtain: [
      "Nothing further for this sheet. It exists so that you know one fact before anybody quotes you a price."
    ],
    gather: [
      "Anything you have already been asked to pay in connection with this, and by whom.",
      "The name of anybody who has offered to handle it for a fee."
    ],
    destination: {
      name: "No destination. This sheet is a disclosure rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because knowing that a process is free changes who you are willing to talk to about it."
    },
    sequence: [
      "The rule, stated on its own because it is short and it matters: no fee or cost may be imposed for sentence review under Section 29-3A-9.",
      "That is worth carrying into any conversation about this. If somebody is charging you a fee or a cost for the sentence review itself, that is a reason to stop and ask what exactly the charge is for.",
      "It does not mean that every part of this is free. A lawyer representing you is entitled to charge for their work, and this rule is about the review rather than about representation. The useful question is which of the two you are being asked to pay for.",
      "There is also nothing to waive. Because no fee may be imposed, there is no fee-waiver application on this route and none is generated.",
      "And there is no fee on the record-clearing section either. The cannabis verification and expedited-request procedure carries no fee, and the old court action that once had an express no-filing-fee provision has itself been removed.",
      "So on the cannabis routes as a whole, money should not be the obstacle. If it is presenting as one, that is worth raising with whoever you take this to.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "The next sheet is where to take this, and what to bring with you.",
    canPrepare: [
      "This statement of the no-fee rule and of what it does and does not cover.",
      "The distinction between the review, which carries no fee, and representation, which may.",
      "The referral sheet that follows it in this packet."
    ],
    escalations: [
      "Somebody is charging you a fee for the sentence review itself.",
      "You have been quoted a price and cannot tell what it covers.",
      "You cannot afford representation and need to know what free help exists."
    ],
    sources: NM_SENTENCE_SOURCES
  }),

  "nm-cannabis-sentence-referral": sentenceSheet({
    templateId: "nm-cannabis-sentence-referral",
    mechanismName: "Where to take a New Mexico cannabis sentence, and what to take with you",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed, and no application is prepared. The route ends with a person who can act on it rather than with a document.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the two sheets before this one.",
      "You accept that this sheet routes you to a person rather than giving you a document."
    ],
    documentsToObtain: [
      "The judgment and sentence for the cannabis conviction, from the clerk of the court that entered it.",
      "Anything showing when the sentence ended, if it has.",
      "Anything you have received from the Department of Public Safety, the corrections department or a prosecutor about this conviction."
    ],
    gather: [
      "The conviction, the court, the county and the date.",
      "The charge in the words the record uses.",
      "Whether the sentence is finished, and when.",
      "Who represented you in the case, because Section 29-3A-9(D) contemplates notice to counsel of record and they are the natural first contact.",
      "Whether anybody has ever contacted you about this conviction being reviewed."
    ],
    destination: {
      name: "The attorney who represented you in the case, and otherwise a New Mexico legal aid office, law school clinic or attorney",
      detail:
        "Counsel of record is the natural first contact because the section contemplates notice to defence counsel. Where that is not possible, legal aid or a clinic is the destination. LegalEase has contacted none of them and does not know what any of them will say."
    },
    sequence: [
      "Take the judgment and sentence, the charge as the record words it, and the dates. Those are what any first conversation runs on.",
      "Start with the attorney who represented you, if you can find them. Section 29-3A-9(D) contemplates notice to defence counsel of record about potentially eligible convictions, so they may already know something about this case.",
      "Ask three questions in this order. First: is this offence one that is no longer a crime, or one that would have been a lesser offence, under the Cannabis Regulation Act? Second: what does subsection (C) give somebody in my position — dismissal and expungement, or redesignation? Third: what has to happen for that to be asserted now?",
      "That third question is the one with an unsatisfying answer, and you should hear it from this page first rather than be surprised by it. The Department of Public Safety review was to be completed on or before 1 January 2022 and the prosecutor review window closed on 1 July 2022. Subsection (C) states the entitlement, but no procedure or form is published for asserting it now that those dates have passed. Somebody who was never reached by the sweep is in a real gap.",
      "This packet does not invent a route through that gap. What it does is name it, so that you are asking the right question rather than looking for a form that does not exist.",
      "Ask separately about the arrest and public records. Whether a dismissal, expungement or redesignation under this section needs any separate step under the cannabis record-clearing section is not settled, and it is worth putting to whoever takes this on.",
      "No fee or cost may be imposed for sentence review under this section. Say so at the outset.",
      NOT_A_REPORT_ON_YOUR_CASE,
      "There is no petition, motion or application on this route for LegalEase to prepare, and none is generated."
    ],
    expectedNextStage:
      "You leave this sheet with the papers gathered, three questions in order, and an honest account of the gap in the middle of the third one.",
    canPrepare: [
      "This referral and the list of what to take and what to ask.",
      "The account of the sweep dates and of the gap they left, stated as a gap.",
      "The question about whether a separate record-clearing step is needed."
    ],
    escalations: [
      "You cannot find the attorney who represented you.",
      "Nobody ever contacted you about this conviction and the sweep dates have passed.",
      "You are told there is no way to raise this now."
    ],
    sources: NM_SENTENCE_SOURCES
  }),

  "nm-cannabis-sentence-scope-disclosure": sentenceSheet({
    templateId: "nm-cannabis-sentence-scope-disclosure",
    mechanismName: "Sentence relief and record clearing are different things",
    whyNotAFiling:
      "This page separates two sections. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheets before this one in the packet.",
      "You want to know which of the two cannabis sections you actually need."
    ],
    documentsToObtain: [
      "Nothing further for this sheet."
    ],
    gather: [
      "Whether what you want is the sentence or conviction undone, or the record cleared, or both.",
      "Whether a licence, a job or an application is the reason, because that often decides which one matters."
    ],
    destination: {
      name: "No destination. This sheet is an explanation rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because the two cannabis sections are easy to confuse and lead to different places."
    },
    sequence: [
      "The two sections do different jobs. Section 29-3A-9 is about the sentence and the conviction: reopening the case, dismissing a legally invalid sentence, and dismissal and expungement or redesignation for somebody who has completed one. Section 29-3A-8 is about the records: the automatic expungement of the public records of an eligible cannabis arrest or conviction, and the procedure for verifying it.",
      "Which one you need depends on what you actually want. If the conviction itself is the problem — because of what it is, not just because it shows up — this section is the one. If what you want is the record gone, the other one is.",
      "Many people need to think about both, and this is the part that is not settled: whether a dismissal, expungement or redesignation under this section needs any separate step under the record-clearing section, or whether the two operate together, is an open question. Ask about it rather than assuming either way.",
      "Why this route ends in a referral rather than a packet. It requires a legal-invalidity analysis, and for somebody in custody it requires coordination with a facility and possibly with counsel. That is advocacy rather than paperwork, and it sits outside what this service prepares.",
      "What that leaves you with is still worth having: the section named, what it offers, the fact that no fee or cost may be imposed, where to take it, and the gap that the expired sweep dates left.",
      "One limit that applies to both sections. Neither reaches the record of another state, or a federal, tribal or military record.",
      NOT_A_REPORT_ON_YOUR_CASE,
      "There is no petition, motion or application on this route for LegalEase to prepare, and none is generated."
    ],
    expectedNextStage:
      "You leave this packet knowing which section does what, what this one offers, where to take it, and which question between the two remains open.",
    canPrepare: [
      "This separation of sentence relief from record clearing.",
      "The statement of the open question between the two sections.",
      "The account of why this route ends in a referral.",
      "The three sheets before this one."
    ],
    escalations: [
      "You need both the sentence undone and the record cleared and cannot tell what order to do them in.",
      "A licence or an application is the reason and you need to know which section addresses it.",
      "You also hold an out-of-state, federal or tribal cannabis record."
    ],
    sources: NM_SENTENCE_SOURCES
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
      if (!NEW_MEXICO_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no New Mexico guidance template ${component.templateId} is registered.`
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
 * Asked on both New Mexico routes in this family, in this order.
 *
 * The third is the New Mexico Judiciary's own direction rather than an
 * inference: its expungement materials tell a person who is not a United
 * States citizen to seek legal advice about the consequences of expungement
 * before pursuing it. Both of these sections produce expungement, so it is
 * asked on both, and it is asked before anything else because the advice is
 * supposed to come before the request rather than after it.
 */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsOffenceClassificationAdvice",
    label:
      "Do you want us to tell you whether your offence is one the Cannabis Regulation Act stopped being a crime, or made a lesser offence?",
    required: true
  },
  {
    key: "recordJurisdiction",
    label:
      "Is the record from New Mexico, another state, the federal courts, a tribal court, or a military court?",
    required: true
  },
  {
    key: "isNotAUnitedStatesCitizen",
    label: "Are you someone who is not a United States citizen?",
    required: true
  },
  {
    key: "custodyOnThisCharge",
    label:
      "Were you ever in custody on this cannabis charge — never, formerly, or are you in custody now?",
    required: true
  }
];

function newMexicoTrack(input: {
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
    jurisdiction: "NM",
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

export const NEW_MEXICO_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  newMexicoTrack({
    trackId: "nm_cannabis",
    publicName: "New Mexico cannabis record clearing",
    mechanism:
      "automatic_expungement_of_cannabis_records_with_administrative_office_verification_and_expedited_request",
    authority:
      "NMSA 1978, Section 29-3A-8, Laws 2023 ch. 74 (House Bill 314), Rule 1-077.1 NMRA and the Cannabis Regulation Act",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["convicted", "arrested_not_convicted"],
    components: [
      {
        componentId: "nm_cannabis-verification-first-instructions-1",
        templateId: "nm-cannabis-verification-first"
      },
      {
        componentId: "nm_cannabis-aoc-application-instructions-2",
        templateId: "nm-cannabis-aoc-application-instructions"
      },
      {
        componentId: "nm_cannabis-mixed-case-routing-3",
        templateId: "nm-cannabis-mixed-case-routing",
        requirement: "conditional",
        conditionKey: "mixedCaseRoutingApplies"
      },
      {
        componentId: "nm_cannabis-withdrawn-route-disclosure-4",
        templateId: "nm-cannabis-withdrawn-route-disclosure"
      },
      {
        componentId: "nm_cannabis-effect-and-limits-disclosure-5",
        templateId: "nm-cannabis-effect-and-limits"
      },
      {
        componentId: "nm_cannabis-followup-checklist-6",
        templateId: "nm-cannabis-followup-checklist"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      { key: "fullLegalName", label: "What is your full legal name?", required: true },
      {
        key: "otherNames",
        label: "Have you used any other name that the record might be under?",
        required: false
      },
      { key: "dateOfBirth", label: "What is your date of birth?", required: true },
      { key: "caseNumber", label: "What is the full case number of the cannabis case?", required: true },
      {
        key: "courtAndCounty",
        label: "Which court handled the case, and in which county?",
        required: true
      },
      {
        key: "arrestOrConvictionDate",
        label: "What was the date of the arrest, and the date of the conviction if there was one?",
        required: true
      },
      {
        key: "underEighteenAtTheTime",
        label: "Were you under eighteen at the time of the arrest or conviction?",
        required: true
      },
      {
        key: "chargeDescription",
        label: "What was the charge, in the words used on the record?",
        required: true
      },
      {
        key: "mixedCannabisAndOtherCharges",
        label:
          "Did the same arrest or case include any charge that was not about cannabis or cannabis paraphernalia?",
        required: true
      },
      {
        key: "administrativeOfficeOutcome",
        label:
          "Have you asked the Administrative Office of the Courts yet, and what did it say — not asked yet, already expunged, still pending or no answer, or not expunged and not eligible?",
        required: true
      },
      {
        key: "agencyStillShowingAfterConfirmation",
        label:
          "If expungement was confirmed, is any agency still showing the charge?",
        required: true
      },
      {
        key: "replyLocation",
        label: "Where should the Administrative Office of the Courts write to you?",
        required: true
      }
    ],
    assembledPacketName: "new-mexico-cannabis-record-clearing",
    assembledPacketTitle: "New Mexico cannabis records — automatic expungement and how to verify it",
    customerDeliverableDescription:
      "Explains that an eligible New Mexico cannabis arrest or conviction record is automatically expunged and destroyed by operation of NMSA 1978, Section 29-3A-8 two years after the conviction or the arrest, puts verification through the Administrative Office of the Courts first, sets out what that office's own application asks for without producing it, corrects the widely circulated belief that a district court petition exists now that Rule 1-077.1 excepts cannabis records and Form 4-954 has been withdrawn, separates a mixed cannabis and non-cannabis case, and gives a follow-up checklist for each answer that can come back. Nothing is filed in court and no application is generated.",
    notes:
      "Process guidance only. The Administrative Office of the Courts' application is that office's own and is never produced, completed, signed or submitted by LegalEase. Never suggest a district court petition: the action and Form 4-954 NMRA were removed effective 31 December 2025. Two release blockers are preserved on the sheets rather than resolved — how the verification procedure actually operates and responds, and whether the dated Judiciary district packets have been withdrawn — together with the open question of whether automatic expungement has been executed at scale."
  }),

  newMexicoTrack({
    trackId: "nm_cannabis_sentence",
    publicName: "Cannabis sentences and convictions that may now be invalid",
    mechanism: "referral_for_dismissal_vacatur_or_redesignation_of_a_cannabis_sentence",
    authority: "NMSA 1978, Section 29-3A-9, Laws 2021 (1st S.S.) ch. 3 s. 6 and the Cannabis Regulation Act",
    recordTypes: ["conviction", "court_record"],
    dispositions: ["convicted"],
    components: [
      {
        componentId: "nm_cannabis_sentence-detection-and-naming-1",
        templateId: "nm-cannabis-sentence-detection-and-naming"
      },
      {
        componentId: "nm_cannabis_sentence-no-fee-disclosure-2",
        templateId: "nm-cannabis-sentence-no-fee"
      },
      {
        componentId: "nm_cannabis_sentence-referral-instructions-3",
        templateId: "nm-cannabis-sentence-referral"
      },
      {
        componentId: "nm_cannabis_sentence-scope-disclosure-4",
        templateId: "nm-cannabis-sentence-scope-disclosure"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "convictionDetails",
        label: "What was the conviction, in which court, and on what date?",
        required: true
      },
      {
        key: "sentenceStatus",
        label: "Have you finished the sentence, and if so when?",
        required: true
      },
      {
        key: "chargeDescription",
        label: "What was the charge, in the words used on the record?",
        required: true
      },
      {
        key: "counselOfRecord",
        label: "Do you know who represented you in that case?",
        required: false
      },
      {
        key: "prosecutorChallenge",
        label:
          "Has a prosecutor challenged, or said they will challenge, a dismissal, expungement or redesignation in this case?",
        required: true
      }
    ],
    assembledPacketName: "new-mexico-cannabis-sentence-referral",
    assembledPacketTitle: "New Mexico cannabis sentences — Section 29-3A-9 and where it goes",
    customerDeliverableDescription:
      "Identifies a New Mexico cannabis conviction that may fall within the sentence-relief section, explains what NMSA 1978, Section 29-3A-9 requires of a facility, of the court and of the prosecutor, states in its own sheet that no fee or cost may be imposed for sentence review, refers the participant to counsel of record or legal aid with the papers gathered, and separates sentence relief from record clearing while naming the question between them that is unresolved. No filing is prepared.",
    notes:
      "Process guidance only, and a referral rather than a filing route. Legal invalidity under the Cannabis Regulation Act is a legal analysis and is outside what this service prepares; never generate a petition. A release blocker is preserved on the sheets: the Department of Public Safety sweep was to complete by 1 January 2022 and the prosecutor window closed on 1 July 2022, and no procedure is published for asserting the subsection (C) entitlement now."
  })
];
