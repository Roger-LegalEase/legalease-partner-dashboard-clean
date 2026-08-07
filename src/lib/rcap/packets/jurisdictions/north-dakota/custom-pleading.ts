// North Dakota record clearing — custom-pleading implementation.
//
// Five assigned routes and thirteen custom-pleading components. Three of the
// routes run on N.D.C.C. Chapter 12-60.1 and carry a petition, a mandatory
// proposed order and a proof of service; the impaired-driving route under
// § 39-08-01.6 and the first-marijuana route under § 19-03.1-23(9) each carry a
// filing and a conditional proposed order. The process_guidance components the
// design assigns beside them belong to the guidance lane.
//
// **Why these are custom pleadings at all.** North Dakota publishes no sealing
// form. The Legal Self Help Center's own research guides say in terms that no
// forms for sealing criminal records are available and that the participant
// creates their own petition and other legal documents. Those same guides then
// supply the drafting specification — the pleading titles, the parties, the
// required contents, the service rule and the mandatory proposed-order recitals
// — so every document here is written to a published specification rather than
// invented.
//
// Five things shape every document in this module.
//
// **Sealing is not expungement, and North Dakota's three seals are not the same
// seal.** Chapter 12-60.1 sealing prohibits disclosure of the existence or
// contents of court and prosecution records except by court order, and reaches
// neither BCI criminal history record information nor the criminal justice data
// system. The § 39-08-01.6 impaired-driving seal is the § 12.1-32-07.2(2)
// restricted-access regime, and a prosecutor keeps access to the prior offence
// for enhancement under § 39-08-01(3). The § 19-03.1-23(9) marijuana seal is
// the strongest of the three and the only irreversible one: once sealed, the
// court record may not be opened even by order of the court. Each filing says
// which seal it is asking for and what that seal leaves in place.
//
// **The findings are the court's and are not written for it.** Section
// 12-60.1-04(1) requires six findings and § 12-60.1-04(5) puts a
// clear-and-convincing burden on the petitioner. The adopted design identifies
// three of the six by subsection — (c) completed imprisonment and probation,
// (d) restitution paid, (e) reformation — and quotes the § 12-60.1-04(8) recital
// the order must carry. It does not supply the text of the others. So no
// proposed order in this module enumerates "six findings" or writes a finding in
// the court's voice. Each recites the § 12-60.1-04(8) language the statute
// prescribes for the order, names § 12-60.1-04(1) as the source of the findings,
// leaves the findings block for the court, and tells the petitioner to read the
// subsection and add any recital this draft does not carry. Inventing the three
// unread findings would be inventing statutory text.
//
// **No fee amount is printed anywhere.** The statewide fee schedule effective
// 1 July 2025 carries no line item for a Chapter 12-60.1 petition or for a
// motion within an existing criminal case, and the official research guide tells
// the participant to ask the clerk what the fee is, if any. The design records
// that as a release blocker. Every packet says the amount is not established and
// tells the participant to ask the clerk; none states a figure.
//
// **Reformation is the petitioner's own account.** Section 12-60.1-03(2)(c)
// requires the petition to set out the reasons sealing should be granted and
// § 12-60.1-04(1)(e) makes reformation a finding. LegalEase never asserts good
// cause or reformation: the petitioner's words are carried through verbatim and
// framed as theirs.
//
// **The two open questions are preserved, not answered.** The two-year anchor in
// § 19-03.1-23(9) is grammatically open between two years from the judgment and
// two years from the further violation, so no marijuana packet computes it and
// any subsequent controlled-substance conviction stops the route. Section
// 39-08-01.6(1) says the court shall seal and states no motion trigger, so no
// impaired-driving packet represents the petition as statutorily mandated. The
// impaired-driving carve-out from Chapter 12-60.1 appears only in the ND Courts
// guides and not in § 12-60.1-02(2); the routing follows the guides and says so.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel adopts
// it. Every track is `technicalFixture` and `runtimeDisabled`: nothing here
// reaches a runtime surface, and wiring these tracks and templates into the
// shared registry and template pack is the integration captain's step.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referral destinations
// ---------------------------------------------------------------------------

/** Where a stop that needs individual legal advice sends the petitioner. */
export const ND_REFERRAL =
  "Legal Services of North Dakota on 1-800-634-5263, or the State Bar Association of North Dakota lawyer referral service.";

/** Where a stop about the court's own process sends the petitioner. */
export const ND_CLERK_REFERRAL =
  "The clerk of the court that holds the criminal case, which is where this filing goes and which is the office that can say what a filing fee is, if any.";

/** Where a stop that needs the record itself sends the petitioner. */
export const ND_RECORD_REFERRAL =
  "The clerk of court for the judgment, the charging document and the disposition, and the North Dakota Attorney General's Bureau of Criminal Investigation for your own criminal history record.";

/** Where an impaired-driving record belongs instead of Chapter 12-60.1. */
export const ND_DUI_ROUTE_REFERRAL =
  "LegalEase's own North Dakota routing: an impaired-driving record is reached by the separate seal under N.D.C.C. § 39-08-01.6, not by a Chapter 12-60.1 petition.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class NorthDakotaEligibilityStopError extends Error {
  readonly code = "north_dakota_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "NorthDakotaEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class NorthDakotaBranchError extends Error {
  readonly code = "north_dakota_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "NorthDakotaBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/** The five assigned routes, held closed so an unassigned track cannot derive. */
export const ND_ASSIGNED_TRACK_IDS: readonly string[] = [
  "nd-dui-record-seal",
  "nd-marijuana-first-offense-seal",
  "nd-seal-felony-conviction",
  "nd-seal-misdemeanor-conviction",
  "nd-seal-pardoned-conviction"
];

/** The three Chapter 12-60.1 routes, which share a petition and an order. */
export const ND_CHAPTER_12_60_1_TRACK_IDS: readonly string[] = [
  "nd-seal-felony-conviction",
  "nd-seal-misdemeanor-conviction",
  "nd-seal-pardoned-conviction"
];

/** The only two answers a yes-or-no screen accepts. No default, no coercion. */
export const ND_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/** District or municipal, which decides the respondent and the appeal route. */
export const ND_COURT_TYPES: Readonly<Record<string, "district" | "municipal"> > = {
  district: "district",
  "district court": "district",
  municipal: "municipal",
  "municipal court": "municipal"
};

const ND_COURT_PHRASE: Readonly<Record<string, string>> = {
  district: "the District Court",
  municipal: "the Municipal Court"
};

/** Which office prosecuted, which is the respondent under § 12-60.1-03(4). */
export const ND_PROSECUTOR_OFFICES: Readonly<Record<string, "city_attorney" | "states_attorney">> = {
  city_attorney: "city_attorney",
  "city attorney": "city_attorney",
  states_attorney: "states_attorney",
  "state's attorney": "states_attorney",
  "states attorney": "states_attorney",
  "county state's attorney": "states_attorney"
};

/** Restitution, which § 12-60.1-04(1)(d) makes a finding. */
const RESTITUTION_PAID = "paid in full";
const RESTITUTION_NONE = "never ordered in this case";
const RESTITUTION_OUTSTANDING = "not paid in full";

export const ND_RESTITUTION_STATUS: Readonly<Record<string, string>> = {
  paid: RESTITUTION_PAID,
  "paid in full": RESTITUTION_PAID,
  none_ordered: RESTITUTION_NONE,
  "none ordered": RESTITUTION_NONE,
  not_paid: RESTITUTION_OUTSTANDING,
  "not paid": RESTITUTION_OUTSTANDING
};

/** Whether the pardon is unconditional, which § 12-55.1-01(2) makes decisive. */
export const ND_PARDON_KINDS: Readonly<Record<string, "unconditional" | "conditional">> = {
  unconditional: "unconditional",
  conditional: "conditional"
};

/** How the impaired-driving conviction was entered. */
const DUI_GUILTY_PLEA = "pleaded guilty";
const DUI_NO_CONTEST = "pleaded no contest";
const DUI_FOUND_GUILTY = "was found guilty";

export const ND_DUI_CONVICTION_TYPES: Readonly<Record<string, string>> = {
  guilty_plea: DUI_GUILTY_PLEA,
  "guilty plea": DUI_GUILTY_PLEA,
  no_contest: DUI_NO_CONTEST,
  "no contest": DUI_NO_CONTEST,
  found_guilty: DUI_FOUND_GUILTY,
  "found guilty": DUI_FOUND_GUILTY
};

/** State statute or municipal ordinance, which changes what must be shown. */
export const ND_DUI_CHARGED_UNDER: Readonly<Record<string, "statute" | "ordinance">> = {
  statute: "statute",
  "state statute": "statute",
  ordinance: "ordinance",
  "city ordinance": "ordinance",
  "municipal ordinance": "ordinance"
};

/** The two substances § 19-03.1-23(9) names, each with its own threshold. */
export const ND_MARIJUANA_SUBSTANCES: Readonly<Record<string, "marijuana" | "thc">> = {
  marijuana: "marijuana",
  thc: "thc",
  tetrahydrocannabinol: "thc"
};

/**
 * Answer keys that would carry outside-party work into a packet.
 *
 * Nothing in the adopted design declares any of them, so their presence means a
 * caller is trying to have LegalEase supply a judicial finding, a prosecutor's
 * position, a clerk certification, a hearing date, a filing date or a completed
 * service. Section 12-60.1-04 puts every one of those on somebody else.
 */
export const ND_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "clerkCertification",
  "courtFindings",
  "filingDate",
  "hearingDate",
  "judgeName",
  "judgeSignature",
  "judicialFinding",
  "prosecutorConsent",
  "prosecutorPosition",
  "prosecutorStipulation",
  "serviceCompleted",
  "signedOrder"
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
  throw new NorthDakotaEligibilityStopError(stopId, trackId, reason, referral, nextStep);
}

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "nd-answer-missing",
      trackId,
      `The filing needs an answer to ${key} before anything can be prepared, and none was given. Section 12-60.1-03(2) and the official research guides set the required contents, and a filing that leaves one of them blank is one the clerk will return.`,
      ND_RECORD_REFERRAL,
      "Get the judgment and the docket from the clerk of court, and your criminal history record from the Bureau of Criminal Investigation, then answer the question from the record rather than from memory."
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
    throw new NorthDakotaBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), ND_YES_NO);

/** Phrases a person uses when the answer to a "have you ever" question is no. */
const NONE_ANSWER =
  /^(no|none|nope|nil|n\/a|na|no\.|none\.|not any|never)\b|^(no|none)[, .]|\bnone at all\b|\bnothing (else|further|pending)\b|\bno (other )?(charges?|convictions?|cases?) (at all|anywhere)?\b/i;

const statesNone = (value: string): boolean => NONE_ANSWER.test(value.trim());

/** Phrases that mean the participant cannot answer from the record. */
const UNKNOWN_ANSWER =
  /\b(don'?t know|do not know|not sure|unsure|no idea|unknown|can'?t remember|cannot remember|can'?t recall|cannot recall|not certain)\b/i;

/**
 * An open case, asserted rather than denied.
 *
 * The design's question asks for charges "past or pending" in one answer, so the
 * word alone proves nothing — "no charges pending" contains it. The negated form
 * is subtracted first, and only a positive assertion stops the route.
 */
const NEGATED_PENDING = /\b(no|none|not|nothing|never)\b[^.]{0,24}\bpending\b/i;
const mentionsPendingCharge = (value: string): boolean =>
  /\b(pending|awaiting trial|open case|unresolved charge)\b/i.test(value) &&
  !NEGATED_PENDING.test(value);

/**
 * An impaired-driving offence, which the official guides route away from
 * Chapter 12-60.1.
 *
 * Matched on the offence description the participant gives, because that is the
 * only place the design asks what the conviction was.
 */
const IMPAIRED_DRIVING =
  /\b(d\.?u\.?i|d\.?w\.?i|driving under the influence|impaired driving|actual physical control)\b/i;

/** True where the answer at least states a year, which is what a recital needs. */
const statesAYear = (raw: string): boolean => /\b(19|20)\d{2}\b/.test(raw);

/**
 * An answer to an "on what date" question that the route turns on.
 *
 * A year is enough for a recital the court and the prosecutor will check against
 * the record. An answer that states no year at all, or that says the participant
 * does not know, is a stop rather than a blank line in a filed document.
 */
function needDatedAnswer(
  trackId: string,
  answers: Answers,
  key: string,
  stopId: string,
  what: string
): string {
  const value = need(trackId, answers, key);
  if (UNKNOWN_ANSWER.test(value) || !statesAYear(value)) {
    stop(
      stopId,
      trackId,
      `The filing asks for ${what} and the answer given does not state one. This route turns on that date, and LegalEase will not file a document with a date nobody has taken from the record.`,
      ND_RECORD_REFERRAL,
      "Ask the clerk of court for the judgment or the docket in the case, take the date off it, and answer again."
    );
  }
  return value;
}

/**
 * A quantity, in the unit the statute itself uses.
 *
 * Section 19-03.1-23(9) states the marijuana threshold in ounces and the
 * tetrahydrocannabinol threshold in grams. A quantity given in some other unit
 * is not converted here: the conversion is not in the subsection, the quantity
 * is an element of eligibility, and the charging document states it in the unit
 * the charge was written in.
 */
function parseQuantity(raw: string): { amount: number; unit: string } | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const words: Readonly<Record<string, number>> = {
    "one-half": 0.5, "a half": 0.5, half: 0.5, "one half": 0.5,
    "one-quarter": 0.25, "a quarter": 0.25, quarter: 0.25, "one quarter": 0.25,
    one: 1, two: 2, three: 3, four: 4, five: 5
  };
  const unitMatch = /\b(ounces?|oz|grams?|g|pounds?|lbs?|kilograms?|kg)\b/.exec(text);
  if (!unitMatch) return null;
  const unitRaw = unitMatch[1];
  const unit = /^(ounces?|oz)$/.test(unitRaw)
    ? "ounce"
    : /^(grams?|g)$/.test(unitRaw)
      ? "gram"
      : /^(pounds?|lbs?)$/.test(unitRaw)
        ? "pound"
        : "kilogram";

  const fraction = /\b(\d+)\s*\/\s*(\d+)\b/.exec(text);
  if (fraction) {
    const value = Number(fraction[1]) / Number(fraction[2]);
    return Number.isFinite(value) ? { amount: value, unit } : null;
  }
  const decimal = /\b(\d+(?:\.\d+)?)\b/.exec(text);
  if (decimal) return { amount: Number(decimal[1]), unit };
  for (const [word, value] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return { amount: value, unit };
  }
  return null;
}

/** The bare county name, for a line that already prints the word "County". */
function bareCountyName(raw: string): string {
  return raw.trim().replace(/\s+county$/i, "").trim() || raw.trim();
}

/**
 * A history answer, rendered for a section the statute requires to be complete.
 *
 * A bare "No" set on a bullet under the heading "North Dakota charges and
 * convictions" reads as an entry rather than as an absence, so a none-answer
 * becomes the sentence a reader expects there instead.
 */
const historyAnswer = (answers: Answers, key: string): string => {
  const raw = str(answers, key);
  if (!raw || statesNone(raw)) return "None stated.";
  return listAnswer(answers, key);
};

/** Renders a free-text history answer as one line per entry, never numbered. */
const listAnswer = (answers: Answers, key: string): string => {
  const value = answers[key];
  if (Array.isArray(value)) {
    const entries = value.map((entry) => String(entry).trim()).filter(Boolean);
    return entries.length > 0 ? entries.map((entry) => `— ${entry}`).join("\n") : "None stated.";
  }
  const single = str(answers, key);
  return single ? `— ${single}` : "None stated.";
};

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

/**
 * Refuses to build a packet out of outside-party content.
 *
 * Run first, before any other screen, so that a caller passing a judicial
 * finding, a prosecutor's position, a hearing date or a completed service gets a
 * stop rather than a document that looks decided.
 */
function refuseOutsidePartyContent(trackId: string, answers: Answers): void {
  const supplied = ND_OUTSIDE_PARTY_KEYS.filter((key) => str(answers, key).length > 0);
  if (supplied.length === 0) return;
  stop(
    "nd-outside-party-content-refused",
    trackId,
    `Content was supplied for ${supplied.join(", ")}. Section 12-60.1-04(1) puts the findings on the court, § 12-60.1-04(3) puts the hearing date on the court, § 12-60.1-04(4) puts the canvass of law enforcement, witnesses, victims and correctional authorities on the prosecuting attorney, and the clerk stamps the filing. LegalEase supplies none of them and will not print one.`,
    ND_CLERK_REFERRAL,
    "File the petition, the proposed order and the proof of service with the clerk and let the court and the prosecuting attorney do their own parts. The judge signs the order if the petition is granted."
  );
}

// ---------------------------------------------------------------------------
// Fact derivation
// ---------------------------------------------------------------------------

/**
 * The condition key for the two conditional proposed orders.
 *
 * The design marks the § 39-08-01.6 and § 19-03.1-23(9) proposed orders
 * conditional — "advisable by analogy to Chapter 12-60.1 practice" — and
 * declares no participant input for the choice. The fact is therefore set on
 * both routes, which produces the ordinary case, and both filings tell the
 * participant to ask the clerk whether that court wants a proposed order.
 * Wiring a real input is a change to the design, not to this job, and this is
 * the single place a captain would attach one.
 */
export const ND_PROPOSED_ORDER_CONDITION_KEY = "proposedOrderLodged";

type Chapter12601Facts = {
  facts: Record<string, string>;
  courtType: "district" | "municipal";
  countyName: string;
};

/**
 * The sixteen questions all three Chapter 12-60.1 routes ask, screened once.
 *
 * Every declared key is carried through under its own name, because
 * `resolvePacket` checks the declared keys against this bag. Derived sentences
 * live under separate keys, so no document renders a bare "no" on a line of its
 * own and leaves a reader to guess what was asked.
 */
function deriveChapterFacts(trackId: string, answers: Answers): Chapter12601Facts {
  const sealFullLegalName = need(trackId, answers, "sealFullLegalName");
  const sealAllOtherNames = need(trackId, answers, "sealAllOtherNames");
  const sealAddressHistory = need(trackId, answers, "sealAddressHistory");
  const sealReasons = need(trackId, answers, "sealReasons");
  const courtType = branch(trackId, "sealCourtType", need(trackId, answers, "sealCourtType"), ND_COURT_TYPES);
  const sealCounty = need(trackId, answers, "sealCounty");
  const sealCaseNumber = need(trackId, answers, "sealCaseNumber");
  const sealOffence = need(trackId, answers, "sealOffence");
  const sealCriminalHistoryND = need(trackId, answers, "sealCriminalHistoryND");
  const sealCriminalHistoryElsewhere = str(answers, "sealCriminalHistoryElsewhere");
  const sealPriorReliefRequests = need(trackId, answers, "sealPriorReliefRequests");
  const sealNewConvictions = need(trackId, answers, "sealNewConvictions");
  const supervisionComplete = yesNo(trackId, answers, "sealSupervisionComplete");
  const restitution = branch(
    trackId,
    "sealRestitutionPaid",
    need(trackId, answers, "sealRestitutionPaid"),
    ND_RESTITUTION_STATUS
  );
  const registrationOrdered = yesNo(trackId, answers, "sealRegistrationOrdered");
  const prosecutorOffice = branch(
    trackId,
    "sealProsecutorOffice",
    need(trackId, answers, "sealProsecutorOffice"),
    ND_PROSECUTOR_OFFICES
  );

  // The chapter's own exclusion. Section 12-60.1-02(2) excludes an offence for
  // which registration was ordered under § 12.1-32-15.
  if (registrationOrdered) {
    stop(
      "nd-registration-offence-excluded",
      trackId,
      "The petitioner states that registration was ordered under N.D.C.C. § 12.1-32-15. Section 12-60.1-02(2) excludes an offence for which the offender has been ordered to register, so Chapter 12-60.1 does not reach this record.",
      ND_REFERRAL,
      "Ask a lawyer whether anything else in North Dakota reaches a registration offence. Do not file a Chapter 12-60.1 petition on this record."
    );
  }

  // The impaired-driving carve-out, which the official guides apply and the
  // statute does not state. The routing is the guides'; the packet says so.
  if (IMPAIRED_DRIVING.test(sealOffence)) {
    stop(
      "nd-impaired-driving-routes-to-39-08-01-6",
      trackId,
      "The offence described reads as an impaired-driving offence. The official ND Courts research guides route an impaired-driving record to the separate seal under N.D.C.C. § 39-08-01.6 rather than through Chapter 12-60.1. That carve-out appears in the guides and not in the statutory exclusions at § 12-60.1-02(2), so it is the guides' routing rather than the statute's, and it is followed here.",
      ND_DUI_ROUTE_REFERRAL,
      "Use the North Dakota impaired-driving sealing route instead. If the offence is not an impaired-driving offence, describe it in the words used on the judgment and answer again."
    );
  }

  // Section 12-60.1-04(1)(c). Completion of imprisonment and probation is a
  // finding the court must make, so an incomplete sentence stops the route.
  if (!supervisionComplete) {
    stop(
      "nd-supervision-not-complete",
      trackId,
      "The petitioner states that imprisonment or probation on this case is not finished. Section 12-60.1-04(1)(c) makes completion of all terms of imprisonment and probation a finding the court must make before it can grant the petition.",
      ND_CLERK_REFERRAL,
      "Wait until the sentence including probation is discharged, then ask the clerk for the discharge order or your probation officer for a completion letter, and come back with it."
    );
  }

  // Section 12-60.1-04(1)(d). Restitution paid is a separate finding.
  if (restitution === RESTITUTION_OUTSTANDING) {
    stop(
      "nd-restitution-outstanding",
      trackId,
      "The petitioner states that restitution is not paid in full. Section 12-60.1-04(1)(d) makes payment of restitution a separate finding the court must make, and it is not one the court can make on a balance still owing.",
      ND_CLERK_REFERRAL,
      "Ask the clerk of court for a payment history, pay the balance, and come back with the record showing it satisfied."
    );
  }

  // The look-back is a clean period, not a wait. Any new conviction inside it
  // defeats the ground, and which convictions fall inside is not computed here.
  if (!statesNone(sealNewConvictions)) {
    stop(
      "nd-new-conviction-in-look-back",
      trackId,
      "The petitioner states a conviction of a new crime since the offence. The Chapter 12-60.1 grounds are look-back periods measured backwards from the day the petition is filed — three years on a misdemeanor, five on a felony — and a conviction inside that window defeats the ground. Whether a particular conviction falls inside it is a question about dates on a record LegalEase has not seen.",
      ND_REFERRAL,
      "Get your criminal history record from the Bureau of Criminal Investigation and have a lawyer measure the look-back against it before you file."
    );
  }

  // Pending charges anywhere, which the design makes a stop.
  if (mentionsPendingCharge(sealCriminalHistoryND) || mentionsPendingCharge(sealCriminalHistoryElsewhere)) {
    stop(
      "nd-pending-charge",
      trackId,
      "The petitioner reports a charge that is still pending. Section 12-60.1-04(5) puts a clear-and-convincing burden on the petitioner and § 12-60.1-04(4) has the prosecuting attorney canvass law enforcement, witnesses, victims and correctional authorities. A live case is the thing most likely to defeat that showing, and it is not something a prepared packet should walk into.",
      ND_REFERRAL,
      "Resolve the pending charge first, or ask a lawyer whether to file while it is open."
    );
  }

  // The respondent follows the court. Section 12-60.1-03(4) names the
  // municipality's prosecuting official in a municipal case and the county
  // State's Attorney in a district court case.
  const expectedOffice = courtType === "municipal" ? "city_attorney" : "states_attorney";
  if (prosecutorOffice !== expectedOffice) {
    stop(
      "nd-prosecutor-office-does-not-match-court",
      trackId,
      `The petitioner states a ${courtType} court case prosecuted by ${prosecutorOffice === "city_attorney" ? "a city attorney" : "the county State's Attorney"}. Under N.D.C.C. § 12-60.1-03(4) the respondent is the office of the prosecuting official for the municipality in a municipal case and the office of the State's Attorney for the county in a district court case, so one of the two answers does not match the record and serving the wrong office would waste the filing.`,
      ND_RECORD_REFERRAL,
      "Look at the charging document or the judgment: it names both the court and the prosecuting office. Answer both questions from it."
    );
  }

  const countyName = bareCountyName(sealCounty);
  const respondent =
    prosecutorOffice === "city_attorney"
      ? `the office of the prosecuting official for the municipality, in ${countyName}`
      : `the office of the State's Attorney for ${countyName} County`;

  const facts: Record<string, string> = {
    // Declared keys, carried through exactly as declared.
    sealFullLegalName,
    sealAllOtherNames,
    sealAddressHistory,
    sealReasons,
    sealCourtType: courtType,
    sealCounty,
    sealCaseNumber,
    sealOffence,
    sealCriminalHistoryND,
    sealCriminalHistoryElsewhere,
    sealPriorReliefRequests,
    sealNewConvictions,
    sealSupervisionComplete: "yes",
    sealRestitutionPaid: restitution === RESTITUTION_PAID ? "paid" : "none_ordered",
    sealRegistrationOrdered: "no",
    sealProsecutorOffice: prosecutorOffice,

    // Template placeholders.
    countyName,
    courtLine: `IN ${ND_COURT_PHRASE[courtType].toUpperCase()} OF ${countyName.toUpperCase()} COUNTY, STATE OF NORTH DAKOTA`,
    courtPhrase: ND_COURT_PHRASE[courtType],
    respondentOffice: respondent,
    otherNamesStatement: statesNone(sealAllOtherNames)
      ? "The petitioner states that they have used no other name."
      : `The petitioner gives them, including maiden names and aliases, as: ${sealAllOtherNames}`,
    addressHistory: sealAddressHistory,
    reasonsForSealing: sealReasons,
    criminalHistoryND: historyAnswer(answers, "sealCriminalHistoryND"),
    criminalHistoryElsewhere: historyAnswer(answers, "sealCriminalHistoryElsewhere"),
    priorReliefRequests: historyAnswer(answers, "sealPriorReliefRequests"),
    newConvictionStatement:
      "The petitioner states that they have not been convicted of a new crime since the offence.",
    supervisionStatement:
      "The petitioner states that all terms of imprisonment and all probation on this case are complete.",
    restitutionStatement:
      restitution === RESTITUTION_PAID
        ? "The petitioner states that all restitution ordered in this case has been paid in full."
        : "The petitioner states that no restitution was ordered in this case.",
    registrationStatement:
      "The petitioner states that they were not ordered to register under N.D.C.C. § 12.1-32-15 for this offence.",
    packetCaseReference: `${countyName} County`
  };

  return { facts, courtType, countyName };
}

/**
 * Turns the participant's answers into the fact bag the templates read.
 *
 * Fails closed on anything the adopted design treats as a stop, on anything that
 * would require deciding a contested classification, and on any attempt to
 * supply outside-party content.
 */
export function deriveNorthDakotaFacts(
  trackId: string,
  answers: Answers
): Record<string, string> {
  if (!ND_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new NorthDakotaBranchError(trackId, "trackId", trackId, ND_ASSIGNED_TRACK_IDS);
  }
  refuseOutsidePartyContent(trackId, answers);

  if (ND_CHAPTER_12_60_1_TRACK_IDS.includes(trackId)) {
    const { facts } = deriveChapterFacts(trackId, answers);

    if (trackId === "nd-seal-misdemeanor-conviction") {
      return facts;
    }

    if (trackId === "nd-seal-felony-conviction") {
      const offenceChapter = need(trackId, answers, "sealOffenceChapter");
      // Section 12-60.1-02(2) bars a violence or intimidation felony during the
      // § 62.1-02-01(1)(a) firearm-disability period. The offence set is
      // chapters 12.1-16 through 12.1-25, and the period is ten years from the
      // latest of four dates — a computation this packet does not perform.
      const chapterMatch = /\b12\.1-(\d{2})\b/.exec(offenceChapter);
      const chapterNumber = chapterMatch ? Number(chapterMatch[1]) : null;
      if (chapterNumber === null) {
        stop(
          "nd-offence-chapter-not-established",
          trackId,
          "The Century Code chapter of the offence has not been stated in a form that can be read. Section 12-60.1-02(2) bars a felony involving violence or intimidation during the firearm-disability period, and the offence set for that bar is chapters 12.1-16 through 12.1-25, so the chapter decides whether the bar is even in play.",
          ND_RECORD_REFERRAL,
          "Ask the clerk of court for the judgment or the charging document. It names the Century Code section, and the chapter is the part before the second hyphen, for example 12.1-23."
        );
      }
      if (chapterNumber >= 16 && chapterNumber <= 25) {
        stop(
          "nd-violence-or-intimidation-felony",
          trackId,
          `The offence is in N.D.C.C. chapter 12.1-${String(chapterNumber).padStart(2, "0")}, which is inside the chapters 12.1-16 through 12.1-25 range § 62.1-02-01(1)(a) uses for violence and intimidation offences. Section 12-60.1-02(2) bars sealing such a felony during the firearm-disability period, which runs ten years from the latest of the conviction, release from incarceration, release from parole and release from probation. Whether the offence involved violence or intimidation, and whether the ten years have run, are both determinations LegalEase does not make.`,
          ND_REFERRAL,
          "Take the judgment and every release date to a lawyer. A deferred imposition counts as a conviction for this computation under § 62.1-02-01(2), which is easy to miss."
        );
      }
      facts.sealOffenceChapter = offenceChapter;
      facts.sealConvictionDate = str(answers, "sealConvictionDate");
      facts.sealReleaseDates = str(answers, "sealReleaseDates");
      facts.offenceChapterStatement = `The petitioner states the Century Code chapter of the offence, taken from the judgment, as: ${offenceChapter}`;
      return facts;
    }

    // nd-seal-pardoned-conviction
    const pardonDate = needDatedAnswer(
      trackId,
      answers,
      "sealPardonDate",
      "nd-pardon-date-not-established",
      "the date the pardon was granted"
    );
    const pardonKind = branch(
      trackId,
      "sealPardonUnconditional",
      need(trackId, answers, "sealPardonUnconditional"),
      ND_PARDON_KINDS
    );
    if (pardonKind === "conditional") {
      stop(
        "nd-conditional-pardon",
        trackId,
        "The certificate describes a conditional pardon. N.D.C.C. § 12-55.1-01(2) defines a conditional pardon as one subject to terms and conditions established by the governor, and § 12-60.1-02(1)(c) reaches an unconditional pardon.",
        ND_REFERRAL,
        "Take the certificate of pardon to a lawyer. Whether the conditions have been discharged, and what that leaves available, is not a reading a prepared packet should make."
      );
    }
    if (!yesNo(trackId, answers, "sealPardonCoversConviction")) {
      stop(
        "nd-pardon-does-not-cover-conviction",
        trackId,
        "The petitioner states that the pardon does not cover the conviction they want sealed. Section 12-60.1-02(1)(c) reaches the conviction the pardon was granted for, so a pardon of a different conviction is not a ground for sealing this one.",
        ND_REFERRAL,
        "Check the certificate of pardon against the judgment to see which conviction it names, and ask a lawyer which ground, if any, reaches the other record."
      );
    }
    facts.sealPardonDate = pardonDate;
    facts.sealPardonUnconditional = "unconditional";
    facts.sealPardonCoversConviction = "yes";
    facts.pardonStatement = `The petitioner states that an unconditional pardon covering this conviction was granted on: ${pardonDate}`;
    return facts;
  }

  if (trackId === "nd-dui-record-seal") {
    const firstViolationDate = needDatedAnswer(
      trackId,
      answers,
      "duiFirstViolationDate",
      "nd-dui-first-violation-date-not-established",
      "the date of the first impaired-driving violation"
    );
    const caseNumber = need(trackId, answers, "duiCaseNumber");
    const courtType = branch(trackId, "duiCourtType", need(trackId, answers, "duiCourtType"), ND_COURT_TYPES);
    const county = need(trackId, answers, "duiCounty");
    const convictionType = branch(
      trackId,
      "duiConvictionType",
      need(trackId, answers, "duiConvictionType"),
      ND_DUI_CONVICTION_TYPES
    );
    const chargedUnder = branch(
      trackId,
      "duiChargedUnder",
      need(trackId, answers, "duiChargedUnder"),
      ND_DUI_CHARGED_UNDER
    );
    const ordinanceCitation = str(answers, "duiOrdinanceCitation");
    if (chargedUnder === "ordinance" && !ordinanceCitation) {
      stop(
        "nd-dui-ordinance-not-identified",
        trackId,
        "The petitioner states an ordinance charge but has not identified the ordinance. Section 39-08-01.6(1) reaches a violation of § 39-08-01 or an equivalent ordinance, so the petition has to name the ordinance and the equivalence has to be shown from its text.",
        ND_RECORD_REFERRAL,
        "Ask the city for the text of the ordinance you were charged under, take its number off the citation or the judgment, and answer again."
      );
    }
    if (yesNo(trackId, answers, "duiCommercialLicence")) {
      stop(
        "nd-dui-commercial-driver-excluded",
        trackId,
        "The petitioner states that they hold or have held a commercial driver's licence. Section 39-08-01.6(2) excludes an individual licensed as a commercial driver under N.D.C.C. § 39-06.2-10, and the exclusion is not limited to a current licence.",
        ND_REFERRAL,
        "Ask a lawyer whether anything else reaches this record. A commercial licence also carries federal consequences a sealing packet does not address."
      );
    }
    if (yesNo(trackId, answers, "duiSubsequentDui")) {
      stop(
        "nd-dui-subsequent-violation",
        trackId,
        "The petitioner states a further impaired-driving violation inside the seven years. Section 39-08-01.6(1)(b) requires no further violation of § 39-08-01 or an equivalent ordinance within seven years of the first violation.",
        ND_REFERRAL,
        "Ask a lawyer when, if ever, this record becomes reachable. The seven years run from the first violation, so a second one restarts nothing — it closes this ground."
      );
    }
    if (yesNo(trackId, answers, "duiOtherOffence")) {
      stop(
        "nd-dui-other-offence-in-clean-period",
        trackId,
        "The petitioner states another criminal offence inside the seven years. The clean period in § 39-08-01.6(1)(b) covers any other criminal offence and is not limited to impaired driving, which is the part of this ground people most often miss.",
        ND_REFERRAL,
        "Get your criminal history record from the Bureau of Criminal Investigation and have a lawyer read the seven-year window against it."
      );
    }
    const countyName = bareCountyName(county);
    return {
      duiFirstViolationDate: firstViolationDate,
      duiCaseNumber: caseNumber,
      duiCourtType: courtType,
      duiCounty: county,
      duiConvictionType:
        convictionType === DUI_GUILTY_PLEA ? "guilty_plea" : convictionType === DUI_NO_CONTEST ? "no_contest" : "found_guilty",
      duiChargedUnder: chargedUnder,
      duiOrdinanceCitation: ordinanceCitation,
      duiSubsequentDui: "no",
      duiOtherOffence: "no",
      duiCommercialLicence: "no",

      countyName,
      courtLine: `IN ${ND_COURT_PHRASE[courtType].toUpperCase()} OF ${countyName.toUpperCase()} COUNTY, STATE OF NORTH DAKOTA`,
      courtPhrase: ND_COURT_PHRASE[courtType],
      caseNumber,
      firstViolationStatement: `The petitioner states the date of the first violation as: ${firstViolationDate}`,
      convictionTypeStatement: `The petitioner states that they ${convictionType} in this case.`,
      chargedUnderStatement:
        chargedUnder === "ordinance"
          ? `The petitioner states that the charge was brought under a municipal ordinance, which they identify as: ${ordinanceCitation}. Section 39-08-01.6(1) reaches an equivalent ordinance, and the text of that ordinance is attached so the court can see the equivalence.`
          : "The petitioner states that the charge was brought under the state statute, N.D.C.C. § 39-08-01.",
      cleanPeriodStatement:
        "The petitioner states that they have committed no further violation of N.D.C.C. § 39-08-01 or an equivalent ordinance, and no other criminal offence of any kind, within seven years of the first violation.",
      commercialLicenceStatement:
        "The petitioner states that they are not and have never been licensed as a commercial driver under N.D.C.C. § 39-06.2-10.",
      [ND_PROPOSED_ORDER_CONDITION_KEY]: "yes",
      packetCaseReference: `${countyName} County`
    };
  }

  // nd-marijuana-first-offense-seal
  const judgmentDate = needDatedAnswer(
    trackId,
    answers,
    "mjJudgmentDate",
    "nd-marijuana-judgment-date-not-established",
    "the date the court entered the judgment of guilt"
  );
  const offenceDate = needDatedAnswer(
    trackId,
    answers,
    "mjOffenceDate",
    "nd-marijuana-offence-date-not-established",
    "the date the offence occurred"
  );
  const substance = branch(
    trackId,
    "mjSubstance",
    need(trackId, answers, "mjSubstance"),
    ND_MARIJUANA_SUBSTANCES
  );
  const quantityRaw = need(trackId, answers, "mjQuantity");
  const quantity = parseQuantity(quantityRaw);
  if (!quantity) {
    stop(
      "nd-marijuana-quantity-not-established",
      trackId,
      "The quantity charged has not been stated as an amount and a unit. Section 19-03.1-23(9) makes the quantity an element: one ounce or less of marijuana, or two grams or less of tetrahydrocannabinol. It is read off the charging document rather than from recollection.",
      ND_RECORD_REFERRAL,
      "Ask the clerk for the complaint or the information in the case and answer with the quantity exactly as it is charged there, for example \"one ounce\" or \"1.5 grams\"."
    );
  }
  const expectedUnit = substance === "marijuana" ? "ounce" : "gram";
  if (quantity.unit !== expectedUnit) {
    stop(
      "nd-marijuana-quantity-unit-not-statutory",
      trackId,
      `The quantity is stated in ${quantity.unit}s. Section 19-03.1-23(9) states the marijuana threshold in ounces and the tetrahydrocannabinol threshold in grams, and this packet does not convert between units: the conversion is not in the subsection and the quantity is an element of eligibility.`,
      ND_RECORD_REFERRAL,
      `Read the quantity off the charging document and give it in ${expectedUnit}s, which is the unit the subsection uses for ${substance === "marijuana" ? "marijuana" : "tetrahydrocannabinol"}.`
    );
  }
  const threshold = substance === "marijuana" ? 1 : 2;
  if (quantity.amount > threshold) {
    stop(
      "nd-marijuana-quantity-above-threshold",
      trackId,
      `The quantity charged is above the threshold. Section 19-03.1-23(9) reaches one ounce or less of marijuana and two grams or less of tetrahydrocannabinol, and the petitioner states ${quantityRaw}.`,
      ND_REFERRAL,
      "Ask a lawyer whether any other North Dakota route reaches this conviction. This subsection does not."
    );
  }
  if (!yesNo(trackId, answers, "mjFirstOffence")) {
    stop(
      "nd-marijuana-not-a-first-offence",
      trackId,
      "The petitioner states that this was not a first offence. Section 19-03.1-23(9) reaches a first offence only, and whether an earlier matter counts as one is a classification LegalEase does not make.",
      ND_REFERRAL,
      "Get your criminal history record from the Bureau of Criminal Investigation and have a lawyer read it before you file."
    );
  }
  const subsequentConviction = need(trackId, answers, "mjSubsequentConviction");
  if (!statesNone(subsequentConviction)) {
    stop(
      "nd-marijuana-subsequent-controlled-substance-conviction",
      trackId,
      "The petitioner states a further controlled-substance conviction. Section 19-03.1-23(9) withholds the seal where the person is subsequently convicted within two years of a further violation of the chapter, and the two years have no anchor date on the face of the subsection: the words are open between two years from the judgment and two years from the further violation. That ambiguity decides who qualifies, so this packet does not compute it and any further conviction stops the route.",
      ND_REFERRAL,
      "Take the judgment in both cases to a lawyer and ask which date the two years run from. Until that is settled, filing on this ground is a guess."
    );
  }
  const otherCharges = need(trackId, answers, "mjOtherCharges");
  if (!statesNone(otherCharges)) {
    stop(
      "nd-marijuana-other-charges-in-case",
      trackId,
      "The petitioner states other charges in the same case. Section 19-03.1-23(9) seals the court record of that conviction — the first marijuana or tetrahydrocannabinol possession — and does not reach anything else filed with it.",
      ND_REFERRAL,
      "Ask a lawyer what a partial seal would leave visible, and whether another route reaches the rest of the case, before you file."
    );
  }
  const caseNumber = need(trackId, answers, "mjCaseNumber");
  const county = need(trackId, answers, "mjCounty");
  const courtType = branch(trackId, "mjCourtType", need(trackId, answers, "mjCourtType"), ND_COURT_TYPES);
  const countyName = bareCountyName(county);

  return {
    mjJudgmentDate: judgmentDate,
    mjOffenceDate: offenceDate,
    mjSubstance: substance,
    mjQuantity: quantityRaw,
    mjFirstOffence: "yes",
    mjSubsequentConviction: subsequentConviction,
    mjOtherCharges: otherCharges,
    mjCaseNumber: caseNumber,
    mjCounty: county,
    mjCourtType: courtType,

    countyName,
    courtLine: `IN ${ND_COURT_PHRASE[courtType].toUpperCase()} OF ${countyName.toUpperCase()} COUNTY, STATE OF NORTH DAKOTA`,
    courtPhrase: ND_COURT_PHRASE[courtType],
    caseNumber,
    substanceName: substance === "marijuana" ? "marijuana" : "tetrahydrocannabinol",
    judgmentDateStatement: `The movant states that the court entered the judgment of guilt on: ${judgmentDate}`,
    offenceDateStatement: `The movant states that the offence occurred on: ${offenceDate}`,
    quantityStatement: `The movant states the quantity charged, taken from the charging document, as: ${quantityRaw}`,
    firstOffenceStatement:
      "The movant states that this was a first offence of this kind. Whether the record bears that out is for the court to see from the file.",
    subsequentConvictionStatement:
      "The movant states that they have not been convicted of any further violation of N.D.C.C. Chapter 19-03.1 since.",
    otherChargesStatement:
      "The movant states that there were no other charges in this case besides the possession charge described above.",
    [ND_PROPOSED_ORDER_CONDITION_KEY]: "yes",
    packetCaseReference: `${countyName} County`
  };
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
 * The caption of the existing criminal case.
 *
 * Section 12-60.1-03(1) files the petition in the criminal case itself rather
 * than as a separate civil action, so the caption is that case's and the case
 * number is the participant's own. Each caption cell is a whole phrase: the
 * shared writer wraps each cell inside its own column, so a pre-split phrase
 * would drift apart by however many lines the petitioner's name needed.
 */
const CAPTION_LEFT: readonly string[] = [
  "STATE OF NORTH DAKOTA,",
  "Plaintiff,",
  "",
  "vs.",
  "",
  "{{sealFullLegalName}},",
  "Defendant and Petitioner."
];

const CAPTION_RIGHT = (documentLine: string): readonly string[] => [
  "Case No. {{sealCaseNumber}}",
  "",
  documentLine
];

const CASE_CAPTION_LEFT: readonly string[] = [
  "STATE OF NORTH DAKOTA,",
  "Plaintiff,",
  "",
  "vs.",
  "",
  "THE PETITIONER NAMED BELOW,",
  "Defendant and Petitioner."
];

const MOVANT_CAPTION_LEFT: readonly string[] = [
  "STATE OF NORTH DAKOTA,",
  "Plaintiff,",
  "",
  "vs.",
  "",
  "THE MOVANT NAMED BELOW,",
  "Defendant and Movant."
];

const CASE_CAPTION_RIGHT = (documentLine: string): readonly string[] => [
  "Case No. {{caseNumber}}",
  "",
  documentLine
];

const PREAMBLE =
  "Prepared by LegalEase from the answers the petitioner gave. LegalEase has not seen the petitioner's records, has not decided whether the petitioner qualifies, does not represent the petitioner, files nothing and appears nowhere. Every statement of fact below is the petitioner's own.";

/** No form exists, which is why this is drafted rather than filled in. */
const NO_OFFICIAL_FORM_SECTION: Section = {
  heading: "WHY THIS IS A DRAFTED DOCUMENT AND NOT A FORM",
  numbered: false,
  paragraphs: [
    "North Dakota publishes no sealing form. The Legal Self Help Center's research guide states that no forms for sealing criminal records are available and that the person seeking relief creates their own petition and other legal documents.",
    "This document is drafted to the contents that guide and the statute set out. It is not an official form, it is not approved by any court, and no court has seen it."
  ]
};

/**
 * Who decides, which is nobody at LegalEase.
 *
 * The middle paragraph is route-specific and must be. Sections 12-60.1-04(1),
 * (4) and (5) are Chapter 12-60.1's own procedure: they govern neither the
 * § 39-08-01.6 petition nor the § 19-03.1-23(9) motion, and reciting them there
 * would tell the reader that a chapter which does not apply to their case does.
 */
function whoDecidesSection(
  filingNoun: string,
  procedureParagraph: string,
  closingParagraph: string
): Section {
  return {
    heading: "WHO DECIDES THIS",
    numbered: false,
    paragraphs: [
      `This ${filingNoun} makes no statement about whether the ${filingNoun === "motion" ? "movant" : "petitioner"} qualifies, and it must not be read as making one.`,
      procedureParagraph,
      closingParagraph
    ]
  };
}

const CHAPTER_WHO_DECIDES = whoDecidesSection(
  "petition",
  "Section 12-60.1-04(1) puts the findings on the court, and § 12-60.1-04(5) puts a clear-and-convincing burden on the petitioner. Section 12-60.1-04(4) has the prosecuting attorney, so far as practicable, notify and seek input from law enforcement, witnesses, victims and correctional authorities. None of those is LegalEase's to do, to predict, or to report as done.",
  "Everything stated below is the petitioner's own account, given so that the court and the prosecuting attorney can check it against the record. No date here has been computed into a period and no period is said to have run."
);

const DUI_WHO_DECIDES = whoDecidesSection(
  "petition",
  "Section 39-08-01.6(1) puts the decision on the court: it provides that the court shall seal where the conditions in subsections (1)(a) and (1)(b) are met. The section states no burden of proof, no notice requirement and no canvass of anybody, and Chapter 12-60.1's procedure does not govern this route. Whether the conditions are met is the court's to decide on the record in the case.",
  "Everything stated below is the petitioner's own account. No date here has been computed into a period and no period is said to have run."
);

const MARIJUANA_WHO_DECIDES = whoDecidesSection(
  "motion",
  "Section 19-03.1-23(9) puts the decision on the court and makes it mandatory once the elements are met: the court shall, upon motion, seal the court record. The subsection states no burden of proof, no notice requirement and no hearing, and Chapter 12-60.1's procedure does not govern this route. Whether the elements are met is read from the court file.",
  "Everything stated below is the movant's own account, taken from the charging document and the judgment. No date here has been computed into a period and no period is said to have run."
);

/** What Chapter 12-60.1 sealing reaches, and what it leaves alone. */
const CHAPTER_EFFECT_SECTION: Section = {
  heading: "WHAT SEALING UNDER CHAPTER 12-60.1 DOES, AND WHAT IT DOES NOT DO",
  numbered: false,
  paragraphs: [
    "Sealing under Chapter 12-60.1 prohibits disclosure of the existence or the contents of the court and prosecution records in this case except by order of the court. It is not an expungement and the record is not destroyed.",
    "It does not reach criminal history record information held by the Bureau of Criminal Investigation, and it does not reach the criminal justice data system. It does not reach federal, tribal, military or out-of-state records, or records held in a private database that copied them before the seal.",
    "Section 12-60.1-04(8) requires the order to state that the petitioner is sufficiently rehabilitated but remains subject to N.D.C.C. § 12.1-33-02.1, and that the information is released where an entity has a statutory obligation to conduct a criminal history background check. Anyone with such an obligation will still see this record.",
    "Nobody should be told that a sealing order makes a record disappear everywhere. It does not."
  ]
};

/** Service, the forty-five days, and the hearing. */
const SERVICE_AND_HEARING_SECTION: Section = {
  heading: "SERVICE, THE FORTY-FIVE DAYS AND THE HEARING",
  numbered: false,
  paragraphs: [
    "Section 12-60.1-03(4) requires the petition to be served on the prosecuting attorney, which routes through N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b). The petitioner serves and files proof of service; LegalEase serves nothing and holds no proof that anything was served.",
    "Section 12-60.1-03(3) makes the proposed order mandatory: the petitioner files it when filing the petition, not afterwards. A petition filed without one is incomplete.",
    "Section 12-60.1-04(3) provides that no hearing may be held earlier than forty-five days after filing unless the prosecuting attorney stipulates. The date of any hearing is the court's to set and is not written here.",
    "The petitioner attends that hearing and carries the clear-and-convincing burden. Attendance is not something a prepared packet can do, and losing the hearing is where automated help ends."
  ]
};

/** The fee, which is not established and is therefore not stated. */
const FEE_SECTION: Section = {
  heading: "THE FILING FEE IS NOT STATED HERE, AND THAT IS DELIBERATE",
  numbered: false,
  paragraphs: [
    "No monetary amount appears anywhere in this packet.",
    "The statewide court fee schedule effective 1 July 2025, compiled under N.D.C.C. § 27-05.2-03, carries no line item for a Chapter 12-60.1 petition or for a motion within an existing criminal case, and the official research guide tells the petitioner to contact the clerk of court to confirm the amount, if any. Until a clerk answers, there is no figure anybody can honestly print.",
    "Ask the clerk of the court that holds the case what the filing fee is, if any, and ask what to do if you cannot pay it. Section 12-60.1-04(6) makes an appeal from a municipal court to a district court free of charge, which suggests a fee may attach at first instance.",
    "LegalEase does not collect, forward or handle any payment in this process, and nothing stated here is payable to LegalEase."
  ]
};

/** Everything the packet deliberately leaves for somebody else. */
function manualCompletionSection(extra: readonly string[]): Section {
  return {
    heading: "WHAT THIS PACKET LEAVES BLANK, AND WHOSE IT IS",
    numbered: false,
    paragraphs: [
      "Some of what this filing needs is not LegalEase's to write. It is listed here so that nobody discovers it at the counter.",
      "The petitioner's signature, on the petition and on the proof of service. Both are the petitioner's own documents.",
      "The reasons for sealing and the reformation showing. Section 12-60.1-03(2)(c) requires the petition to set out the reasons and § 12-60.1-04(1)(e) makes reformation a finding the court must make. The words in the reasons section above are the petitioner's own, carried through as given. LegalEase asserts no good cause and no reformation on anybody's behalf.",
      "The judge's signature and the date on the proposed order. The petitioner lodges the order unsigned; the court signs it if it grants the petition.",
      "The date and manner of service, on the proof of service. Those are written in after service actually happens.",
      ...extra
    ]
  };
}

/** The questions the adopted design still carries. */
function openQuestionSection(extra: readonly string[]): Section {
  return {
    heading: "QUESTIONS THIS PACKET DOES NOT ANSWER",
    numbered: false,
    paragraphs: [
      "Some things about North Dakota record sealing are open. They are named here rather than papered over with an answer nobody has.",
      "The filing fee, set out above. It is not established and no figure is printed.",
      ...extra
    ]
  };
}

/** Where automated help ends. */
function stopSection(extra: readonly string[]): Section {
  return {
    heading: "WHERE THIS PACKET STOPS",
    numbered: false,
    paragraphs: [
      "LegalEase prepares documents from what the petitioner says. It does not give legal advice, does not look at any record, does not file anything, does not serve anybody and does not appear in court.",
      "Any objection from the prosecuting attorney, a victim, a witness or a correctional authority. Section 12-60.1-04(4) invites exactly that canvass, and an objection turns this from a paperwork matter into a contested one.",
      "Any case where the reformation or good-cause showing is the real contest.",
      "Federal, tribal, military and out-of-state records, which a North Dakota court cannot reach.",
      "Any immigration consequence, and any question about firearm rights. Sealing is not a restoration of any right and nothing here is advice about either.",
      ...extra,
      `Where any of these applies, speak to a lawyer before filing. ${ND_REFERRAL}`
    ]
  };
}

/**
 * The petitioner's execution block.
 *
 * Chapter 12-60.1 contains no verification clause, so no sworn form of signature
 * is required and none is printed. Printing a notarial block would invite an
 * oath the chapter does not ask for.
 */
const PETITION_SIGNATURE_BLOCK: readonly string[] = [
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Email: _____________________________________",
  "Date: ______________________________________",
  "",
  "Sign this by hand. N.D.C.C. Chapter 12-60.1 contains no verification clause, so no sworn form of signature is required and no notarial block is printed here. If the clerk asks for something more, ask the clerk what, and sign in front of a notary rather than beforehand."
];

/**
 * The proof of service's own execution block.
 *
 * It cannot reuse the petition's, which says no sworn form of signature is
 * required: the petition is unsworn because Chapter 12-60.1 has no verification
 * clause, while this document carries a declaration under penalty of perjury
 * about service the petitioner personally made. One note cannot be true of both.
 */
const PROOF_OF_SERVICE_SIGNATURE_BLOCK: readonly string[] = [
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Email: _____________________________________",
  "Date: ______________________________________",
  "",
  "Sign this by hand, after service and not before. The declaration above is made under penalty of perjury, which is what gives this document its effect, and no notarial block is printed because a declaration in that form does not need one. If the clerk asks for a notarized affidavit instead, ask the clerk what it wants and sign that in front of a notary.",
  "If a sheriff or a process server made the service, do not sign this at all. File their certificate instead."
];

/**
 * The court's block on a proposed order, left blank and told to stay blank.
 *
 * The court is named from the participant's own answer rather than fixed. Every
 * one of these routes runs in whichever court holds the criminal case, and a
 * block that said "District Court" on a municipal case would put the wrong
 * judge's title on the order the clerk hands up.
 */
const JUDICIAL_SIGNATURE_BLOCK: readonly string[] = [
  "_________________________________________",
  "Judge of {{courtPhrase}}",
  "",
  "Date signed: ______________________________",
  "",
  "This block is the court's. Leave every line of it blank."
];

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

type PetitionSpec = {
  templateId: string;
  title: string;
  captionRightLine: string;
  groundParagraphs: readonly string[];
  groundAllegation: string;
  extraAllegations: readonly string[];
  extraSections: readonly Section[];
  manualCompletionExtra: readonly string[];
  openQuestionExtra: readonly string[];
  extraStops: readonly string[];
  prayerRelief: string;
};

/**
 * A Chapter 12-60.1 petition to seal.
 *
 * One numbered section only. The shared renderer restarts numbering at 1 in
 * every numbered section, so a second one would produce two paragraphs numbered
 * "1." in a single filing.
 */
function chapterPetitionTemplate(spec: PetitionSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "{{courtLine}}",
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: CAPTION_RIGHT(spec.captionRightLine)
    },
    title: spec.title,
    preamble: PREAMBLE,
    sections: [
      NO_OFFICIAL_FORM_SECTION,
      {
        heading: "THE GROUND THIS PETITION IS BROUGHT ON",
        numbered: false,
        paragraphs: spec.groundParagraphs
      },
      CHAPTER_WHO_DECIDES,
      {
        heading: "THE PETITIONER, THE CASE AND THE RECORD",
        numbered: true,
        paragraphs: [
          "The petitioner is {{sealFullLegalName}}, the defendant in the case identified above, and petitions under N.D.C.C. Chapter 12-60.1 in that case rather than by a separate action, as § 12-60.1-03(1) provides.",
          "Section 12-60.1-03(2)(a) requires the petition to state every other name the petitioner has used. {{otherNamesStatement}}",
          "The petitioner gives their address history from the date of the offence to the filing of this petition, as § 12-60.1-03(2)(b) requires, as: {{addressHistory}}",
          "The offence, in the words used on the judgment, is: {{sealOffence}}",
          spec.groundAllegation,
          "{{newConvictionStatement}}",
          "{{supervisionStatement}}",
          "{{restitutionStatement}}",
          "{{registrationStatement}}",
          ...spec.extraAllegations,
          "The respondent on this petition is {{respondentOffice}}, which is the prosecuting attorney § 12-60.1-03(4) requires be served."
        ]
      },
      {
        heading: "THE PETITIONER'S CRIMINAL HISTORY, AS THE PETITIONER STATES IT",
        numbered: false,
        paragraphs: [
          "Section 12-60.1-03(2)(d) requires the petition to state the petitioner's full criminal history, including matters in other states, in federal court and in another country, and every prior request to any court or authority to pardon, expunge, seal or return records, whether or not it was granted. These are the petitioner's own statements and nobody has checked them against any record.",
          "North Dakota charges and convictions, past or pending:",
          "{{criminalHistoryND}}",
          "Charges and convictions in another state, in federal court, or in another country:",
          "{{criminalHistoryElsewhere}}",
          "Every prior request to pardon, expunge, seal or return records, in any forum:",
          "{{priorReliefRequests}}",
          "A North Dakota sealing order does not reach records held outside North Dakota. They are listed because the statute requires the petition to list them, not because this court can seal them."
        ]
      },
      {
        heading: "THE REASONS THE PETITIONER GIVES FOR SEALING",
        numbered: false,
        paragraphs: [
          "Section 12-60.1-03(2)(c) requires the petition to set out the reasons the record should be sealed, and § 12-60.1-04(1)(e) makes reformation a finding the court must make. What follows is the petitioner's own account, in the petitioner's own words. LegalEase has not investigated it, does not corroborate it and asserts neither good cause nor reformation.",
          "{{reasonsForSealing}}"
        ]
      },
      ...spec.extraSections,
      CHAPTER_EFFECT_SECTION,
      SERVICE_AND_HEARING_SECTION,
      FEE_SECTION,
      manualCompletionSection(spec.manualCompletionExtra),
      openQuestionSection(spec.openQuestionExtra),
      stopSection(spec.extraStops)
    ],
    prayer: [
      `WHEREFORE the petitioner asks the court to seal ${spec.prayerRelief} under N.D.C.C. Chapter 12-60.1, and lodges the proposed order § 12-60.1-03(3) requires with this petition.`,
      "The petitioner makes no claim about what the court will decide. This petition asks; it does not predict.",
      "The petitioner also asks that any part of this petition subject to the redaction requirements of N.D.R.Ct. 3.4 be treated accordingly."
    ],
    signatureLabel: "Petitioner, self-represented",
    signatureBlock: PETITION_SIGNATURE_BLOCK
  };
}

type OrderSpec = {
  templateId: string;
  title: string;
  captionRightLine: string;
  recital: string;
  orderedParagraphs: readonly string[];
  captionLeft: readonly string[];
  captionRight: (line: string) => readonly string[];
  findingsAnchor: string;
  effectParagraphs: readonly string[];
  filingNoun?: string;
  /** How the order names the person who lodged it. Defaults to the petitioner. */
  signer?: string;
  judicialBlock: readonly string[];
};

/**
 * A proposed order.
 *
 * Written in the court's voice because that is what a proposed order is, and it
 * says on its face, twice, that it is not an order and that nothing in it is a
 * finding until a judge signs it. It carries no petitioner signature rule — the
 * petitioner does not sign an order — and its execution block is the judge's,
 * left blank, with an instruction not to complete it.
 *
 * The findings block is deliberately not written out. Section 12-60.1-04(1)
 * requires six findings and the adopted design identifies three of them by
 * subsection without supplying the text of the others, so writing six would mean
 * inventing statutory language. The block names the subsection, states the
 * § 12-60.1-04(8) recital the statute prescribes for the order itself, and
 * leaves the findings to the court with a completion instruction.
 */
function proposedOrderTemplate(spec: OrderSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "{{courtLine}}",
      partyBlockLeft: spec.captionLeft,
      partyBlockRight: spec.captionRight(spec.captionRightLine)
    },
    title: spec.title,
    preamble: `PROPOSED — NOT YET MADE. This document is prepared by the ${spec.signer ?? "petitioner"} and lodged with the ${spec.filingNoun ?? "petition"} for the court's consideration. It is not an order of the court, it has no effect, and nothing written in it is a finding of this court unless and until a judge signs it.`,
    sections: [
      {
        heading: "THE MATTER",
        numbered: false,
        paragraphs: [spec.recital]
      },
      {
        heading: "THE FINDINGS ARE THE COURT'S AND ARE NOT WRITTEN HERE",
        numbered: false,
        paragraphs: [
          spec.findingsAnchor,
          `No finding is written into this draft, and that is deliberate. A finding written in advance by the person asking for the order is not a finding; it is a request wearing the court's voice. The ${spec.signer ?? "petitioner"}'s evidence is in the ${spec.filingNoun ?? "petition"} and its attachments.`,
          "Before lodging this, read the subsection named above and add any recital the court in your county expects that this draft does not carry. Ask the clerk whether that court has a preferred form of order.",
          "________________________________________________________________",
          "________________________________________________________________",
          "________________________________________________________________"
        ]
      },
      {
        heading: "PROPOSED ORDER",
        numbered: true,
        paragraphs: [...spec.orderedParagraphs]
      },
      {
        heading: "WHAT THIS ORDER WOULD AND WOULD NOT REACH",
        numbered: false,
        paragraphs: spec.effectParagraphs
      },
      {
        heading: "BEFORE YOU LODGE THIS",
        numbered: false,
        paragraphs: [
          `Leave the judge's signature and the date blank. Do not sign this document and do not date it. It is signed by the court, if the court grants the ${spec.filingNoun ?? "petition"}, and not before.`,
          `Take it to the clerk with the ${spec.filingNoun ?? "petition"}. The clerk will tell you how many copies the judge wants.`
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: spec.judicialBlock
  };
}

/**
 * The proof of service.
 *
 * A declaration the petitioner signs after service actually happens. Every fact
 * about the service — the date, the manner, the person served — is a blank the
 * petitioner completes at that point. LegalEase serves nothing and must never
 * print a document that reads as though service had occurred.
 */
function proofOfServiceTemplate(templateId: string): PleadingTemplate {
  return {
    templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "{{courtLine}}",
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: CAPTION_RIGHT("PROOF OF SERVICE")
    },
    title: "DECLARATION OF SERVICE ON THE PROSECUTING ATTORNEY",
    preamble:
      "Prepared by LegalEase for the petitioner to complete and sign AFTER service has actually been made. Nothing in this document reports that service has happened. LegalEase serves nobody, holds no proof of service, and has not filed anything.",
    sections: [
      {
        heading: "WHO MUST BE SERVED, AND WHY",
        numbered: false,
        paragraphs: [
          "Section 12-60.1-03(4) requires the petition to be served on the prosecuting attorney, which routes through N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b). On this case that office is {{respondentOffice}}.",
          "Serve first, then complete and sign this declaration, then file the petition, the proposed order and this declaration together with the clerk."
        ]
      },
      {
        heading: "COMPLETE THIS AFTER SERVICE, NOT BEFORE",
        numbered: false,
        paragraphs: [
          "Every line below is blank because none of it has happened yet. Fill each one in from what you actually did.",
          "On the date and in the manner written on the lines below, I served a copy of the Petition to Seal Criminal Records and the proposed order in this case on the prosecuting attorney named above. Until those lines are filled in, this sentence states nothing.",
          "Date of service: ______________________________",
          "Manner of service (for example, personal delivery, mail to the office address, or an electronic method the office accepts):",
          "________________________________________________________________",
          "Name and address of the office or person served:",
          "________________________________________________________________",
          "________________________________________________________________",
          "If a sheriff or a process server made the service, attach their certificate instead of signing below, and write the certificate's date here: ______________________________"
        ]
      },
      {
        heading: "WHAT THIS DECLARATION IS NOT",
        numbered: false,
        paragraphs: [
          "It is not evidence of any position taken by the prosecuting attorney. Section 12-60.1-04(4) has that office canvass law enforcement, witnesses, victims and correctional authorities, and it may object.",
          "It is not a certificate from the clerk and it is not a court record until the clerk files it.",
          "Ask the clerk whether that court wants a declaration in this form or something else. Practice varies and the clerk is the person who knows."
        ]
      }
    ],
    prayer: [],
    verification:
      "I declare under penalty of perjury that the statements I have written above about the service I made are true and correct. I understand that I am signing this after service, about service I made myself, and that no one at LegalEase served anything or saw me do it.",
    signatureLabel: "Petitioner, self-represented",
    signatureBlock: PROOF_OF_SERVICE_SIGNATURE_BLOCK
  };
}

// ---------------------------------------------------------------------------
// Fragments and the open questions each route carries
// ---------------------------------------------------------------------------

/** Carried on every Chapter 12-60.1 packet, because it reaches all three. */
const IMPAIRED_DRIVING_CARVE_OUT_QUESTION =
  "Whether the impaired-driving carve-out from Chapter 12-60.1 holds. Section 12-60.1-02(2) states two exclusions and neither is an impaired-driving carve-out, while the official ND Courts research guides route an impaired-driving record to the separate seal under § 39-08-01.6. This packet follows the guides, and it says so rather than presenting the routing as the statute's.";

const CHAPTER_FINDINGS_ANCHOR =
  "Section 12-60.1-04(1) sets out the findings this court must make before it may grant the petition, and § 12-60.1-04(5) puts a clear-and-convincing burden on the petitioner. Three of them are addressed directly by the petition: that all terms of imprisonment and probation are complete, under § 12-60.1-04(1)(c); that restitution is satisfied, under § 12-60.1-04(1)(d); and that the petitioner has been reformed, under § 12-60.1-04(1)(e).";

const CHAPTER_ORDER_EFFECT: readonly string[] = [
  "Sealing under Chapter 12-60.1 prohibits disclosure of the existence or the contents of the court and prosecution records in this case except by order of this court. It is not an expungement and it destroys nothing.",
  "It would not reach criminal history record information held by the Bureau of Criminal Investigation, and it would not reach the criminal justice data system.",
  "It would not reach federal, tribal, military or out-of-state records, or bind the agencies that hold them.",
  "Section 12-60.1-04(8) requires this order to state that the petitioner is sufficiently rehabilitated but remains subject to N.D.C.C. § 12.1-33-02.1, and that the information is released where an entity has a statutory obligation to conduct a criminal history background check. That statement is set out in the ordered paragraphs above because the subsection puts it in the order, not because anyone has yet found it to be so."
];

const CHAPTER_ORDERED_PARAGRAPHS: readonly string[] = [
  "IT IS ORDERED that the court records and the prosecution records of the case identified above are sealed under N.D.C.C. Chapter 12-60.1, and that their existence and their contents may not be disclosed except by order of this court.",
  "IT IS FURTHER ORDERED, as N.D.C.C. § 12-60.1-04(8) requires this order to state, that the petitioner is sufficiently rehabilitated, that the petitioner remains subject to N.D.C.C. § 12.1-33-02.1, and that the information is released where an entity has a statutory obligation to conduct a criminal history background check.",
  "IT IS FURTHER ORDERED that the clerk seal the court file in this case.",
  "IT IS FURTHER ORDERED that nothing in this order reaches criminal history record information held by the Bureau of Criminal Investigation, the criminal justice data system, or any record held outside North Dakota."
];

const CHAPTER_MANUAL_EXTRA: readonly string[] = [
  "Any recital § 12-60.1-04(1) requires that the proposed order does not carry. The subsection requires six findings and the adopted design supplies the text of three of them, so the order names the subsection and leaves the findings block to the court rather than writing statutory language nobody has read."
];

const CHAPTER_STOPS: readonly string[] = [
  "Any charge still pending anywhere. It is the thing most likely to defeat a clear-and-convincing showing.",
  "Any question about which convictions fall inside the look-back. It is measured backwards from the day of filing and it is not computed here.",
  "A denial. A district court may bar refiling for one year, and the appeal routes differ between a municipal court and a district court."
];

// ---------------------------------------------------------------------------
// The three Chapter 12-60.1 routes
// ---------------------------------------------------------------------------

const MISDEMEANOR_PETITION = chapterPetitionTemplate({
  templateId: "nd-seal-misdemeanor-conviction-petition",
  title: "PETITION TO SEAL CRIMINAL RECORDS UNDER N.D.C.C. CHAPTER 12-60.1 — MISDEMEANOR CONVICTION",
  captionRightLine: "PETITION TO SEAL CRIMINAL RECORDS",
  groundParagraphs: [
    "Section 12-60.1-02(1)(a) allows a person who pleaded guilty to or was found guilty of a misdemeanor to petition to seal the record if they have not been convicted of a new crime for at least three years immediately before the petition is filed.",
    "The three years are a look-back measured backwards from the day this petition is filed. They are not a wait measured from the end of the sentence, and this petition does not compute the period or state that it is satisfied.",
    "Section 12-60.1-02(2) excludes an offence for which registration was ordered under N.D.C.C. § 12.1-32-15."
  ],
  groundAllegation:
    "This petition is brought under N.D.C.C. § 12-60.1-02(1)(a), which reaches a person who pleaded guilty to or was found guilty of a misdemeanor and has not been convicted of a new crime for at least three years immediately before the petition is filed.",
  extraAllegations: [],
  extraSections: [],
  manualCompletionExtra: CHAPTER_MANUAL_EXTRA,
  openQuestionExtra: [IMPAIRED_DRIVING_CARVE_OUT_QUESTION],
  extraStops: CHAPTER_STOPS,
  prayerRelief: "the court records and the prosecution records of the misdemeanor conviction described above"
});

const MISDEMEANOR_ORDER = proposedOrderTemplate({
  templateId: "nd-seal-misdemeanor-conviction-order",
  title: "ORDER TO SEAL CRIMINAL RECORDS UNDER N.D.C.C. CHAPTER 12-60.1 (PROPOSED — NOT YET MADE)",
  captionRightLine: "PROPOSED ORDER",
  captionLeft: CAPTION_LEFT,
  captionRight: CAPTION_RIGHT,
  recital:
    "This matter comes before the court on the petitioner's petition to seal the records of a misdemeanor conviction, brought under N.D.C.C. § 12-60.1-02(1)(a) in the criminal case itself, the prosecuting attorney having been served under § 12-60.1-03(4).",
  findingsAnchor: CHAPTER_FINDINGS_ANCHOR,
  orderedParagraphs: CHAPTER_ORDERED_PARAGRAPHS,
  effectParagraphs: CHAPTER_ORDER_EFFECT,
  judicialBlock: JUDICIAL_SIGNATURE_BLOCK
});

const FELONY_PETITION = chapterPetitionTemplate({
  templateId: "nd-seal-felony-conviction-petition",
  title: "PETITION TO SEAL CRIMINAL RECORDS UNDER N.D.C.C. CHAPTER 12-60.1 — FELONY CONVICTION",
  captionRightLine: "PETITION TO SEAL CRIMINAL RECORDS",
  groundParagraphs: [
    "Section 12-60.1-02(1)(b) allows a person who pleaded guilty to or was found guilty of a felony to petition to seal the record if they have not been convicted of a new crime for at least five years immediately before the petition is filed.",
    "The five years are a look-back measured backwards from the day this petition is filed. They are not a wait measured from the end of the sentence, and this petition does not compute the period or state that it is satisfied.",
    "Section 12-60.1-02(2) excludes a felony offence involving violence or intimidation during the period in which the offender is ineligible to possess a firearm under N.D.C.C. § 62.1-02-01(1)(a), and excludes an offence for which registration was ordered under § 12.1-32-15. The firearm-disability period runs ten years from the latest of the conviction, release from incarceration, release from parole and release from probation, and the offence set for it is chapters 12.1-16 through 12.1-25."
  ],
  groundAllegation:
    "This petition is brought under N.D.C.C. § 12-60.1-02(1)(b), which reaches a person who pleaded guilty to or was found guilty of a felony and has not been convicted of a new crime for at least five years immediately before the petition is filed.",
  extraAllegations: ["{{offenceChapterStatement}}"],
  extraSections: [
    {
      heading: "A FELONY PETITION IS A LAWYER'S MATTER, AND THIS PACKET SAYS SO PLAINLY",
      numbered: false,
      paragraphs: [
        "The controlling North Dakota review treats every felony petition under this chapter as an attorney handoff. That is recorded here on the face of the petition rather than left in a file somewhere.",
        "The reason is the exclusion. Whether an offence involved violence or intimidation, and whether the ten-year firearm-disability period has run, are both determinations this packet does not make. A deferred imposition counts as a conviction for that computation under N.D.C.C. § 62.1-02-01(2), which is the part people miss.",
        `A lawyer should read the judgment and the release dates with you before this is filed. ${ND_REFERRAL}`
      ]
    }
  ],
  manualCompletionExtra: [
    ...CHAPTER_MANUAL_EXTRA,
    "The determination whether the offence involved violence or intimidation, and any computation of the § 62.1-02-01(1)(a) firearm-disability period. The petitioner supplies the Century Code chapter from the judgment; nothing here classifies the offence or measures the ten years."
  ],
  openQuestionExtra: [IMPAIRED_DRIVING_CARVE_OUT_QUESTION],
  extraStops: [
    ...CHAPTER_STOPS,
    "Every felony petition on this route, which the controlling review makes an attorney handoff.",
    "Any question whether the offence involved violence or intimidation, and any firearm-disability computation."
  ],
  prayerRelief: "the court records and the prosecution records of the felony conviction described above"
});

const FELONY_ORDER = proposedOrderTemplate({
  templateId: "nd-seal-felony-conviction-order",
  title: "ORDER TO SEAL CRIMINAL RECORDS UNDER N.D.C.C. CHAPTER 12-60.1 (PROPOSED — NOT YET MADE)",
  captionRightLine: "PROPOSED ORDER",
  captionLeft: CAPTION_LEFT,
  captionRight: CAPTION_RIGHT,
  recital:
    "This matter comes before the court on the petitioner's petition to seal the records of a felony conviction, brought under N.D.C.C. § 12-60.1-02(1)(b) in the criminal case itself, the prosecuting attorney having been served under § 12-60.1-03(4).",
  findingsAnchor: CHAPTER_FINDINGS_ANCHOR,
  orderedParagraphs: CHAPTER_ORDERED_PARAGRAPHS,
  effectParagraphs: CHAPTER_ORDER_EFFECT,
  judicialBlock: JUDICIAL_SIGNATURE_BLOCK
});

const PARDONED_PETITION = chapterPetitionTemplate({
  templateId: "nd-seal-pardoned-conviction-petition",
  title: "PETITION TO SEAL CRIMINAL RECORDS UNDER N.D.C.C. CHAPTER 12-60.1 — PARDONED CONVICTION",
  captionRightLine: "PETITION TO SEAL CRIMINAL RECORDS",
  groundParagraphs: [
    "Section 12-60.1-02(1)(c) allows a person granted an unconditional pardon for a North Dakota conviction to petition to seal the record.",
    "Section 12-60.1-02(1)(c) carries no look-back period of its own. The chapter-level bars in § 12-60.1-02(2) still apply and a pardon does not lift them.",
    "A pardon does not by itself remove the fact of the conviction unless the certificate of pardon says so, which is why sealing is a separate step and why this petition is brought."
  ],
  groundAllegation:
    "This petition is brought under N.D.C.C. § 12-60.1-02(1)(c), which reaches a person granted an unconditional pardon for a North Dakota conviction.",
  extraAllegations: ["{{pardonStatement}}"],
  extraSections: [],
  manualCompletionExtra: [
    ...CHAPTER_MANUAL_EXTRA,
    "A copy of the certificate of pardon, which the petitioner attaches. LegalEase never receives or inspects it and does not describe what it says beyond what the petitioner has stated."
  ],
  openQuestionExtra: [IMPAIRED_DRIVING_CARVE_OUT_QUESTION],
  extraStops: [
    ...CHAPTER_STOPS,
    "A conditional pardon, which N.D.C.C. § 12-55.1-01(2) defines as one subject to terms and conditions established by the governor.",
    "A pardon that covers a different conviction from the one being sealed."
  ],
  prayerRelief: "the court records and the prosecution records of the pardoned conviction described above"
});

const PARDONED_ORDER = proposedOrderTemplate({
  templateId: "nd-seal-pardoned-conviction-order",
  title: "ORDER TO SEAL CRIMINAL RECORDS UNDER N.D.C.C. CHAPTER 12-60.1 (PROPOSED — NOT YET MADE)",
  captionRightLine: "PROPOSED ORDER",
  captionLeft: CAPTION_LEFT,
  captionRight: CAPTION_RIGHT,
  recital:
    "This matter comes before the court on the petitioner's petition to seal the records of a pardoned conviction, brought under N.D.C.C. § 12-60.1-02(1)(c) in the criminal case itself, the prosecuting attorney having been served under § 12-60.1-03(4).",
  findingsAnchor: CHAPTER_FINDINGS_ANCHOR,
  orderedParagraphs: CHAPTER_ORDERED_PARAGRAPHS,
  effectParagraphs: CHAPTER_ORDER_EFFECT,
  judicialBlock: JUDICIAL_SIGNATURE_BLOCK
});

const MISDEMEANOR_PROOF = proofOfServiceTemplate("nd-seal-misdemeanor-conviction-proof-of-service");
const FELONY_PROOF = proofOfServiceTemplate("nd-seal-felony-conviction-proof-of-service");
const PARDONED_PROOF = proofOfServiceTemplate("nd-seal-pardoned-conviction-proof-of-service");

// ---------------------------------------------------------------------------
// The impaired-driving route
// ---------------------------------------------------------------------------

const DUI_PETITION: PleadingTemplate = {
  templateId: "nd-dui-record-seal-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "{{courtLine}}",
    partyBlockLeft: CASE_CAPTION_LEFT,
    partyBlockRight: CASE_CAPTION_RIGHT("PETITION TO SEAL DUI RECORD")
  },
  title: "PETITION TO SEAL A DRIVING UNDER THE INFLUENCE RECORD UNDER N.D.C.C. § 39-08-01.6",
  preamble: PREAMBLE,
  sections: [
    {
      heading: "WHY THIS IS A DRAFTED DOCUMENT AND NOT A FORM",
      numbered: false,
      paragraphs: [
        "The Legal Self Help Center's DUI sealing research guide states that it has no forms in this area and that the person seeking relief creates their own documents. This petition is drafted to the contents that guide sets out: a written petition showing that the requirements of N.D.C.C. § 39-08-01.6(1)(a) and (b) are met, with any documentation the petitioner believes proves what it states.",
        "It is not an official form, it is not approved by any court, and no court has seen it."
      ]
    },
    {
      heading: "WHAT THE SECTION SAYS, AND WHAT IT DOES NOT SAY",
      numbered: false,
      paragraphs: [
        "Section 39-08-01.6(1) provides that the court shall seal a criminal record relating to a conviction under N.D.C.C. § 39-08-01, in accordance with §§ 12.1-32-07.1 and 12.1-32-07.2, where the individual has not committed a further violation of § 39-08-01 or an equivalent ordinance, or any other criminal offence, within seven years of the first violation.",
        "The subsection states no motion or petition trigger. It says the court shall seal, while the neighbouring marijuana provision at § 19-03.1-23(9) says expressly upon motion. So this petition is not represented as statutorily required: it follows the official ND Courts research guide, which describes a petition, and it may operate as a prompt to a court that could act without one. That difference is recorded rather than smoothed over.",
        "Section 39-08-01.6(2) excludes an individual licensed as a commercial driver under N.D.C.C. § 39-06.2-10.",
        "The seven years in § 39-08-01.6(1)(b) run from the first violation. They do not run from the conviction and they do not run from the completion of the sentence. This petition states the date the petitioner gave and computes nothing from it.",
        "The clean period covers any other criminal offence and is not limited to impaired driving, which is the part of this ground most often misread."
      ]
    },
    DUI_WHO_DECIDES,
    {
      heading: "THE PETITIONER, THE CASE AND THE SEVEN YEARS",
      numbered: true,
      paragraphs: [
        "The petitioner is the defendant in the case identified above and asks the court to seal the record of that case under N.D.C.C. § 39-08-01.6.",
        "{{convictionTypeStatement}}",
        "{{chargedUnderStatement}}",
        "{{firstViolationStatement}}",
        "{{cleanPeriodStatement}}",
        "{{commercialLicenceStatement}}"
      ]
    },
    {
      heading: "WHAT THIS SEAL DOES, AND WHAT IT DOES NOT DO",
      numbered: false,
      paragraphs: [
        "Expungement of an impaired-driving record is not available in North Dakota. This is sealing, under the restricted-access regime of N.D.C.C. § 12.1-32-07.2(2).",
        "Under that regime the records may be examined by the clerk, a judge, the juvenile commissioner, probation officers, the defendant or defence counsel and the state's attorney, and by anyone else only on the written order of a judge. The record continues to exist and it continues to be reachable by those people.",
        "Section 39-08-01(3) preserves a prosecutor's access to a prior offence for enhancement. A later impaired-driving charge can still be enhanced by this one after it is sealed. Anyone who is told otherwise has been told something that is not so.",
        "A North Dakota order does not reach an out-of-state impaired-driving conviction, and this petition asks nothing of any other state."
      ]
    },
    {
      heading: "FILING, SERVICE, FEES AND THE HEARING",
      numbered: false,
      paragraphs: [
        "The official guide directs the petitioner to file the petition and any accompanying documents in the impaired-driving case with the clerk of court.",
        "Section 39-08-01.6 states no service requirement and no fee, and no fee for this petition appears in the statewide court fee schedule. No monetary amount is printed anywhere in this packet. Ask the clerk whether that court charges anything and whether it wants the prosecuting attorney copied.",
        "No hearing is required by the section, but the official guide records that the judge may decide to hold one. The date of any hearing is the court's and is not written here.",
        "LegalEase does not collect, forward or handle any payment in this process."
      ]
    },
    {
      heading: "WHAT THIS PACKET LEAVES BLANK, AND WHOSE IT IS",
      numbered: false,
      paragraphs: [
        "The petitioner's signature. The petition is the petitioner's own document.",
        "Any documentation the petitioner chooses to attach. The official guide invites the petitioner to include documentation proving what the petition states; LegalEase names it and never collects or inspects it.",
        "Where the charge was under a municipal ordinance, the text of that ordinance. Section 39-08-01.6(1) reaches an equivalent ordinance and the equivalence is shown from the text, which the city supplies.",
        "The judge's signature and the date on any proposed order. The petitioner lodges an order unsigned; the court signs it if it grants the petition."
      ]
    },
    {
      heading: "QUESTIONS THIS PACKET DOES NOT ANSWER",
      numbered: false,
      paragraphs: [
        "Whether a § 39-08-01.6 seal issues on the court's own motion. The subsection says the court shall seal and states no trigger, so the petition the official guide describes may be a prompt rather than a requirement. This packet does not represent the petition as statutorily mandated.",
        "What filing fee, if any, attaches. The section states none and the fee schedule carries none, but only the clerk can say.",
        "Whether a particular municipal ordinance is equivalent to N.D.C.C. § 39-08-01. That is read from the ordinance text against the statute, and it is not read here."
      ]
    },
    {
      heading: "WHERE THIS PACKET STOPS",
      numbered: false,
      paragraphs: [
        "LegalEase prepares documents from what the petitioner says. It does not give legal advice, does not look at any record, does not file anything and does not appear in court.",
        "Any commercial driver's licence, current or historical, which the section excludes outright.",
        "Any criminal offence at all inside the seven-year window, not only another impaired-driving offence.",
        "Any uncertainty whether the charge was under the state statute or an equivalent ordinance.",
        "A participant who expects the record to be expunged rather than sealed, or who expects the prosecutor's enhancement access to be gone. North Dakota offers neither on this route.",
        "An out-of-state impaired-driving conviction, which a North Dakota court cannot reach.",
        `Where any of these applies, speak to a lawyer before filing. ${ND_REFERRAL}`
      ]
    }
  ],
  prayer: [
    "WHEREFORE the petitioner asks the court to seal the record of the impaired-driving case identified above under N.D.C.C. § 39-08-01.6, in accordance with §§ 12.1-32-07.1 and 12.1-32-07.2.",
    "The petitioner makes no claim about what the court will decide. This petition asks; it does not predict."
  ],
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: [
    "Printed name: ______________________________",
    "Address: ___________________________________",
    "Telephone: _________________________________",
    "Email: _____________________________________",
    "Date: ______________________________________",
    "",
    "Sign this by hand. Section 39-08-01.6 states no verification requirement and no notarial block is printed here. If the clerk asks for something more, ask the clerk what, and sign in front of a notary rather than beforehand."
  ]
};

const DUI_ORDER = proposedOrderTemplate({
  templateId: "nd-dui-record-seal-order",
  title: "ORDER SEALING A DRIVING UNDER THE INFLUENCE RECORD UNDER N.D.C.C. § 39-08-01.6 (PROPOSED — NOT YET MADE)",
  captionRightLine: "PROPOSED ORDER",
  captionLeft: CASE_CAPTION_LEFT,
  captionRight: CASE_CAPTION_RIGHT,
  recital:
    "This matter comes before the court on the petitioner's petition to seal the record of an impaired-driving conviction under N.D.C.C. § 39-08-01.6, filed in the criminal case itself.",
  findingsAnchor:
    "Section 39-08-01.6(1) states the conditions in subsections (1)(a) and (1)(b) and does not prescribe a form of order. This draft is lodged because Chapter 12-60.1 practice makes a proposed order usual, not because the section requires one; ask the clerk whether that court wants one at all.",
  orderedParagraphs: [
    "IT IS ORDERED that the criminal record relating to the conviction identified above is sealed under N.D.C.C. § 39-08-01.6, in accordance with N.D.C.C. §§ 12.1-32-07.1 and 12.1-32-07.2.",
    "IT IS FURTHER ORDERED that the record be treated under the restricted-access regime of N.D.C.C. § 12.1-32-07.2(2), so that it may be examined by the clerk, a judge, the juvenile commissioner, probation officers, the defendant or defence counsel and the state's attorney, and by any other person only on the written order of a judge.",
    "IT IS FURTHER ORDERED that nothing in this order affects the access N.D.C.C. § 39-08-01(3) preserves for the enhancement of a later offence."
  ],
  effectParagraphs: [
    "This is sealing and not expungement. North Dakota does not offer expungement of an impaired-driving record, and this order would destroy nothing.",
    "It would not remove the record from the people § 12.1-32-07.2(2) allows to examine it, and it would not end a prosecutor's access to the prior offence for enhancement under § 39-08-01(3).",
    "It would not reach an out-of-state impaired-driving conviction, a federal record, a tribal record or a military record."
  ],
  judicialBlock: JUDICIAL_SIGNATURE_BLOCK
});

// ---------------------------------------------------------------------------
// The first-marijuana route
// ---------------------------------------------------------------------------

const MARIJUANA_MOTION: PleadingTemplate = {
  templateId: "nd-marijuana-first-offense-seal-motion",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "{{courtLine}}",
    partyBlockLeft: MOVANT_CAPTION_LEFT,
    partyBlockRight: CASE_CAPTION_RIGHT("MOTION TO SEAL COURT RECORD")
  },
  title: "MOTION TO SEAL THE COURT RECORD OF A FIRST MARIJUANA OR THC POSSESSION CONVICTION UNDER N.D.C.C. § 19-03.1-23(9)",
  preamble:
    "Prepared by LegalEase from the answers the movant gave. LegalEase has not seen the movant's records, has not decided whether the movant qualifies, does not represent the movant, files nothing and appears nowhere. Every statement of fact below is the movant's own.",
  sections: [
    {
      heading: "WHY THIS IS A DRAFTED DOCUMENT AND NOT A FORM",
      numbered: false,
      paragraphs: [
        "North Dakota publishes no sealing form. The official research guide confirms that no sealing forms are published and that the person seeking relief creates their own documents. This motion is drafted to the elements the subsection sets out.",
        "It is not an official form, it is not approved by any court, and no court has seen it."
      ]
    },
    {
      heading: "WHAT THE SUBSECTION PROVIDES",
      numbered: false,
      paragraphs: [
        "Section 19-03.1-23(9) provides that where a person pleads guilty or is found guilty of a first offence of possessing one ounce or less of marijuana or two grams or less of tetrahydrocannabinol and a judgment of guilt is entered, the court shall, upon motion, seal the court record of that conviction if the person is not subsequently convicted within two years of a further violation of the chapter.",
        "Relief is mandatory once the elements are met — the subsection says the court shall seal — and unlike the impaired-driving section it expressly provides for a motion, which is what this document is.",
        "The elements are the first-offence status, the substance and the quantity charged. Each is read off the charging document rather than from recollection."
      ]
    },
    MARIJUANA_WHO_DECIDES,
    {
      heading: "THE MOVANT, THE CASE AND THE ELEMENTS",
      numbered: true,
      paragraphs: [
        "The movant is the defendant in the case identified above and moves under N.D.C.C. § 19-03.1-23(9) to seal the court record of the conviction in that case.",
        "{{offenceDateStatement}}",
        "{{judgmentDateStatement}}",
        "The charge was possession of {{substanceName}}.",
        "{{quantityStatement}}",
        "{{firstOffenceStatement}}",
        "{{subsequentConvictionStatement}}",
        "{{otherChargesStatement}}"
      ]
    },
    {
      heading: "THIS SEAL IS IRREVERSIBLE, AND THAT MATTERS BEFORE IT IS ASKED FOR",
      numbered: false,
      paragraphs: [
        "Once the court record is sealed under § 19-03.1-23(9) it may not be opened even by order of the court. That makes this the strongest of North Dakota's three seals and the only one that cannot be undone.",
        "Before filing, keep your own copies of anything from this case you may ever need — the judgment, the charging document, any disposition order. After the seal you will not be able to get them from the court, and neither will anyone acting for you.",
        "The seal reaches the court record of that conviction. It is not an expungement, notwithstanding that the official general expungement research guide describes this route as an expungement while the statute says seal. The statute controls and this motion says seal."
      ]
    },
    {
      heading: "FILING, SERVICE, FEES AND THE HEARING",
      numbered: false,
      paragraphs: [
        "File the motion in the existing criminal case with the clerk of court.",
        "The subsection states no service requirement and no hearing requirement. No fee for a motion in an existing criminal case appears in the statewide court fee schedule, and no monetary amount is printed anywhere in this packet. Ask the clerk what that court expects and whether it wants the prosecuting attorney copied.",
        "LegalEase does not collect, forward or handle any payment in this process."
      ]
    },
    {
      heading: "WHAT THIS PACKET LEAVES BLANK, AND WHOSE IT IS",
      numbered: false,
      paragraphs: [
        "The movant's signature. The motion is the movant's own document.",
        "The judge's signature and the date on any proposed order. The movant lodges an order unsigned; the court signs it if it grants the motion.",
        "The charging document and the judgment, which the movant attaches. LegalEase never receives or inspects either, and the quantity and the first-offence status stated above are the movant's own, taken from them."
      ]
    },
    {
      heading: "QUESTIONS THIS PACKET DOES NOT ANSWER",
      numbered: false,
      paragraphs: [
        "What the two years run from. The subsection says the person must not be subsequently convicted within two years of a further violation of the chapter, and the words are open between two years from the judgment and two years from the further violation. That ambiguity decides who qualifies. This packet does not compute it, and any further controlled-substance conviction stops the route rather than being measured against a period nobody has settled.",
        "Why two official publications describe this route differently. The general expungement research guide calls it an expungement and the sealing guide and the statute call it a seal. The statute controls; the conflict is recorded.",
        "What filing fee, if any, attaches. None appears in the fee schedule, but only the clerk can say."
      ]
    },
    {
      heading: "WHERE THIS PACKET STOPS",
      numbered: false,
      paragraphs: [
        "LegalEase prepares documents from what the movant says. It does not give legal advice, does not look at any record, does not file anything and does not appear in court.",
        "Any uncertainty whether this was a first offence, or about the quantity charged. Both are elements and both come off the charging document.",
        "Any subsequent controlled-substance conviction, because the two-year anchor is unsettled.",
        "Other charges in the same case, which the subsection does not reach.",
        "A participant confusing this with the executive marijuana pardon, which is an entirely separate process run by the Pardon Advisory Board and not by any court.",
        `Where any of these applies, speak to a lawyer before filing. ${ND_REFERRAL}`
      ]
    }
  ],
  prayer: [
    "WHEREFORE the movant asks the court to seal the court record of the conviction identified above under N.D.C.C. § 19-03.1-23(9).",
    "The movant makes no claim about what the court will decide. This motion asks; it does not predict."
  ],
  signatureLabel: "Movant, self-represented",
  signatureBlock: [
    "Printed name: ______________________________",
    "Address: ___________________________________",
    "Telephone: _________________________________",
    "Email: _____________________________________",
    "Date: ______________________________________",
    "",
    "Sign this by hand. Section 19-03.1-23(9) states no verification requirement and no notarial block is printed here. If the clerk asks for something more, ask the clerk what, and sign in front of a notary rather than beforehand."
  ]
};

const MARIJUANA_ORDER = proposedOrderTemplate({
  templateId: "nd-marijuana-first-offense-seal-order",
  title: "ORDER SEALING THE COURT RECORD OF A FIRST MARIJUANA OR THC POSSESSION CONVICTION UNDER N.D.C.C. § 19-03.1-23(9) (PROPOSED — NOT YET MADE)",
  captionRightLine: "PROPOSED ORDER",
  captionLeft: MOVANT_CAPTION_LEFT,
  captionRight: CASE_CAPTION_RIGHT,
  filingNoun: "motion",
  signer: "movant",
  recital:
    "This matter comes before the court on the movant's motion to seal the court record of a first offence of possessing marijuana or tetrahydrocannabinol, brought under N.D.C.C. § 19-03.1-23(9) in the criminal case itself.",
  findingsAnchor:
    "Section 19-03.1-23(9) sets the elements — a first offence, the substance, the quantity, a judgment of guilt entered, and no subsequent conviction of a further violation of the chapter — and does not prescribe a form of order. This draft is lodged because Chapter 12-60.1 practice makes a proposed order usual, not because the subsection requires one; ask the clerk whether that court wants one at all.",
  orderedParagraphs: [
    "IT IS ORDERED that the court record of the conviction identified above is sealed under N.D.C.C. § 19-03.1-23(9).",
    "IT IS FURTHER ORDERED that the clerk seal that record in the court file.",
    "IT IS FURTHER ORDERED that nothing in this order reaches any other charge in this case, any other case, or any record held outside the court."
  ],
  effectParagraphs: [
    "A seal under § 19-03.1-23(9) is irreversible: once sealed, the court record may not be opened even by order of the court. The movant should keep their own copies of anything they may later need before this order is sought.",
    "It reaches the court record of that conviction. It would not reach another charge filed in the same case.",
    "It would not reach criminal history record information held by the Bureau of Criminal Investigation, or any federal, tribal, military or out-of-state record."
  ],
  judicialBlock: JUDICIAL_SIGNATURE_BLOCK
});

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

function buildTemplates(): Record<string, PleadingTemplate> {
  const templates: Record<string, PleadingTemplate> = {};
  const all = [
    MISDEMEANOR_PETITION,
    MISDEMEANOR_ORDER,
    MISDEMEANOR_PROOF,
    FELONY_PETITION,
    FELONY_ORDER,
    FELONY_PROOF,
    PARDONED_PETITION,
    PARDONED_ORDER,
    PARDONED_PROOF,
    DUI_PETITION,
    DUI_ORDER,
    MARIJUANA_MOTION,
    MARIJUANA_ORDER
  ];
  for (const template of all) templates[template.templateId] = template;
  return templates;
}

export const NORTH_DAKOTA_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> =
  buildTemplates();

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
 * own, so the design's three custom-pleading roles are mapped onto it here and
 * the mapping is asserted by the verifier rather than left implicit.
 *
 *   primary_filing   → primary_filing    the petition, or the § 19-03.1-23(9) motion
 *   proposed_order   → proposed_order    lodged unsigned; the court signs it
 *   proof_of_service → certificate_of_service
 *       The design calls for "an affidavit or declaration of service on the
 *       prosecuting attorney, or a certificate of service where a sheriff
 *       served". `certificate_of_service` is the engine's role for exactly that
 *       document. It is not an `affidavit` — Chapter 12-60.1 has no verification
 *       clause and the declaration is unsworn as to everything except the
 *       service the petitioner personally made — and it is not a `notice`,
 *       because the notice is the service itself and this is the record of it.
 *
 * The componentId is pinned exactly as the design assigns it. That is what
 * carries assignment fidelity; the role mapping only keeps the vocabularies
 * honest with each other.
 */
export const ND_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order",
  proof_of_service: "certificate_of_service"
};

type ComponentSpec = {
  componentId: string;
  designRole: keyof typeof ND_DESIGN_ROLE_TO_ENGINE_ROLE;
  templateId: string;
  order: number;
  requirement: "required" | "conditional";
};

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  for (const spec of specs) {
    if (!NORTH_DAKOTA_PLEADING_TEMPLATES[spec.templateId]) {
      throw new Error(
        `${spec.componentId}: no North Dakota template ${spec.templateId} is registered.`
      );
    }
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: ND_DESIGN_ROLE_TO_ENGINE_ROLE[spec.designRole],
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: spec.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: spec.requirement,
      ...(spec.requirement === "conditional"
        ? { conditionKey: ND_PROPOSED_ORDER_CONDITION_KEY }
        : {}),
      order: spec.order,
      approval: PENDING_APPROVAL,
      version: VERSION
    }))
  };
}

/**
 * The sixteen questions all three Chapter 12-60.1 routes ask.
 *
 * `RequiredInput` carries only a key, a label and a required flag, so the
 * design's condition text — the reason a question is asked, and what a usable
 * answer looks like — is folded into the label. The keys are the design's and
 * are not renamed.
 */
const CHAPTER_INPUTS: readonly RequiredInput[] = [
  { key: "sealFullLegalName", label: "What is your full legal name?", required: true },
  {
    key: "sealAllOtherNames",
    label:
      "What other names have you ever used, including maiden names and aliases? Section 12-60.1-03(2)(a) requires the petition to state them. If none, answer no.",
    required: true
  },
  {
    key: "sealAddressHistory",
    label:
      "Where have you lived from the date of the offence until now? Section 12-60.1-03(2)(b) requires the address history.",
    required: true
  },
  {
    key: "sealReasons",
    label:
      "In your own words, why should the court seal this record? Section 12-60.1-03(2)(c) requires the reasons and § 12-60.1-04(1)(e) makes reformation a finding. These words go into the petition as yours.",
    required: true
  },
  {
    key: "sealCourtType",
    label: "Was the case in district court or municipal court? Answer district or municipal.",
    required: true
  },
  { key: "sealCounty", label: "Which North Dakota county or municipality?", required: true },
  { key: "sealCaseNumber", label: "What is the case number?", required: true },
  {
    key: "sealOffence",
    label: "What were you convicted of? Describe it in the words used on the judgment.",
    required: true
  },
  {
    key: "sealCriminalHistoryND",
    label:
      "What other North Dakota charges or convictions do you have, past or pending? Section 12-60.1-03(2)(d) requires the full history. If none, answer no.",
    required: true
  },
  {
    key: "sealCriminalHistoryElsewhere",
    label:
      "What charges or convictions do you have in other states, federally, or in another country? Asked where you report any such record; the statute requires them listed even though a North Dakota order cannot reach them.",
    required: false
  },
  {
    key: "sealPriorReliefRequests",
    label:
      "Have you ever asked any court or authority to pardon, expunge, seal or return records for any case — whether or not it was granted? Section 12-60.1-03(2)(d) requires every prior request, in any forum. If none, answer no.",
    required: true
  },
  {
    key: "sealNewConvictions",
    label:
      "Have you been convicted of any new crime since the offence, and if so when? The look-back is measured backwards from the day you file. If none, answer no.",
    required: true
  },
  {
    key: "sealSupervisionComplete",
    label:
      "Have you finished all imprisonment and all probation on this case? Answer yes or no. Section 12-60.1-04(1)(c) makes it a finding the court must make.",
    required: true
  },
  {
    key: "sealRestitutionPaid",
    label:
      "Has all restitution been paid in full? Answer paid, none ordered, or not paid. Section 12-60.1-04(1)(d) makes it a separate finding.",
    required: true
  },
  {
    key: "sealRegistrationOrdered",
    label:
      "Were you ever ordered to register as an offender under N.D.C.C. § 12.1-32-15 for this offence? Answer yes or no. Section 12-60.1-02(2) excludes a registration offence.",
    required: true
  },
  {
    key: "sealProsecutorOffice",
    label:
      "Which office prosecuted the case — a city attorney or the county State's Attorney? Answer city attorney or state's attorney. That office is the respondent you serve under § 12-60.1-03(4).",
    required: true
  }
];

function northDakotaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  packetSet: PacketSet;
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
    jurisdiction: "ND",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    // Every assigned track is a conviction record on the design's own registry
    // slice, and every one is filed in the existing criminal case.
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    courtLevel: "the_court_holding_the_existing_criminal_case",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: input.packetSet,
    requiredInputs: input.requiredInputs,
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
    assembledPacketName: input.assembledPacketName,
    assembledPacketTitle: input.assembledPacketTitle,
    customerDeliverableDescription: input.customerDeliverableDescription,
    notes: input.notes
  };
}

const CHAPTER_TAIL =
  "Filed in the existing criminal case under § 12-60.1-03(1), served on the prosecuting attorney under § 12-60.1-03(4), with the proposed order § 12-60.1-03(3) makes mandatory. No fee amount is printed because none is established. The findings stay the court's, the reasons stay the petitioner's, and no look-back is computed.";

export const NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  northDakotaTrack({
    trackId: "nd-seal-misdemeanor-conviction",
    publicName: "Ask a North Dakota court to seal a misdemeanor conviction",
    mechanism: "seal_misdemeanor_conviction_under_chapter_12_60_1",
    authority: "N.D.C.C. § 12-60.1-02(1)(a)",
    packetSet: packetSet("nd-seal-misdemeanor-conviction", [
      {
        componentId: "nd-seal-misdemeanor-conviction-primary-filing-1",
        designRole: "primary_filing",
        templateId: "nd-seal-misdemeanor-conviction-petition",
        order: 1,
        requirement: "required"
      },
      {
        componentId: "nd-seal-misdemeanor-conviction-proposed-order-2",
        designRole: "proposed_order",
        templateId: "nd-seal-misdemeanor-conviction-order",
        order: 2,
        requirement: "required"
      },
      {
        componentId: "nd-seal-misdemeanor-conviction-proof-of-service-3",
        designRole: "proof_of_service",
        templateId: "nd-seal-misdemeanor-conviction-proof-of-service",
        order: 3,
        requirement: "required"
      }
    ]),
    requiredInputs: CHAPTER_INPUTS,
    assembledPacketName: "nd-seal-misdemeanor-conviction",
    assembledPacketTitle: "North Dakota sealing packet — misdemeanor conviction, N.D.C.C. § 12-60.1-02(1)(a)",
    customerDeliverableDescription: `Petition to seal a misdemeanor conviction under N.D.C.C. § 12-60.1-02(1)(a), with the mandatory proposed order and a declaration of service on the prosecuting attorney. ${CHAPTER_TAIL}`,
    notes:
      "The three years are a look-back from filing rather than a wait from sentence completion, and the packet says so without computing it. A registration offence and an impaired-driving offence both stop, the second by the official guides' routing rather than the statute's."
  }),

  northDakotaTrack({
    trackId: "nd-seal-felony-conviction",
    publicName: "Ask a North Dakota court to seal a felony conviction",
    mechanism: "seal_felony_conviction_under_chapter_12_60_1",
    authority: "N.D.C.C. § 12-60.1-02(1)(b)",
    packetSet: packetSet("nd-seal-felony-conviction", [
      {
        componentId: "nd-seal-felony-conviction-primary-filing-1",
        designRole: "primary_filing",
        templateId: "nd-seal-felony-conviction-petition",
        order: 1,
        requirement: "required"
      },
      {
        componentId: "nd-seal-felony-conviction-proposed-order-2",
        designRole: "proposed_order",
        templateId: "nd-seal-felony-conviction-order",
        order: 2,
        requirement: "required"
      },
      {
        componentId: "nd-seal-felony-conviction-proof-of-service-3",
        designRole: "proof_of_service",
        templateId: "nd-seal-felony-conviction-proof-of-service",
        order: 3,
        requirement: "required"
      }
    ]),
    requiredInputs: [
      ...CHAPTER_INPUTS,
      {
        key: "sealOffenceChapter",
        label:
          "Which North Dakota Century Code chapter is the offence in? Take it from the judgment, for example 12.1-23. Chapters 12.1-16 through 12.1-25 cover violence and intimidation offences and carry an extra bar.",
        required: true
      },
      {
        key: "sealConvictionDate",
        label:
          "On what date were you convicted? Asked where a violence or intimidation felony is reported, because the firearm-disability period runs from it.",
        required: false
      },
      {
        key: "sealReleaseDates",
        label:
          "On what dates were you released from incarceration, from parole and from probation, whichever apply? Asked where a violence or intimidation felony is reported. The ten years run from the latest of them.",
        required: false
      }
    ],
    assembledPacketName: "nd-seal-felony-conviction",
    assembledPacketTitle: "North Dakota sealing packet — felony conviction, N.D.C.C. § 12-60.1-02(1)(b)",
    customerDeliverableDescription: `Petition to seal a felony conviction under N.D.C.C. § 12-60.1-02(1)(b), with the mandatory proposed order and a declaration of service on the prosecuting attorney. The controlling review treats every felony petition on this route as an attorney handoff and the petition says so on its face. ${CHAPTER_TAIL}`,
    notes:
      "The § 12-60.1-02(2) violence-or-intimidation bar is screened from the Century Code chapter alone: chapters 12.1-16 through 12.1-25 stop the route rather than being classified or measured against the ten-year firearm-disability period."
  }),

  northDakotaTrack({
    trackId: "nd-seal-pardoned-conviction",
    publicName: "Ask a North Dakota court to seal a conviction the Governor has pardoned",
    mechanism: "seal_pardoned_conviction_under_chapter_12_60_1",
    authority: "N.D.C.C. § 12-60.1-02(1)(c)",
    packetSet: packetSet("nd-seal-pardoned-conviction", [
      {
        componentId: "nd-seal-pardoned-conviction-primary-filing-1",
        designRole: "primary_filing",
        templateId: "nd-seal-pardoned-conviction-petition",
        order: 1,
        requirement: "required"
      },
      {
        componentId: "nd-seal-pardoned-conviction-proposed-order-2",
        designRole: "proposed_order",
        templateId: "nd-seal-pardoned-conviction-order",
        order: 2,
        requirement: "required"
      },
      {
        componentId: "nd-seal-pardoned-conviction-proof-of-service-3",
        designRole: "proof_of_service",
        templateId: "nd-seal-pardoned-conviction-proof-of-service",
        order: 3,
        requirement: "required"
      }
    ]),
    requiredInputs: [
      ...CHAPTER_INPUTS,
      { key: "sealPardonDate", label: "On what date was the pardon granted?", required: true },
      {
        key: "sealPardonUnconditional",
        label:
          "Does your certificate of pardon describe the pardon as unconditional, or does it set terms and conditions? Answer unconditional or conditional.",
        required: true
      },
      {
        key: "sealPardonCoversConviction",
        label:
          "Does the pardon cover the conviction you are asking the court to seal? Answer yes or no.",
        required: true
      }
    ],
    assembledPacketName: "nd-seal-pardoned-conviction",
    assembledPacketTitle: "North Dakota sealing packet — pardoned conviction, N.D.C.C. § 12-60.1-02(1)(c)",
    customerDeliverableDescription: `Petition to seal a pardoned conviction under N.D.C.C. § 12-60.1-02(1)(c), with the mandatory proposed order and a declaration of service on the prosecuting attorney. This ground carries no look-back of its own, and a pardon does not lift the chapter-level bars. ${CHAPTER_TAIL}`,
    notes:
      "A conditional pardon stops the route, because § 12-55.1-01(2) defines it as one subject to terms the governor set and § 12-60.1-02(1)(c) reaches an unconditional pardon. A pardon covering a different conviction stops as well."
  }),

  northDakotaTrack({
    trackId: "nd-dui-record-seal",
    publicName: "Ask a North Dakota court to seal a DUI record",
    mechanism: "seal_impaired_driving_record_under_39_08_01_6",
    authority: "N.D.C.C. § 39-08-01.6",
    packetSet: packetSet("nd-dui-record-seal", [
      {
        componentId: "nd-dui-record-seal-primary-filing-1",
        designRole: "primary_filing",
        templateId: "nd-dui-record-seal-petition",
        order: 1,
        requirement: "required"
      },
      {
        componentId: "nd-dui-record-seal-proposed-order-2",
        designRole: "proposed_order",
        templateId: "nd-dui-record-seal-order",
        order: 2,
        requirement: "conditional"
      }
    ]),
    requiredInputs: [
      {
        key: "duiFirstViolationDate",
        label:
          "On what date did your first impaired-driving violation occur? The seven years run from this date, not from the conviction and not from the end of the sentence.",
        required: true
      },
      { key: "duiCaseNumber", label: "What is the case number?", required: true },
      {
        key: "duiCourtType",
        label: "Was the case in district court or municipal court? Answer district or municipal.",
        required: true
      },
      { key: "duiCounty", label: "Which North Dakota county or municipality?", required: true },
      {
        key: "duiConvictionType",
        label:
          "Did you plead guilty, plead no contest, or were you found guilty? Answer guilty plea, no contest, or found guilty.",
        required: true
      },
      {
        key: "duiChargedUnder",
        label:
          "Were you charged under the state statute or under a city ordinance? Answer statute or ordinance.",
        required: true
      },
      {
        key: "duiOrdinanceCitation",
        label:
          "If it was a city ordinance, which ordinance? Asked where you report an ordinance charge, because § 39-08-01.6(1) reaches an equivalent ordinance and the equivalence has to be shown from its text.",
        required: false
      },
      {
        key: "duiSubsequentDui",
        label:
          "Have you had any further impaired-driving violation within seven years of that first one? Answer yes or no.",
        required: true
      },
      {
        key: "duiOtherOffence",
        label:
          "Have you committed any other criminal offence within that seven-year period? Answer yes or no. The clean period covers any criminal offence, not only impaired driving.",
        required: true
      },
      {
        key: "duiCommercialLicence",
        label:
          "Have you ever held a commercial driver's licence, now or in the past? Answer yes or no. Section 39-08-01.6(2) excludes a commercial driver and the exclusion is not limited to a current licence.",
        required: true
      }
    ],
    assembledPacketName: "nd-seal-dui-record",
    assembledPacketTitle: "North Dakota sealing packet — impaired-driving record, N.D.C.C. § 39-08-01.6",
    customerDeliverableDescription:
      "Petition to seal an impaired-driving record under N.D.C.C. § 39-08-01.6, with a proposed order lodged by analogy to Chapter 12-60.1 practice rather than because the section requires one. Expungement is not available for a DUI record in North Dakota: this is the § 12.1-32-07.2(2) restricted-access seal, and a prosecutor keeps access to the prior offence for enhancement under § 39-08-01(3). Both facts are on the face of the petition. No fee amount is printed because the section states none.",
    notes:
      "Section 39-08-01.6(1) says the court shall seal and states no motion trigger, so the petition is never represented as statutorily mandated. The seven-year clean period covers any criminal offence, which is the part of the ground most often misread."
  }),

  northDakotaTrack({
    trackId: "nd-marijuana-first-offense-seal",
    publicName: "Ask a North Dakota court to seal a first marijuana possession conviction",
    mechanism: "seal_first_marijuana_or_thc_possession_under_19_03_1_23_9",
    authority: "N.D.C.C. § 19-03.1-23(9)",
    packetSet: packetSet("nd-marijuana-first-offense-seal", [
      {
        componentId: "nd-marijuana-first-offense-seal-primary-filing-1",
        designRole: "primary_filing",
        templateId: "nd-marijuana-first-offense-seal-motion",
        order: 1,
        requirement: "required"
      },
      {
        componentId: "nd-marijuana-first-offense-seal-proposed-order-2",
        designRole: "proposed_order",
        templateId: "nd-marijuana-first-offense-seal-order",
        order: 2,
        requirement: "conditional"
      }
    ]),
    requiredInputs: [
      {
        key: "mjJudgmentDate",
        label: "On what date did the court enter the judgment of guilt?",
        required: true
      },
      { key: "mjOffenceDate", label: "On what date did the offence occur?", required: true },
      {
        key: "mjSubstance",
        label:
          "Was the charge marijuana or tetrahydrocannabinol? Answer marijuana or THC. Each carries its own threshold.",
        required: true
      },
      {
        key: "mjQuantity",
        label:
          "What quantity was charged? Take it off the charging document and give it in the unit charged — ounces for marijuana, grams for THC. The threshold is one ounce or two grams.",
        required: true
      },
      {
        key: "mjFirstOffence",
        label: "Was this your first offence of this kind? Answer yes or no. It is an element.",
        required: true
      },
      {
        key: "mjSubsequentConviction",
        label:
          "Have you been convicted of any further violation of North Dakota's controlled substances chapter since, and if so when? If none, answer no.",
        required: true
      },
      {
        key: "mjOtherCharges",
        label:
          "Were there any other charges in the same case besides the marijuana or THC possession? If none, answer no. The subsection reaches only that conviction.",
        required: true
      },
      { key: "mjCaseNumber", label: "What is the case number?", required: true },
      { key: "mjCounty", label: "Which North Dakota county?", required: true },
      {
        key: "mjCourtType",
        label: "Was the case in district court or municipal court? Answer district or municipal.",
        required: true
      }
    ],
    assembledPacketName: "nd-seal-first-marijuana-conviction",
    assembledPacketTitle:
      "North Dakota sealing packet — first marijuana or THC possession, N.D.C.C. § 19-03.1-23(9)",
    customerDeliverableDescription:
      "Motion to seal the court record of a first marijuana or THC possession conviction under N.D.C.C. § 19-03.1-23(9), with a proposed order lodged by analogy to Chapter 12-60.1 practice rather than because the subsection requires one. Relief is mandatory once the elements are met and the seal is irreversible — once sealed the record may not be opened even by order of the court — and the motion says both. No fee amount is printed because none is identified.",
    notes:
      "The two-year anchor is a genuine textual ambiguity and is not computed: any further controlled-substance conviction stops the route instead. The quantity is taken in the unit the subsection uses and is never converted."
  })
];
