#!/usr/bin/env node
/**
 * Iowa DCI-76/DCI-77 criminal-history-record-check supporting-action builder.
 *
 * The two official forms and the instruction sheet are one three-page PDF in
 * the held source binary.  DCI-77 is the primary component in the packet
 * contract, DCI-76 is its required billing attachment, and page three is the
 * issuer's instruction sheet.  The source page order is retained exactly.
 *
 * This family prepares identity/contact facts only.  It never requests,
 * receives, stores, inspects, authenticates or fills a returned criminal
 * history record, and it never supplies a release signature, payment, result
 * election or agency result.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { classifyBlank, classifyField, PASS_COUNTERS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const {
  PDFDocument, PDFTextField, PDFDropdown, PDFRadioGroup, PDFCheckBox,
  PDFSignature, PDFName, PDFArray, PDFRawStream, StandardFonts, rgb
} = require("pdf-lib");

const FAMILY_ID = "ia-dci77-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const ROUTE_KEY = "obligation:track-only:IA:ia-dci77";
const TRACK_ID = "ia-dci77";
const PRIMARY_COMPONENT = "ia-dci77-primary-filing-1";
const ATTACHMENT_COMPONENT = "ia-dci77-attachment-2";
const INSTRUCTIONS_COMPONENT = "ia-dci77-instructions-3";
const DCI76_ID = "official-form:DCI-76 Criminal History Record Check Billing Form";
const DCI77_ID = "official-form:DCI-77 Criminal History Record Check Request Form";
const DCI76_FORM = "DCI-76 Criminal History Record Check Billing Form";
const DCI77_FORM = "DCI-77 Criminal History Record Check Request Form";
const SOURCE = Object.freeze({
  sourceId: DCI77_ID,
  sourceIds: [DCI76_ID, DCI77_ID],
  officialFormIds: [DCI76_FORM, DCI77_FORM],
  title: "Iowa Division of Criminal Investigation Criminal History Record Check Billing and Request Forms",
  relativePath: "private/Nationwide Record Clearing/LegalEase Iowa/forms/DCI-76-and-DCI-77__criminal-history-record-check-billing-and-request-forms-fillable__source-2026.pdf",
  recoveryPath: "reference/source-recovery/2026-09-11-wave1/CODEX-CS2-SRC3__IA-DCI77-SET__DCI-77-CRIMINAL-HISTORY-RECORD-CHECK-REQUEST-FORM__321062c91b3d.pdf",
  recoveryRecord: "data/rcap-grade-a/source-wave-integration/SOURCE_RECOVERY_WAVE1_2026-09-11.json",
  sha256: "321062c91b3d9e2c8f255d62d20186352a2b5884e0ccd4310a18a3a073d7f516",
  byteLength: 1076864,
  pageCount: 3,
  fieldCount: 45,
  widgetCount: 54
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const round = (n) => Number(Number(n).toFixed(4));
const abs = (rel) => path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
const writeJson = (rel, value) => {
  const target = abs(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const writeText = (rel, value) => {
  const target = abs(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value.endsWith("\n") ? value : `${value}\n`);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function sourcePath() {
  const candidates = [
    process.env.IA_DCI77_SOURCE,
    process.env.MASTER_LIBRARY_SOURCE_DIR && path.join(process.env.MASTER_LIBRARY_SOURCE_DIR, SOURCE.relativePath),
    path.join(ROOT, SOURCE.recoveryPath)
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`IA DCI-76/DCI-77 source unavailable; tried: ${candidates.join(", ")}`);
  const bytes = fs.readFileSync(found);
  const digest = sha256(bytes);
  if (digest !== SOURCE.sha256 || bytes.length !== SOURCE.byteLength) {
    throw new Error(`IA DCI source drift at ${found}: ${digest}/${bytes.length}`);
  }
  return { absolute: found, bytes };
}

function typeOf(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFSignature) return "signature";
  return field.constructor.name;
}

const LABELS = Object.freeze({
  Results: "Where would you like the results sent? Mail / Fax / Email",
  Results_Notorized: "Notarization election — only when a specific requirement in another country applies",
  Gender: "Gender — M, F or Other (required)",
  DCI_USE_DATE: "FOR DCI USE ONLY — as of date",
  DCI_USE_Criminal_Record: "FOR DCI USE ONLY — criminal record result",
  "DCI_USE_DCI#": "FOR DCI USE ONLY — DCI number",
  DCI_USE_Processed_By: "FOR DCI USE ONLY — processed by",
  DCI_Account_Number: "DCI account number (if applicable)",
  Name_Business_Individual: "Name (business or individual)",
  Mailing_Address: "Mailing address with city/state/zip",
  Phone_Number: "Phone number",
  Fax_Number: "Fax number (phone contact)",
  Email_Address: "Email address",
  Payment: "Payment method — include one method",
  Credit_Card_Number: "Credit or debit card number (when that method is selected)",
  Expiration_Date: "Expiration date (when card payment is selected)",
  Cardholder_Name: "Cardholder's name (when card payment is selected)",
  CSV_Code: "CSV code (when card payment is selected)",
  Check_Number: "Check number (when check payment is selected)",
  Money_Order_Number: "Money order number (when money order payment is selected)",
  Date_af_date: "Date on the billing request",
  Number_Requests: "Number of requests on this billing form",
  Total_Due: "Total due on this billing form",
  Last_Name_1: "Last name for request 1",
  Last_Name_2: "Last name for request 2, if another request is submitted",
  Last_Name_3: "Last name for request 3, if another request is submitted",
  Last_Name_4: "Last name for request 4, if another request is submitted",
  Last_Name_5: "Last name for request 5, if another request is submitted",
  Last_Name_6: "Last name for request 6, if another request is submitted",
  Last_Name_7: "Last name for request 7, if another request is submitted",
  Last_Name_8: "Last name for request 8, if another request is submitted",
  Last_Name_9: "Last name for request 9, if another request is submitted",
  Last_Name_10: "Last name for request 10, if another request is submitted",
  Email_Address2: "Requestor email address",
  Fax_Number2: "Requestor fax number (phone contact)",
  Phone_Number2: "Requestor phone number",
  Mailing_Address2: "Requestor mailing address with city/state/zip",
  Name_Business_Individual2: "Requestor name (business or individual)",
  DCI_Account_Number2: "DCI account number on the request form (if applicable)",
  Last_Name2: "Subject last name (required)",
  First_Name2: "Subject first name (required)",
  Middle_Name2: "Subject middle name (recommended)",
  Date_of_Birth2: "Subject date of birth (required; mm/dd/yyyy)",
  Social_Security_Number2: "Subject Social Security number (recommended)",
  Signature2: "RELEASE AUTHORIZATION SIGNATURE"
});
const SOURCE_LABELS = Object.freeze({
  Mailing_Address: "Mailing address (street/PO Box, city, state, zip code)",
  Fax_Number: "Fax number",
  Mailing_Address2: "Mailing address (street/PO Box, city, state, zip code)",
  Fax_Number2: "Fax number",
  Gender: "GENDER M, F or Other (required)",
  Results_Notorized: "I am required to have the results notarized",
  Results: "I would like the results sent to me by"
});

function pageNumberForWidget(widget, pages) {
  const ref = widget.P?.();
  return pages.findIndex((page) => ref && page.ref === ref) + 1;
}

async function censusOf(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const fields = doc.getForm().getFields().map((field, fieldIndex) => {
    const name = field.getName();
    let sourceValue = null;
    try {
      if (field instanceof PDFTextField) sourceValue = field.getText() ?? "";
      else if (field instanceof PDFDropdown) sourceValue = field.getSelected?.() ?? [];
      else if (field instanceof PDFRadioGroup) sourceValue = field.getSelected?.() ?? [];
    } catch { sourceValue = null; }
    const widgets = field.acroField.getWidgets().map((widget, widgetIndex) => {
      const rect = widget.getRectangle();
      const x1 = rect.x + rect.width;
      const y1 = rect.y + rect.height;
      return {
        widgetIndex,
        page: pageNumberForWidget(widget, pages),
        // pdf-lib exposes several DCI-77 /Rect entries upside down.  The raw
        // source rectangle is retained for custody evidence; the usable
        // measurement passed to the fitter is the ISO-normalized rectangle.
        rect: { x: round(Math.min(rect.x, x1)), y: round(Math.min(rect.y, y1)), width: round(Math.abs(rect.width)), height: round(Math.abs(rect.height)) },
        rawRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        onValue: widget.getOnValue?.()?.encodedName ?? null,
        appearanceState: widget.getAppearanceState?.()?.encodedName ?? null
      };
    });
    return {
      fieldIndex,
      name,
      type: typeOf(field),
      effectiveLabel: LABELS[name] ?? name,
      sourcePrintedLabel: SOURCE_LABELS[name] ?? LABELS[name] ?? name,
      sourceValue,
      widgetCount: widgets.length,
      widgets
    };
  });
  return {
    pageCount: doc.getPageCount(),
    fieldCount: fields.length,
    widgetCount: fields.reduce((sum, field) => sum + field.widgets.length, 0),
    fields,
    widgetRows: fields.flatMap((field) => field.widgets.map((widget) => ({
      fieldIndex: field.fieldIndex,
      fieldName: field.name,
      type: field.type,
      effectiveLabel: field.effectiveLabel,
      ...widget
    })))
  };
}

const WRITES = Object.freeze({
  Name_Business_Individual: "participant.full_legal_name",
  Mailing_Address: "participant.full_mailing_address",
  Phone_Number: "participant.phone",
  Fax_Number: "participant.fax",
  Email_Address: "participant.email",
  Last_Name_1: "participant.last_name",
  Name_Business_Individual2: "participant.full_legal_name",
  Mailing_Address2: "participant.full_mailing_address",
  Phone_Number2: "participant.phone",
  Fax_Number2: "participant.fax",
  Email_Address2: "participant.email",
  Last_Name2: "participant.last_name",
  First_Name2: "participant.first_name",
  Middle_Name2: "participant.middle_name",
  Date_of_Birth2: "participant.date_of_birth",
  Gender: "participant.gender"
});

const REQUIRED_FIELDS = new Set([
  "Date_af_date", "Number_Requests", "Total_Due"
]);
const PAYMENT_FIELDS = new Set([
  "Payment", "DCI_Account_Number", "DCI_Account_Number2", "Credit_Card_Number",
  "Expiration_Date", "Cardholder_Name", "CSV_Code", "Check_Number", "Money_Order_Number"
]);
const NARRATIVE_WRITES = Object.freeze({ Fax_Number: "participant.fax", Fax_Number2: "participant.fax" });
const EXPLICIT_WRITES = Object.freeze(Object.fromEntries(
  Object.entries(WRITES).filter(([field]) => !Object.hasOwn(NARRATIVE_WRITES, field) && field !== "Gender")
));
const OPTIONAL_FIELDS = new Set([
  "Last_Name_2", "Last_Name_3", "Last_Name_4", "Last_Name_5", "Last_Name_6", "Last_Name_7",
  "Last_Name_8", "Last_Name_9", "Last_Name_10", "Social_Security_Number2"
]);
const ELECTION_FIELDS = new Set(["Results", "Results_Notorized"]);
const PROTECTED_FIELDS = new Set([
  "Signature2", "DCI_USE_DATE", "DCI_USE_Criminal_Record", "DCI_USE_DCI#", "DCI_USE_Processed_By"
]);

const requiredSupply = Object.freeze({
  Date_af_date: "Enter the date of this request on the DCI-76 billing form.",
  Number_Requests: "Enter the number of DCI-77 request forms submitted with this billing form.",
  Total_Due: "Calculate and enter the total due at $15.00 for each requested last name."
});

function commonRow(field) {
  return {
    sourceId: field.widgets[0]?.page === 2 ? DCI77_ID : DCI76_ID,
    field: field.name,
    fieldName: field.name,
    effectiveLabel: field.effectiveLabel,
    printedLabel: field.sourcePrintedLabel ?? field.effectiveLabel,
    sourceLabel: field.sourcePrintedLabel ?? field.effectiveLabel,
    documentId: field.widgets[0]?.page === 2 ? DCI77_FORM : DCI76_FORM,
    page: field.widgets[0]?.page ?? null,
    widgets: field.widgets,
    widgetCount: field.widgets.length
  };
}

function mapFor(census) {
  const writes = [];
  const refusals = [];
  for (const field of census.fields) {
    const common = commonRow(field);
    if (Object.hasOwn(WRITES, field.name)) {
      writes.push({ ...common, factId: WRITES[field.name], kind: field.type === "dropdown" ? "dropdown_fact" : "participant_fact", sourceAppearanceWasBlank: true });
      continue;
    }
    if (PROTECTED_FIELDS.has(field.name)) {
      refusals.push({ ...common, refusalClass: "signature_or_date_participant_completion", completenessClass: "PROTECTED_FIELD",
        requiredBeforeFiling: false, routeDetermined: false, role: field.name === "Signature2" ? "participant-protected" : "agency-protected",
        reason: field.name === "Signature2"
          ? "The subject signs the DCI-77 release authorization after reviewing the request; this build never fabricates a signature."
          : "This is an agency-completed DCI field. The DCI records result, date, number and processor after it receives the request." });
      continue;
    }
    if (ELECTION_FIELDS.has(field.name)) {
      refusals.push({ ...common, refusalClass: "participant_sworn_narrative_or_legal_election", completenessClass: "PARTICIPANT_ELECTION_GENUINE",
        requiredBeforeFiling: false, routeDetermined: false, role: "participant-election", isSelectionControl: true,
        reason: field.name === "Results"
          ? "The participant chooses Mail, Fax or Email from the delivery information they can receive; the builder does not infer a delivery election."
          : "The participant marks Yes only when a specific requirement in another country demands notarized results; domestic notarization is not inferred." });
      continue;
    }
    if (field.name === "Payment") {
      refusals.push({ ...common, refusalClass: "participant_sworn_narrative_or_legal_election", completenessClass: "PARTICIPANT_ELECTION_GENUINE",
        requiredBeforeFiling: true, routeDetermined: false, role: "participant-payment-election", isSelectionControl: true,
        reason: "The participant selects one payment method and supplies the matching payment detail; the builder never fabricates payment." });
      continue;
    }
    if (REQUIRED_FIELDS.has(field.name)) {
      refusals.push({ ...common, factId: null, completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
        routeDetermined: false, factAvailable: false, identity: `${field.name} on the DCI-76 billing form`, role: "participant",
        participantMustSupply: requiredSupply[field.name],
        reason: `The participant must complete this billing value before submission: ${requiredSupply[field.name]}` });
      continue;
    }
    if (OPTIONAL_FIELDS.has(field.name)) {
      refusals.push({ ...common, refusalClass: null, requiredBeforeFiling: false, routeDetermined: false, role: "participant-optional",
        reason: "Optional participant-authored content; the platform does not invent it." });
      continue;
    }
    if (PAYMENT_FIELDS.has(field.name)) {
      refusals.push({ ...common, refusalClass: null, requiredBeforeFiling: false, routeDetermined: false, role: "participant-payment-detail",
        reason: "Optional participant-authored content; complete this field only when the printed payment method requires it. The platform does not invent payment details." });
      continue;
    }
    throw new Error(`unclassified IA DCI field ${field.name}`);
  }
  const mappedNames = [...writes, ...refusals].map((row) => row.fieldName);
  assert.equal(new Set(mappedNames).size, census.fields.length, "each of the 45 source fields must be mapped exactly once");
  assert.equal(census.widgetCount, SOURCE.widgetCount, "the 54 source widgets must remain in the census");
  return { writes, refusals };
}

const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.last_name": "Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.gender": "F",
    "participant.full_mailing_address": "412 Walnut Street, Apartment 7, Des Moines, IA 50309",
    "participant.phone": "515-555-0142",
    "participant.fax": "515-555-0143",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Alexandria Catherine Montgomery-Washington",
    "participant.first_name": "Alexandria",
    "participant.middle_name": "Catherine",
    "participant.last_name": "Montgomery-Washington",
    "participant.date_of_birth": "1960-12-31",
    "participant.gender": "Other",
    "participant.full_mailing_address": "1188 Long Meadow Boulevard, Apartment 1407, Council Bluffs, IA 51503-4417",
    "participant.phone": "712-555-0199 ext. 204",
    "participant.fax": "712-555-0188",
    "participant.email": "alexandria.montgomery.washington@example.org"
  }
});

function pageContentDigests(doc) {
  return doc.getPages().map((page, index) => {
    const node = page.node.get(PDFName.of("Contents"));
    const refs = node instanceof PDFArray ? node.asArray() : node ? [node] : [];
    const bytes = Buffer.concat(refs.map((ref) => {
      const obj = doc.context.lookup(ref);
      return obj instanceof PDFRawStream ? Buffer.from(obj.contents) : Buffer.from(String(obj));
    }));
    return { page: index + 1, sha256: sha256(bytes), byteLength: bytes.length, width: page.getWidth(), height: page.getHeight() };
  });
}

function pageText(file, page) {
  const result = spawnSync("pdftotext", ["-f", String(page), "-l", String(page), "-layout", file, "-"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`pdftotext failed for ${file} page ${page}: ${result.stderr}`);
  return result.stdout;
}
const compact = (value) => String(value ?? "").replace(/\s+/g, "").toLowerCase();

async function proveArtifact({ fixture, file, bytes, facts, sourceBytes, census, map, finalizerReport }) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(doc.getPageCount(), SOURCE.pageCount, `${fixture}: output page count changed`);
  assert.equal(doc.getForm().getFields().length, 0, `${fixture}: output retained interactive fields`);
  const flat = await flattenedWidgets(file);
  const pageTexts = Array.from({ length: SOURCE.pageCount }, (_, i) => pageText(file, i + 1));
  const fieldByName = new Map(census.fields.map((field) => [field.name, field]));
  const directWrites = finalizerReport.directWrites ?? [];
  const directByField = new Map(directWrites.map((write) => [write.field, write]));
  const proofs = [];
  for (const write of finalizerReport.written) {
    const field = fieldByName.get(write.field);
    assert.ok(field, `${fixture}: finalizer wrote an uncensused field ${write.field}`);
    const rawValue = facts[write.factId];
    const expected = write.printedValue ?? String(rawValue ?? "");
    const pages = [...new Set(field.widgets.map((widget) => widget.page))];
    const textReadback = pages.map((page) => ({ page, contains: compact(pageTexts[page - 1]).includes(compact(expected)) }));
    const appearances = field.widgets.flatMap((widget) => drawnAt(flat, widget));
    assert.ok(textReadback.every((read) => read.contains), `${fixture}: ${write.field} not found in saved PDF text on every field page`);
    const direct = directByField.get(write.field) ?? null;
    assert.ok(direct || appearances.some((appearance) => compact(appearance.text).includes(compact(expected))), `${fixture}: ${write.field} has no flattened appearance readback`);
    proofs.push({
      field: write.field,
      fieldName: write.field,
      factId: write.factId,
      expected,
      drawnText: direct?.drawnText ?? appearances.map((appearance) => appearance.text).join(" | "),
      page: field.widgets[0]?.page ?? null,
      widgets: field.widgets,
      flattenedAppearances: appearances,
      ...(direct ? { directPageContentWrite: direct } : {}),
      textReadback,
      visibleInArtifactBytes: true,
      everyWidgetVisibleInArtifactBytes: true
    });
  }
  const writableNames = new Set(finalizerReport.written.map((write) => write.field));
  const outside = flat.filter((appearance) => String(appearance.text).trim().length > 0)
    .filter((appearance) => ![...writableNames].some((name) => {
      const field = fieldByName.get(name);
      return field?.widgets.some((widget) => drawnAt([appearance], widget).length > 0);
    }));
  const refusedFieldsWithInk = map.refusals.flatMap((row) => row.widgets.flatMap((widget) =>
    drawnAt(flat, widget).filter((appearance) => String(appearance.text).trim()).map((appearance) => ({ field: row.fieldName, appearance }))));
  assert.equal(refusedFieldsWithInk.length, 0, `${fixture}: refused field carries flattened ink`);
  assert.equal(outside.length, 0, `${fixture}: unexplained flattened ink outside measured writable widgets: ${JSON.stringify(outside)}`);
  const addedGlyphs = proofs.reduce((sum, proof) => sum + compact(proof.drawnText).length, 0);
  return {
    fixture,
    file: path.relative(ROOT, file),
    outputSha256: sha256(bytes),
    byteLength: bytes.length,
    pageCount: doc.getPageCount(),
    finalizerWritten: finalizerReport.written.length,
    finalizerRefused: finalizerReport.refused.length,
    valuesReportedByFinalizer: finalizerReport.expectedValues,
    actualWrites: proofs,
    directWrites,
    written: proofs.map((proof) => proof.field),
    addedGlyphsReadFromOutputBytes: addedGlyphs,
    flattenedWidgetAppearancesReadFromOutputBytes: flat.length,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outside.reduce((sum, a) => sum + compact(a.text).length, 0),
    refusedFieldsWithInk,
    sourcePageCount: sourceBytes ? SOURCE.pageCount : null,
    sourceContentPages: pageContentDigests(await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false })),
    outputContentPages: pageContentDigests(doc)
  };
}

/**
 * The source's Gender control is a PDF dropdown but the shared semantic
 * vocabulary intentionally has no gender fact descriptor.  It is therefore
 * filled through this family-local measured page-content handoff after the
 * common finalizer has flattened the ordinary fields.  The value still comes
 * only from the held fact, uses the exact dropdown widget rectangle, and is
 * read back from the saved bytes below.
 */
async function drawHeldDropdownValue(bytes, census, fieldName, value) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const field = census.fields.find((candidate) => candidate.name === fieldName);
  assert.ok(field?.widgets?.length === 1, `${fieldName}: expected one source dropdown widget`);
  const widget = field.widgets[0];
  const rect = widget.rect;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let fontSize = 10;
  while (fontSize > 6 && font.widthOfTextAtSize(String(value), fontSize) > Math.max(1, rect.width - 4)) fontSize -= 0.25;
  assert.ok(font.widthOfTextAtSize(String(value), fontSize) <= rect.width - 4, `${fieldName}: held value does not fit its measured dropdown rectangle`);
  const x = rect.x + 2;
  const y = rect.y + Math.max(2, (rect.height - fontSize) / 2);
  doc.getPage(widget.page - 1).drawText(String(value), { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
  const emitted = Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
  return {
    bytes: emitted,
    proof: { field: fieldName, factId: WRITES[fieldName], value: String(value), drawnText: String(value), page: widget.page,
      rect, x: round(x), y: round(y), fontSize, visibleInArtifactBytes: true, placement: "measured_page_content_overlay" }
  };
}

async function renderFixture(fixture, facts, sourceBytes, census, map) {
  const unwritableFields = map.refusals.map((row) => row.fieldName);
  const result = await finalizeOfficialForm({
    sourceBytes,
    expectedSha256: SOURCE.sha256,
    census: census.fields,
    facts,
    explicitMappings: EXPLICIT_WRITES,
    unwritableFields,
    narrativeAcrossFields: Object.entries(NARRATIVE_WRITES).map(([field, factId]) => ({ factId, fields: [field] })),
    maxFontSize: 10,
    minFontSize: 6,
    evaluateDeclaredMinimumSize: true,
    alignWidgetFontSizeToFit: true,
    fitTextPerWidget: true,
    fitAppearancesToRect: true,
    normalizeInvertedWidgetRects: true,
    suppressSynthesizedAppearances: true,
    suppressSynthesizedWidgetBorders: true,
    preserveUnwrittenSelectionBackgrounds: true,
    clearSourceCarriedTextValues: ["Number_Requests", "Total_Due"],
    printedDateOrderByField: { Date_of_Birth2: "month_day_year" },
    title: SOURCE.title,
    documentTextLines: []
  });
  const unexpected = result.report.written.filter((row) => !Object.hasOwn(WRITES, row.field));
  assert.equal(unexpected.length, 0, `${fixture}: finalizer wrote an undeclared field ${JSON.stringify(unexpected)}`);
  assert.equal(result.report.unfittable.length, 0, `${fixture}: an asserted held value did not fit ${JSON.stringify(result.report.unfittable)}`);
  const gender = await drawHeldDropdownValue(result.bytes, census, "Gender", facts[WRITES.Gender]);
  result.bytes = gender.bytes;
  result.report.written.push({ field: "Gender", factId: WRITES.Gender, kind: "dropdown_page_overlay", printedValue: facts[WRITES.Gender], outcome: "fit", lines: 1, fontSize: gender.proof.fontSize });
  result.report.expectedValues.push(facts[WRITES.Gender]);
  result.report.directWrites = [gender.proof];
  result.report.outputSha256 = sha256(result.bytes);
  result.report.outputBytes = result.bytes.length;
  const file = path.join(OUT, "fixtures", `${fixture}.pdf`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, result.bytes);
  const proof = await proveArtifact({ fixture, file, bytes: result.bytes, facts, sourceBytes, census, map, finalizerReport: result.report });
  return { ...proof, report: result.report };
}

function participantGuide(map) {
  const required = map.refusals.filter((row) => row.requiredBeforeFiling);
  return `# Iowa DCI criminal-history-record-check packet\n\nThis packet contains the held official three-page combined PDF: the DCI-76 Criminal History Record Check Billing Form, the DCI-77 Criminal History Record Check Request Form, and the DCI instruction page. DCI-77 is the required request form; DCI-76 is the required billing attachment. The forms are kept in the issuer's page order.\n\nLegalEase prefilled only held identity and requestor contact facts. Review every prefilled value against your records. The DCI form requires a first name, last name and exact date of birth for each subject.\n\n## Complete before sending\n\n${required.map((row) => `- **${row.effectiveLabel}** (page ${row.page}): ${row.participantMustSupply}`).join("\n")}\n- **RELEASE AUTHORIZATION SIGNATURE** (page 2): read the DCI-77 authorization and sign it yourself. The DCI form says it is the only approved release authorization form for this purpose. LegalEase never creates this signature.\n- **Payment method** (page 1): select one printed method and provide the matching account, card, check or money-order information. The current source and Iowa DPS Criminal History Record Check Information page state $15 per last name.\n- **Request subject details** (page 2): supply or correct the last name, first name, middle name, exact date of birth and gender. One DCI-77 request form and one $15 fee are required for each last name.\n- **Results delivery** (page 2): choose Mail, Fax or Email, and make sure the matching contact information is usable. If you do not specify a method, the official instruction page says results will be mailed.\n- **Notarized results** (page 2): mark Yes only when a specific requirement in another country makes notarization necessary; it is not automatic for a domestic request.\n- Complete the optional Social Security number only if you choose to provide it.\n\n## Submission and timing\n\nThe official instruction page says to submit the request form(s), one completed billing form and the fee by mail, fax or scan/email, or in person, using the address, fax and email printed on the forms. Do not mix submission modes. Phone requests are not accepted. One billing form may accompany several request forms, but each requested last name still needs its own DCI-77 and its own fee.\n\nThe Iowa Rule 2.81(2) route record requires the returned DCI criminal history check to be dated within 30 days of filing the downstream Iowa section 901C.3 application. Sequence the request and filing so the check remains within that window. The current DPS information confirms the $15-per-last-name amount and the mail, fax, email and in-person methods; confirm the printed contact information before sending.\n\nLegalEase prepares the forms only. You sign, pay and submit them. The Division returns any criminal-history record to you. LegalEase never submits the request and never receives, stores, inspects, authenticates or completes the returned record. Do not send the returned record to LegalEase.\n\n## Stop before filing the downstream application\n\nStop and obtain legal help if the check returns a record you did not disclose, if the check will be more than 30 days old when the section 901C.3 application is filed, or if the release authorization signature is missing. A missing signature may prevent release of a complete record under Iowa Code chapter 692.2. The DCI response does not include other states' records, FBI records or federal Iowa convictions.\n\nThis is a supporting agency request, not an expungement, sealing or other relief packet. It does not decide eligibility and does not guarantee what the Division will return.\n`;
}

function filingGuide() {
  return `# Iowa DCI submission instructions\n\n1. Review the prefilled DCI-76 and DCI-77 pages and correct any identity or contact value that changed.\n2. Use one DCI-77 for each last name requested. Pay $15 for each request. A single DCI-76 billing form may accompany several DCI-77 forms submitted at one time.\n3. Select a payment method on DCI-76 and complete only the fields that method requires.\n4. Sign the DCI-77 release authorization yourself.\n5. Choose a results method (Mail, Fax or Email). Mark notarization only if a specific requirement in another country requires it.\n6. Submit the form set and fee by one method shown on the official pages: mail, fax, scan/email or in person. Phone requests are not accepted. Do not mix methods.\n7. Keep the returned check yourself. The check must be dated within 30 days of filing the downstream Iowa section 901C.3 application.\n\nCurrent processing facts are tied to the held Iowa DPS Criminal History Record Check Information page and the printed DCI instruction page. Confirm the destination and any current agency instruction immediately before submission.\n`;
}

function sourcePageLineage(census, sourcePageContent) {
  const fieldPage = (name) => census.fields.find((field) => field.name === name)?.widgets?.[0]?.page ?? null;
  return [
    { componentId: ATTACHMENT_COMPONENT, role: "attachment", officialFormId: DCI76_FORM, sourcePage: 1, outputPage: 1, sourceFieldPage: fieldPage("Date_af_date"), sourcePageContent: sourcePageContent[0] },
    { componentId: PRIMARY_COMPONENT, role: "primary_filing", officialFormId: DCI77_FORM, sourcePage: 2, outputPage: 2, sourceFieldPage: fieldPage("Last_Name2"), sourcePageContent: sourcePageContent[1] },
    { componentId: INSTRUCTIONS_COMPONENT, role: "instructions", officialFormId: null, sourcePage: 3, outputPage: 3, sourcePageContent: sourcePageContent[2] }
  ];
}

function packetManifest() {
  return {
    schemaVersion: "rcap-packet-set-manifest/v1",
    packetSetId: FAMILY_ID,
    familyId: FAMILY_ID,
    jurisdiction: "IA",
    routeKeys: [ROUTE_KEY],
    routeSelectionId: PRIMARY_COMPONENT,
    compositionMode: "one_combined_official_source_binary_page_order_preserved",
    componentList: [
      { componentId: PRIMARY_COMPONENT, componentType: "primary_filing", required: true, officialFormId: DCI77_FORM, sourceIds: [DCI77_ID], sourceSha256: SOURCE.sha256, sourcePages: [2], outputPages: [2], order: 1 },
      { componentId: ATTACHMENT_COMPONENT, componentType: "attachment", required: true, officialFormId: DCI76_FORM, sourceIds: [DCI76_ID], sourceSha256: SOURCE.sha256, sourcePages: [1], outputPages: [1], order: 2 },
      { componentId: INSTRUCTIONS_COMPONENT, componentType: "instructions", required: true, officialFormId: null, sourceIds: [DCI76_ID, DCI77_ID], sourceSha256: SOURCE.sha256, sourcePages: [3], outputPages: [3], order: 3 }
    ],
    conditionalComponents: [],
    participantActionRequired: [
      { kind: "complete_form", description: "Complete the DCI-76 billing date, request count, total due, payment method and matching payment detail before submission.", requiredBeforeFiling: true },
      { kind: "sign_form", description: "Sign the DCI-77 release authorization as the subject of the request.", requiredBeforeFiling: true },
      { kind: "obtain_record", description: "Submit the forms and fee and retain the returned DCI criminal history check; LegalEase never receives it.", requiredBeforeFiling: true }
    ],
    noAdditionalComponentInvented: true,
    commercialReliefRoute: false,
    supportingActionOnly: true
  };
}

function sourceReceipt(census, absolute, sourcePageContent) {
  return {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    jurisdiction: "IA",
    routeKey: ROUTE_KEY,
    implementationStrategy: "official_pdf_fill",
    allSourcesExact: true,
    sourceIds: SOURCE.sourceIds,
    sourceSha256: SOURCE.sha256,
    sourceByteLength: SOURCE.byteLength,
    sourcePageCount: SOURCE.pageCount,
    bindingMethod: "One held combined official PDF is bound once by full SHA-256; both official-form identities resolve to that single binary.",
    recoveryRecord: SOURCE.recoveryRecord,
    resolvedPath: path.relative(ROOT, absolute),
    sourceIdentity: {
      sourceIds: SOURCE.sourceIds,
      combinedBinary: true,
      sha256: SOURCE.sha256,
      byteLength: SOURCE.byteLength,
      pageCount: SOURCE.pageCount,
      fieldCount: SOURCE.fieldCount,
      widgetCount: SOURCE.widgetCount,
      sourcePageContent
    },
    documents: [{
      sourceIds: SOURCE.sourceIds,
      sourceId: DCI77_ID,
      documentId: DCI77_FORM,
      combinedBinary: true,
      formNumbers: SOURCE.officialFormIds,
      title: SOURCE.title,
      pathInArchive: SOURCE.relativePath,
      recoveryPath: SOURCE.recoveryPath,
      sha256: SOURCE.sha256,
      byteLength: SOURCE.byteLength,
      pageCount: SOURCE.pageCount,
      fieldCount: SOURCE.fieldCount,
      acroFieldCount: SOURCE.fieldCount,
      widgetCount: SOURCE.widgetCount,
      selectedSourcePages: [1, 2, 3],
      componentIds: [PRIMARY_COMPONENT, ATTACHMENT_COMPONENT, INSTRUCTIONS_COMPONENT],
      pageLineage: sourcePageLineage(census, sourcePageContent)
    }],
    custodyClass: "SOURCE_ALREADY_HELD_EXACT_COMBINED_BINARY",
    sourceReadback: {
      sourceSha256: SOURCE.sha256,
      sourceByteLength: SOURCE.byteLength,
      fieldCount: census.fieldCount,
      widgetCount: census.widgetCount,
      pageCount: census.pageCount
    },
    commercialRoutesOpened: 0
  };
}

function productionFieldMap(map, census) {
  return {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    jurisdiction: "IA",
    routeKeys: [ROUTE_KEY],
    routeSelectionId: PRIMARY_COMPONENT,
    implementationStrategy: "official_pdf_fill",
    renderStrategy: "official_pdf_fill",
    structuralClass: "acroform_combined_source_binary",
    componentSet: [PRIMARY_COMPONENT, ATTACHMENT_COMPONENT, INSTRUCTIONS_COMPONENT],
    componentRoutes: { [PRIMARY_COMPONENT]: ROUTE_KEY, [ATTACHMENT_COMPONENT]: ROUTE_KEY, [INSTRUCTIONS_COMPONENT]: ROUTE_KEY },
    componentConditions: {},
    sourceSha256: SOURCE.sha256,
    sourceIds: SOURCE.sourceIds,
    sourceFieldCount: census.fieldCount,
    sourceWidgetCount: census.widgetCount,
    sourcePageCount: census.pageCount,
    supportingActionOnly: true,
    commercialRoutesOpened: 0,
    generationAllowed: false,
    runtimeSelectable: false,
    routeSelectionNote: "This is an Iowa DCI criminal-history record request supporting action. It does not select a relief route, and it does not authorize LegalEase to request or receive the returned record.",
    writes: map.writes,
    refusals: map.refusals,
    maps: [
      { formNumber: DCI76_FORM, sourceId: DCI76_ID, sourceSha256: SOURCE.sha256, sourcePages: [1], writes: map.writes.filter((row) => row.documentId === DCI76_FORM), canonicalRefusals: map.refusals.filter((row) => row.documentId === DCI76_FORM) },
      { formNumber: DCI77_FORM, sourceId: DCI77_ID, sourceSha256: SOURCE.sha256, sourcePages: [2], writes: map.writes.filter((row) => row.documentId === DCI77_FORM), canonicalRefusals: map.refusals.filter((row) => row.documentId === DCI77_FORM) }
    ],
    censusAssertion: "The memo calls this a 45-field form; the held PDF has 45 AcroForm fields and 54 widgets. field-census.census-v1.json records every widget separately.",
    sourcePageLineage: [
      { componentId: ATTACHMENT_COMPONENT, sourcePage: 1, outputPage: 1 },
      { componentId: PRIMARY_COMPONENT, sourcePage: 2, outputPage: 2 },
      { componentId: INSTRUCTIONS_COMPONENT, sourcePage: 3, outputPage: 3 }
    ]
  };
}

function blankReport(map) {
  return {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling: map.refusals.filter((row) => row.requiredBeforeFiling),
    participantElections: map.refusals.filter((row) => row.refusalClass === "participant_sworn_narrative_or_legal_election"),
    protectedBlanks: map.refusals.filter((row) => row.refusalClass === "signature_or_date_participant_completion"),
    optionalParticipantContent: map.refusals.filter((row) => row.role === "participant-optional" || row.role === "participant-payment-detail"),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT_REL}/participant-instructions.md`
  };
}

function componentSummaries(rendered) {
  return rendered.map((artifact) => ({
    fixture: artifact.fixture,
    file: artifact.file,
    sha256: artifact.outputSha256,
    byteLength: artifact.byteLength,
    pageCount: SOURCE.pageCount,
    sourceSha256: SOURCE.sha256,
    components: [
      { componentId: ATTACHMENT_COMPONENT, documentId: DCI76_FORM, sourcePages: [1], outputPages: [1] },
      { componentId: PRIMARY_COMPONENT, documentId: DCI77_FORM, sourcePages: [2], outputPages: [2] },
      { componentId: INSTRUCTIONS_COMPONENT, documentId: null, sourcePages: [3], outputPages: [3] }
    ]
  }));
}

function renderedArtifacts(rendered) {
  const summaries = componentSummaries(rendered);
  return {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentIdentityMode: "exact",
    componentSet: [PRIMARY_COMPONENT, ATTACHMENT_COMPONENT, INSTRUCTIONS_COMPONENT],
    componentConditions: {},
    pdfs: summaries,
    artifacts: summaries,
    packets: summaries.map((summary) => ({
      fixture: summary.fixture,
      file: summary.file,
      sha256: summary.sha256,
      pageCount: summary.pageCount,
      documents: [
        { documentId: DCI76_FORM, formNumber: DCI76_FORM, componentId: ATTACHMENT_COMPONENT, file: summary.file, sourceSha256: SOURCE.sha256, sourcePages: [1], outputPages: [1], pageCount: 1 },
        { documentId: DCI77_FORM, formNumber: DCI77_FORM, componentId: PRIMARY_COMPONENT, file: summary.file, sourceSha256: SOURCE.sha256, sourcePages: [2], outputPages: [2], pageCount: 1 },
        { documentId: "IA DCI official instruction page", componentId: INSTRUCTIONS_COMPONENT, file: summary.file, sourceSha256: SOURCE.sha256, sourcePages: [3], outputPages: [3], pageCount: 1 }
      ],
      pageManifest: [1, 2, 3].map((page) => ({ page, file: summary.file, sourceSha256: SOURCE.sha256, sourcePage: page }))
    })),
    rasterSkipped: true,
    rasterPages: [],
    everyPageRastered: false,
    rasterStatus: "RASTER_PENDING",
    independentVerificationPending: true
  };
}

function focusedSelfTest({ census, map, rendered, sourceReceipt }) {
  const tests = [
    ["exact source SHA and length", sourceReceipt.documents[0].sha256 === SOURCE.sha256 && sourceReceipt.documents[0].byteLength === SOURCE.byteLength],
    ["three source pages", census.pageCount === 3],
    ["45 fields", census.fieldCount === 45],
    ["54 widgets", census.widgetCount === 54 && census.widgetRows.length === 54],
    ["DCI-76 and DCI-77 identities", sourceReceipt.documents[0].sourceIds.includes(DCI76_ID) && sourceReceipt.documents[0].sourceIds.includes(DCI77_ID)],
    ["one combined source binary", sourceReceipt.documents.length === 1 && sourceReceipt.documents[0].combinedBinary !== false],
    ["required page lineage", sourceReceipt.documents[0].pageLineage.length === 3],
    ["canonical and boundary saved", rendered.length === 2 && rendered.every((row) => fs.existsSync(abs(row.file)))],
    ["no payment/result/signature writes", map.writes.every((row) => !PAYMENT_FIELDS.has(row.fieldName) && !ELECTION_FIELDS.has(row.fieldName) && row.fieldName !== "Signature2")],
    ["all mapped source fields", map.writes.length + map.refusals.length === census.fieldCount]
  ];
  const failures = tests.filter(([, pass]) => !pass).map(([name]) => name);
  assert.equal(failures.length, 0, `IA DCI focused self-test failed: ${failures.join(", ")}`);
  return { schemaVersion: "rcap-ia-dci77-focused-self-test/v1", familyId: FAMILY_ID, result: "PASS", tests: tests.map(([name, pass]) => ({ name, pass })) };
}

async function verifyCurrent({ sourceBytes, census, map }) {
  const required = [
    "source-receipt.json", "field-census.census-v1.json", "production-field-map.json", "packet-set-manifest.json",
    "participant-instructions.md", "filing-instructions.md", "reports/actual-writes.json",
    "reports/blanks-left-for-the-participant.json", "reports/completeness-counters.json", "reports/rendered-artifacts.json",
    "fixtures/canonical.pdf", "fixtures/boundary.pdf", "build-status.json"
  ];
  for (const rel of required) assert.ok(fs.existsSync(path.join(OUT, rel)), `missing artifact ${rel}`);
  const receipt = readJson(path.join(OUT_REL, "source-receipt.json"));
  assert.equal(receipt.allSourcesExact, true);
  assert.equal(receipt.documents.length, 1);
  assert.deepEqual(receipt.documents[0].sourceIds, SOURCE.sourceIds);
  assert.equal(receipt.documents[0].sha256, SOURCE.sha256);
  const savedCensus = readJson(path.join(OUT_REL, "field-census.census-v1.json"));
  assert.equal(savedCensus.fieldCount, 45);
  assert.equal(savedCensus.widgetCount, 54);
  assert.equal(savedCensus.widgetRows.length, 54);
  const savedMap = readJson(path.join(OUT_REL, "production-field-map.json"));
  assert.equal(savedMap.writes.length + savedMap.refusals.length, 45);
  const actual = readJson(path.join(OUT_REL, "reports/actual-writes.json"));
  assert.equal(actual.derivedFromArtifactBytes, true);
  assert.equal(actual.documents.length, 2);
  for (const fixture of ["canonical", "boundary"]) {
    const file = path.join(OUT, "fixtures", `${fixture}.pdf`);
    const bytes = fs.readFileSync(file);
    assert.equal(sha256(bytes), actual.documents.find((row) => row.fixture === fixture).outputSha256);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    assert.equal(doc.getPageCount(), 3);
    assert.equal(doc.getForm().getFields().length, 0);
  }
  const focused = readJson(path.join(OUT_REL, "reports/focused-self-test.json"));
  assert.equal(focused.result, "PASS");
  return { checkedArtifacts: required.length, sourceSha256: SOURCE.sha256, fieldCount: 45, widgetCount: 54, fixtures: 2, pageCount: 3 };
}

async function authorCompleteness(map) {
  const savedArgv = process.argv;
  process.argv = [process.execPath, "ia-dci77-completeness-import"];
  let auditFamily;
  try { ({ auditFamily } = await import("./rcap-packet-completeness/verify-packet-completeness.mjs")); }
  finally { process.argv = savedArgv; }
  const audit = auditFamily(OUT_REL, FAMILY_ID);
  if (audit.result !== "PASS_COMPLETE") throw new Error(`IA DCI native completeness refused generated artifacts: ${JSON.stringify(audit)}`);
  const counters = Object.fromEntries(PASS_COUNTERS.map((counter) => [counter, audit.counters[counter]]));
  assert.ok(PASS_COUNTERS.every((counter) => counters[counter] === 0), `IA DCI counters not zero: ${JSON.stringify(counters)}`);
  writeJson(path.join(OUT_REL, "reports/completeness-counters.json"), {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    verifier: "scripts/rcap-packet-completeness/verify-packet-completeness.mjs",
    result: audit.result,
    counters,
    allNineZero: true,
    findings: audit.findings,
    note: "Author-side nonvisual measurement; independent semantic and raster review remain separate gates."
  });
  return audit;
}

async function build({ check = false, noRaster = false } = {}) {
  const { absolute, bytes: sourceBytes } = sourcePath();
  const census = await censusOf(sourceBytes);
  assert.equal(census.pageCount, SOURCE.pageCount, "IA DCI source page count drift");
  assert.equal(census.fieldCount, SOURCE.fieldCount, "IA DCI source field count drift");
  assert.equal(census.widgetCount, SOURCE.widgetCount, "IA DCI source widget count drift: memo field count is not widget count");
  const map = mapFor(census);
  if (check) return { familyId: FAMILY_ID, status: "CHECK_PASS", ...(await verifyCurrent({ sourceBytes, census, map })) };

  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  const sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const sourcePageContent = pageContentDigests(sourceDoc);
  const rendered = [];
  for (const [fixture, facts] of Object.entries(FIXTURES)) rendered.push(await renderFixture(fixture, facts, sourceBytes, census, map));

  const receipt = sourceReceipt(census, absolute, sourcePageContent);
  const fieldCensus = {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    jurisdiction: "IA",
    sourceIds: SOURCE.sourceIds,
    sourceSha256: SOURCE.sha256,
    pageCount: census.pageCount,
    fieldCount: census.fieldCount,
    widgetCount: census.widgetCount,
    fields: census.fields,
    widgetRows: census.widgetRows,
    measurementNote: "The legal-design memo records 45 AcroForm fields. This exact source has 54 widgets; all 54 widget rows are retained here, including every radio option widget."
  };
  const fieldMap = productionFieldMap(map, census);
  const summaries = componentSummaries(rendered);
  const actualWrites = {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    sourceSha256: SOURCE.sha256,
    sourceDocumentCount: 1,
    documents: rendered.map((artifact) => ({
      fixture: artifact.fixture,
      formNumber: DCI77_FORM,
      sourceSha256: SOURCE.sha256,
      outputSha256: artifact.outputSha256,
      byteLength: artifact.byteLength,
      pageCount: artifact.pageCount,
      actualWrites: artifact.actualWrites,
      directWrites: artifact.directWrites,
      finalizerWritten: artifact.finalizerWritten,
      finalizerRefused: artifact.finalizerRefused,
      valuesReportedByFinalizer: artifact.valuesReportedByFinalizer,
      allWritesReadFromOutputBytes: true,
      sourceCarriedValuesCleared: artifact.report.sourceCarriedValuesCleared ?? [],
      addedGlyphsReadFromOutputBytes: artifact.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: artifact.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: artifact.refusedFieldsWithInk,
      allOriginalSourcePagesPresent: artifact.pageCount === SOURCE.pageCount
    })),
    artifacts: rendered.map((artifact) => ({
      fixture: artifact.fixture,
      file: artifact.file,
      sha256: artifact.outputSha256,
      byteLength: artifact.byteLength,
      pageCount: artifact.pageCount,
      valuesReportedByFinalizer: artifact.finalizerWritten,
      addedGlyphsReadFromOutputBytes: artifact.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: artifact.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: artifact.refusedFieldsWithInk,
      written: artifact.written
    })),
    blockingFindings: []
  };
  writeJson(path.join(OUT_REL, "source-receipt.json"), receipt);
  writeJson(path.join(OUT_REL, "field-census.census-v1.json"), fieldCensus);
  writeJson(path.join(OUT_REL, "production-field-map.json"), fieldMap);
  writeJson(path.join(OUT_REL, "packet-set-manifest.json"), packetManifest());
  writeJson(path.join(OUT_REL, "route-contract.json"), {
    schemaVersion: "rcap-route-contract/v1", familyId: FAMILY_ID, routeKey: ROUTE_KEY,
    routeType: "supporting_action", outputStrategy: "official_pdf_fill", legalRelief: false,
    destination: "Iowa Department of Public Safety, Division of Criminal Investigation",
    commercialRoutesOpened: 0, participantSubmissionRequired: true,
    returnedRecordOwner: "participant_and_Iowa_DCI", returnedRecordHandledByLegalEase: false
  });
  writeText(path.join(OUT_REL, "participant-instructions.md"), participantGuide(map));
  writeText(path.join(OUT_REL, "filing-instructions.md"), filingGuide());
  writeJson(path.join(OUT_REL, "reports/rendered-artifacts.json"), renderedArtifacts(rendered));
  writeJson(path.join(OUT_REL, "reports/actual-writes.json"), actualWrites);
  writeJson(path.join(OUT_REL, "reports/blanks-left-for-the-participant.json"), blankReport(map));
  writeJson(path.join(OUT_REL, "reports/focused-self-test.json"), focusedSelfTest({ census, map, rendered, sourceReceipt: receipt }));
  writeJson(path.join(OUT_REL, "build-findings.json"), {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    findings: [
      { finding: "The held combined source contains 45 fields and 54 widgets across DCI-76 page 1, DCI-77 page 2 and the official instructions page 3; every widget is censused.", disposition: "source_bound" },
      { finding: "Source-carried Number_Requests=0 and Total_Due=0 are cleared before flattening so the packet does not assert a request count or fee the participant has not supplied.", disposition: "participant_completion" },
      { finding: "Release signature, payment method/details, delivery choice, notarization choice and DCI result fields remain blank or protected for the participant/agency.", disposition: "protected_or_participant_completion" },
      { finding: "The route is a supporting_action only. LegalEase does not submit the request or receive, inspect, authenticate or store a returned criminal-history record.", disposition: "scope_restriction" },
      { finding: "The memo's fee/method refresh is a nonblocking research note; the current Iowa DPS information page and exact printed source instructions agree on $15 per last name and mail, fax, email or in-person submission.", disposition: "current_process_note" }
    ],
    blockers: [],
    visualMeasurements: null
  });
  writeJson(path.join(OUT_REL, "approval-request.json"), {
    schemaVersion: "rcap-approval-request/v1", familyId: FAMILY_ID, status: "PENDING_INDEPENDENT_REVIEW",
    sourceSha256: SOURCE.sha256, artifactHashes: summaries, rasterStatus: "RASTER_PENDING", selfApproved: false, approvedForLive: false
  });
  writeJson(path.join(OUT_REL, "reports/independent-visual-review.json"), {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID, status: "PENDING", measured: false,
    result: null, evidence: null, note: "This no-raster build records no visual approval."
  });
  writeJson(path.join(OUT_REL, "reports/completeness-counters.json"), {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    result: "PENDING_NATIVE_AUDIT", counters: Object.fromEntries(PASS_COUNTERS.map((counter) => [counter, null])), allNineZero: false,
    note: "Written before the native author-side audit. The builder replaces this file after audit."
  });
  const audit = await authorCompleteness(map);
  const counters = audit.counters;
  writeJson(path.join(OUT_REL, "build-status.json"), {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID, status: "qa_review_pending", routeKey: ROUTE_KEY,
    packetsBuilt: 2, sourcesExact: true, fieldCount: SOURCE.fieldCount, widgetCount: SOURCE.widgetCount,
    counters, rasterStatus: "RASTER_PENDING", noLocalRasterRequested: noRaster,
    approvedForLive: false, commercialRoutesOpened: 0, supportingActionOnly: true
  });
  const verified = await verifyCurrent({ sourceBytes, census, map });
  return {
    familyId: FAMILY_ID, status: "BUILT", directory: OUT_REL, routeKeys: [ROUTE_KEY],
    componentIds: [PRIMARY_COMPONENT, ATTACHMENT_COMPONENT, INSTRUCTIONS_COMPONENT],
    counters, packetsBuilt: 2, pageCount: SOURCE.pageCount, fieldCount: SOURCE.fieldCount, widgetCount: SOURCE.widgetCount,
    rasterStatus: "RASTER_PENDING", artifacts: summaries, verified
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  const args = new Set(process.argv.slice(2));
  build({ check: args.has("--check"), noRaster: args.has("--no-raster") || process.env.RCAP_NO_LOCAL_RASTER === "1" })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.stack ?? error); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL, SOURCE, WRITES, mapFor, censusOf };
