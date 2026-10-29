/** IA.memo ia-7251/ia-12346/ia-12347, Rule 2.83(3); §901C.3 retains its debt prerequisite. */
export function iowaFinancialQuestionApplies(jurisdiction: string, pathwayId: string | undefined, questionId: string): boolean {
  return jurisdiction !== "IA" || questionId !== "financial_obligations"
    || !["minor-prostitution-7251", "public-intoxication-12346", "underage-alcohol-12347"].includes(pathwayId ?? "");
}
