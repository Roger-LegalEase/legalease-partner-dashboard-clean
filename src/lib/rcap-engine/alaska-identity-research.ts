/** Existing R001 agency rules extracted without renderer, registry or approval side effects. */
export const AK_IDENTITY_ROUTE = "AK:sealing-for-mistaken-identity-or-false-accusation-as-12-62-180";
type Facts = Readonly<Record<string, unknown>>;
export type AlaskaIdentityDecision = {
  reviewId: "R001"; routeId: typeof AK_IDENTITY_ROUTE; branchId: string;
  status: "qualifying" | "guidance" | "excluded" | "unknown" | "not_yet" | "attorney_review";
  missingFactIds: string[]; documentIds: string[]; externalDocumentIds: string[];
  reason: string; reasonEs: string;
};
function text(value: unknown): string {
  if (Array.isArray(value)) return "";
  if (value && typeof value === "object" && (value as {unknown?: unknown}).unknown === true) return "";
  if (value && typeof value === "object") return text((value as {value?: unknown}).value);
  return value === null || value === undefined ? "" : String(value).trim();
}
function boolean(value: unknown): boolean | undefined {
  const answer = text(value).toLowerCase();
  if (["true", "yes", "sí", "si"].includes(answer)) return true;
  if (["false", "no"].includes(answer)) return false;
  return undefined;
}
function date(value: unknown): string | null {
  const answer = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(answer)) return null;
  const at = new Date(`${answer}T00:00:00Z`);
  return Number.isFinite(at.getTime()) && at.toISOString().slice(0, 10) === answer ? answer : null;
}
export const AK_IDENTITY_QUESTIONS = [
    { id: "ak_seal_record_origin", type: "single_choice", options: ["alaska", "other_state_or_federal", "unknown"], optionsEn: ["Alaska", "Another state or the federal government", "I am not sure"], optionsEs: ["Alaska", "Otro estado o el gobierno federal", "No estoy seguro/a"], en: "Did the record originate in Alaska?", es: "¿Se originó el expediente en Alaska?" },
    { id: "ak_seal_record_holder", type: "single_choice", options: ["alaska_dps", "other_agency", "unknown"], optionsEn: ["Alaska Department of Public Safety (DPS)", "Another record-holding agency", "I am not sure"], optionsEs: ["Departamento de Seguridad Pública de Alaska (DPS)", "Otra agencia que mantiene el expediente", "No estoy seguro/a"], en: "Is this the criminal-history record held by Alaska DPS?", es: "¿Es este el antecedente penal que mantiene el Departamento de Seguridad Pública de Alaska?" },
    { id: "ak_seal_request_stage", type: "single_choice", options: ["initial_request", "denied_or_contested", "unknown"], optionsEn: ["This is my initial request", "The request was denied or contested", "I am not sure"], optionsEs: ["Esta es mi solicitud inicial", "La solicitud fue denegada o cuestionada", "No estoy seguro/a"], en: "Is this your initial agency request, or has the agency denied or contested it?", es: "¿Es esta su solicitud inicial a la agencia, o la agencia la ha denegado o cuestionado?" },
    { id: "ak_seal_basis", type: "single_choice", options: ["mistaken_identity", "false_accusation", "dismissal_only", "unknown"], optionsEn: ["Mistaken identity", "False accusation", "Only a dismissal; neither reason established", "I am not sure"], optionsEs: ["Identidad equivocada", "Acusación falsa", "Solo una desestimación; ninguna de las dos razones está establecida", "No estoy seguro/a"], en: "Is your request based on mistaken identity or false accusation? A dismissal by itself does not establish either.", es: "¿Se basa su solicitud en identidad equivocada o en una acusación falsa? Una desestimación por sí sola no demuestra ninguna de las dos." },
    { id: "ak_seal_explanation", type: "text", en: "Explain the circumstances and the facts supporting mistaken identity or false accusation. Identify the other person or accuser if known; the agency applies the beyond-a-reasonable-doubt standard.", es: "Explique las circunstancias y los hechos que respaldan la identidad equivocada o la acusación falsa. Identifique a la otra persona o al acusador si los conoce; la agencia aplica el criterio de más allá de toda duda razonable." },
    { id: "ak_seal_arrest_or_citation", type: "yes_no_unknown", en: "Were you arrested or issued a citation for these charges?", es: "¿Fue arrestado o recibió una citación por estos cargos?" },
    { id: "ak_seal_prosecutor_referral", type: "yes_no_unknown", en: "Were these charges referred to a prosecutor?", es: "¿Se remitieron estos cargos a un fiscal?" },
    { id: "ak_seal_disposition", type: "single_choice", options: ["pending", "dismissed", "acquitted", "conviction_reversed_or_vacated", "pardoned", "convicted_without_reversal_or_pardon", "unknown"], optionsEn: ["Charges are pending", "The charges were dismissed", "I was acquitted", "The conviction was reversed or vacated", "I received a Governor’s pardon", "Convicted; no reversal, vacatur or pardon", "I am not sure"], optionsEs: ["Los cargos están pendientes", "Se desestimaron los cargos", "Fui absuelto/a", "La condena fue revocada o anulada", "Recibí un indulto del gobernador", "Condenado/a; sin revocación, anulación ni indulto", "No estoy seguro/a"], en: "What is the actual disposition of these charges?", es: "¿Cuál es el resultado real de estos cargos?" },
    { id: "ak_seal_verification_status", type: "single_choice", options: ["not_obtained", "available", "declined", "unknown"], optionsEn: ["I have not obtained the statements yet", "The actual statements are available", "A required official declined verification", "I am not sure"], optionsEs: ["Todavía no he obtenido las declaraciones", "Las declaraciones reales están disponibles", "Un funcionario requerido se negó a verificar", "No estoy seguro/a"], en: "Has a required officer or prosecutor declined to verify the request? You may obtain the required third-party statements after preparation; LegalEase does not invent or sign them.", es: "¿Se ha negado un oficial o fiscal requerido a verificar la solicitud? Puede obtener las declaraciones requeridas después de preparar la solicitud; LegalEase no las inventa ni las firma." }
] as const;

export const AK_IDENTITY_REASON_COPY = [
  [
    "A valid matter evaluation date is required.",
    "Se necesita una fecha válida para evaluar el asunto."
  ],
  [
    "Alaska DPS cannot seal records originating in another state or the federal government.",
    "El Departamento de Seguridad Pública de Alaska no puede sellar expedientes originados en otro estado o en el gobierno federal."
  ],
  [
    "An agency denial, contested merits or declined required verification needs a separate supported attorney or administrative-appeal workflow.",
    "Una denegación de la agencia, una controversia sobre el fundamento o la negativa a proporcionar una verificación requerida exige un procedimiento separado con asistencia de abogado o de apelación administrativa."
  ],
  [
    "Dismissal alone does not establish mistaken identity or false accusation under AS12.62.180.",
    "Una desestimación por sí sola no demuestra identidad equivocada ni acusación falsa conforme a AS12.62.180."
  ],
  [
    "PartIV(D) requires an actual reversal/vacatur judgment or Governor's pardon for convicted charges; do not fabricate one or use this request as a collateral attack.",
    "La Parte IV(D) exige una sentencia real que revoque o anule la condena o un indulto del gobernador para los cargos con condena; no invente esos documentos ni utilice esta solicitud para impugnar la condena."
  ],
  [
    "The agency, basis, actual disposition and required external-document branches must be established from the participant's facts.",
    "Se deben establecer la agencia, el fundamento, la resolución real y los documentos externos requeridos a partir de los datos del participante."
  ],
  [
    "AS12.62.180 reaches only the records held by the receiving agency. The Alaska DPS form is not a substitute for another agency's separately verified request process.",
    "AS12.62.180 solo alcanza los expedientes que mantiene la agencia receptora. El formulario de Seguridad Pública de Alaska no sustituye el procedimiento de solicitud de otra agencia, que debe verificarse por separado."
  ],
  [
    "Prepare the participant portions of the existing six-page DPS agency application and explanation. The agency decides the legal standard. Required officer/prosecutor statements and government records remain external pre-submission tasks; no signature, agreement checkbox, agency finding or exhibit is invented. This is not filing-ready until those tasks are complete.",
    "Prepare las partes del participante de la solicitud existente de seis páginas a la agencia de Seguridad Pública y la explicación. La agencia decide si se cumple el criterio legal. Las declaraciones requeridas del agente o fiscal y los registros oficiales siguen siendo tareas externas previas a la entrega; no se inventan firmas, casillas de conformidad, determinaciones de la agencia ni anexos. No está lista para presentar hasta completar esas tareas."
  ]
] as const;

/** Unknown material facts remain unknown; this result creates no commercial or legal authority. */
export function evaluateAlaskaIdentity(facts: Facts, asOf: Date | string): AlaskaIdentityDecision {
  const result = (branchId: string, status: AlaskaIdentityDecision["status"], reason: string, missingFactIds: string[] = [], documentIds: string[] = [], externalDocumentIds: string[] = []): AlaskaIdentityDecision => ({reviewId: "R001", routeId: AK_IDENTITY_ROUTE, branchId, status, missingFactIds, documentIds, externalDocumentIds, reason, reasonEs: AK_IDENTITY_REASON_COPY.find(([en]) => en === reason)![1]});
  const today = date(asOf instanceof Date && Number.isFinite(asOf.getTime()) ? asOf.toISOString().slice(0, 10) : asOf);
  if (!today) return result("unknown", "unknown", "A valid matter evaluation date is required.", ["as_of_date"]);
    if (text(facts.ak_seal_record_origin) === "other_state_or_federal") return result("outside_alaska_scope", "excluded", "Alaska DPS cannot seal records originating in another state or the federal government.");
    if (text(facts.ak_seal_request_stage) === "denied_or_contested" || text(facts.ak_seal_verification_status) === "declined") return result("contested_or_denied", "attorney_review", "An agency denial, contested merits or declined required verification needs a separate supported attorney or administrative-appeal workflow.");
    if (text(facts.ak_seal_basis) === "dismissal_only") return result("no_identity_or_false_accusation_basis", "excluded", "Dismissal alone does not establish mistaken identity or false accusation under AS12.62.180.");
    if (text(facts.ak_seal_disposition) === "convicted_without_reversal_or_pardon") return result("conviction_record_unresolved", "attorney_review", "PartIV(D) requires an actual reversal/vacatur judgment or Governor's pardon for convicted charges; do not fabricate one or use this request as a collateral attack.");
    const required: Record<string, readonly string[]> = {
      ak_seal_record_origin: ["alaska"], ak_seal_record_holder: ["alaska_dps", "other_agency"], ak_seal_request_stage: ["initial_request"],
      ak_seal_basis: ["mistaken_identity", "false_accusation"], ak_seal_disposition: ["pending", "dismissed", "acquitted", "conviction_reversed_or_vacated", "pardoned"],
      ak_seal_verification_status: ["not_obtained", "available"]
    };
    const missing = Object.entries(required).filter(([key, values]) => !values.includes(text(facts[key]))).map(([key]) => key);
    for (const id of ["ak_seal_arrest_or_citation", "ak_seal_prosecutor_referral"]) if (boolean(facts[id]) === undefined) missing.push(id);
    const explanation = text(facts.ak_seal_explanation);
    if (!explanation || /^(unknown|i am not sure|i'm not sure|not sure|unsure|not_sure|no s[eé])$/i.test(explanation)) missing.push("ak_seal_explanation");
    if (missing.length) return result("unknown", "unknown", "The agency, basis, actual disposition and required external-document branches must be established from the participant's facts.", missing);
    if (text(facts.ak_seal_record_holder) === "other_agency") return result("other_record_holding_agency", "guidance", "AS12.62.180 reaches only the records held by the receiving agency. The Alaska DPS form is not a substitute for another agency's separately verified request process.");
    const external = [];
    if (boolean(facts.ak_seal_arrest_or_citation) === true) external.push("actual_officer_or_superior_verification");
    if (boolean(facts.ak_seal_prosecutor_referral) === true) external.push("actual_prosecutor_or_superior_verification");
    const disposition = text(facts.ak_seal_disposition);
    if (disposition === "dismissed" || disposition === "acquitted") external.push("actual_court_disposition_order");
    if (disposition === "conviction_reversed_or_vacated") external.push("actual_reversal_or_vacatur_judgment");
    if (disposition === "pardoned") external.push("actual_governor_pardon");
    return result("dps_initial_request", "qualifying", "Prepare the participant portions of the existing six-page DPS agency application and explanation. The agency decides the legal standard. Required officer/prosecutor statements and government records remain external pre-submission tasks; no signature, agreement checkbox, agency finding or exhibit is invented. This is not filing-ready until those tasks are complete.", [], ["DPS-SEAL-REQ-2-04", "participant_explanation_if_continued", "participant_submission_instructions"], external);
}

/** Adverse routing facts remain correctable; unrelated branch details leave the active UI. */
export function alaskaIdentityQuestions(facts: Facts, includeInactive = false) {
  if (includeInactive) return [...AK_IDENTITY_QUESTIONS];
  const stopped = text(facts.ak_seal_record_origin) === "other_state_or_federal"
    || text(facts.ak_seal_request_stage) === "denied_or_contested"
    || text(facts.ak_seal_verification_status) === "declined"
    || text(facts.ak_seal_basis) === "dismissal_only"
    || text(facts.ak_seal_disposition) === "convicted_without_reversal_or_pardon";
  return AK_IDENTITY_QUESTIONS.filter(q => !stopped || !["ak_seal_explanation", "ak_seal_arrest_or_citation", "ak_seal_prosecutor_referral"].includes(q.id));
}
/** A closed fact list for protected save/retention; never infer writable keys from input. */
export function alaskaIdentityFactIds(facts: Facts, includeInactive = false): string[] {
  return alaskaIdentityQuestions(facts, includeInactive).map(q => q.id);
}
