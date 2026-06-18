import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { fulfillWilmaOrder } from "@/wilma/orders/fulfillWilmaOrder";
import { hashLegalEaseOsReference } from "@/lib/legalese-os-events";
import { processWilmaPaidCheckout } from "@/wilma/orders/createWilmaOrder";
import {
  createWilmaOrderTestBackend,
  eligibleSession,
  paidEvent
} from "./wilma-order-test-helpers";
import type { WilmaDocumentPrepOrder, WilmaOrderSession } from "@/wilma/orders/types";

const enabledLegalEaseOsConfig = {
  LEGALEASE_OS_EVENTS_ENABLED: "true",
  LEGALEASE_OS_EVENTS_ENDPOINT: "https://command.example.com/api/os-loops/events",
  LEGALEASE_OS_EVENTS_SECRET: "os_events_secret_123"
} as const;

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

  it("emits a safe signed packet.generated event after successful fulfillment", async () => {
    const backend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(backend, session);
    const timestamp = "2026-06-18T19:00:00.000Z";
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 }));

    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: backend.orderBackend,
      documentGenerationBackend: backend.documentGenerationBackend,
      trackerBackend: backend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: fetcher,
      now: () => new Date(timestamp)
    });

    expect(fulfilled.status).toBe("fulfilled");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_ENDPOINT);
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    const body = String(init.body);
    const payload = JSON.parse(body) as Record<string, unknown>;
    const expectedSignature = createHmac("sha256", enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_SECRET)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-legalease-os-timestamp"]).toBe(timestamp);
    expect(headers["x-legalease-os-signature"]).toBe(`sha256=${expectedSignature}`);
    expect(headers["x-idempotency-key"]).toBe(payload.idempotency_key);
    expect(payload).toMatchObject({
      source_system: "expungement_ai",
      event_type: "packet.generated",
      occurred_at: timestamp,
      subject_type: "packet_generation",
      subject_ref_hash: hashLegalEaseOsReference(`wilma_packet:${order.id}:${order.documentTarget}`),
      jurisdiction: "IL",
      packet_type: "expungement_petition",
      pii_classification: "hashed_reference_only",
      summary: "Document-prep packet generation completed.",
      recommended_operator_action: "Review packet generation trends if failures increase."
    });
    expect(payload.metrics).toMatchObject({
      reason_code_count: 3,
      has_tracker_workspace: true,
      rule_version: "wilma-service-fit-v1"
    });

    expect(body).not.toContain(order.leadEmail);
    expect(body).not.toContain("client@example.com");
    expect(body).not.toContain("Cook");
    expect(body).not.toContain("2026-CF-1");
    expect(body).not.toContain("dismissed");
    expect(body).not.toContain(order.id);
    expect(body).not.toContain("doc_job_");
    expect(body).not.toContain("tracker_1");
    expect(body).not.toContain("pi_test_");
    expect(body).not.toContain("cs_test_");
    expect(body).not.toContain("provider_payload");
    expect(body).not.toContain("raw_packet");
    expect(body).not.toContain("tok_");
    expect(body).not.toContain("sk_");
    expect(body).not.toContain(enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_SECRET);
  });

  it.each([
    ["disabled", { ...enabledLegalEaseOsConfig, LEGALEASE_OS_EVENTS_ENABLED: "false" }],
    ["missing endpoint", { LEGALEASE_OS_EVENTS_ENABLED: "true", LEGALEASE_OS_EVENTS_SECRET: "os_events_secret_123" }],
    ["missing secret", { LEGALEASE_OS_EVENTS_ENABLED: "true", LEGALEASE_OS_EVENTS_ENDPOINT: enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_ENDPOINT }]
  ])("does not emit packet.generated when LegalEase OS exporter is %s", async (_label, legalEaseOsConfigEnv) => {
    const backend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(backend, session);
    const fetcher = vi.fn();

    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: backend.orderBackend,
      documentGenerationBackend: backend.documentGenerationBackend,
      trackerBackend: backend.trackerBackend,
      legalEaseOsConfigEnv,
      legalEaseOsFetch: fetcher
    });

    expect(fulfilled.status).toBe("fulfilled");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not break fulfillment when packet.generated export fails", async () => {
    const backend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(backend, session);
    const fetcher = vi.fn(async () => {
      throw new Error("Command Center unreachable");
    });

    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: backend.orderBackend,
      documentGenerationBackend: backend.documentGenerationBackend,
      trackerBackend: backend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: fetcher
    });

    expect(fulfilled.status).toBe("fulfilled");
    expect(fulfilled.documentGenerationJobId).toBe("doc_job_1");
    expect(fulfilled.trackerWorkspaceId).toBe("tracker_1");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("emits a safe signed engine.health_changed event after document generation failure", async () => {
    const backend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(backend, session);
    const timestamp = "2026-06-18T22:00:00.000Z";
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 }));

    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: backend.orderBackend,
      documentGenerationBackend: {
        async generateDocumentPrep() {
          throw new Error("generation failed");
        }
      },
      trackerBackend: backend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: fetcher,
      now: () => new Date(timestamp)
    });

    expect(fulfilled.status).toBe("fulfillment_failed");
    expect(backend.trackerPayloads).toHaveLength(0);
    expect(backend.auditEvents.find((event) => event.event === "wilma_document_generation_failed")?.riskFlags).toContain(
      "fulfillment_failed"
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expectSafeFulfillmentFailureEvent(fetcher.mock.calls[0], {
      order,
      timestamp,
      forbidden: ["generation failed"]
    });
  });

  it("emits a safe signed engine.health_changed event after tracker creation failure", async () => {
    const backend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(backend, session);
    const timestamp = "2026-06-18T22:15:00.000Z";
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 }));

    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: backend.orderBackend,
      documentGenerationBackend: backend.documentGenerationBackend,
      trackerBackend: {
        async createTrackerWorkspace() {
          throw new Error("tracker failed");
        }
      },
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: fetcher,
      now: () => new Date(timestamp)
    });

    expect(fulfilled.status).toBe("fulfillment_failed");
    expect(backend.documentPayloads).toHaveLength(1);
    expect(backend.auditEvents.find((event) => event.event === "wilma_document_generation_failed")?.riskFlags).toContain(
      "fulfillment_failed"
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expectSafeFulfillmentFailureEvent(fetcher.mock.calls[0], {
      order,
      timestamp,
      forbidden: ["tracker failed"]
    });
  });

  it.each([
    ["disabled", { ...enabledLegalEaseOsConfig, LEGALEASE_OS_EVENTS_ENABLED: "false" }],
    ["missing endpoint", { LEGALEASE_OS_EVENTS_ENABLED: "true", LEGALEASE_OS_EVENTS_SECRET: "os_events_secret_123" }],
    ["missing secret", { LEGALEASE_OS_EVENTS_ENABLED: "true", LEGALEASE_OS_EVENTS_ENDPOINT: enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_ENDPOINT }]
  ])("does not emit fulfillment failure health when LegalEase OS exporter is %s", async (_label, legalEaseOsConfigEnv) => {
    const backend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(backend, session);
    const fetcher = vi.fn();

    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: backend.orderBackend,
      documentGenerationBackend: {
        async generateDocumentPrep() {
          throw new Error("generation failed");
        }
      },
      trackerBackend: backend.trackerBackend,
      legalEaseOsConfigEnv,
      legalEaseOsFetch: fetcher
    });

    expect(fulfilled.status).toBe("fulfillment_failed");
    expect(backend.auditEvents.find((event) => event.event === "wilma_document_generation_failed")?.riskFlags).toContain(
      "fulfillment_failed"
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not break fulfillment failure behavior when failure health export fails", async () => {
    const backend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(backend, session);
    const fetcher = vi.fn(async () => {
      throw new Error("Command Center unreachable");
    });

    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: backend.orderBackend,
      documentGenerationBackend: {
        async generateDocumentPrep() {
          throw new Error("generation failed");
        }
      },
      trackerBackend: backend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: fetcher
    });

    expect(fulfilled.status).toBe("fulfillment_failed");
    expect(backend.auditEvents.find((event) => event.event === "wilma_document_generation_failed")?.riskFlags).toContain(
      "fulfillment_failed"
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
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

async function createPendingOrder(
  backend: ReturnType<typeof createWilmaOrderTestBackend>,
  session: WilmaOrderSession
): Promise<WilmaDocumentPrepOrder> {
  const decision = session.decision;
  if (decision?.status !== "likely_eligible_for_document_prep" || !session.email || !session.facts.state) {
    throw new Error("Test session must be eligible.");
  }

  return backend.orderBackend.createOrder({
    order: {
      wilmaSessionId: session.id,
      leadEmail: session.email,
      state: session.facts.state,
      documentTarget: decision.documentTarget,
      decisionStatus: "likely_eligible_for_document_prep",
      ruleVersion: decision.ruleVersion,
      reasonCodes: decision.reasonCodes,
      priceCents: 5000,
      paymentProvider: "stripe",
      paymentProviderCheckoutSessionId: "cs_test_123",
      paymentProviderPaymentIntentId: "pi_test_123",
      status: "paid_pending_fulfillment"
    }
  });
}

function expectSafeFulfillmentFailureEvent(
  call: unknown,
  input: { order: WilmaDocumentPrepOrder; timestamp: string; forbidden: string[] }
) {
  const [url, init] = call as [string, RequestInit];
  expect(url).toBe(enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_ENDPOINT);
  expect(init.method).toBe("POST");

  const headers = init.headers as Record<string, string>;
  const body = String(init.body);
  const payload = JSON.parse(body) as Record<string, unknown>;
  const expectedSignature = createHmac("sha256", enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_SECRET)
    .update(`${input.timestamp}.${body}`)
    .digest("hex");

  expect(headers["content-type"]).toBe("application/json");
  expect(headers["x-legalease-os-timestamp"]).toBe(input.timestamp);
  expect(headers["x-legalease-os-signature"]).toBe(`sha256=${expectedSignature}`);
  expect(headers["x-idempotency-key"]).toBe(payload.idempotency_key);
  expect(payload).toMatchObject({
    source_system: "expungement_ai",
    event_type: "engine.health_changed",
    occurred_at: input.timestamp,
    subject_type: "packet_generation",
    subject_ref_hash: hashLegalEaseOsReference(`wilma_packet_failure:${input.order.id}:${input.order.documentTarget}`),
    jurisdiction: "IL",
    packet_type: "expungement_petition",
    pii_classification: "hashed_reference_only",
    summary: "Document-prep fulfillment failed before packet completion.",
    recommended_operator_action: "Review fulfillment health and retry manually if needed."
  });
  expect(payload.metrics).toMatchObject({
    status: "fulfillment_failed",
    reason_code_count: 3,
    rule_version: "wilma-service-fit-v1",
    failure_stage: "document_or_tracker_generation"
  });

  expect(body).not.toContain(input.order.leadEmail);
  expect(body).not.toContain("client@example.com");
  expect(body).not.toContain("Cook");
  expect(body).not.toContain("2026-CF-1");
  expect(body).not.toContain("dismissed");
  expect(body).not.toContain(input.order.id);
  expect(body).not.toContain("doc_job_");
  expect(body).not.toContain("tracker_1");
  expect(body).not.toContain("tracker_2");
  expect(body).not.toContain("pi_test_");
  expect(body).not.toContain("cs_test_");
  expect(body).not.toContain("stripe");
  expect(body).not.toContain("provider_payload");
  expect(body).not.toContain("raw_packet");
  expect(body).not.toContain("tok_");
  expect(body).not.toContain("sk_");
  expect(body).not.toContain(enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_SECRET);
  for (const forbidden of input.forbidden) {
    expect(body).not.toContain(forbidden);
  }
}
