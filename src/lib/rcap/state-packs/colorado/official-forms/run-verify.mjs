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

// The captain's Colorado summary states the field census in prose, and prose
// drifts. It already did: the audit document said "JDF-417 binds 4 of 62" long
// after the specification classified all 62, which is true of the retained
// artifact and reads as a statement about the specification. Both counts are now
// in one table, and this check requires that table to be the numbers the
// emitted records actually carry.
const CENSUS_DOC = "docs/rcap/grade-a/captain/COLORADO_AUDIT_INTEGRATION.md";
const censusChecks = [];
{
  const fs = await import("node:fs");
  const path = await import("node:path");
  const docPath = path.join(rootDir, CENSUS_DOC);
  if (!fs.existsSync(docPath)) {
    censusChecks.push({ ok: false, label: "the Colorado field-census document exists", detail: `${CENSUS_DOC} is absent` });
  } else {
    const doc = fs.readFileSync(docPath, "utf8");
    const coverage = (family) =>
      JSON.parse(fs.readFileSync(
        path.join(rootDir, `data/rcap-all50/overlays/production/colorado/${family}/specification/reports/binding-coverage.json`),
        "utf8",
      ));
    for (const family of ["jdf-417-form-petition-en", "jdf-612-form-motion-en"]) {
      const c = coverage(family);
      // Every number the table states, checked against the record it claims to
      // come from -- and the identity that makes the table readable at all.
      const stated = [
        [`total ${c.fieldCount}`, new RegExp(`\\*\\*${c.fieldCount}\\*\\*`)],
        [`writable ${c.writableFields}`, new RegExp(`\\*\\*${c.writableFields}\\*\\*`)],
        [`protected ${c.protectedFields}`, new RegExp(`\\*\\*${c.protectedFields}\\*\\*`)],
        [`realized ${c.realizedInRetainedArtifacts}`, new RegExp(`\\*\\*${c.realizedInRetainedArtifacts}\\*\\*`)],
        [`digest ${c.specSha256.slice(0, 8)}`, new RegExp(c.specSha256.slice(0, 8))],
      ];
      const missing = stated.filter(([, rx]) => !rx.test(doc)).map(([what]) => what);
      censusChecks.push({
        ok: missing.length === 0 && c.writableFields + c.protectedFields === c.fieldCount && c.unmappedFields === 0,
        label: `${c.documentId}: the captain's census table states this record's own numbers`,
        detail: missing.length
          ? `not found in ${CENSUS_DOC}: ${missing.join(", ")}`
          : `${c.fieldCount} = ${c.writableFields} writable + ${c.protectedFields} protected, ${c.unmappedFields} unmapped, ${c.realizedInRetainedArtifacts} realized in the retained artifact`,
      });
    }
    censusChecks.push({
      ok: /Realized in the retained artifact/i.test(doc),
      label: "the census table distinguishes the specification from the retained artifact",
      detail: "a table that states only one of the two counts is how a specification gets read as a rendered document",
    });
  }
}
report.checks.push(...censusChecks);
report.failures += censusChecks.filter((c) => !c.ok).length;

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
