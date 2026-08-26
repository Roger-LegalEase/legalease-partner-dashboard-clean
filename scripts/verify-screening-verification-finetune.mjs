#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = process.cwd();
const {
  selectScreeningQuestionIds,
  validateQuestionLifecycleMetadata
} = await import("../src/lib/rcap-engine/screening-question-selection.ts");
const {
  packetInformationPatch,
  packetVerificationState,
  requireCurrentPacketVerification
} = await import("../src/lib/expungement-ai/packet-information.ts");
const { assertCheckoutAllowed } = await import("../src/lib/expungement-ai/payment-adapter.ts");
const { assertPacketGenerationAllowed } = await import("../src/lib/expungement-ai/packet-generation.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");

const pathwayA = { id: "route-a", label: "Route A", summary: "A", sourceRef: "a" };
const pathwayB = { id: "route-b", label: "Route B", summary: "B", sourceRef: "b" };
const engineProfile = {
  schemaVersion: "test",
  profileVersion: "v1",
  jurisdiction: { code: "ZZ", name: "Test", slug: "test" },
  terminology: { primaryConsumerTerm: "relief", allowedStateTerms: ["relief"] },
  flowStages: [
    { order: 1, id: "scope", questionIds: ["ownership_scope"], screenType: "question_sequence" },
    { order: 2, id: "pathway_routing", questionIds: ["possible_pathway_context"], screenType: "question_sequence" },
    { order: 3, id: "special_pathways", questionIds: ["route_a_fact", "route_b_fact"], screenType: "question_sequence" },
    { order: 4, id: "case_details", questionIds: ["court"], screenType: "form_fields" }
  ],
  questions: [
    { id: "ownership_scope", stage: "scope", prompt: "Own?", type: "yes_no_unsure", required: true },
    { id: "possible_pathway_context", stage: "pathway_routing", prompt: "Route?", type: "single_choice", required: false, options: ["Route A", "Route B"] },
    { id: "route_a_fact", stage: "special_pathways", prompt: "A fact", type: "yes_no_unsure", required: false },
    { id: "route_b_fact", stage: "special_pathways", prompt: "B fact", type: "yes_no_unsure", required: false },
    { id: "court", stage: "case_details", prompt: "Court", type: "text", required: true }
  ],
  pathways: [pathwayA, pathwayB],
  orderedDecisionRules: [],
  packetGenerator: { architecture: "test", legacyGeneratorAllowed: false, genericLegalFallbackAllowed: false, pathways: [], requiredInputs: [] },
  copyGuardrails: [],
  questionLifecycle: {
    routeConsumers: { route_a_fact: ["route-a"], route_b_fact: ["route-b"] },
    exactPacketFactIds: ["court"],
    completionAliasIds: []
  }
};
const publicProfile = {
  schemaVersion: "test",
  profileVersion: "v1",
  jurisdiction: engineProfile.jurisdiction,
  terminology: engineProfile.terminology,
  flowStages: engineProfile.flowStages,
  questions: engineProfile.questions.map((question) => ({
    ...question,
    lifecyclePhase: "prepay_required"
  }))
};

assert.deepEqual(validateQuestionLifecycleMetadata(engineProfile), { ok: true });
const projectedQuestionProfile = structuredClone(engineProfile);
projectedQuestionProfile.questionLifecycle.routeConsumers.projected_route_fact = ["route-a"];
assert.deepEqual(
  validateQuestionLifecycleMetadata(projectedQuestionProfile, [...publicProfile.questions, { id: "projected_route_fact" }]),
  { ok: true },
  "projection-added route facts are valid machine questions"
);
assert.deepEqual(
  selectScreeningQuestionIds(engineProfile, publicProfile, {}),
  ["ownership_scope", "possible_pathway_context"],
  "empty progress must expose ordered universal questions only"
);
assert.deepEqual(
  selectScreeningQuestionIds(engineProfile, publicProfile, { possible_pathway_context: "Route A" }),
  ["ownership_scope", "possible_pathway_context", "route_a_fact"],
  "an exact label may expose only facts mapped to that pathway"
);
assert.deepEqual(
  selectScreeningQuestionIds(engineProfile, publicProfile, { possible_pathway_context: "route a" }),
  ["ownership_scope", "possible_pathway_context"],
  "non-exact labels must not infer a route"
);
assert.equal(new Set(selectScreeningQuestionIds(engineProfile, publicProfile, { possible_pathway_context: "Route A" })).size, 3);

const invalidProfile = structuredClone(engineProfile);
invalidProfile.questionLifecycle.routeConsumers.missing_question = ["route-a"];
assert.equal(validateQuestionLifecycleMetadata(invalidProfile).ok, false, "unknown metadata question IDs fail closed");
assert.throws(() => selectScreeningQuestionIds(invalidProfile, publicProfile, {}), /invalid question lifecycle metadata/i);

const requiredInputs = [
  "age_at_offense", "case_outcome", "charge", "contact_information", "county", "court",
  "disposition_date", "financial_obligations", "jurisdiction", "offense_category", "offense_level",
  "participant_full_legal_name", "pathway_id", "pending_cases", "prior_relief", "record_type",
  "residency_or_location", "sentence_completion_date", "trafficking_status"
];
const completePacketAnswers = {
  age_at_offense: { value: "30", unknown: false },
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  charge: { value: "Synthetic misdemeanor charge", unknown: false },
  contact_information: "100 Acceptance Way, Jackson, MS 39201",
  county: { value: "Hinds County", unknown: false },
  court: { value: "Hinds County Circuit Court", unknown: false },
  disposition_date: { value: "2015-01-15", unknown: false },
  financial_obligations: "Yes",
  offense_category: { value: "Misdemeanor", unknown: false },
  offense_level: "Misdemeanor",
  participant_full_legal_name: "Acceptance Consumer",
  pending_cases: "No",
  prior_relief: "No",
  record_type: "Arrest or charge",
  residency_or_location: { value: "Jackson, Mississippi", unknown: false },
  sentence_completion_date: "Yes",
  trafficking_status: "No"
};
const baseItem = {
  id: "matter-1",
  type: "result",
  title: "Matter",
  state: "MS",
  status: "packet_ready",
  resultCode: "packet_ready",
  createdAt: "2026-08-26T00:00:00.000Z",
  summary: "Possible path",
  nextSteps: [],
  paymentAllowed: true,
  packetReady: false,
  pathwayLabel: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
  packetType: "custom_pleading",
  paymentStatus: "unpaid",
  packetStatus: "not_started",
  artifactRefs: {
    commercialFlow: {
      version: 1,
      entitlementSource: "consumer_payment",
      screening: {
        profileVersion: "2026-06-19-source-conversion-1",
        screeningMatterId: "screening-1",
        pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
        pathwayLabel: "Non-conviction expungement for dismissal, no disposition, or acquittal",
        resultCode: "packet_ready",
        paymentAllowed: true,
        packetType: "custom_pleading",
        resultCode: "packet_ready",
        paymentAllowed: true,
        packetType: "custom_pleading",
        packetPlan: {
          pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
          mode: "state_specific_custom_packet_from_source_rules",
          formMappingStatus: "custom_or_manual_mapping_required",
          sourceFormIds: [],
          requiredInputIds: requiredInputs,
          sourceRuleRefs: ["pathways:15-155"]
        },
        answers: {
          ownership_scope: "Yes",
          jurisdiction_scope: "State or local",
          case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
          offense_level: "Misdemeanor",
          possible_pathway_context: "Non-conviction expungement for dismissal, no disposition, or acquittal",
          resolved_timing_bucket: "gt_10_years",
          court_requirements_completed: "yes"
        }
      },
      packetInformation: {
        stage: "in_progress",
        requiredInputIds: requiredInputs,
        serverFacts: { jurisdiction: "MS", pathway_id: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal" },
        prefilledAnswers: {}, answers: {}, missingInputIds: requiredInputs.filter((id) => !["jurisdiction", "pathway_id"].includes(id)), updatedAt: null, reviewedAt: null
      }
    }
  }
};

const incomplete = packetInformationPatch({ existingItem: baseItem, answers: { court: "Circuit Court" }, verify: false });
assert.equal(incomplete.patch.commercialFlow.packetInformation.stage, "in_progress");
assert.equal(incomplete.patch.commercialFlow.verification.status, "unverified");

const complete = packetInformationPatch({ existingItem: baseItem, answers: completePacketAnswers, verify: false });
assert.equal(complete.patch.commercialFlow.packetInformation.stage, "facts_complete");
assert.equal(complete.patch.commercialFlow.packetInformation.reviewedAt, null);
assert.equal(complete.patch.commercialFlow.verification.status, "unverified");
assert.equal(complete.reviewReason, "final_verification_required");

const verification = packetInformationPatch({ existingItem: baseItem, answers: completePacketAnswers, verify: true });
assert.equal(verification.patch.commercialFlow.packetInformation.stage, "ready_to_generate");
assert.equal(verification.patch.commercialFlow.verification.status, "verified");
assert.match(verification.patch.commercialFlow.verification.hash, /^[a-f0-9]{64}$/);
assert.equal(verification.patch.commercialFlow.verification.snapshot.schemaVersion, "expungement-ai/final-verification/v1");
assert.deepEqual(Object.keys(verification.patch.commercialFlow.verification.snapshot.screeningAnswers), Object.keys(baseItem.artifactRefs.commercialFlow.screening.answers).sort());
assert.deepEqual(Object.keys(verification.patch.commercialFlow.verification.snapshot.packetAnswers), Object.keys(completePacketAnswers).sort());
assert.deepEqual(Object.keys(verification.patch.commercialFlow.verification.snapshot.serverFacts), ["jurisdiction", "pathway_id"]);
assert.ok(verification.patch.commercialFlow.verification.snapshot.packetPlan, "packet plan dependency must be snapshotted");
assert.match(verification.patch.commercialFlow.verification.snapshot.profileAuthorityFingerprint, /^[a-f0-9]{64}$/);

const verifiedItem = structuredClone(baseItem);
verifiedItem.artifactRefs.commercialFlow.packetInformation = verification.patch.commercialFlow.packetInformation;
verifiedItem.artifactRefs.commercialFlow.verification = verification.patch.commercialFlow.verification;
assert.equal(packetVerificationState(verifiedItem).status, "verified");
assert.doesNotThrow(() => requireCurrentPacketVerification(verifiedItem));
assert.doesNotThrow(() => assertCheckoutAllowed(verifiedItem));
assert.doesNotThrow(() => assertPacketGenerationAllowed({ ...verifiedItem, paymentStatus: "paid" }));

const treatmentChangedItem = structuredClone(verifiedItem);
treatmentChangedItem.selectedTrackId = "different-server-track";
assert.equal(packetVerificationState(treatmentChangedItem).status, "invalidated", "server treatment dependencies invalidate verification");
const planChangedItem = structuredClone(verifiedItem);
planChangedItem.artifactRefs.commercialFlow.screening.packetPlan.mode = "official_form_overlay_or_source_form_set";
assert.equal(packetVerificationState(planChangedItem).status, "invalidated", "packet-plan dependencies invalidate verification");
const liveProfile = getProfileByJurisdiction("MS");
assert.ok(liveProfile?.orderedDecisionRules.length, "fixture profile must expose machine rules");
const originalLifecycle = liveProfile.questionLifecycle;
liveProfile.questionLifecycle = {
  routeConsumers: { ...(originalLifecycle?.routeConsumers ?? {}) },
  exactPacketFactIds: [...(originalLifecycle?.exactPacketFactIds ?? []), liveProfile.questions[0].id],
  completionAliasIds: [...(originalLifecycle?.completionAliasIds ?? [])]
};
try {
  assert.equal(packetVerificationState(verifiedItem).status, "invalidated", "machine-authority changes invalidate without a version bump");
} finally {
  liveProfile.questionLifecycle = originalLifecycle;
}

const invalidated = packetInformationPatch({ existingItem: verifiedItem, answers: { court: "Different Court" }, verify: false });
const invalidatedItem = structuredClone(verifiedItem);
invalidatedItem.artifactRefs.commercialFlow.packetInformation = invalidated.patch.commercialFlow.packetInformation;
invalidatedItem.artifactRefs.commercialFlow.verification = invalidated.patch.commercialFlow.verification;
assert.equal(packetVerificationState(invalidatedItem).status, "invalidated");
assert.equal(invalidated.patch.commercialFlow.verification.hash, undefined, "an invalidated record must not expose a reusable current hash");
assert.throws(() => requireCurrentPacketVerification(invalidatedItem), /current final verification/i);
assert.throws(() => assertCheckoutAllowed(invalidatedItem), /verification/i);
assert.throws(() => assertPacketGenerationAllowed({ ...invalidatedItem, paymentStatus: "paid" }), /verification/i);

const progressRoute = fs.readFileSync(path.join(root, "src/app/api/expungement-ai/screening/progress/route.ts"), "utf8");
for (const forbidden of ["paymentAllowed", "packetPlan", "sponsorship", "pathwayId", "selectedTrackId"]) {
  assert.ok(!progressRoute.includes(forbidden), `progress route must not expose ${forbidden}`);
}

for (const file of [
  "src/lib/expungement-ai/payment-adapter.ts",
  "src/lib/expungement-ai/checkout-reconciliation.ts",
  "src/lib/expungement-ai/packet-generation.ts",
  "src/lib/expungement-ai/consumer-render-request.ts",
  "src/app/api/expungement-ai/packet/generate/route.ts"
]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  assert.ok(source.includes("requireCurrentPacketVerification"), `${file} must independently bind to current final verification`);
}
const sponsoredGenerationRoute = fs.readFileSync(path.join(root, "src/app/api/expungement-ai/packet/generate/route.ts"), "utf8");
assert.ok(
  sponsoredGenerationRoute.lastIndexOf("requireCurrentPacketVerification") < sponsoredGenerationRoute.indexOf("recordPartnerPacketGeneration(partnerSessionId)"),
  "sponsored generation must recheck the current verification immediately before slot consumption"
);

console.log("screening-verification-finetune: OK");
