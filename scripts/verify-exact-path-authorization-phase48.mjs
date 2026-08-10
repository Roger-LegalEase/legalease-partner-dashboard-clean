// Negative regressions for the phase-48 exact-path, hash-pinned authorization
// in assertSourceEngineChangeScope — the same escape-route checks the phase-49
// grant carries, applied to this branch's grant.
//
// The grant lets exactly one file exist under supabase/ at exact bytes:
// supabase/phase-48-rcap-packet-render-jobs.sql. Every case below constructs a
// condition the authorization must NOT cover and requires the guard to reject
// it. Cases run in a throwaway git clone so nothing here can touch the real
// tree, the real queue, or the real HEAD.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const realRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHORIZED_SQL = "supabase/phase-48-rcap-packet-render-jobs.sql";

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-authz48-"));
function sh(cmd) {
  return spawnSync("sh", ["-c", cmd], { cwd: sandbox, encoding: "utf8" });
}
function fileHash(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}
function writeQueue(queue) {
  fs.writeFileSync(path.join(sandbox, "data/rcap-authorization-queue.json"), `${JSON.stringify(queue, null, 2)}\n`);
}
function entry(overrides = {}) {
  return {
    id: "auth-test-phase-48",
    phase: 48,
    decision: "approved",
    authorizedBy: "Roger Roman",
    authorizedAt: "2026-08-10",
    authorizationScope: "repository_integration_delivery_branch",
    authorizedPaths: [AUTHORIZED_SQL],
    authorizedSha256: [fileHash(path.join(sandbox, AUTHORIZED_SQL))],
    ...overrides
  };
}

// --- sandbox ----------------------------------------------------------------
fs.mkdirSync(path.join(sandbox, "scripts"), { recursive: true });
fs.mkdirSync(path.join(sandbox, "supabase"), { recursive: true });
fs.mkdirSync(path.join(sandbox, "data"), { recursive: true });
fs.copyFileSync(
  path.join(realRoot, "scripts/source-engine-change-scope.mjs"),
  path.join(sandbox, "scripts/source-engine-change-scope.mjs")
);
// A stub contract verifier isolates the authorization logic; the real contract
// check has its own suite (verify-rcap-render-job-contract.mjs).
fs.writeFileSync(path.join(sandbox, "scripts/verify-rcap-render-job-contract.mjs"), "process.exit(0);\n");

sh("git init -q -b main && git config user.email t@t && git config user.name t");
fs.writeFileSync(path.join(sandbox, "base.txt"), "base\n");
sh("git add -A && git commit -qm base");
sh("git checkout -q -b work");
fs.copyFileSync(path.join(realRoot, AUTHORIZED_SQL), path.join(sandbox, AUTHORIZED_SQL));
writeQueue({ entries: [entry()] });
const runner = path.join(sandbox, "run-guard.mjs");
fs.writeFileSync(
  runner,
  `import { assertSourceEngineChangeScope } from "./scripts/source-engine-change-scope.mjs";
const failures = [];
assertSourceEngineChangeScope({ rootDir: process.cwd(), failures, extraAllowedFiles: [], extraForbiddenPrefixes: [] });
console.log(JSON.stringify(failures));
`
);
sh("git add -A && git commit -qm work");

function runGuard() {
  const result = spawnSync("node", [runner], { cwd: sandbox, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`guard runner crashed: ${result.stderr}`);
  return JSON.parse(result.stdout.trim());
}
function commitAll(message) {
  sh(`git add -A && git commit -qm '${message}'`);
}
function resetToGood() {
  sh("git checkout -q work && git reset -q --hard");
  const extra = path.join(sandbox, "supabase/phase-48b-extra.sql");
  if (fs.existsSync(extra)) fs.rmSync(extra);
}

// --- case 0: the grant itself is honored ------------------------------------
assert.deepEqual(runGuard(), [], "the exact grant at exact bytes must pass");

// --- case 1: content drift voids the authorization --------------------------
fs.appendFileSync(path.join(sandbox, AUTHORIZED_SQL), "-- drifted\n");
commitAll("drift");
let failures = runGuard();
assert.ok(
  failures.some((failure) => /does not match authorized|authorization is void/.test(failure)),
  `drifted bytes must void the grant (got ${JSON.stringify(failures)})`
);
sh("git reset -q --hard HEAD~1");

// --- case 2: a renamed migration is not the authorized file -----------------
sh(`git mv ${AUTHORIZED_SQL} supabase/phase-48-renamed.sql`);
commitAll("rename");
failures = runGuard();
assert.ok(
  failures.some((failure) => /phase-48-renamed\.sql/.test(failure)),
  `a renamed file must be refused (got ${JSON.stringify(failures)})`
);
sh("git reset -q --hard HEAD~1");

// --- case 3: an unauthorized sibling defeats the whole set ------------------
fs.writeFileSync(path.join(sandbox, "supabase/phase-48b-extra.sql"), "select 1;\n");
commitAll("sibling");
failures = runGuard();
assert.ok(
  failures.some((failure) => /phase-48b-extra\.sql/.test(failure)),
  `an unauthorized sibling must be refused (got ${JSON.stringify(failures)})`
);
// The guard's all-or-nothing rule: with an unauthorized path in the set, the
// run as a whole fails, so the authorized path cannot ride through either.
assert.ok(
  failures.some((failure) => /alongside authorized ones|does not cover the extra paths/.test(failure)),
  `a mixed set must be rejected whole (got ${JSON.stringify(failures)})`
);
sh("git reset -q --hard HEAD~1");

// --- case 4: a malformed record grants nothing ------------------------------
for (const bad of [
  entry({ decision: "pending" }),
  entry({ authorizedSha256: undefined }),
  entry({ authorizedSha256: ["not-a-sha"] }),
  entry({ authorizedBy: "" }),
  entry({ phase: "forty-eight" })
]) {
  writeQueue({ entries: [bad] });
  commitAll("malformed");
  failures = runGuard();
  assert.ok(
    failures.length > 0,
    `a malformed record must fail, not silently allow (${JSON.stringify(bad)})`
  );
  sh("git reset -q --hard HEAD~1");
}

// --- case 5: wildcard and prefix paths grant nothing ------------------------
for (const widened of [["supabase/"], ["supabase/*"], ["supabase/phase-48-*.sql"]]) {
  writeQueue({ entries: [entry({ authorizedPaths: widened, authorizedSha256: [crypto.createHash("sha256").update("x").digest("hex")] })] });
  commitAll("widened");
  failures = runGuard();
  assert.ok(
    failures.some((failure) => failure.includes(AUTHORIZED_SQL)),
    `a widened path ${widened[0]} must not cover the migration (got ${JSON.stringify(failures)})`
  );
  sh("git reset -q --hard HEAD~1");
}

// --- case 6: a red contract verifier withholds the authorization ------------
fs.writeFileSync(path.join(sandbox, "scripts/verify-rcap-render-job-contract.mjs"), "console.error('contract drift'); process.exit(1);\n");
commitAll("red contract");
failures = runGuard();
assert.ok(
  failures.some((failure) => /contract verifier fails|authorization requires it green/.test(failure)),
  `a red contract verifier must withhold the authorization (got ${JSON.stringify(failures)})`
);

fs.rmSync(sandbox, { recursive: true, force: true });
console.log("verify-exact-path-authorization-phase48 passed: the phase-48 grant covers exactly one path at exact bytes and nothing else.");
