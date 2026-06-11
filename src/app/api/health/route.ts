import { NextResponse } from "next/server";
import { logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthResponse = {
  ok: boolean;
  timestamp: string;
  checks: {
    db: "ok" | "fail";
  };
};

export async function GET() {
  const db = await checkDb();
  const body: HealthResponse = {
    ok: db === "ok",
    timestamp: new Date().toISOString(),
    checks: {
      db
    }
  };

  logSecurityInfo({
    event: "health check",
    route: "/api/health",
    outcome: db === "ok" ? "ok" : "degraded",
    metadata: { status: db }
  });

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: {
      "cache-control": "no-store"
    }
  });
}

async function checkDb(): Promise<"ok" | "fail"> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    logSecurityWarn({
      event: "health check db",
      route: "/api/health",
      outcome: "fail",
      metadata: { error_code: "supabase_not_configured" }
    });
    return "fail";
  }

  const { error } = await supabase
    .from("partner_records")
    .select("partner_slug", { head: true })
    .limit(0);

  if (error) {
    logSecurityWarn({
      event: "health check db",
      route: "/api/health",
      outcome: "fail",
      error,
      metadata: { error_code: error.code ?? "db_probe_failed" }
    });
    return "fail";
  }

  return "ok";
}
