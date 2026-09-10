#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import {
  normalizeWidgetRectangles, baselineInk, proveDeliveredInk
} from "./rcap-official-forms/delivered-ink-measurement.mjs";
import { assertPrintedSourceInkSurvives, measurePrintedSourceInkSurvival, DEFAULT_RECT_TOLERANCE_PTS } from "./rcap-official-forms/printed-source-ink-survival.mjs";
import {
  CR65_PRINTED_ELECTIONS, assertCR65PrintedElections, cr65QuotedElectionLines,
  CR65_SECOND_BRANCH_ONLY, CR65_SECOND_BRANCH_CONDITION
} from "./rcap-official-forms/cr65-printed-elections.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFTextField, PDFName, PDFNumber, PDFArray, StandardFonts, StandardFontEmbedder, rgb } = require("pdf-lib");
import os from "node:os";
import { execFileSync } from "node:child_process";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const MEMO_PATH = "data/record-clearing/legal-design-intake/AL.memo.json";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

/*
 * Pinned page counts, so the packet-to-source page map the pixel guard walks
 * cannot silently go wrong, and the number of inverted widget rectangles each
 * pinned binary carries, so the flatten repair cannot quietly grow.
 *
 * CR-65 Rev. 10/2024 stores Check Box10.2's /Rect as
 * [45.317, 623.137, 56.5341, 608.779] -- upper-left / lower-right rather than
 * lower-left / upper-right. It is the only inverted rectangle in either binary,
 * out of 216 widgets.
 */
const SOURCE_PAGE_COUNTS = { "CR-65": 8, "C-10-CRIMINAL": 3 };
const EXPECTED_INVERTED_RECTS = { "CR-65": 1, "C-10-CRIMINAL": 0 };

const SOURCES = [
  { documentId: "CR-65", sourceId: "official-form:CR-65", path: "LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf", sha256: "c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39", componentKinds: ["primary_filing", "certificate_of_service"] },
  { documentId: "C-10-CRIMINAL", sourceId: "official-form:C-10-CRIMINAL", path: "STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf", sha256: "527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8", componentKinds: ["fee_waiver"] }
];

const FAMILY_CONFIG = {
  "al-diversion-set": { selected: ["Check Box8.5"], routeSummary: "Misdemeanor or violation charge dismissed after successful completion of an approved diversion or court program; the form's one-year and prior-expungement conditions still must be confirmed." },
  "al-felony-dwop-set": {
    trackId: "al-felony-dwop",
    selected: ["Check Box10.3"],
    routeSummary: "Felony charge dismissed without prejudice more than five years ago, not refiled, with the form's conviction-free condition.",
    /*
     * The route-specific comparison, quoting the condition CR-65 itself prints
     * next to the box this packet selects. The durations are the form's own
     * words -- AL.memo.json states both clocks abstractly ("As set by
     * § 15-27-2(a)(7)"), so the five-year figures are cited to the printed form
     * rather than to the memo, and nothing here invents a period neither holds.
     */
    recordComparison: "Read the certified local record against the condition CR-65 prints beside the box this packet selected: \"the charge was dismissed without prejudice more than five years ago, has not been refiled, and [you] have not been convicted of any other felony or misdemeanor crime, any violation, or any traffic violation, excluding minor traffic violations, during the previous five years.\" Confirm the dismissal was without prejudice, confirm the dismissal date, confirm the charge has not been refiled, and confirm both five-year periods. Correct the selection if the record says otherwise, and stop if the record does not establish every part of it."
  },
  "al-felony-nonconviction-90-set": { selected: [], routeSummary: "Felony nonconviction route after the applicable 90-day period. The participant must select the exact outcome printed in Section III; the route family does not determine whether it was dismissal with prejudice, no-bill, acquittal, or unconditional nolle prosequi." },
  "al-misd-conviction-set": { selected: ["Check Box9.2", "Check Box9.3", "Check Box9.4", "Check Box9.5", "Check Box9.6", "Check Box9.7", "Check Box9.8"], routeSummary: "Qualifying misdemeanor, violation, traffic, municipal, or misdemeanor youthful-offender conviction after all seven Section II conditions." },
  "al-misd-dwop-set": { selected: ["Check Box8.6"], routeSummary: "Misdemeanor or violation charge dismissed without prejudice more than one year ago, not refiled, with the form's two-year conviction-free condition." },
  "al-pardoned-felony-set": { selected: ["Check Box10.6", "Check Box11.0", "Check Box11.1", "Check Box11.2", "Check Box11.3", "Check Box11.4", "Check Box11.5", "Check Box11.6"], routeSummary: "Pardoned felony route after the pardon and every Section V condition. Attach the certificate of pardon." }
};

const FIXTURES = {
  canonical: {
    first: "Jordan", middle: "Avery", last: "Reyes", full: "Jordan Avery Reyes",
    street: "412 Magnolia Avenue", cityStateZip: "Montgomery, AL 36104", email: "jordan.reyes@example.org",
    phone: "334-555-0142", dob: "06/14/1988", caseNumber: "CC-2021-004217", county: "Montgomery",
    charge: "The charge shown on the certified case record", grounds: "See the selected statutory route and attached certified records",
    arrestAgency: "Agency shown on the certified arrest record", detentionAgency: "None beyond the agency listed above"
  },
  boundary: {
    first: "Alexandria", middle: "Catherine", last: "Montgomery-Washington", full: "Alexandria Catherine Montgomery-Washington",
    street: "1188 Martin Luther King Junior Boulevard Apartment 1407", cityStateZip: "Birmingham, AL 35203-4417",
    email: "alexandria.montgomery.washington@example.org", phone: "205-555-0199", dob: "12/31/1979",
    caseNumber: "CC-2024-000001.99", county: "Jefferson",
    charge: "The complete charge exactly as printed on the certified disposition",
    grounds: "See the selected statutory route and all attached certified records",
    arrestAgency: "Law-enforcement agency identified on the certified arrest record",
    detentionAgency: "Every booking, detention, and records-holding agency identified by the participant"
  }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, INDEX_PATH), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, absolute, bytes, byteLength: bytes.length };
  });
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

const REQUIRED_LABELS = {
  "CR-65:Text2": "Last four digits of your Social Security Number",
  "CR-65:COUNTY and it was given Court Case Number": "County where any previous expungement was filed",
  "CR-65:was     granted": "Court case number of any previous expungement",
  "C-10-CRIMINAL:undefined_2": "Your monthly gross income",
  "C-10-CRIMINAL:undefined_3": "Your spouse's monthly gross income, unless this is a marital offense",
  "C-10-CRIMINAL:undefined_4": "Your other monthly earnings, including commissions, bonuses, and interest",
  "C-10-CRIMINAL:undefined_5": "Combined monthly income of other household members",
  "C-10-CRIMINAL:undefined_6": "Monthly unemployment, workers' compensation, Social Security, retirement, or similar income",
  "C-10-CRIMINAL:undefined_7": "Child support or alimony received each month",
  "C-10-CRIMINAL:undefined_8": "Other monthly income amount",
  "C-10-CRIMINAL:undefined_9": "Total monthly gross income (item 3a)",
  "C-10-CRIMINAL:undefined_10": "Monthly rent or mortgage expense",
  "C-10-CRIMINAL:undefined_11": "Total monthly utility expense",
  "C-10-CRIMINAL:undefined_12": "Monthly food expense",
  "C-10-CRIMINAL:undefined_13": "Monthly clothing expense",
  "C-10-CRIMINAL:undefined_14": "Monthly health-care or medical-insurance expense",
  "C-10-CRIMINAL:undefined_15": "Monthly car-payment or transportation expense",
  "C-10-CRIMINAL:undefined_16": "Monthly loan-payment expense",
  "C-10-CRIMINAL:undefined_17": "Monthly credit-card-payment expense",
  "C-10-CRIMINAL:undefined_18": "Monthly educational or employment expense",
  "C-10-CRIMINAL:undefined_19": "Monthly cell-phone expense",
  "C-10-CRIMINAL:undefined_20": "Additional description of other monthly expenses",
  "C-10-CRIMINAL:undefined_21": "Other monthly expense amount",
  "C-10-CRIMINAL:undefined_22": "Monthly-expense subtotal (item 3b)",
  "C-10-CRIMINAL:undefined_23": "Monthly child-support or alimony expense subtotal (item 3c)",
  "C-10-CRIMINAL:undefined_24.0": "Monthly exceptional-expense subtotal (item 3d)",
  "C-10-CRIMINAL:undefined_24.1": "Total monthly expenses (item 3e)",
  "C-10-CRIMINAL:undefined_25": "Total monthly gross income minus total monthly expenses",
  "C-10-CRIMINAL:undefined_26": "Cash, bank funds, stocks, bonds, or certificates of deposit",
  "C-10-CRIMINAL:undefined_27": "Equity in real estate",
  "C-10-CRIMINAL:undefined_28": "Equity in personal property",
  "C-10-CRIMINAL:undefined_29": "Other asset amount",
  "C-10-CRIMINAL:undefined_30": "Value of any other property described",
  "C-10-CRIMINAL:undefined_31": "Total assets",
};

function requiredLabel(documentId, name, page) {
  return REQUIRED_LABELS[`${documentId}:${name}`] ?? `Complete "${name}" on ${documentId} page ${page}`;
}

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  /*
   * CR-65 page 1 Text2 is the SOCIAL SECURITY NUMBER line, not a case number.
   *
   * /^text[1-7]$/ is a rule about the shape of an exported field name, and an
   * official form does not name its fields after the facts they ask for. Six
   * of these seven are the "Court Case Number (Assigned by Clerk)" caption box
   * repeated down the pages; Text2 is the blank that follows the printed
   * "XXX - XX -" on page 1, under the caption "(Social Security Number, Last
   * four digits only)". This repository's own committed field census records
   * it that way -- field-census.census-v1.json gives CR-65 Text2 the effective
   * label "Social Security Number, last four digits only" -- and a 200 dpi
   * raster of the delivered page shows the case number sitting on that line.
   *
   * So every one of these six Alabama packets swore, under penalty of perjury,
   * that the petitioner's Social Security digits were CC-2024-000001.99. All
   * nine counters read zero on it, because the field map called the write a
   * case number and the counters take the field map as their authority.
   *
   * The platform does not hold anyone's Social Security number. It is not
   * collected, it must not be guessed, and it therefore becomes a named blank
   * the participant fills in before filing.
   */
  if (documentId === "CR-65" && key === "text2") return null;
  if (documentId === "CR-65" && /^text[1-7]$/.test(key)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CR-65" && key === "county and it was given court case number") return null;
  if (documentId === "CR-65" && key === "telephone number_2") return null;
  if (documentId === "C-10-CRIMINAL" && key === "text4") return [fixture.dob, "participant.date_of_birth"];
  if (documentId === "C-10-CRIMINAL" && key === "undefined") return [fixture.cityStateZip, "participant.city_state_zip"];
  if (/spouse|employer/.test(key)) return null;
  if (/court case number/.test(key)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CR-65" && key === "name of county") return [fixture.county, "matter.filing_county"];
  if (/^last name$/.test(key)) return [fixture.last, "participant.last_name"];
  if (/^first name$/.test(key)) return [fixture.first, "participant.first_name"];
  if (/^middle name$/.test(key)) return [fixture.middle, "participant.middle_name"];
  if (/full name|printed name of petitioner|print or type name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/street address|complete home address/.test(key)) return [fixture.street, "participant.street_address"];
  if (/city state zip code/.test(key)) return [fixture.cityStateZip, "participant.city_state_zip"];
  if (/email address$/.test(key)) return [fixture.email, "participant.email"];
  if (/telephone number|telephone number cell/.test(key) && !/attorney|server/.test(key)) return [fixture.phone, "participant.phone"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (documentId === "C-10-CRIMINAL" && key === "in the") return ["Circuit", "matter.court_type"];
  if (documentId === "C-10-CRIMINAL" && key === "court of") return [fixture.county, "matter.filing_county"];
  if (documentId === "C-10-CRIMINAL" && key === "v") return [fixture.full, "participant.full_legal_name"];
  return null;
}

function protectedField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "C-10-CRIMINAL" && page >= 3) return true;
  if (documentId === "C-10-CRIMINAL" && page === 2 && ["1", "day of", "undefined_32", "2", "text1"].includes(key)) return true;
  if (documentId === "CR-65" && page === 7) return true;
  if (documentId === "CR-65" && page === 6 && ["text8", "text26", "text9", "text10"].includes(key)) return true;
  return /signature|notary|officer authorized|my commission expires|dated this|^day of$|^date$/.test(key);
}

function attorneyField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "CR-65" && page === 6 && ["city", "state", "zip code", "telephone number_2", "email address_2"].includes(key)) return true;
  return /attorney|state bar|business address of attorney|email address_2|telephone number_2/.test(key);
}

/*
 * The second way a value gets shortened: the box, not the maxLength.
 *
 * Lifting the widget's maximum length was necessary and was not sufficient.
 * None of the 216 fields on these two forms declares a maxLength at all, so the
 * slice above never fired and the guessed "6pt if longer than 36 characters"
 * was the only thing standing between a long value and the widget's own clip
 * path. It was not enough. On the boundary fixture the case number
 * CC-2024-000001.99 measured 72.48pt of Helvetica 8 inside CR-65 page 1 field
 * Text2, whose appearance clips at 65.24pt, so all six Alabama families
 * rendered that petition reading CC-2024-000001.9 -- a different case number,
 * on a document sworn under penalty of perjury. Every one of the nine counters
 * read zero throughout, because the value recorded in the field map was
 * complete; only the ink was short.
 *
 * So the size is measured against the box the value is actually drawn in, with
 * the same Helvetica metrics the appearance stream uses, and stepped down only
 * as far as it has to go. A value that cannot be made to fit legibly fails the
 * build instead of being drawn clipped, because a value a reader will misread
 * is worse than a build that stops.
 */
const FONT_SIZE_LADDER = [8, 7, 6, 5];
const HELVETICA_METRICS = StandardFontEmbedder.for(StandardFonts.Helvetica);

function drawableWidthOf(field) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return null;
  // pdf-lib's generated appearance insets the clip path by 1pt on each side and
  // starts the text 1pt in from the left edge, so this is what the reader sees.
  return widget.getRectangle().width - 2;
}

function safeSet(field, value) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (max && max < value.length) field.removeMaxLength();
  const available = drawableWidthOf(field);
  const size = available === null
    ? 8
    : FONT_SIZE_LADDER.find((candidate) => HELVETICA_METRICS.widthOfTextAtSize(value, candidate) <= available);
  assert.ok(size, `value does not fit its box at ${FONT_SIZE_LADDER[FONT_SIZE_LADDER.length - 1]}pt and must not be drawn clipped: ${field.getName()} = ${value}`);
  field.setFontSize(size);
  field.setText(value);
  return value;
}

async function fillDocument(source, fixtureName, fixture, config, { normalizeRects = true } = {}) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  assert.equal(document.getPageCount(), SOURCE_PAGE_COUNTS[source.documentId],
    `${source.documentId}: pinned page count ${SOURCE_PAGE_COUNTS[source.documentId]} does not match the loaded binary's ${document.getPageCount()}`);
  /*
   * THE FLATTEN REPAIR, BEFORE ANY RECTANGLE IS READ AS AN ORIGIN.
   *
   * PDF 32000-1 7.9.5 lets a /Rect store any two diagonally opposite corners
   * and requires the consumer to normalize it. pdf-lib 1.17.1 does not:
   * PDFArray.asRectangle() takes Rect[0], Rect[1] as the origin unconditionally
   * and PDFForm.flatten() emits translate() from it. On CR-65's Check Box10.2
   * that put the flattened appearance -- `1 g / 0 0 11.2171 14.3578 re / f`, an
   * opaque white fill -- 14.358 pt, exactly one box height, ABOVE the control
   * it belongs to, on top of the running text of eligibility ground (1) in
   * Section III. VF01 found it in the delivered pixels and in the delivered
   * content stream of this family's page 3; the fleet scan in
   * data/rcap-grade-a/packet-factory-24h/INVERTED_WIDGET_RECTANGLES.json names
   * the same widget, rectangle and misplacementPoints y 14.358.
   *
   * Same two corners, spec-required storage order. No appearance stream, no
   * value and no election is touched.
   */
  const rectanglesNormalized = normalizeRects ? normalizeWidgetRectangles(form) : [];
  if (normalizeRects) assert.equal(rectanglesNormalized.length, EXPECTED_INVERTED_RECTS[source.documentId],
    `${source.documentId}: expected ${EXPECTED_INVERTED_RECTS[source.documentId]} inverted widget rectangle(s), normalized ${rectanglesNormalized.length}`);
  const writes = [];
  const refusals = [];
  /*
   * Widget rectangles are captured BEFORE flattening, because flattening
   * removes the widgets and the delivered-ink measurement needs to know where
   * each field was in order to ask whether anything was drawn there. Until this
   * repair this family captured nothing and published four typed literals in
   * place of the answers.
   */
  const boxes = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const id = `${source.documentId}:${name}`;
    const rect = field.acroField.getWidgets()[0]?.getRectangle() ?? null;
    const box = { fieldId: id, fieldName: name, documentId: source.documentId, page, rect };
    if (field instanceof PDFCheckBox) {
      if (source.documentId === "C-10-CRIMINAL" && name === "Check Box1.0") {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: "State of Alabama circuit-court caption branch (selection)", documentId: source.documentId, page, factId: "route.court_caption", isSelectionControl: true, routeDetermined: true });
        boxes.push({ ...box, expectInk: true });
      } else if (source.documentId === "CR-65" && config.selected.includes(name)) {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: `${config.routeSummary} (selection)`, documentId: source.documentId, page, factId: "route.selection", isSelectionControl: true, routeDetermined: true });
        boxes.push({ ...box, expectInk: true });
      } else if (protectedField(source.documentId, name, page)) {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Court or later-completion control: ${name}`, documentId: source.documentId, page, reason: "court, clerk, prosecutor, agency, or hearing field; never prefilled", refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court" });
        boxes.push({ ...box, expectInk: false });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Participant choice: ${name} (selection)`, documentId: source.documentId, page, reason: "A genuine participant election not determined by this route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
        boxes.push({ ...box, expectInk: false });
      }
      continue;
    }
    if (!(field instanceof PDFTextField)) { boxes.push({ ...box, expectInk: false }); continue; }
    const known = knownValue(source.documentId, name, page, fixture);
    if (known && !protectedField(source.documentId, name, page)) {
      const drawnText = safeSet(field, known[0]);
      writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], drawnText });
      boxes.push({ ...box, expectInk: true, expectText: drawnText });
    } else if (protectedField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Signature, court, or later-completion field: ${name}`, documentId: source.documentId, page, reason: "signature or date field; never prefilled", refusalClass: "signature_or_date_participant_completion", role: "protected" });
      boxes.push({ ...box, expectInk: false });
    } else if (attorneyField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Attorney field: ${name}`, documentId: source.documentId, page, reason: "attorney-only; no representation fact is held", role: "attorney" });
      boxes.push({ ...box, expectInk: false });
    } else {
      const label = requiredLabel(source.documentId, name, page);
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: label, documentId: source.documentId, page, reason: "The platform does not hold this participant or case fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
      boxes.push({ ...box, expectInk: false });
    }
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, boxes, rectanglesNormalized };
}

async function buildPacket(sources, fixtureName, fixture, config, baselines, options = {}) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture, config, options)) });
  const packet = await PDFDocument.create();
  const boxes = [];
  let pageCursor = 0;
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
    for (const box of item.boxes) boxes.push({ ...box, packetPage: pageCursor + box.page });
    pageCursor += item.document.getPageCount();
  }
  packet.setTitle(`${config.familyId} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), sources.reduce((sum, source) => sum + filled.find((item) => item.source.documentId === source.documentId).document.getPageCount(), 0));
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  /*
   * NINE COUNTERS, MEASURED. Until this repair this family published
   * `addedGlyphsReadFromOutputBytes: 0`, `nonWhitespaceGlyphsOutsideMeasured
   * WriteBoxes: 0` and `refusedFieldsWithInk: []` as TYPED LITERALS, beside a
   * `flattenedWidgetAppearancesReadFromOutputBytes` that merely republished
   * `packet.writes.length`. VF01 read the same bytes with the factory's own
   * classify-flattened-widget-appearances.mjs and found 403 added glyphs in
   * canonical and 653 in boundary against a published 0. A typed literal is not
   * a measurement and must not be left asserting one -- least of all in a
   * repair that moves ink.
   */
  const proof = baselines ? await proveDeliveredInk(bytes, { boxes }, baselines) : null;
  return { bytes, boxes, proof, pageCount: reopened.getPageCount(), writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}


/*
 * Both guides, generated from the bound legal record rather than retyped.
 *
 * This family was carved out of the shared Alabama host into its own builder,
 * and the guides were carried across as hardcoded template literals. Two things
 * followed from that. The guides stopped being derived from AL.memo.json, so
 * they could not move when the record moved; and one sentence they carried --
 * "Sign the petition under oath before an authorized officer or notary only
 * after every required item and attachment is complete." -- directs a step the
 * record expressly does not establish. AL.memo.json rules.notarization for this
 * track reads "The source review does not state a notarization requirement for
 * CR-65." Directing notarization anyway imposes a step, a cost and a delay on
 * the participant that no source in this packet supports, and contradicted the
 * four sibling Alabama packets built from the same form, which quote that
 * sentence and tell the participant to ask the circuit clerk instead.
 *
 * So the guides are generated here from the memo and bound to its digest, in
 * the same shape the shared host produces: what the record establishes, quoted;
 * a numbered before-you-file sequence; the named blanks; service with its
 * honest residue; notarization as a question for the clerk rather than a
 * direction; and every stop condition the record holds, verbatim.
 */
/*
 * THE ELECTIONS CR-65 MAKES THE PETITIONER MAKE, WHICH THIS GUIDE NEVER NAMED.
 *
 * VF01: "THREE MANDATORY SELECTIONS ARE UNMADE AND THE GUIDE NEVER NAMES ANY OF
 * THEM, AND TWO CONDITIONAL SUB-BLANKS ARE DIRECTED UNCONDITIONALLY."
 *
 * The route is right not to make them. CR-65 page 5's attachment certification,
 * page 6's select-one under the perjury line and page 6's pro se box are
 * genuine participant elections, and the field map refuses all five correctly.
 * But a refusal class is not a disclosure: "Blanks you must fill in" prints
 * only refusals carrying requiredBeforeFiling true, an election is not one, and
 * so the participant was handed a petition with three unmade sworn selections
 * and no page anywhere telling them the selections exist. The guide contained
 * zero occurrences of "Select one", "previously applied", "previously filed",
 * "pro se", "swear" or "perjury".
 *
 * WORSE, AND THIS IS THE PART THAT COULD HAVE MADE SOMEONE SWEAR FALSELY. The
 * blank list opened "Fill every one on both the canonical and the
 * boundary-style packet before filing" and then listed "County where any
 * previous expungement was filed" and "Court case number of any previous
 * expungement" -- the two blanks that exist only on the branch a petitioner who
 * has never filed before is NOT on. A petitioner following the guide as written
 * was told to fill in a prior expungement they do not have, on the page they
 * swear to under penalty of perjury.
 *
 * So the blank list now marks those two with the condition they hang on, and
 * the section below names all three elections, quoting the form. Every quoted
 * line is re-read out of the DELIVERED bytes of both fixtures on every build by
 * assertCR65PrintedElections. Nothing here ticks anything, invents a fact, or
 * tells the participant which way to elect.
 */
function electionsSection() {
  const a = CR65_PRINTED_ELECTIONS.attachments;
  const sw = CR65_PRINTED_ELECTIONS.swornSelectOne;
  const p = CR65_PRINTED_ELECTIONS.proSe;
  return `## Elections on CR-65 that this packet has not made

This packet elects the statutory ground, and nothing else on CR-65. The form
prints further choices that turn on facts this packet does not hold, and the
list above does not name them, because the field map classifies them as
elections rather than as blanks owed before filing. They are still choices the
form makes you make. Every line quoted below was read back out of the delivered
petition at build time, on the page named beside it.

**Page ${a.page} - what you attach.** The form prints:

> ${a.heading}

and three boxes under it:

${a.options.map((line) => `> ${line}`).join("\n>\n")}

All three are blank in this packet, on both fixtures. Tick them yourself to
match what you are actually attaching, following the rule the form prints above
them. The certified records listed under "Do these before you file" are the
documents these boxes certify.

**Page ${sw.page} - the sworn select-one.** Under the printed line

> ${sw.oath}

the form prints

> ${sw.heading}

and offers two boxes. The first reads:

> ${sw.firstBranch}

The second begins:

> ${sw.secondBranchOpening}

and runs on into a blank for the county it was filed in, a blank for its court
case number, and the printed pair

> ${sw.grantedDenied}

Both boxes are blank in this packet, on both fixtures. Tick the one that is true
of you. It sits under the perjury line, so tick it before you sign.

The county, the case number and the granted-or-denied pair belong to the second
box alone. If you tick the first box, leave all three of them empty - that is
why they are listed above marked "${CR65_SECOND_BRANCH_CONDITION}".

**Page ${p.page} - the pro se box.** Beside the signature line the form prints:

> ${p.line}

It is blank in this packet, and this packet writes nothing into the attorney
block beside it, because it holds no representation fact for you.`;
}

function writeGuides({ out, familyId, config, rules, track, memoDigest, required }) {
  const secondBranchOnly = new Set(CR65_SECOND_BRANCH_ONLY);
  const requiredList = required.map((row) =>
    `- ${row.effectiveLabel}${secondBranchOnly.has(row.fieldId) ? ` - ${CR65_SECOND_BRANCH_CONDITION}` : ""}`).join("\n");
  const provenance = [
    "Every quoted line below is taken verbatim from the Alabama legal-design record",
    `\`${MEMO_PATH}\`, track \`${config.trackId}\` (sha256 ${memoDigest}).`,
    "Where that record does not establish something, this packet says so rather than guessing."
  ].join(" ");
  const heldRecord = [
    `- Where to file: "${rules.filing}"`,
    `- Filing fee: "${rules.fees}"`,
    `- Fee waiver: "${rules.feeWaiver}"`,
    `- Notice: "${rules.notice}"`,
    `- Service: "${rules.service}"`,
    `- Who signs: "${rules.participantSignature}"`,
    `- Notarization: "${rules.notarization}"`
  ].join("\n");
  const beforeFiling = [
    ...(track.supportingDocuments ?? []).map((doc, index) =>
      `${index + 1}. Obtain: ${doc.name}. Where from: ${doc.obtainedFrom}. How: ${doc.howToObtain}`),
    `${(track.supportingDocuments ?? []).length + 1}. ${config.recordComparison}`,
    `${(track.supportingDocuments ?? []).length + 2}. Fill in every blank listed under "Blanks you must fill in" below. Each one is a fact this packet does not hold for you.`,
    `${(track.supportingDocuments ?? []).length + 3}. Decide the fee. The record states: "${rules.fees}" If you are claiming indigency, complete the C-10-CRIMINAL affidavit included in this packet; the judge, not you, completes its order page.`,
    ...(track.manualCompletionItems ?? []).map((item, index) =>
      `${(track.supportingDocuments ?? []).length + 4 + index}. ${item.item} on ${item.whereInPacket}, and only after everything above is done. ${item.why} This packet deliberately leaves your signature and every date blank; do not sign or date early.`)
  ].join("\n");
  const stops = (track.selfHelpStopConditions ?? []).map((stop) => `- ${stop}`).join("\n");
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Alabama expungement packet - ${familyId}

## Route selected

${config.routeSummary}

## What the held record establishes

${provenance}

${heldRecord}

## Do these before you file

${beforeFiling}

## Blanks you must fill in

Each line names a blank on the paper that this packet did not fill because it
does not hold that fact. Fill them in on both the canonical and the
boundary-style packet before filing - except any line marked with a condition,
which you fill in only if that condition is true of you.

${requiredList}

${electionsSection()}

## Service

The record states: "${rules.service}" Serve the district attorney, the
law-enforcement agency whose records you are asking the court to expunge, and
the clerk of the court for the county where the charge was filed. Use a
separate CR-65 page 7 certificate of service for each recipient.

The held record does not state which service method Alabama requires for this
petition, and this packet will not guess one. Ask the circuit clerk in the
filing county which method that court accepts before you serve. Complete the
service date, method, recipient, address and server signature on each
certificate only after service has actually happened.

## Notarization

CR-65 page 6 carries a notary block. The record states: "${rules.notarization}"
So ask the circuit clerk in the filing county whether that court requires the
page-6 affidavit to be sworn before a notary or other authorized officer. Leave
the notary block, its date and your own signature blank until you are in front
of whoever administers the oath.

## Stop and get help

Stop using automated assistance and speak with an Alabama lawyer if any of these
is true:

${stops}
`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}

${provenance}

- Where to file: "${rules.filing}"
- Destination: ${track.destination?.name ?? "not stated in the record"}${track.destination?.detail ? ` — "${track.destination.detail}"` : ""}
- Filing fee: "${rules.fees}"
- Fee waiver: "${rules.feeWaiver}"
- Notice: "${rules.notice}"
- Notarization: "${rules.notarization}"

The C-10-CRIMINAL affidavit included in this packet is the fee-waiver form.
Complete it only if you are claiming indigency; the judge completes its order
page. Do not sign or date the petition until every required blank and every
attachment above is complete.
`);
}

export async function assertRepairInvariants(out) {
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const instructions = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const written = new Set(fieldMap.writes.map((row) => row.fieldId));
  for (const forbidden of [
    "C-10-CRIMINAL:Spouses Full Name if married",
    "C-10-CRIMINAL:Employers Telephone Number",
    "C-10-CRIMINAL:MUNICIPALITY OF",
    "CR-65:COUNTY and it was given Court Case Number",
    "CR-65:Text2",
    "CR-65:Telephone Number_2",
  ]) assert.ok(!written.has(forbidden), `semantically invalid write remains: ${forbidden}`);
  assert.ok(written.has("C-10-CRIMINAL:Check Box1.0"), "state-court caption branch must be selected");
  assert.ok(written.has("C-10-CRIMINAL:COURT OF"), "state-court caption must include filing county");
  assert.ok(!fieldMap.writes.some((row) => ["matter.charge", "matter.expungement_ground", "matter.arresting_agency", "matter.detention_agencies"].includes(row.factId)), "generic directions must not be written as held case facts");
  for (const refusal of fieldMap.refusals.filter((row) => row.requiredBeforeFiling)) {
    assert.ok(!/\b(?:undefined(?:_\d+(?:\.\d+)?)?|Text\d+)\b/.test(refusal.effectiveLabel), `opaque required-before-filing label remains: ${refusal.fieldId}`);
  }
  assert.match(instructions, /certified local record/i);
  assert.match(instructions, /minor traffic violation/i);
  assert.match(instructions, /licensing or firearm consequences/i);

  /*
   * REQUIRED_BEFORE_FILING, the half of it a blank list cannot answer.
   *
   * Naming every blank is necessary and is not sufficient: a guide can name all
   * of them and still direct a step the record refuses, and the nine counters
   * cannot see that, because they audit whether a blank was classified and
   * never whether an instruction is true. Each assertion below fires on the
   * bytes this family shipped before this repair.
   */
  const filing = fs.readFileSync(path.join(out, "filing-instructions.md"), "utf8");

  // The record states the source review does not establish a notarization
  // requirement for CR-65, so neither guide may direct one as though it did.
  assert.doesNotMatch(instructions, /Sign the petition under oath before an authorized officer or notary/);
  assert.doesNotMatch(filing, /Sign the petition under oath before an authorized officer or notary/);
  assert.doesNotMatch(instructions, /sign under oath before a notary or other authorized officer/);

  // The guide must quote the record it is derived from, and be bound to its digest.
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const memo = JSON.parse(memoBytes.toString("utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === FAMILY_CONFIG[fieldMap.familyId].trackId);
  assert.ok(track, "the guide's track must be present in the memo");
  for (const heading of ["## What the held record establishes", "## Do these before you file", "## Notarization"]) {
    assert.ok(instructions.includes(heading), `guide section missing: ${heading}`);
  }
  assert.ok(instructions.includes(sha256(memoBytes)), "the guide must carry the digest of the record it quotes");
  assert.ok(instructions.includes(track.rules.notarization), "the guide must quote the record's notarization line verbatim");
  assert.ok(filing.includes(track.rules.notarization), "the filing guide must quote the record's notarization line verbatim");

  // Every supporting document the record marks required-before-filing, named
  // with its source and its method rather than merely mentioned.
  for (const doc of (track.supportingDocuments ?? []).filter((row) => row.requiredBeforeFiling)) {
    assert.ok(instructions.includes(doc.name), `required-before-filing document missing from the guide: ${doc.name}`);
    assert.ok(instructions.includes(doc.obtainedFrom), `where to obtain it missing from the guide: ${doc.name}`);
    assert.ok(instructions.includes(doc.howToObtain), `how to obtain it missing from the guide: ${doc.name}`);
  }

  // SELF_HELP_STOP: every stop the record holds, verbatim, not a paraphrase.
  for (const stop of track.selfHelpStopConditions ?? []) {
    assert.ok(instructions.includes(stop), `stop condition missing from the guide: ${stop}`);
  }

  /*
   * THE THREE UNMADE SWORN SELECTIONS, AND THE TWO BLANKS THAT WERE DIRECTED
   * UNCONDITIONALLY. Each assertion below fires on the bytes this family
   * shipped before this repair.
   */
  for (const [, quoted] of cr65QuotedElectionLines()) {
    assert.ok(instructions.includes(quoted),
      `the guide does not carry the line CR-65 prints: ${JSON.stringify(quoted)}`);
  }
  assert.ok(instructions.includes(CR65_SECOND_BRANCH_CONDITION),
    "the guide must state the condition the two previous-expungement blanks hang on");
  assert.doesNotMatch(instructions, /Fill every one on both the canonical and the\s+boundary-style packet before filing/,
    "an unconditional fill-every-one direction stands over a list that now carries conditional blanks");
  for (const fieldId of CR65_SECOND_BRANCH_ONLY) {
    const row = fieldMap.refusals.find((entry) => entry.fieldId === fieldId);
    assert.ok(row, `a second-branch blank left the field map: ${fieldId}`);
    if (!row.requiredBeforeFiling) continue;
    const line = instructions.split("\n").find((l) => l.startsWith(`- ${row.effectiveLabel}`));
    assert.ok(line, `a second-branch blank left the guide's blank list: ${fieldId}`);
    assert.ok(line.includes(CR65_SECOND_BRANCH_CONDITION),
      `a conditional blank is listed unconditionally: ${row.effectiveLabel}`);
  }
  /*
   * Disclosure and refusal are two halves of one statement. No election the
   * guide now hands to the participant may be ticked for them by the build.
   */
  for (const row of fieldMap.refusals) {
    if (!row.isSelectionControl || row.documentId !== "CR-65") continue;
    if (![CR65_PRINTED_ELECTIONS.attachments.page, CR65_PRINTED_ELECTIONS.swornSelectOne.page].includes(row.page)) continue;
    assert.ok(!written.has(row.fieldId),
      `a page-${row.page} election this guide hands to the participant is ticked by the build: ${row.fieldId}`);
  }

  // Every counter this family publishes must be a reading of the delivered
  // bytes. A typed literal that reads as a finding is the ARTIFACTS defect.
  const actualWrites = JSON.parse(fs.readFileSync(path.join(out, "reports", "actual-writes.json"), "utf8"));
  for (const artifact of actualWrites.artifacts) {
    assert.ok(Number.isInteger(artifact.addedGlyphsReadFromOutputBytes) && artifact.addedGlyphsReadFromOutputBytes > 0,
      `${artifact.fixture}: addedGlyphsReadFromOutputBytes must be a reading of the delivered bytes, and this packet draws glyphs`);
    assert.equal(artifact.invisibleWrites.length, 0, `${artifact.fixture}: a write is not visible in the delivered bytes`);
    assert.equal(artifact.refusedFieldsWithInk.length, 0, `${artifact.fixture}: a refused field carries ink in the delivered bytes`);
    assert.equal(artifact.incompleteValues.length, 0, `${artifact.fixture}: a held value did not read back complete from the delivered bytes`);
    /*
     * flattenedWidgetAppearancesReadFromOutputBytes is NOT asserted to differ
     * from the finalizer's write count. It used to BE that count, republished;
     * it is now `boxes with expectInk` minus `writes the delivered bytes draw
     * no glyph for`, and when nothing is invisible those two numbers coincide
     * legitimately. Asserting they differ would demand a defect. What separates
     * a measurement from a literal is that a measurement carries the
     * denominator it was taken over, so that is what is checked.
     */
    assert.equal(artifact.fieldRectanglesMeasured, 216,
      `${artifact.fixture}: the measurement must be taken over all 216 widget rectangles of the two pinned sources, and reports ${artifact.fieldRectanglesMeasured}`);
    assert.ok(Number.isInteger(artifact.printedFormGlyphsInsideFieldRectsIgnored) && artifact.printedFormGlyphsInsideFieldRectsIgnored > 0,
      `${artifact.fixture}: the blank-form baseline must have been subtracted, and these forms print inside their own field rectangles`);
    assert.ok(Number.isInteger(artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes),
      `${artifact.fixture}: nonWhitespaceGlyphsOutsideMeasuredWriteBoxes must be a number read from the delivered bytes`);
  }

  // Glyph-level guards end here. Everything above reads text, and every one of
  // them passes with an opaque white box painted over the text it claims to
  // have read. The two lines below read pixels.
  const fixtures = fs.readdirSync(path.join(out, "fixtures")).filter((f) => f.endsWith(".pdf")).sort();
  assert.equal(fixtures.length, 2, `this family delivers two fixtures and the directory holds ${fixtures.length}`);
  await assertCR65PrintedElections(fixtures.map((f) => path.join(out, "fixtures", f)), { cr65PageOffset: 0 });
  await assertPrintedFormInkSurvives(out);
}

/*
 * THE GUARD THE GLYPH READERS COULD NOT BE. See
 * scripts/rcap-official-forms/printed-source-ink-survival.mjs for what it
 * measures, at what resolution and threshold, and what it cannot see.
 */
function packetPageMap(sources) {
  const pages = [];
  let cursor = 0;
  for (const source of sources) {
    for (let page = 1; page <= SOURCE_PAGE_COUNTS[source.documentId]; page += 1) {
      pages.push({ packetPage: cursor + page, sourcePdf: source.absolute, sourcePage: page });
    }
    cursor += SOURCE_PAGE_COUNTS[source.documentId];
  }
  return pages;
}

export async function assertPrintedFormInkSurvives(out, { publishTo = null } = {}) {
  const sources = resolveSources();
  const pages = packetPageMap(sources);
  const reports = [];
  for (const fixtureName of Object.keys(FIXTURES)) {
    const file = path.join(out, "fixtures", `${fixtureName}.pdf`);
    assert.ok(fs.existsSync(file), `fixture absent from disk, so its pixels cannot be read: ${file}`);
    reports.push({ fixture: fixtureName, ...(await assertPrintedSourceInkSurvives({ deliveredPdf: file, pages })) });
  }
  if (publishTo) {
    writeJson(publishTo, {
      schemaVersion: "rcap-printed-source-ink-survival/v1",
      familyId: "al-felony-dwop-set",
      measuredFrom: "the delivered fixture bytes on disk and the pinned official source binaries in custody, rasterised page by page",
      renderer: reports[0].renderer,
      annotationsRendered: reports[0].annotationsRendered,
      dpi: reports[0].dpi,
      inkThreshold: reports[0].inkThreshold,
      widgetRectAllowancePts: reports[0].widgetRectAllowancePts,
      allowanceMeaning: reports[0].allowanceMeaning,
      cannotSee: reports[0].cannotSee,
      rasterEvidenceClaimed: false,
      whyNoRasterEvidenceIsClaimed: "every raster this guard produced was read into memory and deleted in the same breath; nothing was retained, published or reviewed, and a central raster is still owed for this family",
      fixtures: reports.map((report) => ({
        fixture: report.fixture,
        printedSourceInkErasedOutsideWidgetRects: report.perPage.reduce((sum, page) => sum + page.lostInkOutsideEveryDeclaredWidgetRect, 0),
        printedSourceInkErasedInsideWidgetRects: report.perPage.reduce((sum, page) => sum + page.lostInkInsideADeclaredWidgetRect, 0),
        perPage: report.perPage.map(({ sourcePdf, ...page }) => ({ ...page, sourceDocument: path.basename(sourcePdf) }))
      }))
    });
  }
  return reports;
}

export async function buildAlabamaFamily(familyId) {
  assert.equal(familyId, "al-felony-dwop-set", "this family-owned builder may only build al-felony-dwop-set");
  const base = FAMILY_CONFIG[familyId];
  assert.ok(base, `unsupported Alabama family: ${familyId}`);
  const config = { familyId, ...base };
  const outRel = `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill`;
  const out = path.join(ROOT, outRel);
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, WORKLIST_PATH), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === familyId);
  assert.ok(family, `family absent from worklist: ${familyId}`);
  /*
   * The guides are generated FROM the legal record, not written alongside it.
   *
   * A retyped guide drifts from the record silently; one quoted from the record
   * and bound to its digest cannot drift without the digest moving.
   */
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const memoDigest = sha256(memoBytes);
  const memo = JSON.parse(memoBytes.toString("utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === config.trackId);
  assert.ok(track, `track absent from ${MEMO_PATH}: ${config.trackId}`);
  const rules = track.rules ?? {};
  for (const key of ["filing", "fees", "feeWaiver", "notice", "service", "participantSignature", "notarization"]) {
    assert.ok(rules[key], `${config.trackId}: rules.${key} is not held; a guide may not be written past an absent rule`);
  }
  assert.ok((track.selfHelpStopConditions ?? []).length > 0, `${config.trackId}: the record holds no stop conditions`);
  // What the blank forms print inside their own field rectangles, so the
  // delivered-ink measurement subtracts the FORM's ink and reports only what
  // this build added. Same binaries, same normalization, same flatten.
  const baselines = {};
  for (const source of sources) baselines[source.documentId] = await baselineInk(source);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture, config, baselines);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const fieldMap = {
    schemaVersion: "rcap-production-field-map/v2", familyId, implementationStrategy: "official_pdf_fill",
    routeKeys: family.routes.map((route) => route.routeKey), routeSummary: config.routeSummary,
    writes: packets.canonical.writes.map(({ drawnText, ...row }) => row), refusals: packets.canonical.refusals
  };
  writeJson(path.join(out, "production-field-map.json"), fieldMap);
  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-source-receipt/v2", familyId, allSourcesExact: true,
    sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds }))
  });
  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes/v2", familyId,
    documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })),
    countersMeasuredFrom: "every counter below except valuesReportedByFinalizer is read from the delivered packet bytes by proveDeliveredInk, which reopens the finished file, walks its content streams, recurses through the Form XObjects flattening leaves behind, and subtracts what the blank form prints inside the same rectangles",
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({
      fixture,
      valuesReportedByFinalizer: packet.writes.length,
      addedGlyphsReadFromOutputBytes: packet.proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: packet.proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: packet.proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      printedFormGlyphsInsideFieldRectsIgnored: packet.proof.printedFormGlyphsInsideFieldRectsIgnored,
      fieldRectanglesMeasured: packet.proof.fieldsMeasured,
      invisibleWrites: packet.proof.invisibleWrites,
      refusedFieldsWithInk: packet.proof.refusedFieldsWithInk,
      incompleteValues: packet.proof.incompleteValues,
      proof: packet.proof.proof
    }))
  });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2", familyId, rasterState: "BUILT_RASTER_PENDING",
    packets: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) }))
  });
  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-packet-approval-request/v2", familyId, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill",
    routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))),
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })),
    independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false
  });
  const required = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling);
  writeGuides({ out, familyId, config, rules, track, memoDigest, required });
  /*
   * The pixel measurement, taken from the fixture bytes now on disk against the
   * pinned source binaries, so the counter below is a reading of the delivered
   * file rather than a restatement of what this process believes it wrote.
   */
  const inkSurvival = await assertPrintedFormInkSurvives(out, { publishTo: path.join(out, "reports", "printed-source-ink-survival.json") });
  const list = Object.values(packets);
  writeJson(path.join(out, "reports", "build-summary.json"), {
    familyId, result: "BUILT_RASTER_PENDING",
    counters: {
      knownRequiredFieldsMissing: 0,
      requiredFactsNotCollected: 0,
      unclassifiedBlanks: packets.canonical.refusals.filter((row) => !row.refusalClass && !row.completenessDisposition && !row.role).length,
      // Read from the delivered bytes by proveDeliveredInk, not declared.
      incompleteRows: list.reduce((sum, packet) => sum + packet.proof.incompleteValues.length, 0),
      requiredOptionsMissing: 0,
      requiredComponentsMissing: 0,
      invisibleWrites: list.reduce((sum, packet) => sum + packet.proof.invisibleWrites.length, 0),
      protectedWrites: list.reduce((sum, packet) => sum + packet.proof.refusedFieldsWithInk.length, 0),
      /*
       * Printed form ink the delivered packet erases where no control belongs.
       * Measured in pixels against the pinned sources at 300 dpi, ink threshold
       * 200; a number, not a typed literal, and it read 241 on page 3 of the
       * bytes this family shipped before this repair.
       */
      printedSourceInkErasedOutsideWidgetRects: inkSurvival.reduce(
        (sum, report) => sum + report.perPage.reduce((pages, page) => pages + page.lostInkOutsideEveryDeclaredWidgetRect, 0), 0),
      /*
       * Still null, and deliberately. Nobody has looked at a raster of these
       * pages. Every raster the ink guard produced was read into memory and
       * deleted unseen, and it answers one narrow question about erasure -- it
       * is not a visual review and claims no raster evidence. A central raster
       * is owed for this family now that its bytes have moved.
       */
      visualDefects: null
    },
    countersMeasuredFrom: "incompleteRows, invisibleWrites and protectedWrites are read from the delivered packet bytes by proveDeliveredInk; printedSourceInkErasedOutsideWidgetRects is read from the delivered fixture bytes on disk against the pinned source binaries at 300 dpi with ink threshold 200 and a 1 pt widget-rectangle allowance, published in full in reports/printed-source-ink-survival.json; visualDefects is null because nobody has looked at a raster of these pages",
    deliveredInk: Object.entries(packets).map(([fixture, packet]) => ({
      fixture,
      addedGlyphsReadFromOutputBytes: packet.proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: packet.proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: packet.proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      fieldRectanglesMeasured: packet.proof.fieldsMeasured,
      invisibleWrites: packet.proof.invisibleWrites,
      refusedFieldsWithInk: packet.proof.refusedFieldsWithInk,
      incompleteValues: packet.proof.incompleteValues
    })),
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false
  });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

/*
 * CONTROLS. A guard that has never failed proves nothing about the build that
 * passes it, and this family had no controls at all -- which is part of how it
 * came to publish four typed literals as findings.
 *
 * Three fire here:
 *   1. the pixel guard on an OPAQUE BOX over printed form text, the mutation
 *      VF01 used to prove the glyph guards blind;
 *   2. the pixel guard on THIS DEFECT -- the same packet rebuilt with
 *      normalizeWidgetRectangles removed, which is the bytes this family
 *      shipped before this repair;
 *   3. the delivered-ink reader with its blank-form baseline removed, which
 *      must make the FORM's own printed ink read as this build's writes.
 */
const MUTATION_TARGET = Object.freeze({
  packetPage: 3, word: "quashed",
  // pdftotext -bbox on the pinned CR-65 page 3: xMin 178.179 xMax 217.417,
  // yMin 130.506 yMax 141.306 from the page top, i.e. PDF y 650.694-661.494.
  x: 178.0, y: 650.4, width: 39.8, height: 11.4
});

export async function negativeControls() {
  const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill");
  const config = { familyId: "al-felony-dwop-set", ...FAMILY_CONFIG["al-felony-dwop-set"] };
  const sources = resolveSources();
  const pages = packetPageMap(sources);
  const cr65 = sources.find((source) => source.documentId === "CR-65");

  // The mutation target must be printed form ink that no control owns, or the
  // guard's widget-rectangle allowance would be right to excuse it.
  const probe = await PDFDocument.load(cr65.bytes);
  const probePages = probe.getPages();
  for (const field of probe.getForm().getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      const index = probePages.findIndex((page) => page.ref.toString() === String(widget.dict.get(PDFName.of("P"))));
      if (index + 1 !== MUTATION_TARGET.packetPage) continue;
      const array = widget.dict.lookup(PDFName.of("Rect"), PDFArray);
      const v = [0, 1, 2, 3].map((i) => array.lookup(i, PDFNumber).asNumber());
      const r = { x0: Math.min(v[0], v[2]), y0: Math.min(v[1], v[3]), x1: Math.max(v[0], v[2]), y1: Math.max(v[1], v[3]) };
      assert.ok(!(r.x0 < MUTATION_TARGET.x + MUTATION_TARGET.width + DEFAULT_RECT_TOLERANCE_PTS
        && r.x1 > MUTATION_TARGET.x - DEFAULT_RECT_TOLERANCE_PTS
        && r.y0 < MUTATION_TARGET.y + MUTATION_TARGET.height + DEFAULT_RECT_TOLERANCE_PTS
        && r.y1 > MUTATION_TARGET.y - DEFAULT_RECT_TOLERANCE_PTS),
        `the mutation target is inside widget ${field.getName()}, where the guard's allowance would excuse it`);
    }
  }

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "al-felony-dwop-controls-"));
  try {
    const onePage = pages.filter((page) => page.packetPage === MUTATION_TARGET.packetPage);

    // 1. The mutation control.
    const clean = path.join(out, "fixtures", "canonical.pdf");
    const document = await PDFDocument.load(fs.readFileSync(clean), { ignoreEncryption: true, updateMetadata: false });
    document.getPages()[MUTATION_TARGET.packetPage - 1].drawRectangle({
      x: MUTATION_TARGET.x, y: MUTATION_TARGET.y, width: MUTATION_TARGET.width, height: MUTATION_TARGET.height, color: rgb(1, 1, 1)
    });
    const defaced = path.join(scratch, "defaced.pdf");
    fs.writeFileSync(defaced, Buffer.from(await document.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity })));
    const extracted = execFileSync("pdftotext", ["-f", String(MUTATION_TARGET.packetPage), "-l", String(MUTATION_TARGET.packetPage), defaced, "-"], { encoding: "utf8" });
    assert.ok(extracted.includes(MUTATION_TARGET.word),
      `CONTROL DID NOT FIRE — pdftotext must still extract "${MUTATION_TARGET.word}" from the defaced bytes; that it does is exactly why a glyph reader cannot see an opaque box`);
    let threw = null;
    try { await assertPrintedSourceInkSurvives({ deliveredPdf: defaced, pages: onePage }); } catch (error) { threw = error; }
    assert.ok(threw, `CONTROL DID NOT FIRE — the pixel guard passed a page with an opaque white box over the printed word "${MUTATION_TARGET.word}"`);
    const mutated = await measurePrintedSourceInkSurvival({ deliveredPdf: defaced, pages: onePage });
    console.log(`pixel guard mutation control: an opaque white box over the printed word "${MUTATION_TARGET.word}" on packet page ${MUTATION_TARGET.packetPage} `
      + `erased ${mutated.perPage[0].lostInkOutsideEveryDeclaredWidgetRect} px of printed form ink at ${mutated.dpi} dpi / threshold ${mutated.inkThreshold}; `
      + `the pixel guard FAILED as it must, while pdftotext still extracted the word and every glyph guard in this family stays silent.`);

    // 2. The cause control: this defect, un-repaired.
    const baselines = {};
    for (const source of sources) baselines[source.documentId] = await baselineInk(source);
    const unrepaired = await buildPacket(sources, "canonical", FIXTURES.canonical, config, baselines, { normalizeRects: false });
    const unrepairedFile = path.join(scratch, "unrepaired.pdf");
    fs.writeFileSync(unrepairedFile, unrepaired.bytes);
    let causeThrew = null;
    try { await assertPrintedSourceInkSurvives({ deliveredPdf: unrepairedFile, pages: onePage }); } catch (error) { causeThrew = error; }
    assert.ok(causeThrew, "CONTROL DID NOT FIRE — the pixel guard passed the un-normalized build, which is the defect it exists to catch");
    const causeReport = await measurePrintedSourceInkSurvival({ deliveredPdf: unrepairedFile, pages: onePage });
    console.log(`pixel guard cause control: rebuilt with normalizeWidgetRectangles removed, packet page ${MUTATION_TARGET.packetPage} `
      + `erases ${causeReport.perPage[0].lostInkOutsideEveryDeclaredWidgetRect} px of printed form ink outside every widget rectangle `
      + `(${causeReport.perPage[0].lostInkPixelsReadingSolidWhite} of ${causeReport.perPage[0].lostInkPixels} lost pixels read solid white 255); the pixel guard FAILED as it must.`);

    // 3. The delivered-ink reader without its blank-form baseline.
    const repaired = await buildPacket(sources, "canonical", FIXTURES.canonical, config, baselines);
    const noBaseline = await proveDeliveredInk(repaired.bytes, { boxes: repaired.boxes }, baselines, { subtractBaseline: false });
    assert.equal(repaired.proof.refusedFieldsWithInk.length, 0, "the repaired reader must report no refused field carrying ink");
    assert.ok(noBaseline.refusedFieldsWithInk.length > 0,
      "CONTROL DID NOT FIRE — dropping the blank-form baseline must make the form's own printed ink read as writes");
    console.log(`delivered-ink baseline control: repaired=${repaired.proof.refusedFieldsWithInk.length} refused-with-ink, `
      + `no-baseline=${noBaseline.refusedFieldsWithInk.length} (control fires); `
      + `addedGlyphsReadFromOutputBytes=${repaired.proof.addedGlyphsReadFromOutputBytes} against the 0 this family used to publish.`);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill");
  if (process.argv.includes("--negative-control")) {
    await negativeControls();
  } else if (process.argv.includes("--check")) {
    await assertRepairInvariants(out);
    console.log("al-felony-dwop-set: repair invariants PASS");
  } else {
    await buildAlabamaFamily("al-felony-dwop-set");
    await assertRepairInvariants(out);
  }
}
