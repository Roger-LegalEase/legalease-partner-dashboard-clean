// Browser-carried acquisition data is analytics context only. It may be stored
// beside a server-authorized partner session, but it never decides sponsorship,
// tenant, program, event, access-code, Clinic, payment, or packet authority.
// Keep this dependency-free so routes and focused verifiers share the rules.

export const PARTNER_ATTRIBUTION_PARAMS = [
  "county",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "source",
  "ref"
] as const;

export type PartnerAnalyticsAttributionKey = typeof PARTNER_ATTRIBUTION_PARAMS[number];
export type PartnerAnalyticsAttribution = Partial<Record<PartnerAnalyticsAttributionKey, string>>;

type SearchLike = Record<string, string | string[] | undefined>;

const COUNTY_MAX_LENGTH = 80;
const ANALYTICS_VALUE_MAX_LENGTH = 120;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const externalLocationPattern = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const countyPattern = /^[\p{L}\p{N}][\p{L}\p{N} .,'&()-]*$/u;
const analyticsTokenPattern = /^[\p{L}\p{N}][\p{L}\p{N} _.,+\-/:@~]*$/u;

export function normalizePartnerAnalyticsValue(
  key: PartnerAnalyticsAttributionKey,
  value: unknown
): string | undefined {
  if (typeof value !== "string" || controlCharacterPattern.test(value)) return undefined;

  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;

  const maxLength = key === "county" ? COUNTY_MAX_LENGTH : ANALYTICS_VALUE_MAX_LENGTH;
  // Reject oversized input so distinct values cannot silently collapse to one.
  if (normalized.length > maxLength) return undefined;

  if (key === "county") return countyPattern.test(normalized) ? normalized : undefined;

  // source/ref are labels, never redirect locations. Do not retain external URLs.
  if ((key === "source" || key === "ref") && externalLocationPattern.test(normalized)) {
    return undefined;
  }
  return analyticsTokenPattern.test(normalized) ? normalized : undefined;
}

export function normalizePartnerAnalyticsAttribution(
  input: Record<string, unknown>
): PartnerAnalyticsAttribution {
  const out: PartnerAnalyticsAttribution = {};
  for (const key of PARTNER_ATTRIBUTION_PARAMS) {
    const raw = input[key];
    // Repeated browser parameters are ambiguous and therefore discarded.
    if (Array.isArray(raw)) continue;
    const value = normalizePartnerAnalyticsValue(key, raw);
    if (value) out[key] = value;
  }
  return out;
}

export function extractPartnerAttribution(search: SearchLike): PartnerAnalyticsAttribution {
  return normalizePartnerAnalyticsAttribution(search);
}

export function readAttributionFromFormData(formData: FormData): PartnerAnalyticsAttribution {
  const raw: Record<string, unknown> = {};
  for (const key of PARTNER_ATTRIBUTION_PARAMS) {
    const values = formData.getAll(`attr_${key}`);
    raw[key] = values.length === 1 ? values[0] : values.length > 1 ? values : undefined;
  }
  return normalizePartnerAnalyticsAttribution(raw);
}

export function appendAttributionQuery(path: string, attribution: Record<string, unknown>): string {
  const normalized = normalizePartnerAnalyticsAttribution(attribution);
  const query = PARTNER_ATTRIBUTION_PARAMS
    .flatMap((key) => normalized[key] ? [`${encodeURIComponent(key)}=${encodeURIComponent(normalized[key]!)}`] : [])
    .join("&");
  if (!query) return path;
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
