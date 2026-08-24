import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getWebAnalyticsSummary, normalizeSummaryRange } from "@/lib/analytics/web-analytics-repository";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/analytics/summary";

// Read-only web traffic summary for the LegalEase Command Center. Aggregate-only: no rows, no PII,
// no visitor/session IDs are returned — only counts and low-cardinality breakdowns.
export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);

  try {
    await requireInternalAdminRouteAccess();
  } catch (error) {
    const unauthenticated = error instanceof SessionPartnerError && error.code === "unauthenticated";
    logSecurityWarn({
      event: "analytics summary denied",
      route: ROUTE,
      outcome: unauthenticated ? "unauthenticated" : "forbidden",
      requestId,
      error
    });
    return NextResponse.json(
      { error: unauthenticated ? "Authentication required." : "Internal administrator access required." },
      { status: unauthenticated ? 401 : 403, headers: { "cache-control": "private, no-store, max-age=0" } }
    );
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
