import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const MS_PROGRAM_COMPLETION_PATHWAYS: Record<string, string> = {
  "nonadjudication-under-99-15-26": "99-15-26",
  "pretrial-intervention-or-diversion-expungement": "99-15-101"
};
export const MS_PROGRAM_COMPLETION_FACT_IDS = ["ms_program_arrest_release", "ms_program_completion_date", "ms_program_disposition_date"] as const;

export function msProgramCompletionQuestionApplies(jurisdiction: string, answers: Record<string, unknown>, id: string) {
  return jurisdiction !== "MS" || !MS_PROGRAM_COMPLETION_FACT_IDS.some(fact => fact === id)
    || ["99-15-26", "99-15-101"].includes(String(answers.ms_program_order))
      && ["completed_and_closed", "completed_without_closure"].includes(String(answers.ms_program_record_status));
}

/** LD-MS-01 / MS.memo ms-nonadj and pretrial branch of ms-diversion.
 * Establish the completed event only. An admission request, optional route
 * label, elapsed bucket or another program's discharge is not that event.
 * Admission restrictions, other evaluator gates and fulfillment remain separate.
 */
export function msProgramCompletionPredicates(pathwayId: string, answers: Record<string, unknown>):
  | { status: "missing"; ids: string[] }
  | { status: "review" }
  | { status: "satisfied" } {
  const program = MS_PROGRAM_COMPLETION_PATHWAYS[pathwayId];
  const ids: string[] = [];
  if (!program || answers.ms_program_order !== program) ids.push("ms_program_order");
  if (!["completed_and_closed", "completed_without_closure"].includes(String(answers.ms_program_record_status))) ids.push("ms_program_record_status");
  const final = answers.ms_program_final_disposition;
  if (!(program === "99-15-26" ? ["dismissed_and_closed"] : ["dismissed_and_closed", "charges_dropped", "no_disposition"]).includes(String(final))) ids.push("ms_program_final_disposition");
  if (answers.court_requirements_completed !== "yes") ids.push("court_requirements_completed");
  if (!["arrested_and_released", "not_arrested", "not_released"].includes(String(answers.ms_program_arrest_release))) ids.push("ms_program_arrest_release");
  if (ids.length) return { status: "missing", ids };
  if (answers.ms_program_arrest_release !== "arrested_and_released") return { status: "review" };
  return { status: "satisfied" };
}

const common = { stage: "pathway_routing", required: false, contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter" } as const;
export const MS_PROGRAM_COMPLETION_QUESTIONS: PublicQuestion[] = [
  {
    ...common, id: "ms_program_arrest_release", type: "single_choice",
    prompt: "Were you arrested in this case and then released?",
    helperText: "Use the arrest and release record for this case. Completing a program does not by itself establish either event.",
    options: ["arrested_and_released", "not_arrested", "not_released", "unknown"],
    optionDisplay: {
      arrested_and_released: { label: "I was arrested and then released", translations: { es: { label: "Fui arrestado y después puesto en libertad" } } },
      not_arrested: { label: "I was not arrested in this case", translations: { es: { label: "No fui arrestado en este caso" } } },
      not_released: { label: "I was arrested but have not been released", translations: { es: { label: "Fui arrestado, pero no he sido puesto en libertad" } } },
      unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
    },
    translations: { es: { prompt: "¿Fue arrestado en este caso y después puesto en libertad?", helperText: "Consulte el registro de arresto y puesta en libertad de este caso. Completar un programa no establece por sí solo ninguno de estos hechos." } }
  },
  {
    ...common, id: "ms_program_completion_date", type: "date_or_unknown",
    prompt: "If you have it, what date does the record give for successful completion of this program?",
    helperText: "This is optional for the preliminary check. Use the completion record, not an admission, conviction or expected completion date. No extra waiting period is added after the required completion and case disposition.",
    translations: { es: { prompt: "Si la tiene, ¿qué fecha indica el expediente para el cumplimiento satisfactorio de este programa?", helperText: "Esta fecha es opcional para la evaluación preliminar. Consulte el registro de cumplimiento, no una fecha de admisión, condena o cumplimiento previsto. No se añade un período de espera después del cumplimiento y la resolución del caso requeridos." } }
  },
  {
    ...common, id: "ms_program_disposition_date", type: "date_or_unknown",
    prompt: "If a dismissal or dropped-charge disposition was entered, what date does that record show?",
    helperText: "This date is optional for the preliminary check. Leave it blank if there was no disposition; do not use a program completion date in its place.",
    translations: { es: { prompt: "Si se registró una desestimación o el retiro de los cargos, ¿qué fecha indica ese registro?", helperText: "Esta fecha es opcional para la evaluación preliminar. Déjela en blanco si no hubo una resolución; no use la fecha de cumplimiento del programa en su lugar." } }
  }
];
