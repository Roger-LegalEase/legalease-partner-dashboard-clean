// First-party web analytics — privacy sanitization (isomorphic).
//
// Analytics must never carry criminal-record answers, PII, payment identifiers, or secrets.
// These helpers run on BOTH the browser (before an event leaves the device) and the server
// (defense in depth, before anything is stored). The forbidden-key + redaction posture mirrors
// `src/lib/legalese-os-events.ts` so the two pipelines stay consistent.

// Any metadata key whose normalized form contains one of these fragments is dropped entirely.
export const FORBIDDEN_META_KEY_FRAGMENTS = [
  "name",
  "email",
  "phone",
  "address",
  "dob",
  "dateofbirth",
  "birth",
  "ssn",
  "socialsecurity",
  "case",
  "casenumber",
  "docket",
  "charge",
  "offense",
  "conviction",
  "criminal",
  "record",
  "answer",
  "answers",
  "facts",
  "narrative",
  "transcript",
  "password",
  "card",
  "cardnumber",
  "cvv",
  "stripe",
  "paymentintent",
  "checkoutsession",
  "secret",
  "servicerole",
  "servicekey",
  "apikey",
  "token",
  "ip",
  "ipaddress"
] as const;

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/g;
const phonePattern = /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]\d{3}[-.\s]\d{4}\b/g;
const dobLikePattern = /\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b/g;
const providerIdPattern = /\b(?:pi|cs|cus|sub|evt|ch|tok|sk|whsec)_(?:test|live)?[A-Za-z0-9_]+\b/g;

// UTM params are the only query keys we retain from a URL query string.
const RETAINED_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "state",
  "ref"
]);

export function isForbiddenMetaKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return FORBIDDEN_META_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

export function redactText(value: string, maxLength = 300): string {
  return value
    .replace(emailPattern, "[redacted_email]")
    .replace(phonePattern, "[redacted_phone]")
    .replace(ssnPattern, "[redacted_ssn]")
    .replace(dobLikePattern, "[redacted_date]")
    .replace(providerIdPattern, "[redacted_provider_id]")
    .trim()
    .slice(0, maxLength);
}

// Sanitize an arbitrary metadata bag: keep only primitive values under safe keys, redact PII from
// string values, cap sizes, and cap the number of keys. Returns undefined when nothing survives.
export function sanitizeEventMeta(
  meta: unknown,
  { maxKeys = 24 }: { maxKeys?: number } = {}
): Record<string, string | number | boolean> | undefined {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return undefined;
  }

  const safe: Record<string, string | number | boolean> = {};
  let count = 0;

  for (const [rawKey, value] of Object.entries(meta as Record<string, unknown>)) {
    if (count >= maxKeys) break;
    const key = rawKey.trim().slice(0, 64);
    if (!key || isForbiddenMetaKey(key)) {
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = value;
      count += 1;
    } else if (typeof value === "boolean") {
      safe[key] = value;
      count += 1;
    } else if (typeof value === "string") {
      const text = redactText(value, 160);
      if (text) {
        safe[key] = text;
        count += 1;
      }
    }
  }

  return count > 0 ? safe : undefined;
}

// A URL path with the query string stripped. Redacts any accidental PII embedded in the path.
export function sanitizePath(path: unknown, maxLength = 512): string {
  if (typeof path !== "string" || !path) return "/";
  const withoutQuery = path.split("?")[0]?.split("#")[0] ?? "/";
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  return redactText(normalized, maxLength) || "/";
}

// Keep only allowlisted (UTM + a couple of safe) query keys and rebuild a compact query string.
// Everything else is discarded so free-text or PII-bearing query params never reach storage.
export function sanitizeQueryString(rawQuery: unknown, maxLength = 512): string | undefined {
  if (typeof rawQuery !== "string" || !rawQuery) return undefined;
  const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery;
  const params = new URLSearchParams(query);
  const kept = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    const lower = key.toLowerCase();
    if (RETAINED_QUERY_KEYS.has(lower) && value) {
      kept.set(lower, redactText(value, 120));
    }
  }
  const serialized = kept.toString();
  return serialized ? serialized.slice(0, maxLength) : undefined;
}

// Host-only referrer (no path/query) — the low-cardinality, privacy-safe part of a referrer.
export function referrerDomain(referrer: unknown): string | undefined {
  if (typeof referrer !== "string" || !referrer) return undefined;
  try {
    const url = new URL(referrer);
    return url.hostname.toLowerCase().replace(/^www\./, "").slice(0, 190) || undefined;
  } catch {
    return undefined;
  }
}

// Optional full referrer URL, with query stripped + PII redacted. Path retained for top-referrer
// context; query dropped to avoid leaking anything.
export function sanitizeReferrerUrl(referrer: unknown, maxLength = 300): string | undefined {
  if (typeof referrer !== "string" || !referrer) return undefined;
  try {
    const url = new URL(referrer);
    const base = `${url.protocol}//${url.hostname}${url.pathname}`;
    return redactText(base, maxLength) || undefined;
  } catch {
    return undefined;
  }
}

// A short opaque string field (utm value, state code, page title, etc.), PII-redacted + capped.
export function sanitizeShortText(value: unknown, maxLength = 190): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = redactText(String(value), maxLength);
  return text || undefined;
}
