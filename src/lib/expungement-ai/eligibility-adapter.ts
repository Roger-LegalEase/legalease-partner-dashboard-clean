import "server-only";

import {
  evaluateAll51RcapSelector,
  type All51SelectorOutcome
} from "@/lib/rcap/all51-launch-selector";
import {
  consumerDisclaimer,
  saveEligibilityCheckToBriefcase,
  saveEligibilityResultToBriefcase
} from "@/lib/expungement-ai/briefcase";
import type { ExpungementAiCheckInput, ExpungementAiEligibilityResult } from "@/lib/expungement-ai/types";

// Adapter boundary only; the RCAP engine remains the eligibility source of truth.
// Replace shell persistence calls with real service integrations before production persistence.
export function runExpungementAiEligibilityCheck(input: ExpungementAiCheckInput): ExpungementAiEligibilityResult {
  saveEligibilityCheckToBriefcase(input.state);

  const engineResult = evaluateAll51RcapSelector({
    state: input.state,
    hasRequiredFacts: input.hasRequiredFacts,
    timing: input.timing,
    pathType: input.pathType,
    packetAvailable: input.packetAvailable,
    caution: input.caution
  });

  const resultCode = normalizeConsumerResultCode(engineResult.outcome);
  const paymentAllowed = isConsumerPaymentAllowed(resultCode, engineResult.paymentAllowed);
  const result: ExpungementAiEligibilityResult = {
    resultCode,
    userLabel: labelForResult(resultCode),
    state: engineResult.state,
    pathwayLabel: input.pathwayLabel ?? `${engineResult.jurisdiction} record-clearing review`,
    confidence: confidenceForResult(resultCode),
    paymentAllowed,
    priceCents: paymentAllowed ? 5000 : undefined,
    packetType: packetTypeForResult(resultCode),
    reasons: reasonsForResult(resultCode, engineResult.jurisdiction),
    missingInfo: resultCode === "needs_more_info" ? ["Case outcome", "Disposition date", "County or court"] : undefined,
    nextSteps: nextStepsForResult(resultCode),
    emailCaptureRecommended: resultCode !== "packet_ready",
    reminderRecommended: resultCode === "not_yet",
    disclaimer: consumerDisclaimer()
  };
  const briefcaseItem = saveEligibilityResultToBriefcase(result);

  return {
    ...result,
    briefcaseItemId: briefcaseItem.id
  };
}

export function isConsumerPaymentAllowed(resultCode: ExpungementAiEligibilityResult["resultCode"], enginePaymentAllowed: boolean) {
  return enginePaymentAllowed && (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution");
}

function normalizeConsumerResultCode(outcome: All51SelectorOutcome): ExpungementAiEligibilityResult["resultCode"] {
  return outcome;
}

function labelForResult(resultCode: ExpungementAiEligibilityResult["resultCode"]) {
  const labels: Record<ExpungementAiEligibilityResult["resultCode"], string> = {
    packet_ready: "You may have a packet-ready path.",
    packet_ready_with_caution: "You may have a path, with a few cautions.",
    needs_more_info: "We need a few more details.",
    not_yet: "You may need to wait before filing.",
    guidance_only: "We can give you next steps for your state.",
    not_covered_yet: "We do not support this record type yet.",
    likely_not_eligible: "This record may not qualify for self-help filing.",
    needs_review: "This situation needs review.",
    hard_stop: "We cannot help with this type of record."
  };

  return labels[resultCode];
}

function confidenceForResult(resultCode: ExpungementAiEligibilityResult["resultCode"]): ExpungementAiEligibilityResult["confidence"] {
  if (resultCode === "hard_stop") return "blocked";
  if (resultCode === "needs_review" || resultCode === "needs_more_info") return "low";
  if (resultCode === "packet_ready_with_caution" || resultCode === "guidance_only") return "medium";
  return "high";
}

function packetTypeForResult(resultCode: ExpungementAiEligibilityResult["resultCode"]): ExpungementAiEligibilityResult["packetType"] | undefined {
  if (resultCode === "guidance_only") return "guidance_packet";
  if (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution") return "custom_pleading";
  return undefined;
}

function reasonsForResult(resultCode: ExpungementAiEligibilityResult["resultCode"], jurisdiction: string) {
  if (resultCode === "guidance_only") {
    return [`${jurisdiction} is available in Expungement.ai.`, "The RCAP engine returned guidance for this path instead of a paid packet."];
  }

  if (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution") {
    return [`${jurisdiction} is available in Expungement.ai.`, "The RCAP engine returned a packet-ready result."];
  }

  return [`${jurisdiction} is available in Expungement.ai.`, "The RCAP engine returned this result for the answers provided."];
}

function nextStepsForResult(resultCode: ExpungementAiEligibilityResult["resultCode"]) {
  const nextSteps: Record<ExpungementAiEligibilityResult["resultCode"], string[]> = {
    packet_ready: ["Create an account or sign in.", "Pay $50 once.", "Generate your self-help packet instantly."],
    packet_ready_with_caution: ["Review the cautions.", "Pay $50 if you want the packet.", "Review every document before filing."],
    needs_more_info: ["Add the missing case details.", "Run the check again.", "Save your progress in Briefcase."],
    not_yet: ["Save this result.", "Set a reminder.", "Come back when the waiting period may be complete."],
    guidance_only: ["Save the guidance to Briefcase.", "Read the filing next steps.", "Ask Wilma to explain the checklist."],
    not_covered_yet: ["Save this result.", "Request an update when this record type is supported.", "Consider legal aid for more help."],
    likely_not_eligible: ["Save the result.", "Review the reasons.", "Consider a legal aid or attorney review."],
    needs_review: ["Save your answers.", "Gather court records.", "Consider legal aid or an attorney before filing."],
    hard_stop: ["Do not use self-help filing for this issue.", "Contact legal aid or an attorney.", "Save this note in Briefcase."]
  };

  return nextSteps[resultCode];
}
