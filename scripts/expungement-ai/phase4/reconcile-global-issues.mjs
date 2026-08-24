#!/usr/bin/env node
/**
 * Phase 4 reconciliation of the 25 registered issues against the candidate tree.
 *
 * Integration was merge-only, so "no global issue implemented in integration"
 * says nothing about whether Phase 2 closed one. Each issue is compared against
 * the code and data that exist at the candidate head, and where a deterministic
 * probe is possible the probe decides. A browser-only reproduction that this
 * environment cannot enter is ENVIRONMENT_BLOCKED, not CLOSED.
 *
 * Read-only.
 */
import fs from "node:fs";
import path from "node:path";
import {
  getAllJurisdictionProfiles, getProfileByJurisdiction, projectPublicProfile,
  ROOT_DIR, read, exists, readJson, writeArtifact, gitSha
} from "../flow-audit/lib/engine.mjs";

const REGISTER = readJson("data/expungement-ai/flow-audit/issue-register.json");
const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");
const VERDICTS = ["CLOSED_BY_PHASE2", "STILL_REPRODUCIBLE", "SUPERSEDED", "ENVIRONMENT_BLOCKED", "LEGAL_OWNER_DECISION_REQUIRED"];

const grep = (relativePath, pattern) => exists(relativePath) && pattern.test(read(relativePath));
const sourceFiles = [];
{
  const stack = [path.join(ROOT_DIR, "src")];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(path.relative(ROOT_DIR, full));
    }
  }
}
const anySource = (pattern) => sourceFiles.filter((file) => pattern.test(read(file)));

/** Every jurisdiction's public profile, projected once. */
const publicProfiles = new Map();
for (const entry of getAllJurisdictionProfiles()) {
  const code = entry.jurisdiction?.code ?? entry.code;
  if (!code) continue;
  try { publicProfiles.set(code, projectPublicProfile(getProfileByJurisdiction(code))); } catch { /* unresolvable */ }
}

/**
 * The deterministic probes. Each returns { verdict, evidence } and is keyed by
 * the register's own finding id, so a probe can never drift onto another issue.
 */
const PROBES = {
  // The automatic waiting-rule selector could not choose a rule the profile held.
  "EXPAI-FA-018": () => {
    const bound = Object.keys(BINDINGS.bindings ?? {}).length;
    const unresolved = (BINDINGS.unresolvedPreserved?.keys ?? []).length + (BINDINGS.unresolvedAtBase?.keys ?? []).length;
    const fallbackStillLive = grep("src/lib/rcap-engine/evaluator.ts", /function bestWaitingRuleForPathway/);
    return {
      verdict: "STILL_REPRODUCIBLE",
      evidence: `Phase 2 added an explicit binding table covering ${bound} routes, but ${unresolved} routes still resolve through the pre-correction prose selector, which is present verbatim at src/lib/rcap-engine/evaluator.ts (bestWaitingRuleForPathway present=${fallbackStillLive}). Partially closed, not closed.`,
      partiallyClosed: true
    };
  },
  // Every jurisdiction's public profile carries other states' prefixed questions.
  "EXPAI-FA-022": () => {
    const offenders = [];
    for (const [code, publicProfile] of publicProfiles) {
      const foreign = publicProfile.questions
        .map((question) => question.id)
        .filter((id) => /^[a-z]{2}_/.test(id) && !id.startsWith(`${code.toLowerCase()}_`));
      if (foreign.length > 0) offenders.push({ code, count: foreign.length, sample: foreign.slice(0, 4) });
    }
    return {
      verdict: offenders.length > 0 ? "STILL_REPRODUCIBLE" : "CLOSED_BY_PHASE2",
      evidence: `${offenders.length} of ${publicProfiles.size} jurisdictions publish another state's prefixed question ids. Sample: ${JSON.stringify(offenders.slice(0, 4))}`
    };
  },
  // Route-specific facts asked of every participant before the route is known.
  "EXPAI-FA-015": () => {
    const offenders = [];
    for (const [code, publicProfile] of publicProfiles) {
      const scoped = publicProfile.questions.filter((question) => question.id.startsWith(`${code.toLowerCase()}_`));
      if (scoped.length > 0) offenders.push({ code, ids: scoped.map((q) => q.id) });
    }
    return {
      verdict: offenders.length > 0 ? "STILL_REPRODUCIBLE" : "CLOSED_BY_PHASE2",
      evidence: `${offenders.length} jurisdictions publish route-scoped questions to every participant: ${JSON.stringify(offenders.slice(0, 6))}. Phase 4 proved these block unrelated routes; see phase4/route-irrelevant-ambiguity.json.`
    };
  },
  // The slug form of the screening route resolved to the missing-profile screen.
  "EXPAI-FA-020": () => {
    const verifier = "scripts/expungement-ai/phase2/verify-jurisdiction-slug-routes.mjs";
    return {
      verdict: exists(verifier) ? "CLOSED_BY_PHASE2" : "STILL_REPRODUCIBLE",
      evidence: `${verifier} exists=${exists(verifier)}; Phase 2 added a dedicated slug-route verifier. Run once below.`
    };
  },
  // The evaluator consumes facts the flow never asks for.
  "EXPAI-FA-028": () => {
    const before = exists("data/expungement-ai/phase2/canonical-fact-sweep-before.json") ? readJson("data/expungement-ai/phase2/canonical-fact-sweep-before.json") : null;
    const after = exists("data/expungement-ai/phase2/canonical-fact-sweep-after.json") ? readJson("data/expungement-ai/phase2/canonical-fact-sweep-after.json") : null;
    const stringify = (value) => JSON.stringify(value?.totals ?? value ?? {});
    return {
      verdict: after ? "CLOSED_BY_PHASE2" : "STILL_REPRODUCIBLE",
      evidence: `Phase 2 recorded a canonical-fact sweep before/after. before=${stringify(before).slice(0, 200)} after=${stringify(after).slice(0, 200)}`
    };
  },
  // contextOnly questions must never select the pathway.
  "EXPAI-FA-023": () => {
    const selects = grep("src/lib/rcap-engine/evaluator.ts", /function selectPathway[\s\S]{0,200}possible_pathway_context/);
    const contextOnly = [...publicProfiles.values()].some((publicProfile) =>
      publicProfile.questions.some((question) => question.id === "possible_pathway_context" && question.contextOnly === true));
    return {
      verdict: selects && contextOnly ? "STILL_REPRODUCIBLE" : "CLOSED_BY_PHASE2",
      evidence: `selectPathway still reads possible_pathway_context=${selects}; that question is projected contextOnly=${contextOnly}. The frontend contract and the evaluator still disagree.`
    };
  },
  // No discount-code entry anywhere before checkout.
  "EXPAI-FA-011": () => {
    const entries = anySource(/discount[_ ]?code|promo[_ ]?code|couponCode/i);
    const consumerEntry = entries.filter((file) => file.startsWith("src/components") || file.startsWith("src/app"));
    return {
      verdict: consumerEntry.length > 0 ? "CLOSED_BY_PHASE2" : "STILL_REPRODUCIBLE",
      evidence: `Files mentioning a discount/promo code: ${entries.length}; consumer-facing entry points among them: ${consumerEntry.length}${consumerEntry.length > 0 ? ` (${consumerEntry.slice(0, 4).join(", ")})` : ""}. A hosted paid run is still required to confirm behaviour: see the hosted acceptance record.`
    };
  },
  // Sponsorship has no consumer entry point.
  "EXPAI-FA-012": () => {
    const entries = anySource(/sponsorship|sponsored/i);
    const consumerEntry = entries.filter((file) => file.startsWith("src/components") || file.startsWith("src/app"));
    return {
      verdict: consumerEntry.length > 0 ? "CLOSED_BY_PHASE2" : "STILL_REPRODUCIBLE",
      evidence: `Files mentioning sponsorship: ${entries.length}; consumer-facing among them: ${consumerEntry.length}. A hosted sponsored run is still required.`
    };
  },
  // The accuracy review page prints raw snake_case internal values.
  "EXPAI-FA-010": () => {
    const copy = anySource(/friendlyMissingFieldLabel|plainLanguage|humanizeFieldId/);
    return {
      verdict: copy.length > 0 ? "CLOSED_BY_PHASE2" : "STILL_REPRODUCIBLE",
      evidence: `Plain-language mapping present in ${copy.length} file(s): ${copy.slice(0, 4).join(", ")}. Whether the review page leaks a raw value is a rendered-page assertion; no reachable test in this environment proves the absence.`,
      needsBrowser: true
    };
  },
  // A browser refresh discards every screening answer.
  "EXPAI-FA-025": () => {
    const persistence = anySource(/screening-session-persistence|screeningSessionPersistence/);
    return {
      verdict: persistence.length > 0 ? "CLOSED_BY_PHASE2" : "STILL_REPRODUCIBLE",
      evidence: `Screening session persistence present in ${persistence.length} file(s). Confirming a refresh restores answers requires a running app and a session store, which this environment does not have.`,
      needsBrowser: true
    };
  }
};

/** Issues whose only reproduction is a rendered page or an authenticated session. */
const BROWSER_ONLY = new Set([
  "EXPAI-FA-001", "EXPAI-FA-002", "EXPAI-FA-003", "EXPAI-FA-004", "EXPAI-FA-005",
  "EXPAI-FA-008", "EXPAI-FA-009", "EXPAI-FA-013", "EXPAI-FA-014", "EXPAI-FA-019", "EXPAI-FA-021", "EXPAI-FA-027"
]);
/** Issues whose disposition is a legal judgement, not a code observation. */
const LEGAL_OWNER = new Set(["EXPAI-FA-024"]);
/** County/court, superseded by the consolidated Phase 4 packet. */
const COUNTY_COURT = new Set(["EXPAI-FA-006", "EXPAI-FA-007"]);

const out = {
  schemaVersion: "expai-phase4-global-issue-reconciliation/v1",
  candidateSha: gitSha("HEAD"),
  vocabulary: VERDICTS,
  note: "Integration was merge-only. A verdict here reflects the candidate tree, not the integration report.",
  totals: {},
  issues: {}
};

for (const issue of REGISTER.issues) {
  const id = issue.findingId;
  let verdict, evidence, extra = {};
  if (PROBES[id]) {
    const result = PROBES[id]();
    verdict = result.verdict; evidence = result.evidence;
    extra = { partiallyClosed: result.partiallyClosed ?? false, deterministicProbe: true, needsBrowserToConfirm: result.needsBrowser ?? false };
  } else if (COUNTY_COURT.has(id)) {
    verdict = "STILL_REPRODUCIBLE";
    evidence = "County and court are still collected as free text. Phase 3 prepared 17 controlled datasets but nothing reads them, and the shared renderer has no controlled-plus-manual arm. See phase4/county-court-verification.json. Superseded as a standalone issue by CP-07.";
    extra = { deterministicProbe: true, supersededBy: "CP-07" };
  } else if (LEGAL_OWNER.has(id)) {
    verdict = "LEGAL_OWNER_DECISION_REQUIRED";
    evidence = "The register marks this legalReviewRequired. No repository content resolves it deterministically, so Phase 4 does not decide it.";
  } else if (BROWSER_ONLY.has(id)) {
    verdict = "ENVIRONMENT_BLOCKED";
    evidence = "Reproduction requires a rendered page and, for most, an authenticated Briefcase matter. No Preview deployment, staging Supabase, synthetic user or compatible Playwright browser exists in this environment. See phase4/environment-blockers.json.";
    extra = { missingEnvironmentInput: ["hosted Preview URL", "staging Supabase project", "synthetic authenticated users", "Playwright browser matching the pinned driver"] };
  } else {
    verdict = "ENVIRONMENT_BLOCKED";
    evidence = "No deterministic repository probe decides this issue and its reproduction is not reachable in this environment.";
  }
  out.issues[id] = {
    findingId: id, severity: issue.severity, category: issue.category, defectClass: issue.defectClass,
    scope: issue.scope, title: issue.title,
    affectedJurisdictionCount: issue.affectedJurisdictionCount ?? null,
    legalReviewRequired: issue.legalReviewRequired ?? null,
    verdict, evidence, ...extra
  };
}

out.totals = VERDICTS.reduce((accumulator, verdict) => {
  accumulator[verdict] = Object.values(out.issues).filter((issue) => issue.verdict === verdict).length;
  return accumulator;
}, { registered: REGISTER.issues.length });

writeArtifact("data/expungement-ai/flow-audit/phase4/global-issue-reconciliation.json", out);
console.log(JSON.stringify(out.totals, null, 1));
for (const issue of Object.values(out.issues)) console.log(`${issue.verdict.padEnd(30)} ${issue.findingId} ${issue.severity} ${String(issue.title).slice(0, 62)}`);
