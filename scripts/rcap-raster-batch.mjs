#!/usr/bin/env node
/**
 * Render one queued family's packet and measure every page.
 *
 * The bytes are pinned. The queue records the SHA-256 of the canonical and
 * boundary PDFs it queued, and this refuses if what is on disk is not those
 * bytes: a receipt describing a different packet is not this family's evidence,
 * however clean the rasters look. That refusal is the whole reason the hashes
 * are in the queue.
 *
 * It writes nothing but its own output directory, modifies no packet PDF, and
 * decides nothing about PASS_COMPLETE. It produces the measurement; RAS01-RAS04
 * read it and return a verdict.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { resolveChromium, rasterizePageCalibrated } from "./raster/pdf-page-raster.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flag = (n) => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const MANIFEST = flag("--manifest") ?? "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json";
const FAMILY = flag("--family");
const COMMIT = flag("--commit") ?? null;
const SCALE = Number(flag("--scale") ?? 2.5);
const RUN_ID = flag("--run-id") ?? null;
const OUT = path.resolve(flag("--out") ?? "raster-out");

const CSS_PX_PER_PT = 96 / 72;
const fail = (why) => { console.error(`REFUSED raster batch — ${why}`); process.exit(1); };
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

if (!FAMILY) fail("--family is required; a batch that renders everything by default renders the wrong thing quietly");
const queue = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST), "utf8"));
const row = (queue.rows ?? []).find((r) => r.familyId === FAMILY);
if (!row) fail(`${FAMILY} is not in ${MANIFEST}`);
if (row.currentRasterState !== "RASTER_PENDING") fail(`${FAMILY} is ${row.currentRasterState}, not RASTER_PENDING`);

const resolved = resolveChromium();
if (!resolved.executablePath) {
  // An environment that cannot look at the packet has said nothing about the
  // packet. This is never RASTER_FAIL.
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${FAMILY}.verdict.json`), `${JSON.stringify({
    schemaVersion: "rcap-raster-family-verdict/v1", familyId: FAMILY,
    verdict: "RASTER_BLOCKED_ENVIRONMENT",
    why: "no executable Chromium on this runner; the packet was not examined and nothing is claimed about it",
    tried: resolved.tried, packetPdfsModified: 0
  }, null, 2)}\n`);
  console.error(`RASTER_BLOCKED_ENVIRONMENT ${FAMILY}`);
  process.exit(1);
}
if (/headless_shell/.test(resolved.executablePath)) fail("headless_shell cannot render a PDF");

const inkFraction = async (png, paper) => {
  // Inside the paper. Measured across the whole image, the viewer's grey ground
  // around the sheet reads as 31% ink on a blank page.
  const img = sharp(png).greyscale();
  const c = paper ? img.extract({
    left: Math.max(0, Math.round(paper.x0)), top: Math.max(0, Math.round(paper.y0)),
    width: Math.max(1, Math.round(paper.width)), height: Math.max(1, Math.round(paper.height))
  }) : img;
  const { data, info } = await c.raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let i = 0; i < data.length; i += 1) if (data[i] < 200) dark += 1;
  return dark / (info.width * info.height);
};

/*
 * Page count from the parser, not from a byte scan.
 *
 * The scan matched /Type /Page in the raw bytes, which is only visible when the
 * page dictionaries sit in the file uncompressed. A PDF that stores them in a
 * compressed object stream (/ObjStm) has pages and no raw matches, so the scan
 * returned zero and the family was emitted RASTER_FAIL "reports zero pages"
 * without a single page being rendered -- a refusal caused by the reader.
 *
 * Measured over the 25 queued families at 09b741ad0: none of the 50 PDFs use
 * /ObjStm today and the scan agreed with the parser on all 50, so this was
 * latent rather than live. It is still the reader's job to read the format, and
 * pdf-lib is already loaded here to render.
 */
const pageCount = async (p) => (await PDFDocument.load(fs.readFileSync(p), { ignoreEncryption: true, updateMetadata: false })).getPageCount();

fs.mkdirSync(OUT, { recursive: true });
const artifacts = [];
const problems = [];

for (const kind of ["canonical", "boundary"]) {
  const rel = kind === "canonical" ? row.canonicalPdfPath : row.boundaryPdfPath;
  const expected = kind === "canonical" ? row.canonicalPdfSha256 : row.boundaryPdfSha256;
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { problems.push(`${kind}: ${rel} is absent at this commit`); continue; }
  const observed = sha256(abs);
  if (observed !== expected) {
    // The queue pinned these bytes. Different bytes are a different packet, and
    // rendering them would produce evidence about something nobody queued.
    problems.push(`${kind}: ${rel} hashes ${observed} and the queue pinned ${expected}`);
    continue;
  }
  const pages = await pageCount(abs);
  if (kind === "canonical" && row.expectedPages && pages !== row.expectedPages) {
    problems.push(`canonical: ${pages} page(s) where the queue expected ${row.expectedPages}`);
  }
  const dir = path.join(OUT, FAMILY, kind);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < pages; i += 1) {
    let render = null;
    try { render = await rasterizePageCalibrated({ file: abs, pageIndex: i, magnify: SCALE, keep: dir }); }
    catch (e) { problems.push(`${kind} page ${i + 1}: the render failed: ${String(e.message).split("\n")[0]}`); continue; }
    const png = render?.image;
    if (!png || !fs.existsSync(png)) { problems.push(`${kind} page ${i + 1}: no PNG was written`); continue; }
    const stable = path.join(dir, `page-${String(i + 1).padStart(3, "0")}.png`);
    fs.renameSync(png, stable);
    const ink = await inkFraction(stable, render.paper);
    const expectPxPerPt = SCALE * CSS_PX_PER_PT;
    const expectW = render.pageWidth * expectPxPerPt;
    const expectH = render.pageHeight * expectPxPerPt;
    const tol = Math.max(4, expectPxPerPt * 2);
    const measurement = {
      page: i + 1, png: path.relative(OUT, stable), bytes: fs.statSync(stable).size,
      paper: render.paper, pxPerPt: render.pxPerPt, expectedPxPerPt: expectPxPerPt,
      pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
      expectedPx: { width: expectW, height: expectH, tolerancePx: tol },
      calibrationResidualPx: render.calibrationResidualPx,
      inkFractionInsidePaper: ink, nonblank: ink > 0.0005,
      croppedToThePage: Math.abs(render.paper.width - expectW) <= tol && Math.abs(render.paper.height - expectH) <= tol
    };
    if (!measurement.nonblank) problems.push(`${kind} page ${i + 1}: blank (ink ${ink.toExponential(2)})`);
    if (!measurement.croppedToThePage) problems.push(`${kind} page ${i + 1}: ${render.paper.width}x${render.paper.height}px does not match ${expectW.toFixed(0)}x${expectH.toFixed(0)}px for scale ${SCALE}`);
    if (!(render.calibrationResidualPx <= 1.5)) problems.push(`${kind} page ${i + 1}: calibration residual ${render.calibrationResidualPx}px`);
    artifacts.push({ kind, ...measurement });
  }
  if (pages === 0) problems.push(`${kind}: the PDF reports zero pages`);
}

const verdict = problems.length === 0 ? "RASTER_PASS" : "RASTER_FAIL";
const doc = {
  schemaVersion: "rcap-raster-family-verdict/v1",
  familyId: FAMILY, verdict,
  packetCommitSha: COMMIT ?? row.packetCommitSha, workflowRunId: RUN_ID,
  requestedScale: SCALE, cssPxPerPt: CSS_PX_PER_PT,
  browserExecutable: resolved.executablePath, resolvedBy: resolved.resolvedBy,
  operatingSystem: `${os.type()} ${os.release()} ${os.arch()}`, nodeVersion: process.version,
  hashesBound: {
    canonical: { path: row.canonicalPdfPath, pinned: row.canonicalPdfSha256 },
    boundary: { path: row.boundaryPdfPath, pinned: row.boundaryPdfSha256 }
  },
  pagesMeasured: artifacts.length, measurements: artifacts, problems,
  whatThisDoesNotDecide: "This is one gate. RASTER_PASS does not make a family PASS_COMPLETE, promotes nothing, and opens no commercial route.",
  packetPdfsModified: 0, bodiesCommitted: 0, commercialRoutesOpened: 0, productionTouched: false
};
fs.writeFileSync(path.join(OUT, `${FAMILY}.verdict.json`), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`${verdict} ${FAMILY} — ${artifacts.length} page(s) measured, ${problems.length} problem(s)`);
for (const p of problems.slice(0, 10)) console.log(`  ${p}`);
process.exit(verdict === "RASTER_PASS" ? 0 : 1);
