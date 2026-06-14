import "server-only";

import Stripe from "stripe";
import { logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import {
  reconcilePartnerBillingInvoiceEvent,
  type BillingInvoiceUpdate,
  type BillingReconciliationRow,
  type BillingReconciliationStore,
  type PartnerBillingStatus,
  type StripeInvoiceEventLike
} from "@/lib/partners/billing-reconciliation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripeServerClient, isStripeConfigurationError, stripeClientErrorMessage } from "@/lib/stripe/server";

export const partnerBillingMinAmountCents = 100000;
export const partnerBillingMaxAmountCents = 25000000;
export const partnerBillingCurrency = "usd";

export type PartnerBillingRequest = {
  id: string;
  partnerSlug?: string;
  partnerPilotRequestId?: string;
  contactEmail: string;
  contactName?: string;
  amountCents: number;
  currency: "usd";
  description: string;
  dueDate?: string;
  status: PartnerBillingStatus;
  stripeCustomerId?: string;
  stripeInvoiceId?: string;
  stripeInvoiceUrl?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
};

type PartnerBillingRequestRow = {
  id: string;
  partner_slug: string | null;
  partner_pilot_request_id: string | null;
  contact_email: string;
  contact_name: string | null;
  amount_cents: number;
  currency: string;
  description: string;
  due_date: string | null;
  status: string;
  stripe_customer_id: string | null;
  stripe_invoice_id: string | null;
  stripe_invoice_url: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

export type CreatePartnerBillingInput = {
  partnerSlug?: unknown;
  partnerPilotRequestId?: unknown;
  contactEmail?: unknown;
  contactName?: unknown;
  amountDollars?: unknown;
  amountCents?: unknown;
  description?: unknown;
  dueDate?: unknown;
};

export type PartnerBillingValidationResult =
  | { success: true; data: ValidPartnerBillingInput }
  | { success: false; error: string };

type ValidPartnerBillingInput = {
  partnerSlug?: string;
  partnerPilotRequestId?: string;
  contactEmail: string;
  contactName?: string;
  amountCents: number;
  description: string;
  dueDate?: string;
};

type CreatePartnerInvoiceResult =
  | { success: true; billingRequest: PartnerBillingRequest; invoiceUrl?: string }
  | { success: false; status: number; error: string };

export function validatePartnerBillingInput(input: CreatePartnerBillingInput): PartnerBillingValidationResult {
  const contactEmail = stringValue(input.contactEmail).toLowerCase();
  const contactName = optionalLimitedString(input.contactName, 120);
  const partnerSlug = optionalPartnerSlug(input.partnerSlug);
  const partnerPilotRequestId = optionalUuid(input.partnerPilotRequestId);
  const description = optionalLimitedString(input.description, 500);
  const dueDate = optionalDate(input.dueDate);
  const amountCents = normalizeAmountCents(input.amountCents, input.amountDollars);

  if (!contactEmail || !isValidEmail(contactEmail)) {
    return { success: false, error: "A valid billing contact email is required." };
  }

  if (!description) {
    return { success: false, error: "A short invoice description is required." };
  }

  if (!Number.isInteger(amountCents)) {
    return { success: false, error: "Invoice amount must be a valid USD amount." };
  }

  if (amountCents < partnerBillingMinAmountCents) {
    return { success: false, error: "Invoice amount is below the minimum for partner billing." };
  }

  if (amountCents > partnerBillingMaxAmountCents) {
    return { success: false, error: "Invoice amount exceeds the maximum for partner billing." };
  }

  if (input.dueDate && !dueDate) {
    return { success: false, error: "Due date must be a valid calendar date." };
  }

  return {
    success: true,
    data: {
      ...(partnerSlug ? { partnerSlug } : {}),
      ...(partnerPilotRequestId ? { partnerPilotRequestId } : {}),
      contactEmail,
      ...(contactName ? { contactName } : {}),
      amountCents,
      description,
      ...(dueDate ? { dueDate } : {})
    }
  };
}

export async function listPartnerBillingRequestsForInternalAdmin(): Promise<PartnerBillingRequest[]> {
  const supabase = getBillingSupabaseClient();
  const { data, error } = await supabase
    .from("partner_billing_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    logSecurityError({ event: "partner_billing list failed", route: "/internal/billing", outcome: "db_error" });
    throw new Error("Unable to load partner billing requests.");
  }

  return ((data ?? []) as PartnerBillingRequestRow[]).map(mapBillingRequestRow);
}

export async function createPartnerInvoiceForInternalAdmin(
  input: ValidPartnerBillingInput,
  createdByUserId: string
): Promise<CreatePartnerInvoiceResult> {
  const supabase = getBillingSupabaseClient();
  const { data: inserted, error: insertError } = await supabase
    .from("partner_billing_requests")
    .insert({
      partner_slug: input.partnerSlug ?? null,
      partner_pilot_request_id: input.partnerPilotRequestId ?? null,
      contact_email: input.contactEmail,
      contact_name: input.contactName ?? null,
      amount_cents: input.amountCents,
      currency: partnerBillingCurrency,
      description: input.description,
      due_date: input.dueDate ?? null,
      status: "draft",
      created_by_user_id: createdByUserId
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    logSecurityError({ event: "partner_billing create failed", route: "/internal/billing/create", outcome: "db_insert_error" });
    return { success: false, status: 500, error: "Unable to create billing request." };
  }

  const billingRequest = mapBillingRequestRow(inserted as PartnerBillingRequestRow);

  try {
    const stripe = getStripeServerClient();
    const customerId = await findOrCreateBillingCustomer(stripe, {
      email: input.contactEmail,
      name: input.contactName,
      billingRequestId: billingRequest.id
    });

    await stripe.invoiceItems.create({
      customer: customerId,
      amount: input.amountCents,
      currency: partnerBillingCurrency,
      description: input.description,
      metadata: stripeMetadataForBillingRequest(billingRequest)
    });

    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      ...(input.dueDate ? { due_date: dateToUnixSeconds(input.dueDate) } : { days_until_due: 30 }),
      auto_advance: false,
      metadata: stripeMetadataForBillingRequest(billingRequest)
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    const updated = await updateBillingRequestInvoiceCreated({
      billingRequestId: billingRequest.id,
      stripeCustomerId: customerId,
      stripeInvoiceId: finalizedInvoice.id,
      stripeInvoiceUrl: finalizedInvoice.hosted_invoice_url ?? undefined,
      status: "invoice_created"
    });

    logSecurityInfo({
      event: "partner_billing invoice_created",
      route: "/internal/billing/create",
      outcome: "ok",
      metadata: { billing_request_id: billingRequest.id, has_partner_slug: Boolean(input.partnerSlug), has_pilot_request: Boolean(input.partnerPilotRequestId) }
    });

    return {
      success: true,
      billingRequest: updated,
      invoiceUrl: finalizedInvoice.hosted_invoice_url ?? undefined
    };
  } catch (error) {
    if (isStripeConfigurationError(error)) {
      logSecurityError({ event: "partner_billing stripe_config_failed", route: "/internal/billing/create", outcome: "stripe_config_error", metadata: { env_var: error.envVar } });
      return { success: false, status: 500, error: stripeClientErrorMessage };
    }

    logSecurityError({
      event: "partner_billing invoice_failed",
      route: "/internal/billing/create",
      outcome: "stripe_error",
      metadata: { billing_request_id: billingRequest.id, stripe_error_type: stripeErrorType(error) }
    });

    return { success: false, status: 502, error: "Unable to create Stripe invoice." };
  }
}

export async function reconcileStripeInvoiceEvent(event: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
  return reconcilePartnerBillingInvoiceEvent(event as StripeInvoiceEventLike, createSupabaseBillingReconciliationStore(), {
    info(input) {
      logSecurityInfo({ ...input, route: "/api/stripe/webhook" });
    },
    error(input) {
      logSecurityError({ ...input, route: "/api/stripe/webhook" });
    }
  });
}

function getBillingSupabaseClient() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase service-role client is not configured.");
  }

  return supabase;
}

async function findOrCreateBillingCustomer(
  stripe: Stripe,
  input: { email: string; name?: string; billingRequestId: string }
) {
  const existing = await stripe.customers.list({ email: input.email, limit: 1 });
  const customer = existing.data[0];
  if (customer) {
    return customer.id;
  }

  const created = await stripe.customers.create({
    email: input.email,
    ...(input.name ? { name: input.name } : {}),
    metadata: { partner_billing_request_id: input.billingRequestId }
  });

  return created.id;
}

async function updateBillingRequestInvoiceCreated({
  billingRequestId,
  stripeCustomerId,
  stripeInvoiceId,
  stripeInvoiceUrl,
  status
}: {
  billingRequestId: string;
  stripeCustomerId: string;
  stripeInvoiceId: string;
  stripeInvoiceUrl?: string;
  status: PartnerBillingStatus;
}) {
  const supabase = getBillingSupabaseClient();
  const { data, error } = await supabase
    .from("partner_billing_requests")
    .update({
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_invoice_url: stripeInvoiceUrl ?? null,
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", billingRequestId)
    .select("*")
    .single();

  if (error || !data) {
    logSecurityError({ event: "partner_billing invoice_update_failed", route: "/internal/billing/create", outcome: "db_update_error", metadata: { billing_request_id: billingRequestId } });
    throw new Error("Unable to store Stripe invoice state.");
  }

  return mapBillingRequestRow(data as PartnerBillingRequestRow);
}

async function updateBillingRequestFromInvoice({
  billingRequestId,
  stripeInvoiceId,
  stripeCustomerId,
  stripeInvoiceUrl,
  status,
  paidAt
}: BillingInvoiceUpdate): Promise<BillingReconciliationRow | null> {
  const supabase = getBillingSupabaseClient();
  const { data, error } = await supabase
    .from("partner_billing_requests")
    .update({
      stripe_invoice_id: stripeInvoiceId,
      stripe_customer_id: stripeCustomerId ?? null,
      stripe_invoice_url: stripeInvoiceUrl ?? null,
      status,
      paid_at: status === "paid" ? paidAt ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", billingRequestId)
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return billingReconciliationRow(data as PartnerBillingRequestRow);
}

function createSupabaseBillingReconciliationStore(): BillingReconciliationStore {
  return {
    hasProcessedStripeEvent,
    recordProcessedStripeEvent,
    findBillingRequestById,
    findBillingRequestByStripeInvoiceId,
    updateBillingRequestFromInvoice
  };
}

async function findBillingRequestById(billingRequestId: string): Promise<BillingReconciliationRow | null> {
  const supabase = getBillingSupabaseClient();
  const { data, error } = await supabase
    .from("partner_billing_requests")
    .select("*")
    .eq("id", billingRequestId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return billingReconciliationRow(data as PartnerBillingRequestRow);
}

async function findBillingRequestByStripeInvoiceId(stripeInvoiceId: string): Promise<BillingReconciliationRow | null> {
  const supabase = getBillingSupabaseClient();
  const { data, error } = await supabase
    .from("partner_billing_requests")
    .select("*")
    .eq("stripe_invoice_id", stripeInvoiceId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return billingReconciliationRow(data as PartnerBillingRequestRow);
}

async function hasProcessedStripeEvent(stripeEventId: string) {
  const supabase = getBillingSupabaseClient();
  const { data, error } = await supabase
    .from("processed_stripe_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error) {
    logSecurityWarn({ event: "stripe_event idempotency_check_failed", route: "/api/stripe/webhook", outcome: "db_error", metadata: { stripe_event_id: stripeEventId } });
    return false;
  }

  return Boolean(data);
}

async function recordProcessedStripeEvent(stripeEventId: string, eventType: string, relatedObjectId?: string) {
  const supabase = getBillingSupabaseClient();
  const { error } = await supabase
    .from("processed_stripe_events")
    .insert({
      stripe_event_id: stripeEventId,
      event_type: eventType,
      related_object_id: relatedObjectId ?? null
    });

  if (error && error.code !== "23505") {
    logSecurityError({ event: "stripe_event idempotency_record_failed", route: "/api/stripe/webhook", outcome: "db_error", metadata: { stripe_event_id: stripeEventId, event_type: eventType } });
    throw new Error("Unable to record processed Stripe event.");
  }
}

function stripeMetadataForBillingRequest(billingRequest: PartnerBillingRequest): Stripe.MetadataParam {
  return {
    partner_billing_request_id: billingRequest.id,
    ...(billingRequest.partnerSlug ? { partner_slug: billingRequest.partnerSlug } : {}),
    ...(billingRequest.partnerPilotRequestId ? { partner_pilot_request_id: billingRequest.partnerPilotRequestId } : {})
  };
}

function mapBillingRequestRow(row: PartnerBillingRequestRow): PartnerBillingRequest {
  return {
    id: row.id,
    ...(row.partner_slug ? { partnerSlug: row.partner_slug } : {}),
    ...(row.partner_pilot_request_id ? { partnerPilotRequestId: row.partner_pilot_request_id } : {}),
    contactEmail: row.contact_email,
    ...(row.contact_name ? { contactName: row.contact_name } : {}),
    amountCents: row.amount_cents,
    currency: "usd",
    description: row.description,
    ...(row.due_date ? { dueDate: row.due_date } : {}),
    status: isPartnerBillingStatus(row.status) ? row.status : "draft",
    ...(row.stripe_customer_id ? { stripeCustomerId: row.stripe_customer_id } : {}),
    ...(row.stripe_invoice_id ? { stripeInvoiceId: row.stripe_invoice_id } : {}),
    ...(row.stripe_invoice_url ? { stripeInvoiceUrl: row.stripe_invoice_url } : {}),
    ...(row.created_by_user_id ? { createdByUserId: row.created_by_user_id } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.paid_at ? { paidAt: row.paid_at } : {})
  };
}

function billingReconciliationRow(row: PartnerBillingRequestRow): BillingReconciliationRow {
  return {
    id: row.id,
    status: isPartnerBillingStatus(row.status) ? row.status : "draft",
    ...(row.paid_at ? { paidAt: row.paid_at } : {}),
    ...(row.stripe_invoice_id ? { stripeInvoiceId: row.stripe_invoice_id } : {})
  };
}

function normalizeAmountCents(amountCents: unknown, amountDollars: unknown) {
  if (typeof amountCents === "number" && Number.isInteger(amountCents)) {
    return amountCents;
  }

  if (typeof amountCents === "string" && /^\d+$/.test(amountCents.trim())) {
    return Number(amountCents.trim());
  }

  if (typeof amountDollars !== "string") {
    return Number.NaN;
  }

  const normalized = amountDollars.trim().replace(/[$,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return Number.NaN;
  }

  const [dollars, cents = ""] = normalized.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

function optionalLimitedString(value: unknown, maxLength: number) {
  const normalized = stringValue(value).trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function optionalPartnerSlug(value: unknown) {
  const normalized = optionalLimitedString(value, 80);
  if (!normalized) {
    return undefined;
  }

  return /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/.test(normalized) ? normalized : undefined;
}

function optionalUuid(value: unknown) {
  const normalized = optionalLimitedString(value, 80);
  if (!normalized) {
    return undefined;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : undefined;
}

function optionalDate(value: unknown) {
  const normalized = optionalLimitedString(value, 20);
  if (!normalized) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return undefined;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : normalized;
}

function dateToUnixSeconds(date: string) {
  return Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 1000);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isPartnerBillingStatus(value: string): value is PartnerBillingStatus {
  return value === "draft" || value === "invoice_created" || value === "invoice_sent" || value === "paid" || value === "payment_failed" || value === "voided" || value === "canceled";
}

function stripeErrorType(error: unknown) {
  return error && typeof error === "object" && "type" in error && typeof error.type === "string"
    ? error.type
    : error instanceof Error
      ? error.name
      : "UnknownError";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
