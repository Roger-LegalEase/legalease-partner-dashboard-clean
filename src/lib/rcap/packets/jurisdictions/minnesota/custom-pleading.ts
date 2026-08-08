// Minnesota record clearing — custom-pleading implementation.
//
// One assigned route, three assigned custom-pleading components, and no court
// anywhere in it.
//
//   mn_299c11_arrest_demand   Minn. Stat. § 299C.11, subd. 1(b). On WRITTEN
//       DEMAND, law enforcement and the Bureau of Criminal Apprehension must
//       destroy arrest identification data — fingerprints and thumbprints,
//       photographs, distinctive physical mark identification data, known
//       aliases and street names, and all copies and duplicates — where the
//       person has no felony or gross-misdemeanour conviction anywhere in the
//       ten years immediately preceding determination of all pending criminal
//       actions in their favour, and either all charges were dismissed before a
//       determination of probable cause, or the prosecuting authority declined
//       to file and a grand jury did not indict. Destruction is mandatory on
//       demand where those conditions are met.
//
// **There is no venue, no filing, no fee and no hearing.** The participant signs
// a letter and mails it to each records custodian that may hold the data. The
// design names six candidates — the Bureau of Criminal Apprehension, the police
// department, the county sheriff, the city attorney, the county attorney and the
// county department of corrections — and instructs that a letter be generated
// only for a custodian that may actually hold the participant's record. The
// packet set carries that as one required component addressed to the BCA and one
// conditional component carrying the other five.
//
// **Why this is a custom pleading and not guidance.** The controlling review
// classified the route as guidance because the mechanism is correspondence
// rather than a pleading, while simultaneously directing that LegalEase generate
// a six-agency participant-signed demand-letter set. The adopted design resolves
// that: under the packet-only product model a participant-signed demand letter is
// a packet-generating custom output, and a court filing is not a precondition of
// `custom_pleading`. The third component — the mailing instructions — is
// assigned `custom_pleading` too, not `process_guidance`, so it is produced here
// rather than by the guidance lane.
//
// **The Judicial Branch's six sample letters are references, not forms.** They
// are not in the corpus; the design records their absence as a release blocker
// and states in terms that it does not prevent generation, because they are
// official samples rather than approved forms and the Judicial Branch itself says
// they are only examples that must be edited to add case-specific information.
// The letters here are drafted against the statute.
//
// **What the statute does NOT count as a determination in the person's favour.**
// Subdivision 3(1) is the trap on this route: sealing under § 152.18, subd. 1,
// § 242.31 or chapter 609A; successful completion of a diversion programme; an
// order of discharge under § 609.165; and a pardon under chapter 638 are each
// expressly not a determination in favour of the arrested person. Diversion is
// asked about directly for that reason, and a participant who took part in one
// as a result of the arrest is stopped rather than drafted for.
//
// **What the packet leaves blank, and one thing it cannot ask.** Every letter
// prints the writer's name, date of birth and return address as fields to
// complete by hand: the adopted design declares eight participant inputs for this
// route and not one of them is an identity question, so the packet prints the
// fields rather than inventing a question the design did not ask. The agency
// addresses are the participant's to look up, the signature and date are theirs,
// and nothing in the packet asserts that any demand has been sent, received or
// complied with.
//
// The template is DRAFT PENDING LEGAL REVIEW. The track is `technicalFixture`
// and `runtimeDisabled`: nothing here reaches a runtime surface, and wiring it
// into the shared registry and template pack is the integration captain's step.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR THE PERSON NAMED BELOW — NOT LEGAL ADVICE — DO NOT SEND UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Referral destinations
// ---------------------------------------------------------------------------

/** Where a stop that needs individual legal advice sends the participant. */
export const MN_LAWYER_REFERRAL =
  "A Minnesota lawyer — through the Minnesota State Bar Association's lawyer referral service, or a legal-aid office serving the county the arrest was in.";

/** Where the record questions go, and most of them do. */
export const MN_RECORD_REFERRAL =
  "The Minnesota Bureau of Criminal Apprehension, for the participant's own Minnesota criminal history, and Minnesota Court Records Online for the case history that shows how and when the charges ended.";

/** Where a question about what the court actually did belongs. */
export const MN_COURT_RECORD_REFERRAL =
  "The court administrator for the county the case was in, for the disposition record that shows whether the dismissal came before or after a probable-cause determination.";

/** Where a participant belongs when the route is a chapter 609A expungement. */
export const MN_EXPUNGEMENT_ROUTE_REFERRAL =
  "LegalEase's own Minnesota routing: sealing under chapter 609A is a separate court petition, and § 299C.11, subd. 3(1) says expressly that such a sealing is not a determination in the person's favour for this demand.";

/** The closed set of destinations. A stop may not invent a fifth. */
export const MN_REFERRALS: readonly string[] = [
  MN_LAWYER_REFERRAL,
  MN_RECORD_REFERRAL,
  MN_COURT_RECORD_REFERRAL,
  MN_EXPUNGEMENT_ROUTE_REFERRAL
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer puts the matter outside what the design settled. */
export class MinnesotaEligibilityStopError extends Error {
  readonly code = "minnesota_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "MinnesotaEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class MinnesotaBranchError extends Error {
  readonly code = "minnesota_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "MinnesotaBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

export const MN_TRACK_ID = "mn_299c11_arrest_demand";

/** The single assigned route, held closed so no other track can derive here. */
export const MN_ASSIGNED_TRACK_IDS: readonly string[] = [MN_TRACK_ID];

export const MN_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * Three-valued wherever "I'm not sure" is a different position from "no".
 *
 * The design names the probable-cause question as the most common point of
 * participant error, so an uncertain answer is a reason to go and read the
 * disposition record, not a reason to send a demand.
 */
export const MN_YES_NO_UNSURE: Readonly<Record<string, "yes" | "no" | "unsure">> = {
  yes: "yes",
  no: "no",
  unsure: "unsure",
  "not sure": "unsure",
  "i am not sure": "unsure"
};

/**
 * The six custodians the design names, and no others.
 *
 * A letter is generated only for a custodian that may actually hold the
 * participant's record, so the answer is a list drawn from this set rather than
 * free text: a demand sent to an office that never held the data wastes the
 * participant's postage and muddies the record of what was demanded of whom.
 */
export const MN_CUSTODIANS: Readonly<
  Record<
    string,
    | "bca"
    | "police_department"
    | "county_sheriff"
    | "city_attorney"
    | "county_attorney"
    | "county_corrections"
  >
> = {
  bca: "bca",
  "bureau of criminal apprehension": "bca",
  police_department: "police_department",
  "police department": "police_department",
  police: "police_department",
  county_sheriff: "county_sheriff",
  "county sheriff": "county_sheriff",
  sheriff: "county_sheriff",
  city_attorney: "city_attorney",
  "city attorney": "city_attorney",
  county_attorney: "county_attorney",
  "county attorney": "county_attorney",
  county_corrections: "county_corrections",
  "county corrections": "county_corrections",
  "county department of corrections": "county_corrections"
};

/** The canonical custodian keys, as the closed list resolves them. */
export type MinnesotaCustodian = (typeof MN_CUSTODIANS)[keyof typeof MN_CUSTODIANS];

/** The five custodians the conditional component covers. The BCA is always first. */
export const MN_SECONDARY_CUSTODIANS: readonly MinnesotaCustodian[] = [
  "police_department",
  "county_sheriff",
  "city_attorney",
  "county_attorney",
  "county_corrections"
];

/** How each custodian is named in the letter it receives. */
const MN_CUSTODIAN_NAMES: Readonly<Record<string, string>> = {
  bca: "the Minnesota Bureau of Criminal Apprehension",
  police_department: "the police department that made or recorded the arrest",
  county_sheriff: "the county sheriff",
  city_attorney: "the city attorney",
  county_attorney: "the county attorney",
  county_corrections: "the county department of corrections"
};

/**
 * Answer keys that would carry outside-party work into a Minnesota packet.
 *
 * Nothing in the design declares any of them. Their presence means a caller is
 * trying to have LegalEase supply an agency's answer, a certification that data
 * was destroyed, a court order or a mailing the participant has not made.
 * Destruction is the custodian's act; the demand is the participant's.
 */
export const MN_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "agencyResponse",
  "bcaCertification",
  "courtOrder",
  "dataDestroyedDate",
  "demandSentDate",
  "destructionConfirmation",
  "judgeSignature"
];

/**
 * Keys a caller may volunteer that route the matter away rather than into a
 * letter. Immigration is not on the design's stop list for this route, but the
 * packet says nothing about it either, so a volunteered immigration question is
 * referred rather than answered.
 */
export const MN_SCREENED_ROUTING_KEYS: readonly string[] = [
  "chapter609aPetition",
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
    return value.map((entry) => String(entry).trim()).filter(Boolean).join(", ");
  }
  return String(value).trim();
};

const list = (answers: Answers, key: string): readonly string[] => {
  const value = answers[key];
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  const raw = str(answers, key);
  return raw ? raw.split(/[,;\n]+/).map((entry) => entry.trim()).filter(Boolean) : [];
};

/** A comma list of offices reads as one office. Join it the way a person would. */
function englishList(entries: readonly string[]): string {
  if (entries.length <= 1) return entries[0] ?? "";
  return `${entries.slice(0, -1).join(", ")} and ${entries[entries.length - 1]}`;
}

/** Declared rather than assigned, so TypeScript narrows after it. */
function stop(
  stopId: string,
  trackId: string,
  reason: string,
  referral: string,
  nextStep: string
): never {
  throw new MinnesotaEligibilityStopError(stopId, trackId, reason, referral, nextStep);
}

const UNKNOWN_ANSWER =
  /\b(don'?t know|do not know|not sure|unsure|no idea|unknown|can'?t remember|cannot remember|can'?t recall|cannot recall|not certain|maybe|possibly)\b/i;

const statesAYear = (raw: string): boolean => /\b(19|20)\d{2}\b/.test(raw);

const need = (
  trackId: string,
  answers: Answers,
  key: string,
  referral: string = MN_RECORD_REFERRAL
): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "mn-answer-missing",
      trackId,
      `This packet needs an answer to ${key} before anything can be prepared, and none was given. A written demand under Minn. Stat. § 299C.11, subd. 1(b) has to identify the arrest it is about and state the conditions the subdivision sets, and every one of those comes from the participant's own answers.`,
      referral,
      "Get your own Minnesota criminal history from the Bureau of Criminal Apprehension and your case history from Minnesota Court Records Online, then answer the question from those records rather than from memory."
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
    throw new MinnesotaBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), MN_YES_NO);

const yesNoUnsure = (trackId: string, answers: Answers, key: string): "yes" | "no" | "unsure" =>
  branch(trackId, key, need(trackId, answers, key), MN_YES_NO_UNSURE);

/**
 * Whether a volunteered answer asserts the screened condition or denies it.
 *
 * A blunt keyword test reads "no, I never did a diversion" as an assertion. A
 * negation standing in front of the match defeats it.
 */
const PRECEDING_NEGATION = /\b(no|not|never|none|without|neither)\b/i;
function assertsScreened(value: string, positive: RegExp): boolean {
  const match = value.match(positive);
  if (!match) return false;
  return !PRECEDING_NEGATION.test(value.slice(0, value.indexOf(match[0])));
}

const ASSERTS_609A = /\b(yes|i (did|have|filed)|petition(ed)?|granted|sealed under chapter 609a)\b/i;
const ASSERTS_IMMIGRATION_ISSUE =
  /\b(not a (us|u\.s\.|united states) citizen|non[- ]?citizen|green card|lawful permanent resident|visa holder|undocumented|removal proceedings|deportation)\b/i;

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function refuseOutsidePartyContent(trackId: string, answers: Answers): void {
  const supplied = MN_OUTSIDE_PARTY_KEYS.filter((key) => str(answers, key).length > 0);
  if (supplied.length === 0) return;
  stop(
    "mn-outside-party-content-refused",
    trackId,
    `Content was supplied for ${supplied.join(", ")}. Every one of those belongs to somebody else: destroying the arrest identification data is the custodian's act under § 299C.11, subd. 1(b); confirming that it was destroyed is the custodian's too; and mailing the demand is something the participant does after this packet is made. A letter that carried a destruction confirmation would be reporting the very thing it exists to ask for.`,
    MN_RECORD_REFERRAL,
    "Sign each letter, mail it to the custodian, and keep the certified-mail receipt. Then check your own criminal history again to see what changed."
  );
}

function screenRouting(trackId: string, answers: Answers): void {
  const petition = str(answers, "chapter609aPetition");
  if (petition && assertsScreened(petition, ASSERTS_609A)) {
    stop(
      "mn-chapter-609a-not-a-determination",
      trackId,
      "The answers describe a chapter 609A sealing. Section 299C.11, subd. 3(1) says expressly that a sealing under § 152.18, subd. 1, § 242.31 or chapter 609A is NOT a determination in favour of the arrested person, so a case that ended that way does not open this demand however good the outcome was.",
      MN_EXPUNGEMENT_ROUTE_REFERRAL,
      "Take the sealing order and your criminal history to a lawyer, or use the chapter 609A route for what it does reach. This demand is not available on a sealed case."
    );
  }
  const immigration = str(answers, "immigrationStatus");
  if (immigration && assertsScreened(immigration, ASSERTS_IMMIGRATION_ISSUE)) {
    stop(
      "mn-immigration-consequences-attorney-only",
      trackId,
      "The answers raise an immigration consequence. Destroying arrest identification data can remove records a person later needs to produce, and what that does to an immigration matter is exactly the individualized advice this packet cannot give. It says nothing about immigration and will not start by guessing.",
      MN_LAWYER_REFERRAL,
      "Speak to an immigration lawyer, or a lawyer who works with one, before demanding that any record be destroyed."
    );
  }
}

// ---------------------------------------------------------------------------
// Fact derivation
// ---------------------------------------------------------------------------

/** The fact key that decides whether the five secondary letters render. */
export const MN_SECONDARY_LETTERS_CONDITION_KEY = "secondaryCustodiansRequested";

/**
 * Turns the participant's answers into the fact bag the templates read.
 *
 * Fails closed on every condition § 299C.11 sets, on the subdivision 3(1) traps,
 * and on any attempt to supply a custodian's answer.
 */
export function deriveMinnesotaFacts(
  trackId: string,
  answers: Answers
): Record<string, string> {
  if (!MN_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new MinnesotaBranchError(trackId, "trackId", trackId, MN_ASSIGNED_TRACK_IDS);
  }
  refuseOutsidePartyContent(trackId, answers);
  screenRouting(trackId, answers);

  const arrestingAgency = need(trackId, answers, "arrestingAgency");
  const arrestDate = need(trackId, answers, "arrestDate");

  if (UNKNOWN_ANSWER.test(arrestingAgency)) {
    stop(
      "mn-arresting-agency-not-identified",
      trackId,
      "Which agency made the arrest, and in which county and city, has not been identified. The demand has to name the arrest it is about, and the arresting agency is one of the custodians most likely to hold the identification data the subdivision reaches.",
      MN_RECORD_REFERRAL,
      "Take the agency, the county and the city off your own criminal history or the case record, and answer again."
    );
  }
  if (UNKNOWN_ANSWER.test(arrestDate) || !statesAYear(arrestDate)) {
    stop(
      "mn-arrest-date-not-established",
      trackId,
      "The date of the arrest has not been established. Each custodian locates the data by it, and a demand that cannot say when the arrest happened is one an agency cannot act on.",
      MN_RECORD_REFERRAL,
      "Take the arrest date off your own criminal history or the case record, and answer again."
    );
  }

  // The two alternative routes into subdivision 1(b), and the design's warning
  // that the probable-cause question is the most common point of error.
  const dismissed = yesNoUnsure(trackId, answers, "dismissedBeforeProbableCause");
  const declined = yesNo(trackId, answers, "prosecutorDeclined");
  if (dismissed === "unsure") {
    stop(
      "mn-probable-cause-not-established",
      trackId,
      "Whether all charges were dismissed BEFORE the court made a determination of probable cause has not been established. The design records that as the most common point of participant error on this route, and it decides the question outright: a dismissal after a probable-cause determination is not the ground subdivision 1(b) gives.",
      MN_COURT_RECORD_REFERRAL,
      "Ask the court administrator for the county the case was in for the disposition record, read whether probable cause was determined before the dismissal, and answer again from the document."
    );
  }
  if (dismissed === "no" && !declined) {
    stop(
      "mn-no-qualifying-determination",
      trackId,
      "Neither ground in Minn. Stat. § 299C.11, subd. 1(b) is made out: all charges were not dismissed before a determination of probable cause, and the prosecuting authority did not decline to file. The subdivision reaches those two situations and no others, so there is nothing here to demand.",
      MN_EXPUNGEMENT_ROUTE_REFERRAL,
      "Look at what your case actually was. A conviction, a stay, a continuance for dismissal or a diversion is a different question, and chapter 609A sealing is the separate court route."
    );
  }

  // The grand-jury limb only matters where the prosecutor declined.
  const indicted = str(answers, "grandJuryIndictment");
  if (declined && indicted && branch(trackId, "grandJuryIndictment", indicted, MN_YES_NO)) {
    stop(
      "mn-grand-jury-indicted",
      trackId,
      "The prosecuting authority declined to file but a grand jury returned an indictment. Subdivision 1(b) gives the declined-to-file ground only where a grand jury did not indict, so that limb closes on these facts.",
      MN_LAWYER_REFERRAL,
      "Take the indictment and the case history to a Minnesota lawyer. What happened after the indictment decides what, if anything, is available."
    );
  }

  // Subdivision 3(1): diversion is expressly not a determination in the person's
  // favour, and the Judicial Branch tells participants so in terms.
  if (yesNo(trackId, answers, "diversionParticipation")) {
    stop(
      "mn-diversion-not-a-determination",
      trackId,
      "The participant took part in a diversion programme as a result of this arrest. Section 299C.11, subd. 3(1) provides that successful completion of a diversion programme is NOT a determination in favour of the arrested person, alongside a sealing under § 152.18, subd. 1, § 242.31 or chapter 609A, an order of discharge under § 609.165, and a pardon under chapter 638. However the case felt at the time, the subdivision does not open on it.",
      MN_LAWYER_REFERRAL,
      "Take the diversion agreement and the case history to a Minnesota lawyer and ask what, if anything, reaches the arrest record."
    );
  }

  const lookback = yesNoUnsure(trackId, answers, "tenYearLookback");
  if (lookback === "yes") {
    stop(
      "mn-ten-year-lookback-conviction",
      trackId,
      "There is a felony or gross-misdemeanour conviction in the ten years immediately preceding the determination of all pending criminal actions in the participant's favour. Subdivision 1(b) conditions the demand on there being none, anywhere — the lookback is nationwide and not limited to Minnesota — so the condition cannot be stated.",
      MN_RECORD_REFERRAL,
      "Get your own criminal history and check the dates. If the conviction falls outside the ten years, come back; if it does not, a lawyer is the next step."
    );
  }
  if (lookback === "unsure") {
    stop(
      "mn-ten-year-lookback-not-established",
      trackId,
      "Whether there is any felony or gross-misdemeanour conviction in the ten-year lookback has not been established. The lookback runs nationwide and the participant states it in the letter as their own assertion, so it is not something to answer from memory.",
      MN_RECORD_REFERRAL,
      "Get your own Minnesota criminal history from the Bureau of Criminal Apprehension, and think about any other state you have lived in, then answer again."
    );
  }

  // Which custodians actually get a letter. Only a custodian that may hold the
  // record, from the six the design names.
  const requested = list(answers, "custodiansHoldingRecord").map((entry) =>
    branch(trackId, "custodiansHoldingRecord", entry, MN_CUSTODIANS)
  );
  const unique = [...new Set(requested)];
  if (unique.length === 0) {
    stop(
      "mn-no-custodian-identified",
      trackId,
      "No custodian has been identified as possibly holding records from this arrest. A demand under § 299C.11, subd. 1(b) is addressed to a custodian; with none named there is nothing to address and nothing to send.",
      MN_RECORD_REFERRAL,
      "Read your own criminal history and think about which offices touched the arrest — the Bureau of Criminal Apprehension, the police department, the county sheriff, the city attorney, the county attorney, the county department of corrections — and answer again."
    );
  }
  if (!unique.includes("bca")) {
    stop(
      "mn-bca-not-included",
      trackId,
      "The Bureau of Criminal Apprehension is not among the custodians named. Subdivision 1(b) names the Bureau expressly, it holds the statewide identification data that the arresting agency forwards to it, and a demand set that leaves it out leaves the record that matters most in place.",
      MN_RECORD_REFERRAL,
      "Add the Bureau of Criminal Apprehension to the list of custodians and answer again. Get your own criminal history from the Bureau if you want to see what it holds first."
    );
  }

  const secondary = MN_SECONDARY_CUSTODIANS.filter((custodian) => unique.includes(custodian));
  const secondaryNames = secondary.map((custodian) => MN_CUSTODIAN_NAMES[custodian]);

  return {
    // Declared keys, carried through under the design's own names.
    arrestingAgency,
    arrestDate,
    dismissedBeforeProbableCause: dismissed,
    prosecutorDeclined: declined ? "yes" : "no",
    grandJuryIndictment: indicted || "not applicable",
    diversionParticipation: "no",
    tenYearLookback: "no",
    custodiansHoldingRecord: unique.join(", "),

    // Template placeholders.
    addresseeShortName: "the office named below",
    arrestStatement: `The writer states the arrest as: ${arrestingAgency}, on ${arrestDate}.`,
    groundStatement:
      dismissed === "yes"
        ? "The writer states that all charges arising from that arrest were dismissed before the court made a determination of probable cause. Minn. Stat. § 299C.11, subd. 1(b) reaches that situation."
        : "The writer states that the prosecuting authority declined to file charges arising from that arrest, and that a grand jury did not return an indictment. Minn. Stat. § 299C.11, subd. 1(b) reaches that situation.",
    lookbackStatement:
      "The writer states that the writer has not been convicted of a felony or a gross misdemeanour, in Minnesota or in any other state, in the ten years immediately preceding the determination of all pending criminal actions arising from that arrest in the writer's favour.",
    diversionStatement:
      "The writer states that the writer did not take part in a diversion programme as a result of that arrest. Section 299C.11, subd. 3(1) provides that successful completion of a diversion programme is not a determination in favour of the arrested person, and the writer makes this statement because the subdivision makes it relevant.",
    custodianCountStatement:
      secondary.length === 0
        ? "This packet contains one letter, addressed to the Bureau of Criminal Apprehension. It is the only custodian the writer identified as possibly holding records from this arrest."
        : `This packet contains a letter to the Bureau of Criminal Apprehension and a further letter covering ${englishList(secondaryNames)}. Send a signed copy to each. The writer identified them as the offices that may hold records from this arrest.`,
    secondaryCustodianList:
      secondary.length === 0
        ? "No further custodian was identified."
        : secondaryNames.map((name) => `— ${name}`).join("\n"),
    [MN_SECONDARY_LETTERS_CONDITION_KEY]: secondary.length > 0 ? "yes" : "",
    packetCaseReference: "Minnesota arrest data destruction demand"
  };
}

// ---------------------------------------------------------------------------
// Shared letter language
// ---------------------------------------------------------------------------

type Section = {
  heading?: string;
  numbered: boolean;
  paragraphs: readonly string[];
};

/**
 * The header block, which is an addressee block and not a court caption.
 *
 * Nothing on this route is filed anywhere and there is no case number. Each cell
 * is a whole phrase: the shared writer wraps each cell inside its own column, so
 * a pre-split phrase would drift apart by however many lines a field needed.
 */
const ADDRESSEE_LINE =
  "WRITTEN DEMAND UNDER MINN. STAT. § 299C.11, SUBD. 1(b) — THIS IS A LETTER, NOT A COURT FILING";

/**
 * The two caption columns, deliberately short.
 *
 * `FlowWriter.captionRow` draws one left cell and one right cell per call and
 * wraps each inside its own column — 250 points on the left and about 168 on the
 * right. A fill-in rule long enough to be written on is far wider than either,
 * so putting the writer's details in the caption made every field wrap and every
 * following right-hand entry drift down past it. The fields live in the first
 * section instead, at the full content width, and the caption carries only what
 * fits on one line.
 */
const HEADER_LEFT: readonly string[] = ["TO:", "", "{{addresseeShortName}}"];

const HEADER_RIGHT: readonly string[] = [
  "Minn. Stat. § 299C.11",
  "",
  "subd. 1(b)"
];

/** The writer's own details, at full width, where a rule has room to be written on. */
const WRITER_BLOCK_SECTION: Section = {
  heading: "THE WRITER, AND WHERE A REPLY GOES",
  numbered: false,
  paragraphs: [
    "Complete these four lines by hand before sending this letter. LegalEase did not ask for them and does not hold them.",
    "Full legal name: ______________________________________________________",
    "Date of birth: ________________________________________________________",
    "Return address: _______________________________________________________",
    "______________________________________________________________________",
    "Date sent: ____________________________________________________________",
    "Write the office's current name and postal address here, from your own look-up:",
    "______________________________________________________________________",
    "______________________________________________________________________"
  ]
};

const PREAMBLE =
  "Prepared by LegalEase from the writer's own answers, for the writer to sign and send. LegalEase has seen no criminal history, no court record and no agency file, has decided nothing, represents nobody, has sent nothing and holds no reply. Every statement of fact below is the writer's own.";

/** Why the letter is a demand and what the statute makes of it. */
const STATUTORY_BASIS_SECTION: Section = {
  heading: "WHAT THIS LETTER IS, AND WHY IT GOES TO YOU",
  numbered: false,
  paragraphs: [
    "Minn. Stat. § 299C.11, subd. 1(b) provides that on WRITTEN DEMAND the law enforcement agency and the Bureau of Criminal Apprehension shall destroy the arrest identification data — the fingerprints and thumbprints, the photographs, the distinctive physical mark identification data, the known aliases and street names, and all copies and duplicates — where the conditions the subdivision sets are met. This letter is that written demand.",
    "It is not filed in any court, there is no case pending on it, no fee attaches to it, no service of it is required and no hearing arises from it. It asks nothing of a judge.",
    "It is not an order and it reports no decision. Nobody has determined that the conditions are met: the writer states them, and the custodian checks its own records."
  ]
};

/** The three things the subdivision requires, said as the writer's own statements. */
const CONDITIONS_SECTION: Section = {
  heading: "THE CONDITIONS THE SUBDIVISION SETS, AS THE WRITER STATES THEM",
  numbered: true,
  paragraphs: [
    "{{arrestStatement}}",
    "{{groundStatement}}",
    "{{lookbackStatement}}",
    "{{diversionStatement}}"
  ]
};

/** What subdivision 3(1) takes out, printed so nobody has to guess. */
const NOT_A_DETERMINATION_SECTION: Section = {
  heading: "WHAT THE STATUTE SAYS IS NOT A DETERMINATION IN THE WRITER'S FAVOUR",
  numbered: false,
  paragraphs: [
    "Section 299C.11, subd. 3(1) provides that none of the following is a determination in favour of the arrested person: a sealing under § 152.18, subd. 1, § 242.31 or chapter 609A; successful completion of a diversion programme; an order of discharge under § 609.165; and a pardon under chapter 638.",
    "That list is printed here because a person whose case ended in one of those ways will reasonably think it ended in their favour, and the subdivision says otherwise. The writer's statements above are made against that list."
  ]
};

/** What the letter refuses to say. */
const NOT_ASSERTED_SECTION: Section = {
  heading: "WHAT THIS LETTER DOES NOT SAY",
  numbered: false,
  paragraphs: [
    "It does not say that your office holds the data, or that it has failed in any duty. It states what the writer believes and asks you to check your own records.",
    "It does not say that the conditions in subdivision 1(b) have been determined by anybody. The writer states them; you decide what your records show.",
    "It does not report that any data has been destroyed, that any other office has acted, or that anything has been confirmed.",
    "Nobody at LegalEase has read the writer's criminal history, the court file or any agency record in this matter, and nothing here should be read as though somebody had."
  ]
};

/** What the writer asks for, and what happens next. */
const REQUEST_SECTION: Section = {
  heading: "WHAT THE WRITER ASKS",
  numbered: false,
  paragraphs: [
    "The writer demands, under Minn. Stat. § 299C.11, subd. 1(b), that your office destroy the arrest identification data relating to the arrest described above — the fingerprints and thumbprints, the photographs, the distinctive physical mark identification data, the known aliases and street names, and all copies and duplicates of them.",
    "The writer asks to be told, at the return address above, when that has been done, or what your office needs in order to act.",
    "If your office does not hold data from this arrest, the writer asks to be told that, so that the writer knows where the record is.",
    "If another office holds it, the writer asks to be told which."
  ]
};

/** Where automated help ends. */
const STOP_SECTION: Section = {
  heading: "WHERE THIS PACKET STOPS",
  numbered: false,
  paragraphs: [
    "LegalEase prepares documents from what the writer says. It gives no legal advice, reads no record, decides no eligibility question, sends nothing and speaks to no office.",
    "A custodian that refuses or does not respond. A second letter is not the answer.",
    "Any doubt about whether the charges were dismissed before a determination of probable cause, which is the point people most often get wrong on this route.",
    "Any diversion programme connected with the arrest, which subdivision 3(1) takes out of the definition of a determination in the writer's favour.",
    "Any doubt about the nationwide ten-year lookback for a felony or gross-misdemeanour conviction.",
    "Nothing in this packet addresses immigration, and destroying a record can remove something a person later needs to produce, so any question that turns on it stops here.",
    `Where any of these applies, speak to a lawyer before sending anything. ${MN_LAWYER_REFERRAL}`
  ]
};

const SIGNATURE_BLOCK: readonly string[] = [
  "Printed name: ______________________________________",
  "Date: ______________________________________________",
  "",
  "Sign and date this by hand, in your own name, before you send it. The demand is yours and it is only a demand once you have signed it.",
  "Look up the current mailing address for the office named at the top and write it in. Office addresses change and this letter does not carry one.",
  "Send it by certified mail and keep the receipt, so you hold proof of the date the demand was made."
];

// ---------------------------------------------------------------------------
// The three components
// ---------------------------------------------------------------------------

const BCA_LETTER: PleadingTemplate = {
  templateId: "mn-299c11-demand-bureau-of-criminal-apprehension",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: ADDRESSEE_LINE,
    partyBlockLeft: HEADER_LEFT,
    partyBlockRight: HEADER_RIGHT
  },
  title:
    "WRITTEN DEMAND FOR DESTRUCTION OF ARREST IDENTIFICATION DATA — MINN. STAT. § 299C.11, SUBD. 1(b)",
  preamble: PREAMBLE,
  sections: [
    WRITER_BLOCK_SECTION,
    STATUTORY_BASIS_SECTION,
    CONDITIONS_SECTION,
    NOT_A_DETERMINATION_SECTION,
    REQUEST_SECTION,
    NOT_ASSERTED_SECTION,
    {
      heading: "WHICH OFFICES THIS PACKET WRITES TO",
      numbered: false,
      paragraphs: ["{{custodianCountStatement}}"]
    },
    STOP_SECTION
  ],
  prayer: [
    "Thank you for your time. A reply in writing to the return address above would be appreciated.",
    "This letter reports no decision by anybody. It demands, and it asks you to check your own records."
  ],
  signatureLabel: "The writer, in their own name",
  signatureBlock: SIGNATURE_BLOCK
};

const SECONDARY_LETTER: PleadingTemplate = {
  templateId: "mn-299c11-demand-other-custodians",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: ADDRESSEE_LINE,
    partyBlockLeft: HEADER_LEFT,
    partyBlockRight: HEADER_RIGHT
  },
  title:
    "WRITTEN DEMAND FOR DESTRUCTION OF ARREST IDENTIFICATION DATA — MINN. STAT. § 299C.11, SUBD. 1(b)",
  preamble: PREAMBLE,
  sections: [
    {
      heading: "SEND ONE SIGNED COPY OF THIS LETTER TO EACH OFFICE NAMED HERE",
      numbered: false,
      paragraphs: [
        "This letter is addressed to a custodian other than the Bureau of Criminal Apprehension. The writer identified the following offices as possibly holding records from the arrest described below:",
        "{{secondaryCustodianList}}",
        "Print one copy for each office, write that office's name and current address into the block below, sign and date each copy, and send them separately. A demand is made of one office at a time."
      ]
    },
    WRITER_BLOCK_SECTION,
    STATUTORY_BASIS_SECTION,
    CONDITIONS_SECTION,
    NOT_A_DETERMINATION_SECTION,
    REQUEST_SECTION,
    NOT_ASSERTED_SECTION,
    STOP_SECTION
  ],
  prayer: [
    "Thank you for your time. A reply in writing to the return address above would be appreciated.",
    "This letter reports no decision by anybody. It demands, and it asks you to check your own records."
  ],
  signatureLabel: "The writer, in their own name",
  signatureBlock: SIGNATURE_BLOCK
};

/**
 * The mailing instructions.
 *
 * Assigned `custom_pleading` by the design rather than `process_guidance`, so it
 * is produced here. It is the participant's own working sheet: it carries no
 * legal argument and nothing an agency reads.
 */
const MAILING_INSTRUCTIONS: PleadingTemplate = {
  templateId: "mn-299c11-mailing-instructions",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "HOW TO SEND THE DEMAND LETTERS IN THIS PACKET — FOR THE WRITER, NOT FOR ANY OFFICE",
    partyBlockLeft: [
      "This sheet is yours.",
      "",
      "Do not send it to anybody.",
      "",
      "Keep it with your copies."
    ],
    partyBlockRight: [
      "Minn. Stat. § 299C.11, subd. 1(b)",
      "",
      "Arrest: {{arrestDate}}",
      "",
      "Agency: {{arrestingAgency}}"
    ]
  },
  title: "MAILING INSTRUCTIONS FOR THE § 299C.11 DEMAND LETTERS",
  preamble:
    "Work through this in order. Nothing in this packet has been sent: every letter is unsigned and unaddressed until you complete it.",
  sections: [
    {
      heading: "1.  FILL IN WHAT THE LETTERS LEAVE BLANK",
      numbered: true,
      paragraphs: [
        "Write your full legal name, your date of birth and your return address at the top of every letter. LegalEase did not ask for them and did not fill them in.",
        "Look up the current mailing address for each office and write it into that letter's header. Addresses change, and none is printed for you.",
        "Sign and date each letter by hand. A demand under subdivision 1(b) is a written demand by you; an unsigned copy is not one."
      ]
    },
    {
      heading: "2.  WHO GETS A LETTER",
      numbered: true,
      paragraphs: [
        "{{custodianCountStatement}}",
        "Send a letter only to an office that may actually hold records from this arrest. The six the statute and the design contemplate are the Bureau of Criminal Apprehension, the police department, the county sheriff, the city attorney, the county attorney and the county department of corrections.",
        "Send one letter to each office separately. Do not send one letter naming several offices."
      ]
    },
    {
      heading: "3.  HOW TO SEND THEM",
      numbered: true,
      paragraphs: [
        "Send each letter by certified mail. It costs more than an ordinary stamp and it is the only cheap way to hold proof of the date your demand was made.",
        "Keep a copy of every letter you send, and keep every mailing receipt with it.",
        "Write the date you sent each one on your own copy."
      ]
    },
    {
      heading: "4.  WHAT TO EXPECT, AND WHAT NOT TO",
      numbered: false,
      paragraphs: [
        "Nothing in this packet is a determination that the conditions in subdivision 1(b) are made out. Destruction is mandatory where they are, but that is the custodian's check against its own records, and no timescale is promised here because the subdivision sets none.",
        "If an office replies asking for something, send what it asks for. If it refuses, or does not answer, that is where this packet stops and a lawyer is the next step.",
        "After a reasonable time, get your own criminal history from the Bureau of Criminal Apprehension again and see what changed. That is the check that tells you whether the demand worked."
      ]
    },
    STOP_SECTION
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [
    "This sheet is for the writer. It is not addressed to any office, it is not signed, and it is not sent."
  ]
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const MN_CUSTOM_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [BCA_LETTER.templateId]: BCA_LETTER,
  [SECONDARY_LETTER.templateId]: SECONDARY_LETTER,
  [MAILING_INSTRUCTIONS.templateId]: MAILING_INSTRUCTIONS
};

// ---------------------------------------------------------------------------
// Packet set and track
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * Design role → engine role.
 *
 * Both design roles map straight onto the closed twelve-value engine type. The
 * `instructions` component is `custom_pleading` on this route rather than
 * `process_guidance`, which is why it is produced here at all; `instructions` is
 * the engine role for exactly that, and it is not an `attachment`.
 */
export const MN_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  instructions: "instructions"
};

/** This route assigns no component to another lane. */
export const MN_EXCLUDED_COMPONENT_ROLES: readonly { role: string; strategy: string }[] = [];

const PACKET_SET: PacketSet = {
  packetSetId: `${MN_TRACK_ID}-set`,
  version: VERSION,
  components: [
    {
      componentId: `${MN_TRACK_ID}-primary-filing-1`,
      role: MN_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: BCA_LETTER.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${MN_TRACK_ID}-primary-filing-2`,
      role: MN_DESIGN_ROLE_TO_ENGINE_ROLE.primary_filing,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: SECONDARY_LETTER.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "conditional",
      conditionKey: MN_SECONDARY_LETTERS_CONDITION_KEY,
      order: 2,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: `${MN_TRACK_ID}-instructions-3`,
      role: MN_DESIGN_ROLE_TO_ENGINE_ROLE.instructions,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: MAILING_INSTRUCTIONS.templateId,
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

/**
 * The eight questions the design asks, in its own words and under its own keys.
 *
 * None of them is an identity question, which is why every letter prints the
 * writer's name, date of birth and return address as fields to complete by hand.
 */
const REQUIRED_INPUTS: readonly RequiredInput[] = [
  {
    key: "arrestingAgency",
    label: "Which agency arrested you, and in which county and city?",
    required: true
  },
  { key: "arrestDate", label: "On what date were you arrested?", required: true },
  {
    key: "dismissedBeforeProbableCause",
    label:
      "Were all charges dismissed before the court made a probable-cause determination? Answer yes, no or unsure. This is the point people most often get wrong; take it from the disposition record rather than memory.",
    required: true
  },
  {
    key: "prosecutorDeclined",
    label: "Did the prosecutor decline to file charges? Answer yes or no.",
    required: true
  },
  {
    key: "grandJuryIndictment",
    label:
      "Did a grand jury return an indictment? Answer yes or no. Asked only where the prosecutor declined to file, because that ground is open only if a grand jury did not indict.",
    required: false
  },
  {
    key: "diversionParticipation",
    label:
      "Did you take part in a diversion programme as a result of this arrest? Answer yes or no. Completing one is expressly not a determination in your favour under subdivision 3(1).",
    required: true
  },
  {
    key: "tenYearLookback",
    label:
      "Have you been convicted of any felony or gross misdemeanour, anywhere in the country, in the ten years before this case ended? Answer yes, no or unsure. The lookback is nationwide.",
    required: true
  },
  {
    key: "custodiansHoldingRecord",
    label:
      "Which agencies do you believe hold records from this arrest? Choose from the Bureau of Criminal Apprehension, the police department, the county sheriff, the city attorney, the county attorney and the county department of corrections.",
    required: true
  }
];

const statuses = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

export const MN_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "MN",
    trackId: MN_TRACK_ID,
    publicName: "Arrest record destruction request (no court case)",
    mechanism: "written_demand_for_destruction_of_arrest_identification_data",
    authority: "Minn. Stat. § 299C.11, subd. 1(b)",
    recordTypes: [
      "arrest_identification_data",
      "fingerprints",
      "photographs",
      "distinctive_physical_mark_data",
      "aliases"
    ],
    dispositions: ["all_charges_dismissed_before_probable_cause", "prosecutor_declined_and_no_indictment"],
    // Not a court level, and deliberately. Nothing on this route is filed: the
    // demand goes to each records custodian that may hold the data.
    courtLevel: "not_a_court_filing_each_records_custodian_receives_a_written_demand",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: PACKET_SET,
    requiredInputs: REQUIRED_INPUTS,
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
    assembledPacketName: "mn-arrest-data-destruction-demand",
    assembledPacketTitle:
      "Minnesota arrest identification data destruction demand — Minn. Stat. § 299C.11, subd. 1(b)",
    customerDeliverableDescription:
      "A signed written demand to the Bureau of Criminal Apprehension that it destroy the arrest identification data from an arrest that ended in the person's favour, a second letter covering whichever of the five other custodians the participant identified, and a mailing sheet for the participant's own use. Nothing is filed in a court, no fee attaches and no hearing arises. Each condition subdivision 1(b) sets is stated as the writer's own statement, the subdivision 3(1) list of things that are NOT a determination in the person's favour is printed in full, and every letter leaves the writer's name, date of birth, return address, the office's address, the signature and the date to be completed by hand.",
    notes:
      "The Judicial Branch's six sample § 299C.11 letters are drafting references rather than approved forms, and their absence from the corpus is an open release question the design records as not preventing generation. Whether all charges were dismissed before a probable-cause determination is the point participants most often get wrong, so an uncertain answer stops the route and sends them to the disposition record; diversion, a chapter 609A sealing, a § 609.165 discharge and a pardon are each expressly not a determination in the person's favour and each stops it too."
  }
];
