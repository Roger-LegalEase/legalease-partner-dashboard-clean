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
