import { createHash } from "node:crypto";
import { deriveWilmaRiskFlags } from "@/wilma/analytics/riskFlags";
import type { WilmaAnalyticsBackend, WilmaAnalyticsEventInput } from "@/wilma/analytics/types";

export async function trackWilmaEvent(
  backend: WilmaAnalyticsBackend,
  input: WilmaAnalyticsEventInput & { actorEmail?: string }
): Promise<void> {
  if (!backend.trackWilmaEvent) {
    return;
  }

  const riskFlags =
    input.riskFlags ??
    deriveWilmaRiskFlags({
      facts: input.facts,
      status: input.decisionStatus,
      reasonCodes: input.reasonCodes,
      event: input.event
    });

  await backend.trackWilmaEvent({
    event: input.event,
    wilmaSessionId: input.wilmaSessionId,
    actorUserId: input.actorUserId,
    leadId: input.leadId,
    emailHash: input.emailHash ?? hashEmail(input.actorEmail),
    state: input.state,
    decisionStatus: input.decisionStatus,
    documentTarget: input.documentTarget,
    ruleVersion: input.ruleVersion,
    reasonCodes: input.reasonCodes,
    orderId: input.orderId,
    checkoutSessionId: input.checkoutSessionId,
    paymentProvider: input.paymentProvider,
    riskFlags,
    metadata: scrubMetadata(input.metadata),
    createdAt: (input.createdAt ?? new Date()).toISOString()
  });
}

export function hashEmail(email: string | null | undefined): string | undefined {
  const normalized = email?.trim().toLowerCase();
  return normalized ? createHash("sha256").update(normalized).digest("hex") : undefined;
}

function scrubMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/email|secret|token|webhook/i.test(key)) {
      continue;
    }
    scrubbed[key] = value;
  }
  return scrubbed;
}
