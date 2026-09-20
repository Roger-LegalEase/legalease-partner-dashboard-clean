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
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { resolveChromium, rasterizePageCalibrated } from "./raster/pdf-page-raster.mjs";
import { reuseHeldFactCanonicalEvidence } from "./raster/reuse-held-fact-canonical-evidence.mjs";
import { reuseOriginalPageEvidence } from "./raster/reuse-original-page-evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flag = (n) => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const MANIFEST = flag("--manifest") ?? "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json";
const FAMILY = flag("--family");
const COMMIT = flag("--commit") ?? null;
const SCALE = Number(flag("--scale") ?? 2.5);
const RUN_ID = flag("--run-id") ?? null;
const OUT = path.resolve(flag("--out") ?? "raster-out");
const UNLOCKER = path.join(ROOT, "scripts/raster/unlock-encrypted-pdf.py");

/*
 * The family id as a PATH segment. An artifact rejects a colon in a file path
 * as firmly as in its own name, and composed-treatment ids carry several
 * (composed-treatment:obligation:runtime-only:AK:...). Six families rendered,
 * passed every measurement, and then lost their evidence at upload over
 * raster-out/composed-treatment:sd_sis_sealing/boundary/page-001.png.
 *
 * Only the path spelling changes. Every receipt below still records the real
 * familyId, which is what binds a verdict to a family.
 */
const FAMILY_PATH = String(FAMILY ?? "").replace(/[^A-Za-z0-9._-]/g, "_");

const CSS_PX_PER_PT = 96 / 72;
const fail = (why) => { console.error(`REFUSED raster batch — ${why}`); process.exit(1); };
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

if (!FAMILY) fail("--family is required; a batch that renders everything by default renders the wrong thing quietly");
const queue = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST), "utf8"));
const row = (queue.rows ?? []).find((r) => r.familyId === FAMILY);
if (!row) fail(`${FAMILY} is not in ${MANIFEST}`);
if (row.currentRasterState !== "RASTER_PENDING") fail(`${FAMILY} is ${row.currentRasterState}, not RASTER_PENDING`);

const allQueuedDocumentsReuseOriginalPages = (row.documents ?? []).length > 0
  && row.documents.every((document) => document.reuseOriginalPageEvidence);
const resolved = allQueuedDocumentsReuseOriginalPages
  ? { executablePath: null, resolvedBy: "not-needed-all-pages-reused", tried: [] }
  : resolveChromium();
if (!allQueuedDocumentsReuseOriginalPages && !resolved.executablePath) {
  // An environment that cannot look at the packet has said nothing about the
  // packet. This is never RASTER_FAIL.
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${FAMILY_PATH}.verdict.json`), `${JSON.stringify({
    schemaVersion: "rcap-raster-family-verdict/v1", familyId: FAMILY,
    verdict: "RASTER_BLOCKED_ENVIRONMENT",
    why: "no executable Chromium on this runner; the packet was not examined and nothing is claimed about it",
    tried: resolved.tried, packetPdfsModified: 0
  }, null, 2)}\n`);
  console.error(`RASTER_BLOCKED_ENVIRONMENT ${FAMILY}`);
  process.exit(1);
}
if (resolved.executablePath && /headless_shell/.test(resolved.executablePath)) fail("headless_shell cannot render a PDF");

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

/*
 * pdf-lib cannot resolve the encrypted object streams in the unchanged
 * Judicial Council XFA forms. qpdf can. The runner creates a temporary,
 * decrypted review derivative only after the original bytes match the queue's
 * SHA-256, then independently compares qpdf's page count with the queue's
 * Poppler count. The packet PDF is never changed, and a disagreement refuses
 * the render rather than choosing one reader.
 */
const rasterInputForTarget = async (abs, target, stage) => {
  try {
    return { file: abs, pages: await pageCount(abs), decryption: null };
  } catch (originalError) {
    const independentlyCounted = Number.isInteger(target.expectedPages)
      && target.expectedPages > 0
      && target.pageCountEvidence?.method === "Poppler pdfinfo"
      && target.pageCountEvidence?.pageCount === target.expectedPages
      && target.pageCountEvidence?.sourceSha256 === target.expected;
    if (!independentlyCounted) throw originalError;
    const python = process.env.RCAP_PIKEPDF_PYTHON || process.env.PYTHON || "python3";
    const output = path.join(stage, `${target.name.replace(/[^A-Za-z0-9._-]/g, "_")}-decrypted.pdf`);
    let evidence;
    try {
      evidence = JSON.parse(execFileSync(python, [UNLOCKER, "--input", abs, "--output", output], {
        cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      }));
    } catch (e) {
      const detail = String(e.stderr || e.message);
      const err = new Error(`the encrypted PDF could not be opened by the independent qpdf reader: ${detail.split("\n")[0]}`);
      err.environmentBlocked = e.code === "ENOENT" || /ModuleNotFoundError|No module named ['\"]pikepdf['\"]/.test(detail);
      throw err;
    }
    if (evidence.sourceSha256 !== target.expected) throw new Error("the decrypt reader did not bind to the queued source SHA-256");
    const fidelity = evidence.structuralFidelity ?? {};
    if (evidence.schemaVersion !== "rcap-decrypted-raster-input/v1"
      || evidence.sourceEncrypted !== true
      || evidence.emptyUserPasswordMatched !== true
      || evidence.derivativeEncrypted !== false
      || fidelity.pageGeometryEqual !== true
      || fidelity.decodedPageContentStreamsEqual !== true
      || fidelity.terminalFieldsAndWidgetsEqual !== true
      || fidelity.xfaDigestEqual !== true
      || fidelity.objectStreamsDisabledForPdfLibPageEmbedding !== true) {
      throw new Error("the decrypt reader did not return a complete passing structural-fidelity proof");
    }
    if (evidence.pageCount !== target.expectedPages) {
      throw new Error(`independent page readers disagree: Poppler=${target.expectedPages}, qpdf=${evidence.pageCount}`);
    }
    const derivativePages = await pageCount(output);
    if (derivativePages !== evidence.pageCount) throw new Error("pdf-lib reads a different page count from the decrypted derivative");
    return { file: output, pages: evidence.pageCount, decryption: evidence };
  }
};

fs.mkdirSync(OUT, { recursive: true });
const artifacts = [];
const documentEvidence = [];
const problems = [];
const environmentProblems = [];
const decryptionTransforms = [];
const derivativeStage = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-raster-decrypted-"));
process.once("exit", () => {
  try { fs.rmSync(derivativeStage, { recursive: true, force: true }); }
  catch { /* this process owns the temporary derivatives */ }
});

/*
 * Render every document the row names, not one canonical and one boundary.
 *
 * Eleven families ship several canonical documents with no assembled packet --
 * Washington's vacate packets carry a petition AND the order a court signs,
 * Arkansas the same. This loop rendered the first of each pair, and the order
 * had never been through the visual gate on any of them; nine were carrying
 * RASTER_PASS regardless. The job is still one per family and uploads one
 * artifact, so this widens what a job proves without touching the workflow
 * matrix or the receipt naming.
 *
 * `documents` is preferred and the old pair is the fallback, so a queue written
 * before this change still renders exactly what it used to.
 */
const targets = (row.documents ?? []).length > 0
  ? row.documents.map((d) => ({
      kind: d.role, name: d.name, rel: d.path, expected: d.sha256,
      expectedPages: d.pageCount, pageCountBasis: d.pageCountBasis ?? null,
      pageCountEvidence: d.pageCountEvidence ?? null,
      reuseOriginalPageEvidence: d.reuseOriginalPageEvidence ?? null,
    }))
  : [
      { kind: "canonical", name: "canonical", rel: row.canonicalPdfPath, expected: row.canonicalPdfSha256, expectedPages: row.expectedPages },
      { kind: "boundary", name: "boundary", rel: row.boundaryPdfPath, expected: row.boundaryPdfSha256, expectedPages: null },
    ];
const hasReuseTargets = targets.some((target) => target.reuseOriginalPageEvidence);

if (targets.some((t) => !t.rel)) fail(`${FAMILY}: a queued document names no path`);

const repoFile = (relative, label) => {
  if (typeof relative !== "string" || relative.length === 0 || path.isAbsolute(relative)) fail(`${label}: path must be repo-relative`);
  const candidate = path.resolve(ROOT, relative);
  if (!candidate.startsWith(`${path.resolve(ROOT)}${path.sep}`)) fail(`${label}: path escapes the repository`);
  if (!fs.existsSync(candidate)) return candidate;
  const realRoot = fs.realpathSync(ROOT);
  const real = fs.realpathSync(candidate);
  if (!real.startsWith(`${realRoot}${path.sep}`)) fail(`${label}: path resolves outside the repository`);
  return real;
};

for (const target of targets) {
  const { kind, rel, expected } = target;
  const abs = hasReuseTargets ? repoFile(rel, `${target.name} PDF`) : path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { problems.push(`${target.name}: ${rel} is absent at this commit`); continue; }
  const observed = sha256(abs);
  if (observed !== expected) {
    // The queue pinned these bytes. Different bytes are a different packet, and
    // rendering them would produce evidence about something nobody queued.
    problems.push(`${target.name}: ${rel} hashes ${observed} and the queue pinned ${expected}`);
    continue;
  }
  let rasterInput;
  try { rasterInput = await rasterInputForTarget(abs, target, derivativeStage); }
  catch (e) {
    (e.environmentBlocked ? environmentProblems : problems).push(`${target.name}: ${String(e.message).split("\n")[0]}`);
    continue;
  }
  const pages = rasterInput.pages;
  if (rasterInput.decryption) decryptionTransforms.push({ document: target.name, ...rasterInput.decryption });
  if (target.expectedPages && pages !== target.expectedPages) {
    problems.push(`${target.name}: ${pages} page(s) where the queue expected ${target.expectedPages}`);
  }
  if (target.reuseOriginalPageEvidence) {
    try {
      const reuse = ["HELD-FACT-FIT-20260912", "IN-SECTION1-DATE-FOLLOWUP-20260912"].includes(target.reuseOriginalPageEvidence.policyId)
        ? reuseHeldFactCanonicalEvidence : reuseOriginalPageEvidence;
      const reused = await reuse({
        root: ROOT, out: OUT, familyId: FAMILY, familyPath: FAMILY_PATH,
        target, descriptor: target.reuseOriginalPageEvidence, scale: SCALE,
        currentPageCount: pages
      });
      artifacts.push(...reused.measurements);
      documentEvidence.push(reused.document);
    } catch (e) {
      problems.push(`${target.name}: original-page reuse refused: ${String(e.message).split("\n")[0]}`);
    }
    continue;
  }
  /* One directory per DOCUMENT. Keying on kind alone made two canonical
   * documents of one family overwrite each other's PNGs. Both segments are
   * slugged for the same reason FAMILY_PATH is. */
  const dir = path.join(OUT, FAMILY_PATH, target.name.replace(/\.pdf$/, "").replace(/[^A-Za-z0-9._-]/g, "_"));
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < pages; i += 1) {
    let render = null;
    try { render = await rasterizePageCalibrated({ file: rasterInput.file, pageIndex: i, magnify: SCALE, keep: dir }); }
    catch (e) { problems.push(`${target.name} page ${i + 1}: the render failed: ${String(e.message).split("\n")[0]}`); continue; }
    const png = render?.image;
    if (!png || !fs.existsSync(png)) { problems.push(`${target.name} page ${i + 1}: no PNG was written`); continue; }
    const stable = path.join(dir, `page-${String(i + 1).padStart(3, "0")}.png`);
    fs.renameSync(png, stable);
    const ink = await inkFraction(stable, render.paper);
    const expectPxPerPt = SCALE * CSS_PX_PER_PT;
    const expectW = render.pageWidth * expectPxPerPt;
    const expectH = render.pageHeight * expectPxPerPt;
    const tol = Math.max(4, expectPxPerPt * 2);
    const measurement = {
      page: i + 1, png: path.relative(OUT, stable), bytes: fs.statSync(stable).size,
      /* The identity of the image that was measured, taken here on the runner
       * where the bytes exist. A reader who cannot reach artifact blob storage
       * still gets a digest it can bind the measurement to. */
      pngSha256: sha256(stable), pngWidth: Math.round(render.paper.width), pngHeight: Math.round(render.paper.height),
      paper: render.paper, pxPerPt: render.pxPerPt, expectedPxPerPt: expectPxPerPt,
      pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
      expectedPx: { width: expectW, height: expectH, tolerancePx: tol },
      calibrationResidualPx: render.calibrationResidualPx,
      inkFractionInsidePaper: ink, nonblank: ink > 0.0005,
      croppedToThePage: Math.abs(render.paper.width - expectW) <= tol && Math.abs(render.paper.height - expectH) <= tol,
      ...(hasReuseTargets ? {
        renderedInThisRun: true,
        evidenceOrigin: "FRESH_RENDER_THIS_RUN",
        originalOrigin: null
      } : {})
    };
    if (!measurement.nonblank) problems.push(`${target.name} page ${i + 1}: blank (ink ${ink.toExponential(2)})`);
    if (!measurement.croppedToThePage) problems.push(`${target.name} page ${i + 1}: ${render.paper.width}x${render.paper.height}px does not match ${expectW.toFixed(0)}x${expectH.toFixed(0)}px for scale ${SCALE}`);
    if (!(render.calibrationResidualPx <= 1.5)) problems.push(`${target.name} page ${i + 1}: calibration residual ${render.calibrationResidualPx}px`);
    artifacts.push({ kind, document: target.name, ...measurement });
  }
  if (pages === 0) problems.push(`${target.name}: the PDF reports zero pages`);
  documentEvidence.push(hasReuseTargets ? {
    role: target.kind, document: target.name, path: target.rel, pinned: target.expected,
    renderedInThisRun: true, originalOrigin: null
  } : { role: target.kind, document: target.name, path: target.rel, pinned: target.expected });
}

const verdict = problems.length > 0
  ? "RASTER_FAIL"
  : environmentProblems.length > 0 ? "RASTER_BLOCKED_ENVIRONMENT" : "RASTER_PASS";
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
  /* What this verdict actually covers, so a reader never has to infer it from
   * the row it came from. */
  documentsRendered: hasReuseTargets
    ? documentEvidence
    : targets.map((target) => ({ role: target.kind, document: target.name, path: target.rel, pinned: target.expected })),
  ...(hasReuseTargets ? {
    freshRenderedDocuments: documentEvidence.filter((document) => document.renderedInThisRun),
    reusedDocuments: documentEvidence.filter((document) => !document.renderedInThisRun),
    freshRenderedPages: artifacts.filter((page) => page.renderedInThisRun === true).length,
    reusedPages: artifacts.filter((page) => page.renderedInThisRun === false).length
  } : {}),
  documentsDigest: row.documentsDigest ?? null,
  coversTheWholeFamily: row.coverage?.complete ?? null,
  decryptionTransforms,
  decryptionRule: "An encrypted source is hashed before any transform; Poppler and qpdf must independently agree on its page count; the temporary derivative is decrypted and serialized with explicit objects, then admitted only when geometry, decoded page content, fields/widgets, and XFA remain identical; only that temporary transport is passed to pdf-lib for calibrated rendering; the queued packet bytes are never modified.",
  pagesMeasured: artifacts.length, measurements: artifacts, problems, environmentProblems,
  whatThisDoesNotDecide: "This is one gate. RASTER_PASS does not make a family PASS_COMPLETE, promotes nothing, and opens no commercial route.",
  packetPdfsModified: 0, bodiesCommitted: 0, commercialRoutesOpened: 0, productionTouched: false
};
fs.writeFileSync(path.join(OUT, `${FAMILY_PATH}.verdict.json`), `${JSON.stringify(doc, null, 2)}\n`);

/*
 * The page-image inventory, and then the whole receipt into the job log.
 *
 * WHY THIS IS PRINTED AND NOT ONLY UPLOADED. The upload below is the
 * authority and stays. But an agent session whose egress policy denies
 * Actions artifact blob storage -- CONNECT tunnel failed, response 403
 * against the blob host -- cannot fetch the artifact at all, while the
 * Actions job-log API answers for it normally. Eleven finished families
 * have sat BUILT_RASTER_PENDING waiting on a receipt rather than on any
 * work, because the measurement existed and could not be read.
 *
 * So the same receipt is also written to stdout, delimited, one JSON
 * document per line. It is the identical object: nothing is summarised,
 * softened or recomputed for the log. The importer's bundle-directory
 * path already reads exactly this shape and already records, per image,
 * that the PNG bodies were not read -- printing the digest here changes
 * who can read the receipt, not what the receipt claims.
 */
const inventory = artifacts.map((a) => ({
  runId: RUN_ID, familyId: FAMILY, member: a.png,
  bytes: a.bytes, sha256: a.pngSha256, pngWidth: a.pngWidth, pngHeight: a.pngHeight
}));
fs.writeFileSync(path.join(OUT, "PAGE_IMAGES_SHA256.json"), `${JSON.stringify(inventory, null, 2)}\n`);

try { fs.rmSync(derivativeStage, { recursive: true, force: true }); } catch { /* this job owns the temporary derivatives */ }
console.log(`RCAP_RECEIPT_BEGIN family=${FAMILY} run=${RUN_ID} commit=${COMMIT ?? row.packetCommitSha}`);
console.log(`RCAP_RECEIPT_VERDICT ${JSON.stringify(doc)}`);
console.log(`RCAP_RECEIPT_INVENTORY ${JSON.stringify(inventory)}`);
console.log(`RCAP_RECEIPT_END family=${FAMILY} run=${RUN_ID} pages=${artifacts.length}`);
console.log(`${verdict} ${FAMILY} — ${targets.length} document(s), ${artifacts.length} page(s) measured, ${problems.length} problem(s)`);
for (const p of problems.slice(0, 10)) console.log(`  ${p}`);
process.exit(verdict === "RASTER_PASS" ? 0 : 1);
