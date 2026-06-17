import "server-only";

import type { StatePromotionRecord } from "@/lib/rcap/state-promotion-manifest";

export const batchApprovalLaunchSafety = {
  rule: "Batch approval is not launch. Live enablement is a separate all-51 launch operation.",
  batchApprovalCanSetLiveEnabled: false,
  batchApprovalCanChangePublicRouting: false,
  futureLaunchRequiresAll51Operation: true
} as const;

export const all51LaunchRule = {
  rule: "All 50 states plus DC launch together. No U.S. state or DC may remain state_not_live after the all-51 launch gate applies.",
  partialStateRolloutAllowed: false,
  launchJurisdictionCount: 51
} as const;

export type PromotionEligibility = {
  eligible: boolean;
  reasons: string[];
};

export function canApproveForLive(record: StatePromotionRecord): PromotionEligibility {
  const reasons: string[] = [];

  if (record.qaReview !== "passed") reasons.push("QA review must pass.");
  if (record.attorneyReview !== "passed") reasons.push("Attorney review must pass.");
  if (record.sourceFreshnessReview !== "passed") reasons.push("Source freshness review must pass.");
  if (record.visualReview !== "passed" && record.visualReview !== "not_required") {
    reasons.push("Visual review must pass or be marked not_required.");
  }
  if (record.blockers.length > 0) reasons.push("Blockers must be cleared.");

  return {
    eligible: reasons.length === 0,
    reasons
  };
}

export function canBecomeLive(record: StatePromotionRecord): PromotionEligibility {
  const reasons: string[] = [];

  if (record.promotionStatus !== "approved_for_live") reasons.push("Promotion status must be approved_for_live.");
  if (!record.approvedForLive) reasons.push("approvedForLive must be true.");
  if (!record.liveEnabled) reasons.push("liveEnabled must be true.");

  return {
    eligible: reasons.length === 0,
    reasons
  };
}

export function getRecommendedPromotionAction(record: StatePromotionRecord): string {
  const approval = canApproveForLive(record);
  const live = canBecomeLive(record);

  if (record.promotionStatus === "live") return live.eligible ? "Monitor live channel approvals." : "Fix invalid live promotion state.";
  if (record.promotionStatus === "approved_for_live") return record.liveEnabled ? "Eligible for controlled live routing review." : "Await explicit liveEnabled toggle.";
  if (record.promotionStatus === "blocked") return "Resolve blockers before further promotion.";
  if (approval.eligible) return "Ready for approve-for-live action.";
  if ([record.qaReview, record.attorneyReview, record.sourceFreshnessReview, record.visualReview].includes("failed")) return "Review failed gate and decide remediation.";
  return "Continue QA, attorney, source freshness, and visual review.";
}

export function assertExpungementAiSeparateFromPartnerRcap(record: StatePromotionRecord): boolean {
  return Object.prototype.hasOwnProperty.call(record.approvedChannels, "partnerRcap")
    && Object.prototype.hasOwnProperty.call(record.approvedChannels, "expungementAi");
}

export function getBatchApprovalLaunchSafety() {
  return batchApprovalLaunchSafety;
}

export function getAll51LaunchRule() {
  return all51LaunchRule;
}
