/** Decimal grams belong only to these two authored conduct facts. Counts and
 * ages retain the shared integer contract. A wire ID alone grants no exception. */
export const CA_PROP64_QUANTITY_CONTRACT = "ca_prop64_decimal_grams_v1";
export function isCaProp64QuantityQuestion(question: { id: string; type: string; answerContract?: string }): boolean {
  return question.answerContract === CA_PROP64_QUANTITY_CONTRACT && question.type === "number_or_range"
    && ["ca_prop64_flower_grams", "ca_prop64_concentrate_grams"].includes(question.id);
}
export function isCaProp64GramText(text: string): boolean {
  return /^\d+(\.\d+)?$/.test(text) && Number.isFinite(Number(text)) && Number(text) <= Number.MAX_SAFE_INTEGER;
}

/** Compare the saved decimal fraction before Number can round it onto a legal boundary. */
export function caProp64GramsExceed(value: unknown, limit: 0 | 4 | 8 | 28.5): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value > limit;
  if (typeof value !== "string" || !/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) return false;
  const [whole, fraction = ""] = value.split(".");
  const [limitWhole, limitFraction = ""] = String(limit).split(".");
  if (Number(whole) !== Number(limitWhole)) return Number(whole) > Number(limitWhole);
  const digits = Math.max(fraction.length, limitFraction.length);
  return fraction.padEnd(digits, "0") > limitFraction.padEnd(digits, "0");
}
