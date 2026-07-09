import { createHash } from "node:crypto";

// Pure normalization + hashing for partner access codes. Intentionally NOT
// "server-only" so it can be shared by server code and by the PGlite verifiers.
// Raw codes are never persisted; only the hash produced here is stored/compared.

// Codes are normalized before hashing so validation is case-insensitive and
// tolerant of accidental whitespace:
//   * trim outer whitespace
//   * remove all internal whitespace
//   * uppercase
export function normalizeAccessCode(raw: string): string {
  return (raw ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

// Dev fallback mirrors the project convention for other hashing secrets
// (e.g. RATE_LIMIT_HASH_SECRET) so local/test runs are deterministic. Production
// must set PARTNER_ACCESS_CODE_PEPPER; see checkSupabasePartnerEnv guidance.
const DEV_PEPPER_FALLBACK = "dev-partner-access-code-pepper";

export function accessCodePepper(): string {
  const pepper = process.env.PARTNER_ACCESS_CODE_PEPPER?.trim();
  return pepper && pepper.length > 0 ? pepper : DEV_PEPPER_FALLBACK;
}

// Deterministic keyed hash of the normalized code. A pepper keeps the hash
// non-reversible without the server secret even if a hash leaks.
export function hashAccessCode(rawOrNormalized: string, pepper: string = accessCodePepper()): string {
  const normalized = normalizeAccessCode(rawOrNormalized);
  return createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

// A safe, non-reversible display hint (never enough to reconstruct the code).
// Shows only the final characters of the normalized code.
export function accessCodeDisplayHint(raw: string): string {
  const normalized = normalizeAccessCode(raw);
  if (normalized.length === 0) return "";
  if (normalized.length <= 4) return `${"•".repeat(Math.max(0, normalized.length - 1))}${normalized.slice(-1)}`;
  return `••••${normalized.slice(-4)}`;
}
