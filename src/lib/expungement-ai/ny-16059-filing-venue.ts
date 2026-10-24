import { nyClassificationAnswerCurrent } from "@/lib/expungement-ai/ny-16059-case-classification";
import { nyStatutoryClassCoherent, nyStatutoryClassCurrent } from "@/lib/expungement-ai/ny-16059-statutory-class";
import type { NyCourtCaseRecord } from "@/lib/expungement-ai/ny-16059-case-records";

/** CPL160.59(2)(a), current form Where To File, PEN55.05. This is a
 * consistency comparison of owned records, not a judicial venue decision.
 * Literal court identity only: no alias, transaction or court-transfer inference. */
export function nyFilingVenueComparison(records: readonly NyCourtCaseRecord[]) {
  const entries = records.flatMap(record => record.convictions.map(conviction => ({ record, conviction })));
  const identity = (record: NyCourtCaseRecord) => JSON.stringify([record.courtName, record.courtCounty]);
  const usableCourt = (record: NyCourtCaseRecord) => [record.courtName, record.courtCounty].every(value => value.trim() && !/^(unknown|unsure|not sure|i am not sure|no estoy segur[oa])$/i.test(value.trim()));
  const broad = (entry: typeof entries[number]) => nyClassificationAnswerCurrent(entry.conviction, "recordClass") ? entry.conviction.classification!.recordClass.value : "";
  const detail = (entry: typeof entries[number]) => nyStatutoryClassCoherent(entry.conviction) ? entry.conviction.statutoryClass!.value : "";
  const rank: Record<string, number> = { felony_a: 5, felony_b: 4, felony_c: 3, felony_d: 2, felony_e: 1, misdemeanor_a: 2, misdemeanor_b: 1 };
  const conflicts = entries.filter(({ conviction }) => nyStatutoryClassCurrent(conviction) && !["", "unknown"].includes(conviction.statutoryClass!.value)
    && !nyStatutoryClassCoherent(conviction)).map(({ conviction }) => conviction.id);
  const base = { candidateCaseIds: [] as string[], missingClassConvictionIds: [] as string[], conflictingClassConvictionIds: conflicts,
    basis: "unresolved" as "unresolved" | "one_court" | "most_serious" | "latest_same_class", tiedCourts: false,
    reviewReason: null as null | "incomparable_classes" | "mixed_class_tie", legallyReviewed: false as const };
  if (!entries.length || records.some(record => !record.convictions.length || !usableCourt(record))) return base;
  if (new Set(records.map(identity)).size === 1) return { ...base, candidateCaseIds: records.map(record => record.id), basis: "one_court" as const };
  // A known felony eliminates misdemeanor competitors regardless of their A/B
  // grade. Unknown broad classes cannot be silently treated as misdemeanors.
  let candidates = entries.filter(entry => !entries.some(other => broad(other) === "felony" && broad(entry) === "misdemeanor"));
  const possibleCourts = new Set(candidates.map(entry => identity(entry.record)));
  if (possibleCourts.size > 1) {
    candidates = candidates.filter(entry => !candidates.some(other => broad(other) === broad(entry) && rank[detail(other)] && rank[detail(entry)] && rank[detail(other)] > rank[detail(entry)]));
  }
  const unresolvedClasses = new Set(candidates.map(entry => identity(entry.record))).size > 1
    ? candidates.filter(entry => !detail(entry)).map(entry => entry.conviction.id) : [];
  let basis: typeof base.basis = "most_serious";
  const classes = entries.map(detail);
  // The statute's express date rule says ALL offenses have the same class.
  // Mixed-class ties are retained for review, not resolved by array order.
  if (classes.every(value => !!value && value === classes[0])) {
    const dates = entries.map(entry => entry.conviction.convictionDate);
    const valid = dates.every(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith("0000")
      && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
      && value <= new Date().toISOString().slice(0, 10));
    if (valid) {
      const latest = [...dates].sort().at(-1);
      candidates = entries.filter(entry => entry.conviction.convictionDate === latest);
      basis = "latest_same_class";
    } else basis = "unresolved";
  }
  const candidateCourts = new Set(candidates.map(entry => identity(entry.record)));
  const reviewReason = candidateCourts.size > 1 && !unresolvedClasses.length && basis !== "latest_same_class"
    ? new Set(candidates.map(detail)).size > 1 ? "incomparable_classes" as const : "mixed_class_tie" as const : null;
  // Every stable case at the same actual destination stays selectable.
  return { ...base, candidateCaseIds: records.filter(record => candidateCourts.has(identity(record))).map(record => record.id),
    missingClassConvictionIds: unresolvedClasses, basis: unresolvedClasses.length || reviewReason ? "unresolved" as const : basis, reviewReason,
    tiedCourts: candidateCourts.size > 1 };
}
