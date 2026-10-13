import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const KS_DISTRICT_FACT_IDS = [
  "ks_district_request", "ks_district_program_record", "ks_district_diversion_fulfilled", "ks_specialty_program_basis",
  "ks_specialty_requirements_completed", "ks_prostitution_record_statute", "ks_coercion_acts",
  "ks_registration_basis"
] as const;
type Answers = Record<string, unknown>;
const text = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
export type KansasDistrictSelection =
  | { status: "clarification"; missingQuestionIds: string[] }
  | { status: "district_review"; code: "appeal_scope" | "registration_only" | "registration_basis" | "specialty_program" | "coercion_record" | "coercion_acts" | "program_record" }
  | { status: "selected"; pathwayId: string; branch: "district_conviction" | "district_fulfilled_diversion" | "district_unfulfilled_diversion" | "district_specialty" | "district_coercion" | "district_registration" };

/** K.S.A.21-6614(a)(1)-(3),(b),(f),(i);22-4908(a),(i), KS.memo.
 * An actual service election and separate record facts identify a candidate.
 * This does not decide offense exceptions, clocks, proof or payment authority.
 * Never prefer one overlapping remedy from a menu label or array ordering.
 */
export function kansasDistrictFromAnswers(answers: Answers): KansasDistrictSelection {
  // Subsection(i) directs the district clerk to send the order to municipal
  // court. It does not supply the exact current district form/venue binding.
  if (answers.ks_record_court_scope === "municipal_appealed_to_district") return { status: "district_review", code: "appeal_scope" };
  const missing = (...missingQuestionIds: string[]): KansasDistrictSelection => ({ status: "clarification", missingQuestionIds });
  const outcome = answers.case_outcome;
  const diversion = outcome === "Diversion, deferred disposition, supervision, or similar program";
  if (!diversion && outcome !== "Misdemeanor conviction" && outcome !== "Felony conviction") return missing("case_outcome");
  const request = text(answers.ks_district_request);
  if (!["record_expungement", "specialty_completion", "coercion_prostitution", "registration_and_expungement", "registration_only"].includes(String(request))) return missing("ks_district_request");
  if (request === "registration_only") return { status: "district_review", code: "registration_only" };
  if (diversion && (request === "record_expungement" || request === "coercion_prostitution")) {
    if (!["diversion_agreement", "other_program"].includes(text(answers.ks_district_program_record) ?? "")) return missing("ks_district_program_record");
    if (answers.ks_district_program_record !== "diversion_agreement") return { status: "district_review", code: "program_record" };
  }
  if (request === "registration_and_expungement") {
    if (diversion) return missing("case_outcome", "ks_district_request");
    const basis = text(answers.ks_registration_basis);
    if (!["drug_only", "sex_or_violent", "mixed", "not_required"].includes(String(basis))) return missing("ks_registration_basis");
    if (basis !== "drug_only") return { status: "district_review", code: "registration_basis" };
    return { status: "selected", pathwayId: "drug-registration-relief-coordination", branch: "district_registration" };
  }
  if (request === "specialty_completion") {
    if (diversion) return missing("case_outcome", "ks_district_request");
    const basis = text(answers.ks_specialty_program_basis);
    if (!["court_established_20_173", "other_program"].includes(String(basis))) return missing("ks_specialty_program_basis");
    if (basis !== "court_established_20_173") return { status: "district_review", code: "specialty_program" };
    if (!["yes", "no"].includes(text(answers.ks_specialty_requirements_completed) ?? "")) return missing("ks_specialty_requirements_completed");
    if (answers.ks_specialty_requirements_completed !== "yes") return { status: "district_review", code: "specialty_program" };
    return { status: "selected", pathwayId: "specialty-court-accelerated", branch: "district_specialty" };
  }
  if (request === "coercion_prostitution") {
    const statute = text(answers.ks_prostitution_record_statute);
    if (!["21-6419", "former_21-3512", "other"].includes(String(statute))) return missing("ks_prostitution_record_statute");
    if (statute === "other") return { status: "district_review", code: "coercion_record" };
    const acts = text(answers.ks_coercion_acts);
    if (acts === "prefer_not_to_answer") return { status: "district_review", code: "coercion_acts" };
    if (!["yes", "no"].includes(String(acts))) return missing("ks_coercion_acts");
    if (acts !== "yes") return { status: "district_review", code: "coercion_acts" };
    // The requested coercion procedure has its own sentence/diversion clock.
    // Selection alone does not certify coercion or completed diversion terms.
    return { status: "selected", pathwayId: "prostitution-coercion", branch: "district_coercion" };
  }
  if (diversion) {
    if (!["yes", "no"].includes(text(answers.ks_district_diversion_fulfilled) ?? "")) return missing("ks_district_diversion_fulfilled");
    return { status: "selected", pathwayId: "conviction-or-diversion-216614",
      branch: answers.ks_district_diversion_fulfilled === "yes" ? "district_fulfilled_diversion" : "district_unfulfilled_diversion" };
  }
  return { status: "selected", pathwayId: "conviction-or-diversion-216614", branch: "district_conviction" };
}

export function kansasDistrictQuestionApplies(answers: Answers, id: string): boolean {
  if (!KS_DISTRICT_FACT_IDS.some(fact => fact === id)) return true;
  if (answers.ks_record_court_scope !== "district_state_law") return false;
  const outcome = answers.case_outcome;
  if (!["Misdemeanor conviction", "Felony conviction", "Diversion, deferred disposition, supervision, or similar program"].includes(String(outcome))) return false;
  if (id === "ks_district_request") return true;
  const request = text(answers.ks_district_request);
  if (id === "ks_district_program_record") return ["record_expungement", "coercion_prostitution"].includes(String(request)) && outcome === "Diversion, deferred disposition, supervision, or similar program";
  if (id === "ks_district_diversion_fulfilled") return request === "record_expungement" && outcome === "Diversion, deferred disposition, supervision, or similar program" && answers.ks_district_program_record === "diversion_agreement";
  if (id === "ks_registration_basis") return request === "registration_and_expungement" && outcome !== "Diversion, deferred disposition, supervision, or similar program";
  if (id === "ks_specialty_program_basis") return request === "specialty_completion" && outcome !== "Diversion, deferred disposition, supervision, or similar program";
  if (id === "ks_specialty_requirements_completed") return request === "specialty_completion" && answers.ks_specialty_program_basis === "court_established_20_173" && outcome !== "Diversion, deferred disposition, supervision, or similar program";
  const coercion = request === "coercion_prostitution" && (outcome !== "Diversion, deferred disposition, supervision, or similar program" || answers.ks_district_program_record === "diversion_agreement");
  if (id === "ks_prostitution_record_statute") return coercion;
  return coercion && ["21-6419", "former_21-3512"].includes(String(answers.ks_prostitution_record_statute));
}

type Option = [string, string, string];
function question(id: string, prompt: string, helperText: string, esPrompt: string, esHelper: string, options: Option[]): PublicQuestion {
  return { id, stage: "pathway_routing", type: "single_choice", required: false, contextOnly: false,
    doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter", prompt, helperText,
    options: options.map(([value]) => value),
    optionDisplay: Object.fromEntries(options.map(([value, label, es]) => [value, { label, translations: { es: { label: es } } }])),
    translations: { es: { prompt: esPrompt, helperText: esHelper } } };
}
const unknown: Option = ["unknown", "I am not sure", "No estoy seguro"];
const yesNo: Option[] = [["yes", "Yes", "Sí"], ["no", "No", "No"], unknown];

// Source-backed draft copy; independent legal/language acceptance remains open.
export const KS_DISTRICT_QUESTIONS: PublicQuestion[] = [
  question("ks_district_request", "What would you like help asking the district court to do for this case?",
    "This is your request, not a statement that you qualify. We will check the record facts separately. Clearing a case and ending registration are different requests; neither happens merely because you select it. You can change your request.",
    "¿Qué desea ayuda para pedir al tribunal de distrito en este caso?",
    "Esta es su solicitud, no una afirmación de que cumple los requisitos. Revisaremos los hechos del expediente por separado. Eliminar un caso y poner fin a la inscripción son solicitudes distintas; ninguna ocurre solo por seleccionarla. Puede cambiar su solicitud.", [
      ["record_expungement", "Clear the conviction or diversion record through the ordinary process", "Eliminar el registro de la condena o del desvío por el procedimiento ordinario"],
      ["specialty_completion", "Consider clearing the conviction based on completing a specialty court program", "Considerar eliminar la condena por haber completado un programa de un tribunal especializado"],
      ["coercion_prostitution", "Consider coercion by another person in a prostitution case", "Considerar la coacción ejercida por otra persona en un caso de prostitución"],
      ["registration_and_expungement", "Ask to end drug-offender registration and also clear the related conviction", "Pedir que termine la inscripción como delincuente por drogas y eliminar también la condena relacionada"],
      ["registration_only", "Ask to end registration without also requesting expungement", "Pedir que termine la inscripción sin solicitar también la eliminación de antecedentes"], unknown
    ]),
  question("ks_district_program_record", "What does the record call the arrangement in this district-court case?",
    "Check the agreement or court record. The earlier program answer covers several different arrangements; it does not by itself establish a diversion agreement.",
    "¿Cómo denomina el expediente el acuerdo o programa de este caso del tribunal de distrito?",
    "Revise el acuerdo o expediente judicial. La respuesta anterior sobre un programa abarca varias situaciones distintas; por sí sola no establece un acuerdo de desvío.", [
      ["diversion_agreement", "A diversion agreement instead of further criminal proceedings", "Un acuerdo de desvío en lugar de continuar el proceso penal"],
      ["other_program", "Another program or arrangement", "Otro programa o acuerdo"], unknown
    ]),
  question("ks_district_diversion_fulfilled", "Have you fulfilled all the terms of this district-court diversion agreement?",
    "Check the agreement and completion record. A municipal agreement, program admission, or completion of one task does not establish this agreement's fulfillment.",
    "¿Ha cumplido todos los términos de este acuerdo de desvío del tribunal de distrito?",
    "Revise el acuerdo y el registro de cumplimiento. Un acuerdo municipal, la admisión a un programa o completar una tarea no demuestra el cumplimiento de este acuerdo.", yesNo),
  question("ks_specialty_program_basis", "What does the court's program record say about the program you attended?",
    "Look for a specialty court established under K.S.A. 20-173. Ordinary diversion, treatment or a locally run program is not enough to establish that fact. If the record does not say, choose I am not sure.",
    "¿Qué indica el expediente del tribunal sobre el programa al que asistió?",
    "Busque un tribunal especializado establecido conforme a K.S.A. 20-173. Un desvío ordinario, tratamiento o programa local no basta para establecer ese hecho. Si el expediente no lo indica, elija No estoy seguro.", [
      ["court_established_20_173", "The record identifies a specialty court established under K.S.A. 20-173", "El expediente identifica un tribunal especializado establecido conforme a K.S.A. 20-173"],
      ["other_program", "The record identifies a different program", "El expediente identifica otro programa"], unknown
    ]),
  question("ks_specialty_requirements_completed", "Does the record confirm that you completed all requirements of that specialty court program?",
    "Admission or attendance alone is not completion. Completion does not establish that the offense qualifies for this procedure; offense, registration and other statutory exceptions still need review.",
    "¿Confirma el expediente que cumplió todos los requisitos de ese programa del tribunal especializado?",
    "La admisión o asistencia por sí sola no equivale a completar el programa. Completarlo no demuestra que el delito reúna los requisitos de este procedimiento; aún deben revisarse el delito, la inscripción y otras excepciones legales.", yesNo),
  question("ks_prostitution_record_statute", "Which statute appears for the conviction or diversion in this prostitution case?",
    "Use the final conviction or diversion record, including an amended charge. A general description or the original charge does not establish the final statute.",
    "¿Qué ley figura para la condena o el desvío en este caso de prostitución?",
    "Use el registro final de la condena o del desvío, incluido cualquier cargo modificado. Una descripción general o el cargo original no establece la ley final.", [
      ["21-6419", "K.S.A. 21-6419", "K.S.A. 21-6419"], ["former_21-3512", "Former K.S.A. 21-3512", "Antigua K.S.A. 21-3512"], ["other", "Another statute", "Otra ley"], unknown
    ]),
  question("ks_coercion_acts", "Did another person's actions cause you to participate through any of these circumstances?",
    "Threats of harm or physical restraint against anyone; a plan or pattern meant to make you believe that not participating would cause bodily harm or restraint to anyone; or misuse or threatened misuse of legal proceedings. You do not need to describe details here. The court decides whether the evidence proves coercion.",
    "¿Las acciones de otra persona hicieron que participara mediante alguna de estas circunstancias?",
    "Amenazas de daño o restricción física contra cualquier persona; un plan o patrón destinado a hacerle creer que no participar causaría daño corporal o restricción a alguien; o uso indebido o amenaza de uso indebido de procedimientos legales. No necesita describir detalles aquí. El tribunal decide si las pruebas demuestran coacción.", [...yesNo, ["prefer_not_to_answer", "I prefer to discuss this privately", "Prefiero hablar de esto en privado"]]),
  question("ks_registration_basis", "What does your current registration record say is the reason you must register?",
    "Use the registration record, not just the name of the charge in this case. A drug-only registration request has different rules from sex-offender or violent-offender registration. Time, compliance and any out-of-state registration duties still need separate review.",
    "¿Qué motivo indica su registro actual para la obligación de inscribirse?",
    "Use el registro de inscripción, no solo el nombre del cargo de este caso. Una solicitud por inscripción únicamente por drogas tiene reglas distintas de la inscripción por delitos sexuales o violentos. El tiempo, el cumplimiento y cualquier obligación de inscripción de otro estado requieren una revisión separada.", [
      ["drug_only", "Drug-offender registration only", "Inscripción únicamente como delincuente por drogas"], ["sex_or_violent", "Sex-offender or violent-offender registration", "Inscripción por delitos sexuales o violentos"],
      ["mixed", "More than one registration category", "Más de una categoría de inscripción"], ["not_required", "I am not currently required to register", "Actualmente no tengo obligación de inscribirme"], unknown
    ])
];
