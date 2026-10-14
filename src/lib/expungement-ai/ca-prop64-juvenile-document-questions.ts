import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

const text = (id: string, prompt: string, promptEs: string, helperText: string, helperEs: string, type: ProfileQuestion["type"] = "text_or_unknown", required = true): ProfileQuestion => ({
  id, prompt, helperText, type, required, contextOnly: false, stage: "packet_information", options: null,
  translations: { es: { prompt: promptEs, helperText: helperEs } }
});
const choice = (id: string, prompt: string, promptEs: string, entries: Array<[string, string, string]>, required = true): ProfileQuestion => ({
  ...text(id, prompt, promptEs, "Use the actual juvenile court record. An unknown answer stays unresolved.", "Use el expediente real del tribunal de menores. Una respuesta desconocida queda sin resolver.", "single_choice", required),
  options: [...entries.map(([id]) => id), "unknown"], optionDisplay: Object.fromEntries([...entries, ["unknown", "I am not sure", "No estoy seguro"]].map(([id, label, es]) => [id, { label, translations: { es: { label: es } } }]))
});
export const CA_JUVENILE_SECTIONS = ["11357", "11358", "11359", "11360"] as const;
/** Prospective protected-document controls, not registered screening questions.
 * Row indexes identify findings, not count numbers inferred from a case label. */
export function caProp64JuvenileFindingQuestions(index: number): ProfileQuestion[] {
  const prefix = index === 0 ? "ca_prop64_juvenile_finding" : `ca_prop64_juvenile_additional_${index}`;
  const questions: ProfileQuestion[] = [...(index === 0 ? [] : [text(`${prefix}_conduct_date`, "On what date did the conduct for this additional finding occur?", "¿En qué fecha ocurrieron los hechos de esta determinación adicional?", "Use the actual conduct date for this finding, not its adjudication date or the primary finding’s date. JV-744A states that you were under 18 for each listed offense. If the date or age is unresolved, keep this finding unresolved.", "Use la fecha real de los hechos de esta determinación, no la fecha de adjudicación ni la de la determinación principal. JV-744A afirma que tenía menos de 18 años en cada delito indicado. Si la fecha o la edad no se han resuelto, mantenga esta determinación sin resolver.", "date_or_unknown")]), text(`${prefix}_date`, "On what date did the juvenile court make this finding?", "¿En qué fecha emitió el tribunal de menores esta determinación?", "Copy the adjudication date from the court record, not the arrest, offense or sentencing date.", "Copie la fecha de adjudicación del expediente judicial, no la fecha del arresto, de los hechos ni de la sentencia.", "date_or_unknown"),
    { ...text(`${prefix}_sections`, "Which marijuana sections did the court find violated in this finding?", "¿Qué secciones sobre marihuana determinó el tribunal que se infringieron?", "Select every applicable section shown for this finding. Do not infer a section from the packet name.", "Seleccione cada sección que figure en esta determinación. No deduzca una sección del nombre del paquete.", "multi_select"), options: [...CA_JUVENILE_SECTIONS] }];
  return index === 0 ? questions : questions.map(question => ({ ...question,
    prompt: `Additional finding ${index}: ${question.prompt}`,
    translations: { es: { ...question.translations!.es!, prompt: `Determinación adicional ${index}: ${question.translations!.es!.prompt}` } }
  }));
}
export const CA_PROP64_JUVENILE_DOCUMENT_QUESTIONS: readonly ProfileQuestion[] = [
  text("ca_prop64_juvenile_case_name", "What exact case name or short title appears on the juvenile court record?", "¿Qué nombre de caso o título abreviado exacto figura en el expediente del tribunal de menores?", "Copy the actual caption. Do not create an In re caption from a person's name.", "Copie el encabezado real. No cree un título In re a partir del nombre de una persona."),
  text("ca_prop64_juvenile_case_number", "What is the juvenile court case number for this request?", "¿Cuál es el número de caso del tribunal de menores para esta solicitud?", "Use this juvenile case number, not a police or adult criminal case number.", "Use este número de caso de menores, no un número policial ni de un caso penal de adultos."),
  text("ca_prop64_juvenile_full_name", "What is the full name of the person requesting juvenile relief?", "¿Cuál es el nombre completo de la persona que solicita el alivio de menores?", "JV-744 item 1 asks for the applicant's name; this is not the attorney's or account holder's name.", "El punto 1 de JV-744 pide el nombre del solicitante; no es el nombre del abogado ni del titular de la cuenta."),
  text("ca_prop64_juvenile_date_of_birth", "What is that person's date of birth?", "¿Cuál es la fecha de nacimiento de esa persona?", "JV-744 item 1 asks for the actual birth date. Current age does not establish juvenile court posture.", "El punto 1 de JV-744 pide la fecha de nacimiento real. La edad actual no establece que el caso sea de menores.", "date_or_unknown"),
  choice("ca_prop64_juvenile_disposition", "What is the current juvenile disposition for this offense?", "¿Cuál es la disposición actual del caso de menores para este delito?", [["probation", "Currently on probation under this dispositional order", "Actualmente en libertad condicional conforme a esta disposición"], ["completed", "Probation completed; no longer a ward for this offense", "Libertad condicional cumplida; ya no está bajo tutela por este delito"], ["other", "Another or disputed disposition", "Otra disposición o una disposición controvertida"]]),
  ...caProp64JuvenileFindingQuestions(0),
  choice("ca_prop64_juvenile_additional_scope", "Does this request concern additional juvenile marijuana findings?", "¿Esta solicitud incluye determinaciones adicionales por marihuana en casos de menores?", [["none", "No additional findings", "No hay determinaciones adicionales"], ["same_case_remedy", "Additional findings with this same case number and requested remedy", "Determinaciones adicionales con el mismo número de caso y el mismo alivio solicitado"], ["separate", "A different case number or requested remedy", "Un número de caso o un alivio solicitado diferente"]]),
  text("ca_prop64_juvenile_additional_count", "How many additional findings with this same case number and remedy are included?", "¿Cuántas determinaciones adicionales con el mismo número de caso y el mismo alivio se incluyen?", "JV-744A has six rows per attachment. Different cases or remedies require separate JV-744 requests.", "JV-744A tiene seis filas por anexo. Los casos o alivios diferentes requieren solicitudes JV-744 separadas.", "number_or_range"),
  choice("ca_prop64_juvenile_hearing", "Do you want to request a hearing?", "¿Desea solicitar una audiencia?", [["none", "Do not request a hearing", "No solicitar una audiencia"], ["opposed", "Request a hearing only if the prosecutor opposes", "Solicitar una audiencia solo si la fiscalía se opone"], ["always", "Request a hearing even if unopposed", "Solicitar una audiencia aunque no haya oposición"]], false),
  choice("ca_prop64_juvenile_appearance_waiver", "Do you expressly choose to give up attendance at a hearing?", "¿Elige expresamente renunciar a asistir a una audiencia?", [["yes", "Yes, waive attendance", "Sí, renunciar a asistir"], ["no", "No, retain attendance rights", "No, conservar el derecho a asistir"]], false),
  choice("ca_prop64_juvenile_original_judge_waiver", "Do you expressly choose to waive the original sentencing judge?", "¿Elige expresamente renunciar al juez que dictó la disposición original?", [["yes", "Yes, make this separate waiver", "Sí, hacer esta renuncia por separado"], ["no", "No, do not waive this right", "No, no renunciar a este derecho"]], false),
  choice("ca_prop64_juvenile_interpreter", "If there is a hearing, will you need an interpreter?", "Si hay una audiencia, ¿necesitará un intérprete?", [["yes", "Yes", "Sí"], ["no", "No", "No"]], false),
  text("ca_prop64_juvenile_interpreter_language", "What language do you need the interpreter to use?", "¿En qué idioma necesita al intérprete?", "Use the requested hearing language. The language of this guide does not select an interpreter.", "Indique el idioma solicitado para la audiencia. El idioma de esta guía no selecciona un intérprete.")
];
export function caProp64JuvenileDocumentQuestions(answers: Readonly<Record<string, unknown>>, includeInactive = false): ProfileQuestion[] {
  const scalar = (id: string) => { const x = answers[id]; return x && typeof x === "object" && !Array.isArray(x) ? (x as { unknown?: unknown; value?: unknown }).unknown === true ? undefined : (x as { value?: unknown }).value : x; };
  const additional = scalar("ca_prop64_juvenile_additional_scope") === "same_case_remedy";
  const count = scalar("ca_prop64_juvenile_additional_count");
  const total = additional && typeof count === "number" && Number.isSafeInteger(count) && count > 0 ? count : 0;
  // Retain every existing row for correction, including unknown or malformed
  // answers; offer at most one additional source attachment of empty rows.
  // A declared count alone must not allocate an unbounded array.
  const existing = new Set(Object.keys(answers).flatMap(id => {
    const match = /^ca_prop64_juvenile_additional_(\d+)_(conduct_date|date|sections)$/.exec(id);
    const index = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(index) && index > 0 && (includeInactive || index <= total) ? [index] : [];
  }));
  let next = 1;
  for (let added = 0; added < 6 && next <= total; next++) {
    if (!existing.has(next)) { existing.add(next); added++; }
  }
  const rows = [...existing].sort((a, b) => a - b);
  return [...CA_PROP64_JUVENILE_DOCUMENT_QUESTIONS.filter(q => includeInactive || q.id !== "ca_prop64_juvenile_additional_count" || additional)
    .filter(q => includeInactive || q.id !== "ca_prop64_juvenile_interpreter_language" || scalar("ca_prop64_juvenile_interpreter") === "yes"),
    ...rows.flatMap(index => caProp64JuvenileFindingQuestions(index))];
}
