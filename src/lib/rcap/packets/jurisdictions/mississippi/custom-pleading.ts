// Mississippi record clearing — custom-pleading implementation.
//
// Three assigned routes, nine assigned custom-pleading components. Each route
// produces the same three participant-facing instruments — a petition, a
// proposed order and a certificate of service — drawn to its own statute:
//
//   ms-drug-cd  Miss. Code Ann. § 41-29-150(d)(1) and (d)(2). A first eligible
//               possession or paraphernalia case handled WITHOUT a judgment of
//               guilt: proceedings deferred, probation, then discharge and
//               dismissal, after which the person may APPLY for expungement.
//               The court determines the application after hearing. Once only,
//               with a nonpublic record retained for the next eligibility check.
//
//   ms-dui      Miss. Code Ann. § 63-11-30(13). First-offence DUI expungement,
//               entirely separate from the ordinary misdemeanour route, subject
//               to seven conditions every one of which must be met, and
//               discretionary even then. Venue is the CIRCUIT COURT of the
//               county of conviction — not the court that entered the
//               conviction — which the design calls the single most likely way
//               a Mississippi DUI petition is filed in the wrong court.
//
//   ms-mip      Miss. Code Ann. § 67-3-70(6). Underage alcohol purchase or
//               possession, and the underage false-age offence. Reaches anyone
//               CHARGED with a subsection (1) or (2) violation, so a dismissed
//               case qualifies as well as a conviction, and relief is MANDATORY
//               on the findings. It does not reach subsection (3), furnishing
//               to a minor, which is an adult offence.
//
// The `attachment` and `instructions` components the design assigns beside them
// on all three routes are `process_guidance` and belong to the guidance lane.
// They are named here as excluded, and nothing in this module produces them.
//
// **Mississippi has no statewide expungement form.** That is why these routes
// are custom pleading at all. The four archived Mississippi PDFs are Fourth
// Circuit Court District local models covering Leflore, Sunflower and Washington
// counties, and the adopted design keeps them reference-only. Nothing here
// inherits their defects: no three-county field, no Greenville district attorney
// address, no 2020 dates, no mandatory grand-jury allegation, no race field, no
// social security number, no certificate of service captioned for a different
// document, and no § 99-15-26 / § 99-19-71 dual citation. Court, court level,
// county or city, cause number and prosecuting authority are participant data on
// every document.
//
// **What LegalEase must not generate**, from the design's own list, and enforced
// by both the copy and the verifier: that the petitioner meets the criteria for
// expungement, which is the court's finding; that the offence is an
// "expungeable offense", which the Fourth District caption block prints as
// though it were a data field; that the petitioner is a first offender; that the
// petitioner is rehabilitated; that a dismissal was with prejudice; any
// statement about immigration, firearms, federal records or professional
// licensing consequences; and any assertion that a record will be erased
// everywhere. No document prints a fee amount, because § 99-19-72's fee reaches
// petitions under § 99-19-71 and does not reach § 41-29-150, § 63-11-30 or
// § 67-3-70 by its terms, and the amount question is an open release blocker.
//
// **Two boundaries specific to Mississippi practice.** The APPROVED AS TO FORM
// block for the prosecuting authority is printed on every proposed order and is
// never pre-signed: obtaining that approval is, in the design's words, the
// practical gate on the entire Mississippi product, and it is a negotiation
// LegalEase does not conduct. And local practice in the twenty-one circuit
// districts other than the Fourth was never surveyed, so every route carries the
// mandatory clerk-contact instruction rather than an assumption about the
// accepted document.
//
// **Two places where the design's boilerplate and its track-specific findings
// pull in different directions, resolved conservatively and said out loud.**
//
//   1. The proposed-order component note, which is identical on all three
//      routes, describes an order carrying "the restoration and perjury-
//      protection language". Those clauses come from § 99-19-71 and from the
//      Fourth District models. The ms-mip limitations expressly forbid importing
//      them, because § 67-3-70 "contains no restoration-of-status clause, no
//      perjury-protection clause and no Title 63 carve-out". Neither § 41-29-150
//      nor § 63-11-30 supplies them either. So no proposed order here recites
//      them: writing them in would be inventing local language, which the job's
//      stop condition forbids. Each order instead says plainly that it does not
//      decide what the expungement does to the petitioner's status, and the
//      express exception for fingerprint records — which the design does direct
//      on all three routes — is kept.
//
//   2. The ms-mip primary-filing note says the waiting period "is not
//      established from primary authority", while the same memo's controlling
//      authority, waiting periods, unresolved questions and legal-design
//      decision all record that enrolled HB 917 § 34 (Laws 2020 ch. 314) closed
//      that question and supplies the one-year rule verbatim. Both readings
//      agree on the document: the petition does not recite an elapsed period as
//      a satisfied element, and the participant is told to confirm the current
//      rule with the clerk. So the petition states the statutory rule with its
//      citation, states the participant's own dates, and leaves whether the year
//      has run to the court.
//
// Every template is DRAFT PENDING LEGAL REVIEW. All three tracks are
// `technicalFixture` and `runtimeDisabled`: nothing here reaches a runtime
// surface, and wiring these tracks into the shared registry and the shared
// template pack is the integration captain's step, not this job's.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED PETITIONER — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referral destinations
//
// Every stop names one of these. None of them is the node that raised the stop,
// and none carries a telephone number or street address: the design supplies
// none, and an invented one is worse than none.
// ---------------------------------------------------------------------------

/** Where a stop that needs individual legal advice sends the participant. */
export const MS_LAWYER_REFERRAL =
  "A Mississippi lawyer — through The Mississippi Bar's lawyer referral service, or a legal-aid office serving the county where the case was heard.";

/** Where a stop about the case file, the timing or the fee sends the participant. */
export const MS_CLERK_REFERRAL =
  "The clerk of the court that handled the case, who holds the file, the docket sheet and the account balance sheet, and who is the one office that can say what that court requires.";

/** Where a DUI stop about venue or the filing court sends the participant. */
export const MS_CIRCUIT_CLERK_REFERRAL =
  "The circuit clerk of the county in which the DUI conviction was had, which is the court a § 63-11-30(13) expunction petition goes to even where a municipal or justice court entered the conviction.";

/** Where a stop that needs the participant's own criminal history sends them. */
export const MS_CRIMINAL_HISTORY_REFERRAL =
  "The Mississippi Criminal Information Center, for the participant's own Mississippi criminal history record, which is the only reliable way to see every case across all four trial court levels.";

/** Where a DUI stop that needs the driving record sends the participant. */
export const MS_DRIVING_RECORD_REFERRAL =
  "The Mississippi Department of Public Safety, for a certified driving record, which is what establishes whether another DUI appears and whether a commercial licence was held.";

/** Where a non-DUI route sends a participant whose case is in fact a DUI. */
export const MS_DUI_ROUTE_REFERRAL =
  "LegalEase's own Mississippi routing: a DUI is handled under Miss. Code Ann. § 63-11-30 and is never routed through another Mississippi expungement track.";

/** Where a request outside the three assigned routes goes. */
export const MS_OUT_OF_SCOPE_REFERRAL =
  "Outside these three Mississippi routes. LegalEase's Mississippi routing covers other mechanisms separately, and anything not covered belongs with a lawyer before anything is filed.";

/** The closed set of destinations. A stop may not invent a fourteenth. */
export const MS_REFERRALS: readonly string[] = [
  MS_LAWYER_REFERRAL,
  MS_CLERK_REFERRAL,
  MS_CIRCUIT_CLERK_REFERRAL,
  MS_CRIMINAL_HISTORY_REFERRAL,
  MS_DRIVING_RECORD_REFERRAL,
  MS_DUI_ROUTE_REFERRAL,
  MS_OUT_OF_SCOPE_REFERRAL
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class MississippiEligibilityStopError extends Error {
  readonly code = "mississippi_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "MississippiEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class MississippiBranchError extends Error {
  readonly code = "mississippi_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "MississippiBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

export const MS_DRUG_TRACK_ID = "ms-drug-cd";
export const MS_DUI_TRACK_ID = "ms-dui";
export const MS_MIP_TRACK_ID = "ms-mip";

/** The three assigned routes, held closed so no other track can derive here. */
export const MS_ASSIGNED_TRACK_IDS: readonly string[] = [
  MS_DRUG_TRACK_ID,
  MS_DUI_TRACK_ID,
  MS_MIP_TRACK_ID
];

/**
 * The Mississippi routes this lane was NOT assigned.
 *
 * Named rather than merely absent, because four of them are ordinary § 99-19-71
 * mechanisms that a caller could plausibly expect this module to serve, and the
 * design's hardest rule is that a DUI never travels through one of them.
 */
export const MS_UNASSIGNED_TRACK_IDS: readonly string[] = [
  "ms-nonconv",
  "ms-misd-1st",
  "ms-fel",
  "ms-misd-addl",
  "ms-nonadj",
  "ms-diversion"
];

/** The only two answers a yes-or-no screen accepts. No default, no coercion. */
export const MS_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/**
 * Mississippi's four trial court levels.
 *
 * All four handle expungements and, as the design puts it, people routinely
 * misidentify which one heard their case — which is why the level is asked
 * rather than inferred from anything else in the answers.
 */
export const MS_COURT_LEVELS: Readonly<
  Record<string, "justice" | "county" | "circuit" | "municipal">
> = {
  justice: "justice",
  "justice court": "justice",
  county: "county",
  "county court": "county",
  circuit: "circuit",
  "circuit court": "circuit",
  municipal: "municipal",
  "municipal court": "municipal",
  city: "municipal",
  "city court": "municipal"
};

/** What the drug charge was. Only the first two are inside § 41-29-150. */
export const MS_DRUG_CHARGE_TYPES: Readonly<
  Record<
    string,
    | "simple_possession"
    | "paraphernalia"
    | "trafficking"
    | "distribution_or_sale"
    | "something_else"
    | "not_sure"
  >
> = {
  simple_possession: "simple_possession",
  "simple possession": "simple_possession",
  possession: "simple_possession",
  paraphernalia: "paraphernalia",
  "possession of paraphernalia": "paraphernalia",
  trafficking: "trafficking",
  distribution_or_sale: "distribution_or_sale",
  "distribution or sale": "distribution_or_sale",
  distribution: "distribution_or_sale",
  sale: "distribution_or_sale",
  something_else: "something_else",
  "something else": "something_else",
  not_sure: "not_sure",
  "not sure": "not_sure"
};

/** What the underage alcohol charge was. Only the first two are inside § 67-3-70(1)–(2). */
export const MS_ALCOHOL_OFFENCES: Readonly<
  Record<
    string,
    | "underage_purchase_or_possession"
    | "false_age_statement"
    | "furnishing_to_a_minor"
    | "dui"
    | "something_else"
    | "not_sure"
  >
> = {
  underage_purchase_or_possession: "underage_purchase_or_possession",
  "underage purchase or possession": "underage_purchase_or_possession",
  possession: "underage_purchase_or_possession",
  purchase: "underage_purchase_or_possession",
  false_age_statement: "false_age_statement",
  "false age statement": "false_age_statement",
  "false document": "false_age_statement",
  furnishing_to_a_minor: "furnishing_to_a_minor",
  "furnishing to a minor": "furnishing_to_a_minor",
  furnishing: "furnishing_to_a_minor",
  dui: "dui",
  "driving under the influence": "dui",
  something_else: "something_else",
  "something else": "something_else",
  not_sure: "not_sure",
  "not sure": "not_sure"
};

/**
 * How the underage alcohol case ended.
 *
 * The design asks this as an open question. It is normalized to a closed set
 * here because the answer decides which of § 67-3-70(6)'s two alternative
 * findings the proposed order asks the court to make — dismissal and discharge,
 * or a satisfactorily served sentence — and a free-text answer cannot select
 * between them without LegalEase reading the disposition, which it never does.
 * The participant's own dates are carried through unchanged either way.
 */
export const MS_DISPOSITION_TYPES: Readonly<
  Record<
    string,
    "dismissed_and_discharged" | "convicted_and_sentence_completed" | "still_pending" | "not_sure"
  >
> = {
  dismissed_and_discharged: "dismissed_and_discharged",
  "dismissed and discharged": "dismissed_and_discharged",
  dismissed: "dismissed_and_discharged",
  convicted_and_sentence_completed: "convicted_and_sentence_completed",
  "convicted and sentence completed": "convicted_and_sentence_completed",
  convicted: "convicted_and_sentence_completed",
  still_pending: "still_pending",
  "still pending": "still_pending",
  pending: "still_pending",
  not_sure: "not_sure",
  "not sure": "not_sure"
};

/**
 * Answer keys that would carry outside-party work into a Mississippi packet.
 *
 * Nothing in the adopted design declares any of them. Their presence means a
 * caller is trying to have LegalEase supply the court's finding, the judge's
 * signature or date, the clerk's certification, the hearing date, a completed
 * service fact or the expungement order itself. Section 41-29-150(d)(2),
 * § 63-11-30(13) and § 67-3-70(6) all put the findings and the order on the
 * court; service is the participant's own act, done after the packet is made.
 */
export const MS_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "clerkCertification",
  "courtFinding",
  "expungementOrder",
  "filingDate",
  "hearingDate",
  "judgeSignature",
  "judicialFinding",
  "notarization",
  "orderEntryDate",
  "serviceCompletedDate",
  "serviceCompletedStatement"
];

/**
 * Answer keys that would have LegalEase supply the prosecuting authority's
 * approval as to form.
 *
 * Kept separate from the rest because it is the design's own headline boundary:
 * obtaining that approval is the practical gate on the entire Mississippi
 * product, and it is a negotiation rather than a filing. A packet that printed
 * it would be asserting the one thing the participant still has to go and get.
 */
export const MS_PROSECUTOR_APPROVAL_KEYS: readonly string[] = [
  "approvedAsToForm",
  "districtAttorneyApproval",
  "districtAttorneyConsent",
  "prosecutorAgreement",
  "prosecutorConsent",
  "prosecutorSignature"
];

/**
 * Keys a caller may volunteer that route the matter away rather than into a
 * document.
 *
 * The design records "the participant is not a US citizen" as a self-help stop
 * on all three routes but declares no input for it, and separately forbids any
 * statement about immigration consequences. So LegalEase does not ask; where a
 * caller supplies it anyway and it indicates a non-citizen, the route stops and
 * refers, which is a routing decision rather than advice about consequences.
 */
export const MS_SCREENED_ROUTING_KEYS: readonly string[] = [
  "citizenship",
  "immigrationStatus"
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
  throw new MississippiEligibilityStopError(stopId, trackId, reason, referral, nextStep);
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
  referral: string = MS_CLERK_REFERRAL
): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "ms-answer-missing",
      trackId,
      `This packet needs an answer to ${key} before anything can be prepared, and none was given. Every field on a Mississippi petition, proposed order and certificate of service comes from the participant's own answers: the court, the county or city, the cause number and the prosecuting authority are participant data on every route, because Mississippi has no statewide form and nothing may be defaulted.`,
      referral,
      "Get the case file, the docket sheet and the disposition order from the clerk of the court that handled the case, then answer the question from the record rather than from memory."
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
    throw new MississippiBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), MS_YES_NO);

/** Court systems this product does not reach at all. */
const OUTSIDE_MISSISSIPPI =
  /\b(federal|united states district|u\.?s\.? district|another state|out[- ]of[- ]state|tribal|louisiana|alabama|tennessee|arkansas)\b/i;

/** A phrase that asserts non-citizenship, rather than one that denies it. */
const NOT_A_CITIZEN =
  /\b(not a (us|u\.s\.|united states) citizen|non[- ]?citizen|no[nt][- ]citizen|green card|lawful permanent resident|visa holder|undocumented|daca)\b/i;

// ---------------------------------------------------------------------------
// Screens that run on every route, in this order
// ---------------------------------------------------------------------------

/**
 * Refuses to build a Mississippi packet out of outside-party content.
 *
 * Run first, before any other screen, so that a caller passing a judicial
 * finding, a judge's signature, a hearing date, a clerk's certification or a
 * completed service fact gets a stop rather than a document that reads as though
 * the court had already acted.
 */
function refuseOutsidePartyContent(trackId: string, answers: Answers): void {
  const approvals = MS_PROSECUTOR_APPROVAL_KEYS.filter((key) => str(answers, key).length > 0);
  if (approvals.length > 0) {
    stop(
      "ms-prosecutor-approval-refused",
      trackId,
      `Content was supplied for ${approvals.join(", ")}. The APPROVED AS TO FORM block belongs to the prosecuting authority and is printed unsigned. Obtaining that approval is the practical gate on the entire Mississippi product and it is a negotiation, not a filing: LegalEase prepares the petition, the proposed order and the certificate of service, and does not seek, obtain, record or negotiate any approval. A packet that printed one would be asserting the one thing the participant still has to go and get.`,
      MS_LAWYER_REFERRAL,
      "File the packet and take the proposed order to the prosecuting authority yourself. If that office declines to approve the order as to form, or does not answer, take the matter to a lawyer rather than back to this packet."
    );
  }

  const supplied = MS_OUTSIDE_PARTY_KEYS.filter((key) => str(answers, key).length > 0);
  if (supplied.length > 0) {
    stop(
      "ms-outside-party-content-refused",
      trackId,
      `Content was supplied for ${supplied.join(", ")}. Every one of those belongs to somebody else: the finding and the order are the court's under § 41-29-150(d)(2), § 63-11-30(13) and § 67-3-70(6); the signature, the date and the entry are the judge's; the certification is the clerk's; a hearing date is set by the court; and service is an act the participant performs after this packet is made. LegalEase produces none of them and will not print one.`,
      MS_CLERK_REFERRAL,
      "File the packet, serve the prosecuting authority yourself, and let the court make its own findings and enter its own order. Ask the clerk for a certified copy once the order is entered."
    );
  }
}

/** Routes away a matter that is not in a Mississippi trial court at all. */
function screenRouting(trackId: string, answers: Answers): void {
  for (const key of MS_SCREENED_ROUTING_KEYS) {
    const value = str(answers, key);
    if (value && NOT_A_CITIZEN.test(value)) {
      stop(
        "ms-immigration-consequences-attorney-only",
        trackId,
        "The answers state that the participant is not a United States citizen. The design makes that a self-help stop on all three Mississippi routes, and separately forbids this packet from saying anything at all about what an expungement does or does not do to an immigration matter. Both rules point the same way: this is a question for a lawyer before anything is filed, and it is not one a prepared document should answer.",
        MS_LAWYER_REFERRAL,
        "Speak to an immigration lawyer, or to a lawyer who works with one, before filing any expungement petition in Mississippi."
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Court and caption
// ---------------------------------------------------------------------------

const upper = (value: string): string => value.toUpperCase();

/** Strips a trailing "County" so the caption does not read "HINDS COUNTY COUNTY". */
const bareCounty = (value: string): string =>
  value.replace(/\s*\bcount(y|ies)\b\s*$/i, "").trim();

const COURT_LEVEL_NAMES: Readonly<Record<string, string>> = {
  justice: "Justice Court",
  county: "County Court",
  circuit: "Circuit Court",
  municipal: "Municipal Court"
};

type CourtIdentity = {
  courtLevel: "justice" | "county" | "circuit" | "municipal";
  courtLevelName: string;
  courtCounty: string;
  courtName: string;
  courtLine: string;
};

/**
 * The court the case was heard in, taken entirely from the participant's answers.
 *
 * Nothing about a Mississippi court is defaulted: there is no statewide form,
 * four trial court levels all handle expungements, and the Fourth District
 * models' three-county field is exactly the inheritance the design forbids.
 */
function resolveCourt(trackId: string, answers: Answers): CourtIdentity {
  const rawLevel = need(trackId, answers, "courtLevel");
  if (OUTSIDE_MISSISSIPPI.test(rawLevel)) {
    stop(
      "ms-court-outside-mississippi",
      trackId,
      "The court named is not a Mississippi trial court. Sections 41-29-150, 63-11-30 and 67-3-70 reach records held by Mississippi courts and Mississippi agencies. A federal, tribal or other state's record is not something a Mississippi order reaches, and this packet does not pretend otherwise.",
      MS_OUT_OF_SCOPE_REFERRAL,
      "Find out which court actually holds the record. If it is a federal, tribal or another state's court, that is a different jurisdiction's procedure and this packet is not the route to it."
    );
  }
  if (UNKNOWN_ANSWER.test(rawLevel)) {
    stop(
      "ms-court-level-not-identified",
      trackId,
      "Which of Mississippi's four trial court levels heard the case has not been identified. Justice, county, circuit and municipal courts all handle expungements, they are separate courts with separate clerks and separate files, and the design records that people routinely misidentify which one heard their case. A caption naming the wrong court is a petition filed in the wrong place.",
      MS_CLERK_REFERRAL,
      "Look at the disposition paperwork, or ask the clerk's office in the county or city where the case was handled, and identify the court by name. Then answer again."
    );
  }
  const courtLevel = branch(trackId, "courtLevel", rawLevel, MS_COURT_LEVELS);

  const rawCounty = need(trackId, answers, "courtCounty");
  if (UNKNOWN_ANSWER.test(rawCounty)) {
    stop(
      "ms-venue-not-identified",
      trackId,
      "The county — or, for a municipal court, the city — the case was heard in has not been identified. Venue on every one of these routes is a particular Mississippi court, the caption names it, and the certificate of service goes to that court's prosecuting authority. None of that can be defaulted, and the archived models' three-county field is precisely the inheritance the design forbids.",
      MS_CLERK_REFERRAL,
      "Take the county or city off the disposition paperwork or the docket sheet, rather than from memory, and answer again."
    );
  }

  const courtLevelName = COURT_LEVEL_NAMES[courtLevel];
  const courtCounty = rawCounty;
  if (courtLevel === "municipal") {
    return {
      courtLevel,
      courtLevelName,
      courtCounty,
      courtName: `Municipal Court of the City of ${courtCounty}`,
      courtLine: `IN THE MUNICIPAL COURT OF THE CITY OF ${upper(courtCounty)}, MISSISSIPPI`
    };
  }
  const county = bareCounty(courtCounty);
  return {
    courtLevel,
    courtLevelName,
    courtCounty,
    courtName: `${courtLevelName} of ${county} County`,
    courtLine: `IN THE ${upper(courtLevelName)} OF ${upper(county)} COUNTY, MISSISSIPPI`
  };
}

// ---------------------------------------------------------------------------
// Facts shared by all three routes
// ---------------------------------------------------------------------------

type CommonFacts = Record<string, string> & { courtLevel: string };

function deriveCommonFacts(trackId: string, answers: Answers): CommonFacts {
  const fullName = need(trackId, answers, "fullName");
  const dateOfBirth = need(trackId, answers, "dateOfBirth");
  const mailingAddress = need(trackId, answers, "mailingAddress");
  const countyOfResidence = need(trackId, answers, "countyOfResidence");
  const causeNumber = need(trackId, answers, "causeNumber");
  const chargeName = need(trackId, answers, "chargeName");
  const offenseDate = need(trackId, answers, "offenseDate");
  const arrestDate = need(trackId, answers, "arrestDate");
  const arrestingAgency = need(trackId, answers, "arrestingAgency");
  const prosecutingAuthority = need(trackId, answers, "prosecutingAuthority");
  const court = resolveCourt(trackId, answers);

  return {
    // Declared keys, carried through under the design's own names.
    fullName,
    dateOfBirth,
    mailingAddress,
    countyOfResidence,
    courtLevel: court.courtLevel,
    courtCounty: court.courtCounty,
    causeNumber,
    chargeName,
    offenseDate,
    arrestDate,
    arrestingAgency,
    prosecutingAuthority,

    // Template placeholders. Emitted alongside the declared keys rather than
    // instead of them, so a declared key is never silently renamed away.
    petitionerName: fullName,
    petitionerNameUpper: upper(fullName),
    courtLevelName: court.courtLevelName,
    courtName: court.courtName,
    courtLine: court.courtLine,
    arrestingAgencyName: arrestingAgency,
    prosecutingAuthorityName: prosecutingAuthority,
    identificationStatement: `Petitioner is ${fullName}, date of birth ${dateOfBirth}, who resides at ${mailingAddress}, in ${countyOfResidence}, Mississippi.`,
    caseStatement: `This concerns cause number ${causeNumber} in the ${court.courtName}, Mississippi.`,
    chargeStatement: `The charge, as Petitioner states it, is: ${chargeName}. The date of the offence is ${offenseDate}, and the date of arrest or citation is ${arrestDate}.`,
    arrestingAgencyStatement: `The agency that arrested or cited Petitioner, as Petitioner states it, is: ${arrestingAgency}`,
    prosecutingAuthorityStatement: `The prosecuting authority for that court, as Petitioner states it, is: ${prosecutingAuthority}`
  };
}

// ---------------------------------------------------------------------------
// The optional timing check
// ---------------------------------------------------------------------------

/**
 * The one optional answer this module reads that the design does not declare.
 *
 * Two of the three routes carry a waiting period, and a self-help packet that
 * cannot notice an obviously premature filing is worse than one that can. But
 * LegalEase makes no eligibility determination and holds no clock: reading the
 * wall clock would also make every rendered fixture non-deterministic. So the
 * check runs only where the participant states the date they are preparing the
 * packet, it is never required, and it can only ever stop — it never concludes
 * that a period has run. Where it is absent the petition simply recites the
 * participant's dates and leaves the arithmetic to the court.
 */
export const MS_PREPARATION_DATE_KEY = "preparationDate";

function screenElapsedYears(
  trackId: string,
  answers: Answers,
  fromDate: string,
  requiredYears: number,
  stopId: string,
  reason: string,
  nextStep: string
): void {
  const preparation = str(answers, MS_PREPARATION_DATE_KEY);
  if (!preparation) return;
  const preparationYear = yearIn(preparation);
  const fromYear = yearIn(fromDate);
  if (preparationYear === null || fromYear === null) return;
  if (preparationYear - fromYear >= requiredYears) return;
  stop(stopId, trackId, reason, MS_CLERK_REFERRAL, nextStep);
}

// ---------------------------------------------------------------------------
// ms-drug-cd — Miss. Code Ann. § 41-29-150(d)(1) and (d)(2)
// ---------------------------------------------------------------------------

function deriveDrugFacts(answers: Answers): Record<string, string> {
  const trackId = MS_DRUG_TRACK_ID;
  const common = deriveCommonFacts(trackId, answers);

  const chargeType = branch(
    trackId,
    "chargeType",
    need(trackId, answers, "chargeType"),
    MS_DRUG_CHARGE_TYPES
  );
  if (chargeType === "trafficking" || chargeType === "distribution_or_sale") {
    stop(
      "ms-drug-cd-charge-outside-route",
      trackId,
      "The charge described is trafficking, distribution or sale. Section 41-29-150 reaches violations of § 41-29-139(c), simple possession, and § 41-29-139(d), paraphernalia, and nothing else. Sale, distribution and manufacture under § 41-29-139(a) sit outside the conditional discharge entirely, and trafficking is separately excluded from felony expungement under § 99-19-71(2)(a)(iii). Drafting an application on this statute for that charge would ask the court for relief the section does not give.",
      MS_LAWYER_REFERRAL,
      "Take the charging document and the disposition to a lawyer. Whether any other Mississippi mechanism reaches the case is a question for advice, not for this packet."
    );
  }
  if (chargeType === "something_else") {
    stop(
      "ms-drug-cd-charge-outside-route",
      trackId,
      "The charge described is neither simple possession nor possession of paraphernalia. This route is confined to § 41-29-139(c) and (d), and the design excludes everything else from it expressly.",
      MS_LAWYER_REFERRAL,
      "Read the charging document and identify the Mississippi Code section actually charged. If it is not § 41-29-139(c) or (d), this is not the route, and a lawyer can say what is."
    );
  }
  if (chargeType === "not_sure") {
    stop(
      "ms-drug-cd-charge-classification-uncertain",
      trackId,
      "Whether the charge was simple possession, paraphernalia, or something outside this route has not been settled. The design makes that classification the participant's own, taken from the charging document, and records that any uncertainty routes to advice. It is a legal classification, and LegalEase makes none: the application would have to allege the offence, and an allegation nobody has taken from the charging document is not one to sign.",
      MS_LAWYER_REFERRAL,
      "Get the charging document — the affidavit, information or indictment — from the clerk, read the Code section on it, and take it to a lawyer if it is still not clear which offence it charges."
    );
  }

  if (!yesNo(trackId, answers, "conditionalDischarge")) {
    stop(
      "ms-drug-cd-no-conditional-discharge",
      trackId,
      "The court did not defer proceedings and place Petitioner on probation without entering a judgment of guilt. Section 41-29-150(d)(1) operates WITHOUT an adjudication of guilt, and the expungement in § 41-29-150(d)(2) opens only after a discharge and dismissal under that subsection. Where the court accepted a plea and adjudicated guilt, subsection (d)(2) never opens at all, and an application drafted on it would rest on a mechanism that did not happen.",
      MS_LAWYER_REFERRAL,
      "Get the sentencing or disposition order from the clerk and read whether the court entered a judgment of guilt. If it did, ask a lawyer which Mississippi mechanism, if any, reaches the case; it is not this one."
    );
  }

  if (yesNo(trackId, answers, "priorDrugDisposition")) {
    stop(
      "ms-drug-cd-prior-drug-disposition",
      trackId,
      "There is a prior drug charge, conviction, conditional discharge or dismissal. Discharge and dismissal under § 41-29-150(d)(1) may occur only once with respect to any person, eligibility reaches only a person not previously convicted of violating § 41-29-139 or a comparable federal or other state law, and a nonpublic record is retained by the Bureau of Narcotics for exactly this check. Whether a particular prior disposition defeats the route is a legal question, and it is not one this packet decides.",
      MS_CRIMINAL_HISTORY_REFERRAL,
      "Obtain your own Mississippi criminal history record so you can see every case on it, then take it and the prior disposition paperwork to a lawyer."
    );
  }

  if (!yesNo(trackId, answers, "probationCompleted")) {
    stop(
      "ms-drug-cd-probation-not-completed",
      trackId,
      "The probation and its conditions were not successfully completed. Under § 41-29-150(d)(1) the court discharges the person and dismisses the proceedings on the expiry of the probation only where no condition was violated, and the expungement application in (d)(2) follows that discharge. Without it there is nothing yet to apply about.",
      MS_LAWYER_REFERRAL,
      "Get your probation records and the court file. If the probation was violated or revoked, that is a matter for a lawyer before anything is filed."
    );
  }

  const dischargeDate = need(trackId, answers, "dischargeDate");
  if (UNKNOWN_ANSWER.test(dischargeDate) || !statesAYear(dischargeDate)) {
    stop(
      "ms-drug-cd-discharge-not-established",
      trackId,
      "The date the court discharged Petitioner and dismissed the proceedings has not been stated. That discharge and dismissal is the event that opens § 41-29-150(d)(2), the application recites it, and the proposed order asks the court to find it. A date nobody has taken from the order is not one to plead.",
      MS_CLERK_REFERRAL,
      "Ask the clerk of the court that deferred the proceedings for a certified copy of the order of discharge and dismissal, take the date off it, and answer again."
    );
  }

  return {
    ...common,
    chargeType,
    conditionalDischarge: "yes",
    dischargeDate,
    probationCompleted: "yes",
    priorDrugDisposition: "no",

    offenceAllegation:
      chargeType === "simple_possession"
        ? "Petitioner states that the charge in this cause was simple possession of a controlled substance, an offence under Miss. Code Ann. § 41-29-139(c). Petitioner takes that classification from the charging document. It is Petitioner's statement, not a determination by anyone else, and the Court decides what the charging document charged."
        : "Petitioner states that the charge in this cause was possession of paraphernalia, an offence under Miss. Code Ann. § 41-29-139(d). Petitioner takes that classification from the charging document. It is Petitioner's statement, not a determination by anyone else, and the Court decides what the charging document charged.",
    dischargeStatement: `Petitioner states that on ${dischargeDate} the Court discharged Petitioner and dismissed the proceedings in this cause, without an adjudication of guilt.`,
    packetCaseReference: "Mississippi conditional discharge expungement"
  };
}

// ---------------------------------------------------------------------------
// ms-dui — Miss. Code Ann. § 63-11-30(13)
// ---------------------------------------------------------------------------

/** A blood alcohol concentration, as a number, from whatever the participant wrote. */
function bacValue(raw: string): number | null {
  const match = raw.match(/(\d+)\s*[.,]\s*(\d+)/);
  if (!match) return null;
  const value = Number.parseFloat(`${match[1]}.${match[2]}`);
  return Number.isFinite(value) ? value : null;
}

/** An answer that states no test was taken, rather than one that cannot say. */
const NO_TEST_TAKEN =
  /\b(no test|not tested|no breath|no blood|none taken|was not tested|there was no test|no result)\b/i;

function deriveDuiFacts(answers: Answers): Record<string, string> {
  const trackId = MS_DUI_TRACK_ID;
  const common = deriveCommonFacts(trackId, answers);

  // Venue is the circuit court of the county of conviction, whatever court
  // entered the conviction. The design calls this the single most likely way a
  // Mississippi DUI petition is filed in the wrong court.
  if (common.courtLevel === "municipal") {
    stop(
      "ms-dui-filing-county-not-identified",
      trackId,
      "The DUI conviction was entered in a municipal court, and the answers identify the city rather than the county. A § 63-11-30(13) expunction petition is filed in the CIRCUIT COURT of the county in which the conviction was had, not back in the court that entered it: the Attorney General has opined that a municipal court judge is not authorized to expunge a DUI conviction. The caption therefore needs the county, and a city name does not supply it.",
      MS_CIRCUIT_CLERK_REFERRAL,
      "Find out which Mississippi county that city's municipal court sits in, answer the county question with the county rather than the city, and confirm with that county's circuit clerk that the circuit court is where the petition is filed."
    );
  }
  const filingCounty = bareCounty(common.courtCounty);

  const duiConvictionDate = need(trackId, answers, "duiConvictionDate");
  if (UNKNOWN_ANSWER.test(duiConvictionDate) || !statesAYear(duiConvictionDate)) {
    stop(
      "ms-dui-conviction-not-established",
      trackId,
      "The date of the DUI conviction has not been stated. The petition recites it, the proposed order names the conviction it asks the Court to expunge, and the certified judgment of conviction is a document the participant obtains before filing. A conviction date nobody has taken from the judgment is not one to plead.",
      MS_CLERK_REFERRAL,
      "Ask the clerk of the court that entered the DUI conviction for a certified copy of the judgment, take the date off it, and answer again."
    );
  }

  const duiConvictionCourt = need(trackId, answers, "duiConvictionCourt", MS_CIRCUIT_CLERK_REFERRAL);
  if (UNKNOWN_ANSWER.test(duiConvictionCourt)) {
    stop(
      "ms-dui-filing-court-uncertain",
      trackId,
      "Which court entered the DUI conviction is not settled, and on this route that decides the county whose circuit court the petition goes to. The design makes any doubt about which court to file in a stop, precisely because the petition does not go back to the convicting court.",
      MS_CIRCUIT_CLERK_REFERRAL,
      "Identify the convicting court from the judgment of conviction, then confirm with the circuit clerk of that county that the circuit court is where a § 63-11-30 expunction petition is filed."
    );
  }

  const sentenceCompletionDate = need(trackId, answers, "sentenceCompletionDate");
  if (UNKNOWN_ANSWER.test(sentenceCompletionDate) || !statesAYear(sentenceCompletionDate)) {
    stop(
      "ms-dui-completion-not-established",
      trackId,
      "The date on which all terms and conditions of the sentence were successfully completed has not been stated. Section 63-11-30(13)(a) runs its period from that completion rather than from the conviction, so it is the date the whole timing question turns on, and it is not one to estimate.",
      MS_CLERK_REFERRAL,
      "Ask the clerk for the account balance sheet and the sentencing paperwork showing that every fine, cost and condition was satisfied, take the date off them, and answer again."
    );
  }

  screenElapsedYears(
    trackId,
    answers,
    sentenceCompletionDate,
    5,
    "ms-dui-waiting-period-incomplete",
    "On the dates given, five years have not passed since the sentence was completed. Section 63-11-30(13)(a) permits the petition only at least five years after successful completion of all terms and conditions of the sentence, and that period was not touched by 2026 House Bill 1546, which reduced only the general felony period in § 99-19-71(2)(a). This packet does not decide eligibility; it declines to prepare a petition the dates in front of it say is early.",
    "Work out the five-year date from your own completion paperwork, and ask the circuit clerk of the county of conviction to confirm the filing requirements before you prepare anything."
  );

  if (yesNo(trackId, answers, "commercialLicence")) {
    stop(
      "ms-dui-commercial-licence",
      trackId,
      "A commercial driver's licence or commercial learner's permit was held at the time of the offence. Section 63-11-30(13) makes that a disqualifying condition, and every one of its conditions must be met. A petition pleading the conditions could not plead this one.",
      MS_DRIVING_RECORD_REFERRAL,
      "Obtain your certified driving record from the Department of Public Safety. If it shows a commercial licence or permit at the time of the offence, take the matter to a lawyer rather than to this packet."
    );
  }

  if (yesNo(trackId, answers, "refusedTest")) {
    stop(
      "ms-dui-test-refused",
      trackId,
      "The blood or breath test was refused. Section 63-11-30(13) conditions the expunction on the person not having refused the test, and the design makes any refusal a self-help stop.",
      MS_LAWYER_REFERRAL,
      "Take the case file and the arrest paperwork to a lawyer. Whether anything else is available is a question for advice."
    );
  }

  const bacResult = need(trackId, answers, "bacResult");
  const bac = bacValue(bacResult);
  const noTest = NO_TEST_TAKEN.test(bacResult);
  if (bac === null && !noTest) {
    stop(
      "ms-dui-test-result-not-established",
      trackId,
      "The blood alcohol concentration result has not been established, and the answers do not state that no test was taken. Section 63-11-30(13) conditions relief on a concentration below .16 where test results are available, and the design makes missing test documentation a stop. A petition that simply left the result out would be pleading around the condition.",
      MS_LAWYER_REFERRAL,
      "Obtain the test result from the arresting agency, the court file or the Mississippi Crime Laboratory. If no test was taken at all, say so in that answer; if the documentation cannot be found, take the matter to a lawyer."
    );
  }
  if (bac !== null && bac >= 0.16) {
    stop(
      "ms-dui-bac-at-or-above-limit",
      trackId,
      "The blood alcohol concentration stated is .16 or above. Section 63-11-30(13) conditions the expunction on a concentration below .16 where test results are available, so the condition cannot be pleaded on these facts.",
      MS_LAWYER_REFERRAL,
      "Check the result against the laboratory or agency document rather than memory. If it really is .16 or above, this route is closed and a lawyer is the next step."
    );
  }

  if (yesNo(trackId, answers, "otherDui")) {
    stop(
      "ms-dui-other-dui",
      trackId,
      "There is another DUI conviction, or a DUI charge is pending now. Section 63-11-30(13) conditions the expunction on there being no other DUI conviction and no pending DUI, and a second, third or subsequent DUI is outside this route altogether; third and subsequent offences under § 63-11-30(2)(c) and (2)(d) are separately excluded from felony expungement under § 99-19-71(2)(a)(iv).",
      MS_DRIVING_RECORD_REFERRAL,
      "Obtain your certified driving record and your Mississippi criminal history so you can see every DUI on the record, and take them to a lawyer. Nothing should be filed while a DUI charge is pending."
    );
  }

  if (yesNo(trackId, answers, "priorDuiRelief")) {
    stop(
      "ms-dui-prior-dui-relief",
      trackId,
      "There has already been a DUI nonadjudication or a DUI expunction. Section 63-11-30(13)(b) makes a person eligible for only one expunction under the subsection, and the Department of Public Safety maintains a permanent confidential registry of them for exactly that determination. The condition cannot be pleaded twice.",
      MS_LAWYER_REFERRAL,
      "Take your driving record and any earlier expunction or nonadjudication order to a lawyer before filing anything."
    );
  }

  const justification = need(trackId, answers, "justification", MS_LAWYER_REFERRAL);
  if (/\b(write (it|this|one) for me|you write|legalease (should |can )?write|make something up|whatever you think)\b/i.test(justification)) {
    stop(
      "ms-dui-justification-not-participants-own",
      trackId,
      "The justification paragraph was left to LegalEase to compose. Section 63-11-30(13) requires the person to justify the expunction to the court, relief is discretionary, and the design records the justification as a manual completion item precisely because it must be the participant's own words. LegalEase prompts for it and formats it; it never composes it, because a discretionary application argued in somebody else's words is not the applicant's application.",
      MS_LAWYER_REFERRAL,
      "Write, in your own words, why the court should grant this. If you want help making the argument, that is what a lawyer is for."
    );
  }

  return {
    ...common,
    duiConvictionDate,
    duiConvictionCourt,
    sentenceCompletionDate,
    commercialLicence: "no",
    refusedTest: "no",
    bacResult,
    otherDui: "no",
    priorDuiRelief: "no",
    justification,

    filingCounty,
    filingCourtLine: `IN THE CIRCUIT COURT OF ${upper(filingCounty)} COUNTY, MISSISSIPPI`,
    filingCourtName: `Circuit Court of ${filingCounty} County`,
    convictionCourtStatement: `Petitioner states that the conviction was entered in: ${duiConvictionCourt}, on ${duiConvictionDate}.`,
    completionStatement: `Petitioner states that all terms and conditions of the sentence imposed for that conviction were completed on ${sentenceCompletionDate}.`,
    testResultStatement: noTest
      ? "Petitioner states that no blood or breath test result is available in this case, and that Petitioner did not refuse a test."
      : `Petitioner states that the blood alcohol concentration result in this case was ${bacResult}, and that Petitioner did not refuse the test.`,
    justificationStatement: justification,
    packetCaseReference: "Mississippi first offence DUI expunction"
  };
}

// ---------------------------------------------------------------------------
// ms-mip — Miss. Code Ann. § 67-3-70(6)
// ---------------------------------------------------------------------------

function deriveMipFacts(answers: Answers): Record<string, string> {
  const trackId = MS_MIP_TRACK_ID;
  const common = deriveCommonFacts(trackId, answers);

  const alcoholOffense = branch(
    trackId,
    "alcoholOffense",
    need(trackId, answers, "alcoholOffense"),
    MS_ALCOHOL_OFFENCES
  );
  if (alcoholOffense === "dui") {
    stop(
      "ms-mip-case-is-a-dui",
      trackId,
      "The case described is a DUI. A DUI has its own expungement provision in Miss. Code Ann. § 63-11-30(13), with its own conditions, its own five-year period and its own venue in the circuit court of the county of conviction. The design makes it a hard gate that a DUI is never routed through another Mississippi expungement track, and § 67-3-70 is another track.",
      MS_DUI_ROUTE_REFERRAL,
      "Use the Mississippi first-offence DUI route instead. It asks a different set of questions because the statute imposes a different set of conditions."
    );
  }
  if (alcoholOffense === "furnishing_to_a_minor") {
    stop(
      "ms-mip-offence-outside-route",
      trackId,
      "The charge described is furnishing or purchasing for a minor. Section 67-3-70(6) reaches a person charged with a violation of subsections (1) or (2) of that section — underage purchase or possession of light wine, a light spirit product or beer, and an underage false-age statement or false document. Subsection (3), the adult furnishing offence, is outside it.",
      MS_LAWYER_REFERRAL,
      "Read the charging document and identify which subsection of § 67-3-70 was charged. If it is subsection (3), this route is closed and a lawyer can say what, if anything, is open."
    );
  }
  if (alcoholOffense === "something_else") {
    stop(
      "ms-mip-offence-outside-route",
      trackId,
      "The charge described is not an underage purchase or possession offence and is not an underage false-age offence. Section 67-3-70(6) reaches subsections (1) and (2) of that section only.",
      MS_LAWYER_REFERRAL,
      "Read the charging document and identify the Mississippi Code section actually charged, then take it to a lawyer if it is not § 67-3-70(1) or (2)."
    );
  }
  if (alcoholOffense === "not_sure") {
    stop(
      "ms-mip-offence-classification-uncertain",
      trackId,
      "Exactly what was charged has not been settled. Which subsection of § 67-3-70 the charge falls under decides whether this route reaches it at all, that classification comes from the charging document, and LegalEase makes no legal classification of an offence.",
      MS_CLERK_REFERRAL,
      "Get the charging document — the citation, affidavit or information — from the clerk, read the Code section on it, and answer again."
    );
  }

  const ageAtOffense = need(trackId, answers, "ageAtOffense");
  const age = ageAtOffense.match(/\b(\d{1,2})\b/);
  if (UNKNOWN_ANSWER.test(ageAtOffense) || !age) {
    stop(
      "ms-mip-age-not-established",
      trackId,
      "Petitioner's age at the time of the offence has not been stated. Section 67-3-70(1) and (2) are underage offences, so age at the time is what makes the charge one this route reaches, and the petition recites it.",
      MS_CLERK_REFERRAL,
      "Take the offence date from the citation or charging document, work out your age on that date from your own date of birth, and answer again."
    );
  }
  if (Number.parseInt(age[1], 10) >= 21) {
    stop(
      "ms-mip-age-outside-route",
      trackId,
      "Petitioner was 21 or older at the time of the offence. Section 67-3-70(1) and (2) are underage offences; a person of full drinking age is not charged under them, so the charge described is not one this route reaches.",
      MS_LAWYER_REFERRAL,
      "Check the offence date and your date of birth against the charging document. If the charge really is something other than an underage offence, a lawyer can say which Mississippi mechanism, if any, reaches it."
    );
  }

  const dispositionType = branch(
    trackId,
    "dispositionType",
    need(trackId, answers, "dispositionType"),
    MS_DISPOSITION_TYPES
  );
  if (dispositionType === "still_pending") {
    stop(
      "ms-mip-case-still-pending",
      trackId,
      "The case has not ended. Section 67-3-70(6) permits the application only after a dismissal and discharge, or after the sentence has been served and any fine paid, and its one-year period runs from whichever of those came later. There is nothing yet for the court to find.",
      MS_CLERK_REFERRAL,
      "Wait until the case is disposed of, get the disposition order from the clerk, and come back with it."
    );
  }
  if (dispositionType === "not_sure") {
    stop(
      "ms-mip-disposition-not-established",
      trackId,
      "How the case ended has not been settled. Section 67-3-70(6) offers the court two alternative findings — that the person was dismissed and the proceedings discharged, or that the person satisfactorily served the sentence and paid any fine — and which one the proposed order asks for depends entirely on the disposition. LegalEase does not read the disposition order, so it cannot choose between them.",
      MS_CLERK_REFERRAL,
      "Ask the clerk for a certified copy of the order showing how the case ended, and answer again from that document."
    );
  }

  const dispositionDate = need(trackId, answers, "dispositionDate");
  if (UNKNOWN_ANSWER.test(dispositionDate) || !statesAYear(dispositionDate)) {
    stop(
      "ms-mip-disposition-not-established",
      trackId,
      "The date the case ended has not been stated. It is one of the two dates § 67-3-70(6) runs its period from, the petition recites it, and it is not one to estimate.",
      MS_CLERK_REFERRAL,
      "Ask the clerk for a certified copy of the disposition order, take the date off it, and answer again."
    );
  }

  const sentenceCompletionDate = need(trackId, answers, "sentenceCompletionDate");
  const convicted = dispositionType === "convicted_and_sentence_completed";
  if (convicted && (UNKNOWN_ANSWER.test(sentenceCompletionDate) || !statesAYear(sentenceCompletionDate))) {
    stop(
      "ms-mip-completion-not-established",
      trackId,
      "The case ended in a conviction, and the date everything the court ordered was completed — including any fine — has not been stated. Section 67-3-70(6) runs its year from the later of the dismissal and discharge or the completion of the sentence and payment of any fine, and the design records which event is later, and its date, as something taken from the participant's records and the clerk's account rather than inferred.",
      MS_CLERK_REFERRAL,
      "Ask the clerk for an account balance sheet showing any fine and costs paid in full, take the date from it, and answer again."
    );
  }

  // The clock runs from the later of the two events, which is why the check is
  // given the later date rather than the disposition date.
  const laterDate =
    convicted && statesAYear(sentenceCompletionDate) ? sentenceCompletionDate : dispositionDate;

  if (!yesNo(trackId, answers, "clerkConfirmedTiming")) {
    stop(
      "ms-mip-clerk-timing-not-confirmed",
      trackId,
      "The clerk of the court that handled the case has not been asked what the current waiting period is, or whether that court charges a fee. The design makes that call mandatory on this route, and makes a clerk who cannot confirm the waiting period or the correct court a self-help stop. Mississippi has no statewide expungement form, practice varies by county and by circuit district, and no fee amount is published anywhere in this packet.",
      MS_CLERK_REFERRAL,
      "Call the clerk of the court that handled the case. Ask what the current waiting period is for this kind of expungement, whether that court has its own preferred form, and what the filing fee is. Then answer again."
    );
  }

  screenElapsedYears(
    trackId,
    answers,
    laterDate,
    1,
    "ms-mip-waiting-period-incomplete",
    "On the dates given, a year has not passed since the later of the dismissal and discharge or the completion of the sentence and payment of any fine. Section 67-3-70(6) permits the application not sooner than one year after that event. This packet does not decide eligibility; it declines to prepare a petition the dates in front of it say is early.",
    "Work the year out from the disposition order and the clerk's account balance sheet, and confirm the current rule with the clerk of that court before preparing anything."
  );

  const dispositionStatement = convicted
    ? `Petitioner states that the case ended in a conviction on ${dispositionDate}, and that everything the Court ordered, including any fine, was completed on ${sentenceCompletionDate}.`
    : `Petitioner states that on ${dispositionDate} Petitioner was dismissed and the proceedings against Petitioner were discharged.`;

  const findingRequested = convicted
    ? "( ) that Petitioner satisfactorily served the sentence imposed and paid any fine imposed."
    : "( ) that Petitioner was dismissed and the proceedings against Petitioner discharged.";

  return {
    ...common,
    alcoholOffense,
    dispositionType,
    dispositionDate,
    sentenceCompletionDate,
    ageAtOffense,
    clerkConfirmedTiming: "yes",

    offenceAllegation:
      alcoholOffense === "underage_purchase_or_possession"
        ? "Petitioner states that the charge in this cause was the underage purchase or possession of light wine, a light spirit product or beer, an offence under Miss. Code Ann. § 67-3-70(1). Petitioner takes that classification from the charging document."
        : "Petitioner states that the charge in this cause was an underage statement of false age, or the presentation of a false document to obtain light wine, a light spirit product or beer, an offence under Miss. Code Ann. § 67-3-70(2). Petitioner takes that classification from the charging document.",
    ageStatement: `Petitioner states that Petitioner's age at the time of the offence was: ${ageAtOffense}`,
    dispositionStatement,
    findingRequested,
    timingStatement:
      "Miss. Code Ann. § 67-3-70(6) permits this application not sooner than one year after the dismissal and discharge, or the completion of any sentence and payment of any fine, whichever is later. Petitioner states the dates above and does not state that the period has run; whether it has is for the Court.",
    packetCaseReference: "Mississippi underage alcohol expungement"
  };
}

// ---------------------------------------------------------------------------
// Fact derivation entry point
// ---------------------------------------------------------------------------

/**
 * Turns the participant's answers into the fact bag the templates read.
 *
 * Fails closed on anything the adopted design treats as a stop, on anything that
 * would require deciding a legal classification, and on any attempt to supply
 * outside-party content or the prosecuting authority's approval.
 */
export function deriveMississippiFacts(
  trackId: string,
  answers: Answers
): Record<string, string> {
  if (!MS_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new MississippiBranchError(trackId, "trackId", trackId, MS_ASSIGNED_TRACK_IDS);
  }
  refuseOutsidePartyContent(trackId, answers);
  screenRouting(trackId, answers);

  if (trackId === MS_DRUG_TRACK_ID) return deriveDrugFacts(answers);
  if (trackId === MS_DUI_TRACK_ID) return deriveDuiFacts(answers);
  return deriveMipFacts(answers);
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
function caption(courtLineKey: string, documentTitle: string) {
  return {
    courtLine: courtLineKey,
    partyBlockLeft: ["STATE OF MISSISSIPPI", "", "v.", "", "{{petitionerName}},", "", "Petitioner."],
    partyBlockRight: ["Cause No. {{causeNumber}}", "", documentTitle]
  };
}

const PREAMBLE_SUFFIX =
  "Petitioner appears without a lawyer. LegalEase prepared this document from Petitioner's own answers, has seen no court record, has decided nothing, represents nobody and has filed nothing.";

const TRUTH_STATEMENT =
  "Petitioner states that the facts set out above are true and correct to the best of Petitioner's knowledge and belief. This is a simple statement of truth. No Mississippi statute reached by this petition requires it to be sworn or notarized, and no notarial block is printed here.";

const SIGNATURE_BLOCK: readonly string[] = [
  "{{petitionerName}}, Petitioner, self-represented",
  "{{mailingAddress}}",
  "",
  "Sign and date this by hand, in your own name, after you have read it.",
  "Date: ______________________"
];

/** The Court signs. Every line here stays blank on the generated document. */
const ORDER_SIGNATURE_BLOCK: readonly string[] = [
  "",
  "_____________________________________",
  "JUDGE",
  "",
  "Date: ______________________",
  "",
  "APPROVED AS TO FORM:",
  "",
  "_____________________________________",
  "For {{prosecutingAuthorityName}}",
  "",
  "Date: ______________________",
  "",
  "Both blocks above are left blank. The Court signs the order. The approval as to form, where the district attorney or prosecuting attorney expects one, is obtained by Petitioner and is not something LegalEase seeks, obtains or records."
];

/** What every Mississippi packet says about itself before it says anything else. */
const WHAT_THIS_IS_SECTION: Section = {
  heading: "WHAT THIS DOCUMENT IS, AND WHAT IT IS NOT",
  numbered: false,
  paragraphs: [
    "It is a petition prepared for a self-represented person from that person's own answers. Mississippi publishes no statewide expungement form and none of the statutes reached here prescribes one, so this document is drafted to the statute rather than copied from a form.",
    "It is not a filing until Petitioner files it, and it is not an order. Nothing in it has been granted, agreed, approved, certified or decided by anybody.",
    "It states no filing fee. Whether Miss. Code Ann. § 99-19-72's fee reaches a petition outside § 99-19-71 is an open question that this packet does not answer, and no amount is published anywhere in it. Petitioner asks the clerk what the fee is, and whether that court has a pauper's affidavit route, before filing.",
    "It carries no court, county, city, cause number or prosecuting authority that Petitioner did not supply. The archived Mississippi petition and order models are Fourth Circuit Court District local drafts, and nothing in them is inherited here.",
    "Where the clerk assigns a new cause number on filing, write that number into the caption of all three documents by hand. The number printed here is the one Petitioner supplied."
  ]
};

/** The local-practice warning the design makes mandatory on every route. */
const LOCAL_PRACTICE_SECTION: Section = {
  heading: "BEFORE FILING: CALL THE CLERK",
  numbered: false,
  paragraphs: [
    "Mississippi has no statewide expungement form, and practice varies by county and by circuit district. Local practice in the twenty-one circuit districts other than the Fourth, and in every municipal and justice court, has not been surveyed.",
    "Call the clerk of the court where the case was heard before filing. Ask whether that court has its own preferred petition and order, whether it requires anything else, and what the filing fee is.",
    "Some districts expect the district attorney or the prosecuting attorney to approve the order as to form before the judge will sign it. That is a conversation Petitioner has, not one LegalEase conducts, and a prosecutor who declines or does not answer is a point to speak to a lawyer.",
    "Mississippi has four trial court levels — justice, county, circuit and municipal — and all four handle expungements. Filing in the wrong one is the most common way a Mississippi expungement petition goes wrong."
  ]
};

/** The things this packet refuses to assert, said on the face of the document. */
const NOT_ASSERTED_SECTION: Section = {
  heading: "WHAT THIS PETITION DOES NOT SAY",
  numbered: false,
  paragraphs: [
    "It does not say that Petitioner meets the criteria for expungement. That is the Court's finding to make, and this petition asks the Court to make it.",
    "It does not describe the offence as an expungeable one. That phrase appears in the archived local models' caption block as though it were a data field; it is a legal conclusion and it is not printed here.",
    "It does not say that Petitioner is a first offender, and it does not say that Petitioner is rehabilitated. Neither is pleaded, because neither is a fact LegalEase holds.",
    "It does not describe any dismissal as having been with prejudice unless the disposition order says so, and LegalEase has not read the disposition order.",
    "It says nothing about immigration, firearms, federal records or professional licensing. Those consequences are outside this packet entirely, and a document that guessed at them would be worse than one that is silent.",
    "It does not say that a record will be erased everywhere. Mississippi has no automatic record clearance: House Bill 1344 of the 2026 session, which would have created Department of Public Safety automatic expungement, died in committee on 3 February 2026, and comparable bills failed in 2024 and 2025."
  ]
};

/** What an order does and does not reach, said before anyone asks for one. */
const AFTER_THE_ORDER_SECTION: Section = {
  heading: "WHAT AN ORDER WOULD AND WOULD NOT REACH",
  numbered: false,
  paragraphs: [
    "An expungement order reaches the records of the agencies the order names. It does not reach fingerprint records, which are excepted, and it does not reach federal, tribal or other states' records.",
    "The Mississippi Criminal Information Center keeps a nonpublic record for first-offender and eligibility determinations. An expungement does not remove that.",
    "An employer or a licensing body may still ask whether an order of expunction was entered. This packet does not tell Petitioner how to answer that question.",
    "If an order is entered, ask the clerk for certified copies and deliver one to every agency the order names. That distribution is Petitioner's to do."
  ]
};

/** Where automated help ends. */
function stopSection(extra: readonly string[]): Section {
  return {
    heading: "WHERE THIS PACKET STOPS",
    numbered: false,
    paragraphs: [
      "LegalEase prepares documents from what Petitioner says. It gives no legal advice, reads no court record, decides no eligibility question, files nothing, serves nobody and speaks to no office.",
      ...extra,
      "Any objection by the prosecuting authority, any contested hearing, and any refusal to approve the order as to form. Those are matters for a lawyer.",
      "Nothing in this packet addresses immigration, firearms, federal records or professional licensing, so any question that turns on one of them stops here.",
      `Where any of these applies, speak to a lawyer before filing anything. ${MS_LAWYER_REFERRAL}`,
      "One further route worth knowing about, mentioned once and not pressed: Miss. Code Ann. § 97-3-54.6(6), as amended in 2026, lets a sentencing court expunge a misdemeanour or a non-violent felony at any time where it finds the person's participation was a direct result of their having been trafficked. It has no waiting period and no first-offender limit, so it is broader and faster than this route. Anyone who thinks it may apply to them should go to a lawyer, a legal-aid office or a survivor-services organisation; LegalEase does not write that application."
    ]
  };
}

/** The certificate of service, unexecuted, on every route. */
const CERTIFICATE_LINES: readonly string[] = [
  "DO NOT SIGN OR DATE THIS UNTIL YOU HAVE DELIVERED THE COPY. Unsigned, nothing below states that service has happened, and LegalEase has served nothing on anyone.",
  "",
  "I, {{petitionerName}}, certify that I delivered a true and correct copy of the petition and the proposed order in this cause to the prosecuting authority named below, on the date written below and by the method marked below.",
  "",
  "Prosecuting authority served: {{prosecutingAuthorityName}}",
  "Address used: ______________________________________________",
  "",
  "Method of delivery — mark one:",
  "(  ) United States mail",
  "(  ) Hand delivery",
  "",
  "Date of delivery: ______________________",
  "",
  "Signature: _____________________________________",
  "{{petitionerName}}, Petitioner, self-represented",
  "",
  "Keep a copy of this certificate, and of everything you delivered, for your own records."
];

/**
 * What a certificate of service says about itself, as its preamble.
 *
 * Kept as one italic preamble rather than a headed section so that the whole
 * certificate — the recital, the addressee, the method, the date and the
 * signature — fits on one page. A form a person completes by hand should not
 * put the recipient on one page and the signature on the next, and the shared
 * renderer applies its keep-together only to `signatureBlock`, which a
 * certificate does not use.
 */
function certificatePreamble(documentName: string): string {
  return (
    `This certificate belongs to the ${documentName} in cause number {{causeNumber}}, and to no other document. ` +
    "The archived local model's certificate is captioned for a different petition; that mistake is not repeated here. " +
    "The prosecuting authority for the court where the case was heard receives a copy of the petition and the proposed order, by mail or by hand. " +
    "The recipient and the address are Petitioner's to supply and to check: none is printed here. " +
    "Delivering a copy is not obtaining an approval as to form, which is a separate conversation Petitioner has."
  );
}

/** The proposed order's standing disclaimers, identical on every route. */
function orderCommonParagraphs(orderedDirections: readonly string[]): readonly string[] {
  return [
    "Every finding, every signature, every date and every entry below is left blank for the Court. Nothing on this page has been decided.",
    "The boxes below are unmarked. Petitioner does not mark them and LegalEase does not mark them: they are the Court's to complete.",
    ...orderedDirections,
    "This order does not state what an expungement does to Petitioner's status, and it claims no restoration of rights and no protection from later questioning. The section under which it is sought supplies no such clause, and none is imported here from any other statute.",
    "Fingerprint records are excepted from the direction above."
  ];
}

// ---------------------------------------------------------------------------
// ms-drug-cd templates
// ---------------------------------------------------------------------------

const DRUG_PETITION: PleadingTemplate = {
  templateId: "ms-drug-cd-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("{{courtLine}}", "APPLICATION FOR EXPUNGEMENT"),
  title: "APPLICATION TO EXPUNGE THE RECORD OF A CONDITIONAL DISCHARGE UNDER MISS. CODE ANN. § 41-29-150(d)(2)",
  preamble: `Petitioner applies to this Court under Miss. Code Ann. § 41-29-150(d)(2) for an order expunging the record of the proceedings in this cause, and states as follows. ${PREAMBLE_SUFFIX}`,
  sections: [
    WHAT_THIS_IS_SECTION,
    {
      heading: "I.  PETITIONER AND CASE",
      numbered: true,
      paragraphs: [
        "{{identificationStatement}}",
        "{{caseStatement}}",
        "{{chargeStatement}}",
        "{{arrestingAgencyStatement}}",
        "{{prosecutingAuthorityStatement}}"
      ]
    },
    {
      heading: "II.  THE OFFENCE, AS PETITIONER STATES IT",
      numbered: true,
      paragraphs: [
        "{{offenceAllegation}}",
        "Miss. Code Ann. § 41-29-150(d)(1) reaches a person not previously convicted of violating Miss. Code Ann. § 41-29-139, or the laws of the United States or another state relating to narcotic drugs, stimulant or depressant substances, other controlled substances or marihuana, who is found guilty of a violation of § 41-29-139(c) or (d).",
        "Petitioner does not plead Miss. Code Ann. § 99-19-71. That section carries a different mechanism, and this application is made under § 41-29-150 alone."
      ]
    },
    {
      heading: "III.  THE CONDITIONAL DISCHARGE, THE PROBATION AND THE DISMISSAL",
      numbered: true,
      paragraphs: [
        "Miss. Code Ann. § 41-29-150(d)(1) permits the Court, without entering a judgment of guilt and with the person's consent, to defer further proceedings and place the person on probation for not more than three years.",
        "Petitioner states that the Court deferred further proceedings in this cause and placed Petitioner on probation, without entering a judgment of guilt.",
        "Petitioner states that Petitioner completed the probation and every condition attached to it.",
        "{{dischargeStatement}}",
        "Section 41-29-150(d)(1) provides that discharge and dismissal under it may occur only once with respect to any person, and that a nonpublic record is retained by the Mississippi Bureau of Narcotics solely so that the courts may determine whether a person qualifies again. Petitioner states that Petitioner has had no other drug charge, conviction, conditional discharge or dismissal."
      ]
    },
    {
      heading: "IV.  WHAT THE STATUTE ASKS THE COURT TO DO",
      numbered: true,
      paragraphs: [
        "Miss. Code Ann. § 41-29-150(d)(2) provides that a person discharged and dismissed under subsection (d)(1) may apply to the Court for an order to expunge from all official records all recordation relating to the arrest, indictment or information, trial, finding of guilty and dismissal and discharge.",
        "Section 41-29-150(d)(2) provides that the Court determines the matter after hearing, and that on the requisite findings the Court shall enter the order.",
        "Petitioner does not state that Petitioner meets the criteria for that order. Petitioner states the facts above and asks the Court to determine the application.",
        "Miss. Code Ann. § 41-29-150 specifies no filing fee. No amount is stated in this application, and Petitioner will confirm any fee with the clerk before filing."
      ]
    },
    NOT_ASSERTED_SECTION,
    AFTER_THE_ORDER_SECTION,
    LOCAL_PRACTICE_SECTION,
    stopSection([
      "Any prior drug charge, conviction, conditional discharge or dismissal of any kind, because the benefit under § 41-29-150(d)(1) is available once only.",
      "A missing conditional discharge order, or missing discharge and dismissal paperwork.",
      "Any possibility that the charge was trafficking, distribution or sale rather than simple possession or paraphernalia.",
      "A case in which the Court accepted a plea and entered a judgment of guilt, which takes the case outside § 41-29-150(d) altogether."
    ])
  ],
  prayer: [
    "WHEREFORE, Petitioner asks the Court to determine this application under Miss. Code Ann. § 41-29-150(d)(2) and, on the findings the section requires, to enter an order expunging from all official records all recordation relating to the arrest, the proceedings, and the discharge and dismissal in cause number {{causeNumber}}.",
    "Petitioner asks the Court to consider the proposed order tendered with this application. Nothing in this application reports a decision by anyone. It asks."
  ],
  verification: TRUTH_STATEMENT,
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: SIGNATURE_BLOCK
};

const DRUG_ORDER: PleadingTemplate = {
  templateId: "ms-drug-cd-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("{{courtLine}}", "PROPOSED ORDER OF EXPUNGEMENT"),
  title: "PROPOSED ORDER OF EXPUNGEMENT — MISS. CODE ANN. § 41-29-150(d)(2)",
  preamble:
    "This is a proposed order, tendered for the Court's consideration with the application it accompanies. It has been granted by nobody and signed by nobody.",
  sections: [
    {
      numbered: false,
      paragraphs: orderCommonParagraphs([
        "THIS CAUSE came before the Court on the application of {{petitionerName}} under Miss. Code Ann. § 41-29-150(d)(2) to expunge the record of the proceedings in cause number {{causeNumber}}.",
        "The Court, having determined the matter after hearing as § 41-29-150(d)(2) requires, finds:",
        "(  ) that the application is well taken and should be GRANTED.",
        "(  ) that the application should be DENIED.",
        "",
        "IT IS THEREFORE ORDERED that all recordation relating to the arrest, the proceedings, and the discharge and dismissal in cause number {{causeNumber}} be expunged from all official records.",
        "IT IS FURTHER ORDERED that the clerk of this Court, {{arrestingAgencyName}}, and every other person and agency keeping an official record of this cause expunge that record, except that the Mississippi Bureau of Narcotics may retain the nonpublic record that Miss. Code Ann. § 41-29-150(d)(1) directs it to keep, solely so that the courts may determine whether a person qualifies again.",
        "IT IS FURTHER ORDERED that the clerk deliver a certified copy of this order to {{petitionerName}} and to {{prosecutingAuthorityName}}."
      ])
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: ORDER_SIGNATURE_BLOCK
};

const DRUG_CERTIFICATE: PleadingTemplate = {
  templateId: "ms-drug-cd-certificate-of-service",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("{{courtLine}}", "CERTIFICATE OF SERVICE"),
  title: "CERTIFICATE OF SERVICE",
  preamble: certificatePreamble("Application to Expunge the Record of a Conditional Discharge"),
  sections: [],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [],
  certificateOfService: CERTIFICATE_LINES
};

// ---------------------------------------------------------------------------
// ms-dui templates
// ---------------------------------------------------------------------------

const DUI_VENUE_SECTION: Section = {
  heading: "WHERE THIS PETITION IS FILED, AND WHY IT IS NOT THE CONVICTING COURT",
  numbered: false,
  paragraphs: [
    "This petition is filed in the CIRCUIT COURT of the county in which the DUI conviction was had. That is so even where a municipal or a justice court entered the conviction.",
    "The Attorney General has opined that a municipal court judge is not authorized to expunge a DUI conviction. Filing back in the convicting court is the most likely way a Mississippi DUI expunction petition goes to the wrong place.",
    "The convicting court, as Petitioner states it, appears in the paragraphs below. The caption above is the circuit court of that county.",
    "The cause number printed in the caption is the convicting court's. Where the circuit clerk assigns a new one on filing, write that number into the caption of all three documents by hand.",
    "Confirm with the circuit clerk of that county, before filing, what that court requires."
  ]
};

const DUI_CITATION_NOTE =
  "One citation caution, recorded rather than resolved: the expunction provision is Miss. Code Ann. § 63-11-30(13), captioned Expunction, per enrolled Senate Bill 2095 (Laws 2022 ch. 303), which is the last enacted amendment. It is frequently cited in practice as § 63-11-30(14); per that enrolled act, (14) is Nonadjudication. Check the subsection against the current print before filing.";

const DUI_PETITION: PleadingTemplate = {
  templateId: "ms-dui-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("{{filingCourtLine}}", "PETITION FOR EXPUNCTION"),
  title: "PETITION TO EXPUNGE A FIRST-OFFENCE DRIVING UNDER THE INFLUENCE CONVICTION — MISS. CODE ANN. § 63-11-30(13)",
  preamble: `Petitioner petitions this Court under Miss. Code Ann. § 63-11-30(13) for an order expunging the record of one first-offence conviction for driving under the influence, and states as follows. ${PREAMBLE_SUFFIX}`,
  sections: [
    WHAT_THIS_IS_SECTION,
    DUI_VENUE_SECTION,
    {
      heading: "I.  PETITIONER AND CASE",
      numbered: true,
      paragraphs: [
        "{{identificationStatement}}",
        "{{caseStatement}}",
        "{{chargeStatement}}",
        "{{arrestingAgencyStatement}}",
        "{{prosecutingAuthorityStatement}}",
        "{{convictionCourtStatement}}"
      ]
    },
    {
      heading: "II.  THE STATUTORY CONDITIONS, AS PETITIONER STATES THEM",
      numbered: true,
      paragraphs: [
        "Miss. Code Ann. § 63-11-30(13) permits the expunction of one first-offence conviction under that section where every condition it sets is met. Petitioner states the facts below. Whether each condition is met is a determination for the Court, and Petitioner does not make it.",
        "{{completionStatement}} Section 63-11-30(13)(a) permits the petition at least five years after the successful completion of all terms and conditions of the sentence.",
        "Petitioner states that Petitioner did not hold a commercial driver's licence or a commercial learner's permit at the time of the offence.",
        "{{testResultStatement}} Section 63-11-30(13) conditions relief on the person not having refused the test and, where test results are available, on a concentration below .16.",
        "Petitioner states that Petitioner has no other conviction for driving under the influence, and no charge for driving under the influence pending now.",
        "Petitioner states that Petitioner has not previously had a nonadjudication or an expunction of a charge or conviction for driving under the influence. Section 63-11-30(13)(b) makes a person eligible for one expunction under the subsection only, and directs the Department of Public Safety to maintain a permanent confidential registry of them for that determination.",
        "This petition is not made under Miss. Code Ann. § 99-19-71. A conviction for driving under the influence has its own expunction provision and is not routed through the ordinary misdemeanour or felony route."
      ]
    },
    {
      heading: "III.  PETITIONER'S JUSTIFICATION, IN PETITIONER'S OWN WORDS",
      numbered: false,
      paragraphs: [
        "Miss. Code Ann. § 63-11-30(13) requires the person to justify the expunction to the Court, and relief under it is discretionary. The paragraph below was written by Petitioner and is reproduced without change. Nobody else composed it.",
        "{{justificationStatement}}",
        "Section 63-11-30(13)(c) requires the Court, where it grants an expunction, to state in writing the justification for which it was granted, and to forward the order to the Department of Public Safety within five days. Petitioner states no such justification on the Court's behalf."
      ]
    },
    {
      heading: "IV.  WHAT PETITIONER DOES NOT ASK THIS COURT TO ASSUME",
      numbered: false,
      paragraphs: [
        "Petitioner does not state that Petitioner meets the criteria for expunction. Petitioner states the facts above and asks the Court to determine the petition.",
        "No filing fee is stated in this petition. Section 99-19-72's fee is levied on petitions to expunge an offence under § 99-19-71 and does not reach § 63-11-30 by its terms; Petitioner will confirm any fee with the circuit clerk before filing.",
        DUI_CITATION_NOTE
      ]
    },
    NOT_ASSERTED_SECTION,
    AFTER_THE_ORDER_SECTION,
    LOCAL_PRACTICE_SECTION,
    stopSection([
      "Every petition on this route. A conviction for driving under the influence carries mandatory review by a lawyer before it is filed, and this packet is prepared on that footing.",
      "Any doubt at all about which court to file in, because this petition goes to the circuit court of the county of conviction rather than back to the convicting court.",
      "Any refusal of the blood or breath test, any result at or above .16, or any test documentation that cannot be found.",
      "Any commercial driver's licence or commercial learner's permit held at the time of the offence.",
      "Any other conviction for driving under the influence, any pending charge for it, and any earlier nonadjudication or expunction of one."
    ])
  ],
  prayer: [
    "WHEREFORE, Petitioner asks the Court to determine this petition under Miss. Code Ann. § 63-11-30(13) and, on the findings the section requires, to enter an order expunging the record of the conviction in cause number {{causeNumber}}.",
    "Petitioner asks the Court to consider the proposed order tendered with this petition. Nothing in this petition reports a decision by anyone. It asks."
  ],
  verification: TRUTH_STATEMENT,
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: SIGNATURE_BLOCK
};

const DUI_ORDER: PleadingTemplate = {
  templateId: "ms-dui-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("{{filingCourtLine}}", "PROPOSED ORDER OF EXPUNCTION"),
  title: "PROPOSED ORDER OF EXPUNCTION — MISS. CODE ANN. § 63-11-30(13)",
  preamble:
    "This is a proposed order, tendered for the Court's consideration with the petition it accompanies. It has been granted by nobody and signed by nobody.",
  sections: [
    {
      numbered: false,
      paragraphs: orderCommonParagraphs([
        "THIS CAUSE came before the Court on the petition of {{petitionerName}} under Miss. Code Ann. § 63-11-30(13) to expunge the record of one first-offence conviction for driving under the influence in cause number {{causeNumber}}.",
        "The Court, having considered the petition and the record, finds:",
        "(  ) that the petition is well taken and should be GRANTED.",
        "(  ) that the petition should be DENIED.",
        "",
        "The Court's written justification for granting the expunction, which Miss. Code Ann. § 63-11-30(13)(c) requires, is the Court's own and is left blank here:",
        "_____________________________________________________________________",
        "_____________________________________________________________________",
        "",
        "IT IS THEREFORE ORDERED that the record of the conviction in cause number {{causeNumber}} be expunged.",
        "IT IS FURTHER ORDERED that the clerk of this Court, the clerk of the court that entered the conviction, {{arrestingAgencyName}}, and every other person and agency keeping an official record of that conviction expunge that record.",
        "IT IS FURTHER ORDERED that a copy of this order be forwarded to the Mississippi Department of Public Safety within five days, as Miss. Code Ann. § 63-11-30(13)(c) directs, and that the clerk deliver a certified copy to {{petitionerName}} and to {{prosecutingAuthorityName}}."
      ])
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: ORDER_SIGNATURE_BLOCK
};

const DUI_CERTIFICATE: PleadingTemplate = {
  templateId: "ms-dui-certificate-of-service",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("{{filingCourtLine}}", "CERTIFICATE OF SERVICE"),
  title: "CERTIFICATE OF SERVICE",
  preamble: certificatePreamble("Petition to Expunge a First-Offence Driving Under the Influence Conviction"),
  sections: [],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [],
  certificateOfService: CERTIFICATE_LINES
};

// ---------------------------------------------------------------------------
// ms-mip templates
// ---------------------------------------------------------------------------

const MIP_PETITION: PleadingTemplate = {
  templateId: "ms-mip-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("{{courtLine}}", "PETITION FOR EXPUNGEMENT"),
  title: "PETITION TO EXPUNGE THE RECORD OF AN UNDERAGE ALCOHOL CHARGE — MISS. CODE ANN. § 67-3-70(6)",
  preamble: `Petitioner applies to this Court under Miss. Code Ann. § 67-3-70(6) for an order expunging from all official records all recordation relating to the charge in this cause, and states as follows. ${PREAMBLE_SUFFIX}`,
  sections: [
    WHAT_THIS_IS_SECTION,
    {
      heading: "I.  PETITIONER AND CASE",
      numbered: true,
      paragraphs: [
        "{{identificationStatement}}",
        "{{caseStatement}}",
        "{{chargeStatement}}",
        "{{arrestingAgencyStatement}}",
        "{{prosecutingAuthorityStatement}}",
        "{{ageStatement}}"
      ]
    },
    {
      heading: "II.  THE OFFENCE, AS PETITIONER STATES IT",
      numbered: true,
      paragraphs: [
        "{{offenceAllegation}}",
        "Miss. Code Ann. § 67-3-70(6) reaches a person who has been CHARGED with a violation of subsection (1) or subsection (2) of that section. It therefore reaches a case that was dismissed as well as one that ended in a conviction.",
        "Subsection (3) of § 67-3-70, which is the offence of furnishing or purchasing for a minor, is outside this petition and is not pleaded."
      ]
    },
    {
      heading: "III.  HOW THE CASE ENDED, AND WHEN",
      numbered: true,
      paragraphs: [
        "{{dispositionStatement}}",
        "{{timingStatement}}",
        "Petitioner has asked the clerk of this Court what the current waiting period is for an expungement of this kind, and what filing fee, if any, that court charges. No fee amount is stated in this petition."
      ]
    },
    {
      heading: "IV.  WHAT THE STATUTE ASKS THE COURT TO DO",
      numbered: true,
      paragraphs: [
        "Miss. Code Ann. § 67-3-70(6) provides that if the Court determines that the person was dismissed and the proceedings against them discharged, or that the person satisfactorily served the sentence and paid any fine, it SHALL enter an order expunging from all official records all recordation relating to the arrest, trial, finding or plea of guilty, and dismissal and discharge.",
        "Petitioner does not state that Petitioner meets the criteria for that order. Petitioner states the facts above and asks the Court to determine the petition.",
        "Section 67-3-70 prescribes no petition contents, no notice period, no hearing procedure and no fee. Nothing has been invented here to fill those gaps, and Petitioner will confirm what this court requires with its clerk before filing."
      ]
    },
    NOT_ASSERTED_SECTION,
    AFTER_THE_ORDER_SECTION,
    LOCAL_PRACTICE_SECTION,
    stopSection([
      "A clerk who cannot confirm the current waiting period, or which court the petition goes to.",
      "Any possibility that the charge was something other than an underage purchase or possession offence, or an underage false-age offence.",
      "Any case involving driving under the influence, which has its own separate route and is never handled here."
    ])
  ],
  prayer: [
    "WHEREFORE, Petitioner asks the Court to determine this petition under Miss. Code Ann. § 67-3-70(6) and, on the findings the section requires, to enter an order expunging from all official records all recordation relating to the arrest, trial, finding or plea, and dismissal and discharge in cause number {{causeNumber}}.",
    "Petitioner asks the Court to consider the proposed order tendered with this petition. Nothing in this petition reports a decision by anyone. It asks."
  ],
  verification: TRUTH_STATEMENT,
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: SIGNATURE_BLOCK
};

const MIP_ORDER: PleadingTemplate = {
  templateId: "ms-mip-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("{{courtLine}}", "PROPOSED ORDER OF EXPUNGEMENT"),
  title: "PROPOSED ORDER OF EXPUNGEMENT — MISS. CODE ANN. § 67-3-70(6)",
  preamble:
    "This is a proposed order, tendered for the Court's consideration with the petition it accompanies. It has been granted by nobody and signed by nobody.",
  sections: [
    {
      numbered: false,
      paragraphs: orderCommonParagraphs([
        "THIS CAUSE came before the Court on the petition of {{petitionerName}} under Miss. Code Ann. § 67-3-70(6) to expunge the record of the charge in cause number {{causeNumber}}.",
        "The Court, having considered the petition and the record, determines:",
        "{{findingRequested}}",
        "(  ) that the petition should be DENIED.",
        "",
        "IT IS THEREFORE ORDERED that all recordation relating to the arrest, trial, finding or plea of guilty, and dismissal and discharge in cause number {{causeNumber}} be expunged from all official records.",
        "IT IS FURTHER ORDERED that the clerk of this Court, {{arrestingAgencyName}}, and every other person and agency keeping an official record of this cause expunge that record.",
        "IT IS FURTHER ORDERED that the clerk deliver a certified copy of this order to {{petitionerName}} and to {{prosecutingAuthorityName}}."
      ])
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: ORDER_SIGNATURE_BLOCK
};

const MIP_CERTIFICATE: PleadingTemplate = {
  templateId: "ms-mip-certificate-of-service",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("{{courtLine}}", "CERTIFICATE OF SERVICE"),
  title: "CERTIFICATE OF SERVICE",
  preamble: certificatePreamble("Petition to Expunge the Record of an Underage Alcohol Charge"),
  sections: [],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [],
  certificateOfService: CERTIFICATE_LINES
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const MS_CUSTOM_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [DRUG_PETITION.templateId]: DRUG_PETITION,
  [DRUG_ORDER.templateId]: DRUG_ORDER,
  [DRUG_CERTIFICATE.templateId]: DRUG_CERTIFICATE,
  [DUI_PETITION.templateId]: DUI_PETITION,
  [DUI_ORDER.templateId]: DUI_ORDER,
  [DUI_CERTIFICATE.templateId]: DUI_CERTIFICATE,
  [MIP_PETITION.templateId]: MIP_PETITION,
  [MIP_ORDER.templateId]: MIP_ORDER,
  [MIP_CERTIFICATE.templateId]: MIP_CERTIFICATE
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
 * own. All three design roles on these routes map straight onto it, so the
 * mapping is one to one; it is stated here and asserted by the verifier rather
 * than left implicit, because a silent mapping is the thing that goes wrong
 * quietly when a design role and an engine role share a name but not a meaning.
 *
 * The componentId is pinned exactly as the design assigns it. That is what
 * carries assignment fidelity.
 */
export const MS_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order",
  certificate_of_service: "certificate_of_service"
};

/**
 * The two roles the design assigns on these routes that this lane does not
 * produce, with the strategy that puts them in another lane.
 */
export const MS_EXCLUDED_COMPONENT_ROLES: readonly { role: string; strategy: string }[] = [
  { role: "attachment", strategy: "process_guidance" },
  { role: "instructions", strategy: "process_guidance" }
];

function packetSetFor(
  trackId: string,
  templates: { petition: string; order: string; certificate: string }
): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId: `${trackId}-primary-filing-1`,
        role: MS_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: templates.petition,
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
        role: MS_DESIGN_ROLE_TO_ENGINE_ROLE.proposed_order,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: templates.order,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide",
        requirement: "required",
        order: 2,
        approval: PENDING_APPROVAL,
        version: VERSION
      },
      {
        componentId: `${trackId}-certificate-of-service-3`,
        role: MS_DESIGN_ROLE_TO_ENGINE_ROLE.certificate_of_service,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: templates.certificate,
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
}

/**
 * The questions every Mississippi route asks, in the design's own words.
 *
 * `RequiredInput` carries only a key, a label and a required flag, so where the
 * design's question explains why it is asked, that explanation stays inside the
 * label. The keys are the design's and are not renamed.
 */
const COMMON_INPUTS: readonly RequiredInput[] = [
  {
    key: "fullName",
    label: "What is your full legal name, and any other name the case is under?",
    required: true
  },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  {
    key: "mailingAddress",
    label: "What is your current address, phone number and email?",
    required: true
  },
  {
    key: "countyOfResidence",
    label: "Which Mississippi county and city do you live in?",
    required: true
  },
  {
    key: "courtLevel",
    label:
      "Which court handled the case — justice court, county court, circuit court, or municipal court? Mississippi has four trial court levels that all handle expungements and people routinely misidentify which one heard their case.",
    required: true
  },
  {
    key: "courtCounty",
    label: "Which county was that court in? For a municipal court, which city?",
    required: true
  },
  { key: "causeNumber", label: "What is the cause or case number?", required: true },
  {
    key: "chargeName",
    label: "What were you charged with, and under which Mississippi Code section if you know it?",
    required: true
  },
  { key: "offenseDate", label: "On what date did the offence happen?", required: true },
  { key: "arrestDate", label: "On what date were you arrested or cited?", required: true },
  {
    key: "arrestingAgency",
    label: "Which agency arrested or cited you, and what is their case number if you have it?",
    required: true
  },
  {
    key: "prosecutingAuthority",
    label:
      "Which prosecuting authority handled the case — the district attorney for the circuit district, or a county or municipal prosecuting attorney?",
    required: true
  }
];

const DRUG_INPUTS: readonly RequiredInput[] = [
  ...COMMON_INPUTS,
  {
    key: "chargeType",
    label:
      "What was the drug charge — simple possession, possession of paraphernalia, or something else? Trafficking, distribution and sale are outside this route.",
    required: true
  },
  {
    key: "conditionalDischarge",
    label:
      "Did the court place you on probation WITHOUT entering a judgment of guilt, under the conditional discharge provision? Answer yes or no.",
    required: true
  },
  {
    key: "dischargeDate",
    label: "On what date did the court discharge you and dismiss the proceedings?",
    required: true
  },
  {
    key: "probationCompleted",
    label:
      "Did you successfully complete the probation and every condition attached to it? Answer yes or no.",
    required: true
  },
  {
    key: "priorDrugDisposition",
    label:
      "Have you ever had any prior drug charge, conviction, conditional discharge or dismissal? This benefit is once-only and a nonpublic record is kept for exactly that check. Answer yes or no.",
    required: true
  }
];

const DUI_INPUTS: readonly RequiredInput[] = [
  ...COMMON_INPUTS,
  { key: "duiConvictionDate", label: "On what date were you convicted of the DUI?", required: true },
  {
    key: "duiConvictionCourt",
    label:
      "Which court entered the DUI conviction? Note that the expungement petition itself goes to the circuit court of that county, not back to the convicting court.",
    required: true
  },
  {
    key: "sentenceCompletionDate",
    label: "On what date did you successfully complete all terms and conditions of the sentence?",
    required: true
  },
  {
    key: "commercialLicence",
    label:
      "Did you hold a commercial driver's licence or a commercial learner's permit at the time of the offence? Answer yes or no.",
    required: true
  },
  {
    key: "refusedTest",
    label: "Did you refuse the blood or breath test? Answer yes or no.",
    required: true
  },
  {
    key: "bacResult",
    label:
      "If a test was taken, what was the blood alcohol concentration result? If no test was taken at all, say so.",
    required: true
  },
  {
    key: "otherDui",
    label: "Do you have any other DUI conviction, or any DUI charge pending now? Answer yes or no.",
    required: true
  },
  {
    key: "priorDuiRelief",
    label:
      "Have you ever had a DUI nonadjudication or a DUI expungement before? Answer yes or no.",
    required: true
  },
  {
    key: "justification",
    label:
      "In your own words, why should the court grant this expungement? The statute requires you to justify it, and this is your statement.",
    required: true
  }
];

const MIP_INPUTS: readonly RequiredInput[] = [
  ...COMMON_INPUTS,
  {
    key: "alcoholOffense",
    label:
      "What exactly were you charged with — underage purchase or possession of beer, light wine or a light spirit product, or an underage false age statement?",
    required: true
  },
  {
    key: "dispositionType",
    label:
      "How did the case end — dismissed and discharged, convicted and sentence completed, or still pending?",
    required: true
  },
  { key: "dispositionDate", label: "On what date did it end that way?", required: true },
  {
    key: "sentenceCompletionDate",
    label:
      "If you were sentenced, on what date did you complete everything the court ordered, including any fine?",
    required: true
  },
  { key: "ageAtOffense", label: "How old were you at the time of the offence?", required: true },
  {
    key: "clerkConfirmedTiming",
    label:
      "Have you asked the clerk of that court what the current waiting period is for this kind of expungement, and whether that court charges a fee? Answer yes or no.",
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

export const MS_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "MS",
    trackId: MS_DRUG_TRACK_ID,
    publicName: "First-time drug possession cases",
    mechanism: "controlled_substance_conditional_discharge_expungement",
    authority: "Miss. Code Ann. § 41-29-150(d)(1) and (d)(2)",
    recordTypes: ["charge", "case_record"],
    dispositions: ["conditional_discharge_completed_and_dismissed"],
    courtLevel: "the_court_that_granted_the_conditional_discharge_and_entered_the_dismissal",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSetFor(MS_DRUG_TRACK_ID, {
      petition: DRUG_PETITION.templateId,
      order: DRUG_ORDER.templateId,
      certificate: DRUG_CERTIFICATE.templateId
    }),
    requiredInputs: DRUG_INPUTS,
    statuses: { ...statuses, runtime },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "ms-conditional-discharge-expungement",
    assembledPacketTitle:
      "Mississippi conditional discharge expungement — Miss. Code Ann. § 41-29-150(d)(2)",
    customerDeliverableDescription:
      "An application to the court that deferred the proceedings and later discharged and dismissed them, asking it to expunge the record under Miss. Code Ann. § 41-29-150(d)(2), with a proposed order and an unexecuted certificate of service. The application pleads the deferral without adjudication of guilt, the completed probation and the discharge and dismissal, and does not plead § 99-19-71. Whether the charge was an eligible possession or paraphernalia offence is the participant's own statement from the charging document; the court's findings, signature, date and the approval as to form are left blank; no fee amount is printed, because § 41-29-150 specifies none.",
    notes:
      "Once-only relief, and the Bureau of Narcotics keeps a nonpublic record for exactly that check, so any prior drug disposition stops the route. The court determines the application after hearing, which the proposed order recites rather than assumes."
  },
  {
    jurisdiction: "MS",
    trackId: MS_DUI_TRACK_ID,
    publicName: "Clearing a first DUI",
    mechanism: "first_offence_dui_expunction",
    authority: "Miss. Code Ann. § 63-11-30(13)",
    recordTypes: ["conviction"],
    dispositions: ["first_offense_dui_conviction"],
    courtLevel: "the_circuit_court_of_the_county_of_conviction",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSetFor(MS_DUI_TRACK_ID, {
      petition: DUI_PETITION.templateId,
      order: DUI_ORDER.templateId,
      certificate: DUI_CERTIFICATE.templateId
    }),
    requiredInputs: DUI_INPUTS,
    statuses: { ...statuses, runtime },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "ms-first-offence-dui-expunction",
    assembledPacketTitle: "Mississippi first-offence DUI expunction — Miss. Code Ann. § 63-11-30(13)",
    customerDeliverableDescription:
      "A petition to the circuit court of the county of conviction under Miss. Code Ann. § 63-11-30(13), with a proposed order and an unexecuted certificate of service. Each statutory condition is pleaded separately as the participant's own statement of fact, and the justification the statute requires is the participant's own words, reproduced without change and never composed by LegalEase. Venue is the circuit court even where a municipal or justice court entered the conviction, which is the design's single most-likely failure mode. Relief is discretionary; nothing in the packet says it will be granted.",
    notes:
      "Every DUI packet carries mandatory attorney review before filing and a post-generation handoff, and says so on its face. The expunction provision is subsection (13) per enrolled SB 2095 (Laws 2022 ch. 303); it is widely cited as (14), and the petition records that caution rather than resolving it."
  },
  {
    jurisdiction: "MS",
    trackId: MS_MIP_TRACK_ID,
    publicName: "Underage drinking charges",
    mechanism: "underage_alcohol_expungement",
    authority: "Miss. Code Ann. § 67-3-70(6)",
    recordTypes: ["conviction", "charge"],
    dispositions: ["underage_alcohol_purchase_or_possession"],
    courtLevel: "the_court_in_which_the_underage_alcohol_charge_was_disposed_of",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSetFor(MS_MIP_TRACK_ID, {
      petition: MIP_PETITION.templateId,
      order: MIP_ORDER.templateId,
      certificate: MIP_CERTIFICATE.templateId
    }),
    requiredInputs: MIP_INPUTS,
    statuses: { ...statuses, runtime },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "ms-underage-alcohol-expungement",
    assembledPacketTitle: "Mississippi underage alcohol expungement — Miss. Code Ann. § 67-3-70(6)",
    customerDeliverableDescription:
      "A petition to the court that disposed of the underage alcohol charge under Miss. Code Ann. § 67-3-70(6), with a proposed order and an unexecuted certificate of service. The route reaches subsections (1) and (2) only, and reaches anyone charged with such a violation, so a dismissed case qualifies as well as a conviction. The proposed order asks for whichever of the section's two alternative findings the participant's own disposition answer supports, and imports no restoration or perjury-protection clause, because the section supplies neither.",
    notes:
      "The one-year period runs from the later of the dismissal and discharge or the completion of any sentence and payment of any fine, and which event is later is the participant's own statement. The petition recites the rule and the dates and leaves the arithmetic to the court; the participant confirms the current rule and the fee with the clerk before filing."
  }
];
