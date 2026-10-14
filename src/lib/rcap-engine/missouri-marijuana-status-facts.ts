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

type Choice = [string, string, string];
const yesNo: Choice[] = [["yes", "Yes", "Sí"], ["no", "No", "No"], ["unknown", "I am not sure", "No estoy seguro"]];
function recordQuestion(id: string, prompt: string, es: string, choices: Choice[] | null, type = "single_choice"): PublicQuestion {
  return { id, stage: "pathway_routing", type, required: false, contextOnly: false,
    doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter", prompt,
    helperText: "Use this case's court record. Keep an unknown answer if the record does not establish the fact. This answer does not establish eligibility or that relief occurred.",
    options: choices?.map(([value]) => value) ?? null,
    ...(choices ? { optionDisplay: Object.fromEntries(choices.map(([value, label, translated]) => [value, { label, translations: { es: { label: translated } } }])) } : {}),
    translations: { es: { prompt: es, helperText: "Use el expediente judicial de este caso. Mantenga una respuesta desconocida si el expediente no establece el hecho. Esta respuesta no establece que reúna los requisitos ni que se haya concedido una medida de alivio legal." } } };
}
MO_MARIJUANA_STATUS_QUESTIONS.push(
  recordQuestion("mo_marijuana_record_is_marijuana", "Does the final court record identify this as a marijuana-related offense?", "¿El documento judicial final identifica este delito como relacionado con marihuana?", yesNo),
  recordQuestion("mo_marijuana_record_offense", "What exact marijuana offense and statute are listed in this case's final court record?", "¿Qué delito exacto de marihuana y qué ley figuran en el documento judicial final de este caso?", null, "text_or_unknown"),
  recordQuestion("mo_marijuana_offense_date", "On what date did the marijuana offense occur?", "¿En qué fecha ocurrió el delito de marihuana?", null, "date_or_unknown"),
  recordQuestion("mo_marijuana_record_grade", "What offense classification is listed in this case's final court record?", "¿Qué clasificación del delito figura en el documento judicial final de este caso?", [
    ["misdemeanor", "Misdemeanor", "Delito menor"], ["class_e", "Class E felony", "Delito grave de clase E"],
    ["class_d", "Class D felony", "Delito grave de clase D"], ["class_abc", "Class A, B or C felony", "Delito grave de clase A, B o C"],
    ["ordinance_or_other", "Ordinance violation or another classification", "Infracción de ordenanza u otra clasificación"], ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  recordQuestion("mo_marijuana_pounds", "How many pounds of marijuana does the court record say this Class D felony involved?", "¿Cuántas libras de marihuana indica el expediente judicial que involucró este delito grave de clase D?", null, "number_or_range"),
  recordQuestion("mo_marijuana_minor_distribution", "Did this offense involve distribution or delivery of marijuana to someone under 21?", "¿Este delito involucró distribución o entrega de marihuana a una persona menor de 21 años?", yesNo),
  recordQuestion("mo_marijuana_violence", "Did this offense involve violence?", "¿Este delito involucró violencia?", yesNo),
  recordQuestion("mo_marijuana_impaired_driving", "Did this offense involve operating a motor vehicle while under the influence of marijuana?", "¿Este delito involucró conducir un vehículo motorizado bajo la influencia de marihuana?", yesNo),
  recordQuestion("mo_marijuana_commercial_vehicle", "Was this offense committed while operating a commercial motor vehicle?", "¿Se cometió este delito mientras conducía un vehículo motorizado comercial?", yesNo),
  recordQuestion("mo_marijuana_record_status", "What did you find when you checked the court and Missouri State Highway Patrol records for this case?", "¿Qué encontró al consultar los expedientes del tribunal y de la Patrulla de Caminos de Missouri sobre este caso?", [
    ["order_found", "I found a court expungement order for this case", "Encontré una orden judicial de eliminación de antecedentes para este caso"],
    ["record_remains", "The case record remains and I did not find an expungement order", "El expediente del caso permanece y no encontré una orden de eliminación de antecedentes"],
    ["not_checked", "I have not checked both sources", "No he consultado ambas fuentes"], ["unknown", "I am not sure what the records show", "No estoy seguro de lo que muestran los expedientes"]
  ])
);
export const MO_MARIJUANA_FACT_IDS = MO_MARIJUANA_STATUS_QUESTIONS.map(question => question.id);

export function missouriMarijuanaFactApplies(profile: EngineProfile, pathwayId: string | null | undefined, answers: Record<string, unknown>, id: string): boolean {
  if (!MO_MARIJUANA_FACT_IDS.includes(id)) return true;
  if (!isMissouriMarijuanaStatusContract(profile, pathwayId)) return false;
  if (id === MO_MARIJUANA_CUSTODY_FACT) return true;
  if (answers[MO_MARIJUANA_CUSTODY_FACT] !== "incarceration_and_supervision_complete") return false;
  return id !== "mo_marijuana_pounds" || answers.mo_marijuana_record_grade === "class_d";
}

export const MO_MARIJUANA_COPY = {
  context_missing: ["Confirm whose record is being checked and whether the case is state or local. An unclear answer does not establish the Article XIV status-check context.", "Confirme de quién son los antecedentes que se consultan y si el caso es estatal o local. Una respuesta poco clara no establece el contexto para consultar el estado conforme al artículo XIV."],
  custody_missing: ["Check your current incarceration, probation or parole status for this case. A general completion answer does not establish that fact.", "Confirme su situación actual de encarcelamiento, probation o parole para este caso. Una respuesta general sobre el cumplimiento no establece ese hecho."],
  incarcerated_referral: ["This case involves current incarceration. Speak with a lawyer about the Article XIV petition for vacatur, release and expungement before any packet. This result does not establish petition eligibility or release.", "Este caso implica encarcelamiento actual. Consulte con un abogado sobre la petición del artículo XIV para anular la sentencia, obtener la liberación y eliminar los antecedentes antes de preparar un paquete. Este resultado no establece que reúna los requisitos para la petición ni que deba ser liberado."],
  supervision_referral: ["This case involves current probation or parole. Speak with a lawyer about the Article XIV supervision provisions before any packet. Do not assume supervision ended or records were expunged.", "Este caso implica probation o parole actual. Consulte con un abogado sobre las disposiciones de supervisión del artículo XIV antes de preparar un paquete. No suponga que terminó la supervisión ni que se eliminaron los antecedentes."],
  record_facts_missing: ["Check the requested facts in this case's court record. Unknown offense, quantity, exclusion or record-status details do not establish eligibility or completed expungement.", "Confirme los hechos solicitados en el expediente judicial de este caso. Los datos desconocidos sobre el delito, la cantidad, las exclusiones o el estado del expediente no establecen que reúna los requisitos ni que se hayan eliminado los antecedentes."],
  exclusion_review: ["The recorded conduct needs review under the Article XIV exclusions. This status check does not establish expungement eligibility or decide whether another remedy exists.", "La conducta registrada requiere revisión conforme a las exclusiones del artículo XIV. Esta consulta del estado no establece que reúna los requisitos para eliminar los antecedentes ni decide si existe otro recurso."],
  source_boundary_review: ["This offense classification, quantity or date needs a specific Article XIV review. The existing guidance does not resolve this record, and no eligibility or completed relief is inferred.", "La clasificación, cantidad o fecha de este delito requiere una revisión específica del artículo XIV. La orientación existente no resuelve este expediente y no se infiere que reúna los requisitos ni que se haya concedido una medida de alivio legal."],
  status_check: ["Use the court and Missouri State Highway Patrol records to check the Article XIV expungement status and any court certificate. These answers do not establish that expungement occurred or that a petition should be filed. No paid filing packet opens here.", "Use los expedientes del tribunal y de la Patrulla de Caminos de Missouri para consultar el estado de la eliminación de antecedentes conforme al artículo XIV y cualquier certificado judicial. Estas respuestas no establecen que se hayan eliminado los antecedentes ni que deba presentarse una petición. Aquí no se ofrece un paquete de pago para presentar al tribunal."]
} satisfies Record<string, [string, string]>;

function knownValue(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const wrapper = value as Record<string, unknown>;
    return wrapper.unknown === false && Object.keys(wrapper).every(key => ["value", "unknown"].includes(key)) ? wrapper.value : undefined;
  }
  return value;
}
export function missouriMarijuanaStatusDecision(profile: EngineProfile, pathwayId: string | null | undefined, answers: Record<string, unknown>) {
  const custody = missouriMarijuanaCustodyContext(profile, pathwayId, answers);
  if (custody === "not_applicable") return null;
  type Decision = { status: "missing" | "review" | "guidance"; code: keyof typeof MO_MARIJUANA_COPY; ids: string[] };
  const decision = (status: Decision["status"], code: Decision["code"], ids: string[] = []): Decision => ({ status, code, ids });
  if (custody === "unknown") return decision(answers[MO_MARIJUANA_CUSTODY_FACT] ? "review" : "missing", "custody_missing", [MO_MARIJUANA_CUSTODY_FACT]);
  if (custody === "incarcerated_attorney_handoff") return decision("review", "incarcerated_referral");
  if (custody === "supervision_attorney_handoff") return decision("review", "supervision_referral");
  const required = MO_MARIJUANA_FACT_IDS.filter(id => missouriMarijuanaFactApplies(profile, pathwayId, answers, id));
  const unresolved = required.filter(id => {
    const value = knownValue(answers[id]);
    if (typeof value !== "string" && typeof value !== "number") return true;
    if (value === "" || value === "unknown" || value === "not_checked") return true;
    const question = MO_MARIJUANA_STATUS_QUESTIONS.find(q => q.id === id)!;
    if (Array.isArray(question.options) && (typeof answers[id] !== "string" || !question.options.includes(String(value)))) return true;
    if (id === "mo_marijuana_record_offense") return typeof value !== "string" || !value.trim();
    if (id === "mo_marijuana_pounds") return !/^\d+(?:\.\d+)?$/.test(String(value)) || !Number.isFinite(Number(value));
    if (id === "mo_marijuana_offense_date") return typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value;
    return false;
  });
  if (unresolved.length) return decision(unresolved.some(id => answers[id] === undefined || knownValue(answers[id]) === "") ? "missing" : "review", "record_facts_missing", unresolved);
  if (typeof answers.case_outcome !== "string" || !["Misdemeanor conviction", "Felony conviction", "Other conviction or adjudication"].includes(answers.case_outcome)) return decision(answers.case_outcome ? "review" : "missing", "record_facts_missing", ["case_outcome"]);
  const grade = answers.mo_marijuana_record_grade;
  const contradictoryGrade = answers.case_outcome === "Misdemeanor conviction" && ["class_e", "class_d", "class_abc"].includes(String(grade))
    || answers.case_outcome === "Felony conviction" && grade === "misdemeanor";
  if (contradictoryGrade) return decision("review", "record_facts_missing", ["case_outcome", "mo_marijuana_record_grade"]);
  const exclusions = ["mo_marijuana_minor_distribution", "mo_marijuana_violence", "mo_marijuana_impaired_driving", "mo_marijuana_commercial_vehicle"].filter(id => answers[id] === "yes");
  if (exclusions.length) return decision("review", "exclusion_review", exclusions);
  // The adopted memo and current constitutional text differ on the completed
  // Class D >3lb boundary; do not silently resolve that source disagreement.
  if (answers.mo_marijuana_record_is_marijuana !== "yes"
    || answers.mo_marijuana_record_grade === "ordinance_or_other"
    || answers.mo_marijuana_record_grade === "class_d" && Number(knownValue(answers.mo_marijuana_pounds)) > 3
    || String(knownValue(answers.mo_marijuana_offense_date)) >= "2022-12-08") return decision("review", "source_boundary_review");
  return decision("guidance", "status_check");
}

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
