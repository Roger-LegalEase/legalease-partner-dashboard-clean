import "server-only";

import { createHash, createHmac } from "node:crypto";

export const legalEaseOsEventTypes = [
  "engine.health_changed",
  "packet.qa_failed",
  "packet.qa_passed",
  "packet.generated",
  "packet.readiness_changed",
  "pathway.guidance_only_rate_changed",
  "consumer.screening_started",
  "consumer.screening_completed",
  "consumer.briefcase_saved",
  "consumer.pay_gate_seen",
  "consumer.payment_completed",
  "wilma.safety_flagged",
  "wilma.guard_fired_summary",
  "wilma.kill_switch_changed",
  "source.review_needed",
  "source.freshness_changed"
] as const;

export type LegalEaseOsEventType = (typeof legalEaseOsEventTypes)[number];

export type LegalEaseOsEventInput = {
  source_system?: string;
  event_type: LegalEaseOsEventType;
  occurred_at?: string | Date;
  subject_type?: string;
  subject_ref?: string;
  subject_ref_hash?: string;
  partner_ref?: string;
  partner_ref_hash?: string;
  jurisdiction?: string;
  pathway_key?: string;
  packet_type?: string;
  metrics?: Record<string, unknown>;
  summary?: string;
  recommended_operator_action?: string;
  pii_classification?: string;
  idempotency_key?: string;
} & Record<string, unknown>;

export type LegalEaseOsEventPayload = {
  source_system: string;
  event_type: LegalEaseOsEventType;
  occurred_at: string;
  subject_type?: string;
  subject_ref_hash?: string;
  partner_ref_hash?: string;
  jurisdiction?: string;
  pathway_key?: string;
  packet_type?: string;
  metrics?: Record<string, string | number | boolean | null>;
  summary?: string;
  recommended_operator_action?: string;
  pii_classification?: string;
  idempotency_key: string;
};

export type LegalEaseOsEventConfig = Partial<{
  LEGALEASE_OS_EVENTS_ENABLED: string;
  LEGALEASE_OS_EVENTS_ENDPOINT: string;
  LEGALEASE_OS_EVENTS_SECRET: string;
}>;

export type LegalEaseOsEventResult = {
  enabled: boolean;
  sent: boolean;
  skipped_reason?: "disabled" | "missing_endpoint" | "missing_secret" | "invalid_event" | "send_failed";
  idempotency_key?: string;
  status?: number;
};

export type LegalEaseOsEventOptions = {
  configEnv?: LegalEaseOsEventConfig;
  fetcher?: typeof fetch;
  now?: () => Date;
};

const forbiddenKeyFragments = [
  "name",
  "email",
  "phone",
  "address",
  "dob",
  "dateofbirth",
  "date_of_birth",
  "ssn",
  "socialsecurity",
  "social_security",
  "rawcase",
  "raw_case",
  "rawfacts",
  "raw_facts",
  "facts",
  "criminalhistory",
  "criminal_history",
  "chargesnarrative",
  "charges_narrative",
  "transcript",
  "rawpacket",
  "raw_packet",
  "rawdocument",
  "raw_document",
  "paymentidentifier",
  "payment_identifier",
  "stripe",
  "checkoutsession",
  "checkout_session",
  "paymentintent",
  "payment_intent",
  "providerpayload",
  "provider_payload",
  "token",
  "secret",
  "rawrequest",
  "raw_request",
  "rawresponse",
  "raw_response"
];

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/g;
const phonePattern = /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]\d{3}[-.\s]\d{4}\b/g;
const dobLikePattern = /\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b/g;
const providerIdPattern = /\b(?:pi|cs|cus|sub|evt|ch|tok|sk|whsec)_(?:test|live)?[A-Za-z0-9_]+\b/g;

export async function emitLegalEaseOsEvent(
  event: LegalEaseOsEventInput,
  options: LegalEaseOsEventOptions = {}
): Promise<LegalEaseOsEventResult> {
  const configEnv = options.configEnv ?? process.env;
  const enabled = configEnv.LEGALEASE_OS_EVENTS_ENABLED === "true";

  if (!enabled) {
    return { enabled: false, sent: false, skipped_reason: "disabled" };
  }

  if (!configEnv.LEGALEASE_OS_EVENTS_ENDPOINT) {
    return { enabled: true, sent: false, skipped_reason: "missing_endpoint" };
  }

  if (!configEnv.LEGALEASE_OS_EVENTS_SECRET) {
    return { enabled: true, sent: false, skipped_reason: "missing_secret" };
  }

  try {
    const payload = normalizeLegalEaseOsEventPayload(event, { now: options.now });
    const body = JSON.stringify(payload);
    const timestamp = (options.now?.() ?? new Date()).toISOString();
    const signature = createHmac("sha256", configEnv.LEGALEASE_OS_EVENTS_SECRET)
      .update(`${timestamp}.${body}`)
      .digest("hex");
    const response = await (options.fetcher ?? fetch)(configEnv.LEGALEASE_OS_EVENTS_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-legalease-os-timestamp": timestamp,
        "x-legalease-os-signature": `sha256=${signature}`,
        "x-idempotency-key": payload.idempotency_key
      },
      body
    });

    return {
      enabled: true,
      sent: response.ok,
      skipped_reason: response.ok ? undefined : "send_failed",
      idempotency_key: payload.idempotency_key,
      status: response.status
    };
  } catch {
    return { enabled: true, sent: false, skipped_reason: "send_failed" };
  }
}

export function normalizeLegalEaseOsEventPayload(
  event: LegalEaseOsEventInput,
  options: { now?: () => Date } = {}
): LegalEaseOsEventPayload {
  if (!isLegalEaseOsEventType(event.event_type)) {
    throw new Error("Unsupported LegalEase OS event type.");
  }

  const occurredAt = normalizeTimestamp(event.occurred_at, options);
  const payloadWithoutIdempotency: Omit<LegalEaseOsEventPayload, "idempotency_key"> = compact({
    source_system: safeIdentifier(event.source_system) ?? "expungement_ai",
    event_type: event.event_type,
    occurred_at: occurredAt,
    subject_type: safeIdentifier(event.subject_type),
    subject_ref_hash: normalizeHash(event.subject_ref_hash) ?? hashOptionalReference(event.subject_ref),
    partner_ref_hash: normalizeHash(event.partner_ref_hash) ?? hashOptionalReference(event.partner_ref),
    jurisdiction: safeIdentifier(event.jurisdiction)?.toUpperCase(),
    pathway_key: safeIdentifier(event.pathway_key),
    packet_type: safeIdentifier(event.packet_type),
    metrics: sanitizeMetrics(event.metrics),
    summary: sanitizeText(event.summary),
    recommended_operator_action: sanitizeText(event.recommended_operator_action),
    pii_classification: safeIdentifier(event.pii_classification) ?? "none"
  });

  return {
    ...payloadWithoutIdempotency,
    idempotency_key: safeIdempotencyKey(event.idempotency_key) ?? deterministicIdempotencyKey(payloadWithoutIdempotency)
  };
}

export function hashLegalEaseOsReference(value: string): string {
  return createHash("sha256").update(value.trim()).digest("hex");
}

function isLegalEaseOsEventType(value: unknown): value is LegalEaseOsEventType {
  return typeof value === "string" && (legalEaseOsEventTypes as readonly string[]).includes(value);
}

function hashOptionalReference(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? hashLegalEaseOsReference(value) : undefined;
}

function deterministicIdempotencyKey(payload: Omit<LegalEaseOsEventPayload, "idempotency_key">): string {
  return `leos-${hashLegalEaseOsReference(stableJson(payload)).slice(0, 32)}`;
}

function safeIdempotencyKey(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const trimmed = value.trim();
  return containsForbiddenText(trimmed) ? undefined : safeIdentifier(trimmed, 160);
}

function normalizeTimestamp(value: string | Date | undefined, options: { now?: () => Date }): string {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : options.now?.() ?? new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString() : (options.now?.() ?? new Date()).toISOString();
}

function normalizeHash(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : undefined;
}

function safeIdentifier(value: unknown, maxLength = 96): string | undefined {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return undefined;
  }
  const cleaned = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, maxLength);
  return cleaned && !containsForbiddenText(cleaned) ? cleaned : undefined;
}

function sanitizeMetrics(metrics: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> | undefined {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return undefined;
  }
  const safe: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(metrics)) {
    const safeKey = safeIdentifier(key, 64);
    if (!safeKey || isForbiddenKey(key)) {
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      safe[safeKey] = value;
    } else if (typeof value === "boolean" || value === null) {
      safe[safeKey] = value;
    } else if (typeof value === "string") {
      const text = sanitizeText(value, 160);
      if (text) {
        safe[safeKey] = text;
      }
    }
  }

  return Object.keys(safe).length > 0 ? safe : undefined;
}

function sanitizeText(value: unknown, maxLength = 600): string | undefined {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return undefined;
  }
  const text = String(value)
    .replace(emailPattern, "[redacted_email]")
    .replace(phonePattern, "[redacted_phone]")
    .replace(ssnPattern, "[redacted_ssn]")
    .replace(dobLikePattern, "[redacted_date]")
    .replace(providerIdPattern, "[redacted_provider_id]")
    .trim()
    .slice(0, maxLength);
  return text || undefined;
}

function containsForbiddenText(value: string): boolean {
  return (
    hasPattern(emailPattern, value) ||
    hasPattern(phonePattern, value) ||
    hasPattern(ssnPattern, value) ||
    hasPattern(dobLikePattern, value) ||
    hasPattern(providerIdPattern, value)
  );
}

function hasPattern(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function isForbiddenKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return forbiddenKeyFragments.some((fragment) => normalized.includes(fragment.replace(/[^a-z0-9]/g, "")));
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined)) as T;
}

function stableJson(value: unknown): string {
  if (!value || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}
