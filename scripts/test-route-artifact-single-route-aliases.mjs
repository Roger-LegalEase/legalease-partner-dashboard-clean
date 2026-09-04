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
for (const family of master.families) {
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
assert.deepEqual(aliasFamilies.sort(), [],
  "no current family may qualify while every exact one-route candidate remains below COMPLETE_PACKET_PROVEN");

const candidates = ["va_exp_absolute_pardon-set", "nv_seal_probation_family-set"];
for (const familyId of candidates) {
  const family = master.families.find((row) => row.familyId === familyId);
  assert.ok(family, `${familyId} must remain in the master queue`);
  assert.equal(family.state, "VERIFY_PENDING", `${familyId} must not be promoted by route-alias evidence`);
  assert.equal(family.completenessStatus, "PASS_COMPLETE", `${familyId} must retain its family completeness measurement`);

  const rendered = read(`${family.directory}/reports/rendered-artifacts.json`);
  const fieldMap = read(`${family.directory}/production-field-map.json`);
  assert.equal(singleRouteFamilyArtifacts({ familyId, rendered, fieldMap, master, routeRegistry }).length, 0,
    `${familyId} must remain gated while independent review is pending`);

  const proofOnlyMaster = {
    ...master,
    families: master.families.map((row) => row.familyId === familyId
      ? { ...row, state: "COMPLETE_PACKET_PROVEN" }
      : row)
  };
  assert.equal(singleRouteFamilyArtifacts({ familyId, rendered, fieldMap, master: proofOnlyMaster, routeRegistry }).length, 2,
    `${familyId} must have exact one-route, one-family, all-component structural evidence without treating that evidence as a lifecycle promotion`);
}

const completeness = read("data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_COMPLETENESS.json");
const rasterQueue = read("data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_RASTER_QUEUE.json");
const acceptance = read("data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_ACCEPTANCE.json");
assert.equal(completeness.results.filter((row) => row.familyId === "nv_seal_probation_family-set").length, 0,
  "Nevada must not acquire route-completeness rows before the lifecycle gate is met");
assert.equal(rasterQueue.rows.filter((row) => row.packetFamilyId === "nv_seal_probation_family-set").length, 0,
  "Nevada must not inherit its older family raster before it qualifies as the route artifact");
assert.equal(acceptance.rows.filter((row) => row.familyId === "nv_seal_probation_family-set").length, 0,
  "Nevada must not acquire route-acceptance rows while independent review is pending");

console.log("Single-route family artifact aliases remain fail-closed while Virginia and Nevada await independent lifecycle promotion.");
