import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  packetSpecificationFor,
  packetSpecificationForTrack,
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
  /** True when the generated runtime row carries sibling tracks and the caller must name the exact migrated track. */
  exactTrackSelectionRequired: boolean;
};

const REGISTRY_PATH = "data/record-clearing/factory-v2-route-registry.json";
const ROUTE_MIGRATIONS_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const COHORT_OWNER_DECISION = "OWN-ADOPT-2026-09-02-BATCH-53";

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
};

let cache: Map<string, FactoryV2Route> | null = null;

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];

function exactStringList(actual: unknown, expected: readonly string[]): boolean {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  return actual.every((value, index) => typeof value === "string" && value === expected[index]);
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

function admissible(route: RawRoute, migration: FactoryV2RouteMigration | null): boolean {
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
  if (migration) {
    const routeId = `${String(route.jurisdiction).trim().toUpperCase()}:${String(route.pathwayId).trim()}`;
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
  const file = path.join(process.cwd(), REGISTRY_PATH);
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { routes?: RawRoute[] };
      for (const route of parsed.routes ?? []) {
        const jurisdiction = String(route.jurisdiction).trim().toUpperCase();
        const pathwayId = String(route.pathwayId).trim();
        const routeId = `${jurisdiction}:${pathwayId}`;
        const migration = migrations.get(routeId) ?? null;
        if (!admissible(route, migration)) continue;
        const specification = packetSpecificationFor(routeId);
        const rawRegistryTrackIds = stringList(route.registryTrackIds);
        const rawPacketSetIds = stringList(route.packetSetIds);
        const registryTrackIds = migration?.registryTrackIds ?? rawRegistryTrackIds;
        const packetSetIds = migration ? [migration.packetFamilyId] : rawPacketSetIds;
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
          exactTrackSelectionRequired: migration !== null
            && (!exactStringList(rawRegistryTrackIds, registryTrackIds)
              || !exactStringList(rawPacketSetIds, packetSetIds))
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
  if (!route?.retiredLegacyRouteMigration) return route;
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
