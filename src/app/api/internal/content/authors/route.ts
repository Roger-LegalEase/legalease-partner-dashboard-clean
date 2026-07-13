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
import { getSafeRequestId, logSecurityInfo } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/authors";

const SELECT = "author_id, slug, name, title, organization, bio, avatar_media_id, auth_user_id, is_active, created_at, updated_at";

const createSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().max(160).nullish(),
  organization: z.string().trim().max(160).nullish(),
  bio: z.string().trim().max(4000).nullish(),
  avatarMediaId: z.string().regex(UUID_PATTERN, "Must be a UUID.").nullish(),
  isActive: z.boolean().optional()
});

export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.read", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";

  let query = client.from("content_authors").select(SELECT).order("name", { ascending: true }).limit(200);
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) return storageFailure(context, "content authors list failed", error);

  return NextResponse.json({ success: true, authors: data ?? [] });
}

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("taxonomy.manage", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const parsed = await readJsonBody(request, createSchema, context);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const slug = normalizeSlug(input.slug ?? input.name);
  if (!slug) return jsonError(400, "The author slug must contain at least one letter or number.");

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const { data, error } = await client
    .from("content_authors")
    .insert({
      slug,
      name: input.name,
      title: input.title ?? null,
      organization: input.organization ?? null,
      bio: input.bio ?? null,
      avatar_media_id: input.avatarMediaId ?? null,
      is_active: input.isActive ?? true
    })
    .select(SELECT)
    .limit(1);

  if (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, `The author slug "${slug}" is already taken.`, { slug });
    }
    return storageFailure(context, "content author insert failed", error);
  }

  logSecurityInfo({ event: "content author created", route: ROUTE, outcome: "ok", requestId });

  return NextResponse.json({ success: true, author: data?.[0] ?? null }, { status: 201 });
}
