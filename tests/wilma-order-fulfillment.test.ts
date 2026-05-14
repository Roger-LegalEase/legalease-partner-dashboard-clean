import { describe, expect, it } from "vitest";
import { processWilmaPaidCheckout } from "@/wilma/orders/createWilmaOrder";
import { createWilmaOrderTestBackend, eligibleSession, paidEvent } from "./wilma-order-test-helpers";

describe("Wilma PR6 order fulfillment", () => {
  it("passes structured Wilma facts to document generation and creates a tracker after payment", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());

    const result = await processWilmaPaidCheckout(paidEvent(), backend);

    expect(result.ok).toBe(true);
    expect(backend.documentPayloads[0]).toMatchObject({
      source: "wilma",
      wilmaSessionId: "wilma_session_123",
      state: "IL",
      documentTarget: "expungement_petition",
      leadEmail: "client@example.com",
      facts: {
        county: "Cook",
        disposition: "dismissed"
      },
      decision: {
        status: "likely_eligible_for_document_prep",
        ruleVersion: "wilma-service-fit-v1",
        reasonCodes: ["il_supported_state", "non_conviction_disposition", "adult_state_court_case"]
      }
    });
    expect(backend.orders[0]?.documentGenerationJobId).toBe("doc_job_1");
    expect(backend.orders[0]?.trackerWorkspaceId).toBe("tracker_1");
  });

  it("marks the order fulfillment_failed when document generation fails", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());

    const result = await processWilmaPaidCheckout(paidEvent(), {
      ...backend,
      documentGenerationBackend: {
        async generateDocumentPrep() {
          throw new Error("generation failed");
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(backend.orders).toHaveLength(1);
    expect(backend.orders[0]?.status).toBe("fulfillment_failed");
    expect(backend.trackerPayloads).toHaveLength(0);
  });

  it.each([
    ["checkout created but not paid", paidEvent({ paid: false }), "not_paid"],
    ["wrong amount", paidEvent({ amountCents: 4900 }), "wrong_amount"],
    ["wrong product", paidEvent({ metadata: { product: "record_check" } }), "wrong_product"]
  ])("%s does not create orders or documents", async (_name, event, reason) => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());

    const result = await processWilmaPaidCheckout(event, backend);

    expect(result).toEqual({ ok: false, error: "wilma_order_not_created", reason });
    expect(backend.orders).toHaveLength(0);
    expect(backend.documentPayloads).toHaveLength(0);
    expect(backend.trackerPayloads).toHaveLength(0);
  });

  it("blocks sessions that are no longer likely eligible", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession({ status: "needs_more_information" }));

    const result = await processWilmaPaidCheckout(paidEvent(), backend);

    expect(result).toEqual({ ok: false, error: "wilma_order_not_created", reason: "not_likely_eligible" });
    expect(backend.orders).toHaveLength(0);
  });

  it("blocks sessions without captured email", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession({ email: null }));

    const result = await processWilmaPaidCheckout(paidEvent(), backend);

    expect(result).toEqual({ ok: false, error: "wilma_order_not_created", reason: "email_not_captured" });
    expect(backend.orders).toHaveLength(0);
  });
});
