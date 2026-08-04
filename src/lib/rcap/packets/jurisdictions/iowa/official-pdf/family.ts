export const IA_OFFICIAL_PDF_FAMILY_ID = "rcap-ia-official-pdf-family" as const;

export const IA_OFFICIAL_PDF_TRACK_IDS = [
  "ia-12346",
  "ia-12347",
  "ia-7251",
  "ia-901c2",
  "ia-901c3",
  "ia-dci77"
] as const;

export const IA_OFFICIAL_PDF_DOCUMENT_IDS = [
  "Certification of Service by Mailing or Delivery",
  "DCI-76 Criminal History Record Check Billing Form",
  "DCI-77 Criminal History Record Check Request Form",
  "Rule 2.86 Form 1",
  "Rule 2.86 Form 2",
  "Rule 2.86 Form 2 attached sheet",
  "Rule 2.86 Form 3",
  "Rule 2.86 Form 4",
  "Rule 2.86 Form 5"
] as const;

export const IA_OFFICIAL_PDF_SOURCE_BOUNDARIES = [
  {
    "componentDocumentId": "Certification of Service by Mailing or Delivery",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "DCI-76 Criminal History Record Check Billing Form",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "DCI-77 Criminal History Record Check Request Form",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "321062c91b3d9e2c8f255d62d20186352a2b5884e0ccd4310a18a3a073d7f516",
    "expectedBytes": 1076864,
    "rendererLaneCandidate": "acroform_or_hybrid_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "Rule 2.86 Form 1",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "d3e68933c4ed878c72784c5b2b191281116f87d953fa6203aecb702584cb5053",
    "expectedBytes": 268162,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "Rule 2.86 Form 2",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "df3380d9ff4ea9272be6cf12b58a3c6cbbab93dead855ed1c97280aa2dc24d12",
    "expectedBytes": 331574,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "Rule 2.86 Form 2 attached sheet",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "Rule 2.86 Form 3",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "6f222685001373ba2e1ef63509e3b42e7e47d5067bfb0ed3b130b62040d80f01",
    "expectedBytes": 263607,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "Rule 2.86 Form 4",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "279eefe8c5f6b51ec73eb943c9a479757ff3d2c439177bfbf3044e7e71f66c45",
    "expectedBytes": 288751,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "Rule 2.86 Form 5",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "ed46614b0b182dca05020009f1add549e07ac7d0bbd7328bbd9cc7ae26934cef",
    "expectedBytes": 288129,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  }
] as const;

export const IA_OFFICIAL_PDF_ACTIVE_RENDERERS = [] as const;
export const IA_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS = [] as const;
export const IA_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS = [] as const;
export const IA_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES = [] as const;

export class IowaOfficialPdfFamilyBlockedError extends Error {
  readonly code = "official_pdf_family_blocked";

  constructor(
    readonly familyId: typeof IA_OFFICIAL_PDF_FAMILY_ID,
    readonly trackId: (typeof IA_OFFICIAL_PDF_TRACK_IDS)[number]
  ) {
    super(
      `${familyId}:${trackId} is blocked pending authority manifestation, captain-projected sources, confirmed mappings, deterministic samples, and review.`
    );
    this.name = "IowaOfficialPdfFamilyBlockedError";
  }
}

export function renderIowaOfficialPdfFamilyPacket(
  trackId: (typeof IA_OFFICIAL_PDF_TRACK_IDS)[number]
): never {
  throw new IowaOfficialPdfFamilyBlockedError(
    IA_OFFICIAL_PDF_FAMILY_ID,
    trackId
  );
}
