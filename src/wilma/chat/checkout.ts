import type { WilmaChatSession } from "@/wilma/chat/orchestrator";
import type { WilmaServiceFitDecision } from "@/wilma/chat/rules";
import { trackWilmaEvent } from "@/wilma/analytics/trackWilmaEvent";
import type { WilmaAnalyticsBackend } from "@/wilma/analytics/types";

export type WilmaCheckoutMetadata = {
  wilmaSessionId: string;
  leadEmail: string;
  state: string;
  documentTarget: string;
  decisionStatus: string;
  ruleVersion: string;
  reasonCodes: string[];
  product: "wilma_document_prep";
  priceCents: 5000;
};

export type WilmaCheckoutBackend = WilmaAnalyticsBackend & {
  loadCheckoutSession(input: { sessionId: string }): Promise<WilmaChatSession | null>;
  createCheckoutSession(input: {
    sessionId: string;
    email: string;
    metadata: WilmaCheckoutMetadata;
  }): Promise<{ checkoutUrl: string }>;
};

export type WilmaCheckoutBlockedReason =
  | "email_not_captured"
  | "not_likely_eligible"
  | "missing_session"
  | "missing_decision";

export type WilmaCheckoutResult =
  | { ok: true; checkoutUrl: string; sessionId: string; metadata: WilmaCheckoutMetadata }
  | { ok: false; error: "checkout_not_available"; reason: WilmaCheckoutBlockedReason };

export async function createWilmaCheckoutHandoff(
  input: { sessionId?: string },
  dependencies: { backend: WilmaCheckoutBackend }
): Promise<WilmaCheckoutResult> {
  if (!input.sessionId) {
    return blocked("missing_session");
  }

  const session = await dependencies.backend.loadCheckoutSession({ sessionId: input.sessionId });
  if (!session) {
    return blocked("missing_session");
  }

  const decision = session.decision as Partial<WilmaServiceFitDecision> | null | undefined;
  if (!decision) {
    return blocked("missing_decision");
  }

  if (decision.status !== "likely_eligible_for_document_prep" || decision.allowPaidCta !== true) {
    return blocked("not_likely_eligible");
  }

  const email = session.email?.trim().toLowerCase();
  if (!email) {
    return blocked("email_not_captured");
  }

  const metadata: WilmaCheckoutMetadata = {
    wilmaSessionId: session.id,
    leadEmail: email,
    state: session.facts.state ?? "unknown",
    documentTarget: decision.documentTarget ?? "none",
    decisionStatus: decision.status,
    ruleVersion: decision.ruleVersion ?? "unknown",
    reasonCodes: decision.reasonCodes ?? [],
    product: "wilma_document_prep",
    priceCents: 5000
  };
  await trackWilmaEvent(dependencies.backend, {
    event: "wilma_checkout_clicked",
    wilmaSessionId: session.id,
    actorEmail: email,
    state: session.facts.state,
    decisionStatus: decision.status,
    documentTarget: decision.documentTarget,
    ruleVersion: decision.ruleVersion,
    reasonCodes: decision.reasonCodes,
    facts: session.facts,
    metadata
  });
  const checkout = await dependencies.backend.createCheckoutSession({
    sessionId: session.id,
    email,
    metadata
  });
  await trackWilmaEvent(dependencies.backend, {
    event: "wilma_checkout_created",
    wilmaSessionId: session.id,
    actorEmail: email,
    state: session.facts.state,
    decisionStatus: decision.status,
    documentTarget: decision.documentTarget,
    ruleVersion: decision.ruleVersion,
    reasonCodes: decision.reasonCodes,
    facts: session.facts,
    metadata
  });

  return {
    ok: true,
    checkoutUrl: checkout.checkoutUrl,
    sessionId: session.id,
    metadata
  };
}

function blocked(reason: WilmaCheckoutBlockedReason): WilmaCheckoutResult {
  return {
    ok: false,
    error: "checkout_not_available",
    reason
  };
}
