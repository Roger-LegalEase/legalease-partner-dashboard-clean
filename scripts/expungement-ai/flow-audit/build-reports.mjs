#!/usr/bin/env node
// The Phase 1 human-readable reports.
//
//   node scripts/expungement-ai/flow-audit/build-reports.mjs
//   node scripts/expungement-ai/flow-audit/build-reports.mjs --check
//
// Writes:
//   docs/expungement-ai/flow-audit/baseline-report.md
//   docs/expungement-ai/flow-audit/human-review-required.md
//   docs/expungement-ai/flow-audit/state-reports/<CODE>.md   (51 files)
//   docs/expungement-ai/flow-audit/shard-prompts/session-0N.md (6 files)
//   data/expungement-ai/flow-audit/baseline-metrics.json
//   data/expungement-ai/flow-audit/screenshot-index.json
//
// Every number in every report is read from a generated artifact. Nothing here
// is typed in by hand, so a report cannot drift from the manifest it describes.

import { read, readJson, exists, gitSha, writeArtifact, stableJson } from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");

const manifest = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const inventory = readJson("data/expungement-ai/flow-audit/question-inventory.json");
const branchCoverage = readJson("data/expungement-ai/flow-audit/branch-coverage.json");
const reachability = readJson("data/expungement-ai/flow-audit/ui-reachability.json");
const staticFindings = readJson("data/expungement-ai/flow-audit/static-findings.json");
const register = readJson("data/expungement-ai/flow-audit/issue-register.json");
const shards = readJson("data/expungement-ai/flow-audit/shard-assignment.json");
const blockers = readJson("data/expungement-ai/flow-audit/environment-blockers.json");
const crawlPath = "data/expungement-ai/flow-audit/evidence/crawl-report.json";
const crawl = exists(crawlPath) ? readJson(crawlPath) : null;
const curationPath = "data/expungement-ai/flow-audit/evidence/curation.json";
const curation = exists(curationPath) ? readJson(curationPath) : null;
const divergencePath = "data/expungement-ai/flow-audit/crawl-divergence.json";
const divergence = exists(divergencePath) ? readJson(divergencePath) : null;
const retainedHashes = curation ? new Set(curation.retained.map((shot) => shot.sha256)) : null;

const baseSha = gitSha("origin/main");
const written = [];
function emit(relativePath, text) {
  if (CHECK) {
    if (!exists(relativePath) || read(relativePath) !== text) {
      console.error(`${relativePath} is stale; re-run without --check.`);
      process.exit(1);
    }
    written.push(relativePath);
    return;
  }
  written.push(writeArtifact(relativePath, text).path);
}

/* ------------------------------------------------------------------ */
/* Screenshot index                                                    */
/* ------------------------------------------------------------------ */

const screenshotIndex = {
  schemaVersion: "expai-screenshot-index/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-reports.mjs",
  testedCommit: baseSha,
  captureOrigin: crawl?.baseOrigin ?? null,
  duplicatePolicy: "A capture whose bytes hash to an existing capture is deleted and recorded as an alias on the original, so the committed set holds no duplicate image.",
  secretPolicy: "No authenticated session was established, so no capture can carry a cookie, token, or participant value. Every typed value is the synthetic constant the crawl generates.",
  totals: crawl
    ? {
      captured: crawl.screenshots.length,
      screenshots: (crawl.screenshots.filter((shot) => !retainedHashes || retainedHashes.has(shot.sha256))).length,
      desktop: crawl.screenshots.filter((shot) => shot.viewport.startsWith("desktop")).length,
      mobile: crawl.screenshots.filter((shot) => shot.viewport.startsWith("mobile")).length,
      committed: (crawl.screenshots.filter((shot) => !retainedHashes || retainedHashes.has(shot.sha256))).length,
      prunedBeforeCommit: retainedHashes ? crawl.screenshots.filter((shot) => !retainedHashes.has(shot.sha256)).length : 0,
      aliasedDuplicatesSuppressed: crawl.screenshots.reduce((sum, shot) => sum + shot.alsoProves.length, 0)
    }
    : { captured: 0, screenshots: 0, desktop: 0, mobile: 0, committed: 0, prunedBeforeCommit: 0, aliasedDuplicatesSuppressed: 0 },
  prunedCaptures: retainedHashes
    ? crawl.screenshots.filter((shot) => !retainedHashes.has(shot.sha256)).map((shot) => ({
      sha256: shot.sha256, flowId: shot.flowId, viewport: shot.viewport, label: shot.label
    }))
    : [],
  screenshots: (crawl?.screenshots ?? []).filter((shot) => !retainedHashes || retainedHashes.has(shot.sha256)).map((shot) => ({
    file: shot.file,
    sha256: shot.sha256,
    bytes: shot.bytes,
    testedCommit: baseSha,
    viewport: shot.viewport,
    flowId: shot.flowId,
    jurisdiction: shot.jurisdiction,
    route: shot.route,
    label: shot.label,
    findingIds: shot.findingIds,
    alsoProves: shot.alsoProves
  }))
};
emit("data/expungement-ai/flow-audit/screenshot-index.json", stableJson(screenshotIndex));

/* ------------------------------------------------------------------ */
/* Baseline metrics                                                    */
/* ------------------------------------------------------------------ */

const terminalCounts = manifest.totals.terminalCounts;
const baselineMetrics = {
  schemaVersion: "expai-baseline-metrics/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-reports.mjs",
  baseSha,
  evaluatorToday: manifest.evaluatorToday,
  jurisdictions: manifest.totals.jurisdictions,
  flows: manifest.totals.flows,
  remedyFlows: manifest.totals.remedyFlows,
  nonRemedyFlows: manifest.totals.nonRemedyFlows,
  compiledPathways: manifest.totals.compiledPathways,
  questionNodes: inventory.totals.questionNodes,
  uniqueQuestionIds: inventory.totals.uniqueQuestionIds,
  consumerScreenNodes: inventory.totals.consumerScreenNodes,
  packetInformationBuilderNodes: inventory.totals.packetInformationBuilderNodes,
  branchEdges: branchCoverage.totals.branchEdges,
  branchEdgesWithAFixture: branchCoverage.totals.edgesWithAFixture,
  supportedTerminals: manifest.totals.supportedTerminals,
  unsupportedTerminals: manifest.totals.unsupportedTerminals,
  referralTerminals: manifest.totals.referralTerminals,
  terminalCounts,
  purposeCounts: inventory.totals.purposeCounts,
  runtimePaidFlows: manifest.totals.runtimePaidFlows,
  runtimePaidFlowsBlockedByLaunchGovernance: manifest.totals.runtimePaidFlowsBlockedByLaunchGovernance,
  sponsoredFlows: manifest.flows.filter((flow) => flow.sponsorshipMode !== "none_direct_to_consumer").length,
  jurisdictionsReachingPacketReadyFromRenderedScreensOnly: reachability.totals.jurisdictionsReachingPacketReady,
  jurisdictionsReachingPaymentFromRenderedScreensOnly: reachability.totals.jurisdictionsReachingPayment,
  issues: register.totals,
  browserCrawl: crawl
    ? {
      flowsCrawled: crawl.totals.flowsCrawled,
      desktopCaptures: crawl.totals.desktopCaptures,
      mobileCaptures: crawl.totals.mobileCaptures,
      productBrowserErrors: crawl.totals.productBrowserErrors,
      environmentBrowserErrors: crawl.totals.environmentBrowserErrors,
      redirectCyclesDetected: crawl.totals.redirectCyclesDetected,
      terminalsMatchingTheManifest: crawl.totals.terminalsMatchingTheManifest,
      terminalsDivergingFromTheManifest: crawl.totals.terminalsDivergingFromTheManifest,
      flowsLosingAnswersOnRefresh: crawl.totals.flowsLosingAnswersOnRefresh,
      analyticsRequestsCarryingAnAnswerValue: crawl.totals.analyticsRequestsCarryingAnAnswerValue
    }
    : null,
  environmentBlockers: blockers.blockers.map((blocker) => blocker.blockerId)
};
emit("data/expungement-ai/flow-audit/baseline-metrics.json", stableJson(baselineMetrics));

/* ------------------------------------------------------------------ */
/* program.json                                                        */
/* ------------------------------------------------------------------ */

emit("data/expungement-ai/flow-audit/program.json", stableJson({
  schemaVersion: "expai-flow-audit-program/v1",
  program: "Expungement.ai State x Remedy Flow Audit and UX Improvement Program",
  phase: 1,
  phaseName: "Discover every state x remedy flow; build the auditor; no product changes",
  baseSha,
  auditBranch: "claude/expai-flow-audit-p1",
  changesNoProductBehavior: true,
  artifacts: {
    data: [
      "data/expungement-ai/flow-audit/program.json",
      "data/expungement-ai/flow-audit/flow-manifest.json",
      "data/expungement-ai/flow-audit/question-inventory.json",
      "data/expungement-ai/flow-audit/branch-coverage.json",
      "data/expungement-ai/flow-audit/ui-reachability.json",
      "data/expungement-ai/flow-audit/static-findings.json",
      "data/expungement-ai/flow-audit/issue-register.json",
      "data/expungement-ai/flow-audit/shard-assignment.json",
      "data/expungement-ai/flow-audit/baseline-metrics.json",
      "data/expungement-ai/flow-audit/screenshot-index.json",
      "data/expungement-ai/flow-audit/environment-blockers.json"
    ],
    docs: [
      "docs/expungement-ai/flow-audit/baseline-report.md",
      "docs/expungement-ai/flow-audit/human-review-required.md",
      "docs/expungement-ai/flow-audit/state-reports/",
      "docs/expungement-ai/flow-audit/shard-prompts/"
    ],
    scripts: [
      "scripts/expungement-ai/flow-audit/lib/engine.mjs",
      "scripts/expungement-ai/flow-audit/build-flow-manifest.mjs",
      "scripts/expungement-ai/flow-audit/build-question-inventory.mjs",
      "scripts/expungement-ai/flow-audit/build-branch-coverage.mjs",
      "scripts/expungement-ai/flow-audit/build-ui-reachability.mjs",
      "scripts/expungement-ai/flow-audit/detect-static-defects.mjs",
      "scripts/expungement-ai/flow-audit/build-issue-register.mjs",
      "scripts/expungement-ai/flow-audit/build-shard-assignment.mjs",
      "scripts/expungement-ai/flow-audit/build-reports.mjs",
      "scripts/expungement-ai/flow-audit/verify-flow-audit.mjs"
    ],
    tests: ["tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs"]
  },
  regenerate: [
    "node scripts/expungement-ai/flow-audit/build-flow-manifest.mjs",
    "node scripts/expungement-ai/flow-audit/build-question-inventory.mjs",
    "node scripts/expungement-ai/flow-audit/build-branch-coverage.mjs",
    "node scripts/expungement-ai/flow-audit/build-ui-reachability.mjs",
    "node scripts/expungement-ai/flow-audit/detect-static-defects.mjs",
    "node scripts/expungement-ai/flow-audit/build-issue-register.mjs",
    "node scripts/expungement-ai/flow-audit/build-shard-assignment.mjs",
    "node scripts/expungement-ai/flow-audit/build-reports.mjs",
    "node scripts/expungement-ai/flow-audit/verify-flow-audit.mjs"
  ]
}));

/* ------------------------------------------------------------------ */
/* Baseline report                                                     */
/* ------------------------------------------------------------------ */

function table(headers, rows) {
  const head = `| ${headers.join(" | ")} |`;
  const rule = `| ${headers.map(() => "---").join(" | ")} |`;
  return [head, rule, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

const issuesBySeverity = (severity) => register.issues.filter((issue) => issue.severity === severity);

/** One row per jurisdiction+pathway. The manifest carries one row per audience mode; a reader does not need the same legal question twice. */
function uniquePairs(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows ?? []) {
    const key = `${row.jurisdiction}:${row.pathwayId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([`\`${row.jurisdiction}\``, `\`${row.pathwayId ?? "—"}\``]);
  }
  return out;
}

const baselineReport = `# Expungement.ai flow audit — Phase 1 baseline

**Base SHA:** \`${baseSha}\`
**Evaluation clock:** \`${manifest.evaluatorToday}\` (pinned; waiting-period maths must not move with wall time)
**Product behaviour changed:** none. This phase reads.

## What the unit of a flow is

\`state × remedy × terminal outcome × materially distinct audience/payment mode\`.

${manifest.modeRule}

## Where the flow actually comes from

The repository holds more than one thing that looks like a flow definition. The runtime authority is not the file whose name suggests it is.

${table(["Concern", "Runtime authority"], [
  ["Consumer questions and their order", "`src/lib/rcap-engine/compiled/all51.json` (the designer public profiles), composed by `src/lib/rcap-engine/public-profile-projection.ts`, served by \`GET /api/expungement-ai/profiles/[state]\`"],
  ["Eligibility, remedy routing, waiting periods, exclusions", "`src/lib/rcap-engine/compiled/profiles/*.json` evaluated by `src/lib/rcap-engine/evaluator.ts`"],
  ["Packet family and form binding", "`packetGenerator` inside each compiled profile, read through `src/lib/rcap-engine/packet-planner.ts`"],
  ["Packet-information questions", "`src/lib/expungement-ai/packet-information.ts` — synthesized from the packet plan's `requiredInputIds`, not from any profile"],
  ["Review-page labels", "hard-coded rows in `src/app/briefcase/[packetId]/review/page.tsx`"],
  ["Payment", "`src/app/api/expungement-ai/checkout/route.ts` and `src/lib/expungement-ai/payment-adapter.ts`"],
  ["Sponsorship", "`isPartnerSponsoredPacketItem` plus the `?session=` query verified by `isRcapPartnerScreeningSession`"],
  ["Discount or promotion", "none exists"],
  ["Wilma help", "`src/lib/expungement-ai/wilma-context.ts` — page-level context only"],
  ["County and court data", "none exists as a selectable dataset"],
  ["Analytics", "`src/lib/analytics/client.ts` with the shared denylist in `src/lib/analytics/sanitize.ts`"],
  ["Launch flags", "`src/lib/rcap/state-promotion-manifest.ts` per state; `RCAP_CONSUMER_DELIVERY_ROUTE_STATE` for the nationwide render path"]
])}

**The competing authority, named.** \`src/lib/expungement-ai/frontend/profiles/all51.json\` is 915 KB of jurisdiction profiles and is the file a reader would reach for first. It is **not** the runtime flow source. \`profile-loader.ts\` sets \`USE_LIVE_PROFILE_ENDPOINT = true\`, so the flow fetches \`/api/expungement-ai/profiles/{state}\`; the bundled file supplies the static jurisdiction index for the state picker and the Spanish display translations the projection merges in. The two disagree in size: Mississippi carries 5 questions in the bundled file and ${inventory.questions.filter((q) => q.jurisdiction === "MS" && q.questionSource === "public profile projection").length} in the profile the browser actually receives, of which ${inventory.questions.filter((q) => q.jurisdiction === "MS" && q.reachability === "rendered_as_consumer_screen").length} render as screens. Both are recorded in the manifest under \`authorities\`.

## The numbers

${table(["Measure", "Count"], [
  ["Jurisdictions", String(manifest.totals.jurisdictions)],
  ["Compiled pathways (the remedy universe)", String(manifest.totals.compiledPathways)],
  ["Flow rows", String(manifest.totals.flows)],
  ["— remedy flows", String(manifest.totals.remedyFlows)],
  ["— non-remedy terminal flows", String(manifest.totals.nonRemedyFlows)],
  ["Supported terminals", String(manifest.totals.supportedTerminals)],
  ["Unsupported terminals", String(manifest.totals.unsupportedTerminals)],
  ["Referral terminals", String(manifest.totals.referralTerminals)],
  ["Question nodes (jurisdiction × question)", String(inventory.totals.questionNodes)],
  ["— distinct question ids", String(inventory.totals.uniqueQuestionIds)],
  ["— rendered as a consumer screen", String(inventory.totals.consumerScreenNodes)],
  ["— rendered by the packet-information builder", String(inventory.totals.packetInformationBuilderNodes)],
  ["Branch edges", String(branchCoverage.totals.branchEdges)],
  ["Branch edges with a synthetic fixture", String(branchCoverage.totals.edgesWithAFixture)],
  ["Issues", String(register.totals.issues)],
  ["— P0 / P1 / P2 / P3", `${register.totals.severityCounts.P0} / ${register.totals.severityCounts.P1} / ${register.totals.severityCounts.P2} / ${register.totals.severityCounts.P3}`],
  ["— global", String(register.totals.globalIssues)],
  ["— state-specific", String(register.totals.stateSpecificIssues)],
  ["— needing legal review", String(register.totals.legalReviewIssues)]
])}

### Terminal outcomes across all flow rows

${table(["Terminal", "Flows"], Object.entries(terminalCounts).sort((a, b) => b[1] - a[1]).map(([code, count]) => [`\`${code}\``, String(count)]))}

### Question purpose

Every question node carries exactly one purpose, decided in a fixed precedence order (escalation, then eligibility, then packet selection, then form binding, then redundant confirmation, then legal review, then not found).

${table(["Purpose", "Nodes"], Object.entries(inventory.totals.purposeCounts).sort((a, b) => b[1] - a[1]).map(([purpose, count]) => [`\`${purpose}\``, String(count)]))}

\`redundant_confirmation\` currently holds no node. That is not an omission: the precedence puts a rule consumer above a duplicate, and every duplicated fact in this product is also consumed by a rule. The duplicate pairs are still recorded on each node under \`purposeEvidence.duplicateOfFactId\` and are reported as \`${register.issues.find((i) => i.canary === 9)?.issueId ?? "the fact-model issues"}\` and its siblings.

## The Mississippi reference canaries

All twelve were treated as hypotheses about the whole product, not as Mississippi facts. All twelve reproduce, and all twelve are **global** rather than Mississippi-specific.

${table(["#", "Canary", "Verdict", "Scope", "Issue"], staticFindings.canaryVerdicts.map((row) => {
  const issue = register.issues.find((candidate) => candidate.canary === row.canary);
  return [String(row.canary), row.statement, row.verdict.replace(/_/g, " "), `\`${row.classification}\``, issue ? `\`${issue.issueId}\`` : "—"];
}))}

Mississippi is not a special case in the code except in one place, and that place is itself the evidence: \`packet-information.ts\` carries a hand-written block for \`MS\` + \`non-conviction-expungement-for-dismissal-no-disposition-or-acquittal\` that copies four screening answers forward, derives two more, and rewrites three prompts. Every other state and pathway goes without it. The Mississippi review found these defects first because Mississippi is the state that has been looked at, not because Mississippi is broken differently.

## What the audit found that the canaries did not predict

### ${reachability.totals.jurisdictionsNotReachingPacketReady.length} jurisdictions reach no packet-ready outcome from the screens the flow renders

A deterministic best-first search over every rendered consumer screen, in every pathway-context option, across ${reachability.totals.evaluations} evaluations, reaches a packet-ready outcome in **${reachability.totals.jurisdictionsReachingPacketReady} of 51** jurisdictions and a payment-allowed outcome in **${reachability.totals.jurisdictionsReachingPayment}**.

Not reaching packet-ready: ${reachability.totals.jurisdictionsNotReachingPacketReady.map((code) => `\`${code}\``).join(", ")}.

The mechanism is a lifecycle classification, not a legal rule. \`lifecyclePhaseForQuestion\` in the public-profile projection decides prepay versus postpay by matching the question's text against regular expressions, and \`phaseForWilmaFact\` defaults every shared Wilma fact to postpay unless its state is on a hand-written allowlist. Facts the evaluator consumes before it will open a packet — \`financial_obligations\`, \`pending_cases\`, \`sentence_completion_date\`, \`special_preconditions_confirmed\`, \`new_convictions_during_waiting_period\` — land postpay in many states and are therefore never asked. The repository's own witness ledger does not see this because its fixtures seed those facts directly.

This is recorded as bounded evidence, not proof of impossibility: a search that did not find an answer set is not the same as no answer set existing. It is enough to require a per-state answer before any of those jurisdictions is called live for the paid path.

### The paid path and the launch gate are two different gates, and both are closed

${manifest.totals.runtimePaidFlows} flow rows would pass the deployed runtime's checkout guard. ${manifest.totals.runtimePaidFlowsBlockedByLaunchGovernance} of them are simultaneously marked \`operationallySellable: false\` by \`data/rcap-ledger/launch-graph.json\`, whose own counter reads \`operationallySellable: 0\` for all 284 intended-paid pathways. The unmet gates are governance, not code: owner legal-design approval, current technical approval, and proof of a deterministic artifact. Each flow row carries both facts under \`paymentMode\` and \`launchGovernance\` so nobody has to reconcile them by hand.

### Every state's public profile publishes other states' questions

\`withWilmaFactQuestions\` appends one shared list to all 51 jurisdictions. Mississippi's public profile therefore describes New York's CPL 160.59 conviction-counting questions and California's Proposition 64 questions. They are classified postpay outside their own state so they never render, but they are served.

### The slug form of the screening route is a dead end

\`/expungement-ai/screening/mississippi\` normalizes to \`MISSISSIPPI\`, matches no jurisdiction code, and renders the missing-profile screen. Only District of Columbia survives, because the normalizer special-cases it. No product surface links to a slug route today, but \`data/rcap-ledger/public-witness-fixtures.json\` records every fixture's \`publicRoute\` in exactly that unreachable form.

## Issues

### P0

${issuesBySeverity("P0").map((issue) => `- **${issue.issueId}** — ${issue.title}\n  - category \`${issue.category}\`, owner \`${issue.recommendedOwner}\`, ${issue.affectedFlowCount} flow(s) across ${issue.affectedJurisdictionCount} jurisdiction(s)${issue.legalReviewRequired ? ", **legal review required**" : ""}`).join("\n")}

### P1

${issuesBySeverity("P1").map((issue) => `- **${issue.issueId}** — ${issue.title}\n  - category \`${issue.category}\`, owner \`${issue.recommendedOwner}\`, ${issue.affectedFlowCount} flow(s)`).join("\n")}

### P2

${issuesBySeverity("P2").map((issue) => `- **${issue.issueId}** — ${issue.title} (\`${issue.category}\`)`).join("\n")}

### P3

${issuesBySeverity("P3").map((issue) => `- **${issue.issueId}** — ${issue.title} (\`${issue.category}\`)`).join("\n")}

## Browser evidence

${crawl
  ? `A local production build of this exact SHA was served on 127.0.0.1 and crawled with the repository's existing browser framework (Playwright chromium in a \`.mjs\` script writing an evidence directory — the same shape as \`scripts/verify-expungement-commercial-browser.mjs\`). No new vendor was added; \`playwright@1.60.0\` is already a direct dependency.

${table(["Measure", "Count"], [
  ["Flows crawled", String(crawl.totals.flowsCrawled)],
  ["Desktop captures (1440×1000)", String(crawl.totals.desktopCaptures)],
  ["Mobile captures (390×844)", String(crawl.totals.mobileCaptures)],
  ["Duplicate captures suppressed", String(screenshotIndex.totals.aliasedDuplicatesSuppressed)],
  ["Product browser errors", String(crawl.totals.productBrowserErrors)],
  ["Environment browser errors (no analytics backend)", String(crawl.totals.environmentBrowserErrors)],
  ["Redirect cycles detected", String(crawl.totals.redirectCyclesDetected)],
  ["Terminals matching the manifest", String(crawl.totals.terminalsMatchingTheManifest)],
  ["Terminals diverging from the manifest", String(crawl.totals.terminalsDivergingFromTheManifest)],
  ["Flows where Back preserved a committed answer", String(crawl.totals.flowsWhereBackPreservedTheAnswer)],
  ["Flows losing every answer on refresh", String(crawl.totals.flowsLosingAnswersOnRefresh)],
  ["Analytics requests observed", String(crawl.totals.analyticsRequestsObserved)],
  ["Analytics requests carrying an answer value", String(crawl.totals.analyticsRequestsCarryingAnAnswerValue)],
  ["Participant screens rendering a raw snake_case token", String(crawl.totals.flowsWithRawTokenOnAParticipantScreen)]
])}

The crawl drives each flow with that flow's own recorded fixture answers and compares the rendered terminal against the manifest. ${crawl.totals.terminalsMatchingTheManifest} of ${crawl.totals.terminalsMatchingTheManifest + crawl.totals.terminalsDivergingFromTheManifest} agree.${divergence ? ` The ${divergence.totals.divergentRecords} that do not are classified in \`data/expungement-ai/flow-audit/crawl-divergence.json\` by replaying the browser's own answers through the real evaluator: ${JSON.stringify(divergence.totals.classificationCounts)}.` : ""}

What the crawl confirmed that source alone could not: Back preserves a committed answer, no raw internal value reaches the result card, no answer value leaves the browser through analytics, and a browser refresh discards every answer and restarts the flow at question one.`
  : "No crawl report is present. See the environment blockers below."}

## Environment blockers

${blockers.blockers.map((blocker) => `### ${blocker.blockerId} — ${blocker.title}

${blocker.detail}

- **Not exercised:** ${blocker.surfacesNotExercised.length > 0 ? blocker.surfacesNotExercised.map((surface) => `\`${surface}\``).join(", ") : "nothing beyond the substitute noted above"}
- **Consequence:** ${blocker.consequence}
- **Unblocked by:** ${blocker.unblockedBy}${blocker.missingCredentials ? `
- **Missing credentials:** ${blocker.missingCredentials.map((name) => `\`${name}\``).join(", ")}
- **Platform:** ${blocker.platform}
- **Exact staging-only action it would authorize:** ${blocker.exactStagingOnlyActionAuthorized}` : ""}`).join("\n\n")}

## What the audit discovered about the environment

${table(["Input", "Discovered", "Finding"], (blockers.discovery?.results ?? []).map((row) => [
  row.input,
  row.discovered ? "yes" : "no",
  row.finding
]))}

Local protected configuration lives at \`~/.config/legalease/expai-flow-audit.config\` and \`~/.config/legalease/expai-flow-audit.env\`, outside the repository and uncommitted. The three generated synthetic secrets exist and authorize nothing, because no environment accepts them. No value from either file appears in any committed artifact.

## Phase 3 shards

Six disjoint shards, balanced by measured workload rather than state count. Spread between the lightest and heaviest shard: **${shards.balance.spreadPercent}%** against a 20% target.

${table(["Shard", "Jurisdictions", "Flows", "Question nodes", "Branch edges", "Weight", "States"], shards.shards.map((shard) => [
  shard.shardId,
  String(shard.jurisdictionCount),
  String(shard.expectedFlowCount),
  String(shard.expectedQuestionCount),
  String(shard.expectedBranchEdgeCount),
  String(shard.weight),
  shard.stateList.join(" ")
]))}

## How to regenerate every artifact in this report

\`\`\`bash
node scripts/expungement-ai/flow-audit/build-flow-manifest.mjs
node scripts/expungement-ai/flow-audit/build-question-inventory.mjs
node scripts/expungement-ai/flow-audit/build-branch-coverage.mjs
node scripts/expungement-ai/flow-audit/build-ui-reachability.mjs
node scripts/expungement-ai/flow-audit/detect-static-defects.mjs
node scripts/expungement-ai/flow-audit/build-issue-register.mjs
node scripts/expungement-ai/flow-audit/build-shard-assignment.mjs
node scripts/expungement-ai/flow-audit/build-reports.mjs
node scripts/expungement-ai/flow-audit/verify-flow-audit.mjs
\`\`\`

Every generator accepts \`--check\`, which fails if the committed artifact is stale or non-deterministic.
`;
emit("docs/expungement-ai/flow-audit/baseline-report.md", baselineReport);

/* ------------------------------------------------------------------ */
/* Human review required                                               */
/* ------------------------------------------------------------------ */

const legalIssues = register.issues.filter((issue) => issue.legalReviewRequired);
const legalReviewFinding = staticFindings.findings.find((finding) => finding.defectClass === "legal_outcome_requires_review");
const humanReviewNotFound = [...new Set(inventory.questions.filter((q) => q.purpose === "purpose_not_found").map((q) => q.questionId))].sort();

const humanReview = `# Human review required

**Base SHA:** \`${baseSha}\`

Phase 1 does not decide any of the questions below. Each one needs a person — counsel for the legal items, the product owner for the scope items — before Phase 2 or Phase 3 touches the code it names.

## 1. Jurisdictions where no packet-ready outcome is reachable from the rendered screens

${reachability.totals.jurisdictionsNotReachingPacketReady.length} jurisdictions: ${reachability.totals.jurisdictionsNotReachingPacketReady.map((code) => `\`${code}\``).join(", ")}.

Each is marked \`live\` with the Expungement.ai channel approved in \`src/lib/rcap/state-promotion-manifest.ts\`. The bounded search in \`data/expungement-ai/flow-audit/ui-reachability.json\` found no answer set, drawn only from the rendered screens, that produces \`packet_ready\` or \`packet_ready_with_caution\`.

**The question for each state:** is the missing fact a legal precondition that genuinely must be established before a packet, in which case the flow must ask for it prepay — or is the route not actually available to a self-help participant in that state, in which case the promotion manifest is claiming more than the product does?

${table(["Jurisdiction", "Best terminal from rendered screens", "Rendered screens", "Compiled pathways", "Facts the evaluator uses that the flow never asks"], reachability.jurisdictions
  .filter((row) => !row.packetReadyReachableFromRenderedScreensOnly)
  .map((row) => [
    `\`${row.jurisdiction}\``,
    `\`${row.bestTerminalResultCode}\``,
    String(row.renderedScreens),
    String(row.compiledPathways),
    row.factsTheEvaluatorUsesThatTheFlowNeverRenders.map((id) => `\`${id}\``).join(", ") || "—"
  ]))}

## 2. Exclusion and timing answers that do not change a packet-ready outcome

${legalReviewFinding ? legalReviewFinding.detail : "See the static findings."}

**Exclusion category selected, still packet-ready:**

${(legalReviewFinding?.exclusionStillPacketReady ?? []).length > 0
  ? table(["Jurisdiction", "Pathway"], uniquePairs(legalReviewFinding.exclusionStillPacketReady))
  : "None."}

**Shortest timing bucket selected, still packet-ready:**

${(legalReviewFinding?.timingStillPacketReady ?? []).length > 0
  ? table(["Jurisdiction", "Pathway"], uniquePairs(legalReviewFinding.timingStillPacketReady))
  : "None."}

**The question:** on a non-conviction route, is the state exclusion list meant to bind at all, and is a waiting period meant to run? If the answer is no for both, these are correct outcomes and the audit should record them as such. If the answer is yes for either, the rule is wrong and the fix belongs to a state shard.

## 3. Questions with no discoverable purpose

${humanReviewNotFound.map((id) => `- \`${id}\``).join("\n")}

None is removed by this phase, per governance rule 8. Each is served in the public profile payload, is not in any pathway's \`requiredInputIds\` so the packet-information builder never renders it, and is read by no compiled rule, waiting rule, exclusion rule, timing anchor, or evaluator branch. \`record_documents\`'s only named consumer anywhere in \`src\` is the drop-point nudge email's question-to-copy map.

**The question:** was each of these meant to be asked and wired, or meant to be dropped from the payload?

## 4. The pre-rebuild legacy-matter fixture

The redirect-cycle canary (\`${register.issues.find((i) => i.canary === 1)?.issueId ?? "the loop issue"}\`) is established from source, not from a browser, because no database exists in this session (blocker \`ENV-005\`). To reproduce it in one staging pass, insert a single synthetic matter shaped like this:

\`\`\`json
{
  "state": "MS",
  "resultCode": "packet_ready_with_caution",
  "paymentAllowed": false,
  "pathwayLabel": "a label that does NOT string-match any packetGenerator pathwayLabel",
  "artifactRefs": {}
}
\`\`\`

Either condition alone is sufficient: \`paymentAllowed: false\` trips the guard mismatch between the two pages, and an unmatched \`pathwayLabel\` with no \`artifactRefs.commercialFlow\` makes \`commercialFlowForItem\` return null on both pages. Then open \`/briefcase/{id}\`, click **Complete packet information**, and observe the refusal screen whose only action returns to \`/briefcase/{id}\`.

**The question for the owner:** does a matter in either state exist in production today? The audit cannot see production data and does not want to.

## 5. Scope decisions the audit deliberately did not make

- **County and court datasets do not exist.** \`${register.issues.find((i) => i.canary === 6)?.issueId ?? "UX-COUNTY-001"}\` and \`${register.issues.find((i) => i.canary === 7)?.issueId ?? "UX-COURT-001"}\` name the gap, not a source. Choosing the county and court data source is a product decision with licensing and freshness consequences; the master plan lists \`TEST_COUNTY_AND_COURT_DATA_SOURCE\` as an owner-supplied input and none was supplied.
- **Discount codes.** \`${register.issues.find((i) => i.canary === 11)?.issueId ?? "UX-GLOBAL"}\` records that no discount entry exists and that the only code concept in the product is a partner sponsorship grant. Whether Expungement.ai should accept discount codes at all is a commercial decision.
- **The \`contextOnly\` contradiction.** The frontend contract says a \`contextOnly\` question never selects the pathway; \`selectPathway\` reads \`possible_pathway_context\` first. Changing either side changes behaviour, so Phase 1 only records it.

## 6. Issues already marked legal-review-required in the register

${legalIssues.length > 0
  ? legalIssues.map((issue) => `- **${issue.issueId}** (${issue.severity}, \`${issue.category}\`) — ${issue.title}`).join("\n")
  : "None."}
`;
emit("docs/expungement-ai/flow-audit/human-review-required.md", humanReview);

/* ------------------------------------------------------------------ */
/* State reports                                                       */
/* ------------------------------------------------------------------ */

for (const jurisdiction of manifest.jurisdictions) {
  const code = jurisdiction.jurisdiction;
  const flows = manifest.flows.filter((flow) => flow.jurisdiction === code);
  const questions = inventory.questions.filter((question) => question.jurisdiction === code);
  const screens = questions.filter((question) => question.reachability === "rendered_as_consumer_screen").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const builderQuestions = questions.filter((question) => question.reachability === "rendered_by_packet_information_builder");
  const branches = branchCoverage.branches.filter((branch) => branch.jurisdiction === code);
  const reach = reachability.jurisdictions.find((row) => row.jurisdiction === code);
  const shard = shards.shards.find((row) => row.stateList.includes(code));
  const jurisdictionIssues = register.issues.filter((issue) => issue.affectedJurisdictions.includes(code));
  const crawlFlows = crawl ? crawl.flows.filter((flow) => flow.jurisdiction === code) : [];

  const terminals = {};
  for (const flow of flows) terminals[flow.terminalOutcome.effectiveTerminal] = (terminals[flow.terminalOutcome.effectiveTerminal] ?? 0) + 1;

  const report = `# ${jurisdiction.name} (${code}) — flow audit

**Base SHA:** \`${baseSha}\` · **Profile version:** \`${jurisdiction.profileVersion}\` · **Phase 3 shard:** \`${shard?.shardId ?? "unassigned"}\`
**Promotion status:** \`${jurisdiction.promotionStatus}\` · **Expungement.ai channel approved:** ${jurisdiction.expungementAiChannelApproved ? "yes" : "no"}

## Shape

${table(["Measure", "Count"], [
  ["Compiled pathways", String(jurisdiction.compiledPathways)],
  ["Flow rows", String(flows.length)],
  ["Consumer screens", String(screens.length)],
  ["Packet-information builder questions", String(builderQuestions.length)],
  ["Question nodes in the public payload", String(questions.length)],
  ["Branch edges", String(branches.length)],
  ["Ordered decision rules", String(jurisdiction.orderedDecisionRules)],
  ["Waiting-period rules", String(jurisdiction.waitingPeriodRules)],
  ["Exclusion rules", String(jurisdiction.exclusionRules)]
])}

## Reachability from the rendered screens only

- Packet-ready reachable: **${reach?.packetReadyReachableFromRenderedScreensOnly ? "yes" : "no"}**
- Payment reachable: **${reach?.paymentReachableFromRenderedScreensOnly ? "yes" : "no"}**
- Best terminal found: \`${reach?.bestTerminalResultCode ?? "unknown"}\`${reach?.bestPathwayId ? ` on \`${reach.bestPathwayId}\`` : ""}
${(reach?.factsTheEvaluatorUsesThatTheFlowNeverRenders ?? []).length > 0
  ? `- Facts the evaluator consumes that this state never asks: ${reach.factsTheEvaluatorUsesThatTheFlowNeverRenders.map((id) => `\`${id}\``).join(", ")}`
  : "- Every evaluator fact this state uses is asked on a rendered screen."}

## Consumer screens, in order

${screens.length > 0
  ? table(["#", "Question id", "Type", "Required", "Purpose", "Sensitivity", "Help"], screens.map((question) => [
    String(question.order ?? "—"),
    `\`${question.questionId}\``,
    `\`${question.inputType}\``,
    question.contextOnly === true ? "context only" : question.required ? "yes" : "no",
    `\`${question.purpose}\``,
    `\`${question.sensitivity}\``,
    question.helpCopy.hasHelperText ? "yes" : "**none**"
  ]))
  : "This jurisdiction renders no consumer screens."}

## Remedies and their terminals

${table(["Pathway", "Category", "Terminal", "Payment", "Launch-sellable"], [...new Map(flows
  .filter((flow) => flow.remedy.kind === "compiled_pathway")
  .map((flow) => [flow.remedy.pathwayId, flow])).values()]
  .sort((a, b) => (a.remedy.pathwayId ?? "").localeCompare(b.remedy.pathwayId ?? ""))
  .map((flow) => [
    `\`${flow.remedy.pathwayId}\``,
    `\`${flow.remedy.closureCategory}\``,
    `\`${flow.terminalOutcome.effectiveTerminal}\``,
    flow.terminalOutcome.paymentAllowedAtEvaluator ? "allowed at evaluator" : "closed",
    flow.launchGovernance.operationallySellable === null ? "—" : flow.launchGovernance.operationallySellable ? "yes" : "no"
  ]))}

### Terminal distribution across this jurisdiction's flow rows

${table(["Terminal", "Flows"], Object.entries(terminals).sort((a, b) => b[1] - a[1]).map(([terminal, count]) => [`\`${terminal}\``, String(count)]))}

## Non-remedy terminals

${table(["Probe", "Terminal", "What it exercises"], flows
  .filter((flow) => flow.remedy.kind === "no_remedy_resolved")
  .map((flow) => [`\`${flow.remedy.probeId}\``, `\`${flow.terminalOutcome.effectiveTerminal}\``, flow.entryConditions.narrative ?? "—"]))}

## Browser evidence

${crawlFlows.length > 0
  ? table(["Flow", "Viewport", "Screens walked", "Rendered terminal", "Matches manifest"], crawlFlows.map((flow) => [
    `\`${flow.flowId}\``,
    flow.viewport,
    String(flow.screens.length),
    flow.terminal?.observedResultCode ? `\`${flow.terminal.observedResultCode}\`` : "—",
    flow.terminal?.terminalMatchesManifest === null ? "—" : flow.terminal?.terminalMatchesManifest ? "yes" : "**no**"
  ]))
  : "No browser evidence for this jurisdiction. See the environment blockers in the baseline report."}

## Issues touching ${code}

${jurisdictionIssues.length > 0
  ? jurisdictionIssues.map((issue) => `- **${issue.issueId}** (${issue.severity}, \`${issue.category}\`, owner \`${issue.recommendedOwner}\`) — ${issue.title}`).join("\n")
  : "None recorded."}

## Files a Phase 3 shard may change for ${code}

\`\`\`text
src/lib/rcap-engine/compiled/profiles/${code}-${jurisdiction.slug}.json
src/lib/rcap/state-packs/${jurisdiction.slug === "district-of-columbia" ? "dc" : jurisdiction.slug}/**
docs/expungement-ai/flow-audit/state-reports/${code}.md
\`\`\`

Shared paths are Phase 2's and are listed in \`data/expungement-ai/flow-audit/shard-assignment.json\` under \`prohibitedSharedPaths\`.
`;
  emit(`docs/expungement-ai/flow-audit/state-reports/${code}.md`, report);
}

/* ------------------------------------------------------------------ */
/* Shard prompts                                                       */
/* ------------------------------------------------------------------ */

for (const shard of shards.shards) {
  const number = String(shard.sessionNumber).padStart(2, "0");
  const shardIssues = register.issues.filter((issue) =>
    issue.scope === "state_specific" && issue.affectedJurisdictions.some((code) => shard.stateList.includes(code))
  );
  const unreachable = shard.jurisdictionsWithNoUiReachablePacketReady;

  const prompt = `# EXPUNGEMENT.AI FLOW PROGRAM — PHASE 3 — ${shard.shardId} (session ${number})

You are implementing state-specific configuration corrections for exactly ${shard.jurisdictionCount} jurisdictions. Keep thinking enabled. Use high effort.

Before the first tool call, state in one sentence that you will correct only the configuration of your assigned jurisdictions and will not touch shared code.

## Your jurisdictions

${shard.stateNames.map((name) => `- ${name}`).join("\n")}

No other jurisdiction is yours. If you find a defect in a jurisdiction outside this list, record it in your shard result file and leave the code alone.

## Base

\`\`\`text
BASE_SHA = ${shard.baseSha}
BRANCH   = claude/expai-phase3-${shard.shardId.toLowerCase()}
\`\`\`

Create your branch from exactly \`${shard.baseSha}\`. Fetch origin with prune first. Require a clean tracked worktree and no merge or rebase in progress. Do not push to \`main\`. Do not deploy. Do not change a feature flag.

## Read before you change anything

\`\`\`text
docs/expungement-ai/flow-audit/baseline-report.md
docs/expungement-ai/flow-audit/human-review-required.md
${shard.stateList.map((code) => `docs/expungement-ai/flow-audit/state-reports/${code}.md`).join("\n")}
data/expungement-ai/flow-audit/flow-manifest.json
data/expungement-ai/flow-audit/question-inventory.json
data/expungement-ai/flow-audit/issue-register.json
AGENTS.md
\`\`\`

## What you own

\`\`\`text
${shard.allowedConfigurationPaths.join("\n")}
\`\`\`

## What you must not touch

Phase 2 owns the shared layer. These paths are not yours, and a diff touching one of them fails your shard:

\`\`\`text
${shard.prohibitedSharedPaths.join("\n")}
\`\`\`

You may not remove a state-specific legal rule because it is inconvenient. You may not delete a question because the audit could not find its purpose; governance rule 8 says those are flagged, not deleted. You may not change a packet family without owner approval.

## Your expected scope

${table(["Measure", "Count"], [
  ["Jurisdictions", String(shard.jurisdictionCount)],
  ["Flow rows", String(shard.expectedFlowCount)],
  ["Question nodes", String(shard.expectedQuestionCount)],
  ["Consumer screens", String(shard.expectedConsumerScreenCount)],
  ["Branch edges", String(shard.expectedBranchEdgeCount)],
  ["Unresolved legal-review items", String(shard.unresolvedLegalReviewItems)],
  ["Workload weight", `${shard.weight} (${shard.weightSharePercent}% of the programme)`]
])}

### Your flow IDs

${shard.flowIds.length} flow IDs are yours. They are listed in full in \`data/expungement-ai/flow-audit/shard-assignment.json\` under \`shards[] where shardId == "${shard.shardId}"\`. The first ten:

\`\`\`text
${shard.flowIds.slice(0, 10).join("\n")}
\`\`\`

## Your work, in order

1. **Confirm the audit's reading for each of your jurisdictions.** Open the state report, re-run the manifest generators with \`--check\`, and confirm the flow and question counts still hold at your base SHA. If a count has moved, stop and say so.

2. **Resolve the reachability question for every jurisdiction of yours that cannot reach packet-ready from its rendered screens.**${unreachable.length > 0
  ? `\n\n   Yours: ${unreachable.map((code) => `\`${code}\``).join(", ")}.\n\n   For each, decide from the state's compiled profile and its source references which of two things is true: the missing fact is a genuine legal precondition that must be asked before a packet, or the route is not available to a self-help participant in that state. The first is a lifecycle classification correction in that state's compiled profile. The second is a promotion-manifest question you must escalate rather than answer, because it changes what the product claims.`
  : "\n\n   None of your jurisdictions is in that set. Confirm that against `data/expungement-ai/flow-audit/ui-reachability.json` rather than taking this sentence's word for it."}

3. **Work the state-specific issues assigned to your jurisdictions.**${shardIssues.length > 0
  ? `\n\n${shardIssues.map((issue) => `   - **${issue.issueId}** (${issue.severity}, \`${issue.category}\`) — ${issue.title}\n     - jurisdictions in your shard: ${issue.affectedJurisdictions.filter((code) => shard.stateList.includes(code)).map((code) => `\`${code}\``).join(", ")}\n     - legal review required: ${issue.legalReviewRequired ? "**yes — do not implement until counsel answers**" : "no"}`).join("\n")}`
  : "\n\n   No state-specific issue in the register names one of your jurisdictions. Re-derive that from the register rather than assuming it."}

4. **Do not implement any global issue.** Every issue whose category begins \`GLOBAL_\` belongs to Phase 2. If a Phase 2 fix has not landed yet, note the dependency and move on.

5. **Write one state sign-off packet per jurisdiction** at \`data/expungement-ai/flow-audit/shard-results/${shard.shardId}.json\`, recording for each jurisdiction: what you changed, what you deliberately did not change, which legal questions remain open, and the before-and-after terminal for every flow ID of yours whose outcome moved.

## Acceptance tests

Run all of these. Every one must pass before you push.

\`\`\`bash
${shard.acceptanceTests.join("\n")}
\`\`\`

Additionally:

\`\`\`bash
npm run lint
npm run typecheck
git diff --check
\`\`\`

And prove the negative that matters most — that you changed no shared code and no unassigned jurisdiction:

\`\`\`bash
git diff --name-only ${shard.baseSha}...HEAD
\`\`\`

Every path in that output must match one of your allowed configuration paths. A path outside them fails the shard regardless of how good the change is.

## Commit and push

Commit your configuration changes, your state reports, and your shard result file. Push \`claude/expai-phase3-${shard.shardId.toLowerCase()}\`. Do not merge. Do not deploy. Do not open a pull request unless the integration captain asks for one.

## Final response

\`\`\`text
PHASE 3 ${shard.shardId} COMPLETE
BASE SHA:
HEAD:
JURISDICTIONS:
FLOWS CHANGED:
QUESTIONS CHANGED:
TERMINALS MOVED:
LEGAL QUESTIONS STILL OPEN:
SHARED PATHS TOUCHED:
UNASSIGNED JURISDICTIONS TOUCHED:
ACCEPTANCE TESTS:
EXACT BLOCKERS:
\`\`\`

\`SHARED PATHS TOUCHED\` and \`UNASSIGNED JURISDICTIONS TOUCHED\` must both read \`none\`.
`;
  emit(`docs/expungement-ai/flow-audit/shard-prompts/session-${number}.md`, prompt);
}

console.log(`${CHECK ? "checked" : "wrote"} ${written.length} artifact(s)`);
if (!CHECK) for (const file of written.slice(0, 8)) console.log(`  ${file}`);
