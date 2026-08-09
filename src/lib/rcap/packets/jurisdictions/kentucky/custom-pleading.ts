// Kentucky record clearing — custom-pleading implementation.
//
// One assigned route and two custom-pleading components. The route is
// `ky_void_seal_marijuana_synthetic_salvia`: a motion under KRS 218A.276 asking
// the court of conviction to void a first marijuana, synthetic-drug or salvia
// possession conviction and seal the records, made in the original criminal
// case, with a certificate of service on the prosecuting attorney.
//
// **`ky_void_seal_controlled_substance` is not implemented here.** The KRS
// 218A.275 sibling route is a different assignment, blocked on its own
// legal-design question: KRS 218A.275(12) absolutely bars the relief to anyone
// who previously had a possession charge dismissed after a KRS 218A.14151
// deferred prosecution, and that decides whether a participant receives a
// packet at all. Nothing here implements it, infers its mechanism, imports its
// inputs, borrows its eligibility language or weakens its stop. The two routes
// share a proposed-order form and nothing else in this module.
//
// **The proposed order is another lane's.** The design's packet set has three
// components and assigns the middle one — AOC-334, Order Voiding Conviction and
// Sealing Records — to `official_pdf_fill`. No binary for it exists in this
// checkout and none is assigned to this lane, so this module does not produce
// it, does not relabel it as a custom pleading, and does not pretend the packet
// is complete without it. It names it, says where it comes from and says the
// motion is tendered with it — see `KY_EXCLUDED_OFFICIAL_FORM_COMPONENTS`.
//
// **The design declares no identity inputs for Kentucky.** Not a name, not an
// address, not a date of birth. All eleven declared keys are case facts. A
// caption needs the movant's name, so it is printed as a labelled rule the
// movant completes by hand under a section that says in terms that LegalEase
// never asked for it. Declaring an input the design does not ask for would be
// inventing design; printing a populated field LegalEase never collected would
// be worse.
//
// Five things shape both documents.
//
// **The offence list is closed and is the gate.** KRS 218A.276(1) reaches
// possession of marijuana, of a synthetic drug and of salvia, and nothing else.
// The design records that as a scope restriction, so an offence off the list
// stops the route rather than being argued into it.
//
// **First-offence status is the movant's own statement, never a conclusion.**
// The design makes any dispute about it the end of automated assistance. The
// motion prints what the movant says and says in terms that whether the record
// bears it out is for the court to see from the file. An answer of "no", and an
// answer that the movant is unsure, both stop.
//
// **Voiding may happen once.** The design excludes anyone who has already had a
// conviction voided under this section, so a prior void stops the route.
//
// **The seal does not reach everything, and how far it does not reach is not
// settled here.** KRS 218A.276(9) orders the records sealed except as provided
// in KRS 27A.099. The design carries the scope of that exception as an open
// research note, so the motion says the exception exists and does not describe
// its boundary.
//
// **The statements of legal effect await counsel.** The design records, as a
// release blocker, that the fixed propositions this motion makes about the
// effect of voiding and sealing under KRS 218A.276(9) and (10) have not been
// ratified. They are preserved as drafted and marked, not softened and not
// removed, and the track is runtime-disabled on that blocker as well as on the
// ordinary switch.
//
// Two absences are deliberate and should not be "fixed":
//
//   - **No verification.** The design says in terms that the motion is not
//     verified and that no notarization is required, so no `verification` line
//     and no notarial block is printed on either document.
//   - **No fee figure beyond zero.** The Clerks' Manual records that there is
//     no filing fee for this proceeding, and the design adopts that. The packet
//     says there is none and tells the movant to stop and ask if a clerk asks
//     for one, which is the design's own stop condition.
//
// Statutory content is taken from the memo's recorded controlling authority for
// this track, which its author read at the official Kentucky Legislative
// Research Commission channel on 2026-08-06. No subsection is recited beyond
// what the memo records.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel adopts
// it. The track is `technicalFixture` and `runtimeDisabled`: nothing here
// reaches a runtime surface, and wiring the track and templates into the shared
// registry and template pack is the integration captain's step.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

/** The one assigned route. Held closed so an unassigned track cannot derive. */
export const KY_ASSIGNED_TRACK_IDS: readonly string[] = [
  "ky_void_seal_marijuana_synthetic_salvia"
];

/**
 * The sibling route this module deliberately does not implement.
 *
 * Named so that a reader, a verifier and a future captain can all see that its
 * absence is a decision rather than an oversight.
 */
export const KY_EXCLUDED_TRACK_IDS: readonly string[] = ["ky_void_seal_controlled_substance"];

// ---------------------------------------------------------------------------
// Referral destinations
// ---------------------------------------------------------------------------

/** Where a stop that needs individual legal advice sends the movant. */
export const KY_REFERRAL =
  "The Kentucky Bar Association lawyer referral service, or Kentucky Legal Aid, the Legal Aid Society, Legal Aid of the Bluegrass or AppalReD Legal Aid for the region the case is in.";

/** Where a stop that needs the record itself sends the movant. */
export const KY_RECORD_REFERRAL =
  "The Office of the Circuit Court Clerk for the county of conviction, which holds the judgment, the citation or indictment and the docket in the original criminal case.";

/** Where a stop about the court's own process sends the movant. */
export const KY_CLERK_REFERRAL =
  "The Office of the Circuit Court Clerk for the county of conviction, which is where this motion is filed and which is the office that can say what, if anything, it charges.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class KentuckyEligibilityStopError extends Error {
  readonly code = "kentucky_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "KentuckyEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class KentuckyBranchError extends Error {
  readonly code = "kentucky_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(`${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`);
    this.name = "KentuckyBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/** District or circuit, which decides the caption and nothing else. */
export const KY_COURT_LEVELS: Readonly<Record<string, "district" | "circuit">> = {
  district: "district",
  "district court": "district",
  circuit: "circuit",
  "circuit court": "circuit"
};

const KY_COURT_LEVEL_NAME: Readonly<Record<"district" | "circuit", string>> = {
  district: "District Court",
  circuit: "Circuit Court"
};

/**
 * The KRS 218A.276(1) offence list, which is fixed at three groups.
 *
 * `not_on_list` and `unsure` are values in their own right rather than branch
 * failures: the design makes an offence off the list a scope restriction and
 * any dispute about the ground the end of automated assistance, so both deserve
 * a typed stop that says which one happened.
 */
export const KY_OFFENCE_GROUPS: Readonly<
  Record<string, "marijuana" | "synthetic" | "salvia" | "not_on_list" | "unsure">
> = {
  marijuana: "marijuana",
  "possession of marijuana": "marijuana",
  synthetic: "synthetic",
  "synthetic drug": "synthetic",
  "synthetic drugs": "synthetic",
  salvia: "salvia",
  "none of these": "not_on_list",
  "not on the list": "not_on_list",
  no: "not_on_list",
  unsure: "unsure",
  "not sure": "unsure"
};

/** How the design names each group, and the section KRS 218A.276(1) points at. */
const KY_OFFENCE_DESCRIPTION: Readonly<
  Record<"marijuana" | "synthetic" | "salvia", { noun: string; citation: string }>
> = {
  marijuana: { noun: "possession of marijuana", citation: "KRS 218A.1422" },
  synthetic: { noun: "possession of a synthetic drug", citation: "KRS 218A.1430" },
  salvia: { noun: "possession of salvia", citation: "KRS 218A.1451" }
};

/** What was completed, which KRS 218A.276(8) makes the trigger. */
export const KY_COMPLETION_TYPES: Readonly<Record<string, string>> = {
  treatment: "the treatment ordered in this case",
  probation: "the probation ordered in this case",
  sentence: "the sentence imposed in this case",
  "the sentence": "the sentence imposed in this case"
};

/** Which office prosecuted, which is the office served under the design. */
export const KY_PROSECUTOR_OFFICES: Readonly<
  Record<string, "county_attorney" | "commonwealths_attorney">
> = {
  county_attorney: "county_attorney",
  "county attorney": "county_attorney",
  commonwealths_attorney: "commonwealths_attorney",
  "commonwealth's attorney": "commonwealths_attorney",
  "commonwealths attorney": "commonwealths_attorney"
};

/**
 * Yes, no, or unsure.
 *
 * The two gate questions carry `unsure` because the design makes a *dispute*
 * about first-offence status the end of automated assistance, and an answer of
 * "I am not sure" is that dispute surfacing rather than a malformed answer.
 */
export const KY_YES_NO_UNSURE: Readonly<Record<string, "yes" | "no" | "unsure">> = {
  yes: "yes",
  no: "no",
  unsure: "unsure",
  "not sure": "unsure",
  "i am not sure": "unsure"
};

/**
 * Answer keys that would carry outside-party work into the packet.
 *
 * The design declares none of them, so their presence means a caller is trying
 * to have LegalEase supply a judicial finding, an order, a prosecutor's
 * position, a clerk entry, a filing date, a hearing date or a completed
 * service. KRS 218A.276(8) puts the voiding on the court and the design puts
 * service on the movant, after it happens.
 */
export const KY_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "clerkCertification",
  "courtFindings",
  "filingDate",
  "hearingDate",
  "judgeName",
  "judgeSignature",
  "judicialFinding",
  "orderEntered",
  "prosecutorConsent",
  "prosecutorPosition",
  "recordsSealedDate",
  "serviceCompleted",
  "signedOrder",
  "voidedDate"
];

// ---------------------------------------------------------------------------
// The component the official-PDF lane owns
// ---------------------------------------------------------------------------

/**
 * The design's middle component, which this job does not produce.
 *
 * Recorded here rather than left implicit, because the assembled packet is
 * genuinely incomplete without it: the design's own filing rule is to tender
 * AOC-334 with the motion, and the motion has to be able to name it.
 */
export const KY_EXCLUDED_OFFICIAL_FORM_COMPONENTS: readonly {
  componentId: string;
  officialFormId: string;
  title: string;
  requirement: "required" | "conditional";
  obtainedFrom: string;
}[] = [
  {
    componentId: "ky_void_seal_marijuana_synthetic_salvia-proposed-order-2",
    officialFormId: "AOC-334",
    title: "Order Voiding Conviction and Sealing Records",
    requirement: "required",
    obtainedFrom:
      "The Kentucky Court of Justice legal forms library at kycourts.gov, or the Office of the Circuit Court Clerk for the county of conviction."
  }
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
  throw new KentuckyEligibilityStopError(stopId, trackId, reason, referral, nextStep);
}

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "ky-answer-missing",
      trackId,
      `The motion needs an answer to ${key} before anything can be prepared, and none was given. A motion filed in the original criminal case has to identify that case and the ground it is brought on, and one that leaves either blank is one the clerk will return.`,
      KY_RECORD_REFERRAL,
      "Get the judgment and the docket from the Circuit Court Clerk for the county of conviction, and answer the question from the record rather than from memory."
    );
  }
  return value;
};

/**
 * A closed list, returning the key rather than the prose.
 *
 * Returning the description here and comparing against it elsewhere is how a
 * branch silently becomes permanently false, so the key is what comes back and
 * any rendered wording is looked up from it separately.
 */
const branch = <T>(
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, T>>
): T => {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.]$/, "");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new KentuckyBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const UNKNOWN_ANSWER = /\b(not sure|unsure|don'?t know|do not know|no idea|cannot recall|can'?t recall)\b/i;
const STATES_A_YEAR = /\b(19|20)\d{2}\b/;

function needDatedAnswer(
  trackId: string,
  answers: Answers,
  key: string,
  stopId: string,
  what: string
): string {
  const value = need(trackId, answers, key);
  if (UNKNOWN_ANSWER.test(value) || !STATES_A_YEAR.test(value)) {
    stop(
      stopId,
      trackId,
      `The motion asks for ${what} and the answer given does not state one. KRS 218A.276(8) turns on completion having happened, and LegalEase will not put a date in a court filing that nobody has taken from the record.`,
      KY_RECORD_REFERRAL,
      "Ask the Circuit Court Clerk for the judgment and the docket in the case, take the date off the record, and answer again."
    );
  }
  return value;
}

/** The bare county name, for a line that already prints the word "County". */
function bareCountyName(raw: string): string {
  return raw.trim().replace(/\s+county$/i, "").trim() || raw.trim();
}

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

/**
 * Turns the movant's answers into the fact bag the templates read.
 *
 * Every declared key is carried through under its own name, because
 * `resolvePacket` checks the declared keys against this bag. Derived sentences
 * live under separate keys, so no document renders a bare "yes" on a line of
 * its own and leaves a reader to guess what was asked.
 */
export function deriveKentuckyFacts(trackId: string, answers: Answers): Record<string, string> {
  if (!KY_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new Error(`${trackId} is not a Kentucky custom-pleading track this module implements.`);
  }

  for (const key of KY_OUTSIDE_PARTY_KEYS) {
    if (str(answers, key)) {
      stop(
        "ky-outside-party-content-refused",
        trackId,
        `An answer was supplied for ${key}. That is somebody else's work: KRS 218A.276(8) puts the voiding on the court, the sealing order is the court's under subsection (9), the prosecuting attorney speaks for itself, the clerk certifies its own records, and service is a thing the movant does and then reports afterwards. LegalEase does not write any of it and does not accept it as an input.`,
        KY_REFERRAL,
        "Remove that answer. If a court has already voided or sealed this conviction, this motion is not the document you need; take the order to a lawyer and ask what is left to do."
      );
    }
  }

  const county = need(trackId, answers, "vmjCounty");
  const courtLevel = branch(trackId, "vmjCourtLevel", need(trackId, answers, "vmjCourtLevel"), KY_COURT_LEVELS);
  const caseNumber = need(trackId, answers, "vmjCaseNumber");
  const offenceGroup = branch(
    trackId,
    "vmjOffenceOnList",
    need(trackId, answers, "vmjOffenceOnList"),
    KY_OFFENCE_GROUPS
  );

  if (offenceGroup === "not_on_list") {
    stop(
      "ky-offence-not-on-276-list",
      trackId,
      "The conviction is not for possession of marijuana, of a synthetic drug or of salvia. KRS 218A.276(1) fixes the offences this route reaches at those three, and the design carries that as a scope restriction rather than something to argue around. A conviction outside the list is not reached by this section.",
      KY_REFERRAL,
      "Ask a lawyer which Kentucky route, if any, reaches this conviction. A first controlled-substance possession conviction outside this list has its own separate statute and its own separate packet."
    );
  }
  if (offenceGroup === "unsure") {
    stop(
      "ky-offence-not-established",
      trackId,
      "The movant is not sure which offence the conviction was for. KRS 218A.276(1) reaches three named possession offences and nothing else, so which one it was decides whether this route exists at all. LegalEase does not classify an offence from a description.",
      KY_RECORD_REFERRAL,
      "Ask the Circuit Court Clerk for the judgment and the citation or indictment, read the offence off the record, and answer again with the offence as it is named there."
    );
  }

  const convictionDate = needDatedAnswer(
    trackId,
    answers,
    "vmjConvictionDate",
    "ky-conviction-date-not-established",
    "the date of the conviction"
  );
  const completionWhat = branch(
    trackId,
    "vmjCompletionType",
    need(trackId, answers, "vmjCompletionType"),
    KY_COMPLETION_TYPES
  );
  const completionDate = needDatedAnswer(
    trackId,
    answers,
    "vmjCompletionDate",
    "ky-completion-date-not-established",
    "the date the treatment, probation or sentence was completed"
  );

  const firstOffence = branch(
    trackId,
    "vmjFirstOffence",
    need(trackId, answers, "vmjFirstOffence"),
    KY_YES_NO_UNSURE
  );
  if (firstOffence === "no") {
    stop(
      "ky-not-a-first-offence",
      trackId,
      "The movant states that this was not a first conviction for this kind of possession. KRS 218A.276(8) reaches a first conviction, and whether an earlier matter counts as one is a classification LegalEase does not make.",
      KY_REFERRAL,
      "Take the judgments in every case to a lawyer and ask whether any of them makes this a second conviction for this purpose before you file anything."
    );
  }
  if (firstOffence === "unsure") {
    stop(
      "ky-first-offence-not-established",
      trackId,
      "The movant is not sure whether this was a first conviction for this kind of possession. The adopted design makes any dispute about first-offence status the end of automated assistance, because it is the gate this route turns on and it is contestable.",
      KY_REFERRAL,
      "Get your Kentucky criminal history record and the judgments, and have a lawyer read them against KRS 218A.276 before you file."
    );
  }

  const priorVoid = branch(
    trackId,
    "vmjPriorVoid",
    need(trackId, answers, "vmjPriorVoid"),
    KY_YES_NO_UNSURE
  );
  if (priorVoid === "yes") {
    stop(
      "ky-prior-void-under-this-section",
      trackId,
      "The movant states that a conviction has already been voided under this statute. The design excludes anyone who has already had a conviction voided under this section, which may occur only once, so this route is closed on that ground however the rest of the answers read.",
      KY_REFERRAL,
      "Ask a lawyer whether expungement under KRS 431.078 reaches this conviction instead. A second voiding under this section is not available."
    );
  }
  if (priorVoid === "unsure") {
    stop(
      "ky-prior-void-not-established",
      trackId,
      "The movant is not sure whether a conviction has already been voided under this statute. Voiding may occur only once, so an unresolved answer here decides whether the route is open, and it is not one LegalEase resolves from a description.",
      KY_RECORD_REFERRAL,
      "Ask the Circuit Court Clerk in every county where you have had a possession case whether an order voiding a conviction was entered, and answer again from what they tell you."
    );
  }

  const agencies = need(trackId, answers, "vmjAgencies");
  const prosecutorOffice = branch(
    trackId,
    "vmjProsecutorOffice",
    need(trackId, answers, "vmjProsecutorOffice"),
    KY_PROSECUTOR_OFFICES
  );

  const countyName = bareCountyName(county);
  const courtName = KY_COURT_LEVEL_NAME[courtLevel];
  const offence = KY_OFFENCE_DESCRIPTION[offenceGroup];
  const prosecutorName =
    prosecutorOffice === "county_attorney"
      ? `the ${countyName} County Attorney`
      : `the Commonwealth's Attorney for the circuit that includes ${countyName} County`;

  return {
    // Declared keys, carried through exactly as declared.
    vmjCounty: county,
    vmjCourtLevel: courtLevel,
    vmjCaseNumber: caseNumber,
    vmjOffenceOnList: offenceGroup,
    vmjConvictionDate: convictionDate,
    vmjCompletionType: completionWhat,
    vmjCompletionDate: completionDate,
    vmjFirstOffence: "yes",
    vmjPriorVoid: "no",
    vmjAgencies: agencies,
    vmjProsecutorOffice: prosecutorOffice,

    // Template placeholders.
    countyName,
    courtName,
    courtLine: `IN THE ${countyName.toUpperCase()} ${courtName.toUpperCase()}, COMMONWEALTH OF KENTUCKY`,
    caseNumber,
    offenceNoun: offence.noun,
    offenceCitation: offence.citation,
    prosecutorOfficeName: prosecutorName,
    offenceStatement: `The movant states that the conviction in this case was for ${offence.noun}, which KRS 218A.276(1) reaches by reference to ${offence.citation}.`,
    convictionDateStatement: `The movant states the date of the conviction as: ${convictionDate}`,
    completionStatement: `The movant states that they satisfactorily completed ${completionWhat}, and gives the date of completion as: ${completionDate}`,
    firstOffenceStatement:
      "The movant states that this was a first conviction for this kind of possession. Whether the record bears that out is for the court to see from the file; this motion does not assert it as a legal conclusion.",
    priorVoidStatement:
      "The movant states that no conviction of theirs has previously been voided under this section.",
    agenciesStatement: `The movant expects the following agencies to hold records of this case: ${agencies}`
  };
}

// ---------------------------------------------------------------------------
// Shared template language
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/**
 * The caption both documents share.
 *
 * Each cell is a whole phrase. `FlowWriter.captionRow` wraps each column inside
 * itself and draws one left and one right cell per call, so a phrase split
 * across two entries drifts apart by however many lines the left cell needed.
 */
const CAPTION_LEFT: readonly string[] = [
  "COMMONWEALTH OF KENTUCKY,",
  "",
  "Plaintiff,",
  "",
  "vs.",
  "",
  "________________________________,",
  "",
  "Defendant and Movant."
];

const IDENTITY_SECTION = {
  heading: "WHO IS ASKING",
  numbered: true,
  paragraphs: [
    "The movant is the defendant in the case named in the caption above. LegalEase did not ask for the movant's name, address or date of birth, does not hold them, and has not printed them: the lines for them in the caption and in the signature block are blank because they are the movant's to complete by hand.",
    "Write your name in the caption exactly as it appears on the judgment in this case, including any middle name or suffix the judgment carries. If the judgment names you differently from the way you write your name now, use the judgment's version and say so to the clerk.",
    "This motion is made in the original criminal case identified by the case number in the caption and is not a new action."
  ]
} as const;

const NOT_ASSERTED_SECTION = {
  heading: "WHAT THIS MOTION DOES NOT SAY",
  numbered: false,
  paragraphs: [
    "This motion makes no statement about whether the movant qualifies, and it must not be read as making one. KRS 218A.276(8) leaves the decision with the court, which may void the conviction; the word is may, and nothing here predicts how it will be exercised.",
    // Worded so that no forbidden phrase appears inside its own denial: naming
    // the acts in the affirmative here would trip the prohibited-content scan
    // that exists to protect this very sentence.
    "It reports nothing that has already happened. No voiding, no sealing, no service on the prosecuting attorney, no filing, no hearing, no relief. Each of those is somebody else's act, and none has been reported to LegalEase.",
    "LegalEase prepared this document from what the movant said. It did not look at the judgment, the docket or any criminal history record, and it has not checked any answer against any record."
  ]
} as const;

const AOC_334_SECTION = {
  heading: "THE ORDER THAT GOES WITH THIS MOTION",
  numbered: false,
  paragraphs: [
    "This motion is tendered with AOC-334, Order Voiding Conviction and Sealing Records. That is an official form of the Kentucky Court of Justice, it is the order the court signs if it grants this motion, and this packet does not contain it.",
    "Get AOC-334 from the Kentucky Court of Justice legal forms library at kycourts.gov, or from the Office of the Circuit Court Clerk for the county of conviction, and take it to the clerk with this motion. Leave it unsigned and undated: it is the court's to sign, and only if the court grants the motion.",
    "Until AOC-334 is added, this packet is not a complete filing. That is a statement about this packet, not about the movant's case."
  ]
} as const;

const STOPS_SECTION = {
  heading: "WHERE THIS PACKET STOPS",
  numbered: false,
  paragraphs: [
    "LegalEase prepares documents from what the movant says. It does not give legal advice, does not look at any record, does not file anything, does not serve anybody and does not appear in court.",
    "Any dispute about whether this was a first conviction of this kind. That is the gate this route turns on and it is contestable.",
    "Any choice between asking for this and asking for expungement. Which one to seek is a decision with lifetime consequences and it is a lawyer's to advise on, not a form's.",
    "Any movant who is not a United States citizen. A voided conviction may still be a conviction for immigration purposes, and nothing in this packet is advice about that.",
    "A clerk who asks for a filing fee. The Clerks' Manual records none for this proceeding, so an asked-for fee is a sign that something about the filing is being treated differently, and it is worth asking why before paying.",
    "Where any of these applies, speak to a lawyer before filing. The Kentucky Bar Association lawyer referral service, or Kentucky Legal Aid, the Legal Aid Society, Legal Aid of the Bluegrass or AppalReD Legal Aid for the region the case is in."
  ]
} as const;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const KENTUCKY_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  "ky-void-seal-marijuana-motion": {
    templateId: "ky-void-seal-marijuana-motion",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "{{courtLine}}",
      partyBlockLeft: CAPTION_LEFT,
      // One whole phrase per cell. `FlowWriter.captionRow` wraps a cell inside
      // its own column but pairs entries positionally, so a phrase split across
      // two entries separates by however many lines the left cell needed.
      partyBlockRight: ["Case No. {{caseNumber}}", "", "MOTION TO VOID CONVICTION AND SEAL RECORDS"]
    },
    title: "MOTION TO VOID CONVICTION AND SEAL RECORDS UNDER KRS 218A.276",
    preamble:
      "Prepared by LegalEase from the answers the movant gave. LegalEase has not seen the movant's records, has not decided whether the movant qualifies, does not represent the movant, files nothing and appears nowhere. Every statement of fact below is the movant's own.",
    sections: [
      IDENTITY_SECTION,
      {
        heading: "THE GROUND THIS MOTION IS BROUGHT ON",
        numbered: true,
        paragraphs: [
          "KRS 218A.276(1) reaches a first conviction for possession of marijuana under KRS 218A.1422, of a synthetic drug under KRS 218A.1430, or of salvia under KRS 218A.1451. It reaches those three and no others.",
          "KRS 218A.276(8) provides that, after satisfactory completion of treatment, probation or other sentence on such a first conviction, the court may void the conviction.",
          "KRS 218A.276(9) provides that the court shall then order the records sealed, except as provided in KRS 27A.099.",
          "This motion asks the court to exercise the authority in subsection (8) and, if it does, to enter the order subsection (9) then requires. It asks; it does not assert an entitlement."
        ]
      },
      {
        heading: "WHAT THE MOVANT STATES",
        numbered: true,
        paragraphs: [
          "{{offenceStatement}}",
          "{{convictionDateStatement}}",
          "{{completionStatement}}",
          "{{firstOffenceStatement}}",
          "{{priorVoidStatement}}",
          "{{agenciesStatement}}"
        ]
      },
      NOT_ASSERTED_SECTION,
      {
        heading: "WHAT VOIDING AND SEALING WOULD AND WOULD NOT DO",
        numbered: false,
        paragraphs: [
          "The statements in this section are fixed statements of legal effect drawn from the statute. Reviewing counsel has not yet ratified them, and until counsel does, this document is a draft and is marked as one on every page.",
          "Sealing under KRS 218A.276(9) is not destruction. The records continue to exist, and the order reaches them except as provided in KRS 27A.099. How far that exception extends is an open question in the adopted design and is not described here.",
          "KRS 218A.276(10) provides that the proceedings may not be used against the defendant except to determine eligibility, and that the movant need not disclose them.",
          "A conviction voided under KRS 218A.276(8) can then be expunged under KRS 431.078 with no five-year wait. That is a separate application, on a separate form, and it is not part of this packet.",
          "This order, if the court makes it, binds Kentucky court and prosecution records. It does not reach federal records, records held in another state, or anything a private background-check company has already copied and sold."
        ]
      },
      AOC_334_SECTION,
      {
        heading: "FILING, SERVICE AND FEE",
        numbered: false,
        paragraphs: [
          "File this motion in the original criminal case, with the Office of the Circuit Court Clerk for the county of conviction, tendering AOC-334 with it.",
          "No summons issues on this motion. The Clerks' Manual records the filing as motion type SA with no summons, and the clerk delivers it to the judge who decided the case. Because no summons issues, the movant serves the prosecuting attorney and files a certificate of service saying so.",
          "There is no filing fee for this proceeding. The Clerks' Manual records none, and no amount is printed anywhere in this packet. If a clerk asks for a fee, do not pay it without asking what it is for.",
          "This motion is not verified and no notarial block is printed. KRS 218A.276 contains no verification requirement and the design records none. Sign it by hand; if the clerk asks for something sworn, ask the clerk what, and sign that in front of a notary rather than beforehand."
        ]
      },
      STOPS_SECTION
    ],
    prayer: [
      "WHEREFORE the movant asks the court to void the conviction described above under KRS 218A.276(8) and to order the records of this case sealed under KRS 218A.276(9), and tenders the order AOC-334 with this motion for the court's consideration.",
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
      "Sign this by hand. LegalEase did not ask for your name or address and has not filled any of these lines in for you."
    ]
  },

  "ky-void-seal-marijuana-certificate-of-service": {
    templateId: "ky-void-seal-marijuana-certificate-of-service",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "{{courtLine}}",
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: ["Case No. {{caseNumber}}", "", "CERTIFICATE OF SERVICE"]
    },
    title: "CERTIFICATE OF SERVICE",
    // The fill-in block and the execution block have to land on one page. The
    // renderer reserves keep-together for a section heading and for the
    // signature block, and nothing holds a run of blanks together, so a movant
    // could otherwise sign a page whose blanks are overleaf. What would
    // otherwise be a closing section is carried in the preamble instead: a
    // headed section costs roughly twice the line units of the same words here.
    preamble:
      "To complete and sign AFTER service, not before. This reports nothing: LegalEase serves nobody, holds no proof of service and has filed nothing. It is not the prosecuting attorney's position, not a clerk's certificate, and not a court record until the clerk files it.",
    sections: [
      {
        heading: "WHO IS SERVED, AND WHY",
        numbered: false,
        paragraphs: [
          "No summons issues on a motion under KRS 218A.276, so the movant serves the prosecuting attorney and files this certificate saying so. The office to serve is {{prosecutorOfficeName}}. Serve by mail or by hand, then file the motion, AOC-334 and this certificate together with the Circuit Court Clerk.",
          "Sign this by hand after service and not before. Complete every line below from what you actually did; until they are filled in, the sentence that follows them states nothing:",
          "On the date and in the manner written below, I delivered a copy of the Motion to Void Conviction and Seal Records in this case, and the order tendered with it, to the prosecuting attorney named above.",
          "Date of service: ______________________________",
          "Manner of service — mail, or hand delivery: ______________________________",
          "Name and address of the office served: ______________________________",
          "If someone else delivered it, write their name and have them sign below: ______________________________"
        ]
      }
    ],
    prayer: [],
    signatureLabel: "Movant, self-represented",
    signatureBlock: [
      "Printed name: ______________________________",
      "Date signed: _______________________________"
    ]
  }
};

// ---------------------------------------------------------------------------
// Packet set and track
// ---------------------------------------------------------------------------

/**
 * The design's roles, mapped onto the engine's closed role list.
 *
 * `PacketComponentRole` is not owned by this job, so the design's names are
 * mapped rather than added to. Both of this route's roles map to themselves.
 */
export const KY_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  certificate_of_service: "certificate_of_service"
};

type ComponentSpec = {
  componentId: string;
  designRole: keyof typeof KY_DESIGN_ROLE_TO_ENGINE_ROLE;
  templateId: string;
  order: number;
  requirement: "required" | "conditional";
};

/**
 * The two custom-pleading components, at the design's own order numbers.
 *
 * Order 2 is absent because it is AOC-334 and belongs to the official-PDF lane.
 * The gap is deliberate and is what makes the exclusion visible in the
 * assembled packet rather than silently renumbering around it.
 */
const COMPONENT_SPECS: readonly ComponentSpec[] = [
  {
    componentId: "ky_void_seal_marijuana_synthetic_salvia-primary-filing-1",
    designRole: "primary_filing",
    templateId: "ky-void-seal-marijuana-motion",
    order: 1,
    requirement: "required"
  },
  {
    componentId: "ky_void_seal_marijuana_synthetic_salvia-certificate-of-service-3",
    designRole: "certificate_of_service",
    templateId: "ky-void-seal-marijuana-certificate-of-service",
    order: 3,
    requirement: "required"
  }
];

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  for (const spec of specs) {
    if (!KENTUCKY_PLEADING_TEMPLATES[spec.templateId]) {
      throw new Error(`${spec.componentId}: no Kentucky template ${spec.templateId} is registered.`);
    }
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: KY_DESIGN_ROLE_TO_ENGINE_ROLE[spec.designRole],
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: spec.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: spec.requirement,
      order: spec.order,
      approval: PENDING_APPROVAL,
      version: VERSION
    }))
  };
}

/**
 * The eleven questions the design declares.
 *
 * `RequiredInput` carries only a key, a label and a required flag, so the
 * design's condition text — the reason a question is asked, and what a usable
 * answer looks like — is folded into the label. The keys are the design's and
 * are not renamed.
 */
const VMJ_INPUTS: readonly RequiredInput[] = [
  { key: "vmjCounty", label: "In which Kentucky county were you convicted?", required: true },
  {
    key: "vmjCourtLevel",
    label: "Was the case in district court or circuit court? Answer district or circuit.",
    required: true
  },
  { key: "vmjCaseNumber", label: "What is the case number?", required: true },
  {
    key: "vmjOffenceOnList",
    label:
      "Was the conviction for possession of marijuana, of a synthetic drug, or of salvia? Kentucky's void-and-seal route for this branch covers only those three. Answer marijuana, synthetic drug, salvia, none of these, or unsure.",
    required: true
  },
  { key: "vmjConvictionDate", label: "On what date were you convicted?", required: true },
  {
    key: "vmjCompletionType",
    label:
      "What did you complete — treatment, probation, or the sentence itself? Answer treatment, probation or sentence.",
    required: true
  },
  { key: "vmjCompletionDate", label: "On what date did you complete it?", required: true },
  {
    key: "vmjFirstOffence",
    label:
      "Was this your first conviction for this kind of possession? Answer yes, no or unsure. Any dispute about this ends automated assistance, so unsure is a real answer and is treated as one.",
    required: true
  },
  {
    key: "vmjPriorVoid",
    label:
      "Have you ever had a conviction voided under this statute before? Answer yes, no or unsure. Voiding may happen only once.",
    required: true
  },
  {
    key: "vmjAgencies",
    label: "Which agencies are likely to hold records of this case?",
    required: true
  },
  {
    key: "vmjProsecutorOffice",
    label:
      "Which office prosecuted the case — the county attorney or the Commonwealth's attorney? Answer county attorney or Commonwealth's attorney. That office is the one you serve.",
    required: true
  }
];

const statuses = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/**
 * One open release blocker, declared rather than assumed.
 *
 * The design records that the fixed statements of legal effect this motion
 * makes about KRS 218A.276(9) and (10) have not been ratified by counsel.
 * Passing it here makes the runtime status say so for that reason as well as
 * for the ordinary disable switch.
 */
const KY_OPEN_RELEASE_BLOCKERS = 1;

export const KENTUCKY_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "KY",
    trackId: "ky_void_seal_marijuana_synthetic_salvia",
    publicName: "Void and seal a first Kentucky marijuana or synthetic drug possession conviction",
    mechanism: "void_and_seal_first_possession_conviction_under_krs_218a_276",
    authority: "KRS 218A.276",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    courtLevel: "the_court_of_conviction_in_the_original_criminal_case",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: packetSet("ky_void_seal_marijuana_synthetic_salvia", COMPONENT_SPECS),
    requiredInputs: VMJ_INPUTS,
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "custom_pleading",
        openReleaseBlockers: KY_OPEN_RELEASE_BLOCKERS
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "ky-void-and-seal-first-marijuana-conviction",
    assembledPacketTitle:
      "Kentucky void-and-seal packet — first marijuana, synthetic drug or salvia possession, KRS 218A.276",
    customerDeliverableDescription:
      "Motion asking the court of conviction to void a first marijuana, synthetic-drug or salvia possession conviction under KRS 218A.276(8) and to seal the records under subsection (9), made in the original criminal case, with a certificate of service on the prosecuting attorney the movant completes after service. The official order AOC-334 is tendered with the motion and is not produced here: it belongs to the official-PDF lane, and the packet says so and says where to get it. No summons issues and no filing fee is charged. Nothing in the packet asserts that the movant qualifies, and the statements of legal effect await counsel ratification.",
    notes:
      "Two of the design's three components. AOC-334 is official_pdf_fill and is named, not produced — see KY_EXCLUDED_OFFICIAL_FORM_COMPONENTS. The design declares no identity inputs, so the movant's name is a caption rule the movant completes by hand. ky_void_seal_controlled_substance is a separate blocked assignment and is not implemented, inferred or referenced as a route here. The motion is deliberately unverified and carries no notarial block, because the design says in terms that it is not verified."
  }
];
