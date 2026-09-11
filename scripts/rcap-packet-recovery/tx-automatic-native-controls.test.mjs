#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  FAMILY_ID, OUT_REL, FIXTURES, assertSourceIdentity,
  assertAppearanceMatches, refusedInkFinding, nativeGroup10Derivative, verifyBuiltOutputs, runFamily
} from "../build-census-v1-tx_nd_automatic_misdemeanor_deferred-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray } = require("pdf-lib");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const statementPath = path.join(ROOT, "private/human-source-returns/TX/TX__STATEMENTOFINABILITYTOAFFORDPAYMENTOFCOURTCOSTSO.pdf");
const orderPath = path.join(ROOT, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/TX/02_PACKET_FORMS/TX__FORM__TX-GC-411.072__order-of-nondisclosure-under-411-072__REV-2022-02__EN.pdf");
const statementBytes = fs.readFileSync(statementPath);

assert.equal(FAMILY_ID, "tx_nd_automatic_misdemeanor_deferred-set");
assert.equal(assertSourceIdentity(statementBytes, "bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d"),
  "bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d");
assert.throws(() => assertSourceIdentity(Buffer.concat([statementBytes, Buffer.from("drift")]),
  "bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d"), /source drift/);

const native = await nativeGroup10Derivative(statementBytes, FIXTURES.canonical);
assert.deepEqual(native.appearances.filter((r) => r.selected).map((r) => [r.page, r.state]), [[3, "Choice2"], [9, "Choice3"]]);
assert.deepEqual(native.appearances.map((r) => r.rect), [
  { x: 74.6448, y: 304.077, width: 18, height: 18 },
  { x: 74.6448, y: 135.653, width: 18, height: 18 },
  { x: 90.8819, y: 316.952, width: 18.0001, height: 18 },
  { x: 90.4577, y: 288.505, width: 18.0003, height: 18 }
]);
assert.equal(new Set(native.appearances.filter((r) => r.selected).map((r) => r.sourceAppearanceSha256)).size, 1,
  "both selected appearances are the same source-authored checked state");
const nativeDoc = await PDFDocument.load(native.bytes, { updateMetadata: false });
assert.equal(nativeDoc.getForm().getFields().length, 131, "only the flattened Group10 parent leaves the form tree");
for (const facts of [
  { ...FIXTURES.canonical, "matter.represented_by_legal_aid": null },
  { ...FIXTURES.canonical, "matter.cannot_afford_court_costs": undefined },
  { ...FIXTURES.canonical, "matter.cannot_afford_court_costs": false }
]) await assert.rejects(() => nativeGroup10Derivative(statementBytes, facts));
const represented = await nativeGroup10Derivative(statementBytes, { ...FIXTURES.canonical, "matter.represented_by_legal_aid": true });
assert.deepEqual(represented.appearances.filter((r) => r.selected).map((r) => r.state), ["Choice1", "Choice3"],
  "legal-aid answer changes independently while inability answer stays selected");
assertAppearanceMatches({ field: "text", expectedText: "held fact", observedText: "held fact" });
assert.throws(() => assertAppearanceMatches({ field: "text", expectedText: "held fact", observedText: "wrong value" }), /disagrees/);
assertAppearanceMatches({ field: "selection", expectedSha256: "authored-on", observedSha256: "authored-on" });
assert.throws(() => assertAppearanceMatches({ field: "selection", expectedSha256: "authored-on", observedSha256: "different-ap" }),
  /expected source-authored appearance/);
assert.equal(refusedInkFinding({ field: "signature", observedText: "" }), null);
assert.ok(refusedInkFinding({ field: "signature", observedText: "Jordan Avery" }), "protected text ink must be detected");
assert.equal(refusedInkFinding({ field: "choice", selection: true, selectedMarkPresent: false }), null);
assert.ok(refusedInkFinding({ field: "choice", selection: true, selectedMarkPresent: true }),
  "protected selection ink must be detected");
for (const facts of [
  { ...FIXTURES.boundary, "matter.discharge_dismissal_date": "02/30/2018" },
  { ...FIXTURES.boundary, "matter.discharge_dismissal_date": "02/27/2018" },
  { ...FIXTURES.boundary, "matter.placement_date": "09/31/2017" },
  { ...FIXTURES.boundary, "participant.date_of_birth": "1993-02-29" }
]) await assert.rejects(() => nativeGroup10Derivative(statementBytes, facts));
await nativeGroup10Derivative(statementBytes, FIXTURES.boundary);

const check = await runFamily(["--check", "--no-raster"]);
assert.equal(check.status, "CHECK_ONLY");
assert.equal(check.boundSources, 3);
assert.deepEqual(check.fields.map((r) => r.actual), [25, 0, 132]);

const first = await runFamily(["--no-raster"]);
const firstHashes = first.artifactHashes.map((r) => r.packetSha256);
const second = await runFamily(["--no-raster"]);
assert.deepEqual(second.artifactHashes.map((r) => r.packetSha256), firstHashes, "build must be deterministic");
assert.ok(second.artifactHashes.every((r) => r.pages === 22));
assert.deepEqual(await verifyBuiltOutputs(path.join(ROOT, OUT_REL)),
  { artifactsVerified: 2, mapsVerified: true, sourceReceiptVerified: true });
const canonicalPath = path.join(ROOT, OUT_REL, "fixtures/canonical.pdf");
const boundaryPath = path.join(ROOT, OUT_REL, "fixtures/boundary.pdf");
const beforeInvalid = [canonicalPath, boundaryPath].map((file) => sha256(fs.readFileSync(file)));
await assert.rejects(() => runFamily(["--no-raster"], { fixtures: {
  canonical: { ...FIXTURES.canonical, "matter.represented_by_legal_aid": "unknown" }, boundary: FIXTURES.boundary
} }));
await assert.rejects(() => runFamily(["--no-raster"], { fixtures: {
  canonical: FIXTURES.canonical, boundary: { ...FIXTURES.boundary, "matter.discharge_dismissal_date": "02/27/2018" }
} }));
assert.deepEqual([canonicalPath, boundaryPath].map((file) => sha256(fs.readFileSync(file))), beforeInvalid,
  "invalid facts and impossible chronology refuse before writing either artifact");

const incomplete = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "rcap-tx072-check-"));
try {
  fs.mkdirSync(path.join(incomplete, "reports"), { recursive: true });
  fs.mkdirSync(path.join(incomplete, "fixtures"), { recursive: true });
  for (const rel of ["reports/rendered-artifacts.json", "source-receipt.json"])
    fs.copyFileSync(path.join(ROOT, OUT_REL, rel), path.join(incomplete, rel));
  fs.copyFileSync(path.join(ROOT, OUT_REL, "fixtures/canonical.pdf"), path.join(incomplete, "fixtures/canonical.pdf"));
  await assert.rejects(() => verifyBuiltOutputs(incomplete), /production-field-map\.json/);
  fs.copyFileSync(path.join(ROOT, OUT_REL, "production-field-map.json"), path.join(incomplete, "production-field-map.json"));
  await assert.rejects(() => verifyBuiltOutputs(incomplete), /boundary PDF missing/);
} finally { fs.rmSync(incomplete, { recursive: true, force: true }); }

const map = JSON.parse(fs.readFileSync(path.join(ROOT, OUT_REL, "production-field-map.json")));
assert.deepEqual(map.componentSet, [
  "tx_nd_automatic_misdemeanor_deferred-recovery-letter-2",
  "tx_nd_automatic_misdemeanor_deferred-proposed-order-3",
  "tx_nd_automatic_misdemeanor_deferred-fee-waiver-statement-4"
]);
assert.deepEqual(map.group10NativeAppearancePolicy,
  { parentField: "Group10", radioStructureEdited: false, synthesizedMarks: 0, outsideControlMarks: 0,
    treatment: "each original widget is flattened from its own source-authored /AP/N state at its original /Rect" });
const actual = JSON.parse(fs.readFileSync(path.join(ROOT, OUT_REL, "reports/actual-writes.json")));
for (const fixture of actual.documents) {
  assert.deepEqual(fixture.nativeGroup10Selections.map((r) => r.state), ["Choice2", "Choice3"]);
  assert.deepEqual(fixture.protectedSourceDefaultsCleared.map((r) => [r.field, r.cleared]).sort(), [
    ["Amount Cantidad 15", "0"], ["Today", "12/15/2022"], ["Value / Valor 11", "0"]
  ]);
  assert.equal(fixture.refusedFieldsWithInk.length, 0);
}

const packet = await PDFDocument.load(fs.readFileSync(canonicalPath), { updateMetadata: false });
assert.equal(packet.getPageCount(), 22);
assert.equal(packet.getForm().getFields().length, 0, "the participant artifact is flattened");
const streamDigests = (doc, indexes) => indexes.flatMap((index) => {
  const contents = doc.getPages()[index].node.Contents();
  const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
  return refs.map((ref) => sha256(Buffer.from(doc.context.lookup(ref).contents)));
});
const order = await PDFDocument.load(fs.readFileSync(orderPath), { updateMetadata: false });
assert.deepEqual(streamDigests(packet, [7, 8, 9]), streamDigests(order, [0, 1, 2]),
  "all proposed-order page content streams remain the exact source streams");

const status = JSON.parse(fs.readFileSync(path.join(ROOT, OUT_REL, "build-status.json")));
assert.equal(status.rasterState, "BUILT_RASTER_PENDING");
assert.equal(status.selfVerified, false);
assert.equal(status.generationAllowed, false);
const instructions = fs.readFileSync(path.join(ROOT, OUT_REL, "participant-instructions.md"), "utf8");
assert.match(instructions, /Each selection comes from the participant's supplied answer/);
assert.doesNotMatch(instructions, /not represented by Legal Aid/i);
console.log("PASS tx automatic native controls: exact values and source-authored APs, measured refused ink, strict dates, required check artifacts, protected order, deterministic packets, and fail-closed facts");
