/**
 * Fail-closed boundary for the Hawaii HCJDC official-PDF family.
 *
 * This module is deliberately isolated from live and shared packet registries.
 * It records the adopted component identities and typed stop reasons, but it
 * cannot resolve, inspect, fill, overlay, assemble, or return a PDF.
 *
 * Edition 1.2 retains no authority asset for HCJDC-159 or HCJDC-159B. The
 * exact repository candidate pins below are non-selectable identity evidence;
 * they are not assignments and must never be opened through their legacy
 * repository paths by a packet worker.
 */

export const HAWAII_OFFICIAL_PDF_FAMILY_ID =
  "rcap-hi-official-pdf-family" as const;

export const HAWAII_OFFICIAL_PDF_TRACK_IDS = [
  "hi_nonconviction_expungement",
  "hi_dag_danc_expungement",
  "hi_712_1200_deferred_expungement",
  "hi_first_time_drug_offender_expungement",
  "hi_marijuana_three_grams_expungement",
  "hi_pre_2004_drug_offender_expungement",
  "hi_first_time_property_offender_expungement",
  "hi_under_21_dui_expungement"
] as const;

export type HawaiiOfficialPdfTrackId =
  (typeof HAWAII_OFFICIAL_PDF_TRACK_IDS)[number];

// One document, not two. The integrated HCJDC identity decision established
// that HCJDC 159(b) is the single current instrument and that HCJDC-159 never
// named a second one; the stage-one and HCJDC 159(b) memo correction carried
// that into the design, and the queue now reports one document identity.
export const HAWAII_OFFICIAL_PDF_FORM_IDS = ["HCJDC-159B"] as const;

export type HawaiiOfficialPdfFormId =
  (typeof HAWAII_OFFICIAL_PDF_FORM_IDS)[number];

export type HawaiiOfficialPdfSourceBoundary = {
  officialFormId: HawaiiOfficialPdfFormId;
  authorityState: "authority_unmanifested_source";
  identityBindingStatus: "document_identity_known_exact_authority_asset_unresolved";
  expectedSha256: null;
  expectedBytes: null;
  expectedMediaType: null;
  assignmentAnchor: null;
  portableProjection: null;
  materialized: false;
  workerReadAuthorized: false;
  rendererEnabled: false;
  activeFieldMappingCount: 0;
  activeOverlayPlacementCount: 0;
};

export const HAWAII_OFFICIAL_PDF_SOURCE_BOUNDARIES = [
  {
    officialFormId: "HCJDC-159B",
    authorityState: "authority_unmanifested_source",
    identityBindingStatus:
      "document_identity_known_exact_authority_asset_unresolved",
    expectedSha256: null,
    expectedBytes: null,
    expectedMediaType: null,
    assignmentAnchor: null,
    portableProjection: null,
    materialized: false,
    workerReadAuthorized: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  }
] as const satisfies readonly HawaiiOfficialPdfSourceBoundary[];

export type HawaiiOfficialPdfCandidateEvidence = {
  candidateId:
    | "expungement-application-rev-2026-06"
    | "hawaii-expungement-reference"
    | "revised-exp-application-2019-11";
  sha256: string;
  bytes: number;
  repositoryPathEvidence: string;
  edition12Disposition: "hold_provenance";
  runtimeEffect: "not_resolver_selectable";
  mappedOfficialFormId: null;
  maySatisfyRequirement: false;
};

export const HAWAII_OFFICIAL_PDF_CANDIDATE_EVIDENCE = [
  {
    candidateId: "expungement-application-rev-2026-06",
    sha256:
      "1cb4f3acc20d569820379410c3aeb67c59fe3e24866932696371f25efaad935a",
    bytes: 181711,
    repositoryPathEvidence:
      "private/Nationwide Record Clearing/LegalEase Hawaii/EXPUNGEMENT_APPLICATION_Rev-2026-06.pdf",
    edition12Disposition: "hold_provenance",
    runtimeEffect: "not_resolver_selectable",
    mappedOfficialFormId: null,
    maySatisfyRequirement: false
  },
  {
    candidateId: "hawaii-expungement-reference",
    sha256:
      "8754a27448c4752fc79e46da7a7be4c8bd7e3fd4603feb77c1d4ce16ed92a0fb",
    bytes: 8122,
    repositoryPathEvidence:
      "private/Nationwide Record Clearing/LegalEase Hawaii/files-4/Hawaii-Expungement-Reference.pdf",
    edition12Disposition: "hold_provenance",
    runtimeEffect: "not_resolver_selectable",
    mappedOfficialFormId: null,
    maySatisfyRequirement: false
  },
  {
    candidateId: "revised-exp-application-2019-11",
    sha256:
      "e9b084cea6c7b0bf27aae1c03937e28b33f7b3a8e4afe8173c766bc379b747f9",
    bytes: 137157,
    repositoryPathEvidence:
      "private/Nationwide Record Clearing/LegalEase Hawaii/REVISED-EXP-APPLICATION-2019-11.pdf",
    edition12Disposition: "hold_provenance",
    runtimeEffect: "not_resolver_selectable",
    mappedOfficialFormId: null,
    maySatisfyRequirement: false
  }
] as const satisfies readonly HawaiiOfficialPdfCandidateEvidence[];

export type HawaiiOfficialPdfBlockCode =
  | "unsupported_track"
  | "unsupported_document"
  | "unsupported_candidate"
  | "legal_design_waiting_period_blocker"
  | "conviction_stage_one_legal_design_blocker"
  | "stage_one_guidance_spec_missing"
  | "authority_unmanifested_source"
  | "candidate_source_not_selectable"
  | "captain_assignment_required"
  | "portable_projection_required"
  | "field_mapping_pending"
  | "generation_disabled";

export type HawaiiOfficialPdfRouteBoundary = {
  trackId: HawaiiOfficialPdfTrackId;
  officialFormId: HawaiiOfficialPdfFormId;
  componentId: string;
  stage: 1 | 2;
  blockers: readonly HawaiiOfficialPdfBlockCode[];
  runtimeDisabled: true;
  generationAllowed: false;
};

export const HAWAII_OFFICIAL_PDF_ROUTE_BOUNDARIES = [
  {
    trackId: "hi_nonconviction_expungement",
    officialFormId: "HCJDC-159B",
    componentId: "hi_nonconviction_expungement-primary-filing-1",
    stage: 1,
    blockers: [
      "authority_unmanifested_source",
      "captain_assignment_required",
      "portable_projection_required",
      "field_mapping_pending",
      "generation_disabled"
    ],
    runtimeDisabled: true,
    generationAllowed: false
  },
  {
    trackId: "hi_dag_danc_expungement",
    officialFormId: "HCJDC-159B",
    componentId: "hi_dag_danc_expungement-primary-filing-2",
    stage: 2,
    blockers: [
      "stage_one_guidance_spec_missing",
      "authority_unmanifested_source",
      "captain_assignment_required",
      "portable_projection_required",
      "field_mapping_pending",
      "generation_disabled"
    ],
    runtimeDisabled: true,
    generationAllowed: false
  },
  {
    trackId: "hi_712_1200_deferred_expungement",
    officialFormId: "HCJDC-159B",
    componentId: "hi_712_1200_deferred_expungement-primary-filing-2",
    stage: 2,
    blockers: [
      "legal_design_waiting_period_blocker",
      "stage_one_guidance_spec_missing",
      "authority_unmanifested_source",
      "captain_assignment_required",
      "portable_projection_required",
      "field_mapping_pending",
      "generation_disabled"
    ],
    runtimeDisabled: true,
    generationAllowed: false
  },
  {
    trackId: "hi_first_time_drug_offender_expungement",
    officialFormId: "HCJDC-159B",
    componentId: "hi_first_time_drug_offender_expungement-primary-filing-3",
    stage: 2,
    blockers: [
      "authority_unmanifested_source",
      "captain_assignment_required",
      "portable_projection_required",
      "field_mapping_pending",
      "generation_disabled"
    ],
    runtimeDisabled: true,
    generationAllowed: false
  },
  {
    trackId: "hi_marijuana_three_grams_expungement",
    officialFormId: "HCJDC-159B",
    componentId: "hi_marijuana_three_grams_expungement-primary-filing-3",
    stage: 2,
    blockers: [
      "authority_unmanifested_source",
      "captain_assignment_required",
      "portable_projection_required",
      "field_mapping_pending",
      "generation_disabled"
    ],
    runtimeDisabled: true,
    generationAllowed: false
  },
  {
    trackId: "hi_pre_2004_drug_offender_expungement",
    officialFormId: "HCJDC-159B",
    componentId: "hi_pre_2004_drug_offender_expungement-primary-filing-3",
    stage: 2,
    blockers: [
      "authority_unmanifested_source",
      "captain_assignment_required",
      "portable_projection_required",
      "field_mapping_pending",
      "generation_disabled"
    ],
    runtimeDisabled: true,
    generationAllowed: false
  },
  {
    trackId: "hi_first_time_property_offender_expungement",
    officialFormId: "HCJDC-159B",
    componentId:
      "hi_first_time_property_offender_expungement-primary-filing-3",
    stage: 2,
    blockers: [
      "authority_unmanifested_source",
      "captain_assignment_required",
      "portable_projection_required",
      "field_mapping_pending",
      "generation_disabled"
    ],
    runtimeDisabled: true,
    generationAllowed: false
  },
  {
    trackId: "hi_under_21_dui_expungement",
    officialFormId: "HCJDC-159B",
    componentId: "hi_under_21_dui_expungement-primary-filing-3",
    stage: 2,
    blockers: [
      "authority_unmanifested_source",
      "captain_assignment_required",
      "portable_projection_required",
      "field_mapping_pending",
      "generation_disabled"
    ],
    runtimeDisabled: true,
    generationAllowed: false
  }
] as const satisfies readonly HawaiiOfficialPdfRouteBoundary[];

export const HAWAII_OFFICIAL_PDF_ACTIVE_RENDERERS: readonly never[] = [];
export const HAWAII_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS: readonly never[] = [];
export const HAWAII_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS: readonly never[] =
  [];
export const HAWAII_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES: readonly never[] = [];

export class HawaiiOfficialPdfFamilyBlockedError extends Error {
  constructor(
    readonly code: HawaiiOfficialPdfBlockCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "HawaiiOfficialPdfFamilyBlockedError";
  }
}

export function hawaiiOfficialPdfBlockersFor(
  trackId: string
): readonly HawaiiOfficialPdfBlockCode[] {
  const route = HAWAII_OFFICIAL_PDF_ROUTE_BOUNDARIES.find(
    (candidate) => candidate.trackId === trackId
  );
  return route?.blockers ?? ["unsupported_track"];
}

/**
 * Always throws. A known form ID is not an exact authority source identity.
 */
export function assertHawaiiOfficialPdfDocumentReady(
  officialFormId: string
): never {
  const boundary = HAWAII_OFFICIAL_PDF_SOURCE_BOUNDARIES.find(
    (candidate) => candidate.officialFormId === officialFormId
  );
  if (!boundary) {
    throw new HawaiiOfficialPdfFamilyBlockedError(
      "unsupported_document",
      `Hawaii official-PDF family does not declare "${officialFormId}".`,
      { officialFormId }
    );
  }

  throw new HawaiiOfficialPdfFamilyBlockedError(
    "authority_unmanifested_source",
    `${officialFormId} has no adopted exact authority asset and cannot be selected.`,
    {
      officialFormId,
      authorityState: boundary.authorityState,
      assignmentAnchor: boundary.assignmentAnchor,
      portableProjection: boundary.portableProjection
    }
  );
}

/**
 * Always throws. Exact candidate pins do not authorize candidate selection.
 */
export function assertHawaiiCandidateEvidenceSelectable(
  candidateId: string
): never {
  const candidate = HAWAII_OFFICIAL_PDF_CANDIDATE_EVIDENCE.find(
    (entry) => entry.candidateId === candidateId
  );
  if (!candidate) {
    throw new HawaiiOfficialPdfFamilyBlockedError(
      "unsupported_candidate",
      `Hawaii official-PDF family does not declare candidate "${candidateId}".`,
      { candidateId }
    );
  }

  throw new HawaiiOfficialPdfFamilyBlockedError(
    "candidate_source_not_selectable",
    `${candidateId} is hold_provenance evidence and cannot satisfy an official form requirement.`,
    {
      candidateId,
      edition12Disposition: candidate.edition12Disposition,
      runtimeEffect: candidate.runtimeEffect,
      mappedOfficialFormId: candidate.mappedOfficialFormId
    }
  );
}

/**
 * Always throws the first adopted blocker for the route.
 */
export function assertHawaiiOfficialPdfTrackRenderable(
  trackId: string
): never {
  const route = HAWAII_OFFICIAL_PDF_ROUTE_BOUNDARIES.find(
    (candidate) => candidate.trackId === trackId
  );
  if (!route) {
    throw new HawaiiOfficialPdfFamilyBlockedError(
      "unsupported_track",
      `Hawaii official-PDF family does not declare track "${trackId}".`,
      { trackId }
    );
  }

  const blocker = route.blockers[0];
  throw new HawaiiOfficialPdfFamilyBlockedError(
    blocker,
    `Hawaii official PDF track ${trackId} is blocked: ${blocker}.`,
    {
      trackId,
      officialFormId: route.officialFormId,
      componentId: route.componentId,
      blockers: route.blockers
    }
  );
}

/**
 * Runtime generation is impossible until a separately reviewed, source-backed
 * implementation replaces this scaffold and receives explicit registration.
 */
export function renderHawaiiOfficialPdfFamilyPacket(
  trackId: string,
  facts: Readonly<Record<string, unknown>>
): never {
  void facts;
  return assertHawaiiOfficialPdfTrackRenderable(trackId);
}
