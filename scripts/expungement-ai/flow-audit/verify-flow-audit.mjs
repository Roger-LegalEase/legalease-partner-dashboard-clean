#!/usr/bin/env node
// The Phase 1 exit gate, executable.
//
//   node scripts/expungement-ai/flow-audit/verify-flow-audit.mjs
//
// Checks exactly the conditions the Phase 1 prompt and the programme master plan
// name, and nothing else. It does not run the repository's unrelated mutation
// suites; a flow audit has no business asserting them.
//
// Every check either passes with the number it measured, or fails with the
// number it measured and the number it wanted. A check that cannot run says so
// rather than passing quietly.

import fs from "node:fs";
import path from "node:path";
import nodeCrypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { ROOT_DIR, read, readJson, exists, gitSha } from "./lib/engine.mjs";

const results = [];
function check(id, description, fn) {
  try {
    const outcome = fn();
    results.push({ id, description, passed: outcome.passed, detail: outcome.detail });
  } catch (error) {
    results.push({ id, description, passed: false, detail: `threw: ${String(error?.message ?? error).slice(0, 300)}` });
  }
}

const manifest = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const inventory = readJson("data/expungement-ai/flow-audit/question-inventory.json");
const branchCoverage = readJson("data/expungement-ai/flow-audit/branch-coverage.json");
const register = readJson("data/expungement-ai/flow-audit/issue-register.json");
const shards = readJson("data/expungement-ai/flow-audit/shard-assignment.json");
const screenshotIndex = readJson("data/expungement-ai/flow-audit/screenshot-index.json");
const blockers = readJson("data/expungement-ai/flow-audit/environment-blockers.json");

const EXPECTED_JURISDICTIONS = 51;

check("FA-01", "51 jurisdictions accounted for in the flow manifest", () => {
  const count = manifest.totals.jurisdictions;
  return { passed: count === EXPECTED_JURISDICTIONS, detail: `${count} jurisdictions` };
});

check("FA-02", "every flow has a stable, unique flow ID", () => {
  const ids = manifest.flows.map((flow) => flow.flowId);
  const missing = manifest.flows.filter((flow) => !flow.flowId || !flow.flowKey).length;
  const duplicates = ids.length - new Set(ids).size;
  return {
    passed: missing === 0 && duplicates === 0,
    detail: `${ids.length} flows, ${duplicates} duplicate id(s), ${missing} without an id`
  };
});

check("FA-03", "every flow ID is derived from its flow key, so it is stable across regenerations", () => {
  const wrong = manifest.flows.filter((flow) => {
    const expectedId = `EXPAI-${flow.jurisdiction}-${nodeCrypto.createHash("sha256").update(flow.flowKey).digest("hex").slice(0, 10)}`;
    return flow.flowId !== expectedId;
  });
  return { passed: wrong.length === 0, detail: `${wrong.length} flow id(s) not derived from their key` };
});

check("FA-04", "every question node carries exactly one purpose classification from the fixed vocabulary", () => {
  const vocabulary = new Set(inventory.purposeVocabulary);
  const bad = inventory.questions.filter((question) => !vocabulary.has(question.purpose));
  return { passed: bad.length === 0, detail: `${inventory.questions.length} nodes, ${bad.length} outside the vocabulary` };
});

check("FA-05", "every branch edge has at least one synthetic fixture", () => {
  const withoutFixture = branchCoverage.branches.filter((branch) => !branch.fixture || !branch.fixture.answers);
  return {
    passed: withoutFixture.length === 0 && branchCoverage.totals.branchEdges > 0,
    detail: `${branchCoverage.totals.branchEdges} edges, ${withoutFixture.length} without a fixture`
  };
});

check("FA-06", "every branch edge's fixture is synthetic and pinned to the audit clock", () => {
  const bad = branchCoverage.branches.filter((branch) => branch.fixture?.synthetic !== true || branch.fixture?.evaluatorToday !== branchCoverage.evaluatorToday);
  return { passed: bad.length === 0, detail: `${bad.length} fixture(s) not synthetic or not pinned` };
});

check("FA-07", "the six shards are disjoint", () => {
  const assigned = shards.shards.flatMap((shard) => shard.stateList);
  const duplicates = assigned.length - new Set(assigned).size;
  return { passed: duplicates === 0, detail: `${assigned.length} assignments, ${duplicates} duplicate(s)` };
});

check("FA-08", "the shard union equals all 51 jurisdictions", () => {
  const assigned = new Set(shards.shards.flatMap((shard) => shard.stateList));
  const expected = new Set(manifest.jurisdictions.map((row) => row.jurisdiction));
  const missing = [...expected].filter((code) => !assigned.has(code));
  const extra = [...assigned].filter((code) => !expected.has(code));
  return {
    passed: missing.length === 0 && extra.length === 0 && assigned.size === EXPECTED_JURISDICTIONS,
    detail: `${assigned.size} assigned; missing ${missing.join(",") || "none"}; extra ${extra.join(",") || "none"}`
  };
});

check("FA-09", "every remedy for a jurisdiction stays inside one shard", () => {
  const shardOf = new Map();
  for (const shard of shards.shards) for (const code of shard.stateList) shardOf.set(code, shard.shardId);
  const strays = [];
  for (const shard of shards.shards) {
    const flows = manifest.flows.filter((flow) => shard.flowIds.includes(flow.flowId));
    for (const flow of flows) {
      if (shardOf.get(flow.jurisdiction) !== shard.shardId) strays.push(`${flow.flowId} -> ${shard.shardId}`);
    }
  }
  return { passed: strays.length === 0, detail: `${strays.length} stray flow assignment(s)` };
});

check("FA-10", "shard workload spread is within the 20% target", () => {
  const spread = shards.balance.spreadPercent;
  return { passed: spread <= shards.balance.targetSpreadPercent, detail: `${spread}% spread (target <= ${shards.balance.targetSpreadPercent}%)` };
});

check("FA-11", "six shard prompt files exist and contain no placeholder", () => {
  const files = Array.from({ length: 6 }, (_, index) => `docs/expungement-ai/flow-audit/shard-prompts/session-0${index + 1}.md`);
  const missing = files.filter((file) => !exists(file));
  const placeholders = files.filter((file) => exists(file) && /\bTBD\b|\bTODO\b|\bFIXME\b|\{\{|<[A-Z][A-Z0-9_]{2,}>|\bXXX\b/.test(read(file)));
  return {
    passed: missing.length === 0 && placeholders.length === 0,
    detail: `${files.length - missing.length}/6 present; ${placeholders.length} with a placeholder`
  };
});

check("FA-12", "one state report exists per jurisdiction", () => {
  const missing = manifest.jurisdictions.filter((row) => !exists(`docs/expungement-ai/flow-audit/state-reports/${row.jurisdiction}.md`));
  return { passed: missing.length === 0, detail: `${manifest.jurisdictions.length - missing.length}/${manifest.jurisdictions.length} present` };
});

check("FA-13", "the screenshot index references only files that exist, with matching hashes", () => {
  const problems = [];
  for (const shot of screenshotIndex.screenshots) {
    const absolute = path.join(ROOT_DIR, shot.file);
    if (!fs.existsSync(absolute)) { problems.push(`${shot.file} is absent`); continue; }
    const actual = nodeCrypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
    if (actual !== shot.sha256) problems.push(`${shot.file} hash mismatch`);
  }
  return {
    passed: problems.length === 0,
    detail: `${screenshotIndex.screenshots.length} indexed capture(s); ${problems.length} problem(s)${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`
  };
});

check("FA-14", "the screenshot index holds no duplicate image", () => {
  const hashes = screenshotIndex.screenshots.map((shot) => shot.sha256);
  const duplicates = hashes.length - new Set(hashes).size;
  return { passed: duplicates === 0, detail: `${hashes.length} capture(s), ${duplicates} duplicate(s)` };
});

check("FA-15", "every issue names a severity, a category, a reproduction, an owner and a legal-review decision", () => {
  const severities = new Set(["P0", "P1", "P2", "P3"]);
  const categories = new Set(register.categoryVocabulary);
  const bad = register.issues.filter((issue) =>
    !severities.has(issue.severity)
    || !categories.has(issue.category)
    || !Array.isArray(issue.reproduction) || issue.reproduction.length === 0
    || !issue.actual || !issue.expected
    || !Array.isArray(issue.evidence) || issue.evidence.length === 0
    || !issue.recommendedOwner
    || typeof issue.legalReviewRequired !== "boolean"
  );
  return { passed: bad.length === 0, detail: `${register.issues.length} issue(s), ${bad.length} incomplete` };
});

check("FA-16", "every issue's affected flow IDs exist in the manifest", () => {
  const known = new Set(manifest.flows.map((flow) => flow.flowId));
  const unknown = new Set();
  for (const issue of register.issues) for (const id of issue.affectedFlowIds) if (!known.has(id)) unknown.add(id);
  return { passed: unknown.size === 0, detail: `${unknown.size} unknown flow id(s) referenced` };
});

check("FA-17", "no product behaviour file changed", () => {
  const base = gitSha("origin/main");
  const changed = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { cwd: ROOT_DIR, encoding: "utf8" })
    .split("\n").map((line) => line.trim()).filter(Boolean);
  // -uall, not the default: without it Git collapses a new tree to its top
  // directory ("scripts/expungement-ai/"), and a directory name can never match a
  // file-path allowlist. The check would then fail on its own output format.
  const untracked = execFileSync("git", ["status", "--porcelain", "-uall"], { cwd: ROOT_DIR, encoding: "utf8" })
    .split("\n").map((line) => line.slice(3).trim()).filter(Boolean);
  const all = [...new Set([...changed, ...untracked])];
  const allowed = /^(data\/expungement-ai\/flow-audit\/|docs\/expungement-ai\/flow-audit\/|scripts\/expungement-ai\/flow-audit\/|tests\/e2e\/expungement-ai\/flow-audit\/)/;
  const violations = all.filter((file) => !allowed.test(file));
  return {
    passed: violations.length === 0,
    detail: `${all.length} changed path(s); ${violations.length} outside the audit's owned paths${violations.length ? `: ${violations.slice(0, 5).join(", ")}` : ""}`
  };
});

check("FA-18", "git diff --check is clean", () => {
  try {
    execFileSync("git", ["diff", "--check"], { cwd: ROOT_DIR, encoding: "utf8" });
    execFileSync("git", ["diff", "--cached", "--check"], { cwd: ROOT_DIR, encoding: "utf8" });
    return { passed: true, detail: "no whitespace errors" };
  } catch (error) {
    return { passed: false, detail: String(error?.stdout ?? error?.message ?? error).slice(0, 300) };
  }
});

check("FA-19", "the browser crawl completed, or an exact environment blocker is recorded", () => {
  const crawlPath = "data/expungement-ai/flow-audit/evidence/crawl-report.json";
  if (exists(crawlPath)) {
    const crawl = readJson(crawlPath);
    const recorded = blockers.blockers.length;
    return {
      passed: crawl.totals.flowsCrawled > 0,
      detail: `${crawl.totals.flowsCrawled} flow(s) crawled; ${recorded} environment blocker(s) recorded for the surfaces the crawl could not enter`
    };
  }
  return {
    passed: blockers.blockers.length > 0,
    detail: `no crawl report; ${blockers.blockers.length} environment blocker(s) recorded`
  };
});

check("FA-20", "the crawl completed no Stripe payment and used synthetic identities only", () => {
  const crawlPath = "data/expungement-ai/flow-audit/evidence/crawl-report.json";
  if (!exists(crawlPath)) return { passed: true, detail: "no crawl ran, so nothing was paid for" };
  const crawl = readJson(crawlPath);
  return {
    passed: crawl.stripePaymentCompleted === false && crawl.syntheticIdentitiesOnly === true,
    detail: `stripePaymentCompleted=${crawl.stripePaymentCompleted}, syntheticIdentitiesOnly=${crawl.syntheticIdentitiesOnly}`
  };
});

check("FA-21", "every generated artifact is byte-reproducible from this tree", () => {
  const generators = [
    "build-flow-manifest.mjs",
    "build-question-inventory.mjs",
    "build-branch-coverage.mjs",
    "build-ui-reachability.mjs",
    "detect-static-defects.mjs",
    "build-issue-register.mjs",
    "build-shard-assignment.mjs"
  ];
  const failures = [];
  for (const generator of generators) {
    try {
      execFileSync("node", [`scripts/expungement-ai/flow-audit/${generator}`, "--check"], { cwd: ROOT_DIR, encoding: "utf8", stdio: "pipe" });
    } catch (error) {
      failures.push(`${generator}: ${String(error?.stderr ?? error?.message ?? error).trim().split("\n")[0].slice(0, 160)}`);
    }
  }
  return { passed: failures.length === 0, detail: failures.length === 0 ? `${generators.length} generator(s) reproduce byte for byte` : failures.join("; ") };
});

check("FA-23", "every flow's recorded fixture reproduces its recorded terminal", () => {
  const bad = manifest.totals.flowsWhoseFixtureDoesNotReproduceTheirTerminal ?? [];
  const good = manifest.totals.flowsWhoseFixtureReproducesTheirTerminal ?? 0;
  return {
    passed: bad.length === 0,
    detail: `${good} reproduce; ${bad.length} do not${bad.length ? `: ${bad.slice(0, 3).map((row) => `${row.flowId} recorded ${row.recorded} replayed ${row.replay}`).join("; ")}` : ""}`
  };
});

check("FA-24", "the crawl's remaining disagreements with the manifest are classified, not left unexplained", () => {
  const divergencePath = "data/expungement-ai/flow-audit/crawl-divergence.json";
  if (!exists(divergencePath)) return { passed: true, detail: "no crawl divergence file; no crawl ran" };
  const divergence = readJson(divergencePath);
  const unclassified = divergence.divergences.filter((row) => !divergence.classifications[row.classification]);
  return {
    passed: unclassified.length === 0,
    detail: `${divergence.totals.divergentRecords} divergent record(s): ${JSON.stringify(divergence.totals.classificationCounts)}`
  };
});

check("FA-22", "the manifest names both competing flow authorities and identifies the runtime one", () => {
  const authorities = manifest.authorities ?? {};
  const namesBoth = typeof authorities.runtimeConsumerQuestionAuthority === "string"
    && typeof authorities.bundledProfileRole === "string"
    && authorities.bundledProfileRole.includes("frontend/profiles/all51.json");
  return { passed: namesBoth, detail: namesBoth ? "both recorded" : "the manifest does not record both authorities" };
});

/* ------------------------------------------------------------------ */

const failed = results.filter((result) => !result.passed);
const width = Math.max(...results.map((result) => result.id.length));
for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.id.padEnd(width)}  ${result.description}`);
  console.log(`      ${result.detail}`);
}
console.log("");
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.error(`${failed.length} check(s) failed: ${failed.map((result) => result.id).join(", ")}`);
  process.exit(1);
}
