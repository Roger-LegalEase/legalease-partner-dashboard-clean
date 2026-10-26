import type { MsFirstOffenderSourceContext } from "@/lib/rcap-engine/mississippi-first-offender-source-facts";
import "server-only";

import { evaluateScreening, evaluateMsFirstOffenderProtected } from "@/lib/rcap-engine/evaluator";
import { applyComponentDeferralClamp } from "@/lib/rcap-engine/component-deferral-clamp";
import type { ScreeningEvaluationRequest } from "@/lib/rcap-engine/contracts";

export function evaluateExpungementAiMatter(input: ScreeningEvaluationRequest, msSource?: MsFirstOffenderSourceContext) {
  return applyComponentDeferralClamp(input, msSource ? evaluateMsFirstOffenderProtected(input, msSource) : evaluateScreening(input));
}
