// Connecticut process guidance — erasure, destruction and the pardon routes.
//
// Seven assigned routes. Six are implemented. The seventh,
// `ct-cleanslate-auto`, is registered as an explicit typed stop: see
// CT_BLOCKED_TRACKS.
//
// Vocabulary first, because Connecticut's own term is the thing consumer copy
// most often gets wrong:
//
//   Connecticut says ERASURE. Not expungement, and not sealing.
//
// Participant-facing copy must use the statutory term, so no artifact here
// says expungement or sealing of a Connecticut record. The verifier fails the
// build if either word appears.
//
// Three facts shape every erasure artifact in this family.
//
//   1. Erasure happens by operation of law. There is no filing, no form and no
//      fee on the automatic routes, and the state does not currently tell
//      people it has happened. Verification is therefore the participant's job
//      and every sheet says how to do it.
//
//   2. The SPBI record is conviction-only. It cannot confirm that a
//      NON-conviction was erased, so the non-conviction sheet points at the
//      Judicial Branch case look-up instead. Sending someone to the wrong
//      source to check is how a correctly erased record looks like a failure.
//
//   3. The multi-count defeat. Where a docket carries more than one count and
//      any single count is not erasable, nothing on that record is erased. The
//      design records this as the most common practical defeat in Connecticut,
//      so it is stated on the erasure sheets rather than discovered later.
//
// Numbers that the design records as unverified are not printed. The Board of
// Pardons and Paroles waiting-period figures and the claim that its
// application carries no fee are all marked unverified, so no artifact quotes
// a period or a fee for that route; each says the figure must be checked with
// the Board. The same applies to the diversionary-program list, which the
// design records as not exhaustively verified: the sheet asks which programme
// the participant was in rather than publishing a list of qualifying ones.
//
// An immigration matter is a hard stop on every route. Section 54-142a(j) is
// an access mechanism, and the design records that erasure can make a
// disposition harder to prove to federal authorities — so an immigration
// question goes to counsel before anything else happens.
//
// What these templates never do: turn guidance into a court filing, generate
// or submit a Board of Pardons and Paroles application, generate the clerk
// destruction request while its accepted destination and format are
// unconfirmed, quote an unverified period or fee, publish an unverified list of
// diversionary programmes, or say expungement or sealing.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`.
// Connecticut is not an enabled jurisdiction and this job does not enable one.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

// ---------------------------------------------------------------------------
// The typed stop
// ---------------------------------------------------------------------------

/** Raised for an assigned Connecticut route that cannot yet be built. */
export class ConnecticutTrackUnavailableError extends Error {
  constructor(
    readonly trackId: string,
    readonly reason: string,
    readonly openQuestions: readonly string[]
  ) {
    super(reason);
    this.name = "ConnecticutTrackUnavailableError";
  }
}

/**
 * `ct-cleanslate-auto` is assigned and deliberately not built.
 *
 * Two eligibility questions are open, and both decide who is told to wait and
 * who is routed to a petition. Guessing either would send people to the wrong
 * route: the statute, the Clean Slate portal and form JD-CR-202 do not agree on
 * whether the clock runs from the offence date or the conviction date, and the
 * DESPP list of erasable statute sections — which the design says should be a
 * consumed data source rather than a hand-maintained list — has not been
 * located.
 */
export const CT_BLOCKED_TRACKS: Readonly<
  Record<string, { reason: string; openQuestions: readonly string[]; unblockedBy: string }>
> = Object.freeze({
  "ct-cleanslate-auto": {
    reason:
      "ct-cleanslate-auto cannot be built: two open eligibility questions decide who is routed to a petition and who is told to wait, and neither can be answered from the committed design.",
    openQuestions: [
      "Offence date versus conviction date. The statute says the offence occurred, the Clean Slate portal says the conviction was imposed, and form JD-CR-202 says both in different places. This decides routing and needs a ruling before intake logic is written.",
      "The DESPP § 54-142t(b) list of erasable statute sections. The source was not located, and the design records that it should be a consumed data source rather than a hand-maintained list."
    ],
    unblockedBy:
      "A recorded ruling on which date starts the clock, and a located, consumable DESPP § 54-142t(b) section list."
  }
});

export const CONNECTICUT_BLOCKED_TRACK_IDS: readonly string[] = Object.freeze(Object.keys(CT_BLOCKED_TRACKS));

/** Fails closed for an assigned-but-blocked route. */
export function assertConnecticutTrackImplemented(trackId: string): void {
  const blocked = CT_BLOCKED_TRACKS[trackId];
  if (blocked) {
    throw new ConnecticutTrackUnavailableError(trackId, blocked.reason, blocked.openQuestions);
  }
}

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

export class ConnecticutGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "ConnecticutGuidanceStopError";
  }
}

export class ConnecticutRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "ConnecticutRouteMismatchError";
  }
}

export class ConnecticutBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "ConnecticutBranchError";
  }
}

export const CT_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** How a non-conviction case ended. NGRI-style findings are outside the route. */
export const CT_NONCONVICTION_OUTCOMES: Readonly<Record<string, string>> = {
  dismissed: "the charge was dismissed",
  not_guilty: "the finding was not guilty",
  not_guilty_mental_disease_or_defect: "not_guilty_mental_disease_or_defect",
  guilty_but_not_criminally_responsible: "guilty_but_not_criminally_responsible"
};

/** Whether every count on the docket is erasable. The multi-count defeat. */
export const CT_COUNT_ANSWERS: Readonly<Record<string, string>> = {
  every_count_erasable: "every_count_erasable",
  some_count_not_erasable: "some_count_not_erasable",
  unsure: "unsure"
};

/** What the participant actually wants from the two pardon routes. */
export const CT_PARDON_GOALS: Readonly<Record<string, string>> = {
  clear_the_record: "ct-absolute-pardon",
  remove_an_employment_or_licensing_barrier: "ct-provisional-pardon"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new ConnecticutBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const CT13 = "the not-erased-when-it-should-have-been route";
const COUNSEL = "a lawyer, or a Connecticut legal aid or reentry clinic";

/**
 * Validates participant answers, applies the shared Connecticut stops, and
 * routes to the correct Connecticut mechanism.
 */
export function deriveConnecticutGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  assertConnecticutTrackImplemented(trackId);
  const derived: Record<string, unknown> = { ...facts };

  // Immigration is a hard stop on every Connecticut route. § 54-142a(j) makes
  // erasure something that can make a disposition harder to prove federally.
  if (branch(trackId, "immigrationMatter", CT_YES_NO, facts.immigrationMatter).resolved) {
    throw new ConnecticutGuidanceStopError(
      trackId,
      "immigration_matter",
      "Erasure interacts badly with proving a disposition to federal authorities. Connecticut's own access provision exists for that reason, and an immigration matter goes to counsel before any record step is taken.",
      COUNSEL
    );
  }

  if (trackId === "ct-nonconviction-auto") {
    const outcome = branch(trackId, "caseOutcome", CT_NONCONVICTION_OUTCOMES, facts.caseOutcome);
    if (outcome.value === "not_guilty_mental_disease_or_defect" || outcome.value === "guilty_but_not_criminally_responsible") {
      throw new ConnecticutGuidanceStopError(
        trackId,
        "finding_outside_automatic_erasure",
        "A finding of not guilty by reason of mental disease or defect, or of guilty but not criminally responsible, is outside the automatic erasure this sheet describes.",
        COUNSEL
      );
    }
    derived.outcomeAllegation = outcome.resolved;
    if (branch(trackId, "appealOpen", CT_YES_NO, facts.appealOpen).resolved) {
      throw new ConnecticutGuidanceStopError(
        trackId,
        "appeal_open_or_window_running",
        "Erasure runs from the expiry of the time to file a writ of error or take an appeal, or from a final determination sustaining the disposition. While an appeal is open or the window is still running, the clock has not started.",
        "wait for the appeal window to close, then check again"
      );
    }
  }

  if (trackId === "ct-cannabis-auto" || trackId === "ct-nonconviction-auto" || trackId === "ct-diversion") {
    const counts = branch(trackId, "everyCountErasable", CT_COUNT_ANSWERS, facts.everyCountErasable);
    if (counts.value !== "every_count_erasable") {
      throw new ConnecticutGuidanceStopError(
        trackId,
        "multi_count_defeat",
        "Where a docket carries more than one count and any single count is not erasable, nothing on that record is erased. This is the most common practical defeat in Connecticut, and it is not something a guidance sheet can work around.",
        counts.value === "unsure" ? "the Judicial Branch case look-up, then " + COUNSEL : COUNSEL
      );
    }
  }

  if (trackId === "ct-diversion") {
    if (!branch(trackId, "endedInDismissal", CT_YES_NO, facts.endedInDismissal).resolved) {
      throw new ConnecticutGuidanceStopError(
        trackId,
        "programme_did_not_end_in_dismissal",
        "Erasure on this route follows the dismissal, not the programme. Not every diversionary programme ends in a dismissal, and where yours did not, this route has not been triggered.",
        COUNSEL
      );
    }
  }

  if (trackId === "ct-destruction-request") {
    if (!branch(trackId, "recordsAlreadyErased", CT_YES_NO, facts.recordsAlreadyErased).resolved) {
      throw new ConnecticutRouteMismatchError(
        trackId,
        "records_not_yet_erased",
        "Destruction is a step that follows erasure. Where the records have not been erased, the erasure routes come first.",
        "the erasure routes"
      );
    }
    if (!branch(trackId, "threeYearsElapsed", CT_YES_NO, facts.threeYearsElapsed).resolved) {
      throw new ConnecticutGuidanceStopError(
        trackId,
        "three_year_period_not_elapsed",
        "Destruction may not occur until three years have elapsed from the date of final disposition of the case.",
        "wait until three years have elapsed from final disposition"
      );
    }
  }

  if (trackId === "ct-absolute-pardon" || trackId === "ct-provisional-pardon") {
    const goal = branch(trackId, "pardonGoal", CT_PARDON_GOALS, facts.pardonGoal);
    if (goal.resolved !== trackId) {
      throw new ConnecticutRouteMismatchError(
        trackId,
        "pardon_goal_belongs_to_the_other_route",
        "An absolute pardon and a provisional pardon do different things. A provisional pardon relieves employment and licensing barriers and erases nothing; keeping the two apart is the most common Connecticut misunderstanding after the erasure terminology.",
        goal.resolved
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const ERASURE_NOT_EXPUNGEMENT =
  "Connecticut says erasure. It does not say expungement and it does not say sealing, so use the word erasure when you ask anyone about your record — the clerk, the State Police, or an employer's background checker.";

const MULTI_COUNT_DEFEAT =
  "If your docket has more than one count and any one of them is not erasable, nothing on that record is erased. This is the most common reason a Connecticut record that looks eligible does not clear.";

const NOT_TOLD =
  "Nobody will tell you it happened. The state does not currently notify people that their records were erased, so checking is your job.";

const CT_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot erase or destroy anything, and cannot make a court, the State Police or the Board of Pardons and Paroles act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, inspect or hold your record. You request your own copy."
];

const CT_SOURCES: readonly string[] = [
  "Conn. Gen. Stat. § 54-142a (erasure of criminal records) and § 54-142u (cannabis possession erasure).",
  "Conn. Gen. Stat. § 54-142t (Clean Slate erasure).",
  "Connecticut Judicial Branch case look-up; State Police Bureau of Identification criminal history request (DPS-0846-C).",
  "Connecticut Board of Pardons and Paroles, pardon and provisional pardon information."
];

function ctGuidance(input: {
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
    actionSequence: [ERASURE_NOT_EXPUNGEMENT, ...input.sequence],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? CT_CANNOT_PERFORM,
    escalationTriggers: [
      ...input.escalations,
      "You have an immigration matter. That goes to a lawyer before any record step."
    ],
    officialSourceReferences: CT_SOURCES
  };
}

export const CONNECTICUT_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "ct-nonconviction-auto-guidance": ctGuidance({
    templateId: "ct-nonconviction-auto-guidance",
    mechanismName: "Records erased after a dismissal or a not guilty finding",
    processType: "automatic",
    whyNotAFiling:
      "All police and court records, and the records of any state's attorney relating to the charge, are erased by operation of law. There is no petition, no form and no fee, so nothing is filed.",
    destination: {
      name: "The Superior Court and the State Police Bureau of Identification",
      detail: "Records are erased by operation of law. There is no participant filing on this route."
    },
    prerequisites: [
      "The charge ended in a dismissal or a finding of not guilty.",
      "The time to file a writ of error or take an appeal has expired, or an appeal has been finally determined in a way that sustains the disposition."
    ],
    documents: [
      "Your Connecticut Judicial Branch case look-up result for the docket.",
      "Your State Police Bureau of Identification criminal history record, if you also want to see what a conviction check shows."
    ],
    gather: [
      "How the charge ended, and the date it ended.",
      "Whether an appeal is open or the appeal window is still running.",
      "How many counts are on the docket, and whether every one of them is erasable."
    ],
    sequence: [
      "Check with the Judicial Branch case look-up, not the State Police record. The State Police record is conviction-only, so it cannot show you whether a non-conviction was erased. An erased case will not appear in the case look-up.",
      NOT_TOLD,
      MULTI_COUNT_DEFEAT,
      "Once erased, you are treated as never having been arrested for the erased proceedings, and you may say so under oath.",
      "If the record should have been erased and was not, that is a different route and it is the one to ask about."
    ],
    submissionMethod: "There is nothing to submit. Erasure follows the disposition by operation of law.",
    fees: "No court fee. This branch needs no petition at all.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve.", NOT_TOLD],
    expectedNextStage: "The docket no longer appears in the Judicial Branch case look-up.",
    canPrepare: [
      "This explanation of when erasure happens and what it means.",
      "The right place to check, which is not the State Police record.",
      "The multi-count trap, before it costs you time."
    ],
    escalations: [
      "The finding was not guilty by reason of mental disease or defect, or guilty but not criminally responsible.",
      "An appeal is pending, or the appeal window has not closed.",
      "The record should have been erased and was not."
    ]
  }),

  "ct-cannabis-auto-guidance": ctGuidance({
    templateId: "ct-cannabis-auto-guidance",
    mechanismName: "Cannabis possession records erased automatically",
    processType: "automatic",
    whyNotAFiling:
      "A qualifying cannabis possession conviction is erased if the record is electronic, and deemed erased by operation of law if it is not. There is no petition, no form and no fee, so nothing is filed.",
    destination: {
      name: "The Judicial Branch and the State Police Bureau of Identification",
      detail:
        "There is no participant filing. Records are erased if electronic, or deemed erased by operation of law if not."
    },
    prerequisites: [
      "The conviction was for possession under Conn. Gen. Stat. § 21a-279(c).",
      "It was entered on or after 1 January 2000 and before 1 October 2015."
    ],
    documents: [
      "Your Connecticut Judicial Branch case look-up result for the docket.",
      "Your State Police Bureau of Identification criminal history record."
    ],
    gather: [
      "The date the conviction was entered.",
      "The statute section you were convicted under.",
      "How many counts are on the docket, and whether every one of them is erasable."
    ],
    sequence: [
      "Check the date and the section first. The window is convictions entered on or after 1 January 2000 and before 1 October 2015, under § 21a-279(c). A conviction outside that window is a different route.",
      NOT_TOLD,
      MULTI_COUNT_DEFEAT,
      "Once erased, you may tell any entity other than a criminal justice agency that you were not arrested for or convicted of that offence.",
      "Two limits worth knowing: a criminal justice agency is not required to redact physical or scanned copies it holds internally, and Department of Motor Vehicles records are not erased by this provision."
    ],
    submissionMethod: "There is nothing to submit. Erasure happens by operation of law.",
    fees: "No fee.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve.", NOT_TOLD],
    expectedNextStage: "The conviction no longer appears when the record is checked.",
    canPrepare: [
      "This explanation of the window, and of what erasure lets you say.",
      "The two limits that surprise people: internal copies and Motor Vehicles records.",
      "The multi-count trap."
    ],
    escalations: [
      "The conviction falls outside the window, which routes to the cannabis erasure petition.",
      "Any count on the docket may not be erasable.",
      "The record should have been erased and was not."
    ]
  }),

  "ct-diversion-guidance": ctGuidance({
    templateId: "ct-diversion-guidance",
    mechanismName: "Records erased after finishing a diversionary programme",
    processType: "automatic",
    whyNotAFiling:
      "Completing a diversionary programme produces a dismissal, and the dismissal triggers erasure by operation of law. There is no petition to file for the erasure itself.",
    destination: {
      name: "The Superior Court and the State Police Bureau of Identification",
      detail: "There is no participant filing. The dismissal does the work and erasure follows it."
    },
    prerequisites: [
      "You completed a diversionary programme.",
      "The court entered a dismissal after you completed it. The dismissal is what triggers erasure, not the completion."
    ],
    documents: [
      "Your Connecticut Judicial Branch case look-up result for the docket.",
      "The court's disposition showing the dismissal, if the look-up does not make it clear."
    ],
    gather: [
      "Which diversionary programme you were in.",
      "Whether you completed it successfully.",
      "Whether the court entered a dismissal afterwards.",
      "How many counts are on the docket, and whether every one of them is erasable."
    ],
    sequence: [
      "Confirm that the court entered a dismissal. Not every diversionary programme ends in one, and erasure follows the dismissal rather than the programme.",
      "Check which programme yours was. Whether a particular programme ends in a dismissal has not been confirmed for every programme, so this sheet does not publish a list of qualifying ones — ask about yours specifically.",
      "Check the Judicial Branch case look-up. An erased case will not appear.",
      NOT_TOLD,
      MULTI_COUNT_DEFEAT
    ],
    submissionMethod: "There is nothing to submit for the erasure. Erasure follows the dismissal.",
    fees: "No court fee.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve.", NOT_TOLD],
    expectedNextStage: "The docket no longer appears in the Judicial Branch case look-up.",
    canPrepare: [
      "This explanation that the dismissal, not the programme, is what triggers erasure.",
      "The right place to check.",
      "The multi-count trap."
    ],
    escalations: [
      "The programme did not end in a dismissal.",
      "Whether your specific programme qualifies has not been confirmed.",
      "The record should have been erased and was not."
    ]
  }),

  "ct-destruction-request-guidance": ctGuidance({
    templateId: "ct-destruction-request-guidance",
    mechanismName: "Asking the clerk to destroy records that were already erased",
    processType: "court_adjacent",
    whyNotAFiling:
      "This is a request to the clerk holding the records, not a petition to a judge. No official form for it was located and the accepted destination and format have not been confirmed, so LegalEase does not generate the request itself — this page explains the route so you can make it.",
    destination: {
      name: "The Superior Court clerk holding the records",
      detail:
        "The clerk acts on the request of the accused. No official form was located, and the accepted destination and format for a written request have not been confirmed."
    },
    prerequisites: [
      "The records have already been erased. Destruction is a further step, not an alternative to erasure.",
      "Three years have elapsed from the date of final disposition of the case."
    ],
    documents: [
      "Your Connecticut Judicial Branch case look-up result, showing the case no longer appears.",
      "The date of final disposition, from the court record."
    ],
    gather: [
      "The date the case was finally disposed of.",
      "Whether the records have already been erased.",
      "Which court location holds the records."
    ],
    sequence: [
      "Understand what this adds. Erasure restricts access to the records. This request asks for their actual physical destruction, which goes further.",
      "Check the three-year rule. Destruction may not occur until three years have elapsed from the date of final disposition of the case.",
      "Confirm the records were in fact erased before asking for them to be destroyed.",
      "Ask the clerk at the court location holding the records what they require. No official form was located and the accepted destination and format have not been confirmed, so ask rather than assume — and LegalEase does not generate the request for that reason."
    ],
    submissionMethod:
      "Made to the clerk holding the records. The accepted destination and format have not been confirmed, so confirm both with the clerk.",
    fees: "The source review does not state a fee for this request. Ask the clerk.",
    feeWaiver: "Not established for this request.",
    noticeOrService: ["No notice or service rule for this request has been established."],
    expectedNextStage: "The clerk tells you what they require, and whether they will act on the request.",
    canPrepare: [
      "This explanation of what destruction adds to erasure.",
      "The three-year rule, before you ask too early.",
      "The questions to put to the clerk."
    ],
    cannotPerform: [
      ...CT_CANNOT_PERFORM,
      "LegalEase does not generate the written destruction request. Its accepted destination and format are unconfirmed."
    ],
    escalations: [
      "Fewer than three years have elapsed from final disposition.",
      "The records have not in fact been erased.",
      "The clerk requires something this page has not established."
    ]
  }),

  "ct-absolute-pardon-guidance": ctGuidance({
    templateId: "ct-absolute-pardon-guidance",
    mechanismName: "Applying for an absolute pardon",
    processType: "portal",
    whyNotAFiling:
      "An absolute pardon is applied for online through the Board of Pardons and Paroles ePardon portal. It is not a court filing, and LegalEase does not generate or submit the application: no stable participant application document has been identified that it could lawfully produce.",
    destination: {
      name: "The Connecticut Board of Pardons and Paroles, ePardon portal",
      detail:
        "An online application through the Board's portal. An intake worksheet is not the legal filing packet, and none is offered as one."
    },
    prerequisites: [
      "You have checked whether erasure already reaches the convictions. A pardon is the route for convictions erasure cannot reach, or for someone who does not want to wait out the clock.",
      "You are prepared for a discretionary, hearing-based process."
    ],
    documents: [
      "Your State Police Bureau of Identification criminal history record.",
      "The court, docket number and date for each conviction you want pardoned."
    ],
    gather: [
      "Which convictions you want pardoned, with court, docket number and date.",
      "The date the sentence was completed or the case was disposed of.",
      "Whether you have already checked what erasure reaches."
    ],
    sequence: [
      "Check erasure first. If a conviction is already erased or will erase on its own, a pardon application is effort you may not need.",
      "Apply through the Board's ePardon portal. The application is made online, directly by you.",
      "Ask the Board about waiting periods and about any fee. This page deliberately quotes neither: the figures in the internal reference are unverified, and an unverified waiting period is worse than no number at all.",
      "Expect a discretionary, hearing-based process. If the Board sets a hearing, that is a lawyer's proceeding and this page stops there."
    ],
    submissionMethod:
      "Online through the Board's ePardon portal, by you. LegalEase does not generate or submit the application.",
    fees: "Not quoted here. The no-fee claim in the internal reference is unverified — ask the Board.",
    feeWaiver: "Not established. Ask the Board.",
    noticeOrService: ["The Board's process is hearing-based. The source review does not state its notice rules."],
    expectedNextStage: "You have applied through the portal, and the Board's process takes over.",
    canPrepare: [
      "This explanation of what an absolute pardon is for, and when to check erasure first.",
      "The list of what to have ready before you open the portal."
    ],
    cannotPerform: [
      ...CT_CANNOT_PERFORM,
      "LegalEase does not generate or submit the ePardon application, and does not represent anyone at a Board hearing."
    ],
    escalations: [
      "The Board sets a hearing, which is a lawyer's proceeding.",
      "You want a waiting period or fee figure. Those are unverified and must come from the Board."
    ]
  }),

  "ct-provisional-pardon-guidance": ctGuidance({
    templateId: "ct-provisional-pardon-guidance",
    mechanismName: "Relief from employment and licensing barriers, without erasure",
    processType: "portal",
    whyNotAFiling:
      "A provisional pardon, or a certificate of employability, is applied for to the Board of Pardons and Paroles. It is not a court filing, and LegalEase does not generate or submit the application.",
    destination: {
      name: "The Connecticut Board of Pardons and Paroles",
      detail:
        "The Board grants the provisional pardon or certificate of employability. No stable participant application document has been identified that LegalEase could lawfully generate and submit."
    },
    prerequisites: [
      "What you want is relief from an employment or licensing barrier, rather than the record itself being cleared."
    ],
    documents: [
      "Your State Police Bureau of Identification criminal history record.",
      "The court, docket number and date for each conviction creating the barrier."
    ],
    gather: [
      "Whether you are trying to clear the record itself, or to remove an employment or licensing barrier.",
      "Which convictions are creating the barrier, with court, docket number and date."
    ],
    sequence: [
      "Be clear about what this does. A provisional pardon and a certificate of employability relieve employment and licensing barriers. They do not erase anything, and the record stays exactly where it is.",
      "This is the most common Connecticut mix-up after the erasure terminology. If what you want is the record cleared, this is not that route.",
      "Apply to the Board of Pardons and Paroles directly.",
      "Ask the Board about any fee. This page does not quote one, because none has been established."
    ],
    submissionMethod: "To the Board of Pardons and Paroles, by you. LegalEase does not generate or submit it.",
    fees: "Not established. Ask the Board.",
    feeWaiver: "Not established. Ask the Board.",
    noticeOrService: ["The Board's process governs. The source review does not state its notice rules."],
    expectedNextStage: "You have applied to the Board, and its process takes over.",
    canPrepare: [
      "This explanation of the difference between a provisional pardon and an absolute pardon.",
      "The list of what to have ready before you apply."
    ],
    cannotPerform: [
      ...CT_CANNOT_PERFORM,
      "LegalEase does not generate or submit the Board application, and does not represent anyone at a Board hearing."
    ],
    escalations: [
      "You want the record erased, which this does not do.",
      "The Board sets a hearing."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!CONNECTICUT_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Connecticut guidance template ${templateId} is registered.`);
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

const IMMIGRATION_INPUT: RequiredInput = {
  key: "immigrationMatter",
  label: "Do you have an immigration matter?",
  required: true
};

function connecticutTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  componentId: string;
  templateId: string;
  extraInputs: readonly RequiredInput[];
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
    jurisdiction: "CT",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "superior_court",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(input.trackId, input.componentId, input.templateId),
    requiredInputs: [IMMIGRATION_INPUT, ...input.extraInputs],
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

const COUNT_INPUT: RequiredInput = {
  key: "everyCountErasable",
  label: "How many counts are on the docket, and is every one of them erasable?",
  required: true
};

export const CONNECTICUT_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  connecticutTrack({
    trackId: "ct-nonconviction-auto",
    publicName: "Records erased after a dismissal or a not guilty finding",
    mechanism: "automatic_erasure_non_conviction",
    authority: "Conn. Gen. Stat. § 54-142a",
    recordTypes: ["police_record", "court_record", "states_attorney_record"],
    dispositions: ["dismissed", "not_guilty"],
    componentId: "ct-nonconviction-auto-process-guidance-1",
    templateId: "ct-nonconviction-auto-guidance",
    extraInputs: [
      { key: "caseOutcome", label: "How did the charge end?", required: true },
      { key: "dispositionDate", label: "On what date did the case end?", required: true },
      { key: "appealOpen", label: "Is an appeal open, or is the time to appeal still running?", required: true },
      COUNT_INPUT
    ],
    assembledPacketName: "Non-Conviction-Erasure-Verification",
    assembledPacketTitle: "Records erased after a dismissal or a not guilty finding",
    customerDeliverableDescription:
      "A guidance sheet explaining that erasure follows a dismissal or a not guilty finding by operation of law with nothing to file, where to check (the Judicial Branch case look-up, not the conviction-only State Police record), and what erasure lets the participant say.",
    notes:
      "The State Police record is conviction-only and cannot confirm a non-conviction was erased, so the sheet routes the check to the Judicial Branch look-up. A finding of not guilty by reason of mental disease or defect, or guilty but not criminally responsible, is a typed stop."
  }),

  connecticutTrack({
    trackId: "ct-cannabis-auto",
    publicName: "Cannabis possession records erased automatically",
    mechanism: "automatic_erasure_cannabis_possession",
    authority: "Conn. Gen. Stat. § 54-142u; § 21a-279(c)",
    recordTypes: ["court_record", "police_record"],
    dispositions: ["cannabis_possession_conviction_within_window"],
    componentId: "ct-cannabis-auto-process-guidance-1",
    templateId: "ct-cannabis-auto-guidance",
    extraInputs: [
      { key: "convictionDate", label: "On what date was the conviction entered?", required: true },
      { key: "statuteSection", label: "Which statute section were you convicted under?", required: true },
      COUNT_INPUT
    ],
    assembledPacketName: "Cannabis-Erasure-Verification",
    assembledPacketTitle: "Cannabis possession records erased automatically",
    customerDeliverableDescription:
      "A guidance sheet explaining the § 54-142u window, that qualifying records are erased or deemed erased with nothing to file, what the participant may then say and to whom, and the two limits on internal copies and Motor Vehicles records.",
    notes:
      "The window is convictions entered on or after 1 January 2000 and before 1 October 2015 under § 21a-279(c). A conviction outside it routes to the cannabis erasure petition. Internal criminal-justice-agency copies need not be redacted and Motor Vehicles records are not erased, and the sheet says both."
  }),

  connecticutTrack({
    trackId: "ct-diversion",
    publicName: "Records erased after finishing a diversionary program",
    mechanism: "automatic_erasure_following_diversionary_dismissal",
    authority: "Conn. Gen. Stat. § 54-142a(a)",
    recordTypes: ["court_record", "police_record"],
    dispositions: ["diversionary_programme_dismissal"],
    componentId: "ct-diversion-process-guidance-1",
    templateId: "ct-diversion-guidance",
    extraInputs: [
      { key: "programmeName", label: "Which diversionary programme were you in?", required: true },
      { key: "completedProgramme", label: "Did you complete the programme successfully?", required: true },
      { key: "endedInDismissal", label: "Did the court enter a dismissal after you completed it?", required: true },
      COUNT_INPUT
    ],
    assembledPacketName: "Diversion-Erasure-Verification",
    assembledPacketTitle: "Records erased after finishing a diversionary programme",
    customerDeliverableDescription:
      "A guidance sheet explaining that the dismissal rather than the programme triggers erasure, how to check, and why the participant should ask about their specific programme.",
    notes:
      "The design records that the diversionary programme statutes were not read and the programme list is not exhaustively verified, so the sheet publishes no list of qualifying programmes and asks about the participant's own instead. A programme that did not end in a dismissal is a typed stop."
  }),

  connecticutTrack({
    trackId: "ct-destruction-request",
    publicName: "Ask the clerk to destroy records that were already erased",
    mechanism: "clerk_physical_destruction_request",
    authority: "Conn. Gen. Stat. § 54-142a",
    recordTypes: ["court_record", "police_record"],
    dispositions: ["records_already_erased"],
    componentId: "ct-destruction-request-process-guidance-1",
    templateId: "ct-destruction-request-guidance",
    extraInputs: [
      { key: "finalDispositionDate", label: "On what date was the case finally disposed of?", required: true },
      { key: "recordsAlreadyErased", label: "Have the records already been erased?", required: true },
      { key: "threeYearsElapsed", label: "Have three years elapsed since final disposition?", required: true },
      { key: "courtLocation", label: "Which court location holds the records?", required: true }
    ],
    assembledPacketName: "Records-Destruction-Request-Explainer",
    assembledPacketTitle: "Asking the clerk to destroy records that were already erased",
    customerDeliverableDescription:
      "A guidance sheet explaining that destruction goes further than erasure, that it may not occur until three years after final disposition, and what to ask the clerk — without generating the request itself.",
    notes:
      "No official form was located and the accepted destination and format for a written request are unconfirmed, so LegalEase does not generate the request. Asking too early, or before the records were in fact erased, are both typed stops."
  }),

  connecticutTrack({
    trackId: "ct-absolute-pardon",
    publicName: "Apply for an absolute pardon",
    mechanism: "board_of_pardons_absolute_pardon",
    authority: "Connecticut Board of Pardons and Paroles",
    recordTypes: ["conviction_record"],
    dispositions: ["conviction_not_reached_by_erasure"],
    componentId: "ct-absolute-pardon-process-guidance-1",
    templateId: "ct-absolute-pardon-guidance",
    extraInputs: [
      {
        key: "pardonGoal",
        label: "Are you trying to clear the record itself, or to remove an employment or licensing barrier?",
        required: true
      },
      {
        key: "convictionsSought",
        label: "Which convictions do you want pardoned — court, docket number and date?",
        required: true
      },
      { key: "sentenceCompletionDate", label: "When was the sentence completed or the case disposed of?", required: true },
      { key: "checkedErasure", label: "Have you checked whether erasure reaches these convictions?", required: true }
    ],
    assembledPacketName: "Absolute-Pardon-Route-Explainer",
    assembledPacketTitle: "Applying for an absolute pardon",
    customerDeliverableDescription:
      "A guidance sheet explaining what an absolute pardon is for, why to check erasure first, and what to have ready before opening the Board's ePardon portal.",
    notes:
      "LegalEase does not generate or submit the ePardon application: no stable participant application document has been identified that it could lawfully produce, and an intake worksheet is not a filing packet. The waiting-period figures and the no-fee claim are unverified, so no number is quoted anywhere on the sheet."
  }),

  connecticutTrack({
    trackId: "ct-provisional-pardon",
    publicName: "Relief from employment and licensing barriers, without erasure",
    mechanism: "board_of_pardons_provisional_pardon",
    authority: "Connecticut Board of Pardons and Paroles",
    recordTypes: ["conviction_record"],
    dispositions: ["employment_or_licensing_barrier"],
    componentId: "ct-provisional-pardon-process-guidance-1",
    templateId: "ct-provisional-pardon-guidance",
    extraInputs: [
      {
        key: "pardonGoal",
        label: "Are you trying to clear the record itself, or to remove an employment or licensing barrier?",
        required: true
      },
      {
        key: "barrierConvictions",
        label: "Which convictions are creating the barrier — court, docket number and date?",
        required: true
      }
    ],
    assembledPacketName: "Provisional-Pardon-Route-Explainer",
    assembledPacketTitle: "Relief from employment and licensing barriers, without erasure",
    customerDeliverableDescription:
      "A guidance sheet explaining that a provisional pardon or certificate of employability relieves employment and licensing barriers and erases nothing, and what to have ready before applying to the Board.",
    notes:
      "Keeping this apart from an absolute pardon is recorded as the most common Connecticut misunderstanding after the erasure terminology, so a participant who says they want the record cleared is routed to the absolute-pardon sheet instead. No fee is quoted because none has been established."
  })
];
