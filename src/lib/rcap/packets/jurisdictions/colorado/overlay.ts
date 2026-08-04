/**
 * Canonical CO flat-PDF overlay lane boundary.
 *
 * The exact flat candidates, approved coordinates, captain assignment, and
 * portable projection are unavailable in Session A. This module is a disabled
 * typed boundary only; it never resolves a source path or applies an overlay.
 */

export const COLORADO_FLAT_PDF_OVERLAY_JOB_ID =
  "rcap-co-flat-pdf-overlay" as const;

export const COLORADO_FLAT_PDF_OVERLAY_TRACK_IDS = [
  "co_municipal_conviction_seal",
  "co_pardoned_conviction_seal",
] as const;

export const COLORADO_FLAT_PDF_OVERLAY_DOCUMENT_IDS = [
  "JDF-683",
  "JDF-680",
] as const;

export const COLORADO_OVERLAY_PACKET_COMPANION_DOCUMENT_IDS = [
  "JDF-681",
] as const;

export const COLORADO_OVERLAY_UNRESOLVED_DOCUMENT_IDS = ["JDF-684"] as const;

export type ColoradoFlatPdfOverlayTrackId =
  (typeof COLORADO_FLAT_PDF_OVERLAY_TRACK_IDS)[number];
export type ColoradoFlatPdfOverlayDocumentId =
  (typeof COLORADO_FLAT_PDF_OVERLAY_DOCUMENT_IDS)[number];

export const COLORADO_FLAT_PDF_OVERLAY_LANE_STATE = Object.freeze({
  contractState: "pending_captain_assignment",
  assignmentAnchor: null,
  portableProjection: null,
  portableProjectionPresent: false,
  workerMaterializationAuthorized: false,
  sourceInspectionAllowed: false,
  sourcePathResolutionAllowed: false,
  activeOverlayPlacementCount: 0,
  rendererEnabled: false,
  packetReady: false,
  generationAllowed: false,
  runtimeStatus: "runtime_disabled",
} as const);

export class ColoradoFlatPdfOverlayLaneError extends Error {
  readonly code = "captain_assignment_required" as const;

  constructor() {
    super(
      "Colorado flat-PDF overlay lane is disabled: captain assignment, assignment anchor, portable projection, and source-bound coordinates are required",
    );
    this.name = "ColoradoFlatPdfOverlayLaneError";
  }
}

export function assertColoradoFlatPdfOverlayLaneReady(): never {
  throw new ColoradoFlatPdfOverlayLaneError();
}
