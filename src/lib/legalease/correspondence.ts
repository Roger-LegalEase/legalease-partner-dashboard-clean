import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type LegalEaseCorrespondencePayload = {
  source: "waitlist" | "contact";
  name: string;
  email: string;
  product?: string;
  productName?: string;
  topic?: string;
  topicLabel?: string;
  organization?: string;
  message?: string;
  route: string;
  userAgent?: string | null;
};

export type LegalEaseCorrespondenceResult =
  | { ok: true; dryRun: boolean; mode: "supabase" | "dry-run" }
  | { ok: false; error: string; mode: "supabase" | "unconfigured" | "dry-run-disabled" };

export async function submitLegalEaseCorrespondence(payload: LegalEaseCorrespondencePayload): Promise<LegalEaseCorrespondenceResult> {
  if (process.env.LEGALEASE_FORMS_DRY_RUN === "true") {
    return { ok: true, dryRun: true, mode: "dry-run" };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "LegalEase OS correspondence queue is not configured.", mode: "unconfigured" };
  }

  const category = payload.source === "waitlist" ? "other" : mapTopicToSupportCategory(payload.topic);
  const message = payload.message ?? `Waitlist request for ${payload.productName ?? payload.product ?? "LegalEase"}.`;
  const { error } = await supabase.from("legalease_os_support_items").insert({
    source: "legalease_umbrella_site",
    channel: "web_support_form",
    type: payload.source === "waitlist" ? "waitlist_request" : "support_request",
    category,
    status: "new",
    priority: "normal",
    email: payload.email,
    message_redacted: redactPiiLikeContent(message),
    original_message_redaction_applied: message !== redactPiiLikeContent(message),
    route_submitted_from: payload.route,
    user_agent: cap(payload.userAgent ?? null, 500),
    metadata_json: {
      name: cap(payload.name, 120),
      product: payload.product,
      product_name: payload.productName,
      topic: payload.topic,
      topic_label: payload.topicLabel,
      organization: cap(payload.organization, 160),
      operational_source: "legalease_os"
    }
  });

  if (error) {
    return { ok: false, error: "Unable to enqueue LegalEase OS correspondence.", mode: "supabase" };
  }

  return { ok: true, dryRun: false, mode: "supabase" };
}

export function redactPiiLikeContent(value: string) {
  return cap(value, 4_000)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, "[redacted-phone]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-ssn]");
}

function mapTopicToSupportCategory(topic?: string) {
  if (topic === "support") return "general_contact";
  if (topic === "partnership") return "other";
  if (topic === "press") return "other";
  return "other";
}

function cap(value: string | null | undefined, length: number) {
  return (value ?? "").replace(/[\r\n\t]/g, " ").trim().slice(0, length);
}
