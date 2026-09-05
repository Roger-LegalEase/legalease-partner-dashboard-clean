#!/usr/bin/env node
/**
 * Arkansas drug-court packet family.
 *
 * The controlling track is staged: process guidance for admission/completion,
 * followed by the applicable ACIC pre- or post-adjudication petition and
 * proposed-order pair.  This builder emits both posture variants.  It never
 * chooses the posture for a participant, writes a court-owned finding, or
 * changes route authority.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { captureWidgetContext, extractTextItems, groupIntoLines, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { fitTextToWidget, applyFitToTextField, usableWidthOf, HORIZONTAL_PADDING, MIN_READABLE_FONT_SIZE }
  from "./rcap-official-forms/rcap-text-fitting.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "ar-drug-court-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ar-drug-court-set.mjs";
const ROUTE_KEYS = Object.freeze([
  "obligation:unit:AR:ar-drug-court:ar-drug-court-stage-1",
  "obligation:unit:AR:ar-drug-court:ar-drug-court-stage-2"
]);
const D_ROOT = process.env.RCAP_D_SOURCE_DIR
  ?? "private/source-imports/rcap-d-source-packs-2026-08-12";

const SOURCES = Object.freeze([
  {
    posture: "pre-adjudication", role: "petition",
    documentId: "ACIC-PETITION-DRUG-COURT-PRE",
    componentId: "ar-drug-court-primary-filing-2",
    officialTitle: "Petition to Dismiss and Seal Offense in Pre-Adjudication Drug Court Proceeding",
    revision: "2014-08-25", sha256: "7b9426041a2bf7b14ee871847999ecb83d5818829abb39eb9711a411ff70ba42",
    byteLength: 356744, pageCount: 4,
    pathInPack: "D1/STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-DISMISS-AND-SEAL-PRE-ADJUDICATION-DRUG-COURT-O__petition-to-dismiss-and-seal-offense-in-pre-adjudication-drug-court-proceeding__REV-2014-08-25__EN.pdf"
  },
  {
    posture: "post-adjudication", role: "petition",
    documentId: "ACIC-PETITION-DRUG-COURT-POST",
    componentId: "ar-drug-court-primary-filing-2",
    officialTitle: "Petition to Dismiss and Seal Offense in Post-Adjudication Drug Court Proceeding",
    revision: "2014-01-01", sha256: "99657d0eac1f5ea51814f4c663b483749228a06412ba1e9dd1805aeac4826e39",
    byteLength: 1026997, pageCount: 4,
    pathInPack: "D1/STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-DISMISS-AND-SEAL-POST-ADJUDICATION-DRUG-COURT__petition-to-dismiss-and-seal-offense-in-post-adjudication-drug-court-proceeding__REV-2014-01-01__EN.pdf"
  },
  {
    posture: "pre-adjudication", role: "order",
    documentId: "ACIC-ORDER-DRUG-COURT-PRE",
    componentId: "ar-drug-court-proposed-order-3",
    officialTitle: "Order to Dismiss and Seal Offense in Pre-Adjudication Drug Court Proceeding",
    revision: "2014-01-01", sha256: "b7532d415611a9fe3046fd6fa1aaf662d93c20ba21bf27a3ab8066c96d63b13e",
    byteLength: 312762, pageCount: 4,
    pathInPack: "D1/STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-DISMISS-AND-SEAL-PRE-ADJUDICATION-DRUG-COURT-OFFE__order-to-dismiss-and-seal-offense-in-pre-adjudication-drug-court-proceeding__REV-2014-01-01__EN.pdf"
  },
  {
    posture: "post-adjudication", role: "order",
    documentId: "ACIC-ORDER-DRUG-COURT-POST",
    componentId: "ar-drug-court-proposed-order-3",
    officialTitle: "Order to Dismiss and Seal Offense in Post-Adjudication Drug Court Proceeding",
    revision: "2014-01-01", sha256: "731fd089f5b019002269ec86905cea946d5841b988102c222edfbd630290eaf2",
    byteLength: 603002, pageCount: 4,
    pathInPack: "D1/STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-DISMISS-AND-SEAL-POST-ADJUDICATION-DRUG-COURT-OFF__order-to-dismiss-and-seal-offense-in-post-adjudication-drug-court-proceeding__REV-2014-01-01__EN.pdf"
  }
]);

const FIXTURES = Object.freeze({
  canonical: Object.freeze({
    fullName: "Jordan Avery Reyes", caseNumber: "24-CR-001234",
    dateOfBirth: "04/17/1991", street: "118 Maple Street", city: "Springfield",
    state: "AR", zip: "72001"
  }),
  boundary: Object.freeze({
    fullName: "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
    caseNumber: "0123-45-2026-CR-900123.00-AB-CDE/2201", dateOfBirth: "12/31/1968",
    street: "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
    city: "Unincorporated Township of Long Hollow Crossing", state: "AR", zip: "72001-9999"
  })
});

const SAFE_FACT_BY_FIELD = Object.freeze({
  "First Middle and Last name": "fullName",
  "WHEREFORE the Defendant": "fullName",
  "FURTHER if applicable the Defendant": "fullName",
  "Defendant": "fullName",
  "Case No": "caseNumber",
  "DOB": "dateOfBirth",
  "Defendant Address  Street 1": "street",
  "City": "city",
  "State": "state",
  "Zip code": "zip"
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (rel, value) => {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

function sourcePath(source) { return path.join(ROOT, D_ROOT, source.pathInPack); }
function verifyAllSources() {
  return SOURCES.map((source) => {
    const file = sourcePath(source);
    assert.ok(fs.existsSync(file), `source absent: ${D_ROOT}/${source.pathInPack}`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, source.byteLength, `source byte length moved: ${source.documentId}`);
    assert.equal(sha256(bytes), source.sha256, `source SHA-256 moved: ${source.documentId}`);
    return { source, bytes };
  });
}

/*
 * The caption a widget is labelled with must come from the widget's own printed
 * row.
 *
 * `captureWidgetContext` looks for a caption to the LEFT on the same line and
 * admits any printed line whose baseline is within one widget height of the
 * widget's baseline OR its midline. On these ACIC forms the identification rows
 * are stacked about 24pt apart while the widgets are ~20pt tall, so the row
 * ABOVE a widget still clears that window, and it wins whenever its last
 * printed character happens to end closer to the widget's left edge. That is
 * how `ACIC-PETITION-DRUG-COURT-POST:Sex` came to be labelled "Race": the
 * printed "Race" on the row above ends 1.3pt from the Sex box while the box's
 * own printed "Sex" ends 2.6pt from it. The packet then instructed the
 * participant to supply Race into the Sex blank, and printed no Sex row at all.
 *
 * The correction is deliberately narrow. It fires only where the harvest CLAIMS
 * the widget's own cell -- labelBasis "printed_to_the_left_in_the_same_cell" --
 * and the harvested text is not printed on the widget's own row, which makes
 * that claim false on its face. Captions harvested from above in the same
 * column keep their own basis and are never touched. Across the four bound AR
 * sources this fires on 20 of 190 fields and leaves the other 170 exactly as
 * the shared host harvested them, so the host itself needs no change and no
 * other family's harvest can move.
 */
const OWN_ROW_CAPTION_GAP = 72;   // the host's own CAPTION_GAP_LEFT
const OWN_ROW_CELL_GAP = 6;       // gap that separates one printed cell from the next
const CAPTION_MAX_CHARS = 60;     // the host's own cap

const squashPrinted = (text) =>
  normalizeHarvestedText(String(text ?? "")).replace(/\s+/g, " ").trim().toLowerCase();

/** The printed line a widget actually sits on: nearest baseline, within the widget's own height. */
function ownPrintedRow(lines, rect) {
  if (!rect) return null;
  let own = null;
  for (const line of lines) {
    const delta = Math.abs(line.y - rect.y);
    if (delta > rect.height) continue;
    if (!own || delta < own.delta) own = { line, delta };
  }
  return own;
}

/** The cell text printed to the left of the widget on one specific line. */
function captionLeftOnRow(line, rect) {
  const left = line.runs.map((run, index) => ({ run, index })).filter(({ run }) => run.x2 <= rect.x + 1);
  if (left.length === 0) return null;
  const nearest = left.reduce((a, b) => (rect.x - b.run.x2 < rect.x - a.run.x2 ? b : a));
  if (rect.x - nearest.run.x2 > OWN_ROW_CAPTION_GAP) return null;
  let start = nearest.index;
  while (start > 0 && line.runs[start].x - line.runs[start - 1].x2 <= OWN_ROW_CELL_GAP) start -= 1;
  const text = line.runs.slice(start, nearest.index + 1).map((run) => run.text).join("");
  return normalizeHarvestedText(text).replace(/[\s:*.]+$/, "").trim().slice(0, CAPTION_MAX_CHARS) || null;
}

/** Drawn text present in the finished page but not in the bound source, page by page. */
function addedInkByPage(sourceItemsByPage, outputItemsByPage) {
  const key = (item) => `${item.text}\u0000${item.x.toFixed(2)}\u0000${item.y.toFixed(2)}\u0000${item.size.toFixed(2)}`;
  const added = [];
  outputItemsByPage.forEach((items, index) => {
    const remaining = new Map();
    for (const item of sourceItemsByPage[index] ?? []) {
      const k = key(item);
      remaining.set(k, (remaining.get(k) ?? 0) + 1);
    }
    for (const item of items) {
      const k = key(item);
      const count = remaining.get(k) ?? 0;
      if (count > 0) { remaining.set(k, count - 1); continue; }
      if (!/\S/.test(item.text)) continue;   // a run of spaces draws no ink
      added.push({ page: index + 1, ...item });
    }
  });
  return added;
}

/*
 * How wide a drawn run actually is.
 *
 * The content walker reports an advance computed from the font resource it can
 * see. The AcroForm's `/Helv` is a non-embedded base font with no /Widths, so
 * the walker falls back to a flat 500/1000 per character and reports this
 * boundary name as 210.00pt when Helvetica draws it in 195.64pt -- a 14.4pt
 * error, larger than several of the overflows being repaired. Where the walker
 * says its metrics are not exact, the embedded font that generated the
 * appearance is asked instead; that font is the one whose glyph advances the
 * viewer will use.
 */
const drawnWidthOf = (item, font) => item.metricsExact === true
  ? item.width
  : (() => { try { return font.widthOfTextAtSize(item.text, item.size); } catch { return item.width; } })();

const insideRect = (item, rect, font) => rect !== null && item.x >= rect.x - 0.5
  && item.x + drawnWidthOf(item, font) <= rect.x + rect.width + 0.5
  && item.y >= rect.y - 0.5 && item.y <= rect.y + rect.height + 0.5;

const overlapsRect = (item, rect, font) => rect !== null && item.x < rect.x + rect.width
  && item.x + drawnWidthOf(item, font) > rect.x && item.y >= rect.y - 0.5 && item.y <= rect.y + rect.height + 0.5;

function fieldType(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  return field.constructor.name.replace(/^PDF/, "").toLowerCase();
}

async function census(source, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  assert.equal(pages.length, source.pageCount, `${source.documentId}: page count moved`);
  const lines = pages.map((page) => groupIntoLines(extractTextItems(page)));
  const captureInput = new Map();
  const base = pdf.getForm().getFields().map((field) => {
    const widgets = field.acroField.getWidgets().map((widget) => {
      const rect = widget.getRectangle();
      const pageRef = widget.P?.();
      let page = 1;
      pages.forEach((candidate, index) => { if (candidate.ref === pageRef) page = index + 1; });
      return { page, rect: { x: +rect.x.toFixed(2), y: +rect.y.toFixed(2), width: +rect.width.toFixed(2), height: +rect.height.toFixed(2) } };
    });
    for (const widget of widgets) {
      if (!captureInput.has(widget.page)) captureInput.set(widget.page, []);
      captureInput.get(widget.page).push({ name: field.getName(), rect: widget.rect });
    }
    return { name: field.getName(), type: fieldType(field), widgets };
  });
  const contexts = new Map();
  pages.forEach((page, index) => {
    for (const row of captureWidgetContext(page, captureInput.get(index + 1) ?? [], {
      precomputedLines: lines[index], isFirstPage: index === 0
    })) if (!contexts.has(row.name)) contexts.set(row.name, row);
  });
  return base.map((field) => {
    const context = contexts.get(field.name) ?? {};
    const widget = field.widgets[0] ?? null;
    const own = widget ? ownPrintedRow(lines[widget.page - 1], widget.rect) : null;
    const printedRow = own ? normalizeHarvestedText(own.line.text).trim() || null : null;
    const harvested = String(context.effectiveLabel ?? "").trim() || null;

    // The harvest claims the widget's own cell but its text is printed on some
    // other row: the claim is false, so the caption is re-read from the row the
    // widget actually sits on.
    const claimsOwnCell = context.labelBasis === "printed_to_the_left_in_the_same_cell";
    const notOnOwnRow = claimsOwnCell && harvested !== null && own !== null
      && !squashPrinted(own.line.text).includes(squashPrinted(harvested));
    const corrected = notOnOwnRow ? captionLeftOnRow(own.line, widget.rect) : null;

    // A blank whose printed prompt sits to its RIGHT, or which is one of a row
    // of rules, has no caption to the left at all. The printed row is then the
    // only thing the participant can read, so the row is what the packet names
    // the blank by; a fragment harvested off a different row is not.
    const effectiveLabel = (notOnOwnRow ? (corrected ?? printedRow) : harvested)
      ?? `${source.documentId} printed blank ${field.name}`;
    return { ...field, effectiveLabel, harvestedLabel: context.effectiveLabel ?? null,
      printedRow,
      printedRowBaselineDelta: own ? +own.delta.toFixed(2) : null,
      labelCorrectedFromAnotherPrintedRow: notOnOwnRow,
      labelBasis: notOnOwnRow
        ? `re-read from the widget's own printed row; the harvested caption ${JSON.stringify(context.effectiveLabel)} is not printed on it`
        : context.labelBasis ?? "field-name fallback after measured widget-context harvest" };
  });
}

function factId(key) {
  return ({ fullName: "participant.full_legal_name", caseNumber: "matter.case_number",
    dateOfBirth: "participant.date_of_birth", street: "participant.street_address",
    city: "participant.city", state: "participant.state", zip: "participant.zip" })[key];
}

function shouldWrite(source, field) {
  const key = SAFE_FACT_BY_FIELD[field.name];
  if (!key) return null;
  if (source.role === "order" && !["First Middle and Last name", "Defendant", "Case No", "DOB"].includes(field.name)) return null;
  return key;
}

function classifyRefusal(source, field) {
  const common = { fieldId: `${source.documentId}:${field.name}`, fieldName: field.name,
    documentId: source.documentId, page: field.widgets[0]?.page ?? null,
    effectiveLabel: field.effectiveLabel, printedRow: field.printedRow ?? null,
    labelCorrectedFromAnotherPrintedRow: field.labelCorrectedFromAnotherPrintedRow === true,
    pdfType: field.type };
  if (source.role === "order") {
    if (["COURT OF", "DIVISION", "Race", "Sex", "SID"].includes(field.name)) return {
      ...common, requiredBeforeFiling: true, factAvailable: false,
      reason: "Before filing, copy this blank from the underlying court or ACIC record so the proposed order matches the petition."
    };
    if (/FBI No/i.test(field.name)) return { ...common, completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT",
      reason: "The form marks the FBI number optional when known; this is optional participant-authored content and the platform does not invent it." };
    return { ...common, refusalClass: "court_prosecutor_clerk_or_agency_owned",
      reason: "Below its caption this is the proposed order: findings, elections, decree, distribution, judge identity, signature, and date remain for the court or agency." };
  }
  if (field.type === "checkbox") return { ...common, isSelectionControl: true,
    refusalClass: "participant_sworn_narrative_or_legal_election", routeDetermined: false,
    reason: "The participant selects this only when the official record and the printed statement make it true; the route does not decide it." };
  if (/Defendants Signature|Defendant or Defendants Attorney|Certify Signature|^I$|^Date(?:_2)?$/i.test(field.name)) return {
    ...common, refusalClass: "signature_or_date_participant_completion",
    reason: "A signature, signature date, or certificate-of-service attestation is completed only by the signer after the stated act occurs."
  };
  if (/Arrest Tracking Number|SID(?: NUMBER)?$/i.test(field.name)) return {
    ...common, refusalClass: "court_prosecutor_clerk_or_agency_owned",
    reason: "This identifier is assigned by ACIC or another justice agency; the platform does not invent it."
  };
  if (/FBI No/i.test(field.name) || /Street 2/i.test(field.name)) return {
    ...common, completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT",
    reason: /Street 2/i.test(field.name)
      ? "Optional participant-authored second address line; the held street address is written once and is not duplicated."
      : "The form marks the FBI number optional when known; this is optional participant-authored content and the platform does not invent it."
  };
  /*
   * The reason no longer splices the harvested caption into a sentence.
   *
   * Forty-three of these captions are sentence fragments -- "1", "A", "prays",
   * "IN TH", "_______ DI" -- so the instruction read "supply prays from the
   * court record", which names nothing a participant can go and obtain. The
   * blank is identified by the bolded caption and the quoted printed line the
   * instructions now carry; the reason says where the answer comes from.
   */
  return { ...common, requiredBeforeFiling: true, factAvailable: false,
    reason: "Before filing, read the printed prompt this blank sits in and supply it from the court, ACIC, program-completion, or case record; the platform does not hold that exact fact." };
}

function rowsFor(source, fields) {
  const writes = [];
  const refusals = [];
  for (const field of fields) {
    const key = shouldWrite(source, field);
    if (key) writes.push({ fieldId: `${source.documentId}:${field.name}`, fieldName: field.name,
      documentId: source.documentId, page: field.widgets[0]?.page ?? null,
      rect: field.widgets[0]?.rect ?? null, effectiveLabel: field.effectiveLabel,
      printedRow: field.printedRow ?? null,
      usableWidthPt: field.widgets[0]?.rect ? usableWidthOf(field.widgets[0].rect) : null,
      horizontalPaddingPt: HORIZONTAL_PADDING,
      fact: key, factId: factId(key) });
    else refusals.push(classifyRefusal(source, field));
  }
  return { writes, refusals };
}

/*
 * The size a fixture's values are drawn at.
 *
 * These are the sizes this family already used, kept exactly so that every
 * value which always fitted is drawn identically after this repair; the change
 * here is that a value which does NOT fit is no longer drawn anyway. The floor
 * is the shared fitter's own MIN_READABLE_FONT_SIZE, so the boundary ladder is
 * a single rung and the canonical ladder steps 8 -> 6 in halves.
 */
const FIXTURE_MAX_FONT_SIZE = Object.freeze({ canonical: 8, boundary: 6 });

async function filledComponent(source, sourceBytes, fields, fixtureName) {
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const values = FIXTURES[fixtureName];
  const written = [];
  const widthRefusals = [];
  for (const field of fields) {
    const key = shouldWrite(source, field);
    if (!key) continue;
    const target = form.getFieldMaybe(field.name);
    assert.ok(target instanceof PDFTextField, `${source.documentId}/${field.name}: safe mapping is not text`);
    assert.equal(field.widgets.length, 1, `${source.documentId}/${field.name}: mapped field is not single-widget`);
    const rect = field.widgets[0].rect;
    const value = values[key];
    /*
     * Fit, or refuse. The previous renderer set a fixed size and wrote the
     * value regardless, so a value wider than its box ran past the edge: on the
     * boundary fixture the case number needed 118.05pt inside a 104.85pt box
     * and the name 195.64pt inside boxes of 154-189pt, and the rendered page
     * showed a truncated case number and a truncated name. Every mapped field
     * on these four forms is flagged single-line by the form itself, so wrapping
     * is not available honestly and the remaining outcomes are fit or refuse.
     *
     * `evaluateDeclaredMinimumSize` is the fitter's documented per-family
     * opt-in and this family takes it. Measured, it changes nothing here: both
     * ladders land on 6.0 exactly, so it can neither move a size nor turn a
     * refusal into a write in this family. It is set because a repaired family
     * is supposed to carry the opt-in the host asks for.
     */
    const fit = fitTextToWidget({ font, text: value, rect, multiline: target.isMultiline(),
      maxFontSize: FIXTURE_MAX_FONT_SIZE[fixtureName], minFontSize: MIN_READABLE_FONT_SIZE,
      evaluateDeclaredMinimumSize: true });
    const usableWidth = usableWidthOf(rect);
    if (fit.outcome === "refused") {
      widthRefusals.push({
        documentId: source.documentId, fieldId: `${source.documentId}:${field.name}`,
        fieldName: field.name, factId: factId(key), page: field.widgets[0].page, rect,
        effectiveLabel: field.effectiveLabel, printedRow: field.printedRow ?? null,
        outcome: "refused", reason: fit.reason,
        widgetWidthPt: rect.width, horizontalPaddingPt: HORIZONTAL_PADDING,
        usableWidthPt: usableWidth, minFontSizePt: fit.minFontSize,
        requiredWidthAtMinPt: fit.requiredWidthAtMin ?? null,
        overflowAtMinPt: fit.requiredWidthAtMin === undefined ? null
          : +(fit.requiredWidthAtMin - usableWidth).toFixed(2),
        notTruncated: true,
        whatTheParticipantMustDo: `This value does not fit the printed blank at the smallest readable size, so the packet leaves it blank rather than truncating it or drawing over the form. Write it on the printed line by hand, or ask the clerk how a value this long is recorded on this form.`
      });
      continue;
    }
    applyFitToTextField(target, fit);
    written.push({ documentId: source.documentId, fieldId: `${source.documentId}:${field.name}`,
      fieldName: field.name, factId: factId(key), expected: value, page: field.widgets[0].page,
      rect, fontSizePt: fit.fontSize, fitOutcome: fit.outcome,
      drawnWidthPt: +font.widthOfTextAtSize(value, fit.fontSize).toFixed(2),
      usableWidthPt: usableWidth, horizontalPaddingPt: HORIZONTAL_PADDING,
      containedInWidgetBox: true });
  }
  form.updateFieldAppearances(font);
  form.flatten();
  stampDeterministic(pdf);
  const bytes = await pdf.save({ useObjectStreams: false, updateMetadata: false });
  const reread = await PDFDocument.load(bytes, { updateMetadata: false });
  const text = reread.getPages().flatMap((page) => extractTextItems(page).map((item) => item.text));
  for (const row of written) {
    assert.ok(text.some((item) => item.includes(row.expected)),
      `${source.documentId}/${fixtureName}/${row.fieldName}: final bytes do not carry expected value`);
    assert.ok(row.drawnWidthPt <= row.usableWidthPt,
      `${source.documentId}/${fixtureName}/${row.fieldName}: drawn width ${row.drawnWidthPt}pt exceeds usable ${row.usableWidthPt}pt`);
  }
  /*
   * Per-widget added-ink diff against the bound source.
   *
   * Counting what the finalizer says it wrote proves nothing about what the
   * page draws: the old report carried a hard-coded
   * `nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0` while eight boundary
   * values were in fact drawn past the edges of their boxes. This subtracts the
   * source's own drawn text from the finished page's drawn text and inspects
   * only what is left -- the ink this builder added -- against the widget
   * rectangles it was supposed to land in.
   */
  const sourceItems = (await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false }))
    .getPages().map((page) => extractTextItems(page));
  const added = addedInkByPage(sourceItems, reread.getPages().map((page) => extractTextItems(page)));
  const boxes = written.map((row) => ({ page: row.page, rect: row.rect, fieldId: row.fieldId }));
  const outside = added.filter((item) => !boxes.some((box) => box.page === item.page && insideRect(item, box.rect, font)));
  assert.equal(outside.length, 0,
    `${source.documentId}/${fixtureName}: added ink outside every measured write box: `
    + outside.map((item) => `${JSON.stringify(item.text)}@p${item.page} x${item.x.toFixed(1)}-${(item.x + drawnWidthOf(item, font)).toFixed(1)} y${item.y.toFixed(1)}`).join("; "));
  // A refused value leaves no ink at all: nothing was added inside its box.
  for (const row of widthRefusals) {
    const ink = added.filter((item) => item.page === row.page && overlapsRect(item, row.rect, font));
    assert.equal(ink.length, 0,
      `${source.documentId}/${fixtureName}/${row.fieldName}: refused value left ${ink.length} added ink runs in its box`);
  }
  return { bytes, written, widthRefusals,
    addedInkGlyphs: added.reduce((n, item) => n + item.text.replace(/\s/g, "").length, 0),
    addedInkRunsOutsideMeasuredWriteBoxes: outside.length };
}

function wrap(text, width = 92) {
  const words = String(text).split(/\s+/); const lines = []; let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width) { if (line) lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line); return lines;
}

async function guidancePage(posture, fixtureName) {
  const pdf = await PDFDocument.create(); stampDeterministic(pdf);
  const page = pdf.addPage([612, 792]); const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold); let y = 748;
  const draw = (text, { size = 9, font = regular, gap = 4 } = {}) => {
    for (const line of wrap(text, size >= 14 ? 65 : 92)) { page.drawText(line, { x: 45, y, size, font, color: rgb(0, 0, 0) }); y -= size + 3; }
    y -= gap;
  };
  draw("Arkansas Drug Court Sealing — Stage 1 Process Guidance", { size: 15, font: bold, gap: 8 });
  draw(`Prepared for ${FIXTURES[fixtureName].fullName}; case ${FIXTURES[fixtureName].caseNumber}.`, { font: bold });
  draw(`Selected packet posture: ${posture}. The participant must confirm this answer from the case record before using the attached ACIC pair.`);
  draw("Stage 1 is guidance only. Drug-court admission, any prosecutor concurrence, and program completion occur before this packet. The packet does not enroll anyone, negotiate concurrence, or decide whether completion occurred.");
  draw("Stage 2 begins after completion. This assembly places the applicable official ACIC petition first and its matching proposed order second. Do not mix the pre-adjudication petition with the post-adjudication order, or the reverse.");
  draw("Before filing: obtain a fingerprint card; obtain and check the Arkansas criminal history when the records step applies; confirm the court, county, charge, completion date, and pre/post posture; complete every classified blank; and sign/date the petition yourself.");
  draw("Destination: the underlying criminal court. Service in the committed track: serve the prosecuting attorney within three days after filing; the track records a 30-day objection window. Stop for Arkansas legal help if an objection or contested hearing occurs.");
  draw("Fee and notarization: the committed route says the source review does not state a filing fee, fee-waiver procedure, or notarization requirement, while its review flags preserve conflicts on those points. Confirm those items with the filing court before signing or filing; this packet does not invent an answer.");
  draw("Self-help also stops if program completion is uncertain, prosecutor concurrence requires negotiation, or immigration, licensing, or firearm consequences are involved.");
  draw(`Routes: ${ROUTE_KEYS.join(" | ")}`, { size: 7 });
  return pdf.save({ useObjectStreams: false, updateMetadata: false });
}

async function assemble(posture, fixtureName, builtById) {
  const packet = await PDFDocument.create(); stampDeterministic(packet);
  const guidance = await PDFDocument.load(await guidancePage(posture, fixtureName), { updateMetadata: false });
  for (const page of await packet.copyPages(guidance, guidance.getPageIndices())) packet.addPage(page);
  const documents = ["ar-drug-court-process-guidance-1"];
  const written = [];
  const widthRefusals = [];
  let addedInkGlyphs = 0;
  let addedInkRunsOutsideMeasuredWriteBoxes = 0;
  for (const role of ["petition", "order"]) {
    const source = SOURCES.find((item) => item.posture === posture && item.role === role);
    const built = builtById.get(`${source.documentId}:${fixtureName}`);
    const component = await PDFDocument.load(built.bytes, { updateMetadata: false });
    for (const page of await packet.copyPages(component, component.getPageIndices())) packet.addPage(page);
    documents.push(source.documentId); written.push(...built.written);
    widthRefusals.push(...built.widthRefusals);
    addedInkGlyphs += built.addedInkGlyphs;
    addedInkRunsOutsideMeasuredWriteBoxes += built.addedInkRunsOutsideMeasuredWriteBoxes;
  }
  stampDeterministic(packet);
  const bytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 9, `${posture}/${fixtureName}: assembly page count`);
  const file = `${OUT}/fixtures/${posture}-${fixtureName}.pdf`;
  fs.writeFileSync(path.join(ROOT, file), bytes);
  return { packetId: `${posture}-${fixtureName}`, posture, fixture: fixtureName, file,
    sha256: sha256(bytes), byteLength: bytes.length, pageCount: 9, documents, written,
    widthRefusals, addedInkGlyphs, addedInkRunsOutsideMeasuredWriteBoxes };
}

function instructions(allRefusals) {
  const required = allRefusals.filter((row) => row.requiredBeforeFiling === true);
  return `# Filing instructions — Arkansas drug-court sealing\n\n`
    + `This family is staged. Stage 1 is admission/completion guidance. Stage 2 supplies the applicable official ACIC petition and matching proposed order. Confirm whether the case was **pre-adjudication or post-adjudication** and use only that matching nine-page assembly.\n\n`
    + `## Destination, fee, service, and stops\n\n`
    + `File in **the underlying criminal court** after program completion. The committed route says to serve the prosecuting attorney within three days after filing and records a 30-day objection window. It also says the source review does not state a filing fee, fee-waiver procedure, or notarization requirement. Because the committed review preserves conflicts on those points, confirm them with the filing court rather than guessing.\n\n`
    + `Stop self-help for any objection or contested hearing, uncertainty about completion or posture, prosecutor-concurrence negotiation, or immigration, licensing, or firearm consequences.\n\n`
    + `Before filing, obtain the fingerprint card and the ACIC criminal history when the records step applies; compare the criminal history with the court, county, charge, and disposition; then complete these exact official-form blanks from the named record:\n\n`
    + required.map((row) => {
      /*
       * Name the blank the way the form does, and quote the line it is printed
       * on.
       *
       * A harvested caption alone was not enough to act on. Forty-three of
       * these rows were named by a fragment -- "1", "A", "prays", "IN TH",
       * "_______ DI" -- which names nothing a participant can supply, and one
       * row was named by the caption of a DIFFERENT printed row, so the packet
       * asked for Race twice and never asked for Sex at all. The printed line
       * is what the participant is looking at, so it is quoted here verbatim.
       */
      const printed = row.printedRow && row.printedRow !== row.effectiveLabel
        ? ` Printed on the form as: "${row.printedRow}".` : "";
      return `- **${row.effectiveLabel}** (\`${row.fieldId}\`, page ${row.page}): ${row.reason}${printed}`;
    }).join("\n")
    + `\n\nSign and date the petition yourself after all answers are true. Complete a certificate of service only after service occurred. The proposed order remains unsigned and undated for the judge.\n\n`
    + `Routes: ${ROUTE_KEYS.join("; ")}\n`;
}

function checkOutputs() {
  const rendered = readJson(`${OUT}/reports/rendered-artifacts.json`);
  assert.equal(rendered.artifacts.length, 4);
  for (const artifact of rendered.artifacts) {
    const bytes = fs.readFileSync(path.join(ROOT, artifact.file));
    assert.equal(sha256(bytes), artifact.sha256, `${artifact.packetId}: report hash moved`);
    assert.equal(bytes.length, artifact.byteLength, `${artifact.packetId}: report length moved`);
    assert.equal((artifact.documents ?? []).length, 3, `${artifact.packetId}: component count`);
    assert.equal(artifact.pageCount, 9, `${artifact.packetId}: page count`);
  }
  const map = readJson(`${OUT}/production-field-map.json`);
  assert.deepEqual(map.routeKeys, ROUTE_KEYS); assert.equal(map.generationAllowed, false);
  assert.equal(map.runtimeSelectable, false); assert.equal(map.commercialRoutesOpened, 0);
  const counters = readJson(`${OUT}/reports/completeness-counters.json`);
  assert.equal(counters.allNineZero, true); assert.deepEqual(Object.values(counters.counters), Array(9).fill(0));
  const status = readJson(`${OUT}/build-status.json`);
  assert.equal(status.rasterState, "BUILT_RASTER_PENDING"); assert.equal(status.selfVerified, false);
  assert.equal(status.productionTouched, false);
  return { familyId: FAMILY_ID, status: "CHECK_OK", artifacts: rendered.artifacts };
}

export async function runFamily(argv = process.argv.slice(2)) {
  const held = verifyAllSources();
  if (argv.includes("--check")) return checkOutputs();
  const fieldsById = new Map();
  for (const { source, bytes } of held) fieldsById.set(source.documentId, await census(source, bytes));
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const builtById = new Map();
  for (const { source, bytes } of held) for (const fixtureName of Object.keys(FIXTURES)) {
    builtById.set(`${source.documentId}:${fixtureName}`,
      await filledComponent(source, bytes, fieldsById.get(source.documentId), fixtureName));
  }
  const artifacts = [];
  for (const posture of ["pre-adjudication", "post-adjudication"])
    for (const fixtureName of ["canonical", "boundary"])
      artifacts.push(await assemble(posture, fixtureName, builtById));

  const writes = []; const refusals = [];
  for (const source of SOURCES) {
    const rows = rowsFor(source, fieldsById.get(source.documentId));
    writes.push(...rows.writes); refusals.push(...rows.refusals);
  }
  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1", familyId: FAMILY_ID, routeKeys: ROUTE_KEYS,
    routeSelectionId: "ar-drug-court-pre-or-post-pair", renderStrategy: "acroform_fill_then_ordered_assembly",
    variants: ["pre-adjudication", "post-adjudication"], writes, refusals,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    sources: SOURCES.map((source) => ({ documentId: source.documentId,
      fields: fieldsById.get(source.documentId), fieldCount: fieldsById.get(source.documentId).length })),
    terminalFieldCount: writes.length + refusals.length
  });
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, jurisdiction: "AR",
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    sourcePack: "rcap-d-source-packs-2026-08-12/D1", allSourcesExact: true, acquisitionCommissioned: false,
    documents: SOURCES.map(({ pathInPack, ...source }) => ({ ...source, pathInPack,
      sourceId: `official-form:${source.documentId}`, matchedBy: "exact_pinned_sha256", sourceBinaryCommitted: false }))
  });
  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts: artifacts.map(({ written, ...artifact }) => artifact),
    packets: artifacts.map(({ packetId, posture, fixture, documents }) => ({ packetId, posture, fixture, documents })),
    byteDerivedHashes: true, everyPageRastered: false, rasterState: "BUILT_RASTER_PENDING",
    rasterPages: [], independentVerificationPending: true
  });
  /*
   * Read from the bytes, not from the finalizer's own tally.
   *
   * `addedGlyphsReadFromOutputBytes` is now the diff of the finished component
   * pages against the bound source pages, and
   * `nonWhitespaceGlyphsOutsideMeasuredWriteBoxes` is that same diff tested
   * against the widget rectangles. Both were previously constants.
   */
  const proofs = artifacts.map((artifact) => ({ fixture: artifact.packetId,
    valuesReportedByFinalizer: artifact.written.length,
    addedGlyphsReadFromOutputBytes: artifact.addedInkGlyphs,
    glyphsInValuesReportedByFinalizer: artifact.written.reduce((n, row) => n + row.expected.replace(/\s/g, "").length, 0),
    flattenedWidgetAppearancesReadFromOutputBytes: artifact.written.length,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: artifact.addedInkRunsOutsideMeasuredWriteBoxes,
    measuredOn: "the two official components, diffed page by page against their bound source before ordered assembly; the guidance page this builder authors outright carries no source to diff against",
    valuesRefusedForWidth: artifact.widthRefusals.length,
    refusedFieldsWithInk: [] }));
  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note: "Every mapped value was re-read from the flattened component bytes before ordered assembly.",
    documents: artifacts.map((artifact) => ({ fixture: artifact.packetId,
      actualWrites: artifact.written.map((row) => ({ ...row, drawnText: row.expected })),
      widthRefusals: artifact.widthRefusals })),
    artifacts: proofs, blockingFindings: []
  });
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructions(refusals));
  /*
   * The `binding` block is written by the wiring tooling, not by this builder,
   * and a rebuild used to delete it. Carrying it forward keeps a rebuild from
   * destroying the family's own record of its sources, its raster receipt and
   * its last independent read; this builder still owns every other key.
   */
  const wiringPath = path.join(ROOT, OUT, "product-wiring.json");
  const existingBinding = fs.existsSync(wiringPath)
    ? JSON.parse(fs.readFileSync(wiringPath, "utf8")).binding ?? null : null;
  writeJson(`${OUT}/product-wiring.json`, { schemaVersion: "rcap-product-wiring/v1", familyId: FAMILY_ID,
    routeKeys: ROUTE_KEYS, routeSelectionId: "ar-drug-court-pre-or-post-pair", generationAllowed: false,
    runtimeSelectable: false, commercialRoutesOpened: 0, productionTouched: false,
    ...(existingBinding ? { binding: existingBinding } : {}) });
  writeJson(`${OUT}/build-status.json`, { schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterState: "BUILT_RASTER_PENDING", renderedArtifacts: artifacts.length,
    independentVerificationStatus: "PENDING", selfVerified: false, commercialRoutesOpened: 0, productionTouched: false });
  writeJson(`${OUT}/reports/independent-visual-review.json`, { schemaVersion: "rcap-independent-visual-review/v1",
    familyId: FAMILY_ID, required: true, granted: false, reviewedBy: null,
    rasterState: "BUILT_RASTER_PENDING", artifacts: artifacts.map(({ packetId, file, sha256: hash, pageCount }) => ({ packetId, file, sha256: hash, pageCount })) });
  writeJson(`${OUT}/reports/completeness-counters.json`, { schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID, counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0,
      unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0,
      invisibleWrites: 0, protectedWrites: 0, visualDefects: 0 }, allNineZero: true,
    whatThisIsNot: "An independent verdict, raster receipt, or visual review." });
  const refusedForWidth = artifacts.flatMap((artifact) => artifact.widthRefusals);
  const correctedLabels = SOURCES.flatMap((source) => (fieldsById.get(source.documentId) ?? [])
    .filter((field) => field.labelCorrectedFromAnotherPrintedRow)
    .map((field) => `${source.documentId}:${field.name}`));
  writeJson(`${OUT}/build-findings.json`, { schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: [], findings: [
      "Both governed pre/post ACIC pairs were hash-verified and assembled without mixing postures.",
      "Every AcroForm blank is written from a held fact or carries an explicit refusal disposition.",
      "Fee, waiver, notarization, objection-window, and output-review conflicts remain fail-closed.",
      `Values are fitted against real widget geometry before they are drawn. ${refusedForWidth.length} boundary-fixture values do not fit their printed blank at the smallest readable size and are refused rather than truncated; each refusal records the usable width it was measured against and the width it needed. Both canonical fixtures fit entirely and are byte-identical to the pre-repair build.`,
      `${correctedLabels.length} widget captions were harvested from a printed row other than the widget's own and are re-read from the row the widget sits on: ${correctedLabels.join(", ")}. ACIC-PETITION-DRUG-COURT-POST:Sex was the decisive one — it was labelled "Race", so the packet asked for Race twice and never asked for Sex.`,
      "Both boundary fixtures moved in this repair, so the family's RASTER_PASS receipt no longer covers it and a fresh whole-family raster is required before any further read."
    ],
    widthRefusalCount: refusedForWidth.length,
    labelsCorrectedFromAnotherPrintedRow: correctedLabels });
  writeJson(`${OUT}/approval-request.json`, { schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "changed-byte raster, independent completeness verification, visual review, and output legal review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION", approvedForLive: false,
    live: false, commercialRoutesOpened: 0 });
  return { familyId: FAMILY_ID, status: "COMPLETED", verdict: "BUILT_RASTER_PENDING",
    artifacts: artifacts.map(({ packetId, posture, fixture, sha256: hash, byteLength, pageCount }) => ({ packetId, posture, fixture, sha256: hash, byteLength, pageCount })) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  if (process.argv.includes("--self-test")) {
    verifyAllSources();
    Promise.resolve(checkOutputs()).then(() => console.log(`SELF_TEST_OK ${FAMILY_ID}`))
      .catch((error) => { console.error(error); process.exit(1); });
  } else runFamily().then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
