// Pure helpers to carry partner attribution through the account round-trip.
//
// Partner slug is persisted on the screening session (screening_sessions.partner_slug).
// County and UTM/source attribution are NOT persisted today — the screening_sessions
// schema has no columns for them — so these helpers keep the values alive through the
// user-facing redirect chain (intake -> sign-in -> back to intake -> screening) without
// dropping them. Attribution is always optional; nothing here makes it required.
// Dependency-free so both the intake route and verifiers can import it.

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

type SearchLike = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, 200) : undefined;
}

export function extractPartnerAttribution(search: SearchLike): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PARTNER_ATTRIBUTION_PARAMS) {
    const value = firstValue(search[key]);
    if (value) out[key] = value;
  }
  return out;
}

export function readAttributionFromFormData(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PARTNER_ATTRIBUTION_PARAMS) {
    const value = formData.get(`attr_${key}`);
    if (typeof value === "string" && value.trim()) out[key] = value.trim().slice(0, 200);
  }
  return out;
}

export function appendAttributionQuery(path: string, attribution: Record<string, string>): string {
  const keys = Object.keys(attribution);
  if (keys.length === 0) return path;
  const query = keys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(attribution[key])}`)
    .join("&");
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
