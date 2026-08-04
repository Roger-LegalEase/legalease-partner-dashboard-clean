export const KS_OFFICIAL_PDF_FAMILY_ID = "rcap-ks-official-pdf-family" as const;

export const KS_OFFICIAL_PDF_TRACK_IDS = [
  "ks-21-6614-conviction",
  "ks-21-6614-diversion",
  "ks-21-6614-prostitution-coercion",
  "ks-21-6614-specialty-court",
  "ks-22-2410-arrest",
  "ks-22-4908-registration-relief"
] as const;

export const KS_OFFICIAL_PDF_DOCUMENT_IDS = [
  "KS-CRIMINAL-COVER-SHEET-10-14-2025",
  "KSJC-NOTICE-OF-HEARING-12-2016",
  "KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016",
  "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016",
  "KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016",
  "KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
  "KSJC-ORDER-RELIEF-FROM-OFFENDER-REGISTRATION-COVER-SHEET-06-2022",
  "KSJC-PETITION-EXPUNGEMENT-ARREST-RECORD-02-2013",
  "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
  "KSJC-PETITION-RELIEF-FROM-OFFENDER-REGISTRATION-06-2022"
] as const;

export const KS_OFFICIAL_PDF_SOURCE_BOUNDARIES = [
  {
    "componentDocumentId": "KS-CRIMINAL-COVER-SHEET-10-14-2025",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "KSJC-NOTICE-OF-HEARING-12-2016",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "d13bc7b7b2a9c5367c785c1de4f3a8d6d79410ef29a3c9c86a5b903057d249d5",
    "expectedBytes": 55112,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "KSJC-ORDER-RELIEF-FROM-OFFENDER-REGISTRATION-COVER-SHEET-06-2022",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "0c9c5a751086eee0098925e6e7398f2f0b13dd62cc95bcbffab8732d11b6a0bd",
    "expectedBytes": 217564,
    "rendererLaneCandidate": "acroform_or_hybrid_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "KSJC-PETITION-EXPUNGEMENT-ARREST-RECORD-02-2013",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "bf4b2309f831aa317d235389a6bd1f24bca55075290ddb3d916083c6f64d840d",
    "expectedBytes": 51084,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "KSJC-PETITION-RELIEF-FROM-OFFENDER-REGISTRATION-06-2022",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "9264dc51531cd8eea47fd99b00871ff49205e0f2c9ab10cb0d7420d6ca3cf396",
    "expectedBytes": 401878,
    "rendererLaneCandidate": "acroform_or_hybrid_candidate",
    "workerReady": false
  }
] as const;

export const KS_OFFICIAL_PDF_ACTIVE_RENDERERS = [] as const;
export const KS_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS = [] as const;
export const KS_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS = [] as const;
export const KS_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES = [] as const;

export class KansasOfficialPdfFamilyBlockedError extends Error {
  readonly code = "official_pdf_family_blocked";

  constructor(
    readonly familyId: typeof KS_OFFICIAL_PDF_FAMILY_ID,
    readonly trackId: (typeof KS_OFFICIAL_PDF_TRACK_IDS)[number]
  ) {
    super(
      `${familyId}:${trackId} is blocked pending authority manifestation, captain-projected sources, confirmed mappings, deterministic samples, and review.`
    );
    this.name = "KansasOfficialPdfFamilyBlockedError";
  }
}

export function renderKansasOfficialPdfFamilyPacket(
  trackId: (typeof KS_OFFICIAL_PDF_TRACK_IDS)[number]
): never {
  throw new KansasOfficialPdfFamilyBlockedError(
    KS_OFFICIAL_PDF_FAMILY_ID,
    trackId
  );
}
