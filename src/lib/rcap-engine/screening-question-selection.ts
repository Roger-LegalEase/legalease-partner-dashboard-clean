import { msConditionalDischargeQuestionApplies } from "@/lib/rcap-engine/mississippi-conditional-discharge";
import { kansasRecordScopeFromAnswers, kansasRecordScopeQuestionApplies } from "@/lib/rcap-engine/kansas-record-scope";
import { caProp64RecordQuestions } from "@/lib/expungement-ai/ca-prop64-record-facts";
import { mississippiProgramRouteFromAnswers } from "@/lib/rcap-engine/composed-route-selector";
import { nevada176AQuestionApplies } from "@/lib/rcap-engine/nevada-176a-branch";
import { georgiaFirstOffenderFromAnswers, georgiaFirstOffenderQuestionApplies } from "@/lib/rcap-engine/georgia-first-offender";
import { illinoisCannabisFromAnswers, illinoisCannabisQuestionApplies } from "@/lib/rcap-engine/illinois-cannabis-facts";
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
  const programRoute = profile.jurisdiction.code === "MS" ? mississippiProgramRouteFromAnswers(answers)
    : profile.jurisdiction.code === "GA" ? georgiaFirstOffenderFromAnswers(answers)
    : profile.jurisdiction.code === "IL" ? illinoisCannabisFromAnswers(answers)
    : profile.jurisdiction.code === "KS" ? kansasRecordScopeFromAnswers(answers) : null;
  const selectedPathway = programRoute?.status === "selected"
    ? profile.pathways.find(pathway => pathway.id === programRoute.pathwayId)
    : (programRoute?.status === "clarification" || programRoute?.status === "district_arrest") ? undefined : selectedLabel
    ? profile.pathways.find((pathway) => pathway.label === selectedLabel)
    : undefined;
  const recordQuestions = new Map(caProp64RecordQuestions(profile, publicProfile.questions, selectedPathway?.id).map((question) => [question.id, question]));
  const stageOrder = new Map(publicProfile.flowStages.map((stage) => [stage.id, stage.order]));
  const pathwayRoutingOrder = publicProfile.flowStages.find((stage) => stage.id === "pathway_routing")?.order
    ?? stageOrder.get(publicProfile.questions.find((question) => question.id === "possible_pathway_context")?.stage ?? "")
    ?? Number.NEGATIVE_INFINITY;
  const seen = new Set<string>();

  return publicProfile.questions
    .filter(question => profile.jurisdiction.code !== "MS" || question.id !== "ms_program_final_disposition"
      || (["99-15-26", "99-15-101", "41-29-150"].includes(String(answers.ms_program_order))
        && ["completed_and_closed", "completed_without_closure"].includes(String(answers.ms_program_record_status))))
    .filter(question => msConditionalDischargeQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => kansasRecordScopeQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => georgiaFirstOffenderQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => illinoisCannabisQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => nevada176AQuestionApplies(profile.jurisdiction.code, selectedPathway?.id, question.id))
    .map((question, index) => ({ question: recordQuestions.get(question.id) ?? question, index }))
    .filter(({ question }) => (!lifecycle?.exactPacketFactIds.includes(question.id) || recordQuestions.has(question.id))
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
