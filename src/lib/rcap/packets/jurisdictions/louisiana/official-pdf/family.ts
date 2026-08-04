export const LA_OFFICIAL_PDF_FAMILY_ID = "rcap-la-official-pdf-family" as const;

export const LA_OFFICIAL_PDF_TRACK_IDS = [
  "la-976-arrest-no-conviction",
  "la-977-misdemeanor-conviction",
  "la-977d-marijuana-first-offense",
  "la-978-felony-conviction",
  "la-985-1-interim-expungement",
  "la-985-expungement-by-redaction",
  "la-987-set-aside-and-dismiss"
] as const;

export const LA_OFFICIAL_PDF_DOCUMENT_IDS = [
  "LA-CCRP-ART-987",
  "LA-CCRP-ART-988",
  "LA-CCRP-ART-989",
  "LA-CCRP-ART-991",
  "LA-CCRP-ART-992",
  "LA-CCRP-ART-993",
  "LA-CCRP-ART-994",
  "LA-CCRP-ART-995",
  "LA-CCRP-ART-998"
] as const;

export const LA_OFFICIAL_PDF_SOURCE_BOUNDARIES = [
  {
    "componentDocumentId": "LA-CCRP-ART-987",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "LA-CCRP-ART-988",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "LA-CCRP-ART-989",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "LA-CCRP-ART-991",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "LA-CCRP-ART-992",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "LA-CCRP-ART-993",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "0e455d3decea4b9e6299e1d39ceeb2b19ddaad93de19b2faa38d311f2d989ea2",
    "expectedBytes": 81977,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "LA-CCRP-ART-994",
    "authorityState": "authority_unmanifested_source",
    "expectedSha256": null,
    "expectedBytes": null,
    "rendererLaneCandidate": "pending_fresh_local_source_inspection",
    "workerReady": false
  },
  {
    "componentDocumentId": "LA-CCRP-ART-995",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "b90e8cc62a2762c7d52b0a2b0f712147ca2ead4703fe091e26e9927cbab71c39",
    "expectedBytes": 81451,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  },
  {
    "componentDocumentId": "LA-CCRP-ART-998",
    "authorityState": "exact_identity_pending_captain_projection",
    "expectedSha256": "8625ccd4043e2045832f647331984372390c74d1e5e10166e40b305c1d445fb4",
    "expectedBytes": 92697,
    "rendererLaneCandidate": "coordinate_overlay_candidate",
    "workerReady": false
  }
] as const;

export const LA_OFFICIAL_PDF_ACTIVE_RENDERERS = [] as const;
export const LA_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS = [] as const;
export const LA_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS = [] as const;
export const LA_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES = [] as const;

export class LouisianaOfficialPdfFamilyBlockedError extends Error {
  readonly code = "official_pdf_family_blocked";

  constructor(
    readonly familyId: typeof LA_OFFICIAL_PDF_FAMILY_ID,
    readonly trackId: (typeof LA_OFFICIAL_PDF_TRACK_IDS)[number]
  ) {
    super(
      `${familyId}:${trackId} is blocked pending authority manifestation, captain-projected sources, confirmed mappings, deterministic samples, and review.`
    );
    this.name = "LouisianaOfficialPdfFamilyBlockedError";
  }
}

export function renderLouisianaOfficialPdfFamilyPacket(
  trackId: (typeof LA_OFFICIAL_PDF_TRACK_IDS)[number]
): never {
  throw new LouisianaOfficialPdfFamilyBlockedError(
    LA_OFFICIAL_PDF_FAMILY_ID,
    trackId
  );
}
