/** Historical replay only: retained pre-NY02-adoption meaning proves a saved
 * tuple before tightening it to a nonpayable clarification hold. Never used by
 * current screening, result dates, verification or commercial authority. */
import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { isAffirmative, isNegative } from "@/lib/rcap-engine/answer-normalization";
type Answers = Record<string, ScreeningAnswerValue>;
type Decision = { status: "satisfied" | "missing" | "review" | "not_yet"; code?: string; ids?: string[]; eligibleOn?: string; latestPossibleOn?: string; excludedDays?: number; allPostConvictionDays?: number; anchor?: string };
const fail = (status: Decision["status"], code: string, ids: string[] = []): Decision => ({ status, code, ids });
const DAY = 86400000;
function date(value: ScreeningAnswerValue | undefined, today: string): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value && value <= today ? value : undefined;
}
const day = (s: string) => new Date(s + "T00:00:00Z").getTime() / DAY;
function unionDays(intervals: [number, number][]) {
  let end = -Infinity, days = 0;
  for (const [start, finish] of intervals.toSorted((a, b) => a[0] - b[0])) { days += Math.max(0, finish - Math.max(start, end)); end = Math.max(end, finish); }
  return days;
}
function priorClock(a: Answers, today: string): Decision {
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
    for (const row of raw.split(/[;\n]+/)) {
      const parts = row.trim().split(/\s*\/\s*/);
      const start = date(parts[0], today), end = date(parts[1], today);
      if (parts.length !== 2 || !start || !end || start > end) return fail("missing", "period_invalid", ["ny_16059_incarceration_periods"]);
      // Retain supplied pre-conviction periods, but exclude only time after
      // the earliest requested conviction. Admission inclusive/release exclusive.
      if (end > conviction) periods.push([Math.max(day(start), day(conviction)), day(end)]);
    }
    if (!periods.length) return fail("review", "clock_conflict");
    if (release && Math.max(...periods.map(p => p[1])) !== day(release)) return fail("review", "clock_conflict");
  }
  const anchor = isAffirmative(a.ny_16059_sentence_incarceration) ? release! : sentence;
  const anniversary = new Date(anchor + "T00:00:00Z");
  // Preserve the existing calendar-year convention: Feb 29 +10 => March 1.
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 10);
  const afterAnchor = unionDays(periods.map(([s, e]) => [Math.max(s, day(anchor)), Math.max(e, day(anchor))]));
  const allPostConviction = unionDays(periods);
  const iso = (days: number) => new Date(anniversary.getTime() + days * DAY).toISOString().slice(0, 10);
  const earliest = iso(afterAnchor), latest = iso(allPostConviction);
  // Retained NY memo and §5's second sentence say all post-conviction time;
  // the first sentence and official form start at release. Do not guess whether
  // time already outside the anchored clock must be added again. When this
  // changes today's outcome, hold only this decision for qualified review.
  const details = { eligibleOn: earliest, latestPossibleOn: latest, excludedDays: afterAnchor, allPostConvictionDays: allPostConviction, anchor };
  if (today < earliest) return { ...fail("not_yet", "clock_not_yet"), ...details };
  if (today < latest) return { ...fail("review", "clock_interpretation"), ...details };
  return { status: "satisfied", ...details };
}


export function ny16059PriorClockStatus(answers: Answers, capturedDay: string) { return priorClock(answers, capturedDay).status; }
