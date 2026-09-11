import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { bindDeclaredNdDelivery, ND_COMPONENTS, ND_DIRECTORY, ND_FAMILY, ND_ROUTES } from "./nd-declared-binding.mjs";

const root = process.env.RCAP_TEST_ROOT ?? process.cwd();
const read = relative => JSON.parse(fs.readFileSync(`${root}/${relative}`, "utf8"));
const hashFile = relative => crypto.createHash("sha256").update(fs.readFileSync(`${root}/${relative}`)).digest("hex");
const masterFamily = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json").families
  .find(row => row.familyId === ND_FAMILY);
const raster = read("data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json").rows
  .find(row => row.familyId === ND_FAMILY);
const original = {
  record: read(`${ND_DIRECTORY}/product-wiring.json`),
  family: masterFamily,
  report: read(`${ND_DIRECTORY}/reports/rendered-artifacts.json`),
  sourceReceipt: read(`${ND_DIRECTORY}/source-receipt.json`),
  fieldMap: read(`${ND_DIRECTORY}/production-field-map.json`),
  raster,
};
const fixture = () => structuredClone(original);
const apply = value => bindDeclaredNdDelivery(value.record, value.family, {
  report: value.report,
  sourceReceipt: value.sourceReceipt,
  fieldMap: value.fieldMap,
  raster: value.raster,
  hashFile: value.hashFile ?? hashFile,
});

test("binds the measured four-component ND packet, current raster, and historical VF09 verdict", () => {
  const frozen = JSON.stringify(original);
  const regression = fixture();
  regression.record.binding.lastIndependentVerification = {
    verdict: "PASS_COMPLETE_INDEPENDENT", lane: "vf09",
    verifiedAtBase: "7fcfb7d40aafe7bd7350fc735ea09d16524cb757",
  };
  delete regression.record.binding.supersededAcceptanceReceipt;
  delete regression.record.binding.supersededIndependentVerification;
  const output = apply(regression);
  assert.deepEqual(output.binding.instrumentKinds, ND_COMPONENTS);
  assert.deepEqual(output.binding.packetComponents.map(row => row.componentId), ND_COMPONENTS);
  assert.deepEqual(output.binding.packetComponents.map(row => row.order), [1, 2, 3, 4]);
  assert.equal(output.binding.packetComponents[0].condition, null);
  assert.match(output.binding.packetComponents[1].condition, /only AFTER the written request/);
  assert.match(output.binding.packetComponents[2].condition, /Travels with the enforcement motion only/);
  assert.equal(output.binding.packetComponents[3].condition, null);
  assert.equal(output.binding.acceptanceReceipt.workflowRunId, "34628970364");
  assert.equal(output.binding.acceptanceReceipt.boundToCanonicalSha256,
    "042abebbea6753740dab0b232722e76f715490cea12c634196fa6a337ad742a2");
  assert.equal(output.binding.lastIndependentVerification, null);
  assert.equal(output.binding.supersededIndependentVerification.lane, "vf09");
  assert.equal(output.binding.supersededIndependentVerification.verifiedAtBase,
    "7fcfb7d40aafe7bd7350fc735ea09d16524cb757");
  assert.match(output.binding.supersededIndependentVerification.supersededBecause, /changed both fixture PDFs/);
  assert.equal(output.binding.supersededAcceptanceReceipt.workflowRunId, "33579500812");
  assert.equal(output.proposedRepresentation.components[0].sha256, hashFile(`${ND_DIRECTORY}/fixtures/canonical.pdf`));
  assert.match(output.proposedRepresentation.note, /Current raster evidence is bound/);
  const again = fixture();
  again.record = output;
  assert.deepEqual(apply(again), output, "ND binding is not idempotent");
  assert.equal(JSON.stringify(original), frozen, "ND binding mutated its inputs");
});

test("leaves every unopted family byte-for-byte unchanged", () => {
  const unrelated = { familyId: "unrelated-family" };
  const record = { keep: { exactly: true } };
  assert.equal(bindDeclaredNdDelivery(record, unrelated, {}), record);
});

test("refuses mismatched route, component, byte, raster, governance, and current-verdict facts", () => {
  const cases = [
    ["wrong record family", value => { value.record.family = "other"; }],
    ["wrong family directory", value => { value.family.directory = "other"; }],
    ["missing route", value => { value.record.binding.routeKeys.pop(); }],
    ["foreign source route", value => { value.sourceReceipt.routeKeys = ["other"]; }],
    ["wrong report family", value => { value.report.familyId = "other"; }],
    ["missing component", value => { value.report.componentSet.pop(); }],
    ["wrong field-map order", value => { value.fieldMap.maps.reverse(); }],
    ["missing component page", value => { value.report.artifacts[0].pageManifest.pop(); }],
    ["corrupt artifact bytes", value => { value.hashFile = () => "0".repeat(64); }],
    ["missing current raster", value => { value.raster = null; }],
    ["wrong raster workflow", value => { value.raster.rasterReceipt.workflowRunId = "old"; }],
    ["partial raster", value => { value.raster.rasterReceipt.documentsNotCovered = ["boundary.pdf"]; }],
    ["altered carried raster identity", value => { value.record.binding.acceptanceReceipt.jobId = "wrong"; }],
    ["installed record", value => { value.record.status = "INSTALLED_RUNTIME"; }],
    ["generation enabled", value => { value.record.currentState.generationAllowed = true; }],
    ["payment enabled", value => { value.record.binding.paymentEligible = true; }],
    ["unknown current verdict", value => {
      value.record.binding.lastIndependentVerification = { verdict: "PASS", lane: "vf01", verifiedAtBase: "future" };
    }],
  ];
  let rejected = 0;
  for (const [name, mutate] of cases) {
    const value = fixture();
    mutate(value);
    assert.throws(() => apply(value), undefined, name);
    rejected++;
  }
  assert.equal(rejected, 17);
  assert.deepEqual(routeSet(masterFamily.routeKeys), routeSet(ND_ROUTES));
});

function routeSet(value) {
  return [...value].sort();
}
