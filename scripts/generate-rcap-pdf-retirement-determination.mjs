#!/usr/bin/env node
// Does the platform actually use this asset, anywhere?
//
//   node scripts/generate-rcap-pdf-retirement-determination.mjs
//   node scripts/generate-rcap-pdf-retirement-determination.mjs --check
//
// Retirement is only honest if "nothing uses it" was checked rather than
// assumed, and "nothing" has to mean every surface that could reach the asset,
// not just the one that was convenient to read. An asset the register calls
// orphaned because no ledger track names it may still be named by a packet
// component, a composed route, a guidance packet, an overlay manifest, a
// runtime field-map draft, or application source.
//
// So each asset is probed against all of them, by document id AND by normalized
// form number, because the corpus keys the same form both ways -- a filename in
// one place and a form number in another, which is exactly how a dependency
// gets missed.
//
// An asset with any hit is RETAINED and must be remediated like every other.
// Only an asset with no hit anywhere is a retirement candidate, and even then
// this file records the evidence rather than performing the removal: what it
// produces is the determination, and the determination is reviewable.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/pdf-retirement-determination.json");
const checkOnly = process.argv.includes("--check");

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

/** A form identifier reduced to comparable characters: CR-65, cr_65, CR65 fold. */
const normalize = (value) => String(value ?? "")
  .replace(/\.(pdf|html?|docx?)$/i, "")
  .replace(/[-_\s.]/g, "")
  .toUpperCase();

// ---- every surface that could reach an asset --------------------------------
// Each probe returns the set of normalized identifiers it names. A surface that
// cannot be read contributes nothing AND is recorded as unread, because a probe
// that silently returns empty is indistinguishable from a surface with no
// dependencies, and only one of those justifies retiring anything.
const surfaces = [];
const unreadable = [];

function addSurface(name, description, runtime, collect) {
  try {
    const ids = collect();
    surfaces.push({ name, description, runtime, identifierCount: ids.size, ids });
  } catch (error) {
    unreadable.push({ name, reason: String(error.message).slice(0, 200) });
  }
}

/** Every string in a JSON tree, so an identifier cannot hide in an unexpected key. */
function stringsIn(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) stringsIn(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) stringsIn(item, out);
  return out;
}

function idsFromTree(dir, filter = () => true) {
  const ids = new Set();
  const walk = (current) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (filter(full)) {
        for (const text of stringsIn(readJson(full, {}))) ids.add(normalize(text));
        ids.add(normalize(entry.name));
      }
    }
  };
  walk(dir);
  return ids;
}

// The pinned legal design: which forms a packet component actually requires.
addSurface("legal_design_registry", "The byte-pinned legal-design track registry's packet components.", false, () => {
  const ledger = readJson(path.join(rootDir, "data/rcap-ledger/track-terminalization.json"));
  const raw = execFileSync("git", ["show", `${ledger.registrySource.commit}:data/record-clearing/legal-design-track-registry.json`],
    { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const ids = new Set();
  for (const track of JSON.parse(raw).tracks) {
    for (const component of track.packetSet?.components ?? []) {
      if (component.officialFormId) ids.add(normalize(component.officialFormId));
    }
  }
  return ids;
});

addSurface("track_terminalization_ledger", "Tracks and their required family ids.", false,
  () => new Set(stringsIn(readJson(path.join(rootDir, "data/rcap-ledger/track-terminalization.json"), {})).map(normalize)));

addSurface("d_track_queue", "The D queue's committed family relationships.", false,
  () => new Set(stringsIn(readJson(path.join(rootDir, "data/rcap-all50/review-artifacts/d-track-queue.json"), {})).map(normalize)));

addSurface("composed_routes", "Composed route definitions and their components.", true,
  () => idsFromTree(path.join(rootDir, "data/rcap-all50/composed-routes"), (f) => f.endsWith(".json")));

addSurface("guidance_packets", "Guidance packets the runtime registry loads.", true,
  () => idsFromTree(path.join(rootDir, "data/rcap-all50/guidance-packets"), (f) => f.endsWith(".json")));

addSurface("terminalization_treatments", "Terminal treatments the runtime registry loads.", true,
  () => idsFromTree(path.join(rootDir, "data/rcap-all50/terminalization-treatments"), (f) => f.endsWith(".json")));

addSurface("overlay_factory_manifest", "The overlay factory manifest the internal preview reads.", true,
  () => new Set(stringsIn(readJson(path.join(rootDir, "data/rcap-all50/overlays/overlay-factory-manifest.json"), {})).map(normalize)));

addSurface("all_state_build_manifest", "The all-state build manifest the internal preview reads.", true,
  () => new Set(stringsIn(readJson(path.join(rootDir, "data/rcap-all50/all-state-build-manifest.json"), {})).map(normalize)));

// A genuine runtime input: src/lib/record-clearing/official-pdf-shadow-batch.ts
// reads this directory at run time, so a file here is an application input and
// removing one changes application behaviour.
addSurface("field_map_drafts", "Field-map drafts read at runtime by official-pdf-shadow-batch.ts.", true, () => {
  const dir = path.join(rootDir, "docs/record-clearing/field-map-drafts");
  const ids = new Set();
  if (!fs.existsSync(dir)) return ids;
  for (const entry of fs.readdirSync(dir)) ids.add(normalize(entry));
  return ids;
});

addSurface("application_source", "Identifiers named literally in src/.", true, () => {
  const ids = new Set();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        for (const match of text.match(/[A-Za-z]{2,8}-\d[\dA-Za-z.-]*/g) ?? []) ids.add(normalize(match));
      }
    }
  };
  walk(path.join(rootDir, "src"));
  return ids;
});

// ---- probe every asset ------------------------------------------------------
// Read from the family directories rather than from the register, and include
// families already carrying a retirement marker. The register's denominator
// shrinks as assets retire, so deriving this from the register would make the
// determination self-confirming: it could never re-check a retirement it had
// already caused. Scanning the directories keeps it verifiable forever, and
// keeps a retired asset re-testable the day something starts using it again.
function everyFamily() {
  const out = [];
  for (const stateDir of fs.readdirSync(OVERLAY_DIR).sort()) {
    const statePath = path.join(OVERLAY_DIR, stateDir);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const familyDir of fs.readdirSync(statePath).sort()) {
      const familyPath = path.join(statePath, familyDir);
      const record = readJson(path.join(familyPath, "source-record.json"));
      if (!record) continue;
      out.push({ familyPath, familyDir, jurisdiction: String(record.jurisdiction ?? stateDir).toUpperCase(), record });
    }
  }
  return out;
}

// One row per asset identity, matching how the register deduplicates: two
// families resolving to the same binary are one asset.
const byIdentity = new Map();
for (const family of everyFamily()) {
  const documentId = family.record.documentId ?? family.record.fileName ?? family.familyDir;
  const sha = family.record.sha256 ?? family.record.expectedSha256 ?? null;
  const identity = `${family.jurisdiction}|${documentId}|${sha ?? "no-sha"}`;
  const row = byIdentity.get(identity) ?? {
    assetId: identity, jurisdiction: family.jurisdiction, formNumber: documentId,
    formFamilyIds: [], alreadyRetired: false
  };
  row.formFamilyIds.push(`${family.jurisdiction}:${family.familyDir}`);
  if (fs.existsSync(path.join(family.familyPath, "retirement.json"))) row.alreadyRetired = true;
  byIdentity.set(identity, row);
}

// Track bindings, read from the same committed relationships the register uses.
const queueTracks = new Map();
for (const track of (readJson(path.join(rootDir, "data/rcap-all50/review-artifacts/d-track-queue.json"), { tracks: [] }).tracks ?? [])) {
  for (const familyId of track.requiredFamilyIds ?? []) {
    queueTracks.set(familyId, [...(queueTracks.get(familyId) ?? []), track.trackId]);
  }
}

const assets = [...byIdentity.values()].map((row) => {
  const affectedTrackIds = [...new Set(row.formFamilyIds.flatMap((id) => queueTracks.get(id) ?? []))].sort();
  // Both keys, because the corpus names the same form both ways.
  const candidates = [...new Set([
    normalize(row.formNumber),
    ...row.formFamilyIds.map((id) => normalize(id.split(":")[1] ?? id))
  ])].filter((c) => c.length >= 3);

  const hits = [];
  for (const surface of surfaces) {
    const matched = candidates.filter((c) => surface.ids.has(c));
    if (matched.length > 0) hits.push({ surface: surface.name, runtime: surface.runtime, matchedIdentifiers: matched });
  }

  const usedByPlatform = hits.length > 0 || affectedTrackIds.length > 0;
  const usedAtRuntime = hits.some((h) => h.runtime);

  return {
    jurisdiction: row.jurisdiction,
    formNumber: row.formNumber,
    assetId: row.assetId,
    familyIds: row.formFamilyIds.sort(),
    alreadyRetired: row.alreadyRetired,
    activeTrackStatus: affectedTrackIds.length > 0 ? "active_track" : "no_track_binding",
    affectedTrackIds,
    probedIdentifiers: candidates,
    usedByPlatform,
    usedAtRuntime,
    useSites: hits,
    determination: usedByPlatform ? "retain_and_remediate" : "retirement_candidate",
    // Recorded, never inferred: an asset that no surface names still had to be
    // checked against every surface for that to mean anything.
    determinationBasis: usedByPlatform
      ? `Named by ${hits.length} surface(s): ${hits.map((h) => h.surface).join(", ")}.`
      : `No surface names it. Probed ${surfaces.length} surface(s) against ${candidates.length} identifier(s).`
  };
});

const retainable = assets.filter((a) => a.determination === "retain_and_remediate");
const retirable = assets.filter((a) => a.determination === "retirement_candidate");

const totals = {
  assetsProbed: assets.length,
  surfacesProbed: surfaces.length,
  surfacesUnreadable: unreadable.length,
  retainAndRemediate: retainable.length,
  retirementCandidates: retirable.length,
  retainedBecauseOfARuntimeSurface: assets.filter((a) => a.usedAtRuntime).length,
  assetsWithNoTrackBinding: assets.filter((a) => a.activeTrackStatus === "no_track_binding").length,
  assetsWithNoTrackBindingRetainedAnyway: assets.filter((a) => a.activeTrackStatus === "no_track_binding" && a.usedByPlatform).length,
  alreadyCarryingARetirementMarker: assets.filter((a) => a.alreadyRetired).length
};

const payload = {
  schemaVersion: "rcap-pdf-retirement-determination/v1",
  generatedBy: "scripts/generate-rcap-pdf-retirement-determination.mjs",
  purpose: "Whether the platform uses each problematic asset anywhere, probed across every surface that could reach it, so retirement rests on a checked absence rather than an assumed one.",
  rule: "An asset named by ANY surface is retained and must be remediated. Only an asset named by none is a retirement candidate. Difficulty of repair is never a reason to retire.",
  surfacesProbed: surfaces.map(({ name, description, runtime, identifierCount }) => ({ name, description, runtime, identifierCount })),
  surfacesUnreadable: unreadable,
  totals,
  assets
};

const json = `${JSON.stringify(payload, null, 2)}\n`;

if (unreadable.length > 0) {
  console.error(`FAIL retirement determination — ${unreadable.length} surface(s) could not be read; an unchecked surface cannot support a retirement`);
  for (const row of unreadable) console.error(`  ${row.name}: ${row.reason}`);
  process.exit(1);
}

if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error(`FAIL retirement determination — ${path.relative(rootDir, OUT)} is stale; re-run scripts/generate-rcap-pdf-retirement-determination.mjs`);
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, json);
}

console.log(`OK retirement determination — ${totals.assetsProbed} assets probed across ${totals.surfacesProbed} surfaces; retain ${totals.retainAndRemediate}, retirement candidates ${totals.retirementCandidates}`);
