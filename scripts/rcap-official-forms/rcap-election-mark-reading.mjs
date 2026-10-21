/*
 * IS THE ELECTION MARKED? READ IT OFF THE DELIVERED BYTES.
 *
 * FIX168, 2026-09-10.
 *
 * WHY THIS EXISTS. A petition's checkbox elections are sworn statements: item
 * (d) of New Jersey's Form A says "I pled/was found guilty". FIX105 withdrew
 * that election on the three New Jersey conviction families because the row it
 * states cannot be completed from anything this repository holds, and FIX121
 * re-derived the same answer and left it withdrawn. Neither left a guard. Every
 * assertion those lanes wrote checks the row's eight TEXT cells; not one of them
 * checks the box. A later lane could mark it -- to make requiredOptionsMissing
 * read 0, which is exactly the pressure a failing counter creates -- and the
 * whole existing assertion suite would still pass.
 *
 * A raster is re-earnable. A pre-answered sworn election is not curable by
 * disclosure. So the refusal has to be enforced against the bytes that ship,
 * not against the builder's intent, and it has to be enforced on every election
 * on the instrument rather than on the one that happens to be under discussion.
 *
 * WHAT IT MEASURES. For each checkbox widget the PINNED SOURCE declares, this
 * locates the flattened appearance that the delivered artifact places at that
 * widget's exact rectangle, and reports the non-whitespace glyphs that
 * appearance draws. A blank official checkbox draws none. A marked one draws at
 * least one -- a ZapfDingbats check, an X, a 4 -- through a show-text operator.
 *
 * WHAT IT REFUSES TO CALL ZERO. If no appearance can be located at a declared
 * widget rectangle, `nonWhitespaceGlyphs` comes back `null`, never 0, and
 * `located` is false. Nothing was measured there, and an unread rectangle is not
 * an unmarked one; a caller that treats the null as a pass has invented a
 * reading. `assertNoElectionIsMarked` below fails closed on it for that reason.
 *
 * It reads PDFs and returns numbers. It writes no file, edits no manifest, sets
 * no verdict, and grants nothing.
 */
import assert from "node:assert/strict";
import {
  PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, decodePDFRawStream,
} from "pdf-lib";

import { drawnTextOf } from "./rcap-output-glyph-reading.mjs";

const FLATTENED_NAME = /^\/(FlatWidget|ExactFactOverlay)-\d+$/;

/* Placement is compared in points at the same tolerance the whole-artifact
 * reader uses, so "at its own widget" means the same thing in both. */
const PLACEMENT_TOLERANCE = 0.01;

function decode(stream) {
  try { return Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); }
  catch { return null; }
}

const numbers = (array) => (array instanceof PDFArray
  ? array.asArray().map((value) => (value instanceof PDFNumber ? value.asNumber() : 0))
  : null);

const multiply = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];

function pageContent(doc, page) {
  const contents = page.node.get(PDFName.of("Contents"));
  const resolved = doc.context.lookup(contents);
  const parts = [];
  const push = (ref) => {
    const stream = doc.context.lookup(ref);
    if (!stream) return;
    const text = decode(stream);
    if (text !== null) parts.push(text);
  };
  if (resolved instanceof PDFArray) for (const ref of resolved.asArray()) push(ref);
  else push(contents);
  return parts.join("\n");
}

/**
 * Every CHECKBOX widget rectangle the pinned source declares, read first-hand
 * from the binary rather than from any field map. A field map is a record of
 * what a build believed; the guard has to run against what the court published.
 */
export async function sourceElectionWidgets(sourceBytes) {
  const doc = await PDFDocument.load(sourceBytes, { updateMetadata: false, ignoreEncryption: true });
  const pageOfRef = new Map();
  doc.getPages().forEach((page, index) => pageOfRef.set(page.ref.tag, index + 1));
  const widgets = [];
  for (const field of doc.getForm().getFields()) {
    if (field.constructor.name !== "PDFCheckBox") continue;
    for (const widget of field.acroField.getWidgets()) {
      const rect = widget.getRectangle();
      const parent = widget.dict.get(PDFName.of("P"));
      widgets.push({
        field: field.getName(),
        sourcePage: parent ? pageOfRef.get(parent.tag) ?? null : null,
        x0: Math.min(rect.x, rect.x + rect.width), y0: Math.min(rect.y, rect.y + rect.height),
        x1: Math.max(rect.x, rect.x + rect.width), y1: Math.max(rect.y, rect.y + rect.height),
      });
    }
  }
  return widgets;
}

/** Every flattened appearance the delivered artifact places, with its box. */
function placedAppearances(doc) {
  const placed = [];
  doc.getPages().forEach((page, index) => {
    const resources = page.node.Resources();
    const xobjects = resources ? resources.lookup(PDFName.of("XObject")) : null;
    if (!(xobjects instanceof PDFDict)) return;
    const described = new Map();
    for (const [key, ref] of xobjects.entries()) {
      const name = key.asString();
      if (!FLATTENED_NAME.test(name)) continue;
      const stream = doc.context.lookup(ref);
      const text = decode(stream);
      described.set(name, {
        drawn: text === null ? "" : drawnTextOf(text),
        streamDecoded: text !== null,
        bbox: numbers(stream.dict.lookup(PDFName.of("BBox"))) ?? [0, 0, 0, 0],
        matrix: numbers(stream.dict.lookup(PDFName.of("Matrix"))) ?? [1, 0, 0, 1, 0, 0],
      });
    }
    if (described.size === 0) return;
    const content = pageContent(doc, page);
    const invocation = /q\s*((?:[-\d.]+\s+){6}cm\s*)+(\/(?:FlatWidget|ExactFactOverlay)-\d+)\s+Do\s*Q/g;
    let match;
    while ((match = invocation.exec(content)) !== null) {
      const info = described.get(match[2]);
      if (!info) continue;
      let ctm = [1, 0, 0, 1, 0, 0];
      for (const [, operands] of match[0].matchAll(/((?:[-\d.]+\s+){6})cm/g)) {
        ctm = multiply(operands.trim().split(/\s+/).map(Number), ctm);
      }
      const combined = multiply(info.matrix, ctm);
      const [bx0, by0, bx1, by1] = info.bbox;
      const corners = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]].map(([x, y]) => [
        combined[0] * x + combined[2] * y + combined[4],
        combined[1] * x + combined[3] * y + combined[5],
      ]);
      const xs = corners.map((corner) => corner[0]);
      const ys = corners.map((corner) => corner[1]);
      placed.push({
        deliveredPage: index + 1,
        name: match[2],
        drawn: info.drawn,
        streamDecoded: info.streamDecoded,
        x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys),
      });
    }
  });
  return placed;
}

/**
 * Reads every election on a delivered artifact.
 *
 * `pageOffset` maps a page of an assembled packet back to a page of the source
 * it came from: delivered page N is source page N - pageOffset.
 *
 * Returns one row per declared checkbox widget:
 *   { field, sourcePage, deliveredPage, located, appearances,
 *     nonWhitespaceGlyphs, drawn }
 * with `nonWhitespaceGlyphs: null` wherever `located` is false.
 */
export async function readElectionMarks(outputBytes, { sourceBytes, pageOffset = 0 }) {
  assert.ok(sourceBytes, "the pinned source is required: an election rectangle nobody declared cannot be read");
  const widgets = await sourceElectionWidgets(sourceBytes);
  const doc = await PDFDocument.load(outputBytes, { updateMetadata: false, ignoreEncryption: true });
  const placed = placedAppearances(doc);

  return widgets.map((widget) => {
    const deliveredPage = widget.sourcePage === null ? null : widget.sourcePage + pageOffset;
    const at = placed.filter((appearance) => appearance.deliveredPage === deliveredPage
      && Math.abs(appearance.x0 - widget.x0) < PLACEMENT_TOLERANCE
      && Math.abs(appearance.y0 - widget.y0) < PLACEMENT_TOLERANCE
      && Math.abs(appearance.x1 - widget.x1) < PLACEMENT_TOLERANCE
      && Math.abs(appearance.y1 - widget.y1) < PLACEMENT_TOLERANCE);
    const readable = at.length > 0 && at.every((appearance) => appearance.streamDecoded);
    const drawn = at.map((appearance) => appearance.drawn).join("");
    return {
      field: widget.field,
      sourcePage: widget.sourcePage,
      deliveredPage,
      located: readable,
      appearances: at.length,
      /* null, never 0: an appearance nobody could locate or decode was not
       * measured, and an unmeasured election is not an unmarked one. */
      nonWhitespaceGlyphs: readable ? drawn.replace(/\s/g, "").length : null,
      drawn: readable ? drawn : null,
    };
  });
}

/**
 * The guard itself. Refuses if ANY declared election on the instrument draws a
 * mark, and refuses just as hard if any declared election could not be read.
 *
 * `label` names the artifact in the refusal so a failure says which fixture.
 */
export function assertNoElectionIsMarked(readings, label) {
  assert.ok(Array.isArray(readings) && readings.length > 0,
    `${label}: no election rectangle was read; the guard measured nothing and must not pass`);
  const unread = readings.filter((row) => !row.located);
  assert.equal(unread.length, 0,
    `${label}: ${unread.length} declared election(s) could not be located in the delivered bytes `
    + `(${unread.map((row) => `${row.field} p${row.deliveredPage}`).join(", ")}); `
    + "an election nobody could read is not an election nobody marked");
  const marked = readings.filter((row) => row.nonWhitespaceGlyphs > 0);
  assert.equal(marked.length, 0,
    `${label}: ${marked.length} election(s) are MARKED in the delivered bytes `
    + `(${marked.map((row) => `${row.field} p${row.deliveredPage} draws ${JSON.stringify(row.drawn)}`).join("; ")}). `
    + "This build makes no election on this instrument: an election the route determines is named as unmade, "
    + "and an election the participant swears is theirs to make");
  return readings.length;
}
