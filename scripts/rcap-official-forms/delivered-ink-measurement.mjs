/**
 * DELIVERED-INK MEASUREMENT FOR OFFICIAL-FORM PACKETS, AND THE FLATTEN REPAIRS
 * THAT HAVE TO HAPPEN BEFORE IT.
 *
 * Extracted verbatim from scripts/build-census-v1-al-trafficking-set.mjs, which
 * carried the only working copy in the Alabama group. Its sibling
 * al-felony-dwop-set published `addedGlyphsReadFromOutputBytes: 0`,
 * `nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0` and `refusedFieldsWithInk:
 * []` as TYPED LITERALS beside a `flattenedWidgetAppearancesReadFromOutputBytes`
 * that merely republished the write count -- four numbers that read as findings
 * and were never readings. VF01 measured the truth with the factory's own
 * classify-flattened-widget-appearances.mjs: 403 added glyphs in canonical, 653
 * in boundary, against a published 0.
 *
 * A typed literal is not a measurement and must not be left asserting one. So
 * the measurement lives here once, and every family that binds an official PDF
 * can read its own delivered bytes with it instead of declaring what it hopes
 * it wrote.
 *
 * WHAT IT CANNOT SEE. Everything here counts GLYPHS. `pdftotext` and this
 * reader alike still find a glyph that is sitting underneath an opaque box, and
 * a white fill draws no glyph of its own, so no counter in this file can see
 * occlusion. That is what printed-source-ink-survival.mjs is for. The two are
 * complements: this one answers "was the value drawn where it belongs", that
 * one answers "is the form's own ink still there".
 */
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { extractTextItems } from "./rcap-pdf-anchor-capture.mjs";
import { normalizeInvertedWidgetRectangles } from "./rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFNumber, PDFArray, PDFRef, PDFRawStream, StandardFonts } = require("pdf-lib");

/*
 * THE REPAIR. A WIDGET RECTANGLE MUST BE NORMALIZED BEFORE IT IS USED AS AN
 * ORIGIN, AND pdf-lib DOES NOT NORMALIZE IT.
 *
 * CR-65 Rev. 10/2024 stores Check Box10.2's /Rect as
 * [45.317, 623.137, 56.5341, 608.779] -- diagonally opposite corners in the
 * order upper-left, lower-right rather than lower-left, upper-right. PDF
 * 32000-1 7.9.5 expressly permits that ("it is acceptable to specify any two
 * diagonally opposite corners") and expressly requires the consumer to
 * normalize ("applications ... shall be prepared to normalize such rectangles
 * in situations where specific corners are important").
 *
 * pdf-lib 1.17.1 does not. PDFArray.asRectangle() takes Rect[0], Rect[1] as the
 * origin unconditionally, and PDFForm.flatten() emits
 * `translate(rectangle.x, rectangle.y)` from it. For this widget that is
 * translate(45.317, 623.137) -- the TOP of the box -- so the flattened
 * appearance, whose body is `1 g / 0 0 11.2171 14.3578 re / f`, an opaque white
 * fill, landed one box height (14.358 pt) above the control it belongs to, on
 * top of the running text of a Section III eligibility ground. It partially
 * erased the word "expired" on the face of a sworn petition. VF01 measured it
 * in the delivered pixels and located it in the delivered content stream; the
 * fleet-wide scan in
 * data/rcap-grade-a/packet-factory-24h/INVERTED_WIDGET_RECTANGLES.json names
 * this exact widget, this exact rectangle and misplacementPoints y 14.358.
 *
 * So the rectangle is normalized here, before anything reads it as an origin --
 * before the appearance update, before the flatten, and before this build
 * records each widget's rectangle for its own delivered-ink measurement. The
 * corners are the same two corners; only their storage order changes, which is
 * the reading the specification requires. No appearance stream, no value and no
 * election is touched, and the count of rectangles this moves is asserted so
 * the repair cannot quietly grow.
 *
 * THE NORMALIZER ITSELF IS NEITHER NEW NOR MINE. This repository already
 * carries one -- `normalizeInvertedWidgetRectangles` in
 * scripts/rcap-official-forms/rcap-active-content.mjs -- written for exactly
 * this rectangle, citing the same clause, and already switched on by
 * al-felony-nonconviction-90-set and al-pardoned-felony-set through their
 * `normalizeInvertedWidgetRects` config flag. Shipping a second implementation
 * of one repair is how two implementations drift, so this delegates to that
 * one and keeps only the shape its callers want back.
 *
 * rcap-active-content.mjs is NOT modified. Its flag still defaults to false --
 * deliberately, so that a repair lane holding one family cannot decide what
 * another family's next rebuild produces -- and nothing here moves any bytes
 * but this caller's.
 */
export function normalizeWidgetRectangles(document, form) {
  return normalizeInvertedWidgetRectangles(document, form).normalized;
}

/*
 * pdf-lib's form.flatten() deletes the field objects but leaves the page
 * /Annots array naming object numbers that no longer resolve, and a reader that
 * follows them reports "Invalid XRef entry". Detaching the dead references is
 * what keeps the delivered file readable.
 */
export function pruneDanglingAnnots(document) {
  let removed = 0;
  for (const page of document.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    const before = removed;
    const keep = annots.asArray().filter((entry) => {
      const resolved = entry instanceof PDFRef ? document.context.lookup(entry) : entry;
      if (resolved) return true;
      removed += 1;
      return false;
    });
    if (removed === before) continue;
    if (keep.length === 0) page.node.delete(PDFName.of("Annots"));
    else page.node.set(PDFName.of("Annots"), document.context.obj(keep));
  }
  return removed;
}

export const inkKey = (item) => `${item.text}@${item.x.toFixed(1)},${item.y.toFixed(1)}`;

/*
 * The baseline this measurement subtracts.
 *
 * An official form prints its own rules, captions and boundary text, and a
 * widget rectangle routinely sits on top of some of it — CR-65's page-1 caption
 * boxes overlap the printed county rule, and the C-10 income table's cells sit
 * inside their printed grid. A reader that counts every glyph inside a
 * rectangle therefore reports the FORM's ink as the BUILD's ink, and every
 * blank field on the paper looks written on. The first run of this measurement
 * did exactly that and reported 145 refused fields carrying ink.
 *
 * So the question asked of the delivered bytes is not "is there ink here" but
 * "is there ink here that the blank form does not print". The baseline is the
 * same binary driven through the same appearance-update, flatten and prune
 * pipeline with no value set and no box elected, so anything the comparison
 * surfaces was added by this build and nothing the form prints can be mistaken
 * for a write.
 */
export async function baselineInk(source) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const font = await document.embedFont(StandardFonts.Helvetica);
  // The baseline must be the same paper as the fill, or the subtraction is
  // between two different geometries and every rectangle that moved reads as a
  // write. Normalized here for the same reason and by the same helper.
  normalizeWidgetRectangles(document, form);
  form.updateFieldAppearances(font);
  form.flatten();
  pruneDanglingAnnots(document);
  const bytes = Buffer.from(await document.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return reopened.getPages().map((page) => new Set(extractTextItems(page).map(inkKey)));
}

/*
 * HOW MANY FLATTENED WIDGET APPEARANCES DO THE DELIVERED BYTES ACTUALLY PLACE?
 *
 * This module used to publish `flattenedWidgetAppearancesReadFromOutputBytes`,
 * computed as (boxes this build INTENDED to ink) minus (writes the delivered
 * bytes draw no glyph for). The subtrahend is a reading. The minuend is not: it
 * is the build's own intent, so the counter was intent minus a reading,
 * published under a name that asserts a reading of the output bytes -- and 31
 * and 30 are what it published while the output bytes place 216. A reader
 * taking that number at face value concludes 185 of the two forms' widgets were
 * never flattened. All 216 were. VF52 read the placements out of the delivered
 * content streams and named the counter as a number that reads as a finding and
 * is not.
 *
 * The repair is a name and a denominator, not a change to any packet byte.
 * Both quantities are now published, each under a name that says which it is:
 *
 *   intendedInkFieldsWhoseInkWasFoundInOutputBytes / intendedInkFields
 *      -- the old quantity, correctly named, carrying its denominator.
 *   flattenedWidgetAppearancePlacementsReadFromOutputBytes
 *      -- this reading: `q <cm...> /FlatWidget-N Do` placements counted in the
 *         decoded page content streams of the delivered file, credited only
 *         where the page's own /XObject resources declare that name.
 *
 * The predicate matches pdf-flattened-widgets.mjs deliberately, so two readers
 * of the same bytes do not disagree: the name must be one the finalizer emits.
 * `/<anything> Do` would also count a source's scanned page images as ink this
 * build added, which is the over-count FLATTENED_WIDGET_OVERCOUNT.json records.
 *
 * residualWidgetAnnotationsInDeliveredBytes is the companion the placement
 * count needs to mean "flattening finished": a widget annotation still present
 * in the delivered file is a control that was never flattened at all.
 */
const inflateOrPassThrough = (buffer) => { try { return zlib.inflateSync(buffer); } catch { return buffer; } };

function readFlattenedWidgetAppearances(pdf) {
  const ctx = pdf.context;
  const perPage = [];
  let placements = 0;
  let xObjects = 0;
  let residualWidgetAnnots = 0;
  for (const page of pdf.getPages()) {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjectDict = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    const declared = xObjectDict ? ctx.lookup(xObjectDict) : null;
    if (declared) {
      for (const key of declared.keys()) {
        if (/^\/(?:FlatWidget|ExactFactOverlay)-\d+$/.test(key.asString())) xObjects += 1;
      }
    }

    const contents = page.node.get(PDFName.of("Contents"));
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    let stream = "";
    for (const ref of refs) {
      const raw = ctx.lookup(ref);
      if (raw instanceof PDFRawStream) stream += inflateOrPassThrough(Buffer.from(raw.contents)).toString("latin1");
    }

    let onThisPage = 0;
    const placement = /q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/((?:FlatWidget|ExactFactOverlay)-\d+)\s+Do/g;
    let match;
    while ((match = placement.exec(stream))) {
      if (declared && declared.has(PDFName.of(match[2]))) onThisPage += 1;
    }
    perPage.push(onThisPage);
    placements += onThisPage;

    const annots = page.node.Annots()?.asArray() ?? [];
    for (const ref of annots) {
      const annot = ctx.lookup(ref);
      if (annot?.get?.(PDFName.of("Subtype"))?.asString?.() === "/Widget") residualWidgetAnnots += 1;
    }
  }
  return { placements, xObjects, perPage, residualWidgetAnnots };
}

export async function proveDeliveredInk(packetBytes, pageManifest, baselines, mode = {}) {
  const subtractBaseline = mode.subtractBaseline !== false;
  const singleAssignment = mode.singleAssignment !== false;
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const itemsByPage = pdf.getPages().map((page) => extractTextItems(page));
  const flatten = readFlattenedWidgetAppearances(pdf);

  const inside = (item, rect) =>
    item.x >= rect.x - 1.5 && item.x <= rect.x + rect.width + 1.5 &&
    item.y >= rect.y - 3.5 && item.y <= rect.y + rect.height + 3.5;

  const invisibleWrites = [];
  const refusedFieldsWithInk = [];
  const incompleteValues = [];
  let glyphsInWriteBoxes = 0;
  let baselineGlyphsIgnored = 0;
  let addedGlyphsOutsideAnyFieldRect = 0;

  /*
   * ONE GLYPH BELONGS TO ONE FIELD.
   *
   * C-10-CRIMINAL's own widgets overlap: "Date of Birth" (Text4, x 441.8-561.2,
   * y 449.4-465.1) sits inside "Spouse's Full Name (if married)" (x 197.2-561.5,
   * y 442.7-452.3), because the official form draws the date-of-birth box at the
   * end of the Full Name line and the spouse line's box runs the full width
   * underneath it. A reader that credits a glyph to every rectangle containing
   * it therefore reports the correctly-written date of birth as ink on the
   * refused spouse-name field, which is exactly what the first differential run
   * of this measurement did on all four packets.
   *
   * So each added glyph is assigned to exactly one field: the SMALLEST
   * rectangle containing it, which is the most specific claim any field can make
   * on that position. A glyph inside no field's rectangle is counted separately
   * rather than dropped, because ink outside every measured box is its own
   * question and must not vanish into a pass.
   */
  const boxesWithRects = pageManifest.boxes.filter((box) => box.rect);
  const assigned = new Map(boxesWithRects.map((box) => [box.fieldId, []]));

  for (const [pageIndex, items] of itemsByPage.entries()) {
    const onPage = boxesWithRects.filter((box) => box.packetPage === pageIndex + 1);
    if (onPage.length === 0) continue;
    const printed = baselines[onPage[0].documentId]?.[onPage[0].page - 1] ?? new Set();
    for (const item of items) {
      if (subtractBaseline && printed.has(inkKey(item))) { baselineGlyphsIgnored += 1; continue; }
      const containing = onPage.filter((box) => inside(item, box.rect));
      if (containing.length === 0) { addedGlyphsOutsideAnyFieldRect += item.text.replace(/\s+/g, "").length; continue; }
      if (!singleAssignment) {
        // The pre-repair reader: every rectangle containing the glyph claims it.
        for (const box of containing) assigned.get(box.fieldId).push(item);
        continue;
      }
      let best = null;
      let bestArea = Infinity;
      for (const box of containing) {
        const area = box.rect.width * box.rect.height;
        if (area < bestArea) { best = box; bestArea = area; }
      }
      assigned.get(best.fieldId).push(item);
    }
  }

  for (const box of boxesWithRects) {
    const added = (assigned.get(box.fieldId) ?? []).slice().sort((a, b) => a.x - b.x);
    const ink = added.map((item) => item.text).join("").replace(/\s+/g, "");

    if (box.expectInk) {
      if (ink.length === 0) {
        invisibleWrites.push({
          fieldId: box.fieldId, packetPage: box.packetPage,
          why: "the delivered bytes draw no glyph inside this field's rectangle that the blank form does not already print"
        });
      } else {
        glyphsInWriteBoxes += ink.length;
      }
      if (box.expectText) {
        const want = box.expectText.replace(/\s+/g, "");
        if (!ink.includes(want)) {
          incompleteValues.push({ fieldId: box.fieldId, packetPage: box.packetPage, held: box.expectText, readBackFromDeliveredBytes: ink });
        }
      }
    } else if (ink.length > 0) {
      refusedFieldsWithInk.push({ fieldId: box.fieldId, packetPage: box.packetPage, addedInk: ink });
    }
  }

  return {
    pagesRead: pdf.getPageCount(),
    fieldsMeasured: pageManifest.boxes.filter((box) => box.rect).length,
    addedGlyphsReadFromOutputBytes: glyphsInWriteBoxes,
    intendedInkFields: pageManifest.boxes.filter((box) => box.expectInk).length,
    intendedInkFieldsWhoseInkWasFoundInOutputBytes: pageManifest.boxes.filter((box) => box.expectInk).length - invisibleWrites.length,
    flattenedWidgetAppearancePlacementsReadFromOutputBytes: flatten.placements,
    flattenedWidgetAppearanceXObjectsDeclaredInDeliveredPageResources: flatten.xObjects,
    flattenedWidgetAppearancePlacementsPerPage: flatten.perPage,
    residualWidgetAnnotationsInDeliveredBytes: flatten.residualWidgetAnnots,
    printedFormGlyphsInsideFieldRectsIgnored: baselineGlyphsIgnored,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: addedGlyphsOutsideAnyFieldRect,
    invisibleWrites,
    refusedFieldsWithInk,
    incompleteValues,
    proof: "each field's pre-flatten widget rectangle was re-read against the glyphs the finished packet actually draws, recursing through flattened Form XObjects, minus the glyphs the blank source prints inside the same rectangle"
  };
}

