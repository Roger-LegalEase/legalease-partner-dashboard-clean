import "server-only";

import { redactSupportMessage } from "@/lib/expungement-ai/support-os-adapter";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type LaunchOsSourceProduct = "legalease" | "expungement_ai" | "rcap_partner";

export type LaunchOsLoopCategory =
  | "support_triage"
  | "partner_followup"
  | "rcap_intake_review"
  | "payment_exception"
  | "packet_exception"
  | "waitlist_followup";

export type CreateLaunchOsEventInput = {
  sourceProduct: LaunchOsSourceProduct;
  sourceDomain?: string | null;
  sourceRoute: string;
  workflowType: string;
  loopCategory: LaunchOsLoopCategory;
  email?: string | null;
  partnerSlug?: string | null;
  message: string;
  status?: "new" | "in_review" | "waiting_on_customer" | "resolved" | "closed";
  priority?: "normal" | "urgent";
  userAgent?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type CreateLaunchOsEventResult =
  | { ok: true; dryRun: boolean }
  | { ok: false; error: string };

export async function createLaunchOsEvent(input: CreateLaunchOsEventInput): Promise<CreateLaunchOsEventResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "LegalEase OS launch event queue is not configured." };
    }

    return { ok: true, dryRun: true };
  }

  const redacted = redactSupportMessage(input.message);
  const { error } = await supabase.from("legalease_os_support_items").insert({
    source: input.sourceProduct === "expungement_ai" ? "expungement_ai" : "legalease_umbrella_site",
    channel: "web_support_form",
    type: input.sourceProduct === "legalease" && input.loopCategory === "waitlist_followup" ? "waitlist_request" : "support_request",
    category: categoryForLoop(input.loopCategory),
    status: input.status ?? "new",
    priority: input.priority ?? "normal",
    email: normalizeEmail(input.email),
    message_redacted: redacted.messageRedacted,
    original_message_redaction_applied: redacted.redactionApplied,
    route_submitted_from: cap(input.sourceRoute, 240),
    user_agent: cap(input.userAgent, 500) || null,
    metadata_json: {
      source_product: input.sourceProduct,
      source_domain: cap(input.sourceDomain, 120) || null,
      source_route: cap(input.sourceRoute, 240),
      partner_slug: cap(input.partnerSlug, 120) || null,
      workflow_type: cap(input.workflowType, 120),
      loop_category: input.loopCategory,
      open_state: input.status ?? "new",
      operational_source: "legalease_os",
      ...sanitizeMetadata(input.metadata)
    }
  });

  if (error) {
    return { ok: false, error: "Unable to enqueue LegalEase OS launch event." };
  }

  return { ok: true, dryRun: false };
}

export function sourceDomainFromRequest(request: Request) {
  return cap(request.headers.get("x-forwarded-host") ?? request.headers.get("host"), 120) || null;
}

function categoryForLoop(loopCategory: LaunchOsLoopCategory) {
  if (loopCategory === "payment_exception") return "payment_receipt";
  if (loopCategory === "packet_exception") return "packet_download";
  if (loopCategory === "support_triage") return "general_contact";
  return "other";
}

function normalizeEmail(email: string | null | undefined) {
  const normalized = cap(email, 254).toLowerCase();
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "os-event@legalease.law";
}

function sanitizeMetadata(metadata: CreateLaunchOsEventInput["metadata"]) {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (value === undefined) continue;
    sanitized[cap(key, 80)] = typeof value === "string" ? cap(value, 240) : value;
  }
  return sanitized;
}

function cap(value: string | null | undefined, length: number) {
  return (value ?? "").replace(/[\r\n\t]/g, " ").trim().slice(0, length);
}
