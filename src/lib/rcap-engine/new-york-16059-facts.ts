import { NY_TRANSACTION_ASSOCIATIONS_ID, nyTransactionFactsFromAnswers } from "@/lib/expungement-ai/ny-16059-transaction-facts";
import { NY_16059_QUESTIONS, NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID } from "@/lib/rcap-engine/new-york-16059-questions";
export { NY_16059_QUESTIONS, NY_16059_FACT_IDS, NY_16059_LEGACY_IDS, NY_16059_TIMING_IDS, NY_16059_REASON_COPY, NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID } from "@/lib/rcap-engine/new-york-16059-questions";
import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { isAffirmative, isNegative } from "@/lib/rcap-engine/answer-normalization";

export const NY_16059_ROUTE = "discretionary-conviction-sealing-by-petition-under-cpl-160-59";
export const NY_16059_SOURCE = "https://www.nysenate.gov/legislation/laws/CPL/160.59";
type Answers = Record<string, ScreeningAnswerValue>;
type Decision = { status: "satisfied" | "missing" | "review" | "excluded" | "not_yet"; code?: string; ids?: string[]; computedPeriodEndDate?: string; recommendedFilingDate?: string; qualifyingCustodyDays?: number; anchor?: string };
const fail = (status: Decision["status"], code: string, ids: string[] = []): Decision => ({ status, code, ids });
export function ny16059Requested(a: Answers) { return a.ny_16059_request === "petition"; }
const integer = (v: ScreeningAnswerValue | undefined): number | undefined => {
  if (typeof v !== "number" && (typeof v !== "string" || !/^\d+$/.test(v))) return undefined;
  const n = Number(v); return Number.isSafeInteger(n) && n >= 0 ? n : undefined;
};

/** Record facts for the existing evaluator, not an alternative eligibility engine.
 * Old eligible-count/cap answers remain raw historical context, never a history
 * count, an order or evidence that a new application was granted.
 */
export function ny16059History(a: Answers): Decision {
  if (!["Misdemeanor conviction", "Felony conviction"].includes(String(a.case_outcome))) return fail("review", "history_conflict");
  const ids = ["ny_16059_history_total", "ny_16059_history_felonies", "ny_16059_requested_total", "ny_16059_requested_felonies", "ny_16059_granted_total", "ny_16059_granted_felonies"];
  const missing = ids.filter(id => integer(a[id]) === undefined);
  for (const id of ["ny_16059_grouping", "ny_16059_application_status", "ny_16059_16058_grants"]) {
    const q = NY_16059_QUESTIONS.find(q => q.id === id)!;
    if (a[id] === "unknown" || !Array.isArray(q.options) || !q.options.includes(String(a[id]))) missing.push(id);
  }
  if (missing.length) return fail("missing", "history_missing", missing);
  const [total, felonies, requested, requestedFelonies, granted, grantedFelonies] = ids.map(id => integer(a[id])!);
  if (!total || !requested || requested > total || felonies > total || requestedFelonies > requested || requestedFelonies > felonies
    || granted > total || grantedFelonies > granted || grantedFelonies > felonies
    || requested + granted > total || requestedFelonies + grantedFelonies > felonies
    || a.case_outcome === "Felony conviction" && requestedFelonies === 0
    || a.offense_level === "Felony" && requestedFelonies === 0
    || a.ny_16059_application_status === "granted" && granted === 0
    || ["none", "denied", "pending"].includes(String(a.ny_16059_application_status)) && granted > 0) return fail("review", "history_conflict");
  let requestUnits = requested, requestFelonyUnits = requestedFelonies, historyUnits = total, historyFelonyUnits = felonies;
  // The adopted NY-03 ordinary transaction test uses the same exact record
  // associations as protected collection. A generic conclusion never supplies
  // these predicates or groups convictions outside the covered record universe.
  if (["connected", "other_groups"].includes(String(a.ny_16059_grouping))) {
    const facts = nyTransactionFactsFromAnswers(a);
    if (Object.hasOwn(a, NY_TRANSACTION_ASSOCIATIONS_ID)) {
      if (!facts.complete || ["case_outcome", "ny_16059_grouping", "ny_16059_application_status", "ny_16059_16058_grants"].some(id => typeof a[id] !== "string")
        || a.ny_16059_requested_excluded !== "No"
        || isAffirmative(a.ny_16059_transaction_shared_docket_only)) return fail("review", "grouping_record_facts_unresolved", [NY_TRANSACTION_ASSOCIATIONS_ID]);
      // "Other groups" expressly includes convictions outside this request.
      // Covered-only facts cannot allocate that unrecorded part of the history.
      if (a.ny_16059_grouping === "other_groups" && requested !== total) return fail("review", "grouping_other_history_unresolved", [NY_TRANSACTION_ASSOCIATIONS_ID]);
      requestUnits = facts.coveredTransactionCount!; requestFelonyUnits = facts.coveredFelonyTransactionCount!;
      historyUnits = total - requested + requestUnits;
      historyFelonyUnits = felonies - requestedFelonies + requestFelonyUnits;
    } else {
      const missing = NY_16059_TRANSACTION_IDS.filter(id => !isAffirmative(a[id]) && !isNegative(a[id]));
      if (missing.length) return fail("missing", "grouping_facts_missing", missing);
      if (isAffirmative(a.ny_16059_transaction_shared_docket_only)
        && (isAffirmative(a.ny_16059_transaction_time_circumstance) || isAffirmative(a.ny_16059_transaction_integral_purpose))) return fail("review", "grouping_facts_conflict");
      return fail("review", "grouping_review");
    }
  } else if (a.ny_16059_grouping === "single_act") {
    if (!isNegative(a.ny_16059_requested_excluded)) return fail("review", "grouping_review");
    requestUnits = 1; requestFelonyUnits = requestedFelonies > 0 ? 1 : 0;
    historyUnits = total - requested + 1;
    historyFelonyUnits = felonies - requestedFelonies + requestFelonyUnits;
  } else if (a.ny_16059_grouping !== "separate") return fail("review", "grouping_review");
  // Every criminal conviction elsewhere in history counts, not only eligible
  // convictions or those sought in this petition. Vacated/expunged matters are
  // excluded only when their actual disposition is established by the record.
  if (historyUnits > 2 || historyFelonyUnits > 1) return fail("excluded", "history_limit");
  if (requestUnits > 2 || requestFelonyUnits > 1) return fail("excluded", "request_limit");
  if (granted >= 2 || grantedFelonies >= 1 && requestFelonyUnits > 0 || granted + requestUnits > 2) return fail("excluded", "sealing_capacity");
  // §3(b) references a maximum under §160.58, whose §2 distinguishes the
  // treatment convictions from up to three additional prior misdemeanors.
  // Any grant is NOT automatically the maximum. Exact order review is needed.
  if (a.ny_16059_16058_grants === "granted") {
    const missing = NY_16059_ORDER_IDS.filter(id => integer(a[id]) === undefined);
    if (missing.length) return fail("missing", "16058_components_missing", missing);
    const treatment = integer(a.ny_16059_16058_treatment_count)!;
    const additional = integer(a.ny_16059_16058_additional_count)!;
    if (!treatment || additional > 3) return fail("review", "16058_components_conflict");
    // §160.58(1)-(2): treatment conviction(s) and up to three additional prior
    // eligible misdemeanors. Neither a partial order nor three additional
    // entries independently establishes the §160.59(3)(b) interpretation.
    return fail("review", "16058_order_review");
  }
  return { status: "satisfied" };
}
const DAY = 86400000;
function date(value: ScreeningAnswerValue | undefined, today: string): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value && value <= today ? value : undefined;
}
const day = (s: string) => new Date(s + "T00:00:00Z").getTime() / DAY;
/** Internal half-open intervals represent confirmed inclusive physical days. */
function unionDays(intervals: [number, number][]) {
  let end = -Infinity, days = 0;
  for (const [start, finish] of intervals.toSorted((a, b) => a[0] - b[0])) { days += Math.max(0, finish - Math.max(start, end)); end = Math.max(end, finish); }
  return days;
}
function calendarMonths(anchor: string, months: number): Date {
  const result = new Date(anchor + "T00:00:00Z"), originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const last = new Date(result.getTime());
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  result.setUTCDate(Math.min(originalDay, last.getUTCDate()));
  return result;
}
export function ny16059Clock(a: Answers, today: string): Decision {
  const supplied = ["sentencing_date", "release_date", "ny_16059_earliest_conviction_date"];
  const invalid = supplied.filter(id => a[id] !== undefined && !date(a[id], today));
  if (invalid.length) return fail("missing", "anchor_invalid", invalid);
  const required = ["sentencing_date", "ny_16059_earliest_conviction_date"];
  if (isAffirmative(a.ny_16059_sentence_incarceration)) required.push("release_date");
  const missing = required.filter(id => !date(a[id], today));
  if (!isAffirmative(a.ny_16059_sentence_incarceration) && !isNegative(a.ny_16059_sentence_incarceration)) missing.push("ny_16059_sentence_incarceration");
  if (!["none", "released", "current"].includes(String(a.ny_16059_incarceration_history))) missing.push("ny_16059_incarceration_history");
  if (missing.length) return fail("missing", "clock_missing", missing);
  const sentence = String(a.sentencing_date), conviction = String(a.ny_16059_earliest_conviction_date), release = a.release_date === undefined ? undefined : String(a.release_date);
  if (conviction > sentence || isAffirmative(a.ny_16059_sentence_incarceration) && release! < sentence
    || a.ny_16059_incarceration_history === "none" && (isAffirmative(a.ny_16059_sentence_incarceration) || release !== undefined || Boolean(a.ny_16059_incarceration_periods))) return fail("review", "clock_conflict");
  if (a.ny_16059_incarceration_history === "current") return fail("not_yet", "incarcerated");
  const periods: [number, number][] = [];
  if (a.ny_16059_incarceration_history === "released") {
    const raw = a.ny_16059_incarceration_periods;
    if (typeof raw !== "string" || !raw.trim()) return fail("missing", "clock_missing", ["ny_16059_incarceration_periods"]);
    let lastRelease = -Infinity;
    for (const row of raw.split(/[;\n]+/)) {
      const parts = row.trim().split(/\s*\/\s*/);
      const start = date(parts[0], today), end = date(parts[1], today);
      if (parts.length !== 2 || !start || !end || start > end) return fail("missing", "period_invalid", ["ny_16059_incarceration_periods"]);
      lastRelease = Math.max(lastRelease, day(end));
      // Preserve pre-conviction raw dates. Only qualifying postconviction days
      // count, including a conviction-day portion only when explicitly known.
      if (end >= conviction) periods.push([Math.max(day(start), day(conviction)), day(end) + 1]);
    }
    if (!periods.length || release && lastRelease !== day(release)) return fail("review", "clock_conflict");
    // These new fact IDs are never inferred from old interval/date scalars.
    // They describe the records' meaning, not a mandatory upload or new form.
    const confirmations = [NY_16059_CUSTODY_CONFIRMATION_ID,
      ...(isAffirmative(a.ny_16059_sentence_incarceration) ? [NY_16059_RELEASE_CONFIRMATION_ID] : [])];
    const absent = confirmations.filter(id => a[id] === undefined);
    if (absent.length) return fail("missing", "clock_missing", absent);
    if (!isAffirmative(a[NY_16059_CUSTODY_CONFIRMATION_ID])) return fail("review", "clock_custody_confirmation", [NY_16059_CUSTODY_CONFIRMATION_ID]);
    if (isAffirmative(a.ny_16059_sentence_incarceration) && !isAffirmative(a[NY_16059_RELEASE_CONFIRMATION_ID])) return fail("review", "clock_release_relationship", [NY_16059_RELEASE_CONFIRMATION_ID]);
  }
  const anchor = isAffirmative(a.ny_16059_sentence_incarceration) ? release! : sentence;
  const qualifyingCustodyDays = unionDays(periods);
  const endpoint = calendarMonths(anchor, 120);
  endpoint.setUTCDate(endpoint.getUTCDate() + qualifyingCustodyDays);
  const recommended = new Date(endpoint.getTime());
  recommended.setUTCDate(recommended.getUTCDate() + 1);
  const computedPeriodEndDate = endpoint.toISOString().slice(0, 10);
  const details = { computedPeriodEndDate, recommendedFilingDate: recommended.toISOString().slice(0, 10), qualifyingCustodyDays, anchor };
  // Adopted section 3: next-day filing is labeled conservative guidance. It
  // cannot add another statutory eligibility/payment refusal on the endpoint.
  return today < computedPeriodEndDate ? { ...fail("not_yet", "clock_not_yet"), ...details } : { status: "satisfied", ...details };
}

export const NY_16059_ORDER_IDS = ["ny_16059_16058_treatment_count", "ny_16059_16058_additional_count"];
export const NY_16059_TRANSACTION_IDS = ["ny_16059_transaction_time_circumstance", "ny_16059_transaction_integral_purpose", "ny_16059_transaction_shared_docket_only", "ny_16059_transaction_multiple_victims"];
export function ny16059QuestionApplies(a: Answers, id: string): boolean {
  if (id === NY_16059_CUSTODY_CONFIRMATION_ID) return a.ny_16059_incarceration_history === "released";
  if (id === NY_16059_RELEASE_CONFIRMATION_ID) return a.ny_16059_incarceration_history === "released" && isAffirmative(a.ny_16059_sentence_incarceration);
  if (NY_16059_ORDER_IDS.includes(id)) return a.ny_16059_16058_grants === "granted";
  if (NY_16059_TRANSACTION_IDS.includes(id)) return ["connected", "other_groups"].includes(String(a.ny_16059_grouping));
  return true;
}
