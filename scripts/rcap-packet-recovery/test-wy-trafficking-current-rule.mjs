#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { extractTextItems, groupIntoLines } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FAMILY = "composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708";
const BUILDER = "scripts/build-census-v1-composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708.mjs";
const OUT = "data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading";
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function treeDigest(relative) {
  const root = path.join(ROOT, relative);
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(`${path.relative(root, absolute)}\0${sha(fs.readFileSync(absolute))}`);
    }
  };
  visit(root);
  return sha(Buffer.from(files.join("\n")));
}

async function pdfText(relative) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return {
    bytes,
    pages: pdf.getPageCount(),
    text: pdf.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" ")).join(" ").replace(/\s+/g, " ")
  };
}

const build = JSON.parse(execFileSync(process.execPath, [BUILDER, "--no-raster"], {
  cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24
}));
assert.equal(build.familyId, FAMILY);
assert.equal(build.status, "COMPLETED");
assert.equal(build.nineCountersZero, true);
assert.equal(build.rasterState, "BUILT_RASTER_PENDING");
assert.deepEqual(build.components, [
  "wy-6-2-708-vacatur-primary-filing-1",
  "wy-6-2-708-vacatur-participant-declaration-2",
  "wy-6-2-708-vacatur-filing-instructions-3"
]);

const map = readJson(`${OUT}/production-field-map.json`);
const instructions = fs.readFileSync(path.join(ROOT, OUT, "participant-instructions.md"), "utf8");
const receipt = readJson(`${OUT}/source-receipt.json`);
const counters = readJson(`${OUT}/reports/completeness-counters.json`);
const approval = readJson(`${OUT}/approval-request.json`);
const canonical = await pdfText(`${OUT}/fixtures/canonical.pdf`);
const boundary = await pdfText(`${OUT}/fixtures/boundary.pdf`);
const allDeliveredText = `${canonical.text} ${boundary.text} ${instructions}`;

assert.match(allDeliveredText, /Motion to Vacate Conviction under W\.S\. (?:Sec\. |§ )?6-2-708\(c\)/i);
assert.doesNotMatch(allDeliveredText, /vacatur petition|case number, if the court assigns|petition signature/i);
assert.equal(map.routeSelectionsMade[0].instrument, "Motion to Vacate Conviction under W.S. § 6-2-708(c)");
assert.ok(map.componentSet.includes("wy-6-2-708-vacatur-participant-declaration-2"));

for (const field of ["original_criminal_court", "original_case_number"]) {
  for (const componentId of ["wy-6-2-708-vacatur-primary-filing-1", "wy-6-2-708-vacatur-participant-declaration-2"]) {
    const component = map.maps.find((row) => row.formNumber === componentId);
    assert.ok(component.canonicalWrites.some((row) => row.field.endsWith(`.${field}`)), `${componentId}.${field}: known fact was not prefilled`);
    const unknown = component.boundaryRefusals.find((row) => row.field.endsWith(`.${field}`));
    assert.equal(unknown?.requiredBeforeFiling, true, `${componentId}.${field}: unknown fact was not required before filing`);
  }
}
assert.match(canonical.text, /Example County District Court \(synthetic fixture\)/);
assert.match(canonical.text, /CR-EXAMPLE-2020-001 \(synthetic fixture\)/);
assert.doesNotMatch(boundary.text, /CR-EXAMPLE|Example County District Court/);
assert.match(instructions, /copy each from the court record and never infer it/i);
assert.match(instructions, /existing criminal case, never a future court-assigned number/i);

assert.match(allDeliveredText, /Participant Declaration in Support of Motion/i);
assert.match(allDeliveredText, /trafficking-victim status/i);
assert.match(allDeliveredText, /causal connection/i);
assert.match(allDeliveredText, /personal knowledge/i);
assert.match(allDeliveredText, /signature of declarant/i);
assert.match(allDeliveredText, /DATE .*SIGNATURE OF DECLARANT/i);
const declarationMap = map.maps.find((row) => row.formNumber === "wy-6-2-708-vacatur-participant-declaration-2");
assert.ok(declarationMap.canonicalRefusals.some((row) => row.field.endsWith(".declaration_signature_date")));
assert.doesNotMatch(allDeliveredText, /under penalty of perjury|notari[sz]|sworn before/i);
assert.match(allDeliveredText, /official (?:victim )?documentation creates a presumption/i);
assert.match(allDeliveredText, /absence (?:alone )?does not stop|absence does not stop/i);
assert.match(allDeliveredText, /alternative evidence/i);

assert.match(allDeliveredText, /serve the State\/prosecutor under W\.R\.Cr\.P\. 49/i);
assert.doesNotMatch(allDeliveredText, /No committed record .*who must be served/i);
assert.doesNotMatch(allDeliveredText, /within \d+ days?|hearing (?:must be|is) (?:set|held) within|certificate of service (?:is|required|must)/i);
assert.match(allDeliveredText, /review (?:every )?public cop(?:y|ies) and redact sensitive material/i);
assert.match(allDeliveredText, /original criminal court's Wyoming restricted-filing procedure where applicable/i);
assert.match(allDeliveredText, /does not automatically seal|not automatically sealed/i);

assert.equal(counters.allNineZero, true);
assert.ok(Object.values(counters.counters).every((value) => value === 0));
assert.deepEqual(approval.counselQuestionsRaised, []);
const decisionBinding = receipt.committedRecords.find((row) => row.recordId === "legal-decision:WY-TRAFFICKING-VACATUR-6-2-708C");
assert.equal(decisionBinding?.pathInRepository, "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json");
assert.equal(decisionBinding?.sha256, "5e3b6fb6bdeff849949d1d2c44d9b4e7badfdf6e7ba38be6135c388df176b1f2");

const beforeCheck = treeDigest(OUT);
const check = JSON.parse(execFileSync(process.execPath, [BUILDER, "--check"], {
  cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24
}));
const afterCheck = treeDigest(OUT);
assert.equal(check.status, "CHECK_ONLY");
assert.equal(beforeCheck, afterCheck, "--check changed family output bytes");

console.log(JSON.stringify({
  status: "WY_TRAFFICKING_CURRENT_RULE_OK",
  familyId: FAMILY,
  components: map.componentSet,
  canonical: { sha256: sha(canonical.bytes), pages: canonical.pages },
  boundary: { sha256: sha(boundary.bytes), pages: boundary.pages },
  requiredBeforeFilingCount: map.requiredBeforeFilingCount,
  counters: counters.counters,
  checkOnlyTreeSha256: beforeCheck,
  independentApprovalGranted: false,
  freshRasterRequired: true
}, null, 2));
