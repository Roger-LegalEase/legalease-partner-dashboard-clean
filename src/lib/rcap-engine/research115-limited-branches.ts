import { GA_NONCONVICTION_ROUTE, georgiaNonconvictionQuestions, evaluateGeorgiaNonconviction } from "@/lib/rcap-engine/georgia-nonconviction-research";
import { resolveNdNonconvictionRoute, ND_NONCONVICTION_EXCLUSIONS } from "@/lib/record-clearing/north-dakota-nonconviction-spec";
import { nevada176ABranch, nevada176ASubsection3, NEVADA_176A_BRANCH_FACT_IDS, NEVADA_176A_EXCLUDED_CHARGE_FACT_ID } from "@/lib/rcap-engine/nevada-176a-branch";

/** Research dispositions constrain service; they never create counsel or commercial authority. */
export const RESEARCH115_NO_ROUTES = [
  {
    reviewId: "R059", routeId: "NV:deferred-judgment-dismissal-and-sealing-under-nrs-176-211",
    relief: "deferred_judgment_dismissal_and_sealing",
    authorityUrl: "https://www.leg.state.nv.us/NRS/NRS-176.html#NRS176Sec211",
    guidance: {
      en: "After the court finds the deferred-judgment conditions completed, it discharges the defendant and dismisses the proceeding. The court orders sealing under NRS 176.211(6), subject to subsection (7) and any Division or prosecutor objection. Ask the original court about the completion and sealing orders. LegalEase does not sell an ordinary petition for this procedure.",
      es: "Cuando el tribunal determina que se cumplieron las condiciones del juicio diferido, da de alta al acusado y desestima el proceso. El tribunal ordena el sellado conforme a NRS 176.211(6), sujeto al apartado (7) y a cualquier objeción de la División o del fiscal. Consulte al tribunal original sobre las órdenes de cumplimiento y sellado. LegalEase no vende una petición ordinaria para este procedimiento."
    }
  },
  {
    reviewId: "R082", routeId: "RI:path-e-filed-complaint-relief-under-12-10-12",
    relief: "filed_complaint_automatic_expungement",
    authorityUrl: "https://webserver.rilegislature.gov/Statutes/TITLE12/12-10/12-10-12.htm",
    guidance: {
      en: "A filed complaint is automatically expunged if no action is taken during its filing period and the statutory conditions are met. Domestic-violence complaints have separate three-year and later-charge rules. Check the filing order, conditions and court record; no ordinary paid petition is offered under section 12-10-12.",
      es: "Una denuncia archivada conforme a esta disposición se elimina automáticamente si no se toma ninguna medida durante el plazo fijado y se cumplen las condiciones legales. Las denuncias por violencia doméstica tienen reglas distintas de tres años y sobre cargos posteriores. Revise la orden, las condiciones y el expediente judicial; no se ofrece una petición ordinaria de pago conforme a la sección 12-10-12."
    }
  },
  {
    reviewId: "R088", routeId: "SD:controlled-substance-deferred-disposition-route",
    relief: "charge_reduction_after_deferred_disposition",
    authorityUrl: "https://sdlegislature.gov/api/Statutes/23A-27.html?all=true",
    guidance: {
      en: "SDCL 23A-27-53 concerns deferred sentencing and, after one year of successful treatment and probation compliance, dismissal of the original charge upon a guilty plea to the specified lesser charge. It does not create an expungement petition. Confirm completion and the resulting disposition with the sentencing court or counsel.",
      es: "SDCL 23A-27-53 trata de una sentencia diferida y, tras un año de tratamiento satisfactorio y cumplimiento de la libertad a prueba, de la desestimación del cargo original al declararse culpable del cargo menor indicado. No establece una petición de eliminación de antecedentes. Confirme el cumplimiento y el resultado con el tribunal que impuso la sentencia o con un abogado."
    }
  },
  {
    reviewId: "R089", routeId: "SD:diversion-expungement",
    relief: "prosecutor_initiated_diversion_expungement",
    authorityUrl: "https://sdlegislature.gov/api/Statutes/23A-3.html?all=true",
    guidance: {
      en: "After successful diversion, SDCL 23A-3-35 requires one year and 30 days without a new charge other than the listed petty-offense or minor-traffic exceptions. The state's attorney files the dismissal and completion notice, and the court expunges without a participant motion. Ask the prosecutor about the notice and check the court record. No ordinary paid packet is offered.",
      es: "Después de completar satisfactoriamente la desviación, SDCL 23A-3-35 exige un año y 30 días sin un nuevo cargo, salvo las infracciones menores o de tránsito indicadas. El fiscal presenta la desestimación y el aviso de cumplimiento, y el tribunal elimina los antecedentes sin una moción del participante. Consulte al fiscal sobre el aviso y revise el expediente judicial. No se ofrece un paquete ordinario de pago."
    }
  },
  {
    reviewId: "R110", routeId: "WV:juvenile-record-relief",
    relief: "juvenile_record_confidentiality",
    authorityUrl: "https://code.wvlegislature.gov/49-5-104/",
    guidance: {
      en: "West Virginia juvenile confidentiality depends on the statutory event and record category. Section 49-5-104 generally addresses one year after age 18 or termination of jurisdiction, whichever is later, and has separate adult-transfer rules and exclusions. Ask the original juvenile court about confidential treatment and any record error. LegalEase does not offer an ordinary paid expungement petition for this route.",
      es: "La confidencialidad de los antecedentes juveniles de Virginia Occidental depende del momento y la categoría del expediente establecidos por ley. La sección 49-5-104 generalmente contempla un año después de cumplir 18 años o de terminar la jurisdicción, lo que ocurra más tarde, y contiene reglas y exclusiones distintas para casos transferidos a la jurisdicción penal de adultos. Consulte al tribunal juvenil original sobre la confidencialidad y cualquier error del expediente. LegalEase no ofrece una petición ordinaria de pago para esta vía."
    }
  }
] as const;

export function research115NoRoute(routeKey: string) {
  return RESEARCH115_NO_ROUTES.find((route) => route.routeId === routeKey) ?? null;
}

export type ResearchLimitedBranch = {
  reviewId: string;
  routeId: string;
  branchId: string;
  status: "qualifying" | "guidance" | "excluded" | "unknown" | "not_yet" | "attorney_review";
  missingFactIds: string[];
  documentIds: string[];
  externalDocumentIds: string[];
  reason: string;
  eligibleOn?: string;
  verificationOn?: string;
};

type Facts = Readonly<Record<string, unknown>>;
function text(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) return text((value as {value?: unknown}).value);
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
function addDays(day: string, count: number) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + count * 86400000).toISOString().slice(0, 10);
}
function anniversary(day: string, years: number) {
  const [year, month, d] = day.split("-").map(Number);
  // Preserve the month; a leap-day anniversary is the final day of February.
  const last = new Date(Date.UTC(year + years, month, 0)).getUTCDate();
  return `${year + years}-${String(month).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
const ND_ROUTE = "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05";
const NV_453_ROUTE = "NV:controlled-substance-possession-sealing-under-nrs-453-3365";
const NV_176A_ROUTE = "NV:probation-or-specialty-court-dismissal-set-aside-sealing";

/** Additional material facts are explicit; an omitted exclusion is never a qualifying answer. */
export const RESEARCH115_LIMITED_QUESTIONS = {
  [ND_ROUTE]: [
    { id: "nd_all_charges_nonconviction", type: "yes_no_unknown", en: "Were all criminal charges in this case dismissed, or were you acquitted of every charge?", es: "¿Se desestimaron todos los cargos penales de este caso, o fue absuelto de todos los cargos?" },
    { id: "nd_qualifying_disposition_date", type: "date", en: "On what date did the court enter the dismissal or acquittal order?", es: "¿En qué fecha dictó el tribunal la orden de desestimación o absolución?" },
    { id: "nd_dismissal_part_of_plea_agreement", type: "yes_no_unknown", en: "Was the dismissal part of a plea agreement involving a conviction for another offense?", es: "¿Formó parte la desestimación de un acuerdo de culpabilidad que incluyó una condena por otro delito?" },
    { id: "nd_not_fit_to_proceed", type: "yes_no_unknown", en: "Was the case dismissed because you were found not fit to proceed?", es: "¿Se desestimó el caso porque se determinó que no era apto para continuar el proceso?" },
    { id: "nd_lack_of_criminal_responsibility", type: "yes_no_unknown", en: "Was the not-guilty verdict based on lack of criminal responsibility?", es: "¿Se basó el veredicto de no culpabilidad en la falta de responsabilidad penal?" },
    { id: "nd_case_appealed", type: "yes_no_unknown", en: "Was this case appealed?", es: "¿Se apeló este caso?" }
  ],
  [NV_453_ROUTE]: [
    { id: "nv_453_3365_posture", type: "single_choice", options: ["453_336_3_conviction", "453_3363_discharge", "other", "unknown"], en: "Was this a conviction and sentence under NRS 453.336(3), or a discharge and dismissal under NRS 453.3363?", es: "¿Fue una condena y sentencia conforme a NRS 453.336(3), o un alta y desestimación conforme a NRS 453.3363?" },
    { id: "nv_453_3365_terms_completed", type: "yes_no_unknown", en: "Have you completed all conditions imposed by the court and your parole or probation officer?", es: "¿Ha cumplido todas las condiciones impuestas por el tribunal y su oficial de libertad condicional o a prueba?" },
    { id: "conviction_date", type: "date", en: "What is the date of conviction?", es: "¿Cuál es la fecha de la condena?" },
    { id: "sentencing_date", type: "date", en: "What is the date the court imposed sentence?", es: "¿En qué fecha impuso el tribunal la sentencia?" },
    { id: "nv_453_3365_rehabilitation_statement", type: "text", en: "What facts and records would you present at a hearing to show rehabilitation? The judge decides whether rehabilitation is established.", es: "¿Qué hechos y documentos presentaría en una audiencia para demostrar su rehabilitación? El juez decide si se ha demostrado la rehabilitación." }
  ]
} as const;

/**
 * Branch eligibility only. A supported application still needs adopted legal scope,
 * policy, seller compliance, a complete verified packet and commercial authority.
 * null means this module has no implemented rule for that exact route.
 */
export function evaluateResearchLimitedRoute(routeId: string, facts: Facts, asOf: Date | string): ResearchLimitedBranch | null {
  if (routeId === GA_NONCONVICTION_ROUTE) return evaluateGeorgiaNonconviction(facts, asOf);
  const reviewId = routeId === ND_ROUTE ? "R053" : routeId === NV_453_ROUTE ? "R058" : routeId === NV_176A_ROUTE ? "R061" : null;
  if (!reviewId) return null;
  const result = (branchId: string, status: ResearchLimitedBranch["status"], reason: string, missingFactIds: string[] = [], documentIds: string[] = [], externalDocumentIds: string[] = []): ResearchLimitedBranch => ({ reviewId, routeId, branchId, status, missingFactIds, documentIds, externalDocumentIds, reason });
  const today = date(asOf instanceof Date && Number.isFinite(asOf.getTime()) ? asOf.toISOString().slice(0,10) : asOf);
  if (!today) return result("unknown", "unknown", "A valid matter evaluation date is required.", ["as_of_date"]);
  if (routeId === ND_ROUTE) {
    const ids = ["nd_all_charges_nonconviction", ...ND_NONCONVICTION_EXCLUSIONS.map((entry) => `nd_${entry.id}`)];
    const excluded = ND_NONCONVICTION_EXCLUSIONS.filter((entry) => boolean(facts[`nd_${entry.id}`]) === true);
    if (excluded.length) return result("statutory_exclusion", "excluded", excluded.map((entry) => entry.text).join(" "));
    if (boolean(facts.nd_all_charges_nonconviction) === false) return result("not_all_charges_nonconviction", "excluded", "This section requires dismissal or acquittal of every criminal charge in the case.");
    const missing = ids.filter((id) => boolean(facts[id]) === undefined);
    const orderDate = date(facts.nd_qualifying_disposition_date);
    if (!orderDate || orderDate > today) missing.push("nd_qualifying_disposition_date");
    if (missing.length) return result("unknown", "unknown", "The complete nonconviction and each statutory exception must be established; no answer is inferred from an omission.", missing);
    const resolved = resolveNdNonconvictionRoute({nonconvictionOrderDate: orderDate, allChargesDismissedOrAcquitted: true, exclusions: []});
    if (resolved.status === "composed_packet") return result("pre_effective_date_petition", "qualifying", "The pre-August 1, 2025 branch permits a petition to close the court record; no court filing fee is charged under this section.", [], ["petition_to_close_nonconviction_records", "proposed_closing_order", "filing_instructions"], ["actual_nonconviction_order"]);
    if (resolved.status === "no_filing_required") {
      const out = result("post_effective_date_automatic", "guidance", "Court closure follows 61 complete days after the order. Verify on day 62 or the next court business day. No ordinary participant petition is needed; agency criminal-history errors use a separate correction process.");
      out.verificationOn = addDays(orderDate!, 62);
      return out;
    }
    return result("unknown", "unknown", resolved.reason);
  }
  if (routeId === NV_453_ROUTE) {
    const posture = text(facts.nv_453_3365_posture);
    if (posture === "other") return result("outside_section", "excluded", "A different drug offense or disposition does not establish eligibility under NRS 453.3365.");
    if (!["453_336_3_conviction", "453_3363_discharge"].includes(posture)) return result("unknown", "unknown", "The exact statutory conviction or discharge branch must be identified.", ["nv_453_3365_posture"]);
    const complete = boolean(facts.nv_453_3365_terms_completed);
    if (complete === undefined) return result("unknown", "unknown", "Completion of all court and supervision conditions is unknown.", ["nv_453_3365_terms_completed"]);
    if (!complete) return result("completion_required", "not_yet", "All court and supervision conditions must be fulfilled.");
    if (posture === "453_3363_discharge") return result("subsection_2_automatic", "guidance", "After qualifying discharge and dismissal under NRS 453.3363, the court orders sealing subject to the Division's objection process. No routine new paid petition is offered for that automatic branch.");
    const conviction = date(facts.conviction_date), sentence = date(facts.sentencing_date);
    const missing = [!conviction ? "conviction_date" : "", !sentence ? "sentencing_date" : ""].filter(Boolean);
    if (missing.length) return result("subsection_1_petition", "unknown", "The three-year clock requires the actual conviction and sentencing dates.", missing);
    if (sentence! < conviction! || sentence! > today) return result("subsection_1_petition", "unknown", "The conviction and sentencing chronology must be corrected.", ["conviction_date", "sentencing_date"]);
    const eligibleOn = anniversary(sentence!, 3);
    if (today < eligibleOn) return {...result("subsection_1_petition", "not_yet", "Three years must pass after conviction and sentencing; the later sentencing event is the anchor."), eligibleOn};
    if (!text(facts.nv_453_3365_rehabilitation_statement)) return result("subsection_1_petition", "unknown", "The court must assess rehabilitation at a hearing; collect the participant's actual supporting facts without inventing a judicial finding.", ["nv_453_3365_rehabilitation_statement"]);
    return {...result("subsection_1_petition", "qualifying", "A subsection (1) sealing application is supported after three years and completion; rehabilitation remains for the court to decide at a hearing. Professional licensing boards retain statutory access.", [], ["petition_to_seal", "rehabilitation_declaration", "proposed_sealing_order", "service_documents", "hearing_and_filing_instructions"], ["actual_conviction_and_sentence_records", "participant_rehabilitation_evidence"]), eligibleOn};
  }
  const nvFacts = Object.fromEntries(Object.entries(facts).map(([id,value]) => [id,text(value)]));
  const bar = nevada176ASubsection3(nvFacts);
  if (bar === "barred") return result("subsection_3_excluded", "excluded", "NRS 200.508 and NRS 200.5099 charges are barred under subsection (3) on both sealing branches.");
  if (bar === "unresolved") return result("unknown", "unknown", "The excluded-charge question must be answered before either sealing branch can be selected.", [NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]);
  const branch = nevada176ABranch(nvFacts);
  if (branch === "unresolved") return result("unknown", "unknown", "Identify the charge and actual disposition before selecting automatic relief or a petition.", [...NEVADA_176A_BRANCH_FACT_IDS]);
  if (branch === "subsection_1_automatic") return result(branch, "guidance", "The court orders sealing after the qualifying discharge or dismissal, subject to the Division's objection process. No routine participant petition is needed.");
  const ended = date(facts.disposition_date);
  if (!ended || ended > today) return result(branch, "unknown", "The conditional-dismissal or set-aside date starts the seven-year wait.", ["disposition_date"]);
  const eligibleOn = anniversary(ended, 7);
  if (today < eligibleOn) return {...result(branch, "not_yet", "The subsection (2) petition cannot be filed before seven years after the conditional dismissal or set-aside."), eligibleOn};
  return {...result(branch, "qualifying", "The supported domestic-violence/DUI petition branch has reached seven years. This branch selection does not establish packet or checkout authority.", [], ["petition_to_seal", "declaration", "proposed_sealing_order", "filing_instructions"], ["actual_conditional_dismissal_or_set_aside_order"]), eligibleOn};
}

export function research115AdditionalQuestions(routeId: string, facts: Readonly<Record<string, unknown>>) {
  return routeId === GA_NONCONVICTION_ROUTE ? georgiaNonconvictionQuestions(facts) : [];
}
