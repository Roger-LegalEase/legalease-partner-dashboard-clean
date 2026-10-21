import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { pathwayFromContext } from "@/lib/rcap-engine/pathway-context";

type Answers = Record<string, unknown>;
type Selection = { status: "not_applicable" }
  | { status: "clarification"; missingQuestionIds: string[] }
  | { status: "selected"; pathwayId: string }
  | { status: "review"; code: "other_help" | "later_order" | "program_record" | "mixed_charges" | "conviction_scope" };

export const CONVICTION_NONCONVICTION_ROUTES: Record<string, readonly string[]> = {
  MS: ["non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
    "uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59", "uncharged-misdemeanor-immediate-dismissal-branch-99-15-59"],
  GA: ["non-conviction-record-restriction-through-the-agency-prosecutor-process",
    "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions"],
  IL: ["adult-non-conviction-expungement"]
};
export const CONVICTION_RELIEF_SOURCE = "MS.memo:ms-nonconv,ms-misd-1st,ms-misd-addl,ms-fel;GA.memo:ga-misd-j4,ga-rfo,ga-vacated-j2,ga-felony-j1,ga-nonconv-*;IL.memo:il-exp-nonconv,il-seal-*";
export const CONVICTION_RELIEF_COPY = {
  missing: ["Check the requested case fact or tell us what help you want. An optional pathway hint does not establish a later court order or choose another procedure for you.", "Revise el dato del caso solicitado o indique en qué desea ayuda. Una pista opcional sobre una vía no establece una orden judicial posterior ni elige otro procedimiento por usted."],
  other_help: ["Your request needs a review of the record and the help you want. No other procedure has been selected for you, and this does not decide whether another remedy is available.", "Su solicitud requiere revisar el expediente y la ayuda que desea. No se ha elegido otro procedimiento por usted y esto no determina si hay otra medida disponible."],
  later_order: ["The later order and its effect on this record need review. The original conviction answer remains part of the record; it is not automatically changed to a dismissal or acquittal.", "La orden posterior y su efecto en este expediente requieren revisión. La respuesta sobre la condena original sigue formando parte del registro; no se cambia automáticamente a una desestimación o absolución."],
  program_record: ["The program order, its completion and the court's final disposition must be checked separately. A program request does not establish that a conviction was dismissed or set aside.", "La orden del programa, su cumplimiento y la resolución final del tribunal deben revisarse por separado. Una solicitud relacionada con un programa no establece que una condena haya sido desestimada o dejada sin efecto."],
  mixed_charges: ["This request concerns a separate charge in a case with more than one outcome. Each charge, its final disposition and its relationship to the other charges need review before selecting the procedure.", "Esta solicitud se refiere a un cargo distinto en un caso con más de un resultado. Cada cargo, su resolución final y su relación con los otros cargos requieren revisión antes de elegir el procedimiento."],
  conviction_scope: ["The facts entered do not establish the requested conviction procedure. Review the final judgment, offense and court; this is not a denial of every record-clearing option.", "Los datos ingresados no establecen el procedimiento solicitado para la condena. Revise la sentencia final, el delito y el tribunal; esto no rechaza todas las opciones para limpiar los antecedentes."]
} as const;

export function isAdultConvictionAnswer(value: unknown): boolean {
  return typeof value === "string" && ["Misdemeanor conviction", "Felony conviction", "Other conviction or adjudication", "Pardoned conviction"].includes(value);
}

function exactChoice(value: unknown, choices: readonly string[]): boolean { return typeof value === "string" && choices.includes(value); }
function requestId(state: string) { return `${state.toLowerCase()}_record_help`; }
function hintIsAbsent(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string"
    && ["", "skip", "none of these / i am not sure", "i am not sure"].includes(value.trim().toLowerCase());
}

/** This is an additional factual selector, after the existing exact program,
 * original First Offender and cannabis selectors. An election identifies work,
 * never eligibility. No array order, prose token or compiled singleton supplies
 * the election or a final record outcome. The old answer is never rewritten.
 */
export function convictionReliefRequest(profile: EngineProfile, answers: Answers): Selection {
  const state = profile.jurisdiction.code;
  if (!CONVICTION_NONCONVICTION_ROUTES[state] || !isAdultConvictionAnswer(answers.case_outcome)) return { status: "not_applicable" };
  if (state === "GA" && answers.ga_original_first_offender === "yes"
    || state === "IL" && exactChoice(answers.il_cannabis_statute, ["720_ILCS_550_4", "720_ILCS_550_5"]) && answers.il_cannabis_next_step !== "other_relief"
    || state === "MS" && answers.ms_program_order !== undefined && answers.ms_program_order !== "no_program_order") return { status: "not_applicable" };
  const hint = typeof answers.possible_pathway_context === "string" ? pathwayFromContext(profile, answers.possible_pathway_context.toLowerCase()) : undefined;
  const id = requestId(state);
  const missing = (...missingQuestionIds: string[]): Selection => ({ status: "clarification", missingQuestionIds });
  if (state === "GA" && !Object.hasOwn(answers, id)
    && hint?.id === "retroactive-first-offender-treatment-under-42-8-66"
    && answers.ga_original_first_offender !== "no") return missing("ga_original_first_offender");
  // Existing explicit requests for other procedures retain their own controls.
  // A new election takes precedence over the optional historical menu hint.
  if (!Object.hasOwn(answers, id) && !hintIsAbsent(answers.possible_pathway_context)
    && (!hint || !CONVICTION_NONCONVICTION_ROUTES[state].includes(hint.id))) return { status: "not_applicable" };
  const selected = (pathwayId: string): Selection => ({ status: "selected", pathwayId });
  const request = answers[id];
  const allowed = requestOptions[state].map(([value]) => value);
  if (typeof request !== "string" || !allowed.includes(request) || request === "unknown") return missing(id);
  if (request === "other_help") return { status: "review", code: "other_help" };
  if (request === "mixed_charges") return { status: "review", code: "mixed_charges" };
  if (request === "program_record") return { status: "review", code: "program_record" };
  if (request === "later_order") {
    const later = answers[`${state.toLowerCase()}_later_order`];
    if (!exactChoice(later, ["vacated", "reversed", "dismissed", "none", "other"]) || later === "unknown") return missing(`${state.toLowerCase()}_later_order`);
    // IL 5.2(b)(1)(ii) expressly includes a conviction vacated or reversed.
    // This candidate still encounters the existing source/offer authority gate.
    if (state === "IL" && (later === "vacated" || later === "reversed")) return selected("adult-non-conviction-expungement");
    // GA vacatur/finality/retrial and MS later-disposition mechanisms cannot be
    // silently mapped onto a different existing nonconviction backend route.
    return { status: "review", code: "later_order" };
  }
  if (request === "retroactive_treatment" && state === "GA") {
    if (answers.ga_original_first_offender !== "no") return missing("ga_original_first_offender");
    return selected("retroactive-first-offender-treatment-under-42-8-66");
  }
  if (request === "pardon_record" && state === "GA") {
    if (answers.pardon_status === "No" || answers.pardon_status === false) return { status: "review", code: "conviction_scope" };
    if (answers.pardon_status !== "Yes" && answers.pardon_status !== true) return missing("pardon_status");
    if (answers.case_outcome === "Pardoned conviction" || answers.case_outcome === "Other conviction or adjudication") return missing("case_outcome");
    // GA-02, owner-relayed counsel adoption (2026-10-13): §35-3-37(j)(7)
    // applies to a pardoned offense, not only a felony. Preserve the historical
    // route identifier and all downstream factual/commercial gates. Selection
    // is not proof of a qualifying Board pardon or of the remaining conditions.
    if (!exactChoice(answers.case_outcome, ["Felony conviction", "Misdemeanor conviction"])) return { status: "review", code: "conviction_scope" };
    return selected("restriction-and-sealing-of-a-pardoned-felony");
  }
  if (request === "status_check" && state === "IL") return selected("clean-slate-automatic-sealing");
  // A charge-level answer cannot disambiguate Other conviction/adjudication.
  if (answers.case_outcome === "Other conviction or adjudication") return missing("case_outcome");
  if (state === "IL") return selected("adult-conviction-sealing");
  if (state === "GA") return answers.case_outcome === "Misdemeanor conviction"
    ? selected("sb-288-misdemeanor-conviction-restriction-and-sealing") : { status: "review", code: "conviction_scope" };
  if (request === "dui_record") return selected("first-offense-dui-expungement");
  if (request === "underage_alcohol_record") return selected("minor-in-possession-underage-alcohol-expungement");
  if (answers.case_outcome === "Felony conviction") return selected("eligible-felony-conviction-expungement-99-19-71");
  if (answers.case_outcome !== "Misdemeanor conviction") return { status: "review", code: "conviction_scope" };
  if (!exactChoice(answers.ms_conviction_traffic, ["nontraffic", "dui", "other_traffic"])) return missing("ms_conviction_traffic");
  if (answers.ms_conviction_traffic === "dui") return { status: "review", code: "conviction_scope" };
  // The nontraffic limit belongs to99-19-71(1). The additional lower-court
  // source covers any/all misdemeanors of that court, except its own DUI bar;
  // it does not erase driving records. Never import the first-offender limit.
  if (answers.ms_conviction_traffic === "nontraffic") {
    if (!exactChoice(answers.ms_other_convictions, ["yes", "no"])) return missing("ms_other_convictions");
    if (!exactChoice(answers.ms_prior_conviction_expungement, ["yes", "no"])) return missing("ms_prior_conviction_expungement");
    if (answers.ms_other_convictions === "no" && answers.ms_prior_conviction_expungement === "no") return selected("first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1");
  }
  if (!exactChoice(answers.ms_conviction_court, ["justice", "municipal", "county", "circuit"])) return missing("ms_conviction_court");
  if (answers.ms_conviction_court === "justice") return selected("additional-justice-court-misdemeanor-relief-9-11-15-3");
  if (answers.ms_conviction_court === "municipal") return selected("additional-municipal-court-misdemeanor-relief-21-23-7-6");
  return { status: "review", code: "conviction_scope" };
}

/** A compiled rule's broad convicted_other token is not disposition proof.
 * Keep this boundary exact to the reproduced source routes; program routes and
 * IL actual later vacatur/reversal remain separately available. */
export function convictionOutcomeCompatible(state: string, answers: Answers, pathwayId: string): boolean {
  if (state === "CO" && isAdultConvictionAnswer(answers.case_outcome)
    && pathwayId === "petition-based-non-conviction-sealing-jdf-417-24-72-704") return false;
  if (!isAdultConvictionAnswer(answers.case_outcome) || !CONVICTION_NONCONVICTION_ROUTES[state]?.includes(pathwayId)) return true;
  return state === "IL" && answers.il_record_help === "later_order"
    && (answers.il_later_order === "vacated" || answers.il_later_order === "reversed");
}

type Option = [string, string, string];
const unknown: Option = ["unknown", "I am not sure", "No estoy seguro"];
const yesNo: Option[] = [["yes", "Yes", "Sí"], ["no", "No", "No"], unknown];
function question(id: string, prompt: string, helperText: string, esPrompt: string, esHelper: string, options: Option[]): PublicQuestion {
  return { id, stage: "pathway_routing", type: "single_choice", required: false, contextOnly: false,
    doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter", prompt, helperText,
    options: options.map(([value]) => value), optionDisplay: Object.fromEntries(options.map(([value, label, es]) => [value, { label, translations: { es: { label: es } } }])),
    translations: { es: { prompt: esPrompt, helperText: esHelper } } };
}
const laterOrder: Option = ["later_order", "Review a later court order that changed the conviction", "Revisar una orden judicial posterior que cambió la condena"];
const program: Option = ["program_record", "Review the outcome of supervision, probation or another program", "Revisar el resultado de supervisión, libertad condicional u otro programa"];
const other: Option = ["other_help", "I want help with a different situation", "Quiero ayuda con otra situación"];
const requestOptions: Record<string, Option[]> = {
  MS: [["conviction_record", "Ask to clear an existing conviction", "Pedir que se elimine una condena existente"], ["dui_record", "Ask about clearing a DUI conviction", "Consultar sobre eliminar una condena por conducir bajo la influencia"], ["underage_alcohol_record", "Ask about clearing an underage alcohol conviction", "Consultar sobre eliminar una condena por alcohol de una persona menor de 21 años"], laterOrder, program, other, unknown],
  GA: [["conviction_record", "Ask to restrict access to an existing conviction record", "Pedir que se restrinja el acceso al registro de una condena existente"], ["retroactive_treatment", "Ask for First Offender treatment that was not originally imposed", "Pedir tratamiento de First Offender que no se dispuso originalmente"], ["pardon_record", "Ask to restrict a conviction record after a pardon", "Pedir que se restrinja el registro de una condena después de un indulto"], laterOrder, ["mixed_charges", "Ask about a separate dismissed or acquitted charge in the same case", "Consultar sobre otro cargo desestimado o del que fue absuelto en el mismo caso"], program, other, unknown],
  IL: [["conviction_record", "Ask the court to seal an existing conviction record", "Pedir al tribunal que selle el registro de una condena existente"], laterOrder, program, ["status_check", "Check the automatic sealing process", "Consultar el proceso de sellado automático"], other, unknown]
};

// Draft source-grounded copy. Qualified legal and EN/ES approval is separate.
export function convictionReliefQuestions(state: string): PublicQuestion[] {
  if (!requestOptions[state]) return [];
  return [question(requestId(state), "What would you like help with for this record?",
    "Choose the help you want, not whether you qualify. We check the case facts separately. A later court order or a separate charge can have a different outcome from the original conviction.",
    "¿En qué desea ayuda con este expediente?", "Elija la ayuda que desea, no si cumple los requisitos. Revisamos los hechos del caso por separado. Una orden judicial posterior u otro cargo pueden tener un resultado distinto al de la condena original.", requestOptions[state]),
  question(`${state.toLowerCase()}_later_order`, "What did the later court order do to this conviction?",
    "Use the actual order. Completing a sentence, receiving a pardon or asking for relief is not itself an order vacating or reversing a conviction. The original answer is retained.",
    "¿Qué hizo la orden judicial posterior respecto de esta condena?", "Use la orden real. Cumplir una sentencia, recibir un indulto o pedir una medida no equivale por sí solo a una orden que anule o revoque una condena. Se conserva la respuesta original.", [
      ["vacated", "The court vacated or set aside the conviction", "El tribunal anuló o dejó sin efecto la condena"], ["reversed", "An appellate court reversed the conviction", "Un tribunal de apelaciones revocó la condena"], ["dismissed", "The court dismissed the case after the conviction", "El tribunal desestimó el caso después de la condena"], ["none", "No later order changed the conviction", "Ninguna orden posterior cambió la condena"], ["other", "Another kind of order", "Otro tipo de orden"], unknown]),
  ...(state !== "MS" ? [] : [
    question("ms_conviction_traffic", "What kind of offense is the final misdemeanor conviction for?", "Use the final judgment, including any amended offense. Do not use the original arrest charge.", "¿Por qué tipo de delito es la condena final por delito menor?", "Use la sentencia final, incluido cualquier delito modificado. No use el cargo original del arresto.", [["nontraffic", "An offense other than a traffic violation", "Un delito que no es una infracción de tránsito"], ["dui", "Driving under the influence (DUI)", "Conducir bajo la influencia (DUI)"], ["other_traffic", "Another traffic violation", "Otra infracción de tránsito"], unknown]),
    question("ms_other_convictions", "Have you had any other conviction, in any court or jurisdiction?", "Include convictions in other states and courts. Do not leave out a conviction just because its record was later cleared.", "¿Ha tenido alguna otra condena, en cualquier tribunal o jurisdicción?", "Incluya condenas de otros estados y tribunales. No omita una condena solo porque sus antecedentes fueron eliminados después.", yesNo),
    question("ms_prior_conviction_expungement", "Has any conviction of yours been expunged before?", "A previous expungement remains relevant to the first-offender question. This asks about an actual previous conviction expungement, not an application that is still pending.", "¿Se ha eliminado antes alguna condena suya?", "Una eliminación anterior sigue siendo pertinente para la cuestión de una primera condena. Se pregunta por la eliminación real de una condena anterior, no por una solicitud pendiente.", yesNo),
    question("ms_conviction_court", "Which court entered the misdemeanor conviction you want cleared?", "Use the court named on the judgment. Your home city or county and the arresting agency do not establish which court entered the conviction.", "¿Qué tribunal dictó la condena por delito menor que desea eliminar?", "Use el tribunal nombrado en la sentencia. Su ciudad o condado de residencia y la agencia que hizo el arresto no establecen qué tribunal dictó la condena.", [["justice", "Justice court", "Tribunal de justicia (Justice Court)"], ["municipal", "Municipal court", "Tribunal municipal"], ["county", "County court", "Tribunal del condado (County Court)"], ["circuit", "Circuit court", "Tribunal de circuito"], unknown])
  ])];
}

export function convictionReliefQuestionApplies(profile: EngineProfile, answers: Answers, id: string): boolean {
  const state = profile.jurisdiction.code;
  if (!convictionReliefQuestions(state).some(q => q.id === id)) return true;
  const decision = convictionReliefRequest(profile, answers);
  if (decision.status === "not_applicable") return false;
  if (id === requestId(state)) return true;
  if (id.endsWith("_later_order")) return answers[requestId(state)] === "later_order";
  if (state !== "MS" || answers.ms_record_help !== "conviction_record" || answers.case_outcome !== "Misdemeanor conviction") return false;
  if (id === "ms_conviction_traffic") return true;
  if (id === "ms_conviction_court") return answers.ms_conviction_traffic === "other_traffic" || answers.ms_conviction_traffic === "nontraffic" && (answers.ms_other_convictions === "yes" || answers.ms_prior_conviction_expungement === "yes");
  return answers.ms_conviction_traffic === "nontraffic";
}
