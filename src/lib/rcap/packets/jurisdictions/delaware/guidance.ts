// Delaware process guidance — Clean Slate, and the ask that has to be made at
// disposition.
//
// Two assigned routes, both implemented. Neither has a participant filing:
// one is carried out by the State Bureau of Identification on its own, and the
// other is a request made to the prosecutor rather than to a court.
//
// The fact that shapes the automatic route is not the statute, it is the
// silence:
//
//   Nothing is sent to the person when automatic expungement happens.
//
// So a participant has no way to know their record cleared except by looking,
// and no way to know it did NOT clear except by looking. Verification is the
// whole of the participant's job here, and the sheet is built around it.
//
// Two provisions make that bearable rather than bleak, and both are on the
// sheet because a participant who knows them behaves differently:
//
//   - Section 4373A(d) lets the person file for expungement of an
//     automatic-eligible record where the automatic process has not reached
//     it. A record that should have cleared and did not is not a dead end;
//     it is a filing.
//   - Section 4373A(e) gives no cause of action for damages if the Bureau
//     fails to identify a case. That is worth knowing before someone spends
//     effort pursuing the failure rather than the remedy.
//
// The prosecutor route is the one most likely to be missed, because it has a
// window rather than a queue. At the time of a state motion to dismiss or the
// entry of a nolle prosequi, where the prosecutor determines that continued
// existence and dissemination of the arrest information may cause manifest
// injustice, the prosecutor may petition to expunge the arrest record — and a
// petition filed by the Attorney General must be granted. The ask is made to
// the prosecutor, usually through defence counsel at disposition, and it is
// faster and free. It is worth surfacing to anyone whose case is still open or
// was recently dismissed, which is why a case long since closed is routed away
// rather than left to hope.
//
// One open release question is respected by omission. The design records that
// current Clean Slate throughput must be obtained from the Bureau before any
// user-facing statement about automatic relief, and the figures in the internal
// reference were not confirmed. So no sheet here quotes a number of records
// cleared or a percentage of those eligible. What the sheet says instead is the
// part that does not depend on the figure: do not assume yours has been
// reached, and check.
//
// The stop list is wider than most. Immigration, firearm, professional
// licensing, registry and law enforcement employment consequences each stop
// both routes, because expungement interacts with all five and each sends the
// question somewhere a guidance sheet cannot follow. Wanting to attack the
// underlying conviction rather than clear the record is a separate stop on both
// routes: that is post-conviction litigation, not record clearing.
//
// What these templates never do: turn guidance into a court filing, generate
// the section 4373A(d) filing or the prosecutor's petition, ask the prosecutor
// on the participant's behalf, obtain or inspect a criminal history, quote a
// fee amount or a throughput figure, or tell a participant their record cleared
// without their having looked.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Delaware
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
 * Built and put forward; counsel has not adopted it. The adoption records and
 * the review manifest are integration-owned and name no Delaware track, so
 * `DELAWARE_COUNSEL_ADOPTED` is false on this branch and the verifier proves it
 * rather than trusting it.
 */
export const DELAWARE_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const DELAWARE_COUNSEL_ADOPTED = false;

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not reach this participant and no other route is named. */
export class DelawareGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "DelawareGuidanceStopError";
  }
}

/** The participant belongs on a different Delaware route, which is named. */
export class DelawareRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "DelawareRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class DelawareBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "DelawareBranchError";
  }
}

export const DE_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * The design's consequence stop, which covers five categories on both routes.
 */
export const DE_CONSEQUENCES: Readonly<Record<string, string>> = {
  none: "none",
  immigration: "an immigration lawyer",
  firearm: "a lawyer, because firearm eligibility turns on more than the state record",
  professional_licensing: "a lawyer who handles professional licensing, and your licensing board",
  registry: "a lawyer, because registry obligations are not resolved by clearing a record",
  law_enforcement_employment: "a lawyer, because law enforcement employment screening reaches further than an ordinary check",
  more_than_one: "a lawyer, before any of the consequences is acted on"
};

/** What the participant wants from the automatic route. */
export const DE_AUTO_GOALS: Readonly<Record<string, string>> = {
  check_whether_it_happened: "check_whether_it_happened",
  attack_the_underlying_conviction: "attack_the_underlying_conviction"
};

/** What the participant wants from the prosecutor route. */
export const DE_PROSECUTOR_GOALS: Readonly<Record<string, string>> = {
  ask_the_prosecutor: "ask_the_prosecutor",
  attack_the_underlying_conviction: "attack_the_underlying_conviction"
};

/** Categories whose only route is a pardon. */
export const DE_OFFENSE_CATEGORIES: Readonly<Record<string, string>> = {
  ordinary: "ordinary",
  section_4201c_felony: "section_4201c_felony",
  beau_biden_act_offense: "beau_biden_act_offense"
};

/** Whether the record is still showing after the automatic process. */
export const DE_VISIBILITY: Readonly<Record<string, string>> = {
  no_longer_appears: "no_longer_appears",
  still_appears: "still_appears",
  have_not_checked: "have_not_checked"
};

/** Where the case is, which decides whether the prosecutor ask is still open. */
export const DE_CASE_POSTURE: Readonly<Record<string, string>> = {
  still_open: "still_open",
  recently_dismissed_or_nolle_prossed: "recently_dismissed_or_nolle_prossed",
  long_since_closed: "long_since_closed"
};

const COUNSEL = "a lawyer, or a Delaware legal aid or reentry clinic";
const POST_CONVICTION = "a lawyer who handles post-conviction matters";
const ORDINARY_ROUTES = "the ordinary Delaware mandatory and discretionary expungement routes";
const SBI = "the State Bureau of Identification";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new DelawareBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Delaware stops, and routes to the
 * correct Delaware mechanism.
 *
 * Whether the record is still showing is deliberately NOT a stop on the
 * automatic route. It is the question the sheet exists to answer, and a record
 * that did not clear is precisely who the section 4373A(d) copy is written for.
 */
export function deriveDelawareGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  const consequences = branch(trackId, "consequencesInPlay", DE_CONSEQUENCES, facts.consequencesInPlay);
  if (consequences.value !== "none") {
    throw new DelawareGuidanceStopError(
      trackId,
      "collateral_consequences_in_play",
      "Expungement interacts with immigration status, firearm eligibility, professional licensing, registry obligations and law enforcement employment screening, and in each case the consequence is decided somewhere other than the record. That goes to someone who can advise on it before any record step is taken.",
      consequences.resolved
    );
  }

  if (trackId === "de_auto_expungement") {
    const goal = branch(trackId, "goal", DE_AUTO_GOALS, facts.goal);
    if (goal.value === "attack_the_underlying_conviction") {
      throw new DelawareGuidanceStopError(
        trackId,
        "wants_to_attack_the_underlying_conviction",
        "Clearing a record and challenging the conviction behind it are different things done in different proceedings. Expungement does not disturb the conviction, and this page cannot help with an attack on it.",
        POST_CONVICTION
      );
    }

    const category = branch(trackId, "offenseCategory", DE_OFFENSE_CATEGORIES, facts.offenseCategory);
    if (category.value !== "ordinary") {
      throw new DelawareGuidanceStopError(
        trackId,
        "offense_reachable_only_by_pardon",
        "Where the record involves a felony in the excluded category, or an offence under the Beau Biden Act, expungement is not available on any route and the only way through is a pardon. That is a different process with a different destination.",
        "the Delaware pardon process, and " + COUNSEL
      );
    }

    derived.recordVisibility = branch(
      trackId,
      "recordStillAppearing",
      DE_VISIBILITY,
      facts.recordStillAppearing
    ).value;
  }

  if (trackId === "de_attorney_general_expungement") {
    const goal = branch(trackId, "goal", DE_PROSECUTOR_GOALS, facts.goal);
    if (goal.value === "attack_the_underlying_conviction") {
      throw new DelawareGuidanceStopError(
        trackId,
        "wants_to_attack_the_underlying_conviction",
        "This route clears an arrest record at the point the State drops the case. It is not a way to challenge a conviction, and where that is the aim it belongs with someone who handles those proceedings.",
        POST_CONVICTION
      );
    }

    const posture = branch(
      trackId,
      "caseStillOpenOrRecentlyDismissed",
      DE_CASE_POSTURE,
      facts.caseStillOpenOrRecentlyDismissed
    );
    if (posture.value === "long_since_closed") {
      throw new DelawareRouteMismatchError(
        trackId,
        "window_at_disposition_has_passed",
        "This ask is made at the moment the State moves to dismiss or enters a nolle prosequi. Where the case closed long ago that moment has passed, which does not end the matter — it moves it to the routes that do not depend on timing.",
        ORDINARY_ROUTES
      );
    }
    derived.casePosture = posture.value;

    if (branch(trackId, "prosecutorDeclined", DE_YES_NO, facts.prosecutorDeclined).resolved) {
      throw new DelawareGuidanceStopError(
        trackId,
        "prosecutor_declined_to_petition",
        "The decision to petition is the prosecutor's, and where it has been declined there is nothing on this route left to ask for. The ordinary routes do not depend on the prosecutor agreeing.",
        ORDINARY_ROUTES
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route. That is not a limitation you have to work around — it is how the route is built.";

const NOBODY_TELLS_YOU =
  "Nobody will tell you it happened. Nothing is sent to you when an automatic expungement goes through, so looking at your own record is the only way to know either way.";

const THROUGHPUT_NOT_STATED =
  "This page does not tell you how many records have been cleared so far, or what share of eligible records that is. Those figures were not confirmed for this review, and an out-of-date number would only encourage you to assume something about your own record. Check yours instead of estimating.";

const DE_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge anything, and cannot make the Bureau, a prosecutor or a court act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, receive, inspect or hold your criminal history. You request and read your own."
];

const DE_SOURCES: readonly string[] = [
  "11 Del. C. § 4373A (automatic expungement), added by the Clean Slate Act, including § 4373A(d) and (e).",
  "11 Del. C. § 4372(e)(2) (the Bureau's process) and § 4373 (mandatory expungement).",
  "11 Del. C. § 4374(f) and (h) (prosecutor-initiated expungement at dismissal).",
  "Delaware State Bureau of Identification, criminal history record request."
];

function deGuidance(input: {
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
    actionSequence: [NOTHING_TO_FILE, ...input.sequence],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? DE_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: DE_SOURCES
  };
}

export const DELAWARE_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "de-auto-expungement-guidance": deGuidance({
    templateId: "de-auto-expungement-guidance",
    mechanismName: "Clean Slate automatic expungement, and how to check whether it reached you",
    processType: "automatic",
    whyNotAFiling:
      "The State Bureau of Identification identifies eligible cases month by month and clears them itself. There is no petition and no form on this route — but there is a filing you can make if the automatic process has not reached your record, and this page explains both.",
    destination: {
      name: SBI,
      detail:
        "The Bureau identifies eligible cases monthly and notifies every court and law enforcement agency holding the records, each of which must confirm completion in writing. Nothing is filed by the participant, and nothing is sent to the person when it happens."
    },
    prerequisites: [
      "The case is one that would be eligible for mandatory expungement. Any case eligible for mandatory expungement is eligible for the automatic process.",
      "Nothing else. This route is not applied for."
    ],
    documents: [
      "Your own Delaware criminal history. This is the document the whole route turns on, and there is a cost for a certified copy — ask the vendor what it currently is.",
      "Your case numbers and the courts involved, so you can tell which records should have cleared."
    ],
    gather: [
      "Whether the record still appears on your Delaware criminal history.",
      "Whether the offence falls into the excluded felony category or under the Beau Biden Act.",
      "What you actually want — to check whether the record cleared, or something else."
    ],
    sequence: [
      NOBODY_TELLS_YOU,
      "Know what should be happening. The Bureau works through eligible cases monthly and tells every court and law enforcement agency holding the records, each of which has to confirm in writing that it is done. That is a lot of moving parts, and moving parts are where records get missed.",
      THROUGHPUT_NOT_STATED,
      "Get your own Delaware criminal history and look at it. There is a cost for a certified copy, so ask what it is before you order.",
      "If the record is gone, the process reached you and there is nothing further to do.",
      "If it is still there, you are not stuck. Where a record is eligible for the automatic process but the process has not reached it, the law lets you file for the expungement yourself — that filing is the answer to a record that should have cleared and did not.",
      "One thing worth knowing before you spend energy on the failure rather than the fix: the law gives no claim for damages if the Bureau fails to identify a case. Pursuing the miss will not compensate you; making the filing will clear the record."
    ],
    submissionMethod:
      "There is nothing to submit on the automatic route. The separate filing for a record the process missed is its own route with its own requirements.",
    fees: "No fee for the automatic process. Obtaining your certified criminal history has its own cost through the vendor that provides it — ask what it currently is rather than relying on a figure.",
    feeWaiver: "None established for the criminal history request.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      NOBODY_TELLS_YOU
    ],
    expectedNextStage: "The record no longer appears on your Delaware criminal history.",
    canPrepare: [
      "This explanation of a route that runs silently, and why checking is the only way to know.",
      "The filing that exists where the automatic process missed your record.",
      "An honest account of what the no-damages provision means for how to spend your effort."
    ],
    escalations: [
      "The record is in the excluded felony category or under the Beau Biden Act, where the only route is a pardon.",
      "The record should have cleared and did not.",
      "Immigration, firearm, licensing, registry or law enforcement employment consequences are in play.",
      "You want to challenge the conviction rather than clear the record."
    ]
  }),

  "de-attorney-general-expungement-guidance": deGuidance({
    templateId: "de-attorney-general-expungement-guidance",
    mechanismName: "Asking the prosecutor to clear the arrest when the State drops the case",
    processType: "prosecutor",
    whyNotAFiling:
      "On this route the prosecutor petitions, not you. The ask is made to the prosecutor — usually through defence counsel at the disposition — and LegalEase does not make it for you and does not generate the petition.",
    destination: {
      name: "The Attorney General, then the court",
      detail:
        "The prosecutor may petition to expunge the arrest record where the continued existence and dissemination of the arrest information may cause manifest injustice. A petition filed by the Attorney General must be granted."
    },
    prerequisites: [
      "Your case is still open, or it was recently dismissed or nolle prossed.",
      "You have someone who can make the ask — defence counsel at the disposition is the usual route."
    ],
    documents: [
      "Your case number, the court and the name of the prosecutor handling it.",
      "Anything showing the harm the arrest record is doing to you, since manifest injustice is the standard the prosecutor is applying."
    ],
    gather: [
      "Whether the case is still open, recently dismissed or nolle prossed, or closed long ago.",
      "Whether you have defence counsel who could raise it.",
      "Whether the prosecutor has already been asked and declined."
    ],
    sequence: [
      "Understand why this route is worth asking about before any other. It is faster than the ordinary routes and it costs you nothing, and if the Attorney General files the petition the court must grant it. That combination does not exist anywhere else in Delaware record clearing.",
      "Understand the timing, because it is the whole constraint. The prosecutor may petition at the time the State moves to dismiss or enters a nolle prosequi. That is a moment, not a queue — if your case is still open or has just ended, the moment is now or has just passed.",
      "Know what the prosecutor is deciding. The question is whether the continued existence and dissemination of the arrest information may cause manifest injustice. That is about the harm the record is doing, so anything concrete on that point is what makes the ask persuasive.",
      "Make the ask through defence counsel if you have one. This is a request to the prosecutor rather than a filing with the court, and counsel at the disposition is the ordinary way it reaches them. LegalEase does not make the request for you.",
      "If the prosecutor declines, that is the end of this route and not the end of the matter. The ordinary mandatory and discretionary routes do not depend on the prosecutor agreeing."
    ],
    submissionMethod:
      "Nothing is submitted by you. The request is made to the prosecutor, usually through defence counsel, and the prosecutor petitions.",
    fees: "No cost to you on this route.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "You serve nobody and notify nobody. The prosecutor's petition goes to the court.",
      "The source review does not state a notice requirement bearing on the participant."
    ],
    expectedNextStage:
      "The prosecutor either petitions, in which case the court must grant it, or declines, in which case the ordinary routes are next.",
    canPrepare: [
      "This explanation of a route that is faster and free, and of the window it depends on.",
      "The standard the prosecutor applies, so the ask can speak to it.",
      "The fallback if the answer is no."
    ],
    cannotPerform: [
      ...DE_CANNOT_PERFORM,
      "LegalEase does not ask the prosecutor on your behalf and does not generate the prosecutor's petition. The decision to petition is the prosecutor's alone."
    ],
    escalations: [
      "The case closed long ago, so the disposition window has passed.",
      "The prosecutor has declined to petition.",
      "Immigration, firearm, licensing, registry or law enforcement employment consequences are in play.",
      "You want to challenge a conviction rather than clear an arrest record."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!DELAWARE_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Delaware guidance template ${templateId} is registered.`);
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

function delawareTrack(input: {
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
  // Built and put forward, not adopted. `legal_review_pending` is the in-type
  // expression of `recommended_for_counsel_adoption`.
  const statuses = {
    research: "research_draft_complete",
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "legal_review_pending"
  } as const;

  return {
    jurisdiction: "DE",
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

const CONSEQUENCES_INPUT: RequiredInput = {
  key: "consequencesInPlay",
  label:
    "Are immigration, firearm, professional licensing, registry or law enforcement employment consequences in play for you?",
  required: true
};

export const DELAWARE_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  delawareTrack({
    trackId: "de_auto_expungement",
    publicName: "Automatic Expungement",
    mechanism: "clean_slate_automatic_expungement_by_the_state_bureau_of_identification",
    authority: "11 Del. C. § 4373A; § 4372(e)(2); § 4373",
    recordTypes: ["arrest", "charge", "conviction"],
    dispositions: ["any case eligible for mandatory expungement under § 4373"],
    courtLevel: "not_a_court_process",
    componentId: "de_auto_expungement-process-guidance-1",
    templateId: "de-auto-expungement-guidance",
    requiredInputs: [
      CONSEQUENCES_INPUT,
      {
        key: "goal",
        label: "What are you trying to do — check whether the record cleared, or challenge the conviction behind it?",
        required: true
      },
      {
        key: "offenseCategory",
        label:
          "Is the record an ordinary one, a felony in the excluded category, or an offence under the Beau Biden Act?",
        required: true
      },
      {
        key: "recordStillAppearing",
        label: "Does the record still appear on your Delaware criminal history?",
        required: true
      }
    ],
    assembledPacketName: "Clean-Slate-Automatic-Expungement-Check",
    assembledPacketTitle: "Clean Slate automatic expungement, and how to check whether it reached you",
    customerDeliverableDescription:
      "A guidance sheet explaining that the State Bureau of Identification clears eligible cases monthly with nothing filed and nothing sent to the person, that checking one's own Delaware criminal history is the only way to know, that a record the process missed can be filed for under § 4373A(d), and that § 4373A(e) gives no claim for damages if the Bureau misses a case.",
    notes:
      "The design records that nothing is sent to the person when automatic expungement happens, so verification is the only way to know, and that § 4373A(d) lets the person file where the automatic process has not reached the record while § 4373A(e) gives no cause of action for damages if the Bureau fails to identify a case. All three are on the sheet. A still-appearing record is deliberately not a typed stop, because it is the case the § 4373A(d) copy is written for. The design's open release question requires a current throughput figure from the Bureau before any user-facing statement about automatic relief, so no number of records or share of those eligible is printed; the sheet says to check rather than estimate. A § 4201(c) felony or Beau Biden Act offence is a typed stop to the pardon process, and the consequence stop covers immigration, firearm, licensing, registry and law enforcement employment."
  }),

  delawareTrack({
    trackId: "de_attorney_general_expungement",
    publicName: "Prosecutor-Initiated Expungement at Dismissal",
    mechanism: "prosecutor_petition_to_expunge_arrest_record_at_dismissal_or_nolle_prosequi",
    authority: "11 Del. C. § 4374(h); § 4374(f)",
    recordTypes: ["arrest"],
    dispositions: ["state motion to dismiss", "entry of a nolle prosequi"],
    courtLevel: "not_a_court_process",
    componentId: "de_attorney_general_expungement-process-guidance-1",
    templateId: "de-attorney-general-expungement-guidance",
    requiredInputs: [
      CONSEQUENCES_INPUT,
      {
        key: "goal",
        label: "What are you trying to do — ask the prosecutor to clear the arrest, or challenge a conviction?",
        required: true
      },
      {
        key: "caseStillOpenOrRecentlyDismissed",
        label: "Is your case still open, or was it recently dismissed or nolle prossed?",
        required: true
      },
      {
        key: "prosecutorDeclined",
        label: "Has the prosecutor already been asked and declined to petition?",
        required: true
      }
    ],
    assembledPacketName: "Prosecutor-Initiated-Expungement-Explainer",
    assembledPacketTitle: "Asking the prosecutor to clear the arrest when the State drops the case",
    customerDeliverableDescription:
      "A guidance sheet explaining that at a state motion to dismiss or a nolle prosequi the prosecutor may petition to expunge the arrest record where its continued existence may cause manifest injustice, that a petition filed by the Attorney General must be granted, that the ask is made to the prosecutor through defence counsel rather than filed by the participant, and that the ordinary routes remain if the prosecutor declines.",
    notes:
      "The design records this as worth surfacing at intake for anyone whose case is still open or recently dismissed, because it is faster and free, and that the ask is made to the prosecutor usually through defence counsel at disposition. The participant does not file and LegalEase does not make the request or generate the petition. A case long since closed is a typed route mismatch because the window is the disposition itself; a prosecutor who has declined is a typed stop to the ordinary routes. The consequence stop and the attack-the-conviction stop are shared with the automatic track."
  })
];
