export type ExpungementAiResultCode =
  | "packet_ready"
  | "packet_ready_with_caution"
  | "needs_more_info"
  | "not_yet"
  | "guidance_only"
  | "not_covered_yet"
  | "likely_not_eligible"
  | "needs_review"
  | "hard_stop";

export type ExpungementAiEligibilityResult = {
  resultCode: ExpungementAiResultCode;
  userLabel: string;
  state: string;
  pathwayLabel?: string;
  confidence: "high" | "medium" | "low" | "blocked";
  paymentAllowed: boolean;
  priceCents?: 5000;
  packetType?: "official_pdf_overlay" | "custom_pleading" | "legacy_packet" | "guidance_packet";
  reasons: string[];
  missingInfo?: string[];
  nextSteps: string[];
  emailCaptureRecommended: boolean;
  reminderRecommended?: boolean;
  disclaimer: string;
  briefcaseItemId?: string;
};

export type ConsumerMatterStatus =
  | "check_saved"
  | "guidance_saved"
  | "packet_ready"
  | "needs_info"
  | "needs_review"
  | "waiting"
  | "not_eligible"
  | "hard_stop";

export type ConsumerBriefcaseItem = {
  id: string;
  type: "eligibility_check" | "result" | "packet" | "wilma_conversation";
  title: string;
  state: string;
  status: ConsumerMatterStatus;
  resultCode?: ExpungementAiResultCode;
  createdAt: string;
  summary: string;
  nextSteps: string[];
  paymentAllowed: boolean;
  packetReady: boolean;
  pathwayLabel?: string;
  packetType?: ExpungementAiEligibilityResult["packetType"];
  artifactRefs?: Record<string, unknown>;
  paymentStatus?: "not_applicable" | "unpaid" | "paid" | "refunded";
  packetStatus?: "not_started" | "ready" | "downloaded";
  reminderAt?: string;
  sourceSessionId?: string;
};

export type CreateConsumerBriefcaseItemInput = {
  userId: string;
  itemType: ConsumerBriefcaseItem["type"];
  jurisdiction: string;
  pathwayLabel?: string;
  resultCode?: ExpungementAiResultCode;
  packetType?: ExpungementAiEligibilityResult["packetType"];
  paymentAllowed: boolean;
  status: ConsumerMatterStatus;
  summary: string;
  nextSteps: string[];
  artifactRefs?: Record<string, unknown>;
  paymentStatus?: ConsumerBriefcaseItem["paymentStatus"];
  packetStatus?: ConsumerBriefcaseItem["packetStatus"];
  reminderAt?: string;
  sourceSessionId?: string;
};

export type ExpungementAiCheckInput = {
  state: string;
  pathType?: "packet" | "guidance" | "unsupported" | "complex" | "outside_scope" | "blocked_form";
  hasRequiredFacts?: boolean;
  timing?: "too_early" | "eligible_window" | "unknown";
  packetAvailable?: boolean;
  caution?: boolean;
  pathwayLabel?: string;
};
