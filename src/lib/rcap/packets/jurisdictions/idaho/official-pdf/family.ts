export const ID_OFFICIAL_PDF_FAMILY_ID = "rcap-id-official-pdf-family" as const;

export const ID_OFFICIAL_PDF_TRACK_IDS = [
  "id_clean_slate_shield",
  "id_isp_expungement"
] as const;

export const ID_OFFICIAL_PDF_DOCUMENT_IDS = [
  "ISC-PETITION-TO-SHIELD-67-3004-11",
  "ISP-BCI-EXPUNGEMENT-APPLICATION"
] as const;

export const ID_OFFICIAL_PDF_SOURCE_BOUNDARIES = [
  {
    "componentDocumentId": "ISC-PETITION-TO-SHIELD-67-3004-11",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "ISP-BCI-EXPUNGEMENT-APPLICATION",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  }
] as const;

export const ID_OFFICIAL_PDF_ACTIVE_RENDERERS = [] as const;
export const ID_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS = [] as const;
export const ID_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS = [] as const;
export const ID_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES = [] as const;

export class IdahoOfficialPdfFamilyBlockedError extends Error {
  readonly code = "official_pdf_family_blocked";

  constructor(
    readonly familyId: typeof ID_OFFICIAL_PDF_FAMILY_ID,
    readonly trackId: (typeof ID_OFFICIAL_PDF_TRACK_IDS)[number]
  ) {
    super(
      `${familyId}:${trackId} is blocked pending authority manifestation, captain-projected sources, confirmed mappings, deterministic samples, and review.`
    );
    this.name = "IdahoOfficialPdfFamilyBlockedError";
  }
}

export function renderIdahoOfficialPdfFamilyPacket(
  trackId: (typeof ID_OFFICIAL_PDF_TRACK_IDS)[number]
): never {
  throw new IdahoOfficialPdfFamilyBlockedError(
    ID_OFFICIAL_PDF_FAMILY_ID,
    trackId
  );
}
