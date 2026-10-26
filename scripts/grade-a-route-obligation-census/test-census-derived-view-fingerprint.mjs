#!/usr/bin/env node
// The derived fulfillment-authority views enter the census fingerprint as the fields the census reads.
// This proves (1) every field buildOutputs() actually reads from them is inside that projection, (2) the
// bookkeeping a proof re-bind rewrites does not move it, (3) a read field does, and (4) the independent
// verifier computes the same fingerprint. Read-only: the traced copy lives in a temp file that is removed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DERIVED_VIEW_PROJECTIONS } from "./generate-national-route-obligation-census.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "../..");
const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";
const PROJECTION = "data/rcap-grade-a/fulfillment-authority-projection.json";
const SNAPSHOT = "data/rcap-grade-a/fulfillment-observation-snapshot.json";
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const projected = (file, doc) => JSON.stringify(DERIVED_VIEW_PROJECTIONS[file](doc));

// (1) Trace the real reads.
const source = fs.readFileSync(path.join(DIR, "generate-national-route-obligation-census.mjs"), "utf8");
const traced = path.join(DIR, `.trace-${process.pid}.mjs`);
const seen = new Set();
globalThis.__censusViewTrace = (value, label) => {
  const wrap = (v, at) => (v && typeof v === "object") ? new Proxy(v, { get(t, k, r) {
    const x = Reflect.get(t, k, r);
    if (typeof k === "symbol" || typeof x === "function" || k === "length") return x;
    const next = Array.isArray(t) && /^\d+$/.test(k) ? `${at}[]` : `${at}.${k}`;
    seen.add(next);
    return wrap(x, next);
  } }) : v;
  return wrap(value, label);
};
let copy = source;
for (const [name, file] of [["gradeARegistry", REGISTRY], ["gradeASnapshot", SNAPSHOT], ["gradeAProjection", PROJECTION]]) {
  const at = `${name}: readJson("${file}"),`;
  assert.equal(copy.split(at).length, 2, `the generator no longer loads ${name} as ${at}`);
  copy = copy.replace(at, `${name}: globalThis.__censusViewTrace(readJson("${file}"), "${name}"),`);
}
fs.writeFileSync(traced, copy);
try { (await import(pathToFileURL(traced).href)).buildOutputs(); } finally { fs.rmSync(traced, { force: true }); }
const TEXT_TESTED = /^gradeARegistry\.records\[\]\.(outputLegalApproval|finalVerification)(\.|\[|$)/;
const COVERED = new Set([
  "gradeARegistry.records", "gradeARegistry.records[]",
  ...["recordId", "jurisdiction", "pathwayId", "serviceDisposition", "fixture", "fixture.fixtureId", "fixture.sha256",
    "artifactValidation", "artifactValidation.artifactSha256", "packetCompleteness", "packetCompleteness.specificationId",
    "packetCompleteness.specificationSha256", "packetCompleteness.filingFormatArtifact", "packetCompleteness.filingFormatArtifact.sha256",
    "packetCompleteness.companionArtifacts", "packetCompleteness.companionArtifacts[]", "packetCompleteness.companionArtifacts[].componentId",
    "packetCompleteness.companionArtifacts[].sha256"].map((f) => `gradeARegistry.records[].${f}`),
  "gradeAProjection.routes", "gradeAProjection.routes[]",
  ...["routeId", "state", "commercialStatus", "missingProof", "missingProof[]"].map((f) => `gradeAProjection.routes[].${f}`)
]);
const outside = [...seen].filter((p) => !COVERED.has(p) && !TEXT_TESTED.test(p)).sort();
assert.deepEqual(outside, [], `the census reads derived-view fields the fingerprint projection does not cover: ${outside.join(", ")}`);
assert.ok(seen.has("gradeAProjection.routes[].state") && seen.has("gradeARegistry.records[].serviceDisposition"), "the trace observed no reads");

// (2) What a proof re-bind rewrites does not move it.
const registry = read(REGISTRY), projection = read(PROJECTION), snapshot = read(SNAPSHOT);
const bookkeeping = structuredClone(registry);
for (const r of bookkeeping.records) {
  r.history = [...(r.history ?? []), { at: "2099-01-01" }]; r.version = "bookkeeping"; r.evidenceBindings = { moved: "x".repeat(64) };
  if (r.finalVerification) { r.finalVerification.verifiedAt = "2099-01-01T00:00:00Z"; r.finalVerification.boundInputsSha256 = "0".repeat(64); }
  if (r.visualReview) r.visualReview.evidenceSha256 = "1".repeat(64);
}
assert.equal(projected(REGISTRY, bookkeeping), projected(REGISTRY, registry));
const projectionMoved = structuredClone(projection); for (const r of projectionMoved.routes) r.recordVersion = "bookkeeping";
assert.equal(projected(PROJECTION, projectionMoved), projected(PROJECTION, projection));
assert.equal(projected(SNAPSHOT, { anything: "changed" }), projected(SNAPSHOT, snapshot));

// (3) A field the census reads does move it.
for (const change of [(d) => { d.records[0].serviceDisposition = "changed"; }, (d) => { d.records[0].recordId = "changed"; },
  (d) => { d.records[0].outputLegalApproval = d.records[0].outputLegalApproval ? null : { status: "approved" }; }]) {
  const next = structuredClone(registry); change(next); assert.notEqual(projected(REGISTRY, next), projected(REGISTRY, registry));
}
// Every covered field, wherever a record carries it, must move the projection, so COVERED cannot list a
// field the projection silently drops.
const leaves = (prefix) => [...COVERED].filter((p) => p.startsWith(prefix) && ![...COVERED].some((q) => q !== p && q.startsWith(`${p}.`) || q === `${p}[]`)).map((p) => p.slice(prefix.length));
const setAt = (obj, parts) => {
  const [head, ...rest] = parts;
  if (head.endsWith("[]")) { const list = obj?.[head.slice(0, -2)]; if (!Array.isArray(list) || !list.length) return false; if (rest.length) return setAt(list[0], rest); list[0] = `changed-${head}`; return true; }
  if (!rest.length) { if (obj?.[head] === undefined || obj?.[head] === null) return false; obj[head] = `changed-${head}`; return true; }
  return obj?.[head] && typeof obj[head] === "object" ? setAt(obj[head], rest) : false;
};
for (const [file, doc, prefix, list] of [[REGISTRY, registry, "gradeARegistry.records[].", "records"], [PROJECTION, projection, "gradeAProjection.routes[].", "routes"]]) {
  for (const leaf of leaves(prefix)) {
    const next = structuredClone(doc);
    const hit = next[list].some((row) => setAt(row, leaf.split(".")));
    assert.ok(hit, `no ${list} entry carries ${leaf}, so its coverage is untested`);
    assert.notEqual(projected(file, next), projected(file, doc), `the projection ignores the read field ${leaf}`);
  }
}

// (4) The independent verifier agrees.
const { loadVerificationContext, collectFailures } = await import("./verify-national-route-obligation-census.mjs");
const disagreement = collectFailures(loadVerificationContext()).filter((f) => /independent source fingerprint/.test(f));
assert.deepEqual(disagreement, []);
console.log(JSON.stringify({ status: "PASS", tracedReads: seen.size, outsideProjection: 0 }));
