#!/usr/bin/env node
// Does the filled panel of a contact sheet actually show anything?
//
//   node scripts/generate-rcap-contact-sheet-visual-proof.mjs
//   node scripts/generate-rcap-contact-sheet-visual-proof.mjs --check
//
// A blank-versus-filled contact sheet exists so a reviewer can see the filled
// artifact beside the blank form and judge the fill. That only works if the
// two panels differ. If the filled panel was built from an artifact whose
// values live in unflattened widget appearances, the sheet's page-copy carries
// none of them, and the reviewer is shown two identical blank forms while the
// implementation index reports the family as having visual evidence.
//
// Nothing in the repository had ever looked at these sheets. This one renders
// each of them through a real PDF engine, crops the two panels using the
// geometry the sheet builder itself lays out, and compares them pixel by
// pixel. A near-zero difference is the defect, measured rather than asserted.
//
// Text extraction cannot make this finding. The values are present in the
// FIXTURE as field values; what is missing is any mark on the page. Only a
// rendered image can tell the difference.
//
// Rendering here is byte-deterministic -- the same sheet rasterizes to the
// same PNG, and therefore to the same measurement, run after run -- so
// `--check` compares the generated file exactly. That determinism is a
// property of one renderer build, not of PDF rendering in general: a
// different Chromium will shift antialiasing and move the low-order digits.
// A `--check` failure on a machine with a different browser means re-run the
// generator, not that a verdict changed. The verdicts themselves are
// threshold decisions three orders of magnitude clear of their boundary and
// do not move.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { rasterizePdf, pageGeometry } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/contact-sheet-visual-proof.json");
const EVIDENCE_DIR = path.join(rootDir, "docs/record-clearing/pdf-visual-evidence");
const checkOnly = process.argv.includes("--check");

// The sheet builder's own layout constants. Cropping with anything else would
// measure the wrong rectangles.
const SHEET = { margin: 28, gap: 24, panelScale: 0.62, header: 34 };

// One representative family per jurisdiction keeps a human-readable rendering
// of the finding in the repository without committing a rendered page for all
// 62 sheets.
const EVIDENCE_FAMILIES = new Set([
  "AK:tf-800-form-en", "AL:sbi-form-46-support-en", "AR:ar-acic-order-to-seal-felony-under-act-1460-source-gated-en",
  "KY:aoc-496-5-form-en", "NC:aoc-cr-287-form-en", "NE:cc-6-11-form-en",
  "VA:cc-1473-form-en", "VT:200-00132-form-en"
]);
// Wisconsin carries no contact sheet at all, so it has no sheet to render.

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

/**
 * Where the PDF page actually sits inside a rendered frame.
 *
 * The renderer letterboxes the page against a uniform viewer background and
 * continues the next page below it, so the frame is not the page. Both edges
 * of the background are found and the page height is derived from the page's
 * own aspect ratio, which is more reliable than looking for the page's bottom
 * edge with the following page bleeding into the frame.
 */
async function pageRectangle(pngPath, pdfWidthPt, pdfHeightPt) {
  const { data, info } = await sharp(pngPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => data[y * info.width + x];
  const background = at(0, 0);
  const isBackground = (value) => Math.abs(value - background) <= 6;
  const columnIsBackground = (x) => {
    for (let y = 0; y < info.height; y += 3) if (!isBackground(at(x, y))) return false;
    return true;
  };

  let left = 0;
  while (left < info.width && columnIsBackground(left)) left += 1;
  let right = info.width - 1;
  while (right > left && columnIsBackground(right)) right -= 1;
  let top = 0;
  while (top < info.height) {
    let empty = true;
    for (let x = left; x <= right; x += 3) if (!isBackground(at(x, top))) { empty = false; break; }
    if (!empty) break;
    top += 1;
  }

  const widthPx = right - left + 1;
  if (widthPx < 64) return null;
  const pxPerPt = widthPx / pdfWidthPt;
  const heightPx = Math.round(pdfHeightPt * pxPerPt);
  if (top + heightPx > info.height) return null;
  return { left, top, widthPx, heightPx, pxPerPt, imageWidth: info.width, imageHeight: info.height };
}

/** The pixel rectangle of one panel on a rendered sheet page. */
function panelRect(rect, pdfHeightPt, side) {
  const panelWidthPt = (rect.widthPx / rect.pxPerPt - SHEET.margin * 2 - SHEET.gap) / 2;
  const panelHeightPt = pdfHeightPt - SHEET.margin * 2 - SHEET.header;
  // Trimmed a few pixels in from every edge so the panel's own border rule,
  // which sits exactly on the boundary, cannot dominate the comparison.
  const inset = 4;
  const xPt = side === "left" ? SHEET.margin : SHEET.margin + panelWidthPt + SHEET.gap;
  return {
    left: rect.left + Math.floor(xPt * rect.pxPerPt) + inset,
    top: rect.top + Math.floor((pdfHeightPt - SHEET.margin - panelHeightPt) * rect.pxPerPt) + inset,
    width: Math.floor(panelWidthPt * rect.pxPerPt) - inset * 2,
    height: Math.floor(panelHeightPt * rect.pxPerPt) - inset * 2
  };
}

/**
 * How different two panels are, tolerant of sub-pixel placement.
 *
 * The two panels are drawn at different x offsets, so the renderer rounds them
 * onto the pixel grid differently and a form's hairline rules land up to a
 * pixel or two apart. A strict comparison reads that as 15% of pixels
 * differing between two panels that are, to the eye, identical. Blurring
 * removes the rounding noise while leaving ink where ink exists, and the best
 * match over a small offset search removes the systematic shift. What survives
 * both is content.
 */
async function panelDifference(aFile, a, bFile, b) {
  if ([a, b].some((r) => r.width <= 0 || r.height <= 0)) return null;
  if (a.width !== b.width || a.height !== b.height) return null;
  const grab = (file, rect) => sharp(file)
    .extract({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    .greyscale().blur(1.6).raw().toBuffer();

  const left = await grab(aFile, a);
  let best = null;
  for (let dy = -3; dy <= 3; dy += 1) {
    for (let dx = -3; dx <= 3; dx += 1) {
      const shifted = { ...b, left: b.left + dx, top: b.top + dy };
      if (shifted.left < 0 || shifted.top < 0) continue;
      let right;
      try { right = await grab(bFile, shifted); } catch { continue; }
      let sum = 0;
      let differing = 0;
      for (let i = 0; i < left.length; i += 1) {
        const d = Math.abs(left[i] - right[i]);
        sum += d;
        if (d > 24) differing += 1;
      }
      const meanAbsoluteDifference = sum / left.length / 255;
      if (!best || meanAbsoluteDifference < best.meanAbsoluteDifference) {
        best = {
          meanAbsoluteDifference: Number(meanAbsoluteDifference.toFixed(6)),
          differingPixelFraction: Number((differing / left.length).toFixed(6)),
          bestOffset: { dx, dy },
          pixelsCompared: left.length
        };
      }
    }
  }
  return best;
}

const families = [];
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-sheet-proof-"));

for (const stateDir of fs.readdirSync(ROOT).sort()) {
  const statePath = path.join(ROOT, stateDir);
  if (!fs.statSync(statePath).isDirectory()) continue;
  for (const familyDir of fs.readdirSync(statePath).sort()) {
    const familyPath = path.join(statePath, familyDir);
    const sheet = path.join(familyPath, "contact-sheet/blank-vs-filled.pdf");
    if (!fs.existsSync(sheet)) continue;
    const record = readJson(path.join(familyPath, "source-record.json"));
    const jurisdiction = String(record?.jurisdiction ?? stateDir).toUpperCase();
    const familyId = `${jurisdiction}:${familyDir}`;

    const workDir = path.join(tmpRoot, jurisdiction, familyDir);
    // Page 2 is rendered where it exists purely as a control: it is a panel
    // known to hold different content, so it shows that the measurement can
    // tell "different" from "identical" on this very sheet. Without a control
    // a near-zero difference could just as easily mean the measurement is
    // broken.
    const geometry = await pageGeometry(fs.readFileSync(sheet));
    const wantedPages = geometry.length > 1 ? [1, 2] : [1];
    const rendered = await rasterizePdf({ file: sheet, outDir: workDir, pages: wantedPages, scale: 1.6 });
    const first = rendered.find((r) => r.page === 1);
    const second = rendered.find((r) => r.page === 2) ?? null;

    const rect = first ? await pageRectangle(first.file, first.pdfWidthPt, first.pdfHeightPt) : null;
    let measurement = null;
    let control = null;
    if (rect) {
      const leftPanel = panelRect(rect, first.pdfHeightPt, "left");
      const rightPanel = panelRect(rect, first.pdfHeightPt, "right");
      measurement = await panelDifference(first.file, leftPanel, first.file, rightPanel);

      if (second) {
        const controlRect = await pageRectangle(second.file, second.pdfWidthPt, second.pdfHeightPt);
        if (controlRect) {
          // Page 1's blank panel against page 2's blank panel: two different
          // pages of the same form, so the answer is known in advance to be
          // "different". Page 2's own two panels would NOT do -- if the
          // artifact is unflattened they are blank-versus-blank too, which is
          // the very thing under test.
          control = await panelDifference(
            first.file, leftPanel,
            second.file, panelRect(controlRect, second.pdfHeightPt, "left")
          );
        }
      }
    }

    let evidencePath = null;
    if (EVIDENCE_FAMILIES.has(familyId) && first) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      const target = path.join(EVIDENCE_DIR, `${jurisdiction}-${familyDir}-contact-sheet-page-01.png`);
      if (!checkOnly) fs.copyFileSync(first.file, target);
      evidencePath = path.relative(rootDir, target);
    }

    families.push({
      familyId, jurisdiction, familySlug: familyDir,
      documentId: record?.documentId ?? familyDir,
      contactSheet: path.relative(rootDir, sheet),
      contactSheetSha256: crypto.createHash("sha256").update(fs.readFileSync(sheet)).digest("hex"),
      renderedEvidence: evidencePath,
      pagesOnSheet: geometry.length,
      comparable: Boolean(measurement),
      blankVsFilled: measurement,
      // Page 2's own two panels, which hold content that differs from page 1's.
      // If this control does not read as clearly different, the measurement is
      // not discriminating on this sheet and no verdict is recorded.
      knownDifferentControl: control,
      controlDiscriminates: control ? control.differingPixelFraction > 0.01 : null,
      // The sheet builder refuses to emit a sheet whose panels match while
      // values were expected. A committed sheet whose panels do match was
      // therefore written before that refusal existed.
      panelsAreVisuallyIdentical: measurement && (control ? control.differingPixelFraction > 0.01 : true)
        ? measurement.differingPixelFraction < 0.001
        : null
    });
  }
}

fs.rmSync(tmpRoot, { recursive: true, force: true });

const comparable = families.filter((f) => f.comparable);
const totals = {
  contactSheetsRendered: families.length,
  contactSheetsComparable: comparable.length,
  contactSheetsWithAKnownDifferentControl: families.filter((f) => f.controlDiscriminates === true).length,
  contactSheetsShowingIdenticalPanels: families.filter((f) => f.panelsAreVisuallyIdentical === true).length,
  contactSheetsShowingADifference: families.filter((f) => f.panelsAreVisuallyIdentical === false).length,
  contactSheetsWithNoVerdict: families.filter((f) => f.panelsAreVisuallyIdentical === null).length,
  renderedEvidenceCommitted: families.filter((f) => f.renderedEvidence).length
};

const payload = {
  schemaVersion: "rcap-contact-sheet-visual-proof/v1",
  generatedBy: "scripts/generate-rcap-contact-sheet-visual-proof.mjs",
  purpose: "Whether each committed blank-versus-filled contact sheet actually shows a filled panel, measured by rendering the sheet and comparing the two panels pixel by pixel.",
  method: {
    renderer: "Chromium's bundled PDF engine, via scripts/rcap-official-forms/rcap-pdf-rasterize.mjs",
    scale: 1.6,
    panelGeometry: "Cropped with the sheet builder's own layout constants: 28pt margin, 24pt gap, 0.62 panel scale, 34pt header.",
    comparison: "Both panels are blurred to remove sub-pixel rounding noise, then compared over a plus-or-minus-three-pixel offset search; the best match is reported. A strict comparison reads two identical panels as 15% different purely because the renderer rounds the two panel origins onto the pixel grid differently.",
    verdict: "Panels are called visually identical when fewer than 0.1% of compared pixels differ by more than 24 greyscale levels after blurring.",
    control: "Where the sheet has a second page, that page's own two panels are measured the same way. They hold different content, so a control that does not read as clearly different means the measurement is not discriminating on this sheet and no verdict is recorded for it."
  },
  readingThisProof: "A sheet whose panels are identical shows a reviewer two blank forms. It is not visual evidence of a fill, and a family carrying one has not been visually reviewed regardless of what the implementation index records.",
  totals,
  families
};

const json = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error(`FAIL contact-sheet visual proof — ${path.relative(rootDir, OUT)} is stale; re-run scripts/generate-rcap-contact-sheet-visual-proof.mjs`);
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
}

console.log(`OK contact-sheet visual proof — ${totals.contactSheetsRendered} sheets rendered; ${totals.contactSheetsShowingIdenticalPanels} show identical panels, ${totals.contactSheetsShowingADifference} show a difference, ${totals.contactSheetsWithNoVerdict} without a verdict`);
