#!/usr/bin/env node
// C11 EAST packet/pleading evidence builder.
//
// This family-named module contains the bounded shared engine for the NJ/NY/PA/RI
// official-form families and the Ohio evidence-only pleading families assigned
// to the EAST lane. Sibling entrypoints import runEastFamily; no shared manifest
// or runtime helper is changed. A successful build is evidence for review,
// never commercial or runtime authority.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  captureWidgetContext, extractPageGeometry, extractTextItems, groupIntoLines, normalizeHarvestedText,
} from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import {
  finalizeFlatOverlay, finalizeOfficialForm, PARTICIPANT_INK_RGB,
} from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { drawnAt, flattenedWidgets } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import { protectCategoryOf, regionProtectCategoryOf, resolveFact } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { fitTextToWidget } from "./rcap-official-forms/rcap-text-fitting.mjs";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const {
  PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown,
  PDFOptionList, PDFRawStream, PDFName, StandardFonts, decodePDFRawStream,
  pushGraphicsState, popGraphicsState, translate, drawObject,
} = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ENV = "MASTER_LIBRARY_SOURCE_DIR";
const FIXED_DATE = "2026-08-30T00:00:00.000Z";
const POPPLER_PDFTOPPM = process.env.RCAP_PDFTOPPM || "pdftoppm";
const RASTER_DPI = 72;
const sharp = require("sharp");

function assertPopplerAvailable() {
  const probe = spawnSync(POPPLER_PDFTOPPM, ["-v"], { encoding: "utf8" });
  assert.ifError(probe.error);
  assert.equal(probe.status, 0,
    `Poppler pdftoppm is unavailable via RCAP_PDFTOPPM/PATH: ${probe.stderr || probe.stdout}`);
}

function rasterLooksBlank(stats) {
  const channel = stats.channels?.[0];
  assert.ok(channel, "raster statistics must include a greyscale channel");
  return channel.max - channel.min <= 6;
}

async function rasterizePdf({ file, outDir, pages = null, prefix = "page" }) {
  assertPopplerAvailable();
  fs.mkdirSync(outDir, { recursive: true });
  const pageSelection = pages && pages.length
    ? pages.flatMap((page) => ["-f", String(page), "-l", String(page)])
    : [];
  // All production calls raster every page in one pass. A page selection is
  // accepted only for a single page, for focused diagnostics.
  assert.ok(!pages || pages.length === 1, "Poppler raster helper accepts all pages or one diagnostic page");
  const targetPrefix = path.join(outDir, `${prefix}-raw`);
  const run = spawnSync(POPPLER_PDFTOPPM,
    ["-png", "-r", String(RASTER_DPI), ...pageSelection, file, targetPrefix],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  assert.equal(run.status, 0, `Poppler raster failed for ${file}: ${run.stderr || run.stdout}`);
  const found = fs.readdirSync(outDir)
    .map((name) => ({ name, match: new RegExp(`^${prefix}-raw-(\\d+)\\.png$`).exec(name) }))
    .filter((row) => row.match)
    .map((row) => ({ ...row, page: Number(row.match[1]) }))
    .sort((a, b) => a.page - b.page);
  const rows = [];
  for (const row of found) {
    const output = path.join(outDir, `${prefix}-${String(row.page).padStart(2, "0")}.png`);
    fs.renameSync(path.join(outDir, row.name), output);
    const metadata = await sharp(output).metadata();
    const stats = await sharp(output).greyscale().stats();
    const looksBlank = rasterLooksBlank(stats);
    rows.push({
      page: row.page, file: output, widthPx: metadata.width, heightPx: metadata.height,
      attempts: 1, looksBlank, croppedToPage: true,
      engine: "bundled_poppler_pdftoppm", dpi: RASTER_DPI,
    });
  }
  return rows;
}

function assertFailClosedEvidence(value, context) {
  const requiredValues = new Map([
    ["generationAllowed", false],
    ["runtimeSelectable", false],
    ["commercialRoutesOpened", 0],
    ["createsFulfillmentRecord", false],
    ["opensCommercialRoute", false],
    ["grantedBy", null],
  ]);
  const visit = (current, location) => {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${location}[${index}]`));
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, item] of Object.entries(current)) {
      if (requiredValues.has(key) && item !== requiredValues.get(key)) {
        throw new Error(`${context}: fail-closed evidence violation at ${location}.${key}`);
      }
      visit(item, `${location}.${key}`);
    }
  };
  visit(value, "$record");
}

async function verifyFreshPopplerRaster({ pdfFile, raster, pdfPages, label }) {
  assert.equal(raster.engine, "bundled_poppler_pdftoppm", `${label}: unexpected raster engine`);
  assert.equal(raster.dpi, RASTER_DPI, `${label}: unexpected raster DPI`);
  assert.deepEqual(raster.pages.map((page) => page.page),
    Array.from({ length: pdfPages.length }, (_, index) => index + 1),
    `${label}: recorded raster pages do not cover the PDF exactly once in order`);
  const resolveFile = (file) => path.isAbsolute(file) ? file : abs(file);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-east-poppler-check-"));
  try {
    const freshRows = await rasterizePdf({
      file: resolveFile(pdfFile), outDir: tempDir, prefix: "page",
    });
    assert.deepEqual(freshRows.map((page) => page.page),
      Array.from({ length: pdfPages.length }, (_, index) => index + 1),
      `${label}: fresh Poppler replay did not cover every PDF page exactly once`);
    for (const [index, fresh] of freshRows.entries()) {
      const recorded = raster.pages[index];
      const recordedBytes = fs.readFileSync(resolveFile(recorded.file));
      const freshBytes = fs.readFileSync(fresh.file);
      assert.equal(recordedBytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a",
        `${label}/page ${index + 1}: recorded raster is not PNG`);
      assert.equal(freshBytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a",
        `${label}/page ${index + 1}: fresh Poppler replay is not PNG`);
      assert.equal(sha256(recordedBytes), recorded.sha256,
        `${label}/page ${index + 1}: recorded raster hash drift`);
      assert.equal(recordedBytes.length, recorded.byteLength,
        `${label}/page ${index + 1}: recorded raster byte drift`);
      assert.equal(freshBytes.equals(recordedBytes), true,
        `${label}/page ${index + 1}: fresh Poppler PNG bytes differ from recorded raster`);
      assert.equal(sha256(freshBytes), recorded.sha256,
        `${label}/page ${index + 1}: fresh Poppler hash differs from recorded evidence`);
      assert.equal(freshBytes.length, recorded.byteLength,
        `${label}/page ${index + 1}: fresh Poppler byte length differs from recorded evidence`);
      const metadata = await sharp(freshBytes).metadata();
      const stats = await sharp(freshBytes).greyscale().stats();
      const looksBlank = rasterLooksBlank(stats);
      const geometry = pdfPages[index].getSize();
      const expectedWidth = Math.round(geometry.width * RASTER_DPI / 72);
      const expectedHeight = Math.round(geometry.height * RASTER_DPI / 72);
      assert.equal(metadata.width, recorded.widthPx,
        `${label}/page ${index + 1}: fresh Poppler width differs from recorded evidence`);
      assert.equal(metadata.height, recorded.heightPx,
        `${label}/page ${index + 1}: fresh Poppler height differs from recorded evidence`);
      assert.ok(Math.abs(metadata.width - expectedWidth) <= 1,
        `${label}/page ${index + 1}: fresh Poppler width differs from live PDF geometry`);
      assert.ok(Math.abs(metadata.height - expectedHeight) <= 1,
        `${label}/page ${index + 1}: fresh Poppler height differs from live PDF geometry`);
      assert.equal(looksBlank, false, `${label}/page ${index + 1}: fresh Poppler raster is blank`);
      assert.equal(recorded.looksBlank, false, `${label}/page ${index + 1}: recorded blank flag drift`);
      assert.equal(recorded.croppedToPage, true, `${label}/page ${index + 1}: recorded crop flag drift`);
      assert.equal(recorded.engine, raster.engine, `${label}/page ${index + 1}: raster engine drift`);
      assert.equal(recorded.dpi, raster.dpi, `${label}/page ${index + 1}: raster DPI drift`);
    }
    return true;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function writeContactSheet(rasterRows, output) {
  assert.ok(rasterRows.length > 0, "cannot build an empty contact sheet");
  const thumbWidth = 153;
  const firstMeta = await sharp(rasterRows[0].file).metadata();
  const thumbHeight = Math.max(1, Math.round(firstMeta.height * thumbWidth / firstMeta.width));
  const columns = Math.min(5, rasterRows.length);
  const rows = Math.ceil(rasterRows.length / columns);
  const composites = [];
  for (let index = 0; index < rasterRows.length; index += 1) {
    const buffer = await sharp(rasterRows[index].file)
      .resize({ width: thumbWidth, height: thumbHeight, fit: "contain", background: "white" }).png().toBuffer();
    composites.push({ input: buffer, left: (index % columns) * thumbWidth, top: Math.floor(index / columns) * thumbHeight });
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await sharp({ create: { width: columns * thumbWidth, height: rows * thumbHeight,
    channels: 3, background: { r: 236, g: 236, b: 236 } } })
    .composite(composites).png().toFile(output);
  return { file: output, sha256: sha256(fs.readFileSync(output)), byteLength: fs.statSync(output).size,
    pageCount: rasterRows.length, columns, widthPx: columns * thumbWidth, heightPx: rows * thumbHeight };
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const abs = (relativePath) => path.join(rootDir, relativePath);
const readJson = (relativePath) => JSON.parse(fs.readFileSync(abs(relativePath), "utf8"));
const writeJson = (relativePath, value) => {
  fs.mkdirSync(path.dirname(abs(relativePath)), { recursive: true });
  fs.writeFileSync(abs(relativePath), `${JSON.stringify(value, null, 2)}\n`);
};
const writeText = (relativePath, value) => {
  fs.mkdirSync(path.dirname(abs(relativePath)), { recursive: true });
  fs.writeFileSync(abs(relativePath), value.endsWith("\n") ? value : `${value}\n`);
};
const writeBytes = (relativePath, bytes) => {
  fs.mkdirSync(path.dirname(abs(relativePath)), { recursive: true });
  fs.writeFileSync(abs(relativePath), bytes);
};

const factsCanonical = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.first_name": "Jordan", "participant.middle_name": "Avery", "participant.last_name": "Reyes",
  "participant.street_address": "118 Maple Street", "participant.address_line_2": "Apartment 4B",
  "participant.city": "Albany", "participant.state": "NY", "participant.zip": "12207",
  "participant.city_state_zip": "Albany, NY 12207", "participant.phone": "518-555-0142",
  "participant.email": "jordan.reyes@example.com", "participant.date_of_birth": "1991-04-17",
  "matter.county": "Albany County", "matter.court": "Example Court",
  "matter.case_number": "24-CR-001234", "matter.docket_number": "24-CR-001234",
  "matter.citation_number": "C-889201", "matter.charge": "Possession of a controlled substance",
  "matter.arrest_date": "2019-03-08", "matter.offense_date": "2019-03-08",
  "matter.citing_or_arresting_agency": "Example Police Department",
  "matter.conviction_date": "2019-11-02", "matter.disposition_date": "2020-01-15",
  "deterministic.filing_date": "2026-08-30",
  "matter.charges": [{ case_number: "24-CR-001234", citation_number: "C-889201",
    charge: "Possession of a controlled substance", arrest_date: "2019-03-08",
    offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }],
};
const factsBoundary = {
  ...factsCanonical,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.first_name": "Alexandrina-Katharine", "participant.middle_name": "Montgomery-Vandenberg-Oyelaran",
  "participant.last_name": "Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7",
  "participant.address_line_2": "Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, NY 12207-9999",
  "participant.zip": "12207-9999", "participant.phone": "518-555-0142 extension 44821",
  "participant.email": "alexandrina.montgomery.vandenberg.oyelaran.fitzwilliam@example.gov",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.docket_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.charge": "Possession of a controlled substance with an unusually long statutory description",
  "matter.charges": [{ case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201",
    citation_number: "CITATION-2026-000000000000889201",
    charge: "Possession of a controlled substance with an unusually long statutory description",
    arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }],
};

function factsForJurisdiction(jurisdiction, boundary = false) {
  const location = {
    NJ: { city: "Newark", state: "NJ", zip: "07102", county: "Essex County", phone: "973-555-0142" },
    NY: { city: "Albany", state: "NY", zip: "12207", county: "Albany County", phone: "518-555-0142" },
    PA: { city: "Harrisburg", state: "PA", zip: "17101", county: "Dauphin County", phone: "717-555-0142" },
    RI: { city: "Providence", state: "RI", zip: "02903", county: "Providence County", phone: "401-555-0142" },
  }[jurisdiction];
  assert.ok(location, `no jurisdiction fixture location for ${jurisdiction}`);
  const base = boundary ? factsBoundary : factsCanonical;
  const city = boundary ? `Unincorporated Township of Long Hollow Crossing near ${location.city}` : location.city;
  const zip = boundary ? `${location.zip}-9999` : location.zip;
  const county = boundary ? `Saint Bartholomew and the Northern Reaches ${location.county}` : location.county;
  return {
    ...base,
    "participant.city": city,
    "participant.state": location.state,
    "participant.zip": zip,
    "participant.city_state_zip": `${city}, ${location.state} ${zip}`,
    "participant.phone": boundary ? `${location.phone} extension 44821` : location.phone,
    "matter.county": county,
  };
}

function source({ key, id, role, title, revision, pathInArchive, hash, bytes, render = true, allow = {}, selections = [] }) {
  return { key, documentId: id, documentRole: role, officialTitle: title, revision,
    pathInArchive, sha256: hash, byteLength: bytes, render, allow, selections };
}
function cloneDoc(base, additions = {}) {
  return { ...base, ...additions, allow: { ...(base.allow ?? {}), ...(additions.allow ?? {}) },
    selections: additions.selections ?? base.selections ?? [] };
}

const NJ_SOURCE = source({
  key: "cn-10557", id: "NJ-CN-10557", role: "EXPUNGEMENT_KIT_WITH_PARTICIPANT_AND_LATER_ACT_BLOCKS",
  title: "New Jersey Expungement Kit CN-10557", revision: "REV-2020-06",
  pathInArchive: "STATES/NJ/02_PACKET_FORMS/NJ__FORM__CN-10557__cn-10557-new-jersey-expungement-kit__REV-2020-06__EN.pdf",
  hash: "c1dd37b5e27bd76ea2330b07f51847c420d359db8f10c0576682e6558d09c5f7", bytes: 1924831,
});
const PA_490_PETITION = source({ key: "rule-490-petition", id: "PA-RCRIM-P-490-PETITION", role: "PRIMARY_PETITION", title: "Pennsylvania Rule of Criminal Procedure 490 Petition", revision: "REV-2009-03", pathInArchive: "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-490-PETITION__pa-r-crim-p-490-petition__REV-2009-03__EN.pdf", hash: "082c515ce5a60de33798508c6dd76589f83758ac2ddd8244e934b379ce05def3", bytes: 87204 });
const PA_490_ORDER = source({ key: "rule-490-order", id: "PA-RCRIM-P-490-ORDER", role: "PROPOSED_ORDER_WITH_COURT_BLOCKS", title: "Pennsylvania Rule of Criminal Procedure 490 Blank Expungement Order", revision: "REV-2006-03", pathInArchive: "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-490-ORDER__pa-r-crim-p-490-blank-expungement-order__REV-2006-03__EN.pdf", hash: "ac671421035b12b61d3cfbfaac04bb5676f619b968db879f6992e3279110ce90", bytes: 143399 });
const PA_790_PETITION = source({ key: "rule-790-petition", id: "PA-RCRIM-P-790-PETITION", role: "PRIMARY_PETITION", title: "Pennsylvania Rule of Criminal Procedure 790 Petition", revision: "REV-2009-03", pathInArchive: "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-790-PETITION__pa-r-crim-p-790-petition__REV-2009-03__EN.pdf", hash: "fc06486e75773d4f6d81c263706827ab7f9facfb6dde9907cbee120c063289de", bytes: 87647 });
const PA_790_ORDER = source({ key: "rule-790-order", id: "PA-RCRIM-P-790-ORDER", role: "PROPOSED_ORDER_WITH_COURT_BLOCKS", title: "Pennsylvania Rule of Criminal Procedure 790 Blank Expungement Order", revision: "REV-2021-07", pathInArchive: "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-790-ORDER__pa-r-crim-p-790-blank-expungement-order__REV-2021-07__EN.pdf", hash: "4d312ebde4aed7c1941e1ae9d734c90ba7183db273778839b15a84be8e611c95", bytes: 151853 });
const PA_791_PETITION = source({ key: "rule-791-petition", id: "PA-RCRIM-P-791-PETITION", role: "PRIMARY_PETITION", title: "Pennsylvania Rule of Criminal Procedure 791 Petition for Limited Access", revision: "REV-UNKNOWN", pathInArchive: "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-791-PETITION__pa-r-crim-p-791-petition-for-order-for-limited-access__REV-UNKNOWN__EN.pdf", hash: "945a630595c8f6fcbbfaf4f5532fc54ab7267ac585d2cb523bf0f5975d21c2ab", bytes: 673358 });
const PA_791_ORDER = source({ key: "rule-791-order", id: "PA-RCRIM-P-791-ORDER", role: "PROPOSED_ORDER_WITH_COURT_BLOCKS", title: "Pennsylvania Rule of Criminal Procedure 791 Order for Limited Access", revision: "REV-UNKNOWN", pathInArchive: "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-791-ORDER__pa-r-crim-p-791-order-for-limited-access__REV-UNKNOWN__EN.pdf", hash: "99a7704e7d68c0478ef0be1d6c08a79f552a9f439d9468d6476c10e8a5c377cf", bytes: 803224 });
const PA_IFP_MDJ = source({ key: "ifp-mdj-source-only", id: "PA-IFP-MDJ", role: "CONDITIONAL_FEE_WAIVER_SOURCE_ONLY", title: "Pennsylvania Magisterial District Court In Forma Pauperis Affidavit", revision: "REV-UNKNOWN", pathInArchive: "STATES/PA/04_SUPPORTING_PROCESS/PA__SUPPORT__PA-IFP-MDJ__magisterial-district-court-in-forma-pauperis-affidavit__REV-UNKNOWN__EN.pdf", hash: "91fa3ce45096bffb221cec09071ba617e063395b0fbb4dcd733c0f7fa29f3ca2", bytes: 1233641, render: false });
const PA_IFP_CCP = source({ key: "ifp-ccp-source-only", id: "PA-IFP-CCP", role: "CONDITIONAL_FEE_WAIVER_SOURCE_ONLY", title: "Pennsylvania Court of Common Pleas Motion to Proceed In Forma Pauperis", revision: "REV-UNKNOWN", pathInArchive: "STATES/PA/04_SUPPORTING_PROCESS/PA__SUPPORT__PA-IFP-CCP__court-of-common-pleas-motion-to-proceed-in-forma-pauperis__REV-UNKNOWN__EN.pdf", hash: "b1255ef0503f9c9ff0565e884083e37fe4072e4e9999bec159712d467d420fca", bytes: 760989, render: false });
const OH_BCI = source({ key: "oh-bci-companion", id: "OH-BCI-SEALING-EXPUNGEMENT-REQUEST", role: "POST_ORDER_COMPANION_SOURCE", title: "Ohio BCI Sealings and Expungements Request", revision: "REV-UNKNOWN", pathInArchive: "STATES/OH/04_SUPPORTING_PROCESS/OH__SUPPORT__OH-BCI-SEALING-EXPUNGEMENT-REQUEST__re-sealing-and-or-expungements__REV-UNKNOWN__EN.pdf", hash: "9234ec763403b1ccfbed796dfcf86f29bf7887390d1770460d0bcc9da31fc8cb", bytes: 235789, render: false });

const PA_PETITION_ALLOW = {
  "Full Name": "participant.full_legal_name", Defendant: "participant.full_legal_name",
  Addr1: "participant.street_address", Addr2: "participant.address_line_2", AddrCity: "participant.city",
  AddrState: "participant.state", AddrZip: "participant.zip", CountyOf: "matter.county",
  CPDocketNumber: "matter.case_number",
  DocketNumber: "matter.case_number", DefendantName: "participant.full_legal_name",
  Address: "participant.street_address", County: "matter.county", "Statute DescriptionRow1": "matter.charge",
};
const PA_ORDER_ALLOW = {
  County: "matter.county", DefendantName: "participant.full_legal_name",
  PetitionerName: "participant.full_legal_name", "Petitioner's Name": "participant.full_legal_name",
  Defendant: "participant.full_legal_name", PetitionersAddress: "participant.street_address",
  Address: "participant.street_address", DocketNumber: "matter.case_number", "Docket#": "matter.case_number",
  SpecificCharges: "matter.charge", ChargesDisposition: "matter.charge",
};

/*
 * FIX11 (REPEATING_ROWS): the PA petitions carry a five-row offence table whose
 * cells -- Title, Section, Subsection, Statute Description, Counts, Grade,
 * Disposition -- form rows that must be complete or untouched. Writing
 * matter.charge into `Statute DescriptionRow1` alone left row 1 half-written:
 * a finished-looking row whose other required cells the platform holds no fact
 * for and must not guess. The whole table is left to the participant, listed
 * with the other required-before-filing blanks.
 */
const { "Statute DescriptionRow1": _paRow1ChargeCell, ...PA_PETITION_ALLOW_TABLE_UNTOUCHED } = PA_PETITION_ALLOW;

// Exact terminal-name mappings shared by every family that uses the same
// pinned document. This is deliberately a table, not a label heuristic: one
// source field name opens one known fact and no unknown field can match it.
// Route-specific charges and elections remain in each FAMILY entry below.
const SHARED_EXACT_FACT_ALLOWLIST = Object.freeze({
  "NJ-CN-10557": Object.freeze({
    DefName: "participant.full_legal_name",
    DefAddrStr: "participant.street_address",
    DefAddr2: "participant.city_state_zip",
    DefAddr3: "participant.phone",
    ExpungeCntyName: "matter.county",
    DefBirthDt: "participant.date_of_birth",
    origCaseNums: "matter.case_number",
    arrestOff1: "matter.charge",
    arrest1Dt: "matter.arrest_date",
    arrest1CaseNum: "matter.case_number",
  }),
  "NY-CPL-160.59-APPLICATION": Object.freeze({
    Date_of_Birth: "participant.date_of_birth",
    Court_Name_1: "matter.court",
    Conviction_Date_1: "matter.conviction_date",
  }),
  "NY-CPL-160.59-COD-REQUEST": Object.freeze({
    CourtName: "matter.court",
    "Date of Birth": "participant.date_of_birth",
    ArrestDate: "matter.arrest_date",
    IncidentDate: "matter.offense_date",
  }),
  "NY-CPL-160.59-PRO-SE-PACKET": Object.freeze({
    "Date of Birth": "participant.date_of_birth",
    "Filing Court County": "matter.county",
    "Filing Court Name": "matter.court",
    "Court Name 1": "matter.court",
  }),
  "NY-MRTA-DESTRUCTION-REQUEST": Object.freeze({
    DOB: "participant.date_of_birth",
    Court_County: "matter.county",
  }),
  "PA-RCRIM-P-490-PETITION": Object.freeze({
    DOB: "participant.date_of_birth",
    "Name of Arresting Agency": "matter.citing_or_arresting_agency",
    "Date of Arrest": "matter.arrest_date",
    "Date on Complaint": "matter.offense_date",
  }),
  "PA-RCRIM-P-790-PETITION": Object.freeze({
    DOB: "participant.date_of_birth",
    "Name of Arresting Agency": "matter.citing_or_arresting_agency",
    "Date of Arrest": "matter.arrest_date",
    "Date on Complaint": "matter.offense_date",
  }),
  "PA-RCRIM-P-791-PETITION": Object.freeze({
    DOB: "participant.date_of_birth",
    "Court of Common Pleas Philadelphia Municipal Court or Magisterial District Docket Number":
      "matter.case_number",
    "Name of Arresting Agency": "matter.citing_or_arresting_agency",
    DateofArrest: "matter.arrest_date",
  }),
  "PA-RCRIM-P-490-ORDER": Object.freeze({
    PetitionersDOB: "participant.date_of_birth",
  }),
  "PA-RCRIM-P-790-ORDER": Object.freeze({
    PetitionersDOB: "participant.date_of_birth",
  }),
  "PA-RCRIM-P-791-ORDER": Object.freeze({
    DOB: "participant.date_of_birth",
    ComplaintArrestDate: "matter.arrest_date",
  }),
  "RI-DC-33": Object.freeze({
    "Date of Birth": "participant.date_of_birth",
    "Date of Birth_2": "participant.date_of_birth",
  }),
});

function factMappingsForDocument(doc) {
  const shared = SHARED_EXACT_FACT_ALLOWLIST[doc.documentId] ?? {};
  for (const [field, factId] of Object.entries(doc.allow ?? {})) {
    assert.ok(!shared[field] || shared[field] === factId,
      `${doc.documentId}/${field}: shared and family fact mappings conflict`);
  }
  return { ...shared, ...(doc.allow ?? {}) };
}

const FAMILY = {};

const NJ_CONTACT_ALLOW = {
  DefPhone: "participant.phone", DefAddrStr2: "participant.street_address",
  DefAddrCity: "participant.city", DefAddrSt: "participant.state", DefAddrZip: "participant.zip",
};
function njFamily(routeKey, selectionNames, allow, note) {
  return {
    jurisdiction: "NJ", routeKeys: [routeKey],
    documents: [cloneDoc(NJ_SOURCE, { allow: { ...NJ_CONTACT_ALLOW, ...allow }, selections: selectionNames })],
    notes: [note, "The shared 43-page kit's signature, date, notary, service, court, prosecutor, clerk, agency, and post-order fields are expressly refused."],
  };
}

Object.assign(FAMILY, {
  "nj_arrest_no_conviction-set": njFamily(
    "obligation:track-pathway:NJ:nj_arrest_no_conviction:arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6",
    ["dismiss"], { origCaseNums: "matter.case_number",
      dismissDt: "matter.disposition_date", dismissOff1: "matter.charge",
      dismissCrt: "matter.court" },
    "The route election is the measured existing dismissed control on page 18; no box is invented."
  ),
  "nj_clean_slate-set": njFamily(
    "obligation:track-pathway:NJ:nj_clean_slate:clean-slate-petition-under-n-j-s-a-2c-52-5-3",
    ["guilty"], { guiltyDt: "matter.conviction_date", guiltyOff1: "matter.charge",
      guiltyCrt: "matter.court" },
    "Only the measured participant conviction control is marked; the clean-slate checkbox on the proposed court order and all eligibility statements remain blank."
  ),
  "nj_disorderly_persons-set": njFamily(
    "obligation:track-pathway:NJ:nj_disorderly_persons:regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3",
    ["guilty"], { guiltyDt: "matter.conviction_date", guiltyOff1: "matter.charge",
      guiltyCrt: "matter.court" },
    "The measured conviction control is marked; no clean-slate or marijuana election is made."
  ),
  "nj_indictable_conviction-set": njFamily(
    "obligation:track-only:NJ:nj_indictable_conviction", ["guilty"], {
      guiltyDt: "matter.conviction_date", guiltyOff1: "matter.charge", guiltyCrt: "matter.court",
    },
    "The measured conviction control is marked; degree and statutory eligibility remain unselected."
  ),
  "nj_ordinance-set": njFamily(
    "obligation:track-only:NJ:nj_ordinance", ["guilty"], {
      guiltyDt: "matter.conviction_date", guiltyOff1: "matter.charge", guiltyCrt: "matter.court",
    },
    "The measured conviction control is marked; the ordinance characterization is not inferred into another control."
  ),
  "ny_160_59_petition-set": {
    jurisdiction: "NY",
    routeKeys: ["obligation:track-pathway:NY:ny_160_59_petition:discretionary-conviction-sealing-by-petition-under-cpl-160-59"],
    documents: [
      source({
        key: "application", id: "NY-CPL-160.59-APPLICATION", role: "PRIMARY_APPLICATION_WITH_SWORN_AND_SERVICE_BLOCKS",
        title: "Notice of Motion and Affidavit in Support of Sealing under CPL 160.59", revision: "REV-UNKNOWN",
        pathInArchive: "STATES/NY/02_PACKET_FORMS/NY__FORM__CPL-160.59-APPLICATION__notice-of-motion-and-affidavit-in-support-of-sealing-under-cpl-160-59__REV-UNKNOWN__EN.pdf",
        hash: "73a5eeaf73ed647b9cf6ae786823aaa3cf8b3a7e483ea4aad154d7c2275caae4", bytes: 1234105,
        allow: { Applicant_Name: "participant.full_legal_name", Docket_Indictment_SCI_Number_1: "matter.case_number",
          Conviction_Charge_1: "matter.charge", Applicant_Street_Address: "participant.street_address",
          Applicant_City_State_Zip: "participant.city_state_zip", Applicant_Phone: "participant.phone",
          Applicant_Email: "participant.email" },
      }),
      source({
        key: "cod-request", id: "NY-CPL-160.59-COD-REQUEST", role: "RECORD_GATHERING_COMPANION",
        title: "Criminal Certificate of Disposition Request Form", revision: "REV-2024-07",
        pathInArchive: "STATES/NY/04_SUPPORTING_PROCESS/NY__SUPPORT__CPL-160.59-COD-REQUEST__criminal-certificate-of-disposition-request-form__REV-2024-07__EN.pdf",
        hash: "68b14570db220ed79aac13a20161ddf807357dc888e524e08a1c17d410762774", bytes: 198814,
        allow: { RequestorName: "participant.full_legal_name", RequestorAddress: "participant.street_address",
          RequestorPhone: "participant.phone", RequestorEmail: "participant.email",
          DefendantFirstName: "participant.first_name", DefendantMiddleNameorInitial: "participant.middle_name",
          DefendantLastName: "participant.last_name", DocketIndictmentSCINumber: "matter.case_number",
          DefendantAddress: "participant.street_address", Charges: "matter.charge" },
      }),
      source({
        key: "pro-se-packet", id: "NY-CPL-160.59-PRO-SE-PACKET", role: "REQUIRED_INSTRUCTIONS_AND_APPLICATION_PACKET",
        title: "CPL 160.59 Pro Se Sealing Application Packet and Instructions", revision: "REV-UNKNOWN",
        pathInArchive: "STATES/NY/02_PACKET_FORMS/NY__FORM__CPL-160.59-PRO-SE-PACKET__cpl-160-59-pro-se-sealing-application-packet-and-instructions__REV-UNKNOWN__EN.pdf",
        hash: "cf22b8ea0cb8661c8e3f17cc0f16e6b95ca889f1e994e3772dfaf867b6da0298", bytes: 519607,
        allow: { "Applicant Name": "participant.full_legal_name", "Street Address": "participant.street_address",
          "City State Zip": "participant.city_state_zip", Phone: "participant.phone", Email: "participant.email",
          "Case Number 1": "matter.case_number" },
      }),
      source({
        key: "seal-verification-source-only", id: "NY-CPL-160.59-SEAL-VERIFICATION", role: "POST_ORDER_SOURCE_ONLY",
        title: "Request for CPL 160.59 Seal Verification", revision: "REV-UNKNOWN",
        pathInArchive: "STATES/NY/04_SUPPORTING_PROCESS/NY__SUPPORT__CPL-160.59-SEAL-VERIFICATION__request-for-cpl-160-59-seal-verification__REV-UNKNOWN__EN.pdf",
        hash: "76c0c54ed0a80c8b5b5fddd64e2087b31f9615d5ebe7524ead803352fba3cca3", bytes: 79928, render: false,
      }),
    ],
    notes: [
      "Prior-application elections, reasons, sworn dates, service facts, prosecutor information, and notary fields remain blank.",
      "The post-order seal-verification document is source-custody evidence only; form currency, local service practice, fees, and the proposed-order branch remain release blockers.",
    ],
  },
  "ny_mrta_marijuana-set": {
    jurisdiction: "NY", routeKeys: ["obligation:unit:NY:ny_mrta_marijuana:ny-mrta-destruction-request"],
    documents: [source({
      key: "mrta-destruction-request", id: "NY-MRTA-DESTRUCTION-REQUEST", role: "CONDITIONAL_IRREVERSIBLE_DESTRUCTION_REQUEST",
      title: "Application to Destroy Marijuana Conviction Record", revision: "REV-UNKNOWN",
      pathInArchive: "STATES/NY/02_PACKET_FORMS/NY__FORM__MRTA-DESTRUCTION-REQUEST__application-to-destroy-marijuana-conviction-record__REV-UNKNOWN__EN.pdf",
      hash: "55c8ec044ecd2adf30508b6a2403c690fc441419d6fba0ccc657eba182298544", bytes: 272798,
      allow: { Applicant_First_Name: "participant.first_name", Applicant_Middle_Name: "participant.middle_name",
        Applicant_Last_Name: "participant.last_name", Docket_Case_Number: "matter.case_number",
        Cell_Phone: "participant.phone", Street_Address: "participant.street_address", Zip_Code: "participant.zip",
        State: "participant.state", City_Town: "participant.city", Email: "participant.email" },
    })],
    notes: [
      "This artifact covers only an explicitly requested irreversible-destruction branch and grants no runtime permission to select it.",
      "Every control below the form's COURT USE ONLY line and every affirmation/signature date remains blank.",
    ],
  },
  "pa_490_nonconviction-set": {
    jurisdiction: "PA", routeKeys: ["obligation:track-pathway:PA:pa_490_nonconviction:path-a-non-conviction-expungement"],
    documents: [cloneDoc(PA_490_PETITION, { allow: PA_PETITION_ALLOW_TABLE_UNTOUCHED }), cloneDoc(PA_490_ORDER, { allow: PA_ORDER_ALLOW }), PA_IFP_MDJ],
    notes: ["The fee-waiver affidavit is retained only as conditional source evidence; no financial or sworn fact is filled.",
      "The petition's offence table is left whole for the participant: its rows carry Section, Subsection, Counts, Grade and Disposition cells the platform holds no fact for, and a row is complete or it is untouched."],
    guidance: {
      afterTheTable: [
        "Do not leave one of these blank because you are unsure. Ask the clerk of the court where the charges were filed.",
        "The filing fee and whether it can be waived, who must be served and by what method, and the addresses the petition is served on are not established in this repository. Ask the same clerk. An unsourced figure in a filing instruction would be worse than none.",
      ],
      selfHelpEnds: [
        "This packet prepares the Pennsylvania Rule of Criminal Procedure 490 petition and proposed order for you to review, complete, sign and file yourself. Self-help ends at any question this packet refuses to answer:",
        "- whether your charges are eligible for expungement — a legal judgment this packet does not make;",
        "- any blank listed above that you cannot complete from your own court records;",
        "- anything the prosecuting attorney objects to, and any hearing the court schedules.",
        "When you reach one of those points, stop and ask someone with the authority to answer. The clerk of the court where the charges were filed answers procedural questions — filing, fees, copies and service addresses. Only a lawyer admitted to practice in Pennsylvania may advise you on eligibility, on what to argue, or at a contested hearing; if you cannot afford one, ask that same clerk's office how to reach the county's legal aid or lawyer referral service. This packet is not legal advice, and no lawyer has reviewed your case in preparing it.",
      ],
      notYours: [
        "**The fee-waiver affidavit (PA-IFP-MDJ)** is held as exact source evidence only. It is not generated into your packet and nothing on it is a blank on this filing. If you need a fee waiver, ask the clerk for the current form.",
        "**The proposed order** carries the court's blocks; submit them blank.",
        "**Every signature and signature date** is yours to complete after you have read the finished packet.",
      ],
    },
  },
  "pa_790_nonconviction-set": {
    jurisdiction: "PA", routeKeys: ["obligation:track-pathway:PA:pa_790_nonconviction:path-a-non-conviction-expungement"],
    documents: [cloneDoc(PA_790_PETITION, { allow: PA_PETITION_ALLOW_TABLE_UNTOUCHED }), cloneDoc(PA_790_ORDER, { allow: PA_ORDER_ALLOW }), PA_IFP_CCP],
    notes: ["The fee-waiver motion is retained only as conditional source evidence; no financial or sworn fact is filled.",
      "The petition's offence table is left whole for the participant: its rows carry Section, Subsection, Counts, Grade and Disposition cells the platform holds no fact for, and a row is complete or it is untouched."],
    guidance: {
      afterTheTable: [
        "Do not leave one of these blank because you are unsure. Ask the clerk of the court where the charges were filed.",
        "The filing fee and whether it can be waived, who must be served and by what method, and the addresses the petition is served on are not established in this repository. Ask the same clerk. An unsourced figure in a filing instruction would be worse than none.",
      ],
      selfHelpEnds: [
        "This packet prepares the Pennsylvania Rule of Criminal Procedure 790 petition and proposed order for you to review, complete, sign and file yourself. Self-help ends at any question this packet refuses to answer:",
        "- whether your charges are eligible for expungement — a legal judgment this packet does not make;",
        "- any blank listed above that you cannot complete from your own court records;",
        "- anything the prosecuting attorney objects to, and any hearing the court schedules.",
        "When you reach one of those points, stop and ask someone with the authority to answer. The clerk of the court where the charges were filed answers procedural questions — filing, fees, copies and service addresses. Only a lawyer admitted to practice in Pennsylvania may advise you on eligibility, on what to argue, or at a contested hearing; if you cannot afford one, ask that same clerk's office how to reach the county's legal aid or lawyer referral service. This packet is not legal advice, and no lawyer has reviewed your case in preparing it.",
      ],
      notYours: [
        "**The fee-waiver motion (PA-IFP-CCP)** is held as exact source evidence only. It is not generated into your packet and nothing on it is a blank on this filing. If you need a fee waiver, ask the clerk for the current form.",
        "**The proposed order** carries the court's blocks; submit them blank.",
        "**Every signature and signature date** is yours to complete after you have read the finished packet.",
      ],
    },
  },
  "pa_9122_1_limited_access-set": {
    jurisdiction: "PA", routeKeys: ["obligation:track-pathway:PA:pa_9122_1_limited_access:path-i-petition-for-limited-access"],
    documents: [cloneDoc(PA_791_PETITION, { allow: PA_PETITION_ALLOW_TABLE_UNTOUCHED }), cloneDoc(PA_791_ORDER, { allow: PA_ORDER_ALLOW }), PA_IFP_CCP],
    notes: ["Reasons, signature/date, criminal-history election, costs-paid election, court disposition, and agency-service fields remain blank.",
      "The petition's offence table is left whole for the participant: its rows carry Section, Subsection, Counts, Grade and Disposition cells the platform holds no fact for, and a row is complete or it is untouched."],
    guidance: {
      afterTheTable: [
        "Do not leave one of these blank because you are unsure. Ask the clerk of the court where the conviction was entered.",
        "The filing fee and whether it can be waived, who must be served and by what method, and the addresses the petition is served on are not established in this repository. Ask the same clerk. An unsourced figure in a filing instruction would be worse than none.",
      ],
      selfHelpEnds: [
        "This packet prepares the Pennsylvania Rule of Criminal Procedure 791 petition for an order for limited access and its proposed order for you to review, complete, sign and file yourself. Self-help ends at any question this packet refuses to answer:",
        "- whether your conviction qualifies for limited access under 18 Pa.C.S. § 9122.1 — a legal judgment this packet does not make;",
        "- any blank listed above that you cannot complete from your own court records;",
        "- anything the district attorney objects to, and any hearing the court schedules.",
        "When you reach one of those points, stop and ask someone with the authority to answer. The clerk of the court where the conviction was entered answers procedural questions — filing, fees, copies and service addresses. Only a lawyer admitted to practice in Pennsylvania may advise you on eligibility, on what to argue, or at a contested hearing; if you cannot afford one, ask that same clerk's office how to reach the county's legal aid or lawyer referral service. This packet is not legal advice, and no lawyer has reviewed your case in preparing it.",
      ],
      notYours: [
        "**The fee-waiver motion (PA-IFP-CCP)** is held as exact source evidence only. It is not generated into your packet and nothing on it is a blank on this filing. If you need a fee waiver, ask the clerk for the current form.",
        "**The proposed order** carries the court's blocks; submit them blank.",
        "**Every signature and signature date** is yours to complete after you have read the finished packet.",
      ],
    },
  },
  "pa_summary_conviction-set": {
    jurisdiction: "PA", routeKeys: ["obligation:track-pathway:PA:pa_summary_conviction:path-c-summary-conviction-expungement"],
    documents: [cloneDoc(PA_490_PETITION, { allow: PA_PETITION_ALLOW_TABLE_UNTOUCHED }), cloneDoc(PA_490_ORDER, { allow: PA_ORDER_ALLOW }), cloneDoc(PA_790_PETITION, { allow: PA_PETITION_ALLOW_TABLE_UNTOUCHED })],
    notes: ["Both Rule 490 and Rule 790 petition branches are review artifacts; court-status routing remains a release blocker and no branch is silently chosen.",
      "Each petition's offence table is left whole for the participant: its rows carry Section, Subsection, Counts, Grade and Disposition cells the platform holds no fact for, and a row is complete or it is untouched."],
    guidance: {
      afterTheTable: [
        "Do not leave one of these blank because you are unsure. Ask the clerk of the court where the summary conviction was entered.",
        "The filing fee and whether it can be waived, who must be served and by what method, and the addresses the petition is served on are not established in this repository. Ask the same clerk. An unsourced figure in a filing instruction would be worse than none.",
      ],
      selfHelpEnds: [
        "This packet prepares both the Pennsylvania Rule of Criminal Procedure 490 petition (for a summary case in a magisterial district court) and the Rule 790 petition (for a case in a court of common pleas), with a proposed order, for you to review, complete, sign and file yourself. Self-help ends at any question this packet refuses to answer:",
        "- which of the two petitions your case requires — that depends on the court where your summary conviction sits, and this packet does not choose for you;",
        "- whether your summary conviction is eligible for expungement — a legal judgment this packet does not make;",
        "- any blank listed above that you cannot complete from your own court records;",
        "- anything the prosecuting attorney objects to, and any hearing the court schedules.",
        "When you reach one of those points, stop and ask someone with the authority to answer. The clerk of the court where the summary conviction was entered answers procedural questions — which petition applies, filing, fees, copies and service addresses. Only a lawyer admitted to practice in Pennsylvania may advise you on eligibility, on what to argue, or at a contested hearing; if you cannot afford one, ask that same clerk's office how to reach the county's legal aid or lawyer referral service. This packet is not legal advice, and no lawyer has reviewed your case in preparing it.",
      ],
      notYours: [
        "**The proposed order** carries the court's blocks; submit them blank.",
        "**Every signature and signature date** is yours to complete after you have read the finished packet.",
      ],
    },
  },
  "ri_nonconviction_sealing-set": {
    jurisdiction: "RI", routeKeys: ["obligation:unit:RI:ri_nonconviction_sealing:ri-nonconviction-motion-to-seal"],
    documents: [source({
      key: "dc-33", id: "RI-DC-33", role: "MOTION_AFFIDAVIT_AND_INSTRUCTIONS",
      title: "District Court Motion, Affidavit and Instructions to Expunge or Seal Record", revision: "REV-2025-02",
      pathInArchive: "STATES/RI/02_PACKET_FORMS/RI__FORM__DC-33__district-court-motion-affidavit-and-instructions-to-expunge-or-seal-record__REV-2025-02__EN.pdf",
      hash: "342337451d61e363e03febb384431dba2f9bb08b44ee46380b94fc91901e9908", bytes: 307164,
      allow: { "State of Rhode Island v Defendant": "participant.full_legal_name", "Case Number": "matter.case_number",
        "State of Rhode Island v Defendant_2": "participant.full_legal_name", "Case Number_2": "matter.case_number",
        "2 Charges 1": "matter.charge" }, selections: ["sealed"],
    })],
    notes: ["Only the measured existing SEAL control is marked. Courthouse, eligibility, notice/service, hearing, signature/date, and notary blocks remain blank."],
  },
});

const COMPOSED_FAMILY_IDS = new Set(["oh_marijuana_expungement-set", "rcap-oh-custom-pleading-clean-tracks"]);
const STOP_FAMILY_ID = "pa_6308_underage-set";

export function eastFamilyContract(familyId = "nj_arrest_no_conviction-set") {
  return { familyId, sourceBound: true, commercialAuthority: false };
}

function fieldType(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "optionlist";
  return field?.constructor?.name === "PDFSignature" ? "signature" : "other";
}

function classifyRefusal(name, label = "") {
  const subject = `${name} ${label}`;
  if (/form(?:safe)?clear|reset|print(?:_form)?|save(?:_form)?|viewer\s+ui/i.test(subject)) return "not_a_filing_fact";
  if (/\bservice\b|\bserved\b|\bmail(?:ed|ing)?\b|certificate\s*of\s*service/i.test(subject)) return "unmailed_or_unperformed_service";
  // A proposed order's own date line -- "AND NOW, this ___ day of ___, 20___"
  // and the bare Day/Month/Year components -- is completed at signing, never
  // by the participant, and never listed as a blank the participant must fill.
  if (/^\s*(day|month|year)\s*\d*\s*$/i.test(name) || /\bAND\s+NOW\b[,\s]*this\b/i.test(label)) return "signature_or_date_participant_completion";
  // The completeness contract's closed vocabulary names this class
  // signature_or_date_participant_completion; emitting any other spelling makes
  // every signature blank unclassifiable to the auditor that decides PASS.
  if (/signature|signed|notary|sworn|affirmation/i.test(subject)) return "signature_or_date_participant_completion";
  // An arresting or citing AGENCY NAME is a case fact the participant already
  // has from the record they screened with; the completeness contract refuses
  // the court-owned class for agency-fact fields, so they are carried to the
  // participant instead of hiding behind the clerk and the judge.
  if (/(arresting|citing|prosecuting)\s*agency|agency\s*that\s*made\s*the\s*arrest/i.test(subject)) return "required_before_filing";
  if (/judge|court\s*signature|clerk|prosecut|district\s*attorney|\bDA\b|agency|affiant|police|sheriff|warden|superintendent|attorney\s*general/i.test(subject)) return "court_prosecutor_clerk_or_agency_owned";
  if (/reason|eligib|history|conditions|restitution|costs\s*paid|checkbox|check\s*box|intend|filed\s*another|acquit|dismiss|guilty|sealed|expunged|proper_id/i.test(subject)) return "participant_sworn_narrative_or_legal_election";
  return "required_before_filing";
}

function refusalReason(refusalClass) {
  if (refusalClass === "required_before_filing") {
    return "REQUIRED_BEFORE_FILING: the platform holds no exact fact for this field; surface it to the participant and do not guess.";
  }
  if (refusalClass === "not_a_filing_fact") {
    return "Viewer UI control; not a filing fact and never written into the participant artifact.";
  }
  return "The field remains blank under its recorded participant, later-act, or protected-owner treatment.";
}

async function selfTest(familyId) {
  assert.equal(
    process.env.RCAP_PDFTOPPM ? true : POPPLER_PDFTOPPM === "pdftoppm",
    true,
    "Poppler discovery must use RCAP_PDFTOPPM or PATH, never a host-specific absolute fallback",
  );
  assertPopplerAvailable();
  assert.equal(rasterLooksBlank({ channels: [{ min: 255, max: 255 }] }), true);
  assert.equal(rasterLooksBlank({ channels: [{ min: 0, max: 255 }] }), false);
  assert.deepEqual(FAMILY["nj_clean_slate-set"].documents[0].selections, ["guilty"],
    "NJ clean-slate must never mark the court-owned cleanSlate control on Form C");
  assert.deepEqual(routeSelectionProtection({
    name: "syntheticOrderControl",
    widgets: [{ page: 3, rect: { x: 10, y: 10, width: 12, height: 12 } }],
    sharedProtectCategory: null,
    sharedRegionProtectCategory: null,
  }, {
    pageTextByPage: [{ page: 3, text: "EXPUNGEMENT ORDER (FORM C)\nHAVING FOUND good cause, IT IS ORDERED" }],
  }), { protected: true, reason: "court/order-owned page 3" },
  "a measured control on a court/order page must fail closed");
  assert.equal(appearanceMatchesExpected(["Jordan", "Reyes"], "Jordan Reyes"), true);
  assert.equal(appearanceMatchesExpected(["Grandview", "Boulevard"], "GrandviewBoulevard"), true);
  assert.equal(appearanceMatchesExpected(["Reyes", "Jordan"], "Jordan Reyes"), false);
  assert.deepEqual(
    protectedCensusField({ name: "Ordinary", sharedRegionProtectCategory: "court_owned" }, { decision: "refuse" }),
    { protected: true, category: "court_owned" },
  );
  assert.deepEqual(
    protectedCensusField(
      { name: "Street_Address", effectiveLabel: "My mailing Address" },
      { decision: "candidate_write", factId: "participant.street_address" },
    ),
    { protected: false, category: null },
    "an applicant mailing-address label is contact data, not proof that service was mailed",
  );
  assert.deepEqual(
    protectedCensusField(
      { name: "Email", effectiveLabel: "Email Address (optional)" },
      { decision: "candidate_write", factId: "participant.email" },
    ),
    { protected: false, category: null },
    "email must not match the performed-mailing protection",
  );
  assert.deepEqual(
    protectedCensusField(
      { name: "DefendantAddress", effectiveLabel: "Incident Date" },
      { decision: "candidate_write", factId: "participant.street_address" },
    ),
    { protected: false, category: null },
    "a misleading adjacent label must not override an exact allowlisted field-name binding",
  );
  assert.deepEqual(
    protectedCensusField(
      { name: "sealed", effectiveLabel: "Date / court-adjacent text" },
      { decision: "measured_route_selection" },
    ),
    { protected: false, category: null },
    "an exact measured route control must not inherit unrelated neighboring protected text",
  );
  assert.deepEqual(
    protectedCensusField(
      { name: "Proper_ID", regionHeading: "YES NO APPLICATION PROCESSING CHECKLIST" },
      { decision: "refuse", refusalClass: "participant_sworn_narrative_or_legal_election" },
    ),
    { protected: true, category: "court_owned_processing_checklist" },
    "the MRTA court-processing checklist remains protected even when a row label is vague",
  );
  assert.deepEqual(
    protectedCensusField(
      { name: "Date_Mailed", effectiveLabel: "Date mailed" },
      { decision: "refuse", refusalClass: "unmailed_or_unperformed_service" },
    ),
    { protected: true, category: "unmailed_or_unperformed_service" },
    "performed-service fields remain protected through their refusal class",
  );
  assert.deepEqual(eastFamilyContract(familyId), { familyId, sourceBound: true, commercialAuthority: false });
  assert.equal(classifyRefusal("Signature of Petitioner", "Signature"), "signature_or_sworn_participant_act");
  assert.equal(classifyRefusal("UnknownDispositionDate", "Disposition date"), "required_before_filing");
  assert.equal(classifyRefusal("Date_of_Service", "Date of Service"), "unmailed_or_unperformed_service");
  assert.equal(classifyRefusal("Applicant_Email", "Email"), "required_before_filing");
  assert.equal(classifyRefusal("Print_Form", "Print this form"), "not_a_filing_fact");
  assert.equal(classifyRefusal("Judge", "Judge"), "court_prosecutor_clerk_or_agency_owned");
  assert.equal(classifyRefusal("Reasons_to_Grant_Application", "Reasons"), "participant_sworn_narrative_or_legal_election");
  const configuredDocumentIds = new Set(Object.values(FAMILY)
    .flatMap((config) => config.documents.map((doc) => doc.documentId)));
  assert.equal(Object.keys(SHARED_EXACT_FACT_ALLOWLIST).length, 12);
  assert.equal(Object.values(SHARED_EXACT_FACT_ALLOWLIST)
    .reduce((count, mappings) => count + Object.keys(mappings).length, 0), 41);
  for (const [documentId, mappings] of Object.entries(SHARED_EXACT_FACT_ALLOWLIST)) {
    assert.ok(configuredDocumentIds.has(documentId), `${documentId}: shared exact map has no configured document`);
    for (const factId of Object.values(mappings)) {
      assert.ok(resolveFact(factsCanonical, factId) != null,
        `${documentId}: exact map names an unavailable fixture fact ${factId}`);
    }
  }
  const exactOverlaySource = await PDFDocument.create();
  exactOverlaySource.addPage([240, 120]);
  const exactOverlay = await overlayExactMappedFacts({
    bytes: Buffer.from(await exactOverlaySource.save({ useObjectStreams: false, updateMetadata: false })),
    census: [{ name: "DefBirthDt", type: "text", multiline: false,
      widgets: [{ widgetIndex: 0, page: 1, rect: { x: 20, y: 40, width: 160, height: 16 } }] }],
    fieldMap: [{ field: "DefBirthDt", decision: "candidate_write",
      factId: "participant.date_of_birth" }],
    facts: factsCanonical,
    report: { written: [], refused: [{ field: "DefBirthDt", reason: "mapping_conflict" }],
      expectedValues: [] },
  });
  assert.deepEqual(exactOverlay.report.written.map((row) => [row.field, row.factId]),
    [["DefBirthDt", "participant.date_of_birth"]]);
  const exactOverlayPdf = await PDFDocument.load(exactOverlay.bytes, {
    ignoreEncryption: true, updateMetadata: false,
  });
  assert.match(extractTextItems(exactOverlayPdf.getPages()[0]).map((item) => item.text).join(" "),
    /1991-04-17/);
  assert.ok(Object.hasOwn(FAMILY, "ri_nonconviction_sealing-set"));
  assert.ok(COMPOSED_FAMILY_IDS.has("oh_marijuana_expungement-set"));
  assert.equal(ohioPleadingConfig("oh_marijuana_expungement", OH_TRACKS.oh_marijuana_expungement).includeProposedOrder, true);
  assert.ok(fixtureForOhioTrack("oh_marijuana_expungement", customCanonicalFixture).attachments
    .some((item) => item.includes("predates March 20, 2026")));
  for (const [officialFamilyId, config] of Object.entries(FAMILY)) {
    const fixture = factsForJurisdiction(config.jurisdiction);
    assert.equal(fixture["participant.state"], config.jurisdiction,
      `${officialFamilyId}: fixture state must match its jurisdiction`);
    for (const doc of config.documents) {
      for (const field of Object.keys(factMappingsForDocument(doc))) {
        assert.doesNotMatch(field,
          /signature|notary|sworn|service|served|prosecut|clerk|judge/i,
          `${officialFamilyId}/${doc.documentId}: protected field may not appear in the write allowlist`);
        if (/agency/i.test(field)) {
          assert.equal(field, "Name of Arresting Agency",
            `${officialFamilyId}/${doc.documentId}: only the exact participant-stated arresting-agency field may be mapped`);
        }
      }
    }
  }
  const custom = await customModules();
  assert.equal(typeof custom.renderCustomPleading, "function");
  assert.equal(typeof custom.runPleadingQa, "function");
  assert.equal(typeof custom.buildPleadingAuditManifest, "function");
  for (const baseFixture of [customCanonicalFixture, customBoundaryFixture]) {
    const config = ohioPleadingConfig("oh_marijuana_expungement", OH_TRACKS.oh_marijuana_expungement);
    const rendered = custom.renderCustomPleading({
      config, ...fixtureForOhioTrack("oh_marijuana_expungement", baseFixture),
    });
    assert.doesNotMatch(rendered.fullText, /\bthe\s+the\b/i,
      "Ohio composed pleading must not duplicate the definite article");
    assert.doesNotMatch(rendered.fullText, /\.\./,
      "Ohio composed pleading must not duplicate sentence punctuation");
  }
  const rasterStage = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-east-raster-self-test-"));
  try {
    const synthetic = await PDFDocument.create();
    const font = await synthetic.embedFont(StandardFonts.Helvetica);
    synthetic.addPage([144, 144]).drawText("EAST QA", { x: 18, y: 72, size: 12, font });
    const syntheticFile = path.join(rasterStage, "synthetic.pdf");
    fs.writeFileSync(syntheticFile, await synthetic.save({ useObjectStreams: false }));
    const recordedRows = await rasterizePdf({
      file: syntheticFile, outDir: path.join(rasterStage, "recorded"), prefix: "page",
    });
    const recordedRaster = {
      engine: "bundled_poppler_pdftoppm",
      dpi: RASTER_DPI,
      pages: recordedRows.map((row) => {
        const bytes = fs.readFileSync(row.file);
        return {
          ...row,
          sha256: sha256(bytes),
          byteLength: bytes.length,
        };
      }),
    };
    const syntheticPages = (await PDFDocument.load(fs.readFileSync(syntheticFile), {
      ignoreEncryption: true, updateMetadata: false,
    })).getPages();
    assert.equal(await verifyFreshPopplerRaster({
      pdfFile: syntheticFile,
      raster: recordedRaster,
      pdfPages: syntheticPages,
      label: "east-raster-self-test",
    }), true);
    const tampered = structuredClone(recordedRaster);
    tampered.pages[0].sha256 = "0".repeat(64);
    await assert.rejects(() => verifyFreshPopplerRaster({
      pdfFile: syntheticFile,
      raster: tampered,
      pdfPages: syntheticPages,
      label: "east-raster-self-test-tampered",
    }), /recorded raster hash drift/,
    "updated metadata or substituted raster evidence must not self-attest");
  } finally {
    fs.rmSync(rasterStage, { recursive: true, force: true });
  }
  console.log(`build-census-v1-${familyId}: self-test PASS`);
}

function corpusRoot() {
  const candidate = process.env[CORPUS_ENV];
  if (!candidate) {
    throw new Error(`${CORPUS_ENV} is required and must point to the verified Master Library`);
  }
  if (!fs.existsSync(candidate)) {
    throw new Error(`${CORPUS_ENV} must point to the verified Master Library (not found: ${candidate})`);
  }
  return path.resolve(candidate);
}

function resolveSource(doc) {
  const index = readJson(CORPUS_INDEX);
  const entry = (index.entries ?? []).find((row) => row.path === doc.pathInArchive);
  assert.ok(entry, `${doc.documentId}: source is absent from ${CORPUS_INDEX}`);
  assert.equal(entry.sha256, doc.sha256, `${doc.documentId}: family hash disagrees with corpus index`);
  assert.equal(entry.byteLength, doc.byteLength, `${doc.documentId}: family byte count disagrees with corpus index`);
  const file = path.join(corpusRoot(), doc.pathInArchive);
  assert.ok(fs.existsSync(file), `${doc.documentId}: source binary is not installed at ${file}`);
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.length, doc.byteLength, `${doc.documentId}: source byte drift`);
  assert.equal(sha256(bytes), doc.sha256, `${doc.documentId}: source SHA-256 drift`);
  return { file, bytes, indexEntry: entry };
}

function decodedPageContent(pdf, page) {
  let out = "";
  const contents = page.node.normalizedEntries?.().Contents;
  const refs = contents?.asArray?.() ?? (contents ? [contents] : []);
  for (const ref of refs) {
    const stream = pdf.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    try { out += Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); }
    catch { /* The absence is recorded as an empty CTM geometry contribution. */ }
  }
  return out;
}

async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const pageByWidgetDictionary = new Map();
  pages.forEach((page, index) => {
    for (const annotationRef of page.node.Annots()?.asArray?.() ?? []) {
      const annotation = pdf.context.lookup(annotationRef);
      if (annotation) pageByWidgetDictionary.set(annotation, index + 1);
    }
  });
  const linesByPage = pages.map((page) => {
    try { return groupIntoLines(extractTextItems(page)); } catch { return []; }
  });
  const pageTextByPage = linesByPage.map((lines, index) => ({
    page: index + 1,
    text: lines.map((line) => normalizeHarvestedText(line.text)).filter(Boolean).join("\n"),
  }));
  const documentTextLines = pageTextByPage.flatMap((page) => page.text.split("\n")).filter(Boolean);
  const strokedByPage = pages.map((page, index) => {
    const content = decodedPageContent(pdf, page);
    const rectangles = content ? strokedRectangles(content) : [];
    return {
      page: index + 1,
      rectangles: rectangles.map((r) => ({
        x0: +r.x0.toFixed(3), y0: +r.y0.toFixed(3), x1: +r.x1.toFixed(3), y1: +r.y1.toFixed(3),
        width: +r.width.toFixed(3), height: +r.height.toFixed(3),
        squareness: +r.squareness.toFixed(4), construction: r.construction,
      })),
    };
  });

  const rawFields = pdf.getForm().getFields();
  const widgetsForPage = new Map();
  const measured = rawFields.map((field) => {
    const name = field.getName();
    const type = fieldType(field);
    const widgets = field.acroField.getWidgets().map((widget, widgetIndex) => {
      const rect = widget.getRectangle();
      const pageRef = widget.P?.();
      let page = pageByWidgetDictionary.get(widget.dict) ?? null;
      if (pageRef) {
        pages.forEach((candidate, index) => {
          if (candidate.ref === pageRef || candidate.ref.toString() === pageRef.toString()) page = index + 1;
        });
      }
      assert.ok(Number.isInteger(page), `${doc.documentId}/${name}: widget ${widgetIndex} is not attached to a measured page`);
      const row = {
        widgetIndex, page,
        rect: { x: +rect.x.toFixed(3), y: +rect.y.toFixed(3), width: +rect.width.toFixed(3), height: +rect.height.toFixed(3) },
        geometryBasis: "AcroForm widget /Rect read first-hand from the pinned source binary",
      };
      if (!widgetsForPage.has(page)) widgetsForPage.set(page, []);
      widgetsForPage.get(page).push({ name, rect: row.rect });
      return row;
    });
    let maxLength = null;
    let multiline = false;
    if (field instanceof PDFTextField) {
      try { maxLength = field.getMaxLength() ?? null; } catch { /* absent */ }
      try { multiline = field.isMultiline(); } catch { /* absent */ }
    }
    return { name, type, widgets, maxLength, multiline };
  });

  const contexts = new Map();
  pages.forEach((page, index) => {
    const widgets = widgetsForPage.get(index + 1) ?? [];
    if (!widgets.length) return;
    try {
      for (const context of captureWidgetContext(page, widgets, {
        precomputedLines: linesByPage[index], isFirstPage: index === 0,
      })) {
        if (!contexts.has(context.name)) contexts.set(context.name, context);
      }
    } catch { /* A failed label capture refuses more fields; it never opens one. */ }
  });

  const fields = measured.map((field) => {
    const context = contexts.get(field.name) ?? {};
    const effectiveLabel = context.effectiveLabel ?? null;
    return {
      ...field,
      effectiveLabel,
      labelBasis: context.labelBasis ?? null,
      regionHeading: context.regionHeading ?? null,
      sharedProtectCategory: protectCategoryOf(effectiveLabel ?? field.name) ?? protectCategoryOf(field.name) ?? null,
      sharedRegionProtectCategory: context.regionHeading ? regionProtectCategoryOf(context.regionHeading) : null,
    };
  });
  return {
    fields, documentTextLines, pageTextByPage,
    pageGeometry: pages.map((page, index) => {
      const size = page.getSize();
      return { page: index + 1, width: +size.width.toFixed(3), height: +size.height.toFixed(3),
        orientation: size.width > size.height ? "landscape" : "portrait" };
    }),
    pageTextLineCounts: linesByPage.map((lines, index) => ({ page: index + 1, lines: lines.length })),
    ctmStrokedGeometry: strokedByPage,
  };
}

/**
 * Completeness classifications a repair lane installed on the family's map.
 *
 * FIX07 (and its siblings) hand-classified every refused row of these families
 * on the packet-completeness contract's declared channel: required-before-
 * filing declarations with identities and disclosures, and the contract's own
 * trusted refusal classes. Those classifications are per-row legal work the
 * host cannot re-derive, and this host's own refusal vocabulary is not the
 * contract's. A rebuild that regenerates the map from classifyRefusal alone
 * therefore destroys the installed repair and regresses the family's
 * completeness audit (measured: knownRequiredFieldsMissing 7 -> 36 and
 * unclassifiedBlanks 0 -> 72 on nj_arrest_no_conviction-set).
 *
 * So a rebuild carries the installed classification forward, row by row, for
 * every field that REMAINS a refusal: the prior row is reused verbatim with
 * only its measured widgets refreshed from the first-hand census. A field the
 * allowlist now writes takes the fresh candidate_write row -- the stale
 * refusal is never carried over a write. Rows on the stale untrusted class
 * (not_supported_by_exact_participant_fact_map) and rows with no declared or
 * trusted classification are regenerated, because there is nothing installed
 * on them worth keeping.
 */
const CONTRACT_TRUSTED_REFUSAL_CLASSES = new Set([
  "signature_or_date_participant_completion",
  "court_prosecutor_clerk_or_agency_owned",
  "participant_sworn_narrative_or_legal_election",
]);

function carriesInstalledClassification(row) {
  if (Object.hasOwn(row, "requiredBeforeFiling") || Object.hasOwn(row, "completenessDisposition")
    || Object.hasOwn(row, "completenessClass")) return true;
  return CONTRACT_TRUSTED_REFUSAL_CLASSES.has(row.refusalClass);
}

function installedRefusalRows(priorMap) {
  const rows = new Map();
  for (const doc of priorMap?.documents ?? []) {
    for (const row of doc.fields ?? []) {
      if (String(row.decision) !== "refuse") continue;
      if (!carriesInstalledClassification(row)) continue;
      rows.set(`${doc.documentId}::${row.field}`, row);
    }
  }
  return rows;
}

function fieldMapFor(doc, census, installed = new Map()) {
  const selected = new Set(doc.selections ?? []);
  const factMappings = factMappingsForDocument(doc);
  const sharedMappings = SHARED_EXACT_FACT_ALLOWLIST[doc.documentId] ?? {};
  return census.fields.map((field) => {
    const factId = factMappings[field.name] ?? null;
    if (factId) {
      // No effectiveLabel on a write row: the census label is captured from
      // neighboring page text and is fallible for wide fields; carrying it on
      // an allowlisted write lets one caption shadow a differently-named blank
      // and read as "this fact is written beside it".
      return { field: field.name, decision: "candidate_write", factId,
        decisionBasis: Object.hasOwn(sharedMappings, field.name)
          ? "shared exact terminal-name fact allowlist; shared semantic finalizer still controls"
          : "family exact terminal-name participant-fact allowlist; shared semantic finalizer still controls",
        widgets: field.widgets };
    }
    if (selected.has(field.name)) {
      const protection = routeSelectionProtection(field, census);
      assert.equal(protection.protected, false,
        `${doc.documentId}/${field.name}: refusing route selection in ${protection.reason}`);
      return { field: field.name, decision: "measured_route_selection", factId: null,
        decisionBasis: "route-specific election drawn only inside an existing measured widget",
        widgets: field.widgets };
    }
    const installedRow = installed.get(`${doc.documentId}::${field.name}`);
    if (installedRow) return { ...installedRow, widgets: field.widgets };
    const refusalClass = doc.render === false
      ? "source_only_not_generated"
      : classifyRefusal(field.name, field.effectiveLabel ?? "");
    /*
     * A required-before-filing blank travels on the declared channel the
     * completeness contract reads -- requiredBeforeFiling as a boolean, an
     * identity, no refusal class -- because "required_before_filing" is not in
     * the contract's closed refusal vocabulary and a prose-only declaration
     * reads as a policy-shaped excuse. A service field is the same declaration
     * with its own true reason: the fact does not exist until service occurs.
     */
    if (refusalClass === "required_before_filing" || refusalClass === "unmailed_or_unperformed_service") {
      const afterService = refusalClass === "unmailed_or_unperformed_service";
      return { field: field.name, decision: "refuse", factId: null,
        blankTreatment: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, routeDetermined: false,
        identity: `${doc.documentId} field ${field.name}`,
        effectiveLabel: field.effectiveLabel ?? field.name,
        reason: afterService
          ? "REQUIRED_BEFORE_FILING: service has not occurred, so the platform holds no fact for this field; the participant completes it after service and does not guess."
          : "REQUIRED_BEFORE_FILING: the platform holds no exact fact for this field; surface it to the participant and do not guess.",
        completesAfterService: afterService,
        widgets: field.widgets };
    }
    return { field: field.name, decision: "refuse", factId: null, refusalClass,
      blankTreatment: null,
      effectiveLabel: field.effectiveLabel ?? field.name,
      reason: refusalClass === "source_only_not_generated"
        ? "This companion is held as exact source evidence and is not a generated participant artifact; a blank on a document the participant never receives is never a filing fact of this packet, and nothing is ever written into it."
        : refusalReason(refusalClass),
      widgets: field.widgets };
  });
}

function routeSelectionProtection(field, census) {
  const semantic = protectedCensusField(field, { decision: "measured_route_selection" });
  if (semantic.protected) return { protected: true, reason: semantic.category ?? "protected field" };
  const pages = new Set((field.widgets ?? []).map((widget) => widget.page));
  for (const page of pages) {
    const pageText = census.pageTextByPage?.find((row) => row.page === page)?.text ?? "";
    if (/\b(?:PROPOSED\s+)?(?:EXPUNGEMENT|SEALING|LIMITED\s+ACCESS)\s+ORDER\b|\bHAVING\s+FOUND\b|\bIT\s+IS\s+(?:HEREBY\s+)?ORDERED\b|\bAPPLICATION\s+PROCESSING\s+CHECKLIST\b/i.test(pageText)) {
      return { protected: true, reason: `court/order-owned page ${page}` };
    }
  }
  return { protected: false, reason: null };
}

function measuredSelections(doc, census) {
  return (doc.selections ?? []).map((name) => {
    const field = census.fields.find((row) => row.name === name);
    assert.ok(field, `${doc.documentId}: selected field ${name} is absent`);
    const protection = routeSelectionProtection(field, census);
    assert.equal(protection.protected, false,
      `${doc.documentId}/${name}: refusing route selection in ${protection.reason}`);
    assert.equal(field.widgets.length, 1, `${doc.documentId}: selected field ${name} must have exactly one measured widget`);
    const widget = field.widgets[0];
    return {
      label: name, page: widget.page, measured: true,
      measurementBasis: "existing AcroForm widget /Rect read first-hand from the pinned source",
      box: { x0: widget.rect.x, y0: widget.rect.y,
        x1: +(widget.rect.x + widget.rect.width).toFixed(3), y1: +(widget.rect.y + widget.rect.height).toFixed(3) },
    };
  });
}

function mergeReport(fieldReport, selectionReport = null) {
  return {
    fieldFinalizer: fieldReport,
    selectionFinalizer: selectionReport,
    written: fieldReport.written,
    refused: fieldReport.refused,
    selections: selectionReport?.selections ?? [],
    selectionsRefused: selectionReport?.selectionsRefused ?? [],
  };
}

/**
 * Draws one fitted exact-mapped value as a flattened widget appearance.
 *
 * The previous writer used page.drawText, which emits bare text operators into
 * a page content stream. Every artifact-evidence reader on this host --
 * pdf-flattened-widgets.mjs, proofFromArtifact, the packet-completeness
 * verifier -- decodes participant ink exclusively from the `q <cm> /XObject Do`
 * appearance placements that form.flatten() emits for filled fields. So every
 * exact-mapped overlay write was reported by the finalizer yet absent from the
 * decoded flattened appearance streams, and the build aborted on its own
 * missing-ink assertion after resetOwnedOutput had cleared the family
 * directory (the east-host appearance-stream defect).
 *
 * This writer emits the same construction flatten does: a Form XObject whose
 * stream draws the value in widget-local coordinates, placed at the widget's
 * measured rectangle with `q / 1 0 0 1 x y cm / Do / Q`. The baseline
 * arithmetic, inset, font and ink are unchanged from the drawText writer, so
 * the mark lands exactly where it always did -- it now also exists as an
 * appearance stream the evidence layer can decode. Names come from
 * page.node.newXObject, whose suffixes draw on the context's seeded RNG, so
 * two builds of the same inputs stay byte-identical.
 */
function placeExactFactAppearance({ pdf, page, font, widget, fit }) {
  const n = (v) => +Number(v).toFixed(3);
  const lineHeight = fit.fontSize * 1.15;
  const firstBaseline = fit.lines.length === 1
    ? Math.max(1, (widget.rect.height - fit.fontSize) / 2)
    : widget.rect.height - fit.fontSize - 1;
  const ink = PARTICIPANT_INK_RGB;
  const content = [
    "BT",
    `${n(ink.r)} ${n(ink.g)} ${n(ink.b)} rg`,
    `/F0 ${n(fit.fontSize)} Tf`,
    ...fit.lines.flatMap((line, index) => [
      `1 0 0 1 2 ${n(firstBaseline - index * lineHeight)} Tm`,
      `${font.encodeText(line).toString()} Tj`,
    ]),
    "ET",
  ].join("\n");
  const stream = pdf.context.stream(content, {
    Type: "XObject", Subtype: "Form",
    BBox: [0, 0, n(widget.rect.width), n(widget.rect.height)],
    Resources: { Font: { F0: font.ref } },
  });
  const key = page.node.newXObject("ExactFactOverlay", pdf.context.register(stream));
  page.pushOperators(pushGraphicsState(), translate(n(widget.rect.x), n(widget.rect.y)),
    drawObject(key), popGraphicsState());
  return { renderedAs: "form_xobject_appearance", xObject: key.toString() };
}

async function overlayExactMappedFacts({ bytes, census, fieldMap, facts, report }) {
  const alreadyWritten = new Set(report.written.map((row) => row.field));
  const duplicateLosers = new Set(report.refused
    .filter((row) => row.reason === "duplicate_widget_for_one_slot")
    .map((row) => row.field));
  const pending = fieldMap.filter((row) => row.decision === "candidate_write"
    && !alreadyWritten.has(row.field) && !duplicateLosers.has(row.field));
  if (pending.length === 0) return { bytes, report };

  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const written = [];
  const refused = [];
  for (const mapping of pending) {
    const field = census.find((row) => row.name === mapping.field);
    assert.ok(field, `${mapping.field}: exact mapped field is absent from the first-hand census`);
    if (field.type !== "text") {
      refused.push({ field: mapping.field, factId: mapping.factId,
        reason: "exact_mapping_requires_text_field" });
      continue;
    }
    const value = resolveFact(facts, mapping.factId);
    if (value == null || String(value).trim() === "") {
      refused.push({ field: mapping.field, factId: mapping.factId,
        reason: "no_value_for_exact_mapping" });
      continue;
    }
    const fittedWidgets = field.widgets.map((widget) => ({
      widget,
      fit: fitTextToWidget({
        font, text: String(value), rect: widget.rect, multiline: field.multiline === true,
        maxFontSize: 9, minFontSize: 6,
      }),
    }));
    const failed = fittedWidgets.find(({ fit }) => fit.outcome === "refused");
    if (failed) {
      refused.push({ field: mapping.field, factId: mapping.factId,
        reason: failed.fit.reason, widget: failed.widget.widgetIndex });
      continue;
    }
    const widgetWrites = [];
    for (const { widget, fit } of fittedWidgets) {
      const page = pdf.getPages()[widget.page - 1];
      assert.ok(page, `${mapping.field}: measured widget page ${widget.page} is absent`);
      const appearance = placeExactFactAppearance({ pdf, page, font, widget, fit });
      widgetWrites.push({ widgetIndex: widget.widgetIndex, page: widget.page,
        rect: widget.rect, fontSize: fit.fontSize, outcome: fit.outcome, ...appearance });
    }
    written.push({ field: mapping.field, factId: mapping.factId,
      kind: "exact_measured_fact_overlay", widgets: widgetWrites });
  }

  if (written.length === 0) return { bytes, report: { ...report,
    exactMappingOverlay: { written, refused } } };
  const output = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  const active = scanBytesForActiveContent(output);
  assert.equal(active.inspectable, true, "exact-mapping overlay is not byte-inspectable");
  assert.deepEqual(active.hits, [], "exact-mapping overlay introduced active content");
  const writtenNames = new Set(written.map((row) => row.field));
  return {
    bytes: output,
    report: {
      ...report,
      written: [...report.written, ...written],
      refused: report.refused.filter((row) => !writtenNames.has(row.field)),
      expectedValues: [...(report.expectedValues ?? []),
        ...written.map((row) => String(resolveFact(facts, row.factId)))],
      outputSha256: sha256(output), outputBytes: output.length,
      exactMappingOverlay: { written, refused, activeContentScan: active,
        sourceSha256: sha256(bytes), outputSha256: sha256(output), outputBytes: output.length },
    },
  };
}

async function finalizeEastOfficialForm(options) {
  // pdf-lib radio groups return one string from getSelected(), while dropdowns
  // return an array. The shared prompt-suppression pass treats every choice
  // field as array-valued. Normalize only for the duration of this family-
  // bounded finalization so the MRTA source's existing radio groups cannot
  // crash the official-form evidence build; no shared finalizer is changed.
  const original = PDFRadioGroup.prototype.getSelected;
  PDFRadioGroup.prototype.getSelected = function getSelectedAsArray() {
    const selected = original.call(this);
    return Array.isArray(selected) ? selected : selected == null ? [] : [selected];
  };
  try {
    // Button fields are not /Ch choice fields, so the shared structural
    // appearance rule deliberately preserves them. Several court PDFs ship a
    // radio group with /V or /DV already set even though the rendered source is
    // visually blank. Flattening that state can materialize a YES mark in a
    // court-only checklist. Neutralize every unwritten choice at the PDF-object
    // level before finalization: retain the court's blank /Off appearance, but
    // remove source/default answers. Route selections are drawn later, inside
    // independently measured rectangles, after this pass.
    const sourceDoc = await PDFDocument.load(options.sourceBytes, {
      ignoreEncryption: true, updateMetadata: false,
    });
    const neutralizedChoices = [];
    for (const field of sourceDoc.getForm().getFields()) {
      if (!(field instanceof PDFCheckBox || field instanceof PDFRadioGroup
        || field instanceof PDFDropdown || field instanceof PDFOptionList)) continue;
      const before = (() => {
        try {
          if (field instanceof PDFCheckBox) return field.isChecked() ? ["checked"] : [];
          const value = field.getSelected();
          return Array.isArray(value) ? value : value == null ? [] : [value];
        } catch { return []; }
      })();
      field.acroField.dict.delete(PDFName.of("V"));
      field.acroField.dict.delete(PDFName.of("DV"));
      for (const widget of field.acroField.getWidgets()) {
        if (field instanceof PDFCheckBox || field instanceof PDFRadioGroup) {
          widget.dict.set(PDFName.of("AS"), PDFName.of("Off"));
        } else {
          widget.dict.delete(PDFName.of("AP"));
        }
      }
      neutralizedChoices.push({ field: field.getName(), type: fieldType(field), sourceValuesRemoved: before });
    }
    const preparedSourceBytes = neutralizedChoices.length
      ? Buffer.from(await sourceDoc.save({ useObjectStreams: false, updateMetadata: false }))
      : options.sourceBytes;
    const { exactFieldMap = [], ...officialOptions } = options;
    const result = await finalizeOfficialForm({
      ...officialOptions,
      sourceBytes: preparedSourceBytes,
      expectedSha256: sha256(preparedSourceBytes),
    });
    result.report.boundOriginalSourceSha256 = options.expectedSha256 ?? sha256(options.sourceBytes);
    result.report.choiceNeutralization = {
      performedBeforeFlatten: neutralizedChoices.length > 0,
      fields: neutralizedChoices,
      preparedSourceSha256: sha256(preparedSourceBytes),
      rule: "remove /V and /DV; force button widgets to /AS /Off; never infer a participant or court answer",
    };
    return overlayExactMappedFacts({
      bytes: result.bytes, census: officialOptions.census,
      fieldMap: exactFieldMap, facts: officialOptions.facts, report: result.report,
    });
  } finally {
    PDFRadioGroup.prototype.getSelected = original;
  }
}

function normalizeAppearanceText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function appearanceMatchesExpected(drawnChunks, expectedValue) {
  if (expectedValue == null || !drawnChunks.length) return false;
  // Appearance walkers split at PDF text operators, not at semantic word
  // boundaries. A wrapped value may therefore read "GrandviewBoulevard" even
  // though the raster visibly carries "Grandview Boulevard". Whitespace is
  // ignored only for equality; punctuation and character order remain exact.
  const canonical = (value) => normalizeAppearanceText(value).replace(/\s+/g, "");
  return canonical(drawnChunks.join(" ")) === canonical(expectedValue);
}

function protectedCensusField(field, mapEntry) {
  const exactAuthorized = ["candidate_write", "measured_route_selection"].includes(mapEntry?.decision);
  const sharedCategory = exactAuthorized ? null
    : field.sharedProtectCategory ?? field.protectCategory
      ?? field.sharedRegionProtectCategory ?? field.regionProtectCategory ?? null;
  const refusalClass = mapEntry?.decision === "refuse" ? mapEntry.refusalClass : null;
  const fullSubject = `${field.name ?? ""} ${field.effectiveLabel ?? ""} ${field.regionHeading ?? ""}`;
  // Some court PDFs place a wide field next to text from an unrelated column;
  // first-hand capture can therefore produce a misleading nearby label (for
  // example DefendantAddress -> "Incident Date").  An explicitly allowlisted
  // candidate or exact measured route control is still screened by shared
  // protection categories and its field name, but not by that fallible
  // neighboring label.
  const semanticSubject = exactAuthorized
    ? String(field.name ?? "")
    : fullSubject;
  const protectedByRefusal = [
    "signature_or_sworn_participant_act",
    "signature_or_date_participant_completion",
    "unmailed_or_unperformed_service",
    "court_prosecutor_clerk_or_agency_owned",
    "required_before_filing",
    "not_a_filing_fact",
  ].includes(refusalClass)
    // Required-before-filing rows now travel on the declared channel with no
    // refusal class; they are exactly as untouchable as they were.
    || (mapEntry?.decision === "refuse" && mapEntry?.requiredBeforeFiling === true);
  // "mail" is not itself evidence that service occurred: this source labels
  // the applicant's ordinary contact line "My mailing Address", and "Email"
  // contains the same substring. Performed mailing remains protected by the
  // explicit unmailed/unperformed-service refusal class above.
  const protectedByMeaning = !exactAuthorized
    && /signature|signed|notar|jurat|affirmation|\bdate\b|\bday\b|\bmonth\b|\byear\b|\bdob\b|birth|service|served|judge|judicial|court\s*(?:use|only|signature)|clerk|prosecut|district\s*attorney|agency|law\s*enforcement|sheriff|police/i.test(semanticSubject);
  const protectedCourtProcessingChecklist = /\bapplication\s+processing\s+checklist\b/i
    .test(String(field.regionHeading ?? ""));
  return {
    protected: Boolean(sharedCategory || protectedByRefusal || protectedByMeaning || protectedCourtProcessingChecklist),
    category: sharedCategory ?? (protectedByRefusal ? refusalClass : null)
      ?? (protectedByMeaning ? "protected_semantic_label" : null)
      ?? (protectedCourtProcessingChecklist ? "court_owned_processing_checklist" : null),
  };
}

async function paintedPaths(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return pdf.getPages().flatMap((page, index) => extractPageGeometry(page).paths
    .filter((row) => /^(S|s|f|F|f\*|B|B\*|b|b\*)$/.test(String(row.paintedBy ?? "")))
    .map((row) => ({
      page: index + 1, operator: row.operator, paintedBy: row.paintedBy,
      x: +row.x.toFixed(3), y: +row.y.toFixed(3),
      width: +row.width.toFixed(3), height: +row.height.toFixed(3),
    })));
}

async function addedPaintedPaths(beforeBytes, afterBytes) {
  const before = await paintedPaths(beforeBytes);
  const after = await paintedPaths(afterBytes);
  const key = (row) => [row.page, row.operator, row.paintedBy, row.x, row.y, row.width, row.height].join("|");
  const counts = new Map();
  for (const row of before) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return after.filter((row) => {
    const fingerprint = key(row);
    const remaining = counts.get(fingerprint) ?? 0;
    if (remaining <= 0) return true;
    counts.set(fingerprint, remaining - 1);
    return false;
  });
}

function pathsInsideBox(paths, page, box) {
  const width = box.width ?? box.x1 - box.x0;
  const height = box.height ?? box.y1 - box.y0;
  const x1 = box.x1 ?? box.x + width;
  const y1 = box.y1 ?? box.y + height;
  const x0 = box.x0 ?? box.x;
  const y0 = box.y0 ?? box.y;
  const inset = Math.max(0.4, Math.min(1.5, width * 0.15, height * 0.15));
  return paths.filter((row) => {
    if (row.page !== page) return false;
    const rowX1 = row.x + row.width;
    const rowY1 = row.y + row.height;
    const overlapsInterior = rowX1 >= x0 + inset && row.x <= x1 - inset
      && rowY1 >= y0 + inset && row.y <= y1 - inset;
    if (!overlapsInterior) return false;
    const outerOutline = row.operator === "re"
      && Math.abs(row.x - x0) <= 1 && Math.abs(row.y - y0) <= 1
      && Math.abs(rowX1 - x1) <= 1 && Math.abs(rowY1 - y1) <= 1;
    return !outerOutline;
  });
}

async function proofFromArtifact(file, census, fieldMap, report, facts, label,
  { sourceBytes = null, preSelectionBytes = null } = {}) {
  const artifactBytes = fs.readFileSync(file);
  const appearances = await flattenedWidgets(file);
  /*
   * Overlay-stage writes are PAGE TEXT, not widget appearances: the exact-fact
   * overlay draws with page.drawText into the content stream, so the widget-
   * appearance reader above cannot see their ink and would report every one of
   * them missing. Their proof comes from the same first-hand text walk the
   * census uses, read out of the artifact bytes at the measured rectangles.
   */
  const overlayKinds = new Set(["exact_measured_fact_overlay"]);
  let pageTextItems = null;
  let sourceTextKeys = null;
  if ((report.written ?? []).some((w) => overlayKinds.has(w.kind))) {
    const artifactDoc = await PDFDocument.load(artifactBytes, { ignoreEncryption: true, updateMetadata: false });
    pageTextItems = artifactDoc.getPages().map((page) => extractTextItems(page));
    // A widget rectangle often sits on the form's own printed rule or caption.
    // Only ink this build ADDED proves a write, so anything the source page
    // already draws at the same point is excluded from the comparison.
    if (sourceBytes) {
      const sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
      sourceTextKeys = sourceDoc.getPages().map((page) => new Set(
        extractTextItems(page).map((item) => `${Math.round(item.x)}|${Math.round(item.y)}|${String(item.text ?? "").trim()}`)));
    }
  }
  const overlayTextAt = (page, rect) => (pageTextItems?.[page - 1] ?? [])
    .filter((item) => item.x >= rect.x - 1 && item.x <= rect.x + rect.width + 1
      && item.y >= rect.y - 1 && item.y <= rect.y + rect.height + 1)
    .filter((item) => !sourceTextKeys?.[page - 1]?.has(
      `${Math.round(item.x)}|${Math.round(item.y)}|${String(item.text ?? "").trim()}`))
    .map((item) => String(item.text ?? "").trim()).filter(Boolean);
  /*
   * A dropdown write draws the OPTION the form's own /Opt list offers, which
   * is not always the literal held fact string: NY-MRTA-DESTRUCTION-REQUEST's
   * Court_County offers "ALBANY" where the held fact reads "Albany County".
   * The proof therefore expects the option the finalizer's published match
   * rule selects, recomputed here FROM THE SOURCE FORM'S OWN OPTION LIST —
   * never the drawn text itself, so a wrong option still fails the proof.
   * When no option matches (the finalizer would have refused the write), the
   * raw fact stands as expected and a drawn appearance still fails loudly.
   */
  let sourceDropdownOptions = null;
  if (sourceBytes && (report.written ?? []).some((write) => write.kind === "dropdown")) {
    const sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
    sourceDropdownOptions = new Map();
    for (const sourceField of sourceDoc.getForm().getFields()) {
      if (sourceField instanceof PDFDropdown) {
        sourceDropdownOptions.set(sourceField.getName(), sourceField.getOptions?.() ?? []);
      }
    }
  }
  const dropdownExpectedOption = (fieldName, factValue) => {
    const options = sourceDropdownOptions?.get(fieldName) ?? [];
    const wanted = String(factValue ?? "").trim().toLowerCase();
    return options.find((option) => String(option).trim().toLowerCase() === wanted)
      ?? options.find((option) => String(option).trim().toLowerCase() === wanted.replace(/\s*county$/, ""))
      ?? factValue;
  };
  const writtenProof = [];
  const missingWrittenInk = [];
  const wrongWrittenValues = [];
  for (const write of report.written) {
    const field = census.fields.find((row) => row.name === write.field);
    const factExpected = write.factId?.startsWith("matter.charges[")
      ? (() => {
        const match = /^matter\.charges\[(\d+)]\.(.+)$/.exec(write.factId);
        return match ? facts["matter.charges"]?.[Number(match[1])]?.[match[2]] : null;
      })()
      : facts[write.factId];
    const expected = write.kind === "dropdown"
      ? dropdownExpectedOption(write.field, factExpected)
      : factExpected;
    const overlayWrite = overlayKinds.has(write.kind);
    const byWidget = overlayWrite
      ? (write.widgets ?? []).map((w) => overlayTextAt(w.page, w.rect))
      : (field?.widgets ?? []).map((widget) => drawnAt(appearances, {
        page: widget.page, rect: widget.rect, tolerance: 3,
      }).map((entry) => String(entry.text ?? "").trim()).filter(Boolean));
    const drawn = byWidget.flat();
    const exactValueObserved = byWidget.length > 0
      && byWidget.every((chunks) => appearanceMatchesExpected(chunks, expected));
    const row = { field: write.field, factId: write.factId, expectedValue: expected ?? null,
      drawnText: drawn, exactValueObserved,
      derivedFrom: overlayWrite
        ? "page text items read from the artifact content stream at every overlay rectangle"
        : "flattened artifact appearance streams at every measured widget" };
    writtenProof.push(row);
    if (!drawn.length) missingWrittenInk.push(row);
    else if (!exactValueObserved) wrongWrittenValues.push(row);
  }
  const protectedInk = [];
  const sourceAddedPaths = sourceBytes ? await addedPaintedPaths(sourceBytes, artifactBytes) : [];
  const protectedVectorInk = [];
  for (const field of census.fields) {
    const mapEntry = fieldMap.find((row) => row.field === field.name);
    const protection = protectedCensusField(field, mapEntry);
    if (!protection.protected) continue;
    const drawn = field.widgets.flatMap((widget) => drawnAt(appearances, {
      page: widget.page, rect: widget.rect, tolerance: 3,
    })).map((entry) => String(entry.text ?? "").trim()).filter(Boolean);
    if (drawn.length) protectedInk.push({ field: field.name, category: protection.category, drawnText: drawn });
    const vectorPaths = field.widgets.flatMap((widget) => pathsInsideBox(sourceAddedPaths, widget.page, widget.rect));
    if (vectorPaths.length) protectedVectorInk.push({ field: field.name, category: protection.category, vectorPaths });
  }
  assert.deepEqual(missingWrittenInk, [], `${label}: finalizer reported writes that have no artifact appearance`);
  assert.deepEqual(wrongWrittenValues, [], `${label}: artifact appearance does not equal the expected field value`);
  assert.deepEqual(protectedInk, [], `${label}: protected fields carry artifact ink`);
  assert.deepEqual(protectedVectorInk, [], `${label}: protected fields carry artifact-derived vector ink`);
  const selectionAddedPaths = preSelectionBytes ? await addedPaintedPaths(preSelectionBytes, artifactBytes) : [];
  const selectionProof = (report.selections ?? []).map((selection) => {
    const markPaths = pathsInsideBox(selectionAddedPaths, selection.page, selection.box);
    return { ...selection,
      derivedFromArtifactBytesSha256: sha256(artifactBytes),
      artifactDerivedMarkPaths: markPaths,
      markObservedInArtifactBytes: markPaths.length >= 2,
      visualEvidence: "corresponding all-page raster is inventoried in reports/rendered-artifacts.json" };
  });
  assert.ok(selectionProof.every((row) => row.markObservedInArtifactBytes),
    `${label}: reported route selection is absent from artifact-derived vector paths`);
  return {
    artifactSha256: sha256(artifactBytes), artifactByteLength: artifactBytes.length,
    appearanceCount: appearances.length, writtenProof, missingWrittenInk, wrongWrittenValues,
    protectedInk, protectedVectorInk, selectionProof,
  };
}

function officialOut(familyId, jurisdiction) {
  return `data/rcap-all50/overlays/census-v1/${jurisdiction.toLowerCase()}/${familyId.replaceAll("_", "-")}--official-pdf-fill`;
}

function resetOwnedOutput(relativePath) {
  assert.ok(relativePath.startsWith("data/rcap-all50/overlays/census-v1/")
    || relativePath.startsWith("data/rcap-all50/pleadings/"), `refusing to reset out-of-scope path: ${relativePath}`);
  fs.rmSync(abs(relativePath), { recursive: true, force: true });
  fs.mkdirSync(abs(relativePath), { recursive: true });
}

function sourceReceipt(familyId, config, rows) {
  return {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId, worklistGroupId: familyId, jurisdiction: config.jurisdiction,
    routeKeys: config.routeKeys, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    corpusRootProvidedBy: CORPUS_ENV,
    documents: rows.map(({ doc, sourceRow, census }) => ({
      documentId: doc.documentId, documentRole: doc.documentRole, officialTitle: doc.officialTitle,
      revision: doc.revision, pathInArchive: doc.pathInArchive,
      sha256: doc.sha256, byteLength: doc.byteLength,
      matchedBy: "exact_path_sha256_and_byte_length",
      corpusIndexAgrees: sourceRow.indexEntry.sha256 === doc.sha256
        && sourceRow.indexEntry.byteLength === doc.byteLength,
      pageCount: census.pageGeometry.length, acroFieldCount: census.fields.length,
      structuralClassObserved: sourceRow.indexEntry.structuralClassObserved,
      generatedParticipantArtifact: doc.render !== false,
    })),
    whatThisReceiptDoesNotEstablish: [
      "that an unknown-revision source remains current",
      "that local court practice or route branching has been resolved",
      "that any artifact has completed legal or commercial approval",
    ],
  };
}

function participantInstructions(config, fieldMaps) {
  if (config.guidance) return guidedParticipantInstructions(config, fieldMaps);
  const routeLines = config.routeKeys.map((route) => `- Route scope: \`${route}\``).join("\n");
  const notes = (config.notes ?? []).map((note) => `- ${note}`).join("\n");
  const requiredBeforeFiling = [...new Map(fieldMaps.flatMap((document) => document.fields)
    .filter((field) => field.blankTreatment === "REQUIRED_BEFORE_FILING")
    .map((field) => [field.field, field.effectiveLabel ?? field.field])).entries()]
    .map(([field, label]) => `- ${label} (source field: \`${field}\`)`)
    .join("\n");
  return `# Participant and reviewer instructions\n\n`
    + `These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.\n\n`
    + `${routeLines}\n\n## Required participant/local completion\n\n`
    + `- Review every page, choose only legally applicable elections, and complete every required signature and date yourself.\n`
    + `- Complete service certificates only after service actually occurs.\n`
    + `- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.\n`
    + `- Confirm current revision, filing destination, local procedures, fees, attachments, service, and proposed-order requirements before filing.\n`
    + (requiredBeforeFiling
      ? `\n## Exact facts still required before filing\n\nThe platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.\n\n${requiredBeforeFiling}\n`
      : "")
    + `${notes}\n`;
}

/*
 * The filing-guidance house standard: the destination, the fee-and-waiver
 * answer, the service answer, and where self-help ends each get a real
 * statement or a named checkable authority -- a catch-all line that lists
 * "fees" among other items answers nothing. Families opt in by declaring a
 * `guidance` block; a family without one keeps the legacy template and no
 * other family's committed instructions are touched by this function existing.
 *
 * The blanks table is derived from the same field map the auditors read, so a
 * required-before-filing blank can never exist that the participant was not
 * told about.
 */
function guidedParticipantInstructions(config, fieldMaps) {
  const g = config.guidance;
  const routeLines = config.routeKeys.map((route) => `- Route scope: \`${route}\``).join("\n");
  const notes = (config.notes ?? []).map((note) => `- ${note}`).join("\n");
  const tables = fieldMaps
    .filter((document) => document.generatedParticipantArtifact)
    .map((document) => {
      const rows = document.fields
        .filter((field) => field.requiredBeforeFiling === true)
        .sort((a, b) => a.field.localeCompare(b.field))
        .map((field) => {
          const label = field.effectiveLabel ?? field.field;
          const caption = label === field.field
            ? "the measurement could reach no printed caption; read the printed page"
            : `the form prints \`${label}\` beside it`;
          const serviceNote = field.completesAfterService === true
            ? " — complete this only after service has actually occurred" : "";
          const page = field.widgets?.[0]?.page ?? "?";
          return `| ${page} | \`${field.field}\` | ${caption}${serviceNote} |`;
        });
      if (rows.length === 0) return "";
      return `### ${document.documentId}\n\n| Page | Form field | What the form says |\n| --- | --- | --- |\n${rows.join("\n")}\n`;
    })
    .filter(Boolean)
    .join("\n");
  return `# Participant and reviewer instructions\n\n`
    + `These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.\n\n`
    + `${routeLines}\n\n## Required participant/local completion\n\n`
    + `- Review every page, choose only legally applicable elections, and complete every required signature and date yourself.\n`
    + `- Complete service certificates only after service actually occurs.\n`
    + `- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.\n`
    + `- Confirm current revision, filing destination, local procedures, fees, attachments, service, and proposed-order requirements before filing.\n`
    + (notes ? `${notes}\n` : "")
    + `\n## The blanks you must fill in before filing\n\n`
    + `The platform holds no value for any of these, and this packet never guesses at one. Each row names the page of the component, the form field as the source PDF names it, and the words the measurement read next to the blank. Where the measurement could reach no printed caption, read the printed page to see what the blank asks for.\n\n`
    + `${tables}\n`
    + `${g.afterTheTable.map((p) => `${p}\n`).join("\n")}\n`
    + `## Where self-help ends\n\n`
    + `${g.selfHelpEnds.map((p) => `${p}\n`).join("\n")}\n`
    + `## Blanks that are not yours to fill\n\n`
    + `${g.notYours.map((p) => `- ${p}`).join("\n")}\n`;
}

async function buildOfficial(familyId, config) {
  const out = officialOut(familyId, config.jurisdiction);
  // Read what a repair lane installed on this family BEFORE the reset clears
  // it: the completeness classifications on the prior field map (carried
  // forward row by row, see installedRefusalRows) and the captain-installed
  // integration record, which no build path generates and which a reset must
  // therefore not destroy.
  const priorMapFile = abs(`${out}/production-field-map.json`);
  const installed = installedRefusalRows(
    fs.existsSync(priorMapFile) ? JSON.parse(fs.readFileSync(priorMapFile, "utf8")) : null);
  const wiringFile = abs(`${out}/product-wiring.json`);
  const installedWiring = fs.existsSync(wiringFile) ? fs.readFileSync(wiringFile) : null;
  resetOwnedOutput(out);
  if (installedWiring) fs.writeFileSync(wiringFile, installedWiring);
  const rows = [];
  const fieldMaps = [];
  const artifactReports = [];
  const rasterReports = [];

  for (const doc of config.documents) {
    console.log(`\n=== ${familyId}: ${doc.documentId} ===`);
    const sourceRow = resolveSource(doc);
    const census = await censusDocument(doc, sourceRow.bytes);
    const map = fieldMapFor(doc, census, installed);
    rows.push({ doc, sourceRow, census });
    fieldMaps.push({ documentId: doc.documentId, documentRole: doc.documentRole,
      generatedParticipantArtifact: doc.render !== false, fields: map });
    console.log(`  source ${doc.sha256.slice(0, 16)}… ${sourceRow.bytes.length} bytes; ${census.pageGeometry.length} pages; ${census.fields.length} fields`);
    if (doc.render === false) continue;

    for (const [fixture, facts] of [["canonical", factsForJurisdiction(config.jurisdiction)],
      ["boundary", factsForJurisdiction(config.jurisdiction, true)]]) {
      const unwritableFields = map.filter((row) => row.decision !== "candidate_write")
        .map((row) => ({ field: row.field,
          class: row.refusalClass ?? (row.requiredBeforeFiling === true ? "required_before_filing" : "route_selection_or_role") }));
      const finalized = await finalizeEastOfficialForm({
        sourceBytes: sourceRow.bytes, expectedSha256: doc.sha256,
        census: census.fields, facts, explicitMappings: factMappingsForDocument(doc),
        exactFieldMap: map,
        unwritableFields, documentTextLines: census.documentTextLines,
        title: `${config.jurisdiction} ${doc.documentId} ${fixture} review artifact`,
      });
      const preSelectionBytes = finalized.bytes;
      let bytes = finalized.bytes;
      let selectionReport = null;
      const selections = measuredSelections(doc, census);
      if (selections.length) {
        const selected = await finalizeFlatOverlay({
          sourceBytes: bytes, expectedSha256: sha256(bytes), anchors: [], selections,
          facts, documentTextLines: census.documentTextLines,
          title: `${config.jurisdiction} ${doc.documentId} ${fixture} measured-route-selection artifact`,
        });
        bytes = selected.bytes;
        selectionReport = selected.report;
        assert.equal(selectionReport.selections.length, selections.length,
          `${doc.documentId}/${fixture}: a measured route selection was refused`);
        assert.equal(selectionReport.selectionsRefused.length, 0,
          `${doc.documentId}/${fixture}: a measured route selection was refused`);
      }
      const file = `${out}/fixtures/${doc.key}-${fixture}.pdf`;
      writeBytes(file, bytes);
      const report = mergeReport(finalized.report, selectionReport);
      const proof = await proofFromArtifact(abs(file), census, map, report, facts, `${doc.documentId}/${fixture}`, {
        sourceBytes: sourceRow.bytes,
        preSelectionBytes,
      });
      artifactReports.push({
        documentId: doc.documentId, documentKey: doc.key, fixture, file,
        sha256: sha256(bytes), byteLength: bytes.length, pageCount: census.pageGeometry.length,
        report, proof,
      });
      console.log(`  ${fixture}: wrote ${report.written.length}; refused ${report.refused.length}; selections ${report.selections.length}`);

      const rasterDir = `${out}/raster/${doc.key}-${fixture}`;
      const rasterRows = await rasterizePdf({ file: abs(file), outDir: abs(rasterDir), prefix: "page" });
      assert.equal(rasterRows.length, census.pageGeometry.length, `${doc.documentId}/${fixture}: not every page rastered`);
      assert.equal(rasterRows.filter((row) => row.looksBlank).length, 0, `${doc.documentId}/${fixture}: blank raster page`);
      const contactFile = `${out}/reports/contact-sheets/${doc.key}-${fixture}.png`;
      const contactSheetRaw = await writeContactSheet(rasterRows, abs(contactFile));
      rasterReports.push({
        documentId: doc.documentId, fixture, sourcePdf: file, directory: rasterDir,
        engine: "bundled_poppler_pdftoppm", dpi: RASTER_DPI,
        contactSheet: { ...contactSheetRaw, file: contactFile },
        pages: rasterRows.map((row) => ({
          page: row.page, file: path.posix.join(rasterDir, path.basename(row.file)),
          sha256: sha256(fs.readFileSync(row.file)), byteLength: fs.statSync(row.file).size,
          widthPx: row.widthPx, heightPx: row.heightPx, attempts: row.attempts,
          looksBlank: row.looksBlank, croppedToPage: row.croppedToPage,
          engine: row.engine, dpi: row.dpi,
        })),
      });
      console.log(`  raster: ${rasterRows.length}/${census.pageGeometry.length} pages`);
    }
  }

  writeJson(`${out}/source-receipt.json`, sourceReceipt(familyId, config, rows));
  writeJson(`${out}/field-census.census-v1.json`, {
    schemaVersion: "rcap-first-hand-field-census/v1", familyId,
    measurementRules: {
      widgetGeometry: "AcroForm /Rect read first-hand from the exact pinned binary",
      labels: "captured from decoded page text next to measured widgets",
      drawnGeometry: "stroked rectangles parsed from decoded content streams with CTM tracking",
      inheritedMeasurementsUsed: false,
    },
    documents: rows.map(({ doc, census }) => ({
      documentId: doc.documentId, sourceSha256: doc.sha256,
      pageGeometry: census.pageGeometry, pageTextLineCounts: census.pageTextLineCounts,
      ctmStrokedGeometry: census.ctmStrokedGeometry, fields: census.fields,
    })),
  });
  writeJson(`${out}/production-field-map.json`, {
    schemaVersion: "rcap-production-field-map/v1", familyId,
    commercialAuthority: false, runtimeSelectable: false,
    documents: fieldMaps,
  });
  writeJson(`${out}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-from-artifact-bytes/v1", familyId,
    artifacts: artifactReports.map((row) => ({
      documentId: row.documentId, fixture: row.fixture, file: row.file,
      sha256: row.sha256, byteLength: row.byteLength,
      written: row.report.written, refused: row.report.refused,
      selections: row.report.selections,
      choiceNeutralization: row.report.fieldFinalizer.choiceNeutralization,
      proof: row.proof,
    })),
  });
  writeJson(`${out}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId,
    derivedFromBytes: true,
    pdfs: artifactReports.map((row) => ({ file: row.file, documentId: row.documentId,
      fixture: row.fixture, sha256: row.sha256, byteLength: row.byteLength, pageCount: row.pageCount })),
    rasters: rasterReports,
    // A source-only companion is deliberately not rendered; the record says so
    // by name, so its absence from the fixtures reads as the decision it is
    // rather than as a missing component.
    componentsNotGenerated: config.documents.filter((doc) => doc.render === false).map((doc) => ({
      documentId: doc.documentId, documentRole: doc.documentRole,
      generatedParticipantArtifact: false,
      why: "This companion is held as exact source evidence and is not a generated participant artifact, so no fixture is rendered for it.",
    })),
  });
  writeJson(`${out}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId,
    status: "artifact_evidence_built_review_required",
    routeKeys: config.routeKeys, notes: config.notes ?? [],
    hardRulesVerified: [
      "exact source path, SHA-256, and byte length matched the corpus index and installed source",
      "every field received an explicit candidate-write, route-selection, or refusal disposition",
      "signatures, dates, unperformed service, court, prosecutor, clerk, agency, and notary fields carried no generated ink",
      "all emitted PDF pages were rasterized and byte-inventoried",
    ],
    blockers: [
      "completed-output legal approval has not been granted",
      "commercial release and runtime selection remain disabled",
      "current revision/status and local court practice must be confirmed",
      ...(config.jurisdiction === "PA" ? ["court-status branch and conditional fee-waiver use require participant/local confirmation"] : []),
    ],
    commercialAuthority: false, runtimeSelectable: false,
  });
  writeJson(`${out}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId,
    status: "REQUESTED_NOT_GRANTED", requestedScope: config.routeKeys,
    evidenceFiles: ["source-receipt.json", "field-census.census-v1.json", "production-field-map.json",
      "reports/actual-writes.json", "reports/rendered-artifacts.json", "build-findings.json"],
    commercialAuthority: false, runtimeSelectable: false,
  });
  writeText(`${out}/participant-instructions.md`, participantInstructions(config, fieldMaps));
  console.log(`\n${familyId}: BUILD PASS (${artifactReports.length} PDFs; ${rasterReports.reduce((n, row) => n + row.pages.length, 0)} page rasters)`);
}

async function checkOfficial(familyId, config) {
  const out = officialOut(familyId, config.jurisdiction);
  const required = ["source-receipt.json", "field-census.census-v1.json", "production-field-map.json",
    "reports/actual-writes.json", "reports/rendered-artifacts.json", "build-findings.json",
    "approval-request.json", "participant-instructions.md"];
  for (const file of required) assert.ok(fs.existsSync(abs(`${out}/${file}`)), `${familyId}: missing ${file}`);
  const receipt = readJson(`${out}/source-receipt.json`);
  const census = readJson(`${out}/field-census.census-v1.json`);
  const map = readJson(`${out}/production-field-map.json`);
  const writes = readJson(`${out}/reports/actual-writes.json`);
  const rendered = readJson(`${out}/reports/rendered-artifacts.json`);
  const findings = readJson(`${out}/build-findings.json`);
  const approval = readJson(`${out}/approval-request.json`);
  assert.equal(receipt.schemaVersion, "rcap-family-source-receipt/v1");
  assert.equal(receipt.familyId, familyId);
  assert.equal(receipt.worklistGroupId, familyId);
  assert.equal(receipt.jurisdiction, config.jurisdiction);
  assert.deepEqual(receipt.routeKeys, config.routeKeys);
  assert.equal(receipt.implementationStrategy, "official_pdf_fill");
  assert.equal(receipt.custodyClass, "SOURCE_ALREADY_HELD");
  assert.equal(receipt.acquisitionCommissioned, false);
  assert.equal(receipt.sourceArchive, "Expungement_AI_RCAP_Master_Library_Edition_1");
  assert.equal(receipt.corpusRootProvidedBy, CORPUS_ENV);
  assert.equal(receipt.documents.length, config.documents.length);
  assert.equal(census.documents.length, config.documents.length);
  assert.equal(map.documents.length, config.documents.length);
  assert.equal(map.commercialAuthority, false);
  assert.equal(map.runtimeSelectable, false);
  for (const [index, doc] of config.documents.entries()) {
    const sourceRow = resolveSource(doc);
    const documentCensus = census.documents[index];
    assert.equal(documentCensus.documentId, doc.documentId,
      `${doc.documentId}: receipt/census order drift`);
    assert.deepEqual(receipt.documents[index], {
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      revision: doc.revision,
      pathInArchive: doc.pathInArchive,
      sha256: doc.sha256,
      byteLength: doc.byteLength,
      matchedBy: "exact_path_sha256_and_byte_length",
      corpusIndexAgrees: true,
      pageCount: documentCensus.pageGeometry.length,
      acroFieldCount: documentCensus.fields.length,
      structuralClassObserved: sourceRow.indexEntry.structuralClassObserved,
      generatedParticipantArtifact: doc.render !== false,
    }, `${doc.documentId}: source receipt drift`);
  }
  for (const [name, record] of Object.entries({ receipt, census, map, writes, rendered, findings, approval })) {
    assertFailClosedEvidence(record, `${familyId}/${name}`);
  }
  for (const documentMap of map.documents) {
    const documentCensus = census.documents.find((row) => row.documentId === documentMap.documentId);
    assert.ok(documentCensus, `${documentMap.documentId}: census absent`);
    assert.equal(documentMap.fields.length, documentCensus.fields.length, `${documentMap.documentId}: incomplete field dispositions`);
    assert.equal(new Set(documentMap.fields.map((row) => row.field)).size, documentMap.fields.length,
      `${documentMap.documentId}: duplicate field-map disposition`);
  }
  assert.equal(new Set(rendered.pdfs.map((pdf) => pdf.file)).size, rendered.pdfs.length,
    `${familyId}: duplicate rendered PDF record`);
  assert.equal(new Set(rendered.rasters.map((raster) => raster.sourcePdf)).size, rendered.rasters.length,
    `${familyId}: duplicate raster group`);
  assert.deepEqual(rendered.rasters.map((raster) => raster.sourcePdf).sort(),
    rendered.pdfs.map((pdf) => pdf.file).sort(),
    `${familyId}: orphaned or unrastered PDF record`);
  for (const pdf of rendered.pdfs) {
    assert.ok(fs.existsSync(abs(pdf.file)), `${familyId}: missing rendered PDF ${pdf.file}`);
    const bytes = fs.readFileSync(abs(pdf.file));
    assert.equal(sha256(bytes), pdf.sha256, `${pdf.file}: PDF hash drift`);
    assert.equal(bytes.length, pdf.byteLength, `${pdf.file}: PDF byte drift`);
    const reopened = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pdfPages = reopened.getPages();
    assert.equal(pdfPages.length, pdf.pageCount, `${pdf.file}: PDF page-count drift`);
    const raster = rendered.rasters.find((row) => row.sourcePdf === pdf.file);
    assert.ok(raster, `${pdf.file}: raster record absent`);
    assert.equal(raster.engine, "bundled_poppler_pdftoppm", `${pdf.file}: unexpected raster engine`);
    assert.equal(raster.dpi, RASTER_DPI, `${pdf.file}: unexpected raster DPI`);
    assert.equal(raster.pages.length, pdf.pageCount, `${pdf.file}: incomplete all-page raster`);
    assert.deepEqual(raster.pages.map((page) => page.page),
      Array.from({ length: pdf.pageCount }, (_, index) => index + 1),
      `${pdf.file}: raster page sequence is incomplete`);
    const contactBytes = fs.readFileSync(abs(raster.contactSheet.file));
    assert.equal(sha256(contactBytes), raster.contactSheet.sha256, `${raster.contactSheet.file}: contact-sheet drift`);
    for (const page of raster.pages) {
      assert.ok(fs.existsSync(abs(page.file)), `${pdf.file}: missing raster ${page.file}`);
      const pageBytes = fs.readFileSync(abs(page.file));
      assert.equal(sha256(pageBytes), page.sha256, `${page.file}: raster hash drift`);
      assert.equal(pageBytes.length, page.byteLength, `${page.file}: raster byte drift`);
      const metadata = await sharp(abs(page.file)).metadata();
      const stats = await sharp(abs(page.file)).greyscale().stats();
      const recomputedBlank = rasterLooksBlank(stats);
      const geometry = pdfPages[page.page - 1].getSize();
      const expectedWidth = Math.round(geometry.width * RASTER_DPI / 72);
      const expectedHeight = Math.round(geometry.height * RASTER_DPI / 72);
      const recomputedCrop = Math.abs(metadata.width - expectedWidth) <= 1
        && Math.abs(metadata.height - expectedHeight) <= 1;
      assert.equal(metadata.format, "png", `${page.file}: raster is not PNG`);
      assert.equal(metadata.width, page.widthPx, `${page.file}: stored width drift`);
      assert.equal(metadata.height, page.heightPx, `${page.file}: stored height drift`);
      assert.equal(recomputedBlank, false, `${page.file}: blank page raster`);
      assert.equal(page.looksBlank, recomputedBlank, `${page.file}: stored blank flag drift`);
      assert.equal(recomputedCrop, true, `${page.file}: raster is not cropped to the PDF page`);
      assert.equal(page.croppedToPage, recomputedCrop, `${page.file}: stored crop flag drift`);
      assert.equal(page.dpi, RASTER_DPI, `${page.file}: raster DPI mismatch`);
    }
    await verifyFreshPopplerRaster({
      pdfFile: pdf.file, raster, pdfPages, label: `${familyId}/${pdf.file}`,
    });
  }
  assert.equal(writes.artifacts.length, rendered.pdfs.length);
  for (const artifact of writes.artifacts) {
    const doc = config.documents.find((candidate) => candidate.documentId === artifact.documentId);
    const documentCensus = census.documents.find((candidate) => candidate.documentId === artifact.documentId);
    const documentMap = map.documents.find((candidate) => candidate.documentId === artifact.documentId);
    assert.ok(doc && documentCensus && documentMap, `${artifact.file}: proof inputs are incomplete`);
    const sourceRow = resolveSource(doc);
    const liveCensus = await censusDocument(doc, sourceRow.bytes);
    // The stored map is its own carry-forward source: a carried row carries to
    // itself, so the drift check still proves the stored map is reproducible.
    const liveMap = fieldMapFor(doc, liveCensus, installedRefusalRows(map));
    assert.deepEqual(liveCensus.fields, documentCensus.fields,
      `${artifact.file}: live first-hand census drift`);
    assert.deepEqual(liveMap, documentMap.fields,
      `${artifact.file}: live field-map drift`);
    const fixtureFacts = factsForJurisdiction(config.jurisdiction, artifact.fixture === "boundary");
    const unwritableFields = liveMap.filter((row) => row.decision !== "candidate_write")
      .map((row) => ({ field: row.field, class: row.refusalClass ?? "route_selection_or_role" }));
    const finalized = await finalizeEastOfficialForm({
      sourceBytes: sourceRow.bytes, expectedSha256: doc.sha256,
      census: liveCensus.fields, facts: fixtureFacts,
      explicitMappings: factMappingsForDocument(doc),
      exactFieldMap: liveMap,
      unwritableFields, documentTextLines: liveCensus.documentTextLines,
      title: `${config.jurisdiction} ${doc.documentId} ${artifact.fixture} review artifact`,
    });
    const preSelectionBytes = finalized.bytes;
    let recomputedBytes = finalized.bytes;
    let selectionReport = null;
    const selections = measuredSelections(doc, liveCensus);
    if (selections.length) {
      const selected = await finalizeFlatOverlay({
        sourceBytes: recomputedBytes, expectedSha256: sha256(recomputedBytes), anchors: [], selections,
        facts: fixtureFacts, documentTextLines: liveCensus.documentTextLines,
        title: `${config.jurisdiction} ${doc.documentId} ${artifact.fixture} measured-route-selection artifact`,
      });
      recomputedBytes = selected.bytes;
      selectionReport = selected.report;
    }
    const recomputedReport = mergeReport(finalized.report, selectionReport);
    assert.equal(sha256(recomputedBytes), artifact.sha256,
      `${artifact.file}: deterministic live build does not match stored artifact`);
    assert.equal(recomputedBytes.length, artifact.byteLength,
      `${artifact.file}: deterministic live build byte-length drift`);
    assert.deepEqual(recomputedReport.written, artifact.written,
      `${artifact.file}: live write report drift`);
    assert.deepEqual(recomputedReport.refused, artifact.refused,
      `${artifact.file}: live refusal report drift`);
    assert.deepEqual(recomputedReport.selections, artifact.selections,
      `${artifact.file}: live route-selection report drift`);
    assert.deepEqual(finalized.report.choiceNeutralization, artifact.choiceNeutralization,
      `${artifact.file}: live choice-neutralization evidence drift`);
    const freshProof = await proofFromArtifact(
      abs(artifact.file),
      liveCensus,
      liveMap,
      { written: artifact.written, selections: artifact.selections },
      fixtureFacts,
      `${artifact.documentId}/${artifact.fixture}/check`,
      { sourceBytes: sourceRow.bytes, preSelectionBytes },
    );
    assert.deepEqual(freshProof.protectedInk, [], `${artifact.file}: protected ink recorded`);
    assert.deepEqual(freshProof.protectedVectorInk, [], `${artifact.file}: protected vector ink recorded`);
    assert.deepEqual(freshProof.missingWrittenInk, [], `${artifact.file}: reported write is not visible`);
    assert.deepEqual(freshProof.wrongWrittenValues, [], `${artifact.file}: written value is wrong or swapped`);
    assert.ok(freshProof.writtenProof.every((row) => row.exactValueObserved),
      `${artifact.file}: not every expected value is observed exactly`);
    assert.ok(freshProof.selectionProof.every((row) => row.markObservedInArtifactBytes),
      `${artifact.file}: route-selection mark is not proven from artifact paths`);
    assert.equal(freshProof.artifactSha256, artifact.sha256, `${artifact.file}: actual-write proof hash mismatch`);
  }
  assert.equal(findings.commercialAuthority, false);
  assert.equal(findings.runtimeSelectable, false);
  assert.equal(approval.status, "REQUESTED_NOT_GRANTED");
  assert.equal(approval.commercialAuthority, false);
  assert.equal(approval.runtimeSelectable, false);
  console.log(`build-census-v1-${familyId}: CHECK PASS (${rendered.pdfs.length} PDFs; ${rendered.rasters.reduce((n, row) => n + row.pages.length, 0)} rasters)`);
}

const OH_TRACKS = {
  oh_marijuana_expungement: {
    relief: "expungement", title: "Application for Expungement of a Qualifying Marijuana or Hashish Possession Conviction",
    authority: [
      { citation: "Ohio Rev. Code § 2953.321", description: "application concerning a qualifying marijuana or hashish possession conviction" },
      { citation: "Ohio Rev. Code § 2953.61", description: "same-act multiple-charge limitation that must be screened before filing" },
    ],
    hardStops: [
      "The charge must fit the narrow statutory marijuana/hashish-possession scope; any broader drug or trafficking issue stops self-help.",
      "Every charge arising from the same act must be reviewed under Ohio Rev. Code § 2953.61.",
      "Evidence must identify the qualifying statutory subsection, the amount where relevant, and that the conviction predates March 20, 2026.",
      "The recorded $50 filing fee or an indigency exception, the 45-to-90-day hearing window, prosecutor notice, and any probation inquiry must be confirmed against current court practice.",
      "The sentencing court's current local application and filing instructions must be obtained before release.",
    ],
    memoRequirements: {
      proposedOrder: "proposed expungement order",
      qualifyingEvidence: "qualifying statutory subsection, amount where relevant, and pre-March 20, 2026 conviction timing",
      filingFee: "$50, subject to a confirmed indigency exception and current local practice",
      hearing: "court-set hearing 45 to 90 days after filing, with prosecutor notice and any required probation inquiry",
      postOrder: "destruction, deletion, and erasure of authorized official records and index references",
    },
  },
  oh_2953_32_sealing: {
    relief: "sealing", title: "Application to Seal an Adult Conviction Record",
    authority: [
      { citation: "Ohio Rev. Code § 2953.32", description: "adult-conviction sealing application and court determination" },
      { citation: "Ohio Rev. Code § 2953.61", description: "same-act multiple-charge limitation" },
    ],
    hardStops: [
      "Every charge from the same act and every pending proceeding must be reviewed before filing.",
      "The applicable final-discharge waiting period and all statutory exclusions require source-backed confirmation.",
      "The sentencing court's current local application and filing instructions must be obtained before release.",
    ],
  },
  oh_2953_32_expungement: {
    relief: "expungement", title: "Application to Expunge an Adult Conviction Record",
    authority: [
      { citation: "Ohio Rev. Code § 2953.32", description: "adult-conviction expungement application and court determination" },
      { citation: "Ohio Rev. Code § 2953.61", description: "same-act multiple-charge limitation" },
    ],
    hardStops: [
      "The compound expungement clock and applicable exclusion must be confirmed; the artifact does not calculate eligibility.",
      "Every charge from the same act and every pending proceeding must be reviewed.",
      "Whether earlier sealing affects later expungement and the court's current local form remain release blockers.",
    ],
  },
  oh_2953_33_nonconviction: {
    relief: "sealing or expungement", title: "Application to Seal or Expunge a Non-Conviction Record",
    authority: [
      { citation: "Ohio Rev. Code § 2953.33", description: "not-guilty, dismissal, no-bill, or pardon record relief" },
      { citation: "Ohio Rev. Code § 2953.61", description: "same-act multiple-charge limitation" },
    ],
    hardStops: [
      "A dismissal without prejudice stops unless the limitations period has expired.",
      "The participant must make the sealing-versus-expungement election after review of division (C); the build does not choose.",
      "Every same-act charge, pending proceeding, and the handling court's local application must be confirmed.",
    ],
  },
  oh_2953_35_firearm: {
    relief: "expungement", title: "Application to Expunge a Conviction Under the Obsolete Concealed-Handgun Notification Law",
    authority: [
      { citation: "Ohio Rev. Code § 2953.35", description: "narrow relief for specified obsolete concealed-handgun notification-law convictions" },
      { citation: "Ohio Rev. Code §§ 2923.12 and 2923.16", description: "former statutory provisions whose exact version must be confirmed" },
      { citation: "Ohio Rev. Code § 2953.61", description: "same-act multiple-charge limitation" },
    ],
    hardStops: [
      "This is not a general firearm expungement; any conviction outside the specified obsolete notification-law scope stops.",
      "The former statutory version and whether the conduct would still be a crime must be reviewed from source.",
      "Every same-act charge and the sentencing court's current local application must be confirmed.",
    ],
  },
};

function ohioPleadingConfig(trackId, definition) {
  const action = definition.relief === "sealing" ? "seal"
    : definition.relief === "expungement" ? "expunge" : "[SEAL OR EXPUNGE — APPLICANT MUST ELECT AFTER REVIEW]";
  const requiresProposedOrder = trackId === "oh_marijuana_expungement";
  return {
    jurisdictionCode: "OH", trackId,
    templateGrade: "legal_ops_custom_pleading", templateLifecycle: "replacement_candidate",
    primaryReliefTerm: definition.relief,
    documentTitleFull: definition.title,
    courtCaption: "IN THE OHIO COURT THAT HANDLED THE CASE — LOCAL CAPTION MUST BE CONFIRMED",
    primaryStatutoryAuthority: definition.authority,
    verificationStatute: { citation: null, description: "No statewide verification language is asserted; use the local court form." },
    includeProposedOrder: requiresProposedOrder, includeCertificateOfService: false, serviceNote: null,
    counselFlags: [
      "ARTIFACT ONLY — NOT FILING READY",
      "LOCAL COURT FORM AND CAPTION REQUIRED",
      "SCREEN OHIO REV. CODE § 2953.61 BEFORE USE",
      ...definition.hardStops,
    ],
    presentation: {
      sovereignPartyName: "STATE OF OHIO", sovereignPartyProper: "the State of Ohio", sovereignRole: "Respondent",
      movantRole: "Applicant", filingNoun: "Application", divisionLine: "CRIMINAL DIVISION",
      usesCounty: false, courtName: "Ohio court that handled the case",
      venueDescriptor: "the Ohio court and county where the case was handled",
      recordCustodianLead: requiresProposedOrder
        ? "the Ohio Bureau of Criminal Identification and all criminal justice agencies holding records of the qualifying conviction"
        : null,
      proposedOrderClauses: requiresProposedOrder ? [
        "Only after the Court independently finds the statutory requirements satisfied, all official records pertaining to the qualifying conviction, and all index references to those records, shall be destroyed, deleted, or erased only to the extent Ohio Rev. Code § 2953.321 authorizes.",
        "No agency shall treat this unsigned proposed order as effective; relief begins only upon entry of a signed judicial order.",
      ] : null,
      verificationVerb: null, verificationPenaltyLabel: null,
      serviceRecipientLabel: null, serviceRecipientAddressLabel: null,
      reliefActionVerb: action, orderActionVerb: action,
      recordsScopePhrase: "only the records the cited statute authorizes the Court to reach",
      reliefClauses: [
        `(a) Grant only the ${definition.relief} relief authorized by the cited statute after the Court confirms eligibility and scope;`,
        "(b) Identify in its order the records and custodians lawfully reached; and",
        "(c) Grant no relief beyond the cited statutory authority.",
      ],
    },
  };
}

const customCanonicalFixture = {
  partyData: { petitionerName: "Jordan Avery Reyes", petitionerAddress: "118 Maple Street, Columbus, Ohio 43215" },
  caseData: { countyName: "Franklin", docketNumber: "24-CR-001234" },
  chargeData: { chargeDescription: "Possession offense shown on the certified disposition",
    disposition: "Disposition shown on the certified disposition", arrestingAgency: "[ARRESTING AGENCY MUST BE CONFIRMED]" },
  eligibilityData: { eligibilityBasisLabel: "Eligibility is not certified by this artifact; source review and local-court confirmation are required",
    additionalFacts: ["Applicant will attach the certified disposition and list every charge arising from the same act."] },
  attachments: ["Certified disposition (participant must obtain)", "BCI criminal-history record (participant must obtain)"],
  productName: "RCAP evidence build", shadowMode: true,
};
const customBoundaryFixture = {
  partyData: { petitionerName: "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
    petitionerAddress: "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B, Unincorporated Township of Long Hollow Crossing, Ohio 43215-9999" },
  caseData: { countyName: "Saint Bartholomew and the Northern Reaches",
    docketNumber: "0123-45-2026-CR-900123.00-AB-CDE/2201" },
  chargeData: { chargeDescription: "The complete charge description must be copied from the unusually long certified charging document and disposition",
    disposition: "The complete disposition must be confirmed from the court record", arrestingAgency: "[ARRESTING AGENCY MUST BE CONFIRMED]" },
  eligibilityData: { eligibilityBasisLabel: "Boundary fixture only; eligibility, remedy, statutory version, timing, and local practice all require source-backed review",
    additionalFacts: ["Applicant must disclose and review every companion charge and every pending proceeding before use."] },
  attachments: ["Certified disposition (participant must obtain)", "Complete same-act charge schedule (participant must assemble)",
    "BCI criminal-history record (participant must obtain)"],
  productName: "RCAP evidence build", shadowMode: true,
};

function fixtureForOhioTrack(trackId, baseFixture) {
  const fixture = JSON.parse(JSON.stringify(baseFixture));
  if (trackId !== "oh_marijuana_expungement") return fixture;
  fixture.eligibilityData.additionalFacts = [
    ...(fixture.eligibilityData.additionalFacts ?? []),
    "Applicant will attach source evidence identifying the qualifying statutory subsection, the amount where relevant, and that the conviction predates March 20, 2026.",
    "The filing court must independently confirm the 45-to-90-day hearing schedule, prosecutor notice, and any required probation inquiry.",
  ];
  fixture.attachments = [
    ...(fixture.attachments ?? []),
    "Evidence of the qualifying statutory subsection and amount, where relevant (participant must obtain)",
    "Evidence that the qualifying conviction predates March 20, 2026 (participant must obtain)",
    "Unsigned proposed expungement order with judicial date and signature blank (included in this review artifact)",
  ];
  return fixture;
}

let customModulesCache = null;
async function customModules() {
  if (customModulesCache) return customModulesCache;
  const renderer = await import(pathToFileURL(abs("src/lib/record-clearing/renderers/custom-pleading-renderer.ts")).href);
  const qa = await import(pathToFileURL(abs("src/lib/record-clearing/pleading-qa.ts")).href);
  customModulesCache = { ...renderer, ...qa };
  return customModulesCache;
}

function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-").replaceAll("−", "-");
}

async function renderPleadingPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title); pdf.setProducer("RCAP EAST artifact-only renderer"); pdf.setCreator("RCAP evidence build");
  const fixed = new Date(FIXED_DATE); pdf.setCreationDate(fixed); pdf.setModificationDate(fixed);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14, width = 612, height = 792, margin = 72, maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]); let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let current = "";
    for (const char of token) {
      if (current && font.widthOfTextAtSize(`${current}${char}`, fontSize) > maxWidth) { chunks.push(current); current = char; }
      else current += char;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((word) => font.widthOfTextAtSize(word, fontSize) > maxWidth ? splitToken(word) : [word]);
    const rows = []; let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = word; }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

function composedOut(familyId) {
  return familyId === "oh_marijuana_expungement-set"
    ? "data/rcap-all50/overlays/census-v1/oh/oh-marijuana-expungement-set--custom-pleading"
    : "data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading";
}

function composedRouteKeys(familyId) {
  return familyId === "oh_marijuana_expungement-set"
    ? ["obligation:track-pathway:OH:oh_marijuana_expungement:marijuana-hashish-possession-expungement-under-2953-321"]
    : [
      "obligation:track-only:OH:oh_2953_32_sealing",
      "obligation:track-pathway:OH:oh_2953_32_expungement:adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32",
      "obligation:track-pathway:OH:oh_2953_33_nonconviction:adult-non-conviction-sealing-or-expungement-under-2953-33",
      "obligation:track-pathway:OH:oh_2953_35_firearm:certain-firearm-carry-conviction-expungement-under-2953-35",
    ];
}

function tracksForComposedFamily(familyId) {
  return familyId === "oh_marijuana_expungement-set"
    ? ["oh_marijuana_expungement"]
    : ["oh_2953_32_sealing", "oh_2953_32_expungement", "oh_2953_33_nonconviction", "oh_2953_35_firearm"];
}

function pleadingProtectionProof(text, config) {
  const requiresProposedOrder = config?.includeProposedOrder === true;
  const proposedOrderPresent = /\[PROPOSED\] ORDER/.test(text);
  return {
    signatureRuleRemainsBlank: /________________________________\n[^\n]+/.test(text),
    dateRuleRemainsBlank: /Date:\s+_{8,}/.test(text),
    certificateOfServiceAbsent: !/CERTIFICATE OF SERVICE/.test(text),
    proposedOrderRequirementSatisfied: requiresProposedOrder ? proposedOrderPresent : !proposedOrderPresent,
    proposedOrderJudicialDateRemainsBlank: !requiresProposedOrder
      || /AND NOW, this ______ day of ____________________, 20____/.test(text),
    proposedOrderJudicialSignatureRemainsBlank: !requiresProposedOrder
      || /BY THE COURT:\n\n________________________________\nJ\./.test(text),
    unsignedOrderCannotOperate: !requiresProposedOrder
      || text.includes("No agency shall treat this unsigned proposed order as effective"),
    noOutcomeGuarantee: !/guaranteed|will be granted|approved for filing/i.test(text),
    footerDisclaimsOfficialForm: text.includes("This is not an official court form"),
  };
}

async function pleadingPdfProof(bytes, expectedName) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pageRuns = pdf.getPages().map((page, index) => {
    let items = [];
    try { items = extractTextItems(page); } catch { /* recorded as zero */ }
    return { page: index + 1, textRuns: items.length,
      containsParticipantName: items.some((item) => String(item.text ?? "").includes(expectedName)) };
  });
  return { pageCount: pdf.getPageCount(), pageRuns,
    everyPageHasText: pageRuns.every((row) => row.textRuns > 0),
    participantNameObservedInPdfBytes: pageRuns.some((row) => row.containsParticipantName) };
}

function trackInstructions(trackId, definition) {
  const memoSection = definition.memoRequirements
    ? `\n\n## Recorded R.C. 2953.321 packet requirements\n\n`
      + `- Attach evidence of the ${definition.memoRequirements.qualifyingEvidence}.\n`
      + `- Include the ${definition.memoRequirements.proposedOrder}; leave every judicial date, signature, and outcome blank.\n`
      + `- Confirm the current filing fee and waiver practice. The frozen design records ${definition.memoRequirements.filingFee}.\n`
      + `- Confirm post-filing procedure: ${definition.memoRequirements.hearing}.\n`
      + `- If relief is granted, the signed order—not this draft—controls ${definition.memoRequirements.postOrder}.`
    : "";
  return `# ${definition.title}\n\n`
    + `This is a statutory-content draft and review artifact. It is not a statewide Ohio court form and is not filing-ready.\n\n`
    + `## Required local-form step\n\n`
    + `Obtain the current application, caption, filing instructions, fee information, and any proposed-order requirement from the Ohio court that handled the case. Transfer only reviewed content to that form. The absence of a catalogued local form is an explicit release blocker.\n\n`
    + `## Hard stops\n\n${definition.hardStops.map((stop) => `- ${stop}`).join("\n")}${memoSection}\n\n`
    + `## Participant-owned acts\n\n`
    + `- The participant signs and dates the local application.\n`
    + `- Do not complete a service certificate before service; this artifact generates none.\n`
    + `- Do not complete judge, clerk, prosecutor, agency, hearing, or order fields.\n`
    + `- The official Ohio BCI request included as companion evidence is a post-order transmission aid, not the primary filing and is not prefilled.\n\n`
    + `Track evidence key: \`${trackId}\`. Commercial and runtime authority remain false.\n`;
}

async function buildComposed(familyId) {
  const out = composedOut(familyId);
  resetOwnedOutput(out);
  const sourceRow = resolveSource(OH_BCI);
  const sourceCensus = await censusDocument(OH_BCI, sourceRow.bytes);
  const companionFile = `${out}/companion/OH-BCI-SEALING-EXPUNGEMENT-REQUEST--official-source.pdf`;
  writeBytes(companionFile, sourceRow.bytes);
  assert.equal(sha256(fs.readFileSync(abs(companionFile))), OH_BCI.sha256);

  const companionRasterDir = `${out}/raster/oh-bci-official-source`;
  const companionRasters = await rasterizePdf({ file: abs(companionFile), outDir: abs(companionRasterDir), prefix: "page" });
  assert.equal(companionRasters.length, sourceCensus.pageGeometry.length);
  assert.equal(companionRasters.filter((row) => row.looksBlank).length, 0);

  writeJson(`${out}/source-receipt.json`, {
    schemaVersion: "rcap-composed-family-source-receipt/v1", familyId,
    routeKeys: composedRouteKeys(familyId),
    implementationStrategy: "custom_pleading_artifact_only_with_official_post_order_companion",
    legalDesignStatus: "legal_design_approved_with_limitations",
    documents: [{
      documentId: OH_BCI.documentId, documentRole: OH_BCI.documentRole,
      officialTitle: OH_BCI.officialTitle, revision: OH_BCI.revision,
      pathInArchive: OH_BCI.pathInArchive, sha256: OH_BCI.sha256, byteLength: OH_BCI.byteLength,
      matchedBy: "exact_path_sha256_and_byte_length", copiedWithoutModification: true,
      companionArtifact: companionFile, pageCount: sourceCensus.pageGeometry.length,
      acroFieldCount: sourceCensus.fields.length,
      firstHandGeometry: { pageGeometry: sourceCensus.pageGeometry,
        ctmStrokedGeometry: sourceCensus.ctmStrokedGeometry, fields: sourceCensus.fields },
    }],
    sourceSilences: [
      "No statewide mandatory Ohio primary application was identified.",
      "No local-court application, caption, proposed order, service form, or current fee schedule is supplied by this source.",
      "The BCI form is post-order companion evidence and does not establish primary-filing content or local filing practice.",
    ],
    commercialAuthority: false, runtimeSelectable: false,
  });
  writeText(`${out}/companion/companion-guidance.md`,
    `# Official Ohio BCI companion\n\nThe exact held BCI request is copied unchanged at SHA-256 \`${OH_BCI.sha256}\`. It is a post-order transmission aid, not the participant's primary court application. It must not be prefilled before a signed order exists, and this build does not prefill it.\n`);

  const { renderCustomPleading, runPleadingQa, buildPleadingAuditManifest } = await customModules();
  const pdfInventory = [{
    file: companionFile, role: "unchanged_official_post_order_companion", sha256: OH_BCI.sha256,
    byteLength: sourceRow.bytes.length, pageCount: sourceCensus.pageGeometry.length,
  }];
  const companionContactFile = `${out}/reports/contact-sheets/oh-bci-official-source.png`;
  const companionContactRaw = await writeContactSheet(companionRasters, abs(companionContactFile));
  const rasterInventory = [{
    sourcePdf: companionFile, role: "unchanged_official_post_order_companion", directory: companionRasterDir,
    engine: "bundled_poppler_pdftoppm", dpi: RASTER_DPI,
    contactSheet: { ...companionContactRaw, file: companionContactFile },
    pages: companionRasters.map((row) => ({ page: row.page,
      file: path.posix.join(companionRasterDir, path.basename(row.file)), sha256: sha256(fs.readFileSync(row.file)),
      byteLength: fs.statSync(row.file).size, widthPx: row.widthPx, heightPx: row.heightPx,
      looksBlank: row.looksBlank, croppedToPage: row.croppedToPage, engine: row.engine, dpi: row.dpi })),
  }];
  const trackReports = [];

  for (const trackId of tracksForComposedFamily(familyId)) {
    const definition = OH_TRACKS[trackId];
    assert.ok(definition, `${trackId}: missing bounded Ohio definition`);
    const trackDir = `${out}/tracks/${trackId}`;
    const config = ohioPleadingConfig(trackId, definition);
    const canonicalFixture = fixtureForOhioTrack(trackId, customCanonicalFixture);
    const boundaryFixture = fixtureForOhioTrack(trackId, customBoundaryFixture);
    writeJson(`${trackDir}/pleading-config.json`, config);
    writeJson(`${trackDir}/canonical-fixture.json`, canonicalFixture);
    writeJson(`${trackDir}/boundary-fixture.json`, boundaryFixture);
    writeText(`${trackDir}/participant-instructions.md`, trackInstructions(trackId, definition));

    for (const [fixtureName, fixture] of [["canonical", canonicalFixture], ["boundary", boundaryFixture]]) {
      const renderResult = renderCustomPleading({ config, ...fixture });
      const qaResult = runPleadingQa({ config, renderResult, prohibitedTerms: [] });
      assert.equal(renderResult.errors.length, 0, `${trackId}/${fixtureName}: renderer errors`);
      assert.equal(qaResult.passed, true, `${trackId}/${fixtureName}: pleading QA failed: ${qaResult.failures.join("; ")}`);
      const protection = pleadingProtectionProof(renderResult.fullText, config);
      for (const [check, passed] of Object.entries(protection)) assert.equal(passed, true, `${trackId}/${fixtureName}: ${check}`);
      const textFile = `${trackDir}/rendered/${fixtureName}/${fixtureName}.txt`;
      const pdfFile = `${trackDir}/rendered/${fixtureName}/${fixtureName}.pdf`;
      // Hash the bytes that are WRITTEN, not the string they came from.
      // writeText appends a final newline when the text lacks one, so a report
      // hashing renderResult.fullText recorded a hash no committed file could
      // ever match — the exact ARTIFACTS failure vf02 found on
      // oh_marijuana_expungement-set (recorded d42df8ae…/0a5ef772… vs committed
      // 13a210a2…/025dee08…, each one trailing-newline apart).
      const textBytes = Buffer.from(renderResult.fullText.endsWith("\n") ? renderResult.fullText : `${renderResult.fullText}\n`);
      writeBytes(textFile, textBytes);
      const pdfBytes = await renderPleadingPdf(renderResult.fullText, `${definition.title} — ${fixtureName} evidence fixture`);
      writeBytes(pdfFile, pdfBytes);
      const pdfProof = await pleadingPdfProof(pdfBytes, fixture.partyData.petitionerName);
      assert.equal(pdfProof.everyPageHasText, true, `${trackId}/${fixtureName}: blank rendered PDF page`);
      assert.equal(pdfProof.participantNameObservedInPdfBytes, true, `${trackId}/${fixtureName}: participant name absent from PDF text`);
      const audit = buildPleadingAuditManifest({
        packetId: `${familyId}:${trackId}:${fixtureName}`, config, renderResult, qaResult, createdAt: FIXED_DATE,
      });
      const report = {
        schemaVersion: "rcap-composed-pleading-render-report/v1", familyId, trackId, fixture: fixtureName,
        renderer: "src/lib/record-clearing/renderers/custom-pleading-renderer.ts",
        qa: "src/lib/record-clearing/pleading-qa.ts",
        text: { file: textFile, sha256: sha256(textBytes), byteLength: textBytes.length },
        pdf: { file: pdfFile, sha256: sha256(pdfBytes), byteLength: pdfBytes.length, ...pdfProof },
        protection, audit, hardStops: definition.hardStops,
        commercialAuthority: false, runtimeSelectable: false,
      };
      writeJson(`${trackDir}/rendered/${fixtureName}/render-report.json`, report);
      pdfInventory.push({ file: pdfFile, role: "custom_pleading_review_fixture", trackId, fixture: fixtureName,
        sha256: sha256(pdfBytes), byteLength: pdfBytes.length, pageCount: pdfProof.pageCount });

      const rasterDir = `${out}/raster/${trackId}-${fixtureName}`;
      const rasters = await rasterizePdf({ file: abs(pdfFile), outDir: abs(rasterDir), prefix: "page" });
      assert.equal(rasters.length, pdfProof.pageCount, `${trackId}/${fixtureName}: incomplete raster`);
      assert.equal(rasters.filter((row) => row.looksBlank).length, 0, `${trackId}/${fixtureName}: blank raster`);
      const contactFile = `${out}/reports/contact-sheets/${trackId}-${fixtureName}.png`;
      const contactRaw = await writeContactSheet(rasters, abs(contactFile));
      rasterInventory.push({ sourcePdf: pdfFile, role: "custom_pleading_review_fixture", trackId,
        fixture: fixtureName, directory: rasterDir, engine: "bundled_poppler_pdftoppm", dpi: RASTER_DPI,
        contactSheet: { ...contactRaw, file: contactFile },
        pages: rasters.map((row) => ({ page: row.page,
          file: path.posix.join(rasterDir, path.basename(row.file)), sha256: sha256(fs.readFileSync(row.file)),
          byteLength: fs.statSync(row.file).size, widthPx: row.widthPx, heightPx: row.heightPx,
          looksBlank: row.looksBlank, croppedToPage: row.croppedToPage, engine: row.engine, dpi: row.dpi })),
      });
      trackReports.push(report);
      console.log(`${familyId}/${trackId}/${fixtureName}: ${pdfProof.pageCount} PDF page(s), QA PASS`);
    }
  }

  writeJson(`${out}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId, derivedFromBytes: true,
    pdfs: pdfInventory, rasters: rasterInventory,
  });
  writeJson(`${out}/build-findings.json`, {
    schemaVersion: "rcap-composed-family-build-findings/v1", familyId,
    status: "artifact_evidence_built_release_stopped",
    tracks: tracksForComposedFamily(familyId).map((trackId) => ({
      trackId, hardStops: OH_TRACKS[trackId].hardStops, renderedFixtures: ["canonical", "boundary"],
    })),
    findings: [
      "The current custom-pleading renderer and QA produced deterministic canonical and boundary artifacts.",
      familyId === "oh_marijuana_expungement-set"
        ? "Signature/date lines remain blank; the required unsigned proposed-order component is generated with every judicial date, signature, and outcome control left for the court."
        : "Signature/date lines remain blank; no certificate of service or proposed order is generated.",
      "The exact official BCI form is copied unchanged solely as a post-order companion.",
      "No statewide mandatory primary application was identified; local-form coverage is an explicit release blocker.",
    ],
    blockers: [
      "obtain and review the current local-court application and filing instructions",
      "resolve each track's recorded eligibility hard stops from primary authority and case records",
      "obtain completed-output legal approval before any participant or commercial release",
    ],
    noRuntimeActivationPerformed: true, commercialAuthority: false, runtimeSelectable: false,
  });
  writeJson(`${out}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId, status: "REQUESTED_NOT_GRANTED",
    tracks: tracksForComposedFamily(familyId),
    evidenceFiles: ["source-receipt.json", "reports/rendered-artifacts.json", "build-findings.json"],
    commercialAuthority: false, runtimeSelectable: false,
  });
  console.log(`${familyId}: BUILD PASS, RELEASE STOPPED (${trackReports.length} pleading renders)`);
}

async function checkComposed(familyId) {
  const out = composedOut(familyId);
  for (const file of ["source-receipt.json", "companion/companion-guidance.md",
    "reports/rendered-artifacts.json", "build-findings.json", "approval-request.json"]) {
    assert.ok(fs.existsSync(abs(`${out}/${file}`)), `${familyId}: missing ${file}`);
  }
  const source = resolveSource(OH_BCI);
  const receipt = readJson(`${out}/source-receipt.json`);
  const artifacts = readJson(`${out}/reports/rendered-artifacts.json`);
  const findings = readJson(`${out}/build-findings.json`);
  const approval = readJson(`${out}/approval-request.json`);
  assert.equal(receipt.schemaVersion, "rcap-composed-family-source-receipt/v1");
  assert.equal(receipt.familyId, familyId);
  assert.deepEqual(receipt.routeKeys, composedRouteKeys(familyId));
  assert.equal(receipt.implementationStrategy,
    "custom_pleading_artifact_only_with_official_post_order_companion");
  assert.equal(receipt.legalDesignStatus, "legal_design_approved_with_limitations");
  assert.equal(receipt.documents.length, 1);
  const liveSourceCensus = await censusDocument(OH_BCI, source.bytes);
  const companionArtifact = `${out}/companion/OH-BCI-SEALING-EXPUNGEMENT-REQUEST--official-source.pdf`;
  assert.deepEqual(receipt.documents[0], {
    documentId: OH_BCI.documentId,
    documentRole: OH_BCI.documentRole,
    officialTitle: OH_BCI.officialTitle,
    revision: OH_BCI.revision,
    pathInArchive: OH_BCI.pathInArchive,
    sha256: OH_BCI.sha256,
    byteLength: OH_BCI.byteLength,
    matchedBy: "exact_path_sha256_and_byte_length",
    copiedWithoutModification: true,
    companionArtifact,
    pageCount: liveSourceCensus.pageGeometry.length,
    acroFieldCount: liveSourceCensus.fields.length,
    firstHandGeometry: {
      pageGeometry: liveSourceCensus.pageGeometry,
      ctmStrokedGeometry: liveSourceCensus.ctmStrokedGeometry,
      fields: liveSourceCensus.fields,
    },
  }, `${familyId}: composed source receipt drift`);
  assert.equal(sha256(fs.readFileSync(abs(companionArtifact))), OH_BCI.sha256);
  assert.equal(source.bytes.length, OH_BCI.byteLength);
  for (const [name, record] of Object.entries({ receipt, artifacts, findings, approval })) {
    assertFailClosedEvidence(record, `${familyId}/${name}`);
  }
  const { renderCustomPleading, runPleadingQa } = await customModules();
  for (const trackId of tracksForComposedFamily(familyId)) {
    const trackDir = `${out}/tracks/${trackId}`;
    const config = readJson(`${trackDir}/pleading-config.json`);
    assert.equal(config.trackId, trackId);
    assert.equal(config.includeCertificateOfService, false);
    assert.equal(config.includeProposedOrder, trackId === "oh_marijuana_expungement");
    for (const fixtureName of ["canonical", "boundary"]) {
      const fixture = readJson(`${trackDir}/${fixtureName}-fixture.json`);
      const report = readJson(`${trackDir}/rendered/${fixtureName}/render-report.json`);
      assertFailClosedEvidence(report, `${familyId}/${trackId}/${fixtureName}/render-report`);
      const renderResult = renderCustomPleading({ config, ...fixture });
      const qaResult = runPleadingQa({ config, renderResult, prohibitedTerms: [] });
      assert.equal(qaResult.passed, true, `${trackId}/${fixtureName}: QA no longer passes`);
      assert.deepEqual(pleadingProtectionProof(renderResult.fullText, config), report.protection,
        `${trackId}/${fixtureName}: protection proof drift`);
      assert.equal(sha256(Buffer.from(renderResult.fullText)), report.text.sha256, `${trackId}/${fixtureName}: text drift`);
      const pdfBytes = await renderPleadingPdf(renderResult.fullText, `${OH_TRACKS[trackId].title} — ${fixtureName} evidence fixture`);
      assert.equal(sha256(pdfBytes), report.pdf.sha256, `${trackId}/${fixtureName}: deterministic PDF drift`);
      assert.equal(sha256(fs.readFileSync(abs(report.pdf.file))), report.pdf.sha256, `${trackId}/${fixtureName}: PDF artifact drift`);
      for (const value of Object.values(report.protection)) assert.equal(value, true, `${trackId}/${fixtureName}: protection regression`);
    }
  }
  assert.equal(new Set(artifacts.pdfs.map((pdf) => pdf.file)).size, artifacts.pdfs.length,
    `${familyId}: duplicate rendered PDF record`);
  assert.equal(new Set(artifacts.rasters.map((raster) => raster.sourcePdf)).size, artifacts.rasters.length,
    `${familyId}: duplicate raster group`);
  assert.deepEqual(artifacts.rasters.map((raster) => raster.sourcePdf).sort(),
    artifacts.pdfs.map((pdf) => pdf.file).sort(),
    `${familyId}: orphaned or unrastered PDF record`);
  for (const pdf of artifacts.pdfs) {
    const bytes = fs.readFileSync(abs(pdf.file));
    assert.equal(sha256(bytes), pdf.sha256, `${pdf.file}: hash drift`);
    assert.equal(bytes.length, pdf.byteLength, `${pdf.file}: byte drift`);
    const reopened = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pdfPages = reopened.getPages();
    assert.equal(pdfPages.length, pdf.pageCount, `${pdf.file}: PDF page-count drift`);
    const raster = artifacts.rasters.find((row) => row.sourcePdf === pdf.file);
    assert.ok(raster, `${pdf.file}: raster record missing`);
    assert.equal(raster.engine, "bundled_poppler_pdftoppm", `${pdf.file}: unexpected raster engine`);
    assert.equal(raster.dpi, RASTER_DPI, `${pdf.file}: unexpected raster DPI`);
    assert.equal(raster.pages.length, pdf.pageCount, `${pdf.file}: incomplete raster`);
    assert.deepEqual(raster.pages.map((page) => page.page),
      Array.from({ length: pdf.pageCount }, (_, index) => index + 1),
      `${pdf.file}: raster page sequence is incomplete`);
    const contactBytes = fs.readFileSync(abs(raster.contactSheet.file));
    assert.equal(sha256(contactBytes), raster.contactSheet.sha256, `${raster.contactSheet.file}: contact-sheet drift`);
    for (const page of raster.pages) {
      const bytes = fs.readFileSync(abs(page.file));
      assert.equal(sha256(bytes), page.sha256, `${page.file}: raster hash drift`);
      assert.equal(bytes.length, page.byteLength, `${page.file}: raster byte drift`);
      const metadata = await sharp(abs(page.file)).metadata();
      const stats = await sharp(abs(page.file)).greyscale().stats();
      const recomputedBlank = rasterLooksBlank(stats);
      const geometry = pdfPages[page.page - 1].getSize();
      const expectedWidth = Math.round(geometry.width * RASTER_DPI / 72);
      const expectedHeight = Math.round(geometry.height * RASTER_DPI / 72);
      const recomputedCrop = Math.abs(metadata.width - expectedWidth) <= 1
        && Math.abs(metadata.height - expectedHeight) <= 1;
      assert.equal(metadata.format, "png", `${page.file}: raster is not PNG`);
      assert.equal(metadata.width, page.widthPx, `${page.file}: stored width drift`);
      assert.equal(metadata.height, page.heightPx, `${page.file}: stored height drift`);
      assert.equal(recomputedBlank, false, `${page.file}: blank raster`);
      assert.equal(page.looksBlank, recomputedBlank, `${page.file}: stored blank flag drift`);
      assert.equal(recomputedCrop, true, `${page.file}: raster is not cropped to the PDF page`);
      assert.equal(page.croppedToPage, recomputedCrop, `${page.file}: stored crop flag drift`);
      assert.ok(metadata.width >= 500 && metadata.height >= 500, `${page.file}: raster is too small for review`);
      assert.equal(page.dpi, RASTER_DPI, `${page.file}: raster DPI mismatch`);
    }
    await verifyFreshPopplerRaster({
      pdfFile: pdf.file, raster, pdfPages, label: `${familyId}/${pdf.file}`,
    });
  }
  assert.equal(findings.noRuntimeActivationPerformed, true);
  assert.equal(findings.commercialAuthority, false);
  assert.equal(findings.runtimeSelectable, false);
  assert.equal(approval.status, "REQUESTED_NOT_GRANTED");
  assert.equal(approval.commercialAuthority, false);
  assert.equal(approval.runtimeSelectable, false);
  console.log(`build-census-v1-${familyId}: CHECK PASS (${artifacts.pdfs.length} PDFs)`);
}

const PA_6308_ROUTE = "obligation:track-pathway:PA:pa_6308_underage:path-g-underage-drinking-conviction-expungement";
const PA_6308_OUT = "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--custom-pleading";

async function buildPa6308Stop() {
  resetOwnedOutput(PA_6308_OUT);
  const sourceRows = [];
  for (const doc of [PA_490_PETITION, PA_490_ORDER]) {
    const resolved = resolveSource(doc);
    const census = await censusDocument(doc, resolved.bytes);
    sourceRows.push({ doc, resolved, census });
  }
  writeJson(`${PA_6308_OUT}/source-receipt.json`, {
    schemaVersion: "rcap-source-bound-stop-receipt/v1", familyId: STOP_FAMILY_ID,
    routeKeys: [PA_6308_ROUTE], custodyClass: "SOURCE_ALREADY_HELD",
    implementationStrategyAssignedByWorklist: "custom_pleading",
    implementationStrategySelectedByLegalDesignMemo: "official_pdf_fill_with_custom_service_certificate",
    documents: sourceRows.map(({ doc, census }) => ({
      documentId: doc.documentId, documentRole: doc.documentRole, pathInArchive: doc.pathInArchive,
      revision: doc.revision, sha256: doc.sha256, byteLength: doc.byteLength,
      matchedBy: "exact_path_sha256_and_byte_length", pageCount: census.pageGeometry.length,
      acroFieldCount: census.fields.length,
      firstHandGeometry: { pageGeometry: census.pageGeometry, fields: census.fields,
        ctmStrokedGeometry: census.ctmStrokedGeometry },
    })),
    whatThisReceiptDoesNotEstablish: [
      "which court-status branch applies to the participant",
      "a production field map for the underage-conviction route",
      "a source-backed custom certificate-of-service implementation",
      "authority to substitute a custom pleading for the official petition and order",
    ],
  });
  writeJson(`${PA_6308_OUT}/official-vehicle-status.json`, {
    schemaVersion: "rcap-official-vehicle-stop/v1", familyId: STOP_FAMILY_ID,
    routeKey: PA_6308_ROUTE, status: "STOP_SOURCE_BOUND_REDIRECT_REQUIRED",
    memoSelectedVehicle: {
      primary: "PA-RCRIM-P-490-PETITION", proposedOrder: "PA-RCRIM-P-490-ORDER",
      additionalComponent: "custom certificate of service",
    },
    productionFieldMapAvailable: false,
    statusMetadataAvailable: false,
    redirect: {
      targetStrategy: "official_pdf_fill",
      targetEvidenceFamily: "pa_490_nonconviction-set",
      authorityGrantedByRedirect: false,
      reason: "The 490 artifacts provide reusable source/form evidence, but this route still requires its own court-status metadata, underage-route production map, and source-backed service component.",
    },
    prohibitedSubstitution: "Do not invent a custom-only pleading vehicle for this route.",
    commercialAuthority: false, runtimeSelectable: false,
  });
  writeJson(`${PA_6308_OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: STOP_FAMILY_ID,
    status: "STOP_SOURCE_BOUND_REDIRECT_REQUIRED",
    built: [], stopped: [PA_6308_ROUTE],
    findings: [
      "The legal-design memo, not the worklist label, controls the vehicle: official Rule 490 petition/order plus a custom service certificate.",
      "The exact held Rule 490 petition and order match their pinned SHA-256 and byte lengths and were censused first-hand.",
      "No underage-route production field map or branch-status metadata is available.",
      "No source-backed custom service certificate has been approved for production.",
      "Therefore no pleading-config, canonical/boundary pleading, filled PDF, or runtime activation was created.",
    ],
    blockers: [
      "record the court-status metadata that determines the correct official vehicle",
      "complete the exact underage-route production field map",
      "source and approve the custom service-certificate component",
      "obtain completed-output legal approval",
    ],
    commercialAuthority: false, runtimeSelectable: false,
  });
  writeJson(`${PA_6308_OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId: STOP_FAMILY_ID,
    status: "NOT_READY_FOR_APPROVAL", reason: "source-bound redirect blockers remain",
    commercialAuthority: false, runtimeSelectable: false,
  });
  writeText(`${PA_6308_OUT}/participant-instructions.md`,
    `# PA underage-conviction route — build stopped\n\nNo participant packet was generated. The legal-design memo selects the official Pennsylvania Rule 490 petition and order with a custom service certificate; it does not authorize a custom-only pleading. The exact official sources are held, but court-status metadata, an underage-route production field map, and an approved service component are missing. Resolve those items before producing or filing anything.\n`);
  console.log(`${STOP_FAMILY_ID}: SOURCE-BOUND STOP recorded; no pleading or PDF generated`);
}

async function checkPa6308Stop() {
  for (const file of ["source-receipt.json", "official-vehicle-status.json", "build-findings.json",
    "approval-request.json", "participant-instructions.md"]) {
    assert.ok(fs.existsSync(abs(`${PA_6308_OUT}/${file}`)), `${STOP_FAMILY_ID}: missing ${file}`);
  }
  const receipt = readJson(`${PA_6308_OUT}/source-receipt.json`);
  const status = readJson(`${PA_6308_OUT}/official-vehicle-status.json`);
  const findings = readJson(`${PA_6308_OUT}/build-findings.json`);
  const approval = readJson(`${PA_6308_OUT}/approval-request.json`);
  assert.equal(receipt.schemaVersion, "rcap-source-bound-stop-receipt/v1");
  assert.equal(receipt.familyId, STOP_FAMILY_ID);
  assert.deepEqual(receipt.routeKeys, [PA_6308_ROUTE]);
  assert.equal(receipt.custodyClass, "SOURCE_ALREADY_HELD");
  assert.equal(receipt.implementationStrategyAssignedByWorklist, "custom_pleading");
  assert.equal(receipt.implementationStrategySelectedByLegalDesignMemo,
    "official_pdf_fill_with_custom_service_certificate");
  assert.equal(receipt.documents.length, 2);
  for (const [index, doc] of [PA_490_PETITION, PA_490_ORDER].entries()) {
    const source = resolveSource(doc);
    const liveCensus = await censusDocument(doc, source.bytes);
    assert.deepEqual(receipt.documents[index], {
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      pathInArchive: doc.pathInArchive,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: doc.byteLength,
      matchedBy: "exact_path_sha256_and_byte_length",
      pageCount: liveCensus.pageGeometry.length,
      acroFieldCount: liveCensus.fields.length,
      firstHandGeometry: {
        pageGeometry: liveCensus.pageGeometry,
        fields: liveCensus.fields,
        ctmStrokedGeometry: liveCensus.ctmStrokedGeometry,
      },
    }, `${STOP_FAMILY_ID}/${doc.documentId}: STOP source receipt drift`);
  }
  for (const [name, record] of Object.entries({ receipt, status, findings, approval })) {
    assertFailClosedEvidence(record, `${STOP_FAMILY_ID}/${name}`);
  }
  assert.equal(status.familyId, STOP_FAMILY_ID);
  assert.equal(status.routeKey, PA_6308_ROUTE);
  assert.equal(status.status, "STOP_SOURCE_BOUND_REDIRECT_REQUIRED");
  assert.equal(status.productionFieldMapAvailable, false);
  assert.equal(status.statusMetadataAvailable, false);
  assert.equal(status.redirect.authorityGrantedByRedirect, false);
  assert.equal(findings.status, "STOP_SOURCE_BOUND_REDIRECT_REQUIRED");
  assert.deepEqual(findings.built, []);
  assert.deepEqual(findings.stopped, [PA_6308_ROUTE]);
  assert.equal(findings.commercialAuthority, false);
  assert.equal(findings.runtimeSelectable, false);
  assert.equal(approval.familyId, STOP_FAMILY_ID);
  assert.equal(approval.status, "NOT_READY_FOR_APPROVAL");
  assert.equal(approval.commercialAuthority, false);
  assert.equal(approval.runtimeSelectable, false);
  assert.equal(fs.existsSync(abs(`${PA_6308_OUT}/pleading-config.json`)), false,
    `${STOP_FAMILY_ID}: custom-only pleading-config must not exist`);
  const generated = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(pdf|txt)$/i.test(entry.name)) generated.push(file);
    }
  };
  walk(abs(PA_6308_OUT));
  assert.deepEqual(generated, [], `${STOP_FAMILY_ID}: STOP target must contain no generated pleading/PDF`);
  console.log(`build-census-v1-${STOP_FAMILY_ID}: CHECK PASS (source-bound STOP; zero pleadings/PDFs)`);
}

export async function runEastFamily(familyId, argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) { await selfTest(familyId); return; }
  const check = argv.includes("--check");
  if (Object.hasOwn(FAMILY, familyId)) {
    if (check) await checkOfficial(familyId, FAMILY[familyId]);
    else await buildOfficial(familyId, FAMILY[familyId]);
    return;
  }
  if (COMPOSED_FAMILY_IDS.has(familyId)) {
    if (check) await checkComposed(familyId);
    else await buildComposed(familyId);
    return;
  }
  if (familyId === STOP_FAMILY_ID) {
    if (check) await checkPa6308Stop();
    else await buildPa6308Stop();
    return;
  }
  throw new Error(`unknown EAST family ${familyId}`);
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  await runEastFamily("nj_arrest_no_conviction-set");
}
