// Renders one PDF page and hands back an exact page-point → image-pixel map.
//
// Cropping a rectangle out of a rendered page needs to know where the page
// landed in the image, and the obvious assumption — that a viewport sized to
// the page renders the page edge to edge — is false here. Chromium's PDF
// viewer ignores `zoom=page-fit`, lays the document out at its own zoom on its
// own dark surround, and scrolls. A crop computed as `x * scale` therefore
// lands somewhere arbitrary, and the arithmetic gives no sign of it: the window
// comes back uniformly dark and reads as "no border, no interior", which is
// indistinguishable from a real finding.
//
// So nothing here is assumed. Two things are measured:
//
//   1. The page rectangle, as the bounding box of the white paper against the
//      viewer's dark surround. That fixes origin and scale.
//   2. The same transform, independently, from two calibration marks stamped at
//      known page coordinates on a throwaway copy and located by differencing
//      the two renders.
//
// If those two disagree by more than a pixel the render is refused rather than
// reported, because at that point the mapping is not known and any crop taken
// through it is a guess.
//
// The page is magnified in PDF space before rendering — the original page drawn
// as a form XObject onto a larger media box — because the viewer's zoom is not
// controllable but the page's own dimensions are. That buys resolution without
// touching a single content operator: the marks used for calibration go on a
// separate copy, and the image that gets measured is a render of the page as
// the court published it.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, rgb } = require("pdf-lib");
const sharp = require("sharp");

const CHROMIUM = process.env.RCAP_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const SETTLE_MS = Number(process.env.RCAP_RASTER_SETTLE_MS ?? 5000);
const VIEWPORT = { width: 2448, height: 3168 };

/** Page index `index` of `bytes`, scaled by `magnify` onto its own document. */
async function magnifiedPage(bytes, index, magnify, marks) {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const { width, height } = src.getPage(index).getSize();
  const out = await PDFDocument.create();
  const [embedded] = await out.embedPages([src.getPage(index)]);
  const page = out.addPage([width * magnify, height * magnify]);
  page.drawPage(embedded, { x: 0, y: 0, width: width * magnify, height: height * magnify });
  for (const m of marks ?? []) {
    page.drawRectangle({
      x: m.x * magnify, y: m.y * magnify, width: m.size * magnify, height: m.size * magnify, color: rgb(0, 0, 0)
    });
  }
  return { bytes: await out.save(), width, height };
}

async function grey(file) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, at: (x, y) => data[y * info.width + x] };
}

/** Bounding box of paper-white pixels — the page against the viewer's surround. */
function paperBounds(img, threshold = 250) {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.at(x, y) < threshold) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Centroids of the pixels that differ between two renders, split left/right. */
function markCentroids(a, b, delta = 60) {
  const pts = [];
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const i = y * a.width + x;
      if (Math.abs(a.data[i] - b.data[i]) > delta) pts.push([x, y]);
    }
  }
  if (pts.length < 8) return null;
  const xs = pts.map((p) => p[0]);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centroid = (keep) => {
    const g = pts.filter(keep);
    if (!g.length) return null;
    return { n: g.length, x: g.reduce((s, p) => s + p[0], 0) / g.length, y: g.reduce((s, p) => s + p[1], 0) / g.length };
  };
  const lower = centroid((p) => p[0] < mid), upper = centroid((p) => p[0] >= mid);
  return lower && upper ? { lower, upper } : null;
}

/**
 * Renders page `pageIndex` of `file` and returns the render plus a verified
 * mapping from that page's own coordinate system into image pixels.
 *
 * `toImage(x, y)` takes original page points (y upward, origin bottom-left) and
 * returns image pixels (y downward, origin top-left).
 */
export async function rasterizePageCalibrated({ file, pageIndex, magnify = 2.5, tolerancePx = 1.5, keep = null }) {
  const { chromium } = require("playwright");
  const bytes = fs.readFileSync(file);
  const stage = keep ?? fs.mkdtempSync(path.join(os.tmpdir(), "rcap-page-raster-"));
  fs.mkdirSync(stage, { recursive: true });
  const plain = await magnifiedPage(bytes, pageIndex, magnify, null);
  const { width: pageWidth, height: pageHeight } = plain;
  // Far enough in to sit on paper rather than on a trim edge, far enough apart
  // that a scale error shows up as pixels rather than rounding.
  const marks = [{ x: 20, y: 20, size: 8 }, { x: pageWidth - 28, y: pageHeight - 28, size: 8 }];
  const cal = await magnifiedPage(bytes, pageIndex, magnify, marks);
  const plainPdf = path.join(stage, "page.pdf"), calPdf = path.join(stage, "page-calibration.pdf");
  fs.writeFileSync(plainPdf, plain.bytes);
  fs.writeFileSync(calPdf, cal.bytes);

  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const shoot = async (pdf, name) => {
    const tab = await browser.newPage({ viewport: VIEWPORT });
    await tab.goto(`file://${pdf}#toolbar=0&navpanes=0&scrollbar=0`);
    await tab.waitForTimeout(SETTLE_MS);
    const out = path.join(stage, name);
    await tab.screenshot({ path: out });
    await tab.close();
    return out;
  };
  let plainPng, calPng;
  try {
    plainPng = await shoot(plainPdf, "page.png");
    calPng = await shoot(calPdf, "page-calibration.png");
  } finally {
    await browser.close();
  }

  const a = await grey(plainPng), b = await grey(calPng);
  const paper = paperBounds(a);
  if (!paper) throw new Error("raster carries no paper-white region — the page did not render");
  // The magnified page fills `paper`, so the paper rectangle divided by the
  // ORIGINAL page dimensions is pixels per original point directly.
  const pxPerPt = paper.width / pageWidth;
  const pxPerPtVertical = paper.height / pageHeight;
  if (Math.abs(pxPerPt - pxPerPtVertical) > 0.01) {
    throw new Error(
      `page render is not isotropic: ${pxPerPt.toFixed(4)} px/pt across, ${pxPerPtVertical.toFixed(4)} down. `
      + "Something clipped or stretched the page."
    );
  }
  const toImage = (x, y) => ({ x: paper.x0 + x * pxPerPt, y: paper.y1 - y * pxPerPt });

  const centroids = markCentroids(a, b);
  if (!centroids) throw new Error("calibration marks did not change the render — the page is outside the captured area");
  const expectLower = toImage(marks[0].x + marks[0].size / 2, marks[0].y + marks[0].size / 2);
  const expectUpper = toImage(marks[1].x + marks[1].size / 2, marks[1].y + marks[1].size / 2);
  const residual = Math.max(
    Math.abs(expectLower.x - centroids.lower.x), Math.abs(expectLower.y - centroids.lower.y),
    Math.abs(expectUpper.x - centroids.upper.x), Math.abs(expectUpper.y - centroids.upper.y)
  );
  if (!(residual <= tolerancePx)) {
    throw new Error(
      `page-to-pixel mapping is not trustworthy: paper bounds and calibration marks disagree by ${residual.toFixed(2)}px `
      + `(tolerance ${tolerancePx}px). Refusing to crop through a mapping that is a guess.`
    );
  }

  return {
    image: plainPng, calibrationImage: calPng, stage, magnify, pxPerPt,
    pageWidth, pageHeight, paper, pxPerPtVertical, calibrationResidualPx: +residual.toFixed(3), toImage,
    dispose: () => { if (!keep) fs.rmSync(stage, { recursive: true, force: true }); }
  };
}

/**
 * Reads one rectangle of page space out of a calibrated render.
 *
 * `borderDarkest` is the darkest pixel on the outer band, `interiorDarkest` the
 * darkest inside it. A drawn, unmarked control is dark on the band and clean
 * within.
 */
export async function inspectRect(render, { x0, y0, x1, y1 }, { bandPt = 1.5 } = {}) {
  const tl = render.toImage(x0, y1), br = render.toImage(x1, y0);
  const left = Math.round(tl.x), top = Math.round(tl.y);
  const width = Math.round(br.x - tl.x), height = Math.round(br.y - tl.y);
  const crop = await sharp(render.image).extract({ left, top, width, height })
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = crop;
  const at = (x, y) => data[y * info.width + x];
  const band = Math.max(2, Math.round(bandPt * render.pxPerPt));
  let borderDarkest = 255, interiorDarkest = 255, interiorPixels = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const onBand = x < band || y < band || x >= info.width - band || y >= info.height - band;
      const v = at(x, y);
      if (onBand) { if (v < borderDarkest) borderDarkest = v; }
      else { interiorPixels += 1; if (v < interiorDarkest) interiorDarkest = v; }
    }
  }
  return {
    crop: { left, top, width, height }, band, interiorPixels,
    borderDarkestLuma: borderDarkest, interiorDarkestLuma: interiorDarkest,
    borderVisible: borderDarkest < 160,
    interiorEmpty: interiorPixels > 0 && interiorDarkest > 200
  };
}
