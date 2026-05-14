import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { regenerateCaseSummary } from "@/lib/admin-case-actions";
import { processStripeWebhookEvent } from "@/lib/billing/webhooks";
import { processCheckrWebhookEvent, type CheckrWebhookDatabase } from "@/lib/checkr-webhooks";
import { anonymizeUserData } from "@/lib/data-deletion";
import { cancelMonitoringForUser, syncMonitoringForUser } from "@/lib/monitoring";
import { summarizeReportSafely } from "@/lib/report-summary";

function checkoutCompletedEvent(id = "evt_checkout_completed"): Stripe.Event {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_record_123",
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 19_900,
        currency: "usd",
        customer: "cus_123",
        customer_email: "customer@example.com",
        payment_intent: "pi_123",
        metadata: {
          userId: "user_123",
          email: "customer@example.com",
          productKey: "record_check"
        }
      }
    }
  } as unknown as Stripe.Event;
}

function subscriptionEvent(status: Stripe.Subscription.Status, id = `evt_subscription_${status}`): Stripe.Event {
  return {
    id,
    type: status === "canceled" ? "customer.subscription.deleted" : "customer.subscription.updated",
    data: {
      object: {
        id: "sub_123",
        object: "subscription",
        status,
        customer: "cus_123",
        cancel_at_period_end: status === "canceled",
        metadata: {
          userId: "user_123",
          email: "customer@example.com",
          productKey: "monitoring_monthly"
        }
      }
    }
  } as unknown as Stripe.Event;
}

describe("staging E2E service flow", () => {
  it("creates an order, case shell, redacted provider event, and audit on record-check checkout", async () => {
    const db = {
      providerEvent: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: "provider_event_1" }))
      },
      productOrder: {
        upsert: vi.fn(async () => ({})),
        updateMany: vi.fn(async () => ({ count: 0 }))
      },
      subscriptionEntitlement: { upsert: vi.fn(async () => ({})) },
      user: { updateMany: vi.fn(async () => ({})) },
      shieldCase: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: "case_123" }))
      },
      auditEvent: { create: vi.fn(async () => ({})) }
    };

    await expect(processStripeWebhookEvent(checkoutCompletedEvent(), db)).resolves.toEqual({
      processed: true,
      type: "checkout.session.completed"
    });
    await expect(processStripeWebhookEvent(checkoutCompletedEvent(), { ...db, providerEvent: { ...db.providerEvent, findUnique: vi.fn(async () => ({ id: "provider_event_1" })) } })).resolves.toMatchObject({ processed: false });

    expect(db.productOrder.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { stripeCheckoutSessionId: "cs_record_123" } }));
    expect(db.shieldCase.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ productKey: "record_check" }) }));
    expect(db.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "checkout.record_check.completed" }) }));
    expect(db.providerEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({
            data: expect.objectContaining({
              object: expect.objectContaining({ customer_email: "[REDACTED_EMAIL]" })
            })
          })
        })
      })
    );
  });

  it("does not create duplicate Checkr invitations when one already exists", async () => {
    vi.resetModules();
    const createInvitation = vi.fn();
    const prisma = {
      user: { upsert: vi.fn(async () => ({})) },
      shieldCase: {
        findFirst: vi.fn(async () => ({
          id: "case_123",
          productKey: "record_check",
          providerInvitations: [{ invitationUrl: "https://checkr.example/invite", providerInvitationId: "inv_123" }]
        }))
      }
    };
    vi.doMock("@/lib/auth", () => ({ requireUser: async () => ({ id: "user_123", email: "customer@example.com", role: "CUSTOMER" }) }));
    vi.doMock("@/lib/prisma", () => ({ prisma }));
    vi.doMock("@/lib/checkr", () => ({
      createCandidate: vi.fn(),
      createInvitation,
      createLegalEaseCandidateCustomId: () => "legalease_case_case_123"
    }));

    const { POST } = await import("@/app/api/checkr/invitations/route");
    const response = await POST(new Request("http://localhost/api/checkr/invitations", { method: "POST", body: "{}" }));

    await expect(response.json()).resolves.toEqual({
      invitationUrl: "https://checkr.example/invite",
      providerInvitationId: "inv_123"
    });
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("updates Checkr status idempotently and refuses to regress a completed report", async () => {
    const db = {
      providerEvent: {
        findUnique: vi.fn(async ({ where }) => (where.providerEventId === "checkr:evt_duplicate" ? { id: "event_1" } : null)),
        create: vi.fn(async () => ({ id: "event_1" }))
      },
      providerCandidate: {
        findUnique: vi.fn(async () => ({ id: "candidate_1", userId: "user_123", caseId: "case_123" }))
      },
      providerReport: {
        findUnique: vi.fn(async ({ where }) =>
          where.providerReportId === "report_completed" ? { status: "complete", completedAt: new Date() } : null
        ),
        upsert: vi.fn(async () => ({}))
      },
      monitoringAlert: { upsert: vi.fn(async () => ({})) },
      shieldCase: { updateMany: vi.fn(async () => ({ count: 1 })) }
    } satisfies CheckrWebhookDatabase;

    await processCheckrWebhookEvent(
      { id: "evt_report_completed", type: "report.completed", data: { object: { id: "report_123", candidate_id: "cand_123" } } },
      db,
      { retrieveReport: async () => ({ id: "report_123", status: "complete", result: "clear" }) }
    );
    await processCheckrWebhookEvent(
      { id: "evt_duplicate", type: "report.completed", data: { object: { id: "report_123", candidate_id: "cand_123" } } },
      db,
      { retrieveReport: async () => ({ id: "report_123", status: "complete", result: "clear" }) }
    );
    await processCheckrWebhookEvent(
      { id: "evt_old_canceled", type: "report.canceled", data: { object: { id: "report_completed", candidate_id: "cand_123" } } },
      db
    );

    expect(db.providerReport.upsert).toHaveBeenCalledTimes(1);
    expect(db.shieldCase.updateMany).toHaveBeenCalledWith({ where: { id: "case_123" }, data: { status: "IN_REVIEW" } });
  });

  it("persists AI summary success, records safe failure, and allows admin retry", async () => {
    const validOutput = {
      plainEnglishSummary: "The report appears to show one clear result.",
      whatWasFound: ["No reportable records in the provided normalized fields."],
      possibleImpact: ["This may reduce follow-up work."],
      possibleErrors: [],
      expungementReadiness: { status: "insufficient_information" },
      recommendedNextSteps: ["Review with a qualified attorney if unsure."],
      customerQuestions: [],
      disclaimers: ["This is not legal advice.", "Consult a qualified attorney."],
      confidence: "medium"
    };
    const db = { reportSummary: { upsert: vi.fn(async () => ({})) } };

    await expect(
      summarizeReportSafely(
        { normalizedReport: { status: "complete" }, expungementReadiness: { status: "insufficient_information" }, userState: "CA", providerReportId: "report_123" },
        { db, client: { responses: { create: vi.fn(async () => ({ output_text: JSON.stringify(validOutput) })) } } }
      )
    ).resolves.toMatchObject({ ok: true, summary: { confidence: "medium" } });

    await expect(
      summarizeReportSafely(
        { normalizedReport: {}, expungementReadiness: { status: "needs_attorney_review" }, userState: "CA", providerReportId: "report_123" },
        { db, client: { responses: { create: vi.fn(async () => { throw new Error("provider down"); }) } } }
      )
    ).resolves.toMatchObject({ ok: false, failure: { providerReportId: "report_123" } });

    const adminDb = {
      shieldCase: { update: vi.fn(), findUnique: vi.fn(async () => ({ id: "case_123", providerReports: [{ id: "report_123", metadata: {}, summary: { status: "needs_attorney_review" } }] })) },
      adminCaseNote: { create: vi.fn() },
      auditEvent: { create: vi.fn(async () => ({})) }
    };
    await expect(regenerateCaseSummary({ actor: { id: "admin_123", email: "admin@example.com", role: "ADMIN" }, caseId: "case_123", db: adminDb })).resolves.toMatchObject({ confidence: "low" });
  });

  it("activates and cancels monitoring through subscription state and Checkr Continuous Check", async () => {
    const db = {
      user: {
        findUnique: vi.fn(async () => ({ id: "user_123", email: "customer@example.com", monitoringConsent: true })),
        update: vi.fn(async () => ({})),
        updateMany: vi.fn(async () => ({}))
      },
      subscriptionEntitlement: {
        upsert: vi.fn(async () => ({})),
        findFirst: vi.fn(async () => ({ id: "ent_123" }))
      },
      providerCandidate: { findFirst: vi.fn(async () => ({ id: "candidate_1", providerCandidateId: "cand_123", userId: "user_123", caseId: "case_123" })) },
      monitoringEnrollment: {
        findFirst: vi.fn(async ({ where }) =>
          where.status === "ACTIVE"
            ? null
            : {
                id: "enroll_123",
                userId: "user_123",
                caseId: "case_123",
                providerCandidateId: "candidate_1",
                providerContinuousCheckId: "cc_123",
                status: "ACTIVE" as const
              }
        ),
        create: vi.fn(async () => ({
          id: "enroll_123",
          userId: "user_123",
          caseId: "case_123",
          providerCandidateId: "candidate_1",
          providerContinuousCheckId: "cc_123",
          status: "ACTIVE" as const
        })),
        update: vi.fn(async () => ({
          id: "enroll_123",
          userId: "user_123",
          caseId: "case_123",
          providerCandidateId: "candidate_1",
          providerContinuousCheckId: "cc_123",
          status: "CANCELED" as const
        }))
      },
      auditEvent: { create: vi.fn(async () => ({})) },
      providerEvent: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({ id: "event_1" })) },
      productOrder: { upsert: vi.fn(), updateMany: vi.fn() }
    };

    await processStripeWebhookEvent(subscriptionEvent("active"), db);
    await expect(syncMonitoringForUser({ userId: "user_123", db, checkr: { createContinuousCheck: vi.fn(async () => ({ id: "cc_123" })), cancelContinuousCheck: vi.fn() } })).resolves.toMatchObject({ enrolled: true });

    db.monitoringEnrollment.findFirst = vi.fn(async () => ({
      id: "enroll_123",
      userId: "user_123",
      caseId: "case_123",
      providerCandidateId: "candidate_1",
      providerContinuousCheckId: "cc_123",
      status: "ACTIVE" as const
    }));
    await processStripeWebhookEvent(subscriptionEvent("canceled"), { ...db, providerEvent: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({ id: "event_2" })) } });
    await expect(cancelMonitoringForUser({ userId: "user_123", reason: "subscription_inactive", db, checkr: { createContinuousCheck: vi.fn(), cancelContinuousCheck: vi.fn(async () => undefined) } })).resolves.toMatchObject({ canceled: true });
  });

  it("anonymizes a user with related staging journey records", async () => {
    const calls: unknown[] = [];
    const db = {
      user: { update: vi.fn(async (args) => { calls.push(args); return { id: "user_123", email: "deleted-user_123@deleted.local" }; }) },
      productOrder: { updateMany: vi.fn(async (args) => calls.push(args)) },
      subscriptionEntitlement: { updateMany: vi.fn(async (args) => calls.push(args)) },
      providerCandidate: { updateMany: vi.fn(async (args) => calls.push(args)) },
      wilmaChatSession: { updateMany: vi.fn(async (args) => calls.push(args)) },
      wilmaChatMessage: { updateMany: vi.fn(async (args) => calls.push(args)) },
      adminCaseNote: { updateMany: vi.fn(async (args) => calls.push(args)) },
      auditEvent: { create: vi.fn(async (args) => calls.push(args)) }
    };

    await expect(anonymizeUserData({ userId: "user_123", requestedByUserId: "admin_123" }, db)).resolves.toEqual({
      userId: "user_123",
      anonymizedEmail: "deleted-user_123@deleted.local"
    });
    expect(db.providerCandidate.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: "deleted-user_123@deleted.local" }) }));
    expect(db.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "privacy.user_anonymized" }) }));
  });
});
