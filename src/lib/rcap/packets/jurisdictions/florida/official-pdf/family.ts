/**
 * Fail-closed boundary for the Florida official-PDF family.
 *
 * This module is deliberately isolated from live and shared packet registries.
 * It records adopted document/component identities and typed terminal stops,
 * but it cannot resolve, inspect, fill, overlay, assemble, or return a PDF.
 */

export const FLORIDA_OFFICIAL_PDF_FAMILY_ID =
  "rcap-fl-official-pdf-family" as const;

export const FLORIDA_OFFICIAL_PDF_TRACK_IDS = [
  "fl-10yr-bridge",
  "fl-administrative",
  "fl-early-juvenile",
  "fl-expunction",
  "fl-juvenile-diversion",
  "fl-sealing",
  "fl-self-defense",
  "fl-trafficking"
] as const;

export type FloridaOfficialPdfTrackId =
  (typeof FLORIDA_OFFICIAL_PDF_TRACK_IDS)[number];

export const FLORIDA_OFFICIAL_PDF_FORM_IDS = [
  "FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION",
  "FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION",
  "FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION",
  "FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION",
  "FDLE-SELF-DEFENSE-EXPUNCTION-APPLICATION",
  "FL-RULE-3.989-AFFIDAVIT",
  "FL-RULE-3.989-ORDER",
  "FL-RULE-3.989-PETITION"
] as const;

export type FloridaOfficialPdfFormId =
  (typeof FLORIDA_OFFICIAL_PDF_FORM_IDS)[number];

export type FloridaOfficialPdfSourceBoundary = {
  officialFormId: FloridaOfficialPdfFormId;
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

export const FLORIDA_OFFICIAL_PDF_SOURCE_BOUNDARIES =
  FLORIDA_OFFICIAL_PDF_FORM_IDS.map(
    (officialFormId): FloridaOfficialPdfSourceBoundary => ({
      officialFormId,
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
    })
  );

export type FloridaOfficialPdfBlockCode =
  | "unsupported_track"
  | "unsupported_document"
  | "legal_design_route_selection_blocker"
  | "authority_unmanifested_source"
  | "captain_assignment_required"
  | "portable_projection_required"
  | "field_mapping_pending"
  | "generation_disabled";

export type FloridaOfficialPdfComponentBoundary = {
  componentId: string;
  officialFormId: FloridaOfficialPdfFormId;
  order: number;
};

export type FloridaOfficialPdfRouteBoundary = {
  trackId: FloridaOfficialPdfTrackId;
  officialComponents: readonly FloridaOfficialPdfComponentBoundary[];
  blockers: readonly FloridaOfficialPdfBlockCode[];
  runtimeDisabled: true;
  generationAllowed: false;
};

export const FLORIDA_OFFICIAL_PDF_ROUTE_BOUNDARIES = [
  {
    trackId: "fl-10yr-bridge",
    officialComponents: [
      {
        componentId: "fl-10yr-bridge-primary-filing-1",
        officialFormId: "FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION",
        order: 1
      },
      {
        componentId: "fl-10yr-bridge-primary-filing-2",
        officialFormId: "FL-RULE-3.989-PETITION",
        order: 2
      },
      {
        componentId: "fl-10yr-bridge-proposed-order-3",
        officialFormId: "FL-RULE-3.989-ORDER",
        order: 3
      }
    ],
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
    trackId: "fl-administrative",
    officialComponents: [
      {
        componentId: "fl-administrative-primary-filing-1",
        officialFormId: "FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION",
        order: 1
      }
    ],
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
    trackId: "fl-early-juvenile",
    officialComponents: [
      {
        componentId: "fl-early-juvenile-primary-filing-1",
        officialFormId: "FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION",
        order: 1
      }
    ],
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
    trackId: "fl-expunction",
    officialComponents: [
      {
        componentId: "fl-expunction-primary-filing-1",
        officialFormId: "FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION",
        order: 1
      },
      {
        componentId: "fl-expunction-primary-filing-2",
        officialFormId: "FL-RULE-3.989-PETITION",
        order: 2
      },
      {
        componentId: "fl-expunction-affidavit-3",
        officialFormId: "FL-RULE-3.989-AFFIDAVIT",
        order: 3
      },
      {
        componentId: "fl-expunction-proposed-order-4",
        officialFormId: "FL-RULE-3.989-ORDER",
        order: 4
      }
    ],
    blockers: [
      "legal_design_route_selection_blocker",
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
    trackId: "fl-juvenile-diversion",
    officialComponents: [
      {
        componentId: "fl-juvenile-diversion-primary-filing-1",
        officialFormId: "FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION",
        order: 1
      }
    ],
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
    trackId: "fl-sealing",
    officialComponents: [
      {
        componentId: "fl-sealing-primary-filing-1",
        officialFormId: "FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION",
        order: 1
      },
      {
        componentId: "fl-sealing-primary-filing-2",
        officialFormId: "FL-RULE-3.989-PETITION",
        order: 2
      },
      {
        componentId: "fl-sealing-affidavit-3",
        officialFormId: "FL-RULE-3.989-AFFIDAVIT",
        order: 3
      },
      {
        componentId: "fl-sealing-proposed-order-4",
        officialFormId: "FL-RULE-3.989-ORDER",
        order: 4
      }
    ],
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
    trackId: "fl-self-defense",
    officialComponents: [
      {
        componentId: "fl-self-defense-primary-filing-1",
        officialFormId: "FDLE-SELF-DEFENSE-EXPUNCTION-APPLICATION",
        order: 1
      }
    ],
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
    trackId: "fl-trafficking",
    officialComponents: [
      {
        componentId: "fl-trafficking-primary-filing-1",
        officialFormId: "FL-RULE-3.989-PETITION",
        order: 1
      },
      {
        componentId: "fl-trafficking-affidavit-2",
        officialFormId: "FL-RULE-3.989-AFFIDAVIT",
        order: 2
      },
      {
        componentId: "fl-trafficking-proposed-order-3",
        officialFormId: "FL-RULE-3.989-ORDER",
        order: 3
      }
    ],
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
] as const satisfies readonly FloridaOfficialPdfRouteBoundary[];

export const FLORIDA_OFFICIAL_PDF_ACTIVE_RENDERERS: readonly never[] = [];
export const FLORIDA_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS: readonly never[] = [];
export const FLORIDA_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS: readonly never[] =
  [];
export const FLORIDA_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES: readonly never[] = [];

export class FloridaOfficialPdfFamilyBlockedError extends Error {
  constructor(
    readonly code: FloridaOfficialPdfBlockCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "FloridaOfficialPdfFamilyBlockedError";
  }
}

export function floridaOfficialPdfBlockersFor(
  trackId: string
): readonly FloridaOfficialPdfBlockCode[] {
  const route = FLORIDA_OFFICIAL_PDF_ROUTE_BOUNDARIES.find(
    (candidate) => candidate.trackId === trackId
  );
  return route?.blockers ?? ["unsupported_track"];
}

function sourceBoundaryFor(
  officialFormId: string
): FloridaOfficialPdfSourceBoundary {
  const boundary = FLORIDA_OFFICIAL_PDF_SOURCE_BOUNDARIES.find(
    (candidate) => candidate.officialFormId === officialFormId
  );
  if (!boundary) {
    throw new FloridaOfficialPdfFamilyBlockedError(
      "unsupported_document",
      `Florida official-PDF family does not declare "${officialFormId}".`,
      { officialFormId }
    );
  }
  return boundary;
}

/**
 * Always throws. A known form ID is not an adopted exact authority asset.
 */
export function assertFloridaOfficialPdfSourceResolved(
  officialFormId: string
): never {
  const boundary = sourceBoundaryFor(officialFormId);
  throw new FloridaOfficialPdfFamilyBlockedError(
    "authority_unmanifested_source",
    `${officialFormId} has no adopted exact authority asset.`,
    {
      officialFormId,
      authorityState: boundary.authorityState,
      assignmentAnchor: boundary.assignmentAnchor,
      portableProjection: boundary.portableProjection
    }
  );
}

/**
 * Always throws. Materialization cannot begin without an exact authority asset,
 * captain assignment, and portable projection.
 */
export function assertFloridaOfficialPdfDocumentMaterialized(
  officialFormId: string
): never {
  return assertFloridaOfficialPdfSourceResolved(officialFormId);
}

/**
 * Always throws the first adopted blocker for the route.
 */
export function assertFloridaOfficialPdfTrackRenderable(
  trackId: string
): never {
  const route = FLORIDA_OFFICIAL_PDF_ROUTE_BOUNDARIES.find(
    (candidate) => candidate.trackId === trackId
  );
  if (!route) {
    throw new FloridaOfficialPdfFamilyBlockedError(
      "unsupported_track",
      `Florida official-PDF family does not declare track "${trackId}".`,
      { trackId }
    );
  }

  const blocker = route.blockers[0];
  throw new FloridaOfficialPdfFamilyBlockedError(
    blocker,
    `Florida official PDF track ${trackId} is blocked: ${blocker}.`,
    {
      trackId,
      officialComponents: route.officialComponents,
      blockers: route.blockers
    }
  );
}

/**
 * Runtime generation is impossible until a separately reviewed, source-backed
 * implementation replaces this scaffold and receives explicit registration.
 */
export function renderFloridaOfficialPdfFamilyPacket(
  trackId: string,
  facts: Readonly<Record<string, unknown>>
): never {
  void facts;
  return assertFloridaOfficialPdfTrackRenderable(trackId);
}
