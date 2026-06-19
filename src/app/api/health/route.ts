import { NextResponse } from "next/server";
import { emitLegalEaseOsEvent, hashLegalEaseOsReference } from "@/lib/legalese-os-events";
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

const engineSubjectRef = "expungement-engine";
const engineHealthBucketMinutes = 60;
const engineHealthThrottleTtlMs = 61 * 60 * 1000;
const engineHealthThrottleMax = 120;
const engineHealthThrottleCache = new Map<string, number>();

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

  await emitEngineHealthChanged(db);

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: {
      "cache-control": "no-store"
    }
  });
}

async function emitEngineHealthChanged(db: HealthResponse["checks"]["db"]) {
  const now = new Date();
  const idempotencyKey = buildEngineHealthEventIdempotencyKey(db, now);

  if (!isLegalEaseOsExporterConfigured()) {
    await emitLegalEaseOsEvent({
      event_type: "engine.health_changed",
      source_system: "expungement_ai",
      subject_type: "engine",
      subject_ref: engineSubjectRef,
      jurisdiction: "ALL",
      metrics: {
        status: db,
        db_ready: db === "ok"
      },
      summary: "Expungement engine health check completed.",
      recommended_operator_action: "Review if repeated health failures appear.",
      pii_classification: "none",
      idempotency_key: idempotencyKey
    }, { now: () => now });
    return;
  }

  if (shouldThrottleEngineHealthExport(idempotencyKey, now)) {
    return;
  }

  await emitLegalEaseOsEvent({
    event_type: "engine.health_changed",
    source_system: "expungement_ai",
    subject_type: "engine",
    subject_ref: engineSubjectRef,
    jurisdiction: "ALL",
    metrics: {
      status: db,
      db_ready: db === "ok"
    },
    summary: "Expungement engine health check completed.",
    recommended_operator_action: "Review if repeated health failures appear.",
    pii_classification: "none",
    idempotency_key: idempotencyKey
  }, { now: () => now });
}

function isLegalEaseOsExporterConfigured() {
  return (
    process.env.LEGALEASE_OS_EVENTS_ENABLED === "true" &&
    Boolean(process.env.LEGALEASE_OS_EVENTS_ENDPOINT?.trim()) &&
    Boolean(process.env.LEGALEASE_OS_EVENTS_SECRET?.trim())
  );
}

function buildEngineHealthEventIdempotencyKey(status: string, now: Date) {
  const bucket = buildLegalEaseOsTimeBucket(now, engineHealthBucketMinutes);
  const subjectHash = hashLegalEaseOsReference(engineSubjectRef).slice(0, 16);
  return `leos-engine-health:expungement_ai:engine:${subjectHash}:${status}:${bucket}`;
}

function buildLegalEaseOsTimeBucket(date: Date, windowMinutes: number) {
  const windowMs = windowMinutes * 60 * 1000;
  const bucketStartMs = Math.floor(date.getTime() / windowMs) * windowMs;
  return new Date(bucketStartMs).toISOString();
}

function shouldThrottleEngineHealthExport(idempotencyKey: string, now: Date) {
  pruneEngineHealthThrottleCache(now);
  const lastAttemptAt = engineHealthThrottleCache.get(idempotencyKey);
  if (lastAttemptAt && now.getTime() - lastAttemptAt < engineHealthThrottleTtlMs) {
    return true;
  }
  engineHealthThrottleCache.set(idempotencyKey, now.getTime());
  return false;
}

function pruneEngineHealthThrottleCache(now: Date) {
  for (const [key, attemptedAt] of engineHealthThrottleCache.entries()) {
    if (now.getTime() - attemptedAt > engineHealthThrottleTtlMs) {
      engineHealthThrottleCache.delete(key);
    }
  }

  if (engineHealthThrottleCache.size <= engineHealthThrottleMax) {
    return;
  }

  const overflow = engineHealthThrottleCache.size - engineHealthThrottleMax;
  for (const key of Array.from(engineHealthThrottleCache.keys()).slice(0, overflow)) {
    engineHealthThrottleCache.delete(key);
  }
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
