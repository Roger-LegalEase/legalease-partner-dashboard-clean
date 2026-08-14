#!/usr/bin/env node
// Proves the published worker digest is BOUND to the fingerprint it claims.
//
// The defect this exists to prevent was real and shipped. The staging action's
// workerImageDigest resolved to sha256:337083a2…, built from source 5987870c,
// while the fingerprint described a tree forty-odd source files later —
// payment-adapter.ts, consumer-render-request.ts, packet-route-resolver.ts, the
// checkout route. Nothing objected, because the only agreement test between the
// publication record and the fingerprint was the Dockerfile and lockfile
// hashes, and neither of those two files had changed. The record's own comment
// claimed "a digest for the wrong source cannot be recorded here". It could.
//
// The rule now applied is the same image-input equivalence rule used everywhere
// else in the generator: the publication's sourceSha must be
// image-input-equivalent to the fingerprint base. Case 1 below is the exact
// shape of the original defect — Dockerfile and lockfile hashes held identical
// on purpose, only the source tree moved — so this file fails if that hole is
// ever reopened.
//
// Why this is not a case inside test-rcap-image-fingerprint-mutations: that
// harness holds the repository mutation lock, and the staging-action generator
// asserts the lock is free before reading anything. Its refusal there is
// correct — a tool that reads a tree mid-mutation reports fiction — so driving
// the generator has to happen from a process that does not hold the lock. The
// restore guard is still registered, so a signal cannot strand the file.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLICATION = "data/rcap-render/worker-publication-evidence.json";
const ACTION = "data/rcap-staging-action.json";

const original = fs.readFileSync(path.join(rootDir, PUBLICATION));
function restore() {
  fs.writeFileSync(path.join(rootDir, PUBLICATION), original);
}
const disposeGuard = registerMutationRestore(restore);

function readPublication() {
  return JSON.parse(fs.readFileSync(path.join(rootDir, PUBLICATION), "utf8"));
}
function writePublication(value) {
  fs.writeFileSync(path.join(rootDir, PUBLICATION), `${JSON.stringify(value, null, 2)}\n`);
}
function readAction() {
  return JSON.parse(fs.readFileSync(path.join(rootDir, ACTION), "utf8"));
}

function runGeneratorCheck() {
  const result = spawnSync(process.execPath, [path.join(rootDir, "scripts/generate-rcap-staging-action.mjs"), "--check"], {
    cwd: rootDir,
    encoding: "utf8",
    timeout: 300_000,
    killSignal: "SIGKILL"
  });
  return {
    status: result.status,
    timedOut: result.error?.code === "ETIMEDOUT" || result.signal === "SIGKILL",
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`
  };
}

let failed = 0;
let caught = 0;

function mutation(name, mutate, expectedMarker) {
  restore();
  try {
    mutate();
  } catch (error) {
    console.error(`  ERROR    ${name}: could not apply the mutation — ${error.message}`);
    failed += 1;
    restore();
    return;
  }

  const { status, timedOut, output } = runGeneratorCheck();
  restore();

  if (timedOut) {
    console.error(`  TIMEOUT  ${name}: the generator did not finish; an unfinished case proves nothing`);
    failed += 1;
    return;
  }
  if (status === 0) {
    console.error(`  SURVIVED ${name}: the staging action still generated`);
    failed += 1;
    return;
  }
  if (!output.includes(expectedMarker)) {
    console.error(`  WRONG    ${name}: red, but not for the expected reason`);
    console.error(`           expected: ${expectedMarker}`);
    console.error(`           got:\n${output.trim().split("\n").map((l) => `             ${l}`).join("\n")}`);
    failed += 1;
    return;
  }
  caught += 1;
  console.log(`  caught   ${name}`);
}

// Baseline first. A mutation suite whose subject is already red proves nothing,
// and this one would have been red for the whole window before the replacement
// image existed.
{
  const { status, output } = runGeneratorCheck();
  if (status !== 0) {
    console.error("test-rcap-worker-digest-binding-mutations FAILED: the committed record is not green to begin with.");
    console.error(output.trim());
    restore();
    disposeGuard();
    process.exit(1);
  }
  const action = readAction();
  const evidence = readPublication();
  console.log(`  ok       baseline green — digest ${String(evidence.immutableRegistryDigest).slice(0, 20)}… from source ${String(evidence.sourceSha).slice(0, 8)}`);
  console.log(`           fingerprint base ${String(action.imageInputFingerprintBaseSha).slice(0, 8)}, image-input-equivalent to it`);
}

// 1 — THE original defect, reproduced exactly: the source tree differs while the
// Dockerfile and lockfile hashes are held identical. This is the case that used
// to pass.
mutation(
  "the build source differs while Dockerfile and lockfile hashes still match",
  () => {
    const action = readAction();
    const evidence = readPublication();
    // Pin both hashes to the fingerprint's own values, so the old agreement test
    // is satisfied in full and only the source tree is wrong.
    evidence.dockerfileSha256 = action.imageInputFingerprint.dockerfileSha256;
    evidence.lockfileSha256 = action.imageInputFingerprint.packageLockSha256;
    evidence.sourceSha = action.securityCheckpointSha;
    writePublication(evidence);
  },
  "is not image-input-equivalent to the fingerprint base"
);

// 2 — the record names no build source at all, leaving the digest unattributable
// rather than merely wrong.
mutation(
  "the publication record carries no build source",
  () => {
    const evidence = readPublication();
    delete evidence.sourceSha;
    writePublication(evidence);
  },
  "the record carries no full-length sourceSha"
);

// 3 — a source that is not a commit in this repository at all.
mutation(
  "the build source does not resolve to a commit",
  () => {
    const evidence = readPublication();
    evidence.sourceSha = "0".repeat(40);
    writePublication(evidence);
  },
  "is not image-input-equivalent to the fingerprint base"
);

// 4 — the publication contract itself is weakened. A mutable `latest` would let
// the thing that was verified stop being the thing that runs.
mutation(
  "a mutable latest tag is declared",
  () => {
    const evidence = readPublication();
    evidence.mutableLatestTagCreated = true;
    writePublication(evidence);
  },
  "violates the publication contract"
);

// 5 — the package is declared public. Roger has not authorized public package
// visibility, and the staging worker host reads it with a scoped pull secret.
mutation(
  "the package is declared public",
  () => {
    const evidence = readPublication();
    evidence.packageVisibility = "public";
    writePublication(evidence);
  },
  "violates the publication contract"
);

// 6 — a local image ID substituted for an immutable registry digest.
mutation(
  "a malformed digest is recorded",
  () => {
    const evidence = readPublication();
    evidence.immutableRegistryDigest = "d7ead6a5c4d3ba3bdfce31474b3cb853f53376d83fe18f16e567cf8756eea15f";
    writePublication(evidence);
  },
  "malformed immutable digest"
);

restore();
disposeGuard();

if (!fs.readFileSync(path.join(rootDir, PUBLICATION)).equals(original)) {
  console.error(`  DIRTY    ${PUBLICATION} was not restored to its original bytes`);
  failed += 1;
}

const total = caught + failed;
if (failed > 0) {
  console.error(`\ntest-rcap-worker-digest-binding-mutations FAILED: ${failed} of ${total} did not hold.`);
  process.exit(1);
}
console.log(`\ntest-rcap-worker-digest-binding-mutations passed: ${caught}/${caught} mutations red, file restored.`);
console.log("A published digest and the fingerprint it is recorded beside now have to describe one build.");
