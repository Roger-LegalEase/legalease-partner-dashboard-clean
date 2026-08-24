#!/usr/bin/env node
/**
 * Regenerates the six disjoint state-shard prompts from the Phase 2 head.
 *
 * The packing is Phase 1's — six disjoint shards, longest-processing-time-first,
 * spread under 10% — because it is already balanced and already disjoint, and
 * repacking would only churn assignments. What changes is the base each shard
 * builds from, the shared surface it must not touch (Phase 2 added files to it),
 * the Phase 2 record it has to read before deciding anything, and the ordering
 * of the work: release-critical state P0 and P1 first, everything else recorded
 * rather than built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
process.chdir(root);
const readJson = (relative) => JSON.parse(fs.readFileSync(relative, "utf8"));

/**
 * The Phase 2 product head, pinned.
 *
 * This used to read `git rev-parse HEAD`, which is wrong for a generator whose
 * own output gets committed: publishing the prompts moves HEAD, and the prompts
 * then name a commit that is not the product base they were built from. The
 * product SHA is a constant, and the publication commit that carries these files
 * is deliberately NOT it.
 */
const PHASE2_PRODUCT_HEAD = "93e05e945a52cfa1cdd2ab590636290875a48f68";
const head = PHASE2_PRODUCT_HEAD;

/**
 * The pin is only honest if the product has not moved under it. These are the
 * paths a shard builds against; if any of them differs between the pinned SHA
 * and the tree being published from, the prompt would send six sessions at a
 * base that no longer describes the product.
 */
const PRODUCT_PATHS = ["src", "public", "data/rcap-all50", "data/rcap-ledger", "data/rcap-codex", "data/rcap-render"];
const drift = execFileSync("git", ["diff", "--name-only", `${PHASE2_PRODUCT_HEAD}..HEAD`, "--", ...PRODUCT_PATHS], { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
if (drift.length > 0) {
  throw new Error(`the product moved away from the pinned Phase 2 head ${PHASE2_PRODUCT_HEAD}: ${drift.join(", ")}`);
}

const assignment = readJson("data/expungement-ai/flow-audit/shard-assignment.json");
const register = readJson("data/expungement-ai/flow-audit/issue-register.json");
const held = readJson("data/expungement-ai/phase2/held-jurisdiction-dispositions.json");
const backlog = readJson("data/expungement-ai/phase2/p2-p3-backlog.json");
const replay = readJson("data/expungement-ai/phase2/remedy-context-replay-after.json");
const waitingRules = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");

/**
 * Routes with no authored binding, which the provisional legacy prose selector
 * still resolves. Grouped per shard so each session gets its own list and no
 * session has to derive it.
 */
const FALLBACK_ROUTE_KEYS = [
  ...(waitingRules.unresolvedPreserved?.keys ?? []),
  ...(waitingRules.unresolvedAtBase?.keys ?? [])
].sort();
const NO_RULE_AT_BASE = new Set(waitingRules.unresolvedAtBase?.keys ?? []);

/**
 * Jurisdictions whose intended route now reaches a packet-ready terminal for the
 * same participant the Phase 1B reconciliation used. A shard must not be told to
 * re-investigate a route Phase 2 already reopened.
 */
const RESOLVED_BY_PHASE2 = new Set(
  (replay.rows ?? [])
    .filter((row) => String(row.after?.resultCode ?? "").startsWith("packet_ready"))
    .map((row) => row.jurisdiction)
);

const heldByCode = new Map(held.rows.map((row) => [row.jurisdiction, row]));
const stateIssues = register.issues.filter((issue) => issue.scope === "state_specific");
const RELEASE_CRITICAL = new Set(["P0", "P1"]);

/** Phase 2 added these to the shared surface. A shard diff touching one fails. */
const PHASE2_SHARED_PATHS = [
  "src/lib/expungement-ai/canonical-facts.ts",
  "src/lib/expungement-ai/contact-fields.ts",
  "src/lib/expungement-ai/localization.ts",
  "src/lib/rcap-engine/waiting-rule-bindings.json",
  "src/lib/rcap-engine/profile-registry.ts",
  "data/expungement-ai/phase2/**",
  "scripts/expungement-ai/phase2/**",
  "data/expungement-ai/screening-parity-approved-deltas.json",
  "data/expungement-ai/fixtures/**"
];

const PHASE2_READING = [
  "docs/expungement-ai/phase2/implementation-report.md",
  "data/expungement-ai/phase2/correction-allowlist.json",
  "data/expungement-ai/phase2/held-jurisdiction-dispositions.json",
  "data/expungement-ai/phase2/corrected-pathway-proof.json",
  "data/expungement-ai/phase2/p2-p3-backlog.json",
  "src/lib/rcap-engine/waiting-rule-bindings.json"
];

const PHASE2_ACCEPTANCE = [
  "node scripts/expungement-ai/phase2/verify-expungement-fact-model.mjs",
  "node scripts/expungement-ai/phase2/verify-jurisdiction-slug-routes.mjs",
  "node scripts/expungement-ai/phase2/build-phase2-record.mjs",
  "node scripts/verify-expungement-plain-language-values.mjs",
  "node scripts/verify-rcap-md-pardon-pathway.mjs"
];

function heldNote(code) {
  const row = heldByCode.get(code);
  if (!row) return null;
  return `${code} — ${row.status}. ${row.why}`;
}

function issueSection(shardCodes) {
  const lines = [];
  for (const issue of stateIssues) {
    const mine = (issue.affectedJurisdictions ?? []).filter((code) => shardCodes.includes(code));
    if (mine.length === 0) continue;
    const critical = RELEASE_CRITICAL.has(issue.severity);
    lines.push(`- **${issue.issueId}** (${issue.severity}, \`${issue.category}\`)${critical ? " — RELEASE-CRITICAL" : " — not release-critical this phase"}`);
    lines.push(`  - ${issue.title}`);
    lines.push(`  - expected: ${issue.expected}`);
    lines.push(`  - your jurisdictions: \`${mine.join("`, `")}\``);
    lines.push(issue.legalReviewRequired
      ? "  - legal review required: **yes — record the question, do not implement it**"
      : "  - legal review required: no");
  }
  return lines.join("\n");
}

function promptFor(shard) {
  const number = String(shard.sessionNumber).padStart(2, "0");
  const codes = shard.jurisdictions.map((entry) => entry.jurisdiction);
  const heldMine = codes.map(heldNote).filter(Boolean);
  const shardFallbackRoutes = FALLBACK_ROUTE_KEYS.filter((key) => codes.includes(key.split(":")[0]));
  const recordedUnreachable = shard.jurisdictionsWithNoUiReachablePacketReady ?? [];
  const reopened = recordedUnreachable.filter((code) => RESOLVED_BY_PHASE2.has(code));
  const unreachable = recordedUnreachable.filter((code) => !RESOLVED_BY_PHASE2.has(code));
  const backlogIds = backlog.backlog.filter((entry) => entry.scope === "state_specific").map((entry) => entry.issueId);

  return `# EXPUNGEMENT.AI — PHASE 3 — SHARD-${shard.sessionNumber} (session ${number})

You are implementing release-critical state configuration corrections for exactly ${codes.length} jurisdictions. Keep thinking enabled. Use high effort.

Before the first tool call, state in one sentence that you will correct only the configuration of your assigned jurisdictions and will not touch shared code.

## Your jurisdictions

${shard.jurisdictions.map((entry) => `- ${entry.jurisdiction} ${entry.name}`).join("\n")}

No other jurisdiction is yours. If you find a defect in a jurisdiction outside this list, record it in your shard result file and leave the code alone.

## Base

\`\`\`text
PHASE2_PRODUCT_HEAD = ${PHASE2_PRODUCT_HEAD}
BASE_SHA            = ${head}
BRANCH              = claude/expai-phase3-shard-${shard.sessionNumber}
\`\`\`

\`PHASE2_PRODUCT_HEAD\` is the Phase 2 product base and the commit you build from. A later commit on this branch may publish these prompt files themselves; that publication commit is NOT the product base and you must not branch from it.

Create your branch from exactly \`${head}\`. That commit is the Phase 2 head: the shared fact model, the waiting-rule bindings, the canonical fact store and the contact-field split are already in it. Fetch origin with prune first. Require a clean tracked worktree and no merge or rebase in progress. Do not push to \`main\`. Do not deploy. Do not run a migration. Do not change a feature flag. Do not create a payment.

## Read before you change anything

Phase 2's record first — it tells you what already moved and what is deliberately still open:

\`\`\`text
${PHASE2_READING.join("\n")}
\`\`\`

Then the audit's reading of your states:

\`\`\`text
docs/expungement-ai/flow-audit/baseline-report.md
docs/expungement-ai/flow-audit/human-review-required.md
${codes.map((code) => `docs/expungement-ai/flow-audit/state-reports/${code}.md`).join("\n")}
data/expungement-ai/flow-audit/flow-manifest.json
data/expungement-ai/flow-audit/question-inventory.json
data/expungement-ai/flow-audit/issue-register.json
AGENTS.md
\`\`\`

## What you own

\`\`\`text
${[...new Set([...shard.allowedConfigurationPaths, `data/expungement-ai/flow-audit/shard-results/${shard.shardId}.json`])].join("\n")}
\`\`\`

## What you must not touch

The shared layer is Phase 2's. A diff touching one of these fails your shard regardless of how good the change is:

\`\`\`text
${[...new Set([...shard.prohibitedSharedPaths, ...PHASE2_SHARED_PATHS])].join("\n")}
\`\`\`

You may not remove a state-specific legal rule because it is inconvenient. You may not delete a question because the audit could not find its purpose. You may not change a packet family, a form mapping, a payment clamp or an \`operationallySellable\` value.

**Waiting periods.** The waiting rule a route resolves is now an explicit binding in \`src/lib/rcap-engine/waiting-rule-bindings.json\`, which is shared and not yours. If one of your routes needs a binding it does not have, record the route, the rule you believe applies and the source text in your shard result file. Do not author a waiting period, and do not add a binding.

## RELEASE RULE — the provisional waiting-rule fallback

Read this before you touch a route.

The waiting-rule binding table in \`src/lib/rcap-engine/waiting-rule-bindings.json\` is the authority **only where a binding exists**. It covers 43 of the 325 compiled pathways. The other 282 are still resolved by the pre-correction prose selector, which is retained verbatim in the evaluator and is **provisional**. It was kept because it is answer-dependent and removing it closed six jurisdictions that were open at the product base; it is not the design, it is the thing the design is replacing one reviewed binding at a time.

**${shardFallbackRoutes.length} of your assigned routes depend on that provisional fallback.** For every one of them you must return exactly one Phase 3 disposition:

| Disposition | Use it when |
| --- | --- |
| \`EXPLICIT_BINDING_PROPOSED\` | one waiting rule the jurisdiction's own compiled profile already publishes governs this route unconditionally, and you can name its rule id and quote its source text |
| \`EXPLICIT_CONDITIONAL_BINDING_PROPOSED\` | the rule that governs depends on a fact the participant already supplies, and you can name the rule ids, the field id and the exact answer values that select between them |
| \`LEGAL_OWNER_DECISION_REQUIRED\` | the repository does not contain enough to settle which rule governs, or the candidates conflict, and choosing one would be authoring legal content |
| \`HELD_FOR_CORRECTION\` | the route needs a correction outside this shard's scope before a binding is meaningful |

Rules, without exception:

- **Do not modify the shared evaluator or the shared fallback in a shard.** \`src/lib/rcap-engine/evaluator.ts\` and \`src/lib/rcap-engine/waiting-rule-bindings.json\` are prohibited paths above. You propose; the integration captain binds.
- **Do not guess a waiting rule.** A duration you cannot trace to a rule id already published by that jurisdiction's compiled profile is invented legal content. \`LEGAL_OWNER_DECISION_REQUIRED\` is always the correct answer over a guess.
- **No fallback-dependent route may be recommended ACTIVE without an explicit, repository-supported binding.** A route still resolving through the provisional selector is not release-ready, whatever terminal it currently returns. Recommending it ACTIVE is a shard failure.
- A proposal is evidence, not a change: rule id, quoted source text, the duration as the profile already states it, and — for a conditional proposal — the field id and answer values. Never a duration you wrote yourself.

Your ${shardFallbackRoutes.length} fallback-dependent routes:

\`\`\`text
${shardFallbackRoutes.map((key) => `${key}${NO_RULE_AT_BASE.has(key) ? "   [no candidate rule at base]" : ""}`).join("\n")}
\`\`\`

Record one disposition per route in your shard result file under \`waitingRuleDispositions\`, keyed by the route id exactly as spelled above.
${heldMine.length > 0 ? `
**Held jurisdictions in your shard.** These are held deliberately. Preserve their current behaviour exactly and record what you find instead of resolving it:

${heldMine.map((line) => `- ${line}`).join("\n")}
` : ""}
## Your expected scope

| Measure | Count |
| --- | --- |
| Jurisdictions | ${codes.length} |
| Flow rows | ${shard.expectedFlowCount} |
| Question nodes | ${shard.expectedQuestionCount} |
| Consumer screens | ${shard.expectedConsumerScreenCount} |
| Branch edges | ${shard.expectedBranchEdgeCount} |
| Unresolved legal-review items | ${shard.unresolvedLegalReviewItems} |
| Workload weight | ${shard.weight} (${shard.weightSharePercent}% of the programme) |

${shard.flowIds.length} flow IDs are yours, listed in full in \`data/expungement-ai/flow-audit/shard-assignment.json\` under \`shards[] where shardId == "${shard.shardId}"\`.

## Your work, in order

1. **Re-confirm the audit's reading at this base.** Phase 2 changed which facts the flow renders, so counts recorded against the Phase 1 base may have moved for a legitimate reason. Re-run the manifest generators with \`--check\` and reconcile any difference against \`data/expungement-ai/phase2/correction-allowlist.json\` before you treat it as a defect. A difference the allowlist does not explain is a finding: stop and say so.

2. **Resolve the reachability question for your jurisdictions that still cannot reach packet-ready from rendered screens.**${reopened.length > 0 ? `

   Already reopened by Phase 2, so do not re-investigate them: \`${reopened.join("`, `")}\`. Their intended route now returns a packet-ready terminal for the same participant the Phase 1B reconciliation used, and the proof is in \`data/expungement-ai/phase2/remedy-context-replay-after.json\`. Confirm that still holds at this base and record it.` : ""}${unreachable.length > 0 ? `

   Still yours: \`${unreachable.join("`, `")}\`.

   Phase 2 corrected the shared part of this: facts the evaluator consumed before the packet decision are now asked, and the waiting-rule lookup no longer fails silently. What is left in these states is legal, not structural. For each, decide from the compiled profile and its source references which is true: the missing fact is a genuine legal precondition that must be asked before a packet, or the route is not available to a self-help participant in that state. The first is a lifecycle classification correction in that state's compiled profile. The second changes what the product claims and must be escalated, not answered.` : `

   Nothing further is yours: every jurisdiction of yours the Phase 1 base recorded as unreachable has been reopened, or none was recorded. Confirm that at this base and record it.`}

3. **Work the release-critical state issues assigned to you.** P0 and P1 first; anything marked not release-critical is recorded in your shard result and left alone this phase.

${issueSection(codes)}

4. **Do not implement any global issue.** Every issue whose category begins \`GLOBAL_\` was Phase 2's. The ones Phase 2 did not build are in \`data/expungement-ai/phase2/p2-p3-backlog.json\` with the reason; add to that record rather than acting on it. State-specific findings still open across the programme: \`${backlogIds.join("`, `")}\`.

5. **Write one state sign-off packet per jurisdiction** at \`data/expungement-ai/flow-audit/shard-results/${shard.shardId}.json\`, recording for each jurisdiction: what you changed, what you deliberately did not change, which legal questions remain open, and the before-and-after terminal for every flow ID of yours whose outcome moved.

## Acceptance tests

Run all of these. Every one must pass before you push.

\`\`\`bash
${[...new Set([...shard.acceptanceTests, ...PHASE2_ACCEPTANCE])].join("\n")}
\`\`\`

Additionally:

\`\`\`bash
npm run lint
npm run typecheck
git diff --check
\`\`\`

\`node scripts/expungement-ai/phase2/build-phase2-record.mjs\` must report \`unexplainedDifferences: 0\`. If your change moves an evaluator output, it belongs in the correction allowlist — which is shared, so you propose the entry in your shard result and the integration captain adds it. An unexplained difference is a failure, not a finding.

And prove the negative that matters most — that you changed no shared code and no unassigned jurisdiction:

\`\`\`bash
git diff --name-only ${head}...HEAD
\`\`\`

Every path in that output must match one of your allowed configuration paths.

## Commit and push

Commit your configuration changes, your state reports, and your shard result file. Push \`claude/expai-phase3-shard-${shard.sessionNumber}\`. Do not merge. Do not deploy. Do not open a pull request unless the integration captain asks for one.

## Final response

\`\`\`text
PHASE 3 SHARD-${shard.sessionNumber} COMPLETE
PHASE2 PRODUCT HEAD:
BASE SHA:
HEAD:
JURISDICTIONS:
FLOWS CHANGED:
QUESTIONS CHANGED:
TERMINALS MOVED:
EVALUATOR OUTPUT DIFFERENCES PROPOSED FOR THE ALLOWLIST:
FALLBACK-DEPENDENT ROUTES ASSIGNED:            ${shardFallbackRoutes.length}
FALLBACK ROUTES DISPOSITIONED:
  EXPLICIT_BINDING_PROPOSED:
  EXPLICIT_CONDITIONAL_BINDING_PROPOSED:
  LEGAL_OWNER_DECISION_REQUIRED:
  HELD_FOR_CORRECTION:
FALLBACK ROUTES RECOMMENDED ACTIVE:
LEGAL QUESTIONS STILL OPEN:
HELD JURISDICTIONS TOUCHED:
SHARED PATHS TOUCHED:
UNASSIGNED JURISDICTIONS TOUCHED:
ACCEPTANCE TESTS:
EXACT BLOCKERS:
\`\`\`

\`SHARED PATHS TOUCHED\`, \`HELD JURISDICTIONS TOUCHED\` and \`UNASSIGNED JURISDICTIONS TOUCHED\` must all read \`none\`.

\`FALLBACK ROUTES RECOMMENDED ACTIVE\` must read \`none\`. The four disposition counts must sum to \`FALLBACK-DEPENDENT ROUTES ASSIGNED\`; a route left undispositioned fails the shard.
`;
}

const outDir = "docs/expungement-ai/phase2/shard-prompts";
fs.mkdirSync(outDir, { recursive: true });
const assigned = new Set();
for (const shard of assignment.shards) {
  const number = String(shard.sessionNumber).padStart(2, "0");
  const target = path.join(outDir, `session-${number}.md`);
  fs.writeFileSync(target, promptFor(shard));
  for (const entry of shard.jurisdictions) {
    if (assigned.has(entry.jurisdiction)) throw new Error(`${entry.jurisdiction} is assigned to more than one shard`);
    assigned.add(entry.jurisdiction);
  }
  console.log(`wrote ${target} (${shard.jurisdictions.length} jurisdictions)`);
}
if (assigned.size !== 51) throw new Error(`shards cover ${assigned.size} jurisdictions, not 51`);
console.log(`6 disjoint shards cover all ${assigned.size} jurisdictions at ${head}`);
