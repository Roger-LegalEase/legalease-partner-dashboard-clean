/**
 * DID THE DELIVERED PAGE KEEP THE INK THE OFFICIAL FORM PRINTS?
 *
 * WHY THIS EXISTS, AND WHY A GLYPH READER COULD NOT DO IT.
 *
 * VF01 found an opaque white rectangle painted over printed form text on CR-65
 * page 3 of every Alabama fixture built from that binary, partially erasing the
 * word "expired" in a Section III eligibility ground. Not one published counter
 * saw it, and neither did the families' own guards, because every one of them
 * is glyph-based: `pdftotext` still extracts a glyph that is sitting underneath
 * an opaque box, and a white fill draws no glyph of its own. VF01 proved the
 * blindness rather than asserting it -- on a scratch copy it painted an opaque
 * box over a line `assertPrintedElections` claims to read back out of the
 * delivered bytes, that line's rendered ink fell 7,544 px to 0, and
 * `assertRepairInvariants` PASSED.
 *
 * So the repair of that one misplacement is only half the job. This module is
 * the other half: a guard that can see occlusion, because it looks at pixels
 * rather than glyphs.
 *
 * THE QUESTION IT ASKS, EXACTLY.
 *
 *   Render the PINNED SOURCE page and the DELIVERED packet page at the same
 *   resolution, both with annotations. Every pixel that is ink in the source
 *   and not ink in the delivered page is LOST INK -- printed form ink the build
 *   destroyed. Lost ink is a defect UNLESS it lies inside the rectangle of a
 *   widget the source itself declares on that page, where a flattened control
 *   legitimately paints its own appearance over its own printed footprint.
 *
 * WHY THE BASELINE IS THE PINNED SOURCE AND NOTHING ELSE.
 *
 * The obvious baseline -- the same binary driven through the same
 * appearance-update / flatten / prune pipeline with no value set -- is the one
 * baseline that cannot work here, and the families' existing
 * `--negative-control` uses exactly it. A pipeline-introduced defect appears
 * identically in that baseline and is subtracted to zero BY CONSTRUCTION. The
 * CR-65 defect is pipeline-introduced. So the comparand is the pinned source
 * binary itself, untouched, as custody holds it.
 *
 * WHAT THIS GUARD CANNOT SEE, SAID PLAINLY.
 *
 *   - Ink the build ADDS. Added pixels are counted and returned, never
 *     asserted on: a build is supposed to add ink, and deciding which additions
 *     are wrong is a different question from this one.
 *   - Occlusion INSIDE a widget's own rectangle. That is the allowance below.
 *     A control that paints white over its own printed square is inside it, and
 *     so would a control that paints white over a caption the form prints
 *     inside the same rectangle. The allowance is bounded and reported per
 *     page, not hidden.
 *   - Anything on a page whose delivered raster does not match the source
 *     raster dimension-for-dimension. That is thrown, never passed.
 *   - Ink moved rather than erased -- a glyph drawn 2 pt off still leaves the
 *     source's pixel white, so it reads as lost, which is the safe direction,
 *     but a wholesale re-layout that happens to re-cover every source pixel
 *     would read clean.
 *   - Colour. The comparison is grayscale; ink repainted in a different hue of
 *     the same luminance is invisible to it.
 *
 * MEASUREMENT PARAMETERS ARE PUBLISHED, NOT ASSUMED. Resolution, ink threshold,
 * the rectangle allowance in points, the renderer and its annotation setting
 * all travel in the returned record.
 *
 * `readPGM` is imported read-only from scripts/rcap-truth-checks/lib/ink.mjs
 * rather than reimplemented. That file is not modified by this module.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readPGM } from "../rcap-truth-checks/lib/ink.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFNumber, PDFArray } = require("pdf-lib");

/** Default measurement scope. Every one of these is echoed in the result. */
export const DEFAULT_DPI = 300;
/** A pixel this dark or darker counts as ink, in both renders alike. */
export const DEFAULT_INK_THRESHOLD = 200;
/**
 * How far outside a declared widget rectangle a lost pixel is still credited to
 * that widget. Rasterising a rectangle edge at 300 dpi puts the boundary pixel
 * on one side or the other depending on rounding, so a bare 0 pt allowance
 * reports edge pixels of a legitimately flattened control as defects. 1 pt is
 * four pixels at 300 dpi and is far smaller than the 14.358 pt misplacement
 * this guard exists to catch.
 */
export const DEFAULT_RECT_TOLERANCE_PTS = 1;

/**
 * PDF 32000-1 7.9.5: a rectangle may store ANY two diagonally opposite corners,
 * and a consumer for which specific corners matter must normalize it. Reading
 * the normalized footprint here is what keeps the allowance from excusing the
 * very defect an inverted rectangle causes: the white box lands at the stored
 * Rect[1], which for an inverted rectangle is a box-height ABOVE the control.
 */
export function normalizedRect(values) {
  const [a, b, c, d] = values;
  return { x0: Math.min(a, c), y0: Math.min(b, d), x1: Math.max(a, c), y1: Math.max(b, d) };
}

/** Every widget the pinned source declares, by 1-based page, normalized. */
export async function readSourceWidgetRects(sourcePdfPath) {
  const document = await PDFDocument.load(fs.readFileSync(sourcePdfPath));
  const pages = document.getPages();
  const pageIndexByRef = new Map(pages.map((page, index) => [page.ref.toString(), index + 1]));
  const byPage = new Map();
  let widgets = 0;
  let inverted = 0;
  for (const field of document.getForm().getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      widgets += 1;
      const array = widget.dict.lookup(PDFName.of("Rect"), PDFArray);
      const values = [0, 1, 2, 3].map((i) => array.lookup(i, PDFNumber).asNumber());
      if (values[0] > values[2] || values[1] > values[3]) inverted += 1;
      const page = pageIndexByRef.get(String(widget.dict.get(PDFName.of("P")))) ?? null;
      if (page === null) continue;
      if (!byPage.has(page)) byPage.set(page, []);
      byPage.get(page).push({ field: field.getName(), ...normalizedRect(values) });
    }
  }
  return { byPage, widgets, inverted };
}

/**
 * One page to a grayscale P5 raster WITH annotations. pdftoppm draws annotation
 * appearances unless -hide-annotations is passed, and it is not passed here:
 * the flattened appearances in the delivered file must be compared against the
 * source's live widget appearances, so both renders must draw them.
 *
 * -gray alone yields PGM. `-gray -png` would yield RGB PNG and is not used.
 *
 * A renderer that is missing or that fails THROWS. A guard that quietly skips
 * when it cannot measure is the hole this module was written to close.
 */
export function renderPageToPGM(pdfPath, page1Based, dpi, scratchDir, tag) {
  const prefix = path.join(scratchDir, tag);
  execFileSync("pdftoppm", [
    "-gray", "-r", String(dpi),
    "-f", String(page1Based), "-l", String(page1Based),
    pdfPath, prefix
  ], { stdio: ["ignore", "ignore", "pipe"], timeout: 180000 });
  const produced = fs.readdirSync(scratchDir).filter((f) => f.startsWith(`${tag}-`) && f.endsWith(".pgm"));
  if (produced.length !== 1) {
    throw new Error(`pdftoppm produced ${produced.length} rasters for ${pdfPath} page ${page1Based}; expected exactly 1`);
  }
  const file = path.join(scratchDir, produced[0]);
  try { return readPGM(file); } finally { fs.rmSync(file, { force: true }); }
}

/**
 * Group lost pixels into clusters so a failure names WHERE the ink went, in
 * PDF points, instead of only how much of it went. Pixels within `gap` of each
 * other join, which keeps the strokes of one erased word in one cluster.
 */
function clusterLostPixels(lost, width, height, dpi, gap = 6) {
  const seen = new Uint8Array(lost.length);
  const clusters = [];
  const stack = [];
  for (let start = 0; start < lost.length; start += 1) {
    if (!lost[start] || seen[start]) continue;
    stack.push(start); seen[start] = 1;
    let count = 0, minX = width, maxX = -1, minY = height, maxY = -1;
    while (stack.length) {
      const at = stack.pop();
      count += 1;
      const x = at % width, y = (at / width) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (let dy = -gap; dy <= gap; dy += 1) {
        for (let dx = -gap; dx <= gap; dx += 1) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const k = ny * width + nx;
          if (lost[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
        }
      }
    }
    const toPt = (px) => Number((px * 72 / dpi).toFixed(2));
    const pageHeightPts = height * 72 / dpi;
    clusters.push({
      pixels: count,
      xPts: [toPt(minX), toPt(maxX + 1)],
      yPts: [Number((pageHeightPts - (maxY + 1) * 72 / dpi).toFixed(2)), Number((pageHeightPts - minY * 72 / dpi).toFixed(2))]
    });
  }
  return clusters.sort((a, b) => b.pixels - a.pixels);
}

/**
 * The measurement. `pages` is [{ packetPage, sourcePdf, sourcePage }].
 * Nothing is retained on disk: each raster is deleted the moment it is read,
 * and the scratch directory is removed on the way out.
 */
export async function measurePrintedSourceInkSurvival({
  deliveredPdf,
  pages,
  dpi = DEFAULT_DPI,
  inkThreshold = DEFAULT_INK_THRESHOLD,
  rectTolerancePts = DEFAULT_RECT_TOLERANCE_PTS,
  widgetRectsBySourcePdf = null
}) {
  const rects = widgetRectsBySourcePdf ?? new Map();
  for (const page of pages) {
    if (!rects.has(page.sourcePdf)) rects.set(page.sourcePdf, await readSourceWidgetRects(page.sourcePdf));
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "printed-source-ink-"));
  const perPage = [];
  try {
    for (const page of pages) {
      const source = renderPageToPGM(page.sourcePdf, page.sourcePage, dpi, scratch, "src");
      const delivered = renderPageToPGM(deliveredPdf, page.packetPage, dpi, scratch, "del");
      if (source.width !== delivered.width || source.height !== delivered.height) {
        throw new Error(`raster dimension mismatch on packet page ${page.packetPage}: source ${source.width}x${source.height} vs delivered ${delivered.width}x${delivered.height}`);
      }
      const { width, height } = source;
      const pageHeightPts = height * 72 / dpi;
      const declared = (rects.get(page.sourcePdf).byPage.get(page.sourcePage) ?? [])
        .map((rect) => ({
          field: rect.field,
          px0: Math.floor((rect.x0 - rectTolerancePts) * dpi / 72),
          px1: Math.ceil((rect.x1 + rectTolerancePts) * dpi / 72),
          py0: Math.floor((pageHeightPts - rect.y1 - rectTolerancePts) * dpi / 72),
          py1: Math.ceil((pageHeightPts - rect.y0 + rectTolerancePts) * dpi / 72)
        }));

      const lostMask = new Uint8Array(width * height);
      const outsideMask = new Uint8Array(width * height);
      let sourceInk = 0, lost = 0, added = 0, lostOutside = 0, lostReadingSolidWhite = 0;
      for (let i = 0; i < lostMask.length; i += 1) {
        const sourceIsInk = source.data[i] < inkThreshold;
        const deliveredIsInk = delivered.data[i] < inkThreshold;
        if (sourceIsInk) sourceInk += 1;
        if (!sourceIsInk && deliveredIsInk) { added += 1; continue; }
        if (!sourceIsInk || deliveredIsInk) continue;
        lost += 1;
        lostMask[i] = 1;
        if (delivered.data[i] === 255) lostReadingSolidWhite += 1;
        const x = i % width, y = (i / width) | 0;
        const excused = declared.some((r) => x >= r.px0 && x < r.px1 && y >= r.py0 && y < r.py1);
        if (!excused) { lostOutside += 1; outsideMask[i] = 1; }
      }
      perPage.push({
        packetPage: page.packetPage,
        sourcePdf: page.sourcePdf,
        sourcePage: page.sourcePage,
        sourceInkPixels: sourceInk,
        addedInkPixels: added,
        lostInkPixels: lost,
        lostInkPixelsReadingSolidWhite: lostReadingSolidWhite,
        lostInkInsideADeclaredWidgetRect: lost - lostOutside,
        lostInkOutsideEveryDeclaredWidgetRect: lostOutside,
        widgetRectsOnThisSourcePage: declared.length,
        lostInkClustersOutsideEveryWidgetRect: lostOutside ? clusterLostPixels(outsideMask, width, height, dpi) : []
      });
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  return {
    schemaVersion: "rcap-printed-source-ink-survival/v1",
    whatThisMeasures: "printed ink present in the pinned official source page that is absent from the delivered packet page, measured pixel by pixel; the comparand is the pinned source binary itself and never a pipeline-derived baseline",
    renderer: "pdftoppm -gray (binary P5 PGM, grayscale)",
    annotationsRendered: true,
    dpi,
    inkThreshold,
    inkThresholdMeaning: `a pixel with grey value < ${inkThreshold} is ink, in both renders alike`,
    widgetRectAllowancePts: rectTolerancePts,
    allowanceMeaning: "lost ink inside a widget rectangle the SOURCE declares (normalized per PDF 32000-1 7.9.5) is not a defect: a flattened control paints its own appearance over its own printed footprint",
    cannotSee: [
      "ink the build ADDS (counted, never asserted on)",
      "occlusion inside a widget's own declared rectangle",
      "ink re-drawn in a different colour at the same luminance",
      "a re-layout that happens to re-cover every source pixel"
    ],
    perPage
  };
}

/** Throws unless every page kept its printed ink outside every declared widget rectangle. */
export async function assertPrintedSourceInkSurvives(options) {
  const report = await measurePrintedSourceInkSurvival(options);
  const bad = report.perPage.filter((page) => page.lostInkOutsideEveryDeclaredWidgetRect > 0);
  if (bad.length) {
    const detail = bad.map((page) => {
      const where = page.lostInkClustersOutsideEveryWidgetRect
        .map((c) => `${c.pixels}px at x ${c.xPts[0]}-${c.xPts[1]} y ${c.yPts[0]}-${c.yPts[1]}`).join("; ");
      return `packet page ${page.packetPage} (${path.basename(page.sourcePdf)} page ${page.sourcePage}): `
        + `${page.lostInkOutsideEveryDeclaredWidgetRect} px of printed form ink erased outside every widget rectangle `
        + `(${page.lostInkPixelsReadingSolidWhite} of ${page.lostInkPixelsReadingSolidWhite === page.lostInkPixels ? "all" : page.lostInkPixels} lost pixels read solid white 255) -- ${where}`;
    }).join("\n  ");
    throw new Error(
      `PRINTED FORM INK ERASED IN THE DELIVERED PACKET, measured at ${report.dpi} dpi, ink threshold ${report.inkThreshold}:\n  ${detail}`
    );
  }
  return report;
}
