import { NextResponse } from "next/server";
import type { AppUser } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  emitLegalEaseOsEvent,
  hashLegalEaseOsReference,
  type LegalEaseOsEventOptions
} from "@/lib/legalese-os-events";
import { createEnvWilmaLaunchBackend, type WilmaLaunchBackend } from "@/wilma/adapters/launchBackend";
import { evaluateWilmaLaunchAccess, toPublicWilmaLaunchConfig } from "@/wilma/launch/evaluateLaunchAccess";
import type { WilmaLaunchAccessDecision, WilmaLaunchConfig } from "@/wilma/launch/types";

type WilmaConfigRouteDependencies = {
  launchBackend?: WilmaLaunchBackend;
  currentUser?: () => Promise<AppUser | null>;
  legalEaseOsConfigEnv?: LegalEaseOsEventOptions["configEnv"];
  legalEaseOsFetch?: LegalEaseOsEventOptions["fetcher"];
  now?: () => Date;
  engineHealthThrottleCache?: Map<string, number> | null;
};

const engineHealthSourceSystem = "expungement_ai";
const engineHealthSubjectType = "engine";
const engineHealthSubjectRef = "expungement-engine";
const engineHealthBucketMinutes = 60;
const engineHealthThrottleTtlMs = 65 * 60 * 1000;
const engineHealthThrottleCacheLimit = 256;
const engineHealthSubjectHash = hashLegalEaseOsReference(engineHealthSubjectRef);
const engineHealthThrottleAttempts = new Map<string, number>();

export function createWilmaConfigRouteHandler(dependencies: WilmaConfigRouteDependencies = {}) {
  return async function GET(request: Request) {
    const launchBackend = dependencies.launchBackend ?? createEnvWilmaLaunchBackend();
    const currentUserResolver = dependencies.currentUser ?? (await import("@/lib/auth")).currentUser;
    const user = await currentUserResolver();
    const url = new URL(request.url);
    const config = await launchBackend.getLaunchConfig();
    const decision = evaluateWilmaLaunchAccess(config, {
      state: normalizeState(url.searchParams.get("state")),
      email: url.searchParams.get("email"),
      betaToken: url.searchParams.get("betaToken") ?? request.headers.get("x-wilma-beta-token"),
      anonymousId: url.searchParams.get("anonymousId"),
      deviceId: request.headers.get("x-legalease-device-id"),
      remoteIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
      user
    });

    await emitEngineHealthChanged(config, decision, dependencies);

    return NextResponse.json(toPublicWilmaLaunchConfig(decision), { status: 200 });
  };
}

export const GET = createWilmaConfigRouteHandler();

function normalizeState(value: string | null): string | undefined {
  return value?.trim().toUpperCase() || undefined;
}

async function emitEngineHealthChanged(
  config: WilmaLaunchConfig,
  decision: WilmaLaunchAccessDecision,
  dependencies: WilmaConfigRouteDependencies
) {
  try {
    const emittedAt = dependencies.now?.() ?? new Date();
    const idempotencyKey = buildEngineHealthEventIdempotencyKey(decision, emittedAt);
    const configEnv = dependencies.legalEaseOsConfigEnv ?? env;
    const throttleCache =
      dependencies.engineHealthThrottleCache === undefined
        ? engineHealthThrottleAttempts
        : dependencies.engineHealthThrottleCache;

    if (isEngineHealthExporterConfigured(configEnv) && shouldThrottleEngineHealthExport(idempotencyKey, emittedAt, throttleCache)) {
      return;
    }

    await emitLegalEaseOsEvent(
      {
        source_system: engineHealthSourceSystem,
        event_type: "engine.health_changed",
        occurred_at: emittedAt,
        subject_type: engineHealthSubjectType,
        subject_ref_hash: engineHealthSubjectHash,
        jurisdiction: "ALL",
        metrics: {
          available: decision.allowed,
          allowed_states_count: decision.allowedStates.length,
          beta_only: config.betaOnly,
          maintenance_mode: config.maintenanceMode,
          kill_switch: config.killSwitch,
          mode: decision.mode
        },
        summary: "Expungement engine health check completed.",
        recommended_operator_action: "Review if repeated health failures appear.",
        pii_classification: "none",
        idempotency_key: idempotencyKey
      },
      {
        configEnv,
        fetcher: dependencies.legalEaseOsFetch,
        now: dependencies.now
      }
    );
  } catch {
    // LegalEase OS telemetry must never affect public readiness checks.
  }
}

function buildEngineHealthEventIdempotencyKey(decision: WilmaLaunchAccessDecision, date: Date): string {
  const readinessStatus = decision.allowed ? `allowed:${decision.mode}` : `blocked:${decision.mode}`;
  return [
    "leos",
    "engine_health",
    engineHealthSourceSystem,
    engineHealthSubjectType,
    engineHealthSubjectHash,
    readinessStatus,
    buildLegalEaseOsTimeBucket(date, engineHealthBucketMinutes)
  ].join(":");
}

function buildLegalEaseOsTimeBucket(date: Date, windowMinutes: number): string {
  const windowMs = windowMinutes * 60 * 1000;
  const bucketStartMs = Math.floor(date.getTime() / windowMs) * windowMs;
  return new Date(bucketStartMs).toISOString().replace(/:00\.000Z$/, "Z");
}

function isEngineHealthExporterConfigured(configEnv: NonNullable<LegalEaseOsEventOptions["configEnv"]>): boolean {
  return (
    configEnv.LEGALEASE_OS_EVENTS_ENABLED === "true" &&
    Boolean(configEnv.LEGALEASE_OS_EVENTS_ENDPOINT) &&
    Boolean(configEnv.LEGALEASE_OS_EVENTS_SECRET)
  );
}

function shouldThrottleEngineHealthExport(idempotencyKey: string, date: Date, cache: Map<string, number> | null): boolean {
  if (!cache) {
    return false;
  }

  const nowMs = date.getTime();
  pruneEngineHealthThrottleCache(cache, nowMs);
  const attemptedAtMs = cache.get(idempotencyKey);
  if (attemptedAtMs !== undefined && nowMs - attemptedAtMs < engineHealthThrottleTtlMs) {
    return true;
  }

  cache.set(idempotencyKey, nowMs);
  while (cache.size > engineHealthThrottleCacheLimit) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    cache.delete(oldestKey);
  }
  return false;
}

function pruneEngineHealthThrottleCache(cache: Map<string, number>, nowMs: number) {
  for (const [key, attemptedAtMs] of cache) {
    if (nowMs - attemptedAtMs >= engineHealthThrottleTtlMs) {
      cache.delete(key);
    }
  }
}
