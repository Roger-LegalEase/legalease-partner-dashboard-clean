#!/usr/bin/env node
// P3 completeness repair for the two West Virginia conviction families.
// The central C11 builder remains the source/census baseline. This owned
// wrapper repairs only final WV packet content and evidence.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { runFamilyById as runBaselineFamily } from "./build-census-v1-ne-setaside-custodial-set.mjs";
import {
  carryDates,
  preserveSourceMetadata
} from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import {
  sanitizeAndFlatten,
  scanBytesForActiveContent
} from "./rcap-official-forms/rcap-active-content.mjs";
import { fitTextToWidget } from "./rcap-official-forms/rcap-text-fitting.mjs";
import { drawnAt, flattenedWidgets } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { extractPathSegments, extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { APPEARANCE_DISPOSITION } from "./rcap-official-forms/rcap-appearance-semantics.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, StandardFonts, rgb } = require("pdf-lib");
const sharp = require("sharp");

const ASSIGNMENT_ID = "P3_WV_CONVICTION_COMPLETENESS";
const BASE_SHA = "33dfea59fe85b9dc86469d12e04fd65c51b480fa";
const DISPATCH_SHA = "4d1408a40eeb77f51bdf18ba35a13db579b21129";
const FIXED_DATE = new Date("2026-01-01T00:00:00Z");
const RASTER_DPI = 72;
const POPPLER = process.env.RCAP_PDFTOPPM || "pdftoppm";
const LANE_OUT = "data/rcap-grade-a/wave-2/p3-wv-conviction-completeness";

const FAMILY_SPECS = Object.freeze({
  "wv_conv_multiple_misdemeanors-set": {
    directory: "data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill",
    chargeCount: 3,
    routeSelection: "MultipleFelonyCB",
    routeSelectionLabel: "multiple-misdemeanor standard waiting-period route",
    beforeUnclassifiedBlanks: 128
  },
  "wv_conv_single_misdemeanor-set": {
    directory: "data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill",
    chargeCount: 1,
    routeSelection: "SingleFelonyCB",
    routeSelectionLabel: "single-misdemeanor standard waiting-period route",
    beforeUnclassifiedBlanks: 272
  }
});

const PROTECTED_C906 = new Set([
  "CertifyName", "CertifyDay", "CertifyMonth", "CertifyYear",
  "ProsecutingAttCounty", "ProsecutingAttAdd", "MagDisposedCharges",
  "MunicipalDisposedCharges", "FirstClassMailCB", "HandDeliveryCB",
  "CertifiedMailCB", "SignDate", "StatePoliceSuperintendent1",
  "OffensesCommittedAt1", "OffensesCommittedAt2", "ChiefLEO1", "ChiefLEO2",
  "ConfinedInstitution1", "ConfinedInstitution2", "CircuitDisposedCharges"
]);

const INSTRUCTION_BY_FIELD = Object.freeze({
  MagCaseNo: "lower-court-case-number",
  PetSocSecno: "ssn-last-four",
  SingleFelonyCompletionDate: "eligibility-date",
  MultipleFelonyCompletionDate: "eligibility-date",
  SingleFelonySatisfiesDate: "eligibility-date",
  MulitipleFelonlySatisfiesDate: "eligibility-date",
  PetitionersCurrentName2: "prior-names-and-aliases",
  VictimsNames1: "victim-information",
  VictimsNames2: "victim-information",
  CurrentOrderCB1: "current-protective-order",
  CurrentOrderCB2: "current-protective-order",
  PriorOrderCB1: "prior-protective-order",
  PriorOrderCB2: "prior-protective-order",
  Verdict1: "verdict-and-punishment",
  Verdict2: "verdict-and-punishment",
  GroundsForExpungement1: "grounds-for-expungement",
  GroundsForExpungement2: "grounds-for-expungement",
  RehabilitationSteps1: "rehabilitation-history",
  RehabilitationSteps2: "rehabilitation-history",
  RehabilitationSteps3: "rehabilitation-history",
  RehabilitationSteps4: "rehabilitation-history",
  RehabilitationSteps5: "rehabilitation-history"
});

const PARTICIPANT_INSTRUCTIONS = `# West Virginia conviction packet — required before filing

The packet has filled only facts already held for this matter. Do not file until every item below is completed on the operative SCA-C906 petition from your own records. Do not guess.

- **Lower-court case number** (\`MagCaseNo\`): add the Magistrate Court case number, if the conviction began there.
- **Social Security number** (\`PetSocSecno\`): add the last four digits requested by SCA-C906.
- **Eligibility date** (\`SingleFelonyCompletionDate\`, \`MultipleFelonyCompletionDate\`, \`SingleFelonySatisfiesDate\`, or \`MulitipleFelonlySatisfiesDate\`): add the correct date for the selected statutory route from the sentence/supervision record.
- **Prior names and aliases** (\`PetitionersCurrentName2\`): add every prior name or alias. If there are none, state that truthfully.
- **Address history** (\`PetitionersOffenseAddress1\`): the current address is prefilled; add every other address from the offense date through today, if any.
- **Victim information** (\`VictimsNames1\`, \`VictimsNames2\`): identify every victim if applicable, or state that no identifiable victim exists if that is true.
- **Current protective/no-contact order** (\`CurrentOrderCB1\`, \`CurrentOrderCB2\`): answer yes or no and attach the order when the form requires it.
- **Prior protective/no-contact order** (\`PriorOrderCB1\`, \`PriorOrderCB2\`): answer yes or no and attach the order when the form requires it.
- **Verdict and punishment** (\`Verdict1\`, \`Verdict2\`): copy the verdict, sentence, and punishment from the court record.
- **Grounds for expungement** (\`GroundsForExpungement1\`, \`GroundsForExpungement2\`): supply your own truthful filing reasons.
- **Rehabilitation history** (\`RehabilitationSteps1\`, \`RehabilitationSteps2\`, \`RehabilitationSteps3\`, \`RehabilitationSteps4\`, \`RehabilitationSteps5\`): supply your own truthful treatment, work, education, or other rehabilitation history.

The participant signature, signature date, verification/notary completion, and the entire certificate of service remain blank and protected. Complete or sign them only at the event and in the manner the form and filing court require. The included SCA-C900 is an instructions/reference component only; do not complete or file its embedded outdated petition instead of SCA-C906.
`;

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (rel, value) => {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};

function sourceRoot() {
  const root = process.env.MASTER_LIBRARY_SOURCE_DIR;
  assert.ok(root, "MASTER_LIBRARY_SOURCE_DIR is required");
  assert.ok(fs.statSync(root).isDirectory(), "MASTER_LIBRARY_SOURCE_DIR is not mounted");
  return root;
}

function fixtureFacts(spec, fixture) {
  const boundary = fixture === "boundary";
  const chargeBase = boundary
    ? "Eligible WV misdemeanor conviction — extended count"
    : "Eligible West Virginia misdemeanor conviction";
  const charges = Array.from({ length: spec.chargeCount }, (_, index) => ({
    case_number: boundary ? `2026-CR-${900123 + index}-EXTENDED` : `24-CR-${String(1234 + index).padStart(6, "0")}`,
    charge: index === 0 ? chargeBase : `${chargeBase} ${index + 1}`,
    arrest_date: "2019-03-08",
    conviction_date: "2019-11-02",
    disposition_date: "2020-01-15"
  }));
  return {
    "participant.full_legal_name": boundary ? "Alexandrina Montgomery-Vandenberg Fitzwilliam" : "Jordan Avery Reyes",
    "participant.street_address": boundary ? "12345 Southwest Grandview Boulevard Northeast Apt 4321-B" : "118 Maple Street",
    "participant.city_state_zip": boundary ? "Long Hollow Crossing, WV 25301-9999" : "Charleston, WV 25301",
    "participant.phone": boundary ? "304-555-0142 x44821" : "304-555-0142",
    "participant.date_of_birth": "1991-04-17",
    "matter.county": "Kanawha County",
    "matter.case_number": charges[0].case_number,
    "matter.arrest_date": charges[0].arrest_date,
    "matter.conviction_date": charges[0].conviction_date,
    "matter.disposition_date": charges[0].disposition_date,
    "screening.prior_relief": "No",
    "matter.charges": charges
  };
}

function c906Values(spec, facts) {
  const dob = facts["participant.date_of_birth"].split("-");
  const charges = facts["matter.charges"];
  const values = new Map([
    ["CircuitCaseNo", ["matter.case_number", facts["matter.case_number"]]],
    ["ConvictionDate", ["matter.conviction_date", facts["matter.conviction_date"]]],
    ["PetAdd1", ["participant.street_address", facts["participant.street_address"]]],
    ["PetAdd2", ["participant.city_state_zip", facts["participant.city_state_zip"]]],
    ["PetDOBDay", ["participant.birth_month", dob[1]]],
    ["PetDOBMonth", ["participant.birth_day", dob[2]]],
    ["PetDOBYear", ["participant.birth_year", dob[0]]],
    ["PetPhoneNum", ["participant.phone", facts["participant.phone"]]],
    ["PetArrestDate", ["matter.arrest_date", facts["matter.arrest_date"]]],
    ["County", ["matter.county", facts["matter.county"].replace(/\s+County$/i, "")]],
    ["PetitionerName1", ["participant.full_legal_name", facts["participant.full_legal_name"]]],
    ["PetitionerName2", ["participant.full_legal_name", facts["participant.full_legal_name"]]],
    ["PetitionersCurrentName1", ["participant.full_legal_name", facts["participant.full_legal_name"]]],
    ["PetitionersOffenseAddress1", ["participant.current_address", `${facts["participant.street_address"]}; ${facts["participant.city_state_zip"]}`]],
    [spec.routeSelection, ["route.selection", spec.routeSelectionLabel]],
    ["ExpungementCB2", ["screening.prior_relief", facts["screening.prior_relief"]]]
  ]);
  charges.forEach((charge, index) => {
    values.set(`Charge${index + 1}`, [`matter.charges[${index}].charge`, charge.charge]);
    values.set(`CaseNo${index + 1}`, [`matter.charges[${index}].case_number`, charge.case_number]);
  });
  if (charges.length === 1) {
    values.set("Charges1", ["matter.charges", `${charges[0].charge} — case ${charges[0].case_number}`]);
  } else {
    values.set("Charges1", ["matter.charges", charges.slice(0, 2).map((c) => c.charge).join("; ")]);
    values.set("Charges2", ["matter.charges", `${charges[2].charge}; case numbers are listed in the complete rows on page 1`]);
  }
  return values;
}

function normalizedRect(rect) {
  return {
    x: rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height)
  };
}

async function renderC906(sourceBytes, sourceRow, censusDoc, spec, fixture) {
  assert.equal(sha256(sourceBytes), sourceRow.sha256, "SCA-C906 source SHA-256 drift");
  const facts = fixtureFacts(spec, fixture);
  const values = c906Values(spec, facts);
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const form = pdf.getForm();
  const writtenFields = new Set();
  const report = [];
  const overlayWrites = [];
  const selectionWrites = [];

  for (const [fieldName, [factId, rawValue]] of values) {
    const censusField = censusDoc.fields.find((field) => field.name === fieldName);
    assert.ok(censusField, `${fieldName}: absent from SCA-C906 census`);
    const handle = form.getField(fieldName);
    if (handle instanceof PDFCheckBox) {
      selectionWrites.push({ fieldName, factId, rawValue, censusField });
      continue;
    }
    overlayWrites.push({ fieldName, factId, rawValue, censusField });
  }

  // The official AcroForm ships malformed text appearances that flatten as
  // stray square glyphs. Suppress every text/control appearance and write text
  // once at the first exact measured rectangle. Checkbox appearances remain,
  // so court-drawn boxes are preserved and only route-known choices are marked.
  const appearanceDispositions = new Map(censusDoc.fields
    .filter((field) => field.type !== "checkbox")
    .map((field) => [field.name, APPEARANCE_DISPOSITION.RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN]));
  const { clean } = await sanitizeAndFlatten(pdf, { writtenFields, appearanceDispositions });
  const overlayFont = await clean.embedFont(StandardFonts.Helvetica);
  for (const { fieldName, factId, rawValue, censusField } of overlayWrites) {
    const rect = normalizedRect(censusField.widgets[0].rect);
    const text = String(rawValue);
    const fit = fitTextToWidget({
      font: overlayFont,
      text,
      rect: { x: rect.x + 1, y: rect.y + 2, width: rect.width - 2, height: rect.height - 2 },
      multiline: false,
      maxFontSize: 10,
      minFontSize: 6
    });
    assert.notEqual(fit.outcome, "refused", `${fieldName}: measured overlay is not legibly fittable`);
    clean.getPage(censusField.widgets[0].page - 1).drawText(fit.lines.join(" "), {
      x: rect.x + 1,
      y: rect.y + 4.5,
      size: fit.fontSize,
      font: overlayFont
    });
    report.push({
      field: fieldName,
      factId,
      kind: "overlay_text",
      value: text,
      rect: censusField.widgets[0].rect,
      fontSize: fit.fontSize,
      outcome: fit.outcome,
      lines: 1
    });
  }
  for (const { fieldName, factId, rawValue, censusField } of selectionWrites) {
    const widget = censusField.widgets[0];
    const rect = normalizedRect(widget.rect);
    const inset = 2;
    const page = clean.getPage(widget.page - 1);
    page.drawLine({
      start: { x: rect.x + inset, y: rect.y + inset },
      end: { x: rect.x + rect.width - inset, y: rect.y + rect.height - inset },
      thickness: 1.2,
      color: rgb(0, 0, 0)
    });
    page.drawLine({
      start: { x: rect.x + inset, y: rect.y + rect.height - inset },
      end: { x: rect.x + rect.width - inset, y: rect.y + inset },
      thickness: 1.2,
      color: rgb(0, 0, 0)
    });
    report.push({
      field: fieldName,
      factId,
      kind: "selection_mark",
      value: String(rawValue),
      rect: widget.rect,
      outcome: "two_diagonal_strokes_inside_measured_source_control",
      drewANewBox: false
    });
  }
  preserveSourceMetadata(pdf, clean);
  carryDates(pdf, clean);
  const bytes = await clean.save({ useObjectStreams: false, updateMetadata: false });
  const active = scanBytesForActiveContent(bytes);
  assert.ok(active.inspectable && active.hits.length === 0, "SCA-C906 repaired artifact has active-content residue");
  return { bytes, report };
}

async function renderReferenceOnly(sourceBytes, sourceRow, censusDoc) {
  assert.equal(sha256(sourceBytes), sourceRow.sha256, "SCA-C900 source SHA-256 drift");
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const appearanceDispositions = new Map(censusDoc.fields
    .filter((field) => field.type !== "checkbox")
    .map((field) => [field.name, APPEARANCE_DISPOSITION.RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN]));
  const { clean } = await sanitizeAndFlatten(pdf, {
    writtenFields: new Set(),
    appearanceDispositions
  });
  preserveSourceMetadata(pdf, clean);
  carryDates(pdf, clean);
  const bytes = await clean.save({ useObjectStreams: false, updateMetadata: false });
  const active = scanBytesForActiveContent(bytes);
  assert.ok(active.inspectable && active.hits.length === 0, "SCA-C900 reference artifact has active-content residue");
  return { bytes, report: [] };
}

function refusalFor(field, spec, formNumber) {
  if (formNumber === "SCA-C900") {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: "Never a filing fact on this route: SCA-C900 is the instructions/reference component and its embedded petition is materially out of date; SCA-C906 is the operative petition."
    };
  }
  if (PROTECTED_C906.has(field.name)) {
    return {
      field: field.name,
      blankDisposition: "PROTECTED_FIELD",
      category: "protected_field",
      reason: "Court, clerk, prosecutor, agency, or hearing field, or a signature/service event field; protected until the responsible actor and event."
    };
  }
  const row = /^(Charge|CaseNo)(\d+)$/.exec(field.name);
  if (row && Number(row[2]) > spec.chargeCount) {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: `Never a filing fact on this route: the fixture contains ${spec.chargeCount} complete offense row(s), so offense row ${row[2]} is unused.`
    };
  }
  const alternateRouteFields = new Set([
    "SingleFelonyCB", "SingleFelonyCompletionDate", "MultipleFelonyCB", "MultipleFelonyCompletionDate",
    "SingleSatisfiedCB", "SingleFelonySatisfiesDate", "MultilpleSatisfiedCB", "MulitipleFelonlySatisfiesDate"
  ]);
  const selectedRouteDate = {
    SingleFelonyCB: "SingleFelonyCompletionDate",
    MultipleFelonyCB: "MultipleFelonyCompletionDate"
  }[spec.routeSelection];
  if (alternateRouteFields.has(field.name) && field.name !== selectedRouteDate) {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: `Never a filing fact on this route: ${spec.routeSelectionLabel} selects ${spec.routeSelection}, not this alternate eligibility branch.`
    };
  }
  if (["PrintForm", "ResetButton", "CoDrop"].includes(field.name)) {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "viewer_control",
      reason: "Viewer UI control; never a filing fact."
    };
  }
  if (field.name === "Charges2" && spec.chargeCount === 1) {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: "Never a filing fact on this route: the complete single-offense description fits the first charge line, so this continuation line is unused."
    };
  }
  if (field.name === "ExpungementCB1") {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: "Never a filing fact on this fixture: the known prior-relief answer is No, so ExpungementCB2 is selected instead."
    };
  }
  const instructionId = INSTRUCTION_BY_FIELD[field.name];
  assert.ok(instructionId, `${field.name}: unfilled SCA-C906 field lacks a closed completeness disposition`);
  return {
    field: field.name,
    blankDisposition: "REQUIRED_BEFORE_FILING",
    category: "required_before_filing",
    participantInstructionId: instructionId,
    reason: `Required before filing and surfaced in participant instructions (${instructionId}); the platform does not invent it.`
  };
}

function selectionMap(censusDoc, writes, refusals, spec, formNumber) {
  const writeByField = new Map(writes.map((write) => [write.field, write]));
  const refusalByField = new Map(refusals.map((refusal) => [refusal.field, refusal]));
  return censusDoc.selectionControls.map((control) => {
    const write = writeByField.get(control.field);
    if (write) {
      return {
        ...control,
        disposition: "selected_route_or_known_fact",
        reason: write.field === spec.routeSelection
          ? `Route-determined selection: ${spec.routeSelectionLabel}.`
          : "Selected from a known case fact held by the fixture."
      };
    }
    const refusal = refusalByField.get(control.field);
    assert.ok(refusal, `${formNumber}/${control.field}: selection control lacks a disposition`);
    return { ...control, disposition: "explicit_refusal", ...refusal };
  });
}

async function byteProof(file, censusDoc, writes, refusals, pageOffset = 0) {
  const appearances = await flattenedWidgets(file);
  const pdf = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const actualWrites = [];
  for (const write of writes) {
    const field = censusDoc.fields.find((row) => row.name === write.field);
    const widget = field.widgets[0];
    const at = drawnAt(appearances, { page: widget.page + pageOffset, rect: widget.rect, tolerance: 3 });
    const overlayText = write.kind === "overlay_text"
      ? extractTextItems(pdf.getPage(widget.page + pageOffset - 1)).filter((item) =>
          item.x >= widget.rect.x - 2 && item.x <= widget.rect.x + widget.rect.width + 2
          && item.y >= widget.rect.y - 2 && item.y <= widget.rect.y + Math.abs(widget.rect.height) + 8
          && String(item.text ?? "").trim().length > 0)
      : [];
    const selectionPaths = write.kind === "selection_mark"
      ? extractPathSegments(pdf.getPage(widget.page + pageOffset - 1)).filter((segment) => {
          const x1 = segment.x;
          const y1 = segment.y;
          const x2 = segment.x + segment.width;
          const y2 = segment.y + segment.height;
          const inside = (x, y) => x >= widget.rect.x - 1 && x <= widget.rect.x + widget.rect.width + 1
            && y >= widget.rect.y - 1 && y <= widget.rect.y + Math.abs(widget.rect.height) + 1;
          return inside(x1, y1) && inside(x2, y2) && segment.paintedBy;
        })
      : [];
    const visible = write.kind === "selection_mark"
      ? selectionPaths.length >= 2
      : write.kind === "overlay_text"
        ? overlayText.length > 0
        : at.some((appearance) => String(appearance.text ?? "").trim().length > 0);
    actualWrites.push({
      field: write.field,
      factId: write.factId,
      kind: write.kind,
      expected: write.value,
      page: widget.page + pageOffset,
      rect: widget.rect,
      flattenedAppearancesReadFromFinalPdfBytes: at,
      overlayTextReadFromFinalPdfBytes: overlayText,
      selectionPathsReadFromFinalPdfBytes: selectionPaths,
      visibleInFinalPdfBytes: visible
    });
  }
  assert.ok(actualWrites.every((write) => write.visibleInFinalPdfBytes), `${file}: a reported write is not visible in final PDF bytes`);
  const protectedWithInk = [];
  for (const refusal of refusals.filter((row) => row.blankDisposition === "PROTECTED_FIELD")) {
    const field = censusDoc.fields.find((row) => row.name === refusal.field);
    const widget = field.widgets?.[0];
    if (!widget) continue;
    const at = drawnAt(appearances, { page: widget.page + pageOffset, rect: widget.rect, tolerance: 3 });
    if (at.some((appearance) => String(appearance.text ?? "").trim().length > 0)) {
      protectedWithInk.push({ field: refusal.field, appearances: at });
    }
  }
  assert.deepEqual(protectedWithInk, [], `${file}: a protected field carries generated text`);
  return { actualWrites, protectedWithInk };
}

async function combinePacket(familyId, fixture, rendered) {
  const packet = await PDFDocument.create();
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  packet.setTitle(`Official-form completeness fixture: ${familyId} (${fixture})`);
  const pageManifest = [];
  let packetPage = 1;
  for (const item of rendered) {
    const doc = await PDFDocument.load(item.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(doc, doc.getPageIndices());
    pages.forEach((page, index) => {
      packet.addPage(page);
      pageManifest.push({
        packetPage: packetPage++,
        formNumber: item.sourceRow.formNumber,
        sourcePage: index + 1,
        sourceSha256: item.sourceRow.sha256
      });
    });
  }
  const bytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
  const active = scanBytesForActiveContent(bytes);
  assert.ok(active.inspectable && active.hits.length === 0, `${familyId}/${fixture}: active-content residue`);
  return { bytes, pageManifest, active };
}

function popplerVersion() {
  const probe = spawnSync(POPPLER, ["-v"], { encoding: "utf8" });
  assert.equal(probe.status, 0, `Poppler is unavailable: ${probe.stderr || probe.stdout}`);
  const version = /pdftoppm\s+version\s+([^\s]+)/i.exec(`${probe.stderr}\n${probe.stdout}`)?.[1];
  assert.ok(version, "Poppler version was not reported");
  return version;
}

async function rasterPacket(pdfFile, rasterDirRel) {
  const rasterDir = path.join(ROOT, rasterDirRel);
  fs.rmSync(rasterDir, { recursive: true, force: true });
  fs.mkdirSync(rasterDir, { recursive: true });
  const doc = await PDFDocument.load(fs.readFileSync(pdfFile), { ignoreEncryption: true, updateMetadata: false });
  const version = popplerVersion();
  const pages = [];
  for (let index = 0; index < doc.getPageCount(); index += 1) {
    const pageNo = index + 1;
    const base = path.join(rasterDir, `page-${String(pageNo).padStart(2, "0")}`);
    const run = spawnSync(POPPLER, [
      "-f", String(pageNo), "-l", String(pageNo), "-singlefile",
      "-r", String(RASTER_DPI), "-png", pdfFile, base
    ], { encoding: "utf8" });
    assert.equal(run.status, 0, `Poppler raster failed: ${run.stderr || run.stdout}`);
    const file = `${base}.png`;
    const bytes = fs.readFileSync(file);
    const metadata = await sharp(file).metadata();
    const { channels } = await sharp(file).greyscale().stats();
    const geometry = doc.getPage(index).getSize();
    const croppedToPage = Math.abs(metadata.width - Math.round(geometry.width * RASTER_DPI / 72)) <= 1
      && Math.abs(metadata.height - Math.round(geometry.height * RASTER_DPI / 72)) <= 1;
    const looksBlank = channels[0].max - channels[0].min <= 6;
    assert.ok(croppedToPage && !looksBlank, `${file}: raster is blank or not cropped to the PDF page`);
    pages.push({
      page: pageNo,
      file: path.relative(ROOT, file),
      sha256: sha256(bytes),
      byteLength: bytes.length,
      widthPx: metadata.width,
      heightPx: metadata.height,
      engine: "poppler_pdftoppm",
      engineDiscoveryMode: process.env.RCAP_PDFTOPPM ? "RCAP_PDFTOPPM" : "PATH",
      engineVersion: version,
      dpi: RASTER_DPI,
      looksBlank,
      croppedToPage
    });
  }
  return { pages, version };
}

function updatedReceipt(receipt) {
  return {
    ...receipt,
    allSourcesExact: receipt.documents.every((document) => document.exactHashVerified === true && document.corpusIndexAgrees === true),
    completenessRepair: {
      assignmentId: ASSIGNMENT_ID,
      controlBaseSha: BASE_SHA,
      dispatchCommit: DISPATCH_SHA,
      sourceCorpusReverified: true,
      sourceBinariesCommitted: false
    }
  };
}

function writeLaneRows() {
  const rows = [];
  for (const [familyId, spec] of Object.entries(FAMILY_SPECS)) {
    const mapPath = path.join(ROOT, spec.directory, "production-field-map.json");
    if (!fs.existsSync(mapPath)) continue;
    const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    if (map.completenessRepair?.assignmentId !== ASSIGNMENT_ID) continue;
    const fieldsNewlyWritten = [];
    const fieldsRepaired = [];
    const blanksNewlyGivenApprovedDisposition = [];
    const requiredBeforeFiling = new Map();
    for (const document of map.maps) {
      for (const write of document.canonicalWrites) {
        const entry = { formNumber: document.formNumber, field: write.field, factId: write.factId, kind: write.kind };
        if (["PetAdd1", "PetAdd2"].includes(write.field) && document.formNumber === "SCA-C906") fieldsRepaired.push(entry);
        else fieldsNewlyWritten.push(entry);
      }
      for (const blank of document.canonicalRefusals) {
        blanksNewlyGivenApprovedDisposition.push({
          formNumber: document.formNumber,
          field: blank.field,
          disposition: blank.blankDisposition,
          reason: blank.reason,
          participantInstructionId: blank.participantInstructionId ?? null
        });
        if (blank.blankDisposition === "REQUIRED_BEFORE_FILING") {
          requiredBeforeFiling.set(blank.participantInstructionId, {
            instructionId: blank.participantInstructionId,
            fields: [
              ...(requiredBeforeFiling.get(blank.participantInstructionId)?.fields ?? []),
              blank.field
            ]
          });
        }
      }
    }
    requiredBeforeFiling.set("address-history", {
      instructionId: "address-history",
      fields: ["PetitionersOffenseAddress1"],
      knownPartialPrefill: true,
      why: "The held current address is written, but the form also requires any other address from the offense date through filing."
    });
    const zeroCounters = {
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
    rows.push({
      itemId: familyId,
      status: "COMPLETED",
      result: "PASS_COMPLETE",
      countersBefore: { ...zeroCounters, unclassifiedBlanks: spec.beforeUnclassifiedBlanks },
      countersAfter: zeroCounters,
      fieldsNewlyWritten,
      fieldsRepaired,
      blanksNewlyGivenApprovedDisposition,
      factsClassifiedRequiredBeforeFiling: [...requiredBeforeFiling.values()],
      commercialRoutesOpened: 0,
      productionTouched: false
    });
  }
  writeJson(`${LANE_OUT}/rows.json`, {
    schemaVersion: "rcap-completeness-repair-return/v1",
    assignmentId: ASSIGNMENT_ID,
    workerBranch: "codex/p3-wv-conviction-completeness",
    baseSha: BASE_SHA,
    dispatchCommit: DISPATCH_SHA,
    rows
  });
}

async function repairFamily(familyId) {
  const spec = FAMILY_SPECS[familyId];
  assert.ok(spec, `unknown P3 WV family: ${familyId}`);
  const receipt = readJson(`${spec.directory}/source-receipt.json`);
  const census = readJson(`${spec.directory}/field-census.census-v1.json`);
  const corpus = sourceRoot();
  const byFixture = { canonical: [], boundary: [] };

  for (const fixture of ["canonical", "boundary"]) {
    for (const sourceRow of receipt.documents) {
      const censusDoc = census.documents.find((document) => document.formNumber === sourceRow.formNumber);
      assert.ok(censusDoc, `${sourceRow.formNumber}: census document missing`);
      const sourceBytes = fs.readFileSync(path.join(corpus, sourceRow.pathInArchive));
      assert.equal(sha256(sourceBytes), sourceRow.sha256, `${sourceRow.formNumber}: source SHA-256 drift`);
      const rendered = sourceRow.formNumber === "SCA-C906"
        ? await renderC906(sourceBytes, sourceRow, censusDoc, spec, fixture)
        : await renderReferenceOnly(sourceBytes, sourceRow, censusDoc);
      byFixture[fixture].push({ ...rendered, sourceRow, censusDoc });
    }
  }

  const artifacts = [];
  const documentProofs = [];
  for (const fixture of ["canonical", "boundary"]) {
    const combined = await combinePacket(familyId, fixture, byFixture[fixture]);
    const fixtureRel = `${spec.directory}/fixtures/${fixture}.pdf`;
    const fixtureFile = path.join(ROOT, fixtureRel);
    fs.mkdirSync(path.dirname(fixtureFile), { recursive: true });
    fs.writeFileSync(fixtureFile, combined.bytes);
    const raster = await rasterPacket(fixtureFile, `${spec.directory}/raster/${fixture}`);
    let pageOffset = 0;
    for (const rendered of byFixture[fixture]) {
      const writes = rendered.report;
      const written = new Set(writes.map((write) => write.field));
      const refusals = rendered.censusDoc.fields
        .filter((field) => !written.has(field.name))
        .map((field) => refusalFor(field, spec, rendered.sourceRow.formNumber));
      const proof = await byteProof(fixtureFile, rendered.censusDoc, writes, refusals, pageOffset);
      documentProofs.push({
        fixture,
        formNumber: rendered.sourceRow.formNumber,
        sourceSha256: rendered.sourceRow.sha256,
        proofMethod: "flattened widget appearances located in final packet PDF bytes at exact source widget rectangles",
        actualWrites: proof.actualWrites,
        protectedFieldsWithInk: proof.protectedWithInk,
        everyReportedWriteVisible: proof.actualWrites.every((write) => write.visibleInFinalPdfBytes)
      });
      pageOffset += rendered.censusDoc.pageGeometry.length;
    }
    artifacts.push({
      fixture,
      file: fixtureRel,
      sha256: sha256(combined.bytes),
      byteLength: combined.bytes.length,
      pageCount: combined.pageManifest.length,
      pageManifest: combined.pageManifest,
      activeContentScan: combined.active,
      rasterEngine: "poppler_pdftoppm",
      rasterEngineDiscoveryMode: process.env.RCAP_PDFTOPPM ? "RCAP_PDFTOPPM" : "PATH",
      rasterEngineVersion: raster.version,
      rasterDpi: RASTER_DPI,
      rasterPages: raster.pages
    });
  }

  const maps = byFixture.canonical.map((canonical) => {
    const boundary = byFixture.boundary.find((item) => item.sourceRow.sha256 === canonical.sourceRow.sha256);
    const canonicalWritten = new Set(canonical.report.map((write) => write.field));
    const boundaryWritten = new Set(boundary.report.map((write) => write.field));
    const canonicalRefusals = canonical.censusDoc.fields
      .filter((field) => !canonicalWritten.has(field.name))
      .map((field) => refusalFor(field, spec, canonical.sourceRow.formNumber));
    const boundaryRefusals = boundary.censusDoc.fields
      .filter((field) => !boundaryWritten.has(field.name))
      .map((field) => refusalFor(field, spec, boundary.sourceRow.formNumber));
    return {
      formNumber: canonical.sourceRow.formNumber,
      documentPolicy: canonical.sourceRow.formNumber === "SCA-C900"
        ? {
            mode: "reference_only_no_fill",
            reason: "SCA-C900 is the instructions/reference component; its embedded petition is materially out of date and SCA-C906 is operative.",
            captionOnly: false,
            documentAcceptsFill: false
          }
        : { mode: "participant", captionOnly: false, documentAcceptsFill: true },
      structuralClass: canonical.censusDoc.structuralClass,
      explicitMappings: Object.fromEntries(canonical.report.map((write) => [write.field, write.factId])),
      roleRefusals: [],
      selectionControls: selectionMap(canonical.censusDoc, canonical.report, canonicalRefusals, spec, canonical.sourceRow.formNumber),
      offeredAnchors: null,
      protectedRules: null,
      canonicalWrites: canonical.report,
      canonicalRefusals,
      boundaryWrites: boundary.report,
      boundaryRefusals
    };
  });

  const actualArtifacts = artifacts.map((artifact) => {
    const proofs = documentProofs.filter((proof) => proof.fixture === artifact.fixture);
    const finalWrites = proofs.flatMap((proof) => proof.actualWrites);
    const glyphs = finalWrites.filter((write) => write.kind === "overlay_text" && write.visibleInFinalPdfBytes).length;
    const appearances = finalWrites.filter((write) => !["overlay_text", "selection_mark"].includes(write.kind) && write.visibleInFinalPdfBytes).length;
    const paintedSelections = finalWrites.filter((write) => write.kind === "selection_mark" && write.visibleInFinalPdfBytes).length;
    return {
      fixture: artifact.fixture,
      file: artifact.file,
      sha256: artifact.sha256,
      valuesReportedByFinalizer: finalWrites.length,
      addedGlyphsReadFromOutputBytes: glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: appearances,
      addedSelectionMarksReadFromOutputBytes: paintedSelections,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: null,
      outsideBoxCheck: "No fleet-wide glyph-subtraction claim is made; each generated value and selection is instead localized from final PDF bytes at its exact measured source rectangle.",
      refusedFieldsWithInk: proofs.flatMap((proof) => proof.protectedFieldsWithInk)
    };
  });

  writeJson(`${spec.directory}/source-receipt.json`, updatedReceipt(receipt));
  const product = readJson(`${spec.directory}/product-wiring.json`);
  writeJson(`${spec.directory}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId,
    routeKeys: product.routeKeys,
    routeSelectionId: product.routeSelectionId,
    maps,
    completenessRepair: {
      assignmentId: ASSIGNMENT_ID,
      controlBaseSha: BASE_SHA,
      dispatchCommit: DISPATCH_SHA,
      operativePetition: "SCA-C906",
      referenceOnlyComponent: receipt.documents.some((document) => document.formNumber === "SCA-C900") ? "SCA-C900" : null,
      participantInstructions: `${spec.directory}/participant-instructions.md`
    },
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });
  writeJson(`${spec.directory}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId,
    derivedFromArtifactBytes: true,
    proofSource: "final canonical and boundary PDF bytes",
    documents: documentProofs,
    artifacts: actualArtifacts,
    blockingFindings: []
  });
  writeJson(`${spec.directory}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId,
    renderedFresh: true,
    artifacts,
    everyPageRastered: artifacts.every((artifact) => artifact.rasterPages.length === artifact.pageCount),
    byteDerivedHashes: true,
    completenessRepairAssignment: ASSIGNMENT_ID
  });
  fs.writeFileSync(path.join(ROOT, spec.directory, "participant-instructions.md"), PARTICIPANT_INSTRUCTIONS);
  writeLaneRows();
  console.log(`${familyId}: P3 completeness repair rendered ${artifacts.length} packet fixtures and ${artifacts.reduce((n, artifact) => n + artifact.pageCount, 0)} page rasters`);
}

export async function checkWvFamily(familyId) {
  const spec = FAMILY_SPECS[familyId];
  assert.ok(spec, `unknown P3 WV family: ${familyId}`);
  const receipt = readJson(`${spec.directory}/source-receipt.json`);
  const map = readJson(`${spec.directory}/production-field-map.json`);
  const rendered = readJson(`${spec.directory}/reports/rendered-artifacts.json`);
  const writes = readJson(`${spec.directory}/reports/actual-writes.json`);
  assert.equal(map.completenessRepair.assignmentId, ASSIGNMENT_ID);
  assert.equal(receipt.allSourcesExact, true);
  assert.equal(writes.derivedFromArtifactBytes, true);
  assert.ok(writes.documents.every((document) => document.everyReportedWriteVisible));
  assert.ok(writes.documents.every((document) => document.protectedFieldsWithInk.length === 0));
  assert.equal(rendered.everyPageRastered, true);
  for (const artifact of rendered.artifacts) {
    const bytes = fs.readFileSync(path.join(ROOT, artifact.file));
    assert.equal(sha256(bytes), artifact.sha256);
    assert.equal(bytes.length, artifact.byteLength);
    assert.equal(artifact.rasterPages.length, artifact.pageCount);
    for (const page of artifact.rasterPages) {
      const png = fs.readFileSync(path.join(ROOT, page.file));
      assert.equal(sha256(png), page.sha256);
    }
  }
  const census = readJson(`${spec.directory}/field-census.census-v1.json`);
  for (const document of census.documents) {
    const documentMap = map.maps.find((row) => row.formNumber === document.formNumber);
    for (const partition of [
      [...documentMap.canonicalWrites, ...documentMap.canonicalRefusals],
      [...documentMap.boundaryWrites, ...documentMap.boundaryRefusals]
    ]) {
      assert.equal(partition.length, document.fields.length);
      assert.equal(new Set(partition.map((row) => row.field)).size, document.fields.length);
    }
  }
  console.log(`${familyId}: --check OK (P3 repaired packet)`);
}

export async function runWvFamily(familyId, argv = process.argv.slice(2)) {
  if (argv.includes("--check")) return checkWvFamily(familyId);
  if (argv.some((arg) => arg.startsWith("--"))) {
    throw new Error(`${familyId}: unsupported option ${argv.find((arg) => arg.startsWith("--"))}`);
  }
  await runBaselineFamily(familyId, []);
  await repairFamily(familyId);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(thisFile)) {
  await runWvFamily("wv_conv_multiple_misdemeanors-set");
}
