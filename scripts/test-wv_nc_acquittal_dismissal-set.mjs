#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { runFamily, OUT_REL, SOURCE, PF08_RETURN_REL, FAMILY_ID } from "./build-census-v1-wv_nc_acquittal_dismissal-set.mjs";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const root = path.resolve(new URL("..", import.meta.url).pathname);
const absolute = (relative) => path.join(root, relative);
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const read = (relative) => fs.readFileSync(absolute(relative));
const pdfText = async (relative) => {
  const document = await PDFDocument.load(read(relative), { updateMetadata: false });
  return {
    pages: document.getPageCount(),
    text: document.getPages().map((page) =>
      groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" ")
    ).join(" ")
  };
};
const fixture = (name) => OUT_REL + "/fixtures/" + name;
const artifactFiles = [
  fixture("dismissal-canonical.pdf"),
  fixture("dismissal-boundary.pdf"),
  fixture("acquittal-canonical.pdf"),
  fixture("acquittal-boundary.pdf")
];

const first = await runFamily(["--no-raster"]);
assert.equal(first.status, "COMPLETED");
assert.equal(first.counters.result, "PASS_COMPLETE");
assert.equal(first.outputCheck.ok, true);

const map = JSON.parse(read(OUT_REL + "/production-field-map.json"));
assert.deepEqual(map.branchSet, ["DISMISSED_STRAIGHT", "ACQUITTED_OR_FOUND_NOT_GUILTY"]);
assert.equal(map.maps.length, 4);
const dismissalMaps = map.maps.filter((row) => row.branchId === "DISMISSED_STRAIGHT");
assert.equal(dismissalMaps.length, 2);
assert.ok(dismissalMaps.every((row) => row.canonicalWrites.length === 0));
assert.ok(dismissalMaps.every((row) => row.documentPolicy.sourceBytesDeliveredUnmodified === true));
const acquittalMap = map.maps.find((row) => row.branchId === "ACQUITTED_OR_FOUND_NOT_GUILTY");
assert.ok(acquittalMap);
assert.deepEqual(acquittalMap.canonicalWrites.map((row) => row.factId), [
  "participant.full_legal_name",
  "participant.date_of_birth",
  "participant.street_address",
  "participant.phone",
  "participant.email"
]);
assert.equal(acquittalMap.officialSource, null);
assert.ok(acquittalMap.explicitMappings.sourceBoundary.includes("SCA-C903 is excluded"));
const scheduleRows = acquittalMap.canonicalRefusals.filter((row) => /\.charge_[1-8]_(actual|disposition)$/.test(row.field));
assert.equal(scheduleRows.length, 16);
assert.ok(scheduleRows.every((row) => row.page === 2));
assert.equal(new Set(scheduleRows.map((row) => row.field.replace(/_(actual|disposition)$/, ""))).size, 8);
const allRows = map.maps.flatMap((row) => row.canonicalRefusals);
assert.ok(allRows.some((row) => row.field.endsWith("judge_signature")));
assert.ok(allRows.some((row) => row.field.endsWith("hearing_date")));
assert.ok(allRows.some((row) => row.field.endsWith("petitioner_signature")));
assert.ok(allRows.filter((row) => row.completenessDisposition === "REQUIRED_BEFORE_FILING")
  .every((row) => row.determinedByTheCaseNotTheRoute === true));

const instructions = read(OUT_REL + "/participant-instructions.md").toString("utf8").toLowerCase();
for (const required of [
  "certified copy of the acquittal order",
  "circuit court",
  "60 days",
  "county prosecuting attorney",
  "arresting or charging agency",
  "prior felony",
  "statutory exclusion",
  "same transaction or occurrence",
  "pretrial diversion",
  "deferred adjudication",
  "never map an acquittal to a dismissal form"
]) assert.ok(instructions.includes(required), "missing instruction obligation: " + required);
assert.doesNotMatch(instructions, /\{\{|\}\}/);

for (const file of artifactFiles) {
  assert.ok(fs.existsSync(absolute(file)), "missing artifact " + file);
}
for (const file of [fixture("dismissal-canonical.pdf"), fixture("dismissal-boundary.pdf")]) {
  const bytes = read(file);
  assert.equal(digest(bytes), SOURCE.expectedSha256);
  assert.equal(bytes.length, SOURCE.expectedByteLength);
}
for (const [file, expectedName] of [
  [fixture("acquittal-canonical.pdf"), "Jordan Avery Reyes"],
  [fixture("acquittal-boundary.pdf"), "Maria-Alejandra O'Shaughnessy-Whitfield"]
]) {
  const output = await pdfText(file);
  assert.ok(output.pages >= 3);
  assert.ok(output.text.includes(expectedName));
  assert.match(output.text, /found not guilty/i);
  assert.doesNotMatch(output.text, /dismiss/i);
  assert.doesNotMatch(output.text, /\{\{|\}\}/);
}

const before = Object.fromEntries([
  ...artifactFiles,
  OUT_REL + "/participant-instructions.md",
  OUT_REL + "/production-field-map.json",
  OUT_REL + "/reports/completeness-counters.json"
].map((file) => [file, digest(read(file))]));
const second = await runFamily(["--no-raster"]);
assert.equal(second.status, "COMPLETED");
for (const [file, expected] of Object.entries(before)) {
  assert.equal(digest(read(file)), expected, "non-deterministic output: " + file);
}

const returned = JSON.parse(read(PF08_RETURN_REL));
assert.equal(returned.familyId ?? returned.rows?.[0]?.familyId, FAMILY_ID);
assert.equal(returned.rows[0].status, "COMPLETED");
assert.equal(returned.rows[0].selfVerified, false);
assert.match(returned.rows[0].independentVerification, /PENDING/);
assert.equal(returned.rows[0].visualReview.measured, false);
console.log(JSON.stringify({
  test: "wv_nc_acquittal_dismissal-set",
  status: "PASS",
  completeness: first.counters.result,
  requiredBeforeFiling: map.requiredBeforeFilingCount,
  artifacts: artifactFiles.length,
  deterministic: true,
  rasterDispatched: false,
  selfApproved: false
}, null, 2));
