import "server-only";

import { createHash, createHmac } from "node:crypto";
import { sanitizeEventMeta } from "@/lib/analytics/sanitize";
import { logSecurityWarn } from "@/lib/observability/logger";

// Product analytics egress → LegalEase Command Center (`POST /api/events/product`).
//
// This is the ONLY place the shared HMAC secret is used for product events, and it runs server-side
// only so the secret never reaches a browser. Every send is fire-and-forget: the caller must never
// await a result it depends on, and this module never throws.
//
// NOTE ON SHAPE: this is deliberately separate from `src/lib/legalese-os-events.ts`. That module
// speaks the OS-loops dialect (`event_type: "engine.health_changed"`, snake_case, hashed subject
// refs) against `/api/os-loops/events`. The Command Center's product endpoint speaks a different
// dialect (`eventType`, camelCase, `anonymousId`) and rejects the OS-loops shape with a 400. The two
// must not be merged.

const ROUTE = "product-events";

export const PRODUCT_EVENT_TYPES = [
  // Funnel metric events (these move the Today scoreboard).
  "landing_page_viewed",
  "expungement_intake_started",
  "payment_started",
  "payment_completed",
  // Additional supported types.
  "campaign_cta_clicked",
  "recordshield_user_created",
  "recordshield_check_started",
  "recordshield_check_completed",
  "recordshield_result_viewed",
  "cleanup_cta_clicked",
  "packet_generated",
  "packet_completed",
  "petition_filed",
  "outcome_known"
] as const;

export type ProductEventType = (typeof PRODUCT_EVENT_TYPES)[number];

export type ProductEventInput = {
  eventType: ProductEventType;
  /** Opaque + stable. Already hashed by the caller via `hashProductEventIdentity`. */
  anonymousId?: string;
  /** Opaque + stable. The receiver records only WHETHER this was present, never the value. */
  userId?: string;
  /** ISO 8601 of when the event actually happened. Must be identical across retries of one event. */
  timestamp: string;
  campaignSlug?: string;
  partnerId?: string;
  state?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type ProductEventPayload = {
  eventType: ProductEventType;
  product: "expungement_ai";
  anonymousId: string;
  userId?: string;
  timestamp: string;
  campaignSlug: string;
  partnerId: string;
  state: string;
  source: string;
  metadata: Record<string, string | number | boolean>;
};

export type ProductEventConfig = Partial<{
  LEGALEASE_OS_EVENTS_ENABLED: string;
  LEGALEASE_OS_EVENTS_ENDPOINT: string;
  LEGALEASE_OS_EVENTS_SECRET: string;
}>;

export type ProductEventResult = {
  enabled: boolean;
  sent: boolean;
  attempts: number;
  status?: number;
  autoApplied?: boolean;
  skippedReason?: "disabled" | "missing_endpoint" | "missing_secret" | "invalid_event_type" | "send_failed";
};

export type ProductEventOptions = {
  configEnv?: ProductEventConfig;
  fetcher?: typeof fetch;
  now?: () => Date;
  /** Overridable so tests don't sleep. */
  sleep?: (ms: number) => Promise<void>;
};

const REQUEST_TIMEOUT_MS = 3_000;
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [250, 1_000];

/**
 * Emit one product event. Never throws, never blocks a user-facing flow.
 *
 * Callers should invoke as `void emitProductEvent(...)`.
 */
export async function emitProductEvent(
  event: ProductEventInput,
  options: ProductEventOptions = {}
): Promise<ProductEventResult> {
  const configEnv = options.configEnv ?? process.env;

  if (configEnv.LEGALEASE_OS_EVENTS_ENABLED !== "true") {
    return { enabled: false, sent: false, attempts: 0, skippedReason: "disabled" };
  }

  const endpoint = configEnv.LEGALEASE_OS_EVENTS_ENDPOINT?.trim();
  if (!endpoint) {
    return { enabled: true, sent: false, attempts: 0, skippedReason: "missing_endpoint" };
  }

  const secret = configEnv.LEGALEASE_OS_EVENTS_SECRET?.trim();
  if (!secret) {
    return { enabled: true, sent: false, attempts: 0, skippedReason: "missing_secret" };
  }

  if (!isProductEventType(event.eventType)) {
    return { enabled: true, sent: false, attempts: 0, skippedReason: "invalid_event_type" };
  }

  // Serialize ONCE. The signature covers this exact byte sequence, and every retry replays it
  // verbatim so the receiver's identity-based dedupe can never double-count a retried event.
  const body = JSON.stringify(buildProductEventPayload(event));
  const timestamp = String(Math.floor((options.now?.() ?? new Date()).getTime() / 1000));
  const signature = signProductEventBody(timestamp, body, secret);
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? defaultSleep;

  let attempts = 0;
  let lastStatus: number | undefined;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-legalease-os-timestamp": timestamp,
          "x-legalease-os-signature": `sha256=${signature}`
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      lastStatus = response.status;

      if (response.ok) {
        return {
          enabled: true,
          sent: true,
          attempts,
          status: response.status,
          autoApplied: await readAutoApplied(response)
        };
      }

      // 4xx (bad signature, unsupported type) is permanent — retrying cannot help.
      if (!isRetryableStatus(response.status)) {
        break;
      }
    } catch {
      // Network error / timeout. Retryable; never surfaced to the caller.
      lastStatus = undefined;
    }

    if (attempts < MAX_ATTEMPTS) {
      await sleep(RETRY_BACKOFF_MS[attempts - 1] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]!);
    }
  }

  // Status code only. Never the response body (may echo input) and never the secret.
  logSecurityWarn({
    event: "product event emit failed",
    route: ROUTE,
    outcome: "send_failed",
    metadata: { event_type: event.eventType, status: lastStatus ?? "network_error", attempts }
  });

  return { enabled: true, sent: false, attempts, status: lastStatus, skippedReason: "send_failed" };
}

/** Exported for tests + the verifier: the exact payload that gets signed. */
export function buildProductEventPayload(event: ProductEventInput): ProductEventPayload {
  const payload: ProductEventPayload = {
    eventType: event.eventType,
    product: "expungement_ai",
    anonymousId: event.anonymousId ?? "",
    timestamp: event.timestamp,
    campaignSlug: event.campaignSlug ?? "",
    partnerId: event.partnerId ?? "",
    state: event.state ?? "",
    source: event.source ?? "",
    // Key-name redaction + text redaction, same posture as the first-party analytics pipeline.
    metadata: sanitizeEventMeta(event.metadata) ?? {}
  };

  if (event.userId) {
    payload.userId = event.userId;
  }

  return payload;
}

export function signProductEventBody(timestamp: string, body: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/**
 * One-way, stable, opaque. Keeps our first-party visitor/user ids from leaving this system verbatim
 * while preserving the per-user stability the Command Center funnel needs.
 */
export function hashProductEventIdentity(value: string): string {
  return createHash("sha256").update(`legalease-product-event:${value}`).digest("hex").slice(0, 32);
}

export function isProductEventType(value: unknown): value is ProductEventType {
  return typeof value === "string" && (PRODUCT_EVENT_TYPES as readonly string[]).includes(value);
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function readAutoApplied(response: Response): Promise<boolean | undefined> {
  try {
    const parsed = (await response.clone().json()) as { autoApplied?: unknown } | null;
    return typeof parsed?.autoApplied === "boolean" ? parsed.autoApplied : undefined;
  } catch {
    return undefined;
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
