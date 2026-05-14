import { describe, expect, it } from "vitest";
import { createWilmaPaymentSuccessRouteHandler } from "@/app/api/wilma/payment-success/route";
import { createWilmaOrderTestBackend, eligibleSession, paidEvent } from "./wilma-order-test-helpers";

describe("Wilma PR6 payment success route", () => {
  it("rejects browser/client payment-success posts without a verified provider signature", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());
    const route = createWilmaPaymentSuccessRouteHandler({
      orderBackend: backend.orderBackend,
      documentGenerationBackend: backend.documentGenerationBackend,
      trackerBackend: backend.trackerBackend
    });

    const response = await route(
      new Request("http://localhost/api/wilma/payment-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paid: true,
          amountCents: 5000,
          metadata: { product: "wilma_document_prep", wilmaSessionId: "wilma_session_123" }
        })
      })
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toContain("verified payment webhook");
    expect(backend.orders).toHaveLength(0);
    expect(backend.documentPayloads).toHaveLength(0);
    expect(backend.trackerPayloads).toHaveLength(0);
    expect(backend.auditEvents.map((event) => event.event)).not.toEqual(
      expect.arrayContaining(["wilma_payment_succeeded", "wilma_order_created", "wilma_document_generation_started"])
    );
  });

  it("creates one order and starts fulfillment after verified paid checkout success", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());
    const route = createWilmaPaymentSuccessRouteHandler({
      verifyPaymentSuccess: async () => paidEvent(),
      orderBackend: backend.orderBackend,
      documentGenerationBackend: backend.documentGenerationBackend,
      trackerBackend: backend.trackerBackend
    });

    const response = await route(new Request("http://localhost/api/wilma/payment-success", { method: "POST" }));
    const data = (await response.json()) as { duplicate: boolean };

    expect(response.status).toBe(201);
    expect(data.duplicate).toBe(false);
    expect(backend.orders).toHaveLength(1);
    expect(backend.orders[0]?.status).toBe("fulfilled");
    expect(backend.documentPayloads).toHaveLength(1);
    expect(backend.trackerPayloads).toHaveLength(1);
  });

  it("rejects missing Wilma session metadata", async () => {
    const backend = createWilmaOrderTestBackend();
    const route = createWilmaPaymentSuccessRouteHandler({
      verifyPaymentSuccess: async () => paidEvent({ metadata: { wilmaSessionId: undefined } }),
      orderBackend: backend.orderBackend,
      documentGenerationBackend: backend.documentGenerationBackend,
      trackerBackend: backend.trackerBackend
    });

    const response = await route(new Request("http://localhost/api/wilma/payment-success", { method: "POST" }));
    const data = (await response.json()) as { error: string; reason: string };

    expect(response.status).toBe(400);
    expect(data).toEqual({ ok: false, error: "wilma_order_not_created", reason: "missing_wilma_session" });
    expect(backend.orders).toHaveLength(0);
  });
});
