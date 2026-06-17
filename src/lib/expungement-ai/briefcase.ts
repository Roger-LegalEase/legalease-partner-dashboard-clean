import "server-only";

import type { ConsumerBriefcaseItem, ExpungementAiEligibilityResult } from "@/lib/expungement-ai/types";

const startedAt = "2026-06-17T00:00:00.000Z";

export function saveEligibilityCheckToBriefcase(state: string): ConsumerBriefcaseItem {
  return {
    id: consumerBriefcaseId("check", state, "started"),
    type: "eligibility_check",
    title: `${state} record check`,
    state,
    status: "check_saved",
    createdAt: startedAt,
    summary: "Eligibility check started and saved to Briefcase.",
    nextSteps: ["Finish the screening questions.", "Return here any time to continue."],
    paymentAllowed: false,
    packetReady: false
  };
}

export function saveEligibilityResultToBriefcase(result: ExpungementAiEligibilityResult): ConsumerBriefcaseItem {
  return {
    id: result.briefcaseItemId ?? consumerBriefcaseId("result", result.state, result.resultCode),
    type: "result",
    title: result.pathwayLabel ?? `${result.state} record-clearing result`,
    state: result.state,
    status: statusForResult(result.resultCode),
    resultCode: result.resultCode,
    createdAt: startedAt,
    summary: result.userLabel,
    nextSteps: result.nextSteps,
    paymentAllowed: result.paymentAllowed,
    packetReady: result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution"
  };
}

export function saveGeneratedPacketToBriefcase(result: ExpungementAiEligibilityResult): ConsumerBriefcaseItem {
  return {
    id: consumerBriefcaseId("packet", result.state, result.resultCode),
    type: "packet",
    title: `${result.state} self-help packet`,
    state: result.state,
    status: "packet_ready",
    resultCode: result.resultCode,
    createdAt: startedAt,
    summary: "Generated packet saved to Briefcase.",
    nextSteps: ["Download your packet.", "Review the filing checklist before you file."],
    paymentAllowed: false,
    packetReady: true
  };
}

export function getConsumerBriefcaseItems(): ConsumerBriefcaseItem[] {
  return [
    saveEligibilityResultToBriefcase({
      resultCode: "packet_ready",
      userLabel: "Your self-help packet is ready to prepare.",
      state: "PA",
      pathwayLabel: "Pennsylvania non-conviction review",
      confidence: "high",
      paymentAllowed: true,
      priceCents: 5000,
      packetType: "custom_pleading",
      reasons: ["The engine found a packet-ready path."],
      nextSteps: ["Review the result.", "Pay once to generate the packet.", "Follow the filing checklist."],
      emailCaptureRecommended: false,
      disclaimer: consumerDisclaimer()
    }),
    saveEligibilityResultToBriefcase({
      resultCode: "guidance_only",
      userLabel: "We saved guidance for this path.",
      state: "IL",
      pathwayLabel: "Illinois guidance matter",
      confidence: "medium",
      paymentAllowed: false,
      packetType: "guidance_packet",
      reasons: ["This in-scope path currently returns guidance instead of a packet."],
      nextSteps: ["Read the next steps.", "Gather your court record.", "Ask Wilma to explain the checklist."],
      emailCaptureRecommended: true,
      disclaimer: consumerDisclaimer()
    }),
    {
      id: "wilma-conversation-sample",
      type: "wilma_conversation",
      title: "Wilma conversation",
      state: "PA",
      status: "check_saved",
      createdAt: startedAt,
      summary: "Wilma explained what a filing checklist is and pointed back to the tool for eligibility.",
      nextSteps: ["Continue the check from Briefcase."],
      paymentAllowed: false,
      packetReady: false
    }
  ];
}

export function consumerDisclaimer() {
  return "Expungement.ai is self-help software, not a law firm. Court approval is not guaranteed. Review all documents before filing.";
}

function statusForResult(resultCode: ExpungementAiEligibilityResult["resultCode"]): ConsumerBriefcaseItem["status"] {
  if (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution") return "packet_ready";
  if (resultCode === "guidance_only" || resultCode === "not_covered_yet") return "guidance_saved";
  if (resultCode === "needs_more_info") return "needs_info";
  if (resultCode === "needs_review") return "needs_review";
  if (resultCode === "not_yet") return "waiting";
  if (resultCode === "likely_not_eligible") return "not_eligible";
  return "hard_stop";
}

function consumerBriefcaseId(kind: string, state: string, value: string) {
  return `expai-${kind}-${state.toLowerCase()}-${value.replaceAll("_", "-")}`;
}
