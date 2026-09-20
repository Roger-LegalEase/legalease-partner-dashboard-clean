#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb } from "pdf-lib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(ROOT,
  "reference/source-recovery/2026-09-11-known-residual/CR-430-INFO.pdf");
const SOURCE_SHA256 = "6bee01e04b1f8ceb05776e07b90b92a4e9048777c41c78760e381348d4d287c0";
const UNLOCKER = path.join(ROOT, "scripts/raster/unlock-encrypted-pdf.py");
const PYTHON = process.env.RCAP_PIKEPDF_PYTHON || process.env.PYTHON || "python3";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-cr430info-raster-input-"));

try {
  assert.equal(sha256(fs.readFileSync(SOURCE)), SOURCE_SHA256, "CR-430-INFO source drifted");
  const normalized = path.join(temp, "normalized.pdf");
  const evidence = JSON.parse(execFileSync(PYTHON,
    [UNLOCKER, "--input", SOURCE, "--output", normalized],
    { cwd: ROOT, encoding: "utf8" }));
  assert.equal(evidence.sourceSha256, SOURCE_SHA256);
  assert.equal(evidence.pageCount, 4);
  assert.equal(evidence.sourceEncrypted, true);
  assert.equal(evidence.derivativeEncrypted, false);
  assert.equal(evidence.structuralFidelity.pageGeometryEqual, true);
  assert.equal(evidence.structuralFidelity.decodedPageContentStreamsEqual, true);
  assert.equal(evidence.structuralFidelity.terminalFieldsAndWidgetsEqual, true);
  assert.equal(evidence.structuralFidelity.xfaDigestEqual, true);
  assert.equal(evidence.structuralFidelity.objectStreamsDisabledForPdfLibPageEmbedding, true);
  assert.equal(fs.readFileSync(normalized).includes(Buffer.from("/ObjStm")), false,
    "temporary raster input still contains object streams");

  // Exercise the exact pdf-lib page embedding operation used by the native
  // Chromium rasterizer. This was the operation that failed on Node 22.
  const normalizedPdf = await PDFDocument.load(fs.readFileSync(normalized), {
    ignoreEncryption: true, updateMetadata: false,
  });
  assert.equal(normalizedPdf.getPageCount(), 4);
  for (let index = 0; index < normalizedPdf.getPageCount(); index += 1) {
    const page = normalizedPdf.getPage(index);
    const { width, height } = page.getSize();
    const onePage = await PDFDocument.create();
    const [embedded] = await onePage.embedPages([page]);
    onePage.addPage([width * 2.5, height * 2.5]).drawPage(embedded,
      { x: 0, y: 0, width: width * 2.5, height: height * 2.5 });
    assert.ok((await onePage.save()).length > 0, `page ${index + 1} did not embed`);
  }

  const sourceText = execFileSync("pdftotext", ["-layout", SOURCE, "-"], { encoding: "buffer" });
  const normalizedText = execFileSync("pdftotext", ["-layout", normalized, "-"], { encoding: "buffer" });
  assert.equal(sha256(normalizedText), sha256(sourceText),
    "transport normalization changed extracted page text");

  // Poppler independently renders every original and normalized page to the
  // same pixels. The negative control adds a visible square and proves this
  // comparison fails when page appearance changes.
  const render = (file, prefix, page) => {
    execFileSync("pdftoppm", ["-r", "72", "-png", "-f", String(page), "-l", String(page),
      "-singlefile", file, prefix], { stdio: "ignore" });
    return fs.readFileSync(`${prefix}.png`);
  };
  for (let page = 1; page <= 4; page += 1) {
    assert.equal(sha256(render(normalized, path.join(temp, `normalized-${page}`), page)),
      sha256(render(SOURCE, path.join(temp, `source-${page}`), page)),
      `page ${page} pixels changed during transport normalization`);
  }
  const changedPdf = await PDFDocument.load(fs.readFileSync(normalized), {
    ignoreEncryption: true, updateMetadata: false,
  });
  changedPdf.getPage(0).drawRectangle({ x: 18, y: 18, width: 14, height: 14, color: rgb(0, 0, 0) });
  const changed = path.join(temp, "negative-control.pdf");
  fs.writeFileSync(changed, await changedPdf.save({ useObjectStreams: false, updateMetadata: false }));
  assert.notEqual(sha256(render(changed, path.join(temp, "changed-1"), 1)),
    sha256(render(SOURCE, path.join(temp, "source-negative-1"), 1)),
    "pixel-fidelity negative control did not detect a visible page change");

  console.log(`CR430INFO_RASTER_INPUT_PASS pages=4 source=${SOURCE_SHA256} derivative=${evidence.derivativeSha256}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
