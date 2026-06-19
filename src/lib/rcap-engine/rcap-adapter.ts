import "server-only";

import { evaluateScreening } from "@/lib/rcap-engine/evaluator";
import type { RcapCaseTransition, RcapMatterEvaluationInput } from "@/lib/rcap-engine/contracts";

export function evaluateRcapMatter(input: RcapMatterEvaluationInput) {
  const evaluation = evaluateScreening(input);
  const transition: RcapCaseTransition = {
    caseId: input.caseId,
    targetStatus: statusForEvaluation(evaluation.resultCode, evaluation.missingQuestionIds),
    reasonCodes: evaluation.reasons.map((reason) => reason.code)
  };
  return { evaluation, transition };
}

function statusForEvaluation(resultCode: ReturnType<typeof evaluateScreening>["resultCode"], missingQuestionIds: string[]): RcapCaseTransition["targetStatus"] {
  if (resultCode === "needs_more_info") {
    return missingQuestionIds.some((id) => id.includes("record") || id.includes("document")) ? "needs_record" : "needs_case_details";
  }
  if (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution" || resultCode === "guidance_only") return "possible_pathway";
  if (resultCode === "not_yet") return "refile_eligible_after_wait";
  if (resultCode === "needs_review") return "possible_exclusion";
  if (resultCode === "not_covered_yet") return "unsupported_jurisdiction";
  if (resultCode === "likely_not_eligible") return "not_suitable_for_automated_packet";
  return "possible_exclusion";
}
