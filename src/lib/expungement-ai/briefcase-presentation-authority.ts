import "server-only";

import { createHash } from "node:crypto";

import type {
  ConsumerBriefcaseItem,
  ExpungementAiEligibilityResult,
  ExpungementAiResultCode
} from "@/lib/expungement-ai/types";
import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
import {
  consumerPacketPaymentAuthority,
  type ConsumerPaymentAuthorityProbe
} from "@/lib/expungement-ai/consumer-payment-authority";
import type { ConsumerPaymentReceiptAction } from "@/lib/expungement-ai/consumer-payment-receipt";
import {
  readProtectedPacketArtifact,
  readProtectedPacketVerification,
  validProtectedLegacyArtifactEvidence,
  type ProtectedPacketArtifactRecord,
  type ProtectedPacketVerificationRecord,
  type ProtectedReadResult
} from "@/lib/expungement-ai/verification-cas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { InvalidAnswerError } from "@/lib/rcap-engine/evaluator";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import {
  protectedPacketInformationModelFor,
  protectedPacketDraftSeedFromAuthoritative,
  type ProtectedPacketInformationModel
} from "@/lib/expungement-ai/packet-information";

export type BriefcasePresentationAuthorityStatus =
  | "protected_verified"
  | "protected_draft"
  | "trusted_source"
  | "unavailable";

export type BriefcasePresentationArtifact =
  | { status: "absent"; canDownload: false; documents: [] }
  | {
    status: "ready";
    canDownload: boolean;
    source: "source_driven_packet_plan" | "mississippi_legacy_petition_packet" | "grade_a_packet_specification" | "verified_render_job";
    packetId: string;
    packetPlanId: string | null;
    generatedAt: string;
    pageCount?: number;
    documents: Array<{
      kind: "full" | "court";
      fileName: string;
      downloadPath: string;
    }>;
  };

export type BriefcasePresentationItem = {
  id: string;
  createdAt: string;
  authorityStatus: BriefcasePresentationAuthorityStatus;
  unavailableReason: string | null;
  jurisdiction: string | null;
  title: string;
  resultCode: ExpungementAiResultCode | null;
  pathwayId: string | null;
  pathwayLabel: string | null;
  summary: string | null;
  nextSteps: string[];
  checklist: string[];
  packetType: ExpungementAiEligibilityResult["packetType"] | null;
  selectedTrackId: string | null;
  treatmentClassification: ConsumerBriefcaseItem["treatmentClassification"] | null;
  verificationStatus: "verified" | "unverified" | "invalidated" | "trusted_source" | "unavailable";
  packetProgress: "not_started" | "in_progress" | "facts_complete" | "verified" | "unavailable";
  packetDraft:
    | {
      status: "available";
      capturedAt: string;
      initialAnswers: Record<string, AnswerValue>;
      screeningAnswers: Record<string, AnswerValue>;
      prefilledAnswers: Readonly<Record<string, AnswerValue>>;
      packetAnswers: Readonly<Record<string, AnswerValue>>;
      serverFacts: Record<string, AnswerValue>;
      requiredInputIds: string[];
      missingInputIds: string[];
      questions: ProtectedPacketInformationModel["questions"];
      builderQuestions: ProtectedPacketInformationModel["builderQuestions"];
      verificationSummary: ProtectedPacketInformationModel["verificationSummary"];
      verificationContext: ProtectedPacketInformationModel["verificationContext"];
      verificationManifest: ProtectedPacketInformationModel["verificationManifest"];
      packetPlan: ProtectedPacketInformationModel["packetPlan"];
      expectedComponents: string[];
      reviewSafety: { safe: boolean; reason: string };
    }
    | { status: "unavailable" };
  paymentState: "paid" | "refunded" | "unpaid" | "sponsored" | "unavailable";
  paymentReceipt?: ConsumerPaymentReceiptAction;
  artifact: BriefcasePresentationArtifact;
};

export type BriefcaseLegalPresentationAuthority =
  | {
    status: "protected_verified" | "protected_draft" | "trusted_source";
    jurisdiction: string;
    resultCode: ExpungementAiResultCode;
    pathwayId: string | null;
    pathwayLabel: string | null;
    summary: string;
    nextSteps: string[];
    checklist: string[];
    packetType: ExpungementAiEligibilityResult["packetType"] | null;
    selectedTrackId: string | null;
    treatmentClassification: ConsumerBriefcaseItem["treatmentClassification"] | null;
    verificationStatus: BriefcasePresentationItem["verificationStatus"];
    packetProgress: BriefcasePresentationItem["packetProgress"];
    packetDraft: BriefcasePresentationItem["packetDraft"];
  }
  | { status: "unavailable"; reason: string };

export function assembleBriefcasePresentationItem(input: {
  item: Pick<ConsumerBriefcaseItem, "id" | "createdAt">;
  legalAuthority: BriefcaseLegalPresentationAuthority;
  protectedArtifact: ProtectedPacketArtifactRecord | null;
  paymentState: BriefcasePresentationItem["paymentState"];
  paymentReceipt?: ConsumerPaymentReceiptAction | null;
}): BriefcasePresentationItem {
  if (input.legalAuthority.status === "unavailable") {
    const artifact = sanitizeProtectedPresentationArtifact(input.protectedArtifact);
    return {
      id: input.item.id,
      createdAt: input.item.createdAt,
      authorityStatus: "unavailable",
      unavailableReason: input.legalAuthority.reason,
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
      artifact
    };
  }

  const artifact = sanitizeProtectedPresentationArtifact(input.protectedArtifact);
  return {
    id: input.item.id,
    createdAt: input.item.createdAt,
    authorityStatus: input.legalAuthority.status,
    unavailableReason: null,
    jurisdiction: input.legalAuthority.jurisdiction,
    title: input.legalAuthority.pathwayLabel ?? `${input.legalAuthority.jurisdiction} Briefcase matter`,
    resultCode: input.legalAuthority.resultCode,
    pathwayId: input.legalAuthority.pathwayId,
    pathwayLabel: input.legalAuthority.pathwayLabel,
    summary: input.legalAuthority.summary,
    nextSteps: [...input.legalAuthority.nextSteps],
    checklist: [...input.legalAuthority.checklist],
    packetType: input.legalAuthority.packetType,
    selectedTrackId: input.legalAuthority.selectedTrackId,
    treatmentClassification: input.legalAuthority.treatmentClassification,
    verificationStatus: input.legalAuthority.verificationStatus,
    packetProgress: input.legalAuthority.packetProgress,
    packetDraft: input.legalAuthority.packetDraft,
    paymentState: input.paymentState,
    ...((input.paymentState === "paid" || input.paymentState === "refunded") && input.paymentReceipt
      ? { paymentReceipt: input.paymentReceipt }
      : {}),
    artifact
  };
}

function sanitizeProtectedPresentationArtifact(
  protectedArtifact: ProtectedPacketArtifactRecord | null
): BriefcasePresentationArtifact {
  if (protectedArtifact?.status !== "ready" || !protectedArtifact.artifact) {
    return { status: "absent", canDownload: false, documents: [] };
  }
  const value = protectedArtifact.artifact;
  if (protectedArtifact.entitlementSource === "legacy_backfill"
    && !validProtectedLegacyArtifactEvidence(protectedArtifact)) {
    return { status: "absent", canDownload: false, documents: [] };
  }
  if (value.provider === "rcap_source_engine"
    && value.source === "source_driven_packet_plan"
    && typeof value.packetId === "string"
    && typeof value.packetPlanId === "string"
    && typeof value.fileName === "string"
    && typeof value.generatedAt === "string"
    && typeof value.downloadPath === "string") {
    return {
      status: "ready",
      canDownload: true,
      source: "source_driven_packet_plan",
      packetId: value.packetId,
      packetPlanId: value.packetPlanId,
      generatedAt: value.generatedAt,
      documents: [{ kind: "full", fileName: value.fileName, downloadPath: value.downloadPath }]
    };
  }
  if (value.provider === "rcap_legacy_mississippi"
    && value.source === "mississippi_legacy_petition_packet"
    && typeof value.packetId === "string"
    && typeof value.fileName === "string"
    && typeof value.generatedAt === "string"
    && typeof value.downloadPath === "string"
    && typeof value.courtPacketDownloadPath === "string") {
    return {
      status: "ready",
      canDownload: true,
      source: "mississippi_legacy_petition_packet",
      packetId: value.packetId,
      packetPlanId: null,
      generatedAt: value.generatedAt,
      documents: [
        { kind: "full", fileName: value.fileName, downloadPath: value.downloadPath },
        { kind: "court", fileName: value.fileName, downloadPath: value.courtPacketDownloadPath }
      ]
    };
  }
  if (value.provider === "rcap_durable_render_v1"
    && value.source === "verified_render_job"
    && typeof value.packetId === "string"
    && typeof value.renderJobId === "string"
    && typeof value.artifactSha256 === "string"
    && /^[a-f0-9]{64}$/.test(value.artifactSha256)
    && typeof value.fileName === "string"
    && typeof value.generatedAt === "string"
    && typeof value.downloadPath === "string"
    && value.downloadPath.startsWith("/api/expungement-ai/packet/download-link?briefcaseItemId=")) {
    return {
      status: "ready",
      canDownload: true,
      source: "verified_render_job",
      packetId: value.packetId,
      packetPlanId: null,
      generatedAt: value.generatedAt,
      documents: [{ kind: "full", fileName: value.fileName, downloadPath: value.downloadPath }]
    };
  }
  if (value.provider === "rcap_grade_a_composer_v1"
    && value.source === "grade_a_packet_specification"
    && typeof value.packetId === "string"
    && typeof value.fileName === "string"
    && typeof value.generatedAt === "string"
    && typeof value.downloadPath === "string"
    && typeof value.pageCount === "number"
    && value.pageCount > 0) {
    return {
      status: "ready",
      canDownload: true,
      source: "grade_a_packet_specification",
      packetId: value.packetId,
      packetPlanId: null,
      generatedAt: value.generatedAt,
      pageCount: value.pageCount,
      documents: [{ kind: "full", fileName: value.fileName, downloadPath: value.downloadPath }]
    };
  }
  return { status: "absent", canDownload: false, documents: [] };
}

export async function decorateBriefcaseItemForPresentation(input: {
  consumerAuthUserId: string;
  item: ConsumerBriefcaseItem;
}): Promise<BriefcasePresentationItem> {
  return decorateBriefcaseItemForPresentationWithDependencies(input, DEFAULT_PRESENTATION_DEPENDENCIES);
}

export type TrustedBriefcasePresentationSource = {
  jurisdiction: string;
  profileVersion: string;
  matterId: string;
  answers: Record<string, ScreeningAnswerValue>;
  product: "expungement_ai_dtc" | "rcap_partner";
  sourceSessionId: string | null;
  claimedAt: string;
  partnerBenefitActive: boolean;
  partnerSlug: string | null;
};

type AuthoritativeEvaluation = ReturnType<typeof evaluateAuthoritativeScreeningResult>;

export type BriefcasePresentationDependencies = {
  readProtectedVerification(input: {
    consumerAuthUserId: string;
    briefcaseItemId: string;
  }): Promise<ProtectedReadResult<ProtectedPacketVerificationRecord>>;
  readProtectedArtifact(input: {
    consumerAuthUserId: string;
    briefcaseItemId: string;
  }): Promise<ProtectedReadResult<ProtectedPacketArtifactRecord>>;
  readPaymentAuthority(
    briefcaseItemId: string,
    consumerAuthUserId: string
  ): Promise<ConsumerPaymentAuthorityProbe>;
  readPaymentReceiptAction?(input: {
    consumerAuthUserId: string;
    briefcaseItemId: string;
  }): Promise<ConsumerPaymentReceiptAction | null>;
  readTrustedPendingSource(input: {
    consumerAuthUserId: string;
    item: ConsumerBriefcaseItem;
  }): Promise<ProtectedReadResult<TrustedBriefcasePresentationSource>>;
  evaluateAuthoritative(input: {
    jurisdiction: string;
    profileVersion: string;
    matterId: string;
    answers: Record<string, ScreeningAnswerValue>;
  }): AuthoritativeEvaluation;
};

export async function decorateBriefcaseItemForPresentationWithDependencies(
  input: {
    consumerAuthUserId: string;
    item: ConsumerBriefcaseItem;
  },
  dependencies: BriefcasePresentationDependencies
): Promise<BriefcasePresentationItem> {
  const protectedArtifact = await dependencies.readProtectedArtifact({
    consumerAuthUserId: input.consumerAuthUserId,
    briefcaseItemId: input.item.id
  });
  if (!protectedArtifact.ok) {
    return assembleBriefcasePresentationItem({
      item: input.item,
      legalAuthority: { status: "unavailable", reason: protectedArtifact.reason },
      protectedArtifact: null,
      paymentState: "unavailable"
    });
  }
  const verification = await dependencies.readProtectedVerification({
    consumerAuthUserId: input.consumerAuthUserId,
    briefcaseItemId: input.item.id
  });

  let legalAuthority: BriefcaseLegalPresentationAuthority;
  let trustedSource: ProtectedReadResult<TrustedBriefcasePresentationSource> | null = null;
  if (verification.ok) {
    legalAuthority = legalAuthorityFromProtectedVerification(
      input.item.id,
      verification.value,
      dependencies.evaluateAuthoritative
    );
  } else if (verification.reason === "protected_verification_authority_missing") {
    trustedSource = await dependencies.readTrustedPendingSource(input);
    legalAuthority = trustedSource.ok
      ? legalAuthorityFromTrustedSource(trustedSource.value, dependencies.evaluateAuthoritative)
      : { status: "unavailable", reason: trustedSource.reason };
  } else {
    legalAuthority = { status: "unavailable", reason: verification.reason };
  }

  if (legalAuthority.status === "unavailable") {
    return assembleBriefcasePresentationItem({
      item: input.item,
      legalAuthority,
      protectedArtifact: protectedArtifact.value,
      paymentState: "unavailable"
    });
  }

  trustedSource ??= await dependencies.readTrustedPendingSource(input);
  const paymentAuthority = await dependencies.readPaymentAuthority(
    input.item.id,
    input.consumerAuthUserId
  );
  const paymentState = trustedSource.ok && trustedSource.value.product === "rcap_partner"
    && trustedSource.value.partnerBenefitActive
    && Boolean(trustedSource.value.sourceSessionId)
    && Boolean(trustedSource.value.partnerSlug)
    ? "sponsored"
    : paymentPresentationState(paymentAuthority, trustedSource.ok);
  const paymentReceipt = paymentState === "paid" && dependencies.readPaymentReceiptAction
    ? await dependencies.readPaymentReceiptAction({
      consumerAuthUserId: input.consumerAuthUserId,
      briefcaseItemId: input.item.id
    })
    : null;
  return assembleBriefcasePresentationItem({
    item: input.item,
    legalAuthority,
    protectedArtifact: protectedArtifact.value,
    paymentState,
    paymentReceipt
  });
}

function legalAuthorityFromProtectedVerification(
  itemId: string,
  verification: ProtectedPacketVerificationRecord,
  evaluate: BriefcasePresentationDependencies["evaluateAuthoritative"]
): BriefcaseLegalPresentationAuthority {
  const model = protectedPacketInformationModelFor(verification);
  if (!model) return { status: "unavailable", reason: "protected_packet_draft_invalid" };
  const snapshot = verification.status === "verified"
    ? verification.snapshot
    : verification.draftSnapshot;
  if (!snapshot) return { status: "unavailable", reason: "protected_packet_draft_missing" };
  const authoritative = evaluateProtectedPresentationSnapshot(snapshot, itemId, evaluate);
  if (!authoritative) return { status: "unavailable", reason: "protected_snapshot_reevaluation_failed" };
  const evaluation = authoritative.evaluation;
  if (evaluation.jurisdiction !== snapshot.jurisdiction
    || evaluation.profileVersion !== snapshot.profileVersion
    || (evaluation.pathwayId ?? null) !== snapshot.pathwayId
    || evaluation.resultCode !== snapshot.resultCode
    || evaluation.paymentAllowed !== snapshot.paymentAllowed
    || (authoritative.packetType ?? null) !== (snapshot.packetType ?? null)
    || (authoritative.selectedTrackId ?? null) !== snapshot.selectedTrackId
    || (evaluation.treatmentClassification ?? null) !== snapshot.treatmentClassification
    || !canonicalEqual(evaluation.deferralComponentIds ?? [], snapshot.deferralComponentIds)
    || !canonicalEqual(evaluation.packetPlan ?? null, snapshot.packetPlan)) {
    return { status: "unavailable", reason: "protected_snapshot_authority_mismatch" };
  }
  const protectedStatus = verification.status === "verified" ? "protected_verified" : "protected_draft";
  const packetProgress: BriefcasePresentationItem["packetProgress"] = verification.status === "verified"
    ? "verified"
    : model.missingInputIds.length === 0
      ? "facts_complete"
      : Object.keys(model.packetAnswers).length > 0 ? "in_progress" : "not_started";
  return legalAuthorityFromEvaluation(protectedStatus, authoritative, {
    verificationStatus: verification.status,
    packetProgress,
    packetDraft: presentationDraftForModel(model)
  });
}

function legalAuthorityFromTrustedSource(
  source: TrustedBriefcasePresentationSource,
  evaluate: BriefcasePresentationDependencies["evaluateAuthoritative"]
): BriefcaseLegalPresentationAuthority {
  const seeded = protectedPacketVerificationSeedFromTrustedSource(source, evaluate);
  if (!seeded) {
    return { status: "unavailable", reason: "trusted_source_reevaluation_failed" };
  }
  const model = protectedPacketInformationModelFor(seeded.verification);
  return legalAuthorityFromEvaluation("trusted_source", seeded.authoritative, {
    verificationStatus: "trusted_source",
    packetProgress: model ? "not_started" : evaluationPacketProgress(seeded.authoritative),
    packetDraft: model ? presentationDraftForModel(model) : { status: "unavailable" }
  });
}

/** Creates the protected revision-zero seed from the server-owned claim row. */
export function protectedPacketVerificationSeedFromTrustedSource(
  source: TrustedBriefcasePresentationSource,
  evaluate: BriefcasePresentationDependencies["evaluateAuthoritative"] = evaluateAuthoritativeScreeningResult
): { authoritative: AuthoritativeEvaluation; verification: ProtectedPacketVerificationRecord } | null {
  let authoritative: AuthoritativeEvaluation;
  try {
    authoritative = evaluate({
      jurisdiction: source.jurisdiction,
      profileVersion: source.profileVersion,
      matterId: source.matterId,
      answers: source.answers
    });
  } catch {
    return null;
  }
  const seed = protectedPacketDraftSeedFromAuthoritative({
    authoritative,
    screeningAnswers: source.answers as Record<string, AnswerValue>,
    dependencies: {
      commercialFlowVersion: 1,
      entitlementSource: source.product === "rcap_partner" ? "partner_sponsorship" : "consumer_payment",
      productId: authoritative.evaluation.packetPlan ? "expungement_packet" : null
    },
    capturedAt: source.claimedAt
  });
  if (!seed) return null;
  return {
    authoritative,
    verification: {
      status: "unverified",
      reason: "final_verification_not_completed",
      revision: 0,
      draftHash: seed.hash,
      draftSnapshot: seed.snapshot
    }
  };
}

function presentationDraftForModel(
  model: ProtectedPacketInformationModel
): Extract<BriefcasePresentationItem["packetDraft"], { status: "available" }> {
  return {
    status: "available",
    capturedAt: model.capturedAt,
    initialAnswers: model.initialAnswers,
    screeningAnswers: model.screeningAnswers,
    prefilledAnswers: model.prefilledAnswers,
    packetAnswers: model.packetAnswers,
    serverFacts: model.serverFacts,
    requiredInputIds: [...model.requiredInputIds],
    missingInputIds: [...model.missingInputIds],
    questions: model.questions,
    builderQuestions: model.builderQuestions,
    verificationSummary: model.verificationSummary,
    verificationContext: model.verificationContext,
    verificationManifest: model.verificationManifest,
    packetPlan: model.packetPlan,
    expectedComponents: [...model.expectedComponents],
    reviewSafety: model.reviewSafety
  };
}

function legalAuthorityFromEvaluation(
  status: "protected_verified" | "protected_draft" | "trusted_source",
  authoritative: AuthoritativeEvaluation,
  options: {
    verificationStatus: BriefcasePresentationItem["verificationStatus"];
    packetProgress: BriefcasePresentationItem["packetProgress"];
    packetDraft: BriefcasePresentationItem["packetDraft"];
  }
): BriefcaseLegalPresentationAuthority {
  const evaluation = authoritative.evaluation;
  const packetPlan = evaluation.packetPlan as (typeof evaluation.packetPlan & { packetReadyWhen?: unknown }) | undefined;
  return {
    status,
    jurisdiction: evaluation.jurisdiction,
    resultCode: evaluation.resultCode,
    pathwayId: evaluation.pathwayId ?? null,
    pathwayLabel: authoritative.pathwayLabel,
    summary: evaluation.userLabel,
    nextSteps: stringArray(evaluation.nextSteps),
    checklist: stringArray(packetPlan?.packetReadyWhen),
    packetType: authoritative.packetType ?? null,
    selectedTrackId: authoritative.selectedTrackId,
    treatmentClassification: evaluation.treatmentClassification ?? null,
    verificationStatus: options.verificationStatus,
    packetProgress: options.packetProgress,
    packetDraft: options.packetDraft
  };
}

function evaluateProtectedPresentationSnapshot(
  snapshot: Parameters<typeof screeningAnswersForProtectedSnapshot>[0] & { jurisdiction: string; profileVersion: string },
  matterId: string,
  evaluate: BriefcasePresentationDependencies["evaluateAuthoritative"]
): AuthoritativeEvaluation | null {
  const answers = screeningAnswersForProtectedSnapshot(snapshot);
  try {
    return evaluate({ jurisdiction: snapshot.jurisdiction, profileVersion: snapshot.profileVersion, matterId, answers });
  } catch (error) {
    if (!(error instanceof InvalidAnswerError)) return null;
    for (const id of error.invalidQuestionIds) delete answers[id];
    try {
      return evaluate({ jurisdiction: snapshot.jurisdiction, profileVersion: snapshot.profileVersion, matterId, answers });
    } catch {
      return null;
    }
  }
}

function screeningAnswersForProtectedSnapshot(snapshot: {
  screeningAnswers: Record<string, unknown>;
  prefilledAnswers: Record<string, unknown>;
  packetAnswers: Record<string, unknown>;
}): Record<string, ScreeningAnswerValue> {
  return toScreeningAnswers({
    ...snapshot.screeningAnswers,
    ...snapshot.prefilledAnswers,
    ...snapshot.packetAnswers
  } as Record<string, AnswerValue>);
}

function evaluationPacketProgress(
  authoritative: AuthoritativeEvaluation
): BriefcasePresentationItem["packetProgress"] {
  return authoritative.evaluation.packetPlan ? "not_started" : "unavailable";
}

function paymentPresentationState(
  authority: ConsumerPaymentAuthorityProbe,
  trustedSourceAvailable: boolean
): BriefcasePresentationItem["paymentState"] {
  if (authority.valid) return "paid";
  if (trustedSourceAvailable && ["no_authority_row", "not_paid", "unpaid", "payment_not_recorded", "payment_status_unpaid"].includes(authority.reason)) {
    return "unpaid";
  }
  return "unavailable";
}

export async function readTrustedBriefcasePresentationSource(input: {
  consumerAuthUserId: string;
  item: ConsumerBriefcaseItem;
}): Promise<ProtectedReadResult<TrustedBriefcasePresentationSource>> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: "trusted_source_storage_unavailable" };
  const { data, error } = await supabase.rpc("get_consumer_briefcase_presentation_source", {
    p_consumer_auth_user_id: input.consumerAuthUserId,
    p_briefcase_item_id: input.item.id
  });
  if (error) return { ok: false, reason: error.message };
  const row = (Array.isArray(data) ? data.length === 1 ? data[0] : null : data) as Record<string, unknown> | null;
  if (!row
    || row.consumer_auth_user_id !== input.consumerAuthUserId
    || row.briefcase_item_id !== input.item.id
    || row.claimed_user_id !== input.consumerAuthUserId
    || typeof row.claimed_at !== "string"
    || !nonEmpty(row.source_identity)
    || (row.product !== "expungement_ai_dtc" && row.product !== "rcap_partner")
    || typeof row.partner_benefit_active !== "boolean"
    || (row.product === "rcap_partner" && (row.partner_benefit_active !== true || !nonEmpty(row.partner_slug)))
    || (row.product === "expungement_ai_dtc" && (row.partner_benefit_active !== false || row.partner_slug != null))
    || typeof row.jurisdiction !== "string"
    || typeof row.profile_version !== "string"
    || typeof row.matter_id !== "string"
    || !isRecord(row.screening_answers)
    || !sha256(row.screening_answers_sha256)
    || !sha256(row.source_linkage_sha256)) {
    return { ok: false, reason: "trusted_source_invalid" };
  }
  const answersHash = canonicalSha256(row.screening_answers);
  const linkageHash = canonicalSha256({
    consumerAuthUserId: input.consumerAuthUserId,
    briefcaseItemId: input.item.id,
    matterId: row.matter_id,
    sourceIdentity: row.source_identity,
    claimedAt: row.claimed_at,
    screeningAnswersSha256: answersHash,
    product: row.product,
    partnerBenefitActive: row.partner_benefit_active,
    partnerSlug: row.partner_slug ?? null
  });
  if (answersHash !== row.screening_answers_sha256 || linkageHash !== row.source_linkage_sha256) {
    return { ok: false, reason: "trusted_source_fingerprint_mismatch" };
  }
  return {
    ok: true,
    value: {
      jurisdiction: row.jurisdiction,
      profileVersion: row.profile_version,
      matterId: row.matter_id,
      answers: row.screening_answers as Record<string, ScreeningAnswerValue>,
      product: row.product,
      sourceSessionId: row.source_identity,
      claimedAt: row.claimed_at,
      partnerBenefitActive: row.partner_benefit_active,
      partnerSlug: typeof row.partner_slug === "string" ? row.partner_slug : null
    }
  };
}

function canonicalSha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function sha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

const DEFAULT_PRESENTATION_DEPENDENCIES: BriefcasePresentationDependencies = {
  readProtectedVerification: readProtectedPacketVerification,
  readProtectedArtifact: readProtectedPacketArtifact,
  readPaymentAuthority: consumerPacketPaymentAuthority,
  readTrustedPendingSource: readTrustedBriefcasePresentationSource,
  evaluateAuthoritative: evaluateAuthoritativeScreeningResult
};

function canonicalEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function decorateBriefcaseItemsForPresentation(input: {
  consumerAuthUserId: string;
  items: ConsumerBriefcaseItem[];
}): Promise<BriefcasePresentationItem[]> {
  return Promise.all(input.items.map((item) => decorateBriefcaseItemForPresentation({
    consumerAuthUserId: input.consumerAuthUserId,
    item
  })));
}
