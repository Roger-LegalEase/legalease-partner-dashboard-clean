// Regression proof for the state-promotion restricted-change guard.
//
// The guard's whole value is that it fails. It previously failed on everything,
// permanently, because it asked "does this differ from origin/main" rather than
// "did this branch change a restricted file" — so a branch cut from an unmerged
// platform lane inherited three violations it did not cause, and the failure
// became background noise.
//
// The repair acknowledges an inherited path once, pinned to the exact content
// hash it was reviewed at. That is only safe if the guard still fails on
// everything else, so every case below is exercised against a REAL temporary git
// repository rather than a mock: a real main branch, a real merge base, real
// blob hashes.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  evaluateRestrictedChanges,
  isRestrictedPath,
  RESTRICTED_PREFIXES,
  ACKNOWLEDGEMENT_PATH
} from "./lib/restricted-change-guard.mjs";

const failures = [];
const checks = [];
const RESTRICTED_FILE = "src/app/api/rcap/packets/generate/route.ts";
const SECOND_RESTRICTED_FILE = "src/lib/auth/session.ts";
const ORDINARY_FILE = "data/record-clearing/example.json";

// ---------------------------------------------------------------------------

scenario("an unacknowledged restricted change fails", (repo) => {
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('changed');\n");
  commit(repo, "change a restricted file");
  const result = evaluateRestrictedChanges(repo);
  expect(
    result.failures.some((entry) => entry.includes("Restricted files changed") && entry.includes(RESTRICTED_FILE)),
    "an unacknowledged restricted change must fail",
    result
  );
  expect(result.acknowledged.length === 0, "nothing should be acknowledged here", result);
});

scenario("an acknowledged restricted change passes", (repo) => {
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('changed');\n");
  commit(repo, "change a restricted file");
  acknowledge(repo, [entryFor(repo, RESTRICTED_FILE)]);
  commit(repo, "acknowledge it");
  const result = evaluateRestrictedChanges(repo);
  expect(result.failures.length === 0, "an acknowledged path must pass", result);
  expect(result.acknowledged.includes(RESTRICTED_FILE), "it must be reported as acknowledged", result);
});

scenario("editing an acknowledged file after acknowledgement fails again", (repo) => {
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('first');\n");
  commit(repo, "first change");
  acknowledge(repo, [entryFor(repo, RESTRICTED_FILE)]);
  commit(repo, "acknowledge the first change");

  // The acknowledgement is pinned to content. Editing the file must reopen it.
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('second, unreviewed');\n");
  commit(repo, "edit it again without re-review");

  const result = evaluateRestrictedChanges(repo);
  expect(
    result.failures.some((entry) => entry.includes("has changed since it was acknowledged")),
    "a content change after acknowledgement must fail",
    result
  );
  expect(result.acknowledged.length === 0, "it must no longer count as acknowledged", result);
});

scenario("a second restricted file is not covered by the first acknowledgement", (repo) => {
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('changed');\n");
  writeFile(repo, SECOND_RESTRICTED_FILE, "export const session = null;\n");
  commit(repo, "change two restricted files");
  acknowledge(repo, [entryFor(repo, RESTRICTED_FILE)]);
  commit(repo, "acknowledge only the first");
  const result = evaluateRestrictedChanges(repo);
  expect(
    result.unacknowledged.includes(SECOND_RESTRICTED_FILE),
    "the unacknowledged restricted file must still fail",
    result
  );
});

scenario("acknowledging a path that is not restricted is a configuration error", (repo) => {
  writeFile(repo, ORDINARY_FILE, '{"changed":true}\n');
  commit(repo, "change an ordinary file");
  acknowledge(repo, [{ ...entryFor(repo, ORDINARY_FILE), path: ORDINARY_FILE }]);
  commit(repo, "acknowledge a non-restricted path");
  const result = evaluateRestrictedChanges(repo);
  expect(
    result.failures.some((entry) => entry.includes("is not under a restricted prefix")),
    "acknowledging a non-restricted path must fail as a configuration error",
    result
  );
});

scenario("an entry with no pinned hash is refused", (repo) => {
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('changed');\n");
  commit(repo, "change a restricted file");
  acknowledge(repo, [{ ...entryFor(repo, RESTRICTED_FILE), blobSha256: "not-a-hash" }]);
  commit(repo, "acknowledge without a valid hash");
  const result = evaluateRestrictedChanges(repo);
  expect(
    result.failures.some((entry) => entry.includes("no valid pinned content hash")),
    "an entry without a valid pinned hash must be refused",
    result
  );
  expect(
    result.failures.some((entry) => entry.includes("Restricted files changed")),
    "and the path must still be reported as an unacknowledged change",
    result
  );
});

scenario("an entry with no substantive reason is refused", (repo) => {
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('changed');\n");
  commit(repo, "change a restricted file");
  acknowledge(repo, [{ ...entryFor(repo, RESTRICTED_FILE), reason: "inherited" }]);
  commit(repo, "acknowledge with a one-word reason");
  const result = evaluateRestrictedChanges(repo);
  expect(
    result.failures.some((entry) => entry.includes("no substantive reason")),
    "a token reason must not buy an exemption",
    result
  );
});

scenario("an entry with no review provenance is refused", (repo) => {
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('changed');\n");
  commit(repo, "change a restricted file");
  acknowledge(repo, [{ ...entryFor(repo, RESTRICTED_FILE), reviewedUnder: "", introducedBy: [] }]);
  commit(repo, "acknowledge with no provenance");
  const result = evaluateRestrictedChanges(repo);
  expect(
    result.failures.some((entry) => entry.includes("does not record what reviewed it")),
    "an entry must name what reviewed it and what introduced it",
    result
  );
});

scenario("a duplicate entry is refused", (repo) => {
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('changed');\n");
  commit(repo, "change a restricted file");
  const entry = entryFor(repo, RESTRICTED_FILE);
  acknowledge(repo, [entry, entry]);
  commit(repo, "acknowledge the same path twice");
  const result = evaluateRestrictedChanges(repo);
  expect(
    result.failures.some((entry) => entry.includes("is acknowledged twice")),
    "a duplicated entry must be refused",
    result
  );
});

scenario("an unparseable acknowledgement file fails closed", (repo) => {
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('changed');\n");
  writeFile(repo, ACKNOWLEDGEMENT_PATH, "{ this is not json");
  commit(repo, "break the acknowledgement file");
  const result = evaluateRestrictedChanges(repo);
  expect(
    result.failures.some((entry) => entry.includes("could not be parsed")),
    "an unparseable acknowledgement file must fail",
    result
  );
  expect(
    result.failures.some((entry) => entry.includes("Restricted files changed")),
    "and must not silently grant the change",
    result
  );
});

scenario("an ordinary change passes untouched", (repo) => {
  writeFile(repo, ORDINARY_FILE, '{"changed":true}\n');
  commit(repo, "change an ordinary file");
  const result = evaluateRestrictedChanges(repo);
  expect(result.failures.length === 0, "a non-restricted change must pass", result);
  expect(result.changedRestricted.length === 0, "and must not be reported as restricted", result);
});

scenario("a stale acknowledgement grants nothing and is reported", (repo) => {
  // The file is acknowledged but never changed, which is what happens once the
  // platform lane finally merges to main.
  acknowledge(repo, [entryFor(repo, RESTRICTED_FILE)]);
  commit(repo, "acknowledge a path that has not changed");
  const result = evaluateRestrictedChanges(repo);
  expect(result.failures.length === 0, "a stale entry must not fail the build", result);
  expect(
    result.notes.some((note) => note.includes(RESTRICTED_FILE) && note.includes("can be removed")),
    "a stale entry must be surfaced for removal",
    result
  );
});

// ---------------------------------------------------------------------------
// The live acknowledgement file must describe reality, not aspiration.
// ---------------------------------------------------------------------------

const live = evaluateRestrictedChanges(process.cwd());
expectTop(live.failures.length === 0, `the live guard must pass: ${live.failures.join("; ")}`);
expectTop(
  live.acknowledged.length === 3,
  `expected the three inherited PR #87 routes to be acknowledged, found ${live.acknowledged.length}`
);
for (const file of [
  "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts",
  "src/app/api/rcap/packets/[fulfillmentId]/components/[componentId]/route.ts",
  "src/app/api/rcap/packets/generate/route.ts"
]) {
  expectTop(live.acknowledged.includes(file), `${file} must be acknowledged by the live guard`);
  expectTop(isRestrictedPath(file), `${file} must be recognised as a restricted path`);
}
expectTop(RESTRICTED_PREFIXES.includes("src/app/api/"), "src/app/api/ must remain a restricted prefix");
expectTop(RESTRICTED_PREFIXES.includes("src/lib/auth/"), "src/lib/auth/ must remain a restricted prefix");
expectTop(RESTRICTED_PREFIXES.includes("supabase/"), "supabase/ must remain a restricted prefix");
checks.push(`live guard: 0 unacknowledged, ${live.acknowledged.length} acknowledged, ${live.notes.length} stale.`);

// ---------------------------------------------------------------------------

console.log("");
if (failures.length > 0) {
  console.error("Restricted-change guard verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Restricted-change guard verification passed.");
for (const line of checks) console.log(`  ${line}`);
console.log(`  ${RESTRICTED_PREFIXES.length} restricted prefixes enforced.`);
console.log("  An acknowledgement is pinned to content: re-editing an acknowledged file fails again.");

// ---------------------------------------------------------------------------

function scenario(name, body) {
  const repo = makeRepo();
  try {
    body(repo);
    checks.push(name);
  } catch (error) {
    failures.push(`${name}: ${String(error?.message ?? error)}`);
  } finally {
    // Temporary fixtures live under the OS temp directory and are left for the
    // OS to reclaim; this script never removes paths itself.
  }
}

function expect(condition, message, result) {
  if (condition) return;
  throw new Error(`${message}. failures=${JSON.stringify(result.failures)} acknowledged=${JSON.stringify(result.acknowledged)}`);
}

function expectTop(condition, message) {
  if (!condition) failures.push(message);
}

function makeRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-restricted-guard-"));
  run(repo, ["init", "--initial-branch=main"]);
  run(repo, ["config", "user.email", "guard@example.invalid"]);
  run(repo, ["config", "user.name", "Guard Verifier"]);

  // A baseline that already contains the restricted files, so a later edit is a
  // modification rather than an addition.
  writeFile(repo, RESTRICTED_FILE, "export const GET = () => new Response('original');\n");
  writeFile(repo, SECOND_RESTRICTED_FILE, "export const session = undefined;\n");
  writeFile(repo, ORDINARY_FILE, '{"changed":false}\n');
  commit(repo, "baseline");

  run(repo, ["checkout", "-b", "work"]);
  return repo;
}

function writeFile(repo, relative, contents) {
  const file = path.join(repo, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function commit(repo, message) {
  run(repo, ["add", "-A"]);
  run(repo, ["commit", "-q", "-m", message, "--allow-empty"]);
}

function acknowledge(repo, entries) {
  writeFile(repo, ACKNOWLEDGEMENT_PATH, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`);
}

/** An entry pinned to the file's current content, as a real acknowledgement is. */
function entryFor(repo, relative) {
  const hash = run(repo, ["hash-object", relative]).trim();
  return {
    path: relative,
    changeKind: "modified",
    blobSha256: hash,
    introducedBy: ["abc1234"],
    reviewedUnder: "verifier fixture",
    reason:
      "Fixture entry used by the restricted-change guard regression test to prove that acknowledgement is pinned to content.",
    securityEffect: "neutral_new_surface_fails_closed"
  };
}

function run(repo, args) {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout ?? "";
}
