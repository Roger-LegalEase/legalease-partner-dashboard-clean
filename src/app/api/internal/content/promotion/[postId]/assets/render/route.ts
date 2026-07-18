import { ImageResponse } from "next/og";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import {
  loadPromotionPost,
  promotionPostIsInScope
} from "@/lib/content/promotion-package";
import { jsonError, requireSupabase, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import { buildSocialCardElement } from "@/lib/content/social-card";
import {
  SOCIAL_ASSET_SIZES,
  type SocialTemplate,
  isSocialTemplate
} from "@/lib/content/types";
import { getSafeRequestId } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/promotion/[postId]/assets/render";
const SOCIAL_MEDIA_PERMISSIONS = new Set(["owned", "licensed", "partner_approved", "editorial_use"]);

/** Authenticated deterministic renderer. Draft copy and private media paths never leave the server. */
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };
  const gate = await denyUnlessContentCapability("content.read", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { postId } = await params;
  if (!UUID_PATTERN.test(postId)) return jsonError(400, "Invalid post id.");

  const query = new URL(request.url).searchParams;
  const template = query.get("template") ?? "editorial_cover";
  if (!isSocialTemplate(template)) return jsonError(400, "Unknown social template.");
  const sizeKey = query.get("size") ?? "og";
  const size = SOCIAL_ASSET_SIZES.find((candidate) => candidate.key === sizeKey);
  if (!size) return jsonError(400, "Unknown social asset size.");

  const { client, response } = requireSupabase(context);
  if (!client) return response;
  const post = await loadPromotionPost(client, postId);
  if (!post || !promotionPostIsInScope(gate.session, post)) return jsonError(404, "Post not found.");

  const { data: assetRows } = await client
    .from("content_social_assets")
    .select("headline")
    .eq("post_id", postId)
    .eq("template", template)
    .eq("size_key", sizeKey)
    .limit(1);
  const savedHeadline = (assetRows?.[0] as { headline?: unknown } | undefined)?.headline;

  let featuredImageUrl: string | null = null;
  if (post.featured_media_id) {
    const { data } = await client
      .from("content_media")
      .select("storage_path, public_url, permission_status")
      .eq("media_id", post.featured_media_id)
      .limit(1);
    const media = data?.[0] as
      | { storage_path?: unknown; public_url?: unknown; permission_status?: unknown }
      | undefined;
    if (media && SOCIAL_MEDIA_PERMISSIONS.has(String(media.permission_status ?? ""))) {
      featuredImageUrl = safeHttpUrl(media.public_url);
      if (!featuredImageUrl && typeof media.storage_path === "string") {
        const signed = await client.storage.from("content-media").createSignedUrl(media.storage_path, 60);
        featuredImageUrl = safeHttpUrl(signed.data?.signedUrl);
      }
    }
  }

  const author = Array.isArray(post.content_authors) ? post.content_authors[0] : post.content_authors;
  const element = buildSocialCardElement({
    template: template as SocialTemplate,
    destination: post.destination,
    width: size.width,
    height: size.height,
    title: typeof savedHeadline === "string" && savedHeadline.trim() ? savedHeadline : post.title,
    subtitle: post.subtitle,
    attribution: author?.name ?? null,
    stateCode: post.jurisdiction_code,
    featuredImageUrl
  });

  return new ImageResponse(element, {
    width: size.width,
    height: size.height,
    headers: { "cache-control": "private, no-store" }
  });
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
