import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";

export const MT_DEFERRED_ROUTE = "deferred-sentence-dismissal-or-confidentiality-route";
export const MT_DEFERRED_SOURCE = "LD-MT-01;MT.memo:mt_deferred_dismissal;MCA46-18-204";

type Choice = [string, string, string];
function fact(id: string, prompt: string, es: string, choices: Choice[]): PublicQuestion {
  return { id, stage: "pathway_routing", type: "single_choice", required: false,
    contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter",
    prompt, helperText: "Use this case's actual court orders and records. Keep an unknown answer if the record does not establish the fact. These answers do not establish that the court dismissed the case or that DOJ updated its record.",
    options: choices.map(([value]) => value),
    optionDisplay: Object.fromEntries(choices.map(([value, label, translated]) => [value, { label, translations: { es: { label: translated } } }])),
    translations: { es: { prompt: es, helperText: "Use las órdenes judiciales y los expedientes reales de este caso. Mantenga una respuesta desconocida si el expediente no establece el hecho. Estas respuestas no establecen que el tribunal haya desestimado el caso ni que el Departamento de Justicia haya actualizado sus antecedentes." } } };
}
const unknown: Choice = ["unknown", "I am not sure", "No estoy seguro"];
const yesNo: Choice[] = [["yes", "Yes", "Sí"], ["no", "No", "No"], unknown];

// These questions implement the adopted factual inputs. They are not a
// participant eligibility certification, route activation or packet authority.
export const MT_DEFERRED_QUESTIONS = [
  fact("mt_deferred_order_type", "Does the sentencing order say that imposition of the sentence was deferred, suspended, or something else?", "¿La orden de sentencia indica que se aplazó la imposición de la sentencia, que se suspendió la sentencia o algo diferente?", [
    ["deferred", "Deferred imposition of sentence", "Imposición de la sentencia aplazada"], ["suspended", "Suspended sentence", "Sentencia suspendida"], ["other", "Another type of sentence", "Otro tipo de sentencia"], unknown]),
  fact("mt_deferred_offense_grade", "Was this deferred-sentence charge a felony or a misdemeanor?", "¿El cargo con sentencia aplazada era un delito grave o un delito menor?", [["felony", "Felony", "Delito grave"], ["misdemeanor", "Misdemeanor", "Delito menor"], unknown]),
  fact("mt_deferred_term_status", "Has the deferral period ended, or did the court order the remaining time terminated early?", "¿Terminó el período de aplazamiento o el tribunal ordenó terminar antes el tiempo restante?", [
    ["expired", "The full deferral period ended", "Terminó todo el período de aplazamiento"], ["terminated_by_order", "The court ordered the remaining time terminated", "El tribunal ordenó terminar el tiempo restante"], ["still_running", "The period is still running and no early-termination order was entered", "El período continúa y no se ha dictado una orden de terminación anticipada"], unknown]),
  fact("mt_deferred_conditions_status", "Have you completed all the conditions in the court's current orders for this deferred sentence?", "¿Ha cumplido todas las condiciones de las órdenes judiciales vigentes para esta sentencia aplazada?", yesNo),
  fact("mt_deferred_financial_order_status", "What do this case's records show about fines, fees and restitution under the court's current orders?", "¿Qué indican los expedientes de este caso sobre las multas, los cargos y la restitución conforme a las órdenes judiciales vigentes?", [
    ["paid", "All amounts ordered were paid", "Se pagaron todos los montos ordenados"],
    ["waived_by_order", "A written court order waived the remaining amounts", "Una orden judicial escrita eximió los montos restantes"],
    ["none_ordered", "No such amounts were ordered", "No se ordenaron esos montos"],
    ["balance_remaining", "An amount remains due under the current orders", "Aún se debe un monto conforme a las órdenes vigentes"], unknown]),
  fact("mt_deferred_revocation_petition", "Was a petition to revoke this deferred sentence ever filed?", "¿Se presentó alguna vez una petición para revocar esta sentencia aplazada?", yesNo),
  fact("mt_deferred_dismissal_order", "Has the court entered an order dismissing this case after the deferred sentence?", "¿El tribunal ha dictado una orden que desestima este caso después de la sentencia aplazada?", yesNo),
  fact("mt_deferred_court_record_status", "What did the sentencing court confirm about the current court record?", "¿Qué confirmó el tribunal que dictó la sentencia sobre el expediente judicial actual?", [
    ["confidential", "The court confirmed the record is confidential", "El tribunal confirmó que el expediente es confidencial"], ["public", "The court record remains publicly accessible", "El expediente judicial sigue siendo de acceso público"], ["not_checked", "I have not checked with the court", "No he consultado con el tribunal"], unknown]),
  fact("mt_deferred_criss_record_status", "What did your Montana DOJ CRISS record check show after the dismissal order?", "¿Qué mostró su consulta de antecedentes de CRISS del Departamento de Justicia de Montana después de la orden de desestimación?", [
    ["updated", "DOJ confirmed the record was updated for the dismissal", "El Departamento de Justicia confirmó que se actualizó el antecedente por la desestimación"], ["not_updated", "The record has not been updated for the dismissal", "No se ha actualizado el antecedente por la desestimación"], ["not_checked", "I have not checked", "No he consultado"], unknown])
] satisfies PublicQuestion[];
export const MT_DEFERRED_FACT_IDS = MT_DEFERRED_QUESTIONS.map(question => question.id);

export function isMontanaDeferredContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  const route = profile.pathways.find(path => path.id === pathwayId);
  return profile.jurisdiction.code === "MT" && pathwayId === MT_DEFERRED_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "a415dd4d99328420d5b3c632c62da96ea554f371ce2f93cd00be7af5c6790395"
    && route?.legalAuthority?.decisionId === "LD-MT-01"
    && route.legalAuthority.ruleId === "MT-46-18-204-DEFERRED-COMPLETION-DISMISSAL-EVENT"
    && route.legalAuthority.stage === "post_completion"
    && route.legalAuthority.outcomeMode === "guidance_status"
    && route.legalAuthority.paymentAuthority === "closed";
}

export function montanaDeferredFactApplies(profile: EngineProfile, pathwayId: string | null | undefined, answers: Record<string, unknown>, id: string): boolean {
  if (!MT_DEFERRED_FACT_IDS.includes(id)) return true;
  if (!isMontanaDeferredContract(profile, pathwayId)) return false;
  if (id === "mt_deferred_order_type") return true;
  if (answers.mt_deferred_order_type !== "deferred") return false;
  return !["mt_deferred_court_record_status", "mt_deferred_criss_record_status"].includes(id)
    || answers.mt_deferred_dismissal_order === "yes";
}

/** This is a source-fact classification, not an eligibility evaluator. No
 * return value grants a court remedy, confidentiality, form or payment. The
 * caller must retain ownership, jurisdiction, original facts and source guards.
 * A historic finance Yes/No or generic completion answer never fills a new fact.
 * Financial obligations remain relevant; there is no route-wide exemption. */
export function montanaDeferredFacts(profile: EngineProfile, pathwayId: string | null | undefined, answers: Record<string, unknown>) {
  if (!isMontanaDeferredContract(profile, pathwayId)) return { context: "not_applicable" as const, ids: [] as string[] };
  const order = answers.mt_deferred_order_type;
  if (order === "suspended" || order === "other") return { context: "outside_deferred_mechanism" as const, ids: ["mt_deferred_order_type"] };
  const unresolved = MT_DEFERRED_QUESTIONS.filter(q => montanaDeferredFactApplies(profile, pathwayId, answers, q.id))
    .filter(q => typeof answers[q.id] !== "string" || answers[q.id] === "unknown" || answers[q.id] === "not_checked"
      || !Array.isArray(q.options) || !q.options.includes(answers[q.id] as string)).map(q => q.id);
  if (unresolved.length) return { context: "facts_unresolved" as const, ids: unresolved };
  if (answers.mt_deferred_term_status === "still_running") return { context: "term_not_terminated" as const, ids: ["mt_deferred_term_status"] };
  if (answers.mt_deferred_conditions_status !== "yes" || answers.mt_deferred_financial_order_status === "balance_remaining") return { context: "conditions_need_review" as const, ids: ["mt_deferred_conditions_status", "mt_deferred_financial_order_status"] };
  if (answers.mt_deferred_dismissal_order === "yes") return { context: "existing_order_followup" as const, ids: ["mt_deferred_court_record_status", "mt_deferred_criss_record_status"] };
  if (answers.mt_deferred_offense_grade === "felony") return answers.mt_deferred_revocation_petition === "yes"
    ? { context: "mandatory_limb_unavailable" as const, ids: ["mt_deferred_revocation_petition"] }
    : { context: "felony_statutory_request_context" as const, ids: [] as string[] };
  return { context: "misdemeanor_discretionary_request_context" as const, ids: [] as string[] };
}
