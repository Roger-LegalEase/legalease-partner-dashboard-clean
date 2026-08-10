// Negative regressions for the exact-path, hash-pinned production
// authorization in assertSourceEngineChangeScope.
//
// The grant lets two exact phase-49 files exist under supabase/ at exact
// bytes. Everything this file does is prove the grant is no wider than that:
// each case below constructs a condition the authorization must NOT cover and
// requires the guard to reject it. A green run means every escape route is
// still closed.
//
// Cases run against a throwaway clone of the repository so nothing here can
// touch the real tree, the real queue, or the real HEAD.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const realRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHORIZED_SQL = "supabase/phase-49-rcap-packet-render-jobs.sql";
const AUTHORIZED_TEST = "supabase/tests/phase-49-packet-render-jobs.test.sql";

const checks = [];

// --- sandbox ---------------------------------------------------------------
// A minimal clone: guard script, queue, the two authorized files, and a git
// history where main lacks them so they appear in the diff, exactly as on the
// real branch.

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-authz-"));
function sh(cmd, cwd = sandbox) {
  const res = spawnSync("sh", ["-c", cmd], { cwd, encoding: "utf8" });
  return res;
}

function fileHash(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function setupSandbox() {
  fs.mkdirSync(path.join(sandbox, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(sandbox, "supabase/tests"), { recursive: true });
  fs.mkdirSync(path.join(sandbox, "data"), { recursive: true });

  fs.copyFileSync(
    path.join(realRoot, "scripts/source-engine-change-scope.mjs"),
    path.join(sandbox, "scripts/source-engine-change-scope.mjs")
  );
  // A stub contract verifier that passes, so the sandbox isolates the
  // authorization logic; the real contract check has its own suite.
  fs.writeFileSync(
    path.join(sandbox, "scripts/verify-rcap-render-job-contract.mjs"),
    "process.exit(0);\n"
  );

  sh("git init -q -b main && git config user.email t@t && git config user.name t");
  fs.writeFileSync(path.join(sandbox, "base.txt"), "base\n");
  sh("git add -A && git commit -qm base");
  // main is the baseline WITHOUT the supabase files.
  sh("git checkout -q -b work");
  fs.copyFileSync(path.join(realRoot, AUTHORIZED_SQL), path.join(sandbox, AUTHORIZED_SQL));
  fs.copyFileSync(path.join(realRoot, AUTHORIZED_TEST), path.join(sandbox, AUTHORIZED_TEST));
  writeQueue(defaultQueue());
  sh("git add -A && git commit -qm work");
  goodCommit = sh("git rev-parse HEAD").stdout.trim();
  // The guard resolves origin/main or main; a local main suffices.
}

function defaultQueue() {
  return {
    entries: [
      {
        id: "auth-test-phase-49",
        phase: 49,
        decision: "approved",
        authorizedBy: "Roger Roman",
        authorizedAt: "2026-08-10",
        authorizationScope: "repository_integration_and_conditional_production_application",
        authorizedPaths: [AUTHORIZED_SQL, AUTHORIZED_TEST],
        authorizedSha256: [
          fileHash(path.join(sandbox, AUTHORIZED_SQL)),
          fileHash(path.join(sandbox, AUTHORIZED_TEST))
        ]
      }
    ]
  };
}

function writeQueue(queue) {
  fs.writeFileSync(
    path.join(sandbox, "data/rcap-authorization-queue.json"),
    `${JSON.stringify(queue, null, 2)}\n`
  );
}

// Runs the guard inside the sandbox and returns its failures array.
function runGuard() {
  const runner = `
import { assertSourceEngineChangeScope } from "./scripts/source-engine-change-scope.mjs";
const failures = [];
assertSourceEngineChangeScope({ rootDir: process.cwd(), failures });
console.log(JSON.stringify(failures));
`;
  fs.writeFileSync(path.join(sandbox, "run-guard.mjs"), runner);
  const res = sh("node run-guard.mjs");
  if (res.status !== 0) {
    throw new Error(`guard runner crashed: ${res.stderr}`);
  }
  return JSON.parse(res.stdout.trim().split("\n").at(-1));
}

function commitAll(message) {
  sh(`git add -A && git commit -qm ${JSON.stringify(message)}`);
}

// The known-good commit on `work`: both authorized files at authorized bytes,
// valid queue. Every case resets hard to it, so cases cannot leak into each
// other and the queue is rebuilt only after the files are back on disk.
let goodCommit = null;

function resetToGood() {
  sh(`git checkout -q work && git reset -q --hard ${goodCommit} && git clean -qfd`);
}

function check(label, fn) {
  fn();
  checks.push(label);
  resetToGood();
}

setupSandbox();

// ---------------------------------------------------------------------------

check("baseline: the two authorized files at authorized bytes pass", () => {
  const failures = runGuard();
  assert.deepEqual(failures, [], `expected clean, got: ${failures.join(" | ")}`);
});

check("a sibling migration under supabase/ is rejected", () => {
  fs.writeFileSync(path.join(sandbox, "supabase/phase-50-sibling.sql"), "-- sibling\n");
  commitAll("sibling");
  const failures = runGuard();
  assert.ok(failures.length > 0, "sibling migration sailed through");
  assert.ok(failures.some((f) => f.includes("phase-50-sibling.sql")), failures.join(" | "));
});

check("a renamed copy of the authorized migration is rejected", () => {
  fs.renameSync(
    path.join(sandbox, AUTHORIZED_SQL),
    path.join(sandbox, "supabase/phase-49-renamed.sql")
  );
  commitAll("rename");
  const failures = runGuard();
  assert.ok(
    failures.some((f) => f.includes("phase-49-renamed.sql")),
    `renamed migration not rejected: ${failures.join(" | ")}`
  );
});

check("a third supabase file alongside the authorized two is rejected, and blocks the authorized ones too", () => {
  fs.writeFileSync(path.join(sandbox, "supabase/seed-extra.sql"), "-- extra\n");
  commitAll("third file");
  const failures = runGuard();
  assert.ok(
    failures.some((f) => f.includes("alongside authorized") || f.includes("seed-extra.sql")),
    `third file not rejected: ${failures.join(" | ")}`
  );
});

check("a prefix collision cannot exploit the exact-path match", () => {
  // A path that begins with the authorized path string but is a different file.
  const evil = `${AUTHORIZED_SQL}.extra.sql`;
  fs.writeFileSync(path.join(sandbox, evil), "-- prefix collision\n");
  commitAll("prefix collision");
  const failures = runGuard();
  assert.ok(
    failures.some((f) => f.includes(".extra.sql")),
    `prefix collision not rejected: ${failures.join(" | ")}`
  );
});

check("modified bytes at an authorized path void the authorization", () => {
  fs.appendFileSync(path.join(sandbox, AUTHORIZED_SQL), "-- drift\n");
  commitAll("byte drift");
  const failures = runGuard();
  assert.ok(
    failures.some((f) => f.includes("does not match authorized")),
    `modified bytes not rejected: ${failures.join(" | ")}`
  );
});

check("an authorization for another phase grants nothing here", () => {
  const queue = defaultQueue();
  queue.entries[0].phase = 51;
  queue.entries[0].authorizedPaths = ["supabase/phase-51-other.sql"];
  queue.entries[0].authorizedSha256 = ["0".repeat(64)];
  writeQueue(queue);
  commitAll("other phase");
  const failures = runGuard();
  assert.ok(
    failures.some((f) => f.includes(AUTHORIZED_SQL)),
    `files passed with no covering authorization: ${failures.join(" | ")}`
  );
});

check("a directory-level or wildcard authorization is treated as malformed and grants nothing", () => {
  const queue = defaultQueue();
  queue.entries[0].authorizedPaths = ["supabase/"];
  queue.entries[0].authorizedSha256 = ["not-a-hash"];
  writeQueue(queue);
  commitAll("directory grant");
  const failures = runGuard();
  assert.ok(
    failures.some((f) => f.includes("malformed") || f.includes(AUTHORIZED_SQL)),
    `directory-level grant was honoured: ${failures.join(" | ")}`
  );
});

check("a missing authorization record rejects the files", () => {
  writeQueue({ entries: [] });
  commitAll("no record");
  const failures = runGuard();
  assert.ok(
    failures.some((f) => f.includes(AUTHORIZED_SQL)),
    `files passed with an empty queue: ${failures.join(" | ")}`
  );
});

check("a malformed authorization record is itself a failure and grants nothing", () => {
  const queue = defaultQueue();
  delete queue.entries[0].decision;
  delete queue.entries[0].authorizedBy;
  writeQueue(queue);
  commitAll("malformed record");
  const failures = runGuard();
  assert.ok(
    failures.some((f) => f.includes("malformed")),
    `malformed record did not fail loudly: ${failures.join(" | ")}`
  );
  assert.ok(
    failures.some((f) => f.includes(AUTHORIZED_SQL)),
    `malformed record still granted the files: ${failures.join(" | ")}`
  );
});

check("hash-length mismatch between paths and digests grants nothing", () => {
  const queue = defaultQueue();
  queue.entries[0].authorizedSha256 = queue.entries[0].authorizedSha256.slice(0, 1);
  writeQueue(queue);
  commitAll("length mismatch");
  const failures = runGuard();
  assert.ok(failures.some((f) => f.includes("malformed")), failures.join(" | "));
});

fs.rmSync(sandbox, { recursive: true, force: true });

console.log("Exact-path authorization verification passed.");
for (const label of checks) console.log(`  ok  ${label}`);
console.log(`\n${checks.length} checks passed.`);
