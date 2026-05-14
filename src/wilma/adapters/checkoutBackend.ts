import type { WilmaChatSession } from "@/wilma/chat/orchestrator";
import type { WilmaCheckoutBackend, WilmaCheckoutMetadata } from "@/wilma/chat/checkout";

type PrismaLike = {
  wilmaChatSession?: {
    findUnique(input: { where: { id: string } }): Promise<UnknownWilmaSession | null>;
  };
};

type UnknownWilmaSession = {
  id: string;
  userId?: string | null;
  leadEmail?: string | null;
  email?: string | null;
  facts?: unknown;
  decision?: unknown;
};

type BillingLike = Record<string, unknown>;

export function createBackendWilmaCheckoutAdapter(): WilmaCheckoutBackend {
  return {
    async loadCheckoutSession({ sessionId }) {
      const prismaModule = (await import("@/lib/prisma")) as unknown as {
        prisma?: PrismaLike;
        db?: PrismaLike;
        default?: PrismaLike;
      };
      const db = prismaModule.prisma ?? prismaModule.db ?? prismaModule.default;
      const record = await db?.wilmaChatSession?.findUnique({ where: { id: sessionId } });

      return record ? toWilmaSession(record) : null;
    },

    async createCheckoutSession({ sessionId, email, metadata }) {
      const billing = (await import("@/lib/billing/checkout")) as BillingLike;
      const createCheckout = pickCheckoutCreator(billing);

      return createCheckout({
        product: "wilma_document_prep",
        priceCents: 5000,
        email,
        customerEmail: email,
        sessionId,
        wilmaSessionId: sessionId,
        metadata
      });
    }
  };
}

function toWilmaSession(record: UnknownWilmaSession): WilmaChatSession {
  return {
    id: record.id,
    userId: record.userId ?? "wilma-checkout",
    email: record.leadEmail ?? record.email ?? null,
    facts: isRecord(record.facts) ? record.facts : {},
    decision: isRecord(record.decision) ? record.decision : null
  } as WilmaChatSession;
}

function pickCheckoutCreator(billing: BillingLike) {
  const candidates = [
    billing.createWilmaDocumentPrepCheckoutSession,
    billing.createDocumentPrepCheckoutSession,
    billing.createCheckoutSession
  ];
  const creator = candidates.find((candidate): candidate is CheckoutCreator => typeof candidate === "function");

  if (!creator) {
    throw new Error("Document-prep checkout service is not available.");
  }

  return creator;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type CheckoutCreator = (input: {
  product: "wilma_document_prep";
  priceCents: 5000;
  email: string;
  customerEmail: string;
  sessionId: string;
  wilmaSessionId: string;
  metadata: WilmaCheckoutMetadata;
}) => Promise<{ checkoutUrl: string }>;
