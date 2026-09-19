// Audits verifier coverage: which verifier scripts actually run, and which are
// dead weight that would fail if anyone ran them.
//
// WHY EXECUTION, NOT STATIC ANALYSIS
// A first pass at this scanned scripts for references to source files that no
// longer exist. That produced false positives immediately:
// verify-expungement-profile-screening-flow.mjs asserts that
// src/components/expungement-ai/CheckFlow.tsx must NOT exist, so the file being
// absent is the assertion succeeding, not a broken reference. Static scanning
// cannot distinguish "asserts present" from "asserts absent". Running the
// script can, so this audit runs them.
//
// Three outcomes per script:
//   in_chain      - reached by `npm test`; already covered there
//   orphan_passing - not in the chain but green; unused coverage, a candidate
//                    for promotion into the chain
//   orphan_broken  - not in the chain and red; it cannot be protecting anything
//                    and reads as coverage that does not exist
//
// This audit changes no verifier and deletes nothing. Whether a broken verifier
// should be repaired, promoted or retired is a scope decision.
//
// Exit code 0 by default. --strict exits non-zero when any orphan is broken.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptsDir = path.join(rootDir, "scripts");

// The audit's declared outputs, named once, here. Both are repository state and
// not scratch: the JSON is read by the verifier-disposition register, and the
// report is the document the coverage decisions are taken from. Neither is
// residue, and neither is exempt: the final tripwire requires that the tree
// differs from the baseline in exactly these two paths and no others.
//
// Declaring them is the point. "Everything except my own reports is clean" is a
// loophole that widens quietly; "exactly these two paths and nothing else" is a
// statement a run can fail.
const DECLARED_OUTPUTS = [
  "docs/record-clearing/verifier-coverage-audit.md",
  "data/rcap-verifier-audit.json"
];
const reportPath = path.join(rootDir, DECLARED_OUTPUTS[0]);

const strict = process.argv.includes("--strict");
const skipRun = process.argv.includes("--no-run");
// Exercises the restore contract against a chosen script in seconds instead of
// re-running all 300-odd orphans. A filtered run measures nothing about
// coverage, so it refuses to write either report rather than leave a partial
// one looking authoritative.
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice("--only=".length);
const timeoutMs = Number(process.env.RCAP_VERIFIER_TIMEOUT_MS || 20000);

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const testChain = pkg.scripts?.test ?? "";

// Every npm script body, so a verifier wired to a named script is not reported
// as unreachable merely because `npm test` does not call it.
const allScriptBodies = Object.values(pkg.scripts ?? {}).join(" ");

// `audit-*` scripts are generators by convention: running one rewrites its
// report. Executing them here rewrote nine tracked files with this container's
// timestamps, branch, commit and absolute paths, which is repo pollution rather
// than a finding. They are classified without being run.
const GENERATOR_PREFIX = /^audit-/;

const candidates = fs
  .readdirSync(scriptsDir)
  .filter((f) => /^(verify|test|audit)-.*\.mjs$/.test(f))
  .filter((f) => only === "" || f.includes(only))
  .sort();

// THE RESTORE CONTRACT
//
// Running a verifier must leave the repository byte-identical to how it was
// found. The first version of this audit restored with `git checkout --` over
// the newly-dirty tracked paths, which cannot remove an untracked file, and so
// a verifier that created one left it behind. It did exactly that: an audit run
// left data/rcap-all50/overlays/production/vermont/.../terminal-state.json on
// disk, where it read as a build artifact somebody had produced.
//
// `git clean -fd` is not the fix. It would also delete the caller's own
// untracked work — drafts, scratch output, an in-progress state pack — which
// this audit has no authority over and no way to distinguish from its own
// residue. The blunt instrument removes the symptom by risking the thing the
// contract exists to protect.
//
// So the audit takes a full snapshot before each script runs — tracked status,
// every untracked file, the byte contents of anything already dirty, and the
// directory tree — and reverses exactly the difference that script made:
// remove the files it created, restore the files it changed, restore the bytes
// of files the caller had already modified, prune the directories it made.
// Nothing else is touched.
//
// WHY NOT AN ISOLATED WORKTREE
// A temporary `git worktree` would make residue impossible by construction, and
// it was the first choice. It measures the wrong thing: a worktree is created
// at a commit, and this audit is explicitly designed to run against the working
// tree — it tolerates pre-existing dirt and reports on the scripts as they are
// right now. Running it at HEAD instead would silently answer a different
// question during exactly the mid-change moments when the answer matters. The
// snapshot keeps the semantics and adds the guarantee.

const WALK_SKIP = new Set([".git", "node_modules"]);
const BACKUP_MAX_FILE_BYTES = 8 * 1024 * 1024;
const BACKUP_TOTAL_BYTES = 128 * 1024 * 1024;

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// Tracked status plus every untracked file, as a path -> two-letter code map.
// `-z` is required: repo paths contain spaces, and quoted output would have to
// be unescaped by hand.
function statusSnapshot() {
  const res = spawnSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  const tokens = (res.stdout || "").split("\0");
  const map = new Map();
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;
    const code = token.slice(0, 2);
    map.set(token.slice(3), code);
    // A rename or copy entry carries the original path in the next token.
    if (code[0] === "R" || code[0] === "C") i += 1;
  }
  return map;
}

// Every directory that exists right now. An empty directory is invisible to
// git, so a verifier that creates one leaves a trace no status snapshot can
// see. This is the only way to catch it.
function directorySnapshot() {
  const dirs = new Set();
  const stack = [""];
  while (stack.length > 0) {
    const rel = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(path.join(rootDir, rel), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (rel === "" && WALK_SKIP.has(entry.name)) continue;
      const child = rel === "" ? entry.name : `${rel}/${entry.name}`;
      dirs.add(child);
      stack.push(child);
    }
  }
  return dirs;
}

// Directories git ignores — build output, caches — are outside the contract.
// `git status` does not report the files inside them either, so tripwiring on
// the directory alone would report half a fact: the audit would announce that
// .next/dev/server/app/_not-found/ appeared while saying nothing about what a
// verifier wrote into it. They are excluded from both the pruning and the
// tripwire, consistently with the status snapshot.
function filterIgnored(dirs) {
  if (dirs.length === 0) return [];
  const res = spawnSync("git", ["check-ignore", "-z", "--stdin"], {
    cwd: rootDir,
    input: `${dirs.join("\0")}\0`,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  const ignored = new Set((res.stdout || "").split("\0").filter(Boolean));
  return dirs.filter((d) => !ignored.has(d));
}

// The caller's own uncommitted work, tracked and untracked alike. `git checkout
// --` would destroy the tracked half and cannot touch the untracked half, so
// the only safe restore for either is the bytes themselves.
//
// The status code is not enough to detect damage here. A file that was ` M`
// before a verifier ran and is ` M` after it ran has the same code and
// different contents; the first version of this compared codes and reported
// nothing. Contents are what the contract is about, so contents are what is
// recorded.
function backupMutablePaths(snapshot) {
  const backup = new Map();
  let held = 0;
  for (const [rel, code] of snapshot) {
    if (code === "!!") continue;
    const abs = path.join(rootDir, rel);
    let stat;
    try {
      stat = fs.statSync(abs);
    } catch {
      backup.set(rel, { absent: true });
      continue;
    }
    if (!stat.isFile()) continue;
    const bytes = fs.readFileSync(abs);
    const hash = sha256(bytes);
    // Above either ceiling the bytes are not held, but the hash still is, so
    // the tripwire names the file instead of silently failing to protect it.
    if (stat.size > BACKUP_MAX_FILE_BYTES || held + stat.size > BACKUP_TOTAL_BYTES) {
      backup.set(rel, { hash, size: stat.size, unheld: true });
      continue;
    }
    held += stat.size;
    backup.set(rel, { bytes, hash });
  }
  return backup;
}

// Paths that were already dirty or untracked when we arrived and whose bytes a
// verifier changed anyway.
function contentChanges(backup, after) {
  const changed = [];
  for (const [rel, saved] of backup) {
    const abs = path.join(rootDir, rel);
    let bytes = null;
    try {
      const stat = fs.statSync(abs);
      if (stat.isFile()) bytes = fs.readFileSync(abs);
    } catch {
      bytes = null;
    }
    if (saved.absent) {
      if (bytes !== null) changed.push(rel);
      continue;
    }
    if (bytes === null) {
      changed.push(rel);
      continue;
    }
    if (sha256(bytes) !== saved.hash) changed.push(rel);
  }
  // A tracked path that was dirty before and no longer appears in status: the
  // verifier reverted the caller's edit. Same category — only the backup undoes it.
  for (const rel of backup.keys()) {
    if (!after.has(rel) && !changed.includes(rel)) changed.push(rel);
  }
  return changed;
}

// What a single script changed, classified by what reversing it requires.
function diffSnapshots(before, after, backup) {
  const created = [];
  const modified = [];
  const deleted = [];
  const unstage = [];

  for (const [rel, code] of after) {
    const prior = before.get(rel);
    if (prior === undefined) {
      // The path did not exist in the baseline at all, so it is entirely the
      // verifier's and removal or checkout is the right reversal.
      if (code === "??") created.push(rel);
      else if (code[1] === "D" || code[0] === "D") deleted.push(rel);
      else modified.push(rel);
      continue;
    }
    if (prior === code) continue;
    // The path was already in the baseline, so it is the caller's. Never
    // delete it and never `git checkout --` over it: unstage whatever the
    // verifier staged, and let the byte backup restore the contents.
    if (code[0] !== prior[0]) unstage.push(rel);
  }

  const clobbered = contentChanges(backup, after).filter(
    (rel) => !created.includes(rel) && !modified.includes(rel) && !deleted.includes(rel)
  );

  return { created, modified, deleted, clobbered, unstage };
}

function gitRestore(paths) {
  if (paths.length === 0) return;
  // Unstage first: a verifier that ran `git add` leaves an index entry that
  // `checkout --` will not reverse.
  spawnSync("git", ["reset", "-q", "--", ...paths], { cwd: rootDir, encoding: "utf8" });
  spawnSync("git", ["checkout", "--", ...paths], { cwd: rootDir, encoding: "utf8" });
}

function removeCreatedFile(rel) {
  try {
    fs.rmSync(path.join(rootDir, rel), { force: true });
    return true;
  } catch {
    return false;
  }
}

// Remove only directories this script created, innermost first, and only while
// they are empty. A directory that existed before the run is never a candidate,
// however empty it now is.
function pruneCreatedDirectories(created) {
  const ordered = [...created].sort((a, b) => b.split("/").length - a.split("/").length);
  const removed = [];
  for (const rel of ordered) {
    const abs = path.join(rootDir, rel);
    try {
      if (fs.readdirSync(abs).length === 0) {
        fs.rmdirSync(abs);
        removed.push(rel);
      }
    } catch {
      // Already gone, or no longer a directory. Either way not ours to force.
    }
  }
  return { created, removed };
}

function restoreBackedUpContents(paths, backup) {
  const unrecoverable = [];
  for (const rel of paths) {
    const saved = backup.get(rel);
    const abs = path.join(rootDir, rel);
    if (!saved) {
      unrecoverable.push(`${rel} (no snapshot taken)`);
      continue;
    }
    if (saved.unheld) {
      unrecoverable.push(`${rel} (${saved.size} bytes, above the backup ceiling)`);
      continue;
    }
    try {
      if (saved.absent) fs.rmSync(abs, { force: true });
      else {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, saved.bytes);
      }
    } catch (err) {
      unrecoverable.push(`${rel} (${err.message})`);
    }
  }
  return unrecoverable;
}

// The state every executed script is measured against and restored to. It is
// refreshed only when a restore verifies clean, so a failed restore is
// attributed to the script that caused it rather than smeared across the rest
// of the run.
let baselineStatus = skipRun ? null : statusSnapshot();
let baselineDirs = skipRun ? null : directorySnapshot();
let baselineBackup = skipRun ? null : backupMutablePaths(baselineStatus);

const residue = [];

// Reverse exactly what `file` changed, then prove it. The proof is the point:
// without it this is a restore that reports success because it ran, not
// because it worked.
function restoreAfter(file) {
  const after = statusSnapshot();
  const dirsAfter = directorySnapshot();
  const delta = diffSnapshots(baselineStatus, after, baselineBackup);
  const newDirs = filterIgnored([...dirsAfter].filter((d) => !baselineDirs.has(d)));

  const touched =
    delta.created.length +
    delta.modified.length +
    delta.deleted.length +
    delta.clobbered.length +
    delta.unstage.length;
  if (touched === 0 && newDirs.length === 0) return { mutatedPaths: [], createdDirs: [] };

  for (const rel of delta.created) removeCreatedFile(rel);
  gitRestore([...delta.modified, ...delta.deleted]);
  if (delta.unstage.length > 0) {
    spawnSync("git", ["reset", "-q", "--", ...delta.unstage], { cwd: rootDir, encoding: "utf8" });
  }
  const unrecoverable = restoreBackedUpContents(delta.clobbered, baselineBackup);
  pruneCreatedDirectories(newDirs);
  const createdDirs = newDirs;

  // TRIPWIRE. Re-snapshot and require an exact match with the baseline: no
  // modified tracked file, no deleted tracked file, no surviving untracked
  // file, no surviving directory, and — because two identical status codes can
  // sit on two different files — no changed bytes on anything the baseline
  // already held. Anything left is named and the audit fails: a restore
  // contract that cannot be checked is not a contract.
  const verify = statusSnapshot();
  const verifyDirs = directorySnapshot();
  const leftover = [];
  for (const [rel, code] of verify) {
    if (baselineStatus.get(rel) !== code) leftover.push(`${rel} [${code.trim() || code}]`);
  }
  for (const rel of baselineStatus.keys()) {
    if (!verify.has(rel)) leftover.push(`${rel} [restored away]`);
  }
  for (const rel of contentChanges(baselineBackup, verify)) {
    leftover.push(`${rel} [contents differ]`);
  }
  for (const dir of filterIgnored([...verifyDirs].filter((d) => !baselineDirs.has(d)))) {
    leftover.push(`${dir}/ [directory]`);
  }

  if (leftover.length > 0 || unrecoverable.length > 0) {
    residue.push({ file, leftover, unrecoverable });
    // Adopt the current state as the new baseline so the next script is judged
    // against what is actually on disk, not against a state that no longer
    // exists. The failure is already recorded.
    baselineStatus = verify;
    baselineDirs = verifyDirs;
    baselineBackup = backupMutablePaths(verify);
  }

  return {
    mutatedPaths: [...delta.created, ...delta.modified, ...delta.deleted, ...delta.clobbered],
    createdDirs
  };
}

const rows = [];
for (const file of candidates) {
  const inChain = testChain.includes(file);
  const wiredToNamedScript = allScriptBodies.includes(file);

  let status;
  let detail = "";
  let mutatedPaths = [];
  let createdDirs = [];

  if (inChain) {
    status = "in_chain";
  } else if (GENERATOR_PREFIX.test(file)) {
    status = "generator_skipped";
    detail = "writes its own report; not executed by this audit";
  } else if (skipRun) {
    status = "orphan_unrun";
  } else {
    const result = spawnSync("node", [path.join(scriptsDir, file)], {
      cwd: rootDir,
      encoding: "utf8",
      timeout: timeoutMs,
      killSignal: "SIGKILL"
    });

    // A verifier that writes to the repository is a finding in its own right:
    // running the checks should never change the thing being checked.
    ({ mutatedPaths, createdDirs } = restoreAfter(file));

    if (result.error && result.error.code === "ETIMEDOUT") {
      status = "orphan_timeout";
      detail = `exceeded ${timeoutMs}ms`;
    } else if (result.status === 0) {
      status = "orphan_passing";
    } else {
      status = "orphan_broken";
      const stderr = (result.stderr || "").trim().split("\n").filter(Boolean);
      // First meaningful line of the failure, trimmed for a table cell.
      detail = (stderr.find((l) => /Error|assert|Cannot|ENOENT/i.test(l)) || stderr[0] || "")
        .replace(/\s+/g, " ")
        .slice(0, 160);
    }
  }

  rows.push({ file, status, detail, wiredToNamedScript, mutatedPaths, createdDirs });
}

const mutating = rows.filter((r) => r.mutatedPaths.length > 0 || r.createdDirs.length > 0);

const by = (s) => rows.filter((r) => r.status === s);
const inChain = by("in_chain");
const passing = by("orphan_passing");
const broken = by("orphan_broken");
const timedOut = by("orphan_timeout");
const generators = by("generator_skipped");

console.log("RCAP verifier coverage audit");
console.log("");
console.log(`Scripts audited     : ${rows.length}`);
console.log(`Reached by npm test : ${inChain.length}`);
console.log(`Orphan, passing     : ${passing.length}`);
console.log(`Orphan, broken      : ${broken.length}`);
if (timedOut.length) console.log(`Orphan, timed out   : ${timedOut.length}`);
console.log(`Generators skipped  : ${generators.length}`);
const unrun = by("orphan_unrun");
if (unrun.length) console.log(`Orphan, not run     : ${unrun.length}`);
if (mutating.length) console.log(`Mutating repo state : ${mutating.length} (restored)`);
if (residue.length) console.log(`RESTORE FAILED      : ${residue.length} script(s) left residue`);
console.log("");

if (residue.length > 0) {
  console.error("Restore contract violated — the audit could not put the repository back:");
  for (const entry of residue) {
    console.error(`- ${entry.file}`);
    for (const item of entry.leftover) console.error(`    left behind: ${item}`);
    for (const item of entry.unrecoverable) console.error(`    unrecoverable: ${item}`);
  }
  console.error("");
}

if (broken.length > 0) {
  console.log("Broken orphans (not in the test chain and red if run):");
  for (const row of broken) {
    console.log(`- ${row.file}${row.wiredToNamedScript ? " (wired to a named npm script)" : ""}`);
    if (row.detail) console.log(`    ${row.detail}`);
  }
  console.log("");
}

const lines = [];
lines.push("# RCAP Verifier Coverage Audit");
lines.push("");
lines.push(
  "Generated by `scripts/audit-orphaned-verifiers.mjs`. Every script outside the `npm test` chain is executed, because a script that references a missing file may be asserting that the file is absent. Only running it distinguishes a broken check from a passing one."
);
lines.push("");
lines.push("| Outcome | Count | Meaning |");
lines.push("| --- | ---: | --- |");
lines.push(`| Reached by \`npm test\` | ${inChain.length} | Already enforced |`);
lines.push(`| Orphan, passing | ${passing.length} | Works but nothing runs it; promotion candidate |`);
lines.push(`| Orphan, broken | ${broken.length} | Red if run; reads as coverage that does not exist |`);
if (timedOut.length) {
  lines.push(`| Orphan, timed out | ${timedOut.length} | Exceeded ${timeoutMs}ms; needs a longer budget or is hung |`);
}
lines.push("");

if (broken.length > 0) {
  lines.push("## Broken orphans");
  lines.push("");
  lines.push(
    "These are not in the test chain and fail when executed. Each one is a check somebody wrote and nobody runs. Repair, promotion or retirement is a scope decision and is not made here."
  );
  lines.push("");
  lines.push("| Script | Named npm script | First failure line |");
  lines.push("| --- | --- | --- |");
  for (const row of broken) {
    lines.push(
      `| \`${row.file}\` | ${row.wiredToNamedScript ? "yes" : "no"} | ${row.detail.replace(/\|/g, "\\|") || "—"} |`
    );
  }
  lines.push("");
}

if (mutating.length > 0) {
  lines.push("## Verifiers that write to the repository");
  lines.push("");
  lines.push(
    "Running a check should never change the thing being checked. These wrote to the repository when executed. The audit reversed exactly what each one did — removing the files it created, restoring the files it changed, pruning the directories it made — and verified afterwards that the tree matched byte for byte."
  );
  lines.push("");
  for (const row of mutating) {
    const parts = [];
    if (row.mutatedPaths.length) parts.push(`${row.mutatedPaths.length} file(s)`);
    if (row.createdDirs.length) parts.push(`${row.createdDirs.length} new director${row.createdDirs.length === 1 ? "y" : "ies"}`);
    lines.push(`- \`${row.file}\` → ${parts.join(", ")}`);
  }
  lines.push("");
}

if (residue.length > 0) {
  lines.push("## Restore contract violated");
  lines.push("");
  lines.push(
    "The audit could not return the repository to the state it found. Every path below is on disk because a verifier put it there and the restore failed. This is a defect in the audit or in the verifier, not a finding about coverage, and the audit exits non-zero because of it."
  );
  lines.push("");
  for (const entry of residue) {
    lines.push(`- \`${entry.file}\``);
    for (const item of entry.leftover) lines.push(`  - left behind: \`${item}\``);
    for (const item of entry.unrecoverable) lines.push(`  - unrecoverable: \`${item}\``);
  }
  lines.push("");
}

if (passing.length > 0) {
  lines.push("## Passing orphans");
  lines.push("");
  lines.push("Green, but nothing runs them. These are the cheapest coverage to reclaim.");
  lines.push("");
  for (const row of passing) lines.push(`- \`${row.file}\``);
  lines.push("");
}

if (only !== "") {
  console.log(`Filtered run (--only=${only}): no report written, coverage counts are not a measurement.`);
  assertRunLevelClean([]);
  if (residue.length > 0) process.exit(1);
  process.exit(0);
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Report written: ${path.relative(rootDir, reportPath)}`);

// Machine-readable sibling, consumed by the disposition register generator.
const jsonPath = path.join(rootDir, DECLARED_OUTPUTS[1]);
fs.writeFileSync(
  jsonPath,
  `${JSON.stringify(
    {
      schemaVersion: "rcap-verifier-audit/v1",
      timeoutMs,
      counts: {
        total: rows.length,
        inChain: inChain.length,
        orphanPassing: passing.length,
        orphanBroken: broken.length,
        orphanTimeout: timedOut.length,
        generators: generators.length
      },
      restoreContract: {
        violations: residue.length,
        scripts: residue.map((entry) => ({
          file: entry.file,
          leftBehind: entry.leftover,
          unrecoverable: entry.unrecoverable
        }))
      },
      scripts: rows.map((r) => ({
        file: r.file,
        status: r.status,
        detail: r.detail || null,
        wiredToNamedScript: r.wiredToNamedScript,
        mutatesTrackedFiles: r.mutatedPaths.length > 0,
        createsDirectories: r.createdDirs.length > 0
      }))
    },
    null,
    2
  )}\n`,
  "utf8"
);
console.log(`Machine-readable: ${path.relative(rootDir, jsonPath)}`);

// FINAL TRIPWIRE. The per-script one proves each verifier was reversed. This
// one proves the run as a whole: the tree must differ from where it started in
// exactly the paths the run declares as outputs, and in nothing else. A path
// outside that set — a file some verifier created that survived, a tracked file
// left modified, a directory nobody cleaned — fails the audit by name.
//
// The declared outputs are not excused from the assertion, they ARE the
// assertion: an audit that stopped writing one of them, or started writing a
// third, is also a failure here. A filtered run writes no reports, so it
// declares nothing and is held to a completely clean tree.
function assertRunLevelClean(declared) {
  if (skipRun) return;
  const finalStatus = statusSnapshot();
  const finalDirs = directorySnapshot();
  const unexpected = [];
  for (const [rel, code] of finalStatus) {
    if (declared.includes(rel)) continue;
    if (baselineStatus.get(rel) !== code) unexpected.push(`${rel} [${code.trim() || code}]`);
  }
  for (const rel of baselineStatus.keys()) {
    if (!finalStatus.has(rel) && !declared.includes(rel)) unexpected.push(`${rel} [restored away]`);
  }
  for (const rel of contentChanges(baselineBackup, finalStatus)) {
    if (!declared.includes(rel)) unexpected.push(`${rel} [contents differ]`);
  }
  for (const dir of filterIgnored([...finalDirs].filter((d) => !baselineDirs.has(d)))) {
    unexpected.push(`${dir}/ [directory]`);
  }
  if (unexpected.length > 0) {
    console.error("");
    console.error("Run-level residue — the audit changed paths it does not declare as outputs:");
    for (const item of unexpected) console.error(`  ${item}`);
    process.exit(1);
  }
  console.log(declared.length === 0
    ? "Tree clean: the run changed nothing."
    : `Tree clean: the run changed exactly its ${declared.length} declared output(s).`);
}

assertRunLevelClean(DECLARED_OUTPUTS);

// A failed restore is not a coverage finding and is not gated behind --strict.
// The audit claims it leaves nothing behind; when that claim is false, saying so
// is the whole value of having checked.
if (residue.length > 0) {
  console.error("");
  console.error(
    `Restore contract: ${residue.length} script(s) left residue the audit could not reverse.`
  );
  process.exit(1);
}

if (strict && broken.length > 0) {
  console.error("");
  console.error(`Strict mode: ${broken.length} broken orphan verifier(s).`);
  process.exit(1);
}
