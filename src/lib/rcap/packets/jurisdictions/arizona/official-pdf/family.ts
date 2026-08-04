/**
 * Arizona official-PDF pre-materialization boundary.
 *
 * This module is intentionally isolated from shared packet registries and live
 * routes. It exposes adopted component identities and typed terminal stops
 * only. It does not resolve a source path, open source bytes, select a
 * renderer, map a field, assemble output pages, or return a PDF.
 */

export const ARIZONA_OFFICIAL_PDF_FAMILY_ID =
  "rcap-az-official-pdf-family" as const;

export const ARIZONA_OFFICIAL_PDF_TRACK_IDS = [
  "az_certificate_second_chance",
  "az_marijuana_expungement_arrest_no_charges",
  "az_marijuana_expungement_limited_jurisdiction",
  "az_marijuana_expungement_superior_court",
  "az_record_sealing_arrest_no_charges",
  "az_record_sealing_conviction",
  "az_record_sealing_dismissal_not_guilty",
  "az_set_aside"
] as const;

export type ArizonaOfficialPdfTrackId =
  (typeof ARIZONA_OFFICIAL_PDF_TRACK_IDS)[number];

export const ARIZONA_OFFICIAL_PDF_DOCUMENT_IDS = [
  "AOC-CREM2F-071221",
  "AOC-CREM2F-071221-CONT",
  "AOC-CREM3F-071221",
  "AOCCR41FORM31A-082224",
  "AOCCR41FORM31A-082224-CONT",
  "AOCCR41FORM31B-082224",
  "AOCCRSA3F-010122",
  "AOCCRSA4F-010122",
  "AOCCRSL1F-050825",
  "AOCCRSL1F-050825-CONT",
  "AOCCRSL2F-050825"
] as const;

export type ArizonaOfficialPdfDocumentId =
  (typeof ARIZONA_OFFICIAL_PDF_DOCUMENT_IDS)[number];

export type ArizonaOfficialPdfRendererLane =
  | "acroform_or_hybrid_fill"
  | "coordinate_overlay";

type ArizonaExactOfficialPdfBoundary = {
  componentDocumentId: ArizonaOfficialPdfDocumentId;
  identityBindingStatus: "exact_pinned_identity";
  authorityDocumentId: string;
  authorityDocumentRole: "PETITION" | "ORDER";
  assetClass: "packet_form" | "source_gated";
  packetCandidate: boolean;
  expectedSha256: string;
  expectedBytes: number;
  expectedMediaType: "application/pdf";
  candidateRendererLane: ArizonaOfficialPdfRendererLane;
  sourceMaterializationState: "binary_materialization_required";
  captainProjected: false;
  rendererEnabled: false;
  activeFieldMappingCount: 0;
  activeOverlayPlacementCount: 0;
};

type ArizonaUnresolvedOfficialPdfBoundary = {
  componentDocumentId: ArizonaOfficialPdfDocumentId;
  identityBindingStatus: "unknown_source_identity";
  authorityDocumentId: null;
  authorityDocumentRole: null;
  assetClass: null;
  packetCandidate: false;
  expectedSha256: null;
  expectedBytes: null;
  expectedMediaType: null;
  candidateRendererLane: null;
  sourceMaterializationState: "unknown_source_identity";
  captainProjected: false;
  rendererEnabled: false;
  activeFieldMappingCount: 0;
  activeOverlayPlacementCount: 0;
};

export type ArizonaOfficialPdfDocumentBoundary =
  | ArizonaExactOfficialPdfBoundary
  | ArizonaUnresolvedOfficialPdfBoundary;

export const ARIZONA_OFFICIAL_PDF_DOCUMENT_BOUNDARIES = [
  {
    componentDocumentId: "AOC-CREM2F-071221",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "AOCCREM2F-071221",
    authorityDocumentRole: "PETITION",
    assetClass: "source_gated",
    packetCandidate: false,
    expectedSha256:
      "4875e08bc1518ca9b449b3f52fca1264bdbd3bd207887420f6f88c76d0409482",
    expectedBytes: 72602,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "coordinate_overlay",
    sourceMaterializationState: "binary_materialization_required",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOC-CREM2F-071221-CONT",
    identityBindingStatus: "unknown_source_identity",
    authorityDocumentId: null,
    authorityDocumentRole: null,
    assetClass: null,
    packetCandidate: false,
    expectedSha256: null,
    expectedBytes: null,
    expectedMediaType: null,
    candidateRendererLane: null,
    sourceMaterializationState: "unknown_source_identity",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOC-CREM3F-071221",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "AOCCREM3F-071221",
    authorityDocumentRole: "PETITION",
    assetClass: "source_gated",
    packetCandidate: false,
    expectedSha256:
      "3f0a4f97f7a28a63f4f74e4f6c37cc4400a47e35c5669895ebf296c882b79652",
    expectedBytes: 22738,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "coordinate_overlay",
    sourceMaterializationState: "binary_materialization_required",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOCCR41FORM31A-082224",
    identityBindingStatus: "unknown_source_identity",
    authorityDocumentId: null,
    authorityDocumentRole: null,
    assetClass: null,
    packetCandidate: false,
    expectedSha256: null,
    expectedBytes: null,
    expectedMediaType: null,
    candidateRendererLane: null,
    sourceMaterializationState: "unknown_source_identity",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOCCR41FORM31A-082224-CONT",
    identityBindingStatus: "unknown_source_identity",
    authorityDocumentId: null,
    authorityDocumentRole: null,
    assetClass: null,
    packetCandidate: false,
    expectedSha256: null,
    expectedBytes: null,
    expectedMediaType: null,
    candidateRendererLane: null,
    sourceMaterializationState: "unknown_source_identity",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOCCR41FORM31B-082224",
    identityBindingStatus: "unknown_source_identity",
    authorityDocumentId: null,
    authorityDocumentRole: null,
    assetClass: null,
    packetCandidate: false,
    expectedSha256: null,
    expectedBytes: null,
    expectedMediaType: null,
    candidateRendererLane: null,
    sourceMaterializationState: "unknown_source_identity",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOCCRSA3F-010122",
    identityBindingStatus: "unknown_source_identity",
    authorityDocumentId: null,
    authorityDocumentRole: null,
    assetClass: null,
    packetCandidate: false,
    expectedSha256: null,
    expectedBytes: null,
    expectedMediaType: null,
    candidateRendererLane: null,
    sourceMaterializationState: "unknown_source_identity",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOCCRSA4F-010122",
    identityBindingStatus: "unknown_source_identity",
    authorityDocumentId: null,
    authorityDocumentRole: null,
    assetClass: null,
    packetCandidate: false,
    expectedSha256: null,
    expectedBytes: null,
    expectedMediaType: null,
    candidateRendererLane: null,
    sourceMaterializationState: "unknown_source_identity",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOCCRSL1F-050825",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "AOCCRSL1F-050825",
    authorityDocumentRole: "PETITION",
    assetClass: "packet_form",
    packetCandidate: true,
    expectedSha256:
      "32c1e54d8a4135cfefe5d85d25f62afdb7c212f6a475e18664188524de34db05",
    expectedBytes: 299110,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "acroform_or_hybrid_fill",
    sourceMaterializationState: "binary_materialization_required",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOCCRSL1F-050825-CONT",
    identityBindingStatus: "unknown_source_identity",
    authorityDocumentId: null,
    authorityDocumentRole: null,
    assetClass: null,
    packetCandidate: false,
    expectedSha256: null,
    expectedBytes: null,
    expectedMediaType: null,
    candidateRendererLane: null,
    sourceMaterializationState: "unknown_source_identity",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "AOCCRSL2F-050825",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "AOCCRSL2F-050825",
    authorityDocumentRole: "ORDER",
    assetClass: "packet_form",
    packetCandidate: true,
    expectedSha256:
      "436df2e10722ff26b30069d4b0913825fa304202d6538a70e45ad8bafbca61b1",
    expectedBytes: 213882,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "acroform_or_hybrid_fill",
    sourceMaterializationState: "binary_materialization_required",
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  }
] as const satisfies readonly ArizonaOfficialPdfDocumentBoundary[];

export type ArizonaOfficialPdfComponent = {
  trackId: ArizonaOfficialPdfTrackId;
  componentId: string;
  componentDocumentId: ArizonaOfficialPdfDocumentId;
  role: "primary_filing" | "proposed_order" | "continuation";
  requirement: "required" | "conditional";
};

export const ARIZONA_OFFICIAL_PDF_COMPONENTS = [
  {
    trackId: "az_certificate_second_chance",
    componentId: "az_certificate_second_chance-primary-filing-1",
    componentDocumentId: "AOCCRSA3F-010122",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "az_certificate_second_chance",
    componentId: "az_certificate_second_chance-proposed-order-2",
    componentDocumentId: "AOCCRSA4F-010122",
    role: "proposed_order",
    requirement: "required"
  },
  {
    trackId: "az_marijuana_expungement_arrest_no_charges",
    componentId:
      "az_marijuana_expungement_arrest_no_charges-primary-filing-1",
    componentDocumentId: "AOC-CREM3F-071221",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "az_marijuana_expungement_limited_jurisdiction",
    componentId:
      "az_marijuana_expungement_limited_jurisdiction-primary-filing-1",
    componentDocumentId: "AOC-CREM2F-071221",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "az_marijuana_expungement_limited_jurisdiction",
    componentId:
      "az_marijuana_expungement_limited_jurisdiction-continuation-2",
    componentDocumentId: "AOC-CREM2F-071221-CONT",
    role: "continuation",
    requirement: "conditional"
  },
  {
    trackId: "az_marijuana_expungement_superior_court",
    componentId:
      "az_marijuana_expungement_superior_court-primary-filing-1",
    componentDocumentId: "AOC-CREM3F-071221",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "az_record_sealing_arrest_no_charges",
    componentId: "az_record_sealing_arrest_no_charges-primary-filing-1",
    componentDocumentId: "AOCCRSL1F-050825",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "az_record_sealing_arrest_no_charges",
    componentId: "az_record_sealing_arrest_no_charges-proposed-order-2",
    componentDocumentId: "AOCCRSL2F-050825",
    role: "proposed_order",
    requirement: "conditional"
  },
  {
    trackId: "az_record_sealing_conviction",
    componentId: "az_record_sealing_conviction-primary-filing-1",
    componentDocumentId: "AOCCRSL1F-050825",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "az_record_sealing_conviction",
    componentId: "az_record_sealing_conviction-proposed-order-2",
    componentDocumentId: "AOCCRSL2F-050825",
    role: "proposed_order",
    requirement: "conditional"
  },
  {
    trackId: "az_record_sealing_conviction",
    componentId: "az_record_sealing_conviction-continuation-3",
    componentDocumentId: "AOCCRSL1F-050825-CONT",
    role: "continuation",
    requirement: "conditional"
  },
  {
    trackId: "az_record_sealing_dismissal_not_guilty",
    componentId:
      "az_record_sealing_dismissal_not_guilty-primary-filing-1",
    componentDocumentId: "AOCCRSL1F-050825",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "az_record_sealing_dismissal_not_guilty",
    componentId:
      "az_record_sealing_dismissal_not_guilty-proposed-order-2",
    componentDocumentId: "AOCCRSL2F-050825",
    role: "proposed_order",
    requirement: "conditional"
  },
  {
    trackId: "az_set_aside",
    componentId: "az_set_aside-primary-filing-1",
    componentDocumentId: "AOCCR41FORM31A-082224",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "az_set_aside",
    componentId: "az_set_aside-proposed-order-2",
    componentDocumentId: "AOCCR41FORM31B-082224",
    role: "proposed_order",
    requirement: "required"
  },
  {
    trackId: "az_set_aside",
    componentId: "az_set_aside-continuation-3",
    componentDocumentId: "AOCCR41FORM31A-082224-CONT",
    role: "continuation",
    requirement: "conditional"
  }
] as const satisfies readonly ArizonaOfficialPdfComponent[];

export const ARIZONA_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS: readonly never[] = [];
export const ARIZONA_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS: readonly never[] =
  [];

export type ArizonaOfficialPdfBoundaryCode =
  | "unsupported_track"
  | "unsupported_document"
  | "unknown_source_identity"
  | "source_materialization_required"
  | "generation_disabled";

export class ArizonaOfficialPdfFamilyBlockedError extends Error {
  constructor(
    readonly code: ArizonaOfficialPdfBoundaryCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "ArizonaOfficialPdfFamilyBlockedError";
  }
}

function documentBoundary(
  componentDocumentId: string
): ArizonaOfficialPdfDocumentBoundary {
  const boundary = ARIZONA_OFFICIAL_PDF_DOCUMENT_BOUNDARIES.find(
    (candidate) => candidate.componentDocumentId === componentDocumentId
  );

  if (!boundary) {
    throw new ArizonaOfficialPdfFamilyBlockedError(
      "unsupported_document",
      `Arizona official-PDF family does not declare "${componentDocumentId}".`,
      { componentDocumentId }
    );
  }

  return boundary;
}

/**
 * Always throws. An exact registry identity still needs a captain assignment
 * and verified portable projection; an unresolved component cannot enter
 * materialization at all.
 */
export function preflightArizonaOfficialPdfDocument(
  componentDocumentId: string
): never {
  const boundary = documentBoundary(componentDocumentId);

  if (boundary.identityBindingStatus === "unknown_source_identity") {
    throw new ArizonaOfficialPdfFamilyBlockedError(
      "unknown_source_identity",
      `${componentDocumentId} has no exact adopted authority identity and cannot select a source.`,
      {
        componentDocumentId,
        expectedSha256: null,
        expectedBytes: null
      }
    );
  }

  throw new ArizonaOfficialPdfFamilyBlockedError(
    "source_materialization_required",
    `${componentDocumentId} requires a captain assignment and verified portable projection.`,
    {
      componentDocumentId,
      authorityDocumentId: boundary.authorityDocumentId,
      expectedSha256: boundary.expectedSha256,
      expectedBytes: boundary.expectedBytes
    }
  );
}

/**
 * Runtime generation is deliberately unavailable. This terminal boundary is
 * not imported by any shared route or packet registry.
 */
export function assertArizonaOfficialPdfTrackRenderable(
  trackId: string
): never {
  if (
    !ARIZONA_OFFICIAL_PDF_TRACK_IDS.includes(
      trackId as ArizonaOfficialPdfTrackId
    )
  ) {
    throw new ArizonaOfficialPdfFamilyBlockedError(
      "unsupported_track",
      `Arizona official-PDF family does not declare track "${trackId}".`,
      { trackId }
    );
  }

  throw new ArizonaOfficialPdfFamilyBlockedError(
    "generation_disabled",
    `${trackId} remains runtime-disabled; no Arizona official-PDF renderer is active.`,
    {
      trackId,
      familyId: ARIZONA_OFFICIAL_PDF_FAMILY_ID,
      exactIdentityCount: 4,
      unknownSourceIdentityCount: 7,
      activeRendererCount: 0
    }
  );
}
