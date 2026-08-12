import "server-only";

import {
  consumerDisclaimer,
  saveEligibilityCheckToBriefcase,
  saveEligibilityResultToBriefcase
} from "@/lib/expungement-ai/briefcase";
import type { ExpungementAiCheckInput, ExpungementAiEligibilityResult } from "@/lib/expungement-ai/types";
import type { ScreeningEvaluation, ScreeningResultCode } from "@/lib/rcap-engine/contracts";
import { evaluateExpungementAiMatter } from "@/lib/rcap-engine/expungement-ai-adapter";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { componentDeferralBundle } from "@/lib/rcap/documents/guidance-packet-registry";

export function runExpungementAiEligibilityCheck(input: ExpungementAiCheckInput): ExpungementAiEligibilityResult {
  saveEligibilityCheckToBriefcase(input.state);

  const profile = getProfileByJurisdiction(input.state);
  if (!profile) {
    return legacyShapeFromEvaluation({
      jurisdiction: input.state.toUpperCase(),
      profileVersion: "unsupported",
      matterId: input.matterId ?? "expungement-ai-check",
      resultCode: "not_covered_yet",
      userLabel: "This jurisdiction is not covered yet.",
      reasons: [{ code: "unsupported_jurisdiction", text: "No source-driven profile is registered for this jurisdiction." }],
      missingQuestionIds: [],
      cautions: [],
      nextSteps: ["Save this result.", "Request follow-up.", "Consider legal aid or attorney help."],
      paymentAllowed: false
    });
  }

  const engineResult = evaluateExpungementAiMatter({
    jurisdiction: input.state,
    profileVersion: input.profileVersion ?? profile.profileVersion,
    matterId: input.matterId ?? "expungement-ai-check",
    answers: input.answers ?? {}
  });

  return legacyShapeFromEvaluation(engineResult);
}

function legacyShapeFromEvaluation(engineResult: ScreeningEvaluation, locale?: string): ExpungementAiEligibilityResult {
  const resultCode = engineResult.resultCode;
  // The deferral bundle is looked up from the exact server-selected track, not
  // from the evaluation's own boolean. If the registry says this route defers a
  // component, payment closes here even when an upstream flag says otherwise.
  const deferral = componentDeferralBundle(engineResult.selectedTrackId ?? null, locale);
  const paymentAllowed = !deferral && isConsumerPaymentAllowed(resultCode, engineResult.paymentAllowed);
  const result: ExpungementAiEligibilityResult = {
    resultCode: deferral ? "guidance_only" : resultCode,
    userLabel: engineResult.userLabel,
    state: engineResult.jurisdiction,
    pathwayLabel: engineResult.pathwayId ?? `${engineResult.jurisdiction} record-clearing review`,
    confidence: confidenceForResult(deferral ? "guidance_only" : resultCode),
    paymentAllowed,
    priceCents: paymentAllowed ? 5000 : undefined,
    packetType: packetTypeForResult(deferral ? "guidance_only" : resultCode),
    reasons: engineResult.reasons.map((reason) => reason.text),
    missingInfo: engineResult.missingQuestionIds.length > 0 ? engineResult.missingQuestionIds : undefined,
    nextSteps: deferral ? deferral.nextSteps : engineResult.nextSteps,
    emailCaptureRecommended: resultCode !== "packet_ready",
    reminderRecommended: resultCode === "not_yet",
    disclaimer: consumerDisclaimer(),
    ...(deferral
      ? {
        selectedTrackId: deferral.trackId,
        treatmentClassification: "component_deferral" as const,
        deferralComponentIds: deferral.componentIds,
        componentDeferralTreatment: deferral as unknown as Record<string, unknown>
      }
      : {})
  };
  const briefcaseItem = saveEligibilityResultToBriefcase(result);

  return {
    ...result,
    briefcaseItemId: briefcaseItem.id
  };
}

export function isConsumerPaymentAllowed(resultCode: ScreeningResultCode, enginePaymentAllowed: boolean) {
  return enginePaymentAllowed && (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution");
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
