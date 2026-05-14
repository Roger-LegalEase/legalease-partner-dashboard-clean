import type { Prisma } from "@prisma/client";
import { cancelContinuousCheck, createContinuousCheck } from "@/lib/checkr";

const evergreenConsentType = "MONITORING_EVERGREEN";

type Candidate = {
  id: string;
  providerCandidateId: string;
  userId: string | null;
  caseId: string | null;
};

type Enrollment = {
  id: string;
  userId: string;
  caseId: string | null;
  providerCandidateId: string;
  providerContinuousCheckId: string | null;
  status: "ACTIVE" | "CANCELED" | "REVOKED";
};

export type MonitoringDatabase = {
  user: {
    findUnique(args: {
      where: { id?: string; email?: string };
      select: { id: true; email: true; monitoringConsent: true };
    }): Promise<{ id: string; email: string; monitoringConsent: boolean } | null>;
    update(args: {
      where: { id: string };
      data: { monitoringConsent: boolean; monitoringConsentAt?: Date | null };
    }): Promise<unknown>;
  };
  subscriptionEntitlement: {
    findFirst(args: {
      where: { userId?: string; email?: string; status: "ACTIVE" };
      orderBy?: { updatedAt: "desc" };
    }): Promise<unknown | null>;
  };
  providerCandidate: {
    findFirst(args: {
      where: { userId: string; provider: "checkr" };
      orderBy?: { createdAt: "desc" };
      select: { id: true; providerCandidateId: true; userId: true; caseId: true };
    }): Promise<Candidate | null>;
  };
  monitoringEnrollment: {
    findFirst(args: {
      where: { userId: string; status?: "ACTIVE"; provider: "checkr" };
      orderBy?: { createdAt: "desc" };
    }): Promise<Enrollment | null>;
    create(args: { data: MonitoringEnrollmentCreate }): Promise<Enrollment>;
    update(args: {
      where: { id: string };
      data: Partial<Pick<Enrollment, "status" | "providerContinuousCheckId">> & {
        canceledAt?: Date;
        revokedAt?: Date;
      };
    }): Promise<Enrollment>;
  };
  auditEvent: {
    create(args: { data: AuditEventCreate }): Promise<unknown>;
  };
};

type MonitoringEnrollmentCreate = {
  userId: string;
  caseId?: string;
  providerCandidateId: string;
  status: "ACTIVE";
  consentType: typeof evergreenConsentType;
  provider: "checkr";
  providerContinuousCheckId: string;
};

type AuditEventCreate = {
  actorUserId?: string;
  actorEmail?: string;
  action:
    | "monitoring.enrolled"
    | "monitoring.canceled"
    | "monitoring.consent_revoked";
  targetType: "MonitoringEnrollment";
  targetId?: string;
  metadata: Prisma.InputJsonValue;
};

export type MonitoringCheckrClient = {
  createContinuousCheck(input: { candidateId: string; type: "criminal" }): Promise<{ id: string }>;
  cancelContinuousCheck(continuousCheckId: string): Promise<void>;
};

export async function syncMonitoringForUser(input: {
  userId: string;
  db: MonitoringDatabase;
  checkr?: MonitoringCheckrClient;
}): Promise<{ enrolled: boolean; reason?: string; enrollmentId?: string }> {
  const checkr = input.checkr ?? { createContinuousCheck, cancelContinuousCheck };
  const user = await input.db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, monitoringConsent: true }
  });

  if (!user?.monitoringConsent) {
    return { enrolled: false, reason: "missing_monitoring_consent" };
  }

  const entitlement = await input.db.subscriptionEntitlement.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" }
  });

  if (!entitlement) {
    return { enrolled: false, reason: "missing_active_subscription" };
  }

  const existing = await input.db.monitoringEnrollment.findFirst({
    where: { userId: user.id, status: "ACTIVE", provider: "checkr" },
    orderBy: { createdAt: "desc" }
  });

  if (existing?.providerContinuousCheckId) {
    return { enrolled: true, enrollmentId: existing.id, reason: "already_enrolled" };
  }

  const candidate = await input.db.providerCandidate.findFirst({
    where: { userId: user.id, provider: "checkr" },
    orderBy: { createdAt: "desc" },
    select: { id: true, providerCandidateId: true, userId: true, caseId: true }
  });

  if (!candidate) {
    return { enrolled: false, reason: "missing_checkr_candidate" };
  }

  const continuousCheck = await checkr.createContinuousCheck({
    candidateId: candidate.providerCandidateId,
    type: "criminal"
  });
  const enrollment = await input.db.monitoringEnrollment.create({
    data: {
      userId: user.id,
      caseId: candidate.caseId ?? undefined,
      providerCandidateId: candidate.id,
      status: "ACTIVE",
      consentType: evergreenConsentType,
      provider: "checkr",
      providerContinuousCheckId: continuousCheck.id
    }
  });

  await input.db.auditEvent.create({
    data: {
      actorUserId: user.id,
      actorEmail: user.email,
      action: "monitoring.enrolled",
      targetType: "MonitoringEnrollment",
      targetId: enrollment.id,
      metadata: {
        provider: "checkr",
        providerContinuousCheckId: continuousCheck.id,
        providerCandidateId: candidate.providerCandidateId,
        consentType: evergreenConsentType
      }
    }
  });

  return { enrolled: true, enrollmentId: enrollment.id };
}

export async function cancelMonitoringForUser(input: {
  userId: string;
  reason: "subscription_inactive" | "consent_revoked";
  db: MonitoringDatabase;
  checkr?: MonitoringCheckrClient;
}): Promise<{ canceled: boolean; enrollmentId?: string }> {
  const checkr = input.checkr ?? { createContinuousCheck, cancelContinuousCheck };
  const enrollment = await input.db.monitoringEnrollment.findFirst({
    where: { userId: input.userId, status: "ACTIVE", provider: "checkr" },
    orderBy: { createdAt: "desc" }
  });

  if (!enrollment) {
    return { canceled: false };
  }

  if (enrollment.providerContinuousCheckId) {
    await checkr.cancelContinuousCheck(enrollment.providerContinuousCheckId);
  }

  const status = input.reason === "consent_revoked" ? "REVOKED" : "CANCELED";
  const updated = await input.db.monitoringEnrollment.update({
    where: { id: enrollment.id },
    data:
      status === "REVOKED"
        ? { status, revokedAt: new Date() }
        : { status, canceledAt: new Date() }
  });

  await input.db.auditEvent.create({
    data: {
      actorUserId: enrollment.userId,
      action: input.reason === "consent_revoked" ? "monitoring.consent_revoked" : "monitoring.canceled",
      targetType: "MonitoringEnrollment",
      targetId: updated.id,
      metadata: {
        provider: "checkr",
        providerContinuousCheckId: enrollment.providerContinuousCheckId,
        reason: input.reason
      }
    }
  });

  return { canceled: true, enrollmentId: enrollment.id };
}

export async function revokeMonitoringConsent(input: {
  userId: string;
  db: MonitoringDatabase;
  checkr?: MonitoringCheckrClient;
}) {
  await input.db.user.update({
    where: { id: input.userId },
    data: { monitoringConsent: false, monitoringConsentAt: null }
  });

  return cancelMonitoringForUser({
    userId: input.userId,
    reason: "consent_revoked",
    db: input.db,
    checkr: input.checkr
  });
}
