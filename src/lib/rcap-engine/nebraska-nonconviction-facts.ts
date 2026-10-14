/**
 * §29-3523(3)(c)(iii), (7): an acquittal's automatic record process has no
 * payment predicate. NE.memo/ne-nonconviction-auto likewise asks no financial
 * fact. This only identifies an irrelevant question, never legal eligibility,
 * completed sealing, a waiver, or authority to sell or generate a packet.
 * Other dispositions, juvenile records and unknown ages retain their review.
 */
export function nebraskaNonconvictionQuestionApplies(
  jurisdiction: string,
  pathwayId: string | null | undefined,
  answers: Record<string, unknown>,
  questionId: string
): boolean {
  if (questionId !== "financial_obligations" || jurisdiction !== "NE"
    || pathwayId !== "automatic-nonconviction-sealing"
    || answers.case_outcome !== "Acquitted or found not guilty") return true;
  let rawAge = answers.age_at_offense;
  // The actual number-or-unknown control saves this explicit known wrapper.
  // Unknown or malformed wrappers never supply an adult-age assumption.
  if (rawAge && typeof rawAge === "object" && !Array.isArray(rawAge)) {
    const wrapped = rawAge as Record<string, unknown>;
    if (wrapped.unknown !== false || Object.keys(wrapped).some(key => !["value", "unknown"].includes(key))) return true;
    rawAge = wrapped.value;
  }
  const age = typeof rawAge === "number" ? rawAge
    : typeof rawAge === "string" && /^\d+$/.test(rawAge.trim()) ? Number(rawAge) : NaN;
  return !Number.isSafeInteger(age) || age < 18;
}
