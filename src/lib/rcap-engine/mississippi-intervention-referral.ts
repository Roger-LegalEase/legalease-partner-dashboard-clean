import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

// Q3, owner-relayed counsel adoption91335651: reported facts select unpaid guidance only.
export const MS_INTERVENTION_ROUTE = "intervention-court-statutory-result-enforcement-referral";
export const MS_INTERVENTION_SOURCE = "LD-MS-01;Q3-MS-INTERVENTION;9-23-23";
export const MS_INTERVENTION_COPY = {
  "entered_order": [
    "Obtain the entered expungement order or equivalent court entry, identify who maintains the record that still appears, and ask about implementation or correction. A visible record does not by itself mean you need another expungement petition.",
    "Obtenga la orden de eliminación de antecedentes ya emitida o la anotación judicial equivalente, identifique quién mantiene el antecedente que aún aparece y pregunte cómo solicitar su implementación o corrección. El hecho de que un antecedente siga apareciendo no significa, por sí solo, que deba presentar otra petición de eliminación de antecedentes."
  ],
  "completed_no_order": [
    "Ask the intervention-court program, clerk, original attorney, or a legal-aid provider to confirm completion, the current docket, and any court action needed to implement the statutory result. This guidance does not provide a new expungement petition or confirm that your records have been cleared.",
    "Pida al programa del tribunal de intervención, a la secretaría del tribunal, a su abogado original o a un proveedor de asistencia legal que confirmen el cumplimiento de los requisitos, el estado actual del expediente judicial y cualquier actuación judicial necesaria para implementar el resultado previsto por la ley. Esta orientación no proporciona una nueva petición de eliminación de antecedentes ni confirma que sus antecedentes ya se hayan eliminado."
  ],
  "pre_plea_dismissal": [
    "Entering the program before a plea does not establish that you had a conviction to expunge. Confirm the dismissal and current records. If arrest or case records still need attention, ask about separate screening under § 99-19-71(4); its conditions must be checked. This referral does not start that petition.",
    "Ingresar al programa antes de presentar una declaración no demuestra que hubiera una condena que eliminar. Confirme la desestimación y los registros actuales. Si aún hay que atender los registros del arresto o del caso, pregunte por una evaluación separada conforme al § 99-19-71(4); deben verificarse sus condiciones. Esta remisión no inicia esa petición."
  ],
  "records_confirmation": [
    "Ask the program, clerk, original attorney, or a legal-aid provider to review the actual admission and sentencing orders, completion requirements, payments or waivers, and current docket. An unclear plea arrangement or disputed completion does not establish dismissal or expungement.",
    "Pida al programa, a la secretaría del tribunal, a su abogado original o a un proveedor de asistencia legal que revisen las órdenes reales de ingreso al programa y de sentencia, los requisitos de cumplimiento, los pagos o las condonaciones y el expediente judicial actual. Una situación poco clara respecto de la declaración o una controversia sobre el cumplimiento no demuestra que se haya desestimado el caso ni eliminado los antecedentes."
  ],
  "implied_consent": [
    "Mississippi law does not allow expunction of an implied consent violation through intervention court. This guidance does not offer an expungement petition for that violation.",
    "La ley de Mississippi no permite la eliminación de antecedentes de una infracción de consentimiento implícito a través del tribunal de intervención. Esta orientación no ofrece una petición de eliminación de antecedentes para esa infracción."
  ],
  "incomplete": [
    "Completion of the intervention-court requirements, assessed payments not waived by the court, and any other applicable probation or suspended-sentence requirements must be confirmed. Ask the program or your attorney what remains. This guidance does not confirm that statutory relief has occurred.",
    "Debe confirmarse el cumplimiento de los requisitos del tribunal de intervención, los pagos impuestos que el tribunal no haya condonado y cualquier otro requisito aplicable de libertad a prueba o de sentencia suspendida. Pregunte al programa o a su abogado qué falta por cumplir. Esta orientación no confirma que ya se haya producido el resultado previsto por la ley."
  ],
  "no_visible_record": [
    "Not seeing a record does not by itself confirm dismissal or expungement. Keep the actual court orders and confirm the current docket and records status with the program or clerk if you are unsure.",
    "No ver un antecedente no confirma, por sí solo, que se haya desestimado el caso ni eliminado los antecedentes. Conserve las órdenes judiciales reales y, si tiene dudas, confirme el estado actual del expediente y de los registros con el programa o la secretaría del tribunal."
  ]
} as const;

type Answers = Readonly<Record<string, unknown>>;
function question(id: string, en: string, es: string, options?: [string, string, string][], helper?: [string, string]): PublicQuestion {
  return { id, stage: "pathway_routing", type: options ? "single_choice" : "text_or_unknown",
    required: false, contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter",
    prompt: en, ...(helper ? { helperText: helper[0] } : {}), translations: { es: { prompt: es, ...(helper ? { helperText: helper[1] } : {}) } },
    ...(options ? { options: options.map(([value]) => value),
      optionDisplay: Object.fromEntries(options.map(([value, label, spanish]) =>
        [value, { label, translations: { es: { label: spanish } } }])) } : {}) };
}
const yesNo: [string, string, string][] = [["yes", "Yes", "Sí"], ["no", "No", "No"], ["unknown", "I am not sure", "No estoy seguro"]];
export const MS_INTERVENTION_QUESTIONS: PublicQuestion[] = [
  question("ms_icourt_completed", "Did you complete all of the intervention court's requirements?", "¿Cumplió todos los requisitos del tribunal de intervención?", [
    ["completed", "Yes, I completed them", "Sí, los cumplí"], ["not_completed", "No, I have not completed them", "No los he cumplido"],
    ["disputed_or_unsure", "There is a disagreement, or I am not sure", "Hay un desacuerdo o no estoy seguro"]]),
  question("ms_icourt_entry_posture", "What do the admission and sentencing orders show about your plea when you entered the intervention court?",
    "¿Qué indican las órdenes de ingreso y de sentencia sobre su declaración cuando ingresó al tribunal de intervención?", [
    ["sentenced_on_guilty_plea", "I was sentenced after a guilty plea", "Me sentenciaron después de declararme culpable"],
    ["entered_before_plea", "I entered before any plea", "Ingresé antes de presentar cualquier declaración"],
    ["plea_held_in_abeyance", "A plea was held in abeyance", "Una declaración quedó en suspenso"],
    ["other_or_unsure", "Something else, or I am not sure", "Otra situación o no estoy seguro"]]),
  question("ms_icourt_other_terms_done", "Have you also finished every other probation or suspended-sentence term?", "¿Terminó también todas las demás condiciones de libertad a prueba o de sentencia suspendida?", yesNo),
  question("ms_icourt_payments", "Were the fines and fees the court assessed paid, or waived by the court?", "¿Se pagaron las multas, tarifas y costas que impuso el tribunal, o el tribunal las condonó?", yesNo),
  question("ms_icourt_order_status", "What entered order or court entry do you have for this case?", "¿Qué orden emitida o anotación judicial tiene para este caso?", [
    ["completion_only", "Completion only", "Solo cumplimiento"], ["dismissal", "Dismissal only", "Solo desestimación"],
    ["expunction", "Expungement", "Eliminación de antecedentes"], ["dismissal_and_expunction", "Dismissal and expungement", "Desestimación y eliminación de antecedentes"],
    ["none", "No entered order", "No hay una orden emitida"], ["unknown", "I am not sure", "No estoy seguro"]]),
  question("ms_icourt_docket_status", "What does the current court docket show?", "¿Qué indica actualmente el expediente judicial?", [
    ["dismissed", "Case dismissed", "Caso desestimado"], ["charges_dropped", "Charges dropped", "Cargos retirados"],
    ["pending", "Case still pending", "Caso aún pendiente"], ["conviction", "A conviction remains", "Permanece una condena"],
    ["unknown", "I am not sure", "No estoy seguro"]]),
  question("ms_icourt_record_visible", "Do you still see this record?", "¿Sigue viendo este antecedente?", yesNo),
  question("ms_icourt_record_visible_where", "Where do you still see this record (for example, a background check or the court's online docket)?",
    "¿Dónde sigue viendo este antecedente (por ejemplo, en una verificación de antecedentes o en el registro de casos en línea del tribunal)?"),
  question("ms_icourt_implied_consent", "Was this case for an implied consent violation?",
    "¿Este caso fue por una infracción de la ley de consentimiento implícito (implied consent)?", yesNo,
    ["Mississippi law does not allow expunction of an implied consent violation through intervention court.", "La ley de Mississippi no permite la eliminación de antecedentes de una infracción de consentimiento implícito a través del tribunal de intervención."])
];
export const MS_INTERVENTION_FACT_IDS = MS_INTERVENTION_QUESTIONS.map(q => q.id);
function hasChoice(value: unknown, choices: readonly string[]): boolean {
  return typeof value === "string" && choices.includes(value);
}
export function msInterventionQuestionApplies(state: string, answers: Answers, id: string): boolean {
  if (!MS_INTERVENTION_FACT_IDS.includes(id)) return true;
  return state === "MS" && answers.ms_program_order === "9-23-23"
    && (id !== "ms_icourt_other_terms_done" || answers.ms_icourt_entry_posture === "sentenced_on_guilty_plea");
}
export function msInterventionReferralCode(answers: Answers): keyof typeof MS_INTERVENTION_COPY {
  // A reported exclusion has its own guidance; unknown never supplies a negative.
  if (answers.ms_icourt_implied_consent === "yes") return "implied_consent";
  if (answers.ms_icourt_implied_consent !== "no") return "records_confirmation";
  if (answers.ms_icourt_completed === "not_completed") return "incomplete";
  if (answers.ms_icourt_completed !== "completed"
    || !hasChoice(answers.ms_icourt_entry_posture, ["sentenced_on_guilty_plea", "entered_before_plea"])) return "records_confirmation";
  if (answers.ms_icourt_payments !== "yes" && answers.ms_icourt_payments !== "no") return "records_confirmation";
  if (answers.ms_icourt_payments === "no") return "incomplete";
  if (answers.ms_icourt_entry_posture === "sentenced_on_guilty_plea") {
    if (answers.ms_icourt_other_terms_done !== "yes" && answers.ms_icourt_other_terms_done !== "no") return "records_confirmation";
    if (answers.ms_icourt_other_terms_done === "no") return "incomplete";
  }
  if (!hasChoice(answers.ms_icourt_order_status, ["completion_only", "dismissal", "expunction", "dismissal_and_expunction", "none"])
    || !hasChoice(answers.ms_icourt_docket_status, ["dismissed", "charges_dropped"])
    || !hasChoice(answers.ms_icourt_record_visible, ["yes", "no"])) return "records_confirmation";
  if (answers.ms_icourt_record_visible === "no") return "no_visible_record";
  if (hasChoice(answers.ms_icourt_order_status, ["expunction", "dismissal_and_expunction"])) return "entered_order";
  if (answers.ms_icourt_entry_posture === "entered_before_plea" && answers.ms_icourt_order_status === "dismissal") return "pre_plea_dismissal";
  return "completed_no_order";
}
