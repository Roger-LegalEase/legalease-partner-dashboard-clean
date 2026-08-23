#!/usr/bin/env node
// The Phase 1 issue register.
//
//   node scripts/expungement-ai/flow-audit/build-issue-register.mjs
//   node scripts/expungement-ai/flow-audit/build-issue-register.mjs --check
//
// Merges the static findings with whatever browser evidence exists, assigns the
// program's issue-id shape, and states for every issue who owns the fix and
// whether counsel has to answer before anyone touches it.
//
// The register never invents an issue. Every row traces to a finding produced by
// detect-static-defects.mjs or to an observation in the crawl report.

import { read, readJson, exists, gitSha, writeArtifact, stableJson } from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/issue-register.json";
const CRAWL = "data/expungement-ai/flow-audit/evidence/crawl-report.json";

const staticFindings = readJson("data/expungement-ai/flow-audit/static-findings.json");
const manifest = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const crawl = exists(CRAWL) ? readJson(CRAWL) : null;

const GLOBAL_SCOPES = new Set([
  "GLOBAL_SHARED_COMPONENT", "GLOBAL_FACT_MODEL", "GLOBAL_NAVIGATION",
  "GLOBAL_REVIEW_FORMATTING", "GLOBAL_PAYMENT", "GLOBAL_HELP"
]);

/** Phase ownership follows the program's rule: shared layer in Phase 2, state configuration in Phase 3. */
function ownerFor(scope, legalReviewRequired) {
  if (legalReviewRequired) return "LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD";
  if (GLOBAL_SCOPES.has(scope)) return "PHASE_2_SHARED";
  if (scope === "COUNTY_DATA" || scope === "COURT_DATA") return "PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING";
  if (scope === "STATE_CONFIGURATION" || scope === "STATE_LEGAL_LOGIC") return "PHASE_3_STATE_SHARD";
  if (scope === "CONTENT_ONLY") return "PHASE_2_SHARED";
  return "PHASE_1_RECORD_ONLY";
}

function idPrefixFor(scope) {
  if (GLOBAL_SCOPES.has(scope)) return "UX-GLOBAL";
  if (scope === "COUNTY_DATA") return "UX-COUNTY";
  if (scope === "COURT_DATA") return "UX-COURT";
  if (scope === "STATE_CONFIGURATION") return "UX-STATECFG";
  if (scope === "STATE_LEGAL_LOGIC") return "UX-STATELAW";
  if (scope === "CONTENT_ONLY") return "UX-CONTENT";
  return "UX-LEGAL";
}

/**
 * Automatic implementation is only safe when the change is mechanical and its
 * correctness does not turn on a legal reading. Everything that touches an
 * eligibility rule, a waiting period, or an exclusion list is excluded, as is
 * anything whose fix requires a dataset that does not exist yet.
 */
function safeForAutomaticImplementation(finding) {
  if (finding.legalReviewRequired) return false;
  if (finding.scope === "STATE_LEGAL_LOGIC" || finding.scope === "REQUIRES_LEGAL_REVIEW") return false;
  if (finding.scope === "COUNTY_DATA" || finding.scope === "COURT_DATA") return false;
  if (finding.outcome === "no_defect_found") return false;
  return true;
}

const issues = [];
const counters = {};

for (const finding of staticFindings.findings) {
  if (finding.outcome === "no_defect_found") continue;
  const prefix = idPrefixFor(finding.scope);
  counters[prefix] = (counters[prefix] ?? 0) + 1;
  const affected = [...new Set(finding.affectedFlowIds ?? [])].sort();
  const affectedJurisdictions = [...new Set(
    manifest.flows.filter((flow) => affected.includes(flow.flowId)).map((flow) => flow.jurisdiction)
  )].sort();

  issues.push({
    issueId: `${prefix}-${String(counters[prefix]).padStart(3, "0")}`,
    findingId: finding.findingId,
    severity: finding.severity,
    category: finding.scope,
    scope: GLOBAL_SCOPES.has(finding.scope) ? "global" : "state_specific",
    defectClass: finding.defectClass,
    canary: finding.canary,
    title: finding.title,
    detail: finding.detail,
    affectedFlowIds: affected,
    affectedFlowCount: affected.length,
    affectedJurisdictions,
    affectedJurisdictionCount: affectedJurisdictions.length,
    reproduction: finding.reproduction,
    actual: finding.actualBehaviour,
    expected: finding.expectedBehaviour,
    evidence: [
      ...finding.evidence,
      ...(crawl ? crawlEvidenceFor(finding) : [])
    ],
    recommendedOwner: ownerFor(finding.scope, finding.legalReviewRequired),
    implementationOwner: finding.implementationOwner,
    safeForAutomaticImplementation: safeForAutomaticImplementation(finding),
    legalReviewRequired: finding.legalReviewRequired === true
  });
}

/** Browser observations attached to the finding they corroborate. */
function crawlEvidenceFor(finding) {
  const out = [];
  if (!crawl) return out;
  if (finding.defectClass === "redirect_cycle") {
    const cycles = crawl.flows.filter((flow) => flow.redirectCycleDetected);
    out.push({
      file: "data/expungement-ai/flow-audit/evidence/crawl-report.json",
      line: null,
      excerpt: null,
      note: `Browser crawl detected ${cycles.length} redirect cycle(s) across ${crawl.totals.flowsCrawled} crawled flow(s). The Briefcase loop itself needs an authenticated session and is recorded as an environment blocker.`
    });
  }
  if (finding.defectClass === "raw_internal_enum_without_review_formatter") {
    const leaks = crawl.flows.filter((flow) => (flow.reviewPageRawValueLeak?.count ?? 0) > 0);
    out.push({
      file: "data/expungement-ai/flow-audit/evidence/crawl-report.json",
      line: null,
      excerpt: null,
      note: `Browser crawl found snake_case tokens rendered to the participant on ${leaks.length} crawled screen set(s).`
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Environment blockers                                                */
/* ------------------------------------------------------------------ */

const blockers = readJson("data/expungement-ai/flow-audit/environment-blockers.json");

const severityCounts = { P0: 0, P1: 0, P2: 0, P3: 0 };
for (const issue of issues) severityCounts[issue.severity] += 1;
const categoryCounts = {};
for (const issue of issues) categoryCounts[issue.category] = (categoryCounts[issue.category] ?? 0) + 1;

const register = {
  schemaVersion: "expai-issue-register/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-issue-register.mjs",
  baseSha: gitSha("origin/main"),
  changesNoProductBehavior: true,
  severityVocabulary: staticFindings.severityVocabulary,
  categoryVocabulary: staticFindings.scopeVocabulary,
  canaryVerdicts: staticFindings.canaryVerdicts,
  browserEvidence: crawl
    ? {
      present: true,
      baseOrigin: crawl.baseOrigin,
      flowsCrawled: crawl.totals.flowsCrawled,
      desktopCaptures: crawl.totals.desktopCaptures,
      mobileCaptures: crawl.totals.mobileCaptures,
      redirectCyclesDetected: crawl.totals.redirectCyclesDetected
    }
    : { present: false, reason: "No crawl report at data/expungement-ai/flow-audit/evidence/crawl-report.json." },
  environmentBlockers: blockers.blockers,
  totals: {
    issues: issues.length,
    severityCounts,
    categoryCounts,
    globalIssues: issues.filter((issue) => issue.scope === "global").length,
    stateSpecificIssues: issues.filter((issue) => issue.scope === "state_specific").length,
    legalReviewIssues: issues.filter((issue) => issue.legalReviewRequired).length,
    safeForAutomaticImplementation: issues.filter((issue) => issue.safeForAutomaticImplementation).length,
    phase2Issues: issues.filter((issue) => issue.recommendedOwner.startsWith("PHASE_2")).length,
    phase3Issues: issues.filter((issue) => issue.recommendedOwner.startsWith("PHASE_3")).length
  },
  issues
};

const text = stableJson(register);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`issue register current and deterministic: ${issues.length} issue(s).`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  issues: ${issues.length}  severities: ${JSON.stringify(severityCounts)}`);
console.log(`  global ${register.totals.globalIssues}  state-specific ${register.totals.stateSpecificIssues}  legal review ${register.totals.legalReviewIssues}`);
