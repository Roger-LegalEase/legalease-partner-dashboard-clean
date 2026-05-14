import type { Prisma } from "@prisma/client";
import type { AppUser } from "@/lib/auth";
import { trackAnalyticsEvent, type AnalyticsDatabase } from "@/lib/analytics";
import type { Env } from "@/lib/env";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { minimizeTranscriptContent } from "@/lib/security/redaction";
import { evaluateWilmaEligibility, type WilmaEligibilityInput, type WilmaEligibilityResult } from "@/lib/wilma";

const chatRateLimit = {
  maxMessages: 20,
  windowMs: 10 * 60 * 1000
};

const factExtractionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["facts", "assistantMessage"],
  properties: {
    facts: {
      type: "object",
      additionalProperties: false,
      required: [
        "state",
        "county",
        "dateOfBirth",
        "caseId",
        "jurisdiction",
        "offenseCategory",
        "dispositionDate",
        "sentenceCompleted",
        "hasOpenCase",
        "hasOutstandingBalance"
      ],
      properties: {
        state: { type: ["string", "null"] },
        county: { type: ["string", "null"] },
        dateOfBirth: { type: ["string", "null"] },
        caseId: { type: ["string", "null"] },
        jurisdiction: { type: ["string", "null"] },
        offenseCategory: { type: ["string", "null"] },
        dispositionDate: { type: ["string", "null"] },
        sentenceCompleted: { type: ["string", "null"], enum: ["yes", "no", "unknown", null] },
        hasOpenCase: { type: ["string", "null"], enum: ["yes", "no", "unknown", null] },
        hasOutstandingBalance: { type: ["string", "null"], enum: ["yes", "no", "unknown", null] }
      }
    },
    assistantMessage: { type: "string" }
  }
} as const;

export type WilmaChatFacts = {
  state?: string | null;
  county?: string | null;
  dateOfBirth?: string | null;
  caseId?: string | null;
  jurisdiction?: string | null;
  offenseCategory?: string | null;
  dispositionDate?: string | null;
  sentenceCompleted?: "yes" | "no" | "unknown" | null;
  hasOpenCase?: "yes" | "no" | "unknown" | null;
  hasOutstandingBalance?: "yes" | "no" | "unknown" | null;
};

export type WilmaChatExtraction = {
  facts: WilmaChatFacts;
  assistantMessage: string;
};

export type WilmaChatCta = {
  type: "continue" | "checkout" | "checkr_invitation" | "manual_review";
  label: string;
  href: string | null;
  enabled: boolean;
};

export type WilmaChatResponse = {
  sessionId: string;
  message: string;
  facts: WilmaChatFacts;
  decision: WilmaEligibilityResult;
  cta: WilmaChatCta;
  rateLimit: {
    remaining: number;
    resetAt: string;
  };
};

export type WilmaChatRequest = {
  message: string;
  sessionId?: string;
  caseId?: string;
  leadEmail?: string;
  leadConsent?: boolean;
};

type WilmaChatSessionRecord = {
  id: string;
  userId: string;
  caseId: string | null;
  leadEmail?: string | null;
  decisionId?: string | null;
  facts: unknown;
};

export type WilmaChatDatabase = {
  user: {
    upsert(args: {
      where: { email: string };
      create: {
        id?: string;
        email: string;
        role: AppUser["role"];
        leadConsent?: boolean;
        leadConsentAt?: Date;
        leadSource?: string;
      };
      update: {
        role?: AppUser["role"];
        leadConsent?: boolean;
        leadConsentAt?: Date;
        leadSource?: string;
      };
    }): Promise<unknown>;
  };
  wilmaChatSession: {
    findFirst(args: {
      where: { id?: string; userId: string };
      orderBy?: { updatedAt: "desc" };
    }): Promise<WilmaChatSessionRecord | null>;
    create(args: {
      data: {
        userId: string;
        caseId?: string;
        facts: Prisma.InputJsonValue;
        lastMessageAt: Date;
      };
    }): Promise<WilmaChatSessionRecord>;
    update(args: {
      where: { id: string };
      data: {
        facts?: Prisma.InputJsonValue;
        leadEmail?: string;
        decisionId?: string;
        decision?: Prisma.InputJsonValue;
        lastMessageAt: Date;
      };
    }): Promise<WilmaChatSessionRecord>;
  };
  wilmaChatMessage: {
    count(args: { where: { userId: string; createdAt: { gte: Date } } }): Promise<number>;
    create(args: {
      data: {
        sessionId: string;
        userId: string;
        role: "user" | "assistant";
        content: string;
        metadata?: Prisma.InputJsonValue;
      };
    }): Promise<unknown>;
  };
  auditEvent?: AnalyticsDatabase["auditEvent"];
};

export type WilmaOpenAIClient = {
  extractFacts(input: {
    message: string;
    facts: WilmaChatFacts;
    model: string;
  }): Promise<WilmaChatExtraction>;
};

export type WilmaChatDependencies = {
  db?: WilmaChatDatabase;
  openAI?: WilmaOpenAIClient;
  configEnv?: Env;
  now?: () => Date;
};

class RateLimitError extends Error {
  resetAt: Date;

  constructor(resetAt: Date) {
    super("Wilma chat rate limit exceeded.");
    this.name = "RateLimitError";
    this.resetAt = resetAt;
  }
}

export function isWilmaRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function mergeWilmaFacts(existingFacts: WilmaChatFacts, extractedFacts: WilmaChatFacts): WilmaChatFacts {
  return Object.entries(extractedFacts).reduce<WilmaChatFacts>(
    (facts, [key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        return { ...facts, [key]: value };
      }

      return facts;
    },
    { ...existingFacts }
  );
}

export async function handleWilmaChat(
  user: AppUser,
  request: WilmaChatRequest,
  dependencies: WilmaChatDependencies = {}
): Promise<WilmaChatResponse> {
  const trimmedMessage = request.message.trim();

  if (!trimmedMessage) {
    throw new Error("Wilma chat message is required.");
  }

  const db = (dependencies.db ?? prisma) as WilmaChatDatabase;
  const configEnv = dependencies.configEnv ?? env;
  const now = dependencies.now?.() ?? new Date();
  const userTranscript = minimizeWilmaTranscript(trimmedMessage, configEnv);
  const windowStart = new Date(now.getTime() - chatRateLimit.windowMs);
  const resetAt = new Date(now.getTime() + chatRateLimit.windowMs);
  const usedMessages = await db.wilmaChatMessage.count({
    where: {
      userId: user.id,
      createdAt: { gte: windowStart }
    }
  });

  if (usedMessages >= chatRateLimit.maxMessages) {
    throw new RateLimitError(resetAt);
  }

  await db.user.upsert({
    where: { email: user.email },
    create: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    update: { role: user.role }
  });
  await captureWilmaLead(db, request, now);

  const { session, created } = await loadOrCreateWilmaSession(db, user, request, now);
  const existingFacts = normalizeFacts(session.facts);
  const openAI = dependencies.openAI ?? createOpenAIExtractor(configEnv);
  const extraction = await openAI.extractFacts({
    message: trimmedMessage,
    facts: existingFacts,
    model: configEnv.OPENAI_MODEL
  });
  const facts = mergeWilmaFacts(existingFacts, extraction.facts);
  const decisionId = session.decisionId ?? createWilmaDecisionId(session.id, now);
  const decision = {
    ...evaluateWilmaEligibility(toEligibilityInput(user, facts), now),
    id: decisionId
  };
  const message = buildNextWilmaMessage(extraction.assistantMessage, facts, decision);
  const cta = buildWilmaCta(decision, session.id);

  await db.wilmaChatMessage.create({
    data: {
      sessionId: session.id,
      userId: user.id,
      role: "user",
      content: userTranscript,
      metadata: {
        minimized: configEnv.WILMA_STORE_RAW_TRANSCRIPTS !== "true",
        retentionDays: configEnv.WILMA_TRANSCRIPT_RETENTION_DAYS,
        expiresAt: transcriptExpiresAt(now, configEnv).toISOString()
      } satisfies Prisma.InputJsonValue
    }
  });
  await db.wilmaChatMessage.create({
    data: {
      sessionId: session.id,
      userId: user.id,
      role: "assistant",
      content: minimizeWilmaTranscript(message, configEnv),
      metadata: {
        facts,
        decision,
        cta,
        minimized: configEnv.WILMA_STORE_RAW_TRANSCRIPTS !== "true",
        retentionDays: configEnv.WILMA_TRANSCRIPT_RETENTION_DAYS,
        expiresAt: transcriptExpiresAt(now, configEnv).toISOString()
      } satisfies Prisma.InputJsonValue
    }
  });
  await db.wilmaChatSession.update({
    where: { id: session.id },
    data: {
      facts: facts as Prisma.InputJsonValue,
      leadEmail: normalizeEmail(request.leadEmail) ?? session.leadEmail ?? undefined,
      decisionId,
      decision: decision as unknown as Prisma.InputJsonValue,
      lastMessageAt: now
    }
  });
  await trackWilmaChatAnalytics(db, {
    user,
    sessionId: session.id,
    created,
    existingFacts,
    facts,
    decision,
    cta
  });

  return {
    sessionId: session.id,
    message,
    facts,
    decision,
    cta,
    rateLimit: {
      remaining: Math.max(chatRateLimit.maxMessages - usedMessages - 1, 0),
      resetAt: resetAt.toISOString()
    }
  };
}

export async function captureWilmaLead(
  db: WilmaChatDatabase,
  request: WilmaChatRequest,
  now: Date
): Promise<void> {
  const email = normalizeEmail(request.leadEmail);

  if (!email || !request.leadConsent) {
    return;
  }

  await db.user.upsert({
    where: { email },
    create: {
      email,
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
  await trackAnalyticsEvent(db, {
    event: "email_captured",
    actorEmail: email,
    targetType: "WilmaChatSession",
    targetId: request.sessionId,
    metadata: {
      source: "wilma_chat",
      consent: request.leadConsent
    }
  });

  if (request.sessionId) {
    await db.wilmaChatSession.update({
      where: { id: request.sessionId },
      data: {
        leadEmail: email,
        lastMessageAt: now
      }
    });
  }
}

function normalizeEmail(email: string | undefined): string | null {
  const trimmedEmail = email?.trim().toLowerCase();

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return null;
  }

  return trimmedEmail;
}

function minimizeWilmaTranscript(content: string, configEnv: Env): string {
  return configEnv.WILMA_STORE_RAW_TRANSCRIPTS === "true" ? content : minimizeTranscriptContent(content);
}

function transcriptExpiresAt(now: Date, configEnv: Env): Date {
  return new Date(now.getTime() + configEnv.WILMA_TRANSCRIPT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

async function loadOrCreateWilmaSession(
  db: WilmaChatDatabase,
  user: AppUser,
  request: WilmaChatRequest,
  now: Date
): Promise<{ session: WilmaChatSessionRecord; created: boolean }> {
  const session = request.sessionId
    ? await db.wilmaChatSession.findFirst({
        where: {
          id: request.sessionId,
          userId: user.id
        }
      })
    : await db.wilmaChatSession.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" }
      });

  if (session) {
    return { session, created: false };
  }

  return {
    session: await db.wilmaChatSession.create({
      data: {
        userId: user.id,
        caseId: request.caseId,
        facts: {},
        lastMessageAt: now
      }
    }),
    created: true
  };
}

function normalizeFacts(value: unknown): WilmaChatFacts {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as WilmaChatFacts;
}

async function trackWilmaChatAnalytics(
  db: WilmaChatDatabase,
  input: {
    user: AppUser;
    sessionId: string;
    created: boolean;
    existingFacts: WilmaChatFacts;
    facts: WilmaChatFacts;
    decision: WilmaEligibilityResult;
    cta: WilmaChatCta;
  }
) {
  const base = {
    actorUserId: input.user.id,
    actorEmail: input.user.email,
    targetType: "WilmaChatSession",
    targetId: input.sessionId
  };

  if (input.created) {
    await trackAnalyticsEvent(db, {
      ...base,
      event: "chat_started",
      metadata: { status: input.decision.status }
    });
  }

  if (input.facts.state && input.facts.state !== "unknown" && input.existingFacts.state !== input.facts.state) {
    await trackAnalyticsEvent(db, {
      ...base,
      event: "state_selected",
      metadata: { state: input.facts.state }
    });
  }

  if (input.decision.status !== "needs_information") {
    await trackAnalyticsEvent(db, {
      ...base,
      event: "eligibility_completed",
      metadata: {
        status: input.decision.status,
        decisionId: input.decision.id,
        ruleVersion: input.decision.ruleVersion,
        reasonCodes: input.decision.reasons.map((reason) => reason.code)
      }
    });
  }

  if (input.decision.status === "likely_eligible_for_document_prep") {
    await trackAnalyticsEvent(db, {
      ...base,
      event: "likely_eligible",
      metadata: {
        decisionId: input.decision.id,
        ctaType: input.cta.type
      }
    });
  }
}

function toEligibilityInput(user: AppUser, facts: WilmaChatFacts): WilmaEligibilityInput {
  return {
    applicant: {
      userId: user.id,
      state: normalizeState(facts.state),
      county: facts.county ?? undefined,
      dateOfBirth: facts.dateOfBirth ?? undefined
    },
    case: {
      caseId: facts.caseId ?? undefined,
      jurisdiction: facts.jurisdiction ?? undefined,
      offenseCategory: facts.offenseCategory ?? undefined,
      dispositionDate: facts.dispositionDate ?? undefined,
      sentenceCompleted: facts.sentenceCompleted ?? "unknown",
      hasOpenCase: facts.hasOpenCase ?? "unknown",
      hasOutstandingBalance: facts.hasOutstandingBalance ?? "unknown"
    }
  };
}

function normalizeState(state: string | null | undefined): string {
  if (!state) {
    return "unknown";
  }

  const normalized = state.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "unknown";
}

function buildNextWilmaMessage(
  assistantMessage: string,
  facts: WilmaChatFacts,
  decision: WilmaEligibilityResult
): string {
	  if (decision.status === "likely_eligible_for_document_prep") {
	    return "Based on what you shared, this may be ready for document preparation review. You can continue with the secure $50 checkout when you are ready.";
	  }

  if (decision.status === "manual_review") {
    return "Thanks. A few details need manual review before Wilma can recommend the next automated step.";
  }

  const missing = firstMissingFact(facts);

  if (missing) {
    return `Thanks. ${questionForMissingFact(missing)}`;
  }

  return assistantMessage || "Thanks. Please share any additional details you have about the case.";
}

function firstMissingFact(facts: WilmaChatFacts): keyof WilmaChatFacts | null {
  for (const field of ["state", "sentenceCompleted", "hasOpenCase", "hasOutstandingBalance"] as const) {
    if (!facts[field] || facts[field] === "unknown") {
      return field;
    }
  }

  return null;
}

function questionForMissingFact(field: keyof WilmaChatFacts): string {
  const questions: Record<string, string> = {
    state: "What state is the record in?",
    sentenceCompleted: "Has the sentence been fully completed?",
    hasOpenCase: "Do you currently have any open cases?",
    hasOutstandingBalance: "Are there any unpaid fines, fees, or restitution balances?"
  };

  return questions[field] ?? "What else should Wilma know about the case?";
}

function buildWilmaCta(decision: WilmaEligibilityResult, sessionId: string): WilmaChatCta {
  if (decision.status === "likely_eligible_for_document_prep") {
    return {
      type: "checkout",
      label: "$50 Continue",
      href: `/api/checkout/document-prep?sessionId=${encodeURIComponent(sessionId)}`,
      enabled: true
    };
  }

  if (decision.status === "manual_review") {
    return {
      type: "manual_review",
      label: "Manual review needed",
      href: null,
      enabled: false
    };
  }

  return {
    type: "continue",
    label: "Continue chat",
    href: null,
    enabled: true
  };
}

function createWilmaDecisionId(sessionId: string, evaluatedAt: Date): string {
  return `wilma_decision_${sessionId}_${evaluatedAt.getTime()}`;
}

function createOpenAIExtractor(configEnv: Env): WilmaOpenAIClient {
  return {
    async extractFacts(input) {
      if (!configEnv.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required for Wilma chat fact extraction.");
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configEnv.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: input.model,
          input: [
            {
              role: "system",
	              content:
	                "Extract expungement-readiness facts from the user message. Return JSON only. Do not invent facts. Use null when the message does not provide a value."
            },
            {
              role: "user",
              content: JSON.stringify({
                existingFacts: input.facts,
                message: input.message
              })
            }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "wilma_fact_extraction",
              strict: true,
              schema: factExtractionSchema
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI fact extraction failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as { output_text?: string };
      const outputText = payload.output_text ?? findOutputText(payload);

      if (!outputText) {
        throw new Error("OpenAI fact extraction returned no structured output.");
      }

      return JSON.parse(outputText) as WilmaChatExtraction;
    }
  };
}

function findOutputText(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const output = (value as { output?: unknown }).output;

  if (!Array.isArray(output)) {
    return undefined;
  }

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as { content?: unknown }).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue;
      }

      const maybeText = contentItem as { text?: unknown; type?: unknown };

      if (typeof maybeText.text === "string" && maybeText.text.trim()) {
        return maybeText.text;
      }
    }
  }

  return undefined;
}
