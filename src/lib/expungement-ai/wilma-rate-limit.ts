import "server-only";

import crypto from "node:crypto";

// Per-IP rate limiting, per-conversation turn capping, and a global daily spend cap for the
// anonymous Wilma endpoint — backed by Upstash Redis over its REST API (no SDK dependency).
//
// Configuration posture:
//   - Upstash env ABSENT  -> controls are DISABLED (allow / not-exhausted). This lets staging
//     exercise the live model for the adversarial suite before prod limits are wired.
//   - Upstash env PRESENT but the call ERRORS -> we FAIL SAFE for cost: rate checks report
//     "store_unavailable" and the cap reports "unknown", and the route degrades to the
//     deterministic fallback (no model spend) rather than risk an unmetered provider call.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

const PER_MIN = intEnv("WILMA_PUBLIC_RATE_PER_MIN", 5);
const PER_HOUR = intEnv("WILMA_PUBLIC_RATE_PER_HOUR", 30);
const PER_DAY = intEnv("WILMA_PUBLIC_RATE_PER_DAY", 60);
const MAX_TURNS_PER_CONVO = intEnv("WILMA_PUBLIC_MAX_TURNS", 20);
const DAILY_USD_CAP = floatEnv("WILMA_PUBLIC_DAILY_USD_CAP", 50);

// gpt-4o pricing, USD per 1M tokens (env-tunable so pricing can be corrected without a deploy).
// In micro-USD-per-token these constants equal the per-1M dollar figure (see cost math).
const INPUT_USD_PER_1M = floatEnv("WILMA_PUBLIC_INPUT_USD_PER_1M", 2.5);
const OUTPUT_USD_PER_1M = floatEnv("WILMA_PUBLIC_OUTPUT_USD_PER_1M", 10);

export function isRateStoreConfigured(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "0.0.0.0";
  return headers.get("x-real-ip")?.trim() || "0.0.0.0";
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`wilma-pub:${ip}`).digest("hex").slice(0, 24);
}

// Micro-USD cost of a request given token usage. Per-token micro-USD = per-1M-token USD.
export function requestCostMicroUsd(usage: { inputTokens: number; outputTokens: number }): number {
  return Math.ceil(usage.inputTokens * INPUT_USD_PER_1M + usage.outputTokens * OUTPUT_USD_PER_1M);
}

export type RateDecision =
  | { kind: "allow" }
  | { kind: "rate_limited"; retryAfterSeconds: number; scope: "minute" | "hour" | "day" }
  | { kind: "turns_exceeded" }
  | { kind: "store_unavailable" };

export async function consumePublicRateLimit(ipHash: string, conversationId?: string): Promise<RateDecision> {
  if (!isRateStoreConfigured()) return { kind: "allow" };
  const now = Math.floor(Date.now() / 1000);
  const minBucket = Math.floor(now / 60);
  const hourBucket = Math.floor(now / 3600);
  const dayBucket = Math.floor(now / 86400);

  const commands: string[][] = [
    ["INCR", `wilma:pub:rl:${ipHash}:m:${minBucket}`],
    ["EXPIRE", `wilma:pub:rl:${ipHash}:m:${minBucket}`, "60", "NX"],
    ["INCR", `wilma:pub:rl:${ipHash}:h:${hourBucket}`],
    ["EXPIRE", `wilma:pub:rl:${ipHash}:h:${hourBucket}`, "3600", "NX"],
    ["INCR", `wilma:pub:rl:${ipHash}:d:${dayBucket}`],
    ["EXPIRE", `wilma:pub:rl:${ipHash}:d:${dayBucket}`, "86400", "NX"]
  ];
  if (conversationId) {
    commands.push(["INCR", `wilma:pub:conv:${conversationId}`]);
    commands.push(["EXPIRE", `wilma:pub:conv:${conversationId}`, "86400", "NX"]);
  }

  const results = await redisPipeline(commands);
  if (!results) return { kind: "store_unavailable" };

  const minCount = numberAt(results, 0);
  const hourCount = numberAt(results, 2);
  const dayCount = numberAt(results, 4);
  const convCount = conversationId ? numberAt(results, 6) : 0;

  if (minCount > PER_MIN) return { kind: "rate_limited", retryAfterSeconds: 60 - (now % 60), scope: "minute" };
  if (hourCount > PER_HOUR) return { kind: "rate_limited", retryAfterSeconds: 3600 - (now % 3600), scope: "hour" };
  if (dayCount > PER_DAY) return { kind: "rate_limited", retryAfterSeconds: 86400 - (now % 86400), scope: "day" };
  if (conversationId && convCount > MAX_TURNS_PER_CONVO) return { kind: "turns_exceeded" };
  return { kind: "allow" };
}

// Returns true if the global daily model spend cap is reached, "unknown" if the store is
// configured but unreachable (caller should fail safe to the fallback), false otherwise.
export async function isPublicSpendCapExhausted(): Promise<boolean | "unknown"> {
  if (!isRateStoreConfigured()) return false;
  const dayBucket = Math.floor(Date.now() / 1000 / 86400);
  const value = await redisGet(`wilma:pub:spend:${dayBucket}`);
  if (value === undefined) return "unknown";
  const spentMicro = value === null ? 0 : Number(value);
  return spentMicro >= DAILY_USD_CAP * 1_000_000;
}

export async function recordPublicSpend(microUsd: number): Promise<void> {
  if (!isRateStoreConfigured() || microUsd <= 0) return;
  const dayBucket = Math.floor(Date.now() / 1000 / 86400);
  await redisPipeline([
    ["INCRBY", `wilma:pub:spend:${dayBucket}`, String(microUsd)],
    ["EXPIRE", `wilma:pub:spend:${dayBucket}`, "172800", "NX"]
  ]);
}

async function redisPipeline(commands: string[][]): Promise<unknown[] | null> {
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(2000),
      body: JSON.stringify(commands)
    });
    if (!res.ok) return null;
    const body = await res.json() as Array<{ result?: unknown; error?: string }>;
    if (!Array.isArray(body)) return null;
    return body.map((item) => item?.result);
  } catch {
    return null;
  }
}

async function redisGet(key: string): Promise<string | null | undefined> {
  try {
    const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { authorization: `Bearer ${REDIS_TOKEN}` },
      signal: AbortSignal.timeout(2000)
    });
    if (!res.ok) return undefined;
    const body = await res.json() as { result?: string | null };
    return body.result ?? null;
  } catch {
    return undefined;
  }
}

function numberAt(results: unknown[], index: number): number {
  const value = results[index];
  return typeof value === "number" ? value : Number(value ?? 0);
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function floatEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? parseFloat(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
