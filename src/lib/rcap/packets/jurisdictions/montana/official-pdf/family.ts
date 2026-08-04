export const MT_OFFICIAL_PDF_FAMILY_ID = "rcap-mt-official-pdf-family" as const;

export const MT_OFFICIAL_PDF_TRACK_IDS = [
  "mt_deferred_dismissal",
  "mt_misdemeanor_expungement",
  "mt_mmrta_completed",
  "mt_mmrta_serving",
  "mt_nonconviction_removal"
] as const;

export const MT_OFFICIAL_PDF_DOCUMENT_IDS = [
  "EXPUNGEMENTREMOVALREQUESTFORM.DOCX",
  "MT-FORM-A",
  "MT-FORM-B",
  "MT-OCA-MMRTA"
] as const;

export const MT_OFFICIAL_PDF_SOURCE_BOUNDARIES = [
  {
    "componentDocumentId": "EXPUNGEMENTREMOVALREQUESTFORM.DOCX",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "MT-FORM-A",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "MT-FORM-B",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "MT-OCA-MMRTA",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  }
] as const;

export const MT_OFFICIAL_PDF_ACTIVE_RENDERERS = [] as const;
export const MT_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS = [] as const;
export const MT_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS = [] as const;
export const MT_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES = [] as const;

export class MontanaOfficialPdfFamilyBlockedError extends Error {
  readonly code = "official_pdf_family_blocked";

  constructor(
    readonly familyId: typeof MT_OFFICIAL_PDF_FAMILY_ID,
    readonly trackId: (typeof MT_OFFICIAL_PDF_TRACK_IDS)[number]
  ) {
    super(
      `${familyId}:${trackId} is blocked pending authority manifestation, captain-projected sources, confirmed mappings, deterministic samples, and review.`
    );
    this.name = "MontanaOfficialPdfFamilyBlockedError";
  }
}

export function renderMontanaOfficialPdfFamilyPacket(
  trackId: (typeof MT_OFFICIAL_PDF_TRACK_IDS)[number]
): never {
  throw new MontanaOfficialPdfFamilyBlockedError(
    MT_OFFICIAL_PDF_FAMILY_ID,
    trackId
  );
}
