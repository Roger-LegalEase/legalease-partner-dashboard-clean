#!/usr/bin/env node
// Renders every flat-overlay family whose write boxes have been measured.
//
//   node scripts/render-rcap-flat-overlay-families.mjs
//   node scripts/render-rcap-flat-overlay-families.mjs --check
//
// The D0 factory already knows how to fill, fit, flatten, sanitize and prove a
// form. What it needs and could not previously be given is where on the page a
// value goes: a flat PDF has no widgets, and for these forms the anchor capture
// correctly refuses to assert a coordinate the document does not express.
//
// This driver supplies that missing input from each family's own
// overlay-profile.json, where the write boxes are recorded against the rule
// lines they were measured from, and then runs the existing factory. It is
// deliberately general: a family becomes renderable the moment its profile has
// measured anchors and its verified binary is in the clone, so the same driver
// serves every remaining flat-overlay family as their sources arrive.
//
// It renders nothing it cannot verify. The binary is located by the SHA the
// profile pins, so a family whose bytes are absent is skipped and reported
// rather than rendered from whatever file happens to share its name.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { finalizeFlatOverlay, NonFilingHoldError } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { buildContactSheet, ContactSheetProofError } from "./rcap-official-forms/rcap-contact-sheet.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/flat-overlay-render-report.json");
const checkOnly = process.argv.includes("--check");

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

// The same fixture facts the rest of the lane uses, so a boundary failure here
// means the same thing it means everywhere else.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.first_name": "Jordan", "participant.last_name": "Reyes",
  "participant.street_address": "118 Maple Street",
  "participant.city": "Springfield", "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "Circuit Court",
  "matter.case_number": "24-CR-001234", "deterministic.filing_date": "2026-08-12"
};
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County"
};

/** Every PDF in the clone by SHA-256, so a pinned source can be located. */
function binariesBySha() {
  const found = new Map();
  const skip = new Set(["node_modules", ".git", ".next", "tmp"]);
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

const binaries = binariesBySha();
const families = [];
const written = [];

for (const stateDir of fs.readdirSync(OVERLAY_DIR).sort()) {
  const statePath = path.join(OVERLAY_DIR, stateDir);
  if (!fs.statSync(statePath).isDirectory()) continue;
  for (const familyDir of fs.readdirSync(statePath).sort()) {
    const familyPath = path.join(statePath, familyDir);
    const profile = readJson(path.join(familyPath, "overlay-profile.json"));
    if (!profile || !Array.isArray(profile.anchors) || profile.anchors.length === 0) continue;
    if (fs.existsSync(path.join(familyPath, "retirement.json"))) continue;

    const record = readJson(path.join(familyPath, "source-record.json")) ?? {};
    const jurisdiction = String(record.jurisdiction ?? stateDir).toUpperCase();
    const sha = profile.sha256 ?? record.sha256 ?? null;
    const binary = sha ? binaries.get(sha) ?? null : null;
    const row = {
      familyId: `${jurisdiction}:${familyDir}`,
      documentId: record.documentId ?? familyDir,
      sourceSha256: sha,
      sourceBinaryPath: binary ? path.relative(rootDir, binary) : null,
      anchors: profile.anchors.length,
      rendered: false,
      skippedReason: null
    };

    if (!binary) {
      row.skippedReason = "the verified source binary pinned by this profile is not in the clone";
      families.push(row);
      continue;
    }

    const sourceBytes = fs.readFileSync(binary);
    try {
      const results = {};
      for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
        const result = await finalizeFlatOverlay({
          sourceBytes, expectedSha256: sha, anchors: profile.anchors, facts,
          title: `${jurisdiction} ${row.documentId}`
        });
        results[label] = result;
        const file = path.join(familyPath, "fixtures", `${label}-filled.pdf`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (!checkOnly) fs.writeFileSync(file, result.bytes);
        written.push(path.relative(rootDir, file));
      }

      const sheet = await buildContactSheet({
        blankBytes: sourceBytes,
        finalizedBytes: results.canonical.bytes,
        expectedValues: results.canonical.report.expectedValues,
        heading: `${jurisdiction} ${row.documentId} — blank (left) vs finalized fill (right)`
      });
      fs.mkdirSync(path.join(familyPath, "contact-sheet"), { recursive: true });
      if (!checkOnly) {
        fs.writeFileSync(path.join(familyPath, "contact-sheet", "blank-vs-filled.pdf"), sheet.bytes);
        fs.writeFileSync(path.join(familyPath, "contact-sheet", "contact-sheet-proof.json"), `${JSON.stringify(sheet.proof, null, 2)}\n`);
      }

      // Reports, written from the run rather than asserted.
      const canonical = results.canonical.report;
      const boundary = results.boundary.report;
      if (!checkOnly) {
        fs.mkdirSync(path.join(familyPath, "reports"), { recursive: true });
        fs.writeFileSync(path.join(familyPath, "reports/populated-fields.json"),
          `${JSON.stringify(canonical.written.map((w) => ({ field: w.anchor, class: "participant", factId: w.factId })), null, 2)}\n`);
        fs.writeFileSync(path.join(familyPath, "reports/protected-fields.json"), `${JSON.stringify({
          documentOwnership: record.documentOwnership ?? "participant_completed",
          wholeDocumentUnwritable: false,
          unwritableFields: canonical.refused.filter((r) => r.category && r.category !== "unfittable")
            .map((r) => ({ field: r.anchor, class: r.category })),
          manualFields: (profile.deliberatelyUnbound ?? []).map((u) => u.label)
        }, null, 2)}\n`);
        fs.writeFileSync(path.join(familyPath, "reports/overflow-and-clipping.json"), `${JSON.stringify({
          schemaVersion: "rcap-overflow-report/v2", boundaryFixtureApplied: true,
          findings: [
            ...canonical.unfittable.map((u) => ({ fixture: "canonical", check: "unfittable_refused_not_clipped", field: u.anchor, ...u })),
            ...boundary.unfittable.map((u) => ({ fixture: "boundary", check: "unfittable_refused_not_clipped", field: u.anchor, ...u }))
          ]
        }, null, 2)}\n`);
        fs.writeFileSync(path.join(familyPath, "reports/rendered-artifacts.json"), `${JSON.stringify({
          schemaVersion: "rcap-rendered-artifacts/v2",
          renderedBy: "scripts/render-rcap-flat-overlay-families.mjs",
          sourceSha256: sha,
          canonical: { sha256: canonical.outputSha256, bytes: canonical.outputBytes, written: canonical.written.length, refused: canonical.refused.length },
          boundary: { sha256: boundary.outputSha256, bytes: boundary.outputBytes, written: boundary.written.length, refused: boundary.refused.length },
          contactSheetSha256: sheet.proof.sheetSha256,
          activeContentScan: canonical.activeContentScan
        }, null, 2)}\n`);
      }

      row.rendered = true;
      row.canonicalWritten = canonical.written.map((w) => w.anchor);
      row.canonicalRefused = canonical.refused.map((r) => ({ anchor: r.anchor, reason: r.reason, category: r.category ?? null }));
      row.boundaryRefused = boundary.refused.map((r) => ({ anchor: r.anchor, reason: r.reason, category: r.category ?? null }));
      row.activeContentScan = canonical.activeContentScan;
      row.contactSheetProof = sheet.proof;
    } catch (error) {
      row.skippedReason = error instanceof NonFilingHoldError ? `non-filing hold: ${error.notice}`
        : error instanceof ContactSheetProofError ? `contact-sheet proof refused: ${error.message}`
          : `render refused: ${String(error.message).slice(0, 200)}`;
    }
    families.push(row);
  }
}

const totals = {
  familiesWithMeasuredAnchors: families.length,
  familiesRendered: families.filter((f) => f.rendered).length,
  familiesSkippedForMissingBinary: families.filter((f) => f.skippedReason?.includes("not in the clone")).length,
  familiesRefused: families.filter((f) => f.skippedReason && !f.skippedReason.includes("not in the clone")).length
};

const payload = {
  schemaVersion: "rcap-flat-overlay-render-report/v1",
  generatedBy: "scripts/render-rcap-flat-overlay-families.mjs",
  purpose: "Renders every flat-overlay family whose write boxes have been measured, through the existing D0 factory, and records what each run wrote and refused.",
  factory: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs (finalizeFlatOverlay)",
  totals,
  families
};
const json = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error(`FAIL flat-overlay render — ${path.relative(rootDir, OUT)} is stale; re-run scripts/render-rcap-flat-overlay-families.mjs`);
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, json);
}

console.log(`OK flat-overlay render — ${totals.familiesRendered} of ${totals.familiesWithMeasuredAnchors} family(ies) rendered; ${totals.familiesSkippedForMissingBinary} awaiting bytes, ${totals.familiesRefused} refused`);
