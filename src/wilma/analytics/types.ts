import type { WilmaDecisionStatus, WilmaDocumentTarget, WilmaEligibilityFacts } from "@/wilma/chat/rules";

export type WilmaAnalyticsEventName =
  | "wilma_chat_started"
  | "wilma_state_selected"
  | "wilma_facts_extracted"
  | "wilma_decision_created"
  | "wilma_email_gate_shown"
  | "wilma_email_captured"
  | "wilma_paid_cta_shown"
  | "wilma_checkout_clicked"
  | "wilma_checkout_created"
  | "wilma_payment_succeeded"
  | "wilma_order_created"
  | "wilma_document_generation_started"
  | "wilma_document_generation_succeeded"
  | "wilma_document_generation_failed"
  | "wilma_tracker_created"
  | "wilma_session_flagged";

export type WilmaRiskFlag =
  | "legal_advice_request"
  | "outcome_guarantee_request"
  | "court_prediction_request"
  | "unsupported_state"
  | "federal_case"
  | "juvenile_case"
  | "pending_case"
  | "conviction_path_disabled"
  | "high_risk_offense"
  | "fulfillment_failed"
  | "extractor_low_confidence"
  | "rate_limit_hit"
  | "message_cap_reached"
  | "session_expired"
  | "bot_protection_failed"
  | "repeat_screening_abuse";

export type WilmaAnalyticsEvent = {
  event: WilmaAnalyticsEventName;
  wilmaSessionId: string;
  actorUserId?: string;
  leadId?: string;
  emailHash?: string;
  state?: string;
  decisionStatus?: WilmaDecisionStatus;
  documentTarget?: WilmaDocumentTarget;
  ruleVersion?: string;
  reasonCodes?: string[];
  orderId?: string;
  checkoutSessionId?: string;
  paymentProvider?: "stripe" | "existing_backend";
  riskFlags: WilmaRiskFlag[];
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type WilmaAnalyticsBackend = {
  trackWilmaEvent?(event: WilmaAnalyticsEvent): Promise<void>;
};

export type WilmaAnalyticsEventInput = Omit<WilmaAnalyticsEvent, "riskFlags" | "createdAt"> & {
  facts?: WilmaEligibilityFacts;
  riskFlags?: WilmaRiskFlag[];
  createdAt?: Date;
};
