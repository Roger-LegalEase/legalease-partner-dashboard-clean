import "server-only";

import { getStatePromotionRecord } from "@/lib/rcap/state-promotion-manifest";
import type { ConsumerBriefcaseItem, ExpungementAiResultCode } from "@/lib/expungement-ai/types";
import type { WilmaPageContext } from "@/lib/expungement-ai/wilma";

export type VerifiedStateContent = {
  contentId: string;
  state: string;
  jurisdiction: string;
  source: "rcap_all51_state_pack";
  summary: string;
  allowedTopics: string[];
};

export type ReadOnlyCaseSummary = {
  state?: string;
  resultCode?: ExpungementAiResultCode;
  pathwayLabel?: string;
  dispositionType?: string;
  stage?: WilmaPageContext;
  paymentStatus?: ConsumerBriefcaseItem["paymentStatus"];
  packetStatus?: ConsumerBriefcaseItem["packetStatus"];
  briefcaseStatus?: ConsumerBriefcaseItem["status"];
};

export type WilmaResource = {
  label: string;
  kind: "screening_tool" | "legal_help" | "support" | "briefcase";
  href: string;
};

export type WilmaContext = {
  stateContent: VerifiedStateContent;
  caseContext: ReadOnlyCaseSummary;
  state: string;
  humanResources: WilmaResource[];
  supportResources: WilmaResource[];
  injectedStateContentIds: string[];
};

export function buildWilmaContext({
  state,
  pageContext,
  briefcaseItem
}: {
  state?: string;
  pageContext: WilmaPageContext;
  briefcaseItem?: ConsumerBriefcaseItem | null;
}): WilmaContext {
  const selectedState = (briefcaseItem?.state ?? state ?? "US").toUpperCase();
  const stateContent = verifiedStateContentFor(selectedState);
  const caseContext = sanitizeCaseContext(briefcaseItem, pageContext);

  return {
    stateContent,
    caseContext,
    state: stateContent.state,
    humanResources: [
      { label: "Find legal help", kind: "legal_help", href: "/expungement-ai/how-it-works" },
      { label: "Return to screening", kind: "screening_tool", href: "/expungement-ai/start" }
    ],
    supportResources: [
      { label: "Open Briefcase", kind: "briefcase", href: "/briefcase" },
      { label: "Use the screening tool", kind: "screening_tool", href: "/expungement-ai/start" }
    ],
    injectedStateContentIds: [stateContent.contentId]
  };
}

export function sanitizeCaseContext(briefcaseItem: ConsumerBriefcaseItem | null | undefined, stage: WilmaPageContext): ReadOnlyCaseSummary {
  if (!briefcaseItem) return { stage };

  return {
    state: briefcaseItem.state,
    resultCode: briefcaseItem.resultCode,
    pathwayLabel: briefcaseItem.pathwayLabel,
    dispositionType: dispositionTypeFor(briefcaseItem.resultCode),
    stage,
    paymentStatus: briefcaseItem.paymentStatus,
    packetStatus: briefcaseItem.packetStatus,
    briefcaseStatus: briefcaseItem.status
  };
}

function verifiedStateContentFor(state: string): VerifiedStateContent {
  const record = getStatePromotionRecord(state);
  if (!record) {
    return {
      contentId: "rcap-all51:unsupported",
      state,
      jurisdiction: "Unsupported or unknown jurisdiction",
      source: "rcap_all51_state_pack",
      summary: "No verified state-pack content is injected. Wilma must redirect to the screening tool or human help instead of stating legal facts.",
      allowedTopics: ["general process", "screening redirect", "human help redirect"]
    };
  }

  return {
    contentId: `rcap-all51:${record.abbreviation}:promotion:${record.promotionStatus}`,
    state: record.abbreviation,
    jurisdiction: record.jurisdiction,
    source: "rcap_all51_state_pack",
    summary: `${record.jurisdiction} is represented by the verified RCAP all51 state-pack and promotion manifest. Wilma may explain product process generally but must not decide eligibility.`,
    allowedTopics: ["general process", "plain-language terms", "screening redirect", "briefcase orientation"]
  };
}

function dispositionTypeFor(resultCode: ExpungementAiResultCode | undefined) {
  if (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution") return "screened_packet_path";
  if (resultCode === "guidance_only") return "guidance_only";
  if (resultCode === "needs_more_info") return "needs_more_information";
  if (resultCode === "not_yet") return "waiting_period_or_timing";
  if (resultCode === "needs_review") return "human_review_recommended";
  if (resultCode === "hard_stop") return "hard_stop";
  return undefined;
}
