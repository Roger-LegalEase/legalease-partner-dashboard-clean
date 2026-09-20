#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { extractTextItems, groupIntoLines } from "../../../../../scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const OUT = "data/rcap-grade-a/codex-cloud/ks-municipal-independent-review";
const FAMILY = "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading";
const documents = [
  ["ks-12-4516-municipal", "canonical", "f79d5b4e82d3ccf22c9b03aa42ad202e0796a13b4de95f3d25b38b2adf22f810"],
  ["ks-12-4516-municipal", "boundary", "7b234e970d38bdc0515122916c6f3961f1140e74f12978b6096e6aa34928600f"],
  ["ks-12-4516a-municipal-arrest", "canonical", "8a85bc0f2365938bd8b5e0483585b95abf2550a6cc24a4717b0d72001abd708d"],
  ["ks-12-4516a-municipal-arrest", "boundary", "dd364be7194a5e23643057ba75e5d5ea84950e7cd18b2945db5483761b9f3617"]
];
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const result = {
  schemaVersion: "ks-municipal-pdf-text-geometry/v1",
  method: "Text runs were extracted from each exact PDF page, grouped by baseline, and compared with the 612x792 point MediaBox. Overlap tests compare both vertically adjacent line boxes and adjacent runs on the same baseline. This supplements, and does not replace, direct inspection of every raster page.",
  documents: []
};

for (const [route, fixture, requiredSha256] of documents) {
  const relative = `${FAMILY}/fixtures/routes/${route}/${fixture}.pdf`;
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  if (sha256(bytes) !== requiredSha256) throw new Error(`${route}/${fixture}: source hash changed`);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const row = { route, fixture, sourcePath: relative, sha256: requiredSha256, pages: [] };
  for (let index = 0; index < pdf.getPageCount(); index += 1) {
    const page = pdf.getPage(index);
    const { width, height } = page.getSize();
    const lines = groupIntoLines(extractTextItems(page)).map((line) => ({
      y: line.y,
      size: line.size,
      x: line.x,
      x2: Math.max(...line.runs.map((run) => run.x2)),
      text: line.text,
      runs: line.runs
    }));
    const lineOverlapPairs = [];
    for (let i = 0; i < lines.length; i += 1) {
      for (let j = i + 1; j < lines.length; j += 1) {
        const a = lines[i];
        const b = lines[j];
        const verticalOverlap = Math.abs(a.y - b.y) < Math.max(a.size, b.size) * 0.9;
        const horizontalOverlap = a.x < b.x2 && b.x < a.x2;
        if (verticalOverlap && horizontalOverlap) lineOverlapPairs.push({ firstLine: i + 1, secondLine: j + 1 });
      }
    }
    const sameBaselineRunOverlapPairs = [];
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const runs = [...lines[lineIndex].runs].sort((a, b) => a.x - b.x);
      for (let i = 1; i < runs.length; i += 1) {
        if (runs[i].x < runs[i - 1].x2 - 0.1) sameBaselineRunOverlapPairs.push({ line: lineIndex + 1, firstRun: i, secondRun: i + 1 });
      }
    }
    const overruns = lines
      .map((line, lineIndex) => ({ line: lineIndex + 1, x: line.x, x2: line.x2, overrunRightPt: Math.max(0, line.x2 - width), text: line.text }))
      .filter((line) => line.x < 0 || line.x2 > width);
    row.pages.push({
      page: index + 1,
      pageWidthPt: width,
      pageHeightPt: height,
      textLineCount: lines.length,
      maxTextX2Pt: Math.max(...lines.map((line) => line.x2)),
      linesOutsideMediaBox: overruns.length,
      maximumRightOverrunPt: Math.max(0, ...overruns.map((line) => line.overrunRightPt)),
      overrunLines: overruns,
      adjacentLineOverlapPairs: lineOverlapPairs,
      sameBaselineRunOverlapPairs,
      measuredOverlapPairCount: lineOverlapPairs.length + sameBaselineRunOverlapPairs.length
    });
  }
  result.documents.push(row);
}

result.totalPages = result.documents.reduce((sum, document) => sum + document.pages.length, 0);
result.pagesWithTextOutsideMediaBox = result.documents.reduce((sum, document) => sum + document.pages.filter((page) => page.linesOutsideMediaBox > 0).length, 0);
result.pagesWithMeasuredTextOverlap = result.documents.reduce((sum, document) => sum + document.pages.filter((page) => page.measuredOverlapPairCount > 0).length, 0);
fs.writeFileSync(path.join(ROOT, OUT, "text-geometry.generated.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ totalPages: result.totalPages, pagesWithTextOutsideMediaBox: result.pagesWithTextOutsideMediaBox, pagesWithMeasuredTextOverlap: result.pagesWithMeasuredTextOverlap }));
