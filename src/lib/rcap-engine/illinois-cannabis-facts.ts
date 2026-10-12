import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const IL_CANNABIS_PATHWAY = "cannabis-specific-automatic-or-petition-expungement";
export const IL_CANNABIS_FACT_IDS = ["il_cannabis_statute", "il_cannabis_next_step", "il_cannabis_conviction_class", "il_cannabis_nonfinancial_complete"] as const;
type Answers = Record<string, unknown>;
type Selection = { status: "not_applicable" }
  | { status: "clarification"; missingQuestionIds: string[] }
  | { status: "selected"; pathwayId: string; branch: "nonconviction" | "program" | "status_check" | "conviction" | "other_felony" };

/** IL.memo il-cannabis-auto / il-cannabis-vacate and 20 ILCS 2630/5.2(i).
 * The actual statute and final disposition identify this existing candidate.
 * Neither its automatic conditions nor motion eligibility follow from the
 * statute alone. In particular, a charge level is not a conviction class.
 */
export function illinoisCannabisFromAnswers(answers: Answers): Selection {
  const statute = answers.il_cannabis_statute;
  if (statute === undefined || statute === "other_statute") return { status: "not_applicable" };
  if (statute !== "720_ILCS_550_4" && statute !== "720_ILCS_550_5") {
    return { status: "clarification", missingQuestionIds: ["il_cannabis_statute"] };
  }
  // A specific cannabis procedure is not silently preferred over other relief
  // for the same record. This is an explicit service election, separate from
  // the optional legal-name hint. Asking about status never elects a motion.
  if (answers.il_cannabis_next_step === "other_relief") return { status: "not_applicable" };
  if (!["status_check", "vacate_conviction"].includes(String(answers.il_cannabis_next_step))) {
    return { status: "clarification", missingQuestionIds: ["il_cannabis_next_step"] };
  }
  const outcome = answers.case_outcome;
  if (["Arrest or citation with no charge filed", "Dismissed, no-billed, nolle prosequi, or not prosecuted", "Acquitted or found not guilty"].includes(String(outcome))) {
    if (answers.il_cannabis_next_step === "vacate_conviction") return { status: "clarification", missingQuestionIds: ["case_outcome", "il_cannabis_next_step"] };
    return { status: "selected", pathwayId: IL_CANNABIS_PATHWAY, branch: "nonconviction" };
  }
  if (outcome === "Diversion, deferred disposition, supervision, or similar program") {
    if (answers.il_cannabis_next_step === "vacate_conviction") return { status: "clarification", missingQuestionIds: ["case_outcome"] };
    return { status: "selected", pathwayId: IL_CANNABIS_PATHWAY, branch: "program" };
  }
  // The combined juvenile/adult-minor answer and pardon do not establish a
  // final adult conviction for this motion. Preserve the uncertainty.
  if (outcome !== "Misdemeanor conviction" && outcome !== "Felony conviction") {
    return { status: "clarification", missingQuestionIds: ["case_outcome"] };
  }
  if (answers.il_cannabis_next_step === "status_check") return { status: "selected", pathwayId: IL_CANNABIS_PATHWAY, branch: "status_check" };
  const recordClass = answers.il_cannabis_conviction_class;
  if (!["misdemeanor", "class_4_felony", "other_felony"].includes(String(recordClass))) {
    return { status: "clarification", missingQuestionIds: ["il_cannabis_conviction_class"] };
  }
  if ((outcome === "Misdemeanor conviction") !== (recordClass === "misdemeanor")) {
    return { status: "clarification", missingQuestionIds: ["case_outcome", "il_cannabis_conviction_class"] };
  }
  if (recordClass !== "other_felony" && !["yes", "no"].includes(String(answers.il_cannabis_nonfinancial_complete))) {
    return { status: "clarification", missingQuestionIds: ["il_cannabis_nonfinancial_complete"] };
  }
  return { status: "selected", pathwayId: IL_CANNABIS_PATHWAY,
    branch: recordClass === "other_felony" ? "other_felony" : "conviction" };
}

export function illinoisCannabisQuestionApplies(jurisdiction: string, answers: Answers, id: string): boolean {
  if (jurisdiction !== "IL" || !IL_CANNABIS_FACT_IDS.some(factId => factId === id) || id === "il_cannabis_statute") return true;
  const cannabis = ["720_ILCS_550_4", "720_ILCS_550_5"].includes(String(answers.il_cannabis_statute));
  return cannabis && (id === "il_cannabis_next_step"
    || (answers.il_cannabis_next_step === "vacate_conviction" && ["Misdemeanor conviction", "Felony conviction"].includes(String(answers.case_outcome))));
}

// Source-backed drafts. No independent language approval is asserted.
export const IL_CANNABIS_QUESTIONS: PublicQuestion[] = [
  {
    id: "il_cannabis_statute", stage: "pathway_routing", type: "single_choice",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter",
    prompt: "Which law is listed for this offense in the Illinois case record?",
    helperText: "Use the exact statute on the record, including an amended charge. A reference to drugs or cannabis alone does not identify the statute. Separate charges may need separate review.",
    options: ["720_ILCS_550_4", "720_ILCS_550_5", "other_statute", "other_or_unknown"],
    optionDisplay: {
      "720_ILCS_550_4": { label: "Cannabis Control Act, section 4 (720 ILCS 550/4)", translations: { es: { label: "Ley de Control del Cannabis, sección 4 (720 ILCS 550/4)" } } },
      "720_ILCS_550_5": { label: "Cannabis Control Act, section 5 (720 ILCS 550/5)", translations: { es: { label: "Ley de Control del Cannabis, sección 5 (720 ILCS 550/5)" } } },
      other_statute: { label: "Another statute", translations: { es: { label: "Otra ley" } } },
      other_or_unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
    },
    translations: { es: {
      prompt: "¿Qué ley figura para este delito en el expediente del caso de Illinois?",
      helperText: "Use la ley exacta indicada en el expediente, incluido cualquier cargo modificado. Una referencia a drogas o cannabis por sí sola no identifica la ley. Los cargos distintos pueden requerir revisiones separadas."
    } }
  },
  {
    id: "il_cannabis_next_step", stage: "pathway_routing", type: "single_choice",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter",
    prompt: "What would you like help with for this cannabis record?",
    helperText: "Checking whether a record was already cleared is different from asking a court to set aside a conviction. You can also continue to review other record-clearing options.",
    options: ["status_check", "vacate_conviction", "other_relief"],
    optionDisplay: {
      status_check: { label: "Check whether the record was already cleared", translations: { es: { label: "Verificar si el registro ya fue eliminado" } } },
      vacate_conviction: { label: "Ask the court to set aside a cannabis conviction", translations: { es: { label: "Pedir al tribunal que deje sin efecto una condena por cannabis" } } },
      other_relief: { label: "Review other record-clearing options", translations: { es: { label: "Revisar otras opciones para limpiar los antecedentes" } } }
    },
    translations: { es: {
      prompt: "¿En qué desea ayuda con este registro por cannabis?",
      helperText: "Verificar si un registro ya fue eliminado es diferente de pedir a un tribunal que deje sin efecto una condena. También puede continuar para revisar otras opciones para limpiar sus antecedentes."
    } }
  },
  {
    id: "il_cannabis_conviction_class", stage: "pathway_routing", type: "single_choice",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter",
    prompt: "What class does the final cannabis conviction record show?",
    helperText: "Use the class of the conviction, which may differ from the original charge. Do not infer Class 4 from a general felony answer.",
    options: ["misdemeanor", "class_4_felony", "other_felony", "other_or_unknown"],
    optionDisplay: {
      misdemeanor: { label: "Misdemeanor", translations: { es: { label: "Delito menor" } } },
      class_4_felony: { label: "Class 4 felony", translations: { es: { label: "Delito grave de clase 4" } } },
      other_felony: { label: "Class 3, 2, 1 or X felony", translations: { es: { label: "Delito grave de clase 3, 2, 1 o X" } } },
      other_or_unknown: { label: "Another classification or I am not sure", translations: { es: { label: "Otra clasificación o no estoy seguro" } } }
    },
    translations: { es: {
      prompt: "¿Qué clase indica el registro de la condena final por cannabis?",
      helperText: "Use la clase de la condena, que puede ser diferente de la del cargo original. No suponga que es de clase 4 solo porque se indicó delito grave."
    } }
  },
  {
    id: "il_cannabis_nonfinancial_complete", stage: "pathway_routing", type: "single_choice",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_timing_gate",
    prompt: "Have you completed every nonfinancial part of this cannabis sentence and its conditions?",
    helperText: "Include any jail or prison term, probation, supervision, treatment, classes and community service ordered in this case. Answer separately from whether money has been paid; do not change an unpaid balance to paid.",
    options: ["yes", "no", "other_or_unknown"],
    optionDisplay: {
      yes: { label: "Yes, every nonfinancial requirement is complete", translations: { es: { label: "Sí, todos los requisitos no económicos están cumplidos" } } },
      no: { label: "No, a nonfinancial requirement remains", translations: { es: { label: "No, queda un requisito no económico pendiente" } } },
      other_or_unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
    },
    translations: { es: {
      prompt: "¿Ha cumplido todas las partes no económicas de esta sentencia por cannabis y sus condiciones?",
      helperText: "Incluya cualquier período de cárcel o prisión, libertad condicional, supervisión, tratamiento, clases y servicio comunitario ordenado en este caso. Responda por separado de si se ha pagado dinero; no cambie un saldo pendiente a pagado."
    } }
  }
];
