/**
 * Missouri official-PDF pre-materialization boundary.
 *
 * This module is intentionally isolated from shared packet registries and live
 * routes. It exposes the adopted component identities and typed terminal stops
 * only. It does not resolve a source path, read or materialize source bytes,
 * select a renderer, map a field, assemble output pages, or return a PDF.
 */

export const MISSOURI_OFFICIAL_PDF_FAMILY_ID =
  "rcap-mo-official-pdf-family" as const;

export const MISSOURI_OFFICIAL_PDF_TRACK_IDS = [
  "mo-311-326-minor-in-possession",
  "mo-575-120-identity-theft-correction",
  "mo-610-122-arrest-expungement",
  "mo-610-130-first-intoxication",
  "mo-610-140-arrest",
  "mo-610-140-conviction",
  "mo-610-145-mistaken-identity",
  "mo-art-xiv-marijuana"
] as const;

export type MissouriOfficialPdfTrackId =
  (typeof MISSOURI_OFFICIAL_PDF_TRACK_IDS)[number];

export const MISSOURI_OFFICIAL_PDF_DOCUMENT_IDS = [
  "CR143",
  "CR145",
  "CR300",
  "CR301",
  "CR310",
  "CR311",
  "CR360",
  "CR370",
  "CR375",
  "FI-05",
  "GN10"
] as const;

export type MissouriOfficialPdfDocumentId =
  (typeof MISSOURI_OFFICIAL_PDF_DOCUMENT_IDS)[number];

export const MISSOURI_OFFICIAL_PDF_SOURCE_AUTHORIZATION = {
  workerMaterializationAuthorized: false,
  workerReadAuthorized: false,
  workerReady: false
} as const;

type MissouriOfficialPdfSourceStop = {
  workerMaterializationAuthorized: false;
  workerReadAuthorized: false;
  workerReady: false;
  captainProjected: false;
  rendererEnabled: false;
  activeFieldMappingCount: 0;
  activeOverlayPlacementCount: 0;
};

type MissouriExactOfficialPdfBoundary = MissouriOfficialPdfSourceStop & {
  componentDocumentId: MissouriOfficialPdfDocumentId;
  identityBindingStatus: "exact_pinned_identity";
  authorityDocumentId: string;
  authorityDocumentRole: "PETITION" | "PRIMARY_FILING" | "COVER_SHEET";
  assetClass: "packet_form" | "source_gated";
  packetCandidate: boolean;
  expectedSha256: string;
  expectedBytes: number;
  expectedMediaType: "application/pdf";
  candidateRendererLane: "acroform_or_hybrid_fill";
  sourceMaterializationState: "binary_materialization_required";
};

type MissouriUnresolvedOfficialPdfBoundary = MissouriOfficialPdfSourceStop & {
  componentDocumentId: MissouriOfficialPdfDocumentId;
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
};

type MissouriUnsupportedContainerBoundary = MissouriOfficialPdfSourceStop & {
  componentDocumentId: "GN10";
  identityBindingStatus: "unsupported_container_no_pdf_requirement";
  authorityDocumentId: null;
  authorityDocumentRole: null;
  assetClass: null;
  packetCandidate: false;
  expectedSha256: null;
  expectedBytes: null;
  expectedMediaType: null;
  candidateRendererLane: null;
  sourceMaterializationState: "unsupported_source_container";
  nonSelectableAuthorityAssetMediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

export type MissouriOfficialPdfDocumentBoundary =
  | MissouriExactOfficialPdfBoundary
  | MissouriUnresolvedOfficialPdfBoundary
  | MissouriUnsupportedContainerBoundary;

type MissouriNonExactOfficialPdfBoundary =
  | MissouriUnresolvedOfficialPdfBoundary
  | MissouriUnsupportedContainerBoundary;

export const MISSOURI_OFFICIAL_PDF_DOCUMENT_BOUNDARIES = [
  {
    componentDocumentId: "CR143",
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
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "CR145",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "CR145",
    authorityDocumentRole: "PETITION",
    assetClass: "packet_form",
    packetCandidate: true,
    expectedSha256:
      "7c527bf351e9ab08658f901abc9be15e12e5beb2afe7ded14a8c5e2f0d6eb641",
    expectedBytes: 1256968,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "acroform_or_hybrid_fill",
    sourceMaterializationState: "binary_materialization_required",
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "CR300",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "CR300",
    authorityDocumentRole: "PETITION",
    assetClass: "source_gated",
    packetCandidate: false,
    expectedSha256:
      "0bdda44514ec4505d736c1648502bc768d48fab5cfc63d51635e57f9380aaf44",
    expectedBytes: 468880,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "acroform_or_hybrid_fill",
    sourceMaterializationState: "binary_materialization_required",
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "CR301",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "CR301",
    authorityDocumentRole: "PRIMARY_FILING",
    assetClass: "source_gated",
    packetCandidate: false,
    expectedSha256:
      "5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8",
    expectedBytes: 952015,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "acroform_or_hybrid_fill",
    sourceMaterializationState: "binary_materialization_required",
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "CR310",
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
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "CR311",
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
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "CR360",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "CR360",
    authorityDocumentRole: "PETITION",
    assetClass: "packet_form",
    packetCandidate: true,
    expectedSha256:
      "6bfbf26a54f374f7c6bd6dcb59bc199bfe897890c1b3265513b2e7df43990745",
    expectedBytes: 707097,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "acroform_or_hybrid_fill",
    sourceMaterializationState: "binary_materialization_required",
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "CR370",
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
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "CR375",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "CR375",
    authorityDocumentRole: "PETITION",
    assetClass: "packet_form",
    packetCandidate: true,
    expectedSha256:
      "2cfca7e9bea55d27de82b9aed2875db02872345592cc69af7a5aab400e4b0780",
    expectedBytes: 694722,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "acroform_or_hybrid_fill",
    sourceMaterializationState: "binary_materialization_required",
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "FI-05",
    identityBindingStatus: "exact_pinned_identity",
    authorityDocumentId: "FI-05",
    authorityDocumentRole: "COVER_SHEET",
    assetClass: "source_gated",
    packetCandidate: false,
    expectedSha256:
      "53f1e04eba653d7ed8e2f2f059e57854d3780845e6364bb6b2a57c7728cd412e",
    expectedBytes: 298649,
    expectedMediaType: "application/pdf",
    candidateRendererLane: "acroform_or_hybrid_fill",
    sourceMaterializationState: "binary_materialization_required",
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  },
  {
    componentDocumentId: "GN10",
    identityBindingStatus: "unsupported_container_no_pdf_requirement",
    authorityDocumentId: null,
    authorityDocumentRole: null,
    assetClass: null,
    packetCandidate: false,
    expectedSha256: null,
    expectedBytes: null,
    expectedMediaType: null,
    candidateRendererLane: null,
    sourceMaterializationState: "unsupported_source_container",
    nonSelectableAuthorityAssetMediaType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerReady: false,
    captainProjected: false,
    rendererEnabled: false,
    activeFieldMappingCount: 0,
    activeOverlayPlacementCount: 0
  }
] as const satisfies readonly MissouriOfficialPdfDocumentBoundary[];

export type MissouriOfficialPdfComponent = {
  trackId: MissouriOfficialPdfTrackId;
  componentId: string;
  componentDocumentId: MissouriOfficialPdfDocumentId;
  role:
    | "primary_filing"
    | "cover_sheet"
    | "proposed_order"
    | "continuation"
    | "fee_waiver";
  requirement: "required" | "conditional";
};

export const MISSOURI_OFFICIAL_PDF_COMPONENTS = [
  {
    trackId: "mo-311-326-minor-in-possession",
    componentId: "mo-311-326-minor-in-possession-cover-sheet-3",
    componentDocumentId: "FI-05",
    role: "cover_sheet",
    requirement: "conditional"
  },
  {
    trackId: "mo-311-326-minor-in-possession",
    componentId: "mo-311-326-minor-in-possession-fee-waiver-4",
    componentDocumentId: "GN10",
    role: "fee_waiver",
    requirement: "conditional"
  },
  {
    trackId: "mo-575-120-identity-theft-correction",
    componentId:
      "mo-575-120-identity-theft-correction-primary-filing-1",
    componentDocumentId: "CR300",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "mo-575-120-identity-theft-correction",
    componentId: "mo-575-120-identity-theft-correction-cover-sheet-2",
    componentDocumentId: "FI-05",
    role: "cover_sheet",
    requirement: "conditional"
  },
  {
    trackId: "mo-575-120-identity-theft-correction",
    componentId:
      "mo-575-120-identity-theft-correction-proposed-order-4",
    componentDocumentId: "CR310",
    role: "proposed_order",
    requirement: "conditional"
  },
  {
    trackId: "mo-575-120-identity-theft-correction",
    componentId: "mo-575-120-identity-theft-correction-fee-waiver-5",
    componentDocumentId: "GN10",
    role: "fee_waiver",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-122-arrest-expungement",
    componentId: "mo-610-122-arrest-expungement-primary-filing-1",
    componentDocumentId: "CR145",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "mo-610-122-arrest-expungement",
    componentId: "mo-610-122-arrest-expungement-cover-sheet-2",
    componentDocumentId: "FI-05",
    role: "cover_sheet",
    requirement: "required"
  },
  {
    trackId: "mo-610-122-arrest-expungement",
    componentId: "mo-610-122-arrest-expungement-proposed-order-4",
    componentDocumentId: "CR143",
    role: "proposed_order",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-122-arrest-expungement",
    componentId: "mo-610-122-arrest-expungement-fee-waiver-5",
    componentDocumentId: "GN10",
    role: "fee_waiver",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-130-first-intoxication",
    componentId: "mo-610-130-first-intoxication-cover-sheet-3",
    componentDocumentId: "FI-05",
    role: "cover_sheet",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-130-first-intoxication",
    componentId: "mo-610-130-first-intoxication-fee-waiver-4",
    componentDocumentId: "GN10",
    role: "fee_waiver",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-140-arrest",
    componentId: "mo-610-140-arrest-primary-filing-1",
    componentDocumentId: "CR360",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "mo-610-140-arrest",
    componentId: "mo-610-140-arrest-continuation-2",
    componentDocumentId: "CR360",
    role: "continuation",
    requirement: "required"
  },
  {
    trackId: "mo-610-140-arrest",
    componentId: "mo-610-140-arrest-cover-sheet-3",
    componentDocumentId: "FI-05",
    role: "cover_sheet",
    requirement: "required"
  },
  {
    trackId: "mo-610-140-arrest",
    componentId: "mo-610-140-arrest-proposed-order-4",
    componentDocumentId: "CR370",
    role: "proposed_order",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-140-arrest",
    componentId: "mo-610-140-arrest-fee-waiver-5",
    componentDocumentId: "GN10",
    role: "fee_waiver",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-140-conviction",
    componentId: "mo-610-140-conviction-primary-filing-1",
    componentDocumentId: "CR360",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "mo-610-140-conviction",
    componentId: "mo-610-140-conviction-cover-sheet-2",
    componentDocumentId: "FI-05",
    role: "cover_sheet",
    requirement: "required"
  },
  {
    trackId: "mo-610-140-conviction",
    componentId: "mo-610-140-conviction-proposed-order-3",
    componentDocumentId: "CR370",
    role: "proposed_order",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-140-conviction",
    componentId: "mo-610-140-conviction-continuation-4",
    componentDocumentId: "CR360",
    role: "continuation",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-140-conviction",
    componentId: "mo-610-140-conviction-fee-waiver-5",
    componentDocumentId: "GN10",
    role: "fee_waiver",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-145-mistaken-identity",
    componentId: "mo-610-145-mistaken-identity-primary-filing-1",
    componentDocumentId: "CR301",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "mo-610-145-mistaken-identity",
    componentId: "mo-610-145-mistaken-identity-cover-sheet-2",
    componentDocumentId: "FI-05",
    role: "cover_sheet",
    requirement: "conditional"
  },
  {
    trackId: "mo-610-145-mistaken-identity",
    componentId: "mo-610-145-mistaken-identity-proposed-order-3",
    componentDocumentId: "CR311",
    role: "proposed_order",
    requirement: "conditional"
  },
  {
    trackId: "mo-art-xiv-marijuana",
    componentId: "mo-art-xiv-marijuana-primary-filing-1",
    componentDocumentId: "CR375",
    role: "primary_filing",
    requirement: "required"
  },
  {
    trackId: "mo-art-xiv-marijuana",
    componentId: "mo-art-xiv-marijuana-cover-sheet-2",
    componentDocumentId: "FI-05",
    role: "cover_sheet",
    requirement: "required"
  },
  {
    trackId: "mo-art-xiv-marijuana",
    componentId: "mo-art-xiv-marijuana-continuation-3",
    componentDocumentId: "CR375",
    role: "continuation",
    requirement: "conditional"
  }
] as const satisfies readonly MissouriOfficialPdfComponent[];

export const MISSOURI_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS: readonly never[] = [];
export const MISSOURI_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS: readonly never[] =
  [];

export type MissouriOfficialPdfBoundaryCode =
  | "unsupported_track"
  | "unsupported_document"
  | "unknown_source_identity"
  | "unsupported_source_container"
  | "exact_source_pin_mismatch"
  | "binary_materialization_required"
  | "generation_disabled"
  | "packet_assembly_blocked"
  | "family_materialization_required";

export class MissouriOfficialPdfFamilyBlockedError extends Error {
  constructor(
    readonly code: MissouriOfficialPdfBoundaryCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "MissouriOfficialPdfFamilyBlockedError";
  }
}

function documentBoundary(
  componentDocumentId: string
): MissouriOfficialPdfDocumentBoundary {
  const boundary = MISSOURI_OFFICIAL_PDF_DOCUMENT_BOUNDARIES.find(
    (candidate) => candidate.componentDocumentId === componentDocumentId
  );

  if (!boundary) {
    throw new MissouriOfficialPdfFamilyBlockedError(
      "unsupported_document",
      `Missouri official-PDF family does not declare "${componentDocumentId}".`,
      { componentDocumentId }
    );
  }

  return boundary;
}

function assertDeclaredTrack(trackId: string): MissouriOfficialPdfTrackId {
  if (
    !MISSOURI_OFFICIAL_PDF_TRACK_IDS.includes(
      trackId as MissouriOfficialPdfTrackId
    )
  ) {
    throw new MissouriOfficialPdfFamilyBlockedError(
      "unsupported_track",
      `Missouri official-PDF family does not declare track "${trackId}".`,
      { trackId }
    );
  }

  return trackId as MissouriOfficialPdfTrackId;
}

function throwNonExactIdentity(
  boundary: MissouriNonExactOfficialPdfBoundary
): never {
  if (boundary.identityBindingStatus === "unknown_source_identity") {
    throw new MissouriOfficialPdfFamilyBlockedError(
      "unknown_source_identity",
      `${boundary.componentDocumentId} has no exact adopted PDF authority identity and cannot select a source.`,
      {
        componentDocumentId: boundary.componentDocumentId,
        expectedSha256: null,
        expectedBytes: null
      }
    );
  }

  throw new MissouriOfficialPdfFamilyBlockedError(
    "unsupported_source_container",
    "GN10 has an exact authority asset only in an unsupported DOCX container; the obsolete PDF is non-selectable.",
    {
      componentDocumentId: boundary.componentDocumentId,
      expectedMediaType: null,
      authorityAssetMediaType: boundary.nonSelectableAuthorityAssetMediaType
    }
  );
}

/**
 * Confirms an immutable identity assertion only. This does not authorize a
 * worker read or materialization, and it does not imply runtime readiness.
 */
export function assertMissouriExactSourcePin(
  componentDocumentId: string,
  sha256: string,
  bytes: number
): true {
  const boundary = documentBoundary(componentDocumentId);

  if (boundary.identityBindingStatus !== "exact_pinned_identity") {
    return throwNonExactIdentity(boundary);
  }

  if (
    sha256 !== boundary.expectedSha256 ||
    bytes !== boundary.expectedBytes
  ) {
    throw new MissouriOfficialPdfFamilyBlockedError(
      "exact_source_pin_mismatch",
      `${componentDocumentId} does not match the adopted immutable source pin.`,
      {
        componentDocumentId,
        assertedSha256: sha256,
        assertedBytes: bytes,
        expectedSha256: boundary.expectedSha256,
        expectedBytes: boundary.expectedBytes
      }
    );
  }

  return true;
}

/**
 * Always throws. Exact identities still need captain assignments and verified
 * portable projections; unknown and unsupported identities stop earlier.
 */
export function preflightMissouriOfficialPdfDocument(
  componentDocumentId: string
): never {
  const boundary = documentBoundary(componentDocumentId);

  if (boundary.identityBindingStatus !== "exact_pinned_identity") {
    return throwNonExactIdentity(boundary);
  }

  throw new MissouriOfficialPdfFamilyBlockedError(
    "binary_materialization_required",
    `${componentDocumentId} requires a captain assignment and verified portable PDF projection.`,
    {
      componentDocumentId,
      authorityDocumentId: boundary.authorityDocumentId,
      expectedSha256: boundary.expectedSha256,
      expectedBytes: boundary.expectedBytes,
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false
    }
  );
}

/**
 * Runtime rendering is deliberately unavailable. This terminal boundary is
 * not imported by any shared route or packet registry.
 */
export function assertMissouriOfficialPdfTrackRenderable(
  trackId: string
): never {
  assertDeclaredTrack(trackId);

  throw new MissouriOfficialPdfFamilyBlockedError(
    "generation_disabled",
    `${trackId} remains runtime-disabled; no Missouri official-PDF renderer is active.`,
    {
      trackId,
      familyId: MISSOURI_OFFICIAL_PDF_FAMILY_ID,
      exactPdfIdentityCount: 6,
      unknownPdfIdentityCount: 4,
      unsupportedContainerIdentityCount: 1,
      activeRendererCount: 0
    }
  );
}

/**
 * Packet composition remains blocked even after track selection because every
 * packet still has at least one pre-materialization dependency.
 */
export function assertMissouriOfficialPdfPacketAssemblable(
  trackId: string
): never {
  assertDeclaredTrack(trackId);

  throw new MissouriOfficialPdfFamilyBlockedError(
    "packet_assembly_blocked",
    `${trackId} cannot assemble a production packet from the current pre-materialization scaffold.`,
    {
      trackId,
      familyId: MISSOURI_OFFICIAL_PDF_FAMILY_ID,
      routeReady: false,
      runtimeRegistered: false
    }
  );
}

/**
 * Aggregate source readiness is false until every exact identity has a
 * captain-owned verified projection and every unresolved/unsupported slot has
 * an approved resolution.
 */
export function assertMissouriOfficialPdfFamilyMaterialized(): never {
  throw new MissouriOfficialPdfFamilyBlockedError(
    "family_materialization_required",
    "The Missouri official-PDF family has no worker-readable or materialized source set.",
    {
      familyId: MISSOURI_OFFICIAL_PDF_FAMILY_ID,
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false,
      captainProjectedSourceCount: 0
    }
  );
}
