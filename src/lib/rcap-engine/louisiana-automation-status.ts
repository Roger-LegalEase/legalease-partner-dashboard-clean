/**
 * LA.memo / la-985-2-automated-expungement and LD-LA-05 retain only
 * operationally gated status guidance. Article 985.2(A), (F), (G) leaves
 * underlying Articles 976–978 eligibility and the funding condition intact.
 * Payment is not a prerequisite to reading that guidance. This does not
 * establish eligibility, payment/waiver, operation of the system, or a filing.
 */
export const LA_AUTOMATION_STATUS_ROUTE = "automated-expungement-status-verification-art-985-2";

export function louisianaAutomationStatusQuestionApplies(
  jurisdiction: string,
  pathwayId: string | null | undefined,
  questionId: string
): boolean {
  return questionId !== "financial_obligations" || jurisdiction !== "LA"
    || pathwayId !== LA_AUTOMATION_STATUS_ROUTE;
}
