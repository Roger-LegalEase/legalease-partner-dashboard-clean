import { describe, expect, it, vi } from "vitest";
import { cancelMonitoringForUser, revokeMonitoringConsent, syncMonitoringForUser } from "@/lib/monitoring";

function createDb() {
  const enrollment = {
    id: "enrollment_123",
    userId: "user_123",
    caseId: "case_123",
    providerCandidateId: "provider_candidate_123",
    providerContinuousCheckId: "cc_123",
    status: "ACTIVE" as const
  };
  return {
    user: {
      findUnique: vi.fn(async () => ({
        id: "user_123",
        email: "customer@example.com",
        monitoringConsent: true
      })),
      update: vi.fn(async () => ({}))
    },
    subscriptionEntitlement: {
      findFirst: vi.fn(async () => ({ id: "entitlement_123" }))
    },
    providerCandidate: {
      findFirst: vi.fn(async () => ({
        id: "provider_candidate_123",
        providerCandidateId: "cand_123",
        userId: "user_123",
        caseId: "case_123"
      }))
    },
    monitoringEnrollment: {
      findFirst: vi.fn(async () => null as typeof enrollment | null),
      create: vi.fn(async () => enrollment),
      update: vi.fn(async ({ data }) => ({ ...enrollment, ...data }))
    },
    auditEvent: {
      create: vi.fn(async () => ({}))
    }
  };
}

describe("monitoring lifecycle", () => {
  it("enrolls active subscribed users with evergreen consent in Checkr Continuous Check", async () => {
    const db = createDb();
    const checkr = {
      createContinuousCheck: vi.fn(async () => ({ id: "cc_123" })),
      cancelContinuousCheck: vi.fn(async () => undefined)
    };

    const result = await syncMonitoringForUser({ userId: "user_123", db, checkr });

    expect(result).toEqual({ enrolled: true, enrollmentId: "enrollment_123" });
    expect(checkr.createContinuousCheck).toHaveBeenCalledWith({
      candidateId: "cand_123",
      type: "criminal"
    });
    expect(db.monitoringEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          consentType: "MONITORING_EVERGREEN",
          providerContinuousCheckId: "cc_123",
          status: "ACTIVE"
        })
      })
    );
    expect(db.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "monitoring.enrolled" })
      })
    );
  });

  it("cancels active monitoring when subscription becomes inactive", async () => {
    const db = createDb();
    db.monitoringEnrollment.findFirst.mockResolvedValueOnce({
      id: "enrollment_123",
      userId: "user_123",
      caseId: "case_123",
      providerCandidateId: "provider_candidate_123",
      providerContinuousCheckId: "cc_123",
      status: "ACTIVE"
    });
    const checkr = {
      createContinuousCheck: vi.fn(async () => ({ id: "unused" })),
      cancelContinuousCheck: vi.fn(async () => undefined)
    };

    const result = await cancelMonitoringForUser({
      userId: "user_123",
      reason: "subscription_inactive",
      db,
      checkr
    });

    expect(result).toEqual({ canceled: true, enrollmentId: "enrollment_123" });
    expect(checkr.cancelContinuousCheck).toHaveBeenCalledWith("cc_123");
    expect(db.monitoringEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "enrollment_123" },
        data: expect.objectContaining({ status: "CANCELED" })
      })
    );
  });

  it("revokes monitoring consent and cancels active Continuous Check", async () => {
    const db = createDb();
    db.monitoringEnrollment.findFirst.mockResolvedValueOnce({
      id: "enrollment_123",
      userId: "user_123",
      caseId: "case_123",
      providerCandidateId: "provider_candidate_123",
      providerContinuousCheckId: "cc_123",
      status: "ACTIVE"
    });
    const checkr = {
      createContinuousCheck: vi.fn(async () => ({ id: "unused" })),
      cancelContinuousCheck: vi.fn(async () => undefined)
    };

    await revokeMonitoringConsent({ userId: "user_123", db, checkr });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: { monitoringConsent: false, monitoringConsentAt: null }
    });
    expect(checkr.cancelContinuousCheck).toHaveBeenCalledWith("cc_123");
    expect(db.monitoringEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REVOKED" })
      })
    );
    expect(db.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "monitoring.consent_revoked" })
      })
    );
  });
});
