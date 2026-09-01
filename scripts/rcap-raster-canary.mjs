#!/usr/bin/env node
/**
 * The canary, and the live negative controls.
 *
 * A batch of green per-family verdicts from a runner that cannot render is
 * worse than a red batch: it is a visual gate reporting that it looked. So
 * before any packet is rendered, a synthetic page is rendered and measured, and
 * the controls that must refuse are made to refuse.
 *
 * The controls are live, not described. Each constructs the broken condition
 * and requires the rasterizer to fail on it.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import { resolveChromium, rasterizePageCalibrated } from "./lib/pdf-page-raster.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flag = (n) => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const OUT = path.resolve(flag("--out") ?? "raster-out");
const SCALE = Number(flag("--scale") ?? 2.5);
const CONTROLS = process.argv.includes("--negative-controls");
fs.mkdirSync(OUT, { recursive: true });

/* Ink, measured with the same decoder the rasterizer already uses. A second
 * PNG decoder would be a second opinion about the pixels, and the one that
 * matters is the one the measurements are taken with. */
const inkFraction = async (pngPath, paper) => {
  // INSIDE the paper bounds. Measured across the whole image, a genuinely blank
  // page reported 31% ink -- the viewer paints a grey ground around the sheet,
  // and every one of those pixels is dark. The measurement was reading the
  // browser's background and calling it writing.
  const img = sharp(pngPath).greyscale();
  const cropped = paper
    ? img.extract({
      left: Math.max(0, Math.round(paper.x0)), top: Math.max(0, Math.round(paper.y0)),
      width: Math.max(1, Math.round(paper.width)), height: Math.max(1, Math.round(paper.height))
    })
    : img;
  const { data, info } = await cropped.raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let i = 0; i < data.length; i += 1) if (data[i] < 200) dark += 1;
  return dark / (info.width * info.height);
};

const PT_PER_IN = 72;
const PAGE = { w: 612, h: 792 };

const synthetic = async (file) => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE.w, PAGE.h]);
  // A black rule the measurement can find, away from every edge so a clipped
  // render is distinguishable from a correct one.
  page.drawRectangle({ x: 100, y: 400, width: 412, height: 24, color: rgb(0, 0, 0) });
  fs.writeFileSync(file, await doc.save());
};

const runControls = async () => {
  const results = [];
  const record = (id, refused, detail) => results.push({ id, refused, detail });

  // C1. No browser at all.
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-no-browser-"));
  const probe = (env) => spawnSync(process.execPath, ["--input-type=module", "-e",
    'import{resolveChromium}from"./scripts/lib/pdf-page-raster.mjs";const r=resolveChromium();process.exit(r.executablePath?0:1)'],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env } });
  record("no_browser_refused",
    probe({ RCAP_CHROMIUM_PATH: "", PLAYWRIGHT_BROWSERS_PATH: empty, PATH: "/nonexistent-for-this-control" }).status !== 0,
    "an environment with no browser must resolve nothing");

  // C2. A path that exists and is not executable.
  const notExec = path.join(empty, "not-a-program");
  fs.writeFileSync(notExec, "text wearing a browser's name\n"); fs.chmodSync(notExec, 0o644);
  record("non_executable_refused",
    probe({ RCAP_CHROMIUM_PATH: notExec, PLAYWRIGHT_BROWSERS_PATH: empty, PATH: "/nonexistent-for-this-control" }).status !== 0,
    "a non-executable file must not resolve as a browser");

  // C3. A directory as RCAP_CHROMIUM_PATH. A directory satisfies the executable
  // bit and is not a program.
  record("directory_refused",
    probe({ RCAP_CHROMIUM_PATH: empty, PLAYWRIGHT_BROWSERS_PATH: empty, PATH: "/nonexistent-for-this-control" }).status !== 0,
    "a directory must not resolve as a browser");

  // C4. Launches and cannot render. headless_shell is the real subject: it
  // launches, and navigating to a PDF starts a download instead of drawing.
  const registry = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "";
  const shell = registry && fs.existsSync(registry)
    ? fs.readdirSync(registry).filter((d) => /^chromium_headless_shell-\d+$/.test(d))
      .map((d) => path.join(registry, d, "chrome-linux/headless_shell")).find((p) => fs.existsSync(p))
    : null;
  if (!shell) {
    // A negative test whose subject cannot exist proves nothing, and saying so
    // is better than reporting a pass over an empty set.
    record("headless_shell_refused", false, "no headless_shell on this runner, so this control has no subject and proves nothing here");
  } else {
    const r = spawnSync(process.execPath, ["--input-type=module", "-e",
      'import{probeRasterizer}from"./scripts/lib/pdf-page-raster.mjs";const r=await probeRasterizer();process.exit(r.ok?0:1)'],
      { cwd: ROOT, encoding: "utf8", env: { ...process.env, RCAP_CHROMIUM_PATH: shell, PLAYWRIGHT_BROWSERS_PATH: empty, PATH: "/nonexistent-for-this-control" } });
    record("headless_shell_refused", r.status !== 0, "headless_shell launches and has no PDF viewer");
  }

  // C5. A blank page must not read as a rendered one.
  const blankDir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-blank-"));
  const blankPdf = path.join(blankDir, "blank.pdf");
  /*
   * A page with a white rectangle on it, not a page with nothing on it.
   *
   * pdf-lib's bare addPage() produces a page with no content stream at all, and
   * the render refused it with "Can't embed page with missing Contents" -- so
   * this control was measuring a malformed PDF rather than a blank one, and
   * reported refused for the wrong reason. A blank page in the wild is a
   * well-formed page with no ink, which is what this now builds.
   */
  const bd = await PDFDocument.create();
  const bp = bd.addPage([PAGE.w, PAGE.h]);
  bp.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: rgb(1, 1, 1) });
  fs.writeFileSync(blankPdf, await bd.save());
  let blankDetected = false; let blankDetail = "";
  try {
    const r = await rasterizePageCalibrated({ file: blankPdf, pageIndex: 0, keep: blankDir });
    // The page must render (paper found), and the measurement must then find no
    // ink on it. A control that only proved the render happened would pass on
    // a page covered in text.
    const ink = r?.image ? await inkFraction(r.image, r.paper) : null;
    blankDetected = Boolean(r?.paper) && ink !== null && ink < 0.0005;
    blankDetail = `paper found, ink fraction ${ink === null ? "unmeasured" : ink.toExponential(2)}`;
  } catch (e) { blankDetail = `the render refused a well-formed blank page: ${String(e.message).split("\n")[0]}`; }
  record("blank_page_is_detectable", blankDetected, blankDetail);

  try { fs.rmSync(empty, { recursive: true, force: true }); fs.rmSync(blankDir, { recursive: true, force: true }); } catch { /* owned here */ }

  const failed = results.filter((r) => !r.refused);
  fs.writeFileSync(path.join(OUT, "negative-controls.json"), `${JSON.stringify({
    schemaVersion: "rcap-raster-negative-controls/v1", results,
    allRefused: failed.length === 0, failed: failed.map((r) => r.id)
  }, null, 2)}\n`);
  for (const r of results) console.log(`  ${r.refused ? "refused " : "MISSED  "} ${r.id.padEnd(28)} ${r.detail}`);
  if (failed.length) { console.error(`\nREFUSED: ${failed.length} negative control(s) did not refuse.`); process.exit(1); }
  console.log("\nRCAP_RASTER_NEGATIVE_CONTROLS_HELD");
};

const runCanary = async () => {
  const resolved = resolveChromium();
  if (!resolved.executablePath) { console.error("REFUSED: no executable Chromium on a runner that is supposed to have one"); process.exit(1); }
  if (/headless_shell/.test(resolved.executablePath)) { console.error("REFUSED: headless_shell cannot render a PDF"); process.exit(1); }

  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-canary-"));
  const pdf = path.join(stage, "canary.pdf");
  await synthetic(pdf);
  const render = await rasterizePageCalibrated({ file: pdf, pageIndex: 0, magnify: SCALE, keep: OUT });

  const problems = [];
  /*
   * The positive control for blankness. "No ink inside the paper" only means
   * something if ink inside the paper is detectable at all -- a measurement
   * that always returns zero would call every page blank and every packet
   * empty, and it would agree with the blank-page control perfectly.
   */
  const canaryInk = render?.image ? await inkFraction(render.image, render.paper) : null;
  if (!(canaryInk > 0.001)) problems.push(`the synthetic page has a black rule on it and the ink measurement reports ${canaryInk}; blankness detection is not working`);
  if (!render?.image || !fs.existsSync(render.image)) problems.push("no PNG was written");
  else if (fs.statSync(render.image).size < 1000) problems.push("the PNG is too small to be a rendered page");
  if (!render?.paper) problems.push("no paper bounds — the page is outside the captured area");
  if (!(render?.calibrationResidualPx <= 1.5)) problems.push(`calibration residual ${render?.calibrationResidualPx} exceeds 1.5px`);

  /*
   * Dimensions must match the requested PDF-point scale, and the relationship
   * is not the one it looks like. `magnify` is in CSS pixels, and a CSS pixel
   * is 96/72 of a PDF point, so a 612pt page at magnify 2.5 measures 2040px and
   * not 1530px. The first version of this check asserted 1530 and failed a
   * correct render -- which is the same class of mistake as a prompt stating a
   * denominator its own command does not print.
   *
   * So the expectation is derived from the constant, and the constant is
   * asserted too: if pxPerPt ever stops being magnify * 96/72, the render is
   * measuring something other than what was asked for.
   */
  const CSS_PX_PER_PT = 96 / 72;
  const expectPxPerPt = SCALE * CSS_PX_PER_PT;
  if (Math.abs((render?.pxPerPt ?? 0) - expectPxPerPt) > 0.01) {
    problems.push(`the render reports ${render?.pxPerPt} px per point where scale ${SCALE} means ${expectPxPerPt.toFixed(4)}`);
  }
  const expectW = PAGE.w * expectPxPerPt; const expectH = PAGE.h * expectPxPerPt;
  const dw = Math.abs((render?.paper?.width ?? 0) - expectW);
  const dh = Math.abs((render?.paper?.height ?? 0) - expectH);
  const tol = Math.max(4, expectPxPerPt * 2);
  if (dw > tol || dh > tol) problems.push(`paper ${render?.paper?.width}x${render?.paper?.height}px does not match ${expectW}x${expectH}px for scale ${SCALE} (off by ${dw.toFixed(1)}x${dh.toFixed(1)}px, tolerance ${tol})`);

  const receipt = {
    schemaVersion: "rcap-raster-canary/v1",
    browserExecutable: resolved.executablePath, resolvedBy: resolved.resolvedBy,
    operatingSystem: `${os.type()} ${os.release()} ${os.arch()}`, nodeVersion: process.version,
    requestedScale: SCALE, pdfPointsPerInch: PT_PER_IN, cssPxPerPt: CSS_PX_PER_PT,
    pxPerPt: render?.pxPerPt ?? null, expectedPxPerPt: expectPxPerPt,
    syntheticPdfCreated: fs.existsSync(pdf) && fs.statSync(pdf).size > 0,
    pngWritten: Boolean(render?.image && fs.existsSync(render.image)),
    pngPath: render?.image ? path.basename(render.image) : null,
    paper: render?.paper ?? null, expected: { width: expectW, height: expectH, tolerancePx: tol },
    calibrationResidualPx: render?.calibrationResidualPx ?? null,
    nonblank: canaryInk > 0.001, inkFractionInsidePaper: canaryInk,
    croppedToThePage: Boolean(render?.paper) && dw <= tol && dh <= tol,
    verdict: problems.length ? "CANARY_FAILED" : "CANARY_PASSED", problems,
    packetPdfsModified: 0, bodiesCommitted: 0, commercialRoutesOpened: 0, productionTouched: false
  };
  fs.writeFileSync(path.join(OUT, "canary-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  try { fs.rmSync(stage, { recursive: true, force: true }); } catch { /* owned here */ }

  console.log(JSON.stringify(receipt, null, 2));
  if (problems.length) { console.error(`\nCANARY_FAILED — ${problems.length} problem(s)`); process.exit(1); }
  console.log("\nRCAP_RASTER_CANARY_PASSED");
};

await (CONTROLS ? runControls() : runCanary());
