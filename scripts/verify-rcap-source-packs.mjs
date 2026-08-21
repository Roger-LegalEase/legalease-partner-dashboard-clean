#!/usr/bin/env node
// Source-pack canaries.
//
//   node scripts/verify-rcap-source-packs.mjs
//
// The factory's whole value is a refusal: when an official source is absent, or
// is not the source the record pins, the pack fails instead of shipping
// something that merely looks like a court form. A refusal that has never been
// observed refusing is a comment, so this builds a miniature repository with a
// synthetic corpus, runs the real generator against it, and checks that each
// refusal fires — then removes each refusal and checks that the canary watching
// it goes red. A mutation that changes nothing proves nothing.
//
// The synthetic corpus is never a stand-in for the Master Library. It exists
// only inside a temp directory, its bytes are obviously not a court form, and
// nothing it produces is written into this repository.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR = path.join(rootDir, "scripts/generate-rcap-source-packs.mjs");
const failures = [];
const note = (message) => failures.push(message);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// --- a miniature repository -------------------------------------------------

/** Synthetic bytes for one family. Not a PDF anyone could mistake for a form. */
const syntheticSource = (familyId) =>
  Buffer.from(`%PDF-1.4\n% synthetic source-pack canary fixture for ${familyId}\n%%EOF\n`, "utf8");

const FAMILIES = [
  // rerender lane 1, then lane 2 (the handoff order decides the split)
  { slug: "fam-a", state: "canary", pin: "v2" },
  { slug: "fam-b", state: "canary", pin: "v2" },
  { slug: "fam-c", state: "canary", pin: "v2" },
  { slug: "fam-d", state: "canary", pin: "v2" },
  // review-only
  { slug: "fam-e", state: "canary", pin: "v2" },
  { slug: "fam-f", state: "canary", pin: "v2" },
  // source-direct
  { slug: "fam-g", state: "canary", pin: "v2" },
  { slug: "fam-h", state: "canary", pin: "v2" },
  { slug: "fam-i", state: "canary", pin: "v2" },
  // pinned only through a v1 bundle reconciliation
  { slug: "fam-y", state: "canary", pin: "v1-reconciled" },
  // no library path at all — must never be packed
  { slug: "fam-z", state: "canary", pin: "none" }
];

const idOf = (family) => `CAN:${family.slug}`;
const archivePathOf = (family) =>
  `STATES/CAN/02_PACKET_FORMS/CAN__FORM__${family.slug.toUpperCase()}__canary-fixture__REV-2026-01__EN.pdf`;

const miniRepos = [];
process.on("exit", () => {
  for (const dir of miniRepos) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } }
});

function buildMiniRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-source-pack-canary-"));
  miniRepos.push(repo);
  const corpus = path.join(repo, "corpus");
  fs.mkdirSync(path.join(repo, "scripts"), { recursive: true });
  fs.copyFileSync(GENERATOR, path.join(repo, "scripts/generate-rcap-source-packs.mjs"));
  fs.writeFileSync(path.join(repo, ".gitignore"), "tmp/source-packs/\n");
  execFileSync("git", ["init", "-q"], { cwd: repo });

  for (const family of FAMILIES) {
    const dir = path.join(repo, "data/rcap-all50/overlays/production", family.state, family.slug);
    fs.mkdirSync(dir, { recursive: true });
    const archivePath = archivePathOf(family);
    let record = { schemaVersion: "canary/v1", jurisdiction: "CAN", fileName: `${family.slug}.pdf` };
    if (family.pin !== "none") {
      const bytes = syntheticSource(idOf(family));
      const target = path.join(corpus, archivePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
      const digest = sha256(bytes);
      record = family.pin === "v2"
        ? { ...record, canonicalBundlePath: `Expungement_AI_RCAP_Master_Library_Edition_1/${archivePath}`,
            sha256: digest, byteLength: bytes.length, documentId: family.slug.toUpperCase(), revision: "REV-2026-01" }
        : { ...record, expectedSha256: digest, binaryPresent: false, bundleReconciliation: {
            lifecycleClassification: "binary_present_and_current", matchedBy: "sha256",
            bundlePath: `Expungement_AI_RCAP_Master_Library_Edition_1/${archivePath}`,
            bundleBytes: bytes.length, documentId: family.slug.toUpperCase(), revision: "REV-2026-01" } };
    } else {
      record = { ...record, expectedSha256: "sha256_unrecorded_in_repo", binaryPresent: false,
        bundleReconciliation: { lifecycleClassification: "true_hash_missing", matchedBy: null,
          supersedingCandidatesByDocumentId: [] } };
    }
    fs.writeFileSync(path.join(dir, "source-record.json"), `${JSON.stringify(record, null, 2)}\n`);
  }

  const write = (rel, value) => {
    const file = path.join(repo, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  };
  write("data/rcap-all50/gate-b-family-rerender-handoff.json",
    { familiesUnblockedForRerender: ["CAN:fam-a", "CAN:fam-b", "CAN:fam-c", "CAN:fam-d"] });
  write("data/rcap-all50/pdf-independent-reviews/re-review-handoff.json",
    { families: [{ familyId: "CAN:fam-a" }] });
  write("data/rcap-all50/pdf-independent-reviews/batch-1-manifest.json",
    { families: [{ familyId: "CAN:fam-e" }] });
  write("data/rcap-all50/pdf-independent-reviews/batch-a-manifest.json",
    { frozenFamilyIds: ["CAN:fam-f"] });
  write("data/rcap-all50/problematic-pdf-register.json", { totals: { missingPdfBinaries: 2 } });
  return { repo, corpus };
}

/** Runs the generator inside the mini repo and reports how it exited. */
function run({ repo, corpus, out, build = true, extraEnv = {} }) {
  const result = spawnSync(process.execPath, ["scripts/generate-rcap-source-packs.mjs", ...(build ? ["--build"] : [])], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, RCAP_BUNDLE_EXTRACT: corpus ?? "", RCAP_SOURCE_PACK_OUT: out, ...extraEnv }
  });
  return { code: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const indexOf_ = (repo) =>
  JSON.parse(fs.readFileSync(path.join(repo, "data/rcap-all50/source-packs/index.json"), "utf8"));

// --- the canaries -----------------------------------------------------------

console.log("source-pack canaries");

const base = buildMiniRepo();
const outDir = path.join(base.repo, "tmp/source-packs");
const first = run({ repo: base.repo, corpus: base.corpus, out: outDir });

const CANARIES = [
  {
    id: "a_mounted_corpus_builds_one_zip_per_batch",
    covers: "the happy path — without it every refusal below could be a generator that never builds anything",
    holds: () => {
      if (first.code !== 0) return `the build exited ${first.code}: ${first.stderr.trim()}`;
      const index = indexOf_(base.repo);
      const zips = fs.readdirSync(outDir).filter((f) => f.endsWith(".zip"));
      if (zips.length !== index.packs.length) return `${zips.length} ZIP(s) for ${index.packs.length} pack(s)`;
      if (index.zipsBuilt !== index.packs.length) return `index says ${index.zipsBuilt} built`;
      return null;
    }
  },
  {
    id: "a_pack_holds_official_sources_and_nothing_else",
    covers: "LegalEase output reaching a lane disguised as a court form",
    holds: () => {
      const zip = path.join(outDir, `${indexOf_(base.repo).packs[0].packId}.zip`);
      const listing = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" })
        .split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !l.endsWith("/"));
      const stray = listing.filter((f) => f !== "manifest.json" && f !== "install.sh" && !f.startsWith("STATES/"));
      return stray.length ? `${stray.length} non-source entr(y/ies): ${stray.join(", ")}` : null;
    }
  },
  {
    id: "every_packed_file_hashes_to_what_its_manifest_says",
    covers: "a pack whose manifest and bytes disagree, which installs cleanly and renders wrong",
    holds: () => {
      const staging = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-pack-open-"));
      const index = indexOf_(base.repo);
      for (const pack of index.packs) {
        execFileSync("unzip", ["-qq", path.join(outDir, `${pack.packId}.zip`), "-d", staging]);
        const manifest = JSON.parse(fs.readFileSync(path.join(staging, "manifest.json"), "utf8"));
        for (const file of manifest.files) {
          const bytes = fs.readFileSync(path.join(staging, file.pathInArchive));
          if (sha256(bytes) !== file.sha256) return `${pack.packId}: ${file.pathInArchive} does not match its manifest`;
          if (bytes.length !== file.byteLength) return `${pack.packId}: ${file.pathInArchive} byte length disagrees`;
        }
        fs.rmSync(staging, { recursive: true, force: true });
        fs.mkdirSync(staging, { recursive: true });
      }
      fs.rmSync(staging, { recursive: true, force: true });
      return null;
    }
  },
  {
    id: "a_family_with_no_library_path_is_never_packed",
    covers: "an acquisition target quietly packed from whatever else was lying around",
    holds: () => {
      const index = indexOf_(base.repo);
      const packed = new Set(index.packs.map((p) => p.packId));
      for (const packId of packed) {
        const manifest = JSON.parse(fs.readFileSync(
          path.join(base.repo, "data/rcap-all50/source-packs", `${packId}.manifest.json`), "utf8"));
        if (manifest.files.some((f) => f.familyIds.includes("CAN:fam-z"))) return `${packId} packs CAN:fam-z`;
      }
      if (!index.sourceRequired.families.some((f) => f.familyId === "CAN:fam-z")) {
        return "CAN:fam-z is not reported as source-required either — it vanished";
      }
      return null;
    }
  },
  {
    id: "a_v1_reconciled_family_is_packed_at_its_library_path",
    covers: "a family whose record predates the v2 schema being treated as sourceless when its bytes are in hand",
    holds: () => {
      const family = FAMILIES.find((f) => f.pin === "v1-reconciled");
      const wanted = archivePathOf(family);
      const packed = fs.readdirSync(path.join(base.repo, "data/rcap-all50/source-packs"))
        .filter((f) => f.endsWith(".manifest.json"))
        .flatMap((f) => JSON.parse(fs.readFileSync(path.join(base.repo, "data/rcap-all50/source-packs", f), "utf8")).files);
      const entry = packed.find((f) => f.pathInArchive === wanted);
      if (!entry) return `${idOf(family)} is pinned by its reconciliation but no pack carries ${wanted}`;
      if (!entry.pinBasis?.includes("bundleReconciliation")) return "the pin basis was not recorded";
      return null;
    }
  },
  {
    id: "an_absent_source_fails_the_pack",
    covers: "the substitution this factory exists to refuse",
    holds: () => {
      const scratch = buildMiniRepo();
      fs.rmSync(path.join(scratch.corpus, archivePathOf(FAMILIES[0])));
      const out = path.join(scratch.repo, "tmp/source-packs");
      const result = run({ repo: scratch.repo, corpus: scratch.corpus, out });
      if (result.code === 0) return "the build succeeded with a source missing from the corpus";
      if (!/official source is absent/.test(result.stderr)) return `it failed for another reason: ${result.stderr.trim()}`;
      return null;
    }
  },
  {
    id: "a_source_that_is_not_the_pinned_source_fails_the_pack",
    covers: "a revision drift or a swapped file that installs and renders as though it were the pinned form",
    holds: () => {
      const scratch = buildMiniRepo();
      const target = path.join(scratch.corpus, archivePathOf(FAMILIES[0]));
      fs.writeFileSync(target, Buffer.concat([fs.readFileSync(target), Buffer.from("drift\n")]));
      const result = run({ repo: scratch.repo, corpus: scratch.corpus, out: path.join(scratch.repo, "tmp/source-packs") });
      if (result.code === 0) return "the build succeeded against a source that is not the pinned source";
      if (!/hashes/.test(result.stderr)) return `it failed for another reason: ${result.stderr.trim()}`;
      return null;
    }
  },
  {
    id: "a_byte_length_disagreement_fails_the_pack",
    covers: "a record and a corpus that disagree about the asset, caught even when the digest check is satisfied",
    holds: () => {
      const scratch = buildMiniRepo();
      const recordPath = path.join(scratch.repo, "data/rcap-all50/overlays/production/canary/fam-a/source-record.json");
      const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
      record.byteLength += 1;
      fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
      const result = run({ repo: scratch.repo, corpus: scratch.corpus, out: path.join(scratch.repo, "tmp/source-packs") });
      if (result.code === 0) return "the build succeeded with a byte length the record contradicts";
      if (!/the record pins/.test(result.stderr)) return `it failed for another reason: ${result.stderr.trim()}`;
      return null;
    }
  },
  {
    id: "an_output_path_git_would_track_refuses_to_build",
    covers: "official court PDFs entering this repository's history, where they cannot be taken back out",
    holds: () => {
      const scratch = buildMiniRepo();
      const tracked = path.join(scratch.repo, "packs-here");
      const result = run({ repo: scratch.repo, corpus: scratch.corpus, out: tracked });
      if (result.code === 0) return "the build wrote packs to a path git would track";
      if (!/not git-ignored/.test(result.stderr)) return `it failed for another reason: ${result.stderr.trim()}`;
      return null;
    }
  },
  {
    id: "no_corpus_refuses_to_build",
    covers: "an empty or improvised pack shipped from an environment that never had the sources",
    holds: () => {
      const scratch = buildMiniRepo();
      const result = run({ repo: scratch.repo, corpus: null, out: path.join(scratch.repo, "tmp/source-packs") });
      if (result.code === 0) return "the build succeeded with no Master Library mounted";
      if (!/no Master Library is mounted/.test(result.stderr)) return `it failed for another reason: ${result.stderr.trim()}`;
      return null;
    }
  },
  {
    id: "the_installer_refuses_a_substituted_file",
    covers: "a pack tampered with between the factory and the lane that installs it",
    holds: () => {
      const staging = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-pack-install-"));
      const packId = indexOf_(base.repo).packs[0].packId;
      execFileSync("unzip", ["-qq", path.join(outDir, `${packId}.zip`), "-d", staging]);
      const manifest = JSON.parse(fs.readFileSync(path.join(staging, "manifest.json"), "utf8"));
      const victim = path.join(staging, manifest.files[0].pathInArchive);
      fs.writeFileSync(victim, Buffer.from("%PDF-1.4\n% not the court's form\n%%EOF\n"));
      const target = path.join(staging, "installed");
      const result = spawnSync("bash", [path.join(staging, "install.sh"), target], { encoding: "utf8" });
      fs.rmSync(staging, { recursive: true, force: true });
      if (result.status === 0) return "install.sh installed a file that does not match its manifest";
      if (!/FAIL/.test(`${result.stdout}${result.stderr}`)) return "install.sh failed without saying why";
      return null;
    }
  },
  {
    id: "every_batch_holds_four_to_eight_families",
    covers: "a remainder batch of one or two, which the assignment does not accept",
    holds: () => {
      const index = indexOf_(base.repo);
      const lanes = index.lanes.filter((l) => l.families > 4);
      const bad = lanes.flatMap((l) => l.batchSizes.filter((n) => n < 4 || n > 8).map((n) => `${l.lane}:${n}`));
      return bad.length ? `batch size(s) outside four to eight: ${bad.join(", ")}` : null;
    }
  }
];

for (const canary of CANARIES) {
  let problem;
  try { problem = canary.holds(); } catch (error) { problem = `threw: ${error.message}`; }
  console.log(`  ${problem ? "FAIL" : "ok  "} ${canary.id}`);
  if (problem) note(`${canary.id}: ${problem} — this canary guards ${canary.covers}`);
}

// --- the mutations ----------------------------------------------------------
//
// Each removes exactly one refusal from a copy of the generator and asserts that
// the canary watching it goes red. A mutation whose canary stays green means the
// refusal was never doing the work the canary credits it with.

const REMOVE_ABSENCE = /if \(!fs\.existsSync\(source\)\) \{[\s\S]*?\n    \}\n/;
const REMOVE_DIGEST = /if \(sha256 !== entry\.sha256Expected\) \{[\s\S]*?\n    \}\n/;
const REMOVE_LENGTH = /if \(entry\.byteLengthExpected && bytes\.length !== entry\.byteLengthExpected\) \{[\s\S]*?\n    \}\n/;
const SUBSTITUTE = "if (!fs.existsSync(source)) { fs.mkdirSync(path.dirname(source), { recursive: true }); "
  + "fs.writeFileSync(source, Buffer.alloc(0)); }\n";

const MUTATIONS = [
  {
    id: "remove_the_absent_source_check",
    covers: "an_absent_source_fails_the_pack",
    // The guards are layered, so deleting one does not make the build succeed —
    // the next one catches the same file for a different reason. What must stop
    // happening is the refusal this canary reads: the absence must no longer be
    // what the run reports.
    expect: /official source is absent/,
    mutate: (source) => source.replace(
      /if \(!fs\.existsSync\(source\)\) \{[\s\S]*?\n    \}\n/,
      "if (!fs.existsSync(source)) { fs.mkdirSync(path.dirname(source), { recursive: true }); fs.writeFileSync(source, Buffer.alloc(0)); }\n"),
    provoke: (scratch, out) => {
      fs.rmSync(path.join(scratch.corpus, archivePathOf(FAMILIES[0])));
      return run({ repo: scratch.repo, corpus: scratch.corpus, out });
    }
  },
  {
    id: "remove_the_digest_comparison",
    covers: "a_source_that_is_not_the_pinned_source_fails_the_pack",
    expect: /hashes/,
    mutate: (source) => source.replace(REMOVE_DIGEST, ""),
    provoke: (scratch, out) => {
      const target = path.join(scratch.corpus, archivePathOf(FAMILIES[0]));
      fs.writeFileSync(target, Buffer.concat([fs.readFileSync(target), Buffer.from("drift\n")]));
      return run({ repo: scratch.repo, corpus: scratch.corpus, out });
    }
  },
  {
    id: "remove_the_ignored_output_guard",
    covers: "an_output_path_git_would_track_refuses_to_build",
    expect: /not git-ignored/,
    mutate: (source) => source.replace(
      /if \(build && ignoredOutput\.insideRepository && ignoredOutput\.ignoredByGit === false\) \{[\s\S]*?\n\}\n/, ""),
    provoke: (scratch) => run({ repo: scratch.repo, corpus: scratch.corpus, out: path.join(scratch.repo, "packs-here") })
  },
  {
    // The three source guards together are what stop a pack shipping bytes the
    // court never published. With all three gone the build does not just report
    // differently — it succeeds, and hands a lane an empty file at the canonical
    // path of an official form. That is the harm, demonstrated rather than
    // asserted.
    id: "remove_every_source_verification",
    covers: "an_absent_source_fails_the_pack",
    expect: null,
    mutate: (source) => source.replace(REMOVE_ABSENCE, SUBSTITUTE).replace(REMOVE_DIGEST, "").replace(REMOVE_LENGTH, ""),
    provoke: (scratch, out) => {
      fs.rmSync(path.join(scratch.corpus, archivePathOf(FAMILIES[0])));
      const result = run({ repo: scratch.repo, corpus: scratch.corpus, out });
      if (result.code === 0) {
        const zip = path.join(out, `${JSON.parse(fs.readFileSync(
          path.join(scratch.repo, "data/rcap-all50/source-packs/index.json"), "utf8")).packs[0].packId}.zip`);
        const listing = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" });
        result.shippedAnEmptySource = listing.includes(archivePathOf(FAMILIES[0]));
      }
      return result;
    },
    detect: (result) => result.code === 0 && result.shippedAnEmptySource === true
  }
];

console.log("  mutations");
const generatorSource = fs.readFileSync(GENERATOR, "utf8");
for (const mutation of MUTATIONS) {
  const scratch = buildMiniRepo();
  const mutated = mutation.mutate(generatorSource);
  if (mutated === generatorSource) {
    console.log(`    FAIL ${mutation.id.padEnd(38)} → changed nothing`);
    note(`mutation "${mutation.id}" matched no source text, so ${mutation.covers} proves nothing`);
    continue;
  }
  fs.writeFileSync(path.join(scratch.repo, "scripts/generate-rcap-source-packs.mjs"), mutated);
  const result = mutation.provoke(scratch, path.join(scratch.repo, "tmp/source-packs"));
  const wentRed = mutation.detect
    ? mutation.detect(result)
    : result.code === 0 || !mutation.expect.test(result.stderr);
  console.log(`    ${wentRed ? "ok  " : "FAIL"} ${mutation.id.padEnd(38)} → ${mutation.covers} goes red`);
  if (!wentRed) {
    note(`mutation "${mutation.id}" left the run refusing for the same reason, so ${mutation.covers} is not proving what it claims`);
  }
}

if (failures.length) {
  console.error(`FAIL source-pack canaries — ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK source-pack canaries — ${CANARIES.length} canaries hold against a synthetic corpus, ` +
  `${MUTATIONS.length} mutations each turn their canary red, a pack carries official sources only, ` +
  "and a pack never lands on a path git would track"
);
