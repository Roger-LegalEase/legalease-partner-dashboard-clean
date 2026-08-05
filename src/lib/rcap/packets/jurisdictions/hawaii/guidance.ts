// Hawaii process guidance — the state-initiated marijuana expungement pilot.
//
// One assigned route. The state initiates the pilot; the adopted design records
// that no participant filing was identified for it, so there is nothing here
// for LegalEase to generate.
//
// The design gives this sheet one instruction above all others, and the whole
// page is built around obeying it:
//
//   Do not tell any user their record will be cleared automatically.
//
// That is not pedantry. A pilot is a programme with a scope and a capacity, and
// the design records this one as originally limited to Hawaii County records.
// A participant told their conviction "will be cleared" may stop looking for
// the route that would actually have worked for them. So this sheet explains
// what the pilot is, says plainly that being within its subject matter is not
// the same as the pilot having reached a particular case, tells the participant
// how to find out, and names the petition route that does not depend on the
// pilot at all.
//
// Four things it therefore refuses to say: that the pilot has processed the
// participant's case, that it will; any completion date or volume; and anything
// implying that falling within the pilot's scope means relief has occurred.
//
// The petition fallback is not suppressed. Where a participant needs relief the
// pilot does not reach — a county outside its scope, a conviction outside its
// subject matter, or simply a record that is still showing — the Hawaii
// expungement petition route exists and is named. Sending someone away with
// "wait and see" when a filing route is open to them is the failure this sheet
// is written against.
//
// What this template never does: turn guidance into a court filing, generate a
// participant filing for a state-initiated programme, promise the pilot has
// acted or will act, state a completion date or a number of records processed,
// or hide the petition route behind the pilot.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Hawaii is
// not an enabled jurisdiction and this job does not enable one.

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
 * the packet proof are integration-owned and name no Hawaii track, so
 * `HAWAII_COUNSEL_ADOPTED` is false on this branch and the verifier proves it.
 */
export const HAWAII_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const HAWAII_COUNSEL_ADOPTED = false;

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not answer this participant; a destination is named. */
export class HawaiiGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "HawaiiGuidanceStopError";
  }
}

/** The participant belongs on a different Hawaii route, which is named. */
export class HawaiiRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "HawaiiRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class HawaiiBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "HawaiiBranchError";
  }
}

export const HI_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * The county the conviction is in.
 *
 * The design records the pilot as originally limited to Hawaii County records,
 * so the county is the fact that decides whether the pilot is even the right
 * thing to be waiting on.
 */
export const HI_COUNTIES: Readonly<Record<string, string>> = {
  hawaii_county: "hawaii_county",
  honolulu_county: "honolulu_county",
  maui_county: "maui_county",
  kauai_county: "kauai_county",
  unsure: "unsure"
};

/** Whether the record is still showing, and whether it has been checked. */
export const HI_VISIBILITY: Readonly<Record<string, string>> = {
  no_longer_appears: "no_longer_appears",
  still_appears: "still_appears",
  have_not_checked: "have_not_checked"
};

/** What the participant needs from this route. */
export const HI_GOALS: Readonly<Record<string, string>> = {
  understand_the_pilot_and_check: "understand_the_pilot_and_check",
  needs_relief_the_pilot_does_not_reach: "needs_relief_the_pilot_does_not_reach"
};

const HI_PETITION_ROUTE =
  "the Hawaii expungement petition route, which is a participant filing that does not depend on the pilot reaching your case";
const HI_HELP =
  "a Hawaii legal aid organisation or a public defender expungement clinic";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new HawaiiBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Hawaii stops, and routes to the
 * correct Hawaii mechanism.
 *
 * A record that still appears is deliberately not a stop. Because nobody is
 * told when or whether the pilot reaches a case, a still-visible record is the
 * ordinary state of affairs for someone reading this page — and the answer is
 * to check and to know the petition route exists, not to be turned away.
 */
export function deriveHawaiiGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (branch(trackId, "immigrationMatter", HI_YES_NO, facts.immigrationMatter).resolved) {
    throw new HawaiiGuidanceStopError(
      trackId,
      "immigration_matter_in_play",
      "How a record is treated for immigration is decided under federal law and does not follow from a state programme clearing it. The order in which a record step and an immigration matter are handled can matter more than the clearing itself.",
      `an immigration lawyer before any record step is taken, and only then ${HI_HELP}`
    );
  }

  const goal = branch(trackId, "goal", HI_GOALS, facts.goal);
  if (goal.value === "needs_relief_the_pilot_does_not_reach") {
    throw new HawaiiRouteMismatchError(
      trackId,
      "needs_relief_outside_the_pilot",
      "The pilot covers a defined set of marijuana convictions and is a programme the state runs on its own timetable. Where what you need sits outside it, waiting on the pilot cannot deliver it — and there is a route that does not depend on the pilot at all.",
      `${HI_PETITION_ROUTE}; to work out whether your conviction qualifies for it, ${HI_HELP}`
    );
  }

  const county = branch(trackId, "countyOfConviction", HI_COUNTIES, facts.countyOfConviction);
  if (county.value !== "hawaii_county" && county.value !== "unsure") {
    throw new HawaiiRouteMismatchError(
      trackId,
      "conviction_outside_the_pilot_county_scope",
      "The pilot was set up around Hawaii County records. A conviction from another county may well be outside what it reaches, and waiting on a programme that was not built for your county is time you may not get back.",
      `${HI_PETITION_ROUTE}; and confirm the pilot's current scope with ${HI_HELP} before deciding to wait on it`
    );
  }
  derived.countyOfConviction = county.value;

  derived.recordVisibility = branch(
    trackId,
    "recordStillVisible",
    HI_VISIBILITY,
    facts.recordStillVisible
  ).value;

  return derived;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route and nothing to pay. The state initiates the pilot, and the adopted review identified no participant filing for it.";

const NO_PROMISE =
  "This page will not tell you that your record will be cleared automatically, because nobody can honestly tell you that. A pilot is a programme with a scope and a workload, not a guarantee attached to your case. Being the kind of conviction the pilot is aimed at is not the same as the pilot having reached yours.";

const NO_DATE_OR_VOLUME =
  "You will not find a date here, or a number of records processed. Neither is established, and an invented one would only encourage you to wait rather than act.";

const HOW_TO_CHECK =
  "Check your own record rather than inferring anything from the programme's existence. Look at your Hawaii criminal history record and at the court record for the case. LegalEase does not obtain, receive or inspect either — you check your own.";

const PETITION_EXISTS =
  "Know that a petition route exists and does not depend on the pilot. If the pilot never reaches your case, or reaches it later than you can afford to wait, filing is a route you can take yourself. Nobody should be told to wait for a programme when a filing route is open to them.";

const HI_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge anything, cannot enrol you in the pilot and cannot make the state act on your record.",
  "LegalEase cannot tell you whether the pilot has reached or will reach your case, and never asserts an outcome for a particular record.",
  "LegalEase does not obtain, receive, inspect or hold your criminal history or court record. You check your own.",
  "LegalEase does not file the petition route named here; that is a separate route with its own requirements."
];

const HI_SOURCES: readonly string[] = [
  "Act 62, Session Laws of Hawaii 2024, as amended in 2025 (the state-initiated marijuana expungement pilot).",
  "Hawaii criminal history record request, for checking what the state holds.",
  "The court record for the case, for checking what the court shows.",
  "The Hawaii expungement petition route, for relief the pilot does not reach."
];

export const HAWAII_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "hi-state-initiated-marijuana-pilot-guidance": {
    templateId: "hi-state-initiated-marijuana-pilot-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "The state-initiated marijuana expungement pilot, and what it does not promise you",
    whyNotAFiling:
      "The state initiates this pilot and the adopted review identified no participant filing for it. There is nothing to submit and nothing to pay — this page explains what the programme is, how to check whether anything happened to your own record, and the filing route that does not depend on it.",
    processType: "automatic",
    prerequisites: [
      "The conviction is a marijuana conviction of the kind the pilot is aimed at.",
      "Nothing else. You do not apply to the pilot and you cannot enrol in it."
    ],
    documentsToObtain: [
      "Your Hawaii criminal history record.",
      "The court record for the case, including the county and case number."
    ],
    participantDataToGather: [
      "The county the conviction was in.",
      "Whether the record still appears on a background check.",
      "Whether what you need is something the pilot could reach at all."
    ],
    officialDestination: {
      name: "The State of Hawaii, under the pilot",
      detail:
        "The state initiates the pilot. No participant filing was identified, so nothing is submitted by you and no office receives anything from you."
    },
    actionSequence: [
      NOTHING_TO_FILE,
      NO_PROMISE,
      "Know the scope, because it decides whether waiting makes any sense. The pilot was set up around Hawaii County records. A conviction from another county may be outside what it reaches, and that is worth establishing before you decide to wait on it.",
      NO_DATE_OR_VOLUME,
      HOW_TO_CHECK,
      "If the record no longer appears, something has happened and you can stop watching it. If it still appears, that tells you the pilot has not reached your case — not that it never will, and not that you have no other option.",
      PETITION_EXISTS,
      "So the honest summary is this: the pilot may help you and costs you nothing to wait for, but it is not a plan you can rely on for a deadline. If you have a job, a licence or a housing application riding on this, treat the petition route as the real one."
    ],
    submissionMethod:
      "There is nothing to submit. The state initiates the pilot and no participant filing was identified.",
    fees: "No fee. There is nothing to file on this route.",
    feeWaiver: "Not applicable. There is no fee to waive on this route.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "Nobody is required to tell you whether the pilot has reached your case, which is why checking your own record is the only way to know."
    ],
    expectedNextStage:
      "You know what your own record currently shows, and you know whether to wait on the pilot or to take the petition route.",
    legalEaseCanPrepare: [
      "This explanation of what the pilot is and what it does not promise.",
      "The county-scope point, before you spend time waiting on a programme not built for your county.",
      "The petition route that does not depend on the pilot at all."
    ],
    legalEaseCannotPerform: HI_CANNOT_PERFORM,
    escalationTriggers: [
      "Any immigration matter.",
      "You need relief the pilot does not reach.",
      "The conviction is from a county outside the pilot's scope.",
      "You have a deadline and cannot afford to wait on a programme with no published timetable."
    ],
    officialSourceReferences: HI_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!HAWAII_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Hawaii guidance template ${templateId} is registered.`);
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

const HAWAII_STATUSES = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  // Built and put forward, not adopted. `legal_review_pending` is the in-type
  // expression of `recommended_for_counsel_adoption`.
  legal: "legal_review_pending"
} as const;

const HAWAII_REQUIRED_INPUTS: readonly RequiredInput[] = [
  { key: "immigrationMatter", label: "Is there any immigration matter in play for you?", required: true },
  { key: "countyOfConviction", label: "In which county was the conviction?", required: true },
  {
    key: "goal",
    label:
      "What are you trying to do — understand the pilot and check your record, or get relief the pilot does not reach?",
    required: true
  },
  { key: "recordStillVisible", label: "Does the record still appear on a background check?", required: true }
];

export const HAWAII_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "HI",
    trackId: "hi_state_initiated_marijuana_pilot",
    publicName: "State-initiated marijuana expungement pilot",
    mechanism: "state_initiated_marijuana_expungement_pilot_no_participant_filing",
    authority: "Act 62, Session Laws of Hawaii 2024, as amended in 2025",
    recordTypes: ["conviction"],
    dispositions: ["marijuana convictions within the pilot's scope"],
    courtLevel: "not_a_court_process",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(
      "hi_state_initiated_marijuana_pilot",
      "hi_state_initiated_marijuana_pilot-process-guidance-1",
      "hi-state-initiated-marijuana-pilot-guidance"
    ),
    requiredInputs: HAWAII_REQUIRED_INPUTS,
    statuses: {
      ...HAWAII_STATUSES,
      runtime: computeRuntimeStatus({
        statuses: HAWAII_STATUSES,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "Marijuana-Expungement-Pilot-Explainer",
    assembledPacketTitle: "The state-initiated marijuana expungement pilot, and what it does not promise you",
    customerDeliverableDescription:
      "A guidance sheet explaining that the state initiates the marijuana expungement pilot with no participant filing, that being within the pilot's subject matter is not the same as the pilot having reached a particular case, that the pilot was set up around Hawaii County records, how to check one's own criminal history and court record, and that a petition route exists which does not depend on the pilot.",
    notes:
      "The design's packet instruction is absolute: do not tell any user their record will be cleared automatically. The sheet therefore promises nothing about the participant's own case, states no completion date and no volume of records processed, and says explicitly that falling within the pilot's scope is not the same as relief having occurred. The design records the pilot as state-initiated with no participant filing identified and as originally limited to Hawaii County records, so a conviction from another county is a typed route mismatch to the petition route rather than an invitation to wait. The petition fallback is named rather than suppressed, because the design's second stop condition routes a participant needing relief the pilot does not reach to a filing track. A still-visible record is deliberately not a stop: nobody is told when or whether the pilot reaches a case, so a record that still appears is the ordinary state of affairs for a reader of this sheet."
  }
];
