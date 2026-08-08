// Kansas record clearing — custom-pleading implementation.
//
// Two assigned routes, four assigned custom-pleading components. Both live in
// Kansas municipal court, and both are statewide mechanisms executed court by
// court:
//
//   ks-12-4516-municipal          K.S.A. 12-4516. A person convicted of a city
//       ordinance violation, or who fulfilled a diversion agreement based on
//       one, petitions the convicting municipal court. The elapsed period is
//       three years by default and turns entirely on whether the ordinance
//       violation would ALSO have constituted a listed Kansas offence: none for
//       a § 12-16,134 prohibited ordinance, one year for a prostitution
//       equivalent proved to have been coerced, five years for the (d) list and
//       for a first § 8-1567 DUI equivalent, ten for a second or subsequent
//       one. A commercial DUI equivalent under K.S.A. 8-2,144 is excluded
//       outright by § 12-4516(f).
//
//   ks-12-4516a-municipal-arrest  K.S.A. 12-4516a. A person arrested on a city
//       ordinance violation petitions the same court to expunge the arrest
//       record. There is no waiting period at all. Relief runs on one of five
//       statutory grounds, and the choice among them is the participant's.
//
// The two `process_guidance` components the design assigns beside them belong to
// the guidance lane. They are named here as excluded, and nothing here produces
// them.
//
// **The local-form override is the whole shape of this job.** Kansas has
// hundreds of municipal courts and no unified municipal forms regime. Wichita
// proceeds under Charter Ordinance No. 224 and publishes a Motion and Order
// rather than a petition; Topeka publishes its own petition and order under
// K.S.A. 12-4516. The design is explicit that these drafted pleadings are the
// statewide FALLBACK, used only where the participant's own municipal court
// publishes nothing — so the mandatory clerk call is not an instruction printed
// beside the packet, it is a precondition of generating the packet at all. A
// participant whose court publishes a form is stopped and sent to that form; a
// participant who has not yet asked is stopped and sent to the clerk.
//
// That same clerk call answers the second limb of the proposed order's
// condition. The design marks the proposed order `conditional` on "where the
// municipal court expects a proposed order and publishes none of its own", and
// declares one question to carry both limbs. It is therefore modelled as a
// four-valued answer — publishes its own form; publishes none and wants a
// proposed order; publishes none and does not; has not been asked — rather than
// as a yes-or-no that could not distinguish them.
//
// **What the statute makes the court's, and this packet leaves alone.** The
// court sets the hearing and causes notice to be given to the prosecuting
// attorney and the arresting agency: the participant does not serve, so there is
// no certificate of service on either route and none is drafted. The three
// findings under § 12-4516(h) — no felony conviction in the past two years with
// none pending or being instituted, that the petitioner's circumstances and
// behaviour warrant expungement, and that expungement is consistent with the
// public welfare — are three, not the four a district-court petition carries,
// because a municipal ordinance conviction is not a felony and there is no
// firearms finding. LegalEase writes none of them, and it does not write the
// participant's showing on the second and third: it prompts for the
// participant's own facts and formats them without change.
//
// **No fee amount appears anywhere.** Both sections let a municipal court
// prescribe a fee as costs, the amount varies court by court, there is no
// statewide figure, and the design records that as an open release question. The
// one fee rule that IS statutory is stated: no fee may be charged on the arrest
// route to a person arrested as a result of being a victim of identity theft.
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
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED PETITIONER — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referral destinations
// ---------------------------------------------------------------------------

/** Where every local-practice question goes, and it is most of them. */
export const KS_MUNICIPAL_CLERK_REFERRAL =
  "The clerk of the Kansas municipal court that handled the case, who is the only office that can say whether that court publishes its own expungement form, what it charges as costs, how the hearing is set and how many copies it wants.";

/** Where a stop that needs individual legal advice sends the participant. */
export const KS_LAWYER_REFERRAL =
  "A Kansas lawyer — through the Kansas Bar Association's lawyer referral service, or a legal-aid office serving the county the city sits in.";

/** Where an arrest-route participant who was actually convicted belongs. */
export const KS_CONVICTION_ROUTE_REFERRAL =
  "LegalEase's own Kansas routing: a municipal conviction or a fulfilled municipal diversion runs under K.S.A. 12-4516, not under the arrest-record section.";

/** Where an arrest-route participant belongs when the arrest was not municipal. */
export const KS_DISTRICT_COURT_REFERRAL =
  "The Kansas district court. An arrest on a state law violation runs under K.S.A. 22-2410 and a district court conviction under K.S.A. 21-6614; neither is a municipal matter and neither is this packet.";

/** Where a stop about the participant's own record sends them. */
export const KS_RECORD_REFERRAL =
  "The Kansas Bureau of Investigation, for the participant's own criminal history record, and the municipal court clerk for the case file.";

/** The closed set of destinations. A stop may not invent a sixth. */
export const KS_REFERRALS: readonly string[] = [
  KS_MUNICIPAL_CLERK_REFERRAL,
  KS_LAWYER_REFERRAL,
  KS_CONVICTION_ROUTE_REFERRAL,
  KS_DISTRICT_COURT_REFERRAL,
  KS_RECORD_REFERRAL
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class KansasEligibilityStopError extends Error {
  readonly code = "kansas_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "KansasEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class KansasBranchError extends Error {
  readonly code = "kansas_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "KansasBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

export const KS_CONVICTION_TRACK_ID = "ks-12-4516-municipal";
export const KS_ARREST_TRACK_ID = "ks-12-4516a-municipal-arrest";

/** The two assigned routes, held closed so no other track can derive here. */
export const KS_ASSIGNED_TRACK_IDS: readonly string[] = [
  KS_CONVICTION_TRACK_ID,
  KS_ARREST_TRACK_ID
];

export const KS_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * What the municipal court clerk said, which decides three things at once:
 * whether this packet may be generated at all, whether the proposed order
 * renders, and what the participant does next.
 */
export const KS_LOCAL_FORM_ANSWERS: Readonly<
  Record<
    string,
    "publishes_own_form" | "no_form_wants_proposed_order" | "no_form_petition_only" | "have_not_asked"
  >
> = {
  publishes_own_form: "publishes_own_form",
  "publishes own form": "publishes_own_form",
  "own form": "publishes_own_form",
  no_form_wants_proposed_order: "no_form_wants_proposed_order",
  "no form wants proposed order": "no_form_wants_proposed_order",
  "no form, wants a proposed order": "no_form_wants_proposed_order",
  no_form_petition_only: "no_form_petition_only",
  "no form petition only": "no_form_petition_only",
  "no form, petition only": "no_form_petition_only",
  have_not_asked: "have_not_asked",
  "have not asked": "have_not_asked"
};

/** Conviction, or a fulfilled diversion. The statute branches on it. */
export const KS_DISPOSITION_TYPES: Readonly<Record<string, "conviction" | "diversion">> = {
  conviction: "conviction",
  convicted: "conviction",
  diversion: "diversion",
  "diversion agreement": "diversion"
};

/**
 * Whether the ordinance violation would ALSO have constituted a listed Kansas
 * offence.
 *
 * This one answer sets the elapsed period on the conviction route, and the
 * design records it as the participant's own: LegalEase records the position and
 * does not classify the offence. `commercial_dui` is not a period at all — it is
 * the § 12-4516(f) exclusion.
 */
export const KS_STATE_EQUIVALENTS: Readonly<
  Record<
    string,
    | "none"
    | "prohibited_ordinance"
    | "prostitution_with_proven_coercion"
    | "listed_five_year"
    | "dui_first"
    | "dui_second_or_subsequent"
    | "commercial_dui"
    | "not_sure"
  >
> = {
  none: "none",
  "no listed offence": "none",
  prohibited_ordinance: "prohibited_ordinance",
  "prohibited ordinance": "prohibited_ordinance",
  prostitution_with_proven_coercion: "prostitution_with_proven_coercion",
  "prostitution with proven coercion": "prostitution_with_proven_coercion",
  listed_five_year: "listed_five_year",
  "listed five year": "listed_five_year",
  dui_first: "dui_first",
  "dui first": "dui_first",
  dui_second_or_subsequent: "dui_second_or_subsequent",
  "dui second or subsequent": "dui_second_or_subsequent",
  commercial_dui: "commercial_dui",
  "commercial dui": "commercial_dui",
  not_sure: "not_sure",
  "not sure": "not_sure"
};

/** The five grounds K.S.A. 12-4516a(c) gives, and nothing else. */
export const KS_ARREST_GROUNDS: Readonly<
  Record<
    string,
    | "mistaken_identity"
    | "no_probable_cause"
    | "found_not_guilty"
    | "prohibited_ordinance"
    | "best_interests_of_justice"
    | "not_sure"
  >
> = {
  mistaken_identity: "mistaken_identity",
  "mistaken identity": "mistaken_identity",
  no_probable_cause: "no_probable_cause",
  "no probable cause": "no_probable_cause",
  found_not_guilty: "found_not_guilty",
  "found not guilty": "found_not_guilty",
  acquitted: "found_not_guilty",
  prohibited_ordinance: "prohibited_ordinance",
  "prohibited ordinance": "prohibited_ordinance",
  best_interests_of_justice: "best_interests_of_justice",
  "best interests of justice": "best_interests_of_justice",
  not_sure: "not_sure",
  "not sure": "not_sure"
};

/**
 * Answer keys that would carry outside-party work into a Kansas packet.
 *
 * The court sets the hearing, causes notice to be given, makes the three
 * findings and signs the order. The clerk sends the certified copy to the Kansas
 * Bureau of Investigation on a grant. None of that is the participant's, and
 * none of it is LegalEase's.
 */
export const KS_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "clerkCertification",
  "courtFinding",
  "expungementOrder",
  "filingDate",
  "hearingDate",
  "hearingTime",
  "judgeSignature",
  "kbiNotification",
  "noticeGivenDate",
  "prosecutorPosition"
];

/**
 * Keys a caller may volunteer that route the matter away rather than into a
 * document. The design records offender registration and immigration
 * consequences as self-help stops and forbids the packet from speaking to
 * either.
 */
export const KS_SCREENED_ROUTING_KEYS: readonly string[] = [
  "immigrationStatus",
  "offenderRegistration"
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
 * The municipal court's own name, out of a compound answer.
 *
 * The design asks for the court and the case number in one question — "Which
 * Kansas city's municipal court handled the case, and what is the case number?"
 * — so the raw answer routinely reads "Lawrence Municipal Court, case number
 * 2016-CR-04412". Uppercasing that whole string into a caption produces "IN THE
 * MUNICIPAL COURT OF LAWRENCE MUNICIPAL COURT, CASE NUMBER 2016-CR-04412,
 * KANSAS", which names a court that does not exist and prints a case number in
 * the court line. The normalisation is deliberately shallow: take what precedes
 * the first comma, drop a trailing "municipal court", and keep the raw answer
 * for the paragraph that identifies the case. Nothing is inferred beyond that,
 * and the caption's own case-number line stays blank for the clerk.
 */
function municipalCityOf(raw: string): string {
  const beforeComma = raw.split(",")[0] ?? raw;
  return beforeComma.replace(/\s*\bmunicipal court\b\s*$/i, "").trim() || beforeComma.trim();
}

/** Declared rather than assigned, so TypeScript narrows after it. */
function stop(
  stopId: string,
  trackId: string,
  reason: string,
  referral: string,
  nextStep: string
): never {
  throw new KansasEligibilityStopError(stopId, trackId, reason, referral, nextStep);
}

const UNKNOWN_ANSWER =
  /\b(don'?t know|do not know|not sure|unsure|no idea|unknown|can'?t remember|cannot remember|can'?t recall|cannot recall|not certain|maybe|possibly)\b/i;

const statesAYear = (raw: string): boolean => /\b(19|20)\d{2}\b/.test(raw);
const yearIn = (raw: string): number | null => {
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
};

const need = (
  trackId: string,
  answers: Answers,
  key: string,
  referral: string = KS_MUNICIPAL_CLERK_REFERRAL
): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "ks-answer-missing",
      trackId,
      `This packet needs an answer to ${key} before anything can be prepared, and none was given. K.S.A. 12-4516(g)(1) and K.S.A. 12-4516a(b) each prescribe six things the petition must state, every one of them comes from the participant's own answers, and a petition that left one out would not be the petition the section describes.`,
      referral,
      "Get the municipal case information from the court clerk, then answer the question from the record rather than from memory."
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
    throw new KansasBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), KS_YES_NO);

/**
 * Whether a volunteered answer ASSERTS the screened condition or denies it.
 *
 * These keys are not declared by the design; a caller may supply them and the
 * usual answer is a denial. A blunt keyword test reads "no, I have never had to
 * register" as an assertion, because it contains "I have" — and a false stop
 * sends somebody to a lawyer they did not need. So each screen carries its own
 * positive pattern, and a negation standing in front of the match in the same
 * answer defeats it. The immigration pattern deliberately encodes its own
 * negation ("not a United States citizen"), which is why the guard looks only at
 * what precedes the match rather than at the answer as a whole.
 */
const PRECEDING_NEGATION = /\b(no|not|never|none|without|neither)\b/i;
function assertsScreened(value: string, positive: RegExp): boolean {
  const match = value.match(positive);
  if (!match) return false;
  return !PRECEDING_NEGATION.test(value.slice(0, value.indexOf(match[0])));
}

const ASSERTS_REGISTRATION =
  /\b(yes|required to register|currently registered|on the (offender )?registry|i must register)\b/i;
const ASSERTS_IMMIGRATION_ISSUE =
  /\b(not a (us|u\.s\.|united states) citizen|non[- ]?citizen|green card|lawful permanent resident|visa holder|undocumented|removal proceedings|deportation)\b/i;

// ---------------------------------------------------------------------------
// Screens that run on both routes, in this order
// ---------------------------------------------------------------------------

function refuseOutsidePartyContent(trackId: string, answers: Answers): void {
  const supplied = KS_OUTSIDE_PARTY_KEYS.filter((key) => str(answers, key).length > 0);
  if (supplied.length === 0) return;
  stop(
    "ks-outside-party-content-refused",
    trackId,
    `Content was supplied for ${supplied.join(", ")}. Every one of those belongs to somebody else: under K.S.A. 12-4516(g)(1) and K.S.A. 12-4516a(b) the court sets the hearing date and CAUSES NOTICE TO BE GIVEN to the prosecuting attorney and the arresting agency, the court makes the findings and signs the order, and on a grant the clerk sends a certified copy to the Kansas Bureau of Investigation. The participant serves nobody, and LegalEase produces none of it.`,
    KS_MUNICIPAL_CLERK_REFERRAL,
    "File the petition with the municipal court clerk and let the court set the hearing and give the notice. Ask the clerk what the court expects from you and when."
  );
}

function screenRouting(trackId: string, answers: Answers): void {
  const registration = str(answers, "offenderRegistration");
  if (registration && assertsScreened(registration, ASSERTS_REGISTRATION)) {
    stop(
      "ks-offender-registration-attorney-only",
      trackId,
      "The answers say the participant is currently required to register under the Kansas Offender Registration Act. The design makes that a self-help stop, and what an expungement does and does not do to a registration obligation is not a question a prepared petition should answer.",
      KS_LAWYER_REFERRAL,
      "Speak to a Kansas lawyer about the registration obligation before filing any expungement petition."
    );
  }
  const immigration = str(answers, "immigrationStatus");
  if (immigration && assertsScreened(immigration, ASSERTS_IMMIGRATION_ISSUE)) {
    stop(
      "ks-immigration-consequences-attorney-only",
      trackId,
      "The answers raise an immigration consequence. The design makes that a self-help stop on both Kansas routes and separately forbids this packet from saying anything about what an expungement does to an immigration matter. Both rules point the same way.",
      KS_LAWYER_REFERRAL,
      "Speak to an immigration lawyer, or a lawyer who works with one, before filing an expungement petition in Kansas."
    );
  }
}

/**
 * The mandatory clerk call, which is a precondition of generating at all.
 *
 * The drafted pleading is the statewide fallback and nothing more. Where the
 * participant's own municipal court publishes an instrument, that instrument and
 * that court's process govern — Wichita's Motion and Order under Charter
 * Ordinance No. 224 is not this petition, and Topeka's published petition is not
 * this one either.
 */
function resolveLocalForm(
  trackId: string,
  answers: Answers
): "no_form_wants_proposed_order" | "no_form_petition_only" {
  const answer = branch(
    trackId,
    "localFormPublished",
    need(trackId, answers, "localFormPublished"),
    KS_LOCAL_FORM_ANSWERS
  );
  if (answer === "have_not_asked") {
    stop(
      "ks-local-form-not-confirmed",
      trackId,
      "The municipal court clerk has not been asked whether that court publishes its own expungement form or requires its own process. Kansas has hundreds of municipal courts and no unified forms regime: Wichita proceeds under Charter Ordinance No. 224 and publishes a Motion and Order, Topeka publishes its own petition and order, and this drafted pleading is the statewide fallback for a court that publishes nothing. Which of those a participant is in front of is not something LegalEase can know, and filing the wrong instrument wastes the filing.",
      KS_MUNICIPAL_CLERK_REFERRAL,
      "Call the clerk of that municipal court. Ask whether the court publishes its own expungement form or has its own process, whether it wants a proposed order tendered with the petition, what it charges as costs, and how many copies it wants. Then answer again."
    );
  }
  if (answer === "publishes_own_form") {
    stop(
      "ks-local-form-governs",
      trackId,
      "That municipal court publishes its own expungement instrument or runs its own process. The adopted design makes this drafted pleading the fallback used ONLY where the local court publishes nothing, and defers to a court's current local form where one exists. Filing a drafted petition into a court that publishes its own would be filing the wrong document.",
      KS_MUNICIPAL_CLERK_REFERRAL,
      "Get that court's own form from its clerk or its website and use it. Ask the clerk what it charges as costs and how the hearing is set."
    );
  }
  return answer;
}

/**
 * The one optional answer this module reads that the design does not declare.
 *
 * The conviction route's elapsed period is the whole eligibility question and it
 * varies from none to ten years. A self-help packet that cannot notice an
 * obviously premature filing is worse than one that can — but LegalEase makes no
 * eligibility determination and holds no clock, and reading the wall clock would
 * make every rendered fixture non-deterministic. So the check runs only where the
 * participant states the date they are preparing the packet, it is never
 * required, and it can only ever stop.
 */
export const KS_PREPARATION_DATE_KEY = "preparationDate";

// ---------------------------------------------------------------------------
// ks-12-4516-municipal — K.S.A. 12-4516
// ---------------------------------------------------------------------------

/** The elapsed period each equivalence carries, and the subsection that sets it. */
const KS_PERIODS: Readonly<Record<string, { years: number; label: string; cite: string }>> = {
  none: { years: 3, label: "three years", cite: "K.S.A. 12-4516(a)" },
  prohibited_ordinance: {
    years: 0,
    label: "no elapsed period",
    cite: "K.S.A. 12-4516(b)"
  },
  prostitution_with_proven_coercion: {
    years: 1,
    label: "one year",
    cite: "K.S.A. 12-4516(c)"
  },
  listed_five_year: { years: 5, label: "five years", cite: "K.S.A. 12-4516(d)" },
  dui_first: { years: 5, label: "five years", cite: "K.S.A. 12-4516(e)(1)" },
  dui_second_or_subsequent: { years: 10, label: "ten years", cite: "K.S.A. 12-4516(e)(2)" }
};

function deriveConvictionFacts(answers: Answers): Record<string, string> {
  const trackId = KS_CONVICTION_TRACK_ID;

  const cityAndCourt = need(trackId, answers, "cityAndCourt");
  const fullLegalName = need(trackId, answers, "fullLegalName");
  const nameAtTimeOfCase = need(trackId, answers, "nameAtTimeOfCase");
  const sexRaceDateOfBirth = need(trackId, answers, "sexRaceDateOfBirth");
  const ordinanceViolation = need(trackId, answers, "ordinanceViolation");
  const offenseCommittedDate = need(trackId, answers, "offenseCommittedDate");
  const convictionOrDiversionDate = need(trackId, answers, "convictionOrDiversionDate");
  const completionDate = need(trackId, answers, "completionDate");
  const arrestingAgency = need(trackId, answers, "arrestingAgency");
  const participantAccount = need(trackId, answers, "participantAccount", KS_LAWYER_REFERRAL);

  if (UNKNOWN_ANSWER.test(cityAndCourt)) {
    stop(
      "ks-venue-not-identified",
      trackId,
      "Which Kansas city's municipal court handled the case has not been identified. K.S.A. 12-4516(a)(1) directs the petition to the convicting court — the municipal court of the city whose ordinance was violated — and there is no other venue for it. The caption names that court and it cannot be defaulted.",
      KS_MUNICIPAL_CLERK_REFERRAL,
      "Find the city and court from your own case paperwork or by calling the city's municipal court clerk, and answer again."
    );
  }

  const localForm = resolveLocalForm(trackId, answers);
  const dispositionType = branch(
    trackId,
    "dispositionType",
    need(trackId, answers, "dispositionType"),
    KS_DISPOSITION_TYPES
  );

  const equivalence = branch(
    trackId,
    "stateEquivalentOffense",
    need(trackId, answers, "stateEquivalentOffense"),
    KS_STATE_EQUIVALENTS
  );
  if (equivalence === "commercial_dui") {
    stop(
      "ks-commercial-dui-excluded",
      trackId,
      "The ordinance violation would also have constituted commercial driving under the influence under K.S.A. 8-2,144. Section 12-4516(f) excludes that from expungement outright — it is not a longer waiting period, it is an exclusion — so no petition drafted here can reach it.",
      KS_LAWYER_REFERRAL,
      "Check the ordinance and the citation against the municipal file. If it really is a commercial DUI equivalent, this route is closed and a lawyer is the next step."
    );
  }
  if (equivalence === "not_sure") {
    stop(
      "ks-state-equivalent-not-settled",
      trackId,
      "Whether the ordinance violation would also have constituted a listed Kansas offence has not been settled, and that single answer sets the elapsed period: none, one year, three, five or ten. The design records the answer as the participant's own and makes a disputed one a self-help stop. LegalEase does not classify an ordinance against the Kansas criminal code.",
      KS_LAWYER_REFERRAL,
      "Read the ordinance you were convicted of or diverted for against the Kansas statutes the petition lists, and take it to a lawyer if it is still not clear. The waiting period cannot be computed until it is."
    );
  }

  if (yesNo(trackId, answers, "felonyLastTwoYears")) {
    stop(
      "ks-felony-within-two-years",
      trackId,
      "There is a felony conviction within the past two years, or a felony proceeding pending or being instituted. K.S.A. 12-4516(h)(1) requires the court to find that there is not, so the first of the three findings could not be made on these facts and the petition would be filed into a refusal.",
      KS_RECORD_REFERRAL,
      "Obtain your own Kansas criminal history record so you can see the dates, and come back once two years have passed with nothing pending."
    );
  }

  if (UNKNOWN_ANSWER.test(completionDate) || !statesAYear(completionDate)) {
    stop(
      "ks-completion-date-not-established",
      trackId,
      "The date the sentence was satisfied, supervision discharged or the diversion terms fulfilled has not been established. Every elapsed period on this route runs from that date, so the whole timing question turns on it and it is not one to estimate.",
      KS_MUNICIPAL_CLERK_REFERRAL,
      "Ask the municipal court clerk for the case information showing when the sentence was satisfied or the diversion terms fulfilled, take the date from it, and answer again."
    );
  }

  const period = KS_PERIODS[equivalence];
  const preparation = str(answers, KS_PREPARATION_DATE_KEY);
  if (preparation && period.years > 0) {
    const preparationYear = yearIn(preparation);
    const completionYear = yearIn(completionDate);
    if (
      preparationYear !== null &&
      completionYear !== null &&
      preparationYear - completionYear < period.years
    ) {
      stop(
        "ks-waiting-period-not-elapsed",
        trackId,
        `On the dates given, ${period.label} have not elapsed since the sentence was satisfied, supervision discharged or the diversion terms fulfilled. ${period.cite} sets that period for the equivalence stated. This packet does not decide eligibility; it declines to prepare a petition the dates in front of it say is early.`,
        KS_MUNICIPAL_CLERK_REFERRAL,
        "Work the period out from your own completion date, and confirm with the municipal court clerk what that court expects before preparing anything."
      );
    }
  }

  const costsAndFinesPaid = yesNo(trackId, answers, "costsAndFinesPaid");
  const divertingAuthority = str(answers, "divertingAuthority");
  if (dispositionType === "diversion" && !divertingAuthority) {
    stop(
      "ks-diverting-authority-not-named",
      trackId,
      "The case was resolved by a diversion agreement and the diverting authority has not been named. K.S.A. 12-4516(g)(1) requires the petition to state the identity of the convicting court, the arresting law enforcement agency OR the diverting authority, and on a diversion it is the diverting authority the section asks for.",
      KS_MUNICIPAL_CLERK_REFERRAL,
      "Ask the municipal court clerk or the city prosecutor's office which authority granted the diversion, and answer again."
    );
  }

  return {
    // Declared keys, carried through under the design's own names.
    cityAndCourt,
    fullLegalName,
    nameAtTimeOfCase,
    sexRaceDateOfBirth,
    dispositionType,
    ordinanceViolation,
    stateEquivalentOffense: equivalence,
    offenseCommittedDate,
    convictionOrDiversionDate,
    completionDate,
    arrestingAgency,
    divertingAuthority,
    felonyLastTwoYears: "no",
    costsAndFinesPaid: costsAndFinesPaid ? "yes" : "no",
    localFormPublished: localForm,
    participantAccount,

    // Template placeholders.
    petitionerName: fullLegalName,
    municipalCity: municipalCityOf(cityAndCourt),
    courtLine: `IN THE MUNICIPAL COURT OF ${municipalCityOf(cityAndCourt).toUpperCase()}, KANSAS`,
    caseIdentification: `The case, as the petitioner identifies it, is: ${cityAndCourt}`,
    // K.S.A. 12-4516(g)(1) prescribes the six contents. Each is stated as the
    // petitioner's own answer, in the section's own order.
    contentFullName: `The petitioner's full name is ${fullLegalName}.`,
    contentPriorName: `The petitioner's full name at the time of the arrest, conviction or diversion was: ${nameAtTimeOfCase}`,
    contentIdentifiers: `The petitioner states the sex, race and date of birth this petition is to carry as: ${sexRaceDateOfBirth}. K.S.A. 12-4516(g)(1) prescribes those three items and this petition states them because the section requires them.`,
    contentOffence: `The ordinance violation is: ${ordinanceViolation}. The petitioner states the date it was committed as ${offenseCommittedDate}.`,
    contentDate:
      dispositionType === "conviction"
        ? `The petitioner states that the conviction was entered on ${convictionOrDiversionDate}.`
        : `The petitioner states that the diversion agreement was entered on ${convictionOrDiversionDate}.`,
    contentAuthority:
      dispositionType === "conviction"
        ? `The convicting court is the Municipal Court of ${municipalCityOf(cityAndCourt)}. The arresting law enforcement agency, as the petitioner states it, is: ${arrestingAgency}`
        : `The diverting authority, as the petitioner states it, is: ${divertingAuthority}. The arresting law enforcement agency, as the petitioner states it, is: ${arrestingAgency}`,
    dispositionSentence:
      dispositionType === "conviction"
        ? "This petition is made under K.S.A. 12-4516(a)(1), which reaches a person convicted of a violation of a city ordinance."
        : "This petition is made under K.S.A. 12-4516(a)(2), which reaches a person who has fulfilled the terms of a diversion agreement based on a violation of a city ordinance.",
    periodStatement:
      period.years === 0
        ? `The petitioner states that the ordinance violation is one prohibited by K.S.A. 12-16,134(a) or (b) and adopted before 1 July 2014. ${period.cite} states no elapsed period for that category. The petitioner does not state that any period has run, and the classification is the petitioner's own.`
        : `The petitioner states the completion date — the date the sentence was satisfied, supervision was discharged or the diversion terms were fulfilled, whichever came latest — as ${completionDate}. ${period.cite} sets ${period.label} for the equivalence the petitioner states. The petitioner does not state that the period has run; the computation is for the Court.`,
    equivalenceStatement: equivalenceSentence(equivalence),
    costsStatement: costsAndFinesPaid
      ? "The petitioner states that all court costs and fines in this case have been paid. Some Kansas municipal courts, Topeka among them, require the petition to say so."
      : "The petitioner states that not all court costs and fines in this case have been paid. Some Kansas municipal courts, Topeka among them, require the petition to state that they have, and the petitioner asks the clerk what remains owing before filing.",
    accountStatement: participantAccount,
    proposedOrderCondition: localForm === "no_form_wants_proposed_order" ? "yes" : "",
    packetCaseReference: "Kansas municipal expungement"
  };
}

/** The equivalence, said as the petitioner's own position rather than a finding. */
function equivalenceSentence(equivalence: string): string {
  switch (equivalence) {
    case "none":
      return "The petitioner states that the ordinance violation would not also have constituted any of the Kansas offences that K.S.A. 12-4516 gives a longer period to. That is the petitioner's own position, taken from the ordinance and the case papers.";
    case "prohibited_ordinance":
      return "The petitioner states that the ordinance violation is one prohibited by K.S.A. 12-16,134(a) or (b), adopted before 1 July 2014. That is the petitioner's own position, taken from the ordinance.";
    case "prostitution_with_proven_coercion":
      return "The petitioner states that the ordinance violation would also have constituted a violation of K.S.A. 21-6419 or former K.S.A. 21-3512, and that the petitioner can prove the violation was a result of coercion caused by the act of another. K.S.A. 12-4516(c) makes that proof the petitioner's to offer; this petition records the position and offers no proof of its own.";
    case "listed_five_year":
      return "The petitioner states that the ordinance violation would also have constituted one of the offences K.S.A. 12-4516(d) lists — vehicular homicide, driving while cancelled, suspended or revoked, perjury under K.S.A. 8-261a, a fraudulent application under K.S.A. 8-142 Fifth, a felony in which a motor vehicle was used, failing to stop at an accident scene, driving without motor vehicle liability insurance under K.S.A. 40-3104, or a violation of former K.S.A. 21-3405b. That is the petitioner's own position.";
    case "dui_first":
      return "The petitioner states that the ordinance violation would also have constituted a first violation of K.S.A. 8-1567, driving under the influence. That is the petitioner's own position.";
    default:
      return "The petitioner states that the ordinance violation would also have constituted a second or subsequent violation of K.S.A. 8-1567, driving under the influence. K.S.A. 12-4516(e) applies to violations committed on or after 1 July 2006, and the municipal section has no equivalent of the seven-year window in K.S.A. 21-6614(d)(3). That is the petitioner's own position.";
  }
}

// ---------------------------------------------------------------------------
// ks-12-4516a-municipal-arrest — K.S.A. 12-4516a
// ---------------------------------------------------------------------------

const KS_GROUND_SENTENCES: Readonly<Record<string, string>> = {
  mistaken_identity:
    "The petitioner states that the arrest occurred because of mistaken identity. K.S.A. 12-4516a(c) makes that a ground on which the Court shall order the expungement.",
  no_probable_cause:
    "The petitioner states that a court found there was no probable cause for the arrest. K.S.A. 12-4516a(c) makes that a ground on which the Court shall order the expungement.",
  found_not_guilty:
    "The petitioner states that the petitioner was found not guilty on the ordinance charge. K.S.A. 12-4516a(c) makes that a ground on which the Court shall order the expungement.",
  prohibited_ordinance:
    "The petitioner states that the arrest was for a violation of an ordinance prohibited by K.S.A. 12-16,134(a) or (b), adopted before 1 July 2014. K.S.A. 12-4516a(c) makes that a ground on which the Court shall order the expungement.",
  best_interests_of_justice:
    "The petitioner states that the charges have been dismissed, or that no charges have been or are likely to be filed, and asks the Court to find that expungement would be in the best interests of justice. Whether it would be is the Court's determination and not the petitioner's."
};

function deriveArrestFacts(answers: Answers): Record<string, string> {
  const trackId = KS_ARREST_TRACK_ID;

  const cityAndCourt = need(trackId, answers, "cityAndCourt");
  const fullLegalName = need(trackId, answers, "fullLegalName");
  const nameAtTimeOfArrest = need(trackId, answers, "nameAtTimeOfArrest");
  const sexRaceDateOfBirth = need(trackId, answers, "sexRaceDateOfBirth");
  const arrestDate = need(trackId, answers, "arrestDate");
  const arrestingAgency = need(trackId, answers, "arrestingAgency");
  const ordinanceCharged = need(trackId, answers, "ordinanceCharged");

  if (UNKNOWN_ANSWER.test(cityAndCourt)) {
    stop(
      "ks-venue-not-identified",
      trackId,
      "Which Kansas city's municipal court the ordinance charge was brought in has not been identified. K.S.A. 12-4516a(a) directs the petition to that court and to no other, and the caption names it.",
      KS_MUNICIPAL_CLERK_REFERRAL,
      "Find the city and court from the citation, the bond paperwork or the arresting agency, and answer again."
    );
  }

  if (yesNo(trackId, answers, "convictedOrDiverted")) {
    stop(
      "ks-conviction-route-applies",
      trackId,
      "The petitioner was convicted, or completed a diversion, on this ordinance charge. K.S.A. 12-4516a reaches an arrest record; a municipal conviction or a fulfilled municipal diversion runs under K.S.A. 12-4516 instead, with its own petition contents and its own elapsed periods. Filing the arrest petition on a conviction would be filing under the wrong section.",
      KS_CONVICTION_ROUTE_REFERRAL,
      "Use the Kansas municipal conviction route instead. It asks a different set of questions because the section imposes a different set of conditions."
    );
  }

  const localForm = resolveLocalForm(trackId, answers);

  const ground = branch(
    trackId,
    "statutoryGround",
    need(trackId, answers, "statutoryGround"),
    KS_ARREST_GROUNDS
  );
  if (ground === "not_sure") {
    stop(
      "ks-ground-not-settled",
      trackId,
      "Which of the five grounds in K.S.A. 12-4516a(c) is relied on has not been settled. The section gives exactly five — mistaken identity, a court finding of no probable cause, an acquittal, a K.S.A. 12-16,134 prohibited ordinance, and best interests of justice where charges have been dismissed or none have been or are likely to be filed — and the design records the choice among them as the petitioner's own position rather than one LegalEase decides.",
      KS_MUNICIPAL_CLERK_REFERRAL,
      "Get whatever municipal court record exists showing how the charge ended, read it against the five grounds, and answer again."
    );
  }

  const identityTheftVictim = yesNo(trackId, answers, "identityTheftVictim");
  const participantAccount = str(answers, "participantAccount");
  if (ground === "best_interests_of_justice" && !participantAccount) {
    stop(
      "ks-best-interests-account-missing",
      trackId,
      "The best-interests-of-justice ground is relied on and the petitioner has said nothing in support of it. That ground is the only one of the five that asks the Court to weigh anything, the design makes the account the petitioner's own words, and LegalEase never composes it. A petition asking for a discretionary finding with nothing behind it asks the Court to supply the reasons.",
      KS_LAWYER_REFERRAL,
      "Write, in your own words, why expungement matters to you and why it would be in the interests of justice. If you want help making that case, that is what a lawyer is for."
    );
  }
  if (
    participantAccount &&
    /\b(write (it|this|one) for me|you write|legalease (should |can )?write|make something up|whatever you think)\b/i.test(
      participantAccount
    )
  ) {
    stop(
      "ks-account-not-petitioners-own",
      trackId,
      "The best-interests account was left to LegalEase to compose. The design records it as the petitioner's own words, and a discretionary ground argued in somebody else's words is not the petitioner's application.",
      KS_LAWYER_REFERRAL,
      "Write it in your own words, or take the ground to a lawyer."
    );
  }

  return {
    cityAndCourt,
    fullLegalName,
    nameAtTimeOfArrest,
    sexRaceDateOfBirth,
    arrestDate,
    arrestingAgency,
    ordinanceCharged,
    statutoryGround: ground,
    convictedOrDiverted: "no",
    identityTheftVictim: identityTheftVictim ? "yes" : "no",
    localFormPublished: localForm,
    participantAccount,

    petitionerName: fullLegalName,
    municipalCity: municipalCityOf(cityAndCourt),
    courtLine: `IN THE MUNICIPAL COURT OF ${municipalCityOf(cityAndCourt).toUpperCase()}, KANSAS`,
    caseIdentification: `The case, as the petitioner identifies it, is: ${cityAndCourt}`,
    // K.S.A. 12-4516a(b) prescribes the six contents, in the section's order.
    contentFullName: `The petitioner's full name is ${fullLegalName}.`,
    contentPriorName: `The petitioner's full name at the time of the arrest was: ${nameAtTimeOfArrest}`,
    contentIdentifiers: `The petitioner states the sex, race and date of birth this petition is to carry as: ${sexRaceDateOfBirth}. K.S.A. 12-4516a(b) prescribes those three items and this petition states them because the section requires them.`,
    contentOffence: `The crime for which the petitioner was arrested is the city ordinance violation stated as: ${ordinanceCharged}`,
    contentDate: `The petitioner states the date of arrest as ${arrestDate}.`,
    contentAuthority: `The arresting law enforcement agency, as the petitioner states it, is: ${arrestingAgency}`,
    groundStatement: KS_GROUND_SENTENCES[ground],
    accountStatement: participantAccount
      ? `The petitioner states, in the petitioner's own words: ${participantAccount}`
      : "The petitioner relies on a ground that does not ask the Court to weigh the petitioner's circumstances, and makes no statement of them here.",
    feeStatement: identityTheftVictim
      ? "The petitioner states that the arrest was a result of the petitioner being a victim of identity theft under K.S.A. 21-6107 or its predecessor. K.S.A. 12-4516a(b) provides that no fee may be charged as costs to such a person. That exemption applies by its own terms; the petitioner asks the clerk to apply it."
      : "A municipal court may prescribe a fee to be charged as costs under K.S.A. 12-4516a(b). No amount is stated in this petition, because the amount varies court by court and there is no statewide figure. The petitioner asks the clerk what this court charges.",
    proposedOrderCondition: localForm === "no_form_wants_proposed_order" ? "yes" : "",
    packetCaseReference: "Kansas municipal arrest expungement"
  };
}

// ---------------------------------------------------------------------------
// Fact derivation entry point
// ---------------------------------------------------------------------------

/**
 * Turns the participant's answers into the fact bag the templates read.
 *
 * Fails closed on anything the adopted design treats as a stop, on any court
 * that publishes its own instrument, and on any attempt to supply outside-party
 * content.
 */
export function deriveKansasFacts(trackId: string, answers: Answers): Record<string, string> {
  if (!KS_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new KansasBranchError(trackId, "trackId", trackId, KS_ASSIGNED_TRACK_IDS);
  }
  refuseOutsidePartyContent(trackId, answers);
  screenRouting(trackId, answers);
  return trackId === KS_CONVICTION_TRACK_ID ? deriveConvictionFacts(answers) : deriveArrestFacts(answers);
}

// ---------------------------------------------------------------------------
// Shared template language
// ---------------------------------------------------------------------------

type Section = {
  heading?: string;
  numbered: boolean;
  paragraphs: readonly string[];
};

function caption(documentTitle: string) {
  return {
    courtLine: "{{courtLine}}",
    partyBlockLeft: ["IN THE MATTER OF THE PETITION OF", "", "{{petitionerName}},", "", "Petitioner."],
    partyBlockRight: ["Case No. ______________________", "", documentTitle]
  };
}

const LOCAL_FALLBACK_PARAGRAPH =
  "This petition is a statewide fallback. Kansas has hundreds of municipal courts and no unified forms regime: some publish their own expungement instrument and some, Wichita among them, govern expungement by charter ordinance rather than by the section this petition runs on. This document is drafted for a court that publishes nothing. The clerk of the court has been asked and has said so; if that changes, use the court's own instrument instead.";

const WHAT_THIS_IS_SECTION: Section = {
  heading: "WHAT THIS DOCUMENT IS, AND WHAT IT IS NOT",
  numbered: false,
  paragraphs: [
    "It is a petition prepared for a self-represented person from that person's own answers. LegalEase has seen no court record, has decided nothing, represents nobody and has filed nothing.",
    "It is not a filing until it is filed, and it is not an order. Nothing in it has been granted, agreed, certified or decided by anybody.",
    LOCAL_FALLBACK_PARAGRAPH,
    "It states no filing fee. The municipal court may prescribe a fee to be charged as costs, the amount varies court by court and there is no statewide figure, so no amount is printed here. Ask the clerk what this court charges.",
    "The case number is blank. Municipal caption conventions vary, the clerk controls the docket entry, and an arrest with no charge may have no case number at all. Write in whatever the clerk tells you, by hand, on every document in this packet."
  ]
};

const COURT_DOES_THIS_SECTION: Section = {
  heading: "WHAT THE COURT DOES NEXT, AND WHAT THE PETITIONER DOES NOT",
  numbered: false,
  paragraphs: [
    "On the filing of this petition the Court sets a date for a hearing and CAUSES NOTICE TO BE GIVEN to the prosecuting attorney and to the arresting law enforcement agency. The petitioner does not serve anybody, and no certificate of service is part of this packet because none is called for.",
    "At the hearing, any person who may have relevant information about the petitioner may testify, and the Court may inquire into the petitioner's background.",
    "The hearing date, the time and the courtroom are the Court's to fix and are left blank here.",
    "If the Court orders the expungement, the clerk sends a certified copy of the order to the Kansas Bureau of Investigation. That is the clerk's step, not the petitioner's and not LegalEase's."
  ]
};

const NOT_ASSERTED_SECTION: Section = {
  heading: "WHAT THIS PETITION DOES NOT SAY",
  numbered: false,
  paragraphs: [
    "It does not say that the petitioner is entitled to the expungement. The findings are the Court's, and this petition asks the Court to make them.",
    "It does not say that any elapsed period has run. It states the dates the petitioner gave and leaves the computation to the Court.",
    "It does not classify the ordinance against the Kansas criminal code. Where this petition states what an ordinance violation would also have constituted, it is stating the petitioner's own position, taken from the ordinance and the case papers.",
    "It says nothing about immigration, firearm rights, professional licensing, or offender registration. Those consequences are outside this packet, and a document that guessed at them would be worse than one that is silent.",
    "Nobody at LegalEase has read the municipal court file, the ordinance or any disposition record in this matter, and nothing here should be read as though somebody had."
  ]
};

const SIGNATURE_BLOCK: readonly string[] = [
  "{{petitionerName}}, Petitioner, self-represented",
  "",
  "Sign and date this by hand, in your own name, after you have read it.",
  "Date: ______________________",
  "Address: ___________________________________________",
  "Telephone: _________________________________________",
  "",
  "K.S.A. 12-4516 and K.S.A. 12-4516a impose no verification requirement. A particular municipal court may; ask the clerk whether this petition must be sworn before you sign it."
];

/** The court signs. Every line here stays blank on the generated document. */
const ORDER_SIGNATURE_BLOCK: readonly string[] = [
  "",
  "_____________________________________",
  "JUDGE OF THE MUNICIPAL COURT",
  "",
  "Date: ______________________",
  "",
  "The findings and the signature above are the Court's. They are printed blank, and LegalEase has made no finding and signed nothing."
];

function stopSection(extra: readonly string[]): Section {
  return {
    heading: "WHERE THIS PACKET STOPS",
    numbered: false,
    paragraphs: [
      "LegalEase prepares documents from what the petitioner says. It gives no legal advice, reads no court record, decides no eligibility question, files nothing and speaks to no office.",
      ...extra,
      "The city prosecutor opposing the petition, or the municipal court setting a contested evidentiary hearing. The initial packet still generates; what happens after that needs a lawyer.",
      "A municipal court that governs expungement by charter ordinance on terms that differ from the section this petition runs on, as Wichita does under Charter Ordinance No. 224.",
      "Nothing in this packet addresses immigration, firearm rights, professional licensing or offender registration, so any question that turns on one of them stops here.",
      `Where any of these applies, speak to a lawyer before filing anything. ${KS_LAWYER_REFERRAL}`
    ]
  };
}

/** What an expungement does, and the carve-outs that survive it. */
const EFFECT_SECTION: Section = {
  heading: "WHAT AN ORDER WOULD AND WOULD NOT DO",
  numbered: false,
  paragraphs: [
    "On an expungement the petitioner is treated as not having been arrested, convicted or diverted, subject to an enumerated list of contexts in which the arrest, conviction or diversion must still be disclosed. The section carries that list; this packet does not reproduce it, and the petitioner should read it before relying on the order in any application.",
    "Expunged municipal records may still be released to a criminal justice agency with a legitimate need for them.",
    "An order reaches the records the order names. It does not reach a district court record, a federal record or another state's record."
  ]
};

// ---------------------------------------------------------------------------
// ks-12-4516-municipal templates
// ---------------------------------------------------------------------------

const CONVICTION_PETITION: PleadingTemplate = {
  templateId: "ks-12-4516-municipal-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("PETITION FOR EXPUNGEMENT"),
  title:
    "PETITION FOR EXPUNGEMENT OF A MUNICIPAL CONVICTION OR DIVERSION — K.S.A. 12-4516",
  preamble:
    "The petitioner, appearing without a lawyer, petitions this Court under K.S.A. 12-4516 to expunge the conviction or diversion described below and the arrest records related to it, and states as follows.",
  sections: [
    WHAT_THIS_IS_SECTION,
    {
      heading: "I.  THE SIX THINGS K.S.A. 12-4516(g)(1) REQUIRES THIS PETITION TO STATE",
      numbered: true,
      paragraphs: [
        "{{contentFullName}}",
        "{{contentPriorName}}",
        "{{contentIdentifiers}}",
        "{{contentOffence}}",
        "{{contentDate}}",
        "{{contentAuthority}}",
        "{{caseIdentification}}"
      ]
    },
    {
      heading: "II.  THE ROUTE AND THE ELAPSED PERIOD",
      numbered: true,
      paragraphs: [
        "{{dispositionSentence}}",
        "{{equivalenceStatement}}",
        "{{periodStatement}}",
        "{{costsStatement}}"
      ]
    },
    {
      heading: "III.  THE THREE FINDINGS THE COURT IS ASKED TO MAKE",
      numbered: true,
      paragraphs: [
        "K.S.A. 12-4516(h) requires three findings, and three only: that the petitioner has not been convicted of a felony in the past two years and that no proceeding is pending or being instituted against the petitioner; that the circumstances and behaviour of the petitioner warrant the expungement; and that the expungement is consistent with the public welfare. There is no firearms finding on this route, because a municipal ordinance conviction is not a felony.",
        "The petitioner states that the petitioner has not been convicted of a felony in the past two years and that no such proceeding is pending or being instituted.",
        "On the second and third findings the petitioner offers the petitioner's own account, which follows. It was written by the petitioner and is reproduced without change; nobody else composed it, and the petitioner does not state that either finding is made out.",
        "{{accountStatement}}"
      ]
    },
    COURT_DOES_THIS_SECTION,
    EFFECT_SECTION,
    NOT_ASSERTED_SECTION,
    stopSection([
      "Any dispute about whether the ordinance violation would also have constituted a listed Kansas offence. That answer sets the elapsed period and it is the petitioner's own; a disputed one stops here.",
      "A felony conviction within the past two years, or any felony proceeding pending or being instituted.",
      "An ordinance violation that would also have constituted commercial driving under the influence under K.S.A. 8-2,144, which K.S.A. 12-4516(f) excludes outright.",
      "A district court conviction or diversion, which runs under K.S.A. 21-6614 and is not a municipal matter."
    ])
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the Court to set this petition for hearing, to cause notice to be given as K.S.A. 12-4516(g)(1) directs and, on the findings K.S.A. 12-4516(h) requires, to order the expungement of the conviction or diversion described above and of the arrest records related to it.",
    "Nothing in this petition reports a decision by anyone. It asks."
  ],
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: SIGNATURE_BLOCK
};

const CONVICTION_ORDER: PleadingTemplate = {
  templateId: "ks-12-4516-municipal-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("PROPOSED ORDER OF EXPUNGEMENT"),
  title: "PROPOSED ORDER OF EXPUNGEMENT — K.S.A. 12-4516",
  preamble:
    "This proposed order is tendered for the Court's consideration with the petition it accompanies, because the clerk of this Court has said the Court expects one and publishes none of its own. It has been granted by nobody and signed by nobody.",
  sections: [
    {
      numbered: false,
      paragraphs: [
        "Every finding, every signature and every date below is left blank for the Court. Nothing on this page has been decided.",
        "THIS MATTER came before the Court on the petition of {{petitionerName}} under K.S.A. 12-4516 to expunge the conviction or diversion described in the petition and the arrest records related to it.",
        "The petition states the matters K.S.A. 12-4516(g)(1) requires: the petitioner's full name; the full name at the time of the arrest, conviction or diversion; the sex, race and date of birth the petition carries; the ordinance violation; the date of the conviction or diversion; and the convicting court, the arresting law enforcement agency or the diverting authority.",
        "The Court having set the matter for hearing and caused notice to be given to the prosecuting attorney and the arresting law enforcement agency, and having considered the petition and any information offered at the hearing, FINDS:",
        "(  ) that the petitioner has not been convicted of a felony in the past two years and that no proceeding is pending or being instituted against the petitioner;",
        "(  ) that the circumstances and behaviour of the petitioner warrant the expungement; and",
        "(  ) that the expungement is consistent with the public welfare.",
        "",
        "IT IS THEREFORE ORDERED that the conviction or diversion described in the petition, and the arrest records related to it, be expunged.",
        "IT IS FURTHER ORDERED that the clerk of this Court send a certified copy of this order to the Kansas Bureau of Investigation.",
        "This order does not state what the expungement does to the petitioner's status beyond what K.S.A. 12-4516 provides, and nothing is imported here from any other section."
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: ORDER_SIGNATURE_BLOCK
};

// ---------------------------------------------------------------------------
// ks-12-4516a-municipal-arrest templates
// ---------------------------------------------------------------------------

const ARREST_PETITION: PleadingTemplate = {
  templateId: "ks-12-4516a-municipal-arrest-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("PETITION FOR EXPUNGEMENT OF ARREST RECORD"),
  title:
    "PETITION FOR EXPUNGEMENT OF A CITY ORDINANCE ARREST RECORD — K.S.A. 12-4516a",
  preamble:
    "The petitioner, appearing without a lawyer, petitions this Court under K.S.A. 12-4516a to expunge the arrest record described below and the subsequent court proceedings related to it, and states as follows.",
  sections: [
    WHAT_THIS_IS_SECTION,
    {
      heading: "I.  THE SIX THINGS K.S.A. 12-4516a(b) REQUIRES THIS PETITION TO STATE",
      numbered: true,
      paragraphs: [
        "{{contentFullName}}",
        "{{contentPriorName}}",
        "{{contentIdentifiers}}",
        "{{contentOffence}}",
        "{{contentDate}}",
        "{{contentAuthority}}",
        "{{caseIdentification}}"
      ]
    },
    {
      heading: "II.  THE GROUND RELIED ON",
      numbered: true,
      paragraphs: [
        "K.S.A. 12-4516a(c) gives five grounds and no others: that the arrest occurred because of mistaken identity; that a court found there was no probable cause for the arrest; that the petitioner was found not guilty; that the arrest was for a violation of an ordinance prohibited by K.S.A. 12-16,134(a) or (b) adopted before 1 July 2014; or that expungement would be in the best interests of justice and charges have been dismissed or no charges have been or are likely to be filed.",
        "{{groundStatement}}",
        "{{accountStatement}}",
        "Where the best-interests-of-justice ground is relied on, K.S.A. 12-4516a(e) requires the Court to determine whether the records should nonetheless remain available for the purposes the subsection enumerates. That determination is the Court's."
      ]
    },
    {
      heading: "III.  THE COSTS, AND THE IDENTITY-THEFT EXEMPTION",
      numbered: true,
      paragraphs: [
        "{{feeStatement}}",
        "K.S.A. 12-4516a states no elapsed period of any kind. There is no waiting period on this route."
      ]
    },
    {
      heading: "IV.  WHAT FILING THIS PETITION DOES TO THE COURT FILE",
      numbered: false,
      paragraphs: [
        "On the filing of this petition the official court file is separated from the other records of the Court, and it is disclosed only to a judge of the Court and members of the staff designated by the judge, the prosecuting attorney, the arresting law enforcement agency, or any other person when authorised by a court order.",
        "That separation happens on filing, before any hearing and before any order."
      ]
    },
    COURT_DOES_THIS_SECTION,
    EFFECT_SECTION,
    NOT_ASSERTED_SECTION,
    stopSection([
      "A conviction or a fulfilled diversion on the ordinance charge, which puts the matter on the municipal conviction route under K.S.A. 12-4516 instead.",
      "Any dispute on the facts about mistaken identity or about a court's finding of no probable cause.",
      "An arrest on a state law violation rather than a city ordinance, which runs under K.S.A. 22-2410 in the district court."
    ])
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the Court to set this petition for hearing, to cause notice to be given as K.S.A. 12-4516a(b) directs and, on the ground stated above, to order the arrest record and the subsequent court proceedings related to it expunged.",
    "Nothing in this petition reports a decision by anyone. It asks."
  ],
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: SIGNATURE_BLOCK
};

const ARREST_ORDER: PleadingTemplate = {
  templateId: "ks-12-4516a-municipal-arrest-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("PROPOSED ORDER OF EXPUNGEMENT"),
  title: "PROPOSED ORDER OF EXPUNGEMENT OF AN ARREST RECORD — K.S.A. 12-4516a",
  preamble:
    "This proposed order is tendered for the Court's consideration with the petition it accompanies, because the clerk of this Court has said the Court expects one and publishes none of its own. It has been granted by nobody and signed by nobody.",
  sections: [
    {
      numbered: false,
      paragraphs: [
        "Every finding, every signature and every date below is left blank for the Court. Nothing on this page has been decided.",
        "THIS MATTER came before the Court on the petition of {{petitionerName}} under K.S.A. 12-4516a to expunge the arrest record described in the petition and the subsequent court proceedings related to it.",
        "The petition states the matters K.S.A. 12-4516a(b) requires: the petitioner's full name; the full name at the time of the arrest; the sex, race and date of birth the petition carries; the crime for which the petitioner was arrested; the date of the arrest; and the arresting law enforcement agency.",
        "The ground stated in the petition is:",
        "{{groundStatement}}",
        "The Court having set the matter for hearing and caused notice to be given to the prosecuting attorney and the arresting law enforcement agency, and having considered the petition and any information offered at the hearing, FINDS that the ground stated is established:",
        "(  ) mistaken identity;",
        "(  ) a court found no probable cause for the arrest;",
        "(  ) the petitioner was found not guilty;",
        "(  ) the arrest was for a violation of an ordinance prohibited by K.S.A. 12-16,134(a) or (b) adopted before 1 July 2014;",
        "(  ) expungement is in the best interests of justice and charges have been dismissed or no charges have been or are likely to be filed.",
        "",
        "IT IS THEREFORE ORDERED that the arrest record described in the petition, and the subsequent court proceedings related to it, be expunged.",
        "IT IS FURTHER ORDERED that the clerk of this Court send a certified copy of this order to the Kansas Bureau of Investigation.",
        "Where the finding is made on the best-interests ground, the Court determines under K.S.A. 12-4516a(e) whether the records should nonetheless remain available for the purposes that subsection enumerates. That determination is left blank for the Court."
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: ORDER_SIGNATURE_BLOCK
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const KS_CUSTOM_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [CONVICTION_PETITION.templateId]: CONVICTION_PETITION,
  [CONVICTION_ORDER.templateId]: CONVICTION_ORDER,
  [ARREST_PETITION.templateId]: ARREST_PETITION,
  [ARREST_ORDER.templateId]: ARREST_ORDER
};

// ---------------------------------------------------------------------------
// Packet sets and tracks
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * Design role → engine role.
 *
 * Both design roles map straight onto the closed twelve-value engine type. The
 * mapping is stated here and asserted by the verifier rather than left implicit.
 */
export const KS_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order"
};

/** The design role on these routes that this lane does not produce. */
export const KS_EXCLUDED_COMPONENT_ROLES: readonly { role: string; strategy: string }[] = [
  { role: "process_guidance", strategy: "process_guidance" }
];

/**
 * The fact key that decides whether the conditional proposed order renders.
 *
 * Set only where the clerk said the court expects a proposed order and publishes
 * none of its own — which is the design's condition, both limbs of it.
 */
export const KS_PROPOSED_ORDER_CONDITION_KEY = "proposedOrderCondition";

function packetSetFor(trackId: string, petitionId: string, orderId: string): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId: `${trackId}-primary-filing-1`,
        role: KS_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: petitionId,
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
        role: KS_DESIGN_ROLE_TO_ENGINE_ROLE.proposed_order,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: orderId,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide",
        requirement: "conditional",
        conditionKey: KS_PROPOSED_ORDER_CONDITION_KEY,
        order: 2,
        approval: PENDING_APPROVAL,
        version: VERSION
      }
    ]
  };
}

const CONVICTION_INPUTS: readonly RequiredInput[] = [
  {
    key: "cityAndCourt",
    label: "Which Kansas city's municipal court handled the case, and what is the case number?",
    required: true
  },
  { key: "fullLegalName", label: "What is your full legal name?", required: true },
  {
    key: "nameAtTimeOfCase",
    label:
      "What was your full name at the time of the arrest, conviction or diversion, if different from your name now?",
    required: true
  },
  {
    key: "sexRaceDateOfBirth",
    label:
      "What sex, race and date of birth should the petition state? K.S.A. 12-4516(g)(1) requires the petition to state all three.",
    required: true
  },
  {
    key: "dispositionType",
    label:
      "Were you convicted of the ordinance violation, or did you complete a diversion agreement? Answer conviction or diversion.",
    required: true
  },
  {
    key: "ordinanceViolation",
    label: "Which city ordinance were you convicted of violating, or diverted for?",
    required: true
  },
  {
    key: "stateEquivalentOffense",
    label:
      "Would that ordinance violation also have been a violation of a Kansas statute? Answer none; prohibited ordinance; prostitution with proven coercion; listed five year; DUI first; DUI second or subsequent; commercial DUI; or not sure. This one answer sets the waiting period and the answer is yours.",
    required: true
  },
  { key: "offenseCommittedDate", label: "On what date was the offence committed?", required: true },
  {
    key: "convictionOrDiversionDate",
    label: "On what date were you convicted, or on what date did you enter the diversion agreement?",
    required: true
  },
  {
    key: "completionDate",
    label:
      "On what date did you satisfy the sentence, get discharged from probation, parole or a suspended sentence, or fulfil the diversion terms, whichever came latest?",
    required: true
  },
  { key: "arrestingAgency", label: "Which law enforcement agency arrested you?", required: true },
  {
    key: "divertingAuthority",
    label:
      "Which authority granted the diversion? Asked only where the case was resolved by a diversion agreement, because K.S.A. 12-4516(g)(1) requires the petition to identify it.",
    required: false
  },
  {
    key: "felonyLastTwoYears",
    label:
      "Have you been convicted of a felony in the past two years, or is any felony proceeding pending or being instituted against you? Answer yes or no.",
    required: true
  },
  {
    key: "costsAndFinesPaid",
    label:
      "Have all court costs and fines in the case been paid? Answer yes or no. Some municipal courts require you to say so in the petition.",
    required: true
  },
  {
    key: "localFormPublished",
    label:
      "What did the municipal court clerk say when you asked whether that court publishes its own expungement form? Answer publishes own form; no form, wants a proposed order; no form, petition only; or have not asked.",
    required: true
  },
  {
    key: "participantAccount",
    label:
      "In your own words: what has changed in your circumstances and behaviour since the case, and why does expungement matter to you now? Two of the three findings turn on this and LegalEase never writes it for you.",
    required: true
  }
];

const ARREST_INPUTS: readonly RequiredInput[] = [
  {
    key: "cityAndCourt",
    label:
      "Which Kansas city's municipal court handled the charge, and what is the case number if one exists?",
    required: true
  },
  { key: "fullLegalName", label: "What is your full legal name?", required: true },
  {
    key: "nameAtTimeOfArrest",
    label: "What was your full name at the time of the arrest, if different from your name now?",
    required: true
  },
  {
    key: "sexRaceDateOfBirth",
    label:
      "What sex, race and date of birth should the petition state? K.S.A. 12-4516a(b) requires the petition to state all three.",
    required: true
  },
  { key: "arrestDate", label: "On what date were you arrested?", required: true },
  { key: "arrestingAgency", label: "Which law enforcement agency arrested you?", required: true },
  {
    key: "ordinanceCharged",
    label: "Which city ordinance were you arrested for violating?",
    required: true
  },
  {
    key: "statutoryGround",
    label:
      "Which one of the five grounds applies: mistaken identity; no probable cause; found not guilty; prohibited ordinance; or best interests of justice? The choice is yours and LegalEase does not make it.",
    required: true
  },
  {
    key: "convictedOrDiverted",
    label:
      "Were you convicted, or did you complete a diversion, on this ordinance charge? Answer yes or no. If yes, the municipal conviction route applies instead.",
    required: true
  },
  {
    key: "identityTheftVictim",
    label:
      "Were you arrested as a result of being a victim of identity theft? Answer yes or no. If yes, the municipal court may not charge you a fee.",
    required: true
  },
  {
    key: "localFormPublished",
    label:
      "What did the municipal court clerk say when you asked whether that court publishes its own expungement form? Answer publishes own form; no form, wants a proposed order; no form, petition only; or have not asked.",
    required: true
  },
  {
    key: "participantAccount",
    label:
      "If you are relying on the best-interests-of-justice ground, tell us in your own words why expungement matters to you. Required on that ground only, and never written for you.",
    required: false
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

export const KS_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "KS",
    trackId: KS_CONVICTION_TRACK_ID,
    publicName: "Clearing a Kansas city ordinance conviction or diversion",
    mechanism: "municipal_conviction_or_diversion_expungement",
    authority: "K.S.A. 12-4516",
    recordTypes: [
      "kansas_municipal_court_conviction",
      "kansas_municipal_diversion_agreement",
      "arrest_records_related_to_that_case"
    ],
    dispositions: [
      "conviction_of_a_city_ordinance_violation",
      "fulfilled_diversion_agreement_based_on_a_city_ordinance_violation"
    ],
    courtLevel: "the_convicting_kansas_municipal_court",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSetFor(
      KS_CONVICTION_TRACK_ID,
      CONVICTION_PETITION.templateId,
      CONVICTION_ORDER.templateId
    ),
    requiredInputs: CONVICTION_INPUTS,
    statuses: { ...statuses, runtime },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "ks-municipal-conviction-expungement",
    assembledPacketTitle: "Kansas municipal expungement — K.S.A. 12-4516",
    customerDeliverableDescription:
      "A petition to the convicting Kansas municipal court under K.S.A. 12-4516, pleading the six items subsection (g)(1) prescribes, with a proposed order tendered only where the clerk has said that court expects one and publishes none of its own. The elapsed period — none, one, three, five or ten years — follows the participant's own statement of what the ordinance violation would also have constituted, and the petition states the dates without asserting that any period has run. LegalEase writes none of the three findings and does not write the participant's showing on the two that turn on their circumstances: it prompts for their own words and reproduces them without change.",
    notes:
      "The drafted pleading is a statewide fallback. Where the municipal court publishes its own instrument or governs by charter ordinance, as Wichita does, the route stops and sends the participant to that instrument; where the clerk has not been asked, it stops and sends them to the clerk. The court sets the hearing and causes notice to be given, so the participant serves nobody and there is no certificate of service."
  },
  {
    jurisdiction: "KS",
    trackId: KS_ARREST_TRACK_ID,
    publicName: "Clearing a Kansas city ordinance arrest record",
    mechanism: "municipal_arrest_record_expungement",
    authority: "K.S.A. 12-4516a",
    recordTypes: [
      "city_ordinance_arrest_record",
      "subsequent_municipal_court_proceedings_related_to_that_arrest"
    ],
    dispositions: [
      "arrested_by_mistaken_identity",
      "no_probable_cause_found_by_a_court",
      "found_not_guilty",
      "charges_dismissed",
      "no_charges_filed_or_likely_to_be_filed",
      "arrest_on_an_ordinance_prohibited_by_12_16_134"
    ],
    courtLevel: "the_kansas_municipal_court_where_the_ordinance_charge_was_brought",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSetFor(
      KS_ARREST_TRACK_ID,
      ARREST_PETITION.templateId,
      ARREST_ORDER.templateId
    ),
    requiredInputs: ARREST_INPUTS,
    statuses: { ...statuses, runtime },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "ks-municipal-arrest-expungement",
    assembledPacketTitle: "Kansas municipal arrest expungement — K.S.A. 12-4516a",
    customerDeliverableDescription:
      "A petition to the Kansas municipal court where the city ordinance charge was brought, under K.S.A. 12-4516a, pleading the six items subsection (b) prescribes and the one statutory ground the participant relies on, with a proposed order tendered only where the clerk has said that court expects one. There is no waiting period on this route. The identity-theft fee exemption is stated where it applies, the separation of the official court file on filing is explained, and the choice among the five grounds is recorded as the participant's own rather than made for them.",
    notes:
      "A participant who was convicted or completed a diversion on the ordinance charge is routed to K.S.A. 12-4516 instead, which the design makes a hard gate. The best-interests ground is the only one that asks the court to weigh anything, so it is the only one that requires the participant's own account, and LegalEase never composes it."
  }
];
