// District of Columbia Superior Court motion family — custom pleading.
//
// Six District of Columbia routes were assigned. Two are implemented here.
// Four are registered as explicit typed stops, because the normalized track
// does not supply a complete pleading specification for any of them and
// building one would mean inventing local language. See DC_BLOCKED_TRACKS.
//
// Vocabulary. The District uses three different remedies and this module keeps
// them apart, because collapsing them would misdescribe the relief on the face
// of a filing:
//
//   expungement  D.C. Code § 16-803, on grounds of actual innocence. The
//                record is expunged.
//   sealing      D.C. Code § 16-806. A different remedy, on different grounds,
//                with a different standard. None of the sealing routes is
//                implemented here.
//   correction   D.C. Code § 16-806(g). Corrects publicly available records
//                rather than sealing them, and the motion says so.
//
// This is the opposite of the Georgia family, where "expunge" is prohibited
// vocabulary. The District genuinely expunges under § 16-803, so the word is
// correct there and wrong everywhere else in this module.
//
// Architecture. The Mississippi custom-pleading and final-PDF architecture is
// reused unchanged: the `PleadingTemplate` contract, `CustomPleadingRenderer`,
// the packet resolver, the fulfilment lifecycle and the packet assembler. No
// Mississippi, Maryland or Georgia file is touched, and no shared generated
// registry is edited.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. The
// District of Columbia is not an enabled jurisdiction and this job does not
// enable one; wiring the pack into the aggregate registry is the integration
// captain's step, not a worker's.
//
// Both implemented tracks are `technicalFixture: true` and
// `runtimeDisabled: true` on purpose. Counsel approved the legal design with
// limitations, not the produced documents, so neither may fulfil a real
// participant request.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED MOVANT — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

/** No component here is visually or legally approved. */
const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

// ---------------------------------------------------------------------------
// The four typed stops
// ---------------------------------------------------------------------------

/**
 * Raised when an assigned District of Columbia track cannot produce a filing.
 *
 * A typed error rather than a missing registry entry. "Unknown track" and
 * "known track whose legal design is incomplete" are different facts, and a
 * caller that cannot tell them apart will eventually treat the second as the
 * first and generate a motion nobody specified.
 */
export class DistrictOfColumbiaTrackUnavailableError extends Error {
  constructor(
    readonly trackId: string,
    readonly reason: string,
    readonly openQuestions: readonly string[]
  ) {
    super(reason);
    this.name = "DistrictOfColumbiaTrackUnavailableError";
  }
}

/**
 * Four of the six assigned routes are blocked, and all four are blocked on
 * legal design rather than on engineering.
 *
 * Three of them turn on the same unresolved fact: the current codification of
 * § 16-806 carries temporary amendments that expire on 11 September 2026, and
 * nobody has established which subsections revert. A sealing motion drafted
 * today would cite a subsection that may not exist when it is filed. The
 * fourth has no determined packet at all.
 *
 * None of these is a gap this job may close. Choosing which subsections
 * survive, or what a Youth Rehabilitation Act set-aside motion contains, is
 * legal design; this is an implementation job.
 */
export const DC_BLOCKED_TRACKS: Readonly<
  Record<string, { reason: string; openQuestions: readonly string[]; unblockedBy: string }>
> = Object.freeze({
  dc_seal_conviction: {
    reason:
      "dc_seal_conviction has no complete pleading specification: its eligibility branch depends on an offense-severity mapping this repository does not hold, and on an unresolved statutory reversion.",
    openQuestions: [
      "An authoritative, machine-usable source for Offense Severity Groups 1, 2 and 3 as of 10 March 2023 — the Master Grid mapping. Without it the eligibility branch cannot be computed, and guessing an offence's group would decide a participant's eligibility on invented data.",
      "What expires on 11 September 2026, and which subsections of § 16-806 revert."
    ],
    unblockedBy:
      "A committed Master Grid mapping for Offense Severity Groups 1 to 3, and a recorded determination of which § 16-806 subsections survive 11 September 2026."
  },
  dc_seal_fugitive: {
    reason:
      "dc_seal_fugitive has no complete pleading specification: the § 16-806 subsections it would cite are subject to an unresolved reversion.",
    openQuestions: ["What expires on 11 September 2026, and which subsections of § 16-806 revert."],
    unblockedBy:
      "A recorded determination of which § 16-806 subsections survive 11 September 2026."
  },
  dc_seal_nonconviction: {
    reason:
      "dc_seal_nonconviction has no complete pleading specification: the route it would plead may not exist at filing time.",
    openQuestions: [
      "What expires on 11 September 2026. The current codification of § 16-806 carries temporary amendments with that expiration date, and the permanent codification omits the § 16-806(a)(1)(B)(i) route that lets a person move to seal a non-conviction for an offence not listed in § 16-805(b) before 1 October 2027. Confirm which subsections revert on 11 September 2026, and whether § 16-806(i)(7) is the only temporary piece."
    ],
    unblockedBy:
      "A recorded determination of which § 16-806 subsections survive 11 September 2026, including whether the (a)(1)(B)(i) route persists."
  },
  dc_yra_set_aside: {
    reason:
      "dc_yra_set_aside has no determined packet. The legal design records its packet components as undetermined, so there is nothing to render.",
    openQuestions: [
      "Section 24-903(c)(2) factors and current Superior Court practice for Youth Rehabilitation Act set-aside motions.",
      "Service and response mechanics for a set-aside motion.",
      "Whether the set-aside and the sealing motion are filed together or in sequence.",
      "Whether the Superior Court has any form or standing practice for these motions."
    ],
    unblockedBy:
      "A drafted packet specification for dc_yra_set_aside naming its components, its service mechanics and its relationship to the sealing motion."
  }
});

export const DC_BLOCKED_TRACK_IDS: readonly string[] = Object.freeze(Object.keys(DC_BLOCKED_TRACKS));

/**
 * Fails closed for an assigned-but-blocked track.
 *
 * Call before resolving. Returns for the two implemented routes, throws for the
 * four that are not.
 */
export function assertDistrictOfColumbiaTrackImplemented(trackId: string): void {
  const blocked = DC_BLOCKED_TRACKS[trackId];
  if (blocked) {
    throw new DistrictOfColumbiaTrackUnavailableError(trackId, blocked.reason, blocked.openQuestions);
  }
}

// ---------------------------------------------------------------------------
// Participant facts
// ---------------------------------------------------------------------------

/** Raised when a participant answer is outside the approved closed list. */
export class DistrictOfColumbiaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "DistrictOfColumbiaBranchError";
  }
}

/**
 * Which sovereign prosecuted the case, as it appears in the caption.
 *
 * The District is prosecuted by two offices — the United States Attorney's
 * Office and the Office of the Attorney General — and the rule for deciding
 * which one holds a given case is an open question on both of these routes.
 * LegalEase does not decide it. The participant reads the caption off their own
 * charging papers and the motion reproduces it, which defers to the record
 * rather than resolving the question.
 */
export const DC_CAPTION_SOVEREIGNS: Readonly<Record<string, string>> = {
  united_states: "UNITED STATES OF AMERICA",
  district_of_columbia: "DISTRICT OF COLUMBIA"
};

/** How the case ended, as § 16-803 requires it to have ended. */
export const DC_CASE_OUTCOMES: Readonly<Record<string, string>> = {
  terminated_by_prosecutor: "the case was terminated by the prosecutor",
  final_disposition_without_conviction:
    "the case reached a final disposition that did not result in a conviction"
};

/**
 * The § 16-803 repeat-motion rule, as a closed list.
 *
 * A second motion may be filed no sooner than one year after the first is
 * resolved, a third and final no sooner than one year after the second, and a
 * motion on different grounds may be filed at any time. A participant inside a
 * waiting window is a self-help stop, not a packet.
 */
export const DC_PRIOR_MOTION_STATES: Readonly<Record<string, string>> = {
  none: "Movant has filed no previous motion under D.C. Code § 16-803 in this case.",
  one_resolved_over_a_year_ago:
    "Movant filed one previous motion under D.C. Code § 16-803 in this case, and more than one year has passed since it was resolved.",
  two_resolved_over_a_year_ago:
    "Movant filed two previous motions under D.C. Code § 16-803 in this case, and more than one year has passed since the second was resolved. This is the third and final motion.",
  different_grounds:
    "Movant has filed a previous motion under D.C. Code § 16-803 in this case, and this motion is made on different grounds."
};

/**
 * The two § 16-806(g) elements the movant attests to.
 *
 * Both are closed and both fail closed on the disqualifying answer. A movant
 * whose arrest was fingerprinted, or where the arrested person produced other
 * reliable identification, is outside the subsection, and generating the motion
 * anyway would put a false attestation in front of a court over their
 * signature.
 */
export const DC_FINGERPRINT_ANSWERS: Readonly<Record<string, string>> = {
  no_fingerprints_taken: "no fingerprints were taken at the arrest"
};

export const DC_OTHER_IDENTIFICATION_ANSWERS: Readonly<Record<string, string>> = {
  no_other_identification: "the person arrested presented no other reliable identification"
};

function branch(
  trackId: string,
  key: string,
  table: Readonly<Record<string, string>>,
  raw: unknown
): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  const resolved = table[value];
  if (!resolved) throw new DistrictOfColumbiaBranchError(trackId, key, value);
  return resolved;
}

/**
 * Derives the values the templates reference but the participant is never asked
 * for: the caption sovereign and the approved sentence for each closed-list
 * answer.
 *
 * Fails closed. An answer outside its approved list throws rather than
 * rendering an unreviewed sentence or leaving a placeholder on a court filing.
 */
export function deriveDistrictOfColumbiaFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  assertDistrictOfColumbiaTrackImplemented(trackId);

  const derived: Record<string, unknown> = {
    ...facts,
    captionSovereign: branch(trackId, "captionSovereign", DC_CAPTION_SOVEREIGNS, facts.captionSovereign)
  };

  if (trackId === "dc_innocence_expungement") {
    derived.caseOutcomeAllegation = branch(trackId, "caseOutcome", DC_CASE_OUTCOMES, facts.caseOutcome);
    derived.priorMotionAllegation = branch(
      trackId,
      "priorMotionState",
      DC_PRIOR_MOTION_STATES,
      facts.priorMotionState
    );
  }

  if (trackId === "dc_correct_misattributed_arrest") {
    derived.fingerprintAllegation = branch(
      trackId,
      "fingerprintsTaken",
      DC_FINGERPRINT_ANSWERS,
      facts.fingerprintsTaken
    );
    derived.otherIdentificationAllegation = branch(
      trackId,
      "otherIdentificationPresented",
      DC_OTHER_IDENTIFICATION_ANSWERS,
      facts.otherIdentificationPresented
    );
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const COURT_LINE = "SUPERIOR COURT OF THE DISTRICT OF COLUMBIA";
const DIVISION_LINE = "CRIMINAL DIVISION";

function caption(documentTitle: string) {
  return {
    courtLine: COURT_LINE,
    partyBlockLeft: [
      DIVISION_LINE,
      "",
      "{{captionSovereign}},",
      "",
      "v.",
      "",
      "{{movantName}},",
      "",
      "Movant."
    ],
    partyBlockRight: ["Case No. {{caseNumber}}", "", documentTitle]
  };
}

const SIGNATURE_BLOCK: readonly string[] = [
  "{{movantName}}, Movant, Pro Se",
  "{{mailingAddress}}",
  "{{contactPhone}}",
  "{{contactEmail}}",
  "Date: ______________________"
];

/** Participant-authored text is always introduced as the movant's own. */
const MOVANT_STATEMENT_PREFIX = "Movant states, in Movant's own words:";

const MOVANT_STATEMENT_ATTRIBUTION =
  "The paragraph above is Movant's own statement. It was written by Movant and is reproduced without change.";

const CONFIRM_FILING_METHOD =
  "Before filing, confirm with the Criminal Division how the Court accepts filings of this kind, and whether the Seal Team requires anything further. No fee is identified for this motion, but confirm that with the clerk rather than relying on this packet.";

/**
 * Served on the prosecutor. The certificate rides on the motion itself rather
 * than as a separate component, because the adopted legal design gives each of
 * these routes exactly one packet component and inventing a second would be
 * inventing a packet.
 */
const CERTIFICATE_LINES: readonly string[] = [
  "I, {{movantName}}, certify that I delivered a true and correct copy of this motion to the prosecuting authority named below, on the date written below, by the method written below.",
  "",
  "Prosecuting authority served: {{prosecutingAuthorityName}}",
  "Address used: {{prosecutingAuthorityAddress}}",
  "Method of delivery: {{serviceMethod}}",
  "Date of delivery: ______________________"
];

export const DC_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  // =========================================================================
  // dc_innocence_expungement — D.C. Code § 16-803
  // =========================================================================
  "dc-innocence-expungement-motion": {
    templateId: "dc-innocence-expungement-motion",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("MOTION FOR EXPUNGEMENT"),
    title: "MOTION FOR EXPUNGEMENT ON GROUNDS OF ACTUAL INNOCENCE",
    preamble:
      "Movant, appearing without a lawyer, moves this Court under D.C. Code § 16-803 to expunge the records of this case on grounds of actual innocence, and states:",
    sections: [
      {
        heading: "I.  MOVANT AND CASE",
        numbered: true,
        paragraphs: [
          "Movant is {{movantName}}, date of birth {{dateOfBirth}}, who resides at {{mailingAddress}}.",
          "This motion concerns case number {{caseNumber}} in the Criminal Division of this Court. Movant was charged with {{chargeDescription}}.",
          "The arrest at issue was made on {{arrestDate}} by {{arrestingAgencyName}}.",
          "This case ended on {{dispositionDate}}: {{caseOutcomeAllegation}}."
        ]
      },
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "D.C. Code § 16-803 permits a person whose case was terminated by the prosecutor, or reached a final disposition that did not result in a conviction or an acquittal by reason of insanity under D.C. Code § 24-501, to move for expungement of the records of that case on grounds of actual innocence.",
          "This case did not result in a conviction and did not result in an acquittal by reason of insanity under D.C. Code § 24-501.",
          "Movant asks the Court to find, by a preponderance of the evidence, that the offence for which Movant was charged did not occur, or that Movant did not commit it. Movant makes no representation as to how the Court should resolve that question."
        ]
      },
      {
        heading: "III.  PREVIOUS MOTIONS",
        numbered: true,
        paragraphs: [
          "{{priorMotionAllegation}}",
          "D.C. Code § 16-803 permits a second motion no sooner than one year after the first is resolved, and a third and final motion no sooner than one year after the second, except that a motion made on different grounds may be filed at any time."
        ]
      },
      {
        heading: "IV.  MOVANT'S STATEMENT",
        numbered: false,
        paragraphs: [MOVANT_STATEMENT_PREFIX, "{{innocenceFacts}}", MOVANT_STATEMENT_ATTRIBUTION]
      },
      {
        heading: "V.  SUPPORTING MATERIAL",
        numbered: false,
        paragraphs: [
          "Movant carries the burden on this motion and supplies the supporting material with it: a statement of points and authorities, and any exhibits, affidavits and supporting documents Movant relies on. Those attachments are Movant's own. LegalEase has not seen them, does not collect, inspect or authenticate them, and makes no judgment about whether the showing is sufficient.",
          "An acquittal or a dismissal does not by itself establish a presumption of innocence. D.C. Code § 16-803(e) says so, and this motion does not suggest otherwise.",
          CONFIRM_FILING_METHOD
        ]
      }
    ],
    prayer: [
      "WHEREFORE, Movant asks the Court to expunge the records of case number {{caseNumber}} under D.C. Code § 16-803."
    ],
    verification:
      "Movant states that the facts set out above are true and correct to the best of Movant's knowledge and belief.",
    signatureBlock: SIGNATURE_BLOCK,
    certificateOfService: CERTIFICATE_LINES
  },

  // =========================================================================
  // dc_correct_misattributed_arrest — D.C. Code § 16-806(g)
  // =========================================================================
  "dc-correct-misattributed-arrest-motion": {
    templateId: "dc-correct-misattributed-arrest-motion",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("MOTION TO CORRECT ARREST RECORD"),
    title: "MOTION TO CORRECT A MISATTRIBUTED ARREST RECORD",
    preamble:
      "Movant, appearing without a lawyer, moves this Court under D.C. Code § 16-806(g) to correct publicly available records of an arrest that was wrongly attributed to Movant, and states:",
    sections: [
      {
        heading: "I.  MOVANT AND CASE",
        numbered: true,
        paragraphs: [
          "Movant is {{movantName}}, date of birth {{dateOfBirth}}, who resides at {{mailingAddress}}.",
          "This motion concerns case number {{caseNumber}} in the Criminal Division of this Court, and the arrest made on {{arrestDate}} by {{arrestingAgencyName}}.",
          "That arrest is attributed to Movant in publicly available records. Movant was not the person arrested."
        ]
      },
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "D.C. Code § 16-806(g) provides for correction of publicly available records where an arrest has been attributed to a person who attests under oath that they were incorrectly identified or named, no fingerprints were taken at the arrest, and the person arrested presented no other reliable identification.",
          "As far as Movant knows, {{fingerprintAllegation}}.",
          "As far as Movant knows, {{otherIdentificationAllegation}}."
        ]
      },
      {
        heading: "III.  MOVANT'S STATEMENT",
        numbered: false,
        paragraphs: [MOVANT_STATEMENT_PREFIX, "{{misidentificationFacts}}", MOVANT_STATEMENT_ATTRIBUTION]
      },
      {
        heading: "IV.  WHAT THIS MOTION DOES",
        numbered: false,
        paragraphs: [
          "This motion asks the Court to correct publicly available records. It does not ask the Court to seal them, and D.C. Code § 16-806(g) is not a sealing provision.",
          "The attestation below, which Movant signs, is sworn. Whether the Criminal Division also requires it to be notarised is not settled by the sources this packet was drafted from, so confirm that with the clerk before filing rather than assuming either way.",
          CONFIRM_FILING_METHOD
        ]
      }
    ],
    prayer: [
      "WHEREFORE, Movant asks the Court to correct the publicly available records of the arrest described above so that they are no longer attributed to Movant."
    ],
    // § 16-806(g) turns on an attestation under oath, so the oath sits directly
    // above the one signature rule on the document rather than in a section of
    // its own with a second rule. A motion with two places to sign is a motion
    // signed in the wrong one, and here the wrong one would leave the sworn
    // statement unsigned.
    verification:
      "Movant attests under oath that Movant was incorrectly identified or named in the records of the arrest described above, and that the statements made in this motion are true.",
    signatureBlock: SIGNATURE_BLOCK,
    certificateOfService: CERTIFICATE_LINES
  }
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

type ComponentSpec = {
  /** The component id from the adopted legal design. Not derived — pinned. */
  componentId: string;
  templateId: string;
};

function packetSet(trackId: string, spec: ComponentSpec): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId: spec.componentId,
        role: "primary_filing",
        outputStrategy: "custom_pleading",
        rendererStrategy: "custom_pleading",
        templateId: spec.templateId,
        // A custom pleading has no official source binary, and inventing one
        // would assert a source identity that does not exist.
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

/** Asked on both implemented routes. */
const COMMON_INPUTS: readonly RequiredInput[] = [
  { key: "movantName", label: "Full legal name", required: true },
  { key: "dateOfBirth", label: "Date of birth", required: true },
  { key: "mailingAddress", label: "Mailing address", required: true },
  { key: "caseNumber", label: "Case number", required: true },
  {
    key: "captionSovereign",
    label: "Which sovereign is named first in the caption on your case papers?",
    required: true
  },
  { key: "arrestDate", label: "Date of the arrest", required: true },
  { key: "arrestingAgencyName", label: "Arresting agency", required: true },
  { key: "prosecutingAuthorityName", label: "Prosecuting authority", required: true },
  { key: "prosecutingAuthorityAddress", label: "Prosecuting authority's address", required: true },
  { key: "serviceMethod", label: "How the copy will be delivered", required: true },
  { key: "contactPhone", label: "Telephone number", required: false },
  { key: "contactEmail", label: "Email address", required: false }
];

function districtOfColumbiaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  packetSet: PacketSet;
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
    outputStrategy: "custom_pleading",
    packetSet: input.packetSet,
    requiredInputs: [...COMMON_INPUTS, ...input.extraInputs],
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "custom_pleading"
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

export const DISTRICT_OF_COLUMBIA_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  districtOfColumbiaTrack({
    trackId: "dc_innocence_expungement",
    publicName: "Expungement by motion, actual innocence",
    mechanism: "actual_innocence_expungement_motion",
    authority: "D.C. Code § 16-803",
    recordTypes: ["citation", "arrest", "charge"],
    dispositions: [
      "the case was terminated by the prosecutor or reached a final disposition and did not result in a conviction or an insanity acquittal under § 24-501"
    ],
    packetSet: packetSet("dc_innocence_expungement", {
      componentId: "dc_innocence_expungement-primary-filing-1",
      templateId: "dc-innocence-expungement-motion"
    }),
    extraInputs: [
      { key: "chargeDescription", label: "What you were charged with", required: true },
      { key: "caseOutcome", label: "How the case ended", required: true },
      { key: "dispositionDate", label: "Date the case ended", required: true },
      {
        key: "innocenceFacts",
        label: "In your own words, why did the offence not occur, or why were you not the person who committed it?",
        required: true
      },
      {
        key: "priorMotionState",
        label: "Have you filed a motion like this before, and when was it resolved?",
        required: true
      }
    ],
    assembledPacketName: "Actual-Innocence-Expungement",
    assembledPacketTitle: "Motion for Expungement on Grounds of Actual Innocence",
    customerDeliverableDescription:
      "A motion to expunge the records of a case that did not end in a conviction, on grounds of actual innocence, with a certificate of service on the prosecutor. The movant attaches their own statement of points and authorities and supporting material.",
    notes:
      "One motion per case number. The movant carries the burden and supplies the supporting material; LegalEase does not judge whether the showing is sufficient. The § 16-803(e) warning that an acquittal or dismissal does not establish a presumption of innocence is carried on the face of the motion. The repeat-motion timing rule is a closed list and a participant inside a waiting window fails closed."
  }),

  districtOfColumbiaTrack({
    trackId: "dc_correct_misattributed_arrest",
    publicName: "Motion to correct a misattributed arrest record",
    mechanism: "misattributed_arrest_record_correction",
    authority: "D.C. Code § 16-806(g)",
    recordTypes: ["arrest"],
    dispositions: [
      "an arrest attributed to the person who attests under oath that they were incorrectly identified or named, where the agency took no fingerprints at arrest and the arrested person presented no other reliable identification"
    ],
    packetSet: packetSet("dc_correct_misattributed_arrest", {
      componentId: "dc_correct_misattributed_arrest-primary-filing-1",
      templateId: "dc-correct-misattributed-arrest-motion"
    }),
    extraInputs: [
      {
        key: "misidentificationFacts",
        label: "In your own words, why was this arrest wrongly attributed to you?",
        required: true
      },
      {
        key: "fingerprintsTaken",
        label: "As far as you know, did the agency take fingerprints at that arrest?",
        required: true
      },
      {
        key: "otherIdentificationPresented",
        label: "As far as you know, did the person arrested present any other reliable identification?",
        required: true
      }
    ],
    assembledPacketName: "Misattributed-Arrest-Correction",
    assembledPacketTitle: "Motion to Correct a Misattributed Arrest Record",
    customerDeliverableDescription:
      "A motion to correct publicly available records of an arrest wrongly attributed to the movant, carrying the sworn attestation § 16-806(g) requires, with a certificate of service on the prosecutor.",
    notes:
      "Corrects rather than seals, and the motion says so. Both statutory elements — no fingerprints taken at the arrest, and no other reliable identification presented — are closed lists with a single qualifying answer, so a participant outside the subsection fails closed rather than swearing to something untrue. Whether the Criminal Division requires notarisation in addition to the sworn attestation is unresolved; the motion says so instead of adding or omitting a notary block silently."
  })
];
