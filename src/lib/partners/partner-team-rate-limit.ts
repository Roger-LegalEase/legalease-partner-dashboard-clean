import "server-only";

import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type PartnerInviteRateLimitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "blocked" | "config_error" | "shared_error";
      error?: Error;
    };

type RateLimitRpcRow = {
  allowed: boolean;
  count: number;
  remaining: number;
  reset_at: string;
};

const partnerInviteRateLimitScope = "partner_team_invite";
const hourSeconds = 60 * 60;
const daySeconds = 24 * hourSeconds;

export const partnerInviteRateLimitPolicy = {
  perPartnerHourly: 10,
  perPartnerDaily: 25,
  perTargetEmailDaily: 3
} as const;

export async function checkPartnerTeamInviteRateLimit(
  supabase: SupabaseClient,
  input: { partnerSlug: string; email: string },
  now = Date.now()
): Promise<PartnerInviteRateLimitResult> {
  try {
    const checks = [
      {
        bucketKey: hashedInviteBucket(["partner", input.partnerSlug, "hour"]),
        windowSeconds: hourSeconds,
        limit: partnerInviteRateLimitPolicy.perPartnerHourly
      },
      {
        bucketKey: hashedInviteBucket(["partner", input.partnerSlug, "day"]),
        windowSeconds: daySeconds,
        limit: partnerInviteRateLimitPolicy.perPartnerDaily
      },
      {
        bucketKey: hashedInviteBucket(["email", input.email.toLowerCase(), "day"]),
        windowSeconds: daySeconds,
        limit: partnerInviteRateLimitPolicy.perTargetEmailDaily
      }
    ];

    for (const check of checks) {
      const result = await incrementBucket(supabase, check, now);
      if (!result.ok) {
        return result;
      }
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: "config_error",
      error: error instanceof Error ? error : new Error("Unable to derive invite rate-limit bucket.")
    };
  }
}

async function incrementBucket(
  supabase: SupabaseClient,
  bucket: { bucketKey: string; windowSeconds: number; limit: number },
  now: number
): Promise<PartnerInviteRateLimitResult> {
  const windowMs = bucket.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();
  const { data, error } = await supabase.rpc("increment_request_rate_limit_bucket", {
    p_scope: partnerInviteRateLimitScope,
    p_bucket_key: bucket.bucketKey,
    p_window_start: windowStart,
    p_window_seconds: bucket.windowSeconds,
    p_limit: bucket.limit
  });

  if (error) {
    return { ok: false, reason: "shared_error", error: new Error(error.message) };
  }

  const row = Array.isArray(data) ? (data[0] as RateLimitRpcRow | undefined) : (data as RateLimitRpcRow | undefined);
  if (!row) {
    return { ok: false, reason: "shared_error", error: new Error("Shared invite rate limiter returned no result.") };
  }

  return row.allowed ? { ok: true } : { ok: false, reason: "blocked" };
}

function hashedInviteBucket(parts: string[]) {
  return createHmac("sha256", getRateLimitHashSecret()).update(parts.join("|")).digest("hex");
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
