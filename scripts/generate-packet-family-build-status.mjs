#!/usr/bin/env node
/**
 * Which packet families a contract names, and which of them exist.
 *
 * A contract naming a packet family is a legal statement about what a route
 * produces. It is not evidence that anything has been built. Nothing recorded
 * whether the two matched, so a route could name the "Georgia § 42-8-66
 * Retroactive First Offender Petition" while the factory registry held no such
 * family at all — only a guidance family — and nothing said so anywhere.
 *
 * Status comes from the factory_v2 registry's own build inputs, not from a
 * hand-kept list:
 *
 *   BUILT                              factoryV2Resolves and no unmet build input
 *   BUILT_BY_PRESERVED_LEGACY_GENERATOR factory_v2 declines only because a
 *                          preserved legacy generator owns the jurisdiction.
 *                          ADR-0003 settled this: factory_v2 standing aside for
 *                          Mississippi and Texas-Harris is the division of work
 *                          this repository chose, not a gap in it. The first
 *                          version of this generator called those five routes
 *                          NOT_BUILT and produced a "five paid routes selling
 *                          an unbuilt packet" finding that was entirely an
 *                          artefact of the label.
 *   IDENTIFIED_NOT_BUILT   a build input is unmet, or the route carries an open
 *                          artifact_generation delivery gate
 *   NO_REGISTRY_ROW        the contract names a family and the registry has no
 *                          row for the route at all
 *
 * `--check` fails if the file on disk differs from what this would write.
 */
import fs from "node:fs";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { LEGAL_AUTHORITY } = await import("@/lib/legal-authority/index");

const OUT = "data/rcap-ledger/packet-family-build-status.json";
const registry = JSON.parse(fs.readFileSync("data/record-clearing/factory-v2-route-registry.json", "utf8"));
const registryByKey = new Map(registry.routes.map((row) => [row.pathwayKey, row]));

function familiesNamedBy(route) {
  const named = [];
  if (typeof route.packetFamily === "string" && route.packetFamily.trim()) {
    named.push({ family: route.packetFamily, branchId: null });
  }
  for (const branch of route.serviceBranches ?? []) {
    if (typeof branch.packetFamily === "string" && branch.packetFamily.trim()) {
      named.push({ family: branch.packetFamily, branchId: branch.id });
    }
  }
  return named;
}

function openArtifactGates(route, branchId) {
  return (route.deliveryGates ?? [])
    .filter((gate) => gate.kind === "artifact_generation")
    .filter((gate) => gate.branchId == null || gate.branchId === branchId)
    .map((gate) => gate.id);
}

const rows = [];
for (const route of LEGAL_AUTHORITY.routes) {
  for (const { family, branchId } of familiesNamedBy(route)) {
    const registryRow = registryByKey.get(route.routeKey);
    const gates = openArtifactGates(route, branchId);
    let status;
    let evidence;
    if (!registryRow) {
      status = "NO_REGISTRY_ROW";
      evidence = "The contract names a packet family and the factory_v2 registry carries no row for this route, so nothing can say whether it is buildable.";
    } else if (gates.length > 0) {
      status = "IDENTIFIED_NOT_BUILT";
      evidence = `The contract holds an open artifact_generation gate: ${gates.join(", ")}. Registry: factoryV2Resolves=${registryRow.factoryV2Resolves}, unmetBuildInputs=[${(registryRow.unmetBuildInputs ?? []).join(", ")}], registry families [${(registryRow.packetFamilies ?? []).join(", ")}].`;
    } else if (registryRow.factoryV2Resolves === true && (registryRow.unmetBuildInputs ?? []).length === 0) {
      status = "BUILT";
      evidence = `factory_v2 resolves this route with every build input met; ${registryRow.componentCount} component(s), official forms [${(registryRow.officialFormIds ?? []).join(", ")}].`;
    } else if (registryRow.legacyGeneratorOwnsThisJurisdiction === true && (registryRow.unmetBuildInputs ?? []).length === 0) {
      status = "BUILT_BY_PRESERVED_LEGACY_GENERATOR";
      evidence = `Every build input is met and factory_v2 declines only because a preserved legacy generator owns this jurisdiction (AGENTS.md). ${registryRow.componentCount} component(s). The family exists; it is produced by the legacy generator rather than by factory_v2.`;
    } else {
      status = "IDENTIFIED_NOT_BUILT";
      evidence = `Unmet build inputs: [${(registryRow.unmetBuildInputs ?? []).join(", ")}]. factoryV2Resolves=${registryRow.factoryV2Resolves}.`;
    }
    rows.push({
      routeKey: route.routeKey,
      branchId,
      packetFamily: family,
      status,
      // The family the contract names against the families the registry knows.
      // Georgia's § 42-8-66 route names a petition family and the registry
      // holds only a guidance family; naming both is what makes that visible.
      registryPacketFamilies: registryRow?.packetFamilies ?? null,
      evidence
    });
  }
}
rows.sort((a, b) => a.routeKey.localeCompare(b.routeKey) || String(a.branchId).localeCompare(String(b.branchId)));

const totals = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {});
const doc = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-packet-family-build-status.mjs",
  note: "Every packet family a legal contract names, with whether it exists. A contract naming a family is a legal statement about what a route produces; it is not evidence that anything has been built. Status is derived from the factory_v2 registry's own build inputs and the contracts' own artifact_generation gates, never asserted. Nothing here authorizes anything: a BUILT family may still be held closed by its route's preconditions, and an IDENTIFIED_NOT_BUILT one is a description, not a work order.",
  totals: { families: rows.length, ...totals },
  rows
};
const serialized = `${JSON.stringify(doc, null, 2)}\n`;

if (process.argv.includes("--check")) {
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== serialized) {
    console.error(`${OUT} is stale; regenerate with node scripts/generate-packet-family-build-status.mjs`);
    process.exit(1);
  }
  console.log(`Packet-family build status is current: ${JSON.stringify(doc.totals)}`);
} else {
  fs.writeFileSync(OUT, serialized);
  console.log(`Wrote ${OUT}: ${JSON.stringify(doc.totals)}`);
}
