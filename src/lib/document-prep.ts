import type { Prisma } from "@prisma/client";
import { trackAnalyticsEvent } from "@/lib/analytics";

type WilmaSessionForDocumentPrep = {
  id: string;
  userId: string;
  caseId: string | null;
  leadEmail: string | null;
  decisionId: string | null;
  facts: unknown;
  decision: unknown;
};

export type DocumentPrepHandoffDatabase = {
  wilmaChatSession: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        userId: true;
        caseId: true;
        leadEmail: true;
        decisionId: true;
        facts: true;
        decision: true;
      };
    }): Promise<WilmaSessionForDocumentPrep | null>;
    update(args: {
      where: { id: string };
      data: { documentPrepHandoffAt: Date };
    }): Promise<unknown>;
  };
  caseNotice: {
    create(args: {
      data: {
        caseId: string;
        audience: "admin";
        severity: "info";
        title: string;
        message: string;
        metadata: Prisma.InputJsonValue;
      };
    }): Promise<unknown>;
  };
  auditEvent: {
    create(args: {
      data: {
        actorUserId?: string;
        actorEmail?: string;
        action: string;
        targetType: "WilmaDecision";
        targetId: string;
        metadata: Prisma.InputJsonValue;
      };
    }): Promise<unknown>;
  };
};

export async function requestDocumentPrepHandoff(
  db: DocumentPrepHandoffDatabase,
  input: {
    wilmaSessionId: string;
    wilmaDecisionId: string;
    paidAt?: Date;
  }
): Promise<{ requested: boolean; decisionId: string }> {
  const session = await db.wilmaChatSession.findUnique({
    where: { id: input.wilmaSessionId },
    select: {
      id: true,
      userId: true,
      caseId: true,
      leadEmail: true,
      decisionId: true,
      facts: true,
      decision: true
    }
  });

  if (!session || session.decisionId !== input.wilmaDecisionId) {
    return { requested: false, decisionId: input.wilmaDecisionId };
  }

  const metadata = {
    wilmaSessionId: session.id,
    wilmaDecisionId: input.wilmaDecisionId,
    facts: session.facts as Prisma.InputJsonValue,
    decision: session.decision as Prisma.InputJsonValue,
    paidAt: input.paidAt?.toISOString()
  } satisfies Prisma.InputJsonValue;

  await db.auditEvent.create({
    data: {
      actorUserId: session.userId,
      actorEmail: session.leadEmail ?? undefined,
      action: "document_prep.handoff_requested",
      targetType: "WilmaDecision",
      targetId: input.wilmaDecisionId,
      metadata
    }
  });
  await trackAnalyticsEvent(db, {
    event: "document_generated",
    actorUserId: session.userId,
    actorEmail: session.leadEmail ?? undefined,
    targetType: "WilmaDecision",
    targetId: input.wilmaDecisionId,
    metadata
  });

  if (session.caseId) {
    await db.caseNotice.create({
      data: {
        caseId: session.caseId,
        audience: "admin",
        severity: "info",
        title: "Document preparation checkout completed",
        message: "A paid Wilma document-prep handoff is ready for document generation.",
        metadata
      }
    });
  }

  await db.wilmaChatSession.update({
    where: { id: session.id },
    data: { documentPrepHandoffAt: input.paidAt ?? new Date() }
  });

  return { requested: true, decisionId: input.wilmaDecisionId };
}
