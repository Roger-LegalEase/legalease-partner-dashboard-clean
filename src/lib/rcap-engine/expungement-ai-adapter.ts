import "server-only";

import { evaluateScreening } from "@/lib/rcap-engine/evaluator";
import { applyComponentDeferralClamp } from "@/lib/rcap-engine/component-deferral-clamp";
import type { ScreeningEvaluationRequest } from "@/lib/rcap-engine/contracts";

export function evaluateExpungementAiMatter(input: ScreeningEvaluationRequest) {
  return applyComponentDeferralClamp(input, evaluateScreening(input));
}
