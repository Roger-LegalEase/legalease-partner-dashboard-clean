import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  mapStripePaymentStatus,
  mapStripeSubscriptionStatus,
  processStripeWebhookEvent
} from "@/lib/billing/webhooks";

function createMockDb(existingEvent = false) {
  return {
    providerEvent: {
      findUnique: vi.fn(async () => (existingEvent ? { id: "provider-event-1" } : null)),
      create: vi.fn(async () => ({ id: "provider-event-1" }))
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
    }
  };
}

function checkoutCompletedEvent(): Stripe.Event {
  return {
    id: "evt_checkout_completed",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 19_900,
        currency: "usd",
        customer: "cus_123",
        customer_email: "customer@example.com",
        payment_intent: "pi_123",
        metadata: {
          userId: "user_123",
          email: "customer@example.com",
          productKey: "record_check"
        }
      }
    }
  } as unknown as Stripe.Event;
}

describe("Stripe webhook processing", () => {
  it("stores and applies a new checkout event once", async () => {
    const db = createMockDb();

    const result = await processStripeWebhookEvent(checkoutCompletedEvent(), db);

    expect(result).toEqual({ processed: true, type: "checkout.session.completed" });
    expect(db.providerEvent.create).toHaveBeenCalledOnce();
    expect(db.providerEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({
            data: expect.objectContaining({
              object: expect.objectContaining({
                customer_email: "[REDACTED_EMAIL]",
                metadata: expect.objectContaining({ email: "[REDACTED_EMAIL]" })
              })
            })
          })
        })
      })
    );
    expect(db.productOrder.upsert).toHaveBeenCalledOnce();
    expect(db.productOrder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeCheckoutSessionId: "cs_test_123" },
        create: expect.objectContaining({
          productKey: "record_check",
          status: "PAID",
          amountCents: 19_900,
          stripePaymentIntentId: "pi_123"
        })
      })
    );
  });

  it("does not apply duplicate provider events", async () => {
    const db = createMockDb(true);

    const result = await processStripeWebhookEvent(checkoutCompletedEvent(), db);

    expect(result).toEqual({ processed: false, type: "checkout.session.completed" });
    expect(db.providerEvent.create).not.toHaveBeenCalled();
    expect(db.productOrder.upsert).not.toHaveBeenCalled();
  });
});

describe("Stripe status mapping", () => {
  it("maps subscription states to entitlement states", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("ACTIVE");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("TRIALING");
    expect(mapStripeSubscriptionStatus("past_due")).toBe("PAST_DUE");
    expect(mapStripeSubscriptionStatus("unpaid")).toBe("UNPAID");
    expect(mapStripeSubscriptionStatus("canceled")).toBe("CANCELED");
    expect(mapStripeSubscriptionStatus("incomplete")).toBe("INCOMPLETE");
    expect(mapStripeSubscriptionStatus("incomplete_expired")).toBe("INCOMPLETE");
  });

  it("maps checkout payment states to order states", () => {
    expect(mapStripePaymentStatus("paid")).toBe("PAID");
    expect(mapStripePaymentStatus("unpaid")).toBe("PENDING");
    expect(mapStripePaymentStatus("no_payment_required")).toBe("PENDING");
  });
});
