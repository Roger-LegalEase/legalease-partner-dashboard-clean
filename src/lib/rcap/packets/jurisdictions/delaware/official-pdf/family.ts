export const DE_OFFICIAL_PDF_FAMILY_ID = "rcap-de-official-pdf-family" as const;

export const DE_OFFICIAL_PDF_TRACK_IDS = [
  "de_discretionary_family_court",
  "de_discretionary_superior_court",
  "de_mandatory_expungement",
  "de_pardon_expungement"
] as const;

export const DE_OFFICIAL_PDF_DOCUMENT_IDS = [
  "CIV_EXP_02_A",
  "CIV_EXP_02_B",
  "CIV_EXP_04_A",
  "CIV_EXP_08_A",
  "DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION",
  "FORM-281",
  "FORM-281E"
] as const;

export const DE_OFFICIAL_PDF_SOURCE_BOUNDARIES = [
  {
    "componentDocumentId": "CIV_EXP_02_A",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "CIV_EXP_02_B",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "CIV_EXP_04_A",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "CIV_EXP_08_A",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "FORM-281",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "FORM-281E",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  }
] as const;

export const DE_OFFICIAL_PDF_ACTIVE_RENDERERS = [] as const;
export const DE_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS = [] as const;
export const DE_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS = [] as const;
export const DE_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES = [] as const;

export class DelawareOfficialPdfFamilyBlockedError extends Error {
  readonly code = "official_pdf_family_blocked";

  constructor(
    readonly familyId: typeof DE_OFFICIAL_PDF_FAMILY_ID,
    readonly trackId: (typeof DE_OFFICIAL_PDF_TRACK_IDS)[number]
  ) {
    super(
      `${familyId}:${trackId} is blocked pending authority manifestation, captain-projected sources, confirmed mappings, deterministic samples, and review.`
    );
    this.name = "DelawareOfficialPdfFamilyBlockedError";
  }
}

export function renderDelawareOfficialPdfFamilyPacket(
  trackId: (typeof DE_OFFICIAL_PDF_TRACK_IDS)[number]
): never {
  throw new DelawareOfficialPdfFamilyBlockedError(
    DE_OFFICIAL_PDF_FAMILY_ID,
    trackId
  );
}
