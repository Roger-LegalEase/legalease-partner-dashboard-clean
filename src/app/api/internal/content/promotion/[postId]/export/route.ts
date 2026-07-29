import { NextResponse } from "next/server";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { getCommandCenterConfig } from "@/lib/content/command-center";
import {
  buildPromotionPackage,
  defaultCampaignName,
  loadPromotionPost,
  promotionPostIsInScope
} from "@/lib/content/promotion-package";
import { PROMOTION_CHANNEL_REGISTRY } from "@/lib/content/promotion-studio";
import { jsonError, requireSupabase, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import { recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityInfo } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/promotion/[postId]/export";

/**
 * The fallback path, and the reason the CMS is never blocked on an integration: export the exact
 * promotion package as a JSON file a human can work from. This route works with no Command Center
 * configured — that is its whole point.
 */
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("social.draft", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { postId } = await params;
  if (!UUID_PATTERN.test(postId)) return jsonError(400, "Invalid post id.");
  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const post = await loadPromotionPost(client, postId);
  if (!post || !promotionPostIsInScope(gate.session, post)) return jsonError(404, "Post not found.");

  const campaign = defaultCampaignName(post);
  const promotionPackage = await buildPromotionPackage(client, post, campaign);
  const config = getCommandCenterConfig();

  const body = {
    exported_at: new Date().toISOString(),
    campaign,
    // An honest statement of the integration state, in the file itself.
    command_center: config.configured
      ? { connected: true }
      : { connected: false, reason: config.reason },
    channel_field_labels: Object.fromEntries(
      Object.entries(PROMOTION_CHANNEL_REGISTRY).map(([channel, rule]) => [channel, rule.variantLabels])
    ),
    ...promotionPackage
  };

  await recordAudit({
    actorId: gate.session.userId,
    actorRole: gate.session.role,
    action: "promotion_exported",
    entityType: "content_post",
    entityId: postId,
    detail: { channels: promotionPackage.channels.length }
  });

  logSecurityInfo({ event: "content promotion exported", route: ROUTE, outcome: "ok", requestId, metadata: { row_id: postId } });

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="promotion-${post.slug}.json"`,
      "cache-control": "no-store"
    }
  });
}
