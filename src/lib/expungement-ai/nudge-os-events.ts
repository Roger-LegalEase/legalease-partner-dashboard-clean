import "server-only";

import { createHash, createHmac } from "node:crypto";
import type { LegalEaseOsEventConfig } from "@/lib/legalese-os-events";

export type NudgeWindowEventMetrics = {
  window_start: string;
  window_end: string;
  dark_session_count: number;
  touch_1_sent: number;
  touch_2_sent: number;
  return_rate: number;
  touch_2_return_rate: number;
  record_readiness_dark_driver_rate: number;
};

export type NudgeWindowEventPayload = {
  eventType: "screening_nudge_window";
  product: "expungement_ai";
  state: "ALL";
  source: "drop_point_nudge";
  timestamp: string;
  metadata: NudgeWindowEventMetrics;
  idempotency_key: string;
};

export type NudgeWindowEventResult = {
  enabled: boolean;
  sent: boolean;
  skipped_reason?: "disabled" | "missing_endpoint" | "missing_secret" | "send_failed";
  idempotency_key?: string;
  status?: number;
};

export type NudgeWindowEventOptions = {
  configEnv?: LegalEaseOsEventConfig;
  fetcher?: typeof fetch;
  now?: () => Date;
};

export async function emitNudgeWindowEvent(
  metrics: NudgeWindowEventMetrics,
  options: NudgeWindowEventOptions = {}
): Promise<NudgeWindowEventResult> {
  const configEnv = options.configEnv ?? process.env;
  const enabled = configEnv.LEGALEASE_OS_EVENTS_ENABLED === "true";
  const idempotencyKey = nudgeWindowIdempotencyKey(metrics.window_end);

  if (!enabled) {
    return { enabled: false, sent: false, skipped_reason: "disabled", idempotency_key: idempotencyKey };
  }

  if (!configEnv.LEGALEASE_OS_EVENTS_ENDPOINT) {
    return { enabled: true, sent: false, skipped_reason: "missing_endpoint", idempotency_key: idempotencyKey };
  }

  if (!configEnv.LEGALEASE_OS_EVENTS_SECRET) {
    return { enabled: true, sent: false, skipped_reason: "missing_secret", idempotency_key: idempotencyKey };
  }

  try {
    const payload = buildNudgeWindowEventPayload(metrics, {
      idempotencyKey,
      now: options.now
    });
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
    return { enabled: true, sent: false, skipped_reason: "send_failed", idempotency_key: idempotencyKey };
  }
}

export function buildNudgeWindowEventPayload(
  metrics: NudgeWindowEventMetrics,
  options: { idempotencyKey?: string; now?: () => Date } = {}
): NudgeWindowEventPayload {
  return {
    eventType: "screening_nudge_window",
    product: "expungement_ai",
    state: "ALL",
    source: "drop_point_nudge",
    timestamp: (options.now?.() ?? new Date()).toISOString(),
    metadata: {
      window_start: metrics.window_start,
      window_end: metrics.window_end,
      dark_session_count: safeCount(metrics.dark_session_count),
      touch_1_sent: safeCount(metrics.touch_1_sent),
      touch_2_sent: safeCount(metrics.touch_2_sent),
      return_rate: safeRate(metrics.return_rate),
      touch_2_return_rate: safeRate(metrics.touch_2_return_rate),
      record_readiness_dark_driver_rate: safeRate(metrics.record_readiness_dark_driver_rate)
    },
    idempotency_key: options.idempotencyKey ?? nudgeWindowIdempotencyKey(metrics.window_end)
  };
}

function nudgeWindowIdempotencyKey(windowEnd: string) {
  return `leos-${createHash("sha256").update(`screening_nudge_window:${windowEnd}`).digest("hex").slice(0, 32)}`;
}

function safeCount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function safeRate(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
