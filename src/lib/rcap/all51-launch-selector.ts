import "server-only";

import {
  getStatePromotionRecord,
  statePromotionManifest,
  type StatePromotionRecord
} from "@/lib/rcap/state-promotion-manifest";

export type All51SelectorOutcome =
  | "packet_ready"
  | "packet_ready_with_caution"
  | "guidance_only"
  | "not_yet"
  | "needs_more_info"
  | "not_covered_yet"
  | "needs_review"
  | "hard_stop";

export type All51SelectorInput = {
  state: string;
  hasRequiredFacts?: boolean;
  timing?: "too_early" | "eligible_window" | "unknown";
  pathType?: "packet" | "guidance" | "unsupported" | "complex" | "outside_scope" | "blocked_form";
  packetAvailable?: boolean;
  caution?: boolean;
};

export type All51SelectorResult = {
  state: string;
  jurisdiction: string;
  outcome: All51SelectorOutcome;
  paymentAllowed: boolean;
  channels: {
    partnerRcap: boolean;
    expungementAi: boolean;
  };
  liveEnabled: boolean;
};

export const paymentAllowedOutcomes: All51SelectorOutcome[] = ["packet_ready", "packet_ready_with_caution"];

export function getAll51SelectableJurisdictions(): StatePromotionRecord[] {
  return statePromotionManifest.filter((record) => record.liveEnabled && record.promotionStatus === "live");
}

export function evaluateAll51RcapSelector(input: All51SelectorInput): All51SelectorResult {
  const record = getStatePromotionRecord(input.state);
  if (!record) return selectorResult(input.state, "Outside supported U.S. state/DC set", "not_covered_yet", false, false, false);

  const channelLive = record.liveEnabled
    && record.promotionStatus === "live"
    && record.approvedForLive
    && record.approvedChannels.partnerRcap
    && record.approvedChannels.expungementAi;

  if (!channelLive) return selectorResult(record.abbreviation, record.jurisdiction, "guidance_only", false, record.approvedChannels.partnerRcap, record.approvedChannels.expungementAi);
  if (input.pathType === "outside_scope") return selectorResult(record.abbreviation, record.jurisdiction, "hard_stop", true, true, true);
  if (input.hasRequiredFacts === false) return selectorResult(record.abbreviation, record.jurisdiction, "needs_more_info", true, true, true);
  if (input.timing === "too_early") return selectorResult(record.abbreviation, record.jurisdiction, "not_yet", true, true, true);
  if (input.pathType === "unsupported") return selectorResult(record.abbreviation, record.jurisdiction, "not_covered_yet", true, true, true);
  if (input.pathType === "complex") return selectorResult(record.abbreviation, record.jurisdiction, "needs_review", true, true, true);
  if (input.pathType === "blocked_form") return selectorResult(record.abbreviation, record.jurisdiction, "guidance_only", true, true, true);
  if (input.pathType === "packet" && input.packetAvailable) {
    return selectorResult(record.abbreviation, record.jurisdiction, input.caution ? "packet_ready_with_caution" : "packet_ready", true, true, true);
  }

  return selectorResult(record.abbreviation, record.jurisdiction, "guidance_only", true, true, true);
}

export function isPaymentAllowedForOutcome(outcome: All51SelectorOutcome): boolean {
  return paymentAllowedOutcomes.includes(outcome);
}

function selectorResult(
  state: string,
  jurisdiction: string,
  outcome: All51SelectorOutcome,
  liveEnabled: boolean,
  partnerRcap: boolean,
  expungementAi: boolean
): All51SelectorResult {
  return {
    state,
    jurisdiction,
    outcome,
    paymentAllowed: isPaymentAllowedForOutcome(outcome),
    channels: {
      partnerRcap,
      expungementAi
    },
    liveEnabled
  };
}
