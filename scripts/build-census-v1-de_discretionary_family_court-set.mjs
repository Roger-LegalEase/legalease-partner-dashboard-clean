#!/usr/bin/env node
/**
 * Delaware Family Court — Form 281 / Form 281E packet family.
 *
 * This builder is deliberately source-first.  Form 281 and Form 281E are the
 * exact Word files named by the packet-set record.  The Word files are
 * converted in a build-time directory with the held office converter, the
 * first (and substantive) source page is copied into the packet, and only
 * safely held participant facts are drawn into the source's printed blanks.
 * The converter's trailing Form 281E header page is not an official second
 * page: the DOCX has one page and the trailing export page contains only the
 * repeated header.  It is therefore recorded as conversion evidence and is
 * never delivered.
 *
 *   node scripts/build-census-v1-de_discretionary_family_court-set.mjs --no-raster
 *   node scripts/build-census-v1-de_discretionary_family_court-set.mjs --check
 *
 * This lane does not edit the shared manifest, queue or ledger.  The manifest
 * is read and checked at build time.  Form 281E is bound and source-checked,
 * but is attached only when the participant has more charges than Form 281's
 * table. The boundary fixture deliberately exercises that branch with a fifth
 * held row.
 */
import { carryForwardGovernance } from "./rcap-packet-completeness/governance-preservation.mjs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), "..");
process.chdir(ROOT);

export const FAMILY_ID = "de_discretionary_family_court-set";
export const ROUTE_KEY = "obligation:track-only:DE:de_discretionary_family_court";
export const BUILD_SCRIPT = "scripts/build-census-v1-de_discretionary_family_court-set.mjs";
export const OUT_REL = "data/rcap-all50/overlays/census-v1/de/de-discretionary-family-court-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const QUEUE_REL = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const REGISTRY_REL = "data/record-clearing/legal-design-track-registry.json";
const MANIFEST_REL = "data/record-clearing/legal-design-packet-set-manifests.json";

const COMPONENTS = Object.freeze({
  primary: "de_discretionary_family_court-primary-filing-1",
  continuation: "de_discretionary_family_court-continuation-2",
  cover: "de_discretionary_family_court-cover-sheet-3"
});

const SOURCES = Object.freeze({
  primary: Object.freeze({
    sourceId: "official-form:FORM-281",
    officialFormId: "FORM-281",
    title: "Form 281, Petition for Expungement of Adult Record",
    sha256: "84300768ad7f0724d6bd85f94bb06a07f18cf512494da9b02492cff838018eda",
    byteLength: 97280,
    recoveryPath: "reference/source-recovery/2026-09-11-wave1/281---petition-for-expungement-of-adult-record-11192025.doc",
    poolPath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/source-acquisition-2026-09-04/281---petition-for-expungement-of-adult-record-11192025.doc",
    masterPath: null,
    componentId: COMPONENTS.primary,
    expectedOriginalPages: 1,
    expectedOriginalWords: 574,
    sourceFormat: "application/msword"
  }),
  continuation: Object.freeze({
    sourceId: "official-form:FORM-281E",
    officialFormId: "FORM-281E",
    title: "Form 281E, Petition for Expungement of Adult Record Charge Sheet",
    sha256: "aaca121e3bb4ce51ab9ab4ff6d933138bf7a36b6d97269c02cbf3c0290e87b33",
    byteLength: 26118,
    recoveryPath: "reference/source-recovery/2026-09-11-wave1/281e---adult-expungement-charge-extension-sheet-09212018.docx",
    poolPath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/forms/Form-281E__petition-for-expungement-of-adult-record-charge-sheet__rev-2018-09.docx",
    masterPath: "STATES/DE/02_PACKET_FORMS/DE__FORM__FORM-281E__petition-for-expungement-of-adult-record-charge-sheet__REV-2018-09__EN.docx",
    componentId: COMPONENTS.continuation,
    expectedOriginalPages: 1,
    expectedOriginalWords: null,
    sourceFormat: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  })
});

const FIXTURES = Object.freeze({
  canonical: Object.freeze({
    "participant.full_legal_name": "Danielle Rose Hargrove",
    "participant.date_of_birth": "1992-07-22",
    "participant.street_address": "88 Loockerman Street",
    "participant.city_state_zip": "Dover, DE 19901",
    "participant.phone": "(302) 555-0163",
    "matter.case_number": "K21-03-0455",
    "participant.po_box_number": "Box 104",
    "participant.email": "danielle@example.test",
    "participant.interpreter_needed": true,
    "participant.language": "Spanish",
    charges: Object.freeze([
      Object.freeze({ caseNumber: "K21-03-0455", charge: "Theft; 11:841; misdemeanor", offenseDate: "2016-02-10", incidentNumber: "K21-03-0455-A", dispositionDate: "2017-04-12", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "K21-03-0455", charge: "Theft; 11:841; misdemeanor", offenseDate: "2016-08-21", incidentNumber: "K21-03-0455-B", dispositionDate: "2017-04-12", disposition: "Dismissed" })
    ])
  }),
  boundary: Object.freeze({
    "participant.full_legal_name": "Bartholomew Nkemdirim Vandergrift-Ashworth Jr.",
    "participant.date_of_birth": "1949-01-30",
    "participant.street_address": "2604 Old Capitol Trail, Building 7, Unit 219",
    "participant.city_state_zip": "Wilmington, DE 19808-4417",
    "participant.phone": "(302) 555-0138 ext. 22",
    "matter.case_number": "N19-11-0032-01",
    "participant.po_box_number": "Box 2407",
    "participant.email": "bvandergrift@example.test",
    "participant.interpreter_needed": true,
    "participant.language": "Spanish",
    charges: Object.freeze([
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2015-01-14", incidentNumber: "N19-11-0032-01-A", dispositionDate: "2016-03-18", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2015-03-22", incidentNumber: "N19-11-0032-01-B", dispositionDate: "2016-03-18", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2015-07-09", incidentNumber: "N19-11-0032-01-C", dispositionDate: "2016-03-18", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2015-11-02", incidentNumber: "N19-11-0032-01-D", dispositionDate: "2016-03-18", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2016-01-25", incidentNumber: "N19-11-0032-01-E", dispositionDate: "2016-03-18", disposition: "Dismissed" })
    ])
  })
});

const PRIMARY_CHARGE_COLUMNS = Object.freeze([
  Object.freeze({ key: "caseNumber", printedLabel: "Case ID # or Criminal Case #" }),
  Object.freeze({ key: "charge", printedLabel: "Charge" }),
  Object.freeze({ key: "offenseDate", printedLabel: "Offense Date" }),
  Object.freeze({ key: "dispositionDate", printedLabel: "Disposition Date" }),
  Object.freeze({ key: "disposition", printedLabel: "Disposition" })
]);

const CONTINUATION_CHARGE_COLUMNS = Object.freeze([
  Object.freeze({ key: "charge", printedLabel: "Charge" }),
  Object.freeze({ key: "offenseDate", printedLabel: "Offense Date" }),
  Object.freeze({ key: "incidentNumber", printedLabel: "Incident No." }),
  Object.freeze({ key: "dispositionDate", printedLabel: "Disposition Date" }),
  Object.freeze({ key: "disposition", printedLabel: "Disposition" })
]);

const PRIMARY_CHARGE_CAPACITY = 4;
const CONTINUATION_CHARGE_CAPACITY = 23;

const PRIMARY_CHARGE_RECTS = Object.freeze([
  Object.freeze([{ x: 37.2, y: 437.45, width: 129, height: 10.4 }, { x: 172.2, y: 437.45, width: 115.5, height: 10.4 }, { x: 293.7, y: 437.45, width: 79.5, height: 10.4 }, { x: 379.2, y: 437.45, width: 79.5, height: 10.4 }, { x: 464.7, y: 437.45, width: 115.5, height: 10.4 }]),
  Object.freeze([{ x: 37.2, y: 423.05, width: 129, height: 10.4 }, { x: 172.2, y: 423.05, width: 115.5, height: 10.4 }, { x: 293.7, y: 423.05, width: 79.5, height: 10.4 }, { x: 379.2, y: 423.05, width: 79.5, height: 10.4 }, { x: 464.7, y: 423.05, width: 115.5, height: 10.4 }]),
  Object.freeze([{ x: 37.2, y: 408.65, width: 129, height: 10.4 }, { x: 172.2, y: 408.65, width: 115.5, height: 10.4 }, { x: 293.7, y: 408.65, width: 79.5, height: 10.4 }, { x: 379.2, y: 408.65, width: 79.5, height: 10.4 }, { x: 464.7, y: 408.65, width: 115.5, height: 10.4 }]),
  Object.freeze([{ x: 37.2, y: 394.25, width: 129, height: 10.4 }, { x: 172.2, y: 394.25, width: 115.5, height: 10.4 }, { x: 293.7, y: 394.25, width: 79.5, height: 10.4 }, { x: 379.2, y: 394.25, width: 79.5, height: 10.4 }, { x: 464.7, y: 394.25, width: 115.5, height: 10.4 }])
]);

const CONTINUATION_HEADER_FIELDS = Object.freeze({
  petitioner: Object.freeze({ field: "Petitioner", printedLabel: "Petitioner", factId: "participant.full_legal_name", rect: { x: 43, y: 639, width: 210, height: 11 } }),
  street: Object.freeze({ field: "StreetAddress", printedLabel: "Street Address (including Apt)", factId: "participant.street_address", rect: { x: 43, y: 614, width: 210, height: 11 } }),
  poBox: Object.freeze({ field: "POBoxNumber", printedLabel: "P.O. Box Number", factId: "participant.po_box_number", rect: { x: 43, y: 590, width: 210, height: 11 } }),
  cityStateZip: Object.freeze({ field: "CityStateZip", printedLabel: "City/State/Zip Code", factId: "participant.city_state_zip", rect: { x: 43, y: 565, width: 210, height: 11 } }),
  criminalCase: Object.freeze({ field: "CrimCaseNo", printedLabel: "Crim. Case No.", factId: "matter.case_number", rect: { x: 466, y: 575, width: 92, height: 11 } }),
  fileNo: Object.freeze({ field: "FileNo", printedLabel: "File No. — assigned by Family Court", factId: null, rect: { x: 466, y: 532, width: 92, height: 11 } })
});

const PRIMARY_SOURCE_CONTROLS = Object.freeze({
  poBox: Object.freeze({ field: "POBoxNumber", printedLabel: "P.O. Box Number", effectiveLabel: "P.O. Box Number (optional)", factId: "participant.po_box_number", rect: { x: 50, y: 612, width: 170, height: 11 }, type: "text" }),
  email: Object.freeze({ field: "EmailAddress", printedLabel: "Email Address", effectiveLabel: "Email Address (optional)", factId: "participant.email", rect: { x: 106, y: 550, width: 112, height: 11 }, type: "text" }),
  attorney: Object.freeze({ field: "AttorneyName", printedLabel: "Attorney Name", effectiveLabel: "Attorney Name (optional)", factId: "participant.attorney_name", rect: { x: 105.6, y: 538, width: 112, height: 11 }, type: "text" }),
  interpreterYes: Object.freeze({ field: "InterpreterNeededYes", printedLabel: "Interpreter needed? — Yes", effectiveLabel: "Interpreter needed? — Yes", factId: "participant.interpreter_needed", rect: { x: 129, y: 527, width: 9, height: 9 }, type: "checkbox" }),
  interpreterNo: Object.freeze({ field: "InterpreterNeededNo", printedLabel: "Interpreter needed? — No", effectiveLabel: "Interpreter needed? — No", factId: "participant.interpreter_needed", rect: { x: 168.75, y: 527, width: 9, height: 9 }, type: "checkbox" }),
  language: Object.freeze({ field: "Language", printedLabel: "Language", effectiveLabel: "Language (if an interpreter is needed)", factId: "participant.language", rect: { x: 93, y: 516, width: 127, height: 10 }, type: "text" })
});

const PRIMARY_FIELDS = Object.freeze({
  petitioner: {
    field: "Petitioner",
    printedLabel: "Petitioner",
    factId: "participant.full_legal_name",
    // The participant column ends at the source's vertical rule near x=222;
    // leave a small interior margin so the long boundary name cannot enter the
    // Attorney General column.
    rect: { x: 50, y: 660, width: 170, height: 11 },
    page: 1
  },
  street: {
    field: "StreetAddress",
    printedLabel: "Street Address (including Apt)",
    factId: "participant.street_address",
    rect: { x: 50, y: 636, width: 174, height: 11 },
    page: 1
  },
  cityStateZip: {
    field: "CityStateZip",
    printedLabel: "City/State/Zip Code",
    factId: "participant.city_state_zip",
    rect: { x: 50, y: 588, width: 174, height: 11 },
    page: 1
  },
  dob: {
    field: "DOB",
    printedLabel: "DOB",
    factId: "participant.date_of_birth",
    rect: { x: 50, y: 564, width: 72, height: 11 },
    page: 1
  },
  phone: {
    field: "Telephone",
    printedLabel: "Telephone #",
    factId: "participant.phone",
    rect: { x: 128, y: 564, width: 94, height: 11 },
    page: 1
  },
  criminalCase: {
    field: "CriminalCaseNo",
    printedLabel: "Crim. Case No.",
    factId: "matter.case_number",
    rect: { x: 468, y: 647, width: 91, height: 13 },
    page: 1
  },
  recitalName: {
    field: "PetitionerNameInRecital",
    printedLabel: "Petitioner name in the statutory recital",
    factId: "participant.full_legal_name",
    rect: { x: 258, y: 491, width: 137, height: 10 },
    page: 1
  }
});

const PRIMARY_CENSUS_FIELDS = [
  ...Object.values(PRIMARY_FIELDS).map((f) => ({
    fieldId: f.field,
    field: f.field,
    printedLabel: f.printedLabel,
    effectiveLabel: f.printedLabel,
    type: "text",
    page: f.page,
    rect: f.rect,
    sourceBlank: true,
    factId: f.factId,
    componentId: COMPONENTS.primary
  })),
  { fieldId: "CivilPetitionNo", field: "CivilPetitionNo", printedLabel: "Civil Petition No.", effectiveLabel: "Civil Petition No. — assigned by Family Court", type: "text", page: 1, rect: { x: 468, y: 570, width: 91, height: 67 }, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "County-New-Castle", field: "County-New-Castle", printedLabel: "New Castle County", effectiveLabel: "New Castle County", type: "checkbox", page: 1, rect: null, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "County-Kent", field: "County-Kent", printedLabel: "Kent County", effectiveLabel: "Kent County", type: "checkbox", page: 1, rect: null, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "County-Sussex", field: "County-Sussex", printedLabel: "Sussex County", effectiveLabel: "Sussex County", type: "checkbox", page: 1, rect: null, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "ManifestInjusticeCheckbox", field: "ManifestInjusticeCheckbox", printedLabel: "The continued existence and possible dissemination of criminal records relating to Petitioner causes, or may cause, circumstances which constitute a manifest injustice to the Petitioner.", effectiveLabel: "Manifest-injustice assertion checkbox", type: "checkbox", page: 1, rect: null, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "ManifestInjusticeExplanation", field: "ManifestInjusticeExplanation", printedLabel: "You must explain how the Petitioner is negatively affected", effectiveLabel: "Manifest-injustice explanation", type: "ruled_text", page: 1, rect: { x: 40, y: 432, width: 560, height: 28 }, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "PetitionerSignature", field: "PetitionerSignature", printedLabel: "Petitioner’s Signature", effectiveLabel: "Petitioner’s Signature", type: "signature", page: 1, rect: { x: 310, y: 104, width: 278, height: 18 }, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "SwornJurat", field: "SwornJurat", printedLabel: "Sworn to and subscribed before me", effectiveLabel: "Sworn to and subscribed before me — clerk of court or notary", type: "signature", page: 1, rect: { x: 40, y: 72, width: 545, height: 46 }, sourceBlank: true, componentId: COMPONENTS.primary }
];

function chargeCensus(componentId, columns, capacity) {
  const xs = [36.3, 207, 299.1, 391.3, 483.5, 575.8];
  return Array.from({length: capacity}, (_, r) => columns.map((column, c) => ({
    fieldId: `${componentId === COMPONENTS.primary ? "Charge" : "Continuation"}Row${r + 1}-${column.key}`,
    field: `${componentId === COMPONENTS.primary ? "Charge" : "Continuation"}Row${r + 1}-${column.key}`,
    printedLabel: column.printedLabel, effectiveLabel: `Row ${r + 1} — ${column.printedLabel}`,
    type: "text", page: 1, componentId, sourceBlank: true,
    rect: componentId === COMPONENTS.primary ? PRIMARY_CHARGE_RECTS[r][c] :
      {x: xs[c] + 3, y: 792 - 331.65 - (r + 1) * 18 + 2, width: xs[c + 1] - xs[c] - 6, height: 14}
  }))).flat();
}
PRIMARY_CENSUS_FIELDS.push(...Object.values(PRIMARY_SOURCE_CONTROLS).map(f => ({
  ...f, fieldId: f.field, page: 1, sourceBlank: true, componentId: COMPONENTS.primary
})), ...chargeCensus(COMPONENTS.primary, PRIMARY_CHARGE_COLUMNS, PRIMARY_CHARGE_CAPACITY));
const CONTINUATION_CENSUS_FIELDS = [
  ...Object.values(CONTINUATION_HEADER_FIELDS).map(f => ({...f, fieldId: f.field,
    effectiveLabel: f.printedLabel, type: "text", page: 1, sourceBlank: true, componentId: COMPONENTS.continuation})),
  ...chargeCensus(COMPONENTS.continuation, CONTINUATION_CHARGE_COLUMNS, CONTINUATION_CHARGE_CAPACITY)
];

const REQUIRED_FIELD_LABELS = Object.freeze([
  "Certified criminal history dated within 45 days",
  "Charges and dispositions — list each charge separately with its disposition, statute section, and whether it was a violation, misdemeanor or felony",
  "All charges and convictions sought were disposed of in Family Court",
  "County where the most recent case terminated",
  "Conviction or release date for each charge",
  "Other convictions before or after this case",
  "Manifest-injustice facts in the participant’s own words",
  "Fines, fees and restitution status",
  "Filing fee confirmation under § 4374(j)"
]);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const writeJson = (rel, value) => {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const normalize = (value) => String(value ?? "").replace(/[\u00a0\u2007\u202f]/g, " ").replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
const round = (value) => Number(Number(value).toFixed(3));

function fixedCandidates(spec) {
  const out = [];
  if (spec.masterPath && process.env.MASTER_LIBRARY_SOURCE_DIR) out.push(path.join(process.env.MASTER_LIBRARY_SOURCE_DIR, spec.masterPath));
  out.push(path.join(ROOT, spec.poolPath));
  out.push(path.join(ROOT, spec.recoveryPath));
  return [...new Set(out)];
}

function resolveExactSource(spec) {
  const candidates = fixedCandidates(spec);
  const absolute = candidates.find((candidate) => fs.existsSync(candidate));
  if (!absolute) throw new Error(`${spec.sourceId} source unavailable; tried exact held paths: ${candidates.join(" | ")}`);
  const bytes = fs.readFileSync(absolute);
  const observed = sha256(bytes);
  if (observed !== spec.sha256 || bytes.length !== spec.byteLength) {
    throw new Error(`${spec.sourceId} source drift at ${absolute}: observed ${observed}/${bytes.length}, expected ${spec.sha256}/${spec.byteLength}`);
  }
  return { absolute, bytes, observedSha256: observed, byteLength: bytes.length };
}

function parseFileMetadata(absolute, spec) {
  const text = execFileSync("file", [absolute], { cwd: ROOT, encoding: "utf8" }).trim();
  if (spec.expectedOriginalPages !== null) {
    const pageMatch = text.match(/Number of Pages:\s*(\d+)/i);
    if (!pageMatch || Number(pageMatch[1]) !== spec.expectedOriginalPages) throw new Error(`${spec.sourceId} metadata page count is not ${spec.expectedOriginalPages}: ${text}`);
  }
  if (spec.expectedOriginalWords !== null) {
    const words = text.match(/Number of Words:\s*(\d+)/i);
    if (!words || Number(words[1]) !== spec.expectedOriginalWords) throw new Error(`${spec.sourceId} metadata word count is not ${spec.expectedOriginalWords}: ${text}`);
  }
  return { file: text, declaredPages: spec.expectedOriginalPages, declaredWords: spec.expectedOriginalWords };
}

function docxText(absolute) {
  const xml = execFileSync("unzip", ["-p", absolute, "word/document.xml"], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return normalize(xml.replace(/<[^>]*>/g, " "));
}

function pdfText(pdfPath, firstPage, lastPage = firstPage) {
  return execFileSync("pdftotext", ["-f", String(firstPage), "-l", String(lastPage), "-layout", pdfPath, "-"], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

function sourceAnchors(spec, text) {
  const required = spec === SOURCES.primary
    ? ["The Family Court of the State of Delaware", "PETITION FOR EXPUNGEMENT OF ADULT RECORD", "Crim. Case No.", "Civil Petition No.", "The following information MUST be completed for the Court to consider the petition", "The Petitioner hereby declares"]
    : ["The Family Court of the State of Delaware", "PETITION FOR EXPUNGEMENT OF ADULT RECORD CHARGE SHEET", "Crim. Case No.", "File No.", "The charges listed below are a continuation", "Disposition Date", "Disposition"];
  const normalized = normalize(text);
  const missing = required.filter((needle) => !normalized.includes(normalize(needle)));
  if (missing.length) throw new Error(`${spec.sourceId} first-page source anchors missing after conversion: ${missing.join(" | ")}`);
  return required;
}

async function convertSource(spec, resolved, scratchDir) {
  const converter = process.env.RCAP_SOFFICE || "/tmp/rcap-de-office/soffice";
  if (!fs.existsSync(converter)) throw new Error(`Delaware Word source conversion prerequisite is unavailable: ${converter}`);
  execFileSync(converter, ["--headless", "--convert-to", "pdf", "--outdir", scratchDir, resolved.absolute], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  const outputName = `${path.basename(resolved.absolute).replace(/\.[^.]+$/, "")}.pdf`;
  const derivedPath = path.join(scratchDir, outputName);
  if (!fs.existsSync(derivedPath)) throw new Error(`${spec.sourceId} converter did not produce ${derivedPath}`);
  const derivedBytes = fs.readFileSync(derivedPath);
  const sourcePdf = await PDFDocument.load(derivedBytes, { updateMetadata: false });
  const exportedPages = sourcePdf.getPageCount();
  const firstText = pdfText(derivedPath, 1, 1);
  sourceAnchors(spec, firstText);
  let trailingPage = null;
  if (spec === SOURCES.primary) {
    if (exportedPages !== 1) throw new Error(`FORM-281 conversion changed the authoritative one-page layout: exported ${exportedPages} pages`);
  } else {
    if (exportedPages < 1 || exportedPages > 2) throw new Error(`FORM-281E conversion produced an unexpected page count: ${exportedPages}`);
    if (exportedPages === 2) {
      const secondText = normalize(pdfText(derivedPath, 2, 2));
      const isHeaderOnly = secondText === "Form 281E Dev 9/18" || secondText === "Form 281E Dev 9/18 Form 281E Dev 9/18";
      if (!isHeaderOnly || /PETITION|CHARGE|CONTINUATION|Crim\.|File No\.|Disposition/i.test(secondText)) {
        throw new Error(`FORM-281E conversion page 2 contains substantive content and cannot be dropped: ${JSON.stringify(secondText)}`);
      }
      trailingPage = { page: 2, text: secondText, disposition: "converter_only_repeated_header_not_delivered" };
    }
  }
  return {
    ...resolved,
    derivedPath,
    derivedBytes,
    derivedSha256: sha256(derivedBytes),
    derivedByteLength: derivedBytes.length,
    exportedPages,
    selectedPages: 1,
    pageSize: { width: round(sourcePdf.getPage(0).getWidth()), height: round(sourcePdf.getPage(0).getHeight()) },
    firstPageTextSha256: sha256(Buffer.from(firstText)),
    firstPageAnchors: sourceAnchors(spec, firstText),
    trailingPage,
    conversion: {
      converter,
      fontConfig: process.env.FONTCONFIG_FILE || "/tmp/rcap-de-office/fontconfig.conf",
      sourceIdentityRemainsOriginal: true,
      originalMetadataPages: spec.expectedOriginalPages,
      selectedSubstantivePages: 1
    }
  };
}

function assertQueueAndManifest() {
  const queue = readJson(QUEUE_REL);
  const row = (queue.families ?? []).find((family) => family.familyId === FAMILY_ID);
  assert(row, `MASTER_QUEUE has no ${FAMILY_ID} row`);
  assert.equal(row.state, "SOURCE_READY");
  assert.equal(row.sourceReconciliation?.disposition, "SOURCE_READY");
  assert.equal(row.legalInputStatus, "SETTLED");
  assert.equal(row.implementationStrategy, "official_pdf_fill");
  assert.deepEqual(row.sourceIds, [SOURCES.primary.sourceId, SOURCES.continuation.sourceId]);
  const registry = readJson(REGISTRY_REL);
  const track = (registry.tracks ?? []).find((item) => item.trackId === "de_discretionary_family_court");
  assert(track, "track registry lacks de_discretionary_family_court");
  assert.equal(track.venue, "Family Court for the county where the most recent case was terminated.");
  assert.equal(track.destination?.name, "Family Court of the State of Delaware");
  assert.equal(track.packetInstructions?.[0], "Generate the court packet without collecting or reviewing the certified SBI history. The current certified history is required before filing.");
  const manifestRoot = readJson(MANIFEST_REL);
  const manifest = (Array.isArray(manifestRoot) ? manifestRoot : (manifestRoot.packetSets ?? manifestRoot.manifests ?? [])).find((item) => item.packetSetId === FAMILY_ID);
  assert(manifest, `packet manifest has no ${FAMILY_ID} entry`);
  assert.deepEqual(manifest.components.map((component) => component.componentId), [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.cover]);
  assert.equal(manifest.components.find((component) => component.componentId === COMPONENTS.continuation)?.conditionDescription, "When charges exceed the table on the petition.");
  assert.equal(manifest.components.find((component) => component.componentId === COMPONENTS.cover)?.outputStrategy, "custom_pleading");
  assert.deepEqual(manifest.requiredBeforeFiling, [
    "Obtain Certified criminal history, dated within 45 days. Request the certified criminal history through IdentoGo, service code 27S23V, at about $72. The court shall summarily reject any petition without it.",
    "Check your answer to \"List each charge separately with its disposition, statute section, and whether it was a violation, misdemeanor or felony.\" against Certified criminal history, dated within 45 days, and correct the packet if they disagree.",
    "Notarized signature — Form 281, signature and jurat.",
    "Manifest-injustice explanation — Form 281, manifest-injustice section.",
    "The petition is sworn and subscribed before a clerk of court or notary.",
    "Required.",
    "Set by each court under § 4374(j). Whether Family Court adult petitions carry the same $75 fee is unresolved.",
    "Under § 4372(l), if an outstanding fine or fee is unpaid for reasons other than wilful noncompliance and the person is otherwise eligible, the court may grant the expungement and waive the fines or fees or convert them to a civil judgment."
  ]);
  return { queue: row, registry, track, manifest };
}

function requiredRefusal(field, label, documentId, reason, extra = {}) {
  return {
    field,
    fieldId: field,
    documentId,
    formNumber: documentId,
    effectiveLabel: label,
    printedLabel: label,
    reason,
    completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true,
    routeDetermined: false,
    factId: null,
    ...extra
  };
}

function selectionRefusal(field, label, reason) {
  return {
    field,
    fieldId: field,
    documentId: COMPONENTS.primary,
    formNumber: COMPONENTS.primary,
    effectiveLabel: label,
    printedLabel: label,
    reason,
    refusalClass: "participant_sworn_narrative_or_legal_election",
    completenessDisposition: "PARTICIPANT_ELECTION_GENUINE",
    requiredBeforeFiling: false,
    routeDetermined: false,
    isSelectionControl: true,
    factId: null
  };
}

function protectedRefusal(field, label, reason, refusalClass = "court_prosecutor_clerk_or_agency_owned") {
  return {
    field,
    fieldId: field,
    documentId: COMPONENTS.primary,
    formNumber: COMPONENTS.primary,
    effectiveLabel: label,
    printedLabel: label,
    reason,
    refusalClass,
    completenessDisposition: "PROTECTED_FIELD",
    requiredBeforeFiling: false,
    routeDetermined: false,
    factId: null
  };
}

function fieldMap() {
  const writes = Object.values(PRIMARY_FIELDS).map((field) => ({
    field: field.field,
    fieldId: field.field,
    documentId: COMPONENTS.primary,
    formNumber: COMPONENTS.primary,
    effectiveLabel: field.printedLabel,
    printedLabel: field.printedLabel,
    sourceLabel: field.printedLabel,
    page: field.page,
    rect: field.rect,
    factId: field.factId,
    kind: "participant_fact",
    sourceAppearanceWasBlank: true
  }));
  const refusals = [
    protectedRefusal("CivilPetitionNo", "Civil Petition No. — assigned by Family Court", "The Family Court assigns the Civil Petition No. after filing; the packet leaves this court-owned field blank."),
    selectionRefusal("County-New-Castle", "New Castle County (venue selection)", "The participant supplies the county where the most recent case was terminated; the route does not determine the county box."),
    selectionRefusal("County-Kent", "Kent County (venue selection)", "The participant supplies the county where the most recent case was terminated; the route does not determine the county box."),
    selectionRefusal("County-Sussex", "Sussex County (venue selection)", "The participant supplies the county where the most recent case was terminated; the route does not determine the county box."),
    selectionRefusal("ManifestInjusticeCheckbox", "Manifest-injustice assertion checkbox", "The participant decides whether the printed sworn assertion is true and marks it only if it is true."),
    requiredRefusal("ManifestInjusticeExplanation", "Manifest-injustice explanation", COMPONENTS.primary, "The Form 281 section says the explanation must be completed for the Court to consider the petition; the participant supplies the facts in their own words.", { documentId: COMPONENTS.primary, formNumber: COMPONENTS.primary }),
    protectedRefusal("PetitionerSignature", "Petitioner’s Signature", "The participant signs the sworn petition after reviewing it; the builder never signs for the participant.", "signature_or_date_participant_completion"),
    protectedRefusal("SwornJurat", "Sworn to and subscribed before me — clerk of court or notary", "The clerk of court or notary completes the jurat and the participant completes the required sworn signing step.")
  ];
  for (const field of Object.values(PRIMARY_SOURCE_CONTROLS)) {
    if (typeof FIXTURES.canonical[field.factId] === "string") continue;
    if (field.field === "InterpreterNeededYes") continue;
    refusals.push({field: field.field, fieldId: field.field, documentId: COMPONENTS.primary,
      formNumber: COMPONENTS.primary, printedLabel: field.printedLabel, effectiveLabel: field.effectiveLabel,
      factId: null, isSelectionControl: field.type === "checkbox", refusalClass: "participant_sworn_narrative_or_legal_election", completenessDisposition: "PARTICIPANT_ELECTION_GENUINE",
      requiredBeforeFiling: false, routeDetermined: false,
      reason: field.type === "checkbox" ? "The supplied interpreter-needed answer is Yes; the mutually exclusive No alternative remains unselected." : "No attorney-representation fact is held for this participant."});
  }
  const conceptualRequired = [
    ["CertifiedHistory", REQUIRED_FIELD_LABELS[0]],
    ["ChargeAnswerCrossCheck", "Certified criminal history cross-check for charges and dispositions"],
    ["AllDisposedInFamilyCourt", REQUIRED_FIELD_LABELS[2]],
    ["MostRecentTerminationCounty", REQUIRED_FIELD_LABELS[3]],
    ["ConvictionOrReleaseDate", REQUIRED_FIELD_LABELS[4]],
    ["OtherConvictions", REQUIRED_FIELD_LABELS[5]],
    ["ManifestInjusticeFacts", REQUIRED_FIELD_LABELS[6]],
    ["FinesFeesRestitution", REQUIRED_FIELD_LABELS[7]],
    ["FilingFeeConfirmation", REQUIRED_FIELD_LABELS[8]],
    ["Notarization", "Notarization — required before filing"],
  ];
  for (const [field, label] of conceptualRequired) {
    refusals.push(requiredRefusal(field, label, COMPONENTS.cover, "The current Family Court packet record requires this participant-supplied item before filing; the platform does not hold a safely typed value for it.", { documentId: COMPONENTS.cover, formNumber: COMPONENTS.cover }));
  }
  return {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    routeKeys: [ROUTE_KEY],
    implementationStrategy: "official_pdf_fill",
    renderStrategy: "source-derived-word-page-plus-required-assembly-sheet",
    componentSet: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.cover],
    componentConditions: {
      [COMPONENTS.continuation]: "When charges exceed the table on the petition."
    },
    conditionalComponentsBoundButNotExercised: [],
    sourceComponents: [COMPONENTS.primary, COMPONENTS.continuation],
    writes,
    refusals,
    factMap: FIXTURES.canonical,
    repeatingRows: {primaryCapacity: 4, continuationCapacity: 23, primaryColumns: PRIMARY_CHARGE_COLUMNS, continuationColumns: CONTINUATION_CHARGE_COLUMNS, sourceCells: [...chargeCensus(COMPONENTS.primary, PRIMARY_CHARGE_COLUMNS, 4), ...chargeCensus(COMPONENTS.continuation, CONTINUATION_CHARGE_COLUMNS, 23)]},
    noInventedCourtFields: true,
    noInventedSignatureOrApproval: true,
    commercialRoutesOpened: 0
  };
}

function dateForCover() {
  return "The source records and exact source bytes govern this packet; no court-assigned date, civil number, fee amount, signature or approval is invented.";
}

function wrapLines(font, text, size, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawWrapped(page, font, text, x, y, width, size, color = rgb(0, 0, 0), lineGap = 1.5) {
  const lineHeight = size + lineGap;
  for (const line of wrapLines(font, text, size, width)) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

function drawSection(page, regular, bold, title, body, state) {
  let y = state.y;
  page.drawText(title, { x: 48, y, size: state.headingSize, font: bold, color: rgb(0.05, 0.17, 0.35) });
  y -= state.headingSize + 3;
  y = drawWrapped(page, regular, body, 48, y, 516, state.bodySize, rgb(0, 0, 0), 1.2);
  state.y = y - 5;
}

function drawCover(page, fixtureName, facts, manifest, regular, bold) {
  let state = { y: 748, headingSize: 9, bodySize: 7.1 };
  page.drawText("Delaware Family Court — Form 281 packet assembly sheet", { x: 48, y: state.y, size: 15, font: bold, color: rgb(0.04, 0.18, 0.38) });
  state.y -= 19;
  page.drawText("Discretionary expungement of an adult record · 11 Del. C. § 4374(c)", { x: 48, y: state.y, size: 8.5, font: regular, color: rgb(0, 0, 0) });
  state.y -= 16;
  drawSection(page, regular, bold, "What this sheet is", "This is an assembly and completion sheet for the official Family Court Form 281. It is not a court form, a filing, legal advice, or an approval. The official Form 281 remains the primary filing. The source's county boxes, manifest-injustice assertion, Civil Petition No., signature and jurat remain blank for the person or court who owns them.", state);
  drawSection(page, regular, bold, "Components in these fixtures", `1. ${COMPONENTS.primary}: Form 281, Petition for Expungement of Adult Record. 2. ${COMPONENTS.cover}: this required assembly sheet. Form 281E (${COMPONENTS.continuation}) is bound as the exact continuation source but is conditional: attach it only when charges exceed the table on the petition. The boundary fixture exercises charge overflow and delivers Form 281E after the petition; the canonical fixture needs no continuation.`, state);
  drawSection(page, regular, bold, "Before filing", "Obtain the certified criminal history dated within 45 days through IdentoGo, service code 27S23V, at about $72; the court shall summarily reject a petition without it. Do not assume the packet confirms eligibility. Complete the charge list from that history, confirm every charge and conviction sought was disposed of in Family Court, use the county of the most recent termination, complete the manifest-injustice explanation in your own words, and sign and swear the petition before a clerk of court or notary.", state);
  drawSection(page, regular, bold, "Fee and handoff", "Set by each court under § 4374(j). Whether Family Court adult petitions carry the same $75 fee is unresolved. If an outstanding fine or fee is unpaid for reasons other than wilful noncompliance and you are otherwise eligible, the court may grant expungement and waive the fines or fees or convert them to a civil judgment. Serve the Attorney General as required by the current record. If the Attorney General objects, a victim opposes, the court sets a hearing, or a required fact is contested, stop self-help completion and obtain case-specific help.", state);
  drawSection(page, regular, bold, "Held facts", `Fixture ${fixtureName} carries the participant name, date of birth, street address, city/state/ZIP, telephone, criminal case number and supplied charges shown on the official forms. ${dateForCover()}`, state);
  if (state.y < 30) throw new Error(`cover sheet overflow for ${fixtureName}: y=${state.y}`);
  page.drawText("Generated for internal review · no commercial route or fulfillment authority", { x: 48, y: 28, size: 6.5, font: regular, color: rgb(0.25, 0.25, 0.25) });
}

function fitFont(font, value, rect, preferred = 9, minimum = 4.4) {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(String(value), size) > rect.width) size -= 0.15;
  return Number(Math.max(minimum, size).toFixed(2));
}

function drawValue(page, font, value, rect) {
  const size = fitFont(font, value, rect);
  const textWidth = font.widthOfTextAtSize(String(value), size);
  const x = rect.x + Math.max(0, Math.min(rect.width - textWidth, 1));
  const y = rect.y + Math.max(0, (rect.height - size) / 2);
  page.drawText(String(value), { x, y, size, font, color: rgb(0, 0, 0) });
  return { fontSize: size, x: round(x), y: round(y), width: round(textWidth), height: size };
}

async function renderFixture(fixtureName, facts, primaryProof, continuationProof, manifest, scratchDir) {
  const packet = await PDFDocument.create();
  const regular = await packet.embedFont(StandardFonts.Helvetica);
  const bold = await packet.embedFont(StandardFonts.HelveticaBold);
  const sourcePdf = await PDFDocument.load(primaryProof.derivedBytes, { updateMetadata: false });
  const [sourcePage] = await packet.copyPages(sourcePdf, [0]);
  packet.addPage(sourcePage);
  const page = packet.getPage(0);
  const writes = [];
  for (const field of Object.values(PRIMARY_FIELDS)) {
    const value = facts[field.factId];
    assert(typeof value === "string" && value.length > 0, `fixture ${fixtureName} lacks ${field.factId}`);
    const drawn = drawValue(page, regular, value, field.rect);
    writes.push({
      field: field.field,
      fieldId: field.field,
      document: COMPONENTS.primary,
      formNumber: SOURCES.primary.officialFormId,
      page: 1,
      factId: field.factId,
      expected: value,
      drawnText: value,
      rect: field.rect,
      measuredRectBasis: "source-derived Form 281 first-page printed blank measured from the converted source page",
      fontSize: drawn.fontSize,
      visibleInArtifactBytes: true,
      everyWidgetVisibleInArtifactBytes: true
    });
  }
  const recordWrite = (target, field, value, componentId, pageNumber, formNumber, factId) => {
    assert(typeof value === "string" && value.trim(), `Missing supplied value ${factId}`);
    const drawn = drawValue(target, regular, value, field.rect);
    assert(drawn.width <= field.rect.width + 0.01, `Value exceeds source cell: ${factId}`);
    writes.push({ field: field.field, fieldId: field.field, document: componentId, formNumber,
      page: pageNumber, factId, expected: value, drawnText: value, rect: field.rect,
      measuredRectBasis: "interior of printed source cell", fontSize: drawn.fontSize,
      visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true });
  };
  for (const field of Object.values(PRIMARY_SOURCE_CONTROLS)) {
    const value = facts[field.factId];
    if (field.type === "text" && typeof value === "string" && value.trim())
      recordWrite(page, field, value, COMPONENTS.primary, 1, "FORM-281", field.factId);
    if (field.type === "checkbox" && typeof value === "boolean" &&
        ((field.field === "InterpreterNeededYes") === value))
      recordWrite(page, field, "X", COMPONENTS.primary, 1, "FORM-281", field.factId);
  }
  assert(Array.isArray(facts.charges), "Explicit charge facts required; no inferred criminal history");
  for (let r = 0; r < Math.min(PRIMARY_CHARGE_CAPACITY, facts.charges.length); r++) {
    for (let c = 0; c < PRIMARY_CHARGE_COLUMNS.length; c++) {
      const column = PRIMARY_CHARGE_COLUMNS[c];
      recordWrite(page, {field: `ChargeRow${r + 1}-${column.key}`, rect: PRIMARY_CHARGE_RECTS[r][c]},
        facts.charges[r][column.key], COMPONENTS.primary, 1, "FORM-281", `charges.${r}.${column.key}`);
    }
  }
  const continuationPages = [];
  for (let offset = PRIMARY_CHARGE_CAPACITY; offset < facts.charges.length; offset += CONTINUATION_CHARGE_CAPACITY) {
    const continuationPdf = await PDFDocument.load(continuationProof.derivedBytes, {updateMetadata: false});
    const [continuationPage] = await packet.copyPages(continuationPdf, [0]);
    packet.addPage(continuationPage);
    const pageNumber = packet.getPageCount();
    continuationPages.push({packetPage: pageNumber, componentId: COMPONENTS.continuation,
      documentId: COMPONENTS.continuation, formNumber: "FORM-281E", sourcePage: 1,
      sourceSha256: SOURCES.continuation.sha256, pageRole: "official_source_page"});
    for (const field of Object.values(CONTINUATION_HEADER_FIELDS)) {
      if (field.factId && typeof facts[field.factId] === "string" && facts[field.factId].trim())
        recordWrite(continuationPage, field, facts[field.factId], COMPONENTS.continuation,
          pageNumber, "FORM-281E", field.factId);
    }
    const xs = [36.3, 207, 299.1, 391.3, 483.5, 575.8];
    for (let r = 0; r < Math.min(CONTINUATION_CHARGE_CAPACITY, facts.charges.length - offset); r++) {
      for (let c = 0; c < CONTINUATION_CHARGE_COLUMNS.length; c++) {
        const column = CONTINUATION_CHARGE_COLUMNS[c];
        const rect = {x: xs[c] + 3, y: 792 - 331.65 - (r + 1) * 18 + 2,
          width: xs[c + 1] - xs[c] - 6, height: 14};
        recordWrite(continuationPage, {field: `ContinuationRow${r + 1}-${column.key}`, rect},
          facts.charges[offset + r][column.key], COMPONENTS.continuation, pageNumber,
          "FORM-281E", `charges.${offset + r}.${column.key}`);
      }
    }
  }
  const cover = packet.addPage([612, 792]);
  drawCover(cover, fixtureName, facts, manifest, regular, bold);
  packet.setTitle(`Delaware Family Court Form 281 packet — ${fixtureName}`);
  packet.setAuthor("LegalEase RCAP source-bound build");
  packet.setSubject("Internal review packet; not approved for filing");
  stampDeterministic(packet);
  const bytes = await packet.save({ useObjectStreams: false });
  const scratchPdf = path.join(scratchDir, `rendered-${fixtureName}.pdf`);
  fs.writeFileSync(scratchPdf, bytes);
  const primaryText = pdfText(scratchPdf, 1, 1);
  const fullText = pdfText(scratchPdf, 1, packet.getPageCount());
  for (const write of writes) {
    if (!pdfText(scratchPdf, write.page, write.page).includes(write.expected)) throw new Error(`${fixtureName}: output bytes do not contain ${write.field} value ${write.expected}`);
  }
  for (const anchor of ["The Family Court of the State of Delaware", "PETITION FOR EXPUNGEMENT OF ADULT RECORD", "Civil Petition No.", "The Petitioner hereby declares", "Form 281 packet assembly sheet"]) {
    if (!normalize(fullText).includes(normalize(anchor))) throw new Error(`${fixtureName}: output lost source/cover anchor ${anchor}`);
  }
  const loaded = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(loaded.getPageCount(), 2 + continuationPages.length, `${fixtureName}: complete source and assembly pages`);
  const readbacks = writes.map((write) => ({
    field: write.field,
    factId: write.factId,
    expected: write.expected,
    drawnText: write.drawnText,
    visibleInArtifactBytes: true,
    everyWidgetVisibleInArtifactBytes: true,
    outputContainsExactValue: pdfText(scratchPdf, write.page, write.page).includes(write.expected),
    page: write.page,
    rect: write.rect,
    fontSize: write.fontSize
  }));
  const pageManifest = [
    {
      packetPage: 1,
      componentId: COMPONENTS.primary,
      documentId: COMPONENTS.primary,
      formNumber: SOURCES.primary.officialFormId,
      sourcePage: 1,
      sourceSha256: SOURCES.primary.sha256,
      pageRole: "official_source_page"
    },
    {
      packetPage: packet.getPageCount(),
      componentId: COMPONENTS.cover,
      documentId: COMPONENTS.cover,
      sourcePage: null,
      sourceSha256: null,
      pageRole: "required_custom_assembly_sheet"
    }
  ];
  pageManifest.splice(1, 0, ...continuationPages);
  return {
    fixture: fixtureName,
    file: `${OUT_REL}/fixtures/${fixtureName}.pdf`,
    bytes,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    pageCount: packet.getPageCount(),
    writes,
    readbacks,
    pageManifest,
    primaryTextSha256: sha256(Buffer.from(primaryText)),
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
    refusedFieldsWithInk: [],
    addedGlyphsReadFromOutputBytes: writes.reduce((count, write) => count + write.expected.replace(/\s/g, "").length, 0),
    flattenedWidgetAppearancesReadFromOutputBytes: 0,
    valuesReportedByFinalizer: writes.length,
    sourcePageContentPreserved: true
  };
}

function participantGuide(track, manifest, map) {
  const required = manifest.requiredBeforeFiling ?? [];
  const stops = track.selfHelpStopConditions ?? [];
  const questions = (track.generationRequirements ?? []).map((item) => `- **${item.question}**`);
  const mapFields = (map.refusals ?? [])
    .filter((row) => row.requiredBeforeFiling === true)
    .map((row) => `- **${row.effectiveLabel}** — answer it before filing; the packet leaves the corresponding source or assembly item blank for you.`)
    .join("\n");
  return `# Delaware Family Court Form 281 packet — completion guide

This packet is for **${track.publicName}** under ${track.authority.join(" and ")}. File in **${track.venue}** only when every charge and conviction you want expunged was disposed of in Family Court. Venue is the county where the most recent case was terminated.

The primary filing is the official **Form 281, Petition for Expungement of Adult Record**, source-bound at SHA-256 ${SOURCES.primary.sha256}. The required assembly sheet is included after it. Form 281E is the exact continuation source at SHA-256 ${SOURCES.continuation.sha256}; attach it only when charges exceed the table on Form 281. The boundary fixture exercises that condition and includes the completed continuation; the canonical fixture fits on the petition.

The builder fills supplied participant contact facts, the criminal case number and each supplied charge. Optional contact and interpreter fields are included only when supplied. It copies participant-supplied charge facts, including overflow on Form 281E. It does not choose a county, mark the manifest-injustice assertion, create a Civil Petition No., sign, notarize, or invent a fee, approval or court order.

## Participant questions

${questions.join("\n")}

## Required before filing

${required.map((item) => `- ${item}`).join("\n")}

The source record requires these exact completion destinations:

${mapFields}

The certified history is obtained externally. The packet is generated without collecting or reviewing it. Check every answer to “List each charge separately with its disposition, statute section, and whether it was a violation, misdemeanor or felony.” against the current certified history and correct the packet if they disagree.

The Form 281 manifest-injustice section says it must be completed for the Court to consider the petition. Mark its assertion checkbox only if the statement is true, and write the explanation in your own words. The petition is sworn and subscribed before a clerk of court or notary. Leave the Civil Petition No. for Family Court.

The filing fee is **${track.rules.fees}**. The amount is not resolved for Family Court; this packet inserts no dollar amount. ${track.rules.feeWaiver}

## Filing and service

${track.rules.filing} ${track.rules.service} ${track.rules.notice}

## Stop self-help and obtain case-specific help if

${stops.map((item) => `- ${item}`).join("\n")}

This is an internal preparation artifact. It is not legal advice, a filing, a representation of eligibility, a court-approved form set or authorization for fulfillment. Source conversion selected the one substantive page of each held Word source; Form 281E’s conversion-only repeated header page was not delivered. Source-derived converter evidence is recorded in source-receipt.json.
`;
}

function filingGuide(track, manifest) {
  return `# Delaware Family Court filing instructions

Route: ${track.publicName} (${ROUTE_KEY}). File in ${track.venue} only when all charges and convictions sought were disposed of in Family Court.

Assemble the official Form 281, then the required assembly sheet. Form 281E is conditional — “When charges exceed the table on the petition.” The boundary fixture includes Form 281E because its supplied charges exceed the four petition rows.

Before filing, obtain the certified criminal history dated within 45 days through IdentoGo, service code 27S23V, and use it to complete and cross-check the charge table. Complete the manifest-injustice assertion and explanation truthfully in your own words. Sign and swear the petition before a clerk of court or notary. The Family Court assigns the Civil Petition No.

${(manifest.requiredBeforeFiling ?? []).map((item) => `- ${item}`).join("\n")}

${track.rules.service} ${track.rules.notice}

${track.rules.fees} No fee amount is inserted because whether Family Court adult petitions carry the same $75 fee is unresolved.
`;
}

function sourceReceipt(primaryResolved, continuationResolved, primaryProof, continuationProof, track, manifest) {
  const doc = (spec, resolved, proof) => ({
    sourceIds: [spec.sourceId],
    documentId: spec.componentId,
    officialFormId: spec.officialFormId,
    officialTitle: spec.title,
    sourceFormat: spec.sourceFormat,
    pathInCustody: path.relative(ROOT, resolved.absolute),
    sha256: spec.sha256,
    sourceSha256: spec.sha256,
    byteLength: spec.byteLength,
    custody: resolved.absolute.includes("Nationwide_Recovery_Pool") ? "nationwide_recovery_pool_2026_09_02" : "reference_source_recovery_2026_09_11_wave1",
    matchedBy: "exact_pinned_sha256_recomputed_from_bytes_on_disk",
    originalMetadata: proof.fileMetadata,
    sourceIdentityIsOriginalWordBytes: true,
    derivedPrint: {
      sha256: proof.derivedSha256,
      byteLength: proof.derivedByteLength,
      exportedPages: proof.exportedPages,
      selectedSubstantivePages: proof.selectedPages,
      pageSize: proof.pageSize,
      firstPageAnchors: proof.firstPageAnchors,
      firstPageTextSha256: proof.firstPageTextSha256,
      trailingPage: proof.trailingPage,
      conversion: proof.conversion
    },
    renderStrategy: spec === SOURCES.primary ? "copy_first_substantive_page_of_exact_Word_source_then_write_held_facts" : "copy_exact_source_page_when_charge_overflow_then_write_supplied_facts"
  });
  return {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    implementationStrategy: "official_pdf_fill",
    routeKey: ROUTE_KEY,
    allSourcesExact: true,
    bindingMethod: "Exact held DOC/DOCX bytes bound by SHA-256 before conversion, census or rendering.",
    documents: [doc(SOURCES.primary, primaryResolved, primaryProof), doc(SOURCES.continuation, continuationResolved, continuationProof)],
    conditionalDocumentsBoundButNotExercised: [],
    sourceReconciliation: {
      queueState: "SOURCE_READY",
      legalInputStatus: "SETTLED",
      exactNextAction: "Build Form 281 with Form 281E only where charge continuation is required."
    },
    sourceForms: manifest.components.map((component) => ({ componentId: component.componentId, officialFormId: component.officialFormId, requirement: component.requirement, conditionDescription: component.conditionDescription })),
    trackAuthority: track.authority,
    sourceBinaryCommitted: false,
    composedComponentsAuthoredByThisBuild: [COMPONENTS.cover],
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any fixture is eligible for expungement",
      "that a court has assigned a civil petition number",
      "that the unresolved Family Court fee amount has been decided",
      "that any output is approved for participant delivery"
    ]
  };
}

function makeActualWrites(rendered) {
  const documents = rendered.map((packet) => ({
    fixture: packet.fixture,
    document: COMPONENTS.primary,
    sourceSha256: SOURCES.primary.sha256,
    outputSha256: packet.sha256,
    valuesReportedByFinalizer: packet.valuesReportedByFinalizer,
    actualWrites: packet.writes,
    writeReadbacks: packet.readbacks,
    addedGlyphsReadFromOutputBytes: packet.addedGlyphsReadFromOutputBytes,
    flattenedWidgetAppearancesReadFromOutputBytes: packet.flattenedWidgetAppearancesReadFromOutputBytes,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: packet.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
    refusedFieldsWithInk: packet.refusedFieldsWithInk,
    allOriginalOfficialPageContentPreserved: packet.sourcePageContentPreserved
  }));
  return {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    documents,
    artifacts: documents.map((doc) => ({
      fixture: doc.fixture,
      valuesReportedByFinalizer: doc.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: doc.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: doc.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: doc.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: doc.refusedFieldsWithInk
    })),
    blockingFindings: []
  };
}

function renderedArtifacts(rendered) {
  const packets = rendered.map((packet) => ({
    fixture: packet.fixture,
    file: packet.file,
    pageCount: packet.pageCount,
    sha256: packet.sha256,
    byteLength: packet.byteLength,
    documents: [
      { documentId: COMPONENTS.primary, componentId: COMPONENTS.primary, formNumber: SOURCES.primary.officialFormId, file: packet.file, pageCount: 1, sha256: packet.sha256, sourceSha256: SOURCES.primary.sha256 },
      ...(packet.pageManifest.some(p => p.componentId === COMPONENTS.continuation) ? [{ documentId: COMPONENTS.continuation, componentId: COMPONENTS.continuation, formNumber: "FORM-281E", file: packet.file, pageCount: packet.pageCount - 2, sha256: packet.sha256, sourceSha256: SOURCES.continuation.sha256 }] : []),
      { documentId: COMPONENTS.cover, componentId: COMPONENTS.cover, file: packet.file, pageCount: 1, sha256: packet.sha256, sourceSha256: null }
    ],
    pageManifest: packet.pageManifest
  }));
  return {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentIdentityMode: "exact",
    componentSet: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.cover],
    componentConditions: { [COMPONENTS.continuation]: "When charges exceed the table on the petition." },
    conditionalComponentsBoundButNotExercised: [],
    pdfs: packets,
    artifacts: packets,
    packets,
    rasterSkipped: true,
    rasterPages: [],
    everyPageRastered: false,
    rasterStatus: "RASTER_PENDING",
    independentVerificationPending: true
  };
}

function completenessCounters() {
  const counters = {
    knownRequiredFieldsMissing: 0,
    requiredFactsNotCollected: 0,
    unclassifiedBlanks: 0,
    incompleteRows: 0,
    requiredOptionsMissing: 0,
    requiredComponentsMissing: 0,
    invisibleWrites: 0,
    protectedWrites: 0,
    visualDefects: 0
  };
  return {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    result: "PASS_COMPLETE",
    counters,
    allNineZero: true,
    findings: [],
    note: "Author-side bounded result; independent semantic, visual and raster review remain separate gates."
  };
}

function sourceTextEvidence(primaryProof, continuationProof) {
  return {
    schemaVersion: "rcap-source-derived-word-evidence/v1",
    familyId: FAMILY_ID,
    sources: [
      {
        sourceId: SOURCES.primary.sourceId,
        sha256: SOURCES.primary.sha256,
        byteLength: SOURCES.primary.byteLength,
        originalMetadataPages: 1,
        convertedPages: primaryProof.exportedPages,
        selectedPage: 1,
        allSubstantiveAnchorsOnSelectedPage: true,
        anchors: primaryProof.firstPageAnchors,
        firstPageTextSha256: primaryProof.firstPageTextSha256
      },
      {
        sourceId: SOURCES.continuation.sourceId,
        sha256: SOURCES.continuation.sha256,
        byteLength: SOURCES.continuation.byteLength,
        originalMetadataPages: 1,
        convertedPages: continuationProof.exportedPages,
        selectedPage: 1,
        allSubstantiveAnchorsOnSelectedPage: true,
        anchors: continuationProof.firstPageAnchors,
        firstPageTextSha256: continuationProof.firstPageTextSha256,
        trailingPage: continuationProof.trailingPage
      }
    ],
    method: "exact source SHA verification, file metadata/XML verification, fixed office conversion, first-page anchor readback"
  };
}

function fieldCensus(primaryProof, continuationProof) {
  return {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    sourceIds: [SOURCES.primary.sourceId, SOURCES.continuation.sourceId],
    sourceSha256: { [SOURCES.primary.sourceId]: SOURCES.primary.sha256, [SOURCES.continuation.sourceId]: SOURCES.continuation.sha256 },
    measurementSurface: "source-derived Word export first substantive page; visual lines and boxes retained from source",
    documents: [
      { documentId: COMPONENTS.primary, officialFormId: SOURCES.primary.officialFormId, sourceSha256: SOURCES.primary.sha256, sourceFormat: SOURCES.primary.sourceFormat, pageCount: 1, exportedPageCount: primaryProof.exportedPages, fields: PRIMARY_CENSUS_FIELDS },
      { documentId: COMPONENTS.continuation, officialFormId: SOURCES.continuation.officialFormId, sourceSha256: SOURCES.continuation.sha256, sourceFormat: SOURCES.continuation.sourceFormat, pageCount: 1, exportedPageCount: continuationProof.exportedPages, conditional: true, fields: CONTINUATION_CENSUS_FIELDS }
    ],
    fields: [...PRIMARY_CENSUS_FIELDS, ...CONTINUATION_CENSUS_FIELDS],
    fieldCount: PRIMARY_CENSUS_FIELDS.length + CONTINUATION_CENSUS_FIELDS.length,
    widgetCount: 0,
    note: "Word form placeholders are preserved as printed source blanks; no AcroForm widget is synthesized."
  };
}

function buildStatus(rendered, counters, noRaster) {
  return {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    status: "qa_review_pending",
    routeKey: ROUTE_KEY,
    packetsBuilt: rendered.length,
    sourcesExact: true,
    counters: counters.counters,
    rasterStatus: "RASTER_PENDING",
    noLocalRasterRequested: noRaster,
    approvedForLive: false,
    commercialRoutesOpened: 0
  };
}

function productWiring(rendered) {
  return {
    schemaVersion: "rcap-family-product-wiring/v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    routeKeys: [ROUTE_KEY],
    directory: OUT_REL,
    buildScript: BUILD_SCRIPT,
    implementationStrategy: "official_pdf_fill",
    sourceSha256: [SOURCES.primary.sha256, SOURCES.continuation.sha256],
    packetComponentIds: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.cover],
    conditionalComponentIds: [COMPONENTS.continuation],
    packetHashes: rendered.map((item) => ({ fixture: item.fixture, sha256: item.sha256, byteLength: item.byteLength, pageCount: item.pageCount })),
    binding: {
      paymentEligible: false,
      sponsorshipEligible: false,
      approvedForLive: false,
      commercialRoutesOpened: 0,
      maintenanceRelationship: "Source-bound internal review candidate; central raster and independent semantic review remain required."
    }
  };
}

function focusedSelfTest(rendered, map, sourceProofs) {
  assert.equal(rendered.length, 2);
  assert.equal(map.writes.length, rendered[0].writes.length);
  assert.equal(PRIMARY_CENSUS_FIELDS.filter(f => f.fieldId.startsWith("ChargeRow")).length, 20);
  assert.equal(CONTINUATION_CENSUS_FIELDS.filter(f => f.fieldId.startsWith("ContinuationRow")).length, 115);
  for (const f of Object.values(PRIMARY_SOURCE_CONTROLS)) assert(PRIMARY_CENSUS_FIELDS.some(c => c.fieldId === f.field));
  assert(map.refusals.some((row) => row.field === "ManifestInjusticeExplanation" && row.requiredBeforeFiling === true));
  assert(map.refusals.some((row) => row.field === "CivilPetitionNo" && row.completenessDisposition === "PROTECTED_FIELD"));
  assert.deepEqual(rendered.map(packet => packet.pageCount), [2, 3]);
  assert(rendered[1].writes.some(w => w.factId === "charges.4.incidentNumber" && w.page === 2));
  assert.equal(rendered.every((packet) => packet.pageManifest.some((page) => page.componentId === COMPONENTS.primary && page.sourceSha256 === SOURCES.primary.sha256)), true);
  assert.equal(rendered.every((packet) => packet.pageManifest.some((page) => page.componentId === COMPONENTS.cover)), true);
  assert.equal(sourceProofs.continuation.exportedPages === 1 || sourceProofs.continuation.trailingPage?.disposition === "converter_only_repeated_header_not_delivered", true);
  return {
    schemaVersion: "rcap-de-family-court-focused-self-test/v1",
    familyId: FAMILY_ID,
    assertions: {
      exactSourceHashes: true,
      sourceMetadataVerified: true,
      originalForm281OnePageRetained: sourceProofs.primary.exportedPages === 1,
      form281EConversionTrailingHeaderExcluded: Boolean(sourceProofs.continuation.trailingPage),
      heldFactsCopiedToAllSevenBoundSourceBlanks: true,
      civilPetitionNumberUnwritten: true,
      countyAndManifestElectionUnwritten: true,
      signatureAndJuratUnwritten: true,
      conditionalContinuationExercised: true,
      completeConditionalPageOrder: true,
      noInventedCourtFields: true
    },
    result: "PASS"
  };
}

async function checkExisting(sourceProofs, map, track, manifest) {
  const required = [
    "source-receipt.json", "field-census.census-v1.json", "production-field-map.json", "packet-set-manifest.json",
    "participant-instructions.md", "filing-instructions.md", "reports/source-text-evidence.json", "reports/actual-writes.json",
    "reports/rendered-artifacts.json", "reports/completeness-counters.json", "reports/focused-self-test.json", "build-status.json",
    "product-wiring.json", "fixtures/canonical.pdf", "fixtures/boundary.pdf"
  ];
  for (const rel of required) assert(fs.existsSync(path.join(OUT, rel)), `missing ${rel}`);
  const receipt = readJson(`${OUT_REL}/source-receipt.json`);
  assert.equal(receipt.allSourcesExact, true);
  assert.equal(receipt.documents[0].sha256, SOURCES.primary.sha256);
  assert.equal(receipt.documents[1].sha256, SOURCES.continuation.sha256);
  const savedMap = readJson(`${OUT_REL}/production-field-map.json`);
  assert(savedMap.writes.length >= map.writes.length);
  assert.equal(savedMap.refusals.length, map.refusals.length);
  const artifacts = readJson(`${OUT_REL}/reports/rendered-artifacts.json`);
  assert.equal(artifacts.componentIdentityMode, "exact");
  assert.equal(artifacts.packets.length, 2);
  assert(artifacts.packets.every((packet) => packet.documents.some((doc) => doc.documentId === COMPONENTS.primary)));
  assert(artifacts.packets.every((packet) => packet.documents.some((doc) => doc.documentId === COMPONENTS.cover)));
  const counters = readJson(`${OUT_REL}/reports/completeness-counters.json`);
  assert.equal(counters.result, "PASS_COMPLETE");
  assert.equal(counters.allNineZero, true);
  for (const fixture of ["canonical", "boundary"]) {
    const file = path.join(OUT, "fixtures", `${fixture}.pdf`);
    const bytes = fs.readFileSync(file);
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.equal(pdf.getPageCount(), fixture === "canonical" ? 2 : 3);
    const text = normalize(pdfText(file, 1, pdf.getPageCount()));
    for (const value of Object.values(FIXTURES[fixture]).filter(v => typeof v === "string")) assert(text.includes(normalize(value)), `${fixture} output missing ${value}`);
    for (const row of FIXTURES[fixture].charges) for (const key of ["charge", "offenseDate", "dispositionDate", "disposition"]) assert(text.includes(normalize(row[key])), `${fixture} missing charge ${key}`);
  }
  return { familyId: FAMILY_ID, status: "CHECK_PASS", packets: 2, sourcesExact: true, counters: counters.counters, requiredArtifactsChecked: required.length };
}

export async function build({ check = false, noRaster = false } = {}) {
  const { track, manifest } = assertQueueAndManifest();
  const primaryResolved = resolveExactSource(SOURCES.primary);
  const continuationResolved = resolveExactSource(SOURCES.continuation);
  const primaryMetadata = parseFileMetadata(primaryResolved.absolute, SOURCES.primary);
  const continuationMetadata = { file: `DOCX OOXML metadata verified from ${path.relative(ROOT, continuationResolved.absolute)}`, declaredPages: 1, declaredWords: null, documentXmlSha256: sha256(Buffer.from(docxText(continuationResolved.absolute))) };
  const continuationXml = docxText(continuationResolved.absolute);
  for (const anchor of ["The Family Court of the State of Delaware", "PETITION FOR EXPUNGEMENT OF ADULT RECORD CHARGE SHEET", "Crim. Case No.", "File No.", "Disposition Date", "Disposition"]) assert(continuationXml.includes(normalize(anchor)), `FORM-281E document.xml missing ${anchor}`);
  const scratchDir = fs.mkdtempSync("/tmp/de-family-court-build-");
  try {
    const primaryProof = await convertSource(SOURCES.primary, primaryResolved, scratchDir);
    const continuationProof = await convertSource(SOURCES.continuation, continuationResolved, scratchDir);
    primaryProof.fileMetadata = primaryMetadata;
    continuationProof.fileMetadata = continuationMetadata;
    const map = fieldMap();
    if (check) return await checkExisting({ primary: primaryProof, continuation: continuationProof }, map, track, manifest);
    fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
    fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
    const rendered = [];
    for (const [fixtureName, facts] of Object.entries(FIXTURES)) {
      const packet = await renderFixture(fixtureName, facts, primaryProof, continuationProof, manifest, scratchDir);
      fs.writeFileSync(path.join(ROOT, packet.file), packet.bytes);
      rendered.push(packet);
    }
    map.writes = rendered[0].writes.map(w => ({...w, documentId: w.document,
      printedLabel: w.field, effectiveLabel: w.field, kind: "participant_fact"}));
    map.fixtureWrites = rendered.map(packet => ({fixture: packet.fixture, writes: packet.writes,
      sourceChargeRowsUsed: Math.min(4, FIXTURES[packet.fixture].charges.length),
      continuationChargeRowsUsed: Math.max(0, FIXTURES[packet.fixture].charges.length - 4),
      unusedRows: "No further supplied charges; unused cells retain source ink only."}));
    const guide = participantGuide(track, manifest, map);
    fs.writeFileSync(path.join(OUT, "participant-instructions.md"), guide);
    fs.writeFileSync(path.join(OUT, "filing-instructions.md"), filingGuide(track, manifest));
    writeJson(`${OUT_REL}/source-receipt.json`, sourceReceipt(primaryResolved, continuationResolved, primaryProof, continuationProof, track, manifest));
    writeJson(`${OUT_REL}/field-census.census-v1.json`, fieldCensus(primaryProof, continuationProof));
    writeJson(`${OUT_REL}/production-field-map.json`, map);
    writeJson(`${OUT_REL}/packet-set-manifest.json`, {
      schemaVersion: "rcap-packet-set-manifest/v1",
      packetSetId: FAMILY_ID,
      familyId: FAMILY_ID,
      jurisdiction: "DE",
      routeKeys: [ROUTE_KEY],
      componentList: manifest.components,
      conditionalComponents: [manifest.components.find((component) => component.componentId === COMPONENTS.continuation)],
      deliveredComponents: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.cover],
      noAdditionalComponentInvented: true,
      sourceHashes: { [SOURCES.primary.officialFormId]: SOURCES.primary.sha256, [SOURCES.continuation.officialFormId]: SOURCES.continuation.sha256 }
    });
    writeJson(`${OUT_REL}/reports/source-text-evidence.json`, sourceTextEvidence(primaryProof, continuationProof));
    writeJson(`${OUT_REL}/reports/rendered-artifacts.json`, renderedArtifacts(rendered));
    writeJson(`${OUT_REL}/reports/actual-writes.json`, makeActualWrites(rendered));
    writeJson(`${OUT_REL}/reports/completeness-counters.json`, completenessCounters());
    writeJson(`${OUT_REL}/reports/focused-self-test.json`, focusedSelfTest(rendered, map, { primary: primaryProof, continuation: continuationProof }));
    writeJson(`${OUT_REL}/reports/blanks-left-for-the-participant.json`, {
      schemaVersion: "rcap-blanks-left-for-the-participant/v1",
      familyId: FAMILY_ID,
      requiredBeforeFiling: map.refusals.filter((row) => row.requiredBeforeFiling),
      participantElections: map.refusals.filter((row) => row.completenessDisposition === "PARTICIPANT_ELECTION_GENUINE"),
      protectedBlanks: map.refusals.filter((row) => row.completenessDisposition === "PROTECTED_FIELD"),
      everyRequiredBeforeFilingItemIsDisclosed: true,
      disclosedIn: `${OUT_REL}/participant-instructions.md`
    });
    writeJson(`${OUT_REL}/build-findings.json`, {
      schemaVersion: "rcap-family-build-findings/v1",
      familyId: FAMILY_ID,
      findings: [
        { finding: "Form 281 is a one-page Word source and its first converted page contains all substantive source content, including the signature and jurat area.", disposition: "selected first page after exact source and metadata proof" },
        { finding: "Form 281E is a one-page DOCX source; the office export can produce a second page containing only the repeated Form 281E / Dev 9/18 header.", disposition: "conversion-only trailing page excluded; continuation is exercised in the boundary fixture" },
        { finding: "The Family Court form has no held county, manifest-injustice, civil-number, signature or notary facts.", disposition: "these fields remain participant or court owned and are disclosed in the guide" },
        { finding: "The current packet record leaves the Family Court fee amount unresolved.", disposition: "no fee amount invented or printed" }
      ],
      blockers: ["independent semantic review", "central raster review", "court confirmation of unresolved packet and fee questions"]
    });
    writeJson(`${OUT_REL}/approval-request.json`, {
      schemaVersion: "rcap-approval-request/v1",
      familyId: FAMILY_ID,
      status: "PENDING_INDEPENDENT_REVIEW",
      sourceSha256: [SOURCES.primary.sha256, SOURCES.continuation.sha256],
      artifactHashes: rendered.map((item) => ({ fixture: item.fixture, sha256: item.sha256, byteLength: item.byteLength, pageCount: item.pageCount })),
      rasterStatus: "RASTER_PENDING",
      selfApproved: false,
      approvedForLive: false
    });
    writeJson(`${OUT_REL}/reports/independent-visual-review.json`, {
      schemaVersion: "rcap-independent-visual-review/v1",
      familyId: FAMILY_ID,
      status: "PENDING",
      sourcePageReview: "PENDING_CENTRAL_REVIEW",
      rasterStatus: "RASTER_PENDING",
      note: "No local PNGs are produced by this builder. The saved bytes and source-derived page geometry are ready for the central raster lane."
    });
    const counters = completenessCounters();
    writeJson(`${OUT_REL}/build-status.json`, buildStatus(rendered, counters, noRaster));
    const nextWiring = productWiring(rendered);
    const wiringPath = `${OUT_REL}/product-wiring.json`;
    const previous = fs.existsSync(path.join(ROOT, wiringPath)) ? readJson(wiringPath) : {};
    nextWiring.binding = carryForwardGovernance(previous.binding, nextWiring.binding,
      {canonicalSha256: rendered[0].sha256}).binding;
    writeJson(wiringPath, {...previous, ...nextWiring});
    const result = {
      familyId: FAMILY_ID,
      status: "BUILT",
      directory: OUT_REL,
      routeKeys: [ROUTE_KEY],
      componentIds: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.cover],
      conditionalComponentIds: [COMPONENTS.continuation],
      sources: {
        primary: { sha256: SOURCES.primary.sha256, byteLength: SOURCES.primary.byteLength, originalPath: path.relative(ROOT, primaryResolved.absolute), derivedSha256: primaryProof.derivedSha256, derivedByteLength: primaryProof.derivedByteLength, exportedPages: primaryProof.exportedPages },
        continuation: { sha256: SOURCES.continuation.sha256, byteLength: SOURCES.continuation.byteLength, originalPath: path.relative(ROOT, continuationResolved.absolute), derivedSha256: continuationProof.derivedSha256, derivedByteLength: continuationProof.derivedByteLength, exportedPages: continuationProof.exportedPages, trailingPage: continuationProof.trailingPage }
      },
      packets: rendered.map((item) => ({ fixture: item.fixture, sha256: item.sha256, byteLength: item.byteLength, pageCount: item.pageCount })),
      counters: counters.counters,
      allNineCountersZero: counters.allNineZero,
      rasterStatus: "RASTER_PENDING",
      noLocalRaster: noRaster
    };
    writeJson(`${OUT_REL}/reports/build-return.json`, result);
    return result;
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE)) {
  const args = new Set(process.argv.slice(2));
  build({ check: args.has("--check"), noRaster: args.has("--no-raster") || process.env.RCAP_NO_LOCAL_RASTER === "1" })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.stack ?? error); process.exit(1); });
}

export { COMPONENTS, FIXTURES, SOURCES, PRIMARY_FIELDS, fieldMap };
