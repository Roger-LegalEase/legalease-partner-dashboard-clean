// West Virginia record clearing — custom-pleading implementation.
//
// Two assigned routes, six assigned custom-pleading components. The two are
// unrelated mechanisms that happen to share a state and a drafting problem.
//
//   wv_drug_conditional_discharge   W. Va. Code § 60A-4-407(b). A first
//       controlled-substance possession case handled under § 60A-4-401(c)
//       WITHOUT a judgment of guilt: proceedings deferred, probation, then
//       discharge and dismissal. Not less than six months after the PROBATION
//       TERM EXPIRES — not after the dismissal — the person may apply to the
//       same court to expunge all recordations of the arrest, trial and
//       conviction, and the court shall order it after a hearing unless it
//       finds a serious or repeated violation of the conditions of probation.
//       One discharge and dismissal per person, ever.
//
//   wv_pardon_expungement            W. Va. Code § 5-1-16a. A person holding a
//       full and unconditional pardon from the Governor may petition the
//       circuit court of the county where the conviction was had. Two waiting
//       periods must BOTH be satisfied: one year from the pardon, and five
//       years from discharge of the sentence. The petition is served on the
//       prosecuting attorney, and the petitioner must publish notice of the
//       time and place the petition will be made as a Class I legal
//       advertisement in the county of filing.
//
// The five `process_guidance` components the design assigns beside them — the
// records checklists, the filing instructions and the publication instructions
// — belong to the guidance lane. They are named here as excluded, and nothing
// in this module produces them.
//
// **Why these are custom pleadings at all.** The West Virginia Judiciary's
// Court Forms index publishes exactly five expungement forms — SCA-C900,
// SCA-C903, SCA-C906, SCA-C907 and SCA-C912 — and none is a § 60A-4-407
// application or a § 5-1-16a petition. The design read the index at source and
// answered the review's build blocker in the negative on that basis, which is
// the trigger for drafting rather than a blocker on it. The design further
// directs that a drafted West Virginia pleading follow the shape circuit clerks
// expect: the § 61-11-26(d) contents model for what a petition states and the
// § 61-11-26(e) model for service. Both documents follow that shape. Neither
// reproduces a statutory list this module has not read, and neither claims to.
//
// **Three release questions the design leaves open, preserved rather than
// resolved.** Each is printed as an open question in the participant's own copy
// and none is turned into a conclusion:
//
//   1. Whether § 60A-4-407 relief spends the once-per-lifetime petition in
//      § 61-11-26(o). Section 61-11-26(o) reaches §§ 61-11-26 and 61-11-26a on
//      its face and § 60A-4-407 carries no cross-reference, so the textual
//      reading is that they are separate limits — but the design records that
//      the consequence of getting it wrong is permanent, and anyone also
//      considering a § 61-11-26 expungement is stopped and sent to a lawyer.
//   2. Whether § 60A-4-407a imposes conditions bearing on the subsection (b)
//      application or only on the antecedent discharge. Noted at source, not
//      read in full, so the application does not plead around it.
//   3. Whether § 5-1-16a(b) is the whole of a pardon expungement's effect. It
//      was read at source and provides only that the expunged record may not be
//      considered in an application to a West Virginia educational institution
//      or for a West Virginia professional licence. Unlike §§ 61-11-25(e) and
//      61-11-26(l) it carries no general non-disclosure clause, so the packet
//      states the protection the subsection actually gives and no more.
//
// **What is left blank, on both routes.** Every judicial finding, signature,
// date and entry; the hearing date and time, which the court fixes; the notary's
// jurat on the affidavit; the prosecuting attorney's and probation office's
// addresses; the certificate-of-service date and signature; the clerk's case
// number where a new one is assigned; and the newspaper, the publication dates
// and the publisher's affidavit. No document states a filing fee: § 60A-4-407
// charges none for the application, § 5-1-16a states none, and whether a circuit
// clerk charges a civil-action fee on either is not established.
//
// **What LegalEase must never assert here.** The design's sharpest boundary on
// the drug route is that no document may carry any assertion about the
// participant's probation-violation history: whether there was a serious or
// repeated violation is the court's finding under § 60A-4-407(b), and a
// participant who reports any allegation of one is stopped rather than drafted
// for. On the pardon route, nothing asserts that the pardon is full and
// unconditional as a legal conclusion — the participant states what the
// instrument says, and the court verifies the act of pardon.
//
// Every template is DRAFT PENDING LEGAL REVIEW. Both tracks are
// `technicalFixture` and `runtimeDisabled`: nothing here reaches a runtime
// surface, and wiring these tracks into the shared registry and template pack is
// the integration captain's step, not this job's.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED PARTY — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referral destinations
//
// Every stop names one of these. None is the node that raised the stop, and
// none carries a telephone number or street address the design never supplied.
// ---------------------------------------------------------------------------

/** Where a stop that needs individual legal advice sends the participant. */
export const WV_LAWYER_REFERRAL =
  "A West Virginia lawyer — through the West Virginia State Bar's lawyer referral service, or a legal-aid office serving the county where the case was heard.";

/** Where a stop about the case file, the caption or the fee sends them. */
export const WV_CLERK_REFERRAL =
  "The clerk of the court that handled the case, who holds the file and the orders and is the one office that can say what that court requires of a self-drafted filing.";

/** Where a stop about the probation term or its expiry sends them. */
export const WV_PROBATION_REFERRAL =
  "The probation office that supervised the term, for written confirmation of the date the probation term expired — which is the date the six-month period runs from.";

/** Where a stop about the pardon instrument sends them. */
export const WV_PARDON_RECORD_REFERRAL =
  "The Office of the Governor, for the instrument of pardon itself, which is the document that says on its face whether the pardon is full and unconditional.";

/** Where a stop about the sentence discharge date sends them. */
export const WV_SENTENCE_RECORD_REFERRAL =
  "The circuit clerk of the county of conviction, and the Division of Corrections and Rehabilitation where supervision was involved, for the record showing the date the sentence was discharged.";

/** Where a request outside these two routes goes. */
export const WV_OUT_OF_SCOPE_REFERRAL =
  "Outside these two West Virginia routes. LegalEase's West Virginia routing covers the § 61-11-25 and § 61-11-26 mechanisms separately, and anything not covered belongs with a lawyer before anything is filed.";

/** The closed set of destinations. A stop may not invent a seventh. */
export const WV_REFERRALS: readonly string[] = [
  WV_LAWYER_REFERRAL,
  WV_CLERK_REFERRAL,
  WV_PROBATION_REFERRAL,
  WV_PARDON_RECORD_REFERRAL,
  WV_SENTENCE_RECORD_REFERRAL,
  WV_OUT_OF_SCOPE_REFERRAL
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class WestVirginiaEligibilityStopError extends Error {
  readonly code = "west_virginia_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "WestVirginiaEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class WestVirginiaBranchError extends Error {
  readonly code = "west_virginia_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "WestVirginiaBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

export const WV_DRUG_TRACK_ID = "wv_drug_conditional_discharge";
export const WV_PARDON_TRACK_ID = "wv_pardon_expungement";

/** The two assigned routes, held closed so no other track can derive here. */
export const WV_ASSIGNED_TRACK_IDS: readonly string[] = [
  WV_DRUG_TRACK_ID,
  WV_PARDON_TRACK_ID
];

/** The only two answers a yes-or-no screen accepts. No default, no coercion. */
export const WV_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/**
 * What the pardon instrument says on its face.
 *
 * Only a full and unconditional pardon opens § 5-1-16a. "Unsure" is a distinct
 * answer rather than a coerced no, because the design makes uncertainty about
 * the pardon's character its own stop: the instrument settles it and LegalEase
 * has not read the instrument.
 */
export const WV_PARDON_TYPES: Readonly<
  Record<string, "full_and_unconditional" | "conditional" | "unsure">
> = {
  full_and_unconditional: "full_and_unconditional",
  "full and unconditional": "full_and_unconditional",
  full: "full_and_unconditional",
  conditional: "conditional",
  "conditional pardon": "conditional",
  unsure: "unsure",
  "not sure": "unsure"
};

/**
 * Answer keys that would carry outside-party work into a West Virginia packet.
 *
 * Nothing in the adopted design declares any of them. Their presence means a
 * caller is trying to have LegalEase supply the court's finding, the judge's
 * signature or date, the clerk's certification, the hearing date and time, the
 * notary's jurat, a completed service fact, or the publisher's affidavit. On the
 * drug route § 60A-4-407(b) puts the probation-violation finding and the order
 * on the court; on the pardon route § 5-1-16a puts the verification of the
 * pardon and the good-cause finding there, and the publisher's affidavit is the
 * newspaper's.
 */
export const WV_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "affidavitOfPublication",
  "clerkCertification",
  "courtFinding",
  "expungementOrder",
  "filingDate",
  "hearingDate",
  "hearingTime",
  "judgeSignature",
  "notaryJurat",
  "prosecutorConsent",
  "publisherAffidavit",
  "serviceCompletedDate"
];

/**
 * Keys a caller may volunteer that route the matter away rather than into a
 * document.
 *
 * The design records firearm rights, immigration consequences, professional
 * licensing and federal, tribal, military or out-of-state records as self-help
 * stops on both routes, and separately forbids the packet from speaking to any
 * of them. So LegalEase does not ask; where a caller supplies one anyway, the
 * route stops and refers, which is a routing decision rather than advice.
 */
export const WV_SCREENED_ROUTING_KEYS: readonly string[] = [
  "firearmRights",
  "immigrationStatus",
  "otherJurisdictionRecords",
  "section611126Petition"
];

// ---------------------------------------------------------------------------
// Answer helpers
// ---------------------------------------------------------------------------

type Answers = Record<string, unknown>;

const str = (answers: Answers, key: string): string => {
  const value = answers[key];
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean).join("\n");
  }
  return String(value).trim();
};

/**
 * Declared rather than assigned, so TypeScript narrows after it.
 *
 * A `never`-returning arrow held in a const does not end a control-flow branch
 * for the compiler, which leaves every value screened by a stop still typed as
 * possibly null on the line after the stop.
 */
function stop(
  stopId: string,
  trackId: string,
  reason: string,
  referral: string,
  nextStep: string
): never {
  throw new WestVirginiaEligibilityStopError(stopId, trackId, reason, referral, nextStep);
}

/** Phrases that mean the participant cannot answer from the record. */
const UNKNOWN_ANSWER =
  /\b(don'?t know|do not know|not sure|unsure|no idea|unknown|can'?t remember|cannot remember|can'?t recall|cannot recall|not certain|maybe|possibly)\b/i;

/** True where the answer at least states a year, which is what a recital needs. */
const statesAYear = (raw: string): boolean => /\b(19|20)\d{2}\b/.test(raw);

const yearIn = (raw: string): number | null => {
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
};

const need = (
  trackId: string,
  answers: Answers,
  key: string,
  referral: string = WV_CLERK_REFERRAL
): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "wv-answer-missing",
      trackId,
      `This packet needs an answer to ${key} before anything can be prepared, and none was given. West Virginia publishes no Judiciary form for either of these routes, so every field on the filing — the court, the county, the case number, the dates and the offence — comes from the participant's own answers and none of it can be defaulted.`,
      referral,
      "Get the case file and the orders from the clerk of the court that handled the case, then answer the question from the record rather than from memory."
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
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new WestVirginiaBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), WV_YES_NO);

/** A phrase that asserts the screened condition rather than denying it. */
const ASSERTS_SCREENED =
  /\b(yes|i (do|am|have)|pending|applying|considering|not a (us|u\.s\.|united states) citizen|non[- ]?citizen|green card|federal|tribal|military|another state|out[- ]of[- ]state)\b/i;

// ---------------------------------------------------------------------------
// Screens that run on both routes, in this order
// ---------------------------------------------------------------------------

/**
 * Refuses to build a West Virginia packet out of outside-party content.
 *
 * Run first, before any other screen, so that a caller passing a judicial
 * finding, a hearing date, a notary's jurat, a completed service fact or the
 * publisher's affidavit gets a stop rather than a document that reads as though
 * the court, the notary or the newspaper had already acted.
 */
function refuseOutsidePartyContent(trackId: string, answers: Answers): void {
  const supplied = WV_OUTSIDE_PARTY_KEYS.filter((key) => str(answers, key).length > 0);
  if (supplied.length === 0) return;
  stop(
    "wv-outside-party-content-refused",
    trackId,
    `Content was supplied for ${supplied.join(", ")}. Every one of those belongs to somebody else: the probation-violation finding and the expungement order are the court's under § 60A-4-407(b); the verification of the pardon and the good-cause finding are the court's under § 5-1-16a; the hearing's time and place are fixed by the court or the clerk; the jurat is the notary's; the affidavit of publication is the newspaper's; and service is an act the participant performs after this packet is made. LegalEase produces none of them and will not print one.`,
    WV_CLERK_REFERRAL,
    "File the packet, serve it yourself, swear the affidavit before a notary, and let the court fix the hearing and make its own findings. Ask the clerk for a certified copy once an order is entered."
  );
}

/** Routes away a matter the design puts outside self-help entirely. */
function screenRouting(trackId: string, answers: Answers): void {
  const petition = str(answers, "section611126Petition");
  if (petition && ASSERTS_SCREENED.test(petition)) {
    stop(
      "wv-section-61-11-26-interaction-unresolved",
      trackId,
      "The answers say a § 61-11-26 conviction expungement is also being pursued or considered. Whether relief under these sections spends the once-per-lifetime petition in § 61-11-26(o) is an open question: subsection (o) reaches §§ 61-11-26 and 61-11-26a on its face and neither § 60A-4-407 nor § 5-1-16a carries a cross-reference to it, but the textual reading is not a ruling and the consequence of getting it wrong is permanent. LegalEase will not spend a once-per-lifetime petition on a reading it cannot guarantee.",
      WV_LAWYER_REFERRAL,
      "Take both routes to a West Virginia lawyer and decide the order to use them in before filing anything."
    );
  }
  for (const key of ["firearmRights", "immigrationStatus", "otherJurisdictionRecords"]) {
    const value = str(answers, key);
    if (value && ASSERTS_SCREENED.test(value)) {
      stop(
        "wv-collateral-consequence-attorney-only",
        trackId,
        `The answers raise ${key}. The design makes firearm rights, immigration consequences, professional licensing and federal, tribal, military or out-of-state records self-help stops on both West Virginia routes, and separately forbids this packet from saying anything about any of them. Both rules point the same way: these are questions for a lawyer before anything is filed, and not ones a prepared document should answer.`,
        WV_LAWYER_REFERRAL,
        "Speak to a lawyer about the consequence you are asking about before filing an expungement in West Virginia."
      );
    }
  }
}

/**
 * The one optional answer this module reads that the design does not declare.
 *
 * Both routes carry waiting periods, and a self-help packet that cannot notice
 * an obviously premature filing is worse than one that can. But LegalEase makes
 * no eligibility determination and holds no clock: reading the wall clock would
 * also make every rendered fixture non-deterministic. So the check runs only
 * where the participant states the date they are preparing the packet, it is
 * never required, and it can only ever stop — it never concludes that a period
 * has run. Where it is absent the filing simply recites the participant's dates
 * and leaves the arithmetic to the court.
 */
export const WV_PREPARATION_DATE_KEY = "preparationDate";

function screenElapsed(
  trackId: string,
  answers: Answers,
  fromDate: string,
  requiredYears: number,
  stopId: string,
  reason: string,
  referral: string,
  nextStep: string
): void {
  const preparation = str(answers, WV_PREPARATION_DATE_KEY);
  if (!preparation) return;
  const preparationYear = yearIn(preparation);
  const fromYear = yearIn(fromDate);
  if (preparationYear === null || fromYear === null) return;
  if (preparationYear - fromYear >= requiredYears) return;
  stop(stopId, trackId, reason, referral, nextStep);
}

// ---------------------------------------------------------------------------
// wv_drug_conditional_discharge — W. Va. Code § 60A-4-407(b)
// ---------------------------------------------------------------------------

function deriveDrugFacts(answers: Answers): Record<string, string> {
  const trackId = WV_DRUG_TRACK_ID;

  const applicantName = need(trackId, answers, "applicantName");
  const dateOfBirth = need(trackId, answers, "dateOfBirth");
  const courtAndCounty = need(trackId, answers, "courtAndCounty");
  const caseNumber = need(trackId, answers, "caseNumber");
  const arrestDate = need(trackId, answers, "arrestDate");
  const offenseCharged = need(trackId, answers, "offenseCharged");
  const dischargeOrderDate = need(trackId, answers, "dischargeOrderDate");
  const probationTerm = need(trackId, answers, "probationTerm");
  const probationExpiryDate = need(trackId, answers, "probationExpiryDate", WV_PROBATION_REFERRAL);
  const dismissalDate = need(trackId, answers, "dismissalDate");

  if (UNKNOWN_ANSWER.test(courtAndCounty)) {
    stop(
      "wv-venue-not-identified",
      trackId,
      "Which court, and in which county, placed the applicant on probation has not been identified. Section 60A-4-407(b) directs the application to 'the court' — the court whose probation expired — so the venue is that court and nothing else, and the caption names it. It cannot be defaulted.",
      WV_CLERK_REFERRAL,
      "Take the court and county off the conditional discharge order rather than from memory, and answer again."
    );
  }

  // The date the probation TERM expired, not the date of dismissal, is what the
  // six-month period runs from. It is the single most confusable date on this
  // route and the design says so expressly.
  if (UNKNOWN_ANSWER.test(probationExpiryDate) || !statesAYear(probationExpiryDate)) {
    stop(
      "wv-probation-expiry-not-established",
      trackId,
      "The date the probation term expired has not been established. Section 60A-4-407(b) runs its six-month period from the expiration of the term of probation, not from the date of the discharge and dismissal, so this is the date the whole timing question turns on. The design makes the probation office's written confirmation of it a document to obtain before filing.",
      WV_PROBATION_REFERRAL,
      "Ask the probation office for written confirmation of the date your probation term expired, take the date from that document, and answer again."
    );
  }
  if (UNKNOWN_ANSWER.test(dischargeOrderDate) || !statesAYear(dischargeOrderDate)) {
    stop(
      "wv-discharge-order-not-established",
      trackId,
      "The date the court entered the order deferring proceedings and placing the applicant on probation has not been established. That order is what makes the case a § 60A-4-407 conditional discharge rather than an ordinary conviction, the application recites it, and it is a document to obtain before filing.",
      WV_CLERK_REFERRAL,
      "Ask the clerk for a certified copy of the conditional discharge order and of the order of discharge and dismissal, take the dates off them, and answer again."
    );
  }

  screenElapsed(
    trackId,
    answers,
    probationExpiryDate,
    1,
    "wv-six-month-window-not-open",
    "On the dates given, the application is being prepared in the same year the probation term expired and the six-month period plainly cannot have run. Section 60A-4-407(b) allows the application only after a period of not less than six months beginning immediately on the expiration of the term of probation. This packet does not decide eligibility; it declines to prepare an application the dates in front of it say is early.",
    WV_PROBATION_REFERRAL,
    "Work the six months out from the written confirmation of your probation expiry date, and come back once the period has run."
  );

  // The design's sharpest boundary on this route: no document may carry any
  // assertion about the probation-violation history, because the finding is the
  // court's. A participant who reports an allegation is stopped, not drafted for.
  if (yesNo(trackId, answers, "probationViolations")) {
    stop(
      "wv-probation-violation-alleged",
      trackId,
      "Someone has alleged that the conditions of probation were broken, whether during the term or since. Section 60A-4-407(b) makes the court's determination that there was no serious or repeated violation the condition of the expungement, and the design forbids LegalEase from generating any assertion at all about the applicant's probation-violation history. An application that walked into a contested violation question would be arguing a point this packet is not allowed to take a position on.",
      WV_LAWYER_REFERRAL,
      "Take the probation file and any violation paperwork to a lawyer before applying. If the allegation is resolved in your favour, come back."
    );
  }

  if (yesNo(trackId, answers, "priorDrugConviction")) {
    stop(
      "wv-prior-drug-conviction",
      trackId,
      "There is a prior drug conviction. Section 60A-4-407(a) opens the conditional discharge only to a person not previously convicted of an offence under chapter 60A or under any federal or state statute relating to narcotic drugs, marihuana, or stimulant, depressant or hallucinogenic drugs. Where that is not so, the design records that the underlying discharge should not have been available, and whether the subsection (b) application survives is a question this packet cannot answer.",
      WV_LAWYER_REFERRAL,
      "Take your complete criminal record and the conditional discharge order to a lawyer before applying."
    );
  }

  if (yesNo(trackId, answers, "priorConditionalDischarge")) {
    stop(
      "wv-prior-conditional-discharge",
      trackId,
      "There has already been a conditional discharge under § 60A-4-407. The section allows only one discharge and dismissal with respect to any person, ever, so a second one should not have been available and the expungement that follows from it is not something this packet will draft.",
      WV_LAWYER_REFERRAL,
      "Take both case files to a lawyer. Which discharge stands, and what follows from it, is a question for advice."
    );
  }

  const courtCostsPaid = yesNo(trackId, answers, "courtCostsPaid");

  return {
    // Declared keys, carried through under the design's own names.
    applicantName,
    dateOfBirth,
    courtAndCounty,
    caseNumber,
    arrestDate,
    offenseCharged,
    dischargeOrderDate,
    probationTerm,
    probationExpiryDate,
    dismissalDate,
    probationViolations: "no",
    priorDrugConviction: "no",
    priorConditionalDischarge: "no",
    courtCostsPaid: courtCostsPaid ? "yes" : "no",

    // Template placeholders, emitted alongside the declared keys.
    partyName: applicantName,
    courtLine: `IN THE ${courtAndCounty.toUpperCase()}, WEST VIRGINIA`,
    identificationStatement: `The applicant is ${applicantName}, date of birth ${dateOfBirth}.`,
    caseStatement: `This application concerns case number ${caseNumber} in the ${courtAndCounty}, West Virginia.`,
    arrestStatement: `The applicant states the arrest as: ${arrestDate}`,
    offenceStatement: `The applicant states the offence charged as: ${offenceOf(offenseCharged)}`,
    dischargeStatement: `The applicant states that on ${dischargeOrderDate} the Court deferred further proceedings, without entering a judgment of guilt, and placed the applicant on probation for a term stated as: ${probationTerm}`,
    expiryStatement: `The applicant states that the term of probation expired on ${probationExpiryDate}, and that the six-month period under § 60A-4-407(b) is computed from that expiry.`,
    dismissalStatement: `The applicant states that on ${dismissalDate} the Court discharged the applicant and dismissed the proceedings, without adjudication of guilt.`,
    courtCostsStatement: courtCostsPaid
      ? "The applicant states that the court costs assessed in this case have been paid. Section 60A-4-407(c) makes a person discharged under the section liable for the court costs assessable against a person convicted under § 60A-4-401(c), and payment may have been made a condition of probation."
      : "The applicant states that the court costs assessed in this case have not yet been paid in full. Section 60A-4-407(c) makes a person discharged under the section liable for the court costs assessable against a person convicted under § 60A-4-401(c), and payment may have been made a condition of probation. The applicant asks the clerk what remains owing.",
    packetCaseReference: "West Virginia conditional discharge expungement"
  };
}

/** The offence, echoed as the applicant stated it rather than classified. */
const offenceOf = (raw: string): string => raw;

// ---------------------------------------------------------------------------
// wv_pardon_expungement — W. Va. Code § 5-1-16a
// ---------------------------------------------------------------------------

function derivePardonFacts(answers: Answers): Record<string, string> {
  const trackId = WV_PARDON_TRACK_ID;

  const petitionerName = need(trackId, answers, "petitionerName");
  const dateOfBirth = need(trackId, answers, "dateOfBirth");
  const pardonDate = need(trackId, answers, "pardonDate", WV_PARDON_RECORD_REFERRAL);
  const convictionCounty = need(trackId, answers, "convictionCounty");
  const caseNumber = need(trackId, answers, "caseNumber");
  const offenseAndStatute = need(trackId, answers, "offenseAndStatute");
  const convictionDate = need(trackId, answers, "convictionDate");
  const sentenceImposed = need(trackId, answers, "sentenceImposed");
  const sentenceDischargeDate = need(
    trackId,
    answers,
    "sentenceDischargeDate",
    WV_SENTENCE_RECORD_REFERRAL
  );
  const publicationCounty = need(trackId, answers, "publicationCounty");
  const groundsForExpungement = need(trackId, answers, "groundsForExpungement", WV_LAWYER_REFERRAL);

  const pardonType = branch(
    trackId,
    "pardonType",
    need(trackId, answers, "pardonType", WV_PARDON_RECORD_REFERRAL),
    WV_PARDON_TYPES
  );
  if (pardonType === "conditional") {
    stop(
      "wv-pardon-not-full-and-unconditional",
      trackId,
      "The pardon carries a condition. Section 5-1-16a opens only to a person who has received a full and unconditional pardon from the Governor, so a conditional pardon is outside the section entirely and a petition drafted on it would ask the circuit court for relief the statute does not give.",
      WV_LAWYER_REFERRAL,
      "Take the instrument of pardon to a lawyer. What a conditional pardon does, and whether anything else is open, is a question for advice."
    );
  }
  if (pardonType === "unsure") {
    stop(
      "wv-pardon-character-not-established",
      trackId,
      "Whether the pardon is full and unconditional has not been established. The instrument of pardon says so on its face, the circuit court verifies the act of pardon under § 5-1-16a, and LegalEase has never seen the instrument. A petition that asserted the character of a pardon nobody had read would be asserting the one thing the section turns on.",
      WV_PARDON_RECORD_REFERRAL,
      "Get the instrument of pardon, read what it says about conditions, and answer again from the document."
    );
  }

  if (yesNo(trackId, answers, "excludedOffenseCheck")) {
    stop(
      "wv-excluded-offence",
      trackId,
      "The pardoned offence is one § 5-1-16a excludes: first degree murder under § 61-2-1, treason under § 61-1-1, kidnapping under § 61-2-14a, or a felony defined in article 61-8B. The exclusion is on the face of the section and no petition drafted here can reach it.",
      WV_LAWYER_REFERRAL,
      "Check the offence of conviction against the judgment order. If it really is one of the four, this route is closed and a lawyer is the next step."
    );
  }

  if (UNKNOWN_ANSWER.test(sentenceDischargeDate) || !statesAYear(sentenceDischargeDate)) {
    stop(
      "wv-sentence-discharge-not-established",
      trackId,
      "The date the sentence for the pardoned conviction was discharged has not been established. Section 5-1-16a(d) runs a five-year period from that discharge and both waiting periods must be satisfied, so a petition that could not state the date could not show the period had begun.",
      WV_SENTENCE_RECORD_REFERRAL,
      "Get the record showing the date every part of the sentence, including any supervision, was discharged, take the date from it, and answer again."
    );
  }
  if (UNKNOWN_ANSWER.test(pardonDate) || !statesAYear(pardonDate)) {
    stop(
      "wv-pardon-date-not-established",
      trackId,
      "The date of the pardon has not been established. Section 5-1-16a(c) runs a one-year period from it, and the instrument of pardon carries the date.",
      WV_PARDON_RECORD_REFERRAL,
      "Take the date off the instrument of pardon and answer again."
    );
  }

  screenElapsed(
    trackId,
    answers,
    pardonDate,
    1,
    "wv-pardon-year-not-run",
    "On the dates given, one year has not passed since the pardon. Section 5-1-16a(c) allows the petition only one year after having been pardoned, and § 5-1-16a(d) separately requires five years from discharge of the sentence — both must be satisfied. This packet does not decide eligibility; it declines to prepare a petition the dates in front of it say is early.",
    WV_CLERK_REFERRAL,
    "Work both periods out from the instrument of pardon and the discharge record, and come back once the later of the two has run."
  );
  screenElapsed(
    trackId,
    answers,
    sentenceDischargeDate,
    5,
    "wv-five-year-period-not-run",
    "On the dates given, five years have not passed since the sentence for the pardoned conviction was discharged. Section 5-1-16a(d) requires that period, and § 5-1-16a(c) separately requires one year from the pardon — both must be satisfied. This packet does not decide eligibility; it declines to prepare a petition the dates in front of it say is early.",
    WV_CLERK_REFERRAL,
    "Work both periods out from the instrument of pardon and the discharge record, and come back once the later of the two has run."
  );

  if (/\b(write (it|this|one) for me|you write|legalease (should |can )?write|make something up|whatever you think)\b/i.test(groundsForExpungement)) {
    stop(
      "wv-grounds-not-petitioners-own",
      trackId,
      "The grounds paragraph was left to LegalEase to compose. Section 5-1-16a has the circuit court hold a hearing to determine that GOOD CAUSE exists, so the reasons are the petitioner's own case and not a form of words. LegalEase prompts for them and formats them; it never composes them.",
      WV_LAWYER_REFERRAL,
      "Write, in your own words, why you are asking for the record to be cleared. If you want help making the case for good cause, that is what a lawyer is for."
    );
  }

  return {
    // Declared keys, carried through under the design's own names.
    petitionerName,
    dateOfBirth,
    pardonDate,
    pardonType,
    convictionCounty,
    caseNumber,
    offenseAndStatute,
    convictionDate,
    sentenceImposed,
    sentenceDischargeDate,
    excludedOffenseCheck: "no",
    publicationCounty,
    groundsForExpungement,

    // Template placeholders, emitted alongside the declared keys.
    partyName: petitionerName,
    courtLine: `IN THE CIRCUIT COURT OF ${bareCounty(convictionCounty).toUpperCase()} COUNTY, WEST VIRGINIA`,
    convictionCountyName: bareCounty(convictionCounty),
    publicationCountyName: bareCounty(publicationCounty),
    identificationStatement: `The petitioner is ${petitionerName}, date of birth ${dateOfBirth}.`,
    convictionStatement: `The petitioner states the conviction as: ${offenseAndStatute}, entered on ${convictionDate} in case number ${caseNumber} in ${bareCounty(convictionCounty)} County, West Virginia.`,
    sentenceStatement: `The petitioner states the sentence imposed as: ${sentenceImposed}`,
    dischargeStatement: `The petitioner states that the sentence for that conviction was discharged on ${sentenceDischargeDate}.`,
    pardonStatement: `The petitioner states that the Governor granted a pardon on ${pardonDate}, and that the instrument of pardon states it to be full and unconditional. The instrument is filed with this petition; the Court verifies the act of pardon.`,
    groundsStatement: groundsForExpungement,
    packetCaseReference: "West Virginia pardon expungement"
  };
}

/** Strips a trailing "County" so a caption does not read "KANAWHA COUNTY COUNTY". */
function bareCounty(value: string): string {
  return value.replace(/\s*\bcount(y|ies)\b\s*$/i, "").trim();
}

// ---------------------------------------------------------------------------
// Fact derivation entry point
// ---------------------------------------------------------------------------

/**
 * Turns the participant's answers into the fact bag the templates read.
 *
 * Fails closed on anything the adopted design treats as a stop, on anything that
 * would require asserting a probation-violation history or the character of a
 * pardon, and on any attempt to supply outside-party content.
 */
export function deriveWestVirginiaFacts(
  trackId: string,
  answers: Answers
): Record<string, string> {
  if (!WV_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new WestVirginiaBranchError(trackId, "trackId", trackId, WV_ASSIGNED_TRACK_IDS);
  }
  refuseOutsidePartyContent(trackId, answers);
  screenRouting(trackId, answers);
  return trackId === WV_DRUG_TRACK_ID ? deriveDrugFacts(answers) : derivePardonFacts(answers);
}

// ---------------------------------------------------------------------------
// Shared template language
// ---------------------------------------------------------------------------

type Section = {
  heading?: string;
  numbered: boolean;
  paragraphs: readonly string[];
};

/**
 * The caption block.
 *
 * Each cell is a whole phrase. The shared writer draws one left cell and one
 * right cell per row and wraps each inside its own column, so a phrase split
 * across two entries drifts apart by however many lines the party name needed.
 */
function caption(partyLine: string, documentTitle: string) {
  return {
    courtLine: "{{courtLine}}",
    partyBlockLeft: ["IN RE:", "", "{{partyName}},", "", partyLine],
    partyBlockRight: ["Case No. {{caseNumber}}", "", documentTitle]
  };
}

const NO_FORM_PARAGRAPH =
  "The West Virginia Judiciary publishes no form for this filing. Its Court Forms index carries five expungement forms — SCA-C900, SCA-C903, SCA-C906, SCA-C907 and SCA-C912 — and none of them is the filing made here, which is why this document is drafted to the statute instead of copied from a form. Ask the clerk of the court before filing whether that court wants anything else, or has a local form of its own.";

const WHAT_THIS_IS_SECTION: Section = {
  heading: "WHAT THIS DOCUMENT IS, AND WHAT IT IS NOT",
  numbered: false,
  paragraphs: [
    "It is a filing prepared for a self-represented person from that person's own answers. LegalEase has seen no court record, has decided nothing, represents nobody and has filed nothing.",
    "It is not a filing until it is filed, and it is not an order. Nothing in it has been granted, agreed, verified, certified or decided by anybody.",
    NO_FORM_PARAGRAPH,
    "It states no filing fee. Neither section reached here sets one, and whether a circuit clerk charges a civil-action fee on this filing is not established. Ask the clerk what the fee is, and whether that court has a fee-waiver route, before filing.",
    "Where the clerk assigns a case number or styles the caption differently, write the correct number and styling onto every document in this packet by hand. The caption printed here is drawn from the answers given."
  ]
};

/**
 * What the filing refuses to assert.
 *
 * Parameterised by route rather than shared verbatim: a conditional-discharge
 * application that disclaimed having read an instrument of pardon, or a pardon
 * petition that disclaimed having read a probation record, would be naming a
 * document that has nothing to do with it.
 */
function notAssertedSection(party: string, records: string): Section {
  return {
    heading: "WHAT THIS FILING DOES NOT SAY",
    numbered: false,
    paragraphs: [
      `It does not say that the ${party} is entitled to the relief asked for. That is the Court's decision, and this filing asks the Court to make it.`,
      "It does not say that any period has run. It states the dates given and leaves the computation to the Court.",
      "It says nothing about firearm rights, immigration, professional licensing, or federal, tribal, military or other states' records. Those consequences are outside this packet, and a document that guessed at them would be worse than one that is silent.",
      "It does not say that a record will be erased everywhere. An order reaches the records the order names and nothing beyond them.",
      `Nobody at LegalEase has read ${records} in this matter, and nothing here should be read as though somebody had.`
    ]
  };
}

const SIGNATURE_BLOCK: readonly string[] = [
  "{{partyName}}, self-represented",
  "",
  "Sign and date this by hand, in your own name, after you have read it.",
  "Date: ______________________",
  "Address: ___________________________________________",
  "Telephone: _________________________________________"
];

/** The certificate of service, unexecuted, on both routes. */
function certificateLines(recipients: readonly string[]): readonly string[] {
  return [
    "DO NOT SIGN OR DATE THIS UNTIL YOU HAVE DELIVERED THE COPIES. Unsigned, nothing below states that service has happened, and LegalEase has served nothing on anyone.",
    "",
    "I, {{partyName}}, certify that I served a true copy of the filing in this matter on the person or office named below, on the date written below and by the method marked below.",
    "",
    ...recipients,
    "",
    "Method of service — mark one:",
    "(  ) United States mail, postage prepaid",
    "(  ) Hand delivery",
    "",
    "Date of service: ______________________",
    "",
    "Signature: _____________________________________",
    "{{partyName}}, self-represented",
    "",
    "Keep a copy of this certificate and of everything you served."
  ];
}

function certificatePreamble(documentName: string): string {
  return (
    `This certificate belongs to the ${documentName}, and to no other document. ` +
    "It follows the § 61-11-26(e) service practice West Virginia circuit clerks expect. " +
    "The recipients' street addresses are the filer's to look up and write in: none is printed here. " +
    "Serving a copy obtains nobody's agreement, and no office named here has agreed to anything."
  );
}

/** Where automated help ends. */
function stopSection(extra: readonly string[]): Section {
  return {
    heading: "WHERE THIS PACKET STOPS",
    numbered: false,
    paragraphs: [
      "LegalEase prepares documents from what the filer says. It gives no legal advice, reads no court record, decides no eligibility question, files nothing, serves nobody and speaks to no office.",
      ...extra,
      "The prosecuting attorney opposing the filing, or the Court setting a contested hearing. The initial packet still generates; what happens after that needs a lawyer.",
      "The clerk of the court declining to accept a self-drafted filing, or requiring a local form.",
      "Nothing in this packet addresses firearm rights, immigration, professional licensing, or federal, tribal, military or other states' records, so any question that turns on one of them stops here.",
      "Whether relief under this section spends the once-per-lifetime expungement petition in W. Va. Code § 61-11-26(o) is genuinely open. Subsection (o) reaches §§ 61-11-26 and 61-11-26a on its face, and the section used here carries no cross-reference to it — but that is a reading, not a ruling, and the consequence of getting it wrong is permanent. Anyone who is also considering a § 61-11-26 expungement should take both routes to a lawyer and decide the order before filing either.",
      `Where any of these applies, speak to a lawyer before filing anything. ${WV_LAWYER_REFERRAL}`
    ]
  };
}

// ---------------------------------------------------------------------------
// wv_drug_conditional_discharge templates
// ---------------------------------------------------------------------------

const DRUG_APPLICATION: PleadingTemplate = {
  templateId: "wv-drug-conditional-discharge-application",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("Applicant.", "APPLICATION TO EXPUNGE"),
  title:
    "APPLICATION TO EXPUNGE ALL RECORDATIONS OF ARREST, TRIAL AND CONVICTION — W. VA. CODE § 60A-4-407(b)",
  preamble:
    "The applicant, appearing without a lawyer, applies to this Court under W. Va. Code § 60A-4-407(b) for an order expunging from all official records all recordations of the arrest, trial and conviction in this matter, and states as follows.",
  sections: [
    WHAT_THIS_IS_SECTION,
    {
      heading: "I.  THE APPLICANT AND THE CASE",
      numbered: true,
      paragraphs: [
        "{{identificationStatement}}",
        "{{caseStatement}}",
        "{{arrestStatement}}",
        "{{offenceStatement}}"
      ]
    },
    {
      heading: "II.  THE CONDITIONAL DISCHARGE",
      numbered: true,
      paragraphs: [
        "W. Va. Code § 60A-4-407(a) permits a court, with the person's consent and without entering a judgment of guilt, to defer further proceedings against a person who has pleaded guilty to or been found guilty of possession of a controlled substance under § 60A-4-401(c) and who has not previously been convicted of an offence under chapter 60A or under any federal or state statute relating to narcotic drugs, marihuana, or stimulant, depressant or hallucinogenic drugs, and to place that person on probation.",
        "{{dischargeStatement}}",
        "{{dismissalStatement}}",
        "Section 60A-4-407(a) provides that a discharge and dismissal under it is without adjudication of guilt, is not a conviction for purposes of any disqualification or disability imposed by law, and restores the person in contemplation of law to the status occupied before arrest and trial. There may be only one discharge and dismissal under the section with respect to any person."
      ]
    },
    {
      heading: "III.  THE SIX-MONTH PERIOD",
      numbered: true,
      paragraphs: [
        "Section 60A-4-407(b) permits the application after a period of not less than six months, which begins to run immediately upon the expiration of the term of probation.",
        "{{expiryStatement}}",
        "The applicant does not state that the six-month period has run. The dates are stated above and the computation is for the Court.",
        "The probation office's written confirmation of the expiry date is filed with this application, together with the applicant's affidavit."
      ]
    },
    {
      heading: "IV.  WHAT THE STATUTE ASKS THE COURT TO DO",
      numbered: true,
      paragraphs: [
        "Section 60A-4-407(b) provides that if the Court determines, after a hearing, that the person was not guilty of any serious or repeated violation of the conditions of probation during the period of probation or before the application, it shall order the expungement.",
        "That determination is the Court's. Nothing in this application states, suggests or asks the Court to assume anything about whether the conditions of probation were kept: the applicant states the facts of the case and asks the Court to determine the application after the hearing the section contemplates.",
        "{{courtCostsStatement}}",
        "The time and place of the hearing are fixed by the Court or the clerk and are left blank here.",
        "Whether W. Va. Code § 60A-4-407a bears on this application or only on the discharge that preceded it is not settled here. The section was noted at source and not read in full, and nothing in this application is drafted around it."
      ]
    },
    notAssertedSection(
      "applicant",
      "the court file, the conditional discharge order, the order of discharge and dismissal or the probation record"
    ),
    stopSection([
      "Any allegation, from any source and at any time, that a condition of probation was broken. Whether there was a serious or repeated violation is the Court's finding, and this packet takes no position on it.",
      "A prior drug conviction, or a prior conditional discharge under this section — either of which means the discharge that this application rests on should not have been available.",
      "Probation that was revoked, or a case in which the Court entered an adjudication of guilt.",
      "Missing conditional discharge, discharge-and-dismissal or probation-expiry paperwork."
    ])
  ],
  prayer: [
    "WHEREFORE, the applicant asks the Court to determine this application under W. Va. Code § 60A-4-407(b) after the hearing the section contemplates and, on the findings the section requires, to order that all recordations of the arrest, trial and conviction in case number {{caseNumber}} be expunged from all official records.",
    "Nothing in this application reports a decision by anyone. It asks."
  ],
  verification:
    "The applicant states that the facts set out above are true and correct to the best of the applicant's knowledge and belief. The applicant's sworn affidavit as to the dates is filed with this application; this application itself is signed but not sworn, and no notarial block is printed on it.",
  signatureLabel: "Applicant, self-represented",
  signatureBlock: SIGNATURE_BLOCK
};

const DRUG_AFFIDAVIT: PleadingTemplate = {
  templateId: "wv-drug-conditional-discharge-affidavit",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("Applicant.", "AFFIDAVIT OF THE APPLICANT"),
  title: "AFFIDAVIT OF THE APPLICANT AS TO PROBATION AND THE SIX-MONTH PERIOD",
  preamble:
    "This affidavit is filed with the application under W. Va. Code § 60A-4-407(b). It is UNSWORN as generated. Do not sign it until you are in front of a notary public or another official authorised to administer an oath, who completes the jurat below.",
  sections: [
    {
      heading: "THE AFFIANT STATES",
      numbered: true,
      paragraphs: [
        "{{identificationStatement}}",
        "{{caseStatement}}",
        "{{dischargeStatement}}",
        "{{expiryStatement}}",
        "{{dismissalStatement}}",
        "The affiant makes no statement in this affidavit about whether any condition of probation was kept or broken. That is the Court's determination under W. Va. Code § 60A-4-407(b), and it is not the affiant's to swear to."
      ]
    },
    {
      heading: "HOW TO COMPLETE THIS AFFIDAVIT",
      numbered: false,
      paragraphs: [
        "Read every statement above against the conditional discharge order, the order of discharge and dismissal, and the probation office's written confirmation of the expiry date. Correct anything that does not match the documents before you sign.",
        "Take this affidavit, unsigned, to a notary public or other official authorised to administer an oath. Sign it in front of them. They complete the jurat.",
        "LegalEase has not seen any of those documents and has not administered any oath."
      ]
    }
  ],
  prayer: [],
  signatureLabel: "Affiant, self-represented",
  signatureBlock: [
    "{{partyName}}, Affiant",
    "",
    "STATE OF WEST VIRGINIA, COUNTY OF ______________________, to wit:",
    "",
    "Taken, subscribed and sworn to before me this ______ day of ____________________, 20____.",
    "",
    "_____________________________________",
    "Notary Public or other official authorised to administer an oath",
    "",
    "My commission expires: ______________________",
    "",
    "The jurat above is the notary's to complete. It is printed blank and LegalEase has not administered any oath."
  ]
};

const DRUG_CERTIFICATE: PleadingTemplate = {
  templateId: "wv-drug-conditional-discharge-certificate-of-service",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("Applicant.", "CERTIFICATE OF SERVICE"),
  title: "CERTIFICATE OF SERVICE",
  preamble: certificatePreamble(
    "Application to Expunge under W. Va. Code § 60A-4-407(b) and the affidavit filed with it"
  ),
  sections: [],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [],
  certificateOfService: certificateLines([
    "Prosecuting Attorney of the county — name and street address:",
    "____________________________________________________________",
    "____________________________________________________________",
    "",
    "Supervising probation office — name and street address:",
    "____________________________________________________________",
    "____________________________________________________________"
  ])
};

// ---------------------------------------------------------------------------
// wv_pardon_expungement templates
// ---------------------------------------------------------------------------

const PARDON_PETITION: PleadingTemplate = {
  templateId: "wv-pardon-expungement-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("Petitioner.", "PETITION TO EXPUNGE"),
  title:
    "PETITION TO EXPUNGE THE RECORD OF A PARDONED CONVICTION — W. VA. CODE § 5-1-16a",
  preamble:
    "The petitioner, appearing without a lawyer, petitions this Court under W. Va. Code § 5-1-16a to expunge the record of a conviction for which the Governor has granted a pardon, and states as follows.",
  sections: [
    WHAT_THIS_IS_SECTION,
    {
      heading: "I.  THE PETITIONER, THE CONVICTION AND THE PARDON",
      numbered: true,
      paragraphs: [
        "{{identificationStatement}}",
        "{{convictionStatement}}",
        "{{sentenceStatement}}",
        "{{dischargeStatement}}",
        "{{pardonStatement}}",
        "The petitioner does not ask the Court to take the character of the pardon on trust. Section 5-1-16a has the Court verify the act of pardon, and the instrument speaks for itself."
      ]
    },
    {
      heading: "II.  VENUE AND THE EXCLUDED OFFENCES",
      numbered: true,
      paragraphs: [
        "Section 5-1-16a(a) directs the petition to the circuit court in the county where the conviction was had. This petition is filed in {{convictionCountyName}} County on that basis.",
        "Section 5-1-16a excludes first degree murder as defined in § 61-2-1, treason as defined in § 61-1-1, kidnapping as defined in § 61-2-14a, and any felony defined in article 61-8B. The petitioner states that the pardoned conviction is none of those.",
        "The records of the Governor, the Legislature and the Secretary of State that pertain to the grant of the pardon are not public record for this purpose and are not subject to an order under this section. This petition does not ask that they be expunged."
      ]
    },
    {
      heading: "III.  THE TWO WAITING PERIODS",
      numbered: true,
      paragraphs: [
        "Section 5-1-16a(c) allows the petition one year after the pardon. Section 5-1-16a(d) separately allows it five years after the discharge of the sentence upon the pardoned conviction. Both must be satisfied.",
        "The date of the pardon and the date the sentence was discharged are stated above. The petitioner does not state that either period has run; the computation is for the Court.",
        "The instrument of pardon, the certified judgment and sentencing orders, and the record showing the discharge of the sentence are filed with this petition."
      ]
    },
    {
      heading: "IV.  NOTICE, PUBLICATION AND SERVICE",
      numbered: true,
      paragraphs: [
        "Section 5-1-16a(a) requires the petitioner to publish notice of the time and place that the petition will be made, as a Class I legal advertisement in compliance with article 3 of chapter 59, with the publication area being the county where the petition is filed. That county is {{publicationCountyName}} County.",
        "The notice of hearing that accompanies this petition is the copy for that advertisement. Its time and place are left blank until the Court or the clerk fixes them, because the notice cannot be published until they are known.",
        "The publisher's affidavit of publication will be filed once the notice has run. LegalEase does not arrange, pay for or prove the publication, and holds no affidavit.",
        "This petition is served on the prosecuting attorney of the county where it is filed, as § 5-1-16a(a) requires. The certificate of service filed with it records that service, and is unsigned until the petitioner has actually served."
      ]
    },
    {
      heading: "V.  WHAT THE STATUTE ASKS THE COURT TO DO, AND WHAT IT GIVES",
      numbered: true,
      paragraphs: [
        "On verification of the act of pardon, and after a hearing to determine that good cause exists, § 5-1-16a permits the Court to enter an order directing that all public record of the conviction be expunged.",
        "The petitioner states the grounds below, in the petitioner's own words. They were written by the petitioner and are reproduced without change; nobody else composed them.",
        "{{groundsStatement}}",
        "The petitioner does not state that good cause exists. That is the finding the hearing is for.",
        "Section 5-1-16a(b) provides that a record expunged under the section may not be considered in an application to any educational institution in this State, or in an application for any licensure required by any professional organisation in this State. What the section says is set out here and nothing is added to it: unlike §§ 61-11-25(e) and 61-11-26(l) it carries no general clause permitting the person to deny the record, and this petition does not suggest otherwise."
      ]
    },
    notAssertedSection(
      "petitioner",
      "the court file, the judgment and sentencing orders, the discharge record or the instrument of pardon"
    ),
    stopSection([
      "A pardon that is not full and unconditional, or any uncertainty about which it is.",
      "A pardoned offence that is first degree murder, treason, kidnapping or a felony under article 61-8B.",
      "Either waiting period unsatisfied, or a sentence discharge date that cannot be established from the record.",
      "Not being able to arrange or afford the Class I legal advertisement, which is a real cost this packet cannot quote and cannot pay."
    ])
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the Court to verify the act of pardon, to hold the hearing § 5-1-16a contemplates and, on a determination that good cause exists, to enter an order directing that all public record of the conviction in case number {{caseNumber}} be expunged.",
    "Nothing in this petition reports a decision by anyone. It asks."
  ],
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: SIGNATURE_BLOCK
};

const PARDON_NOTICE: PleadingTemplate = {
  templateId: "wv-pardon-expungement-notice-of-hearing",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("Petitioner.", "NOTICE OF HEARING"),
  title:
    "NOTICE OF THE TIME AND PLACE THE PETITION WILL BE MADE — CLASS I LEGAL ADVERTISEMENT COPY",
  preamble:
    "This is the copy for the Class I legal advertisement that W. Va. Code § 5-1-16a(a) requires, drafted for the petitioner to submit to a qualified newspaper for {{publicationCountyName}} County. It has not been submitted, has not been published, and has not been paid for. LegalEase does neither.",
  sections: [
    {
      heading: "NOTICE",
      numbered: false,
      paragraphs: [
        "NOTICE IS HEREBY GIVEN that {{petitionerName}} will make a petition to the Circuit Court of {{convictionCountyName}} County, West Virginia, under W. Va. Code § 5-1-16a, for an order directing that all public record of the conviction in case number {{caseNumber}} be expunged.",
        "The petition will be made at the following time and place:",
        "",
        "Date: ______________________________________________",
        "Time: ______________________________________________",
        "Place: _____________________________________________",
        "",
        "Any person wishing to be heard on the petition may appear at that time and place.",
        "",
        "Dated: ______________________",
        "{{petitionerName}}, Petitioner, self-represented"
      ]
    },
    {
      heading: "BEFORE YOU SEND THIS TO A NEWSPAPER",
      numbered: false,
      paragraphs: [
        "The date, the time and the place are blank on purpose. The Court or the clerk fixes them, and the notice cannot be published until they are known. Ask the circuit clerk of the county where you are filing how a hearing date is obtained for a § 5-1-16a petition, and write the answer into the three blanks above by hand or ask the newspaper to set it.",
        "The publication area is the county where the petition is filed, which on the answers given is {{publicationCountyName}} County. The newspaper must be one qualified to run a legal advertisement for that area under article 3 of chapter 59.",
        "The newspaper sets its own rate for a Class I legal advertisement and the petitioner pays it. No amount is printed here, because none is established.",
        "After the notice has run, ask the publisher for the affidavit of publication and file it with the Court. That affidavit is the newspaper's document. LegalEase does not obtain it, hold it or file it.",
        "How the hearing date and the publication are sequenced in practice varies locally and is not settled here. The clerk of the court you are filing in is the office to ask."
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [
    "This notice is unpublished and unsigned as generated.",
    "It becomes a legal advertisement only when a qualified newspaper runs it, and only after the Court or the clerk has fixed the time and place."
  ]
};

const PARDON_CERTIFICATE: PleadingTemplate = {
  templateId: "wv-pardon-expungement-certificate-of-service",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("Petitioner.", "CERTIFICATE OF SERVICE"),
  title: "CERTIFICATE OF SERVICE",
  preamble: certificatePreamble(
    "Petition to Expunge the Record of a Pardoned Conviction under W. Va. Code § 5-1-16a"
  ),
  sections: [],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [],
  certificateOfService: certificateLines([
    "Prosecuting Attorney of {{publicationCountyName}} County, the county where this petition is filed — name and street address:",
    "____________________________________________________________",
    "____________________________________________________________"
  ])
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const WV_CUSTOM_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [DRUG_APPLICATION.templateId]: DRUG_APPLICATION,
  [DRUG_AFFIDAVIT.templateId]: DRUG_AFFIDAVIT,
  [DRUG_CERTIFICATE.templateId]: DRUG_CERTIFICATE,
  [PARDON_PETITION.templateId]: PARDON_PETITION,
  [PARDON_NOTICE.templateId]: PARDON_NOTICE,
  [PARDON_CERTIFICATE.templateId]: PARDON_CERTIFICATE
};

// ---------------------------------------------------------------------------
// Packet sets and tracks
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/**
 * Design role → engine role.
 *
 * `PacketComponentRole` is a closed twelve-value engine type this job does not
 * own, so the design's four custom-pleading roles are mapped onto it here and
 * the mapping is asserted by the verifier rather than left implicit.
 *
 *   primary_filing        → primary_filing
 *   supporting_affidavit  → affidavit
 *       Sworn by the participant before a notary. `affidavit` is the engine's
 *       role for exactly that, and it is not an `attachment`, which is the role
 *       for an unexecuted accompaniment.
 *   certificate_of_service → certificate_of_service
 *   notice_of_hearing     → notice
 *       A notice the statute requires the participant to give to the world by
 *       publication, delivered outside the court file. It is not a
 *       `local_addendum` and not a `cover_sheet`.
 *
 * The componentId is pinned exactly as the design assigns it. That is what
 * carries assignment fidelity; the role mapping only keeps the vocabularies
 * honest with each other.
 */
export const WV_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  supporting_affidavit: "affidavit",
  certificate_of_service: "certificate_of_service",
  notice_of_hearing: "notice"
};

/**
 * The design roles on these two routes that this lane does not produce, with
 * the strategy that puts them in another lane.
 */
export const WV_EXCLUDED_COMPONENT_ROLES: readonly { role: string; strategy: string }[] = [
  { role: "records_checklist", strategy: "process_guidance" },
  { role: "filing_instructions", strategy: "process_guidance" },
  { role: "publication_instructions", strategy: "process_guidance" }
];

const DRUG_PACKET_SET: PacketSet = {
  packetSetId: `${WV_DRUG_TRACK_ID}-set`,
  version: VERSION,
  components: [
    {
      componentId: `${WV_DRUG_TRACK_ID}-primary-filing-1`,
      role: WV_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: DRUG_APPLICATION.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${WV_DRUG_TRACK_ID}-supporting-affidavit-2`,
      role: WV_DESIGN_ROLE_TO_ENGINE_ROLE.supporting_affidavit,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: DRUG_AFFIDAVIT.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 2,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${WV_DRUG_TRACK_ID}-certificate-of-service-3`,
      role: WV_DESIGN_ROLE_TO_ENGINE_ROLE.certificate_of_service,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: DRUG_CERTIFICATE.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 3,
      approval: PENDING_APPROVAL,
      version: VERSION
    }
  ]
};

const PARDON_PACKET_SET: PacketSet = {
  packetSetId: `${WV_PARDON_TRACK_ID}-set`,
  version: VERSION,
  components: [
    {
      componentId: `${WV_PARDON_TRACK_ID}-primary-filing-1`,
      role: WV_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: PARDON_PETITION.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${WV_PARDON_TRACK_ID}-notice-of-hearing-2`,
      role: WV_DESIGN_ROLE_TO_ENGINE_ROLE.notice_of_hearing,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: PARDON_NOTICE.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 2,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      // Order 4 in the design, because the publication-instructions guidance
      // component sits at 3. The gap is preserved rather than closed: the
      // assembled packet has to bind in the design's order once the guidance
      // lane fills position 3.
      componentId: `${WV_PARDON_TRACK_ID}-certificate-of-service-4`,
      role: WV_DESIGN_ROLE_TO_ENGINE_ROLE.certificate_of_service,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: PARDON_CERTIFICATE.templateId,
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

/** The design's questions, in its own words and under its own keys. */
const DRUG_INPUTS: readonly RequiredInput[] = [
  {
    key: "applicantName",
    label: "What is your full legal name as it appears on the court record?",
    required: true
  },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  {
    key: "courtAndCounty",
    label:
      "Which court, and in which county, placed you on probation under the conditional discharge? The application goes back to that same court.",
    required: true
  },
  { key: "caseNumber", label: "What is the case number?", required: true },
  {
    key: "arrestDate",
    label: "On what date were you arrested, and which agency arrested you?",
    required: true
  },
  {
    key: "offenseCharged",
    label: "What possession offence were you charged with, and under which Code section?",
    required: true
  },
  {
    key: "dischargeOrderDate",
    label:
      "On what date did the court enter the order deferring proceedings and placing you on probation?",
    required: true
  },
  {
    key: "probationTerm",
    label: "How long was the probation term the court imposed?",
    required: true
  },
  {
    key: "probationExpiryDate",
    label:
      "On what date did that probation term expire? The six months run from this date, not from the dismissal, so take it from the probation office's written confirmation.",
    required: true
  },
  {
    key: "dismissalDate",
    label: "On what date did the court discharge you and dismiss the proceedings?",
    required: true
  },
  {
    key: "probationViolations",
    label:
      "During probation, or since it ended, has anyone alleged that you broke the conditions of your probation? Answer yes or no.",
    required: true
  },
  {
    key: "priorDrugConviction",
    label:
      "Before this case, had you ever been convicted of any drug offence, in West Virginia, another state or a federal court? Answer yes or no.",
    required: true
  },
  {
    key: "priorConditionalDischarge",
    label:
      "Have you ever had a conditional discharge under this section before, in any West Virginia case? Answer yes or no.",
    required: true
  },
  {
    key: "courtCostsPaid",
    label:
      "Have you paid the court costs the court assessed in this case? Answer yes or no. Section 60A-4-407(c) leaves you liable for them either way.",
    required: true
  }
];

const PARDON_INPUTS: readonly RequiredInput[] = [
  {
    key: "petitionerName",
    label: "What is your full legal name as it appears on the pardon and on the court record?",
    required: true
  },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  { key: "pardonDate", label: "On what date did the Governor grant your pardon?", required: true },
  {
    key: "pardonType",
    label:
      "Does the pardon document say it is full and unconditional, or does it attach any condition? Answer full and unconditional, conditional, or unsure.",
    required: true
  },
  {
    key: "convictionCounty",
    label:
      "In which West Virginia county were you convicted of the offence that was pardoned? The petition is filed in that county's circuit court.",
    required: true
  },
  { key: "caseNumber", label: "What is the case number of that conviction?", required: true },
  {
    key: "offenseAndStatute",
    label: "What offence were you convicted of, and under which Code section?",
    required: true
  },
  { key: "convictionDate", label: "On what date were you convicted?", required: true },
  { key: "sentenceImposed", label: "What sentence did the court impose?", required: true },
  {
    key: "sentenceDischargeDate",
    label:
      "On what date was the sentence for that conviction discharged — the date you finished every part of it, including any supervision?",
    required: true
  },
  {
    key: "excludedOffenseCheck",
    label:
      "Was the pardoned offence first degree murder, treason, kidnapping, or a sexual offence under article 8B of chapter 61? Answer yes or no.",
    required: true
  },
  {
    key: "publicationCounty",
    label:
      "Which county will you be filing the petition in, so the notice is published in a newspaper qualified for that county?",
    required: true
  },
  {
    key: "groundsForExpungement",
    label:
      "Why are you asking for the record to be cleared — for example employment, education or a professional licence? Explain in your own words. The court holds a hearing on whether good cause exists, and this is your statement of it.",
    required: true
  }
];

const statuses = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

const runtime = computeRuntimeStatus({
  statuses,
  sourceCurrent: true,
  runtimeDisabled: true,
  outputStrategy: "custom_pleading"
});

export const WV_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "WV",
    trackId: WV_DRUG_TRACK_ID,
    publicName: "Clearing a first drug possession case that ended in a conditional discharge",
    mechanism: "controlled_substance_conditional_discharge_expungement",
    authority: "W. Va. Code § 60A-4-407(b)",
    recordTypes: ["arrest", "charge", "conviction"],
    dispositions: ["conditional_discharge_completed", "dismissed"],
    courtLevel: "the_court_that_entered_the_conditional_discharge_and_imposed_probation",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: DRUG_PACKET_SET,
    requiredInputs: DRUG_INPUTS,
    statuses: { ...statuses, runtime },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "wv-conditional-discharge-expungement",
    assembledPacketTitle:
      "West Virginia conditional discharge expungement — W. Va. Code § 60A-4-407(b)",
    customerDeliverableDescription:
      "An application to the court that entered the conditional discharge, asking it to expunge all recordations of the arrest, trial and conviction under W. Va. Code § 60A-4-407(b), with an unsworn supporting affidavit for the participant to swear before a notary and an unexecuted certificate of service on the prosecuting attorney and the probation office. The six-month period is computed from the expiry of the probation term rather than from the dismissal, and the application states the dates without asserting that the period has run. No document carries any assertion about the participant's probation-violation history: that finding is the court's, and any allegation of a violation stops the route.",
    notes:
      "One discharge and dismissal per person, ever, so a prior conditional discharge or a prior drug conviction stops the route. Whether this relief spends the § 61-11-26(o) once-per-lifetime petition is an open release question, preserved in the printed copy and never resolved."
  },
  {
    jurisdiction: "WV",
    trackId: WV_PARDON_TRACK_ID,
    publicName: "Clearing a conviction after a full pardon",
    mechanism: "pardoned_conviction_expungement",
    authority: "W. Va. Code § 5-1-16a",
    recordTypes: ["conviction"],
    dispositions: ["convicted", "pardoned"],
    courtLevel: "the_circuit_court_of_the_county_where_the_conviction_was_had",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: PARDON_PACKET_SET,
    requiredInputs: PARDON_INPUTS,
    statuses: { ...statuses, runtime },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "wv-pardon-expungement",
    assembledPacketTitle: "West Virginia pardon expungement — W. Va. Code § 5-1-16a",
    customerDeliverableDescription:
      "A petition to the circuit court of the county of conviction under W. Va. Code § 5-1-16a, with the Class I legal-advertisement notice the section requires — its time and place left blank until the court fixes them — and an unexecuted certificate of service on the prosecuting attorney of the county of filing. Both waiting periods are recited from the participant's own dates without asserting that either has run, the four excluded offences are stated, and the § 5-1-16a(b) protection is set out exactly as the subsection gives it and no further.",
    notes:
      "The pardon application to the Governor is a separate executive process outside product scope and is not a unit of this track. The publication is statutory notice by publication, which the composition rule excludes as a ground for composing, so it is a component of one filing rather than a stage. What a Class I advertisement costs, and how the hearing date and the publication are sequenced, are open release questions the packet states rather than answers."
  }
];
