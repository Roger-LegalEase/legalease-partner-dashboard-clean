import { NextResponse } from "next/server";
import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { validateContentDoc } from "@/lib/content/renderer";
import { savePostBody } from "@/lib/content/repository";
import { jsonError, requireSupabase, storageFailure, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import {
  type ContentDoc,
  type ContentStatus,
  type ContentType,
  roleHasCapability
} from "@/lib/content/types";
import { evaluateTransition, recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/posts/[id]";

const DETAIL_SELECT =
  "post_id, slug, destination, content_type, status, locale, title, subtitle, excerpt, doc, rendered_html, reading_minutes, category_id, author_id, featured_media_id, og_media_id, partner_slug, jurisdiction_code, legal_sensitive, seo_title, seo_description, canonical_url, og_title, og_description, version, published_at, scheduled_for, first_published_at, legal_approved_at, legal_approved_by, editorial_approved_at, editorial_approved_by, created_by, created_at, updated_at";

/**
 * The client may never supply HTML. Public HTML is derived from the structured doc by the
 * allowlisting renderer at save time; accepting an `html` field would reopen exactly the injection
 * hole the renderer exists to close.
 */
const FORBIDDEN_BODY_FIELDS = ["html", "renderedHtml", "rendered_html", "renderedHTML"];

const uuidField = z.string().regex(UUID_PATTERN, "Must be a UUID.");

const patchSchema = z.strictObject({
  doc: z.unknown().optional(),
  title: z.string().trim().min(1).max(300).optional(),
  subtitle: z.string().trim().max(400).nullish(),
  excerpt: z.string().trim().max(1000).nullish(),
  seoTitle: z.string().trim().max(200).nullish(),
  seoDescription: z.string().trim().max(400).nullish(),
  canonicalUrl: z.string().trim().url().max(500).nullish(),
  ogTitle: z.string().trim().max(200).nullish(),
  ogDescription: z.string().trim().max(400).nullish(),
  ogMediaId: uuidField.nullish(),
  featuredMediaId: uuidField.nullish(),
  authorId: uuidField.nullish(),
  categoryId: uuidField.nullish(),
  legalSensitive: z.boolean().optional(),
  note: z.string().trim().max(500).nullish()
});

type PostRow = {
  post_id: string;
  status: ContentStatus;
  content_type: ContentType;
  legal_sensitive: boolean;
  legal_approved_at: string | null;
  title: string;
  subtitle: string | null;
  partner_slug: string | null;
  created_by: string | null;
  featured_media_id: string | null;
  version: number;
};

async function loadPost(client: SupabaseClient, postId: string): Promise<PostRow | null> {
  const { data, error } = await client.from("content_posts").select(DETAIL_SELECT).eq("post_id", postId).limit(1);
  if (error || !data || !data.length) return null;
  return data[0] as unknown as PostRow;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.read", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return jsonError(400, "Invalid post id.");

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const { data, error } = await client.from("content_posts").select(DETAIL_SELECT).eq("post_id", id).limit(1);
  if (error) return storageFailure(context, "content post read failed", error);
  if (!data || !data.length) return jsonError(404, "Post not found.");

  const post = data[0] as unknown as PostRow;

  // Partner contributors see only their own organization's posts.
  if (gate.session.role === "partner_contributor" && post.partner_slug !== gate.session.partnerSlug) {
    logSecurityWarn({ event: "content post read denied", route: ROUTE, outcome: "forbidden", requestId });
    return jsonError(403, "Content access required.");
  }

  return NextResponse.json({ success: true, post });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  // Every role that can edit anything holds content.edit_own; content.edit_any is checked below to
  // decide whether the caller is limited to their own drafts.
  const gate = await denyUnlessContentCapability("content.edit_own", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return jsonError(400, "Invalid post id.");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const supplied = FORBIDDEN_BODY_FIELDS.filter((field) => field in (raw as Record<string, unknown>));
    if (supplied.length) {
      logSecurityWarn({ event: "content post save rejected html", route: ROUTE, outcome: "forbidden_field", requestId });
      return jsonError(
        400,
        "HTML cannot be supplied by the client. Send the structured doc; the server renders the HTML.",
        { rejectedFields: supplied }
      );
    }
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    logSecurityWarn({ event: "content post save validation failed", route: ROUTE, outcome: "invalid_payload", requestId });
    return jsonError(400, "Invalid request payload.", {
      problems: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }
  const input = parsed.data;

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const post = await loadPost(client, id);
  if (!post) return jsonError(404, "Post not found.");

  // edit_own-only roles may edit only their own unpublished work.
  if (!roleHasCapability(gate.session.role, "content.edit_any")) {
    const ownsPost =
      gate.session.role === "partner_contributor"
        ? Boolean(gate.session.partnerSlug) && post.partner_slug === gate.session.partnerSlug
        : post.created_by === gate.session.userId;

    if (!ownsPost) {
      logSecurityWarn({ event: "content post save denied", route: ROUTE, outcome: "forbidden", requestId });
      return jsonError(403, "You can only edit your own drafts.");
    }
    if (!["draft", "changes_requested"].includes(post.status)) {
      logSecurityWarn({ event: "content post save denied", route: ROUTE, outcome: "forbidden_status", requestId });
      return jsonError(403, `A ${post.status} post can no longer be edited by your role.`);
    }
  }

  // The structured document is validated before anything is written.
  let version = post.version;
  if (input.doc !== undefined) {
    const problems = validateContentDoc(input.doc);
    if (problems.length) {
      logSecurityWarn({ event: "content post save invalid doc", route: ROUTE, outcome: "invalid_doc", requestId });
      return jsonError(422, "The document did not validate.", { problems });
    }

    const saved = await savePostBody({
      postId: id,
      doc: input.doc as ContentDoc,
      title: input.title ?? post.title,
      subtitle: input.subtitle !== undefined ? (input.subtitle ?? null) : post.subtitle,
      actorId: gate.session.userId,
      note: input.note ?? null
    });

    if (!saved.ok) {
      logSecurityWarn({ event: "content post save failed", route: ROUTE, outcome: "error", requestId });
      return jsonError(500, saved.error);
    }
    version = saved.version;
  }

  // Metadata columns. Title/subtitle are only written here when no doc was sent (savePostBody owns
  // them otherwise, so it can snapshot the version that is being replaced).
  const patch: Record<string, unknown> = {};
  if (input.doc === undefined) {
    if (input.title !== undefined) patch.title = input.title;
    if (input.subtitle !== undefined) patch.subtitle = input.subtitle ?? null;
  }
  if (input.excerpt !== undefined) patch.excerpt = input.excerpt ?? null;
  if (input.seoTitle !== undefined) patch.seo_title = input.seoTitle ?? null;
  if (input.seoDescription !== undefined) patch.seo_description = input.seoDescription ?? null;
  if (input.canonicalUrl !== undefined) patch.canonical_url = input.canonicalUrl ?? null;
  if (input.ogTitle !== undefined) patch.og_title = input.ogTitle ?? null;
  if (input.ogDescription !== undefined) patch.og_description = input.ogDescription ?? null;
  if (input.ogMediaId !== undefined) patch.og_media_id = input.ogMediaId ?? null;
  if (input.featuredMediaId !== undefined) patch.featured_media_id = input.featuredMediaId ?? null;
  if (input.authorId !== undefined) patch.author_id = input.authorId ?? null;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId ?? null;
  if (input.legalSensitive !== undefined) patch.legal_sensitive = input.legalSensitive;

  if (Object.keys(patch).length) {
    const { error } = await client.from("content_posts").update(patch).eq("post_id", id);
    if (error) {
      // Flagging a live post legally sensitive without a legal approval trips the DB backstop. That
      // is a workflow answer, not a server fault.
      if (error.message?.includes("content_posts_legal_review_required_check")) {
        return jsonError(
          422,
          "This post is live and marking it legally sensitive would require a recorded legal approval. Unpublish it or send it to legal review first.",
          { code: "legal_review_required" }
        );
      }
      return storageFailure(context, "content post update failed", error);
    }
  }

  await recordAudit({
    actorId: gate.session.userId,
    actorRole: gate.session.role,
    action: "saved",
    entityType: "content_post",
    entityId: id,
    detail: { version, fields: Object.keys(patch), doc_saved: input.doc !== undefined }
  });

  const { data } = await client.from("content_posts").select(DETAIL_SELECT).eq("post_id", id).limit(1);

  logSecurityInfo({ event: "content post saved", route: ROUTE, outcome: "ok", requestId, metadata: { row_id: id } });

  return NextResponse.json({ success: true, version, post: data?.[0] ?? null });
}

/** Archive. There is no hard delete: content history is evidence and is never destroyed. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.archive", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return jsonError(400, "Invalid post id.");

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const post = await loadPost(client, id);
  if (!post) return jsonError(404, "Post not found.");

  const decision = evaluateTransition({
    from: post.status,
    to: "archived",
    role: gate.session.role,
    contentType: post.content_type,
    legalSensitive: post.legal_sensitive,
    legalApprovedAt: post.legal_approved_at
  });

  if (!decision.ok) {
    logSecurityWarn({ event: "content post archive refused", route: ROUTE, outcome: decision.code, requestId });
    return jsonError(422, decision.message, { code: decision.code });
  }

  const { error } = await client
    .from("content_posts")
    .update({ status: "archived" })
    .eq("post_id", id)
    .eq("status", post.status);

  if (error) return storageFailure(context, "content post archive failed", error);

  await client.from("content_publications").insert({
    post_id: id,
    action: "archived",
    version: post.version,
    actor_id: gate.session.userId
  });

  await recordAudit({
    actorId: gate.session.userId,
    actorRole: gate.session.role,
    action: "archived",
    entityType: "content_post",
    entityId: id,
    detail: { from: post.status }
  });

  logSecurityInfo({ event: "content post archived", route: ROUTE, outcome: "ok", requestId, metadata: { row_id: id } });

  return NextResponse.json({ success: true, status: "archived" });
}
