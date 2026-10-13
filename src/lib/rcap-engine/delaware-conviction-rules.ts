import { DE_CONVICTION_FACT_IDS, DE_CONVICTION_QUESTIONS } from "@/lib/rcap-engine/delaware-conviction-questions";
export { DE_CONVICTION_QUESTIONS, DE_CONVICTION_FACT_IDS } from "@/lib/rcap-engine/delaware-conviction-questions";
import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { answerText, isAffirmative, isNegative } from "@/lib/rcap-engine/answer-normalization";

export const DE_COURT = "discretionary-court-expungement-under-11-del-c-4374";
export const DE_SBI = "mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a";
export const DE_SOURCE = "https://delcode.delaware.gov/title11/c043/sc07/index.html";
type Answers = Record<string, unknown>;
export type DeDecision = { status: "not_applicable" | "missing" | "review" | "excluded" | "not_yet" | "satisfied"; ids?: string[]; code?: string; branch?: string; years?: number; eligibleOn?: string };
export function deAdultConviction(answers: Answers) {
  return ["Misdemeanor conviction", "Felony conviction"].includes(String(answers.case_outcome))
    || answers.case_outcome === "Other conviction or adjudication" && answers.offense_level === "Infraction or violation";
}
export function delawareConvictionRoute(answers: Answers): string | undefined {
  if (!deAdultConviction(answers) || !isNegative(answers.pardon_status as ScreeningAnswerValue)) return undefined;
  return answers.de_request === "court" ? DE_COURT : answers.de_request === "sbi" ? DE_SBI : undefined;
}
const fail = (status: DeDecision["status"], code: string, ids: string[] = []): DeDecision => ({ status, code, ids });
function date(value: unknown, today: string): string | undefined {
  const text = answerText(value as ScreeningAnswerValue);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const parsed = new Date(text + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text && text <= today ? text : undefined;
}
function anniversary(anchor: string, years: number) {
  // Preserve the evaluator's existing calendar-year arithmetic (addDuration).
  const d = new Date(anchor + "T00:00:00.000Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** §4374(a)(1)-(4), §4373(a), and the distinct §4372 exceptions.
 * Explicit record facts, never optional legal-route labels, determine the tier.
 * A satisfied predicate is not a court grant, manifest-injustice finding or offer.
 */
export function delawareConvictionDecision(a: Answers, today: string): DeDecision {
  if (!deAdultConviction(a) || isAffirmative(a.pardon_status as ScreeningAnswerValue)) return { status: "not_applicable" };
  const route = delawareConvictionRoute(a);
  if (!route) return fail("missing", "conviction_facts_missing", ["de_request", ...(!isNegative(a.pardon_status as ScreeningAnswerValue) ? ["pardon_status"] : [])]);
  const court = route === DE_COURT;
  const required = ["de_case_scope", "de_all_charges", ...(!court ? ["de_special_convictions"] : []), "de_common_exclusions", ...(a.de_case_scope !== "one_felony" || !court ? ["de_mandatory_exclusions"] : []), "de_motor_vehicle", "de_other_convictions", "de_pending_charges", "de_supervision", "de_financial_status", "de_incarceration", ...(court ? ["de_court_exclusions", "de_prior_expungement"] : [])];
  const missing = required.filter(id => {
    const q = DE_CONVICTION_QUESTIONS.find(q => q.id === id)!;
    const values = Array.isArray(a[id]) ? a[id] : [a[id]];
    return !values.length || values.some(v => v === "unknown" || (!Array.isArray(q.options) || !q.options.includes(String(v))))
      || q.type === "multi_select" && values.length > 1 && values.includes("none");
  });
  if (missing.length) return fail("missing", "conviction_facts_missing", missing);
  const list = (id: string): string[] => Array.isArray(a[id]) ? a[id] as string[] : [String(a[id])];
  const scope = a.de_case_scope, felony = scope === "one_felony", multi = scope === "multiple_cases";
  if (felony !== (a.case_outcome === "Felony conviction") || felony !== (a.offense_level === "Felony")
    || scope === "one_violations" && a.offense_level !== "Infraction or violation"
    || scope === "one_misdemeanors" && a.offense_level !== "Misdemeanor") return fail("review", "record_conflict");
  if (list("de_common_exclusions").some(v => v !== "none")) return fail("excluded", "common_exclusion");
  if (a.de_motor_vehicle === "other" || !court && a.de_motor_vehicle !== "none") return fail("excluded", "motor_vehicle_exclusion");
  if (court && list("de_court_exclusions").some(v => v !== "none")) return fail("excluded", "court_exclusion");
  const listed = list("de_mandatory_exclusions").some(v => v !== "none");
  if (!court && listed) return fail("excluded", "mandatory_exclusion");
  if (multi && listed) return fail("review", "multiple_case_scope");
  const pending = list("de_pending_charges"), history = list("de_other_convictions");
  if (pending.includes("other") || a.de_supervision !== "none" || a.de_incarceration === "serving") return fail("not_yet", "active_obligation");
  // A precise exception may explain a broad Yes; a precise None cannot erase it.
  if (isAffirmative(a.pending_cases as ScreeningAnswerValue) && pending.includes("none")
    || isAffirmative(a.new_convictions_during_waiting_period as ScreeningAnswerValue) && history.includes("none")) return fail("review", "record_conflict");
  if (isNegative(a.sentence_completion_date as ScreeningAnswerValue) || a.court_requirements_completed === "no") return fail("not_yet", "active_obligation");
  if (a.de_financial_status === "unpaid_restitution" || a.de_financial_status === "unpaid_other") return fail("not_yet", "financial_unresolved");
  if (a.de_financial_status === "nonwilful_fines") return fail("review", "financial_court_decision");
  if (a.de_financial_status === "paid" && isNegative(a.financial_obligations as ScreeningAnswerValue)) return fail("review", "record_conflict");
  if (a.de_all_charges === "other_ineligible") return fail("review", "whole_case_unconfirmed");
  if (a.de_all_charges === "old_unresolved") {
    const old = date(a.de_latest_unresolved_charge_date, today);
    if (!old) return fail("missing", "date_missing_invalid", ["de_latest_unresolved_charge_date"]);
    if (!["yes", "no"].includes(String(a.de_active_warrant)) || !["yes", "no"].includes(String(a.de_recent_case_activity))) return fail("missing", "conviction_facts_missing", ["de_active_warrant", "de_recent_case_activity"]);
    if (a.de_active_warrant === "yes" || a.de_recent_case_activity === "yes" || anniversary(old, 7) > today) return fail("review", "old_charge_exception_unproved");
  }
  const conviction = date(a.conviction_date, today);
  if (!conviction) return fail("missing", "date_missing_invalid", ["conviction_date"]);
  let release: string | undefined;
  if (a.de_incarceration === "released" || a.release_date !== undefined && a.release_date !== "") {
    release = date(a.release_date, today);
    if (!release) return fail("missing", "date_missing_invalid", ["release_date"]);
    if (a.de_incarceration === "never") return fail("review", "record_conflict");
  }
  if (court && a.de_prior_expungement !== "none") {
    const prior = date(a.de_prior_expungement_date, today);
    if (!prior) return fail("missing", "date_missing_invalid", ["de_prior_expungement_date"]);
    if (felony && a.de_prior_expungement === "felony" && conviction > prior) return fail("excluded", "subsequent_felony");
    if (prior > "2019-12-27" && anniversary(prior, 10) > today) return fail("not_yet", "prior_expungement_wait");
  }
  const special = String(a.de_special_convictions);
  if ((["11_828", "11_861b2", "11_903", "16_4757", "16_4758", "16_4760"].includes(special) && !felony)
    || ["16_4764", "16_4771", "marijuana_paraphernalia", "4_904ef"].includes(special) && felony) return fail("review", "record_conflict");
  let years: number, branch: string, later = court;
  if (court) {
    if (scope === "one_violations") return fail("review", "mandatory_alternative");
    years = multi ? 5 : felony || listed ? 7 : 3;
    branch = multi ? "4374(a)(4)" : felony ? "4374(a)(3)" : listed ? "4374(a)(2)" : "4374(a)(1)";
  } else {
    if (multi) return fail("review", "mandatory_cases_separate");
    if (["16_4764", "16_4771", "marijuana_paraphernalia", "4_904ef"].includes(special)) { years = 0; branch = "4373(a)(1)(c)-(d)"; }
    else if (scope === "one_violations") { years = 3; branch = "4373(a)(1)(b)"; }
    else if (!felony || special === "16_4756") { years = 5; branch = "4373(a)(2)(a)-(b)"; }
    else if (["11_828", "11_861b2", "11_903", "16_4757", "16_4758", "16_4760"].includes(special)) { years = 10; later = true; branch = "4373(a)(2)(c)"; }
    else return fail("excluded", "mandatory_felony_scope");
  }
  const tierA = branch.startsWith("4373(a)(1)");
  if (!tierA && (history.includes("other") || history.includes("mandatory_standalone") && !multi)) return fail("excluded", "history_exclusion");
  if (multi && history.includes("mandatory_standalone") && a.de_other_cases_individually_eligible !== "yes") return fail("missing", "whole_case_unconfirmed", ["de_other_cases_individually_eligible"]);
  // Later-of applies only to §4374 and §4373(a)(2)(c). Tier A/B misdemeanor
  // mandatory clocks run from conviction, even when release was later.
  const anchor = later && release && release > conviction ? release : conviction;
  const eligibleOn = anniversary(anchor, years);
  return { status: eligibleOn > today ? "not_yet" : "satisfied", code: eligibleOn > today ? "conviction_wait" : "conviction_threshold_met", branch, years, eligibleOn };
}


export function deConvictionQuestionApplies(jurisdiction: string, a: Answers, id: string) {
  if (jurisdiction !== "DE" || !DE_CONVICTION_FACT_IDS.includes(id)) return true;
  if (!deAdultConviction(a) || isAffirmative(a.pardon_status as ScreeningAnswerValue)) return false;
  if (id === "de_special_convictions") return a.de_request === "sbi";
  if (id === "de_mandatory_exclusions" && a.de_case_scope === "one_felony") return a.de_request === "sbi";
  if (["de_court_exclusions", "de_prior_expungement"].includes(id)) return a.de_request === "court";
  if (id === "de_prior_expungement_date") return a.de_request === "court" && ["conviction", "felony"].includes(String(a.de_prior_expungement));
  if (id === "release_date") return a.de_incarceration === "released";
  if (["de_latest_unresolved_charge_date", "de_active_warrant", "de_recent_case_activity"].includes(id)) return a.de_all_charges === "old_unresolved";
  if (id === "de_other_cases_individually_eligible") return a.de_case_scope === "multiple_cases" && Array.isArray(a.de_other_convictions) && a.de_other_convictions.includes("mandatory_standalone");
  return true;
}

export const DE_REASON_TEXT: Record<string, string> = {
  "conviction_facts_missing": "Check the exact Delaware conviction, case scope, criminal history and requested procedure. A route label or broad category does not establish these facts.",
  "record_conflict": "The Delaware record answers conflict. Confirm the conviction class, sentence, dates and case history before continuing.",
  "common_exclusion": "A conviction identified here is excluded by §4372(f)(3). This does not decide eligibility under a separate pardon procedure.",
  "motor_vehicle_exclusion": "This motor-vehicle record is outside the requested procedure. Only the three specified Title 21 exceptions may be considered under §4374(i).",
  "court_exclusion": "A conviction identified here is excluded from ordinary discretionary expungement by §4374(b). A pardon procedure has separate requirements.",
  "mandatory_exclusion": "The recorded offense or victim facts exclude mandatory expungement under §4373(b). Some listed misdemeanors may instead be considered by a court after seven years and all other requirements.",
  "multiple_case_scope": "The five-year multiple-case provision does not include a misdemeanor listed in §4373(b). Review the separate cases and procedures.",
  "active_obligation": "A non-excepted pending criminal charge or an unfinished sentence prevents this Delaware request from proceeding now.",
  "financial_unresolved": "Restitution or other unresolved payment obligations prevent this request from proceeding now. An exception for fines or fees does not establish that restitution was paid.",
  "financial_court_decision": "A court must decide whether to waive or convert these unpaid fines or fees under §4372(l). Nonwilful nonpayment is not an automatic waiver.",
  "whole_case_unconfirmed": "Confirm eligibility of every charge in each affected case. A qualifying conviction alone does not establish whole-case eligibility.",
  "date_missing_invalid": "Supply the requested real calendar date from the record. An unknown, impossible or future date cannot establish the Delaware waiting period.",
  "old_charge_exception_unproved": "The old unresolved-charge exception requires seven years, no active warrant and no documented case activity in the last twelve months. These facts are not established.",
  "subsequent_felony": "This felony conviction occurred after expungement of a prior felony conviction and is excluded by §4372(f)(4)(a) from this ordinary court procedure.",
  "prior_expungement_wait": "The applicable ten-year period after a prior conviction expungement has not ended under §4372(f)(4)(b). This restriction does not apply to a request under §4373(a)(1) or (a)(2).",
  "mandatory_alternative": "A single case containing only violations requires review under the mandatory procedure; it does not establish a §4374(a) court-petition category.",
  "mandatory_cases_separate": "Multiple mandatory-eligible cases may share an application, but each case must first be checked separately under §4373.",
  "mandatory_felony_scope": "This felony is not one of the specific convictions listed for mandatory expungement. Ordinary discretionary and pardon procedures have separate requirements.",
  "history_exclusion": "The other conviction history does not satisfy this procedure. The statutory alcohol, personal-use marijuana, paraphernalia and Title 21 exceptions were considered separately.",
  "conviction_wait": "The waiting period for this exact Delaware conviction category has not ended. Discretionary and mandatory procedures use different periods and anchors.",
  "conviction_threshold_met": "The supplied facts meet the checked Delaware timing and exclusion predicates. This is not an expungement order, a finding of manifest injustice or permission to purchase a packet."
};
