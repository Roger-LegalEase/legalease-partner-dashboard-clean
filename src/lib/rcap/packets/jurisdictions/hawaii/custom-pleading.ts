// Hawaii stage-one conviction-expungement motions — custom pleading.
//
// SCOPE. Five assigned relief tracks, ten assigned custom-pleading components:
// a Haw. R. Penal P. 47(a) written motion and a proposed order on each of
//
//   hi_first_time_drug_offender_expungement      HRS 706-622.5(4)
//   hi_marijuana_three_grams_expungement         HRS 706-622.5(5)
//   hi_pre_2004_drug_offender_expungement        HRS 706-622.8
//   hi_first_time_property_offender_expungement  HRS 706-622.9
//   hi_under_21_dui_expungement                  HRS 291E-64(e)
//
// Each track also carries a third component, `-primary-filing-3`, which is the
// HCJDC 159(b) Expungement Application. That is stage two, its output strategy
// is `official_pdf_fill`, it is not this lane's work and it is NOT implemented
// here. Nothing in this module fills, describes as filled, or stands in for it.
//
// WHY A MOTION. HRS 706-622.5(4) says "written application". Haw. R. Penal P.
// 47(a) says "An application to the court for an order shall be by motion", and
// Rule 54(a) applies the Rules of Penal Procedure to all penal proceedings in
// all courts of the State. Rule 54(b)'s exception for statutory proceedings
// that supply their own procedure does not bite, because none of these five
// provisions supplies one. So the vehicle is a motion in the participant's own
// existing penal case, whatever word the statute uses. This was the longest
// standing legal-design blocker in the plan; the integrated stage-one
// reconciliation closed it, and this module is its first implementation.
//
// WHY THE COURT LEVEL IS AN ANSWER, NOT A CONSTANT. The level follows the
// offence in the participant's own case: the class C felony drug and property
// routes are circuit court matters, while a HRS 712-1249 three-grams-or-less
// possession and a HRS 291E-64 offence are violations heard in district court.
// The design makes the level a participant input rather than a track constant,
// so every caption is built from the participant's own answer and an
// unanswerable one stops rather than guesses.
//
// WHAT THIS MODULE NEVER DOES. It states no eligibility conclusion, computes no
// period, prints no amount, and asserts no fee — clerk cost practice on a
// stage-one motion is an open release-level question that a separate addendum
// job owns, so no document here says a filing is free. It never says the
// prosecutor consents, that a hearing happened, that service occurred, or that
// an order was entered. Every judicial finding, date and signature on the
// proposed order is printed blank. No document claims that the Hawaii Judiciary
// publishes a statewide stage-one expungement form: none exists.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

/** Where a contested or disputed matter goes. Named offices, not "an attorney". */
export const HI_LAWYER_REFERRAL =
  "The Legal Aid Society of Hawaii, the Native Hawaiian Legal Corporation, Hawaii Free Legal Answers, or the Hawaii State Bar Association Lawyer Referral and Information Service.";

/** Where a participant who cannot state their own case details goes. */
export const HI_COURT_RECORD_REFERRAL =
  "The clerk of the court that sentenced you holds the judgment and the case number. Ask that clerk, or search eCourt Kokua, before answering from memory.";

/** Where a participant on the wrong one of the five provisions goes. */
export const HI_ROUTING_REFERRAL =
  "LegalEase's own Hawaii routing: each of the five conviction provisions is its own track with its own conditions, and the answers decide which one applies.";

/** Where a participant whose relief is not a conviction expungement goes. */
export const HI_NONCONVICTION_REFERRAL =
  "LegalEase's own Hawaii routing: a record that did not end in a conviction, or a deferred acceptance that was discharged and dismissed, is a different track and does not need a stage-one court order.";

export const HI_REFERRALS: readonly string[] = [
  HI_LAWYER_REFERRAL,
  HI_COURT_RECORD_REFERRAL,
  HI_ROUTING_REFERRAL,
  HI_NONCONVICTION_REFERRAL
];

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

/**
 * A fail-closed stop. Every one carries a reason, a destination and a next
 * step, and none of them routes back to the track it came from.
 */
export class HawaiiEligibilityStopError extends Error {
  readonly stopId: string;
  readonly trackId: string;
  readonly destination: string;
  readonly nextStep: string;

  constructor(stopId: string, trackId: string, reason: string, destination: string, nextStep: string) {
    super(reason);
    this.name = "HawaiiEligibilityStopError";
    this.stopId = stopId;
    this.trackId = trackId;
    this.destination = destination;
    this.nextStep = nextStep;
  }
}

/** An answer outside a closed list, reported with the list it had to be in. */
export class HawaiiBranchError extends Error {
  readonly trackId: string;
  readonly key: string;
  readonly value: string;
  readonly permitted: readonly string[];

  constructor(trackId: string, key: string, value: string, permitted: readonly string[]) {
    super(`Answer "${value}" for ${key} on ${trackId} is not one of: ${permitted.join(", ")}.`);
    this.name = "HawaiiBranchError";
    this.trackId = trackId;
    this.key = key;
    this.value = value;
    this.permitted = permitted;
  }
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export const HI_DRUG_TRACK = "hi_first_time_drug_offender_expungement";
export const HI_MARIJUANA_TRACK = "hi_marijuana_three_grams_expungement";
export const HI_PRE_2004_TRACK = "hi_pre_2004_drug_offender_expungement";
export const HI_PROPERTY_TRACK = "hi_first_time_property_offender_expungement";
export const HI_DUI_TRACK = "hi_under_21_dui_expungement";

/** The five assigned stage-one tracks, as a closed list. */
export const HI_ASSIGNED_TRACK_IDS: readonly string[] = [
  HI_DRUG_TRACK,
  HI_MARIJUANA_TRACK,
  HI_PRE_2004_TRACK,
  HI_PROPERTY_TRACK,
  HI_DUI_TRACK
];

/**
 * The component this lane does NOT implement, on every one of the five tracks.
 *
 * Recorded rather than omitted silently, so that a reader counting components
 * against the packet-set manifest can see why ten and not fifteen are here.
 */
export const HI_EXCLUDED_COMPONENTS: readonly {
  componentIdSuffix: string;
  role: string;
  strategy: string;
  reason: string;
}[] = [
  {
    componentIdSuffix: "-primary-filing-3",
    role: "primary_filing",
    strategy: "official_pdf_fill",
    reason:
      "HCJDC 159(b), the Expungement Application submitted to the Hawaii Criminal Justice Data Center. It is stage two, it is an official PDF and it belongs to another renderer lane. It also has no source-materialization receipt yet, because edition 1.2 retains no Hawaii packet form."
  }
];

export const HI_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

export const HI_YES_NO_UNSURE: Readonly<Record<string, "yes" | "no" | "unsure">> = {
  yes: "yes",
  no: "no",
  unsure: "unsure"
};

/**
 * The court level, which follows the offence rather than the track.
 *
 * `unsure` is a permitted answer and it stops: a motion captioned for the wrong
 * court is filed in the wrong place, and the clerk of the sentencing court can
 * say which it was in one telephone call.
 */
export const HI_COURT_LEVELS: Readonly<Record<string, string>> = {
  circuit: "circuit",
  district: "district",
  family: "family",
  unsure: "unsure"
};

/** The judicial circuits, which the caption names. */
export const HI_CIRCUITS: Readonly<Record<string, string>> = {
  first: "FIRST CIRCUIT",
  second: "SECOND CIRCUIT",
  third: "THIRD CIRCUIT",
  fifth: "FIFTH CIRCUIT",
  unsure: "unsure"
};

/** The islands each circuit covers, printed so a participant can check the answer. */
const HI_CIRCUIT_ISLANDS: Readonly<Record<string, string>> = {
  first: "Oahu",
  second: "Maui, Molokai and Lanai",
  third: "Hawaii island",
  fifth: "Kauai and Niihau"
};

/** How HRS 706-622.9 splits, which the participant's own sentencing date decides. */
export const HI_PROPERTY_SUBSECTIONS: Readonly<Record<string, string>> = {
  mandatory: "mandatory",
  discretionary: "discretionary",
  unsure: "unsure"
};

/**
 * The declared participant-input keys, per track.
 *
 * `resolvePacket` checks every declared `requiredInputs` key against the fact
 * bag, so every one of them has to be echoed into the derived facts even where
 * no template prints it. They are listed here rather than read back off the
 * track so that the echo cannot silently drift from the declaration.
 */
export const HI_COMMON_INPUT_KEYS: readonly string[] = [
  "courtLevel",
  "circuit",
  "offenceAndStatute",
  "judgmentDate",
  "prosecutorOpposesOrContested",
  "priorExpungementGranted",
  "immigrationMatter",
  "attackingTheConviction"
];

export const HI_TRACK_INPUT_KEYS: Readonly<Record<string, readonly string[]>> = {
  [HI_DRUG_TRACK]: [
    "sentencedToProbationUnder6225",
    "completedTreatmentProgramme",
    "termsDisputed",
    "priorlySentencedUnder6225"
  ],
  [HI_MARIJUANA_TRACK]: ["threeGramsOrLess", "otherChargeSameFacts"],
  [HI_PRE_2004_TRACK]: [
    "sentencingDate",
    "sentencedBeforeJuly2004",
    "cannotObtainRecord",
    "priorlySentencedUnder6225"
  ],
  [HI_PROPERTY_TRACK]: [
    "propertySubsection",
    "priorOrSubsequentFelony",
    "nonviolenceContested",
    "completedTreatmentProgramme"
  ],
  [HI_DUI_TRACK]: [
    "commercialLicenceOrVehicle",
    "hasAttainedTwentyOne",
    "priorAlcoholContact",
    "subsequentAlcoholOrDrugContact"
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
    throw new HawaiiEligibilityStopError(
      "hi-answer-missing",
      trackId,
      `The answer to "${key}" is needed before this motion can be drafted, and it has not been given. Nothing in this packet is written from an assumption about a participant's own case.`,
      HI_COURT_RECORD_REFERRAL,
      "Answer the question from your own court record and run the packet again."
    );
  }
  return value;
};

/** Closed-list validation returning the mapped prose. */
const branch = <T>(
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, T>>
): T => {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new HawaiiBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

/**
 * The same validation, returning the answer's own key.
 *
 * A branch that both decides a mechanism and prints a sentence needs the key to
 * compare against and the prose to print. Comparing against the prose silently
 * matches nothing, so the two readers are kept separate on purpose.
 */
const branchKey = (
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, unknown>>
): string => {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new HawaiiBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return normalized;
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), HI_YES_NO);

const yesNoUnsure = (trackId: string, answers: Answers, key: string): "yes" | "no" | "unsure" =>
  branch(trackId, key, need(trackId, answers, key), HI_YES_NO_UNSURE);

/**
 * Echo every declared input under its own key.
 *
 * These are the participant's own words, unchanged. They are not sentences and
 * no template prints them; they exist so the resolver's declared-input check
 * sees the answer it was promised.
 */
function echoInputs(trackId: string, answers: Answers): Record<string, string> {
  const keys = [...HI_COMMON_INPUT_KEYS, ...(HI_TRACK_INPUT_KEYS[trackId] ?? [])];
  const echoed: Record<string, string> = {};
  for (const key of keys) echoed[key] = str(answers, key);
  return echoed;
}

// ---------------------------------------------------------------------------
// Screens that apply to all five routes
// ---------------------------------------------------------------------------

/**
 * The stops every one of the five provisions shares.
 *
 * Each is a self-help boundary the design records, and each ends automated
 * assistance rather than being drafted around.
 */
function screenCommon(trackId: string, answers: Answers): void {
  if (yesNo(trackId, answers, "prosecutorOpposesOrContested")) {
    throw new HawaiiEligibilityStopError(
      "hi-contested-matter",
      trackId,
      "The prosecuting attorney opposes this, or the court has set a contested hearing. A contested motion is argued, and argument is not something a packet can prepare.",
      HI_LAWYER_REFERRAL,
      "Take the motion and the court's notice to one of those offices before the hearing date."
    );
  }
  if (yesNo(trackId, answers, "priorExpungementGranted")) {
    throw new HawaiiEligibilityStopError(
      "hi-prior-expungement",
      trackId,
      "An expungement of conviction has already been granted under HRS 706-622.5 or HRS 706-622.8. HRS 706-622.8 provides that a person granted one under either section is not eligible for another under that section or HRS 706-622.5, and the bar runs both ways.",
      HI_LAWYER_REFERRAL,
      "Ask one of those offices whether any other Hawaii relief reaches this record."
    );
  }
  if (yesNo(trackId, answers, "immigrationMatter")) {
    throw new HawaiiEligibilityStopError(
      "hi-immigration-matter",
      trackId,
      "There is an immigration matter. An expunged Hawaii conviction is still a conviction for federal immigration purposes in most circumstances, and the consequences of filing are outside what this packet addresses.",
      HI_LAWYER_REFERRAL,
      "Speak to an immigration lawyer about the record before filing anything."
    );
  }
  if (yesNo(trackId, answers, "attackingTheConviction")) {
    throw new HawaiiEligibilityStopError(
      "hi-collateral-attack",
      trackId,
      "The aim is to set aside or attack the conviction rather than to expunge the record of it. That is a Haw. R. Penal P. 40 petition and a different proceeding altogether; an expungement motion accepts the conviction and asks that its record be expunged.",
      HI_LAWYER_REFERRAL,
      "Ask one of those offices about a Rule 40 petition before filing anything here."
    );
  }
}

/** The caption, which is built from the participant's own answers about their case. */
function captionFacts(trackId: string, answers: Answers): Record<string, string> {
  const level = branchKey(trackId, "courtLevel", need(trackId, answers, "courtLevel"), HI_COURT_LEVELS);
  if (level === "unsure") {
    throw new HawaiiEligibilityStopError(
      "hi-court-level-not-established",
      trackId,
      "Which court sentenced you has not been established. The level follows the offence — the class C felony routes are circuit court matters and a violation is a district court matter — so it is not a detail to answer from memory, and a motion captioned for the wrong court is filed in the wrong place.",
      HI_COURT_RECORD_REFERRAL,
      "Read the court name off the judgment, or ask the clerk, and run the packet again."
    );
  }
  const circuit = branchKey(trackId, "circuit", need(trackId, answers, "circuit"), HI_CIRCUITS);
  if (circuit === "unsure") {
    throw new HawaiiEligibilityStopError(
      "hi-circuit-not-established",
      trackId,
      "Which judicial circuit the case was in has not been established. The caption names it, and the four circuits divide by island.",
      HI_COURT_RECORD_REFERRAL,
      "Read the circuit off the judgment, or ask the clerk, and run the packet again."
    );
  }

  const courtName =
    level === "circuit"
      ? `CIRCUIT COURT OF THE ${HI_CIRCUITS[circuit]}`
      : level === "family"
        ? `FAMILY COURT OF THE ${HI_CIRCUITS[circuit]}`
        : `DISTRICT COURT OF THE ${HI_CIRCUITS[circuit]}`;

  return {
    hiCourtLevel: level,
    hiCircuit: circuit,
    hiCourtLine: `IN THE ${courtName}, STATE OF HAWAII`,
    hiCourtName: courtName,
    hiCircuitIslands: HI_CIRCUIT_ISLANDS[circuit] ?? "",
    hiVenueStatement: `This motion is made in the participant's own penal case in the ${courtName.toLowerCase()}, which is the court that sentenced the participant. The level follows the offence rather than the relief, and it is stated here from the participant's own answer.`
  };
}

/** The shared identification, offence and judgment facts every motion recites. */
function caseFacts(trackId: string, answers: Answers): Record<string, string> {
  const offence = need(trackId, answers, "offenceAndStatute");
  const judgmentDate = need(trackId, answers, "judgmentDate");
  return {
    hiOffenceAndStatute: offence,
    hiJudgmentDate: judgmentDate,
    hiOffenceStatement: `The participant states the offence and the statute section as: ${offence}`,
    hiJudgmentStatement: `The participant states that judgment was entered on ${judgmentDate}.`,
    hiParticularOffenceStatement:
      "The order sought reaches that particular offence. It is identified above rather than left to the case as a whole, because the statute expunges the record of the offence and not the file."
  };
}

// ---------------------------------------------------------------------------
// Derived facts
// ---------------------------------------------------------------------------

/**
 * Turn the participant's answers into the facts the templates print.
 *
 * Every value here is the participant's own statement or a citation. Nothing is
 * a conclusion about eligibility, and no date arithmetic is done anywhere: a
 * waiting period is not part of any of these five provisions, and the one age
 * condition is asked rather than computed.
 */
export function deriveHawaiiFacts(trackId: string, answers: Answers): Record<string, string> {
  if (!HI_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new HawaiiBranchError(trackId, "trackId", trackId, HI_ASSIGNED_TRACK_IDS);
  }

  screenCommon(trackId, answers);
  const base = {
    ...echoInputs(trackId, answers),
    ...captionFacts(trackId, answers),
    ...caseFacts(trackId, answers)
  };

  const shared = {
    hiReferralLine: HI_LAWYER_REFERRAL,
    hiRule47Basis:
      "Haw. R. Penal P. 47(a) provides that an application to the court for an order shall be by motion, that a motion other than one made during a trial or hearing shall be in writing, and that it shall state the grounds upon which it is made and set forth the relief or order sought. Rule 54(a) applies the Rules of Penal Procedure to all penal proceedings in all courts of the State.",
    hiDeclarationBasis:
      "Haw. R. Penal P. 47(d) provides that a motion requiring the consideration of facts not appearing of record shall be supported by affidavit or declaration. The declaration below is that support, and it is unsigned as generated.",
    hiServiceBasis:
      "Haw. R. Penal P. 49(a) provides that written submissions to the court shall be served upon each of the parties, with proof of service under Rule 49(c). The prosecuting attorney receives this motion as a party. None of the five provisions requires notice to a victim, to the Attorney General, to the Criminal Justice Data Center or to any agency.",
    hiNoFeeStatement:
      "None of the five provisions prescribes a filing fee for this motion, and this packet states no amount. Whether a clerk's cost attaches to a motion filed in an existing penal case is not established here, so ask the clerk what, if anything, is charged before filing.",
    hiStageTwoStatement:
      "An order granting this motion is the beginning of the process and not the end of it. The Criminal Justice Data Center requires a copy of the order granting the expungement of conviction to be included with its own Expungement Application, and it expunges conviction information from the statewide repository of adult criminal history record information only. The arresting agency and the courts may retain records. LegalEase does not obtain the order, does not submit the application and does not deal with the Data Center.",
    hiNotAssertedStatement:
      "This motion does not say that the participant is entitled to the order. It does not say that the prosecuting attorney agrees or will not oppose; nothing has been obtained from that office. It does not say that any hearing has been held or that any finding has been made. Nobody at LegalEase has read the court file, the probation record or any treatment record in this matter.",
    packetCaseReference: base.hiCourtName
  };

  switch (trackId) {
    case HI_DRUG_TRACK: {
      const probation = yesNo(trackId, answers, "sentencedToProbationUnder6225");
      if (!probation) {
        throw new HawaiiEligibilityStopError(
          "hi-6225-not-sentenced-under-the-section",
          trackId,
          "The sentence was not probation under HRS 706-622.5. Subsection (4) reaches a person sentenced under that section, so a sentence imposed under some other provision is outside it however similar the offence.",
          HI_ROUTING_REFERRAL,
          "Check the judgment for the section the sentence was imposed under, and run the routing again."
        );
      }
      const treatment = yesNoUnsure(trackId, answers, "completedTreatmentProgramme");
      if (treatment !== "yes") {
        throw new HawaiiEligibilityStopError(
          "hi-6225-treatment-not-completed",
          trackId,
          treatment === "no"
            ? "The substance abuse treatment programme was not completed. Successful completion is the condition subsection (4) turns on, and it is not something a motion can assert around."
            : "Whether the substance abuse treatment programme was successfully completed has not been established. It is the condition subsection (4) turns on, so it is not a detail to answer from memory.",
          treatment === "no" ? HI_LAWYER_REFERRAL : HI_COURT_RECORD_REFERRAL,
          treatment === "no"
            ? "Ask one of those offices whether any other route reaches this record."
            : "Ask the probation officer or the treatment provider for the discharge record, and run the packet again."
        );
      }
      if (yesNo(trackId, answers, "termsDisputed")) {
        throw new HawaiiEligibilityStopError(
          "hi-6225-compliance-disputed",
          trackId,
          "Whether the other terms and conditions of probation were complied with is in dispute. A disputed compliance question is decided on evidence, not on a motion drafted from the participant's own account.",
          HI_LAWYER_REFERRAL,
          "Take the probation record to one of those offices before filing."
        );
      }
      if (yesNo(trackId, answers, "priorlySentencedUnder6225")) {
        throw new HawaiiEligibilityStopError(
          "hi-6225-not-first-sentence",
          trackId,
          "The participant had already been sentenced under HRS 706-622.5 before the sentence in question. Subsection (4) makes eligible for one time only a person who had NOT previously been sentenced under the section, so an earlier sentence under it closes the route.",
          HI_LAWYER_REFERRAL,
          "Ask one of those offices whether any other Hawaii relief reaches this record."
        );
      }
      return {
        ...base,
        ...shared,
        hiSectionCitation: "HRS 706-622.5(4)",
        hiSectionTitle: "HRS 706-622.5(4), first-time drug offender",
        hiReliefStatement:
          "Subsection (4) provides that the court shall issue a court order to expunge the record of conviction for that particular offence, on the conditions the subsection states. The relief is mandatory once those conditions are met; whether they are met is the Court's to decide and this motion asks it to decide.",
        hiGroundOneStatement:
          "The participant states that they were sentenced to probation under HRS 706-622.5.",
        hiGroundTwoStatement:
          "The participant states that they successfully completed the substance abuse treatment programme.",
        hiGroundThreeStatement:
          "The participant states that they complied with the other terms and conditions of probation. The Hawaii Supreme Court has held that a person who completed the probation term and was discharged, and so satisfied the disposition of the court under HRS 706-630, has in effect complied with the terms and conditions of probation for the purposes of subsection (4): 129 H. 363, 300 P.3d 1022 (2013).",
        hiGroundFourStatement:
          "The participant states that they had not previously been sentenced under HRS 706-622.5 at the time of the sentence in this case, which is what makes the one-time eligibility available.",
        hiGroundFiveStatement:
          "The participant states that they have not previously been granted an expungement of conviction under HRS 706-622.5 or HRS 706-622.8.",
        hiNoWaitingPeriodStatement:
          "Subsection (4) sets no waiting period. The condition is completion, not elapsed time, so this motion states no period and computes none."
      };
    }

    case HI_MARIJUANA_TRACK: {
      const quantity = yesNoUnsure(trackId, answers, "threeGramsOrLess");
      if (quantity !== "yes") {
        throw new HawaiiEligibilityStopError(
          "hi-marijuana-quantity-not-established",
          trackId,
          quantity === "no"
            ? "The amount was more than three grams. Subsection (5) reaches possession of three grams or less and nothing else, and the quantity is the only condition it states."
            : "The amount has not been established. Subsection (5) reaches possession of three grams or less and the quantity is the only condition it states, so it is the one fact this route cannot proceed without.",
          quantity === "no" ? HI_ROUTING_REFERRAL : HI_COURT_RECORD_REFERRAL,
          quantity === "no"
            ? "Run the Hawaii routing again against the other four conviction provisions."
            : "Read the quantity off the charging document or the judgment and run the packet again."
        );
      }
      if (yesNo(trackId, answers, "otherChargeSameFacts")) {
        throw new HawaiiEligibilityStopError(
          "hi-marijuana-other-charge",
          trackId,
          "Another criminal charge arose from the same facts and circumstances. That defeats this route: the subsection reaches a conviction for the possession offence, and a companion charge from the same incident is outside it.",
          HI_LAWYER_REFERRAL,
          "Ask one of those offices what reaches the record as a whole."
        );
      }
      return {
        ...base,
        ...shared,
        hiSectionCitation: "HRS 706-622.5(5)",
        hiSectionTitle: "HRS 706-622.5(5), possession of three grams or less of marijuana",
        hiReliefStatement:
          "Subsection (5) provides that the court shall grant an expungement order for a conviction for possession of three grams or less of marijuana. The only proviso is the quantity. The relief is mandatory once it is met; whether it is met is the Court's to decide and this motion asks it to decide.",
        hiGroundOneStatement:
          "The participant states that the conviction was for possession of three grams or less of marijuana under HRS 712-1249.",
        hiGroundTwoStatement:
          "The participant states that no other criminal charge arose from the same facts and circumstances.",
        hiGroundThreeStatement:
          "The participant states that they have not previously been granted an expungement of conviction under HRS 706-622.5 or HRS 706-622.8.",
        hiGroundFourStatement:
          "This offence is a violation, which is why the caption above names a district court rather than a circuit court.",
        hiGroundFiveStatement:
          "The participant makes no statement about what the Court will find. The quantity is stated from the participant's own record of the case.",
        hiNoWaitingPeriodStatement:
          "Subsection (5) sets no waiting period. This motion states no period and computes none."
      };
    }

    case HI_PRE_2004_TRACK: {
      const sentencingDate = need(trackId, answers, "sentencingDate");
      const before2004 = yesNoUnsure(trackId, answers, "sentencedBeforeJuly2004");
      if (before2004 !== "yes") {
        throw new HawaiiEligibilityStopError(
          "hi-6228-not-pre-2004",
          trackId,
          before2004 === "no"
            ? "The sentence was imposed on or after 1 July 2004. HRS 706-622.8 is the provision for sentences before that date; a later sentence routes to HRS 706-622.5(4) instead."
            : "Whether the sentence was imposed before 1 July 2004 has not been established. That single date decides which of the two drug provisions applies, and the judgment carries it.",
          HI_ROUTING_REFERRAL,
          before2004 === "no"
            ? "Run the Hawaii routing again for the HRS 706-622.5(4) track."
            : "Read the sentencing date off the judgment and run the routing again."
        );
      }
      if (yesNo(trackId, answers, "cannotObtainRecord")) {
        throw new HawaiiEligibilityStopError(
          "hi-6228-record-unobtainable",
          trackId,
          "The record of a sentence more than twenty years old cannot be obtained. The motion has to identify the case, the offence and the judgment, and a motion that cannot identify them asks the Court to expunge something it cannot find.",
          HI_COURT_RECORD_REFERRAL,
          "Ask that clerk what survives of the file, in writing, before filing anything."
        );
      }
      if (yesNo(trackId, answers, "priorlySentencedUnder6225")) {
        throw new HawaiiEligibilityStopError(
          "hi-6228-not-first-sentence",
          trackId,
          "The participant had already been sentenced under HRS 706-622.5 before the sentence in question, so the first-time condition is not met.",
          HI_LAWYER_REFERRAL,
          "Ask one of those offices whether any other Hawaii relief reaches this record."
        );
      }
      return {
        ...base,
        ...shared,
        hiSectionCitation: "HRS 706-622.8",
        hiSectionTitle: "HRS 706-622.8, first-time drug offender sentenced before 1 July 2004",
        hiSentencingDate: sentencingDate,
        hiReliefStatement:
          "HRS 706-622.8 provides that the court shall issue a court order to expunge the record of conviction, subject only to the proviso the section states. The relief is mandatory once that proviso is met; whether it is met is the Court's to decide and this motion asks it to decide.",
        hiGroundOneStatement: `The participant states that they were sentenced on ${sentencingDate}, which is before 1 July 2004.`,
        hiGroundTwoStatement:
          "The participant states that this was a first drug offence within the section.",
        hiGroundThreeStatement:
          "The participant states that they complied with the terms and conditions imposed.",
        hiGroundFourStatement:
          "The participant states that they have not previously been granted an expungement of conviction under HRS 706-622.5 or HRS 706-622.8. The bar in HRS 706-622.8 runs both ways.",
        hiGroundFiveStatement:
          "The participant states that they can produce the record of the case if the Court asks for it.",
        hiNoWaitingPeriodStatement:
          "HRS 706-622.8 sets no waiting period. This motion states no period and computes none."
      };
    }

    case HI_PROPERTY_TRACK: {
      const subsection = branchKey(
        trackId,
        "propertySubsection",
        need(trackId, answers, "propertySubsection"),
        HI_PROPERTY_SUBSECTIONS
      );
      if (subsection === "unsure") {
        throw new HawaiiEligibilityStopError(
          "hi-6229-subsection-not-established",
          trackId,
          "Which limb of HRS 706-622.9 applies has not been established. The section carries a mandatory limb and a discretionary one, and they ask the Court for different things, so a motion has to know which it is on before it is drafted.",
          HI_COURT_RECORD_REFERRAL,
          "Read the sentencing date and the sentencing provision off the judgment and run the packet again."
        );
      }
      if (subsection === "discretionary") {
        throw new HawaiiEligibilityStopError(
          "hi-6229-discretionary-limb",
          trackId,
          "This case is on the discretionary limb of HRS 706-622.9, where the Court cannot make the mandatory finding and the relief is a matter for its discretion. A discretionary application is argued rather than recited, and this packet does not prepare argument.",
          HI_LAWYER_REFERRAL,
          "Take the judgment and the probation record to one of those offices."
        );
      }
      if (yesNo(trackId, answers, "priorOrSubsequentFelony")) {
        throw new HawaiiEligibilityStopError(
          "hi-6229-felony-history",
          trackId,
          "There is a prior or subsequent felony conviction in some jurisdiction. That is outside the first-time property offender route.",
          HI_LAWYER_REFERRAL,
          "Ask one of those offices whether any other Hawaii relief reaches this record."
        );
      }
      if (yesNo(trackId, answers, "nonviolenceContested")) {
        throw new HawaiiEligibilityStopError(
          "hi-6229-nonviolence-contested",
          trackId,
          "Whether the offence was non-violent is contested. That finding is the Court's, it is being disputed, and a disputed finding is argued rather than recited.",
          HI_LAWYER_REFERRAL,
          "Take the charging document and the judgment to one of those offices."
        );
      }
      const treatment = yesNoUnsure(trackId, answers, "completedTreatmentProgramme");
      if (treatment !== "yes") {
        throw new HawaiiEligibilityStopError(
          "hi-6229-programme-not-completed",
          trackId,
          treatment === "no"
            ? "The programme was not completed. Completion is the condition the section turns on."
            : "Whether the programme was successfully completed has not been established. It is the condition the section turns on, so it is not a detail to answer from memory.",
          treatment === "no" ? HI_LAWYER_REFERRAL : HI_COURT_RECORD_REFERRAL,
          treatment === "no"
            ? "Ask one of those offices whether any other route reaches this record."
            : "Ask the probation officer for the discharge record and run the packet again."
        );
      }
      return {
        ...base,
        ...shared,
        hiSectionCitation: "HRS 706-622.9",
        hiSectionTitle: "HRS 706-622.9, first-time property offender",
        hiReliefStatement:
          "HRS 706-622.9 provides that the court shall issue the expungement order on the mandatory limb, subject to the proviso the section states. This motion is on that limb. The relief is mandatory once the proviso is met; whether it is met is the Court's to decide and this motion asks it to decide.",
        hiGroundOneStatement:
          "The participant states that they were sentenced as a first-time property offender under HRS 706-622.9.",
        hiGroundTwoStatement:
          "The participant states that they successfully completed the programme.",
        hiGroundThreeStatement:
          "The participant states that they complied with the other terms and conditions imposed.",
        hiGroundFourStatement:
          "The participant states that they have no prior or subsequent felony conviction in any jurisdiction.",
        hiGroundFiveStatement:
          "The participant makes no statement about whether the offence was non-violent as a matter of law. That is a finding for the Court, and this motion asks the Court to make it.",
        hiNoWaitingPeriodStatement:
          "HRS 706-622.9 sets no waiting period. This motion states no period and computes none."
      };
    }

    case HI_DUI_TRACK: {
      if (yesNo(trackId, answers, "commercialLicenceOrVehicle")) {
        throw new HawaiiEligibilityStopError(
          "hi-291e64-commercial-exclusion",
          trackId,
          "The participant holds or held a commercial learner's permit or a commercial driver's licence, or the conviction was sustained while operating a commercial motor vehicle or transporting hazardous materials. HRS 291E-64(e) excludes each of those outright.",
          HI_LAWYER_REFERRAL,
          "Ask one of those offices whether anything reaches a commercial-licence record."
        );
      }
      const twentyOne = yesNoUnsure(trackId, answers, "hasAttainedTwentyOne");
      if (twentyOne !== "yes") {
        throw new HawaiiEligibilityStopError(
          "hi-291e64-under-twenty-one",
          trackId,
          twentyOne === "no"
            ? "The participant has not yet attained the age of twenty-one. The subsection permits the application upon attaining that age or thereafter, so the route is not open yet."
            : "Whether the participant has attained the age of twenty-one has not been established. The subsection permits the application only upon attaining that age or thereafter.",
          HI_ROUTING_REFERRAL,
          "Answer the age question and run the packet again once it is answered."
        );
      }
      if (yesNo(trackId, answers, "priorAlcoholContact")) {
        throw new HawaiiEligibilityStopError(
          "hi-291e64-prior-contact",
          trackId,
          "There is a prior alcohol enforcement contact. The subsection is drafted for a person without one.",
          HI_LAWYER_REFERRAL,
          "Ask one of those offices whether any other route reaches this record."
        );
      }
      if (yesNo(trackId, answers, "subsequentAlcoholOrDrugContact")) {
        throw new HawaiiEligibilityStopError(
          "hi-291e64-subsequent-contact",
          trackId,
          "There has been a subsequent alcohol or drug related enforcement contact. The subsection permits the application only if the person has had none since.",
          HI_LAWYER_REFERRAL,
          "Ask one of those offices whether any other route reaches this record."
        );
      }
      return {
        ...base,
        ...shared,
        hiSectionCitation: "HRS 291E-64(e)",
        hiSectionTitle: "HRS 291E-64(e), operating a vehicle after consuming alcohol while under 21",
        // The one route of the five where the relief is NOT established as
        // mandatory. The subsection is drafted differently from the other four
        // and this motion does not say the court must grant it.
        hiReliefStatement:
          "HRS 291E-64(e) permits the application to be made upon attaining the age of twenty-one or thereafter, and only if the person has had no subsequent alcohol or drug related enforcement contacts. This subsection is drafted differently from the other four conviction provisions, and this motion does not say that the order is mandatory. It asks the Court to grant it.",
        hiGroundOneStatement:
          "The participant states that the conviction was under HRS 291E-64 for operating a vehicle after consuming a measurable amount of alcohol while under the age of twenty-one.",
        hiGroundTwoStatement:
          "The participant states that they have attained the age of twenty-one.",
        hiGroundThreeStatement:
          "The participant states that they have had no subsequent alcohol or drug related enforcement contact.",
        hiGroundFourStatement:
          "The participant states that they have had no prior alcohol enforcement contact.",
        hiGroundFiveStatement:
          "The participant states that they hold no commercial learner's permit and no commercial driver's licence, and that this conviction was not sustained while operating a commercial motor vehicle or while transporting hazardous materials. HRS 291E-64(e) excludes each of those.",
        hiNoWaitingPeriodStatement:
          "The condition is age and the absence of a subsequent contact, not elapsed time. This motion states no period and computes none."
      };
    }

    default:
      throw new HawaiiBranchError(trackId, "trackId", trackId, HI_ASSIGNED_TRACK_IDS);
  }
}

// ---------------------------------------------------------------------------
// Shared template parts
// ---------------------------------------------------------------------------

type Section = { heading?: string; numbered?: boolean; paragraphs: readonly string[] };

const CAPTION_LEFT: readonly string[] = [
  "STATE OF HAWAII,",
  "",
  "Plaintiff,",
  "",
  "vs.",
  "",
  "______________________,",
  "",
  "Defendant."
];

const COMPLETE_BY_HAND_SECTION: Section = {
  heading: "COMPLETE THESE LINES BEFORE FILING",
  numbered: false,
  paragraphs: [
    "The design for this route asks nothing about who you are, so this packet holds no name, no date of birth and no case number. Write them in by hand, on every document here, before you file.",
    "Defendant's full legal name: __________________________________________",
    "Date of birth: ________________________________________________________",
    "Case number, from the judgment: _______________________________________",
    "Read every statement below against your own court record and correct anything that does not match before you sign."
  ]
};

const VEHICLE_SECTION: Section = {
  heading: "WHY THIS IS A MOTION",
  numbered: false,
  paragraphs: [
    "{{hiRule47Basis}}",
    "So the statute's word \"written application\" and the word Haw. R. Penal P. 47(a) uses, \"motion\", describe the same thing, and this is filed as a motion in the existing penal case rather than as a new proceeding. The Hawaii Judiciary publishes no statewide form for it.",
    "{{hiVenueStatement}}"
  ]
};

const GROUNDS_SECTION: Section = {
  heading: "I. THE CASE AND THE GROUNDS",
  numbered: true,
  paragraphs: [
    "The Defendant is the person named in the caption above, whose name, date of birth and case number are written in by hand.",
    "{{hiOffenceStatement}}",
    "{{hiJudgmentStatement}}",
    "{{hiGroundOneStatement}}",
    "{{hiGroundTwoStatement}}",
    "{{hiGroundThreeStatement}}",
    "{{hiGroundFourStatement}}",
    "{{hiGroundFiveStatement}}",
    "{{hiParticularOffenceStatement}}"
  ]
};

const RELIEF_SECTION: Section = {
  heading: "II. THE RELIEF THE SECTION PROVIDES",
  numbered: false,
  paragraphs: ["{{hiReliefStatement}}", "{{hiNoWaitingPeriodStatement}}", "{{hiNoFeeStatement}}"]
};

const NOT_ASSERTED_SECTION: Section = {
  heading: "III. WHAT THIS MOTION DOES NOT SAY",
  numbered: false,
  paragraphs: [
    "{{hiNotAssertedStatement}}",
    "It does not say that any period has run, and it computes none.",
    "{{hiStageTwoStatement}}"
  ]
};

const DECLARATION_SECTION: Section = {
  heading: "IV. DECLARATION IN SUPPORT",
  numbered: false,
  paragraphs: [
    "{{hiDeclarationBasis}}",
    "I am the Defendant named in the caption. I have read this motion and the statements in it are mine and are true to the best of my knowledge and belief. I understand that nobody at LegalEase has seen my court record, decided whether I am eligible, obtained anything from the prosecuting attorney, or given me legal advice, and that whether this record may be expunged is for the Court to decide.",
    "I declare under penalty of law that the foregoing is true and correct.",
    "Signature of Defendant: _______________________________________________",
    "Date: _________________________________________________________________"
  ]
};

const STOP_SECTION: Section = {
  heading: "WHERE THIS PACKET STOPS",
  numbered: false,
  paragraphs: [
    "LegalEase prepares documents from what the participant says. It gives no legal advice, reads no record, decides no eligibility question and files nothing.",
    "An opposition by the prosecuting attorney, or a contested hearing set by the Court.",
    "Any dispute about whether a programme was completed or whether the terms and conditions were complied with.",
    "Any earlier expungement of conviction under HRS 706-622.5 or HRS 706-622.8, which bars another.",
    "Any immigration matter, and any wish to attack the conviction rather than to expunge its record.",
    "Records held by a federal, tribal, military or out-of-state agency, which a Hawaii order does not reach.",
    "Where any of these applies, speak to a lawyer before filing. {{hiReferralLine}}"
  ]
};

const MOTION_SIGNATURE_BLOCK: readonly string[] = [
  "",
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Email: _____________________________________",
  "Date: ______________________________________",
  "",
  "Sign and date this by hand, in ink, before you file it. Nothing here is sworn before a notary: Haw. R. Penal P. 47(d) permits a declaration, and none of the five provisions requires an oath.",
  "File it in the existing penal case in the court named in the caption, and keep a copy.",
  "{{hiNoFeeStatement}}"
];

/**
 * The Rule 49(c) certificate.
 *
 * It is written entirely in the future and the imperative: the participant has
 * not served anybody at the moment this prints, and the certificate must not
 * say that they have. The date and the signature are theirs to complete after
 * they serve.
 */
const CERTIFICATE_OF_SERVICE: readonly string[] = [
  // The renderer prints the "CERTIFICATE OF SERVICE" heading itself; repeating
  // it here printed it twice.
  "{{hiServiceBasis}}",
  "Complete and sign this only after you have served the prosecuting attorney. It is not evidence of anything until you do.",
  "I certify that on the date written below I served a copy of the foregoing motion on the prosecuting attorney at the address written below, by the method marked.",
  "Prosecuting attorney served: __________________________________________",
  "Address: ______________________________________________________________",
  "Method:  (  ) hand delivery   (  ) United States mail, postage prepaid   (  ) as the court's electronic filing system provides",
  "Date of service: ______________________________________________________",
  "Signature: ____________________________________________________________",
  "Printed name: _________________________________________________________"
];

/**
 * The proposed order.
 *
 * Every finding box is unmarked, the date is blank and the signature line is
 * the Judge's. Nothing on it is completed by LegalEase or by the participant
 * beyond the case identification the caption carries.
 */
const ORDER_PREAMBLE =
  "This is a proposed order, tendered for the Court's consideration with the motion it accompanies. Every finding, date and signature below is left blank for the Court. It has been granted by nobody and signed by nobody.";

const ORDER_SIGNATURE_BLOCK: readonly string[] = [
  "",
  "_____________________________________",
  "JUDGE OF THE ABOVE-ENTITLED COURT",
  "",
  "Dated: ______________________",
  "",
  "The findings, the date and the signature above are the Court's. They are printed blank, and LegalEase has made no finding and signed nothing."
];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function motionTemplate(trackId: string, shortTitle: string, orderCaption: string): PleadingTemplate {
  return {
    templateId: `${trackId}-motion`,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "{{hiCourtLine}}",
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: ["Case No. ______________", "", orderCaption]
    },
    title: `MOTION TO EXPUNGE THE RECORD OF CONVICTION — ${shortTitle}`,
    preamble:
      "The Defendant, appearing without a lawyer, moves this Court under the section named below for an order expunging the record of conviction for the offence identified below, and states as follows. LegalEase prepared this motion from the Defendant's own answers, has seen no court record and no probation file, has decided nothing, represents nobody and has filed nothing.",
    sections: [
      COMPLETE_BY_HAND_SECTION,
      VEHICLE_SECTION,
      GROUNDS_SECTION,
      RELIEF_SECTION,
      NOT_ASSERTED_SECTION,
      DECLARATION_SECTION,
      STOP_SECTION
    ],
    prayer: [
      "WHEREFORE, the Defendant asks the Court to issue its order expunging the record of conviction for the particular offence identified above, and to direct that a copy of the order be provided to the Defendant so that it may accompany the application to the Criminal Justice Data Center.",
      "Nothing in this motion reports a decision by anyone. It asks."
    ],
    signatureLabel: "Defendant, self-represented",
    signatureBlock: MOTION_SIGNATURE_BLOCK,
    certificateOfService: CERTIFICATE_OF_SERVICE
  };
}

function orderTemplate(trackId: string, shortTitle: string, findings: readonly string[]): PleadingTemplate {
  return {
    templateId: `${trackId}-order`,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "{{hiCourtLine}}",
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: ["Case No. ______________", "", "ORDER EXPUNGING RECORD"]
    },
    title: `PROPOSED ORDER EXPUNGING RECORD OF CONVICTION — ${shortTitle}`,
    preamble: ORDER_PREAMBLE,
    sections: [
      {
        heading: undefined,
        numbered: false,
        paragraphs: [
          "THIS MATTER came before the Court on the Defendant's motion under {{hiSectionCitation}} to expunge the record of conviction for the offence identified in the motion.",
          "The Court, having considered the motion, FINDS:"
        ]
      },
      {
        heading: undefined,
        numbered: false,
        paragraphs: findings
      },
      {
        heading: undefined,
        numbered: false,
        paragraphs: [
          "IT IS HEREBY ORDERED that the record of conviction for that particular offence be expunged as {{hiSectionCitation}} provides.",
          "The offence to which this order relates: ______________________________",
          "______________________________________________________________________",
          "The order reaches that particular offence. An offence left off the line above is not reached by it, and the line is completed by the Defendant from the record and settled by the Court.",
          "IT IS FURTHER ORDERED that a certified copy of this order be provided to the Defendant."
        ]
      }
    ],
    prayer: [],
    // The court signs a proposed order, so the participant signature rule is
    // suppressed rather than left to default.
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  };
}

const DRUG_MOTION = motionTemplate(HI_DRUG_TRACK, "HRS 706-622.5(4)", "MOTION TO EXPUNGE");
const DRUG_ORDER = orderTemplate(HI_DRUG_TRACK, "HRS 706-622.5(4)", [
  "(  ) that the Defendant was sentenced to probation under HRS 706-622.5;",
  "(  ) that the Defendant successfully completed the substance abuse treatment programme;",
  "(  ) that the Defendant complied with the other terms and conditions of probation; and",
  "(  ) that the Defendant had not previously been sentenced under HRS 706-622.5."
]);

const MARIJUANA_MOTION = motionTemplate(HI_MARIJUANA_TRACK, "HRS 706-622.5(5)", "MOTION TO EXPUNGE");
const MARIJUANA_ORDER = orderTemplate(HI_MARIJUANA_TRACK, "HRS 706-622.5(5)", [
  "(  ) that the conviction was for possession of three grams or less of marijuana; and",
  "(  ) that no other criminal charge arose from the same facts and circumstances."
]);

const PRE_2004_MOTION = motionTemplate(HI_PRE_2004_TRACK, "HRS 706-622.8", "MOTION TO EXPUNGE");
const PRE_2004_ORDER = orderTemplate(HI_PRE_2004_TRACK, "HRS 706-622.8", [
  "(  ) that the Defendant was sentenced before July 1, 2004;",
  "(  ) that this was a first drug offence within HRS 706-622.8;",
  "(  ) that the Defendant complied with the terms and conditions imposed; and",
  "(  ) that no expungement of conviction has previously been granted to the Defendant under HRS 706-622.5 or HRS 706-622.8."
]);

const PROPERTY_MOTION = motionTemplate(HI_PROPERTY_TRACK, "HRS 706-622.9", "MOTION TO EXPUNGE");
const PROPERTY_ORDER = orderTemplate(HI_PROPERTY_TRACK, "HRS 706-622.9", [
  "(  ) that the Defendant was sentenced as a first-time property offender under HRS 706-622.9;",
  "(  ) that the Defendant successfully completed the programme;",
  "(  ) that the Defendant complied with the other terms and conditions imposed; and",
  "(  ) that the offence was non-violent within the meaning of the section."
]);

const DUI_MOTION = motionTemplate(HI_DUI_TRACK, "HRS 291E-64(e)", "MOTION TO EXPUNGE");
const DUI_ORDER = orderTemplate(HI_DUI_TRACK, "HRS 291E-64(e)", [
  "(  ) that the Defendant has attained the age of twenty-one;",
  "(  ) that the Defendant has had no subsequent alcohol or drug related enforcement contact; and",
  "(  ) that the exclusions in HRS 291E-64(e) for a commercial learner's permit, a commercial driver's licence, operation of a commercial motor vehicle and the transport of hazardous materials do not apply."
]);

export const HI_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [DRUG_MOTION.templateId]: DRUG_MOTION,
  [DRUG_ORDER.templateId]: DRUG_ORDER,
  [MARIJUANA_MOTION.templateId]: MARIJUANA_MOTION,
  [MARIJUANA_ORDER.templateId]: MARIJUANA_ORDER,
  [PRE_2004_MOTION.templateId]: PRE_2004_MOTION,
  [PRE_2004_ORDER.templateId]: PRE_2004_ORDER,
  [PROPERTY_MOTION.templateId]: PROPERTY_MOTION,
  [PROPERTY_ORDER.templateId]: PROPERTY_ORDER,
  [DUI_MOTION.templateId]: DUI_MOTION,
  [DUI_ORDER.templateId]: DUI_ORDER
};

// ---------------------------------------------------------------------------
// Packet sets
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * Design role → engine role.
 *
 * Both design roles land on the closed twelve-value engine type unchanged. The
 * certificate of service is not a separate component on any of these five
 * tracks: the design puts it on the face of the motion, which is where
 * Haw. R. Penal P. 49(c) puts it too.
 */
export const HI_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order"
};

function packetSet(trackId: string): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId: `${trackId}-primary-filing-1`,
        role: HI_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: `${trackId}-motion`,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide",
        requirement: "required",
        order: 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      },
      {
        componentId: `${trackId}-proposed-order-2`,
        role: HI_DESIGN_ROLE_TO_ENGINE_ROLE.proposed_order,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: `${trackId}-order`,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide",
        requirement: "required",
        order: 2,
        approval: PENDING_APPROVAL,
        version: VERSION
      }
      // `-primary-filing-3` is HCJDC 159(b), official_pdf_fill, stage two. It
      // is not declared here because this lane does not render it.
    ]
  };
}

// ---------------------------------------------------------------------------
// Required inputs
// ---------------------------------------------------------------------------

/** The questions every one of the five routes asks. */
const COMMON_INPUTS: readonly RequiredInput[] = [
  {
    key: "courtLevel",
    label:
      "Which court sentenced you — circuit, district or family? Answer circuit, district, family or unsure. The level follows the offence: the class C felony drug and property routes are circuit court matters and a violation is a district court matter. Read it off the judgment rather than answering from memory.",
    required: true
  },
  {
    key: "circuit",
    label:
      "Which judicial circuit was the case in? Answer first (Oahu), second (Maui, Molokai and Lanai), third (Hawaii island), fifth (Kauai and Niihau) or unsure.",
    required: true
  },
  {
    key: "offenceAndStatute",
    label:
      "What was the offence, and which statute section was it under? The order reaches that particular offence, so the motion has to name it.",
    required: true
  },
  { key: "judgmentDate", label: "On what date was judgment entered?", required: true },
  {
    key: "prosecutorOpposesOrContested",
    label:
      "Has the prosecuting attorney opposed this, or has the court set a contested hearing? Answer yes or no.",
    required: true
  },
  {
    key: "priorExpungementGranted",
    label:
      "Have you ever been granted an expungement of a conviction under HRS 706-622.5 or HRS 706-622.8? Answer yes or no. The bar runs both ways.",
    required: true
  },
  {
    key: "immigrationMatter",
    label: "Is there any immigration matter? Answer yes or no.",
    required: true
  },
  {
    key: "attackingTheConviction",
    label:
      "Are you trying to set the conviction aside rather than expunge the record of it? Answer yes or no. That is a different proceeding.",
    required: true
  }
];

const TRACK_INPUTS: Readonly<Record<string, readonly RequiredInput[]>> = {
  [HI_DRUG_TRACK]: [
    {
      key: "sentencedToProbationUnder6225",
      label: "Were you sentenced to probation under HRS 706-622.5? Answer yes or no.",
      required: true
    },
    {
      key: "completedTreatmentProgramme",
      label:
        "Did you successfully complete the substance abuse treatment programme? Answer yes, no or unsure.",
      required: true
    },
    {
      key: "termsDisputed",
      label:
        "Is there any dispute about whether you complied with the other terms and conditions of probation? Answer yes or no.",
      required: true
    },
    {
      key: "priorlySentencedUnder6225",
      label:
        "Had you already been sentenced under HRS 706-622.5 before the sentence in this case? Answer yes or no. The one-time eligibility depends on the answer being no.",
      required: true
    }
  ],
  [HI_MARIJUANA_TRACK]: [
    {
      key: "threeGramsOrLess",
      label: "Was the amount three grams or less? Answer yes, no or unsure.",
      required: true
    },
    {
      key: "otherChargeSameFacts",
      label:
        "Did any other criminal charge arise from the same facts and circumstances? Answer yes or no.",
      required: true
    }
  ],
  [HI_PRE_2004_TRACK]: [
    { key: "sentencingDate", label: "On what date were you sentenced?", required: true },
    {
      key: "sentencedBeforeJuly2004",
      label:
        "Was that sentence imposed before 1 July 2004? Answer yes, no or unsure. That date decides which of the two drug provisions applies.",
      required: true
    },
    {
      key: "cannotObtainRecord",
      label:
        "Is the record of the case impossible to obtain? Answer yes or no. A sentence more than twenty years old is sometimes no longer held.",
      required: true
    },
    {
      key: "priorlySentencedUnder6225",
      label:
        "Had you already been sentenced under HRS 706-622.5 before the sentence in this case? Answer yes or no.",
      required: true
    }
  ],
  [HI_PROPERTY_TRACK]: [
    {
      key: "propertySubsection",
      label:
        "Which limb of HRS 706-622.9 applies — the mandatory one or the discretionary one? Answer mandatory, discretionary or unsure. The sentencing date and the sentencing provision decide it.",
      required: true
    },
    {
      key: "priorOrSubsequentFelony",
      label:
        "Is there any prior or subsequent felony conviction, in any jurisdiction? Answer yes or no.",
      required: true
    },
    {
      key: "nonviolenceContested",
      label: "Is it contested whether the offence was non-violent? Answer yes or no.",
      required: true
    },
    {
      key: "completedTreatmentProgramme",
      label: "Did you successfully complete the programme? Answer yes, no or unsure.",
      required: true
    }
  ],
  [HI_DUI_TRACK]: [
    {
      key: "commercialLicenceOrVehicle",
      label:
        "Do you hold, or did you hold, a commercial learner's permit or a commercial driver's licence, or was this conviction sustained while operating a commercial motor vehicle or transporting hazardous materials? Answer yes or no. Each of those excludes the route.",
      required: true
    },
    {
      key: "hasAttainedTwentyOne",
      label:
        "Have you attained the age of twenty-one? Answer yes, no or unsure. The subsection permits the application only upon attaining that age or thereafter.",
      required: true
    },
    {
      key: "priorAlcoholContact",
      label: "Was there any prior alcohol enforcement contact? Answer yes or no.",
      required: true
    },
    {
      key: "subsequentAlcoholOrDrugContact",
      label:
        "Has there been any alcohol or drug related enforcement contact since? Answer yes or no.",
      required: true
    }
  ]
};

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

const statuses = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

function hawaiiTrack(spec: {
  trackId: string;
  publicName: string;
  authority: string;
  mechanism: string;
  dispositions: readonly string[];
  packetName: string;
  packetTitle: string;
  deliverable: string;
  notes: string;
}): ReliefTrack {
  return {
    jurisdiction: "HI",
    trackId: spec.trackId,
    publicName: spec.publicName,
    mechanism: spec.mechanism,
    authority: spec.authority,
    recordTypes: ["conviction_record"],
    dispositions: [...spec.dispositions],
    // Not a track constant, and deliberately: the level follows the offence in
    // the participant's own case and is asked rather than assumed.
    courtLevel: "the_sentencing_court_level_follows_the_offence_and_is_a_participant_input",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSet(spec.trackId),
    requiredInputs: [...COMMON_INPUTS, ...(TRACK_INPUTS[spec.trackId] ?? [])],
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

const STAGE_TWO_NOTE =
  "Stage one only. The court order this motion asks for is the precondition for the HCJDC 159(b) Expungement Application, which is a separate component on another renderer lane and is not produced here; no document in this packet fills it, describes it as filled, or claims that the Hawaii Judiciary publishes a statewide stage-one form, because none exists.";

export const HI_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  hawaiiTrack({
    trackId: HI_DRUG_TRACK,
    publicName: "Expunge a first Hawaii drug conviction after probation",
    authority: "HRS § 706-622.5(4)",
    mechanism: "stage_one_motion_to_expunge_record_of_conviction",
    dispositions: ["first-time drug offender conviction within § 706-622.5(4)"],
    packetName: "hi-first-time-drug-offender-stage-one-motion",
    packetTitle: "Hawaii stage-one motion to expunge a first-time drug conviction — HRS § 706-622.5(4)",
    deliverable:
      "A Haw. R. Penal P. 47(a) motion to be filed in the participant's own existing penal case in the court that sentenced them, reciting the five conditions subsection (4) states as the participant's own statements, carrying the Rule 47(d) declaration in support and the Rule 49(c) certificate of service on the prosecuting attorney, together with a proposed order whose every finding, date and signature is blank for the Court. No period is stated, no amount is printed and no eligibility conclusion is drawn.",
    notes: `${STAGE_TWO_NOTE} The compliance ground carries the Hawaii Supreme Court's holding that completion of the probation term and discharge satisfies it, cited rather than paraphrased.`
  }),
  hawaiiTrack({
    trackId: HI_MARIJUANA_TRACK,
    publicName: "Expunge a Hawaii conviction for three grams or less of marijuana",
    authority: "HRS § 706-622.5(5)",
    mechanism: "stage_one_motion_to_expunge_record_of_conviction",
    dispositions: ["conviction for possession of three grams or less of marijuana within § 706-622.5(5)"],
    packetName: "hi-marijuana-three-grams-stage-one-motion",
    packetTitle:
      "Hawaii stage-one motion to expunge a three-grams-or-less marijuana conviction — HRS § 706-622.5(5)",
    deliverable:
      "A Haw. R. Penal P. 47(a) motion in the participant's own existing penal case, whose only statutory condition is the quantity, with the Rule 47(d) declaration and the Rule 49(c) certificate of service, and a proposed order printed blank for the Court. The caption names a district court because the offence is a violation.",
    notes: `${STAGE_TWO_NOTE} Any other charge arising from the same facts and circumstances defeats the route and stops it, and an unestablished quantity stops it rather than being drafted around.`
  }),
  hawaiiTrack({
    trackId: HI_PRE_2004_TRACK,
    publicName: "Expunge a Hawaii drug conviction sentenced before July 2004",
    authority: "HRS § 706-622.8",
    mechanism: "stage_one_motion_to_expunge_record_of_conviction",
    dispositions: ["first-time drug offender conviction sentenced before July 1, 2004, within § 706-622.8"],
    packetName: "hi-pre-2004-drug-offender-stage-one-motion",
    packetTitle:
      "Hawaii stage-one motion to expunge a pre-July-2004 drug conviction — HRS § 706-622.8",
    deliverable:
      "A Haw. R. Penal P. 47(a) motion in the participant's own existing penal case for a sentence imposed before 1 July 2004, with the Rule 47(d) declaration and the Rule 49(c) certificate of service, and a proposed order printed blank for the Court.",
    notes: `${STAGE_TWO_NOTE} A sentence on or after 1 July 2004 routes to HRS 706-622.5(4) rather than being drafted here, and a record that cannot be obtained stops the route because the motion has to identify the case it asks about.`
  }),
  hawaiiTrack({
    trackId: HI_PROPERTY_TRACK,
    publicName: "Expunge a first Hawaii property conviction after probation",
    authority: "HRS § 706-622.9",
    mechanism: "stage_one_motion_to_expunge_record_of_conviction",
    dispositions: ["first-time property offender conviction within § 706-622.9"],
    packetName: "hi-first-time-property-offender-stage-one-motion",
    packetTitle:
      "Hawaii stage-one motion to expunge a first-time property conviction — HRS § 706-622.9",
    deliverable:
      "A Haw. R. Penal P. 47(a) motion in the participant's own existing penal case on the mandatory limb of HRS 706-622.9, with the Rule 47(d) declaration and the Rule 49(c) certificate of service, and a proposed order printed blank for the Court. The non-violence finding is asked of the Court rather than asserted.",
    notes: `${STAGE_TWO_NOTE} The section carries a mandatory limb and a discretionary one; this packet is built for the mandatory limb only, and the discretionary limb stops to a lawyer because a discretionary application is argued rather than recited.`
  }),
  hawaiiTrack({
    trackId: HI_DUI_TRACK,
    publicName: "Expunge a Hawaii under-21 drink-driving conviction",
    authority: "HRS § 291E-64(e)",
    mechanism: "stage_one_motion_to_expunge_record_of_conviction",
    dispositions: [
      "conviction for operating a vehicle after consuming a measurable amount of alcohol while under 21, within § 291E-64(e)"
    ],
    packetName: "hi-under-21-dui-stage-one-motion",
    packetTitle: "Hawaii stage-one motion to expunge an under-21 drink-driving conviction — HRS § 291E-64(e)",
    deliverable:
      "A Haw. R. Penal P. 47(a) motion in the participant's own existing penal case, with the Rule 47(d) declaration and the Rule 49(c) certificate of service, and a proposed order printed blank for the Court. The three statutory exclusions are screened before anything is drafted.",
    notes: `${STAGE_TWO_NOTE} This is the one of the five where the relief is NOT established as mandatory: the subsection is drafted differently from the other four, so the motion asks the Court to grant the order and does not say it must.`
  })
];
