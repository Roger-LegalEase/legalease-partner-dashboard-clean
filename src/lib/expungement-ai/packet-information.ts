import { isNy16059Packet, NY_PACKET_QUESTIONS, NY_PACKET_FACT_IDS } from "@/lib/expungement-ai/ny-16059-packet-facts";
import convictionFallbackPrior from "@/lib/expungement-ai/conviction-fallback-prior-contracts.json";
import { convictionReliefRequest, convictionReliefQuestionApplies, convictionReliefQuestions, isAdultConvictionAnswer } from "@/lib/rcap-engine/conviction-relief-request";
import { msExactCalendarDate, msExactTimingQuestionIds } from "@/lib/rcap-engine/mississippi-exact-timing";
import { CA_PROP64_CAPTION_QUESTIONS } from "@/lib/expungement-ai/ca-prop64-caption-facts";
import { GA_FIRST_OFFENDER_FACT_IDS, GA_ORIGINAL_FIRST_OFFENDER_PATHWAY, georgiaFirstOffenderQuestionApplies } from "@/lib/rcap-engine/georgia-first-offender";
import { IL_CANNABIS_FACT_IDS, IL_CANNABIS_PATHWAY, illinoisCannabisQuestionApplies } from "@/lib/rcap-engine/illinois-cannabis-facts";
import { pathwayExcludedByKnownFacts } from "@/lib/rcap-engine/factual-pathway-exclusions";
import { CA_PROP64_FACT_IDS, CA_PROP64_FACT_QUESTIONS, CA_PROP64_REASON_COPY, caProp64ActiveFactIds } from "@/lib/rcap-engine/california-prop64-facts";
import { ny16059CustodyRemovalAvailable } from "@/lib/expungement-ai/ny-custody-correction";
import { NY_16059_FACT_IDS, NY_16059_ROUTE, ny16059QuestionApplies, ny16059History } from "@/lib/rcap-engine/new-york-16059-facts";
import { CA_PROP64_QUESTIONS, CA_PROP64_COMPLETED, isCaProp64Pathway, caProp64Choice } from "@/lib/expungement-ai/ca-prop64-choices";
import { caProp64RecordQuestions } from "@/lib/expungement-ai/ca-prop64-record-facts";
import { caProp64RecordAnswerState, CA_PROP64_RECORD_FACT_IDS } from "@/lib/expungement-ai/ca-prop64-record-answer";
import { isAffirmative, isNegative, isExplicitUnknownAnswer } from "@/lib/rcap-engine/answer-normalization";
import { recordFactOwnQuestionIds, recordFactConfirmationFor, unresolvedRecordFactConfirmations, recordFactCourtConflict } from "@/lib/expungement-ai/record-fact-clarification";
import { fullSsnLastFour, requiresMcicIdentifierAuthority } from "@/lib/expungement-ai/sensitive-packet-facts";
import { reviewedContactRepresentation, contactRepresentationHash, contactRepresentationProvenance, isProvenContactOutput } from "@/lib/expungement-ai/contact-representation";
import { courtCompletionContractsFor, refreshCourtCompletionImplications } from "@/lib/expungement-ai/court-completion-reuse";
import { isIndependentPaidFinancialFact } from "@/lib/expungement-ai/court-completion-fact-meaning";
import { reviewedPacketQuestion } from "@/lib/expungement-ai/reviewed-question-copy";
import { reviewedPacketContractSuccessor, preserveAmbiguousMsAnswer, MS_CHARGED_CONDUCT_FACT } from "@/lib/expungement-ai/packet-contract-successors";
import { answerValueIsKnown, questionAnswerState, normalizeQuestionChoices, sameKnownQuestionAnswer } from "@/lib/expungement-ai/question-answer-state";
import { inspectProtectedLegacyShapes, preserveProtectedLegacyShapes, archiveExplicitLegacyShapeReplacements, legacyShapeQuestionMetadata } from "@/lib/expungement-ai/protected-legacy-answers";
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
import { compareAtProtectedSnapshotTime, InvalidAnswerError } from "@/lib/rcap-engine/evaluator";
import { toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import {
  readProtectedPacketVerification,
  type ProtectedPacketDraftSnapshot,
  type ProtectedPacketVerificationRecord,
  type ProtectedPacketVerificationTransition
} from "@/lib/expungement-ai/verification-cas";
import {
  packetSpecificationFactFor,
  packetSpecificationFor,
  composablePacketSpecificationFor,
  type PacketSpecificationFact
} from "@/lib/rcap/grade-a/packet-specification";
import { MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS, mississippiParticipantDeliverySafety, routeSafetyGateFactIds } from "@/lib/expungement-ai/packet-route-safety";
import { baselineCarriedFactIds, routeCollectionOverrideFor } from "@/lib/expungement-ai/packet-collection-overrides";
import {
  prepayGateFactIds,
  resolvePacketCollection,
  resolvedFactValues,
  type PacketCollectionResolution
} from "@/lib/expungement-ai/packet-collection";
import { pathwayRelevantFactIds, routeDecidingFactScope } from "@/lib/rcap-engine/route-fact-relevance";

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

/**
 * One participant section of the builder, carrying the questions it asks.
 *
 * The heading travels with its Spanish translation because the section is
 * authored here rather than in the component, and a heading that reached the
 * participant without one would be an English-only surface.
 */
export type PacketInformationSection = {
  id: string;
  heading: string;
  description: string;
  translations: { es: { heading: string; description: string } };
  questionIds: string[];
};

export type PacketInformationModel = {
  stateCode: string;
  stateName: string;
  pathwayId: string | null;
  pathwayLabel: string;
  packetPlan: PacketPlan | null;
  questions: ProfileQuestion[];
  builderQuestions: ProfileQuestion[];
  /** The grouping the builder renders. Empty where the route cannot be resolved. */
  builderSections: PacketInformationSection[];
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
  pendingDerivations: PacketCollectionResolution["pendingDerivations"];
  contactReconciliation?: PacketCollectionResolution["contactReconciliation"];
  recordOwnQuestionIds?: string[];
  recordClarificationIds?: string[];
  courtRecordConflict?: boolean;
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
  | "builderSections"
  | "initialAnswers"
  | "screeningAnswers"
  | "serverFacts"
  | "requiredInputIds"
  | "missingInputIds"
  | "pendingDerivations"
  | "contactReconciliation"
  | "recordOwnQuestionIds"
  | "recordClarificationIds"
  | "courtRecordConflict"
  | "stage"
  | "reviewedAt"
  | "verificationSummary"
  | "verificationContext"
  | "verificationManifest"
> & {
  /** Owner correction surface only; never legal/packet/payment authority. */
  caProp64Clarification?: boolean;
  revision: number;
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
    if (!("sentence_completion_date" in initialAnswers) && answerIsKnown(screeningAnswers.court_requirements_completed)
      && answerText(screeningAnswers.court_requirements_completed) === "yes") {
      initialAnswers.sentence_completion_date = "Yes";
    }
    if (!("court_requirements_completed" in initialAnswers) && screeningAnswers.court_requirements_completed) {
      initialAnswers.court_requirements_completed = screeningAnswers.court_requirements_completed;
    }
  }

  // The collection policy, applied to every route rather than to one. It only
  // ever ADDS a value the participant already gave or that follows
  // deterministically from one; an id already present keeps whatever it has,
  // so nothing above this line is overwritten and no saved answer is touched.
  const collection = packetCollectionFor({
    jurisdiction: profile.jurisdiction.code,
    pathwayId,
    requiredInputIds,
    serverFacts,
    screeningAnswers,
    prefilledAnswers,
    savedAnswers
  });
  if (collection) {
    for (const [id, value] of Object.entries(resolvedFactValues(collection))) {
      if (!(id in serverFacts) && !answerIsKnown(initialAnswers[id])) initialAnswers[id] = value;
    }
  }

  const questionById = new Map<string, ProfileQuestion>();
  for (const question of allPublicQuestions(publicProfile)) {
    questionById.set(question.id, toProfileQuestion(question));
  }
  installPacketSpecificationQuestions(questionById, profile.jurisdiction.code, pathwayId, requiredInputIds);

  let questions = requiredInputIds
    .filter((id) => !(id in serverFacts))
    .map((id) => questionById.get(id) ?? fallbackPacketQuestion(id))
    .map((question) => ({ ...question, required: true, contextOnly: false }));
  if (mississippiNonConviction) {
    const owner = knownParticipantOwner(questionById, screeningAnswers.ownership_scope);
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
  questions = questions.map((question) => reviewedPacketQuestion(question, { state: profile.jurisdiction.code, pathwayId, participantOwnsRecord: knownParticipantOwner(questionById, screeningAnswers.ownership_scope), participantHelpingRecord: knownParticipantHelper(questionById, screeningAnswers.ownership_scope) }));
  for (const question of questions) questionById.set(question.id, question);
  const builderQuestions = builderQuestionsFor(questions, collection, requiredInputIds, serverFacts);
  const missingInputIds = missingRequiredInputs(
    collectionGateInputIds(collection, requiredInputIds, serverFacts),
    serverFacts,
    initialAnswers,
    new Map(questions.map((question) => [question.id, question]))
  );
  if (collection?.contactReconciliation && !missingInputIds.includes("contact_information")) missingInputIds.push("contact_information");
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
    builderSections: builderSectionsFor(collection, builderQuestions),
    initialAnswers,
    screeningAnswers,
    serverFacts,
    verificationSummary,
    verificationContext,
    verificationManifest,
    requiredInputIds,
    missingInputIds,
    pendingDerivations: collection?.pendingDerivations ?? [],
    contactReconciliation: collection?.contactReconciliation,
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
  answers: Record<string, AnswerValue>,
  questionById?: ReadonlyMap<string, ProfileQuestion>
) {
  return requiredInputIds.filter((id) => {
    if (answerIsKnown(serverFacts[id])) return false;
    const question = questionById?.get(id);
    return question ? questionAnswerState(question, answers[id]) !== "known_valid" : !answerIsKnown(answers[id]);
  });
}

export function expectedPacketComponents(plan: PacketPlan | null): string[] {
  if (plan?.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") {
    return [
      "Petition for Expungement",
      "Proposed Order",
      "Certificate of Service",
      "Attachment and Records Checklist",
      "Filing Instructions and Attorney Handoff Conditions"
    ];
  }
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

/** A display suggestion, never a fact or a profile-based derivation. Caller has checked exact matter ownership. */
export function packetAccountEmailSuggestion(model: Pick<PacketInformationModel, "stateCode" | "pathwayId" | "questions" | "screeningAnswers" | "initialAnswers" | "serverFacts" | "requiredInputIds">, accountEmail: string | null | undefined): string | null {
  const email = accountEmail?.trim();
  const profile = getProfileByJurisdiction(model.stateCode);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !profile || !model.pathwayId) return null;
  const questionById = new Map(allPublicQuestions(projectPublicProfile(profile)).map((question) => [question.id, toProfileQuestion(question)]));
  if (!knownParticipantOwner(questionById, model.screeningAnswers.ownership_scope)) return null;
  const specification = composablePacketSpecificationFor(`${model.stateCode}:${model.pathwayId}`);
  const fact = specification?.requiredFacts.find((fact) => fact.factId === "email_address");
  const question = model.questions.find((question) => question.id === "email_address");
  if (!fact || fact.ownership !== "participant" || !specification?.fieldOwnership?.participantOwnedFacts.includes("email_address")
    || !question || !model.requiredInputIds.includes("email_address") || "email_address" in model.serverFacts
    || questionAnswerState(question, email) !== "known_valid") return null;
  const collection = packetCollectionFor({ jurisdiction: model.stateCode, pathwayId: model.pathwayId, requiredInputIds: model.requiredInputIds,
    serverFacts: model.serverFacts, screeningAnswers: model.screeningAnswers, savedAnswers: model.initialAnswers });
  const disposition = collection?.facts.find((fact) => fact.factId === "email_address");
  if (!disposition || ["external_actor", "derived", "unresolved"].includes(disposition.collection)
    || disposition.collection === "conditional" && disposition.active === false) return null;
  return email;
}

export function packetInformationPatch(input: {
  existingItem: ConsumerBriefcaseItem;
  answers: Record<string, AnswerValue>;
  verify?: boolean;
  useContactComponents?: boolean;
  clearInactiveCustodyFacts?: boolean;
  confirmRecordFacts?: string[];
  /** Server-authenticated owner's email, only after an explicit client adoption request. Never client profile data. */
  accountEmailSource?: string;
  /** Service-role protected state read immediately before deriving this transition. */
  protectedVerification: ProtectedPacketVerificationRecord;
  /** Compatibility only. Saving the final fact is never verification. */
  reviewed?: boolean;
}) {
  const priorProtected = input.protectedVerification;
  const current = protectedPacketInformationModelFor(priorProtected);
  if (!current) return null;
  const allowedIds = editablePacketInputIds(current, true);
  const acceptedAnswers = Object.fromEntries(
    Object.entries(input.answers).filter(([id, answer]) => allowedIds.has(id) && isAnswerValue(answer))
  );
  const answerDelta = Object.fromEntries(
    Object.entries(acceptedAnswers).filter(([id, answer]) => {
      const question = current.questions.find((candidate) => candidate.id === id);
      return !canonicalEqual(current.initialAnswers[id], answer)
        && !(question && sameKnownQuestionAnswer(question, current.initialAnswers[id], answer));
    })
  );
  const storedIds = new Set([...current.requiredInputIds.filter((id) => !(id in current.serverFacts)), ...routeFactualCorrectionIds(current, true),
    ...(current.stateCode === "NY" && current.pathwayId === NY_16059_ROUTE ? Object.keys(current.packetAnswers) : [])]);
  // Losing a packet plan does not discard the owner's other saved packet facts.
  // They remain protected while the one existing financial fact is corrected.
  const retainedFinancialAnswers = !current.packetPlan && routeFactualCorrectionIds(current).length > 0
    ? answerRecord(protectedAuthoritySnapshotFor(priorProtected)?.packetAnswers) : undefined;
  const savedAnswers = { ...retainedFinancialAnswers, ...answerRecordForIds(current.packetAnswers, storedIds), ...answerDelta };
  const clearCustody = input.clearInactiveCustodyFacts === true;
  if (clearCustody && (!ny16059CustodyRemovalAvailable(current.stateCode, current.pathwayId, current.initialAnswers)
    || Object.keys(answerDelta).length || input.verify === true)) return null;
  const contactChoice = input.useContactComponents === true;
  const confirmations = input.confirmRecordFacts ?? [];
  const accountEmail = input.accountEmailSource === undefined ? null : packetAccountEmailSuggestion(current, input.accountEmailSource);
  if (input.accountEmailSource !== undefined && (!accountEmail || !sameKnownQuestionAnswer(
    current.questions.find((question) => question.id === "email_address")!, accountEmail, { ...current.initialAnswers, ...answerDelta }.email_address))) return null;
  if (confirmations.some((id) => !current.recordClarificationIds?.includes(id)
    || !answerValueIsKnown({ ...current.initialAnswers, ...answerDelta }[id])
    || questionAnswerState(current.questions.find((question) => question.id === id)!, { ...current.initialAnswers, ...answerDelta }[id]) !== "known_valid")) return null;
  const materialFactChange = clearCustody || Object.keys(answerDelta).length > 0 || contactChoice || confirmations.length > 0 || accountEmail !== null;
  const priorSnapshot = protectedAuthoritySnapshotFor(priorProtected)!;
  const legacy = protectedLegacyAnswerProjection(priorSnapshot);
  const freshSensitiveMaps = refreshedSensitiveFactMaps(priorSnapshot.jurisdiction, priorSnapshot.pathwayId, priorSnapshot.requiredInputIds,
    ...participantMapArguments(legacy.maps));
  const freshContact = refreshedProtectedPacketFactMaps(priorSnapshot, freshSensitiveMaps);
  const derivedRepairRequired = !canonicalEqual(preserveProtectedLegacyShapes(freshContact.maps, legacy.inspection, new Set()), {
    screeningAnswers: priorSnapshot.screeningAnswers, prefilledAnswers: priorSnapshot.prefilledAnswers, packetAnswers: priorSnapshot.packetAnswers
  });
  const currentVerification = packetVerificationStateForRecord(input.existingItem, priorProtected, true);
  if (!materialFactChange && !derivedRepairRequired && (input.verify !== true || currentVerification.status === "verified")) {
    const ready = currentVerification.status === "verified" && current.reviewSafety.safe;
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
  const nextDraft = !materialFactChange && !derivedRepairRequired && canonicalEqual(priorSnapshot.packetPlan, current.packetPlan) && priorProtected.draftSnapshot
    ? priorProtected.draftSnapshot
    : deriveProtectedPacketDraftSnapshot(priorProtected, savedAnswers, now, contactChoice, [...new Set([...Object.keys(answerDelta), ...confirmations])], new Set(Object.keys(answerDelta)), clearCustody);
  if (!nextDraft) return null;
  if (accountEmail) {
    nextDraft.dependencies = { ...nextDraft.dependencies, accountContactSources: { email_address: {
      version: 1, source: "same_owner_account_email", purpose: "this_packet_contact",
      valueSha256: createHash("sha256").update(accountEmail).digest("hex"), confirmedAt: now, status: "adopted"
    } } };
  } else if ("email_address" in answerDelta && nextDraft.dependencies.accountContactSources) {
    nextDraft.dependencies = { ...nextDraft.dependencies, accountContactSources: { email_address: {
      ...nextDraft.dependencies.accountContactSources.email_address, status: "superseded"
    } } };
  }
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
  const evaluatedModel = protectedPacketInformationModelFor(draftRecord);
  const nextModel = evaluatedModel?.packetPlan ? evaluatedModel : caProp64ClarificationModelFor(draftRecord) ?? evaluatedModel;
  if (!nextModel) return null;
  const review = input.verify === true && nextModel.missingInputIds.length === 0
    ? protectedPacketDraftReviewSafety(nextDraft, now)
    : {
      safe: false,
      reason: nextModel.missingInputIds.length === 0 ? "final_verification_required" : "packet_information_incomplete"
    };
  const stage: PacketInformationStage = !nextModel.packetPlan ? "in_progress" : review.safe
    ? "ready_to_generate"
    : nextModel.missingInputIds.length === 0 && nextModel.pendingDerivations.length === 0 ? "facts_complete" : "in_progress";
  const packetInformation = {
    stage,
    requiredInputIds: nextDraft.requiredInputIds,
    serverFacts: nextModel.serverFacts,
    prefilledAnswers: nextModel.caProp64Clarification ? answerRecord(nextDraft.prefilledAnswers) : nextModel.prefilledAnswers,
    answers: nextModel.caProp64Clarification ? answerRecord(nextDraft.packetAnswers) : nextModel.packetAnswers,
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
    const model = protectedPacketInformationModelFor(stored as ProtectedPacketVerificationRecord);
    return model && (stored.status !== "verified" || model.reviewSafety.safe)
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
/** Narrow recovery for an authenticated owner's source-valid CA snapshot rejected by the corrected input gates.
 * This is deliberately separate from protectedPacketInformationModelFor: no caller may use it as legal authority.
 */
export function caProp64ClarificationModelFor(verification: ProtectedPacketVerificationRecord): ProtectedPacketInformationModel | null {
  let snapshot = protectedAuthoritySnapshotFor(verification);
  if (!snapshot || !isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId)) return null;
  if (!canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))) return null;
  if (!canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: snapshot.packetPlan?.mode ?? null, sourceFormIds: snapshot.packetPlan?.sourceFormIds ?? [] })) return null;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  if (profile) snapshot = reviewedPacketContractSuccessor(snapshot, packetPlanForPathway(profile, snapshot.pathwayId!)) ?? snapshot;
  if (!profile || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || !canonicalEqual(snapshot.requiredInputIds, snapshot.packetPlan?.requiredInputIds ?? [])
    || snapshot.packetPlan && !canonicalEqual(snapshot.packetPlan, packetPlanForPathway(profile, snapshot.pathwayId!))) return null;
  const authoritative = evaluateProtectedPacketFacts(snapshot);
  const evaluation = authoritative?.evaluation;
  if (!authoritative || (authoritative.selectedTrackId ?? null) !== snapshot.selectedTrackId
    || (evaluation?.treatmentClassification ?? null) !== snapshot.treatmentClassification
    || !canonicalEqual(evaluation?.deferralComponentIds ?? [], snapshot.deferralComponentIds)) return null;
  const clarificationReasons = new Set(["ca.ca_prop64_currently_serving_branch_not_confirmed", "ca.ca_prop64_completed_sentence_branch_not_confirmed", "ca.ca_prop64_relief_requested_missing",
    "ca.ca_prop64_record_details_unconfirmed", "ca.ca_prop64_sentence_status_conflict",
    ...Object.keys(CA_PROP64_REASON_COPY).map(code => `ca.ca_prop64_${code}`)]);
  const scopedIds = snapshot.pathwayId === CA_PROP64_COMPLETED ? ["ca_prop64_branch", "ca_prop64_relief_requested"] : ["ca_prop64_branch", "sentence_completion_date"];
  if (!evaluation || evaluation.pathwayId !== snapshot.pathwayId || !["needs_review", "needs_more_info"].includes(evaluation.resultCode)
    || evaluation.paymentAllowed || evaluation.packetPlan || !evaluation.reasons.some((reason) => clarificationReasons.has(reason.code)
      || reason.code === "ca.source_fact_unknown" && scopedIds.some((id) => reason.text === `${id} is uncertain and requires source review.`))) return null;
  const allAnswers = { ...answerRecord(snapshot.screeningAnswers), ...answerRecord(snapshot.prefilledAnswers), ...answerRecord(snapshot.packetAnswers) };
  const activeFacts = caProp64ActiveFactIds(allAnswers);
  const questions = [...CA_PROP64_QUESTIONS.filter((question) => question.id === "ca_prop64_branch" || snapshot.pathwayId === CA_PROP64_COMPLETED),
    ...CA_PROP64_FACT_QUESTIONS.filter(question => activeFacts.includes(question.id))]
    .map((question) => ({ ...toProfileQuestion(question), required: true }));
  questions.push(...caProp64RecordQuestions(profile, profile.questions, snapshot.pathwayId).map(toProfileQuestion));
  for (const id of ["offense_level", "case_outcome"]) {
    const fact = allPublicQuestions(projectPublicProfile(profile)).find(question => question.id === id);
    if (fact) questions.push({ ...toProfileQuestion(fact), required: true });
  }
  // Preserve the existing completion fact; do not infer or rewrite it from the
  // selected branch. A same-case contradiction needs an explicit owner edit.
  const completionConflict = snapshot.pathwayId === CA_PROP64_COMPLETED
    ? isNegative(toScreeningAnswers(allAnswers).sentence_completion_date)
    : isAffirmative(toScreeningAnswers(allAnswers).sentence_completion_date);
  const completionUnknown = isExplicitUnknownAnswer(toScreeningAnswers(allAnswers).sentence_completion_date);
  if (completionConflict || completionUnknown) {
    const completion = allPublicQuestions(projectPublicProfile(profile)).find((question) => question.id === "sentence_completion_date");
    if (!completion) return null;
    const question = { ...toProfileQuestion(completion), required: true };
    if (questionAnswerState(question, allAnswers.sentence_completion_date) === "invalid") {
      question.legacyAnswerText = JSON.stringify(allAnswers.sentence_completion_date);
    }
    questions.push(question);
  }
  const ids = questions.map((question) => question.id);
  const screeningAnswers = answerRecordForIds(snapshot.screeningAnswers, new Set(ids));
  const prefilledAnswers = answerRecordForIds(snapshot.prefilledAnswers, new Set(ids));
  const packetAnswers = answerRecordForIds(snapshot.packetAnswers, new Set(ids));
  const raw = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
  for (const question of questions) {
    if (!CA_PROP64_RECORD_FACT_IDS.some((id) => id === question.id)
      || caProp64RecordAnswerState(question.id, raw[question.id]) !== "invalid") continue;
    // An invalid stored shape is evidence to review, not a new editable answer.
    // Omitting all shadowed representations prevents a lower-precedence value
    // from appearing to cure the invalid effective fact.
    question.legacyAnswerText = JSON.stringify(raw[question.id]);
    delete screeningAnswers[question.id]; delete prefilledAnswers[question.id]; delete packetAnswers[question.id];
  }
  const initialAnswers = { ...screeningAnswers, ...prefilledAnswers, ...packetAnswers };
  const missingInputIds = questions.filter((question) => questionAnswerState(question, initialAnswers[question.id]) !== "known_valid").map((question) => question.id);
  // A supported choice for the other branch is still unresolved for this saved route.
  const expectedBranch = snapshot.pathwayId === CA_PROP64_COMPLETED ? "completed-sentence application" : "currently-serving petition";
  if (caProp64Choice("ca_prop64_branch", initialAnswers.ca_prop64_branch) !== expectedBranch && !missingInputIds.includes("ca_prop64_branch")) missingInputIds.push("ca_prop64_branch");
  if (expectedBranch === "currently-serving petition" && caProp64Choice("ca_prop64_branch", initialAnswers.ca_prop64_branch) === expectedBranch
    && completionConflict && !missingInputIds.includes("sentence_completion_date")) missingInputIds.push("sentence_completion_date");
  return {
    caProp64Clarification: true, stateCode: snapshot.jurisdiction, pathwayId: snapshot.pathwayId, revision: verification.revision,
    packetPlan: null, questions, builderQuestions: questions, builderSections: [], initialAnswers, screeningAnswers, prefilledAnswers, packetAnswers,
    serverFacts: canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId), requiredInputIds: ids, missingInputIds, pendingDerivations: [],
    stage: "in_progress", reviewedAt: null, capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt,
    verificationSummary: [], verificationContext: [], verificationManifest: { schemaVersion: "expungement-ai/verification-review-manifest/v1", factKeys: [], systemContextKeys: [] },
    reviewSafety: { safe: false, reason: "ca_prop64_choice_clarification_required" }, expectedComponents: []
  };
}

function caProp64AnswerHistory(base: ProtectedPacketAuthoritySnapshot, changedIds: ReadonlySet<string>) {
  const history = [...(base.dependencies.semanticAnswerHistory ?? [])];
  // Preserve the exact old values, including malformed and shadowed facts.
  for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) for (const factId of new Set(["ca_prop64_branch", "ca_prop64_relief_requested", ...CA_PROP64_RECORD_FACT_IDS, "sentence_completion_date", ...changedIds])) {
    if (!(factId in base[source])) continue;
    const meaning = CA_PROP64_FACT_IDS.includes(factId) ? "ca_prop64_prior_conduct_answer" as const : factId === "sentence_completion_date" ? "ca_prop64_prior_completion_answer" as const
      : CA_PROP64_RECORD_FACT_IDS.some((id) => id === factId) ? "ca_prop64_prior_record_detail" as const : "ca_prop64_prior_choice_wording" as const;
    const entry = { factId, value: base[source][factId], source, meaning,
      routeKey: `${base.jurisdiction}:${base.pathwayId}`, profileVersion: base.profileVersion,
      profileSourceFingerprint: base.profileSourceFingerprint, profileAuthorityFingerprint: base.profileAuthorityFingerprint };
    if (!history.some((priorEntry) => canonicalEqual(priorEntry, entry))) history.push(entry);
  }
  return history;
}

/** Seeding must preserve every untouched source value, including inactive and unrecognized raw facts. */
function preserveUnchangedProtectedFacts<T extends ProtectedPacketAuthoritySnapshot>(next: T, prior: ProtectedPacketAuthoritySnapshot, changedIds: ReadonlySet<string>): T {
  const maps = { screeningAnswers: { ...next.screeningAnswers }, prefilledAnswers: { ...next.prefilledAnswers }, packetAnswers: { ...next.packetAnswers } };
  for (const id of new Set([...Object.keys(prior.screeningAnswers), ...Object.keys(prior.prefilledAnswers), ...Object.keys(prior.packetAnswers)])) {
    if (changedIds.has(id)) continue;
    for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      delete maps[source][id];
      if (Object.hasOwn(prior[source], id)) maps[source][id] = prior[source][id];
    }
  }
  return { ...next, ...maps };
}

/** Explicit scoped correction only. Original words survive before source precedence is applied; no final attestation. */
export function caProp64ClarificationPatch(input: {
  protectedVerification: ProtectedPacketVerificationRecord; answers: Record<string, AnswerValue>; verify?: boolean;
}): ReturnType<typeof packetInformationPatch> {
  if (input.verify) return null;
  const prior = input.protectedVerification;
  const model = caProp64ClarificationModelFor(prior);
  const base = protectedAuthoritySnapshotFor(prior);
  if (!model || !base) return null;
  const allowed = new Set(model.requiredInputIds);
  if (Object.keys(input.answers).some((id) => !allowed.has(id))) return null;
  if (Object.entries(input.answers).some(([id, value]) => questionAnswerState(model.questions.find((question) => question.id === id)!, value) === "invalid" && !canonicalEqual(value, model.initialAnswers[id]))) return null;
  const maps = { screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) };
  const history = caProp64AnswerHistory(base, new Set(Object.keys(input.answers)));
  const answerDelta = Object.fromEntries(Object.entries(input.answers).filter(([id, value]) => !canonicalEqual(model.initialAnswers[id], value)
    && !sameKnownQuestionAnswer(model.questions.find((question) => question.id === id)!, model.initialAnswers[id], value)));
  // Preserve a current held draft on an unchanged save. An old permissively
  // evaluated snapshot must still be re-evaluated and invalidated below.
  if (Object.keys(answerDelta).length === 0 && protectedPacketInformationModelFor(prior)) {
    const packetInformation = { stage: "in_progress" as const, requiredInputIds: base.requiredInputIds,
      serverFacts: answerRecord(base.serverFacts), prefilledAnswers: answerRecord(base.prefilledAnswers), answers: answerRecord(base.packetAnswers),
      missingInputIds: model.missingInputIds, updatedAt: model.capturedAt, reviewedAt: null, reviewSafety: model.reviewSafety };
    return {
      patch: { commercialFlow: { packetInformation, verification: prior } },
      protectedTransition: { expectedPriorHash: prior.status === "verified" ? prior.hash ?? null : null, expectedPriorRevision: prior.revision,
        answerDelta, packetInformationMetadata: packetInformationMetadata(packetInformation), nextVerification: prior },
      missingInputIds: model.missingInputIds, readyToGenerate: false, reviewReason: "semantic_noop_preserved"
    };
  }
  maps.packetAnswers = { ...maps.packetAnswers, ...answerDelta };
  const changedIds = new Set(Object.keys(answerDelta));
  const candidate = preserveUnchangedProtectedFacts({ ...base, ...maps }, base, changedIds);
  const authoritative = evaluateProtectedPacketFacts(candidate);
  // Clarification never rewrites the saved pathway hint or selects a replacement route.
  if (!authoritative || authoritative.evaluation.pathwayId !== base.pathwayId) return null;
  const now = new Date().toISOString();
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative, ...maps,
    dependencies: { ...base.dependencies, semanticAnswerHistory: history }, capturedAt: now });
  if (!seeded) return null;
  seeded.snapshot = preserveUnchangedProtectedFacts(seeded.snapshot, base, changedIds);
  seeded.hash = protectedPacketDraftHash(seeded.snapshot);
  const nextVerification: ProtectedPacketVerificationRecord = {
    status: "invalidated", reason: "ca_prop64_choice_clarified_pending_verification", invalidatedAt: now,
    draftHash: seeded.hash, draftSnapshot: seeded.snapshot, revision: prior.revision + 1
  };
  const normal = protectedPacketInformationModelFor(nextVerification);
  // A truthful clarification can expose a separate legal refusal. Persist that
  // answer and its held evaluation; it is not a reason to lose the owner's edit.
  const next = normal?.packetPlan ? normal : caProp64ClarificationModelFor(nextVerification) ?? normal;
  if (!next) return null;
  const packetInformation = { stage: !next.packetPlan ? "in_progress" as const : next.stage, requiredInputIds: seeded.snapshot.requiredInputIds,
    serverFacts: answerRecord(seeded.snapshot.serverFacts), prefilledAnswers: answerRecord(seeded.snapshot.prefilledAnswers), answers: answerRecord(seeded.snapshot.packetAnswers),
    missingInputIds: next.missingInputIds, updatedAt: now, reviewedAt: null, reviewSafety: { safe: false, reason: next.caProp64Clarification ? "ca_prop64_choice_clarification_required" : next.packetPlan ? "final_verification_required" : next.reviewSafety.reason } };
  return {
    patch: { commercialFlow: { packetInformation, verification: nextVerification } },
    protectedTransition: { expectedPriorHash: prior.status === "verified" ? prior.hash ?? null : null, expectedPriorRevision: prior.revision,
      answerDelta, packetInformationMetadata: packetInformationMetadata(packetInformation), nextVerification },
    missingInputIds: next.missingInputIds, readyToGenerate: false, reviewReason: packetInformation.reviewSafety.reason
  };
}

/** A held result may require new factual details; this never grants readiness. */
export function ny16059HeldDetailSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): boolean {
  const evaluation = authoritative.evaluation;
  return snapshot.jurisdiction === "NY" && snapshot.pathwayId === NY_16059_ROUTE
    && snapshot.resultCode === "needs_review" && evaluation.resultCode === "needs_more_info"
    && !snapshot.paymentAllowed && !evaluation.paymentAllowed && !snapshot.packetPlan && !evaluation.packetPlan
    && ["16058_components_missing", "grouping_facts_missing"].includes(ny16059History(toScreeningAnswers(answerRecord({ ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers }))).code ?? "");
}

/** Recover a prior permissive financial-shape result without granting authority. */
export function financialAnswerHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): boolean {
  const evaluation = authoritative.evaluation;
  if (!["packet_ready", "packet_ready_with_caution"].includes(snapshot.resultCode ?? "")
    || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || !evaluation.reasons.some(entry => entry.code.endsWith(".court_requirements_unknown"))
    || !protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false }, authoritative)) return false;
  const legacy = protectedLegacyAnswerProjection(snapshot);
  if (!legacy.inspection.effectiveInvalidIds.includes("financial_obligations")) return false;
  // Require the exact former interpretation too; unrelated result/authority
  // mismatches are not a financial-answer successor.
  const previous = evaluateProtectedPacketFacts({ ...snapshot, ...legacy.maps });
  return previous !== null && protectedRouteAuthorityMatches(snapshot, previous);
}

/** Prove the former calendar-rollover interpretation before tightening a saved
 * MS result into a nonpayable hold. This hypothetical comparison never rewrites the owner's date. */
export function msTimingAnswerHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): boolean {
  const evaluation = authoritative.evaluation;
  if (snapshot.jurisdiction !== "MS" || !["needs_review", "not_yet", "packet_ready", "packet_ready_with_caution"].includes(snapshot.resultCode ?? "")
    || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || !evaluation.reasons.some(reason => reason.code === "ms.waiting_anchor_missing")
    || !protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false }, authoritative)) return false;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  const plan = snapshot.pathwayId && profile ? packetPlanForPathway(profile, snapshot.pathwayId) : null;
  if (!profile || !plan || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))) return false;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers) return false;
  const normalized: Record<string, AnswerValue> = {};
  for (const id of msExactTimingQuestionIds("MS", snapshot.pathwayId, answers)) {
    const raw = answers[id];
    if (id === "ms_mip_fine_imposed" || msExactCalendarDate(raw) || typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) continue;
    const former = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isFinite(former.getTime())) normalized[id] = former.toISOString().slice(0, 10);
  }
  if (!Object.keys(normalized).length || !evaluation.missingQuestionIds.length
    || evaluation.missingQuestionIds.some(id => !Object.hasOwn(normalized, id))) return false;
  const normalizedSnapshot = { ...snapshot, packetAnswers: { ...snapshot.packetAnswers, ...normalized } };
  const previous = evaluateProtectedPacketFacts(normalizedSnapshot);
  if (previous !== null && protectedRouteAuthorityMatches(snapshot, previous)) return true;
  // A previously unelapsed wait may have expired since capture. Reproduce the
  // exact former tuple at its trusted saved time; current authority stays held.
  const capturedAt = "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt;
  const atCapture = compareAtProtectedSnapshotTime(capturedAt, () => evaluateProtectedPacketFacts(normalizedSnapshot));
  return atCapture !== null && protectedRouteAuthorityMatches(snapshot, atCapture);
}

/** Exact pre-correction contracts at bd4f9715b. This proves historical held
 * ownership only; the contradicted plan is never carried into current authority. */
export function factualPathwayHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const historical = snapshot.jurisdiction === "IL" ? {
    route: "cannabis-specific-automatic-or-petition-expungement", type: "official_pdf_overlay",
    source: "aa34523e3b643b32124db5d83973622f37082f2d112b3e32ef55912258a7e630",
    authority: "fd2f928d24a4d0d56fd8ff5abda2e8a865d1c164a43d448cbf32fd7225af52d0"
  } : snapshot.jurisdiction === "GA" ? {
    route: "youthful-first-offender-restriction-route", type: "custom_pleading",
    source: "2e9c9d5f9ad17fefb315d71b4336f0ffd2de6c1b614453cd06abd45f06cf2812",
    authority: "203fdfa7f45347041d9aba3acacddd8e0ae02c7349256c1c3ba6c2bdb3a191ef"
  } : null;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  const evaluation = authoritative.evaluation;
  if (!historical || !profile || snapshot.pathwayId !== historical.route
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== historical.source || profile.source?.sourceCorpusSha256 !== historical.source
    || snapshot.profileAuthorityFingerprint !== historical.authority || profileAuthorityFingerprint(profile, historical.route) !== historical.authority
    || snapshot.resultCode !== "needs_review" || snapshot.paymentAllowed || snapshot.packetType !== historical.type
    || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !pathwayExcludedByKnownFacts(snapshot.jurisdiction, protectedPacketScreeningAnswers(snapshot) ?? {}, historical.route)
    || evaluation.jurisdiction !== snapshot.jurisdiction || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.resultCode !== "needs_review" || evaluation.pathwayId || evaluation.packetPlan || evaluation.paymentAllowed
    || authoritative.packetType || authoritative.selectedTrackId || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== `${snapshot.jurisdiction.toLowerCase()}.pathway_conflicts_with_saved_fact`) return null;
  const plan = packetPlanForPathway(profile, historical.route);
  if (!plan || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, historical.route))) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies,
    capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact pre-correction nonconviction tuples at706dfe818. Reading a saved
 * matter preserves its raw history and grants no current packet authority. */
export function convictionFallbackHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  const answers = protectedPacketScreeningAnswers(snapshot);
  const evaluation = authoritative.evaluation;
  if (!profile || !answers || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || convictionReliefRequest(profile, answers).status !== "clarification"
    || evaluation.resultCode !== "needs_more_info" || evaluation.pathwayId || evaluation.packetPlan || evaluation.paymentAllowed
    || authoritative.packetType || authoritative.selectedTrackId || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== `${snapshot.jurisdiction.toLowerCase()}.conviction_relief_missing`) return null;
  // Independently reproduced for all four adult-conviction wires in each
  // exact state route, with/without previous program/cannabis answers. New
  // discriminators did not exist in the predecessor contract.
  if (!isAdultConvictionAnswer(answers.case_outcome)
    || convictionReliefQuestions(snapshot.jurisdiction).some(q => Object.hasOwn(answers, q.id))) return null;
  if (!convictionFallbackPrior.contracts.some(contract => Object.entries(contract).every(([key, value]) =>
    canonicalEqual(snapshot[key as keyof ProtectedPacketAuthoritySnapshot] ?? null, value)))) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies,
    capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

export function protectedPacketInformationModelFor(
  verification: ProtectedPacketVerificationRecord
): ProtectedPacketInformationModel | null {
  let snapshot = protectedAuthoritySnapshotFor(verification);
  if (!snapshot) return null;
  if ((isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId) || isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId))
    && (!canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: snapshot.packetPlan?.mode ?? null, sourceFormIds: snapshot.packetPlan?.sourceFormIds ?? [] }))) return null;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  if (!profile || profile.profileVersion !== snapshot.profileVersion) return null;
  if (snapshot.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)) return null;
  const authoritative = evaluateProtectedPacketFacts(snapshot);
  if (!authoritative) return null;
  const evaluation = authoritative.evaluation;
  const factualSuccessor = factualPathwayHeldSuccessor(snapshot, authoritative) ?? convictionFallbackHeldSuccessor(snapshot, authoritative);
  if (factualSuccessor) snapshot = factualSuccessor;
  const contractSuccessor = !canonicalEqual(evaluation.packetPlan ?? null, snapshot.packetPlan)
    ? reviewedPacketContractSuccessor(snapshot, evaluation.packetPlan) : null;
  if (contractSuccessor) snapshot = contractSuccessor;
  if (!protectedRouteAuthorityMatches(snapshot, authoritative) && ny16059HeldDetailSuccessor(snapshot, authoritative)) {
    // Newly required details may tighten an old held result. Keep all protected
    // maps and dependencies; this read grants no readiness or verification.
    snapshot = { ...snapshot, resultCode: evaluation.resultCode };
  }
  if (!protectedRouteAuthorityMatches(snapshot, authoritative) && (financialAnswerHeldSuccessor(snapshot, authoritative) || msTimingAnswerHeldSuccessor(snapshot, authoritative))) {
    snapshot = { ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false };
  }
  if (!protectedRouteAuthorityMatches(snapshot, authoritative)) return null;
  const packetPlan = readPacketPlan(snapshot.packetPlan);
  if (packetPlan && packetPlan.pathwayId !== snapshot.pathwayId) return null;
  const legacy = protectedLegacyAnswerProjection(snapshot);
  const {
    screeningAnswers,
    prefilledAnswers,
    packetAnswers,
    serverFacts
  } = sourceDisjointFactMaps({
    ...refreshedProtectedPacketFactMaps(snapshot, refreshedSensitiveFactMaps(snapshot.jurisdiction, snapshot.pathwayId, snapshot.requiredInputIds,
      ...participantMapArguments(legacy.maps))).maps,
    serverFacts: snapshot.serverFacts
  });
  const initialAnswers = { ...screeningAnswers, ...prefilledAnswers, ...packetAnswers };
  const requiredInputIds = stringArray(snapshot.requiredInputIds);
  if (!canonicalEqual(requiredInputIds, packetPlan?.requiredInputIds ?? [])) return null;
  const questionSurface = protectedPacketQuestionSurface(
    profile,
    snapshot.pathwayId,
    screeningAnswers,
    requiredInputIds,
    serverFacts,
    prefilledAnswers,
    packetAnswers,
    [...recordFactOwnQuestionIds(`${snapshot.jurisdiction}:${snapshot.pathwayId}`, initialAnswers, snapshot.dependencies.recordFactConfirmations)],
    legacy.inspection.effectiveInvalidIds
  );
  questionSurface.questions = legacyShapeQuestionMetadata(questionSurface.questions, legacy.inspection.effectiveInvalidIds);
  questionSurface.builderQuestions = legacyShapeQuestionMetadata(questionSurface.builderQuestions, legacy.inspection.effectiveInvalidIds);
  if (!packetPlan) for (const id of factualPathwayCorrectionIds(snapshot.jurisdiction, snapshot.pathwayId, initialAnswers)) {
    const question = questionSurface.questions.find(candidate => candidate.id === id);
    if (question && !questionSurface.builderQuestions.some(candidate => candidate.id === id)) questionSurface.builderQuestions.push(question);
  }
  for (const question of questionSurface.questions) questionSurface.questionById.set(question.id, question);
  const recordOwnQuestionIds = [...recordFactOwnQuestionIds(`${snapshot.jurisdiction}:${snapshot.pathwayId}`, initialAnswers, snapshot.dependencies.recordFactConfirmations)];
  const recordClarificationIds = unresolvedRecordFactConfirmations(`${snapshot.jurisdiction}:${snapshot.pathwayId}`, initialAnswers, questionSurface.questionById, snapshot.dependencies.recordFactConfirmations);
  const legacySemanticAnswers = snapshot.dependencies.semanticAnswerHistory?.filter((entry) => entry.factId === "trafficking_status"
    && entry.meaning === "ambiguous_victimhood_or_charged_conduct" && entry.routeKey === `${snapshot.jurisdiction}:${snapshot.pathwayId}`) ?? [];
  const chargedQuestion = questionSurface.questions.find((question) => question.id === MS_CHARGED_CONDUCT_FACT);
  if (chargedQuestion && legacySemanticAnswers.length && !Object.prototype.hasOwnProperty.call(snapshot.packetAnswers, chargedQuestion.id)) {
    const previous = [...new Set(legacySemanticAnswers.map((entry) => {
      const value = entry.value;
      return typeof value === "string" || typeof value === "number" ? String(value)
        : isRecord(value) && value.unknown !== true && (typeof value.value === "string" || typeof value.value === "number") ? String(value.value) : null;
    }).filter((value): value is string => value !== null))];
    const note = "We need to clarify this answer because an earlier question may have referred to being a victim of human trafficking. Your earlier answer is saved, but it will not answer this question for you.";
    const noteEs = "Necesitamos aclarar esta respuesta porque una pregunta anterior pudo haberse referido a ser víctima de trata de personas. Su respuesta anterior está guardada, pero no se usará para responder esta pregunta por usted.";
    const clarified = { ...chargedQuestion, helperText: `${chargedQuestion.helperText ?? ""}\n\n${note}${previous.length ? `\nEarlier saved answer: ${previous.join(" / ")}` : ""}`,
      translations: { ...chargedQuestion.translations, es: { ...chargedQuestion.translations?.es,
        helperText: `${chargedQuestion.translations?.es?.helperText ?? ""}\n\n${noteEs}${previous.length ? `\nRespuesta guardada anteriormente: ${previous.join(" / ")}` : ""}` } } };
    questionSurface.questions = questionSurface.questions.map((question) => question.id === clarified.id ? clarified : question);
    questionSurface.builderQuestions = questionSurface.builderQuestions.map((question) => question.id === clarified.id ? clarified : question);
    questionSurface.questionById.set(clarified.id, clarified);
  }
  // What the participant still owes, which is what "missing" has always meant.
  // Where the route cannot be resolved this is every required input the server
  // does not own -- the behaviour this line had before the collection policy.
  const missingInputIds = missingRequiredInputs(
    collectionGateInputIds(questionSurface.collection, requiredInputIds, serverFacts),
    serverFacts,
    initialAnswers,
    new Map(questionSurface.questions.map((question) => [question.id, question]))
  );
  if (questionSurface.collection?.contactReconciliation && !missingInputIds.includes("contact_information")) missingInputIds.push("contact_information");
  if (!packetPlan && routeFactualCorrectionIds({ stateCode: snapshot.jurisdiction, pathwayId: snapshot.pathwayId,
    screeningAnswers, prefilledAnswers, packetAnswers }).includes("financial_obligations")) {
    const financial = questionSurface.questionById.get("financial_obligations");
    if (financial) {
      const unresolved = questionAnswerState(financial, initialAnswers.financial_obligations) !== "known_valid";
      if (unresolved && !missingInputIds.includes(financial.id)) missingInputIds.push(financial.id);
      if ((unresolved || isNegative(answerTextRaw(initialAnswers.financial_obligations)))
        && !questionSurface.builderQuestions.some(question => question.id === financial.id)) {
        questionSurface.builderQuestions.push(financial);
      }
    }
  }
  for (const id of msExactTimingQuestionIds(snapshot.jurisdiction, snapshot.pathwayId, toScreeningAnswers(initialAnswers))) {
    const question = questionSurface.questionById.get(id);
    const valid = id === "ms_mip_fine_imposed" ? question && questionAnswerState(question, initialAnswers[id]) === "known_valid"
      : msExactCalendarDate(toScreeningAnswers(initialAnswers)[id]);
    if (!valid && !missingInputIds.includes(id)) missingInputIds.push(id);
    if (question && (!valid || !packetPlan) && !questionSurface.builderQuestions.some(candidate => candidate.id === id)) questionSurface.builderQuestions.push(question);
  }
  for (const id of recordClarificationIds) if (!missingInputIds.includes(id)) missingInputIds.push(id);
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
  const reviewSafety = contractSuccessor ? { safe: false, reason: "packet_contract_clarification_required" }
    : protectedPacketDraftReviewSafety(snapshot, "verifiedAt" in snapshot ? snapshot.verifiedAt : new Date().toISOString());
  const currentlyVerified = verification.status === "verified" && reviewSafety.safe;
  return {
    stateCode: snapshot.jurisdiction,
    revision: verification.revision,
    pathwayId: snapshot.pathwayId,
    packetPlan,
    questions: questionSurface.questions,
    builderQuestions: questionSurface.builderQuestions,
    builderSections: questionSurface.builderSections,
    initialAnswers,
    screeningAnswers,
    prefilledAnswers,
    packetAnswers,
    serverFacts,
    requiredInputIds,
    missingInputIds,
    pendingDerivations: questionSurface.collection?.pendingDerivations ?? [],
    contactReconciliation: questionSurface.collection?.contactReconciliation,
    recordOwnQuestionIds, recordClarificationIds,
    courtRecordConflict: recordFactCourtConflict(`${snapshot.jurisdiction}:${snapshot.pathwayId}`, initialAnswers),
    stage: !packetPlan ? "in_progress" : currentlyVerified
      ? "ready_to_generate"
      : missingInputIds.length === 0 && !questionSurface.collection?.pendingDerivations.length ? "facts_complete" : "in_progress",
    reviewedAt: currentlyVerified && "verifiedAt" in snapshot ? snapshot.verifiedAt : null,
    capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt,
    verificationSummary,
    verificationContext,
    verificationManifest,
    reviewSafety,
    expectedComponents: expectedPacketComponents(packetPlan)
  };
}

type ProtectedPacketAuthoritySnapshot = PacketVerificationSnapshot | ProtectedPacketDraftSnapshot;

/**
 * Resolve one route's required facts to their collection classes.
 *
 * This is the single point where packet authority ("what the finished packet
 * must know") meets collection policy ("how each of those facts is obtained").
 * It returns null only where the route itself cannot be read, which every
 * caller treats as it always has: fail closed, ask everything.
 */
export function packetCollectionFor(input: {
  jurisdiction: string;
  pathwayId: string | null;
  requiredInputIds: string[];
  serverFacts: Record<string, AnswerValue>;
  screeningAnswers: Record<string, AnswerValue>;
  prefilledAnswers?: Record<string, AnswerValue>;
  savedAnswers?: Record<string, AnswerValue>;
  recordOwnQuestionIds?: string[];
  unresolvedSavedFactIds?: readonly string[];
}): PacketCollectionResolution | null {
  const profile = getProfileByJurisdiction(input.jurisdiction);
  if (!profile) return null;
  const pathway = profile.pathways.find((candidate) => candidate.id === input.pathwayId) ?? null;
  const scope = pathway ? routeDecidingFactScope(profile, pathway) : null;
  const decidingFactIds = new Set<string>([
    ...(scope?.factIds ?? []),
    ...routeSafetyGateFactIds(input.jurisdiction, input.pathwayId)
  ]);
  const unresolvedFactIds = new Set(scope?.unresolvedRules.flatMap((rule) => rule.factIds) ?? []);
  const specification = packetSpecificationFor(`${input.jurisdiction}:${input.pathwayId ?? ""}`) ?? null;
  const contactContract = reviewedContactRepresentation({ profile, pathwayId: input.pathwayId, specification,
    requiredInputIds: input.requiredInputIds, decidingFactIds, unresolvedFactIds });
  const questionById = new Map(allPublicQuestions(projectPublicProfile(profile))
    .map((question) => [question.id, toProfileQuestion(question)]));
  installPacketSpecificationQuestions(questionById, input.jurisdiction, input.pathwayId, input.requiredInputIds);
  for (const id of input.requiredInputIds) {
    if (!questionById.has(id)) questionById.set(id, fallbackPacketQuestion(id));
  }
  return resolvePacketCollection({
    jurisdiction: input.jurisdiction,
    pathwayId: input.pathwayId,
    requiredInputIds: input.requiredInputIds,
    serverFacts: input.serverFacts,
    screeningAnswers: input.screeningAnswers,
    prefilledAnswers: input.prefilledAnswers,
    savedAnswers: input.savedAnswers,
    unresolvedSavedFactIds: new Set(input.unresolvedSavedFactIds ?? []),
    questionById,
    specification,
    routeDecidingFactIds: decidingFactIds,
    unresolvedRouteFactIds: unresolvedFactIds,
    reviewedContactRepresentation: Boolean(contactContract),
    recordOwnQuestionIds: new Set([...recordFactOwnQuestionIds(`${input.jurisdiction}:${input.pathwayId}`, { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers }), ...(input.recordOwnQuestionIds ?? [])]),
    // Narrowing confirmation must not synthesize new evaluator inputs. Preserve
    // the accepted materialization guard independently of route identity.
    materializationProtectedFactIds: pathway ? pathwayRelevantFactIds(profile, pathway) : undefined,
    baselineCarriedFactIds: baselineCarriedFactIds(`${input.jurisdiction}:${input.pathwayId ?? ""}`),
    override: routeCollectionOverrideFor(`${input.jurisdiction}:${input.pathwayId ?? ""}`)
  });
}

/** Edit links and direct saves share collection ownership; later/external facts stay in their actual stage. */
/** Eligibility corrections are distinct from document-required fields. They use
 * the existing protected revision/hash transition and never change the plan. */
/** Existing route facts remain editable through an exclusion and subsequent
 * clarification. A saved fact identifies its control, never a replacement route. */
export function factualPathwayCorrectionIds(state: string, pathway: string | null, answers: Record<string, unknown>, includeInactive = false): string[] {
  const profile = getProfileByJurisdiction(state);
  const relief = profile ? convictionReliefRequest(profile, answers) : null;
  const extra = profile && relief && relief.status !== "not_applicable"
    ? [...convictionReliefQuestions(state).filter(q => includeInactive || convictionReliefQuestionApplies(profile, answers, q.id)).map(q => q.id),
      "case_outcome", ...(state === "GA" ? ["ga_original_first_offender", "pardon_status"] : [])] : [];

  if (state === "GA" && (pathway === GA_ORIGINAL_FIRST_OFFENDER_PATHWAY || pathway === null && Object.hasOwn(answers, "ga_original_first_offender"))) {
    return [...extra, ...GA_FIRST_OFFENDER_FACT_IDS.filter(id => includeInactive || georgiaFirstOffenderQuestionApplies(state, answers, id)),
      ...(answers.ga_original_first_offender === "yes" ? ["case_outcome"] : [])];
  }
  if (state === "IL" && (pathway === IL_CANNABIS_PATHWAY || pathway === null && Object.hasOwn(answers, "il_cannabis_next_step"))) {
    return [...extra, ...IL_CANNABIS_FACT_IDS.filter(id => includeInactive || illinoisCannabisQuestionApplies(state, answers, id)),
      ...(["status_check", "vacate_conviction"].includes(String(answers.il_cannabis_next_step)) ? ["case_outcome"] : [])];
  }
  return extra;
}

function routeFactualCorrectionIds(model: { stateCode: string; pathwayId: string | null; screeningAnswers: Record<string, AnswerValue>; prefilledAnswers: Record<string, AnswerValue>; packetAnswers: Record<string, AnswerValue> }, includeInactive = false): string[] {
  if (isCaProp64Pathway(model.stateCode, model.pathwayId)) {
    const answers = { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers };
    return [...(includeInactive ? CA_PROP64_FACT_IDS : caProp64ActiveFactIds(answers)),
      "offense_level", "case_outcome", "court", "charge", "ca_prop64_branch", "sentence_completion_date",
      ...(model.pathwayId === CA_PROP64_COMPLETED ? ["ca_prop64_relief_requested"] : [])];
  }
  const facts = { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers };
  const factual = [...factualPathwayCorrectionIds(model.stateCode, model.pathwayId, facts, includeInactive), ...msExactTimingQuestionIds(model.stateCode, model.pathwayId, facts, includeInactive)];
  const profile = getProfileByJurisdiction(model.stateCode);
  const financial = model.pathwayId && isIndependentPaidFinancialFact(`${model.stateCode}:${model.pathwayId}`,
    profile?.questions.find(question => question.id === "financial_obligations")) ? ["financial_obligations"] : [];
  if (model.stateCode !== "NY" || model.pathwayId !== NY_16059_ROUTE) return [...financial, ...factual];
  const answers = toScreeningAnswers({ ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers });
  return [...financial, ...NY_16059_FACT_IDS.filter(id => id !== "ny_16059_request"), "ny_16059_later_conviction_entered", "ny_16059_undisposed_arrest", "ny_16059_pending_charge", "ny_16059_sex_offender_registration"]
    .filter(id => includeInactive || ny16059QuestionApplies(answers, id)
      && (id !== "release_date" || answers.ny_16059_sentence_incarceration === "Yes")
      && (id !== "ny_16059_incarceration_periods" || answers.ny_16059_incarceration_history === "released"));
}

export function editablePacketInputIds(model: Pick<ProtectedPacketInformationModel, "stateCode" | "pathwayId" | "requiredInputIds" | "serverFacts" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers" | "recordOwnQuestionIds" | "questions">, includeInactive = false): Set<string> {
  const collection = packetCollectionFor({ jurisdiction: model.stateCode, pathwayId: model.pathwayId, requiredInputIds: model.requiredInputIds,
    serverFacts: model.serverFacts, screeningAnswers: model.screeningAnswers, prefilledAnswers: model.prefilledAnswers, savedAnswers: model.packetAnswers, recordOwnQuestionIds: model.recordOwnQuestionIds,
    unresolvedSavedFactIds: model.questions.filter(question => question.savedAnswerNeedsClarification).map(question => question.id) });
  const excluded = new Set(collection?.facts.filter((fact) => fact.source === "server_route_fact"
    || ["external_actor", "derived"].includes(fact.collection)
    || !includeInactive && fact.collection === "conditional" && fact.active === false).map((fact) => fact.factId) ?? []);
  const factualIds = [...factualPathwayCorrectionIds(model.stateCode, model.pathwayId, { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }, includeInactive), ...msExactTimingQuestionIds(model.stateCode, model.pathwayId, { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }, includeInactive)];
  const corrections = routeFactualCorrectionIds(model, includeInactive).filter(id => id !== "financial_obligations" && !factualIds.includes(id)
    || !(id in model.serverFacts) && !excluded.has(id) && model.questions.some(question => question.id === id));
  return new Set([...model.requiredInputIds.filter((id) => !(id in model.serverFacts) && !excluded.has(id)), ...corrections]);
}

/** Reused completion answers leave intake, but retain their existing correction control. */
export function reviewEditablePacketInputIds(model: Parameters<typeof editablePacketInputIds>[0]
  & Pick<ProtectedPacketInformationModel, "builderQuestions" | "questions">): Set<string> {
  const reviewIds = new Set([...model.builderQuestions.map((question) => question.id), ...routeFactualCorrectionIds(model)]);
  const allowed = editablePacketInputIds(model);
  const questionIds = new Set(model.questions.map((question) => question.id));
  for (const contract of courtCompletionContractsFor(`${model.stateCode}:${model.pathwayId ?? ""}`)) {
    if (allowed.has(contract.targetFactId) && questionIds.has(contract.targetFactId)) reviewIds.add(contract.targetFactId);
  }
  return reviewIds;
}

/** Existing completion edits remain correctable when their saved answer holds the route. */
export function heldCourtCompletionInputIds(model: Parameters<typeof editablePacketInputIds>[0]
  & Pick<ProtectedPacketInformationModel, "questions" | "packetPlan">, resultCode: string | null): Set<string> {
  const ids = new Set<string>();
  if (!model.packetPlan || !["not_yet", "needs_more_info", "needs_review"].includes(resultCode ?? "")) return ids;
  const allowed = editablePacketInputIds(model);
  for (const contract of courtCompletionContractsFor(`${model.stateCode}:${model.pathwayId ?? ""}`)) {
    const id = contract.targetFactId;
    const question = model.questions.find((candidate) => candidate.id === id);
    if (!question || !allowed.has(id)) continue;
    // Incompatible saved values are intentionally absent from the display maps.
    // The protected question metadata retains the existing owner's correction
    // obligation without putting the malformed value back into a control.
    if (question.savedAnswerNeedsClarification === true && !Object.hasOwn(model.packetAnswers, id)) {
      ids.add(id);
      continue;
    }
    if (!Object.hasOwn(model.packetAnswers, id)) continue;
    const value = model.packetAnswers[id];
    const state = questionAnswerState(question, value);
    if (state === "uncertain" || isRecord(value) && value.unknown === true
      || state === "known_valid" && isNegative(answerTextRaw(value))) ids.add(id);
  }
  return ids;
}

/** Preserve the existing completion correction, and keep NY factual corrections
 * reachable after a saved edit puts the route into review or exclusion. */
export function heldPacketCorrectionInputIds(model: Parameters<typeof heldCourtCompletionInputIds>[0], resultCode: string | null): Set<string> {
  const ids = heldCourtCompletionInputIds(model, resultCode);
  if (["not_yet", "needs_more_info", "needs_review", "likely_not_eligible"].includes(resultCode ?? "")) {
    for (const id of routeFactualCorrectionIds(model)) {
      if (id === "financial_obligations") {
        const question = model.questions.find(candidate => candidate.id === id);
        const value = { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }[id];
        if (!question || id in model.serverFacts || !editablePacketInputIds(model).has(id)
          || !(question.savedAnswerNeedsClarification || questionAnswerState(question, value) === "uncertain"
            || isNegative(answerTextRaw(value)))) continue;
      }
      ids.add(id);
    }
  }
  return ids;
}

/**
 * Packet inputs a route carries forward instead of asking again.
 *
 * This used to be one hand-written Mississippi rule. It is now the collection
 * policy's own answer for every route: a fact the participant already gave in
 * screening is reused under the id the packet knows it by, and a fact that
 * follows deterministically from another is computed. The two Mississippi
 * carries this function used to perform are both still performed, by the
 * general rule rather than by a special case —
 *
 *   offense_category, which has no question of its own and is the
 *   classification of the offense the participant already chose as the charge
 *   level, and which carries nothing when that answer is unsure or absent;
 *
 *   sentence_completion_date, which the profile defines as a completion STATUS
 *   rather than a date, and which carries only from an explicit "yes" to
 *   everything the court ordered. "No", "not sure" and "not applicable" are
 *   about obligations this fact does not cover, so none of them carries and
 *   the builder asks the profile's own question.
 *
 * Nothing is invented anywhere: where the inputs do not determine the answer,
 * nothing carries and the fact stays a question.
 */
export function carriedForwardPacketAnswers(
  jurisdiction: string,
  pathwayId: string | null,
  screeningAnswers: Record<string, AnswerValue>,
  savedAnswers: Record<string, AnswerValue> = {},
  requiredInputIds?: string[],
  unresolvedSavedFactIds: readonly string[] = []
): Record<string, AnswerValue> {
  const serverFacts = canonicalServerFacts(jurisdiction, pathwayId);
  const required = requiredInputIds
    ?? packetRequiredInputIdsFor(jurisdiction, pathwayId);
  if (required.length === 0) return {};
  const resolution = packetCollectionFor({
    jurisdiction,
    pathwayId,
    requiredInputIds: required,
    serverFacts,
    screeningAnswers,
    savedAnswers,
    unresolvedSavedFactIds
  });
  if (!resolution) return {};
  // Server facts travel in their own map and are stripped from the prefilled
  // one anyway; carrying them here would only make two maps disagree.
  return Object.fromEntries(
    Object.entries(resolvedFactValues(resolution)).filter(([id]) => !(id in serverFacts))
  );
}

/**
 * The questions the builder actually renders, in section order.
 *
 * A question survives here only while its fact is still the participant's to
 * answer, and the order follows the participant sections rather than the order
 * the packet plan happens to list its inputs in. Questions the review surface
 * needs but the builder never asked — the route facts appended for
 * verification — are not required inputs and so are never included, which is
 * the behaviour they already had.
 *
 * Without a resolution this falls back to exactly what the builder rendered
 * before: every required input the server does not own.
 */
function builderQuestionsFor(
  questions: ProfileQuestion[],
  collection: PacketCollectionResolution | null,
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>
): ProfileQuestion[] {
  const requiredOfParticipant = new Set(requiredInputIds.filter((id) => !(id in serverFacts)));
  if (!collection) return questions.filter((question) => requiredOfParticipant.has(question.id));

  const owed = new Set(prepayGateFactIds(collection));
  const order = new Map<string, number>();
  let position = 0;
  for (const section of collection.groupedParticipantSections) {
    for (const factId of section.factIds) order.set(factId, position++);
  }
  return questions
    .filter((question) => owed.has(question.id))
    .sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER));
}

/** The participant sections, carrying only the facts the builder still asks. */
function builderSectionsFor(
  collection: PacketCollectionResolution | null,
  builderQuestions: ProfileQuestion[]
): PacketInformationSection[] {
  if (!collection) return [];
  const rendered = new Set(builderQuestions.map((question) => question.id));
  return collection.groupedParticipantSections
    .map((section) => ({
      id: section.id,
      heading: section.heading,
      description: section.description,
      translations: section.translations,
      questionIds: section.factIds.filter((factId) => rendered.has(factId)).sort((left, right) => {
        const priority = (id: string) => id === "mcic_identifier_delivery_method" ? -2 : id === "mcic_identifier_method_confirmation_source" ? -1 : 0;
        return priority(left) - priority(right);
      })
    }))
    .filter((section) => section.questionIds.length > 0);
}

function packetRequiredInputIdsFor(jurisdiction: string, pathwayId: string | null): string[] {
  if (!pathwayId) return [];
  const profile = getProfileByJurisdiction(jurisdiction);
  if (!profile) return [];
  return packetPlanForPathway(profile, pathwayId)?.requiredInputIds ?? [];
}

/**
 * The facts the participant still owes on this route, which is what "missing"
 * has always meant. A fact leaves this set only by ceasing to be theirs to
 * answer — the server owns it, it follows deterministically from another
 * answer, another actor fills it later, or its own gate says it does not apply
 * to this matter — and each of those keeps a recorded disposition.
 *
 * Where the route cannot be resolved, every required input is owed, which is
 * exactly the behaviour this function had before the collection policy existed.
 */
function collectionGateInputIds(
  resolution: PacketCollectionResolution | null,
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>
): string[] {
  if (!resolution) return requiredInputIds.filter((id) => !(id in serverFacts));
  return prepayGateFactIds(resolution);
}

/** Wording follows a valid ownership answer, never an uncertain wrapper or guessed consent. */
function knownParticipantOwner(questionById: ReadonlyMap<string, ProfileQuestion>, value: unknown): boolean {
  const question = questionById.get("ownership_scope");
  return Boolean(question && questionAnswerState(question, value) === "known_valid"
    && (value === true || answerTextRaw(value as AnswerValue).trim() === "Yes"));
}

/** A wording audience only; this does not grant consent, ownership, or access. */
function knownParticipantHelper(questionById: ReadonlyMap<string, ProfileQuestion>, value: unknown): boolean {
  const question = questionById.get("ownership_scope");
  return Boolean(question && questionAnswerState(question, value) === "known_valid"
    && answerTextRaw(value as AnswerValue).trim() === "I am helping someone complete their own check");
}

function protectedPacketQuestionSurface(
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>,
  pathwayId: string | null,
  screeningAnswers: Record<string, AnswerValue>,
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>,
  prefilledAnswers: Record<string, AnswerValue> = {},
  savedAnswers: Record<string, AnswerValue> = {},
  recordOwnQuestionIds: string[] = [],
  unresolvedSavedFactIds: readonly string[] = []
) {
  const questionById = new Map<string, ProfileQuestion>();
  for (const question of allPublicQuestions(projectPublicProfile(profile))) {
    questionById.set(question.id, toProfileQuestion(question));
  }
  installPacketSpecificationQuestions(questionById, profile.jurisdiction.code, pathwayId, requiredInputIds);
  let questions = requiredInputIds
    .filter((id) => !(id in serverFacts))
    .map((id) => questionById.get(id) ?? fallbackPacketQuestion(id))
    .map((question) => ({ ...question, required: true, contextOnly: false }));
  const mississippiNonConviction = profile.jurisdiction.code === "MS"
    && pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
  if (mississippiNonConviction) {
    const owner = knownParticipantOwner(questionById, screeningAnswers.ownership_scope);
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
  const correctionIds = routeFactualCorrectionIds({ stateCode: profile.jurisdiction.code, pathwayId, screeningAnswers, prefilledAnswers, packetAnswers: savedAnswers });
  for (const id of correctionIds) {
    const question = questionById.get(id);
    if (question && !questions.some(q => q.id === id)) questions.push({ ...question, required: false, contextOnly: false });
  }
  // Which of these the builder actually asks, and in what grouping, is the
  // collection policy's decision. A fact leaves the builder only by ceasing to
  // be the participant's to answer, and a fact that could not be carried
  // forward is asked, so a matter can never be stuck as incomplete on a
  // question it never shows.
  const collection = packetCollectionFor({
    jurisdiction: profile.jurisdiction.code,
    pathwayId,
    requiredInputIds,
    serverFacts,
    screeningAnswers,
    prefilledAnswers,
    savedAnswers,
    recordOwnQuestionIds,
    unresolvedSavedFactIds
  });
  questions = questions.map((question) => reviewedPacketQuestion(question, { state: profile.jurisdiction.code, pathwayId, participantOwnsRecord: knownParticipantOwner(questionById, screeningAnswers.ownership_scope), participantHelpingRecord: knownParticipantHelper(questionById, screeningAnswers.ownership_scope) }));
  for (const question of questions) questionById.set(question.id, question);
  const builderQuestions = builderQuestionsFor(questions, collection, requiredInputIds, serverFacts);
  const builderSections = builderSectionsFor(collection, builderQuestions);
  return { questionById, questions, builderQuestions, builderSections, collection };
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

type LegacyAnswerSource = Pick<ProtectedPacketAuthoritySnapshot, "jurisdiction" | "pathwayId" | "profileVersion"
  | "profileSourceFingerprint" | "profileAuthorityFingerprint" | "requiredInputIds"
  | "screeningAnswers" | "prefilledAnswers" | "packetAnswers">;

/** Current question contracts decide shape; the original protected maps remain the storage authority. */
function protectedLegacyAnswerProjection(snapshot: LegacyAnswerSource) {
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  const questionById = new Map<string, ProfileQuestion>();
  if (profile) for (const question of allPublicQuestions(projectPublicProfile(profile))) {
    questionById.set(question.id, toProfileQuestion(question));
  }
  installPacketSpecificationQuestions(questionById, snapshot.jurisdiction, snapshot.pathwayId, snapshot.requiredInputIds);
  for (const id of snapshot.requiredInputIds) if (!questionById.has(id)) questionById.set(id, fallbackPacketQuestion(id));
  const serverFacts = canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId);
  // Ownership classification only. These normalized values are not evaluated
  // or displayed until incompatible shapes and shadowed values are removed.
  const collection = packetCollectionFor({ jurisdiction: snapshot.jurisdiction, pathwayId: snapshot.pathwayId,
    requiredInputIds: snapshot.requiredInputIds, serverFacts, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), savedAnswers: answerRecord(snapshot.packetAnswers) });
  const excluded = new Set(collection?.facts.filter(fact => fact.source === "server_route_fact"
    || fact.collection === "external_actor" || fact.source === "packet_specification_not_yet_state").map(fact => fact.factId) ?? []);
  // The full identifier owns this projection; its malformed last-four mirror
  // never becomes a second participant question.
  if (snapshot.requiredInputIds.includes("social_security_number")) excluded.add("social_security_number_last_four");
  const questions = [...questionById.values()].filter(question => !(question.id in serverFacts) && !excluded.has(question.id)
    // CA's stricter record contracts retain their existing recovery/history.
    && !(isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId) && CA_PROP64_RECORD_FACT_IDS.some(id => id === question.id)));
  const inspection = inspectProtectedLegacyShapes(snapshot, snapshot, questions);
  const maps = { screeningAnswers: answerRecord(inspection.projected.screeningAnswers),
    prefilledAnswers: answerRecord(inspection.projected.prefilledAnswers), packetAnswers: answerRecord(inspection.projected.packetAnswers) };
  return { inspection, maps };
}

function participantMapArguments(maps: ParticipantFactMaps): [Record<string, AnswerValue>, Record<string, AnswerValue>, Record<string, AnswerValue>] {
  return [maps.screeningAnswers, maps.prefilledAnswers, maps.packetAnswers];
}

/** Reuse the protected answer interpretation when presenting a saved matter. */
export function protectedPacketScreeningAnswers(snapshot: ProtectedPacketAuthoritySnapshot) {
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  if (!profile || profile.profileVersion !== snapshot.profileVersion) return null;
  if (isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId)
    && (!canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: snapshot.packetPlan?.mode ?? null, sourceFormIds: snapshot.packetPlan?.sourceFormIds ?? [] }))) return null;
  const legacy = protectedLegacyAnswerProjection(snapshot);
  const projected = legacy.maps;
  const answers = toScreeningAnswers({ ...projected.screeningAnswers, ...projected.prefilledAnswers, ...projected.packetAnswers });
  // A malformed saved payment answer is unresolved, not an absent optional
  // fact. Preserve its raw value and correction metadata, while preventing
  // omission from bypassing the existing financial-completion check.
  if (legacy.inspection.effectiveInvalidIds.includes("financial_obligations")) {
    answers.financial_obligations = "I am not sure";
  }
  if (isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId)) {
    const raw = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
    for (const question of caProp64RecordQuestions(profile, profile.questions, snapshot.pathwayId)) {
      if (caProp64RecordAnswerState(question.id, raw[question.id]) !== "known_valid") {
        // Evaluation gets an explicit unresolved fact. The protected raw maps
        // stay unchanged and remain available for owner correction/history.
        answers[question.id] = "I am not sure";
      }
    }
  }
  return answers;
}

function evaluateProtectedPacketFacts(snapshot: ProtectedPacketAuthoritySnapshot) {
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers) return null;
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
  capturedAt: string,
  useContactComponents = false,
  confirmRecordFacts: string[] = [],
  explicitChangedIds: ReadonlySet<string> = new Set(),
  clearInactiveCustodyFacts = false
): ProtectedPacketDraftSnapshot | null {
  let base = protectedAuthoritySnapshotFor(verification);
  if (!base) return null;
  const currentAuthority = evaluateProtectedPacketFacts(base);
  if (!currentAuthority) return null;
  const originalBase = base;
  const factualIds = [...factualPathwayCorrectionIds(base.jurisdiction, base.pathwayId, { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, true), ...msExactTimingQuestionIds(base.jurisdiction, base.pathwayId, { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, true)];
  if (isNy16059Packet(base.jurisdiction, base.pathwayId)) factualIds.push(...NY_PACKET_FACT_IDS,
    ...routeFactualCorrectionIds({ stateCode: base.jurisdiction, pathwayId: base.pathwayId,
      screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) }, true));
  if (!canonicalEqual(currentAuthority.evaluation.packetPlan ?? null, base.packetPlan)) {
    base = factualPathwayHeldSuccessor(base, currentAuthority) ?? convictionFallbackHeldSuccessor(base, currentAuthority) ?? reviewedPacketContractSuccessor(base, currentAuthority.evaluation.packetPlan);
    if (!base) return null;
  }
  if (factualIds.some(id => explicitChangedIds.has(id))) {
    const history = [...(base.dependencies.semanticAnswerHistory ?? [])];
    for (const factId of factualIds.filter(id => explicitChangedIds.has(id))) for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      if (!Object.hasOwn(originalBase[source], factId)) continue;
      const entry = { factId, value: originalBase[source][factId], source, meaning: "prior_factual_pathway_answer" as const,
        routeKey: `${originalBase.jurisdiction}:${originalBase.pathwayId}`, profileVersion: originalBase.profileVersion,
        profileSourceFingerprint: originalBase.profileSourceFingerprint, profileAuthorityFingerprint: originalBase.profileAuthorityFingerprint };
      if (!history.some(old => canonicalEqual(old, entry))) history.push(entry);
    }
    base = { ...base, dependencies: { ...base.dependencies, semanticAnswerHistory: history } };
  }
  if (clearInactiveCustodyFacts) {
    const history = [...(base.dependencies.semanticAnswerHistory ?? [])];
    base = { ...base, screeningAnswers: { ...base.screeningAnswers }, prefilledAnswers: { ...base.prefilledAnswers }, packetAnswers: { ...base.packetAnswers } };
    packetAnswers = { ...packetAnswers };
    for (const factId of ["release_date", "ny_16059_incarceration_periods"]) {
      for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
        if (!Object.prototype.hasOwnProperty.call(base[source], factId)) continue;
        const entry = { factId, value: base[source][factId], source, meaning: "ny_16059_custody_entered_in_error" as const,
          routeKey: `${base.jurisdiction}:${base.pathwayId}`, profileVersion: base.profileVersion,
          profileSourceFingerprint: base.profileSourceFingerprint, profileAuthorityFingerprint: base.profileAuthorityFingerprint };
        if (!history.some(old => canonicalEqual(old, entry))) history.push(entry);
        delete base[source][factId];
      }
      delete packetAnswers[factId];
    }
    base.dependencies = { ...base.dependencies, semanticAnswerHistory: history };
  }
  if (isCaProp64Pathway(base.jurisdiction, base.pathwayId)) {
    const before = { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers };
    const after = { ...base.screeningAnswers, ...base.prefilledAnswers, ...packetAnswers };
    if (["ca_prop64_branch", "ca_prop64_relief_requested", ...CA_PROP64_RECORD_FACT_IDS, "sentence_completion_date", ...CA_PROP64_FACT_IDS].some((id) => !canonicalEqual(before[id], after[id]))) {
      base = { ...base, dependencies: { ...base.dependencies, semanticAnswerHistory: caProp64AnswerHistory(base, explicitChangedIds) } };
    }
  }
  const legacy = protectedLegacyAnswerProjection(base);
  const replacedLegacyIds = new Set([...explicitChangedIds, ...(useContactComponents ? ["contact_information"] : [])]);
  const blockedLegacyFacts = new Set(legacy.inspection.effectiveInvalidIds.filter(id => !replacedLegacyIds.has(id)));
  const refreshed = refreshedProtectedPacketFactMaps(base, { ...legacy.maps, packetAnswers }, useContactComponents, blockedLegacyFacts);
  if (useContactComponents && !refreshed.adopted) return null;
  const answers = { ...refreshed.maps.screeningAnswers, ...refreshed.maps.prefilledAnswers, ...refreshed.maps.packetAnswers };
  const routeKey = `${base.jurisdiction}:${base.pathwayId}`;
  const own = new Set([...recordFactOwnQuestionIds(routeKey, answers, base.dependencies.recordFactConfirmations),
    ...recordFactOwnQuestionIds(routeKey, { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, base.dependencies.recordFactConfirmations)]);
  const surface = protectedPacketQuestionSurface(getProfileByJurisdiction(base.jurisdiction)!, base.pathwayId,
    refreshed.maps.screeningAnswers, base.requiredInputIds, answerRecord(base.serverFacts), refreshed.maps.prefilledAnswers, refreshed.maps.packetAnswers, [...own], [...blockedLegacyFacts]);
  for (const id of confirmRecordFacts) {
    if (!own.has(id)) continue;
    const marker = recordFactConfirmationFor(routeKey, id, answers, surface.questionById.get(id));
    const history = [...(base.dependencies.recordFactConfirmations?.[id]?.legacyValues ?? [])];
    for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      if (!(id in base[source])) continue;
      const entry = { source, value: base[source][id], meaning: "unconfirmed_record_fact" as const, profileVersion: base.profileVersion, routeKey };
      if (!history.some((old) => canonicalEqual(old, entry))) history.push(entry);
    }
    refreshed.dependencies = { ...refreshed.dependencies, recordFactConfirmations: { ...refreshed.dependencies.recordFactConfirmations,
      [id]: { ...(marker ?? { version: 1, routeKey, status: "unconfirmed" }), ...(history.length ? { legacyValues: history } : {}) } } };
  }
  const candidate: ProtectedPacketAuthoritySnapshot = { ...base,
    ...preserveProtectedLegacyShapes(refreshed.maps, legacy.inspection, replacedLegacyIds), dependencies: refreshed.dependencies };
  const authoritative = evaluateProtectedPacketFacts(candidate);
  if (!authoritative) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({
    authoritative,
    ...preserveProtectedLegacyShapes(refreshed.maps, legacy.inspection, replacedLegacyIds),
    dependencies: refreshed.dependencies,
    capturedAt
  })?.snapshot;
  if (!seeded) return null;
  const history = archiveExplicitLegacyShapeReplacements(seeded.dependencies.semanticAnswerHistory, legacy.inspection, replacedLegacyIds);
  const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);
  const preserveFinancialFacts = (!base.packetPlan || explicitChangedIds.has("financial_obligations"))
    && isIndependentPaidFinancialFact(`${base.jurisdiction}:${base.pathwayId}`,
    getProfileByJurisdiction(base.jurisdiction)?.questions.find(question => question.id === "financial_obligations"));
  const preserved = isCaProp64Pathway(base.jurisdiction, base.pathwayId) || preserveFinancialFacts || factualIds.length > 0
    ? preserveUnchangedProtectedFacts(shapesPreserved, base, new Set([...explicitChangedIds, ...confirmRecordFacts]))
    : shapesPreserved;
  return { ...preserved, dependencies: history.length
    ? { ...preserved.dependencies, semanticAnswerHistory: history } : preserved.dependencies };
}

/** Reconcile a computable identifier projection without changing the protected source or its verification. */
function refreshedSensitiveFactMaps(state: string, pathwayId: string | null, requiredInputIds: string[], screening: Record<string, AnswerValue>, prefilled: Record<string, AnswerValue>, packet: Record<string, AnswerValue>) {
  const screeningAnswers = { ...screening }, prefilledAnswers = { ...prefilled }, packetAnswers = { ...packet };
  if (requiresMcicIdentifierAuthority(state, pathwayId) && requiredInputIds.includes("social_security_number")) {
    const lastFour = fullSsnLastFour({ ...screening, ...prefilled, ...packet }.social_security_number);
    delete screeningAnswers.social_security_number_last_four;
    delete prefilledAnswers.social_security_number_last_four;
    delete packetAnswers.social_security_number_last_four;
    if (lastFour) prefilledAnswers.social_security_number_last_four = lastFour;
  }
  return { screeningAnswers, prefilledAnswers, packetAnswers };
}

type ParticipantFactMaps = { screeningAnswers: Record<string, AnswerValue>; prefilledAnswers: Record<string, AnswerValue>; packetAnswers: Record<string, AnswerValue> };

function protectedRouteAuthorityMatches(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>) {
  const evaluation = authoritative.evaluation;
  return (evaluation.pathwayId ?? null) === snapshot.pathwayId
    && evaluation.resultCode === snapshot.resultCode
    && evaluation.paymentAllowed === snapshot.paymentAllowed
    && (authoritative.packetType ?? null) === (snapshot.packetType ?? null)
    && (authoritative.selectedTrackId ?? null) === snapshot.selectedTrackId
    && (evaluation.treatmentClassification ?? null) === snapshot.treatmentClassification
    && canonicalEqual(evaluation.deferralComponentIds ?? [], snapshot.deferralComponentIds)
    && canonicalEqual(evaluation.packetPlan ?? null, snapshot.packetPlan);
}

/** Reviewed status implications run after authority exists, never in the route selector. */
function refreshedCourtCompletionFactMaps(base: ProtectedPacketAuthoritySnapshot, incoming: ParticipantFactMaps,
  dependencies: PacketVerificationSnapshot["dependencies"] = base.dependencies, blockedLegacyFacts: ReadonlySet<string> = new Set()) {
  const contracts = courtCompletionContractsFor(`${base.jurisdiction}:${base.pathwayId ?? ""}`);
  if (!contracts.length) return { maps: incoming, dependencies };
  const marked = contracts.some(contract => dependencies.courtCompletionImplications?.[contract.targetFactId]);
  if (!marked && (incoming.screeningAnswers.court_requirements_completed !== "yes"
    || contracts.every(contract => Object.values(incoming).some(map => Object.prototype.hasOwnProperty.call(map, contract.targetFactId))))) return { maps: incoming, dependencies };
  const profile = getProfileByJurisdiction(base.jurisdiction);
  if (!profile || profile.profileVersion !== base.profileVersion
    || base.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || base.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, base.pathwayId)) return { maps: incoming, dependencies };
  const pathway = profile.pathways.find(entry => entry.id === base.pathwayId);
  const plan = readPacketPlan(base.packetPlan);
  if (!pathway || !plan || plan.pathwayId !== base.pathwayId
    || !canonicalEqual(base.requiredInputIds, plan.requiredInputIds)) return { maps: incoming, dependencies };
  const source = projectPublicProfile(profile).questions.find(question => question.id === "court_requirements_completed");
  const specification = packetSpecificationFor(`${base.jurisdiction}:${base.pathwayId}`);
  const scope = routeDecidingFactScope(profile, pathway);
  const surface = protectedPacketQuestionSurface(profile, base.pathwayId, incoming.screeningAnswers, base.requiredInputIds,
    answerRecord(base.serverFacts), incoming.prefilledAnswers, incoming.packetAnswers);
  const hash = contactRepresentationHash;
  const currentContractIds = new Set(contracts.filter(contract => {
    const target = surface.questionById.get(contract.targetFactId);
    const disposition = surface.collection?.facts.find(fact => fact.factId === contract.targetFactId);
    return source && target && !blockedLegacyFacts.has(target.id) && source.id === contract.sourceFactId && target.type === "yes_no_unsure"
      && base.requiredInputIds.includes(target.id) && disposition?.active !== false
      && disposition?.collection !== "external_actor" && disposition?.collection !== "unresolved"
      && !scope.unresolvedRules.some(rule => rule.factIds.includes(target.id))
      && base.profileVersion === contract.profileVersion && base.profileSourceFingerprint === contract.profileSourceFingerprint
      && base.profileAuthorityFingerprint === contract.profileAuthorityFingerprint
      && canonicalEqual(base.requiredInputIds, contract.requiredInputIds)
      && hash(source) === contract.sourceDescriptorSha256
      && [contract.targetDescriptorSha256, contract.assistedTargetDescriptorSha256].includes(hash(target))
      && hash(pathway) === contract.pathwayCanonicalSha256 && hash(base.packetPlan) === contract.expectedPlanCanonicalSha256
      && (specification?.specificationId ?? null) === contract.registeredSpecificationId
      && (specification ? hash(specification) : null) === contract.registeredSpecificationCanonicalSha256;
  }).map(contract => contract.contractId));
  const original = { screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) };
  const authority = evaluateProtectedPacketFacts(base);
  const authorityValue = (value: NonNullable<typeof authority>) => ({ evaluation: value.evaluation, packetType: value.packetType ?? null, selectedTrackId: value.selectedTrackId });
  const refreshed = refreshCourtCompletionImplications({ contracts, currentContractIds, original, incoming,
    provenance: dependencies.courtCompletionImplications,
    authorityUnchanged: maps => {
      if (!authority || !protectedRouteAuthorityMatches(base, authority)) return false;
      const next = evaluateProtectedPacketFacts({ ...base, ...maps });
      return next !== null && protectedRouteAuthorityMatches(base, next) && canonicalEqual(authorityValue(authority), authorityValue(next));
    } });
  if (!Object.keys(refreshed.provenance).length && !dependencies.courtCompletionImplications) return { maps: refreshed.maps, dependencies };
  return { maps: refreshed.maps, dependencies: { ...dependencies, courtCompletionImplications: refreshed.provenance } };
}

function refreshedProtectedPacketFactMaps(base: ProtectedPacketAuthoritySnapshot, incoming: ParticipantFactMaps, adoptContact = false,
  blockedLegacyFacts: ReadonlySet<string> = new Set(protectedLegacyAnswerProjection(base).inspection.effectiveInvalidIds)) {
  const existing = refreshedPacketFactMaps(base, incoming, adoptContact, blockedLegacyFacts);
  return { ...existing, ...refreshedCourtCompletionFactMaps(base, existing.maps, existing.dependencies, blockedLegacyFacts) };
}

/** Existing collection rules only; their route/materialization guards still decide whether each can run. */
const REFRESHABLE_PACKET_DERIVATIONS = ["court_type", "court_name", "filing_location", "age_at_offense", "offense_category", "charge_classification"];

type PacketDerivationSource = Pick<ProtectedPacketAuthoritySnapshot, "jurisdiction" | "pathwayId" | "profileVersion" | "requiredInputIds" | "dependencies" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers">;

function refreshedPacketFactMaps(base: PacketDerivationSource, incoming: ParticipantFactMaps, adoptContact = false,
  blockedLegacyFacts: ReadonlySet<string> = new Set()) {
  const contact = blockedLegacyFacts.has("contact_information") && !adoptContact
    ? { maps: { screeningAnswers: { ...incoming.screeningAnswers }, prefilledAnswers: { ...incoming.prefilledAnswers }, packetAnswers: { ...incoming.packetAnswers } }, dependencies: base.dependencies, adopted: false }
    : refreshedContactFactMaps(base, incoming, adoptContact);
  const maps = contact.maps;
  let dependencies = contact.dependencies;
  const current = { ...maps.screeningAnswers, ...maps.prefilledAnswers, ...maps.packetAnswers };
  const priorMaps = { screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) };
  const prior = { ...priorMaps.screeningAnswers, ...priorMaps.prefilledAnswers, ...priorMaps.packetAnswers };
  const withoutTarget = (answers: Record<string, AnswerValue>, target: string) => Object.fromEntries(Object.entries(answers).filter(([id]) => id !== target));
  const candidates = (source: ParticipantFactMaps, target: string) => packetCollectionFor({ jurisdiction: base.jurisdiction, pathwayId: base.pathwayId,
    requiredInputIds: base.requiredInputIds, serverFacts: canonicalServerFacts(base.jurisdiction, base.pathwayId),
    screeningAnswers: withoutTarget(source.screeningAnswers, target), prefilledAnswers: withoutTarget(source.prefilledAnswers, target), savedAnswers: withoutTarget(source.packetAnswers, target) });
  const routeKey = `${base.jurisdiction}:${base.pathwayId ?? ""}`;
  const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
  const own = recordFactOwnQuestionIds(routeKey, current, dependencies.recordFactConfirmations);
  for (const id of REFRESHABLE_PACKET_DERIVATIONS) {
    if (own.has(id) || blockedLegacyFacts.has(id)) continue;
    const nextCandidates = candidates(maps, id), priorCandidates = candidates(priorMaps, id);
    const fact = nextCandidates?.facts.find((entry) => entry.factId === id && entry.derivation);
    if (!fact?.derivation) continue;
    const output = nextCandidates?.derivedFacts[id], retained = current[id];
    const oldOutput = priorCandidates?.derivedFacts[id];
    const recorded = dependencies.packetDerivations?.[id];
    const proven = recorded?.version === 1 && recorded.routeKey === routeKey
      && canonicalEqual(recorded.inputFactIds, fact.derivation.inputFactIds) && /^[a-f0-9]{64}$/.test(recorded.inputSha256)
      && retained !== undefined && recorded.outputSha256 === hash(retained);
    const question = fallbackPacketQuestion(id);
    const exact = output !== undefined && sameKnownQuestionAnswer(question, retained, output);
    const previousExact = oldOutput !== undefined && canonicalEqual(retained, prior[id]) && sameKnownQuestionAnswer(question, retained, oldOutput);
    const absent = retained === undefined || retained === null || retained === "";
    if (!(absent || proven || previousExact) || exact && !proven) continue;
    const history = [...(recorded?.legacyValues ?? [])];
    if (previousExact && !proven && !exact && !absent) for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      if (!(id in maps[source])) continue;
      const entry = { source, value: maps[source][id], meaning: "exact_prior_derived_representation" as const, profileVersion: base.profileVersion, routeKey };
      if (!history.some((old) => canonicalEqual(old, entry))) history.push(entry);
    }
    for (const source of Object.values(maps)) delete source[id];
    if (output !== undefined) maps.prefilledAnswers[id] = output;
    // A missing output has explicit pending dependencies, not an invented value.
    dependencies = { ...dependencies, packetDerivations: { ...dependencies.packetDerivations, [id]: {
      version: 1, routeKey, inputFactIds: [...fact.derivation.inputFactIds],
      inputSha256: hash(fact.derivation.inputFactIds.map((sourceId) => current[sourceId] ?? null)), outputSha256: hash(output ?? null),
      ...(history.length ? { legacyValues: history } : {})
    } } };
  }
  return { ...contact, maps, dependencies };
}

/** Refresh only a proven representation; independent legacy text stays intact until informed adoption. */
function refreshedContactFactMaps(base: Pick<ProtectedPacketAuthoritySnapshot, "jurisdiction" | "pathwayId" | "requiredInputIds" | "dependencies" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers">, incoming: ParticipantFactMaps, adopt = false) {
  const maps = { screeningAnswers: { ...incoming.screeningAnswers }, prefilledAnswers: { ...incoming.prefilledAnswers }, packetAnswers: { ...incoming.packetAnswers } };
  let dependencies = base.dependencies;
  const profile = getProfileByJurisdiction(base.jurisdiction);
  const pathway = profile?.pathways.find((candidate) => candidate.id === base.pathwayId);
  if (!profile || !pathway) return { maps, dependencies, adopted: false };
  const scope = routeDecidingFactScope(profile, pathway);
  const contract = reviewedContactRepresentation({ profile, pathwayId: base.pathwayId, specification: packetSpecificationFor(`${base.jurisdiction}:${base.pathwayId}`) ?? null,
    requiredInputIds: base.requiredInputIds, decidingFactIds: new Set([...scope.factIds, ...routeSafetyGateFactIds(base.jurisdiction, base.pathwayId)]),
    unresolvedFactIds: new Set(scope.unresolvedRules.flatMap((rule) => rule.factIds)) });
  if (!contract) return { maps, dependencies, adopted: false };
  const merge = (source: ParticipantFactMaps) => ({ ...source.screeningAnswers, ...source.prefilledAnswers, ...source.packetAnswers });
  const all = merge(maps);
  const computed = (source: ParticipantFactMaps) => {
    const withoutAggregate = (answers: Record<string, AnswerValue>) => Object.fromEntries(Object.entries(answers).filter(([id]) => id !== "contact_information"));
    return packetCollectionFor({ jurisdiction: base.jurisdiction, pathwayId: base.pathwayId, requiredInputIds: base.requiredInputIds,
      serverFacts: canonicalServerFacts(base.jurisdiction, base.pathwayId), screeningAnswers: withoutAggregate(source.screeningAnswers),
      prefilledAnswers: withoutAggregate(source.prefilledAnswers), savedAnswers: withoutAggregate(source.packetAnswers) })?.derivedFacts.contact_information;
  };
  const output = computed(maps);
  const retained = all.contact_information;
  const priorMaps = { screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) };
  const priorOutput = computed(priorMaps);
  const priorRetained = merge(priorMaps).contact_information;
  const absent = retained === undefined || retained === null || retained === "";
  const exact = output !== undefined && sameKnownQuestionAnswer(fallbackPacketQuestion("contact_information"), retained, output);
  // Exact prior component composition is a bounded legacy proof. A changed
  // independent aggregate, a marker alone, or a source timestamp is not proof.
  const previouslyExact = priorOutput !== undefined && canonicalEqual(retained, priorRetained)
    && sameKnownQuestionAnswer(fallbackPacketQuestion("contact_information"), priorRetained, priorOutput);
  const proven = isProvenContactOutput(contract, retained, dependencies.contactRepresentation);
  if (!(absent || exact || previouslyExact || proven || adopt && output !== undefined)) return { maps, dependencies, adopted: false };
  if (adopt && output === undefined) return { maps, dependencies, adopted: false };
  // Equal legacy representations are already usable. Reading or saving them
  // without a material source change must not rewrite raw values/verification.
  if (exact && !adopt && !proven) return { maps, dependencies, adopted: false };
  const priorProvenance = dependencies.contactRepresentation;
  const preserveLegacy = !absent && (adopt && !exact || previouslyExact && !proven && !exact);
  const history = [...(priorProvenance?.legacyAnswers ?? [])];
  if (preserveLegacy) for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
    const value = incoming[source].contact_information;
    if (value === undefined) continue;
    const entry = { value, source, meaning: adopt ? "independent_legacy_contact_information" as const : "exact_prior_component_composition" as const,
      profileVersion: profile.profileVersion, routeKey: contract.routeKey, valueSha256: contactRepresentationHash(value) };
    if (!history.some((prior) => canonicalEqual(prior, entry))) history.push(entry);
  }
  for (const answers of Object.values(maps)) delete answers.contact_information;
  if (output !== undefined || history.length) {
    if (output !== undefined) maps.prefilledAnswers.contact_information = output;
    const provenance = contactRepresentationProvenance(contract, all, output ?? null, priorProvenance);
    if (history.length) provenance.legacyAnswers = history;
    if (adopt && !absent && !exact) {
      provenance.replacedAnswerSha256 = contactRepresentationHash(retained);
    }
    dependencies = { ...dependencies, contactRepresentation: provenance };
  }
  return { maps, dependencies, adopted: adopt && output !== undefined };
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
  // Archive ambiguous wire values before source precedence removes overlapping maps.
  const semantic = preserveAmbiguousMsAnswer({ jurisdiction: evaluation.jurisdiction, pathwayId: evaluation.pathwayId ?? null,
    requiredInputIds: packetPlan?.requiredInputIds ?? [], profileVersion: evaluation.profileVersion,
    profileSourceFingerprint: profile.source?.sourceCorpusSha256 ?? null, profileAuthorityFingerprint: profileAuthorityFingerprint(profile, evaluation.pathwayId ?? null),
    screeningAnswers: input.screeningAnswers, prefilledAnswers: input.prefilledAnswers ?? {}, packetAnswers: input.packetAnswers ?? {}, dependencies: input.dependencies });
  const legacy = protectedLegacyAnswerProjection(semantic);
  const blockedLegacyFacts = new Set(legacy.inspection.effectiveInvalidIds);
  const sensitiveMaps = refreshedSensitiveFactMaps(evaluation.jurisdiction, evaluation.pathwayId ?? null, packetPlan?.requiredInputIds ?? [], ...participantMapArguments(legacy.maps));
  const contact = refreshedPacketFactMaps({ jurisdiction: evaluation.jurisdiction, pathwayId: evaluation.pathwayId ?? null, profileVersion: evaluation.profileVersion,
    requiredInputIds: packetPlan?.requiredInputIds ?? [], dependencies: semantic.dependencies, ...sensitiveMaps }, sensitiveMaps, false, blockedLegacyFacts);
  const { screeningAnswers: incomingScreening, prefilledAnswers: incomingPrefilled, packetAnswers: incomingPacketAnswers } = contact.maps;
  const factMaps = sourceDisjointFactMaps({
    screeningAnswers: incomingScreening,
    prefilledAnswers: {
      ...carriedForwardPacketAnswers(
        evaluation.jurisdiction,
        evaluation.pathwayId ?? null,
        incomingScreening,
        incomingPacketAnswers,
        packetPlan?.requiredInputIds,
        [...blockedLegacyFacts]
      ),
      ...incomingPrefilled
    },
    packetAnswers: incomingPacketAnswers,
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
    dependencies: canonicalize(contact.dependencies)
  }) as ProtectedPacketDraftSnapshot;
  const preservedSource = preserveAmbiguousMsAnswer(snapshot);
  const completion = refreshedCourtCompletionFactMaps(preservedSource, {
    screeningAnswers: answerRecord(preservedSource.screeningAnswers), prefilledAnswers: answerRecord(preservedSource.prefilledAnswers), packetAnswers: answerRecord(preservedSource.packetAnswers)
  }, preservedSource.dependencies, blockedLegacyFacts);
  const preserved = preserveProtectedLegacyShapes({ ...preservedSource, ...completion.maps, dependencies: completion.dependencies }, legacy.inspection, new Set());
  return { snapshot: preserved, hash: protectedPacketDraftHash(preserved) };
}

function protectedPacketDraftReviewSafety(draft: ProtectedPacketAuthoritySnapshot, verifiedAt: string) {
  const legacy = protectedLegacyAnswerProjection(draft);
  const originalMaps = legacy.maps;
  if (!canonicalEqual(refreshedProtectedPacketFactMaps(draft, originalMaps).maps, originalMaps)) return { safe: false, reason: "stale_packet_derivation" };
  const authoritative = evaluateProtectedPacketFacts(draft);
  if (!authoritative) return { safe: false, reason: "authoritative_reevaluation_failed" };
  const { evaluation } = authoritative;
  if ((evaluation.resultCode !== "packet_ready" && evaluation.resultCode !== "packet_ready_with_caution")
    || !evaluation.paymentAllowed
    || !evaluation.packetPlan) return { safe: false, reason: "authoritative_route_changed" };
  const answers = {
    ...originalMaps.screeningAnswers,
    ...originalMaps.prefilledAnswers,
    ...originalMaps.packetAnswers,
    ...answerRecord(draft.serverFacts)
  };
  if (draft.jurisdiction === "MS" && draft.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") {
    const safety = mississippiNonConvictionPacketSafety(answers, verifiedAt);
    if (!safety.safe) return safety;
  }
  const publicProfile = projectPublicProfile(getProfileByJurisdiction(draft.jurisdiction)!);
  const questionById = new Map(allPublicQuestions(publicProfile).map((question) => [question.id, toProfileQuestion(question)]));
  installPacketSpecificationQuestions(questionById, draft.jurisdiction, draft.pathwayId, draft.requiredInputIds);
  for (const id of draft.requiredInputIds) if (!questionById.has(id)) questionById.set(id, fallbackPacketQuestion(id));
  const recordOwnQuestionIds = [...recordFactOwnQuestionIds(`${draft.jurisdiction}:${draft.pathwayId}`, answers, draft.dependencies.recordFactConfirmations)];
  if (recordFactCourtConflict(`${draft.jurisdiction}:${draft.pathwayId}`, answers)) return { safe: false, reason: "court_record_conflict" };
  if (unresolvedRecordFactConfirmations(`${draft.jurisdiction}:${draft.pathwayId}`, answers, questionById, draft.dependencies.recordFactConfirmations).length) return { safe: false, reason: "record_fact_clarification_required" };
  const collection = packetCollectionFor({
    jurisdiction: draft.jurisdiction,
    pathwayId: draft.pathwayId,
    requiredInputIds: draft.requiredInputIds,
    serverFacts: answerRecord(draft.serverFacts),
    screeningAnswers: originalMaps.screeningAnswers,
    prefilledAnswers: originalMaps.prefilledAnswers,
    savedAnswers: originalMaps.packetAnswers,
    recordOwnQuestionIds,
    unresolvedSavedFactIds: legacy.inspection.effectiveInvalidIds
  });
  if (collection?.pendingDerivations.length) {
    return { safe: false, reason: `pending_packet_derivation:${collection.pendingDerivations[0].factId}` };
  }
  if (collection?.contactReconciliation) return { safe: false, reason: "contact_reconciliation_required" };
  for (const id of draft.requiredInputIds) {
    if (id in draft.serverFacts) continue;
    const disposition = collection?.facts.find((fact) => fact.factId === id);
    if (disposition?.collection === "external_actor"
      || (disposition?.collection === "conditional" && disposition.active === false)) continue;
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

function verifiedPacketRecordFromDraft(
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
  const authority = authoritativePacketContext(item, undefined, flow, verifiedAt);
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

function packetVerificationHash(snapshot: PacketVerificationSnapshot) {
  // jsonb does not preserve JavaScript insertion order. Final verification must
  // survive a protected database round trip, just like the draft hash does.
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

export function mississippiNonConvictionPacketSafety(
  answers: Record<string, AnswerValue>,
  verifiedAt = new Date().toISOString()
): { safe: true; reason: string } | { safe: false; reason: string } {
  // The same list the collection policy reads, so a fact this gate decides on
  // can never be classified as one the participant is not asked before
  // Checkout. The gate and its thresholds are unchanged.
  const requiredNeutralFacts = MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS;
  for (const [id, expected] of requiredNeutralFacts) {
    if (answerText(answers[id]) !== expected.toLowerCase()) {
      return { safe: false, reason: `route_changing_answer:${id}` };
    }
  }

  const dispositionWording = answerText(answers.disposition_record_wording);
  const ambiguous = /passed\s+to\s+(?:the\s+)?file|retired\s+to\s+(?:the\s+)?file|remand|non.?adjudication|diversion|intervention\s+court|drug\s+court/;
  const statutoryEnding = /dismiss|charges?\s+dropped|no\s+disposition|not\s+guilty|acquit|no.?bill|nolle|not\s+prosecuted/;
  if (!dispositionWording || ambiguous.test(dispositionWording) || !statutoryEnding.test(dispositionWording)) {
    return { safe: false, reason: "route_changing_answer:disposition_record_wording" };
  }
  const filing = mississippiParticipantDeliverySafety(
    answers, verifiedAt);
  return filing.safe
    ? { safe: true, reason: "route_safety_confirmed" }
    : { safe: false, reason: "participant_delivery_facts_require_verification" };
}

/** A supplied contradiction differs from an unanswered prerequisite. */
export function packetDraftStopReason(model: Pick<ProtectedPacketInformationModel, "stateCode" | "pathwayId" | "initialAnswers" | "questions">): string | null {
  if (model.stateCode !== "MS" || model.pathwayId !== "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") return null;
  const questions = new Map(model.questions.map((question) => [question.id, question]));
  for (const [id, expected] of MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS) {
    const question = questions.get(id);
    if (question && questionAnswerState(question, model.initialAnswers[id]) === "known_valid"
      && answerText(model.initialAnswers[id]) !== expected.toLowerCase()) return `route_changing_answer:${id}`;
  }
  const wording = model.initialAnswers.disposition_record_wording;
  if (answerIsKnown(wording)) {
    const probe = mississippiNonConvictionPacketSafety({
      ...model.initialAnswers,
      ...Object.fromEntries(MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS)
    });
    if (probe.reason === "route_changing_answer:disposition_record_wording") return probe.reason;
  }
  return null;
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
  flowOverride?: CommercialFlow,
  verifiedAt = new Date().toISOString()
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
    const routeSafety = mississippiNonConvictionPacketSafety(answers, verifiedAt);
    if (!routeSafety.safe) return routeSafety;
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
  if (!canonicalEqual(comparableStoredPacketPlan(storedPlan), comparableStoredPacketPlan(authoritativePlan))) {
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
  const state = questionAnswerState(question, value);
  return state === "known_valid" ? { safe: true, reason: "valid" }
    : { safe: false, reason: `invalid_packet_answer:${question.id}` };
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
    sourceRuleRefs: stringArray(value.sourceRuleRefs),
    // The compiled plan always carries packetReadyWhen and the protected
    // snapshot stores the plan as evaluated. Dropping it here made the model's
    // plan differ from the stored verification context, so verificationSummary
    // returned null and the review page rendered "Final verification is not
    // available" for every matter. Read it back exactly when it is stored.
    ...(Array.isArray(value.packetReadyWhen) ? { packetReadyWhen: stringArray(value.packetReadyWhen) } : {})
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
    type: question.id === "date_of_birth" && ["text", "text_or_unknown"].includes(question.type)
      ? question.type === "text_or_unknown" ? "date_or_unknown" : "date" : question.type,
    required: question.required,
    contextOnly: question.contextOnly === true,
    lifecyclePhase: question.lifecyclePhase,
    answerContract: question.answerContract,
    ...normalizeQuestionChoices(question.options, question.optionDisplay),
    exclusiveOptions: question.exclusiveOptions,
    translations: question.translations
  };
}

const FALLBACK_PACKET_QUESTIONS: Record<string, ProfileQuestion> = {
  date_of_birth: packetQuestion("date_of_birth", "Date of birth", "date_or_unknown", "Enter the wording from your court or agency record when possible."),
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

function installPacketSpecificationQuestions(
  questions: Map<string, ProfileQuestion>,
  jurisdiction: string,
  pathwayId: string | null,
  requiredInputIds: string[]
) {
  const routeKey = `${jurisdiction}:${pathwayId ?? ""}`;
  for (const factId of requiredInputIds) {
    const fact = packetSpecificationFactFor(routeKey, factId);
    if (!fact?.prompt) continue;
    const question = packetQuestionFromSpecification(fact);
    if (factId === "social_security_number_last_four" && requiresMcicIdentifierAuthority(jurisdiction, pathwayId)) {
      question.prompt = "Last four digits calculated from the protected Social Security number";
      question.helperText = "These digits are calculated from the full number for masked identification. To correct them, edit the protected Social Security number after confirming the court-approved delivery method. Do not enter a second value.";
      question.translations = { es: { prompt: "Últimos cuatro dígitos calculados a partir del número de Seguro Social protegido", helperText: "Estos dígitos se calculan a partir del número completo para mostrar una identificación parcial. Para corregirlos, edite el número de Seguro Social protegido después de confirmar el método de entrega aprobado por el tribunal. No ingrese un segundo valor." } };
    }
    questions.set(factId, question);
  }
  if (isNy16059Packet(jurisdiction, pathwayId)) for (const question of NY_PACKET_QUESTIONS) {
    if (requiredInputIds.includes(question.id)) questions.set(question.id, structuredClone(question));
  }
  if (isCaProp64Pathway(jurisdiction, pathwayId)) {
    for (const question of CA_PROP64_CAPTION_QUESTIONS) {
      if (requiredInputIds.includes(question.id)) questions.set(question.id, structuredClone(question));
    }
    const profile = getProfileByJurisdiction(jurisdiction);
    if (!profile) throw new Error("California Proposition 64 profile unavailable.");
    for (const question of caProp64RecordQuestions(profile, [...questions.values()] as PublicQuestion[], pathwayId)) {
      questions.set(question.id, toProfileQuestion(question));
    }
  }
}

function packetQuestionFromSpecification(fact: PacketSpecificationFact): ProfileQuestion {
  return packetQuestion(
    fact.factId,
    fact.prompt ?? answerLabel(fact.factId),
    fact.factId === "date_of_birth"
      ? fact.questionType === "text_or_unknown" ? "date_or_unknown" : "date"
      : fact.questionType ?? "text",
    fact.helperText,
    fact.options ?? null
  );
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

const answerIsKnown = answerValueIsKnown;

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
