#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  ALABAMA_CLERK_ASSIGNED_CASE_NUMBER_LABEL,
  ALABAMA_CLERK_ASSIGNED_CASE_NUMBER_WIDGETS,
  classifyAlabamaClerkAssignedCaseNumber,
  isAlabamaClerkAssignedCaseNumber
} from "./rcap-official-forms/alabama-clerk-assigned-case-number.mjs";
import { readAlabamaPardonedSectionV } from "./rcap-official-forms/alabama-section-v-byte-reading.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SOURCES = [
  ["CR-65", "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf"],
  ["C-10-CRIMINAL", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf"]
];
const FAMILIES = [
  "al-diversion-set", "al-misd-conviction-set", "al-misd-dwop-set",
  "al-pardoned-felony-set", "al-felony-dwop-set", "al-felony-nonconviction-90-set"
];
const CASE_NUMBERS = { canonical: "CC-2021-004217", boundary: "CC-2024-000001.99" };
let assertions = 0;
function eq(actual, expected, message) { assertions += 1; assert.deepEqual(actual, expected, message); }
function ok(value, message) { assertions += 1; assert.ok(value, message); }

function pageOf(field, pages) {
  const widgets = field.acroField.getWidgets();
  const index = pages.findIndex((page) => widgets.some((widget) => widget.P() === page.ref));
  return index + 1;
}

const sourceMatches = [];
for (const [documentId, relativePath] of SOURCES) {
  const pdf = await PDFDocument.load(fs.readFileSync(path.join(ROOT, relativePath)));
  const pages = pdf.getPages();
  for (const field of pdf.getForm().getFields()) {
    const fieldName = field.getName();
    const page = pageOf(field, pages);
    if (isAlabamaClerkAssignedCaseNumber({ documentId, fieldName, page })) {
      sourceMatches.push(`${documentId}:${page}:${fieldName}`);
    }
  }
}
eq(sourceMatches.sort(), [...ALABAMA_CLERK_ASSIGNED_CASE_NUMBER_WIDGETS], "the allowlist must match exactly the widgets in the two pinned source forms");
eq(sourceMatches.length, 11, "the two pinned forms carry eleven repeated clerk-assigned caption widgets");

for (const identity of ALABAMA_CLERK_ASSIGNED_CASE_NUMBER_WIDGETS) {
  const [documentId, pageText, ...nameParts] = identity.split(":");
  const classification = classifyAlabamaClerkAssignedCaseNumber({ documentId, page: Number(pageText), fieldName: nameParts.join(":") });
  eq(classification?.effectiveLabel, ALABAMA_CLERK_ASSIGNED_CASE_NUMBER_LABEL, `${identity} has the clerk-owned effective label`);
  eq(classification?.role, "clerk", `${identity} has clerk actor ownership`);
}

// Meaningful negative controls: these are real case-number-like fields on CR-65,
// but neither is the new expungement case number assigned by the clerk.
eq(isAlabamaClerkAssignedCaseNumber({ documentId: "CR-65", page: 1, fieldName: "Text3" }), false,
  "CR-65 Text3 is the underlying court case number to be expunged and must remain writable");
eq(isAlabamaClerkAssignedCaseNumber({ documentId: "CR-65", page: 6, fieldName: "COUNTY and it was given Court Case Number" }), false,
  "the conditional prior-expungement case field is not a caption field");
eq(isAlabamaClerkAssignedCaseNumber({ documentId: "CR-65", page: 1, fieldName: "Court Case Number" }), false,
  "a matching name on the wrong page cannot enter the allowlist");
eq(isAlabamaClerkAssignedCaseNumber({ documentId: "C-10-CRIMINAL", page: 1, fieldName: "Text4" }), false,
  "the C-10 date-of-birth widget remains participant-owned");

if (process.argv.includes("--outputs")) {
  for (const familyId of FAMILIES) {
    const out = path.join(ROOT, `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill`);
    const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
    const actualWrites = JSON.parse(fs.readFileSync(path.join(out, "reports/actual-writes.json"), "utf8"));
    const clerkRefusals = fieldMap.refusals.filter((row) => row.effectiveLabel === ALABAMA_CLERK_ASSIGNED_CASE_NUMBER_LABEL);
    eq(clerkRefusals.length, 11, `${familyId}: all eleven caption widgets are classified`);
    ok(clerkRefusals.every((row) => row.role === "clerk" && row.refusalClass === "court_prosecutor_clerk_or_agency_owned"),
      `${familyId}: every caption widget is clerk-owned`);
    eq(fieldMap.writes.filter((row) => isAlabamaClerkAssignedCaseNumber({ documentId: row.documentId, fieldName: row.fieldName, page: row.page })).length, 0,
      `${familyId}: no field-map write targets a clerk caption`);
    const canonicalRows = actualWrites.documents.flatMap((document) => document.actualWrites);
    eq(canonicalRows.filter((row) => row.documentId === "CR-65" && row.fieldName === "Text3" && row.factId === "matter.case_number").length, 1,
      `${familyId}: the separate underlying-record Text3 write remains`);
    eq(canonicalRows.filter((row) => isAlabamaClerkAssignedCaseNumber({ documentId: row.documentId, fieldName: row.fieldName, page: row.page })).length, 0,
      `${familyId}: saved-byte write evidence reports no clerk-caption write`);

    for (const [fixture, caseNumber] of Object.entries(CASE_NUMBERS)) {
      const pdfPath = path.join(out, "fixtures", `${fixture}.pdf`);
      const bbox = execFileSync("pdftotext", ["-bbox-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
      const escaped = caseNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const occurrences = [...bbox.matchAll(new RegExp(`<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">${escaped}</word>`, "g"))];
      eq(occurrences.length, 1, `${familyId} ${fixture}: the underlying number appears once, rather than in repeated captions`);
      const [, xMin, yMin, xMax, yMax] = occurrences[0];
      ok(Number(xMin) >= 257 && Number(xMax) <= 420 && Number(yMin) >= 285 && Number(yMax) <= 305,
        `${familyId} ${fixture}: the sole case-number glyph is positioned in CR-65 Text3 on packet page 1 (${xMin},${yMin},${xMax},${yMax})`);
    }
  }
  const cr65 = fs.readFileSync(path.join(ROOT, SOURCES[0][1]));
  const pardonOut = path.join(ROOT, "data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/fixtures");
  for (const fixture of Object.keys(CASE_NUMBERS)) {
    const readings = await readAlabamaPardonedSectionV({ sourceBytes: cr65, outputBytes: fs.readFileSync(path.join(pardonOut, `${fixture}.pdf`)) });
    eq(readings.length, 8, `al-pardoned-felony-set ${fixture}: all eight Section V controls were read from saved bytes`);
    ok(readings.every((row) => row.locatedAppearanceCount === 1 && row.marked === false && row.nonWhitespaceGlyphs === 0),
      `al-pardoned-felony-set ${fixture}: every Section V attestation is visibly unmarked in its exact source widget box`);
  }
}

console.log(`AL_CLERK_ASSIGNED_CASE_NUMBER_PASS ${assertions} assertions${process.argv.includes("--outputs") ? "; six families / twelve saved PDFs checked" : "; source classification and negative controls checked"}`);
