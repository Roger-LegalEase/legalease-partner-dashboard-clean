#!/usr/bin/env node
// The image-input fingerprint verifier.
//
// The staging action records what the worker image would be built from. This
// verifier does not trust that record: it recomputes all seven image-input
// hashes itself — sha256 over file bytes with node crypto, tree hashes with
// git — and compares them with what the record claims. The generator computes;
// this recomputes; agreement between two independent computations is the
// evidence.
//
// What red means here: the fingerprint in data/rcap-staging-action.json does
// not describe the tree a build at HEAD would actually copy. Publishing a
// worker image in that state means shipping bytes the freeze record does not
// name, which is the exact gap this file exists to close.
//
// Fails when:
//   * any file input's bytes differ from the recorded hash, or the file is
//     absent;
//   * src/ or scripts/lib/ differ from the fingerprint base — in a commit or
//     in the working tree, tracked or untracked;
//   * the fingerprint omits a required input, carries an unrecognised
//     algorithm/version, or its base does not resolve;
//   * the recorded tree hashes were derived from something other than the
//     fingerprint base (e.g. the security checkpoint, whose trees are not the
//     build source);
//   * HEAD differs from the fingerprint base on any image-input path — a stale
//     fingerprint is not current merely because it once was;
//   * the committed action was hand-edited rather than regenerated (the
//     generator's own --check is re-run as part of this verification).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTION_PATH = "data/rcap-staging-action.json";
const EXPECTED_ALGORITHM = "sha256-file+git-tree/v1";

// The seven inputs, verified against a hardcoded list on purpose: if the record
// drops one, the comparison below still demands it.
const FILE_INPUTS = {
  packageJsonSha256: "package.json",
  packageLockSha256: "package-lock.json",
  tsconfigSha256: "tsconfig.json",
  workerEntrypointSha256: "scripts/rcap-render-worker.mjs",
  dockerfileSha256: "deploy/rcap-render-worker/Dockerfile"
};
const TREE_INPUTS = {
  scriptsLibTreeHash: "scripts/lib",
  srcTreeHash: "src"
};
const ALL_DIFF_PATHS = [...Object.values(FILE_INPUTS), ...Object.values(TREE_INPUTS)];

const failures = [];
const fail = (message) => failures.push(message);

function git(args) {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
}

const action = JSON.parse(fs.readFileSync(path.join(rootDir, ACTION_PATH), "utf8"));
const fingerprint = action.imageInputFingerprint;
const baseSha = action.imageInputFingerprintBaseSha;

if (!fingerprint || typeof fingerprint !== "object") {
  fail("the staging action carries no imageInputFingerprint");
} else {
  if (fingerprint.algorithm !== EXPECTED_ALGORITHM) {
    fail(
      `fingerprint algorithm is ${JSON.stringify(fingerprint.algorithm)}, expected ${EXPECTED_ALGORITHM}; an algorithm change requires an explicit migration of this verifier, not a silent swap`
    );
  }
  for (const key of [...Object.keys(FILE_INPUTS), ...Object.keys(TREE_INPUTS)]) {
    if (typeof fingerprint[key] !== "string" || fingerprint[key].length === 0) {
      fail(`fingerprint omits ${key}; a partial fingerprint is not a fingerprint`);
    }
  }
}

if (action.imageInputEquivalenceRequired !== true) {
  fail("imageInputEquivalenceRequired must be true; the equivalence rule is the self-reference escape and cannot be waived");
}

let baseResolves = false;
if (typeof baseSha !== "string" || !/^[0-9a-f]{40}$/.test(baseSha)) {
  fail(`imageInputFingerprintBaseSha ${JSON.stringify(baseSha)} is not a full commit SHA`);
} else {
  try {
    git(["cat-file", "-e", `${baseSha}^{commit}`]);
    baseResolves = true;
  } catch {
    fail(`imageInputFingerprintBaseSha ${baseSha.slice(0, 8)} does not resolve to a commit`);
  }
}

// securityCheckpointSha is a different fact and must not be the build source.
// If the checkpoint's trees differ from the base's and the record carries the
// checkpoint's, the substitution is caught by the recomputation below; this
// check names the substitution directly when both facts are present.
if (baseResolves && typeof action.securityCheckpointSha === "string") {
  try {
    const checkpointSrc = git(["rev-parse", `${action.securityCheckpointSha}:src`]);
    const baseSrc = git(["rev-parse", `${baseSha}:src`]);
    if (checkpointSrc !== baseSrc && fingerprint?.srcTreeHash === checkpointSrc) {
      fail(
        `srcTreeHash carries the security checkpoint's tree (${checkpointSrc.slice(0, 12)}…), not the fingerprint base's; the checkpoint records lineage, not build source`
      );
    }
  } catch {
    // A checkpoint that no longer resolves is someone else's failure to report.
  }
}

// 1 & 2 — file inputs, recomputed from disk.
for (const [key, rel] of Object.entries(FILE_INPUTS)) {
  const abs = path.join(rootDir, rel);
  if (!fs.existsSync(abs)) {
    fail(`${rel} is missing; every image input must exist`);
    continue;
  }
  const actual = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  if (fingerprint?.[key] && actual !== fingerprint[key]) {
    fail(`${rel} hashes to ${actual.slice(0, 12)}…, fingerprint records ${fingerprint[key].slice(0, 12)}…; the input changed after the fingerprint was taken`);
  }
}

// 3 & 4 — tree inputs, recomputed from HEAD, with a dirty-tree guard so an
// uncommitted or untracked change cannot hide behind a matching commit.
for (const [key, rel] of Object.entries(TREE_INPUTS)) {
  let headTree;
  try {
    headTree = git(["rev-parse", `HEAD:${rel}`]);
  } catch {
    fail(`${rel}/ does not exist at HEAD; every image input must exist`);
    continue;
  }
  if (fingerprint?.[key] && headTree !== fingerprint[key]) {
    fail(`${rel}/ at HEAD is ${headTree.slice(0, 12)}…, fingerprint records ${fingerprint[key].slice(0, 12)}…; the tree changed after the fingerprint was taken`);
  }
}
const dirt = execFileSync(
  "git",
  ["status", "--porcelain", "--untracked-files=all", "--", ...ALL_DIFF_PATHS],
  { cwd: rootDir, encoding: "utf8" }
).trim();
if (dirt) {
  fail(`the working tree is dirty on image-input paths; the fingerprint describes commits, not this state:\n${dirt}`);
}

// 8 & 9 — HEAD must be image-input-equivalent to the base. This is the
// self-reference escape: the commit carrying the record cannot be its own base,
// so equivalence — an empty diff over exactly the image-input paths — is the
// required relation, and anything non-empty means the fingerprint is stale.
if (baseResolves) {
  const changed = git(["diff", "--name-only", baseSha, "HEAD", "--", ...ALL_DIFF_PATHS]);
  if (changed) {
    fail(
      `HEAD differs from the fingerprint base ${baseSha.slice(0, 8)} on image-input paths: ${changed.split("\n").join(", ")}; the fingerprint no longer describes what a build at HEAD would copy`
    );
  }
}

// 10 — the record must be the generator's output, not a hand edit. The
// generator's --check regenerates and byte-compares, so any manual edit —
// including one that keeps every hash plausible — comes back stale.
try {
  execFileSync(process.execPath, [path.join(rootDir, "scripts/generate-rcap-staging-action.mjs"), "--check"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000
  });
} catch (error) {
  fail(`the staging action does not survive its own generator --check (hand-edited or stale): ${String(error.stderr || error.message).trim().split("\n")[0]}`);
}

if (failures.length > 0) {
  console.error("Image-input fingerprint verification FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("verify-rcap-image-input-fingerprint passed: all seven image-input hashes independently recomputed and matching.");
console.log(`  base ${baseSha.slice(0, 12)}… is image-input-equivalent to HEAD; securityCheckpointSha is not the build source; the record survives generator --check.`);
