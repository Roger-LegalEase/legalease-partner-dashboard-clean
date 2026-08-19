#!/usr/bin/env node
// PDF operational-retirement dispositions.
//
//   node scripts/generate-rcap-pdf-retirement-dispositions.mjs
//   node scripts/generate-rcap-pdf-retirement-dispositions.mjs --check
//
// For every problematic-PDF asset that looks orphaned, duplicate, optional,
// superseded or historical, this proves — by scanning the repository rather
// than by asserting — whether anything still depends on it:
//
//   route            a compiled pathway reachable from one of its tracks
//   packet_family    a packet-set component, an adopted family, a packet proof
//   field_map        an overlay production package or a field-map draft
//   runtime_loader   any reference under src/
//   fixture          any fixture or test double
//   legal_design     a legal-design memo, intake record or source relationship
//
// An asset is retirable only when every one of the six comes back empty. One
// hit anywhere keeps it operational, and the hit is named with its file so the
// judgement is checkable rather than trusted.
//
// Retiring an asset here removes it from operational scans and from the
// acquisition queue. It changes no runtime, deletes no bytes, and touches no
// route's sellability.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");
const JSON_OUT = "data/rcap-ledger/pdf-retirement-dispositions.json";
const MD_OUT = "docs/record-clearing/pdf-retirement-dispositions.md";

const SESSION_A_COMMIT = "4072b6189c0cde20ab43673a9f0569d2b8d20752";
const PACKET_SETS = "data/record-clearing/legal-design-packet-set-manifests.json";

const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

const register = readJson("data/rcap-all50/problematic-pdf-register.json");
const queue = readJson("data/rcap-ledger/pdf-source-acquisition-queue.json");
const trackLedger = readJson("data/rcap-ledger/track-terminalization.json");

const packetSets = JSON.parse(
  fs.existsSync(path.join(rootDir, PACKET_SETS)) ? read(PACKET_SETS) : git(["show", `${SESSION_A_COMMIT}:${PACKET_SETS}`])
);

// --------------------------------------------------------------------------- what counts as a dependency surface
const SURFACES = [
  { id: "route", roots: ["src/lib/rcap-engine/compiled", "src/lib/rcap/documents"], why: "a compiled pathway or the packet route resolver" },
  { id: "runtime_loader", roots: ["src"], why: "any reference in application source" },
  { id: "field_map", roots: ["data/rcap-all50/overlays", "docs/record-clearing/field-map-drafts", "data/rcap-all50/hard-forms"], why: "an overlay production package or field-map draft" },
  { id: "packet_family", roots: ["data/record-clearing", "data/rcap-all50/pleadings", "data/rcap-all50/composed-routes"], why: "a packet-set component, adopted family or packet proof" },
  { id: "fixture", roots: ["data/expungement-ai/fixtures", "scripts"], why: "a fixture, test double or harness" },
  { id: "legal_design", roots: ["data/rcap-codex", "data/rcap-ledger", "data/rcap-all50/review-artifacts", "data/rcap-all50/terminalization-treatments"], why: "a legal-design, adoption or terminalization record" }
];

// The register and the artifacts this lane itself writes are the inventory OF
// the problem, not a use of the asset. Counting them would make every asset
// permanently un-retirable by virtue of being listed as retirable.
const SELF_REFERENTIAL = new Set([
  "data/rcap-all50/problematic-pdf-register.json",
  "data/rcap-ledger/pdf-source-acquisition-queue.json",
  "data/rcap-ledger/pdf-retirement-dispositions.json",
  "docs/record-clearing/problematic-pdf-register.md",
  "docs/record-clearing/problematic-pdf-register.csv",
  "docs/record-clearing/pdf-source-acquisition-queue.md",
  "docs/record-clearing/pdf-retirement-dispositions.md",
  "scripts/generate-rcap-problematic-pdf-register.mjs",
  "scripts/generate-rcap-pdf-source-acquisition-queue.mjs",
  "scripts/generate-rcap-pdf-retirement-dispositions.mjs",
  "scripts/verify-rcap-pdf-acquisition-evidence.mjs"
]);

const TEXT = /\.(json|ts|tsx|mjs|js|md|csv|txt|ya?ml)$/i;
function filesUnder(root) {
  const out = [];
  const abs = path.join(rootDir, root);
  if (!fs.existsSync(abs)) return out;
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name === "node_modules" || entry.name === ".git") continue; walk(p); continue; }
      if (!TEXT.test(entry.name)) continue;
      out.push(path.relative(rootDir, p));
    }
  })(abs);
  return out;
}

// --------------------------------------------------------------------------- tokens
// The strings that would appear if something referenced this asset: its form
// id, its family ids, and its declared source hash. Short or generic tokens are
// refused rather than guessed at — a false dependency is safer than a false
// retirement, but a token like "1" would make everything look depended-on.
function tokensFor(record) {
  const tokens = new Set();
  const add = (v) => {
    const s = String(v ?? "").trim();
    if (s.length >= 6 && /[A-Za-z0-9]/.test(s)) tokens.add(s);
  };
  add(record.formId);
  for (const family of record.familyIds ?? []) {
    add(family);
    add(String(family).split(":").pop());
  }
  if (record.sourceSha256) tokens.add(record.sourceSha256);
  return [...tokens];
}

// --------------------------------------------------------------------------- one scan, then answer every asset
const candidates = register.records.filter((r) => r.section === "orphaned_or_optional_problem_pdfs" || (r.affectedTrackIds ?? []).length === 0);
const tokenOwners = new Map();
for (const record of candidates) {
  for (const token of tokensFor(record)) {
    if (!tokenOwners.has(token)) tokenOwners.set(token, []);
    tokenOwners.get(token).push(record.identity);
  }
}
const allTokens = [...tokenOwners.keys()];

// file -> Set(token). Scanned once per surface root set, deduplicated by path.
const scannedFiles = new Map();
for (const surface of SURFACES) {
  for (const root of surface.roots) {
    for (const file of filesUnder(root)) {
      if (SELF_REFERENTIAL.has(file)) continue;
      if (scannedFiles.has(file)) { scannedFiles.get(file).surfaces.add(surface.id); continue; }
      scannedFiles.set(file, { surfaces: new Set([surface.id]), hits: null });
    }
  }
}
for (const [file, entry] of scannedFiles) {
  let text;
  try { text = read(file); } catch { entry.hits = []; continue; }
  const hits = [];
  for (const token of allTokens) if (text.includes(token)) hits.push(token);
  entry.hits = hits;
}

const hitsByToken = new Map();
for (const [file, entry] of scannedFiles) {
  for (const token of entry.hits) {
    if (!hitsByToken.has(token)) hitsByToken.set(token, []);
    hitsByToken.get(token).push({ file, surfaces: [...entry.surfaces].sort() });
  }
}

// A track that still maps to a compiled pathway is a route dependency on its own.
const trackById = new Map(trackLedger.tracks.map((t) => [t.trackId, t]));

// --------------------------------------------------------------------------- dispositions
const dispositions = [];
for (const record of candidates) {
  const tokens = tokensFor(record);
  const evidence = {};
  for (const surface of SURFACES) evidence[surface.id] = [];

  for (const token of tokens) {
    for (const hit of hitsByToken.get(token) ?? []) {
      for (const surfaceId of hit.surfaces) {
        if (!evidence[surfaceId].some((e) => e.file === hit.file && e.token === token)) {
          evidence[surfaceId].push({ token, file: hit.file });
        }
      }
    }
  }

  // A route dependency is also true if any of its tracks still maps to a pathway.
  const mappedTracks = (record.affectedTrackIds ?? []).filter((t) => (trackById.get(t)?.mappedCompiledPathwayIds ?? []).length > 0);
  for (const trackId of mappedTracks) {
    evidence.route.push({ token: trackId, file: "data/rcap-ledger/track-terminalization.json (track maps to a compiled pathway)" });
  }
  // A packet-set component naming this form is a packet-family dependency.
  for (const set of packetSets.packetSets ?? []) {
    for (const component of set.components ?? []) {
      if (!component.officialFormId) continue;
      if (tokens.some((t) => String(component.officialFormId).includes(t) || t.includes(String(component.officialFormId)))) {
        evidence.packet_family.push({ token: component.officialFormId, file: `${PACKET_SETS}:${set.packetSetId}/${component.componentId}` });
      }
    }
  }

  const dependentSurfaces = SURFACES.filter((s) => evidence[s.id].length > 0).map((s) => s.id);
  const retirable = dependentSurfaces.length === 0;

  dispositions.push({
    assetId: record.identity,
    jurisdiction: record.jurisdiction,
    formId: record.formId,
    familyIds: record.familyIds ?? [],
    section: record.section,
    affectedTrackIds: record.affectedTrackIds ?? [],
    candidateBecause: record.section === "orphaned_or_optional_problem_pdfs"
      ? "recorded in the orphaned-or-optional section of the problematic-PDF register"
      : "no registry track references it",
    tokensProvenAgainst: tokens,
    dependencyEvidence: Object.fromEntries(SURFACES.map((s) => [s.id, evidence[s.id].slice(0, 8)])),
    dependentSurfaces,
    disposition: retirable ? "retire_from_operational_scans" : "keep_operational",
    statement: retirable
      ? "No current route, packet family, field map, runtime loader, fixture or legal-design record references this asset. It is removed from operational scans and from the acquisition queue. Nothing is deleted and no route changes."
      : `Still referenced by ${dependentSurfaces.join(", ")}. It stays in operational scans; retiring it would drop an asset something still points at.`
  });
}

const retirable = dispositions.filter((d) => d.disposition === "retire_from_operational_scans");
const retirableIds = new Set(retirable.map((d) => d.assetId));
const tally = (list, fn) => list.reduce((m, x) => { const k = fn(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const keptBySurface = {};
for (const d of dispositions.filter((x) => x.disposition === "keep_operational")) {
  for (const s of d.dependentSurfaces) keptBySurface[s] = (keptBySurface[s] ?? 0) + 1;
}

const packet = {
  schemaVersion: "rcap-pdf-retirement-dispositions/v1",
  generatedBy: "scripts/generate-rcap-pdf-retirement-dispositions.mjs",
  rule: "An asset is retirable only when route, packet_family, field_map, runtime_loader, fixture and legal_design all come back empty. One hit anywhere keeps it operational, and every hit is named with its file.",
  deletesNothing: "Retirement removes an asset from operational scans and from the acquisition queue. No bytes are deleted, no runtime changes, and no route's sellability changes.",
  selfReferentialExclusions: [...SELF_REFERENTIAL].sort(),
  surfaces: SURFACES.map((s) => ({ id: s.id, roots: s.roots, why: s.why })),
  totals: {
    registerAssets: register.records.length,
    retirementCandidatesExamined: dispositions.length,
    provenRetirable: retirable.length,
    keptOperational: dispositions.length - retirable.length,
    keptBecauseOfSurface: keptBySurface,
    retirableByJurisdiction: tally(retirable, (d) => d.jurisdiction),
    filesScanned: scannedFiles.size,
    tokensProven: allTokens.length
  },
  removedFromAcquisitionQueue: retirable
    .filter((d) => (queue.assets.find((a) => a.assetId === d.assetId)?.classification ?? "") !== "no_source_identified")
    .map((d) => ({ assetId: d.assetId, previousClassification: queue.assets.find((a) => a.assetId === d.assetId)?.classification ?? null })),
  operationalScanExclusionList: [...retirableIds].sort(),
  dispositions
};

function md() {
  const l = [];
  l.push("# PDF operational-retirement dispositions");
  l.push("");
  l.push(`**${dispositions.length}** of ${register.records.length} problematic-PDF assets looked orphaned, duplicate, optional,`);
  l.push("superseded or historical. Each was proven against six dependency surfaces by scanning");
  l.push(`**${scannedFiles.size}** files for **${allTokens.length}** identifiers, not by assertion.`);
  l.push("");
  l.push("| Surface | What it looks for |");
  l.push("|---|---|");
  for (const s of SURFACES) l.push(`| \`${s.id}\` | ${s.why} |`);
  l.push("");
  l.push("| Disposition | Assets |");
  l.push("|---|---|");
  l.push(`| \`retire_from_operational_scans\` | ${retirable.length} |`);
  l.push(`| \`keep_operational\` | ${dispositions.length - retirable.length} |`);
  l.push("");
  if (Object.keys(keptBySurface).length) {
    l.push("Assets kept, by the surface that still references them:");
    l.push("");
    l.push("| Surface | Assets kept |");
    l.push("|---|---|");
    for (const [k, v] of Object.entries(keptBySurface).sort((a, b) => b[1] - a[1])) l.push(`| \`${k}\` | ${v} |`);
    l.push("");
  }
  l.push("## What retirement does and does not do");
  l.push("");
  l.push("It removes the asset from operational scans and from the acquisition queue. It deletes no");
  l.push("bytes, changes no runtime, and changes no route's sellability. An asset can come back the");
  l.push("moment something references it again — the proof re-runs on every generation.");
  l.push("");
  l.push("The register and this lane's own artifacts are excluded from the scan. Counting them would");
  l.push("make every asset permanently un-retirable by virtue of being listed as a retirement");
  l.push("candidate.");
  l.push("");
  l.push("Regenerate with `node scripts/generate-rcap-pdf-retirement-dispositions.mjs`.");
  return l.join("\n") + "\n";
}

const jsonText = JSON.stringify(packet, null, 2) + "\n";
const mdText = md();

if (CHECK) {
  const problems = [];
  if (read(JSON_OUT) !== jsonText) problems.push(`${JSON_OUT} is stale.`);
  if (read(MD_OUT) !== mdText) problems.push(`${MD_OUT} is stale.`);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`retirement dispositions current: ${retirable.length} retirable of ${dispositions.length} examined.`);
  process.exit(0);
}

fs.writeFileSync(path.join(rootDir, JSON_OUT), jsonText);
fs.writeFileSync(path.join(rootDir, MD_OUT), mdText);
console.log(`wrote ${JSON_OUT} and ${MD_OUT}`);
console.log(`  candidates examined: ${dispositions.length}, files scanned: ${scannedFiles.size}, tokens: ${allTokens.length}`);
console.log(`  proven retirable: ${retirable.length}; kept operational: ${dispositions.length - retirable.length} ${JSON.stringify(keptBySurface)}`);
