// California process guidance — automatic relief, and the one route to actual
// destruction.
//
// Three assigned routes, all three implemented. Two are automatic and need no
// filing; the third is explained and handed to an attorney rather than built.
//
// The correction that matters most on the conviction route:
//
//   Automatic conviction relief is not a dismissal, not a sealing and not an
//   expungement. The conviction stays on the state summary criminal history and
//   a notation of relief is added to it.
//
// That notation is not cosmetic — it controls whether the record is
// disseminated on the fingerprint background checks run under Penal Code
// § 11105(k) through (p). But a participant told their record was "cleared"
// who then sees the conviction on their own record has been misled by the
// vocabulary, not by the Department of Justice. So this sheet says what the
// notation does and what it leaves in place.
//
// Three consequences of that, all of which participants get wrong:
//
//   1. No notation does not mean not eligible. The Department evaluates
//      millions of records monthly, back to 1973, and says no additional action
//      is needed to receive relief. A record checked today may be relieved next
//      month, so an absent notation is not a verdict.
//
//   2. Commercial background check companies do not access Department of
//      Justice records at all. They may hold stale data that no notation will
//      ever reach, which is why a clean state record and a bad commercial
//      report are not a contradiction.
//
//   3. Some checks still see everything. Law enforcement, the Commission on
//      Teacher Credentialing, school districts and their contractors continue
//      to see conviction history regardless of the notation.
//
// On the arrest route, automatic relief and the petition routes COEXIST.
// Section 851.93(e) says the section does not limit petitions, motions or
// orders authorized by other law, expressly naming §§ 851.87, 851.90, 851.91,
// 1000.4 and 1001.9. A participant who was told to choose has been told wrong,
// and form CR-409 carries the same point: automatic relief may already have
// been granted, and a petition may still add something.
//
// The waiting periods are stated and not applied. LegalEase does not decide
// whether a period has run — that is an eligibility determination it does not
// make — so the sheet gives the participant the three periods and the arrest
// date to measure from, and lets them work out their own.
//
// `ca-851-8` is deliberately not built as a filing. A factual innocence finding
// is the only routine California path to actual DESTRUCTION of an adult record,
// which sealing under § 851.91 is not. The standard is substantially higher and
// the petition is regularly contested, so the design has LegalEase name the
// route and hand off to an attorney. The sheet exists because form CR-409 is
// statutorily required to carry notice of that option, so participants will see
// it named whether or not anyone explains it.
//
// No fee figure is printed anywhere. The Department of Justice record request
// has a cost that the internal reference quotes but the review did not verify,
// and an unverified fee sends someone to a counter with the wrong money.
//
// What these templates never do: turn guidance into a court filing, generate a
// factual innocence petition, obtain or inspect a participant's Department of
// Justice record, decide whether a waiting period has run, quote an unverified
// fee, or call automatic conviction relief a dismissal, sealing or expungement.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. California
// is not an enabled jurisdiction and this job does not enable one.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Automatic arrest relief reaches arrests from this date forward. */
export const CA_AUTOMATIC_ARREST_FLOOR = "1973-01-01";

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not reach this participant and no other route is named. */
export class CaliforniaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "CaliforniaGuidanceStopError";
  }
}

/** The participant belongs on a different California route, which is named. */
export class CaliforniaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "CaliforniaRouteMismatchError";
  }
}

/** An answer outside the approved list, or a date that cannot be read. */
export class CaliforniaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "CaliforniaBranchError";
  }
}

export const CA_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Whether the participant is asking about a conviction or an arrest. */
export const CA_RECORD_TYPES: Readonly<Record<string, string>> = {
  conviction: "ca-auto-conviction",
  arrest: "ca-auto-arrest"
};

/**
 * What the participant actually wants.
 *
 * Three of the design's stop conditions are about the participant's goal rather
 * than their record, and none of them had an intake question. Asking the goal
 * once, from a closed list, routes all three without three separate yes/no
 * questions that invite the wrong answer.
 */
export const CA_CONVICTION_GOALS: Readonly<Record<string, string>> = {
  check_whether_relief_happened: "check_whether_relief_happened",
  dismissal_sealing_resentencing_or_reduction: "dismissal_sealing_resentencing_or_reduction",
  challenge_record_accuracy: "challenge_record_accuracy"
};

export const CA_ARREST_GOALS: Readonly<Record<string, string>> = {
  check_whether_relief_happened: "check_whether_relief_happened",
  seal_by_petition: "seal_by_petition",
  factual_innocence_finding: "factual_innocence_finding",
  challenge_record_accuracy: "challenge_record_accuracy"
};

/** How the arrest matter ended. */
export const CA_ARREST_OUTCOMES: Readonly<Record<string, string>> = {
  no_conviction: "the matter ended without a conviction",
  diversion_completed: "you successfully completed diversion",
  acquittal: "you were acquitted on all charges",
  convicted: "convicted"
};

/** The offence level, which decides which waiting period is quoted. */
export const CA_OFFENSE_LEVELS: Readonly<Record<string, string>> = {
  misdemeanor: "misdemeanor",
  felony_under_eight_years: "felony_under_eight_years",
  felony_eight_or_more_years: "felony_eight_or_more_years"
};

/** Whether the participant's own record already shows the notation. */
export const CA_NOTATION_ANSWERS: Readonly<Record<string, string>> = {
  yes: "yes",
  no: "no",
  have_not_checked: "have_not_checked"
};

const COUNSEL = "a lawyer, or a California legal aid or reentry clinic";
const DOJ = "the California Department of Justice";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new CaliforniaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Reads a calendar date or refuses it.
 *
 * Only the 1 January 1973 floor is decided here. The waiting periods are
 * printed for the participant to measure, not computed — deciding whether a
 * period has run is an eligibility determination, and this is not the thing
 * that makes one.
 */
function caDate(trackId: string, key: string, raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CaliforniaBranchError(trackId, key, value);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new CaliforniaBranchError(trackId, key, value);
  }
  return value;
}

/**
 * Validates participant answers, applies the California stops, and routes to
 * the correct California mechanism.
 */
export function deriveCaliforniaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (trackId === "ca-auto-conviction") {
    const sought = branch(trackId, "recordTypeSought", CA_RECORD_TYPES, facts.recordTypeSought);
    if (sought.resolved !== trackId) {
      throw new CaliforniaRouteMismatchError(
        trackId,
        "asking_about_an_arrest_not_a_conviction",
        "Convictions and arrests are relieved under different sections, on different conditions and different clocks. Asking about an arrest puts you on the arrest sheet.",
        "the automatic arrest relief route"
      );
    }

    const goal = branch(trackId, "goal", CA_CONVICTION_GOALS, facts.goal);
    if (goal.value === "dismissal_sealing_resentencing_or_reduction") {
      throw new CaliforniaRouteMismatchError(
        trackId,
        "goal_requires_a_petition",
        "A notation of relief is not a dismissal and does not reduce anything. Where what you want is a dismissal, a sealing, resentencing or a reduction of a felony to a misdemeanor, that is a petition to the court and a different route — and it is worth knowing that it remains available even after automatic relief was granted.",
        "the California petition routes, and " + COUNSEL
      );
    }
    if (goal.value === "challenge_record_accuracy") {
      throw new CaliforniaGuidanceStopError(
        trackId,
        "accuracy_challenge_beyond_the_claim_form",
        "Where the record itself is wrong, the claim form that ships with it is the first step and anything beyond that is a dispute rather than a record check. That needs someone acting for you.",
        COUNSEL
      );
    }

    if (branch(trackId, "prosecutorPetitionFiled", CA_YES_NO, facts.prosecutorPetitionFiled).resolved) {
      throw new CaliforniaGuidanceStopError(
        trackId,
        "prosecutor_petitioned_to_prohibit_relief",
        "A prosecuting attorney or probation department may petition to prohibit relief on a particular conviction. Where that has happened the matter is contested, and it is not something a guidance sheet can carry.",
        COUNSEL
      );
    }

    branch(trackId, "hasRequestedDojRecord", CA_YES_NO, facts.hasRequestedDojRecord);
    derived.reliefNotation = branch(
      trackId,
      "reliefNotationPresent",
      CA_NOTATION_ANSWERS,
      facts.reliefNotationPresent
    ).value;
    branch(trackId, "reductionInterest", CA_YES_NO, facts.reductionInterest);
  }

  if (trackId === "ca-auto-arrest") {
    const outcome = branch(trackId, "arrestOutcome", CA_ARREST_OUTCOMES, facts.arrestOutcome);
    if (outcome.value === "convicted") {
      throw new CaliforniaRouteMismatchError(
        trackId,
        "matter_ended_in_a_conviction",
        "Automatic arrest relief runs on arrests that did not end in a conviction, on completed diversion, or on an acquittal. A conviction is relieved under the conviction section instead.",
        "the automatic conviction relief route"
      );
    }
    derived.outcomeAllegation = outcome.resolved;

    const goal = branch(trackId, "goal", CA_ARREST_GOALS, facts.goal);
    if (goal.value === "seal_by_petition") {
      throw new CaliforniaRouteMismatchError(
        trackId,
        "wants_sealing_by_petition",
        "Petitioning to seal the arrest is a separate route that still exists — the automatic section expressly does not limit it. If that is what you want rather than checking whether relief already happened, that is where to go.",
        "the petition route to seal an arrest record"
      );
    }
    if (goal.value === "factual_innocence_finding") {
      throw new CaliforniaRouteMismatchError(
        trackId,
        "wants_a_factual_innocence_finding",
        "A finding of factual innocence is a different and much higher ask than automatic relief, and it is the only routine route to the record actually being destroyed.",
        "the factual innocence route"
      );
    }
    if (goal.value === "challenge_record_accuracy") {
      throw new CaliforniaGuidanceStopError(
        trackId,
        "accuracy_challenge_beyond_the_claim_form",
        "Where the record itself is wrong, that is a dispute with the agency holding it rather than a question about automatic relief.",
        COUNSEL
      );
    }

    const arrestDate = caDate(trackId, "arrestDate", facts.arrestDate);
    derived.arrestDate = arrestDate;
    if (arrestDate < CA_AUTOMATIC_ARREST_FLOOR) {
      throw new CaliforniaGuidanceStopError(
        trackId,
        "arrest_predates_the_automatic_scheme",
        "Automatic arrest relief reaches arrests on or after 1 January 1973. An arrest before that is outside the scheme, though the petition routes are not limited by it.",
        "the petition routes for arrest record relief, and " + COUNSEL
      );
    }
    branch(trackId, "offenseLevel", CA_OFFENSE_LEVELS, facts.offenseLevel);
    branch(trackId, "hasRequestedDojRecord", CA_YES_NO, facts.hasRequestedDojRecord);
  }

  if (trackId === "ca-851-8") {
    if (!branch(trackId, "seeksFactualInnocence", CA_YES_NO, facts.seeksFactualInnocence).resolved) {
      throw new CaliforniaRouteMismatchError(
        trackId,
        "not_seeking_a_factual_innocence_finding",
        "This route is for asking the court to find that you were factually innocent, which is a substantially higher standard than asking for the arrest to be sealed. Someone who wants the arrest sealed should go to the sealing routes, where the standard is lower and the route is not routinely contested.",
        "the arrest sealing routes"
      );
    }
    derived.arrestDate = caDate(trackId, "arrestDate", facts.arrestDate);
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NO_FEE_QUOTED =
  "No figure is quoted here for what the record request costs. The amount in the internal reference was not verified, and a wrong number sends you to a counter with the wrong money — ask the Department, and ask about the fee waiver at the same time.";

const GET_YOUR_OWN_RECORD =
  "Request your own record from the Department of Justice, through its request-your-own-record process. It is fingerprint-based through Live Scan, and a fee waiver process exists. LegalEase cannot make this request for you and never obtains, receives or inspects your record.";

const CA_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot grant relief, seal, dismiss or destroy anything, and cannot make the Department of Justice or a court act.",
  "LegalEase cannot tell you whether you qualify or whether a waiting period has run. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, receive, inspect or hold your Department of Justice record. You request your own."
];

const CA_SOURCES: readonly string[] = [
  "Cal. Penal Code § 1203.425 (automatic conviction relief), including § 1203.425(b), the prosecutor block.",
  "Cal. Penal Code § 851.93 (automatic arrest relief), including § 851.93(e), the clause preserving the petition routes.",
  "Cal. Penal Code § 851.8 (factual innocence) and § 849.5 (arrest deemed a detention).",
  "Cal. Penal Code § 11105(k) through (p) (dissemination on fingerprint background checks).",
  "Judicial Council form CR-409; California Department of Justice, request your own criminal record."
];

function caGuidance(input: {
  templateId: string;
  mechanismName: string;
  processType: GuidanceTemplate["processType"];
  whyNotAFiling: string;
  destination: { name: string; detail: string };
  prerequisites: readonly string[];
  gather: readonly string[];
  documents: readonly string[];
  sequence: readonly string[];
  submissionMethod: string;
  fees: string;
  feeWaiver: string;
  noticeOrService: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  cannotPerform?: readonly string[];
  escalations: readonly string[];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: input.processType,
    prerequisites: input.prerequisites,
    documentsToObtain: input.documents,
    participantDataToGather: input.gather,
    officialDestination: input.destination,
    actionSequence: input.sequence,
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? CA_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: CA_SOURCES
  };
}

export const CALIFORNIA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "ca-auto-conviction-guidance": caGuidance({
    templateId: "ca-auto-conviction-guidance",
    mechanismName: "Check whether your conviction was already relieved",
    processType: "automatic",
    whyNotAFiling:
      "The Department of Justice reviews the statewide criminal justice databases every month, identifies eligible records on its own initiative and adds a notation of relief. There is no petition, no form and no fee, so nothing is filed — the only thing left is finding out whether it happened to you.",
    destination: {
      name: "The California Department of Justice",
      detail:
        "The Department adds a notation of relief to the state summary criminal history and electronically notifies the superior court with jurisdiction. It does not notify you. There is no participant filing on this route."
    },
    prerequisites: [
      "Nothing. This relief is not applied for, so there is nothing to have ready before it happens.",
      "To check whether it happened, you need your own copy of your state summary criminal history."
    ],
    documents: [
      "Your California Department of Justice state summary criminal history, requested by you.",
      "The claim form for alleging that a record is inaccurate or incomplete, which ships with the record when the Department sends it."
    ],
    gather: [
      "Whether you are asking about a conviction or an arrest, because they run under different sections.",
      "Whether you have already requested your own Department of Justice record.",
      "Whether the record, if you have it, shows a notation of relief on this conviction.",
      "Whether a reduction from a felony to a misdemeanour would be worth something to you."
    ],
    sequence: [
      "Understand what the relief actually is, because the words used around it are usually wrong. This is not a dismissal, it is not a sealing and it is not an expungement. The conviction stays on your state summary criminal history and a notation of relief is added to it.",
      "That notation is not cosmetic. It controls whether the conviction is handed over on the fingerprint background checks that employers and agencies run through the Department of Justice.",
      "But some checks still see everything. Law enforcement, the Commission on Teacher Credentialing, school districts and the contractors working for them continue to see conviction history whatever the notation says.",
      GET_YOUR_OWN_RECORD,
      "If there is no notation, that is not a refusal. The Department evaluates millions of records every month, going back to 1973, and says no additional action is needed to receive relief. A record with nothing on it today may be relieved next month, so an absent notation is not a verdict on your eligibility.",
      "If a commercial background check still shows the conviction, that is a different problem and not a sign the relief failed. Commercial background check companies do not access Department of Justice records at all, and may be holding old data that no notation will ever reach.",
      "Know what a petition would add that a notation does not. Reducing a felony to a misdemeanour, or getting a dismissal, is a court petition — and it stays available to you whether or not automatic relief was granted.",
      "One date worth having right: the current text of the automatic relief statute runs from 1 October 2024. Earlier commencement dates were reported for changes that did not take effect when first announced."
    ],
    submissionMethod: "There is nothing to submit. The Department acts on its own initiative.",
    fees: `No filing fee, because there is no filing. ${NO_FEE_QUOTED}`,
    feeWaiver: "A fee waiver process exists for the record request. Ask the Department about it.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "The Department electronically notifies the superior court with jurisdiction. It does not notify you, which is why checking is your job."
    ],
    expectedNextStage:
      "Your state summary criminal history shows a notation of relief on the conviction, and background checks run through the Department stop disseminating it.",
    canPrepare: [
      "This explanation of what the notation does and what it leaves in place.",
      "The three things people get wrong: an absent notation is not ineligibility, commercial reports are a separate problem, and some checks still see everything.",
      "What a petition adds that automatic relief does not."
    ],
    escalations: [
      "A prosecuting attorney or probation department has petitioned to prohibit relief on this conviction.",
      "You want to challenge the accuracy of the record beyond sending the claim form.",
      "What you actually want is a dismissal, a sealing, resentencing or a reduction, which are petition routes."
    ]
  }),

  "ca-auto-arrest-guidance": caGuidance({
    templateId: "ca-auto-arrest-guidance",
    mechanismName: "Check whether your arrest was already sealed",
    processType: "automatic",
    whyNotAFiling:
      "Arrest relief is granted on the state record without a petition, for arrests on or after 1 January 1973 that meet the statutory conditions. There is no filing, so nothing is generated — this page explains the conditions and where to check.",
    destination: {
      name: "The California Department of Justice",
      detail:
        "Relief is applied to the state record without a participant filing. Form CR-409 carries the same point: automatic relief may already have been granted, and a petition may still carry additional benefits."
    },
    prerequisites: [
      "The arrest was on or after 1 January 1973.",
      "The matter ended without a conviction, or you completed diversion successfully, or you were acquitted on all charges."
    ],
    documents: [
      "Your California Department of Justice state summary criminal history, requested by you.",
      "Anything that fixes the date of the arrest, which is what every waiting period is measured from."
    ],
    gather: [
      "The date you were arrested.",
      "How the matter ended.",
      "Whether the arrest was for a misdemeanour or a felony, and if a felony, whether it was punishable by eight or more years.",
      "Whether you have already requested your own Department of Justice record."
    ],
    sequence: [
      "Start with the biggest misunderstanding: you do not have to choose between waiting for automatic relief and filing a petition. The statute expressly says it does not limit petitions, motions or orders for arrest record relief authorised by other law. Both exist at once, and form CR-409 says the same thing.",
      "Work out which period applies to you, and measure it yourself from the arrest date. A misdemeanour that did not end in a conviction is one year from the arrest. A felony punishable by eight or more years is six years from the arrest. Successful completion of diversion carries no additional wait.",
      "LegalEase does not work that date out for you and does not decide whether the period has run. That is an eligibility question, and this page gives you the periods rather than an answer.",
      GET_YOUR_OWN_RECORD,
      "Check the record rather than assuming either way. Nobody tells you when arrest relief is granted, so the record is the only place the answer lives.",
      "If the period has clearly passed and the record still shows the arrest unsealed, the petition routes are still open to you — that is the point of the clause that preserves them."
    ],
    submissionMethod: "There is nothing to submit. Relief is applied without a petition.",
    fees: `No filing fee, because there is no filing. ${NO_FEE_QUOTED}`,
    feeWaiver: "A fee waiver process exists for the record request. Ask the Department about it.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "The source review does not state a participant notice mechanism, and the Department does not notify you."
    ],
    expectedNextStage: "Your state summary criminal history shows the arrest sealed.",
    canPrepare: [
      "This explanation that automatic relief and the petition routes coexist rather than competing.",
      "The three waiting periods, with the date to measure each from.",
      "Where to check, given that nobody will tell you."
    ],
    escalations: [
      "You want the arrest sealed by petition rather than waiting.",
      "You want a finding of factual innocence, which is a different and higher route.",
      "You want to challenge the accuracy of the record.",
      "The matter ended in a conviction, which runs under the conviction section."
    ]
  }),

  "ca-851-8-guidance": caGuidance({
    templateId: "ca-851-8-guidance",
    mechanismName: "Asking the court to find you factually innocent and destroy the arrest record",
    processType: "court_adjacent",
    whyNotAFiling:
      "A factual innocence petition is a contested court proceeding decided on evidence, and the standard is substantially higher than asking for an arrest to be sealed. LegalEase does not generate this filing. It names the route, explains what it is for, and hands off to an attorney who does.",
    destination: {
      name: "The superior court",
      detail:
        "An attorney files the petition. LegalEase does not prepare it, does not appear, and does not obtain or assess any of the evidence."
    },
    prerequisites: [
      "What you want is a finding that you were factually innocent, not only that the arrest be sealed.",
      "You are prepared for a contested proceeding, and for the prosecutor to oppose it, which is routine on this route."
    ],
    documents: [
      "The arrest report, and anything bearing on innocence. The attorney taking the referral will tell you what the court needs.",
      "Your California Department of Justice state summary criminal history, so you know what is on the record now."
    ],
    gather: [
      "Whether you are asking for a finding of factual innocence, or only for the arrest to be sealed.",
      "The date you were arrested.",
      "The city and county where you were arrested."
    ],
    sequence: [
      "Know what makes this route different from every other one. On a finding of factual innocence, the records are sealed and then destroyed. This is the only routine California path to an adult record actually being destroyed — sealing an arrest under the ordinary sealing section is not destruction, and the two are often spoken of as though they were the same thing.",
      "Know what it costs you to ask. The standard is substantially higher than the sealing route: the question is whether no reasonable cause exists to believe you committed the offence. That is a contested evidentiary showing, and the prosecutor opposing it is the normal course rather than a surprise.",
      "This is where self-help ends. There is no starter packet to hand across, because the proceeding is an attorney matter from the outset — so LegalEase explains the route and refers you rather than generating a filing that would not help you.",
      "You will see this option named whether or not anyone explains it. Form CR-409 is required to carry notice of the other means of addressing an arrest record, including a factual innocence finding and having an arrest deemed a detention, which is why this page exists.",
      "Before you commit to it, check the easier routes first. If automatic relief already sealed the arrest, or the ordinary sealing route would give you what you actually need, this is a great deal of effort for a difference you may not require."
    ],
    submissionMethod:
      "An attorney files the petition with the superior court. LegalEase does not prepare or submit any part of it.",
    fees: "The source review does not state a filing fee for this petition, so no figure is quoted here. Ask the attorney or the court.",
    feeWaiver:
      "California has a general fee waiver application for court fees. The attorney taking the referral can tell you whether it applies.",
    noticeOrService: [
      "The source review does not state the notice or service rules for this route, so none are stated here.",
      "The petition is regularly contested, so expect the prosecutor to be heard."
    ],
    expectedNextStage:
      "An attorney has taken the matter, and the petition and any hearing are handled by them.",
    canPrepare: [
      "This explanation of what a factual innocence finding is, and that it is the only routine route to actual destruction.",
      "An honest account of the standard and of how routinely the petition is opposed.",
      "The check on whether an easier route already gave you what you need."
    ],
    cannotPerform: [
      ...CA_CANNOT_PERFORM,
      "LegalEase does not generate the factual innocence petition, does not obtain or assess evidence of innocence, and does not appear at the hearing."
    ],
    escalations: [
      "You want the arrest sealed rather than a finding of innocence, which is a lower standard and a different route.",
      "The prosecutor opposes, which is routine here.",
      "There is a contested evidentiary hearing, which is an attorney matter from the outset."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!CALIFORNIA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no California guidance template ${templateId} is registered.`);
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId,
        role: "process_guidance",
        outputStrategy: "process_guidance",
        rendererStrategy: "process_guidance",
        templateId,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide",
        requirement: "required",
        order: 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      }
    ]
  };
}

function californiaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  componentId: string;
  templateId: string;
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
    jurisdiction: "CA",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: input.courtLevel,
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(input.trackId, input.componentId, input.templateId),
    requiredInputs: input.requiredInputs,
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
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

const DOJ_RECORD_INPUT: RequiredInput = {
  key: "hasRequestedDojRecord",
  label: "Have you already requested your own California DOJ record?",
  required: true
};

export const CALIFORNIA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  californiaTrack({
    trackId: "ca-auto-conviction",
    publicName: "Check whether your conviction was already relieved",
    mechanism: "automatic_conviction_relief_by_department_of_justice_notation",
    authority: "Cal. Penal Code § 1203.425; § 1203.425(b)",
    recordTypes: ["conviction records held on the state summary criminal history"],
    dispositions: ["conviction meeting the § 1203.425(a)(1)(B) baseline and the applicable waiting period"],
    courtLevel: "not_a_court_process",
    componentId: "ca-auto-conviction-process-guidance-1",
    templateId: "ca-auto-conviction-guidance",
    requiredInputs: [
      { key: "recordTypeSought", label: "Are you asking about a conviction or an arrest?", required: true },
      {
        key: "goal",
        label:
          "What are you trying to do — check whether relief already happened, obtain a dismissal, sealing, resentencing or reduction, or challenge the accuracy of the record?",
        required: true
      },
      {
        key: "prosecutorPetitionFiled",
        label: "Has a prosecuting attorney or probation department petitioned to prohibit relief on this conviction?",
        required: true
      },
      DOJ_RECORD_INPUT,
      {
        key: "reliefNotationPresent",
        label: "If you have your record, does it show a notation of relief on this conviction?",
        required: true
      },
      {
        key: "reductionInterest",
        label: "Would a reduction of the offense from a felony to a misdemeanor be valuable to you?",
        required: true
      }
    ],
    assembledPacketName: "Automatic-Conviction-Relief-Check",
    assembledPacketTitle: "Check whether your conviction was already relieved",
    customerDeliverableDescription:
      "A guidance sheet explaining that automatic conviction relief adds a notation to the state summary criminal history rather than dismissing, sealing or expunging the conviction, what that notation controls, why an absent notation is not a finding of ineligibility, why commercial background reports are a separate problem, and which checks still see everything.",
    notes:
      "The design's first packet instruction is that this is not a dismissal, sealing or expungement: the record stays and a notation is added, which controls dissemination under § 11105(k) to (p). The second is that the absence of a notation does not mean ineligibility, since the Department evaluates millions of records monthly back to 1973. The third is that commercial background check companies do not access Department records at all, while law enforcement, the Commission on Teacher Credentialing, school districts and their contractors still see conviction history. All three are on the sheet. The record-request cost quoted in the internal reference was not verified, so no figure is printed. The prosecutor block under § 1203.425(b) and an accuracy challenge beyond the claim form are typed stops; a participant whose goal is a dismissal, sealing, resentencing or reduction is routed to the petition routes."
  }),

  californiaTrack({
    trackId: "ca-auto-arrest",
    publicName: "Check whether your arrest was already sealed",
    mechanism: "automatic_arrest_record_relief_on_the_state_record",
    authority: "Cal. Penal Code § 851.93; § 851.93(e)",
    recordTypes: ["arrest records on or after 1 January 1973 meeting the statutory conditions"],
    dispositions: ["non-conviction", "successful completion of diversion", "acquittal on all charges"],
    courtLevel: "not_a_court_process",
    componentId: "ca-auto-arrest-process-guidance-1",
    templateId: "ca-auto-arrest-guidance",
    requiredInputs: [
      { key: "arrestDate", label: "On what date were you arrested (YYYY-MM-DD)?", required: true },
      {
        key: "arrestOutcome",
        label: "How did the matter end — no conviction, diversion completed, or acquittal?",
        required: true
      },
      {
        key: "offenseLevel",
        label:
          "Was the arrest for a misdemeanor or a felony, and if a felony, was it punishable by eight or more years?",
        required: true
      },
      {
        key: "goal",
        label:
          "What are you trying to do — check whether relief already happened, seal the arrest by petition, seek a factual innocence finding, or challenge the accuracy of the record?",
        required: true
      },
      DOJ_RECORD_INPUT
    ],
    assembledPacketName: "Automatic-Arrest-Relief-Check",
    assembledPacketTitle: "Check whether your arrest was already sealed",
    customerDeliverableDescription:
      "A guidance sheet explaining that automatic arrest relief and the petition routes coexist rather than competing, stating the three waiting periods with the arrest date to measure them from, and sending the participant to their own Department of Justice record to check, since nobody is notified.",
    notes:
      "The design's packet instructions are that automatic relief and the petition routes coexist — § 851.93(e) expressly does not limit petitions under §§ 851.87, 851.90, 851.91, 1000.4 and 1001.9 — and that the waiting periods must be completed: misdemeanour non-conviction one year from arrest, felonies punishable by eight or more years six years from arrest, and successful diversion completion with no additional wait. The periods are printed for the participant to measure rather than computed, because deciding whether a period has run is an eligibility determination LegalEase does not make. Wanting a petition sealing or a factual innocence finding routes away; an accuracy challenge is a typed stop; an arrest before 1 January 1973 is outside the scheme."
  }),

  californiaTrack({
    trackId: "ca-851-8",
    publicName: "Ask the court to find you factually innocent and destroy the arrest record",
    mechanism: "factual_innocence_finding_with_sealing_and_destruction",
    authority: "Cal. Penal Code § 851.8; § 849.5",
    recordTypes: ["arrest records where the petitioner seeks a finding of factual innocence"],
    dispositions: ["arrest where no reasonable cause exists to believe the person committed the offense"],
    courtLevel: "superior_court",
    componentId: "ca-851-8-process-guidance-1",
    templateId: "ca-851-8-guidance",
    requiredInputs: [
      {
        key: "seeksFactualInnocence",
        label:
          "Are you asking the court to find that you were factually innocent, rather than only to seal the arrest?",
        required: true
      },
      { key: "arrestDate", label: "On what date were you arrested (YYYY-MM-DD)?", required: true },
      { key: "arrestCityCounty", label: "In which city and county were you arrested?", required: true }
    ],
    assembledPacketName: "Factual-Innocence-Route-Explainer",
    assembledPacketTitle: "Asking the court to find you factually innocent and destroy the arrest record",
    customerDeliverableDescription:
      "A guidance sheet explaining that a factual innocence finding seals and then destroys the arrest record, that this is the only routine California path to actual destruction and that sealing is not destruction, that the standard is substantially higher and the petition regularly contested, and that LegalEase refers the participant to an attorney rather than generating a filing.",
    notes:
      "The design has LegalEase explain the route and hand off: the factual-innocence standard requires a contested evidentiary showing and individualised advocacy, the prosecutor's opposition is routine, and the hearing is an attorney matter from the outset with no initial packet to hand off from. The sheet exists because form CR-409 is statutorily required to carry notice of these other means, including a factual innocence determination and deeming an arrest a detention, so participants see the option named regardless. A participant who wants sealing rather than a finding of innocence is routed to the sealing routes, where the standard is lower."
  })
];
