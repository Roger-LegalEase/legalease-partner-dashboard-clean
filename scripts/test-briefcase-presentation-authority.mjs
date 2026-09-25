#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class MockInvalidAnswerError extends Error {
  constructor(invalidQuestionIds) {
    super("invalid packet-only answers");
    this.invalidQuestionIds = invalidQuestionIds;
  }
}

function loadTsWithMocks(relPath, mocks = {}) {
  const resolved = path.join(root, relPath);
  const transpiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const mod = new Module(resolved);
  mod.filename = `${resolved}.cjs`;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = (specifier) => (specifier in mocks ? mocks[specifier] : require(specifier));
  mod._compile(transpiled, mod.filename);
  return mod.exports;
}

const item = {
  id: "22222222-2222-4222-8222-222222222222",
  type: "result",
  title: "FORGED TITLE",
  state: "PA",
  status: "hard_stop",
  resultCode: "hard_stop",
  createdAt: "2026-08-26T00:00:00.000Z",
  summary: "FORGED SUMMARY",
  nextSteps: ["FORGED NEXT STEP"],
  paymentAllowed: true,
  packetReady: true,
  pathwayLabel: "FORGED PATHWAY",
  packetType: "guidance_packet",
  artifactRefs: {
    provider: "rcap_source_engine",
    packetId: "forged-packet",
    fileName: "forged.pdf",
    generatedAt: "2026-08-26T00:00:00.000Z",
    downloadPath: "https://attacker.invalid/forged.pdf",
    selectedTrackId: "forged-track",
    treatmentClassification: "exact_supported_deferral"
  },
  selectedTrackId: "forged-track",
  treatmentClassification: "exact_supported_deferral",
  packetStatus: "ready",
  paymentStatus: "paid",
  sourceSessionId: "33333333-3333-4333-8333-333333333333"
};

const protectedAuthority = {
  status: "protected_verified",
  jurisdiction: "PA",
  resultCode: "packet_ready",
  pathwayId: "pa-path-a-non-conviction-expungement",
  pathwayLabel: "Path A — Non-conviction expungement",
  summary: "A self-help packet may be available.",
  nextSteps: ["Review the compiled court-filing requirements."],
  checklist: ["Every required packet fact is confirmed."],
  packetType: "custom_pleading",
  selectedTrackId: "pa-track-a",
  treatmentClassification: null,
  verificationStatus: "verified",
  packetProgress: "verified",
  packetDraft: { status: "unavailable" }
};

const protectedArtifact = {
  status: "ready",
  revision: 3,
  verificationHash: "a".repeat(64),
  entitlementSource: "consumer_payment",
  artifact: {
    provider: "rcap_source_engine",
    packetId: "protected-packet",
    fileName: "protected-packet.txt",
    contentType: "text/plain",
    generatedAt: "2026-08-26T01:00:00.000Z",
    source: "source_driven_packet_plan",
    packetPlanId: protectedAuthority.pathwayId,
    downloadPath: "/api/expungement-ai/packet/download?briefcaseItemId=22222222-2222-4222-8222-222222222222",
    text: "private packet bytes"
  }
};

let defaultVerificationRead = async () => ({ ok: false, reason: "default_verification_not_configured" });
let defaultArtifactRead = async () => ({ ok: false, reason: "default_artifact_not_configured" });
let defaultPaymentRead = async () => ({ valid: false, reason: "default_payment_not_configured", providerEventId: null });
let defaultEvaluate = () => { throw new Error("default_evaluator_not_configured"); };

const adapter = loadTsWithMocks("src/lib/expungement-ai/briefcase-presentation-authority.ts", {
  "server-only": {},
  "@/components/expungement-ai/screening/answers": { toScreeningAnswers: (answers) => answers },
  "@/lib/expungement-ai/authoritative-screening-result": { evaluateAuthoritativeScreeningResult: (...args) => defaultEvaluate(...args) },
  "@/lib/expungement-ai/consumer-payment-authority": { consumerPacketPaymentAuthority: (...args) => defaultPaymentRead(...args) },
  "@/lib/expungement-ai/packet-information": {
    protectedPacketDraftSeedFromAuthoritative: ({ screeningAnswers, capturedAt }) => ({
      hash: "e".repeat(64),
      snapshot: {
        schemaVersion: "expungement-ai/protected-packet-draft/v1",
        capturedAt,
        screeningAnswers,
        prefilledAnswers: {},
        packetAnswers: {}
      }
    }),
    protectedPacketInformationModelFor: (verification) => verification.status === "invalidated" && !verification.draftSnapshot
      ? null
      : ({
        stateCode: "PA",
        pathwayId: protectedAuthority.pathwayId,
        packetPlan: null,
        initialAnswers: (verification.status === "verified" ? verification.snapshot : verification.draftSnapshot)
          ? {
            ...(verification.status === "verified" ? verification.snapshot : verification.draftSnapshot).screeningAnswers,
            ...(verification.status === "verified" ? verification.snapshot : verification.draftSnapshot).prefilledAnswers,
            ...(verification.status === "verified" ? verification.snapshot : verification.draftSnapshot).packetAnswers
          }
          : { county: "Protected County", participant_full_legal_name: "Protected Person" },
        screeningAnswers: (verification.status === "verified" ? verification.snapshot : verification.draftSnapshot)?.screeningAnswers ?? { case_outcome: "Dismissed" },
        prefilledAnswers: (verification.status === "verified" ? verification.snapshot : verification.draftSnapshot)?.prefilledAnswers ?? { county: "Protected County" },
        packetAnswers: (verification.status === "verified" ? verification.snapshot : verification.draftSnapshot)?.packetAnswers ?? { participant_full_legal_name: "Protected Person" },
        serverFacts: { jurisdiction: "PA", pathway_id: protectedAuthority.pathwayId },
        requiredInputIds: ["case_outcome"],
        missingInputIds: [],
        questions: [],
        builderQuestions: [],
        verificationSummary: [],
        verificationContext: [],
        verificationManifest: { schemaVersion: "expungement-ai/verification-review-manifest/v1", factKeys: [], systemContextKeys: [] },
        expectedComponents: ["A personalized self-help court-filing packet for this matter"],
        reviewSafety: { safe: verification.status === "verified", reason: verification.reason },
        stage: verification.status === "verified" ? "ready_to_generate" : "facts_complete",
        reviewedAt: verification.status === "verified" ? "2026-08-26T00:30:00.000Z" : null,
        capturedAt: "2026-08-26T00:25:00.000Z"
      })
  },
  "@/lib/expungement-ai/verification-cas": {
    readProtectedPacketVerification: (...args) => defaultVerificationRead(...args),
    readProtectedPacketArtifact: (...args) => defaultArtifactRead(...args),
    validProtectedLegacyArtifactEvidence: (record) => Boolean(
      record.legacyEvidence
      && record.consumerAuthUserId === record.legacyEvidence.consumerAuthUserId
      && record.briefcaseItemId === record.legacyEvidence.briefcaseItemId
      && record.matterId === record.legacyEvidence.matterId
      && record.artifact?.source === record.legacyEvidence.artifactSource
      && record.artifact?.packetPlanId === record.legacyEvidence.packetPlanId
      && record.artifact?.artifactSha256 === record.legacyEvidence.artifactSha256
    )
  },
  "@/lib/rcap-engine/evaluator": { InvalidAnswerError: MockInvalidAnswerError },
  "@/lib/supabase/server": { getSupabaseAdminClient: () => null }
});

const presented = adapter.assembleBriefcasePresentationItem({
  item,
  legalAuthority: protectedAuthority,
  protectedArtifact,
  paymentState: "paid"
});

assert.equal(presented.id, item.id);
assert.equal(presented.createdAt, item.createdAt);
assert.equal(presented.authorityStatus, "protected_verified");
assert.equal(presented.jurisdiction, "PA");
assert.equal(presented.title, protectedAuthority.pathwayLabel);
assert.equal(presented.resultCode, "packet_ready");
assert.equal(presented.pathwayId, protectedAuthority.pathwayId);
assert.equal(presented.pathwayLabel, protectedAuthority.pathwayLabel);
assert.equal(presented.summary, protectedAuthority.summary);
assert.deepEqual(presented.nextSteps, protectedAuthority.nextSteps);
assert.deepEqual(presented.checklist, protectedAuthority.checklist);
assert.equal(presented.packetType, "custom_pleading");
assert.equal(presented.selectedTrackId, "pa-track-a");
assert.equal(presented.treatmentClassification, null);
assert.equal(presented.paymentState, "paid");
assert.deepEqual(presented.artifact, {
  status: "ready",
  canDownload: true,
  source: "source_driven_packet_plan",
  packetId: "protected-packet",
  packetPlanId: protectedAuthority.pathwayId,
  generatedAt: "2026-08-26T01:00:00.000Z",
  documents: [{
    kind: "full",
    fileName: "protected-packet.txt",
    downloadPath: protectedArtifact.artifact.downloadPath
  }]
});
assert.ok(!JSON.stringify(presented).includes("FORGED"));
assert.ok(!JSON.stringify(presented).includes("attacker.invalid"));
assert.ok(!JSON.stringify(presented).includes("private packet bytes"));

const unavailable = adapter.assembleBriefcasePresentationItem({
  item,
  legalAuthority: { status: "unavailable", reason: "protected_verification_storage_unavailable" },
  protectedArtifact: null,
  paymentState: "unavailable"
});
assert.deepEqual(unavailable, {
  id: item.id,
  createdAt: item.createdAt,
  authorityStatus: "unavailable",
  unavailableReason: "protected_verification_storage_unavailable",
  jurisdiction: null,
  title: "Briefcase matter unavailable",
  resultCode: null,
  pathwayId: null,
  pathwayLabel: null,
  summary: null,
  nextSteps: [],
  checklist: [],
  packetType: null,
  selectedTrackId: null,
  treatmentClassification: null,
  verificationStatus: "unavailable",
  packetProgress: "unavailable",
  packetDraft: { status: "unavailable" },
  paymentState: "unavailable",
  commercialActions: { fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false },
  artifact: { status: "absent", canDownload: false, documents: [] }
});

const protectedVerification = {
  status: "verified",
  reason: "authoritative_route_confirmed",
  hash: "a".repeat(64),
  revision: 4,
  snapshot: {
    schemaVersion: "expungement-ai/final-verification/v1",
    verifiedAt: "2026-08-26T00:30:00.000Z",
    jurisdiction: "PA",
    profileVersion: "profile-pa-1",
    profileSourceFingerprint: "b".repeat(64),
    profileAuthorityFingerprint: "c".repeat(64),
    pathwayId: protectedAuthority.pathwayId,
    resultCode: "packet_ready",
    paymentAllowed: true,
    packetType: "custom_pleading",
    packetPlan: {
      pathwayId: protectedAuthority.pathwayId,
      mode: "state_specific_custom_packet_from_source_rules",
      formMappingStatus: "custom_or_manual_mapping_required",
      sourceFormIds: [],
      requiredInputIds: ["case_outcome"],
      sourceRuleRefs: ["pa-rule-1"],
      packetReadyWhen: protectedAuthority.checklist
    },
    requiredInputIds: ["case_outcome"],
    packetFamilyIdentifiers: {
      mode: "state_specific_custom_packet_from_source_rules",
      sourceFormIds: []
    },
    selectedTrackId: "pa-track-a",
    treatmentClassification: null,
    deferralComponentIds: [],
    screeningAnswers: { case_outcome: "Dismissed" },
    packetAnswers: { participant_full_legal_name: "Protected Person" },
    serverFacts: { jurisdiction: "PA", pathway_id: protectedAuthority.pathwayId },
    prefilledAnswers: {},
    dependencies: {
      commercialFlowVersion: 1,
      entitlementSource: "consumer_payment",
      productId: "expungement_packet"
    }
  }
};

const authoritativeEvaluation = {
  evaluation: {
    jurisdiction: "PA",
    profileVersion: "profile-pa-1",
    matterId: item.id,
    pathwayId: protectedAuthority.pathwayId,
    resultCode: "packet_ready",
    userLabel: protectedAuthority.summary,
    reasons: [],
    missingQuestionIds: [],
    cautions: [],
    nextSteps: protectedAuthority.nextSteps,
    paymentAllowed: true,
    packetPlan: protectedVerification.snapshot.packetPlan,
    selectedTrackId: "pa-track-a",
    treatmentClassification: null,
    deferralComponentIds: []
  },
  pathwayLabel: protectedAuthority.pathwayLabel,
  packetType: "custom_pleading",
  selectedTrackId: "pa-track-a"
};

let trustedSourceReads = 0;
const protectedRuntime = await adapter.decorateBriefcaseItemForPresentationWithDependencies({
  consumerAuthUserId: "11111111-1111-4111-8111-111111111111",
  item: { ...item, artifactRefs: {} }
}, {
  readProtectedVerification: async () => ({ ok: true, value: protectedVerification }),
  readProtectedArtifact: async () => ({ ok: true, value: protectedArtifact }),
  readPaymentAuthority: async () => ({ valid: true, reason: "paid", providerEventId: "evt_1" }),
  readTrustedPendingSource: async () => {
    trustedSourceReads += 1;
    return {
      ok: true,
      value: {
        jurisdiction: "PA",
        profileVersion: "profile-pa-1",
        matterId: item.id,
        answers: { case_outcome: "Dismissed" },
        product: "expungement_ai_dtc",
        sourceSessionId: null,
        claimedAt: "2026-08-01T00:00:00.000Z",
        partnerBenefitActive: false,
        partnerSlug: null
      }
    };
  },
  evaluateAuthoritative: () => authoritativeEvaluation
});
assert.equal(protectedRuntime.authorityStatus, "protected_verified");
assert.equal(protectedRuntime.paymentState, "paid");
assert.equal(trustedSourceReads, 1, "protected legal facts never fall back, but payment mode checks the current owner/item-bound source authority");
assert.equal(protectedRuntime.artifact.status, "ready");
assert.deepEqual(protectedRuntime.packetDraft.prefilledAnswers, {}, "the protected verified snapshot exposes its exact prefilled-answer source map");
assert.deepEqual(protectedRuntime.packetDraft.packetAnswers, { participant_full_legal_name: "Protected Person" }, "the protected verified snapshot exposes its exact packet-answer source map");

defaultVerificationRead = async () => ({ ok: true, value: protectedVerification });
defaultArtifactRead = async () => ({ ok: true, value: protectedArtifact });
defaultPaymentRead = async () => ({ valid: true, reason: "paid", providerEventId: "evt_default" });
defaultEvaluate = () => authoritativeEvaluation;
const defaultRpcRuntime = await adapter.decorateBriefcaseItemForPresentation({
  consumerAuthUserId: "11111111-1111-4111-8111-111111111111",
  item: { ...item, artifactRefs: {} }
});
assert.equal(defaultRpcRuntime.authorityStatus, "protected_verified", "the default runtime reads protected verification authority");
assert.deepEqual(defaultRpcRuntime.packetDraft.prefilledAnswers, {}, "the default RPC path preserves exact prefilled fact membership");
assert.deepEqual(defaultRpcRuntime.packetDraft.packetAnswers, { participant_full_legal_name: "Protected Person" }, "the default RPC path preserves exact packet fact membership");

const immutableReadyDuringVerificationOutage = await adapter.decorateBriefcaseItemForPresentationWithDependencies({
  consumerAuthUserId: "11111111-1111-4111-8111-111111111111",
  item
}, {
  readProtectedVerification: async () => ({ ok: false, reason: "protected_verification_storage_unavailable" }),
  readProtectedArtifact: async () => ({ ok: true, value: protectedArtifact }),
  readPaymentAuthority: async () => ({ valid: true, reason: "paid", providerEventId: "evt_1" }),
  readTrustedPendingSource: async () => ({ ok: false, reason: "must_not_read" }),
  evaluateAuthoritative: () => authoritativeEvaluation
});
assert.equal(immutableReadyDuringVerificationOutage.authorityStatus, "unavailable");
assert.equal(immutableReadyDuringVerificationOutage.artifact.status, "ready", "immutable protected Ready access does not require a new verification read");

const pendingSource = {
  jurisdiction: "PA",
  profileVersion: "profile-pa-1",
  matterId: item.id,
  answers: { case_outcome: "Dismissed" },
  product: "expungement_ai_dtc",
  sourceSessionId: null,
  claimedAt: "2026-08-01T00:00:00.000Z",
  partnerBenefitActive: false,
  partnerSlug: null
};
let filteredReevaluationAttempts = 0;
const protectedRuntimeWithPacketOnlyAnswers = await adapter.decorateBriefcaseItemForPresentationWithDependencies({
  consumerAuthUserId: "11111111-1111-4111-8111-111111111111",
  item
}, {
  readProtectedVerification: async () => ({ ok: true, value: protectedVerification }),
  readProtectedArtifact: async () => ({ ok: true, value: protectedArtifact }),
  readPaymentAuthority: async () => ({ valid: true, reason: "paid", providerEventId: "evt_1" }),
  readTrustedPendingSource: async () => ({ ok: true, value: pendingSource }),
  evaluateAuthoritative: ({ answers }) => {
    filteredReevaluationAttempts += 1;
    if ("participant_full_legal_name" in answers) {
      throw new MockInvalidAnswerError(["participant_full_legal_name"]);
    }
    return authoritativeEvaluation;
  }
});
assert.equal(protectedRuntimeWithPacketOnlyAnswers.authorityStatus, "protected_verified");
assert.equal(filteredReevaluationAttempts, 2, "protected presentation filters packet-only answers and retries authoritative screening");

const trustedRuntime = await adapter.decorateBriefcaseItemForPresentationWithDependencies({
  consumerAuthUserId: "11111111-1111-4111-8111-111111111111",
  item
}, {
  readProtectedVerification: async () => ({ ok: false, reason: "protected_verification_authority_missing" }),
  readProtectedArtifact: async () => ({ ok: true, value: { status: "absent", revision: 0, verificationHash: null, entitlementSource: null, artifact: null } }),
  readPaymentAuthority: async () => ({ valid: false, reason: "payment_status_unpaid", providerEventId: null }),
  readTrustedPendingSource: async () => ({ ok: true, value: pendingSource }),
  evaluateAuthoritative: () => authoritativeEvaluation
});
assert.equal(trustedRuntime.authorityStatus, "trusted_source");
assert.equal(trustedRuntime.paymentState, "unpaid");
assert.equal(trustedRuntime.packetProgress, "not_started");
assert.equal(trustedRuntime.packetDraft.status, "available", "first-open builder uses the owner-bound trusted source draft");
assert.deepEqual(trustedRuntime.packetDraft.prefilledAnswers, {}, "trusted-source presentation keeps the canonical prefilled source map separate");
assert.deepEqual(trustedRuntime.packetDraft.packetAnswers, {}, "trusted-source presentation keeps the canonical packet source map separate");
assert.ok(!JSON.stringify(trustedRuntime).includes("FORGED"));

let forbiddenFallbackReads = 0;
const invalidatedRuntime = await adapter.decorateBriefcaseItemForPresentationWithDependencies({
  consumerAuthUserId: "11111111-1111-4111-8111-111111111111",
  item
}, {
  readProtectedVerification: async () => ({
    ok: true,
    value: {
      status: "invalidated",
      reason: "facts_changed",
      revision: 5,
      draftHash: "d".repeat(64),
      draftSnapshot: {
        ...protectedVerification.snapshot,
        schemaVersion: "expungement-ai/protected-packet-draft/v1",
        capturedAt: "2026-08-26T00:25:00.000Z"
      }
    }
  }),
  readProtectedArtifact: async () => ({ ok: true, value: { status: "absent", revision: 0, verificationHash: null, entitlementSource: null, artifact: null } }),
  readPaymentAuthority: async () => ({ valid: false, reason: "no_authority_row", providerEventId: null }),
  readTrustedPendingSource: async () => {
    forbiddenFallbackReads += 1;
    return { ok: true, value: pendingSource };
  },
  evaluateAuthoritative: () => authoritativeEvaluation
});
assert.equal(invalidatedRuntime.authorityStatus, "protected_draft");
assert.equal(invalidatedRuntime.verificationStatus, "invalidated");
assert.equal(invalidatedRuntime.packetProgress, "facts_complete");
assert.equal(invalidatedRuntime.packetDraft.status, "available");
assert.deepEqual(invalidatedRuntime.packetDraft.prefilledAnswers, {}, "invalidated protected presentation preserves the exact prefilled source map");
assert.deepEqual(invalidatedRuntime.packetDraft.packetAnswers, { participant_full_legal_name: "Protected Person" }, "invalidated protected presentation preserves extra packet-only facts for fail-closed validation");
assert.equal(forbiddenFallbackReads, 1, "an invalidated legal result stays protected while payment mode independently checks current source authority");
assert.equal(invalidatedRuntime.artifact.status, "absent");

const legacyArtifactPayload = {
  provider: "rcap_legacy_mississippi",
  packetId: "legacy-packet",
  fileName: "legacy-packet.pdf",
  contentType: "application/pdf",
  generatedAt: "2026-08-01T00:00:00.000Z",
  source: "mississippi_legacy_petition_packet",
  packetPlanId: "ms-legacy-petition-plan",
  artifactSha256: "d".repeat(64),
  downloadPath: "/api/rcap/documents/legacy-packet/pdf/full",
  courtPacketDownloadPath: "/api/rcap/documents/legacy-packet/pdf/court"
};
const labelOnlyLegacy = adapter.assembleBriefcasePresentationItem({
  item,
  legalAuthority: protectedAuthority,
  protectedArtifact: {
    status: "ready",
    revision: 1,
    verificationHash: null,
    entitlementSource: "legacy_backfill",
    artifact: legacyArtifactPayload
  },
  paymentState: "paid"
});
assert.equal(labelOnlyLegacy.artifact.status, "absent", "a legacy_backfill label without corroborated evidence never grants Ready");

const evidencedLegacy = adapter.assembleBriefcasePresentationItem({
  item,
  legalAuthority: protectedAuthority,
  protectedArtifact: {
    status: "ready",
    revision: 1,
    verificationHash: null,
    entitlementSource: "legacy_backfill",
    consumerAuthUserId: "11111111-1111-4111-8111-111111111111",
    briefcaseItemId: item.id,
    matterId: "44444444-4444-4444-8444-444444444444",
    artifact: legacyArtifactPayload,
    legacyEvidence: {
      kind: "consumer_payment_render_output",
      consumerAuthUserId: "11111111-1111-4111-8111-111111111111",
      briefcaseItemId: item.id,
      matterId: "44444444-4444-4444-8444-444444444444",
      artifactSource: "mississippi_legacy_petition_packet",
      packetPlanId: "ms-legacy-petition-plan",
      artifactSha256: "d".repeat(64),
      paymentProviderEventId: "evt_legacy",
      renderJobId: "55555555-5555-4555-8555-555555555555",
      outputId: "66666666-6666-4666-8666-666666666666",
      verificationHash: null
    }
  },
  paymentState: "paid"
});
assert.equal(evidencedLegacy.artifact.status, "ready", "exact protected issuance and byte evidence admits a legacy artifact");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

const ownerId = "11111111-1111-4111-8111-111111111111";
const sourceAnswers = { case_outcome: "Dismissed" };
const sourceAnswersHash = digest(sourceAnswers);
const durableSourceRow = {
  consumer_auth_user_id: ownerId,
  briefcase_item_id: item.id,
  claimed_user_id: ownerId,
  claimed_at: "2026-07-01T00:00:00.000Z",
  expires_at: "2026-07-02T00:00:00.000Z",
  source_identity: "durable-claimed-source",
  product: "expungement_ai_dtc",
  partner_benefit_active: false,
  partner_slug: null,
  jurisdiction: "PA",
  profile_version: "profile-pa-1",
  matter_id: item.id,
  screening_answers: sourceAnswers,
  screening_answers_sha256: sourceAnswersHash
};
durableSourceRow.source_linkage_sha256 = digest({
  consumerAuthUserId: ownerId,
  briefcaseItemId: item.id,
  matterId: item.id,
  sourceIdentity: durableSourceRow.source_identity,
  claimedAt: durableSourceRow.claimed_at,
  screeningAnswersSha256: sourceAnswersHash,
  product: durableSourceRow.product,
  partnerBenefitActive: durableSourceRow.partner_benefit_active,
  partnerSlug: durableSourceRow.partner_slug
});
let protectedSourceRow = durableSourceRow;
const sourceAdapter = loadTsWithMocks("src/lib/expungement-ai/briefcase-presentation-authority.ts", {
  "server-only": {},
  "@/components/expungement-ai/screening/answers": { toScreeningAnswers: (answers) => answers },
  "@/lib/expungement-ai/authoritative-screening-result": {},
  "@/lib/expungement-ai/consumer-payment-authority": {},
  "@/lib/expungement-ai/packet-information": {},
  "@/lib/expungement-ai/verification-cas": {},
  "@/lib/rcap-engine/evaluator": { InvalidAnswerError: MockInvalidAnswerError },
  "@/lib/supabase/server": {
    getSupabaseAdminClient: () => ({
      rpc: async () => ({ data: protectedSourceRow, error: null })
    })
  }
});
const durableClaimed = await sourceAdapter.readTrustedBriefcasePresentationSource({
  consumerAuthUserId: ownerId,
  item: { ...item, sourceSessionId: "participant-forged-source" }
});
assert.equal(durableClaimed.ok, true, "an exact owner/item-linked claim survives its pre-claim TTL");
protectedSourceRow = {
  ...durableSourceRow,
  product: "rcap_partner",
  partner_benefit_active: true,
  partner_slug: "trusted-partner"
};
protectedSourceRow.source_linkage_sha256 = digest({
  consumerAuthUserId: ownerId,
  briefcaseItemId: item.id,
  matterId: item.id,
  sourceIdentity: protectedSourceRow.source_identity,
  claimedAt: protectedSourceRow.claimed_at,
  screeningAnswersSha256: sourceAnswersHash,
  product: protectedSourceRow.product,
  partnerBenefitActive: protectedSourceRow.partner_benefit_active,
  partnerSlug: protectedSourceRow.partner_slug
});
const currentSponsoredClaim = await sourceAdapter.readTrustedBriefcasePresentationSource({ consumerAuthUserId: ownerId, item });
assert.equal(currentSponsoredClaim.ok, true);
assert.equal(currentSponsoredClaim.value.partnerBenefitActive, true, "sponsorship requires the current protected partner benefit state");
for (const [label, mutate] of [
  ["unclaimed", (row) => { row.claimed_at = null; }],
  ["wrong owner", (row) => { row.claimed_user_id = "99999999-9999-4999-8999-999999999999"; }],
  ["forged item link", (row) => { row.briefcase_item_id = "88888888-8888-4888-8888-888888888888"; }],
  ["inactive partner benefit", (row) => { row.product = "rcap_partner"; row.partner_slug = "stale-partner"; }],
  ["forged fingerprint", (row) => { row.source_linkage_sha256 = "f".repeat(64); }]
]) {
  protectedSourceRow = structuredClone(durableSourceRow);
  mutate(protectedSourceRow);
  const refused = await sourceAdapter.readTrustedBriefcasePresentationSource({ consumerAuthUserId: ownerId, item });
  assert.equal(refused.ok, false, `${label} protected source fails closed`);
}

let protectedArtifactRow = {
  status: "ready",
  revision: 1,
  verification_hash: null,
  entitlement_source: "legacy_backfill",
  artifact: legacyArtifactPayload
};
const actualCas = loadTsWithMocks("src/lib/expungement-ai/verification-cas.ts", {
  "server-only": {},
  "@/lib/supabase/server": {
    getSupabaseAdminClient: () => ({ rpc: async () => ({ data: protectedArtifactRow, error: null }) })
  }
});
const labelOnlyRead = await actualCas.readProtectedPacketArtifact({ consumerAuthUserId: ownerId, briefcaseItemId: item.id });
assert.equal(labelOnlyRead.ok, false, "the actual protected parser rejects a legacy label without evidence");
protectedArtifactRow = {
  ...protectedArtifactRow,
  consumer_auth_user_id: ownerId,
  briefcase_item_id: item.id,
  matter_id: "44444444-4444-4444-8444-444444444444",
  legacy_evidence: evidencedLegacy.artifact.status === "ready"
    ? {
      kind: "consumer_payment_render_output",
      consumerAuthUserId: ownerId,
      briefcaseItemId: item.id,
      matterId: "44444444-4444-4444-8444-444444444444",
      artifactSource: legacyArtifactPayload.source,
      packetPlanId: legacyArtifactPayload.packetPlanId,
      artifactSha256: legacyArtifactPayload.artifactSha256,
      outputId: "66666666-6666-4666-8666-666666666666",
      verificationHash: null,
      paymentProviderEventId: "evt_legacy",
      renderJobId: "55555555-5555-4555-8555-555555555555"
    }
    : null
};
const evidencedRead = await actualCas.readProtectedPacketArtifact({ consumerAuthUserId: ownerId, briefcaseItemId: item.id });
assert.equal(evidencedRead.ok, true, "the actual protected parser admits exact issuance and byte evidence");
protectedArtifactRow = structuredClone(protectedArtifactRow);
protectedArtifactRow.legacy_evidence.packetPlanId = "wrong-plan";
const mismatchedLegacyRead = await actualCas.readProtectedPacketArtifact({ consumerAuthUserId: ownerId, briefcaseItemId: item.id });
assert.equal(mismatchedLegacyRead.ok, false, "legacy plan mismatch fails closed");

console.log("briefcase-presentation-authority: forged-row and protected-first boundaries passed");

// Commercial actions are a server read, never a writable-row or evaluator flag.
for (const failure of [false, true]) {
  const commercial = await adapter.decorateBriefcaseItemForPresentationWithDependencies({
    consumerAuthUserId: "11111111-1111-4111-8111-111111111111",
    item: { ...item, paymentAllowed: true, commercialActions: { checkoutAllowed: true } }
  }, {
    readProtectedVerification: async () => ({ ok: true, value: protectedVerification }),
    readProtectedArtifact: async () => ({ ok: true, value: null }),
    readPaymentAuthority: async () => ({ valid: false, reason: "unpaid" }),
    readTrustedPendingSource: async () => ({ ok: true, value: {
      jurisdiction: "PA", profileVersion: "profile-pa-1", matterId: item.id, answers: {},
      product: "expungement_ai_dtc", sourceSessionId: null, partnerBenefitActive: false, partnerSlug: null
    } }),
    evaluateAuthoritative: () => authoritativeEvaluation,
    readCommercialActions: async (input) => {
      assert.equal(input.legalAuthority.pathwayId, protectedAuthority.pathwayId);
      if (failure) throw new Error("authority unreadable");
      return { fulfillmentAvailable: true, checkoutAllowed: true, generationAllowed: false };
    }
  });
  assert.equal(commercial.resultCode, "packet_ready", "commercial refusal preserves legal result");
  assert.equal(commercial.commercialActions.checkoutAllowed, !failure, "only server action read controls CTA");
}
console.log("briefcase-presentation-authority: server commercial actions fail closed independently of legal results");

// Reproduce run 36141023122 at the actual RPC boundary in disposable PostgreSQL.
// The two identifiers are deliberately different; a hash-only JS fixture would
// never catch a SQL source choosing the screening correlation as its matter.
{
  const { startEphemeralPg } = await import('./lib/rcap-ephemeral-pg.mjs');
  const db = startEphemeralPg();
  const sqlFile = rel => fs.readFileSync(path.join(root, rel), 'utf8');
  const oldSql = sqlFile('supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql');
  const extract = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)) + end.length);
  const original = extract(oldSql, 'create or replace function public.get_consumer_briefcase_presentation_source(', '$source$;');
  const migration = sqlFile('supabase/migrations/20260925134704_canonical_consumer_presentation_matter.sql');
  const corrected = extract(migration, 'create or replace function public.get_consumer_briefcase_presentation_source(', '$source$;');
  assert.equal(corrected, original.replace(/coalesce\(\s*i\.summary_json #>> '\{commercialFlow,screening,screeningMatterId\}',\s*p\.candidate_route_context ->> 'matterId',\s*p\.pending_id::text\s*\) as matter_id/, 'public.consumer_matter_id_for_briefcase_item(i.id)::text as matter_id'), 'only matter authority expression changes');
  const fresh = 'baa3ea24-b656-4743-92a2-b0efb9a48948';
  const pending = '69eb4d66-d672-44be-854d-93e6022d2995';
  const canonicalMatter = '5293f5a5-c2a3-4453-959e-37646d02504a';
  try {
    db.sql(`create schema extensions; create extension pgcrypto with schema extensions;
      create role anon; create role authenticated; create role service_role;
      create table public.consumer_briefcase_items(id uuid primary key,user_id uuid,source_pending_result_id uuid,summary_json jsonb);
      create table public.consumer_pending_screening_results(pending_id uuid primary key,claimed_user_id uuid,claimed_at timestamptz,anonymous_session_id uuid,product text,partner_slug text,jurisdiction text,profile_version text,candidate_route_context jsonb,screening_answers jsonb,status text,claimed_matter_id uuid);`);
    db.sql(extract(sqlFile('supabase/phase-55-expungement-matter-payment-binding.sql'), 'create or replace function public.consumer_matter_id_for_briefcase_item(', '$$;'));
    db.sql(extract(oldSql, 'create or replace function public.consumer_canonical_json(', '$canonical$;'));
    db.sql(original);
    db.sql(`revoke all on function public.get_consumer_briefcase_presentation_source(uuid,uuid) from public;
      grant execute on function public.get_consumer_briefcase_presentation_source(uuid,uuid) to service_role;
      insert into public.consumer_briefcase_items values ('${fresh}','${ownerId}','${pending}','{"commercialFlow":{"screening":{"screeningCorrelationId":"${pending}"}}}');
      insert into public.consumer_pending_screening_results values ('${pending}','${ownerId}','2026-09-25T12:00:00Z',null,'rcap_partner','mvl-demo','MS','fixture-v1','{}','{"case_outcome":"Dismissed"}','CLAIMED','${fresh}');`);
    const rpc = (owner=ownerId,id=fresh) => db.json(`select row_to_json(t) from public.get_consumer_briefcase_presentation_source('${owner}','${id}') t`);
    assert.equal(rpc().matter_id, pending, 'accepted baseline reproduces screening-result identity contradiction');
    const acl = db.scalar("select proacl::text from pg_proc where oid='public.get_consumer_briefcase_presentation_source(uuid,uuid)'::regprocedure");
    const rows = () => db.json("select jsonb_build_object('items',(select jsonb_agg(i) from public.consumer_briefcase_items i),'pending',(select jsonb_agg(p) from public.consumer_pending_screening_results p))");
    const before = rows();
    db.sql(migration);
    const row = rpc();
    assert.equal(row.matter_id, db.scalar(`select public.consumer_matter_id_for_briefcase_item('${fresh}')::text`));
    assert.equal(row.matter_id, canonicalMatter); assert.notEqual(row.matter_id, pending);
    assert.deepEqual(rows(),before,'forward correction rewrites no participant/claim rows');
    assert.equal(db.scalar("select proacl::text from pg_proc where oid='public.get_consumer_briefcase_presentation_source(uuid,uuid)'::regprocedure"),acl);
    assert.equal(db.scalar("select prosecdef and proconfig = ARRAY['search_path=\"\"'] from pg_proc where oid='public.get_consumer_briefcase_presentation_source(uuid,uuid)'::regprocedure"),'t');
    protectedSourceRow = row;
    assert.equal((await sourceAdapter.readTrustedBriefcasePresentationSource({consumerAuthUserId:ownerId,item:{...item,id:fresh}})).ok,true,'real application validates SQL screening and linkage fingerprints');
    protectedSourceRow = {...row,matter_id:pending};
    assert.equal((await sourceAdapter.readTrustedBriefcasePresentationSource({consumerAuthUserId:ownerId,item:{...item,id:fresh}})).ok,false,'changed matter without linkage digest is refused');
    assert.equal(rpc('99999999-9999-4999-8999-999999999999'),null,'stranger denied');
    assert.equal(rpc(ownerId,item.id),null,'wrong item denied');
    for (const change of ["status='PENDING'",`claimed_user_id='99999999-9999-4999-8999-999999999999'`,`claimed_matter_id='${item.id}'`]) {
      const observed=db.sql(`begin; update public.consumer_pending_screening_results set ${change}; select count(*) from public.get_consumer_briefcase_presentation_source('${ownerId}','${fresh}'); rollback;`);
      assert.match(observed,/\n0\n/,'claim predicate fails closed');
    }
    // Exercise the existing runner's actual ledger/prefix/apply code against
    // PostgreSQL, with only Management API transport replaced by the local DB.
    const runner = sqlFile('scripts/rcap-hosted-clinic-migrate.mjs');
    const sequence = new Function('return '+runner.slice(runner.indexOf('Object.freeze(['),runner.indexOf('\n]);',runner.indexOf('const MIGRATIONS'))+3))();
    const ledger='public.rcap_acceptance_clinic_migration_ledger';
    const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
    db.sql(`create table ${ledger}(sequence_position smallint primary key check(sequence_position between 1 and 11),migration_path text not null unique,sha256 text not null unique check(sha256 ~ '^[0-9a-f]{64}$'),application_sha text not null check(application_sha ~ '^[0-9a-f]{40}$'),applied_at timestamptz not null default now());`);
    for (const m of sequence.slice(0,11)) db.sql(`insert into ${ledger}(sequence_position,migration_path,sha256,application_sha) values(${m.sequencePosition},${quote(m.path)},${quote(m.sha256)},'67503e7e8d98b4a63103f4d7b66a413b8eb57823')`);
    const ledgerRows=()=>db.json(`select jsonb_agg(t order by sequence_position) from ${ledger} t`);
    const originalRows=ledgerRows();
    const ledgerCode=runner.slice(runner.indexOf('  await managementQuery(`\n    create table'),runner.indexOf('  const names = (values)'));
    assert.ok(ledgerCode.includes('existing ledger is not an exact prefix'));
    let applied=0;
    const runLedger = async (patchRows=null) => {
      const managementQuery=async(query,caseId)=>{
        if(caseId==='immutable_clinic_migration_ledger_readable')return patchRows??ledgerRows();
        if(/^clinic_migration_\d+_applied$/.test(caseId)) {assert.equal(caseId,'clinic_migration_12_applied');assert.equal(query,migration);applied++;}
        return db.sql(query);
      };
      const execute=new Function('managementQuery','MIGRATIONS','loaded','APPLICATION_SHA','ClinicMigrationFailure','record','evidence','sqlText',`return (async()=>{${ledgerCode}})()`);
      await execute(managementQuery,sequence,sequence.map(m=>({...m,sql:m.sequencePosition===12?migration:'MUST NOT REAPPLY HISTORICAL SQL'})),'2742392d59579d823cd0cdc54456f5e80a210aaf',class extends Error { constructor(id,message){super(id+': '+message);} },(_id,ok)=>assert.ok(ok),{migrations:[]},v=>String(v).replaceAll("'","''"));
    };
    await runLedger();assert.equal(applied,1);assert.equal(ledgerRows().length,12);assert.deepEqual(ledgerRows().slice(0,11),originalRows);
    await runLedger();assert.equal(applied,1,'replay executes no migration SQL');
    assert.match(db.sqlExpectError(`update ${ledger} set application_sha=repeat('a',40) where sequence_position=1`),/clinic_acceptance_ledger_immutable/);
    assert.match(db.sqlExpectError(`delete from ${ledger} where sequence_position=1`),/clinic_acceptance_ledger_immutable/);
    await assert.rejects(runLedger(ledgerRows().slice(1)),/not an exact prefix/);
    const badHash=ledgerRows();badHash[0].sha256='0'.repeat(64);await assert.rejects(runLedger(badHash),/not an exact prefix/);assert.equal(applied,1);
    console.log('PASS actual Clinic migration runner: immutable 11-row prefix preserved, capacity12, only #12 applied, replay no-op, gaps/hash drift refused');
    console.log('PASS PostgreSQL presentation identity: baseline mismatch reproduced, canonical matter/digests verified, owner/claim negatives, grants and rows preserved');
  } finally { db.stop(); }
}
