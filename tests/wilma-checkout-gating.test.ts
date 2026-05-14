import { describe, expect, it } from "vitest";
import { createWilmaCheckoutHandoff } from "@/wilma/chat/checkout";
import { createInMemoryWilmaBackend } from "@/wilma/adapters/inMemoryBackend.test-fixture";
import type { WilmaChatStatus } from "@/wilma/chat/orchestrator";
import type { WilmaDocumentTarget } from "@/wilma/chat/rules";

describe("Wilma PR5 checkout gating", () => {
  it("creates checkout for likely eligible sessions with captured email", async () => {
    const backend = createInMemoryWilmaBackend();
    const session = await eligibleSession(backend, { email: "client@example.com" });

    const result = await createWilmaCheckoutHandoff({ sessionId: session.id }, { backend });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected checkout to be created.");
    }
    expect(result.checkoutUrl).toBe(`https://checkout.test/${session.id}`);
    expect(backend.checkouts).toHaveLength(1);
  });

  it("blocks likely eligible sessions without captured email", async () => {
    const backend = createInMemoryWilmaBackend();
    const session = await eligibleSession(backend, { email: null });

    const result = await createWilmaCheckoutHandoff({ sessionId: session.id }, { backend });

    expect(result).toEqual({
      ok: false,
      error: "checkout_not_available",
      reason: "email_not_captured"
    });
    expect(backend.checkouts).toHaveLength(0);
  });

  it.each([
    "needs_more_information",
    "not_a_fit_for_this_service",
    "outside_supported_scope"
  ] satisfies WilmaChatStatus[])("blocks %s decisions", async (status) => {
    const backend = createInMemoryWilmaBackend();
    const session = await createSessionWithDecision(backend, {
      email: "client@example.com",
      status,
      allowPaidCta: false
    });

    const result = await createWilmaCheckoutHandoff({ sessionId: session.id }, { backend });

    expect(result).toEqual({
      ok: false,
      error: "checkout_not_available",
      reason: "not_likely_eligible"
    });
    expect(backend.checkouts).toHaveLength(0);
  });

  it("blocks stale or missing sessions", async () => {
    const backend = createInMemoryWilmaBackend();

    const result = await createWilmaCheckoutHandoff({ sessionId: "missing" }, { backend });

    expect(result).toEqual({
      ok: false,
      error: "checkout_not_available",
      reason: "missing_session"
    });
  });

  it("blocks sessions before chat has produced a decision", async () => {
    const backend = createInMemoryWilmaBackend();
    const session = await backend.createSession({
      userId: "wilma-device",
      email: "client@example.com",
      facts: { state: "IL" }
    });

    const result = await createWilmaCheckoutHandoff({ sessionId: session.id }, { backend });

    expect(result).toEqual({
      ok: false,
      error: "checkout_not_available",
      reason: "missing_decision"
    });
  });

  it("includes session, email, state, document target, rule version, and reason codes in metadata", async () => {
    const backend = createInMemoryWilmaBackend();
    const session = await eligibleSession(backend, { email: "client@example.com" });

    const result = await createWilmaCheckoutHandoff({ sessionId: session.id }, { backend });

    expect(result.ok).toBe(true);
    expect(backend.checkouts[0]?.metadata).toEqual({
      wilmaSessionId: session.id,
      leadEmail: "client@example.com",
      state: "IL",
      documentTarget: "expungement_petition",
      decisionStatus: "likely_eligible_for_document_prep",
      ruleVersion: "wilma-service-fit-v1",
      reasonCodes: ["il_supported_state", "non_conviction_disposition", "adult_state_court_case"],
      product: "wilma_document_prep",
      priceCents: 5000
    });
  });
});

async function eligibleSession(
  backend: ReturnType<typeof createInMemoryWilmaBackend>,
  input: { email: string | null }
) {
  return createSessionWithDecision(backend, {
    email: input.email,
    status: "likely_eligible_for_document_prep",
    allowPaidCta: true,
    documentTarget: "expungement_petition"
  });
}

async function createSessionWithDecision(
  backend: ReturnType<typeof createInMemoryWilmaBackend>,
  input: {
    email: string | null;
    status: WilmaChatStatus;
    allowPaidCta: boolean;
    documentTarget?: WilmaDocumentTarget;
  }
) {
  const session = await backend.createSession({
    userId: "wilma-device",
    email: input.email ?? undefined,
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
    email: input.email ?? undefined,
    facts: session.facts,
    decision: {
      status: input.status,
      documentTarget: input.documentTarget ?? "none",
      allowPaidCta: input.allowPaidCta,
      requiresEmailGate: input.allowPaidCta,
      reasonCodes: ["il_supported_state", "non_conviction_disposition", "adult_state_court_case"],
      ruleId: "IL-001",
      ruleVersion: "wilma-service-fit-v1",
      evaluatedAt: "2026-01-01T00:00:00.000Z"
    }
  });
}
