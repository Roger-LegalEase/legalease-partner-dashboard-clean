// Missouri record clearing — custom-pleading implementation.
//
// Two assigned routes, four assigned custom-pleading components. Both are
// alcohol matters, both are once in a lifetime, and both exist as drafted
// pleadings because the Office of the State Courts Administrator publishes no
// form for either section — a June 2024 Missouri pro se guide lists §§ 311.326
// and 610.130 among the statutes for which no Missouri court forms are prepared
// and directs the reader to draft their own petition on the published pattern.
//
//   mo-311-326-minor-in-possession   Mo. Rev. Stat. § 311.326. A first violation
//       of § 311.325, applied for at the SENTENCING court after a period of not
//       less than one year after the applicant reached twenty-one — so the
//       earliest possible application is at twenty-two, however old the case is.
//       Relief is mandatory: on the conditions the court "shall enter an order
//       of expungement", and the section says "upon review" rather than "after
//       hearing".
//
//   mo-610-130-first-intoxication    Mo. Rev. Stat. § 610.130. A first
//       intoxication-related traffic or boating offence that was a misdemeanour
//       or a county or city ordinance violation, applied for at the court of
//       plea or sentence after not less than ten years. Relief is mandatory
//       after a hearing. Subsection 4 disapplies the whole section to anyone who
//       has been issued, or is required to possess, a commercial driver's
//       licence in Missouri or ANY other state.
//
// The `cover_sheet` and `fee_waiver` components the design assigns beside them
// are `official_pdf_fill` — the Confidential Case Filing Information Sheet
// (FI-05) and the GN10 — and the `instructions` component is
// `process_guidance`. All three belong to other lanes. They are named here as
// excluded, and nothing in this module produces them.
//
// **The one condition neither document ever applies.** Section 302.525.3
// defines an "alcohol-related enforcement contact" as any suspension or
// revocation under §§ 302.500 to 302.540, any suspension or revocation entered
// in Missouri or any other state for a refusal to submit to chemical testing
// under an implied consent law, and any conviction in any state involving
// driving while intoxicated, driving under the influence of drugs or alcohol, or
// driving with an unlawful alcohol concentration. That definition is reproduced
// verbatim in both documents, because the design records that a participant
// asked whether they have had one will otherwise think only of convictions and
// miss an administrative licence suspension that never became one. But whether a
// particular entry on a particular driver record IS such a contact — especially
// an out-of-state entry — is individualized legal judgment, and LegalEase never
// makes it. Anything the participant cannot explain, and anything out of state,
// stops the route.
//
// **Firstness is the participant's sworn allegation and nothing else.** On both
// sections it is the whole eligibility question, both are once in a lifetime,
// and a machine-generated guess is unacceptable where getting it wrong spends
// the one application a person will ever have. So the application recites
// firstness as the applicant's own allegation under the declaration, and any
// uncertainty stops the route rather than being drafted around.
//
// **Two routes that must never be confused with a third.** Section 610.140.3(7)
// excludes offences eligible under § 610.130 and § 610.140.3(8) excludes
// intoxication-related traffic and boating offences generally, so the general
// Missouri track and this one never overlap and a drink-driving matter must
// never be routed through the general track. Both documents say so.
//
// **What is left blank.** The case number in every caption — carried from the
// certified docket where the application proceeds under the original number, and
// assigned by the clerk where a new case is opened; the FI-05 case type code,
// because the official Case Types List publishes no code naming either section
// and the packet will not guess one from a similar track name; the applicant's
// signature and date beneath the declaration under penalty of perjury; the
// hearing date; and every judicial finding, granting line, date and signature on
// the proposed orders. No fee amount appears anywhere: neither section fixes
// one, both are county-variable, and the design records that as an open release
// question.
//
// **The certificate of service is optional and unexecuted.** Neither section
// prescribes service. The design includes a certificate for the participant to
// complete ONLY if the clerk directs that the named respondents be served, and
// to leave blank otherwise, so it is a block at the foot of each application
// rather than a component of its own — the packet-set manifest assigns none.
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
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED APPLICANT — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referral destinations
// ---------------------------------------------------------------------------

/** Where a stop that needs individual legal advice sends the participant. */
export const MO_LAWYER_REFERRAL =
  "A Missouri lawyer — through The Missouri Bar's lawyer referral service, or a legal-aid office serving the county the case was heard in. Both of these sections give one expungement per person for life, so an hour of advice before filing is cheap.";

/** Where every local-practice question goes. */
export const MO_CLERK_REFERRAL =
  "The clerk of the Missouri court that took the plea or imposed the sentence, who is the only office that can say whether the application opens a new case or is filed under the original number, what the fee is, whether a cover sheet is required and which case type code it takes.";

/** Where the driver-record questions go, and most of them do. */
export const MO_DRIVER_RECORD_REFERRAL =
  "The Missouri Department of Revenue, for the driver record. It is the only practical way to see an alcohol-related enforcement contact that never became a conviction, and an administrative suspension disqualifies under § 302.525.3 even though nothing in the phrase would tell a person so.";

/** Where the court-record questions go. */
export const MO_COURT_RECORD_REFERRAL =
  "The clerk of the sentencing court for the certified docket and judgment, and the Missouri State Highway Patrol Criminal Justice Information Services Division for the criminal record.";

/** Where a drink-driving matter belongs when it lands on the wrong route. */
export const MO_INTOXICATION_ROUTE_REFERRAL =
  "LegalEase's own Missouri routing: an intoxication-related traffic or boating offence runs under Mo. Rev. Stat. § 610.130 and never through the general § 610.140 track, which excludes it twice over at subsections 3(7) and 3(8).";

/** The closed set of destinations. A stop may not invent a sixth. */
export const MO_REFERRALS: readonly string[] = [
  MO_LAWYER_REFERRAL,
  MO_CLERK_REFERRAL,
  MO_DRIVER_RECORD_REFERRAL,
  MO_COURT_RECORD_REFERRAL,
  MO_INTOXICATION_ROUTE_REFERRAL
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class MissouriEligibilityStopError extends Error {
  readonly code = "missouri_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "MissouriEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class MissouriBranchError extends Error {
  readonly code = "missouri_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "MissouriBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

export const MO_MIP_TRACK_ID = "mo-311-326-minor-in-possession";
export const MO_DWI_TRACK_ID = "mo-610-130-first-intoxication";

export const MO_ASSIGNED_TRACK_IDS: readonly string[] = [MO_MIP_TRACK_ID, MO_DWI_TRACK_ID];

export const MO_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * A three-valued answer wherever "I'm not sure" is a different position from
 * "no".
 *
 * Both sections are once in a lifetime, so an uncertain answer is not something
 * to resolve in the applicant's favour — it is a reason to stop and send them to
 * the record that would settle it.
 */
export const MO_YES_NO_UNSURE: Readonly<Record<string, "yes" | "no" | "unsure">> = {
  yes: "yes",
  no: "no",
  unsure: "unsure",
  "not sure": "unsure",
  "i am not sure": "unsure"
};

/** Whether the underage charge was the statute the section names, or an ordinance. */
export const MO_MIP_CHARGE_BASIS: Readonly<
  Record<string, "section_311_325" | "city_or_county_ordinance" | "unsure">
> = {
  section_311_325: "section_311_325",
  "section 311.325": "section_311_325",
  "311.325": "section_311_325",
  statute: "section_311_325",
  city_or_county_ordinance: "city_or_county_ordinance",
  "city or county ordinance": "city_or_county_ordinance",
  ordinance: "city_or_county_ordinance",
  unsure: "unsure",
  "not sure": "unsure"
};

/** The level the intoxication offence was charged at. A felony is not eligible. */
export const MO_OFFENSE_LEVELS: Readonly<
  Record<string, "state_misdemeanor" | "county_or_city_ordinance" | "felony" | "unsure">
> = {
  state_misdemeanor: "state_misdemeanor",
  "state misdemeanor": "state_misdemeanor",
  misdemeanor: "state_misdemeanor",
  county_or_city_ordinance: "county_or_city_ordinance",
  "county or city ordinance": "county_or_city_ordinance",
  ordinance: "county_or_city_ordinance",
  felony: "felony",
  unsure: "unsure",
  "not sure": "unsure"
};

/**
 * Answer keys that would carry outside-party work into a Missouri packet.
 *
 * The determination and the order are the court's on both sections; the hearing
 * is the court's on § 610.130; the driver record is the Department of Revenue's;
 * and service, where a clerk directs it at all, is an act the participant
 * performs after this packet is made.
 */
export const MO_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "caseTypeCode",
  "clerkCertification",
  "courtDetermination",
  "courtFinding",
  "expungementOrder",
  "filingDate",
  "hearingDate",
  "judgeSignature",
  "prosecutorPosition",
  "serviceCompletedDate"
];

/**
 * Keys a caller may volunteer that route the matter away rather than into a
 * document. The design records all four as self-help stops and forbids the
 * packet from speaking to any of them.
 */
export const MO_SCREENED_ROUTING_KEYS: readonly string[] = [
  "federalEmployment",
  "firearmsQuestion",
  "immigrationStatus",
  "professionalLicence"
];

/** The § 302.525.3 definition, reproduced rather than paraphrased. */
export const MO_ENFORCEMENT_CONTACT_DEFINITION =
  "Section 302.525.3 defines an alcohol-related enforcement contact as any suspension or revocation under sections 302.500 to 302.540, any suspension or revocation entered in this state or any other state for a refusal to submit to chemical testing under an implied consent law, and any conviction in any state involving driving while intoxicated, driving under the influence of drugs or alcohol, or driving with an unlawful alcohol concentration.";

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

/** Declared rather than assigned, so TypeScript narrows after it. */
function stop(
  stopId: string,
  trackId: string,
  reason: string,
  referral: string,
  nextStep: string
): never {
  throw new MissouriEligibilityStopError(stopId, trackId, reason, referral, nextStep);
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
  referral: string = MO_COURT_RECORD_REFERRAL
): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "mo-answer-missing",
      trackId,
      `This packet needs an answer to ${key} before anything can be prepared, and none was given. No statewide form exists for either of these sections, so the whole application is drafted from the applicant's own answers — the court, the county, the dates, the offence and the agencies that hold records — and none of it can be defaulted.`,
      referral,
      "Get the certified docket and judgment from the court that sentenced you, and your Department of Revenue driver record, then answer the question from those documents rather than from memory."
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
    throw new MissouriBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), MO_YES_NO);

const yesNoUnsure = (trackId: string, answers: Answers, key: string): "yes" | "no" | "unsure" =>
  branch(trackId, key, need(trackId, answers, key), MO_YES_NO_UNSURE);

/**
 * Whether a volunteered answer ASSERTS the screened condition or denies it.
 *
 * These keys are not declared by the design; a caller may supply them and the
 * usual answer is a denial. A blunt keyword test reads "no, I have never held a
 * professional licence" as an assertion, and a false stop sends somebody to a
 * lawyer they did not need. A negation standing in front of the match defeats
 * it; the immigration pattern encodes its own negation, which is why the guard
 * looks only at what precedes the match.
 */
const PRECEDING_NEGATION = /\b(no|not|never|none|without|neither)\b/i;
function assertsScreened(value: string, positive: RegExp): boolean {
  const match = value.match(positive);
  if (!match) return false;
  return !PRECEDING_NEGATION.test(value.slice(0, value.indexOf(match[0])));
}

const ASSERTS_IMMIGRATION_ISSUE =
  /\b(not a (us|u\.s\.|united states) citizen|non[- ]?citizen|green card|lawful permanent resident|visa holder|undocumented|removal proceedings|deportation)\b/i;
const ASSERTS_COLLATERAL =
  /\b(yes|i (do|am|hold|need)|required for|applying for|renewal|clearance|background investigation)\b/i;

/** Anything the participant reports from outside Missouri. */
const OUT_OF_STATE =
  /\b(another state|other state|out[- ]of[- ]state|illinois|kansas|arkansas|oklahoma|nebraska|iowa|tennessee|kentucky)\b/i;

// ---------------------------------------------------------------------------
// Screens that run on both routes, in this order
// ---------------------------------------------------------------------------

function refuseOutsidePartyContent(trackId: string, answers: Answers): void {
  const supplied = MO_OUTSIDE_PARTY_KEYS.filter((key) => str(answers, key).length > 0);
  if (supplied.length === 0) return;
  stop(
    "mo-outside-party-content-refused",
    trackId,
    `Content was supplied for ${supplied.join(", ")}. Every one of those belongs to somebody else: § 311.326 makes the determination the court's to make upon review and § 610.130.2 makes the findings the court's to make after hearing; the granting line, the date and the signature are the judge's; the hearing is the court's to set; the FI-05 case type code is the clerk's to give, because the official Case Types List publishes no code naming either section; and service, where a clerk directs it at all, is an act the applicant performs after this packet is made. LegalEase produces none of them.`,
    MO_CLERK_REFERRAL,
    "File the application and the proposed order and let the court make its own determination. Ask the clerk for the case type code, the fee and whether the court wants the named respondents served."
  );
}

function screenRouting(trackId: string, answers: Answers): void {
  const immigration = str(answers, "immigrationStatus");
  if (immigration && assertsScreened(immigration, ASSERTS_IMMIGRATION_ISSUE)) {
    stop(
      "mo-immigration-consequences-attorney-only",
      trackId,
      "The answers raise an immigration consequence. The design makes that a self-help stop on both Missouri routes and separately forbids this packet from saying anything about what an expungement does to an immigration matter. Both rules point the same way, and both of these sections are once in a lifetime.",
      MO_LAWYER_REFERRAL,
      "Speak to an immigration lawyer, or a lawyer who works with one, before filing either of these applications."
    );
  }
  for (const key of ["professionalLicence", "firearmsQuestion", "federalEmployment"]) {
    const value = str(answers, key);
    if (value && assertsScreened(value, ASSERTS_COLLATERAL)) {
      stop(
        "mo-collateral-purpose-attorney-only",
        trackId,
        `The answers say the application is being made because of ${key === "professionalLicence" ? "a professional licence" : key === "firearmsQuestion" ? "a firearms question" : "a federal employment application"}. The design makes each of those a self-help stop: what an expungement does and does not do for that purpose is exactly the individualized advice this packet cannot give, and spending a once-in-a-lifetime expungement on a wrong assumption about it is not recoverable.`,
        MO_LAWYER_REFERRAL,
        "Ask a Missouri lawyer what this expungement would and would not do for the purpose you have in mind, before you spend the one application the section gives you."
      );
    }
  }
}

/**
 * The alcohol-record screens both sections share.
 *
 * LegalEase never decides whether a particular driver-record entry is an
 * alcohol-related enforcement contact under § 302.525.3. An assertion stops the
 * route because the condition fails; an uncertain answer stops it because the
 * driver record is the document that settles it; and anything out of state stops
 * it because the design refers every out-of-state licence, conviction,
 * suspension or revocation.
 */
function screenAlcoholRecord(trackId: string, answers: Answers, contactsKey: string): void {
  const raw = need(trackId, answers, contactsKey, MO_DRIVER_RECORD_REFERRAL);
  // Read before the closed list rejects it: an answer that volunteers another
  // state is a referral, not a malformed answer, and the participant deserves
  // the reason rather than "that is not one of yes, no or unsure".
  if (OUT_OF_STATE.test(raw)) {
    stop(
      "mo-out-of-state-record",
      trackId,
      "The answers describe a licence, conviction, suspension or revocation in another state. The design refers every out-of-state matter on both Missouri routes: § 302.525.3 reaches suspensions and revocations entered in any other state and convictions in any state, and reading another state's driver record against a Missouri definition is not something this packet does.",
      MO_LAWYER_REFERRAL,
      "Obtain the other state's driver record and take it, with your Missouri record, to a Missouri lawyer before filing."
    );
  }
  const contacts = branch(trackId, contactsKey, raw, MO_YES_NO_UNSURE);
  if (contacts === "yes") {
    stop(
      "mo-alcohol-enforcement-contact",
      trackId,
      `The answers report a licence suspension or revocation for something alcohol-related. ${MO_ENFORCEMENT_CONTACT_DEFINITION} Both sections condition relief on there being no such contact, and an administrative suspension disqualifies even though it never became a conviction. Whether a particular entry is one is individualized legal judgment, and LegalEase does not make it either way.`,
      MO_LAWYER_REFERRAL,
      "Take your Department of Revenue driver record, and any out-of-state driver record, to a Missouri lawyer and ask whether the entry is an alcohol-related enforcement contact under § 302.525.3 before you file."
    );
  }
  if (contacts === "unsure") {
    stop(
      "mo-alcohol-record-not-established",
      trackId,
      `Whether there has been an alcohol-related enforcement contact has not been established. ${MO_ENFORCEMENT_CONTACT_DEFINITION} A participant answering from memory will think of convictions and miss an administrative suspension, which is why the design makes the driver record a document to obtain before filing rather than a detail to recall.`,
      MO_DRIVER_RECORD_REFERRAL,
      "Order your Missouri Department of Revenue driver record, read every suspension and revocation entry on it, and answer again from the document."
    );
  }
}

/** The agency list is the applicant's, and it has to have been checked. */
function screenAgencyList(trackId: string, answers: Answers): string {
  const agencyList = need(trackId, answers, "agencyList", MO_COURT_RECORD_REFERRAL);
  if (!yesNo(trackId, answers, "agencyListConfirmed")) {
    stop(
      "mo-agency-list-not-confirmed",
      trackId,
      "The list of agencies believed to hold records has not been checked against the Highway Patrol record and the court paperwork. The order reaches the agencies the order names, so an agency left off the list keeps its record, and the applicant gets one application under either of these sections and no second one to correct it with.",
      MO_COURT_RECORD_REFERRAL,
      "Get the Highway Patrol criminal record and the certified docket, check every agency that appears on them against your list, add anything missing, and answer again."
    );
  }
  return agencyList;
}

/**
 * The one optional answer this module reads that the design does not declare.
 *
 * Both sections carry a period, one measured from a birthday and one from a
 * plea, and both are once in a lifetime. A self-help packet that cannot notice
 * an obviously premature application is worse than one that can — but LegalEase
 * makes no eligibility determination and holds no clock, and reading the wall
 * clock would make every rendered fixture non-deterministic. So the check runs
 * only where the participant states the date they are preparing the packet, it
 * is never required, and it can only ever stop.
 */
export const MO_PREPARATION_DATE_KEY = "preparationDate";

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
  const preparation = str(answers, MO_PREPARATION_DATE_KEY);
  if (!preparation) return;
  const preparationYear = yearIn(preparation);
  const fromYear = yearIn(fromDate);
  if (preparationYear === null || fromYear === null) return;
  if (preparationYear - fromYear >= requiredYears) return;
  stop(stopId, trackId, reason, referral, nextStep);
}

// ---------------------------------------------------------------------------
// mo-311-326-minor-in-possession — Mo. Rev. Stat. § 311.326
// ---------------------------------------------------------------------------

function deriveMipFacts(answers: Answers): Record<string, string> {
  const trackId = MO_MIP_TRACK_ID;

  const fullName = need(trackId, answers, "fullName");
  const dateOfBirth = need(trackId, answers, "dateOfBirth");
  const currentAddress = need(trackId, answers, "currentAddress");
  const sentencingCourt = need(trackId, answers, "sentencingCourt", MO_CLERK_REFERRAL);
  const sentencingDate = need(trackId, answers, "sentencingDate");

  if (UNKNOWN_ANSWER.test(sentencingCourt)) {
    stop(
      "mo-venue-not-identified",
      trackId,
      "Which court sentenced the applicant, and in which county, has not been identified. Section 311.326 directs the application to the court in which the person was sentenced and to no other, and on a case transferred or certified elsewhere that may not be the court where the charge was first filed. The caption names it and it cannot be defaulted.",
      MO_COURT_RECORD_REFERRAL,
      "Take the sentencing court and county off the certified docket rather than from memory, and answer again."
    );
  }

  const chargeBasis = branch(
    trackId,
    "section311325Violation",
    need(trackId, answers, "section311325Violation"),
    MO_MIP_CHARGE_BASIS
  );
  if (chargeBasis === "city_or_county_ordinance") {
    stop(
      "mo-mip-ordinance-not-the-statute",
      trackId,
      "The charge was a city or county ordinance violation rather than a violation of § 311.325 itself. Section 311.326 names the statute, and the design applies the narrower reading that excludes an ordinance conviction. Whether a Missouri court would read it more broadly is an open question the packet records rather than answers — and it is not one to test with an application that can only be made once.",
      MO_LAWYER_REFERRAL,
      "Take the charging document and the certified docket to a Missouri lawyer and ask whether § 311.326 reaches an ordinance conviction in the court you would file in."
    );
  }
  if (chargeBasis === "unsure") {
    stop(
      "mo-mip-charge-basis-not-established",
      trackId,
      "Whether the charge was under § 311.325 itself or under a city or county ordinance has not been established. Section 311.326 names the statute, so the answer decides whether this route is open at all, and it comes from the charging document rather than from memory.",
      MO_COURT_RECORD_REFERRAL,
      "Get the charging document and the certified docket from the sentencing court, read which law was charged, and answer again."
    );
  }

  const firstViolation = yesNoUnsure(trackId, answers, "firstViolation");
  if (firstViolation === "no") {
    stop(
      "mo-mip-not-first-violation",
      trackId,
      "This was not the first time the applicant pleaded guilty to or was found guilty of violating § 311.325. The section reaches a first violation only, so the eligibility element cannot be alleged.",
      MO_LAWYER_REFERRAL,
      "Take your complete Missouri record to a lawyer. Whether anything else is open is a question for advice."
    );
  }
  if (firstViolation === "unsure") {
    stop(
      "mo-mip-firstness-not-established",
      trackId,
      "Whether this was the applicant's first violation has not been established. Firstness is the eligibility element, the application alleges it as the applicant's own sworn statement under a declaration under penalty of perjury, and the relief is once in a lifetime. LegalEase will not draft a sworn allegation nobody has checked.",
      MO_COURT_RECORD_REFERRAL,
      "Get your Highway Patrol criminal record and the certified docket, check whether there is any earlier § 311.325 finding, and answer again."
    );
  }

  if (yesNo(trackId, answers, "subsequentAlcoholOffense")) {
    stop(
      "mo-mip-subsequent-alcohol-offence",
      trackId,
      "There has been a conviction for another alcohol-related offence since the § 311.325 conviction. Section 311.326 conditions relief on there being none, so the condition cannot be alleged. If the later matter is a drink-driving offence, it is its own route with its own ten-year period.",
      MO_INTOXICATION_ROUTE_REFERRAL,
      "Take your complete record to a Missouri lawyer, and look at whether the later matter has its own expungement route before doing anything with this one."
    );
  }

  screenAlcoholRecord(trackId, answers, "alcoholEnforcementContacts");

  if (yesNo(trackId, answers, "cdlStatus")) {
    stop(
      "mo-mip-commercial-driver",
      trackId,
      "The applicant is licensed as a commercial motor vehicle driver, or was operating a commercial motor vehicle as defined in § 302.700 at the time of the violation. Section 311.326 says no records shall be expunged in either case. That is a bar on its face, not a longer period.",
      MO_LAWYER_REFERRAL,
      "Check your driver record for a commercial licence and the citation for the vehicle you were in. If either applies, this route is closed and a lawyer is the next step."
    );
  }

  if (yesNo(trackId, answers, "priorSection311326Expungement")) {
    stop(
      "mo-mip-expungement-already-used",
      trackId,
      "The applicant has already had an expungement under § 311.326. The section entitles a person to only one, and lets courts and other state officials keep the records necessary to enforce that limit. There is no second application.",
      MO_LAWYER_REFERRAL,
      "Take both matters to a Missouri lawyer. Whether anything else reaches the second record is a question for advice."
    );
  }

  if (UNKNOWN_ANSWER.test(dateOfBirth) || !statesAYear(dateOfBirth)) {
    stop(
      "mo-mip-age-not-established",
      trackId,
      "The applicant's date of birth has not been established. Section 311.326 runs its period from the applicant's twenty-first birthday rather than from the offence or the conviction, so the date of birth is the only date the timing turns on, and the earliest possible application is at twenty-two however old the case is.",
      MO_COURT_RECORD_REFERRAL,
      "Take your date of birth from an identity document, and answer again."
    );
  }
  screenElapsed(
    trackId,
    answers,
    dateOfBirth,
    22,
    "mo-mip-age-window-not-open",
    "On the dates given, the applicant has not yet turned twenty-two. Section 311.326 allows the application only after a period of not less than one year after the person reaches twenty-one, so the earliest possible application is at twenty-two — and that is true however long ago the violation was. This packet does not decide eligibility; it declines to prepare an application the dates in front of it say is early.",
    MO_CLERK_REFERRAL,
    "Work the date out from your own date of birth and come back once a year has passed since your twenty-first birthday."
  );

  const agencyList = screenAgencyList(trackId, answers);
  const feeWaiverNeeded = yesNo(trackId, answers, "feeWaiverNeeded");

  return {
    fullName,
    dateOfBirth,
    currentAddress,
    section311325Violation: chargeBasis,
    firstViolation: "yes",
    sentencingCourt,
    sentencingDate,
    subsequentAlcoholOffense: "no",
    alcoholEnforcementContacts: "no",
    cdlStatus: "no",
    priorSection311326Expungement: "no",
    agencyList,
    agencyListConfirmed: "yes",
    feeWaiverNeeded: feeWaiverNeeded ? "yes" : "no",

    applicantName: fullName,
    courtLine: `IN THE ${sentencingCourt.toUpperCase()}, STATE OF MISSOURI`,
    identificationStatement: `The applicant is ${fullName}, date of birth ${dateOfBirth}, whose mailing address is ${currentAddress}.`,
    caseStatement: `The applicant states the sentencing court and case as: ${sentencingCourt}; ${sentencingDate}. Section 311.326 directs this application to the court in which the applicant was sentenced.`,
    chargeStatement:
      "The applicant states that the charge was a violation of Mo. Rev. Stat. § 311.325, the statute § 311.326 names, and not a city or county ordinance.",
    firstnessStatement:
      "The applicant states, as the applicant's own allegation under the declaration below, that this was the first time the applicant pleaded guilty to or was found guilty of violating § 311.325.",
    agencyStatement: `The applicant believes the following persons and agencies hold records of this matter: ${agencyList}`,
    agencyDirective: agencyList,
    feeWaiverStatement: feeWaiverNeeded
      ? "The applicant cannot pay the filing fee and court costs and will ask the Court to allow the filing without them. The application to do that is a separate court form, which the clerk of this Court supplies and which is not part of this document."
      : "The applicant will pay the filing fee and court costs the clerk of this Court sets. No amount is stated here, because § 311.326 fixes none and the amount varies by county.",
    packetCaseReference: "Missouri minor in possession expungement"
  };
}

// ---------------------------------------------------------------------------
// mo-610-130-first-intoxication — Mo. Rev. Stat. § 610.130
// ---------------------------------------------------------------------------

function deriveDwiFacts(answers: Answers): Record<string, string> {
  const trackId = MO_DWI_TRACK_ID;

  const fullName = need(trackId, answers, "fullName");
  const dateOfBirth = need(trackId, answers, "dateOfBirth");
  const currentAddress = need(trackId, answers, "currentAddress");
  const offenseDescription = need(trackId, answers, "offenseDescription");
  const pleaOrSentenceDate = need(trackId, answers, "pleaOrSentenceDate");
  const courtOfPlea = need(trackId, answers, "courtOfPlea", MO_CLERK_REFERRAL);
  const caseNumber = need(trackId, answers, "caseNumber");

  if (UNKNOWN_ANSWER.test(courtOfPlea)) {
    stop(
      "mo-venue-not-identified",
      trackId,
      "Which court took the plea or imposed the sentence has not been identified. Section 610.130.1 directs the application to that court — which for an ordinance violation is often a municipal division and for a state misdemeanour an associate circuit division. It is not the county of arrest and it is not a freely chosen circuit court.",
      MO_COURT_RECORD_REFERRAL,
      "Take the court and county off the certified docket rather than from memory, and answer again."
    );
  }

  const offenseLevel = branch(
    trackId,
    "offenseLevel",
    need(trackId, answers, "offenseLevel"),
    MO_OFFENSE_LEVELS
  );
  if (offenseLevel === "felony") {
    stop(
      "mo-dwi-felony-not-eligible",
      trackId,
      "The offence was charged as a felony. Section 610.130.1 reaches a first intoxication-related traffic or boating offence which is a misdemeanour or a county or city ordinance violation, and a felony is outside it.",
      MO_LAWYER_REFERRAL,
      "Check the level on the certified docket. If it really was a felony, this route is closed and a lawyer is the next step."
    );
  }
  if (offenseLevel === "unsure") {
    stop(
      "mo-dwi-offence-level-not-established",
      trackId,
      "Whether the offence was charged as a state misdemeanour, as a county or city ordinance violation, or as a felony has not been established. The level decides whether § 610.130 reaches it at all, and the certified docket carries it.",
      MO_COURT_RECORD_REFERRAL,
      "Get the certified docket and judgment from the court of plea, read the level off it, and answer again."
    );
  }

  const firstOffense = yesNoUnsure(trackId, answers, "firstOffense");
  if (firstOffense === "no") {
    stop(
      "mo-dwi-not-first-offence",
      trackId,
      "This was not the applicant's first intoxication-related traffic or boating offence. Section 610.130.1 reaches a first offence only, so the eligibility element cannot be alleged.",
      MO_LAWYER_REFERRAL,
      "Take your complete driver record and criminal record to a Missouri lawyer."
    );
  }
  if (firstOffense === "unsure") {
    stop(
      "mo-dwi-firstness-not-established",
      trackId,
      "Whether this was the applicant's first intoxication-related traffic or boating offence has not been established. Firstness is the whole eligibility question, the application alleges it as the applicant's own sworn statement, and the relief is once in a lifetime with no second chance. LegalEase will not draft a sworn allegation nobody has checked.",
      MO_DRIVER_RECORD_REFERRAL,
      "Order your Department of Revenue driver record and your Highway Patrol criminal record, read every entry, and answer again from the documents."
    );
  }

  if (yesNo(trackId, answers, "subsequentIntoxicationConviction")) {
    stop(
      "mo-dwi-subsequent-conviction",
      trackId,
      "There has been a conviction for another intoxication-related traffic or boating offence since the first plea or conviction. Sections 610.130.1 and 610.130.2 both condition relief on there being none — during the whole of the ten-year period and again as at the date of the hearing — so the condition cannot be alleged.",
      MO_LAWYER_REFERRAL,
      "Take your driver record and your criminal record to a Missouri lawyer before doing anything further."
    );
  }

  screenAlcoholRecord(trackId, answers, "alcoholEnforcementContacts");

  if (yesNo(trackId, answers, "pendingMatters")) {
    stop(
      "mo-dwi-matter-pending",
      trackId,
      "There is an intoxication-related charge, a boating offence, or a licence suspension or revocation proceeding pending now. Section 610.130.2 tests that condition as at the date of the hearing, not the date of the application, so a matter pending now would defeat the application at the hearing and spend the one expungement the section allows.",
      MO_LAWYER_REFERRAL,
      "Wait until the pending matter is resolved, then take the outcome and your driver record to a Missouri lawyer before applying."
    );
  }

  if (yesNo(trackId, answers, "cdlEverIssued")) {
    stop(
      "mo-dwi-commercial-licence-ever-issued",
      trackId,
      "The applicant has been issued, or is required to possess, a commercial driver's licence. Section 610.130.4 disapplies the whole section to such a person, in Missouri or in any other state. It is a status bar rather than an offence bar, and it is asked as an ever-held question for exactly that reason.",
      MO_LAWYER_REFERRAL,
      "Check every state where you have held a licence. If a commercial licence has ever been issued to you or is required for your work, this section does not reach you and a lawyer is the next step."
    );
  }
  if (yesNo(trackId, answers, "commercialVehicle")) {
    stop(
      "mo-dwi-commercial-vehicle-offence",
      trackId,
      "The applicant was driving a commercial motor vehicle at the time of the offence. Section 610.130.1 excludes a conviction for driving a commercial motor vehicle while under the influence of alcohol from the section.",
      MO_LAWYER_REFERRAL,
      "Check the citation and the certified docket for the vehicle involved. If it was a commercial motor vehicle, this route is closed."
    );
  }

  if (yesNo(trackId, answers, "priorSection610130Expungement")) {
    stop(
      "mo-dwi-expungement-already-used",
      trackId,
      "The applicant has already had an expungement under § 610.130. Subsection 3 entitles a person to only one and lets the director keep the records sufficient to enforce that limit. There is no second application and it cannot be undone.",
      MO_LAWYER_REFERRAL,
      "Take both matters to a Missouri lawyer."
    );
  }

  if (UNKNOWN_ANSWER.test(pleaOrSentenceDate) || !statesAYear(pleaOrSentenceDate)) {
    stop(
      "mo-dwi-plea-date-not-established",
      trackId,
      "The date of the plea or sentence has not been established. Section 610.130.1 runs its ten-year period from that date, so it is the date the whole timing question turns on, and the certified docket carries it.",
      MO_COURT_RECORD_REFERRAL,
      "Get the certified docket and judgment from the court of plea, take the date off it, and answer again."
    );
  }
  screenElapsed(
    trackId,
    answers,
    pleaOrSentenceDate,
    10,
    "mo-dwi-ten-year-period-not-elapsed",
    "On the dates given, ten years have not passed since the plea or sentence. Section 610.130.1 allows the application only after a period of not less than ten years, and during the whole of that period the applicant must not have been convicted of any intoxication-related traffic or boating offence. This packet does not decide eligibility; it declines to prepare an application the dates in front of it say is early, on a section that gives one application for life.",
    MO_CLERK_REFERRAL,
    "Work the ten years out from the certified docket, and come back once the period has run."
  );

  const agencyList = screenAgencyList(trackId, answers);
  const feeWaiverNeeded = yesNo(trackId, answers, "feeWaiverNeeded");

  return {
    fullName,
    dateOfBirth,
    currentAddress,
    offenseDescription,
    offenseLevel,
    pleaOrSentenceDate,
    courtOfPlea,
    caseNumber,
    firstOffense: "yes",
    subsequentIntoxicationConviction: "no",
    alcoholEnforcementContacts: "no",
    pendingMatters: "no",
    cdlEverIssued: "no",
    commercialVehicle: "no",
    priorSection610130Expungement: "no",
    agencyList,
    agencyListConfirmed: "yes",
    feeWaiverNeeded: feeWaiverNeeded ? "yes" : "no",

    applicantName: fullName,
    courtLine: `IN THE ${courtOfPlea.toUpperCase()}, STATE OF MISSOURI`,
    identificationStatement: `The applicant is ${fullName}, date of birth ${dateOfBirth}, whose mailing address is ${currentAddress}.`,
    caseStatement: `The applicant states the court of plea or sentence and the case as: ${courtOfPlea}; case number ${caseNumber}. Section 610.130.1 directs this application to the court in which the applicant pled guilty or was sentenced.`,
    offenceStatement: `The applicant states the offence as: ${offenseDescription}`,
    levelStatement:
      offenseLevel === "state_misdemeanor"
        ? "The applicant states that the offence was charged as a state misdemeanour. Section 610.130.1 reaches a misdemeanour or a county or city ordinance violation, and not a felony."
        : "The applicant states that the offence was charged as a county or city ordinance violation. Section 610.130.1 reaches a misdemeanour or a county or city ordinance violation, and not a felony.",
    periodStatement: `The applicant states the date of the plea or sentence as ${pleaOrSentenceDate}. Section 610.130.1 allows this application after a period of not less than ten years from that date. The applicant does not state that the period has run; the computation is for the Court.`,
    firstnessStatement:
      "The applicant states, as the applicant's own allegation under the declaration below, that this was the applicant's first intoxication-related traffic offence or intoxication-related boating offence.",
    agencyStatement: `The applicant believes the following persons and agencies hold records of this matter: ${agencyList}`,
    agencyDirective: agencyList,
    feeWaiverStatement: feeWaiverNeeded
      ? "The applicant cannot pay the filing fee and court costs and will ask the Court to allow the filing without them. The application to do that is a separate court form, which the clerk of this Court supplies and which is not part of this document."
      : "The applicant will pay the filing fee and court costs the clerk of this Court sets. No amount is stated here, because § 610.130 fixes none and the amount varies by county.",
    packetCaseReference: "Missouri first intoxication offence expungement"
  };
}

// ---------------------------------------------------------------------------
// Fact derivation entry point
// ---------------------------------------------------------------------------

/**
 * Turns the participant's answers into the fact bag the templates read.
 *
 * Fails closed on anything the adopted design treats as a stop, on any answer
 * that would require applying the § 302.525.3 definition to a driver-record
 * entry, and on any attempt to supply outside-party content.
 */
export function deriveMissouriFacts(trackId: string, answers: Answers): Record<string, string> {
  if (!MO_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new MissouriBranchError(trackId, "trackId", trackId, MO_ASSIGNED_TRACK_IDS);
  }
  refuseOutsidePartyContent(trackId, answers);
  screenRouting(trackId, answers);
  return trackId === MO_MIP_TRACK_ID ? deriveMipFacts(answers) : deriveDwiFacts(answers);
}

// ---------------------------------------------------------------------------
// Shared template language
// ---------------------------------------------------------------------------

type Section = {
  heading?: string;
  numbered: boolean;
  paragraphs: readonly string[];
};

/** The standard Missouri caption, with the case number left for the clerk. */
function caption(documentTitle: string) {
  return {
    courtLine: "{{courtLine}}",
    partyBlockLeft: ["IN RE:", "", "{{applicantName}},", "", "Applicant."],
    partyBlockRight: ["Case No. ______________________", "", "Division: ______________", "", documentTitle]
  };
}

const NO_FORM_PARAGRAPH =
  "The Office of the State Courts Administrator publishes no form for this section. A June 2024 Missouri pro se guide lists it among the statutes for which no Missouri court forms are prepared and directs the reader to draft their own petition on the published pattern, which is what this document is. Ask the clerk of the filing court whether that court has a local form or a local practice of its own before filing this one.";

const WHAT_THIS_IS_SECTION: Section = {
  heading: "WHAT THIS DOCUMENT IS, AND WHAT IT IS NOT",
  numbered: false,
  paragraphs: [
    "It is an application prepared for a self-represented person from that person's own answers. LegalEase has seen no court record, no driver record and no criminal record, has decided nothing, represents nobody and has filed nothing.",
    "It is not a filing until it is filed, and it is not an order. Nothing in it has been granted, agreed, determined or decided by anybody.",
    NO_FORM_PARAGRAPH,
    "It states no filing fee. Neither of these sections fixes one and the amount is county-variable, so no figure is printed here. Ask the clerk of the filing court what the fee and the costs are.",
    "The case number and the division are blank. Whether this application opens a new case or is filed under the original case number is local practice: ask the clerk, and write in what they tell you, by hand, on every document in this packet.",
    "Where the clerk requires a Confidential Case Filing Information Sheet, the case type code on it is left blank. The official Case Types List publishes no code naming this section, and this packet will not guess one from a similar track name. Ask the clerk which code to use."
  ]
};

/** The § 302.525.3 definition, printed rather than paraphrased, on both routes. */
const ENFORCEMENT_CONTACT_SECTION: Section = {
  heading: "WHAT AN ALCOHOL-RELATED ENFORCEMENT CONTACT MEANS",
  numbered: false,
  paragraphs: [
    "This phrase does more work than it looks like it does, and it is printed here in full because a person asked whether they have had one will otherwise think only of convictions.",
    "Section 302.525.3 defines an alcohol-related enforcement contact as any suspension or revocation under sections 302.500 to 302.540, any suspension or revocation entered in this state or any other state for a refusal to submit to chemical testing under an implied consent law, and any conviction in any state involving driving while intoxicated, driving under the influence of drugs or alcohol, or driving with an unlawful alcohol concentration.",
    "So an administrative licence suspension that never became a conviction is an enforcement contact. The Department of Revenue driver record is the document that shows them, and this application is prepared on the applicant's answers about that record rather than on any reading of it by LegalEase.",
    "This application makes no statement about whether any particular entry on any driver record is or is not such a contact. That is a legal judgment about a specific record, and it belongs to a lawyer or to the Court."
  ]
};

const ONCE_IN_A_LIFETIME_SECTION: Section = {
  heading: "READ THIS BEFORE YOU SIGN: ONE APPLICATION, EVER",
  numbered: false,
  paragraphs: [
    "This section gives a person ONE expungement, for life. The courts, the state officials and the director of revenue are all permitted to keep the records necessary to enforce that limit, so a second application will be seen for what it is.",
    "There is no second attempt if this one is refused on a condition that turned out not to be met. That is why every condition below is the applicant's own sworn statement, checked against the applicant's own records, and why anything the applicant cannot check is a reason to stop and take advice rather than to file and hope."
  ]
};

const NOT_ASSERTED_SECTION: Section = {
  heading: "WHAT THIS APPLICATION DOES NOT SAY",
  numbered: false,
  paragraphs: [
    "It does not say that the applicant is entitled to the expungement. The determination is the Court's, and this application asks the Court to make it.",
    "It does not say that any period has run. It states the dates the applicant gave and leaves the computation to the Court.",
    "It does not say whether any entry on any driver record is an alcohol-related enforcement contact. That judgment is not made here at all.",
    "It says nothing about immigration, firearms, professional licensing, insurance, or employment as a driver. Those consequences are outside this packet, and a document that guessed at them would be worse than one that is silent.",
    "Nobody at LegalEase has read the court file, the certified docket, the driver record or the Highway Patrol record in this matter, and nothing here should be read as though somebody had."
  ]
};

const DECLARATION =
  "The applicant declares under penalty of perjury that the statements made in this application are true and correct to the best of the applicant's knowledge and belief. Sign and date beneath this declaration by hand, in the applicant's own name, after reading every allegation above against the applicant's own records.";

/**
 * The applicant's execution block, with the optional certificate inside it.
 *
 * The certificate is not a component of its own — the packet-set manifest
 * assigns none — and neither section prescribes service, so it is a block the
 * applicant completes only if the clerk asks for it. It sits inside
 * `signatureBlock` rather than in `certificateOfService` for a layout reason
 * the templates cannot otherwise fix: the shared renderer reserves space with
 * `keepTogether` before the signature block and before every section heading,
 * but not before the certificate, so a certificate left in its own field splits
 * its recital from its date and signature wherever it happens to meet a page
 * break. Folded in, the whole execution area moves as one.
 */
const SIGNATURE_BLOCK: readonly string[] = [
  "{{applicantName}}, Applicant, self-represented",
  "{{currentAddress}}",
  "",
  "Date: ______________________",
  "",
  "ONE EXPUNGEMENT, EVER. Do not sign this until every allegation above has been checked against your certified docket, your Department of Revenue driver record and your Highway Patrol record.",
  "",
  "CERTIFICATE OF SERVICE — OPTIONAL, AND UNEXECUTED. Neither section prescribes service. Complete this block ONLY if the clerk of the filing court directs that the respondents named in the application be served, and leave it blank otherwise. Unsigned, nothing below states that service has happened, and LegalEase has served nothing on anyone.",
  "",
  "I, {{applicantName}}, certify that I served a copy of this application and the proposed order on each of the persons and agencies named in it, on the date written below and by the method marked below.",
  "",
  "Method of service — mark one:   (  ) United States mail, postage prepaid   (  ) Hand delivery",
  "",
  "Date of service: ______________________",
  "",
  "Signature: _____________________________________"
];

/** The court signs. Every line here stays blank on the generated document. */
const ORDER_SIGNATURE_BLOCK: readonly string[] = [
  "",
  "_____________________________________",
  "JUDGE",
  "",
  "Date: ______________________",
  "",
  "The determination, the granting line, the date and the signature above are the Court's. They are printed blank, and LegalEase has determined nothing and signed nothing."
];

function stopSection(extra: readonly string[]): Section {
  return {
    heading: "WHERE THIS PACKET STOPS",
    numbered: false,
    paragraphs: [
      "LegalEase prepares documents from what the applicant says. It gives no legal advice, reads no court record, no driver record and no criminal record, decides no eligibility question, files nothing and speaks to no office.",
      ...extra,
      "Any suspension, revocation or refusal entry on a driver record that the applicant cannot explain, and any licence, conviction, suspension or revocation in another state.",
      "The prosecuting or city attorney opposing, or the Court setting a contested hearing. The initial packet still generates; what happens after that needs a lawyer.",
      "Nothing in this packet addresses immigration, firearms, professional licensing, insurance or employment as a driver, so any question that turns on one of them stops here.",
      `Where any of these applies, speak to a lawyer before filing anything. ${MO_LAWYER_REFERRAL}`
    ]
  };
}

// ---------------------------------------------------------------------------
// mo-311-326 templates
// ---------------------------------------------------------------------------

const MIP_APPLICATION: PleadingTemplate = {
  templateId: "mo-311-326-application",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("APPLICATION AND PETITION FOR EXPUNGEMENT"),
  title:
    "APPLICATION AND PETITION FOR EXPUNGEMENT OF A FIRST MINOR-IN-POSSESSION VIOLATION — MO. REV. STAT. § 311.326",
  preamble:
    "The applicant, appearing without a lawyer, applies to this Court under Mo. Rev. Stat. § 311.326 for an order expunging all official records of the arrest, plea, trial and conviction in this matter, and states as follows.",
  sections: [
    WHAT_THIS_IS_SECTION,
    ONCE_IN_A_LIFETIME_SECTION,
    {
      heading: "I.  THE APPLICANT, THE COURT AND THE CASE",
      numbered: true,
      paragraphs: ["{{identificationStatement}}", "{{caseStatement}}", "{{chargeStatement}}"]
    },
    {
      heading: "II.  THE CONDITIONS § 311.326 SETS",
      numbered: true,
      paragraphs: [
        "Section 311.326 allows a person who has pleaded guilty to or been found guilty of violating § 311.325 for the first time, and who since that conviction has not been convicted of any other alcohol-related offence, to apply to the court in which the person was sentenced for an order expunging all official records of the arrest, plea, trial and conviction, after a period of not less than one year after the person reaches the age of twenty-one.",
        "{{firstnessStatement}}",
        "The applicant states that since that conviction the applicant has not been convicted of any other alcohol-related offence.",
        "The applicant states that the applicant has had no other alcohol-related enforcement contact as defined in § 302.525. The definition is printed below and the applicant has read it.",
        "The applicant states that the applicant is not licensed as a commercial motor vehicle driver and was not operating a commercial motor vehicle as defined in § 302.700 at the time of the violation. Section 311.326 provides that no records shall be expunged in either case.",
        "The applicant states that the applicant has not previously had an expungement under § 311.326.",
        "The applicant states the applicant's date of birth above. Section 311.326 runs its period from the applicant's twenty-first birthday and not from the offence or the conviction. The applicant does not state that the period has run; the computation is for the Court."
      ]
    },
    {
      heading: "III.  WHO HOLDS THE RECORDS",
      numbered: true,
      paragraphs: [
        "{{agencyStatement}}",
        "An order reaches the records of the persons and agencies the order names. The applicant has checked this list against the Highway Patrol record and the court paperwork, and asks that any agency the Court identifies as holding a record be included."
      ]
    },
    ENFORCEMENT_CONTACT_SECTION,
    {
      heading: "IV.  WHAT THE SECTION ASKS THE COURT TO DO",
      numbered: true,
      paragraphs: [
        "Section 311.326 provides that if the Court determines, UPON REVIEW, that the applicant has not been convicted of any other alcohol-related offence at the time of the application and has had no other alcohol-related enforcement contacts as defined in § 302.525, the Court SHALL enter an order of expungement. The relief is mandatory on those conditions and this application does not describe it as discretionary.",
        "The section says upon review rather than after hearing, so the applicant may not be given a hearing date at all. Whether this Court holds one is for this Court, and the applicant will ask the clerk.",
        "The effect of an order under the section is to restore the applicant to the status the applicant occupied before the arrest, plea or conviction, as if the event had never happened.",
        "{{feeWaiverStatement}}"
      ]
    },
    NOT_ASSERTED_SECTION,
    stopSection([
      "A charge brought under a city or county ordinance rather than under § 311.325 itself. Whether the section reaches an ordinance conviction is an open question, and this is not an application to test it with.",
      "Any doubt about whether the violation was the applicant's first.",
      "Any later alcohol-related conviction, including a drink-driving matter, which is its own route with its own ten-year period.",
      "A commercial driver's licence, or a commercial motor vehicle at the time of the violation.",
      "An expungement already used under this section."
    ])
  ],
  prayer: [
    "WHEREFORE, the applicant asks the Court to determine this application upon review under Mo. Rev. Stat. § 311.326 and, on the conditions the section sets, to enter an order expunging all official records of the arrest, plea, trial and conviction in this matter, and directing each person and agency named above to expunge its records.",
    "Nothing in this application reports a decision by anyone. It asks."
  ],
  verification: DECLARATION,
  signatureLabel: "Applicant, self-represented",
  signatureBlock: SIGNATURE_BLOCK
};

const MIP_ORDER: PleadingTemplate = {
  templateId: "mo-311-326-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("PROPOSED ORDER OF EXPUNGEMENT"),
  title: "PROPOSED ORDER OF EXPUNGEMENT — MO. REV. STAT. § 311.326",
  preamble:
    "This proposed order is tendered for the Court's consideration with the application it accompanies. Every finding is offered for the Court to adopt or reject; none is made here. It has been granted by nobody and signed by nobody.",
  sections: [
    {
      numbered: false,
      paragraphs: [
        "Every determination, every date and every signature below is left blank for the Court. Nothing on this page has been decided.",
        "NOW on this ______ day of ____________________, 20____, the Court takes up the application of {{applicantName}} under Mo. Rev. Stat. § 311.326 for expungement of all official records of the arrest, plea, trial and conviction in this matter.",
        "The Court, upon review, DETERMINES:",
        "(  ) that the applicant has not been convicted of any other alcohol-related offence at the time of this application; and",
        "(  ) that the applicant has had no other alcohol-related enforcement contacts as defined in § 302.525.",
        "",
        "IT IS THEREFORE ORDERED that all official records of the arrest, plea, trial and conviction in this matter be expunged.",
        "IT IS FURTHER ORDERED that each of the following persons and agencies expunge its records of this matter:",
        "{{agencyDirective}}",
        "IT IS FURTHER ORDERED that the effect of this order is to restore the applicant to the status the applicant occupied before the arrest, plea or conviction, as if the event had never happened, as § 311.326 provides.",
        "This order states nothing about the applicant's status beyond what § 311.326 provides, and nothing is imported here from any other section."
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: ORDER_SIGNATURE_BLOCK
};

// ---------------------------------------------------------------------------
// mo-610-130 templates
// ---------------------------------------------------------------------------

const DWI_APPLICATION: PleadingTemplate = {
  templateId: "mo-610-130-application",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("APPLICATION AND PETITION FOR EXPUNGEMENT"),
  title:
    "APPLICATION AND PETITION FOR EXPUNGEMENT OF A FIRST INTOXICATION-RELATED TRAFFIC OR BOATING OFFENCE — MO. REV. STAT. § 610.130",
  preamble:
    "The applicant, appearing without a lawyer, applies to this Court under Mo. Rev. Stat. § 610.130 for an order expunging from all official records all recordations of the arrest, plea, trial and conviction in this matter, and states as follows.",
  sections: [
    WHAT_THIS_IS_SECTION,
    ONCE_IN_A_LIFETIME_SECTION,
    {
      heading: "I.  THE APPLICANT, THE COURT AND THE CASE",
      numbered: true,
      paragraphs: [
        "{{identificationStatement}}",
        "{{caseStatement}}",
        "{{offenceStatement}}",
        "{{levelStatement}}"
      ]
    },
    {
      heading: "II.  THE CONDITIONS § 610.130 SETS",
      numbered: true,
      paragraphs: [
        "Section 610.130.1 allows an individual who has pleaded guilty to or been convicted of a first intoxication-related traffic offence or intoxication-related boating offence which is a misdemeanour or a county or city ordinance violation, and which is not a conviction for driving a commercial motor vehicle while under the influence of alcohol, and who since that date has not been convicted of any intoxication-related traffic or boating offence, to apply after a period of not less than ten years to the court in which the individual pled guilty or was sentenced.",
        "{{firstnessStatement}}",
        "{{periodStatement}}",
        "The applicant states that since that plea or conviction the applicant has not been convicted of any intoxication-related traffic offence or intoxication-related boating offence.",
        "The applicant states that the applicant has had no other subsequent alcohol-related enforcement contact as defined in § 302.525. The definition is printed below and the applicant has read it.",
        "The applicant states that no intoxication-related traffic or boating offence, and no alcohol-related enforcement action, is pending. Section 610.130.2 tests that as at the date of the hearing rather than the date of this application.",
        "The applicant states that the applicant has never been issued a commercial driver's licence in Missouri or in any other state and is not required to possess one. Section 610.130.4 disapplies the whole section to such a person.",
        "The applicant states that the applicant was not driving a commercial motor vehicle at the time of the offence.",
        "The applicant states that the applicant has not previously had an expungement under § 610.130."
      ]
    },
    {
      heading: "III.  THIS IS NOT A § 610.140 APPLICATION",
      numbered: false,
      paragraphs: [
        "Section 610.140.3(7) excludes offences eligible under § 610.130 from the general expungement track, and § 610.140.3(8) excludes intoxication-related traffic and boating offences generally. The two sections do not overlap.",
        "This application is made under § 610.130 alone, and an intoxication-related matter is never routed through the general track."
      ]
    },
    {
      heading: "IV.  WHO HOLDS THE RECORDS",
      numbered: true,
      paragraphs: [
        "{{agencyStatement}}",
        "An order reaches the records of the persons and agencies the order names. The applicant has checked this list against the driver record and the Highway Patrol record, and asks that any agency the Court identifies as holding a record be included."
      ]
    },
    ENFORCEMENT_CONTACT_SECTION,
    {
      heading: "V.  WHAT THE SECTION ASKS THE COURT TO DO",
      numbered: true,
      paragraphs: [
        "Section 610.130.2 provides that if the Court determines, AFTER HEARING, that the applicant has not been convicted of any subsequent intoxication-related traffic or boating offence, has no other subsequent alcohol-related enforcement contacts as defined in § 302.525, and has no other such offence or alcohol-related enforcement action pending at the time of the hearing, the Court SHALL enter an order of expungement. The relief is mandatory on those findings and this application does not describe it as discretionary.",
        "The Court sets the hearing. Its date, its time and the courtroom are left blank here, and the applicant will ask the clerk how this Court gives notice of it and to whom, because the section prescribes no notice recipients and no service rule.",
        "Section 610.130.3 provides that the records maintained in any administrative or court proceeding in an associate or circuit division of the circuit court become confidential and available only to the parties or by order of the Court for good cause shown, and that the applicant is restored to the status the applicant occupied before the arrest, plea or conviction as if the event had never taken place.",
        "{{feeWaiverStatement}}"
      ]
    },
    NOT_ASSERTED_SECTION,
    stopSection([
      "Every intoxication-related matter carries an attorney-review recommendation on the face of this packet. The ten-year clean-record showing turns on a driver record most people have never read, and getting it wrong spends the one expungement the section allows.",
      "Any doubt about whether the offence was truly the applicant's first.",
      "Any commercial driver's licence ever issued in any state, or work that requires one.",
      "Any intoxication-related matter or alcohol-related enforcement action pending now.",
      "Nothing in this packet addresses the effect on insurance, on employment as a driver, or on licensing, so any question that turns on one of them stops here."
    ])
  ],
  prayer: [
    "WHEREFORE, the applicant asks the Court to set this application for hearing and, on the findings Mo. Rev. Stat. § 610.130.2 requires, to enter an order expunging from all official records all recordations of the arrest, plea, trial and conviction in this matter, and directing each person and agency named above to expunge its records.",
    "Nothing in this application reports a decision by anyone. It asks."
  ],
  verification: DECLARATION,
  signatureLabel: "Applicant, self-represented",
  signatureBlock: SIGNATURE_BLOCK
};

const DWI_ORDER: PleadingTemplate = {
  templateId: "mo-610-130-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: caption("PROPOSED ORDER OF EXPUNGEMENT"),
  title: "PROPOSED ORDER OF EXPUNGEMENT — MO. REV. STAT. § 610.130",
  preamble:
    "This proposed order is tendered for the Court's consideration with the application it accompanies. Every finding is offered for the Court to adopt or reject; none is made here. It has been granted by nobody and signed by nobody.",
  sections: [
    {
      numbered: false,
      paragraphs: [
        "Every finding, every date and every signature below is left blank for the Court. Nothing on this page has been decided.",
        "NOW on this ______ day of ____________________, 20____, the Court takes up the application of {{applicantName}} under Mo. Rev. Stat. § 610.130 for expungement of all recordations of the arrest, plea, trial and conviction in this matter, the Court having held the hearing the section requires.",
        "The Court FINDS:",
        "(  ) that the applicant has not been convicted of any subsequent intoxication-related traffic offence or intoxication-related boating offence;",
        "(  ) that the applicant has no other subsequent alcohol-related enforcement contacts as defined in § 302.525; and",
        "(  ) that the applicant has no other such offence or alcohol-related enforcement action pending at the time of this hearing.",
        "",
        "IT IS THEREFORE ORDERED that all recordations of the arrest, plea, trial and conviction in this matter be expunged from all official records.",
        "IT IS FURTHER ORDERED that each of the following persons and agencies expunge its records of this matter:",
        "{{agencyDirective}}",
        "IT IS FURTHER ORDERED that, as § 610.130.3 provides, the records maintained in any administrative or court proceeding in an associate or circuit division of the circuit court in this matter be confidential and available only to the parties or by order of the Court for good cause shown, and that the applicant be restored to the status the applicant occupied before the arrest, plea or conviction as if the event had never taken place.",
        "This order states nothing about the applicant's status beyond what § 610.130 provides, and nothing is imported here from any other section."
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

export const MO_CUSTOM_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [MIP_APPLICATION.templateId]: MIP_APPLICATION,
  [MIP_ORDER.templateId]: MIP_ORDER,
  [DWI_APPLICATION.templateId]: DWI_APPLICATION,
  [DWI_ORDER.templateId]: DWI_ORDER
};

// ---------------------------------------------------------------------------
// Packet sets and tracks
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * Design role → engine role. Both map straight onto the closed engine type; the
 * mapping is stated here and asserted by the verifier rather than left implicit.
 */
export const MO_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order"
};

/**
 * The design roles on these routes that this lane does not produce: two official
 * PDFs and one guidance component, in three different lanes between them.
 */
export const MO_EXCLUDED_COMPONENT_ROLES: readonly { role: string; strategy: string }[] = [
  { role: "cover_sheet", strategy: "official_pdf_fill" },
  { role: "fee_waiver", strategy: "official_pdf_fill" },
  { role: "instructions", strategy: "process_guidance" }
];

function packetSetFor(trackId: string, applicationId: string, orderId: string): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId: `${trackId}-primary-filing-1`,
        role: MO_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: applicationId,
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
        role: MO_DESIGN_ROLE_TO_ENGINE_ROLE.proposed_order,
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: orderId,
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
}

const MIP_INPUTS: readonly RequiredInput[] = [
  {
    key: "fullName",
    label: "What is your full legal name, and any other name the case may be under?",
    required: true
  },
  {
    key: "dateOfBirth",
    label:
      "What is your date of birth? The application cannot be made until at least a year after you turned twenty-one, so the earliest possible application is at twenty-two.",
    required: true
  },
  { key: "currentAddress", label: "What is your current mailing address?", required: true },
  {
    key: "section311325Violation",
    label:
      "Was the charge a violation of Missouri's minor-in-possession law, § 311.325, or was it a city or county ordinance? Answer section 311.325, city or county ordinance, or unsure. The section names the statute.",
    required: true
  },
  {
    key: "firstViolation",
    label:
      "Was this the first time you pleaded guilty to or were found guilty of that offence? Answer yes, no or unsure. You swear to this yourself and the relief is once in a lifetime.",
    required: true
  },
  {
    key: "sentencingCourt",
    label:
      "Which court sentenced you, and in which county? That is where this application is filed, and on a transferred case it may not be where the charge was first filed.",
    required: true
  },
  { key: "sentencingDate", label: "On what date were you sentenced, and what was the case number?", required: true },
  {
    key: "subsequentAlcoholOffense",
    label:
      "Since that conviction, have you been convicted of any other alcohol-related offence, anywhere? Answer yes or no.",
    required: true
  },
  {
    key: "alcoholEnforcementContacts",
    label:
      "Has your driving licence ever been suspended or revoked for anything alcohol-related, in Missouri or any other state — including for refusing a chemical test? Answer yes, no or unsure. Read your Department of Revenue driver record before answering; an administrative suspension counts even though it never became a conviction.",
    required: true
  },
  {
    key: "cdlStatus",
    label:
      "Are you licensed as a commercial motor vehicle driver, or were you driving a commercial motor vehicle at the time of the violation? Answer yes or no. Either one is a bar.",
    required: true
  },
  {
    key: "priorSection311326Expungement",
    label:
      "Have you ever had an expungement under this section before? Answer yes or no. You are entitled to only one, ever.",
    required: true
  },
  {
    key: "agencyList",
    label:
      "Which agencies do you believe hold records of this matter? Include the sentencing court, the agency that arrested or cited you, the prosecuting or city attorney and the Missouri State Highway Patrol Criminal Justice Information Services Division.",
    required: true
  },
  {
    key: "agencyListConfirmed",
    label:
      "Have you checked your Highway Patrol record and your court paperwork and confirmed this list is complete? Answer yes or no. An agency left off keeps its record.",
    required: true
  },
  {
    key: "feeWaiverNeeded",
    label:
      "Do you need to ask the court to let you file without paying the filing fee and court costs? Answer yes or no.",
    required: true
  }
];

const DWI_INPUTS: readonly RequiredInput[] = [
  {
    key: "fullName",
    label: "What is your full legal name, and any other name the case may be under?",
    required: true
  },
  { key: "dateOfBirth", label: "What is your date of birth?", required: true },
  { key: "currentAddress", label: "What is your current mailing address?", required: true },
  {
    key: "offenseDescription",
    label: "What was the offence? Was it a drink- or drug-driving offence, or a boating offence?",
    required: true
  },
  {
    key: "offenseLevel",
    label:
      "Was it charged as a state misdemeanor, or as a county or city ordinance violation? Answer state misdemeanor, county or city ordinance, felony, or unsure. A felony is not eligible under this section.",
    required: true
  },
  {
    key: "pleaOrSentenceDate",
    label: "On what date did you plead guilty or were you sentenced? The ten-year period runs from then.",
    required: true
  },
  {
    key: "courtOfPlea",
    label:
      "Which court took your plea or sentenced you — the municipal division, the associate circuit division, or the circuit court — and in which county? That is where this application is filed.",
    required: true
  },
  { key: "caseNumber", label: "What was the case number?", required: true },
  {
    key: "firstOffense",
    label:
      "Was this your first intoxication-related traffic or boating offence, anywhere? Answer yes, no or unsure. The section reaches a first offence only and you swear to this yourself.",
    required: true
  },
  {
    key: "subsequentIntoxicationConviction",
    label:
      "Since that plea or conviction, have you been convicted of any other drink- or drug-driving offence or intoxication-related boating offence, anywhere? Answer yes or no.",
    required: true
  },
  {
    key: "alcoholEnforcementContacts",
    label:
      "Since then, has your driving licence been suspended or revoked for anything alcohol-related, in Missouri or any other state — including for refusing a chemical test? Answer yes, no or unsure. Read your Department of Revenue driver record before answering.",
    required: true
  },
  {
    key: "pendingMatters",
    label:
      "Do you have any drink- or drug-driving charge, boating offence, or licence suspension or revocation proceeding pending right now? Answer yes or no. This is tested again at the hearing.",
    required: true
  },
  {
    key: "cdlEverIssued",
    label:
      "Have you ever been issued a commercial driver's licence, in Missouri or in any other state, or are you required to hold one for your work? Answer yes or no. Either one disapplies the whole section.",
    required: true
  },
  {
    key: "commercialVehicle",
    label: "Were you driving a commercial motor vehicle at the time of the offence? Answer yes or no.",
    required: true
  },
  {
    key: "priorSection610130Expungement",
    label:
      "Have you ever had an expungement under this section before? Answer yes or no. You are entitled to only one, ever, and it cannot be undone.",
    required: true
  },
  {
    key: "agencyList",
    label:
      "Which agencies do you believe hold records of this matter? Include the court, the arresting agency, the prosecuting or city attorney, the Missouri State Highway Patrol and the Department of Revenue.",
    required: true
  },
  {
    key: "agencyListConfirmed",
    label:
      "Have you checked your driver record and your Highway Patrol record and confirmed this list is complete? Answer yes or no.",
    required: true
  },
  {
    key: "feeWaiverNeeded",
    label:
      "Do you need to ask the court to let you file without paying the filing fee and court costs? Answer yes or no.",
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

export const MO_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "MO",
    trackId: MO_MIP_TRACK_ID,
    publicName: "Clearing a first minor-in-possession conviction",
    mechanism: "first_minor_in_possession_expungement",
    authority: "Mo. Rev. Stat. § 311.326",
    recordTypes: ["arrest", "charge", "conviction"],
    dispositions: ["pleaded_guilty_or_found_guilty_of_a_first_section_311_325_violation"],
    courtLevel: "the_missouri_court_in_which_the_applicant_was_sentenced",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSetFor(MO_MIP_TRACK_ID, MIP_APPLICATION.templateId, MIP_ORDER.templateId),
    requiredInputs: MIP_INPUTS,
    statuses: { ...statuses, runtime },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "mo-minor-in-possession-expungement",
    assembledPacketTitle: "Missouri minor-in-possession expungement — Mo. Rev. Stat. § 311.326",
    customerDeliverableDescription:
      "An application to the Missouri court that imposed the sentence under Mo. Rev. Stat. § 311.326, with a proposed order drafted to the determination the section asks the court to make upon review. Every condition is the applicant's own statement under a declaration under penalty of perjury; the § 302.525.3 definition of an alcohol-related enforcement contact is printed in full because an applicant answering from memory will think only of convictions; and no document says whether any entry on any driver record is such a contact. The period runs from the applicant's twenty-first birthday rather than from the offence, and the application states the dates without asserting that it has run.",
    notes:
      "One expungement per person for life, and the warning sits above the signature block. Whether the section reaches a conviction under a city or county ordinance rather than under § 311.325 itself is an open release question: the packet applies the narrower reading the design adopts and stops an ordinance conviction rather than testing the point with an application that can only be made once."
  },
  {
    jurisdiction: "MO",
    trackId: MO_DWI_TRACK_ID,
    publicName: "Clearing a first drink-driving or boating offence",
    mechanism: "first_intoxication_related_offence_expungement",
    authority: "Mo. Rev. Stat. § 610.130",
    recordTypes: ["arrest", "charge", "conviction"],
    dispositions: ["first_intoxication_related_traffic_or_boating_offence"],
    courtLevel: "the_missouri_court_in_which_the_applicant_pled_guilty_or_was_sentenced",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSetFor(MO_DWI_TRACK_ID, DWI_APPLICATION.templateId, DWI_ORDER.templateId),
    requiredInputs: DWI_INPUTS,
    statuses: { ...statuses, runtime },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "mo-first-intoxication-expungement",
    assembledPacketTitle: "Missouri first intoxication-offence expungement — Mo. Rev. Stat. § 610.130",
    customerDeliverableDescription:
      "An application to the Missouri court of plea or sentence under Mo. Rev. Stat. § 610.130, with a proposed order drafted to the three findings § 610.130.2 asks the court to make after hearing. The ten-year period, the firstness allegation and the clean-record showing are all the applicant's own statements under a declaration under penalty of perjury, the § 302.525.3 definition is printed in full, and the commercial-licence bar is asked as an ever-held question across every state because subsection 4 disapplies the whole section to anyone who has one. The document says on its face that this is not a § 610.140 application.",
    notes:
      "One expungement per person for life and it cannot be undone, so every intoxication-related matter carries an attorney-review recommendation on the face of the packet. Who gives notice of the § 610.130 hearing, and to whom, is an open release question the section does not answer: the packet sends the applicant to the clerk rather than answering it for them."
  }
];
