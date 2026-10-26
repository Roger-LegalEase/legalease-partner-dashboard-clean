import catalog from "@/lib/expungement-ai/reviewed-court-completion-contracts.json";

/** Pure exact-contract lookup used by both question selection and protected
 * completion reuse. An actual-paid fact is not a completion/waiver alias.
 * This says nothing about whether money is legally owed or an eligibility bar.
 */
export function isIndependentPaidFinancialFact(routeKey: string, question: { id: string; prompt: string; helperText?: string | null } | undefined): boolean {
  return Boolean(question && catalog.independentPaidFactContracts.some(contract => contract.routeKey === routeKey
    && contract.factId === question.id && contract.prompt === question.prompt && contract.helperText === question.helperText));
}
