#!/usr/bin/env node
// Proves each image-input fingerprint defence is load-bearing.
//
// Every case below fakes one way the fingerprint could stop describing the
// build source — an input drifts, a tree changes, the record is hand-edited,
// the base is swapped for the security checkpoint — and requires the verifier
// to go red for the RIGHT reason, asserted on the message rather than only the
// exit code. A defence that stays green under its own failure mode is
// decoration, and a fingerprint held together by decoration is how an image
// gets published from a tree the freeze record does not name.
//
// Mutations that touch tracked files are transient: originals are captured as
// bytes up front, restored in every exit path (including signals, via the
// shared restore guard), and byte-verified at the end. Nothing here may leave
// a committed image-input path changed.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and two
// interrupted runs left tracked mutations behind. The journal this writes is
// recovered by the next repository command even if this process is killed.
registerTrackedMutation("test-rcap-image-fingerprint-mutations.mjs", [
  "data/rcap-staging-action.json",
  "package.json",
  "data/rcap-render/worker-publication-evidence.json"
]);


const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTION = "data/rcap-staging-action.json";
const PKG = "package.json";
const TSCONFIG = "tsconfig.json";
const PUBLICATION = "data/rcap-render/worker-publication-evidence.json";
const SRC_CANARY = "src/rcap-fingerprint-mutation-canary.tmp";
const LIB_CANARY = "scripts/lib/rcap-fingerprint-mutation-canary.tmp";

const TRACKED = [ACTION, PKG, TSCONFIG, PUBLICATION];
const originals = new Map(TRACKED.map((rel) => [rel, fs.readFileSync(path.join(rootDir, rel))]));
const CANARIES = [SRC_CANARY, LIB_CANARY];

function restore() {
  for (const [rel, bytes] of originals) fs.writeFileSync(path.join(rootDir, rel), bytes);
  for (const rel of CANARIES) fs.rmSync(path.join(rootDir, rel), { force: true });
}

const disposeGuard = registerMutationRestore(restore);

function readAction() {
  return JSON.parse(fs.readFileSync(path.join(rootDir, ACTION), "utf8"));
}

function writeAction(value) {
  fs.writeFileSync(path.join(rootDir, ACTION), `${JSON.stringify(value, null, 2)}\n`);
}

function runScript(...argv) {
  const result = spawnSync(process.execPath, argv, {
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

const FINGERPRINT_VERIFIER = [path.join(rootDir, "scripts/verify-rcap-image-input-fingerprint.mjs")];
const STAGING_ACTION_CHECK = [path.join(rootDir, "scripts/generate-rcap-staging-action.mjs"), "--check"];

function mutation(name, mutate, expectedMarker, argv = FINGERPRINT_VERIFIER) {
  restore();
  try {
    mutate();
  } catch (error) {
    console.error(`  ERROR    ${name}: could not apply the mutation — ${error.message}`);
    failed += 1;
    restore();
    return;
  }

  const { status, timedOut, output } = runScript(...argv);
  restore();

  if (timedOut) {
    console.error(`  TIMEOUT  ${name}: the verifier did not finish; an unfinished case proves nothing`);
    failed += 1;
    return;
  }
  if (status === 0) {
    console.error(`  SURVIVED ${name}: the fingerprint verifier still passed`);
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

// 1 — a file input's bytes drift after the fingerprint was taken.
mutation(
  "a file input changes (package.json bytes drift)",
  () => {
    const abs = path.join(rootDir, PKG);
    fs.writeFileSync(abs, `${fs.readFileSync(abs, "utf8")}\n`);
  },
  "the input changed after the fingerprint was taken"
);

// 2 — a file input is missing entirely.
mutation(
  "a file input is missing (tsconfig.json removed)",
  () => {
    fs.rmSync(path.join(rootDir, TSCONFIG));
  },
  "tsconfig.json is missing"
);

// 3 — src/ changes, as an untracked working-tree file a commit-only diff
// would never see.
mutation(
  "src/ changes (untracked file appears)",
  () => {
    fs.writeFileSync(path.join(rootDir, SRC_CANARY), "canary\n");
  },
  "dirty on image-input paths"
);

// 4 — scripts/lib/ changes the same way.
mutation(
  "scripts/lib/ changes (untracked file appears)",
  () => {
    fs.writeFileSync(path.join(rootDir, LIB_CANARY), "canary\n");
  },
  "dirty on image-input paths"
);

// 5 — the fingerprint omits a required input.
mutation(
  "the fingerprint omits a required input",
  () => {
    const action = readAction();
    delete action.imageInputFingerprint.workerEntrypointSha256;
    writeAction(action);
  },
  "fingerprint omits workerEntrypointSha256"
);

// 6 — the hashing algorithm changes without a migration.
mutation(
  "the hashing algorithm is silently changed",
  () => {
    const action = readAction();
    action.imageInputFingerprint.algorithm = "sha512-file+git-tree/v2";
    writeAction(action);
  },
  "an algorithm change requires an explicit migration"
);

// 7 — the security checkpoint's trees are substituted for the build source.
mutation(
  "securityCheckpointSha's trees are substituted for the image-input source",
  () => {
    const action = readAction();
    const checkpointSrc = spawnSync("git", ["rev-parse", `${action.securityCheckpointSha}:src`], {
      cwd: rootDir,
      encoding: "utf8"
    }).stdout.trim();
    const checkpointLib = spawnSync("git", ["rev-parse", `${action.securityCheckpointSha}:scripts/lib`], {
      cwd: rootDir,
      encoding: "utf8"
    }).stdout.trim();
    action.imageInputFingerprint.srcTreeHash = checkpointSrc;
    action.imageInputFingerprint.scriptsLibTreeHash = checkpointLib;
    writeAction(action);
  },
  "not the fingerprint base's; the checkpoint records lineage, not build source"
);

// 8 — the base is swapped to a commit that differs on image-input paths, which
// is also what a stale fingerprint looks like when presented as current.
mutation(
  "the fingerprint base differs from HEAD on image-input paths (stale-as-current)",
  () => {
    const action = readAction();
    action.imageInputFingerprintBaseSha = action.securityCheckpointSha;
    writeAction(action);
  },
  "on image-input paths"
);

// 9 — a recorded hash is rewritten to something plausible but wrong.
mutation(
  "a recorded hash is rewritten (stale record presented as current)",
  () => {
    const action = readAction();
    action.imageInputFingerprint.packageJsonSha256 = "0".repeat(64);
    writeAction(action);
  },
  "fingerprint records 000000000000"
);

// 10 — an innocuous-looking hand edit that keeps every hash intact.
mutation(
  "the action is hand-edited rather than regenerated",
  () => {
    const action = readAction();
    action.note = `${action.note} (edited by hand)`;
    writeAction(action);
  },
  "does not survive its own generator --check"
);

// 11 — the equivalence requirement itself is waived.
mutation(
  "imageInputEquivalenceRequired is waived",
  () => {
    const action = readAction();
    action.imageInputEquivalenceRequired = false;
    writeAction(action);
  },
  "cannot be waived"
);

// 12 — the published digest is kept while its build source is swapped for a
// commit that differs on image-input paths. This is what a STALE DIGEST looks
// like, and it is not hypothetical: the record named sha256:337083a2 built from
// 5987870c long after src had moved on, and the only agreement test was the
// Dockerfile and lockfile hashes — two files that had not changed either. The
// generator now compares the publication's own sourceSha against the
// fingerprint base under the same equivalence rule it applies everywhere else.
mutation(
  "the published digest's build source differs from the fingerprint base",
  () => {
    const action = readAction();
    const evidence = JSON.parse(fs.readFileSync(path.join(rootDir, PUBLICATION), "utf8"));
    // A real commit in this history, and demonstrably not image-input-equivalent:
    // the checkpoint predates the accepted source tree.
    evidence.sourceSha = action.securityCheckpointSha;
    fs.writeFileSync(path.join(rootDir, PUBLICATION), `${JSON.stringify(evidence, null, 2)}\n`);
  },
  "is not image-input-equivalent to the fingerprint base",
  STAGING_ACTION_CHECK
);

// 13 — the publication record simply drops its sourceSha, which would leave the
// digest unattributable rather than merely wrong.
mutation(
  "the publication record carries no build source at all",
  () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(rootDir, PUBLICATION), "utf8"));
    delete evidence.sourceSha;
    fs.writeFileSync(path.join(rootDir, PUBLICATION), `${JSON.stringify(evidence, null, 2)}\n`);
  },
  "the record carries no full-length sourceSha",
  STAGING_ACTION_CHECK
);

restore();
disposeGuard();

for (const [rel, bytes] of originals) {
  if (!fs.readFileSync(path.join(rootDir, rel)).equals(bytes)) {
    console.error(`  DIRTY    ${rel} was not restored to its original bytes`);
    failed += 1;
  }
}
for (const rel of CANARIES) {
  if (fs.existsSync(path.join(rootDir, rel))) {
    console.error(`  DIRTY    ${rel} was left behind`);
    failed += 1;
  }
}

const total = caught + failed;
if (failed > 0) {
  console.error(`\ntest-rcap-image-fingerprint-mutations FAILED: ${failed} of ${total} did not hold.`);
  process.exit(1);
}
console.log(`\ntest-rcap-image-fingerprint-mutations passed: ${caught}/${caught} mutations red, files restored.`);
console.log("The fingerprint is a constraint on the build source, not a description that drifts.");
