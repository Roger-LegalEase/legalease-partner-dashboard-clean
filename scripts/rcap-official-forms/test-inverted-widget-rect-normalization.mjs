#!/usr/bin/env node
// One control over a widget rectangle stored upside down.
//
//   node scripts/rcap-official-forms/test-inverted-widget-rect-normalization.mjs
//
// The form built here is not a fixture of any family. It is Alabama CR-65's
// spelling reproduced in a few lines: a check box whose /Rect is written
// [x1 y1 x2 y2] with y2 BELOW y1, which ISO 32000-1 7.9.5 expressly permits --
// "it is acceptable to specify any two diagonally opposite corners" -- and
// which pdf-lib's PDFForm.flatten() places from the raw first corner, one box
// height above where every conforming viewer draws it.
//
// Four results, and two of them are the controls that make the other two mean
// something: the same document flattened WITHOUT the correction must land a box
// high, and a well-formed rectangle beside it must not move at all. A check
// that cannot fail is not evidence that the correction works, and a correction
// that touches a well-formed rectangle is not a correction.
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

import { sanitizeAndFlatten, normalizeInvertedWidgetRectangles } from "./rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFString } = require("pdf-lib");

const thisFile = fileURLToPath(import.meta.url);
process.chdir(path.resolve(path.dirname(thisFile), "..", ".."));

// CR-65's own numbers. Check Box10.2 is the inverted one; Check Box10.1 beside
// it is written the conventional way and is the negative control.
const INVERTED = { name: "InvertedBox", rect: [45.317, 623.137, 56.5341, 608.779] };
const WELL_FORMED = { name: "WellFormedBox", rect: [44.317, 632.741, 55.5341, 647.099] };
const BOX_WIDTH = 11.2171;
const BOX_HEIGHT = 14.3578;

/** CR-65's own /Off appearance: a white filled rectangle, and nothing else. */
function whiteFill(context) {
  const stream = context.flateStream("1 g\n0 0 11.2171 14.3578 re\nf\n");
  stream.dict.set(PDFName.of("Type"), PDFName.of("XObject"));
  stream.dict.set(PDFName.of("Subtype"), PDFName.of("Form"));
  stream.dict.set(PDFName.of("BBox"), context.obj([0, 0, BOX_WIDTH, BOX_HEIGHT]));
  stream.dict.set(PDFName.of("Resources"), context.obj({}));
  return context.register(stream);
}

async function buildForm() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const context = doc.context;
  const fields = [];
  for (const box of [INVERTED, WELL_FORMED]) {
    const widget = context.obj({
      Type: "Annot", Subtype: "Widget", FT: "Btn", T: PDFString.of(box.name), F: 4,
      Rect: box.rect, AS: PDFName.of("Off"),
      AP: { N: { Off: whiteFill(context), Yes: whiteFill(context) } },
      P: page.ref
    });
    const ref = context.register(widget);
    widget.set(PDFName.of("P"), page.ref);
    page.node.addAnnot(ref);
    fields.push(ref);
  }
  doc.catalog.set(PDFName.of("AcroForm"), context.obj({ Fields: fields, DA: "/Helv 0 Tf 0 g", NeedAppearances: false }));
  return doc;
}

/** Where each FlatWidget was actually translated to, read from page bytes. */
async function placements(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const page = doc.getPages()[0];
  // Contents may be one stream or an array of them, and may be Flate-compressed.
  const contents = doc.context.lookup(page.node.get(PDFName.of("Contents")));
  const parts = contents?.asArray ? contents.asArray().map((r) => doc.context.lookup(r)) : [contents];
  let text = "";
  for (const part of parts) {
    if (!part) continue;
    const raw = Buffer.from(part.contents);
    text += /Flate/.test(String(part.dict.get(PDFName.of("Filter")) ?? "")) 
      ? zlib.inflateSync(raw).toString("latin1") : raw.toString("latin1");
  }
  return [...text.matchAll(/1 0 0 1 ([-\d.]+) ([-\d.]+) cm(?:\s+1 0 0 1 0 0 cm)*\s*\/(FlatWidget[\w\d-]*) Do/g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

const results = [];

/* 1. The correction moves the inverted rectangle's placement to the box's
 *    BOTTOM, which is where the form draws it. */
{
  const doc = await buildForm();
  const report = normalizeInvertedWidgetRectangles(doc, doc.getForm());
  assert.equal(report.normalizedCount, 1, "exactly one rectangle is inverted in this form");
  assert.equal(report.normalized[0].field, INVERTED.name);
  assert.deepEqual(report.normalized[0].rectAfter, [45.317, 608.779, 56.5341, 623.137]);
  // The rectangle's own height, not the BBox's. CR-65 writes them a
  // ten-thousandth apart (14.358 against 14.3578) and so does this reproduction;
  // the misplacement is the RECTANGLE's height, because that is what flatten
  // translates by.
  const rectHeight = INVERTED.rect[1] - INVERTED.rect[3];
  assert.equal(report.normalized[0].misplacementPoints.y.toFixed(4), rectHeight.toFixed(4),
    "the misplacement this removes is exactly one rectangle height");
  results.push("ok  an inverted /Rect is normalised to min/max corners, and the offset removed is one box height");
}

/* 2. End to end through the shared flatten: the appearance lands at the
 *    rectangle's own origin. */
{
  const doc = await buildForm();
  const { clean } = await sanitizeAndFlatten(doc, { normalizeInvertedWidgetRects: true });
  const bytes = await clean.save({ useObjectStreams: false });
  const placed = await placements(bytes);
  assert.equal(placed.length, 2);
  const ys = placed.map((p) => Number(p.y.toFixed(3))).sort((a, b) => a - b);
  assert.deepEqual(ys, [608.779, 632.741], "both appearances are placed at their rectangles' own bottom edges");
  results.push("ok  flattened with the correction, both appearances land at their /Rect origin");
}

/* 3. THE CONTROL THAT MUST FAIL. Without the correction, the inverted one is
 *    placed from the raw first corner -- a box height high. */
{
  const doc = await buildForm();
  const { clean } = await sanitizeAndFlatten(doc, {});
  const bytes = await clean.save({ useObjectStreams: false });
  const placed = await placements(bytes);
  const ys = placed.map((p) => Number(p.y.toFixed(3))).sort((a, b) => a - b);
  assert.deepEqual(ys, [623.137, 632.741], "without the correction the inverted appearance is placed at the rectangle's TOP");
  assert.equal(Number((ys[0] - 608.779).toFixed(4)), Number((INVERTED.rect[1] - INVERTED.rect[3]).toFixed(4)),
    "and it is high by exactly one rectangle height");
  results.push("ok  the control fails: without the correction the appearance is stamped one box height high");
}

/* 4. A well-formed rectangle is not touched, byte for byte. */
{
  const doc = await buildForm();
  const before = JSON.stringify(doc.getForm().getFields()
    .find((f) => f.getName() === WELL_FORMED.name).acroField.getWidgets()[0].getRectangle());
  const report = normalizeInvertedWidgetRectangles(doc, doc.getForm());
  const after = JSON.stringify(doc.getForm().getFields()
    .find((f) => f.getName() === WELL_FORMED.name).acroField.getWidgets()[0].getRectangle());
  assert.equal(before, after, "a rectangle written the conventional way is left exactly as it was");
  assert.ok(report.normalized.every((row) => row.field !== WELL_FORMED.name));
  results.push("ok  a well-formed rectangle beside it is not rewritten");
}

for (const line of results) console.log(`  ${line}`);
console.log(`\nINVERTED_WIDGET_RECT_NORMALIZATION_OK · ${results.length} checks`);
