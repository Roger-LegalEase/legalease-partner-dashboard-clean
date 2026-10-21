#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const { PNG } = require("pngjs");
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const OUT = "data/rcap-grade-a/codex-cloud/ks-municipal-independent-review";
const FAMILY = "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading";
const SCALE = 2.5;
const VIEWER_PX_PER_PT = 4 / 3;
const SURROUND = 80;
const PAPER_THRESHOLD = 250;
const INK_THRESHOLD = 245;
const PAGE_SIZE_TOLERANCE = 3;
const browserExecutable = process.env.RCAP_CHROMIUM_PATH;

if (!browserExecutable || !fs.existsSync(browserExecutable)) {
  throw new Error("Set RCAP_CHROMIUM_PATH to a full Chromium executable path");
}

const documents = [
  {
    route: "ks-12-4516-municipal",
    fixture: "canonical",
    relative: `${FAMILY}/fixtures/routes/ks-12-4516-municipal/canonical.pdf`,
    expectedSha256: "f79d5b4e82d3ccf22c9b03aa42ad202e0796a13b4de95f3d25b38b2adf22f810",
    expectedBytes: 18262,
    expectedPages: 6
  },
  {
    route: "ks-12-4516-municipal",
    fixture: "boundary",
    relative: `${FAMILY}/fixtures/routes/ks-12-4516-municipal/boundary.pdf`,
    expectedSha256: "7b234e970d38bdc0515122916c6f3961f1140e74f12978b6096e6aa34928600f",
    expectedBytes: 18886,
    expectedPages: 7
  },
  {
    route: "ks-12-4516a-municipal-arrest",
    fixture: "canonical",
    relative: `${FAMILY}/fixtures/routes/ks-12-4516a-municipal-arrest/canonical.pdf`,
    expectedSha256: "8a85bc0f2365938bd8b5e0483585b95abf2550a6cc24a4717b0d72001abd708d",
    expectedBytes: 17378,
    expectedPages: 6
  },
  {
    route: "ks-12-4516a-municipal-arrest",
    fixture: "boundary",
    relative: `${FAMILY}/fixtures/routes/ks-12-4516a-municipal-arrest/boundary.pdf`,
    expectedSha256: "dd364be7194a5e23643057ba75e5d5ea84950e7cd18b2945db5483761b9f3617",
    expectedBytes: 17578,
    expectedPages: 6
  }
];

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function paperBounds(png) {
  let x0 = png.width;
  let y0 = png.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const i = (y * png.width + x) * 4;
      if (png.data[i] < PAPER_THRESHOLD || png.data[i + 1] < PAPER_THRESHOLD || png.data[i + 2] < PAPER_THRESHOLD) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

function cropPng(source, bounds) {
  const out = new PNG({ width: bounds.width, height: bounds.height });
  PNG.bitblt(source, out, bounds.x0, bounds.y0, bounds.width, bounds.height, 0, 0);
  return out;
}

function measureInk(png) {
  let x0 = png.width;
  let y0 = png.height;
  let x1 = -1;
  let y1 = -1;
  let inkPixels = 0;
  let pageEdgeInkPixels = 0;
  let withinFivePxOfPageEdge = 0;
  let withinTwelvePxOfPageEdge = 0;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const i = (y * png.width + x) * 4;
      const grey = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
      if (png.data[i + 3] === 0 || grey >= INK_THRESHOLD) continue;
      inkPixels += 1;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      const edgeDistance = Math.min(x, y, png.width - 1 - x, png.height - 1 - y);
      if (edgeDistance === 0) pageEdgeInkPixels += 1;
      if (edgeDistance < 5) withinFivePxOfPageEdge += 1;
      if (edgeDistance < 12) withinTwelvePxOfPageEdge += 1;
    }
  }
  if (x1 < 0) return { inkPixels: 0, inkBounds: null };
  return {
    inkPixels,
    inkBounds: { x0, y0, x1, y1, width: x1 - x0 + 1, height: y1 - y0 + 1 },
    inkMarginsPx: { left: x0, top: y0, right: png.width - 1 - x1, bottom: png.height - 1 - y1 },
    pageEdgeInkPixels,
    withinFivePxOfPageEdge,
    withinTwelvePxOfPageEdge
  };
}

async function isolatedPage(source, index, magnify) {
  const { width, height } = source.getPage(index).getSize();
  const out = await PDFDocument.create();
  const [embedded] = await out.embedPages([source.getPage(index)]);
  const page = out.addPage([width * magnify, height * magnify]);
  page.drawPage(embedded, { x: 0, y: 0, width: width * magnify, height: height * magnify });
  return { bytes: await out.save(), width, height };
}

fs.mkdirSync(path.join(ROOT, OUT, "rasters"), { recursive: true });
fs.mkdirSync(path.join(ROOT, OUT, "exact-pdfs"), { recursive: true });
const stage = path.join(ROOT, OUT, ".render-stage");
fs.mkdirSync(stage, { recursive: true });
const browser = await chromium.launch({ executablePath: browserExecutable, args: ["--no-sandbox"] });
const receipt = {
  schemaVersion: "ks-municipal-exact-byte-raster-metrics/v1",
  scalePixelsPerPoint: SCALE,
  dpi: SCALE * 72,
  browserExecutable,
  browserVersion: await browser.version(),
  documents: []
};

try {
  for (const spec of documents) {
    const file = path.join(ROOT, spec.relative);
    const bytes = fs.readFileSync(file);
    const observedSha256 = sha256(bytes);
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const observedPages = source.getPageCount();
    if (observedSha256 !== spec.expectedSha256 || bytes.length !== spec.expectedBytes || observedPages !== spec.expectedPages) {
      throw new Error(`${spec.route}/${spec.fixture} did not match the required source identity`);
    }
    const exactName = `${spec.route}--${spec.fixture}.pdf`;
    const exactRelative = `${OUT}/exact-pdfs/${exactName}`;
    fs.copyFileSync(file, path.join(ROOT, exactRelative));
    const rasterDirRelative = `${OUT}/rasters/${spec.route}/${spec.fixture}`;
    const rasterDir = path.join(ROOT, rasterDirRelative);
    fs.mkdirSync(rasterDir, { recursive: true });
    const docRow = {
      route: spec.route,
      fixture: spec.fixture,
      sourcePath: spec.relative,
      exactCopyPath: exactRelative,
      sha256: observedSha256,
      byteLength: bytes.length,
      pageCount: observedPages,
      identityMatchesRequirement: true,
      pages: []
    };
    for (let pageIndex = 0; pageIndex < observedPages; pageIndex += 1) {
      const pageNumber = pageIndex + 1;
      const isolated = await isolatedPage(source, pageIndex, SCALE / VIEWER_PX_PER_PT);
      const pagePdf = path.join(stage, `${spec.route}--${spec.fixture}--page-${String(pageNumber).padStart(3, "0")}.pdf`);
      const framePng = path.join(stage, `${spec.route}--${spec.fixture}--page-${String(pageNumber).padStart(3, "0")}--frame.png`);
      fs.writeFileSync(pagePdf, isolated.bytes);
      const expectedWidth = Math.round(isolated.width * SCALE);
      const expectedHeight = Math.round(isolated.height * SCALE);
      const tab = await browser.newPage({ viewport: { width: expectedWidth + SURROUND * 2, height: expectedHeight + SURROUND * 2 } });
      await tab.goto(`file://${pagePdf}#toolbar=0&navpanes=0&scrollbar=0`);
      let frame = null;
      let paper = null;
      let attempts = 0;
      while (!paper && attempts < 5) {
        attempts += 1;
        await tab.waitForTimeout(attempts * 2000);
        await tab.screenshot({ path: framePng });
        frame = PNG.sync.read(fs.readFileSync(framePng));
        paper = paperBounds(frame);
      }
      await tab.close();
      if (!paper) throw new Error(`no paper detected for ${spec.route}/${spec.fixture} page ${pageNumber}`);
      const sizeDriftPx = Math.max(Math.abs(paper.width - expectedWidth), Math.abs(paper.height - expectedHeight));
      if (sizeDriftPx > PAGE_SIZE_TOLERANCE) {
        throw new Error(`page-size drift ${sizeDriftPx}px for ${spec.route}/${spec.fixture} page ${pageNumber}`);
      }
      const cropped = cropPng(frame, paper);
      const pngBytes = PNG.sync.write(cropped);
      const rasterRelative = `${rasterDirRelative}/page-${String(pageNumber).padStart(3, "0")}.png`;
      fs.writeFileSync(path.join(ROOT, rasterRelative), pngBytes);
      docRow.pages.push({
        page: pageNumber,
        rasterPath: rasterRelative,
        rasterSha256: sha256(pngBytes),
        rasterByteLength: pngBytes.length,
        widthPx: cropped.width,
        heightPx: cropped.height,
        pdfWidthPt: isolated.width,
        pdfHeightPt: isolated.height,
        paperBoundsInViewerFrame: paper,
        expectedWidthPx: expectedWidth,
        expectedHeightPx: expectedHeight,
        sizeDriftPx,
        renderAttempts: attempts,
        croppedToExactDetectedPaper: true,
        ...measureInk(cropped)
      });
    }
    receipt.documents.push(docRow);
  }
} finally {
  await browser.close();
}

receipt.totalPages = receipt.documents.reduce((sum, doc) => sum + doc.pages.length, 0);
receipt.everyPageRastered = receipt.totalPages === documents.reduce((sum, doc) => sum + doc.expectedPages, 0);
fs.writeFileSync(path.join(ROOT, OUT, "raster-metrics.generated.json"), `${JSON.stringify(receipt, null, 2)}\n`);
fs.rmSync(stage, { recursive: true, force: true });
console.log(JSON.stringify({ totalPages: receipt.totalPages, everyPageRastered: receipt.everyPageRastered, browserVersion: receipt.browserVersion }));
