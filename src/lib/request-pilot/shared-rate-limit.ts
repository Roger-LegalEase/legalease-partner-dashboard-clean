import "server-only";

import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pilotRequestRateLimit } from "@/lib/request-pilot/rate-limit";

export const pilotRequestRateLimitScope = "request_pilot";

export type SharedPilotRequestRateLimitResult =
  | {
      ok: true;
      bucketKey: string;
      resetAt: string;
      remaining: number;
    }
  | {
      ok: false;
      reason: "blocked";
      bucketKey: string;
      retryAfterSeconds: number;
    }
  | {
      ok: false;
      reason: "config_error" | "shared_error";
      error: Error;
    };

type RateLimitRpcRow = {
  allowed: boolean;
  count: number;
  remaining: number;
  reset_at: string;
};

export function derivePilotRequestRateLimitBucket(request: Request, now = Date.now()) {
  const windowSeconds = Math.ceil(pilotRequestRateLimit.windowMs / 1000);
  const windowStartMs = Math.floor(now / pilotRequestRateLimit.windowMs) * pilotRequestRateLimit.windowMs;
  const scope = pilotRequestRateLimitScope;
  const fingerprint = [
    scope,
    normalizeClientIp(request),
    coarseUserAgent(request.headers.get("user-agent"))
  ].join("|");

  return {
    scope,
    bucketKey: hashRateLimitFingerprint(fingerprint),
    windowStart: new Date(windowStartMs).toISOString(),
    windowSeconds,
    limit: pilotRequestRateLimit.maxAttempts
  };
}

export async function checkSharedPilotRequestRateLimit(
  supabase: SupabaseClient,
  request: Request,
  now = Date.now()
): Promise<SharedPilotRequestRateLimitResult> {
  let bucket;
  try {
    bucket = derivePilotRequestRateLimitBucket(request, now);
  } catch (error) {
    return {
      ok: false,
      reason: "config_error",
      error: error instanceof Error ? error : new Error("Unable to derive rate-limit bucket.")
    };
  }

  const { data, error } = await supabase.rpc("increment_request_rate_limit_bucket", {
    p_scope: bucket.scope,
    p_bucket_key: bucket.bucketKey,
    p_window_start: bucket.windowStart,
    p_window_seconds: bucket.windowSeconds,
    p_limit: bucket.limit
  });

  if (error) {
    return {
      ok: false,
      reason: "shared_error",
      error: new Error(error.message)
    };
  }

  const row = Array.isArray(data) ? data[0] as RateLimitRpcRow | undefined : data as RateLimitRpcRow | undefined;
  if (!row) {
    return {
      ok: false,
      reason: "shared_error",
      error: new Error("Shared rate limiter returned no result.")
    };
  }

  if (!row.allowed) {
    return {
      ok: false,
      reason: "blocked",
      bucketKey: bucket.bucketKey,
      retryAfterSeconds: retryAfterSeconds(row.reset_at, now)
    };
  }

  return {
    ok: true,
    bucketKey: bucket.bucketKey,
    resetAt: row.reset_at,
    remaining: Math.max(row.remaining ?? 0, 0)
  };
}

export function safeBucketPrefix(bucketKey: string) {
  return bucketKey.slice(0, 10);
}

function hashRateLimitFingerprint(fingerprint: string) {
  const secret = getRateLimitHashSecret();
  return createHmac("sha256", secret).update(fingerprint).digest("hex");
}

function getRateLimitHashSecret() {
  const secret = process.env.RATE_LIMIT_HASH_SECRET;
  if (secret && secret.length >= 24) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_HASH_SECRET is required in production.");
  }

  return "development-only-rate-limit-hash-secret";
}

function normalizeClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return ip.toLowerCase();
}

function coarseUserAgent(value: string | null) {
  const normalized = (value ?? "unknown").toLowerCase();
  if (normalized.includes("mobile")) {
    return "mobile";
  }
  if (normalized.includes("bot") || normalized.includes("crawler")) {
    return "bot";
  }
  if (normalized === "unknown") {
    return "unknown";
  }
  return "browser";
}

function retryAfterSeconds(resetAt: string, now: number) {
  const resetMs = Date.parse(resetAt);
  if (!Number.isFinite(resetMs)) {
    return Math.ceil(pilotRequestRateLimit.windowMs / 1000);
  }

  return Math.max(1, Math.ceil((resetMs - now) / 1000));
}
