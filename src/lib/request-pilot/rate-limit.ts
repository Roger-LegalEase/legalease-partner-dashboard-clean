type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export const pilotRequestRateLimit = {
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000
};

export function checkPilotRequestRateLimit(identifier: string, now = Date.now()) {
  const key = identifier || "unknown";
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + pilotRequestRateLimit.windowMs
    });
    return { ok: true };
  }

  if (bucket.count >= pilotRequestRateLimit.maxAttempts) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true };
}

export function resetPilotRequestRateLimitForTests() {
  buckets.clear();
}
