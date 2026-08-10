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
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptsDir = path.join(rootDir, "scripts");
const reportPath = path.join(rootDir, "docs/record-clearing/verifier-coverage-audit.md");

const strict = process.argv.includes("--strict");
const skipRun = process.argv.includes("--no-run");
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
  .sort();

function dirtyTrackedPaths() {
  const res = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], {
    cwd: rootDir,
    encoding: "utf8"
  });
  return (res.stdout || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

// Anything already dirty before the audit is the caller's, not ours, and must
// not be reverted by this script.
const preexistingDirty = new Set(dirtyTrackedPaths());

function restoreIfDirtied() {
  const nowDirty = dirtyTrackedPaths().filter((p) => !preexistingDirty.has(p));
  if (nowDirty.length === 0) return [];
  spawnSync("git", ["checkout", "--", ...nowDirty], { cwd: rootDir, encoding: "utf8" });
  return nowDirty;
}

const rows = [];
for (const file of candidates) {
  const inChain = testChain.includes(file);
  const wiredToNamedScript = allScriptBodies.includes(file);

  let status;
  let detail = "";
  let mutatedPaths = [];

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

    // A verifier that rewrites tracked files is a finding in its own right:
    // running the checks should never change the thing being checked.
    mutatedPaths = restoreIfDirtied();

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

  rows.push({ file, status, detail, wiredToNamedScript, mutatedPaths });
}

const mutating = rows.filter((r) => r.mutatedPaths.length > 0);

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
console.log("");

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
  lines.push("## Verifiers that rewrite tracked files");
  lines.push("");
  lines.push(
    "Running a check should never change the thing being checked. These rewrote tracked files when executed; the audit restored them."
  );
  lines.push("");
  for (const row of mutating) {
    lines.push(`- \`${row.file}\` → ${row.mutatedPaths.length} file(s)`);
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

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Report written: ${path.relative(rootDir, reportPath)}`);

if (strict && broken.length > 0) {
  console.error("");
  console.error(`Strict mode: ${broken.length} broken orphan verifier(s).`);
  process.exit(1);
}
