import "server-only";

import { createHash } from "node:crypto";

import type {
  ConsumerBriefcaseItem,
  PacketVerificationRecord,
  PacketVerificationSnapshot
} from "@/lib/expungement-ai/types";
import type { AnswerValue, PacketPlan, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import type { PublicQuestion } from "@/lib/rcap-engine/contracts";
import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
import { InvalidAnswerError } from "@/lib/rcap-engine/evaluator";
import { toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import {
  readProtectedPacketVerification,
  type ProtectedPacketDraftSnapshot,
  type ProtectedPacketVerificationRecord,
  type ProtectedPacketVerificationTransition
} from "@/lib/expungement-ai/verification-cas";

export type PacketInformationStage = "not_started" | "in_progress" | "facts_complete" | "ready_to_generate";

export type PacketVerificationSummaryFact = {
  key: string;
  id: string;
  label: string;
  value: unknown;
  source: "screeningAnswers" | "prefilledAnswers" | "packetAnswers" | "serverFacts";
  /** Jurisdiction and selected-pathway ids are display context, not participant answers. */
  systemContext: boolean;
};

export type PacketVerificationContextFact = {
  key: string;
  label: string;
  value: unknown;
  /** Display-only server context. It is never participant answer authority. */
  systemContext: true;
};

export type PacketVerificationManifest = {
  schemaVersion: "expungement-ai/verification-review-manifest/v1";
  factKeys: string[];
  systemContextKeys: string[];
};

export type PacketInformationModel = {
  stateCode: string;
  stateName: string;
  pathwayId: string | null;
  pathwayLabel: string;
  packetPlan: PacketPlan | null;
  questions: ProfileQuestion[];
  builderQuestions: ProfileQuestion[];
  initialAnswers: Record<string, AnswerValue>;
  screeningAnswers: Record<string, AnswerValue>;
  /** Explicit protected-authority facts; arbitrary persisted serverFacts are discarded. */
  serverFacts: Record<string, AnswerValue>;
  /** Canonical review surface for every fact map covered by the verification hash. */
  verificationSummary: PacketVerificationSummaryFact[];
  /** Completeness surface for every non-participant snapshot dependency. */
  verificationContext: PacketVerificationContextFact[];
  verificationManifest: PacketVerificationManifest;
  requiredInputIds: string[];
  missingInputIds: string[];
  stage: PacketInformationStage;
  updatedAt: string | null;
  reviewedAt: string | null;
};

export type ProtectedPacketInformationModel = Pick<
  PacketInformationModel,
  | "stateCode"
  | "pathwayId"
  | "packetPlan"
  | "questions"
  | "builderQuestions"
  | "initialAnswers"
  | "screeningAnswers"
  | "serverFacts"
  | "requiredInputIds"
  | "missingInputIds"
  | "stage"
  | "reviewedAt"
  | "verificationSummary"
  | "verificationContext"
  | "verificationManifest"
> & {
  prefilledAnswers: Record<string, AnswerValue>;
  packetAnswers: Record<string, AnswerValue>;
  capturedAt: string;
  reviewSafety: { safe: boolean; reason: string };
  expectedComponents: string[];
};

type CommercialFlow = {
  version?: unknown;
  entitlementSource?: unknown;
  productId?: unknown;
  screening?: {
    profileVersion?: unknown;
    screeningMatterId?: unknown;
    pathwayId?: unknown;
    pathwayLabel?: unknown;
    resultCode?: unknown;
    paymentAllowed?: unknown;
    packetType?: unknown;
    packetPlan?: unknown;
    answers?: unknown;
  };
  packetInformation?: {
    stage?: unknown;
    requiredInputIds?: unknown;
    serverFacts?: unknown;
    prefilledAnswers?: unknown;
    answers?: unknown;
    missingInputIds?: unknown;
    updatedAt?: unknown;
    reviewedAt?: unknown;
  };
  verification?: unknown;
};

/** Build the exact state/pathway questionnaire from the server-saved packet plan. */
export function packetInformationModelFor(item: ConsumerBriefcaseItem): PacketInformationModel | null {
  const profile = getProfileByJurisdiction(item.state);
  if (!profile) return null;
  const flow = commercialFlowForItem(item, profile);
  if (!flow) return null;

  const publicProfile = projectPublicProfile(profile);
  const screening = isRecord(flow.screening) ? flow.screening : {};
  const progress = isRecord(flow.packetInformation) ? flow.packetInformation : {};
  const packetPlan = readPacketPlan(screening.packetPlan);
  const requiredInputIds = packetPlan?.requiredInputIds
    ?? stringArray(progress.requiredInputIds);
  const pathwayId = typeof screening.pathwayId === "string"
    ? screening.pathwayId
    : packetPlan?.pathwayId ?? null;
  const serverFacts = canonicalServerFacts(profile.jurisdiction.code, pathwayId);
  const screeningAnswers = answerRecord(screening.answers);
  const prefilledAnswers = answerRecord(progress.prefilledAnswers);
  const savedAnswers = answerRecord(progress.answers);
  const initialAnswers: Record<string, AnswerValue> = {
    ...Object.fromEntries(requiredInputIds.filter((id) => id in screeningAnswers).map((id) => [id, screeningAnswers[id]])),
    ...prefilledAnswers,
    ...savedAnswers
  };

  const mississippiNonConviction = profile.jurisdiction.code === "MS"
    && pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
  if (mississippiNonConviction) {
    for (const id of ["ownership_scope", "jurisdiction_scope", "resolved_timing_bucket", "court_requirements_completed"]) {
      if (!(id in initialAnswers) && id in screeningAnswers) initialAnswers[id] = screeningAnswers[id];
    }
    if (!("offense_category" in initialAnswers) && "offense_level" in initialAnswers) initialAnswers.offense_category = initialAnswers.offense_level;
    if (!("sentence_completion_date" in initialAnswers) && screeningAnswers.court_requirements_completed) {
      initialAnswers.sentence_completion_date = answerTextRaw(screeningAnswers.court_requirements_completed) === "yes" ? "Yes" : "No";
    }
    if (!("court_requirements_completed" in initialAnswers) && screeningAnswers.court_requirements_completed) {
      initialAnswers.court_requirements_completed = screeningAnswers.court_requirements_completed;
    }
  }

  const questionById = new Map<string, ProfileQuestion>();
  for (const question of allPublicQuestions(publicProfile)) {
    questionById.set(question.id, toProfileQuestion(question));
  }

  let questions = requiredInputIds
    .filter((id) => !(id in serverFacts))
    .map((id) => questionById.get(id) ?? fallbackPacketQuestion(id))
    .map((question) => ({ ...question, required: true, contextOnly: false }));
  if (mississippiNonConviction) {
    const owner = answerTextRaw(screeningAnswers.ownership_scope).toLowerCase() === "yes";
    questions = questions.map((question) => question.id === "pending_cases"
      ? { ...question, prompt: owner ? "Do you currently have any pending criminal charges?" : "Does this person currently have any pending criminal charges?" }
      : question.id === "residency_or_location"
        ? { ...question, prompt: "What city do you currently live in?", helperText: "This is used for the petitioner city in the packet." }
        : question.id === "offense_category"
          ? { ...question, prompt: "How is the offense classified on the court record?", helperText: "Use the classification printed on the record; for this route it is carried forward from the charge level when they match." }
          : question);
    const courtCompletion = questionById.get("court_requirements_completed")
      ?? packetQuestion("court_requirements_completed", owner ? "Have you completed everything the court ordered in this case?" : "Has this person completed everything the court ordered in this case?", "yes_no_unsure");
    questions.push({ ...courtCompletion, required: true, contextOnly: false });
    for (const id of ["ownership_scope", "jurisdiction_scope", "resolved_timing_bucket"]) {
      const known = questionById.get(id);
      if (known && !questions.some((question) => question.id === id)) questions.push({ ...known, required: true, contextOnly: false });
    }
  }
  const builderQuestions = mississippiNonConviction
    ? questions.filter((question) => !["offense_category", "offense_level", "sentence_completion_date", "court_requirements_completed", "ownership_scope", "jurisdiction_scope", "resolved_timing_bucket"].includes(question.id))
    : questions;
  const missingInputIds = missingRequiredInputs(requiredInputIds, serverFacts, initialAnswers);
  const verificationSummary = verificationSummaryFor(flow, questionById, serverFacts);
  const verificationContext = verificationContextFor(
    verificationContextSourceFor(item, flow, profile, pathwayId)
  );
  const verificationManifest: PacketVerificationManifest = {
    schemaVersion: "expungement-ai/verification-review-manifest/v1",
    factKeys: verificationSummary.map((fact) => fact.key),
    systemContextKeys: verificationContext.map((entry) => entry.key)
  };

  return {
    stateCode: profile.jurisdiction.code,
    stateName: profile.jurisdiction.name,
    pathwayId,
    pathwayLabel: typeof screening.pathwayLabel === "string"
      ? screening.pathwayLabel
      : item.pathwayLabel ?? `${profile.jurisdiction.name} record-clearing`,
    packetPlan,
    questions,
    builderQuestions,
    initialAnswers,
    screeningAnswers,
    serverFacts,
    verificationSummary,
    verificationContext,
    verificationManifest,
    requiredInputIds,
    missingInputIds,
    stage: packetInformationStage(progress.stage),
    updatedAt: typeof progress.updatedAt === "string" ? progress.updatedAt : null,
    reviewedAt: typeof progress.reviewedAt === "string" ? progress.reviewedAt : null
  };
}

export function reviewedPacketInputHash(item: ConsumerBriefcaseItem) {
  const verification = packetVerificationState(item);
  return verification.status === "verified" ? verification.hash : null;
}

export function missingRequiredInputs(
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>,
  answers: Record<string, AnswerValue>
) {
  return requiredInputIds.filter((id) => !answerIsKnown(serverFacts[id]) && !answerIsKnown(answers[id]));
}

export function expectedPacketComponents(plan: PacketPlan | null): string[] {
  if (plan?.mode === "official_form_overlay_or_source_form_set") {
    return [
      "Completed self-help court forms for this matter",
      "A filing-preparation checklist",
      "Plain-language filing and next-step instructions"
    ];
  }
  return [
    "A personalized self-help court-filing packet for this matter",
    "A filing-preparation checklist",
    "Plain-language filing and next-step instructions"
  ];
}

export function packetInformationPatch(input: {
  existingItem: ConsumerBriefcaseItem;
  answers: Record<string, AnswerValue>;
  verify?: boolean;
  /** Service-role protected state read immediately before deriving this transition. */
  protectedVerification: ProtectedPacketVerificationRecord;
  /** Compatibility only. Saving the final fact is never verification. */
  reviewed?: boolean;
}) {
  const priorProtected = input.protectedVerification;
  const current = protectedPacketInformationModelFor(priorProtected);
  if (!current) return null;
  const allowedIds = new Set(current.requiredInputIds.filter((id) => !(id in current.serverFacts)));
  const acceptedAnswers = Object.fromEntries(
    Object.entries(input.answers).filter(([id, answer]) => allowedIds.has(id) && isAnswerValue(answer))
  );
  const answerDelta = Object.fromEntries(
    Object.entries(acceptedAnswers).filter(([id, answer]) => !canonicalEqual(current.initialAnswers[id], answer))
  );
  const savedAnswers = { ...answerRecordForIds(current.packetAnswers, allowedIds), ...answerDelta };
  const materialFactChange = Object.keys(answerDelta).length > 0;
  const currentVerification = packetVerificationStateForRecord(input.existingItem, priorProtected, true);
  if (!materialFactChange && (input.verify !== true || currentVerification.status === "verified")) {
    const ready = currentVerification.status === "verified";
    const packetInformation = {
      stage: ready ? "ready_to_generate" as const : current.stage,
      requiredInputIds: current.requiredInputIds,
      serverFacts: current.serverFacts,
      prefilledAnswers: current.prefilledAnswers,
      answers: current.packetAnswers,
      missingInputIds: current.missingInputIds,
      updatedAt: current.capturedAt,
      reviewedAt: current.reviewedAt,
      reviewSafety: { safe: ready, reason: ready ? "authoritative_route_confirmed" : currentVerification.reason }
    };
    const protectedTransition: ProtectedPacketVerificationTransition = {
      expectedPriorHash: priorProtected.status === "verified" ? priorProtected.hash ?? null : null,
      expectedPriorRevision: priorProtected.revision,
      answerDelta,
      packetInformationMetadata: packetInformationMetadata(packetInformation),
      nextVerification: priorProtected
    };
    return {
      patch: {
        commercialFlow: {
          packetInformation,
          verification: priorProtected
        }
      },
      protectedTransition,
      missingInputIds: current.missingInputIds,
      readyToGenerate: ready,
      reviewReason: ready ? "current_verification_preserved" : "semantic_noop_preserved"
    };
  }
  const now = new Date().toISOString();
  const nextDraft = !materialFactChange && priorProtected.draftSnapshot
    ? priorProtected.draftSnapshot
    : deriveProtectedPacketDraftSnapshot(priorProtected, savedAnswers, now);
  if (!nextDraft) return null;
  const nextDraftHash = protectedPacketDraftHash(nextDraft);
  const draftRecord: ProtectedPacketVerificationRecord = {
    ...priorProtected,
    status: "invalidated",
    reason: "draft_rederived_pending_verification",
    hash: undefined,
    snapshot: undefined,
    draftHash: nextDraftHash,
    draftSnapshot: nextDraft
  };
  const nextModel = protectedPacketInformationModelFor(draftRecord);
  if (!nextModel) return null;
  const review = input.verify === true && nextModel.missingInputIds.length === 0
    ? protectedPacketDraftReviewSafety(nextDraft)
    : {
      safe: false,
      reason: nextModel.missingInputIds.length === 0 ? "final_verification_required" : "packet_information_incomplete"
    };
  const stage: PacketInformationStage = review.safe
    ? "ready_to_generate"
    : nextModel.missingInputIds.length === 0 ? "facts_complete" : "in_progress";
  const packetInformation = {
    stage,
    requiredInputIds: nextModel.requiredInputIds,
    serverFacts: nextModel.serverFacts,
    prefilledAnswers: nextModel.prefilledAnswers,
    answers: nextModel.packetAnswers,
    missingInputIds: nextModel.missingInputIds,
    updatedAt: now,
    reviewedAt: review.safe ? now : null,
    reviewSafety: review
  };
  const verification = review.safe
    ? verifiedPacketRecordFromDraft(nextDraft, now)
    : unverifiedOrInvalidatedPacketRecord(priorProtected, now, input.verify === true
      ? review.reason
      : "facts_saved_after_verification");
  const nextVerification: ProtectedPacketVerificationRecord = {
    ...verification,
    draftHash: nextDraftHash,
    draftSnapshot: nextDraft,
    revision: priorProtected.revision + 1
  };
  const protectedTransition: ProtectedPacketVerificationTransition = {
    expectedPriorHash: priorProtected.status === "verified" ? priorProtected.hash ?? null : null,
    expectedPriorRevision: priorProtected.revision,
    answerDelta,
    packetInformationMetadata: packetInformationMetadata(packetInformation),
    nextVerification
  };

  return {
    patch: {
      commercialFlow: {
        packetInformation,
        verification: nextVerification
      }
    },
    protectedTransition,
    missingInputIds: nextModel.missingInputIds,
    readyToGenerate: review.safe,
    reviewReason: review.reason
  };
}

export function packetVerificationState(item: ConsumerBriefcaseItem): PacketVerificationRecord {
  const flow = readCommercialFlow(item.artifactRefs);
  const stored = readVerificationRecord(flow?.verification);
  return packetVerificationStateForRecord(item, stored);
}

/** Pure authority check used after a protected service-role read. JSON verification is ignored. */
export function requireCurrentPacketVerificationRecord(
  item: ConsumerBriefcaseItem,
  protectedVerification: ProtectedPacketVerificationRecord | null
): {
  hash: string;
  snapshot: PacketVerificationSnapshot;
  revision: number;
  draftHash: string;
  draftSnapshot: ProtectedPacketDraftSnapshot;
} {
  if (!protectedVerification) {
    throw new CurrentPacketVerificationRequiredError("protected_verification_missing");
  }
  const verification = packetVerificationStateForRecord(item, protectedVerification, true);
  if (verification.status !== "verified" || !verification.hash || !verification.snapshot) {
    throw new CurrentPacketVerificationRequiredError(verification.reason);
  }
  return {
    hash: verification.hash,
    snapshot: verification.snapshot,
    revision: protectedVerification.revision,
    draftHash: protectedVerification.draftHash,
    draftSnapshot: protectedVerification.draftSnapshot
  };
}

/** Every commerce boundary reloads protected authority and then rederives it. */
export async function requireCurrentPacketVerification(
  consumerAuthUserId: string,
  item: ConsumerBriefcaseItem
): Promise<ReturnType<typeof requireCurrentPacketVerificationRecord>> {
  const protectedRead = await readProtectedPacketVerification({
    consumerAuthUserId,
    briefcaseItemId: item.id
  });
  if (!protectedRead.ok) {
    throw new CurrentPacketVerificationRequiredError(protectedRead.reason);
  }
  return requireCurrentPacketVerificationRecord(item, protectedRead.value);
}

function packetVerificationStateForRecord(
  item: ConsumerBriefcaseItem,
  stored: PacketVerificationRecord | ProtectedPacketVerificationRecord | null,
  protectedAuthority = false
): PacketVerificationRecord {
  if (protectedAuthority && stored) {
    return protectedPacketInformationModelFor(stored as ProtectedPacketVerificationRecord)
      ? stored
      : { status: "invalidated", reason: "protected_verification_dependencies_changed" };
  }
  const flow = readCommercialFlow(item.artifactRefs);
  if (!flow || !stored || stored.status !== "verified" || !stored.hash || !stored.snapshot) {
    return stored ?? { status: "unverified", reason: "final_verification_missing" };
  }
  const model = packetInformationModelFor(item);
  if (!model || model.stage !== "ready_to_generate" || model.missingInputIds.length > 0 || !model.reviewedAt) {
    return { status: "invalidated", reason: "packet_information_not_ready" };
  }
  if (!packetInformationReviewSafety(item).safe) {
    return { status: "invalidated", reason: "authoritative_verification_failed" };
  }
  const currentSnapshot = buildPacketVerificationSnapshot(item, flow, stored.snapshot.verifiedAt);
  const currentHash = currentSnapshot ? packetVerificationHash(currentSnapshot) : null;
  if (!currentSnapshot || currentHash !== stored.hash) {
    return { status: "invalidated", reason: "verification_dependencies_changed" };
  }
  return stored;
}

/**
 * Reconstruct the exact reviewed packet facts from protected authority alone.
 * The participant JSON commercialFlow is a compatibility mirror and is never
 * required after the protected snapshot exists.
 */
export function protectedPacketInformationModelFor(
  verification: ProtectedPacketVerificationRecord
): ProtectedPacketInformationModel | null {
  const snapshot = protectedAuthoritySnapshotFor(verification);
  if (!snapshot) return null;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  if (!profile || profile.profileVersion !== snapshot.profileVersion) return null;
  if (snapshot.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)) return null;
  const authoritative = evaluateProtectedPacketFacts(snapshot);
  if (!authoritative) return null;
  const evaluation = authoritative.evaluation;
  if ((evaluation.pathwayId ?? null) !== snapshot.pathwayId
    || evaluation.resultCode !== snapshot.resultCode
    || evaluation.paymentAllowed !== snapshot.paymentAllowed
    || (authoritative.packetType ?? null) !== (snapshot.packetType ?? null)
    || (authoritative.selectedTrackId ?? null) !== snapshot.selectedTrackId
    || (evaluation.treatmentClassification ?? null) !== snapshot.treatmentClassification
    || !canonicalEqual(evaluation.deferralComponentIds ?? [], snapshot.deferralComponentIds)
    || !canonicalEqual(evaluation.packetPlan ?? null, snapshot.packetPlan)) return null;
  const packetPlan = readPacketPlan(snapshot.packetPlan);
  if (packetPlan && packetPlan.pathwayId !== snapshot.pathwayId) return null;
  const {
    screeningAnswers,
    prefilledAnswers,
    packetAnswers,
    serverFacts
  } = sourceDisjointFactMaps({
    screeningAnswers: snapshot.screeningAnswers,
    prefilledAnswers: snapshot.prefilledAnswers,
    packetAnswers: snapshot.packetAnswers,
    serverFacts: snapshot.serverFacts
  });
  const initialAnswers = { ...screeningAnswers, ...prefilledAnswers, ...packetAnswers };
  const requiredInputIds = stringArray(snapshot.requiredInputIds);
  if (!canonicalEqual(requiredInputIds, packetPlan?.requiredInputIds ?? [])) return null;
  const missingInputIds = missingRequiredInputs(requiredInputIds, serverFacts, initialAnswers);
  const questionSurface = protectedPacketQuestionSurface(
    profile,
    snapshot.pathwayId,
    screeningAnswers,
    requiredInputIds,
    serverFacts
  );
  const summaryFlow: CommercialFlow = {
    screening: { answers: screeningAnswers },
    packetInformation: {
      prefilledAnswers,
      answers: packetAnswers,
      serverFacts
    }
  };
  const verificationSummary = verificationSummaryFor(summaryFlow, questionSurface.questionById, serverFacts);
  const verificationContext = verificationContextFor(snapshot as unknown as Record<string, unknown>);
  const verificationManifest: PacketVerificationManifest = {
    schemaVersion: "expungement-ai/verification-review-manifest/v1",
    factKeys: verificationSummary.map((fact) => fact.key),
    systemContextKeys: verificationContext.map((entry) => entry.key)
  };
  const reviewSafety = verification.status === "verified"
    ? { safe: true, reason: "authoritative_route_confirmed" }
    : "capturedAt" in snapshot ? protectedPacketDraftReviewSafety(snapshot) : { safe: false, reason: verification.reason };
  return {
    stateCode: snapshot.jurisdiction,
    pathwayId: snapshot.pathwayId,
    packetPlan,
    questions: questionSurface.questions,
    builderQuestions: questionSurface.builderQuestions,
    initialAnswers,
    screeningAnswers,
    prefilledAnswers,
    packetAnswers,
    serverFacts,
    requiredInputIds,
    missingInputIds,
    stage: verification.status === "verified"
      ? "ready_to_generate"
      : missingInputIds.length === 0 ? "facts_complete" : "in_progress",
    reviewedAt: verification.status === "verified" && "verifiedAt" in snapshot ? snapshot.verifiedAt : null,
    capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt,
    verificationSummary,
    verificationContext,
    verificationManifest,
    reviewSafety,
    expectedComponents: expectedPacketComponents(packetPlan)
  };
}

type ProtectedPacketAuthoritySnapshot = PacketVerificationSnapshot | ProtectedPacketDraftSnapshot;

function protectedPacketQuestionSurface(
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>,
  pathwayId: string | null,
  screeningAnswers: Record<string, AnswerValue>,
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>
) {
  const questionById = new Map<string, ProfileQuestion>();
  for (const question of allPublicQuestions(projectPublicProfile(profile))) {
    questionById.set(question.id, toProfileQuestion(question));
  }
  let questions = requiredInputIds
    .filter((id) => !(id in serverFacts))
    .map((id) => questionById.get(id) ?? fallbackPacketQuestion(id))
    .map((question) => ({ ...question, required: true, contextOnly: false }));
  const mississippiNonConviction = profile.jurisdiction.code === "MS"
    && pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
  if (mississippiNonConviction) {
    const owner = answerTextRaw(screeningAnswers.ownership_scope).toLowerCase() === "yes";
    questions = questions.map((question) => question.id === "pending_cases"
      ? { ...question, prompt: owner ? "Do you currently have any pending criminal charges?" : "Does this person currently have any pending criminal charges?" }
      : question.id === "residency_or_location"
        ? { ...question, prompt: "What city do you currently live in?", helperText: "This is used for the petitioner city in the packet." }
        : question.id === "offense_category"
          ? { ...question, prompt: "How is the offense classified on the court record?", helperText: "Use the classification printed on the record; for this route it is carried forward from the charge level when they match." }
          : question);
    const courtCompletion = questionById.get("court_requirements_completed")
      ?? packetQuestion("court_requirements_completed", owner ? "Have you completed everything the court ordered in this case?" : "Has this person completed everything the court ordered in this case?", "yes_no_unsure");
    if (!questions.some((question) => question.id === courtCompletion.id)) {
      questions.push({ ...courtCompletion, required: true, contextOnly: false });
    }
    for (const id of ["ownership_scope", "jurisdiction_scope", "resolved_timing_bucket"]) {
      const known = questionById.get(id);
      if (known && !questions.some((question) => question.id === id)) {
        questions.push({ ...known, required: true, contextOnly: false });
      }
    }
  }
  const builderQuestions = mississippiNonConviction
    ? questions.filter((question) => !["offense_category", "offense_level", "sentence_completion_date", "court_requirements_completed", "ownership_scope", "jurisdiction_scope", "resolved_timing_bucket"].includes(question.id))
    : questions;
  return { questionById, questions, builderQuestions };
}

function protectedAuthoritySnapshotFor(
  verification: ProtectedPacketVerificationRecord
): ProtectedPacketAuthoritySnapshot | null {
  if (verification.status === "verified") {
    if (!verification.snapshot || !verification.hash
      || packetVerificationHash(verification.snapshot) !== verification.hash) return null;
    if (!verification.draftSnapshot || !verification.draftHash
      || protectedPacketDraftHash(verification.draftSnapshot) !== verification.draftHash
      || !protectedDraftMatchesFinal(verification.draftSnapshot, verification.snapshot)) return null;
    return verification.snapshot;
  }
  if (!verification.draftSnapshot || !verification.draftHash
    || protectedPacketDraftHash(verification.draftSnapshot) !== verification.draftHash) return null;
  return verification.draftSnapshot;
}

function protectedDraftMatchesFinal(
  draft: ProtectedPacketDraftSnapshot,
  finalSnapshot: PacketVerificationSnapshot
) {
  const draftFacts = Object.fromEntries(
    Object.entries(draft).filter(([key]) => key !== "capturedAt" && key !== "schemaVersion")
  );
  const finalFacts = Object.fromEntries(
    Object.entries(finalSnapshot).filter(([key]) => key !== "verifiedAt" && key !== "schemaVersion")
  );
  return canonicalEqual(draftFacts, finalFacts);
}

function evaluateProtectedPacketFacts(snapshot: ProtectedPacketAuthoritySnapshot) {
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  if (!profile || profile.profileVersion !== snapshot.profileVersion) return null;
  const answers = toScreeningAnswers({
    ...answerRecord(snapshot.screeningAnswers),
    ...answerRecord(snapshot.prefilledAnswers),
    ...answerRecord(snapshot.packetAnswers)
  });
  try {
    return evaluateAuthoritativeScreeningResult({
      jurisdiction: snapshot.jurisdiction,
      profileVersion: snapshot.profileVersion,
      matterId: `protected:${snapshot.pathwayId ?? "no-pathway"}`,
      answers
    });
  } catch (error) {
    if (!(error instanceof InvalidAnswerError)) return null;
    for (const id of error.invalidQuestionIds) delete answers[id];
    try {
      return evaluateAuthoritativeScreeningResult({
        jurisdiction: snapshot.jurisdiction,
        profileVersion: snapshot.profileVersion,
        matterId: `protected:${snapshot.pathwayId ?? "no-pathway"}`,
        answers
      });
    } catch {
      return null;
    }
  }
}

function deriveProtectedPacketDraftSnapshot(
  verification: ProtectedPacketVerificationRecord,
  packetAnswers: Record<string, AnswerValue>,
  capturedAt: string
): ProtectedPacketDraftSnapshot | null {
  const base = protectedAuthoritySnapshotFor(verification);
  if (!base) return null;
  const candidate: ProtectedPacketAuthoritySnapshot = {
    ...base,
    packetAnswers
  };
  const authoritative = evaluateProtectedPacketFacts(candidate);
  if (!authoritative) return null;
  return protectedPacketDraftSeedFromAuthoritative({
    authoritative,
    screeningAnswers: answerRecord(base.screeningAnswers),
    prefilledAnswers: answerRecord(base.prefilledAnswers),
    packetAnswers,
    dependencies: base.dependencies,
    capturedAt
  })?.snapshot ?? null;
}

export function protectedPacketDraftSeedFromAuthoritative(input: {
  authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  screeningAnswers: Record<string, AnswerValue>;
  prefilledAnswers?: Record<string, AnswerValue>;
  packetAnswers?: Record<string, AnswerValue>;
  dependencies: PacketVerificationSnapshot["dependencies"];
  capturedAt: string;
}): { snapshot: ProtectedPacketDraftSnapshot; hash: string } | null {
  const { evaluation } = input.authoritative;
  const profile = getProfileByJurisdiction(evaluation.jurisdiction);
  if (!profile || profile.profileVersion !== evaluation.profileVersion) return null;
  const packetPlan = evaluation.packetPlan ?? null;
  const factMaps = sourceDisjointFactMaps({
    screeningAnswers: input.screeningAnswers,
    prefilledAnswers: input.prefilledAnswers,
    packetAnswers: input.packetAnswers,
    serverFacts: canonicalServerFacts(evaluation.jurisdiction, evaluation.pathwayId ?? null)
  });
  const snapshot = canonicalize({
    schemaVersion: "expungement-ai/protected-packet-draft/v1",
    capturedAt: input.capturedAt,
    jurisdiction: evaluation.jurisdiction,
    profileVersion: evaluation.profileVersion,
    profileSourceFingerprint: profile.source?.sourceCorpusSha256 ?? null,
    profileAuthorityFingerprint: profileAuthorityFingerprint(profile, evaluation.pathwayId ?? null),
    pathwayId: evaluation.pathwayId ?? null,
    resultCode: evaluation.resultCode,
    paymentAllowed: evaluation.paymentAllowed,
    packetType: input.authoritative.packetType ?? null,
    packetPlan: packetPlan ? { ...packetPlan } : null,
    requiredInputIds: packetPlan?.requiredInputIds ?? [],
    packetFamilyIdentifiers: {
      mode: packetPlan?.mode ?? null,
      sourceFormIds: packetPlan?.sourceFormIds ?? []
    },
    selectedTrackId: input.authoritative.selectedTrackId,
    treatmentClassification: evaluation.treatmentClassification ?? null,
    deferralComponentIds: [...(evaluation.deferralComponentIds ?? [])].sort(),
    screeningAnswers: factMaps.screeningAnswers,
    packetAnswers: factMaps.packetAnswers,
    serverFacts: factMaps.serverFacts,
    prefilledAnswers: factMaps.prefilledAnswers,
    dependencies: canonicalize(input.dependencies)
  }) as ProtectedPacketDraftSnapshot;
  return { snapshot, hash: protectedPacketDraftHash(snapshot) };
}

function protectedPacketDraftReviewSafety(draft: ProtectedPacketDraftSnapshot) {
  const authoritative = evaluateProtectedPacketFacts(draft);
  if (!authoritative) return { safe: false, reason: "authoritative_reevaluation_failed" };
  const { evaluation } = authoritative;
  if ((evaluation.resultCode !== "packet_ready" && evaluation.resultCode !== "packet_ready_with_caution")
    || !evaluation.paymentAllowed
    || !evaluation.packetPlan) return { safe: false, reason: "authoritative_route_changed" };
  const answers = {
    ...answerRecord(draft.screeningAnswers),
    ...answerRecord(draft.prefilledAnswers),
    ...answerRecord(draft.packetAnswers),
    ...answerRecord(draft.serverFacts)
  };
  const publicProfile = projectPublicProfile(getProfileByJurisdiction(draft.jurisdiction)!);
  const questionById = new Map(allPublicQuestions(publicProfile).map((question) => [question.id, toProfileQuestion(question)]));
  for (const id of draft.requiredInputIds) {
    if (id in draft.serverFacts) continue;
    const validation = validatePacketAnswer(questionById.get(id) ?? fallbackPacketQuestion(id), answers[id]);
    if (!validation.safe) return validation;
  }
  return { safe: true, reason: "authoritative_route_confirmed" };
}

export function protectedPacketDraftHash(snapshot: ProtectedPacketDraftSnapshot) {
  return createHash("sha256").update(JSON.stringify(canonicalize(snapshot))).digest("hex");
}

export class CurrentPacketVerificationRequiredError extends Error {
  constructor(readonly reason: string) {
    super(`A current final verification is required: ${reason}`);
    this.name = "CurrentPacketVerificationRequiredError";
  }
}

export function verifiedPacketRecordFromDraft(
  draft: ProtectedPacketDraftSnapshot,
  verifiedAt: string
): PacketVerificationRecord {
  const facts = Object.fromEntries(
    Object.entries(draft).filter(([key]) => key !== "capturedAt" && key !== "schemaVersion")
  ) as Omit<PacketVerificationSnapshot, "schemaVersion" | "verifiedAt">;
  const snapshot: PacketVerificationSnapshot = {
    ...facts,
    schemaVersion: "expungement-ai/final-verification/v1",
    verifiedAt
  };
  return {
    status: "verified",
    reason: "explicit_final_verification",
    snapshot,
    hash: packetVerificationHash(snapshot)
  };
}

function unverifiedOrInvalidatedPacketRecord(
  existing: unknown,
  now: string,
  reason: string
): PacketVerificationRecord {
  const prior = readVerificationRecord(existing);
  if (prior?.status === "verified" || prior?.status === "invalidated" || reason !== "facts_saved_after_verification") {
    return invalidatedPacketRecord(now, reason);
  }
  return { status: "unverified", reason: "final_verification_not_completed" };
}

function invalidatedPacketRecord(now: string, reason: string): PacketVerificationRecord {
  return {
    status: "invalidated",
    reason,
    invalidatedAt: now
  };
}

function packetInformationMetadata(packetInformation: Record<string, unknown>): Record<string, unknown> {
  return {
    stage: packetInformation.stage,
    requiredInputIds: packetInformation.requiredInputIds,
    serverFacts: packetInformation.serverFacts,
    prefilledAnswers: packetInformation.prefilledAnswers,
    missingInputIds: packetInformation.missingInputIds,
    updatedAt: packetInformation.updatedAt,
    reviewedAt: packetInformation.reviewedAt,
    reviewSafety: packetInformation.reviewSafety
  };
}

function answerRecordForIds(value: unknown, allowedIds: ReadonlySet<string>): Record<string, AnswerValue> {
  return Object.fromEntries(Object.entries(answerRecord(value)).filter(([id]) => allowedIds.has(id)));
}

function buildPacketVerificationSnapshot(
  item: ConsumerBriefcaseItem,
  flow: CommercialFlow,
  verifiedAt: string
): PacketVerificationSnapshot | null {
  const authority = authoritativePacketContext(item, undefined, flow);
  if (!authority.safe) return null;
  const { profile, evaluation, packetType, selectedTrackId } = authority.authoritative;
  const packetPlan = evaluation.packetPlan ?? null;
  const factDependencies = verificationFactDependencies(
    flow,
    canonicalServerFacts(profile.jurisdiction.code, evaluation.pathwayId ?? null)
  );
  return canonicalize({
    schemaVersion: "expungement-ai/final-verification/v1",
    verifiedAt,
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    profileSourceFingerprint: profile.source?.sourceCorpusSha256 ?? null,
    profileAuthorityFingerprint: profileAuthorityFingerprint(profile, packetPlan?.pathwayId ?? null),
    pathwayId: evaluation.pathwayId ?? null,
    resultCode: evaluation.resultCode,
    paymentAllowed: evaluation.paymentAllowed,
    packetType: packetType ?? null,
    packetPlan: packetPlan ? { ...packetPlan } : null,
    requiredInputIds: packetPlan?.requiredInputIds ?? [],
    packetFamilyIdentifiers: {
      mode: packetPlan?.mode ?? null,
      sourceFormIds: packetPlan?.sourceFormIds ?? []
    },
    selectedTrackId,
    treatmentClassification: item.treatmentClassification ?? null,
    deferralComponentIds: [...(item.deferralComponentIds ?? [])].sort(),
    ...factDependencies,
    dependencies: {
      commercialFlowVersion: typeof flow.version === "number" ? flow.version : null,
      entitlementSource: typeof flow.entitlementSource === "string" ? flow.entitlementSource : null,
      productId: typeof flow.productId === "string" ? flow.productId : null
    }
  }) as PacketVerificationSnapshot;
}

export function packetVerificationHash(snapshot: PacketVerificationSnapshot) {
  return createHash("sha256").update(JSON.stringify(canonicalize(snapshot))).digest("hex");
}

function profileAuthorityFingerprint(
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>,
  pathwayId: string | null
) {
  const selectedPathway = profile.pathways.find((pathway) => pathway.id === pathwayId) ?? null;
  const selectedPacketPathway = profile.packetGenerator.pathways.find((pathway) => pathway.pathwayId === pathwayId) ?? null;
  const applicableRules = profile.orderedDecisionRules.filter((rule) => {
    if (rule.when.backendPathwayId && rule.when.backendPathwayId !== pathwayId) return false;
    if (rule.candidatePathwayIds?.length && pathwayId && !rule.candidatePathwayIds.includes(pathwayId)) return false;
    return true;
  });
  const authority = canonicalize({
    schemaVersion: profile.schemaVersion,
    jurisdiction: profile.jurisdiction.code,
    flowStages: profile.flowStages,
    questionLifecycle: profile.questionLifecycle ?? null,
    questionMachineSurface: profile.questions.map((question) => ({
      id: question.id,
      stage: question.stage,
      type: question.type,
      required: question.required,
      contextOnly: question.contextOnly ?? false,
      lifecyclePhase: question.lifecyclePhase ?? null,
      options: question.options ?? null
    })),
    selectedPathway,
    applicableRules,
    waitingPeriodRules: profile.waitingPeriodRules ?? [],
    exclusionRules: profile.exclusionRules ?? [],
    packetGenerator: {
      architecture: profile.packetGenerator.architecture,
      legacyGeneratorAllowed: profile.packetGenerator.legacyGeneratorAllowed,
      genericLegalFallbackAllowed: profile.packetGenerator.genericLegalFallbackAllowed,
      requiredInputs: profile.packetGenerator.requiredInputs,
      selectedPathway: selectedPacketPathway
    }
  });
  return createHash("sha256").update(JSON.stringify(authority)).digest("hex");
}

function readVerificationRecord(value: unknown): PacketVerificationRecord | null {
  if (!isRecord(value)
    || (value.status !== "unverified" && value.status !== "verified" && value.status !== "invalidated")
    || typeof value.reason !== "string") return null;
  return value as PacketVerificationRecord;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function verificationFactDependencies(
  flow: CommercialFlow,
  serverFacts: Record<string, AnswerValue>
) {
  const screening = isRecord(flow.screening) ? flow.screening : {};
  const packetInformation = isRecord(flow.packetInformation) ? flow.packetInformation : {};
  return sourceDisjointFactMaps({
    screeningAnswers: screening.answers,
    prefilledAnswers: packetInformation.prefilledAnswers,
    packetAnswers: packetInformation.answers,
    serverFacts
  });
}

function sourceDisjointFactMaps(input: {
  screeningAnswers: unknown;
  prefilledAnswers: unknown;
  packetAnswers: unknown;
  serverFacts: unknown;
}) {
  const serverFacts = answerRecord(input.serverFacts);
  const serverIds = new Set(Object.keys(serverFacts));
  const packetAnswers = omitAnswerIds(answerRecord(input.packetAnswers), serverIds);
  const packetOrServerIds = new Set([...serverIds, ...Object.keys(packetAnswers)]);
  const prefilledAnswers = omitAnswerIds(answerRecord(input.prefilledAnswers), packetOrServerIds);
  const effectiveIds = new Set([...packetOrServerIds, ...Object.keys(prefilledAnswers)]);
  const screeningAnswers = omitAnswerIds(answerRecord(input.screeningAnswers), effectiveIds);
  return { screeningAnswers, prefilledAnswers, packetAnswers, serverFacts };
}

function omitAnswerIds(
  answers: Record<string, AnswerValue>,
  omittedIds: ReadonlySet<string>
): Record<string, AnswerValue> {
  return Object.fromEntries(Object.entries(answers).filter(([id]) => !omittedIds.has(id)));
}

function verificationSummaryFor(
  flow: CommercialFlow,
  questionById: Map<string, ProfileQuestion>,
  serverFacts: Record<string, AnswerValue>
): PacketVerificationSummaryFact[] {
  const factDependencies = verificationFactDependencies(flow, serverFacts);
  const sources: PacketVerificationSummaryFact["source"][] = [
    "screeningAnswers",
    "prefilledAnswers",
    "packetAnswers",
    "serverFacts"
  ];
  return sources.flatMap((source) => Object.keys(factDependencies[source]).sort().map((id) => ({
    key: `${source}:${id}`,
    id,
    label: questionById.get(id)?.prompt ?? answerLabel(id),
    value: factDependencies[source][id],
    source,
    systemContext: source === "serverFacts" && (id === "jurisdiction" || id === "pathway_id")
  })));
}

const VERIFICATION_FACT_KEYS = new Set([
  "screeningAnswers",
  "prefilledAnswers",
  "packetAnswers",
  "serverFacts"
]);

function verificationContextFor(source: Record<string, unknown>): PacketVerificationContextFact[] {
  return Object.keys(source)
    .filter((key) => !VERIFICATION_FACT_KEYS.has(key))
    .sort()
    .map((key) => ({
      key,
      label: answerLabel(key),
      value: source[key],
      systemContext: true as const
    }));
}

function verificationContextSourceFor(
  item: ConsumerBriefcaseItem,
  flow: CommercialFlow,
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>,
  pathwayId: string | null
): Record<string, unknown> {
  const stored = readVerificationRecord(flow.verification);
  const screening = isRecord(flow.screening) ? flow.screening : {};
  const authoritativePlan = pathwayId ? packetPlanForPathway(profile, pathwayId) : null;
  return canonicalize({
    schemaVersion: "expungement-ai/final-verification/v1",
    verifiedAt: stored?.status === "verified" && stored.snapshot?.verifiedAt
      ? stored.snapshot.verifiedAt
      : null,
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    profileSourceFingerprint: profile.source?.sourceCorpusSha256 ?? null,
    profileAuthorityFingerprint: profileAuthorityFingerprint(profile, pathwayId),
    pathwayId,
    resultCode: typeof screening.resultCode === "string" ? screening.resultCode : item.resultCode ?? null,
    paymentAllowed: typeof screening.paymentAllowed === "boolean" ? screening.paymentAllowed : item.paymentAllowed,
    packetType: typeof screening.packetType === "string" ? screening.packetType : item.packetType ?? null,
    packetPlan: authoritativePlan ? { ...authoritativePlan } : null,
    requiredInputIds: authoritativePlan?.requiredInputIds ?? [],
    packetFamilyIdentifiers: {
      mode: authoritativePlan?.mode ?? null,
      sourceFormIds: authoritativePlan?.sourceFormIds ?? []
    },
    selectedTrackId: item.selectedTrackId
      ?? (typeof item.artifactRefs?.selectedTrackId === "string" ? item.artifactRefs.selectedTrackId : null),
    treatmentClassification: item.treatmentClassification ?? null,
    deferralComponentIds: [...(item.deferralComponentIds ?? [])].sort(),
    dependencies: {
      commercialFlowVersion: typeof flow.version === "number" ? flow.version : null,
      entitlementSource: typeof flow.entitlementSource === "string" ? flow.entitlementSource : null,
      productId: typeof flow.productId === "string" ? flow.productId : null
    }
  }) as Record<string, unknown>;
}

/**
 * Re-check packet-builder facts before payment. Screening owns the route; the
 * builder may complete it, but it may not quietly contradict it and continue
 * selling the old packet.
 */
export function packetInformationReviewSafety(
  item: ConsumerBriefcaseItem,
  answerOverride?: Record<string, AnswerValue>
): { safe: boolean; reason: string } {
  const result = authoritativePacketContext(item, answerOverride);
  return { safe: result.safe, reason: result.reason };
}

type AuthoritativePacketContext =
  | { safe: false; reason: string }
  | {
    safe: true;
    reason: string;
    authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  };

function authoritativePacketContext(
  item: ConsumerBriefcaseItem,
  answerOverride?: Record<string, AnswerValue>,
  flowOverride?: CommercialFlow
): AuthoritativePacketContext {
  const model = packetInformationModelFor(item);
  const flow = flowOverride ?? readCommercialFlow(item.artifactRefs);
  const screening = isRecord(flow?.screening) ? flow.screening : {};
  const packetInformation = isRecord(flow?.packetInformation) ? flow.packetInformation : {};
  const currentProfile = getProfileByJurisdiction(item.state);
  if (!model || !flow || !currentProfile || typeof screening.profileVersion !== "string") {
    return { safe: false, reason: "authoritative_screening_context_missing" };
  }
  if (screening.profileVersion !== currentProfile.profileVersion) {
    return { safe: false, reason: "authoritative_profile_changed" };
  }

  const answers = {
    ...model.initialAnswers,
    ...answerRecord(packetInformation.answers),
    ...answerOverride
  };
  for (const question of model.questions) {
    const validation = validatePacketAnswer(question, answers[question.id]);
    if (!validation.safe) return { safe: false, reason: validation.reason };
  }

  // These Mississippi facts are source-rule inputs. A contradictory answer
  // cannot remain attached to the ordinary non-conviction packet.
  if (model.stateCode === "MS" && model.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") {
    const requiredNeutralFacts: Array<[string, string]> = [
      ["pending_cases", "No"],
      ["trafficking_status", "No"],
      ["prior_relief", "No"],
      ["sentence_completion_date", "Yes"],
      ["financial_obligations", "Yes"]
    ];
    for (const [id, expected] of requiredNeutralFacts) {
      if (answerText(answers[id]) !== expected.toLowerCase()) {
        return { safe: false, reason: `route_changing_answer:${id}` };
      }
    }
  }

  const screeningAnswers = answerRecord(screening.answers);
  const evaluationAnswers = toScreeningAnswers({ ...screeningAnswers, ...answers });
  let authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  try {
    authoritative = evaluateAuthoritativeScreeningResult({
      jurisdiction: model.stateCode,
      profileVersion: currentProfile.profileVersion,
      matterId: item.id,
      answers: evaluationAnswers
    });
  } catch (error) {
    // Some packet-only form fields intentionally are not evaluator questions.
    // Remove only the ids the authoritative evaluator explicitly identifies;
    // all recognized route facts remain and are re-evaluated.
    if (!(error instanceof InvalidAnswerError)) return { safe: false, reason: "authoritative_reevaluation_failed" };
    for (const id of error.invalidQuestionIds) delete evaluationAnswers[id];
    try {
      authoritative = evaluateAuthoritativeScreeningResult({
        jurisdiction: model.stateCode,
        profileVersion: currentProfile.profileVersion,
        matterId: item.id,
        answers: evaluationAnswers
      });
    } catch {
      return { safe: false, reason: "authoritative_reevaluation_failed" };
    }
  }

  const { evaluation } = authoritative;
  const packetReady = evaluation.resultCode === "packet_ready" || evaluation.resultCode === "packet_ready_with_caution";
  if (!packetReady || !evaluation.paymentAllowed) {
    return { safe: false, reason: "authoritative_route_changed" };
  }
  const storedPlan = readPacketPlan(screening.packetPlan);
  const authoritativePlan = evaluation.packetPlan ?? null;
  if (typeof screening.pathwayId !== "string" || screening.pathwayId !== evaluation.pathwayId) {
    return { safe: false, reason: "stored_pathway_mismatch" };
  }
  const storedServerFacts = answerRecord(packetInformation.serverFacts);
  if (("jurisdiction" in storedServerFacts
      && answerTextRaw(storedServerFacts.jurisdiction) !== currentProfile.jurisdiction.code)
    || ("pathway_id" in storedServerFacts
      && answerTextRaw(storedServerFacts.pathway_id) !== (evaluation.pathwayId ?? ""))) {
    return { safe: false, reason: "stored_server_fact_mismatch" };
  }
  if (screening.resultCode !== evaluation.resultCode || item.resultCode !== evaluation.resultCode) {
    return { safe: false, reason: "stored_result_mismatch" };
  }
  const expectedMatterPaymentAllowed = flow.entitlementSource === "partner_sponsorship"
    ? false
    : evaluation.paymentAllowed;
  if (screening.paymentAllowed !== evaluation.paymentAllowed || item.paymentAllowed !== expectedMatterPaymentAllowed) {
    return { safe: false, reason: "stored_payment_authority_mismatch" };
  }
  if (screening.packetType !== (authoritative.packetType ?? null) || item.packetType !== authoritative.packetType) {
    return { safe: false, reason: "stored_packet_type_mismatch" };
  }
  if (!canonicalEqual(storedPlan, comparableStoredPacketPlan(authoritativePlan))) {
    return { safe: false, reason: "stored_packet_plan_mismatch" };
  }
  if (!canonicalEqual(stringArray(packetInformation.requiredInputIds), authoritativePlan?.requiredInputIds ?? [])) {
    return { safe: false, reason: "stored_required_inputs_mismatch" };
  }
  const storedTrackId = item.selectedTrackId
    ?? (typeof item.artifactRefs?.selectedTrackId === "string" ? item.artifactRefs.selectedTrackId : null);
  if (storedTrackId !== authoritative.selectedTrackId
    || (item.treatmentClassification ?? null) !== (evaluation.treatmentClassification ?? null)
    || !canonicalEqual(item.deferralComponentIds ?? [], evaluation.deferralComponentIds ?? [])) {
    return { safe: false, reason: "stored_treatment_mismatch" };
  }
  return { safe: true, reason: "authoritative_route_confirmed", authoritative };
}

function canonicalEqual(left: unknown, right: unknown) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function validatePacketAnswer(question: ProfileQuestion, value: AnswerValue | undefined) {
  if (!answerIsKnown(value)) return { safe: false, reason: `invalid_packet_answer:${question.id}` };
  const text = answerText(value);
  if (question.type === "date_or_unknown" && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return { safe: false, reason: `invalid_date:${question.id}` };
  }
  if (question.type === "number_or_range" && !/^\d+$/.test(text)) {
    return { safe: false, reason: `invalid_number:${question.id}` };
  }
  if (question.type === "single_choice" && question.options?.length && !question.options.includes(answerTextRaw(value))) {
    return { safe: false, reason: `invalid_choice:${question.id}` };
  }
  return { safe: true, reason: "valid" };
}

function answerTextRaw(value: AnswerValue | undefined) {
  if (isRecord(value)) return String(value.value ?? "").trim();
  return String(value ?? "").trim();
}

function answerText(value: AnswerValue | undefined) {
  return answerTextRaw(value).toLowerCase();
}

export function answerLabel(id: string) {
  return FALLBACK_PACKET_QUESTIONS[id]?.prompt ?? id
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toUpperCase());
}

function readCommercialFlow(refs: Record<string, unknown> | undefined): CommercialFlow | null {
  const value = refs?.commercialFlow;
  return isRecord(value) ? value as CommercialFlow : null;
}

function commercialFlowForItem(
  item: ConsumerBriefcaseItem,
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>
): CommercialFlow | null {
  const persisted = readCommercialFlow(item.artifactRefs);
  if (persisted) return persisted;
  if (item.resultCode !== "packet_ready" && item.resultCode !== "packet_ready_with_caution") return null;

  const pathway = profile.packetGenerator.pathways.find((candidate) => (
    candidate.pathwayLabel === item.pathwayLabel
    || `${profile.jurisdiction.code}:${candidate.pathwayLabel}` === item.pathwayLabel
  ));
  if (!pathway) return null;
  const packetPlan = packetPlanForPathway(profile, pathway.pathwayId);
  if (!packetPlan) return null;

  const serverFacts = canonicalServerFacts(profile.jurisdiction.code, pathway.pathwayId);
  return {
    screening: {
      profileVersion: profile.profileVersion,
      pathwayId: pathway.pathwayId,
      pathwayLabel: pathway.pathwayLabel,
      packetPlan,
      answers: {}
    },
    packetInformation: {
      stage: "not_started",
      requiredInputIds: packetPlan.requiredInputIds,
      serverFacts,
      prefilledAnswers: {},
      answers: {},
      missingInputIds: packetPlan.requiredInputIds.filter((id) => !(id in serverFacts)),
      updatedAt: null,
      reviewedAt: null
    }
  };
}

function canonicalServerFacts(jurisdiction: string, pathwayId: string | null): Record<string, AnswerValue> {
  return {
    jurisdiction,
    ...(pathwayId ? { pathway_id: pathwayId } : {})
  };
}

function readPacketPlan(value: unknown): PacketPlan | null {
  if (!isRecord(value)
    || typeof value.pathwayId !== "string"
    || typeof value.mode !== "string"
    || typeof value.formMappingStatus !== "string") return null;
  return {
    pathwayId: value.pathwayId,
    mode: value.mode as PacketPlan["mode"],
    formMappingStatus: value.formMappingStatus as PacketPlan["formMappingStatus"],
    sourceFormIds: stringArray(value.sourceFormIds),
    requiredInputIds: stringArray(value.requiredInputIds),
    sourceRuleRefs: stringArray(value.sourceRuleRefs)
  };
}

function comparableStoredPacketPlan(value: PacketPlan | null): PacketPlan | null {
  if (!value) return null;
  return {
    pathwayId: value.pathwayId,
    mode: value.mode,
    formMappingStatus: value.formMappingStatus,
    sourceFormIds: [...value.sourceFormIds],
    requiredInputIds: [...value.requiredInputIds],
    sourceRuleRefs: [...value.sourceRuleRefs]
  };
}

function allPublicQuestions(profile: ReturnType<typeof projectPublicProfile>) {
  const groups = profile.postPaymentPacketCompletion;
  return [
    ...profile.questions,
    ...(groups?.requiredPacketCompletionFields ?? []),
    ...(groups?.officialFormFields ?? []),
    ...(groups?.customPleadingFields ?? []),
    ...(groups?.externalDocumentChecklist ?? []),
    ...(groups?.filingReadinessFields ?? []),
    ...(groups?.serviceOrMailingFields ?? []),
    ...(groups?.narrativeFields ?? []),
    ...(groups?.optionalFields ?? [])
  ];
}

function toProfileQuestion(question: PublicQuestion): ProfileQuestion {
  return {
    id: question.id,
    stage: question.stage,
    prompt: question.prompt,
    helperText: question.helperText,
    type: question.type,
    required: question.required,
    contextOnly: question.contextOnly === true,
    lifecyclePhase: question.lifecyclePhase,
    options: Array.isArray(question.options) && question.options.every((value) => typeof value === "string")
      ? question.options
      : null,
    optionDisplay: question.optionDisplay,
    translations: question.translations
  };
}

const FALLBACK_PACKET_QUESTIONS: Record<string, ProfileQuestion> = {
  participant_full_legal_name: packetQuestion("participant_full_legal_name", "What is your full legal name?", "text"),
  contact_information: packetQuestion("contact_information", "What contact information should appear with this matter?", "text", "Include the mailing address, phone number, or email the court form requests."),
  county: packetQuestion("county", "Which county handled this matter?", "text_or_unknown"),
  court: packetQuestion("court", "Which court handled this matter?", "text_or_unknown"),
  charge: packetQuestion("charge", "What charge or offense appears on the court record?", "text_or_unknown"),
  criminal_history: packetQuestion("criminal_history", "What does your criminal-history record show for this matter?", "text_or_unknown", "Use the record wording when you can. You can say that you need help finding it."),
  offense_category: packetQuestion("offense_category", "What category does the court record use for this offense?", "text_or_unknown"),
  record_type: packetQuestion("record_type", "What type of record is this?", "single_choice", undefined, ["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"]),
  residency_or_location: packetQuestion("residency_or_location", "What city or location belongs with this matter?", "text_or_unknown"),
  age_at_offense: packetQuestion("age_at_offense", "How old were you when this happened?", "number_or_range"),
  pardon_status: packetQuestion("pardon_status", "Have you received a pardon or similar official relief for this matter?", "yes_no_unsure"),
  trafficking_status: packetQuestion("trafficking_status", "Was this matter connected to force, fraud, coercion, or human trafficking?", "yes_no_prefer_not_to_say"),
  disposition_date: packetQuestion("disposition_date", "What date did the case end or get resolved?", "date_or_unknown", "Use the date shown on the dismissal, disposition, or court docket."),
  prior_relief: packetQuestion("prior_relief", "Have you previously received expungement, sealing, or similar relief for another record?", "yes_no_unsure")
};

function fallbackPacketQuestion(id: string): ProfileQuestion {
  return FALLBACK_PACKET_QUESTIONS[id]
    ?? packetQuestion(id, answerLabel(id), "text_or_unknown", "Enter the wording from your court or agency record when possible.");
}

function packetQuestion(
  id: string,
  prompt: string,
  type: ProfileQuestion["type"],
  helperText?: string,
  options: string[] | null = null
): ProfileQuestion {
  return {
    id,
    stage: "packet_information",
    prompt,
    helperText,
    type,
    required: true,
    contextOnly: false,
    lifecyclePhase: "postpay_packet_field",
    options
  };
}

function packetInformationStage(value: unknown): PacketInformationStage {
  if (value === "in_progress" || value === "facts_complete" || value === "ready_to_generate") return value;
  return "not_started";
}

function answerRecord(value: unknown): Record<string, AnswerValue> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    if (typeof entry === "boolean") return [[key, entry ? "Yes" : "No"]];
    return isAnswerValue(entry) ? [[key, entry]] : [];
  }));
}

function answerIsKnown(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0
      && normalized !== "i am not sure"
      && normalized !== "i'm not sure"
      && normalized !== "unknown"
      && normalized !== "prefer not to say";
  }
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0 && value.every((entry) => answerIsKnown(entry));
  if (isRecord(value)) return value.unknown !== true && answerIsKnown(value.value);
  return false;
}

function isAnswerValue(value: unknown): value is AnswerValue {
  if (value === null || typeof value === "string" || typeof value === "number") return true;
  if (Array.isArray(value)) return value.every((entry) => typeof entry === "string");
  if (isRecord(value)) {
    return (value.value === undefined || value.value === null || typeof value.value === "string" || typeof value.value === "number")
      && (value.unknown === undefined || typeof value.unknown === "boolean");
  }
  return false;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
