import { describe, expect, it, vi } from "vitest";
import { runWilmaChat, type WilmaFactExtractor } from "@/wilma/chat/orchestrator";
import { createInMemoryWilmaBackend } from "@/wilma/adapters/inMemoryBackend.test-fixture";

const extractor: WilmaFactExtractor = {
  extractFacts: vi.fn(async () => ({ facts: {} }))
};

describe("Wilma PR8 session limits", () => {
  it("blocks further free chat after the per-session message cap", async () => {
    const backend = createInMemoryWilmaBackend();
    const session = await backend.createSession({ userId: "wilma-device", facts: { state: "IL" } });
    for (let index = 0; index < 40; index += 1) {
      await backend.saveMessage({
        sessionId: session.id,
        userId: session.userId,
        role: "user",
        content: `message ${index}`
      });
    }

    const response = await runWilmaChat(
      {
        sessionId: session.id,
        userId: session.userId,
        message: "Can I keep going?",
        state: "IL"
      },
      { backend, extractor }
    );

    expect(response.reasonCodes).toEqual(["message_cap_reached"]);
    expect(response.assistantMessage).toContain("limit for this free eligibility screening");
    expect(backend.auditEvents.at(-1)?.riskFlags).toContain("message_cap_reached");
  });

  it("blocks expired sessions after 24 hours of inactivity", async () => {
    const backend = createInMemoryWilmaBackend();
    const session = await backend.createSession({ userId: "wilma-device", facts: { state: "IL" } });
    backend.sessionLastMessageAt.set(session.id, new Date("2026-01-01T00:00:00.000Z"));

    const response = await runWilmaChat(
      {
        sessionId: session.id,
        userId: session.userId,
        message: "Continue old screening.",
        state: "IL"
      },
      {
        backend,
        extractor,
        now: () => new Date("2026-01-02T01:00:01.000Z")
      }
    );

    expect(response.reasonCodes).toEqual(["session_expired"]);
    expect(backend.auditEvents.at(-1)?.riskFlags).toContain("session_expired");
  });
});
