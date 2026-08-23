#!/usr/bin/env node
// Inventory every reachable Expungement.ai question and classify its purpose.
//
//   node scripts/expungement-ai/flow-audit/build-question-inventory.mjs
//   node scripts/expungement-ai/flow-audit/build-question-inventory.mjs --check
//
// "Reachable" means: rendered as a consumer screen by the real screen
// derivation, or served as a packet-completion field the participant is asked to
// answer after payment. Raw source_question_* rows are the engine's evaluation
// surface and are recorded as unreachable rather than silently dropped.
//
// No question is removed, renamed, or rewritten here. The audit only reads.

import {
  read, exists, gitSha, writeArtifact, stableJson, EVALUATOR_TODAY,
  getAllJurisdictionProfiles, projectPublicProfile,
  deriveScreens, packetPlanForPathway
} from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/question-inventory.json";

/* ------------------------------------------------------------------ */
/* Product surfaces consulted for purpose evidence                     */
/* ------------------------------------------------------------------ */

const evaluatorSource = read("src/lib/rcap-engine/evaluator.ts");
const projectionSource = read("src/lib/rcap-engine/public-profile-projection.ts");
const reviewPageSource = read("src/app/briefcase/[packetId]/review/page.tsx");
const packetInformationSource = read("src/lib/expungement-ai/packet-information.ts");
const missingFieldsSource = read("src/lib/expungement-ai/missing-fields.ts");

/**
 * Field ids the evaluator reads by name in TypeScript, outside the compiled
 * rules. Three spellings are all real consumption and all count:
 *   answers.foo            direct property read
 *   answers["foo"]         quoted read
 *   answers[FOO_FIELD_ID]  read through a module constant
 */
const EVALUATOR_CONSTANT_FIELD_IDS = new Map(
  [...evaluatorSource.matchAll(/const ([A-Z][A-Z0-9_]*)\s*=\s*"([a-z0-9_]+)";/g)].map((m) => [m[1], m[2]])
);

const EVALUATOR_NAMED_FIELDS = new Set([
  ...[...evaluatorSource.matchAll(/answers\.([a-z0-9_]+)/g)].map((m) => m[1]),
  ...[...evaluatorSource.matchAll(/answers\["([a-z0-9_]+)"\]/g)].map((m) => m[1]),
  ...[...evaluatorSource.matchAll(/answers\[([A-Z][A-Z0-9_]*)\]/g)]
    .map((m) => EVALUATOR_CONSTANT_FIELD_IDS.get(m[1]))
    .filter(Boolean)
]);

/**
 * Field ids named as a waiting-period anchor in the evaluator's route-specific
 * timing. These decide a legal waiting period, so they are eligibility work even
 * though no compiled rule row lists them.
 */
const TIMING_ANCHOR_FIELDS = new Set(
  [...evaluatorSource.matchAll(/(?:timingFromAnchor|latestAnchorTiming)\([^)]*?((?:"[a-z0-9_]+"(?:\s*,\s*)?)+)/g)]
    .flatMap((m) => [...m[1].matchAll(/"([a-z0-9_]+)"/g)].map((inner) => inner[1]))
);

/** Field ids whose only named consumer is drop-point nudge or analytics copy. */
const NUDGE_ONLY_SOURCES = [
  "src/lib/expungement-ai/screening-drop-point-nudge-service.ts",
  "src/lib/expungement-ai/screening-drop-point-nudge-email.ts"
].filter(exists).map(read).join("\n");

/**
 * Field ids that gate a hard stop, an exclusion, or a route safety gate.
 *
 * Scoped to the named escalation functions only. An earlier, looser version of
 * this check matched any field mentioned anywhere near an escalation-shaped
 * function name and classified two thirds of the corpus as escalation, which is
 * not a classification — it is a rubber stamp.
 */
const ESCALATION_FUNCTION_NAMES = /^(hardStopReason|exclusionReason|ambiguityReason|routeSpecificSafetyGate|[a-z]{2}[A-Za-z0-9]*SafetyGate|mdPardonDeadlineSafetyGate|postTimingPolicyReason)\b/;

const ESCALATION_FIELD_IDS = (() => {
  const found = new Set();
  const blocks = evaluatorSource.split(/\nfunction /).slice(1);
  for (const block of blocks) {
    const name = block.slice(0, block.indexOf("("));
    if (!ESCALATION_FUNCTION_NAMES.test(name.trim())) continue;
    const body = block.slice(0, block.indexOf("\n}\n") === -1 ? block.length : block.indexOf("\n}\n"));
    for (const match of body.matchAll(/answers\.([a-z0-9_]+)/g)) found.add(match[1]);
    for (const match of body.matchAll(/answers\["([a-z0-9_]+)"\]/g)) found.add(match[1]);
  }
  return found;
})();

function isEscalationField(id) {
  return ESCALATION_FIELD_IDS.has(id);
}

/** The review page's human labels, and the tiny raw-value label map beside them. */
const REVIEW_ROW_FIELD_IDS = new Map(
  [...reviewPageSource.matchAll(/row\("([^"]+)",\s*"([a-z0-9_]+)"/g)].map((m) => [m[2], m[1]])
);
const REVIEW_VALUE_LABELS = new Set(
  [...(reviewPageSource.match(/const labels: Record<string, string> = \{[\s\S]*?\};/)?.[0] ?? "")
    .matchAll(/^\s*([a-z0-9_]+):/gm)].map((m) => m[1])
);
const MISSING_FIELD_LABELS = new Set(
  [...missingFieldsSource.matchAll(/^\s*([a-z0-9_]+):\s*[{"]/gm)].map((m) => m[1])
);

/**
 * The synthesized packet-completion questions. These never appear in a compiled
 * profile: `packetInformationModelFor` materializes them from the packet plan's
 * requiredInputIds, so an inventory built only from profile questions would miss
 * the fields where a participant types their name, county, court and contact
 * details. Parsed out of the product source rather than restated, so a prompt
 * change here is picked up rather than drifting.
 */
const FALLBACK_PACKET_QUESTIONS = (() => {
  const block = packetInformationSource.match(/const FALLBACK_PACKET_QUESTIONS: Record<string, ProfileQuestion> = \{([\s\S]*?)\n\};/)?.[1] ?? "";
  const out = new Map();
  for (const line of block.split("\n")) {
    const match = line.match(/^\s*([a-z0-9_]+):\s*packetQuestion\(\s*"([a-z0-9_]+)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"([a-z_]+)"(?:\s*,\s*(?:"((?:[^"\\]|\\.)*)"|undefined))?(?:\s*,\s*(\[[^\]]*\]))?/);
    if (!match) continue;
    out.set(match[2], {
      id: match[2],
      prompt: match[3].replace(/\\"/g, '"'),
      type: match[4],
      helperText: match[5] ? match[5].replace(/\\"/g, '"') : undefined,
      options: match[6] ? JSON.parse(match[6].replace(/'/g, '"')) : null,
      required: true,
      contextOnly: false,
      stage: "packet_information"
    });
  }
  return out;
})();

/** The generic shape `fallbackPacketQuestion` builds for an id with no table row. */
function genericPacketQuestion(id) {
  return {
    id,
    prompt: id.replaceAll("_", " ").replace(/^./, (first) => first.toUpperCase()),
    type: "text_or_unknown",
    helperText: "Enter the wording from your court or agency record when possible.",
    options: null,
    required: true,
    contextOnly: false,
    stage: "packet_information"
  };
}

/** Fields the packet-information model prefills, and where the value comes from. */
const PREFILL_FROM_SCREENING = new Set(
  [...packetInformationSource.matchAll(/screeningAnswers\.([a-z0-9_]+)/g)].map((m) => m[1])
);

/* ------------------------------------------------------------------ */
/* Sensitivity                                                         */
/* ------------------------------------------------------------------ */

const SENSITIVITY_RULES = [
  { level: "special_category", test: /trafficking|sex_offender|sexual|victim|domestic|mental_health|substance|treatment|hiv|immigration/i },
  { level: "identity_direct", test: /full_legal_name|contact_information|date_of_birth|dob|ssn|social_security|address|residency_or_location|email|phone/i },
  { level: "criminal_record", test: /charge|offense|conviction|case_outcome|disposition|arrest|sentence|probation|parole|pending_cases|prior_relief|expunge|seal|record_type|exclusion/i },
  { level: "court_identity", test: /county|court|case_number|docket|jurisdiction/i },
  { level: "low", test: /.*/ }
];

function sensitivityFor(question) {
  const haystack = `${question.id} ${question.prompt ?? ""}`;
  for (const rule of SENSITIVITY_RULES) if (rule.test.test(haystack)) return rule.level;
  return "low";
}

/* ------------------------------------------------------------------ */
/* Purpose classification                                              */
/* ------------------------------------------------------------------ */

const PURPOSES = [
  "supported_by_eligibility_rule",
  "supported_by_form_binding",
  "supported_by_packet_selection",
  "supported_by_escalation",
  "redundant_confirmation",
  "purpose_not_found",
  "human_legal_review_required"
];

/**
 * Exactly one purpose per question, decided in a fixed precedence order so the
 * classification is reproducible. Escalation outranks eligibility because a field
 * that hard-stops a participant is doing escalation work first and rule work
 * second; a reader auditing safety needs to see that.
 */
function classifyPurpose({ evidence }) {
  if (evidence.escalationGate) return "supported_by_escalation";
  if (
    evidence.eligibilityRuleIds.length > 0
    || evidence.waitingRuleIds.length > 0
    || evidence.exclusionRuleIds.length > 0
    || evidence.timingAnchorField
    || evidence.namedInEvaluatorSource
  ) {
    return "supported_by_eligibility_rule";
  }
  if (evidence.pathwayTriggerFor.length > 0 || evidence.steersPathwaySelection) return "supported_by_packet_selection";
  if (evidence.packetRequiredInputForPathways.length > 0 || evidence.namedInFormInventoryFields) return "supported_by_form_binding";
  if (evidence.duplicateOfFactId) return "redundant_confirmation";
  if (evidence.legalReviewSignal) return "human_legal_review_required";
  return "purpose_not_found";
}

/**
 * Facts collected twice under two ids. Recorded, never merged: merging is a
 * product change, and which id survives is a legal-content decision.
 */
const DUPLICATE_FACT_PAIRS = [
  ["sentence_completion_date", "sentence_completion_actual_date"],
  ["sentence_completion_date", "court_requirements_completed"],
  ["resolved_timing_bucket", "disposition_date"],
  ["offense_level", "offense_category"],
  ["residency_or_location", "contact_information"]
];

function duplicateOf(id, presentIds) {
  for (const [a, b] of DUPLICATE_FACT_PAIRS) {
    if (id === b && presentIds.has(a)) return a;
    if (id === a && presentIds.has(b) && !presentIds.has(a)) return b;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

const profiles = getAllJurisdictionProfiles();
const rows = [];
const sharedCounts = new Map();

// First pass: which question ids appear in more than one jurisdiction.
for (const profile of profiles) {
  const publicProfile = projectPublicProfile(profile);
  for (const question of publicProfile.questions) {
    if (!sharedCounts.has(question.id)) sharedCounts.set(question.id, new Set());
    sharedCounts.get(question.id).add(profile.jurisdiction.code);
  }
}

for (const profile of profiles.slice().sort((a, b) => a.jurisdiction.code.localeCompare(b.jurisdiction.code))) {
  const code = profile.jurisdiction.code;
  const publicProfile = projectPublicProfile(profile);
  const screens = deriveScreens(publicProfile);
  const screenOrder = new Map(screens.map((q, index) => [q.id, index + 1]));
  const presentIds = new Set(publicProfile.questions.map((q) => q.id));

  const packetRequiredByPathway = new Map();
  for (const pathway of profile.pathways) {
    const plan = packetPlanForPathway(profile, pathway.id);
    for (const inputId of plan?.requiredInputIds ?? []) {
      if (!packetRequiredByPathway.has(inputId)) packetRequiredByPathway.set(inputId, []);
      packetRequiredByPathway.get(inputId).push(pathway.id);
    }
  }
  const triggerByField = new Map();
  for (const pathway of profile.pathways) {
    for (const field of pathway.triggerFields ?? []) {
      if (!triggerByField.has(field)) triggerByField.set(field, []);
      triggerByField.get(field).push(pathway.id);
    }
  }

  const postPay = publicProfile.postPaymentPacketCompletion ?? {};
  const postPayIds = new Map();
  for (const [section, list] of Object.entries(postPay)) {
    for (const question of list ?? []) postPayIds.set(question.id, section);
  }

  // Packet-completion fields the participant is actually asked, materialized the
  // way `packetInformationModelFor` materializes them. Server facts
  // (`jurisdiction`, `pathway_id`) are never asked and are excluded.
  const SERVER_FACT_IDS = new Set(["jurisdiction", "pathway_id"]);
  const synthesizedPacketQuestions = [];
  for (const inputId of [...packetRequiredByPathway.keys()].sort()) {
    if (presentIds.has(inputId) || SERVER_FACT_IDS.has(inputId)) continue;
    synthesizedPacketQuestions.push(FALLBACK_PACKET_QUESTIONS.get(inputId) ?? genericPacketQuestion(inputId));
  }

  for (const question of [...publicProfile.questions, ...synthesizedPacketQuestions].slice().sort((a, b) => a.id.localeCompare(b.id))) {
    const synthesized = synthesizedPacketQuestions.some((candidate) => candidate.id === question.id);
    const isScreen = screenOrder.has(question.id);
    const postPaySection = postPayIds.get(question.id) ?? null;
    const evidence = {
      eligibilityRuleIds: (profile.orderedDecisionRules ?? [])
        .filter((rule) => (rule.when?.fieldsReferenced ?? []).includes(question.id))
        .map((rule) => rule.id).slice(0, 12),
      waitingRuleIds: (profile.waitingPeriodRules ?? [])
        .filter((rule) => (rule.fieldsReferenced ?? []).includes(question.id))
        .map((rule) => rule.id).slice(0, 12),
      exclusionRuleIds: (profile.exclusionRules ?? [])
        .filter((rule) => (rule.fieldsReferenced ?? []).includes(question.id))
        .map((rule) => rule.id).slice(0, 12),
      pathwayTriggerFor: (triggerByField.get(question.id) ?? []).slice(0, 12),
      packetRequiredInputForPathways: (packetRequiredByPathway.get(question.id) ?? []).slice(0, 12),
      namedInFormInventoryFields: (profile.packetGenerator.requiredInputs ?? []).includes(question.id),
      escalationGate: isEscalationField(question.id),
      namedInEvaluatorSource: EVALUATOR_NAMED_FIELDS.has(question.id),
      timingAnchorField: TIMING_ANCHOR_FIELDS.has(question.id),
      onlyConsumerIsDropPointNudge: !EVALUATOR_NAMED_FIELDS.has(question.id)
        && !TIMING_ANCHOR_FIELDS.has(question.id)
        && NUDGE_ONLY_SOURCES.includes(`"${question.id}"`),
      namedInProjectionSource: projectionSource.includes(`"${question.id}"`),
      duplicateOfFactId: duplicateOf(question.id, presentIds),
      legalReviewSignal: /special_preconditions_confirmed|route_family_detail|waiting_rule_id/.test(question.id),
      steersPathwaySelection: /selectPathway|matchCompiledRuleRoute/.test(
        evaluatorSource.split(`answers.${question.id}`).length > 1
          ? evaluatorSource.slice(Math.max(0, evaluatorSource.indexOf(`answers.${question.id}`) - 1200), evaluatorSource.indexOf(`answers.${question.id}`))
          : ""
      )
    };

    const purpose = classifyPurpose({ evidence });

    rows.push({
      jurisdiction: code,
      questionId: question.id,
      factKey: question.id,
      prompt: question.prompt,
      inputType: question.type,
      required: question.required === true,
      requiredCondition: question.contextOnly === true
        ? "never_blocks_continue (contextOnly)"
        : question.required === true
          ? "blocks_continue_until_answered_or_unknown_affordance_used"
          : "optional",
      order: isScreen ? screenOrder.get(question.id) : null,
      section: synthesized ? "post_payment:packet_information_builder" : isScreen ? question.stage : postPaySection ? `post_payment:${postPaySection}` : question.stage,
      reachability: synthesized
        ? "rendered_by_packet_information_builder"
        : isScreen
          ? "rendered_as_consumer_screen"
          : postPaySection
            ? "served_as_packet_completion_field"
            : question.id.startsWith("source_question")
              ? "engine_evaluation_surface_never_rendered"
              : "in_public_payload_not_rendered_for_this_state",
      questionSource: synthesized
        ? "synthesized_by_src/lib/expungement-ai/packet-information.ts (FALLBACK_PACKET_QUESTIONS / fallbackPacketQuestion)"
        : "public profile projection",
      prefilledAnswerSource: PREFILL_FROM_SCREENING.has(question.id)
        ? "carried_forward_from_screening_answers_by_packet-information.ts"
        : (packetRequiredByPathway.get(question.id) ?? []).length > 0
          ? "packet_information_initialAnswers (screening answer, prior save, or server fact)"
          : null,
      rulesConsumingTheAnswer: {
        orderedDecisionRules: evidence.eligibilityRuleIds,
        waitingPeriodRules: evidence.waitingRuleIds,
        exclusionRules: evidence.exclusionRuleIds,
        namedDirectlyInEvaluatorSource: evidence.namedInEvaluatorSource
      },
      formsConsumingTheAnswer: {
        packetRequiredInputForPathways: evidence.packetRequiredInputForPathways,
        inProfileRequiredInputs: evidence.namedInFormInventoryFields,
        officialFormFiles: evidence.namedInFormInventoryFields
          ? (profile.packetGenerator.formInventory ?? []).map((f) => f.fileName).slice(0, 6)
          : []
      },
      packetSelectionUse: evidence.pathwayTriggerFor.length > 0
        ? { isPathwayTrigger: true, pathwayIds: evidence.pathwayTriggerFor }
        : { isPathwayTrigger: false, pathwayIds: [] },
      helpCopy: {
        helperText: question.helperText ?? null,
        hasHelperText: Boolean(question.helperText),
        wilmaQuestionAware: false,
        wilmaNote: "WilmaBubble receives a page-level context only; no question id or prompt is passed. See src/components/expungement-ai/screening/ScreeningFlow.tsx (FlowFrame wilmaContext) and src/lib/expungement-ai/wilma-context.ts."
      },
      reviewFormatter: {
        hasHumanLabelOnReviewPage: REVIEW_ROW_FIELD_IDS.has(question.id),
        reviewPageLabel: REVIEW_ROW_FIELD_IDS.get(question.id) ?? null,
        hasRawValueFormatter: REVIEW_VALUE_LABELS.has(question.id),
        hasMissingFieldLabel: MISSING_FIELD_LABELS.has(question.id)
      },
      sensitivity: sensitivityFor(question),
      scope: synthesized
        ? "shared_all_jurisdictions_by_construction"
        : (sharedCounts.get(question.id)?.size ?? 0) >= 51
        ? "shared_all_jurisdictions"
        : (sharedCounts.get(question.id)?.size ?? 0) > 1
          ? "shared_subset"
          : "state_specific",
      jurisdictionsUsingThisId: sharedCounts.get(question.id)?.size ?? 0,
      purpose,
      purposeEvidence: evidence,
      optionsCount: Array.isArray(question.options) ? question.options.length : 0,
      hasSpanishPrompt: Boolean(question.translations?.es?.prompt)
    });
  }
}

/* ------------------------------------------------------------------ */
/* Totals                                                              */
/* ------------------------------------------------------------------ */

const purposeCounts = {};
for (const row of rows) purposeCounts[row.purpose] = (purposeCounts[row.purpose] ?? 0) + 1;
const reachabilityCounts = {};
for (const row of rows) reachabilityCounts[row.reachability] = (reachabilityCounts[row.reachability] ?? 0) + 1;
const sensitivityCounts = {};
for (const row of rows) sensitivityCounts[row.sensitivity] = (sensitivityCounts[row.sensitivity] ?? 0) + 1;
const scopeCounts = {};
for (const row of rows) scopeCounts[row.scope] = (scopeCounts[row.scope] ?? 0) + 1;

const uniqueQuestionIds = [...new Set(rows.map((r) => r.questionId))].sort();
const unclassified = rows.filter((row) => !PURPOSES.includes(row.purpose));

const inventory = {
  schemaVersion: "expai-question-inventory/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-question-inventory.mjs",
  baseSha: gitSha("origin/main"),
  evaluatorToday: EVALUATOR_TODAY,
  changesNoProductBehavior: true,
  purposeVocabulary: PURPOSES,
  purposePrecedence: [
    "supported_by_escalation",
    "supported_by_eligibility_rule",
    "supported_by_packet_selection",
    "supported_by_form_binding",
    "redundant_confirmation",
    "human_legal_review_required",
    "purpose_not_found"
  ],
  totals: {
    questionNodes: rows.length,
    uniqueQuestionIds: uniqueQuestionIds.length,
    jurisdictions: profiles.length,
    consumerScreenNodes: rows.filter((r) => r.reachability === "rendered_as_consumer_screen").length,
    packetCompletionNodes: rows.filter((r) => r.reachability === "served_as_packet_completion_field").length,
    packetInformationBuilderNodes: rows.filter((r) => r.reachability === "rendered_by_packet_information_builder").length,
    purposeCounts,
    reachabilityCounts,
    sensitivityCounts,
    scopeCounts,
    questionsWithoutAPurposeClassification: unclassified.length,
    questionsWithoutHelperText: rows.filter((r) => !r.helpCopy.hasHelperText).length,
    sensitiveQuestionsWithoutHelperText: rows.filter((r) => !r.helpCopy.hasHelperText && ["special_category", "identity_direct"].includes(r.sensitivity)).length,
    reviewedFieldsWithoutHumanLabel: rows.filter((r) => r.reachability === "rendered_by_packet_information_builder" && !r.reviewFormatter.hasHumanLabelOnReviewPage).length,
    freeTextControlledDataFields: rows.filter((r) => ["county", "court"].includes(r.questionId) && /text/.test(r.inputType)).length,
    multiFactSingleTextFields: rows.filter((r) => r.questionId === "contact_information").length
  },
  uniqueQuestionIds,
  questions: rows
};

const text = stableJson(inventory);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`question inventory current and deterministic: ${rows.length} node(s).`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  question nodes: ${rows.length}  unique ids: ${uniqueQuestionIds.length}`);
console.log(`  purposes: ${JSON.stringify(purposeCounts)}`);
console.log(`  reachability: ${JSON.stringify(reachabilityCounts)}`);
