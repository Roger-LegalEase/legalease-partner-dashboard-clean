#!/usr/bin/env node
// Six disjoint, workload-balanced Phase 3 state shards.
//
//   node scripts/expungement-ai/flow-audit/build-shard-assignment.mjs
//   node scripts/expungement-ai/flow-audit/build-shard-assignment.mjs --check
//
// Rules, all enforced and all asserted at the end of this file:
//   * every remedy for a jurisdiction stays in one shard;
//   * no jurisdiction appears twice;
//   * the six shards cover exactly the 50 states plus DC;
//   * balance is by measured workload, not by state count;
//   * ties break on the jurisdiction code, so the assignment is reproducible.
//
// The packing is longest-processing-time-first: jurisdictions sorted by weight
// descending (code ascending on a tie) are placed into the currently-lightest
// shard (lowest shard index on a tie). LPT is deterministic and gives a tight
// spread on this distribution; the achieved spread is measured and reported
// rather than assumed.

import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR, read, gitSha, writeArtifact, stableJson, readJson } from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/shard-assignment.json";
const SHARD_COUNT = 6;

const manifest = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const inventory = readJson("data/expungement-ai/flow-audit/question-inventory.json");
const branchCoverage = readJson("data/expungement-ai/flow-audit/branch-coverage.json");
const reachability = readJson("data/expungement-ai/flow-audit/ui-reachability.json");
const staticFindings = readJson("data/expungement-ai/flow-audit/static-findings.json");

/* ------------------------------------------------------------------ */
/* Per-jurisdiction workload                                           */
/* ------------------------------------------------------------------ */

/**
 * Weights. Chosen so the dimensions that actually cost a shard session time —
 * flows to walk, questions to read, branches to exercise, unresolved legal
 * questions to write up — dominate, and so a state with many cheap flows does
 * not outrank a state with one expensive unresolved legal question.
 */
const WEIGHTS = {
  flow: 3,
  question: 1,
  branchEdge: 1,
  customCountyOrCourtField: 8,
  multilingualQuestion: 0.5,
  customFormBinding: 4,
  unresolvedLegalReviewItem: 25,
  unreachablePacketReadyJurisdiction: 40
};

const legalReviewByJurisdiction = new Map();
for (const finding of staticFindings.findings) {
  if (!finding.legalReviewRequired) continue;
  const named = new Set([
    ...(finding.jurisdictionsAffected ?? []),
    ...((finding.exclusionStillPacketReady ?? []).map((r) => r.jurisdiction)),
    ...((finding.timingStillPacketReady ?? []).map((r) => r.jurisdiction))
  ]);
  for (const code of named) {
    if (!legalReviewByJurisdiction.has(code)) legalReviewByJurisdiction.set(code, []);
    legalReviewByJurisdiction.get(code).push(finding.findingId);
  }
}

const rows = manifest.jurisdictions.map((jurisdiction) => {
  const code = jurisdiction.jurisdiction;
  const questions = inventory.questions.filter((q) => q.jurisdiction === code);
  const branches = branchCoverage.perJurisdiction.find((b) => b.jurisdiction === code);
  const reach = reachability.jurisdictions.find((r) => r.jurisdiction === code);
  const flows = manifest.flows.filter((f) => f.jurisdiction === code);

  const countyCourtFields = questions.filter((q) => ["county", "court", "county_or_filing_location"].includes(q.questionId)).length;
  const multilingual = questions.filter((q) => q.hasSpanishPrompt).length;
  const customFormBindings = new Set(
    flows.flatMap((f) => f.forms?.officialFormIdsNamed ?? [])
  ).size;
  const legalReviewItems = (legalReviewByJurisdiction.get(code) ?? []).length
    + (reach && !reach.packetReadyReachableFromRenderedScreensOnly ? 1 : 0);

  const weight =
    flows.length * WEIGHTS.flow
    + questions.length * WEIGHTS.question
    + (branches?.branchEdges ?? 0) * WEIGHTS.branchEdge
    + countyCourtFields * WEIGHTS.customCountyOrCourtField
    + multilingual * WEIGHTS.multilingualQuestion
    + customFormBindings * WEIGHTS.customFormBinding
    + (legalReviewByJurisdiction.get(code) ?? []).length * WEIGHTS.unresolvedLegalReviewItem
    + (reach && !reach.packetReadyReachableFromRenderedScreensOnly ? WEIGHTS.unreachablePacketReadyJurisdiction : 0);

  return {
    jurisdiction: code,
    name: jurisdiction.name,
    slug: jurisdiction.slug,
    flowCount: flows.length,
    flowIds: flows.map((f) => f.flowId).sort(),
    questionCount: questions.length,
    consumerScreenCount: questions.filter((q) => q.reachability === "rendered_as_consumer_screen").length,
    branchEdgeCount: branches?.branchEdges ?? 0,
    countyOrCourtFieldCount: countyCourtFields,
    multilingualQuestionCount: multilingual,
    customFormBindingCount: customFormBindings,
    unresolvedLegalReviewItems: legalReviewItems,
    legalReviewFindingIds: (legalReviewByJurisdiction.get(code) ?? []).sort(),
    packetReadyReachableFromRenderedScreensOnly: reach?.packetReadyReachableFromRenderedScreensOnly ?? null,
    paymentReachableFromRenderedScreensOnly: reach?.paymentReachableFromRenderedScreensOnly ?? null,
    weight: Number(weight.toFixed(2))
  };
});

/* ------------------------------------------------------------------ */
/* Longest-processing-time-first packing                               */
/* ------------------------------------------------------------------ */

const ordered = rows.slice().sort((a, b) => b.weight - a.weight || a.jurisdiction.localeCompare(b.jurisdiction));
const shards = Array.from({ length: SHARD_COUNT }, (_, index) => ({
  shardId: `SHARD-${index + 1}`,
  sessionFile: `docs/expungement-ai/flow-audit/shard-prompts/session-0${index + 1}.md`,
  jurisdictions: [],
  weight: 0
}));

for (const row of ordered) {
  let target = shards[0];
  for (const shard of shards) {
    if (shard.weight < target.weight) target = shard;
  }
  target.jurisdictions.push(row);
  target.weight = Number((target.weight + row.weight).toFixed(2));
}

for (const shard of shards) {
  shard.jurisdictions.sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction));
}

const weights = shards.map((s) => s.weight);
const lightest = Math.min(...weights);
const heaviest = Math.max(...weights);
const spreadPercent = Number((((heaviest - lightest) / lightest) * 100).toFixed(2));

/* ------------------------------------------------------------------ */
/* Shard contracts                                                     */
/* ------------------------------------------------------------------ */

const PROHIBITED_SHARED_PATHS = [
  "src/components/expungement-ai/**",
  "src/components/ui/**",
  "src/lib/expungement-ai/packet-information.ts",
  "src/lib/expungement-ai/briefcase.ts",
  "src/lib/expungement-ai/payment-adapter.ts",
  "src/lib/expungement-ai/consumer-payment-authority.ts",
  "src/lib/expungement-ai/frontend/**",
  "src/lib/rcap-engine/evaluator.ts",
  "src/lib/rcap-engine/public-profile-projection.ts",
  "src/lib/rcap-engine/packet-planner.ts",
  "src/lib/rcap-engine/composed-route-selector.ts",
  "src/app/api/expungement-ai/checkout/**",
  "src/app/api/expungement-ai/payment/**",
  "src/app/briefcase/**",
  "src/lib/analytics/**",
  "src/lib/auth/**",
  "src/lib/stripe/**",
  "supabase/migrations/**",
  "data/rcap-all50/**",
  "data/rcap-ledger/**"
];

const allowedConfigurationPathsFor = (codes, shardId) => [
  ...codes.map((code) => {
    const row = rows.find((r) => r.jurisdiction === code);
    return `src/lib/rcap-engine/compiled/profiles/${code}-${row.slug}.json`;
  }),
  ...codes.map((code) => {
    const row = rows.find((r) => r.jurisdiction === code);
    return `src/lib/rcap/state-packs/${statePackDirectory(row.slug)}/**`;
  }),
  ...codes.map((code) => `docs/expungement-ai/flow-audit/state-reports/${code}.md`),
  `data/expungement-ai/flow-audit/shard-results/${shardId}.json`
];

/**
 * The state-pack directory name, which is the jurisdiction slug except where the
 * repository shortened it. Verified against the directory listing rather than
 * assumed; an unmatched slug is reported as a problem instead of emitted as a
 * path a shard session would then fail to find.
 */
const statePackDirectories = new Set(
  fs.readdirSync(path.join(ROOT_DIR, "src/lib/rcap/state-packs"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
);
function statePackDirectory(slug) {
  if (statePackDirectories.has(slug)) return slug;
  if (slug === "district-of-columbia" && statePackDirectories.has("dc")) return "dc";
  unmatchedStatePackSlugs.push(slug);
  return slug;
}
const unmatchedStatePackSlugs = [];

const acceptanceTestsFor = (codes) => [
  `node scripts/expungement-ai/flow-audit/build-flow-manifest.mjs --check`,
  `node scripts/expungement-ai/flow-audit/build-question-inventory.mjs --check`,
  `node scripts/expungement-ai/flow-audit/build-branch-coverage.mjs --check`,
  `node scripts/expungement-ai/flow-audit/build-ui-reachability.mjs --check`,
  `node scripts/expungement-ai/flow-audit/verify-flow-audit.mjs`,
  `node scripts/verify-rcap-evaluator-all51-provability.mjs`,
  `node scripts/verify-rcap-reachability-evidence.mjs`,
  `node scripts/verify-public-profile-projection.mjs`,
  `node scripts/verify-expungement-dtc-flow-unchanged.mjs`,
  ...codes.map((code) => `EXPAI_FLOW_AUDIT_JURISDICTIONS=${code} node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs`)
];

const baseSha = gitSha("origin/main");

const shardRecords = shards.map((shard, index) => {
  const codes = shard.jurisdictions.map((j) => j.jurisdiction);
  return {
    shardId: shard.shardId,
    sessionNumber: index + 1,
    sessionFile: shard.sessionFile,
    baseSha,
    stateList: codes,
    stateNames: shard.jurisdictions.map((j) => `${j.jurisdiction} ${j.name}`),
    jurisdictionCount: codes.length,
    flowIds: shard.jurisdictions.flatMap((j) => j.flowIds).sort(),
    expectedFlowCount: shard.jurisdictions.reduce((sum, j) => sum + j.flowCount, 0),
    expectedQuestionCount: shard.jurisdictions.reduce((sum, j) => sum + j.questionCount, 0),
    expectedConsumerScreenCount: shard.jurisdictions.reduce((sum, j) => sum + j.consumerScreenCount, 0),
    expectedBranchEdgeCount: shard.jurisdictions.reduce((sum, j) => sum + j.branchEdgeCount, 0),
    unresolvedLegalReviewItems: shard.jurisdictions.reduce((sum, j) => sum + j.unresolvedLegalReviewItems, 0),
    jurisdictionsWithNoUiReachablePacketReady: shard.jurisdictions.filter((j) => j.packetReadyReachableFromRenderedScreensOnly === false).map((j) => j.jurisdiction),
    weight: shard.weight,
    weightSharePercent: Number(((shard.weight / weights.reduce((a, b) => a + b, 0)) * 100).toFixed(2)),
    allowedConfigurationPaths: allowedConfigurationPathsFor(codes, shard.shardId),
    prohibitedSharedPaths: PROHIBITED_SHARED_PATHS,
    acceptanceTests: acceptanceTestsFor(codes),
    jurisdictions: shard.jurisdictions
  };
});

/* ------------------------------------------------------------------ */
/* Assertions                                                          */
/* ------------------------------------------------------------------ */

const assigned = shardRecords.flatMap((s) => s.stateList);
const unique = new Set(assigned);
const expected = new Set(manifest.jurisdictions.map((j) => j.jurisdiction));
const problems = [];
for (const slug of [...new Set(unmatchedStatePackSlugs)]) problems.push(`no state-pack directory matches the slug ${slug}`);
if (assigned.length !== unique.size) problems.push("a jurisdiction appears in more than one shard");
if (unique.size !== expected.size) problems.push(`shard union has ${unique.size} jurisdictions, expected ${expected.size}`);
for (const code of expected) if (!unique.has(code)) problems.push(`missing jurisdiction ${code}`);
for (const code of unique) if (!expected.has(code)) problems.push(`unexpected jurisdiction ${code}`);
for (const shard of shardRecords) {
  const flowJurisdictions = new Set(
    manifest.flows.filter((f) => shard.flowIds.includes(f.flowId)).map((f) => f.jurisdiction)
  );
  for (const code of flowJurisdictions) {
    if (!shard.stateList.includes(code)) problems.push(`${shard.shardId} holds a flow for unassigned ${code}`);
  }
}

const packet = {
  schemaVersion: "expai-shard-assignment/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-shard-assignment.mjs",
  baseSha,
  changesNoProductBehavior: true,
  shardCount: SHARD_COUNT,
  packing: "longest-processing-time-first; jurisdictions sorted by weight descending with the jurisdiction code as the tie-break, each placed into the currently lightest shard with the lowest shard index as the tie-break",
  weights: WEIGHTS,
  balance: {
    lightestShardWeight: lightest,
    heaviestShardWeight: heaviest,
    spreadPercent,
    targetSpreadPercent: 20,
    targetMet: spreadPercent <= 20
  },
  invariants: {
    everyRemedyForAJurisdictionInOneShard: true,
    noJurisdictionAppearsTwice: assigned.length === unique.size,
    unionEqualsAllJurisdictions: unique.size === expected.size && [...expected].every((c) => unique.has(c)),
    problems
  },
  totals: {
    jurisdictions: assigned.length,
    flows: shardRecords.reduce((sum, s) => sum + s.expectedFlowCount, 0),
    questionNodes: shardRecords.reduce((sum, s) => sum + s.expectedQuestionCount, 0),
    branchEdges: shardRecords.reduce((sum, s) => sum + s.expectedBranchEdgeCount, 0)
  },
  shards: shardRecords
};

if (problems.length > 0) {
  console.error("shard assignment invariants failed:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const text = stableJson(packet);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`shard assignment current and deterministic: ${SHARD_COUNT} shards, ${assigned.length} jurisdictions.`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
for (const shard of shardRecords) {
  console.log(`  ${shard.shardId}: ${shard.jurisdictionCount} jurisdictions, weight ${shard.weight}, flows ${shard.expectedFlowCount}, questions ${shard.expectedQuestionCount} -> ${shard.stateList.join(",")}`);
}
console.log(`  spread ${spreadPercent}% (target <= 20%)`);
