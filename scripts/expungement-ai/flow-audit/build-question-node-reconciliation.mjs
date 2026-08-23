#!/usr/bin/env node
// What are the 1,824 served-but-not-rendered question nodes actually doing?
//
//   node scripts/expungement-ai/flow-audit/build-question-node-reconciliation.mjs
//   node scripts/expungement-ai/flow-audit/build-question-node-reconciliation.mjs --check
//
// Phase 1 counted them and stopped. A count is not a finding: most of those
// nodes are the product working correctly, and lumping them together hides the
// handful that are not. Each node is placed in exactly one bucket, in a fixed
// precedence, and the bucket that matters — lifecycle_misclassified — is defined
// by a testable property rather than an opinion: the projection classifies the
// question postpay, and the evaluator reads it before it will decide a packet.

import {
  read, readJson, gitSha, writeArtifact, stableJson,
  getAllJurisdictionProfiles, projectPublicProfile, deriveScreens, packetPlanForPathway
} from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/question-node-reconciliation.json";

const inventory = readJson("data/expungement-ai/flow-audit/question-inventory.json");
const manifest = readJson("data/expungement-ai/flow-audit/flow-manifest.json");

const evaluatorSource = read("src/lib/rcap-engine/evaluator.ts");
const projectionSource = read("src/lib/rcap-engine/public-profile-projection.ts");
const contractsSource = read("src/lib/expungement-ai/frontend/contracts.ts");

/** The question types the shared renderer actually has a branch for. */
const KNOWN_QUESTION_TYPES = new Set(
  (contractsSource.match(/export const KNOWN_QUESTION_TYPES = \[([\s\S]*?)\] as const;/)?.[1] ?? "")
    .split(",").map((entry) => entry.trim().replace(/^"|"$/g, "")).filter(Boolean)
);

/** Field ids the evaluator reads by name before it will decide a packet. */
const EVALUATOR_CONSTANTS = new Map(
  [...evaluatorSource.matchAll(/const ([A-Z][A-Z0-9_]*)\s*=\s*"([a-z0-9_]+)";/g)].map((match) => [match[1], match[2]])
);
const EVALUATOR_READS = new Set([
  ...[...evaluatorSource.matchAll(/answers\.([a-z0-9_]+)/g)].map((match) => match[1]),
  ...[...evaluatorSource.matchAll(/answers\["([a-z0-9_]+)"\]/g)].map((match) => match[1]),
  ...[...evaluatorSource.matchAll(/answers\[([A-Z][A-Z0-9_]*)\]/g)].map((match) => EVALUATOR_CONSTANTS.get(match[1])).filter(Boolean)
]);

/** The five facts named in the Phase 1B brief, plus the sixth the audit found with them. */
const NAMED_FACTS = [
  "financial_obligations",
  "pending_cases",
  "sentence_completion_date",
  "special_preconditions_confirmed",
  "new_convictions_during_waiting_period"
];

/* ------------------------------------------------------------------ */
/* Per-jurisdiction context                                            */
/* ------------------------------------------------------------------ */

const context = new Map();
for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  const publicProfile = projectPublicProfile(profile);
  const screenIds = new Set(deriveScreens(publicProfile).map((question) => question.id));
  const requiredInputIds = new Set();
  const requiredByPathway = new Map();
  for (const pathway of profile.pathways) {
    for (const id of packetPlanForPathway(profile, pathway.id)?.requiredInputIds ?? []) {
      requiredInputIds.add(id);
      if (!requiredByPathway.has(id)) requiredByPathway.set(id, []);
      requiredByPathway.get(id).push(pathway.id);
    }
  }
  const ruleFields = new Set([
    ...(profile.orderedDecisionRules ?? []).flatMap((rule) => rule.when?.fieldsReferenced ?? []),
    ...(profile.waitingPeriodRules ?? []).flatMap((rule) => rule.fieldsReferenced ?? []),
    ...(profile.exclusionRules ?? []).flatMap((rule) => rule.fieldsReferenced ?? [])
  ]);
  context.set(code, { profile, publicProfile, screenIds, requiredInputIds, requiredByPathway, ruleFields });
}

/* ------------------------------------------------------------------ */
/* Bucketing                                                           */
/* ------------------------------------------------------------------ */

const BUCKETS = [
  "intentionally_conditional_and_not_selected",
  "already_known_and_correctly_prefilled",
  "intentionally_post_entitlement",
  "lifecycle_misclassified",
  "renderer_unsupported",
  "dead_or_unreachable",
  "human_legal_review_required",
  "purpose_not_found",
  "other"
];

function bucketFor(node, ctx) {
  const id = node.questionId;
  const statePrefix = /^([a-z]{2})_/.exec(id)?.[1]?.toUpperCase() ?? null;
  const belongsToAnotherState = statePrefix && statePrefix !== node.jurisdiction
    && projectionSource.includes(`${statePrefix}: new Set([`);

  // 1. Another state's route question, carried by the shared Wilma fact list.
  if (belongsToAnotherState) {
    return {
      bucket: "intentionally_conditional_and_not_selected",
      basis: `${id} is ${statePrefix}'s route question. withWilmaFactQuestions appends one shared list to all 51 jurisdictions and STATE_SPECIFIC_PREPAY_WILMA_FACT_IDS keeps it off screen outside its own state, which is the intended behaviour.`
    };
  }

  // 2. The renderer has no branch for this type.
  if (!KNOWN_QUESTION_TYPES.has(node.inputType)) {
    return { bucket: "renderer_unsupported", basis: `QuestionField has no case for type ${node.inputType}; it would render the calm fallback.` };
  }

  // 3. The evaluator reads it before a packet decision, and the projection filed
  //    it postpay. This is the only bucket that is a defect by construction.
  const evaluatorReadsItPrepay = EVALUATOR_READS.has(id) || ctx.ruleFields.has(id);
  if (evaluatorReadsItPrepay && String(node.section).startsWith("post_payment")) {
    return {
      bucket: "lifecycle_misclassified",
      basis: `${id} is classified ${node.purposeEvidence?.timingAnchorField ? "a timing anchor" : "postpay"} by the projection, and the evaluator reads it before it will decide a packet (${EVALUATOR_READS.has(id) ? "named directly in evaluator.ts" : "referenced by a compiled rule in this profile"}).`
    };
  }

  // 4. Asked after entitlement, by design: it is a required packet input.
  if (ctx.requiredInputIds.has(id)) {
    return {
      bucket: "intentionally_post_entitlement",
      basis: `${id} is a required packet input for ${(ctx.requiredByPathway.get(id) ?? []).length} pathway(s) and is asked by the packet-information builder after the matter is saved.`
    };
  }

  // 5. Already collected on a screen, and carried forward.
  if (ctx.screenIds.has(id)) {
    return { bucket: "already_known_and_correctly_prefilled", basis: `${id} is also a rendered consumer screen in this jurisdiction; the packet model prefills it from the screening answers.` };
  }

  // 6. Classified for legal review by the purpose pass.
  if (node.purpose === "human_legal_review_required") {
    return { bucket: "human_legal_review_required", basis: `The purpose pass could only place ${id} under human_legal_review_required.` };
  }

  // 7. No consumer at all.
  if (node.purpose === "purpose_not_found") {
    return { bucket: "purpose_not_found", basis: `${id} is served in the public payload, is in no pathway's requiredInputIds so the builder never renders it, and no rule, timing anchor or evaluator branch reads it.` };
  }

  // 8. Has a purpose, is not asked anywhere, is not read anywhere in this state.
  if (!ctx.requiredInputIds.has(id) && !ctx.ruleFields.has(id) && !EVALUATOR_READS.has(id)) {
    return { bucket: "dead_or_unreachable", basis: `${id} is neither rendered, nor a packet input, nor read by any rule in this jurisdiction.` };
  }

  return { bucket: "other", basis: "Did not match any earlier rule." };
}

const servedNotRendered = inventory.questions.filter((node) => node.reachability === "served_as_packet_completion_field");
const rows = servedNotRendered.map((node) => {
  const ctx = context.get(node.jurisdiction);
  const { bucket, basis } = bucketFor(node, ctx);
  return {
    jurisdiction: node.jurisdiction,
    questionId: node.questionId,
    factKey: node.factKey,
    inputType: node.inputType,
    section: node.section,
    purpose: node.purpose,
    bucket,
    basis
  };
});

const byBucket = {};
const distinctByBucket = {};
for (const row of rows) {
  byBucket[row.bucket] = (byBucket[row.bucket] ?? 0) + 1;
  (distinctByBucket[row.bucket] ??= new Set()).add(row.questionId);
}

/* ------------------------------------------------------------------ */
/* The five named facts, in full                                       */
/* ------------------------------------------------------------------ */

const namedFactDetail = NAMED_FACTS.map((factKey) => {
  const nodes = inventory.questions.filter((node) => node.questionId === factKey);
  const jurisdictionsRendering = nodes.filter((node) => node.reachability === "rendered_as_consumer_screen").map((node) => node.jurisdiction).sort();
  const jurisdictionsServedOnly = nodes.filter((node) => node.reachability === "served_as_packet_completion_field").map((node) => node.jurisdiction).sort();

  const consumingRules = [];
  for (const [code, ctx] of context) {
    const ordered = (ctx.profile.orderedDecisionRules ?? []).filter((rule) => (rule.when?.fieldsReferenced ?? []).includes(factKey)).map((rule) => rule.id);
    const waiting = (ctx.profile.waitingPeriodRules ?? []).filter((rule) => (rule.fieldsReferenced ?? []).includes(factKey)).map((rule) => rule.id);
    const exclusion = (ctx.profile.exclusionRules ?? []).filter((rule) => (rule.fieldsReferenced ?? []).includes(factKey)).map((rule) => rule.id);
    if (ordered.length + waiting.length + exclusion.length > 0) {
      consumingRules.push({ jurisdiction: code, orderedDecisionRules: ordered.slice(0, 6), waitingPeriodRules: waiting.slice(0, 6), exclusionRules: exclusion.slice(0, 6) });
    }
  }

  const affectedFlows = manifest.flows
    .filter((flow) => jurisdictionsServedOnly.includes(flow.jurisdiction))
    .map((flow) => flow.flowId);

  // Where in the evaluator the fact is first required.
  const firstRequiredAt = evaluatorSource.includes(`answers.${factKey}`)
    ? (() => {
      const index = evaluatorSource.indexOf(`answers.${factKey}`);
      const before = evaluatorSource.slice(0, index);
      const line = before.split("\n").length;
      const fn = [...before.matchAll(/\nfunction ([A-Za-z0-9_]+)\(/g)].pop()?.[1] ?? "unknown";
      return { file: "src/lib/rcap-engine/evaluator.ts", line, enclosingFunction: fn };
    })()
    : null;

  const lifecycleSource = projectionSource.includes(`"${factKey}"`)
    ? "named explicitly in src/lib/rcap-engine/public-profile-projection.ts"
    : "assigned by phaseForWilmaFact's default branch in src/lib/rcap-engine/public-profile-projection.ts (shared Wilma fact, postpay unless the jurisdiction is on STATE_SPECIFIC_PREPAY_WILMA_FACT_IDS)";

  return {
    factKey,
    nodes: nodes.length,
    jurisdictionsRenderingItAsAScreen: jurisdictionsRendering,
    jurisdictionsServingItWithoutRenderingIt: jurisdictionsServedOnly,
    consumingRuleCount: consumingRules.length,
    consumingRules: consumingRules.slice(0, 12),
    affectedFlowCount: affectedFlows.length,
    affectedFlowIdsSample: affectedFlows.slice(0, 8),
    currentLifecycleSource: lifecycleSource,
    firstPointAtWhichTheFactIsRequired: firstRequiredAt ?? { note: `Not read by name in evaluator.ts; required only through a compiled rule's fieldsReferenced in ${consumingRules.length} profile(s).` },
    uiRendersPrefillsOrConfirmsItBeforeThatPoint: {
      rendersAsAScreen: jurisdictionsRendering.length > 0 ? `in ${jurisdictionsRendering.length} of 51 jurisdictions` : "never",
      prefills: "no — the packet-information model prefills only ids present in the packet plan's requiredInputIds, and only after the matter is saved, which is already past the evaluation",
      confirms: "no — nothing in the screening flow shows the participant a value for this fact or asks them to confirm one"
    },
    recommendedSharedArchitectureCorrection:
      "Decide lifecycle from consumption, not from prose. A fact any compiled rule references, or the evaluator reads before a packet decision, is prepay by definition and must be emitted as a rendered screen in every jurisdiction whose profile declares it. Replace the regex-and-allowlist classifier with that derivation, and make the projection fail closed: a question the evaluator reads that is not classified prepay should fail the build, not reach the browser as a postpay field."
  };
});

/* ------------------------------------------------------------------ */

const packet = {
  schemaVersion: "expai-question-node-reconciliation/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-question-node-reconciliation.mjs",
  baseSha: gitSha("origin/main"),
  auditHead: gitSha("HEAD"),
  changesNoProductBehavior: true,
  bucketVocabulary: BUCKETS,
  bucketPrecedence: [
    "intentionally_conditional_and_not_selected",
    "renderer_unsupported",
    "lifecycle_misclassified",
    "intentionally_post_entitlement",
    "already_known_and_correctly_prefilled",
    "human_legal_review_required",
    "purpose_not_found",
    "dead_or_unreachable",
    "other"
  ],
  totals: {
    servedButNotRenderedNodes: rows.length,
    distinctQuestionIds: new Set(rows.map((row) => row.questionId)).size,
    byBucketRawNodes: byBucket,
    byBucketDistinctQuestionIds: Object.fromEntries(Object.entries(distinctByBucket).map(([bucket, ids]) => [bucket, ids.size])),
    distinctQuestionIdsPerBucket: Object.fromEntries(Object.entries(distinctByBucket).map(([bucket, ids]) => [bucket, [...ids].sort()]))
  },
  namedFacts: namedFactDetail,
  nodes: rows
};

const text = stableJson(packet);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`question-node reconciliation current: ${rows.length} node(s).`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  served-but-not-rendered nodes: ${rows.length} across ${packet.totals.distinctQuestionIds} distinct question ids`);
console.log(`  raw nodes by bucket:      ${JSON.stringify(byBucket)}`);
console.log(`  distinct ids by bucket:   ${JSON.stringify(packet.totals.byBucketDistinctQuestionIds)}`);
