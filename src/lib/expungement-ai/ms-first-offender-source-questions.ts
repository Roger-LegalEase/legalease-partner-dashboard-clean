import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { convictionReliefQuestions } from "@/lib/rcap-engine/conviction-relief-request";
import { MS_FIRST_OFFENDER_CHOICES, MS_FIRST_OFFENDER_IDS } from "@/lib/rcap-engine/mississippi-first-offender-source-facts";

export const MS_FIRST_OFFENDER_COLLECTION_IDS = [...MS_FIRST_OFFENDER_IDS, "ms_conviction_court", "ms_prior_conviction_expungement", "charge"] as const;
// Source-grounded engineering EN/ES copy; qualified final language review is
// separate. These are protected packet controls, never public screening IDs.
const labels = {
  final_conviction_record_confirmed: ["The case record shows a final conviction", "El expediente muestra una condena final"],
  not_final_or_still_pending: ["The conviction is not final or remains pending", "La condena no es final o sigue pendiente"],
  checked_own_history_no_other_convictions: ["I checked my complete conviction history and found no other conviction", "Revisé mi historial completo de condenas y no encontré otra condena"],
  checked_own_history_other_conviction: ["I checked my history and found another conviction", "Revisé mi historial y encontré otra condena"],
  history_not_checked_or_incomplete: ["I have not checked my history or it is incomplete", "No he revisado mi historial o está incompleto"],
  nontraffic_nondui_record_confirmed: ["The record shows an offense that is neither a traffic violation nor DUI", "El expediente muestra un delito que no es una infracción de tránsito ni DUI"],
  traffic_or_title63_record: ["A traffic violation or an offense under Title 63", "Una infracción de tránsito o un delito del Título 63"],
  dui_record: ["Driving under the influence (DUI)", "Conducir bajo la influencia (DUI)"],
  not_a_public_official: ["I was not a public official in this matter", "No era funcionario público en este asunto"],
  public_official_unrelated_to_duties: ["I was a public official, but this conviction was unrelated to my official duties", "Era funcionario público, pero esta condena no se relacionaba con mis funciones oficiales"],
  official_duty_related: ["The conviction was related to my official duties", "La condena se relacionaba con mis funciones oficiales"],
  unknown: ["I am not sure or the record is disputed", "No estoy seguro o se cuestiona el expediente"]
} as const;
const prompts = [
  ["Does the case record show that this conviction is final?", "¿El expediente muestra que esta condena es final?",
    "Use the judgment and any later orders. If the status is unclear or disputed, choose that answer.", "Consulte la sentencia y las órdenes posteriores. Si el estado no está claro o se cuestiona, elija esa respuesta."],
  ["What did you find when you checked your complete conviction history?", "¿Qué encontró al revisar su historial completo de condenas?",
    "Include convictions in every court and jurisdiction, even if a record was later cleared. Check your own criminal history; an earlier relief answer does not establish this fact.", "Incluya las condenas de todos los tribunales y jurisdicciones, aunque después se hayan eliminado los antecedentes. Revise su propio historial penal; una respuesta anterior sobre otra medida no establece este dato."],
  ["How does the final conviction record classify this offense?", "¿Cómo clasifica este delito el expediente de la condena final?",
    "Use the final offense and citation, including any amendment. Do not use the original arrest charge. If traffic, Title 63 or DUI status is unclear, choose that answer.", "Use el delito final y su disposición legal, incluidas las modificaciones. No use el cargo original del arresto. Si no está claro si se trata de tránsito, del Título 63 o de DUI, elija esa respuesta."],
  ["Was this conviction related to public office or official duties?", "¿Esta condena se relacionaba con un cargo público o con funciones oficiales?",
    "Use the facts of this case. If the relationship is unclear or needs legal advice, choose that answer.", "Use los hechos de este caso. Si la relación no está clara o requiere asesoramiento legal, elija esa respuesta."]
] as const;
export function msFirstOffenderSourceQuestions(): ProfileQuestion[] {
  return [
    { id: "charge", stage: "packet_information", type: "text_or_unknown", required: true, contextOnly: false, options: null,
      prompt: "What exact offense and legal citation appear on the conviction record?",
      helperText: "Use the final offense as the court record states it, including any amendment. A charge name does not establish traffic status or first-offender status.",
      translations: { es: { prompt: "¿Qué delito exacto y disposición legal figuran en el expediente de la condena?", helperText: "Use el delito final tal como figura en el expediente judicial, incluidas las modificaciones. El nombre de un cargo no establece si se trata de tránsito ni si es una primera condena." } } },
    ...MS_FIRST_OFFENDER_IDS.map((id, index): ProfileQuestion => ({
      id, stage: "packet_information", type: "single_choice", required: true, contextOnly: false,
      prompt: prompts[index][0], helperText: prompts[index][2], options: [...MS_FIRST_OFFENDER_CHOICES[id]],
      optionDisplay: Object.fromEntries(MS_FIRST_OFFENDER_CHOICES[id].map(value => [value, { label: labels[value][0], translations: { es: { label: labels[value][1] } } }])),
      translations: { es: { prompt: prompts[index][1], helperText: prompts[index][3] } }
    })),
    ...convictionReliefQuestions("MS").filter(question => ["ms_conviction_court", "ms_prior_conviction_expungement"].includes(question.id))
      .map((question): ProfileQuestion => ({ ...question, contextOnly: question.contextOnly ?? false, options: Array.isArray(question.options) ? question.options.filter((value): value is string => typeof value === "string") : null }))
  ];
}
