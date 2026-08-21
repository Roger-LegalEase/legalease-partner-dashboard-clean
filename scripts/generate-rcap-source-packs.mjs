#!/usr/bin/env node
// Source packs: the official bytes a lane needs, and nothing else.
//
//   node scripts/generate-rcap-source-packs.mjs            # manifests only
//   node scripts/generate-rcap-source-packs.mjs --build    # manifests + ZIPs
//   node scripts/generate-rcap-source-packs.mjs --check
//
// A lane needs the court's own PDFs at their canonical Master Library paths. It
// does not need — and must never be handed — a fixture, a contact sheet, a
// raster, a sample packet or anything else this platform generated: a pack
// containing LegalEase output looks exactly like a pack containing the court's
// form until somebody renders from it, and then every artifact in the batch is
// derived from our own previous output.
//
// So `--build` opens the corpus and hashes what it finds. A source that is
// absent, or that does not hash to what its family's record pins, FAILS the
// pack. Nothing is substituted for it, and a partial pack is not written.
//
// The packs are ignored output. Official court PDFs are large and are not this
// repository's to redistribute, so the ZIPs are written to a path this script
// proves is git-ignored before it writes anything there. What gets committed is
// the manifest: the specification each pack must satisfy — canonical path,
// expected digest, expected byte length, and the form number and revision a
// reviewer should be able to read off the first page. Those are checkable
// without the bytes, and they are what makes a built pack verifiable.
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
const ASSIGNMENTS = "data/rcap-all50/gate-b-assignments";
const REVIEWS = "data/rcap-all50/pdf-independent-reviews";
const OVERLAY = "data/rcap-all50/overlays/production";
const REGISTER = "data/rcap-all50/problematic-pdf-register.json";

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

/**
 * Ignored output, proven rather than assumed.
 *
 * A source pack holds official court PDFs. They are not ours to commit, they are
 * large, and a pack that lands in the index once is in the history forever. So
 * the output path is checked against the repository's own ignore rules before a
 * single byte is written, and a path git would track fails the run.
 */
function ignoredOutputStatus(dir) {
  const relative = path.relative(rootDir, dir);
  const outside = relative.startsWith("..") || path.isAbsolute(relative);
  if (outside) {
    return { path: dir, insideRepository: false, ignoredByGit: null,
      basis: "the output path is outside this repository, so git tracks nothing there" };
  }
  const probe = path.join(relative, "probe.zip");
  let ignored = false;
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", probe], { cwd: rootDir, stdio: "ignore" });
    ignored = true;
  } catch { ignored = false; }
  return { path: relative, insideRepository: true, ignoredByGit: ignored,
    basis: ignored ? "git check-ignore refuses to track a .zip written here"
      : "git would TRACK a .zip written here — official court PDFs must not enter the index" };
}

/** Every family package on disk, keyed by family id. */
function familyPackages() {
  const out = new Map();
  const overlay = abs(OVERLAY);
  for (const state of fs.readdirSync(overlay)) {
    const stateDir = path.join(overlay, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const family of fs.readdirSync(stateDir)) {
      const familyDir = path.join(stateDir, family);
      const record = path.join(familyDir, "source-record.json");
      if (!fs.existsSync(record)) continue;
      let parsed;
      try { parsed = JSON.parse(fs.readFileSync(record, "utf8")); } catch { continue; }
      const jurisdiction = parsed.jurisdiction ?? state;
      out.set(`${jurisdiction}:${family}`, {
        dir: path.relative(rootDir, familyDir),
        record: parsed,
        retired: fs.existsSync(path.join(familyDir, "retirement.json"))
      });
    }
  }
  return out;
}

const packages = familyPackages();

/**
 * What a reviewer must be able to read off the first page.
 *
 * Half the source records carry a null documentId and a null revision, but the
 * canonical filename never does: the library names every asset
 * `JUR__CLASS__DOC-ID__slug__REV-YYYY-MM__LANG.pdf`. Parsing it recovers the
 * expectation for families whose record left the field empty, and it is the same
 * string either way for families whose record filled it in.
 */
function canonicalNameFacts(pathInArchive) {
  const base = path.basename(pathInArchive ?? "", ".pdf");
  const parts = base.split("__");
  if (parts.length < 4) return {};
  const [jurisdiction, assetClass, documentId, slug, ...rest] = parts;
  const revision = rest.find((p) => /^REV-/i.test(p)) ?? null;
  const language = rest.find((p) => /^[A-Z]{2}$/.test(p)) ?? null;
  return { jurisdiction, assetClass, documentId, titleSlug: slug, revision, language };
}

const HEX_DIGEST = /^[0-9a-f]{64}$/;

/**
 * Where a family's official source lives in the Master Library, or null.
 *
 * Two record schemas are in play. A v2 record states the canonical path and the
 * digest at the top level. A v1 record does not — but its bundle reconciliation
 * does, and when that reconciliation matched `matchedBy: "sha256"` the pinned
 * digest IS the library asset's digest. Reading only the v2 shape treats a
 * v1-recorded family as having no source at all, which is wrong: the bytes are
 * in the library, at a named path, under a digest a build can check.
 *
 * A reconciliation that matched some other way, or that carries no usable
 * digest, yields null. Guessing at a path is exactly the substitution this
 * factory exists to refuse.
 */
function sourcePinOf(record) {
  const canonical = record.canonicalBundlePath ?? null;
  if (canonical && HEX_DIGEST.test(String(record.sha256))) {
    return {
      pathInArchive: canonical.split("Edition_1/")[1] ?? canonical,
      sha256: record.sha256,
      byteLength: record.byteLength ?? null,
      documentId: record.documentId ?? null,
      revision: record.revision ?? null,
      language: record.language ?? null,
      officialTitle: record.officialTitle ?? null,
      pinBasis: "source-record.canonicalBundlePath"
    };
  }
  const reconciliation = record.bundleReconciliation ?? {};
  if (reconciliation.bundlePath && reconciliation.matchedBy === "sha256"
      && HEX_DIGEST.test(String(record.expectedSha256))) {
    return {
      pathInArchive: reconciliation.bundlePath.split("Edition_1/")[1] ?? reconciliation.bundlePath,
      sha256: record.expectedSha256,
      byteLength: reconciliation.bundleBytes ?? null,
      documentId: reconciliation.documentId ?? null,
      revision: reconciliation.revision ?? null,
      language: reconciliation.language ?? null,
      officialTitle: record.officialTitle ?? null,
      pinBasis: "source-record.bundleReconciliation, matched by sha256"
    };
  }
  return null;
}

/**
 * The one entry a pack carries for one family.
 *
 * `pathInArchive` is the canonical STATES/... path, which is where the installer
 * puts the file and where the driver looks for it. Everything else is what the
 * pack has to be checkable against.
 */
function entryFor(familyId) {
  const pkg = packages.get(familyId);
  if (!pkg) return { familyId, error: "no family package on disk" };
  const pin = sourcePinOf(pkg.record);
  if (!pin) return { familyId, error: "the family record pins no canonical Master Library path and digest" };
  const facts = canonicalNameFacts(pin.pathInArchive);
  const documentId = pin.documentId ?? facts.documentId ?? null;
  const revision = pin.revision ?? facts.revision ?? null;
  return {
    familyId,
    familyPackagePath: pkg.dir,
    documentId,
    revision,
    language: pin.language ?? facts.language ?? null,
    assetClass: facts.assetClass ?? null,
    pathInArchive: pin.pathInArchive,
    sha256Expected: pin.sha256,
    byteLengthExpected: pin.byteLength,
    pinBasis: pin.pinBasis,
    visibleFormExpectation: [documentId, revision].filter(Boolean).join(" ") || null,
    officialTitle: pin.officialTitle ?? facts.titleSlug?.replace(/-/g, " ") ?? null
  };
}

/**
 * Batches of four to eight, as the assignment requires.
 *
 * Slicing at a fixed width leaves whatever remainder it leaves — nine families
 * become six and three, and a batch of three is not a batch this assignment
 * accepts. So the count is chosen first, from the eight-family ceiling, and the
 * families are spread evenly across it. A population smaller than the floor is
 * one batch, because there is nothing to spread.
 */
function batchEvenly(list, min = 4, max = 8) {
  if (list.length === 0) return [];
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

// ---------------------------------------------------------------------------
// Lane membership, derived from committed assignment records only.

/**
 * The two rerender lanes, exactly as the current assignments name them.
 *
 * The lane split is not ours to compute. An earlier factory read one handoff and
 * cut it in half, which silently re-derived membership every time the handoff
 * moved. The assignment files are the record of who owns what, so each lane is
 * read from its own file and packed as written — no half-split, no re-balancing,
 * and nothing packed for a lane that was not assigned it.
 */
/** Every non-retired family whose source is pinned to the Master Library. */
const pinnedFamilies = [...packages.entries()]
  .filter(([, pkg]) => !pkg.retired && sourcePinOf(pkg.record))
  .map(([familyId]) => familyId)
  .sort();

const laneAssignment = (id) => {
  const a = readJson(`${ASSIGNMENTS}/${id}.json`);
  if (!Array.isArray(a.familyIds) || a.familyIds.length === 0) fail(`${id} names no families`);
  return a;
};

const rerender1 = laneAssignment("family-rerender-1");
const rerender2 = laneAssignment("family-rerender-2");

const overlap = rerender1.familyIds.filter((f) => rerender2.familyIds.includes(f));
if (overlap.length) fail(`the two rerender lanes share ${overlap.length} family: ${overlap.join(", ")}`);

const LANES = [
  {
    lane: "family-rerender-lane-1",
    families: [...rerender1.familyIds].sort(),
    assignmentSource: `${ASSIGNMENTS}/family-rerender-1.json`,
    purpose: "the families family-rerender lane 1 re-renders against the shared corrections"
  },
  {
    lane: "family-rerender-lane-2",
    families: [...rerender2.familyIds].sort(),
    assignmentSource: `${ASSIGNMENTS}/family-rerender-2.json`,
    purpose: "the families family-rerender lane 2 re-renders against the shared corrections"
  }
];

const packs = [];
for (const lane of LANES) {
  batchEvenly(lane.families).forEach((families, index) => {
    packs.push({
      packId: `${lane.lane}-batch-${String(index + 1).padStart(2, "0")}`,
      lane: lane.lane,
      assignmentSource: lane.assignmentSource,
      lanePurpose: lane.purpose,
      families
    });
  });
}

// ---------------------------------------------------------------------------
// The population that cannot be packed at all.

/**
 * A family with no canonical Master Library path has no bytes to pack. It is an
 * acquisition target, and naming it here is the difference between a factory
 * that covered everything it could and one that quietly stopped at the easy
 * families.
 */
const sourceRequiredFamilies = [...packages.entries()]
  .filter(([, pkg]) => !pkg.retired && !sourcePinOf(pkg.record))
  .map(([familyId, pkg]) => {
    const reconciliation = pkg.record.bundleReconciliation ?? {};
    const candidates = reconciliation.supersedingCandidatesByDocumentId ?? [];
    return {
      familyId,
      jurisdiction: pkg.record.jurisdiction ?? null,
      fileName: pkg.record.fileName ?? null,
      isPdf: pkg.record.isPdf ?? null,
      lifecycleClassification: reconciliation.lifecycleClassification ?? null,
      supersedingCandidates: candidates.length,
      whyNotPackable: candidates.length
        ? "the pinned hash appears in no Edition 1 asset; a superseding candidate exists but re-pinning is a "
          + "legal-design decision, and packing the candidate would substitute a different document for this one"
        : "the pinned hash appears in no Edition 1 asset and no superseding candidate was identified"
    };
  })
  .sort((a, b) => a.familyId.localeCompare(b.familyId));

const register = readJson(REGISTER);

/**
 * How many of the register's missing-binary assets this factory can nonetheless
 * pack. Their local pinned copy is absent from the clone, which is what the
 * register counts, but their bundle reconciliation names a library asset matched
 * by sha256 — so the official bytes exist at a canonical path under a digest a
 * build can check, and acquiring them from a publisher would be redundant.
 */
const reconciledFromTheRegisterPopulation = [...packages.entries()]
  .filter(([, pkg]) => !pkg.retired && pkg.record.binaryPresent !== true
    && sourcePinOf(pkg.record)?.pinBasis === "source-record.bundleReconciliation, matched by sha256")
  .length;

// ---------------------------------------------------------------------------

/** Builds one ZIP, or refuses. */
/**
 * One fixed timestamp across a staged tree, so a ZIP built from the same sources
 * hashes the same. Chosen well after the DOS 1980 epoch that ZIP entry times use.
 */
const FIXED_MTIME = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
function stampFixedMtime(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) stampFixedMtime(target);
    fs.utimesSync(target, FIXED_MTIME, FIXED_MTIME);
  }
  fs.utimesSync(dir, FIXED_MTIME, FIXED_MTIME);
}

function buildPack(pack, entries, stagingRoot) {
  const staging = fs.mkdtempSync(path.join(stagingRoot, "pack-"));
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
    built.push({ ...entry, sha256, byteLength: bytes.length });
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
echo "Now: export RCAP_BUNDLE_EXTRACT=\\"$(cd "$target" && pwd)\\""
`;

const ignoredOutput = ignoredOutputStatus(ZIP_DIR);
if (build && ignoredOutput.insideRepository && ignoredOutput.ignoredByGit === false) {
  fail(`${ignoredOutput.path} is not git-ignored. A source pack holds official court PDFs; they are not this `
    + "repository's to commit and a pack that lands in the index once is in the history forever. Add an ignore "
    + "rule for that path, or point RCAP_SOURCE_PACK_OUT somewhere outside the repository.");
}

const manifests = [];
for (const pack of packs) {
  const entries = pack.families.map(entryFor);
  const usable = entries.filter((e) => !e.error);
  // Two family rows can name the same official asset — a legacy filename row and
  // the built family that superseded it both resolve to one library file. The
  // pack carries that file once; the mapping still names both families.
  const distinctFiles = [];
  const seenPaths = new Set();
  for (const entry of usable) {
    if (seenPaths.has(entry.pathInArchive)) continue;
    seenPaths.add(entry.pathInArchive);
    distinctFiles.push(entry);
  }
  const manifest = {
    schemaVersion: "rcap-source-pack/v2",
    packId: pack.packId,
    lane: pack.lane,
    lanePurpose: pack.lanePurpose,
    generatedBy: "scripts/generate-rcap-source-packs.mjs",
    assignmentSource: pack.assignmentSource,
    contains: "exact official source PDFs only, at their canonical STATES/... paths",
    containsNo: "no fixture, contact sheet, raster, sample packet, field map, sidecar or any other LegalEase output",
    isIgnoredOutput: "the built ZIP is written to a git-ignored path and is never committed. This manifest is the "
      + "committed half: it is what a built pack is verified against.",
    familyCount: pack.families.length,
    assignmentFamilyMapping: Object.fromEntries(entries.map((e) => [e.familyId, e.pathInArchive ?? null])),
    comparesAgainstInRepo: Object.fromEntries(
      entries.filter((e) => e.familyPackagePath).map((e) => [e.familyId, e.familyPackagePath])
    ),
    files: distinctFiles.map((e) => ({
      pathInArchive: e.pathInArchive,
      familyIds: usable.filter((u) => u.pathInArchive === e.pathInArchive).map((u) => u.familyId),
      documentId: e.documentId,
      revision: e.revision,
      language: e.language,
      assetClass: e.assetClass,
      sha256: e.sha256Expected,
      byteLength: e.byteLengthExpected,
      pinBasis: e.pinBasis,
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
    if (manifest.unresolved.length) {
      fail(`${pack.packId}: ${manifest.unresolved.length} family(ies) carry no usable source pin — `
        + manifest.unresolved.map((u) => u.familyId).join(", "));
    }
    fs.mkdirSync(ZIP_DIR, { recursive: true });
    const { staging, built } = buildPack(pack, distinctFiles, ZIP_DIR);
    manifest.files = built.map((e) => ({
      pathInArchive: e.pathInArchive,
      familyIds: usable.filter((u) => u.pathInArchive === e.pathInArchive).map((u) => u.familyId),
      documentId: e.documentId, revision: e.revision,
      language: e.language, assetClass: e.assetClass, sha256: e.sha256, byteLength: e.byteLength,
      pinBasis: e.pinBasis, visibleFormExpectation: e.visibleFormExpectation, officialTitle: e.officialTitle
    }));
    fs.writeFileSync(path.join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const installer = path.join(staging, "install.sh");
    fs.writeFileSync(installer, INSTALLER);
    fs.chmodSync(installer, 0o755);
    const zip = path.join(ZIP_DIR, `${pack.packId}.zip`);
    fs.rmSync(zip, { force: true });
    // A pack's digest is the thing a lane checks it against, so the same sources
    // must produce the same archive twice. `zip -X` drops the extra attributes
    // but still records each entry's mtime, and staging is freshly copied every
    // run — so the archive hashed differently on every build and the digest this
    // manifest pins could never be reproduced. Stamping one fixed time across the
    // staged tree makes the pack a function of its contents alone.
    stampFixedMtime(staging);
    execFileSync("zip", ["-qrX", zip, "."], { cwd: staging });
    fs.rmSync(staging, { recursive: true, force: true });
    manifest.built = true;
    manifest.zip = {
      path: path.relative(rootDir, zip),
      sha256: createHash("sha256").update(fs.readFileSync(zip)).digest("hex"),
      byteLength: fs.statSync(zip).size
    };
  }
  manifests.push(manifest);
}

const laneSummary = LANES.map((lane) => ({
  lane: lane.lane,
  purpose: lane.purpose,
  families: lane.families.length,
  packs: manifests.filter((m) => m.lane === lane.lane).length,
  batchSizes: manifests.filter((m) => m.lane === lane.lane).map((m) => m.familyCount)
}));

const index = {
  schemaVersion: "rcap-source-pack-index/v2",
  generatedBy: "scripts/generate-rcap-source-packs.mjs",
  purpose: "One pack per assigned batch: the court's own PDFs at their canonical paths, with the digest, byte "
    + "length and visible form expectation each must satisfy.",
  batchSizeRule: "four to eight families per pack. The batch count is taken from the eight-family ceiling and the "
    + "families are spread evenly across it, so no lane ends on a remainder batch below the floor.",
  ignoredOutput,
  corpusMounted: Boolean(corpusRoot),
  corpusRoot: corpusRoot ? path.relative(rootDir, corpusRoot) : null,
  zipsBuilt: manifests.filter((m) => m.built).length,
  whyNotBuilt: corpusRoot ? null
    : "no Master Library is mounted in this environment, so no ZIP was written. The manifests below are the "
      + "specification each pack must satisfy; run this generator with --build in a corpus-mounted container.",
  refusalRule: "a source that is absent, or that does not hash to what its family's record pins, fails its pack. "
    + "Nothing is substituted: a fixture, contact sheet, sample or other LegalEase output inside a source pack makes "
    + "every artifact rendered from it derived from our own previous output.",
  lanes: laneSummary,
  coverage: {
    nonRetiredFamiliesWithAPinnedSource: pinnedFamilies.length,
    familiesCoveredByAPack: [...new Set(manifests.flatMap((m) => m.files.flatMap((f) => f.familyIds)))].length,
    distinctOfficialFilesAcrossAllPacks: [...new Set(manifests.flatMap((m) => m.files.map((f) => f.pathInArchive)))].length,
    familiesWithNoPinnedSource: sourceRequiredFamilies.length,
    familiesPinnedThroughABundleReconciliation: pinnedFamilies.filter((id) =>
      sourcePinOf(packages.get(id).record).pinBasis !== "source-record.canonicalBundlePath").length,
    note: "this run packs the two assigned rerender lanes only, so coverage is measured against those assignments "
      + "rather than against the whole corpus. A family whose "
      + "record predates the v2 schema is pinned through its bundle reconciliation, which names the same canonical "
      + "path under the same digest. Families with no pinned source at all are unpackable by construction and are "
      + "listed below."
  },
  sourceRequired: {
    population: sourceRequiredFamilies.length,
    derivedFrom: "non-retired family packages under " + OVERLAY + " whose source-record.json names no canonical "
      + "Master Library path — neither a v2 canonicalBundlePath with a digest, nor a bundle reconciliation matched "
      + "by sha256",
    registerTotal: register.totals?.missingPdfBinaries ?? null,
    registerTotalMeans: "assets whose pinned local binary is absent from this clone. It does not ask whether the "
      + "Master Library holds the same document.",
    ofThoseReconciledToALibraryAsset: reconciledFromTheRegisterPopulation,
    controllingFactFromTheAssignment: 37,
    reconciliation: `the register reports missingPdfBinaries = ${register.totals?.missingPdfBinaries ?? "?"}, `
      + "and origin/main reports the same figure, so nothing on this branch moved it. Those two counts answer a "
      + "different question from this one: this factory asks whether the official bytes can be packed. "
      + `${reconciledFromTheRegisterPopulation} of that population reconcile to a Master Library asset by sha256 — `
      + "their bytes are in the library at a named canonical path, under the digest their own record pins — so they "
      + `are packed here rather than acquired. That leaves ${sourceRequiredFamilies.length} families with no `
      + "library path at all, and those are the real acquisition targets. The assignment's controlling fact is 37. "
      + "This factory adjudicates no denominator and hand-edits no total: it records each number, what each counts, "
      + "and how each was derived.",
    whyTheyAreNotAWaitCondition: "none of these families can appear in a pack, so pack generation for the "
      + "rerender, review and source-direct lanes does not depend on resolving them.",
    families: sourceRequiredFamilies
  },
  packs: manifests.map((m) => ({
    packId: m.packId, lane: m.lane, familyCount: m.familyCount,
    files: m.files.length, unresolved: m.unresolved.length, built: m.built,
    zip: m.zip ? { path: m.zip.path, sha256: m.zip.sha256, byteLength: m.zip.byteLength } : null
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

// A pack that is no longer assigned must not be left behind as a stale manifest.
//
// Pruning is limited to the lanes this run actually builds. This generator packs
// the assigned rerender lanes; manifests belonging to other lanes are another
// assignment's record and are not this run's to retire, so a narrower run must
// not delete them on its way past.
const lanePrefixes = LANES.map((lane) => `${lane.lane}-batch-`);
const expected = new Set([...manifests.map((m) => `${m.packId}.manifest.json`), "index.json"]);
for (const file of fs.existsSync(abs(OUT_DIR)) ? fs.readdirSync(abs(OUT_DIR)) : []) {
  if (expected.has(file)) continue;
  if (!lanePrefixes.some((prefix) => file.startsWith(prefix))) continue;
  if (checkOnly) { console.error(`FAIL source packs — ${OUT_DIR}/${file} is no longer assigned; re-run this generator`); process.exit(1); }
  fs.rmSync(abs(path.join(OUT_DIR, file)));
}

function writeText(rel, text) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === text) return;
  if (checkOnly) { console.error(`FAIL source packs — ${rel} is stale; re-run this generator`); process.exit(1); }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

/** The same record a lane can read without opening JSON. */
function renderMarkdown() {
  const lines = [];
  lines.push("# RCAP source packs");
  lines.push("");
  lines.push("Generated by `scripts/generate-rcap-source-packs.mjs`. Do not edit by hand.");
  lines.push("");
  lines.push("A source pack is the court's own PDFs, at their canonical Master Library paths, for one batch of");
  lines.push("four to eight families. It carries nothing else. A fixture, contact sheet, raster, sample packet or");
  lines.push("any other LegalEase output inside a pack looks exactly like the court's form until somebody renders");
  lines.push("from it, and then every artifact in the batch is derived from our own previous output — so a source");
  lines.push("that is absent, or that does not hash to what its family's record pins, fails its pack. Nothing is");
  lines.push("substituted for it, and a partial pack is not written.");
  lines.push("");
  lines.push("The built ZIPs are ignored output. They hold official court PDFs, which are not this repository's to");
  lines.push(`redistribute, so they are written to \`${ignoredOutput.path}\` — a path the factory proves git-ignored`);
  lines.push("before it writes anything, and refuses to build into otherwise. What is committed is the manifest:");
  lines.push("the canonical path, digest, byte length and visible form expectation each packed file must satisfy.");
  lines.push("");
  lines.push("## Running it");
  lines.push("");
  lines.push("```");
  lines.push("node scripts/generate-rcap-source-packs.mjs            # manifests only");
  lines.push("RCAP_BUNDLE_EXTRACT=/path/to/Expungement_AI_RCAP_Master_Library_Edition_1 \\");
  lines.push("  node scripts/generate-rcap-source-packs.mjs --build  # manifests + ZIPs");
  lines.push("node scripts/generate-rcap-source-packs.mjs --check    # committed manifests are current");
  lines.push("```");
  lines.push("");
  lines.push("`RCAP_SOURCE_PACK_OUT` moves the ZIP directory. Each pack ships an `install.sh` that verifies every");
  lines.push("file against the pack's own `manifest.json` before placing it, and refuses the whole run on a");
  lines.push("mismatch. `scripts/verify-rcap-source-packs.mjs` proves each refusal against a synthetic corpus and");
  lines.push("removes each one in turn to prove the canary watching it goes red.");
  lines.push("");
  if (!corpusRoot) {
    lines.push("### Not built here");
    lines.push("");
    lines.push("No Master Library is mounted in the environment that generated this file, so no ZIP exists yet and");
    lines.push("`zipsBuilt` is 0. The manifests below are complete and are the specification a built pack is checked");
    lines.push("against; run the `--build` line above in a corpus-mounted container to produce the archives.");
    lines.push("");
  }
  lines.push("## Lanes");
  lines.push("");
  lines.push("| lane | families | packs | batch sizes | what it is for |");
  lines.push("| --- | ---: | ---: | --- | --- |");
  for (const lane of laneSummary) {
    lines.push(`| ${lane.lane} | ${lane.families} | ${lane.packs} | ${lane.batchSizes.join(", ")} | ${lane.purpose} |`);
  }
  lines.push("");
  lines.push("## Packs");
  lines.push("");
  lines.push("| pack | lane | families | official files | built |");
  lines.push("| --- | --- | ---: | ---: | --- |");
  for (const pack of index.packs) {
    lines.push(`| ${pack.packId} | ${pack.lane} | ${pack.familyCount} | ${pack.files} | ${pack.built ? "yes" : "no"} |`);
  }
  lines.push("");
  lines.push(`${index.coverage.familiesCoveredByAPack} of the ${index.coverage.nonRetiredFamiliesWithAPinnedSource} `
    + "non-retired families with a pinned source are covered, resolving to "
    + `${index.coverage.distinctOfficialFilesAcrossAllPacks} distinct official files — several family rows name the `
    + "same asset, and a pack carries that asset once.");
  lines.push("");
  lines.push("## The families no pack can carry");
  lines.push("");
  lines.push(`${index.sourceRequired.population} non-retired families name no canonical Master Library path at all, `
    + "so their bytes have to come from the publisher. They cannot appear in a pack and nothing above waits on them.");
  lines.push("");
  lines.push(index.sourceRequired.reconciliation);
  lines.push("");
  lines.push("| family | jurisdiction | file | classification | superseding candidates |");
  lines.push("| --- | --- | --- | --- | ---: |");
  for (const family of index.sourceRequired.families) {
    lines.push(`| ${family.familyId} | ${family.jurisdiction ?? "—"} | ${family.fileName ?? "—"} | `
      + `${family.lifecycleClassification ?? "—"} | ${family.supersedingCandidates} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

for (const manifest of manifests) writeJson(`${OUT_DIR}/${manifest.packId}.manifest.json`, manifest);
writeJson(`${OUT_DIR}/index.json`, index);
writeText("docs/record-clearing/pdf-independent-reviews/source-packs.md", `${renderMarkdown().trimEnd()}\n`);

const files = manifests.reduce((n, m) => n + m.files.length, 0);
const unresolved = manifests.reduce((n, m) => n + m.unresolved.length, 0);
console.log(
  `OK source packs — ${manifests.length} packs over ${LANES.length} lanes, ` +
  `${files} official sources specified, ${unresolved} unresolved, ` +
  `${sourceRequiredFamilies.length} families unpackable (no pinned source), ` +
  (corpusRoot ? `${index.zipsBuilt} ZIP(s) built from ${index.corpusRoot}` : "0 ZIPs: no Master Library mounted")
);
