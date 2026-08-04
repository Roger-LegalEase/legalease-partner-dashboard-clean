// Alaska official-PDF family boundary.
//
// This module is deliberately isolated from shared packet registries and live
// routes. It carries adopted identities and typed stop reasons only; it does
// not open source bytes, select a renderer, fill a form, or return a PDF.

export const ALASKA_OFFICIAL_PDF_FAMILY_ID =
  "rcap-ak-official-pdf-family" as const;

export const ALASKA_OFFICIAL_PDF_TRACK_IDS = [
  "ak-courtview",
  "ak-tf805",
  "ak-tf800",
  "ak-mistaken-identity"
] as const;

export type AlaskaOfficialPdfTrackId =
  (typeof ALASKA_OFFICIAL_PDF_TRACK_IDS)[number];

export const ALASKA_OFFICIAL_PDF_DOCUMENT_IDS = [
  "TF-810",
  "TF-805",
  "TF-800",
  "DPS-REQUEST-TO-SEAL-CRIM-INFO"
] as const;

export type AlaskaOfficialPdfDocumentId =
  (typeof ALASKA_OFFICIAL_PDF_DOCUMENT_IDS)[number];

export type AlaskaOfficialPdfAuthorityState =
  | "authority_mapped_packet_candidate"
  | "authority_unmanifested_source";

export type AlaskaOfficialPdfDocumentBoundary = {
  componentDocumentId: AlaskaOfficialPdfDocumentId;
  authorityState: AlaskaOfficialPdfAuthorityState;
  expectedSha256: string | null;
  expectedBytes: number | null;
  acquisitionEvidenceSha256: string | null;
  captainProjected: false;
  rendererEnabled: false;
  activeFieldMappingCount: 0;
  activeOverlayPlacementCount: 0;
};

export const ALASKA_OFFICIAL_PDF_DOCUMENT_BOUNDARIES:
  readonly AlaskaOfficialPdfDocumentBoundary[] = Object.freeze([
    {
      componentDocumentId: "TF-810",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "c5e55ce0c0bb2a008ad9cde5e62c4900f413c8fb64a913e94c81554c64b69582",
      expectedBytes: 85386,
      acquisitionEvidenceSha256: null,
      captainProjected: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "TF-805",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "96306d64eda397e25094f92c3d67a642372b82cba12f97c6666e5500136e8f54",
      expectedBytes: 93899,
      acquisitionEvidenceSha256: null,
      captainProjected: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "TF-800",
      authorityState: "authority_mapped_packet_candidate",
      expectedSha256:
        "94bab52533d74551f7a8ff8644a9671241b38075c7e05f10806d627dfb898cbd",
      expectedBytes: 130602,
      acquisitionEvidenceSha256: null,
      captainProjected: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    },
    {
      componentDocumentId: "DPS-REQUEST-TO-SEAL-CRIM-INFO",
      authorityState: "authority_unmanifested_source",
      expectedSha256: null,
      expectedBytes: null,
      acquisitionEvidenceSha256:
        "1fb64733f46c397beb69d1da8d72a1f1462669f8dfb7611e86a833c45aa5c80a",
      captainProjected: false,
      rendererEnabled: false,
      activeFieldMappingCount: 0,
      activeOverlayPlacementCount: 0
    }
  ]);

export const ALASKA_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS:
  Readonly<Record<AlaskaOfficialPdfDocumentId, readonly never[]>> =
  Object.freeze(
    Object.fromEntries(
      ALASKA_OFFICIAL_PDF_DOCUMENT_IDS.map((documentId) => [
        documentId,
        Object.freeze([])
      ])
    ) as Record<AlaskaOfficialPdfDocumentId, readonly never[]>
  );

export const ALASKA_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS:
  Readonly<Record<AlaskaOfficialPdfDocumentId, readonly never[]>> =
  Object.freeze(
    Object.fromEntries(
      ALASKA_OFFICIAL_PDF_DOCUMENT_IDS.map((documentId) => [
        documentId,
        Object.freeze([])
      ])
    ) as Record<AlaskaOfficialPdfDocumentId, readonly never[]>
  );

export type AlaskaOfficialPdfErrorCode =
  | "unsupported_track"
  | "unsupported_document"
  | "no_filing_required"
  | "process_guidance_missing"
  | "required_before_filing"
  | "manual_completion_required"
  | "post_generation_handoff"
  | "captain_projection_required"
  | "authority_unmanifested"
  | "generation_disabled";

export class AlaskaOfficialPdfFamilyError extends Error {
  constructor(
    readonly code: AlaskaOfficialPdfErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "AlaskaOfficialPdfFamilyError";
  }
}

function documentBoundary(
  componentDocumentId: string
): AlaskaOfficialPdfDocumentBoundary {
  const boundary = ALASKA_OFFICIAL_PDF_DOCUMENT_BOUNDARIES.find(
    (candidate) => candidate.componentDocumentId === componentDocumentId
  );

  if (!boundary) {
    throw new AlaskaOfficialPdfFamilyError(
      "unsupported_document",
      `Alaska official-PDF family does not declare "${componentDocumentId}".`,
      { componentDocumentId }
    );
  }

  return boundary;
}

/**
 * Resolves only the safe no-filing CourtView outcome. A positive lookup stays
 * blocked because the adopted first-stage process-guidance specification is
 * absent; this function never advances to source selection.
 */
export function evaluateAlaskaCourtviewLookup(
  stillOnCourtView: boolean
): "no_filing_required" {
  if (!stillOnCourtView) {
    return "no_filing_required";
  }

  throw new AlaskaOfficialPdfFamilyError(
    "process_guidance_missing",
    "The adopted CourtView lookup stage has no governing process-guidance specification.",
    { trackId: "ak-courtview", stillOnCourtView }
  );
}

/**
 * Always throws. Repository identity evidence and the published acquisition
 * record are never interpreted as a captain-owned source projection.
 */
export function assertAlaskaOfficialPdfDocumentReady(
  componentDocumentId: string
): never {
  const boundary = documentBoundary(componentDocumentId);

  if (boundary.authorityState === "authority_unmanifested_source") {
    throw new AlaskaOfficialPdfFamilyError(
      "authority_unmanifested",
      `${componentDocumentId} is confirmed by acquisition evidence but is not a retained Edition 1.2 packet asset.`,
      {
        componentDocumentId,
        acquisitionEvidenceSha256: boundary.acquisitionEvidenceSha256
      }
    );
  }

  throw new AlaskaOfficialPdfFamilyError(
    "captain_projection_required",
    `${componentDocumentId} requires a captain assignment anchor and portable projection; repository identity evidence is not a worker source.`,
    {
      componentDocumentId,
      expectedSha256: boundary.expectedSha256,
      expectedBytes: boundary.expectedBytes
    }
  );
}

/**
 * Runtime generation remains impossible until a separate authorized change
 * supplies reviewed projections, mappings, ownership, assembly, and registry
 * wiring.
 */
export function renderAlaskaOfficialPdfFamilyPacket(
  trackId: string,
  facts: Readonly<Record<string, unknown>>
): never {
  void facts;

  if (
    !ALASKA_OFFICIAL_PDF_TRACK_IDS.includes(
      trackId as (typeof ALASKA_OFFICIAL_PDF_TRACK_IDS)[number]
    )
  ) {
    throw new AlaskaOfficialPdfFamilyError(
      "unsupported_track",
      `Alaska official-PDF family does not declare track "${trackId}".`,
      { trackId }
    );
  }

  throw new AlaskaOfficialPdfFamilyError(
    "generation_disabled",
    `${trackId} remains runtime-disabled; no Alaska official-PDF renderer is active.`,
    {
      trackId,
      familyId: ALASKA_OFFICIAL_PDF_FAMILY_ID,
      activeRendererCount: 0
    }
  );
}
