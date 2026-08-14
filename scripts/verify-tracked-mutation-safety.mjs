#!/usr/bin/env node
// Proof that an interrupted mutation harness cannot strand tracked bytes.
//
//   node scripts/verify-tracked-mutation-safety.mjs
//
// Every case here kills a real process mid-mutation and then checks the bytes
// on disk. Nothing is simulated: the child actually writes to a real tracked
// file, actually receives the signal, and the assertion is a SHA-256 of what is
// left behind.
//
// SIGKILL is deliberately included and deliberately expected to strand bytes —
// no process can catch it. The case proves the recovery path instead: the
// journal survives, and the next repository command puts the file back.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  MUTATION_JOURNAL_PATH,
  MUTATION_LOCK_PATH,
  recoverStaleMutations,
  assertTreeNotMidMutation
} from "./lib/tracked-mutation-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const rel = (p) => path.relative(rootDir, p);

// Two real tracked files, one application source and one migration, chosen
// because both have actually been stranded by an interrupted run.
const APP_SOURCE = path.join(rootDir, "src/lib/expungement-ai/payment-adapter.ts");
const MIGRATION = path.join(rootDir, "supabase/phase-52-rcap-consumer-payment-authority.sql");
const MIGRATION_54 = path.join(rootDir, "supabase/phase-54-rcap-person-namespace-hardening.sql");

const failures = [];
let checks = 0;
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};

const scratch = path.join(rootDir, ".rcap-mutation", "child.mjs");

/** A child that registers the guard, mutates, then waits to be killed. */
function childSource(targets) {
  return `import fs from "node:fs";
import { registerTrackedMutation } from ${JSON.stringify(path.join(rootDir, "scripts/lib/tracked-mutation-guard.mjs"))};
registerTrackedMutation("verify-tracked-mutation-safety child", ${JSON.stringify(targets.map(rel))});
for (const target of ${JSON.stringify(targets)}) {
  fs.writeFileSync(target, fs.readFileSync(target, "utf8") + "\\n-- MUTATION THAT MUST NOT SURVIVE\\n");
}
process.stdout.write("mutated\\n");
if (process.env.FATAL === "1") throw new Error("deliberate uncaught exception mid-mutation");
setInterval(() => {}, 1000);
`;
}

async function runChildUntilMutated(targets, env = {}) {
  fs.mkdirSync(path.dirname(scratch), { recursive: true });
  fs.writeFileSync(scratch, childSource(targets));
  const child = spawn(process.execPath, [scratch], { cwd: rootDir, env: { ...process.env, ...env } });
  let out = "";
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("child never reported a mutation")), 20000);
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
      if (out.includes("mutated")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  return child;
}

const waitForExit = (child) => new Promise((resolve) => {
  if (child.exitCode !== null || child.signalCode !== null) return resolve();
  child.on("exit", () => resolve());
});

async function signalCase(name, signal, targets) {
  const before = targets.map((t) => sha(t));
  const child = await runChildUntilMutated(targets);

  // The mutation is genuinely on disk before the signal — otherwise the case
  // proves nothing.
  check(targets.some((t, i) => sha(t) !== before[i]), `${name}: the child never actually mutated the target`);

  child.kill(signal);
  await waitForExit(child);
  await new Promise((r) => setTimeout(r, 400));

  targets.forEach((target, i) => {
    check(sha(target) === before[i], `${name}: ${rel(target)} was not restored after ${signal}`);
  });
  check(!fs.existsSync(MUTATION_JOURNAL_PATH), `${name}: a journal survived ${signal}`);
  check(!fs.existsSync(MUTATION_LOCK_PATH), `${name}: the lock survived ${signal}`);
}

// ---- 1/2. SIGTERM during an application-source and a migration mutation ----
await signalCase("SIGTERM/app-source", "SIGTERM", [APP_SOURCE]);
await signalCase("SIGTERM/migration", "SIGTERM", [MIGRATION]);
await signalCase("SIGTERM/migration-54", "SIGTERM", [MIGRATION_54]);

// ---- 3. SIGHUP ------------------------------------------------------------
await signalCase("SIGHUP", "SIGHUP", [APP_SOURCE, MIGRATION]);

// ---- 4. an uncaught exception --------------------------------------------
{
  const before = sha(MIGRATION);
  fs.writeFileSync(scratch, childSource([MIGRATION]));
  const run = spawnSync(process.execPath, [scratch], { cwd: rootDir, encoding: "utf8", env: { ...process.env, FATAL: "1" } });
  check(run.status !== 0, "uncaught exception: the child exited zero");
  check(sha(MIGRATION) === before, `uncaught exception: ${rel(MIGRATION)} was not restored`);
  check(!fs.existsSync(MUTATION_JOURNAL_PATH), "uncaught exception: a journal survived");
}

// ---- 5. SIGKILL strands bytes, and startup recovery puts them back --------
//
// This is the case the whole design exists for. SIGKILL cannot be caught, so
// the child WILL leave the mutation behind. What must hold is that the journal
// survives with it and the next command restores from it.
{
  const before = sha(MIGRATION);
  const child = await runChildUntilMutated([MIGRATION]);
  check(sha(MIGRATION) !== before, "SIGKILL: the child never mutated the target");
  child.kill("SIGKILL");
  await waitForExit(child);
  await new Promise((r) => setTimeout(r, 300));

  check(sha(MIGRATION) !== before, "SIGKILL: the mutation was expected to survive an uncatchable signal");
  check(fs.existsSync(MUTATION_JOURNAL_PATH), "SIGKILL: no journal was left to recover from");

  const restored = recoverStaleMutations({ quiet: true });
  check(restored.length === 1, `stale recovery: expected 1 restored file, got ${restored.length}`);
  check(sha(MIGRATION) === before, `stale recovery: ${rel(MIGRATION)} was not restored from the journal`);
  check(!fs.existsSync(MUTATION_JOURNAL_PATH), "stale recovery: the journal was not cleared");

  // Idempotent: running recovery again is not a second write.
  check(recoverStaleMutations({ quiet: true }).length === 0, "stale recovery: a second pass was not a no-op");
}

// ---- 6. a second mutator is refused while the first holds the lock --------
{
  const child = await runChildUntilMutated([APP_SOURCE]);
  fs.writeFileSync(scratch + ".second.mjs", childSource([MIGRATION]));
  const second = spawnSync(process.execPath, [scratch + ".second.mjs"], { cwd: rootDir, encoding: "utf8" });
  check(second.status !== 0, "lock: a second mutator was allowed to start");
  // Either refusal is correct: the lock check and the live-journal check both
  // mean "another mutator owns this tree". What matters is that the refusal
  // names the holder rather than failing anonymously.
  const refusal = `${second.stderr}`;
  check(
    refusal.includes("owns the repository mutation lock") || refusal.includes("owns the working tree"),
    `lock: the refusal did not say another mutator owns the tree (${refusal.split("\n").find((l) => l.includes("Error")) ?? refusal.slice(0, 120)})`
  );
  check(
    refusal.includes("verify-tracked-mutation-safety child") || /pid \d+/.test(refusal),
    "lock: the refusal did not identify the holder"
  );

  // ---- 7. a tree-reading guard is refused while a mutation owns the tree --
  let refused = false;
  try {
    assertTreeNotMidMutation("verify-tracked-mutation-safety");
  } catch (error) {
    refused = `${error.message}`.includes("holds the repository mutation lock");
  }
  check(refused, "isolation: a tree-reading guard was allowed to run mid-mutation");

  child.kill("SIGTERM");
  await waitForExit(child);
  await new Promise((r) => setTimeout(r, 300));
  fs.rmSync(scratch + ".second.mjs", { force: true });
}

// ---- 8/9. the two authorization-pinned migrations are byte-exact ----------
//
// Compared against committed HEAD rather than a copied constant, so the check
// cannot drift with the file.
for (const migration of [MIGRATION, MIGRATION_54]) {
  const head = spawnSync("git", ["show", `HEAD:${rel(migration)}`], { cwd: rootDir, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  check(head.status === 0, `${rel(migration)}: could not read the committed bytes`);
  if (head.status === 0) {
    const committed = crypto.createHash("sha256").update(head.stdout).digest("hex");
    check(sha(migration) === committed, `${rel(migration)} differs from its committed bytes after the mutation suite`);
  }
}

// ---- 10. the payment and person-isolation mutations are still load-bearing -
for (const suite of ["test-rcap-phase52-mutations.mjs", "test-rcap-phase54-mutations.mjs"]) {
  const run = spawnSync(process.execPath, [path.join(rootDir, "scripts", suite)], { cwd: rootDir, encoding: "utf8" });
  check(run.status === 0, `${suite} did not pass under the guard`);
  check(
    /mutations? (red|passed)/i.test(`${run.stdout}`),
    `${suite} did not report its mutations as red; the guard must not have weakened them`
  );
}

// ---- 12. no lock, no journal, nothing left behind ------------------------
fs.rmSync(scratch, { force: true });
check(!fs.existsSync(MUTATION_JOURNAL_PATH), "a mutation journal survived the suite");
check(!fs.existsSync(MUTATION_LOCK_PATH), "a mutation lock survived the suite");

const dirty = spawnSync("git", ["status", "--porcelain", "--", "src", "supabase", "data"], { cwd: rootDir, encoding: "utf8" });
check(`${dirty.stdout}`.trim() === "", `the suite left tracked files dirty:\n${dirty.stdout}`);

if (failures.length > 0) {
  console.error(`FAIL verify-tracked-mutation-safety (${failures.length}/${checks} checks failed)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`OK verify-tracked-mutation-safety — ${checks} checks; SIGTERM, SIGHUP, uncaught exception and SIGKILL-plus-recovery all leave tracked bytes exact`);
