import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redactForStorage } from "@/lib/security/redaction";

type UpdateManyDelegate = {
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<unknown>;
};

export type DataDeletionDatabase = {
  user: {
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string; email: string }>;
  };
  productOrder: UpdateManyDelegate;
  subscriptionEntitlement: UpdateManyDelegate;
  providerCandidate: UpdateManyDelegate;
  wilmaChatSession: UpdateManyDelegate;
  wilmaChatMessage: UpdateManyDelegate;
  adminCaseNote: UpdateManyDelegate;
  auditEvent: {
    create(args: {
      data: {
        actorUserId?: string;
        actorEmail?: string;
        action: string;
        targetType: string;
        targetId: string;
        metadata: Prisma.InputJsonValue;
      };
    }): Promise<unknown>;
  };
};

export type AnonymizeUserDataInput = {
  userId: string;
  requestedByUserId?: string;
  requestedByEmail?: string;
};

export async function anonymizeUserData(
  input: AnonymizeUserDataInput,
  db: DataDeletionDatabase = prisma as unknown as DataDeletionDatabase
): Promise<{ userId: string; anonymizedEmail: string }> {
  const anonymizedEmail = `deleted-${input.userId}@deleted.local`;

  const user = await db.user.update({
    where: { id: input.userId },
    data: {
      email: anonymizedEmail,
      name: null,
      leadConsent: false,
      leadConsentAt: null,
      leadSource: null,
      monitoringConsent: false,
      monitoringConsentAt: null,
      stripeCustomerId: null
    }
  });

  await db.productOrder.updateMany({
    where: { userId: input.userId },
    data: { userId: null, email: anonymizedEmail, stripeCustomerId: null }
  });

  await db.subscriptionEntitlement.updateMany({
    where: { userId: input.userId },
    data: { userId: null, email: anonymizedEmail, stripeCustomerId: `deleted-${input.userId}` }
  });

  await db.providerCandidate.updateMany({
    where: { userId: input.userId },
    data: { userId: null, email: anonymizedEmail }
  });

  await db.wilmaChatSession.updateMany({
    where: { userId: input.userId },
    data: { leadEmail: null, facts: {}, decision: null }
  });

  await db.wilmaChatMessage.updateMany({
    where: { userId: input.userId },
    data: { content: "[deleted by privacy request]", metadata: redactForStorage({ deleted: true }) }
  });

  await db.adminCaseNote.updateMany({
    where: { authorUserId: input.userId },
    data: { authorUserId: null, authorEmail: anonymizedEmail, body: "[deleted by privacy request]" }
  });

  await db.auditEvent.create({
    data: {
      actorUserId: input.requestedByUserId,
      actorEmail: input.requestedByEmail,
      action: "privacy.user_anonymized",
      targetType: "User",
      targetId: input.userId,
      metadata: redactForStorage({ userId: input.userId, anonymizedEmail: user.email })
    }
  });

  return { userId: input.userId, anonymizedEmail };
}
