#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  AL_C10_RELIEF_OPTIONS, AL_C10_RELIEF_TITLE, AL_CR65_OATH_SOURCE
} from "./rcap-official-forms/alabama-participant-handback.mjs";
import {
  assertPrintedSourceInkSurvives, measurePrintedSourceInkSurvival
} from "./rcap-official-forms/printed-source-ink-survival.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, rgb } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/warp-20260912/al-clerk-caption-six/guidance-ink-repair");
const CHANGED = ["al-diversion-set", "al-misd-conviction-set", "al-misd-dwop-set"];
const ALL = [...CHANGED, "al-pardoned-felony-set", "al-felony-dwop-set", "al-felony-nonconviction-90-set"];
const UNCHANGED = {
  "al-pardoned-felony-set": ["8601a417905d050ef455cb6344da98462f86d5978ac93a8f5938436f64a82982", "e557b7577b05d76a72f397a01c0e9dce5d1de191bc67023fc2551af6aa31300e"],
  "al-felony-dwop-set": ["77f6fb0c16f67919bf70dd313e9fe37440a13fb14a45ff468a20b9948d9fc2f2", "ee75749847d352ab3eaf51da70a08d6b22e86aa1a972cc32b22a88eabcefd95c"],
  "al-felony-nonconviction-90-set": ["40eccc47f8c05a9ce44f467e29e6239a27bfda884c66301b68b4e81b81342b8c", "0f867cd52916aec34559b7ec514e064167130c50dc7679d588462c22fc5b7e86"]
};
const SOURCE = {
  cr65: path.join(ROOT, "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf"),
  c10: path.join(ROOT, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf")
};
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
let assertions = 0;
const ok = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const eq = (actual, expected, message) => { assertions += 1; assert.equal(actual, expected, message); };

fs.mkdirSync(EVIDENCE, { recursive: true });
eq(sha(fs.readFileSync(SOURCE.cr65)), "c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39", "bound CR-65 source hash");
eq(sha(fs.readFileSync(SOURCE.c10)), "527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8", "bound C-10 source hash");

for (const familyId of ALL) {
  const out = path.join(ROOT, `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill`);
  const guide = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const filing = fs.readFileSync(path.join(out, "filing-instructions.md"), "utf8");
  const map = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const written = new Set(map.writes.map((row) => row.fieldId));
  ok(guide.includes(AL_CR65_OATH_SOURCE.text), `${familyId}: exact printed oath requirement`);
  ok(guide.includes("CR-65 Rev. 10/2024, page 8 instructions for PAGE 6"), `${familyId}: oath provenance`);
  ok(filing.includes(AL_CR65_OATH_SOURCE.text), `${familyId}: filing guide oath requirement`);
  ok(!/ask the circuit clerk.*whether.*requires/is.test(guide), `${familyId}: no stale oath uncertainty`);
  ok(guide.includes(`## ${AL_C10_RELIEF_TITLE}`), `${familyId}: fee-election handback`);
  for (const option of AL_C10_RELIEF_OPTIONS) {
    const row = map.refusals.find((candidate) => candidate.fieldId === option.fieldId);
    ok(row?.disclosedToParticipant, `${familyId}: ${option.fieldId} classified and disclosed`);
    ok(!written.has(option.fieldId), `${familyId}: ${option.fieldId} not fabricated`);
  }
  ok(written.has("C-10-CRIMINAL:Check Box1.0"), `${familyId}: State branch selected`);
  ok(!written.has("C-10-CRIMINAL:Check Box1.1"), `${familyId}: municipality branch not selected`);
  if (familyId !== "al-felony-dwop-set") {
    for (const fieldId of ["C-10-CRIMINAL:MUNICIPALITY OF", "C-10-CRIMINAL:Check Box1.1"]) {
      const row = map.refusals.find((candidate) => candidate.fieldId === fieldId);
      eq(row?.completenessDisposition, "NOT_APPLICABLE_ON_THIS_ROUTE", `${familyId}: ${fieldId} not owed`);
      eq(row?.requiredBeforeFiling, false, `${familyId}: ${fieldId} not required`);
    }
  }
  ok(guide.includes("## Elections on CR-65 that this packet has not made"), `${familyId}: CR-65 elections handed back`);
  ok(guide.includes("Petition must include either item 1 or item 2; All Petitions must include item 3"), `${familyId}: attachment choices named`);
  ok(guide.includes("[ ] pro se (Not represented by an attorney)"), `${familyId}: representation choice named`);
}

for (const familyId of CHANGED) {
  const out = path.join(ROOT, `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill`);
  const map = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  for (const fieldId of ["CR-65:COUNTY and it was given Court Case Number", "CR-65:was     granted"]) {
    const row = map.refusals.find((candidate) => candidate.fieldId === fieldId);
    eq(row?.requiredBeforeFilingCondition, "only if you tick the SECOND box in item (3) on CR-65 page 6", `${familyId}: prior-expungement branch condition`);
  }
}

for (const [familyId, hashes] of Object.entries(UNCHANGED)) {
  const fixtures = path.join(ROOT, `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill/fixtures`);
  eq(sha(fs.readFileSync(path.join(fixtures, "canonical.pdf"))), hashes[0], `${familyId}: canonical preserved`);
  eq(sha(fs.readFileSync(path.join(fixtures, "boundary.pdf"))), hashes[1], `${familyId}: boundary preserved`);
}

const pages = [
  ...Array.from({ length: 8 }, (_, index) => ({ packetPage: index + 1, sourcePdf: SOURCE.cr65, sourcePage: index + 1 })),
  ...Array.from({ length: 3 }, (_, index) => ({ packetPage: index + 9, sourcePdf: SOURCE.c10, sourcePage: index + 1 }))
];
const inkFixtures = [];
for (const familyId of CHANGED) {
  for (const fixture of ["canonical", "boundary"]) {
    const deliveredPdf = path.join(ROOT, `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill/fixtures/${fixture}.pdf`);
    const report = await assertPrintedSourceInkSurvives({ deliveredPdf, pages });
    eq(report.perPage.reduce((sum, page) => sum + page.lostInkOutsideEveryDeclaredWidgetRect, 0), 0, `${familyId}/${fixture}: all printed source ink outside fields survives`);
    inkFixtures.push({ familyId, fixture, pdfSha256: sha(fs.readFileSync(deliveredPdf)), perPage: report.perPage.map(({ sourcePdf, ...row }) => ({ ...row, sourceDocument: path.basename(sourcePdf) })) });
  }
}

// Negative control: pdftotext would still see this printed word, but the pixel
// guard must reject an opaque overlay over it.
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "al-guidance-ink-control-"));
let control;
try {
  const sourcePdf = path.join(ROOT, "data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/fixtures/canonical.pdf");
  const pdf = await PDFDocument.load(fs.readFileSync(sourcePdf));
  pdf.getPages()[2].drawRectangle({ x: 178, y: 650.4, width: 39.8, height: 11.4, color: rgb(1, 1, 1) });
  const mutated = path.join(scratch, "opaque-over-printed-word.pdf");
  fs.writeFileSync(mutated, Buffer.from(await pdf.save({ useObjectStreams: false })));
  const report = await measurePrintedSourceInkSurvival({ deliveredPdf: mutated, pages: [pages[2]] });
  const erased = report.perPage[0].lostInkOutsideEveryDeclaredWidgetRect;
  ok(erased > 0, "negative control must measure erased printed ink");
  let rejected = false;
  try { await assertPrintedSourceInkSurvives({ deliveredPdf: mutated, pages: [pages[2]] }); } catch { rejected = true; }
  ok(rejected, "negative control must be rejected");
  control = { result: "EXPECTED_FAILURE_OBSERVED", erasedInkPixelsOutsideWidgetRects: erased };
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

fs.writeFileSync(path.join(EVIDENCE, "printed-source-ink-proof.json"), `${JSON.stringify({
  schemaVersion: "rcap-printed-source-ink-survival/v1", dpi: 300, sourceAnnotationsRendered: true,
  changedFamilies: CHANGED, fixtures: inkFixtures, negativeControl: control
}, null, 2)}\n`);
fs.writeFileSync(path.join(EVIDENCE, "focused-followup-results.json"), `${JSON.stringify({
  schemaVersion: "rcap-focused-check-results/v1", result: "PASS", assertions,
  families: ALL, changedPdfFamilies: CHANGED, unchangedPdfFamilies: Object.keys(UNCHANGED),
  checks: ["source hashes", "oath provenance and exact printed requirement", "municipality branch classification", "CR-65 participant-election handback", "C-10 fee-election handback", "conditional prior-expungement blanks", "unchanged PDF hashes", "full-page printed-source ink survival", "opaque-overlay negative control"]
}, null, 2)}\n`);
console.log(`AL guidance/ink follow-up PASS (${assertions} assertions; ${inkFixtures.length} current PDFs, ${inkFixtures.length * 11} pages source-ink compared; negative control fired)`);
