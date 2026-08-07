// South Carolina record clearing — custom-pleading implementation.
//
// Eleven assigned solicitor-office routes. Each carries one custom-pleading
// primary filing; five of them additionally carry a custom-pleading attestation
// request. Sixteen components in all. The other forty-four components the design
// assigns to these tracks are process_guidance and belong to the guidance lane.
//
// One determination shapes every document in this module, and it is not this
// job's to make: it is recorded at
// data/record-clearing/production-factory/legal-design-decisions/
// sc-solicitor-route-participant-deliverable-resolution.json and applied to
// SC.memo.json by the completed memo correction.
//
// **The participant deliverable is an application to the Solicitor's Office, and
// never the solicitor's order.** Section 17-22-930 requires the applicant to
// obtain the appropriate blank expungement order form from the solicitor's
// office in the judicial circuit where the charge originated and makes the use
// of that form mandatory and to the exclusion of all other expungement forms.
// Section 17-22-940(B)(1) makes assisting the applicant to complete that form
// the office's own statutory duty. Section 17-22-940(E)(3) forbids any official
// allowing the applicant to take possession of the application during the
// process. So SCCA 223A1, SCCA 223C and the analogous prescribed order
// instruments are solicitor and court documents. Nothing in this module
// generates one, prefills one, or portrays anything it generates as the
// applicant's filing of one. Every solicitor, attestor, clerk and judicial field
// stays where the statute puts it: outside the generated package.
//
// SCCA 223E is not reached by this module at all. It is the one participant
// facing official form in South Carolina and it lives only on the qualifying
// unfingerprinted § 17-22-950(B) branch of sc_17_22_950_summary, which is a
// composed route and not a solicitor route. The verifier asserts that the string
// never appears here.
//
// Four further boundaries, each a place a generated packet could quietly claim
// work it did not do:
//
//   - **Eligibility is not asserted.** Section 17-22-940(E) requires SLED to
//     verify and document statutory eligibility before anyone signs. No document
//     here says the applicant qualifies, computes a waiting period, or elects a
//     statutory lane. The applicant's dates and classifications are recited as
//     the applicant's own, taken from the record, and left for SLED and the
//     solicitor to check.
//   - **The record is not said to be destroyed everywhere.** Section 17-1-40(C)
//     preserves sealed retentions for three years and one hundred twenty days,
//     and indefinitely for stated purposes; several routes additionally leave a
//     nonpublic SLED record, and § 56-5-750(F) leaves one at the Department of
//     Motor Vehicles as well. Every application discloses that.
//   - **No fee amount appears that the design does not establish for the route.**
//     The § 17-22-940(G) single-incident figure is an open release blocker: the
//     statute as amended in 2018 says one two hundred fifty dollar fee, the
//     controlling review reports one hundred fifty. Every application quotes the
//     statutory figure, records the conflict, and promises neither.
//   - **No venue is invented.** The applicant names a county. The judicial
//     circuit that county lies in is a lookup the adopted design does not
//     supply, so no circuit number is printed anywhere; the package addresses the
//     Solicitor's Office for the circuit serving the named county and tells the
//     applicant to confirm which one that is. An answer naming more than one
//     county stops rather than guessing.
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
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT SUBMIT UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referral destinations
// ---------------------------------------------------------------------------

/** Where a stop that needs individual legal advice sends the applicant. */
export const SC_REFERRAL =
  "South Carolina Legal Services on 1-888-346-5592, or the South Carolina Bar Lawyer Referral Service on 1-800-868-2284.";

/** Where a stop about this route's own process sends the applicant. */
export const SC_SOLICITOR_REFERRAL =
  "The Solicitor's Office for the judicial circuit in which the offence was committed, which is the office that supplies the blank expungement order form under S.C. Code § 17-22-930 and decides how the application is handled.";

/** Where a stop that needs the record itself sends the applicant. */
export const SC_SLED_REFERRAL =
  "The South Carolina Law Enforcement Division, for your own criminal history record, and the clerk of the court that handled the case, for the docket and the sentencing paperwork.";

/** Where a summary-court non-conviction belongs instead of a solicitor route. */
export const SC_SUMMARY_COURT_ROUTE_REFERRAL =
  "LegalEase's own South Carolina routing: a summary court non-conviction is reached under S.C. Code § 17-22-950, which costs nothing, rather than by a solicitor application carrying an administrative fee.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class SouthCarolinaEligibilityStopError extends Error {
  readonly code = "south_carolina_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "SouthCarolinaEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class SouthCarolinaBranchError extends Error {
  readonly code = "south_carolina_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "SouthCarolinaBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/**
 * The eleven assigned solicitor-office routes.
 *
 * Held as a closed list so a track this job was not assigned cannot be derived
 * for by passing its identifier, and so the verifier has one place to check the
 * assignment against. `sc_17_22_950_summary` is deliberately absent: it is the
 * composed summary-court route and it carries SCCA 223E, which belongs to no
 * solicitor route and to no part of this job.
 */
export const SC_ASSIGNED_TRACK_IDS: readonly string[] = [
  "sc_17_1_40_general_sessions",
  "sc_17_1_65_handgun",
  "sc_22_5_910",
  "sc_22_5_920_yoa",
  "sc_22_5_930_drug",
  "sc_34_11_90e_check",
  "sc_56_5_750f",
  "sc_aep",
  "sc_conditional_discharge_44_53_450",
  "sc_pti_17_22_150",
  "sc_tep"
];

/** The only two answers a yes-or-no screen accepts. No default, no coercion. */
export const SC_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/** The three court levels the design's own question offers. */
export const SC_COURT_LEVELS: Readonly<
  Record<string, "magistrate" | "municipal" | "general_sessions">
> = {
  magistrate: "magistrate",
  "magistrate court": "magistrate",
  municipal: "municipal",
  "municipal court": "municipal",
  "general sessions": "general_sessions",
  "general sessions court": "general_sessions",
  general_sessions: "general_sessions"
};

/** How each court level is named in a sentence. */
const SC_COURT_LEVEL_PHRASE: Readonly<Record<string, string>> = {
  magistrate: "magistrate court",
  municipal: "municipal court",
  general_sessions: "the Court of General Sessions"
};

/** The two branches of § 22-5-930 and the prescription-drug offence beside them. */
const DRUG_SIMPLE_POSSESSION =
  "simple possession of a controlled substance under Article 3 of Chapter 53, Title 44";
const DRUG_PRESCRIPTION =
  "unlawful possession of a prescription drug under S.C. Code § 40-43-86(EE)";
const DRUG_POSSESSION_WITH_INTENT =
  "possession with intent to distribute a controlled substance";

/**
 * The two branches of § 22-5-930 and the prescription-drug offence beside them.
 *
 * Both the spaced answer the question asks for and its underscored form are
 * keys, so a caller may pass either; the distinct values are three.
 */
export const SC_DRUG_OFFENCE_TYPES: Readonly<Record<string, string>> = {
  simple_possession: DRUG_SIMPLE_POSSESSION,
  "simple possession": DRUG_SIMPLE_POSSESSION,
  prescription_drug: DRUG_PRESCRIPTION,
  "prescription drug": DRUG_PRESCRIPTION,
  possession_with_intent: DRUG_POSSESSION_WITH_INTENT,
  "possession with intent": DRUG_POSSESSION_WITH_INTENT
};

/** Which lookback in § 22-5-930(D) a prior conditional discharge falls under. */
export const SC_SUBSTANCE_TYPES: Readonly<Record<string, string>> = {
  marijuana: "marijuana",
  other_controlled_substance: "a controlled substance other than marijuana",
  "other controlled substance": "a controlled substance other than marijuana"
};

/** Which part of § 56-5-750 the conviction was under. Only (B)(1) is in scope. */
const BLUE_LIGHT_B1 =
  "a first offence under S.C. Code § 56-5-750(B)(1), charged as a misdemeanour";
const BLUE_LIGHT_OTHER = "a subsection other than § 56-5-750(B)(1)";
const BLUE_LIGHT_UNSURE =
  "a part of the statute the applicant cannot identify from the record";

export const SC_BLUE_LIGHT_SUBSECTIONS: Readonly<Record<string, string>> = {
  b1_misdemeanor: BLUE_LIGHT_B1,
  "b1 misdemeanor": BLUE_LIGHT_B1,
  other_subsection: BLUE_LIGHT_OTHER,
  "other subsection": BLUE_LIGHT_OTHER,
  felony: "an offence charged as a felony",
  not_sure: BLUE_LIGHT_UNSURE,
  "not sure": BLUE_LIGHT_UNSURE
};

/** Whether the § 44-53-450(C) fee that precedes discharge was met. */
const DISCHARGE_FEE_WAIVED = "waived, reduced or suspended for indigency";
const DISCHARGE_FEE_UNPAID = "not paid";

export const SC_DISCHARGE_FEE_STATUS: Readonly<Record<string, string>> = {
  paid: "paid in full",
  waived_for_indigency: DISCHARGE_FEE_WAIVED,
  "waived for indigency": DISCHARGE_FEE_WAIVED,
  not_paid: DISCHARGE_FEE_UNPAID,
  "not paid": DISCHARGE_FEE_UNPAID
};

/**
 * Answer keys that would carry outside-party work into the package.
 *
 * Nothing in the adopted design declares any of them, so their presence means a
 * caller is trying to have LegalEase generate or prefill a solicitor
 * attestation, a clerk certification, a judicial finding or the prescribed order
 * itself. That is the one thing this determination forecloses, so it fails
 * closed rather than ignoring the key and rendering a document that looks
 * complete.
 */
export const SC_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "attestation",
  "attestationSignature",
  "attestorSignature",
  "clerkCertification",
  "expungementOrder",
  "judgeSignature",
  "judicialFinding",
  "judicialSignature",
  "orderFindings",
  "sccaOrder",
  "solicitorConsent",
  "solicitorFinding",
  "solicitorSignature"
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
 * possibly null at the line after the stop.
 */
function stop(
  stopId: string,
  trackId: string,
  reason: string,
  referral: string,
  nextStep: string
): never {
  throw new SouthCarolinaEligibilityStopError(stopId, trackId, reason, referral, nextStep);
}

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "sc-answer-missing",
      trackId,
      `The application needs an answer to ${key} before anything can be prepared, and none was given. An application that leaves a case fact blank is one the Solicitor's Office cannot act on.`,
      SC_SLED_REFERRAL,
      "Get your SLED criminal history record and the docket from the clerk of the court that handled the case, then answer the question from the record rather than from memory."
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
    throw new SouthCarolinaBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), SC_YES_NO);

/** Phrases a person uses when the answer to a "have you ever" question is no. */
const NONE_ANSWER =
  /^(no|none|nope|nil|n\/a|na|no\.|none\.|not any|never)\b|^(no|none)[, .]|(\bnone (of them|at all|pending|ever)\b)|(\bno (other |criminal )?(charges?|convictions?|expungements?) (are |is |have been )?(pending|outstanding)?\b)|(\bnothing (is )?pending\b)|(\bnever (had|applied)\b)/i;

const statesNone = (value: string): boolean => NONE_ANSWER.test(value.trim());

/** Phrases that mean the applicant cannot answer from the record. */
const UNKNOWN_ANSWER =
  /\b(don'?t know|do not know|not sure|unsure|no idea|unknown|can'?t remember|cannot remember|can'?t recall|cannot recall|not certain)\b/i;

/**
 * The bare county name, for a line that already prints the word "County".
 *
 * The design asks "In which South Carolina county was the offence committed?"
 * and a person asked for a county will as readily write "Richland County" as
 * "Richland". Concatenation would otherwise produce "Richland County County".
 */
function bareCountyName(raw: string): string {
  return raw.trim().replace(/\s+county$/i, "").trim() || raw.trim();
}

const MONTHS: Readonly<Record<string, number>> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};

/**
 * Parses the three date shapes the packet asks for, and nothing else.
 *
 * Deliberately narrow. A loose parser would turn "sometime in 2019" into a day
 * and a month nobody stated, and on the § 17-1-65 route a manufactured date
 * decides whether a person is inside a closing statutory window.
 */
function parseStatedDate(raw: string): { year: number; month: number; day: number } | null {
  const text = raw.trim();
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  }
  const dmy = /\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/.exec(text);
  if (dmy && MONTHS[dmy[2].toLowerCase()]) {
    return { year: Number(dmy[3]), month: MONTHS[dmy[2].toLowerCase()], day: Number(dmy[1]) };
  }
  const mdy = /\b([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\b/.exec(text);
  if (mdy && MONTHS[mdy[1].toLowerCase()]) {
    return { year: Number(mdy[3]), month: MONTHS[mdy[1].toLowerCase()], day: Number(mdy[2]) };
  }
  return null;
}

/** True where the answer at least states a year, which is what a recital needs. */
const statesAYear = (raw: string): boolean => /\b(19|20)\d{2}\b/.test(raw);

/**
 * An answer to a "on what date" question that the route turns on.
 *
 * A year is enough for a recital the Solicitor's Office will check against the
 * record. An answer that states no year at all, or that says the applicant does
 * not know, is a stop rather than a blank line in a submitted application.
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
      `The application asks for ${what} and the answer given does not state one. This route turns on that date, and LegalEase will not submit an application to the Solicitor's Office with a date nobody has taken from the record.`,
      SC_SLED_REFERRAL,
      "Ask the clerk of the court that handled the case for the docket, the sentencing sheet or the completion paperwork, take the date from it, and answer again."
    );
  }
  return value;
}

/** Parses a stated money amount. Returns null where the answer states none. */
function parseAmount(raw: string): number | null {
  const match = /(?:\$\s*)?([\d][\d,]*(?:\.\d{1,2})?)/.exec(raw.replace(/\s+/g, " "));
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

/** Parses a stated small whole number, such as an age or a count. */
function parseCount(raw: string): number | null {
  const words: Readonly<Record<string, number>> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };
  const lowered = raw.trim().toLowerCase();
  for (const [word, value] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\b`).test(lowered)) return value;
  }
  const digits = /\b(\d{1,3})\b/.exec(lowered);
  return digits ? Number(digits[1]) : null;
}

// ---------------------------------------------------------------------------
// Screens shared by all eleven routes
// ---------------------------------------------------------------------------

/**
 * Refuses to build a package out of outside-party content.
 *
 * Run first, before any other screen, so that a caller passing a solicitor
 * attestation or a judicial finding gets a stop rather than a document.
 */
function refuseOutsidePartyContent(trackId: string, answers: Answers): void {
  const supplied = SC_OUTSIDE_PARTY_KEYS.filter((key) => str(answers, key).length > 0);
  if (supplied.length === 0) return;
  stop(
    "sc-outside-party-completion-refused",
    trackId,
    `Content was supplied for ${supplied.join(", ")}. Those belong to the Solicitor's Office, an attestor, the clerk of court or a circuit court judge. Section 17-22-930 puts the blank expungement order form in the solicitor's office's hands, § 17-22-940(B)(1) makes completing it that office's own duty, and LegalEase neither completes it nor fills any part of it in. Nothing outside this package's own request may be generated.`,
    SC_SOLICITOR_REFERRAL,
    "Take the application package to the Solicitor's Office and ask that office for the blank order form. That office completes it, obtains the signatures and files it."
  );
}

/**
 * Venue, which the applicant supplies and LegalEase never picks.
 *
 * Two answers are refused. One that names more than one county leaves the
 * circuit unresolved, and whether charges spread across circuits may travel on
 * one application is an open question the design does not settle. One that says
 * the applicant does not know leaves no destination at all.
 */
function resolveOffenceCounty(trackId: string, answers: Answers): string {
  const raw = need(trackId, answers, "offenseCounty");
  if (UNKNOWN_ANSWER.test(raw)) {
    stop(
      "sc-venue-not-established",
      trackId,
      "The county where the offence was committed has not been established. The application goes to the Solicitor's Office for the judicial circuit that county lies in, so without it there is no office to send anything to.",
      SC_SLED_REFERRAL,
      "The county is on the docket and on the SLED criminal history record. Get either one, read the county off it, and answer again."
    );
  }
  if (/[,;/]|\band\b|\bplus\b|\balso\b/i.test(raw)) {
    stop(
      "sc-multi-county-venue-unresolved",
      trackId,
      "More than one county has been named. Each application goes to the Solicitor's Office for the judicial circuit in which that offence was committed, and whether charges from different circuits can travel on one application is not settled: § 17-22-940(G) permits several charges on one order only where they arose from a single incident under § 17-1-40 or § 17-22-150(a), and it says nothing about circuits. LegalEase will not choose a circuit for you.",
      SC_SOLICITOR_REFERRAL,
      "Answer with the single county where this offence was committed and prepare that application first. Then ask that solicitor's office what to do about the charge in the other county, or ask a lawyer."
    );
  }
  return raw;
}

/** The court level, as a closed three-value branch the design's own question offers. */
function resolveCourtLevel(trackId: string, answers: Answers): "magistrate" | "municipal" | "general_sessions" {
  return branch(trackId, "courtLevel", need(trackId, answers, "courtLevel"), SC_COURT_LEVELS);
}

/**
 * A pending charge anywhere.
 *
 * Section 22-5-910(F) and § 22-5-930(D) allow a charge pending more than five
 * years, tolled for any time under a bench warrant for failure to appear. Whether
 * that tolerance is satisfied is a contested legal determination about a live
 * case, so every pending charge stops instead.
 */
function screenPendingCharges(trackId: string, answers: Answers): string {
  const raw = need(trackId, answers, "pendingCharges");
  if (!statesNone(raw)) {
    stop(
      "sc-pending-charge",
      trackId,
      "A criminal charge is pending. South Carolina bars an expungement while charges of any kind are pending, with a narrow tolerance for charges pending more than five years that is itself tolled for any time spent under a bench warrant for failure to appear. Whether that tolerance is met is a judgment about a live case, and LegalEase does not make it.",
      SC_REFERRAL,
      "Deal with the pending charge first, or ask a lawyer whether the five-year tolerance reaches your case before you spend an application on it."
    );
  }
  return raw;
}

/**
 * A prior South Carolina expungement.
 *
 * Every one of these sections is available once only, and § 17-22-940 carries
 * cross-route consequences the design does not reduce to a rule. Whether an
 * expungement already granted under one section bars an application under
 * another is exactly the sort of contested classification LegalEase may not make.
 */
function screenPriorExpungement(trackId: string, answers: Answers): string {
  const raw = need(trackId, answers, "priorExpungementUse");
  if (!statesNone(raw)) {
    stop(
      "sc-prior-expungement-cap",
      trackId,
      "A South Carolina record has been expunged before. Each of these sections may be used once only, and whether relief already granted under one section closes another is a question the statutes do not answer in one place. The solicitor's administrative fee is not refunded if the charge is later found ineligible, so this is not a question to answer by trying.",
      SC_SOLICITOR_REFERRAL,
      "Ask the Solicitor's Office for the circuit where this offence was committed whether the earlier expungement closes this route, or ask a lawyer, before you pay anything."
    );
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Fact derivation
// ---------------------------------------------------------------------------

type CommonFacts = {
  facts: Record<string, string>;
  countyName: string;
  courtLevel: "magistrate" | "municipal" | "general_sessions";
  multipleChargesFromOneIncident: boolean;
};

/**
 * The ten questions every one of the eleven routes asks, screened once.
 *
 * Every declared key is carried through under its own name, because
 * `resolvePacket` checks the declared keys against this bag. Derived sentences
 * live under separate keys, so no document can render a bare "no" on a line of
 * its own and leave a reader to guess what was asked.
 */
function deriveCommonFacts(trackId: string, answers: Answers): CommonFacts {
  refuseOutsidePartyContent(trackId, answers);

  const applicantName = need(trackId, answers, "applicantName");
  const dateOfBirth = need(trackId, answers, "dateOfBirth");
  const chargeIdentity = need(trackId, answers, "chargeIdentity");
  const offenseCounty = resolveOffenceCounty(trackId, answers);
  const courtLevel = resolveCourtLevel(trackId, answers);
  const arrestDate = need(trackId, answers, "arrestDate");
  const dispositionDetail = need(trackId, answers, "dispositionDetail");
  const singleIncidentCharges = need(trackId, answers, "singleIncidentCharges");
  const priorExpungementUse = screenPriorExpungement(trackId, answers);
  const pendingCharges = screenPendingCharges(trackId, answers);

  const countyName = bareCountyName(offenseCounty);
  const multiple = !statesNone(singleIncidentCharges);

  const facts: Record<string, string> = {
    // Declared keys, carried through exactly as declared.
    applicantName,
    dateOfBirth,
    chargeIdentity,
    offenseCounty,
    courtLevel,
    arrestDate,
    dispositionDetail,
    singleIncidentCharges,
    priorExpungementUse,
    pendingCharges,

    // Template placeholders.
    countyName,
    courtLevelStatement: `The applicant states that this case was handled in ${SC_COURT_LEVEL_PHRASE[courtLevel]}.`,
    singleIncidentStatement: multiple
      ? `The applicant states that more than one charge came out of this same incident, and lists them as follows. Nobody at LegalEase has checked whether they did arise from one incident, and this application does not decide it: ${singleIncidentCharges}`
      : "The applicant states that no other charge came out of this same incident.",
    priorExpungementStatement:
      "The applicant states that no South Carolina record has been expunged before under any statute.",
    pendingChargeStatement:
      "The applicant states that no criminal charge is pending anywhere.",
    packetCaseReference: `${countyName} County`
  };

  return { facts, countyName, courtLevel, multipleChargesFromOneIncident: multiple };
}

/**
 * Turns the applicant's answers into the fact bag the templates read.
 *
 * Fails closed on anything the adopted design treats as a stop, on anything that
 * would require deciding a contested classification, and on any attempt to
 * supply outside-party content.
 */
export function deriveSouthCarolinaFacts(
  trackId: string,
  answers: Answers
): Record<string, string> {
  if (!SC_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new SouthCarolinaBranchError(trackId, "trackId", trackId, SC_ASSIGNED_TRACK_IDS);
  }

  const common = deriveCommonFacts(trackId, answers);
  const facts = common.facts;

  switch (trackId) {
    case "sc_17_1_40_general_sessions": {
      // A summary court non-conviction is free and belongs on the § 17-22-950
      // route. Selling a $250 solicitor application to someone entitled to a
      // free one is the worst outcome available on this track.
      if (common.courtLevel !== "general_sessions") {
        stop(
          "sc-summary-court-non-conviction-routes-elsewhere",
          trackId,
          `This case was handled in ${SC_COURT_LEVEL_PHRASE[common.courtLevel]}, which is a summary court. A summary court non-conviction is reached under S.C. Code § 17-22-950 at no cost to the applicant, and § 17-1-40 runs through the Solicitor's Office. Preparing a solicitor application here would put an administrative fee in front of relief that is free.`,
          SC_SUMMARY_COURT_ROUTE_REFERRAL,
          "Use the South Carolina summary court route instead. If the docket shows the case went to General Sessions after all, answer the court question again from the docket."
        );
      }
      const pleaArrangement = yesNo(trackId, answers, "pleaArrangement");
      if (pleaArrangement) {
        stop(
          "sc-plea-arrangement-dismissal",
          trackId,
          "The charge was dismissed, discharged or nolle prossed as part of a plea arrangement under which the applicant pled guilty and was sentenced on other charges. Section 17-22-940(A)(1) makes that the exception to the § 17-1-40 fee exemption, so the $250 administrative fee applies, and whether the dismissal on this record was part of that arrangement is read off the plea paperwork rather than from recollection.",
          SC_REFERRAL,
          "Get the plea paperwork and the sentencing sheet from the clerk, and have a lawyer read them with you before you apply. The fee is not refunded if the charge is later found ineligible."
        );
      }
      const courtesySummons = yesNo(trackId, answers, "courtesySummons");
      facts.pleaArrangement = "no";
      facts.courtesySummons = courtesySummons ? "yes" : "no";
      facts.pleaArrangementStatement =
        "The applicant states that this charge was not dismissed, discharged or nolle prossed as part of a plea arrangement under which the applicant pled guilty and was sentenced on other charges.";
      facts.courtesySummonsStatement = courtesySummons
        ? "The applicant states that a courtesy summons was issued rather than an arrest being made. Section 17-1-40(B)(1) reaches a courtesy summons as well as an arrest."
        : "The applicant states that an arrest was made rather than a courtesy summons being issued.";
      break;
    }

    case "sc_pti_17_22_150": {
      const ptiCircuit = need(trackId, answers, "ptiCircuit");
      const ptiCompletionDate = needDatedAnswer(
        trackId,
        answers,
        "ptiCompletionDate",
        "sc-pti-completion-not-established",
        "the date Pretrial Intervention was successfully completed"
      );
      facts.ptiCircuit = ptiCircuit;
      facts.ptiCompletionDate = ptiCompletionDate;
      facts.programStatement = `The applicant states which judicial circuit's Pretrial Intervention programme was completed, and who the pretrial intervention officer was, as: ${ptiCircuit}`;
      facts.completionStatement = `The applicant states the date of successful completion of Pretrial Intervention as: ${ptiCompletionDate}`;
      facts.attestorNoticeStatement =
        "Section 17-22-940(D) requires the circuit pretrial intervention director to attest by signature on the application before either the solicitor or his designee and then the circuit court judge signs. That attestation has not been given. It is the director's own act and this package does not carry it.";
      break;
    }

    case "sc_aep": {
      const ageAtArrest = need(trackId, answers, "ageAtArrest");
      const age = parseCount(ageAtArrest);
      if (age === null) {
        stop(
          "sc-aep-age-not-established",
          trackId,
          "The applicant's age on the date of arrest has not been stated as a number. Section 17-22-520 confines the Alcohol Education Program to a person at least seventeen but under twenty-one at the time of arrest, so the route turns on it.",
          SC_SLED_REFERRAL,
          "Work the age out from the date of birth and the arrest date on the docket, and answer again with a number."
        );
      }
      if (age < 17 || age > 20) {
        stop(
          "sc-aep-age-outside-programme",
          trackId,
          `The applicant states an age of ${age} at the date of arrest. Section 17-22-520 confines the Alcohol Education Program to a person at least seventeen but under twenty-one at the time of arrest, so this route is not the one for this record.`,
          SC_REFERRAL,
          "Ask which South Carolina route reaches this charge instead. If the case was in fact disposed of through the programme despite the age, that is a question for the Solicitor's Office and for a lawyer, not for a generated application."
        );
      }
      if (yesNo(trackId, answers, "priorAlcoholOffense")) {
        stop(
          "sc-aep-prior-alcohol-offence",
          trackId,
          "The applicant states an earlier alcohol-related offence. Section 17-22-520 confines the programme to a person with no prior alcohol-related offence and no significant history of prior delinquency or criminal activity, so an earlier offence puts this record outside it.",
          SC_REFERRAL,
          "Ask a lawyer whether the earlier offence is one the section reaches before you apply. The administrative fee is not refunded if the charge is later found ineligible."
        );
      }
      const aepCompletionDate = needDatedAnswer(
        trackId,
        answers,
        "aepCompletionDate",
        "sc-aep-completion-not-established",
        "the date the Alcohol Education Program was successfully completed"
      );
      facts.ageAtArrest = ageAtArrest;
      facts.priorAlcoholOffense = "no";
      facts.aepCompletionDate = aepCompletionDate;
      facts.ageStatement = `The applicant states an age at the date of arrest of: ${ageAtArrest}`;
      facts.priorAlcoholStatement =
        "The applicant states that there was no alcohol-related offence before this one.";
      facts.completionStatement = `The applicant states the date of successful completion of the Alcohol Education Program, and the circuit that administered it, as: ${aepCompletionDate}`;
      facts.attestorNoticeStatement =
        "Section 17-22-940(D) names the alcohol education program director as the attestor for a § 17-22-530(A) expungement, attesting by signature on the application before either the solicitor or his designee and then the circuit court judge signs. That attestation has not been given. It is the director's own act and this package does not carry it.";
      break;
    }

    case "sc_tep": {
      if (yesNo(trackId, answers, "injuryOrDeath")) {
        stop(
          "sc-tep-injury-or-death",
          trackId,
          "The applicant states that the incident caused a death or a serious bodily injury. Section 17-22-310 bars participation in the Traffic Education Program where the offence resulted in death or serious bodily injury, so a completed programme cannot be the disposition of this record.",
          SC_REFERRAL,
          "Speak to a lawyer about what this record is and what reaches it. Do not send an application on this route."
        );
      }
      if (yesNo(trackId, answers, "subsequentViolation")) {
        stop(
          "sc-tep-subsequent-violation",
          trackId,
          "The applicant states another traffic ticket within six months of the ticket that put them in the programme. Section 17-22-330(D) requires termination from the programme in that case and the offence is reinstated, so there may be no noncriminal disposition to apply on.",
          SC_SOLICITOR_REFERRAL,
          "Ask the agency that administered the programme whether you were terminated and whether the offence was reinstated, and get their answer in writing before you apply."
        );
      }
      const tepCompletionDate = needDatedAnswer(
        trackId,
        answers,
        "tepCompletionDate",
        "sc-tep-completion-not-established",
        "the date the Traffic Education Program was successfully completed"
      );
      facts.injuryOrDeath = "no";
      facts.subsequentViolation = "no";
      facts.tepCompletionDate = tepCompletionDate;
      facts.injuryStatement =
        "The applicant states that the incident caused no death and no serious bodily injury to another person.";
      facts.subsequentViolationStatement =
        "The applicant states that no further traffic violation was received in the six months following the ticket that led to the programme.";
      facts.completionStatement = `The applicant states the date of successful completion of the Traffic Education Program, and the circuit or agency that administered it, as: ${tepCompletionDate}`;
      facts.attestorNoticeStatement =
        "Section 17-22-940(D) names the traffic education program director as the attestor for a § 17-22-330(A) expungement, attesting by signature on the application before either the solicitor or his designee and then the circuit court judge signs. That attestation has not been given. It is the director's own act and this package does not carry it.";
      break;
    }

    case "sc_conditional_discharge_44_53_450": {
      if (yesNo(trackId, answers, "priorDrugConviction")) {
        stop(
          "sc-conditional-discharge-prior-drug-conviction",
          trackId,
          "The applicant states an earlier drug conviction. Section 44-53-450(A) reaches only a person not previously convicted of an offence under Article 3 of Chapter 53, Title 44, or under any state or federal marijuana, stimulant, depressant or hallucinogenic drug statute. A single prior conviction defeats this route entirely.",
          SC_REFERRAL,
          "Ask a lawyer which South Carolina route, if any, reaches this record. Do not spend a nonrefundable administrative fee on this one."
        );
      }
      if (yesNo(trackId, answers, "priorConditionalDischarge")) {
        stop(
          "sc-conditional-discharge-once-only",
          trackId,
          "The applicant states an earlier conditional discharge under this section. Section 44-53-450(A) allows the discharge and dismissal only once with respect to any person, so a second one is outside the section.",
          SC_REFERRAL,
          "Ask a lawyer what the earlier discharge leaves available before you apply."
        );
      }
      const dischargeFeeStatus = branch(
        trackId,
        "dischargeFeePaid",
        need(trackId, answers, "dischargeFeePaid"),
        SC_DISCHARGE_FEE_STATUS
      );
      if (dischargeFeeStatus === SC_DISCHARGE_FEE_STATUS.not_paid) {
        stop(
          "sc-conditional-discharge-fee-unpaid",
          trackId,
          "The § 44-53-450(C) fee has not been paid. That fee is payable before discharge and dismissal, and it may be waived, reduced or suspended only in cases of indigency. Until it is met or waived there may be no discharge and dismissal for an expungement to run on, and this package will not state a fee position the record does not support.",
          SC_SOLICITOR_REFERRAL,
          "Ask the clerk of the court that handled the case what remains owing under § 44-53-450(C) and, if you cannot pay it, ask the court about the indigency waiver."
        );
      }
      const dischargeDate = needDatedAnswer(
        trackId,
        answers,
        "dischargeDate",
        "sc-conditional-discharge-date-not-established",
        "the date the court discharged the applicant and dismissed the proceedings"
      );
      facts.priorDrugConviction = "no";
      facts.priorConditionalDischarge = "no";
      facts.dischargeFeePaid = dischargeFeeStatus === SC_DISCHARGE_FEE_STATUS.paid ? "paid" : "waived_for_indigency";
      facts.dischargeDate = dischargeDate;
      facts.priorDrugStatement =
        "The applicant states no earlier conviction under Article 3 of Chapter 53, Title 44, and none under any state or federal statute relating to marijuana or to stimulant, depressant or hallucinogenic drugs.";
      facts.priorConditionalDischargeStatement =
        "The applicant states no earlier conditional discharge under S.C. Code § 44-53-450.";
      facts.dischargeFeeStatement = `The applicant states that the fee § 44-53-450(C) requires before discharge and dismissal was ${dischargeFeeStatus}.`;
      facts.completionStatement = `The applicant states the date on which the court discharged the applicant and dismissed the proceedings as: ${dischargeDate}`;
      facts.attestationConditionStatement =
        common.courtLevel === "general_sessions"
          ? "The applicant states that this matter was handled in the Court of General Sessions. Section 17-22-940(D) requires the summary court judge to attest where the matter was in summary court; whether an attestation is needed on a General Sessions conditional discharge is for the Solicitor's Office to say, and this request is sent only if that office says it is needed."
          : `The applicant states that this matter was handled in ${SC_COURT_LEVEL_PHRASE[common.courtLevel]}, which is a summary court, so § 17-22-940(D) requires the summary court judge to attest by signature on the application.`;
      facts.attestorNoticeStatement =
        "Section 17-22-940(D) requires the summary court judge to attest by signature on the application, where the matter was in summary court, before either the solicitor or his designee and then the circuit court judge signs. That attestation has not been given. It is the judge's own act and this package does not carry it.";
      break;
    }

    case "sc_34_11_90e_check": {
      const convictionDate = needDatedAnswer(
        trackId,
        answers,
        "convictionDate",
        "sc-check-conviction-date-not-established",
        "the date of conviction, counting a guilty plea, a plea of nolo contendere or a bail forfeiture"
      );
      const instrumentAmount = need(trackId, answers, "instrumentAmount");
      const amount = parseAmount(instrumentAmount);
      if (amount === null) {
        stop(
          "sc-check-amount-not-established",
          trackId,
          "The amount of the instrument has not been stated as a figure. A conviction under Chapter 11 of Title 34 is classified as a felony where the instrument drawn or uttered exceeds five thousand dollars, and § 34-11-90(e) does not reach a felony, so the amount decides whether this route exists at all.",
          SC_SLED_REFERRAL,
          "Ask the clerk of the court that handled the case for the docket or the warrant, read the amount off it, and answer again."
        );
      }
      if (amount > 5000) {
        stop(
          "sc-check-felony-threshold",
          trackId,
          "The instrument exceeds five thousand dollars, which classifies the conviction as a felony. Section 34-11-90(e) does not apply to any crime classified as a felony, so this route is closed on these facts.",
          SC_REFERRAL,
          "Ask a lawyer whether any South Carolina route reaches a felony fraudulent check conviction. Do not spend a nonrefundable administrative fee on this one."
        );
      }
      if (yesNo(trackId, answers, "convictionsSinceYear")) {
        stop(
          "sc-check-intervening-conviction",
          trackId,
          "The applicant states another conviction in the year following this one. Section 34-11-90(e) directs the court to issue the order only where the defendant has had no other conviction during the one-year period following the conviction, so an intervening conviction closes the route on these facts.",
          SC_REFERRAL,
          "Ask a lawyer what the intervening conviction leaves available. It may also be worth expunging that record first, if anything reaches it."
        );
      }
      const numberOfChecks = need(trackId, answers, "numberOfChecks");
      const checkCount = parseCount(numberOfChecks);
      if (checkCount !== null && checkCount > 1) {
        stop(
          "sc-check-multiple-instruments",
          trackId,
          `The applicant states ${checkCount} instruments. Each instrument drawn or uttered constitutes a separate offence under Chapter 11 of Title 34, and § 17-22-940(G) allows only one charge on an order except for charges from a single incident under § 17-1-40 or § 17-22-150(a), neither of which is this route. Several cheques therefore mean several applications, each with its own administrative fee, verification fee and clerk fee.`,
          SC_SOLICITOR_REFERRAL,
          "Ask the Solicitor's Office for the circuit where the offences were committed how it wants several instruments handled and what each application will cost, before you send anything."
        );
      }
      facts.convictionDate = convictionDate;
      facts.instrumentAmount = instrumentAmount;
      facts.convictionsSinceYear = "no";
      facts.numberOfChecks = numberOfChecks;
      facts.convictionDateStatement = `The applicant states the date of conviction, understanding that a guilty plea, a plea of nolo contendere and the forfeiting of bail each count as a conviction under this chapter, as: ${convictionDate}`;
      facts.instrumentAmountStatement = `The applicant states the amount of the instrument, taken from the record, as: ${instrumentAmount}`;
      facts.interveningConvictionStatement =
        "The applicant states no other conviction of any kind in the year following the conviction sought to be expunged.";
      facts.instrumentCountStatement = `The applicant states how many instruments were involved and how they were charged as: ${numberOfChecks}`;
      break;
    }

    case "sc_22_5_910": {
      const convictionDate = needDatedAnswer(
        trackId,
        answers,
        "convictionDate",
        "sc-22-5-910-conviction-date-not-established",
        "the date of conviction, counting a guilty plea, a plea of nolo contendere or the forfeiting of bail"
      );
      if (yesNo(trackId, answers, "motorVehicleOffense")) {
        stop(
          "sc-22-5-910-motor-vehicle-offence",
          trackId,
          "The offence involved the operation of a motor vehicle. Section 22-5-910(A) does not apply to an offence involving the operation of a motor vehicle, so this route is closed on these facts.",
          SC_REFERRAL,
          "Ask which South Carolina route reaches a driving-related record. Section 56-5-750(F) reaches one narrow failure-to-stop conviction and nothing else here does."
        );
      }
      if (yesNo(trackId, answers, "domesticViolenceThird")) {
        stop(
          "sc-22-5-910-domestic-violence",
          trackId,
          "The conviction was for domestic violence in the third degree. Section 22-5-910(B) reaches it after five years rather than three, and a domestic violence record carries consequences under state and federal law that a generated application cannot weigh.",
          SC_REFERRAL,
          "Speak to a lawyer about this record before applying. The five-year branch exists, but it is not one to walk into on a packet."
        );
      }
      const penaltyCeiling = need(trackId, answers, "penaltyCeiling");
      if (UNKNOWN_ANSWER.test(penaltyCeiling) || !/\d/.test(penaltyCeiling)) {
        stop(
          "sc-22-5-910-penalty-ceiling-not-established",
          trackId,
          "The statutory penalty for the offence has not been stated from the record. Eligibility under § 22-5-910(A) turns on the maximum penalty the law allowed for the offence, not on the sentence actually imposed, and LegalEase must not generate a penalty ceiling, an offence classification or a first-offence status that nobody has taken from the record.",
          SC_SLED_REFERRAL,
          "Ask the clerk of the court that handled the case for the sentencing sheet or judgment, read the maximum days and fine off it, and answer again."
        );
      }
      const firearmPossession = yesNo(trackId, answers, "firearmPossession");
      if (yesNo(trackId, answers, "convictionsSincePeriod")) {
        stop(
          "sc-22-5-910-intervening-conviction",
          trackId,
          "The applicant states another conviction, including an out-of-state conviction, since this one. Section 22-5-910(C) requires no other conviction during the applicable three-year or five-year period, so an intervening conviction closes the route on these facts.",
          SC_REFERRAL,
          "Ask a lawyer whether the later conviction falls inside the period and what it leaves available."
        );
      }
      if (yesNo(trackId, answers, "closelyConnectedOffenses")) {
        stop(
          "sc-same-incident-aggregation-unresolved",
          trackId,
          "The applicant states several offences sentenced at one proceeding that came out of the same incident. Section 22-5-910(E) treats closely connected offences sentenced at a single proceeding as one conviction for expungement purposes, while § 17-22-940(G) permits several charges on one order only under § 17-1-40 or § 17-22-150(a). Both were read at source and they are not obviously reconciled. This package will not promise a single application on this route.",
          SC_SOLICITOR_REFERRAL,
          "Ask the Solicitor's Office for the circuit where the offences were committed whether it will take these charges on one application and what it will charge, and get the answer before you send anything."
        );
      }
      const benchWarrantHistory = str(answers, "benchWarrantHistory");
      facts.convictionDate = convictionDate;
      facts.penaltyCeiling = penaltyCeiling;
      facts.motorVehicleOffense = "no";
      facts.domesticViolenceThird = "no";
      facts.firearmPossession = firearmPossession ? "yes" : "no";
      facts.convictionsSincePeriod = "no";
      facts.closelyConnectedOffenses = "no";
      facts.benchWarrantHistory = benchWarrantHistory;
      facts.convictionDateStatement = `The applicant states the date of conviction, understanding that a guilty plea, a plea of nolo contendere and the forfeiting of bail each count as a conviction under § 22-5-910(E), as: ${convictionDate}`;
      facts.penaltyCeilingStatement = `The applicant states the maximum penalty the law allowed for this offence, taken from the sentencing sheet or judgment rather than from the sentence actually received, as: ${penaltyCeiling}`;
      facts.branchStatement = firearmPossession
        ? "The applicant states that the conviction was a first offence of unlawful possession of a firearm or weapon. Section 22-5-910(A) reaches such a first offence where the penalty was not more than one year or a one thousand dollar fine, or both. Which limb of the subsection this record falls under is for SLED and the Solicitor's Office to determine from the penalty stated above."
        : "The applicant states that the conviction was not a first offence of unlawful possession of a firearm or weapon. Which limb of § 22-5-910(A) this record falls under is for SLED and the Solicitor's Office to determine from the penalty stated above.";
      facts.exclusionStatement =
        "The applicant states that the offence did not involve the operation of a motor vehicle and was not a conviction for domestic violence in the third degree.";
      facts.interveningConvictionStatement =
        "The applicant states no other conviction anywhere, including in another state, since this conviction.";
      facts.aggregationStatement =
        "The applicant states that no other offence came out of this same incident and was sentenced with it at one proceeding.";
      facts.attestorNoticeStatement =
        "Section 17-22-940(D) requires the summary court judge to attest by signature on the application for a § 22-5-910 expungement, before either the solicitor or his designee and then the circuit court judge signs. That attestation has not been given. It is the judge's own act and this package does not carry it.";
      break;
    }

    case "sc_22_5_920_yoa": {
      if (!yesNo(trackId, answers, "yoaSentenced")) {
        stop(
          "sc-yoa-sentence-not-recorded",
          trackId,
          "The sentencing paperwork does not record a sentence under the Youthful Offender Act. Section 22-5-920(B)(1) reaches only a defendant who was sentenced pursuant to Chapter 19 of Title 24, and being eligible for a youthful offender sentence is not the same as having received one. LegalEase will not state that a person eligible for that sentencing qualifies under § 22-5-920 without it.",
          SC_SLED_REFERRAL,
          "Ask the clerk of the General Sessions court that sentenced you for the sentencing sheet or judgment and check whether it records a Youthful Offender Act sentence. If it does, answer again; if it does not, this route is not the one."
        );
      }
      if (yesNo(trackId, answers, "excludedCategory")) {
        stop(
          "sc-yoa-excluded-category",
          trackId,
          "The offence involved driving, violence, a domestic relationship or an offence requiring registration. Section 22-5-920(B)(2) excludes an offence involving the operation of a motor vehicle, an offence classified as a violent crime in § 16-1-60, an offence in Chapter 25 of Title 16 except as § 16-25-30 otherwise provides, and any offence for which registration is required under the Sex Offender Registry Act.",
          SC_REFERRAL,
          "Have a lawyer read the sentencing sheet with you. Which of the four exclusions an offence falls in is a classification LegalEase does not make."
        );
      }
      const sentenceCompletionDate = needDatedAnswer(
        trackId,
        answers,
        "sentenceCompletionDate",
        "sc-yoa-completion-not-established",
        "the date the whole youthful offender sentence, including any probation and any parole, was completed"
      );
      if (yesNo(trackId, answers, "convictionsSinceCompletion")) {
        stop(
          "sc-yoa-intervening-conviction",
          trackId,
          "The applicant states a conviction while serving the sentence or in the five years since completing it. Section 22-5-920(B)(1) excepts only a conviction for driving under suspension and a conviction for disturbing schools under § 16-17-420 before 17 May 2018; whether a particular conviction is one of those two is a classification LegalEase does not make.",
          SC_REFERRAL,
          "Ask a lawyer whether the later conviction is one of the two the subsection excepts. If it is, the route may still be open; if it is not, it is closed."
        );
      }
      if (yesNo(trackId, answers, "closelyConnectedOffenses")) {
        stop(
          "sc-same-incident-aggregation-unresolved",
          trackId,
          "The applicant states several offences given youthful offender sentences at one proceeding that came out of the same incident. Section 22-5-920(A) treats them as one conviction for expungement purposes, while § 17-22-940(G) permits several charges on one order only under § 17-1-40 or § 17-22-150(a). Both were read at source and they are not obviously reconciled. This package will not promise a single application on this route.",
          SC_SOLICITOR_REFERRAL,
          "Ask the Solicitor's Office for the circuit where the offences were committed whether it will take these charges on one application and what it will charge, and get the answer before you send anything."
        );
      }
      facts.yoaSentenced = "yes";
      facts.excludedCategory = "no";
      facts.sentenceCompletionDate = sentenceCompletionDate;
      facts.convictionsSinceCompletion = "no";
      facts.closelyConnectedOffenses = "no";
      facts.yoaSentenceStatement =
        "The applicant states that the sentencing paperwork records a sentence under the Youthful Offender Act, Chapter 19 of Title 24, and not merely that the applicant was young enough to qualify for one.";
      facts.completionStatement = `The applicant states the date on which the whole youthful offender sentence, including any probation and any parole, was completed, as: ${sentenceCompletionDate}`;
      facts.exclusionStatement =
        "The applicant states that the offence did not involve the operation of a motor vehicle, was not a violent crime under § 16-1-60, was not an offence contained in Chapter 25 of Title 16, and was not an offence for which registration is required under the South Carolina Sex Offender Registry Act.";
      facts.interveningConvictionStatement =
        "The applicant states no conviction anywhere, including in another state, either while serving the youthful offender sentence or in the five years since it was completed.";
      facts.aggregationStatement =
        "The applicant states that no other offence given a youthful offender sentence at the same proceeding came out of this same incident.";
      break;
    }

    case "sc_22_5_930_drug": {
      const drugOffence = branch(
        trackId,
        "drugOffenseType",
        need(trackId, answers, "drugOffenseType"),
        SC_DRUG_OFFENCE_TYPES
      );
      if (drugOffence === SC_DRUG_OFFENCE_TYPES.possession_with_intent) {
        stop(
          "sc-drug-possession-with-intent",
          trackId,
          "The conviction was for possession with intent to distribute. Section 22-5-930(B) reaches a first such offence only twenty years from completion of any sentence for a drug conviction or any felony conviction, and that is not a period to walk into on a generated application.",
          SC_REFERRAL,
          "Speak to a lawyer about the twenty-year branch. Bring the sentencing sheet and the completion dates for every drug and felony sentence you have served."
        );
      }
      const substance = branch(
        trackId,
        "substanceType",
        need(trackId, answers, "substanceType"),
        SC_SUBSTANCE_TYPES
      );
      const sentenceCompletionDate = needDatedAnswer(
        trackId,
        answers,
        "sentenceCompletionDate",
        "sc-drug-completion-not-established",
        "the date the whole sentence for this conviction, including any probation and any parole, was completed"
      );
      if (!yesNo(trackId, answers, "priorDrugOffense")) {
        stop(
          "sc-drug-not-a-first-offence",
          trackId,
          "The applicant states that this was not a first drug conviction of its kind. Both branches of § 22-5-930 reach a first offence only, and whether an earlier matter counts as one is a classification LegalEase does not make. The design's own warning is that not every drug conviction routes here.",
          SC_REFERRAL,
          "Get your SLED criminal history record and have a lawyer read it with you before you apply."
        );
      }
      const priorConditionalDischarge = need(trackId, answers, "priorConditionalDischarge");
      if (!statesNone(priorConditionalDischarge)) {
        stop(
          "sc-drug-conditional-discharge-lookback",
          trackId,
          "The applicant states an earlier conditional discharge. Section 22-5-930(D) bars this route where the person had a conditional discharge within the five years before the arrest on a simple possession of marijuana charge, or within the ten years before the arrest for any other controlled substance or an unlawful prescription drug charge. Both lookbacks run from the date of arrest rather than the date of conviction, and working out which applies is a classification LegalEase does not make.",
          SC_REFERRAL,
          "Get the date of the earlier conditional discharge and the date of the arrest on this charge, and have a lawyer measure the lookback before you apply."
        );
      }
      if (yesNo(trackId, answers, "convictionsSincePeriod")) {
        stop(
          "sc-drug-intervening-conviction",
          trackId,
          "The applicant states another conviction since the sentence was completed. Section 22-5-930(C) requires no other conviction, including an out-of-state conviction, during the applicable period, so an intervening conviction closes the route on these facts.",
          SC_REFERRAL,
          "Ask a lawyer whether the later conviction falls inside the period and what it leaves available."
        );
      }
      const priorFelonyForPwid = str(answers, "priorFelonyForPwid");
      facts.drugOffenseType =
        drugOffence === SC_DRUG_OFFENCE_TYPES.simple_possession ? "simple_possession" : "prescription_drug";
      facts.substanceType = substance === SC_SUBSTANCE_TYPES.marijuana ? "marijuana" : "other_controlled_substance";
      facts.sentenceCompletionDate = sentenceCompletionDate;
      facts.priorDrugOffense = "yes";
      facts.priorConditionalDischarge = priorConditionalDischarge;
      facts.convictionsSincePeriod = "no";
      facts.priorFelonyForPwid = priorFelonyForPwid;
      facts.offenceTypeStatement = `The applicant states that the conviction was for ${drugOffence}, which is within S.C. Code § 22-5-930(A).`;
      facts.substanceStatement = `The applicant states that the substance involved was ${substance}.`;
      facts.completionStatement = `The applicant states the date on which the whole sentence for this conviction, including any probation and any parole, was completed, as: ${sentenceCompletionDate}`;
      facts.firstOffenceStatement =
        "The applicant states that this was a first drug conviction of its kind. Whether the record bears that out is for SLED and the Solicitor's Office to determine.";
      facts.lookbackStatement =
        "The applicant states no earlier conditional discharge at any point before the arrest on this charge, so neither the five-year nor the ten-year lookback in § 22-5-930(D) is said to be engaged.";
      facts.interveningConvictionStatement =
        "The applicant states no other conviction anywhere since the sentence for this conviction was completed.";
      break;
    }

    case "sc_56_5_750f": {
      const offenseDate = needDatedAnswer(
        trackId,
        answers,
        "offenseDate",
        "sc-blue-light-offence-date-not-established",
        "the date the offence happened"
      );
      const subsection = branch(
        trackId,
        "subsectionCharged",
        need(trackId, answers, "subsectionCharged"),
        SC_BLUE_LIGHT_SUBSECTIONS
      );
      if (subsection !== SC_BLUE_LIGHT_SUBSECTIONS.b1_misdemeanor) {
        stop(
          "sc-blue-light-outside-subsection-b1",
          trackId,
          `The applicant states ${subsection}. Section 56-5-750(F) reaches a first offence under subsection (B)(1) and does not apply to any crime classified as a felony. Which part of the statute a conviction fell under, and whether it was a felony, are read off the sentencing sheet and are not classifications LegalEase makes.`,
          SC_SLED_REFERRAL,
          "Ask the clerk of the court that sentenced you for the sentencing sheet or judgment. If it shows a first offence under subsection (B)(1) charged as a misdemeanour, answer again; otherwise speak to a lawyer."
        );
      }
      if (yesNo(trackId, answers, "injuryOrDeath")) {
        stop(
          "sc-blue-light-injury-or-death",
          trackId,
          "The applicant states that the incident caused great bodily injury or death. Those facts sit outside subsection (B)(1) and put the conviction in the parts of § 56-5-750 that § 56-5-750(F) does not reach.",
          SC_REFERRAL,
          "Speak to a lawyer about what this record is before applying."
        );
      }
      const termsCompletionDate = needDatedAnswer(
        trackId,
        answers,
        "termsCompletionDate",
        "sc-blue-light-terms-not-established",
        "the date every term and condition of the sentence, including fines, restitution, community service and probation, was completed"
      );
      if (yesNo(trackId, answers, "convictionsSincePeriod")) {
        stop(
          "sc-blue-light-intervening-conviction",
          trackId,
          "The applicant states another conviction in the three years since the terms and conditions were completed. Section 56-5-750(F) directs the court to issue the order only where the person has had no other conviction during that period, so an intervening conviction closes the route on these facts.",
          SC_REFERRAL,
          "Ask a lawyer whether the later conviction falls inside the period and what it leaves available."
        );
      }
      if (!yesNo(trackId, answers, "firstOffenseStatus")) {
        stop(
          "sc-blue-light-not-a-first-offence",
          trackId,
          "The applicant states that this was not a first conviction under this statute. Section 56-5-750(F) reaches a first offence only, and no person has any rights under the section more than one time.",
          SC_REFERRAL,
          "Ask a lawyer whether anything reaches a later conviction under this statute."
        );
      }
      facts.offenseDate = offenseDate;
      facts.subsectionCharged = "b1_misdemeanor";
      facts.injuryOrDeath = "no";
      facts.termsCompletionDate = termsCompletionDate;
      facts.convictionsSincePeriod = "no";
      facts.firstOffenseStatus = "yes";
      facts.offenceDateStatement = `The applicant states the date the offence happened as: ${offenseDate}`;
      facts.subsectionStatement =
        "The applicant states, from the sentencing sheet, that the conviction was a first offence under S.C. Code § 56-5-750(B)(1), charged as a misdemeanour. The classification is taken from the record and is not one LegalEase has made.";
      facts.injuryStatement =
        "The applicant states that the incident caused no great bodily injury and no death.";
      facts.completionStatement = `The applicant states the date on which every term and condition of the sentence, including fines, restitution, community service and any probation, was completed, as: ${termsCompletionDate}`;
      facts.interveningConvictionStatement =
        "The applicant states no other conviction anywhere in the three years since those terms and conditions were completed.";
      facts.firstOffenceStatement =
        "The applicant states that this was a first conviction under this statute.";
      break;
    }

    case "sc_17_1_65_handgun": {
      const convictionDate = needDatedAnswer(
        trackId,
        answers,
        "convictionDate",
        "sc-handgun-conviction-date-not-established",
        "the date of the conviction for unlawful possession of a handgun"
      );
      const parsed = parseStatedDate(convictionDate);
      if (!parsed) {
        stop(
          "sc-handgun-conviction-date-not-established",
          trackId,
          "The date of conviction has not been stated in a form that can be read against the statutory window. Section 17-1-65 reaches only a conviction that occurred prior to the enactment of the South Carolina Constitutional Carry / Second Amendment Preservation Act of 2024 on 7 March 2024, so the date is a finding on the face of the order and cannot be taken from recollection.",
          SC_SLED_REFERRAL,
          "Ask the clerk of the General Sessions court that sentenced you for the sentencing sheet or judgment, and answer with the full date on it, for example 14 March 2019."
        );
      }
      const convictionOrdinal = parsed.year * 10000 + parsed.month * 100 + parsed.day;
      if (convictionOrdinal >= 20240307) {
        stop(
          "sc-handgun-conviction-outside-window",
          trackId,
          "The conviction is dated on or after 7 March 2024. Section 17-1-65 reaches only a conviction that occurred prior to the enactment of the 2024 Act on that date, so this record is outside the section.",
          SC_REFERRAL,
          "Ask a lawyer whether any other South Carolina route reaches this conviction. This one does not."
        );
      }
      if (!yesNo(trackId, answers, "convictionStatute")) {
        stop(
          "sc-handgun-statute-not-confirmed",
          trackId,
          "The sentencing paperwork does not show the conviction was under S.C. Code § 16-23-20. Section 17-1-65 reaches unlawful possession of a handgun as provided in § 16-23-20 and nothing else, and the section of conviction is a finding on the face of the order.",
          SC_SLED_REFERRAL,
          "Ask the clerk for the sentencing sheet or judgment and check which section it names. If it names § 16-23-20, answer again."
        );
      }
      if (yesNo(trackId, answers, "otherHandgunConvictions")) {
        stop(
          "sc-handgun-more-than-one-conviction",
          trackId,
          "The applicant states more than one conviction for unlawful possession of a handgun. Section 17-1-65 allows an application for one conviction, so which one and whether the section reaches the record at all are questions a generated application should not answer.",
          SC_REFERRAL,
          "Speak to a lawyer before you apply, and do it soon: the section's five-year application window closes on 7 March 2029."
        );
      }
      if (yesNo(trackId, answers, "priorHandgunApplication")) {
        stop(
          "sc-handgun-prior-application",
          trackId,
          "The applicant has applied before for expungement of a handgun possession conviction under § 17-1-65. The order form carries a finding that no previous application has been made, so a second application is outside the section.",
          SC_REFERRAL,
          "Ask a lawyer what the earlier application leaves available."
        );
      }
      facts.convictionDate = convictionDate;
      facts.convictionStatute = "yes";
      facts.priorHandgunApplication = "no";
      facts.otherHandgunConvictions = "no";
      facts.convictionDateStatement = `The applicant states the date of the conviction for unlawful possession of a handgun as: ${convictionDate}`;
      facts.convictionStatuteStatement =
        "The applicant states, from the sentencing paperwork, that the conviction was under S.C. Code § 16-23-20.";
      facts.priorApplicationStatement =
        "The applicant states that no previous application has been made for expungement of a handgun possession conviction under S.C. Code § 17-1-65, and that there is no other conviction for unlawful possession of a handgun.";
      break;
    }

    default:
      throw new SouthCarolinaBranchError(trackId, "trackId", trackId, SC_ASSIGNED_TRACK_IDS);
  }

  return facts;
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
 * The caption, which is an addressee block and not a court caption.
 *
 * Nothing in this module is filed in a court by the applicant. The package is
 * handed to the Solicitor's Office, so the header names that office and the
 * party block identifies the applicant rather than styling a cause.
 */
const ADDRESSEE_LINE =
  "TO THE SOLICITOR'S OFFICE FOR THE JUDICIAL CIRCUIT SERVING {{countyName}} COUNTY, SOUTH CAROLINA";

/**
 * Each caption cell is one whole phrase, never a pre-split fragment.
 *
 * `FlowWriter.captionRow` draws one left cell and one right cell per call and
 * wraps each inside its own column, so a row whose left cell wraps to two lines
 * pushes the *next* right entry down with it. Splitting "Application under" from
 * its citation across two entries therefore separates them by however many lines
 * the applicant's name happened to need. Kept as whole phrases, each cell wraps
 * inside itself and the two columns stay legible whatever the answers are.
 */
const CAPTION_LEFT: readonly string[] = [
  "Applicant: {{applicantName}}",
  "Date of birth: {{dateOfBirth}}",
  "SID number: ____________________",
  "",
  "This is the applicant's own application package. It is not the expungement order."
];

const CAPTION_RIGHT = (statute: string): readonly string[] => [
  `Application under ${statute}`,
  "County of offence: {{countyName}} County",
  "Solicitor file no.: ____________________"
];

/**
 * The request letter's own right column.
 *
 * A letter asking a director or a summary court judge for an attestation is not
 * an application and carries no solicitor file number, so it does not borrow the
 * application's caption.
 */
const CAPTION_RIGHT_REQUEST = (statute: string): readonly string[] => [
  `Route: ${statute}`,
  "County of offence: {{countyName}} County",
  "This letter asks for an attestation. It is not an application and nothing in it is to be signed by the recipient."
];

const PREAMBLE =
  "Prepared by LegalEase from the answers the applicant gave. LegalEase has not seen the applicant's records, has not decided whether the applicant qualifies, does not represent the applicant, has sent this to no one, and promises no result. Every statement of fact below is the applicant's own.";

/** What the package is. Route-specific only in which order form it names. */
function natureSection(orderFormSentence: string): Section {
  return {
    heading: "WHAT THIS PACKAGE IS, AND WHAT IT IS NOT",
    numbered: false,
    paragraphs: [
      "This is the applicant's own application to the Solicitor's Office. The applicant hands it in. It asks that office to process an expungement application on the record described below.",
      `It is not the expungement order. Section 17-22-930 requires a person applying to expunge a criminal record to obtain the appropriate blank expungement order form from the solicitor's office in the judicial circuit where the charge originated, and provides that the use of that form is mandatory and to the exclusion of all other expungement forms. ${orderFormSentence}`,
      "Completing that form is the Solicitor's Office's own work, not the applicant's and not LegalEase's. Section 17-22-940(B)(1) makes assisting the applicant to complete the expungement form that office's duty, and § 17-22-940(E)(3) provides that no official may allow the applicant to take possession of the application during the expungement process. Nothing in this package stands in place of the official form, and no part of this package is that form.",
      "No one outside LegalEase has acted on any of this. The Solicitor's Office has not accepted this application, has not consented to an expungement and has attested to nothing. No attestor has signed. No clerk has certified anything. No judge has signed anything. Every one of those steps is still ahead, and each of them belongs to someone other than the applicant.",
      "LegalEase does not represent the applicant and is not the applicant's lawyer. LegalEase has not sent this package to the Solicitor's Office or to anyone else, and does not promise that any office will act, or that any relief will follow."
    ]
  };
}

/** Eligibility is SLED's and the solicitor's. Identical on all eleven routes. */
const ELIGIBILITY_SECTION: Section = {
  heading: "WHO DECIDES WHETHER THIS RECORD CAN BE CLEARED",
  numbered: false,
  paragraphs: [
    "This package makes no statement about whether the applicant qualifies, and it must not be read as making one.",
    "Section 17-22-940(E) requires the South Carolina Law Enforcement Division to verify and document statutory eligibility before anyone signs. The solicitor or his designee then elects the statutory lane and signs, and a circuit court judge signs after that. Until SLED has verified, nothing has been decided by anybody.",
    "Everything the applicant states below is given so that the Solicitor's Office and SLED can check it against the record itself. No date here has been computed into a waiting period, no offence here has been placed in a statutory category, and no statutory lane has been elected. Those are the findings that go on the official form, and they are made by the people the statute puts them on.",
    "Section 17-22-940(I) records what happens if the solicitor or his designee does not consent: the applicant is left to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated help ends at that point."
  ]
};

/** The identity and record allegations every route makes. */
const COMMON_ALLEGATIONS: readonly string[] = [
  "The applicant gives their full legal name, and every other name they have been known by, as: {{applicantName}}",
  "The applicant's date of birth is {{dateOfBirth}}.",
  "The applicant gives the charge, and the warrant, ticket or indictment number, as: {{chargeIdentity}}",
  "The offence was committed in {{countyName}} County, South Carolina. This application is therefore made to the Solicitor's Office for the judicial circuit in which that county lies. Which circuit that is, is for the applicant to confirm with that office; this package does not name a circuit number.",
  "{{courtLevelStatement}}",
  "The applicant gives the date of arrest or service, and the arresting agency, as: {{arrestDate}}",
  "The applicant gives how the case ended, and when, as: {{dispositionDetail}}",
  "{{singleIncidentStatement}}",
  "{{priorExpungementStatement}}",
  "{{pendingChargeStatement}}"
];

/**
 * The retentions the statutes preserve.
 *
 * The adopted design's flat rule is that LegalEase must never generate the
 * statement that the record is destroyed everywhere. So this section is on every
 * application, and it is stated before anything is asked for rather than as a
 * footnote after.
 */
function retentionSection(extra: readonly string[]): Section {
  return {
    heading: "WHAT AN ORDER ON THIS ROUTE WOULD NOT REACH",
    numbered: false,
    paragraphs: [
      "A South Carolina expungement does not wipe the record from every place it exists, and nobody should tell the applicant that it does.",
      "Section 17-1-40(C) preserves sealed retentions. Law enforcement and prosecution agencies retain the arrest and booking record, associated bench warrants, mug shots and fingerprints under seal for three years and one hundred twenty days, and may retain them indefinitely under seal for the ongoing or future investigation and prosecution of the offence, for administrative hearings and for the defence of litigation. Detention and correctional facilities retain booking records and institutional files under seal for the same period. Unredacted incident and supplemental reports, investigative files and gathered evidence are preserved under seal as well.",
      ...extra,
      "An order made in South Carolina does not reach federal, out-of-state, military or tribal records and does not bind the agencies that hold them.",
      "Nothing in this package is advice about immigration, about firearm rights, or about any licensing consequence, and no statement here should be read as one."
    ]
  };
}

/** The fee section. Route-specific figures, one shared unresolved question. */
function feeSection(routeFees: readonly string[]): Section {
  return {
    heading: "FEES, AND ONE FIGURE THAT IS NOT SETTLED",
    numbered: false,
    paragraphs: [
      ...routeFees,
      "The single-incident figure is not settled and this package does not settle it. Section 17-22-940(G) as amended by 2018 Act No. 254 provides that where multiple charges from a single incident are combined under § 17-1-40 or § 17-22-150(a), only one two hundred fifty-dollar fee, one twenty-five dollar SLED verification fee and one thirty-five dollar clerk of court filing fee may be charged. The controlling legal review reports the single-incident solicitor fee as $150, taken from Supreme Court expungement guidance. The current statutory figure is $250. This package quotes the statutory figure and does not promise the lower one.",
      "Ask the Solicitor's Office what it will charge on this application before you send any payment. Fees are payable by separate certified checks or money orders; personal checks are not accepted, and a single combined instrument is a common cause of rejection.",
      "LegalEase does not collect, forward or handle any payment in this process, and no fee stated here is payable to LegalEase."
    ]
  };
}

/** What the package deliberately leaves blank, and whose work it is. */
function manualCompletionSection(extra: readonly string[]): Section {
  return {
    heading: "WHAT THIS PACKAGE LEAVES BLANK, AND WHO FILLS IT IN",
    numbered: false,
    paragraphs: [
      "Some of what a completed expungement needs is not the applicant's to write and none of it is LegalEase's. It is listed here so that nobody discovers it at the counter.",
      "The SID number. It comes off the SLED criminal history record. The line for it is at the head of this package and the applicant copies it across once the record is in hand.",
      "The official expungement order form itself. The Solicitor's Office supplies it blank under § 17-22-930 and assists in completing it under § 17-22-940(B)(1). The applicant signs it at that office, because § 17-22-940(E)(3) bars any official from letting the applicant take possession of the application during the process.",
      "The eligibility recital and the election of the statutory lane, which sit in the findings block of the official order form. SLED verifies and the solicitor elects. LegalEase must never assert eligibility before SLED has verified it, and nothing in this package does.",
      ...extra,
      "The solicitor's signature, the judicial signature and the judicial date. Those are the signatures of a prosecuting office and a court. They are not printed here in any form, blank or otherwise, and nothing in this package invites anyone to supply them."
    ]
  };
}

/** The supporting items the applicant obtains. LegalEase never sees any of them. */
function supportingSection(items: readonly string[]): Section {
  return {
    heading: "WHAT TO BRING WITH THIS PACKAGE",
    numbered: false,
    paragraphs: [
      "The applicant obtains each of these. LegalEase never receives, inspects or authenticates any of them, and none of them held up the preparation of this package.",
      ...items,
      "Check the answers in this package against those documents before you hand it in, and correct anything that disagrees. What the record says governs; what anyone remembers does not."
    ]
  };
}

/** The open questions the adopted design still carries, preserved rather than answered. */
function openQuestionSection(extra: readonly string[]): Section {
  return {
    heading: "QUESTIONS THIS PACKAGE DOES NOT ANSWER",
    numbered: false,
    paragraphs: [
      "Some things about South Carolina expungement are open. They are named here rather than papered over with an answer nobody has.",
      "The single-incident solicitor fee, set out above. The statute and the published guidance give different figures and this package quotes the statute.",
      "Whether charges from more than one judicial circuit can travel on one application. Section 17-22-940(G) speaks to charges from a single incident under § 17-1-40 and § 17-22-150(a) and says nothing about circuits. This package covers the county the applicant named and no other.",
      "Two bills of the 2025-2026 session. H.3730 would add § 17-22-915, creating a first-nonviolent-offence route and a drug treatment court route. H.428 would add § 34-11-90(f) for multiple fraudulent check convictions after ten years, and § 17-1-43 requiring destruction of arrest records made as a result of mistaken identity within one hundred and eighty days. Neither appears in the enacted text read at source on 6 August 2026, so neither is available and neither is offered here. Both are worth watching.",
      "How the programme routes and the conviction routes overlap where a person could have used more than one. Which application to spend, and in what order, is a counselling question the statutes do not answer.",
      ...extra
    ]
  };
}

/** Where automated help ends. Common boundaries plus the route's own. */
function stopSection(extra: readonly string[]): Section {
  return {
    heading: "WHERE THIS PACKAGE STOPS",
    numbered: false,
    paragraphs: [
      "LegalEase prepares documents from what the applicant says. It does not give legal advice, does not look at any record, does not speak to any office and does not appear anywhere. Some parts of this matter are outside what a prepared package can do, and they are named here rather than left to be found out later.",
      "Anything SLED has not yet verified. Section 17-22-940(E) puts verification before every signature, and nobody may be told they qualify before that.",
      "The solicitor or his designee declining to consent. Section 17-22-940(I) then leaves the applicant to retained counsel and a circuit court determination, and automated help ends there.",
      "Any felony, any violent crime under § 16-1-60, any domestic violence matter and any offence requiring sex offender registration.",
      "Any pending charge, any trafficking facts, any juvenile matter and any immigration question.",
      "Federal, out-of-state, military and tribal records, which a South Carolina order does not reach.",
      "Charges from more than one South Carolina judicial circuit. Each circuit's solicitor takes its own application.",
      ...extra,
      `Where any of these applies, speak to a lawyer before applying. ${SC_REFERRAL}`
    ]
  };
}

const APPLICATION_VERIFICATION =
  "I am the applicant. I have read this package and the statements in it are mine and are true to the best of my knowledge. I understand that no one at LegalEase has seen my records, checked whether I qualify, or given me legal advice; that this package is not the expungement order and that the Solicitor's Office supplies and completes that form; and that whether this record can be cleared is for SLED, the Solicitor's Office and the court to decide.";

const APPLICATION_SIGNATURE_BLOCK: readonly string[] = [
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Email: _____________________________________",
  "Date: ______________________________________",
  "",
  "Sign this package by hand. Signing it is not signing the official expungement order form: that form comes from the Solicitor's Office and is signed there, because § 17-22-940(E)(3) bars any official from letting you take the application away during the process.",
  "The Uniform Expungement of Criminal Records Act states no notarization requirement for the applicant's signature, so no notarial block is printed here. If the Solicitor's Office asks for a notarized signature, sign in front of a notary rather than beforehand."
];

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

type ApplicationSpec = {
  templateId: string;
  statute: string;
  title: string;
  orderFormSentence: string;
  authorityParagraphs: readonly string[];
  routeAllegations: readonly string[];
  aggregationParagraphs: readonly string[];
  extraSections: readonly Section[];
  routeFees: readonly string[];
  retentionExtra: readonly string[];
  manualCompletionExtra: readonly string[];
  supportingItems: readonly string[];
  openQuestionExtra: readonly string[];
  extraStops: readonly string[];
  requestParagraph: string;
};

/**
 * The applicant's application package.
 *
 * One numbered section only. The shared renderer restarts numbering at 1 in
 * every numbered section, so a second one would produce two paragraphs numbered
 * "1." in a single document.
 */
function applicationTemplate(spec: ApplicationSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: ADDRESSEE_LINE,
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: CAPTION_RIGHT(spec.statute)
    },
    title: spec.title,
    preamble: PREAMBLE,
    sections: [
      natureSection(spec.orderFormSentence),
      {
        heading: "THE ROUTE THIS APPLICATION IS MADE ON",
        numbered: false,
        paragraphs: spec.authorityParagraphs
      },
      ELIGIBILITY_SECTION,
      {
        heading: "THE APPLICANT AND THE RECORD, AS THE APPLICANT STATES THEM",
        numbered: true,
        paragraphs: [...COMMON_ALLEGATIONS, ...spec.routeAllegations]
      },
      {
        heading: "HOW MANY CHARGES THIS APPLICATION COVERS",
        numbered: false,
        paragraphs: spec.aggregationParagraphs
      },
      ...spec.extraSections,
      supportingSection(spec.supportingItems),
      feeSection(spec.routeFees),
      manualCompletionSection(spec.manualCompletionExtra),
      retentionSection(spec.retentionExtra),
      openQuestionSection(spec.openQuestionExtra),
      stopSection(spec.extraStops)
    ],
    prayer: [
      spec.requestParagraph,
      "The applicant asks the Solicitor's Office to supply the blank expungement order form § 17-22-930 requires, and to assist in completing it as § 17-22-940(B)(1) provides.",
      "The applicant asks that office to say what it will charge on this application, and how it wants the fee instruments made out, before any payment is sent.",
      "Nothing in this package reports a decision by anybody. It asks. No office has accepted it, agreed to it, attested to anything in it or approved anything, and the applicant is making no claim about what any office will do."
    ],
    verification: APPLICATION_VERIFICATION,
    signatureLabel: "Applicant",
    signatureBlock: APPLICATION_SIGNATURE_BLOCK
  };
}

type AttestationSpec = {
  templateId: string;
  addresseeLine: string;
  statute: string;
  title: string;
  attestorName: string;
  whatIsAsked: string;
  conditionParagraphs: readonly string[];
  routeAllegations: readonly string[];
};

/**
 * The request the applicant sends to the attestor § 17-22-940(D) names.
 *
 * It is correspondence, not an instrument. It carries no attestation block, no
 * attestor signature rule and nothing for the attestor to sign, because the
 * attestation § 17-22-940(D) requires is given by signature on the official
 * application at the Solicitor's Office. Printing a block here would invite an
 * attestation onto a document that is not the one the statute means.
 */
function attestationRequestTemplate(spec: AttestationSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: spec.addresseeLine,
      partyBlockLeft: [
        "From: {{applicantName}}",
        "Date of birth: {{dateOfBirth}}",
        "",
        "Request for the attestation S.C. Code § 17-22-940(D) requires."
      ],
      partyBlockRight: CAPTION_RIGHT_REQUEST(spec.statute)
    },
    title: spec.title,
    preamble:
      "Prepared by LegalEase from the answers the applicant gave, for the applicant to send. LegalEase has not sent it, has not spoken to the recipient, and holds nothing from the recipient. Every statement of fact below is the applicant's own.",
    sections: [
      {
        heading: "WHAT IS BEING ASKED, AND WHAT IS NOT",
        numbered: false,
        paragraphs: [
          `The applicant asks ${spec.attestorName} to give the attestation S.C. Code § 17-22-940(D) requires. ${spec.whatIsAsked}`,
          "Nothing is enclosed here to be signed. The attestation § 17-22-940(D) requires is given by signature on the expungement application itself, and that application is the official form the Solicitor's Office supplies under § 17-22-930 and completes under § 17-22-940(B)(1). This letter carries no attestation block and no signature line for the recipient, because the attestation does not belong on a document LegalEase generated.",
          "The applicant is not asking the recipient to decide whether this record can be cleared. Section 17-22-940(E) puts verification of statutory eligibility on the South Carolina Law Enforcement Division and the election of the statutory lane on the solicitor, and a circuit court judge signs after them.",
          "LegalEase prepared this letter and does not represent the applicant. It has sent nothing, holds no reply, and makes no claim about what the recipient will do."
        ]
      },
      ...(spec.conditionParagraphs.length > 0
        ? [
            {
              heading: "WHEN THIS REQUEST IS SENT",
              numbered: false,
              paragraphs: spec.conditionParagraphs
            } as Section
          ]
        : []),
      {
        heading: "THE CASE THIS REQUEST CONCERNS, AS THE APPLICANT STATES IT",
        numbered: true,
        paragraphs: [
          "The applicant gives their full legal name, and every other name they have been known by, as: {{applicantName}}",
          "The applicant's date of birth is {{dateOfBirth}}.",
          "The applicant gives the charge, and the warrant, ticket or indictment number, as: {{chargeIdentity}}",
          "The offence was committed in {{countyName}} County, South Carolina.",
          "{{courtLevelStatement}}",
          "The applicant gives the date of arrest or service, and the arresting agency, as: {{arrestDate}}",
          "The applicant gives how the case ended, and when, as: {{dispositionDetail}}",
          ...spec.routeAllegations
        ]
      },
      {
        heading: "WHAT THE APPLICANT ASKS NEXT",
        numbered: false,
        paragraphs: [
          "If the recipient is willing to attest, the applicant asks to be told so, and asks to be told how the recipient prefers to be contacted by the Solicitor's Office when that office prepares the official form.",
          "If the recipient is not willing to attest, the applicant asks to be told that plainly. Section 17-22-940(D) makes the attestation a step before either the solicitor or his designee and then the circuit court judge signs, so an application that cannot obtain it is one to reconsider before any fee is paid.",
          `If any part of this is contested, or if the recipient's answer raises something the applicant did not expect, that is the point to speak to a lawyer. ${SC_REFERRAL}`
        ]
      }
    ],
    prayer: [
      "The applicant thanks the recipient for their time and asks for a reply in writing.",
      "This letter reports no attestation, no acceptance by any office, and no relief. It asks."
    ],
    verification:
      "I am the applicant named above. The case details in this request are mine and are true to the best of my knowledge. I understand that no one at LegalEase has seen my records or given me legal advice, and that whether the attestation is given is entirely the recipient's own decision.",
    signatureLabel: "Applicant",
    signatureBlock: [
      "Printed name: ______________________________",
      "Address: ___________________________________",
      "Telephone: _________________________________",
      "Email: _____________________________________",
      "Date: ______________________________________",
      "",
      "This block is the applicant's and the only one on this letter. No line is printed here for the recipient to complete."
    ]
  };
}

// ---------------------------------------------------------------------------
// Fragments shared by the eleven routes
// ---------------------------------------------------------------------------

const SCCA_223A1_SENTENCE =
  "On this route that form is SCCA 223A1 GS, Order for Destruction of Arrest Records, revised 04/2026 and seven pages long. It is an order signed by the solicitor and then by a circuit court judge. It is named here so the applicant knows what to ask that office for. It is not reproduced in this package in any state, blank or completed, and nothing here is a version of it.";

const SCCA_223C_SENTENCE =
  "On this route that form is SCCA 223C, revised 06/2024, Order for Destruction of Arrest Records under S.C. Code § 17-1-65. It is an order of the Court of General Sessions and it carries three findings the court makes. It is named here so the applicant knows what to ask that office for. It is not reproduced in this package in any state, blank or completed, and nothing here is a version of it.";

const BASE_SUPPORTING_ITEMS: readonly string[] = [
  "Your own criminal history record from the South Carolina Law Enforcement Division. It is the record the Solicitor's Office and SLED work from, and it is the only reliable way to see every charge and disposition before choosing which one to spend an application on. The SID number this package leaves blank comes off it.",
  "The docket from the clerk of the magistrate, municipal or General Sessions court that handled the case, and a certified disposition where that clerk can give you one. The docket carries the warrant or indictment number, the court level and the disposition date."
];

const AGGREGATION_PERMITTED: readonly string[] = [
  "Section 17-22-940(G) provides that each order may contain only one charge, except that multiple charges from a single incident may be combined on one application under § 17-1-40 or § 17-22-150(a). This route is one of those two, so combining is possible here where the charges did come out of one incident.",
  "Whether the charges listed above did arise from a single incident is for the Solicitor's Office to determine from the record. Nobody at LegalEase has decided it, and this package does not state that these charges may all travel on one application.",
  "The fee that follows from combining them is the figure that is not settled, set out under fees below."
];

const AGGREGATION_ONE_CHARGE: readonly string[] = [
  "Section 17-22-940(G) provides that each order may contain only one charge, except for multiple charges from a single incident combined under § 17-1-40 or § 17-22-150(a). This route is neither of those two, so this application covers the one charge described above.",
  "If more than one charge is to be cleared, each needs its own application, with its own administrative fee, its own verification fee where one applies, and its own clerk of court filing fee. Ask the Solicitor's Office to confirm that before sending anything, because the administrative fee is not refunded if a charge is later found ineligible."
];

const WAIVER_PARAGRAPH =
  "The solicitor may waive the $250 administrative fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Separately, each solicitor's office keeps a private donation account that may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).";

const STANDARD_FEES: readonly string[] = [
  "$250 solicitor administrative fee per individual order, § 17-22-940(A). It is not refunded even if the charge is later found ineligible.",
  "$25 SLED verification fee, § 17-22-940(E)(1). This route is not on the exemption list, so the verification fee applies.",
  "$35 clerk of court filing fee, § 17-22-940(F) and § 8-21-310(C)(4). The solicitor forwards it, and it is refunded if the charge is found statutorily ineligible.",
  WAIVER_PARAGRAPH
];

const MINOR_TRAFFIC_NOTE =
  "Section 17-22-940(E) provides that on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement.";

const SLED_VERIFICATION_STOP =
  "Any question about whether the waiting period on this route has run. This package records the applicant's dates and computes nothing from them. SLED verifies statutory eligibility and the Solicitor's Office elects the lane.";

/** The attestation the applicant must arrange, as a manual completion item. */
const attestationManualItem = (attestor: string): string =>
  `The attestation S.C. Code § 17-22-940(D) requires. It goes in the attestation block of the official order form and it is ${attestor}'s own signature, given before either the solicitor or his designee and then the circuit court judge signs. It is left blank here. This package carries a neutral letter asking for it, and nothing more.`;

const attestationStop = (attestor: string): string =>
  `${attestor} declining to attest, or being unable to. The attestation is that office's own act, LegalEase cannot obtain it and does not ask for it on the applicant's behalf, and an application that cannot obtain it is one to reconsider before any fee is paid.`;

// ---------------------------------------------------------------------------
// The eleven applications
// ---------------------------------------------------------------------------

const GENERAL_SESSIONS_APPLICATION = applicationTemplate({
  templateId: "sc_17_1_40_general_sessions-application",
  statute: "S.C. Code § 17-1-40",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO DESTROY THE ARREST RECORDS OF A GENERAL SESSIONS NON-CONVICTION, S.C. CODE § 17-1-40",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Section 17-1-40(B)(1) provides that where a person's record is expunged under Article 9 of Chapter 22 because the person was charged with a criminal offence, or issued a courtesy summons, and the charge was discharged, the proceedings were dismissed, or the person was found not guilty, the arrest and booking record, associated bench warrants, mug shots and fingerprints must be destroyed and no evidence of the record may be retained by any municipal, county or state agency.",
    "The route runs through the Solicitor's Office. Section 17-22-940(E) exempts it from SLED verification and § 17-22-940(E)(1) from the verification fee, and § 17-22-940(H) bars the clerk from charging a filing fee where the charge was discharged, dismissed, nolle prossed or the applicant was acquitted.",
    "This is usually the least expensive South Carolina route and often costs nothing at all. What it costs turns on one fact, set out under fees below."
  ],
  routeAllegations: ["{{courtesySummonsStatement}}", "{{pleaArrangementStatement}}"],
  aggregationParagraphs: AGGREGATION_PERMITTED,
  extraSections: [],
  routeFees: [
    "No $250 solicitor administrative fee on this route, unless the charge was dismissed, discharged or nolle prossed as part of the plea arrangement under which the applicant pled guilty and was sentenced on other charges, in which case the $250 applies. Section 17-22-940(A)(1). The applicant has stated above that no such arrangement was involved.",
    "No $25 SLED verification fee. Section 17-22-940(E)(1) exempts this route, and § 17-22-940(E) exempts it from SLED verification itself.",
    "No $35 clerk of court filing fee where the charge was discharged, dismissed, nolle prossed or the applicant was acquitted. Section 17-22-940(H).",
    "The § 17-22-940(A)(1) exemption is automatic rather than discretionary, and it is the operative relief on this route. " + WAIVER_PARAGRAPH
  ],
  retentionExtra: [
    "This route is the destruction provision itself, and the retentions above are part of it. They are the reason nobody may be told that the record is gone from every place it exists."
  ],
  manualCompletionExtra: [],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "The SLED record is recommended rather than required on this route, because § 17-22-940(E) does not require SLED verification for a § 17-1-40 expungement. Get it anyway: it is the only way to see everything that is on your record before you choose."
  ],
  openQuestionExtra: [],
  extraStops: [
    "A dismissal that was, or may have been, part of a plea arrangement. It changes the fee and it complicates the application, and it is read off the plea paperwork rather than from recollection.",
    "Several charges brought where only some were dismissed. The ones that were not dismissed do not travel on this route.",
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application for the destruction of the arrest records of the General Sessions non-conviction described above, under S.C. Code § 17-1-40."
});

const PTI_APPLICATION = applicationTemplate({
  templateId: "sc_pti_17_22_150-application",
  statute: "S.C. Code § 17-22-150(a)",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO DESTROY ARREST RECORDS AFTER SUCCESSFUL PRETRIAL INTERVENTION, S.C. CODE § 17-22-150(a)",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Section 17-22-150(a) provides that after successful completion of a pretrial intervention programme the solicitor effects a noncriminal disposition of the charge, and the person may apply to have the official record of the arrest destroyed. Violation of the programme resumes prosecution.",
    "Section 17-22-940(D) requires the circuit pretrial intervention director to attest by signature on the application to the eligibility of the charge for expungement, before either the solicitor or his designee and then the circuit court judge signs.",
    "Section 17-22-940(E) exempts this route from SLED verification and § 17-22-940(E)(1) from the verification fee, and § 17-22-940(G) makes it one of only two routes on which multiple charges from a single incident may be combined."
  ],
  routeAllegations: ["{{programStatement}}", "{{completionStatement}}", "{{attestorNoticeStatement}}"],
  aggregationParagraphs: AGGREGATION_PERMITTED,
  extraSections: [],
  routeFees: [
    "$250 solicitor administrative fee per individual order, § 17-22-940(A). It is not refunded even if the charge is later found ineligible.",
    "No SLED verification fee: § 17-22-940(E)(1) exempts this route by name.",
    "$35 clerk of court filing fee, § 17-22-940(F).",
    "The § 17-22-110 pretrial intervention application and participation fees were programme costs. They are not part of the expungement and nothing here asks for them again.",
    WAIVER_PARAGRAPH
  ],
  retentionExtra: [
    "Section 17-22-150(a) runs the destruction of the arrest record through § 17-1-40, so the sealed retentions above apply to this route in full."
  ],
  manualCompletionExtra: [attestationManualItem("the circuit pretrial intervention director")],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "Written confirmation from the Circuit Pretrial Intervention office that you successfully completed the programme, and the date you completed it. You will be dealing with that same office about the attestation, so ask for both at once."
  ],
  openQuestionExtra: [],
  extraStops: [
    "Pretrial Intervention that was not completed, or completion that is disputed. Violation of the programme resumes prosecution, and whether a programme was successfully completed is the programme office's record, not the applicant's recollection.",
    attestationStop("The Circuit Pretrial Intervention Director"),
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application for the destruction of the arrest records of the charge disposed of through Pretrial Intervention as described above, under S.C. Code § 17-22-150(a)."
});

const AEP_APPLICATION = applicationTemplate({
  templateId: "sc_aep-application",
  statute: "S.C. Code § 17-22-530(A)",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO DESTROY ARREST RECORDS AFTER SUCCESSFUL ALCOHOL EDUCATION PROGRAM COMPLETION, S.C. CODE § 17-22-530(A)",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Article 5 of Chapter 22, Title 17 is the Alcohol Education Program. Section 17-22-510 gives each circuit solicitor prosecutorial discretion to establish the programme, § 17-22-520 sets eligibility, and § 17-22-530 governs disposition on completion.",
    "Under § 17-22-530(A), when a person successfully completes an alcohol education programme the circuit solicitor shall effect a noncriminal disposition of the alcohol-related offence, and under § 17-22-530(B) the person may then apply for an order to destroy all official records relating to the arrest.",
    "Section 17-22-940(D) names the alcohol education program director as the attestor for a § 17-22-530(A) expungement, and § 17-22-940(E)(1) exempts the route from the SLED verification fee by name."
  ],
  routeAllegations: [
    "{{ageStatement}}",
    "{{priorAlcoholStatement}}",
    "{{completionStatement}}",
    "{{attestorNoticeStatement}}"
  ],
  aggregationParagraphs: AGGREGATION_ONE_CHARGE,
  extraSections: [],
  routeFees: [
    "$250 solicitor administrative fee per individual order, § 17-22-940(A). It is not refunded even if the charge is later found ineligible.",
    "No SLED verification fee: § 17-22-940(E)(1) exempts § 17-22-530(A) by name.",
    "$35 clerk of court filing fee, § 17-22-940(F).",
    "The § 17-22-550 programme enrolment fee of $250, and any provider fees, were programme costs and are separate from this application. Participation may not be denied for inability to pay, and those programme fees may be waived or reduced at the solicitor's discretion.",
    WAIVER_PARAGRAPH
  ],
  retentionExtra: [
    "Section 17-22-530(A) allows no record of the offence to be maintained except by the Commission on Prosecution Coordination, which keeps one to prevent a second use of the programme."
  ],
  manualCompletionExtra: [attestationManualItem("the alcohol education program director")],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "Written confirmation from the circuit solicitor's Alcohol Education Program office, or its contracted provider, that you successfully completed the programme, and the completion date. Ask for the attestation at the same time."
  ],
  openQuestionExtra: [],
  extraStops: [
    "Termination from the programme, or reinstatement of the offence. Either means there may be no noncriminal disposition for this application to run on.",
    "An offence that may be a driving under the influence offence under § 56-5-2930 or § 56-5-2933. Section 17-22-520(C)(11) expressly excludes those from the programme.",
    "An offence outside the eleven enumerated in § 17-22-520(C), unless the circuit solicitor determined it similar in nature and severity. That determination is the solicitor's, not the applicant's and not LegalEase's.",
    attestationStop("The Alcohol Education Program Director"),
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application for the destruction of all official records relating to the arrest on the alcohol-related offence disposed of through the Alcohol Education Program as described above, under S.C. Code § 17-22-530."
});

const TEP_APPLICATION = applicationTemplate({
  templateId: "sc_tep-application",
  statute: "S.C. Code § 17-22-330(A)",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO DESTROY ARREST RECORDS AFTER SUCCESSFUL TRAFFIC EDUCATION PROGRAM COMPLETION, S.C. CODE § 17-22-330(A)",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Article 3 of Chapter 22, Title 17 is the Traffic Education Program Act. Section 17-22-310 gives each circuit solicitor prosecutorial discretion to establish a programme for persons who commit traffic-related offences punishable only by a fine and the loss of four points or less, and bars participation where the offence resulted in death or serious bodily injury.",
    "Section 17-22-320 confines eligibility to a person with no significant history of traffic violations and allows participation once only. Section 17-22-330(A) provides that on successful completion the administering governmental agency shall effect a noncriminal disposition of the offence, with no record maintained except by the programme to prevent a second use.",
    "Section 17-22-940(D) names the traffic education program director as the attestor for a § 17-22-330(A) expungement, and § 17-22-940(E)(1) exempts the route from the SLED verification fee by name."
  ],
  routeAllegations: [
    "{{injuryStatement}}",
    "{{subsequentViolationStatement}}",
    "{{completionStatement}}",
    "{{attestorNoticeStatement}}"
  ],
  aggregationParagraphs: AGGREGATION_ONE_CHARGE,
  extraSections: [],
  routeFees: [
    "$250 solicitor administrative fee per individual order, § 17-22-940(A). It is not refunded even if the charge is later found ineligible.",
    "No SLED verification fee: § 17-22-940(E)(1) exempts § 17-22-330(A) by name.",
    "$35 clerk of court filing fee, § 17-22-940(F).",
    "The § 17-22-350 programme application fee of $140, which cannot be reduced or suspended, and the participation fee of up to $140, were programme costs and are separate from this application.",
    WAIVER_PARAGRAPH
  ],
  retentionExtra: [
    "Section 17-22-330(A) allows no record of the offence to be maintained except by the programme itself, which keeps one to prevent a second use of it."
  ],
  manualCompletionExtra: [attestationManualItem("the traffic education program director")],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "Written confirmation from the governmental agency that administered the programme — the circuit solicitor's office, or the county or municipality it contracted with — that you successfully completed the programme, and the completion date. Ask for the attestation at the same time."
  ],
  openQuestionExtra: [],
  extraStops: [
    "Termination from the programme for violating its conditions, or termination because of a further traffic violation within six months of the ticket. Either reinstates the offence.",
    "An offence not punishable only by a fine and the loss of four points or less, which is outside § 17-22-310.",
    attestationStop("The Traffic Education Program Director, or the county or municipal agency administering the programme"),
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application for the destruction of all official records relating to the traffic offence disposed of through the Traffic Education Program as described above, under S.C. Code § 17-22-330."
});

const CONDITIONAL_DISCHARGE_APPLICATION = applicationTemplate({
  templateId: "sc_conditional_discharge_44_53_450-application",
  statute: "S.C. Code § 44-53-450(B)",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO EXPUNGE RECORDS AFTER A FIRST-OFFENCE DRUG CONDITIONAL DISCHARGE, S.C. CODE § 44-53-450(B)",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Section 44-53-450(A) allows a person not previously convicted of an offence under Article 3 of Chapter 53, Title 44, or under any state or federal marijuana, stimulant, depressant or hallucinogenic drug statute, who pleads guilty to or is found guilty of possession of a controlled substance under § 44-53-370(c) or (d) or § 44-53-375(A), to be placed on probation without entry of a judgment of guilt, with the court discharging the person and dismissing the proceedings on fulfilment of the terms.",
    "Section 44-53-450(B) is the expungement. On dismissal and discharge the person may apply for an order expunging from all official records, other than the nonpublic record the section retains, all recordation relating to the arrest, indictment or information, trial, finding of guilt, and the dismissal and discharge. Where the court determines after hearing that the person was dismissed and discharged, it shall enter the order.",
    "Section 17-22-940(D) requires the summary court judge to attest where the matter was in summary court, and § 17-22-940(E) exempts the route from SLED verification and its fee."
  ],
  routeAllegations: [
    "{{priorDrugStatement}}",
    "{{priorConditionalDischargeStatement}}",
    "{{completionStatement}}",
    "{{dischargeFeeStatement}}",
    "{{attestationConditionStatement}}",
    "{{attestorNoticeStatement}}"
  ],
  aggregationParagraphs: AGGREGATION_ONE_CHARGE,
  extraSections: [
    {
      heading: "THE HEARING SECTION 44-53-450(B) PROVIDES FOR",
      numbered: false,
      paragraphs: [
        "Section 44-53-450(B) directs the court to enter the order where it determines after hearing that the person was dismissed and discharged. What the court is determining is a record fact: whether the discharge and dismissal happened. It is not a contested evidentiary showing the applicant has to build a case for.",
        "This package does not state that the determination will be made, and it does not state what any court will find."
      ]
    }
  ],
  routeFees: [
    "$250 solicitor administrative fee per individual order, § 17-22-940(A). It is not refunded even if the charge is later found ineligible.",
    "No SLED verification fee: § 17-22-940(E)(1) exempts this route by name.",
    "$35 clerk of court filing fee, § 17-22-940(F).",
    "Separately and earlier, § 44-53-450(C) required a fee of $350 in General Sessions court, or $150 in summary court, payable before discharge and dismissal and waivable, reducible or suspendable only in cases of indigency. That is a different fee from the single-incident figure discussed below, and it is not paid again here.",
    WAIVER_PARAGRAPH
  ],
  retentionExtra: [
    "Section 44-53-450(A) leaves a nonpublic record with the Department of Narcotic and Dangerous Drugs under SLED, kept solely to determine whether a later offence is a subsequent one, and § 44-53-450(B) expressly excludes that record from what the expungement order reaches."
  ],
  manualCompletionExtra: [
    attestationManualItem("the summary court judge, where the matter was in summary court")
  ],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "The order discharging you and dismissing the proceedings, from the clerk of the General Sessions or summary court that entered it. Section 44-53-450(B) makes the court's determination that you were dismissed and discharged the whole of the standard, so this is the document the order turns on."
  ],
  openQuestionExtra: [
    "How this route and S.C. Code § 22-5-930 interact for a person who has features of both. Section 22-5-930(A) expressly includes charges for which the person would now be eligible for a conditional discharge, while § 22-5-930(D) bars that route where the person actually had one within its lookback. Which route to use, and in what order, is a counselling question the statutes do not answer."
  ],
  extraStops: [
    "Any prior drug conviction. It defeats this route entirely, and whether an old matter counts as one is not a question to answer by trying.",
    "Terms and conditions that were not fulfilled, or an adjudication of guilt entered against the applicant.",
    "The § 44-53-450(C) fee left unpaid, since payment precedes discharge and dismissal.",
    attestationStop("The Summary Court Judge"),
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application to expunge the records of the arrest, indictment or information, trial, finding of guilt, and the dismissal and discharge described above, under S.C. Code § 44-53-450(B)."
});

const CHECK_APPLICATION = applicationTemplate({
  templateId: "sc_34_11_90e_check-application",
  statute: "S.C. Code § 34-11-90(e)",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO EXPUNGE A FIRST-OFFENCE FRAUDULENT CHECK CONVICTION, S.C. CODE § 34-11-90(e)",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Section 34-11-90(e) provides that after a conviction under the chapter on a first offence the defendant may, after one year from the date of the conviction, apply, or cause someone acting on their behalf to apply, for an order expunging the records of the arrest and conviction. The provision does not apply to any crime classified as a felony, and a conviction is classified as a felony where the instrument drawn or uttered exceeds five thousand dollars.",
    "Where the defendant has had no other conviction during the one-year period following the conviction, the section directs that the court shall issue the order. No person has any rights under the section more than one time. A guilty plea, a plea of nolo contendere and the forfeiting of bail each count as a conviction, and each instrument drawn or uttered constitutes a separate offence.",
    "This is the shortest waiting period of any South Carolina conviction route. This package records the applicant's dates and does not compute whether the year has run."
  ],
  routeAllegations: [
    "{{convictionDateStatement}}",
    "{{instrumentAmountStatement}}",
    "{{instrumentCountStatement}}",
    "{{interveningConvictionStatement}}"
  ],
  aggregationParagraphs: AGGREGATION_ONE_CHARGE,
  extraSections: [],
  routeFees: [...STANDARD_FEES, MINOR_TRAFFIC_NOTE],
  retentionExtra: [
    "Section 34-11-90(e) leaves SLED a nonpublic record of the offence and the date of the expungement, kept to prevent a second use. Section 34-11-95 and the Freedom of Information Act do not make it releasable except to authorised officials."
  ],
  manualCompletionExtra: [],
  supportingItems: [...BASE_SUPPORTING_ITEMS],
  openQuestionExtra: [
    "H.428 of the 2025-2026 session would add § 34-11-90(f), allowing expungement of multiple misdemeanour fraudulent check convictions received within a three-year period, ten years after the last of them, and would amend § 17-22-910 to add that route. Chapter 11 of Title 34 read at source on 6 August 2026 contains no subsection (f) and the section history ends at 2000 Act No. 257. The route is not available and is not offered here."
  ],
  extraStops: [
    "An instrument that exceeded five thousand dollars, which classifies the conviction as a felony and closes the route.",
    "Any conviction of any kind during the year following the conviction sought to be expunged.",
    "More than one cheque. Each instrument drawn or uttered is a separate offence, so each needs its own order and its own set of fees.",
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application to expunge the records of the arrest and conviction described above, under S.C. Code § 34-11-90(e)."
});

const LOW_LEVEL_CONVICTION_APPLICATION = applicationTemplate({
  templateId: "sc_22_5_910-application",
  statute: "S.C. Code § 22-5-910",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO EXPUNGE A FIRST LOW-LEVEL CONVICTION, S.C. CODE § 22-5-910",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Section 22-5-910(A) allows a defendant convicted of a crime carrying a penalty of not more than thirty days imprisonment or a one thousand dollar fine, or both, or a first offence for unlawful possession of a firearm or weapon carrying not more than one year or a one thousand dollar fine, or both, to apply after three years from the date of the conviction for an order expunging the records of the arrest and conviction and any associated bench warrant. The section does not apply to an offence involving the operation of a motor vehicle.",
    "Section 22-5-910(C) requires no other conviction, including an out-of-state conviction, during the applicable period. Section 22-5-910(E) provides that a guilty plea, a plea of nolo contendere and the forfeiting of bail each count as a conviction. Section 22-5-910(F) bars the relief while criminal charges of any kind are pending unless they have been pending more than five years, tolled for any time under a bench warrant for failure to appear, and allows the relief once only.",
    "Section 17-22-940(D) requires the summary court judge to attest, and § 17-22-940(E) requires SLED verification. Eligibility turns on the maximum penalty the law allowed for the offence and not on the sentence actually imposed; this package records what the applicant read off the record and computes nothing from it."
  ],
  routeAllegations: [
    "{{convictionDateStatement}}",
    "{{penaltyCeilingStatement}}",
    "{{branchStatement}}",
    "{{exclusionStatement}}",
    "{{interveningConvictionStatement}}",
    "{{aggregationStatement}}",
    "{{attestorNoticeStatement}}"
  ],
  aggregationParagraphs: AGGREGATION_ONE_CHARGE,
  extraSections: [],
  routeFees: [...STANDARD_FEES, MINOR_TRAFFIC_NOTE],
  retentionExtra: [
    "Section 22-5-910(D) leaves SLED a nonpublic record of the offence and the date of the expungement, kept to determine whether a later offence is a subsequent one."
  ],
  manualCompletionExtra: [
    attestationManualItem("the summary court judge"),
    "The statutory penalty ceiling and the offence classification, in the record block above. The applicant supplies them from the sentencing sheet, because LegalEase must not generate a penalty ceiling, an offence classification or a first-offence status that nobody has taken from the record."
  ],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "The sentencing sheet or judgment, from the clerk of the court that handled the case. The statutory penalty ceiling, and not the sentence actually received, is what decides eligibility under § 22-5-910(A), and it has to be taken from the record rather than from memory."
  ],
  openQuestionExtra: [
    "Whether the § 22-5-910(E) same-incident rule can be relied on in practice to bring several closely connected offences sentenced at one proceeding within a single application. Section 22-5-910(E) treats them as one conviction for expungement purposes, while § 17-22-940(G) restricts what may appear on one order to § 17-1-40 and § 17-22-150(a) matters. Both were read at source and they are not obviously reconciled. This package promises no single application on this route.",
    "How the § 22-5-910(F) tolling rule for charges pending more than five years applies in a given case. The subsection was read at source and its terms are set out above; whether they are met on a particular record is not a judgment made here."
  ],
  extraStops: [
    "Any offence involving the operation of a motor vehicle, which § 22-5-910(A) excludes.",
    "Any domestic violence matter. Section 22-5-910(B) reaches a third-degree conviction after five years, but a domestic violence record carries state and federal consequences a prepared package cannot weigh.",
    "A statutory penalty ceiling that cannot be established from the record.",
    "A conviction the applicant does not think of as one because bail was forfeited. Section 22-5-910(E) treats a bail forfeiture as a conviction.",
    "A section already used once. The relief is available one time only.",
    attestationStop("The Summary Court Judge"),
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application to expunge the records of the arrest and conviction, and any associated bench warrant, described above, under S.C. Code § 22-5-910."
});

const YOA_APPLICATION = applicationTemplate({
  templateId: "sc_22_5_920_yoa-application",
  statute: "S.C. Code § 22-5-920",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO EXPUNGE A FIRST-OFFENCE YOUTHFUL OFFENDER ACT CONVICTION, S.C. CODE § 22-5-920",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Section 22-5-920(B)(1) allows a defendant with a first offence conviction as a youthful offender, for which the defendant was sentenced pursuant to Chapter 19 of Title 24, the Youthful Offender Act, and who has not been convicted of any offence including an out-of-state offence while serving that sentence including probation and parole and for five years from the date of its completion, to apply for an order expunging the records of the arrest and conviction. A conviction for driving under suspension, and one for disturbing schools under § 16-17-420 before 17 May 2018, are excepted from the disqualifying set.",
    "Section 22-5-920(B)(2) excludes an offence involving the operation of a motor vehicle, an offence classified as a violent crime in § 16-1-60, an offence contained in Chapter 25 of Title 16 except as § 16-25-30 otherwise provides, and an offence for which registration is required under the Sex Offender Registry Act. Section 22-5-920(B)(3) makes the relief available once only.",
    "The section reaches a defendant who was sentenced under the Youthful Offender Act. Being eligible for such a sentence is not the same as having received one, and this package states only what the sentencing paperwork records."
  ],
  routeAllegations: [
    "{{yoaSentenceStatement}}",
    "{{completionStatement}}",
    "{{exclusionStatement}}",
    "{{interveningConvictionStatement}}",
    "{{aggregationStatement}}"
  ],
  aggregationParagraphs: AGGREGATION_ONE_CHARGE,
  extraSections: [],
  routeFees: [...STANDARD_FEES, MINOR_TRAFFIC_NOTE],
  retentionExtra: [],
  manualCompletionExtra: [
    "The statement that the applicant was sentenced under the Youthful Offender Act, in the record block above. The applicant supplies it from the sentencing sheet, because LegalEase must not state that a person eligible for youthful offender sentencing qualifies under § 22-5-920 without having been sentenced under it."
  ],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "The sentencing sheet or judgment, from the clerk of the General Sessions court that sentenced you, showing a sentence under the Youthful Offender Act, Chapter 19 of Title 24. Check the paperwork rather than your recollection: being eligible for that sentence is not the same as having received one.",
    "Where the sentence included probation or parole, written confirmation from the South Carolina Department of Probation, Parole and Pardon Services of the date supervision ended. The five-year clock runs from completion of the whole sentence, not from the conviction."
  ],
  openQuestionExtra: [
    "Whether the § 22-5-920(A) same-incident rule can be relied on to bring several closely connected offences sentenced at one proceeding within a single application. Section 17-22-940(G) restricts what may appear on one order to § 17-1-40 and § 17-22-150(a) matters, and the two provisions are not obviously reconciled. This package promises no single application on this route."
  ],
  extraStops: [
    "Sentencing paperwork that does not clearly record a Youthful Offender Act sentence.",
    "Any motor vehicle offence, any § 16-1-60 violent crime, any Chapter 25 of Title 16 offence, or any registration offence.",
    "Any conviction during the service of the sentence or the five years following it, other than the two the subsection excepts. Which conviction is which is a classification taken from the record, not made here.",
    "A section already used once. The relief is available one time only.",
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application to expunge the records of the arrest and conviction described above, under S.C. Code § 22-5-920."
});

const DRUG_APPLICATION = applicationTemplate({
  templateId: "sc_22_5_930_drug-application",
  statute: "S.C. Code § 22-5-930(A)",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO EXPUNGE A FIRST-OFFENCE DRUG CONVICTION, S.C. CODE § 22-5-930(A)",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Section 22-5-930(A) reaches a first offence conviction for simple possession of a controlled substance under Article 3 of Chapter 53, Title 44, or unlawful possession of a prescription drug under § 40-43-86(EE), including charges for which the person would now be eligible for a conditional discharge under § 44-53-450, and allows an application three years from the date of completion of the sentence including probation and parole, whether the conviction was in magistrates court or General Sessions court.",
    "Section 22-5-930(C) requires no other conviction, including an out-of-state conviction, during that period. Section 22-5-930(D) bars the relief while criminal charges of any kind are pending unless they have been pending more than five years, tolled for time under a bench warrant for failure to appear; allows the relief once only; and bars it where the person had a conditional discharge within the five years before the arrest on a simple possession of marijuana charge, or within the ten years before the arrest for any other controlled substance or a prescription drug charge. Both lookbacks run from the date of arrest.",
    "Section 22-5-930(B) reaches a first offence of possession with intent to distribute twenty years from completion of any sentence for a drug conviction or any felony conviction. That branch is not prepared here."
  ],
  routeAllegations: [
    "{{offenceTypeStatement}}",
    "{{substanceStatement}}",
    "{{completionStatement}}",
    "{{firstOffenceStatement}}",
    "{{lookbackStatement}}",
    "{{interveningConvictionStatement}}"
  ],
  aggregationParagraphs: AGGREGATION_ONE_CHARGE,
  extraSections: [
    {
      heading: "NOT EVERY DRUG CONVICTION COMES HERE",
      numbered: false,
      paragraphs: [
        "Section 22-5-930 has two branches and each reaches a defined set of offences. A drug conviction outside both of them does not route here at all, and this package makes no statement that all drug convictions do.",
        "The offence stated above is the applicant's own description, taken from the record. Whether it falls inside subsection (A) is for SLED and the Solicitor's Office to determine from the section as it now reads."
      ]
    }
  ],
  routeFees: [...STANDARD_FEES, MINOR_TRAFFIC_NOTE],
  retentionExtra: [
    "Section 22-5-930(E) requires SLED to keep a nonpublic record of the offence and the date of the expungement."
  ],
  manualCompletionExtra: [
    "The offence classification and the first-offence status, in the record block above. The applicant supplies them from the record, because LegalEase must not generate an offence classification or a first-offence status nobody has taken from it, and must not state that all drug convictions route to § 22-5-930."
  ],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "Where the sentence included probation or parole, written confirmation from the South Carolina Department of Probation, Parole and Pardon Services of the date supervision ended. The three-year clock runs from completion of the sentence including probation and parole, not from the conviction date."
  ],
  openQuestionExtra: [
    "How § 22-5-930(A) interacts with § 44-53-450(b) for a person who would now be eligible for a conditional discharge. Subsection (A) expressly includes such charges, while subsection (D) bars the route where the person actually had a conditional discharge within the lookback. Which route such a person should use, and in what order, is a counselling question the statute does not answer."
  ],
  extraStops: [
    "An offence that is not clearly within one of the two branches of § 22-5-930.",
    "Any prior conditional discharge, because the five-year and ten-year lookback bars turn on it and both are measured from the date of arrest.",
    "A possession-with-intent conviction, which carries a twenty-year clock and belongs with a lawyer rather than in a prepared application.",
    "A section already used once. The relief is available one time only.",
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application to expunge the records of the arrest and conviction described above, under S.C. Code § 22-5-930(A)."
});

const BLUE_LIGHT_APPLICATION = applicationTemplate({
  templateId: "sc_56_5_750f-application",
  statute: "S.C. Code § 56-5-750(F)",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO EXPUNGE A FIRST-OFFENCE FAILURE TO STOP FOR A BLUE LIGHT CONVICTION, S.C. CODE § 56-5-750(F)",
  orderFormSentence: SCCA_223A1_SENTENCE,
  authorityParagraphs: [
    "Section 56-5-750(F) provides that after a conviction pursuant to subsection (B)(1) for a first offence, the person may, after three years from the date of completion of all terms and conditions of the sentence, apply, or cause someone acting on their behalf to apply, for an order expunging the records of the arrest and conviction. The provision does not apply to any crime classified as a felony.",
    "Where the person has had no other conviction during the three-year period following completion of the terms and conditions, the section directs that the court shall issue the order. No person has any rights under the section more than one time.",
    "The 2025 amendment does not disturb this. Act No. 38 of 2025, effective 12 May 2026, reenacted subsection (A) unchanged, altered the subsection (B)(1) and (B)(2) penalties, added subsection (B)(3) and raised the subsection (C)(1) and (C)(2) penalties. It did not amend subsection (F), whose three-year first-offence expungement is unchanged."
  ],
  routeAllegations: [
    "{{offenceDateStatement}}",
    "{{subsectionStatement}}",
    "{{injuryStatement}}",
    "{{completionStatement}}",
    "{{interveningConvictionStatement}}",
    "{{firstOffenceStatement}}"
  ],
  aggregationParagraphs: AGGREGATION_ONE_CHARGE,
  extraSections: [],
  routeFees: [...STANDARD_FEES, MINOR_TRAFFIC_NOTE],
  retentionExtra: [
    "Section 56-5-750(F) leaves a nonpublic record with both SLED and the Department of Motor Vehicles, kept to prevent a second use and exempt from the Freedom of Information Act except to authorised officials. A driving record is not the same thing as a criminal history record, and clearing one is not clearing the other."
  ],
  manualCompletionExtra: [
    "The subsection of conviction and its felony or misdemeanour classification, in the record block above. Section 56-5-750(F) reaches only a first offence under subsection (B)(1) and excludes felonies, and the applicant supplies the classification from the sentencing sheet."
  ],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "The sentencing sheet, from the clerk of the court that sentenced you, which shows the subsection you were convicted under and whether it was a felony; and proof from that clerk, and from the supervising probation office where there was one, that fines, restitution and every other condition are satisfied. The three-year clock runs from the date the last of those was completed."
  ],
  openQuestionExtra: [],
  extraStops: [
    "A conviction that may be a felony, or that may be under a subsection other than (B)(1).",
    "An incident involving injury, death or a high-speed pursuit.",
    "A completion date for every term and condition that cannot be established from the record. On this route the clock runs from that date and it is usually later than the conviction.",
    "A section already used once. The relief is available one time only.",
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application to expunge the records of the arrest and conviction described above, under S.C. Code § 56-5-750(F)."
});

const HANDGUN_APPLICATION = applicationTemplate({
  templateId: "sc_17_1_65_handgun-application",
  statute: "S.C. Code § 17-1-65",
  title:
    "APPLICATION TO THE SOLICITOR'S OFFICE TO EXPUNGE AN OLD UNLAWFUL HANDGUN POSSESSION CONVICTION, S.C. CODE § 17-1-65",
  orderFormSentence: SCCA_223C_SENTENCE,
  authorityParagraphs: [
    "Section 17-1-65 provides that a person may apply for an expungement of one conviction for unlawful possession of a handgun as provided in § 16-23-20, if the conviction occurred prior to the enactment of the South Carolina Constitutional Carry / Second Amendment Preservation Act of 2024, and that an application under the section must be made within five years of the enactment of the section.",
    "The section was created by 2024 Act No. 111 (H.3594), § 20, effective 7 March 2024. That fixes both dates: the conviction must predate 7 March 2024, and the application must be made before 7 March 2029.",
    "Section 17-1-65 is not on the § 17-22-940(E)(1) exemption list, so SLED verifies statutory eligibility and the verification fee applies."
  ],
  routeAllegations: [
    "{{convictionDateStatement}}",
    "{{convictionStatuteStatement}}",
    "{{priorApplicationStatement}}"
  ],
  aggregationParagraphs: AGGREGATION_ONE_CHARGE,
  extraSections: [
    {
      heading: "THIS ROUTE CLOSES ON 7 MARCH 2029",
      numbered: false,
      paragraphs: [
        "Section 17-1-65 has no waiting period. It has a deadline instead. An application under the section must be made within five years of the section's enactment on 7 March 2024, which means before 7 March 2029.",
        "A person who misses that date loses this route permanently. It is stated here whether or not the applicant asked, and it is worth diarising: the Solicitor's Office has its own processing time, so leaving the application to the last weeks risks the deadline even where everything else is in order.",
        "Ask the Solicitor's Office how long it needs. If it cannot process the application in time, that is a reason to speak to a lawyer now rather than later."
      ]
    }
  ],
  routeFees: STANDARD_FEES,
  retentionExtra: [
    "SCCA 223C recites the § 17-1-40 sealed retentions and the § 22-5-910 nonpublic SLED retention on the face of the order, so the records that survive an order on this route are stated on the order the court signs."
  ],
  manualCompletionExtra: [
    "The three § 17-1-65 findings on SCCA 223C: that the conviction was under § 16-23-20 prior to the enactment of the Act on 7 March 2024, that the application is submitted prior to 7 March 2029, and that no previous application for expungement of a handgun possession conviction under § 17-1-65 has been made. They are findings made by the court on the order it signs. The applicant supplies the underlying dates from the record; nobody at LegalEase ticks them."
  ],
  supportingItems: [
    ...BASE_SUPPORTING_ITEMS,
    "The sentencing sheet or judgment, from the clerk of the General Sessions court that sentenced you. Check that it names S.C. Code § 16-23-20 and that the conviction date is before 7 March 2024. Both are findings the order requires and neither can be taken from recollection."
  ],
  openQuestionExtra: [],
  extraStops: [
    "A conviction dated on or after 7 March 2024, or one whose date cannot be established from the record.",
    "A conviction that may not have been under § 16-23-20.",
    "More than one handgun possession conviction. The section reaches one.",
    "Any earlier application under § 17-1-65.",
    "Any question about firearm rights. This route does not answer one, and an expungement is not a restoration of any right.",
    SLED_VERIFICATION_STOP
  ],
  requestParagraph:
    "The applicant asks the Solicitor's Office to accept and process this application to expunge the records of the conviction for unlawful possession of a handgun described above, under S.C. Code § 17-1-65, and to do so in time for the application to be submitted before 7 March 2029."
});

// ---------------------------------------------------------------------------
// The five attestation requests
// ---------------------------------------------------------------------------

const PTI_ATTESTATION_REQUEST = attestationRequestTemplate({
  templateId: "sc_pti_17_22_150-attestation-request",
  addresseeLine: "TO THE CIRCUIT PRETRIAL INTERVENTION DIRECTOR",
  statute: "S.C. Code § 17-22-150(a)",
  title: "REQUEST FOR THE ATTESTATION S.C. CODE § 17-22-940(D) REQUIRES",
  attestorName: "the circuit pretrial intervention director for the circuit that administered the programme",
  whatIsAsked:
    "Section 17-22-940(D) requires the circuit pretrial intervention director to attest by signature on the expungement application to the eligibility of the charge for expungement, before either the solicitor or his designee and then the circuit court judge signs.",
  conditionParagraphs: [],
  routeAllegations: ["{{programStatement}}", "{{completionStatement}}"]
});

const AEP_ATTESTATION_REQUEST = attestationRequestTemplate({
  templateId: "sc_aep-attestation-request",
  addresseeLine: "TO THE ALCOHOL EDUCATION PROGRAM DIRECTOR",
  statute: "S.C. Code § 17-22-530(A)",
  title: "REQUEST FOR THE ATTESTATION S.C. CODE § 17-22-940(D) REQUIRES",
  attestorName: "the alcohol education program director for the circuit that administered the programme",
  whatIsAsked:
    "Section 17-22-940(D) names the alcohol education program director as the attestor for a § 17-22-530(A) expungement, attesting by signature on the expungement application to the eligibility of the charge, before either the solicitor or his designee and then the circuit court judge signs.",
  conditionParagraphs: [],
  routeAllegations: ["{{ageStatement}}", "{{completionStatement}}"]
});

const TEP_ATTESTATION_REQUEST = attestationRequestTemplate({
  templateId: "sc_tep-attestation-request",
  addresseeLine: "TO THE TRAFFIC EDUCATION PROGRAM DIRECTOR",
  statute: "S.C. Code § 17-22-330(A)",
  title: "REQUEST FOR THE ATTESTATION S.C. CODE § 17-22-940(D) REQUIRES",
  attestorName:
    "the traffic education program director, or the county or municipal agency administering the programme under contract with the circuit solicitor",
  whatIsAsked:
    "Section 17-22-940(D) names the traffic education program director as the attestor for a § 17-22-330(A) expungement, attesting by signature on the expungement application to the eligibility of the charge, before either the solicitor or his designee and then the circuit court judge signs.",
  conditionParagraphs: [
    "Section 17-22-310 allows the circuit solicitor to contract with a county or a municipality to administer the programme. If a county or municipal agency ran the programme rather than the solicitor's own office, this letter goes to that agency.",
    "{{completionStatement}}"
  ],
  routeAllegations: ["{{subsequentViolationStatement}}", "{{injuryStatement}}"]
});

const LOW_LEVEL_ATTESTATION_REQUEST = attestationRequestTemplate({
  templateId: "sc_22_5_910-attestation-request",
  addresseeLine: "TO THE SUMMARY COURT JUDGE WHO HANDLED THIS CASE",
  statute: "S.C. Code § 22-5-910",
  title: "REQUEST FOR THE ATTESTATION S.C. CODE § 17-22-940(D) REQUIRES",
  attestorName: "the summary court judge who handled the case",
  whatIsAsked:
    "Section 17-22-940(D) requires the summary court judge to attest by signature on the expungement application to the eligibility of the charge for expungement on a § 22-5-910 route, before either the solicitor or his designee and then the circuit court judge signs.",
  conditionParagraphs: [],
  routeAllegations: ["{{convictionDateStatement}}", "{{penaltyCeilingStatement}}"]
});

const CONDITIONAL_DISCHARGE_ATTESTATION_REQUEST = attestationRequestTemplate({
  templateId: "sc_conditional_discharge_44_53_450-attestation-request",
  addresseeLine: "TO THE SUMMARY COURT JUDGE WHO ENTERED THE CONDITIONAL DISCHARGE",
  statute: "S.C. Code § 44-53-450(B)",
  title: "REQUEST FOR THE ATTESTATION S.C. CODE § 17-22-940(D) REQUIRES",
  attestorName: "the summary court judge who entered the conditional discharge",
  whatIsAsked:
    "Section 17-22-940(D) requires the summary court judge to attest by signature on the expungement application to the eligibility of the charge for expungement, before either the solicitor or his designee and then the circuit court judge signs.",
  conditionParagraphs: [
    "{{attestationConditionStatement}}",
    "If the Solicitor's Office says no attestation is needed because this matter was not in summary court, do not send this letter. Ask that office first."
  ],
  routeAllegations: ["{{completionStatement}}", "{{dischargeFeeStatement}}"]
});

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

function buildTemplates(): Record<string, PleadingTemplate> {
  const templates: Record<string, PleadingTemplate> = {};
  const all = [
    GENERAL_SESSIONS_APPLICATION,
    PTI_APPLICATION,
    PTI_ATTESTATION_REQUEST,
    AEP_APPLICATION,
    AEP_ATTESTATION_REQUEST,
    TEP_APPLICATION,
    TEP_ATTESTATION_REQUEST,
    CONDITIONAL_DISCHARGE_APPLICATION,
    CONDITIONAL_DISCHARGE_ATTESTATION_REQUEST,
    CHECK_APPLICATION,
    LOW_LEVEL_CONVICTION_APPLICATION,
    LOW_LEVEL_ATTESTATION_REQUEST,
    YOA_APPLICATION,
    DRUG_APPLICATION,
    BLUE_LIGHT_APPLICATION,
    HANDGUN_APPLICATION
  ];
  for (const template of all) templates[template.templateId] = template;
  return templates;
}

export const SOUTH_CAROLINA_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> =
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
 * own, so the design's two custom-pleading roles are mapped onto it here and the
 * mapping is asserted by the verifier rather than left implicit.
 *
 *   primary_filing      → primary_filing
 *       The applicant's own application package, handed to the Solicitor's
 *       Office. It is the applicant's operative document on the route, so it
 *       takes the engine's primary role.
 *
 *   attestation_request → notice
 *       Correspondence the applicant delivers to a third party the statute
 *       names — the pretrial intervention, alcohol education or traffic
 *       education director, or the summary court judge — alongside the
 *       application. `notice` is the engine's role for exactly that: a document
 *       a statute requires the participant to put in an outside party's hands
 *       beside the primary filing. It is not an `affidavit` (nobody swears to
 *       it), not a `proposed_order` (it orders nothing) and not a `continuation`
 *       (it is not signed with the application).
 *
 * The componentId is pinned exactly as the design assigns it. That is what
 * carries assignment fidelity; the role mapping only keeps the vocabularies
 * honest with each other.
 */
export const SC_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  attestation_request: "notice"
};

type ComponentSpec = {
  componentId: string;
  /** The role as the adopted legal design names it. Mapped on the way in. */
  designRole: keyof typeof SC_DESIGN_ROLE_TO_ENGINE_ROLE;
  templateId: string;
  order: number;
};

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  for (const spec of specs) {
    if (!SOUTH_CAROLINA_PLEADING_TEMPLATES[spec.templateId]) {
      throw new Error(
        `${spec.componentId}: no South Carolina template ${spec.templateId} is registered.`
      );
    }
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: SC_DESIGN_ROLE_TO_ENGINE_ROLE[spec.designRole],
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: spec.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: spec.order,
      approval: PENDING_APPROVAL,
      version: VERSION
    }))
  };
}

/**
 * The ten questions the design asks on every one of the eleven routes.
 *
 * `RequiredInput` carries only a key, a label and a required flag, so the
 * design's condition text — the reason a question is asked, and what a usable
 * answer looks like — is folded into the label. The keys are the design's and
 * are not renamed.
 */
const COMMON_INPUTS: readonly RequiredInput[] = [
  {
    key: "applicantName",
    label: "What is your full legal name, and every other name you have been known by?",
    required: true
  },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  {
    key: "chargeIdentity",
    label:
      "What was the charge, and what is the warrant, ticket or indictment number? Take it from the docket rather than from memory.",
    required: true
  },
  {
    key: "offenseCounty",
    label:
      "In which South Carolina county was the offence committed? Name one county. The application goes to the Solicitor's Office for the judicial circuit that county lies in, and a charge from another circuit needs its own application to that circuit.",
    required: true
  },
  {
    key: "courtLevel",
    label:
      "Was the case handled in magistrate court, municipal court or General Sessions court? Answer magistrate, municipal or general sessions.",
    required: true
  },
  {
    key: "arrestDate",
    label: "On what date were you arrested or served, and which agency arrested you?",
    required: true
  },
  { key: "dispositionDetail", label: "How did the case end, and on what date?", required: true },
  {
    key: "singleIncidentCharges",
    label:
      "Did more than one charge come out of this same incident? If so, list them all; if not, answer no.",
    required: true
  },
  {
    key: "priorExpungementUse",
    label:
      "Have you ever had a South Carolina record expunged before, under any statute? If not, answer no. Each of these sections is available once only.",
    required: true
  },
  {
    key: "pendingCharges",
    label:
      "Do you have any criminal charges pending anywhere right now, and if so since when? If none are pending, answer no.",
    required: true
  }
];

function southCarolinaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
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
    jurisdiction: "SC",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    // Not a court level, and deliberately. On every one of these routes the
    // participant's destination is a prosecuting office rather than a court: the
    // applicant applies to the solicitor, that office completes and files the
    // order, and the applicant files nothing. Naming a court here would describe
    // the wrong actor.
    courtLevel: "solicitors_office_in_the_judicial_circuit_where_the_offence_was_committed",
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

/** Said of every route, because it is true of every route. */
const SOLICITOR_TAIL =
  "The deliverable is the applicant's own application package directed to the Solicitor's Office, not the prescribed expungement order: § 17-22-930 puts the blank order form in that office's hands and § 17-22-940(B)(1) makes completing it that office's duty, so every solicitor, attestor, clerk and judicial field is left where the statute puts it. No eligibility is asserted, no waiting period is computed and no judicial circuit is named.";

export const SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  southCarolinaTrack({
    trackId: "sc_17_1_40_general_sessions",
    publicName: "Clear a South Carolina General Sessions charge that did not end in a conviction",
    mechanism: "solicitor_application_to_destroy_general_sessions_non_conviction_records",
    authority: "S.C. Code § 17-1-40",
    recordTypes: ["arrest", "charge"],
    dispositions: ["dismissed", "nolle_prossed", "acquitted", "discharged"],
    packetSet: packetSet("sc_17_1_40_general_sessions", [
      {
        componentId: "sc_17_1_40_general_sessions-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_17_1_40_general_sessions-application",
        order: 1
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "pleaArrangement",
        label:
          "Were these charges dropped as part of a deal in which you pleaded guilty to something else and were sentenced on it? Answer yes or no. It is the single most consequential fee fact in South Carolina.",
        required: true
      },
      {
        key: "courtesySummons",
        label:
          "Were you issued a courtesy summons rather than arrested? Answer yes or no. Section 17-1-40(B)(1) reaches both.",
        required: true
      }
    ],
    assembledPacketName: "sc-solicitor-application-general-sessions-non-conviction",
    assembledPacketTitle:
      "South Carolina solicitor application — General Sessions non-conviction, § 17-1-40",
    customerDeliverableDescription: `Application to the Solicitor's Office to destroy the arrest records of a General Sessions non-conviction under S.C. Code § 17-1-40. ${SOLICITOR_TAIL}`,
    notes:
      "A summary court non-conviction is free under § 17-22-950 and is stopped here rather than sold a solicitor application. A plea-arrangement dismissal is stopped because it changes the fee and is read off the plea paperwork."
  }),

  southCarolinaTrack({
    trackId: "sc_pti_17_22_150",
    publicName: "Clear a South Carolina charge after you completed Pretrial Intervention",
    mechanism: "solicitor_application_after_successful_pretrial_intervention",
    authority: "S.C. Code § 17-22-150(a)",
    recordTypes: ["arrest", "charge"],
    dispositions: ["pretrial_intervention_completed", "dismissed"],
    packetSet: packetSet("sc_pti_17_22_150", [
      {
        componentId: "sc_pti_17_22_150-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_pti_17_22_150-application",
        order: 1
      },
      {
        componentId: "sc_pti_17_22_150-attestation-request-3",
        designRole: "attestation_request",
        templateId: "sc_pti_17_22_150-attestation-request",
        order: 3
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "ptiCircuit",
        label:
          "Which judicial circuit's Pretrial Intervention programme did you complete, and who was your PTI officer? That office gives the attestation § 17-22-940(D) requires.",
        required: true
      },
      {
        key: "ptiCompletionDate",
        label:
          "On what date did you successfully complete Pretrial Intervention? Take it from the programme's completion letter.",
        required: true
      }
    ],
    assembledPacketName: "sc-solicitor-application-pretrial-intervention",
    assembledPacketTitle:
      "South Carolina solicitor application — after Pretrial Intervention, § 17-22-150(a)",
    customerDeliverableDescription: `Application to the Solicitor's Office to destroy arrest records after successful Pretrial Intervention under S.C. Code § 17-22-150(a), with a neutral letter asking the circuit pretrial intervention director for the attestation § 17-22-940(D) requires. ${SOLICITOR_TAIL}`,
    notes:
      "The attestation is the director's own act. LegalEase drafts the request, names the recipient and leaves the attestation to the official form the Solicitor's Office supplies."
  }),

  southCarolinaTrack({
    trackId: "sc_aep",
    publicName:
      "Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
    mechanism: "solicitor_application_after_alcohol_education_program_completion",
    authority: "S.C. Code § 17-22-530(A)",
    recordTypes: ["arrest", "charge"],
    dispositions: ["alcohol_education_program_completed", "noncriminal_disposition"],
    packetSet: packetSet("sc_aep", [
      {
        componentId: "sc_aep-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_aep-application",
        order: 1
      },
      {
        componentId: "sc_aep-attestation-request-3",
        designRole: "attestation_request",
        templateId: "sc_aep-attestation-request",
        order: 3
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "ageAtArrest",
        label:
          "How old were you on the date of arrest? Answer with a number. Section 17-22-520 confines the programme to a person at least seventeen but under twenty-one at the time of arrest.",
        required: true
      },
      {
        key: "priorAlcoholOffense",
        label:
          "Had you ever had any other alcohol-related offence before this one? Answer yes or no. Section 17-22-520 confines the programme to a person with no prior alcohol-related offence.",
        required: true
      },
      {
        key: "aepCompletionDate",
        label:
          "On what date did you successfully complete the Alcohol Education Program, and which circuit administered it?",
        required: true
      }
    ],
    assembledPacketName: "sc-solicitor-application-alcohol-education-program",
    assembledPacketTitle:
      "South Carolina solicitor application — after the Alcohol Education Program, § 17-22-530(A)",
    customerDeliverableDescription: `Application to the Solicitor's Office to destroy arrest records after successful Alcohol Education Program completion under S.C. Code § 17-22-530, with a neutral letter asking the alcohol education program director for the attestation § 17-22-940(D) requires. ${SOLICITOR_TAIL}`,
    notes:
      "The § 17-22-520 age window and the prior-alcohol-offence bar are screened before anything is prepared. Whether an offence outside the eleven enumerated ones is similar in nature and severity is the circuit solicitor's determination and is not made here."
  }),

  southCarolinaTrack({
    trackId: "sc_tep",
    publicName: "Clear a South Carolina traffic charge after you completed the Traffic Education Program",
    mechanism: "solicitor_application_after_traffic_education_program_completion",
    authority: "S.C. Code § 17-22-330(A)",
    recordTypes: ["charge"],
    dispositions: ["traffic_education_program_completed", "noncriminal_disposition"],
    packetSet: packetSet("sc_tep", [
      {
        componentId: "sc_tep-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_tep-application",
        order: 1
      },
      {
        componentId: "sc_tep-attestation-request-3",
        designRole: "attestation_request",
        templateId: "sc_tep-attestation-request",
        order: 3
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "tepCompletionDate",
        label:
          "On what date did you successfully complete the Traffic Education Program, and which circuit or agency administered it?",
        required: true
      },
      {
        key: "subsequentViolation",
        label:
          "Did you get another traffic ticket in the six months after the ticket that put you in the programme? Answer yes or no. Section 17-22-330(D) requires termination in that case.",
        required: true
      },
      {
        key: "injuryOrDeath",
        label:
          "Did the incident cause anyone's death or a serious bodily injury? Answer yes or no. Section 17-22-310 bars participation where it did.",
        required: true
      }
    ],
    assembledPacketName: "sc-solicitor-application-traffic-education-program",
    assembledPacketTitle:
      "South Carolina solicitor application — after the Traffic Education Program, § 17-22-330(A)",
    customerDeliverableDescription: `Application to the Solicitor's Office to destroy arrest records after successful Traffic Education Program completion under S.C. Code § 17-22-330, with a neutral letter asking the traffic education program director, or the county or municipal agency administering the programme, for the attestation § 17-22-940(D) requires. ${SOLICITOR_TAIL}`,
    notes:
      "A subsequent violation within six months and any death or serious bodily injury are both stops, because either means there may be no noncriminal disposition to apply on."
  }),

  southCarolinaTrack({
    trackId: "sc_conditional_discharge_44_53_450",
    publicName: "Clear a first South Carolina drug possession case that ended in a conditional discharge",
    mechanism: "solicitor_application_after_first_offence_drug_conditional_discharge",
    authority: "S.C. Code § 44-53-450(B)",
    recordTypes: ["arrest", "charge"],
    dispositions: ["conditional_discharge_completed", "dismissed"],
    packetSet: packetSet("sc_conditional_discharge_44_53_450", [
      {
        componentId: "sc_conditional_discharge_44_53_450-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_conditional_discharge_44_53_450-application",
        order: 1
      },
      {
        componentId: "sc_conditional_discharge_44_53_450-attestation-request-3",
        designRole: "attestation_request",
        templateId: "sc_conditional_discharge_44_53_450-attestation-request",
        order: 3
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "priorDrugConviction",
        label:
          "Before this case, had you ever been convicted of any drug offence, in South Carolina, another state or a federal court? Answer yes or no. A single prior conviction defeats this route entirely.",
        required: true
      },
      {
        key: "dischargeDate",
        label: "On what date did the court discharge you and dismiss the proceedings?",
        required: true
      },
      {
        key: "dischargeFeePaid",
        label:
          "Did you pay the conditional discharge fee § 44-53-450(C) requires, or was it waived for indigency? Answer paid, waived for indigency, or not paid.",
        required: true
      },
      {
        key: "priorConditionalDischarge",
        label:
          "Have you ever had a conditional discharge under this section before? Answer yes or no. Section 44-53-450(A) allows it once only.",
        required: true
      }
    ],
    assembledPacketName: "sc-solicitor-application-conditional-discharge",
    assembledPacketTitle:
      "South Carolina solicitor application — after a drug conditional discharge, § 44-53-450(B)",
    customerDeliverableDescription: `Application to the Solicitor's Office to expunge records after a first-offence drug conditional discharge under S.C. Code § 44-53-450(B), with a neutral letter asking the summary court judge for the attestation § 17-22-940(D) requires where the matter was in summary court. ${SOLICITOR_TAIL}`,
    notes:
      "Any prior drug conviction is asked first and a positive answer is a stop rather than a warning, because it defeats the route entirely. The § 44-53-450(C) fee precedes discharge, so an unpaid one is a stop as well."
  }),

  southCarolinaTrack({
    trackId: "sc_34_11_90e_check",
    publicName: "Clear a first South Carolina bad-check conviction after one year",
    mechanism: "solicitor_application_to_expunge_first_offence_fraudulent_check_conviction",
    authority: "S.C. Code § 34-11-90(e)",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    packetSet: packetSet("sc_34_11_90e_check", [
      {
        componentId: "sc_34_11_90e_check-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_34_11_90e_check-application",
        order: 1
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "convictionDate",
        label:
          "On what date were you convicted, including a guilty plea, a no-contest plea or a bail forfeiture? Each of those counts as a conviction under this chapter.",
        required: true
      },
      {
        key: "instrumentAmount",
        label:
          "What was the amount of the cheque? Answer with the figure from the record. An instrument over five thousand dollars makes the conviction a felony, which the section does not reach.",
        required: true
      },
      {
        key: "convictionsSinceYear",
        label:
          "Have you had any other conviction of any kind in the year since that conviction? Answer yes or no.",
        required: true
      },
      {
        key: "numberOfChecks",
        label:
          "How many cheques were involved, and were they charged as separate offences? Answer with a number. Each instrument drawn or uttered is a separate offence.",
        required: true
      }
    ],
    assembledPacketName: "sc-solicitor-application-fraudulent-check",
    assembledPacketTitle:
      "South Carolina solicitor application — first fraudulent check conviction, § 34-11-90(e)",
    customerDeliverableDescription: `Application to the Solicitor's Office to expunge the records of a first-offence fraudulent check conviction under S.C. Code § 34-11-90(e). ${SOLICITOR_TAIL}`,
    notes:
      "The five-thousand-dollar felony threshold and the separate-offence-per-instrument rule are both dispositive and both are asked directly. H.428 would add a multiple-conviction route; it is not enacted and is not offered."
  }),

  southCarolinaTrack({
    trackId: "sc_22_5_910",
    publicName: "Clear a low-level South Carolina conviction after three years",
    mechanism: "solicitor_application_to_expunge_first_low_level_conviction",
    authority: "S.C. Code § 22-5-910",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    packetSet: packetSet("sc_22_5_910", [
      {
        componentId: "sc_22_5_910-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_22_5_910-application",
        order: 1
      },
      {
        componentId: "sc_22_5_910-attestation-request-3",
        designRole: "attestation_request",
        templateId: "sc_22_5_910-attestation-request",
        order: 3
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "convictionDate",
        label:
          "On what date were you convicted, counting a guilty plea, a no-contest plea, or forfeiting bail as a conviction? Section 22-5-910(E) treats all three as convictions.",
        required: true
      },
      {
        key: "penaltyCeiling",
        label:
          "What was the maximum penalty for the offence you were convicted of — how many days of jail and what fine did the law allow? Take it from the sentencing sheet: the ceiling, not the sentence you received, is what decides this.",
        required: true
      },
      {
        key: "motorVehicleOffense",
        label:
          "Did the offence involve operating a motor vehicle? Answer yes or no. Section 22-5-910(A) excludes those.",
        required: true
      },
      {
        key: "domesticViolenceThird",
        label:
          "Was the conviction for domestic violence in the third degree? Answer yes or no. That branch runs five years rather than three.",
        required: true
      },
      {
        key: "firearmPossession",
        label:
          "Was the conviction a first offence of unlawful possession of a firearm or weapon? Answer yes or no. That limb of § 22-5-910(A) carries its own penalty ceiling.",
        required: true
      },
      {
        key: "convictionsSincePeriod",
        label:
          "Have you had any other conviction anywhere, including in another state, since that conviction? Answer yes or no.",
        required: true
      },
      {
        key: "closelyConnectedOffenses",
        label:
          "Were you sentenced for more than one offence at the same sentencing, and did they come out of the same incident? Answer yes or no.",
        required: true
      },
      {
        key: "benchWarrantHistory",
        label:
          "Have you ever been under a bench warrant for failing to appear, and for how long? Asked only where a charge is pending, because § 22-5-910(F) tolls the five-year tolerance for that time.",
        required: false
      }
    ],
    assembledPacketName: "sc-solicitor-application-low-level-conviction",
    assembledPacketTitle:
      "South Carolina solicitor application — first low-level conviction, § 22-5-910",
    customerDeliverableDescription: `Application to the Solicitor's Office to expunge the records of a first low-level conviction under S.C. Code § 22-5-910, with a neutral letter asking the summary court judge for the attestation § 17-22-940(D) requires. ${SOLICITOR_TAIL}`,
    notes:
      "Eligibility turns on the statutory penalty ceiling rather than the sentence imposed, so the ceiling is a required record fact and an unestablished one is a stop. The § 22-5-910(E) same-incident rule and § 17-22-940(G) are not obviously reconciled, so an aggregation claim stops rather than being promised."
  }),

  southCarolinaTrack({
    trackId: "sc_22_5_920_yoa",
    publicName: "Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
    mechanism: "solicitor_application_to_expunge_first_offence_youthful_offender_conviction",
    authority: "S.C. Code § 22-5-920",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    packetSet: packetSet("sc_22_5_920_yoa", [
      {
        componentId: "sc_22_5_920_yoa-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_22_5_920_yoa-application",
        order: 1
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "yoaSentenced",
        label:
          "Does your sentencing paperwork say you were sentenced under the Youthful Offender Act — not just that you were young enough to qualify? Answer yes or no.",
        required: true
      },
      {
        key: "sentenceCompletionDate",
        label:
          "On what date did you finish the whole youthful offender sentence, including any probation and any parole?",
        required: true
      },
      {
        key: "convictionsSinceCompletion",
        label:
          "Have you had any conviction anywhere, including in another state, while you were serving that sentence or in the five years since you finished it? Answer yes or no.",
        required: true
      },
      {
        key: "excludedCategory",
        label:
          "Did the offence involve driving, violence, a domestic relationship, or anything that put you on the sex offender registry? Answer yes or no. Section 22-5-920(B)(2) excludes all four.",
        required: true
      },
      {
        key: "closelyConnectedOffenses",
        label:
          "Were you given youthful offender sentences for more than one offence at the same sentencing, and did they come out of the same incident? Answer yes or no.",
        required: true
      }
    ],
    assembledPacketName: "sc-solicitor-application-youthful-offender",
    assembledPacketTitle:
      "South Carolina solicitor application — Youthful Offender Act conviction, § 22-5-920",
    customerDeliverableDescription: `Application to the Solicitor's Office to expunge the records of a first-offence Youthful Offender Act conviction under S.C. Code § 22-5-920. ${SOLICITOR_TAIL}`,
    notes:
      "Section 22-5-920(B)(1) reaches only a defendant sentenced under Chapter 19 of Title 24. Having been eligible for that sentence is not the same as having received one, so an unclear sentencing sheet is a stop rather than an assumption."
  }),

  southCarolinaTrack({
    trackId: "sc_22_5_930_drug",
    publicName: "Clear a first South Carolina drug conviction",
    mechanism: "solicitor_application_to_expunge_first_offence_drug_conviction",
    authority: "S.C. Code § 22-5-930",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    packetSet: packetSet("sc_22_5_930_drug", [
      {
        componentId: "sc_22_5_930_drug-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_22_5_930_drug-application",
        order: 1
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "drugOffenseType",
        label:
          "Was the conviction for simple possession, for unlawful possession of a prescription drug, or for possession with intent to distribute? Answer simple possession, prescription drug, or possession with intent.",
        required: true
      },
      {
        key: "substanceType",
        label:
          "What controlled substance was involved — was it marijuana or something else? Answer marijuana or other controlled substance. The § 22-5-930(D) lookback differs by substance.",
        required: true
      },
      {
        key: "sentenceCompletionDate",
        label:
          "On what date did you finish the whole sentence for this conviction, including any probation and any parole?",
        required: true
      },
      {
        key: "priorDrugOffense",
        label: "Was this your first drug conviction of this kind? Answer yes or no.",
        required: true
      },
      {
        key: "priorConditionalDischarge",
        label:
          "Had you had a conditional discharge at any point before you were arrested on this charge, and if so when? If you never had one, answer no. Both § 22-5-930(D) lookbacks run from the date of arrest.",
        required: true
      },
      {
        key: "convictionsSincePeriod",
        label:
          "Have you had any other conviction anywhere since you finished the sentence? Answer yes or no.",
        required: true
      },
      {
        key: "priorFelonyForPwid",
        label:
          "For a possession-with-intent conviction: have you completed a sentence for any other drug conviction or any felony conviction, and when? Asked only on the § 22-5-930(B) branch, whose twenty-year clock runs from that completion.",
        required: false
      }
    ],
    assembledPacketName: "sc-solicitor-application-first-drug-conviction",
    assembledPacketTitle:
      "South Carolina solicitor application — first drug conviction, § 22-5-930(A)",
    customerDeliverableDescription: `Application to the Solicitor's Office to expunge the records of a first-offence drug conviction under S.C. Code § 22-5-930(A). ${SOLICITOR_TAIL}`,
    notes:
      "The design's warning against routing every drug conviction here is kept as a printed section and as a stop. The twenty-year possession-with-intent branch is referred to counsel rather than prepared, and any prior conditional discharge stops because both lookbacks run from the date of arrest."
  }),

  southCarolinaTrack({
    trackId: "sc_56_5_750f",
    publicName:
      "Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
    mechanism: "solicitor_application_to_expunge_first_offence_failure_to_stop_conviction",
    authority: "S.C. Code § 56-5-750(F)",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    packetSet: packetSet("sc_56_5_750f", [
      {
        componentId: "sc_56_5_750f-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_56_5_750f-application",
        order: 1
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      { key: "offenseDate", label: "On what date did the offence happen?", required: true },
      {
        key: "subsectionCharged",
        label:
          "Which part of the failure-to-stop statute were you convicted under, and was it charged as a misdemeanour or a felony? Answer b1 misdemeanor, other subsection, felony, or not sure. Take it from the sentencing sheet.",
        required: true
      },
      {
        key: "injuryOrDeath",
        label:
          "Did the incident cause anyone great bodily injury or death? Answer yes or no. Those facts sit outside subsection (B)(1).",
        required: true
      },
      {
        key: "termsCompletionDate",
        label:
          "On what date did you finish every term and condition of the sentence — fines, restitution, community service, probation, everything? The three-year clock runs from that date.",
        required: true
      },
      {
        key: "convictionsSincePeriod",
        label:
          "Have you had any other conviction anywhere in the three years since you finished those terms? Answer yes or no.",
        required: true
      },
      {
        key: "firstOffenseStatus",
        label: "Was this your first conviction under this statute? Answer yes or no.",
        required: true
      }
    ],
    assembledPacketName: "sc-solicitor-application-failure-to-stop",
    assembledPacketTitle:
      "South Carolina solicitor application — first failure-to-stop conviction, § 56-5-750(F)",
    customerDeliverableDescription: `Application to the Solicitor's Office to expunge the records of a first-offence failure to stop for a blue light conviction under S.C. Code § 56-5-750(F). ${SOLICITOR_TAIL}`,
    notes:
      "The 2025 amendment effective 12 May 2026 left subsection (F) untouched. The offence date, the subsection, the injury facts and the felony or misdemeanour classification are asked before routing, and each is a stop where the record does not settle it."
  }),

  southCarolinaTrack({
    trackId: "sc_17_1_65_handgun",
    publicName:
      "Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
    mechanism: "solicitor_application_to_expunge_pre_2024_unlawful_handgun_possession_conviction",
    authority: "S.C. Code § 17-1-65",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    packetSet: packetSet("sc_17_1_65_handgun", [
      {
        componentId: "sc_17_1_65_handgun-primary-filing-1",
        designRole: "primary_filing",
        templateId: "sc_17_1_65_handgun-application",
        order: 1
      }
    ]),
    requiredInputs: [
      ...COMMON_INPUTS,
      {
        key: "convictionDate",
        label:
          "On what date were you convicted of unlawful possession of a handgun? Give the full date from the sentencing sheet, for example 14 March 2019. The conviction must predate 7 March 2024.",
        required: true
      },
      {
        key: "convictionStatute",
        label:
          "Does the sentencing paperwork show the conviction was under S.C. Code § 16-23-20? Answer yes or no. The section reaches that offence and no other.",
        required: true
      },
      {
        key: "priorHandgunApplication",
        label:
          "Have you ever applied before for an expungement of a handgun possession conviction under § 17-1-65? Answer yes or no.",
        required: true
      },
      {
        key: "otherHandgunConvictions",
        label:
          "Do you have more than one conviction for unlawful possession of a handgun? Answer yes or no. The section reaches one.",
        required: true
      }
    ],
    assembledPacketName: "sc-solicitor-application-handgun-conviction",
    assembledPacketTitle:
      "South Carolina solicitor application — old handgun possession conviction, § 17-1-65",
    customerDeliverableDescription: `Application to the Solicitor's Office to expunge an old unlawful handgun possession conviction under S.C. Code § 17-1-65, on a route that closes permanently on 7 March 2029. ${SOLICITOR_TAIL}`,
    notes:
      "The only route in the assignment with a deadline rather than a waiting period. The 7 March 2029 closing date is surfaced unprompted, and a conviction dated on or after 7 March 2024, or one whose date cannot be read from the record, is a stop. SCCA 223C is a § 17-1-65 instrument and is named on this route only."
  })
];
