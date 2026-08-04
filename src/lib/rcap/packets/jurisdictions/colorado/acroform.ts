/**
 * Canonical CO AcroForm lane boundary.
 *
 * Session A has no captain assignment, assignment anchor, or portable
 * projection. This module therefore exposes only a typed disabled posture. It
 * does not resolve a source path, inspect bytes, fill a field, or return a PDF.
 */

export const COLORADO_ACROFORM_JOB_ID = "rcap-co-acroform-fill" as const;

export const COLORADO_ACROFORM_TRACK_IDS = [
  "co_petition_seal_arrest",
  "co_motion_seal_nonconviction",
  "co_clean_slate",
  "co_motion_seal_conviction",
  "co_multiple_conviction_seal",
  "co_decriminalized_conduct_seal",
] as const;

export const COLORADO_ACROFORM_DOCUMENT_IDS = [
  "JDF-417",
  "JDF-477",
  "JDF-478",
  "JDF-2363",
  "JDF-612",
  "JDF-615",
  "JDF-641",
  "JDF-642",
  "JDF-2370",
  "JDF-2374",
] as const;

export type ColoradoAcroformTrackId =
  (typeof COLORADO_ACROFORM_TRACK_IDS)[number];
export type ColoradoAcroformDocumentId =
  (typeof COLORADO_ACROFORM_DOCUMENT_IDS)[number];

export const COLORADO_ACROFORM_LANE_STATE = Object.freeze({
  contractState: "pending_captain_assignment",
  assignmentAnchor: null,
  portableProjection: null,
  portableProjectionPresent: false,
  workerMaterializationAuthorized: false,
  sourceInspectionAllowed: false,
  sourcePathResolutionAllowed: false,
  activeFieldMappingCount: 0,
  rendererEnabled: false,
  packetReady: false,
  generationAllowed: false,
  runtimeStatus: "runtime_disabled",
} as const);

export class ColoradoAcroformLaneError extends Error {
  readonly code = "captain_assignment_required" as const;

  constructor() {
    super(
      "Colorado AcroForm lane is disabled: captain assignment, assignment anchor, and portable projection are required",
    );
    this.name = "ColoradoAcroformLaneError";
  }
}

export function assertColoradoAcroformLaneReady(): never {
  throw new ColoradoAcroformLaneError();
}
