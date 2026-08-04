import {
  IndianaOfficialPdfPreflightError,
  assertIndianaOfficialPdfDocumentMaterialized,
  type IndianaOfficialPdfDocumentId,
} from "./official-pdf-preflight";

export const INDIANA_ACROFORM_TRACK_IDS = [
  "in_conviction_d6",
  "in_conviction_felony",
  "in_conviction_misd",
] as const;

export type IndianaAcroformTrackId =
  (typeof INDIANA_ACROFORM_TRACK_IDS)[number];

export const indianaAcroformLaneState = {
  laneId: "rcap-in-acroform-fill",
  jurisdiction: "IN",
  expectedFactoryOutput:
    "src/lib/rcap/packets/jurisdictions/indiana/acroform.ts",
  documents: [
    {
      documentId: "CCA-XP-0220-7008",
      requirementId: "in-exact-cca-xp-0220-7008",
      workflowKey: "IN:CCA-XP-0220-7008:PETITION:EN",
      expectedSha256:
        "2c4aaf4a68b06f192e5f0c4b9bbfe0dd4c04b4b1f5e0fbab879bb450223e78f0",
      expectedBytes: 3981416,
      carriedFieldCount: 85,
      trackId: "in_conviction_misd",
    },
    {
      documentId: "CCA-XP-0220-7009",
      requirementId: "in-exact-cca-xp-0220-7009",
      workflowKey: "IN:CCA-XP-0220-7009:PETITION:EN",
      expectedSha256:
        "499ed8a49c785fa949bcce19c3783f84318b73bc162cb5db8576094a321990b1",
      expectedBytes: 2620327,
      carriedFieldCount: 67,
      trackId: "in_conviction_d6",
    },
    {
      documentId: "CCA-XP-0220-7010",
      requirementId: "in-exact-cca-xp-0220-7010",
      workflowKey: "IN:CCA-XP-0220-7010:PETITION:EN",
      expectedSha256:
        "b613c145701a5185fd11d4df61efad5d3b352fc13987581531267868724fbf4b",
      expectedBytes: 784143,
      carriedFieldCount: 68,
      trackId: "in_conviction_felony",
    },
  ],
  carriedTechnicalClass: "clean_acroform",
  carriedPageCountPerDocument: 3,
  carriedMeasurementIsFreshVerification: false,
  captainAssignmentPresent: false,
  portableProjectionPresent: false,
  workerReadAuthorized: false,
  workerMaterializationAuthorized: false,
  sourceFieldInventoryCount: 0,
  approvedMappingCount: 0,
  rendererEnabled: false,
  generationAllowed: false,
} as const;

/**
 * No AcroForm library or source bytes are reachable here. The factory output
 * exists solely as a typed, Indiana-scoped fail-closed integration boundary.
 */
export function assertIndianaAcroformFillReady(
  documentId: IndianaOfficialPdfDocumentId,
): never {
  const laneDocument = indianaAcroformLaneState.documents.find(
    (candidate) => candidate.documentId === documentId,
  );

  if (!laneDocument) {
    throw new IndianaOfficialPdfPreflightError("unknown_document", documentId, [
      "document_not_declared_in_indiana_acroform_lane",
    ]);
  }

  return assertIndianaOfficialPdfDocumentMaterialized(laneDocument.documentId);
}
