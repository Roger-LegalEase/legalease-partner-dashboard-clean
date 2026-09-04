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

async function rasterizePdf({ file, outDir, pages = null, prefix = "page", dpi = RASTER_DPI }) {
  assertPopplerAvailable();
  fs.mkdirSync(outDir, { recursive: true });
  const pageSelection = pages && pages.length
    ? pages.flatMap((page) => ["-f", String(page), "-l", String(page)])
    : [];
  // All production calls raster every page in one pass. A page selection is
  // accepted only for a single page, for focused diagnostics.
  assert.ok(!pages || pages.length === 1, "Poppler raster helper accepts all pages or one diagnostic page");
  // Every inventoried raster stays at RASTER_DPI. A higher DPI is accepted only
  // for a single-page focused diagnostic, where a 12x10pt control is ten pixels
  // wide at 72 DPI and a mark inside it could hide between samples.
  assert.ok(dpi === RASTER_DPI || (pages && pages.length === 1),
    "a non-standard raster DPI is accepted only for a single focused diagnostic page");
  const targetPrefix = path.join(outDir, `${prefix}-raw`);
  const run = spawnSync(POPPLER_PDFTOPPM,
    ["-png", "-r", String(dpi), ...pageSelection, file, targetPrefix],
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
      engine: "bundled_poppler_pdftoppm", dpi,
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
    ...(jurisdiction === "PA" ? {
      "matter.court_level": boundary ? "court_of_common_pleas" : "magisterial_district_judge",
    } : {}),
  };
}

function source({ key, id, role, title, revision, pathInArchive, hash, bytes, render = true,
  allow = {}, deny = [], selections = [], captions = null, alignWidgetFontSizeToFit = false,
  fitTextPerWidget = false, repeatingRowGroups = [] }) {
  return { key, documentId: id, documentRole: role, officialTitle: title, revision,
    pathInArchive, sha256: hash, byteLength: bytes, render, allow, deny, selections,
    captions, alignWidgetFontSizeToFit, fitTextPerWidget, repeatingRowGroups };
}
function cloneDoc(base, additions = {}) {
  return { ...base, ...additions, allow: { ...(base.allow ?? {}), ...(additions.allow ?? {}) },
    deny: [...(base.deny ?? []), ...(additions.deny ?? [])],
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

/*
 * FIX01/RP-2, KNOWN_PREFILLS: `deny`, and why a shared allowlist needed one.
 *
 * SHARED_EXACT_FACT_ALLOWLIST is keyed by DOCUMENT, so its NJ-CN-10557 entry is
 * every New Jersey family's at once. `ExpungeCntyName: "matter.county"` in it
 * declared a write that could never happen: ExpungeCntyName is a PDFDropdown
 * whose option list is the twenty-one New Jersey counties as bare names --
 * "Essex", not "Essex County" -- and the finalizer refused it on every fixture
 * with reason `explicit_mapping_conflicts_with_field_name`. The map went on
 * declaring `candidate_write` for it, so four widgets on the Petition, the
 * Order for Hearing, the Expungement Order and the Final Order read
 * "County ______" empty while the packet's own manifest said they were filled,
 * and the county appeared in none of the seventy required-before-filing
 * bullets. A fact the platform writes must be written; a fact it does not write
 * must be disclosed. Neither happened.
 *
 * `deny` removes ONE document's mapping for ONE family without touching the
 * shared table, so the other four New Jersey families on this host render
 * byte-for-byte as they did. The denied field falls through to the ordinary
 * refusal path, is classified required_before_filing, and reaches the
 * participant in the list of blanks they must complete.
 *
 * This is not a decision that the county is unknowable. It is the narrower and
 * true statement that `matter.county` -- which this build derives from the
 * participant's RESIDENCE fixture -- is not the fact this blank asks for. The
 * kit asks for the county where the petition is FILED, which page 9 defines as
 * the county of arrest, custody, prosecution or adjudication, and no held fact
 * on this route answers that.
 */
function factMappingsForDocument(doc) {
  const shared = SHARED_EXACT_FACT_ALLOWLIST[doc.documentId] ?? {};
  for (const [field, factId] of Object.entries(doc.allow ?? {})) {
    assert.ok(!shared[field] || shared[field] === factId,
      `${doc.documentId}/${field}: shared and family fact mappings conflict`);
  }
  const denied = new Set(doc.deny ?? []);
  for (const field of denied) {
    assert.ok(Object.hasOwn(shared, field) || Object.hasOwn(doc.allow ?? {}, field),
      `${doc.documentId}/${field}: denied a fact mapping that no allowlist declares`);
  }
  const merged = { ...shared, ...(doc.allow ?? {}) };
  for (const field of denied) delete merged[field];
  return merged;
}

/*
 * CAPTIONS READ OFF THE FORM'S OWN PRINTED FACE, where the geometric capture
 * reached the wrong printed line.
 *
 * captureWidgetContext finds the caption printed to the LEFT of a widget on the
 * same line, and failing that the one printed directly ABOVE it in the same
 * column. Both rules are sound and both mis-fire on a stacked identifier table,
 * because a widget whose box is taller than the line pitch overlaps two printed
 * lines at once and the tie between them is broken by horizontal gap alone. On
 * the CPL 160.59 certificate-of-disposition request every caption in the page-2
 * identifier column ends at the same x, so those gaps are equal to the tenth of
 * a point and a run of eleven widgets each takes the caption of the row above
 * it: the participant is told to write their NYSID in the box captioned
 * "Partial Docket Number". The same tie shifts the MRTA form's court-type row
 * and its court-use-only checklist by one.
 *
 * The correction is a per-document table of the caption the FORM PRINTS beside
 * the named widget, read off the printed face and recorded here rather than
 * re-derived by a cleverer rule. Nothing is invented and nothing is reworded:
 * every string below appears on the form, and where a caption is a column
 * heading rather than an inline label the row it belongs to is named after an
 * em dash so the participant can find the blank on the paper.
 *
 * The alternative was to re-rank the geometric candidates by vertical distance.
 * That was measured on both New York forms before this table was written: it
 * corrects the identifier stacks and REGRESSES a dozen other widgets onto the
 * underscore rules printed beneath them, so it trades one wrong-caption class
 * for another. It also reaches every family that shares the capture module,
 * which a repair lane holding four families does not get to decide.
 *
 * A document that declares no table is untouched and its captions are exactly
 * what the geometry returned.
 *
 * COURT_USE_ONLY is the second half of the same repair. A widget whose caption
 * the geometry mis-read can also be mis-CLASSIFIED off that caption, and on the
 * MRTA form three controls printed below "***FOR COURT USE ONLY - DO NOT WRITE
 * BELOW THIS LINE***" were surfaced to the participant as blanks they must fill
 * in before filing, in the same file whose last line says every control below
 * that line stays blank. Marking them here refuses them as what they are.
 */
const COURT_USE_ONLY = Symbol("court_use_only_control");

/*
 * A caption whose bytes the source's own font did not decode into readable text.
 *
 * Both New York forms number their fields with circled glyphs from a subsetted
 * font, and the harvested runs for those glyphs decode to C0/C1 control
 * characters. Delivered verbatim they reach the participant inside the list of
 * facts they must supply before filing: the MRTA instructions carried 28 such
 * characters and the CPL 160.59 instructions 6. A caption that did not decode is
 * not a caption, so the row falls back to the form's own field name, which is at
 * least true. Scoped to documents that declare a caption table, so no family
 * outside this repair can have a label change under it.
 */
const UNDECODED_CAPTION_BYTES = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/;
function readableCaption(label) {
  if (typeof label !== "string" || label === "") return label ?? null;
  return UNDECODED_CAPTION_BYTES.test(label) ? null : label;
}

const FAMILY = {};

const PA_6308_ROUTE_VEHICLES = Object.freeze({
  magisterial_district_judge: Object.freeze({
    vehicleId: "rule_490",
    primary: "PA-RCRIM-P-490-PETITION",
    proposedOrder: "PA-RCRIM-P-490-ORDER",
  }),
  court_of_common_pleas: Object.freeze({
    vehicleId: "rule_790",
    primary: "PA-RCRIM-P-790-PETITION",
    proposedOrder: "PA-RCRIM-P-790-ORDER",
  }),
});

function pa6308VehicleFor(facts) {
  const courtLevel = String(facts?.["matter.court_level"] ?? "").trim();
  const vehicle = PA_6308_ROUTE_VEHICLES[courtLevel];
  if (!vehicle) {
    throw new Error(`PA underage-expungement vehicle requires an established court level: ${courtLevel || "matter.court_level is absent"}`);
  }
  return vehicle;
}

const PA_6308_SERVICE_CERTIFICATE = Object.freeze({
  documentId: "pa_6308_underage-certificate-of-service-3",
  documentRole: "certificate_of_service",
  key: "certificate-of-service",
  renderText(facts, vehicle) {
    return [
      "CERTIFICATE OF SERVICE",
      "",
      `Pennsylvania ${vehicle.vehicleId === "rule_490" ? "Rule 490" : "Rule 790"} expungement filing`,
      `Petitioner: ${facts["participant.full_legal_name"]}`,
      `Docket number: ${facts["matter.case_number"]}`,
      "",
      "DO NOT SIGN OR DATE THIS CERTIFICATE UNTIL SERVICE HAS ACTUALLY OCCURRED.",
      "",
      "I certify that, concurrently with filing the attached verified petition and proposed order,",
      "I served a copy on the attorney for the Commonwealth.",
      "",
      `Name and office of the attorney for the Commonwealth served: ${".".repeat(44)}`,
      `${".".repeat(84)}`,
      `Service address: ${".".repeat(67)}`,
      `${".".repeat(84)}`,
      `Service method accepted by the filing court: ${".".repeat(48)}`,
      "(The governed record establishes the recipient and timing, but not a locally accepted method.)",
      `Date service actually occurred: ${".".repeat(52)}`,
      "",
      `Signature of petitioner after service: ${".".repeat(51)}`,
      `Date signed: ${".".repeat(70)}`,
      `Printed name: ${facts["participant.full_legal_name"]}`,
      "",
      "This certificate records service performed by the participant. LegalEase does not serve anyone",
      "and does not prefill the recipient's office, address, service method, service date, or signature.",
    ].join("\n");
  },
  fields: Object.freeze([
    Object.freeze({ field: "Printed name", decision: "candidate_write", factId: "participant.full_legal_name" }),
    Object.freeze({ field: "Docket number", decision: "candidate_write", factId: "matter.case_number" }),
    ...["Attorney for the Commonwealth name and office", "Service address", "Service method",
      "Date service actually occurred", "Signature after service", "Date signed"].map((field) => Object.freeze({
      field,
      decision: "refuse",
      factId: null,
      refusalClass: "unmailed_or_unperformed_service",
      requiredBeforeFiling: false,
      completesAfterService: true,
      reason: "Service has not occurred, so the platform holds no fact for this line; complete it only after service actually occurs.",
      widgets: [],
    })),
  ]),
});

const NJ_CONTACT_ALLOW = {
  DefPhone: "participant.phone", DefAddrStr2: "participant.street_address",
  DefAddrCity: "participant.city", DefAddrSt: "participant.state", DefAddrZip: "participant.zip",
};
function njFamily(routeKey, selectionNames, allow, note, familyAdditions = {}, documentAdditions = {}) {
  return {
    jurisdiction: "NJ", routeKeys: [routeKey],
    documents: [cloneDoc(NJ_SOURCE, {
      allow: { ...NJ_CONTACT_ALLOW, ...allow }, selections: selectionNames, ...documentAdditions,
    })],
    notes: [note, "The shared 43-page kit's signature, date, notary, service, court, prosecutor, clerk, agency, and post-order fields are expressly refused."],
    ...familyAdditions,
  };
}

Object.assign(FAMILY, {
  "pa_6308_underage-set": {
    jurisdiction: "PA",
    implementationStrategy: "official_pdf_fill_with_custom_service_certificate",
    routeKeys: ["obligation:track-pathway:PA:pa_6308_underage:path-g-underage-drinking-conviction-expungement"],
    routeVehicle: {
      factId: "matter.court_level",
      values: PA_6308_ROUTE_VEHICLES,
      selector: pa6308VehicleFor,
      missingFactTreatment: "STOP_NO_ARTIFACT",
    },
    documents: [
      cloneDoc(PA_490_PETITION, { allow: PA_PETITION_ALLOW_TABLE_UNTOUCHED, routeVehicle: "rule_490" }),
      cloneDoc(PA_490_ORDER, { allow: PA_ORDER_ALLOW, routeVehicle: "rule_490" }),
      cloneDoc(PA_790_PETITION, { allow: PA_PETITION_ALLOW_TABLE_UNTOUCHED, routeVehicle: "rule_790" }),
      cloneDoc(PA_790_ORDER, { allow: PA_ORDER_ALLOW, routeVehicle: "rule_790" }),
    ],
    supplementalDocuments: [PA_6308_SERVICE_CERTIFICATE],
    service: [
      "The attorney for the Commonwealth is served concurrently with filing. The included certificate records that required recipient and timing.",
      "The governed record does not establish a locally accepted service method. The certificate leaves the method, recipient office and address, service date, and signature blank; complete them only after following the filing court's accepted local procedure and after service actually occurs.",
    ],
    notes: [
      "Rule 490 is selected only when the court record establishes a magisterial-district-judge case; Rule 790 is selected only when it establishes a court-of-common-pleas case.",
      "If the court level is absent or outside those two recorded values, generation stops before any participant artifact is selected.",
      "The required custom certificate of service states only the governed recipient and timing. It leaves every local-method and performed-service fact blank.",
    ],
  },
  "nj_arrest_no_conviction-set": njFamily(
    "obligation:track-pathway:NJ:nj_arrest_no_conviction:arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6",
    ["dismiss"], { origCaseNums: "matter.case_number",
      dismissDt: "matter.disposition_date", dismissOff1: "matter.charge",
      dismissCrt: "matter.court" },
    "The route election is the measured existing dismissed control on page 18; no box is invented.",
    {
      /*
       * FIX01/RP-2: FILING_DESTINATION, FEE_AND_WAIVER, SERVICE, SELF_HELP_STOP.
       *
       * All four were standing on one sentence -- "Confirm current revision,
       * filing destination, local procedures, fees, attachments, service, and
       * proposed-order requirements before filing" -- which lists four
       * questions and answers none. This host's own comment above
       * filingDestinationSection names that sentence as the defect, and the two
       * New York families on the host opted in. This one did not.
       *
       * The standard is DET-FEE-AND-WAIVER-001 A1 as widened by A2: ask the
       * repository first, state what it establishes, and delegate only what it
       * does not. Here the repository establishes all four, twice over -- the
       * committed track registry entry for nj_arrest_no_conviction, and the
       * enclosed kit's OWN DELIVERED BYTES, which state the destination at page
       * 9, the eight service recipients with method at page 10, the five-day
       * period at page 11, and "Kit updated 06/2020 to remove the filing fee"
       * in a running footer on four pages of every fixture this family ships.
       *
       * The fee failure was the sharpest of the four: the packet told the
       * participant to go and confirm "fees" while enclosing, in its own bytes,
       * the publisher's statement that there is no fee. A packet may never tell
       * a participant it does not state something it does state.
       */
      filingDestination: [
        "**File in the county where you were arrested or taken into custody, or where you were prosecuted or adjudicated.** That is the New Jersey Judiciary's own instruction, printed at page 9 of the kit bound into this packet, and the committed record for this route says the same: the destination is the Superior Court, Criminal Division, of the vicinage. New Jersey is one statewide court system with fifteen vicinages, and no local form variation was identified for this route.",
        "**The office that receives it is the Criminal Case Management Office of that county.** Page 10 of the enclosed kit says to mail the package there, or to file it in person if you prefer, and the list of those offices with their telephone numbers is printed at the end of the same kit. Do not look for a statewide filing address; there is not one.",
        "**If your cases are in more than one county**, the kit tells you to contact the Criminal Case Management Office in either county and ask whether they will let you file for expungement of your entire record in that county, and then to file the whole package with the office that agreed. This packet does not choose the county for you and does not make that call for you.",
        "**What to send with it.** Make three copies of the notarized Petition (Form A), the Order for Hearing (Form B) and the proposed Expungement Order (Form C). The original and two copies are filed; keep one of each. Attach the Cover Letter for Filing (Form D), and enclose two large self-addressed envelopes with postage on each — those are what the court uses to send your filed copies back.",
        "**There is also an online route.** The Judiciary's eCourts Expungement System assembles the petition and the proposed order from data you enter, instead of from these forms. This packet is the kit-forms route. Nothing here prevents you using eCourts instead; if you do, you do not file these papers as well.",
      ],
      feeAndWaiver: [
        "**There is no court filing fee.** The kit bound into this packet says so on its own face: the running footer on four of its pages reads *Kit updated 06/2020 to remove the filing fee, CN 10557*. The committed New Jersey record for this route says the same — no court filing fee for any expungement petition, New Jersey Courts states \"It's free\", and the kit was updated in June 2020 specifically to remove the fee.",
        "**There is nothing to waive, and so no waiver form in this packet.** The committed record puts it in terms: a fee waiver is *not applicable to the court filing. There is no filing fee to waive.* If an office asks you for a filing fee on an expungement petition, that is worth questioning before you pay it.",
        "**Two costs that are not the filing fee.** The State Police charge for the SBI criminal history record, which is a separate request to a separate agency; and the Verification page of the Petition must be signed in front of a notary, who may charge for that. Neither is a court fee and no held source sets either figure, so none is stated here.",
        "**One condition that is about money but is not a fee.** The committed record for this route records that outstanding court-ordered financial assessments must be paid, subject to the statute's failure-to-pay provisions. Whether that reaches your case is not something this packet decides; it is listed among the points below where self-help ends.",
      ],
      service: [
        "**Nobody is served until the court gives you filed copies back.** One copy each of the Petition, the Order for Hearing and the proposed Expungement Order comes back to you marked *Filed*, with an Expungement Docket Number, and the Order for Hearing will carry the date and time of your hearing. Service starts then, and not before. This is page 10 of the enclosed kit.",
        "**Then make at least seven copies of those three papers and mail one set to each agency involved in your case, by certified mail, return receipt requested.** The kit names them at pages 10 and 11: the Attorney General of New Jersey; the Superintendent of State Police, Expungement Unit; the County Prosecutor; the administrator of the municipal court if a municipal court heard the matter; the Chief of Police or other head of the police department where the offence was committed or the arrest was made; the chief law-enforcement officer of any other State law-enforcement agency that took part in the arrest; the Warden or superintendent of any institution you were held in; and the County Probation Division if you had a conditional discharge or conditional dismissal, were in PTI or a juvenile diversion programme, had a deferred disposition, performed community service, owed fines or restitution, or served probation — and, if supervision was transferred, both the original county probation office and the one it went to. The Division of Criminal Justice, Records and Identification Unit is added if your case went through the State Grand Jury.",
        "**Mail them within five days of the date the Order for Hearing was signed.** The kit states that period at page 11 and tells you to mail at the post office, certified mail return receipt requested, which may be done electronically. Form E, the Cover Letter — Notice of Hearing, is the letter to attach to each set; it is bound into this packet.",
        "**Keep the receipts, and ask before the hearing what the court wants.** After the return receipt cards or the electronic confirmations arrive, the kit tells you to contact the Criminal Case Management Office and ask whether proof of mailing must be submitted at or before the hearing. Form F, the Proof of Notice, is where that proof goes.",
        "**Agencies have a window to object.** The committed record for this route records that they do, and records the exact period as an open question. No number of days is stated here, because none is established; the Criminal Case Management Office that has your docket number is the office that can tell you.",
      ],
      /*
       * SELF_HELP_STOP. Independent verification measured this packet as naming
       * no stop at all: zero case-insensitive hits in participant-instructions.md
       * for "immigrat", "stop", "lawyer" and "legal aid", against thirteen
       * selfHelpStopConditions the committed record holds for this exact track.
       *
       * All thirteen are below, each carried word for word from the registry,
       * nothing added to them and nothing softened. The immigration condition is
       * restated after the list because a non-citizen must be told to reach an
       * immigration attorney before signing rather than left to find it
       * thirteenth in a list, and the referral routes at the end are the kit's
       * own, from its page 3 "Try to Get a Lawyer".
       */
      selfHelpStop: [
        "**This packet is not legal advice, and no lawyer has reviewed your case in preparing it.** It is a prepared copy of the New Jersey Judiciary's expungement kit CN-10557 for you to read, complete, sign, have notarized where the kit requires it, file and serve yourself. It is not filed for you, it is not served for you, and it does not decide whether a court will grant expungement.",
        "**Stop and get help before you sign, file or serve anything if any of the following is true of your case.** Each one below is carried word for word from this route's own committed track record — `data/record-clearing/legal-design-track-registry.json`, track `nj_arrest_no_conviction`, `selfHelpStopConditions` — and each is a point where this packet stops being enough.",
        "- Dismissal after pretrial intervention, conditional discharge or another diversion programme.",
        "- Any count still open.",
        "- Prosecutor objection.",
        "- Any conviction that might sit on the N.J.S.A. 2C:52-2(b) or (c) non-expungeable list.",
        "- Any classification or out-of-state equivalency question.",
        "- Any same-day or closely-related bundling argument.",
        "- Prior expungement, which N.J.S.A. 2C:52-14(e) bars except on the Clean Slate route.",
        "- Pending charges.",
        "- Unpaid financial assessments and the willfulness question.",
        "- The participant cannot assemble complete case identifiers.",
        "- Federal, out-of-state or tribal records. They are not reachable, but they count toward eligibility and toward the offense counts.",
        "- Immigration exposure. New Jersey expungement has no federal immigration effect.",
        "- Any Title 39 motor vehicle matter, including DWI, which N.J.S.A. 2C:52-28 puts outside the chapter entirely.",
        "**If you are not a United States citizen, the immigration condition above is a hard stop, not a caveat.** Ask a New Jersey immigration attorney before you sign or file. A New Jersey expungement has no federal immigration effect, and this packet does not tell you what any immigration authority already holds or will do.",
        "**Where to ask, and for what.** The kit's own page 3 says it plainly: the court system can be confusing and it is a good idea to get a lawyer. If you cannot afford one, contact the legal services programme in your county to see whether you qualify for free legal services — their number is listed online under Legal Aid or Legal Services. If you do not qualify and need help finding an attorney, your county bar association's lawyer referral service can give you names, and some of those attorneys will consult at a reduced fee. The Criminal Case Management Office can explain how the court works, what the filing requirements are, and what its deadlines are; the kit states in the same place that court staff **cannot** give you legal advice. Only a lawyer can.",
      ],
    },
    {
      /*
       * FIX01/RP-2, CLIPPING_AND_OVERLAP.
       *
       * `DefName` carries TWENTY widgets on this kit, from 208.2 to 366.2
       * points wide, and the shared finalizer measured the fit on widgets[0]
       * alone and stamped that one size into all twenty. The boundary name
       * fitted widgets[0] at 6.5pt; at 6.5pt it needs 219.5pt, which four of
       * the twenty cannot hold. Seven words then left the 612-point page
       * altogether and were cut mid-word -- the participant's own name and
       * street address, on the Cover Letter to Court among others -- while
       * actual-writes.json recorded the same writes as "fit" and "shrunk".
       *
       * fitTextPerWidget measures every widget on its own rectangle and writes
       * each widget's own size into its own /DA, taking the field's stored
       * value from the most constraining one. Measured before turning it on:
       * every multi-widget field on this kit fits every one of its widgets at
       * six points or better with the boundary persona, so nothing that is
       * written today becomes a refusal. dismissOff1 and arrest1CaseNum refuse
       * on widget 0 either way; they are handled below.
       *
       * Opt-in per FAMILY, not on NJ_SOURCE, because NJ_SOURCE is shared by
       * five New Jersey families and a repair lane does not decide what the
       * other four produce on their next rebuild.
       */
      fitTextPerWidget: true,
      // See factMappingsForDocument: a dropdown of bare county names is not a
      // free-text county blank, and matter.county is the residence county
      // rather than the filing county the kit asks for.
      deny: ["ExpungeCntyName"],
      /*
       * The caption the geometric capture reaches for this blank is "Law Div",
       * which is the line above it in the same stacked caption block. Now that
       * the field is a disclosed blank rather than a declared write, that label
       * is what the participant is asked to fill in, so it is corrected to the
       * words the form actually prints around the box, read off pages 18, 27,
       * 30 and 40: "County" on one line and "(where you are filing)" on the
       * next.
       */
      captions: { ExpungeCntyName: "County (where you are filing)" },
      /*
       * FIX01/RP-2, REPEATING_ROWS.
       *
       * Row (1) of the arrest table on the proposed Expungement Order, page 31,
       * reads "(date) ___ arrest/custody on the charge of violating N.J.S.A.
       * (statute) ___ under (original indictment/accusation/summons/warrant/
       * complaint/FJ or FO docket number) ___". On the boundary filing the date
       * cell carried ink and the docket cell did not, because arrest1Dt fits
       * and arrest1CaseNum refuses on a 37-character docket number. A row that
       * names a date and no docket number asks a court to expunge an arrest it
       * cannot identify.
       *
       * This is the Pennsylvania rule of FIX11 applied to New Jersey: a row is
       * complete or it is untouched. If any declared write in the group is
       * refused, every declared write in the group is withheld, the row is left
       * wholly empty like rows (2) to (4) beside it, and each withheld cell is
       * named to the participant.
       *
       * Family-scoped, like the two settings above: the same row exists on this
       * kit for the other four New Jersey families and they are not in this
       * lane's grant.
       */
      repeatingRowGroups: [{
        row: "Expungement Order (Form C), arrest table row 1, delivered page 31",
        fields: ["arrest1Dt", "arrest1CaseNum"],
      }],
    }
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
    "The measured conviction control is marked; no clean-slate or marijuana election is made.",
    {},
    {
      fitTextPerWidget: true,
      deny: ["ExpungeCntyName"],
    }
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
        alignWidgetFontSizeToFit: true,
        /*
         * Page 1 carries the eight-column conviction table (the form numbers
         * its headings 6 to 13) with two case rows, and the numbered attachment
         * lines 4 to 10 under heading 14. Page 2 carries the item-19 table of a
         * conviction the applicant may ask to have sealed in a LATER
         * application, whose headings differ from page 1's. Page 3 is the
         * Affidavit of Service, whose captions are printed in square brackets
         * beneath their rules. In every case the caption is the column heading
         * the form prints; the row it belongs to is named after the dash so the
         * blank can be found on the paper.
         */
        captions: {
          Applicant_AKA: "AKA(s)",
          NYSID: "NYSID",
          Motorist_ID: "Motorist ID # (VTL Crimes)",
          Docket_Indictment_SCI_Number_2: "Docket, Indictment, or SCI Number - second case row",
          Court_Name_2: "Court Name - second case row",
          Conviction_Charge_2: "Conviction Charge Description - second case row",
          Law_Section_Subsection_1: "Conviction Charge Law/Section/Subsection - first case row",
          Law_Section_Subsection_2: "Conviction Charge Law/Section/Subsection - second case row",
          Conviction_Date_2: "Conviction Date - second case row",
          Sentence_Date_1: "Sentence Date - first case row",
          Sentence_Date_2: "Sentence Date - second case row",
          Sentence_Term_1: "Sentence Term - first case row",
          Sentence_Term_2: "Sentence Term - second case row",
          Release_Date_1: "Release Date from any incarceration - first case row",
          Release_Date_2: "Release Date from any incarceration - second case row",
          Attachment_4: "Attachments, numbered line 4",
          Attachment_5: "Attachments, numbered line 5",
          Attachment_6: "Attachments, numbered line 6",
          Attachment_7: "Attachments, numbered line 7",
          Attachment_8: "Attachments, numbered line 8",
          Attachment_9: "Attachments, numbered line 9",
          Attachment_10: "Attachments, numbered line 10",
          Court_Name: "Court Name - the conviction you intend to ask to have sealed in a later application",
          Conviction_Date: "Conviction Date - the conviction you intend to ask to have sealed in a later application",
          Sentence_Date: "Sentence Date - the conviction you intend to ask to have sealed in a later application",
          Address_of_Person_Serving: "[address of person serving/mailing]",
          Date_of_Service: "[date of service/mailing]",
          Documents_in_Support: "the supporting documents served with the Notice of Motion and Affidavit in Support of Sealing Pursuant to CPL 160.59",
          // The form prints "at the following address(es):" inline on the first
          // rule and repeats the rule beneath it; the bracketed note under the
          // pair reads "[address(es) of District Attorney's office(s)]". The
          // inline caption is what the capture already reached for the first
          // rule and it is correct, so only the second is corrected -- the
          // capture had dragged the first rule's underscores into it. The
          // bracketed note is deliberately not used as the caption: it contains
          // the word "attorney", which the completeness contract reads as an
          // attorney-block field the participant does not complete, and these
          // two rules are the participant's to fill in on their own affidavit.
          Address_of_DA_2: "at the following address(es) - second line",
        },
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
        alignWidgetFontSizeToFit: true,
        /*
         * The page-2 "Case Identifiers" column is where the equal-gap tie bites
         * hardest: eleven captions ending at the same x, and a run of ten
         * widgets each taking the row above. Each entry below is the caption the
         * form prints on that widget's own line, read from the printed face.
         * Page 1's Select Court block prints "Court Name / Street Address /
         * City, State & Zip" and the second and third widgets both reached the
         * third caption.
         */
        captions: {
          CourtAddress: "Street Address",
          CourtCityStateZip: "City, State & Zip",
          IDVNumber: "IDV Number",
          ArrestNumber: "Arrest Number",
          OrderofProtectionNumber: "Order of Protection Number",
          CertificateofDispositionNumber: "Certificate of Disposition Number",
          "CriminalJusticeTrackingNumber(CJTN)": "Criminal Justice Tracking Number (CJTN)",
          TicketNumber: "Ticket Number",
          NYSIDNumber: "NYSID Number",
          PartialDocketNumber: "Partial Docket Number",
          ArrestDateRangeEnd: "Arrest Date - OR Date Range, the second box",
          IncidentDateRangeEnd: "Incident Date - OR Date Range, the second box",
        },
      }),
      source({
        key: "pro-se-packet", id: "NY-CPL-160.59-PRO-SE-PACKET", role: "REQUIRED_INSTRUCTIONS_AND_APPLICATION_PACKET",
        title: "CPL 160.59 Pro Se Sealing Application Packet and Instructions", revision: "REV-UNKNOWN",
        pathInArchive: "STATES/NY/02_PACKET_FORMS/NY__FORM__CPL-160.59-PRO-SE-PACKET__cpl-160-59-pro-se-sealing-application-packet-and-instructions__REV-UNKNOWN__EN.pdf",
        hash: "cf22b8ea0cb8661c8e3f17cc0f16e6b95ca889f1e994e3772dfaf867b6da0298", bytes: 519607,
        allow: { "Applicant Name": "participant.full_legal_name", "Street Address": "participant.street_address",
          "City State Zip": "participant.city_state_zip", Phone: "participant.phone", Email: "participant.email",
          "Case Number 1": "matter.case_number" },
        /*
         * Every widget of "Applicant Name", "Street Address", "City State Zip",
         * "Phone" and "Email" on this form carries its own /DA of `/Arial 11 Tf`,
         * which overrode the fitted size and drew four boundary values off the
         * right edge of the page. See alignWidgetFontSizeToFit in the shared
         * finalizer for the measurement.
         */
        alignWidgetFontSizeToFit: true,
        /*
         * The Notice of Motion (page 9) and the Affidavit in Support (page 10)
         * number their fields with circled glyphs whose bytes do not decode, so
         * two captions arrived as control characters. The item-11 table on page
         * 10 prints its two column headings on one line, which the capture
         * returned whole for the left column. The Affidavit of Service on page
         * 12 prints its captions in parentheses beneath their rules, and the
         * capture reached the sentence to the left instead.
         */
        captions: {
          AKAs: "AKA(s)",
          NYSID: "NYSID",
          "Case Number 2": "Case Number (Docket, Indictment, or SCI Number) - second row",
          "Court Name 2": "Court Name - second row",
          "Case Number 3": "Case Number (Docket, Indictment, or SCI Number) - the conviction you intend to ask to have sealed in a later application",
          "Court Name 3": "Court Name - the conviction you intend to ask to have sealed in a later application",
          "Document 3": "REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 3",
          "Document 4": "REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 4",
          "Document 5": "REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 5",
          "Document 6": "REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 6",
          "Document 7": "REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 7",
          "Document 8": "REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 8",
          "Document 9": "REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 9",
          "Document 10": "REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 10",
          "Server Name": "(Name of Person Serving/Mailing)",
          "Server Address": "(Address of Person Serving/Mailing)",
          "Service Date": "(Date of Service/Mailing)",
        },
      }),
      source({
        key: "seal-verification-source-only", id: "NY-CPL-160.59-SEAL-VERIFICATION", role: "POST_ORDER_SOURCE_ONLY",
        title: "Request for CPL 160.59 Seal Verification", revision: "REV-UNKNOWN",
        pathInArchive: "STATES/NY/04_SUPPORTING_PROCESS/NY__SUPPORT__CPL-160.59-SEAL-VERIFICATION__request-for-cpl-160-59-seal-verification__REV-UNKNOWN__EN.pdf",
        hash: "76c0c54ed0a80c8b5b5fddd64e2087b31f9615d5ebe7524ead803352fba3cca3", bytes: 79928, render: false,
      }),
    ],
    // Asked in the standard's own order, and corrected under amendment A2.
    //
    // The first draft searched only this family's two bound CPL 160.59 sources.
    // Neither states a fee, so it reported that no held source establishes the
    // application fee and sent the participant to the clerk's office of the
    // court of conviction. That claim about the FORMS is true and was
    // re-confirmed from the source bytes; the claim about the REPOSITORY was
    // false, and A2 is explicit that this family's clerk referral is the defect
    // it names. The route obligation census entry for
    // obligation:track-pathway:NY:ny_160_59_petition:discretionary-conviction-sealing-by-petition-under-cpl-160-59
    // names src/lib/rcap-engine/compiled/profiles/NY-new-york.json as a
    // requiredSourceId, and that profile answers it in
    // packetGenerator.feeRules[2]: "CPL 160.59 sealing application No separate
    // filing fee Court motion; notarization needed". So the answer is stated.
    //
    // The certificate-of-disposition paragraph is unchanged and stays: it was
    // always the correct treatment -- the repository holds those figures, so
    // the packet states them -- and it is now the second of two stated answers
    // rather than the only one.
    feeAndWaiver: [
      "**The CPL 160.59 sealing application carries no separate filing fee.** The compiled New York profile this route is built from — `src/lib/rcap-engine/compiled/profiles/NY-new-york.json`, named as a required source for discretionary conviction sealing by petition under CPL 160.59 — records it directly: *CPL 160.59 sealing application — No separate filing fee — Court motion; notarization needed*. The profile's own summary says the same thing in full sentences: the 160.59 motion \"carries no separate filing fee\", and the near-certain costs are the certificate of disposition and any DCJS record-review fee. Neither of this packet's two application sources — the Notice of Motion and Affidavit in Support of Sealing under CPL 160.59, nor the CPL 160.59 Pro Se Sealing Application Packet and Instructions — prints a fee on its face, and that silence is consistent with the rule rather than a gap in it.",
      "**What you should still expect to pay, and what you should not.** The application itself is free to file, so no fee waiver is needed for it. The Criminal Certificate of Disposition Request Form states its own fee on its face: five dollars ($5) in courts located outside New York City, or ten dollars ($10) in courts located in New York City's five boroughs, and it tells you to contact the court to ask what payment methods are accepted. You need a certificate of disposition for each conviction you are applying to seal, so budget that amount per case. The profile also records a DCJS fee if you order a review of your own record to confirm what is on it. Your application must be notarized, and a notary may charge for that.",
      "**Free help exists, and the profile names it.** The compiled profile records that legal-aid organizations and county district attorney sealing units assist pro se applicants at no cost. If the clerk's office of the court where you were convicted and sentenced tells you something different about cost from what this section says, follow the clerk — that office is the one that takes the filing — and the pro se packet already sends you to it: contact \"the clerk's office of the court where you will apply to seal your case, which is the court where you were convicted and sentenced\", and file \"by mail or in person at the clerk's office of the appropriate courthouse\".",
    ],
    /*
     * SERVICE, asked in the standard's own order and answered by the repository.
     *
     * Amendment A4 puts SERVICE in the class of obligations whose failure mode
     * is the packet withholding something the repository establishes, and three
     * committed records establish this one. The track registry entry for
     * ny_160_59_petition holds it in rules.filing ("serve the county district
     * attorney"), rules.notice ("The county district attorney, who may consent
     * or object") and rules.service ("Service on the district attorney with
     * proof of service"); the route obligation census holds it again in
     * destination.detail and names a service_instructions component for the
     * route. The delivered pro se packet prints it too, in its own steps 4 and
     * 5, and the delivered application prints the 45-day consideration period on
     * its own face.
     *
     * These instructions said none of it. Their one operative line asked the
     * participant to "confirm ... service ... before filing" while the packet
     * handed them eight blank service and affidavit-of-service fields, which is
     * exactly the substitution A1 forbids.
     */
    service: [
      "**The District Attorney must be served, and serving is your step.** A copy of the Notice of Motion and every supporting document goes to the District Attorney of each county where a conviction you are asking to seal was entered. Where the Attorney General or the Special Narcotics Prosecutor prosecuted the case, that office is served instead. If your two convictions were entered in different counties, each of those prosecutors is served separately.",
      "**Serve before you file, and prove it.** The pro se packet's step 4 tells you to serve first, either in person - taking a copy to the prosecutor's office and having your own copy stamped *received* - or by mail. The application's Affidavit of Service (page 3 of the application, page 4 of the pro se packet) is the sworn proof, and it must be notarized. If more than one prosecutor's office was served, the pro se packet requires a separate Affidavit of Service for each. Step 5 tells you to attach the original affidavits when you file. Only a copy stamped *received* in person excuses the affidavit; a mailed copy never does.",
      "**Complete the service blanks only after service has actually happened.** The name and address of the person serving, the date of service, the county and address of each District Attorney, and the choice between mailing and personal delivery are all listed among the blanks below. They record something that has occurred. A date written before you serve would be false, and the affidavit is sworn under penalty of perjury.",
      "**Then the prosecutor has 45 days.** The application states it on its own face: the District Attorney has 45 days after being served to consent to the sealing or to oppose it. If they oppose, the court holds a hearing. The statewide list of District Attorney offices and addresses is published by the New York State District Attorneys Association, and the clerk's office of the court where you will file can also tell you which office to serve.",
    ],
    /*
     * SELF_HELP_STOP. The committed track registry holds ten stop conditions for
     * ny_160_59_petition in selfHelpStopConditions, and this packet named none
     * of them, carried no "not legal advice" line, and did not say it is not
     * filed for you. The ten below are those conditions; nothing is added to
     * them and nothing is softened. The referral sentence that already existed
     * sat inside the cost section as a cost fact, which is not this obligation.
     */
    selfHelpStop: [
      "**This packet is not legal advice, and no lawyer has reviewed your case in preparing it.** It is a prepared set of official New York forms for you to read, complete, sign, have notarized, serve and file yourself. It is not filed for you, and it does not decide whether your conviction can be sealed - that decision is the court's, and it is discretionary.",
      "Stop and get a lawyer's help before you file if any of these is true of your case. Each one is recorded in this route's own track record as a point where self-help ends:",
      "- any conviction that might fall on the exclusion list, including any attempt or conspiracy whose target offence has to be analysed;",
      "- any class A felony, which is excluded here even where it would qualify under Clean Slate - the two lists are opposites and this is where the routing error happens;",
      "- any argument that several crimes arose from a single criminal transaction and should count as one;",
      "- District Attorney objection, which turns this into a contested hearing;",
      "- any pending or open criminal charge;",
      "- more than two convictions, or more than one felony;",
      "- the rehabilitation and interests-of-justice showing, which is the heart of a discretionary application and is not a form-filling exercise;",
      "- immigration exposure. Sealing does not remove immigration consequences and sealed records remain reachable by immigration authorities. Ask an immigration attorney before you sign anything;",
      "- firearms licensing goals, because sealed records remain available for firearms licensing;",
      "- federal and out-of-state convictions, which New York sealing does not reach at all.",
      "**Who to ask, for what.** The clerk's office of the court where you were convicted and sentenced answers procedural questions - what to file, where, and what the court needs. Only a lawyer admitted in New York can advise you on eligibility, on what to argue, or at a hearing. The compiled New York profile records that legal-aid organisations and county district attorney sealing units assist pro se applicants at no cost, and some county district attorney offices run sealing units that publish their own instructions.",
    ],
    notes: [
      "Prior-application elections, reasons, sworn dates, service facts, prosecutor information, and notary fields remain blank.",
      "The post-order seal-verification document is source-custody evidence only; form currency and the proposed-order branch remain release blockers. The fee is no longer among them: this packet's fee-and-waiver section states the answer the compiled New York profile holds — the CPL 160.59 application carries no separate filing fee — together with the certificate-of-disposition, DCJS and notary costs it does carry. Nor is service: the who, the when, the proof and the 45-day consideration period are stated from the committed track registry, the route census and the delivered forms' own faces.",
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
      /*
       * Every string below is printed on the form. The court-type row prints
       * three pairs -- "Supreme Court / City Court, City of", "County Court /
       * Town Court, Town of", "District Court / Village Court, Village of" --
       * and the geometry gave the town blank the village caption, so a
       * participant filing in a town court was told to name a village. The three
       * "Unknown" checkboxes each sit under their own printed heading and the
       * geometry gave two of them the next heading down and one of them the rule
       * of underscores above it; each is restored to its own heading. The last
       * three are the checklist items printed below "***FOR COURT USE ONLY - DO
       * NOT WRITE BELOW THIS LINE***", which the court completes.
       */
      captions: {
        Conviction_Court: "Court where convicted (Check one only)",
        City_Court_Specify: "City Court, City of",
        Town_Court_Specify: "Town Court, Town of",
        Village_Court_Specify: "Village Court, Village of",
        CJTN: "CJTN/Criminal Justice Tracking Number (NOTE: If you were not fingerprinted in this case, write NONE.)",
        NYSID: "NYSID/New York State Identification Number (NOTE: If you were not fingerprinted in this case, write NONE.)",
        Docket_Case_Number_Unknown: "Unknown - Court Docket/Case Number",
        CJTN_Unknown: "Unknown - CJTN/Criminal Justice Tracking Number",
        NYSID_Unknown: "Unknown - NYSID/New York State Identification Number",
        Application_Complete: [COURT_USE_ONLY, "2. All required information is completed, and the court clerk has checked and verified the information is correct."],
        File_Copy: [COURT_USE_ONLY, "5. Application is scanned/uploaded to case management system and/or placed in case file, as applicable."],
        Copies_Sent: [COURT_USE_ONLY, "6. Copies of application sent to prosecutor, law enforcement agencies and DCJS as applicable for further processing."],
      },
    })],
    /*
     * DET-FEE-AND-WAIVER-001 A1 as widened by A2: ask the repository first.
     *
     * It answers, twice over and in the same words. The form's own first
     * instruction line, extracted from the pinned binary, reads "Submit your
     * application to the Court where you were convicted. (NOTE: There is no
     * application fee.)" The committed track registry entry for
     * ny_mrta_marijuana records the same two facts in rules.filing and
     * rules.fees, adds that one application goes to each court of conviction,
     * names the three submission methods, and answers service outright:
     * rules.notice is "none by the participant" and rules.service is "none".
     *
     * So none of these three is a question to delegate. Under A1 a named
     * checkable authority stands in only where no held source establishes the
     * answer, and here three held sources establish all of it.
     */
    filingDestination: [
      "**Submit your application to the court where you were convicted.** That is the form's own first printed instruction, and there is no statewide address, mailbox or portal for it: the Office of Court Administration publishes this application but does not receive it. An application sent to any other court cannot be processed.",
      "**One application per court.** If you have eligible marijuana or cannabis convictions in more than one New York court, you submit a separate application to each of them. A single application cannot cover convictions entered in two different courts.",
      "**Three ways to submit it.** Through that court's Electronic Document Delivery System (EDDS), by regular first-class mail, or in person. If you submit in person, the form tells you to bring a valid government-issued photo ID proving you were the defendant in the case. If you send it through EDDS or by mail, the application has to be notarized instead - notarization is the identity proof, and which one you need follows how you submit, not what you are asking for.",
    ],
    feeAndWaiver: [
      "**There is no application fee.** The form states it on its own face, in the same printed instruction that tells you where to submit it: *Submit your application to the Court where you were convicted. (NOTE: There is no application fee.)* The committed New York track record for this route says the same thing and records no fee waiver, because there is no fee to waive.",
      "**One cost that is not this application.** If you order a DCJS Record Review to confirm what is on your own record - which you may want before you apply, or after, to see what the destruction changed - that review carries its own fee. It is a separate request to a separate agency and it is not a charge for this application.",
      "**A notary may charge.** If you submit through EDDS or by mail rather than in person, the application must be notarized, and a notary may charge for that. Nothing in the held sources sets that figure; it is not a court fee.",
    ],
    service: [
      "**You do not serve anyone.** Nothing in this route requires the participant to serve, mail or deliver a copy to a prosecutor, to a police agency, or to the Division of Criminal Justice Services. The committed New York track record for this route records notice as \"none by the participant\" and service as \"none\".",
      "**The court distributes it, and the form says so.** Item 6 of the processing checklist printed below the form's COURT USE ONLY line reads *Copies of application sent to prosecutor, law enforcement agencies and DCJS as applicable for further processing.* That is the court's step, not yours, and it is why there is no certificate of service on this form and none in this packet.",
      "**What you should get back.** The court returns an Acknowledgement of Application to Destroy Expunged Marihuana Conviction Record, and where you were fingerprinted, DCJS writes separately to confirm destruction. If nothing reaches you, the office to ask is the clerk of the court of conviction that received your application - the same court you submitted it to. No other office can tell you where it is.",
    ],
    /*
     * SELF_HELP_STOP. Independent verification (VF04) measured this packet
     * as naming no stop at all: zero case-insensitive matches in
     * participant-instructions.md for lawyer, attorney, legal aid, legal
     * help, self-help, stop or advice. The committed track registry holds
     * fourteen selfHelpStopConditions for ny_mrta_marijuana and the packet
     * carried none of them.
     *
     * All fourteen are below, each quoted word for word from the registry.
     * Nothing is added to them and nothing is softened -- including the two
     * the registry addresses to LegalEase or to the implementation owner
     * rather than to the participant, which are carried unchanged rather
     * than dropped, because a participant is entitled to see what about
     * their own route is unsettled. The immigration condition is restated
     * after the list in the registry's own terms, because a non-citizen must
     * be told to reach an immigration attorney before signing, not left to
     * find it in a list of fourteen.
     *
     * Nothing here sends the participant into a circumstance the registry
     * records as the end of self-help: the registry's own refusal to re-send
     * a denied application, and its refusal to send one to a different court,
     * travel with the conditions they belong to.
     */
    selfHelpStop: [
      "**This packet is not legal advice, and no lawyer has reviewed your case in preparing it.** It is a prepared copy of the Office of Court Administration's Application to Destroy Marijuana Conviction Record for you to read, complete, sign, have notarized where the form requires it, and submit yourself. It is not submitted for you, and it does not decide whether your conviction was expunged or whether the record will be destroyed.",
      "**Stop and get help before you sign or send this application if any of the following is true of your case.** Each one below is carried word for word from this route's own committed track record — `data/record-clearing/legal-design-track-registry.json`, track `ny_mrta_marijuana`, `selfHelpStopConditions` — and each is a point where this packet stops being enough. A few of them name the step LegalEase or this packet's implementation owner takes rather than one you take; they are stated here unchanged so you can see the whole of what is not settled.",
      "- Any marijuana offence outside the two covered categories. LegalEase does not decide whether an uncovered offence qualifies. Next step: a New York criminal defence lawyer or a public defender record-clearing project, and check the CPL § 160.59 discretionary sealing route separately.",
      "- Mixed cases with non-marijuana charges. The marijuana remedy does not reach the other counts. Next step: the same referral, and check the CPL § 160.59 route for the counts this section leaves in place.",
      "- Verification that destruction actually occurred, which by definition leaves nothing to point to. LegalEase cannot confirm that anything was destroyed. Next step: tell the participant what an absence in a DCJS Record Review does and does not prove, and direct any status question about their own application to the court of conviction that received it, which is also the court that issues the acknowledgement.",
      "- Immigration exposure. Sealing does not remove immigration consequences and sealed records remain reachable by immigration authorities. Next step: a New York immigration attorney, before any request is signed or sent.",
      "- Firearms licensing goals. Next step: a New York firearms-licensing attorney; the marijuana expungement does not answer the licensing question.",
      "- Federal and out-of-state convictions, which New York sealing does not reach. Next step: counsel in the convicting jurisdiction.",
      "- Any dispute about whether the conviction is one CPL § 160.50(3)(k) reaches, or about whether the case has in fact been expunged. LegalEase does not determine eligibility and does not certify that the automatic expungement happened. Next step: the participant confirms from their own record, and where the dispute survives that, a New York criminal defence lawyer or a public defender record-clearing project.",
      "- The participant cannot identify the court, docket number or charge for the case. A request cannot name a record that has not been identified. Next step: request a DCJS Record Review, or ask the clerk of the court of conviction for the case identifiers, before the request is prepared.",
      "- Currency of the official application. Its identity is now established — the printed title, the absence of any issuer form number, and the March 2025 edition dated from document metadata — but no live fetch of the issuer's binary was obtained, so an edition published since cannot be ruled out, and LegalEase does not substitute a local or unofficial form. Next step: the official-PDF implementation owner confirms the current binary against the recorded digest before any participant copy exists.",
      "- A request for anything other than destruction of an expunged New York marijuana conviction record — resentencing, vacatur of a conviction the automatic route does not reach, or relief on a federal, out-of-state, military or tribal record. Next step: a New York criminal defence lawyer, or counsel in the convicting jurisdiction.",
      "- The court of conviction denies the destruction request, does not respond, or returns it. CPL § 160.50(5) sets no timeline, names no remedy for non-response and gives no appeal route for the request. Next step: a New York criminal defence lawyer or a public defender record-clearing project. Do not re-send the application as though a remedy had been established, and do not send it to a different court, which cannot process it.",
      "- Court records for the case cannot be located, or the vacatur, dismissal and expungement has not been reflected. This is the CPL § 160.50(5)(b)(ii)(B) route and not the destruction request. Next step: the participant or their attorney presents a DCJS fingerprint record, a copy of a court disposition record or other relevant court record to an appropriate court employee, after which the chief administrator of the courts or their designee must assure completion promptly and in any event within thirty days.",
      "- The participant wants someone else to sign the application for them. CPL § 160.50(5)(b)(i) permits a designated agent to make the request, but the current official form provides a defendant signature line only, and whether a court will accept an agent-signed application is not answered by the form. Stop: LegalEase does not produce an agent-signed version. Next step: the participant signs it themselves, or asks the court of conviction, or an attorney submits the participant-signed application with the notarization the instructions require.",
      "- The participant has eligible convictions in more than one New York court and wants one application to cover them. Stop: the issuer's instructions require a separate application to each court of conviction, and an application sent to the wrong court cannot be processed. Next step: prepare one application per court, each signed and dated.",
      "**If you are not a United States citizen, the immigration condition above is a hard stop, not a caveat.** Ask a New York immigration attorney before this request is signed or sent. Destruction of a New York marijuana conviction record does not remove immigration consequences, and this packet does not tell you what any immigration authority already holds or will do.",
      "**Who to ask, for what.** The clerk of the court of conviction — the same court this application is submitted to — answers procedural questions: whether it arrived, how that court takes EDDS submissions, and what its acknowledgement looks like. Only a lawyer admitted in New York can advise you on eligibility, on whether a conviction is one this remedy reaches, or on what to do if the court denies the request or does not answer. A public defender office or a legal aid record-clearing project in the county of conviction is where to ask for that help at no cost. The clerk cannot give legal advice and this packet does not stand in for one.",
    ],
    notes: [
      "This artifact covers only an explicitly requested irreversible-destruction branch and grants no runtime permission to select it.",
      "Every control below the form's COURT USE ONLY line and every affirmation/signature date remains blank. The three checklist controls this build once listed as participant blanks - Application_Complete, File_Copy and Copies_Sent - are refused as court-owned, which is what the form's own COURT USE ONLY rule makes them.",
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
    // The repository was asked first and answers plainly that it does not know.
    // DC-33's own four pages were decoded: its first page carries the District
    // Court's eight numbered filing instructions and says nothing about a filing
    // fee, nothing about filing being free, and nothing about a waiver. The held
    // Rhode Island record-clearing legal review says the same in as many words --
    // "Filing fee: unresolved. Not stated in the reference. Release blocker for
    // cost copy." -- and lists it again among its open questions and release
    // blockers. No held source establishes the figure, so a NAMED CHECKABLE
    // AUTHORITY stands in and no figure is invented. The authority comes from the
    // held sources too: the legal review states the filing method ("with the clerk
    // of the court where the conviction occurred; the clerk fills in the hearing
    // date"), the motion page prints the four District Court divisions with their
    // street addresses beside the division checkboxes, and instruction 2 confirms
    // the clerk's office fills in the hearing date.
    feeAndWaiver: [
      "**No held source establishes what it costs to file this motion.** Form DC-33 — the District Court Motion, Affidavit and Instructions to Expunge or Seal Record — carries the court's own numbered filing instructions on its first page and says nothing about a filing fee, nothing about filing being free, and nothing about a waiver. The Rhode Island record-clearing legal review held in this repository records the same gap in as many words: \"Filing fee: unresolved. Not stated in the reference,\" and lists the filing fee for a Chapter 12-1.3 motion among its open questions and release blockers. This packet does not supply a figure it does not hold.",
      "**Ask the clerk's office of the District Court division where your case was heard** — the division you check at the top of the motion, whose address the form itself prints: Murray Judicial Complex, 2nd Division, 45 Washington Square, Newport, Rhode Island 02840-2913; Noel Judicial Complex, 3rd Division, 222 Quaker Lane, Warwick, Rhode Island 02886-0107; McGrath Judicial Complex, 4th Division, 4800 Tower Hill Road, Wakefield, Rhode Island 02879-2239; Garrahy Judicial Complex, 6th Division, One Dorrance Plaza, Providence, Rhode Island 02903-2719. That clerk's office is where the motion is filed, and instruction 2 on the form says it is the office that fills in your hearing date. Put two questions to it before you file: what, if anything, the court charges to file a motion to expunge or seal, and whether any fee waiver or reduction is available to you.",
      "**A cost the form does state, about a different thing.** DC-33's instruction 8 says that if your motion is granted, \"all financial obligations owed (fines, fees, costs, restitution, and assessments) must be paid in full to complete the expungement process,\" after which the clerk's office prepares three certified copies of the order for you to deliver. That is money already owed on your case, and the form states it about the expungement process; whether it bears on a sealing under G.L. 1956 § 12-1-12 is another question for the same clerk. It is not a charge for filing this motion.",
    ],
    notes: [
      "Only the measured existing SEAL control is marked. Courthouse, eligibility, notice/service, hearing, signature/date, and notary blocks remain blank.",
      "The notary \"personally appeared\" control on page 4 is left in its source-owned blank state; its unselected /Off appearance is proven against a zero-write source-normalized flattened baseline and is never a mark this build makes.",
      "The filing fee is no longer among this family's release blockers: the fee-and-waiver section states that no held source establishes it and names the division clerk's office that answers it.",
    ],
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
  const disorderlyDocument = FAMILY["nj_disorderly_persons-set"].documents[0];
  assert.equal(disorderlyDocument.fitTextPerWidget, true,
    "NJ disorderly-persons repeated widgets must be fitted independently");
  assert.ok(disorderlyDocument.deny.includes("ExpungeCntyName"),
    "NJ disorderly-persons must not substitute residence county for filing county");
  assert.equal(factMappingsForDocument(disorderlyDocument).ExpungeCntyName, undefined,
    "NJ disorderly-persons ExpungeCntyName must remain REQUIRED_BEFORE_FILING");
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
  assert.equal(classifyRefusal("Signature of Petitioner", "Signature"), "signature_or_date_participant_completion");
  assert.equal(classifyRefusal("UnknownDispositionDate", "Disposition date"), "required_before_filing");
  assert.equal(classifyRefusal("Date_of_Service", "Date of Service"), "unmailed_or_unperformed_service");
  assert.equal(classifyRefusal("Applicant_Email", "Email"), "required_before_filing");
  assert.equal(classifyRefusal("Print_Form", "Print this form"), "not_a_filing_fact");
  assert.equal(classifyRefusal("Judge", "Judge"), "court_prosecutor_clerk_or_agency_owned");
  assert.equal(classifyRefusal("Reasons_to_Grant_Application", "Reasons"), "participant_sworn_narrative_or_legal_election");
  const pa6308ServiceDocument = FAMILY["pa_6308_underage-set"].supplementalDocuments?.[0];
  assert.equal(FAMILY["pa_6308_underage-set"].implementationStrategy,
    "official_pdf_fill_with_custom_service_certificate",
    "PA 6308 source evidence must describe the hybrid packet vehicle truthfully");
  assert.equal(pa6308ServiceDocument?.documentId, "pa_6308_underage-certificate-of-service-3",
    "PA 6308 must generate the packet set's required certificate of service");
  const pa6308ServiceText = pa6308ServiceDocument.renderText(
    factsForJurisdiction("PA"),
    PA_6308_ROUTE_VEHICLES.magisterial_district_judge,
  );
  assert.match(pa6308ServiceText, /attorney for the Commonwealth/i,
    "PA 6308 certificate must name the governed recipient");
  assert.match(pa6308ServiceText, /concurrently with filing/i,
    "PA 6308 certificate must state the governed timing");
  assert.match(pa6308ServiceText, /service method accepted by the filing court[^\n]*\.{8,}/i,
    "PA 6308 certificate must leave the unproved local service method blank");
  assert.doesNotMatch(pa6308ServiceText, /certified mail|first[- ]class mail|personal service|hand delivery|electronic service/i,
    "PA 6308 certificate must not invent a local service method");
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
    const captured = context.effectiveLabel ?? null;
    const effectiveLabel = doc.captions ? readableCaption(captured) : captured;
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

/*
 * Applies the document's own caption table to one finished map row.
 *
 * Two shapes, both from the table above. A string is the caption the form
 * prints beside this widget and replaces whatever the geometry reached, on a
 * row that is being surfaced to the participant. COURT_USE_ONLY says the
 * control is not the participant's at all, and turns the row into the court-
 * owned refusal it should always have been -- which also removes it from the
 * "facts still required before filing" list, because it is not one.
 *
 * A candidate_write row is never touched: those rows deliberately carry no
 * caption at all, and giving one a caption would read as "this fact is written
 * beside these words".
 */
function applyCaptionCorrection(row, correction, documentId) {
  if (row.decision !== "refuse") return row;
  if (correction === undefined) {
    // No correction for this widget. A row carried forward from an earlier
    // build can still hold an undecoded caption in its installed
    // classification, which the fresh census guard never sees, so it is
    // scrubbed here too rather than delivered.
    const scrubbed = readableCaption(row.effectiveLabel ?? null);
    if (scrubbed === (row.effectiveLabel ?? null)) return row;
    return { ...row, effectiveLabel: scrubbed ?? row.field,
      captionBasis: `the caption bytes beside this widget did not decode into readable text; the form's own field name stands in (${documentId})` };
  }
  const [marker, caption] = Array.isArray(correction) ? correction : [correction, null];
  if (marker === COURT_USE_ONLY) {
    return {
      field: row.field, decision: "refuse", factId: null,
      refusalClass: "court_prosecutor_clerk_or_agency_owned",
      blankTreatment: null,
      effectiveLabel: caption ?? readableCaption(row.effectiveLabel ?? null) ?? row.field,
      reason: "This control is printed below the form's own COURT USE ONLY line and is completed by the court, not by the participant. Nothing is written into it and it is not a blank of this filing.",
      captionBasis: "read from the form's printed face: the control sits below the printed COURT USE ONLY rule",
      widgets: row.widgets,
    };
  }
  return {
    ...row,
    effectiveLabel: marker,
    captionBasis: `read from the printed face of ${documentId}; the geometric capture reached a different printed line`,
  };
}

function fieldMapFor(doc, census, installed = new Map()) {
  const selected = new Set(doc.selections ?? []);
  const factMappings = factMappingsForDocument(doc);
  const sharedMappings = SHARED_EXACT_FACT_ALLOWLIST[doc.documentId] ?? {};
  const captions = doc.captions ?? null;
  const withCaption = (row) => (captions
    ? applyCaptionCorrection(row, captions[row.field], doc.documentId)
    : row);
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
    if (installedRow) return withCaption({ ...installedRow, widgets: field.widgets });
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
      return withCaption({ field: field.name, decision: "refuse", factId: null,
        blankTreatment: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, routeDetermined: false,
        identity: `${doc.documentId} field ${field.name}`,
        effectiveLabel: field.effectiveLabel ?? field.name,
        reason: afterService
          ? "REQUIRED_BEFORE_FILING: service has not occurred, so the platform holds no fact for this field; the participant completes it after service and does not guess."
          : "REQUIRED_BEFORE_FILING: the platform holds no exact fact for this field; surface it to the participant and do not guess.",
        completesAfterService: afterService,
        widgets: field.widgets });
    }
    return withCaption({ field: field.name, decision: "refuse", factId: null, refusalClass,
      blankTreatment: null,
      effectiveLabel: field.effectiveLabel ?? field.name,
      reason: refusalClass === "source_only_not_generated"
        ? "This companion is held as exact source evidence and is not a generated participant artifact; a blank on a document the participant never receives is never a filing fact of this packet, and nothing is ever written into it."
        : refusalReason(refusalClass),
      widgets: field.widgets });
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
    const overlaid = await overlayExactMappedFacts({
      bytes: result.bytes, census: officialOptions.census,
      fieldMap: exactFieldMap, facts: officialOptions.facts, report: result.report,
    });
    // The neutralized, not-yet-flattened bytes. Conditions 2 and 3 of the
    // protected-field rule are about the state that goes INTO the flatten, so
    // they are answered from these bytes rather than from a report about them.
    return { ...overlaid, preparedSourceBytes };
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

/*
 * ZERO-WRITE SOURCE-NORMALIZED BASELINE.
 *
 * addedPaintedPaths(sourceBytes, artifactBytes) answers "what paths does the
 * finished artifact carry that the RAW source did not". For a protected TEXT
 * blank that is the right question. For a protected BUTTON it is not, because
 * the raw source keeps its checkboxes and radios as live widgets whose blank
 * /Off face lives in an /AP appearance stream, not in the page content. The
 * normalization this host already performs -- delete /V and /DV, force every
 * button widget to /AS /Off, then flatten -- MOVES that untouched blank face
 * into the page content. The box outline and hairlines then read as new paths
 * even though the build painted nothing: they are the control's own unselected
 * appearance, which the source owns.
 *
 * The baseline below carries the SAME source through the SAME neutralization,
 * the SAME finalizer and the SAME flatten with every census field classified
 * unwritable, so not one participant value is written. Paths present in both
 * the artifact and this baseline are structure the source already owned. Paths
 * present in the artifact and ABSENT from this baseline are ink this build's
 * writes added, and they still fail the gate.
 *
 * This is a change of BASELINE, not a change of rule. No family name and no
 * field name is consulted; a protected field that carries a selected state, a
 * checkmark, an X, drawn text or any extra path fails exactly as before.
 */
const zeroWriteBaselineCache = new Map();

export async function zeroWriteNormalizedBaseline({ sourceBytes, expectedSha256, census, documentTextLines }) {
  const key = sha256(sourceBytes);
  const cached = zeroWriteBaselineCache.get(key);
  if (cached) return cached;
  const baseline = await finalizeEastOfficialForm({
    sourceBytes,
    expectedSha256,
    census,
    facts: {},
    explicitMappings: {},
    exactFieldMap: [],
    // Every field, by role, so the finalizer writes nothing at all. This is the
    // one difference from the production call; the sanitizer, the choice
    // neutralization and the flatten are identical.
    unwritableFields: census.map((field) => ({ field: field.name, class: "zero_write_normalization_baseline" })),
    documentTextLines,
    title: "zero-write source normalization baseline",
  });
  assert.deepEqual(baseline.report.written, [],
    "the zero-write normalization baseline must contain no participant write");
  const row = { bytes: baseline.bytes, preparedSourceBytes: baseline.preparedSourceBytes,
    sha256: sha256(baseline.bytes) };
  zeroWriteBaselineCache.set(key, row);
  return row;
}

/**
 * /V and every widget /AS, read straight from the PDF objects, so conditions 2
 * and 3 are answered from the bytes that go into the flatten rather than from
 * the build's own account of them.
 */
async function choiceStateOfBytes(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const state = new Map();
  for (const field of doc.getForm().getFields()) {
    const value = field.acroField.dict.get(PDFName.of("V"));
    state.set(field.getName(), {
      value: value == null ? null : String(value),
      widgetAppearanceStates: field.acroField.getWidgets().map((widget) => {
        const as = widget.dict.get(PDFName.of("AS"));
        return as == null ? null : String(as);
      }),
    });
  }
  return state;
}

const BLANK_STATES = new Set([null, "/Off", "Off"]);

/**
 * Condition 6: a focused raster of one protected widget region, taken from the
 * completed artifact and from the zero-write baseline at the same DPI and the
 * same crop, must be pixel-identical. A 12x10pt control is ten pixels wide at
 * the inventoried 72 DPI, so the focused comparison is taken at 288 DPI.
 */
const FOCUSED_PROTECTED_REGION_DPI = 288;

async function focusedRegionIsIdentical({ artifactFile, baselineBytes, page, rect, pageGeometry, label }) {
  const geometry = pageGeometry.find((row) => row.page === page);
  assert.ok(geometry, `${label}: page ${page} has no measured geometry`);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-protected-region-"));
  try {
    const baselineFile = path.join(scratch, "baseline.pdf");
    fs.writeFileSync(baselineFile, baselineBytes);
    const shot = async (file, prefix) => {
      const rows = await rasterizePdf({ file, outDir: scratch, pages: [page], prefix,
        dpi: FOCUSED_PROTECTED_REGION_DPI });
      assert.equal(rows.length, 1, `${label}: focused raster did not produce one page`);
      return rows[0];
    };
    const artifactShot = await shot(artifactFile, "artifact");
    const baselineShot = await shot(baselineFile, "baseline");
    assert.equal(artifactShot.widthPx, baselineShot.widthPx, `${label}: focused raster width differs`);
    assert.equal(artifactShot.heightPx, baselineShot.heightPx, `${label}: focused raster height differs`);
    const scale = FOCUSED_PROTECTED_REGION_DPI / 72;
    // PDF user space is bottom-left origin; the raster is top-left origin. One
    // pixel of margin each way so a mark painted hard against the control's own
    // outline cannot fall outside the compared window.
    const margin = 1;
    const left = Math.max(0, Math.floor(rect.x * scale) - margin);
    const top = Math.max(0, Math.floor((geometry.height - (rect.y + rect.height)) * scale) - margin);
    const width = Math.min(artifactShot.widthPx - left, Math.ceil(rect.width * scale) + margin * 2);
    const height = Math.min(artifactShot.heightPx - top, Math.ceil(rect.height * scale) + margin * 2);
    assert.ok(width > 0 && height > 0, `${label}: protected region crops to nothing`);
    const crop = (file) => sharp(file).extract({ left, top, width, height })
      .greyscale().raw().toBuffer();
    const [artifactRegion, baselineRegion] = await Promise.all([
      crop(artifactShot.file), crop(baselineShot.file),
    ]);
    let differingPixels = 0;
    for (let index = 0; index < artifactRegion.length; index += 1) {
      if (artifactRegion[index] !== baselineRegion[index]) differingPixels += 1;
    }
    return {
      dpi: FOCUSED_PROTECTED_REGION_DPI,
      regionPx: { left, top, width, height },
      comparedPixels: artifactRegion.length,
      differingPixels,
      identical: differingPixels === 0,
      artifactRegionSha256: crypto.createHash("sha256").update(artifactRegion).digest("hex"),
      baselineRegionSha256: crypto.createHash("sha256").update(baselineRegion).digest("hex"),
    };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
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

/**
 * THE PROTECTED-FIELD INK GATE.
 *
 * Exported so its own control can drive the real gate rather than a copy of it.
 * A protected widget carries ink when the completed artifact shows text inside
 * it, or paths inside it that the ZERO-WRITE NORMALIZED BASELINE does not also
 * carry. A widget whose only paths are its own unselected /Off appearance is
 * excused, and only after all six proofs below hold; every other protected
 * field, and every actually selected or written one, fails exactly as before.
 */
export async function evaluateProtectedFieldInk({
  artifactFile, artifactBytes, appearances, census, fieldMap, report,
  sourceBytes = null, normalizedBaseline = null, preFlattenBytes = null, label = "artifact",
}) {
  const protectedInk = [];
  const sourceAddedPaths = sourceBytes ? await addedPaintedPaths(sourceBytes, artifactBytes) : [];
  const protectedVectorInk = [];
  // Protected widgets whose only paths are their own source-owned blank
  // appearance, each carrying the six proofs that let it stand.
  const protectedSourceOwnedAppearances = [];
  let baseline = null;
  let baselineAddedPaths = null;
  let preFlattenChoiceState = null;
  const writtenFieldNames = new Set((report.written ?? []).map((row) => row.field));
  for (const field of census.fields) {
    const mapEntry = fieldMap.find((row) => row.field === field.name);
    const protection = protectedCensusField(field, mapEntry);
    if (!protection.protected) continue;
    const drawn = field.widgets.flatMap((widget) => drawnAt(appearances, {
      page: widget.page, rect: widget.rect, tolerance: 3,
    })).map((entry) => String(entry.text ?? "").trim()).filter(Boolean);
    if (drawn.length) protectedInk.push({ field: field.name, category: protection.category, drawnText: drawn });
    const vectorPaths = field.widgets.flatMap((widget) => pathsInsideBox(sourceAddedPaths, widget.page, widget.rect));
    if (!vectorPaths.length) continue;
    const fail = (reason, paths = vectorPaths, evidence = null) => protectedVectorInk.push({
      field: field.name, category: protection.category, vectorPaths: paths, reason, evidence,
    });
    if (!normalizedBaseline) {
      fail("no_zero_write_normalized_baseline_available_for_comparison");
      continue;
    }
    if (baseline === null) {
      baseline = await normalizedBaseline();
      baselineAddedPaths = await addedPaintedPaths(baseline.bytes, artifactBytes);
      preFlattenChoiceState = preFlattenBytes ? await choiceStateOfBytes(preFlattenBytes) : null;
    }
    // Condition 4 and condition 5, together: only paths the completed artifact
    // carries BEYOND the zero-write normalized baseline are ink this build added.
    const beyondBaseline = field.widgets
      .flatMap((widget) => pathsInsideBox(baselineAddedPaths, widget.page, widget.rect));
    if (beyondBaseline.length) {
      fail("painted_paths_beyond_the_zero_write_normalized_baseline", beyondBaseline);
      continue;
    }
    // Condition 5 again, for the other kind of mark: drawn text inside a
    // protected widget is already recorded above and is never excused here.
    if (drawn.length) {
      fail("drawn_text_inside_a_protected_widget", vectorPaths, { drawnText: drawn });
      continue;
    }
    // Condition 1: the build wrote no participant value to this field.
    if (writtenFieldNames.has(field.name)) {
      fail("the_build_reported_a_participant_write_to_this_protected_field");
      continue;
    }
    // Conditions 2 and 3, read from the bytes that went into the flatten.
    const preFlatten = preFlattenChoiceState?.get(field.name) ?? null;
    if (!preFlatten) {
      fail("pre_flatten_state_of_this_protected_field_could_not_be_read");
      continue;
    }
    if (!BLANK_STATES.has(preFlatten.value)) {
      fail("pre_flatten_field_value_is_neither_absent_nor_off", vectorPaths, preFlatten);
      continue;
    }
    if (!preFlatten.widgetAppearanceStates.every((state) => BLANK_STATES.has(state))) {
      fail("pre_flatten_widget_appearance_state_is_neither_absent_nor_off", vectorPaths, preFlatten);
      continue;
    }
    // Condition 6: the protected region renders identically in the completed
    // artifact and in the zero-write baseline.
    const regionComparisons = [];
    for (const widget of field.widgets) {
      regionComparisons.push({ page: widget.page, rect: widget.rect,
        ...await focusedRegionIsIdentical({
          artifactFile, baselineBytes: baseline.bytes, page: widget.page, rect: widget.rect,
          pageGeometry: census.pageGeometry, label: `${label}/${field.name}`,
        }) });
    }
    const differing = regionComparisons.filter((row) => !row.identical);
    if (differing.length) {
      fail("focused_raster_of_the_protected_region_differs_from_the_zero_write_baseline",
        vectorPaths, differing);
      continue;
    }
    protectedSourceOwnedAppearances.push({
      field: field.name, category: protection.category,
      pathsMatchingNormalizedBaseline: vectorPaths.length,
      conditions: {
        buildWroteNoParticipantValue: true,
        preFlattenFieldValue: preFlatten.value,
        preFlattenWidgetAppearanceStates: preFlatten.widgetAppearanceStates,
        zeroWriteNormalizedBaselineSha256: baseline.sha256,
        pathsBeyondNormalizedBaseline: 0,
        drawnTextInsideProtectedWidget: [],
        focusedRegionRaster: regionComparisons,
      },
      rule: "a protected widget's own unselected /Off appearance is source-owned form"
        + " structure, proven against a zero-write source-normalized flattened baseline",
    });
  }
  return { protectedInk, protectedVectorInk, protectedSourceOwnedAppearances };
}

async function proofFromArtifact(file, census, fieldMap, report, facts, label,
  { sourceBytes = null, preSelectionBytes = null, preFlattenBytes = null,
    // Async, and called only when a protected widget actually shows paths the
    // raw source did not carry, so the fourteen families whose protected fields
    // are quiet never pay for a second finalization.
    normalizedBaseline = null } = {}) {
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
  const { protectedInk, protectedVectorInk, protectedSourceOwnedAppearances } =
    await evaluateProtectedFieldInk({
      artifactFile: file, artifactBytes, appearances, census, fieldMap, report,
      sourceBytes, normalizedBaseline, preFlattenBytes, label,
    });
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
    protectedInk, protectedVectorInk, protectedSourceOwnedAppearances, selectionProof,
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
    routeKeys: config.routeKeys, implementationStrategy: config.implementationStrategy ?? "official_pdf_fill",
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
    ...((config.supplementalDocuments ?? []).length ? {
      composedComponents: config.supplementalDocuments.map((doc) => ({
        documentId: doc.documentId,
        documentRole: doc.documentRole,
        generatedParticipantArtifact: true,
        authority: "the committed legal-design track registry and legal-design specification",
        sourceBinary: null,
        serviceFactsUsed: {
          recipient: "attorney for the Commonwealth",
          timing: "concurrently with filing",
          method: "not established; participant completion blank",
        },
      })),
    } : {}),
    whatThisReceiptDoesNotEstablish: [
      "that an unknown-revision source remains current",
      "that local court practice or route branching has been resolved",
      "that any artifact has completed legal or commercial approval",
    ],
  };
}

/*
 * The fee-and-waiver answer, for a family that has one to give.
 *
 * DETERMINATION_FEE_AND_WAIVER_STANDARD.json settles what satisfies this
 * obligation, and its test is asked in order: does the repository establish the
 * answer? If it does, the packet states it. Only where no held source does may a
 * NAMED, reachable authority stand in -- an office, desk or clerk identified
 * well enough to actually reach -- and never a gesture ("fees may apply", "check
 * with the court"). Never a figure the repository does not hold.
 *
 * The template's catch-all line lists "fees" among six other things and answers
 * none of them, which is exactly the shape the standard fails. A family that
 * declares `feeAndWaiver` answers the question in its own section, and the
 * catch-all stops claiming to cover it. A family that declares nothing is
 * untouched: its instructions render byte-for-byte as before.
 */
function feeAndWaiverSection(config) {
  const paragraphs = config.feeAndWaiver ?? null;
  if (!paragraphs?.length) return "";
  // The heading used to read "...and who answers that", which was written when
  // the only family declaring this section delegated the question. Under
  // amendment A2 that family states the held answer instead, so the heading no
  // longer promises a referral. ny_160_59_petition-set is the sole declarer on
  // this host, so this wording change moves no other family's bytes.
  return `\n## What it costs to file\n\n${paragraphs.map((p) => `${p}\n`).join("\n")}`;
}

/*
 * The three answers the catch-all line used to stand in for.
 *
 * Determination DET-FEE-AND-WAIVER-001, amendment A1 as widened by A2 and A4:
 * ask first whether the repository establishes the answer, and where it does,
 * the packet states it rather than sending the participant to ask a question
 * the repository has already answered. FILING_DESTINATION, SERVICE and
 * REQUIRED_BEFORE_FILING share that failure mode with FEE_AND_WAIVER, and on
 * this host all four were failing on one sentence -- "Confirm current revision,
 * filing destination, local procedures, fees, attachments, service, and
 * proposed-order requirements before filing" -- which lists four questions and
 * answers none.
 *
 * Each section is opt-in and each removes its own item from that sentence when
 * it is declared, so the sentence never claims to cover something a section now
 * answers and never drops an item nothing answers. A family declaring none of
 * them renders byte-for-byte as before.
 */
function filingDestinationSection(config) {
  const paragraphs = config.filingDestination ?? null;
  if (!paragraphs?.length) return "";
  return `\n## Where to file\n\n${paragraphs.map((p) => `${p}\n`).join("\n")}`;
}

function serviceSection(config) {
  const paragraphs = config.service ?? null;
  if (!paragraphs?.length) return "";
  return `\n## Who must be served\n\n${paragraphs.map((p) => `${p}\n`).join("\n")}`;
}

function selfHelpStopSection(config) {
  const paragraphs = config.selfHelpStop ?? null;
  if (!paragraphs?.length) return "";
  return `\n## Where self-help ends\n\n${paragraphs.map((p) => `${p}\n`).join("\n")}`;
}

/*
 * The catch-all line, with every item a declared section now answers removed
 * from it. With no section declared this is the legacy sentence character for
 * character; with only the cost section declared it is the sentence that family
 * already carries.
 */
function confirmBeforeFilingLine(config) {
  const answered = [];
  const items = ["current revision", "filing destination", "local procedures", "fees",
    "attachments", "service", "proposed-order requirements"].filter((item) => {
    if (item === "fees" && config.feeAndWaiver?.length) { answered.push("Cost"); return false; }
    if (item === "filing destination" && config.filingDestination?.length) { answered.push("Where to file"); return false; }
    if (item === "service" && config.service?.length) { answered.push("Who must be served"); return false; }
    return true;
  });
  const list = `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  const tail = answered.length === 0 ? ""
    : answered.length === 1 ? ` ${answered[0]} is answered in its own section below.`
      : ` ${answered.slice(0, -1).join(", ")} and ${answered[answered.length - 1]} are each answered in their own section below.`;
  return `- Confirm ${list} before filing.${tail}\n`;
}

/*
 * FIX01/RP-2, KNOWN_PREFILLS: the values this platform holds and did not print.
 *
 * Two failure modes reach the same place. A value can be too long for its box
 * at any readable size, and a cell can be dropped because another cell of the
 * same row was. Either way the platform HOLDS the fact, the box on the paper is
 * empty, and the participant is the only person who can finish it. Saying
 * nothing is what turned a 79-character charge and a 37-character docket number
 * into two blanks indistinguishable from the form's own.
 *
 * Rendered from the artifact reports of this build, so an empty list means the
 * build printed everything it held rather than that nobody looked.
 */
function heldButNotPrintedSection(rows) {
  if (!rows?.length) return "";
  const byField = new Map();
  for (const row of rows) {
    const key = `${row.documentId}::${row.field}`;
    if (!byField.has(key)) byField.set(key, { ...row, fixtures: [] });
    byField.get(key).fixtures.push(row.fixture);
  }
  const lines = [...byField.values()]
    .sort((a, b) => a.field.localeCompare(b.field))
    .map((row) => `| \`${row.field}\` | \`${row.factId}\` | ${row.why} | ${row.fixtures.join(", ")} |`);
  return "\n## Values this platform holds but did not print\n\n"
    + "The blanks below are not blanks the platform has no fact for. It holds each of these values and could "
    + "not put it on the paper, so it left the box **empty** rather than print something a court could not read, "
    + "or leave a row half filled. **Write each one in by hand before you file.** Which of them bites on a real "
    + "packet depends on how long that participant's own name, charge or docket number is; the fixtures a row "
    + "was measured on are named in the last column.\n\n"
    + "| Source field | The fact | Why it is not printed | Measured on |\n| --- | --- | --- | --- |\n"
    + `${lines.join("\n")}\n`;
}

function participantInstructions(config, fieldMaps, heldButNotPrinted = []) {
  if (config.guidance) return guidedParticipantInstructions(config, fieldMaps);
  const routeLines = config.routeKeys.map((route) => `- Route scope: \`${route}\``).join("\n");
  const notes = (config.notes ?? []).map((note) => `- ${note}`).join("\n");
  const fees = feeAndWaiverSection(config);
  const whereToFile = filingDestinationSection(config);
  const whoIsServed = serviceSection(config);
  const selfHelpEnds = selfHelpStopSection(config);
  const confirmBeforeFiling = confirmBeforeFilingLine(config);
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
    + confirmBeforeFiling
    + fees
    + whereToFile
    + whoIsServed
    + heldButNotPrintedSection(heldButNotPrinted)
    + (requiredBeforeFiling
      ? `\n## Exact facts still required before filing\n\nThe platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.\n\n${requiredBeforeFiling}\n`
      : "")
    + selfHelpEnds
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
  if (familyId === "pa_6308_underage-set") {
    fs.rmSync(abs(PA_6308_OUT), { recursive: true, force: true });
  }
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
      if (config.routeVehicle) {
        const selectedVehicle = config.routeVehicle.selector(facts);
        if (doc.routeVehicle !== selectedVehicle.vehicleId) continue;
      }
      const unwritableFields = map.filter((row) => row.decision !== "candidate_write")
        .map((row) => ({ field: row.field,
          class: row.refusalClass ?? (row.requiredBeforeFiling === true ? "required_before_filing" : "route_selection_or_role") }));
      const mappings = factMappingsForDocument(doc);
      /*
       * Withholding a field means withholding it on BOTH write paths. The
       * shared semantic finalizer is stopped by unwritableFields; the exact
       * measured overlay in this host is stopped only by the field map it
       * reads, because that pass writes every candidate_write row the shared
       * finalizer did not take. Removing the fact mapping alone stops neither:
       * arrest1Dt binds by field NAME as well, and the overlay wrote it anyway.
       */
      const finalizeWith = (explicitMappings, withheld) => finalizeEastOfficialForm({
        sourceBytes: sourceRow.bytes, expectedSha256: doc.sha256,
        census: census.fields, facts, explicitMappings,
        exactFieldMap: withheld.size === 0 ? map
          : map.map((row) => (withheld.has(row.field)
            ? { ...row, decision: "refuse", factId: null, blankTreatment: "REQUIRED_BEFORE_FILING",
              requiredBeforeFiling: true, reason: "WITHHELD_FOR_ROW_INTEGRITY: another cell of this row could not be printed." }
            : row)),
        unwritableFields: [...unwritableFields, ...[...withheld].map((field) => ({
          field, class: "required_before_filing",
        }))],
        documentTextLines: census.documentTextLines,
        alignWidgetFontSizeToFit: doc.alignWidgetFontSizeToFit === true,
        fitTextPerWidget: doc.fitTextPerWidget === true,
        title: `${config.jurisdiction} ${doc.documentId} ${fixture} review artifact`,
      });
      let finalized = await finalizeWith(mappings, new Set());
      /*
       * A row is complete or it is untouched. The first pass is what tells us
       * which cells the fitter could take; where that leaves a declared row
       * half-written, the whole row is withheld and the document is rendered
       * again without it. Nothing is guessed and nothing is squeezed: the row
       * simply goes to the participant intact instead of arriving on the
       * court's paper with a date and no docket number.
       */
      const rowIntegrityWithheld = [];
      for (const group of doc.repeatingRowGroups ?? []) {
        const declared = group.fields.filter((field) => Object.hasOwn(mappings, field));
        if (declared.length === 0) continue;
        const refusedInRow = new Set(finalized.report.refused.map((row) => row.field));
        const broken = declared.filter((field) => refusedInRow.has(field));
        if (broken.length === 0 || broken.length === declared.length) continue;
        for (const field of declared.filter((field) => !refusedInRow.has(field))) {
          rowIntegrityWithheld.push({
            field, factId: mappings[field], row: group.row,
            valueHeld: facts[mappings[field]] ?? null,
            withheldBecauseRefusedInTheSameRow: broken,
          });
        }
      }
      if (rowIntegrityWithheld.length) {
        const withheldNames = new Set(rowIntegrityWithheld.map((row) => row.field));
        const reduced = Object.fromEntries(Object.entries(mappings)
          .filter(([field]) => !withheldNames.has(field)));
        finalized = await finalizeWith(reduced, withheldNames);
        for (const row of rowIntegrityWithheld) {
          assert.ok(!finalized.report.written.some((written) => written.field === row.field),
            `${doc.documentId}/${fixture}: ${row.field} was withheld for row integrity and still carries ink`);
        }
      }
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
        preFlattenBytes: finalized.preparedSourceBytes,
        normalizedBaseline: () => zeroWriteNormalizedBaseline({
          sourceBytes: sourceRow.bytes, expectedSha256: doc.sha256,
          census: census.fields, documentTextLines: census.documentTextLines,
        }),
      });
      /*
       * FIX01/RP-2, KNOWN_PREFILLS. Every value this build HOLDS and did not
       * put on the paper, in one place, per fixture.
       *
       * The refusals were always in report.refused, mixed in with a hundred and
       * sixty rows for fields nobody ever intended to write. Nothing separated
       * "the platform has no fact for this" from "the platform has the fact and
       * could not print it", so a dropped 79-character charge and a dropped
       * 37-character docket number looked exactly like the form's own blank
       * lines, and the participant page said nothing at all.
       */
      const heldButNotPrinted = [
        ...report.refused
          .filter((row) => Object.hasOwn(mappings, row.field) && row.category === "unfittable")
          .map((row) => ({
            field: row.field, factId: mappings[row.field],
            valueHeld: facts[mappings[row.field]] ?? null,
            why: "the value does not fit this box at a size a court could read",
            reason: row.reason,
          })),
        ...rowIntegrityWithheld.map((row) => ({
          field: row.field, factId: row.factId, valueHeld: row.valueHeld,
          why: `another cell of the same row (${row.withheldBecauseRefusedInTheSameRow.join(", ")}) could not be printed, `
            + "and a row is completed or left untouched",
          reason: "withheld_for_row_integrity", row: row.row,
        })),
      ].sort((a, b) => a.field.localeCompare(b.field));
      artifactReports.push({
        documentId: doc.documentId, documentKey: doc.key, fixture, file,
        sha256: sha256(bytes), byteLength: bytes.length, pageCount: census.pageGeometry.length,
        report, proof, heldButNotPrinted,
      });
      console.log(`  ${fixture}: wrote ${report.written.length}; refused ${report.refused.length}; `
        + `selections ${report.selections.length}; held-but-not-printed ${heldButNotPrinted.length}`);

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

  for (const doc of config.supplementalDocuments ?? []) {
    fieldMaps.push({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      generatedParticipantArtifact: true,
      fields: doc.fields,
    });
    for (const [fixture, facts] of [["canonical", factsForJurisdiction(config.jurisdiction)],
      ["boundary", factsForJurisdiction(config.jurisdiction, true)]]) {
      const selectedVehicle = config.routeVehicle?.selector(facts) ?? null;
      const text = doc.renderText(facts, selectedVehicle);
      const bytes = await renderPleadingPdf(text, `${config.jurisdiction} ${doc.documentId} ${fixture}`);
      const file = `${out}/fixtures/${doc.key}-${fixture}.pdf`;
      writeBytes(file, bytes);
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      const extractedText = pdf.getPages()
        .flatMap((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text))
        .join("\n");
      assert.ok(extractedText.includes(facts["participant.full_legal_name"]),
        `${doc.documentId}/${fixture}: participant name is not extractable`);
      assert.ok(extractedText.includes(facts["matter.case_number"]),
        `${doc.documentId}/${fixture}: docket number is not extractable`);
      assert.match(extractedText, /attorney for the Commonwealth/i,
        `${doc.documentId}/${fixture}: governed service recipient is absent`);
      assert.match(extractedText, /concurrently with filing/i,
        `${doc.documentId}/${fixture}: governed service timing is absent`);
      assert.doesNotMatch(extractedText,
        /certified mail|first[- ]class mail|personal service|hand delivery|electronic service/i,
        `${doc.documentId}/${fixture}: local service method was invented`);
      const written = doc.fields.filter((field) => field.decision === "candidate_write").map((field) => ({
        field: field.field,
        factId: field.factId,
        kind: "composed_static_text",
        value: facts[field.factId],
      }));
      const refused = doc.fields.filter((field) => field.decision === "refuse").map((field) => ({
        field: field.field,
        reason: field.reason,
        category: field.refusalClass,
      }));
      const report = {
        written,
        refused,
        selections: [],
        fieldFinalizer: {
          choiceNeutralization: {
            performedBeforeFlatten: false,
            fields: [],
            rule: "not applicable to a newly composed certificate with no interactive controls",
          },
        },
      };
      const proof = {
        artifactSha256: sha256(bytes),
        artifactByteLength: bytes.length,
        appearanceCount: 0,
        writtenProof: written.map((row) => ({
          field: row.field,
          factId: row.factId,
          expectedValue: row.value,
          drawnText: [row.value],
          exactValueObserved: extractedText.includes(row.value),
          derivedFrom: "decoded text operators in the saved composed certificate PDF",
        })),
        missingWrittenInk: [],
        wrongWrittenValues: [],
        protectedInk: [],
        protectedVectorInk: [],
        protectedSourceOwnedAppearances: [],
        selectionProof: [],
      };
      assert.ok(proof.writtenProof.every((row) => row.exactValueObserved),
        `${doc.documentId}/${fixture}: a declared write is absent from decoded PDF bytes`);
      artifactReports.push({
        documentId: doc.documentId,
        documentKey: doc.key,
        fixture,
        file,
        sha256: sha256(bytes),
        byteLength: bytes.length,
        pageCount: pdf.getPageCount(),
        report,
        proof,
        heldButNotPrinted: [],
        supplemental: true,
      });

      const rasterDir = `${out}/raster/${doc.key}-${fixture}`;
      const rasterRows = await rasterizePdf({ file: abs(file), outDir: abs(rasterDir), prefix: "page" });
      assert.equal(rasterRows.length, pdf.getPageCount(), `${doc.documentId}/${fixture}: not every page rastered`);
      assert.equal(rasterRows.filter((row) => row.looksBlank).length, 0, `${doc.documentId}/${fixture}: blank raster page`);
      const contactFile = `${out}/reports/contact-sheets/${doc.key}-${fixture}.png`;
      const contactSheetRaw = await writeContactSheet(rasterRows, abs(contactFile));
      rasterReports.push({
        documentId: doc.documentId,
        fixture,
        sourcePdf: file,
        directory: rasterDir,
        engine: "bundled_poppler_pdftoppm",
        dpi: RASTER_DPI,
        contactSheet: { ...contactSheetRaw, file: contactFile },
        pages: rasterRows.map((row) => ({
          page: row.page,
          file: path.posix.join(rasterDir, path.basename(row.file)),
          sha256: sha256(fs.readFileSync(row.file)),
          byteLength: fs.statSync(row.file).size,
          widthPx: row.widthPx,
          heightPx: row.heightPx,
          attempts: row.attempts,
          looksBlank: row.looksBlank,
          croppedToPage: row.croppedToPage,
          engine: row.engine,
          dpi: row.dpi,
        })),
      });
      console.log(`\n=== ${familyId}: ${doc.documentId} ===`);
      console.log(`  ${fixture}: composed service certificate; wrote ${written.length}; refused ${refused.length}`);
      console.log(`  raster: ${rasterRows.length}/${pdf.getPageCount()} pages`);
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
      // Refusals of facts the platform HOLDS, separated out of the 160-odd
      // refusals of fields nothing was ever going to be written into. Without
      // this separation a dropped charge and a dropped docket number are
      // indistinguishable from the form's own blank lines.
      heldButNotPrinted: row.heldButNotPrinted ?? [],
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
    componentsNotGenerated: [
      ...config.documents.filter((doc) => doc.render === false).map((doc) => ({
        documentId: doc.documentId, documentRole: doc.documentRole,
        generatedParticipantArtifact: false,
        why: "This companion is held as exact source evidence and is not a generated participant artifact, so no fixture is rendered for it.",
      })),
      ...(config.unbuiltComponents ?? []),
    ],
  });
  if (config.routeVehicle) {
    writeJson(`${out}/route-vehicle-map.json`, {
      schemaVersion: "rcap-route-vehicle-map/v1",
      familyId,
      controllingFact: config.routeVehicle.factId,
      acceptedValues: Object.entries(config.routeVehicle.values).map(([value, vehicle]) => ({
        value, vehicleId: vehicle.vehicleId, primary: vehicle.primary,
        proposedOrder: vehicle.proposedOrder,
      })),
      missingOrUnknownFactTreatment: config.routeVehicle.missingFactTreatment,
      mappingAuthority: "committed legal-design generation requirement and owner execution decision",
      generatedFixtures: artifactReports.map((artifact) => ({
        fixture: artifact.fixture,
        documentId: artifact.documentId,
        courtLevel: factsForJurisdiction(config.jurisdiction, artifact.fixture === "boundary")[config.routeVehicle.factId],
      })),
      generationAllowed: false,
      runtimeSelectable: false,
      commercialRoutesOpened: 0,
    });
    writeJson(`${out}/packet-component-specification.json`, {
      schemaVersion: "rcap-packet-component-specification/v1",
      familyId,
      routeKeys: config.routeKeys,
      status: "ROUTE_VEHICLE_MAPPED_REQUIRED_COMPONENTS_BUILT",
      courtStatusMetadata: {
        factId: config.routeVehicle.factId,
        requiredRecordSource: "court docket or clerk-certified disposition",
        selectors: Object.entries(config.routeVehicle.values).map(([value, vehicle]) => ({
          value, officialVehicle: [vehicle.primary, vehicle.proposedOrder],
        })),
        noInferenceRule: "Do not select from the charge label, packet directory name, or user recollection. Stop without producing a participant artifact when the court record does not establish the court level.",
      },
      serviceCertificate: {
        componentId: "pa_6308_underage-certificate-of-service-3",
        status: "GENERATED_WITH_LOCAL_METHOD_AND_PERFORMED_SERVICE_FACTS_BLANK",
        recipient: "attorney for the Commonwealth",
        timing: "concurrently with filing",
        generatedArtifacts: artifactReports
          .filter((artifact) => artifact.documentId === "pa_6308_underage-certificate-of-service-3")
          .map((artifact) => ({ fixture: artifact.fixture, file: artifact.file, sha256: artifact.sha256 })),
        noGuessRule: "Do not invent a locally accepted service method or service facts. The participant completes the certificate only after service actually occurs.",
      },
      sourceBindings: [
        `${out}/source-receipt.json`,
        `${out}/route-vehicle-map.json`,
        "data/record-clearing/legal-design-track-registry.json",
      ],
      generationAllowed: false,
      runtimeSelectable: false,
      commercialRoutesOpened: 0,
    });
  }
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
  writeText(`${out}/participant-instructions.md`, participantInstructions(config, fieldMaps,
    artifactReports.flatMap((artifact) => (artifact.heldButNotPrinted ?? [])
      .map((row) => ({ ...row, documentId: artifact.documentId, fixture: artifact.fixture })))));
  console.log(`\n${familyId}: BUILD PASS (${artifactReports.length} PDFs; ${rasterReports.reduce((n, row) => n + row.pages.length, 0)} page rasters)`);
}

async function checkOfficial(familyId, config) {
  const out = officialOut(familyId, config.jurisdiction);
  const required = ["source-receipt.json", "field-census.census-v1.json", "production-field-map.json",
    "reports/actual-writes.json", "reports/rendered-artifacts.json", "build-findings.json",
    "approval-request.json", "participant-instructions.md"];
  for (const file of required) assert.ok(fs.existsSync(abs(`${out}/${file}`)), `${familyId}: missing ${file}`);
  if (config.routeVehicle) {
    for (const file of ["route-vehicle-map.json", "packet-component-specification.json"]) {
      assert.ok(fs.existsSync(abs(`${out}/${file}`)), `${familyId}: missing ${file}`);
    }
    const routeMap = readJson(`${out}/route-vehicle-map.json`);
    const componentSpec = readJson(`${out}/packet-component-specification.json`);
    assert.equal(routeMap.familyId, familyId);
    assert.equal(routeMap.controllingFact, config.routeVehicle.factId);
    assert.equal(routeMap.missingOrUnknownFactTreatment, "STOP_NO_ARTIFACT");
    assert.deepEqual(config.routeVehicle.selector({ [config.routeVehicle.factId]: "magisterial_district_judge" }),
      PA_6308_ROUTE_VEHICLES.magisterial_district_judge);
    assert.deepEqual(config.routeVehicle.selector({ [config.routeVehicle.factId]: "court_of_common_pleas" }),
      PA_6308_ROUTE_VEHICLES.court_of_common_pleas);
    assert.throws(() => config.routeVehicle.selector({}), /requires an established court level/);
    assert.throws(() => config.routeVehicle.selector({ [config.routeVehicle.factId]: "unknown" }),
      /requires an established court level/);
    assert.equal(componentSpec.serviceCertificate.status,
      "GENERATED_WITH_LOCAL_METHOD_AND_PERFORMED_SERVICE_FACTS_BLANK");
    assert.equal(componentSpec.serviceCertificate.generatedArtifacts.length, 2);
    assertFailClosedEvidence(routeMap, `${familyId}/route-vehicle-map`);
    assertFailClosedEvidence(componentSpec, `${familyId}/packet-component-specification`);
  }
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
  assert.equal(receipt.implementationStrategy, config.implementationStrategy ?? "official_pdf_fill");
  assert.equal(receipt.custodyClass, "SOURCE_ALREADY_HELD");
  assert.equal(receipt.acquisitionCommissioned, false);
  assert.equal(receipt.sourceArchive, "Expungement_AI_RCAP_Master_Library_Edition_1");
  assert.equal(receipt.corpusRootProvidedBy, CORPUS_ENV);
  assert.equal(receipt.documents.length, config.documents.length);
  assert.equal(census.documents.length, config.documents.length);
  assert.equal(map.documents.length, config.documents.length + (config.supplementalDocuments ?? []).length);
  if ((config.supplementalDocuments ?? []).length) {
    assert.deepEqual(receipt.composedComponents, config.supplementalDocuments.map((doc) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      generatedParticipantArtifact: true,
      authority: "the committed legal-design track registry and legal-design specification",
      sourceBinary: null,
      serviceFactsUsed: {
        recipient: "attorney for the Commonwealth",
        timing: "concurrently with filing",
        method: "not established; participant completion blank",
      },
    })));
  }
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
    const supplemental = (config.supplementalDocuments ?? [])
      .find((document) => document.documentId === documentMap.documentId);
    if (supplemental) {
      assert.equal(documentMap.documentRole, supplemental.documentRole);
      assert.equal(documentMap.generatedParticipantArtifact, true);
      assert.deepEqual(documentMap.fields, supplemental.fields);
      continue;
    }
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
    const supplemental = (config.supplementalDocuments ?? [])
      .find((candidate) => candidate.documentId === artifact.documentId);
    if (supplemental) {
      const fixtureFacts = factsForJurisdiction(config.jurisdiction, artifact.fixture === "boundary");
      const selectedVehicle = config.routeVehicle?.selector(fixtureFacts) ?? null;
      const recomputedText = supplemental.renderText(fixtureFacts, selectedVehicle);
      const recomputedBytes = await renderPleadingPdf(recomputedText,
        `${config.jurisdiction} ${supplemental.documentId} ${artifact.fixture}`);
      assert.equal(sha256(recomputedBytes), artifact.sha256,
        `${artifact.file}: deterministic composed certificate does not match stored artifact`);
      assert.equal(recomputedBytes.length, artifact.byteLength,
        `${artifact.file}: deterministic composed certificate byte-length drift`);
      const reopened = await PDFDocument.load(fs.readFileSync(abs(artifact.file)), {
        ignoreEncryption: true, updateMetadata: false,
      });
      const extractedText = reopened.getPages()
        .flatMap((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text))
        .join("\n");
      assert.ok(extractedText.includes(fixtureFacts["participant.full_legal_name"]));
      assert.ok(extractedText.includes(fixtureFacts["matter.case_number"]));
      assert.match(extractedText, /attorney for the Commonwealth/i);
      assert.match(extractedText, /concurrently with filing/i);
      assert.doesNotMatch(extractedText,
        /certified mail|first[- ]class mail|personal service|hand delivery|electronic service/i);
      assert.deepEqual(artifact.proof.protectedInk, []);
      assert.deepEqual(artifact.proof.protectedVectorInk, []);
      assert.deepEqual(artifact.proof.missingWrittenInk, []);
      assert.deepEqual(artifact.proof.wrongWrittenValues, []);
      assert.ok(artifact.proof.writtenProof.every((row) => row.exactValueObserved));
      assert.equal(artifact.proof.artifactSha256, artifact.sha256);
      continue;
    }
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
      alignWidgetFontSizeToFit: doc.alignWidgetFontSizeToFit === true,
      fitTextPerWidget: doc.fitTextPerWidget === true,
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
      { sourceBytes: sourceRow.bytes,
        preSelectionBytes,
        preFlattenBytes: finalized.preparedSourceBytes,
        normalizedBaseline: () => zeroWriteNormalizedBaseline({
          sourceBytes: sourceRow.bytes, expectedSha256: doc.sha256,
          census: liveCensus.fields, documentTextLines: liveCensus.documentTextLines,
        }) },
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

/*
 * WHERE EACH CLEAN TRACK IS FILED, WHAT IT COSTS, AND WHO IS SERVED.
 *
 * Read from the committed compiled Ohio profile at
 * src/lib/rcap-engine/compiled/profiles/OH-ohio.json -- its "Filing
 * instructions" and "Fees" sections -- and keyed by the statutory section each
 * track pleads, never across sections. The packet used to answer all three
 * questions with "no held source in this packet states it, ask the clerk",
 * which was false of the repository and cost the participant the out-of-state
 * and federal limb of the 2953.32 filing rule outright.
 */
const OH_CLEAN_TRACK_ROUTE_RULES = {
  oh_2953_32_sealing: {
    section: "Ohio Rev. Code Sec. 2953.32",
    destinationCourt: "the sentencing court for an Ohio conviction, or a court of common pleas for an out-of-state or federal conviction",
    destination: "File in the sentencing court for an Ohio conviction or in a court of common pleas for an out-of-state or federal conviction.",
    fee: "$50 application fee unless indigent, plus possible local court fee up to $50.",
    service: "The court schedules a hearing, notifies the prosecutor at least 60 days before the hearing, and holds the hearing 45-90 days after filing. The prosecutor may object at least 30 days before the hearing, and victims may be heard if applicable.",
  },
  oh_2953_32_expungement: {
    section: "Ohio Rev. Code Sec. 2953.32",
    destinationCourt: "the sentencing court for an Ohio conviction, or a court of common pleas for an out-of-state or federal conviction",
    destination: "File in the sentencing court for an Ohio conviction or in a court of common pleas for an out-of-state or federal conviction.",
    fee: "$50 application fee unless indigent, plus possible local court fee up to $50.",
    service: "The court schedules a hearing, notifies the prosecutor at least 60 days before the hearing, and holds the hearing 45-90 days after filing. The prosecutor may object at least 30 days before the hearing, and victims may be heard if applicable.",
  },
  oh_2953_33_nonconviction: {
    section: "Ohio Rev. Code Sec. 2953.33",
    destinationCourt: "the court where the case was pending, dismissed, resulted in not guilty, or where the grand jury no bill was reported",
    destination: "File in the court where the case was pending, dismissed, resulted in not guilty, or where the grand jury no bill was reported.",
    fee: "Ohio Legal Help says no fee for dismissal, not-guilty and no-bill sealing.",
    service: "The court holds a hearing 45-90 days after filing, and the prosecutor may object.",
  },
  oh_2953_35_firearm: {
    section: "Ohio Rev. Code Sec. 2953.35",
    destinationCourt: "the sentencing court",
    destination: "The application is filed in the sentencing court.",
    fee: "$50 unless indigent.",
    service: "The court considers prosecutor objections and weighs the applicant's interest against government needs.",
  },
};

/*
 * THE SAME THREE ANSWERS FOR Sec. 2953.321, WHICH THE REPOSITORY ALSO HOLDS.
 *
 * FIX06, oh_marijuana_expungement-set, obligations FEE_AND_WAIVER and SERVICE.
 * The packet told the participant that no held source states a filing fee, a
 * waiver procedure, or who is served. That was false of this repository twice
 * over: the compiled Ohio profile carries an exact Sec. 2953.321 pathway
 * (pathways[2]) whose own rule clauses state the destination, the $50-unless-
 * indigent fee and the 45-to-90-day hearing with prosecutor objection, and the
 * committed legal-design track registry states the same three answers for track
 * oh_marijuana_expungement in its rules.fees, rules.feeWaiver, rules.notice and
 * rules.service. Delegating an answer the repository holds is not caution; it
 * is the participant paying for a phone call the packet could have saved.
 *
 * Kept in its OWN table rather than added to OH_CLEAN_TRACK_ROUTE_RULES above,
 * for two reasons that are both about blast radius. Membership of that table is
 * ALSO the switch that fixtureForOhioTrack reads to rewrite a track's charge,
 * disposition and eligibility strings, and rewriting them here would move this
 * family's pleading bytes and void its raster receipt for a defect no verifier
 * measured on it. And Sec. 2953.321 is a different section from Sec. 2953.32:
 * the sections are never read across, so this row is keyed to its own.
 *
 * Nothing is added beyond what those two records state. Neither record fixes a
 * local court fee for this section and neither states a participant service
 * act, so this row states neither.
 */
const OH_SECTION_2953_321_ROUTE_RULES = {
  oh_marijuana_expungement: {
    section: "Ohio Rev. Code Sec. 2953.321",
    destinationCourt: "the sentencing court",
    destination: "Apply to the sentencing court. The application identifies the applicant and the offence, includes evidence that the offence falls within Sec. 2953.321, and requests expungement.",
    fee: "Fifty dollars unless indigent. Indigency excuses the fee under Sec. 2953.321(G), which also directs thirty dollars of the fee to the state treasury, half of that credited to the Attorney General Reimbursement Fund, and twenty dollars to the county general revenue fund. No held source fixes an additional local court fee for this section; ask the clerk of the sentencing court whether that court charges one and how it takes an indigency affidavit.",
    service: "The court notifies the prosecutor of the hearing and the prosecutor may object by filing an objection with the court before the date set for the hearing. The hearing is held 45 to 90 days after filing. Sec. 2953.321 sets no sixty-day notice period and no thirty-day objection deadline; those figures come from Sec. 2953.32 and do not govern this route. No held source states a separate participant service act for this section.",
  },
};

/* Every route rule this packet may state, by track. The clean-track table is
 * unchanged, so fixtureForOhioTrack and the per-track local-form step behave
 * exactly as they did. */
const OH_ROUTE_RULES_FOR_INSTRUCTIONS = { ...OH_CLEAN_TRACK_ROUTE_RULES, ...OH_SECTION_2953_321_ROUTE_RULES };

function fixtureForOhioTrack(trackId, baseFixture) {
  const fixture = JSON.parse(JSON.stringify(baseFixture));
  /*
   * KNOWN_PREFILLS repair. Paragraphs 5, 7 and 8 printed a POINTER in the
   * grammatical slot where the FACT belongs -- "Possession offense shown on the
   * certified disposition", "Disposition shown on the certified disposition",
   * and, worst, this build's own non-certification sentence inside the pleading's
   * eligibility allegation. The instructions tell the participant to "transfer
   * only reviewed content", and those three sentences carried none of the
   * bracketed marking that makes the other unresolved items self-evidently
   * untransferable. They are now marked exactly the way every other unresolved
   * item on this paper is marked, and each is declared and disclosed as a
   * required-before-filing blank rather than reported as a written fact.
   */
  if (OH_CLEAN_TRACK_ROUTE_RULES[trackId]) {
    const long = baseFixture === customBoundaryFixture;
    fixture.chargeData.chargeDescription = long
      ? "[COMPLETE CHARGE DESCRIPTION, INCLUDING EVERY COUNT AND EVERY STATUTORY SUBSECTION, MUST BE COPIED WORD FOR WORD FROM THE CERTIFIED CHARGING DOCUMENT AND DISPOSITION]"
      : "[CHARGE MUST BE CONFIRMED FROM THE CERTIFIED DISPOSITION]";
    fixture.chargeData.disposition = long
      ? "[COMPLETE DISPOSITION, INCLUDING EVERY COUNT AND THE DISPOSITION OF EACH, MUST BE CONFIRMED FROM THE COURT RECORD AND THE CERTIFIED DISPOSITION]"
      : "[DISPOSITION MUST BE CONFIRMED FROM THE CERTIFIED DISPOSITION]";
    fixture.eligibilityData.eligibilityBasisLabel = long
      ? "[STATUTORY ELIGIBILITY BASIS, INCLUDING THE REMEDY, THE STATUTORY VERSION, THE TIMING AND EVERY LOCAL-PRACTICE CONDITION, MUST BE CONFIRMED AGAINST THE CITED STATUTE AND THE CERTIFIED RECORD]"
      : "[STATUTORY ELIGIBILITY BASIS MUST BE CONFIRMED AGAINST THE CITED STATUTE AND THE CERTIFIED RECORD]";
  }
  if (trackId !== "oh_marijuana_expungement") return fixture;
  fixture.eligibilityData.additionalFacts = [
    ...(fixture.eligibilityData.additionalFacts ?? []),
    "Applicant will attach source evidence identifying the qualifying statutory subsection, the amount where relevant, and that the conviction predates March 20, 2026.",
    "The filing court must independently confirm the 45-to-90-day hearing schedule, prosecutor notice, and any required probation inquiry.",
  ];
  // The same-act schedule paragraph 9 promises. The boundary fixture already
  // carried a vaguer line for it ("Complete same-act charge schedule"); it is
  // replaced here rather than duplicated, so both fixtures name the same
  // document by the section that makes it necessary.
  const sameActSchedule = "Ohio Rev. Code Sec. 2953.61 same-act charge schedule: a written list of every charge arising from the same act as the qualifying conviction (participant must assemble)";
  fixture.attachments = [
    ...(fixture.attachments ?? []).filter((row) => !/same-act charge schedule/i.test(String(row))),
    sameActSchedule,
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
    + `Obtain the current application, caption, filing instructions, fee information, and any proposed-order requirement from ${OH_CLEAN_TRACK_ROUTE_RULES[trackId]?.destinationCourt ?? "the Ohio court that handled the case"}. Transfer only reviewed content to that form. The absence of a catalogued local form is an explicit release blocker.\n\n`
    + `## Hard stops\n\n${definition.hardStops.map((stop) => `- ${stop}`).join("\n")}${memoSection}\n\n`
    + `## Participant-owned acts\n\n`
    + `- The participant signs and dates the local application.\n`
    + `- Do not complete a service certificate before service; this artifact generates none.\n`
    + `- Do not complete judge, clerk, prosecutor, agency, hearing, or order fields.\n`
    + `- The official Ohio BCI request included as companion evidence is a post-order transmission aid, not the primary filing and is not prefilled.\n\n`
    + `Track evidence key: \`${trackId}\`. Commercial and runtime authority remain false.\n`;
}

/*
 * What each composed pleading WRITES and what it leaves BLANK.
 *
 * A composed family has no AcroForm to census, so before this existed it
 * published no production-field-map.json at all and the packet-completeness
 * verifier refused it as unauditable (FAIL_COMPONENT_SET, 0/0 written) -- the
 * COMPONENT_SET obligation vf04 failed. The pleading's terminal fields are the
 * places on the rendered paper where a value goes, and they are the same on
 * every track of this family because every track renders from the same fixture
 * shape and the same renderer branches: six values come off the fixture and are
 * printed, and five places are left for someone else to fill.
 *
 * The rows travel on the completeness contract's declared channel --
 * requiredBeforeFiling as a boolean with an identity and a printed label, or a
 * trusted refusal class -- because prose is read as a policy-shaped excuse.
 */
const COMPOSED_PLEADING_WRITES = [
  { field: "applicantName", factId: "participant.full_legal_name",
    decisionBasis: "printed in the caption and beside the signature rule from partyData.petitionerName" },
  { field: "applicantMailingAddress", factId: "participant.mailing_address",
    decisionBasis: "printed in the parties paragraph and beside the signature rule from partyData.petitionerAddress" },
  { field: "docketNumber", factId: "matter.docket_number",
    decisionBasis: "printed in the caption and the case-history paragraph from caseData.docketNumber" },
  { field: "chargeDescription", factId: "matter.charge",
    decisionBasis: "printed in the case-history paragraph from chargeData.chargeDescription" },
  { field: "disposition", factId: "matter.disposition",
    decisionBasis: "printed in the case-history paragraph from chargeData.disposition" },
  { field: "eligibilityBasisStatement", factId: "eligibility.basis_label",
    decisionBasis: "printed in the eligibility allegations from eligibilityData.eligibilityBasisLabel" },
];

const COMPOSED_PLEADING_BLANKS = [
  { field: "localCourtCaption", factId: "matter.local_court_caption",
    effectiveLabel: "Name of court and local caption",
    requiredBeforeFiling: true,
    reason: "REQUIRED_BEFORE_FILING: the pleading prints “LOCAL CAPTION MUST BE CONFIRMED” because no held source names a statewide Ohio caption; the participant supplies the caption used by the filing court the filing rule in these instructions names, and does not guess." },
  { field: "arrestDate", factId: "matter.arrest_date",
    effectiveLabel: "Date of arrest",
    requiredBeforeFiling: true,
    reason: "REQUIRED_BEFORE_FILING: the pleading prints “[ARREST DATE TO BE CONFIRMED]” because the packet holds no arrest date; the participant reads it off the certified record and does not guess." },
  { field: "dispositionDate", factId: "matter.disposition_date",
    effectiveLabel: "Date of disposition",
    requiredBeforeFiling: true,
    reason: "REQUIRED_BEFORE_FILING: the pleading prints “[DISPOSITION DATE TO BE CONFIRMED]” because the packet holds no disposition date; the participant reads it off the certified record and does not guess." },
  { field: "arrestingAgency", factId: "matter.citing_or_arresting_agency",
    effectiveLabel: "Arresting agency",
    requiredBeforeFiling: true,
    reason: "REQUIRED_BEFORE_FILING: the pleading prints “[ARRESTING AGENCY MUST BE CONFIRMED]” because the packet holds no agency name; the participant reads it off the certified record and does not guess." },
  { field: "dateOfBirthAndSocialSecurityNumber", factId: "participant.identifiers_if_locally_required",
    effectiveLabel: "Date of birth and Social Security Number, if the local court form requires them",
    requiredBeforeFiling: true,
    reason: "REQUIRED_BEFORE_FILING: the pleading carries a note that these identifiers are added by the applicant where the local form or local rule requires them; the packet holds no value for either and writes neither." },
  { field: "applicantSignature",
    refusalClass: "signature_or_date_participant_completion",
    effectiveLabel: "Applicant signature",
    reason: "Signature or date field; never prefilled. The signature rule is left blank and the participant signs it." },
  { field: "signatureDate",
    refusalClass: "signature_or_date_participant_completion",
    effectiveLabel: "Date beside the applicant signature",
    reason: "Signature or date field; never prefilled. The date rule is left blank and the participant dates it when signing." },
];

/*
 * Blanks that exist on one track's paper and not on the others'.
 *
 * Paragraph 9 of the marijuana application promises "the certified disposition
 * and list every charge arising from the same act", and Ohio Rev. Code
 * § 2953.61 is why: where several charges arise from one act, the same-act
 * limitation decides whether the qualifying conviction can be expunged at all.
 * The pleading promised the list and gave the participant nowhere to put it,
 * and no row of the completeness contract named it, so the packet asked for a
 * document it never disclosed. The attachment schedule now names it and this row
 * declares it, on the same channel as every other blank the participant fills.
 */
const OH_CLEAN_TRACK_UNRESOLVED_BLANKS = [
  { field: "chargeDescription", factId: "matter.charge",
    effectiveLabel: "Charge as it appears on the certified disposition",
    requiredBeforeFiling: true,
    reason: "REQUIRED_BEFORE_FILING: the pleading prints \u201c[CHARGE MUST BE CONFIRMED FROM THE CERTIFIED DISPOSITION]\u201d because the packet holds no charge for this matter; the participant copies the charge off the certified disposition and does not guess." },
  { field: "disposition", factId: "matter.disposition",
    effectiveLabel: "Disposition as it appears on the certified disposition",
    requiredBeforeFiling: true,
    reason: "REQUIRED_BEFORE_FILING: the pleading prints \u201c[DISPOSITION MUST BE CONFIRMED FROM THE CERTIFIED DISPOSITION]\u201d because the packet holds no disposition for this matter; the participant copies the disposition off the certified disposition and does not guess." },
  { field: "eligibilityBasisStatement", factId: "eligibility.basis_label",
    effectiveLabel: "Statutory basis alleged for eligibility",
    requiredBeforeFiling: true,
    reason: "REQUIRED_BEFORE_FILING: the pleading prints \u201c[STATUTORY ELIGIBILITY BASIS MUST BE CONFIRMED AGAINST THE CITED STATUTE AND THE CERTIFIED RECORD]\u201d because this packet does not decide eligibility and must not put its own non-certification sentence into a pleading's eligibility allegation; the participant, or a lawyer, states the statutory basis after reading the cited statute against the certified record." },
];

/*
 * Writes this build no longer makes on the four clean Ohio tracks, because the
 * value it had for each was a pointer rather than the fact. They are declared
 * above as required-before-filing blanks instead, on the same channel as every
 * other unresolved item.
 */
const COMPOSED_PLEADING_TRACK_WRITE_SUPPRESSIONS = Object.fromEntries(
  ["oh_2953_32_sealing", "oh_2953_32_expungement", "oh_2953_33_nonconviction", "oh_2953_35_firearm"]
    .map((trackId) => [trackId, OH_CLEAN_TRACK_UNRESOLVED_BLANKS.map((row) => row.field)]),
);

const COMPOSED_PLEADING_TRACK_BLANKS = {
  oh_2953_32_sealing: OH_CLEAN_TRACK_UNRESOLVED_BLANKS,
  oh_2953_32_expungement: OH_CLEAN_TRACK_UNRESOLVED_BLANKS,
  oh_2953_33_nonconviction: OH_CLEAN_TRACK_UNRESOLVED_BLANKS,
  oh_2953_35_firearm: OH_CLEAN_TRACK_UNRESOLVED_BLANKS,
  oh_marijuana_expungement: [
    { field: "sameActChargeSchedule", factId: null,
      effectiveLabel: "Ohio Rev. Code Sec. 2953.61 same-act charge schedule",
      requiredBeforeFiling: true,
      reason: "REQUIRED_BEFORE_FILING: paragraph 9 of this application promises a list of every charge arising from the same act, and Ohio Rev. Code Sec. 2953.61 makes that list decisive for whether the qualifying conviction can be expunged at all. The packet holds no charge list and never guesses one; the attachment schedule names it as a document the participant assembles from the certified record and files with the application." },
  ],
};

function composedFieldMapDocuments(familyId, sourceCensus) {
  const documents = tracksForComposedFamily(familyId).map((trackId) => ({
    documentId: trackId,
    documentRole: "COMPOSED_CUSTOM_PLEADING",
    generatedParticipantArtifact: true,
    fields: [
      ...COMPOSED_PLEADING_WRITES
        .filter((row) => !(COMPOSED_PLEADING_TRACK_WRITE_SUPPRESSIONS[trackId] ?? []).includes(row.field))
        .map((row) => ({ ...row, decision: "candidate_write" })),
      ...[...COMPOSED_PLEADING_BLANKS, ...(COMPOSED_PLEADING_TRACK_BLANKS[trackId] ?? [])].map((row) => ({
        field: row.field, decision: "refuse", factId: row.factId ?? null,
        ...(row.refusalClass ? { refusalClass: row.refusalClass } : {}),
        ...(row.requiredBeforeFiling === true
          ? { blankTreatment: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
            identity: `${trackId} field ${row.field}` }
          : { blankTreatment: null }),
        effectiveLabel: row.effectiveLabel, reason: row.reason,
      })),
    ],
  }));
  // The BCI companion is held as exact source evidence and is never filled, so
  // every one of its measured widgets is refused for that reason rather than
  // left unstated. Same record shape and same reason the official host uses for
  // a render:false document.
  documents.push({
    documentId: OH_BCI.documentId, documentRole: OH_BCI.documentRole,
    generatedParticipantArtifact: false,
    fields: sourceCensus.fields.map((field) => ({
      field: field.name, decision: "refuse", factId: null,
      refusalClass: "source_only_not_generated", blankTreatment: null,
      effectiveLabel: field.effectiveLabel ?? field.name,
      reason: "This companion is held as exact source evidence and is not a generated participant artifact; a blank on a document the participant never receives is never a filing fact of this packet, and nothing is ever written into it.",
      widgets: field.widgets,
    })),
  });
  return documents;
}

/*
 * The disclosure the required-before-filing declarations stand on.
 *
 * A required-before-filing blank is allowed only because the packet TELLS the
 * participant to supply it; without the disclosure it is a required fact nobody
 * was asked for. The per-track instructions state the track's hard stops; this
 * states, for the packet as a whole, every blank the participant must fill and
 * every document they must bring.
 */
/*
 * FIX06, oh_marijuana_expungement-set, obligation SELF_HELP_STOP.
 *
 * The packet ended on a generic "if any of that is unclear, stop and ask a
 * lawyer". This route's own committed record holds nine concrete boundaries,
 * and a participant cannot recognise their own case in a generic sentence. They
 * are transcribed below and then CHECKED against the committed bytes, so the
 * build fails closed rather than drifting quietly if the record changes. They
 * are stated word for word: not shortened, not broadened, not merged, and no
 * sibling Ohio track's conditions are read across.
 */
const OH_MARIJUANA_SELF_HELP_STOPS = [
  "Any question about the exact ORC 2925.11 division, or about the substance or quantity.",
  "Any hashish matter near the fifteen-gram line.",
  "Mixed cases with non-marijuana charges, which trigger ORC 2953.61.",
  "Any disposition on or after March 20, 2026, which is outside the section.",
  "Any incident that produced more than one charge with different dispositions, which triggers ORC 2953.61.",
  "Pending criminal proceedings or open warrants.",
  "Prosecutor objection, and any victim objection where applicable.",
  "Choosing between sealing and expungement, which is a legal judgment with different waits and different exclusions.",
  "Immigration exposure.",
];

function ohMarijuanaSelfHelpStopsSection() {
  const registry = readJson("data/record-clearing/legal-design-track-registry.json");
  const track = (registry.tracks ?? []).find((row) => row.trackId === "oh_marijuana_expungement");
  assert.ok(track, "oh_marijuana_expungement: no committed track registry entry to read stop conditions from");
  assert.deepEqual(track.selfHelpStopConditions, OH_MARIJUANA_SELF_HELP_STOPS,
    "oh_marijuana_expungement: the committed selfHelpStopConditions no longer match the conditions this packet states");
  return `## Where self-help ends\n\n`
    + `This packet does not decide whether you are eligible, and no lawyer has reviewed your case in preparing it. `
    + `**Stop and take your case to an Ohio lawyer or an Ohio legal-aid office, rather than filing, if any of the following is true.** `
    + `Each one is carried word for word from this route's own committed track record — \`data/record-clearing/legal-design-track-registry.json\`, `
    + `track \`oh_marijuana_expungement\`, \`selfHelpStopConditions\` — and each is a point at which this packet stops being enough:\n\n`
    + OH_MARIJUANA_SELF_HELP_STOPS.map((stop) => `- ${stop}`).join("\n")
    + `\n\nThe last of these is not a formality. Ohio expungement has no federal immigration effect, and the record may still be reachable in an immigration proceeding.\n\n`;
}

function composedParticipantInstructions(familyId) {
  const tracks = tracksForComposedFamily(familyId);
  // One entry per statutory section this packet actually pleads. Section-keyed
  // and never read across sections: DET-FEE-AND-WAIVER-001 A3 is per fact and
  // per route, and two tracks pleading Sec. 2953.32 share one row because it is
  // the same section, not because they are siblings.
  const routeRules = [...new Map(tracks
    .filter((trackId) => OH_ROUTE_RULES_FOR_INSTRUCTIONS[trackId])
    .map((trackId) => [OH_ROUTE_RULES_FOR_INSTRUCTIONS[trackId].section, OH_ROUTE_RULES_FOR_INSTRUCTIONS[trackId]]))
    .entries()];
  return `# Ohio custom-pleading packet — participant instructions\n\n`
    + `This packet contains ${tracks.length === 1 ? "one statutory-content draft" : `${tracks.length} statutory-content drafts`} and one unchanged official Ohio BCI request held as post-order companion evidence. The drafts are review artifacts. They are not statewide Ohio court forms and they are not filing-ready.\n\n`
    + `## What you must supply before filing\n\n`
    // Track-scoped blanks are disclosed here too. A required-before-filing row
    // the participant is never told about is an uncollected fact, and the
    // completeness verifier counts it as one.
    + [...new Map([...COMPOSED_PLEADING_BLANKS, ...tracks.flatMap((trackId) => COMPOSED_PLEADING_TRACK_BLANKS[trackId] ?? [])]
      .map((row) => [row.field, row])).values()]
      .filter((row) => row.requiredBeforeFiling === true)
      .map((row) => {
        const why = row.reason.replace(/^REQUIRED_BEFORE_FILING:\s*/, "");
        return `- **${row.effectiveLabel}.** ${why.charAt(0).toUpperCase()}${why.slice(1)}`;
      }).join("\n")
    + `\n\n## What you must obtain\n\n`
    + `- The certified disposition for the case, from the court that handled it.\n`
    + `- Your Ohio BCI criminal-history record.\n`
    /*
     * FIX06, oh_marijuana_expungement-set, obligation REQUIRED_BEFORE_FILING.
     * The two lines above named the two documents but not what the participant
     * has to DO with them, and the held packet manifest is specific about both.
     * Each item below is the packetSet.participantActionRequired entry from
     * data/record-clearing/legal-design-track-registry.json, track
     * oh_marijuana_expungement, in that record's own terms: where the document
     * comes from, which answer it settles, and the money task. Nothing is added
     * to what that record states, and the post-order and hearing acts stay where
     * they are rather than being promoted into a pre-filing list.
     */
    + (tracks.includes("oh_marijuana_expungement")
      ? `- The certified **charging document** — the complaint, indictment or information — as well as the disposition, from the clerk of the sentencing court. Sec. 2953.321 requires evidence that the offence falls within it, and the substance, the quantity and the Ohio Rev. Code Sec. 2925.11 division are what that evidence has to show.\n`
      : "")
    + (routeRules.length > 0
      ? `- The current local application, caption and filing instructions from the court the filing rule below sends you to.\n\n`
      : `- The current local application, caption and filing instructions from the Ohio court that handled the case.\n\n`)
    + (tracks.includes("oh_marijuana_expungement")
      ? `## What you must do with them before you file\n\n`
        + `- **Compare every Ohio case against the BCI record.** Check your answer to "What other Ohio cases do you have, in any court?" against the BCI criminal-history record and correct the packet if they disagree. The BCI record is not a statutory attachment, but it is the only practical way to assemble the full docket that Ohio Rev. Code Sec. 2953.61 makes decisive.\n`
        + `- **Compare the quantity against the charging document.** Check your answer to "How much was involved, according to the charge or the court record?" against the certified disposition and charging document, and correct the packet if they disagree.\n`
        + `- **Have the fifty dollar filing fee, or your indigency showing, ready for the clerk at filing.** The amount and the waiver limb are stated under "What this costs" below.\n\n`
      : "")
    + `## Where this is filed\n\n`
    + (routeRules.length > 0
      ? `The compiled Ohio profile this repository holds, \`src/lib/rcap-engine/compiled/profiles/OH-ohio.json\`, states the filing rule for each route in this packet, and this packet states it rather than sending you to ask for it:\n\n`
        + routeRules.map(([, rule]) => `- **${rule.section}.** ${rule.destination}\n`).join("")
        + `\nOhio has no single mandatory statewide form packet. Get the current application, caption and filing instructions from that court, which may keep different packets for convictions and for non-convictions.\n\n`
      : `In the Ohio court that handled the case. No held source in this packet names a statewide Ohio filing office or a statewide application, so the sentencing court's own clerk is the office that tells you the caption, the form and the filing counter to use.\n\n`)
    + `## What this costs\n\n`
    + (routeRules.length > 0
      /* Attribution follows the record each row was actually read from. The
       * Sec. 2953.321 row's fee-distribution detail is the committed track
       * registry's, not the compiled profile's, and saying otherwise would
       * misdescribe where the participant can go to check it. */
      ? (tracks.includes("oh_marijuana_expungement")
        ? `The compiled Ohio profile and the committed legal-design track registry (\`data/record-clearing/legal-design-track-registry.json\`, track \`oh_marijuana_expungement\`) both state this route's fee, and this packet states it rather than sending you to ask for it:\n\n`
        : `The same compiled Ohio profile carries a fee table keyed by statutory section, and this packet states the row for each route it carries:\n\n`)
        + routeRules.map(([, rule]) => `- **${rule.section}.** ${rule.fee}\n`).join("")
        /* The permitted-additional-local-fee rule is a Sec. 2953.32 / Sec. 2953.35
         * statement and is emitted only where the packet actually carries such a
         * row. Sec. 2953.321 states its own waiver limb in its own row, and no
         * held source extends the up-to-$50 local fee to that section, so a
         * marijuana-only packet must not be told it. */
        + (routeRules.some(([, rule]) => OH_SECTION_2953_321_ROUTE_RULES.oh_marijuana_expungement.section !== rule.section)
          ? `\nThe waiver limb is indigency: where the applicant is indigent, the $50 application fee is not charged. The additional local court fee is permitted up to $50 and is not fixed by the statute, so ask the clerk of the filing court what that court charges and how it takes an indigency affidavit.\n\n`
          : `\n`)
      : `No held source in this packet states a filing fee, states that filing is free, or states a fee-waiver procedure. Ask the clerk of the Ohio court that handled the case what the current filing fee is and whether a waiver (an affidavit of indigency) is available, before you file. This packet does not state an amount because it holds no source for one.\n\n`)
    + `## Who is served\n\n`
    + (routeRules.length > 0
      ? (tracks.includes("oh_marijuana_expungement")
        ? `You serve nobody. On this scheme the court notifies the prosecutor and sets the hearing, and the compiled Ohio profile and the committed track registry both state the mechanism for this route:\n\n`
        : `You serve nobody. On this scheme the court notifies the prosecutor and sets the hearing, and the compiled Ohio profile states the mechanism for each route in this packet:\n\n`)
        + routeRules.map(([, rule]) => `- **${rule.section}.** ${rule.service}\n`).join("")
        + `\nThese drafts generate no certificate of service and you must not complete one. There is no service step for you to perform, so do not go looking for one.\n\n`
      : `No held source in this packet states who must be served or how. Ask the same clerk. These drafts generate no certificate of service, and you must not complete one before service has actually happened.\n\n`)
    + `## You sign; nothing here is signed for you\n\n`
    + `- You sign and date the application. The signature and date rules are left blank on purpose.\n`
    + `- Do not complete judge, clerk, prosecutor, agency, hearing, or order fields.\n`
    + `- The official Ohio BCI request is a post-order transmission aid, not your primary court filing. It is included unchanged and is not prefilled; it is not sent before a signed order exists.\n\n`
    + (tracks.includes("oh_marijuana_expungement") ? ohMarijuanaSelfHelpStopsSection() : "")
    + `## What this packet is not\n\n`
    + `This packet is not legal advice, is not a lawyer, and does not decide whether you are eligible. It does not guarantee any court outcome. Eligibility under the cited Ohio statutes, the same-act limitation in Ohio Rev. Code § 2953.61, waiting periods and every statutory exclusion all require review against the primary authority and your own record before you file. If any of that is unclear, stop and ask a lawyer or an Ohio legal-aid office.\n\n`
    + `Tracks in this packet: ${tracks.map((trackId) => `\`${trackId}\``).join(", ")}. Commercial and runtime authority remain false.\n`;
}

async function buildComposed(familyId) {
  const out = composedOut(familyId);
  // The captain-installed integration record is not generated by any build
  // path, so a reset must not destroy it. Same preservation the official host
  // performs for the same file.
  const wiringFile = abs(`${out}/product-wiring.json`);
  const installedWiring = fs.existsSync(wiringFile) ? fs.readFileSync(wiringFile) : null;
  resetOwnedOutput(out);
  if (installedWiring) fs.writeFileSync(wiringFile, installedWiring);
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
  writeJson(`${out}/production-field-map.json`, {
    schemaVersion: "rcap-production-field-map/v1", familyId,
    commercialAuthority: false, runtimeSelectable: false,
    documents: composedFieldMapDocuments(familyId, sourceCensus),
  });
  writeText(`${out}/participant-instructions.md`, composedParticipantInstructions(familyId));
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
    evidenceFiles: ["source-receipt.json", "production-field-map.json", "participant-instructions.md",
      "reports/rendered-artifacts.json", "build-findings.json"],
    commercialAuthority: false, runtimeSelectable: false,
  });
  console.log(`${familyId}: BUILD PASS, RELEASE STOPPED (${trackReports.length} pleading renders)`);
}

async function checkComposed(familyId) {
  const out = composedOut(familyId);
  for (const file of ["source-receipt.json", "companion/companion-guidance.md",
    "production-field-map.json", "participant-instructions.md",
    "reports/rendered-artifacts.json", "build-findings.json", "approval-request.json"]) {
    assert.ok(fs.existsSync(abs(`${out}/${file}`)), `${familyId}: missing ${file}`);
  }
  const source = resolveSource(OH_BCI);
  const receipt = readJson(`${out}/source-receipt.json`);
  const artifacts = readJson(`${out}/reports/rendered-artifacts.json`);
  const findings = readJson(`${out}/build-findings.json`);
  const approval = readJson(`${out}/approval-request.json`);
  const map = readJson(`${out}/production-field-map.json`);
  assert.equal(map.schemaVersion, "rcap-production-field-map/v1");
  assert.equal(map.familyId, familyId);
  assert.equal(map.commercialAuthority, false);
  assert.equal(map.runtimeSelectable, false);
  assert.deepEqual(map.documents.map((doc) => doc.documentId),
    [...tracksForComposedFamily(familyId), OH_BCI.documentId],
    `${familyId}: field map does not describe every packet document`);
  for (const doc of map.documents) {
    // Only a GENERATED artifact must carry rows. The BCI companion is a flat
    // official PDF with no AcroForm at all -- its measured field count is zero
    // in the family's own source receipt -- and inventing rows for it would
    // describe widgets the document does not have.
    if (doc.generatedParticipantArtifact) {
      assert.ok((doc.fields ?? []).length > 0, `${familyId}/${doc.documentId}: field map document states no fields`);
    }
    for (const row of doc.fields ?? []) {
      assert.ok(["candidate_write", "refuse"].includes(row.decision),
        `${familyId}/${doc.documentId}/${row.field}: unclassified field-map decision`);
    }
  }
  const instructions = fs.readFileSync(abs(`${out}/participant-instructions.md`), "utf8");
  for (const row of COMPOSED_PLEADING_BLANKS.filter((r) => r.requiredBeforeFiling === true)) {
    assert.ok(instructions.includes(row.effectiveLabel),
      `${familyId}: participant-instructions.md never asks the participant for "${row.effectiveLabel}"`);
  }
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
      // Same rule as the build: hash the bytes that are WRITTEN. Hashing the
      // render string here reproduced the pre-newline value and made the
      // checker contradict the report the build had just written -- the same
      // record-disagrees-with-bytes defect on the reading side.
      const textBytes = Buffer.from(renderResult.fullText.endsWith("\n") ? renderResult.fullText : `${renderResult.fullText}\n`);
      assert.equal(sha256(textBytes), report.text.sha256, `${trackId}/${fixtureName}: text drift`);
      assert.equal(sha256(fs.readFileSync(abs(report.text.file))), report.text.sha256, `${trackId}/${fixtureName}: text artifact drift`);
      assert.equal(fs.statSync(abs(report.text.file)).size, report.text.byteLength, `${trackId}/${fixtureName}: text byte drift`);
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
