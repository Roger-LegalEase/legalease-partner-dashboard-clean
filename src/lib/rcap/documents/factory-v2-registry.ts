import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  packetSpecificationFor,
  packetSpecificationForTrack,
  specificationContentSha256,
  specificationLegalSectionsBound
} from "@/lib/rcap/grade-a/packet-specification";

/**
 * The runtime side of the factory_v2 route registry.
 *
 * ONE shared factory. Every route this registry admits renders through the same
 * official-form and composed-packet builder that already exists; what varies is
 * the packet set handed to it. There is deliberately no renderer per pathway and
 * no per-route code path — a route is admitted by data, or it is not admitted.
 *
 * The registry is generated from the canonical graph by
 * scripts/generate-rcap-factory-v2-registry.mjs, which decides admission on
 * seven build inputs: an authoritative profile and pathway, an exact packet set,
 * a packet specification, the required participant fields, a named source or
 * approved composed document for every component that produces one, and a
 * deterministic fixture.
 *
 * Loading is fail-closed in both directions:
 *
 *   * a missing, unreadable or malformed registry admits nothing, so the route
 *     falls through to whatever it resolved to before factory_v2 existed;
 *   * a route entry is honoured only when the generator marked it resolving and
 *     its own build inputs all read true, except for an exact retired-legacy
 *     migration whose generated row says every build input is present and whose
 *     server-owned route, track, family and specification all agree;
 *
 * What this registry never decides: whether a route may be sold, whether payment
 * may be taken, whether a credit may be consumed, whether the legal design is
 * approved, whether technical review is current, or whether a problematic PDF
 * holds the route. Those are separate gates owned elsewhere. Admission here means
 * one thing — the factory has everything it needs to build this packet.
 */

export type FactoryV2Route = {
  pathwayKey: string;
  jurisdiction: string;
  pathwayId: string;
  registryTrackIds: string[];
  packetSetIds: string[];
  profileVersion: string;
  requiredInputIds: string[];
  officialFormIds: string[];
  /** The exact family resolved from the server-owned packet specification. */
  packetFamilyId: string | null;
  /** Present only for an exact route migrated out of a retired legacy jurisdiction. */
  retiredLegacyRouteMigration: FactoryV2RouteMigration | null;
  /** Present only for an exact route/track/family technical crosswalk. */
  exactRouteProductization: FactoryV2ExactRouteProductization | null;
  /** True when the caller must name the exact server-owned track. */
  exactTrackSelectionRequired: boolean;
};

const REGISTRY_PATH = "data/record-clearing/factory-v2-route-registry.json";
const ROUTE_MIGRATIONS_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const COHORT_OWNER_DECISION = "OWN-ADOPT-2026-09-02-BATCH-53";
const CT_CLEANSLATE_PRODUCTIZATION = {
  obligationRouteKey: "obligation:track-pathway:CT:ct-cleanslate-petition:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202",
  runtimeRouteId: "CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202",
  jurisdiction: "CT",
  pathwayId: "petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202",
  registryTrackIds: ["ct-cleanslate-petition"],
  packetFamilyId: "ct-cleanslate-petition-set",
  scope: "route_track_family_only",
  nextGate: "current CT owner legal approval and post-approval change audit, then separate fulfillment-authority generation"
} as const;
const DC_MISATTRIBUTED_PRODUCTIZATION = {
  obligationRouteKey: "obligation:track-only:DC:dc_correct_misattributed_arrest",
  runtimeRouteId: "DC:dc_correct_misattributed_arrest",
  jurisdiction: "DC",
  pathwayId: "dc_correct_misattributed_arrest",
  registryTrackIds: ["dc_correct_misattributed_arrest"],
  packetFamilyId: "dc_correct_misattributed_arrest-set",
  profileVersion: "2026-06-19-source-conversion-1",
  scope: "route_track_family_only",
  nextGate: "post-approval substantive-legal-change audit for OWN-ADOPT-2026-09-02-BATCH-53, then separate fulfillment-authority generation",
  requiredInputIds: [
    "participant_full_legal_name",
    "date_of_birth",
    "contact_information",
    "underlying_case_number",
    "misidentification_facts",
    "no_fingerprints_taken",
    "no_other_identification",
    "prosecuting_office_name_address"
  ],
  components: [
    ["dc_correct_misattributed_arrest-primary-filing-1", "primary_filing", "custom_pleading", 1],
    ["dc_correct_misattributed_arrest-prosecutor-service-2", "prosecutor_service", "process_guidance", 2],
    ["dc_correct_misattributed_arrest-filing-instructions-3", "filing_instructions", "process_guidance", 3]
  ],
  artifactPins: [
    [
      "canonical",
      "data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/canonical.pdf",
      "d4e4125cb51ec2248468dc093da2d40f66ae1dafc380ed7c2d6f84ec8fc4ce7f",
      13617,
      5
    ],
    [
      "boundary",
      "data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/boundary.pdf",
      "4a5cea51f550c553758c09e1ad96f21d0c0f751bdf77ee2da6adb7a2f9dc4225",
      13868,
      5
    ]
  ],
  referenceSourceId: "DC-HOW-TO-SEAL-OR-EXPUNGE-YOUR-CRIMINAL-RECOR",
  referenceSourceSha256: "310381f170d1875ef7a40e9e71c8653c1ea5c847628a6c718ea9016c0e312712",
  referenceSourceByteLength: 47232
} as const;
const OWNER_QUALIFICATION = "ADOPTED for the limited family-level legal-design purpose stated in this workbook. No runtime, technical, visual, payment, sponsorship, or production authority is granted. Any substantive legal change or shipping-artifact digest change requires re-review.";

const REQUIRED_BUILD_INPUTS = [
  "authoritativeProfile",
  "authoritativePathway",
  "exactPacketSet",
  "packetSpecification",
  "requiredParticipantFields",
  "sourceOrApprovedComposedDocument",
  "deterministicFixture"
] as const;

type RawRoute = {
  pathwayKey?: unknown;
  jurisdiction?: unknown;
  pathwayId?: unknown;
  registryTrackIds?: unknown;
  packetSetIds?: unknown;
  profileVersion?: unknown;
  requiredInputIds?: unknown;
  officialFormIds?: unknown;
  buildInputs?: Record<string, unknown>;
  unmetBuildInputs?: unknown;
  factoryV2Resolves?: unknown;
  legacyGeneratorOwnsThisJurisdiction?: unknown;
};

export type FactoryV2RouteMigration = {
  routeId: string;
  jurisdiction: string;
  pathwayId: string;
  registryTrackIds: string[];
  packetFamilyId: string;
  ownerDecisionRecordId: string;
};

export type FactoryV2LegalApprovalEvidence = {
  legalApprovalResult: "ADOPT";
  legalDecisionRecordId: string;
  legalDecisionOwner: string;
  legalDecisionEffectiveDate: string;
  requiresSignature: false;
  approvalSource: string;
  approvalCurrent: true;
  ownerQualification: string;
  shippingArtifactDigestPins: Array<{
    fixture: "canonical" | "boundary";
    file: string;
    sha256: string;
  }>;
};

export type FactoryV2ExactRouteProductization = {
  obligationRouteKey: string;
  runtimeRouteId: string;
  jurisdiction: string;
  pathwayId: string;
  registryTrackIds: string[];
  packetFamilyId: string;
  scope: "route_track_family_only";
  legalApproval: FactoryV2LegalApprovalEvidence | null;
  postApprovalChangeAudit: null;
  createsCommercialAuthority: false;
  opensRoute: false;
  nextGate: string;
};

type RawRouteMigration = {
  routeId?: unknown;
  jurisdiction?: unknown;
  pathwayId?: unknown;
  registryTrackIds?: unknown;
  packetFamilyId?: unknown;
  migrationKind?: unknown;
  scope?: unknown;
  ownerDecisionRecordId?: unknown;
  createsCommercialAuthority?: unknown;
  opensRoute?: unknown;
};

type RawPacketSet = {
  jurisdiction?: unknown;
  trackId?: unknown;
  packetSetId?: unknown;
  components?: unknown;
  factoryV2RouteProductization?: unknown;
};

type RawPacketComponent = {
  componentId?: unknown;
  role?: unknown;
  requirement?: unknown;
  outputStrategy?: unknown;
  officialFormId?: unknown;
  officialSourceUrl?: unknown;
  order?: unknown;
};

type RawExactRouteProductization = {
  obligationRouteKey?: unknown;
  runtimeRouteId?: unknown;
  jurisdiction?: unknown;
  pathwayId?: unknown;
  registryTrackIds?: unknown;
  packetFamilyId?: unknown;
  scope?: unknown;
  legalApproval?: unknown;
  postApprovalChangeAudit?: unknown;
  createsCommercialAuthority?: unknown;
  opensRoute?: unknown;
  nextGate?: unknown;
};

let cache: Map<string, FactoryV2Route> | null = null;

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];

function exactStringList(actual: unknown, expected: readonly string[]): boolean {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  return actual.every((value, index) => typeof value === "string" && value === expected[index]);
}

function dcLegalApproval(value: unknown): FactoryV2LegalApprovalEvidence | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Partial<FactoryV2LegalApprovalEvidence>;
  if (
    row.legalApprovalResult !== "ADOPT"
    || row.legalDecisionRecordId !== COHORT_OWNER_DECISION
    || row.legalDecisionOwner !== "Roger Roman"
    || row.legalDecisionEffectiveDate !== "2026-09-02"
    || row.requiresSignature !== false
    || row.approvalSource !== "september_exact_digest_adoption"
    || row.approvalCurrent !== true
    || row.ownerQualification !== OWNER_QUALIFICATION
    || !Array.isArray(row.shippingArtifactDigestPins)
    || row.shippingArtifactDigestPins.length !== DC_MISATTRIBUTED_PRODUCTIZATION.artifactPins.length
  ) return null;
  for (let index = 0; index < DC_MISATTRIBUTED_PRODUCTIZATION.artifactPins.length; index += 1) {
    const [fixture, file, sha256] = DC_MISATTRIBUTED_PRODUCTIZATION.artifactPins[index];
    const pin = row.shippingArtifactDigestPins[index];
    if (pin?.fixture !== fixture || pin.file !== file || pin.sha256 !== sha256) return null;
  }
  return {
    legalApprovalResult: "ADOPT",
    legalDecisionRecordId: COHORT_OWNER_DECISION,
    legalDecisionOwner: "Roger Roman",
    legalDecisionEffectiveDate: "2026-09-02",
    requiresSignature: false,
    approvalSource: "september_exact_digest_adoption",
    approvalCurrent: true,
    ownerQualification: OWNER_QUALIFICATION,
    shippingArtifactDigestPins: row.shippingArtifactDigestPins.map((pin) => ({ ...pin }))
  };
}

function dcPacketComponentsMatch(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== DC_MISATTRIBUTED_PRODUCTIZATION.components.length) return false;
  return value.every((candidate, index) => {
    const component = candidate as RawPacketComponent;
    const [componentId, role, outputStrategy, order] = DC_MISATTRIBUTED_PRODUCTIZATION.components[index];
    return component?.componentId === componentId
      && component.role === role
      && component.requirement === "required"
      && component.outputStrategy === outputStrategy
      && component.officialFormId === null
      && component.officialSourceUrl === null
      && component.order === order;
  });
}

/**
 * The route-by-route migration crosswalk lives on the packet-set manifest input
 * already consumed and digest-pinned by the factory-v2 generator. It grants no
 * commercial state. A malformed or duplicated row migrates nothing.
 */
function loadRouteMigrations(): ReadonlyMap<string, FactoryV2RouteMigration> {
  const migrations = new Map<string, FactoryV2RouteMigration>();
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(process.cwd(), ROUTE_MIGRATIONS_PATH), "utf8")) as {
      factoryV2RouteMigrations?: unknown;
      packetSets?: unknown;
    };
    if (!Array.isArray(parsed.factoryV2RouteMigrations) || !Array.isArray(parsed.packetSets)) return migrations;

    const packetSets = parsed.packetSets as RawPacketSet[];

    for (const candidate of parsed.factoryV2RouteMigrations) {
      const row = candidate as RawRouteMigration;
      const jurisdiction = typeof row.jurisdiction === "string" ? row.jurisdiction.trim().toUpperCase() : "";
      const pathwayId = typeof row.pathwayId === "string" ? row.pathwayId.trim() : "";
      const routeId = typeof row.routeId === "string" ? row.routeId.trim() : "";
      const packetFamilyId = typeof row.packetFamilyId === "string" ? row.packetFamilyId.trim() : "";
      const ownerDecisionRecordId = typeof row.ownerDecisionRecordId === "string" ? row.ownerDecisionRecordId.trim() : "";
      const registryTrackIds = stringList(row.registryTrackIds);
      const matchingPacketSets = packetSets.filter((packetSet) => packetSet.packetSetId === packetFamilyId);
      const packetSet = matchingPacketSets.length === 1 ? matchingPacketSets[0] : null;
      const valid = Boolean(
        jurisdiction
        && pathwayId
        && routeId === `${jurisdiction}:${pathwayId}`
        && packetFamilyId
        && ownerDecisionRecordId === COHORT_OWNER_DECISION
        && Array.isArray(row.registryTrackIds)
        && row.registryTrackIds.length === registryTrackIds.length
        && registryTrackIds.length > 0
        && new Set(registryTrackIds).size === registryTrackIds.length
        && packetSet
        && typeof packetSet.jurisdiction === "string"
        && packetSet.jurisdiction.trim().toUpperCase() === jurisdiction
        && typeof packetSet.trackId === "string"
        && registryTrackIds.includes(packetSet.trackId.trim())
        && row.migrationKind === "retired_legacy_route_to_factory_v2"
        && row.scope === "route_only"
        && row.createsCommercialAuthority === false
        && row.opensRoute === false
        && !migrations.has(routeId)
      );
      if (!valid) {
        migrations.clear();
        return migrations;
      }
      migrations.set(routeId, {
        routeId,
        jurisdiction,
        pathwayId,
        registryTrackIds,
        packetFamilyId,
        ownerDecisionRecordId
      });
    }
  } catch {
    migrations.clear();
  }
  return migrations;
}

/**
 * The CT lane has technical packet proof but no current owner legal approval.
 * Its packet-set row therefore carries a distinct exact crosswalk rather than a
 * legacy migration or an approval record. Every value is matched literally so
 * a sibling, aggregate, trackless or different-family substitution admits
 * nothing. The null legal fields and false authority flags are part of the
 * crosswalk, not commentary.
 */
function loadCtCleanSlateProductization(): FactoryV2ExactRouteProductization | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(process.cwd(), ROUTE_MIGRATIONS_PATH), "utf8")) as {
      packetSets?: unknown;
    };
    if (!Array.isArray(parsed.packetSets)) return null;
    const matches = (parsed.packetSets as RawPacketSet[]).filter((packetSet) =>
      packetSet.packetSetId === CT_CLEANSLATE_PRODUCTIZATION.packetFamilyId);
    if (matches.length !== 1) return null;
    const packetSet = matches[0];
    const row = packetSet.factoryV2RouteProductization as RawExactRouteProductization | null;
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    if (
      packetSet.jurisdiction !== CT_CLEANSLATE_PRODUCTIZATION.jurisdiction
      || packetSet.trackId !== CT_CLEANSLATE_PRODUCTIZATION.registryTrackIds[0]
      || row.obligationRouteKey !== CT_CLEANSLATE_PRODUCTIZATION.obligationRouteKey
      || row.runtimeRouteId !== CT_CLEANSLATE_PRODUCTIZATION.runtimeRouteId
      || row.jurisdiction !== CT_CLEANSLATE_PRODUCTIZATION.jurisdiction
      || row.pathwayId !== CT_CLEANSLATE_PRODUCTIZATION.pathwayId
      || !exactStringList(row.registryTrackIds, CT_CLEANSLATE_PRODUCTIZATION.registryTrackIds)
      || row.packetFamilyId !== CT_CLEANSLATE_PRODUCTIZATION.packetFamilyId
      || row.packetFamilyId !== packetSet.packetSetId
      || row.scope !== CT_CLEANSLATE_PRODUCTIZATION.scope
      || row.legalApproval !== null
      || row.postApprovalChangeAudit !== null
      || row.createsCommercialAuthority !== false
      || row.opensRoute !== false
      || row.nextGate !== CT_CLEANSLATE_PRODUCTIZATION.nextGate
    ) return null;
    return {
      obligationRouteKey: CT_CLEANSLATE_PRODUCTIZATION.obligationRouteKey,
      runtimeRouteId: CT_CLEANSLATE_PRODUCTIZATION.runtimeRouteId,
      jurisdiction: CT_CLEANSLATE_PRODUCTIZATION.jurisdiction,
      pathwayId: CT_CLEANSLATE_PRODUCTIZATION.pathwayId,
      registryTrackIds: [...CT_CLEANSLATE_PRODUCTIZATION.registryTrackIds],
      packetFamilyId: CT_CLEANSLATE_PRODUCTIZATION.packetFamilyId,
      scope: CT_CLEANSLATE_PRODUCTIZATION.scope,
      legalApproval: null,
      postApprovalChangeAudit: null,
      createsCommercialAuthority: false,
      opensRoute: false,
      nextGate: CT_CLEANSLATE_PRODUCTIZATION.nextGate
    };
  } catch {
    return null;
  }
}

/**
 * This DC family is a track-only legal-design route, so the generated registry
 * has no pathway row to borrow. The literal crosswalk below is therefore the
 * whole admission surface: one runtime route, one server-owned track and one
 * packet family. The owner adoption is preserved as evidence, while the absent
 * post-approval audit remains null and keeps the specification non-composable.
 */
function loadDcMisattributedProductization(): FactoryV2ExactRouteProductization | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(process.cwd(), ROUTE_MIGRATIONS_PATH), "utf8")) as {
      packetSets?: unknown;
    };
    if (!Array.isArray(parsed.packetSets)) return null;
    const matches = (parsed.packetSets as RawPacketSet[]).filter((packetSet) =>
      packetSet.packetSetId === DC_MISATTRIBUTED_PRODUCTIZATION.packetFamilyId);
    if (matches.length !== 1) return null;
    const packetSet = matches[0];
    const row = packetSet.factoryV2RouteProductization as RawExactRouteProductization | null;
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const legalApproval = dcLegalApproval(row.legalApproval);
    if (
      packetSet.jurisdiction !== DC_MISATTRIBUTED_PRODUCTIZATION.jurisdiction
      || packetSet.trackId !== DC_MISATTRIBUTED_PRODUCTIZATION.registryTrackIds[0]
      || !dcPacketComponentsMatch(packetSet.components)
      || row.obligationRouteKey !== DC_MISATTRIBUTED_PRODUCTIZATION.obligationRouteKey
      || row.runtimeRouteId !== DC_MISATTRIBUTED_PRODUCTIZATION.runtimeRouteId
      || row.jurisdiction !== DC_MISATTRIBUTED_PRODUCTIZATION.jurisdiction
      || row.pathwayId !== DC_MISATTRIBUTED_PRODUCTIZATION.pathwayId
      || !exactStringList(row.registryTrackIds, DC_MISATTRIBUTED_PRODUCTIZATION.registryTrackIds)
      || row.packetFamilyId !== DC_MISATTRIBUTED_PRODUCTIZATION.packetFamilyId
      || row.packetFamilyId !== packetSet.packetSetId
      || row.scope !== DC_MISATTRIBUTED_PRODUCTIZATION.scope
      || !legalApproval
      || row.postApprovalChangeAudit !== null
      || row.createsCommercialAuthority !== false
      || row.opensRoute !== false
      || row.nextGate !== DC_MISATTRIBUTED_PRODUCTIZATION.nextGate
    ) return null;
    return {
      obligationRouteKey: DC_MISATTRIBUTED_PRODUCTIZATION.obligationRouteKey,
      runtimeRouteId: DC_MISATTRIBUTED_PRODUCTIZATION.runtimeRouteId,
      jurisdiction: DC_MISATTRIBUTED_PRODUCTIZATION.jurisdiction,
      pathwayId: DC_MISATTRIBUTED_PRODUCTIZATION.pathwayId,
      registryTrackIds: [...DC_MISATTRIBUTED_PRODUCTIZATION.registryTrackIds],
      packetFamilyId: DC_MISATTRIBUTED_PRODUCTIZATION.packetFamilyId,
      scope: DC_MISATTRIBUTED_PRODUCTIZATION.scope,
      legalApproval,
      postApprovalChangeAudit: null,
      createsCommercialAuthority: false,
      opensRoute: false,
      nextGate: DC_MISATTRIBUTED_PRODUCTIZATION.nextGate
    };
  } catch {
    return null;
  }
}

function dcMisattributedSpecificationMatches(
  exactProductization: FactoryV2ExactRouteProductization
): boolean {
  const specification = packetSpecificationForTrack(
    exactProductization.runtimeRouteId,
    exactProductization.registryTrackIds[0]
  );
  if (!specification) return false;
  const exact = specification as typeof specification & {
    obligationRouteKey?: unknown;
    legalApproval?: unknown;
    postApprovalChangeAudit?: unknown;
    requiredFacts?: Array<{ factId?: unknown; inRegistryRequiredInputs?: unknown }>;
    sourceIdentities?: Array<{
      sourceId?: unknown;
      sha256?: unknown;
      byteLength?: unknown;
      instrumentKind?: unknown;
      shippedAsPacketComponent?: unknown;
    }>;
    artifactEvidence?: Array<{
      fixture?: unknown;
      file?: unknown;
      sha256?: unknown;
      byteLength?: unknown;
      pageCount?: unknown;
      components?: unknown;
      authority?: unknown;
    }>;
  };
  const routeKeys = exact.routeKeys ?? [exact.routeKey];
  const requiredInputIds = (exact.requiredFacts ?? [])
    .filter((fact) => fact.inRegistryRequiredInputs === true)
    .map((fact) => fact.factId);
  const documents = exact.documents.slice().sort((left, right) => left.order - right.order);
  const reference = exact.sourceIdentities?.find((source) =>
    source.sourceId === DC_MISATTRIBUTED_PRODUCTIZATION.referenceSourceId);
  if (
    exact.obligationRouteKey !== DC_MISATTRIBUTED_PRODUCTIZATION.obligationRouteKey
    || exact.routeKey !== DC_MISATTRIBUTED_PRODUCTIZATION.runtimeRouteId
    || !exactStringList(routeKeys, [DC_MISATTRIBUTED_PRODUCTIZATION.runtimeRouteId])
    || exact.jurisdiction !== DC_MISATTRIBUTED_PRODUCTIZATION.jurisdiction
    || exact.pathwayId !== DC_MISATTRIBUTED_PRODUCTIZATION.pathwayId
    || exact.trackId !== DC_MISATTRIBUTED_PRODUCTIZATION.registryTrackIds[0]
    || exact.packetFamily !== DC_MISATTRIBUTED_PRODUCTIZATION.packetFamilyId
    || exact.packetSetId !== DC_MISATTRIBUTED_PRODUCTIZATION.packetFamilyId
    || exact.profileVersion !== DC_MISATTRIBUTED_PRODUCTIZATION.profileVersion
    || specificationLegalSectionsBound(exact)
    || !dcLegalApproval(exact.legalApproval)
    || exact.postApprovalChangeAudit !== null
    || !exactStringList(requiredInputIds, DC_MISATTRIBUTED_PRODUCTIZATION.requiredInputIds)
    || documents.length !== DC_MISATTRIBUTED_PRODUCTIZATION.components.length
    || reference?.sha256 !== DC_MISATTRIBUTED_PRODUCTIZATION.referenceSourceSha256
    || reference.byteLength !== DC_MISATTRIBUTED_PRODUCTIZATION.referenceSourceByteLength
    || reference.instrumentKind !== "bound_reference_instrument"
    || reference.shippedAsPacketComponent !== false
    || !/^[0-9a-f]{64}$/.test(specificationContentSha256(exact))
  ) return false;
  for (let index = 0; index < DC_MISATTRIBUTED_PRODUCTIZATION.components.length; index += 1) {
    const [manifestComponentId, role, outputStrategy, order] = DC_MISATTRIBUTED_PRODUCTIZATION.components[index];
    const document = documents[index];
    if (
      document?.documentId !== role
      || document.role !== role
      || document.outputStrategy !== outputStrategy
      || document.officialFormId !== null
      || document.manifestComponentId !== manifestComponentId
      || document.order !== order
    ) return false;
  }
  if (!Array.isArray(exact.artifactEvidence)
    || exact.artifactEvidence.length !== DC_MISATTRIBUTED_PRODUCTIZATION.artifactPins.length) return false;
  for (let index = 0; index < DC_MISATTRIBUTED_PRODUCTIZATION.artifactPins.length; index += 1) {
    const [fixture, file, sha256, byteLength, pageCount] = DC_MISATTRIBUTED_PRODUCTIZATION.artifactPins[index];
    const artifact = exact.artifactEvidence[index];
    if (
      artifact?.fixture !== fixture
      || artifact.file !== file
      || artifact.sha256 !== sha256
      || artifact.byteLength !== byteLength
      || artifact.pageCount !== pageCount
      || !exactStringList(artifact.components, ["primary_filing", "prosecutor_service", "filing_instructions"])
      || artifact.authority !== "technical_evidence_only"
    ) return false;
  }
  return true;
}

function admissible(
  route: RawRoute,
  migration: FactoryV2RouteMigration | null,
  exactProductization: FactoryV2ExactRouteProductization | null
): boolean {
  const generatedAdmission = route.factoryV2Resolves === true
    && route.legacyGeneratorOwnsThisJurisdiction !== true;
  const exactLegacyMigration = route.factoryV2Resolves === false
    && route.legacyGeneratorOwnsThisJurisdiction === true
    && migration !== null;
  if (!generatedAdmission && !exactLegacyMigration) return false;
  const inputs = route.buildInputs;
  if (!inputs || typeof inputs !== "object") return false;
  if (!REQUIRED_BUILD_INPUTS.every((name) => inputs[name] === true)) return false;
  if (stringList(route.unmetBuildInputs).length > 0) return false;
  if (typeof route.jurisdiction !== "string" || route.jurisdiction.trim() === "") return false;
  if (typeof route.pathwayId !== "string" || route.pathwayId.trim() === "") return false;
  if (typeof route.profileVersion !== "string" || route.profileVersion.trim() === "") return false;
  if (stringList(route.packetSetIds).length === 0) return false;
  if (stringList(route.requiredInputIds).length === 0) return false;
  const jurisdiction = route.jurisdiction.trim().toUpperCase();
  const routeId = `${jurisdiction}:${route.pathwayId.trim()}`;
  // Once CT is route-productized, its generated jurisdiction rows are not an
  // aggregate grant. Only the exact manifest crosswalk below may pass.
  if (jurisdiction === CT_CLEANSLATE_PRODUCTIZATION.jurisdiction && !exactProductization) return false;
  if (exactProductization) {
    if (migration) return false;
    if (routeId !== exactProductization.runtimeRouteId) return false;
    if (route.pathwayId.trim() !== exactProductization.pathwayId) return false;
    if (!exactStringList(route.registryTrackIds, exactProductization.registryTrackIds)) return false;
    if (!exactStringList(route.packetSetIds, [exactProductization.packetFamilyId])) return false;
    const specification = packetSpecificationForTrack(routeId, exactProductization.registryTrackIds[0]);
    const specificationRouteKeys = specification?.routeKeys ?? (specification ? [specification.routeKey] : []);
    if (specification?.packetFamily !== exactProductization.packetFamilyId) return false;
    if (!specificationRouteKeys.includes(routeId)) return false;
    if (specificationLegalSectionsBound(specification)) return false;
    if (!/^[0-9a-f]{64}$/.test(specificationContentSha256(specification))) return false;
  }
  if (migration) {
    const specification = migration.registryTrackIds.length === 1
      ? packetSpecificationForTrack(routeId, migration.registryTrackIds[0])
      : undefined;
    const specificationRouteKeys = specification?.routeKeys ?? (specification ? [specification.routeKey] : []);
    const rawPacketSetIds = stringList(route.packetSetIds);
    const rawRegistryTrackIds = stringList(route.registryTrackIds);
    if (migration.routeId !== routeId) return false;
    if (!migration.registryTrackIds.every((trackId) => rawRegistryTrackIds.includes(trackId))) return false;
    if (!rawPacketSetIds.includes(migration.packetFamilyId)) return false;
    if (specification?.packetFamily !== migration.packetFamilyId) return false;
    if (!exactStringList(migration.registryTrackIds, [specification.trackId])) return false;
    if (!specificationRouteKeys.includes(routeId)) return false;
    if (!specificationLegalSectionsBound(specification)) return false;
    if (!("legalSectionsBoundBy" in specification)
      || specification.legalSectionsBoundBy?.ownerDecisionRecordId !== migration.ownerDecisionRecordId
      || specification.legalSectionsBoundBy.postApprovalAuditVerdict !== "COVERED_BY_EXISTING_APPROVAL") return false;
  }
  return true;
}

function loadAll(): Map<string, FactoryV2Route> {
  if (cache) return cache;
  const admitted = new Map<string, FactoryV2Route>();
  const migrations = loadRouteMigrations();
  const ctCleanSlateProductization = loadCtCleanSlateProductization();
  const dcMisattributedProductization = loadDcMisattributedProductization();
  const file = path.join(process.cwd(), REGISTRY_PATH);
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { routes?: RawRoute[] };
      for (const route of parsed.routes ?? []) {
        const jurisdiction = String(route.jurisdiction).trim().toUpperCase();
        const pathwayId = String(route.pathwayId).trim();
        const routeId = `${jurisdiction}:${pathwayId}`;
        const migration = migrations.get(routeId) ?? null;
        const exactProductization = routeId === CT_CLEANSLATE_PRODUCTIZATION.runtimeRouteId
          ? ctCleanSlateProductization
          : null;
        if (!admissible(route, migration, exactProductization)) continue;
        const specification = packetSpecificationFor(routeId);
        const rawRegistryTrackIds = stringList(route.registryTrackIds);
        const rawPacketSetIds = stringList(route.packetSetIds);
        const registryTrackIds = migration?.registryTrackIds
          ?? exactProductization?.registryTrackIds
          ?? rawRegistryTrackIds;
        const packetSetIds = migration
          ? [migration.packetFamilyId]
          : exactProductization
            ? [exactProductization.packetFamilyId]
            : rawPacketSetIds;
        admitted.set(`${jurisdiction}:${pathwayId}`, {
          pathwayKey: `${jurisdiction}:${pathwayId}`,
          jurisdiction,
          pathwayId,
          registryTrackIds,
          packetSetIds,
          profileVersion: String(route.profileVersion).trim(),
          requiredInputIds: stringList(route.requiredInputIds),
          officialFormIds: stringList(route.officialFormIds),
          packetFamilyId: specification?.packetFamily ?? null,
          retiredLegacyRouteMigration: migration,
          exactRouteProductization: exactProductization,
          exactTrackSelectionRequired: exactProductization !== null
            || (migration !== null
              && (!exactStringList(rawRegistryTrackIds, registryTrackIds)
                || !exactStringList(rawPacketSetIds, packetSetIds)))
        });
      }
      // The DC misattributed-arrest obligation is track-only and therefore has
      // no generated pathway row. Admit precisely the literal crosswalk above,
      // after checking its server specification, rather than inventing a
      // jurisdiction aggregate or treating any sibling DC route as equivalent.
      if (
        dcMisattributedProductization
        && !admitted.has(DC_MISATTRIBUTED_PRODUCTIZATION.runtimeRouteId)
        && dcMisattributedSpecificationMatches(dcMisattributedProductization)
      ) {
        const specification = packetSpecificationFor(DC_MISATTRIBUTED_PRODUCTIZATION.runtimeRouteId);
        admitted.set(DC_MISATTRIBUTED_PRODUCTIZATION.runtimeRouteId, {
          pathwayKey: DC_MISATTRIBUTED_PRODUCTIZATION.runtimeRouteId,
          jurisdiction: DC_MISATTRIBUTED_PRODUCTIZATION.jurisdiction,
          pathwayId: DC_MISATTRIBUTED_PRODUCTIZATION.pathwayId,
          registryTrackIds: [...DC_MISATTRIBUTED_PRODUCTIZATION.registryTrackIds],
          packetSetIds: [DC_MISATTRIBUTED_PRODUCTIZATION.packetFamilyId],
          profileVersion: DC_MISATTRIBUTED_PRODUCTIZATION.profileVersion,
          requiredInputIds: [...DC_MISATTRIBUTED_PRODUCTIZATION.requiredInputIds],
          officialFormIds: [],
          packetFamilyId: specification?.packetFamily ?? null,
          retiredLegacyRouteMigration: null,
          exactRouteProductization: dcMisattributedProductization,
          exactTrackSelectionRequired: true
        });
      }
    }
  } catch {
    // A malformed registry admits nothing. It never partially admits, and it
    // never throws into a participant's request.
    admitted.clear();
  }
  cache = admitted;
  return cache;
}

/** The factory_v2 route for this jurisdiction and pathway, when one is admitted. */
export function factoryV2RouteFor(
  jurisdiction: string,
  pathwayId: string,
  trackId?: string | null
): FactoryV2Route | null {
  const code = String(jurisdiction ?? "").trim().toUpperCase();
  const id = String(pathwayId ?? "").trim();
  if (!code || !id) return null;
  const route = loadAll().get(`${code}:${id}`) ?? null;
  if (!route) return null;
  if (!route.retiredLegacyRouteMigration && !route.exactRouteProductization) return route;
  const selectedTrackId = String(trackId ?? "").trim();
  if (selectedTrackId && !route.registryTrackIds.includes(selectedTrackId)) return null;
  if (route.exactTrackSelectionRequired && !selectedTrackId) return null;
  return route;
}

/**
 * The exact validated migration, but only when the generated registry row is
 * also admissible. The resolver uses this to let one route pass the retired
 * jurisdiction fence without weakening that fence for any sibling.
 */
export function factoryV2RouteMigrationFor(
  jurisdiction: string,
  pathwayId: string,
  trackId?: string | null
): FactoryV2RouteMigration | null {
  return factoryV2RouteFor(jurisdiction, pathwayId, trackId)?.retiredLegacyRouteMigration ?? null;
}

/** Test seam: forget the loaded registry so a fixture can be read fresh. */
export function resetFactoryV2RegistryCache() {
  cache = null;
}
