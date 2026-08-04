// District of Columbia process guidance — automatic relief under the Second
// Chance Amendment Act.
//
// Two routes, both `process_guidance`, both with nothing for the participant to
// file. D.C. Code § 16-802 expunges records of offences that were later
// decriminalized, legalized or held unconstitutional, and pre-2015 simple
// marijuana possession. D.C. Code § 16-805 seals non-convictions and qualifying
// misdemeanour convictions after ten years. Both are mandatory on the Court.
//
// The single most important fact about both of them is that they are not
// happening yet.
//
// The statutes authorize automatic relief. The Superior Court's own current
// public guidance says that no cases are presently being automatically sealed
// or expunged. The adopted design is explicit that this is what makes these
// tracks guidance and verification rather than a packet, and that the product
// must not promise completed automatic relief. So neither artifact tells a
// participant their record has been cleared, or will be by a particular date
// they can rely on. Each one says what the statute requires, what the Court has
// actually said, how to check the record yourself, and where to go instead
// while nothing is arriving — which is the honest and the useful thing to say.
//
// Vocabulary. The District expunges under § 16-802 and seals under § 16-805.
// They are different remedies with different consequences and different
// eligibility, and this module never uses one word for the other. That is the
// opposite of Michigan, where "set aside" is the only correct term and
// "expunge" is prohibited.
//
// One routing trap is called out because the design calls it out: the
// seventeen-category exclusion list at § 16-805(b) applies to AUTOMATIC
// sealing. It is not a bar on motion sealing of a conviction. A participant
// whose offence is on that list is out of the automatic route and still has a
// motion route, and the guidance says so rather than reading the list as a
// dead end.
//
// What these templates never do:
//
//   - turn guidance into a court filing. There is no motion, no proposed order,
//     no signature block and no service list on either of them;
//   - give legal advice, or tell a participant whether they qualify;
//   - promise that relief has happened or will happen by a given date;
//   - treat the § 16-805(b) automatic-sealing exclusions as barring a motion;
//   - assert anything about Superior Court Administrative Order 25-11, which
//     governs the reports and lists that substitute for individual orders in
//     high-volume cases and which this repository does not hold. It is recorded
//     as an open item on both tracks and nothing here depends on its contents.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. The
// District of Columbia is not an enabled jurisdiction and this job does not
// enable one. The District's motion routes — actual-innocence expungement under
// § 16-803 and correction of a misattributed arrest under § 16-806(g) — are a
// separate job and are untouched here.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

/** No component here is visually or legally approved. */
const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/**
 * What the Court has actually said, quoted in substance on both artifacts.
 *
 * Carried as one constant because it is the fact that decides what these two
 * routes are, and a future edit that softened it on one artifact and not the
 * other would leave one of them promising relief that is not arriving.
 */
const NOT_HAPPENING_YET =
  "The law says this is automatic. It is not happening yet. The Superior Court's current public guidance says that no cases are presently being automatically sealed or expunged, so do not expect your record to change on its own today, and do not tell an employer that it has.";

const DEADLINE_NOTE =
  "The Court's statutory deadline is 1 October 2027, or within 90 days after your case ended, whichever is later. A deadline on the Court is not a promise about any particular case, and it is not a date you can rely on for a job application.";

const CHECK_YOUR_OWN_RECORD =
  "Check the record yourself rather than assuming. Look yourself up the way an employer would, and ask the Superior Court Criminal Division what its records show for your case number.";

const DC_SOURCES: readonly string[] = [
  "D.C. Code § 16-802, automatic expungement, as enacted by the Second Chance Amendment Act of 2022 (D.C. Law 24-284) and amended by D.C. Law 25-175.",
  "D.C. Code § 16-805, automatic sealing, as amended by D.C. Law 25-175 and D.C. Law 26-52.",
  "Superior Court of the District of Columbia, Criminal Division, sealing and expungement public guidance."
];

const DC_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge or seal anything, and cannot make the Court or an agency act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law says; it is not legal advice.",
  "LegalEase does not obtain, inspect or hold your record. You look yourself up.",
  "LegalEase cannot tell you when your case will be reached. No date on this page is a promise about your case."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer takes the participant outside self-help entirely.
 *
 * Both District automatic routes carry the same two hard stops, and both are
 * about consequences this lane must not touch rather than about eligibility.
 */
export class DistrictOfColumbiaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "DistrictOfColumbiaGuidanceStopError";
  }
}

/**
 * Raised where an honest answer puts the participant on a different District
 * route rather than out of the system.
 *
 * Carries the destination, because being outside the automatic route is
 * routinely not the end: the § 16-805(b) exclusion list bars automatic sealing
 * and not a motion, and a record that is not within § 16-802 may still be
 * within a motion route.
 */
export class DistrictOfColumbiaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "DistrictOfColumbiaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class DistrictOfColumbiaGuidanceBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "DistrictOfColumbiaGuidanceBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

export const DC_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Where the record lives. Only a District record is within these sections. */
export const DC_RECORD_JURISDICTIONS: Readonly<Record<string, string>> = {
  district_of_columbia: "a District of Columbia record",
  federal_military_tribal_or_other_state: "federal_military_tribal_or_other_state"
};

/** § 16-805 reaches non-convictions and qualifying misdemeanour convictions. */
export const DC_SEALING_OUTCOMES: Readonly<Record<string, string>> = {
  non_conviction:
    "the case was terminated by the prosecutor, or reached a final disposition that did not result in a conviction or an acquittal by reason of insanity under D.C. Code § 24-501",
  misdemeanor_conviction: "the case ended in a misdemeanour conviction"
};

/**
 * Whether the offence is on the § 16-805(b) list.
 *
 * `unsure` is an approved answer and routes to verification rather than being
 * guessed. Whether a particular offence falls in one of the seventeen
 * categories is a legal judgment, and getting it wrong in either direction
 * misleads: a wrong "no" promises automatic sealing that will not come, and a
 * wrong "yes" would send someone away from a route they have.
 */
export const DC_EXCLUSION_LIST_ANSWERS: Readonly<Record<string, string>> = {
  not_on_the_list: "not_on_the_list",
  on_the_list: "on_the_list",
  unsure: "unsure"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new DistrictOfColumbiaGuidanceBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/** The two hard stops both District automatic routes share. */
function applySharedStops(trackId: string, facts: Record<string, unknown>): void {
  const where = branch(trackId, "recordJurisdiction", DC_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (where.value !== "district_of_columbia") {
    throw new DistrictOfColumbiaGuidanceStopError(
      trackId,
      "record_is_not_a_district_record",
      "D.C. Code § 16-802 and § 16-805 reach District of Columbia records. A federal, military, tribal or other-jurisdiction record is outside both, and a different jurisdiction's process governs it.",
      "the jurisdiction that holds the record"
    );
  }

  const consequences = branch(
    trackId,
    "collateralConsequencesInPlay",
    DC_YES_NO,
    facts.collateralConsequencesInPlay
  );
  if (consequences.resolved) {
    throw new DistrictOfColumbiaGuidanceStopError(
      trackId,
      "collateral_consequences_in_play",
      "Immigration, firearm, licensing, security clearance, childcare, healthcare or law enforcement employment consequences turn on facts this guidance does not reach, and getting them wrong is not recoverable.",
      "a lawyer, before relying on anything about this record"
    );
  }
}

/**
 * Validates participant answers and routes to the right District mechanism.
 *
 * Fails closed on an answer outside a closed list, stops outright where the
 * record is outside the District or where collateral consequences are in play,
 * and raises a typed route mismatch — carrying its destination — where an
 * honest answer puts the participant on a motion route instead.
 */
export function deriveDistrictOfColumbiaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  applySharedStops(trackId, facts);
  const derived: Record<string, unknown> = { ...facts };

  if (trackId === "dc_auto_expungement") {
    const decriminalized = branch(trackId, "offenceDecriminalized", DC_YES_NO, facts.offenceDecriminalized);
    const marijuana = branch(
      trackId,
      "marijuanaPossessionPre2015",
      DC_YES_NO,
      facts.marijuanaPossessionPre2015
    );
    if (!decriminalized.resolved && !marijuana.resolved) {
      throw new DistrictOfColumbiaRouteMismatchError(
        trackId,
        "not_within_automatic_expungement",
        "D.C. Code § 16-802 reaches records of an offence that was later decriminalized, legalized or held unconstitutional, and simple possession of marijuana before 15 February 2015. A record that is neither is outside the automatic expungement route.",
        "the automatic sealing route under § 16-805, or a motion route"
      );
    }
    branch(trackId, "recordStillVisible", DC_YES_NO, facts.recordStillVisible);
  }

  if (trackId === "dc_auto_sealing") {
    const outcome = branch(trackId, "caseOutcome", DC_SEALING_OUTCOMES, facts.caseOutcome);
    derived.caseOutcomeAllegation = outcome.resolved;

    const exclusion = branch(
      trackId,
      "offenceOnExclusionList",
      DC_EXCLUSION_LIST_ANSWERS,
      facts.offenceOnExclusionList
    );
    if (exclusion.value === "on_the_list") {
      throw new DistrictOfColumbiaRouteMismatchError(
        trackId,
        "offence_on_the_automatic_sealing_exclusion_list",
        "The seventeen categories at D.C. Code § 16-805(b) are excluded from AUTOMATIC sealing. That list does not bar a motion to seal, so this is a change of route rather than the end of one.",
        "motion sealing"
      );
    }
    if (exclusion.value === "unsure") {
      throw new DistrictOfColumbiaRouteMismatchError(
        trackId,
        "exclusion_list_membership_unknown",
        "Whether an offence falls within one of the seventeen categories at § 16-805(b) is a legal judgment, and guessing it in either direction misleads. It is checked against the offence and statute section on the court record before this guidance is relied on.",
        "verification of the offence and statute section, then legal aid if it is still unclear"
      );
    }

    // The ten-year period runs from completion of sentence, so a misdemeanour
    // conviction cannot be placed on the timeline without that date.
    if (outcome.value === "misdemeanor_conviction") {
      const completion = String(facts.sentenceCompletionDate ?? "").trim();
      if (!completion) {
        throw new DistrictOfColumbiaRouteMismatchError(
          trackId,
          "sentence_completion_date_missing",
          "Automatic sealing of a misdemeanour conviction runs from ten years after completion of the sentence, so the completion date is what places the case on the timeline.",
          "the court record, for the date the sentence was completed"
        );
      }
    }
    branch(trackId, "recordStillVisible", DC_YES_NO, facts.recordStillVisible);
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

export const DISTRICT_OF_COLUMBIA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // =========================================================================
  // dc_auto_expungement — D.C. Code § 16-802
  // =========================================================================
  "dc-auto-expungement-guidance": {
    templateId: "dc-auto-expungement-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Automatic expungement of a decriminalized offence or pre-2015 marijuana possession",
    whyNotAFiling:
      "D.C. Code § 16-802 puts this duty on the Court, not on you. There is no motion, no form, no fee and nothing for you to sign, so nothing is filed and no petition is generated. This page explains what the law requires, what the Court has actually said about it, and what to do while you wait.",
    processType: "automatic",
    prerequisites: [
      "The record is a District of Columbia record.",
      "The record relates only to an offence that has since been decriminalized, legalized, or held unconstitutional by the D.C. Court of Appeals or the Supreme Court; or only to simple possession of any quantity of marijuana under D.C. Code § 48-904.01(d)(1) before 15 February 2015."
    ],
    documentsToObtain: [
      "Your own background check, run the way an employer would run it.",
      "The court record for your case number, from the Superior Court Criminal Division."
    ],
    participantDataToGather: [
      "The case number, and the offence and statute section as they appear on the court record.",
      "Whether the offence has since been decriminalized, legalized or held unconstitutional.",
      "Whether the charge was simple possession of marijuana before 15 February 2015.",
      "Whether the record still appears when you look yourself up."
    ],
    officialDestination: {
      name: "The Superior Court of the District of Columbia, and the agencies holding the record",
      detail:
        "There is nothing to file. The Court expunges; the agencies act on what the Court sends them. Your part is to check whether it has happened."
    },
    actionSequence: [
      NOT_HAPPENING_YET,
      DEADLINE_NOTE,
      CHECK_YOUR_OWN_RECORD,
      "If the record is gone, you are done. Nothing further is needed and there is nothing to pay.",
      "If it is still there, that is expected right now rather than a sign something went wrong with your case in particular.",
      "While you wait, ask whether a motion route reaches your record sooner. A motion is a different process with its own requirements, and it does not depend on the automatic route arriving.",
      "The prosecutor can contest an automatic expungement. Under § 16-802 the prosecutor may file a motion, which may be made without notice to you, either to keep and sequester the record for a limited period or to argue that you do not qualify, on clear and convincing evidence. If that happens, it stops being a route you handle alone."
    ],
    submissionMethod: "There is nothing to submit. No application exists for this route.",
    fees: "None. There is no fee, because there is nothing to file.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "You are not told when a record is expunged automatically. Looking yourself up is how you find out.",
      "A prosecutor's motion to contest may be made without notice to you."
    ],
    expectedNextStage:
      "The record no longer appears when you look yourself up. Until then, treat the automatic route as pending rather than done.",
    legalEaseCanPrepare: [
      "This explanation of what § 16-802 requires and what the Court has said about it.",
      "A plain list of what to check and where to check it.",
      "The routing to a motion route where one may reach your record sooner."
    ],
    legalEaseCannotPerform: DC_CANNOT_PERFORM,
    escalationTriggers: [
      "The record is federal, military, tribal, or from another jurisdiction.",
      "Immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play.",
      "The prosecutor files a motion to retain and sequester the record, or to contest that you qualify.",
      "You need the record cleared by a date, for a job or an application. The automatic route cannot be relied on for that."
    ],
    officialSourceReferences: DC_SOURCES
  },

  // =========================================================================
  // dc_auto_sealing — D.C. Code § 16-805
  // =========================================================================
  "dc-auto-sealing-guidance": {
    templateId: "dc-auto-sealing-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName:
      "Automatic sealing of a non-conviction, or of a misdemeanour conviction after ten years",
    whyNotAFiling:
      "D.C. Code § 16-805 puts this duty on the Court, not on you. There is no motion, no form, no fee and nothing for you to sign — and on this route there is no prosecutor or victim objection step either. Nothing is filed and no petition is generated. This page explains what the law requires, what the Court has actually said about it, and what to do while you wait.",
    processType: "automatic",
    prerequisites: [
      "The record is a District of Columbia record.",
      "Either the case ended without a conviction and without an acquittal by reason of insanity under D.C. Code § 24-501, or it ended in a misdemeanour conviction and at least ten years have passed since you completed the sentence.",
      "The offence is not in one of the seventeen categories that D.C. Code § 16-805(b) excludes from automatic sealing."
    ],
    documentsToObtain: [
      "Your own background check, run the way an employer would run it.",
      "The court record for your case number, from the Superior Court Criminal Division, showing the offence, the statute section and how the case ended.",
      "For a misdemeanour conviction, the record of when you completed the sentence."
    ],
    participantDataToGather: [
      "The case number, and the offence and statute section as they appear on the court record.",
      "How the case ended: without a conviction, or in a misdemeanour conviction.",
      "For a conviction, the date you completed the sentence.",
      "Whether the record still appears when you look yourself up."
    ],
    officialDestination: {
      name: "The Superior Court of the District of Columbia, and the agencies holding the record",
      detail:
        "There is nothing to file. The Court seals; the agencies act on what the Court sends them. Your part is to check whether it has happened."
    },
    actionSequence: [
      NOT_HAPPENING_YET,
      "For a case that ended without a conviction, the Court's deadline is 1 October 2027, or within 90 days after your case ended, whichever is later. For a misdemeanour conviction, it is 1 October 2027, or within 90 days after the ten-year period expires, whichever is later. A deadline on the Court is not a promise about any particular case.",
      CHECK_YOUR_OWN_RECORD,
      "Check the offence and the statute section on the court record against the seventeen categories § 16-805(b) excludes. The list turns on the exact section, not on what the offence is called.",
      "If your offence is on that list, you are outside AUTOMATIC sealing — but that list does not bar a motion to seal. Ask about motion sealing rather than treating the list as the end of the road.",
      "If the record is gone, you are done. Nothing further is needed and there is nothing to pay.",
      "If it is still there, that is expected right now rather than a sign something went wrong with your case in particular.",
      "While you wait, ask whether a motion route reaches your record sooner. A motion is a different process with its own requirements, and it does not depend on the automatic route arriving."
    ],
    submissionMethod: "There is nothing to submit. No application exists for this route.",
    fees: "None. There is no fee, because there is nothing to file.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "There is no prosecutor or victim objection step on this route.",
      "You are not told when a record is sealed automatically. Looking yourself up is how you find out."
    ],
    expectedNextStage:
      "The record no longer appears when you look yourself up. Until then, treat the automatic route as pending rather than done.",
    legalEaseCanPrepare: [
      "This explanation of what § 16-805 requires and what the Court has said about it.",
      "A plain list of what to check, including the offence and statute section the § 16-805(b) list turns on.",
      "The routing to motion sealing, which the § 16-805(b) exclusions do not bar."
    ],
    legalEaseCannotPerform: DC_CANNOT_PERFORM,
    escalationTriggers: [
      "The record is federal, military, tribal, or from another jurisdiction.",
      "Immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play.",
      "It is not clear whether the offence falls within one of the seventeen categories at § 16-805(b).",
      "You need the record cleared by a date, for a job or an application. The automatic route cannot be relied on for that."
    ],
    officialSourceReferences: DC_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!DISTRICT_OF_COLUMBIA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no District guidance template ${templateId} is registered.`);
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

/** Asked on both routes: the two shared hard stops, and the visibility check. */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label: "Is this a District of Columbia record, or a federal, military, tribal or other state record?",
    required: true
  },
  {
    key: "collateralConsequencesInPlay",
    label:
      "Are immigration, firearm, licensing, security clearance, childcare, healthcare or law enforcement employment consequences in play?",
    required: true
  },
  { key: "caseNumber", label: "Case number", required: true },
  {
    key: "recordStillVisible",
    label: "Does the record still appear when you or an employer look you up?",
    required: true
  }
];

function districtTrack(input: {
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
    jurisdiction: "DC",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "superior_court_criminal_division",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(input.trackId, input.componentId, input.templateId),
    requiredInputs: [...SHARED_INPUTS, ...input.extraInputs],
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

export const DISTRICT_OF_COLUMBIA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  districtTrack({
    trackId: "dc_auto_expungement",
    publicName: "Automatic expungement",
    mechanism: "automatic_expungement_decriminalized_or_pre_2015_marijuana",
    authority: "D.C. Code § 16-802",
    recordTypes: ["citation", "arrest", "charge", "conviction"],
    dispositions: [
      "records related only to an offense that has since been decriminalized, legalized, or held unconstitutional by the D.C. Court of Appeals or the Supreme Court",
      "records related only to simple possession of any quantity of marijuana under § 48-904.01(d)(1) before February 15, 2015"
    ],
    componentId: "dc_auto_expungement-process-guidance-1",
    templateId: "dc-auto-expungement-guidance",
    extraInputs: [
      {
        key: "offenceDecriminalized",
        label: "Was the offence later decriminalized, legalized, or held unconstitutional?",
        required: true
      },
      {
        key: "marijuanaPossessionPre2015",
        label: "Was this simple possession of marijuana before 15 February 2015?",
        required: true
      }
    ],
    assembledPacketName: "Automatic-Expungement-Verification",
    assembledPacketTitle: "Automatic expungement of a decriminalized offence or pre-2015 marijuana possession",
    customerDeliverableDescription:
      "A guidance sheet explaining that § 16-802 expungement is the Court's duty with nothing for the participant to file, that it is not happening yet, how to check the record, and where to go while it has not arrived.",
    notes:
      "Mandatory on the Court but subject to the prosecutor's contest right, which may be exercised without notice to the participant. The artifact never promises completed relief: the Court's own current guidance says no cases are presently being automatically sealed or expunged, and that is what makes this route guidance rather than a packet."
  }),

  districtTrack({
    trackId: "dc_auto_sealing",
    publicName: "Automatic sealing of non-convictions and ten-year misdemeanour convictions",
    mechanism: "automatic_sealing_non_conviction_or_ten_year_misdemeanor",
    authority: "D.C. Code § 16-805",
    recordTypes: ["citation", "arrest", "charge", "conviction"],
    dispositions: [
      "citations, arrests, or charges where the case was terminated by the prosecutor or reached a final disposition and did not result in a conviction or an insanity acquittal under § 24-501",
      "misdemeanor convictions where at least 10 years have elapsed since completion of the sentence"
    ],
    componentId: "dc_auto_sealing-process-guidance-1",
    templateId: "dc-auto-sealing-guidance",
    extraInputs: [
      {
        key: "caseOutcome",
        label: "Did the case end without a conviction, or were you convicted of a misdemeanour?",
        required: true
      },
      {
        key: "offenceOnExclusionList",
        label:
          "Is the offence one of the seventeen categories § 16-805(b) excludes from automatic sealing? Check the statute section, not the offence name.",
        required: true
      },
      {
        key: "sentenceCompletionDate",
        label: "For a misdemeanour conviction, on what date did you complete the sentence?",
        required: false
      }
    ],
    assembledPacketName: "Automatic-Sealing-Verification",
    assembledPacketTitle: "Automatic sealing of a non-conviction, or of a misdemeanour conviction after ten years",
    customerDeliverableDescription:
      "A guidance sheet explaining that § 16-805 sealing is the Court's duty with nothing to file and no objection step, that it is not happening yet, how to check the offence against the § 16-805(b) exclusions, and that those exclusions do not bar a motion to seal.",
    notes:
      "The § 16-805(b) seventeen-category list bars AUTOMATIC sealing only. The adopted design is explicit that the routing must not read it as a bar on motion sealing, so an offence on the list produces a typed route mismatch to motion sealing rather than a dead end. An unsure answer routes to verification, because membership of the list is a legal judgment that misleads in either direction if guessed."
  })
];
