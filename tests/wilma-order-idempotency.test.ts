import { describe, expect, it } from "vitest";
import { processWilmaPaidCheckout } from "@/wilma/orders/createWilmaOrder";
import { createWilmaOrderTestBackend, eligibleSession, paidEvent } from "./wilma-order-test-helpers";

describe("Wilma PR6 order idempotency", () => {
  it("does not create duplicate orders, documents, or trackers for duplicate payment events", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());

    const first = await processWilmaPaidCheckout(paidEvent(), backend);
    const second = await processWilmaPaidCheckout(paidEvent(), backend);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok) {
      throw new Error("Expected duplicate event to resolve to the existing order.");
    }
    expect(second.duplicate).toBe(true);
    expect(backend.orders).toHaveLength(1);
    expect(backend.documentPayloads).toHaveLength(1);
    expect(backend.trackerPayloads).toHaveLength(1);
  });

  it("uses payment intent id as a duplicate key when the checkout id differs", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());

    await processWilmaPaidCheckout(paidEvent({ checkoutSessionId: "cs_test_1", paymentIntentId: "pi_same" }), backend);
    const duplicate = await processWilmaPaidCheckout(
      paidEvent({ checkoutSessionId: "cs_test_2", paymentIntentId: "pi_same" }),
      backend
    );

    expect(duplicate.ok).toBe(true);
    expect(backend.orders).toHaveLength(1);
    expect(backend.documentPayloads).toHaveLength(1);
  });
});
