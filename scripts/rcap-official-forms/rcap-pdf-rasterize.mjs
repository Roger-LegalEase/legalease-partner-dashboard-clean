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
// environment where poppler, MuPDF and Ghostscript are not. The page's own
// media box drives the viewport, so `zoom=page-fit` fills the frame exactly
// and the capture is the whole page with nothing cropped and no viewer chrome.
//
// Deterministic for a given file: the same bytes at the same scale produce the
// same image, so a rendered page can be committed as evidence and compared.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const sharp = require("sharp");

// Playwright resolves a browser build this image does not carry; the stable
// symlink is the one that is actually installed here.
const CHROMIUM = process.env.RCAP_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

const MAX_RASTER_ATTEMPTS = Number(process.env.RCAP_RASTER_ATTEMPTS ?? 3);

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
export async function rasterizePdf({ file, outDir, pages = null, scale = 1.6, prefix = "page" }) {
  const { chromium } = require("playwright");
  const bytes = fs.readFileSync(file);
  const geometry = await pageGeometry(bytes);
  const wanted = pages ?? geometry.map((g) => g.page);

  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const rendered = [];
  try {
    for (const pageNumber of wanted) {
      const geo = geometry.find((g) => g.page === pageNumber);
      if (!geo) continue;
      // The viewport is given the page's own aspect ratio, so page-fit fills
      // it exactly rather than letterboxing the capture.
      const viewport = {
        width: Math.max(320, Math.round(geo.width * scale)),
        height: Math.max(320, Math.round(geo.height * scale))
      };
      const out = path.join(outDir, `${prefix}-${String(pageNumber).padStart(2, "0")}.png`);
      const baseSettle = Number(process.env.RCAP_RASTER_SETTLE_MS ?? 4000);
      let attempts = 0;
      let blank = true;
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
        const url = `file://${path.resolve(file)}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`;
        await tab.goto(url);
        await tab.waitForTimeout(baseSettle * attempts);
        await tab.screenshot({ path: out });
        await tab.close();
        blank = await looksUniform(out);
      }
      rendered.push({ page: pageNumber, file: out, widthPx: viewport.width, heightPx: viewport.height,
        pdfWidthPt: geo.width, pdfHeightPt: geo.height, attempts, looksBlank: blank });
    }
  } finally {
    await browser.close();
  }
  return rendered;
}
