import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";

export const MO_MARIJUANA_STATUS_ROUTE = "marijuana-expungement-under-missouri-constitution-article-xiv";
export const MO_MARIJUANA_CUSTODY_FACT = "mo_marijuana_custody_posture";
export const MO_MARIJUANA_STATUS_SOURCE = "LD-MO-03;MO.memo:mo-art-xiv-marijuana;Mo.Const.art.XIV,2(7)-(8)";

// Factual copy derived from the adopted custodyPosture input. Spanish remains
// engineering copy pending qualified review; no legal conclusion is requested.
export const MO_MARIJUANA_STATUS_QUESTIONS: PublicQuestion[] = [{
  id: MO_MARIJUANA_CUSTODY_FACT, stage: "pathway_routing", type: "single_choice",
  required: false, contextOnly: false, doesNotSelectPathway: true,
  lifecyclePhase: "prepay_route_splitter",
  prompt: "For this marijuana case, are you currently incarcerated, on probation or parole, or finished with incarceration and supervision?",
  helperText: "Use your current status for this case. A general answer about finishing court requirements does not answer this question. This answer does not establish eligibility or that the record was expunged.",
  options: ["incarcerated", "probation_or_parole", "incarceration_and_supervision_complete", "unknown"],
  optionDisplay: {
    incarcerated: { label: "Currently in prison, jail or a halfway house for this case", translations: { es: { label: "Actualmente en prisión, cárcel o una casa de transición por este caso" } } },
    probation_or_parole: { label: "Currently on probation or parole for this case", translations: { es: { label: "Actualmente en libertad condicional bajo probation o parole por este caso" } } },
    incarceration_and_supervision_complete: { label: "Incarceration and any probation or parole are complete", translations: { es: { label: "Terminó el encarcelamiento y cualquier período de probation o parole" } } },
    unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
  },
  translations: { es: {
    prompt: "Para este caso de marihuana, ¿está actualmente encarcelado, en probation o parole, o ya terminó el encarcelamiento y la supervisión?",
    helperText: "Use su situación actual en este caso. Una respuesta general sobre haber cumplido los requisitos judiciales no responde esta pregunta. Esta respuesta no establece que reúna los requisitos ni que se hayan eliminado los antecedentes."
  } }
}];

/** Only the retained automatic status contract. A petition or changed source
 * cannot inherit this question-relevance exception. No form/route is selected. */
export function isMissouriMarijuanaStatusContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  const route = profile.pathways.find(path => path.id === pathwayId);
  const posture = route as { filingRequired?: unknown; routeType?: unknown } | undefined;
  const plan = profile.packetGenerator.pathways.find(path => path.pathwayId === pathwayId);
  return profile.jurisdiction.code === "MO" && pathwayId === MO_MARIJUANA_STATUS_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "ddb1a8ea6c0d878f5a81d59e2a7e32cd7927436e9fb6fee8e8e8629ba7c62304"
    && route?.legalAuthority?.decisionId === "LD-MO-03"
    && route.legalAuthority.ruleId === "MO-CONST-ART-XIV-AUTOMATIC-VS-INCARCERATED-PETITION"
    && route.legalAuthority.stage === "automatic"
    && route.legalAuthority.outcomeMode === "automatic_relief"
    && route.legalAuthority.paymentAuthority === "closed"
    && posture?.filingRequired === false && posture.routeType === "automatic"
    && plan?.mode === "automatic_relief_verification_and_guidance"
    && plan.formMappingStatus === "custom_or_manual_mapping_required"
    && plan.formCandidates?.length === 0
    && JSON.stringify(plan.sourceRuleRefs) === JSON.stringify(["section:178-189", "corpus-unit:68"]);
}

/** A custody distinction, not a marijuana-eligibility evaluator. Exact offense,
 * amount, conduct exclusions and actual record status must still be collected.
 * The adopted attorney handoff for incarceration OR supervision remains ahead
 * of any packet. Generic completion, a route label and historical prose never
 * supply a current factual custody answer. No input map is modified. */
export function missouriMarijuanaCustodyContext(
  profile: EngineProfile, pathwayId: string | null | undefined, answers: Record<string, unknown>
): "not_applicable" | "unknown" | "incarcerated_attorney_handoff" | "supervision_attorney_handoff" | "completed_status_check" {
  if (!isMissouriMarijuanaStatusContract(profile, pathwayId)) return "not_applicable";
  switch (answers[MO_MARIJUANA_CUSTODY_FACT]) {
    case "incarcerated": return "incarcerated_attorney_handoff";
    case "probation_or_parole": return "supervision_attorney_handoff";
    case "incarceration_and_supervision_complete": return "completed_status_check";
    default: return "unknown";
  }
}

/** §2(7)(b) and (8) have no financial-satisfaction predicate. Restrict this to
 * explicitly supplied nonincarcerated custody facts on the exact status route.
 * Incarcerated petitions and unknown custody retain their separate resolution. */
export function missouriMarijuanaStatusQuestionApplies(
  jurisdiction: string, pathwayId: string | null | undefined,
  answers: Record<string, unknown>, questionId: string, profile?: EngineProfile
): boolean {
  if (jurisdiction !== "MO" || questionId !== "financial_obligations" || !profile) return true;
  const context = missouriMarijuanaCustodyContext(profile, pathwayId, answers);
  return context !== "completed_status_check" && context !== "supervision_attorney_handoff";
}
