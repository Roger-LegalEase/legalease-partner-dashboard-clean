import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getWebAnalyticsSummary, normalizeSummaryRange } from "@/lib/analytics/web-analytics-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/analytics/summary";

// Read-only web traffic summary for the LegalEase Command Center. Aggregate-only: no rows, no PII,
// no visitor/session IDs are returned — only counts and low-cardinality breakdowns. Protected by the
// same COMMAND_CENTER_API_KEY bearer token as /api/metrics/signups.
export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);

  const configuredKey = process.env.COMMAND_CENTER_API_KEY;
  if (!configuredKey) {
    logSecurityError({ event: "analytics summary denied", route: ROUTE, outcome: "not_configured", requestId });
    return NextResponse.json({ error: "Endpoint not configured." }, { status: 503 });
  }

  if (!isAuthorized(request, configuredKey)) {
    logSecurityWarn({ event: "analytics summary denied", route: ROUTE, outcome: "unauthorized", requestId });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const range = normalizeSummaryRange(new URL(request.url).searchParams.get("range"));
  const summary = await getWebAnalyticsSummary(range);
  if (!summary) {
    logSecurityError({ event: "analytics summary failed", route: ROUTE, outcome: "query_failed", requestId });
    return NextResponse.json({ error: "Summary unavailable." }, { status: 503 });
  }

  logSecurityInfo({ event: "analytics summary served", route: ROUTE, outcome: "ok", requestId });
  return NextResponse.json(summary, { headers: { "cache-control": "no-store" } });
}

function isAuthorized(request: Request, configuredKey: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return false;
  }
  const presented = header.slice("Bearer ".length).trim();
  if (!presented) {
    return false;
  }
  // Constant-time compare over fixed-length SHA-256 digests so neither the value nor length leaks.
  const presentedDigest = createHash("sha256").update(presented).digest();
  const configuredDigest = createHash("sha256").update(configuredKey).digest();
  return timingSafeEqual(presentedDigest, configuredDigest);
}
