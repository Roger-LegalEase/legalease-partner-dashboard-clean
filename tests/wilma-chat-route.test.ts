import { describe, expect, it, vi } from "vitest";
import { createWilmaChatRouteHandler } from "@/app/api/wilma/chat/route";
import { createInMemoryWilmaBackend } from "@/wilma/adapters/inMemoryBackend.test-fixture";
import type { WilmaFactExtractor } from "@/wilma/chat/orchestrator";

describe("/api/wilma/chat route", () => {
  it("saves both user and assistant messages", async () => {
    const backend = createInMemoryWilmaBackend();
    const extractor: WilmaFactExtractor = {
      extractFacts: vi.fn(async () => ({
        facts: {
          disposition: "dismissed" as const,
          courtSystem: "state" as const,
          isAdultCase: true
        }
      }))
    };
    const handler = createWilmaChatRouteHandler({
      backend,
      extractor,
      currentUser: async () => null,
      verifyBotProtection: async () => ({ allowed: true }),
      checkRateLimit: async () => allowedRateLimit()
    });

    const response = await handler(
      jsonRequest({
        anonymousId: "device_1",
        message: "Sentence complete, no open case, no balance.",
        state: "IL"
      })
    );
    const data = (await response.json()) as { sessionId: string; status: string };

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(data.sessionId).toBe("wilma_session_1");
    expect(data.status).toBe("likely_eligible_for_document_prep");
    expect(backend.messages).toHaveLength(2);
    expect(backend.messages[0]).toMatchObject({ role: "user" });
    expect(backend.messages[1]).toMatchObject({ role: "assistant" });
  });

  it("does not call the extractor for unsupported states", async () => {
    const backend = createInMemoryWilmaBackend();
    const extractor: WilmaFactExtractor = {
      extractFacts: vi.fn(async () => ({ facts: {} }))
    };
    const handler = createWilmaChatRouteHandler({
      backend,
      extractor,
      currentUser: async () => null,
      verifyBotProtection: async () => ({ allowed: true }),
      checkRateLimit: async () => allowedRateLimit()
    });

    const response = await handler(
      jsonRequest({
        anonymousId: "device_1",
        message: "Can you screen this?",
        state: "NY"
      })
    );
    const data = (await response.json()) as { status: string; reasonCodes: string[] };

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(data.status).toBe("outside_supported_scope");
    expect(data.reasonCodes).toEqual(["unsupported_state"]);
    expect(extractor.extractFacts).not.toHaveBeenCalled();
  });

  it("supports Texas as a PR3 state", async () => {
    const backend = createInMemoryWilmaBackend();
    const extractor: WilmaFactExtractor = {
      extractFacts: vi.fn(async () => ({
        facts: {
          disposition: "acquitted" as const,
          courtSystem: "state" as const,
          sameCriminalEpisodeHasConvictionOrPending: false
        }
      }))
    };
    const handler = createWilmaChatRouteHandler({
      backend,
      extractor,
      currentUser: async () => null,
      verifyBotProtection: async () => ({ allowed: true }),
      checkRateLimit: async () => allowedRateLimit()
    });

    const response = await handler(
      jsonRequest({
        anonymousId: "device_1",
        message: "I was acquitted in Texas.",
        state: "TX"
      })
    );
    const data = (await response.json()) as { status: string; allowPaidCta: boolean; reasonCodes: string[] };

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(data.status).toBe("likely_eligible_for_document_prep");
    expect(data.allowPaidCta).toBe(true);
    expect(data.reasonCodes).toContain("tx_trial_court_acquittal_path");
  });
});

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/wilma/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-legalease-device-id": String(body.anonymousId ?? "device")
    },
    body: JSON.stringify(body)
  });
}

function allowedRateLimit() {
  return {
    allowed: true,
    limit: 20,
    remaining: 19,
    resetAt: new Date("2026-01-01T00:00:00.000Z"),
    provider: "memory" as const
  };
}
