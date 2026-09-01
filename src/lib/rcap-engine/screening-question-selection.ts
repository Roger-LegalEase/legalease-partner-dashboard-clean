import type {
  EngineProfile,
  PublicJurisdictionProfile,
  ScreeningAnswerValue
} from "@/lib/rcap-engine/contracts";

export type QuestionLifecycleMetadataValidation =
  | { ok: true }
  | { ok: false; invalidQuestionIds: string[]; invalidPathwayIds: string[] };

export function validateQuestionLifecycleMetadata(
  profile: EngineProfile,
  projectedQuestions: ReadonlyArray<{ id: string }> = []
): QuestionLifecycleMetadataValidation {
  const lifecycle = profile.questionLifecycle;
  if (!lifecycle) return { ok: true };
  const questionIds = new Set([
    ...profile.questions.map((question) => question.id),
    ...projectedQuestions.map((question) => question.id)
  ]);
  const pathwayIds = new Set(profile.pathways.map((pathway) => pathway.id));
  const referencedQuestions = [
    ...Object.keys(lifecycle.routeConsumers),
    ...lifecycle.exactPacketFactIds,
    ...lifecycle.completionAliasIds
  ];
  const invalidQuestionIds = [...new Set(referencedQuestions.filter((id) => !questionIds.has(id)))].sort();
  const invalidPathwayIds = [...new Set(Object.values(lifecycle.routeConsumers)
    .flat()
    .filter((id) => !pathwayIds.has(id)))].sort();
  return invalidQuestionIds.length === 0 && invalidPathwayIds.length === 0
    ? { ok: true }
    : { ok: false, invalidQuestionIds, invalidPathwayIds };
}

export function selectScreeningQuestionIds(
  profile: EngineProfile,
  publicProfile: PublicJurisdictionProfile,
  answers: Record<string, ScreeningAnswerValue>
): string[] {
  const validation = validateQuestionLifecycleMetadata(profile, allPublicQuestions(publicProfile));
  if (!validation.ok) {
    throw new Error(`Invalid question lifecycle metadata: questions=${validation.invalidQuestionIds.join(",")} pathways=${validation.invalidPathwayIds.join(",")}`);
  }

  const lifecycle = profile.questionLifecycle;
  const selectedLabel = typeof answers.possible_pathway_context === "string"
    ? answers.possible_pathway_context
    : "";
  const selectedPathway = selectedLabel
    ? profile.pathways.find((pathway) => pathway.label === selectedLabel)
    : undefined;
  const stageOrder = new Map(publicProfile.flowStages.map((stage) => [stage.id, stage.order]));
  const pathwayRoutingOrder = publicProfile.flowStages.find((stage) => stage.id === "pathway_routing")?.order
    ?? stageOrder.get(publicProfile.questions.find((question) => question.id === "possible_pathway_context")?.stage ?? "")
    ?? Number.NEGATIVE_INFINITY;
  const seen = new Set<string>();

  return publicProfile.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => !lifecycle?.exactPacketFactIds.includes(question.id)
      && !lifecycle?.completionAliasIds.includes(question.id))
    .filter(({ question }) => question.lifecyclePhase?.startsWith("prepay_")
      ?? !["record_readiness", "case_details", "packet_information"].includes(question.stage))
    .filter(({ question }) => lifecycle || (stageOrder.get(question.stage) ?? Number.MAX_SAFE_INTEGER) <= pathwayRoutingOrder)
    .filter(({ question }) => {
      const consumers = lifecycle?.routeConsumers[question.id] ?? [];
      if (consumers.length === 0) return true;
      return Boolean(selectedPathway && consumers.includes(selectedPathway.id));
    })
    .sort((left, right) => {
      const leftOrder = stageOrder.get(left.question.stage) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = stageOrder.get(right.question.stage) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .filter(({ question }) => {
      if (seen.has(question.id)) return false;
      seen.add(question.id);
      return true;
    })
    .map(({ question }) => question.id);
}

function allPublicQuestions(profile: PublicJurisdictionProfile) {
  const postpay = profile.postPaymentPacketCompletion;
  return [
    ...profile.questions,
    ...(postpay?.requiredPacketCompletionFields ?? []),
    ...(postpay?.officialFormFields ?? []),
    ...(postpay?.customPleadingFields ?? []),
    ...(postpay?.externalDocumentChecklist ?? []),
    ...(postpay?.filingReadinessFields ?? []),
    ...(postpay?.serviceOrMailingFields ?? []),
    ...(postpay?.narrativeFields ?? []),
    ...(postpay?.optionalFields ?? [])
  ];
}
