#!/usr/bin/env node
// The exact correction contract for the reachability defect.
//
//   node scripts/expungement-ai/flow-audit/build-correction-contract.mjs
//   node scripts/expungement-ai/flow-audit/build-correction-contract.mjs --check
//
// Phase 1 attributed 19 unreachable jurisdictions to one cause: the projection
// classifying shared facts postpay so the flow never asks them. Phase 1B tested
// that attribution and it is wrong for most of them. This file states the
// corrected cause, the evidence that falsified the original one, and the exact
// change each half needs — without making any of those changes.

import { read, readJson, gitSha, writeArtifact, stableJson } from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/correction-contract.json";

const reconciliation = readJson("data/expungement-ai/flow-audit/reachability-reconciliation.json");
const questionNodes = readJson("data/expungement-ai/flow-audit/question-node-reconciliation.json");

const technical = reconciliation.jurisdictions.filter((row) => row.classification === "technical_reachability_defect");
const notExecutable = reconciliation.jurisdictions.filter((row) => row.classification === "waiting_rule_not_executable");
const unresolved = reconciliation.jurisdictions.filter((row) => row.classification === "unresolved_reachability");
const paymentClamp = reconciliation.jurisdictions.filter((row) => row.classification === "payment_clamp_not_reachability");

const misclassified = questionNodes.totals.distinctQuestionIdsPerBucket.lifecycle_misclassified ?? [];

const packet = {
  schemaVersion: "expai-correction-contract/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-correction-contract.mjs",
  baseSha: gitSha("origin/main"),
  auditHead: gitSha("HEAD"),
  changesNoProductBehavior: true,

  correctionToPhase1: {
    phase1Claim: "19 jurisdictions reach no packet-ready outcome because lifecyclePhaseForQuestion and phaseForWilmaFact classify the facts the evaluator needs as postpay, so the flow never asks them.",
    phase1BVerdict: "Half right, and wrong about which half matters.",
    whatFalsifiedIt:
      "Supplying all six shared postpay facts to the closest rendered-only answer set changed no jurisdiction's terminal (experiment E2). Additionally pinning all five timing-and-completion gate fields plus the timing bucket to their clearing answers still reached packet-ready in none of the 19 (experiment E3). The lifecycle classification is real and is a defect in its own right, but it is not what closes those 19 jurisdictions.",
    whatIsActuallyBlockingThem:
      "The evaluator cannot select a waiting rule for the route the participant reaches. In 13 of the 19, naming a waiting_rule_id the jurisdiction's OWN compiled profile already contains turns the terminal into packet_ready_with_caution, in most cases with paymentAllowed true (experiment E4). The legal route, the state's data and the payment clamp are all fine. What fails is bestWaitingRuleForPathway's automatic selection, on a route whose rules are sitting right there.",
    methodNote:
      "One earlier version of this audit's own search ranked not_yet above needs_review, which gave the optimizer an incentive to answer 'no, I have not completed what the court ordered' in order to reach a better-ranked terminal. That flaw produced a false picture and is why the gate fields are pinned rather than optimized. Recorded because the same trap will catch the next person who measures this."
  },

  half1_sharedExecutor: {
    owner: "PHASE_2_SHARED",
    title: "The automatic waiting-rule selector rejects rules the profile already carries, and the manual override it honours is never rendered",
    severity: "P0",
    affectedJurisdictions: technical.map((row) => row.jurisdiction),
    affectedJurisdictionCount: technical.length,
    proof: technical.map((row) => ({
      jurisdiction: row.jurisdiction,
      terminalWithoutTheOverride: row.experiments.e3_plusTimingAndCompletionGateFields.resultCode,
      waitingRuleIdsInProfile: row.experiments.e4_namingAWaitingRuleTheProfileAlreadyContains.waitingRuleIdsInProfile,
      waitingRuleIdsThatReachPacketReady: row.experiments.e4_namingAWaitingRuleTheProfileAlreadyContains.waitingRuleIdsThatReachPacketReady,
      reachesPayment: row.experiments.e4_namingAWaitingRuleTheProfileAlreadyContains.anyReachesPayment,
      exampleUnblockingRule: row.experiments.e4_namingAWaitingRuleTheProfileAlreadyContains.examples[0] ?? null
    })),
    mechanism: [
      "bestWaitingRuleForPathway builds its candidate set from the profile's waitingPeriodRules and the pathway's own waitingRules prose, gives each a duration from normalizeDuration(rule.duration) or parseDurationFromText(rule.ruleText), then applies two filters.",
      "Filter one drops any candidate with no parseable duration. parseDurationFromText recognises a number plus a unit, a spelled-out number plus a unit, or the exact phrases 'immediate', 'no waiting period' and 'upon event'. It does not recognise 'No ordinary waiting period', which is how the District of Columbia's actual-innocence route states that it has none.",
      "Filter two, waitingTextRelevant, keeps a candidate only if its prose shares a token longer than five characters with the pathway's own id, label or summary, or matches one of the case-outcome regexes. Two sentences about the same legal route, written differently, do not survive it.",
      "When the set empties, evaluateCompiledTiming returns needs_review with reason waiting_rule_not_executed and the text 'We need one more detail before we can prepare the right packet.' The participant is told a detail is missing. No detail is missing; the selector could not choose."
    ],
    sourceReferences: [
      { file: "src/lib/rcap-engine/evaluator.ts", symbol: "bestWaitingRuleForPathway", note: "candidate construction and the two filters" },
      { file: "src/lib/rcap-engine/evaluator.ts", symbol: "waitingTextRelevant", note: "the token-overlap relevance filter" },
      { file: "src/lib/rcap-engine/evaluator.ts", symbol: "parseDurationFromText", note: "the duration regex, including the three exact zero-wait phrases" },
      { file: "src/lib/rcap-engine/evaluator.ts", symbol: "timingFromResolvedBucket", note: "the requiredYears === undefined branch that emits waiting_rule_not_executed" },
      { file: "src/lib/rcap-engine/evaluator.ts", symbol: "durationInYears", note: "returns undefined for the 'ambiguous' unit normalizeDurationUnit can produce, while durationDays handles it" }
    ],
    requiredCorrection: [
      "Select a waiting rule by identity, not by prose similarity. A compiled pathway should name the waiting rules that bind it, and the evaluator should read that binding instead of inferring it from shared word tokens.",
      "Make 'this route has no waiting period' expressible as data rather than as a sentence a regex must recognise.",
      "Make the failure honest while the binding is missing: a route whose waiting rule cannot be selected should say the waiting period could not be determined, not that the participant owes another detail.",
      "Either render waiting_rule_id, or stop honouring it. Today it is a published question the flow never shows, that silently changes the legal outcome when supplied. That is the worst of both."
    ],
    prohibitedInThisPhase: "No change was made. This contract is a description, not a patch."
  },

  half2_lifecycleClassification: {
    owner: "PHASE_2_SHARED",
    title: "Question lifecycle is decided by regular expressions over prompt text, not by which questions the evaluator reads",
    severity: "P1",
    detail:
      `lifecyclePhaseForQuestion matches a question's text against a list of regular expressions to decide prepay or postpay, and phaseForWilmaFact defaults every shared fact to postpay unless its jurisdiction appears in a hand-written allowlist. ` +
      `${misclassified.length} distinct question ids are classified postpay in at least one jurisdiction while the evaluator or a compiled rule in that same jurisdiction reads them, across ${questionNodes.totals.byBucketRawNodes.lifecycle_misclassified} nodes.`,
    misclassifiedQuestionIds: misclassified,
    misclassifiedNodeCount: questionNodes.totals.byBucketRawNodes.lifecycle_misclassified ?? 0,
    signature:
      "The signature is inconsistency rather than absence. financial_obligations renders as a screen in 30 jurisdictions and is served without being rendered in 21; pending_cases 25 and 26; sentence_completion_date 33 and 18. special_preconditions_confirmed and new_convictions_during_waiting_period render in none of the 51 and are served in all of them. The same fact, the same evaluator, a different answer per state, decided by whether a sentence happened to match a regex.",
    requiredCorrection: [
      "Derive lifecycle from consumption. A fact any compiled rule references, or the evaluator reads before a packet decision, is prepay by definition.",
      "Fail closed. A question the evaluator reads that is not classified prepay should fail the build rather than reach the browser as a postpay field.",
      "Retire the per-jurisdiction allowlist once the derivation exists; it is a list of exceptions to a rule that should not have exceptions."
    ],
    prohibitedInThisPhase: "The brief is explicit: do not patch the allowlist or the regex in this phase. Nothing here was patched."
  },

  perStateWork: {
    owner: "PHASE_3_STATE_SHARD",
    waitingRuleNotExecutable: {
      jurisdictions: notExecutable.map((row) => row.jurisdiction),
      detail: "Even with every timing and completion fact answered the clearing way, and with every waiting rule in the profile named explicitly, no packet-ready terminal is reachable. The shared fix above will not help these; they need a per-state legal answer about what waiting period actually binds the route."
    },
    unresolved: {
      jurisdictions: unresolved.map((row) => ({
        jurisdiction: row.jurisdiction,
        terminal: row.experiments.e3_plusTimingAndCompletionGateFields.resultCode,
        reasonCodes: row.experiments.e3_plusTimingAndCompletionGateFields.reasonCodes
      })),
      detail: "Blocked for reasons unrelated to waiting-rule selection. California settles on an ambiguity reason; Indiana on a compiled rule that short-circuits before a packet decision."
    }
  },

  paymentClamp: {
    owner: "PHASE_2_SHARED, with a legal question attached",
    jurisdictions: paymentClamp.map((row) => row.jurisdiction),
    detail:
      "Three jurisdictions reach a packet-ready terminal from the rendered screens and are still handed paymentAllowed false. This is the exact reason the no-payment count (22) exceeds the no-packet-ready count (19). The clamp in evaluateAgainstProfile requires, on top of a packet-ready result: route.deterministic, a packet plan, routeIsRatifiedDeployable, a court-filed petition or administrative application route, and isPacketPlanFulfillmentReady. Any one of those failing closes payment silently, and the participant is shown a packet-ready result with no way to buy the packet.",
    requiredCorrection: "Say which clamp closed. A packet-ready result that cannot be bought should tell the participant why, and the audit should be able to read the reason without re-deriving five predicates."
  },

  summary: {
    jurisdictionsWithNoPacketReady: reconciliation.totals.noPacketReadyCount,
    jurisdictionsWithNoPayment: reconciliation.totals.noPaymentCount,
    fixedByHalf1: technical.length,
    needingPerStateLegalAnswer: notExecutable.length + unresolved.length,
    paymentClampOnly: paymentClamp.length,
    intentionalLaunchHolds: reconciliation.totals.intentionalLaunchHolds.length,
    intentionalUnsupportedOrReferral: reconciliation.totals.intentionalUnsupportedOrReferral.length
  }
};

const text = stableJson(packet);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log("correction contract current.");
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  half 1 fixes ${technical.length} jurisdiction(s); ${notExecutable.length + unresolved.length} need a per-state legal answer; ${paymentClamp.length} are payment-clamp only`);
