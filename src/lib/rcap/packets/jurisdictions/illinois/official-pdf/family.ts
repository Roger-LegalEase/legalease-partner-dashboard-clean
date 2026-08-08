// Illinois statewide official-form family boundary.
//
// This module is deliberately isolated from every live/shared packet registry.
// It describes the authority-scoped family and provides typed fail-closed
// guards, but it does not select, fill, overlay, assemble, or return a PDF.
//
// The existing live Illinois legacy generator and the Illinois custom-pleading
// tranche are separate implementations and must not import this module.

export const ILLINOIS_OFFICIAL_PDF_FAMILY_ID =
  "il-statewide-official-form-families" as const;

export const ILLINOIS_OFFICIAL_PDF_TRACK_IDS = [
  "il-exp-nonconv",
  "il-exp-supervision",
  "il-exp-qualprob",
  "il-exp-precompletion",
  "il-seal-nonconv",
  "il-seal-2yr",
  "il-seal-3yr",
  "il-seal-edu",
  "il-exp-pardon",
  "il-cannabis-vacate",
  "il-prb-cert"
] as const;

export type IllinoisOfficialPdfTrackId =
  (typeof ILLINOIS_OFFICIAL_PDF_TRACK_IDS)[number];

export const ILLINOIS_OFFICIAL_PDF_COMPONENT_DOCUMENT_IDS = [
  "EXP-AD Request",
  "EXP-AD Case List",
  "EXP-AD Order Granting",
  "EXP-AD Additional Cases Expungement",
  "FW-CIV-APPLICATION",
  "CXP Motion to Vacate and Expunge",
  "CXP Additional Cannabis Convictions",
  "CXP Getting Started Motion to Vacate and Expunge",
  "CXP Notice of Court Date for Motion",
  "CXP Additional Notice of Court Date",
  "CXP Order Granting or Denying Motion",
  "PRB Certificate of Sealing Application",
  "PRB Certificate of Sealing Eligibility Acknowledgement",
  "PRB Certificate of Expungement for Military Application",
  "PRB Certificate of Expungement for Military Eligibility Acknowledgement"
] as const;

export type IllinoisOfficialPdfComponentDocumentId =
  (typeof ILLINOIS_OFFICIAL_PDF_COMPONENT_DOCUMENT_IDS)[number];

export type IllinoisOfficialPdfAuthorityState =
  | "authority_mapped_packet_candidate"
  | "retained_packet_asset_component_mapping_pending"
  | "authority_unmanifested_source";

export type IllinoisOfficialPdfDocumentBoundary = {
  componentDocumentId: IllinoisOfficialPdfComponentDocumentId;
  authorityState: IllinoisOfficialPdfAuthorityState;
  expectedSha256: string | null;
  expectedBytes: number | null;
  materialized: false;
  rendererEnabled: false;
  activeFieldMappingCount: 0;
  activeOverlayPlacementCount: 0;
};

export const ILLINOIS_OFFICIAL_PDF_DOCUMENT_BOUNDARIES:
  readonly IllinoisOfficialPdfDocumentBoundary[] = Object.freeze([
    {
      componentDocumentId: "EXP-AD Request",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853",
      expectedBytes: 1015247,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "EXP-AD Case List",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c",
      expectedBytes: 744328,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "EXP-AD Order Granting",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305",
      expectedBytes: 823679,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "EXP-AD Additional Cases Expungement",
      authorityState: "authority_unmanifested_source",
      expectedSha256: null,
      expectedBytes: null,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId:
        "FW-CIV-APPLICATION",
      authorityState: "retained_packet_asset_component_mapping_pending",
      expectedSha256:
        "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5",
      expectedBytes: 1051549,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "CXP Motion to Vacate and Expunge",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "728ad50c5db068d3d3a6bc68901c79431e865f8e2eaa94c37c38a086d9815acf",
      expectedBytes: 227699,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "CXP Additional Cannabis Convictions",
      authorityState: "authority_unmanifested_source",
      expectedSha256: null,
      expectedBytes: null,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "CXP Getting Started Motion to Vacate and Expunge",
      authorityState: "authority_unmanifested_source",
      expectedSha256: null,
      expectedBytes: null,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "CXP Notice of Court Date for Motion",
      authorityState: "authority_unmanifested_source",
      expectedSha256: null,
      expectedBytes: null,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "CXP Additional Notice of Court Date",
      authorityState: "authority_unmanifested_source",
      expectedSha256: null,
      expectedBytes: null,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "CXP Order Granting or Denying Motion",
      authorityState: "authority_unmanifested_source",
      expectedSha256: null,
      expectedBytes: null,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "PRB Certificate of Sealing Application",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "5aa1b7803bfae4fe320a84201416c0882b956e778bc5c24024cd86655155eedd",
      expectedBytes: 226488,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId:
        "PRB Certificate of Sealing Eligibility Acknowledgement",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "b204190533f203005fc2a70690d5630ace9d862a03e61f0352d33062ee8b8361",
      expectedBytes: 89530,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId:
        "PRB Certificate of Expungement for Military Application",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "87d693a24931de3bd17ad0f38a848cadbb5500aacb8c5468517baa6a1869bd1e",
      expectedBytes: 222490,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId:
        "PRB Certificate of Expungement for Military Eligibility Acknowledgement",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "691ce0bffc30190f76c4ad555be454685d8da24cf772fd1ccbbf4b33cf23664c",
      expectedBytes: 84623,
      materialized: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    }
  ]);

export const ILLINOIS_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS:
  Readonly<Record<IllinoisOfficialPdfComponentDocumentId, readonly never[]>> =
  Object.freeze(
    Object.fromEntries(
      ILLINOIS_OFFICIAL_PDF_COMPONENT_DOCUMENT_IDS.map((documentId) => [
        documentId,
        Object.freeze([])
      ])
    ) as Record<IllinoisOfficialPdfComponentDocumentId, readonly never[]>
  );

export const ILLINOIS_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS:
  Readonly<Record<IllinoisOfficialPdfComponentDocumentId, readonly never[]>> =
  Object.freeze(
    Object.fromEntries(
      ILLINOIS_OFFICIAL_PDF_COMPONENT_DOCUMENT_IDS.map((documentId) => [
        documentId,
        Object.freeze([])
      ])
    ) as Record<IllinoisOfficialPdfComponentDocumentId, readonly never[]>
  );

export const ILLINOIS_PRB_UNIT_IDS = [
  "il-prb-cert-certificate-application",
  "il-prb-cert-sealing-branch",
  "il-prb-cert-military-branch",
  "il-prb-cert-nonmilitary-expungement-branch",
  "il-prb-cert-court-petition"
] as const;

export type IllinoisPrbUnitId = (typeof ILLINOIS_PRB_UNIT_IDS)[number];

export type IllinoisOfficialPdfErrorCode =
  | "unsupported_track"
  | "unsupported_document"
  | "source_missing"
  | "authority_unmanifested"
  | "component_mapping_unapproved"
  | "renderer_classification_unresolved"
  | "branch_unavailable"
  | "generation_disabled";

export class IllinoisOfficialPdfFamilyError extends Error {
  constructor(
    readonly code: IllinoisOfficialPdfErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "IllinoisOfficialPdfFamilyError";
  }
}

function documentBoundary(
  componentDocumentId: string
): IllinoisOfficialPdfDocumentBoundary {
  const boundary = ILLINOIS_OFFICIAL_PDF_DOCUMENT_BOUNDARIES.find(
    (candidate) => candidate.componentDocumentId === componentDocumentId
  );

  if (!boundary) {
    throw new IllinoisOfficialPdfFamilyError(
      "unsupported_document",
      `Illinois official-PDF family does not declare "${componentDocumentId}".`,
      { componentDocumentId }
    );
  }

  return boundary;
}

/**
 * Always throws in this scaffold. The specific error preserves the reason the
 * document cannot be selected without making file presence look like authority.
 */
export function assertIllinoisOfficialPdfDocumentReady(
  componentDocumentId: string
): never {
  const boundary = documentBoundary(componentDocumentId);

  if (boundary.authorityState === "authority_unmanifested_source") {
    throw new IllinoisOfficialPdfFamilyError(
      "authority_unmanifested",
      `${componentDocumentId} has no retained Edition 1.2 packet asset and cannot be selected.`,
      { componentDocumentId, authorityState: boundary.authorityState }
    );
  }

  if (
    boundary.authorityState ===
    "retained_packet_asset_component_mapping_pending"
  ) {
    throw new IllinoisOfficialPdfFamilyError(
      "component_mapping_unapproved",
      `${componentDocumentId} is not yet approved to resolve to FW-CIV-APPLICATION.`,
      { componentDocumentId, authorityState: boundary.authorityState }
    );
  }

  if (componentDocumentId === "CXP Motion to Vacate and Expunge") {
    throw new IllinoisOfficialPdfFamilyError(
      "renderer_classification_unresolved",
      "CXP Motion renderer selection is blocked by the flat-PDF/AcroForm classification discrepancy.",
      { componentDocumentId }
    );
  }

  throw new IllinoisOfficialPdfFamilyError(
    "source_missing",
    `${componentDocumentId} requires a captain assignment anchor and portable projection; repository identity evidence is not a worker source.`,
    {
      componentDocumentId,
      expectedSha256: boundary.expectedSha256,
      expectedBytes: boundary.expectedBytes
    }
  );
}

/**
 * The non-military unit is unavailable in the adopted design. Other units are
 * logically available but still cannot render through this disabled boundary.
 */
export function assertIllinoisPrbUnitDeclared(
  unitId: string
): IllinoisPrbUnitId {
  if (
    !ILLINOIS_PRB_UNIT_IDS.includes(
      unitId as (typeof ILLINOIS_PRB_UNIT_IDS)[number]
    )
  ) {
    throw new IllinoisOfficialPdfFamilyError(
      "branch_unavailable",
      `Unknown Illinois PRB unit "${unitId}".`,
      { unitId }
    );
  }

  if (unitId === "il-prb-cert-nonmilitary-expungement-branch") {
    throw new IllinoisOfficialPdfFamilyError(
      "branch_unavailable",
      "No verified official non-military certificate-of-expungement application is available.",
      { unitId }
    );
  }

  return unitId as IllinoisPrbUnitId;
}

/**
 * Runtime generation is intentionally impossible until this state-scoped
 * boundary is replaced by a reviewed, source-backed implementation and is
 * explicitly registered by a separate authorized change.
 */
export function renderIllinoisOfficialPdfFamilyPacket(
  trackId: string,
  facts: Readonly<Record<string, unknown>>
): never {
  void facts;

  if (
    !ILLINOIS_OFFICIAL_PDF_TRACK_IDS.includes(
      trackId as (typeof ILLINOIS_OFFICIAL_PDF_TRACK_IDS)[number]
    )
  ) {
    throw new IllinoisOfficialPdfFamilyError(
      "unsupported_track",
      `Illinois official-PDF family does not declare track "${trackId}".`,
      { trackId }
    );
  }

  throw new IllinoisOfficialPdfFamilyError(
    "generation_disabled",
    `${trackId} remains runtime-disabled; no Illinois official-PDF renderer is active.`,
    {
      trackId,
      familyId: ILLINOIS_OFFICIAL_PDF_FAMILY_ID,
      activeRendererCount: 0
    }
  );
}
