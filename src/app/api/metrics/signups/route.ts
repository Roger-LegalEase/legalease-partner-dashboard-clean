import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/metrics/signups";

// Read-only signup counts for the LegalEase Command Center.
// Returns aggregate counts only. No rows and no PII are ever read or returned:
// every query uses { count: "exact", head: true }, which returns a number and zero rows.
export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);

  const configuredKey = process.env.COMMAND_CENTER_API_KEY;
  if (!configuredKey) {
    // Fail closed: without a configured key the endpoint must never be reachable.
    logSecurityError({ event: "signup metrics denied", route: ROUTE, outcome: "not_configured", requestId });
    return NextResponse.json({ error: "Endpoint not configured." }, { status: 503 });
  }

  if (!isAuthorized(request, configuredKey)) {
    logSecurityWarn({ event: "signup metrics denied", route: ROUTE, outcome: "unauthorized", requestId });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    logSecurityError({ event: "signup metrics failed", route: ROUTE, outcome: "db_unconfigured", requestId });
    return NextResponse.json({ error: "Counts unavailable." }, { status: 503 });
  }

  // Count-only queries: head:true => exact count, zero rows returned.
  // Counts are sourced only from tables that exist in production today.
  const [registered, paid] = await Promise.all([
    supabase.from("consumer_briefcase_items").select("*", { count: "exact", head: true }),
    supabase
      .from("consumer_briefcase_items")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid")
  ]);

  const failed = [registered, paid].find((result) => result.error || result.count === null);
  if (failed) {
    // Never fabricate a number. If any count fails, surface an error.
    logSecurityError({
      event: "signup metrics failed",
      route: ROUTE,
      outcome: "query_failed",
      requestId,
      metadata: { error_code: failed.error?.code ?? "null_count" }
    });
    return NextResponse.json({ error: "Counts unavailable." }, { status: 502 });
  }

  logSecurityInfo({ event: "signup metrics served", route: ROUTE, outcome: "ok", requestId });

  return NextResponse.json(
    {
      registered: registered.count as number,
      paid: paid.count as number
    },
    { headers: { "cache-control": "no-store" } }
  );
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

  // Constant-time compare over fixed-length SHA-256 digests so neither the
  // value nor the length of the key leaks through timing.
  const presentedDigest = createHash("sha256").update(presented).digest();
  const configuredDigest = createHash("sha256").update(configuredKey).digest();
  return timingSafeEqual(presentedDigest, configuredDigest);
}
