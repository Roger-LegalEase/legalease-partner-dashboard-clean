import { describe, expect, it, vi } from "vitest";
import { createWilmaChatRouteHandler } from "@/app/api/wilma/chat/route";
import { runWilmaChat, type WilmaFactExtractor } from "@/wilma/chat/orchestrator";
import { createInMemoryWilmaBackend } from "@/wilma/adapters/inMemoryBackend.test-fixture";
import { processWilmaPaidCheckout } from "@/wilma/orders/createWilmaOrder";
import { createWilmaOrderTestBackend, eligibleSession, paidEvent } from "./wilma-order-test-helpers";

const extractor: WilmaFactExtractor = {
  extractFacts: vi.fn(async () => ({ facts: {} }))
};

describe("Wilma PR8 abuse controls", () => {
  it("blocks repeated free screenings by email", async () => {
    const backend = createInMemoryWilmaBackend();
    for (let index = 0; index < 3; index += 1) {
      await backend.createSession({ userId: `wilma-${index}`, email: "client@example.com", facts: {} });
    }

    const response = await runWilmaChat(
      {
        userId: "wilma-new",
        email: "client@example.com",
        message: "Start another screening.",
        state: "IL"
      },
      { backend, extractor }
    );

    expect(response.reasonCodes).toEqual(["email_session_limit"]);
    expect(backend.auditEvents.at(-1)?.riskFlags).toContain("repeat_screening_abuse");
  });

  it("blocks repeated free screenings by IP and device", async () => {
    const backend = createInMemoryWilmaBackend();
    backend.ipSessionCounts.set("203.0.113.10", 10);
    backend.deviceSessionCounts.set("device_1", 3);

    const ipResponse = await runWilmaChat(
      {
        userId: "wilma-ip",
        ip: "203.0.113.10",
        message: "Start screening.",
        state: "IL"
      },
      { backend, extractor }
    );
    const deviceResponse = await runWilmaChat(
      {
        userId: "wilma-device",
        deviceId: "device_1",
        message: "Start screening.",
        state: "IL"
      },
      { backend, extractor }
    );

    expect(ipResponse.reasonCodes).toEqual(["ip_session_limit"]);
    expect(deviceResponse.reasonCodes).toEqual(["device_session_limit"]);
  });

  it("blocks hourly IP chat request abuse and logs a rate-limit flag", async () => {
    const backend = createInMemoryWilmaBackend();
    backend.ipChatRequestCounts.set("203.0.113.20", 60);

    const response = await runWilmaChat(
      {
        userId: "wilma-ip",
        ip: "203.0.113.20",
        message: "Screen this.",
        state: "IL"
      },
      { backend, extractor }
    );

    expect(response.reasonCodes).toEqual(["ip_rate_limited"]);
    expect(backend.auditEvents.at(-1)?.riskFlags).toContain("rate_limit_hit");
  });

  it("blocks bot-protection failures safely and logs a risk flag", async () => {
    const backend = createInMemoryWilmaBackend();
    const route = createWilmaChatRouteHandler({
      backend,
      extractor,
      currentUser: async () => null,
      verifyBotProtection: async () => ({ allowed: false }),
      checkRateLimit: async () => ({
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: new Date("2026-01-01T00:00:00.000Z"),
        provider: "memory" as const
      })
    });

    const response = await route(
      new Request("http://localhost/api/wilma/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousId: "device_1", message: "hello", state: "IL" })
      })
    );

    expect(response.status).toBe(403);
    expect(backend.auditEvents.at(-1)?.riskFlags).toContain("bot_protection_failed");
  });

  it("does not apply chat abuse limits to verified payment fulfillment", async () => {
    const backend = createWilmaOrderTestBackend();
    backend.sessions.push(eligibleSession());

    const result = await processWilmaPaidCheckout(paidEvent(), backend);

    expect(result.ok).toBe(true);
    expect(backend.orders).toHaveLength(1);
    expect(backend.documentPayloads).toHaveLength(1);
  });
});
