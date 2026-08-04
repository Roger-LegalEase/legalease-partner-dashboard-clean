// Alaska process guidance — the four court-adjacent routes.
//
// Four assigned routes, all four implemented. Alaska is the jurisdiction where
// the most valuable thing a guidance sheet can do is tell someone the truth
// quickly, because the truth is unusual:
//
//   There is no general adult expungement in Alaska.
//
// The accepted design states it as a rule about what participant-facing copy
// may say: do not tell an Alaska participant their conviction can be expunged.
// So every sheet in this family carries that sentence, and the verifier fails
// the build if any sheet uses expungement vocabulary to describe a remedy
// Alaska actually offers.
//
// None of these four routes has a participant filing that LegalEase can make.
// Each is here for a different reason, and the reason is the guidance:
//
//   1. `ak-sej` is decided at the plea stage, inside an active prosecution,
//      with the prosecuting attorney's consent. Nobody comes to a record
//      clearing service asking for one. The design records the reason it is
//      worth a sheet anyway: a participant who completed a suspended entry of
//      judgment often does not realise they have NO conviction at all, and is
//      asking to clear something that does not exist. An active case is a hard
//      stop to defence counsel — that is a defence decision, not a record one.
//
//   2. `ak-nonconviction-confidential` is automatic and needs no filing. Its
//      teaching point is that it is NOT the same protection as keeping a case
//      off the court's public website: one stops the agency releasing the
//      record, the other stops the courts publishing it. The design says a
//      participant needs to understand both, so the sheet distinguishes them.
//
//   3. `ak-pardon` is a dead letter and the copy must say so with numbers. The
//      design is explicit: the participant-facing copy must carry the grant
//      numbers, because presenting a pardon as "your remaining option" without
//      them would be misleading. Three grants since 1995, none since 2007, and
//      Board of Parole statistics for 2011 through 2023 showing none, are the
//      difference between an honest sheet and a cruel one.
//
//   4. `ak-juvenile` is outside LegalEase's approved adult scope. That is a
//      scope limit, not a legal obstacle, and the sheet says so plainly —
//      then gives the participant the genuinely good news that Alaska law
//      already seals most juvenile records automatically, so the answer to
//      "can this be cleared" is usually that it already was.
//
// Three of the four routes have an open release question recording that the
// current official text has not been acquired: AS 12.55.078 for the suspended
// entry of judgment, AS 12.62.160(b)(8) and 13 AAC 68.310 for agency
// confidentiality, and the Board of Parole clemency Eligibility Determination
// form and process materials for the pardon. Each sheet says which of its
// statements has not been checked against the current official source rather
// than presenting all of it as settled.
//
// What these templates never do: turn guidance into a court filing, generate or
// submit a clemency application, advise inside an active prosecution, tell an
// Alaska participant a conviction can be expunged, present the pardon as a live
// option without its numbers, or quote a fee the source review does not state.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Alaska is
// not an enabled jurisdiction and this job does not enable one.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not reach this participant and no other Alaska route is named. */
export class AlaskaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "AlaskaGuidanceStopError";
  }
}

/** The participant belongs on a different route, which is named. */
export class AlaskaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "AlaskaRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class AlaskaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "AlaskaBranchError";
  }
}

export const AK_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** How the case ended, for the agency-confidentiality route. */
export const AK_DISPOSITIONS: Readonly<Record<string, string>> = {
  no_charges_filed: "no charges were ever filed",
  dismissed: "the charge was dismissed",
  acquitted: "you were acquitted",
  not_guilty: "the finding was not guilty",
  sej_discharge: "you completed a suspended entry of judgment and were discharged",
  convicted: "convicted"
};

/** Where the conviction was entered. Alaska clemency reaches Alaska convictions. */
export const AK_CONVICTION_ORIGINS: Readonly<Record<string, string>> = {
  alaska_state: "alaska_state",
  federal: "federal",
  another_state: "another_state"
};

const COUNSEL = "a lawyer, or an Alaska legal aid or reentry clinic";
const DEFENCE = "the lawyer representing you in that case, or the Alaska Public Defender Agency";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new AlaskaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Alaska stops, and routes to the
 * correct Alaska mechanism.
 */
export function deriveAlaskaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Immigration is a hard stop where the design records it. A record step taken
  // for its own sake can change how a disposition is proved to federal
  // authorities, and that ordering question belongs with counsel.
  if (trackId === "ak-nonconviction-confidential" || trackId === "ak-pardon") {
    if (branch(trackId, "immigrationMatter", AK_YES_NO, facts.immigrationMatter).resolved) {
      throw new AlaskaGuidanceStopError(
        trackId,
        "immigration_matter",
        "Where immigration consequences are in play, the order in which things are done matters and a record step taken first can make a disposition harder to prove. That goes to an immigration lawyer before anything else happens.",
        "an immigration lawyer, then " + COUNSEL
      );
    }
  }

  if (trackId === "ak-sej") {
    if (branch(trackId, "caseActive", AK_YES_NO, facts.caseActive).resolved) {
      throw new AlaskaGuidanceStopError(
        trackId,
        "active_case_needs_defence_representation",
        "A suspended entry of judgment is chosen inside a live prosecution, with the prosecuting attorney's consent, before any judgment is entered. That is a defence decision made by the lawyer running your case, and it is not something a record-clearing service can ask for on your behalf or advise you about while the case is open.",
        DEFENCE
      );
    }
  }

  if (trackId === "ak-nonconviction-confidential") {
    const disposition = branch(trackId, "disposition", AK_DISPOSITIONS, facts.disposition);
    if (disposition.value === "convicted") {
      throw new AlaskaRouteMismatchError(
        trackId,
        "case_ended_in_a_conviction",
        "This protection is for records that are not conviction records. A conviction is not reached by it, and Alaska has no general adult expungement to fall back on, so what remains is narrow and worth getting advice about rather than guessing at.",
        "the narrow Alaska conviction routes, and " + COUNSEL
      );
    }
    derived.dispositionAllegation = disposition.resolved;
  }

  if (trackId === "ak-pardon") {
    const origin = branch(trackId, "convictionOrigin", AK_CONVICTION_ORIGINS, facts.convictionOrigin);
    if (origin.value !== "alaska_state") {
      throw new AlaskaRouteMismatchError(
        trackId,
        "conviction_is_not_an_alaska_state_conviction",
        "Alaska's clemency power reaches Alaska convictions. A person convicted under federal law or the law of another state is outside it, and an Alaska pardon would not touch that record.",
        origin.value === "federal"
          ? "the federal clemency process, which is a different process entirely"
          : "the clemency process of the state where the conviction was entered"
      );
    }
    if (branch(trackId, "needsRepresentation", AK_YES_NO, facts.needsRepresentation).resolved) {
      throw new AlaskaGuidanceStopError(
        trackId,
        "needs_individualized_advocacy",
        "Clemency is decided by the Board of Parole and then the Governor on the whole of a person's history. Someone who needs a case made for them needs an advocate, which is a lawyer's work and not a guidance sheet's.",
        COUNSEL
      );
    }
  }

  if (trackId === "ak-juvenile") {
    if (!branch(trackId, "juvenileRecord", AK_YES_NO, facts.juvenileRecord).resolved) {
      throw new AlaskaRouteMismatchError(
        trackId,
        "record_is_not_a_juvenile_record",
        "This sheet is about juvenile records. An adult record is handled by the adult routes, which in Alaska are narrow but are not this one.",
        "the Alaska adult record routes"
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NO_GENERAL_EXPUNGEMENT =
  "There is no general adult expungement in Alaska. Nobody can expunge an Alaska conviction — not a lawyer, not a service, and not LegalEase. Anyone who tells you otherwise is selling something.";

const AK_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal, clear or set aside anything, and cannot make a court, an agency, the Board of Parole or the Governor act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, inspect or hold your record. You request your own copy."
];

const AK_SOURCES: readonly string[] = [
  "AS 12.55.078 (suspended entry of judgment).",
  "AS 12.62.160(b)(8) and 13 AAC 68.310 (agency confidentiality of non-conviction records); AS 22.35.030(4) (court publication).",
  "Alaska Const. art. III, § 21; AS 33.20.070 and AS 33.20.080 (executive clemency).",
  "AS 47.12.300 and AS 47.12.030 (juvenile records).",
  "Alaska Court System forms and the Alaska Department of Public Safety background-checks page."
];

function akGuidance(input: {
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
    actionSequence: [NO_GENERAL_EXPUNGEMENT, ...input.sequence],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? AK_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: AK_SOURCES
  };
}

export const ALASKA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "ak-sej-guidance": akGuidance({
    templateId: "ak-sej-guidance",
    mechanismName: "Suspended entry of judgment, and why it may mean you have no conviction",
    processType: "court_adjacent",
    whyNotAFiling:
      "A suspended entry of judgment is chosen inside a live criminal case, by agreement with the prosecuting attorney, before judgment is entered. There is no later application for it, so there is nothing for LegalEase to file — this page exists because people who already completed one often do not know what they now have.",
    destination: {
      name: "The sentencing court, inside the active criminal case",
      detail:
        "Selected and administered inside the active criminal case. No later participant filing was identified, so none is generated."
    },
    prerequisites: [
      "Your criminal case is finished. While a case is open, this is a question for your defence lawyer and not for this page.",
      "You were placed on probation without a judgment of guilt being entered, and you completed it."
    ],
    documents: [
      "Your court records for the case, showing how it was resolved and whether you were discharged.",
      "Your own criminal history record from the Alaska Department of Public Safety, if you want to see what an agency check shows."
    ],
    gather: [
      "Whether your criminal case is still active.",
      "Whether a judgment of guilt was ever entered, or whether you were placed on probation without one.",
      "Whether you completed probation and were discharged."
    ],
    sequence: [
      "Start with what you may already have. If you completed a suspended entry of judgment and were discharged, the charges were dismissed and no conviction resulted. The statute puts it directly: a person discharged under that subsection is not convicted of a crime.",
      "That matters because people in this position often ask to have a conviction cleared when they do not have one. Before spending money or effort on clearing a record, find out whether there is a conviction there at all.",
      "Two protections follow the dismissal on their own. The result is a non-conviction record, which the agency holding it generally may not release, and the courts may not publish it. Neither of those needs an application.",
      "Check what is actually showing. Request your own record and look, rather than assuming either that it is clean or that it is not.",
      "One honesty note: the current official text of the suspended entry of judgment statute was not obtained for this review, so confirm the detail above against the current statute before relying on it."
    ],
    submissionMethod:
      "There is nothing to submit. The option is chosen inside the active case and there is no later application.",
    fees: "No fee. There is no application on this route.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage:
      "You know whether you have a conviction at all, which decides whether any clearing route applies to you.",
    canPrepare: [
      "This explanation of what a completed suspended entry of judgment leaves you with.",
      "The two protections that follow the dismissal without any application.",
      "The check to run before paying anyone to clear a record that may not exist."
    ],
    escalations: [
      "Your criminal case is still active. That is a defence lawyer's decision, not a record question.",
      "You are not sure whether judgment was entered in your case.",
      "A record check still shows a conviction after a discharge you believe should have prevented one."
    ]
  }),

  "ak-nonconviction-confidential-guidance": akGuidance({
    templateId: "ak-nonconviction-confidential-guidance",
    mechanismName: "Why an agency generally cannot release a record that is not a conviction",
    processType: "automatic",
    whyNotAFiling:
      "Confidentiality follows the disposition by operation of law. There is no petition, no form and no fee, so nothing is filed.",
    destination: {
      name: "The Alaska Department of Public Safety and other criminal justice agencies",
      detail:
        "Confidentiality follows the statutory disposition. No participant filing is required, so none is generated."
    },
    prerequisites: [
      "The case did not end in a conviction.",
      "Nothing else. This protection is not applied for."
    ],
    documents: [
      "Your own criminal history record from the Alaska Department of Public Safety.",
      "Your court records for the case, which are a different set of records from the agency's."
    ],
    gather: ["How the case ended.", "Which agency you are worried about releasing the record."],
    sequence: [
      "Know what this does. A record that is not a conviction record is generally unavailable to the public from the agency holding it, unless you consent to its release. It happens on its own.",
      "Know what it does not do, because this is the part people get wrong. Keeping an agency from releasing a record is a DIFFERENT protection from keeping the case off the court system's public website. One is about the agency; the other is about what the courts publish. You may have one and not the other, and a participant needs to understand both.",
      "So check both places. Look at what the agency holds by requesting your own record, and look separately at what shows on the court system's public case index.",
      "Consent is the gap worth knowing about. The protection is generally against release without the consent of the record subject — so a background check you sign a release for is a different situation from one you did not.",
      "One honesty note: the current official text of the confidentiality statute and its regulation was not obtained for this review, so confirm the detail above against the current sources before relying on it."
    ],
    submissionMethod: "There is nothing to submit. The protection follows the disposition.",
    fees: "No fee.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage:
      "You know what the agency may release, and separately what the court system publishes.",
    canPrepare: [
      "This explanation of a protection that applies without an application.",
      "The distinction between agency release and court publication, which are two different protections.",
      "The two checks to run, in the two different places."
    ],
    escalations: [
      "The case ended in a conviction, which this protection does not reach.",
      "An agency released a non-conviction record and you did not consent.",
      "Immigration consequences are in play."
    ]
  }),

  "ak-pardon-guidance": akGuidance({
    templateId: "ak-pardon-guidance",
    mechanismName: "A Governor's pardon, and how rarely one is granted",
    processType: "agency",
    whyNotAFiling:
      "Clemency is applied for through the Alaska Board of Parole and decided by the Governor. It is not a court filing, and LegalEase does not generate or submit the application: the Board's Eligibility Determination form and current process materials were not obtained for this review.",
    destination: {
      name: "The Alaska Board of Parole, then the Governor",
      detail:
        "A person may not apply until found eligible by Board of Parole staff, beginning with an Eligibility Determination form. The Governor decides. LegalEase generates no part of this."
    },
    prerequisites: [
      "The conviction is an Alaska state conviction. A federal conviction or one from another state is outside Alaska's clemency power.",
      "You have read the numbers below and still want to proceed."
    ],
    documents: [
      "Your own criminal history record, and the court records for the conviction.",
      "The Board of Parole's current Eligibility Determination form, which you obtain from the Board — this page does not reproduce it and it was not obtained for this review."
    ],
    gather: [
      "Which conviction you want pardoned, with court, case number and date.",
      "Where the conviction was entered.",
      "Whether you are looking for someone to make your case for you."
    ],
    sequence: [
      "Read the numbers first, because they are the most useful thing on this page. Three pardons have been granted since 1995, and none since 2007. Board of Parole statistics for 2011 through 2023 show no grants at all. Across the whole of statehood since 1959 there have been 188 grants, more than half of them between 1959 and 1966.",
      "What that means in practice: a pardon is not a plan. It is worth knowing about, and it is worth knowing it is close to a dead letter, so that no one spends years waiting on it as though it were an ordinary application.",
      "If you still want to proceed, the door is the Board of Parole, not the Governor's office. You may not apply until Board staff find you eligible, which starts with an Eligibility Determination form you get from the Board.",
      "Expect the process to look at everything. Applicants are told that virtually their entire history is considered, and are asked to sign waivers allowing investigation of their employment and personal history.",
      "Expect it to be slow by design. The Governor may not grant clemency unless the case has first been referred to the Board of Parole and at least 120 days have passed; the Board investigates and reports within 120 days. An advisory committee may review and advise, and the Governor is not bound by it.",
      "What a pardon would actually do. It is the only way under Alaska law to regain lost rights and remove disabilities. It sets the conviction aside so that you are deemed not to have been convicted, but the conviction remains on the record — it is not erased. It may not be counted against you in a later sentencing or by a licensing board, though the underlying conduct still can be, and it restores firearm rights.",
      "One honesty note: the Board's current process materials were not obtained for this review, so confirm every procedural detail above with the Board itself."
    ],
    submissionMethod:
      "Through the Alaska Board of Parole clemency process, by you. LegalEase does not generate or submit any part of the application.",
    fees: "The source review does not state a fee. Ask the Board rather than assuming there is none.",
    feeWaiver: "The source review does not address a fee waiver. Ask the Board.",
    noticeOrService: [
      "You do not serve anyone. The Board must notify the Department of Law, the office of victims' rights, and, in a crime of violence or arson, the victim.",
      "The Board of Parole and the Governor decide. There is no hearing you notice yourself."
    ],
    expectedNextStage:
      "Board staff decide whether you are eligible to apply at all, and the Board's process takes over from there.",
    canPrepare: [
      "This explanation of the route, carrying the grant numbers so the decision is made with them rather than without them.",
      "The list of what to have ready before contacting the Board.",
      "A plain statement of what a pardon would and would not do to the record."
    ],
    cannotPerform: [
      ...AK_CANNOT_PERFORM,
      "LegalEase does not generate or submit the clemency application or the Eligibility Determination form, and does not advocate before the Board or the Governor."
    ],
    escalations: [
      "The conviction is federal or from another state, which Alaska clemency does not reach.",
      "You need someone to make your case before the Board or the Governor.",
      "Immigration consequences are in play."
    ]
  }),

  "ak-juvenile-guidance": akGuidance({
    templateId: "ak-juvenile-guidance",
    mechanismName: "Juvenile records, which Alaska law already seals for most people",
    processType: "automatic",
    whyNotAFiling:
      "Juvenile relief is outside the adult scope LegalEase is approved to serve, so no packet is generated for it. That is a limit on this service and not a statement that nothing can be done — Alaska law does a good deal here on its own, and this page explains what.",
    destination: {
      name: "The Alaska juvenile court",
      detail:
        "Outside the approved adult scope. LegalEase generates nothing for this route; the juvenile court and a lawyer who practises there are the destination."
    },
    prerequisites: [
      "The record you are asking about is a juvenile record. If it is an adult record, the adult routes are the ones to look at.",
      "Nothing else. Most of what follows happens without an application."
    ],
    documents: [
      "The juvenile court records, if you have them or can ask for them.",
      "Anything showing the date you turned 18, or the date the court released jurisdiction."
    ],
    gather: [
      "Whether the record is a juvenile record or an adult one.",
      "Whether you were ever charged as an adult for the same conduct.",
      "The date of your 18th birthday, and the date the court's jurisdiction ended."
    ],
    sequence: [
      "The good news first, because most people asking this have not been told it. Juvenile delinquency records in Alaska are generally confidential and not available to the public, and the court is required to seal most of them — within 30 days of the minor's 18th birthday, or within 30 days of the court releasing jurisdiction, whichever comes later. For most people that has already happened, without anyone asking.",
      "What sealing there means: a sealed record may not be used for any purpose, except on a court order for good cause or by an officer of the court preparing a presentence report.",
      "The exceptions, so you can tell whether you are in them. Traffic offences, Class A and B felonies against the person, and first degree arson are outside the automatic sealing.",
      "If you were charged as an adult, the timing is different. Most records may be sealed five years after the sentence is completed, or five years after the records were made public.",
      "Where this service stops. Juvenile relief is outside the adult scope LegalEase is approved to serve, so nothing is generated here and this page is the whole of what it offers. A lawyer who practises in the juvenile court, or a legal aid clinic, is where to take a juvenile record question.",
      "Before you take it anywhere, check whether the sealing already happened. The answer is often that there is nothing left to do."
    ],
    submissionMethod:
      "Nothing is submitted through LegalEase. Juvenile relief is outside the approved adult scope.",
    fees: "No fee is charged by LegalEase for a route it does not serve. Any court cost is a question for the juvenile court.",
    feeWaiver: "Not established here. Ask the juvenile court or a lawyer who practises there.",
    noticeOrService: ["There is nobody for you to notify and nothing to serve on this page."],
    expectedNextStage:
      "You know whether the automatic sealing already covered the record, and who to ask if it did not.",
    canPrepare: [
      "This explanation of the automatic sealing, which is usually the answer.",
      "The list of exceptions, so you can tell whether you fall in one.",
      "A plain statement of where this service stops and who to ask instead."
    ],
    cannotPerform: [
      ...AK_CANNOT_PERFORM,
      "LegalEase does not generate any juvenile filing or represent anyone in the juvenile court. Juvenile relief is outside the approved adult scope."
    ],
    escalations: [
      "The record is an adult record, which the adult routes cover.",
      "The offence is one of the exceptions to automatic sealing.",
      "You were charged as an adult for the same conduct.",
      "The sealing deadline has passed and the record still appears."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!ALASKA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Alaska guidance template ${templateId} is registered.`);
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

function alaskaTrack(input: {
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
    jurisdiction: "AK",
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

const IMMIGRATION_INPUT: RequiredInput = {
  key: "immigrationMatter",
  label: "Do you have an immigration matter?",
  required: true
};

export const ALASKA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  alaskaTrack({
    trackId: "ak-sej",
    publicName: "Suspended Entry Of Judgment",
    mechanism: "suspended_entry_of_judgment_selected_inside_the_active_case",
    authority: "AS 12.55.078",
    recordTypes: ["charge"],
    dispositions: ["a charge resolved by suspended entry of judgment inside the active criminal case"],
    courtLevel: "sentencing_court",
    componentId: "ak-sej-process-guidance-1",
    templateId: "ak-sej-guidance",
    requiredInputs: [{ key: "caseActive", label: "Is your criminal case still active?", required: true }],
    assembledPacketName: "Suspended-Entry-Of-Judgment-Explainer",
    assembledPacketTitle: "Suspended entry of judgment, and why it may mean you have no conviction",
    customerDeliverableDescription:
      "A guidance sheet explaining that a completed suspended entry of judgment means no conviction resulted, that the resulting non-conviction record is protected from agency release and court publication without any application, and that an active case is a defence lawyer's matter rather than a record-clearing one.",
    notes:
      "The design records why this is worth a sheet despite not being a product: a participant who completed a suspended entry of judgment often does not realise they have no conviction at all and may be asking to clear something that does not exist. An active case is a typed stop to defence counsel, because the option is selected inside a live prosecution with the prosecuting attorney's consent. The current official text of AS 12.55.078 was not acquired, which the sheet discloses."
  }),

  alaskaTrack({
    trackId: "ak-nonconviction-confidential",
    publicName: "Agency Confidentiality Of Non-Conviction Records",
    mechanism: "automatic_agency_confidentiality_of_non_conviction_records",
    authority: "AS 12.62.160(b)(8); 13 AAC 68.310",
    recordTypes: ["arrest", "charge"],
    dispositions: ["non-conviction records within AS 12.62.160(b)(8)"],
    courtLevel: "not_a_court_process",
    componentId: "ak-nonconviction-confidential-process-guidance-1",
    templateId: "ak-nonconviction-confidential-guidance",
    requiredInputs: [
      IMMIGRATION_INPUT,
      { key: "disposition", label: "How did the case end?", required: true }
    ],
    assembledPacketName: "Non-Conviction-Agency-Confidentiality",
    assembledPacketTitle: "Why an agency generally cannot release a record that is not a conviction",
    customerDeliverableDescription:
      "A guidance sheet explaining that a non-conviction record is generally unavailable to the public from the agency holding it without the record subject's consent, that this is a different protection from the courts not publishing the case, and that both should be checked separately.",
    notes:
      "The design requires the participant to understand both protections: agency confidentiality stops release by the agency, while court non-publication keeps the case off the court system's public site. They are different and a participant may have one without the other, so the sheet distinguishes them and sends the participant to check both. Immigration consequences are a typed stop. The current official text of AS 12.62.160 and 13 AAC 68.310 was not acquired, which the sheet discloses."
  }),

  alaskaTrack({
    trackId: "ak-pardon",
    publicName: "Governor's Pardon",
    mechanism: "executive_clemency_through_the_board_of_parole_and_the_governor",
    authority: "Alaska Const. art. III, § 21; AS 33.20.070; AS 33.20.080",
    recordTypes: ["conviction"],
    dispositions: ["convictions eligible for executive clemency"],
    courtLevel: "not_a_court_process",
    componentId: "ak-pardon-process-guidance-1",
    templateId: "ak-pardon-guidance",
    requiredInputs: [
      IMMIGRATION_INPUT,
      { key: "convictionDetails", label: "What conviction do you want pardoned?", required: true },
      { key: "convictionOrigin", label: "Where was the conviction entered?", required: true },
      {
        key: "needsRepresentation",
        label: "Do you need someone to make your case before the Board or the Governor?",
        required: true
      }
    ],
    assembledPacketName: "Governors-Pardon-Route-Explainer",
    assembledPacketTitle: "A Governor's pardon, and how rarely one is granted",
    customerDeliverableDescription:
      "A guidance sheet explaining the Alaska clemency route through the Board of Parole and the Governor, carrying the grant numbers so the participant decides with them, and stating what a pardon would and would not do to the record.",
    notes:
      "The design's limitation is explicit: the participant-facing copy must carry the grant numbers, because presenting this as the participant's remaining option without them would be misleading. The sheet therefore leads with three grants since 1995, none since 2007, no grants in the Board's 2011 to 2023 statistics, and 188 grants since statehood with more than half between 1959 and 1966. The route stays guidance-only unless LegalEase separately approves the pardon application as a packet product, and the Board's Eligibility Determination form and current process materials were not acquired, so nothing is generated. Federal and other-state convictions are outside Alaska clemency and are a typed route mismatch."
  }),

  alaskaTrack({
    trackId: "ak-juvenile",
    publicName: "Juvenile Records",
    mechanism: "juvenile_relief_outside_the_approved_adult_scope",
    authority: "AS 47.12.300; AS 47.12.030",
    recordTypes: ["juvenile"],
    dispositions: ["juvenile adjudications within AS 47.12.300"],
    courtLevel: "juvenile_court",
    componentId: "ak-juvenile-process-guidance-1",
    templateId: "ak-juvenile-guidance",
    requiredInputs: [
      { key: "juvenileRecord", label: "Is the record you want cleared a juvenile record?", required: true }
    ],
    assembledPacketName: "Juvenile-Records-Scope-And-Automatic-Sealing",
    assembledPacketTitle: "Juvenile records, which Alaska law already seals for most people",
    customerDeliverableDescription:
      "A guidance sheet stating that juvenile relief is outside the adult scope LegalEase serves, and explaining that Alaska law already requires most juvenile records to be sealed automatically within 30 days of the 18th birthday or the release of jurisdiction, with the exceptions and the adult-charge timing.",
    notes:
      "Juvenile relief remains outside the approved adult scope, so nothing is generated. The design still calls for guidance, and the useful content is that the automatic sealing has usually already happened: the court must seal most juvenile records within 30 days of the minor's 18th birthday or of the court's release of jurisdiction, whichever is later, excluding traffic offences, Class A and B felonies against the person and first degree arson, with a five-year rule where the juvenile was charged as an adult. An adult record is a typed route mismatch to the adult routes."
  })
];
