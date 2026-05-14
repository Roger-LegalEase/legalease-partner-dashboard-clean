import type {
  WilmaDocumentPrepOrder,
  WilmaOrderBackend,
  WilmaOrderSession,
  WilmaOrderStatus
} from "@/wilma/orders/types";

type PrismaLike = {
  wilmaChatSession?: {
    findUnique(input: { where: { id: string } }): Promise<UnknownSession | null>;
  };
  wilmaDocumentPrepOrder?: {
    findFirst(input: {
      where: {
        OR: Array<{
          paymentProviderCheckoutSessionId?: string;
          paymentProviderPaymentIntentId?: string;
        }>;
      };
    }): Promise<WilmaDocumentPrepOrder | null>;
    create(input: { data: Omit<WilmaDocumentPrepOrder, "id" | "createdAt" | "updatedAt"> }): Promise<WilmaDocumentPrepOrder>;
    update(input: {
      where: { id: string };
      data: {
        status: WilmaOrderStatus;
        documentGenerationJobId?: string;
        trackerWorkspaceId?: string;
      };
    }): Promise<WilmaDocumentPrepOrder>;
  };
  auditEvent?: {
    create(input: {
      data: {
        actorUserId?: string;
        action: string;
        targetType: string;
        targetId: string;
        metadata: unknown;
      };
    }): Promise<unknown>;
  };
};

type UnknownSession = {
  id: string;
  leadEmail?: string | null;
  email?: string | null;
  facts?: unknown;
  decision?: unknown;
};

export function createBackendWilmaOrderAdapter(): WilmaOrderBackend {
  return {
    async loadSession({ sessionId }) {
      const db = await loadPrisma();
      const session = await db.wilmaChatSession?.findUnique({ where: { id: sessionId } });

      return session ? toOrderSession(session) : null;
    },

    async findOrderByPayment({ checkoutSessionId, paymentIntentId }) {
      const db = await loadPrisma();
      const where = [
        { paymentProviderCheckoutSessionId: checkoutSessionId },
        ...(paymentIntentId ? [{ paymentProviderPaymentIntentId: paymentIntentId }] : [])
      ];

      return db.wilmaDocumentPrepOrder?.findFirst({ where: { OR: where } }) ?? null;
    },

    async createOrder({ order }) {
      const db = await loadPrisma();
      const created = await db.wilmaDocumentPrepOrder?.create({ data: order });
      if (!created) {
        throw new Error("Wilma order storage is not available.");
      }
      return created;
    },

    async updateOrderStatus({ orderId, status, documentGenerationJobId, trackerWorkspaceId }) {
      const db = await loadPrisma();
      const updated = await db.wilmaDocumentPrepOrder?.update({
        where: { id: orderId },
        data: {
          status,
          documentGenerationJobId,
          trackerWorkspaceId
        }
      });
      if (!updated) {
        throw new Error("Wilma order storage is not available.");
      }
      return updated;
    },

    async trackWilmaEvent(event) {
      const db = await loadPrisma();
      await db.auditEvent?.create({
        data: {
          actorUserId: event.actorUserId,
          action: event.event,
          targetType: "WilmaSession",
          targetId: event.wilmaSessionId,
          metadata: event
        }
      });
    }
  };
}

async function loadPrisma(): Promise<PrismaLike> {
  const prismaModule = (await import("@/lib/prisma")) as unknown as {
    prisma?: PrismaLike;
    db?: PrismaLike;
    default?: PrismaLike;
  };
  return prismaModule.prisma ?? prismaModule.db ?? prismaModule.default ?? {};
}

function toOrderSession(session: UnknownSession): WilmaOrderSession {
  return {
    id: session.id,
    email: session.leadEmail ?? session.email ?? null,
    facts: isRecord(session.facts) ? session.facts : {},
    decision: isRecord(session.decision) ? session.decision : null
  } as WilmaOrderSession;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
