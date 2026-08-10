// Registry projection for the track ↔ pathway crosswalk.
//
// The 497-track registry lives on the integration branch
// (`origin/feat/record-clearing-production-integration`), which this lane never
// switches to or modifies. The crosswalk generator must nevertheless run in CI
// on a tree that has only main's history, so the mapping evidence is vendored
// here as a pinned projection — the same pattern `data/rcap-render/state-machine.json`
// uses to let two branches agree without reading each other.
//
// The projection carries only the fields the crosswalk needs as mapping
// evidence. It records the source commit and the sha256 of every source blob so
// a stale projection is detectable rather than silently trusted.
//
//   node scripts/extract-rcap-registry-projection.mjs            # write
//   node scripts/extract-rcap-registry-projection.mjs --check     # verify only
//
// Requires the integration ref to be fetched. Without it the script exits 1 and
// changes nothing; the committed projection stays authoritative.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(rootDir, "data/rcap-ledger/registry-crosswalk-projection.json");

const REF = "origin/feat/record-clearing-production-integration";
const SOURCES = {
  registry: "data/record-clearing/legal-design-track-registry.json",
  relationships: "data/record-clearing/legal-design-track-source-relationships.json",
};

const checkOnly = process.argv.includes("--check");

function git(args) {
  return execFileSync("git", args, { cwd: rootDir, maxBuffer: 512 * 1024 * 1024 });
}

function readBlob(file) {
  return git(["show", `${REF}:${file}`]);
}

let commit;
try {
  commit = git(["rev-parse", REF]).toString().trim();
} catch {
  console.error(`Integration ref ${REF} is not present. Fetch it, or keep the committed projection.`);
  process.exit(1);
}

const blobs = {};
const sha256 = {};
for (const [key, file] of Object.entries(SOURCES)) {
  let buf;
  try {
    buf = readBlob(file);
  } catch {
    console.error(`Missing ${file} at ${REF}.`);
    process.exit(1);
  }
  blobs[key] = JSON.parse(buf.toString("utf8"));
  sha256[file] = crypto.createHash("sha256").update(buf).digest("hex");
}

// Official form identifiers a track is already related to, from the committed
// track↔source relationship table plus the track's own officialSources block.
const formsByTrack = new Map();
for (const rel of blobs.relationships.relationships || []) {
  if (!rel.trackId) continue;
  const set = formsByTrack.get(rel.trackId) || new Set();
  if (rel.officialFormId) set.add(String(rel.officialFormId));
  if (rel.officialSourceUrl) set.add(path.basename(String(rel.officialSourceUrl)));
  formsByTrack.set(rel.trackId, set);
}

// A statement only earns a place in scopedOutStatements when it carries a digit:
// the crosswalk reads these for a statutory citation that routes a matter
// *outside* the track, and a statement with no number cannot carry one.
function scopedOutStatements(track) {
  const out = [];
  for (const key of ["selfHelpStopConditions", "scopeRestrictions"]) {
    for (const entry of track[key] || []) {
      const text = typeof entry === "string" ? entry : entry && entry.statement;
      if (typeof text !== "string" || !/[0-9]/.test(text)) continue;
      out.push({ field: key, text: text.slice(0, 400) });
    }
  }
  return out;
}

const tracks = (blobs.registry.tracks || []).map((track) => {
  const forms = new Set(formsByTrack.get(track.trackId) || []);
  for (const source of track.officialSources || []) {
    if (source && source.url) forms.add(path.basename(String(source.url)));
    if (source && source.title) forms.add(String(source.title));
  }
  return {
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    legalName: track.legalName || null,
    authority: Array.isArray(track.authority) ? track.authority : [],
    outputStrategy: track.outputStrategy ?? null,
    compositionMode: track.compositionMode ?? null,
    unitCount: Array.isArray(track.units) ? track.units.length : 0,
    officialFormRefs: [...forms].sort(),
    scopedOutStatements: scopedOutStatements(track),
    implementationQueue: track.implementationQueue ?? null,
    legalDesignStatus: track.legalDesignStatus ?? null,
  };
});

tracks.sort((a, b) =>
  a.jurisdiction === b.jurisdiction
    ? a.trackId.localeCompare(b.trackId)
    : a.jurisdiction.localeCompare(b.jurisdiction)
);

const projection = {
  schemaVersion: "rcap-registry-crosswalk-projection/v1",
  generatedBy: "scripts/extract-rcap-registry-projection.mjs",
  note:
    "Field-limited projection of the nationwide track registry, pinned to the integration branch. " +
    "Mapping evidence only; certification state lives in the authority ledger.",
  source: {
    ref: REF,
    commit,
    files: Object.values(SOURCES),
    sha256,
    authorityEdition: blobs.registry.masterLibraryAuthority?.edition ?? null,
  },
  trackCount: tracks.length,
  declaredTrackCount: blobs.registry.trackCount ?? null,
  tracks,
};

const serialized = `${JSON.stringify(projection, null, 2)}\n`;

if (checkOnly) {
  if (!fs.existsSync(outPath)) {
    console.error("No committed projection to check.");
    process.exit(1);
  }
  const current = fs.readFileSync(outPath, "utf8");
  if (current !== serialized) {
    console.error("Registry projection is stale against the integration branch.");
    process.exit(1);
  }
  console.log(`Registry projection current at ${commit.slice(0, 10)} (${tracks.length} tracks).`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized, "utf8");

console.log(`ref              ${REF}`);
console.log(`commit           ${commit}`);
console.log(`tracks           ${tracks.length} (declared ${projection.declaredTrackCount})`);
console.log(`withAuthority    ${tracks.filter((t) => t.authority.length > 0).length}`);
console.log(`withFormRefs     ${tracks.filter((t) => t.officialFormRefs.length > 0).length}`);
console.log(`withScopedOut    ${tracks.filter((t) => t.scopedOutStatements.length > 0).length}`);
console.log(`projection       ${path.relative(rootDir, outPath)}`);
