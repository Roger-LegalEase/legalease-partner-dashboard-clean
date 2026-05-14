import { describe, expect, it, vi } from "vitest";
import { requestDocumentPrepHandoff } from "@/lib/document-prep";

function createDb() {
  return {
    wilmaChatSession: {
      findUnique: vi.fn(async () => ({
        id: "wilma_session_123",
        userId: "user_123",
        caseId: "case_123",
        leadEmail: "lead@example.com",
        decisionId: "decision_123",
        facts: {
          state: "CA",
          sentenceCompleted: "yes",
          hasOpenCase: "no",
          hasOutstandingBalance: "no"
        },
        decision: {
          id: "decision_123",
          status: "likely_eligible_for_document_prep"
        }
      })),
      update: vi.fn(async () => ({}))
    },
    caseNotice: {
      create: vi.fn(async () => ({}))
    },
    auditEvent: {
      create: vi.fn(async () => ({}))
    }
  };
}

describe("requestDocumentPrepHandoff", () => {
  it("stores a document-prep handoff with structured facts and decision id", async () => {
    const db = createDb();
    const paidAt = new Date("2026-05-13T12:00:00.000Z");

    await expect(
      requestDocumentPrepHandoff(db, {
        wilmaSessionId: "wilma_session_123",
        wilmaDecisionId: "decision_123",
        paidAt
      })
    ).resolves.toEqual({ requested: true, decisionId: "decision_123" });

    expect(db.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "document_prep.handoff_requested",
          targetId: "decision_123",
          metadata: expect.objectContaining({
            wilmaSessionId: "wilma_session_123",
            wilmaDecisionId: "decision_123",
            facts: expect.objectContaining({ state: "CA" })
          })
        })
      })
    );
    expect(db.caseNotice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          caseId: "case_123",
          title: "Document preparation checkout completed"
        })
      })
    );
    expect(db.wilmaChatSession.update).toHaveBeenCalledWith({
      where: { id: "wilma_session_123" },
      data: { documentPrepHandoffAt: paidAt }
    });
  });

  it("ignores mismatched decision ids", async () => {
    const db = createDb();

    await expect(
      requestDocumentPrepHandoff(db, {
        wilmaSessionId: "wilma_session_123",
        wilmaDecisionId: "wrong_decision"
      })
    ).resolves.toEqual({ requested: false, decisionId: "wrong_decision" });
    expect(db.auditEvent.create).not.toHaveBeenCalled();
  });
});
