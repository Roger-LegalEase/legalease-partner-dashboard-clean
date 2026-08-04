export const MN_OFFICIAL_PDF_FAMILY_ID = "rcap-mn-official-pdf-family" as const;

export const MN_OFFICIAL_PDF_TRACK_IDS = [
  "mn_petition_15218",
  "mn_petition_609a02_subd3",
  "mn_petition_juvenile_as_adult"
] as const;

export const MN_OFFICIAL_PDF_DOCUMENT_IDS = [
  "EXP101",
  "EXP102",
  "EXP104",
  "EXP105",
  "EXP106",
  "FEE102"
] as const;

export const MN_OFFICIAL_PDF_SOURCE_BOUNDARIES = [
  {
    "componentDocumentId": "EXP101",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "0ccdc99ec3cbb86300b00f5d93bf724d795541d426709f4e97708119d1b1c5de",
    "expectedBytes": 310217,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "EXP102",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "c98430f1a9c7a6d399b7d01de1ef2eee0df5f0a1a07e89a703b307977d7bf541",
    "expectedBytes": 214814,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "EXP104",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "0e776a93b61f28f38fc6b318a9f59b78de4e0cbec102236364cf59ab061b423c",
    "expectedBytes": 248691,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "EXP105",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "754cd7a55b07409fe8752906d38dcccc45ab6a13cda5a3d7d061a689b837b4a0",
    "expectedBytes": 195876,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "EXP106",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "da7080f9c0b0135a79b537545e5448da438b63ae0de5d69c25e2513f1170bd85",
    "expectedBytes": 183351,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "FEE102",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "b8415cddaa06a9c76cf2c4949aee36efe22e3b0ba98783a74063094150c72da8",
    "expectedBytes": 268092,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  }
] as const;

export const MN_OFFICIAL_PDF_ACTIVE_RENDERERS = [] as const;
export const MN_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS = [] as const;
export const MN_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS = [] as const;
export const MN_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES = [] as const;

export class MinnesotaOfficialPdfFamilyBlockedError extends Error {
  readonly code = "official_pdf_family_blocked";

  constructor(
    readonly familyId: typeof MN_OFFICIAL_PDF_FAMILY_ID,
    readonly trackId: (typeof MN_OFFICIAL_PDF_TRACK_IDS)[number]
  ) {
    super(
      `${familyId}:${trackId} is blocked pending authority manifestation, captain-projected sources, confirmed mappings, deterministic samples, and review.`
    );
    this.name = "MinnesotaOfficialPdfFamilyBlockedError";
  }
}

export function renderMinnesotaOfficialPdfFamilyPacket(
  trackId: (typeof MN_OFFICIAL_PDF_TRACK_IDS)[number]
): never {
  throw new MinnesotaOfficialPdfFamilyBlockedError(
    MN_OFFICIAL_PDF_FAMILY_ID,
    trackId
  );
}
