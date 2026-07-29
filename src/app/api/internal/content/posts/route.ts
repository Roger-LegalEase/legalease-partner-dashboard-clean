import { NextResponse } from "next/server";
import { z } from "zod";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import {
  isUniqueViolation,
  jsonError,
  normalizeSlug,
  readJsonBody,
  requireSupabase,
  storageFailure,
  UUID_PATTERN,
  type RouteContext
} from "@/lib/content/route-support";
import {
  EMPTY_DOC,
  CONTENT_DESTINATIONS,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  type CreateContentPostPayload
} from "@/lib/content/types";
import { recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/posts";

const LIST_SELECT =
  "post_id, slug, destination, content_type, status, locale, title, subtitle, excerpt, reading_minutes, partner_slug, jurisdiction_code, legal_sensitive, author_id, category_id, featured_media_id, version, published_at, scheduled_for, first_published_at, legal_approved_at, editorial_approved_at, created_at, updated_at";

const createSchema = z.strictObject({
  destination: z.enum(CONTENT_DESTINATIONS),
  contentType: z.enum(CONTENT_TYPES),
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().min(1).max(160),
  partnerSlug: z.string().trim().min(1).max(120).nullish(),
  jurisdictionCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "A jurisdiction code is two letters.")
    .nullish(),
  legalSensitive: z.boolean().optional(),
  authorId: z.string().regex(UUID_PATTERN, "Must be a UUID.").nullish()
}) satisfies z.ZodType<CreateContentPostPayload>;

export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.read", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const url = new URL(request.url);
  const destination = url.searchParams.get("destination");
  const status = url.searchParams.get("status");
  const contentType = url.searchParams.get("contentType");

  let query = client.from("content_posts").select(LIST_SELECT).order("updated_at", { ascending: false }).limit(200);

  // Unknown filter values are rejected rather than silently ignored — a typo must not quietly return
  // the unfiltered list.
  if (destination) {
    if (!(CONTENT_DESTINATIONS as readonly string[]).includes(destination)) {
      return jsonError(400, "Unknown destination.");
    }
    query = query.eq("destination", destination);
  }
  if (status) {
    if (!(CONTENT_STATUSES as readonly string[]).includes(status)) {
      return jsonError(400, "Unknown status.");
    }
    query = query.eq("status", status);
  }
  if (contentType) {
    if (!(CONTENT_TYPES as readonly string[]).includes(contentType)) {
      return jsonError(400, "Unknown content type.");
    }
    query = query.eq("content_type", contentType);
  }

  // A partner contributor only ever sees their own organization's posts (RLS says the same thing).
  if (gate.session.role === "partner_contributor") {
    if (!gate.session.partnerSlug) {
      return NextResponse.json({ success: true, posts: [] });
    }
    query = query.eq("partner_slug", gate.session.partnerSlug);
  }

  const { data, error } = await query;
  if (error) {
    return storageFailure(context, "content posts list failed", error);
  }

  return NextResponse.json({ success: true, posts: data ?? [] });
}

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.create", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const parsed = await readJsonBody(request, createSchema, context);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const slug = normalizeSlug(input.slug);
  if (!slug) {
    return jsonError(400, "The slug must contain at least one letter or number.");
  }

  // A partner contributor may only create posts owned by their own partner organization.
  let partnerSlug = input.partnerSlug ?? null;
  if (gate.session.role === "partner_contributor") {
    if (!gate.session.partnerSlug) {
      logSecurityWarn({ event: "content post create denied", route: ROUTE, outcome: "forbidden", requestId });
      return jsonError(403, "This partner account is not linked to a partner organization.");
    }
    partnerSlug = gate.session.partnerSlug;
  }

  if (input.authorId) {
    const { data: authors, error: authorError } = await client
      .from("content_authors")
      .select("author_id")
      .eq("author_id", input.authorId)
      .limit(1);

    if (authorError) {
      return storageFailure(context, "content author validation failed", authorError);
    }
    if (!authors?.length) {
      return jsonError(400, "The selected author is not available.");
    }
  }

  const { data, error } = await client
    .from("content_posts")
    .insert({
      slug,
      destination: input.destination,
      content_type: input.contentType,
      status: "draft",
      title: input.title,
      doc: EMPTY_DOC,
      partner_slug: partnerSlug,
      jurisdiction_code: input.jurisdictionCode ? input.jurisdictionCode.toUpperCase() : null,
      legal_sensitive: input.legalSensitive ?? false,
      author_id: input.authorId ?? null,
      created_by: gate.session.userId
    })
    .select(LIST_SELECT)
    .limit(1);

  if (error) {
    if (isUniqueViolation(error)) {
      logSecurityWarn({ event: "content post create conflict", route: ROUTE, outcome: "conflict", requestId });
      return jsonError(409, `The slug "${slug}" is already used on this destination.`, { slug });
    }
    return storageFailure(context, "content post create failed", error);
  }

  const post = (data?.[0] ?? null) as { post_id?: string } | null;
  const postId = post?.post_id ?? null;

  await recordAudit({
    actorId: gate.session.userId,
    actorRole: gate.session.role,
    action: "created",
    entityType: "content_post",
    entityId: postId,
    detail: { destination: input.destination, content_type: input.contentType, slug }
  });

  logSecurityInfo({ event: "content post created", route: ROUTE, outcome: "ok", requestId, metadata: { row_id: postId } });

  return NextResponse.json({ success: true, post }, { status: 201 });
}
