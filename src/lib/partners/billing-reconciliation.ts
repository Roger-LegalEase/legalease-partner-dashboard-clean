export type PartnerBillingStatus =
  | "draft"
  | "invoice_created"
  | "invoice_sent"
  | "paid"
  | "payment_failed"
  | "voided"
  | "canceled";

export type StripeInvoiceEventLike = {
  id: string;
  type: string;
  data: {
    object: StripeInvoiceLike;
  };
};

export type StripeInvoiceLike = {
  id?: string;
  customer?: string | { id: string } | null;
  hosted_invoice_url?: string | null;
  metadata?: Record<string, string | undefined> | null;
  status_transitions?: {
    paid_at?: number | null;
  } | null;
};

export type BillingReconciliationRow = {
  id: string;
  status: PartnerBillingStatus;
  paidAt?: string;
  stripeInvoiceId?: string;
  updatedAt?: string;
};

export type BillingInvoiceUpdate = {
  billingRequestId: string;
  stripeInvoiceId: string;
  stripeCustomerId?: string;
  stripeInvoiceUrl?: string;
  status: PartnerBillingStatus;
  paidAt?: string;
};

export type BillingReconciliationStore = {
  hasProcessedStripeEvent(stripeEventId: string): Promise<boolean>;
  recordProcessedStripeEvent(stripeEventId: string, eventType: string, relatedObjectId?: string): Promise<void>;
  findBillingRequestById(billingRequestId: string): Promise<BillingReconciliationRow | null>;
  findBillingRequestByStripeInvoiceId(stripeInvoiceId: string): Promise<BillingReconciliationRow | null>;
  updateBillingRequestFromInvoice(update: BillingInvoiceUpdate): Promise<BillingReconciliationRow | null>;
};

export type BillingReconciliationLogger = {
  info(input: { event: string; outcome: string; metadata?: Record<string, string | number | boolean | null | undefined> }): void;
  error(input: { event: string; outcome: string; metadata?: Record<string, string | number | boolean | null | undefined> }): void;
};

export type BillingReconciliationOutcome = "processed" | "duplicate" | "ignored";

export async function reconcilePartnerBillingInvoiceEvent(
  event: StripeInvoiceEventLike,
  store: BillingReconciliationStore,
  logger?: BillingReconciliationLogger
): Promise<BillingReconciliationOutcome> {
  const hasProcessedEvent = await store.hasProcessedStripeEvent(event.id);

  const relatedObjectId = stripeEventObjectId(event.data.object);

  if (!isSupportedInvoiceEvent(event.type)) {
    if (hasProcessedEvent) {
      return "duplicate";
    }

    await store.recordProcessedStripeEvent(event.id, event.type, relatedObjectId);
    return "ignored";
  }

  const invoice = event.data.object;
  const stripeInvoiceId = invoice.id;

  if (!stripeInvoiceId) {
    logger?.error({ event: "stripe_invoice reconciliation failed", outcome: "missing_invoice_id", metadata: { event_type: event.type, stripe_event_id: event.id } });
    throw new Error("Stripe invoice event is missing an invoice ID.");
  }

  const billingRequest = await resolveBillingRequestForInvoice(invoice, store);
  if (!billingRequest) {
    logger?.error({ event: "stripe_invoice reconciliation failed", outcome: "missing_billing_request", metadata: { event_type: event.type, stripe_event_id: event.id } });
    throw new Error("Unable to find billing request for Stripe invoice event.");
  }

  const nextState = stateForInvoiceEvent(event.type, invoice, billingRequest);
  if (hasProcessedEvent) {
    if (isAlreadyCorrectBillingState(billingRequest, nextState)) {
      return "duplicate";
    }

    logger?.info({ event: "stripe_invoice stale_processed_event_repair", outcome: "repairing", metadata: { event_type: event.type, stripe_event_id: event.id } });
  }

  const alreadyCorrect = isAlreadyCorrectBillingState(billingRequest, nextState);
  let reconciled = billingRequest;

  if (!alreadyCorrect) {
    const updated = await store.updateBillingRequestFromInvoice({
      billingRequestId: billingRequest.id,
      stripeInvoiceId,
      stripeCustomerId: stripeObjectId(invoice.customer),
      stripeInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
      status: nextState.status,
      paidAt: nextState.paidAt
    });

    if (!updated) {
      logger?.error({ event: "stripe_invoice reconciliation failed", outcome: "db_write_failed", metadata: { event_type: event.type, stripe_event_id: event.id } });
      throw new Error("Unable to reconcile Stripe invoice event.");
    }

    reconciled = updated;
  }

  if (!isAlreadyCorrectBillingState(reconciled, nextState)) {
    logger?.error({ event: "stripe_invoice reconciliation failed", outcome: "state_mismatch", metadata: { event_type: event.type, stripe_event_id: event.id } });
    throw new Error("Stripe invoice event did not reconcile billing state.");
  }

  if (!hasProcessedEvent) {
    await store.recordProcessedStripeEvent(event.id, event.type, stripeInvoiceId);
  }

  logger?.info({ event: "stripe_invoice reconciled", outcome: "ok", metadata: { event_type: event.type, stripe_event_id: event.id, status: nextState.status } });
  return "processed";
}

export function isSupportedInvoiceEvent(eventType: string) {
  return eventType === "invoice.finalized" || eventType === "invoice.paid" || eventType === "invoice.payment_failed" || eventType === "invoice.voided";
}

function stateForInvoiceEvent(
  eventType: string,
  invoice: StripeInvoiceLike,
  billingRequest: BillingReconciliationRow
): { status: PartnerBillingStatus; paidAt?: string } {
  if (eventType === "invoice.paid") {
    return { status: "paid", paidAt: invoiceStatusTimestamp(invoice) };
  }

  if (eventType === "invoice.payment_failed") {
    return { status: "payment_failed" };
  }

  if (eventType === "invoice.voided") {
    return { status: "voided" };
  }

  if (isTerminalBillingStatus(billingRequest.status)) {
    return { status: billingRequest.status, ...(billingRequest.paidAt ? { paidAt: billingRequest.paidAt } : {}) };
  }

  if (billingRequest.status === "invoice_sent") {
    return { status: "invoice_sent" };
  }

  return { status: "invoice_created" };
}

async function resolveBillingRequestForInvoice(invoice: StripeInvoiceLike, store: BillingReconciliationStore) {
  const metadataBillingRequestId = invoice.metadata?.partner_billing_request_id;
  if (metadataBillingRequestId && isUuid(metadataBillingRequestId)) {
    const byMetadata = await store.findBillingRequestById(metadataBillingRequestId);
    if (byMetadata) {
      return byMetadata;
    }
  }

  if (!invoice.id) {
    return null;
  }

  return store.findBillingRequestByStripeInvoiceId(invoice.id);
}

function isAlreadyCorrectBillingState(
  billingRequest: BillingReconciliationRow,
  expected: { status: PartnerBillingStatus; paidAt?: string }
) {
  if (billingRequest.status !== expected.status) {
    return false;
  }

  if (expected.status === "paid") {
    return Boolean(billingRequest.paidAt);
  }

  return true;
}

function isTerminalBillingStatus(status: PartnerBillingStatus) {
  return status === "paid" || status === "payment_failed" || status === "voided" || status === "canceled";
}

function invoiceStatusTimestamp(invoice: StripeInvoiceLike) {
  const paidAt = invoice.status_transitions?.paid_at;
  return paidAt ? new Date(paidAt * 1000).toISOString() : new Date().toISOString();
}

function stripeObjectId(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return typeof value === "string" ? value : value.id;
}

function stripeEventObjectId(value: StripeInvoiceLike) {
  return value && typeof value === "object" && "id" in value && typeof value.id === "string" ? value.id : undefined;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
