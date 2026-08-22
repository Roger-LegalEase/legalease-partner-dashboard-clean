import "server-only";

import fs from "node:fs";
import path from "node:path";

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
 *   * a route entry is honoured only when the generator marked it resolving AND
 *     its own build inputs all read true, so a hand-edited `factoryV2Resolves`
 *     with an unmet input underneath admits nothing.
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
};

const REGISTRY_PATH = "data/record-clearing/factory-v2-route-registry.json";

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

let cache: Map<string, FactoryV2Route> | null = null;

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];

function admissible(route: RawRoute): boolean {
  if (route.factoryV2Resolves !== true) return false;
  // A legacy generator keeps its own route. Admitting one here would re-point a
  // live, proven jurisdiction at a different builder, which is not what
  // factory_v2 is for.
  if (route.legacyGeneratorOwnsThisJurisdiction === true) return false;
  const inputs = route.buildInputs;
  if (!inputs || typeof inputs !== "object") return false;
  if (!REQUIRED_BUILD_INPUTS.every((name) => inputs[name] === true)) return false;
  if (stringList(route.unmetBuildInputs).length > 0) return false;
  if (typeof route.jurisdiction !== "string" || route.jurisdiction.trim() === "") return false;
  if (typeof route.pathwayId !== "string" || route.pathwayId.trim() === "") return false;
  if (typeof route.profileVersion !== "string" || route.profileVersion.trim() === "") return false;
  if (stringList(route.packetSetIds).length === 0) return false;
  if (stringList(route.requiredInputIds).length === 0) return false;
  return true;
}

function loadAll(): Map<string, FactoryV2Route> {
  if (cache) return cache;
  const admitted = new Map<string, FactoryV2Route>();
  const file = path.join(process.cwd(), REGISTRY_PATH);
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { routes?: RawRoute[] };
      for (const route of parsed.routes ?? []) {
        if (!admissible(route)) continue;
        const jurisdiction = String(route.jurisdiction).trim().toUpperCase();
        const pathwayId = String(route.pathwayId).trim();
        admitted.set(`${jurisdiction}:${pathwayId}`, {
          pathwayKey: `${jurisdiction}:${pathwayId}`,
          jurisdiction,
          pathwayId,
          registryTrackIds: stringList(route.registryTrackIds),
          packetSetIds: stringList(route.packetSetIds),
          profileVersion: String(route.profileVersion).trim(),
          requiredInputIds: stringList(route.requiredInputIds),
          officialFormIds: stringList(route.officialFormIds)
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
export function factoryV2RouteFor(jurisdiction: string, pathwayId: string): FactoryV2Route | null {
  const code = String(jurisdiction ?? "").trim().toUpperCase();
  const id = String(pathwayId ?? "").trim();
  if (!code || !id) return null;
  return loadAll().get(`${code}:${id}`) ?? null;
}

/** Test seam: forget the loaded registry so a fixture can be read fresh. */
export function resetFactoryV2RegistryCache() {
  cache = null;
}
