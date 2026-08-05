// Massachusetts process guidance — records that seal on their own, and the
// filing nobody should make.
//
// One assigned route. The Commissioner of Probation shall seal the record of a
// not guilty finding, a no bill returned by the grand jury, or a finding of no
// probable cause. The sealing is mandatory and immediate; the Supreme Judicial
// Court confirmed it. Nothing is filed by the participant and this packet is
// verification and correction guidance rather than a filing.
//
// The most expensive mistake in Massachusetts record clearing is filing for
// relief you already have. A court petition to seal a dismissed case exists and
// is the right route for genuinely different dispositions — but bringing one for
// a not guilty finding spends a filing and a hearing on something the
// Commissioner was already obliged to do. So this sheet says so directly, and
// the verifier bans generating that petition here.
//
// Vocabulary is enforced, because the two words are not interchangeable in
// Massachusetts and the difference is the whole substance:
//
//   Sealing does not destroy the record. Expungement does.
//
// One document exists in this workflow and it is the opposite of what people
// assume. Form OCPS004 is a Request Not to Seal. It exists solely to DECLINE
// the relief — for the participant who wants the record to stay visible, for
// instance while a civil claim is live. It is not an application, it does not
// start the sealing, and describing it as a way to get relief would send
// someone to sign away the very thing they came for.
//
// The one real gap is a date. The operational implementation covers records
// entered on or after 11 March 2024. Where an older record still appears, the
// design's correct action is a written request to the Commissioner's office
// that the statutory duty be carried out — correspondence, not a pleading. That
// is a stop with a named destination here, and this module deliberately does
// not generate the request: no adopted track represents it, and inventing one
// inside a guidance job would be exactly the wrong place to put it.
//
// A record that still appears is not a stop by itself. It is the reason the
// verification half of this sheet exists, and the answer depends on the date
// the record was entered rather than on the record being visible.
//
// What this template never does: turn guidance into a court filing, generate a
// court petition for a disposition that already seals automatically, generate
// the request to the Commissioner's office, present the Request Not to Seal as
// an application for relief, or use sealing and expungement as synonyms.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`.
// Massachusetts is not an enabled jurisdiction and this job does not enable one.

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
 * the packet proof are integration-owned and name no Massachusetts track, so
 * `MASSACHUSETTS_COUNSEL_ADOPTED` is false and the verifier proves it.
 */
export const MASSACHUSETTS_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const MASSACHUSETTS_COUNSEL_ADOPTED = false;

/** The date the operational implementation reaches back to. */
export const MA_IMPLEMENTATION_DATE = "11 March 2024";

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not answer this participant; a destination is named. */
export class MassachusettsGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MassachusettsGuidanceStopError";
  }
}

/** The participant belongs on a different Massachusetts route, which is named. */
export class MassachusettsRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MassachusettsRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class MassachusettsBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "MassachusettsBranchError";
  }
}

export const MA_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** How the case ended. Only three dispositions seal on their own. */
export const MA_DISPOSITIONS: Readonly<Record<string, string>> = {
  not_guilty: "a not guilty finding",
  no_bill: "a no bill returned by the grand jury",
  no_probable_cause: "a finding of no probable cause",
  dismissed_or_nolle: "dismissed_or_nolle",
  convicted: "convicted"
};

/** When the record was entered, against the operational implementation date. */
export const MA_ENTRY_PERIOD: Readonly<Record<string, string>> = {
  on_or_after_implementation: "on_or_after_implementation",
  before_implementation: "before_implementation",
  unsure: "unsure"
};

/** Whether the record still shows on the participant's own CORI. */
export const MA_CORI_RESULT: Readonly<Record<string, string>> = {
  no_longer_appears: "no_longer_appears",
  still_appears: "still_appears",
  have_not_checked: "have_not_checked"
};

const MA_COURT_SEAL_ROUTE =
  "the Massachusetts route for asking a judge to seal a dismissed case, which is the right one for a dismissal or a nolle prosequi";
const MA_ADMIN_SEAL_ROUTE =
  "the Massachusetts route for sealing a conviction through Probation once the statutory period has run";
const MA_HELP =
  "a Massachusetts legal aid organisation or a CORI sealing clinic";
const MA_OCP_REQUEST =
  "write to the Commissioner of Probation's office asking that the sealing duty be carried out on the record, quoting the docket number, the court, the disposition and its date — that is correspondence rather than a court pleading, and LegalEase does not write it for you";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new MassachusettsBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Massachusetts stops, and routes to
 * the correct Massachusetts mechanism.
 *
 * A record that still appears is not a stop on its own. What decides the answer
 * is when the record was entered: on or after the implementation date it should
 * have sealed and the next step is checking; before it, the correct action is a
 * request to the Commissioner's office rather than any petition.
 */
export function deriveMassachusettsGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  const disposition = branch(trackId, "disposition", MA_DISPOSITIONS, facts.disposition);
  if (disposition.value === "dismissed_or_nolle") {
    throw new MassachusettsRouteMismatchError(
      trackId,
      "dismissal_or_nolle_does_not_seal_on_its_own",
      "A dismissal or a nolle prosequi is a genuinely different disposition. It does not seal by operation of law the way a not guilty finding does, and it is the disposition the court petition was actually built for.",
      `${MA_COURT_SEAL_ROUTE}; if several dismissed cases are involved, ask ${MA_HELP} whether they can be dealt with together`
    );
  }
  if (disposition.value === "convicted") {
    throw new MassachusettsRouteMismatchError(
      trackId,
      "conviction_does_not_seal_on_its_own",
      "A conviction does not seal by operation of law. There is a separate route for it once the statutory period has run, and it is administrative rather than a court proceeding.",
      MA_ADMIN_SEAL_ROUTE
    );
  }
  derived.dispositionAllegation = disposition.resolved;

  if (branch(trackId, "mixedCase", MA_YES_NO, facts.mixedCase).resolved) {
    throw new MassachusettsGuidanceStopError(
      trackId,
      "mixed_case_with_counts_outside_this_route",
      "Where some counts ended in a not guilty finding and others in a dismissal, a nolle prosequi or a conviction, the counts do not all travel together. Part of the case seals on its own and part of it needs a different route, and working out which is which from a docket is not something this page can do for you.",
      `${MA_HELP}, taking the full docket so each count can be matched to the route that actually reaches it`
    );
  }

  const entry = branch(trackId, "entryPeriod", MA_ENTRY_PERIOD, facts.entryPeriod);
  derived.entryPeriod = entry.value;
  const cori = branch(trackId, "recordStillAppears", MA_CORI_RESULT, facts.recordStillAppears);
  derived.coriResult = cori.value;

  if (entry.value === "before_implementation" && cori.value === "still_appears") {
    throw new MassachusettsGuidanceStopError(
      trackId,
      "pre_implementation_record_still_appearing",
      `The sealing duty applies to your disposition, but the operational implementation covers records entered on or after ${MA_IMPLEMENTATION_DATE}. An older record that still appears has not been reached by it — and the answer is not a court petition, which would spend a filing and a hearing on relief you are already entitled to.`,
      MA_OCP_REQUEST
    );
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route and nothing to pay. The Commissioner of Probation is required to seal these records, and that duty does not wait on you asking.";

const SEALING_IS_NOT_EXPUNGEMENT =
  "Sealing and expungement are not the same thing in Massachusetts and this page keeps them apart. Sealing does not destroy the record; expungement does. What happens here is sealing.";

const DO_NOT_PETITION =
  "Do not bring a court petition to seal a not guilty finding. The relief is already yours by operation of law, and a petition would spend a filing and a hearing on something the Commissioner was already obliged to do. That petition is the right route for a dismissal or a nolle prosequi — a genuinely different disposition — and the wrong one here.";

const OCPS004_IS_A_DECLINE =
  "There is one form in this workflow and it does the opposite of what people expect. The Request Not to Seal exists solely to DECLINE the sealing — for someone who wants the record to stay visible, for example while a civil claim is running. It is not an application, it does not start anything, and signing it would give away the relief you came for.";

const HOW_TO_CHECK =
  "Check your own CORI. That is the record this sealing acts on, and it is the only way to know whether it happened, because nobody is required to tell you. LegalEase does not obtain, receive or inspect your CORI — you request and read your own.";

const MA_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal or expunge anything, and cannot make the Commissioner of Probation or a court act.",
  "LegalEase cannot tell you whether you qualify, and never asserts that a particular record has or has not been sealed.",
  "LegalEase does not obtain, receive, inspect or hold your CORI. You request and read your own.",
  "LegalEase does not write the request to the Commissioner's office, and does not file the petition routes named here."
];

const MA_SOURCES: readonly string[] = [
  "G.L. c. 276, § 100C ¶1 (mandatory sealing of a not guilty finding, a no bill or a finding of no probable cause).",
  "Commonwealth v. J.F., 491 Mass. 824 (2023); Commonwealth v. Pon, 469 Mass. 296 (2014).",
  "Office of the Commissioner of Probation, Form OCPS004, Request Not to Seal — a form for declining the relief.",
  "Your own CORI, requested from the Department of Criminal Justice Information Services."
];

export const MASSACHUSETTS_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "ma-autoseal-guidance": {
    templateId: "ma-autoseal-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Records that seal on their own, and the filing you should not make",
    whyNotAFiling:
      "The Commissioner of Probation shall seal the record of a not guilty finding, a no bill or a finding of no probable cause. The duty is mandatory and immediate, so there is no petition to bring and nothing to pay — this page explains what you already have, how to confirm it, and what to do instead if an older record has not been reached.",
    processType: "agency",
    prerequisites: [
      "The case ended in a not guilty finding, a no bill returned by the grand jury, or a finding of no probable cause.",
      "Nothing else. This sealing is not applied for and does not wait on a request."
    ],
    documentsToObtain: [
      "Your own CORI, so you can see whether the record still appears.",
      "The docket for the case, showing the disposition and the date it was entered."
    ],
    participantDataToGather: [
      "How the case ended.",
      "The date the disposition was entered.",
      "Whether some counts ended differently — in a dismissal, a nolle prosequi or a conviction.",
      "Whether the record still appears on your CORI."
    ],
    officialDestination: {
      name: "The Office of the Commissioner of Probation",
      detail:
        "The Commissioner seals by operation of law. For records entered on or after the implementation date the sealing happens automatically; there is no participant filing on this route."
    },
    actionSequence: [
      NOTHING_TO_FILE,
      SEALING_IS_NOT_EXPUNGEMENT,
      DO_NOT_PETITION,
      OCPS004_IS_A_DECLINE,
      HOW_TO_CHECK,
      `Know the date that decides your next step. The operational implementation covers records entered on or after ${MA_IMPLEMENTATION_DATE}. If your record is from on or after that date and still appears, checking again and raising it is the path. If it is older and still appears, it has simply not been reached by the implementation.`,
      "For an older record, the correct action is correspondence rather than a pleading: a written request to the Commissioner's office that the sealing duty be carried out. It is not a court filing, it does not need a judge, and it is not the petition route.",
      "Keep the routes apart in your head. This one is automatic and covers three dispositions. The court petition is for a dismissal or a nolle prosequi. Sealing a conviction through Probation is a third thing again, and it runs on a waiting period."
    ],
    submissionMethod:
      "There is nothing to submit. The Commissioner's duty is mandatory and does not depend on a request from you.",
    fees: "No fee. There is no filing on this route.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "You serve nobody and notify nobody.",
      "Nobody is required to tell you that a record has been sealed, which is why checking your CORI is the participant's part."
    ],
    expectedNextStage:
      "Your CORI no longer shows the case, or you know from its entry date whether to raise it or to write to the Commissioner's office.",
    legalEaseCanPrepare: [
      "This explanation of relief you already have, so you do not pay for it twice.",
      "The Request Not to Seal, described accurately as a way to decline rather than to apply.",
      "The date test that decides whether an unsealed record needs chasing or correspondence."
    ],
    legalEaseCannotPerform: MA_CANNOT_PERFORM,
    escalationTriggers: [
      `The record was entered before ${MA_IMPLEMENTATION_DATE} and still appears.`,
      "The case is mixed, with some counts reachable here and others not.",
      "The case ended in a dismissal or a nolle prosequi, which is the court petition route.",
      "The case ended in a conviction, which is the administrative sealing route."
    ],
    officialSourceReferences: MA_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!MASSACHUSETTS_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Massachusetts guidance template ${templateId} is registered.`);
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

const MA_STATUSES = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "legal_review_pending"
} as const;

const MA_REQUIRED_INPUTS: readonly RequiredInput[] = [
  {
    key: "disposition",
    label:
      "Did the case end in a not guilty finding, a no bill from the grand jury, or a finding of no probable cause?",
    required: true
  },
  { key: "dispositionDate", label: "On what date was that entered?", required: true },
  {
    key: "entryPeriod",
    label: "Was the record entered on or after 11 March 2024, or before it?",
    required: true
  },
  {
    key: "mixedCase",
    label: "Did some counts end differently, for example in a dismissal, nolle prosequi or conviction?",
    required: true
  },
  { key: "recordStillAppears", label: "Does the record still appear on your CORI?", required: true }
];

export const MASSACHUSETTS_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "MA",
    trackId: "ma-autoseal",
    publicName: "Records that seal on their own",
    mechanism: "mandatory_sealing_by_the_commissioner_of_probation_by_operation_of_law",
    authority:
      "G.L. c. 276, § 100C ¶1; Commonwealth v. J.F., 491 Mass. 824 (2023); Commonwealth v. Pon, 469 Mass. 296 (2014)",
    recordTypes: ["court_record", "criminal_offender_record_information"],
    dispositions: ["not_guilty", "no_bill", "no_probable_cause"],
    courtLevel: "not_a_court_process",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet("ma-autoseal", "ma-autoseal-process-guidance-1", "ma-autoseal-guidance"),
    requiredInputs: MA_REQUIRED_INPUTS,
    statuses: {
      ...MA_STATUSES,
      runtime: computeRuntimeStatus({
        statuses: MA_STATUSES,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "Automatic-Sealing-Verification",
    assembledPacketTitle: "Records that seal on their own, and the filing you should not make",
    customerDeliverableDescription:
      "A guidance sheet explaining that the Commissioner of Probation must seal a not guilty finding, a no bill or a finding of no probable cause by operation of law with nothing filed, that a court petition for such a disposition would spend a filing and a hearing on relief already held, that the Request Not to Seal is a form for declining rather than applying, how to verify on CORI, and that a record entered before the implementation date which still appears is answered by correspondence to the Commissioner's office rather than a petition.",
    notes:
      "The design's three packet instructions are carried. Sealing and expungement are never used interchangeably — sealing does not destroy the record and expungement does — and the verifier enforces the distinction. No court petition is generated for a not guilty finding, because that wastes a filing and a hearing on relief the participant already has; the verifier bans it. Where the record was entered before the implementation date and still appears, the correct action is a written request to the Commissioner's office that the statutory duty be carried out, which is correspondence rather than a pleading, and that is a typed stop with the content to include named — the request itself is deliberately not generated, since no adopted Massachusetts track represents it and inventing one inside a guidance job would be the wrong place for it. Form OCPS004 is described accurately as a Request Not to Seal that exists solely to decline the relief, so it can never be mistaken for an application. A mixed case is a typed stop, and a dismissal, nolle prosequi or conviction routes to the petition or administrative route that actually reaches it. A record that still appears is not a stop on its own: the entry date decides the answer."
  }
];
