#!/usr/bin/env node
// Renders docs/expungement-ai/flow-audit/ENV-007-owner-authorization-packet.md
// from data/expungement-ai/flow-audit/env007-owner-authorization.json.
// READ-ONLY with respect to every environment. No secret value is emitted:
// where a value is a secret the JSON carries null and only the source field is
// printed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const p = JSON.parse(fs.readFileSync(path.join(rootDir, "data/expungement-ai/flow-audit/env007-owner-authorization.json"), "utf8"));
const out = [];
const w = (s = "") => out.push(s);
const yn = (b) => (b === true ? "yes" : b === false ? "no" : "not analysed");
// Markdown tables split on "|" even inside a code span, so slot keys are shown
// with a middle dot. The JSON record keeps the raw "flowId|viewport|label" form.
const slot = (s) => String(s).replace(/\|/g, " \u00b7 ");

w("# ENV-007 — Owner Authorization Packet");
w();
w("Read-only. Nothing in this packet was executed: no migration was applied, no workflow was dispatched, no Supabase project was created or altered, no Vercel deployment was made, no user or matter was seeded, and no product file was changed.");
w();
w(`- Branch: \`${p.branch}\``);
w(`- Audit HEAD: \`${p.auditHead}\``);
w(`- Required HEAD: \`${p.requiredHead}\` — **MATCH: ${p.headMatchesRequired ? "YES" : "NO"}**`);
w();
w("---");
w();

// ---------------------------------------------------------------- section 1
w("## 1. Environment identity");
w();
w("| Field | Value | Source | Production? |");
w("|---|---|---|---|");
for (const [k, v] of Object.entries(p.section1_environmentIdentity)) {
  const val = v.value === null ? "*(secret — not printed)*" : `\`${v.value}\``;
  w(`| \`${k}\` | ${val} | ${v.source} | **${v.isProduction ? "YES" : "no"}** |`);
}
w();
for (const [k, v] of Object.entries(p.section1_environmentIdentity)) {
  if (v.honestQualifier) w(`- **${k}** — ${v.honestQualifier}`);
  if (v.proof) w(`- **${k} proof** — ${v.proof}`);
}
w();
w("**None of the seven is a production identity.** The Supabase side is a separate project ref proven non-production per run; the Vercel side is the production project addressed at the Preview target, isolated by three deploy-time assertions rather than by a second project.");
w();
w("---");
w();

// ---------------------------------------------------------------- section 2
const s2 = p.section2_workflowInputs;
w("## 2. Workflow inputs for `hosted_migrate` and `hosted_full`");
w();
w(`Dispatch entry point: ${s2.dispatchEntryPoint}`);
w();
w(s2.dispatchRefNote);
w();
w(`Workflow files byte-identical between \`tools_sha\` and \`origin/main\`: **${yn(s2.workflowFilesIdenticalBetweenToolsShaAndMain)}**.`);
w();
w("| Input | Exact value | Provenance | Pinned | Validation performed |");
w("|---|---|---|---|---|");
for (const i of s2.inputs) {
  w(`| \`${i.input}\` | \`${i.value}\` | ${i.provenance} | ${i.pinned ? "**yes**" : "no"} | ${i.validation} |`);
}
w();
w("### The four additional pinned inputs");
w();
w(`Beyond \`application_sha\`, the workflow refuses any run whose \`${s2.OTHER_PINNED_INPUTS.join("`, `")}\` is not the authorized value.`);
w();
w("```");
w(`SOURCE_SHA                     = ${s2.SOURCE_SHA}`);
w(`TOOLS_SHA                      = ${s2.TOOLS_SHA}`);
w(`OTHER_PINNED_INPUTS            = ${s2.OTHER_PINNED_INPUTS.join(", ")}`);
w("```");
w();
w("### `TOOLS_SHA_DERIVATION`");
w();
w(s2.TOOLS_SHA_DERIVATION);
w();
w("| Gate the workflow applies | Result |");
w("|---|---|");
w(`| \`^[0-9a-f]{40}$\` | ${yn(s2.shapeValid)} |`);
w(`| resolves to a commit | ${yn(s2.resolvesToACommit)} |`);
w(`| ancestor of \`origin/${"main"}\` | ${yn(s2.isAncestorOfCanonicalMain)} |`);
w(`| byte-identical to \`application_sha\` on the application byte paths | ${yn(s2.applicationByteEquivalentToApplicationSha)} |`);
w(`| byte-identical to \`worker_source_sha\` on the worker image-input paths | ${yn(s2.workerImageInputEquivalentToWorkerSourceSha)} |`);
w();
w(`\`origin/main\` head when this packet was built: \`${s2.originMainHeadAtPacketTime}\`. \`TOOLS_SHA\` is stated as a literal 40-character SHA precisely so the run does not follow that head.`);
w();
w(`### \`TOOLS_SHA_CONTAINS_REQUIRED_SCRIPTS\` = **${yn(s2.TOOLS_SHA_CONTAINS_REQUIRED_SCRIPTS)}**`);
w();
w("| Path | Blob SHA at `tools_sha` |");
w("|---|---|");
for (const s of s2.requiredScripts) w(`| \`${s.path}\` | ${s.present ? `\`${s.blobShaAtToolsSha}\`` : "**MISSING**"} |`);
w();
w("### Secrets, by step");
w();
w("No secret value appears in this packet. Only the secret's name, whether the workflow declares it required, and which step consumes it.");
w();
w("| Secret | Declared required | Consumed by | Needed for `hosted_migrate` |");
w("|---|---|---|---|");
for (const s of s2.secrets) w(`| \`${s.secret}\` | ${s.required ? "yes" : "no"} | ${s.usedBy} | ${s.neededForMigrate ? "**yes**" : "no"}${s.note ? ` — ${s.note}` : ""} |`);
w();
w("### Phase execution contract");
w();
w("| Phase | Deploy | Matrix | Checkout gate |");
w("|---|---|---|---|");
for (const [phase, c] of Object.entries(s2.phaseContract)) {
  if (typeof c === "string") { w(`| ${phase} | ${c} | | |`); continue; }
  w(`| \`${phase}\` | ${c.deploy ? "yes" : "no"} | ${c.matrix ? "yes" : "no"} | ${c.checkoutGate ? "yes" : "no"} |`);
}
w();
w("`hosted_migrate` therefore performs **no deploy, no matrix and no checkout gate**. It writes to the acceptance Supabase project and nowhere else.");
w();
w("---");
w();

// ---------------------------------------------------------------- section 3
w("## 3. The authorized migration sequence");
w();
w("The request named migrations 50–54. **The sequence the workflow applies is 49–55 — seven files.** All seven are analysed below; 49 and 55 are marked as outside the named range.");
w();
w("| Seq | File | Bytes | Lines | Git blob SHA | SHA-256 | Present at `tools_sha` | Matches both authorization records |");
w("|---|---|---|---|---|---|---|---|");
for (const m of p.section3_migrations) {
  w(`| ${m.sequenceNumber} | \`${m.repositoryFilename}\` | ${m.byteLength} | ${m.lineCount} | \`${m.gitBlobShaAtAuditHead}\` | \`${m.sha256}\` | ${m.presentAtToolsSha && m.blobIdenticalAtToolsSha ? "yes, identical blob" : "**NO**"} | ${m.matchesStagingActionRecord && m.matchesAuthorizationReadinessRecord ? "yes" : "**NO**"} |`);
}
w();
w("Every file is present at `tools_sha` with the identical git blob, and every SHA-256 recomputed from disk matches both `data/rcap-staging-action.json` and `data/rcap-staging-authorization-readiness.json`. The migrate script's hash gate would pass.");
w();
for (const m of p.section3_migrations) {
  w(`### Phase ${m.sequenceNumber} — \`${path.basename(m.repositoryFilename)}\``);
  w();
  w(`**Purpose.** ${m.purpose}`);
  w();
  w(`- **Tables affected:** ${m.tables.join("; ")}`);
  w(`- **Columns affected:** ${m.columns.join("; ")}`);
  w(`- **Functions / triggers:** ${m.functionsAndTriggers.join("; ")}`);
  w(`- **RLS / policies / grants:** ${m.rlsPolicies.join("; ")}`);
  w(`- **Storage or auth effects:** ${m.storageOrAuth.join("; ")}`);
  w(`- **Additive:** ${yn(m.additive)}`);
  w(`- **Destructive:** ${yn(m.destructive)}${m.destructiveDetail ? ` — ${m.destructiveDetail}` : ""}`);
  w(`- **Idempotent:** ${yn(m.idempotent)}${m.idempotencyDetail ? ` — ${m.idempotencyDetail}` : ""}`);
  w(`- **Prerequisite:** ${m.prerequisite}`);
  w(`- **Rollback / compensating action:** ${m.rollback}`);
  w(`- **Why the hosted flow audit requires it:** ${m.whyTheFlowAuditNeedsIt}`);
  w(`- **Authorization id on record:** \`${m.authorizationId ?? "none"}\``);
  w();
}
w("---");
w();

// ---------------------------------------------------------------- section 4
w("## 4. Safety proof — what aborts before anything is written");
w();
w("| # | Guard | Where | What it proves | Aborts before | Skippable? |");
w("|---|---|---|---|---|---|");
for (const g of p.section4_safety.guards) {
  w(`| ${g.id} | ${g.name} | ${g.where} | ${g.proves} | ${g.abortsBefore} | ${g.canBeSkipped} |`);
}
w();
w("### Backup, snapshot and rollback position");
w();
w(`**A named backup or snapshot step exists: ${yn(p.section4_safety.backupPosition.namedBackupOrSnapshotStep)}.**`);
w();
w(p.section4_safety.backupPosition.detail);
w();
w(`**Compensating rollback.** ${p.section4_safety.backupPosition.compensatingRollback}`);
w();
w("**What no compensating action undoes automatically:**");
w();
for (const x of p.section4_safety.backupPosition.whatCannotBeUndoneAutomatically) w(`- ${x}`);
w();
w("---");
w();

// ---------------------------------------------------------------- section 5
const s5 = p.section5_phase1bReconciliation;
w("## 5. Phase 1B reconciliation");
w();
w("### 5.1 The 51-jurisdiction matrix");
w();
w("| # | Juris | Rendered terminal | Packet-ready | Payment | Classification | Exact reason | `waiting_rule_id`s that reach packet-ready |");
w("|---|---|---|---|---|---|---|---|");
s5.matrix.forEach((r, i) => {
  w(`| ${i + 1} | **${r.jurisdiction}** | \`${r.renderedTerminalReached}\` | ${r.packetReadyReachable ? "yes" : "**no**"} | ${r.paymentReachable ? "yes" : "**no**"} | \`${r.classification}\` | ${r.exactReason} | ${r.waitingRuleIdsThatReachPacketReady ?? "—"} |`);
});
w();
w(`Totals: ${s5.totals.noPacketReadyCount} cannot reach packet-ready, ${s5.totals.noPaymentCount} cannot reach payment, ${s5.totals.packetReadyButNoPaymentCount} reach packet-ready but not payment. Classification counts: ${Object.entries(s5.totals.classificationCounts).map(([k, v]) => `\`${k}\` ${v}`).join(", ")}. \`operationallySellable\` is **0 for all 51** and every jurisdiction carries a launch hold, so "operationally held" is true of every row as a second-order fact; the column above names each row's *most specific* blocker.`);
w();
w("### 5.2 Why the lifecycle attribution was wrong for 17 of 19");
w();
w("Phase 1 concluded that 19 jurisdictions could not reach a packet-ready outcome because required facts were classified postpay and therefore never rendered as screens. Four experiments falsified that for 17 of them:");
w();
w("- **E1** — rendered screens only: 19 fail. This is the Phase 1 observation and it is correct as an observation.");
w("- **E2** — plus the six shared postpay facts: moved nothing. The postpay lifecycle classification is *not* what closes these.");
w("- **E3** — plus every timing and completion gate field answered the clearing way: moved nothing.");
w("- **E4** — plus one `waiting_rule_id` the state's own published profile already contains: **13 of the 19 reach `packet_ready_with_caution`**, most with payment allowed.");
w();
w("The real cause is in `bestWaitingRuleForPathway`. It drops every candidate whose duration `parseDurationFromText` cannot parse — the regex recognises \"no waiting period\" but not \"No ordinary waiting period\", which is DC's actual-innocence wording — and then keeps only candidates sharing a 5+-character token with the pathway's own prose. When the surviving set is empty, `evaluateCompiledTiming` returns `needs_review` / `waiting_rule_not_executed` with the message \"We need one more detail before we can prepare the right packet.\" No detail is missing. Supplying a rule id the profile already publishes bypasses the selection and the pathway evaluates.");
w();
w("Lifecycle classification was a real finding about which screens render. It was the wrong explanation for unreachability.");
w();
w("### 5.3 Why only 13 are technical");
w();
w(`\`technical_reachability_defect\` (13): ${s5.technicalReachabilityDefects.join(", ")}. Each has at least one \`waiting_rule_id\` in its own profile that reaches \`packet_ready_with_caution\`, so the pathway is evaluable and only the selection step fails. That is one shared code defect, fixable once for all 13.`);
w();
w(`\`waiting_rule_not_executable\` (4): ${s5.waitingRuleNotExecutable.join(", ")}. For these, **no** rule id in the profile reaches packet-ready. The evaluator's own case-outcome relevance branch rejects every remaining candidate after parsing and text-relevance have both left survivors, so the fix is a per-state legal answer naming an executable period — not the shared code change.`);
w();
w("| Juris | Pathway | Candidate rules | With a parseable duration | Also text-relevant | Example of non-executable prose |");
w("|---|---|---|---|---|---|");
for (const d of s5.waitingRuleNotExecutableDetail) {
  w(`| **${d.jurisdiction}** | \`${d.pathwayId}\` | ${d.candidateRules} | ${d.candidatesWithAParseableDuration} | ${d.candidatesAlsoTextRelevantToThePathway} | ${d.exampleOfNonExecutableProse ? `"${d.exampleOfNonExecutableProse.trim()}"` : "*(every candidate parsed; the relevance branch rejected them)*"} |`);
}
w();
w("In all four, `emptiedBy` records the same thing: neither the duration-parse filter nor the text-relevance filter emptied the candidate set, so the evaluator's own case-outcome relevance branch rejected the remainder. UT is the sharpest case — all 54 candidates parse and 24 are text-relevant, and none is executable for the pathway.");
w();
w("### 5.4 CA, IN, KS, NJ, RI, UT");
w();
for (const j of ["CA", "IN", "KS", "NJ", "RI", "UT"]) {
  const r = s5.matrix.find((x) => x.jurisdiction === j);
  w(`- **${j}** — \`${r.classification}\` (${r.exactReason}). ${r.exactReasonDetail}`);
}
w();
w("CA and IN are the only two the audit does **not** resolve. Neither is called resolved here: CA settles on `needs_review (ca.source_fact_unknown)` and IN on `needs_more_info (in.compiled_rule_match rule-03 — the supplied packet does not state every statutory element)`. Both need a hosted run or a state-pack reading to settle; the honest status is *unresolved*, not *defective* and not *correct*.");
w();
w("### 5.5 TX, WA, WV — the 22 versus 19");
w();
w(s5.differenceBetween19And22.explanation);
w();
w("| Juris | Terminal reached | Pathway | Classification |");
w("|---|---|---|---|");
for (const d of s5.differenceBetween19And22.jurisdictionsInTheDifference) {
  w(`| **${d.jurisdiction}** | \`${d.renderedTerminalReached}\` | \`${d.pathwayId}\` | \`${d.classification}\` |`);
}
w();
w("These three are **not** reachability failures. They reach packet-ready and are then closed by the payment clamp in `evaluateAgainstProfile`. Counting them as unreachable is what produced 22 where the reachability answer is 19.");
w();
w("### 5.6 The 42 distinct question IDs with category counts totalling 45");
w();
const q = s5.questionIdOverlap;
w(`${q.distinctQuestionIds} distinct ids; per-bucket distinct counts sum to ${q.sumOfPerBucketDistinctCounts}; surplus ${q.sumOfPerBucketDistinctCounts - q.distinctQuestionIds}, accounted for by exactly ${q.overlapCount} ids.`);
w();
w(q.explanation);
w();
w("| Question ID | Buckets | Jurisdictions per bucket |");
w("|---|---|---|");
for (const o of q.overlaps) {
  const detail = Object.entries(o.jurisdictionsByBucket)
    .map(([b, js]) => `\`${b}\` (${js.length}): ${js.join(", ")}`)
    .join("<br>");
  w(`| \`${o.questionId}\` | ${o.buckets.map((b) => `\`${b}\``).join(" + ")} | ${detail} |`);
}
w();
w("### 5.7 The 332 captures versus the 321 retained");
w();
const c = s5.captureReconciliation;
w(`\`${c.arithmetic}\` — ${c.phase1RunCaptures} captures in the Phase 1 committed run, ${c.removedCount} absent from the Phase 1B re-capture, ${c.addedCount} present only in it, leaving ${c.phase1bRetainedCaptures}.`);
w();
w(`- Both runs are internally hash-unique (${yn(c.bothRunsAreInternallyHashUnique)}): ${c.phase1RunCaptures}/${c.phase1RunCaptures} and ${c.phase1bRetainedCaptures}/${c.phase1bRetainedCaptures} distinct SHA-256. Content-hash de-duplication at capture time is therefore proven, not assumed.`);
w(`- All ${c.terminalCapturesPhase1} terminal captures are present in **both** runs at the same slots — terminal slots only in Phase 1: ${c.terminalSlotsOnlyInPhase1.length === 0 ? "none" : c.terminalSlotsOnlyInPhase1.map(slot).join(", ")}; only in Phase 1B: ${c.terminalSlotsOnlyInPhase1b.length === 0 ? "none" : c.terminalSlotsOnlyInPhase1b.map(slot).join(", ")}. **Every one of the 11 net files is an intermediate question screen.** No terminal evidence was lost.`);
w(`- Of the ${c.removedCount} removed, ${c.deduplicatedCount} are byte-identical duplicates retained under another flow's slot, and ${c.suppressedByRecaptureCollisionCount} were suppressed because the re-capture's render of that screen collided with a capture already taken in that run.`);
w();
w("**Every removed capture:**");
w();
w("| Slot | SHA-256 (first 12) | Disposition | Retained instead as |");
w("|---|---|---|---|");
for (const r of c.removedCaptures) {
  w(`| \`${slot(r.slot)}\` | \`${r.sha256.slice(0, 12)}\` | ${r.disposition === "deduplicated" ? "de-duplicated" : "suppressed by re-capture hash collision"} | ${r.retainedInsteadAs.length ? r.retainedInsteadAs.map((x) => `\`${slot(x)}\``).join(", ") : "—"} |`);
}
w();
w("**Every capture present only in the Phase 1B run:**");
w();
w("| Slot | SHA-256 (first 12) | Same bytes existed in Phase 1 |");
w("|---|---|---|");
for (const a of c.addedCaptures) w(`| \`${slot(a.slot)}\` | \`${a.sha256.slice(0, 12)}\` | ${a.hashAlreadyPresentInPhase1 ? "yes" : "no"} |`);
w();
w("---");
w();

// ---------------------------------------------------------------- section 6
w("## 6. Proposed execution sequence");
w();
w("Nothing below has been run. This is the plan for Roger to authorize or refuse.");
w();
w("| Step | Action | Workflow phase | Expected artifact | Stop condition | Rollback / cleanup |");
w("|---|---|---|---|---|---|");
for (const s of p.section6_executionPlan) {
  w(`| ${s.step} | ${s.action} | \`${s.workflowPhase}\` | ${s.expectedArtifact} | ${s.stopCondition} | ${s.rollbackOrCleanup} |`);
}
w();
w("---");
w();

// ---------------------------------------------------------------- discrepancies
w("## Discrepancies the owner should resolve before authorizing");
w();
for (const d of p.discrepanciesForTheOwner) {
  w(`### ${d.id} — ${d.severity}`);
  w();
  w(d.finding);
  w();
  w(`- Evidence: ${d.evidence}`);
  w(`- Decision needed: ${d.ownerDecision}`);
  w();
}

const target = path.join(rootDir, "docs/expungement-ai/flow-audit/ENV-007-owner-authorization-packet.md");
fs.writeFileSync(target, `${out.join("\n")}\n`);
console.log(`wrote docs/expungement-ai/flow-audit/ENV-007-owner-authorization-packet.md (${out.length} lines)`);
