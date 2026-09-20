import { createHash } from "node:crypto";

import {
  ndDisqualifyingOffenseNotes,
  ndEligibilityRules,
  ndFeeNotes,
  ndFilingInstructions,
  ndPlainLanguage,
  ndRequiredFields,
  ndSafetyDisclaimer,
  ndWaitingPeriodNotes,
  northDakotaAll50BuildMetadata
} from "../index";

/**
 * North Dakota general conviction sealing under N.D.C.C. Chapter 12-60.1 —
 * the versioned Grade-A packet specification.
 *
 * WHY THIS ROUTE
 * --------------
 * Lane D was asked for a North Dakota route that actually requires participant
 * filing. Chapter 12-60.1 conviction sealing is one: the participant serves the
 * prosecuting attorney, then files a petition, a mandatory proposed order and a
 * proof of service with the clerk of the existing criminal case. Nothing about
 * the relief happens unless the participant files.
 *
 * The North Dakota non-conviction closing route under § 12-60.1-05 is NOT that
 * route and is not used here. Current authority classifies it non-filing:
 * decision `NATIONAL-2026-08-28-LA-IMM-03` carries `stage: automatic`,
 * `outcomeMode: automatic_relief`, `packetFamily: null`, and the signed
 * reclassification `ND-2026-08-28-NO-PARTICIPANT-FILING` moved it from
 * `paid_packet_intended` to `non_filing_guidance` for the reason
 * `no_participant_filing`. The same decision records that a disposition before
 * 2025-08-01 "takes the official petition and proposed order instead, which is
 * a service branch on this route and is not built" — an official-form branch,
 * not a composed pleading, and expressly out of scope. See
 * `docs/rcap/grade-a/north-dakota/ROUTE_SELECTION.md`.
 *
 * SOURCING
 * --------
 * Every operative sentence below is carried from authority already committed to
 * this repository: the ND state pack (compiled from the Nationwide inventory),
 * the compiled `ND-north-dakota` engine profile, and the committed Chapter
 * 12-60.1 pleading registry excerpts under
 * `data/rcap-all50/pleadings/north-dakota/`. Nothing here is new legal research.
 * Where a source is silent the silence is recorded in `sourceSilences` rather
 * than filled.
 */

// ---------------------------------------------------------------------------
// Eligibility grounds
// ---------------------------------------------------------------------------

export type NdSealingGroundId =
  | "misdemeanor_conviction"
  | "felony_conviction"
  | "unconditional_pardon";

export interface NdSealingGround {
  groundId: NdSealingGroundId;
  label: string;
  legalName: string;
  citation: string;
  /** Clean-period rule, verbatim from the state pack. */
  cleanPeriodRule: string;
  /** Years with no new conviction immediately before filing; null where none applies. */
  cleanPeriodYears: number | null;
}

/**
 * The three grounds N.D.C.C. § 12-60.1-02 states, in the order the state pack
 * states them. A ground is selected from governed facts, never asserted by a
 * caller and never defaulted.
 */
export const ND_SEALING_GROUNDS: NdSealingGround[] = [
  {
    groundId: "misdemeanor_conviction",
    label: "Misdemeanor conviction sealing under Chapter 12-60.1",
    legalName: "Petition to Seal a Misdemeanor Conviction (N.D.C.C. § 12-60.1-02(1)(a))",
    citation: "N.D.C.C. § 12-60.1-02(1)(a)",
    cleanPeriodRule: ndWaitingPeriodNotes.misdemeanorConvictionSealing,
    cleanPeriodYears: 3
  },
  {
    groundId: "felony_conviction",
    label: "Felony conviction sealing under Chapter 12-60.1",
    legalName: "Petition to Seal a Felony Conviction (N.D.C.C. § 12-60.1-02)",
    citation: "N.D.C.C. § 12-60.1-02",
    cleanPeriodRule: ndWaitingPeriodNotes.felonyConvictionSealing,
    cleanPeriodYears: 5
  },
  {
    groundId: "unconditional_pardon",
    label: "Conviction sealing supported by an unconditional gubernatorial pardon",
    legalName: "Petition to Seal a Pardoned Conviction (N.D.C.C. § 12-60.1-02)",
    citation: "N.D.C.C. § 12-60.1-02",
    cleanPeriodRule:
      "An unconditional pardon granted by the Governor can support a Chapter 12-60.1 sealing petition.",
    cleanPeriodYears: null
  }
];

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

/**
 * Bars on Chapter 12-60.1 sealing, verbatim from `ndDisqualifyingOffenseNotes`.
 * Each denies the route outright: an excluded matter is not a Chapter 12-60.1
 * matter, so no amount of clean period makes it one.
 */
export const ND_SEALING_EXCLUSIONS = [
  {
    id: "registration_offense",
    text: ndDisqualifyingOffenseNotes[0],
    citation: "N.D.C.C. § 12.1-32-15"
  },
  {
    id: "violence_or_intimidation_felony_in_firearm_disability_period",
    text: ndDisqualifyingOffenseNotes[1],
    citation: "N.D.C.C. Chapter 12-60.1"
  },
  {
    id: "impaired_driving_offense",
    text: ndDisqualifyingOffenseNotes[2],
    citation: "N.D.C.C. § 39-08-01.6"
  }
] as const;

export type NdSealingExclusionId = (typeof ND_SEALING_EXCLUSIONS)[number]["id"];

// ---------------------------------------------------------------------------
// Route resolution
// ---------------------------------------------------------------------------

export interface NdSealingRouteInput {
  /** "misdemeanor" | "felony" as established by screening. */
  offenseLevel?: string | null;
  /** True only where a conviction was entered on plea or finding of guilt. */
  convicted?: boolean | null;
  /** True where the Governor granted an unconditional pardon. */
  unconditionalPardon?: boolean | null;
  /** Whether the participant has been convicted of a new crime in the clean period. */
  newConvictionInCleanPeriod?: boolean | null;
  /** All terms of imprisonment and probation complete (§ 12-60.1-04(1)(c)). */
  imprisonmentAndProbationComplete?: boolean | null;
  /** All restitution paid (§ 12-60.1-04(1)(d)). */
  restitutionPaid?: boolean | null;
  exclusions?: readonly NdSealingExclusionId[] | null;
}

export type NdSealingRouteResolution =
  | {
    status: "eligible_to_file";
    groundId: NdSealingGroundId;
    specId: string;
    specVersion: string;
    reason: string;
  }
  | {
    status: "excluded";
    groundId: null;
    specId: null;
    exclusionIds: NdSealingExclusionId[];
    reason: string;
  }
  | {
    status: "unresolved";
    groundId: null;
    specId: null;
    reasonCode:
    | "conviction_not_established"
    | "offense_level_not_established"
    | "clean_period_not_established"
    | "clean_period_not_satisfied"
    | "statutory_findings_not_established";
    reason: string;
  };

/**
 * The single authority on whether a North Dakota matter may file a Chapter
 * 12-60.1 sealing petition, and on which ground.
 *
 * Fails closed everywhere: an unestablished conviction, an unestablished
 * offence level, an unestablished or unsatisfied clean period, and unestablished
 * § 12-60.1-04(1)(c)/(d) findings each return `unresolved` rather than a ground.
 * The pardon ground is checked first because an unconditional pardon supports a
 * petition on its own terms.
 */
export function resolveNdSealingRoute(input: NdSealingRouteInput): NdSealingRouteResolution {
  const exclusionIds = [...new Set(input.exclusions ?? [])].filter((id) =>
    ND_SEALING_EXCLUSIONS.some((exclusion) => exclusion.id === id)
  );
  if (exclusionIds.length > 0) {
    return {
      status: "excluded",
      groundId: null,
      specId: null,
      exclusionIds,
      reason: `Chapter 12-60.1 sealing does not reach this matter: ${exclusionIds
        .map((id) => ND_SEALING_EXCLUSIONS.find((e) => e.id === id)?.text ?? id)
        .join(" ")}`
    };
  }

  if (input.convicted !== true) {
    return {
      status: "unresolved",
      groundId: null,
      specId: null,
      reasonCode: "conviction_not_established",
      reason:
        "Chapter 12-60.1 conviction sealing requires a conviction entered on a guilty plea or a finding of guilt; that fact is not established for this matter."
    };
  }

  // § 12-60.1-04(1)(c) and (d) are court findings, not waiting periods, and the
  // petition alleges them. A matter that cannot allege them is not ready to file.
  if (input.imprisonmentAndProbationComplete !== true || input.restitutionPaid !== true) {
    return {
      status: "unresolved",
      groundId: null,
      specId: null,
      reasonCode: "statutory_findings_not_established",
      reason: ndWaitingPeriodNotes.sentenceCompletionNote
    };
  }

  const pardon = input.unconditionalPardon === true;
  const level = String(input.offenseLevel ?? "").trim().toLowerCase();
  const isMisdemeanor = /misdemeanor/.test(level);
  const isFelony = /felony/.test(level);

  if (!pardon && !isMisdemeanor && !isFelony) {
    return {
      status: "unresolved",
      groundId: null,
      specId: null,
      reasonCode: "offense_level_not_established",
      reason:
        "The clean period differs for a misdemeanor and a felony conviction, so the offence level must be established before a Chapter 12-60.1 petition can be composed."
    };
  }

  // The pardon ground carries no clean period of its own; the conviction grounds
  // do, and an unestablished clean period is not a satisfied one.
  if (!pardon) {
    if (input.newConvictionInCleanPeriod === undefined || input.newConvictionInCleanPeriod === null) {
      return {
        status: "unresolved",
        groundId: null,
        specId: null,
        reasonCode: "clean_period_not_established",
        reason: isFelony
          ? ndWaitingPeriodNotes.felonyConvictionSealing
          : ndWaitingPeriodNotes.misdemeanorConvictionSealing
      };
    }
    if (input.newConvictionInCleanPeriod === true) {
      return {
        status: "unresolved",
        groundId: null,
        specId: null,
        reasonCode: "clean_period_not_satisfied",
        reason: isFelony
          ? ndWaitingPeriodNotes.felonyConvictionSealing
          : ndWaitingPeriodNotes.misdemeanorConvictionSealing
      };
    }
  }

  const groundId: NdSealingGroundId = pardon
    ? "unconditional_pardon"
    : isFelony
      ? "felony_conviction"
      : "misdemeanor_conviction";
  const ground = ND_SEALING_GROUNDS.find((candidate) => candidate.groundId === groundId)!;

  return {
    status: "eligible_to_file",
    groundId,
    specId: ND_CHAPTER_12_60_1_SEALING_SPEC.specId,
    specVersion: ND_CHAPTER_12_60_1_SEALING_SPEC.specVersion,
    reason: ground.cleanPeriodRule
  };
}

// ---------------------------------------------------------------------------
// Source identities
// ---------------------------------------------------------------------------

export interface NdGradeASource {
  sourceId: string;
  corpusPath: string | null;
  fileName: string;
  sha256: string;
  role: string;
  /**
   * Whether the source bytes are present in this checkout. Recorded truthfully:
   * the Master Library extract is not mounted here, so the hashes below are
   * bound from two independent committed records that agree, and the bytes
   * themselves remain unheld. The Grade-A contract treats an unheld source as
   * missing proof, which is the correct fail-closed answer.
   */
  heldInRepository: boolean;
  corroboration: string[];
}

const researchGuide = northDakotaAll50BuildMetadata.officialFormInventory.find(
  (entry) => entry.fileName === "Sealing Criminal Records Research Guide.pdf"
);
const wilmaReference = northDakotaAll50BuildMetadata.resourcePacketInventory.find(
  (entry) => entry.fileName.startsWith("North Dakota Expungement")
);
if (!researchGuide || !wilmaReference) {
  throw new Error(
    "North Dakota Grade-A spec: the committed ND source inventory no longer carries the sealing research guide or the Wilma reference; the specification cannot bind a source identity it cannot see."
  );
}

export const ND_CHAPTER_12_60_1_SOURCES: NdGradeASource[] = [
  {
    sourceId:
      "ND__SUPPORT__SEALING-CRIMINAL-RECORDS-RESEARCH-GUIDE__sealing-criminal-records-or-closing-nonconviction__REV-UNKNOWN__EN.pdf",
    corpusPath:
      "STATES/ND/04_SUPPORTING_PROCESS/ND__SUPPORT__SEALING-CRIMINAL-RECORDS-RESEARCH-GUIDE__sealing-criminal-records-or-closing-nonconviction__REV-UNKNOWN__EN.pdf",
    fileName: researchGuide.fileName,
    sha256: researchGuide.sha256,
    role: "chapter_12_60_1_sealing_research_guide",
    heldInRepository: false,
    corroboration: [
      "data/rcap-all50/local-source-corpus-index.json",
      "src/lib/rcap/state-packs/north-dakota/all50-build-metadata.ts"
    ]
  },
  {
    sourceId: "ND__REFERENCE__WILMA__north-dakota-expungement-sealing-reference__REV-UNKNOWN__EN.rtf",
    corpusPath: null,
    fileName: wilmaReference.fileName,
    sha256: wilmaReference.sha256,
    role: "jurisdiction_reference_compiled_into_the_engine_profile",
    heldInRepository: false,
    corroboration: [
      "src/lib/rcap/state-packs/north-dakota/all50-build-metadata.ts",
      "src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json"
    ]
  }
];

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * What actually rendered the artifact, recorded as observed rather than copied
 * from the fulfillment registry.
 *
 * The registry's candidate record names the hosted worker image
 * `ghcr.io/roger-legalease/rcap-render-worker@sha256:67132df2…`. That is the
 * container that renders in the deployed pipeline; it is not what produced the
 * bytes in this lane, and claiming it would be the kind of unobserved binding
 * the Grade-A contract exists to prevent. The divergence is an exact captain
 * patch item, not something this lane resolves for itself.
 */
export const ND_GRADE_A_PROVIDER = {
  providerId: "legalease/nd-chapter-12-60-1-composer",
  rendererKind: "composed_pleading_packet_v1",
  rendererVersion: "1.0.0",
  composerModule: "src/lib/rcap/state-packs/north-dakota/grade-a/composer.ts",
  pleadingRendererModule: "src/lib/record-clearing/renderers/custom-pleading-renderer.ts",
  pdfRendererModule: "scripts/lib/nd-grade-a-packet-pdf.mjs",
  pdfLibraryVersion: "pdf-lib@1.17.1",
  compiledProfileId: "ND-north-dakota",
  compiledProfileVersion: "2026-06-19-source-conversion-1",
  compiledProfileCorpusSha256: "c205813b263764fe44648ba577d91e8fadb52b55974b7fe154495bbff1b8ede7"
} as const;

// ---------------------------------------------------------------------------
// Required facts
// ---------------------------------------------------------------------------

export interface NdGradeARequiredFact {
  factId: string;
  label: string;
  provenance: string;
  /** Grounds this fact is required for; empty means all grounds. */
  grounds?: NdSealingGroundId[];
  optional?: boolean;
}

/**
 * The petition's own content requirements are unusually explicit in North
 * Dakota: `ndFilingInstructions[4]` lists what the petition must include, and
 * the state pack's `ndRequiredFields` lists the fields per pathway. Both are
 * carried, and the fidelity assertion below keeps them carried.
 */
export const ND_CHAPTER_12_60_1_REQUIRED_FACTS: NdGradeARequiredFact[] = [
  { factId: "petitionerName", label: "Petitioner full legal name", provenance: "ndRequiredFields" },
  {
    factId: "petitionerAliases",
    label: "All other legal names and aliases",
    provenance: "ndFilingInstructions[4]: the petition must include all aliases",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  {
    factId: "addressHistory",
    label: "Address history from the offence date to the petition date",
    provenance: "ndFilingInstructions[4]",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  { factId: "courtName", label: "North Dakota court holding the criminal case", provenance: "ndRequiredFields" },
  { factId: "countyName", label: "County of the criminal case", provenance: "ndRequiredFields" },
  { factId: "caseNumber", label: "Case number of the criminal case", provenance: "ndRequiredFields" },
  { factId: "charge", label: "Charge of conviction", provenance: "ndRequiredFields" },
  {
    factId: "statuteSection",
    label: "N.D.C.C. section of the offence",
    provenance: "ndRequiredFields",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  {
    factId: "offenseLevel",
    label: "Offence level (misdemeanor or felony)",
    provenance: "ndRequiredFields; decides the clean period",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  { factId: "convictionDate", label: "Conviction or judgment date", provenance: "ndRequiredFields" },
  {
    factId: "sentenceCompletionDate",
    label: "Sentence and probation completion date",
    provenance: "ndRequiredFields; § 12-60.1-04(1)(c)",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  {
    factId: "restitutionStatus",
    label: "Restitution payment status",
    provenance: "ndRequiredFields; § 12-60.1-04(1)(d)",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  {
    factId: "newConvictionCheck",
    label: "New-conviction check across the applicable clean period",
    provenance: "ndRequiredFields; § 12-60.1-02 clean period",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  {
    factId: "fullCriminalHistory",
    label: "Complete criminal history (North Dakota, other states, federal court, foreign countries)",
    provenance: "ndFilingInstructions[4]",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  {
    factId: "pendingCharges",
    label: "All prior and pending charges, and all deferred, stayed or continued-for-dismissal matters",
    provenance: "ndFilingInstructions[4]",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  {
    factId: "priorReliefRequests",
    label: "Any prior pardon, expungement, sealing, or return-of-arrest-record request in any forum",
    provenance: "ndFilingInstructions[4]",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  {
    factId: "reasonsForSealing",
    label: "Reasons the petitioner asks the court to grant sealing",
    provenance: "ndFilingInstructions[4]; § 12-60.1-04(1)(a)-(b) good cause and the balance of interests"
  },
  {
    factId: "rehabilitationEvidence",
    label: "Rehabilitation, employment, housing, school or community-support evidence",
    provenance: "ndRequiredFields; § 12-60.1-04(1)(e) reformation and rehabilitation",
    grounds: ["misdemeanor_conviction", "felony_conviction"]
  },
  { factId: "prosecutorOffice", label: "Prosecuting attorney to be served", provenance: "ndRequiredFields; § 12-60.1-03(4)" },
  { factId: "serviceMethod", label: "Method of service on the prosecuting attorney", provenance: "ndRequiredFields; N.D.R.Crim.P. 49" },
  {
    factId: "clerkOfCourtDestination",
    label: "Clerk of court of the existing criminal case",
    provenance: "Filing destination, § 12-60.1-03(1) — governed configuration, never defaulted"
  },
  {
    factId: "judicialDistrict",
    label: "Judicial district of the criminal case",
    provenance: "Caption and filing destination — governed configuration, never defaulted"
  },
  {
    factId: "pardonDate",
    label: "Date the Governor granted the unconditional pardon",
    provenance: "§ 12-60.1-02 pardon ground",
    grounds: ["unconditional_pardon"]
  },
  { factId: "petitionerAddress", label: "Petitioner mailing address", provenance: "Optional; rendered when supplied", optional: true },
  { factId: "arrestingAgency", label: "Arresting agency", provenance: "Optional; rendered when supplied", optional: true },
  { factId: "arrestDate", label: "Arrest date", provenance: "Optional; rendered when supplied", optional: true }
];

/**
 * Fidelity to the state pack, enforced at module load rather than only by a
 * test. A pack revision that adds a required field for a Chapter 12-60.1
 * pathway breaks the build instead of quietly shipping a petition that no
 * longer collects it.
 */
const packPathwaysByGround: Record<NdSealingGroundId, keyof typeof ndRequiredFields> = {
  misdemeanor_conviction: "conviction_sealing_misdemeanor",
  felony_conviction: "conviction_sealing_felony",
  unconditional_pardon: "conviction_sealing_pardon_supported"
};
for (const ground of ND_SEALING_GROUNDS) {
  for (const field of ndRequiredFields[packPathwaysByGround[ground.groundId]]) {
    const fact = ND_CHAPTER_12_60_1_REQUIRED_FACTS.find((entry) => entry.factId === field);
    const requiredForGround = fact && !fact.optional && (!fact.grounds || fact.grounds.includes(ground.groundId));
    if (!requiredForGround) {
      throw new Error(
        `North Dakota Grade-A spec: ndRequiredFields.${packPathwaysByGround[ground.groundId]} requires "${field}", which this specification does not require for ${ground.groundId}.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export interface NdGradeADocumentSpec {
  documentId: string;
  sequence: number;
  title: string;
  audience: "court" | "participant";
  requirement: "required" | "conditional" | "absent_by_design";
  basis: string;
}

export const ND_CHAPTER_12_60_1_DOCUMENTS: NdGradeADocumentSpec[] = [
  {
    documentId: "nd_sealing_filing_instructions",
    sequence: 1,
    title: "How to File This Packet — North Dakota Petition to Seal Criminal Records",
    audience: "participant",
    requirement: "required",
    basis:
      "Participant filing guide; not filed with the court. Order of operations, filing destination, fee posture, copies, hearing timing and the stop conditions are carried from ndFilingInstructions, ndFeeNotes and ndWaitingPeriodNotes."
  },
  {
    documentId: "nd_petition_to_seal_criminal_records",
    sequence: 2,
    title: "Petition to Seal Criminal Records",
    audience: "court",
    requirement: "required",
    basis:
      "N.D.C.C. § 12-60.1-03(1): the petition is filed in the existing criminal case. Its required contents are ndFilingInstructions[4]. Document type nd_petition_to_seal_criminal_records in the ND state pack."
  },
  {
    documentId: "nd_proposed_order_to_seal_criminal_records",
    sequence: 3,
    title: "[Proposed] Order to Seal Criminal Records",
    audience: "court",
    requirement: "required",
    basis:
      "Mandatory under N.D.C.C. § 12-60.1-03(3): the proposed order is filed with the petition, and a petition without one is incomplete."
  },
  {
    documentId: "nd_proof_of_service_prosecutor",
    sequence: 4,
    title: "Proof of Service on the Prosecuting Attorney",
    audience: "court",
    requirement: "required",
    basis:
      "Proof of service on the prosecuting attorney under N.D.C.C. § 12-60.1-03(4) via N.D.R.Crim.P. 49 and N.D.R.Civ.P. 5(b); service precedes filing and proof is filed with the petition."
  },
  {
    documentId: "nd_notice_affidavit",
    sequence: 5,
    title: "Notice or affidavit to law enforcement, witnesses, victims and correctional authorities",
    audience: "court",
    requirement: "absent_by_design",
    basis:
      "The § 12-60.1-04(4) canvass of law enforcement, witnesses, victims and correctional authorities is the prosecutor's duty, and the source prescribes no participant notice or affidavit document. Recorded so its absence reads as a decision rather than a gap."
  }
];

// ---------------------------------------------------------------------------
// Filing destination, fee, copies, post-filing, stop conditions
// ---------------------------------------------------------------------------

export const ND_CHAPTER_12_60_1_FILING = {
  venue:
    "The existing criminal case for the offence, under N.D.C.C. § 12-60.1-03(1). There is no separate civil action. District court or municipal court, whichever holds the case.",
  destinationName: "Clerk of Court of the existing criminal case",
  destinationRule: ndFilingInstructions[1],
  destinationBasis:
    "The exact clerk office is a governed matter fact (clerkOfCourtDestination). This specification supplies no default clerk, no address and no judicial district.",
  orderOfOperations: ndFilingInstructions[3],
  documentsRule: ndFilingInstructions[2],
  petitionContentsRule: ndFilingInstructions[4],
  feeRule: ndFeeNotes[1],
  feeWaiverRule:
    "No fee amount is stated by any committed North Dakota source for a Chapter 12-60.1 petition, so this packet states none and offers no fee-waiver application. Ask the clerk what the current fee is, and ask the clerk about an application to proceed without payment of fees, before paying anything.",
  copiesRule:
    "Serve the prosecuting attorney first. Then file the petition, the proposed order and the proof of service with the clerk of the existing criminal case, and keep a complete copy of everything filed.",
  hearingRule: ndWaitingPeriodNotes.hearingTiming,
  burdenAndStopConditionsRule: ndFilingInstructions[5],
  scopeRule: ndFilingInstructions[8],
  agencyScopeRule: ndDisqualifyingOffenseNotes[4]
} as const;

/**
 * The hearing and objection stop conditions Grade-A requires a packet to state.
 * Each is a point at which the participant stops following the packet and does
 * something else.
 */
export const ND_CHAPTER_12_60_1_STOP_CONDITIONS = [
  {
    id: "hearing_may_be_set",
    condition: "The court sets a hearing.",
    rule: ndWaitingPeriodNotes.hearingTiming,
    participantAction:
      "A hearing may not be held earlier than 45 days after filing. If the court sets one, attend it. This packet does not prepare a hearing appearance; ask the clerk what the court expects and seek counsel if the prosecutor objects."
  },
  {
    id: "prosecutor_objects",
    condition: "The prosecuting attorney objects, or contests the petition.",
    rule: ndFilingInstructions[3],
    participantAction:
      "The prosecutor is expected, to the extent practicable, to notify and seek input from law enforcement, witnesses, victims and correctional authorities. A contested petition is beyond this packet — seek counsel."
  },
  {
    id: "burden_not_met",
    condition: "The petitioner cannot prove the sealing factors by clear and convincing evidence.",
    rule: ndFilingInstructions[5],
    participantAction:
      "The burden is clear and convincing evidence on every factor in § 12-60.1-04(1). Do not file on the assumption that an unopposed petition is granted."
  },
  {
    id: "denial_bars_refiling",
    condition: "The petition is denied.",
    rule: ndFilingInstructions[5],
    participantAction:
      "If the petition is denied the court may prohibit refiling for up to one year for good cause. Filing an unprepared petition can cost a year; seek counsel before refiling."
  },
  {
    id: "excluded_offense",
    condition: "The offence is a registration offence, a violent or intimidating felony in the firearm-disability period, or an impaired-driving offence.",
    rule: `${ndDisqualifyingOffenseNotes[0]} ${ndDisqualifyingOffenseNotes[1]} ${ndDisqualifyingOffenseNotes[2]}`,
    participantAction:
      "Chapter 12-60.1 does not reach these. An impaired-driving record uses N.D.C.C. § 39-08-01.6 instead. Do not file this packet on an excluded offence."
  }
] as const;

// ---------------------------------------------------------------------------
// Source silences
// ---------------------------------------------------------------------------

export const ND_CHAPTER_12_60_1_SOURCE_SILENCES = [
  {
    field: "verificationStatute.citation",
    statement:
      "No committed North Dakota source ties a verification or notarization statute to a Chapter 12-60.1 petition. The citation is held null and the signature block carries a plain declaration rather than a penalty recital under a statute no source attaches to this filing.",
    counselFlag:
      "North Dakota petition verification: confirm the required verification/notarization form and any applicable statute with counsel; the source does not specify one."
  },
  {
    field: "filingFee",
    statement:
      "No committed North Dakota evidence establishes a filing fee for a Chapter 12-60.1 petition. No amount appears anywhere in the packet and none is rendered; the participant is directed to confirm with the clerk before paying anything.",
    counselFlag:
      "Registry release blocker: the filing fee for a Chapter 12-60.1 petition is not established; the participant must confirm with the clerk before paying anything."
  },
  {
    field: "impairedDrivingExclusionBasis",
    statement:
      "N.D.C.C. § 12-60.1-02(2) as read at source does not state the impaired-driving exclusion; it appears only in the North Dakota Courts self-help guides. The statutory basis is left unrecorded rather than attributed to a subsection that does not carry it.",
    counselFlag:
      "Registry release blocker: the impaired-driving exclusion from Chapter 12-60.1 appears only in ND Courts guides, not in § 12-60.1-02(2); confirm the basis before release."
  },
  {
    field: "caption.countyAndJudicialDistrict",
    statement:
      "The county and judicial district are case-specific and are not supplied by any committed evidence. They arrive as governed matter facts, because filing in the wrong district would misdirect the petition.",
    counselFlag:
      "Filing destination is a governed matter fact; a matter without a judicial district and clerk destination fails closed rather than filing into a defaulted district."
  },
  {
    field: "officialSources.heldInRepository",
    statement:
      "The Edition 1 Master Library extract is not mounted in this lane's environment, so the two bound North Dakota source hashes were confirmed from two independent committed records that agree rather than recomputed from the bytes. Both sources are recorded as not held, which the Grade-A contract counts as missing proof.",
    counselFlag:
      "Grade-A gate: official source bytes are not held in this checkout; the fulfillment record cannot reach COMPLETE_PACKET_PROVEN until the corpus is mounted and the hashes are recomputed from disk."
  }
] as const;

// ---------------------------------------------------------------------------
// The specification
// ---------------------------------------------------------------------------

export interface NdGradeAPacketSpec {
  schemaVersion: string;
  specId: string;
  specVersion: string;
  jurisdictionCode: "ND";
  routeId: string;
  packetFamilyId: string;
  serviceDisposition: "paid_packet_intended";
  requiresParticipantFiling: true;
  filingRequirementBasis: string;
  rejectedRouteNote: string;
  legalName: string;
  publicName: string;
  primaryReliefTerm: string;
  authority: string[];
  grounds: NdSealingGround[];
  exclusions: typeof ND_SEALING_EXCLUSIONS;
  provider: typeof ND_GRADE_A_PROVIDER;
  sources: NdGradeASource[];
  requiredFacts: NdGradeARequiredFact[];
  documents: NdGradeADocumentSpec[];
  filing: typeof ND_CHAPTER_12_60_1_FILING;
  stopConditions: typeof ND_CHAPTER_12_60_1_STOP_CONDITIONS;
  sourceSilences: typeof ND_CHAPTER_12_60_1_SOURCE_SILENCES;
  counselFlags: string[];
  safetyDisclaimer: string;
}

export const ND_CHAPTER_12_60_1_SEALING_SPEC: NdGradeAPacketSpec = {
  schemaVersion: "rcap-grade-a-packet-spec/v1",
  specId: "nd-chapter-12-60-1-conviction-sealing",
  specVersion: "1.0.0",
  jurisdictionCode: "ND",
  routeId: "ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1",
  packetFamilyId: "north-dakota",
  serviceDisposition: "paid_packet_intended",
  requiresParticipantFiling: true,
  filingRequirementBasis:
    "N.D.C.C. § 12-60.1-03: the participant serves the prosecuting attorney and files a petition, a mandatory proposed order and a proof of service with the clerk of the existing criminal case. No relief occurs unless the participant files.",
  rejectedRouteNote:
    "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05 is not used as the composed reference. Decision NATIONAL-2026-08-28-LA-IMM-03 carries stage automatic and outcomeMode automatic_relief with packetFamily null, and the signed reclassification ND-2026-08-28-NO-PARTICIPANT-FILING moved it to non_filing_guidance for the reason no_participant_filing. Its pre-2025-08-01 branch takes the official petition and proposed order, which the same decision records as a service branch that is not built.",
  legalName: "Petition to Seal Criminal Records under N.D.C.C. Chapter 12-60.1",
  publicName: "Ask a North Dakota court to seal a criminal conviction record",
  primaryReliefTerm: "sealing",
  authority: [
    "N.D.C.C. Chapter 12-60.1",
    "N.D.C.C. § 12-60.1-01(7)",
    "N.D.C.C. § 12-60.1-02",
    "N.D.C.C. § 12-60.1-02(1)(a)",
    "N.D.C.C. § 12-60.1-02(2)",
    "N.D.C.C. § 12-60.1-03",
    "N.D.C.C. § 12-60.1-04",
    "N.D.R.Ct. 3.4",
    "N.D.R.Crim.P. 49",
    "N.D.R.Civ.P. 5(b)"
  ],
  grounds: ND_SEALING_GROUNDS,
  exclusions: ND_SEALING_EXCLUSIONS,
  provider: ND_GRADE_A_PROVIDER,
  sources: ND_CHAPTER_12_60_1_SOURCES,
  requiredFacts: ND_CHAPTER_12_60_1_REQUIRED_FACTS,
  documents: ND_CHAPTER_12_60_1_DOCUMENTS,
  filing: ND_CHAPTER_12_60_1_FILING,
  stopConditions: ND_CHAPTER_12_60_1_STOP_CONDITIONS,
  sourceSilences: ND_CHAPTER_12_60_1_SOURCE_SILENCES,
  counselFlags: [
    `Sealing is not expungement: ${ndPlainLanguage.sealingNotExpungement}`,
    `Agency scope: ${ndDisqualifyingOffenseNotes[4]}`,
    `Route scope: ${ndFilingInstructions[8]}`,
    `Eligibility: ${ndEligibilityRules[1]}`,
    `Court findings: ${ndEligibilityRules[8]}`,
    `Burden and timing: ${ndFilingInstructions[5]}`,
    `Excluded offences: ${ndDisqualifyingOffenseNotes[0]} ${ndDisqualifyingOffenseNotes[1]} ${ndDisqualifyingOffenseNotes[2]}`,
    ND_CHAPTER_12_60_1_SOURCE_SILENCES[0].counselFlag,
    ND_CHAPTER_12_60_1_SOURCE_SILENCES[1].counselFlag,
    ND_CHAPTER_12_60_1_SOURCE_SILENCES[2].counselFlag,
    ND_CHAPTER_12_60_1_SOURCE_SILENCES[3].counselFlag,
    ND_CHAPTER_12_60_1_SOURCE_SILENCES[4].counselFlag,
    `Attorney review: ${ndDisqualifyingOffenseNotes[5]}`
  ],
  safetyDisclaimer: ndSafetyDisclaimer
};

// ---------------------------------------------------------------------------
// Specification hash
// ---------------------------------------------------------------------------

/** Key-ordered JSON, so the hash depends on values and not on property order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalize((value as Record<string, unknown>)[key])])
    );
  }
  return value;
}

export function ndGradeASpecHash(spec: NdGradeAPacketSpec = ND_CHAPTER_12_60_1_SEALING_SPEC): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(spec))).digest("hex");
}

export function ndGradeASpecCanonicalJson(
  spec: NdGradeAPacketSpec = ND_CHAPTER_12_60_1_SEALING_SPEC
): string {
  return `${JSON.stringify(canonicalize(spec), null, 2)}\n`;
}

/**
 * Whether the specification itself is complete, in the Grade-A sense: every
 * required document present, every required fact provenanced, at least one
 * ground, sources bound, stop conditions stated. Reported as data so the
 * fulfillment record's `packetSpecification.complete` can be derived rather
 * than asserted.
 */
export function ndGradeASpecCompleteness(spec: NdGradeAPacketSpec = ND_CHAPTER_12_60_1_SEALING_SPEC): {
  complete: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  const required = spec.documents.filter((document) => document.requirement === "required");
  for (const documentId of [
    "nd_sealing_filing_instructions",
    "nd_petition_to_seal_criminal_records",
    "nd_proposed_order_to_seal_criminal_records",
    "nd_proof_of_service_prosecutor"
  ]) {
    if (!required.some((document) => document.documentId === documentId)) {
      missing.push(`documents: ${documentId} is not a required document`);
    }
  }
  if (spec.grounds.length === 0) missing.push("grounds: no eligibility ground is stated");
  if (spec.sources.length === 0) missing.push("sources: no source identity is bound");
  if ((spec.stopConditions as readonly unknown[]).length === 0) missing.push("stopConditions: none stated");
  for (const fact of spec.requiredFacts) {
    if (!fact.provenance.trim()) missing.push(`requiredFacts: ${fact.factId} has no provenance`);
  }
  for (const field of ["destinationName", "feeRule", "copiesRule", "hearingRule"] as const) {
    if (!String(spec.filing[field] ?? "").trim()) missing.push(`filing: ${field} is empty`);
  }
  return { complete: missing.length === 0, missing: missing.sort() };
}
