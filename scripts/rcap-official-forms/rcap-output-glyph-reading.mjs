/*
 * THE TWO OUTPUT-BYTE GLYPH READINGS, MEASURED FROM A PRODUCED PDF.
 *
 * FIX137, 2026-09-10. A finished family owes two numbers per artifact, and both
 * have to be read out of the bytes that were actually written rather than out of
 * the builder's intent:
 *
 *   addedGlyphsReadFromOutputBytes
 *       every glyph any flattened widget appearance in the output draws.
 *   nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
 *       the non-whitespace glyphs among those that do NOT sit at a widget
 *       rectangle the pinned source declares.
 *
 * NEITHER MAY BE A LITERAL. A hardcoded `0` on the second key, with visualDefects
 * gated on it, is a live shape in this factory: the counter can then never fire
 * however the page looks. So both are computed here, and the second returns
 * `null` -- never 0 -- when no pinned source was supplied to measure placement
 * against, because a reading nobody took is not a reading of zero.
 *
 * WHY THE OPERATORS ARE READ SEMANTICALLY. The tokenizer consumes strings whole,
 * so an `S` inside a string operand is not read as a stroke and a participant
 * name containing the letter f is not read as a fill. An empty `<> Tj` -- which
 * is what pdf-lib generates for an unwritten text field -- draws nothing and
 * contributes nothing. This mirrors, deliberately, the semantics
 * scripts/grade-a-packet-factory-24h/classify-flattened-widget-appearances.mjs
 * uses to classify the same streams, so a builder's own reading and an
 * independent lane's reading of the same file are the same measurement.
 *
 * This module is imported by builders that owe these readings -- the two Arkansas
 * ACIC builders, and the three Indiana conviction builders, which take only the
 * flattened-appearance count from it (FIX04, 2026-09-10).
 * It reads PDFs and returns numbers: it writes no file, edits no manifest, sets
 * no verdict and grants nothing.
 */
import {
  PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, decodePDFRawStream,
} from "pdf-lib";

const SHOW_TEXT_OPERATORS = new Set(["Tj", "TJ", "'", '"']);
const FLATTENED_NAME = /^\/(FlatWidget|ExactFactOverlay)-\d+$/;

/** Tokenizes a content stream. Strings are consumed whole, never scanned. */
function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === "(") {
      let depth = 1;
      let content = "";
      index += 1;
      while (index < source.length && depth > 0) {
        if (source[index] === "\\") { content += source[index + 1] ?? ""; index += 2; continue; }
        if (source[index] === "(") depth += 1;
        else if (source[index] === ")") { depth -= 1; if (depth === 0) { index += 1; break; } }
        content += source[index];
        index += 1;
      }
      tokens.push({ kind: "string", text: content });
      continue;
    }
    if (character === "<" && source[index + 1] !== "<") {
      const end = source.indexOf(">", index);
      const hex = source.slice(index + 1, end < 0 ? source.length : end).replace(/\s/g, "");
      tokens.push({ kind: "string", text: Buffer.from(hex, "hex").toString("latin1") });
      index = end < 0 ? source.length : end + 1;
      continue;
    }
    if (character === "%") { while (index < source.length && source[index] !== "\n") index += 1; continue; }
    if (character === "<" && source[index + 1] === "<") { index += 2; continue; }
    if (character === ">" && source[index + 1] === ">") { index += 2; continue; }
    if (/[\s[\]{}]/.test(character)) { index += 1; continue; }
    if (character === "/") {
      let end = index + 1;
      while (end < source.length && !/[\s[\]<>(){}/%]/.test(source[end])) end += 1;
      tokens.push({ kind: "name", text: source.slice(index, end) });
      index = end;
      continue;
    }
    let end = index;
    while (end < source.length && !/[\s[\]<>(){}/%]/.test(source[end])) end += 1;
    if (end === index) { index += 1; continue; }
    const token = source.slice(index, end);
    index = end;
    tokens.push(/^[-+.\d]/.test(token) ? { kind: "number" } : { kind: "operator", text: token });
  }
  return tokens;
}

/** The text a stream actually shows: every operand of every show-text operator. */
function drawnTextOf(text) {
  const tokens = tokenize(text);
  let drawn = "";
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.kind !== "operator" || !SHOW_TEXT_OPERATORS.has(token.text)) continue;
    for (let j = i - 1; j >= 0; j -= 1) {
      if (tokens[j].kind === "operator") break;
      if (tokens[j].kind === "string") drawn = tokens[j].text + drawn;
    }
  }
  return drawn;
}

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

/** Every widget rectangle the pinned source declares, by page. */
async function sourceWidgetRectangles(sourceBytes) {
  const doc = await PDFDocument.load(sourceBytes, { updateMetadata: false, ignoreEncryption: true });
  const pageOfRef = new Map();
  doc.getPages().forEach((page, index) => pageOfRef.set(page.ref.tag, index + 1));
  const rectangles = [];
  for (const field of doc.getForm().getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      const rect = widget.getRectangle();
      const parent = widget.dict.get(PDFName.of("P"));
      rectangles.push({
        field: field.getName(),
        page: parent ? pageOfRef.get(parent.tag) ?? null : null,
        x0: Math.min(rect.x, rect.x + rect.width), y0: Math.min(rect.y, rect.y + rect.height),
        x1: Math.max(rect.x, rect.x + rect.width), y1: Math.max(rect.y, rect.y + rect.height),
      });
    }
  }
  return rectangles;
}

/**
 * Reads both glyph counters out of a produced PDF.
 *
 * `sourceBytes` is the PINNED SOURCE this artifact was produced from, and it is
 * what placement is measured against. Omit it and
 * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes comes back `null`, because
 * placement was not measured -- it does not come back 0.
 *
 * `pageOffset` maps a page of an assembled packet back to a page of the source
 * component it came from: packet page N is source page N - pageOffset.
 */
export async function readOutputGlyphs(outputBytes, { sourceBytes = null, pageOffset = 0 } = {}) {
  const doc = await PDFDocument.load(outputBytes, { updateMetadata: false, ignoreEncryption: true });
  const sourceRects = sourceBytes ? await sourceWidgetRectangles(sourceBytes) : null;

  let flattenedWidgetAppearances = 0;
  let addedGlyphs = 0;
  let outsideGlyphs = 0;
  let appearancesNotAtTheirOwnSourceWidget = 0;
  const pages = doc.getPages();

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const resources = page.node.Resources();
    const xobjects = resources ? resources.lookup(PDFName.of("XObject")) : null;
    if (!(xobjects instanceof PDFDict)) continue;
    const described = new Map();
    for (const [key, ref] of xobjects.entries()) {
      const name = key.asString();
      if (!FLATTENED_NAME.test(name)) continue;
      const stream = doc.context.lookup(ref);
      const text = decode(stream);
      const drawn = text === null ? "" : drawnTextOf(text);
      described.set(name, {
        glyphs: drawn.length,
        nonWhitespaceGlyphs: drawn.replace(/\s/g, "").length,
        bbox: numbers(stream.dict.lookup(PDFName.of("BBox"))) ?? [0, 0, 0, 0],
        matrix: numbers(stream.dict.lookup(PDFName.of("Matrix"))) ?? [1, 0, 0, 1, 0, 0],
      });
    }
    if (described.size === 0) continue;

    const content = pageContent(doc, page);
    const invocation = /q\s*((?:[-\d.]+\s+){6}cm\s*)+(\/(?:FlatWidget|ExactFactOverlay)-\d+)\s+Do\s*Q/g;
    let match;
    while ((match = invocation.exec(content)) !== null) {
      const info = described.get(match[2]);
      if (!info) continue;
      flattenedWidgetAppearances += 1;
      addedGlyphs += info.glyphs;

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
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const placed = {
        x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys),
      };
      if (!sourceRects) continue;
      const sourcePage = index + 1 - pageOffset;
      const at = sourceRects.some((r) => r.page === sourcePage
        && Math.abs(r.x0 - placed.x0) < 0.01 && Math.abs(r.y0 - placed.y0) < 0.01
        && Math.abs(r.x1 - placed.x1) < 0.01 && Math.abs(r.y1 - placed.y1) < 0.01);
      if (at) continue;
      appearancesNotAtTheirOwnSourceWidget += 1;
      outsideGlyphs += info.nonWhitespaceGlyphs;
    }
  }

  return {
    flattenedWidgetAppearancesReadFromOutputBytes: flattenedWidgetAppearances,
    addedGlyphsReadFromOutputBytes: addedGlyphs,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: sourceRects === null ? null : outsideGlyphs,
    appearancesNotPlacedAtTheirOwnSourceWidget: sourceRects === null ? null : appearancesNotAtTheirOwnSourceWidget,
    placementMeasuredAgainstThePinnedSource: sourceRects !== null,
  };
}
