import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { drawnTextOf } from "./rcap-output-glyph-reading.mjs";
import { sourceElectionWidgets } from "./rcap-election-mark-reading.mjs";

const require = createRequire(import.meta.url);
const { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, decodePDFRawStream } = require("pdf-lib");
const SECTION_V = new Set([
  "Check Box10.6", "Check Box11.0", "Check Box11.1", "Check Box11.2",
  "Check Box11.3", "Check Box11.4", "Check Box11.5", "Check Box11.6"
]);
const TOLERANCE = 0.11;

const numbers = (array) => array instanceof PDFArray
  ? array.asArray().map((value) => value instanceof PDFNumber ? value.asNumber() : 0)
  : null;
const multiply = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]
];
function decode(stream) {
  try { return Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); }
  catch { return null; }
}
function pageContent(document, page) {
  const contents = page.node.get(PDFName.of("Contents"));
  const resolved = document.context.lookup(contents);
  const refs = resolved instanceof PDFArray ? resolved.asArray() : contents ? [contents] : [];
  return refs.map((ref) => decode(document.context.lookup(ref)) ?? "").join("\n");
}

function placedAppearances(document) {
  const rows = [];
  document.getPages().forEach((page, index) => {
    const xobjects = page.node.Resources()?.lookup(PDFName.of("XObject"));
    if (!(xobjects instanceof PDFDict)) return;
    const described = new Map();
    for (const [key, ref] of xobjects.entries()) {
      if (!/^\/FlatWidget-\d+$/.test(key.asString())) continue;
      const stream = document.context.lookup(ref);
      const decoded = decode(stream);
      described.set(key.asString(), {
        decoded: decoded !== null,
        drawn: decoded === null ? null : drawnTextOf(decoded),
        bbox: numbers(stream.dict.lookup(PDFName.of("BBox"))) ?? [0, 0, 0, 0],
        matrix: numbers(stream.dict.lookup(PDFName.of("Matrix"))) ?? [1, 0, 0, 1, 0, 0]
      });
    }
    const invocation = /q\s*((?:[-\d.]+\s+){6}cm\s*)+(\/FlatWidget-\d+)\s+Do\s*Q/g;
    const content = pageContent(document, page);
    let match;
    while ((match = invocation.exec(content))) {
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
        combined[1] * x + combined[3] * y + combined[5]
      ]);
      rows.push({
        page: index + 1, name: match[2], decoded: info.decoded, drawn: info.drawn,
        x0: Math.min(...corners.map((c) => c[0])), y0: Math.min(...corners.map((c) => c[1])),
        x1: Math.max(...corners.map((c) => c[0])), y1: Math.max(...corners.map((c) => c[1]))
      });
    }
  });
  return rows;
}

export async function readAlabamaPardonedSectionV({ sourceBytes, outputBytes }) {
  const source = (await sourceElectionWidgets(sourceBytes)).filter((row) => SECTION_V.has(row.field));
  assert.equal(source.length, 8, "the pinned CR-65 must expose all eight Section V attestations");
  const output = placedAppearances(await PDFDocument.load(outputBytes, { updateMetadata: false, ignoreEncryption: true }));
  return source.map((widget) => {
    const at = output.filter((appearance) => appearance.page === widget.sourcePage
      && Math.abs(appearance.x0 - widget.x0) < TOLERANCE
      && Math.abs(appearance.y0 - widget.y0) < TOLERANCE
      && Math.abs(appearance.x1 - widget.x1) < TOLERANCE
      && Math.abs(appearance.y1 - widget.y1) < TOLERANCE);
    const drawn = at.length === 1 && at[0].decoded ? at[0].drawn : null;
    return {
      field: widget.field, page: widget.sourcePage, sourceBox: [widget.x0, widget.y0, widget.x1, widget.y1],
      locatedAppearanceCount: at.length, outputAppearance: at.length === 1 ? [at[0].x0, at[0].y0, at[0].x1, at[0].y1] : null,
      nonWhitespaceGlyphs: drawn === null ? null : drawn.replace(/\s/g, "").length,
      marked: drawn === null ? null : drawn.replace(/\s/g, "").length > 0
    };
  });
}
