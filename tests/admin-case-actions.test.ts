import { describe, expect, it, vi } from "vitest";
import { addSupportNote, closeCase, escalateCase } from "@/lib/admin-case-actions";
import type { AppUser } from "@/lib/auth";

const admin: AppUser = { id: "admin_123", email: "admin@example.com", role: "ADMIN" };
const customer: AppUser = { id: "user_123", email: "customer@example.com", role: "CUSTOMER" };

function createDb() {
  return {
    shieldCase: {
      update: vi.fn(async ({ where }) => ({ id: where.id })),
      findUnique: vi.fn(async () => null)
    },
    adminCaseNote: {
      create: vi.fn(async () => ({ id: "note_123" }))
    },
    auditEvent: {
      create: vi.fn(async () => ({}))
    }
  };
}

describe("admin case actions", () => {
  it("rejects non-admin support note actions before writing", async () => {
    const db = createDb();

    await expect(
      addSupportNote({ actor: customer, caseId: "case_123", body: "Follow up", db })
    ).rejects.toThrow(/Admin access required/);

    expect(db.adminCaseNote.create).not.toHaveBeenCalled();
    expect(db.auditEvent.create).not.toHaveBeenCalled();
  });

  it("creates audit events for support notes", async () => {
    const db = createDb();

    await addSupportNote({ actor: admin, caseId: "case_123", body: "Follow up", db });

    expect(db.adminCaseNote.create).toHaveBeenCalledOnce();
    expect(db.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "admin.case.note_added",
          actorUserId: "admin_123",
          targetType: "AdminCaseNote"
        })
      })
    );
  });

  it("requires admin permission for escalation and close actions", async () => {
    const db = createDb();

    await expect(escalateCase({ actor: customer, caseId: "case_123", db })).rejects.toThrow(
      /Admin access required/
    );
    await expect(closeCase({ actor: customer, caseId: "case_123", db })).rejects.toThrow(
      /Admin access required/
    );

    expect(db.shieldCase.update).not.toHaveBeenCalled();
  });

  it("audits escalation and close actions for admins", async () => {
    const db = createDb();

    await escalateCase({ actor: admin, caseId: "case_123", db });
    await closeCase({ actor: admin, caseId: "case_123", db });

    expect(db.shieldCase.update).toHaveBeenCalledWith({
      where: { id: "case_123" },
      data: { status: "ACTION_REQUIRED" }
    });
    expect(db.shieldCase.update).toHaveBeenCalledWith({
      where: { id: "case_123" },
      data: { status: "CLOSED" }
    });
    expect(db.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "admin.case.escalated" })
      })
    );
    expect(db.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "admin.case.closed" })
      })
    );
  });
});
