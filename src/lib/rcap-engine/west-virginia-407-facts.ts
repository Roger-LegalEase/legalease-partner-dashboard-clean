/** R109 only: extracted unchanged from the reviewed research leaf; qualification grants no checkout authority. */
export const WEST_VIRGINIA_407_ROUTE = "WV:first-offense-drug-possession-conditional-discharge-relief";
type Answers = Readonly<Record<string, unknown>>;
export type WestVirginia407Result = {
  status: "qualifying" | "excluded" | "unknown" | "not_yet" | "needs_review";
  reviewId: "R109";
  branchId: string;
  reason: string;
  reasonEs: string;
  missingFactIds: string[];
  eligibleOn?: string;
};
export type WestVirginia407Question = {
  id: string;
  type: "date" | "text" | "single_choice" | "yes_no_unsure";
  prompt: string;
  promptEs: string;
  options?: string[];
  optionsEn?: string[];
  optionsEs?: string[];
};

export function westVirginia407Questions(routeKey: string): readonly WestVirginia407Question[] {
  if (routeKey !== WEST_VIRGINIA_407_ROUTE) return [];
  const questions: WestVirginia407Question[] = [
      ...[
        ["wv_407_alleged_serious_or_repeated_violation","Has anyone alleged a serious or repeated probation-condition violation, during probation or since?","¿Alguien ha alegado una infracción grave o repetida de las condiciones, durante la libertad condicional o después?"],
        ["wv_407_probation_revoked_or_guilt_entered","Was probation revoked or an adjudication of guilt entered in this matter?","¿Se revocó la libertad condicional o se dictó una adjudicación de culpabilidad en este asunto?"],
        ["wv_407_also_seeking_611126_relief","Are you also considering conviction expungement under section61-11-26? The interaction of separate lifetime limits requires targeted review.","¿También considera eliminar una condena conforme a la sección61-11-26? La interacción de los límites vitalicios requiere revisión específica."]
      ].map(([id,prompt,promptEs])=>({id,type:"yes_no_unsure"as const,prompt,promptEs})),
      ...[
        ["wv_407_arrest_date","On what date were you arrested?","¿En qué fecha fue arrestado?"],
        ["wv_407_probation_order_date","When did the court defer proceedings and impose probation?","¿Cuándo aplazó el tribunal el procedimiento e impuso la libertad condicional?"],
        ["wv_407_dismissal_date","When was the final discharge and dismissal order entered?","¿Cuándo se dictó la orden final de alta y desestimación?"]
      ].map(([id,prompt,promptEs])=>({id,type:"date"as const,prompt,promptEs})),
      ...[
        ["wv_407_probation_term","What probation term did the court impose? Use the actual order and describe any modification.","¿Qué período de libertad condicional impuso el tribunal? Use la orden real y describa cualquier modificación."],
        ["wv_407_arresting_agency","Which agency arrested you?","¿Qué agencia lo arrestó?"],
        ["wv_407_probation_office","Which probation office supervised you?","¿Qué oficina supervisó su libertad condicional?"],
        ["wv_407_prosecutor_office","Which county prosecuting attorney serves this case?","¿Qué fiscalía del condado corresponde a este caso?"]
      ].map(([id,prompt,promptEs])=>({id,type:"text"as const,prompt,promptEs})),
      {id:"wv_407_court_costs_status",type:"single_choice",prompt:"What is the status of court costs assessed in this case? This does not invent a separate application fee.",promptEs:"¿Cuál es el estado de las costas judiciales impuestas en este caso? Esto no supone una tasa separada de solicitud.",options:["paid","unpaid","not_assessed","unknown"],optionsEs:["pagadas","sin pagar","no se impusieron","no sé"]},
      { id:"wv_407_qualifying_possession_charge",type:"yes_no_unsure",prompt:"Was the guilty plea or finding for controlled-substance possession under West Virginia Code60A-4-401(c)?",promptEs:"¿La declaración o determinación de culpabilidad fue por posesión de sustancias controladas conforme al Código de Virginia Occidental60A-4-401(c)?" },
      { id:"wv_407_prior_drug_conviction",type:"yes_no_unsure",prompt:"Before this case, had you been convicted of any West Virginia chapter60A offense, or any federal/state offense relating to narcotic drugs, marijuana, stimulants, depressants or hallucinogens?",promptEs:"¿Antes de este caso había sido condenado por un delito del capítulo60A de Virginia Occidental o por un delito federal/estatal relacionado con narcóticos, marihuana, estimulantes, depresores o alucinógenos?" },
      { id:"wv_407_previous_discharge",type:"yes_no_unsure",prompt:"Before this case, had you already received a discharge and dismissal under section60A-4-407?",promptEs:"¿Antes de este caso ya había recibido una alta y desestimación conforme a la sección60A-4-407?" },
      { id: "wv_407_discharge_and_dismissal", type: "yes_no_unsure", prompt: "Did the court actually discharge you and dismiss the possession case under West Virginia Code 60A-4-407?", promptEs: "¿El tribunal realmente le dio de alta de la libertad condicional y desestimó el caso de posesión conforme al Código de Virginia Occidental 60A-4-407?" },
      { id: "wv_407_probation_expiration_date", type: "date", prompt: "On what date did your term of probation expire? This is different from the arrest date or the date of dismissal.", promptEs: "¿En qué fecha venció el período de libertad condicional? Esta fecha es distinta de la del arresto o la desestimación." },
      { id: "wv_407_serious_or_repeated_violation", type: "yes_no_unsure", prompt: "During probation or afterward, was there any serious or repeated violation of your probation conditions?", promptEs: "¿Durante la libertad condicional o después hubo alguna infracción grave o repetida de sus condiciones?" }
  ];
  const labels: Record<string,string> = {paid:"Paid",unpaid:"Unpaid",not_assessed:"No costs assessed",unknown:"I am not sure"};
  return questions.map(q=>q.options?{...q,optionsEn:q.options.map(value=>labels[value]??value)}:q);
}

function answer(facts: Answers, id: string): unknown {
  const value = facts[id];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const wrapped = value as { value?: unknown; unknown?: boolean };
    return wrapped.unknown === true ? undefined : wrapped.value;
  }
  return value;
}
function text(facts: Answers, id: string): string {
  const value = answer(facts, id);
  return typeof value === "string" ? value.trim() : "";
}
function yesNo(facts: Answers, id: string): boolean | undefined {
  const value = answer(facts, id);
  if (value === true || value === "Yes" || value === "yes") return true;
  if (value === false || value === "No" || value === "no") return false;
  return undefined;
}
function date(facts: Answers, id: string): string | null {
  const value = text(facts, id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
function addSixMonths(value: string): string {
  const at = new Date(`${value}T00:00:00Z`);
  const day = at.getUTCDate();
  at.setUTCDate(1);
  at.setUTCMonth(at.getUTCMonth() + 6);
  const last = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate();
  at.setUTCDate(Math.min(day, last));
  return at.toISOString().slice(0, 10);
}

export function evaluateWestVirginia407(routeKey: string, facts: Answers, asOf: string): WestVirginia407Result | null {
  if (routeKey !== WEST_VIRGINIA_407_ROUTE) return null;
  if (!date({ asOf }, "asOf")) throw new Error("Research route evaluation requires an exact valid as-of date");
  const result = (status: WestVirginia407Result["status"], reason: string, missingFactIds: string[] = [], eligibleOn?: string): WestVirginia407Result =>
    ({ status, reviewId: "R109", branchId: "R109:participant_application", reason, reasonEs: spanish(reason), missingFactIds, ...(eligibleOn ? { eligibleOn } : {}) });
  const allegation = yesNo(facts,"wv_407_alleged_serious_or_repeated_violation");
  const revoked = yesNo(facts,"wv_407_probation_revoked_or_guilt_entered");
  const combined = yesNo(facts,"wv_407_also_seeking_611126_relief");
  const possession = yesNo(facts,"wv_407_qualifying_possession_charge");
  const priorDrug = yesNo(facts,"wv_407_prior_drug_conviction");
  const priorDischarge = yesNo(facts,"wv_407_previous_discharge");
  const discharged = yesNo(facts, "wv_407_discharge_and_dismissal");
  const expiration = date(facts, "wv_407_probation_expiration_date");
  const violation = yesNo(facts, "wv_407_serious_or_repeated_violation");
  const missing = [allegation === undefined && "wv_407_alleged_serious_or_repeated_violation", revoked === undefined && "wv_407_probation_revoked_or_guilt_entered", combined === undefined && "wv_407_also_seeking_611126_relief", possession === undefined && "wv_407_qualifying_possession_charge", priorDrug === undefined && "wv_407_prior_drug_conviction", priorDischarge === undefined && "wv_407_previous_discharge", discharged === undefined && "wv_407_discharge_and_dismissal", !expiration && "wv_407_probation_expiration_date", violation === undefined && "wv_407_serious_or_repeated_violation"].filter(Boolean) as string[];
  if (missing.length) return result("unknown", "Confirm the actual statutory discharge/dismissal, probation expiration date and violation history.", missing);
  if (revoked) return result("excluded","A revoked probation or entered adjudication is not the supported final statutory discharge product. Preserve the actual order and seek review.");
  if (allegation || combined) return result("needs_review",allegation?"The adopted self-help design stops for alleged serious or repeated violations; the court must resolve the record.":"The existing design leaves the interaction with section61-11-26 lifetime relief unresolved. Obtain a targeted answer for that combined plan, not blanket reconfirmation of section407.");
  if (!possession || priorDrug || priorDischarge) return result("excluded","Section60A-4-407 requires the qualifying possession disposition, the statutory first-drug-offense conditions and no prior use of this once-only discharge. A reported order does not make contrary facts disappear.");
  if (!discharged) return result("excluded", "Program entry or a plea alone is not the completed statutory discharge and dismissal needed by this post-completion product.");
  if (violation) return result("excluded", "The required absence of serious or repeated violations is not established; take the record to counsel.");
  if (expiration! > asOf) return result("not_yet", "The probation term has not yet expired.", [], addSixMonths(expiration!));
  const eligibleOn = addSixMonths(expiration!);
  if (asOf < eligibleOn) return result("not_yet", "Six calendar months have not elapsed from probation expiration. Arrest or dismissal dates cannot replace this anchor.", [], eligibleOn);
  return result("qualifying", "The supported post-discharge application is timely six calendar months after probation expiration, subject to the court's required hearing and findings.", [], eligibleOn);
}

export function westVirginia407DocumentManifest(routeKey: string) {
  if (routeKey !== WEST_VIRGINIA_407_ROUTE) return null;
  return {
      reviewId: "R109", relief: "expungement", forum: "court_of_conditional_discharge",
      required: ["60A-4-407b_application", "supporting_sworn_affidavit", "certificate_of_service_on_county_prosecutor_and_probation_office", "external_records_checklist", "hearing_and_filing_instructions"],
      conditional: ["local_notice_of_hearing_and_service_proof_as_directed"], external: ["actual_discharge_and_dismissal_order", "probation_expiration_information"],
      source: "https://code.wvlegislature.gov/60A-4-407/",
      filingReady: false,
      note: "The court must hold the statutory hearing. Supporting records are obtained separately; no exhibit is described as attached until it is actually included. The existing adopted design requires a sworn affidavit with a blank jurat and service on the county prosecutor and supervising probation office. Section407 states no application fee; subsection(c) costs and local clerk fees are separate. No proposed order is added beyond the exact five-component design."
  };
}

const OUTCOME_ES: Readonly<Record<string,string>> = {
"Confirm the actual statutory discharge/dismissal, probation expiration date and violation history.":"Confirme el alta y la desestimación legales reales, la fecha de vencimiento de la libertad condicional y los antecedentes de infracciones de sus condiciones.",
"A revoked probation or entered adjudication is not the supported final statutory discharge product. Preserve the actual order and seek review.":"Una libertad condicional revocada o una adjudicación de culpabilidad no corresponde al producto para un alta legal definitiva. Conserve la orden real y solicite revisión.",
"The adopted self-help design stops for alleged serious or repeated violations; the court must resolve the record.":"El diseño adoptado de autoayuda se detiene ante alegaciones de infracciones graves o repetidas; el tribunal debe resolver el registro.",
"The existing design leaves the interaction with section61-11-26 lifetime relief unresolved. Obtain a targeted answer for that combined plan, not blanket reconfirmation of section407.":"El diseño existente deja pendiente la interacción con el beneficio vitalicio de la sección61-11-26. Obtenga una respuesta específica para ese plan combinado; no se requiere una reconfirmación general de la sección407.",
"Section60A-4-407 requires the qualifying possession disposition, the statutory first-drug-offense conditions and no prior use of this once-only discharge. A reported order does not make contrary facts disappear.":"La sección60A-4-407 exige la resolución por posesión que cumpla los requisitos, las condiciones legales de primer delito de drogas y ningún uso anterior de esta alta única. Una orden declarada no elimina hechos contrarios.",
"Program entry or a plea alone is not the completed statutory discharge and dismissal needed by this post-completion product.":"La entrada en un programa o una declaración de culpabilidad por sí solas no constituyen el alta y la desestimación legales definitivas que exige este producto posterior al cumplimiento.",
"The required absence of serious or repeated violations is not established; take the record to counsel.":"No se ha establecido la ausencia exigida de infracciones graves o repetidas; consulte a un abogado con el registro.",
"The probation term has not yet expired.":"El período de libertad condicional todavía no ha vencido.",
"Six calendar months have not elapsed from probation expiration. Arrest or dismissal dates cannot replace this anchor.":"No han transcurrido seis meses calendario desde el vencimiento de la libertad condicional. Las fechas de arresto o desestimación no pueden sustituir esa fecha inicial.",
"The supported post-discharge application is timely six calendar months after probation expiration, subject to the court's required hearing and findings.":"La solicitud posterior al alta cumple el plazo de seis meses calendario desde el vencimiento de la libertad condicional, sujeta a la audiencia y las determinaciones que debe realizar el tribunal.",
};
function spanish(reason:string):string { const es=OUTCOME_ES[reason];if(!es)throw new Error("Research route outcome translation is missing");return es;}
