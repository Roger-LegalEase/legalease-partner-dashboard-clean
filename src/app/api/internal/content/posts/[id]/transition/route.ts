import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { hasBlockingIssue, validateMediaForPublication, type MediaRecord } from "@/lib/content/media";
import { jsonError, requireSupabase, storageFailure, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import {
  CONTENT_STATUSES,
  type ContentStatus,
  type ContentType,
  type MediaPermission
} from "@/lib/content/types";
import { evaluateTransition, recordAudit, type AuditAction } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/posts/[id]/transition";

const transitionSchema = z.strictObject({
  to: z.enum(CONTENT_STATUSES),
  scheduledFor: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Must be an ISO-8601 timestamp.")
    .nullish(),
  note: z.string().trim().max(2000).nullish()
});

type PostRow = {
  post_id: string;
  status: ContentStatus;
  content_type: ContentType;
  legal_sensitive: boolean;
  legal_approved_at: string | null;
  published_at: string | null;
  first_published_at: string | null;
  featured_media_id: string | null;
  version: number;
};

const PUBLISHING_TARGETS: ContentStatus[] = ["published", "updated", "scheduled"];

/** Publication actions recorded in content_publications. */
const PUBLICATION_ACTION: Partial<Record<ContentStatus, string>> = {
  published: "published",
  updated: "updated",
  scheduled: "scheduled",
  archived: "archived",
  draft: "restored"
};

/**
 * An image we cannot account for (no alt text, unknown rights) must not reach a public page. The
 * media module owns that judgement; this route just refuses to proceed when it says block.
 */
async function featuredMediaBlockers(client: SupabaseClient, mediaId: string): Promise<string[]> {
  const { data, error } = await client
    .from("content_media")
    .select("media_id, mime_type, byte_size, width, height, alt_text, caption, credit, source_info, permission_status, archived")
    .eq("media_id", mediaId)
    .limit(1);

  if (error || !data || !data.length) return [];

  const row = data[0] as {
    media_id: string;
    mime_type: string;
    byte_size: number;
    width: number | null;
    height: number | null;
    alt_text: string | null;
    caption: string | null;
    credit: string | null;
    source_info: string | null;
    permission_status: string;
    archived: boolean;
  };

  const record: MediaRecord = {
    mediaId: row.media_id,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    width: row.width,
    height: row.height,
    altText: row.alt_text,
    caption: row.caption,
    credit: row.credit,
    sourceInfo: row.source_info,
    permissionStatus: row.permission_status as MediaPermission,
    archived: row.archived
  };

  const issues = validateMediaForPublication(record, "featured");
  if (!hasBlockingIssue(issues)) return [];
  return issues.filter((issue) => issue.severity === "block").map((issue) => issue.message);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  // Every role that can drive any transition holds content.submit_for_review. Which transitions this
  // particular role may drive is evaluateTransition()'s decision, below.
  const gate = await denyUnlessContentCapability("content.submit_for_review", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return jsonError(400, "Invalid post id.");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const parsed = transitionSchema.safeParse(raw);
  if (!parsed.success) {
    logSecurityWarn({ event: "content transition validation failed", route: ROUTE, outcome: "invalid_payload", requestId });
    return jsonError(400, "Invalid transition request.", {
      problems: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }
  const { to, scheduledFor, note } = parsed.data;

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const { data, error: readError } = await client
    .from("content_posts")
    .select(
      "post_id, status, content_type, legal_sensitive, legal_approved_at, published_at, first_published_at, featured_media_id, version"
    )
    .eq("post_id", id)
    .limit(1);

  if (readError) return storageFailure(context, "content transition read failed", readError);
  if (!data || !data.length) return jsonError(404, "Post not found.");

  const post = data[0] as unknown as PostRow;
  const from = post.status;

  const decision = evaluateTransition({
    from,
    to,
    role: gate.session.role,
    contentType: post.content_type,
    legalSensitive: post.legal_sensitive,
    legalApprovedAt: post.legal_approved_at,
    scheduledFor: scheduledFor ?? null
  });

  if (!decision.ok) {
    logSecurityWarn({ event: "content transition refused", route: ROUTE, outcome: decision.code, requestId, metadata: { old_status: from, new_status: to } });
    return jsonError(422, decision.message, { code: decision.code });
  }

  // Publication-time media gate.
  if (PUBLISHING_TARGETS.includes(to) && post.featured_media_id) {
    const blockers = await featuredMediaBlockers(client, post.featured_media_id);
    if (blockers.length) {
      logSecurityWarn({ event: "content transition refused", route: ROUTE, outcome: "media_blocked", requestId });
      return jsonError(422, "The featured image cannot be published yet.", {
        code: "media_blocked",
        problems: blockers
      });
    }
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: to };

  if (to === "approved") {
    if (from === "in_legal_review") {
      patch.legal_approved_at = now;
      patch.legal_approved_by = gate.session.userId;
    } else if (from === "in_editorial_review") {
      patch.editorial_approved_at = now;
      patch.editorial_approved_by = gate.session.userId;
    }
  }

  if (to === "scheduled") {
    patch.scheduled_for = scheduledFor;
  }

  if (to === "published") {
    patch.published_at = post.published_at ?? now;
    patch.first_published_at = post.first_published_at ?? post.published_at ?? now;
    // A published post is no longer waiting on the scheduler.
    patch.scheduled_for = null;
  }

  if (to === "updated") {
    // published_at is the original publication date; the updated_at trigger records the revision.
    patch.published_at = post.published_at ?? now;
    patch.first_published_at = post.first_published_at ?? post.published_at ?? now;
  }

  // The status guard makes a double-clicked transition a no-op rather than a second event.
  const { data: updated, error: updateError } = await client
    .from("content_posts")
    .update(patch)
    .eq("post_id", id)
    .eq("status", from)
    .select("post_id, status, published_at, scheduled_for, first_published_at, legal_approved_at, editorial_approved_at, version");

  if (updateError) {
    if (updateError.message?.includes("content_posts_legal_review_required_check")) {
      return jsonError(
        422,
        "This content is legally substantive and has not passed legal review.",
        { code: "legal_review_required" }
      );
    }
    return storageFailure(context, "content transition update failed", updateError);
  }

  if (!updated || !updated.length) {
    // Someone else moved the post between our read and our write.
    return jsonError(409, "The post changed status while this transition was being applied.", { code: "conflict" });
  }

  // Review decisions: who approved what, and when.
  if (from === "in_legal_review" && (to === "approved" || to === "changes_requested")) {
    await client.from("content_reviews").insert({
      post_id: id,
      review_kind: "legal",
      decision: to === "approved" ? "approved" : "changes_requested",
      notes: note ?? null,
      reviewer_id: gate.session.userId
    });
  } else if (from === "in_editorial_review" && (to === "approved" || to === "changes_requested")) {
    await client.from("content_reviews").insert({
      post_id: id,
      review_kind: "editorial",
      decision: to === "approved" ? "approved" : "changes_requested",
      notes: note ?? null,
      reviewer_id: gate.session.userId
    });
  }

  // Publication lifecycle history.
  const publicationAction = PUBLICATION_ACTION[to];
  if (publicationAction && !(to === "draft" && from !== "archived")) {
    await client.from("content_publications").insert({
      post_id: id,
      action: publicationAction,
      version: post.version,
      actor_id: gate.session.userId
    });
  }

  await recordAudit({
    actorId: gate.session.userId,
    actorRole: gate.session.role,
    action: auditActionFor(from, to),
    entityType: "content_post",
    entityId: id,
    detail: { from, to, scheduled_for: scheduledFor ?? null, has_note: Boolean(note) }
  });

  logSecurityInfo({
    event: "content transition applied",
    route: ROUTE,
    outcome: "ok",
    requestId,
    metadata: { row_id: id, old_status: from, new_status: to }
  });

  return NextResponse.json({ success: true, from, to, post: updated[0] });
}

function auditActionFor(from: ContentStatus, to: ContentStatus): AuditAction {
  switch (to) {
    case "in_editorial_review":
      return "submitted_for_editorial_review";
    case "in_legal_review":
      return "submitted_for_legal_review";
    case "changes_requested":
      return "changes_requested";
    case "approved":
      return from === "in_legal_review" ? "legal_approved" : "editorial_approved";
    case "scheduled":
      return "scheduled";
    case "published":
    case "updated":
      return "published";
    case "archived":
      return "archived";
    case "draft":
      return from === "archived" ? "restored" : "saved";
    default:
      return "saved";
  }
}
