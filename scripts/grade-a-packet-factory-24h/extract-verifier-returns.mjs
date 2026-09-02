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
import { execFileSync } from "node:child_process";
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

/* The factory's canonical proof obligations, kept identical to the list lane
 * contract L9 enforces in verify-lane-contracts.mjs. The strongest verdict is
 * a claim about all fifteen; a lane that scored fewer is downgraded below. */
const PROOF_OBLIGATIONS = [
  "ROUTE_IDENTITY", "SOURCE_IDENTITY", "COMPONENT_SET", "KNOWN_PREFILLS",
  "REQUIRED_BEFORE_FILING", "ROUTE_OPTIONS", "REPEATING_ROWS", "PROTECTED_FIELDS",
  "ARTIFACTS", "PAGE_ORDER", "CLIPPING_AND_OVERLAP", "FILING_DESTINATION",
  "FEE_AND_WAIVER", "SERVICE", "SELF_HELP_STOP",
];
const obligationFailed = (r) => {
  if (r === "PASS" || r === true || UNMEASURED.has(r)) return false;
  if (r === "FAIL" || r === false) return true;
  throw new Error(`unreadable obligation result ${JSON.stringify(r)}; the vocabulary is "PASS"/"FAIL"/"NOT_MEASURABLE_HERE"/"BLOCKED_LEGAL_INPUT" or a boolean and nothing else`);
};
const obligationUnmeasured = (r) => UNMEASURED.has(r);

/*
 * A failing verdict that names no obligation is a verdict no repairer can act
 * on. Five Washington families sat in VERIFY_PENDING for exactly that reason:
 * VF16 recorded their four failing obligations inside a Captain adjudication
 * block instead of in `proofObligations`, and this extractor read only the one
 * field. The findings were in the bytes; the queue showed an empty list and
 * the families became unassignable.
 *
 * So when `proofObligations` yields nothing for a FAILING row, the obligations
 * are harvested from anywhere in that row: any key that IS one of the fifteen
 * canonical obligations, spelled either way, carrying a value that reads PASS
 * or FAIL. It keys on the factory's own vocabulary rather than on a lane's
 * field name, so it reads any lane that names an obligation somewhere, and it
 * never overrides an explicit `proofObligations` reading. It stays fail-closed
 * in the same sense the strict reader does: a value outside the vocabulary is
 * not guessed at, it is simply not harvested.
 */
const OBLIGATION_BY_SHAPE = new Map(PROOF_OBLIGATIONS.map((o) => [o.replace(/_/g, "").toLowerCase(), o]));
const canonicalObligation = (k) => OBLIGATION_BY_SHAPE.get(String(k).replace(/[^A-Za-z]/g, "").toLowerCase()) ?? null;
const readsAsFail = (v) => v === false || (typeof v === "string" && /^FAIL\b/i.test(v.trim()));
const harvestNamedObligations = (node, found = new Map(), depth = 0) => {
  if (depth > 8 || node === null || typeof node !== "object") return found;
  if (Array.isArray(node)) { for (const v of node) harvestNamedObligations(v, found, depth + 1); return found; }
  for (const [k, v] of Object.entries(node)) {
    const o = canonicalObligation(k);
    if (o && readsAsFail(v) && !found.has(o))
      found.set(o, { obligation: o, finding: typeof v === "string" ? v : null, evidence: null, readFrom: "a named-obligation block outside proofObligations" });
    harvestNamedObligations(v, found, depth + 1);
  }
  return found;
};

const problems = [];
/* Failing rows that name no obligation even after the harvest above. This is
 * reported, not refused: refusing would drop every other lane's verdicts over
 * one lane's silence, and the silence is itself the finding — a family here
 * cannot be repaired, only re-read. */
const unactionableFailures = [];
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
  /*
   * Which obligations this lane actually scored. Lane contract L9 already
   * refuses a PASS_COMPLETE_INDEPENDENT awarded over a subset of them, and it
   * caught twenty such rows the moment three verification teams were briefed
   * with a shorter checklist than the factory's own. L9 refusing is the right
   * outcome, but it leaves the queue promoting those families until someone
   * re-reads them, which is the window where a narrow verdict becomes a
   * terminal state nobody measured.
   *
   * So the downgrade happens here, at the point the verdicts are read, and by
   * the contract's own sentence: a verifier may always score less and say so,
   * but it may not call that result PASS_COMPLETE_INDEPENDENT. Such a row is
   * carried as PASS -- a true statement of what was measured, and one the
   * terminal transition does not act on -- with the unscored obligations
   * named. Nothing is discarded and no finding is rewritten; only the label
   * the contract does not allow.
   */
  const scoredTokens = new Set(JSON.stringify(doc).match(/[A-Z][A-Z_]{4,}/g) ?? []);
  const unscoredObligations = PROOF_OBLIGATIONS.filter((o) => !scoredTokens.has(o));
  for (const r of list) {
    const familyId = r.itemId ?? r.familyId ?? r.family ?? null;
    if (!familyId) { problems.push(`${d}: a row names no family`); continue; }
    // BUILT_RASTER_PENDING is a factory workflow state, not a launch verdict
    // (the prompt contract says so in as many words). It zeroes nothing and
    // waives nothing; reading it as a verdict would refuse the whole sweep.
    const rawVerdict = r.verdict ?? null;
    const declaredVerdict = rawVerdict === "BUILT_RASTER_PENDING" ? null : rawVerdict;
    const narrowlyScored = declaredVerdict === "PASS_COMPLETE_INDEPENDENT" && unscoredObligations.length > 0;
    const verdict = narrowlyScored ? "PASS" : declaredVerdict;
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
    let obligationsReadFromElsewhere = false;
    if (failedObligations.length === 0 && FAILING.has(verdict)) {
      const harvested = [...harvestNamedObligations(r).values()];
      if (harvested.length) { failedObligations = harvested; obligationsReadFromElsewhere = true; }
      else unactionableFailures.push(`${d}/${familyId}`);
    }
    if (verdict === "PASS_COMPLETE_INDEPENDENT" && unmeasuredObligations.length)
      { problems.push(`${d}/${familyId}: claims PASS_COMPLETE_INDEPENDENT with ${unmeasuredObligations.length} unmeasured obligation(s): ${unmeasuredObligations.join(", ")}`); continue; }
    rows.push({
      familyId, verdict, lane: d, isIndependentVerification: isVerification,
      /*
       * The commit THIS ROW's read was made against, and only if the row says
       * so. A document-level base is not inherited: these files are appended
       * to by successive lanes, so a later team's baseSha lands on top of
       * older rows it never read. vf11 shows it exactly -- a stale
       * vt_seal_18_to_21 FAIL carrying the fresh base a different team stamped
       * on the document when it appended its own rows, which is a stale read
       * wearing a current timestamp. VT2 saw the same hazard from the writing
       * side and recorded per-row bases to avoid stamping its commit onto
       * VF-SRC-A's rows in the files it shared.
       */
      verifiedAtBase: r.verifiedAtBase ?? r.baseSha ?? null,
      ...(narrowlyScored ? {
        downgradedFrom: "PASS_COMPLETE_INDEPENDENT",
        downgradedBecause: `the lane scored ${PROOF_OBLIGATIONS.length - unscoredObligations.length} of ${PROOF_OBLIGATIONS.length} proof obligations; the strongest verdict is a claim about all of them`,
        obligationsNotScored: unscoredObligations,
      } : {}),
      failedObligations, failedObligationNames: failedObligations.map((x) => x.obligation).sort(),
      ...(obligationsReadFromElsewhere ? { obligationsReadFromElsewhere: "this row's proofObligations named none; the failing obligations below were read from a named-obligation block elsewhere in the same row" } : {}),
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

/*
 * Lane number is a proxy for recency, and it is wrong exactly when a
 * lower-numbered lane does the LATER read. VF25 failed mi_setaside_marihuana
 * before its repair; VF09 passed the repaired family afterwards; ranking by
 * lane number kept the stale FAIL current and held a finished family out of
 * the queue. The lanes were both right about what they saw, so this is an
 * ordering defect, not a disagreement.
 *
 * The rows say when they were read: each carries the commit it was verified
 * against. Commit ancestry is a real ordering, so a read made at a descendant
 * of another read's base is later, full stop. Lane precedence stays as the
 * tie-break for rows whose bases are equal, unrelated, missing, or not
 * commit-shaped (xvf-a records prose where a SHA belongs).
 */
const isCommit = (s) => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s);
const ancestry = new Map();
const isAncestorOf = (a, b) => {
  if (!isCommit(a) || !isCommit(b) || a === b) return false;
  const key = `${a}\0${b}`;
  if (ancestry.has(key)) return ancestry.get(key);
  let answer = false;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b], { cwd: ROOT, stdio: "ignore" });
    answer = true;
  } catch { answer = false; }
  ancestry.set(key, answer);
  return answer;
};
/*
 * Only the base a lane DECLARES is used. The commit that last wrote a lane's
 * rows file looks like the same signal and is not: a merge that touches an old
 * lane's file incidentally makes a stale read look fresh, and using it put
 * ak-courtview, co_motion_seal_nonconviction and mi_setaside_marihuana back on
 * the failing list on the strength of reads nobody had redone. A lane that
 * does not say when it read is a lane this cannot order, and lane precedence
 * decides it — the same answer as before, rather than a confident wrong one.
 */
const supersedes = (r, prior) => {
  if (isAncestorOf(prior.verifiedAtBase, r.verifiedAtBase)) return true;
  if (isAncestorOf(r.verifiedAtBase, prior.verifiedAtBase)) return false;
  /*
   * A row that states the commit it read at has made a checkable claim about
   * when it read; one that states nothing has not. Lane number is only a proxy
   * for recency and this file exists because that proxy inverts. So stated
   * evidence outranks the proxy, and lane precedence decides only when neither
   * row says when it read.
   */
  const rSays = isCommit(r.verifiedAtBase);
  const priorSays = isCommit(prior.verifiedAtBase);
  if (rSays !== priorSays) return rSays;
  return lanePrecedence(r) > lanePrecedence(prior);
};

const current = new Map();
for (const r of rows.filter((x) => x.isIndependentVerification && x.verdict)) {
  const prior = current.get(r.familyId);
  if (!prior || supersedes(r, prior)) current.set(r.familyId, r);
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
  unactionableFailures: {
    whatThisIs: "rows carrying a failing verdict that name no obligation anywhere, so no repairer can be dispatched from them; each needs a fresh independent read, not a repair",
    rows: unactionableFailures.sort()
  },
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
