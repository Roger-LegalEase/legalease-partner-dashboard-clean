// Louisiana process guidance — the three routes with no participant filing.
//
// Three assigned routes, all three implemented. Louisiana's ordinary clearing
// routes are motions to expunge under Articles 976, 977 and 978, and those are
// packets. These three are not: each is a route the Code of Criminal Procedure
// creates without prescribing anything for the participant to file, which is
// precisely why each is guidance rather than a filing.
//
// That distinction is load-bearing here. Article 986 carries the mandatory-form
// list for the motion set — Articles 987 through 995 and 998 — and none of
// these three routes appears on it. Article 999.1 is not on the list, and
// Article 986 assigns no motion form to Article 985.3. So no form is withheld
// from the participant by this module; the Code simply does not prescribe one.
//
// Each route carries an unresolved question that the adopted design records,
// and in every case the honest answer changes what the sheet may say.
//
//   1. Article 999 — the cumulative-or-alternative problem. Article 999(A)
//      says the person must meet "all of the following", then lists (2) that
//      the district attorney declined to prosecute all offences arising out of
//      the arrest, and (3) that a prosecution WAS instituted and was finally
//      disposed of by dismissal, quashal or acquittal. Read literally the two
//      are mutually exclusive — a declination means no prosecution was
//      instituted — and almost nobody could qualify. The Acts 2024, No. 270
//      digest repeats "all of the following", and the Article 999.1 order form
//      recites the same three conditions under "wherein all of the following
//      applies", so both the statute and the prescribed order carry the
//      cumulative formulation. Whether they are cumulative as written or
//      alternative as they must sensibly be is unresolved, and it decides
//      eligibility. So a participant who meets one but not both is given a
//      typed stop rather than an answer this module is not entitled to give.
//
//   2. Article 985.2 — the appropriation problem. The automated process is
//      effective only upon appropriation. As of the adopted review the
//      Legislature's own current publication of Article 985.2 still carries
//      the note "eff. upon appropriation of monies by the Legislature", which
//      is the note removed once the condition is satisfied, and the Bureau's
//      own expungements page describes only the ordinary court-motion process
//      and does not mention automated expungement anywhere. The design's
//      instruction is unambiguous: do not promise automatic expungement, and
//      do not tell any participant that automatic expungement will handle it.
//      The sheet therefore exists to move people OFF this route and onto the
//      ordinary motion routes, and treating it as a reason to wait is a stop.
//
//   3. Article 985.3 — the discretion and waiting-period problem. The court
//      "may order" immediate expungement, so no one is entitled to it. Whether
//      the Article displaces the Article 977 five-year and Article 978
//      ten-year waiting periods is unresolved: Article 985.1(D) disapplies
//      them in terms and Article 985.3 says nothing, and "otherwise eligible"
//      reads both ways. Whether a defendant may move for it at all, and by
//      what vehicle, is equally unresolved. So the sheet tells the participant
//      to raise it with the court and their own counsel at the completion
//      proceeding, and refuses to invent a motion.
//
// None of these three routes has a fee the participant pays, and no figure is
// printed anywhere. Article 999 is free by statute. Article 985.2 prescribes no
// fee. Whether the Article 983 schedule applies to an Article 985.3 order is
// not addressed by the text, so the sheet says that rather than guessing.
//
// What these templates never do: turn guidance into a court filing, generate a
// motion for a route the Code gives none, prepare or present the Article 999.1
// order, submit an automated-expungement request through a channel that has not
// been published, promise that the automated process will handle anything, tell
// a participant to wait for it instead of filing, or quote a fee amount.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Louisiana
// is not an enabled jurisdiction and this job does not enable one.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * The worker-branch legal-output position for this family.
 *
 * The routes are built and put forward; counsel has not adopted them. The
 * adoption records under `data/record-clearing/template-families/` and the
 * review manifest are integration-owned and name no Louisiana track, so
 * `LOUISIANA_COUNSEL_ADOPTED` is false on this branch and the verifier proves
 * it rather than trusting it.
 */
export const LOUISIANA_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const LOUISIANA_COUNSEL_ADOPTED = false;

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not reach this participant and no other route is named. */
export class LouisianaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "LouisianaGuidanceStopError";
  }
}

/** The participant belongs on a different Louisiana route, which is named. */
export class LouisianaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "LouisianaRouteMismatchError";
  }
}

/** An answer outside the approved list, or a date that cannot be read. */
export class LouisianaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "LouisianaBranchError";
  }
}

export const LA_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Age at arrest or charge. Article 999(A)(1) names seventeen exactly. */
export const LA_AGE_AT_ARREST: Readonly<Record<string, string>> = {
  seventeen: "seventeen",
  under_seventeen: "under_seventeen",
  eighteen_or_older: "eighteen_or_older"
};

/** Article 999(A)(1) reaches offences under Title 14 or Title 40. */
export const LA_OFFENSE_TITLES: Readonly<Record<string, string>> = {
  title_14: "title_14",
  title_40: "title_40",
  another_title: "another_title"
};

/** Whether the record is already eligible under Articles 976, 977 or 978. */
export const LA_UNDERLYING_ELIGIBILITY: Readonly<Record<string, string>> = {
  yes: "yes",
  no: "no",
  unsure: "unsure"
};

/** What the participant wants from the automated process. */
export const LA_985_2_GOALS: Readonly<Record<string, string>> = {
  understand_the_route: "understand_the_route",
  have_legalease_submit_a_request: "have_legalease_submit_a_request",
  wait_for_automation_instead_of_filing: "wait_for_automation_instead_of_filing"
};

/** What the participant wants from the immediate-expungement route. */
export const LA_985_3_GOALS: Readonly<Record<string, string>> = {
  understand_and_raise_it_with_the_court: "understand_and_raise_it_with_the_court",
  have_legalease_file_something: "have_legalease_file_something"
};

/** Whether the probation or programme was completed. */
export const LA_COMPLETION: Readonly<Record<string, string>> = {
  yes: "yes",
  about_to: "about_to",
  no: "no"
};

/** Whether the sentencing court is still seized of the case. */
export const LA_CASE_POSTURE: Readonly<Record<string, string>> = {
  still_before_the_court: "still_before_the_court",
  already_closed_out: "already_closed_out"
};

const COUNSEL = "a lawyer, or a Louisiana legal aid or reentry clinic";
const ORDINARY_ROUTES = "the ordinary Louisiana motion to expunge under Article 976, 977 or 978";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new LouisianaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/** Reads a calendar date or refuses it. */
function laDate(trackId: string, key: string, raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new LouisianaBranchError(trackId, key, value);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new LouisianaBranchError(trackId, key, value);
  }
  return value;
}

/**
 * Validates participant answers, applies the Louisiana stops, and routes to the
 * correct Louisiana mechanism.
 */
export function deriveLouisianaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (trackId === "la-999-expedited-expungement") {
    const age = branch(trackId, "ageAtArrest", LA_AGE_AT_ARREST, facts.ageAtArrest);
    if (age.value !== "seventeen") {
      throw new LouisianaGuidanceStopError(
        trackId,
        "age_element_not_met",
        "Article 999 reaches a person who was seventeen years of age when arrested or charged. That element is not something the route can be argued around, and where it is not met the enquiry ends here.",
        ORDINARY_ROUTES + ", and " + COUNSEL
      );
    }

    const title = branch(trackId, "offenseTitle", LA_OFFENSE_TITLES, facts.offenseTitle);
    if (title.value === "another_title") {
      throw new LouisianaGuidanceStopError(
        trackId,
        "offense_outside_title_14_or_title_40",
        "The Article reaches an offence under Title 14 or Title 40 of the Louisiana Revised Statutes. An offence under another Title is outside it.",
        ORDINARY_ROUTES + ", and " + COUNSEL
      );
    }

    if (branch(trackId, "anyConvictionFromArrest", LA_YES_NO, facts.anyConvictionFromArrest).resolved) {
      throw new LouisianaGuidanceStopError(
        trackId,
        "conviction_arising_from_the_arrest",
        "Article 999(B) provides that the Article does not apply to any misdemeanour or felony conviction arising from the incident of arrest. A conviction on the arrest takes the whole arrest out of this route.",
        ORDINARY_ROUTES + ", and " + COUNSEL
      );
    }

    // The unresolved question at the centre of this Article. (A)(2) is a
    // declination to prosecute; (A)(3) is an instituted prosecution finally
    // disposed of. Read literally they cannot both be true, yet the statute,
    // the Acts 2024 digest and the Article 999.1 order form all say "all of
    // the following". Meeting exactly one is the case the answer decides, so
    // it is refused rather than guessed.
    const declined = branch(trackId, "districtAttorneyDeclined", LA_YES_NO, facts.districtAttorneyDeclined).resolved;
    const disposed = branch(
      trackId,
      "prosecutionInstitutedAndDisposed",
      LA_YES_NO,
      facts.prosecutionInstitutedAndDisposed
    ).resolved;
    if (!declined && !disposed) {
      throw new LouisianaGuidanceStopError(
        trackId,
        "neither_article_999_a_2_nor_a_3_is_met",
        "Article 999(A) requires a declination to prosecute every offence arising out of the arrest, or a prosecution that was instituted and finally disposed of by dismissal, by a motion to quash being sustained, or by acquittal. Neither describes this arrest.",
        ORDINARY_ROUTES + ", and " + COUNSEL
      );
    }
    if (declined !== disposed) {
      throw new LouisianaGuidanceStopError(
        trackId,
        "article_999_a_2_and_a_3_cumulative_or_alternative_unresolved",
        "You meet one of the two conditions but not both, and that is the case nobody can currently answer. Article 999(A) says a person must meet all of the following and then lists conditions that, read literally, cannot both be true — a declination means no prosecution was instituted. The order form recites the same cumulative wording. Whether the two are cumulative as written or alternative as they must sensibly be decides whether you qualify, and it is unresolved, so this page will not guess at your expense.",
        "the district attorney's office in the parish of arrest, and " + COUNSEL
      );
    }

    derived.arrestDate = laDate(trackId, "arrestDate", facts.arrestDate);
  }

  if (trackId === "la-985-2-automated-expungement") {
    const goal = branch(trackId, "goal", LA_985_2_GOALS, facts.goal);
    if (goal.value === "have_legalease_submit_a_request") {
      throw new LouisianaGuidanceStopError(
        trackId,
        "no_official_request_channel_exists",
        "No official request form, portal, postal address or email channel for automated expungement has been published by the Bureau, the Supreme Court or the Clerks' Remote Access Authority. There is nothing to submit a request through, so none is submitted on anyone's behalf.",
        ORDINARY_ROUTES
      );
    }
    if (goal.value === "wait_for_automation_instead_of_filing") {
      throw new LouisianaGuidanceStopError(
        trackId,
        "do_not_delay_an_ordinary_filing",
        "Waiting for the automated process is the one thing this route can actually cost you. It is not established as operating, and time spent waiting is time not spent on a motion that works today.",
        ORDINARY_ROUTES
      );
    }

    const eligibility = branch(
      trackId,
      "underlyingEligibility",
      LA_UNDERLYING_ELIGIBILITY,
      facts.underlyingEligibility
    );
    if (eligibility.value === "no") {
      throw new LouisianaGuidanceStopError(
        trackId,
        "record_not_already_eligible",
        "The automated process reaches only records that are already eligible for expungement under Article 976, 977 or 978. It expands eligibility for nobody, so a record that is not already eligible gains nothing from it whether it operates or not.",
        COUNSEL
      );
    }
    derived.underlyingEligibility = eligibility.value;
    derived.arrestDate = laDate(trackId, "arrestDate", facts.arrestDate);
  }

  if (trackId === "la-985-3-immediate-expungement") {
    if (!branch(trackId, "courtOrderedProbationOrProgram", LA_YES_NO, facts.courtOrderedProbationOrProgram).resolved) {
      throw new LouisianaRouteMismatchError(
        trackId,
        "no_court_ordered_probation_or_program",
        "Article 985.3 runs on the successful completion of a court-ordered probation or an alternative sentencing programme. Without one there is no completion for the court to act at.",
        ORDINARY_ROUTES
      );
    }

    const goal = branch(trackId, "goal", LA_985_3_GOALS, facts.goal);
    if (goal.value === "have_legalease_file_something") {
      throw new LouisianaGuidanceStopError(
        trackId,
        "the_article_prescribes_nothing_to_file",
        "Article 985.3 says the court may order the immediate expungement. It names no motion, application, petition or request by the defendant, Article 986 assigns it no motion form, and the only instrument it names is the judge's own order form. There is nothing to file here, and inventing one would not put the question in front of the court.",
        ORDINARY_ROUTES
      );
    }

    const completion = branch(trackId, "successfulCompletion", LA_COMPLETION, facts.successfulCompletion);
    if (completion.value === "no") {
      throw new LouisianaGuidanceStopError(
        trackId,
        "probation_or_program_not_successfully_completed",
        "The Article acts on successful completion. Until the probation or programme has been completed successfully, the trigger has not happened.",
        ORDINARY_ROUTES
      );
    }

    const eligibility = branch(
      trackId,
      "otherwiseEligible",
      LA_UNDERLYING_ELIGIBILITY,
      facts.otherwiseEligible
    );
    if (eligibility.value === "no") {
      throw new LouisianaGuidanceStopError(
        trackId,
        "not_otherwise_eligible_for_an_expungement",
        "The Article reaches a person who is otherwise eligible for an expungement. Where the record falls in the sex-offence, domestic abuse battery, stalking, crime-of-violence or controlled-substance exclusions, Article 985.3 does not reach it either.",
        COUNSEL
      );
    }
    derived.otherwiseEligible = eligibility.value;

    const posture = branch(trackId, "stillBeforeTheCourt", LA_CASE_POSTURE, facts.stillBeforeTheCourt);
    if (posture.value === "already_closed_out") {
      throw new LouisianaGuidanceStopError(
        trackId,
        "case_already_closed_out",
        "The probation or programme has already been closed out and the court is no longer seized of the case, so there is no live proceeding at which the court might order an immediate expungement. That does not end the matter — it moves it to the ordinary motion route.",
        ORDINARY_ROUTES
      );
    }

    derived.completionDate = laDate(trackId, "completionDate", facts.completionDate);
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NOTHING_PRESCRIBED =
  "The Code of Criminal Procedure prescribes nothing for you to file on this route. That is why this is an explanation rather than a packet, and why nobody should be selling you a form for it.";

const ORDINARY_ROUTE_EXISTS =
  "The ordinary motion to expunge under Article 976, 977 or 978 remains available to you, and that route does produce a packet. If this one does not reach you, that is where to go rather than nowhere.";

const LA_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge anything, and cannot make a judge, a district attorney, a clerk of court or the State Police act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law says; it is not legal advice.",
  "LegalEase does not obtain, inspect or hold your record. You request your own."
];

const LA_SOURCES: readonly string[] = [
  "La. C.Cr.P. art. 999 and art. 999.1 (expedited expungement and its order form); art. 972(1).",
  "La. C.Cr.P. art. 985.2 (automated expungement); Acts 2023, No. 454.",
  "La. C.Cr.P. art. 985.3 (immediate expungement on completion); art. 992 (order form); Acts 2024, No. 560.",
  "La. C.Cr.P. arts. 976, 977 and 978 (the ordinary motions to expunge); art. 982 (service); art. 983 (fees); art. 986 (mandatory forms).",
  "Louisiana Bureau of Criminal Identification and Information, expungements information."
];

function laGuidance(input: {
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
    actionSequence: [NOTHING_PRESCRIBED, ...input.sequence, ORDINARY_ROUTE_EXISTS],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? LA_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: LA_SOURCES
  };
}

export const LOUISIANA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "la-999-expedited-expungement-guidance": laGuidance({
    templateId: "la-999-expedited-expungement-guidance",
    mechanismName: "Free expedited clearing of an arrest from when you were seventeen",
    processType: "court_adjacent",
    whyNotAFiling:
      "Article 972(1) defines an expedited expungement as an order a judge may sign without the individual filing a motion to expunge with the clerk of court. There is no motion, and no Article, form instruction or State Police material says who prepares or presents the order — so nothing is generated and this page tells you who to ask.",
    destination: {
      name: "The judge of the court with trial jurisdiction over the arrest",
      detail:
        "The order is one a judge may sign without a motion being filed with the clerk. Because no source identifies who prepares or presents it, you enquire of the district attorney's office and of the court in the parish of arrest."
    },
    prerequisites: [
      "You were seventeen years of age when you were arrested or charged.",
      "The offence was under Title 14 or Title 40 of the Louisiana Revised Statutes.",
      "No charge arising from that arrest ended in a misdemeanour or felony conviction."
    ],
    documents: [
      "Anything that fixes your date of birth against the arrest date, because the age element decides the route.",
      "The court minutes or disposition showing how each charge from the arrest ended."
    ],
    gather: [
      "How old you were on the day you were arrested or charged.",
      "The date of the arrest, and the parish.",
      "Whether the district attorney declined to prosecute every offence from that arrest.",
      "Whether a prosecution was started and then finally disposed of by dismissal, by a motion to quash being sustained, or by acquittal."
    ],
    sequence: [
      "Know the two good things about this route first. It costs you nothing — the Article says the expedited expungement is at no cost to the person, and the 2024 Act amended the fee Article to exempt you. And the order is signed without a motion being filed with the clerk of court, so there is no filing to prepare or pay for.",
      "Now the difficulty, stated plainly because it decides whether you qualify. The Article says you must meet all of three conditions, and two of them pull against each other: one is that the district attorney declined to prosecute everything from the arrest, and the other is that a prosecution was actually brought and then ended in a dismissal, a quashal or an acquittal. If the district attorney declined, no prosecution was brought — so read literally almost nobody could satisfy both.",
      "Whether those two are meant to be read together or as alternatives has not been settled, and the order form repeats the same combined wording. If you meet both, you are inside the Article on any reading. If you meet only one, that is exactly the unsettled case, and this page will not tell you that you qualify when the answer is genuinely open.",
      "Ask the district attorney's office in the parish of arrest, and the court. Because no Article and no form instruction says whether the participant, the district attorney, the clerk or the court prepares and presents the order, asking is the only reliable step — and it is a question they can answer for their own parish.",
      "If you are asked to file a motion for this, note that the Code does not prescribe one. That is worth raising politely rather than accepting, though a parish may have its own practice."
    ],
    submissionMethod:
      "Nothing is submitted by you. The order is one a judge may sign without a motion being filed with the clerk, and no source assigns its preparation to the participant.",
    fees: "No cost. The Article provides the expedited expungement is at no cost to the person, and the 2024 Act exempted it from the ordinary expungement fees.",
    feeWaiver: "Not applicable. The route is free by statute, so there is no waiver to apply for.",
    noticeOrService: [
      "You serve nobody. The clerk of court serves the order and judgment on the district attorney of the parish of conviction, the Bureau of Criminal Identification and Information, the sheriff of the parish of conviction and the arresting agency.",
      "There is no objection window on this route. The sixty-day objection period belongs to a motion to expunge, and this proceeds without one."
    ],
    expectedNextStage:
      "The district attorney's office or the court tells you how the order is presented in that parish, and whether it will be signed.",
    canPrepare: [
      "This explanation of a route that is free and needs no motion.",
      "The unsettled reading at the centre of the Article, before it costs you time.",
      "The questions to put to the district attorney's office and the court."
    ],
    cannotPerform: [
      ...LA_CANNOT_PERFORM,
      "LegalEase does not prepare or present the Article 999.1 order. No source identifies who does, and it carries the judge's signature rather than yours."
    ],
    escalations: [
      "You were not seventeen when arrested or charged.",
      "Any charge from the arrest ended in a misdemeanour or felony conviction.",
      "You meet one of the two disputed conditions but not both.",
      "The district attorney's office or the court declines to act, or asks for a filing the Code does not prescribe."
    ]
  }),

  "la-999-expedited-expungement-instructions": laGuidance({
    templateId: "la-999-expedited-expungement-instructions",
    mechanismName: "What to ask, and what to have with you — expedited expungement",
    processType: "court_adjacent",
    whyNotAFiling:
      "This is the checklist that goes with the explanation. Nothing here is filed; it is what to have to hand and what to ask, because the Code does not say who presents the order.",
    destination: {
      name: "The district attorney's office and the court in the parish of arrest",
      detail: "Both are asked, because no source says which of them initiates the order."
    },
    prerequisites: [
      "You have read the explanation sheet and you meet the age element.",
      "You know how every charge from the arrest ended."
    ],
    documents: [
      "Proof of your date of birth.",
      "The court minutes, disposition or bill of information for the arrest.",
      "Anything showing a pretrial diversion programme was completed, if that is how the charges went away."
    ],
    gather: [
      "The parish of arrest and the court with trial jurisdiction over it.",
      "The arrest date and any case or docket number.",
      "The name of the district attorney's office handling that parish."
    ],
    sequence: [
      "Ask the district attorney's office: does this office prepare the expedited expungement order, and if not, who does in this parish?",
      "Ask the court: how is an expedited expungement order presented to a judge here, given that it is signed without a motion being filed with the clerk?",
      "Ask both: what do you need from me, and is there anything I should bring or send?",
      "Write down who you spoke to and when. If you are later told something different, that record is the thing that resolves it.",
      "If either office asks you to file a motion to expunge instead, that is the ordinary route and it has its own fee and its own objection period — so ask whether they mean the ordinary route rather than the expedited one, because they are not the same thing."
    ],
    submissionMethod: "Nothing is submitted. These are questions, asked by you.",
    fees: "No cost for the expedited route. If you are directed to the ordinary motion instead, ask what that costs before agreeing to it.",
    feeWaiver: "Not applicable to the expedited route.",
    noticeOrService: ["You serve nobody on this route."],
    expectedNextStage: "You have an answer from the parish about how the order is presented there.",
    canPrepare: [
      "This list of questions and documents.",
      "The distinction between the expedited route and the ordinary motion, so a redirection is noticed rather than missed."
    ],
    escalations: [
      "The two offices give you different answers.",
      "You are directed to the ordinary motion without being told it is a different route."
    ]
  }),

  "la-985-2-automated-expungement-guidance": laGuidance({
    templateId: "la-985-2-automated-expungement-guidance",
    mechanismName: "Louisiana's automated expungement process, and why not to wait for it",
    processType: "agency",
    whyNotAFiling:
      "The Article contemplates a request submitted through the Bureau, but no official request form, portal, postal address or email channel has been published, and the Article is effective only upon an appropriation that no official source establishes was made. Nothing is generated and no request is submitted.",
    destination: {
      name: "Louisiana Bureau of Criminal Identification and Information, Louisiana State Police",
      detail:
        "The Article contemplates a request through the Bureau. No official request form, portal, mailing address or email channel has been published, and the Bureau's own expungements page describes only the ordinary court-motion process and does not mention automated expungement at all."
    },
    prerequisites: [
      "The record is already eligible for expungement under Article 976, 977 or 978. The automated process reaches only records that are already eligible and expands eligibility for nobody.",
      "Nothing else, because there is nothing here to enter."
    ],
    documents: [
      "Your own criminal history record, so you know what is actually on it.",
      "The case number and arrest date for the record you want cleared, which the ordinary motion route will need in any event."
    ],
    gather: [
      "Whether the record is already eligible under Article 976, 977 or 978.",
      "The case number.",
      "The arrest date, and the parish of arrest or conviction."
    ],
    sequence: [
      "The single most useful thing on this page: do not wait for this. The automated process is not established as operating, and time spent waiting for it is time not spent on a motion that works today.",
      "Why that is the honest position. The Article takes effect only upon an appropriation by the Legislature, and the Legislature's own current publication of the Article still carries the note saying exactly that — which is the note removed once the condition is satisfied. No official source establishes that the money was appropriated.",
      "The Bureau's own expungements page describes only the ordinary court-motion process. It does not mention automated expungement or this Article anywhere, and no request form, eligibility notice, timeline or implementation notice has been published by the Bureau, the Supreme Court or the Clerks' Remote Access Authority.",
      "Understand what it would and would not do if it did operate. It would reach records already eligible under Article 976, 977 or 978 and clear them without a court fee. It would make nobody newly eligible — if you are not already eligible, this route gains you nothing at all.",
      "So the answer for now is the ordinary motion. It costs a fee that Article 983 caps, and it works. If the automated process is later confirmed to be running, it will still only reach records that were already eligible, which is what the ordinary motion establishes anyway."
    ],
    submissionMethod:
      "Nothing is submitted. No official request channel has been published, and LegalEase does not submit a request through one that has not.",
    fees: "The Article prescribes no fee. The ordinary motion route carries a court fee that Article 983 caps; ask the clerk what it is in your parish.",
    feeWaiver: "None on this route. The ordinary motion route has its own fee provisions to ask about.",
    noticeOrService: [
      "You serve nobody and notify nobody.",
      "If the process operated, clerks would send notice of records expunged by automation to the district attorney, the sheriff and the arresting agency of the parish of conviction."
    ],
    expectedNextStage:
      "You have stopped waiting on this route and started the ordinary motion, which is the step that actually moves.",
    canPrepare: [
      "This explanation of why the route is not something to rely on yet.",
      "The plain statement that it would expand eligibility for nobody.",
      "The redirection to the route that works now."
    ],
    cannotPerform: [
      ...LA_CANNOT_PERFORM,
      "LegalEase does not submit an automated-expungement request. No official channel for one has been published, and none is used."
    ],
    escalations: [
      "You want the request submitted for you. There is no published channel to submit it through.",
      "You are planning to wait for automation rather than file.",
      "The record is not already eligible under Article 976, 977 or 978."
    ]
  }),

  "la-985-3-immediate-expungement-guidance": laGuidance({
    templateId: "la-985-3-immediate-expungement-guidance",
    mechanismName: "Immediate clearing by the court after you finish probation or a program",
    processType: "court_adjacent",
    whyNotAFiling:
      "Article 985.3 says the court may order the immediate expungement. It prescribes no motion, application, petition or request by the defendant, Article 986 assigns it no motion form, and the only instrument it names is the judge's own order form — so there is nothing for LegalEase to generate.",
    destination: {
      name: "The sentencing court that ordered the probation or alternative sentencing programme",
      detail:
        "The Article assigns the act to the court. You raise it with the court and with your own counsel at or before the completion proceeding."
    },
    prerequisites: [
      "You were placed on court-ordered probation or in an alternative sentencing programme.",
      "You have successfully completed it, or you are about to.",
      "The record is otherwise eligible for expungement under Article 976, 977 or 978.",
      "The case is still before the court, because that is where the opportunity is."
    ],
    documents: [
      "The bill of information.",
      "The sentencing minutes.",
      "Any documents or records relevant to the arrest incident and to any plea agreement.",
      "Proof that you completed the probation or programme successfully."
    ],
    gather: [
      "The date you completed the probation or programme, or when you are due to.",
      "The offence that led to it, and the statute.",
      "The parish and court where you were sentenced.",
      "Whether the case is still before the court or has already been closed out."
    ],
    sequence: [
      "Timing is the whole of this route. The court may order the immediate expungement on your successful completion, so the moment to raise it is at or before the completion or discharge proceeding — while the court still has the case. Once it is closed out there is no live proceeding at which the court might act.",
      "Say plainly what it is: discretionary. The Article says the court may order it. Nobody is entitled to it, and being told you are would be wrong.",
      "Have the documents with you, because the Article names them. The order that goes out has to include the court record with the signed order together with the bill of information, the sentencing minutes, and any documents or records relevant to the arrest incident and plea agreements, if available. Turning up with those makes it easy to say yes.",
      "Raise it with your own lawyer first if you have one, and with the court at the proceeding. This is a conversation, not a filing — the Code prescribes nothing here for you to file, and asking for the exercise of the court's discretion is what the route consists of.",
      "One open question worth knowing about, because it may decide whether you qualify at all. The ordinary routes make you wait five years or ten years depending on the Article. Whether this Article removes that wait for someone who has completed a programme is not settled: a neighbouring Article disapplies those time limits in so many words, and this one says nothing about them. Ask your lawyer and the court rather than assuming either way.",
      "Whether the ordinary expungement fee schedule applies to an order made this way is also not addressed by the Article's text, so ask the clerk rather than assuming it is free."
    ],
    submissionMethod:
      "Nothing is submitted by you. You raise the Article with the court and with counsel at or before the completion proceeding.",
    fees: "The Article prescribes no fee and no exemption, and whether the ordinary fee schedule applies to an order made under it is not addressed by its text. Ask the clerk.",
    feeWaiver: "None prescribed by the Article.",
    noticeOrService: [
      "You serve nobody. The clerk of court serves the immediate expungement on the district attorney of the parish of conviction, the Bureau of Criminal Identification and Information, the sheriff of the parish of conviction and the arresting agency.",
      "There is no objection window and no contradictory hearing prescribed, unlike the scheme that governs a motion to expunge."
    ],
    expectedNextStage:
      "The court either orders the immediate expungement at the completion proceeding, or it does not and the ordinary motion route is next.",
    canPrepare: [
      "This explanation of a route whose whole value is timing.",
      "The document list the Article names, so you have it with you when it matters.",
      "An honest account of what is discretionary and what is unsettled."
    ],
    cannotPerform: [
      ...LA_CANNOT_PERFORM,
      "LegalEase does not file anything to obtain this order. The Article prescribes no motion, application or request by the defendant."
    ],
    escalations: [
      "The case has already been closed out.",
      "The probation or programme was not completed successfully.",
      "The record is not otherwise eligible under Article 976, 977 or 978.",
      "You are told you must file a motion to obtain it."
    ]
  }),

  "la-985-3-immediate-expungement-instructions": laGuidance({
    templateId: "la-985-3-immediate-expungement-instructions",
    mechanismName: "What to bring to the completion proceeding — immediate expungement",
    processType: "court_adjacent",
    whyNotAFiling:
      "This is the checklist that goes with the explanation. Nothing here is filed; it is what to have with you and what to say, because the Article names the documents the order has to carry.",
    destination: {
      name: "The sentencing court, at the completion or discharge proceeding",
      detail: "The court acts, if it acts, while it still has the case."
    },
    prerequisites: [
      "You have read the explanation sheet.",
      "A completion or discharge proceeding is coming up, or you can ask for one to be set."
    ],
    documents: [
      "The bill of information.",
      "The sentencing minutes.",
      "Any documents or records relevant to the arrest incident.",
      "Any plea agreement documents.",
      "Written confirmation that you completed the probation or programme."
    ],
    gather: [
      "The name of the judge and the section or division of the court.",
      "Your case number and the date of the completion proceeding.",
      "The name of your lawyer, if you have one, and whether they know you want to raise this."
    ],
    sequence: [
      "Tell your lawyer before the proceeding, not at it. If you have counsel, this is the single most useful thing you can do — the request is made to the court and a lawyer who knows it is coming can make it properly.",
      "Bring the documents the Article names. The order that goes out has to include the bill of information, the sentencing minutes, and any documents or records relevant to the arrest incident and plea agreements, if available.",
      "Ask the court to consider ordering the immediate expungement on your successful completion. Use that language; it is what the Article provides for.",
      "If the court does not order it, ask what the ordinary motion route would require in that court. That is the fallback and it exists.",
      "Do not let the proceeding pass without raising it. Once the case is closed out, the court is no longer seized of it and this route closes with it."
    ],
    submissionMethod: "Nothing is submitted. This is what you bring and what you say.",
    fees: "Whether the ordinary fee schedule applies to an order made under this Article is not addressed by its text. Ask the clerk.",
    feeWaiver: "None prescribed by the Article.",
    noticeOrService: ["You serve nobody. The clerk of court serves the order if one is made."],
    expectedNextStage: "The completion proceeding happens with the request made and the documents present.",
    canPrepare: [
      "This checklist of documents the Article itself names.",
      "The words to use at the proceeding.",
      "The reminder that the opportunity closes when the case does."
    ],
    escalations: [
      "The proceeding has already happened and the case is closed.",
      "You have no lawyer and the court asks for legal argument."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

type ComponentSpec = { componentId: string; role: "process_guidance" | "instructions"; templateId: string };

function packetSet(trackId: string, components: readonly ComponentSpec[]): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: components.map((component, index) => {
      if (!LOUISIANA_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Louisiana guidance template ${component.templateId} is registered.`
        );
      }
      return {
        componentId: component.componentId,
        role: component.role,
        outputStrategy: "process_guidance" as const,
        rendererStrategy: "process_guidance" as const,
        templateId: component.templateId,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide" as const,
        requirement: "required" as const,
        order: index + 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      };
    })
  };
}

function louisianaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  components: readonly ComponentSpec[];
  requiredInputs: readonly RequiredInput[];
  assembledPacketName: string;
  assembledPacketTitle: string;
  customerDeliverableDescription: string;
  notes: string;
}): ReliefTrack {
  // Built and put forward, not adopted. `legal_review_pending` is the in-type
  // expression of `recommended_for_counsel_adoption`: the output is submitted
  // for counsel rather than approved by them. `legal_approved` would assert an
  // adoption that has not happened.
  const statuses = {
    research: "research_draft_complete",
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "legal_review_pending"
  } as const;

  return {
    jurisdiction: "LA",
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
    packetSet: packetSet(input.trackId, input.components),
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

const PARISH_INPUT: RequiredInput = {
  key: "parish",
  label: "In which parish were you arrested?",
  required: true
};

export const LOUISIANA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  louisianaTrack({
    trackId: "la-999-expedited-expungement",
    publicName: "Free expedited clearing of an arrest from when you were seventeen",
    mechanism: "expedited_expungement_order_signed_without_a_motion",
    authority: "La. C.Cr.P. art. 999; art. 999.1; art. 972(1); art. 982; art. 983(G); Acts 2024, No. 270",
    recordTypes: ["arrest", "charge"],
    dispositions: [
      "district_attorney_declined_to_prosecute",
      "pretrial_diversion_completed",
      "dismissed",
      "motion_to_quash_sustained",
      "acquitted"
    ],
    courtLevel: "court_with_trial_jurisdiction_over_the_arrest",
    components: [
      {
        componentId: "la-999-expedited-expungement-process-guidance-1",
        role: "process_guidance",
        templateId: "la-999-expedited-expungement-guidance"
      },
      {
        componentId: "la-999-expedited-expungement-instructions-2",
        role: "instructions",
        templateId: "la-999-expedited-expungement-instructions"
      }
    ],
    requiredInputs: [
      { key: "ageAtArrest", label: "How old were you on the day you were arrested or charged?", required: true },
      { key: "arrestDate", label: "On what date were you arrested or charged (YYYY-MM-DD)?", required: true },
      {
        key: "offenseTitle",
        label: "Was the offence under Title 14 or Title 40 of the Louisiana Revised Statutes?",
        required: true
      },
      {
        key: "districtAttorneyDeclined",
        label:
          "Did the district attorney decline to prosecute every offence arising out of that arrest, for any reason, including because you completed a pretrial diversion programme?",
        required: true
      },
      {
        key: "prosecutionInstitutedAndDisposed",
        label:
          "Was a prosecution started and then finally disposed of by dismissal, by a motion to quash being sustained, or by acquittal?",
        required: true
      },
      {
        key: "anyConvictionFromArrest",
        label: "Did any charge from that arrest end in a misdemeanour or felony conviction?",
        required: true
      },
      PARISH_INPUT
    ],
    assembledPacketName: "Expedited-Expungement-Route-Explainer",
    assembledPacketTitle: "Free expedited clearing of an arrest from when you were seventeen",
    customerDeliverableDescription:
      "A guidance sheet and question checklist explaining that an expedited expungement order is signed without a motion being filed with the clerk and at no cost, that the two disputed statutory conditions may be cumulative or alternative and that meeting only one is genuinely unsettled, and what to ask the district attorney's office and the court in the parish of arrest.",
    notes:
      "Article 972(1) defines the expedited expungement as an order a judge may sign without the individual filing a motion with the clerk, and Article 986's mandatory-form list does not include Article 999.1, so no participant filing exists and none is generated. The design records two open questions: whether Article 999(A)(2) and (3) are cumulative as written or alternative as they must sensibly be, which materially decides eligibility; and how the order is actually presented to a judge, which no Article, form instruction or State Police material answers. A participant meeting exactly one of the two conditions is a typed stop rather than an answer. The route is free by statute and Acts 2024, No. 270 amended Article 983(G) to exempt it."
  }),

  louisianaTrack({
    trackId: "la-985-2-automated-expungement",
    publicName: "Louisiana's automated expungement process",
    mechanism: "automated_expungement_request_through_the_bureau_pending_appropriation",
    authority: "La. C.Cr.P. art. 985.2; art. 973(E); arts. 976, 977 and 978; Acts 2023, No. 454",
    recordTypes: ["arrest", "charge", "conviction"],
    dispositions: ["records_already_eligible_under_arts_976_977_978"],
    courtLevel: "not_a_court_process",
    components: [
      {
        componentId: "la-985-2-automated-expungement-process-guidance-1",
        role: "process_guidance",
        templateId: "la-985-2-automated-expungement-guidance"
      }
    ],
    requiredInputs: [
      {
        key: "underlyingEligibility",
        label:
          "Is the record you want cleared already eligible for expungement under Article 976, 977 or 978? The automated process reaches only records that are already eligible; it does not make anyone newly eligible.",
        required: true
      },
      {
        key: "goal",
        label:
          "What are you trying to do — understand the route, have LegalEase submit an automated request, or wait for automation instead of filing?",
        required: true
      },
      { key: "caseNumber", label: "What is the case number?", required: true },
      { key: "arrestDate", label: "On what date were you arrested (YYYY-MM-DD)?", required: true },
      { key: "parish", label: "In which parish were you arrested or convicted?", required: true }
    ],
    assembledPacketName: "Automated-Expungement-Status-Explainer",
    assembledPacketTitle: "Louisiana's automated expungement process, and why not to wait for it",
    customerDeliverableDescription:
      "A guidance sheet explaining that the automated expungement process is effective only upon an appropriation that no official source establishes was made, that the Bureau's own expungements page does not mention it, that it would expand eligibility for nobody, and that the ordinary motion to expunge is the route that works now.",
    notes:
      "The design's packet instructions are explicit: do not promise automatic expungement and do not tell any participant that automatic expungement will handle it; classify this as an operational release gate rather than an unanswered question about the existence of Article 978 relief. The Legislature's current publication of Article 985.2 still carries the effective-upon-appropriation note, which is the note removed once the condition is satisfied, and the Bureau's expungements page describes only the ordinary court-motion process. Asking LegalEase to submit a request is a typed stop because no official channel has been published; treating the route as a reason to delay an ordinary filing is a typed stop because that is the only way this route can cost a participant anything."
  }),

  louisianaTrack({
    trackId: "la-985-3-immediate-expungement",
    publicName: "Immediate clearing by the court after you finish probation or a program",
    mechanism: "court_ordered_immediate_expungement_on_successful_completion",
    authority: "La. C.Cr.P. art. 985.3; art. 982; art. 992; arts. 976, 977 and 978; art. 986; Acts 2024, No. 560",
    recordTypes: ["arrest", "charge", "conviction"],
    dispositions: [
      "successful_completion_of_court_ordered_probation",
      "successful_completion_of_alternative_sentencing_program"
    ],
    courtLevel: "sentencing_court",
    components: [
      {
        componentId: "la-985-3-immediate-expungement-process-guidance-1",
        role: "process_guidance",
        templateId: "la-985-3-immediate-expungement-guidance"
      },
      {
        componentId: "la-985-3-immediate-expungement-instructions-2",
        role: "instructions",
        templateId: "la-985-3-immediate-expungement-instructions"
      }
    ],
    requiredInputs: [
      {
        key: "courtOrderedProbationOrProgram",
        label: "Were you placed on court-ordered probation or in an alternative sentencing programme?",
        required: true
      },
      {
        key: "successfulCompletion",
        label: "Have you successfully completed it, or are you about to?",
        required: true
      },
      {
        key: "completionDate",
        label: "On what date did you complete it, or when are you due to (YYYY-MM-DD)?",
        required: true
      },
      {
        key: "underlyingViolation",
        label: "What was the offence that led to the probation or programme, and under what statute?",
        required: true
      },
      {
        key: "otherwiseEligible",
        label:
          "Is that record otherwise eligible for expungement under Article 976, 977 or 978 — that is, is it outside the sex-offence, domestic abuse battery, stalking, crime-of-violence and controlled-substance exclusions?",
        required: true
      },
      {
        key: "goal",
        label:
          "What are you trying to do — understand the route and raise it with the court, or have LegalEase file something?",
        required: true
      },
      { key: "parish", label: "In which parish and court were you sentenced?", required: true },
      {
        key: "stillBeforeTheCourt",
        label: "Is the case still before the court, or has the probation or programme already been closed out?",
        required: true
      }
    ],
    assembledPacketName: "Immediate-Expungement-On-Completion-Explainer",
    assembledPacketTitle: "Immediate clearing by the court after you finish probation or a program",
    customerDeliverableDescription:
      "A guidance sheet and completion-proceeding checklist explaining that the court may order an immediate expungement on successful completion of court-ordered probation or an alternative sentencing programme, that the relief is discretionary and nobody is entitled to it, which documents the Article requires the served record to include, and that the opportunity closes when the case is closed out.",
    notes:
      "The design records the relief as discretionary — Article 985.3(A) says the court 'may order' — and instructs that the participant be told plainly that no one is entitled to it and that the ordinary Article 977 or 978 motion track remains available. It also instructs that the participant be told to have the bill of information, the sentencing minutes and any documents relevant to the arrest incident and plea agreements to hand, because Article 985.3(C) requires the served record to include them. Three open questions are disclosed rather than resolved: whether a defendant may move for the relief and by what vehicle, whether the Article displaces the Article 977 five-year and Article 978 ten-year waiting periods, and whether the Article 983 fee schedule applies. Asking LegalEase to file something is a typed stop, because the Article prescribes nothing to file and Article 986 assigns it no motion form."
  })
];
