import packetAssemblyCatalog from "./packet-assemblies.json";

export type MassachusettsOfficialPdfRouteId =
  | "ma-seal-admin"
  | "ma-seal-decrim"
  | "ma-seal-court"
  | "ma-expunge-time"
  | "ma-expunge-k"
  | "ma-expunge-mj";

export type MassachusettsOfficialPdfPreflightComponent = {
  componentId: string;
  order: number;
  role: "primary_filing" | "process_guidance";
  kind: "official_pdf" | "process_guidance";
  outputStrategy: "official_pdf_fill" | "process_guidance";
  rendererStrategy:
    | "unresolved_pending_exact_source_inspection"
    | "unsupported_pending_format_resolution"
    | "process_guidance";
  sourceId: string | null;
  sourcePath: string | null;
  fieldMapId: string | null;
  implementationStatus:
    | "blocked_pending_source_materialization"
    | "existing_normalized_definition_outside_official_pdf_lane";
  generationAllowed: false;
  approval: {
    mappingApproved: false;
    visual: "visual_review_pending";
    legal: "legal_review_pending";
  };
};

export type MassachusettsOfficialPdfPreflightAssembly = {
  trackId: MassachusettsOfficialPdfRouteId;
  packetSetId: string;
  packetSetVersion: "1.0.0";
  trackOutputStrategy: "official_pdf_fill" | "composed";
  compositionMode: "sequential" | null;
  fixtureId: string;
  requiredFactKeys: readonly string[];
  components: readonly MassachusettsOfficialPdfPreflightComponent[];
  assemblyStatus: "blocked_pending_source_materialization";
  expectedPreMaterializationError: "source_missing";
  sourceCurrent: false;
  runtimeDisabled: true;
  runtimeStatus: "runtime_disabled";
  packetReady: false;
  generationAllowed: false;
};

export type MassachusettsOfficialPdfPreflightCatalog = {
  schemaVersion: 1;
  familyId: "ma-trial-court-official-pdf-families";
  jurisdiction: "MA";
  definitionStatus: "preflight_only_not_registered";
  sourceSelectionPolicy: "explicit_source_id_only_no_filename_scan_or_fallback";
  packetAssemblies: readonly MassachusettsOfficialPdfPreflightAssembly[];
};

/**
 * Read-only preflight definitions. This catalog is deliberately not imported
 * by the aggregate packet registry and cannot make a Massachusetts route
 * resolvable. The dedicated verifier proves every route remains fail-closed
 * until exact source bytes and field maps are available.
 */
export const massachusettsOfficialPdfPreflightCatalog =
  packetAssemblyCatalog as MassachusettsOfficialPdfPreflightCatalog;

export function getMassachusettsOfficialPdfPreflightAssembly(
  routeId: MassachusettsOfficialPdfRouteId
): MassachusettsOfficialPdfPreflightAssembly {
  const assembly = massachusettsOfficialPdfPreflightCatalog.packetAssemblies.find(
    (candidate) => candidate.trackId === routeId
  );
  if (!assembly) {
    throw new Error(`Unknown Massachusetts official-PDF preflight route: ${routeId}`);
  }
  return assembly;
}
