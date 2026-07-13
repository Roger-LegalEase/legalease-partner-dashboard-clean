import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { jsonError, requireSupabase, storageFailure, type RouteContext } from "@/lib/content/route-support";
import type { ContentStatus } from "@/lib/content/types";
import { recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/content/scheduler/run";
const BATCH_LIMIT = 50;

type ScheduledPost = {
  post_id: string;
  status: ContentStatus;
  scheduled_for: string | null;
  published_at: string | null;
  first_published_at: string | null;
  version: number;
};

/**
 * Constant-time bearer check. Both sides are hashed first so the comparison operates on equal-length
 * buffers: timingSafeEqual throws on a length mismatch, and a thrown error would itself leak the
 * length of the expected secret.
 */
function bearerMatches(header: string | null, secret: string): boolean {
  if (!header) return false;
  const match = /^bearer\s+(.+)$/i.exec(header.trim());
  const provided = match?.[1]?.trim();
  if (!provided) return false;

  const providedDigest = createHash("sha256").update(provided, "utf8").digest();
  const expectedDigest = createHash("sha256").update(secret, "utf8").digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

/**
 * Publish everything whose scheduled time has arrived.
 *
 * IDEMPOTENT BY CONSTRUCTION: each publish is an UPDATE guarded by `status = 'scheduled'`, and only
 * a row that the update actually moved gets a publication row and an audit event. Two overlapping
 * runs (or a retried cron) therefore cannot double-publish or double-record.
 */
export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const secret = process.env.CONTENT_SCHEDULER_SECRET?.trim();
  if (!secret) {
    // Never run unprotected. An unset secret is a configuration error, not an open door.
    logSecurityError({ event: "content scheduler unconfigured", route: ROUTE, outcome: "unconfigured", requestId });
    return jsonError(503, "The content scheduler is not configured.");
  }

  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    logSecurityWarn({ event: "content scheduler denied", route: ROUTE, outcome: "unauthenticated", requestId });
    return jsonError(401, "Authentication required.");
  }

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const now = new Date().toISOString();

  const { data, error } = await client
    .from("content_posts")
    .select("post_id, status, scheduled_for, published_at, first_published_at, version")
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) return storageFailure(context, "content scheduler read failed", error);

  const due = (data ?? []) as unknown as ScheduledPost[];
  const published: string[] = [];
  const failed: { postId: string; error: string }[] = [];

  for (const post of due) {
    const publishedAt = post.scheduled_for ?? now;

    const { data: updated, error: updateError } = await client
      .from("content_posts")
      .update({
        status: "published",
        published_at: publishedAt,
        first_published_at: post.first_published_at ?? publishedAt,
        scheduled_for: null
      })
      .eq("post_id", post.post_id)
      // THE IDEMPOTENCY GUARD: only a row still sitting in 'scheduled' is published by this run.
      .eq("status", "scheduled")
      .select("post_id");

    if (updateError) {
      failed.push({ postId: post.post_id, error: updateError.message });
      logSecurityError({
        event: "content scheduler publish failed",
        route: ROUTE,
        outcome: "error",
        requestId,
        metadata: { row_id: post.post_id }
      });
      continue;
    }

    // No row moved: another run (or a human) already published it. Not an error, and not a second event.
    if (!updated || !updated.length) continue;

    await client.from("content_publications").insert({
      post_id: post.post_id,
      action: "published",
      version: post.version,
      actor_id: null
    });

    await recordAudit({
      actorId: null,
      actorRole: null,
      action: "published",
      entityType: "content_post",
      entityId: post.post_id,
      detail: { via: "scheduler", scheduled_for: post.scheduled_for, published_at: publishedAt }
    });

    published.push(post.post_id);
  }

  logSecurityInfo({
    event: "content scheduler run",
    route: ROUTE,
    outcome: "ok",
    requestId,
    metadata: { due: due.length, published: published.length, failed: failed.length }
  });

  return NextResponse.json({
    success: true,
    due: due.length,
    published: published.length,
    publishedIds: published,
    failed
  });
}
