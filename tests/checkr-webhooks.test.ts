import { describe, expect, it, vi } from "vitest";
import {
  compactJson,
  createCheckrSignature,
  processCheckrWebhookEvent,
  verifyCheckrSignature,
  type CheckrWebhookDatabase,
  type CheckrWebhookEvent
} from "@/lib/checkr-webhooks";

function createMockDb(options: { existingEvent?: boolean; candidateCaseId?: string | null } = {}) {
  const db = {
    providerEvent: {
      findUnique: vi.fn(async () => (options.existingEvent ? { id: "event_1" } : null)),
      create: vi.fn(async () => ({ id: "event_1" }))
    },
    providerInvitation: {
      findUnique: vi.fn(async () => ({ id: "invitation_1", caseId: "case_123" })),
      updateMany: vi.fn(async () => ({ count: 1 }))
    },
    providerCandidate: {
      findUnique: vi.fn(async () =>
        options.candidateCaseId === undefined
          ? { id: "provider_candidate_1", caseId: "case_123" }
          : options.candidateCaseId
            ? { id: "provider_candidate_1", caseId: options.candidateCaseId }
            : null
      )
    },
    providerReport: {
      upsert: vi.fn(async () => ({}))
    },
    shieldCase: {
      updateMany: vi.fn(async () => ({ count: 1 }))
    },
    caseNotice: {
      create: vi.fn(async () => ({}))
    }
  };

  return db satisfies CheckrWebhookDatabase;
}

function event(type: CheckrWebhookEvent["type"], object: Record<string, unknown>): CheckrWebhookEvent {
  return {
    id: `evt_${type.replace(".", "_")}`,
    type,
    data: { object }
  };
}

describe("Checkr webhook signatures", () => {
  it("verifies HMAC SHA256 over compact JSON", () => {
    const rawPayload = JSON.stringify(
      {
        id: "evt_123",
        type: "invitation.completed",
        data: { object: { id: "inv_123" } }
      },
      null,
      2
    );
    const signature = createCheckrSignature(compactJson(rawPayload), "checkr_test_key");

    expect(verifyCheckrSignature(rawPayload, signature, "checkr_test_key")).toBe(true);
    expect(verifyCheckrSignature(rawPayload, `sha256=${signature}`, "checkr_test_key")).toBe(true);
    expect(verifyCheckrSignature(rawPayload, signature, "wrong_key")).toBe(false);
  });
});

describe("Checkr webhook processing", () => {
  it("stores redacted ProviderEvent rows and processes invitation.completed", async () => {
    const db = createMockDb();
    const result = await processCheckrWebhookEvent(
      event("invitation.completed", {
        id: "inv_123",
        completed_at: "2026-05-13T12:00:00.000Z",
        ssn: "123-45-6789",
        dob: "1990-01-01",
        driver_license_number: "D1234567"
      }),
      db
    );

    expect(result).toEqual({ processed: true, type: "invitation.completed" });
    expect(db.providerEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerEventId: "checkr:evt_invitation_completed",
          payload: expect.objectContaining({
            data: {
              object: expect.objectContaining({
                ssn: "[REDACTED]",
                dob: "[REDACTED]",
                driver_license_number: "[REDACTED]"
              })
            }
          })
        })
      })
    );
    expect(db.providerInvitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerInvitationId: "inv_123" },
        data: expect.objectContaining({ status: "completed" })
      })
    );
    expect(db.shieldCase.updateMany).toHaveBeenCalledWith({
      where: { id: "case_123" },
      data: { status: "IN_REVIEW" }
    });
  });

  it("handles duplicate events without applying mutations", async () => {
    const db = createMockDb({ existingEvent: true });
    const result = await processCheckrWebhookEvent(
      event("invitation.expired", { id: "inv_123" }),
      db
    );

    expect(result).toEqual({ processed: false, type: "invitation.expired" });
    expect(db.providerEvent.create).not.toHaveBeenCalled();
    expect(db.providerInvitation.updateMany).not.toHaveBeenCalled();
    expect(db.caseNotice.create).not.toHaveBeenCalled();
  });

  it("upserts out-of-order report.completed without assuming candidate mapping exists", async () => {
    const db = createMockDb({ candidateCaseId: null });
    const retrieveReport = vi.fn(async () => ({
      id: "report_123",
      status: "complete",
      result: "clear"
    }));

    await processCheckrWebhookEvent(
      event("report.completed", {
        id: "report_123",
        candidate_id: "cand_missing"
      }),
      db,
      { retrieveReport }
    );

    expect(retrieveReport).toHaveBeenCalledWith("report_123");
    expect(db.providerReport.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerReportId: "report_123" },
        create: expect.objectContaining({
          providerReportId: "report_123",
          caseId: undefined,
          status: "complete",
          result: "clear"
        })
      })
    );
    expect(db.shieldCase.updateMany).not.toHaveBeenCalled();
  });

  it("handles repeated report events safely through upsert", async () => {
    const db = createMockDb();
    const reportEvent = event("report.canceled", {
      id: "report_123",
      candidate_id: "cand_123"
    });

    await processCheckrWebhookEvent(reportEvent, db);
    await processCheckrWebhookEvent({ ...reportEvent, id: "evt_report_canceled_retry" }, db);

    expect(db.providerReport.upsert).toHaveBeenCalledTimes(2);
    expect(db.shieldCase.updateMany).toHaveBeenCalledWith({
      where: { id: "case_123" },
      data: { status: "CLOSED" }
    });
  });
});
