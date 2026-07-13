import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { buildSocialCardElement } from "@/lib/content/social-card";
import { UUID_PATTERN } from "@/lib/content/route-support";
import {
  SOCIAL_ASSET_SIZES,
  type ContentDestination,
  type ContentType,
  type SocialTemplate,
  isPubliclyVisibleStatus
} from "@/lib/content/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OG_SIZE = SOCIAL_ASSET_SIZES[0]; // 1200x630

/** The card template that suits each content type. */
const TEMPLATE_FOR_TYPE: Record<ContentType, SocialTemplate> = {
  blog_article: "editorial_cover",
  product_announcement: "product_announcement",
  founder_note: "founder_note",
  partner_insight: "partner_spotlight",
  partner_story: "partner_spotlight",
  testimonial_story: "quote_card",
  state_resource: "state_resource",
  downloadable_resource: "editorial_cover",
  resource_guide: "editorial_cover"
};

type OgPostRow = {
  status: string;
  destination: ContentDestination;
  content_type: ContentType;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  og_title: string | null;
  og_description: string | null;
  jurisdiction_code: string | null;
  published_at: string | null;
};

/**
 * The public OG image. This is the ONE unauthenticated image route, so it is strictly limited to
 * content the public can already read: a draft, scheduled, in-review, or archived post is a 404 here,
 * exactly as it is a 404 on the website. A leaked draft headline in a link preview is still a leak.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;

  if (!UUID_PATTERN.test(postId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data, error } = await supabase
    .from("content_posts")
    .select("status, destination, content_type, title, subtitle, excerpt, og_title, og_description, jurisdiction_code, published_at")
    .eq("post_id", postId)
    .in("status", ["published", "updated"])
    .lte("published_at", new Date().toISOString())
    .limit(1);

  if (error || !data || !data.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const post = data[0] as unknown as OgPostRow;

  // Belt and braces: the query already filtered, and the status is checked again here.
  if (!isPubliclyVisibleStatus(post.status)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const element = buildSocialCardElement({
    template: TEMPLATE_FOR_TYPE[post.content_type] ?? "editorial_cover",
    destination: post.destination,
    width: OG_SIZE.width,
    height: OG_SIZE.height,
    title: post.og_title?.trim() || post.title,
    subtitle: post.og_description?.trim() || post.subtitle || post.excerpt,
    stateCode: post.jurisdiction_code
  });

  return new ImageResponse(element, {
    width: OG_SIZE.width,
    height: OG_SIZE.height,
    headers: {
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
    }
  });
}
