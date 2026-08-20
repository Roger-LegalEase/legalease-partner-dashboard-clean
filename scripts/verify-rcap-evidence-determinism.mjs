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
  { script: "scripts/generate-rcap-contact-sheet-visual-proof.mjs", args: [], check: ["--check"] }
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
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: rootDir, maxBuffer: 1 << 28 })
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
    execFileSync("node", [generator, ...args], { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
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
console.log(`  tree after the first pass: ${before.digest.slice(0, 16)}… over ${before.files} tracked files`);

console.log("  second pass");
for (const { script, args } of GENERATORS) {
  const result = run(script, args, "second pass");
  console.log(`    ${result.ok ? "ok  " : "FAIL"} ${script} ${args.join(" ")} (${result.seconds}s)`);
}

const after = treeDigest();
console.log(`  tree after the second pass: ${after.digest.slice(0, 16)}… over ${after.files} tracked files`);

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

if (failures.length) {
  console.error(`FAIL evidence determinism — ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK evidence determinism — ${GENERATORS.length} generators run twice, ` +
  `${after.files} tracked files identical across both passes, every check mode green`
);
