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
  /** Canonical review surface for every fact map covered by the verification hash. */
  verificationSummary: PacketVerificationSummaryFact[];
  requiredInputIds: string[];
  missingInputIds: string[];
  stage: PacketInformationStage;
  updatedAt: string | null;
  reviewedAt: string | null;
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
  const serverFacts: Record<string, AnswerValue> = {
    ...answerRecord(progress.serverFacts),
    jurisdiction: profile.jurisdiction.code,
    ...(pathwayId ? { pathway_id: pathwayId } : {})
  };
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
  const verificationSummary = verificationSummaryFor(flow, questionById);

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
    verificationSummary,
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
  /** Compatibility only. Saving the final fact is never verification. */
  reviewed?: boolean;
}) {
  const current = packetInformationModelFor(input.existingItem);
  if (!current) return null;
  const profile = getProfileByJurisdiction(input.existingItem.state);
  const persistedFlow = readCommercialFlow(input.existingItem.artifactRefs);
  const flow = profile ? commercialFlowForItem(input.existingItem, profile) : null;
  const progress = isRecord(flow?.packetInformation) ? flow?.packetInformation : {};
  const pathwayId = current.pathwayId ?? current.packetPlan?.pathwayId ?? null;
  const serverFacts: Record<string, AnswerValue> = {
    ...answerRecord(progress.serverFacts),
    jurisdiction: current.stateCode,
    ...(pathwayId ? { pathway_id: pathwayId } : {})
  };
  const prefilledAnswers = answerRecord(progress.prefilledAnswers);
  const allowedIds = new Set(current.questions.map((question) => question.id));
  const acceptedAnswers = Object.fromEntries(
    Object.entries(input.answers).filter(([id, answer]) => allowedIds.has(id) && isAnswerValue(answer))
  );
  const savedAnswers = { ...answerRecord(progress.answers), ...acceptedAnswers };
  const mergedAnswers = { ...current.initialAnswers, ...acceptedAnswers };
  const missingInputIds = missingRequiredInputs(current.requiredInputIds, serverFacts, mergedAnswers);
  const materialFactChange = Object.entries(acceptedAnswers)
    .some(([id, answer]) => !canonicalEqual(current.initialAnswers[id], answer));
  const currentVerification = packetVerificationState(input.existingItem);
  if (input.verify !== true && !materialFactChange && currentVerification.status === "verified") {
    return {
      patch: {
        commercialFlow: {
          packetInformation: progress,
          verification: currentVerification
        }
      },
      missingInputIds,
      readyToGenerate: true,
      reviewReason: "current_verification_preserved"
    };
  }
  const review = input.verify === true && missingInputIds.length === 0
    ? packetInformationReviewSafety(input.existingItem, mergedAnswers)
    : {
      safe: false,
      reason: missingInputIds.length === 0 ? "final_verification_required" : "packet_information_incomplete"
    };
  const now = new Date().toISOString();
  const stage: PacketInformationStage = review.safe
    ? "ready_to_generate"
    : missingInputIds.length === 0 ? "facts_complete" : "in_progress";
  const packetInformation = {
    stage,
    requiredInputIds: current.requiredInputIds,
    serverFacts,
    prefilledAnswers,
    answers: savedAnswers,
    missingInputIds,
    updatedAt: now,
    reviewedAt: review.safe ? now : null,
    reviewSafety: review
  };
  const verification = review.safe && flow
    ? verifiedPacketRecord(input.existingItem, {
      ...flow,
      packetInformation
    }, now)
    : unverifiedOrInvalidatedPacketRecord(flow?.verification, now, input.verify === true
      ? review.reason
      : !materialFactChange && currentVerification.status === "invalidated"
        ? currentVerification.reason
        : "facts_saved_after_verification");

  return {
    patch: {
      commercialFlow: {
        // A legacy accepted matter may predate commercialFlow metadata. Its
        // exact server-stored pathway is reconciled once into the same shape;
        // subsequent saves use the ordinary nested merge path.
        ...(persistedFlow ? {} : flow),
        packetInformation,
        verification
      }
    },
    missingInputIds,
    readyToGenerate: review.safe,
    reviewReason: review.reason
  };
}

export function packetVerificationState(item: ConsumerBriefcaseItem): PacketVerificationRecord {
  const flow = readCommercialFlow(item.artifactRefs);
  const stored = readVerificationRecord(flow?.verification);
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

export function requireCurrentPacketVerification(item: ConsumerBriefcaseItem): {
  hash: string;
  snapshot: PacketVerificationSnapshot;
} {
  const verification = packetVerificationState(item);
  if (verification.status !== "verified" || !verification.hash || !verification.snapshot) {
    throw new CurrentPacketVerificationRequiredError(verification.reason);
  }
  return { hash: verification.hash, snapshot: verification.snapshot };
}

export class CurrentPacketVerificationRequiredError extends Error {
  constructor(readonly reason: string) {
    super(`A current final verification is required: ${reason}`);
    this.name = "CurrentPacketVerificationRequiredError";
  }
}

function verifiedPacketRecord(
  item: ConsumerBriefcaseItem,
  flow: CommercialFlow,
  verifiedAt: string
): PacketVerificationRecord {
  const snapshot = buildPacketVerificationSnapshot(item, flow, verifiedAt);
  if (!snapshot) return { status: "invalidated", reason: "verification_snapshot_unavailable", invalidatedAt: verifiedAt };
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

function buildPacketVerificationSnapshot(
  item: ConsumerBriefcaseItem,
  flow: CommercialFlow,
  verifiedAt: string
): PacketVerificationSnapshot | null {
  const authority = authoritativePacketContext(item, undefined, flow);
  if (!authority.safe) return null;
  const { profile, evaluation, packetType, selectedTrackId } = authority.authoritative;
  const packetPlan = evaluation.packetPlan ?? null;
  const factDependencies = verificationFactDependencies(flow);
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

function packetVerificationHash(snapshot: PacketVerificationSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
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

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function verificationFactDependencies(flow: CommercialFlow) {
  const screening = isRecord(flow.screening) ? flow.screening : {};
  const packetInformation = isRecord(flow.packetInformation) ? flow.packetInformation : {};
  return {
    screeningAnswers: recordValue(screening.answers),
    prefilledAnswers: recordValue(packetInformation.prefilledAnswers),
    packetAnswers: recordValue(packetInformation.answers),
    serverFacts: recordValue(packetInformation.serverFacts)
  };
}

function verificationSummaryFor(
  flow: CommercialFlow,
  questionById: Map<string, ProfileQuestion>
): PacketVerificationSummaryFact[] {
  const factDependencies = verificationFactDependencies(flow);
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
  if (answerTextRaw(storedServerFacts.jurisdiction) !== currentProfile.jurisdiction.code
    || answerTextRaw(storedServerFacts.pathway_id) !== (evaluation.pathwayId ?? "")) {
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
  if (!canonicalEqual(storedPlan, authoritativePlan)) {
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

  const serverFacts: Record<string, AnswerValue> = {
    jurisdiction: profile.jurisdiction.code,
    pathway_id: pathway.pathwayId
  };
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
