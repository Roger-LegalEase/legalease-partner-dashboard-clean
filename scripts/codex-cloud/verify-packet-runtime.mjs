#!/usr/bin/env node
/**
 * The Codex Cloud packet runtime, proven by running it.
 *
 * ENV-RAS01. The setup phase printed LEGALEASE_CODEX_CLOUD_READY while
 * page_rasterizer_available still failed, because setup never mentioned a
 * browser and the preflight only asked whether a path was executable. Four PF
 * lanes returned STOPPED after passing preflight: two on pdftoppm ENOENT, two
 * on "Playwright cannot find Chromium". Every one of those was a runtime the
 * environment check had declared ready.
 *
 * There is exactly one way to know a Chromium can rasterize a page of a PDF,
 * and it is to rasterize a page of a PDF. So this:
 *
 *   1. resolves a Chromium and requires it to be an executable file;
 *   2. builds a one-page PDF with pdf-lib -- the same library the packet
 *      builders use, so a broken pdf-lib fails here rather than in a lane;
 *   3. rasterizes it through scripts/raster/pdf-page-raster.mjs, the same path the
 *      lanes use, launching with --no-sandbox as the container requires;
 *   4. proves the PNG exists on disk with real bytes;
 *   5. proves paper bounds were found;
 *   6. proves the page-to-pixel calibration residual is inside tolerance;
 *   7. closes the browser and removes everything it wrote.
 *
 * A path-only check is insufficient, and this refuses rather than warns: a
 * setup that cannot raster must not print ready, because the cost of finding
 * out later is a lane that builds nothing and reports STOPPED.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const JSON_OUT = process.argv.includes("--json");

const results = [];
const record = (id, title, ok, detail) => { results.push({ id, title, ok, detail }); return ok; };

const refuse = (why) => {
  if (!JSON_OUT) {
    console.error(`\nCODEX_PACKET_RUNTIME_NOT_READY — ${why}`);
    console.error("Do not build a packet in this container. Never substitute pdftoppm and never run apt-get or playwright install from a worker task;");
    console.error("browser provisioning belongs to the SETUP phase, which has network access, and this refusal is that phase's business.");
  }
  emit();
  process.exit(1);
};

const emit = () => {
  if (JSON_OUT) {
    console.log(JSON.stringify({
      schemaVersion: "rcap-codex-packet-runtime/v1",
      verdict: results.every((r) => r.ok) ? "CODEX_PACKET_RUNTIME_READY" : "CODEX_PACKET_RUNTIME_NOT_READY",
      checks: results, sourceBodiesCommitted: 0, commercialRoutesOpened: 0, productionTouched: false
    }, null, 2));
    return;
  }
  for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(30)} ${r.detail}`);
};

const main = async () => {
  let raster;
  try { raster = await import(path.join(ROOT, "scripts/raster/pdf-page-raster.mjs")); }
  catch (e) { record("rasterizer_importable", "", false, `scripts/raster/pdf-page-raster.mjs will not load: ${e.message}`); refuse("the rasterizer will not load"); }

  const resolved = raster.resolveChromium();
  if (!record("chromium_resolves", "", Boolean(resolved.executablePath),
    resolved.executablePath
      ? `${resolved.executablePath} (${resolved.resolvedBy})`
      : `no executable Chromium. Tried: ${(resolved.tried ?? []).join(", ") || "(nothing — PLAYWRIGHT_BROWSERS_PATH and RCAP_CHROMIUM_PATH are both unset and PATH holds no browser)"}`)) {
    refuse("no Chromium this container can execute");
  }
  // Executability is not enough on its own, but a path that is not an
  // executable file is not even a candidate: RCAP_CHROMIUM_PATH pointed at a
  // directory resolved cleanly and then died with EACCES inside the render.
  let isFile = false;
  try { isFile = fs.statSync(resolved.executablePath).isFile(); } catch { isFile = false; }
  if (!record("chromium_is_an_executable_file", "", isFile, isFile ? "the resolved path is a file" : `${resolved.executablePath} is not a file`)) {
    refuse("the resolved Chromium is not an executable file");
  }

  let pdfLib;
  try { pdfLib = await import("pdf-lib"); }
  catch (e) { record("pdf_lib_importable", "", false, `pdf-lib will not load: ${e.message}`); refuse("pdf-lib will not load; the factory cannot fill, measure or raster without it"); }
  record("pdf_lib_importable", "", true, "pdf-lib loads");

  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-runtime-probe-"));
  const pdfPath = path.join(stage, "runtime-probe.pdf");
  try {
    // A synthetic one-page US Letter document with a black rule on it, written
    // by the same library the builders use.
    const doc = await pdfLib.PDFDocument.create();
    const page = doc.addPage([612, 792]);
    page.drawRectangle({ x: 100, y: 400, width: 412, height: 24, color: pdfLib.rgb(0, 0, 0) });
    fs.writeFileSync(pdfPath, await doc.save());
    record("synthetic_pdf_written", "", fs.statSync(pdfPath).size > 0, `${fs.statSync(pdfPath).size} bytes`);

    // The real render, through the lanes' own entry point. keep= makes it leave
    // the PNG on disk so its existence can be asserted rather than assumed.
    const render = await raster.rasterizePageCalibrated({ file: pdfPath, pageIndex: 0, keep: stage });
    const png = [render?.pngPath, render?.png, path.join(stage, "page.png")]
      .filter((x) => typeof x === "string").find((x) => fs.existsSync(x))
      ?? fs.readdirSync(stage).map((f) => path.join(stage, f)).find((f) => f.endsWith(".png"));
    if (!record("png_written", "", Boolean(png) && fs.statSync(png).size > 1000, png ? `${path.basename(png)}, ${fs.statSync(png).size} bytes` : "the render wrote no PNG")) {
      refuse("the render produced no image");
    }
    if (!record("paper_bounds_found", "", Boolean(render?.paper),
      render?.paper ? `paper ${render.paper.width}x${render.paper.height}px` : "no paper bounds — the page is outside the captured area")) {
      refuse("the render found no paper");
    }
    // rasterizePageCalibrated throws when the residual exceeds tolerance, so
    // reaching here proves it, and the number is reported rather than trusted.
    const residual = render.calibrationResidualPx ?? render.residual ?? null;
    record("calibration_residual_within_tolerance", "", true,
      residual === null ? "the calibration marks agreed with the paper bounds (the render refuses otherwise)" : `residual ${Number(residual).toFixed(2)}px`);
  } catch (e) {
    record("render_succeeds", "", false, `the render failed: ${String(e.message ?? e).split("\n")[0]}`);
    refuse("Chromium launched but could not render a PDF page");
  } finally {
    // The browser is closed by rasterizePageCalibrated; this removes the bytes.
    try { fs.rmSync(stage, { recursive: true, force: true }); } catch { /* the probe owns this directory */ }
  }
  record("temporary_output_removed", "", !fs.existsSync(stage), "the probe left nothing behind");

  emit();
  if (!JSON_OUT) {
    console.log("");
    console.log("CODEX_PACKET_RUNTIME_READY");
  }
};

main().catch((e) => { record("probe_completes", "", false, String(e.message ?? e)); refuse("the runtime probe itself failed"); });
