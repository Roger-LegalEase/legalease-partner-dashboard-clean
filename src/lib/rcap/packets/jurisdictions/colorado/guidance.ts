// Colorado process guidance — automatic sealing, and what to do when it did
// not happen.
//
// Two assigned routes, both implemented. Neither has a participant form,
// because neither is applied for: Colorado seals these records on its own.
//
// The adopted design is unusually direct about what the product is FOR here:
//
//   No participant form exists. Verification and the backstop are the
//   product's job.
//
// That is the whole shape of this family. An automatic route that works needs
// no help, and an automatic route that silently failed is invisible until
// somebody checks. So each sheet does two things and only two things: it tells
// the participant how to find out whether the sealing actually happened, and it
// names the route that exists if it did not.
//
//   - An arrest that produced no charges is sealed automatically, and where the
//     process failed the backstop is the official petition form.
//   - A non-conviction is sealed automatically at disposition, and where the
//     process failed the backstop is the simplified non-conviction motion.
//
// Neither backstop is generated here. This job builds the guidance and the
// verification step; the petition and the simplified motion are their own
// routes with their own outputs, and naming them is what these sheets owe the
// participant.
//
// The verification instrument is the participant's own criminal-history report
// from the Colorado Bureau of Investigation. The design is explicit that it is
// participant reference material and that LegalEase does not verify it, which
// is consistent with the rest of the product: the participant checks their own
// record and corrects their answer if the record disagrees with it.
//
// One stop, and it is wider than the usual one. The design's single stop
// condition for both routes is immigration, licensing OR firearm consequences.
// Sealing interacts with all three, and each sends the question somewhere this
// page cannot go — so any of them stops the route rather than only immigration.
//
// One open release question is disclosed rather than papered over: the Colorado
// Judicial Branch "Sealing Criminal Records" bench and self-help guide, revised
// August 2025, was not acquired for this review. So these sheets state the
// statutory position and tell the participant to check the current judicial
// guide, rather than reciting procedural detail that was never read.
//
// What these templates never do: turn guidance into a court filing, generate
// the petition or the simplified motion, obtain or verify the participant's
// criminal-history report, quote a fee amount, or tell a participant that the
// automatic sealing worked without their having checked.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Colorado
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
 * the review manifest are integration-owned and name no Colorado track, so
 * `COLORADO_COUNSEL_ADOPTED` is false on this branch and the verifier proves it
 * rather than trusting it.
 */
export const COLORADO_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const COLORADO_COUNSEL_ADOPTED = false;

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not reach this participant and no other route is named. */
export class ColoradoGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "ColoradoGuidanceStopError";
  }
}

/** The participant belongs on a different Colorado route, which is named. */
export class ColoradoRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "ColoradoRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class ColoradoBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "ColoradoBranchError";
  }
}

export const CO_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * The design's single stop condition, which is wider than the usual one.
 *
 * Immigration, licensing and firearm consequences each interact with sealing
 * and each sends the question to someone this page cannot substitute for.
 */
export const CO_CONSEQUENCES: Readonly<Record<string, string>> = {
  none: "none",
  immigration: "an immigration lawyer",
  professional_licensing: "a lawyer who handles professional licensing, and your licensing board",
  firearm: "a lawyer, because firearm eligibility turns on more than the state record",
  more_than_one: "a lawyer, before any of the consequences is acted on"
};

/** How the case ended, for the non-conviction route. */
export const CO_DISPOSITIONS: Readonly<Record<string, string>> = {
  dismissed: "the case was dismissed",
  acquitted: "you were acquitted",
  not_guilty: "the finding was not guilty",
  charges_dropped: "the charges were dropped",
  diversion_completed: "you completed diversion and the case ended without a conviction",
  convicted: "convicted"
};

/** Whether the record is still showing after the automatic process. */
export const CO_VISIBILITY: Readonly<Record<string, string>> = {
  no_longer_appears: "no_longer_appears",
  still_appears: "still_appears",
  have_not_checked: "have_not_checked"
};

const COUNSEL = "a lawyer, or a Colorado legal aid or reentry clinic";
const CBI = "the Colorado Bureau of Investigation";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new ColoradoBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Colorado stop, and routes to the
 * correct Colorado mechanism.
 *
 * Whether the record is still visible is deliberately NOT a stop. It is the
 * question the sheet exists to answer, and both answers keep the participant on
 * the page: one confirms the sealing worked, the other sends them to the
 * backstop the sheet names.
 */
export function deriveColoradoGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  const consequences = branch(trackId, "consequencesInPlay", CO_CONSEQUENCES, facts.consequencesInPlay);
  if (consequences.value !== "none") {
    throw new ColoradoGuidanceStopError(
      trackId,
      "immigration_licensing_or_firearm_consequences",
      "Sealing interacts with immigration status, professional licensing and firearm eligibility, and in each case the order in which things are done can matter more than the sealing itself. That goes to someone who can advise on the consequence before any record step is taken.",
      consequences.resolved
    );
  }

  if (trackId === "co_auto_seal_arrest") {
    if (branch(trackId, "chargesFiled", CO_YES_NO, facts.chargesFiled).resolved) {
      throw new ColoradoRouteMismatchError(
        trackId,
        "charges_were_filed",
        "This route is for an arrest where no charges were ever filed. Once charges were filed there is a case, and a case that ended without a conviction is sealed under the disposition route instead.",
        "the automatic sealing at disposition route for non-convictions"
      );
    }
  }

  if (trackId === "co_auto_seal_nonconviction") {
    const disposition = branch(trackId, "disposition", CO_DISPOSITIONS, facts.disposition);
    if (disposition.value === "convicted") {
      throw new ColoradoRouteMismatchError(
        trackId,
        "case_ended_in_a_conviction",
        "Automatic sealing at disposition reaches non-convictions. A conviction is not sealed by it, and the routes that can reach a conviction are separate, narrower and worth advice.",
        "the Colorado conviction sealing routes, and " + COUNSEL
      );
    }
    derived.dispositionAllegation = disposition.resolved;
  }

  derived.recordVisibility = branch(
    trackId,
    "recordStillVisible",
    CO_VISIBILITY,
    facts.recordStillVisible
  ).value;

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route and nothing to pay. Colorado does the sealing itself, so the only work here is finding out whether it happened.";

const CHECK_YOUR_OWN_RECORD =
  `Request your own criminal-history report from ${CBI} and look at it. That is the check, and it is the one step on this route that is actually yours. LegalEase does not obtain, receive or verify that report — you read your own.`;

const JUDICIAL_GUIDE_NOT_READ =
  "One honesty note: the Colorado Judicial Branch's current sealing guide was not obtained for this review, so procedural detail beyond the statute is not recited here. Check the Judicial Branch's own sealing self-help material before relying on any step.";

const CO_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal anything, and cannot make the Bureau, a district attorney or a court act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, receive, inspect or verify your criminal-history report. You request and read your own."
];

const CO_SOURCES: readonly string[] = [
  "C.R.S. § 24-72-704(1.5) and (2) (automatic sealing of an arrest with no charges filed).",
  "C.R.S. § 24-72-705(1) (automatic sealing at disposition for non-convictions).",
  "Colorado Bureau of Investigation, criminal-history record request.",
  "Colorado Judicial Branch sealing self-help materials and forms."
];

function coGuidance(input: {
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
    actionSequence: [NOTHING_TO_FILE, ...input.sequence, JUDICIAL_GUIDE_NOT_READ],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? CO_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: CO_SOURCES
  };
}

export const COLORADO_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "co-auto-seal-arrest-guidance": coGuidance({
    templateId: "co-auto-seal-arrest-guidance",
    mechanismName: "Automatic sealing of an arrest where no charges were filed",
    processType: "automatic",
    whyNotAFiling:
      "Where an arrest produced no charges, Colorado seals the record without anybody applying. There is no petition, no form and no fee on this route — so nothing is generated unless the automatic process failed, and then the route is a petition rather than this page.",
    destination: {
      name: `${CBI}, the state court administrator, district attorneys and the courts`,
      detail:
        "The sealing is carried out between the agencies. No participant form exists, so verifying that it happened, and knowing the backstop if it did not, is what this page is for."
    },
    prerequisites: [
      "You were arrested and no charges were ever filed.",
      "Nothing else. This sealing is not applied for."
    ],
    documents: [
      `Your own criminal-history report from ${CBI}.`,
      "Any background check that showed the arrest, if that is what prompted the question."
    ],
    gather: [
      "Whether any charges were ever filed after the arrest.",
      "Whether the arrest still appears on a background check.",
      "The date of the arrest and the county, so the record can be identified."
    ],
    sequence: [
      "Know what should have happened. An arrest that produced no charges is sealed automatically, without an application and without a fee.",
      "Know who holds the records that are supposed to change. The sealing is carried out between the Bureau, the state court administrator, the district attorneys and the courts — so more than one office is involved, and a record can be sealed in one place while a copy lingers somewhere else.",
      CHECK_YOUR_OWN_RECORD,
      "If the arrest no longer appears, the process worked and there is nothing further to do on this route.",
      "If it still appears, the automatic process did not reach your record — and that is not the end of it. There is an official petition to seal an arrest record, and that petition is the backstop for exactly this situation.",
      "If your answer and the report disagree, believe the report and correct your answer. A background check you saw months ago is not evidence of what the record says today.",
      "Do not assume a commercial background report reflects the state record. Where the state record is sealed and a commercial report still shows the arrest, that is a different problem with a different fix."
    ],
    submissionMethod: "There is nothing to submit. The sealing happens between the agencies.",
    fees: "No fee. There is no petition on this route unless the automatic process failed.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage: `The arrest no longer appears on your ${CBI} criminal-history report.`,
    canPrepare: [
      "This explanation of what should have happened without anyone asking.",
      "The check that tells you whether it did.",
      "The name of the backstop petition if it did not."
    ],
    escalations: [
      "Charges were in fact filed, which puts you on the disposition route.",
      "The arrest still appears, which routes to the petition to seal.",
      "Immigration, licensing or firearm consequences are in play."
    ]
  }),

  "co-auto-seal-nonconviction-guidance": coGuidance({
    templateId: "co-auto-seal-nonconviction-guidance",
    mechanismName: "Automatic sealing at disposition for a case that ended without a conviction",
    processType: "automatic",
    whyNotAFiling:
      "Where a case ends without a conviction, Colorado seals the record at disposition without anybody applying. There is no petition, no form and no fee — so nothing is generated unless the automatic process failed, and then the route is a simplified motion rather than this page.",
    destination: {
      name: `${CBI}, the state court administrator, district attorneys and the courts`,
      detail:
        "The sealing is carried out at disposition between the court and the agencies. No participant form exists, so verifying that it happened, and knowing the backstop if it did not, is what this page is for."
    },
    prerequisites: [
      "The case ended without a conviction.",
      "Nothing else. This sealing is not applied for."
    ],
    documents: [
      `Your own criminal-history report from ${CBI}.`,
      "The court's disposition record, if you need to confirm how the case ended."
    ],
    gather: [
      "How the case ended.",
      "Whether the case still appears on a background check.",
      "The case number and the county, so the record can be identified."
    ],
    sequence: [
      "Know what should have happened. A case that ended without a conviction is sealed at disposition, automatically, with nothing filed and nothing paid.",
      CHECK_YOUR_OWN_RECORD,
      "If the case no longer appears, the process worked and there is nothing further to do on this route.",
      "If it still appears, the automatic sealing did not reach your record — and there is a simplified motion for non-convictions that exists as the backstop for exactly that.",
      "If your answer and the report disagree, believe the report and correct your answer.",
      "A conviction is a different matter. Automatic sealing at disposition reaches non-convictions; the routes that can reach a conviction are separate and narrower."
    ],
    submissionMethod: "There is nothing to submit. The sealing happens at disposition.",
    fees: "No fee. There is no motion on this route unless the automatic process failed.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage: `The case no longer appears on your ${CBI} criminal-history report.`,
    canPrepare: [
      "This explanation of the sealing that should have happened at disposition.",
      "The check that tells you whether it did.",
      "The name of the simplified motion if it did not."
    ],
    escalations: [
      "The case ended in a conviction, which this route does not reach.",
      "The case still appears, which routes to the simplified non-conviction motion.",
      "Immigration, licensing or firearm consequences are in play."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!COLORADO_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Colorado guidance template ${templateId} is registered.`);
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

function coloradoTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
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
    jurisdiction: "CO",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "not_a_court_process",
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
    "Are immigration, professional licensing or firearm consequences in play for you?",
  required: true
};

const VISIBILITY_INPUT: RequiredInput = {
  key: "recordStillVisible",
  label: "Does it still appear on a background check?",
  required: true
};

export const COLORADO_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  coloradoTrack({
    trackId: "co_auto_seal_arrest",
    publicName: "Automatic Sealing, Arrest With No Charges Filed",
    mechanism: "automatic_sealing_of_an_arrest_with_no_charges_filed",
    authority: "C.R.S. § 24-72-704(1.5) and (2)",
    recordTypes: ["arrest"],
    dispositions: ["arrest with no charges filed"],
    componentId: "co_auto_seal_arrest-process-guidance-1",
    templateId: "co-auto-seal-arrest-guidance",
    requiredInputs: [
      CONSEQUENCES_INPUT,
      { key: "chargesFiled", label: "Were any charges ever filed after the arrest?", required: true },
      { key: "recordStillVisible", label: "Does the arrest still appear on a background check?", required: true }
    ],
    assembledPacketName: "Automatic-Arrest-Sealing-Verification",
    assembledPacketTitle: "Automatic sealing of an arrest where no charges were filed",
    customerDeliverableDescription:
      "A guidance sheet explaining that an arrest producing no charges is sealed automatically with nothing to file and nothing to pay, how to verify it against the participant's own Bureau criminal-history report, and that the official petition to seal is the backstop where the automatic process did not reach the record.",
    notes:
      "The design states that no participant form exists and that verification and the official petition backstop are the product's job, so the sheet does exactly those two things. Whether the record is still visible is deliberately not a typed stop — it is the question the sheet exists to answer, and both answers keep the participant on the page. The criminal-history report is participant reference material that LegalEase does not verify. Charges having been filed routes to the disposition track. The design's single stop condition covers immigration, licensing and firearm consequences together, so all three stop the route. The Colorado Judicial Branch sealing guide revised August 2025 was not acquired, which the sheet discloses."
  }),

  coloradoTrack({
    trackId: "co_auto_seal_nonconviction",
    publicName: "Automatic Sealing At Disposition, Non-Convictions",
    mechanism: "automatic_sealing_at_disposition_for_non_convictions",
    authority: "C.R.S. § 24-72-705(1)",
    recordTypes: ["charge"],
    dispositions: ["non-conviction dispositions within § 24-72-705(1)"],
    componentId: "co_auto_seal_nonconviction-process-guidance-1",
    templateId: "co-auto-seal-nonconviction-guidance",
    requiredInputs: [
      CONSEQUENCES_INPUT,
      { key: "disposition", label: "How did the case end?", required: true },
      VISIBILITY_INPUT
    ],
    assembledPacketName: "Automatic-Nonconviction-Sealing-Verification",
    assembledPacketTitle: "Automatic sealing at disposition for a case that ended without a conviction",
    customerDeliverableDescription:
      "A guidance sheet explaining that a case ending without a conviction is sealed automatically at disposition with nothing to file and nothing to pay, how to verify it against the participant's own Bureau criminal-history report, and that the simplified non-conviction motion is the backstop where the automatic sealing did not reach the record.",
    notes:
      "The design states the product's job here is to verify whether sealing actually happened and route to the simplified non-conviction motion if it did not, which is what the sheet does. A conviction is a typed route mismatch, since automatic sealing at disposition reaches non-convictions only. Whether the record is still visible is not a stop; it is the question being answered. The design's single stop condition covers immigration, licensing and firearm consequences together. The Colorado Judicial Branch sealing guide revised August 2025 was not acquired, which the sheet discloses."
  })
];
