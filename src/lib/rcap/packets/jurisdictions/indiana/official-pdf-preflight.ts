export const INDIANA_OFFICIAL_PDF_FAMILY_ID =
  "rcap-in-official-pdf-family" as const;

export const INDIANA_OFFICIAL_PDF_TRACK_IDS = [
  "in_arrest_no_charges",
  "in_conviction_d6",
  "in_conviction_felony",
  "in_conviction_misd",
  "in_conviction_serious_felony",
  "in_section1_petition",
] as const;

export type IndianaOfficialPdfTrackId =
  (typeof INDIANA_OFFICIAL_PDF_TRACK_IDS)[number];

export const INDIANA_OFFICIAL_PDF_DOCUMENT_IDS = [
  "CCA conviction expungement order",
  "CCA conviction expungement petition",
  "CCA Section 1 expungement order",
  "CCA Section 1 non-conviction expungement petition",
  "CCA-GF-0120-3016",
  "CCA-XP-0120-7002 Form ACR",
  "CCA-XP-0220-7008",
  "CCA-XP-0220-7009",
  "CCA-XP-0220-7010",
  "Confidential Information Form",
] as const;

export type IndianaOfficialPdfDocumentId =
  (typeof INDIANA_OFFICIAL_PDF_DOCUMENT_IDS)[number];

type IndianaUnknownSourceBoundary = {
  identityBindingStatus: "unknown_source_identity";
  sourceMaterializationState: "unknown_source_identity";
  candidateRendererLane: null;
  workerReadAuthorized: false;
  workerMaterializationAuthorized: false;
  generationAllowed: false;
  blocker:
    "authority_identity_required" | "legal_design_identity_split_required";
};

type IndianaExactSourceBoundary = {
  identityBindingStatus: "exact_pinned_identity";
  sourceMaterializationState: "binary_materialization_required";
  candidateRendererLane: "acroform_or_hybrid_fill";
  workerReadAuthorized: false;
  workerMaterializationAuthorized: false;
  generationAllowed: false;
  blocker: "captain_assignment_and_portable_projection_required";
};

export type IndianaOfficialPdfDocumentBoundary =
  IndianaUnknownSourceBoundary | IndianaExactSourceBoundary;

const unknownBoundary = (
  blocker: IndianaUnknownSourceBoundary["blocker"] = "authority_identity_required",
): IndianaUnknownSourceBoundary => ({
  identityBindingStatus: "unknown_source_identity",
  sourceMaterializationState: "unknown_source_identity",
  candidateRendererLane: null,
  workerReadAuthorized: false,
  workerMaterializationAuthorized: false,
  generationAllowed: false,
  blocker,
});

const exactBoundary = (): IndianaExactSourceBoundary => ({
  identityBindingStatus: "exact_pinned_identity",
  sourceMaterializationState: "binary_materialization_required",
  candidateRendererLane: "acroform_or_hybrid_fill",
  workerReadAuthorized: false,
  workerMaterializationAuthorized: false,
  generationAllowed: false,
  blocker: "captain_assignment_and_portable_projection_required",
});

export const indianaOfficialPdfDocumentBoundaries = {
  "CCA conviction expungement order": unknownBoundary(),
  "CCA conviction expungement petition": unknownBoundary(),
  "CCA Section 1 expungement order": unknownBoundary(),
  "CCA Section 1 non-conviction expungement petition": unknownBoundary(),
  "CCA-GF-0120-3016": unknownBoundary(),
  "CCA-XP-0120-7002 Form ACR": unknownBoundary(
    "legal_design_identity_split_required",
  ),
  "CCA-XP-0220-7008": exactBoundary(),
  "CCA-XP-0220-7009": exactBoundary(),
  "CCA-XP-0220-7010": exactBoundary(),
  "Confidential Information Form": unknownBoundary(),
} as const satisfies Record<
  IndianaOfficialPdfDocumentId,
  IndianaOfficialPdfDocumentBoundary
>;

export const indianaOfficialPdfRendererScaffold = {
  acroformOrHybrid: {
    candidateDocumentIds: [
      "CCA-XP-0220-7008",
      "CCA-XP-0220-7009",
      "CCA-XP-0220-7010",
    ],
    enabled: false,
  },
  coordinateOverlay: {
    candidateDocumentIds: [],
    enabled: false,
  },
  unknownSourceSentinel: {
    documentIds: INDIANA_OFFICIAL_PDF_DOCUMENT_IDS.filter(
      (documentId) =>
        indianaOfficialPdfDocumentBoundaries[documentId]
          .identityBindingStatus === "unknown_source_identity",
    ),
    renderer: null,
    enabled: false,
  },
  activeRendererCount: 0,
  activeMappingCount: 0,
  activeOverlayPlacementCount: 0,
  generationAllowed: false,
} as const;

export type IndianaOfficialPdfPreflightErrorCode =
  | "unknown_track"
  | "unknown_document"
  | "unknown_source_identity"
  | "source_materialization_required"
  | "family_not_renderable";

export class IndianaOfficialPdfPreflightError extends Error {
  readonly code: IndianaOfficialPdfPreflightErrorCode;
  readonly subjectId: string;
  readonly blockers: readonly string[];

  constructor(
    code: IndianaOfficialPdfPreflightErrorCode,
    subjectId: string,
    blockers: readonly string[],
  ) {
    super(
      `Indiana official-PDF preflight ${code} for ${subjectId}: ${blockers.join(
        ", ",
      )}`,
    );
    this.name = "IndianaOfficialPdfPreflightError";
    this.code = code;
    this.subjectId = subjectId;
    this.blockers = blockers;
  }
}

export function getIndianaOfficialPdfDocumentBoundary(
  documentId: string,
): IndianaOfficialPdfDocumentBoundary {
  if (!(documentId in indianaOfficialPdfDocumentBoundaries)) {
    throw new IndianaOfficialPdfPreflightError("unknown_document", documentId, [
      "document_not_declared_in_indiana_family",
    ]);
  }

  return indianaOfficialPdfDocumentBoundaries[
    documentId as IndianaOfficialPdfDocumentId
  ];
}

/**
 * Document bytes are deliberately unavailable at this boundary. Exact
 * registry identity is not equivalent to captain-projected, freshly verified
 * source materialization.
 */
export function assertIndianaOfficialPdfDocumentMaterialized(
  documentId: IndianaOfficialPdfDocumentId,
): never {
  const boundary = getIndianaOfficialPdfDocumentBoundary(documentId);

  if (boundary.identityBindingStatus === "unknown_source_identity") {
    throw new IndianaOfficialPdfPreflightError(
      "unknown_source_identity",
      documentId,
      [boundary.blocker],
    );
  }

  throw new IndianaOfficialPdfPreflightError(
    "source_materialization_required",
    documentId,
    [boundary.blocker],
  );
}

/**
 * This Indiana-only boundary cannot render. It contains no PDF library, source
 * locator, shared registry mutation, or live route import.
 */
export function assertIndianaOfficialPdfFamilyRenderable(
  trackId: IndianaOfficialPdfTrackId,
): never {
  if (!INDIANA_OFFICIAL_PDF_TRACK_IDS.includes(trackId)) {
    throw new IndianaOfficialPdfPreflightError("unknown_track", trackId, [
      "track_not_declared_in_indiana_family",
    ]);
  }

  throw new IndianaOfficialPdfPreflightError("family_not_renderable", trackId, [
    "seven_exact_authority_identities_required",
    "form_acr_legal_design_identity_split_required",
    "captain_assignment_and_portable_projection_required",
    "ten_source_field_maps_required",
    "source_backed_deterministic_sample_required",
    "technical_visual_legal_and_counsel_reviews_required",
  ]);
}
