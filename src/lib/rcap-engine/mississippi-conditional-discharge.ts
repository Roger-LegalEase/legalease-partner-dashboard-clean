import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const MS_CONDITIONAL_DISCHARGE_PATHWAY = "first-offense-controlled-substance-conditional-discharge-relief";
export const MS_CONDITIONAL_DISCHARGE_FACT_IDS = ["ms_drug_subsection", "ms_prior_drug_conviction", "ms_prior_conditional_discharge", "ms_adjudication_deferred"] as const;

/** LD-MS-01 / §41-29-150(d): these facts describe this record, not an election
 * of a track or proof of commercial authority. Active admission stays separate.
 */
export function msConditionalDischargeQuestionApplies(jurisdiction: string, answers: Record<string, unknown>, id: string) {
  return jurisdiction !== "MS" || !MS_CONDITIONAL_DISCHARGE_FACT_IDS.some(fact => fact === id)
    || answers.ms_program_order === "41-29-150"
      && ["completed_and_closed", "completed_without_closure"].includes(String(answers.ms_program_record_status));
}

export function msConditionalDischargePredicates(answers: Record<string, unknown>):
  | { status: "missing"; ids: string[] }
  | { status: "review" }
  | { status: "satisfied" } {
  const ids: string[] = [];
  if (!["41-29-139(c)", "41-29-139(d)", "other"].includes(String(answers.ms_drug_subsection))) ids.push("ms_drug_subsection");
  for (const id of MS_CONDITIONAL_DISCHARGE_FACT_IDS.slice(1)) {
    if (!["yes", "no"].includes(String(answers[id]))) ids.push(id);
  }
  if (answers.ms_program_final_disposition !== "discharged_and_dismissed") ids.push("ms_program_final_disposition");
  if (answers.court_requirements_completed !== "yes") ids.push("court_requirements_completed");
  if (ids.length) return { status: "missing", ids };
  if (answers.ms_drug_subsection === "other" || answers.ms_prior_drug_conviction === "yes"
    || answers.ms_prior_conditional_discharge === "yes" || answers.ms_adjudication_deferred === "no") return { status: "review" };
  return { status: "satisfied" };
}

const yesNo = {
  options: ["yes", "no", "unknown"],
  optionDisplay: {
    yes: { label: "Yes", translations: { es: { label: "Sí" } } },
    no: { label: "No", translations: { es: { label: "No" } } },
    unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
  }
};
const common = { stage: "pathway_routing", type: "single_choice", required: false, contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter" } as const;
export const MS_CONDITIONAL_DISCHARGE_QUESTIONS: PublicQuestion[] = [
  {
    ...common, id: "ms_drug_subsection",
    prompt: "Which subsection appears for the offense in the conditional-discharge record?",
    helperText: "Read the exact subsection from the record. A general drug-charge description does not establish it.",
    options: ["41-29-139(c)", "41-29-139(d)", "other", "unknown"],
    optionDisplay: {
      "41-29-139(c)": { label: "§ 41-29-139(c)", translations: { es: { label: "Sección 41-29-139(c)" } } },
      "41-29-139(d)": { label: "§ 41-29-139(d)", translations: { es: { label: "Sección 41-29-139(d)" } } },
      other: { label: "Another subsection", translations: { es: { label: "Otro inciso" } } },
      unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
    },
    translations: { es: { prompt: "¿Qué inciso aparece para el delito en el expediente de descargo condicional?", helperText: "Consulte el inciso exacto en el expediente. Una descripción general de un cargo por drogas no lo establece." } }
  },
  {
    ...common, ...yesNo, id: "ms_prior_drug_conviction",
    prompt: "Before this case, had you been convicted of a controlled-substance offense under federal law or the law of any state?",
    helperText: "Include convictions outside Mississippi. An arrest or charge alone is not a conviction.",
    translations: { es: { prompt: "Antes de este caso, ¿había sido condenado por un delito de sustancias controladas conforme a la ley federal o la de cualquier estado?", helperText: "Incluya las condenas fuera de Mississippi. Un arresto o cargo por sí solo no es una condena." } }
  },
  {
    ...common, ...yesNo, id: "ms_prior_conditional_discharge",
    prompt: "Before this case, had you already received a discharge and dismissal under Mississippi's § 41-29-150(d)?",
    helperText: "This asks about an earlier use of this specific conditional-discharge procedure, not every prior expungement.",
    translations: { es: { prompt: "Antes de este caso, ¿ya había recibido un descargo y una desestimación conforme a la sección 41-29-150(d) de Mississippi?", helperText: "La pregunta se refiere a un uso anterior de este procedimiento específico de descargo condicional, no a cualquier eliminación previa de antecedentes." } }
  },
  {
    ...common, ...yesNo, id: "ms_adjudication_deferred",
    prompt: "Does the order show that the court deferred the proceedings without entering a judgment of guilt?",
    helperText: "Check the actual order. Finishing probation after a conviction is a different record.",
    translations: { es: { prompt: "¿La orden indica que el tribunal aplazó el procedimiento sin dictar una sentencia de culpabilidad?", helperText: "Consulte la orden real. Terminar la libertad condicional después de una condena es una situación distinta." } }
  }
];
