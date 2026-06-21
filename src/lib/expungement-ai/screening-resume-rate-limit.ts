import "server-only";

import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitRpcRow = {
  allowed: boolean;
  count: number;
  remaining: number;
  reset_at: string;
};

const localBuckets = new Map<string, Bucket>();

export const resumeRateLimitPolicies = {
  confirmIp: { scope: "expungement_resume_confirm_ip", maxAttempts: 10, windowMs: 10 * 60 * 1000 },
  resendIp: { scope: "expungement_resume_resend_ip", maxAttempts: 5, windowMs: 10 * 60 * 1000 },
  resendEmail: { scope: "expungement_resume_resend_email", maxAttempts: 3, windowMs: 60 * 60 * 1000 }
};

export async function checkResumeRateLimit({
  supabase,
  scope,
  keyParts,
  maxAttempts,
  windowMs,
  now = Date.now()
}: {
  supabase: SupabaseClient | null;
  scope: string;
  keyParts: string[];
  maxAttempts: number;
  windowMs: number;
  now?: number;
}): Promise<RateLimitResult> {
  const bucketKey = hashRateLimitKey([scope, ...keyParts].join("|"));
  const local = checkLocalRateLimit(`${scope}:${bucketKey}`, maxAttempts, windowMs, now);
  if (!local.ok) return local;
  if (!supabase) return { ok: true };

  const windowSeconds = Math.ceil(windowMs / 1000);
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();
  const { data, error } = await supabase.rpc("increment_request_rate_limit_bucket", {
    p_scope: scope,
    p_bucket_key: bucketKey,
    p_window_start: windowStart,
    p_window_seconds: windowSeconds,
    p_limit: maxAttempts
  });

  if (error) return { ok: true };
  const row = Array.isArray(data) ? data[0] as RateLimitRpcRow | undefined : data as RateLimitRpcRow | undefined;
  if (!row?.allowed) {
    return { ok: false, retryAfterSeconds: retryAfterSeconds(row?.reset_at, windowMs, now) };
  }
  return { ok: true };
}

export function resumeClientIp(request: Request) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown").toLowerCase();
}

export function resetResumeRateLimitsForTests() {
  localBuckets.clear();
}

function checkLocalRateLimit(key: string, maxAttempts: number, windowMs: number, now: number): RateLimitResult {
  const bucket = localBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= maxAttempts) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true };
}

function hashRateLimitKey(value: string) {
  return createHmac("sha256", getRateLimitHashSecret()).update(value).digest("hex");
}

function getRateLimitHashSecret() {
  const secret = process.env.RATE_LIMIT_HASH_SECRET;
  if (secret && secret.length >= 24) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("RATE_LIMIT_HASH_SECRET is required in production.");
  return "development-only-rate-limit-hash-secret";
}

function retryAfterSeconds(resetAt: string | undefined, windowMs: number, now: number) {
  const resetMs = resetAt ? Date.parse(resetAt) : NaN;
  return Number.isFinite(resetMs) ? Math.max(1, Math.ceil((resetMs - now) / 1000)) : Math.ceil(windowMs / 1000);
}
