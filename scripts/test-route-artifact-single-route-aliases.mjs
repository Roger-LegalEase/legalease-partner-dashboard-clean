#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { singleRouteFamilyArtifacts } from "./lib/route-artifact-scope.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERIFIER = "scripts/rcap-packet-completeness/verify-route-artifact-completeness.mjs";

const run = (...args) => spawnSync(process.execPath, [VERIFIER, ...args], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024
});

for (const family of ["va_exp_absolute_pardon-set"]) {
  const result = run("--family", family);
  assert.equal(result.status, 0, `${family} must pass route-scoped completeness:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, new RegExp(`ok\\s+${family} .* canonical .* ROUTE_PASS_COMPLETE`));
  assert.match(result.stdout, new RegExp(`ok\\s+${family} .* boundary .* ROUTE_PASS_COMPLETE`));
  assert.match(result.stdout, /2 route artifact\(s\) measured this run · 2 total · 2 ROUTE_PASS_COMPLETE/);
}

const missing = run("--family", "not-a-real-family");
assert.notEqual(missing.status, 0, "an explicit family filter that measures nothing must not vacuously pass");
assert.match(`${missing.stdout}\n${missing.stderr}`, /REFUSED: no route artifacts matched the explicit filter/);

const safe = {
  familyId: "safe-set",
  rendered: {
    componentSet: ["filing", "instructions"],
    artifacts: ["canonical", "boundary"].map((fixture) => ({
      fixture, file: `${fixture}.pdf`, sha256: "a".repeat(64), byteLength: 1, pageCount: 2,
      components: ["filing", "instructions"],
      pageManifest: [{ component: "filing" }, { component: "instructions" }]
    }))
  },
  fieldMap: { componentRoutes: { filing: "internal-route", instructions: "internal-route" } },
  master: { families: [{ familyId: "safe-set", state: "COMPLETE_PACKET_PROVEN", jurisdiction: "ZZ", routeKeys: ["internal-route"] }] },
  routeRegistry: { routes: [{ pathwayKey: "ZZ:customer-route", pathwayId: "customer-route", jurisdiction: "ZZ", packetSetIds: ["safe-set"], packetFamilies: [] }] }
};
assert.equal(singleRouteFamilyArtifacts(safe).length, 2);
assert.equal(singleRouteFamilyArtifacts({ ...safe, fieldMap: { componentRoutes: { filing: "internal-route" } } }).length, 0,
  "a component without an exact route assignment must refuse the alias");
assert.equal(singleRouteFamilyArtifacts({
  ...safe,
  master: { families: [...safe.master.families, { familyId: "other-set", state: "COMPLETE_PACKET_PROVEN", jurisdiction: "ZZ", routeKeys: ["other-route"] }] },
  routeRegistry: { routes: [{ ...safe.routeRegistry.routes[0], packetSetIds: ["safe-set", "other-set"] }] }
}).length, 0, "a customer route naming two known families must refuse the alias");
assert.equal(singleRouteFamilyArtifacts({
  ...safe,
  master: { families: [{ ...safe.master.families[0], state: "VERIFIED_PASS" }] }
}).length, 0, "a family below COMPLETE_PACKET_PROVEN must refuse the alias");

const read = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const routeRegistry = read("data/record-clearing/factory-v2-route-registry.json");
const aliasFamilies = [];
for (const family of master.families.filter((row) => row.state === "COMPLETE_PACKET_PROVEN")) {
  const renderedPath = path.join(ROOT, family.directory, "reports/rendered-artifacts.json");
  const fieldMapPath = path.join(ROOT, family.directory, "production-field-map.json");
  if (!fs.existsSync(renderedPath) || !fs.existsSync(fieldMapPath)) continue;
  const aliases = singleRouteFamilyArtifacts({
    familyId: family.familyId,
    rendered: JSON.parse(fs.readFileSync(renderedPath, "utf8")),
    fieldMap: JSON.parse(fs.readFileSync(fieldMapPath, "utf8")),
    master,
    routeRegistry
  });
  if (aliases.length > 0) aliasFamilies.push(family.familyId);
}
assert.deepEqual(aliasFamilies.sort(), ["va_exp_absolute_pardon-set"],
  "the exact qualifying family set must remain the current proven one-route family; widening requires new component-route evidence and a reviewed test change");

const completeness = read("data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_COMPLETENESS.json");
const rasterQueue = read("data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_RASTER_QUEUE.json");
const acceptance = read("data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_ACCEPTANCE.json");
for (const familyId of ["va_exp_absolute_pardon-set"]) {
  const completeRows = completeness.results.filter((row) => row.familyId === familyId);
  assert.equal(completeRows.length, 2);
  assert.ok(completeRows.every((row) => row.result === "ROUTE_PASS_COMPLETE" && row.familyAssemblyIsRouteArtifact));

  const queueRows = rasterQueue.rows.filter((row) => row.packetFamilyId === familyId);
  assert.equal(queueRows.length, 1);
  assert.equal(queueRows[0].currentRasterState, "RASTER_PASS");
  assert.equal(queueRows[0].preexistingRasterAcceptance?.verdict, "RASTER_PASS");

  const acceptanceRows = acceptance.rows.filter((row) => row.familyId === familyId);
  assert.equal(acceptanceRows.length, 2);
  assert.ok(acceptanceRows.every((row) => row.rasterAcceptance.state === "RASTER_PASS"));
  assert.ok(acceptanceRows.every((row) => row.deterministicRebuild.result === "NOT_MEASURED"));
  assert.ok(acceptanceRows.every((row) => row.independentVerification.pending === true));
}
assert.ok(completeness.focusedRegeneration.untouchedRowsPreserved >= 0);
assert.ok(rasterQueue.focusedRegeneration.untouchedRowsPreserved >= 0);
assert.ok(acceptance.focusedRegeneration.untouchedRowsPreserved >= 0);

console.log("Single-route family artifact aliases are measured route-scoped and explicit empty filters fail closed.");
