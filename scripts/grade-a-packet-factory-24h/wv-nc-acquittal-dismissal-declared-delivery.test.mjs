import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  bindDeclaredWvDelivery,
  WV_COMPONENTS,
  WV_FAMILY,
  WV_ROUTE,
} from "./wv-nc-acquittal-dismissal-declared-delivery.mjs";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const digest = (relative) => crypto.createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relative))).digest("hex");

const family = readJson("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json")
  .families.find((row) => row.familyId === WV_FAMILY);
assert.ok(family, "WV family is missing from the current queue");
const currentWiringPath =
  "data/rcap-all50/overlays/census-v1/wv/"
  + "wv-nc-acquittal-dismissal-set--official-pdf-fill/product-wiring.json";
const currentWiring = readJson(currentWiringPath);
const report = readJson(
  "data/rcap-all50/overlays/census-v1/wv/"
    + "wv-nc-acquittal-dismissal-set--official-pdf-fill/reports/rendered-artifacts.json");
const fieldMap = readJson(
  "data/rcap-all50/overlays/census-v1/wv/"
    + "wv-nc-acquittal-dismissal-set--official-pdf-fill/production-field-map.json");

const protectedFiles = [
  currentWiringPath,
  "data/rcap-all50/overlays/census-v1/wv/"
    + "wv-nc-acquittal-dismissal-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/wv/"
    + "wv-nc-acquittal-dismissal-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/wv/"
    + "wv-nc-acquittal-dismissal-set--official-pdf-fill/reports/rendered-artifacts.json",
  "data/rcap-all50/overlays/census-v1/wv/"
    + "wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-canonical.pdf",
  "data/rcap-all50/overlays/census-v1/wv/"
    + "wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-boundary.pdf",
  "data/rcap-all50/overlays/census-v1/wv/"
    + "wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/acquittal-canonical.pdf",
  "data/rcap-all50/overlays/census-v1/wv/"
    + "wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/acquittal-boundary.pdf",
];
const before = Object.fromEntries(protectedFiles.map((file) => [file, digest(file)]));

const staleWiring = structuredClone(currentWiring);
staleWiring.binding.packetComponents = [
  "component:wv_nc_acquittal_dismissal-certificate-of-service-2",
  "component:wv_nc_acquittal_dismissal-primary-filing-1",
];
const aligned = bindDeclaredWvDelivery(staleWiring, family, {
  report,
  fieldMap,
});

assert.deepEqual(aligned.routeKeys, [WV_ROUTE]);
assert.deepEqual(aligned.branchRoutes, {
  DISMISSED_STRAIGHT: "wv_nc_acquittal_dismissal-primary-filing-1",
  ACQUITTED_OR_FOUND_NOT_GUILTY: "wv_nc_acquittal_dismissal-acquittal-civil-petition-4",
});
assert.deepEqual(aligned.binding.packetComponents, [
  "component:wv_nc_acquittal_dismissal-certificate-of-service-2",
  "component:wv_nc_acquittal_dismissal-primary-filing-1",
  "component:wv_nc_acquittal_dismissal-acquittal-civil-petition-4",
]);
assert.deepEqual(aligned.binding.componentConditions, fieldMap.componentConditions);
assert.deepEqual(aligned.binding.packetComponentsScope.declaredComponentSet,
  WV_COMPONENTS.map((id) => `component:${id}`));
assert.equal(aligned.binding.packetComponentsScope.textOnlyComponent,
  "component:wv_nc_acquittal_dismissal-filing-instructions-3");
assert.deepEqual(aligned.binding.packetComponentsScope.branchCoverage, {
  DISMISSED_STRAIGHT: [
    "component:wv_nc_acquittal_dismissal-primary-filing-1",
    "component:wv_nc_acquittal_dismissal-certificate-of-service-2",
  ],
  ACQUITTED_OR_FOUND_NOT_GUILTY: [
    "component:wv_nc_acquittal_dismissal-acquittal-civil-petition-4",
  ],
});
assert.deepEqual(currentWiring.binding.packetComponents, [
  "component:wv_nc_acquittal_dismissal-certificate-of-service-2",
  "component:wv_nc_acquittal_dismissal-primary-filing-1",
  "component:wv_nc_acquittal_dismissal-acquittal-civil-petition-4",
], "the test must not mutate the current repaired generated record");

const incompleteReport = structuredClone(report);
incompleteReport.componentSet = incompleteReport.componentSet
  .filter((id) => id !== "wv_nc_acquittal_dismissal-acquittal-civil-petition-4");
assert.throws(() => bindDeclaredWvDelivery(structuredClone(currentWiring), family, {
  report: incompleteReport,
  fieldMap,
}), /WV rendered component set drifted/);

const generatorSource = fs.readFileSync(path.join(ROOT,
  "scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs"), "utf8");
assert.match(generatorSource,
  /import \{ bindDeclaredWvDelivery, WV_FAMILY \} from "\.\/wv-nc-acquittal-dismissal-declared-delivery\.mjs"/,
  "central generator must import the WV family binder");
assert.match(generatorSource,
  /family\.familyId === WV_FAMILY[\s\S]{0,500}bindDeclaredWvDelivery/,
  "central generator must invoke the WV family binder");

for (const [file, expected] of Object.entries(before)) {
  assert.equal(digest(file), expected, `protected file changed during binding test: ${file}`);
}

console.log(JSON.stringify({
  test: "wv-nc-acquittal-dismissal-declared-delivery",
  status: "PASS",
  mechanism: "family-specific central product-wiring binder",
  branches: 2,
  declaredComponents: WV_COMPONENTS.length,
  pageBackedPacketComponents: aligned.binding.packetComponents.length,
  textOnlyInstructionsExplicitlyRepresented: true,
  sourceOrPdfMutation: false,
  rasterDispatched: false,
}, null, 2));
