import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { scalarAnswerText, questionAnswerState } from "@/lib/expungement-ai/question-answer-state";

// O26 IL1: IL.memo il-exp-supervision / il-exp-qualprob, adopted §9 il_later_order.
export const IL_PROGRAM_ROUTE = "expungement-after-eligible-supervision-or-qualified-probation";
export const IL_PROGRAM_SOURCE = "IL.memo:il-exp-supervision,il-exp-qualprob;20ILCS2630/5.2(a)(1)(C),(J),(b)(1)(iii)-(iv),(b)(2)(B)-(C)";
const qualified = ["cannabis_10", "controlled_410", "meth_70", "ucc_5_6_3_3", "ucc_5_6_3_4", "alcohol_10_102", "substance_40_10", "steroid_10"];
const fiveYear = ["vehicle_3_707", "vehicle_3_708", "vehicle_3_710", "vehicle_5_401_3", "criminal_11_1_50", "criminal_12_3_2", "criminal_12_15"];
const needsVacatur = (type: unknown) => type === "alcohol_10_102" || type === "substance_40_10";
type Answers = Readonly<Record<string, unknown>>;
function question(id: string, en: string, es: string, type: string, options?: [string, string, string][]): PublicQuestion {
  return { id, stage: "pathway_routing", type, required: true, contextOnly: false,
    doesNotSelectPathway: true, lifecyclePhase: "prepay_timing_gate", prompt: en, translations: { es: { prompt: es } },
    ...(options ? { options: options.map(([value]) => value), optionDisplay: Object.fromEntries(options.map(([value, label, spanish]) => [value, { label, translations: { es: { label: spanish } } }])) } : {}) };
}
export const IL_PROGRAM_QUESTIONS: PublicQuestion[] = [
  // data/record-clearing/legal-design-intake/IL.memo.json:995
  question("il_program_type", "What kind of supervision or probation does the court order name?", "¿Qué tipo de supervisión o libertad condicional (probation) indica la orden judicial?", "single_choice", [
    ["supervision", "Court supervision", "Supervisión judicial"],
    ["cannabis_10", "Cannabis Control Act, section 10", "Ley de Control del Cannabis, sección 10"],
    ["controlled_410", "Controlled Substances Act, section 410", "Ley de Sustancias Controladas, sección 410"],
    ["meth_70", "Methamphetamine Control Act, section 70", "Ley de Control de la Metanfetamina, sección 70"],
    ["ucc_5_6_3_3", "Unified Code of Corrections, section 5-6-3.3", "Código Unificado de Correcciones, sección 5-6-3.3"],
    ["ucc_5_6_3_4", "Unified Code of Corrections, section 5-6-3.4", "Código Unificado de Correcciones, sección 5-6-3.4"],
    ["alcohol_10_102", "Alcoholism and Other Drug Dependency Act, section 10-102", "Ley sobre Alcoholismo y Dependencia de Otras Drogas, sección 10-102"],
    ["substance_40_10", "Substance Use Disorder Act, section 40-10", "Ley sobre Trastornos por Consumo de Sustancias, sección 40-10"],
    ["steroid_10", "Steroid Control Act, section 10", "Ley de Control de Esteroides, sección 10"],
    ["ordinary", "Ordinary probation", "Libertad condicional ordinaria"],
    ["other", "Another type", "Otro tipo"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  // data/record-clearing/legal-design-intake/IL.memo.json:629
  question("il_program_termination", "How did this supervision or probation end? Use the actual termination order, not just completion of a sentence.", "¿Cómo terminó esta supervisión o libertad condicional? Use la orden real de terminación, no solo el cumplimiento de una sentencia.", "single_choice", [
    ["satisfactory", "Terminated satisfactorily", "Terminó satisfactoriamente"],
    ["unsatisfactory", "Revoked or terminated unsatisfactorily", "Fue revocada o terminó de manera insatisfactoria"],
    ["ongoing", "It has not ended", "No ha terminado"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  // data/record-clearing/legal-design-intake/IL.memo.json:624
  question("il_program_termination_date", "On what date did this supervision or probation terminate satisfactorily? Do not use the end date of another sentence.", "¿En qué fecha terminó satisfactoriamente esta supervisión o libertad condicional? No use la fecha de finalización de otra sentencia.", "date_or_unknown"),
  // data/record-clearing/legal-design-intake/IL.memo.json:599
  question("il_supervision_offense", "Which offense was the supervision for? For a similar local ordinance, choose the matching listed section.", "¿Por qué delito se impuso la supervisión? Para una ordenanza local similar, elija la sección correspondiente de la lista.", "single_choice", [
    ["vehicle_3_707", "Vehicle Code, section 3-707", "Código de Vehículos, sección 3-707"],
    ["vehicle_3_708", "Vehicle Code, section 3-708", "Código de Vehículos, sección 3-708"],
    ["vehicle_3_710", "Vehicle Code, section 3-710", "Código de Vehículos, sección 3-710"],
    ["vehicle_5_401_3", "Vehicle Code, section 5-401.3", "Código de Vehículos, sección 5-401.3"],
    ["criminal_11_1_50", "Criminal Code, section 11-1.50", "Código Penal, sección 11-1.50"],
    ["criminal_12_3_2", "Criminal Code, section 12-3.2", "Código Penal, sección 12-3.2"],
    ["criminal_12_15", "Criminal Code, section 12-15", "Código Penal, sección 12-15"],
    ["reckless_misdemeanor", "Misdemeanor reckless driving, Vehicle Code section 11-503(a), or a similar local ordinance", "Conducción imprudente como delito menor, sección 11-503(a) del Código de Vehículos, o una ordenanza local similar"],
    ["dui", "DUI, Vehicle Code section 11-501", "Conducir bajo la influencia (DUI), sección 11-501 del Código de Vehículos"],
    ["other_reckless", "Another reckless-driving offense under section 11-503", "Otro delito de conducción imprudente conforme a la sección 11-503"],
    ["other", "Another offense", "Otro delito"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  // data/record-clearing/legal-design-intake/IL.memo.json:594
  question("il_program_minor_traffic", "Was this a minor traffic offense?", "¿Fue una infracción menor de tránsito?", "single_choice", [
    ["yes", "Yes", "Sí"],
    ["no", "No", "No"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  // data/record-clearing/legal-design-intake/IL.memo.json:593
  question("il_supervision_sexual_minor", "Was the supervision for a sexual offense committed against a minor?", "¿Se impuso la supervisión por un delito sexual cometido contra una persona menor de edad?", "single_choice", [
    ["yes", "Yes", "Sí"],
    ["no", "No", "No"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  // data/record-clearing/legal-design-intake/IL.memo.json:1010
  question("il_program_judgment_vacated", "For this section 10-102 or 40-10 probation, did the court vacate the judgment of conviction? Completion alone does not answer this.", "Para esta libertad condicional conforme a la sección 10-102 o 40-10, ¿anuló el tribunal la sentencia condenatoria? El cumplimiento por sí solo no responde esta pregunta.", "single_choice", [
    ["yes", "Yes", "Sí"],
    ["no", "No", "No"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  // data/record-clearing/legal-design-intake/IL.memo.json:595
  question("il_supervision_termination_changed", "Did a court reverse, vacate or modify the unsatisfactory termination of supervision?", "¿Revocó, anuló o modificó un tribunal la terminación insatisfactoria de la supervisión?", "single_choice", [
    ["yes", "Yes", "Sí"],
    ["no", "No", "No"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  // data/record-clearing/legal-design-intake/IL.memo.json:595
  question("il_supervision_conviction_status", "What is the status of any judgment of conviction following that supervision?", "¿Cuál es el estado de cualquier sentencia condenatoria posterior a esa supervisión?", "single_choice", [
    ["none", "No judgment of conviction was entered", "No se dictó una sentencia condenatoria"],
    ["reversed_or_vacated", "Every such judgment was reversed or vacated", "Todas esas sentencias fueron revocadas o anuladas"],
    ["stands", "A judgment of conviction remains", "Sigue vigente una sentencia condenatoria"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  // data/record-clearing/legal-design-intake/IL.memo.json:604
  question("il_reckless_age_25", "Have you reached age 25?", "¿Ha cumplido 25 años?", "single_choice", [
    ["yes", "Yes", "Sí"],
    ["no", "No", "No"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
  // data/record-clearing/legal-design-intake/IL.memo.json:645
  question("il_other_dui_reckless", "Do you have any other conviction for DUI under Vehicle Code section 11-501 or reckless driving under section 11-503?", "¿Tiene alguna otra condena por conducir bajo la influencia conforme a la sección 11-501 del Código de Vehículos o por conducción imprudente conforme a la sección 11-503?", "single_choice", [
    ["yes", "Yes", "Sí"],
    ["no", "No", "No"],
    ["unknown", "I am not sure", "No estoy seguro"]
  ]),
];
export const IL_PROGRAM_FACT_IDS = IL_PROGRAM_QUESTIONS.map(q => q.id);
export const IL_PROGRAM_COPY = {
  "other": ["You chose another type of supervision or probation. The court order must show whether it is one of the qualified programs this route uses. Other record-clearing options need separate review.", "Usted eligió otro tipo de supervisión o libertad condicional. La orden judicial debe mostrar si es uno de los programas calificados que utiliza esta vía. Otras opciones para limpiar los antecedentes requieren una revisión separada."],
  "future_date": ["Check the satisfactory termination date against the court order. A future date cannot confirm that the supervision or probation has ended. Your saved date has not been changed.", "Compare con la orden judicial la fecha en que terminó satisfactoriamente la supervisión o libertad condicional. Una fecha futura no permite confirmar que haya terminado. No se ha cambiado la fecha que guardó."],
  "missing": [
    "Confirm the actual supervision or probation order and termination facts. A general completion answer or an old case date does not establish them.",
    "Confirme la orden real de supervisión o libertad condicional y los hechos de su terminación. Una respuesta general de cumplimiento o una fecha antigua del caso no los establece."
  ],
  "ordinary": [
    "Ordinary probation is a conviction for this purpose and does not use the qualified-probation expungement route. Other record-clearing options need separate review.",
    "La libertad condicional ordinaria constituye una condena para este fin y no utiliza la vía de eliminación por libertad condicional calificada. Otras opciones para limpiar los antecedentes requieren una revisión separada."
  ],
  "completion": [
    "The reported order does not establish satisfactory termination for this supervision or qualified-probation route. A later order must have the source-defined legal effect; it does not erase the original answers.",
    "La orden declarada no establece una terminación satisfactoria para esta vía de supervisión o libertad condicional calificada. Una orden posterior debe tener el efecto jurídico definido por la fuente; no borra las respuestas originales."
  ],
  "excluded": [
    "The reported offense or other conviction does not meet this supervision or qualified-probation expungement route. This does not decide every other record-clearing option.",
    "El delito u otra condena declarados no cumplen los requisitos de esta vía de eliminación por supervisión o libertad condicional calificada. Esto no decide todas las demás opciones para limpiar los antecedentes."
  ],
  "wait": [
    "The required period after satisfactory termination, or the age-25 condition for the specified reckless-driving supervision, has not been met.",
    "No se ha cumplido el plazo requerido desde la terminación satisfactoria, o la condición de haber cumplido 25 años para la supervisión por la conducción imprudente indicada."
  ],
  "form": [
    "The reported supervision or qualified-probation facts satisfy the checked termination and waiting conditions. LegalEase does not yet have the correct EXP-AD packet mapping installed for this route. No payment or filing-ready packet is authorized.",
    "Los hechos declarados sobre la supervisión o libertad condicional calificada cumplen las condiciones de terminación y espera comprobadas. LegalEase aún no tiene instalada la correspondencia correcta de los formularios EXP-AD para esta vía. No se autoriza ningún pago ni un paquete listo para presentar."
  ],
  "order_review": [
    "You reported a later order changing the unsatisfactory supervision termination and no remaining judgment of conviction. Review the actual order and its effect on satisfactory termination and timing before continuing. The original history is preserved.",
    "Declaró una orden posterior que cambia la terminación insatisfactoria de la supervisión y que no queda ninguna sentencia condenatoria vigente. Revise la orden real y su efecto sobre la terminación satisfactoria y los plazos antes de continuar. Se conserva el historial original."
  ]
} as const;

export function illinoisProgramContext(profile: EngineProfile, pathwayId: string | undefined | null): boolean {
  return profile.jurisdiction.code === "IL" && pathwayId === IL_PROGRAM_ROUTE;
}
export function illinoisProgramFactIds(a: Answers): string[] {
  const ids = ["il_program_type"];
  if (a.il_program_type !== "supervision" && !qualified.includes(String(a.il_program_type))) return ids;
  ids.push("il_program_termination");
  if (a.il_program_type === "supervision" && a.il_program_termination === "unsatisfactory") {
    return [...ids, "il_supervision_termination_changed", "il_supervision_conviction_status"];
  }
  if (a.il_program_termination !== "satisfactory") return ids;
  ids.push("il_program_termination_date", "il_program_minor_traffic");
  if (needsVacatur(a.il_program_type)) ids.push("il_program_judgment_vacated");
  if (a.il_program_type === "supervision") {
    ids.push("il_supervision_offense", "il_supervision_sexual_minor");
    if (a.il_supervision_offense === "reckless_misdemeanor") ids.push("age_at_offense", "il_reckless_age_25", "il_other_dui_reckless");
  }
  return ids;
}
export function illinoisProgramQuestionApplies(profile: EngineProfile, pathwayId: string | undefined | null, a: Answers, id: string): boolean {
  if (!IL_PROGRAM_FACT_IDS.includes(id)) return true;
  const context = illinoisProgramContext(profile, pathwayId) || profile.jurisdiction.code === "IL" && !pathwayId
    && (a.il_record_help === "program_record" || a.case_outcome === "Diversion, deferred disposition, supervision, or similar program" && a.il_cannabis_next_step !== "status_check");
  return context && illinoisProgramFactIds(a).includes(id);
}
type Decision = { status: "satisfied" } | { status: "missing"; missingQuestionIds: string[]; code: "missing" | "future_date" }
  | { status: "not_yet" | "review"; code: keyof typeof IL_PROGRAM_COPY };
export function illinoisProgramFacts(a: Answers, today: string): Decision {
  const missing = (...missingQuestionIds: string[]): Decision => ({ status: "missing", code: "missing", missingQuestionIds });
  const review = (code: keyof typeof IL_PROGRAM_COPY): Decision => ({ status: "review", code });
  const type = a.il_program_type;
  if (type === "ordinary") return review("ordinary");
  if (type === "other") return review("other");
  if (typeof type !== "string" || type !== "supervision" && !qualified.includes(type)) return missing("il_program_type");
  if (!["Diversion, deferred disposition, supervision, or similar program", "Misdemeanor conviction", "Felony conviction"].includes(String(a.case_outcome))) return missing("case_outcome");
  if (a.il_program_termination === "ongoing") return { status: "not_yet", code: "completion" };
  if (a.il_program_termination === "unsatisfactory") {
    if (type !== "supervision") return review("completion");
    if (a.il_supervision_termination_changed === "no" || a.il_supervision_conviction_status === "stands") return review("completion");
    const ids = [
      ...(a.il_supervision_termination_changed !== "yes" ? ["il_supervision_termination_changed"] : []),
      ...(!["none", "reversed_or_vacated"].includes(String(a.il_supervision_conviction_status)) ? ["il_supervision_conviction_status"] : [])
    ];
    // A changed unsatisfactory order does not supply a satisfactory-termination date.
    return ids.length ? missing(...ids) : review("order_review");
  }
  if (a.il_program_termination !== "satisfactory") return missing("il_program_termination");
  const factIds = illinoisProgramFactIds(a).filter(id => id !== "il_program_termination_date" && id !== "age_at_offense");
  const unknown = factIds.filter(id => questionAnswerState(IL_PROGRAM_QUESTIONS.find(q => q.id === id)!, a[id], today) !== "known_valid");
  if (unknown.length) return missing(...unknown);
  if (a.il_program_minor_traffic === "yes") return review("excluded");
  if (needsVacatur(type) && a.il_program_judgment_vacated !== "yes") return review("completion");
  let years = 5;
  if (type === "supervision") {
    if (a.il_supervision_sexual_minor === "yes" || ["dui", "other_reckless"].includes(String(a.il_supervision_offense))) return review("excluded");
    if (a.il_supervision_offense === "reckless_misdemeanor") {
      const age = scalarAnswerText(a.age_at_offense);
      if (questionAnswerState({ id: "age_at_offense", type: "number_or_range" }, a.age_at_offense, today) !== "known_valid"
        || !age || !/^\d{1,3}$/.test(age) || Number(age) > 125) return missing("age_at_offense");
      if (Number(age) >= 25 || a.il_other_dui_reckless === "yes") return review("excluded");
      if (a.il_reckless_age_25 !== "yes") return { status: "not_yet", code: "wait" };
      years = 0;
    } else years = fiveYear.includes(String(a.il_supervision_offense)) ? 5 : 2;
  }
  if (questionAnswerState({ id: "il_program_termination_date", type: "date_or_unknown" }, a.il_program_termination_date, today) !== "known_valid") return missing("il_program_termination_date");
  const date = new Date(`${scalarAnswerText(a.il_program_termination_date)!.trim()}T00:00:00.000Z`);
  if (date.toISOString().slice(0, 10) > today) return { status: "missing", code: "future_date", missingQuestionIds: ["il_program_termination_date"] };
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10) > today ? { status: "not_yet", code: "wait" } : { status: "satisfied" };
}
