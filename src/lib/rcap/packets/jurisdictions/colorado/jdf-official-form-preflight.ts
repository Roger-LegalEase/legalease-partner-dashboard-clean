import packetAssemblyCatalog from "./packet-assemblies.json";

export const COLORADO_JDF_OFFICIAL_FORM_FAMILY_ID =
  "co-statewide-jdf-official-form-family" as const;

export const COLORADO_JDF_OFFICIAL_FORM_TRACK_IDS = [
  "co_petition_seal_arrest",
  "co_motion_seal_nonconviction",
  "co_clean_slate",
  "co_motion_seal_conviction",
  "co_municipal_conviction_seal",
  "co_multiple_conviction_seal",
  "co_decriminalized_conduct_seal",
  "co_pardoned_conviction_seal",
] as const;

export type ColoradoJdfOfficialFormTrackId =
  (typeof COLORADO_JDF_OFFICIAL_FORM_TRACK_IDS)[number];

export type ColoradoJdfOfficialFormComponent = {
  componentId: string;
  order: number;
  role: "primary_filing" | "proposed_order" | "process_guidance";
  requirement: "required" | "conditional";
  conditionDescription: string | null;
  outputStrategy: "official_pdf_fill" | "process_guidance";
  officialFormId: string | null;
  officialSourceUrl: null;
  kind: "official_pdf" | "process_guidance";
  fieldMapId: string | null;
  sourceRequirementId: string | null;
  resolutionId: string | null;
  rendererPosture:
    | "acroform_candidate_source_absent"
    | "overlay_candidate_source_and_coordinates_absent"
    | "blocked_unresolved_identity"
    | "blocked_authority_role_mismatch"
    | "process_guidance_outside_this_lane";
  componentStatus:
    | "blocked_pending_source_materialization_and_reviews"
    | "blocked_unresolved_identity"
    | "blocked_authority_role_mismatch"
    | "existing_normalized_definition_outside_official_form_lane";
  approval: {
    identityApproved: false;
    mappingApproved: false;
    technical:
      "not_run_source_absent" | "blocked_identity_or_role" | "outside_lane";
    visual: "visual_review_pending";
    legalOutput: "legal_output_review_pending";
  };
  runtimeStatus: "runtime_disabled";
  generationAllowed: false;
};

export type ColoradoJdfOfficialFormAssembly = {
  trackId: ColoradoJdfOfficialFormTrackId;
  packetSetId: string;
  packetSetVersion: "1.0.0";
  outputStrategy: "official_pdf_fill";
  compositionMode: null;
  fixtureId: string;
  requiredFactKeys: readonly string[];
  legalDesignBlocked: boolean;
  legalDesignBlockerCount: number;
  components: readonly ColoradoJdfOfficialFormComponent[];
  assemblyStatus: "blocked_preflight_only";
  expectedPreflightError: "family_not_ready";
  sourceCurrent: false;
  runtimeDisabled: true;
  runtimeStatus: "runtime_disabled";
  packetReady: false;
  generationAllowed: false;
};

export type ColoradoJdfOfficialFormCatalog = {
  schemaVersion: 1;
  familyId: typeof COLORADO_JDF_OFFICIAL_FORM_FAMILY_ID;
  jurisdiction: "CO";
  definitionStatus: "preflight_only_not_registered";
  sourceSelectionPolicy: "explicit_source_requirement_or_unresolved_identity_only";
  packetAssemblies: readonly ColoradoJdfOfficialFormAssembly[];
};

export type ColoradoJdfPreflightErrorCode =
  "unknown_track" | "family_not_ready";

export class ColoradoJdfPreflightError extends Error {
  readonly code: ColoradoJdfPreflightErrorCode;
  readonly trackId: string;
  readonly blockers: readonly string[];

  constructor(
    code: ColoradoJdfPreflightErrorCode,
    trackId: string,
    blockers: readonly string[],
  ) {
    super(
      `Colorado JDF official-form preflight ${code} for ${trackId}: ${blockers.join(
        ", ",
      )}`,
    );
    this.name = "ColoradoJdfPreflightError";
    this.code = code;
    this.trackId = trackId;
    this.blockers = blockers;
  }
}

/**
 * Read-only, CO-scoped definitions. This module is intentionally absent from
 * the shared packet registry and contains no PDF selection or rendering path.
 */
export const coloradoJdfOfficialFormPreflightCatalog =
  packetAssemblyCatalog as ColoradoJdfOfficialFormCatalog;

export function getColoradoJdfOfficialFormPreflightAssembly(
  trackId: ColoradoJdfOfficialFormTrackId,
): ColoradoJdfOfficialFormAssembly {
  const assembly =
    coloradoJdfOfficialFormPreflightCatalog.packetAssemblies.find(
      (candidate) => candidate.trackId === trackId,
    );
  if (!assembly) {
    throw new ColoradoJdfPreflightError("unknown_track", trackId, [
      "track_not_declared_in_preflight_catalog",
    ]);
  }
  return assembly;
}

/**
 * The only executable boundary is a fail-closed readiness guard. It cannot
 * return an assembly or source path while any Colorado family gate is open.
 */
export function assertColoradoJdfOfficialFormFamilyReady(
  trackId: ColoradoJdfOfficialFormTrackId,
): never {
  const assembly = getColoradoJdfOfficialFormPreflightAssembly(trackId);
  const componentBlockers = assembly.components
    .filter((component) => component.kind === "official_pdf")
    .map(
      (component) =>
        `${component.officialFormId ?? component.componentId}:${component.componentStatus}`,
    );
  throw new ColoradoJdfPreflightError("family_not_ready", trackId, [
    "exact_source_bytes_not_verified",
    "field_maps_not_approved",
    "source_backed_reviews_not_complete",
    ...componentBlockers,
  ]);
}
