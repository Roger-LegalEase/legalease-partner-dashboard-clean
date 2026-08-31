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
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, rgb } = require("pdf-lib");
const sharp = require("sharp");

/*
 * Where Chromium is, discovered rather than assumed.
 *
 * A hardcoded /opt/pw-browsers/chromium is right in one environment and wrong
 * in the next. Four packet-factory lanes returned STOPPED with "Playwright
 * cannot find Chromium at /opt/pw-browsers/chromium" or "pdftoppm ENOENT"
 * after passing preflight 14/14 -- the environment check said the lane could
 * run and the render step then discovered it could not. That is a preflight
 * that does not check the thing the lane actually needs.
 *
 * So the path is resolved in order: an explicit override, then the layout
 * Playwright's own PLAYWRIGHT_BROWSERS_PATH describes (a versioned
 * chromium-<build> directory, newest first, and the unversioned symlink),
 * then Playwright's own resolver. Every candidate is reported when none
 * works, because "Chromium is missing" and "Chromium is somewhere else" need
 * different fixes.
 */
/*
 * `headless_shell` is excluded deliberately. Playwright ships it as
 * chromium_headless_shell-<build>, it satisfies every existence and
 * executability test, and it has no PDF viewer: rasterizing through it fails
 * with "Download is starting" -- the page navigates to the PDF and the browser
 * offers to save it instead of drawing it. A preflight that accepts it passes
 * and is then contradicted by the render step, which is the exact class of
 * defect this resolver was written to end.
 */
const isRasterCapable = (p) => !/headless_shell/.test(p);
const executableFile = (p) => {
  try { return fs.statSync(p).isFile(); } catch { return false; }
};

function chromiumCandidates() {
  const out = [];
  // The override is a file, checked like every other candidate. It was pushed
  // unguarded, and a directory passes fs.accessSync(X_OK) -- so RCAP_CHROMIUM_PATH
  // pointing at chrome-linux/ instead of chrome-linux/chrome resolved cleanly and
  // then died with EACCES inside the render.
  if (process.env.RCAP_CHROMIUM_PATH && executableFile(process.env.RCAP_CHROMIUM_PATH)) out.push(process.env.RCAP_CHROMIUM_PATH);
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root && fs.existsSync(root)) {
    const versioned = fs.readdirSync(root)
      .filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d))
      .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const d of [...versioned, "chromium"]) {
      for (const exe of ["chrome-linux/chrome", ""]) {
        const p = exe ? path.join(root, d, exe) : path.join(root, d);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) out.push(p);
      }
    }
  }
  /*
   * PATH, then reviewed system locations.
   *
   * ENV-RAS01: a Codex Cloud container may carry a distribution Chromium with
   * no Playwright registry at all, and the resolver saw none of it -- it looked
   * only at two environment variables and Playwright's own layout. "Chromium is
   * absent" and "Chromium is somewhere this resolver does not look" produced
   * the same answer, and the second is a configuration fix while the first is a
   * provisioning one.
   *
   * Each name is resolved through PATH by `command -v`, and each result must be
   * an executable FILE. Presence is not executability and executability is not
   * renderability; probeRasterizer() answers the third.
   */
  for (const name of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"]) {
    const r = spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" });
    const p = (r.stdout ?? "").trim();
    if (p && executableFile(p)) out.push(p);
  }
  for (const p of [
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable", "/usr/local/bin/chromium",
    "/opt/google/chrome/chrome", "/opt/chromium/chrome"
  ]) if (executableFile(p)) out.push(p);

  return [...new Set(out)].filter(isRasterCapable);
}

export function resolveChromium() {
  const tried = chromiumCandidates();
  for (const p of tried) {
    try { fs.accessSync(p, fs.constants.X_OK); return { executablePath: p, resolvedBy: "discovered", tried }; }
    catch { /* keep looking */ }
  }
  // Playwright's own resolver, which knows its registry layout better than we do.
  try {
    const { chromium } = require("playwright");
    const p = chromium.executablePath();
    if (p && fs.existsSync(p)) return { executablePath: p, resolvedBy: "playwright_executable_path", tried: [...tried, p] };
  } catch { /* fall through to the refusal */ }
  return { executablePath: null, resolvedBy: null, tried };
}
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

  const resolved = resolveChromium();
  if (!resolved.executablePath) {
    throw new Error(
      "no usable Chromium for page rastering. Tried: "
      + (resolved.tried.length ? resolved.tried.join(", ") : "(nothing — PLAYWRIGHT_BROWSERS_PATH is unset)")
      + ". Set RCAP_CHROMIUM_PATH to the browser binary. Do NOT fall back to pdftoppm and do NOT install packages."
    );
  }
  const browser = await chromium.launch({ executablePath: resolved.executablePath, args: ["--no-sandbox"] });
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

/*
 * The preflight's question, answered by doing it.
 *
 * page_rasterizer_available used to pass on any path satisfying
 * fs.accessSync(X_OK). C13 produced two environments where it printed ok and
 * the render then failed: a browsers path holding only
 * chromium_headless_shell (no PDF viewer, "Download is starting"), and
 * RCAP_CHROMIUM_PATH pointed at a directory (EACCES on spawn). Executability
 * is not renderability, and only a render can tell them apart.
 *
 * So this writes a one-page PDF with a black rule on it, rasterizes it through
 * the same path the lanes use, and requires paper to be found. It costs one
 * browser launch in a check that runs once per lane.
 */
export async function probeRasterizer() {
  const resolved = resolveChromium();
  if (!resolved.executablePath) return { ok: false, why: "no executable Chromium", tried: resolved.tried };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-raster-probe-"));
  const file = path.join(dir, "probe.pdf");
  // A minimal one-page PDF, written by hand so the probe depends on no library
  // and no fixture that could go missing.
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>",
    "<< /Length 44 >>\nstream\n0 0 0 rg 100 400 412 24 re f\nendstream"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objs.length; i += 1) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(file, pdf, "latin1");
  try {
    const render = await rasterizePageCalibrated({ file, pageIndex: 0 });
    if (!render || !render.paper) return { ok: false, why: "the render found no paper on a one-page PDF", executablePath: resolved.executablePath };
    return { ok: true, executablePath: resolved.executablePath, resolvedBy: resolved.resolvedBy, paper: render.paper };
  } catch (e) {
    return { ok: false, why: `the render failed: ${String(e.message ?? e).split("\n")[0]}`, executablePath: resolved.executablePath };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* the probe owns this directory */ }
  }
}
