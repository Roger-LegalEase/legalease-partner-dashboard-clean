import { wy1502QuestionApplies } from "@/lib/rcap-engine/wyoming-1502-facts";
import { southDakotaSisQuestionApplies } from "@/lib/rcap-engine/south-dakota-sis-facts";
import { illinoisProstitutionQuestionApplies } from "@/lib/rcap-engine/illinois-prostitution-facts";
import { ctPetitionContext, ctPetitionQuestionApplies, ctPetitionDateQuestion } from "@/lib/rcap-engine/connecticut-clean-slate-petition-facts";
import { georgiaSb288QuestionApplies } from "@/lib/rcap-engine/georgia-sb288-facts";
import { mdPoliceQuestionApplies } from "@/lib/rcap-engine/maryland-police-record-facts";
import { ny16057QuestionApplies } from "@/lib/rcap-engine/ny-16057-guidance";
import { nyMrtaDecision, nyMrtaQuestionApplies, NY_MRTA_ROUTE } from "@/lib/rcap-engine/ny-mrta-stage-facts";
import { virginiaVictimQuestionApplies } from "@/lib/rcap-engine/virginia-victim-question";
import {wy1501Context,wy1501FactIds,wy1501QuestionApplies} from "@/lib/rcap-engine/wyoming-1501-facts";
import { texasGuidanceFinancialApplies, texasNondisclosureFactIds, TX_ND_FACT_IDS, TX_ND_ROUTES } from "@/lib/rcap-engine/texas-nondisclosure-facts";
import { westVirginiaGuidanceFinancialApplies } from "@/lib/rcap-engine/west-virginia-guidance-financial";
import { southDakotaGuidanceFinancialApplies } from "@/lib/rcap-engine/south-dakota-guidance-financial";
import { southCarolinaGuidanceFinancialApplies } from "@/lib/rcap-engine/south-carolina-guidance-financial";
import { newJerseyMarijuanaStatusFinancialApplies } from "@/lib/rcap-engine/new-jersey-marijuana-status-financial";
import { oklahomaCleanSlateFinancialApplies } from "@/lib/rcap-engine/oklahoma-clean-slate-financial";
import { wy1401Context, wy1401QuestionApplies, WY_1401_NEW_IDS, WY_1401_QUESTIONS } from "@/lib/rcap-engine/wyoming-1401-facts";
import { newMexicoGuidanceFinancialApplies } from "@/lib/rcap-engine/new-mexico-guidance-financial";
import { MT_RECORD_FINANCIAL_ROUTES, montanaRecordFinancialApplies } from "@/lib/rcap-engine/montana-record-correction-financial";
import { ca12034QuestionApplies } from "@/lib/rcap-engine/california-1203-4-facts";
import { ND_FIRST_OFFENSE_FACT_IDS, ndFirstOffenseFactApplies } from "@/lib/rcap-engine/north-dakota-first-offense-facts";
import { oregonDispositionQuestionApplies, oregonDispositionLegacyQuestionApplies } from "@/lib/rcap-engine/oregon-disposition-identity";
import { montanaDeferredFactApplies, montanaDeferredLegacyFinancialApplies } from "@/lib/rcap-engine/montana-deferred-facts";
import { missouriMarijuanaFactApplies, missouriMarijuanaStatusQuestionApplies } from "@/lib/rcap-engine/missouri-marijuana-status-facts";
import { missouriClosedRecordQuestionApplies } from "@/lib/rcap-engine/missouri-closed-record-facts";
import { maineNonconvictionQuestionApplies, ME_NONCONVICTION_ROUTE } from "@/lib/rcap-engine/maine-nonconviction-facts";
import { louisianaAutomationStatusQuestionApplies } from "@/lib/rcap-engine/louisiana-automation-status";
import { nebraskaNonconvictionQuestionApplies } from "@/lib/rcap-engine/nebraska-nonconviction-facts";
import { AR_RECORD_ORIGIN_ID, arkansasRecordOriginApplies } from "@/lib/rcap-engine/arkansas-record-origin";
import { georgiaPardonQuestionApplies } from "@/lib/rcap-engine/georgia-pardon-facts";
import { convictionReliefRequest, convictionReliefQuestionApplies, convictionOutcomeCompatible } from "@/lib/rcap-engine/conviction-relief-request";
import { ny16055Decision, ny16055QuestionApplies, NY_16055_ROUTE } from "@/lib/rcap-engine/ny-16055-guidance";
import { pathwayFromContext } from "@/lib/rcap-engine/pathway-context";
import { MS_EXACT_TIMING_FACT_IDS, msExactTimingQuestionIds } from "@/lib/rcap-engine/mississippi-exact-timing";
import { caProp64Pathway, caProp64Section, caProp64QuestionApplies, caProp64ApplicationRequested } from "@/lib/rcap-engine/california-prop64-facts";
import { ny16059QuestionApplies, ny16059Requested, NY_16059_ROUTE, NY_16059_FACT_IDS, NY_16059_LEGACY_IDS, NY_16059_TIMING_IDS } from "@/lib/rcap-engine/new-york-16059-facts";
import { deConvictionQuestionApplies, delawareConvictionRoute } from "@/lib/rcap-engine/delaware-conviction-rules";
import { msProgramCompletionQuestionApplies } from "@/lib/rcap-engine/mississippi-program-completion";
import { msConditionalDischargeQuestionApplies } from "@/lib/rcap-engine/mississippi-conditional-discharge";
import { kansasRecordScopeFromAnswers, kansasRecordScopeQuestionApplies } from "@/lib/rcap-engine/kansas-record-scope";
import { caProp64RecordQuestions } from "@/lib/expungement-ai/ca-prop64-record-facts";
import { mississippiProgramRouteFromAnswers } from "@/lib/rcap-engine/composed-route-selector";
import { nevada176AQuestionApplies } from "@/lib/rcap-engine/nevada-176a-branch";
import { georgiaFirstOffenderFromAnswers, georgiaFirstOffenderQuestionApplies } from "@/lib/rcap-engine/georgia-first-offender";
import { illinoisCannabisFromAnswers, illinoisCannabisQuestionApplies } from "@/lib/rcap-engine/illinois-cannabis-facts";
import { isIndependentPaidFinancialFact } from "@/lib/expungement-ai/court-completion-fact-meaning";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import { pathwayExcludedByKnownFacts } from "@/lib/rcap-engine/factual-pathway-exclusions";
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
  const deRoute = profile.jurisdiction.code === "DE" ? delawareConvictionRoute(answers) : undefined;
  const caRoute = profile.jurisdiction.code === "CA" ? caProp64Pathway(answers) : undefined;
  const reliefRequest = convictionReliefRequest(profile, answers);
  const nyMrta = nyMrtaDecision(profile, answers);
  const nyPartialSeal = nyMrta ? null : ny16055Decision(profile, answers);
  const selectedPathway = reliefRequest.status === "selected" ? profile.pathways.find(p => p.id === reliefRequest.pathwayId) : reliefRequest.status !== "not_applicable" ? undefined : caRoute ? profile.pathways.find(p => p.id === caRoute) : profile.jurisdiction.code === "NY" && ny16059Requested(answers) ? profile.pathways.find(p => p.id === NY_16059_ROUTE) : nyMrta?.status === "guidance" ? profile.pathways.find(p => p.id === NY_MRTA_ROUTE) : nyPartialSeal?.status === "guidance" ? profile.pathways.find(p => p.id === NY_16055_ROUTE) : deRoute ? profile.pathways.find(pathway => pathway.id === deRoute) : programRoute?.status === "selected"
    ? profile.pathways.find(pathway => pathway.id === programRoute.pathwayId)
    : (programRoute?.status === "clarification" || programRoute?.status === "district_arrest" || programRoute?.status === "district_review" || profile.jurisdiction.code === "CA" && caProp64ApplicationRequested(answers)) ? undefined : selectedLabel
    ? ["MS", "GA"].includes(profile.jurisdiction.code) ? pathwayFromContext(profile, selectedLabel) : profile.pathways.find((pathway) => pathway.label === selectedLabel
      && !pathwayExcludedByKnownFacts(profile.jurisdiction.code, answers, pathway.id) && convictionOutcomeCompatible(profile.jurisdiction.code, answers, pathway.id))
    : undefined;
  // An optional route hint is not required to recognize an adult acquittal's
  // irrelevant payment question. This scopes collection only, never a route.
  const maineFinancialQuestionPathway = selectedPathway?.id
    ?? (profile.jurisdiction.code === "ME" && !selectedLabel
      && !maineNonconvictionQuestionApplies("ME", ME_NONCONVICTION_ROUTE, answers, "financial_obligations")
      ? ME_NONCONVICTION_ROUTE : undefined);
  // The existing evaluator can select CRISS from a known nonconviction without
  // an optional hint. Match only that question applicability; never infer a
  // route from a malformed/contradictory supplied context or a money answer.
  const mtFinancialQuestionPathway = selectedPathway?.id
    ?? ((answers.possible_pathway_context === undefined || answers.possible_pathway_context === null
      || answers.possible_pathway_context === "")
      && !montanaRecordFinancialApplies(profile, MT_RECORD_FINANCIAL_ROUTES[1], answers, "financial_obligations")
      ? MT_RECORD_FINANCIAL_ROUTES[1] : undefined);
  const wy1501Ids=new Set(wy1501Context(profile,selectedPathway?.id,answers)?wy1501FactIds(answers):[]);
  // The automatic informational route does not need exact dates to show guidance.
  // Its optional clock remains available in the protected post-claim editor.
  const txTimingIds = new Set(selectedPathway?.id === TX_ND_ROUTES[0]
    ? [] : texasNondisclosureFactIds(profile, selectedPathway?.id, answers));
  const msTimingIds = new Set(msExactTimingQuestionIds(profile.jurisdiction.code, selectedPathway?.id, answers));
  const recordQuestions = new Map(caProp64RecordQuestions(profile, publicProfile.questions, selectedPathway?.id).map((question) => [question.id, question]));
  const stageOrder = new Map(publicProfile.flowStages.map((stage) => [stage.id, stage.order]));
  const pathwayRoutingOrder = publicProfile.flowStages.find((stage) => stage.id === "pathway_routing")?.order
    ?? stageOrder.get(publicProfile.questions.find((question) => question.id === "possible_pathway_context")?.stage ?? "")
    ?? Number.NEGATIVE_INFINITY;
  const seen = new Set<string>();
  // Reuse absent or compatible completion aliases. A supplied unresolved or
  // negative answer must remain reachable when the result asks for correction.
  const completionCorrections = new Set(publicProfile.questions.filter(question => {
    // Some compiled profiles expose these status controls after payment without
    // listing them in completionAliasIds. Their supplied uncertainty still
    // participates in the screening evaluator's court-completion decision.
    const completionStatus = ["financial_obligations", "sentence_completion_date"].includes(question.id)
      && question.type === "yes_no_unsure";
    if (!lifecycle?.completionAliasIds.includes(question.id) && !completionStatus) return false;
    const value = answers[question.id];
    if (value === undefined || value === null || value === "") return false;
    return questionAnswerState(question, value) !== "known_valid"
      || value === false || typeof value === "string" && value.trim().toLowerCase() === "no";
  }).map(question => question.id));

  return publicProfile.questions
    .map(question => ctPetitionDateQuestion(question, ctPetitionContext(profile, selectedPathway?.id)))
    .filter(question => mdPoliceQuestionApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => ny16057QuestionApplies(profile, answers, question.id))
    .filter(question => ny16055QuestionApplies(profile, answers, question.id))
    .filter(question => nyMrtaQuestionApplies(profile, answers, question.id))
    .filter(question => virginiaVictimQuestionApplies(profile, selectedPathway?.id, question.id))
    .filter(question => montanaRecordFinancialApplies(profile, mtFinancialQuestionPathway, answers, question.id))
    .filter(question => newMexicoGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => newJerseyMarijuanaStatusFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => !TX_ND_FACT_IDS.includes(question.id) || txTimingIds.has(question.id))
    .filter(question => texasGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => westVirginiaGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => southDakotaGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => southCarolinaGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => oklahomaCleanSlateFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => wy1501QuestionApplies(profile,selectedPathway?.id,answers,question.id))
    .filter(question => wy1401QuestionApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => !wy1401Context(profile,selectedPathway?.id,answers) || !["arrest_date","disposition_date"].includes(question.id))
    .filter(question => ca12034QuestionApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => ndFirstOffenseFactApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => oregonDispositionQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => oregonDispositionLegacyQuestionApplies(profile, answers, question.id))
    .filter(question => montanaDeferredFactApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => montanaDeferredLegacyFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => missouriMarijuanaFactApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => missouriMarijuanaStatusQuestionApplies(profile.jurisdiction.code, selectedPathway?.id, answers, question.id, profile))
    .filter(question => missouriClosedRecordQuestionApplies(profile.jurisdiction.code, selectedPathway?.id, answers, question.id, profile))
    .filter(question => maineNonconvictionQuestionApplies(profile.jurisdiction.code, maineFinancialQuestionPathway, answers, question.id))
    .filter(question => nebraskaNonconvictionQuestionApplies(profile.jurisdiction.code, selectedPathway?.id, answers, question.id))
    .filter(question => louisianaAutomationStatusQuestionApplies(profile.jurisdiction.code, selectedPathway?.id, question.id))
    .filter(question => question.id !== AR_RECORD_ORIGIN_ID || arkansasRecordOriginApplies(profile.jurisdiction.code, selectedPathway?.id))
    .filter(question => convictionReliefQuestionApplies(profile, answers, question.id))
    .filter(question => profile.jurisdiction.code !== "MS" || !MS_EXACT_TIMING_FACT_IDS.some(id => id === question.id) || msTimingIds.has(question.id))
    .filter(question => profile.jurisdiction.code !== "CA" || caProp64QuestionApplies(answers, question.id))
    .filter(question => profile.jurisdiction.code !== "NY" || ny16059QuestionApplies(answers, question.id))
    .filter(question => profile.jurisdiction.code !== "NY" || !NY_16059_LEGACY_IDS.includes(question.id))
    .filter(question => profile.jurisdiction.code !== "NY" || !NY_16059_FACT_IDS.includes(question.id) || question.id === "ny_16059_request" || selectedPathway?.id === NY_16059_ROUTE)
    .filter(question => profile.jurisdiction.code !== "NY" || question.id !== "ny_16059_incarceration_periods" || answers.ny_16059_incarceration_history === "released")
    .filter(question => profile.jurisdiction.code !== "NY" || question.id !== "release_date" || answers.ny_16059_sentence_incarceration === "Yes")
    .filter(question => profile.jurisdiction.code !== "MS" || question.id !== "ms_program_record_status"
      || ["99-15-26", "99-15-101", "41-29-150"].includes(String(answers.ms_program_order)))
    .filter(question => profile.jurisdiction.code !== "MS" || question.id !== "ms_program_final_disposition"
      || (["99-15-26", "99-15-101", "41-29-150"].includes(String(answers.ms_program_order))
        && ["completed_and_closed", "completed_without_closure"].includes(String(answers.ms_program_record_status))))
    .filter(question => deConvictionQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => msProgramCompletionQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => msConditionalDischargeQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => kansasRecordScopeQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => wy1502QuestionApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => southDakotaSisQuestionApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => illinoisProstitutionQuestionApplies(profile, selectedPathway?.id, question.id))
    .filter(question => ctPetitionQuestionApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => georgiaSb288QuestionApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => georgiaPardonQuestionApplies(profile.jurisdiction.code, answers, question.id, selectedPathway?.id))
    .filter(question => georgiaFirstOffenderQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => illinoisCannabisQuestionApplies(profile.jurisdiction.code, answers, question.id))
    .filter(question => nevada176AQuestionApplies(profile.jurisdiction.code, selectedPathway?.id, question.id))
    .map((question, index) => ({ question: wy1401Context(profile,selectedPathway?.id,answers) ? WY_1401_QUESTIONS.find(q=>WY_1401_NEW_IDS.includes(q.id)&&q.id===question.id) ?? recordQuestions.get(question.id) ?? question : recordQuestions.get(question.id) ?? question, index }))
    .filter(({ question }) => (!lifecycle?.exactPacketFactIds.includes(question.id) || wy1401Context(profile,selectedPathway?.id,answers) && WY_1401_NEW_IDS.includes(question.id) || profile.jurisdiction.code === "ND" && ND_FIRST_OFFENSE_FACT_IDS.includes(question.id) || msTimingIds.has(question.id) || completionCorrections.has(question.id) || recordQuestions.has(question.id) || profile.jurisdiction.code === "NY" && selectedPathway?.id === NY_16059_ROUTE && NY_16059_TIMING_IDS.includes(question.id))
      && (!lifecycle?.completionAliasIds.includes(question.id)
        || completionCorrections.has(question.id)
        || (selectedPathway ? [selectedPathway] : profile.pathways).some(pathway =>
          isIndependentPaidFinancialFact(`${profile.jurisdiction.code}:${pathway.id}`, profile.questions.find(q => q.id === question.id)))))
    .filter(({ question }) => completionCorrections.has(question.id) || (question.lifecyclePhase?.startsWith("prepay_")
      ?? !["record_readiness", "case_details", "packet_information"].includes(question.stage)))
    .filter(({ question }) => lifecycle || (stageOrder.get(question.stage) ?? Number.MAX_SAFE_INTEGER) <= pathwayRoutingOrder)
    .filter(({ question }) => {
      const consumers = lifecycle?.routeConsumers[question.id] ?? [];
      if (msTimingIds.has(question.id) || txTimingIds.has(question.id) || wy1501Ids.has(question.id)) return true;
      if (profile.jurisdiction.code === "NY" && selectedPathway?.id === NY_16059_ROUTE && NY_16059_TIMING_IDS.includes(question.id)) return true;
      if (profile.jurisdiction.code === "CA" && question.id === "ca_prop64_branch"
        && ["11357", "11358", "11359", "11360", "11362.1"].includes(caProp64Section(answers) ?? "")
        && caProp64ApplicationRequested(answers)) return true;
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
