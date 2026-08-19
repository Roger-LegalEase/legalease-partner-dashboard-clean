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
import { artifactProvenance, FACTORY_VERSION } from "./rcap-official-forms/rcap-artifact-provenance.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/flat-overlay-render-report.json");
const checkOnly = process.argv.includes("--check");
const RENDERER_VERSION = "render-rcap-flat-overlay-families/v3-suffix-normalised-geometrically-protected";
// Pinned rather than read from the clock, so a re-render of unchanged inputs
// produces an identical record and a drift check keeps its meaning.
const GENERATED_AT = "2026-08-19T00:00:00.000Z";

// Upstream render cache. A family's artifacts are a pure function of its source
// bytes, its field map, its classification and the factory and renderer
// versions, so a family whose inputs are unchanged is not re-rendered at all.
// Without it, correcting one family re-ran the factory over every family that
// had bytes -- and at corpus scale that is the difference between a batch and
// an afternoon. The already-written fixtures are hashed back in, so a cache hit
// that does not match what is on disk is a miss.
const RENDER_CACHE = path.join(rootDir, "data/rcap-all50/flat-overlay-render-cache.json");
const renderCache = (() => {
  if (!fs.existsSync(RENDER_CACHE)) return {};
  try { return JSON.parse(fs.readFileSync(RENDER_CACHE, "utf8")).byInputKey ?? {}; } catch { return {}; }
})();
const cacheHits = [];
const cacheMisses = [];

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

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

    const classification = readJson(path.join(familyPath, "field-classification.json"));
    const inputKey = sha256(JSON.stringify({
      source: sha,
      fieldMap: sha256(JSON.stringify(profile.anchors ?? [])),
      protectedRules: sha256(JSON.stringify(profile.protectedRules ?? [])),
      classification: sha256(JSON.stringify(classification ?? null)),
      factoryVersion: FACTORY_VERSION,
      rendererVersion: RENDERER_VERSION,
      facts: sha256(JSON.stringify({ CANONICAL, BOUNDARY }))
    }));
    const cached = renderCache[inputKey] ?? null;
    // A cache entry is only honoured when the fixtures it describes are still on
    // disk with the hashes it recorded. Anything else is a miss.
    const fixturesStillMatch = cached && (cached.row?.provenance?.artifacts ?? []).every((a) => {
      const file = path.join(familyPath, a.artifact);
      return fs.existsSync(file) && sha256(fs.readFileSync(file)) === a.outputSha256;
    });
    if (cached && fixturesStillMatch) {
      cacheHits.push(row.familyId);
      families.push({ ...cached.row, fromRenderCache: true });
      for (const a of cached.row.provenance?.artifacts ?? []) {
        written.push(path.relative(rootDir, path.join(familyPath, a.artifact)));
      }
      continue;
    }
    cacheMisses.push(row.familyId);

    try {
      const results = {};
      for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
        const result = await finalizeFlatOverlay({
          sourceBytes, expectedSha256: sha, anchors: profile.anchors,
          // The rules the court owns, as geometry. Protection used to be
          // decided from the anchor's label alone, so a write box on the
          // signature rule was accepted under a different name.
          protectedRules: profile.protectedRules ?? [],
          facts,
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

      // Provenance beside the artifact, not inside it. The PDF now carries the
      // court's own metadata, so nothing about which factory produced it can be
      // read from the file; this record is where that lives.
      const provenance = await artifactProvenance({
        jurisdiction, documentId: row.documentId, sourceSha256: sha,
        sourceRevision: record.revision ?? null,
        fieldMap: profile.anchors,
        rendererVersion: RENDERER_VERSION,
        generatedAt: GENERATED_AT,
        artifacts: [
          { rel: "fixtures/canonical-filled.pdf", bytes: results.canonical.bytes },
          { rel: "fixtures/boundary-filled.pdf", bytes: results.boundary.bytes },
          { rel: "contact-sheet/blank-vs-filled.pdf", bytes: sheet.bytes }
        ]
      });
      if (!checkOnly) {
        fs.writeFileSync(path.join(familyPath, "artifact-provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);
      }
      row.provenance = provenance;

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
      row.inputKey = inputKey;
      row.canonicalWritten = canonical.written.map((w) => w.anchor);
      row.canonicalRefused = canonical.refused.map((r) => ({ anchor: r.anchor, reason: r.reason, category: r.category ?? null }));
      row.boundaryRefused = boundary.refused.map((r) => ({ anchor: r.anchor, reason: r.reason, category: r.category ?? null }));
      // Every value the factory changed before drawing it, and why. A silent
      // normalization is indistinguishable from a wrong fact, so the record
      // says what was removed rather than only what was written.
      row.canonicalNormalized = canonical.normalized ?? [];
      row.boundaryNormalized = boundary.normalized ?? [];
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
  const byInputKey = {};
  for (const row of families) {
    if (!row.rendered || !row.inputKey) continue;
    byInputKey[row.inputKey] = { row: { ...row, fromRenderCache: undefined } };
  }
  fs.writeFileSync(RENDER_CACHE, `${JSON.stringify({
    schemaVersion: "rcap-flat-overlay-render-cache/v1",
    purpose: "Content-addressed render cache. The key is the source hash, field-map hash, protected-rule hash, classification hash, factory version, renderer version and fixture facts together, so a family is re-rendered exactly when one of those changes and never otherwise.",
    isNotEvidence: "Deleting this file changes nothing except how long the next run takes. The artifacts and data/rcap-all50/flat-overlay-render-report.json are the record.",
    byInputKey
  }, null, 2)}\n`);
  console.log(`  cache: ${cacheHits.length} reused, ${cacheMisses.length} rendered${cacheMisses.length ? ` (${cacheMisses.join(", ")})` : ""}`);
}

console.log(`OK flat-overlay render — ${totals.familiesRendered} of ${totals.familiesWithMeasuredAnchors} family(ies) rendered; ${totals.familiesSkippedForMissingBinary} awaiting bytes, ${totals.familiesRefused} refused`);
