import { describe, expect, it, vi } from "vitest";
import {
  buildAdminCaseWhere,
  deriveAdminDisplayState,
  flagManualReview,
  getAdminDashboardOverview,
  resolveManualReview,
  retryCaseSummary,
  shapeAdminCaseRow,
  shouldApplyCaseProgressTransition,
  toAuditTimelineItem,
  toProviderEventView,
  triggerCaseAnonymization
} from "@/lib/admin-ops";
import type { AppUser } from "@/lib/auth";

const admin: AppUser = { id: "admin_123", email: "admin@example.com", role: "ADMIN" };
const customer: AppUser = { id: "user_123", email: "customer@example.com", role: "CUSTOMER" };

function baseDb() {
  return {
    shieldCase: {
      count: vi.fn(async () => 7),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => ({
        id: "case_123",
        displayName: "Record Check",
        status: "IN_REVIEW",
        productKey: "record_check",
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: "user_123", email: "customer@example.com" },
        providerReports: [{ id: "report_row_123", providerReportId: "report_123", status: "complete", summary: { status: "needs_attorney_review" }, metadata: {} }]
      })),
      update: vi.fn(async () => ({ id: "case_123" }))
    },
    providerInvitation: { count: vi.fn(async () => 2) },
    providerReport: { count: vi.fn(async () => 3) },
    reportSummary: { count: vi.fn(async () => 4), upsert: vi.fn(async () => ({})) },
    subscriptionEntitlement: { count: vi.fn(async () => 5), updateMany: vi.fn(async () => ({})) },
    monitoringEnrollment: { count: vi.fn(async () => 6) },
    caseOperationState: {
      count: vi.fn(async () => 1),
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({}))
    },
    auditEvent: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => [
        {
          id: "audit_1",
          actorUserId: "admin_123",
          actorEmail: "admin@example.com",
          action: "admin.case.manual_review_flagged",
          targetType: "ShieldCase",
          targetId: "case_123",
          metadata: { caseId: "case_123" },
          createdAt: new Date("2026-05-13T12:00:00.000Z")
        }
      ]),
      create: vi.fn(async () => ({}))
    },
    providerEvent: { findMany: vi.fn(async () => []) },
    user: { update: vi.fn(async () => ({ id: "user_123", email: "deleted-user_123@deleted.local" })) },
    productOrder: { count: vi.fn(async () => 0), updateMany: vi.fn(async () => ({})) },
    providerCandidate: { updateMany: vi.fn(async () => ({})) },
    wilmaChatSession: { updateMany: vi.fn(async () => ({})) },
    wilmaChatMessage: { updateMany: vi.fn(async () => ({})) },
    adminCaseNote: { updateMany: vi.fn(async () => ({})) }
  };
}

describe("admin operations console helpers", () => {
  it("builds dashboard aggregate counts", async () => {
    const overview = await getAdminDashboardOverview(baseDb());

    expect(overview).toMatchObject({
      totalCases: 7,
      pendingInvitations: 2,
      activeReports: 3,
      completedSummaries: 4,
      activeMonitoring: 5,
      canceledMonitoring: 6,
      anonymizations: 1
    });
    expect(overview.recentAuditEvents[0]).toMatchObject({ actorType: "admin" });
  });

  it("builds case list filters", () => {
    expect(
      buildAdminCaseWhere({
        status: "IN_REVIEW",
        email: "customer@example.com",
        invitationStatus: "created",
        reportStatus: "complete",
        manualReviewNeeded: "true",
        anonymizationStatus: "completed"
      })
    ).toMatchObject({
      status: "IN_REVIEW",
      providerInvitations: { some: { status: "created" } },
      providerReports: { some: { status: "complete" } },
      operationState: { anonymizationStatus: "completed" }
    });
  });

  it("shapes case rows without exposing anonymized email", () => {
    const row = shapeAdminCaseRow({
      id: "case_123",
      displayName: "Record Check",
      status: "IN_REVIEW",
      productKey: "record_check",
      createdAt: new Date(),
      updatedAt: new Date(),
      owner: { id: "user_123", email: "deleted-user_123@deleted.local" },
      operationState: { manualReviewNeeded: false, anonymizationStatus: "completed" },
      providerReports: [{ id: "report_row_123", providerReportId: "report_123", status: "complete", summary: { status: "needs_attorney_review" }, completedAt: new Date() }]
    });

    expect(row.customerLabel).toBe("Anonymized customer");
    expect(row.email).toBeNull();
    expect(row.reportStatus).toBe("Report complete");
    expect(row.expungementReadinessStatus).toBe("Manual review recommended");
  });

  it("prevents stale status regressions while allowing operational transitions", () => {
    expect(shouldApplyCaseProgressTransition("report_complete", "canceled")).toBe(false);
    expect(shouldApplyCaseProgressTransition("report_complete", "needs_review")).toBe(true);
    expect(shouldApplyCaseProgressTransition("report_pending", "report_complete")).toBe(true);
    expect(shouldApplyCaseProgressTransition("suspended", "report_pending")).toBe(false);
  });

  it("displays redacted provider events only", () => {
    const view = toProviderEventView({
      provider: "checkr",
      providerEventId: "evt_123",
      type: "report.completed",
      payload: { data: { object: { id: "report_123", ssn: "123-45-6789", email: "customer@example.com" } } },
      processedAt: new Date(),
      createdAt: new Date()
    });

    expect(JSON.stringify(view.payloadPreview)).not.toContain("123-45-6789");
    expect(JSON.stringify(view.payloadPreview)).not.toContain("customer@example.com");
    expect(view.dedupeStatus).toBe("deduped by providerEventId");
  });

  it("creates audit entries for manual review flag and resolution and denies non-admins", async () => {
    const db = baseDb();

    await expect(flagManualReview({ actor: customer, caseId: "case_123", reason: "Needs review", db })).rejects.toThrow(/Admin/);
    await flagManualReview({ actor: admin, caseId: "case_123", reason: "Needs review", db });
    await resolveManualReview({ actor: admin, caseId: "case_123", resolutionNote: "Reviewed", db });

    expect(db.caseOperationState.upsert).toHaveBeenCalledTimes(2);
    expect(db.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "admin.case.manual_review_flagged" }) }));
    expect(db.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "admin.case.manual_review_resolved" }) }));
  });

  it("records safe retry state for failed summary retry", async () => {
    const db = baseDb();
    const result = await retryCaseSummary({
      actor: admin,
      caseId: "case_123",
      db,
      client: { responses: { create: vi.fn(async () => { throw new Error("OpenAI down"); }) } }
    });

    expect(result).toMatchObject({ ok: false });
    expect(db.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "admin.case.summary_retry_failed" }) }));
  });

  it("triggers anonymization and audits completion", async () => {
    const db = baseDb();

    await triggerCaseAnonymization({ actor: admin, caseId: "case_123", reason: "User request", db });

    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user_123" } }));
    expect(db.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "admin.case.anonymization_requested" }) }));
    expect(db.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "admin.case.anonymization_completed" }) }));
  });

  it("redacts audit timeline metadata", () => {
    const item = toAuditTimelineItem({
      actorEmail: "admin@example.com",
      action: "checkout.record_check.completed",
      metadata: { email: "customer@example.com", ssn: "123-45-6789" },
      createdAt: new Date()
    });

    expect(item.actorType).toBe("admin");
    expect(JSON.stringify(item.metadata)).not.toContain("123-45-6789");
    expect(JSON.stringify(item.metadata)).not.toContain("customer@example.com");
  });

  it("derives manual review display state without changing legal readiness", () => {
    const state = deriveAdminDisplayState({
      id: "case_123",
      displayName: "Record Check",
      status: "IN_REVIEW",
      productKey: "record_check",
      createdAt: new Date(),
      updatedAt: new Date(),
      operationState: { manualReviewNeeded: true, anonymizationStatus: "none" },
      providerReports: [{ id: "report_row_123", providerReportId: "report_123", status: "complete", summary: { status: "possibly_ready" }, completedAt: new Date() }]
    });

    expect(state.caseProgress).toBe("needs_review");
    expect(state.expungementReadinessStatus).toBe("possibly_ready");
  });
});
