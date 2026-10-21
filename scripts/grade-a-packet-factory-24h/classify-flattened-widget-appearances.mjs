#!/usr/bin/env node
/*
 * FIX121. Reads a DELIVERED fixture and classifies every flattened widget
 * appearance in it. Read-only: it opens PDFs, writes no packet byte, edits no
 * manifest and grants nothing.
 *
 * WHY THIS EXISTS. fix80/MK_BORDER_COHORT.json is a STATIC PREDICTION made over
 * pinned SOURCE forms: for each unwritten, displayed widget with no usable
 * /AP /N it predicts that pdf-lib will synthesize a bordered rectangle and that
 * the shared flatten will stamp it. That prediction is sound in the general case
 * and was proved on Colorado JDF-641 and on 94 Illinois check boxes. It is a
 * prediction nonetheless, and it does not read the delivered bytes. Before any
 * family's bytes are moved to remediate a predicted border, the delivered bytes
 * should be asked whether the border is actually there. This asks them.
 *
 * WHAT COUNTS AS INK, AND WHY THE PATH OPERATORS ARE NOT ENOUGH ON THEIR OWN.
 * `m l c v y h re W n` construct and clip and mark nothing. pdf-lib's generated
 * appearance for an unwritten text field is exactly such a preamble around an
 * EMPTY `<> Tj`: it builds the widget rectangle as a path and then, when the
 * widget declares neither a border colour nor a border width, closes that path
 * without ever painting it. Ink is therefore counted by operator SEMANTICS:
 * a path-painting operator (S s f F f* B B* b b* sh) marks the page whatever its
 * operand, and a show-text operator marks it only if it carries a non-empty
 * string operand, which is read from the stream's own operands.
 *
 * A synthesized widget border presents here as a STROKE-ONLY appearance: a
 * path-painting operator and no non-empty show-text. Every one that a delivered
 * fixture carries has to be accounted for against the pinned source before the
 * fixture is called clean, because the official form may legitimately draw a box
 * of its own at that widget.
 *
 *   node scripts/grade-a-packet-factory-24h/classify-flattened-widget-appearances.mjs \
 *     <delivered.pdf> [--source <pinned-source.pdf>] [--json <out.json>]
 *
 * With --source it also proves PLACEMENT: every flattened appearance is matched
 * to the widget /Rect it claims to sit at, so an appearance placed anywhere but
 * at its own widget is reported rather than averaged away.
 *
 * This does NOT measure ink on the page. A directional raster difference against
 * a render of the pinned source is a separate and mandatory step, and it is the
 * only one that catches OVER-suppression -- ink the official form itself draws
 * that a remedy removed. Run it in BOTH directions and read the removals first.
 */
import fs from "node:fs";
import {
  PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, decodePDFRawStream,
} from "pdf-lib";

const PAINTING_OPERATORS = new Set(["S", "s", "f", "F", "f*", "B", "B*", "b", "b*", "sh"]);
const SHOW_TEXT_OPERATORS = new Set(["Tj", "TJ", "'", '"']);
const FLATTENED_NAME = /^\/(FlatWidget|ExactFactOverlay)-\d+$/;

/*
 * A content-stream tokenizer, rather than a regular expression over the stream.
 * `S` inside a string operand is not a stroke, and a family that draws a
 * participant's name containing the letter f must not be read as filling a path.
 * Strings are consumed whole and reported only as "a string operand was present,
 * and whether it was empty".
 */
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

function decode(stream) {
  try { return Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); }
  catch { return null; }
}

function classifyStream(text) {
  const tokens = tokenize(text);
  const painting = [];
  let showTextOperators = 0;
  let drawnText = "";
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.kind !== "operator") continue;
    if (PAINTING_OPERATORS.has(token.text)) { painting.push(token.text); continue; }
    if (!SHOW_TEXT_OPERATORS.has(token.text)) continue;
    showTextOperators += 1;
    // The operands of this show-text operator are the tokens back to the
    // previous operator. An empty string operand marks nothing.
    for (let j = i - 1; j >= 0; j -= 1) {
      if (tokens[j].kind === "operator") break;
      if (tokens[j].kind === "string") drawnText = tokens[j].text + drawnText;
    }
  }
  const nonWhitespaceGlyphs = drawnText.replace(/\s/g, "").length;
  return {
    paintingOperators: painting,
    showTextOperators,
    drawnText,
    glyphs: drawnText.length,
    nonWhitespaceGlyphs,
    /*
     * The three classes the cohort question turns on. STROKE_ONLY is the
     * synthesized border's signature and is the only one that has to be
     * accounted for against the pinned source.
     */
    klass: painting.length > 0 && nonWhitespaceGlyphs === 0 ? "STROKE_ONLY"
      : painting.length > 0 ? "PAINTS_AND_SHOWS_TEXT"
        : nonWhitespaceGlyphs > 0 ? "SHOW_TEXT_ONLY"
          : "MARKS_NOTHING",
  };
}

function multiply(a, b) {
  return [
    a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

function numbers(array) {
  return array instanceof PDFArray
    ? array.asArray().map((value) => (value instanceof PDFNumber ? value.asNumber() : 0))
    : null;
}

function pageContent(doc, page) {
  const contents = page.node.get(PDFName.of("Contents"));
  const resolved = doc.context.lookup(contents);
  const parts = [];
  const push = (ref) => { const stream = doc.context.lookup(ref); if (stream) { const text = decode(stream); if (text !== null) parts.push(text); } };
  if (resolved instanceof PDFArray) for (const ref of resolved.asArray()) push(ref);
  else push(contents);
  return parts.join("\n");
}

async function sourceWidgetRectangles(path) {
  const doc = await PDFDocument.load(fs.readFileSync(path), { updateMetadata: false, ignoreEncryption: true });
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

async function main() {
  const args = process.argv.slice(2);
  const delivered = args[0];
  if (!delivered) {
    console.error("usage: classify-flattened-widget-appearances.mjs <delivered.pdf> [--source <pinned.pdf>] [--json <out.json>]");
    process.exit(2);
  }
  const sourcePath = args.includes("--source") ? args[args.indexOf("--source") + 1] : null;
  const jsonPath = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;

  const doc = await PDFDocument.load(fs.readFileSync(delivered), { updateMetadata: false, ignoreEncryption: true });
  const sourceRects = sourcePath ? await sourceWidgetRectangles(sourcePath) : null;

  const appearances = [];
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
      described.set(name, {
        classification: text === null ? { klass: "UNDECODABLE", paintingOperators: [], glyphs: 0, nonWhitespaceGlyphs: 0, drawnText: "" } : classifyStream(text),
        bbox: numbers(stream.dict.lookup(PDFName.of("BBox"))) ?? [0, 0, 0, 0],
        matrix: numbers(stream.dict.lookup(PDFName.of("Matrix"))) ?? [1, 0, 0, 1, 0, 0],
      });
    }
    if (described.size === 0) continue;
    // Placement. pdf-lib's flatten emits `q <cm>+ /Name Do Q`, sometimes with
    // several concatenated matrices; all of them are composed here rather than
    // only the last, which would misplace every appearance it touched.
    const content = pageContent(doc, page);
    const invocation = /q\s*((?:[-\d.]+\s+){6}cm\s*)+(\/(?:FlatWidget|ExactFactOverlay)-\d+)\s+Do\s*Q/g;
    let match;
    while ((match = invocation.exec(content)) !== null) {
      const name = match[2];
      const info = described.get(name);
      if (!info) continue;
      let ctm = [1, 0, 0, 1, 0, 0];
      for (const [, operands] of match[0].matchAll(/((?:[-\d.]+\s+){6})cm/g)) {
        ctm = multiply(operands.trim().split(/\s+/).map(Number), ctm);
      }
      const combined = multiply(info.matrix, ctm);
      const [bx0, by0, bx1, by1] = info.bbox;
      const corners = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]]
        .map(([x, y]) => [combined[0] * x + combined[2] * y + combined[4], combined[1] * x + combined[3] * y + combined[5]]);
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const placedRect = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
      let placedAt = null;
      if (sourceRects) {
        placedAt = sourceRects.find((r) => r.page === index + 1
          && Math.abs(r.x0 - placedRect.x0) < 0.01 && Math.abs(r.y0 - placedRect.y0) < 0.01
          && Math.abs(r.x1 - placedRect.x1) < 0.01 && Math.abs(r.y1 - placedRect.y1) < 0.01) ?? null;
      }
      appearances.push({
        page: index + 1, name, ...info.classification,
        placedRect: Object.fromEntries(Object.entries(placedRect).map(([k, v]) => [k, +v.toFixed(3)])),
        placedAtItsOwnSourceWidget: sourceRects ? placedAt !== null : null,
        sourceWidgetField: placedAt ? placedAt.field : null,
      });
    }
  }

  const of = (klass) => appearances.filter((a) => a.klass === klass);
  const summary = {
    deliveredFixture: delivered,
    pinnedSource: sourcePath,
    flattenedAppearances: appearances.length,
    carryingAPathPaintingOperator: appearances.filter((a) => a.paintingOperators.length > 0).length,
    strokeOnly: of("STROKE_ONLY").length,
    paintsAndShowsText: of("PAINTS_AND_SHOWS_TEXT").length,
    showTextOnly: of("SHOW_TEXT_ONLY").length,
    marksNothing: of("MARKS_NOTHING").length,
    undecodable: of("UNDECODABLE").length,
    addedGlyphsReadFromOutputBytes: appearances.reduce((n, a) => n + a.glyphs, 0),
    addedNonWhitespaceGlyphs: appearances.reduce((n, a) => n + a.nonWhitespaceGlyphs, 0),
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: sourceRects === null ? null
      : appearances.filter((a) => a.nonWhitespaceGlyphs > 0 && a.placedAtItsOwnSourceWidget !== true)
        .reduce((n, a) => n + a.nonWhitespaceGlyphs, 0),
    appearancesNotPlacedAtTheirOwnSourceWidget: sourceRects === null ? null
      : appearances.filter((a) => a.placedAtItsOwnSourceWidget !== true).length,
    strokeOnlyAppearancesRequiringSourceAccounting: of("STROKE_ONLY").map((a) => ({
      page: a.page, name: a.name, placedRect: a.placedRect,
      sourceWidgetField: a.sourceWidgetField, paintingOperators: a.paintingOperators,
    })),
    thisIsNotARasterMeasurement:
      "Byte classification only. Over-suppression -- ink the official form itself draws that a remedy removed -- "
      + "is invisible here and is caught only by a directional raster difference against a render of the pinned "
      + "source, read in both directions.",
    grantsNothing: "A classification is a measurement. It sets no verdict, issues no PASS and authorizes no rebuild.",
  };
  if (jsonPath) fs.writeFileSync(jsonPath, `${JSON.stringify({ summary, appearances }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

await main();
