import { describe, expect, it, vi } from "vitest";
import { runWilmaChat, captureWilmaLead, type WilmaFactExtractor } from "@/wilma/chat/orchestrator";
import { createWilmaCheckoutHandoff } from "@/wilma/chat/checkout";
import { processWilmaPaidCheckout } from "@/wilma/orders/createWilmaOrder";
import { createInMemoryWilmaBackend } from "@/wilma/adapters/inMemoryBackend.test-fixture";
import { createWilmaOrderTestBackend, eligibleSession, paidEvent } from "./wilma-order-test-helpers";

describe("Wilma PR7A analytics events", () => {
  it("records chat, state, facts, decision, email, and checkout funnel events", async () => {
    const backend = createInMemoryWilmaBackend();
    const extractor: WilmaFactExtractor = {
      extractFacts: vi.fn(async () => ({
        facts: {
          disposition: "dismissed",
          courtSystem: "state",
          isAdultCase: true
        }
      }))
    };
    const chat = await runWilmaChat(
      {
        userId: "wilma-device",
        message: "Dismissed Illinois case.",
        state: "IL"
      },
      { backend, extractor }
    );

    await captureWilmaLead(
      { sessionId: chat.sessionId, email: "client@example.com", consent: true },
      { backend }
    );
    await createWilmaCheckoutHandoff({ sessionId: chat.sessionId }, { backend });

    expect(backend.auditEvents.map((event) => event.event)).toEqual([
      "wilma_chat_started",
      "wilma_state_selected",
      "wilma_facts_extracted",
      "wilma_decision_created",
      "wilma_email_gate_shown",
      "wilma_session_flagged",
      "wilma_email_captured",
      "wilma_paid_cta_shown",
      "wilma_checkout_clicked",
      "wilma_checkout_created"
    ]);
    const decisionEvent = backend.auditEvents.find((event) => event.event === "wilma_decision_created");
    expect(decisionEvent).toMatchObject({
      ruleVersion: "wilma_service_fit_pr3_v1",
      reasonCodes: ["il_supported_state", "non_conviction_disposition", "adult_state_court_case"]
    });
    expect(backend.auditEvents.every((event) => !("actorEmail" in event))).toBe(true);
    expect(backend.auditEvents.some((event) => event.emailHash)).toBe(true);
  });

  it("records verified payment, order, document, and tracker events during successful fulfillment", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());

    await processWilmaPaidCheckout(paidEvent(), backend);

    expect(backend.auditEvents.map((event) => event.event)).toEqual([
      "wilma_payment_succeeded",
      "wilma_order_created",
      "wilma_document_generation_started",
      "wilma_document_generation_succeeded",
      "wilma_tracker_created"
    ]);
    expect(backend.auditEvents.every((event) => !event.riskFlags.includes("fulfillment_failed"))).toBe(true);
  });

  it("records fulfillment_failed when document generation fails", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());

    await processWilmaPaidCheckout(paidEvent(), {
      ...backend,
      documentGenerationBackend: {
        async generateDocumentPrep() {
          throw new Error("generation failed");
        }
      }
    });

    expect(backend.auditEvents.map((event) => event.event)).toContain("wilma_document_generation_failed");
    expect(backend.auditEvents.find((event) => event.event === "wilma_document_generation_failed")?.riskFlags).toContain(
      "fulfillment_failed"
    );
  });
});
