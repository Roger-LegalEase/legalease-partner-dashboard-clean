import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const GA_ORIGINAL_FIRST_OFFENDER_PATHWAY = "youthful-first-offender-restriction-route";
// HB 162 §§ 3–4, effective July 1, 2026. Draft EN/ES guidance only;
// qualified legal/language review and packet-contract correction remain open.
export const GA_FIRST_OFFENDER_GUIDANCE = {
  active_pre2026: [
    "Your answers describe an active First Offender sentence imposed before July 1, 2026. The petition procedure uses the court that imposed that sentence. Check the sentencing record and whether a restriction and sealing order already exists. We cannot prepare a packet for this branch yet.",
    "Sus respuestas describen una sentencia de First Offender todavía activa, impuesta antes del 1 de julio de 2026. El procedimiento de petición corresponde al tribunal que impuso esa sentencia. Consulte el documento de la sentencia y si ya existe una orden de restricción y sellado. Todavía no podemos preparar un paquete para este procedimiento."
  ],
  discharged_pre2026: [
    "Your answers describe exoneration and discharge under the First Offender Act before July 1, 2026. The petition procedure uses the court that granted that discharge. Check the discharge record and whether a restriction and sealing order already exists. We cannot prepare a packet for this branch yet.",
    "Sus respuestas describen una exoneración y un descargo conforme a la Ley First Offender anteriores al 1 de julio de 2026. El procedimiento de petición corresponde al tribunal que concedió ese descargo. Consulte el documento del descargo y si ya existe una orden de restricción y sellado. Todavía no podemos preparar un paquete para este procedimiento."
  ],
  sentencing_post2026: [
    "Your answers describe a First Offender sentence imposed on or after July 1, 2026. The court must order restriction and sealing at sentencing. Check with the sentencing court whether the order was entered and carried out. This result does not confirm that your records are sealed. We cannot prepare a packet for this branch yet.",
    "Sus respuestas describen una sentencia de First Offender impuesta el 1 de julio de 2026 o después. El tribunal debe ordenar la restricción y el sellado al dictar la sentencia. Consulte con el tribunal que dictó la sentencia si la orden se emitió y se cumplió. Este resultado no confirma que sus expedientes estén sellados. Todavía no podemos preparar un paquete para este procedimiento."
  ],
  discharged_post2026: [
    "Your answers describe exoneration and discharge under the First Offender Act on or after July 1, 2026. The law provides for restriction and sealing upon exoneration and discharge. Check with the court that granted the discharge whether the required steps were completed. This result does not confirm that your records are sealed. We cannot prepare a packet for this branch yet.",
    "Sus respuestas describen una exoneración y un descargo conforme a la Ley First Offender el 1 de julio de 2026 o después. La ley dispone la restricción y el sellado tras la exoneración y el descargo. Consulte con el tribunal que concedió el descargo si se completaron los pasos exigidos. Este resultado no confirma que sus expedientes estén sellados. Todavía no podemos preparar un paquete para este procedimiento."
  ]
} as const;

export function isGeorgiaFirstOffenderGuidance(reason: { code: string; text: string }): boolean {
  return Object.entries(GA_FIRST_OFFENDER_GUIDANCE).some(([branch, [text]]) =>
    reason.code === `ga.original_first_offender_${branch}` && reason.text === text);
}

export const GA_FIRST_OFFENDER_FACT_IDS = [
  "ga_original_first_offender", "ga_first_offender_status",
  "ga_first_offender_sentence_date", "ga_first_offender_discharge_date"
] as const;

type FirstOffenderFacts = Record<string, unknown>;
type FirstOffenderSelection =
  | { status: "not_applicable" }
  | { status: "clarification"; missingQuestionIds: string[] }
  | { status: "selected"; pathwayId: string; branch: "active_pre2026" | "discharged_pre2026" | "sentencing_post2026" | "discharged_post2026" | "revoked" };

function recordDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? value : undefined;
}

/** Candidate selection only. LD-GA-01 and the adopted GA memo distinguish an
 * originally imposed First Offender sentence from retroactive § 42-8-66 relief.
 * HB 162 §§ 3–4 supply separate sentence/discharge boundaries; completing
 * probation is not proof of exoneration and discharge. These screening answers
 * neither select a composed track nor satisfy a verified-document condition.
 */
export function georgiaFirstOffenderFromAnswers(answers: FirstOffenderFacts, today = new Date().toISOString().slice(0, 10)): FirstOffenderSelection {
  const original = answers.ga_original_first_offender;
  if (original !== "yes") {
    if ((original !== undefined && original !== "no")
      || (original !== "no" && answers.case_outcome === "Diversion, deferred disposition, supervision, or similar program")) {
      return { status: "clarification", missingQuestionIds: ["ga_original_first_offender"] };
    }
    // Never having received original treatment does not alone prove eligibility
    // for § 42-8-66 or elect it over other remedies.
    return { status: "not_applicable" };
  }
  const stage = answers.ga_first_offender_status;
  if (stage === "revoked_with_adjudication") {
    return { status: "selected", pathwayId: GA_ORIGINAL_FIRST_OFFENDER_PATHWAY, branch: "revoked" };
  }
  if (stage !== "active" && stage !== "exonerated_and_discharged") {
    return { status: "clarification", missingQuestionIds: ["ga_first_offender_status"] };
  }
  if (["Misdemeanor conviction", "Felony conviction", "Pardoned conviction"].includes(String(answers.case_outcome))) {
    return { status: "clarification", missingQuestionIds: ["case_outcome", "ga_first_offender_status"] };
  }
  const sentence = recordDate(answers.ga_first_offender_sentence_date);
  if (!sentence || sentence > today) return { status: "clarification", missingQuestionIds: ["ga_first_offender_sentence_date"] };
  if (stage === "exonerated_and_discharged") {
    const discharge = recordDate(answers.ga_first_offender_discharge_date);
    if (!discharge || discharge > today) return { status: "clarification", missingQuestionIds: ["ga_first_offender_discharge_date"] };
    if (discharge < sentence) {
      return { status: "clarification", missingQuestionIds: ["ga_first_offender_sentence_date", "ga_first_offender_discharge_date"] };
    }
    return { status: "selected", pathwayId: GA_ORIGINAL_FIRST_OFFENDER_PATHWAY,
      branch: discharge < "2026-07-01" ? "discharged_pre2026" : "discharged_post2026" };
  }
  return { status: "selected", pathwayId: GA_ORIGINAL_FIRST_OFFENDER_PATHWAY,
    branch: sentence < "2026-07-01" ? "active_pre2026" : "sentencing_post2026" };
}

export function georgiaFirstOffenderQuestionApplies(jurisdiction: string, answers: FirstOffenderFacts, questionId: string): boolean {
  if (jurisdiction !== "GA" || !GA_FIRST_OFFENDER_FACT_IDS.some(id => id === questionId)
    || questionId === "ga_original_first_offender") return true;
  if (answers.ga_original_first_offender !== "yes") return false;
  return questionId !== "ga_first_offender_discharge_date" || answers.ga_first_offender_status === "exonerated_and_discharged";
}

// Source-backed draft EN/ES copy; independent language review is still required.
export const GA_FIRST_OFFENDER_QUESTIONS: PublicQuestion[] = [
  {
    id: "ga_original_first_offender", stage: "pathway_routing", type: "single_choice",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter",
    prompt: "Did the court originally sentence you under Georgia's First Offender Act in this case?",
    helperText: "Check the original sentencing record. Having no earlier conviction, being young, or finishing a program does not by itself mean the court imposed First Offender treatment. A later request for retroactive treatment is different.",
    options: ["yes", "no", "other_or_unknown"],
    optionDisplay: {
      yes: { label: "Yes, the original sentence imposed First Offender treatment", translations: { es: { label: "Sí, la sentencia original dispuso el tratamiento de First Offender" } } },
      no: { label: "No, the original sentence did not impose that treatment", translations: { es: { label: "No, la sentencia original no dispuso ese tratamiento" } } },
      other_or_unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
    },
    translations: { es: {
      prompt: "¿El tribunal lo sentenció originalmente conforme a la Ley First Offender de Georgia en este caso?",
      helperText: "Consulte el documento de la sentencia original. No tener condenas anteriores, ser joven o completar un programa no significa por sí solo que el tribunal haya dispuesto el tratamiento de First Offender. Una solicitud posterior de tratamiento retroactivo es diferente."
    } }
  },
  {
    id: "ga_first_offender_status", stage: "pathway_routing", type: "single_choice",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter",
    prompt: "What does the record show about that First Offender sentence now?",
    helperText: "Completing probation alone does not confirm exoneration and discharge. If the record does not establish the current status, choose I am not sure.",
    options: ["active", "exonerated_and_discharged", "revoked_with_adjudication", "other_or_unknown"],
    optionDisplay: {
      active: { label: "Still active; no exoneration and discharge", translations: { es: { label: "Sigue activa; no hay exoneración ni descargo" } } },
      exonerated_and_discharged: { label: "Exonerated and discharged without adjudication of guilt", translations: { es: { label: "Exonerado y descargado sin adjudicación de culpabilidad" } } },
      revoked_with_adjudication: { label: "First Offender sentence revoked and adjudicated guilty", translations: { es: { label: "Sentencia de First Offender revocada y culpabilidad adjudicada" } } },
      other_or_unknown: { label: "Another status or I am not sure", translations: { es: { label: "Otro estado o no estoy seguro" } } }
    },
    translations: { es: {
      prompt: "¿Qué indica ahora el expediente sobre esa sentencia de First Offender?",
      helperText: "Completar la libertad condicional por sí solo no confirma la exoneración y el descargo. Si el expediente no establece el estado actual, elija No estoy seguro."
    } }
  },
  {
    id: "ga_first_offender_sentence_date", stage: "pathway_routing", type: "date_or_unknown",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter", options: null,
    prompt: "On what date did the court originally impose the First Offender sentence?",
    helperText: "Use the sentencing date from the original record, not the arrest date or the date you finished probation.",
    translations: { es: {
      prompt: "¿En qué fecha impuso el tribunal originalmente la sentencia de First Offender?",
      helperText: "Use la fecha de la sentencia del expediente original, no la fecha del arresto ni la fecha en que terminó la libertad condicional."
    } }
  },
  {
    id: "ga_first_offender_discharge_date", stage: "pathway_routing", type: "date_or_unknown",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter", options: null,
    prompt: "On what date were you exonerated and discharged under the First Offender Act?",
    helperText: "Use the exoneration and discharge date confirmed by the case record. If only completion of probation is documented, choose I am not sure.",
    translations: { es: {
      prompt: "¿En qué fecha fue exonerado y descargado conforme a la Ley First Offender?",
      helperText: "Use la fecha de exoneración y descargo confirmada por el expediente. Si solo consta que completó la libertad condicional, elija No estoy seguro."
    } }
  }
];
