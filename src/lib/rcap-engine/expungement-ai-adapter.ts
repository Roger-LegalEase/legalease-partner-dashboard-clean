import "server-only";

import { evaluateScreening } from "@/lib/rcap-engine/evaluator";
import type { ScreeningEvaluationRequest } from "@/lib/rcap-engine/contracts";

export function evaluateExpungementAiMatter(input: ScreeningEvaluationRequest) {
  return evaluateScreening(input);
}
