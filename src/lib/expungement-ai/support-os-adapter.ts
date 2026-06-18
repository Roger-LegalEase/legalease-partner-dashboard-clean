import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type LegalEaseOsSupportCategory =
  | "account_login"
  | "payment_receipt"
  | "packet_download"
  | "briefcase"
  | "wilma"
  | "technical_issue"
  | "general_contact"
  | "other";

export type LegalEaseOsSupportPriority = "normal" | "urgent";

export type CreateLegalEaseOsSupportItemInput = {
  category: string;
  email: string;
  message: string;
  userId?: string;
  briefcaseItemId?: string;
  routeSubmittedFrom: string;
  userAgent?: string;
  legalAdviceWarningAcknowledged?: boolean;
};

export type LegalEaseOsSupportQueuePayload = {
  source: "expungement_ai";
  channel: "web_support_form";
  type: "support_request";
  category: LegalEaseOsSupportCategory;
  status: "new";
  priority: LegalEaseOsSupportPriority;
  user_id: string | null;
  email: string;
  briefcase_item_id: string | null;
  message_redacted: string;
  original_message_redaction_applied: boolean;
  route_submitted_from: string;
  user_agent: string | null;
  metadata_json: {
    product: "Expungement.ai";
    legal_advice_warning_acknowledged: boolean;
    payment_issue: boolean;
    packet_issue: boolean;
    wilma_issue: boolean;
  };
  created_at: string;
};

export type CreateLegalEaseOsSupportItemResult =
  | { ok: true; supportItemId: string; dryRun: false; payload: LegalEaseOsSupportQueuePayload }
  | { ok: true; supportItemId: string; dryRun: true; payload: LegalEaseOsSupportQueuePayload }
  | { ok: false; error: string; payload: LegalEaseOsSupportQueuePayload };

export async function createLegalEaseOsSupportItem(input: CreateLegalEaseOsSupportItemInput): Promise<CreateLegalEaseOsSupportItemResult> {
  const payload = buildSupportQueuePayload(input);
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "LegalEase OS support queue is not configured.", payload };
    }

    return {
      ok: true,
      dryRun: true,
      supportItemId: `support_dry_run_${Date.now().toString(36)}`,
      payload
    };
  }

  const { data, error } = await supabase
    .from("legalease_os_support_items")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "LegalEase OS support queue write failed.", payload };
    }

    return {
      ok: true,
      dryRun: true,
      supportItemId: `support_dry_run_${Date.now().toString(36)}`,
      payload
    };
  }

  return { ok: true, dryRun: false, supportItemId: data.id, payload };
}

export function buildSupportQueuePayload(input: CreateLegalEaseOsSupportItemInput): LegalEaseOsSupportQueuePayload {
  const category = normalizeSupportCategory(input.category);
  const redacted = redactSupportMessage(input.message);
  const now = new Date().toISOString();

  return {
    source: "expungement_ai",
    channel: "web_support_form",
    type: "support_request",
    category,
    status: "new",
    priority: priorityFor(input.message),
    user_id: input.userId ?? null,
    email: input.email,
    briefcase_item_id: input.briefcaseItemId ?? null,
    message_redacted: redacted.messageRedacted,
    original_message_redaction_applied: redacted.redactionApplied,
    route_submitted_from: input.routeSubmittedFrom,
    user_agent: input.userAgent ?? null,
    metadata_json: {
      product: "Expungement.ai",
      legal_advice_warning_acknowledged: input.legalAdviceWarningAcknowledged === true,
      payment_issue: category === "payment_receipt",
      packet_issue: category === "packet_download",
      wilma_issue: category === "wilma"
    },
    created_at: now
  };
}

export function normalizeSupportCategory(category: string): LegalEaseOsSupportCategory {
  if (category === "account_login") return "account_login";
  if (category === "payment_receipt") return "payment_receipt";
  if (category === "packet_download") return "packet_download";
  if (category === "briefcase") return "briefcase";
  if (category === "wilma") return "wilma";
  if (category === "technical_issue") return "technical_issue";
  if (category === "general_contact") return "general_contact";
  if (category === "something_else" || category === "other") return "other";
  return "other";
}

export function redactSupportMessage(input: string) {
  const collapsed = input.replace(/\s+/g, " ").trim().slice(0, 2000);
  let messageRedacted = collapsed
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-ssn]")
    .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, "[redacted-full-dob]")
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[redacted-phone]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Court|Ct\.?|Circle|Cir\.?|Way|Place|Pl\.?)\b/gi, "[redacted-address]");

  messageRedacted = messageRedacted.replace(/[<>]/g, "");

  return {
    messageRedacted,
    redactionApplied: messageRedacted !== collapsed
  };
}

function priorityFor(message: string): LegalEaseOsSupportPriority {
  return /\b(deadline|hearing|court date|tomorrow|today|urgent)\b/i.test(message) ? "urgent" : "normal";
}
