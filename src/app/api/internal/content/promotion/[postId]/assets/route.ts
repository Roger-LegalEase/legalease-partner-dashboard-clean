import { NextResponse } from "next/server";
import { z } from "zod";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import {
  loadPromotionPost,
  promotionPostIsInScope
} from "@/lib/content/promotion-package";
import { recommendedPromotionTemplate } from "@/lib/content/promotion-studio";
import {
  jsonError,
  readJsonBody,
  requireSupabase,
  storageFailure,
  UUID_PATTERN,
  type RouteContext
} from "@/lib/content/route-support";
import { SOCIAL_ASSET_SIZES, SOCIAL_TEMPLATES } from "@/lib/content/types";
import { getSafeRequestId, logSecurityInfo } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/promotion/[postId]/assets";
const assetSchema = z.strictObject({
  template: z.enum(SOCIAL_TEMPLATES).optional(),
  headline: z.string().trim().min(1).max(180).optional()
});

/** Persist three deterministic, authenticated card variants. No image model or storage path is used. */
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("social.draft", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { postId } = await params;
  if (!UUID_PATTERN.test(postId)) return jsonError(400, "Invalid post id.");

  const parsed = await readJsonBody(request, assetSchema, context);
  if (!parsed.ok) return parsed.response;

  const { client, response } = requireSupabase(context);
  if (!client) return response;
  const post = await loadPromotionPost(client, postId);
  if (!post || !promotionPostIsInScope(gate.session, post)) return jsonError(404, "Post not found.");

  const template = parsed.data.template ?? recommendedPromotionTemplate(post.content_type);
  const headline = parsed.data.headline ?? post.title;
  const rows = SOCIAL_ASSET_SIZES.map((size) => {
    const params = new URLSearchParams({ template, size: size.key });
    return {
      post_id: postId,
      template,
      size_key: size.key,
      width: size.width,
      height: size.height,
      headline,
      // Authenticated renderer: draft headlines remain private, and no private Storage path leaks.
      // Public renderer still 404s until the article is public; the CMS uses a separate authenticated
      // preview URL, so draft asset rows never expose draft headlines anonymously.
      image_url: `/api/content/social-asset/${postId}?${params.toString()}`
    };
  });

  const { data, error } = await client
    .from("content_social_assets")
    .upsert(rows, { onConflict: "post_id,template,size_key" })
    .select("social_asset_id, post_id, template, size_key, width, height, image_url, headline, created_at");
  if (error) return storageFailure(context, "content social asset generation failed", error);

  logSecurityInfo({
    event: "content social assets generated",
    route: ROUTE,
    outcome: "ok",
    requestId,
    metadata: { row_id: postId }
  });

  return NextResponse.json({ success: true, assets: data ?? [], template, headline });
}
