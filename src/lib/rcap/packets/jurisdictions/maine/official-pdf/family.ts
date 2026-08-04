export const ME_OFFICIAL_PDF_FAMILY_ID = "rcap-me-official-pdf-family" as const;

export const ME_OFFICIAL_PDF_TRACK_IDS = [
  "me-seal-gen",
  "me-seal-prost",
  "me-seal-survivor"
] as const;

export const ME_OFFICIAL_PDF_DOCUMENT_IDS = [
  "CR-218",
  "CR-289",
  "CR-307",
  "CR-308"
] as const;

export const ME_OFFICIAL_PDF_SOURCE_BOUNDARIES = [
  {
    "componentDocumentId": "CR-218",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "82a9e8084346aa736cf25dc6c663d511e96e7205900b97a7dc2adc4ceec905d4",
    "expectedBytes": 190343,
    "rendererLaneCandidate": "nonrenderable_source_policy_required",
    "workerReady": false
  },
  {
    "componentDocumentId": "CR-289",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "bbf89387690d1ab17984c5b799366a26196e8d71b5172bc2768f593b819a7423",
    "expectedBytes": 166837,
    "rendererLaneCandidate": "acroform_or_hybrid_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "CR-307",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "c72e74f191a1bddb48453e3094e8a657baabf552299f353acd8bf0d8a418fed1",
    "expectedBytes": 175213,
    "rendererLaneCandidate": "nonrenderable_source_policy_required",
    "workerReady": false
  },
  {
    "componentDocumentId": "CR-308",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "b2e78f24cb33d52c692d20b5bff3f0ab58115da9f26363df99cf2970f0a645f5",
    "expectedBytes": 162514,
    "rendererLaneCandidate": "nonrenderable_source_policy_required",
    "workerReady": false
  }
] as const;

export const ME_OFFICIAL_PDF_ACTIVE_RENDERERS = [] as const;
export const ME_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS = [] as const;
export const ME_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS = [] as const;
export const ME_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES = [] as const;

export class MaineOfficialPdfFamilyBlockedError extends Error {
  readonly code = "official_pdf_family_blocked";

  constructor(
    readonly familyId: typeof ME_OFFICIAL_PDF_FAMILY_ID,
    readonly trackId: (typeof ME_OFFICIAL_PDF_TRACK_IDS)[number]
  ) {
    super(
      `${familyId}:${trackId} is blocked pending authority manifestation, captain-projected sources, confirmed mappings, deterministic samples, and review.`
    );
    this.name = "MaineOfficialPdfFamilyBlockedError";
  }
}

export function renderMaineOfficialPdfFamilyPacket(
  trackId: (typeof ME_OFFICIAL_PDF_TRACK_IDS)[number]
): never {
  throw new MaineOfficialPdfFamilyBlockedError(
    ME_OFFICIAL_PDF_FAMILY_ID,
    trackId
  );
}
