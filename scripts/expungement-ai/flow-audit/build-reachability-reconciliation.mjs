#!/usr/bin/env node
// State-by-state reachability reconciliation for all 51 jurisdictions.
//
//   node scripts/expungement-ai/flow-audit/build-reachability-reconciliation.mjs
//   node scripts/expungement-ai/flow-audit/build-reachability-reconciliation.mjs --check
//
// Phase 1 reported that 19 jurisdictions reach no packet-ready outcome and 22
// reach no payment. Those two numbers are useless until someone can say, per
// jurisdiction, whether that is the product working as intended or the product
// broken — and this file is not allowed to blur the two.
//
// The separation is derived, not asserted:
//
//   * INTENTIONAL UNSUPPORTED / REFERRAL — every one of the jurisdiction's
//     pathways is classified non_filing_guidance, product_scope_exclusion or
//     legally_unavailable in the repository's own closure ledger. Guidance IS
//     the product here; a guidance terminal is the correct answer.
//   * INTENTIONAL LAUNCH HOLD — the jurisdiction has a paid_packet_intended
//     pathway that the runtime would sell, and the launch ledger holds it on a
//     governance gate (owner legal approval, technical approval, deterministic
//     artifact proof). Held, not broken.
//   * TECHNICAL REACHABILITY DEFECT — the jurisdiction has a paid_packet_intended
//     pathway, and topping the participant's rendered-screen answers up with the
//     facts the flow never asks turns the terminal into packet-ready. The route
//     works; the interface cannot feed it.
//
// The third class is the only one Phase 2 owns. Proving membership requires
// showing that the missing fact is both necessary and sufficient, so each such
// jurisdiction gets a minimal necessary set computed by leave-one-out.

import {
  read, readJson, gitSha, writeArtifact, stableJson, EVALUATOR_TODAY, CLEAR_RECORD,
  getProfileByJurisdiction, projectPublicProfile, deriveScreens,
  evaluateAuthoritativeScreeningResult
} from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/reachability-reconciliation.json";

const manifest = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const reachability = readJson("data/expungement-ai/flow-audit/ui-reachability.json");
const closure = readJson("data/rcap-ledger/sellable-pathway-closure.json");
const launchGraph = readJson("data/rcap-ledger/launch-graph.json");
const register = readJson("data/expungement-ai/flow-audit/issue-register.json");
const promotionSource = read("src/lib/rcap/state-promotion-manifest.ts");
const promotionRows = JSON.parse(
  promotionSource.match(/PROMOTION_MANIFEST_START\s\*\/\s*(\[[\s\S]*?\])\s*\/\*\s*PROMOTION_MANIFEST_END/)[1]
);
const promotionByCode = new Map(promotionRows.map((row) => [row.abbreviation, row]));
const launchByKey = new Map(launchGraph.rows.map((row) => [row.pathwayKey, row]));

/**
 * The shared facts the evaluator consumes and the projection classifies postpay.
 * Named explicitly rather than discovered, because the reconciliation has to be
 * able to say "these exact facts" to a Phase 2 owner.
 */
const SHARED_UNRENDERED_FACTS = [
  "financial_obligations",
  "pending_cases",
  "sentence_completion_date",
  "special_preconditions_confirmed",
  "new_convictions_during_waiting_period",
  "record_documents"
];

const PACKET_READY = new Set(["packet_ready", "packet_ready_with_caution"]);

/** Mirror of parseDurationFromText in the evaluator. Explains, never decides. */
function parseDurationFromTextMirror(text) {
  const lower = String(text).toLowerCase();
  if (/\b(\d+)\s*(day|days|month|months|year|years|yr|yrs)\b/.test(lower)) return true;
  if (/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|month|months|year|years)\b/.test(lower)) return true;
  if (/immediate|no waiting period|upon event/.test(lower)) return true;
  return false;
}

/**
 * The five fields evaluateCompiledTiming reads before it will let any route
 * past the timing gate. Any one of them answered the disqualifying way returns
 * not_yet with reason timing_or_completion_blocker, whatever the rest say.
 */
const TIMING_COMPLETION_GATE_FIELDS = [
  "court_requirements_completed",
  "sentence_completion_date",
  "financial_obligations",
  "pending_cases",
  "new_convictions_during_waiting_period",
  // Pinned for the same reason as the five above. timingFromResolvedBucket
  // treats "not_sure" as a missing anchor and returns needs_more_info, which the
  // coordinate search ranked ABOVE not_yet — so left free, the optimizer would
  // answer "I am not sure" to reach a better-ranked terminal. The participant
  // this experiment is about knows their case ended more than ten years ago.
  "resolved_timing_bucket"
];

function evaluate(code, profile, answers) {
  try {
    const evaluation = evaluateAuthoritativeScreeningResult({
      jurisdiction: code,
      profileVersion: profile.profileVersion,
      matterId: "expai-reconciliation",
      answers
    }).evaluation;
    return {
      resultCode: evaluation.resultCode,
      pathwayId: evaluation.pathwayId ?? null,
      paymentAllowed: evaluation.paymentAllowed === true,
      reasonCodes: (evaluation.reasons ?? []).map((reason) => reason.code).sort(),
      missingQuestionIds: [...(evaluation.missingQuestionIds ?? [])].sort()
    };
  } catch (error) {
    return { resultCode: "evaluator_error", pathwayId: null, paymentAllowed: false, reasonCodes: [], missingQuestionIds: [], error: String(error?.message ?? error).slice(0, 200) };
  }
}

const rows = [];

for (const jurisdiction of manifest.jurisdictions) {
  const code = jurisdiction.jurisdiction;
  const profile = getProfileByJurisdiction(code);
  const publicProfile = projectPublicProfile(profile);
  const screens = deriveScreens(publicProfile);
  const screenIds = new Set(screens.map((question) => question.id));
  const promotion = promotionByCode.get(code) ?? null;
  const reach = reachability.jurisdictions.find((row) => row.jurisdiction === code);
  const contexts = reachability.remedyContexts.filter((row) => row.jurisdiction === code);
  const closureRows = closure.pathways.filter((row) => row.jurisdiction === code);
  const flows = manifest.flows.filter((flow) => flow.jurisdiction === code);

  const categories = [...new Set(closureRows.map((row) => row.category))].sort();
  const intendedPaid = closureRows.filter((row) => row.category === "paid_packet_intended");
  const supportedFlowIds = flows
    .filter((flow) => !flow.unsupportedOrReferralOutcome && flow.remedy.kind === "compiled_pathway")
    .map((flow) => flow.flowId).sort();

  const packetReadyReachable = reach?.packetReadyReachableFromRenderedScreensOnly === true;
  const paymentReachable = reach?.paymentReachableFromRenderedScreensOnly === true;

  /* --- three named experiments ----------------------------------------- */
  //
  // E1  what a participant can do today: rendered screens only. Taken from the
  //     bounded search in ui-reachability.json.
  // E2  E1 plus the six shared facts the projection classifies postpay and the
  //     evaluator still consumes.
  // E3  E2 plus every timing-and-completion gate field pinned to its clearing
  //     answer, whether the flow renders it or not.
  //
  // E3 exists because the coordinate search cannot be trusted to choose those
  // five fields for itself. An earlier objective ranked not_yet above
  // needs_review, which gave the optimizer an incentive to answer "no, I have
  // not completed what the court ordered" in order to reach a better-ranked
  // terminal. Pinning them removes the incentive and models the participant the
  // question is actually about: one with a genuinely clear record.

  const bestContext = contexts.slice().sort((a, b) => {
    const rank = { packet_ready: 0, packet_ready_with_caution: 1, needs_more_info: 2, not_yet: 3, needs_review: 4, guidance_only: 5, likely_not_eligible: 6, hard_stop: 7 };
    return (rank[a.bestTerminalResultCode] ?? 9) - (rank[b.bestTerminalResultCode] ?? 9);
  })[0] ?? null;

  const renderedOnlyAnswers = bestContext?.answerSet ?? {};
  const unrenderedPresent = SHARED_UNRENDERED_FACTS
    .filter((id) => !screenIds.has(id) && publicProfile.questions.some((question) => question.id === id));

  const e2Answers = { ...renderedOnlyAnswers };
  for (const id of unrenderedPresent) e2Answers[id] = CLEAR_RECORD[id];
  const e2 = unrenderedPresent.length > 0 ? evaluate(code, profile, e2Answers) : null;

  // Only fields the public profile actually declares; the evaluator rejects an
  // answer to a question it does not publish.
  const gateFieldsPresent = TIMING_COMPLETION_GATE_FIELDS
    .filter((id) => publicProfile.questions.some((question) => question.id === id));
  const e3Answers = { ...e2Answers };
  for (const id of gateFieldsPresent) e3Answers[id] = CLEAR_RECORD[id];
  const e3 = evaluate(code, profile, e3Answers);

  // Leave-one-out over everything E3 supplied that the flow does not render.
  const suppliedButUnrendered = [...new Set([...unrenderedPresent, ...gateFieldsPresent.filter((id) => !screenIds.has(id))])].sort();
  const necessaryFacts = [];
  if (PACKET_READY.has(e3.resultCode)) {
    for (const id of suppliedButUnrendered) {
      const without = { ...e3Answers };
      delete without[id];
      const trial = evaluate(code, profile, without);
      if (!PACKET_READY.has(trial.resultCode)) {
        necessaryFacts.push({
          factKey: id,
          terminalWithoutIt: trial.resultCode,
          blockingReasonCodes: trial.reasonCodes.slice(0, 3),
          lifecyclePhase: publicProfile.questions.find((question) => question.id === id)?.lifecyclePhase ?? null,
          renderedAsAScreen: screenIds.has(id)
        });
      }
    }
  }

  const toppedUp = e3;
  const suppliedFactsFixTheState = Boolean(PACKET_READY.has(e3.resultCode) && !packetReadyReachable);

  /* --- E4: does the state's own waiting rule unblock it? ---------------- */
  //
  // The deciding experiment. `waiting_rule_id` is a published question the flow
  // never renders, and the evaluator honours it as an explicit override of the
  // automatic waiting-rule selection. Sweeping it over the rule ids the state's
  // OWN compiled profile already contains answers the question the other three
  // experiments could not: is the route broken, or is only the path to it?
  //
  // A jurisdiction that reaches packet-ready this way has no legal problem and
  // no data problem. It has a selection problem, and that is Phase 2 work.
  const waitingRuleIdIsPublished = publicProfile.questions.some((question) => question.id === "waiting_rule_id");
  const waitingRuleIds = (profile.waitingPeriodRules ?? []).map((rule) => rule.id).filter(Boolean);
  const unblockingWaitingRules = [];
  if (waitingRuleIdIsPublished && !PACKET_READY.has(e3.resultCode)) {
    for (const id of waitingRuleIds) {
      const trial = evaluate(code, profile, { ...e3Answers, waiting_rule_id: id });
      if (PACKET_READY.has(trial.resultCode)) {
        unblockingWaitingRules.push({
          waitingRuleId: id,
          ruleText: String((profile.waitingPeriodRules ?? []).find((rule) => rule.id === id)?.ruleText ?? "").slice(0, 160),
          resultCode: trial.resultCode,
          paymentAllowed: trial.paymentAllowed,
          pathwayId: trial.pathwayId
        });
      }
    }
  }
  const e4 = {
    waitingRuleIdIsPublished,
    waitingRuleIdIsRenderedAsAScreen: screenIds.has("waiting_rule_id"),
    waitingRuleIdsInProfile: waitingRuleIds.length,
    waitingRuleIdsThatReachPacketReady: unblockingWaitingRules.length,
    anyReachesPayment: unblockingWaitingRules.some((row) => row.paymentAllowed),
    examples: unblockingWaitingRules.slice(0, 3)
  };

  /* --- why the waiting rule could not be executed ----------------------- */
  //
  // A read-only mirror of the candidate pipeline in
  // `bestWaitingRuleForPathway` (src/lib/rcap-engine/evaluator.ts). Mirrored
  // rather than imported because that function is not exported; the point is to
  // show a reviewer WHICH filter emptied the candidate set, not to re-decide it.
  // The evaluator's verdict is still the evaluator's — this only explains it.
  const selectedPathway = profile.pathways.find((pathway) => pathway.id === e3.pathwayId) ?? null;
  let waitingRuleDiagnosis = null;
  if (e3.reasonCodes.some((code) => code.endsWith("waiting_rule_not_executed")) && selectedPathway) {
    const pathwayText = `${selectedPathway.id} ${selectedPathway.label} ${selectedPathway.summary ?? ""}`.toLowerCase();
    const pathwayTokens = pathwayText.split(/[^a-z0-9]+/).filter((token) => token.length > 5);
    const candidateTexts = [
      ...(profile.waitingPeriodRules ?? []).map((rule) => ({ source: `waitingPeriodRules:${rule.id}`, text: String(rule.ruleText ?? ""), declaredDuration: rule.duration ?? null })),
      ...(Array.isArray(selectedPathway.waitingRules) ? selectedPathway.waitingRules : []).map((text, index) => ({ source: `pathway.waitingRules[${index}]`, text: String(text), declaredDuration: null }))
    ];
    const withDuration = candidateTexts.filter((candidate) => candidate.declaredDuration || parseDurationFromTextMirror(candidate.text));
    const relevant = withDuration.filter((candidate) => pathwayTokens.some((token) => candidate.text.toLowerCase().includes(token)));
    waitingRuleDiagnosis = {
      pathwayId: selectedPathway.id,
      candidateRules: candidateTexts.length,
      candidatesWithAParseableDuration: withDuration.length,
      candidatesAlsoTextRelevantToThePathway: relevant.length,
      emptiedBy: withDuration.length === 0
        ? "duration_parse: no candidate rule carries a structured duration, and none of the prose matches the numeric or word patterns parseDurationFromText recognises"
        : relevant.length === 0
          ? "relevance_filter: candidates do carry durations, but none shares a token longer than five characters with the pathway's own id, label or summary"
          : "neither filter emptied the set in this mirror; the evaluator's own case-outcome relevance branch must have rejected the remainder",
      examplesOfUnparseableProse: candidateTexts
        .filter((candidate) => !candidate.declaredDuration && !parseDurationFromTextMirror(candidate.text))
        .slice(0, 3)
        .map((candidate) => ({ source: candidate.source, text: candidate.text.slice(0, 180) }))
    };
  }

  /* --- classification -------------------------------------------------- */

  const everyPathwayIsNonPaid = intendedPaid.length === 0 && closureRows.length > 0;
  const launchRows = intendedPaid.map((row) => launchByKey.get(row.pathwayKey)).filter(Boolean);
  const anySellable = launchRows.some((row) => row.operationallySellable === true);
  const unmetGates = [...new Set(launchRows.flatMap((row) => row.unmetOperationalGates ?? []))].sort();

  const checkoutRefusals = [...new Set(flows.map((flow) => flow.terminalOutcome.checkoutRefusal).filter(Boolean))];
  const runtimeCheckoutPasses = flows.filter((flow) => flow.paymentMode === "dtc_paid").length;

  let classification;
  let classificationBasis;
  if (everyPathwayIsNonPaid) {
    classification = "intentional_unsupported_or_referral";
    classificationBasis = `Every one of this jurisdiction's ${closureRows.length} compiled pathway(s) is classified ${categories.join(", ")} in the sellable-pathway closure ledger. Guidance is the product here.`;
  } else if (suppliedFactsFixTheState) {
    classification = "technical_reachability_defect";
    classificationBasis = `Supplying ${necessaryFacts.map((fact) => fact.factKey).join(", ") || "the unrendered facts"} — which the flow never asks — turns the terminal into ${toppedUp.resultCode}. The legal route works; the interface cannot feed it.`;
  } else if (packetReadyReachable && !paymentReachable) {
    classification = "payment_clamp_not_reachability";
    classificationBasis = "A packet-ready terminal is reachable from the rendered screens, but the evaluator's payment clamp closes payment on every reachable route.";
  } else if (!packetReadyReachable && e4.waitingRuleIdsThatReachPacketReady > 0) {
    classification = "technical_reachability_defect";
    classificationBasis = `Naming any of ${e4.waitingRuleIdsThatReachPacketReady} waiting rule(s) this state's own compiled profile already contains turns the terminal into ${e4.examples[0].resultCode}${e4.anyReachesPayment ? " with payment allowed" : ""}. The legal route, the state's data and the payment clamp are all fine; the participant cannot reach it because waiting_rule_id is published but never rendered, and the automatic selector picks none of those same rules.`;
  } else if (!packetReadyReachable && e3.reasonCodes.some((code) => code.endsWith("waiting_rule_not_executed"))) {
    classification = "waiting_rule_not_executable";
    classificationBasis = `Even with every timing and completion fact answered the clearing way, and with every waiting rule in the profile named explicitly, the evaluator cannot execute a waiting period for ${e3.pathwayId ?? "the selected route"}. ${waitingRuleDiagnosis?.emptiedBy ?? ""}`;
  } else if (!packetReadyReachable) {
    classification = "unresolved_reachability";
    classificationBasis = `Neither the rendered screens nor the unrendered facts produce a packet-ready terminal; the bounded search settles on ${e3.resultCode} (${e3.reasonCodes.join(", ") || "no reason code"}).`;
  } else if (!anySellable) {
    classification = "intentional_launch_hold";
    classificationBasis = `Packet-ready and payment are both reachable; the launch ledger holds every intended-paid pathway on ${unmetGates.join(", ") || "an unmet governance gate"}.`;
  } else {
    classification = "reachable_and_sellable";
    classificationBasis = "Packet-ready, payment and the launch ledger all agree.";
  }

  // A launch hold can coexist with reachability, so it is a separate column.
  const intentionalLaunchHold = intendedPaid.length > 0 && !anySellable;

  const jurisdictionIssues = register.issues
    .filter((issue) => issue.affectedJurisdictions.includes(code))
    .filter((issue) => issue.severity === "P0" || issue.category === "STATE_LEGAL_LOGIC" || issue.category === "GLOBAL_FACT_MODEL")
    .map((issue) => issue.issueId).sort();

  rows.push({
    jurisdiction: code,
    name: jurisdiction.name,
    intendedCommercialStatus: {
      promotionStatus: promotion?.promotionStatus ?? "unknown",
      expungementAiChannelApproved: promotion?.approvedChannels?.expungementAi === true,
      compiledPathways: closureRows.length,
      closureCategories: Object.fromEntries(
        categories.map((category) => [category, closureRows.filter((row) => row.category === category).length])
      ),
      intendedPaidPathways: intendedPaid.length
    },
    supportedManifestFlowIds: supportedFlowIds,
    supportedManifestFlowCount: supportedFlowIds.length,
    renderedTerminalReached: reach?.bestTerminalResultCode ?? "unknown",
    renderedTerminalPathwayId: reach?.bestPathwayId ?? null,
    packetReadyReachable,
    paymentReachable,
    firstMissingRequiredFact: necessaryFacts.length > 0 ? necessaryFacts[0].factKey : null,
    allNecessaryMissingFacts: necessaryFacts,
    unrenderedFactsPresentInPayload: unrenderedPresent,
    lifecycleClassification: Object.fromEntries(
      unrenderedPresent.map((id) => [id, publicProfile.questions.find((question) => question.id === id)?.lifecyclePhase ?? null])
    ),
    experiments: {
      e1_renderedScreensOnly: {
        resultCode: reach?.bestTerminalResultCode ?? "unknown",
        pathwayId: reach?.bestPathwayId ?? null,
        paymentAllowed: reach?.paymentReachableFromRenderedScreensOnly === true
      },
      e2_plusSharedUnrenderedFacts: e2
        ? { resultCode: e2.resultCode, pathwayId: e2.pathwayId, paymentAllowed: e2.paymentAllowed, reasonCodes: e2.reasonCodes.slice(0, 3) }
        : null,
      e4_namingAWaitingRuleTheProfileAlreadyContains: e4,
      e3_plusTimingAndCompletionGateFields: {
        resultCode: e3.resultCode,
        pathwayId: e3.pathwayId,
        paymentAllowed: e3.paymentAllowed,
        reasonCodes: e3.reasonCodes.slice(0, 3),
        fieldsPinned: [...unrenderedPresent, ...gateFieldsPresent].filter((value, index, all) => all.indexOf(value) === index).sort()
      }
    },
    terminalWithUnrenderedFactsSupplied: { resultCode: toppedUp.resultCode, pathwayId: toppedUp.pathwayId, paymentAllowed: toppedUp.paymentAllowed },
    checkoutGuardResult: {
      runtimeCheckoutPasses,
      refusalsObserved: checkoutRefusals,
      verdict: runtimeCheckoutPasses > 0 ? "passes_for_at_least_one_flow" : checkoutRefusals.length > 0 ? `refused: ${checkoutRefusals.join(", ")}` : "never_reached"
    },
    operationallySellable: launchRows.length === 0 ? null : anySellable,
    unmetOperationalGates: unmetGates,
    intentionalUnsupportedOrReferral: classification === "intentional_unsupported_or_referral",
    intentionalLaunchHold,
    technicalReachabilityDefect: classification === "technical_reachability_defect",
    classification,
    classificationBasis,
    waitingRuleDiagnosis,
    issueIds: jurisdictionIssues
  });
}

/* ------------------------------------------------------------------ */
/* The 19 / 22 difference, stated exactly                              */
/* ------------------------------------------------------------------ */

const noPacketReady = rows.filter((row) => !row.packetReadyReachable).map((row) => row.jurisdiction);
const noPayment = rows.filter((row) => !row.paymentReachable).map((row) => row.jurisdiction);
const packetReadyButNoPayment = rows
  .filter((row) => row.packetReadyReachable && !row.paymentReachable)
  .map((row) => ({
    jurisdiction: row.jurisdiction,
    renderedTerminalReached: row.renderedTerminalReached,
    pathwayId: row.renderedTerminalPathwayId,
    classification: row.classification
  }));

const classificationCounts = {};
for (const row of rows) classificationCounts[row.classification] = (classificationCounts[row.classification] ?? 0) + 1;

const packet = {
  schemaVersion: "expai-reachability-reconciliation/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-reachability-reconciliation.mjs",
  baseSha: gitSha("origin/main"),
  auditHead: gitSha("HEAD"),
  evaluatorToday: EVALUATOR_TODAY,
  changesNoProductBehavior: true,
  separationRule: "An intentional unsupported or referral outcome is never counted as a technical failure. A jurisdiction is a technical reachability defect only when supplying the facts the flow never asks turns its terminal into packet-ready; that is a proof, not a judgement.",
  classificationVocabulary: {
    intentional_unsupported_or_referral: "Every compiled pathway is non-filing guidance, product-scope exclusion or legally unavailable. Guidance is the correct outcome.",
    technical_reachability_defect: "A paid pathway exists and works, and naming a waiting rule the state's own profile already contains reaches packet-ready. The flow never renders waiting_rule_id and the automatic selector picks none of those rules, so the participant cannot reach it. Shared-executor defect.",
    payment_clamp_not_reachability: "Packet-ready is reachable; the evaluator's payment clamp closes payment on every reachable route.",
    intentional_launch_hold: "Packet-ready and payment are reachable; the launch ledger holds the route on a governance gate.",
    waiting_rule_not_executable: "Every timing and completion fact is answered the clearing way, every waiting rule in the profile has been named explicitly, and the evaluator still cannot execute a waiting period. A per-state compiled-profile defect that needs a legal answer, not a shared fix.",
    unresolved_reachability: "Neither the rendered screens nor the unrendered facts reach packet-ready, and the blocker is not the waiting-rule executor. Needs a per-state legal answer.",
    reachable_and_sellable: "Reachability, payment and the launch ledger all agree."
  },
  totals: {
    jurisdictions: rows.length,
    noPacketReadyCount: noPacketReady.length,
    noPaymentCount: noPayment.length,
    packetReadyButNoPaymentCount: packetReadyButNoPayment.length,
    classificationCounts,
    intentionalUnsupportedOrReferral: rows.filter((row) => row.intentionalUnsupportedOrReferral).map((row) => row.jurisdiction),
    intentionalLaunchHolds: rows.filter((row) => row.intentionalLaunchHold).map((row) => row.jurisdiction),
    technicalReachabilityDefects: rows.filter((row) => row.technicalReachabilityDefect).map((row) => row.jurisdiction),
    waitingRuleNotExecutable: rows.filter((row) => row.classification === "waiting_rule_not_executable").map((row) => row.jurisdiction),
    technicalReachabilityDefectDetail: rows
      .filter((row) => row.classification === "technical_reachability_defect")
      .map((row) => ({
        jurisdiction: row.jurisdiction,
        waitingRuleIdsThatReachPacketReady: row.experiments.e4_namingAWaitingRuleTheProfileAlreadyContains.waitingRuleIdsThatReachPacketReady,
        reachesPayment: row.experiments.e4_namingAWaitingRuleTheProfileAlreadyContains.anyReachesPayment
      })),
    unresolvedReachability: rows.filter((row) => row.classification === "unresolved_reachability").map((row) => ({ jurisdiction: row.jurisdiction, terminal: row.experiments.e3_plusTimingAndCompletionGateFields.resultCode, reasonCodes: row.experiments.e3_plusTimingAndCompletionGateFields.reasonCodes }))
  },
  noPacketReady,
  noPayment,
  differenceBetween19And22: {
    noPacketReady: noPacketReady.length,
    noPayment: noPayment.length,
    difference: noPayment.length - noPacketReady.length,
    explanation:
      "Reachability and payment are two different gates and the second is strictly narrower. Every jurisdiction that cannot reach packet-ready also cannot reach payment, because payment is only ever offered on a packet-ready terminal. The extra jurisdictions in the payment set are the ones that DO reach packet-ready and are then closed by the evaluator's own payment clamp in evaluateAgainstProfile: paymentAllowed additionally requires route.deterministic, a packet plan, routeIsRatifiedDeployable, a court-filed petition or administrative application route, and isPacketPlanFulfillmentReady. A route can satisfy every eligibility rule, return packet_ready_with_caution, and still be handed paymentAllowed false by that clamp.",
    jurisdictionsInTheDifference: packetReadyButNoPayment
  },
  jurisdictions: rows
};

const text = stableJson(packet);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`reachability reconciliation current: ${rows.length} jurisdiction(s).`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  classifications: ${JSON.stringify(classificationCounts)}`);
console.log(`  no packet-ready: ${noPacketReady.length}  no payment: ${noPayment.length}  difference: ${noPayment.length - noPacketReady.length}`);
console.log(`  packet-ready but no payment: ${packetReadyButNoPayment.map((row) => row.jurisdiction).join(", ") || "(none)"}`);
console.log(`  technical reachability defects: ${packet.totals.technicalReachabilityDefects.join(", ") || "(none)"}`);
console.log(`  intentional unsupported/referral: ${packet.totals.intentionalUnsupportedOrReferral.join(", ") || "(none)"}`);
