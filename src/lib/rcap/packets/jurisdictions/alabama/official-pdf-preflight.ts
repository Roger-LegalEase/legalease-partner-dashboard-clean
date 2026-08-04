import packetAssemblyCatalog from "./packet-assemblies.json";

export const ALABAMA_OFFICIAL_PDF_FAMILY_ID =
  "al-statewide-official-form-family" as const;

export const ALABAMA_OFFICIAL_PDF_TRACK_IDS = [
  "al-misd-nonconviction-90",
  "al-felony-nonconviction-90",
  "al-misd-dwop",
  "al-felony-dwop",
  "al-diversion",
  "al-misd-conviction",
  "al-pardoned-felony",
  "al-trafficking",
  "al-pardon",
] as const;

export type AlabamaOfficialPdfTrackId =
  (typeof ALABAMA_OFFICIAL_PDF_TRACK_IDS)[number];

export type AlabamaOfficialPdfComponent = {
  componentId: string;
  order: number;
  role:
    "primary_filing" | "certificate_of_service" | "fee_waiver" | "continuation";
  requirement: "required" | "conditional";
  conditionDescription: string | null;
  outputStrategy: "official_pdf_fill";
  officialFormId: "CR-65" | "C-10-CRIMINAL" | "ABPP-3";
  officialSourceUrl: string | null;
  kind: "official_pdf";
  fieldMapId:
    "al-field-map-cr-65" | "al-field-map-c-10-criminal" | "al-field-map-abpp-3";
  sourceRequirementId: string | null;
  sourceGapId: string | null;
  rendererPosture:
    "acroform_candidate_worker_read_prohibited" | "blocked_unmanifested_source";
  componentStatus:
    | "blocked_captain_assignment_and_mapping_reviews"
    | "blocked_captain_assignment_edition_projection_and_mapping_reviews"
    | "blocked_unmanifested_source_and_missing_companion_dependency";
  approval: {
    identityApproved: false;
    mappingApproved: false;
    technical: "not_run_worker_read_prohibited" | "blocked_unmanifested_source";
    visual: "visual_review_pending";
    legalOutput: "legal_output_review_pending";
  };
  runtimeStatus: "runtime_disabled";
  generationAllowed: false;
};

export type AlabamaOfficialPdfAssembly = {
  trackId: AlabamaOfficialPdfTrackId;
  packetSetId: string;
  packetSetVersion: "1.0.0";
  outputStrategy: "official_pdf_fill";
  compositionMode: null;
  fixtureId: string;
  requiredFactKeys: readonly string[];
  legalDesignBlocked: boolean;
  legalDesignBlockerCount: number;
  components: readonly AlabamaOfficialPdfComponent[];
  assemblyStatus: "blocked_preflight_only";
  expectedPreflightError: "family_not_ready";
  sourceCurrent: false;
  runtimeDisabled: true;
  runtimeStatus: "runtime_disabled";
  packetReady: false;
  generationAllowed: false;
};

export type AlabamaOfficialPdfCatalog = {
  schemaVersion: 1;
  familyId: typeof ALABAMA_OFFICIAL_PDF_FAMILY_ID;
  jurisdiction: "AL";
  definitionStatus: "preflight_only_not_registered";
  sourceSelectionPolicy: "captain_assignment_and_exact_manifested_source_required";
  packetAssemblies: readonly AlabamaOfficialPdfAssembly[];
};

export type AlabamaOfficialPdfPreflightErrorCode =
  "unknown_track" | "family_not_ready";

export class AlabamaOfficialPdfPreflightError extends Error {
  readonly code: AlabamaOfficialPdfPreflightErrorCode;
  readonly trackId: string;
  readonly blockers: readonly string[];

  constructor(
    code: AlabamaOfficialPdfPreflightErrorCode,
    trackId: string,
    blockers: readonly string[],
  ) {
    super(
      `Alabama official-PDF preflight ${code} for ${trackId}: ${blockers.join(
        ", ",
      )}`,
    );
    this.name = "AlabamaOfficialPdfPreflightError";
    this.code = code;
    this.trackId = trackId;
    this.blockers = blockers;
  }
}

/**
 * Alabama-scoped definitions only. This catalog is intentionally absent from
 * shared packet registries and exposes neither a source path nor a renderer.
 */
export const alabamaOfficialPdfPreflightCatalog =
  packetAssemblyCatalog as AlabamaOfficialPdfCatalog;

export function getAlabamaOfficialPdfPreflightAssembly(
  trackId: string,
): AlabamaOfficialPdfAssembly {
  const assembly = alabamaOfficialPdfPreflightCatalog.packetAssemblies.find(
    (candidate) => candidate.trackId === trackId,
  );
  if (!assembly) {
    throw new AlabamaOfficialPdfPreflightError("unknown_track", trackId, [
      "track_not_declared_in_preflight_catalog",
    ]);
  }
  return assembly;
}

/**
 * This is the only executable family boundary. It always fails closed while
 * source authority, mapping, dependency, and review gates remain open.
 */
export function assertAlabamaOfficialPdfFamilyReady(
  trackId: AlabamaOfficialPdfTrackId,
): never {
  const assembly = getAlabamaOfficialPdfPreflightAssembly(trackId);
  const blockers = [
    "captain_assignment_required",
    "source_field_mapping_not_approved",
    "source_backed_reviews_not_complete",
  ];

  if (
    assembly.components.some(
      (component) => component.officialFormId === "CR-65",
    )
  ) {
    blockers.push("cr65_edition_projection_required");
  }
  if (
    assembly.components.some(
      (component) => component.officialFormId === "ABPP-3",
    )
  ) {
    blockers.push(
      "abpp3_source_unmanifested",
      "abpp3_waiver_of_liability_dependency_unresolved",
    );
  }
  if (assembly.legalDesignBlockerCount > 0) {
    blockers.push(`legal_design_blockers:${assembly.legalDesignBlockerCount}`);
  }

  throw new AlabamaOfficialPdfPreflightError(
    "family_not_ready",
    trackId,
    blockers,
  );
}
