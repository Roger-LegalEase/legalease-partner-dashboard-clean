import { env, type Env } from "@/lib/env";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  provider: "redis" | "memory" | "closed";
};

export type RateLimitOptions = {
  key: string;
  limit?: number;
  windowMs?: number;
  configEnv?: Env;
  fetcher?: typeof fetch;
};

export type CompositeRateLimitIdentity = {
  ip?: string | null;
  email?: string | null;
  deviceId?: string | null;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit({
  key,
  limit = 60,
  windowMs = 60_000,
  configEnv = env,
  fetcher = fetch
}: RateLimitOptions): Promise<RateLimitResult> {
  if (configEnv.RATE_LIMIT_REDIS_REST_URL && configEnv.RATE_LIMIT_REDIS_REST_TOKEN) {
    return checkRedisRateLimit({ key, limit, windowMs, configEnv, fetcher });
  }

  if (canUseMemoryFallback(configEnv)) {
    return checkMemoryRateLimit({ key, limit, windowMs });
  }

  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt: new Date(Date.now() + windowMs),
    provider: "closed"
  };
}

export function rateLimitKey(request: Request, scope: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");
  return `${scope}:${forwardedFor || realIp || userAgent || "unknown"}`;
}

export function rateLimitIdentity(request: Request, input: { email?: string | null; deviceId?: string | null } = {}): CompositeRateLimitIdentity {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
    email: normalizeRateLimitValue(input.email),
    deviceId: normalizeRateLimitValue(input.deviceId ?? request.headers.get("x-legalease-device-id"))
  };
}

export async function checkCompositeRateLimit(input: {
  scope: string;
  identity: CompositeRateLimitIdentity;
  limit?: number;
  windowMs?: number;
  configEnv?: Env;
  fetcher?: typeof fetch;
}): Promise<RateLimitResult> {
  const keys = [
    input.identity.ip ? `${input.scope}:ip:${input.identity.ip}` : undefined,
    input.identity.email ? `${input.scope}:email:${input.identity.email}` : undefined,
    input.identity.deviceId ? `${input.scope}:device:${input.identity.deviceId}` : undefined
  ].filter(Boolean) as string[];
  const effectiveKeys = keys.length > 0 ? keys : [`${input.scope}:unknown`];
  let mostRestrictive: RateLimitResult | null = null;

  for (const key of effectiveKeys) {
    const result = await checkRateLimit({
      key,
      limit: input.limit,
      windowMs: input.windowMs,
      configEnv: input.configEnv,
      fetcher: input.fetcher
    });

    if (!result.allowed) {
      return result;
    }

    if (!mostRestrictive || result.remaining < mostRestrictive.remaining) {
      mostRestrictive = result;
    }
  }

  return mostRestrictive as RateLimitResult;
}

function normalizeRateLimitValue(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "").slice(0, 128);
  return normalized || null;
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}

function canUseMemoryFallback(configEnv: Env): boolean {
  return configEnv.NODE_ENV !== "production" || configEnv.RATE_LIMIT_ALLOW_MEMORY_FALLBACK === "true";
}

function checkMemoryRateLimit({
  key,
  limit,
  windowMs
}: Required<Pick<RateLimitOptions, "key" | "limit" | "windowMs">>): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: new Date(bucket.resetAt),
    provider: "memory"
  };
}

async function checkRedisRateLimit({
  key,
  limit,
  windowMs,
  configEnv,
  fetcher
}: Required<Pick<RateLimitOptions, "key" | "limit" | "windowMs" | "configEnv" | "fetcher">>): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const resetAt = new Date(Date.now() + windowMs);

  try {
    const response = await fetcher(`${configEnv.RATE_LIMIT_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configEnv.RATE_LIMIT_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, String(windowMs)]
      ])
    });

    if (!response.ok) {
      throw new Error(`Redis rate limit request failed with status ${response.status}.`);
    }

    const result = (await response.json()) as Array<{ result?: unknown }>;
    const count = Number(result[0]?.result ?? limit + 1);

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      provider: "redis"
    };
  } catch {
    if (canUseMemoryFallback(configEnv)) {
      return checkMemoryRateLimit({ key, limit, windowMs });
    }

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt,
      provider: "closed"
    };
  }
}
