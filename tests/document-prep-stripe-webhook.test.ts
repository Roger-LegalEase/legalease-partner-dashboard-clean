import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { processStripeWebhookEvent } from "@/lib/billing/webhooks";

function createDb() {
  return {
    providerEvent: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "provider_event_123" }))
    },
    productOrder: {
      upsert: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 0 }))
    },
    subscriptionEntitlement: {
      upsert: vi.fn(async () => ({}))
    },
    user: {
      updateMany: vi.fn(async () => ({}))
    },
    wilmaChatSession: {
      findUnique: vi.fn(async () => ({
        id: "wilma_session_123",
        userId: "user_123",
        caseId: "case_123",
        leadEmail: "lead@example.com",
        decisionId: "decision_123",
        facts: { state: "CA" },
        decision: { id: "decision_123", status: "likely_eligible_for_document_prep" }
      })),
      update: vi.fn(async () => ({}))
    },
    caseNotice: {
      create: vi.fn(async () => ({}))
    },
    auditEvent: {
      create: vi.fn(async () => ({}))
    }
  };
}

function documentPrepCheckoutEvent(): Stripe.Event {
  return {
    id: "evt_document_prep_paid",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_document_prep",
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 5_000,
        currency: "usd",
        customer: "cus_123",
        customer_email: "lead@example.com",
        payment_intent: "pi_123",
        metadata: {
          userId: "user_123",
          email: "lead@example.com",
          productKey: "document_prep",
          wilmaSessionId: "wilma_session_123",
          wilmaDecisionId: "decision_123"
        }
      }
    }
  } as unknown as Stripe.Event;
}

describe("Stripe document-prep handoff", () => {
  it("calls document-prep handoff after a paid document-prep checkout", async () => {
    const db = createDb();

    await expect(processStripeWebhookEvent(documentPrepCheckoutEvent(), db)).resolves.toEqual({
      processed: true,
      type: "checkout.session.completed"
    });

    expect(db.productOrder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          productKey: "document_prep",
          status: "PAID",
          amountCents: 5_000
        })
      })
    );
    expect(db.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "document_prep.handoff_requested",
          targetId: "decision_123"
        })
      })
    );
  });
});
