import {
  AlabamaOfficialPdfPreflightError,
  getAlabamaOfficialPdfPreflightAssembly,
  type AlabamaOfficialPdfAssembly,
} from "./official-pdf-preflight";

export const ALABAMA_ACROFORM_TRACK_IDS = [
  "al-misd-nonconviction-90",
  "al-felony-nonconviction-90",
  "al-misd-dwop",
  "al-felony-dwop",
  "al-diversion",
  "al-misd-conviction",
  "al-pardoned-felony",
  "al-trafficking",
] as const;

export type AlabamaAcroformTrackId =
  (typeof ALABAMA_ACROFORM_TRACK_IDS)[number];

export const alabamaAcroformLaneState = {
  laneId: "rcap-al-acroform-fill",
  jurisdiction: "AL",
  documents: [
    {
      documentId: "CR-65",
      sourceRequirementId: "al-source-cr-65-rev-2024-10",
      candidateStrategy: "acroform_fill",
      retainedIdentity: true,
      captainAssignmentRequired: true,
      editionProjectionRequired: true,
      sourceReadAuthorized: false,
      sourcePathExposed: false,
      sourceFieldInventoryCount: 0,
      approvedMappingCount: 0,
    },
    {
      documentId: "C-10-CRIMINAL",
      sourceRequirementId: "al-source-c-10-criminal-rev-2024-05",
      candidateStrategy: "acroform_fill",
      retainedIdentity: true,
      captainAssignmentRequired: true,
      editionProjectionRequired: false,
      sourceReadAuthorized: false,
      sourcePathExposed: false,
      sourceFieldInventoryCount: 0,
      approvedMappingCount: 0,
    },
  ],
  trackCount: 8,
  rendererStatus: "runtime_disabled",
  generationAllowed: false,
} as const;

export function getAlabamaAcroformPreflightAssembly(
  trackId: AlabamaAcroformTrackId,
): AlabamaOfficialPdfAssembly {
  return getAlabamaOfficialPdfPreflightAssembly(trackId);
}

/**
 * No AcroForm library is imported here. Until the authority contract and
 * mappings exist, this lane is a typed fail-closed boundary only.
 */
export function assertAlabamaAcroformFillReady(
  trackId: AlabamaAcroformTrackId,
): never {
  getAlabamaAcroformPreflightAssembly(trackId);
  throw new AlabamaOfficialPdfPreflightError("family_not_ready", trackId, [
    "captain_assignment_required",
    "cr65_edition_projection_required",
    "exact_source_inspection_not_authorized",
    "acroform_field_inventory_not_started",
    "acroform_mappings_not_approved",
    "source_backed_reviews_not_complete",
  ]);
}
