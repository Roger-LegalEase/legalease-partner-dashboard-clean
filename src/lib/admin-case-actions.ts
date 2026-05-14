import type { Prisma } from "@prisma/client";
import type { AppUser } from "@/lib/auth";
import { summarizeReport } from "@/lib/report-summary";

type AdminActionDatabase = {
  shieldCase: {
    update(args: { where: { id: string }; data: { status: "ACTION_REQUIRED" | "CLOSED" } }): Promise<{ id: string }>;
    findUnique(args: {
      where: { id: string };
      include: { owner?: boolean; providerReports?: { orderBy: { updatedAt: "desc" }; take: 1 } };
    }): Promise<{
      id: string;
      owner?: { id: string; email: string };
      providerReports?: Array<{ id: string; metadata: unknown; summary: unknown }>;
    } | null>;
  };
  adminCaseNote: {
    create(args: {
      data: { caseId: string; authorUserId?: string; authorEmail?: string; body: string };
    }): Promise<{ id: string }>;
  };
  auditEvent: {
    create(args: { data: AuditEventWrite }): Promise<unknown>;
  };
};

type AuditEventWrite = {
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata: Prisma.InputJsonValue;
};

export function assertAdminUser(user: AppUser): void {
  if (user.role !== "ADMIN") {
    throw new Error("Admin access required.");
  }
}

export async function addSupportNote(input: {
  actor: AppUser;
  caseId: string;
  body: string;
  db: AdminActionDatabase;
}) {
  assertAdminUser(input.actor);
  const note = await input.db.adminCaseNote.create({
    data: {
      caseId: input.caseId,
      authorUserId: input.actor.id,
      authorEmail: input.actor.email,
      body: input.body
    }
  });
  await createAudit(input.db, input.actor, "admin.case.note_added", "AdminCaseNote", note.id, {
    caseId: input.caseId
  });
  return note;
}

export async function escalateCase(input: { actor: AppUser; caseId: string; db: AdminActionDatabase }) {
  assertAdminUser(input.actor);
  const updated = await input.db.shieldCase.update({
    where: { id: input.caseId },
    data: { status: "ACTION_REQUIRED" }
  });
  await createAudit(input.db, input.actor, "admin.case.escalated", "ShieldCase", updated.id, {});
  return updated;
}

export async function closeCase(input: { actor: AppUser; caseId: string; db: AdminActionDatabase }) {
  assertAdminUser(input.actor);
  const updated = await input.db.shieldCase.update({
    where: { id: input.caseId },
    data: { status: "CLOSED" }
  });
  await createAudit(input.db, input.actor, "admin.case.closed", "ShieldCase", updated.id, {});
  return updated;
}

export async function regenerateCaseSummary(input: {
  actor: AppUser;
  caseId: string;
  db: AdminActionDatabase;
}) {
  assertAdminUser(input.actor);
  const shieldCase = await input.db.shieldCase.findUnique({
    where: { id: input.caseId },
    include: {
      owner: true,
      providerReports: { orderBy: { updatedAt: "desc" }, take: 1 }
    }
  });
  const report = shieldCase?.providerReports?.[0];
  if (!shieldCase || !report) {
    throw new Error("No provider report is available for summary regeneration.");
  }
  const summary = await summarizeReport({
    normalizedReport: asRecord(report.metadata),
    expungementReadiness: asRecord(report.summary),
    userState: "unknown",
    providerReportId: report.id
  });
  await createAudit(input.db, input.actor, "admin.case.summary_regenerated", "ProviderReport", report.id, {
    caseId: shieldCase.id,
    confidence: summary.confidence
  });
  return summary;
}

async function createAudit(
  db: AdminActionDatabase,
  actor: AppUser,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Prisma.InputJsonValue
) {
  await db.auditEvent.create({
    data: {
      actorUserId: actor.id,
      actorEmail: actor.email,
      action,
      targetType,
      targetId,
      metadata
    }
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
