import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { loadPromotionPost } from "@/lib/content/promotion-package";
import { buildSocialCardElement } from "@/lib/content/social-card";
import { UUID_PATTERN } from "@/lib/content/route-support";
import {
  SOCIAL_ASSET_SIZES,
  type SocialTemplate,
  isPubliclyVisibleStatus,
  isSocialTemplate
} from "@/lib/content/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOCIAL_MEDIA_PERMISSIONS = new Set(["owned", "licensed", "partner_approved", "editorial_use"]);

/** Public social asset renderer. It is as strict as the public article/OG route: drafts always 404. */
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!UUID_PATTERN.test(postId)) return new NextResponse("Not found", { status: 404 });

  const query = new URL(request.url).searchParams;
  const template = query.get("template") ?? "editorial_cover";
  const sizeKey = query.get("size") ?? "og";
  if (!isSocialTemplate(template)) return new NextResponse("Not found", { status: 404 });
  const size = SOCIAL_ASSET_SIZES.find((candidate) => candidate.key === sizeKey);
  if (!size) return new NextResponse("Not found", { status: 404 });

  const client = getSupabaseAdminClient();
  if (!client) return new NextResponse("Not found", { status: 404 });
  const post = await loadPromotionPost(client, postId);
  if (
    !post ||
    !isPubliclyVisibleStatus(post.status) ||
    !post.published_at ||
    Date.parse(post.published_at) > Date.now()
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [{ data: assetRows }, featuredImageUrl] = await Promise.all([
    client
      .from("content_social_assets")
      .select("headline")
      .eq("post_id", postId)
      .eq("template", template)
      .eq("size_key", sizeKey)
      .limit(1),
    resolveFeaturedImage(client, post.featured_media_id)
  ]);
  const savedHeadline = (assetRows?.[0] as { headline?: unknown } | undefined)?.headline;
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
    headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" }
  });
}

async function resolveFeaturedImage(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  mediaId: string | null
): Promise<string | null> {
  if (!mediaId) return null;
  const { data } = await client
    .from("content_media")
    .select("storage_path, public_url, permission_status")
    .eq("media_id", mediaId)
    .limit(1);
  const media = data?.[0] as
    | { storage_path?: unknown; public_url?: unknown; permission_status?: unknown }
    | undefined;
  if (!media || !SOCIAL_MEDIA_PERMISSIONS.has(String(media.permission_status ?? ""))) return null;
  const publicUrl = safeHttpUrl(media.public_url);
  if (publicUrl) return publicUrl;
  if (typeof media.storage_path !== "string") return null;
  const signed = await client.storage.from("content-media").createSignedUrl(media.storage_path, 60);
  return safeHttpUrl(signed.data?.signedUrl);
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
