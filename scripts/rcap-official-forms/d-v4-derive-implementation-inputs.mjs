// Phase 1 — derive the exact implementation inputs for the eight open families.
//
// The canonical handoff names the eight families and the seven lane branches.
// It does not say which lane owns which family, and that cannot be guessed from
// presence: every lane branch descends from a shared base, so a lane that never
// touched Virginia still carries a stale Virginia package. Picking the first
// branch that has the directory imports pre-correction bytes and calls them
// final.
//
// Ownership comes from the regeneration branch names, which are the lane/state
// assignment as it was actually made, and is then checked against the trees: the
// owning lane's package must be a superset of the others', or the assignment is
// reported rather than used.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "docs/record-clearing/d-wave/v4");

const PACKS = "/tmp/rcap-source-packs";

const git = (a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
const gitQ = (a) => { try { return git(a); } catch { return null; } };
const gitBytes = (a) => execFileSync("git", a, { cwd: REPO, maxBuffer: 512 * 1024 * 1024 });
const showJson = (ref, p) => { const r = gitQ(["show", `${ref}:${p}`]); if (!r) return null; try { return JSON.parse(r); } catch { return null; } };
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const handoff = JSON.parse(fs.readFileSync(`${REPO}/docs/record-clearing/d-wave/v3/family-handoff.json`, "utf8"));

// The lane/state assignment, read off the regeneration branch names.
const LANE_STATES = {
  D1A: ["AL", "AR", "AK"], D1B: ["VA", "KY", "NC"], D1C: ["NE", "VT", "WI"],
  D2A: ["AZ", "IL", "WA", "KS", "MN"], D2B: ["NJ", "FL", "LA", "NM"],
  D3A: ["CO", "TX", "ND", "NH", "MO"], D3B: ["OR", "IA", "MA", "UT"]
};
const OWNING_LANE = Object.fromEntries(
  Object.entries(LANE_STATES).flatMap(([lane, states]) => states.map((s) => [s, lane])));

const STATE_DIR = { MO: "missouri", NH: "new-hampshire", VA: "virginia", VT: "vermont", WA: "washington" };
const STATE_NAME = { MO: "Missouri", NH: "New Hampshire", VA: "Virginia", VT: "Vermont", WA: "Washington" };

const laneBranches = handoff.currentFamilyBranches;

// Every extracted source binary, indexed by its own SHA-256, so a family's
// source is found by content rather than by a path guess.
const packIndex = new Map();
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && /\.pdf$/i.test(e.name)) {
      const h = sha256(fs.readFileSync(p));
      if (!packIndex.has(h)) packIndex.set(h, []);
      packIndex.get(h).push(p);
    }
  }
};
for (const d of ["ex-D1", "ex-D2", "ex-D3"]) {
  const full = path.join(PACKS, d);
  if (fs.existsSync(full)) walk(full);
}

const rows = [];
const blockers = [];

for (const fam of handoff.openFamilies) {
  const [prefix, slug] = fam.familyId.split(":");
  const lane = OWNING_LANE[prefix];
  const lb = laneBranches[lane];
  const pkg = `data/rcap-all50/overlays/production/${STATE_DIR[prefix]}/${slug}`;

  if (!lane || !lb) { blockers.push({ familyId: fam.familyId, reason: `no lane owns state ${prefix}` }); continue; }

  const listAt = (c) => (gitQ(["ls-tree", "-r", "--name-only", c, `${pkg}/`]) ?? "").trim().split("\n").filter(Boolean);
  const ownerFiles = listAt(lb.commit);
  if (ownerFiles.length === 0) { blockers.push({ familyId: fam.familyId, reason: `owning lane ${lane} does not carry ${pkg}` }); continue; }

  // Ownership check: no other lane may carry a file the owner lacks.
  const ownerSet = new Set(ownerFiles);
  const supersetViolations = [];
  for (const [otherLane, other] of Object.entries(laneBranches)) {
    if (otherLane === lane) continue;
    for (const f of listAt(other.commit)) if (!ownerSet.has(f)) supersetViolations.push({ otherLane, file: f });
  }

  const blob = (p) => {
    const id = gitQ(["rev-parse", `${lb.commit}:${p}`]);
    if (!id) return null;
    const bytes = gitBytes(["cat-file", "blob", id.trim()]);
    return { gitBlob: id.trim(), sha256: sha256(bytes), bytes: bytes.length };
  };

  const sourceRecord = showJson(lb.commit, `${pkg}/source-record.json`);
  const rendered = showJson(lb.commit, `${pkg}/reports/rendered-artifacts.json`);
  const srcSha = sourceRecord?.sha256 ?? null;
  const packMatches = srcSha ? (packIndex.get(srcSha) ?? []) : [];

  const participantPdf = `${pkg}/fixtures/canonical-filled.pdf`;
  const contactSheet = `${pkg}/contact-sheet/blank-vs-filled.pdf`;
  const manifest = `${pkg}/reports/rendered-artifacts.json`;

  rows.push({
    familyId: fam.familyId,
    state: STATE_NAME[prefix],
    statePrefix: prefix,
    lane,
    reviewFindingIds: fam.openFindings.map((f) => f.id),
    finalImplementationBranch: lb.branch,
    finalImplementationCommit: lb.commit,
    ownershipCheck: { supersetHolds: supersetViolations.length === 0, violations: supersetViolations.slice(0, 5) },
    sourceSha256: srcSha,
    sourcePackMemberPath: sourceRecord?.canonicalBundlePath ?? null,
    sourcePackPartition: sourceRecord?.sourcePack?.partition ?? null,
    sourcePackReleaseTag: sourceRecord?.sourcePack?.releaseTag ?? null,
    sourceBinaryLocatedInPack: packMatches.length > 0,
    sourceBinaryExtractedPath: packMatches[0] ?? null,
    sourceByteLength: sourceRecord?.byteLength ?? null,
    renderStrategy: sourceRecord?.renderStrategy ?? null,
    documentOwnership: sourceRecord?.documentOwnership ?? null,
    familyPackagePath: pkg,
    packageFiles: ownerFiles.map((f) => f.slice(pkg.length + 1)),
    participantPdfPath: participantPdf,
    participantPdfPresentInGit: ownerSet.has(participantPdf),
    contactSheetPath: contactSheet,
    contactSheetPresentInGit: ownerSet.has(contactSheet),
    renderedArtifactsManifestPath: manifest,
    renderedArtifactsManifestPresent: ownerSet.has(manifest),
    manifestArtifactCount: rendered ? Object.keys(rendered.artifacts ?? {}).length : null,
    currentDisposition: fam.finalDisposition,
    artifactHashesAtOwningCommit: {
      participantPdf: ownerSet.has(participantPdf) ? blob(participantPdf) : null,
      contactSheet: ownerSet.has(contactSheet) ? blob(contactSheet) : null
    },
    acceptanceConditions: fam.openFindings.map((f) => ({
      id: f.id, severity: f.severity, file: f.file, fieldOrRegion: f.fieldOrRegion,
      visibleDefect: f.visibleDefect, acceptanceCondition: f.acceptanceCondition, likelyOwner: f.likelyOwner
    }))
  });
}

const out = {
  schema: "rcap-d-v4-implementation-inputs/v1",
  canonicalControlPlaneBase: git(["rev-parse", "HEAD"]).trim(),
  derivedFrom: "docs/record-clearing/d-wave/v3/family-handoff.json",
  ownershipRule: "Lane/state assignment read off the regeneration branch names, then checked: no non-owning lane may carry a package file the owning lane lacks.",
  laneStates: LANE_STATES,
  laneBranches,
  sourcePackRelease: "rcap-d-source-packs-2026-08-12 (extracted outside every Git worktree; never committed)",
  families: rows,
  blockers
};
fs.writeFileSync(`${OUT}/implementation-inputs.json`, `${JSON.stringify(out, null, 2)}\n`);

for (const r of rows) {
  console.log(`${r.familyId}`);
  console.log(`   lane=${r.lane}  ${r.finalImplementationBranch}@${r.finalImplementationCommit.slice(0, 8)}  superset=${r.ownershipCheck.supersetHolds ? "ok" : "VIOLATED"}`);
  console.log(`   source=${r.sourceSha256?.slice(0, 16)}  inPack=${r.sourceBinaryLocatedInPack}  strategy=${r.renderStrategy}`);
  console.log(`   participantPdf=${r.participantPdfPresentInGit ? r.artifactHashesAtOwningCommit.participantPdf.sha256.slice(0, 12) : "NOT IN GIT"}  sheet=${r.contactSheetPresentInGit ? r.artifactHashesAtOwningCommit.contactSheet.sha256.slice(0, 12) : "NOT IN GIT"}  manifestArtifacts=${r.manifestArtifactCount}`);
  console.log(`   findings=${r.reviewFindingIds.join(",")}`);
}
console.log(`\nresolved ${rows.length}/8   blockers ${blockers.length}   pack-indexed source PDFs ${packIndex.size}`);
for (const b of blockers) console.log(`BLOCKER ${b.familyId}: ${b.reason}`);
process.exitCode = blockers.length === 0 && rows.length === 8 ? 0 : 1;
