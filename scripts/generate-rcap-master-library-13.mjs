#!/usr/bin/env node
// Materialise the thirteen sources the Master Library already holds.
//
//   node scripts/generate-rcap-master-library-13.mjs           # manifests + receipts
//   node scripts/generate-rcap-master-library-13.mjs --build   # + ZIPs, + install proof
//   node scripts/generate-rcap-master-library-13.mjs --check
//
// The captain's source-population reconciliation splits 37 source-required
// assets by state. Thirteen are `packable_from_master_library`: their bytes are
// already in the Edition 1 extract, at a canonical path, under the digest their
// own family record pins. They need no publisher, no search and no external
// fetch — only a mounted corpus and a hash.
//
// This selects exactly those thirteen, twice and independently: from the
// captain's record, which is the authority, and from the family packages in
// this repository. The two must name the same set. If they diverge, something
// changed under one of them and the run stops rather than materialising a set
// nobody agreed on.
//
// `--build` is the only step that touches bytes. It hashes each file where the
// library says it is, requires equality with the pinned digest AND the pinned
// byte length, writes a deterministic ZIP to a git-ignored path, then installs
// that ZIP into a clean temporary repository and re-hashes every file it placed.
// A source that is absent, or that hashes to anything else, fails its pack.
// Nothing is substituted for it and a partial pack is never written.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const build = args.includes("--build");
const checkOnly = args.includes("--check");
const abs = (rel) => path.join(rootDir, rel);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Pinned commits, not branch names: a branch tip moves, and the selection this
// emits has to be reproducible from the same two objects tomorrow.
const CAPTAIN = "cac375845afa396c79ad8003b90250e743e289a1";
const ASSIGNMENTS = "40900689597a6ac9baff0ab22cde2a2518a97534";
const RECONCILIATION = "data/rcap-all50/source-population-reconciliation.json";
const OUT_DIR = "data/rcap-all50/source-packs";
const OVERLAY = "data/rcap-all50/overlays/production";
const ZIP_DIR = process.env.RCAP_SOURCE_PACK_OUT ?? path.join(rootDir, "tmp/source-packs");
const STATE = "packable_from_master_library";

function fail(message) {
  console.error(`FAIL master-library-13 - ${message}`);
  process.exit(1);
}

function gitBlob(commit, relPath) {
  try { return execFileSync("git", ["cat-file", "blob", `${commit}:${relPath}`], { cwd: rootDir, maxBuffer: 1 << 30 }); }
  catch { return null; }
}

const corpusRoot = (() => {
  const named = process.env.RCAP_BUNDLE_EXTRACT ?? null;
  if (named && fs.existsSync(named)) return named;
  const inRepo = abs("private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
  if (fs.existsSync(inRepo)) return inRepo;
  return null;
})();

// --- the two independent selections ----------------------------------------

const captainBlob = gitBlob(CAPTAIN, RECONCILIATION);
if (!captainBlob) fail(`the captain's reconciliation is not readable at ${CAPTAIN}:${RECONCILIATION}`);
const captain = JSON.parse(captainBlob.toString("utf8"));
const captainRows = (captain.assets ?? []).filter((a) => a.state === STATE);
const declared = captain.totals?.byState?.[STATE] ?? null;
if (captainRows.length !== declared) {
  fail(`the captain's record declares ${declared} ${STATE} assets and lists ${captainRows.length}`);
}

const HEX = /^[0-9a-f]{64}$/;

/**
 * The same question asked of this repository's own family packages.
 *
 * A family with no v2 pin but a bundle reconciliation matched by sha256 has its
 * bytes in the library at a named path, under the digest it already pins. That
 * is what "packable from the Master Library" means structurally, and deriving it
 * here rather than trusting the captain's list alone is what makes a divergence
 * visible instead of silent.
 */
function derivedFromFamilyPackages() {
  const out = new Map();
  const overlay = abs(OVERLAY);
  for (const state of fs.readdirSync(overlay)) {
    const stateDir = path.join(overlay, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const family of fs.readdirSync(stateDir)) {
      const familyDir = path.join(stateDir, family);
      const record = path.join(familyDir, "source-record.json");
      if (!fs.existsSync(record)) continue;
      if (fs.existsSync(path.join(familyDir, "retirement.json"))) continue;
      let parsed;
      try { parsed = JSON.parse(fs.readFileSync(record, "utf8")); } catch { continue; }
      if (parsed.canonicalBundlePath && HEX.test(String(parsed.sha256))) continue;
      const reconciliation = parsed.bundleReconciliation ?? {};
      if (!reconciliation.bundlePath || reconciliation.matchedBy !== "sha256") continue;
      if (!HEX.test(String(parsed.expectedSha256))) continue;
      out.set(`${parsed.jurisdiction ?? state}:${family}`, {
        dir: `${state}/${family}`,
        record: parsed,
        reconciliation
      });
    }
  }
  return out;
}

const derived = derivedFromFamilyPackages();
const captainFamilies = captainRows.map((r) => r.familyId).sort();
const derivedFamilies = [...derived.keys()].sort();
if (JSON.stringify(captainFamilies) !== JSON.stringify(derivedFamilies)) {
  const onlyCaptain = captainFamilies.filter((f) => !derived.has(f));
  const onlyDerived = derivedFamilies.filter((f) => !captainFamilies.includes(f));
  fail("the captain's selection and this repository's family packages name different sets - "
    + `only in the captain's record: ${onlyCaptain.join(", ") || "none"}; `
    + `only in the family packages: ${onlyDerived.join(", ") || "none"}`);
}

// --- owning lane ------------------------------------------------------------

const LANE_FILES = ["family-rerender-1", "family-rerender-2", "evidence-sidecars", "evidence-visual",
  "source-direct", "source-resolution", "retirement-repoint"];
const owningLane = new Map();
for (const id of LANE_FILES) {
  const blob = gitBlob(ASSIGNMENTS, `data/rcap-all50/gate-b-assignments/${id}.json`);
  if (!blob) continue;
  const assignment = JSON.parse(blob.toString("utf8"));
  for (const familyId of assignment.familyIds ?? []) {
    if (!owningLane.has(familyId)) owningLane.set(familyId, []);
    owningLane.get(familyId).push(id);
  }
}

// --- the thirteen -----------------------------------------------------------

const assets = captainRows
  .map((row) => {
    const entry = derived.get(row.familyId);
    const pinnedFromAssetId = String(row.assetId).split("|")[2] ?? null;
    const pinned = entry.record.expectedSha256;
    if (pinnedFromAssetId && pinnedFromAssetId !== pinned) {
      fail(`${row.familyId}: the asset id pins ${pinnedFromAssetId} and the family record pins ${pinned}`);
    }
    const bundlePath = entry.reconciliation.bundlePath;
    const pathInArchive = bundlePath.split("Edition_1/")[1] ?? bundlePath;
    return {
      assetId: row.assetId,
      familyId: row.familyId,
      jurisdiction: row.jurisdiction,
      formId: row.formId,
      familyPackagePath: `${OVERLAY}/${entry.dir}`,
      pathInArchive,
      documentId: entry.reconciliation.documentId ?? null,
      revision: entry.reconciliation.revision ?? null,
      language: entry.reconciliation.language ?? null,
      assetClass: entry.reconciliation.assetClass ?? null,
      sha256: pinned,
      byteLength: entry.reconciliation.bundleBytes ?? null,
      visibleFormExpectation: [entry.reconciliation.documentId, entry.reconciliation.revision].filter(Boolean).join(" ") || null,
      owningLanes: owningLane.get(row.familyId) ?? [],
      lanesReporting: [...new Set(row.lanesReporting ?? [])],
      binaryPresentInClone: row.binaryPresentInClone === true
    };
  })
  .sort((a, b) => a.assetId.localeCompare(b.assetId));

if (assets.length !== 13) fail(`expected thirteen assets, resolved ${assets.length}`);
for (const asset of assets) {
  if (!HEX.test(asset.sha256)) fail(`${asset.familyId} carries no usable pinned digest`);
  if (!Number.isInteger(asset.byteLength) || asset.byteLength <= 0) fail(`${asset.familyId} carries no pinned byte length`);
  if (asset.binaryPresentInClone) fail(`${asset.familyId} is marked present in the clone; this factory packs library bytes`);
}

/** Four to eight per pack, spread evenly rather than sliced. */
function batchEvenly(list, min = 4, max = 8) {
  if (list.length <= min) return [list];
  const count = Math.ceil(list.length / max);
  const base = Math.floor(list.length / count);
  const extra = list.length % count;
  const out = [];
  let at = 0;
  for (let i = 0; i < count; i += 1) {
    const size = base + (i < extra ? 1 : 0);
    out.push(list.slice(at, at + size));
    at += size;
  }
  return out;
}

const packs = batchEvenly(assets).map((members, index) => ({
  packId: `master-library-13-batch-${String(index + 1).padStart(2, "0")}`,
  members
}));

// --- ignored output, proven -------------------------------------------------

function ignoredOutputStatus(dir) {
  const relative = path.relative(rootDir, dir);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { path: dir, insideRepository: false, ignoredByGit: null,
      basis: "the output path is outside this repository, so git tracks nothing there" };
  }
  let ignored = false;
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", path.join(relative, "probe.zip")], { cwd: rootDir, stdio: "ignore" });
    ignored = true;
  } catch { ignored = false; }
  return { path: relative, insideRepository: true, ignoredByGit: ignored,
    basis: ignored ? "git check-ignore refuses to track a .zip written here"
      : "git would TRACK a .zip written here - official court PDFs must not enter the index" };
}
const ignoredOutput = ignoredOutputStatus(ZIP_DIR);

const INSTALLER = `#!/usr/bin/env bash
# Installs this pack's official sources where the D1 driver looks for them.
#
#   ./install.sh [target-root]
#
# Every file is verified against manifest.json before it is placed. A file that
# does not hash to what the manifest says is not installed and the run fails:
# a source pack whose bytes were substituted is worse than no pack at all.
set -euo pipefail
here="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
target="\${1:-private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1}"
mkdir -p "$target"
python3 - "$here" "$target" <<'PY'
import hashlib, json, os, shutil, sys
here, target = sys.argv[1], sys.argv[2]
manifest = json.load(open(os.path.join(here, "manifest.json")))
for entry in manifest["files"]:
    src = os.path.join(here, entry["pathInArchive"])
    if not os.path.exists(src):
        raise SystemExit("FAIL %s is not in this pack" % entry["pathInArchive"])
    got = hashlib.sha256(open(src, "rb").read()).hexdigest()
    if got != entry["sha256"]:
        raise SystemExit("FAIL %s hashes %s, manifest says %s" % (entry["pathInArchive"], got, entry["sha256"]))
    dest = os.path.join(target, entry["pathInArchive"])
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copyfile(src, dest)
    print("installed", entry["pathInArchive"])
print("OK %d official source(s) installed under %s" % (len(manifest["files"]), target))
PY
`;

/** Hashes each source where the library says it is, or refuses. */
function materialize(pack) {
  const built = [];
  const staging = fs.mkdtempSync(path.join(ZIP_DIR, "pack-"));
  for (const asset of pack.members) {
    const source = path.join(corpusRoot, asset.pathInArchive);
    if (!fs.existsSync(source)) {
      fail(`${pack.packId}: ${asset.familyId} - the official source is absent at ${asset.pathInArchive}. `
        + "Nothing is substituted for it.");
    }
    const bytes = fs.readFileSync(source);
    const observed = sha256(bytes);
    if (observed !== asset.sha256) {
      fail(`${pack.packId}: ${asset.familyId} - the library copy hashes ${observed}, the asset pins ${asset.sha256}`);
    }
    if (bytes.length !== asset.byteLength) {
      fail(`${pack.packId}: ${asset.familyId} - ${bytes.length} bytes, the asset pins ${asset.byteLength}`);
    }
    const dest = path.join(staging, asset.pathInArchive);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
    built.push({ ...asset, observedSha256: observed, observedByteLength: bytes.length });
  }
  return { staging, built };
}

/**
 * Installs a built pack into a clean temporary repository and re-hashes it.
 *
 * The manifest says what the pack should hold and the installer checks that
 * before it copies. This checks the other end: that what landed on disk in a
 * directory nothing else has touched still hashes to the pinned identity. A pack
 * that verifies inside its own archive and not after installation is a pack that
 * would be installed wrong exactly once, in the lane that needed it.
 */
function installAndRehash(zipPath, expected) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-ml13-install-"));
  const opened = path.join(scratch, "pack");
  const target = path.join(scratch, "clean-repo");
  fs.mkdirSync(opened, { recursive: true });
  fs.mkdirSync(target, { recursive: true });
  execFileSync("unzip", ["-qq", zipPath, "-d", opened]);
  execFileSync("bash", [path.join(opened, "install.sh"), target], { stdio: "pipe" });
  const rehashed = [];
  for (const asset of expected) {
    const placed = path.join(target, asset.pathInArchive);
    if (!fs.existsSync(placed)) fail(`install: ${asset.pathInArchive} did not land in the clean repository`);
    const bytes = fs.readFileSync(placed);
    const observed = sha256(bytes);
    if (observed !== asset.sha256 || bytes.length !== asset.byteLength) {
      fail(`install: ${asset.pathInArchive} re-hashes ${observed} at ${bytes.length} bytes after installation`);
    }
    rehashed.push({ pathInArchive: asset.pathInArchive, sha256: observed, byteLength: bytes.length });
  }
  fs.rmSync(scratch, { recursive: true, force: true });
  return rehashed;
}

if (build && ignoredOutput.insideRepository && ignoredOutput.ignoredByGit === false) {
  fail(`${ignoredOutput.path} is not git-ignored; official court PDFs must not enter the index`);
}

const manifests = [];
for (const pack of packs) {
  const manifest = {
    schemaVersion: "rcap-source-pack/v2",
    packId: pack.packId,
    lane: "master-library-13",
    lanePurpose: "the thirteen source-required assets whose bytes the Edition 1 Master Library already holds - "
      + "no publisher, no search, no external fetch, only a mounted corpus and a hash",
    generatedBy: "scripts/generate-rcap-master-library-13.mjs",
    selectedFrom: { captainReconciliation: `${CAPTAIN}:${RECONCILIATION}`, state: STATE,
      confirmedIndependentlyFrom: `${OVERLAY}/*/*/source-record.json` },
    contains: "exact official source PDFs only, at their canonical STATES/... paths",
    containsNo: "no fixture, contact sheet, raster, sample packet, field map, sidecar or any other LegalEase output",
    isIgnoredOutput: "the built ZIP is written to a git-ignored path and is never committed. This manifest is the "
      + "committed half: it is what a built pack is verified against.",
    assetCount: pack.members.length,
    assignmentFamilyMapping: Object.fromEntries(pack.members.map((a) => [a.familyId, a.pathInArchive])),
    files: pack.members.map((a) => ({
      pathInArchive: a.pathInArchive, assetId: a.assetId, familyId: a.familyId, documentId: a.documentId,
      revision: a.revision, language: a.language, assetClass: a.assetClass,
      sha256: a.sha256, byteLength: a.byteLength, visibleFormExpectation: a.visibleFormExpectation
    })),
    built: false,
    zip: null,
    installProof: null
  };

  if (build) {
    if (!corpusRoot) {
      fail("no Master Library is mounted. Set RCAP_BUNDLE_EXTRACT to the extract root, or mount it at "
        + "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1.");
    }
    fs.mkdirSync(ZIP_DIR, { recursive: true });
    const { staging, built: builtFiles } = materialize(pack);
    fs.writeFileSync(path.join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const installer = path.join(staging, "install.sh");
    fs.writeFileSync(installer, INSTALLER);
    fs.chmodSync(installer, 0o755);
    const zip = path.join(ZIP_DIR, `${pack.packId}.zip`);
    fs.rmSync(zip, { force: true });
    execFileSync("zip", ["-qrX", zip, "."], { cwd: staging });
    fs.rmSync(staging, { recursive: true, force: true });
    manifest.built = true;
    manifest.zip = { path: path.relative(rootDir, zip), sha256: sha256(fs.readFileSync(zip)),
      byteLength: fs.statSync(zip).size };
    manifest.installProof = {
      installedIntoACleanTemporaryRepository: true,
      filesRehashedAfterInstallation: installAndRehash(zip, builtFiles).length,
      basis: "the pack was unzipped into an empty directory, install.sh verified every file against manifest.json "
        + "before placing it, and every placed file was re-hashed against the pinned identity afterwards"
    };
  }
  manifests.push(manifest);
}

const receipts = {
  schemaVersion: "rcap-master-library-13-receipts/v1",
  generatedBy: "scripts/generate-rcap-master-library-13.mjs",
  purpose: "One receipt per asset the Master Library already holds: what it is, where it lives, the identity it must "
    + "satisfy, and whether the bytes were hashed here.",
  selection: {
    captainReconciliation: `${CAPTAIN}:${RECONCILIATION}`,
    state: STATE,
    declaredByTheCaptain: declared,
    resolved: assets.length,
    confirmedIndependently: "the same thirteen families were derived from this repository's own source records - a "
      + "family with no v2 pin whose bundle reconciliation matched by sha256. The two selections are identical; a "
      + "divergence fails this generator rather than materialising a set nobody agreed on.",
    excludedStates: Object.fromEntries(Object.entries(captain.totals?.byState ?? {}).filter(([k]) => k !== STATE))
  },
  equalityRequirement: "a library copy is accepted only when its SHA-256 equals the digest the asset id and the family "
    + "record both pin AND its byte length equals the reconciliation's bundleBytes. Either mismatch fails the pack, "
    + "and a partial pack is never written.",
  corpusMounted: Boolean(corpusRoot),
  bytesHashedHere: Boolean(corpusRoot && build),
  whyNot: corpusRoot ? null
    : "no Master Library is mounted in the environment that generated this file, so no byte was read and no digest "
      + "was recomputed. Every digest below is the pinned identity carried forward from the asset id and the family "
      + "record, which is what a build must reproduce - not evidence that it did.",
  noExternalAcquisition: "no publisher was contacted and no URL was resolved. Every asset here is packable from the "
    + "library alone; that is the whole basis for its state.",
  assets: assets.map((a) => ({
    assetId: a.assetId, familyId: a.familyId, jurisdiction: a.jurisdiction, formId: a.formId,
    familyPackagePath: a.familyPackagePath, pathInArchive: a.pathInArchive,
    pinnedSha256: a.sha256, pinnedByteLength: a.byteLength,
    visibleFormExpectation: a.visibleFormExpectation,
    pack: packs.find((p) => p.members.includes(a)).packId,
    owningLanes: a.owningLanes, lanesReporting: a.lanesReporting,
    materializedHere: Boolean(corpusRoot && build)
  }))
};

const handoffs = {
  schemaVersion: "rcap-master-library-13-handoffs/v1",
  generatedBy: "scripts/generate-rcap-master-library-13.mjs",
  purpose: "Which lane receives each materialised source, so a built pack has somewhere to go.",
  assignmentsReadFrom: `${ASSIGNMENTS}:data/rcap-all50/gate-b-assignments/`,
  byLane: Object.fromEntries(
    [...new Set(assets.flatMap((a) => a.owningLanes.length ? a.owningLanes : ["unassigned"]))]
      .sort()
      .map((lane) => [lane, assets
        .filter((a) => (a.owningLanes.length ? a.owningLanes : ["unassigned"]).includes(lane))
        .map((a) => ({ assetId: a.assetId, familyId: a.familyId, pathInArchive: a.pathInArchive,
          pack: packs.find((p) => p.members.includes(a)).packId }))])
  ),
  whatALaneDoesWithIt: "install the pack with its install.sh, export RCAP_BUNDLE_EXTRACT to the install root, then "
    + "run the lane's own generator. The pack carries official bytes only; nothing in it is LegalEase output."
};

function writeJson(rel, value) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === json) return;
  if (checkOnly) { console.error(`FAIL master-library-13 - ${rel} is stale; re-run this generator`); process.exit(1); }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, json);
}

for (const manifest of manifests) writeJson(`${OUT_DIR}/${manifest.packId}.manifest.json`, manifest);
writeJson(`${OUT_DIR}/master-library-13-receipts.json`, receipts);
writeJson(`${OUT_DIR}/master-library-13-handoffs.json`, handoffs);

console.log(
  `OK master-library-13 - ${assets.length} assets over ${manifests.length} packs, `
  + `selection confirmed against ${CAPTAIN.slice(0, 8)} and this repository's family records, `
  + (corpusRoot && build
    ? `${manifests.filter((m) => m.built).length} ZIP(s) built and install-verified from ${path.relative(rootDir, corpusRoot)}`
    : "0 ZIPs: no Master Library mounted, so no byte was hashed here")
);
