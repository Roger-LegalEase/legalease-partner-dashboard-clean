// The Colorado official-form binding check.
//
//   node src/lib/rcap/state-packs/colorado/official-forms/run-verify.mjs
//
// Run from the repository root. Exits non-zero on the first failing check's
// report, with the path or the field that failed.
import { register } from "node:module";
import { execFileSync } from "node:child_process";

register("../../../../../../scripts/lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = process.cwd();
const { verifyColoradoOfficialForms } = await import("./verify.ts");

function gitObjectExists(sha) {
  try {
    execFileSync("git", ["cat-file", "-t", sha], { cwd: rootDir, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// A specification that stops describing its document throws rather than
// returning a report — there is nothing to check once the build fails — so the
// throw is reported as the failure it is instead of as a stack trace.
let report;
try {
  report = await verifyColoradoOfficialForms({ rootDir, gitObjectExists });
} catch (error) {
  process.stdout.write(`  FAIL  the specification builds against its document\n`);
  for (const problem of error?.problems ?? [String(error?.message ?? error)]) {
    process.stdout.write(`          ${problem}\n`);
  }
  process.stdout.write(`\nColorado official-form binding FAILED — the specification does not build.\n`);
  process.exit(1);
}

for (const check of report.checks) {
  process.stdout.write(`  ${check.ok ? "ok  " : "FAIL"}  ${check.label} — ${check.detail}\n`);
}

process.stdout.write(`\n${JSON.stringify(report.summary, null, 2)}\n`);

if (report.failures > 0) {
  process.stdout.write(`\nColorado official-form binding FAILED — ${report.failures} check(s) did not hold.\n`);
  process.exit(1);
}
process.stdout.write(
  `\nColorado official-form binding passed: ${report.checks.length} checks, ${report.summary.emittedRecords} generated record(s) current, ${report.summary.artifactsVerified} retained artifact(s) digest-verified.\n`,
);
