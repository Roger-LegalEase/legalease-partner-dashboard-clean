import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createWilmaConfigRouteHandler } from "@/app/api/wilma/config/route";
import { hashLegalEaseOsReference } from "@/lib/legalese-os-events";
import { fulfillWilmaOrder } from "@/wilma/orders/fulfillWilmaOrder";
import type { WilmaLaunchConfig } from "@/wilma/launch/types";
import type { WilmaDocumentPrepOrder, WilmaOrderSession } from "@/wilma/orders/types";
import { createWilmaOrderTestBackend, eligibleSession } from "./wilma-order-test-helpers";

const enabledLegalEaseOsConfig = {
  LEGALEASE_OS_EVENTS_ENABLED: "true",
  LEGALEASE_OS_EVENTS_ENDPOINT: "https://command.example.com/api/os-loops/events",
  LEGALEASE_OS_EVENTS_SECRET: "os_events_secret_123"
} as const;

const allowedEventFields = new Set([
  "source_system",
  "event_type",
  "occurred_at",
  "subject_type",
  "subject_ref_hash",
  "jurisdiction",
  "pathway_key",
  "packet_type",
  "metrics",
  "summary",
  "recommended_operator_action",
  "pii_classification",
  "idempotency_key"
]);

const forbiddenFragments = [
  "Jane Person",
  "client@example.com",
  "failure@example.com",
  "roger@example.com",
  "beta@example.com",
  "second@example.com",
  "212-555-1212",
  "1975-04-12",
  "123-45-6789",
  "Cook",
  "2026-CF-1",
  "dismissed",
  "criminal history",
  "wilma transcript",
  "raw_facts",
  "raw_request",
  "raw_response",
  "raw_packet",
  "provider_payload",
  "wilma_session_123",
  "wilma_order_",
  "doc_job_",
  "tracker_1",
  "tracker_2",
  "cs_test_",
  "pi_test_",
  "payment_intent",
  "stripe",
  "tok_",
  "sk_",
  "whsec_",
  "os_events_secret_123"
];

describe("LegalEase OS exporter vertical smoke", () => {
  it("emits signed safe events from all wired product seams", async () => {
    const collector = createCollector();
    const engineTime = "2026-06-18T20:00:00.000Z";
    const packetTime = "2026-06-18T20:05:00.000Z";
    const failureTime = "2026-06-18T20:10:00.000Z";
    const engineHandler = createWilmaConfigRouteHandler({
      currentUser: async () => null,
      launchBackend: backend(launchConfig()),
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: collector.fetcher,
      engineHealthThrottleCache: new Map(),
      now: () => new Date(engineTime)
    });
    const packetBackend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(packetBackend, session);
    const failedSession = eligibleSession({ email: "failure@example.com" });
    failedSession.id = "wilma_session_failure";
    const failedOrder = await createPendingOrder(packetBackend, failedSession);

    const engineResponse = await engineHandler(
      new Request(
        "http://localhost:3000/api/wilma/config?email=roger@example.com&anonymousId=device-123&state=IL",
        {
          headers: {
            "x-legalease-device-id": "device-456",
            "x-forwarded-for": "203.0.113.10"
          }
        }
      )
    );
    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: packetBackend.orderBackend,
      documentGenerationBackend: packetBackend.documentGenerationBackend,
      trackerBackend: packetBackend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: collector.fetcher,
      now: () => new Date(packetTime)
    });
    const failed = await fulfillWilmaOrder(failedOrder, failedSession, {
      orderBackend: packetBackend.orderBackend,
      documentGenerationBackend: {
        async generateDocumentPrep() {
          throw new Error("generation failed");
        }
      },
      trackerBackend: packetBackend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: collector.fetcher,
      now: () => new Date(failureTime)
    });

    expect(engineResponse.status).toBe(200);
    expect(fulfilled.status).toBe("fulfilled");
    expect(failed.status).toBe("fulfillment_failed");
    expect(collector.fetcher).toHaveBeenCalledTimes(3);
    const events = collector.events();
    expect(events.map((event) => event.payload.event_type)).toEqual([
      "engine.health_changed",
      "packet.generated",
      "engine.health_changed"
    ]);

    for (const event of events) {
      expectSignedEvent(event);
      expect(event.headers["x-idempotency-key"]).toBe(event.payload.idempotency_key);
      expect(Object.keys(event.payload).every((key) => allowedEventFields.has(key))).toBe(true);
      expectNoForbiddenFragments(event.rawBody);
    }

    expect(events[0]?.payload).toMatchObject({
      source_system: "expungement_ai",
      event_type: "engine.health_changed",
      subject_type: "engine",
      subject_ref_hash: hashLegalEaseOsReference("expungement-engine"),
      jurisdiction: "ALL",
      pii_classification: "none"
    });
    expect(events[0]?.payload.metrics).toMatchObject({
      available: true,
      allowed_states_count: 6,
      beta_only: false,
      maintenance_mode: false,
      kill_switch: false,
      mode: "available"
    });

    expect(events[1]?.payload).toMatchObject({
      source_system: "expungement_ai",
      event_type: "packet.generated",
      subject_type: "packet_generation",
      subject_ref_hash: hashLegalEaseOsReference(`wilma_packet:${order.id}:${order.documentTarget}`),
      jurisdiction: "IL",
      packet_type: "expungement_petition",
      pii_classification: "hashed_reference_only"
    });
    expect(events[1]?.payload.metrics).toMatchObject({
      reason_code_count: 3,
      has_tracker_workspace: true,
      rule_version: "wilma-service-fit-v1"
    });

    expect(events[2]?.payload).toMatchObject({
      source_system: "expungement_ai",
      event_type: "engine.health_changed",
      subject_type: "packet_generation",
      subject_ref_hash: hashLegalEaseOsReference(`wilma_packet_failure:${failedOrder.id}:${failedOrder.documentTarget}`),
      jurisdiction: "IL",
      packet_type: "expungement_petition",
      pii_classification: "hashed_reference_only",
      summary: "Document-prep fulfillment failed before packet completion.",
      recommended_operator_action: "Review fulfillment health and retry manually if needed."
    });
    expect(events[2]?.payload.metrics).toMatchObject({
      status: "fulfillment_failed",
      reason_code_count: 3,
      rule_version: "wilma-service-fit-v1",
      failure_stage: "document_or_tracker_generation"
    });
    expect(events[2]?.rawBody).not.toContain("generation failed");
    expect(events[2]?.rawBody).not.toContain(failedOrder.id);
  });

  it.each([
    ["disabled", { ...enabledLegalEaseOsConfig, LEGALEASE_OS_EVENTS_ENABLED: "false" }],
    [
      "missing endpoint",
      {
        LEGALEASE_OS_EVENTS_ENABLED: "true",
        LEGALEASE_OS_EVENTS_SECRET: enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_SECRET
      }
    ],
    [
      "missing secret",
      {
        LEGALEASE_OS_EVENTS_ENABLED: "true",
        LEGALEASE_OS_EVENTS_ENDPOINT: enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_ENDPOINT
      }
    ]
  ])("does not emit any wired product event when exporter is %s", async (_label, legalEaseOsConfigEnv) => {
    const fetcher = vi.fn();
    const engineHandler = createWilmaConfigRouteHandler({
      currentUser: async () => null,
      launchBackend: backend(launchConfig()),
      legalEaseOsConfigEnv,
      legalEaseOsFetch: fetcher
    });
    const packetBackend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(packetBackend, session);
    const failedSession = eligibleSession({ email: "failure@example.com" });
    failedSession.id = "wilma_session_failure";
    const failedOrder = await createPendingOrder(packetBackend, failedSession);

    const engineResponse = await engineHandler(new Request("http://localhost:3000/api/wilma/config"));
    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: packetBackend.orderBackend,
      documentGenerationBackend: packetBackend.documentGenerationBackend,
      trackerBackend: packetBackend.trackerBackend,
      legalEaseOsConfigEnv,
      legalEaseOsFetch: fetcher
    });
    const failed = await fulfillWilmaOrder(failedOrder, failedSession, {
      orderBackend: packetBackend.orderBackend,
      documentGenerationBackend: {
        async generateDocumentPrep() {
          throw new Error("generation failed");
        }
      },
      trackerBackend: packetBackend.trackerBackend,
      legalEaseOsConfigEnv,
      legalEaseOsFetch: fetcher
    });

    expect(engineResponse.status).toBe(200);
    expect(fulfilled.status).toBe("fulfilled");
    expect(failed.status).toBe("fulfillment_failed");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not break config or fulfillment when outbound export fails", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("Command Center unavailable");
    });
    const engineHandler = createWilmaConfigRouteHandler({
      currentUser: async () => null,
      launchBackend: backend(launchConfig()),
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: fetcher
    });
    const packetBackend = createWilmaOrderTestBackend();
    const session = eligibleSession();
    const order = await createPendingOrder(packetBackend, session);
    const failedSession = eligibleSession({ email: "failure@example.com" });
    failedSession.id = "wilma_session_failure";
    const failedOrder = await createPendingOrder(packetBackend, failedSession);

    const engineResponse = await engineHandler(new Request("http://localhost:3000/api/wilma/config"));
    const engineBody = (await engineResponse.json()) as { available: boolean };
    const fulfilled = await fulfillWilmaOrder(order, session, {
      orderBackend: packetBackend.orderBackend,
      documentGenerationBackend: packetBackend.documentGenerationBackend,
      trackerBackend: packetBackend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: fetcher
    });
    const failed = await fulfillWilmaOrder(failedOrder, failedSession, {
      orderBackend: packetBackend.orderBackend,
      documentGenerationBackend: {
        async generateDocumentPrep() {
          throw new Error("generation failed");
        }
      },
      trackerBackend: packetBackend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: fetcher
    });

    expect(engineResponse.status).toBe(200);
    expect(engineBody.available).toBe(true);
    expect(fulfilled.status).toBe("fulfilled");
    expect(fulfilled.documentGenerationJobId).toBe("doc_job_1");
    expect(fulfilled.trackerWorkspaceId).toBe("tracker_1");
    expect(failed.status).toBe("fulfillment_failed");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("throttles repeated engine health exports but allows separate packet generations", async () => {
    let now = "2026-06-18T21:05:00.000Z";
    const collector = createCollector();
    const engineHandler = createWilmaConfigRouteHandler({
      currentUser: async () => null,
      launchBackend: backend(launchConfig()),
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: collector.fetcher,
      engineHealthThrottleCache: new Map(),
      now: () => new Date(now)
    });

    await engineHandler(new Request("http://localhost:3000/api/wilma/config"));
    now = "2026-06-18T21:40:00.000Z";
    await engineHandler(new Request("http://localhost:3000/api/wilma/config"));

    const packetBackend = createWilmaOrderTestBackend();
    const firstSession = eligibleSession();
    const firstOrder = await createPendingOrder(packetBackend, firstSession);
    const secondSession = eligibleSession({ email: "second@example.com" });
    secondSession.id = "wilma_session_456";
    const secondOrder = await createPendingOrder(packetBackend, secondSession);

    await fulfillWilmaOrder(firstOrder, firstSession, {
      orderBackend: packetBackend.orderBackend,
      documentGenerationBackend: packetBackend.documentGenerationBackend,
      trackerBackend: packetBackend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: collector.fetcher,
      now: () => new Date("2026-06-18T21:45:00.000Z")
    });
    await fulfillWilmaOrder(secondOrder, secondSession, {
      orderBackend: packetBackend.orderBackend,
      documentGenerationBackend: packetBackend.documentGenerationBackend,
      trackerBackend: packetBackend.trackerBackend,
      legalEaseOsConfigEnv: enabledLegalEaseOsConfig,
      legalEaseOsFetch: collector.fetcher,
      now: () => new Date("2026-06-18T21:45:00.000Z")
    });

    const events = collector.events();
    expect(events.map((event) => event.payload.event_type)).toEqual([
      "engine.health_changed",
      "packet.generated",
      "packet.generated"
    ]);
    expect(events[1]?.headers["x-idempotency-key"]).not.toBe(events[2]?.headers["x-idempotency-key"]);
    for (const event of events) {
      expectNoForbiddenFragments(event.rawBody);
    }
  });

  it("keeps LegalEase OS exporter configuration server-only", () => {
    const publicEnvSource = readFileSync("src/lib/public-env.ts", "utf8");
    const exporterSource = readFileSync("src/lib/legalese-os-events.ts", "utf8");
    const chatWidgetSource = readFileSync("src/components/wilma/WilmaChatWidget.tsx", "utf8");

    expect(exporterSource).toContain('import "server-only";');
    expect(publicEnvSource).not.toContain("LEGALEASE_OS_EVENTS");
    expect(chatWidgetSource).not.toContain("LEGALEASE_OS_EVENTS");
    expect(chatWidgetSource).not.toContain("legalese-os-events");
  });
});

function createCollector() {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 }));
  return {
    fetcher,
    events() {
      return fetcher.mock.calls.map((call) => {
        const [url, init] = call as [string, RequestInit];
        const headers = init.headers as Record<string, string>;
        const rawBody = String(init.body);
        return {
          url,
          init,
          headers,
          rawBody,
          payload: JSON.parse(rawBody) as Record<string, unknown>
        };
      });
    }
  };
}

function expectSignedEvent(event: ReturnType<ReturnType<typeof createCollector>["events"]>[number]) {
  expect(event.url).toBe(enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_ENDPOINT);
  expect(event.init.method).toBe("POST");
  expect(event.headers["content-type"]).toBe("application/json");
  expect(event.headers["x-legalease-os-timestamp"]).toBe(String(event.payload.occurred_at));
  expect(event.headers["x-idempotency-key"]).toBeTruthy();
  const expectedSignature = createHmac("sha256", enabledLegalEaseOsConfig.LEGALEASE_OS_EVENTS_SECRET)
    .update(`${event.headers["x-legalease-os-timestamp"]}.${event.rawBody}`)
    .digest("hex");
  expect(event.headers["x-legalease-os-signature"]).toBe(`sha256=${expectedSignature}`);
}

function expectNoForbiddenFragments(value: string) {
  for (const fragment of forbiddenFragments) {
    expect(value).not.toContain(fragment);
  }
}

function launchConfig(overrides: Partial<WilmaLaunchConfig> = {}): WilmaLaunchConfig {
  return {
    publicEnabled: true,
    betaOnly: false,
    allowedStates: ["IL", "PA", "MD", "DC", "MS", "TX"],
    rolloutPercent: 100,
    maintenanceMode: false,
    killSwitch: false,
    betaAllowedEmails: [],
    betaTokens: [],
    ...overrides
  };
}

function backend(config: WilmaLaunchConfig) {
  return {
    async getLaunchConfig() {
      return config;
    }
  };
}

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
      paymentProviderCheckoutSessionId: `cs_test_${session.id}`,
      paymentProviderPaymentIntentId: `pi_test_${session.id}`,
      status: "paid_pending_fulfillment"
    }
  });
}
