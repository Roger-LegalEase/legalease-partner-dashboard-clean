import type {
  SupportedState,
  WilmaDocumentTarget,
  WilmaEligibilityFacts,
  WilmaServiceFitDecision
} from "@/wilma/chat/rules";
import type { WilmaAnalyticsBackend } from "@/wilma/analytics/types";

export type WilmaOrderStatus =
  | "paid_pending_fulfillment"
  | "generating_documents"
  | "fulfilled"
  | "fulfillment_failed"
  | "refunded"
  | "cancelled";

export type WilmaDocumentPrepOrder = {
  id: string;
  wilmaSessionId: string;
  leadEmail: string;
  state: SupportedState;
  documentTarget: WilmaDocumentTarget;
  decisionStatus: "likely_eligible_for_document_prep";
  ruleVersion: string;
  reasonCodes: string[];
  priceCents: 5000;
  paymentProvider: "stripe" | "existing_backend";
  paymentProviderCheckoutSessionId: string;
  paymentProviderPaymentIntentId?: string;
  status: WilmaOrderStatus;
  documentGenerationJobId?: string;
  trackerWorkspaceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type WilmaPaidCheckoutEvent = {
  type: "checkout.session.completed";
  paid: boolean;
  amountCents: number;
  currency?: string;
  paymentProvider: "stripe" | "existing_backend";
  checkoutSessionId: string;
  paymentIntentId?: string;
  metadata: {
    product?: string;
    productKey?: string;
    wilmaSessionId?: string;
  };
};

export type WilmaOrderSession = {
  id: string;
  email?: string | null;
  facts: WilmaEligibilityFacts;
  decision?: WilmaServiceFitDecision | null;
};

export type WilmaDocumentGenerationPayload = {
  source: "wilma";
  wilmaSessionId: string;
  orderId: string;
  state: SupportedState;
  documentTarget: WilmaDocumentTarget;
  leadEmail: string;
  facts: WilmaEligibilityFacts;
  decision: {
    status: "likely_eligible_for_document_prep";
    ruleVersion: string;
    reasonCodes: string[];
  };
};

export type WilmaOrderBackend = WilmaAnalyticsBackend & {
  loadSession(input: { sessionId: string }): Promise<WilmaOrderSession | null>;
  findOrderByPayment(input: {
    checkoutSessionId: string;
    paymentIntentId?: string;
  }): Promise<WilmaDocumentPrepOrder | null>;
  createOrder(input: {
    order: Omit<WilmaDocumentPrepOrder, "id" | "createdAt" | "updatedAt">;
  }): Promise<WilmaDocumentPrepOrder>;
  updateOrderStatus(input: {
    orderId: string;
    status: WilmaOrderStatus;
    documentGenerationJobId?: string;
    trackerWorkspaceId?: string;
  }): Promise<WilmaDocumentPrepOrder>;
};

export type WilmaDocumentGenerationBackend = {
  generateDocumentPrep(input: WilmaDocumentGenerationPayload): Promise<{ documentGenerationJobId?: string }>;
};

export type WilmaTrackerBackend = {
  createTrackerWorkspace(input: {
    order: WilmaDocumentPrepOrder;
    payload: WilmaDocumentGenerationPayload;
  }): Promise<{ trackerWorkspaceId?: string }>;
};

export type WilmaPaymentBlockedReason =
  | "not_paid"
  | "wrong_product"
  | "wrong_amount"
  | "missing_wilma_session"
  | "missing_session"
  | "email_not_captured"
  | "not_likely_eligible";

export type WilmaPaymentSuccessResult =
  | { ok: true; order: WilmaDocumentPrepOrder; duplicate: boolean }
  | { ok: false; error: "wilma_order_not_created"; reason: WilmaPaymentBlockedReason };
