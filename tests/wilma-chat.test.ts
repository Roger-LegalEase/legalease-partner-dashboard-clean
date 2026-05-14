import { describe, expect, it, vi } from "vitest";
import { parseEnv } from "@/lib/env";
import {
  handleWilmaChat,
  captureWilmaLead,
  isWilmaRateLimitError,
  mergeWilmaFacts,
  type WilmaChatDatabase,
  type WilmaChatFacts,
  type WilmaOpenAIClient
} from "@/lib/wilma/chat";

const testEnv = parseEnv({
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/legalease_recordshield",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  RECORDSHIELD_BASIC_PRICE_CENTS: "4900",
  RECORDSHIELD_FAMILY_PRICE_CENTS: "9900",
  RECORDSHIELD_BUSINESS_PRICE_CENTS: "19900",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  STRIPE_PRICE_RECORD_CHECK: "price_record_check",
  STRIPE_PRICE_MONITORING_MONTHLY: "price_monitoring_monthly",
  STRIPE_PRICE_MONITORING_ANNUAL: "price_monitoring_annual",
  STRIPE_PRICE_MONITORING_PLUS_MONTHLY: "price_monitoring_plus_monthly",
  CHECKR_API_KEY: "checkr_test_123",
  CHECKR_PACKAGE_SLUG: "recordshield_test",
  CHECKR_WORK_LOCATION_STATE: "CA",
  CHECKR_WORK_LOCATION_CITY: "Los Angeles",
  OPENAI_API_KEY: "openai_test_123"
});

const user = {
  id: "user_123",
  email: "customer@example.com",
  role: "CUSTOMER" as const
};

function createDb(options: { messageCount?: number; existingFacts?: WilmaChatFacts } = {}) {
  const session = {
    id: "wilma_session_123",
    userId: user.id,
    caseId: null,
    facts: options.existingFacts ?? {}
  };
  const db: WilmaChatDatabase = {
    user: {
      upsert: vi.fn(async () => ({}))
    },
    wilmaChatSession: {
      findFirst: vi.fn(async () => session),
      create: vi.fn(async () => session),
      update: vi.fn(async ({ data }) => ({
        ...session,
        facts: data.facts
      }))
    },
    wilmaChatMessage: {
      count: vi.fn(async () => options.messageCount ?? 0),
      create: vi.fn(async () => ({}))
    }
  };

  return { db, session };
}

function createOpenAI(facts: WilmaChatFacts): WilmaOpenAIClient {
  return {
    extractFacts: vi.fn(async () => ({
      facts,
      assistantMessage: "Thanks. I captured that."
    }))
  };
}

describe("Wilma chat", () => {
  it("merges only present extracted facts over existing facts", () => {
    expect(
      mergeWilmaFacts(
        {
          state: "CA",
          sentenceCompleted: "unknown"
        },
        {
          state: null,
          sentenceCompleted: "yes",
          hasOpenCase: "no"
        }
      )
    ).toEqual({
      state: "CA",
      sentenceCompleted: "yes",
      hasOpenCase: "no"
    });
  });

  it("loads a session, extracts facts, saves transcript and decision, and returns checkout CTA", async () => {
    const { db } = createDb({
      existingFacts: {
        state: "CA"
      }
    });
    const openAI = createOpenAI({
      sentenceCompleted: "yes",
      hasOpenCase: "no",
      hasOutstandingBalance: "no"
    });

    const response = await handleWilmaChat(
      user,
      {
        sessionId: "wilma_session_123",
        message: "My sentence is complete and I have no open cases or balances."
      },
      {
        configEnv: testEnv,
        db,
        openAI,
        now: () => new Date("2026-05-13T12:00:00.000Z")
      }
    );

    expect(response).toMatchObject({
      sessionId: "wilma_session_123",
      decision: {
        status: "likely_eligible"
      },
      cta: {
        type: "checkout",
        href: "/api/checkout/record-check",
        enabled: true
      },
      rateLimit: {
        remaining: 19
      }
    });
    expect(db.wilmaChatMessage.create).toHaveBeenCalledTimes(2);
    expect(db.wilmaChatSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wilma_session_123" },
        data: expect.objectContaining({
          decision: expect.objectContaining({
            status: "likely_eligible"
          })
        })
      })
    );
    expect(openAI.extractFacts).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "My sentence is complete and I have no open cases or balances.",
        facts: { state: "CA" },
        model: testEnv.OPENAI_MODEL
      })
    );
  });

  it("creates a session when one is not available", async () => {
    const { db, session } = createDb();
    vi.mocked(db.wilmaChatSession.findFirst).mockResolvedValueOnce(null);
    const openAI = createOpenAI({
      state: "CA",
      sentenceCompleted: "unknown",
      hasOpenCase: "unknown",
      hasOutstandingBalance: "unknown"
    });

    await handleWilmaChat(
      user,
      {
        caseId: "case_123",
        message: "The record is in California."
      },
      {
        configEnv: testEnv,
        db,
        openAI,
        now: () => new Date("2026-05-13T12:00:00.000Z")
      }
    );

    expect(db.wilmaChatSession.create).toHaveBeenCalledWith({
      data: {
        userId: user.id,
        caseId: "case_123",
        facts: {},
        lastMessageAt: new Date("2026-05-13T12:00:00.000Z")
      }
    });
    expect(session.id).toBe("wilma_session_123");
  });

  it("stops before OpenAI when the user exceeds the rate limit", async () => {
    const { db } = createDb({ messageCount: 20 });
    const openAI = createOpenAI({});

    await expect(
      handleWilmaChat(
        user,
        {
          message: "Can I continue?"
        },
        {
          configEnv: testEnv,
          db,
          openAI,
          now: () => new Date("2026-05-13T12:00:00.000Z")
        }
      )
    ).rejects.toSatisfy(isWilmaRateLimitError);
    expect(openAI.extractFacts).not.toHaveBeenCalled();
  });

  it("captures consented lead email through the existing user backend", async () => {
    const { db } = createDb();
    const now = new Date("2026-05-13T12:00:00.000Z");

    await captureWilmaLead(
      db,
      {
        message: "lead_capture",
        leadEmail: "Lead@Example.com",
        leadConsent: true
      },
      now
    );

    expect(db.user.upsert).toHaveBeenCalledWith({
      where: { email: "lead@example.com" },
      create: {
        email: "lead@example.com",
        role: "CUSTOMER",
        leadConsent: true,
        leadConsentAt: now,
        leadSource: "wilma_chat"
      },
      update: {
        leadConsent: true,
        leadConsentAt: now,
        leadSource: "wilma_chat"
      }
    });
  });
});
