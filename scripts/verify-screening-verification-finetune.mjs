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
  packetInformationPatch,
  packetVerificationState,
  requireCurrentPacketVerification
} = await import("../src/lib/expungement-ai/packet-information.ts");
const { assertCheckoutAllowed } = await import("../src/lib/expungement-ai/payment-adapter.ts");
const {
  assertPacketGenerationAllowed,
  generatePaidConsumerPacket,
  getConsumerPacketDownload,
  getConsumerPacketStatus,
  mergePacketArtifactEnvelope,
  readyPacketArtifactAccess
} = await import("../src/lib/expungement-ai/packet-generation.ts");
const {
  getBriefcaseItem,
  mergeBriefcaseArtifactRefs,
  saveScreeningResultToBriefcase,
  updateBriefcasePacketMetadata
} = await import("../src/lib/expungement-ai/briefcase.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const {
  PACKET_VERIFICATION_CAS_HANDOFF,
  assertExpectedPacketVerificationHash
} = await import("../src/lib/expungement-ai/verification-cas.ts");

assert.deepEqual(Object.keys(PACKET_VERIFICATION_CAS_HANDOFF), [
  "checkout_binding",
  "payment_entitlement",
  "artifact_attach",
  "render_enqueue",
  "sponsored_slot_consumption"
]);
for (const point of Object.values(PACKET_VERIFICATION_CAS_HANDOFF)) {
  assert.equal(point.expectedHashParameter, "p_expected_verification_hash");
  assert.ok(point.rpcName, "every concurrency boundary names its captain-owned RPC");
}
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
  pathwayLabel: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
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
          server_confirmed_balance: "Satisfied"
        },
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
assert.equal(verification.reviewReason, "authoritative_route_confirmed");
assert.equal(verification.patch.commercialFlow.packetInformation.stage, "ready_to_generate");
assert.equal(verification.patch.commercialFlow.verification.status, "verified");
assert.match(verification.patch.commercialFlow.verification.hash, /^[a-f0-9]{64}$/);
assert.equal(verification.patch.commercialFlow.verification.snapshot.schemaVersion, "expungement-ai/final-verification/v1");
assert.deepEqual(Object.keys(verification.patch.commercialFlow.verification.snapshot.screeningAnswers), Object.keys(baseItem.artifactRefs.commercialFlow.screening.answers).sort());
assert.deepEqual(Object.keys(verification.patch.commercialFlow.verification.snapshot.packetAnswers), Object.keys(completePacketAnswers).sort());
assert.deepEqual(Object.keys(verification.patch.commercialFlow.verification.snapshot.serverFacts), ["jurisdiction", "pathway_id", "server_confirmed_balance"]);
assert.ok(verification.patch.commercialFlow.verification.snapshot.packetPlan, "packet plan dependency must be snapshotted");
assert.match(verification.patch.commercialFlow.verification.snapshot.profileAuthorityFingerprint, /^[a-f0-9]{64}$/);

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
assert.doesNotThrow(() => assertPacketGenerationAllowed(sponsoredVerifiedItem, false, { paymentRequired: false }));

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
const verifiedModel = packetInformationModelFor(verifiedItem);
const snapshot = verification.patch.commercialFlow.verification.snapshot;
const expectedSummaryKeys = ["screeningAnswers", "prefilledAnswers", "packetAnswers", "serverFacts"]
  .flatMap((source) => Object.keys(snapshot[source]).sort().map((id) => `${source}:${id}`));
assert.deepEqual(
  verifiedModel.verificationSummary.map((fact) => fact.key),
  expectedSummaryKeys,
  "every hashed participant fact must appear once in canonical source/id order"
);
assert.equal(
  verifiedModel.verificationSummary.find((fact) => fact.key === "serverFacts:server_confirmed_balance")?.systemContext,
  false,
  "arbitrary server facts are participant-reviewable facts"
);
assert.equal(verifiedModel.verificationSummary.find((fact) => fact.key === "serverFacts:jurisdiction")?.systemContext, true);
assert.equal(verifiedModel.verificationSummary.find((fact) => fact.key === "serverFacts:pathway_id")?.systemContext, true);
assert.equal(packetVerificationState(verifiedItem).status, "verified");
assert.doesNotThrow(() => requireCurrentPacketVerification(verifiedItem));
assert.doesNotThrow(() => assertCheckoutAllowed(verifiedItem));
assert.doesNotThrow(() => assertPacketGenerationAllowed({ ...verifiedItem, paymentStatus: "paid" }));

const noOpSave = packetInformationPatch({ existingItem: verifiedItem, answers: { court: completePacketAnswers.court }, verify: false });
assert.equal(noOpSave.patch.commercialFlow.verification.status, "verified", "a semantic no-op save preserves current verification");
assert.equal(noOpSave.patch.commercialFlow.verification.hash, verification.patch.commercialFlow.verification.hash);
assert.equal(noOpSave.patch.commercialFlow.packetInformation.stage, "ready_to_generate");

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
  const persistedDrift = packetInformationPatch({ existingItem: verifiedItem, answers: {}, verify: false });
  assert.equal(persistedDrift.patch.commercialFlow.verification.status, "invalidated");
  assert.equal(persistedDrift.patch.commercialFlow.verification.reason, "verification_dependencies_changed");
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
const legacyReady = {
  ...verifiedItem,
  artifactRefs: attachedEnvelope,
  packetStatus: "ready",
  paymentStatus: "paid"
};
delete legacyReady.artifactRefs.commercialFlow.verification;
assert.equal(readyPacketArtifactAccess(legacyReady)?.text, "immutable packet bytes", "legacy paid ready artifacts stay status/download visible");
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
const legacyStatus = await getConsumerPacketStatus({ userId: legacyArtifactUser, briefcaseItemId: savedLegacyReady.id });
assert.equal(legacyStatus.canDownload, true, "status exposes an already-issued paid artifact without retroactive verification");
const legacyDownload = await getConsumerPacketDownload({ userId: legacyArtifactUser, briefcaseItemId: savedLegacyReady.id });
assert.equal(legacyDownload.body, "immutable packet bytes", "download preserves immutable legacy artifact access");

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
assert.equal(
  await updateBriefcasePacketMetadata(generationUser, generationItem.id, {
    packetStatus: "pending",
    expectedVerificationHash: "b".repeat(64)
  }),
  null,
  "artifact/status writes reject a stale expected verification hash"
);
const generated = await generatePaidConsumerPacket({ userId: generationUser, briefcaseItemId: generationItem.id, dryRunMode: true });
assert.equal(generated.packetStatus, "ready");
const reloadedGenerated = await getBriefcaseItem(generationUser, generationItem.id);
assert.equal(packetVerificationState(reloadedGenerated).status, "verified", "artifact attach/reload preserves verification");
const generatedStatus = await getConsumerPacketStatus({ userId: generationUser, briefcaseItemId: generationItem.id });
assert.equal(generatedStatus.canDownload, true);
const generatedDownload = await getConsumerPacketDownload({ userId: generationUser, briefcaseItemId: generationItem.id });
assert.equal(generatedDownload.body, generated.artifactRefs.text);

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
  sponsoredGenerationRoute.lastIndexOf("requireCurrentPacketVerification") < sponsoredGenerationRoute.indexOf("recordPartnerPacketGeneration({"),
  "sponsored generation must recheck the current verification immediately before slot consumption"
);
assert.ok(sponsoredGenerationRoute.includes("briefcaseItemId,"), "sponsored slot CAS binds the Briefcase matter");
assert.ok(sponsoredGenerationRoute.includes("expectedVerificationHash: verificationHash"), "sponsored slot CAS binds the exact verification hash");

console.log("screening-verification-finetune: OK");
