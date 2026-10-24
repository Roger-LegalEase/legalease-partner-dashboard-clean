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
  fact("mt_deferred_offense_grade", "Does the court's deferred-sentence order identify this charge as a felony or a misdemeanor?", "¿La orden judicial de sentencia aplazada identifica este cargo como un delito grave o un delito menor?", [["felony", "Felony", "Delito grave"], ["misdemeanor", "Misdemeanor", "Delito menor"], unknown]),
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
  const posture = route as { filingRequired?: unknown; routeType?: unknown } | undefined;
  return profile.jurisdiction.code === "MT" && pathwayId === MT_DEFERRED_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "a415dd4d99328420d5b3c632c62da96ea554f371ce2f93cd00be7af5c6790395"
    && route?.legalAuthority?.decisionId === "LD-MT-01"
    && route.legalAuthority.ruleId === "MT-46-18-204-DEFERRED-COMPLETION-DISMISSAL-EVENT"
    && route.legalAuthority.stage === "post_completion"
    && route.legalAuthority.outcomeMode === "guidance_status"
    && route.legalAuthority.paymentAuthority === "closed"
    && posture?.filingRequired === false && posture.routeType === "automatic_guidance";
}

export function montanaDeferredFactApplies(profile: EngineProfile, pathwayId: string | null | undefined, answers: Record<string, unknown>, id: string): boolean {
  if (!MT_DEFERRED_FACT_IDS.includes(id)) return true;
  if (!isMontanaDeferredContract(profile, pathwayId)) return false;
  if (id === "mt_deferred_order_type") return true;
  if (answers.mt_deferred_order_type !== "deferred") return false;
  if (id === "mt_deferred_dismissal_order") return true;
  const recordStatus = ["mt_deferred_court_record_status", "mt_deferred_criss_record_status"].includes(id);
  if (answers.mt_deferred_dismissal_order === "yes") return recordStatus;
  if (answers.mt_deferred_dismissal_order !== "no" || recordStatus) return false;
  return id !== "mt_deferred_revocation_petition" || answers.mt_deferred_offense_grade === "felony";
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
    .filter(q => typeof answers[q.id] !== "string" || !Array.isArray(q.options) || !q.options.includes(answers[q.id] as string)
      || !["mt_deferred_court_record_status", "mt_deferred_criss_record_status"].includes(q.id) && answers[q.id] === "unknown").map(q => q.id);
  if (answers.mt_deferred_dismissal_order === "yes") {
    // A status lookup can explain how to check even when the participant has
    // not checked yet. Do not make already knowing the answer a prerequisite.
    const required = unresolved.filter(id => !["mt_deferred_court_record_status", "mt_deferred_criss_record_status"].includes(id));
    return required.length ? { context: "facts_unresolved" as const, ids: required }
      : { context: "existing_order_followup" as const, ids: ["mt_deferred_court_record_status", "mt_deferred_criss_record_status"] };
  }
  if (unresolved.length) return { context: "facts_unresolved" as const, ids: unresolved };
  // Explicit order facts can supply meaning when the generic outcome is absent
  // or unknown. A supplied malformed outcome is not a canonical saved answer
  // and must not bypass the consistency check below by coercion.
  if (answers.case_outcome !== undefined && answers.case_outcome !== null && typeof answers.case_outcome !== "string") {
    return { context: "facts_unresolved" as const, ids: ["case_outcome"] };
  }
  // The original offense_level describes the charge, not necessarily the final
  // deferred order after an amendment. Preserve it; do not require a rewrite
  // or infer the order's statutory limb from that historical answer.
  if (answers.mt_deferred_offense_grade === "felony" && answers.case_outcome === "Misdemeanor conviction"
    || answers.mt_deferred_offense_grade === "misdemeanor" && answers.case_outcome === "Felony conviction") {
    return { context: "facts_unresolved" as const, ids: ["case_outcome", "mt_deferred_offense_grade"] };
  }
  if (answers.mt_deferred_term_status === "still_running") return { context: "term_not_terminated" as const, ids: ["mt_deferred_term_status"] };
  if (answers.mt_deferred_conditions_status !== "yes" || answers.mt_deferred_financial_order_status === "balance_remaining") return { context: "conditions_need_review" as const, ids: ["mt_deferred_conditions_status", "mt_deferred_financial_order_status"] };
  if (answers.mt_deferred_offense_grade === "felony") return answers.mt_deferred_revocation_petition === "yes"
    ? { context: "mandatory_limb_unavailable" as const, ids: ["mt_deferred_revocation_petition"] }
    : { context: "felony_statutory_request_context" as const, ids: [] as string[] };
  return { context: "misdemeanor_discretionary_request_context" as const, ids: [] as string[] };
}


/** Replace the ambiguous historical paid-only question only once the actual
 * deferred order is supplied on this exact source contract. Before dismissal,
 * the distinct financial-order question remains required and unresolved money
 * facts hold. An existing dismissal order receives status-check guidance only. */
export function montanaDeferredLegacyFinancialApplies(profile: EngineProfile, pathwayId: string | null | undefined, answers: Record<string, unknown>, id: string): boolean {
  return id !== "financial_obligations" || !isMontanaDeferredContract(profile, pathwayId)
    || answers.mt_deferred_order_type !== "deferred";
}

export function isMontanaDeferredWithoutMmrtaForm(profile: EngineProfile, pathwayId: string): boolean {
  const plan = profile.packetGenerator.pathways.find(path => path.pathwayId === pathwayId);
  return isMontanaDeferredContract(profile, pathwayId) && plan?.mode === "automatic_relief_verification_and_guidance"
    && JSON.stringify(plan.sourceRuleRefs) === JSON.stringify(["section:389-399", "section:185-203", "section:204-228", "section:229-269", "section:400-421", "section:270-318", "section:362-367", "summary:400-421", "corpus-unit:13", "corpus-unit:16", "corpus-unit:17", "corpus-unit:79", "corpus-unit:91", "corpus-unit:111", "corpus-unit:183", "corpus-unit:191", "decision_tree:229-269"])
    && plan.formMappingStatus === "source_candidate_identified" && plan.formCandidates?.length === 1
    && plan.formCandidates[0].relativePath === "LegalEase Montana/form-a.docx"
    && plan.formCandidates[0].sha256 === "968f68c78ce0d421b3751244bfcbd01c309eb7cea26027845b5e5dc6dbdb003d";
}

export const MT_DEFERRED_COPY = {
  context_missing: ["Confirm whose record is being checked and whether the case is state or local before using the Montana deferred-sentence information.", "Confirme de quién son los antecedentes y si el caso es estatal o local antes de usar la información sobre sentencias aplazadas de Montana."],
  facts_unresolved: ["Check the requested facts in the actual deferred-sentence and dismissal orders. A generic completion or payment answer does not establish those facts.", "Confirme los hechos solicitados en las órdenes reales de sentencia aplazada y desestimación. Una respuesta general sobre cumplimiento o pago no establece esos hechos."],
  outside_deferred_mechanism: ["This information concerns a deferred imposition of sentence. A suspended or other sentence does not establish that mechanism. Check the sentencing order before choosing the next step.", "Esta información se refiere a una imposición de sentencia aplazada. Una sentencia suspendida u otra sentencia no establece ese mecanismo. Consulte la orden de sentencia antes de elegir el siguiente paso."],
  term_not_terminated: ["The recorded deferral period has not ended. This post-completion dismissal information does not decide whether early termination is available.", "El período de aplazamiento registrado no ha terminado. Esta información sobre desestimación después del cumplimiento no determina si está disponible la terminación anticipada."],
  conditions_need_review: ["The answers identify an unfinished condition or an amount still due under the current orders. Check those orders and the court record. An unpaid amount is not treated as paid or waived.", "Las respuestas indican una condición sin cumplir o un monto aún adeudado conforme a las órdenes vigentes. Consulte esas órdenes y el expediente judicial. Un monto impago no se trata como pagado ni eximido."],
  mandatory_limb_unavailable: ["A revocation petition was reported for this felony deferred sentence. The no-revocation condition for mandatory dismissal under section 46-18-204(1)(a) is not established. Obtain advice about the actual case posture; this result does not decide other relief.", "Se informó de una petición de revocación para esta sentencia aplazada por delito grave. No se establece la condición de ausencia de revocación para la desestimación obligatoria conforme a la sección 46-18-204(1)(a). Obtenga asesoramiento sobre la situación real del caso; este resultado no determina otros recursos."],
  felony_statutory_request_context: ["Section 46-18-204(1)(a) directs dismissal after a felony deferral terminates when no revocation petition was filed. Confirm the actual dismissal order with the sentencing court. These answers do not create an order or establish that court or DOJ records were updated. No filing packet opens here.", "La sección 46-18-204(1)(a) dispone la desestimación después de terminar un aplazamiento por delito grave si no se presentó una petición de revocación. Confirme la orden real de desestimación con el tribunal que dictó la sentencia. Estas respuestas no crean una orden ni establecen que se actualizaron los expedientes judiciales o del Departamento de Justicia. Aquí no se ofrece un paquete para presentar al tribunal."],
  misdemeanor_discretionary_request_context: ["Dismissal after a misdemeanor deferred sentence is discretionary under section 46-18-204(1)(b). Ask the sentencing court clerk about its request process and any existing dismissal order. These answers do not establish that the court granted relief. No filing packet opens here.", "La desestimación después de una sentencia aplazada por delito menor es discrecional conforme a la sección 46-18-204(1)(b). Pregunte a la secretaría del tribunal que dictó la sentencia sobre el trámite de solicitud y cualquier orden de desestimación existente. Estas respuestas no establecen que el tribunal haya concedido una medida de alivio legal. Aquí no se ofrece un paquete para presentar al tribunal."],
  existing_order_followup: ["Check the reported dismissal order with the sentencing court and check the separate DOJ CRISS record. Section 46-18-204(2) requires sending a copy of the dismissal order to the prosecutor and DOJ with DOJ's identifying-information form. Court confidentiality and a DOJ update are separate facts; dismissal does not mean records were destroyed. No new dismissal filing is assumed here.", "Confirme la orden de desestimación informada con el tribunal que dictó la sentencia y consulte por separado los antecedentes de CRISS del Departamento de Justicia. La sección 46-18-204(2) requiere enviar una copia de la orden de desestimación a la fiscalía y al Departamento de Justicia con su formulario de información de identificación. La confidencialidad judicial y la actualización del Departamento de Justicia son hechos distintos; la desestimación no significa que se destruyeron los expedientes. Aquí no se supone que deba presentarse una nueva solicitud de desestimación."]
} satisfies Record<string, [string, string]>;
