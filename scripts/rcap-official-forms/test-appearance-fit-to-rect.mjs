#!/usr/bin/env node
// The BBox-to-Rect mapping ISO 32000-1 12.5.5 requires, and pdf-lib's flatten()
// does not apply.
//
//   node scripts/rcap-official-forms/test-appearance-fit-to-rect.mjs
//
// THE DEFECT. 12.5.5 places a widget's appearance by transforming its /BBox by
// its /Matrix, taking the bounding box of the result, and fitting that box onto
// the annotation's /Rect. pdf-lib's PDFForm.flatten emits a translation only --
// `q 1 0 0 1 <x> <y> cm /FlatWidget-N Do Q`, with rotateInPlace at rotation 0
// contributing an identity -- so the fit never happens. A source widget whose
// appearance BBox is larger than its /Rect is therefore stamped oversize, and
// one whose transformed BBox has a non-zero origin is stamped offset.
//
// The measured instance is Vermont's fee-waiver form 600-00228 field 15: BBox
// [0 0 18 18] against a /Rect of 14.4 x 14.4, a required scale of 0.8 that is
// never applied, and about 3.4pt of stroke outside the widget's own box.
//
// The documents built here are not fixtures of any family. Each is that
// spelling in a few lines, and each isolates one case:
//
//   A  BBox 18x18, Rect 14.4x14.4          -> 14.4pt on, 18pt off
//   B  BBox 14.4x14.4, Rect 14.4x14.4      -> byte-identical either way
//   C  BBox with a non-identity /Matrix    -> mapped, not merely scaled
//
// Measured as GEOMETRY off the delivered bytes, not off a report: the flattened
// page content is read back, the placement's composed matrix is applied to the
// appearance's own drawing, and the painted extent is compared to the widget's
// /Rect. Case A is additionally rastered so the claim "14.4pt" is answered in
// ink as well as in numbers. Rasters go under the OS temp directory and are
// deleted after measuring.
//
// The control that makes the others mean anything is the negative one: with the
// option OFF, case A must still be stamped at 18pt. A test that passes either
// way is testing nothing.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

import { sanitizeAndFlatten } from "./rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray, PDFRawStream } = require("pdf-lib");

const PAGE = { width: 200, height: 200 };
const DPI = 300;

const inflate = (b) => { try { return zlib.inflateSync(b); } catch { return b; } };

/**
 * One text-field widget at `rect`, whose normal appearance strokes the OUTLINE
 * of `bbox` in `bbox` coordinates, under `matrix`.
 *
 * A text field is used rather than a check box so nothing in pdf-lib's
 * check-box appearance provider can be confused with what is under test, and
 * the field is given a value and a /DA so no appearance is regenerated over the
 * one installed here.
 */
async function probe({ bbox, matrix, rect }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE.width, PAGE.height]);
  const form = doc.getForm();
  const field = form.createTextField("the.field");
  field.addToPage(page, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, borderWidth: 0 });

  const [x0, y0, x1, y1] = bbox;
  const inset = 0.5;
  const content = `q 0 G 1 w ${x0 + inset} ${y0 + inset} ${x1 - x0 - inset * 2} ${y1 - y0 - inset * 2} re S Q`;
  const bytes = new TextEncoder().encode(content);
  const dict = doc.context.obj({
    Type: "XObject", Subtype: "Form", FormType: 1,
    BBox: doc.context.obj(bbox),
    Matrix: doc.context.obj(matrix),
    Resources: doc.context.obj({}),
    Length: bytes.length
  });
  const ref = doc.context.register(PDFRawStream.of(dict, bytes));
  const [widget] = field.acroField.getWidgets();
  const ap = doc.context.obj({});
  ap.set(PDFName.of("N"), ref);
  widget.dict.set(PDFName.of("AP"), ap);
  widget.dict.delete(PDFName.of("MK"));
  // The appearance installed here is the one that must be placed, so nothing
  // may be regenerated over it.
  field.acroField.dict.delete(PDFName.of("V"));
  return doc;
}

async function finalize(doc, { fitAppearancesToRect = false } = {}) {
  const { clean, report } = await sanitizeAndFlatten(doc, {
    writtenFields: new Set(["the.field"]), fitAppearancesToRect
  });
  const stamp = new Date("2026-01-01T00:00:00Z");
  clean.setCreationDate(stamp);
  clean.setModificationDate(stamp);
  clean.setProducer("");
  return { bytes: Buffer.from(await clean.save({ useObjectStreams: false, updateMetadata: false })), report };
}

/** m1 applied first, then m2, in PDF's row-vector convention. */
function compose(m1, m2) {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [a1 * a2 + b1 * c2, a1 * b2 + b1 * d2, c1 * a2 + d1 * c2, c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2, e1 * b2 + f1 * d2 + f2];
}

const apply = ([a, b, c, d, e, f], [x, y]) => [a * x + c * y + e, b * x + d * y + f];

/**
 * Where the delivered bytes actually paint the flattened appearance, in page
 * coordinates: the appearance's own BBox, through its /Matrix, through the
 * placement matrix the page content emits.
 */
async function paintedExtent(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const page = doc.getPages()[0];
  const xObjects = ctx.lookup(ctx.lookup(page.node.get(PDFName.of("Resources"))).get(PDFName.of("XObject")));
  const contents = page.node.get(PDFName.of("Contents"));
  const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
  let stream = "";
  for (const ref of refs) stream += inflate(Buffer.from(ctx.lookup(ref).contents)).toString("latin1");

  const re = /q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/(\S+)\s+Do/g;
  const placements = [];
  let m;
  while ((m = re.exec(stream))) {
    let placement = [1, 0, 0, 1, 0, 0];
    for (const cm of m[1].matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)) {
      placement = compose(cm.slice(1, 7).map(Number), placement);
    }
    const key = PDFName.of(m[2]);
    if (!xObjects.has(key)) continue;
    const obj = ctx.lookup(xObjects.get(key));
    const bbox = ctx.lookup(obj.dict.get(PDFName.of("BBox"))).asArray().map((n) => n.asNumber());
    const raw = obj.dict.get(PDFName.of("Matrix"));
    const matrix = raw ? ctx.lookup(raw).asArray().map((n) => n.asNumber()) : [1, 0, 0, 1, 0, 0];
    const full = compose(matrix, placement);
    const [bx0, by0, bx1, by1] = bbox;
    const corners = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]].map((p) => apply(full, p));
    const xs = corners.map((p) => p[0]); const ys = corners.map((p) => p[1]);
    placements.push({
      name: m[2], bbox, matrix, placement,
      x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys)
    });
  }
  assert.equal(placements.length, 1, `expected exactly one flattened placement, found ${placements.length}`);
  const p = placements[0];
  return { ...p, width: p.x1 - p.x0, height: p.y1 - p.y0 };
}

/** The bounding box of the dark pixels on the page, in POINTS. */
function inkExtent(bytes, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fix61-test-"));
  try {
    const pdf = path.join(dir, `${label}.pdf`);
    fs.writeFileSync(pdf, bytes);
    execFileSync("pdftoppm", ["-r", String(DPI), "-gray", "-f", "1", "-l", "1", pdf, path.join(dir, "page")]);
    const [pgm] = fs.readdirSync(dir).filter((f) => f.endsWith(".pgm")).map((f) => path.join(dir, f));
    assert.ok(pgm, `pdftoppm produced no raster for ${label}`);
    const raw = fs.readFileSync(pgm);
    const header = raw.subarray(0, 64).toString("latin1");
    const hm = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(header);
    assert.ok(hm, `unreadable PGM header for ${label}`);
    const [width, height, offset] = [Number(hm[1]), Number(hm[2]), hm[0].length];
    const s = DPI / 72;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, dark = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (raw[offset + y * width + x] >= 200) continue;
        dark += 1;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    assert.ok(dark > 0, `${label} painted nothing at all, so it measures nothing`);
    return { dark, widthPt: (maxX - minX + 1) / s, heightPt: (maxY - minY + 1) / s,
      x0Pt: minX / s, y0Pt: PAGE.height - (maxY + 1) / s };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const results = [];
const control = (name, detail) => { results.push({ control: name, ...detail, pass: true }); console.log(`PASS  ${name}`); };
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;

async function main() {
  // ---- A. the measured defect: BBox 18x18 into a 14.4x14.4 Rect -------------
  const A = { bbox: [0, 0, 18, 18], matrix: [1, 0, 0, 1, 0, 0], rect: { x: 40, y: 120, width: 14.4, height: 14.4 } };

  const aOff = await finalize(await probe(A));
  const aOn = await finalize(await probe(A), { fitAppearancesToRect: true });
  const geomOff = await paintedExtent(aOff.bytes);
  const geomOn = await paintedExtent(aOn.bytes);

  assert.ok(near(geomOff.width, 18) && near(geomOff.height, 18),
    `NEGATIVE CONTROL FAILED: with the option off the appearance is already ${geomOff.width.toFixed(3)}pt wide, `
    + "not the 18pt pdf-lib's translation-only placement produces, so this test proves nothing");
  control("1-with-the-option-off-an-18pt-appearance-is-flattened-at-18pt-into-a-14.4pt-widget", {
    paintedPt: { width: +geomOff.width.toFixed(4), height: +geomOff.height.toFixed(4) },
    widgetRectPt: { width: A.rect.width, height: A.rect.height },
    overhangPt: +(geomOff.width - A.rect.width).toFixed(4),
    placementMatrix: geomOff.placement,
    cause: "PDFForm.flatten emits a translation only; ISO 32000-1 12.5.5's BBox-to-Rect fit is never applied"
  });

  assert.ok(near(geomOn.width, 14.4) && near(geomOn.height, 14.4),
    `with the option on the appearance is ${geomOn.width.toFixed(4)} x ${geomOn.height.toFixed(4)}pt, expected 14.4`);
  assert.ok(near(geomOn.x0, A.rect.x) && near(geomOn.y0, A.rect.y),
    `with the option on the appearance sits at ${geomOn.x0.toFixed(3)},${geomOn.y0.toFixed(3)}, `
    + `expected the widget origin ${A.rect.x},${A.rect.y}`);
  control("2-with-the-option-on-the-same-appearance-is-flattened-at-14.4pt-inside-the-widget-rect", {
    paintedPt: { width: +geomOn.width.toFixed(4), height: +geomOn.height.toFixed(4) },
    wasBefore: { width: +geomOff.width.toFixed(4), height: +geomOff.height.toFixed(4) },
    originPt: { x: +geomOn.x0.toFixed(4), y: +geomOn.y0.toFixed(4) },
    fittedMatrix: geomOn.matrix,
    matches: "ISO 32000-1 12.5.5: the transformed BBox is fitted to /Rect"
  });

  // The same claim in ink, because a matrix read back is still a number.
  const inkOff = inkExtent(aOff.bytes, "a-option-off");
  const inkOn = inkExtent(aOn.bytes, "a-option-on");
  // The probe strokes the BBox outline inset 0.5pt at 1pt width, so the OUTER
  // edge of the ink is the BBox itself: 18pt off, 14.4pt on. The overhang the
  // defect produces is the 3.6pt difference, which is what field 15 shows.
  assert.ok(near(inkOff.widthPt, 18, 0.25),
    `option off: painted ink measures ${inkOff.widthPt.toFixed(3)}pt across, expected ~18`);
  assert.ok(near(inkOn.widthPt, 14.4, 0.25),
    `option on: painted ink measures ${inkOn.widthPt.toFixed(3)}pt across, expected ~14.4`);
  assert.ok(near(inkOn.x0Pt, A.rect.x, 0.25) && near(inkOn.y0Pt, A.rect.y, 0.25),
    `option on: ink starts at ${inkOn.x0Pt.toFixed(3)},${inkOn.y0Pt.toFixed(3)}, expected the widget origin`);
  control("3-the-same-thing-measured-in-ink-at-300dpi", {
    inkAcrossOffPt: +inkOff.widthPt.toFixed(3),
    inkAcrossOnPt: +inkOn.widthPt.toFixed(3),
    ratio: +(inkOn.widthPt / inkOff.widthPt).toFixed(4),
    requiredScale: 0.8,
    overhangRemovedPt: +(inkOff.widthPt - inkOn.widthPt).toFixed(3),
    inkOriginOnPt: { x: +inkOn.x0Pt.toFixed(3), y: +inkOn.y0Pt.toFixed(3) }
  });

  const fitted = aOn.report.appearancesFittedToRect;
  assert.equal(fitted.rescaledCount, 1, `report says ${fitted.rescaledCount} appearances rescaled, expected 1`);
  assert.equal(aOff.report.appearancesFittedToRect, undefined,
    "the option is off, so the sanitize report must not carry a fitting record at all");
  control("4-the-count-is-reported-per-document-and-only-when-the-option-is-on", {
    withOptionOn: { rescaledCount: fitted.rescaledCount, requiredScale: fitted.rescaled[0].requiredScale,
      displacementPt: fitted.rescaled[0].displacementPt, widgetsExamined: fitted.widgetsExamined },
    withOptionOff: "no key in the sanitize report"
  });

  // ---- B. BBox equals Rect: byte-identical either way -----------------------
  const B = { bbox: [0, 0, 14.4, 14.4], matrix: [1, 0, 0, 1, 0, 0], rect: { x: 40, y: 120, width: 14.4, height: 14.4 } };
  const bOff = await finalize(await probe(B));
  const bOn = await finalize(await probe(B), { fitAppearancesToRect: true });
  assert.equal(bOn.bytes.length, bOff.bytes.length,
    `an already-correct placement changed size: ${bOff.bytes.length} -> ${bOn.bytes.length}`);
  assert.ok(bOn.bytes.equals(bOff.bytes), "an already-correct placement is not byte-identical with the option on");
  assert.equal(bOn.report.appearancesFittedToRect.rescaledCount, 0);
  assert.equal(bOn.report.appearancesFittedToRect.alreadyCorrect, 1);
  control("5-a-widget-whose-BBox-equals-its-Rect-is-byte-identical-either-way", {
    bytes: bOff.bytes.length, identical: true,
    countedAs: "alreadyCorrect", tolerancePt: bOn.report.appearancesFittedToRect.tolerancePt
  });

  // ---- C. a non-identity /Matrix is MAPPED, not merely scaled ---------------
  // A quarter turn plus an offset: BBox [0 0 20 10] under [0 1 -1 0 5 7] has a
  // transformed box of 10 wide by 20 high whose origin is (-5, 7) -- neither the
  // size nor the position of the 10x20 Rect it must land in. A fix that only
  // scaled would leave it 5pt to the left and 7pt high.
  const C = { bbox: [0, 0, 20, 10], matrix: [0, 1, -1, 0, 5, 7], rect: { x: 60, y: 40, width: 10, height: 20 } };
  const cOff = await finalize(await probe(C));
  const cOn = await finalize(await probe(C), { fitAppearancesToRect: true });
  const cGeomOff = await paintedExtent(cOff.bytes);
  const cGeomOn = await paintedExtent(cOn.bytes);

  assert.ok(!near(cGeomOff.x0, C.rect.x) || !near(cGeomOff.y0, C.rect.y),
    "NEGATIVE CONTROL FAILED: the rotated appearance already lands on its rect with the option off");
  assert.ok(near(cGeomOn.x0, C.rect.x) && near(cGeomOn.y0, C.rect.y)
    && near(cGeomOn.width, C.rect.width) && near(cGeomOn.height, C.rect.height),
    `a rotated, offset appearance did not land on its rect: got ${cGeomOn.x0.toFixed(3)},${cGeomOn.y0.toFixed(3)} `
    + `${cGeomOn.width.toFixed(3)}x${cGeomOn.height.toFixed(3)}, expected ${C.rect.x},${C.rect.y} `
    + `${C.rect.width}x${C.rect.height}`);
  // Still a quarter turn: the mapping composes with /Matrix, it does not replace it.
  assert.ok(Math.abs(cGeomOn.matrix[0]) < 1e-9 && Math.abs(cGeomOn.matrix[3]) < 1e-9,
    `the fitted matrix ${JSON.stringify(cGeomOn.matrix)} is no longer a quarter turn, so the rotation was discarded`);
  control("6-an-appearance-with-a-non-identity-Matrix-is-mapped-correctly-and-keeps-its-rotation", {
    sourceMatrix: C.matrix, sourceBBox: C.bbox,
    withOptionOff: { x: +cGeomOff.x0.toFixed(3), y: +cGeomOff.y0.toFixed(3),
      width: +cGeomOff.width.toFixed(3), height: +cGeomOff.height.toFixed(3) },
    withOptionOn: { x: +cGeomOn.x0.toFixed(3), y: +cGeomOn.y0.toFixed(3),
      width: +cGeomOn.width.toFixed(3), height: +cGeomOn.height.toFixed(3) },
    widgetRect: C.rect,
    fittedMatrix: cGeomOn.matrix.map((n) => +n.toFixed(6))
  });

  console.log(JSON.stringify({ control: "appearance BBox-to-Rect fit (ISO 32000-1 12.5.5)", dpi: DPI, results }, null, 2));
}

await main();
