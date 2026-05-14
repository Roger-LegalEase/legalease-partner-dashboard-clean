import { describe, expect, it, vi } from "vitest";
import { parseEnv } from "@/lib/env";
import {
  captureWilmaLead,
  handleWilmaChat,
  type WilmaChatDatabase,
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

function createDb() {
  const db: WilmaChatDatabase = {
    user: {
      upsert: vi.fn(async () => ({}))
    },
    wilmaChatSession: {
      findFirst: vi.fn(async () => ({
        id: "wilma_session_123",
        userId: user.id,
        caseId: null,
        facts: { state: "CA" },
        leadEmail: null,
        decisionId: null
      })),
      create: vi.fn(async () => ({
        id: "wilma_session_123",
        userId: user.id,
        caseId: null,
        facts: {},
        leadEmail: null,
        decisionId: null
      })),
      update: vi.fn(async () => ({
        id: "wilma_session_123",
        userId: user.id,
        caseId: null,
        facts: {},
        leadEmail: null,
        decisionId: "wilma_decision_123"
      }))
    },
    wilmaChatMessage: {
      count: vi.fn(async () => 0),
      create: vi.fn(async () => ({}))
    }
  };

  return db;
}

const openAI: WilmaOpenAIClient = {
  extractFacts: vi.fn(async () => ({
    facts: {
      sentenceCompleted: "yes" as const,
      hasOpenCase: "no" as const,
      hasOutstandingBalance: "no" as const
    },
    assistantMessage: "Thanks."
  }))
};

describe("Wilma document-prep checkout decision", () => {
  it("returns a $50 document-prep checkout CTA with a decision id", async () => {
    const db = createDb();

    const response = await handleWilmaChat(
      user,
      {
        sessionId: "wilma_session_123",
        message: "Sentence complete, no open cases, no balance."
      },
      {
        configEnv: testEnv,
        db,
        openAI,
        now: () => new Date("2026-05-13T12:00:00.000Z")
      }
    );

    expect(response.decision).toMatchObject({
      id: "wilma_decision_wilma_session_123_1778673600000",
      status: "likely_eligible_for_document_prep"
    });
    expect(response.cta).toEqual({
      type: "checkout",
      label: "$50 Continue",
      href: "/api/checkout/document-prep?sessionId=wilma_session_123",
      enabled: true
    });
    expect(db.wilmaChatSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          decisionId: "wilma_decision_wilma_session_123_1778673600000",
          decision: expect.objectContaining({
            status: "likely_eligible_for_document_prep"
          })
        })
      })
    );
    expect(db.wilmaChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "user",
          content: "Sentence complete, no open cases, no balance.",
          metadata: expect.objectContaining({
            minimized: true,
            retentionDays: 180,
            expiresAt: "2026-11-09T12:00:00.000Z"
          })
        })
      })
    );
  });

  it("minimizes PII in stored Wilma transcripts", async () => {
    const db = createDb();

    await handleWilmaChat(
      user,
      {
        sessionId: "wilma_session_123",
        message: "Call me at 212-555-1212 and use lead@example.com."
      },
      {
        configEnv: testEnv,
        db,
        openAI,
        now: () => new Date("2026-05-13T12:00:00.000Z")
      }
    );

    expect(db.wilmaChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "user",
          content: "Call me at [REDACTED_PHONE] and use [REDACTED_EMAIL]."
        })
      })
    );
  });

  it("stores consented lead email on the Wilma session before checkout", async () => {
    const db = createDb();
    const now = new Date("2026-05-13T12:00:00.000Z");

    await captureWilmaLead(
      db,
      {
        message: "lead_capture",
        sessionId: "wilma_session_123",
        leadEmail: "Lead@Example.com",
        leadConsent: true
      },
      now
    );

    expect(db.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "lead@example.com" }
      })
    );
    expect(db.wilmaChatSession.update).toHaveBeenCalledWith({
      where: { id: "wilma_session_123" },
      data: {
        leadEmail: "lead@example.com",
        lastMessageAt: now
      }
    });
  });
});
