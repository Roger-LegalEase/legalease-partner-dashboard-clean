#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"
]) delete process.env[name];

const root = process.cwd();
const {
  selectScreeningQuestionIds,
  validateQuestionLifecycleMetadata
} = await import("../src/lib/rcap-engine/screening-question-selection.ts");
const {
  packetInformationModelFor,
  packetInformationPatch: derivePacketInformationPatch,
  packetVerificationState,
  requireCurrentPacketVerificationRecord
} = await import("../src/lib/expungement-ai/packet-information.ts");
const defaultProtectedVerification = {
  status: "unverified",
  reason: "final_verification_not_completed",
  revision: 0
};
const packetInformationPatch = (input) => derivePacketInformationPatch({
  protectedVerification: defaultProtectedVerification,
  ...input
});
const { assertCheckoutAllowed } = await import("../src/lib/expungement-ai/payment-adapter.ts");
const {
  consumerPacketStatusForItem,
  generatePaidConsumerPacket,
  mergePacketArtifactEnvelope,
  readyPacketArtifactAccess
} = await import("../src/lib/expungement-ai/packet-generation.ts");
const {
  getBriefcaseItem,
  mergeBriefcaseArtifactRefs,
  saveScreeningResultToBriefcase,
  updateBriefcasePacketMetadata
} = await import("../src/lib/expungement-ai/briefcase.ts");
const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const {
  PACKET_VERIFICATION_CAS_CALL_SITES,
  PACKET_VERIFICATION_CAS_HANDOFF,
  assertExpectedPacketVerificationHash
} = await import("../src/lib/expungement-ai/verification-cas.ts");
const { finalizeSponsoredPacketGeneration } = await import("../src/lib/expungement-ai/rcap-slot-lifecycle.ts");

assert.deepEqual(Object.keys(PACKET_VERIFICATION_CAS_HANDOFF), [
  "verification_persistence",
  "artifact_authority",
  "checkout_binding",
  "payment_entitlement",
  "artifact_attach",
  "render_enqueue",
  "sponsored_slot_consumption"
]);
for (const [name, point] of Object.entries(PACKET_VERIFICATION_CAS_HANDOFF)) {
  if (name !== "verification_persistence" && name !== "artifact_authority") {
    assert.equal(point.expectedHashParameter, "p_expected_verification_hash");
  }
  assert.ok(point.rpcName, "every concurrency boundary names its captain-owned RPC");
}
assert.equal(PACKET_VERIFICATION_CAS_HANDOFF.verification_persistence.rpcName, "persist_consumer_packet_verification");
assert.deepEqual(PACKET_VERIFICATION_CAS_HANDOFF.verification_persistence.atomicPayloadParameters, [
  "p_consumer_auth_user_id",
  "p_briefcase_item_id",
  "p_expected_prior_hash",
  "p_expected_prior_revision",
  "p_answer_delta",
  "p_packet_information_metadata",
  "p_next_verification_status",
  "p_next_verification_reason",
  "p_next_verification_hash",
  "p_next_verification_snapshot",
  "p_next_verification_invalidated_at"
]);
assert.equal(PACKET_VERIFICATION_CAS_HANDOFF.artifact_authority.rpcName, "get_consumer_packet_artifact_authority");
assert.equal(PACKET_VERIFICATION_CAS_HANDOFF.render_enqueue.rpcName, "enqueue_verified_consumer_packet_render");
assert.deepEqual(PACKET_VERIFICATION_CAS_HANDOFF.render_enqueue.atomicPayloadParameters, [
  "p_packet_id",
  "p_route_id",
  "p_renderer_kind",
  "p_renderer_version",
  "p_source_sha256",
  "p_profile_id",
  "p_profile_version",
  "p_input_hash",
  "p_briefcase_item_id",
  "p_person_id",
  "p_matter_id",
  "p_max_attempts",
  "p_consumer_briefcase_item_id",
  "p_expected_consumer_auth_user_id",
  "p_expected_verification_hash",
  "p_render_packet",
  "p_render_input_payload"
]);
assert.equal(PACKET_VERIFICATION_CAS_HANDOFF.sponsored_slot_consumption.rpcName, "finalize_sponsored_packet_generation_if_verified");
assert.deepEqual(Object.keys(PACKET_VERIFICATION_CAS_CALL_SITES), Object.keys(PACKET_VERIFICATION_CAS_HANDOFF));
assert.doesNotMatch(PACKET_VERIFICATION_CAS_CALL_SITES.payment_entitlement.currentMutation, /missing|does not yet send/i);
const checkoutSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/payment-adapter.ts"), "utf8");
assert.ok(
  checkoutSource.includes('if (session.status === "open") await stripe.checkout.sessions.expire(session.id);'),
  "a Checkout Session created before a refused binding CAS must be expired"
);
assert.ok(
  /if \(bindingResult\.outcome === "refused" && reusable\.status === "open"\) \{\s*await stripe\.checkout\.sessions\.expire\(reusable\.id\);/.test(checkoutSource),
  "a reused open Checkout Session must also be expired when binding CAS refuses"
);
assert.ok(checkoutSource.includes("pathway_id: binding.pathwayId"), "Stripe metadata binds the protected machine pathway id");
assert.ok(!checkoutSource.includes("pathway_label: item.pathwayLabel"), "Stripe metadata cannot trust the writable human pathway label");
assert.ok(!checkoutSource.includes("reviewed_input_hash"), "the obsolete participant-JSON hash contract is removed from Stripe metadata");
assert.ok(
  checkoutSource.includes("${CONSUMER_PACKET_PRODUCT_ID}:${itemId}:${verificationHash}:${verificationRevision}:${previousSessionId ?? \"initial\"}"),
  "Stripe idempotency converges concurrent requests and advances only with protected authority"
);
assert.ok(!checkoutSource.includes("randomUUID()"), "concurrent checkout requests cannot mint unrelated Stripe Sessions");
assert.ok(checkoutSource.includes('if (session.status !== "open" || !session.url)'), "an expired or unusable created Session fails before binding");
assert.ok(checkoutSource.includes('if (existing.status === "complete")'), "a completed paid Session blocks replacement checkout during webhook lag");
assert.ok(
  checkoutSource.indexOf('if (existing.status === "complete")') < checkoutSource.indexOf("requireCurrentPacketVerification(userId, item)"),
  "completed provider payment evidence returns before current verification or any new-commerce work"
);
const checkoutGuardSource = checkoutSource.slice(
  checkoutSource.indexOf("function assertNotExactDeferral"),
  checkoutSource.indexOf("export function isConsumerCheckoutDryRunEnabled")
);
for (const protectedDependency of [
  "snapshot.jurisdiction",
  "snapshot.pathwayId",
  "snapshot.selectedTrackId",
  "snapshot.treatmentClassification",
  "snapshot.deferralComponentIds",
  "snapshot.packetType",
  "snapshot.resultCode",
  "snapshot.paymentAllowed"
]) {
  assert.ok(checkoutGuardSource.includes(protectedDependency), `checkout guard binds protected ${protectedDependency}`);
}
for (const forbidden of ["item.pathwayLabel", "item.artifactRefs", "item.selectedTrackId", "item.treatmentClassification"]) {
  assert.ok(!checkoutGuardSource.includes(forbidden), `checkout guard cannot trust writable ${forbidden}`);
}
assert.ok(
  checkoutGuardSource.includes("exactDeferralForPathway(snapshot.jurisdiction, snapshot.pathwayId)"),
  "exact-deferral checkout suppression binds the protected jurisdiction/pathway pair"
);
const verificationCasSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/verification-cas.ts"), "utf8");
for (const rpc of [
  "get_consumer_packet_verification_authority",
  "persist_consumer_packet_verification",
  "get_consumer_packet_artifact_authority",
  "attach_consumer_packet_artifact_if_verified"
]) {
  assert.ok(verificationCasSource.includes(`rpc("${rpc}"`), `application must call protected RPC ${rpc}`);
}
for (const parameter of [
  "p_expected_prior_hash",
  "p_expected_prior_revision",
  "p_answer_delta",
  "p_packet_information_metadata",
  "p_next_verification_status",
  "p_next_verification_hash",
  "p_next_verification_snapshot"
]) {
  assert.ok(verificationCasSource.includes(parameter), `verification transition must send ${parameter}`);
}
const protectedPersistenceRpcSource = verificationCasSource.slice(
  verificationCasSource.indexOf('rpc("persist_consumer_packet_verification"'),
  verificationCasSource.indexOf("if (error)", verificationCasSource.indexOf('rpc("persist_consumer_packet_verification"'))
);
assert.ok(
  protectedPersistenceRpcSource.includes("p_expected_prior_revision: input.transition.expectedPriorRevision"),
  "protected persistence sends the exact revision read before canonical rederivation"
);
const packetInformationRouteSource = fs.readFileSync(path.join(root, "src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts"), "utf8");
const packetInformationSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/packet-information.ts"), "utf8");
assert.ok(packetInformationSource.includes("protectedVerification: ProtectedPacketVerificationRecord;"));
assert.ok(!packetInformationSource.includes("protectedVerification?:"), "packet transition derivation cannot default missing protected authority");
assert.ok(packetInformationRouteSource.includes("readProtectedPacketVerification("));
assert.ok(packetInformationRouteSource.includes("persistProtectedPacketVerification("));
assert.ok(!packetInformationRouteSource.includes("mergeBriefcaseArtifactRefs("), "verification facts and protected transition must share one CAS RPC");
const consumerPaymentAuthoritySource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/consumer-payment-authority.ts"), "utf8");
assert.ok(consumerPaymentAuthoritySource.includes('rpc("bind_consumer_checkout_verification"'));
assert.ok(consumerPaymentAuthoritySource.includes("p_expected_verification_hash: input.expectedVerificationHash"));
assert.ok(!consumerPaymentAuthoritySource.includes('.from("consumer_briefcase_items")\n    .update('), "checkout binding cannot use a direct UPDATE");
assert.ok(consumerPaymentAuthoritySource.includes("p_expected_verification_hash: input.expectedVerificationHash"), "payment and checkout RPCs send the exact protected hash");
assert.equal(assertExpectedPacketVerificationHash("a".repeat(64)), "a".repeat(64));
assert.throws(() => assertExpectedPacketVerificationHash("participant-controlled"), /verification hash/i);

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

const noLifecycleProfile = structuredClone(engineProfile);
delete noLifecycleProfile.questionLifecycle;
assert.deepEqual(
  selectScreeningQuestionIds(noLifecycleProfile, publicProfile, { possible_pathway_context: "Route A" }),
  ["ownership_scope", "possible_pathway_context"],
  "missing lifecycle authority must expose universal questions only"
);

const allProfiles = getAllJurisdictionProfiles();
assert.equal(allProfiles.length, 51, "real fail-closed coverage includes 50 states plus DC");
for (const profile of allProfiles) {
  if (profile.questionLifecycle) continue; // State shards add exact post-integration proofs.
  const projected = projectPublicProfile(profile);
  const pathwayQuestion = projected.questions.find((question) => question.id === "possible_pathway_context");
  const exactLabel = pathwayQuestion?.options?.find((option) => typeof option === "string") ?? "";
  const universal = selectScreeningQuestionIds(profile, projected, {});
  const attemptedRoute = selectScreeningQuestionIds(profile, projected, { possible_pathway_context: exactLabel });
  assert.deepEqual(attemptedRoute, universal, `${profile.jurisdiction.code} missing metadata cannot unlock route facts`);
  const stageOrder = new Map(projected.flowStages.map((stage) => [stage.id, stage.order]));
  const routingOrder = stageOrder.get("pathway_routing") ?? Number.NEGATIVE_INFINITY;
  const postRoutingIds = projected.questions
    .filter((question) => (stageOrder.get(question.stage) ?? Number.MAX_SAFE_INTEGER) > routingOrder)
    .map((question) => question.id);
  assert.equal(
    attemptedRoute.some((id) => postRoutingIds.includes(id)),
    false,
    `${profile.jurisdiction.code} missing metadata withholds post-routing/exact packet facts`
  );
}

const invalidProfile = structuredClone(engineProfile);
invalidProfile.questionLifecycle.routeConsumers.missing_question = ["route-a"];
assert.equal(validateQuestionLifecycleMetadata(invalidProfile).ok, false, "unknown metadata question IDs fail closed");
assert.throws(() => selectScreeningQuestionIds(invalidProfile, publicProfile, {}), /invalid question lifecycle metadata/i);

const screeningAnswers = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  offense_level: "Misdemeanor",
  possible_pathway_context: "Non-conviction expungement for dismissal, no disposition, or acquittal",
  resolved_timing_bucket: "gt_10_years",
  court_requirements_completed: "yes"
};
const authoritativeFixture = evaluateAuthoritativeScreeningResult({
  jurisdiction: "MS",
  profileVersion: "2026-06-19-source-conversion-1",
  matterId: "matter-1",
  answers: screeningAnswers
});
const requiredInputs = authoritativeFixture.evaluation.packetPlan.requiredInputIds;
const compiledChecklistPlan = packetPlanForPathway(
  getProfileByJurisdiction(authoritativeFixture.evaluation.jurisdiction),
  authoritativeFixture.evaluation.pathwayId
);
assert.ok(compiledChecklistPlan?.packetReadyWhen.length, "compiled packet plan carries its route-specific readiness checklist into protected verification");
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
  resultCode: authoritativeFixture.evaluation.resultCode,
  createdAt: "2026-08-26T00:00:00.000Z",
  summary: "Possible path",
  nextSteps: [],
  paymentAllowed: true,
  packetReady: false,
  pathwayLabel: "Non-conviction expungement for dismissal, no disposition, or acquittal",
  packetType: authoritativeFixture.packetType,
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
        resultCode: authoritativeFixture.evaluation.resultCode,
        paymentAllowed: authoritativeFixture.evaluation.paymentAllowed,
        packetType: authoritativeFixture.packetType,
        packetPlan: authoritativeFixture.evaluation.packetPlan,
        answers: screeningAnswers
      },
      packetInformation: {
        stage: "in_progress",
        requiredInputIds: requiredInputs,
        serverFacts: {
          jurisdiction: "MS",
          pathway_id: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
          server_confirmed_balance: "Satisfied",
          court: "Forged Server Court",
          participant_full_legal_name: "Forged Server Name"
        },
        prefilledAnswers: {}, answers: {}, missingInputIds: requiredInputs.filter((id) => !["jurisdiction", "pathway_id"].includes(id)), updatedAt: null, reviewedAt: null
      }
    }
  }
};

const forgedRequiredServerFactItem = structuredClone(baseItem);
const forgedRequiredServerFactAnswers = { ...completePacketAnswers };
delete forgedRequiredServerFactAnswers.court;
delete forgedRequiredServerFactAnswers.participant_full_legal_name;
const forgedRequiredServerFactModel = packetInformationModelFor(forgedRequiredServerFactItem);
assert.ok(forgedRequiredServerFactModel.questions.some((question) => question.id === "court"), "a forged server court cannot hide its participant question");
assert.ok(forgedRequiredServerFactModel.questions.some((question) => question.id === "participant_full_legal_name"), "a forged server name cannot hide its participant question");
assert.deepEqual(Object.keys(forgedRequiredServerFactModel.serverFacts), ["jurisdiction", "pathway_id"]);
const forgedRequiredServerFactVerification = packetInformationPatch({
  existingItem: forgedRequiredServerFactItem,
  answers: forgedRequiredServerFactAnswers,
  verify: true
});
assert.equal(forgedRequiredServerFactVerification.readyToGenerate, false, "forged server facts cannot complete participant-required inputs");
assert.ok(forgedRequiredServerFactVerification.missingInputIds.includes("court"));
assert.ok(forgedRequiredServerFactVerification.missingInputIds.includes("participant_full_legal_name"));

const incomplete = packetInformationPatch({ existingItem: baseItem, answers: { court: "Circuit Court" }, verify: false });
assert.equal(incomplete.patch.commercialFlow.packetInformation.stage, "in_progress");
assert.equal(incomplete.patch.commercialFlow.verification.status, "unverified");

const complete = packetInformationPatch({ existingItem: baseItem, answers: completePacketAnswers, verify: false });
assert.equal(complete.patch.commercialFlow.packetInformation.stage, "facts_complete");
assert.equal(complete.patch.commercialFlow.packetInformation.reviewedAt, null);
assert.equal(complete.patch.commercialFlow.verification.status, "unverified");
assert.equal(complete.reviewReason, "final_verification_required");

const verification = packetInformationPatch({ existingItem: baseItem, answers: completePacketAnswers, verify: true });
assert.equal(verification.reviewReason, "authoritative_route_confirmed");
assert.equal(verification.patch.commercialFlow.packetInformation.stage, "ready_to_generate");
assert.equal(verification.patch.commercialFlow.verification.status, "verified");
assert.match(verification.patch.commercialFlow.verification.hash, /^[a-f0-9]{64}$/);
assert.equal(verification.patch.commercialFlow.verification.snapshot.schemaVersion, "expungement-ai/final-verification/v1");
assert.deepEqual(Object.keys(verification.patch.commercialFlow.verification.snapshot.screeningAnswers), Object.keys(baseItem.artifactRefs.commercialFlow.screening.answers).sort());
assert.deepEqual(Object.keys(verification.patch.commercialFlow.verification.snapshot.packetAnswers), Object.keys(completePacketAnswers).sort());
assert.deepEqual(Object.keys(verification.patch.commercialFlow.verification.snapshot.serverFacts), ["jurisdiction", "pathway_id"]);
assert.ok(verification.patch.commercialFlow.verification.snapshot.packetPlan, "packet plan dependency must be snapshotted");
assert.deepEqual(
  verification.patch.commercialFlow.verification.snapshot.packetPlan.packetReadyWhen,
  compiledChecklistPlan.packetReadyWhen,
  "protected verification snapshots carry the route-specific compiled readiness checklist"
);
assert.match(verification.patch.commercialFlow.verification.snapshot.profileAuthorityFingerprint, /^[a-f0-9]{64}$/);
const legacyPlanWithoutChecklist = structuredClone(baseItem);
delete legacyPlanWithoutChecklist.artifactRefs.commercialFlow.screening.packetPlan.packetReadyWhen;
const verifiedLegacyPlan = packetInformationPatch({
  existingItem: legacyPlanWithoutChecklist,
  answers: completePacketAnswers,
  verify: true
});
assert.equal(verifiedLegacyPlan.reviewReason, "authoritative_route_confirmed", "legacy stored plans remain verifiable without a writable-JSON checklist backfill");
assert.deepEqual(verifiedLegacyPlan.patch.commercialFlow.verification.snapshot.packetPlan.packetReadyWhen, compiledChecklistPlan.packetReadyWhen);
const forgedWritableChecklist = structuredClone(baseItem);
forgedWritableChecklist.artifactRefs.commercialFlow.screening.packetPlan.packetReadyWhen = ["participant-forged instruction"];
const verifiedForgedChecklist = packetInformationPatch({
  existingItem: forgedWritableChecklist,
  answers: completePacketAnswers,
  verify: true
});
assert.ok(!verifiedForgedChecklist.patch.commercialFlow.verification.snapshot.packetPlan.packetReadyWhen.includes("participant-forged instruction"));
const forgedJsonVerificationBeforeProtected = structuredClone(baseItem);
forgedJsonVerificationBeforeProtected.artifactRefs.commercialFlow.verification = verification.patch.commercialFlow.verification;
const firstProtectedFactSave = packetInformationPatch({
  existingItem: forgedJsonVerificationBeforeProtected,
  answers: { court: "Circuit Court" },
  verify: false,
  protectedVerification: { status: "unverified", reason: "final_verification_not_completed", revision: 0 }
});
assert.equal(
  firstProtectedFactSave.patch.commercialFlow.verification.status,
  "unverified",
  "participant JSON cannot forge a prior verified record and force a protected invalidation transition"
);

const sponsoredBaseItem = structuredClone(baseItem);
sponsoredBaseItem.paymentAllowed = false;
sponsoredBaseItem.paymentStatus = "not_applicable";
sponsoredBaseItem.sourceSessionId = "verified-partner-session";
sponsoredBaseItem.artifactRefs.commercialFlow.entitlementSource = "partner_sponsorship";
const sponsoredVerification = packetInformationPatch({ existingItem: sponsoredBaseItem, answers: completePacketAnswers, verify: true });
assert.equal(sponsoredVerification.patch.commercialFlow.verification.status, "verified", "sponsorship suppresses Stripe without changing evaluator packet authority");
const sponsoredVerifiedItem = structuredClone(sponsoredBaseItem);
sponsoredVerifiedItem.artifactRefs.commercialFlow.packetInformation = sponsoredVerification.patch.commercialFlow.packetInformation;
sponsoredVerifiedItem.artifactRefs.commercialFlow.verification = sponsoredVerification.patch.commercialFlow.verification;
assert.doesNotThrow(() => requireCurrentPacketVerificationRecord(
  sponsoredVerifiedItem,
  { ...sponsoredVerification.patch.commercialFlow.verification, revision: 1 }
));

const forgedPlanItem = structuredClone(baseItem);
forgedPlanItem.artifactRefs.commercialFlow.screening.packetPlan.mode = "official_form_overlay_or_source_form_set";
const forgedPlanVerification = packetInformationPatch({ existingItem: forgedPlanItem, answers: completePacketAnswers, verify: true });
assert.equal(forgedPlanVerification.readyToGenerate, false, "stored packet plans must exactly match current evaluator authority");
const removedRequiredItem = structuredClone(baseItem);
removedRequiredItem.artifactRefs.commercialFlow.packetInformation.requiredInputIds = requiredInputs.filter((id) => id !== "court");
const removedRequiredVerification = packetInformationPatch({ existingItem: removedRequiredItem, answers: completePacketAnswers, verify: true });
assert.equal(removedRequiredVerification.readyToGenerate, false, "stored required-input ids must exactly match current packet authority");
const forgedAuthorityCases = [
  ["pathway", "stored_pathway_mismatch", (item) => { item.artifactRefs.commercialFlow.screening.pathwayId = "forged-pathway"; }],
  ["result", "stored_result_mismatch", (item) => { item.artifactRefs.commercialFlow.screening.resultCode = "packet_ready"; }],
  ["payment", "stored_payment_authority_mismatch", (item) => { item.artifactRefs.commercialFlow.screening.paymentAllowed = false; }],
  ["packet type", "stored_packet_type_mismatch", (item) => { item.artifactRefs.commercialFlow.screening.packetType = "official_pdf_overlay"; }],
  ["server jurisdiction", "stored_server_fact_mismatch", (item) => { item.artifactRefs.commercialFlow.packetInformation.serverFacts.jurisdiction = "CA"; }],
  ["server pathway", "stored_server_fact_mismatch", (item) => { item.artifactRefs.commercialFlow.packetInformation.serverFacts.pathway_id = "forged-pathway"; }]
];
for (const [label, reason, mutate] of forgedAuthorityCases) {
  const forgedItem = structuredClone(baseItem);
  mutate(forgedItem);
  const forgedVerification = packetInformationPatch({ existingItem: forgedItem, answers: completePacketAnswers, verify: true });
  assert.equal(forgedVerification.readyToGenerate, false, `participant-writable ${label} authority must fail closed`);
  assert.equal(forgedVerification.reviewReason, reason);
}

const verifiedItem = structuredClone(baseItem);
verifiedItem.artifactRefs.commercialFlow.packetInformation = verification.patch.commercialFlow.packetInformation;
verifiedItem.artifactRefs.commercialFlow.verification = verification.patch.commercialFlow.verification;
const protectedVerification = { ...verification.patch.commercialFlow.verification, revision: 7 };
const verifiedModel = packetInformationModelFor(verifiedItem);
const snapshot = verification.patch.commercialFlow.verification.snapshot;
const expectedSummaryKeys = ["screeningAnswers", "prefilledAnswers", "packetAnswers", "serverFacts"]
  .flatMap((source) => Object.keys(snapshot[source]).sort().map((id) => `${source}:${id}`));
assert.deepEqual(
  verifiedModel.verificationSummary.map((fact) => fact.key),
  expectedSummaryKeys,
  "every hashed participant fact must appear once in canonical source/id order"
);
assert.equal(verifiedModel.verificationSummary.some((fact) => fact.key === "serverFacts:server_confirmed_balance"), false);
assert.equal(verifiedModel.verificationSummary.find((fact) => fact.key === "serverFacts:jurisdiction")?.systemContext, true);
assert.equal(verifiedModel.verificationSummary.find((fact) => fact.key === "serverFacts:pathway_id")?.systemContext, true);
const expectedContextKeys = Object.keys(snapshot)
  .filter((key) => !["screeningAnswers", "prefilledAnswers", "packetAnswers", "serverFacts"].includes(key))
  .sort();
assert.deepEqual(verifiedModel.verificationContext.map((entry) => entry.key), expectedContextKeys);
for (const entry of verifiedModel.verificationContext) {
  assert.deepEqual(entry.value, snapshot[entry.key], `system context ${entry.key} matches the canonical snapshot dependency`);
}
assert.deepEqual(verifiedModel.verificationManifest.factKeys, expectedSummaryKeys);
assert.deepEqual(verifiedModel.verificationManifest.systemContextKeys, expectedContextKeys);
assert.equal(packetVerificationState(verifiedItem).status, "verified");
assert.throws(
  () => requireCurrentPacketVerificationRecord(verifiedItem, null),
  /protected/i,
  "participant-writable JSON verification is never commerce authority"
);
assert.doesNotThrow(() => requireCurrentPacketVerificationRecord(verifiedItem, protectedVerification));
const forgedVerificationMirror = structuredClone(verifiedItem);
forgedVerificationMirror.artifactRefs.commercialFlow.verification.hash = "f".repeat(64);
assert.equal(
  requireCurrentPacketVerificationRecord(forgedVerificationMirror, protectedVerification).hash,
  protectedVerification.hash,
  "protected verification wins over a forged JSON mirror"
);
const changedDisplayItem = { ...verifiedItem, summary: "Attacker summary", nextSteps: ["Attacker instruction"] };
assert.equal(
  requireCurrentPacketVerificationRecord(changedDisplayItem, protectedVerification).hash,
  protectedVerification.hash,
  "writable summary and nextSteps are outside verification and cannot influence render authority"
);
assert.doesNotThrow(() => assertCheckoutAllowed(protectedVerification.snapshot));

const noOpSave = packetInformationPatch({
  existingItem: verifiedItem,
  answers: { court: completePacketAnswers.court },
  verify: false,
  protectedVerification
});
assert.equal(noOpSave.patch.commercialFlow.verification.status, "verified", "a semantic no-op save preserves current verification");
assert.equal(noOpSave.patch.commercialFlow.verification.hash, verification.patch.commercialFlow.verification.hash);
assert.equal(noOpSave.patch.commercialFlow.packetInformation.stage, "ready_to_generate");
const forgedNoOpMetadataItem = structuredClone(verifiedItem);
forgedNoOpMetadataItem.artifactRefs.commercialFlow.packetInformation.participantExtension = "must-not-persist";
const canonicalNoOpSave = packetInformationPatch({
  existingItem: forgedNoOpMetadataItem,
  answers: { court: completePacketAnswers.court },
  verify: false,
  protectedVerification
});
assert.deepEqual(Object.keys(canonicalNoOpSave.protectedTransition.packetInformationMetadata), [
  "stage",
  "requiredInputIds",
  "serverFacts",
  "prefilledAnswers",
  "missingInputIds",
  "updatedAt",
  "reviewedAt",
  "reviewSafety"
]);
assert.ok(!("participantExtension" in canonicalNoOpSave.patch.commercialFlow.packetInformation), "arbitrary participant metadata is not mirrored");
const repeatedVerification = packetInformationPatch({
  existingItem: verifiedItem,
  answers: { court: completePacketAnswers.court },
  verify: true,
  protectedVerification
});
assert.equal(repeatedVerification.patch.commercialFlow.verification.hash, protectedVerification.hash);
assert.equal(repeatedVerification.patch.commercialFlow.verification.snapshot.verifiedAt, protectedVerification.snapshot.verifiedAt);
assert.equal(repeatedVerification.protectedTransition.expectedPriorRevision, 7);
assert.equal(repeatedVerification.protectedTransition.nextVerification.revision, 7, "semantic verify no-op preserves protected revision");

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
  const persistedDrift = packetInformationPatch({
    existingItem: verifiedItem,
    answers: {},
    verify: false,
    protectedVerification
  });
  assert.equal(persistedDrift.patch.commercialFlow.verification.status, "invalidated");
  assert.equal(persistedDrift.patch.commercialFlow.verification.reason, "verification_dependencies_changed");
} finally {
  liveProfile.questionLifecycle = originalLifecycle;
}

const invalidated = packetInformationPatch({
  existingItem: verifiedItem,
  answers: { court: "Different Court" },
  verify: false,
  protectedVerification
});
const invalidatedItem = structuredClone(verifiedItem);
invalidatedItem.artifactRefs.commercialFlow.packetInformation = invalidated.patch.commercialFlow.packetInformation;
invalidatedItem.artifactRefs.commercialFlow.verification = invalidated.patch.commercialFlow.verification;
assert.equal(packetVerificationState(invalidatedItem).status, "invalidated");
assert.equal(invalidated.patch.commercialFlow.verification.hash, undefined, "an invalidated record must not expose a reusable current hash");
assert.throws(() => requireCurrentPacketVerificationRecord(invalidatedItem, { ...invalidated.patch.commercialFlow.verification, revision: 8 }), /current final verification/i);

const packetArtifact = {
  provider: "rcap_source_engine",
  packetId: verifiedItem.id,
  fileName: "verified-packet.txt",
  contentType: "text/plain",
  generatedAt: "2026-08-26T12:00:00.000Z",
  source: "source_driven_packet_plan",
  packetPlanId: verifiedItem.artifactRefs.commercialFlow.screening.pathwayId,
  downloadPath: `/api/expungement-ai/packet/download?briefcaseItemId=${verifiedItem.id}`,
  text: "immutable packet bytes"
};
const attachedEnvelope = mergePacketArtifactEnvelope(verifiedItem.artifactRefs, packetArtifact);
assert.deepEqual(attachedEnvelope.commercialFlow, verifiedItem.artifactRefs.commercialFlow, "artifact attachment preserves verification and commercial flow");
const refusedSponsoredFinalization = await finalizeSponsoredPacketGeneration({
  sessionId: "no-database-session",
  briefcaseItemId: verifiedItem.id,
  expectedVerificationHash: verification.patch.commercialFlow.verification.hash,
  artifactRefs: packetArtifact
});
assert.equal(refusedSponsoredFinalization.ok, false, "a refused sponsored CAS cannot be treated as finalized");
const legacyReady = {
  ...verifiedItem,
  artifactRefs: attachedEnvelope,
  packetStatus: "ready",
  paymentStatus: "paid"
};
delete legacyReady.artifactRefs.commercialFlow.verification;
const protectedArtifact = {
  status: "ready",
  revision: 3,
  verificationHash: protectedVerification.hash,
  entitlementSource: "consumer_payment",
  artifact: packetArtifact
};
assert.equal(readyPacketArtifactAccess(legacyReady, protectedArtifact)?.text, "immutable packet bytes", "protected legacy provenance keeps an immutable paid artifact accessible");
assert.equal(readyPacketArtifactAccess(legacyReady, null), undefined, "forged Ready JSON and writable packet_status cannot grant artifact access");
const incompleteProtectedArtifact = structuredClone(protectedArtifact);
delete incompleteProtectedArtifact.artifact.packetPlanId;
assert.equal(readyPacketArtifactAccess(legacyReady, incompleteProtectedArtifact), undefined, "protected source-engine provenance must carry its packet plan identity");
const legacyArtifactUser = "legacy-ready-artifact-user";
const savedLegacyReady = await saveScreeningResultToBriefcase({
  userId: legacyArtifactUser,
  itemType: "result",
  jurisdiction: "MS",
  pathwayLabel: baseItem.pathwayLabel,
  resultCode: baseItem.resultCode,
  packetType: baseItem.packetType,
  paymentAllowed: true,
  status: "packet_ready",
  summary: "Issued legacy artifact",
  nextSteps: [],
  artifactRefs: legacyReady.artifactRefs,
  paymentStatus: "paid",
  paymentProvider: "stripe",
  amountCents: 5000,
  packetStatus: "ready",
  sourceSessionId: "legacy-ready-artifact-session"
});
const legacyStatus = consumerPacketStatusForItem(savedLegacyReady, protectedArtifact);
assert.equal(legacyStatus.canDownload, true, "status exposes an already-issued paid artifact without retroactive verification");
assert.equal(legacyStatus.artifactRefs.text, "immutable packet bytes", "protected provenance preserves immutable legacy artifact bytes");

const sponsoredLegacyPdf = {
  ...sponsoredVerifiedItem,
  packetStatus: "ready",
  artifactRefs: {
    provider: "rcap_legacy_mississippi",
    packetId: "legacy-ms-pdf",
    fileName: "mississippi-petition-packet.pdf",
    contentType: "application/pdf",
    generatedAt: "2026-08-26T12:00:00.000Z",
    source: "mississippi_legacy_petition_packet",
    downloadPath: "/api/rcap/documents/legacy-ms-pdf/pdf/full",
    courtPacketDownloadPath: "/api/rcap/documents/legacy-ms-pdf/pdf/court"
  }
};
const sponsoredProtectedArtifact = {
  status: "ready",
  revision: 2,
  verificationHash: protectedVerification.hash,
  entitlementSource: "partner_sponsorship",
  artifact: sponsoredLegacyPdf.artifactRefs
};
assert.equal(readyPacketArtifactAccess(sponsoredLegacyPdf, sponsoredProtectedArtifact)?.downloadPath, "/api/rcap/documents/legacy-ms-pdf/pdf/full", "protected sponsored legacy PDFs remain accessible without retroactive verification");
const sponsoredLegacyUser = "sponsored-legacy-pdf-user";
const savedSponsoredLegacyPdf = await saveScreeningResultToBriefcase({
  userId: sponsoredLegacyUser,
  itemType: "result",
  jurisdiction: "MS",
  pathwayLabel: baseItem.pathwayLabel,
  resultCode: baseItem.resultCode,
  packetType: baseItem.packetType,
  paymentAllowed: false,
  status: "packet_ready",
  summary: "Issued sponsored legacy PDF",
  nextSteps: [],
  artifactRefs: sponsoredLegacyPdf.artifactRefs,
  paymentStatus: "not_applicable",
  packetStatus: "ready",
  sourceSessionId: "sponsored-legacy-session"
});
const reloadedSponsoredLegacyPdf = await getBriefcaseItem(sponsoredLegacyUser, savedSponsoredLegacyPdf.id);
const sponsoredLegacyStatus = consumerPacketStatusForItem(reloadedSponsoredLegacyPdf, sponsoredProtectedArtifact);
assert.equal(sponsoredLegacyStatus.packetStatus, "ready", "sponsored legacy PDF survives persistence reload");
assert.equal(sponsoredLegacyStatus.canDownload, true, "sponsored legacy PDF status exposes its immutable download access");
assert.equal(sponsoredLegacyStatus.artifactRefs.downloadPath, "/api/rcap/documents/legacy-ms-pdf/pdf/full");

const generationUser = "verification-generation-user";
let generationItem = await saveScreeningResultToBriefcase({
  userId: generationUser,
  itemType: "result",
  jurisdiction: "MS",
  pathwayLabel: baseItem.pathwayLabel,
  resultCode: baseItem.resultCode,
  packetType: baseItem.packetType,
  paymentAllowed: true,
  status: "packet_ready",
  summary: "Verified generation fixture",
  nextSteps: [],
  artifactRefs: structuredClone(baseItem.artifactRefs),
  paymentStatus: "paid",
  paymentProvider: "dry_run",
  amountCents: 5000,
  packetStatus: "not_started",
  sourceSessionId: "verification-generation-session"
});
const generationVerification = packetInformationPatch({ existingItem: generationItem, answers: completePacketAnswers, verify: true });
generationItem = await mergeBriefcaseArtifactRefs(generationUser, generationItem.id, generationVerification.patch);
assert.ok(generationItem);
assert.deepEqual(
  Object.keys(generationItem.artifactRefs.commercialFlow.packetInformation.serverFacts),
  ["jurisdiction", "pathway_id"],
  "canonical serverFacts replace rather than recursively preserve forged legacy keys"
);
const forgedReadyGenerationItem = await updateBriefcasePacketMetadata(generationUser, generationItem.id, {
  packetStatus: "ready",
  artifactRefs: packetArtifact
});
assert.ok(forgedReadyGenerationItem);
assert.equal(readyPacketArtifactAccess(forgedReadyGenerationItem, null), undefined, "writable JSON Ready fields do not grant access");
await assert.rejects(
  generatePaidConsumerPacket({ userId: generationUser, briefcaseItemId: generationItem.id, dryRunMode: true }),
  /protected packet artifact authority is unavailable/i,
  "new generation fails closed until captain-owned protected artifact SQL is installed"
);

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
  sponsoredGenerationRoute.includes("finalizeSponsoredPacketGeneration({"),
  "sponsored generation uses the atomic verification/credit/artifact finalizer"
);
assert.ok(sponsoredGenerationRoute.includes("briefcaseItemId,"), "sponsored slot CAS binds the Briefcase matter");
assert.ok(sponsoredGenerationRoute.includes("expectedVerificationHash: verificationHash"), "sponsored slot CAS binds the exact verification hash");
assert.ok(sponsoredGenerationRoute.includes("if (!finalization.ok)"), "the route must reject a sponsored-slot refusal");
assert.ok(sponsoredGenerationRoute.indexOf("if (!finalization.ok)") < sponsoredGenerationRoute.indexOf("packetStatus: \"ready\""), "no Ready response may precede a successful sponsored finalization");

const packetGenerationSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/packet-generation.ts"), "utf8");
assert.ok(packetGenerationSource.includes("if (partnerSponsored)"));
assert.ok(packetGenerationSource.indexOf("if (partnerSponsored)") < packetGenerationSource.indexOf("await attachPacketToBriefcaseItem({"), "sponsored generation cannot attach Ready before atomic credit consumption");
assert.ok(packetGenerationSource.includes("attachConsumerPacketArtifactIfVerified("), "DTC Ready attachment uses the protected artifact CAS RPC");
assert.ok(packetGenerationSource.includes("readProtectedPacketArtifact("), "existing artifact access reads protected provenance");
const sourceDrivenRenderer = packetGenerationSource.slice(
  packetGenerationSource.indexOf("function renderSourceDrivenPacket"),
  packetGenerationSource.indexOf("function paymentLinkageText")
);
assert.ok(!sourceDrivenRenderer.includes("item.summary"), "source-driven output cannot render writable summary text");
assert.ok(!sourceDrivenRenderer.includes("item.nextSteps"), "source-driven output cannot render writable next-step text");

assert.ok(!verificationCasSource.includes("while ("), "a stale protected transition cannot retry without rederiving authority");
assert.ok(packetInformationRouteSource.includes("readProtectedPacketVerification({"), "fact saves first read protected verification authority");
assert.ok(packetInformationRouteSource.includes("persistProtectedPacketVerification({"), "fact saves use one protected atomic transition");
assert.ok(!packetInformationRouteSource.includes("mergeBriefcaseArtifactRefs"), "fact saves cannot use a stale full JSON merge");

const paymentRpcSource = consumerPaymentAuthoritySource.slice(
  consumerPaymentAuthoritySource.indexOf('rpc("record_consumer_packet_payment"'),
  consumerPaymentAuthoritySource.indexOf("if (error)", consumerPaymentAuthoritySource.indexOf('rpc("record_consumer_packet_payment"'))
);
assert.ok(paymentRpcSource.includes("p_expected_verification_hash: input.expectedVerificationHash"), "payment entitlement binds the exact protected verification hash");
for (const parameter of PACKET_VERIFICATION_CAS_HANDOFF.payment_entitlement.atomicPayloadParameters) {
  assert.ok(paymentRpcSource.includes(`${parameter}:`), `payment entitlement sends ${parameter}`);
}

assert.ok(consumerPaymentAuthoritySource.includes('rpc("bind_consumer_checkout_verification"'), "checkout binding uses the protected CAS RPC");
assert.ok(!checkoutSource.includes('.from("consumer_briefcase_items")\n    .update('), "checkout binding cannot directly update the participant row");
const checkoutRpcSource = consumerPaymentAuthoritySource.slice(
  consumerPaymentAuthoritySource.indexOf('rpc("bind_consumer_checkout_verification"'),
  consumerPaymentAuthoritySource.indexOf("if (error)", consumerPaymentAuthoritySource.indexOf('rpc("bind_consumer_checkout_verification"'))
);
for (const parameter of PACKET_VERIFICATION_CAS_HANDOFF.checkout_binding.atomicPayloadParameters) {
  assert.ok(checkoutRpcSource.includes(`${parameter}:`), `checkout binding sends ${parameter}`);
}
assert.ok(
  consumerPaymentAuthoritySource.includes('if (error) return { outcome: "unavailable", reason: error.message };'),
  "ambiguous checkout-binding transport failures remain unavailable rather than definitive CAS refusals"
);
assert.ok(consumerPaymentAuthoritySource.includes('if (row?.ok === false)'), "only an explicit RPC refusal triggers checkout compensation");
const artifactAttachRpcSource = verificationCasSource.slice(
  verificationCasSource.indexOf('rpc("attach_consumer_packet_artifact_if_verified"'),
  verificationCasSource.indexOf("if (error)", verificationCasSource.indexOf('rpc("attach_consumer_packet_artifact_if_verified"'))
);
for (const parameter of PACKET_VERIFICATION_CAS_HANDOFF.artifact_attach.atomicPayloadParameters) {
  assert.ok(artifactAttachRpcSource.includes(`${parameter}:`), `artifact attachment sends ${parameter}`);
}
const sponsoredFinalizeSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/rcap-slot-lifecycle.ts"), "utf8");
const sponsoredFinalizeRpcSource = sponsoredFinalizeSource.slice(
  sponsoredFinalizeSource.indexOf('rpc("finalize_sponsored_packet_generation_if_verified"'),
  sponsoredFinalizeSource.indexOf("if (error)", sponsoredFinalizeSource.indexOf('rpc("finalize_sponsored_packet_generation_if_verified"'))
);
for (const parameter of PACKET_VERIFICATION_CAS_HANDOFF.sponsored_slot_consumption.atomicPayloadParameters) {
  assert.ok(sponsoredFinalizeRpcSource.includes(`${parameter}:`), `sponsored finalization sends ${parameter}`);
}
const reusedBindingRefusal = checkoutSource.slice(
  checkoutSource.indexOf('const bindingResult = await persistCheckoutBinding(binding, reusable.id, "stripe")'),
  checkoutSource.indexOf("if (reusable.status === \"open\" && reusable.url)")
);
assert.ok(reusedBindingRefusal.includes('bindingResult.outcome === "refused"'), "reused-session compensation requires a definitive CAS refusal");
assert.ok(reusedBindingRefusal.includes("checkout.sessions.expire(reusable.id)"), "reused open checkout is expired after a binding CAS refusal");
const newBindingRefusal = checkoutSource.slice(
  checkoutSource.indexOf('const bindingResult = await persistCheckoutBinding(binding, session.id, "stripe")'),
  checkoutSource.indexOf("return {", checkoutSource.indexOf('const bindingResult = await persistCheckoutBinding(binding, session.id, "stripe")'))
);
assert.ok(newBindingRefusal.includes('bindingResult.outcome === "refused"'), "new-session compensation requires a definitive CAS refusal");
assert.ok(newBindingRefusal.includes("checkout.sessions.expire(session.id)"), "new open checkout is expired after a binding CAS refusal");
const checkoutRouteSource = fs.readFileSync(path.join(root, "src/app/api/expungement-ai/checkout/route.ts"), "utf8");
for (const forbidden of ["guidance-packet-registry", "item.artifactRefs", "item.selectedTrackId", "item.treatmentClassification", "item.pathwayLabel"]) {
  assert.ok(!checkoutRouteSource.includes(forbidden), `checkout route cannot preempt protected authority with ${forbidden}`);
}

const reconciliationSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/checkout-reconciliation.ts"), "utf8");
assert.ok(reconciliationSource.includes("readProtectedPacketArtifact({"), "webhook duplicate access requires protected artifact provenance");
assert.ok(!reconciliationSource.includes('item.packetStatus === "ready"'), "writable packet status cannot suppress payment/generation");

const consumerRenderSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/consumer-render-request.ts"), "utf8");
for (const forbidden of ['.from("rcap_document_packets")', '.from("rcap_document_packet_inputs")', "getSupabaseAdminClient"]) {
  assert.ok(!consumerRenderSource.includes(forbidden), `consumer render must not perform pre-CAS durable mutation via ${forbidden}`);
}
assert.ok(consumerRenderSource.includes("enqueueVerifiedConsumerRender("), "consumer render calls only the atomic verified enqueue boundary");
assert.ok(
  consumerRenderSource.includes('`${CONSUMER_PACKET_NAMESPACE}:${item.id}:${verification.hash}:${payloadVersionHash}`'),
  "versioned worker packet identity binds the current verification and exact payload hashes"
);
assert.ok(
  consumerRenderSource.includes("const renderPacketSeed = {")
    && consumerRenderSource.includes('relief_outcome: "not_recorded"'),
  "versioned worker packet identity seeds every immutable packet row field before deriving id"
);
assert.ok(
  consumerRenderSource.includes("renderPacketSeed,")
    && consumerRenderSource.includes("const renderPacket = { id: packetId, ...renderPacketSeed }"),
  "packet identity hashes the exact immutable row seed later sent to the atomic boundary"
);
for (const dependency of ["rendererKind", "rendererVersion", "sourceSha256", "profileId", "profileVersion"]) {
  assert.ok(consumerRenderSource.includes(`${dependency}: built.spec.${dependency}`), `packet source version binds ${dependency}`);
}
assert.ok(consumerRenderSource.includes("const verifiedSpec = { ...versioned.spec, inputHash }"), "queue input_hash covers the exact immutable render payload");
assert.ok(!consumerRenderSource.includes("input.item.summary"), "durable render source cannot consume writable summary text");
assert.ok(!consumerRenderSource.includes("input.item.nextSteps"), "durable render source cannot consume writable next-step text");
assert.ok(
  consumerRenderSource.includes("filing_instructions: packetReadyWhen.length > 0\n      ? packetReadyWhen"),
  "durable render filing instructions use the exact checklist carried by protected verification"
);
assert.equal(
  consumerRenderSource.match(/trackId: verification\.snapshot\.selectedTrackId/g)?.length,
  2,
  "both render-contract derivations bind the protected selected-track dependency"
);
const jobQueueSource = fs.readFileSync(path.join(root, "src/lib/rcap/render/job-queue.ts"), "utf8");
assert.ok(jobQueueSource.includes('rpc("enqueue_verified_consumer_packet_render"'));
for (const parameter of PACKET_VERIFICATION_CAS_HANDOFF.render_enqueue.atomicPayloadParameters) {
  assert.ok(jobQueueSource.includes(parameter), `atomic render enqueue must send ${parameter}`);
}
assert.ok(
  jobQueueSource.includes("p_expected_verification_hash: identity.expectedVerificationHash"),
  "atomic render enqueue sends the exact current verification hash value"
);

console.log("screening-verification-finetune: OK");
