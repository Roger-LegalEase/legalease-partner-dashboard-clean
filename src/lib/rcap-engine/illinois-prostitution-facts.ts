import { sameKnownQuestionAnswer } from "@/lib/expungement-ai/question-answer-state";
import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";

// GA-12 Q-3ab8bb479903ec6dc680 / QD-bd6b15fff22cbe1501cb; IL.memo il-prostitution-j-vacate.
export const IL_PROSTITUTION_ROUTE = "felony-prostitution-relief";
export const IL_PROSTITUTION_FACT_ID = "il_prostitution_final_record";
export const IL_PROSTITUTION_SOURCE = "IL.memo:il-prostitution-j-vacate;20ILCS2630/5.2(j)";
export function illinoisProstitutionContext(profile: EngineProfile | undefined, pathway: string | null | undefined): boolean {
  return profile?.jurisdiction.code === "IL" && pathway === IL_PROSTITUTION_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "aa34523e3b643b32124db5d83973622f37082f2d112b3e32ef55912258a7e630"
    && profile.pathways.some(p => p.id === IL_PROSTITUTION_ROUTE);
}
// Supplemental EN/ES copy is a source-grounded draft, pending qualified review.
export const IL_PROSTITUTION_QUESTION: PublicQuestion = {
  id: IL_PROSTITUTION_FACT_ID, stage: "pathway_routing", type: "single_choice", required: false,
  contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter",
  prompt: "Does the final conviction record say Class 4 felony prostitution?",
  helperText: "Check the final conviction record, including any amendment. An original charge, a general felony label or an earlier offense category does not answer this question. Choose I am not sure if you cannot confirm what the record says.",
  options: ["Yes", "No", "I am not sure"],
  optionDisplay: { Yes: { label: "Yes", translations: { es: { label: "Sí" } } }, No: { label: "No", translations: { es: { label: "No" } } }, "I am not sure": { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } } },
  translations: { es: {
    prompt: "¿El expediente de la condena final dice Class 4 felony prostitution?",
    helperText: "Consulte el expediente de la condena final, incluida cualquier modificación. Un cargo original, una etiqueta general de delito grave o una categoría anterior no responde esta pregunta. Elija No estoy seguro si no puede confirmar lo que dice el expediente."
  } }
};
export function illinoisProstitutionQuestionApplies(profile: EngineProfile | undefined, pathway: string | null | undefined, id: string): boolean {
  return id !== IL_PROSTITUTION_FACT_ID || illinoisProstitutionContext(profile, pathway);
}
export const IL_PROSTITUTION_COPY = {
  trafficking: ["The reported trafficking-related circumstances need review under the separate trafficking-survivor procedure in 20 ILCS 2630/5.2(h) before the ordinary Class 4 felony prostitution motion. Different questions apply. No eligibility, filing readiness or payment authority is established.", "Las circunstancias relacionadas con la trata de personas que se declararon deben revisarse conforme al procedimiento separado para sobrevivientes de trata de 20 ILCS 2630/5.2(h) antes de la moción ordinaria por prostitución como delito grave de Clase 4. Se aplican preguntas diferentes. No se establece ninguna elegibilidad, que la moción esté lista para presentarse ni autorización de pago."],
  missing: ["Confirm that the final conviction record says Class 4 felony prostitution and that every sentence or condition imposed is complete. A general felony label, an earlier category or a completion date alone does not establish these facts.", "Confirme que el expediente de la condena final indica una condena por prostitución como delito grave de Clase 4 (Class 4 felony prostitution) y que se cumplió cada pena o condición impuesta. Una etiqueta general de delito grave, una categoría anterior o solo una fecha de cumplimiento no establecen estos datos."],
  record_conflict: ["The reported final record does not establish a Class 4 felony prostitution conviction. Review the final disposition and applicable procedure; this is not a decision about every record-clearing option.", "El expediente final declarado no establece una condena por prostitución como delito grave de Clase 4. Revise la resolución final y el procedimiento aplicable; esto no es una decisión sobre todas las opciones para limpiar antecedentes."],
  completion: ["The sentence and every condition imposed by this conviction must be complete before using the Class 4 felony prostitution procedure. Confirm completion from your records; an earlier category or completion date alone does not establish it.", "La pena y cada condición impuesta por esta condena deben estar cumplidas antes de usar el procedimiento para la prostitución como delito grave de Clase 4. Confirme el cumplimiento con sus expedientes; una categoría anterior o solo una fecha de cumplimiento no lo establecen."],
  record_review: ["The reported final Class 4 felony prostitution conviction and completion of every court-ordered requirement support preparing a motion to vacate and expunge under 20 ILCS 2630/5.2(j)(3). Attorney review is required by default because the court weighs discretionary factors and survivor circumstances. You supply your own adverse-consequences statement; no court finding is made here. Confirm local filing and service requirements. This result does not authorize payment or claim that the motion is ready to file.", "La condena final declarada por prostitución como delito grave de Clase 4 y el cumplimiento de cada requisito ordenado por el tribunal permiten preparar una moción para anular la condena y eliminar los antecedentes (motion to vacate and expunge) conforme a 20 ILCS 2630/5.2(j)(3). Por defecto se requiere la revisión de un abogado, porque el tribunal sopesa factores discrecionales y las circunstancias de la persona sobreviviente. Usted aporta su propia declaración sobre las consecuencias adversas; aquí no se emite ninguna determinación judicial. Confirme los requisitos locales de presentación y notificación. Este resultado no autoriza el pago ni indica que la moción esté lista para presentarse."],
  source_review: ["The source for this record question needs review before continuing. No eligibility or payment authority is established.", "La fuente de esta pregunta sobre el expediente debe revisarse antes de continuar. No se establece ninguna elegibilidad ni autorización de pago."]
} as const;
export function illinoisProstitutionFacts(answers: Record<string, unknown>): "missing" | "record_conflict" | "completion" | "record_review" | "trafficking" {
  // A choice is an account of the final record, never a classification from prose.
  if (answers.case_outcome !== "Felony conviction") return "record_conflict";
  if (sameKnownQuestionAnswer({ id: "trafficking_status", type: "yes_no_prefer_not_to_say" }, answers.trafficking_status, "Yes")) return "trafficking";
  const value = answers[IL_PROSTITUTION_FACT_ID];
  if (value === "No") return "record_conflict";
  if (value !== "Yes") return "missing";
  const completion = answers.court_requirements_completed;
  if (typeof completion !== "string" || !["yes", "no", "not_sure", "not_applicable"].includes(completion)) return "missing";
  return completion === "yes" ? "record_review" : "completion";
}
