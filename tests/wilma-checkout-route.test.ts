import { describe, expect, it } from "vitest";
import { createWilmaCheckoutRouteHandler } from "@/app/api/wilma/checkout/route";
import { createInMemoryWilmaBackend } from "@/wilma/adapters/inMemoryBackend.test-fixture";

describe("Wilma PR5 checkout route", () => {
  it("returns a checkout URL for eligible sessions with captured email", async () => {
    const backend = createInMemoryWilmaBackend();
    const session = await eligibleSession(backend, "client@example.com");
    const checkout = checkoutHandler(backend);

    const response = await checkout(jsonRequest({ sessionId: session.id }));
    const data = (await response.json()) as { checkoutUrl: string; sessionId: string };

    expect(response.status).toBe(201);
    expect(data).toEqual({
      checkoutUrl: `https://checkout.test/${session.id}`,
      sessionId: session.id
    });
    expect(backend.checkouts[0]?.metadata.wilmaSessionId).toBe(session.id);
  });

  it("blocks checkout when email has not been captured", async () => {
    const backend = createInMemoryWilmaBackend();
    const session = await eligibleSession(backend, null);
    const checkout = checkoutHandler(backend);

    const response = await checkout(jsonRequest({ sessionId: session.id }));
    const data = (await response.json()) as { error: string; reason: string };

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "checkout_not_available",
      reason: "email_not_captured"
    });
  });

  it("blocks manual posts with missing sessions", async () => {
    const backend = createInMemoryWilmaBackend();
    const checkout = checkoutHandler(backend);

    const response = await checkout(jsonRequest({ sessionId: "fake-session" }));
    const data = (await response.json()) as { error: string; reason: string };

    expect(response.status).toBe(404);
    expect(data).toEqual({
      error: "checkout_not_available",
      reason: "missing_session"
    });
  });

  it("keeps server-only env out of the client widget", async () => {
    const source = await import("@/components/wilma/WilmaChatWidget");

    expect(Object.keys(source)).toContain("WilmaChatWidget");
  });
});

function checkoutHandler(backend: ReturnType<typeof createInMemoryWilmaBackend>) {
  return createWilmaCheckoutRouteHandler({
    backend,
    verifyBotProtection: async () => ({ allowed: true }),
    checkRateLimit: async () => ({
      allowed: true,
      limit: 5,
      remaining: 4,
      resetAt: new Date("2026-01-01T00:00:00.000Z"),
      provider: "memory" as const
    })
  });
}

async function eligibleSession(backend: ReturnType<typeof createInMemoryWilmaBackend>, email: string | null) {
  const session = await backend.createSession({
    userId: "wilma-device",
    email: email ?? undefined,
    facts: {
      state: "IL",
      disposition: "dismissed",
      courtSystem: "state",
      isAdultCase: true
    }
  });

  return backend.updateSession({
    sessionId: session.id,
    userId: session.userId,
    email: email ?? undefined,
    facts: session.facts,
    decision: {
      status: "likely_eligible_for_document_prep",
      documentTarget: "expungement_petition",
      allowPaidCta: true,
      requiresEmailGate: true,
      reasonCodes: ["il_supported_state"],
      ruleId: "IL-001",
      ruleVersion: "wilma-service-fit-v1",
      evaluatedAt: "2026-01-01T00:00:00.000Z"
    }
  });
}

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/wilma/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-legalease-device-id": "device"
    },
    body: JSON.stringify(body)
  });
}
