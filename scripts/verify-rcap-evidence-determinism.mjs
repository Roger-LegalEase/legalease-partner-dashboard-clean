#!/usr/bin/env node
// Every evidence generator, run twice, with nothing allowed to move on the
// second pass.
//
//   node scripts/verify-rcap-evidence-determinism.mjs
//
// An evidence record that changes when nothing changed is not evidence. It is
// noise that hides the one diff that matters, and it makes "regenerate and
// commit" an operation nobody can review. Wave C found a record whose narrative
// block contradicted its own per-family entries and a check mode that
// validated a substitute it had just built rather than the file on disk;
// neither would have survived being asked to reproduce itself.
//
// So: run each generator, take the digest of the whole tracked tree, run every
// generator again, and require the digest to be identical. Where a generator
// offers `--check`, that is run too, because a check mode that passes only
// because it regenerates is a check mode that checks nothing.
//
// This does not run the render driver. The driver needs the Master Library
// extract; these generators describe what is already on disk.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GENERATORS = [
  { script: "scripts/generate-rcap-gate-b-family-rerender-evidence.mjs", args: [], check: ["--check"] },
  { script: "scripts/generate-rcap-wave-c-corrections.mjs", args: [], check: ["--check"] },
  { script: "scripts/generate-rcap-gate-b-evidence-completion.mjs", args: ["--without-source-bytes"], check: ["--without-source-bytes", "--check"] },
  { script: "scripts/generate-rcap-overlay-placement-evidence.mjs", args: [], check: ["--check"] },
  { script: "scripts/generate-rcap-finalized-artifact-audit.mjs", args: [], check: ["--check"] },
  { script: "scripts/generate-rcap-contact-sheet-visual-proof.mjs", args: [], check: ["--check"] },
  // In dependency order: the register describes the corpus, the master list
  // covers the register, and the acquisition queue covers the master list.
  // Regenerating one without the others is what left all three describing
  // different corpora.
  { script: "scripts/generate-rcap-problematic-pdf-register.mjs", args: [], check: ["--check"] },
  { script: "scripts/generate-rcap-problematic-pdf-master-list.mjs", args: [], check: ["--check"] },
  { script: "scripts/generate-rcap-source-acquisition-queue.mjs", args: [], check: ["--check"] },
  // Last: it hashes the shared modules and the approved families, so it has to
  // see the tree every other generator has finished with.
  { script: "scripts/generate-rcap-shared-module-freeze.mjs", args: [], check: ["--check"] }
];

const failures = [];

/**
 * A digest of every tracked file's content, so a moved byte anywhere shows up
 * as one number changing.
 *
 * `git ls-files` rather than a walk: the untracked working files a generator
 * legitimately leaves in a temp directory are not evidence, and node_modules
 * is not either.
 */
function treeDigest() {
  // Tracked AND new-but-not-ignored: a generator that writes a file for the
  // first time is exactly the case a tracked-only digest would miss.
  const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: rootDir, maxBuffer: 1 << 28 })
    .toString("utf8").split("\0").filter(Boolean).sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const abs = path.join(rootDir, file);
    hash.update(file);
    hash.update("\0");
    hash.update(fs.existsSync(abs) ? fs.readFileSync(abs) : Buffer.alloc(0));
    hash.update("\0");
  }
  return { digest: hash.digest("hex"), files: files.length };
}

function run(generator, args, label) {
  const started = Date.now();
  try {
    execFileSync("node", ["--max-old-space-size=1536", generator, ...args], { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
    return { ok: true, seconds: Math.round((Date.now() - started) / 1000) };
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim().split("\n").filter(Boolean);
    failures.push(`${label}: ${generator} ${args.join(" ")} exited non-zero — ${output[output.length - 1] ?? error.message}`);
    return { ok: false, seconds: Math.round((Date.now() - started) / 1000) };
  }
}

console.log("  first pass");
for (const { script, args } of GENERATORS) {
  const result = run(script, args, "first pass");
  console.log(`    ${result.ok ? "ok  " : "FAIL"} ${script} ${args.join(" ")} (${result.seconds}s)`);
}

const before = treeDigest();
console.log(`  tree after the first pass: ${before.digest.slice(0, 16)}… over ${before.files} files`);

console.log("  second pass");
for (const { script, args } of GENERATORS) {
  const result = run(script, args, "second pass");
  console.log(`    ${result.ok ? "ok  " : "FAIL"} ${script} ${args.join(" ")} (${result.seconds}s)`);
}

const after = treeDigest();
console.log(`  tree after the second pass: ${after.digest.slice(0, 16)}… over ${after.files} files`);

if (before.digest !== after.digest) {
  const changed = execFileSync("git", ["status", "--porcelain"], { cwd: rootDir, maxBuffer: 1 << 28 }).toString("utf8");
  failures.push(`the second pass moved bytes; a generator is not reproducible:\n${changed}`);
}

console.log("  check modes, against the committed bytes");
for (const { script, check } of GENERATORS) {
  if (!check) continue;
  const result = run(script, check, "check mode");
  console.log(`    ${result.ok ? "ok  " : "FAIL"} ${script} ${check.join(" ")} (${result.seconds}s)`);
}

// ---------------------------------------------------------------------------
// A field named `current` pins current bytes.
//
// The rerender evidence carried a second copy of each artifact digest under a
// "new" name. Both were read off the same file, so they agreed when written and
// stopped agreeing the moment anything rendered — and at the wave C review base
// three families had been rendered again while the record still described the
// previous run's bytes, with every "proven against this family's bytes" flag on
// them resting on digests that were no longer the artifact.
//
// The historical copies are gone. This is the guard that keeps them gone: every
// field whose name begins with `current` is recomputed from the file it claims
// to describe, and a `current*` field this table does not know how to resolve
// is a failure rather than something nobody checked.
// ---------------------------------------------------------------------------

const CURRENT_PINS = [
  {
    record: "data/rcap-all50/pdf-independent-reviews/gate-b-family-rerender-evidence.json",
    rows: (json) => json.families ?? [],
    resolve: {
      currentMapOrProfileSha256: (row) => row.currentMapOrProfilePath,
      currentClassificationSha256: (row) => `${row.familyPackagePath}/field-classification.json`,
      currentCanonicalArtifactSha256: (row) => `${row.familyPackagePath}/fixtures/canonical-filled.pdf`,
      currentBoundaryArtifactSha256: (row) => `${row.familyPackagePath}/fixtures/boundary-filled.pdf`,
      currentContactSheetSha256: (row) => `${row.familyPackagePath}/contact-sheet/blank-vs-filled.pdf`,
      currentSourceSha256: null
    }
  },
  {
    record: "data/rcap-all50/pdf-independent-reviews/wave-c-corrections/wave-c-corrections.json",
    rows: (json) => json.families ?? [],
    resolve: {
      currentCanonicalArtifactSha256: (row) => `${row.familyPackagePath}/fixtures/canonical-filled.pdf`,
      currentContactSheetSha256: (row) => `${row.familyPackagePath}/contact-sheet/blank-vs-filled.pdf`
    }
  }
];

const digestOf = (rel) => {
  const abs = path.join(rootDir, rel);
  return fs.existsSync(abs) ? createHash("sha256").update(fs.readFileSync(abs)).digest("hex") : null;
};

console.log("  current* fields, against the bytes on disk");
let pinsChecked = 0;
for (const { record, rows, resolve } of CURRENT_PINS) {
  const file = path.join(rootDir, record);
  if (!fs.existsSync(file)) { failures.push(`${record} is absent, so its pins cannot be checked`); continue; }
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const row of rows(json)) {
    for (const key of Object.keys(row)) {
      if (!/^current[A-Z]/.test(key) || !key.endsWith("Sha256")) continue;
      if (!(key in resolve)) {
        failures.push(`${record}: ${key} is named "current" and nothing here knows which file it pins`);
        continue;
      }
      // A source digest is pinned from the record, not recomputed: the
      // official bytes are not in the repository and a receipt is not source
      // proof. It is listed so it cannot be silently added later.
      if (resolve[key] === null) continue;
      const rel = resolve[key](row);
      const expected = digestOf(rel);
      pinsChecked += 1;
      if ((row[key] ?? null) !== expected) {
        failures.push(`${record}: ${row.familyId ?? "row"}.${key} is ${row[key] ?? "null"}; ${rel} hashes to ${expected ?? "nothing (the file is absent)"}`);
      }
    }
  }
}
console.log(`    ${failures.length === 0 ? "ok  " : "    "} ${pinsChecked} current* digests recomputed from the files they name`);

if (failures.length) {
  console.error(`FAIL evidence determinism — ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK evidence determinism — ${GENERATORS.length} generators run twice, ` +
  `${after.files} files identical across both passes, every check mode green, ` +
  `${pinsChecked} current* digests recomputed from the files they name`
);
