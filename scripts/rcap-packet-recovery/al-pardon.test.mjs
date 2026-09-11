#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { flattenedWidgets, drawnAt } from "../rcap-official-forms/pdf-flattened-widgets.mjs";
import { build, OUT_REL, SOURCE } from "../build-census-v1-al-pardon-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const out = path.join(ROOT, OUT_REL);
const census = JSON.parse(fs.readFileSync(path.join(out, "field-census.census-v1.json"), "utf8"));
const map = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));

assert.deepEqual((await build({ check: true })).status, "CHECK_PASS");
assert.equal(census.fields.length, 30);
assert.equal(census.widgetCount, 31);
assert.equal(new Set(census.fields.map((f) => f.name)).size, 30);
assert.equal(census.fields.find((f) => f.name === "Date").widgets.length, 2);
assert.deepEqual(map.writes.map((w) => w.field).sort(), ["DOB", "Email", "Pardon", "Phone", "Print Name 1"].sort());

const expected = {
  canonical: { Email: "jordan.reyes@example.org", Phone: "(334) 555-0142", DOB: "04/17/1991", "Print Name 1": "Jordan Avery Reyes" },
  boundary: { Email: "alexandrina.montgomery-vandenberg@example.org", Phone: "+1 (205) 555-0199 ext. 204", DOB: "12/31/1960", "Print Name 1": "Alexandrina-Katharine Montgomery-Vandenberg III" }
};
for (const fixture of Object.keys(expected)) {
  const file = path.join(out, "fixtures", `${fixture}.pdf`);
  const before = sha256(fs.readFileSync(file));
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  assert.equal(doc.getPageCount(), 4, `${fixture} preserves all four official pages`);
  assert.equal(doc.getForm().getFields().length, 0, `${fixture} is flattened`);
  const appearances = await flattenedWidgets(file);
  for (const [fieldName, value] of Object.entries(expected[fixture])) {
    const field = census.fields.find((f) => f.name === fieldName);
    assert(drawnAt(appearances, field.widgets[0]).some((a) => a.text === value), `${fixture} reads ${fieldName} from output bytes`);
  }
  const pardon = census.fields.find((f) => f.name === "Pardon");
  assert(drawnAt(appearances, pardon.widgets[0]).some((a) => a.text === "4"), `${fixture} marks PARDON`);
  for (const fieldName of ["Remission of Fines", "Both", "Application received on", "Tracking Number", "Signature", "Signature 1", "Print Name", "Yes", "No"] ) {
    const field = census.fields.find((f) => f.name === fieldName);
    assert(!field.widgets.flatMap((w) => drawnAt(appearances, w)).some((a) => a.text.trim()), `${fixture} leaves ${fieldName} blank`);
  }
  const date = census.fields.find((f) => f.name === "Date");
  assert(!date.widgets.flatMap((w) => drawnAt(appearances, w)).some((a) => a.text.trim()), `${fixture} leaves both shared Date widgets blank`);
  assert.equal(sha256(fs.readFileSync(file)), before);
}

const wrong = fs.mkdtempSync(path.join(os.tmpdir(), "al-pardon-wrong-source-"));
fs.mkdirSync(path.join(wrong, "LegalEase Alabama"), { recursive: true });
fs.writeFileSync(path.join(wrong, SOURCE.relativePath), Buffer.from("not ABPP-3"));
const rejected = spawnSync(process.execPath, ["scripts/build-census-v1-al-pardon-set.mjs", "--check"], {
  cwd: ROOT, env: { ...process.env, MASTER_LIBRARY_SOURCE_DIR: wrong }, encoding: "utf8"
});
assert.notEqual(rejected.status, 0, "source mismatch must reject");
assert.match(rejected.stderr, /source drift/);
fs.rmSync(wrong, { recursive: true, force: true });

console.log("PASS al-pardon: exact-source guard, 30-field census, canonical/boundary prefill, route election, shared-date and protected blanks");
