import { describe, expect, it, vi } from "vitest";
import { assertSafeAnalyticsMetadata, isAnalyticsFunnelEvent, trackAnalyticsEvent } from "@/lib/analytics";

describe("analytics funnel events", () => {
  it("allowlists funnel event names", () => {
    expect(isAnalyticsFunnelEvent("chat_started")).toBe(true);
    expect(isAnalyticsFunnelEvent("summary_generated")).toBe(true);
    expect(isAnalyticsFunnelEvent("support_requested")).toBe(true);
    expect(isAnalyticsFunnelEvent("not_real")).toBe(false);
  });

  it("stores analytics events as namespaced audit events", async () => {
    const db = {
      auditEvent: {
        create: vi.fn(async () => ({}))
      }
    };

    await trackAnalyticsEvent(db, {
      event: "refund_requested",
      actorUserId: "user_123",
      actorEmail: "customer@example.com",
      targetType: "ProductOrder",
      targetId: "order_123",
      metadata: { reason: "customer_request" }
    });

    expect(db.auditEvent.create).toHaveBeenCalledWith({
      data: {
        actorUserId: "user_123",
        actorEmail: "customer@example.com",
        action: "analytics.refund_requested",
        targetType: "ProductOrder",
        targetId: "order_123",
        metadata: { reason: "customer_request" }
      }
    });
  });

  it("rejects sensitive analytics metadata keys", async () => {
    expect(() =>
      assertSafeAnalyticsMetadata({
        checkout: { productKey: "record_check" },
        providerPayload: { status: "complete" }
      })
    ).toThrow(/sensitive key/i);
  });
});
