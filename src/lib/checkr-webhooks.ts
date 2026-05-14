import { createHmac, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { retrieveReport, type CheckrReport } from "@/lib/checkr";
import { redactForStorage } from "@/lib/security/redaction";

export type CheckrWebhookEvent = {
  id: string;
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

export type CheckrWebhookDatabase = {
  providerEvent: {
    findUnique(args: { where: { providerEventId: string } }): Promise<{ id: string } | null>;
    create(args: {
      data: { provider: "checkr"; providerEventId: string; type: string; payload: Prisma.InputJsonValue };
    }): Promise<{ id: string }>;
  };
  providerCandidate: {
    findUnique(args: {
      where: { providerCandidateId: string };
      select: { id: true; userId: true; caseId: true };
    }): Promise<{ id: string; userId?: string | null; caseId: string | null } | null>;
  };
  providerInvitation?: {
    findUnique(args: {
      where: { providerInvitationId: string };
      select?: { id?: true; caseId?: true };
    }): Promise<{ id: string; caseId: string | null } | null>;
    updateMany(args: {
      where: { providerInvitationId: string };
      data: Record<string, unknown>;
    }): Promise<unknown>;
  };
  providerReport: {
    findUnique?(args: {
      where: { providerReportId: string };
      select: { status: true; completedAt: true };
    }): Promise<{ status: string; completedAt: Date | null } | null>;
    upsert(args: {
      where: { providerReportId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<unknown>;
  };
  monitoringAlert?: {
    upsert(args: {
      where: { providerAlertId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<unknown>;
  };
  shieldCase: {
    updateMany(args: { where: { id: string }; data: { status: "IN_REVIEW" | "ACTION_REQUIRED" | "CLOSED" } }): Promise<unknown>;
  };
};

export function compactJson(input: string): string {
  return JSON.stringify(JSON.parse(input));
}

export function createCheckrSignature(compactPayload: string, apiKey: string): string {
  return createHmac("sha256", apiKey).update(compactPayload).digest("hex");
}

export function verifyCheckrSignature(rawPayload: string, signature: string, apiKey: string): boolean {
  let compactPayload: string;
  try {
    compactPayload = compactJson(rawPayload);
  } catch {
    return false;
  }
  const expected = createCheckrSignature(compactPayload, apiKey);
  const received = signature.replace(/^sha256=/, "");
  return expected.length === received.length && timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function parseCheckrWebhookEvent(rawPayload: string): CheckrWebhookEvent {
  return JSON.parse(compactJson(rawPayload)) as CheckrWebhookEvent;
}

export async function processCheckrWebhookEvent(
  event: CheckrWebhookEvent,
  db: CheckrWebhookDatabase,
  dependencies: { retrieveReport?: (reportId: string) => Promise<CheckrReport> } = {}
) {
  const providerEventId = `checkr:${event.id}`;
  const existing = await db.providerEvent.findUnique({ where: { providerEventId } });
  if (existing) {
    return { processed: false, type: event.type };
  }

  await db.providerEvent.create({
    data: {
      provider: "checkr",
      providerEventId,
      type: event.type,
      payload: redactCheckrPayload(event)
    }
  });

  if (event.type === "invitation.completed") {
    await handleInvitation(event, db, "completed");
  } else if (event.type === "invitation.expired") {
    await handleInvitation(event, db, "expired");
  } else if (event.type === "report.completed") {
    await handleReport(event, db, dependencies.retrieveReport ?? retrieveReport, "completed");
  } else if (event.type === "report.suspended") {
    await handleReport(event, db, async (id) => ({ id, status: "suspended" }), "suspended");
  } else if (event.type === "report.canceled") {
    await handleReport(event, db, async (id) => ({ id, status: "canceled" }), "canceled");
  }

  return { processed: true, type: event.type };
}

async function handleInvitation(
  event: CheckrWebhookEvent,
  db: CheckrWebhookDatabase,
  status: "completed" | "expired"
) {
  const object = event.data?.object ?? {};
  const invitationId = readString(object, "id");

  if (!invitationId || !db.providerInvitation) {
    return;
  }

  const invitation = await db.providerInvitation.findUnique({
    where: { providerInvitationId: invitationId },
    select: { id: true, caseId: true }
  });

  await db.providerInvitation.updateMany({
    where: { providerInvitationId: invitationId },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : undefined,
      expiredAt: status === "expired" ? new Date() : undefined
    }
  });

  if (invitation?.caseId && status === "completed") {
    await db.shieldCase.updateMany({
      where: { id: invitation.caseId },
      data: { status: "IN_REVIEW" }
    });
  }
}

async function handleReport(
  event: CheckrWebhookEvent,
  db: CheckrWebhookDatabase,
  reportFetcher: (reportId: string) => Promise<CheckrReport>,
  eventStatus: "completed" | "suspended" | "canceled"
) {
  const object = event.data?.object ?? {};
  const reportId = readString(object, "id");
  if (!reportId) return;
  const report = await reportFetcher(reportId);
  const providerCandidateId = readString(object, "candidate_id");
  const packageKind = readString(object, "package") ?? readString(object, "package_slug");
  const continuousCheckId = readString(object, "continuous_check_id");
  const candidate = providerCandidateId
    ? await db.providerCandidate.findUnique({
        where: { providerCandidateId },
        select: { id: true, userId: true, caseId: true }
      })
    : null;
  const existingReport = await db.providerReport.findUnique?.({
    where: { providerReportId: reportId },
    select: { status: true, completedAt: true }
  });

  if (existingReport?.completedAt && eventStatus !== "completed") {
    return;
  }

  await db.providerReport.upsert({
    where: { providerReportId: reportId },
    create: {
      provider: "checkr",
      providerReportId: reportId,
      providerCandidateId: candidate?.id,
      caseId: candidate?.caseId,
      status: report.status ?? eventStatus,
      result: report.result,
      summary: {},
      metadata: redactCheckrPayload({ reportId, packageKind, continuousCheckId }),
      completedAt: eventStatus === "completed" ? new Date() : undefined,
      suspendedAt: eventStatus === "suspended" ? new Date() : undefined,
      canceledAt: eventStatus === "canceled" ? new Date() : undefined
    },
    update: {
      status: report.status ?? eventStatus,
      result: report.result,
      completedAt: eventStatus === "completed" ? new Date() : undefined,
      suspendedAt: eventStatus === "suspended" ? new Date() : undefined,
      canceledAt: eventStatus === "canceled" ? new Date() : undefined
    }
  });

  if (isContinuousCheckPackage(packageKind, continuousCheckId)) {
    await db.monitoringAlert?.upsert({
      where: { providerAlertId: `checkr:${reportId}` },
      create: {
        userId: candidate?.userId,
        caseId: candidate?.caseId,
        provider: "checkr",
        providerAlertId: `checkr:${reportId}`,
        providerCandidateId,
        providerContinuousCheckId: continuousCheckId,
        reportId,
        alertType: event.type,
        title: "Monitoring report update",
        message: "A Checkr Continuous Check report event was received.",
        metadata: redactCheckrPayload({ packageKind, status: eventStatus, result: report.result })
      },
      update: {
        alertType: event.type,
        message: "A Checkr Continuous Check report event was received.",
        metadata: redactCheckrPayload({ packageKind, status: eventStatus, result: report.result })
      }
    });
  }

  if (candidate?.caseId) {
    const caseStatus =
      eventStatus === "suspended" ? "ACTION_REQUIRED" : eventStatus === "canceled" ? "CLOSED" : "IN_REVIEW";
    await db.shieldCase.updateMany({ where: { id: candidate.caseId }, data: { status: caseStatus } });
  }
}

function isContinuousCheckPackage(packageKind: string | undefined, continuousCheckId: string | undefined): boolean {
  return Boolean(continuousCheckId || packageKind?.includes("continuous_check"));
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

export function redactCheckrPayload(value: unknown): Prisma.InputJsonValue {
  return redactForStorage(value);
}
