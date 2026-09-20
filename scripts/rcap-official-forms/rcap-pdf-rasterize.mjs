// Rasterizes PDF pages to PNG so a person can look at them.
//
// Extracting a PDF's text is not visual review. Text extraction cannot see a
// value clipped by its widget rectangle, a caption written over preprinted
// wording, a column the value landed in, a page that renders blank, or a
// margin the text ran past. Those are the defects visual review exists to
// catch, and every one of them needs a picture.
//
// This renders through Chromium's bundled PDF engine, which is a real PDF
// renderer rather than a re-implementation, and is available in this
// environment where poppler, MuPDF and Ghostscript are not.
//
// WHAT THE VIEWER ACTUALLY DOES, AND WHY THIS IS SHAPED THE WAY IT IS
//
// The obvious approach -- size the viewport to the page and pass
// `zoom=page-fit` -- does not work, and fails quietly. Chromium's PDF viewer
// ignores that parameter. It lays the document out at its own zoom, which is
// 100% (so 96dpi, a fixed 4/3 pixels per point, whatever `scale` says), centres
// it on a dark surround, and scrolls continuously; `#page=N` scrolls to page N
// rather than isolating it. A capture taken that way is a scroll position, not
// a page: it carries part of the neighbouring pages, dark margins down both
// sides, and a resolution that has nothing to do with the caller's `scale`.
// Nothing about it looks wrong -- the image is a plausible picture of a
// document -- which is exactly what makes it dangerous as evidence, and it
// silently defeated a measurement that cropped by `x * scale` and read the dark
// surround back as "nothing is drawn here".
//
// So two things are done instead of asking the viewer for them:
//
//   * The page is ISOLATED into its own single-page document, so there is no
//     neighbouring page to scroll into frame.
//   * The page is MAGNIFIED in PDF space -- drawn as a form XObject onto a
//     larger media box -- so that the viewer's fixed 4/3 rendering produces
//     exactly the caller's requested pixels per point. Not one content operator
//     is touched; only the media box and a scale.
//
// The paper rectangle is then measured against the surround and cropped to,
// and its size is checked against what `scale` demands before the image is
// returned. A render whose page does not come out the requested size is a
// failure rather than a picture.
//
// Deterministic for a given file: the same bytes at the same scale produce the
// same image, so a rendered page can be committed as evidence and compared.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const sharp = require("sharp");

// Playwright resolves a browser build this image does not carry; the stable
// symlink is the one that is actually installed here.
const CHROMIUM = process.env.RCAP_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

const MAX_RASTER_ATTEMPTS = Number(process.env.RCAP_RASTER_ATTEMPTS ?? 3);
// Enough surround that the paper never touches a viewport edge, which is what
// makes its bounds measurable rather than clipped.
const SURROUND_PX = 80;
// A page may land a pixel off from rounding. More than that is a layout this
// does not understand.
const PAGE_SIZE_TOLERANCE_PX = 3;

/**
 * True when the capture carries no ink at all. A rendered PDF page always
 * carries some -- a rule, a caption, a border -- so a uniform image means the
 * engine had not painted when the screenshot was taken.
 */
async function looksUniform(pngPath) {
  const { channels } = await sharp(pngPath).greyscale().stats();
  const grey = channels[0];
  return grey.max - grey.min <= 6;
}

/** Media-box width and height of every page, in PDF points. */
export async function pageGeometry(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page, index) => {
    const { width, height } = page.getSize();
    return { page: index + 1, width, height };
  });
}

/**
 * Renders `pages` of `file` into `outDir` as page-NN.png.
 *
 * `scale` multiplies the PDF's own point dimensions to give the pixel size, so
 * scale 1 is 72dpi and scale 2 is 144dpi. Returns one row per rendered page.
 */
/** Pixels per point the viewer paints at, ignoring whatever zoom is asked for. */
const VIEWER_PX_PER_PT = 4 / 3;

/**
 * Page `index` of `bytes`, alone on its own document, scaled by `magnify`.
 *
 * The page is drawn as a form XObject rather than edited, so its content stream
 * is the one the publisher wrote.
 */
async function isolatedMagnifiedPage(bytes, index, magnify) {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const { width, height } = src.getPage(index).getSize();
  const out = await PDFDocument.create();
  const [embedded] = await out.embedPages([src.getPage(index)]);
  const page = out.addPage([width * magnify, height * magnify]);
  page.drawPage(embedded, { x: 0, y: 0, width: width * magnify, height: height * magnify });
  return { bytes: await out.save(), width, height };
}

/** Bounding box of paper-white pixels: the page against the viewer's surround. */
async function paperBounds(pngPath) {
  const { data, info } = await sharp(pngPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < 250) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/**
 * Renders `pages` of `file` into `outDir` as page-NN.png, one clean page per
 * image, cropped to the paper and at exactly `scale` pixels per PDF point --
 * so scale 1 is 72dpi and scale 2 is 144dpi, as the name says.
 *
 * Returns one row per rendered page. `widthPx`/`heightPx` are the image's own
 * dimensions, which are the page's, because there is nothing else in the image.
 */
export async function rasterizePdf({ file, outDir, pages = null, scale = 1.6, prefix = "page" }) {
  const { chromium } = require("playwright");
  const bytes = fs.readFileSync(file);
  const geometry = await pageGeometry(bytes);
  const wanted = pages ?? geometry.map((g) => g.page);
  const magnify = scale / VIEWER_PX_PER_PT;
  if (!(magnify > 0)) throw new Error(`rasterizePdf: scale must be positive, got ${scale}`);

  fs.mkdirSync(outDir, { recursive: true });
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-rasterize-"));
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const rendered = [];
  try {
    for (const pageNumber of wanted) {
      const geo = geometry.find((g) => g.page === pageNumber);
      if (!geo) continue;
      const wantWide = Math.round(geo.width * scale);
      const wantHigh = Math.round(geo.height * scale);
      // Room for the page plus the viewer's surround on every side, so the
      // paper never touches an edge and its bounds are fully measurable.
      const viewport = {
        width: Math.max(320, wantWide + SURROUND_PX * 2),
        height: Math.max(320, wantHigh + SURROUND_PX * 2)
      };
      const isolated = await isolatedMagnifiedPage(bytes, pageNumber - 1, magnify);
      const isolatedPath = path.join(stage, `${prefix}-${String(pageNumber).padStart(2, "0")}.pdf`);
      fs.writeFileSync(isolatedPath, isolated.bytes);
      const out = path.join(outDir, `${prefix}-${String(pageNumber).padStart(2, "0")}.png`);
      const shot = path.join(stage, `${prefix}-${String(pageNumber).padStart(2, "0")}-frame.png`);
      const baseSettle = Number(process.env.RCAP_RASTER_SETTLE_MS ?? 4000);
      let attempts = 0;
      let blank = true;
      let paper = null;
      // The PDF engine paints asynchronously and exposes no ready signal to the
      // embedding page, so the wait is a settle rather than a poll -- and a
      // settle that is occasionally too short returns a uniform image that
      // looks exactly like a successful render of a blank page. Downstream
      // that reads as "not comparable" and quietly loses evidence which was
      // there the run before, so a uniform capture is retried with a longer
      // settle and the outcome is reported rather than assumed.
      while (attempts < MAX_RASTER_ATTEMPTS && blank) {
        attempts += 1;
        const tab = await browser.newPage({ viewport });
        await tab.goto(`file://${isolatedPath}#toolbar=0&navpanes=0&scrollbar=0`);
        await tab.waitForTimeout(baseSettle * attempts);
        await tab.screenshot({ path: shot });
        await tab.close();
        blank = await looksUniform(shot);
        if (!blank) paper = await paperBounds(shot);
      }
      if (blank) {
        // Nothing painted. Keep the frame so the failure is inspectable rather
        // than inferred, and report it the way this always has.
        fs.copyFileSync(shot, out);
        rendered.push({ page: pageNumber, file: out, widthPx: viewport.width, heightPx: viewport.height,
          pdfWidthPt: geo.width, pdfHeightPt: geo.height, attempts, looksBlank: true, croppedToPage: false });
        continue;
      }
      if (!paper) throw new Error(`rasterizePdf: page ${pageNumber} of ${file} rendered with no paper-white region`);
      // The page has to come out the size `scale` demands. If it does not, the
      // viewer laid it out some way this does not understand, and the honest
      // answer is to stop rather than to return a picture at an unknown scale.
      const drift = Math.max(Math.abs(paper.width - wantWide), Math.abs(paper.height - wantHigh));
      if (drift > PAGE_SIZE_TOLERANCE_PX) {
        throw new Error(
          `rasterizePdf: page ${pageNumber} of ${file} rendered ${paper.width}x${paper.height}px, `
          + `expected ${wantWide}x${wantHigh}px at scale ${scale}. The viewer's layout is not what this assumes.`
        );
      }
      await sharp(shot).extract(paper).png().toFile(out);
      rendered.push({ page: pageNumber, file: out, widthPx: paper.width, heightPx: paper.height,
        pdfWidthPt: geo.width, pdfHeightPt: geo.height, attempts, looksBlank: false, croppedToPage: true });
    }
  } finally {
    await browser.close();
    fs.rmSync(stage, { recursive: true, force: true });
  }
  return rendered;
}
