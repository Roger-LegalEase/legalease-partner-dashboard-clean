import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  type ContentRole,
  type ContentStatus,
  type ContentType,
  canTransition,
  requiresLegalReview
} from "@/lib/content/types";

/**
 * Editorial workflow engine.
 *
 * Every state change goes through `evaluateTransition` and then `recordAudit`. Two rules are
 * absolute:
 *
 *   1. LEGAL REVIEW CANNOT BE SKIPPED. A post that is legally substantive (state resources, resource
 *      guides, or anything an editor flagged legal_sensitive) cannot reach `approved`, `scheduled`,
 *      `published`, or `updated` without a recorded legal approval. The DB enforces this too
 *      (content_posts_legal_review_required_check) — this layer exists to give a human a clear
 *      reason instead of a constraint violation.
 *   2. EVERY DECISION IS AUDITED. Approval, rejection, override, publication, scheduling, archive,
 *      restore, and promotion send all append to content_audit_events, which is append-only at the
 *      database level (a trigger rejects UPDATE/DELETE even for service_role).
 */

export type TransitionRequest = {
  from: ContentStatus;
  to: ContentStatus;
  role: ContentRole;
  contentType: ContentType;
  legalSensitive: boolean;
  legalApprovedAt: string | null;
  scheduledFor?: string | null;
};

export type TransitionResult =
  | { ok: true }
  | { ok: false; code: "illegal_transition" | "forbidden_role" | "legal_review_required" | "missing_schedule"; message: string };

/** Which roles may drive which transitions. */
const PUBLISHING_STATUSES: ContentStatus[] = ["published", "updated", "scheduled"];

export function evaluateTransition(request: TransitionRequest): TransitionResult {
  const { from, to, role, contentType, legalSensitive, legalApprovedAt } = request;

  if (!canTransition(from, to)) {
    return {
      ok: false,
      code: "illegal_transition",
      message: `Cannot move a post from ${from} to ${to}.`
    };
  }

  // Legal approval is a legal_reviewer's (or primary_admin's) decision alone.
  if (to === "approved" && from === "in_legal_review" && !["primary_admin", "legal_reviewer"].includes(role)) {
    return {
      ok: false,
      code: "forbidden_role",
      message: "Only a legal reviewer or the primary admin can approve content out of legal review."
    };
  }

  if (PUBLISHING_STATUSES.includes(to) && !["primary_admin", "editor"].includes(role)) {
    return {
      ok: false,
      code: "forbidden_role",
      message: `The ${role} role cannot publish or schedule content.`
    };
  }

  if (to === "archived" && !["primary_admin", "editor"].includes(role)) {
    return { ok: false, code: "forbidden_role", message: `The ${role} role cannot archive content.` };
  }

  // THE GATE: legally substantive content cannot go live unreviewed.
  if (PUBLISHING_STATUSES.includes(to) && requiresLegalReview(contentType, legalSensitive) && !legalApprovedAt) {
    return {
      ok: false,
      code: "legal_review_required",
      message:
        "This content is legally substantive and has not passed legal review. Send it to legal review before publishing or scheduling."
    };
  }

  if (to === "scheduled" && !request.scheduledFor) {
    return { ok: false, code: "missing_schedule", message: "A scheduled post needs a publication time." };
  }

  return { ok: true };
}

/**
 * The next status a "submit for review" action should target. Content that needs legal review goes
 * to legal after editorial rather than straight to approved — the two reviews are not interchangeable.
 */
export function nextReviewStatus(contentType: ContentType, legalSensitive: boolean): ContentStatus {
  return requiresLegalReview(contentType, legalSensitive) ? "in_legal_review" : "in_editorial_review";
}

// --- Audit ------------------------------------------------------------------------------------------

export type AuditAction =
  | "created"
  | "saved"
  | "submitted_for_editorial_review"
  | "submitted_for_legal_review"
  | "editorial_approved"
  | "legal_approved"
  | "changes_requested"
  | "published"
  | "scheduled"
  | "unpublished"
  | "archived"
  | "restored"
  | "version_restored"
  | "media_uploaded"
  | "media_archived"
  | "promotion_prepared"
  | "promotion_exported"
  | "promotion_sent"
  | "promotion_status_received"
  | "role_assigned";

/**
 * Append an audit event. Best-effort by design: an audit write must never be the thing that fails a
 * user's publish. It is still append-only and tamper-evident at the DB level, and a failure here is
 * logged loudly rather than swallowed silently.
 */
export async function recordAudit(event: {
  actorId: string | null;
  actorRole: ContentRole | null;
  action: AuditAction;
  entityType: "content_post" | "content_media" | "content_state_editorial" | "content_social_draft" | "content_admin_user";
  entityId: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from("content_audit_events").insert({
    actor_id: event.actorId,
    actor_role: event.actorRole,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    detail: event.detail ?? {}
  });

  if (error) {
    console.error("[content] audit write failed", {
      action: event.action,
      entityType: event.entityType,
      error: error.message
    });
  }
}
