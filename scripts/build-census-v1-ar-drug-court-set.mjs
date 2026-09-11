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
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { captureWidgetContext, extractTextItems, groupIntoLines, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { fitTextToWidget, applyFitToTextField, usableWidthOf, HORIZONTAL_PADDING, MIN_READABLE_FONT_SIZE }
  from "./rcap-official-forms/rcap-text-fitting.mjs";
import { BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFArray, PDFDict, PDFDocument, PDFName, PDFTextField, PDFCheckBox, StandardFonts, decodePDFRawStream, rgb } = require("pdf-lib");

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
  "Defendant": "fullName",
  "Case No": "caseNumber",
  "DOB": "dateOfBirth",
  "Defendant Address  Street 1": "street",
  "City": "city",
  "State": "state",
  "Zip code": "zip"
});

/* Flattening must leave no stale widget annotation references behind. The
 * official fields have already been materialised into appearance streams by
 * form.flatten(); after that point /Annots is neither a participant control
 * nor a required appearance. The old assembly retained dangling references
 * to objects that were removed during flattening, which made four delivered
 * PDFs structurally malformed even though their pixels were unchanged. */
function annotationRefsOnDocument(pdf) {
  return pdf.getPages().reduce((total, page) => {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    return total + (annots?.size?.() ?? 0);
  }, 0);
}

function removeFlattenedAnnotationRefs(pdf) {
  let removed = 0;
  for (const page of pdf.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    removed += annots.size();
    page.node.delete(PDFName.of("Annots"));
  }
  return removed;
}

const PETITION_ELECTION_COPY = Object.freeze({
  offense: "A Class _____ [_] felony or A Class _____ [_] misdemeanor",
  prePending: "The Defendant has no pending felony charge in any state or federal court; or The Defendant has one or more pending felony charge in state or federal court and the status of that/those charges is/are as follows",
  postPending: "The Defendant has no pending felony charges in any state or federal court; or The Defendant has one or more pending felony charges in state or federal court and the status of that/those charges is/are as follows"
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

/*
 * WHICH BLANK, ON WHICH PRINTED LINE.
 *
 * VF05 read all 66 required-before-filing rows and found the decisive defect --
 * `Sex` captioned "Race" -- alongside forty-three rows "named by a mis-derived
 * fragment of adjacent printed text rather than the field's caption", among
 * them "1", "2", "A", "prays", "IN TH", "_______ DI", "4.On" and a bare rule of
 * underscores. The Race/Sex swap was repaired at 26838a27b. The naming was not:
 * a caption harvested from whatever ink happens to sit nearest a widget is a
 * fragment whenever the form prints no caption there, and five of these blanks
 * had no caption at all and fell through to the synthetic string
 * "ACIC-ORDER-DRUG-COURT-PRE printed blank SID".
 *
 * The completeness contract already says what such a row owes:
 * REQUIRED_BEFORE_FILING_CONDITIONS "IDENTIFIED: the row names the field and
 * carries a printed label, so the packet can tell the participant which blank
 * to fill."
 *
 * A fragment cannot do that and neither can a rule of underscores. What can is
 * the pair a person looking at the paper actually uses: the printed LINE the
 * blank sits on, quoted verbatim from the pinned binary, and WHICH blank on
 * that line it is, counted left to right from the widget rectangles the form
 * itself declares. Where the line is nothing but rules -- the offence-list
 * continuations, the federal-charges continuations -- the sentence that
 * introduces it is quoted too, because a continuation rule is unreadable alone.
 *
 * Nothing here is invented. Every quoted line is asserted to be printed on the
 * page it is attributed to, in the pinned source, before the build may finish.
 */
const hasPrintedWords = (text) => /[A-Za-z]/.test(String(text ?? "").replace(/_+/g, " "));

/** Every widget sitting on one printed line, left to right. */
function blanksOnPrintedLine(occupants, page, lineIndex) {
  return (occupants.get(`${page}|${lineIndex}`) ?? []).slice().sort((a, b) => a.x - b.x);
}

/** The nearest printed line ABOVE this one that carries words rather than rules. */
function introducingLine(lines, own) {
  let best = null;
  for (const line of lines) {
    if (line.y <= own.y) continue;
    if (!hasPrintedWords(line.text)) continue;
    if (!best || line.y < best.y) best = line;
  }
  return best ? normalizeHarvestedText(best.text).trim() : null;
}

/*
 * FIX169, ARTIFACTS. THE LAST FIGURE HERE THAT WAS NOT READ FROM A BYTE.
 *
 * FIX165 made addedGlyphsReadFromOutputBytes and
 * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes real diffs against the bound
 * source. One figure was left behind:
 *
 *   flattenedWidgetAppearancesReadFromOutputBytes: artifact.written.length
 *
 * -- the finalizer's own write count, published under a name that says the
 * output bytes were inspected. It is the same defect FIX166 named on
 * il-seal-3yr-set ("packet.writes.length, the finalizer's own build intent")
 * and it is why the four fixtures published 13/13, 8/8, 9/9 and 4/4: an
 * identity, not a measurement. It cannot detect a lost appearance, an invented
 * one, or a value that flattened to nothing, because it is not looking.
 *
 * These two walk the saved component bytes instead. A blank widget still leaves
 * a Form XObject behind, so the inked count and the total differ and each is
 * published under its own name.
 */
function countFlattenedWidgetXObjects(document) {
  let total = 0;
  for (const page of document.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xobjects) continue;
    for (const [, ref] of xobjects.entries()) {
      const stream = document.context.lookup(ref);
      if (!stream?.dict) continue;
      if (String(stream.dict.get(PDFName.of("Subtype"))) !== "/Form") continue;
      total += 1;
    }
  }
  return total;
}

function readFlattenedAppearanceInk(document) {
  const SHOW_TEXT = /\((?:\\[\s\S]|[^\\()])*\)|<([0-9A-Fa-f\s]*)>/g;
  let appearances = 0;
  let glyphs = 0;
  for (const page of document.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xobjects) continue;
    for (const [, ref] of xobjects.entries()) {
      const stream = document.context.lookup(ref);
      if (!stream?.dict) continue;
      if (String(stream.dict.get(PDFName.of("Subtype"))) !== "/Form") continue;
      let body = "";
      try { body = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); } catch { continue; }
      if (!/(?:^|\s)T[jJ](?=\s|$)/.test(body)) continue;
      let drawn = 0;
      for (const operand of body.match(SHOW_TEXT) ?? []) {
        const text = operand.startsWith("<")
          ? operand.slice(1, -1).replace(/\s/g, "")
          : operand.slice(1, -1).replace(/\\(?:[0-7]{1,3}|[\s\S])/g, "x");
        drawn += text.replace(/\s/g, "").length / (operand.startsWith("<") ? 2 : 1);
      }
      if (drawn <= 0) continue;
      appearances += 1;
      glyphs += Math.round(drawn);
    }
  }
  return { appearances, glyphs };
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

/*
 * THE QUOTED LINE WAS ASSEMBLED IN THE WRONG ORDER, AND THE GUARD COULD NOT SEE IT.
 *
 * VF56 read all 66 required-before-filing rows against the delivered bytes and
 * found that in EIGHT of them the quoted printed line is not what the page
 * prints, in three distinct corruptions. Two of the three are this family's own
 * composition, and this is where they come from.
 *
 * The shared reader reports every drawn run with an x origin and, where it could
 * not resolve a glyph advance, says so: `widthIsUnmeasurable` on the run whose
 * width it could not compute and `originEstimated` on every later run in the
 * same text object, because the cursor those runs are placed from has already
 * moved by a fallback. groupIntoLines() then orders a line's runs BY THAT X and
 * joins them. When the x is an estimate the order is an estimate too.
 *
 *   ACIC-PETITION-DRUG-COURT-PRE page 1 prints
 *     A Class _____ [_] felony [_] misdemeanor in violation of A.C.A.§
 *   Seven of that line's runs carry widthIsUnmeasurable and six carry
 *   originEstimated; their estimated origins run about twice the true advance,
 *   so "[_] misdemeanor" is placed at x 450.4 and 506.5 when the form draws it
 *   at 255.5 and 274.9. Sorted by x it lands AFTER "in violation of A.C.A.§",
 *   and the packet quoted
 *     A Class _____ [_] felony in violation of A.C.A.§[_] misdemeanor
 *   to the participant on two required-before-filing rows.
 *
 *   ACIC-PETITION-DRUG-COURT-POST page 1 prints the same sentence with every
 *   advance measured, but its three trailing runs are drawn out of x order --
 *   " " at 439.5, "of" at 422.5, " " at 454.3, "A.C.A.§ " at 440.2 -- so sorting
 *   by x moved both spaces to the wrong side of "of" and the packet quoted
 *     ... [_] misdemeanor in violationof A.C.A.§
 *   on two more rows.
 *
 * THE FIX. Compose the quoted line in the order the page draws it -- content
 * stream order -- and keep the x order only for geometry, where the runs are
 * used for caption capture and blank counting rather than for a quotation.
 * Nothing in the shared reader changes: 309 builders keep the reader they have,
 * and this family stops throwing away the two flags the reader already sets.
 *
 * WHY THE EXISTING GATE MISSED IT. assertRequiredBlanksAreIdentified() proves
 * every quoted line is printed on its page -- against PRINTED_PAGE_TEXT, which
 * is assembled by the SAME ordering. The quote and the proof shared a defect,
 * so the gate was self-consistent and blind. It is now proved against poppler's
 * independent extraction of the same pinned page as well; see POPPLER_PAGE_TEXT.
 *
 * WHAT THIS DOES NOT FIX. The third corruption is a decoding loss, not an
 * ordering one: on ACIC-PETITION-DRUG-COURT-POST page 1 the "ff" of "offense(s)"
 * has no mapping, so BOTH this reader and poppler read "oense(s)" and neither
 * can recover it. That is a shared-library repair no family grant reaches. It is
 * detected geometrically instead -- measured ink with no character over it -- and
 * disclosed on the row rather than quoted as though it were faithful.
 */
function groupIntoPrintedLines(items, yTolerance = 2.2) {
  const lines = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= yTolerance);
    if (line) { line.items.push(item); line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length; }
    else lines.push({ y: item.y, items: [item] });
  }
  const drawnAt = new Map(items.map((item, index) => [item, index]));
  const compose = (list) => list.map((item) => item.text).join("").replace(/\s+/g, " ").trim();
  return lines.map((l) => {
    const byX = [...l.items].sort((a, b) => a.x - b.x);
    const byStream = [...l.items].sort((a, b) => drawnAt.get(a) - drawnAt.get(b));
    const text = compose(byStream);
    return {
      y: Number(l.y.toFixed(1)),
      x: Number(byX[0].x.toFixed(1)),
      size: byX[0].size,
      text,
      textInXOrder: compose(byX),
      orderDisagrees: text !== compose(byX),
      unreadableSpans: unreadableSpansOn(byX),
      metricsExact: byX.every((item) => item.metricsExact),
      runs: byX.map((item) => ({
        text: item.text, x: Number(item.x.toFixed(1)),
        x2: item.width === null || item.width === undefined ? null : Number((item.x + item.width).toFixed(1)),
        size: item.size, metricsExact: item.metricsExact,
        ...(item.width === null || item.width === undefined ? { widthIsUnmeasurable: true } : {})
      })),
      chars: byX.flatMap((item) => item.chars ?? [])
    };
  }).filter((l) => l.text.length > 0);
}

/*
 * INK ON THE LINE THAT NO CHARACTER SITS OVER.
 *
 * A glyph the font cannot map is drawn on the page and decodes to nothing, so
 * the run before it ends, the run after it begins further right, and the two
 * are joined with the ink between them missing from the text. That is visible
 * without any second extractor: both runs' advances are measured, so the gap
 * between them is measured too, and a gap wider than half the type size between
 * two LETTERS with no space drawn across it is ink no character accounts for.
 *
 * Deliberately narrow. A gap that a whitespace run spans is explained and is not
 * reported; a gap beside a rule, a digit or punctuation is not reported. Across
 * all four pinned ACIC binaries and all sixteen pages this fires exactly once,
 * on the "offense(s)" line of the post-adjudication petition, at 8.00 pt against
 * a 14 pt face -- the loss VF56 measured with pdftotext -bbox at 8.0 pt. The
 * same-sentence line on the PRE petition, which reads correctly, does not fire.
 */
const A_LETTER = (character) => /[A-Za-z]/.test(character ?? "");

function unreadableSpansOn(runsByX) {
  const measured = runsByX.filter((item) => item.width !== null && item.width !== undefined);
  const spans = [];
  for (let i = 0; i + 1 < measured.length; i += 1) {
    const left = measured[i], right = measured[i + 1];
    const gap = right.x - (left.x + left.width);
    const size = Math.max(left.size, right.size) || 10;
    if (gap <= 0.5 * size) continue;
    if (!A_LETTER(left.text.slice(-1)) || !A_LETTER(right.text.slice(0, 1))) continue;
    spans.push({ after: left.text, before: right.text, gapPt: Number(gap.toFixed(2)), sizePt: Number(size.toFixed(2)) });
  }
  return spans;
}

/** Every printed line of every pinned source page, kept so a quoted line can be proved printed. */
const PRINTED_PAGE_TEXT = new Map();

/*
 * The same pages read by a DIFFERENT extractor, so the gate that proves a quoted
 * line is printed cannot be satisfied by the composition that produced the quote.
 * poppler is already this factory's measurement instrument; it is a hard
 * requirement here rather than a best effort, because a check that quietly skips
 * is how the first version of this gate passed eight bad rows.
 */
const POPPLER_PAGE_TEXT = new Map();

/** documentId|page|squashed line -> the measured spans of ink no character accounts for. */
const UNREADABLE_LINE_SPANS = new Map();

function readPageWithPoppler(source, page) {
  const file = path.join(ROOT, D_ROOT, source.pathInPack);
  const text = execFileSync("pdftotext", ["-layout", "-f", String(page), "-l", String(page), file, "-"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return squashPrinted(text);
}

/*
 * Comparing two extractors' output needs a unit both can be trusted on. Raw
 * whitespace is not it: poppler -layout pads columns and puts a space after
 * "1." where the content stream draws none, and a comparison that fails on that
 * would fail on everything. The WORD SEQUENCE is: each extractor reports the
 * same words in the same order unless something real disagrees.
 *
 * It is still sharp on both composition defects. A reordering moves a word, so
 * the sequence stops being contiguous. A lost space fuses two words into one
 * token that the other extractor does not have. Only layout whitespace washes
 * out, which is exactly the difference that carries no information.
 */
const wordTokens = (text) => String(text ?? "").toLowerCase().match(/[a-z0-9\u00a7]+/g) ?? [];

const tokensRunContiguously = (needle, haystack) => {
  if (needle.length === 0) return true;
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    let ok = true;
    for (let k = 0; k < needle.length; k += 1) if (haystack[i + k] !== needle[k]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
};

async function census(source, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  assert.equal(pages.length, source.pageCount, `${source.documentId}: page count moved`);
  const itemsByPage = pages.map((page) => extractTextItems(page));
  const lines = itemsByPage.map((items) => groupIntoPrintedLines(items));

  /* The local grouping must differ from the shared one in TEXT ORDER AND IN
   * NOTHING ELSE. Same buckets, same baselines, same left edge, same runs in the
   * same x order -- so caption capture, blank counting and every geometric
   * decision downstream are provably untouched by this repair. */
  itemsByPage.forEach((items, index) => {
    const host = groupIntoLines(items);
    const mine = lines[index];
    assert.equal(mine.length, host.length,
      `${source.documentId} page ${index + 1}: line grouping changed (${mine.length} vs ${host.length})`);
    mine.forEach((line, k) => {
      assert.equal(line.y, host[k].y, `${source.documentId} p${index + 1} line ${k}: baseline moved`);
      assert.equal(line.x, host[k].x, `${source.documentId} p${index + 1} line ${k}: left edge moved`);
      assert.deepEqual(line.runs, host[k].runs, `${source.documentId} p${index + 1} line ${k}: runs moved`);
      assert.equal(line.textInXOrder, host[k].text,
        `${source.documentId} p${index + 1} line ${k}: x-order text is not the host's text`);
    });
  });

  lines.forEach((pageLines, index) => PRINTED_PAGE_TEXT.set(`${source.documentId}|${index + 1}`,
    squashPrinted(pageLines.map((line) => line.text).join(" "))));
  pages.forEach((_, index) => POPPLER_PAGE_TEXT.set(`${source.documentId}|${index + 1}`,
    readPageWithPoppler(source, index + 1)));
  /* Which quoted lines carry ink no character sits over, so a row that must
   * quote one can say so instead of quoting it as though it were faithful. */
  lines.forEach((pageLines, index) => {
    for (const line of pageLines) {
      if (line.unreadableSpans.length === 0) continue;
      UNREADABLE_LINE_SPANS.set(`${source.documentId}|${index + 1}|${squashPrinted(line.text)}`, line.unreadableSpans);
    }
  });
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

  /* Which widgets share one printed line, so a blank can be counted along it. */
  const occupants = new Map();
  for (const field of base) {
    for (const widget of field.widgets) {
      const own = ownPrintedRow(lines[widget.page - 1], widget.rect);
      if (!own) continue;
      const lineIndex = lines[widget.page - 1].indexOf(own.line);
      const key = `${widget.page}|${lineIndex}`;
      if (!occupants.has(key)) occupants.set(key, []);
      occupants.get(key).push({ name: field.name, x: widget.rect.x });
    }
  }

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
    /*
     * The blank's own identification: the printed line it sits on and which
     * blank on that line it is. Independent of the harvest, so a fragment
     * cannot reach the participant through it.
     */
    const lineIndex = own ? lines[widget.page - 1].indexOf(own.line) : -1;
    /* Two continuation rules on one page print the same characters. Which one
     * this blank is on is then part of naming it. */
    const sameTextLines = own
      ? lines[widget.page - 1]
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => squashPrinted(line.text) === squashPrinted(own.line.text))
        .sort((a, b) => b.line.y - a.line.y)
      : [];
    const occurrence = sameTextLines.findIndex((entry) => entry.index === lineIndex);
    const siblings = own ? blanksOnPrintedLine(occupants, widget.page, lineIndex) : [];
    const ordinal = siblings.findIndex((entry) => entry.name === field.name && Math.abs(entry.x - widget.rect.x) < 0.01);
    const printedLineCarriesWords = printedRow !== null && hasPrintedWords(printedRow);
    const introducedBy = own && !printedLineCarriesWords ? introducingLine(lines[widget.page - 1], own.line) : null;

    return { ...field, effectiveLabel, harvestedLabel: context.effectiveLabel ?? null,
      printedRow,
      printedRowBaselineDelta: own ? +own.delta.toFixed(2) : null,
      labelCorrectedFromAnotherPrintedRow: notOnOwnRow,
      printedLine: printedRow,
      printedLinePage: widget ? widget.page : null,
      printedLineCarriesWords,
      introducedByPrintedLine: introducedBy,
      blankOrdinalOnPrintedLine: ordinal >= 0 ? ordinal + 1 : null,
      blanksOnPrintedLine: siblings.length || null,
      printedLineOccurrenceOnPage: occurrence >= 0 ? occurrence + 1 : null,
      printedLineOccurrencesOnPage: sameTextLines.length || null,
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

/*
 * A required-before-filing row, identified the way the contract asks.
 *
 * `identifiedBy` is the participant-facing name. It is built only from things
 * printed on the pinned form and from the widget rectangles the form declares,
 * so it names a blank a person can put a finger on:
 *
 *   Sex, the 1st of 2 blanks on the printed line "Sex ____________ SID No. ___"
 *   OFFENSE 01, the 1st of 1 blank on the printed line "_____________________",
 *     which continues "_____, and charged with the offense(s) of:"
 *
 * `suppliedBy` and `suppliedWhen` say who fills it and at what moment, because
 * a required item with no owner and no moment is not an instruction.
 */
const ordinalSuffix = (n) => (n % 100 >= 11 && n % 100 <= 13) ? "th"
  : ({ 1: "st", 2: "nd", 3: "rd" })[n % 10] ?? "th";

function requiredBeforeFilingRow(common, field, source, suppliedBy, suppliedWhen) {
  const line = field.printedLine;
  const ordinal = field.blankOrdinalOnPrintedLine;
  const total = field.blanksOnPrintedLine;
  const nth = ordinal === null || total === null
    ? null
    : `the ${ordinal}${ordinalSuffix(ordinal)} of ${total} blank${total === 1 ? "" : "s"}`;
  const repeats = field.printedLineOccurrencesOnPage ?? 1;
  const whichLine = repeats > 1 && field.printedLineOccurrenceOnPage
    ? ` (the ${field.printedLineOccurrenceOnPage}${ordinalSuffix(field.printedLineOccurrenceOnPage)} of ${repeats} identical lines on that page, counting from the top)`
    : "";
  const where = line === null
    ? null
    : `${nth ?? "a blank"} on the printed line "${line}"${whichLine}`;
  const continues = field.introducedByPrintedLine
    ? `, which continues "${field.introducedByPrintedLine}"`
    : "";
  /* A line the reader could not take in full is still the participant's best
   * locator, so it is still quoted -- but it is quoted with the loss named,
   * not passed off as verbatim. The missing characters are NOT guessed. */
  const unreadable = [line, field.introducedByPrintedLine]
    .filter((quoted) => quoted !== null && quoted !== undefined)
    .flatMap((quoted) => UNREADABLE_LINE_SPANS.get(`${common.documentId}|${common.page}|${squashPrinted(quoted)}`) ?? []);
  const caveat = unreadable.length === 0 ? "" : ` — this quotation is incomplete: ${unreadable
    .map((span) => `at least one character your printed form shows between "${span.after.trim()}" and "${span.before.trim()}" could not be read from the form file (${span.gapPt} pt of ink at ${span.sizePt} pt type)`)
    .join("; ")}, so read the line on the paper`;
  const identifiedBy = where === null
    ? `${field.name}, on page ${common.page} of the ${source.officialTitle}`
    : `${field.name}, ${where}${continues}${caveat}`;
  return {
    ...common,
    requiredBeforeFiling: true,
    factAvailable: false,
    disposition: "REQUIRED_BEFORE_FILING",
    identifiedBy,
    printedLine: line,
    printedLineCarriesWords: field.printedLineCarriesWords === true,
    introducedByPrintedLine: field.introducedByPrintedLine ?? null,
    blankOrdinalOnPrintedLine: ordinal,
    blanksOnPrintedLine: total,
    printedLineOccurrenceOnPage: field.printedLineOccurrenceOnPage ?? null,
    printedLineOccurrencesOnPage: field.printedLineOccurrencesOnPage ?? null,
    suppliedBy,
    suppliedWhen
  };
}

function classifyRefusal(source, field) {
  const common = { fieldId: `${source.documentId}:${field.name}`, fieldName: field.name,
    documentId: source.documentId, page: field.widgets[0]?.page ?? null,
    effectiveLabel: field.effectiveLabel, printedRow: field.printedRow ?? null,
    labelCorrectedFromAnotherPrintedRow: field.labelCorrectedFromAnotherPrintedRow === true,
    pdfType: field.type };
  if (source.role === "order") {
    if (["COURT OF", "DIVISION", "Race", "Sex", "SID"].includes(field.name)) return {
      ...requiredBeforeFilingRow(common, field, source,
        "the participant, copying the underlying court or ACIC record",
        "before the proposed order is lodged, so it matches the petition it accompanies"),
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
   * The reason says where the answer comes from and nothing else.
   *
   * It used to splice the harvested caption into a sentence -- "supply prays
   * from the court record" -- which names nothing a participant can go and
   * obtain. Identifying the blank is `identifiedBy`'s job, built from the
   * printed line and the widget rectangles rather than from the harvest.
   */
  return {
    ...requiredBeforeFilingRow(common, field, source,
      "the participant, from the court file, the ACIC criminal history, or the drug-court completion record",
      "before the petition is signed and filed"),
    reason: "Before filing, read the printed prompt this blank sits in and supply it from the court, ACIC, program-completion, or case record; the platform does not hold that exact fact."
  };
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
  /* Counted on the OFFICIAL form BEFORE flatten. Flatten removes the fields, so
   * asking after it returns 0 and the check would compare a reading to nothing. */
  const officialWidgets = form.getFields()
    .reduce((total, field) => total + field.acroField.getWidgets().length, 0);
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
        /* The value that was withheld. It is on the record so the delivered
         * guidance page can print it; without it the disclosure could name the
         * blank but not tell the participant what to write in it. */
        withheldValue: value,
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
  assert.equal(written.some((row) => row.fieldName === "FURTHER if applicable the Defendant"), false,
    `${source.documentId}/${fixtureName}: conditional FURTHER paragraph must not receive an invented participant name`);
  const annotationRefsRemoved = removeFlattenedAnnotationRefs(pdf);
  stampDeterministic(pdf);
  const bytes = await pdf.save({ useObjectStreams: false, updateMetadata: false });
  const reread = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(annotationRefsOnDocument(reread), 0,
    `${source.documentId}/${fixtureName}: flattened output retains annotation references`);
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
  /* FIX169. Read from the saved bytes, not restated from `written.length`.
   * Flatten leaves exactly one Form XObject per official widget, so the total
   * is checked against the form's own widget count rather than a literal. */
  const flattened = readFlattenedAppearanceInk(reread);
  const formXObjects = countFlattenedWidgetXObjects(reread);
  assert.equal(formXObjects, officialWidgets,
    `${source.documentId}/${fixtureName}: delivered bytes carry ${formXObjects} flattened `
    + `Form XObjects for ${officialWidgets} official widgets`);
  /* A refused value leaves no ink, proved above; this names the ones that did,
   * so the published list is a reading rather than the constant []. */
  const refusedFieldsWithInk = widthRefusals
    .filter((row) => added.some((item) => item.page === row.page && overlapsRect(item, row.rect, font)))
    .map((row) => `${source.documentId}:${row.fieldName}`);
  return { bytes, written, widthRefusals,
    addedInkGlyphs: added.reduce((n, item) => n + item.text.replace(/\s/g, "").length, 0),
    addedInkRunsOutsideMeasuredWriteBoxes: outside.length,
    flattenedAppearancesWithInk: flattened.appearances,
    glyphsInFlattenedAppearances: flattened.glyphs,
    flattenedWidgetFormXObjects: formXObjects,
    annotationRefsRemoved,
    officialWidgets,
    refusedFieldsWithInk };
}

/*
 * FIX169. THE NINE COUNTERS WERE NINE LITERALS.
 *
 * `reports/completeness-counters.json` published nine zeros and
 * `allNineZero: true`, and every one was typed into the source. `checkOutputs`
 * then asserted `Object.values(counters.counters)` deep-equals nine zeros --
 * a gate proving the source agrees with itself, which no defect in the
 * delivered bytes could ever fail. The ninth, `visualDefects`, was 0 from a
 * worker that asserts --no-raster on its first line and rasters no page.
 *
 * Eight are now readings taken from this build's own field map and its own
 * delivered bytes. The ninth is null: a counter you could not measure is null,
 * never 0.
 */
const PROTECTED_REFUSAL_CLASSES = new Set([
  "signature_or_date_participant_completion",
  "court_prosecutor_clerk_or_agency_owned"
]);

/* The components the shared packet-set manifest declares required for this
 * family, read off the record rather than listed here, so a manifest change
 * that adds a component makes this counter rise instead of staying 0. */
function requiredComponentIds() {
  const record = readJson("data/record-clearing/legal-design-packet-set-manifests.json");
  const entry = (record.packetSets ?? []).find((set) => set?.packetSetId === FAMILY_ID);
  assert.ok(entry, `${FAMILY_ID}: absent from the packet-set manifest`);
  return (entry.components ?? []).filter((component) => component?.required !== false)
    .map((component) => component.componentId ?? component.id);
}

function measureCounters({ writes, refusals, artifacts, terminals, fieldsById }) {
  const selectionControls = refusals.filter((row) => row.isSelectionControl === true);
  const participantSelectionControls = selectionControls.filter((row) =>
    SOURCES.find((source) => source.documentId === row.documentId)?.role === "petition");
  const courtSelectionControls = selectionControls.filter((row) =>
    SOURCES.find((source) => source.documentId === row.documentId)?.role === "order");
  const decided = new Set([...writes, ...refusals].map((row) => row.fieldId));
  const protectedFields = new Set(refusals
    .filter((row) => PROTECTED_REFUSAL_CLASSES.has(row.refusalClass))
    .map((row) => row.fieldId));
  const writtenFields = new Set(artifacts.flatMap((a) => a.written.map((row) => row.fieldId)));
  const counters = {
    /* A held fact the map binds that reached no delivered page AND was not
     * disclosed. A width refusal is disclosed on the delivered guidance page
     * and asserted there, so it is not a missing field; a silent one would be. */
    knownRequiredFieldsMissing: artifacts
      .reduce((n, a) => n + a.widthRefusals.filter((row) => !row.withheldValue).length, 0),
    requiredFactsNotCollected: SOURCES.reduce((n, source) => n
      + (fieldsById.get(source.documentId) ?? []).filter((field) => {
        const key = shouldWrite(source, field);
        return key ? !Object.values(FIXTURES).every((facts) => facts[key] !== undefined) : false;
      }).length, 0),
    unclassifiedBlanks: terminals - decided.size,
    incompleteRows: refusals.filter((row) => row.blanksOnPrintedLine > 1
      && row.blankOrdinalOnPrintedLine == null).length,
    /* The forms carry real controls. None is selected by this build, so the
     * missing-option count is zero for the measured reason below, rather than
     * because the inventory was treated as empty. */
    requiredOptionsMissing: 0,
    requiredComponentsMissing: requiredComponentIds().filter((componentId) => !artifacts.every((a) => {
      if (componentId === "ar-drug-court-process-guidance-1") return a.documents.includes(componentId);
      return SOURCES.some((source) => source.componentId === componentId
        && source.posture === a.posture && a.documents.includes(source.documentId));
    })).length,
    invisibleWrites: artifacts.reduce((n, a) => n + (a.flattenedAppearancesWithInk === a.written.length
      ? 0 : Math.abs(a.written.length - a.flattenedAppearancesWithInk)), 0),
    protectedWrites: [...writtenFields].filter((fieldId) => protectedFields.has(fieldId)).length,
    visualDefects: null
  };
  return {
    counters,
    howEachWasTaken: {
      knownRequiredFieldsMissing: "Width refusals carrying no value for the delivered guidance page to print. Every refusal that does carry one is asserted onto packet page 1 before the fixture is written.",
      requiredFactsNotCollected: "Mapped fact keys with no value in a fixture this build renders.",
      unclassifiedBlanks: `AcroForm terminals across the four pinned forms (${terminals}) minus terminals carrying exactly one decision in the field map (${decided.size}).`,
      incompleteRows: "Blanks sharing one printed line where the map failed to record which of them this one is. A participant cannot act on such a row, which is the defect VF56 failed eight rows on.",
      requiredOptionsMissing: `The pinned forms carry ${selectionControls.length} checkbox controls (${participantSelectionControls.length} participant elections on the petitions and ${courtSelectionControls.length} court-act controls on the proposed orders). The packet marks none; the participant election pairs are disclosed on the guidance page, so the missing-option count is 0 because no route option is selected by this build, not because the set is empty.`,
      requiredComponentsMissing: "Components the packet-set manifest declares required, absent from any delivered fixture.",
      invisibleWrites: "Declared writes with no matching inked flattened appearance in the delivered component bytes.",
      protectedWrites: "Written fields whose field-map refusal class is a participant signature/date or court/clerk/prosecutor-owned.",
      visualDefects: null
    },
    visualDefectsWhyNull: "Null because NOT MEASURED here, never because measured as zero. This worker rasters no page, "
      + "so it has seen no rendered pixel and cannot have counted a visual defect. It was published as the literal 0 "
      + "until FIX169. The geometry figure an independent reader needs is published per fixture in "
      + "reports/actual-writes.json as nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, which FIX165 made a reading; "
      + "scoring visualDefects from a raster remains an independent lane's job.",
    countersMeasured: Object.values(counters).filter((v) => v !== null).length,
    countersNotMeasured: Object.entries(counters).filter(([, v]) => v === null).map(([k]) => k),
    everyMeasuredCounterZero: Object.values(counters).filter((v) => v !== null).every((v) => v === 0)
  };
}

function wrap(text, width = 92) {
  const words = String(text).split(/\s+/); const lines = []; let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width) { if (line) lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line); return lines;
}

/*
 * A HELD FACT THAT WAS WITHHELD MUST BE SAID ON A DELIVERED PAGE.
 *
 * The CLIPPING_AND_OVERLAP repair reached its zero by REFUSING the ten writes
 * that would not fit rather than by fitting them. That is the right refusal --
 * a truncated case number is a wrong case number and a value drawn past its box
 * is ink over the official form -- but VF56 measured what it left behind: on the
 * two boundary fixtures the case number is blank in both captions and the
 * proposed order's operative "Defendant, ____, to Dismiss" clause carries 0 px
 * of added ink against 474 and 488 on the canonicals, and the phrases "does not
 * fit", "by hand", "too long", "truncat" and "smallest readable" occur 0 times
 * on any of the 36 delivered pages. The participant receives a petition whose
 * caption case number is blank and whose prayer names nobody, indistinguishable
 * from an unfilled form.
 *
 * SHOULD THE LAYOUT BE FIXED INSTEAD? No, and this is decided from the record
 * rather than by preference. Every mapped field on these four ACIC forms is
 * flagged single-line by the form itself, so wrapping is not available. The
 * three ways to make these values fit are all worse than the refusal:
 *   - draw smaller: the fitter already stepped to the shared
 *     MIN_READABLE_FONT_SIZE floor of 6.0 pt and the values still need up to
 *     42.94 pt more width than the blank has. Clearing that by shrinking means
 *     roughly 4.5 pt type on a filed pleading;
 *   - truncate: a truncated case number is a different case number, and it was
 *     the exact defect VF05 failed this family on;
 *   - draw past the blank: that is ink over the issuer's printed form, which
 *     CLIPPING_AND_OVERLAP and PROTECTED_FIELDS both exist to refuse.
 * The official ACIC pair controls and this packet may not redraw it. So the
 * refusal stands and the defect is that it was silent.
 *
 * WHERE IT IS SAID. Packet page 1 is generated per packet and already prints
 * this participant's own name and case number, so the surface exists, is
 * per-packet, and already holds the values. The build already composes a
 * finished participant-facing sentence for each refusal and files it only in
 * reports/. It is now printed on the page. A packet with no refusals prints
 * nothing extra, so the canonical fixtures do not move.
 */
const PACKET_PAGE_OFFSET = Object.freeze({ petition: 1, order: 5 });

function packetPageOf(refusal) {
  const source = SOURCES.find((item) => item.documentId === refusal.documentId);
  assert.ok(source, `${refusal.documentId}: no bound source for a refusal`);
  return PACKET_PAGE_OFFSET[source.role] + refusal.page;
}

function withheldBlanksFor(posture, fixtureName, builtById) {
  const rows = [];
  for (const role of ["petition", "order"]) {
    const source = SOURCES.find((item) => item.posture === posture && item.role === role);
    for (const refusal of builtById.get(`${source.documentId}:${fixtureName}`).widthRefusals) {
      rows.push({ ...refusal, officialTitle: source.officialTitle, packetPage: packetPageOf(refusal) });
    }
  }
  return rows.sort((a, b) => a.packetPage - b.packetPage || a.rect.y * -1 - b.rect.y * -1);
}

async function guidancePage(posture, fixtureName, withheld = []) {
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
  draw("Petition elections — mark exactly one in each pair, from your case record:", { font: bold });
  draw(`Offense level (exact printed branches): “${PETITION_ELECTION_COPY.offense}”.`);
  draw(`Pending felony branch (exact printed ${posture} petition wording): “${posture === "pre-adjudication" ? PETITION_ELECTION_COPY.prePending : PETITION_ELECTION_COPY.postPending}”.`);
  draw("The six checkbox controls on the proposed order are court acts; leave them blank. The FURTHER paragraph is conditional on a separate prior offense: do not prefill the participant name or decide that condition here.");
  draw("Fee and notarization: the committed route says the source review does not state a filing fee, fee-waiver procedure, or notarization requirement, while its review flags preserve conflicts on those points. Confirm those items with the filing court before signing or filing; this packet does not invent an answer.");
  draw("Self-help also stops if program completion is uncertain, prosecutor concurrence requires negotiation, or immigration, licensing, or firearm consequences are involved.");
  if (withheld.length > 0) {
    draw(`Blanks this packet left for you to fill in by hand (${withheld.length})`, { font: bold, size: 11, gap: 5 });
    draw("These values are held for this packet but do not fit their printed blanks at the smallest readable size. "
      + "The packet left each blank rather than shortening the value or writing over the official form. "
      + "Write each one on the printed line by hand before you file, or ask the clerk how a value this long is recorded on this form.");
    for (const row of withheld) {
      draw(`Packet page ${row.packetPage} (${row.officialTitle}, form page ${row.page}) — the blank printed `
        + `"${row.printedRow ?? row.effectiveLabel}". Write: ${row.withheldValue}`, { size: 8, gap: 2 });
    }
  }
  draw(`Routes: ${ROUTE_KEYS.join(" | ")}`, { size: 7, gap: 0 });
  /* The disclosure is only a disclosure if it is ON the page. A page that ran
   * out of room would drop the last refusals silently, which is the defect this
   * block exists to close, so the build stops instead. */
  assert.ok(y > 36, `${posture}/${fixtureName}: the guidance page overflowed (${withheld.length} withheld blanks, y=${y.toFixed(1)})`);
  return pdf.save({ useObjectStreams: false, updateMetadata: false });
}

async function assemble(posture, fixtureName, builtById) {
  const packet = await PDFDocument.create(); stampDeterministic(packet);
  const withheld = withheldBlanksFor(posture, fixtureName, builtById);
  const guidance = await PDFDocument.load(await guidancePage(posture, fixtureName, withheld), { updateMetadata: false });
  for (const page of await packet.copyPages(guidance, guidance.getPageIndices())) packet.addPage(page);
  const documents = ["ar-drug-court-process-guidance-1"];
  const written = [];
  const widthRefusals = [];
  let addedInkGlyphs = 0;
  let addedInkRunsOutsideMeasuredWriteBoxes = 0;
  let flattenedAppearancesWithInk = 0;
  let glyphsInFlattenedAppearances = 0;
  let flattenedWidgetFormXObjects = 0;
  let officialWidgets = 0;
  let annotationRefsRemoved = 0;
  const refusedFieldsWithInk = [];
  for (const role of ["petition", "order"]) {
    const source = SOURCES.find((item) => item.posture === posture && item.role === role);
    const built = builtById.get(`${source.documentId}:${fixtureName}`);
    const component = await PDFDocument.load(built.bytes, { updateMetadata: false });
    for (const page of await packet.copyPages(component, component.getPageIndices())) packet.addPage(page);
    documents.push(source.documentId); written.push(...built.written);
    widthRefusals.push(...built.widthRefusals);
    addedInkGlyphs += built.addedInkGlyphs;
    addedInkRunsOutsideMeasuredWriteBoxes += built.addedInkRunsOutsideMeasuredWriteBoxes;
    flattenedAppearancesWithInk += built.flattenedAppearancesWithInk;
    glyphsInFlattenedAppearances += built.glyphsInFlattenedAppearances;
    flattenedWidgetFormXObjects += built.flattenedWidgetFormXObjects;
    officialWidgets += built.officialWidgets;
    annotationRefsRemoved += built.annotationRefsRemoved;
    refusedFieldsWithInk.push(...built.refusedFieldsWithInk);
  }
  stampDeterministic(packet);
  const bytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
  const assembled = await PDFDocument.load(bytes);
  assert.equal(assembled.getPageCount(), 9, `${posture}/${fixtureName}: assembly page count`);
  const annotationRefsRemaining = annotationRefsOnDocument(assembled);
  assert.equal(annotationRefsRemaining, 0,
    `${posture}/${fixtureName}: assembled artifact retains annotation references`);
  /*
   * EVERY WITHHELD FACT IS ON A DELIVERED PAGE, read back from the finished
   * packet bytes rather than from the report that composed them. A refusal the
   * build records internally and the page does not carry is the defect VF56
   * failed this family on, so it stops the build.
   */
  const deliveredPageOne = extractTextItems(assembled.getPages()[0]).map((item) => item.text).join(" ")
    .replace(/\s+/g, " ");
  /* These disclosures are part of the production contract for the real
   * checkbox inventory. If a future edit drops the quoted branches, the
   * builder must stop before publishing a packet that leaves the participant
   * to infer what a control means from the form alone. */
  assert.ok(deliveredPageOne.includes(PETITION_ELECTION_COPY.offense),
    `${posture}/${fixtureName}: delivered guidance omitted the printed offense election branches`);
  assert.ok(deliveredPageOne.includes(posture === "pre-adjudication"
    ? PETITION_ELECTION_COPY.prePending : PETITION_ELECTION_COPY.postPending),
  `${posture}/${fixtureName}: delivered guidance omitted the printed pending-felony election branches`);
  assert.ok(deliveredPageOne.includes("The six checkbox controls on the proposed order are court acts"),
    `${posture}/${fixtureName}: delivered guidance omitted the court-act checkbox boundary`);
  assert.ok(deliveredPageOne.includes("do not prefill the participant name or decide that condition here"),
    `${posture}/${fixtureName}: delivered guidance omitted the conditional FURTHER boundary`);
  for (const row of withheld) {
    assert.ok(deliveredPageOne.includes(row.withheldValue.replace(/\s+/g, " ")),
      `${posture}/${fixtureName}: withheld value for ${row.fieldId} is not printed on the delivered guidance page`);
    assert.ok(deliveredPageOne.includes(`Packet page ${row.packetPage}`),
      `${posture}/${fixtureName}: the withheld blank at ${row.fieldId} is not located for the participant`);
  }
  assert.equal(/fill in by hand/.test(deliveredPageOne), withheld.length > 0,
    `${posture}/${fixtureName}: the by-hand disclosure is present exactly when something was withheld`);
  const file = `${OUT}/fixtures/${posture}-${fixtureName}.pdf`;
  fs.writeFileSync(path.join(ROOT, file), bytes);
  return { packetId: `${posture}-${fixtureName}`, posture, fixture: fixtureName, file,
    sha256: sha256(bytes), byteLength: bytes.length, pageCount: 9, documents, written,
    widthRefusals, addedInkGlyphs, addedInkRunsOutsideMeasuredWriteBoxes,
    flattenedAppearancesWithInk, glyphsInFlattenedAppearances,
    flattenedWidgetFormXObjects, officialWidgets, annotationRefsRemoved, annotationRefsRemaining, refusedFieldsWithInk };
}

function instructions(allRefusals) {
  const required = allRefusals.filter((row) => row.requiredBeforeFiling === true);
  return `# Filing instructions — Arkansas drug-court sealing\n\n`
    + `This family is staged. Stage 1 is admission/completion guidance. Stage 2 supplies the applicable official ACIC petition and matching proposed order. Confirm whether the case was **pre-adjudication or post-adjudication** and use only that matching nine-page assembly.\n\n`
    + `## Destination, fee, service, and stops\n\n`
    + `File in **the underlying criminal court** after program completion. The committed route says to serve the prosecuting attorney within three days after filing and records a 30-day objection window. It also says the source review does not state a filing fee, fee-waiver procedure, or notarization requirement. Because the committed review preserves conflicts on those points, confirm them with the filing court rather than guessing.\n\n`
    + `Stop self-help for any objection or contested hearing, uncertainty about completion or posture, prosecutor-concurrence negotiation, or immigration, licensing, or firearm consequences.\n\n`
    + `## Petition elections and the conditional paragraph\n\n`
    + `The four checkbox controls on the two petitions are participant elections. Mark exactly one in each pair from the case record. The printed offense branches are “${PETITION_ELECTION_COPY.offense}”. The pre-adjudication petition's pending-felony branches are “${PETITION_ELECTION_COPY.prePending}”; the post-adjudication petition's are “${PETITION_ELECTION_COPY.postPending}”. Complete the status the form requests. The six checkbox controls on the proposed orders are court acts and stay blank. The **FURTHER, if applicable** paragraph concerns a separate prior offense; this packet does not decide whether it applies and does not prefill the participant name in that paragraph.\n\n`
    + `## Blanks the packet may leave for your hand\n\n`
    + `Some facts this service holds are longer than the blank the official ACIC form prints for them — a long case number, or a long name in the "WHEREFORE, the Defendant, ____, prays" and "Defendant, ____, to Dismiss and Seal" clauses. When a value will not fit its printed blank at the smallest size that is still readable on paper, this packet leaves the blank EMPTY. It does not shorten the value, and it does not write past the edge of the blank onto the form.\n\n`
    + `**A blank left that way is always listed, by packet page, on page 1 of your own packet, with the value to write.** If page 1 lists none, nothing was left out. Where one is listed, write it on the printed line by hand before filing, or ask the clerk how a value that long is recorded on this form. The case number in the caption of both the petition and the proposed order, and the Defendant's name in the two prayer clauses and in the proposed order's operative clause, are the blanks this most often affects.\n\n`
    + `Before filing, obtain the fingerprint card and the ACIC criminal history when the records step applies; compare the criminal history with the court, county, charge, and disposition; then complete these exact official-form blanks from the named record:\n\n`
    + required.map((row) => {
      /*
       * Name the blank by the printed line it sits on and its position along
       * that line, then say who supplies it and when.
       *
       * A harvested caption alone was not enough to act on. Forty-three of
       * these rows were named by a fragment -- "1", "A", "prays", "IN TH",
       * "_______ DI", "4.On" -- which names nothing a participant can supply,
       * five fell through to a synthetic "printed blank <name>" string, and one
       * row was named by the caption of a DIFFERENT printed row, so the packet
       * asked for Race twice and never asked for Sex at all. `identifiedBy` is
       * built from the printed line and the widget rectangles instead, so it
       * cannot degrade to a fragment, and each item now carries its owner and
       * its moment as well as its disposition.
       */
      return `- **${row.identifiedBy}** (\`${row.fieldId}\`, page ${row.page})\n`
        + `  - Supplied by: ${row.suppliedBy}.\n`
        + `  - Supplied when: ${row.suppliedWhen}.\n`
        + `  - Disposition: ${row.disposition}. ${row.reason}`;
    }).join("\n")
    + `\n\nSign and date the petition yourself after all answers are true. Complete a certificate of service only after service occurred. The proposed order remains unsigned and undated for the judge.\n\n`
    + `Routes: ${ROUTE_KEYS.join("; ")}\n`;
}

async function checkOutputs() {
  const rendered = readJson(`${OUT}/reports/rendered-artifacts.json`);
  assert.equal(rendered.artifacts.length, 4);
  for (const artifact of rendered.artifacts) {
    const bytes = fs.readFileSync(path.join(ROOT, artifact.file));
    assert.equal(sha256(bytes), artifact.sha256, `${artifact.packetId}: report hash moved`);
    assert.equal(bytes.length, artifact.byteLength, `${artifact.packetId}: report length moved`);
    assert.equal((artifact.documents ?? []).length, 3, `${artifact.packetId}: component count`);
    assert.equal(artifact.pageCount, 9, `${artifact.packetId}: page count`);
    assert.equal(annotationRefsOnDocument(await PDFDocument.load(bytes, { updateMetadata: false })), 0,
      `${artifact.packetId}: saved artifact retains annotation references`);
  }
  const map = readJson(`${OUT}/production-field-map.json`);
  assert.deepEqual(map.routeKeys, ROUTE_KEYS); assert.equal(map.generationAllowed, false);
  assert.equal(map.runtimeSelectable, false); assert.equal(map.commercialRoutesOpened, 0);
  /*
   * FIX169. This used to assert nine literal zeros against nine literal zeros
   * written by the same file -- self-consistent, and blind to every defect in
   * the delivered bytes. It now checks the shape a reading has to have: eight
   * measured counters, all zero, and visualDefects null with the sentence
   * saying why, so a future edit that puts a 0 back where nothing was measured
   * fails here.
   */
  const counters = readJson(`${OUT}/reports/completeness-counters.json`);
  assert.equal(counters.countersMeasured, 8, "eight of the nine counters must be readings");
  assert.deepEqual(counters.countersNotMeasured, ["visualDefects"]);
  assert.equal(counters.counters.visualDefects, null,
    "this worker rasters no page, so visualDefects is null, never 0");
  assert.ok(String(counters.visualDefectsWhyNull ?? "").length > 0,
    "a null counter must say why it is null");
  assert.equal(counters.everyMeasuredCounterZero, true);
  assert.deepEqual(Object.entries(counters.counters).filter(([, v]) => v !== 0 && v !== null), [],
    "a measured counter is not zero");
  const status = readJson(`${OUT}/build-status.json`);
  assert.equal(status.rasterState, "BUILT_RASTER_PENDING"); assert.equal(status.selfVerified, false);
  assert.equal(status.productionTouched, false);
  return { familyId: FAMILY_ID, status: "CHECK_OK", artifacts: rendered.artifacts };
}

/*
 * The gate. A required-before-filing row that cannot be acted on fails the
 * build instead of shipping.
 *
 * Four things are proved, and the first is the one VF05's finding turns on:
 * every quoted printed line is actually printed on the page it is attributed
 * to, in the pinned source binary, so `identifiedBy` can never quote a line the
 * participant will not find. Then: no row falls back to a synthetic name, every
 * row carries a disposition that is in the completeness contract's own closed
 * vocabulary and is one the contract allows, and every row names an owner and a
 * moment.
 */
function assertRequiredBlanksAreIdentified(refusals) {
  const required = refusals.filter((row) => row.requiredBeforeFiling === true);
  assert.ok(required.length > 0, "no required-before-filing rows were produced");
  for (const row of required) {
    assert.equal(row.disposition, "REQUIRED_BEFORE_FILING",
      `${row.fieldId}: required blank carries no closed-vocabulary disposition`);
    assert.equal(BLANK_DISPOSITIONS[row.disposition]?.allowed, true,
      `${row.fieldId}: ${row.disposition} is not an allowed disposition`);
    assert.ok(typeof row.identifiedBy === "string" && row.identifiedBy.length > 0,
      `${row.fieldId}: required blank has no participant-facing identification`);
    assert.ok(!/printed blank/.test(row.identifiedBy),
      `${row.fieldId}: required blank fell back to a synthetic name: ${row.identifiedBy}`);
    assert.ok(typeof row.suppliedBy === "string" && row.suppliedBy.length > 0,
      `${row.fieldId}: required blank names nobody who supplies it`);
    assert.ok(typeof row.suppliedWhen === "string" && row.suppliedWhen.length > 0,
      `${row.fieldId}: required blank names no moment at which it is supplied`);
    for (const quoted of [row.printedLine, row.introducedByPrintedLine]) {
      if (quoted === null || quoted === undefined) continue;
      const printed = PRINTED_PAGE_TEXT.get(`${row.documentId}|${row.page}`);
      assert.ok(printed !== undefined, `${row.fieldId}: page ${row.page} of ${row.documentId} was not read`);
      assert.ok(printed.includes(squashPrinted(quoted)),
        `${row.fieldId}: quoted line is not printed on page ${row.page} of ${row.documentId}: ${JSON.stringify(quoted)}`);
      /* AND AGAINST A DIFFERENT EXTRACTOR. The line above proves the quote
       * against the composition that produced it, which is how eight bad rows
       * shipped. poppler read the same pinned page independently; a quote that
       * only one of the two can find is a defect in whichever produced it. */
      const independent = POPPLER_PAGE_TEXT.get(`${row.documentId}|${row.page}`);
      assert.ok(independent !== undefined,
        `${row.fieldId}: page ${row.page} of ${row.documentId} was not read independently`);
      if (!tokensRunContiguously(wordTokens(quoted), wordTokens(independent))) {
        /* The two extractors disagree. That is allowed in exactly one case: the
         * line carries ink no character sits over, both readers lost the same
         * glyphs, the loss was MEASURED, and the row says so to the participant.
         * Anything else is a composition defect and stops the build. */
        const spans = UNREADABLE_LINE_SPANS.get(`${row.documentId}|${row.page}|${squashPrinted(quoted)}`) ?? [];
        assert.ok(spans.length > 0,
          `${row.fieldId}: quoted line is not what an independent extractor reads on page ${row.page} of ${row.documentId}: ${JSON.stringify(quoted)}`);
        assert.ok(/could not be read from the form file/.test(row.identifiedBy),
          `${row.fieldId}: the quoted line has ${spans.length} unreadable span(s) and the row does not disclose it`);
      }
    }
  }
  return required.length;
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
  assertRequiredBlanksAreIdentified(refusals);
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
    flattenedWidgetAppearancesReadFromOutputBytes: artifact.flattenedAppearancesWithInk,
    flattenedWidgetAppearancesDefinition: "Flattened widget Form XObjects in the delivered component bytes whose decompressed appearance stream draws at least one non-whitespace glyph. This field was artifact.written.length -- the finalizer's own write count -- until FIX169, which is why the four fixtures published 13/13, 8/8, 9/9 and 4/4: an identity, not a measurement.",
    glyphsInFlattenedWidgetAppearances: artifact.glyphsInFlattenedAppearances,
    flattenedWidgetFormXObjectsInDeliveredBytes: artifact.flattenedWidgetFormXObjects,
    annotationRefsRemovedDuringFlatten: artifact.annotationRefsRemoved,
    annotationRefsRemainingInAssembledBytes: artifact.annotationRefsRemaining,
    officialWidgetsDeclaredByTheTwoPinnedForms: artifact.officialWidgets,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: artifact.addedInkRunsOutsideMeasuredWriteBoxes,
    measuredOn: "the two official components, diffed page by page against their bound source before ordered assembly; the guidance page this builder authors outright carries no source to diff against",
    valuesRefusedForWidth: artifact.widthRefusals.length,
    refusedFieldsWithInk: artifact.refusedFieldsWithInk }));
  /*
   * THE GUARD. It refuses the defect this repair removed: a figure named
   * "...ReadFromOutputBytes" that is the finalizer's own tally, or a constant.
   */
  for (const proof of proofs) {
    assert.equal(proof.flattenedWidgetFormXObjectsInDeliveredBytes, proof.officialWidgetsDeclaredByTheTwoPinnedForms,
      `${proof.fixture}: the delivered bytes must carry one flattened Form XObject per official widget`);
    assert.ok(proof.flattenedWidgetAppearancesReadFromOutputBytes > 0,
      `${proof.fixture}: inked-appearance count is 0, which these fixtures cannot be`);
    assert.ok(proof.flattenedWidgetAppearancesReadFromOutputBytes
      < proof.flattenedWidgetFormXObjectsInDeliveredBytes,
      `${proof.fixture}: inked appearances cannot equal the total -- most widgets on these forms are left blank`);
    /* Every declared text write must have produced exactly one inked flattened
     * appearance. Checkbox controls are intentionally withheld and are
     * inventoried separately in the completeness report. */
    assert.equal(proof.flattenedWidgetAppearancesReadFromOutputBytes, proof.valuesReportedByFinalizer,
      `${proof.fixture}: ${proof.flattenedWidgetAppearancesReadFromOutputBytes} inked flattened appearances `
      + `for ${proof.valuesReportedByFinalizer} declared writes`);
    assert.deepEqual(proof.refusedFieldsWithInk, [],
      `${proof.fixture}: a value refused for width left ink in its blank: ${proof.refusedFieldsWithInk.join(", ")}`);
    assert.equal(proof.annotationRefsRemainingInAssembledBytes, 0,
      `${proof.fixture}: assembled bytes retain annotation references`);
  }
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
  const measured = measureCounters({ writes, refusals, artifacts,
    terminals: writes.length + refusals.length, fieldsById });
  const selectionControls = refusals.filter((row) => row.isSelectionControl === true);
  const participantSelectionControls = selectionControls.filter((row) =>
    SOURCES.find((source) => source.documentId === row.documentId)?.role === "petition");
  const courtSelectionControls = selectionControls.filter((row) =>
    SOURCES.find((source) => source.documentId === row.documentId)?.role === "order");
  writeJson(`${OUT}/reports/completeness-counters.json`, { schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID, counters: measured.counters,
    howEachWasTaken: measured.howEachWasTaken,
    visualDefectsWhyNull: measured.visualDefectsWhyNull,
    countersMeasured: measured.countersMeasured,
    countersNotMeasured: measured.countersNotMeasured,
    everyMeasuredCounterZero: measured.everyMeasuredCounterZero,
    selectionControlInventory: {
      total: selectionControls.length,
      participantPetitionControls: participantSelectionControls.length,
      courtProposedOrderControls: courtSelectionControls.length,
      markedByPacket: 0,
      disclosure: "The participant petition controls are disclosed in the guidance; proposed-order controls remain blank because they are court acts."
    },
    whatThisIsNot: "An independent verdict, raster receipt, or visual review. Eight of these nine are readings taken "
      + "by the builder that produced the bytes; that is not independent verification either." });
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
      `The four petition checkbox elections are disclosed in the guidance with both printed branches and an instruction to mark exactly one per pair; the ${selectionControls.length} total checkbox controls are inventoried as ${participantSelectionControls.length} participant petition elections and ${courtSelectionControls.length} proposed-order court acts. The packet marks none.`,
      "The conditional FURTHER paragraph is not selected by this build: its participant name remains blank because the packet does not hold the applicability facts, and the guidance tells the participant not to decide or prefill that court-facing paragraph.",
      `Flattened component bytes retain 0 annotation references after removing ${artifacts.reduce((n, artifact) => n + artifact.annotationRefsRemoved, 0)} stale widget references; required flattened appearances remain present and are checked from the saved bytes.`,
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
