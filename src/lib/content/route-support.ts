import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";

import { logSecurityError, logSecurityWarn } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Small shared shapes for the /api/internal/content and /api/content routes.
 *
 * Two rules encoded here rather than repeated fourteen times:
 *   1. getSupabaseAdminClient() returns null when Supabase is unconfigured. Every route must answer
 *      503 in that case instead of dereferencing null — the build (and a misconfigured preview) must
 *      never crash on it.
 *   2. Bodies are parsed only after the capability gate has passed, and always through a zod schema.
 */

export type RouteContext = { route: string; requestId: string };

export function jsonError(status: number, error: string, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

/** Resolve the admin client or hand back a 503. Never returns a null client. */
export function requireSupabase(
  context: RouteContext
): { client: SupabaseClient; response: null } | { client: null; response: NextResponse } {
  const client = getSupabaseAdminClient();
  if (!client) {
    logSecurityWarn({
      event: "content storage unconfigured",
      route: context.route,
      outcome: "unconfigured",
      requestId: context.requestId
    });
    return { client: null, response: jsonError(503, "Content storage is not configured.") };
  }
  return { client, response: null };
}

/** Parse + validate a JSON body. Call only after the gate. */
export async function readJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
  context: RouteContext
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    logSecurityWarn({
      event: "content request validation failed",
      route: context.route,
      outcome: "invalid_json",
      requestId: context.requestId
    });
    return { ok: false, response: jsonError(400, "Invalid JSON body.") };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    logSecurityWarn({
      event: "content request validation failed",
      route: context.route,
      outcome: "invalid_payload",
      requestId: context.requestId
    });
    return {
      ok: false,
      response: jsonError(400, "Invalid request payload.", {
        problems: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      })
    };
  }

  return { ok: true, data: parsed.data };
}

/** Log + 500 for an unexpected storage failure, without leaking the raw error to the caller. */
export function storageFailure(context: RouteContext, event: string, error: unknown): NextResponse {
  logSecurityError({
    event,
    route: context.route,
    outcome: "error",
    requestId: context.requestId,
    error
  });
  return jsonError(500, "Content storage request failed.");
}

/** Postgres unique-violation. Used to answer 409 (slug taken) and 200 duplicate (outbox key). */
export function isUniqueViolation(error: { code?: string | null; message?: string | null } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return typeof error.message === "string" && error.message.toLowerCase().includes("duplicate key");
}

/** lowercase-kebab, collapsed dashes, no leading/trailing dash. */
export function normalizeSlug(raw: string): string {
  return raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** A uuid matcher that does not depend on a zod major version's built-in. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
