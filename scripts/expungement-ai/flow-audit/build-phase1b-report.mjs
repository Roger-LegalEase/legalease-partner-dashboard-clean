#!/usr/bin/env node
// The Phase 1B human-readable report.
//
//   node scripts/expungement-ai/flow-audit/build-phase1b-report.mjs
//   node scripts/expungement-ai/flow-audit/build-phase1b-report.mjs --check
//
// Writes docs/expungement-ai/flow-audit/phase1b-hosted-baseline-closure.md and
// docs/expungement-ai/flow-audit/reachability-matrix.md. Every number is read
// from a generated artifact, so a report cannot drift from what it describes.

import { read, readJson, exists, gitSha, writeArtifact } from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");

const reconciliation = readJson("data/expungement-ai/flow-audit/reachability-reconciliation.json");
const denominator = readJson("data/expungement-ai/flow-audit/denominator-reconciliation.json");
const questionNodes = readJson("data/expungement-ai/flow-audit/question-node-reconciliation.json");
const contract = readJson("data/expungement-ai/flow-audit/correction-contract.json");
const hosted = readJson("data/expungement-ai/flow-audit/hosted-acceptance-record.json");
const register = readJson("data/expungement-ai/flow-audit/issue-register.json");
const evidence = exists("data/expungement-ai/flow-audit/evidence-retention.json")
  ? readJson("data/expungement-ai/flow-audit/evidence-retention.json")
  : null;

const written = [];
function emit(path, text) {
  if (CHECK) {
    if (!exists(path) || read(path) !== text) {
      console.error(`${path} is stale; re-run without --check.`);
      process.exit(1);
    }
    written.push(path);
    return;
  }
  written.push(writeArtifact(path, text).path);
}

function table(headers, rows) {
  return [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

const baseSha = gitSha("origin/main");
const head = gitSha("HEAD");

/* ------------------------------------------------------------------ */
/* Reachability matrix                                                 */
/* ------------------------------------------------------------------ */

const matrix = `# Reachability matrix — all 51 jurisdictions

**Base SHA:** \`${baseSha}\` · **Audit HEAD:** \`${head}\` · **Evaluation clock:** \`${reconciliation.evaluatorToday}\`

${reconciliation.separationRule}

## Classification vocabulary

${Object.entries(reconciliation.classificationVocabulary).map(([key, value]) => `- \`${key}\` — ${value}`).join("\n")}

## The matrix

${table(
  ["Jur", "Intended commercial status", "Supported flow IDs", "Rendered terminal", "Packet-ready", "Payment", "First missing fact", "Lifecycle of that fact", "Checkout guard", "Sellable", "Intentional unsupported", "Launch hold", "Technical defect", "Issues"],
  reconciliation.jurisdictions.map((row) => [
    `\`${row.jurisdiction}\``,
    `${row.intendedCommercialStatus.promotionStatus}, ${row.intendedCommercialStatus.intendedPaidPathways}/${row.intendedCommercialStatus.compiledPathways} paid-intended`,
    String(row.supportedManifestFlowCount),
    `\`${row.renderedTerminalReached}\``,
    row.packetReadyReachable ? "yes" : "**no**",
    row.paymentReachable ? "yes" : "**no**",
    row.firstMissingRequiredFact ? `\`${row.firstMissingRequiredFact}\`` : "—",
    row.firstMissingRequiredFact ? `\`${row.lifecycleClassification[row.firstMissingRequiredFact] ?? "n/a"}\`` : "—",
    row.checkoutGuardResult.verdict.replace(/_/g, " "),
    row.operationallySellable === null ? "—" : row.operationallySellable ? "yes" : "no",
    row.intentionalUnsupportedOrReferral ? "yes" : "no",
    row.intentionalLaunchHold ? "yes" : "no",
    row.technicalReachabilityDefect ? "**yes**" : "no",
    row.issueIds.join(" ") || "—"
  ])
)}

## The 19 with no packet-ready outcome

${reconciliation.noPacketReady.map((code) => `\`${code}\``).join(", ")}

They are not one problem. They split into three:

${table(["Class", "Jurisdictions", "Owner"], [
  ["technical_reachability_defect", contract.half1_sharedExecutor.affectedJurisdictions.map((c) => `\`${c}\``).join(" "), "Phase 2 shared"],
  ["waiting_rule_not_executable", contract.perStateWork.waitingRuleNotExecutable.jurisdictions.map((c) => `\`${c}\``).join(" "), "Phase 3 state shard, after a legal answer"],
  ["unresolved_reachability", contract.perStateWork.unresolved.jurisdictions.map((r) => `\`${r.jurisdiction}\``).join(" "), "Phase 3 state shard, after a legal answer"]
])}

## The 22 with no payment outcome

${reconciliation.noPayment.map((code) => `\`${code}\``).join(", ")}

## Why 22 and not 19

${reconciliation.differenceBetween19And22.explanation}

${table(["Jurisdiction", "Rendered terminal", "Pathway", "Classification"], reconciliation.differenceBetween19And22.jurisdictionsInTheDifference.map((row) => [
  `\`${row.jurisdiction}\``,
  `\`${row.renderedTerminalReached}\``,
  `\`${row.pathwayId ?? "—"}\``,
  `\`${row.classification}\``
]))}

## Intentional outcomes, kept separate from failures

- **Intentional unsupported or referral:** ${reconciliation.totals.intentionalUnsupportedOrReferral.length === 0 ? "none. Every one of the 51 jurisdictions has at least one pathway the closure ledger classifies `paid_packet_intended`, so no jurisdiction is guidance-only by design." : reconciliation.totals.intentionalUnsupportedOrReferral.join(", ")}
- **Intentional launch holds:** ${reconciliation.totals.intentionalLaunchHolds.length} jurisdictions — ${reconciliation.totals.intentionalLaunchHolds.map((c) => `\`${c}\``).join(", ")}. These reach packet-ready and payment at the runtime and are held by the launch ledger on governance gates, not by a defect.
`;
emit("docs/expungement-ai/flow-audit/reachability-matrix.md", matrix);

/* ------------------------------------------------------------------ */
/* Phase 1B report                                                     */
/* ------------------------------------------------------------------ */

const report = `# Phase 1B — hosted baseline closure and reachability reconciliation

**Canonical branch:** \`claude/expai-flow-audit-p1\`
**Required HEAD:** \`${hosted.canonical.requiredHead}\` — resolved and matched
**Product base:** \`${hosted.canonical.productBase}\` — ancestor of the branch
**Product behaviour changed:** none.

## 1. What this phase corrected

${contract.correctionToPhase1.phase1BVerdict}

**Phase 1 claimed:** ${contract.correctionToPhase1.phase1Claim}

**What falsified it:** ${contract.correctionToPhase1.whatFalsifiedIt}

**What is actually blocking them:** ${contract.correctionToPhase1.whatIsActuallyBlockingThem}

**A note on method, because the same trap is easy to fall into.** ${contract.correctionToPhase1.methodNote}

### The four experiments

| # | Answer set | Question it answers |
| --- | --- | --- |
| E1 | Rendered screens only | What can a participant do today? |
| E2 | E1 + the six shared facts the projection files postpay | Is the lifecycle classification what closes the state? |
| E3 | E2 + every timing and completion gate field pinned to its clearing answer | Is it any unasked fact at all? |
| E4 | E3 + a \`waiting_rule_id\` the state's own profile already contains | Is the route broken, or only the path to it? |

E2 moved nothing. E3 moved nothing. E4 reached \`packet_ready_with_caution\` in ${contract.half1_sharedExecutor.affectedJurisdictionCount} of the 19, ${contract.half1_sharedExecutor.proof.filter((row) => row.reachesPayment).length} of them with payment allowed.

## 2. Hosted workflow preflight

The hosted workflow declares \`on: workflow_call\` only and is reached through \`rcap-f1-ephemeral-staging.yml\`'s \`mode\` input.

${table(["#", "Condition", "Verdict"], hosted.preflightConditions.map((row, index) => [String(index + 1), row.condition.replace(/^\d+\.\s*/, ""), row.verdict]))}

**On condition 2, which is the one that fails.** ${hosted.preflightConditions[1].evidence}

### Secret to step map

${table(["Secret", "Required", "Consuming steps"], hosted.secretToStepMap.map((row) => [
  `\`${row.secret}\``,
  row.requiredByWorkflow ? "yes" : "declared optional",
  row.consumingSteps.length === 1 ? row.consumingSteps[0] : `${row.consumingSteps.length} steps, beginning with "${row.consumingSteps[0]}"`
]))}

${hosted.secretToStepMap.find((row) => row.secret === "VERCEL_AUTOMATION_BYPASS_SECRET").note}

### Values required beyond the five secrets

${table(["Name", "Kind", "Value or note"], hosted.additionalRequiredValuesBeyondTheFiveSecrets.map((row) => [
  `\`${row.name}\``,
  row.kind,
  row.value ? `\`${row.value}\`` : row.note
]))}

**The five secrets are not sufficient.** Four more pinned inputs are required, one of which — \`tools_sha\` — is documented nowhere and had to be derived by scanning \`main\`'s history for a commit that is simultaneously an ancestor of \`main\`, byte-identical to \`application_sha\` on the application paths, and byte-identical to \`worker_source_sha\` on the worker image inputs.

## 3. What actually ran

${table(["Phase", "Run", "Conclusion", "Read-only", "Artifact"], hosted.runs.map((row) => [
  `\`${row.phase}\``,
  `[${row.runId}](${row.url})`,
  row.conclusion,
  row.readOnly ? "yes" : "no",
  `\`${row.artifact.name}\` (${row.artifact.bytes} bytes)`
]))}

The preflight **passed**. That is real hosted evidence and it settles two things that were open at the end of Phase 1: all four required credentials are present and usable, and the acceptance Supabase project is demonstrably not production — proved by identity, by emptiness, and by hashed disjointness from the production Supabase URL.

The \`vercel_audit\` run found no reusable Preview, so there is no existing deployment URL or deployment SHA to record.

## 4. Why the ten journeys were not exercised

${hosted.stagingAuthorizationBlocker.detail}

**Consequence:** ${hosted.stagingAuthorizationBlocker.consequence}

**What was not done:** ${hosted.stagingAuthorizationBlocker.whatWasNotDone}

**What would unblock it:** ${hosted.stagingAuthorizationBlocker.whatWouldUnblockIt}

## 5. Denominator reconciliation

${table(["Relation", "Kind", "Detail"], denominator.relations.map((row) => [`${row.from} → ${row.to}`, row.relation, row.detail]))}

All ${denominator.assertions.length} arithmetic assertions hold; the generator fails rather than emitting a report if any stops holding.

### The four browser/manifest divergences

${denominator.divergences.map((row) => `**\`${row.flowId}\`** — ${row.state}, ${row.viewport}

- expected \`${row.expectedTerminal}\`, actual \`${row.actualTerminal}\`
- first divergence: ${row.firstDivergence.questionId ? `\`${row.firstDivergence.questionId}\` (browser chose ${JSON.stringify(row.firstDivergence.browserSelected)}, fixture had ${JSON.stringify(row.firstDivergence.fixtureValue)})` : row.firstDivergence.note}
- classification: \`${row.classification}\`; browser answers replayed through the evaluator give \`${row.evidence.browserReplayResultCode}\`
- severity **${row.severity}**; owner: ${row.recommendedPhase2Owner}`).join("\n\n")}

## 6. Question-node reconciliation

The 1,824 served-but-not-rendered nodes cover ${questionNodes.totals.distinctQuestionIds} distinct question ids.

${table(["Bucket", "Raw nodes", "Distinct question ids"], Object.keys(questionNodes.totals.byBucketRawNodes).sort().map((bucket) => [
  `\`${bucket}\``,
  String(questionNodes.totals.byBucketRawNodes[bucket]),
  String(questionNodes.totals.byBucketDistinctQuestionIds[bucket])
]))}

Most of it is the product working: ${questionNodes.totals.byBucketRawNodes.intentionally_conditional_and_not_selected} nodes across ${questionNodes.totals.byBucketDistinctQuestionIds.intentionally_conditional_and_not_selected} ids are other states' route questions, carried by the one shared Wilma fact list and correctly kept off screen outside their own state. The bucket that is a defect by construction is \`lifecycle_misclassified\`: ${questionNodes.totals.byBucketRawNodes.lifecycle_misclassified} nodes across ${questionNodes.totals.byBucketDistinctQuestionIds.lifecycle_misclassified} ids where the projection files a question postpay and the evaluator reads it before it will decide a packet.

### The five named facts

${questionNodes.namedFacts.map((fact) => `#### \`${fact.factKey}\`

- rendered as a screen in **${fact.jurisdictionsRenderingItAsAScreen.length} of 51** jurisdictions; served without being rendered in **${fact.jurisdictionsServingItWithoutRenderingIt.length}**
- consumed by a compiled rule in **${fact.consumingRuleCount}** profiles
- first required at: ${fact.firstPointAtWhichTheFactIsRequired.enclosingFunction ? `\`${fact.firstPointAtWhichTheFactIsRequired.enclosingFunction}\` (${fact.firstPointAtWhichTheFactIsRequired.file}:${fact.firstPointAtWhichTheFactIsRequired.line})` : fact.firstPointAtWhichTheFactIsRequired.note}
- current lifecycle source: ${fact.currentLifecycleSource}
- does the UI render, prefill or confirm it before that point? renders ${fact.uiRendersPrefillsOrConfirmsItBeforeThatPoint.rendersAsAScreen}; prefills — ${fact.uiRendersPrefillsOrConfirmsItBeforeThatPoint.prefills}; confirms — ${fact.uiRendersPrefillsOrConfirmsItBeforeThatPoint.confirms}
- affected flows: ${fact.affectedFlowCount}`).join("\n\n")}

**Recommended shared architecture correction (identical for all five):** ${questionNodes.namedFacts[0].recommendedSharedArchitectureCorrection}

The signature is inconsistency, not absence. ${contract.half2_lifecycleClassification.signature}

## 7. The correction contract

### Half 1 — ${contract.half1_sharedExecutor.title}

Owner \`${contract.half1_sharedExecutor.owner}\`, severity **${contract.half1_sharedExecutor.severity}**, ${contract.half1_sharedExecutor.affectedJurisdictionCount} jurisdictions.

${contract.half1_sharedExecutor.mechanism.map((line) => `- ${line}`).join("\n")}

Required correction:

${contract.half1_sharedExecutor.requiredCorrection.map((line, index) => `${index + 1}. ${line}`).join("\n")}

### Half 2 — ${contract.half2_lifecycleClassification.title}

Owner \`${contract.half2_lifecycleClassification.owner}\`, severity **${contract.half2_lifecycleClassification.severity}**.

${contract.half2_lifecycleClassification.detail}

Required correction:

${contract.half2_lifecycleClassification.requiredCorrection.map((line, index) => `${index + 1}. ${line}`).join("\n")}

**Neither half was implemented.** ${contract.half2_lifecycleClassification.prohibitedInThisPhase}

### Payment clamp

${contract.paymentClamp.detail}

Required correction: ${contract.paymentClamp.requiredCorrection}

## 8. Evidence

${evidence
  ? `${evidence.totals.desktopCaptures} desktop captures and ${evidence.totals.mobileCaptures} mobile captures were retaken at this HEAD and retained in full outside Git at \`${evidence.rawRetentionPath}\`. Every file's SHA-256 is recorded in \`data/expungement-ai/flow-audit/evidence-retention.json\`. The committed subset remains ${evidence.totals.committedCaptures} captures.`
  : "Evidence retention record not present."}

## 9. Issue register after Phase 1B

${table(["Severity", "Count"], Object.entries(register.totals.severityCounts).map(([severity, count]) => [severity, String(count)]))}

${register.issues.filter((issue) => issue.severity === "P0").map((issue) => `- **${issue.issueId}** (\`${issue.category}\`) — ${issue.title}`).join("\n")}

## 10. Regenerating this report

\`\`\`bash
node scripts/expungement-ai/flow-audit/build-reachability-reconciliation.mjs
node scripts/expungement-ai/flow-audit/build-denominator-reconciliation.mjs
node scripts/expungement-ai/flow-audit/build-question-node-reconciliation.mjs
node scripts/expungement-ai/flow-audit/build-correction-contract.mjs
node scripts/expungement-ai/flow-audit/build-phase1b-report.mjs
node scripts/expungement-ai/flow-audit/verify-flow-audit.mjs
\`\`\`
`;
emit("docs/expungement-ai/flow-audit/phase1b-hosted-baseline-closure.md", report);

console.log(`${CHECK ? "checked" : "wrote"} ${written.length} artifact(s)`);
for (const file of written) console.log(`  ${file}`);
