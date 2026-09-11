#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FAMILY_ID,
  SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT,
  buildUtahSpecialCertificate,
  specialCertificateStageGate
} from "../build-census-v1-ut_pet_special_certificate-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FAMILY_DIR = path.join(ROOT, "data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const pdfSnapshot = () => Object.fromEntries(fs.readdirSync(FAMILY_DIR, { recursive: true })
  .filter((rel) => rel.endsWith(".pdf"))
  .sort()
  .map((rel) => { const file = path.join(FAMILY_DIR, rel); const stat = fs.statSync(file); return [rel, { sha256: sha256(fs.readFileSync(file)), size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs }]; }));
const base = () => structuredClone(SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT);

const invalid = [
  ["impossible issued June 31", (v) => { v.certificate.issuedAt = "2026-06-31"; }, "CERTIFICATE_DATES_REQUIRED"],
  ["impossible issued nonleap February 29", (v) => { v.certificate.issuedAt = "2025-02-29T00:00:00Z"; }, "CERTIFICATE_DATES_REQUIRED"],
  ["impossible expiry February 30", (v) => { v.certificate.expiresAt = "2027-02-30"; }, "CERTIFICATE_DATES_REQUIRED"],
  ["impossible asOf September 31", (v) => { v.asOf = "2026-09-31T00:00:00Z"; }, "INVALID_AS_OF"],
  ["null issued", (v) => { v.certificate.issuedAt = null; }, "CERTIFICATE_DATES_REQUIRED"],
  ["numeric expiry", (v) => { v.certificate.expiresAt = 1790000000000; }, "CERTIFICATE_DATES_REQUIRED"],
  ["object asOf", (v) => { v.asOf = {}; }, "INVALID_AS_OF"],
  ["invalid Date object asOf", (v) => { v.asOf = new Date(Number.NaN); }, "INVALID_AS_OF"],
  ["malformed issued", (v) => { v.certificate.issuedAt = "08/01/2026"; }, "CERTIFICATE_DATES_REQUIRED"],
  ["malformed expiry timestamp", (v) => { v.certificate.expiresAt = "2027-01-28T25:00:00Z"; }, "CERTIFICATE_DATES_REQUIRED"],
  ["malformed asOf", (v) => { v.asOf = "2026-9-11"; }, "INVALID_AS_OF"]
];

const valid = [
  ["existing UTC timestamps", base()],
  ["date-only leap day", (() => { const v = base(); v.certificate.issuedAt = "2024-02-29"; v.asOf = "2024-03-01"; v.certificate.expiresAt = "2024-08-27"; return v; })()],
  ["date-only nonleap February", (() => { const v = base(); v.certificate.issuedAt = "2025-02-28"; v.asOf = "2025-03-01"; v.certificate.expiresAt = "2025-08-27"; return v; })()],
  ["timestamp with offset", (() => { const v = base(); v.certificate.issuedAt = "2026-08-01T01:00:00+01:00"; v.asOf = "2026-09-11T01:00:00+01:00"; v.certificate.expiresAt = "2027-01-28T01:00:00+01:00"; return v; })()],
  ["Date objects", (() => { const v = base(); v.certificate.issuedAt = new Date("2026-08-01T00:00:00Z"); v.asOf = new Date("2026-09-11T00:00:00Z"); v.certificate.expiresAt = new Date("2027-01-28T00:00:00Z"); return v; })()],
  ["omitted asOf uses current Date", (() => { const v = base(); const now = Date.now(); delete v.asOf; v.certificate.issuedAt = new Date(now - 86400000).toISOString(); v.certificate.expiresAt = new Date(now + 86400000).toISOString(); return v; })()]
];

for (const [name, mutate, reason] of invalid) {
  const input = base(); mutate(input);
  assert.deepEqual(specialCertificateStageGate(input), { status: "REFUSE", reason }, name);
}
for (const [name, input] of valid) assert.equal(specialCertificateStageGate(input).status, "ALLOW_STAGE_2", name);

const mutators = ["mkdirSync", "writeFileSync", "appendFileSync", "renameSync", "unlinkSync", "rmSync", "copyFileSync"];
const originals = Object.fromEntries(mutators.map((name) => [name, fs[name]]));
const before = pdfSnapshot();
const wrapperResults = [];
for (const [name, input, expectedReason] of [
  ...invalid.map(([name, mutate, reason]) => { const input = base(); mutate(input); return [name, input, reason]; }),
  ...valid.map(([name, input]) => [name, input, null])
]) {
  let attemptedMutation = null;
  for (const method of mutators) fs[method] = (...args) => { attemptedMutation = { method, path: String(args[0]) }; throw new Error("CALENDAR_TEST_WRITE_BARRIER"); };
  let thrown;
  try { await buildUtahSpecialCertificate({ noRaster: true, stageInput: input }); }
  catch (error) { thrown = error; }
  finally { for (const method of mutators) fs[method] = originals[method]; }
  assert(thrown, `${name}: wrapper should stop at gate or mutation barrier`);
  if (expectedReason) {
    assert.equal(attemptedMutation, null, `${name}: invalid input reached a filesystem mutation`);
    assert.match(thrown.message, new RegExp(expectedReason), `${name}: actual wrapper refusal reason`);
  } else {
    assert.equal(thrown.message, "CALENDAR_TEST_WRITE_BARRIER", `${name}: valid input did not retain post-gate behavior`);
    assert.equal(attemptedMutation?.method, "mkdirSync", `${name}: valid input should reach the first write boundary`);
  }
  assert.deepEqual(pdfSnapshot(), before, `${name}: family PDFs or metadata changed`);
  wrapperResults.push({ name, expected: expectedReason ? "REFUSE_BEFORE_FIRST_MUTATION" : "ALLOW_TO_FIRST_MUTATION_BARRIER", result: "PASS" });
}

assert.equal(FAMILY_ID, "ut_pet_special_certificate-set");
console.log(JSON.stringify({ status: "PASS", invalidCases: invalid.length, validCases: valid.length,
  wrapperCases: wrapperResults.length, pdfsUnchanged: true, wrapperResults }));
