import { RESEARCH115_NO_ROUTES, research115NoRoute } from "@/lib/rcap-engine/research115-no-ordinary-packet";
export { RESEARCH115_NO_ROUTES, research115NoRoute };
import { GA_NONCONVICTION_ROUTE, georgiaNonconvictionQuestions, evaluateGeorgiaNonconviction } from "@/lib/rcap-engine/georgia-nonconviction-research";
import { resolveNdNonconvictionRoute, ND_NONCONVICTION_EXCLUSIONS } from "@/lib/record-clearing/north-dakota-nonconviction-spec";
import { nevada176ABranch, nevada176ASubsection3, NEVADA_176A_BRANCH_FACT_IDS, NEVADA_176A_EXCLUDED_CHARGE_FACT_ID } from "@/lib/rcap-engine/nevada-176a-branch";

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
