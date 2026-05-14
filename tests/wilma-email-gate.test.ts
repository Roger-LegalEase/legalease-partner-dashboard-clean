import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createWilmaChatRouteHandler } from "@/app/api/wilma/chat/route";
import { createWilmaLeadRouteHandler } from "@/app/api/wilma/lead/route";
import { createInMemoryWilmaBackend } from "@/wilma/adapters/inMemoryBackend.test-fixture";
import type { WilmaChatFacts, WilmaFactExtractor } from "@/wilma/chat/orchestrator";

describe("Wilma PR4 email gate", () => {
  it("returns an email gate and hides paid CTA for likely eligible sessions without captured email", async () => {
    const backend = createInMemoryWilmaBackend();
    const chat = chatHandler(backend, likelyEligibleExtractor());

    const response = await chat(
      jsonRequest("/api/wilma/chat", {
        anonymousId: "device_1",
        message: "Dismissed Illinois case.",
        state: "IL"
      })
    );
    const data = (await response.json()) as {
      status: string;
      emailCaptured: boolean;
      showEmailGate: boolean;
      showPaidCta: boolean;
    };

    expect(data.status).toBe("likely_eligible_for_document_prep");
    expect(data.emailCaptured).toBe(false);
    expect(data.showEmailGate).toBe(true);
    expect(data.showPaidCta).toBe(false);
  });

  it("captures a valid email, creates a lead, and then reveals the paid CTA placeholder", async () => {
    const backend = createInMemoryWilmaBackend();
    const chat = chatHandler(backend, likelyEligibleExtractor());
    const lead = leadHandler(backend);
    const chatResponse = await chat(
      jsonRequest("/api/wilma/chat", {
        anonymousId: "device_1",
        message: "Dismissed Illinois case.",
        state: "IL"
      })
    );
    const chatData = (await chatResponse.json()) as { sessionId: string };

    const leadResponse = await lead(
      jsonRequest("/api/wilma/lead", {
        sessionId: chatData.sessionId,
        deviceId: "device_1",
        email: "client@example.com",
        consent: true
      })
    );
    const leadData = (await leadResponse.json()) as {
      sessionId: string;
      emailCaptured: boolean;
      showEmailGate: boolean;
      showPaidCta: boolean;
    };

    expect(leadResponse.status).toBe(201);
    expect(leadData).toEqual({
      sessionId: chatData.sessionId,
      emailCaptured: true,
      showEmailGate: false,
      showPaidCta: true
    });
    expect(backend.sessions[0]?.email).toBe("client@example.com");
    expect(backend.leads).toEqual([{ sessionId: chatData.sessionId, email: "client@example.com", consent: true }]);
  });

  it("rejects invalid email without creating a lead or showing paid CTA", async () => {
    const backend = createInMemoryWilmaBackend();
    const lead = leadHandler(backend);

    const response = await lead(
      jsonRequest("/api/wilma/lead", {
        sessionId: "wilma_session_1",
        email: "not-an-email",
        consent: true
      })
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe("A valid email address is required.");
    expect(backend.leads).toHaveLength(0);
  });

  it.each([
    ["not_a_fit_for_this_service", { disposition: "dismissed", courtSystem: "federal" } satisfies WilmaChatFacts, "IL"],
    ["needs_more_information", { disposition: "conviction", courtSystem: "state", offenseLevel: "felony" } satisfies WilmaChatFacts, "TX"],
    ["outside_supported_scope", {} satisfies WilmaChatFacts, "NY"]
  ])("%s does not show email gate or paid CTA", async (expectedStatus, facts, state) => {
    const backend = createInMemoryWilmaBackend();
    const chat = chatHandler(backend, extractor(facts));

    const response = await chat(
      jsonRequest("/api/wilma/chat", {
        anonymousId: "device_1",
        message: "Screen this.",
        state
      })
    );
    const data = (await response.json()) as {
      status: string;
      showEmailGate: boolean;
      showPaidCta: boolean;
    };

    expect(data.status).toBe(expectedStatus);
    expect(data.showEmailGate).toBe(false);
    expect(data.showPaidCta).toBe(false);
  });

  it("does not ask for email again when an existing eligible session already captured email", async () => {
    const backend = createInMemoryWilmaBackend();
    const chat = chatHandler(backend, likelyEligibleExtractor());
    const lead = leadHandler(backend);
    const firstResponse = await chat(
      jsonRequest("/api/wilma/chat", {
        anonymousId: "device_1",
        message: "Dismissed Illinois case.",
        state: "IL"
      })
    );
    const firstData = (await firstResponse.json()) as { sessionId: string };
    await lead(
      jsonRequest("/api/wilma/lead", {
        sessionId: firstData.sessionId,
        deviceId: "device_1",
        email: "client@example.com",
        consent: true
      })
    );

    const secondResponse = await chat(
      jsonRequest("/api/wilma/chat", {
        anonymousId: "device_1",
        sessionId: firstData.sessionId,
        message: "Anything else?",
        state: "IL"
      })
    );
    const secondData = (await secondResponse.json()) as {
      emailCaptured: boolean;
      showEmailGate: boolean;
      showPaidCta: boolean;
    };

    expect(secondData.emailCaptured).toBe(true);
    expect(secondData.showEmailGate).toBe(false);
    expect(secondData.showPaidCta).toBe(true);
  });

  it("keeps server-only env out of the client widget", () => {
    const source = readFileSync("src/components/wilma/WilmaChatWidget.tsx", "utf8");

    expect(source).toContain("export function WilmaChatWidget");
    expect(source).not.toContain("@/lib/env");
    expect(source).not.toContain("process.env");
  });
});

function chatHandler(backend: ReturnType<typeof createInMemoryWilmaBackend>, factExtractor: WilmaFactExtractor) {
  return createWilmaChatRouteHandler({
    backend,
    extractor: factExtractor,
    currentUser: async () => null,
    verifyBotProtection: async () => ({ allowed: true }),
    checkRateLimit: async () => allowedRateLimit()
  });
}

function leadHandler(backend: ReturnType<typeof createInMemoryWilmaBackend>) {
  return createWilmaLeadRouteHandler({
    backend,
    verifyBotProtection: async () => ({ allowed: true }),
    checkRateLimit: async () => allowedRateLimit()
  });
}

function likelyEligibleExtractor(): WilmaFactExtractor {
  return extractor({
    disposition: "dismissed",
    courtSystem: "state",
    isAdultCase: true
  });
}

function extractor(facts: WilmaChatFacts): WilmaFactExtractor {
  return {
    extractFacts: vi.fn(async () => ({ facts }))
  };
}

function jsonRequest(path: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-legalease-device-id": String(body.anonymousId ?? body.deviceId ?? "device")
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
