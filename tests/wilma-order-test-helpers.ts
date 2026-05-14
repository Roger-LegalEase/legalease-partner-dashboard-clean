import type {
  WilmaDocumentGenerationBackend,
  WilmaDocumentPrepOrder,
  WilmaOrderBackend,
  WilmaOrderSession,
  WilmaPaidCheckoutEvent,
  WilmaTrackerBackend
} from "@/wilma/orders/types";
import type { WilmaAnalyticsEvent } from "@/wilma/analytics/types";

export function createWilmaOrderTestBackend() {
  const sessions: WilmaOrderSession[] = [];
  const orders: WilmaDocumentPrepOrder[] = [];
  const documentPayloads: unknown[] = [];
  const trackerPayloads: unknown[] = [];
  const auditEvents: WilmaAnalyticsEvent[] = [];

  const orderBackend: WilmaOrderBackend = {
    async loadSession({ sessionId }) {
      return sessions.find((session) => session.id === sessionId) ?? null;
    },
    async findOrderByPayment({ checkoutSessionId, paymentIntentId }) {
      return (
        orders.find(
          (order) =>
            order.paymentProviderCheckoutSessionId === checkoutSessionId ||
            (paymentIntentId && order.paymentProviderPaymentIntentId === paymentIntentId)
        ) ?? null
      );
    },
    async createOrder({ order }) {
      const created: WilmaDocumentPrepOrder = {
        id: `wilma_order_${orders.length + 1}`,
        ...order,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      };
      orders.push(created);
      return created;
    },
    async updateOrderStatus({ orderId, status, documentGenerationJobId, trackerWorkspaceId }) {
      const order = orders.find((candidate) => candidate.id === orderId);
      if (!order) {
        throw new Error("Order not found.");
      }
      order.status = status;
      order.documentGenerationJobId = documentGenerationJobId ?? order.documentGenerationJobId;
      order.trackerWorkspaceId = trackerWorkspaceId ?? order.trackerWorkspaceId;
      order.updatedAt = "2026-01-01T00:00:00.000Z";
      return order;
    },
    async trackWilmaEvent(event) {
      auditEvents.push(event);
    }
  };

  const documentGenerationBackend: WilmaDocumentGenerationBackend = {
    async generateDocumentPrep(payload) {
      documentPayloads.push(payload);
      return { documentGenerationJobId: `doc_job_${documentPayloads.length}` };
    }
  };

  const trackerBackend: WilmaTrackerBackend = {
    async createTrackerWorkspace(payload) {
      trackerPayloads.push(payload);
      return { trackerWorkspaceId: `tracker_${trackerPayloads.length}` };
    }
  };

  return {
    sessions,
    orders,
    documentPayloads,
    trackerPayloads,
    auditEvents,
    orderBackend,
    documentGenerationBackend,
    trackerBackend
  };
}

export function eligibleSession(input: { email?: string | null; status?: string } = {}): WilmaOrderSession {
  return {
    id: "wilma_session_123",
    email: "email" in input ? input.email : "client@example.com",
    facts: {
      state: "IL",
      county: "Cook",
      caseNumber: "2026-CF-1",
      disposition: "dismissed",
      courtSystem: "state",
      isAdultCase: true,
      hasPendingCriminalCase: false
    },
    decision: {
      status: input.status === "needs_more_information" ? "needs_more_information" : "likely_eligible_for_document_prep",
      documentTarget: "expungement_petition",
      allowPaidCta: input.status !== "needs_more_information",
      requiresEmailGate: input.status !== "needs_more_information",
      reasonCodes: ["il_supported_state", "non_conviction_disposition", "adult_state_court_case"],
      ruleId: "IL-001",
      ruleVersion: "wilma-service-fit-v1",
      evaluatedAt: "2026-01-01T00:00:00.000Z"
    }
  } as WilmaOrderSession;
}

export function paidEvent(input: Partial<WilmaPaidCheckoutEvent> = {}): WilmaPaidCheckoutEvent {
  return {
    type: "checkout.session.completed",
    paid: true,
    amountCents: 5000,
    currency: "usd",
    paymentProvider: "stripe",
    checkoutSessionId: "cs_test_123",
    paymentIntentId: "pi_test_123",
    ...input,
    metadata: {
      product: "wilma_document_prep",
      wilmaSessionId: "wilma_session_123",
      ...input.metadata
    }
  };
}
