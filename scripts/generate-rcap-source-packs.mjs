#!/usr/bin/env node
// Source packs: the official bytes a rerender lane needs, and nothing else.
//
//   node scripts/generate-rcap-source-packs.mjs            # manifests only
//   node scripts/generate-rcap-source-packs.mjs --build    # manifests + ZIPs
//   node scripts/generate-rcap-source-packs.mjs --check
//
// A rerender lane needs the court's own PDFs at their canonical Master Library
// paths. It does not need — and must never be handed — a fixture, a contact
// sheet, a raster, a sample packet or anything else this platform generated: a
// pack containing LegalEase output looks exactly like a pack containing the
// court's form until somebody renders from it, and then every artifact in the
// batch is derived from our own previous output.
//
// So `--build` opens the corpus and hashes what it finds. A source that is
// absent, or that does not hash to what its family's record pins, FAILS the
// pack. Nothing is substituted for it, and a partial pack is not written.
//
// Without --build this emits the manifests only: the specification each pack
// must satisfy, taken from the committed source records — canonical path,
// expected digest, expected byte length, and the form number and revision a
// reviewer should be able to read off the first page. Those are checkable
// without the bytes, and they are what makes a pack verifiable once built.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const build = args.includes("--build");
const checkOnly = args.includes("--check");
const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

const OUT_DIR = "data/rcap-all50/source-packs";
const ZIP_DIR = process.env.RCAP_SOURCE_PACK_OUT ?? path.join(rootDir, "tmp/source-packs");
const HANDOFF = "data/rcap-all50/gate-b-family-rerender-handoff.json";
const OVERLAY = "data/rcap-all50/overlays/production";

/** The mounted Master Library, or null. Never guessed at, never stood in for. */
const corpusRoot = (() => {
  const named = process.env.RCAP_BUNDLE_EXTRACT ?? null;
  if (named && fs.existsSync(named)) return named;
  const inRepo = abs("private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
  if (fs.existsSync(inRepo)) return inRepo;
  return null;
})();

function fail(message) {
  console.error(`FAIL source packs — ${message}`);
  process.exit(1);
}

/** Every family package on disk, keyed by family id. */
function familyPackages() {
  const out = new Map();
  const overlay = abs(OVERLAY);
  for (const state of fs.readdirSync(overlay)) {
    const stateDir = path.join(overlay, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const family of fs.readdirSync(stateDir)) {
      const record = path.join(stateDir, family, "source-record.json");
      if (!fs.existsSync(record)) continue;
      let parsed;
      try { parsed = JSON.parse(fs.readFileSync(record, "utf8")); } catch { continue; }
      const jurisdiction = parsed.jurisdiction ?? state;
      out.set(`${jurisdiction}:${family}`, { dir: path.relative(rootDir, path.join(stateDir, family)), record: parsed });
    }
  }
  return out;
}

const packages = familyPackages();

/**
 * The one entry a pack carries for one family.
 *
 * `pathInArchive` is the canonical STATES/... path, which is where the
 * installer puts the file and where the driver looks for it. Everything else is
 * what the pack has to be checkable against.
 */
function entryFor(familyId) {
  const pkg = packages.get(familyId);
  if (!pkg) return { familyId, error: "no family package on disk" };
  const record = pkg.record;
  const canonical = record.canonicalBundlePath ?? null;
  const pathInArchive = canonical ? canonical.split("Edition_1/")[1] ?? null : null;
  if (!pathInArchive) return { familyId, error: "the family record pins no canonical bundle path" };
  return {
    familyId,
    familyPackagePath: pkg.dir,
    documentId: record.documentId ?? null,
    revision: record.revision ?? null,
    pathInArchive,
    sha256Expected: record.sha256 ?? null,
    byteLengthExpected: record.byteLength ?? null,
    // What a reviewer must be able to read off the first page to know the pack
    // holds the form it claims.
    visibleFormExpectation: [record.documentId, record.revision].filter(Boolean).join(" "),
    officialTitle: record.officialTitle ?? null
  };
}

/** Batches of four to eight, in the order the assignment names them. */
function batch(list, size = 6) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const handoff = readJson(HANDOFF);
const rerenderFamilies = handoff.familiesUnblockedForRerender ?? [];
if (rerenderFamilies.length === 0) fail("the rerender handoff names no families");

// Lane 1 takes the first half, lane 2 the second, each batched at six.
const half = Math.ceil(rerenderFamilies.length / 2);
const LANES = [
  { lane: "family-rerender-lane-1", families: rerenderFamilies.slice(0, half) },
  { lane: "family-rerender-lane-2", families: rerenderFamilies.slice(half) }
];

const packs = [];
for (const { lane, families } of LANES) {
  batch(families).forEach((families_, index) => {
    packs.push({ packId: `${lane}-batch-${String(index + 1).padStart(2, "0")}`, lane, families: families_ });
  });
}

/** Builds one ZIP, or refuses. */
function buildPack(pack, entries) {
  const missing = entries.filter((e) => e.error || !e.sha256Expected);
  if (missing.length) {
    fail(`${pack.packId}: ${missing.length} family(ies) carry no usable source pin — ${missing.map((m) => m.familyId).join(", ")}`);
  }
  const staging = fs.mkdtempSync(path.join(ZIP_DIR, "pack-"));
  const built = [];
  for (const entry of entries) {
    const source = path.join(corpusRoot, entry.pathInArchive);
    if (!fs.existsSync(source)) {
      fail(`${pack.packId}: ${entry.familyId} — the official source is absent at ${entry.pathInArchive}. `
        + "Nothing is substituted for it: a fixture, contact sheet, sample or any other LegalEase output in a source "
        + "pack makes every artifact rendered from it derived from our own previous output.");
    }
    const bytes = fs.readFileSync(source);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== entry.sha256Expected) {
      fail(`${pack.packId}: ${entry.familyId} — the mounted source hashes ${sha256}, the record pins ${entry.sha256Expected}`);
    }
    if (entry.byteLengthExpected && bytes.length !== entry.byteLengthExpected) {
      fail(`${pack.packId}: ${entry.familyId} — ${bytes.length} bytes, the record pins ${entry.byteLengthExpected}`);
    }
    const dest = path.join(staging, entry.pathInArchive);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
    built.push({ ...entry, sha256: sha256, byteLength: bytes.length });
  }
  return { staging, built };
}

const INSTALLER = `#!/usr/bin/env bash
# Installs this pack's official sources where the D1 driver looks for them.
#
#   ./install.sh [target-root]
#
# The default target is the Master Library root this repository's records pin:
#   private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1
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
    src = os.path.join(here, "STATES", entry["pathInArchive"].split("STATES/", 1)[1]) \\
        if entry["pathInArchive"].startswith("STATES/") else os.path.join(here, entry["pathInArchive"])
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
echo "Now: export RCAP_BUNDLE_EXTRACT=\\"$(cd "$target" && pwd)\\""
`;

const manifests = [];
for (const pack of packs) {
  const entries = pack.families.map(entryFor);
  const usable = entries.filter((e) => !e.error);
  const manifest = {
    schemaVersion: "rcap-source-pack/v1",
    packId: pack.packId,
    lane: pack.lane,
    generatedBy: "scripts/generate-rcap-source-packs.mjs",
    assignmentSource: HANDOFF,
    contains: "exact official source PDFs only, at their canonical STATES/... paths",
    containsNo: "no fixture, contact sheet, raster, sample packet, field map, sidecar or any other LegalEase output",
    familyCount: pack.families.length,
    assignmentFamilyMapping: Object.fromEntries(entries.map((e) => [e.familyId, e.pathInArchive ?? null])),
    files: usable.map((e) => ({
      pathInArchive: e.pathInArchive,
      familyId: e.familyId,
      documentId: e.documentId,
      revision: e.revision,
      sha256: e.sha256Expected,
      byteLength: e.byteLengthExpected,
      visibleFormExpectation: e.visibleFormExpectation,
      officialTitle: e.officialTitle
    })),
    unresolved: entries.filter((e) => e.error).map((e) => ({ familyId: e.familyId, why: e.error })),
    built: false,
    zip: null
  };

  if (build) {
    if (!corpusRoot) {
      fail("no Master Library is mounted. Set RCAP_BUNDLE_EXTRACT to the extract root, or mount it at "
        + "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1. This factory does not substitute "
        + "a fixture, contact sheet, sample or any other LegalEase output for an absent official source.");
    }
    fs.mkdirSync(ZIP_DIR, { recursive: true });
    const { staging, built } = buildPack(pack, usable);
    manifest.files = built.map((e) => ({
      pathInArchive: e.pathInArchive, familyId: e.familyId, documentId: e.documentId, revision: e.revision,
      sha256: e.sha256, byteLength: e.byteLength, visibleFormExpectation: e.visibleFormExpectation,
      officialTitle: e.officialTitle
    }));
    fs.writeFileSync(path.join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const installer = path.join(staging, "install.sh");
    fs.writeFileSync(installer, INSTALLER);
    fs.chmodSync(installer, 0o755);
    const zip = path.join(ZIP_DIR, `${pack.packId}.zip`);
    fs.rmSync(zip, { force: true });
    execFileSync("zip", ["-qr", zip, "."], { cwd: staging });
    fs.rmSync(staging, { recursive: true, force: true });
    manifest.built = true;
    manifest.zip = { path: zip, sha256: createHash("sha256").update(fs.readFileSync(zip)).digest("hex"),
      byteLength: fs.statSync(zip).size };
  }
  manifests.push(manifest);
}

const index = {
  schemaVersion: "rcap-source-pack-index/v1",
  generatedBy: "scripts/generate-rcap-source-packs.mjs",
  purpose: "One pack per rerender batch: the court's own PDFs at their canonical paths, with the digest, byte length "
    + "and visible form expectation each must satisfy.",
  corpusMounted: Boolean(corpusRoot),
  corpusRoot: corpusRoot ? path.relative(rootDir, corpusRoot) : null,
  zipsBuilt: manifests.filter((m) => m.built).length,
  whyNotBuilt: corpusRoot ? null
    : "no Master Library is mounted in this environment, so no ZIP was written. The manifests below are the "
      + "specification each pack must satisfy; run this generator with --build in a corpus-mounted container.",
  refusalRule: "a source that is absent, or that does not hash to what its family's record pins, fails its pack. "
    + "Nothing is substituted: a fixture, contact sheet, sample or other LegalEase output inside a source pack makes "
    + "every artifact rendered from it derived from our own previous output.",
  packs: manifests.map((m) => ({
    packId: m.packId, lane: m.lane, familyCount: m.familyCount,
    files: m.files.length, unresolved: m.unresolved.length, built: m.built,
    zip: m.zip ? { sha256: m.zip.sha256, byteLength: m.zip.byteLength } : null
  }))
};

function writeJson(rel, value) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === json) return;
  if (checkOnly) { console.error(`FAIL source packs — ${rel} is stale; re-run this generator`); process.exit(1); }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, json);
}

for (const manifest of manifests) writeJson(`${OUT_DIR}/${manifest.packId}.manifest.json`, manifest);
writeJson(`${OUT_DIR}/index.json`, index);

const files = manifests.reduce((n, m) => n + m.files.length, 0);
const unresolved = manifests.reduce((n, m) => n + m.unresolved.length, 0);
console.log(
  `OK source packs — ${manifests.length} packs over ${rerenderFamilies.length} assigned families, ` +
  `${files} official sources specified, ${unresolved} unresolved, ` +
  (corpusRoot ? `${index.zipsBuilt} ZIP(s) built from ${index.corpusRoot}` : "0 ZIPs: no Master Library mounted")
);
