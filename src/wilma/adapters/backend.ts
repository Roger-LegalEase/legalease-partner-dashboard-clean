import type { AppUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { currentUser, requireUser } from "@/lib/auth";
import type { Env } from "@/lib/env";
import { env } from "@/lib/env";
import {
  createBillingPortalSession,
  createMonitoringCheckoutSession,
  createRecordCheckCheckoutSession,
  type BillingPortalDatabase,
  type CheckoutStripeClient
} from "@/lib/billing/checkout";
import { isMonitoringPlanKey, type MonitoringPlanKey } from "@/lib/billing/products";
import { prisma } from "@/lib/prisma";
import {
  evaluateWilmaEligibility,
  type WilmaEligibilityInput,
  type WilmaEligibilityResult
} from "@/lib/wilma";
import type { WilmaChatBackend, WilmaChatFacts, WilmaChatSession } from "@/wilma/chat/orchestrator";

export type WilmaBackendCaseStatus = "DRAFT" | "IN_REVIEW" | "ACTION_REQUIRED" | "SUBMITTED" | "CLOSED";

export type WilmaBackendCase = {
  id: string;
  ownerId: string;
  status: WilmaBackendCaseStatus;
  productKey: string;
  displayName: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateWilmaCaseInput = {
  productKey: string;
  displayName: string;
  notes?: string | null;
};

export type UpdateWilmaCaseInput = {
  status?: WilmaBackendCaseStatus;
  displayName?: string;
  notes?: string | null;
};

export type WilmaBackendUserAccount = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  stripeCustomerId: string | null;
};

export type WilmaBackendDatabase = BillingPortalDatabase & {
  user: BillingPortalDatabase["user"] & {
    findUnique(args: {
      where: { email: string };
      select: {
        id: true;
        email: true;
        name: true;
        role: true;
        stripeCustomerId: true;
      };
    }): Promise<WilmaBackendUserAccount | null>;
  };
  shieldCase: {
    create(args: {
      data: {
        ownerId: string;
        productKey: string;
        displayName: string;
        notes?: string | null;
      };
    }): Promise<WilmaBackendCase>;
    findMany(args: {
      where: { ownerId: string };
      orderBy: { createdAt: "desc" };
    }): Promise<WilmaBackendCase[]>;
    findFirst(args: {
      where: { id: string; ownerId: string };
    }): Promise<WilmaBackendCase | null>;
    update(args: {
      where: { id: string };
      data: UpdateWilmaCaseInput;
    }): Promise<WilmaBackendCase>;
  };
};

export type WilmaBackendAdapterDependencies = {
  auth?: {
    currentUser(): Promise<AppUser | null>;
    requireUser(): Promise<AppUser>;
  };
  db?: WilmaBackendDatabase;
  stripeClient?: CheckoutStripeClient;
  configEnv?: Env;
  now?: () => Date;
};

function resolveAuth(dependencies: WilmaBackendAdapterDependencies) {
  return dependencies.auth ?? { currentUser, requireUser };
}

function resolveDb(dependencies: WilmaBackendAdapterDependencies): WilmaBackendDatabase {
  return (dependencies.db ?? prisma) as WilmaBackendDatabase;
}

function checkoutDependencies(dependencies: WilmaBackendAdapterDependencies) {
  return {
    configEnv: dependencies.configEnv ?? env,
    db: resolveDb(dependencies),
    stripeClient: dependencies.stripeClient
  };
}

export async function getBackendCurrentUser(
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<AppUser | null> {
  return resolveAuth(dependencies).currentUser();
}

export async function requireBackendUser(
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<AppUser> {
  return resolveAuth(dependencies).requireUser();
}

export async function getBackendUserAccount(
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<WilmaBackendUserAccount | null> {
  const user = await requireBackendUser(dependencies);

  return resolveDb(dependencies).user.findUnique({
    where: { email: user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      stripeCustomerId: true
    }
  });
}

export async function createBackendCase(
  input: CreateWilmaCaseInput,
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<WilmaBackendCase> {
  const user = await requireBackendUser(dependencies);

  return resolveDb(dependencies).shieldCase.create({
    data: {
      ownerId: user.id,
      productKey: input.productKey,
      displayName: input.displayName,
      notes: input.notes
    }
  });
}

export async function listBackendCases(
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<WilmaBackendCase[]> {
  const user = await requireBackendUser(dependencies);

  return resolveDb(dependencies).shieldCase.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" }
  });
}

export async function getBackendCase(
  caseId: string,
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<WilmaBackendCase | null> {
  const user = await requireBackendUser(dependencies);

  return resolveDb(dependencies).shieldCase.findFirst({
    where: { id: caseId, ownerId: user.id }
  });
}

export async function updateBackendCase(
  caseId: string,
  input: UpdateWilmaCaseInput,
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<WilmaBackendCase | null> {
  const existingCase = await getBackendCase(caseId, dependencies);

  if (!existingCase) {
    return null;
  }

  return resolveDb(dependencies).shieldCase.update({
    where: { id: existingCase.id },
    data: input
  });
}

export function evaluateBackendEligibility(
  input: WilmaEligibilityInput,
  dependencies: WilmaBackendAdapterDependencies = {}
): WilmaEligibilityResult {
  return evaluateWilmaEligibility(input, dependencies.now?.() ?? new Date());
}

export async function createBackendRecordCheckCheckout(
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<{ url: string | null }> {
  const user = await requireBackendUser(dependencies);
  return createRecordCheckCheckoutSession(user, checkoutDependencies(dependencies));
}

export async function createBackendMonitoringCheckout(
  planKey: string,
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<{ url: string | null }> {
  if (!isMonitoringPlanKey(planKey)) {
    throw new Error("Invalid monitoring plan.");
  }

  const user = await requireBackendUser(dependencies);
  return createMonitoringCheckoutSession(
    user,
    planKey as MonitoringPlanKey,
    checkoutDependencies(dependencies)
  );
}

export async function createBackendBillingPortal(
  dependencies: WilmaBackendAdapterDependencies = {}
): Promise<{ url: string | null } | null> {
  const user = await requireBackendUser(dependencies);
  return createBillingPortalSession(user, checkoutDependencies(dependencies));
}

export type WilmaChatPersistenceDatabase = WilmaBackendDatabase & {
  user: WilmaBackendDatabase["user"] & {
    upsert(args: {
      where: { email: string };
      update: {
        leadConsent?: boolean;
        leadConsentAt?: Date;
        leadSource?: string;
      };
      create: {
        id?: string;
        email: string;
        role: "CUSTOMER";
        leadConsent?: boolean;
        leadConsentAt?: Date;
        leadSource?: string;
      };
      select: { id: true; email: true };
    }): Promise<{ id: string; email: string }>;
  };
  wilmaChatSession: {
    findFirst(args: {
      where: { id: string; userId: string };
      select: {
        id: true;
        userId: true;
        leadEmail: true;
        facts: true;
        decision: true;
      };
    }): Promise<WilmaChatSessionRecord | null>;
    create(args: {
      data: {
        userId: string;
        leadEmail?: string | null;
        facts: Prisma.InputJsonValue;
        lastMessageAt: Date;
      };
      select: {
        id: true;
        userId: true;
        leadEmail: true;
        facts: true;
        decision: true;
      };
    }): Promise<WilmaChatSessionRecord>;
    update(args: {
      where: { id: string };
      data: {
        leadEmail?: string | null;
        facts: Prisma.InputJsonValue;
        decision?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
        lastMessageAt: Date;
      };
      select: {
        id: true;
        userId: true;
        leadEmail: true;
        facts: true;
        decision: true;
      };
    }): Promise<WilmaChatSessionRecord>;
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        userId: true;
        leadEmail: true;
        facts: true;
        decision: true;
      };
    }): Promise<WilmaChatSessionRecord | null>;
  };
  wilmaChatMessage: {
    create(args: {
      data: {
        sessionId: string;
        userId: string;
        role: string;
        content: string;
        metadata?: Prisma.InputJsonValue;
      };
    }): Promise<unknown>;
  };
  auditEvent?: {
    create(args: {
      data: {
        actorUserId?: string;
        action: string;
        targetType: string;
        targetId: string;
        metadata: Prisma.InputJsonValue;
      };
    }): Promise<unknown>;
  };
};

type WilmaChatSessionRecord = {
  id: string;
  userId: string;
  leadEmail: string | null;
  facts: Prisma.JsonValue;
  decision: Prisma.JsonValue | null;
};

export function createBackendWilmaChatAdapter(
  dependencies: WilmaBackendAdapterDependencies = {}
): WilmaChatBackend {
  const db = resolveDb(dependencies) as WilmaChatPersistenceDatabase;
  const now = dependencies.now ?? (() => new Date());

  return {
    async loadSession({ sessionId, userId }) {
      const session = await db.wilmaChatSession.findFirst({
        where: { id: sessionId, userId },
        select: {
          id: true,
          userId: true,
          leadEmail: true,
          facts: true,
          decision: true
        }
      });

      return session ? toWilmaChatSession(session) : null;
    },

    async createSession({ userId, email, facts }) {
      const user = await db.user.upsert({
        where: { email: email ?? `${userId}@wilma.local` },
        update: email
          ? {
              leadConsent: false,
              leadSource: "wilma_chat"
            }
          : {},
        create: {
          id: userId,
          email: email ?? `${userId}@wilma.local`,
          role: "CUSTOMER",
          leadConsent: false,
          leadSource: "wilma_chat"
        },
        select: { id: true, email: true }
      });

      const session = await db.wilmaChatSession.create({
        data: {
          userId: user.id,
          leadEmail: email ?? null,
          facts: toJsonObject(facts ?? {}),
          lastMessageAt: now()
        },
        select: {
          id: true,
          userId: true,
          leadEmail: true,
          facts: true,
          decision: true
        }
      });

      return toWilmaChatSession(session);
    },

    async saveMessage({ sessionId, userId, role, content, metadata }) {
      await db.wilmaChatMessage.create({
        data: {
          sessionId,
          userId,
          role,
          content,
          metadata: metadata ? toJsonObject(metadata) : undefined
        }
      });
    },

    async updateSession({ sessionId, userId, email, facts, decision }) {
      const session = await db.wilmaChatSession.update({
        where: { id: sessionId },
        data: {
          leadEmail: email ?? undefined,
          facts: toJsonObject(facts),
          decision: decision ? toJsonObject(decision) : Prisma.JsonNull,
          lastMessageAt: now()
        },
        select: {
          id: true,
          userId: true,
          leadEmail: true,
          facts: true,
          decision: true
        }
      });

      if (session.userId !== userId) {
        throw new Error("Wilma session does not belong to the current user.");
      }

      return toWilmaChatSession(session);
    },

    async captureLead({ sessionId, email, consent }) {
      const existing = await db.wilmaChatSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          userId: true,
          leadEmail: true,
          facts: true,
          decision: true
        }
      });

      if (!existing) {
        throw new Error("Wilma session not found.");
      }

      await db.user.upsert({
        where: { email },
        update: {
          leadConsent: consent,
          leadConsentAt: consent ? now() : undefined,
          leadSource: "wilma_chat"
        },
        create: {
          email,
          role: "CUSTOMER",
          leadConsent: consent,
          leadConsentAt: consent ? now() : undefined,
          leadSource: "wilma_chat"
        },
        select: { id: true, email: true }
      });

      const session = await db.wilmaChatSession.update({
        where: { id: sessionId },
        data: {
          leadEmail: email,
          facts: toJsonObject(toWilmaChatFacts(existing.facts)),
          decision: existing.decision ? toJsonObject(existing.decision as Record<string, unknown>) : Prisma.JsonNull,
          lastMessageAt: now()
        },
        select: {
          id: true,
          userId: true,
          leadEmail: true,
          facts: true,
          decision: true
        }
      });

      return toWilmaChatSession(session);
    },

    async trackWilmaEvent(event) {
      await db.auditEvent?.create({
        data: {
          actorUserId: event.actorUserId,
          action: event.event,
          targetType: "WilmaSession",
          targetId: event.wilmaSessionId,
          metadata: toJsonObject(event)
        }
      });
    },

    async getSessionUsage({ sessionId }) {
      const userMessageCount = await (db.wilmaChatMessage as { count(args: unknown): Promise<number> }).count({
        where: { sessionId, role: "user" }
      });
      const session = await db.wilmaChatSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          userId: true,
          leadEmail: true,
          facts: true,
          decision: true,
          createdAt: true,
          lastMessageAt: true
        }
      } as never);

      return session
        ? {
            userMessageCount,
            createdAt: "createdAt" in session ? (session.createdAt as Date | null) : null,
            lastMessageAt: "lastMessageAt" in session ? (session.lastMessageAt as Date | null) : null
          }
        : null;
    },

    async countSessionsByEmailSince({ email, since }) {
      return (db.wilmaChatSession as { count(args: unknown): Promise<number> }).count({
        where: {
          leadEmail: email,
          createdAt: { gte: since }
        }
      } as never);
    },

    async countChatRequestsByIpSince() {
      return 0;
    }
  };
}

function toWilmaChatSession(record: WilmaChatSessionRecord): WilmaChatSession {
  return {
    id: record.id,
    userId: record.userId,
    email: record.leadEmail,
    facts: toWilmaChatFacts(record.facts),
    decision: typeof record.decision === "object" && record.decision ? record.decision : null
  } as WilmaChatSession;
}

function toWilmaChatFacts(value: Prisma.JsonValue): WilmaChatFacts {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as WilmaChatFacts;
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
