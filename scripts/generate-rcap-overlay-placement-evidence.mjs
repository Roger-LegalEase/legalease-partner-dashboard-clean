#!/usr/bin/env node
// Rendered evidence for the placement decisions a flat form cannot make itself.
//
//   node scripts/generate-rcap-overlay-placement-evidence.mjs
//   node scripts/generate-rcap-overlay-placement-evidence.mjs --check
//
// A flat official form has no widgets, so every value is placed by measured
// geometry. The anchor capture reads the page's own content stream and derives
// a write box from a label's rule line. Some forms do not have one: the label
// is a standalone caption and the value's position is set by a printed cell the
// content stream never expresses as a rectangle. The capture records those as
// candidate labels with `writeBoxDerivable: false` and asserts no coordinate,
// which is the correct refusal -- guessing a rectangle on a court filing is how
// a participant's name lands in a clerk's box.
//
// What that refusal leaves behind is a decision only a person looking at the
// page can make, and nothing in the repository was giving them the page. This
// renders it: the official form, at full page, with each candidate label marked
// where the content stream actually found it.
//
// Every marker is a MEASURED label position, not a proposed write box. The
// distinction is the whole point. Where the value goes relative to that label
// is the judgement being asked for, and this file does not make it.
//
// Only families whose verified binary is present in this clone can be rendered,
// because the marks have to sit on the real form.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const EVIDENCE_DIR = path.join(rootDir, "docs/record-clearing/pdf-visual-evidence");
const OUT = path.join(rootDir, "data/rcap-all50/overlay-placement-evidence.json");
const checkOnly = process.argv.includes("--check");

// pdf-lib stamps a fresh modification date on every save; pinning it keeps the
// marked document, and therefore its rendering, reproducible.
const RENDER_DATE = new Date("2026-08-12T00:00:00.000Z");

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

/** Every PDF in the clone, by SHA-256, so a pinned source can be located. */
function pdfsInClone() {
  const found = new Map();
  const skip = new Set(["node_modules", ".git", ".next"]);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.pdf$/i.test(entry.name)) {
        const sha = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
        if (!found.has(sha)) found.set(sha, full);
      }
    }
  };
  walk(rootDir);
  return found;
}

/** Draws a marker at each candidate label's measured baseline position. */
async function markLabels(sourceBytes, labels) {
  const doc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  for (const label of labels) {
    const page = pages[(label.page ?? 1) - 1];
    if (!page) continue;
    const x = label.labelX;
    const y = label.baselineY;
    // A caret under the label's own baseline, and the fact id beside it. The
    // mark deliberately sits ON the label rather than where a value might go.
    page.drawLine({ start: { x: x - 2, y: y - 2 }, end: { x: x + 60, y: y - 2 }, thickness: 0.8, color: rgb(0.85, 0.1, 0.1) });
    page.drawLine({ start: { x, y: y - 5 }, end: { x, y: y + 9 }, thickness: 0.8, color: rgb(0.85, 0.1, 0.1) });
    page.drawText(label.factId, { x: x + 63, y: y - 4, size: 5.5, font, color: rgb(0.85, 0.1, 0.1) });
  }
  doc.setModificationDate(RENDER_DATE);
  doc.setCreationDate(RENDER_DATE);
  return doc.save({ useObjectStreams: false });
}

const binaries = pdfsInClone();
const families = [];
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-placement-"));

for (const stateDir of fs.readdirSync(OVERLAY_DIR).sort()) {
  const statePath = path.join(OVERLAY_DIR, stateDir);
  if (!fs.statSync(statePath).isDirectory()) continue;
  for (const familyDir of fs.readdirSync(statePath).sort()) {
    const familyPath = path.join(statePath, familyDir);
    const profile = readJson(path.join(familyPath, "overlay-profile.json"));
    if (!profile) continue;

    const pending = (profile.anchorCapture?.candidateLabels ?? []).filter((l) => l.writeBoxDerivable === false);
    if (pending.length === 0) continue;

    const record = readJson(path.join(familyPath, "source-record.json")) ?? {};
    const jurisdiction = String(record.jurisdiction ?? stateDir).toUpperCase();
    const sha = profile.sha256 ?? record.sha256 ?? null;
    const binary = sha ? binaries.get(sha) ?? null : null;

    const row = {
      familyId: `${jurisdiction}:${familyDir}`,
      jurisdiction,
      documentId: record.documentId ?? familyDir,
      officialTitle: record.officialTitle ?? null,
      sourceSha256: sha,
      sourceBinaryPathInClone: binary ? path.relative(rootDir, binary) : null,
      anchorsDerived: profile.anchorCapture?.anchorCount ?? 0,
      labelsAwaitingAPlacementDecision: pending.map((l) => ({
        page: l.page, label: l.label, factId: l.factId,
        measuredLabelX: l.labelX, measuredBaselineY: l.baselineY, fontSize: l.fontSize,
        whyNoCoordinateIsAsserted: l.reason
      })),
      renderedEvidence: null,
      renderedEvidenceStatus: null
    };

    if (!binary) {
      row.renderedEvidenceStatus = "the verified source binary is not in this clone, so the form cannot be rendered here";
      families.push(row);
      continue;
    }

    const marked = await markLabels(fs.readFileSync(binary), pending);
    const workDir = path.join(tmpRoot, jurisdiction, familyDir);
    fs.mkdirSync(workDir, { recursive: true });
    const markedPath = path.join(workDir, "marked.pdf");
    fs.writeFileSync(markedPath, marked);

    const pagesWithLabels = [...new Set(pending.map((l) => l.page ?? 1))].sort((a, b) => a - b);
    const rendered = await rasterizePdf({ file: markedPath, outDir: workDir, pages: pagesWithLabels, scale: 1.8 });

    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const written = [];
    for (const page of rendered) {
      const target = path.join(EVIDENCE_DIR, `${jurisdiction}-${familyDir}-placement-page-${String(page.page).padStart(2, "0")}.png`);
      if (!checkOnly) fs.copyFileSync(page.file, target);
      written.push(path.relative(rootDir, target));
    }
    row.renderedEvidence = written;
    row.renderedEvidenceStatus = "rendered from the verified binary with each candidate label marked at its measured position";
    families.push(row);
  }
}

fs.rmSync(tmpRoot, { recursive: true, force: true });

const totals = {
  familiesAwaitingAPlacementDecision: families.length,
  labelsAwaitingAPlacementDecision: families.reduce((n, f) => n + f.labelsAwaitingAPlacementDecision.length, 0),
  familiesRendered: families.filter((f) => f.renderedEvidence).length,
  familiesWhoseBinaryIsNotInThisClone: families.filter((f) => !f.sourceBinaryPathInClone).length
};

const payload = {
  schemaVersion: "rcap-overlay-placement-evidence/v1",
  generatedBy: "scripts/generate-rcap-overlay-placement-evidence.mjs",
  purpose: "The rendered official form behind every flat-overlay label whose write box the document does not express, so the placement decision can be made by someone looking at the page.",
  whatTheMarksMean: "Each mark is the label's MEASURED position, read from the page's own content stream. It is not a proposed write box. Where a participant value belongs relative to that label is the judgement being requested, and this generator does not make it.",
  disposition: "HELD. Rendering the page decides nothing. No coordinate here is approved, and no value may be bound until a placement is reviewed and recorded.",
  totals,
  families
};

const json = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error(`FAIL overlay placement evidence — ${path.relative(rootDir, OUT)} is stale; re-run scripts/generate-rcap-overlay-placement-evidence.mjs`);
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
}

console.log(`OK overlay placement evidence — ${totals.familiesAwaitingAPlacementDecision} families, ${totals.labelsAwaitingAPlacementDecision} labels awaiting a placement decision; ${totals.familiesRendered} rendered, ${totals.familiesWhoseBinaryIsNotInThisClone} cannot be rendered here`);
