// Wyoming custom pleading, clean track.
//
// SCOPE. One relief track, four assigned custom-pleading components:
//
//   wy_nc_1401                        Wyo. Stat. § 7-13-1401 — a verified
//     -primary-filing-1                petition in the court in which the
//     -proposed-order-2                proceeding occurred or would have
//     -verification-3                  occurred, the Order for Expungement
//     -certificate-of-service-4        left entirely unexecuted, the statutory
//                                      verification, and the certificate of
//                                      service on the prosecuting attorney.
//
// `wy_misd_1501` and `wy_fel_1502` are NOT part of this assignment. They stay
// with the original Wyoming assignment, which is blocked on its own
// legal-design questions. Nothing here implements them, nothing here infers
// their mechanism, and no document names either section as a route this packet
// produces.
//
// The fifth component on this track, `wy_nc_1401-filing-instructions-5`, is
// `process_guidance` and belongs to another lane. It is not implemented here,
// and this packet is therefore not the whole packet the design describes: the
// filing, service and timing sheet — including the twenty-day statement the
// memo places in the instructions rather than in the pleading — is that
// component's, and it is missing until that lane produces it.
//
// WHY THIS IS A DRAFTED PLEADING. Wyoming publishes no statewide petition form
// and no statewide proposed-order template. That is an affirmative conclusion
// recorded in the integrated decision `wy-published-source-filing-requirements`
// and carried into the memo, not a gap: there is no template to fill, so both
// documents are controlled custom pleading. No Wyoming statewide form number
// exists and none is cited.
//
// WHAT THIS MODULE NEVER DOES. It never generates a summons, a praecipe, a
// victim notice, a prosecutor response, a Division of Criminal Investigation
// instrument, a completed proof of service, or any Casper Municipal Court form.
// It never populates a judicial finding, a judicial date, a judge's signature
// or a clerk entry. It never says a period has run — it computes none — and it
// never says the record will be cleared, that the prosecuting attorney does not
// object, that a hearing has happened, or that anything has been filed or
// served. The only amount it prints is the statutory filing fee of $0, which is
// the statute setting no fee rather than a fee anyone has waived.
//
// CASPER. Casper Municipal Court is the only publicly identified Wyoming
// local-form exception and its packets bind that court alone. No Casper form is
// imported, referenced or selected here, and none may satisfy a statewide
// component. The statewide packet is the default everywhere outside that exact
// local-form scope, including in Natrona County Circuit Court and Natrona
// County District Court.
//
// LOCAL PRACTICE. The twenty-three-county survey of unpublished local filing
// preferences is open and is release-level: it decides how a filing is handled,
// not what the document says. It does not gate generation, and no county has
// been telephoned. The documents send the participant to the clerk of their own
// filing court rather than stating a local requirement this module cannot
// support.
//
// SOURCES. Every statement is taken from the integrated memo, the controlling
// decision records and the statute. No content is reused from the Wyoming
// Judicial Branch "Expungement Basics" handout, which the design excludes as
// possibly stale.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referrals
//
// Institutions, never addresses. The packet prints no street address, no
// telephone number and no office for anybody, because none was established and
// an invented one sends a filing to the wrong place.
// ---------------------------------------------------------------------------

export const WY_LAWYER_REFERRAL =
  "A Wyoming lawyer. The Wyoming State Bar's lawyer referral service and Legal Aid of Wyoming are the two statewide starting points; LegalEase contacts neither of them for you.";

export const WY_COURT_RECORD_REFERRAL =
  "The clerk of the court in which the proceeding occurred or would have occurred, who holds the docket, the case number and the order of dismissal or other disposition.";

export const WY_DCI_REFERRAL =
  "The Wyoming Division of Criminal Investigation, Criminal Records Unit, which holds the state central repository record and publishes its own process for releasing a personal criminal history.";

export const WY_REFERRALS: readonly string[] = [
  WY_LAWYER_REFERRAL,
  WY_COURT_RECORD_REFERRAL,
  WY_DCI_REFERRAL
];

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

/**
 * A material fail-closed branch.
 *
 * Every stop carries a reason, a destination and a next step, and no stop
 * routes the participant back into the route it just closed.
 */
export class WyomingEligibilityStopError extends Error {
  readonly stopId: string;
  readonly trackId: string;
  readonly destination: string;
  readonly nextStep: string;

  constructor(stopId: string, trackId: string, reason: string, destination: string, nextStep: string) {
    super(reason);
    this.name = "WyomingEligibilityStopError";
    this.stopId = stopId;
    this.trackId = trackId;
    this.destination = destination;
    this.nextStep = nextStep;
  }
}

/** An answer outside the closed list the design declares for that question. */
export class WyomingBranchError extends Error {
  readonly trackId: string;
  readonly key: string;
  readonly value: string;
  readonly permitted: readonly string[];

  constructor(trackId: string, key: string, value: string, permitted: readonly string[]) {
    super(`Answer "${value}" for ${key} on ${trackId} is not one of: ${permitted.join(", ")}.`);
    this.name = "WyomingBranchError";
    this.trackId = trackId;
    this.key = key;
    this.value = value;
    this.permitted = permitted;
  }
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export const WY_NONCONVICTION_TRACK = "wy_nc_1401";

export const WY_ASSIGNED_TRACK_IDS: readonly string[] = [WY_NONCONVICTION_TRACK];

/**
 * The two Wyoming tracks that stay with the original assignment.
 *
 * Each carries its own unresolved legal-design question. Neither is implemented
 * here and neither is named in any generated document as a route this packet
 * produces.
 */
export const WY_EXCLUDED_TRACK_IDS: readonly string[] = ["wy_misd_1501", "wy_fel_1502"];

/** The component on this track that belongs to the process-guidance lane. */
export const WY_EXCLUDED_COMPONENTS: readonly {
  trackId: string;
  componentIdSuffix: string;
  role: string;
  strategy: string;
  why: string;
}[] = [
  {
    trackId: WY_NONCONVICTION_TRACK,
    componentIdSuffix: "-filing-instructions-5",
    role: "filing_instructions",
    strategy: "process_guidance",
    why: "The filing, service and timing sheet, which carries the statutory objection-window timing the memo places in the instructions rather than in the pleading. It is a process-guidance component and belongs to that lane; until it is produced this packet is not the whole packet the design describes."
  }
];

/** Instruments the design excludes from this packet by name. */
export const WY_EXCLUDED_INSTRUMENTS: readonly string[] = [
  "summons",
  "praecipe",
  "prosecutor notice to victims",
  "prosecutor response",
  "Division of Criminal Investigation action",
  "judicial findings",
  "populated judge signature",
  "populated judicial date",
  "clerk certification",
  "completed proof of service before service occurs",
  "a Casper Municipal Court form"
];

// ---------------------------------------------------------------------------
// Closed lists
//
// Each is the design's own option set. An answer outside one is refused rather
// than normalized into the nearest neighbour.
// ---------------------------------------------------------------------------

export const WY_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** The four dispositions the track serves, from the track registry. */
export const WY_QUALIFYING_DISPOSITIONS: Readonly<Record<string, string>> = {
  not_convicted: "not_convicted",
  no_charges_filed: "no_charges_filed",
  dismissed_by_prosecutor: "dismissed_by_prosecutor",
  dismissed_by_court: "dismissed_by_court"
};

/** What the deferred matter was, which decides which stop fires. */
export const WY_DEFERRAL_LEVELS: Readonly<Record<string, string>> = {
  misdemeanor: "misdemeanor",
  felony: "felony"
};

/**
 * The declared participant-input keys.
 *
 * `resolvePacket` checks every declared `requiredInputs` key against the fact
 * bag, so each one is echoed into the derived facts even where no template
 * prints it. They are listed here rather than read back off the track so the
 * echo cannot silently drift from the declaration.
 */
export const WY_TRACK_INPUT_KEYS: Readonly<Record<string, readonly string[]>> = {
  [WY_NONCONVICTION_TRACK]: [
    "arrestDate",
    "arrestCounty",
    "chargesFiled",
    "caseNumber",
    "courtName",
    "qualifyingDisposition",
    "dispositionDate",
    "deferredDisposition",
    "deferralToLesserCharge",
    "deferralUnderlyingLevel",
    "pendingCharges",
    "dciRecordStatus"
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
    throw new WyomingEligibilityStopError(
      "wy-answer-missing",
      trackId,
      `The answer to "${key}" is needed before this document can be drafted, and it has not been given. Nothing in this packet is written from an assumption about a participant's own case.`,
      WY_COURT_RECORD_REFERRAL,
      "Read the answer off your own record and run the packet again."
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
    throw new WyomingBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), WY_YES_NO);

function echoInputs(trackId: string, answers: Answers): Record<string, string> {
  const echoed: Record<string, string> = {};
  for (const key of WY_TRACK_INPUT_KEYS[trackId] ?? []) echoed[key] = str(answers, key);
  return echoed;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/**
 * The caption's court line, from the participant's own answer.
 *
 * Nothing is composed onto it. A caption builder that appends a county, a
 * judicial district or a court level it was not given is how a packet ends up
 * naming a court that does not exist, so the only edits here are dropping a
 * leading "in the" the template already supplies and collapsing whitespace.
 */
export function captionCourtLine(courtName: string): string {
  return courtName
    .replace(/^\s*in\s+the\s+/iu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toUpperCase();
}

/**
 * The county, said once.
 *
 * A participant who answers "Laramie County" and one who answers "Laramie" mean
 * the same county, and "Laramie County County" is the sentence that tells a
 * reader the packet was assembled by a machine that was not paying attention.
 */
export function countyPhrase(arrestCounty: string): string {
  const bare = arrestCounty.replace(/\s*county\s*$/iu, "").replace(/\s+/gu, " ").trim();
  return `${bare} County`;
}

// ---------------------------------------------------------------------------
// Fixed statements
// ---------------------------------------------------------------------------

const NO_STATEWIDE_FORM_STATEMENT =
  "Wyoming publishes no statewide petition form and no statewide proposed-order template for a petition under Wyo. Stat. § 7-13-1401. Both documents are drafted, and there is no Wyoming statewide expungement form number for either of them. This petition cites none and invents none.";

const LOCAL_FORM_STATEMENT =
  "County clerks, municipal courts and circuit courts may have their own local templates or formatting requirements. Call the clerk of the court where this petition will be filed before you finalise it, and use a local template where that court publishes one. Which courts do was not established, and this packet states no local requirement it cannot support.";

const FEE_STATEMENT =
  "Wyo. Stat. § 7-13-1401 prescribes no filing fee for this petition: the statutory filing fee on this route is $0. That is the statute setting no fee, and not a fee that anyone has waived — no waiver procedure is asserted here and none is offered through this packet. Copying charges, certification charges, postage and record-retrieval charges are separate charges with separate payees, they move independently of the statute, and they are not covered by it. Ask the clerk what that court charges for copies and certification.";

const SERVICE_RECIPIENT_STATEMENT =
  "The prosecuting attorney is the party served with this petition. The Division of Criminal Investigation is not a service recipient on this route, and nothing in this packet asks it to act.";

// Written as a clean negation. Every clause names a thing that has not
// happened without first writing the sentence that says it has, so a content
// scan for an unsupported assertion cannot be satisfied by a disclaimer.
const NOT_ASSERTED_STATEMENT =
  "This petition asks; it reports nothing. No finding by the Court, no entry of any order, no hearing, no position taken by the prosecuting attorney and no act of service, filing or transmittal is recorded anywhere in it, because none of those things has happened. Nothing has been obtained from the prosecuting attorney's office. Nobody at LegalEase has seen the Petitioner's court file or their criminal history record in this matter, and nothing here says that the Petitioner is owed the relief the section describes.";

const NO_PERIOD_COMPUTED_STATEMENT =
  "It does not say that any period has run, and it computes none. The dates above are the Petitioner's own, and whether the statutory period has passed on them is for the Court on the record before it.";

const EFFECT_STATEMENT =
  "Expungement under this section classifies the record at the Division of Criminal Investigation so that it is not disseminated except to criminal justice agencies for criminal justice purposes. It does not destroy the record, criminal justice agencies keep their access, and newspapers, private websites and private background-check databases are not reached by it. Nothing in Wyoming happens automatically, and an adult arrest does not drop off a Wyoming record on its own.";

const NO_IDENTITY_QUESTION_STATEMENT =
  "The design for this route asks nothing about who you are, so this packet holds no name and no date of birth. Write them in by hand, on every document in this packet, before you file.";

const VERIFICATION_PAGE_STATEMENT =
  "Wyo. Stat. § 7-13-1401 requires this petition to be verified by the Petitioner. The verification page in this packet is executed as the final page of this petition and is signed at the same time; a petition filed without it is not a verified petition.";

const PACKET_STOPS: readonly string[] = [
  "LegalEase prepares documents from what the participant says. It gives no legal advice, reads no record, decides no eligibility question, serves nobody and files nothing.",
  "Any disposition under Wyo. Stat. § 7-13-301, § 35-7-1037 or former § 7-13-203 arising from this incident, including one entered to a different or lesser charge than the one you were arrested for.",
  "Any criminal charge pending against you, anywhere.",
  "Facts indicating human trafficking or coercion, which are reached by a motion under Wyo. Stat. § 6-2-708 outside this route and are not produced here.",
  "Any offence subject to sex offender registration.",
  "Any immigration consequence, which a Wyoming expungement does not resolve.",
  "Federal, tribal and out-of-state records, which a Wyoming order does not reach.",
  "Records of a juvenile matter, which Wyo. Stat. § 14-6-241 and § 14-6-440 handle outside this route.",
  "An objection filed by the prosecuting attorney, or a contested hearing set by the Court.",
  "Where any of these applies, speak to a lawyer before filing. {{wyReferralLine}}"
];

// ---------------------------------------------------------------------------
// Derived facts
// ---------------------------------------------------------------------------

export function deriveWyomingFacts(trackId: string, answers: Answers): Record<string, string> {
  if (!WY_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new WyomingBranchError(trackId, "trackId", trackId, WY_ASSIGNED_TRACK_IDS);
  }

  // ---- The bar that closes the route, read before anything else. ----------
  //
  // § 7-13-1401 is barred by a disposition under § 7-13-301, § 35-7-1037 or
  // former § 7-13-203 entered to ANY charge arising from the incident,
  // including to a different or lesser charge. The memo records the
  // lesser-charge clause as the one that catches people, so both questions
  // reach the same bar.
  const deferred = yesNo(trackId, answers, "deferredDisposition");
  const deferredToLesser = yesNo(trackId, answers, "deferralToLesserCharge");
  if (deferred || deferredToLesser) {
    const rawLevel = str(answers, "deferralUnderlyingLevel");
    if (!rawLevel) {
      throw new WyomingEligibilityStopError(
        "wy-1401-deferral-level-not-established",
        trackId,
        "A deferred disposition arising from this incident has been reported, and whether the matter that was deferred was a misdemeanour or a felony has not been established. Wyo. Stat. § 7-13-1401 is closed either way, but the two answers lead to completely different places, and this packet does not guess between them.",
        WY_COURT_RECORD_REFERRAL,
        "Read the charge level off the charging document or the order of dismissal, or ask the clerk for it, and run the packet again."
      );
    }
    const level = branch(trackId, "deferralUnderlyingLevel", rawLevel, WY_DEFERRAL_LEVELS);
    if (level === "misdemeanor") {
      throw new WyomingEligibilityStopError(
        "wy-1401-deferral-misdemeanor",
        trackId,
        "A charge arising from this incident ended in a deferred disposition and the matter that was deferred was a misdemeanour. Wyo. Stat. § 7-13-1401 excludes any disposition under § 7-13-301, § 35-7-1037 or former § 7-13-203 entered to any charge arising from the incident, including to a different or lesser charge, so this route is closed. Wyo. Stat. § 7-13-1501 is the section the memo names for an eligible misdemeanour, and this packet does not produce a petition under it.",
        WY_LAWYER_REFERRAL,
        "Take the order of dismissal and the charging document to one of those offices and ask what Wyo. Stat. § 7-13-1501 requires on these facts."
      );
    }
    throw new WyomingEligibilityStopError(
      "wy-1401-completed-felony-deferral",
      trackId,
      "A charge arising from this incident ended in a deferred disposition and the matter that was deferred was a felony. Wyo. Stat. § 7-13-1401 is barred by the deferral, and the felony section requires a conviction, which a completed deferral producing a dismissal is not. On the reading recorded in the controlling decision nothing in Wyoming clears the record of a completed felony deferral: the deferral statutes do not carry the power, and an application to correct an inaccurate criminal history record is correction rather than expungement and is not produced by this packet. That is said plainly rather than routed into a queue.",
      WY_LAWYER_REFERRAL,
      "Take the order of dismissal to one of those offices and ask whether anything reaches a completed felony deferral on these facts."
    );
  }

  // ---- Pending charges. ---------------------------------------------------
  if (yesNo(trackId, answers, "pendingCharges")) {
    throw new WyomingEligibilityStopError(
      "wy-1401-charges-pending",
      trackId,
      "Criminal charges are pending against the Petitioner. Wyo. Stat. § 7-13-1401 is available only where no formal charges are pending at the time the petition is filed, so a petition drafted now would allege the opposite of what the record shows.",
      WY_LAWYER_REFERRAL,
      "Resolve the pending matter first, and take the docket to one of those offices if you are not sure it is resolved."
    );
  }

  // ---- The disposition, and the clock it starts. --------------------------
  const chargesFiled = yesNo(trackId, answers, "chargesFiled");
  const disposition = branch(
    trackId,
    "qualifyingDisposition",
    need(trackId, answers, "qualifyingDisposition"),
    WY_QUALIFYING_DISPOSITIONS
  );

  if (!chargesFiled && disposition !== "no_charges_filed") {
    throw new WyomingEligibilityStopError(
      "wy-1401-disposition-contradicts-charges",
      trackId,
      "The answers say that no criminal charges were ever filed and also describe an outcome that only a filed charge can have. A petition cannot allege both, and which of the two answers is right decides both what the caption looks like and which date the statutory period runs from.",
      WY_COURT_RECORD_REFERRAL,
      "Ask the clerk whether a case was ever opened on this arrest, correct whichever answer is wrong, and run the packet again."
    );
  }
  if (chargesFiled && disposition === "no_charges_filed") {
    throw new WyomingEligibilityStopError(
      "wy-1401-disposition-contradicts-charges",
      trackId,
      "The answers say that criminal charges were filed and also that no charges of any kind were filed. A petition cannot allege both, and which of the two answers is right decides both what the caption looks like and which date the statutory period runs from.",
      WY_COURT_RECORD_REFERRAL,
      "Ask the clerk whether a case was ever opened on this arrest, correct whichever answer is wrong, and run the packet again."
    );
  }

  const arrestDate = need(trackId, answers, "arrestDate");
  const arrestCounty = countyPhrase(need(trackId, answers, "arrestCounty"));
  const courtName = need(trackId, answers, "courtName");

  let caseNumber = "";
  let dispositionDate = "";
  if (chargesFiled) {
    caseNumber = str(answers, "caseNumber");
    if (!caseNumber) {
      throw new WyomingEligibilityStopError(
        "wy-1401-case-number-not-established",
        trackId,
        "Criminal charges were filed, and the number of the case they were filed in has not been given. The caption of a petition filed into an existing criminal case has to carry that case's own number; a petition captioned without it asks the clerk to guess which file it belongs in.",
        WY_COURT_RECORD_REFERRAL,
        "Read the case number off the charging document or the order of dismissal, or ask the clerk for it, and run the packet again."
      );
    }
    dispositionDate = str(answers, "dispositionDate");
    if (!dispositionDate) {
      throw new WyomingEligibilityStopError(
        "wy-1401-disposition-date-not-established",
        trackId,
        "Criminal charges were filed, and the date the charges were dismissed or the case otherwise ended has not been given. On a dismissal that date is what the statutory period runs from, and on any filed charge it is what the petition has to state about how the matter ended.",
        WY_COURT_RECORD_REFERRAL,
        "Read the date off the order of dismissal or the docket, or ask the clerk for it, and run the packet again."
      );
    }
  }

  const dismissed = disposition === "dismissed_by_prosecutor" || disposition === "dismissed_by_court";
  const knowsRepositoryStatus = yesNo(trackId, answers, "dciRecordStatus");

  // The charges allegation and the disposition allegation are consecutive
  // numbered paragraphs, so the second may not restate the first. Whether
  // charges were filed is one fact; how the matter ended is another, and on the
  // branch where none were ever brought the second fact is the statutory one —
  // that there was no conviction — rather than a second telling of the first.
  const dispositionStatement = (() => {
    switch (disposition) {
      case "no_charges_filed":
        return "The Petitioner states that they were not convicted of any charge relating to this event, no charge having been brought.";
      case "not_convicted":
        return `The Petitioner states that they were not convicted of any charge relating to this event, and states the date the matter ended as ${dispositionDate}.`;
      case "dismissed_by_prosecutor":
        return `The Petitioner states that the prosecuting attorney dismissed all charges relating to this event on ${dispositionDate}.`;
      default:
        return `The Petitioner states that the Court dismissed all charges relating to this event on ${dispositionDate}.`;
    }
  })();

  const waitingPeriodStatement = dismissed
    ? `Wyo. Stat. § 7-13-1401 requires at least one hundred and eighty days to have passed since the date the charges were dismissed, which the Petitioner states as ${dispositionDate}. Whether that period has passed is for the Court on the record before it; this petition computes no period.`
    : `Wyo. Stat. § 7-13-1401 requires at least one hundred and eighty days to have passed since the arrest, which the Petitioner states as ${arrestDate}. Whether that period has passed is for the Court on the record before it; this petition computes no period.`;

  // What the repository holds is addressed to the participant before filing,
  // not pleaded. "I know whether my record shows this" is not an allegation a
  // court can act on, and the answer decides what the relief is worth rather
  // than whether it is available.
  const repositoryStatement = knowsRepositoryStatus
    ? "You said you know whether this arrest appears on your Wyoming criminal history record. If that answer came from memory rather than from the record, check it before you file: a Wyoming criminal history record exists only where an arrest fingerprint card was submitted to the Division of Criminal Investigation."
    : "You said you do not know whether this arrest reached the state central repository at the Division of Criminal Investigation. A Wyoming criminal history record exists only where an arrest fingerprint card was submitted, and the Division cannot create an arrest event from court documents alone, so a person may have a court record and no criminal history record, or the reverse. Request a personal criminal history record from the Criminal Records Unit and read it before you file: it changes what this relief is worth rather than whether it is available.";

  const captionPartyLines = chargesFiled
    ? ["STATE OF WYOMING,", "Plaintiff,", "vs.", "______________________,", "Defendant."]
    : [
        "IN THE MATTER OF THE EXPUNGEMENT",
        "OF THE RECORDS OF THE ARREST OF",
        "______________________,",
        "Petitioner.",
        "No criminal case was commenced."
      ];

  return {
    ...echoInputs(trackId, answers),

    wyCourtLine: captionCourtLine(courtName),
    wyCourtName: courtName,
    wyArrestCounty: arrestCounty,

    wyCaptionPartyLine1: captionPartyLines[0],
    wyCaptionPartyLine2: captionPartyLines[1],
    wyCaptionPartyLine3: captionPartyLines[2],
    wyCaptionPartyLine4: captionPartyLines[3],
    wyCaptionPartyLine5: captionPartyLines[4],
    wyCaptionCaseNumberLine: chargesFiled ? `Case No. ${caseNumber}` : "Case No. ______________",
    wyCaptionCaseNumberNote: chargesFiled
      ? "The case in which the proceeding occurred."
      : "To be assigned by the clerk.",

    wyNoIdentityQuestionStatement: NO_IDENTITY_QUESTION_STATEMENT,
    wyCaseNumberLineStatement: chargesFiled
      ? "The case number in the caption above is the one you gave. Check it against the charging document or the order of dismissal before you file."
      : "Case number: ______________________________  There is no existing case. The clerk assigns a number when this petition opens a new matter in the court that would have had jurisdiction, and it goes on this line and into the caption above.",

    wyNoStatewideFormStatement: NO_STATEWIDE_FORM_STATEMENT,
    wyLocalFormStatement: LOCAL_FORM_STATEMENT,

    wyVenueStatement: chargesFiled
      ? `This petition is filed in ${courtName}, the court in which the proceeding occurred, as Wyo. Stat. § 7-13-1401 requires.`
      : `No criminal case was ever commenced, so there is no existing proceeding. This petition is filed in ${courtName}, the court that would have had jurisdiction over the matter, and it opens a new matter there.`,
    wyArrestStatement: `The Petitioner states that the arrest took place on ${arrestDate}, in ${arrestCounty}, Wyoming.`,
    wyChargesStatement: chargesFiled
      ? "The Petitioner states that criminal charges were filed as a result of this arrest."
      : "The Petitioner states that no criminal charges were filed as a result of this arrest, so there is no existing case and no case number.",
    wyDispositionStatement: dispositionStatement,
    wyWaitingPeriodStatement: waitingPeriodStatement,
    wyPendingChargesStatement:
      "The Petitioner states that no formal charges are pending against them, in Wyoming or anywhere else.",
    wyDeferralStatement:
      "The Petitioner states that no charge arising from this incident ended in a disposition under Wyo. Stat. § 7-13-301, § 35-7-1037 or former § 7-13-203, and that no such disposition was entered to any different or lesser charge arising from the same incident.",
    wyRecordsSoughtStatement:
      "The records the Petitioner asks the Court to expunge are the records of this arrest, of any charge arising from it and of its disposition, as Wyo. Stat. § 7-13-1401 defines a record. This petition reaches no federal, tribal or out-of-state record, and no investigatory file held by an agency solely for criminal justice purposes.",
    wyRepositoryStatement: repositoryStatement,

    wyEffectStatement: EFFECT_STATEMENT,
    wyNotAssertedStatement: NOT_ASSERTED_STATEMENT,
    wyNoPeriodComputedStatement: NO_PERIOD_COMPUTED_STATEMENT,
    wyFeeStatement: FEE_STATEMENT,
    wyServiceRecipientStatement: SERVICE_RECIPIENT_STATEMENT,
    wyVerificationPageStatement: VERIFICATION_PAGE_STATEMENT,
    wyReferralLine: WY_LAWYER_REFERRAL,

    wyOrderPeriodFinding: dismissed
      ? "(  ) that at least one hundred and eighty days have passed since the date the charges were dismissed;"
      : "(  ) that at least one hundred and eighty days have passed since the date of the arrest;",

    packetCaseReference: chargesFiled ? caseNumber : "New matter, no case number assigned"
  };
}

// ---------------------------------------------------------------------------
// Shared template parts
// ---------------------------------------------------------------------------

type Section = { heading?: string; numbered?: boolean; paragraphs: readonly string[] };

/**
 * The caption party block.
 *
 * Five rows, tight rather than double-spaced. Four blank rows between them
 * looked conventional and cost fifty-six points on every document in the
 * packet, which was enough to push the proposed order's execution block onto a
 * second page — a judge's signature line on a page carrying no caption and no
 * ordering language.
 *
 * Every row is a placeholder because both caption shapes fill all five. Where a
 * row genuinely has no content the literal empty string is used instead: an
 * empty placeholder VALUE is rendered as a fill-in rule and reported as an
 * absent value, which is the opposite of nothing.
 */
const CAPTION_LEFT: readonly string[] = [
  "{{wyCaptionPartyLine1}}",
  "{{wyCaptionPartyLine2}}",
  "{{wyCaptionPartyLine3}}",
  "{{wyCaptionPartyLine4}}",
  "{{wyCaptionPartyLine5}}"
];

const captionRight = (documentLine: string): readonly string[] => [
  "{{wyCaptionCaseNumberLine}}",
  "{{wyCaptionCaseNumberNote}}",
  "",
  documentLine
];

const COMPLETE_BY_HAND_SECTION: Section = {
  heading: "COMPLETE THESE LINES BEFORE FILING",
  numbered: false,
  paragraphs: [
    "{{wyNoIdentityQuestionStatement}}",
    "Petitioner's full legal name: __________________________________________",
    "{{wyCaseNumberLineStatement}}",
    "Read every statement below against your own record and correct anything that does not match before you sign."
  ]
};

const WHY_DRAFTED_SECTION: Section = {
  heading: "WHY THIS IS A DRAFTED PETITION",
  numbered: false,
  paragraphs: ["{{wyNoStatewideFormStatement}}", "{{wyLocalFormStatement}}", "{{wyVenueStatement}}"]
};

const GROUNDS_SECTION: Section = {
  heading: "I. THE PETITIONER, THE RECORD AND THE GROUNDS",
  numbered: true,
  paragraphs: [
    "The Petitioner is the person named in the caption above, whose name is written in by hand.",
    "{{wyArrestStatement}}",
    "{{wyChargesStatement}}",
    "{{wyDispositionStatement}}",
    "{{wyWaitingPeriodStatement}}",
    "{{wyPendingChargesStatement}}",
    "{{wyDeferralStatement}}",
    "{{wyRecordsSoughtStatement}}"
  ]
};

const NOT_ASSERTED_SECTION: Section = {
  heading: "II. WHAT THIS PETITION DOES NOT SAY",
  numbered: false,
  paragraphs: [
    "{{wyNotAssertedStatement}}",
    "{{wyNoPeriodComputedStatement}}",
    "{{wyEffectStatement}}"
  ]
};

const BEFORE_YOU_FILE_SECTION: Section = {
  heading: "BEFORE YOU FILE",
  numbered: false,
  paragraphs: ["{{wyFeeStatement}}", "{{wyServiceRecipientStatement}}", "{{wyRepositoryStatement}}"]
};

const STOP_SECTION: Section = {
  heading: "WHERE THIS PACKET STOPS",
  numbered: false,
  paragraphs: PACKET_STOPS
};

const PETITION_SIGNATURE_BLOCK: readonly string[] = [
  "",
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Date: ______________________________________",
  "",
  "Sign and date this by hand, in ink, before you file it.",
  "{{wyVerificationPageStatement}}"
];

/**
 * The proposed order's execution block.
 *
 * `signatureLabel` is null on that template, so the renderer draws no
 * participant signature rule at all: a proposed order is signed by the court
 * and by nobody else.
 */
const ORDER_SIGNATURE_BLOCK: readonly string[] = [
  "",
  "_____________________________________",
  "JUDGE OF THE ABOVE-ENTITLED COURT",
  "",
  "Dated: ______________________",
  "",
  "The findings, the date and the signature above are the Court's. They are printed blank, and LegalEase has made no finding, entered nothing and signed nothing."
];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const PETITION: PleadingTemplate = {
  templateId: `${WY_NONCONVICTION_TRACK}-petition`,
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{wyCourtLine}}",
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight("PETITION FOR EXPUNGEMENT")
  },
  title: "VERIFIED PETITION FOR EXPUNGEMENT OF RECORDS OF ARREST, DISMISSAL OF CHARGES OR DISPOSITION",
  preamble:
    "The Petitioner, appearing without a lawyer, petitions this Court under Wyo. Stat. § 7-13-1401 for the relief set out below, and states as follows. LegalEase prepared this petition from the Petitioner's own answers, has seen no court file and no criminal history record, has decided nothing, represents nobody and has filed nothing.",
  sections: [
    COMPLETE_BY_HAND_SECTION,
    WHY_DRAFTED_SECTION,
    GROUNDS_SECTION,
    NOT_ASSERTED_SECTION,
    BEFORE_YOU_FILE_SECTION,
    STOP_SECTION
  ],
  prayer: [
    "WHEREFORE, the Petitioner asks the Court to expunge the records of the arrest, of any charge and of the disposition described above, as Wyo. Stat. § 7-13-1401 provides; to seal the file in this matter so that it is available for inspection only upon order of the Court; and to direct that a certified copy of its order be transmitted to the Wyoming Division of Criminal Investigation.",
    "Nothing in this petition reports a decision by anybody. It asks."
  ],
  // The statutory verification is its own component in this packet, and it is
  // executed as the final page of this petition. Repeating it here would put
  // two verifications on one document and invite the Petitioner to sign the
  // wrong one.
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: PETITION_SIGNATURE_BLOCK
};

const PROPOSED_ORDER: PleadingTemplate = {
  templateId: `${WY_NONCONVICTION_TRACK}-order`,
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{wyCourtLine}}",
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight("ORDER FOR EXPUNGEMENT")
  },
  title: "PROPOSED ORDER FOR EXPUNGEMENT",
  preamble:
    "This is a proposed order, prepared so that it is available to the Court with the petition it accompanies. Every finding, date and signature below is left blank for the Court. It has been granted by nobody and signed by nobody. Nothing on it reports an act by the Court, by the prosecuting attorney, by a clerk or by the Division of Criminal Investigation.",
  sections: [
    {
      numbered: false,
      paragraphs: [
        "THIS MATTER came before the Court on the Petitioner's verified petition under Wyo. Stat. § 7-13-1401.",
        "The Court, having considered the petition, FINDS:"
      ]
    },
    {
      numbered: false,
      paragraphs: [
        "{{wyOrderPeriodFinding}}",
        "(  ) that no formal charges are pending against the Petitioner;",
        "(  ) that no disposition under Wyo. Stat. § 7-13-301, § 35-7-1037 or former § 7-13-203 was entered to any charge arising from the incident, including to a different or lesser charge; and",
        "(  ) that the Petitioner is eligible for the relief Wyo. Stat. § 7-13-1401 provides."
      ]
    },
    {
      numbered: false,
      paragraphs: [
        "IT IS HEREBY ORDERED that the records of the arrest, of any charge and of the disposition described in the petition be expunged as Wyo. Stat. § 7-13-1401 provides.",
        "The records reached by this order: ____________________________________",
        "______________________________________________________________________",
        "A record left off the lines above is not reached by this order. Those lines are completed by the Petitioner from their own record and are settled by the Court.",
        "IT IS FURTHER ORDERED that the file in this matter be sealed, and that it be available for inspection only upon order of this Court.",
        "IT IS FURTHER ORDERED that a certified copy of this order be transmitted to the Wyoming Division of Criminal Investigation."
      ]
    }
  ],
  prayer: [],
  // A proposed order is signed by the court. Emitting a participant signature
  // rule on one would invite the wrong person to sign it.
  signatureLabel: null,
  signatureBlock: ORDER_SIGNATURE_BLOCK
};

const VERIFICATION: PleadingTemplate = {
  templateId: `${WY_NONCONVICTION_TRACK}-verification`,
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{wyCourtLine}}",
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight("VERIFICATION")
  },
  title: "VERIFICATION OF PETITION FOR EXPUNGEMENT",
  preamble:
    "Wyo. Stat. § 7-13-1401 requires the petition to be verified by the Petitioner. This page is that verification. It is executed as the final page of the Verified Petition for Expungement in this packet and is filed with it; a petition filed without it is not a verified petition.",
  sections: [
    {
      heading: "COMPLETE THESE LINES BEFORE SIGNING",
      numbered: false,
      paragraphs: [
        "Petitioner's full legal name: __________________________________________",
        "Read the petition this page verifies from beginning to end before you sign. What you are signing is the truth of the statements in it, and every one of them came from your own answers."
      ]
    },
    {
      heading: "IF THIS COURT REQUIRES AN OATH",
      numbered: false,
      paragraphs: [
        "Verification is required by the statute. Whether the clerk of the filing court requires the verification to be sworn before a notary is that court's own requirement, and it was not established here. Ask that clerk before you sign, and use the block below only if the answer is yes.",
        "State of ____________________  )",
        "County of ___________________  )",
        "Subscribed and sworn to before me on ______________________.",
        "______________________________________  Notary Public",
        "My commission expires: ________________",
        "The notary block above is completed by a notary and by nobody else. LegalEase has administered no oath and witnessed no signature."
      ]
    },
    // The sworn words are a section with a heading rather than the engine's
    // `verification` field. The engine reserves a heading, its gap and the
    // first line of the section under it so a heading is never the last thing
    // on a page; it makes no such reservation for the "VERIFICATION" heading it
    // writes itself, and on this component that heading landed alone at the
    // foot of page one with the words it names overleaf.
    {
      heading: "VERIFICATION",
      numbered: false,
      paragraphs: [
        "I am the Petitioner named in the caption above. I have read the Verified Petition for Expungement that this page verifies, and the statements in it are mine and are true to the best of my knowledge and belief. I understand that nobody at LegalEase has seen my court file or my criminal history record, decided whether I am eligible, obtained anything from the prosecuting attorney, or given me legal advice, and that whether this relief is granted is for the Court to decide."
      ]
    }
  ],
  prayer: [],
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: [
    "",
    "Printed name: ______________________________",
    "Date: ______________________________________",
    "",
    "Sign and date this by hand, in ink, at the same time as the petition it verifies."
  ]
};

const CERTIFICATE_OF_SERVICE: PleadingTemplate = {
  templateId: `${WY_NONCONVICTION_TRACK}-certificate-of-service`,
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{wyCourtLine}}",
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight("CERTIFICATE OF SERVICE")
  },
  title: "CERTIFICATE OF SERVICE ON THE PROSECUTING ATTORNEY",
  preamble:
    "Complete and sign this only after you have actually served the prosecuting attorney. Until then it certifies nothing, and it must not be filed as though service had already been made. Nobody at LegalEase has served anybody in this matter.",
  sections: [
    {
      heading: "WHO IS SERVED",
      numbered: false,
      paragraphs: [
        "{{wyServiceRecipientStatement}}",
        "No address is printed here. Write in the office you actually serve, from your own look-up or from the clerk, so that what this page certifies is what happened."
      ]
    },
    {
      heading: "THE CERTIFICATE",
      numbered: false,
      paragraphs: [
        // "The foregoing" would be true only where this page happens to sit
        // behind the petition. It is its own component and may be separated
        // from it, so it names the document instead of pointing at it.
        "I certify that on the date written below I served a copy of the Verified Petition for Expungement filed in this matter on the prosecuting attorney, at the address written below, by the method marked.",
        "Prosecuting attorney served: __________________________________________",
        "Address: ______________________________________________________________",
        "Method:  (  ) hand delivery   (  ) United States mail, postage prepaid   (  ) as the court's electronic filing system provides",
        "Date of service: ______________________________________________________"
      ]
    },
    {
      heading: "WHY THE DATE MATTERS",
      numbered: false,
      paragraphs: [
        "Wyo. Stat. § 7-13-1401 runs its objection window from service on the prosecuting attorney, so the date written above is what governs when an order may be entered. Write it in when service is actually made, and not before."
      ]
    }
  ],
  prayer: [],
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: [
    "",
    "Printed name: ______________________________",
    "",
    "Sign and date this by hand, in ink, after service has been made, and file it with the clerk."
  ]
};

export const WY_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [PETITION.templateId]: PETITION,
  [PROPOSED_ORDER.templateId]: PROPOSED_ORDER,
  [VERIFICATION.templateId]: VERIFICATION,
  [CERTIFICATE_OF_SERVICE.templateId]: CERTIFICATE_OF_SERVICE
};

// ---------------------------------------------------------------------------
// Packet set and track
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * Design role → engine role.
 *
 * `verification` is not one of the engine's closed component roles. It maps to
 * `affidavit`, which is the engine's role for a sworn or verified statement the
 * participant signs in support of a filing, and which Nevada already uses for
 * its `declaration_and_verification` component. The design role stays the
 * design's; only the engine value is translated, and the component id keeps the
 * design's own name.
 */
export const WY_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order",
  verification: "affidavit",
  certificate_of_service: "certificate_of_service"
};

const NONCONVICTION_PACKET_SET: PacketSet = {
  packetSetId: `${WY_NONCONVICTION_TRACK}-set`,
  version: VERSION,
  components: [
    {
      componentId: `${WY_NONCONVICTION_TRACK}-primary-filing-1`,
      role: WY_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: PETITION.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${WY_NONCONVICTION_TRACK}-proposed-order-2`,
      role: WY_DESIGN_ROLE_TO_ENGINE_ROLE.proposed_order,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: PROPOSED_ORDER.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 2,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${WY_NONCONVICTION_TRACK}-verification-3`,
      role: WY_DESIGN_ROLE_TO_ENGINE_ROLE.verification,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: VERIFICATION.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 3,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${WY_NONCONVICTION_TRACK}-certificate-of-service-4`,
      role: WY_DESIGN_ROLE_TO_ENGINE_ROLE.certificate_of_service,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: CERTIFICATE_OF_SERVICE.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 4,
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

/**
 * The open release blocker.
 *
 * The narrowed remainder of the local-template question — unpublished county
 * filing preferences — is carried at release level on this track. It permits
 * the build and forbids readiness, and it is declared here so that readiness
 * cannot be reached by an implementation alone.
 */
export const WY_OPEN_RELEASE_BLOCKERS = 1;

const NONCONVICTION_INPUTS: readonly RequiredInput[] = [
  { key: "arrestDate", label: "On what date were you arrested?", required: true },
  {
    key: "arrestCounty",
    label: "In which Wyoming county were you arrested, or in which county would the case have been handled?",
    required: true
  },
  {
    key: "chargesFiled",
    label: "Were any criminal charges ever filed as a result of this arrest? Answer yes or no.",
    required: true
  },
  {
    key: "caseNumber",
    label:
      "What is the case number? Asked only where charges were filed. Where none were filed there is no case number, and the clerk assigns one when the petition opens a new matter.",
    required: false
  },
  {
    key: "courtName",
    label: "Which court handled the case, or which court would have handled it?",
    required: true
  },
  {
    key: "qualifyingDisposition",
    label:
      "Which of these describes the outcome — you were not convicted of any charge relating to the event, no charges of any kind were filed, or the prosecutor or the court dismissed all charges relating to the event? Answer not_convicted, no_charges_filed, dismissed_by_prosecutor or dismissed_by_court.",
    required: true
  },
  {
    key: "dispositionDate",
    label:
      "On what date were the charges dismissed, or the case otherwise ended? Asked where charges were filed, because on a dismissal the one-hundred-and-eighty-day period runs from that date.",
    required: false
  },
  {
    key: "deferredDisposition",
    label:
      "Was this matter handled through deferred prosecution, first-offender treatment, probation before judgment, or a dismissal after you completed probation? Answer yes or no.",
    required: true
  },
  {
    key: "deferralToLesserCharge",
    label:
      "Did any charge arising from this same incident end in a deferred disposition, including a deferral entered on a different or lesser charge than the one you were arrested for? Answer yes or no. This is the question that decides whether this route is available at all.",
    required: true
  },
  {
    key: "deferralUnderlyingLevel",
    label:
      "Was the matter that was deferred a misdemeanor or a felony? Asked only where a deferral is reported. Answer misdemeanor or felony.",
    required: false
  },
  {
    key: "pendingCharges",
    label: "Do you have any criminal charges pending against you right now, anywhere? Answer yes or no.",
    required: true
  },
  {
    key: "dciRecordStatus",
    label:
      "Do you know whether this arrest appears on your Wyoming Division of Criminal Investigation criminal history — for example, were you fingerprinted at the time of arrest? Answer yes or no.",
    required: true
  }
];

export const WY_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "WY",
    trackId: WY_NONCONVICTION_TRACK,
    publicName: "Clear an arrest or dismissed charge",
    mechanism:
      "verified_petition_to_expunge_the_records_of_an_arrest_a_dismissed_charge_or_a_non_conviction_disposition",
    authority: "Wyo. Stat. § 7-13-1401",
    recordTypes: ["arrest", "charge", "disposition"],
    dispositions: ["not_convicted", "no_charges_filed", "dismissed_by_prosecutor", "dismissed_by_court"],
    courtLevel: "the_wyoming_court_in_which_the_proceeding_occurred_or_would_have_occurred",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: NONCONVICTION_PACKET_SET,
    requiredInputs: NONCONVICTION_INPUTS,
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "custom_pleading",
        openReleaseBlockers: WY_OPEN_RELEASE_BLOCKERS
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "wy-7-13-1401-expungement-petition",
    assembledPacketTitle: "Wyoming verified petition for expungement — Wyo. Stat. § 7-13-1401, with proposed order",
    customerDeliverableDescription:
      "A verified petition under Wyo. Stat. § 7-13-1401 in the participant's own court, captioned into the existing criminal case where one exists and opening a new matter where no charges were ever filed; a proposed Order for Expungement carrying the sealing direction and the direction that a certified copy be transmitted to the Division of Criminal Investigation, whose findings, date and signature are printed blank for the Court; the statutory verification, executed as the final page of the petition; and a certificate of service on the prosecuting attorney, written entirely in the future and completed by the participant when service is actually made. The statutory filing fee on this route is $0 and is stated as the statute setting no fee rather than as a waiver.",
    notes:
      "Wyoming publishes no statewide petition form and no statewide proposed-order template, which the integrated decision wy-published-source-filing-requirements records as an affirmative custom-pleading conclusion rather than a gap; no statewide form number exists and none is cited. No summons and no praecipe are generated: neither is required by the statewide statutes or the published statewide guidance on this route. The prosecuting attorney is the service recipient and the Division of Criminal Investigation is not. Casper Municipal Court is a separate local override that binds that court alone and no Casper form is used here, statewide or in Natrona County. The twenty-three-county survey of unpublished local filing preferences is open at release level and does not gate generation, which is why the documents send the participant to the clerk of their own filing court rather than stating a local requirement. The fifth component of this packet, the filing, service and timing sheet, is process guidance and belongs to another lane; it is not implemented here and this packet is not filing-complete without it. wy_misd_1501 and wy_fel_1502 are excluded from this assignment and no document names either as a route this packet produces."
  }
];
