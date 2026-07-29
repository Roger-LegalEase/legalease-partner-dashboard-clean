// In-memory brute-force guard for public access-code validation, keyed per
// partner + client fingerprint. Mirrors the request-pilot limiter shape.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const accessCodeValidationRateLimit = {
  maxAttempts: 10,
  windowMs: 5 * 60 * 1000
};

export function checkAccessCodeValidationRateLimit(identifier: string, now = Date.now()) {
  const key = identifier || "unknown";
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + accessCodeValidationRateLimit.windowMs });
    return { ok: true as const };
  }

  if (bucket.count >= accessCodeValidationRateLimit.maxAttempts) {
    return { ok: false as const, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true as const };
}

export function resetAccessCodeValidationRateLimitForTests() {
  buckets.clear();
}
