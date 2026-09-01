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
/*
 * The factory's own verification lanes return verdicts as
 * data/rcap-grade-a/packet-factory-24h/vf<NN>/rows.json. This sweep read only
 * the codex-cloud directory, so every factory-lane verdict — including the
 * first genuine PASS_COMPLETE_INDEPENDENT rows this sprint produced — was
 * invisible to the generator and the families sat in VERIFY_PENDING forever.
 * Only vf<NN> directories are read here: builder and repair lanes are not
 * verdict sources, and vf-src-a is source verification, not packet
 * verification.
 */
const FACTORY_RETURNS = "data/rcap-grade-a/packet-factory-24h";
const OUT = "data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json";
const CHECK = process.argv.includes("--check");

const VERDICTS = ["PASS_COMPLETE_INDEPENDENT", "PASS", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT", "BLOCKED_BEFORE_CLAIM", "STOPPED", "COMPLETED"];
const FAILING = new Set(["FAIL_REPAIR_REQUIRED"]);
const PASSING = new Set(["PASS_COMPLETE_INDEPENDENT", "PASS"]);

// An obligation result is PASS, FAIL, NOT_MEASURABLE_HERE, or a refusal to
// read it. NOT_MEASURABLE_HERE is what the pre-corpus-mount verification lanes
// recorded when an obligation (usually SOURCE_IDENTITY) could not be measured
// in their environment: it is not a packet defect, and it is not a pass — a
// row claiming PASS_COMPLETE_INDEPENDENT while carrying one is refused below.
const UNMEASURED = new Set(["NOT_MEASURABLE_HERE", "BLOCKED_LEGAL_INPUT"]);
const obligationFailed = (r) => {
  if (r === "PASS" || r === true || UNMEASURED.has(r)) return false;
  if (r === "FAIL" || r === false) return true;
  throw new Error(`unreadable obligation result ${JSON.stringify(r)}; the vocabulary is "PASS"/"FAIL"/"NOT_MEASURABLE_HERE"/"BLOCKED_LEGAL_INPUT" or a boolean and nothing else`);
};
const obligationUnmeasured = (r) => UNMEASURED.has(r);

const problems = [];
const rows = [];
const dirsUnder = (base, keep) => fs.existsSync(path.join(ROOT, base))
  ? fs.readdirSync(path.join(ROOT, base), { withFileTypes: true })
      .filter((d) => d.isDirectory() && keep(d.name)).map((d) => ({ base, name: d.name })).sort((a, b) => a.name.localeCompare(b.name))
  : [];
const sweep = [
  ...dirsUnder(RETURNS, () => true),
  ...dirsUnder(FACTORY_RETURNS, (n) => /^vf\d+$/.test(n))
];
const dirs = sweep.map((s) => s.name);

for (const { base, name: d } of sweep) {
  const p = path.join(ROOT, base, d, "rows.json");
  if (!fs.existsSync(p)) continue;
  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { problems.push(`${d}/rows.json is unreadable: ${e.message}`); continue; }
  const list = Array.isArray(doc) ? doc : doc.rows ?? [];
  // Only lanes that are actually independent verification. A builder's own row
  // is not a verdict, and counting one would be the self-verification the whole
  // design refuses.
  const isVerification = base === FACTORY_RETURNS
    ? (doc.laneKind ?? "") === "independent-verification" || /^vf\d+$/.test(d)
    : /verif/i.test(d);
  for (const r of list) {
    const familyId = r.itemId ?? r.familyId ?? r.family ?? null;
    if (!familyId) { problems.push(`${d}: a row names no family`); continue; }
    // BUILT_RASTER_PENDING is a factory workflow state, not a launch verdict
    // (the prompt contract says so in as many words). It zeroes nothing and
    // waives nothing; reading it as a verdict would refuse the whole sweep.
    const rawVerdict = r.verdict ?? null;
    const verdict = rawVerdict === "BUILT_RASTER_PENDING" ? null : rawVerdict;
    if (verdict && !VERDICTS.includes(verdict)) { problems.push(`${d}/${familyId}: undeclared verdict ${verdict}`); continue; }
    let failedObligations = [];
    let unmeasuredObligations = [];
    if (r.proofObligations) {
      try {
        failedObligations = Object.entries(r.proofObligations)
          .filter(([, v]) => obligationFailed(v?.result))
          .map(([k, v]) => ({ obligation: k, finding: v.finding ?? null, evidence: v.evidence ?? null }));
        unmeasuredObligations = Object.entries(r.proofObligations)
          .filter(([, v]) => obligationUnmeasured(v?.result)).map(([k]) => k).sort();
      } catch (e) { problems.push(`${d}/${familyId}: ${e.message}`); continue; }
    }
    if (verdict === "PASS_COMPLETE_INDEPENDENT" && unmeasuredObligations.length)
      { problems.push(`${d}/${familyId}: claims PASS_COMPLETE_INDEPENDENT with ${unmeasuredObligations.length} unmeasured obligation(s): ${unmeasuredObligations.join(", ")}`); continue; }
    rows.push({
      familyId, verdict, lane: d, isIndependentVerification: isVerification,
      failedObligations, failedObligationNames: failedObligations.map((x) => x.obligation).sort(),
      unmeasuredObligations,
      evidencePath: `${base}/${d}/rows.json`,
      repairAssignmentsPath: fs.existsSync(path.join(ROOT, base, d, "repair-assignments.json"))
        ? `${base}/${d}/repair-assignments.json` : null,
      reproduction: `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${familyId}`
    });
  }
}

// One family, one CURRENT independent verdict. Lanes are minted in order, so
// a later lane's read supersedes an earlier lane's — a family failed by VF06
// and passed by VF23 after repair is a passing family, not a disagreement.
// Factory lanes outrank the codex-cloud return directories (the factory is
// the current channel; the codex-cloud verdicts predate it). The superseded
// rows stay in `rows` as history; only `current` feeds the counts and the
// failing-family list.
const lanePrecedence = (r) => {
  const n = Number((r.lane.match(/(\d+)$/) ?? [])[1] ?? 0);
  const factory = r.evidencePath.startsWith(FACTORY_RETURNS) ? 1000 : 0;
  return factory + n;
};
const current = new Map();
for (const r of rows.filter((x) => x.isIndependentVerification && x.verdict)) {
  const prior = current.get(r.familyId);
  if (!prior || lanePrecedence(r) > lanePrecedence(prior)) current.set(r.familyId, r);
}
for (const r of rows) r.superseded = r.isIndependentVerification && !!r.verdict && current.get(r.familyId) !== r;

const currentRows = [...current.values()];
const failed = currentRows.filter((r) => FAILING.has(r.verdict));
const passed = currentRows.filter((r) => PASSING.has(r.verdict));

const doc = {
  schemaVersion: "rcap-verifier-returns/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs",
  whatThisIsFor: "A returned verdict outranks an active-owner claim. A lane that has returned is not still verifying, and a family its verifier failed is not awaiting a verdict.",
  verdictVocabulary: VERDICTS,
  obligationResultVocabulary: ['"PASS"', '"FAIL"', "true", "false"],
  obligationVocabularyNote: "The P2V rows record thirteen obligations as strings and two as booleans. Both are read; a third spelling refuses, because reading only the strings turned two passing obligations into failures and doubled the defect count.",
  supersessionRule: "one current verdict per family: the highest-precedence lane wins (factory vf lanes over codex-cloud directories, then higher lane number); superseded rows remain as history with superseded: true",
  counts: {
    returnDirectories: dirs.length,
    rows: rows.length,
    independentVerdicts: currentRows.length,
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
