// First-party web analytics — product surface + host mapping.
//
// This module is intentionally isomorphic (no `server-only`, no Node built-ins) so the exact same
// host → surface mapping runs in the browser tracker AND in the server ingestion route. The server
// derives `product_surface` from the request Host header; the browser derives it from
// `location.hostname`. Because both call the same pure function, they always agree.
//
// The three tracked public product surfaces mirror the host routing in `src/proxy.ts`.

export const PRODUCT_SURFACES = ["expungement_ai", "legalease", "legalease_partner"] as const;

export type ProductSurface = (typeof PRODUCT_SURFACES)[number];

// Canonical marketing domain per surface (used for display + the Command Center `byDomain` rollup).
export const PRODUCT_SURFACE_DOMAINS: Record<ProductSurface, string> = {
  expungement_ai: "expungement.ai",
  legalease: "legalease.com",
  legalease_partner: "legaleasepartner.com"
};

// Every hostname we recognize, mapped to its surface. `www.` and the legacy `legalease.law`
// apex are folded onto the canonical surface so traffic is never split across host aliases.
const HOST_TO_SURFACE: Record<string, ProductSurface> = {
  "expungement.ai": "expungement_ai",
  "www.expungement.ai": "expungement_ai",
  "legalease.com": "legalease",
  "www.legalease.com": "legalease",
  "legalease.law": "legalease",
  "www.legalease.law": "legalease",
  "legaleasepartner.com": "legalease_partner",
  "www.legaleasepartner.com": "legalease_partner"
};

// Strip port + lowercase. Mirrors `normalizeHost` in src/proxy.ts.
export function normalizeAnalyticsHost(hostHeader: string | null | undefined): string {
  return (hostHeader ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

export function isProductSurface(value: unknown): value is ProductSurface {
  return typeof value === "string" && (PRODUCT_SURFACES as readonly string[]).includes(value);
}

// Resolve a raw host header/hostname to a known surface + its canonical domain.
// Returns null for unrecognized hosts (localhost, Vercel preview URLs, cleartherecord.org, etc.)
// so callers can fall back to a validated client-declared surface hint.
export function productSurfaceForHost(
  hostHeader: string | null | undefined
): { surface: ProductSurface; domain: string } | null {
  const host = normalizeAnalyticsHost(hostHeader);
  const surface = HOST_TO_SURFACE[host];
  if (!surface) {
    return null;
  }
  return { surface, domain: PRODUCT_SURFACE_DOMAINS[surface] };
}
