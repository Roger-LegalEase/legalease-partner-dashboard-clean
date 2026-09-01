#!/usr/bin/env node
/**
 * What the independent verifiers actually returned, read from their own diffs.
 *
 * P2V01-P2V03 returned nine Washington families FAIL_REPAIR_REQUIRED. All nine
 * stayed in VERIFYING, because the state machine reads VERIFYING off the
 * presence of an active independent-verification owner and never asks whether
 * that owner has returned. A lane that has returned is not still verifying, and
 * a family a verifier has failed is not a family awaiting a verdict: it is a
 * family with one. Left alone it would have gone to Lawrence review as
 * in-flight rather than as failed.
 *
 * This sweeps every return directory, reads the verdicts, and writes them where
 * the generator can see them.
 *
 * TWO RESULT VOCABULARIES, which is why this fails closed on a third.
 *
 * The P2V rows record thirteen obligations as the strings "PASS" and "FAIL" and
 * two -- routeOptions and repeatingRows -- as the boolean `true`. Reading the
 * strings alone counted those two booleans as failures and made four defect
 * classes out of two. Both spellings are accepted here and named explicitly;
 * anything else refuses, because a verdict nobody can read is not a verdict and
 * guessing at it is how a passing obligation becomes a repair lane.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETURNS = "data/rcap-grade-a/codex-cloud";
const OUT = "data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json";
const CHECK = process.argv.includes("--check");

const VERDICTS = ["PASS_COMPLETE_INDEPENDENT", "PASS", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT", "BLOCKED_BEFORE_CLAIM", "STOPPED", "COMPLETED"];
const FAILING = new Set(["FAIL_REPAIR_REQUIRED"]);
const PASSING = new Set(["PASS_COMPLETE_INDEPENDENT", "PASS"]);

// An obligation result is PASS, FAIL, or a refusal to read it.
const obligationFailed = (r) => {
  if (r === "PASS" || r === true) return false;
  if (r === "FAIL" || r === false) return true;
  throw new Error(`unreadable obligation result ${JSON.stringify(r)}; the vocabulary is "PASS"/"FAIL" or a boolean and nothing else`);
};

const problems = [];
const rows = [];
const dirs = fs.existsSync(path.join(ROOT, RETURNS))
  ? fs.readdirSync(path.join(ROOT, RETURNS), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];

for (const d of dirs) {
  const p = path.join(ROOT, RETURNS, d, "rows.json");
  if (!fs.existsSync(p)) continue;
  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { problems.push(`${d}/rows.json is unreadable: ${e.message}`); continue; }
  const list = Array.isArray(doc) ? doc : doc.rows ?? [];
  // Only lanes that are actually independent verification. A builder's own row
  // is not a verdict, and counting one would be the self-verification the whole
  // design refuses.
  const isVerification = /verif/i.test(d);
  for (const r of list) {
    const familyId = r.itemId ?? r.familyId ?? r.family ?? null;
    if (!familyId) { problems.push(`${d}: a row names no family`); continue; }
    const verdict = r.verdict ?? null;
    if (verdict && !VERDICTS.includes(verdict)) { problems.push(`${d}/${familyId}: undeclared verdict ${verdict}`); continue; }
    let failedObligations = [];
    if (r.proofObligations) {
      try {
        failedObligations = Object.entries(r.proofObligations)
          .filter(([, v]) => obligationFailed(v?.result))
          .map(([k, v]) => ({ obligation: k, finding: v.finding ?? null, evidence: v.evidence ?? null }));
      } catch (e) { problems.push(`${d}/${familyId}: ${e.message}`); continue; }
    }
    rows.push({
      familyId, verdict, lane: d, isIndependentVerification: isVerification,
      failedObligations, failedObligationNames: failedObligations.map((x) => x.obligation).sort(),
      evidencePath: `${RETURNS}/${d}/rows.json`,
      repairAssignmentsPath: fs.existsSync(path.join(ROOT, RETURNS, d, "repair-assignments.json"))
        ? `${RETURNS}/${d}/repair-assignments.json` : null,
      reproduction: `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${familyId}`
    });
  }
}

// One family, one independent verdict. Two verifiers holding one family is a
// collision the ledger cannot express and a disagreement nobody adjudicates.
const seen = new Map();
for (const r of rows.filter((x) => x.isIndependentVerification && x.verdict)) {
  const prior = seen.get(r.familyId);
  if (prior && prior.lane !== r.lane) problems.push(`${r.familyId} carries independent verdicts from both ${prior.lane} and ${r.lane}`);
  else seen.set(r.familyId, r);
}

const failed = rows.filter((r) => r.isIndependentVerification && FAILING.has(r.verdict));
const passed = rows.filter((r) => r.isIndependentVerification && PASSING.has(r.verdict));

const doc = {
  schemaVersion: "rcap-verifier-returns/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs",
  whatThisIsFor: "A returned verdict outranks an active-owner claim. A lane that has returned is not still verifying, and a family its verifier failed is not awaiting a verdict.",
  verdictVocabulary: VERDICTS,
  obligationResultVocabulary: ['"PASS"', '"FAIL"', "true", "false"],
  obligationVocabularyNote: "The P2V rows record thirteen obligations as strings and two as booleans. Both are read; a third spelling refuses, because reading only the strings turned two passing obligations into failures and doubled the defect count.",
  counts: {
    returnDirectories: dirs.length,
    rows: rows.length,
    independentVerdicts: rows.filter((r) => r.isIndependentVerification && r.verdict).length,
    failRepairRequired: failed.length,
    passIndependent: passed.length
  },
  failRepairRequiredFamilies: failed.map((r) => r.familyId).sort(),
  rows: rows.sort((a, b) => a.familyId.localeCompare(b.familyId) || a.lane.localeCompare(b.lane)),
  commercialRoutesOpened: 0,
  productionTouched: false,
  grantsNothing: "A verdict moves a family in the queue. It promotes nothing, opens no route, and prepares no review package."
};

if (problems.length) {
  console.error(`REFUSED verifier-return extraction — ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 10)) console.error(`  ${p}`);
  process.exit(1);
}

const text = `${JSON.stringify(doc, null, 2)}\n`;
if (CHECK) {
  const committed = fs.existsSync(path.join(ROOT, OUT)) ? fs.readFileSync(path.join(ROOT, OUT), "utf8") : null;
  if (committed !== text) { console.error(`VERIFIER_RETURNS.json does not converge with the return directories.`); process.exit(1); }
  console.log(`verifier returns converge: ${doc.counts.independentVerdicts} independent verdict(s), ${failed.length} FAIL_REPAIR_REQUIRED.`);
  process.exit(0);
}
fs.writeFileSync(path.join(ROOT, OUT), text);
console.log(`Wrote ${OUT}`);
console.log(`  ${dirs.length} return director(ies) · ${doc.counts.independentVerdicts} independent verdict(s)`);
console.log(`  FAIL_REPAIR_REQUIRED ${failed.length}: ${doc.failRepairRequiredFamilies.join(", ") || "(none)"}`);
