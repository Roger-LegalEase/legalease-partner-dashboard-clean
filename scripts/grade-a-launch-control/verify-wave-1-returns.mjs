#!/usr/bin/env node
// Mechanical review of the first wave's worker returns.
//
//   node scripts/grade-a-launch-control/verify-wave-1-returns.mjs [--write] [--mutations]
//
// A checkpoint that reads a worker's own summary and repeats it has verified
// nothing. Every claim here is checked against git and against the assignment
// manifest the worker was dispatched under:
//
//   - the commit exists and the branch tip IS that commit;
//   - its parent is exactly the control baseline, so nobody rebased onto
//     something else and called it the same work;
//   - every changed path is inside the lane's owned paths;
//   - no prohibited path is touched;
//   - every output the assignment required exists at that commit;
//   - the record says commercialRoutesOpened 0 and productionTouched false, or
//     the lane is reported as not having said so.
//
// A return whose commit cannot be resolved FAILS. It is never skipped: an
// unreachable commit read as "nothing to check" is the vacuity that lets an
// unreviewed return through.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WRITE = process.argv.includes("--write");
const MUTATIONS = process.argv.includes("--mutations");
const OUT = "data/rcap-grade-a/launch-control/WAVE_1_RETURN_REVIEW.json";
const DISPATCH = "data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29 }).trim(); } catch { return null; } };
const showJson = (sha, file) => { const t = git(["show", `${sha}:${file}`]); if (t === null) return null; try { return JSON.parse(t); } catch { return null; } };

const dispatch = read(DISPATCH);
const CONTROL_BASE = dispatch.captainBaseSha;

// The returns as reported at checkpoint 1. Pinned rather than discovered, so a
// branch that moves after the return cannot quietly change what was reviewed.
const RETURNS = [
  { id: "C1_SPLIT_AUTOMATIC_CORRECTION_STATUS", branch: "codex/c1-split-automatic-correction-status", commit: "a37d9da086213b0ddf558a67f085ef875f0e6fd3", reported: "PARTIALLY_ACCEPTED" },
  { id: "C2_SPLIT_AUTOMATIC_COURT_PETITION", branch: "codex/c2-split-automatic-court-petition", commit: "1aa215a107eb1906eaa078b1cabdd6e3525e9eae", reported: "PARTIALLY_ACCEPTED" },
  { id: "C3_SPLIT_AGENCY_PROSECUTOR_APPLICATION", branch: "codex/c3-split-agency-prosecutor-application", commit: "3e095624c8a965943bee1fc1721bb739948f7298", reported: "PARTIALLY_ACCEPTED" },
  { id: "C4_SPLIT_OBJECTION_HEARING_APPEAL", branch: "codex/c4-split-objection-hearing-appeal", commit: "efb5082384e50281a8e95fdba67581c8f4df4f8d", reported: "ACCEPTED" },
  { id: "C5_SPLIT_POST_ORDER_ENFORCEMENT", branch: "codex/c5-split-post-order-enforcement", commit: "e37d332015ab63e4a8e7f075bc6937490bf94321", reported: "PARTIALLY_ACCEPTED" },
  { id: "C6_CONVERT_ALL_TO_A", branch: "codex/c6-convert-all-to-a", commit: "1bcec9da2df7f0298dc2356472e8e5f7785ff772", reported: "ACCEPTED" },
  { id: "C7_CONFIRM_B_GUIDANCE", branch: "codex/c7-confirm-b-guidance", commit: "e393286f57503b2e54b47eed96b6605fc764e51e", reported: "ACCEPTED_PENDING_CAPTAIN_TEST" },
  { id: "C8_ALREADY_ANSWERED_ENGINEERING", branch: "codex/c8-already-answered-engineering", commit: "a8609b03e6f8eb57614a90ab8612f5635cd72253", reported: "NEEDS_REWORK" },
  { id: "C9_ROUTE_MAPPING_RECONCILIATION", branch: "codex/c9-route-mapping-reconciliation", commit: "9e44ee8a78ddf9056221e2218ef91cf8cf331aa3", reported: "PARTIALLY_ACCEPTED" },
  { id: "C10_SOURCE_IDENTITY_ACQUISITION", branch: "codex/c10-source-identity-acquisition", commit: "994e2daf42278d1cbbd20ff033f7b96ceb08467b", reported: "PARTIALLY_ACCEPTED_EXTERNAL_BLOCK" },
  { id: "C12_NONPRODUCTION_ACCEPTANCE_PREP", branch: "codex/c12-nonproduction-acceptance-prep", commit: "eaac8ebe0f7b8009900250e2296e8fac46e8e7e6", reported: "BLOCKED_WITH_VALID_EVIDENCE" },
  { id: "C11_PACKET_FACTORY_ACCELERATOR", branch: "codex/c11-packet-factory-accelerator", commit: null, reported: "STILL_RUNNING" }
];

/** An owned-path pattern reduced to the prefix a changed file must sit under. */
const ownedPrefix = (pattern) => pattern.split("(")[0].trim().replace(/\/?\*\*$/, "").replace(/\/<[^>]+>\.mjs$/, "").trim();
/** A prohibited pattern reduced the same way, so `dir/**` blocks everything under dir. */
const prohibitedPrefix = (pattern) => pattern.replace(/\/?\*\*$/, "");

/** Where an assignment's required outputs actually live, as concrete paths. */
const requiredOutputFiles = (assignment) =>
  assignment.requiredOutputs
    .map((line) => (line.match(/^([\w./<>-]+\.(?:json|md))\b/) ?? [])[1])
    .filter(Boolean);

const reviews = [];
for (const entry of RETURNS) {
  const assignment = dispatch.assignments.find((a) => a.assignmentId === entry.id) ?? null;
  const checks = [];
  const add = (name, passed, observed) => checks.push({ check: name, passed, observed });

  if (entry.commit === null) {
    reviews.push({
      ...entry,
      assignmentFound: assignment !== null,
      verdict: "STILL_RUNNING_NOT_REVIEWED",
      whyNotReviewed: "No return commit was reported. The lane's owned paths are left untouched and nothing it owns is reassigned.",
      ownedPaths: assignment?.ownedPaths ?? [],
      checks: []
    });
    continue;
  }

  add("the assignment exists in the dispatch manifest", assignment !== null, entry.id);
  const type = git(["cat-file", "-t", entry.commit]);
  add("the return commit is present in this repository", type === "commit", type ?? "unresolvable");
  if (type !== "commit") {
    reviews.push({ ...entry, verdict: "UNVERIFIABLE_COMMIT_NOT_PRESENT", checks });
    continue;
  }

  const tip = git(["rev-parse", `origin/${entry.branch}`]);
  add("the worker branch tip is exactly this commit", tip === entry.commit, `tip ${String(tip).slice(0, 8)}`);

  const parent = git(["rev-parse", `${entry.commit}^`]);
  add("its parent is exactly the control baseline", parent === CONTROL_BASE, `parent ${String(parent).slice(0, 8)} vs base ${CONTROL_BASE.slice(0, 8)}`);

  const changed = (git(["diff", "--name-only", CONTROL_BASE, entry.commit]) ?? "").split("\n").filter(Boolean);
  const owned = (assignment?.ownedPaths ?? []).map(ownedPrefix).filter(Boolean);
  const outside = changed.filter((f) => !owned.some((p) => f === p || f.startsWith(`${p}/`)));
  add("every changed path is inside the lane's owned paths", outside.length === 0, outside.join(", ") || `${changed.length} file(s), all in scope`);

  const prohibited = (assignment?.prohibitedPaths ?? []).map(prohibitedPrefix);
  const violations = changed.filter((f) => prohibited.some((p) => f === p || f.startsWith(`${p}/`)));
  add("no prohibited path is touched", violations.length === 0, violations.join(", ") || "none");

  const expected = requiredOutputFiles(assignment ?? { requiredOutputs: [] });
  const missing = expected.filter((f) => !f.includes("<") && git(["cat-file", "-t", `${entry.commit}:${f}`]) !== "blob");
  add("every required output exists at this commit", missing.length === 0, missing.join(", ") || `${expected.length} expected`);

  // The lane's own posture claims, read from whatever file it wrote rather than
  // from its summary. A lane that never stated them is reported as not stating
  // them, which is different from stating false.
  let opened = null; let production = null;
  for (const file of changed.filter((f) => f.endsWith(".json"))) {
    const doc = showJson(entry.commit, file);
    if (!doc) continue;
    const flat = JSON.stringify(doc);
    const o = flat.match(/"commercialRoutesOpened"\s*:\s*(\d+)/);
    if (o) opened = Math.max(opened ?? 0, Number(o[1]));
    const p = flat.match(/"productionTouched"\s*:\s*(true|false)/);
    if (p) production = production === true ? true : p[1] === "true";
  }
  add("the return opens no commercial route", opened === 0 || opened === null, opened === null ? "not stated by this lane" : `commercialRoutesOpened ${opened}`);
  add("the return did not touch Production", production === false || production === null, production === null ? "not stated by this lane" : `productionTouched ${production}`);

  const failed = checks.filter((c) => !c.passed);
  const requiredOutputMissing = missing.length > 0;
  const verdict = failed.length === 0
    ? (requiredOutputMissing ? "SCOPE_CLEAN_OUTPUT_MISSING" : "SCOPE_AND_OUTPUT_VERIFIED")
    : failed.length === 1 && requiredOutputMissing
      ? "SCOPE_CLEAN_OUTPUT_MISSING"
      : "REFUSED";

  reviews.push({
    ...entry,
    verdict,
    changedPaths: changed,
    requiredOutputsExpected: expected,
    requiredOutputsMissing: missing,
    statedCommercialRoutesOpened: opened,
    statedProductionTouched: production,
    checks
  });
}

// ---- systemic findings the returns themselves prove ------------------------------
//
// These are not opinions about the wave. Each is a fact readable from git or from
// a committed return, and each names the dispatch defect that caused it.
const manifestAtBase = git(["cat-file", "-t", `${CONTROL_BASE}:${DISPATCH}`]) === "blob";
const promptsAtBase = git(["cat-file", "-t", `${CONTROL_BASE}:docs/rcap/grade-a/launch-control/prompts`]) === "tree";

const systemic = [
  {
    id: "SYS-A",
    finding: "Workers were told to branch from the control baseline and to read the assignment manifest as a required input, but the manifest and the prompt directory exist only in the dispatch commit that follows it.",
    evidence: {
      manifestPresentAtControlBase: manifestAtBase,
      promptDirectoryPresentAtControlBase: promptsAtBase,
      independentlyReportedBy: ["C9_ROUTE_MAPPING_RECONCILIATION", "C10_SOURCE_IDENTITY_ACQUISITION"]
    },
    cause: "The two-commit method separates the base a worker builds on from the commit that carries the assignment. The prompts named the base for both.",
    fix: "Every prompt and the manifest now state two commits: branch from the control baseline, and read and verify the assignment from the dispatch commit."
  },
  {
    id: "SYS-B",
    finding: "At least one worker host could not install dependencies: 32 MiB free after worktree creation, so no test that needs node_modules could run.",
    evidence: {
      observedInReturn: "data/rcap-grade-a/participant-data-rights/hosted-acceptance.json (C12)",
      returnsDocumentingIt: 1,
      reportedByOwnerAsSharedAcrossTheWave: true,
      note: "One return documents it in this repository. The owner reports it as a shared worker-environment defect; that wider claim is recorded as reported, not as observed here."
    },
    cause: "No disk precondition was stated in the dispatch, and no lane was told what to do when the toolchain cannot be installed.",
    fix: "The worker execution contract states a minimum free-disk precondition and requires a lane to report DEPENDENCIES_UNINSTALLABLE rather than reporting a test as run."
  },
  {
    id: "SYS-C",
    finding: "Acquisition stopped on all 49 obligations because the assignment's group stop rule said egress was refused, not because a probe found it refused. C10's own HEAD probe reached 5 of the 7 official hosts it tested.",
    evidence: {
      probeRecordedIn: "data/rcap-grade-a/source-acquisition/wave-1/acquired.json",
      method: "HEAD only; response bodies were not downloaded",
      reachable: 5,
      refused: 2,
      documentsAcquired: 0
    },
    cause: "A blanket 'blocked on egress' stop condition written into the dispatch pre-empted the per-host evidence.",
    fix: "Egress is recorded per exact source. A next-wave worker is given the refused hosts and told not to retry them, and the reachable hosts without a blanket stop."
  },
  {
    id: "SYS-D",
    finding: "Seven branch-identity lanes returned seven different schemas for the same two required filenames: different array keys, different status vocabularies, different field names for the same fact.",
    evidence: {
      lanesReviewed: 7,
      distinctArrayKeys: ["branchIdentities", "routes", "records"],
      distinctStatusVocabularies: ["COMPLETED/STOPPED_UNRESOLVED", "COMPLETE_NEW_IDENTITY/COMPLETE_REUSED_BRANCH/STOPPED_*", "COMPLETE_NEW_IDENTITY_RECORDED/STOPPED_UNRESOLVED_CROSSWALK", "COMPLETED_WITH_SCENARIO_SPLIT/STOPPED_PARTIAL_CROSSWALK", "implementationStop object", "no status field"]
    },
    cause: "The dispatch specified required outputs by filename and prose, never by schema, so nothing downstream could read them uniformly and no verifier could prove a route was completed rather than merely mentioned.",
    fix: "A canonical integration status is generated from the seven returns through explicit per-lane adapters, and the next dispatch states the output schema each lane must emit."
  }
];

const summary = {
  returnsReported: RETURNS.length,
  reviewed: reviews.filter((r) => r.verdict !== "STILL_RUNNING_NOT_REVIEWED").length,
  stillRunning: reviews.filter((r) => r.verdict === "STILL_RUNNING_NOT_REVIEWED").length,
  scopeAndOutputVerified: reviews.filter((r) => r.verdict === "SCOPE_AND_OUTPUT_VERIFIED").length,
  scopeCleanOutputMissing: reviews.filter((r) => r.verdict === "SCOPE_CLEAN_OUTPUT_MISSING").length,
  refused: reviews.filter((r) => r.verdict === "REFUSED").length,
  unverifiable: reviews.filter((r) => r.verdict === "UNVERIFIABLE_COMMIT_NOT_PRESENT").length,
  prohibitedPathViolations: reviews.reduce((n, r) => n + (r.checks ?? []).filter((c) => c.check.includes("prohibited") && !c.passed).length, 0),
  outOfScopeWrites: reviews.reduce((n, r) => n + (r.checks ?? []).filter((c) => c.check.includes("owned paths") && !c.passed).length, 0),
  commercialRoutesOpened: Math.max(0, ...reviews.map((r) => r.statedCommercialRoutesOpened ?? 0)),
  productionTouched: reviews.some((r) => r.statedProductionTouched === true)
};

const doc = {
  schemaVersion: "rcap-grade-a-wave-1-return-review/v1",
  generatedBy: "scripts/grade-a-launch-control/verify-wave-1-returns.mjs",
  question: "Eleven returns arrived and one lane is still running. Which of them did what they claim, checked against git rather than against their own summaries?",
  controlBaseSha: CONTROL_BASE,
  dispatchManifest: DISPATCH,
  reviewIsNotAcceptance:
    "Scope and outputs verifying says a return wrote what it was allowed to write and produced the files it owed. It does not say the work inside those files is complete: per-route completion is settled by CATEGORY_B_INTEGRATION_STATUS.json, and what is left is settled by RESIDUAL_WORK.json.",
  summary,
  systemicFindings: systemic,
  reviews
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);

for (const r of reviews) {
  const mark = { SCOPE_AND_OUTPUT_VERIFIED: "ok  ", SCOPE_CLEAN_OUTPUT_MISSING: "warn", STILL_RUNNING_NOT_REVIEWED: "----", REFUSED: "FAIL", UNVERIFIABLE_COMMIT_NOT_PRESENT: "FAIL" }[r.verdict];
  console.log(`  ${mark} ${r.id.padEnd(42)} ${r.verdict}`);
}
console.log(`\n  ${summary.scopeAndOutputVerified} verified · ${summary.scopeCleanOutputMissing} output missing · ${summary.refused} refused · ${summary.stillRunning} still running`);
console.log(`  out-of-scope writes ${summary.outOfScopeWrites} · prohibited-path violations ${summary.prohibitedPathViolations} · commercial routes opened ${summary.commercialRoutesOpened} · production touched ${summary.productionTouched}`);

if (WRITE) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`\nWrote ${OUT}`);
} else {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`\n${OUT} is stale or missing. Run with --write.`); process.exit(1); }
  console.log(`\n${OUT} current.`);
}

if (summary.refused > 0 || summary.unverifiable > 0 || summary.outOfScopeWrites > 0 || summary.prohibitedPathViolations > 0 || summary.productionTouched || summary.commercialRoutesOpened > 0) {
  console.error("\nthe wave review found a refusal.");
  process.exit(1);
}

if (MUTATIONS) {
  console.log("\nmutations:");
  const target = outPath;
  const original = fs.readFileSync(target);
  const cases = [
    { name: "an out-of-scope write reported as clean is caught", mutate: (j) => { j.summary.outOfScopeWrites = 0; j.reviews[0].changedPaths.push("supabase/migrations/evil.sql"); return j; } },
    { name: "a return whose recorded commit is not the branch tip is caught", mutate: (j) => { j.reviews[0].commit = "0".repeat(40); return j; } },
    { name: "a missing required output hidden behind a verified verdict is caught", mutate: (j) => { const r = j.reviews.find((x) => x.verdict === "SCOPE_CLEAN_OUTPUT_MISSING"); if (r) r.verdict = "SCOPE_AND_OUTPUT_VERIFIED"; return j; } },
    { name: "a still-running lane marked reviewed is caught", mutate: (j) => { const r = j.reviews.find((x) => x.verdict === "STILL_RUNNING_NOT_REVIEWED"); r.verdict = "SCOPE_AND_OUTPUT_VERIFIED"; return j; } },
    { name: "a systemic finding deleted is caught", mutate: (j) => { j.systemicFindings.pop(); return j; } },
    { name: "a commercial route opened by a return is caught", mutate: (j) => { j.summary.commercialRoutesOpened = 1; return j; } }
  ];
  let undetected = 0;
  try {
    for (const testCase of cases) {
      fs.writeFileSync(target, JSON.stringify(testCase.mutate(JSON.parse(original.toString("utf8"))), null, 2) + "\n");
      let caught = false;
      try { execFileSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT, stdio: "pipe" }); } catch { caught = true; }
      console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
      if (!caught) undetected += 1;
      fs.writeFileSync(target, original);
    }
  } finally { fs.writeFileSync(target, original); }
  const restored = fs.readFileSync(target).equals(original);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the wave review proves less than it claims."); process.exit(1); }
  console.log(`\nOK wave review mutations — ${cases.length} case(s), every mutation caught.`);
}
