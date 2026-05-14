import { env } from "@/lib/env";
import { evaluateCAExpungementReadiness } from "@/lib/expungement/rules/CA";
import { evaluateStateTableExpungementReadiness, supportedStateRuleCodes } from "@/lib/expungement/rules/state-tables";
import type { ExpungementReadinessInput, ExpungementReadinessOutput } from "@/lib/expungement/types";

export function evaluateExpungementReadiness(input: ExpungementReadinessInput): ExpungementReadinessOutput {
  const state = (input.state ?? env.LAUNCH_STATE).toUpperCase();

  if (state === "CA") {
    return evaluateCAExpungementReadiness({ ...input, state });
  }

  if (supportedStateRuleCodes.includes(state)) {
    return evaluateStateTableExpungementReadiness({ ...input, state });
  }

  return {
    state,
    status: "out_of_scope",
    reasons: [`${state} rules are not implemented in the deterministic launch-state rule engine.`],
    missingInformation: ["State-specific reviewed rules are required before deterministic screening."],
    disqualifiers: [],
    recommendedDocuments: [
      "Certified court docket or case summary",
      "Final disposition document",
      "Charging document or complaint"
    ],
    disclaimer:
      "This deterministic readiness screen is not legal advice, does not determine eligibility, and should be reviewed by a qualified attorney."
  };
}

export type {
  ExpungementReadinessInput,
  ExpungementReadinessOutput,
  ExpungementReadinessStatus,
  NormalizedRecordItem,
  NormalizedReportForExpungement
} from "@/lib/expungement/types";
