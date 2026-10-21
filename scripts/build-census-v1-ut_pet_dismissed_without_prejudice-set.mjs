#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const familyId = "ut_pet_dismissed_without_prejudice-set";
const out = "data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill";

function abs(relativePath) {
  return path.join(rootDir, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(abs(relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  fs.writeFileSync(abs(relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function isContradictoryRefusal(formNumber, row) {
  return (formNumber === "UT-BCI-EXP-APPLICATION"
      && row.field === "MAILING ADDRESS"
      && row.approvedBlankDisposition === "REQUIRED_BEFORE_FILING")
    || (formNumber === "1020EX"
      && row.field === "Email"
      && row.approvedBlankDisposition === "OPTIONAL_PARTICIPANT_CONTENT");
}

function removeContradictoryDispositions() {
  const file = `${out}/production-field-map.json`;
  const map = readJson(file);
  assert.equal(map.familyId, familyId);
  let removed = 0;
  for (const form of map.maps) {
    const before = form.roleRefusals.length;
    form.roleRefusals = form.roleRefusals.filter((row) => !isContradictoryRefusal(form.formNumber, row));
    removed += before - form.roleRefusals.length;
  }
  assert.ok(removed === 0 || removed === 2, `expected zero or two contradictory dispositions, removed ${removed}`);
  if (removed > 0) writeJson(file, map);
}

function assertFix13Repair() {
  const map = readJson(`${out}/production-field-map.json`);
  const contradictions = map.maps.flatMap((form) => form.roleRefusals
    .filter((row) => isContradictoryRefusal(form.formNumber, row))
    .map((row) => ({ formNumber: form.formNumber, row })));
  assert.deepEqual(contradictions, [], "contradictory field-map dispositions remain");

  const emailMap = map.maps.find((form) => form.formNumber === "1020EX");
  const mailingMap = map.maps.find((form) => form.formNumber === "UT-BCI-EXP-APPLICATION");
  for (const [form, field] of [[emailMap, "Email"], [mailingMap, "MAILING ADDRESS"]]) {
    assert.ok(form, `${field}: form map is absent`);
    assert.ok(form.canonicalWrites.some((row) => row.field === field), `${field}: canonical write was removed`);
    assert.ok(form.boundaryWrites.some((row) => row.field === field), `${field}: boundary write was removed`);
  }

  const rendered = readJson(`${out}/reports/rendered-artifacts.json`);
  for (const artifact of rendered.artifacts) {
    const pdfBytes = fs.readFileSync(abs(artifact.file));
    assert.equal(sha256(pdfBytes), artifact.sha256, `${artifact.file}: PDF hash differs from its artifact record`);
    assert.equal(pdfBytes.length, artifact.byteLength, `${artifact.file}: PDF length differs from its artifact record`);
    for (const page of artifact.rasterPages) {
      const rasterBytes = fs.readFileSync(abs(page.file));
      assert.equal(sha256(rasterBytes), page.sha256, `${page.file}: raster hash differs from its receipt`);
      assert.equal(rasterBytes.length, page.byteLength, `${page.file}: raster length differs from its receipt`);
    }
  }
}

const args = process.argv.slice(2);
process.chdir(rootDir);
if (args.includes("--assert-fix13")) {
  assertFix13Repair();
  console.log(`${familyId}: FIX13 focused assertions complete; independent verification pending`);
} else {
  if (!args.includes("--repair-only")) {
    const { runUtahCompletenessRepair } = await import("./build-census-v1-ut_pet_acquittal-set.mjs");
    await runUtahCompletenessRepair(familyId, args.filter((arg) => arg !== "--repair-only"));
  }
  removeContradictoryDispositions();
  assertFix13Repair();
  console.log(`${familyId}: FIX13 field-map repair built; PDF and raster receipts preserved; independent verification pending`);
}
