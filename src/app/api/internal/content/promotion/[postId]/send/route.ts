import { NextResponse } from "next/server";
import { z } from "zod";

import { recordServerFunnelEvent } from "@/lib/analytics/server-events";
import { denyUnlessContentCapability } from "@/lib/content/auth";
import {
  buildPromotionEnvelope,
  deliverEnvelope,
  nextAttemptDelaySeconds,
  promotionIdempotencyKey
} from "@/lib/content/command-center";
import { buildPromotionPackage, defaultCampaignName, loadPromotionPost } from "@/lib/content/promotion-package";
import {
  isUniqueViolation,
  jsonError,
  readJsonBody,
  requireSupabase,
  storageFailure,
  UUID_PATTERN,
  type RouteContext
} from "@/lib/content/route-support";
import { recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/promotion/[postId]/send";
const EVENT_TYPE = "content.promotion.requested" as const;

const sendSchema = z.strictObject({
  /** Re-sending an existing campaign. Same campaign => same idempotency key => de-duplicated. */
  campaignId: z.string().regex(UUID_PATTERN, "Must be a UUID.").optional(),
  name: z.string().trim().min(1).max(120).optional()
});

/**
 * Hand a promotion package to the Command Center through a transactional outbox.
 *
 * THIS ROUTE NEVER PUBLISHES THE POST. Publishing an article and promoting it are separate actions
 * with separate capabilities; nothing below writes to content_posts.
 *
 * Failure is never dressed up as success: with no Command Center configured we return sent:false /
 * reason:"unconfigured" and leave the outbox row pending, rather than reporting a send that did not
 * happen.
 */
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("social.send", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { postId } = await params;
  if (!UUID_PATTERN.test(postId)) return jsonError(400, "Invalid post id.");

  const parsed = await readJsonBody(request, sendSchema, context);
  if (!parsed.ok) return parsed.response;

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const post = await loadPromotionPost(client, postId);
  if (!post) return jsonError(404, "Post not found.");

  const campaignName = parsed.data.name ?? defaultCampaignName(post);
  const promotionPackage = await buildPromotionPackage(client, post, campaignName);

  if (!promotionPackage.channels.length) {
    return jsonError(422, "There are no social drafts to promote for this post.", { code: "no_channels" });
  }

  // --- 1. Campaign -------------------------------------------------------------------------------
  // A campaign is stable per (post, name) so a double-clicked send reuses it, produces the same
  // idempotency key, and is de-duplicated rather than fanning out a second delivery.
  let campaignId: string | null = null;

  if (parsed.data.campaignId) {
    const { data } = await client
      .from("content_campaigns")
      .select("campaign_id, post_id")
      .eq("campaign_id", parsed.data.campaignId)
      .limit(1);

    const existing = (data?.[0] ?? null) as { campaign_id: string; post_id: string | null } | null;
    if (!existing || existing.post_id !== postId) {
      return jsonError(404, "That campaign does not belong to this post.");
    }
    campaignId = existing.campaign_id;
  } else {
    const { data } = await client
      .from("content_campaigns")
      .select("campaign_id")
      .eq("post_id", postId)
      .eq("name", campaignName)
      .limit(1);

    campaignId = (data?.[0] as { campaign_id: string } | undefined)?.campaign_id ?? null;
  }

  if (!campaignId) {
    const { data, error } = await client
      .from("content_campaigns")
      .insert({
        post_id: postId,
        name: campaignName,
        destination: post.destination,
        status: "draft",
        created_by: gate.session.userId
      })
      .select("campaign_id")
      .limit(1);

    if (error || !data?.length) {
      return storageFailure(context, "content campaign insert failed", error);
    }
    campaignId = (data[0] as { campaign_id: string }).campaign_id;
  }

  // --- 2. Campaign channels ----------------------------------------------------------------------
  const { data: draftRows } = await client
    .from("content_social_drafts")
    .select("social_draft_id, channel")
    .eq("post_id", postId);

  const draftIdByChannel = new Map(
    ((draftRows ?? []) as { social_draft_id: string; channel: string }[]).map((row) => [row.channel, row.social_draft_id])
  );

  const { error: channelsError } = await client.from("content_campaign_channels").upsert(
    promotionPackage.channels.map((channel) => ({
      campaign_id: campaignId,
      channel: channel.channel,
      social_draft_id: draftIdByChannel.get(channel.channel) ?? null,
      // delivery_status is only ever set from a Command Center callback. We never claim 'published'.
      delivery_status: "pending"
    })),
    { onConflict: "campaign_id,channel" }
  );

  if (channelsError) {
    return storageFailure(context, "content campaign channels upsert failed", channelsError);
  }

  // --- 3. Outbox ---------------------------------------------------------------------------------
  const idempotencyKey = promotionIdempotencyKey(postId, campaignId, EVENT_TYPE);
  const envelope = buildPromotionEnvelope({
    eventType: EVENT_TYPE,
    idempotencyKey,
    payload: promotionPackage
  });

  const { data: outboxRows, error: outboxError } = await client
    .from("content_promotion_outbox")
    .insert({
      event_id: envelope.event_id,
      event_type: EVENT_TYPE,
      idempotency_key: idempotencyKey,
      post_id: postId,
      campaign_id: campaignId,
      payload: envelope,
      status: "pending"
    })
    .select("event_id, attempts, max_attempts")
    .limit(1);

  if (outboxError) {
    // A duplicate key means this exact promotion is already queued or delivered. That is a success
    // condition for the caller, not a 500.
    if (isUniqueViolation(outboxError)) {
      logSecurityInfo({ event: "content promotion duplicate", route: ROUTE, outcome: "duplicate", requestId, metadata: { row_id: postId } });
      return NextResponse.json({ success: true, duplicate: true, sent: false, campaignId, reason: "already_queued" });
    }
    return storageFailure(context, "content promotion outbox insert failed", outboxError);
  }

  const outbox = (outboxRows?.[0] ?? null) as { event_id: string; attempts: number; max_attempts: number } | null;
  if (!outbox) {
    return storageFailure(context, "content promotion outbox insert failed", null);
  }

  // --- 4. Delivery -------------------------------------------------------------------------------
  const delivery = await deliverEnvelope(envelope);

  if (!delivery.ok && delivery.kind === "unconfigured") {
    // HONEST DISABLED STATE. The row stays pending; the CMS shows "not connected" and offers export.
    logSecurityWarn({
      event: "content promotion not delivered",
      route: ROUTE,
      outcome: "unconfigured",
      requestId,
      metadata: { row_id: postId, error_code: delivery.reason }
    });

    await recordAudit({
      actorId: gate.session.userId,
      actorRole: gate.session.role,
      action: "promotion_prepared",
      entityType: "content_post",
      entityId: postId,
      detail: { campaign_id: campaignId, reason: delivery.reason, delivered: false }
    });

    return NextResponse.json({
      success: true,
      sent: false,
      duplicate: false,
      reason: "unconfigured",
      detail: delivery.reason,
      campaignId,
      eventId: outbox.event_id,
      outboxStatus: "pending"
    });
  }

  if (delivery.ok) {
    const deliveredAt = new Date().toISOString();

    await client
      .from("content_promotion_outbox")
      .update({ status: "sent", delivered_at: deliveredAt, attempts: outbox.attempts + 1, last_error: null })
      .eq("event_id", outbox.event_id);

    await client.from("content_campaigns").update({ status: "sent" }).eq("campaign_id", campaignId);

    await recordAudit({
      actorId: gate.session.userId,
      actorRole: gate.session.role,
      action: "promotion_sent",
      entityType: "content_post",
      entityId: postId,
      detail: { campaign_id: campaignId, channels: promotionPackage.channels.length, delivered: true }
    });

    // Server-confirmed: this fires only because the Command Center actually accepted the delivery.
    void recordServerFunnelEvent(request, "content_promotion_sent", {
      idempotencySeed: idempotencyKey,
      meta: {
        destination: post.destination,
        content_type: post.content_type,
        channels: promotionPackage.channels.length
      }
    });

    logSecurityInfo({ event: "content promotion sent", route: ROUTE, outcome: "ok", requestId, metadata: { row_id: postId } });

    return NextResponse.json({
      success: true,
      sent: true,
      duplicate: false,
      campaignId,
      eventId: outbox.event_id,
      outboxStatus: "sent"
    });
  }

  // --- 5. Failure: retry with backoff ------------------------------------------------------------
  const attempts = outbox.attempts + 1;
  const dead = attempts >= outbox.max_attempts;
  const lastError =
    delivery.kind === "rejected" ? `HTTP ${delivery.status}: ${delivery.body}`.slice(0, 500) : delivery.error.slice(0, 500);

  await client
    .from("content_promotion_outbox")
    .update({
      status: dead ? "dead" : "pending",
      attempts,
      last_error: lastError,
      next_attempt_at: new Date(Date.now() + nextAttemptDelaySeconds(attempts) * 1000).toISOString()
    })
    .eq("event_id", outbox.event_id);

  logSecurityError({
    event: "content promotion delivery failed",
    route: ROUTE,
    outcome: dead ? "dead" : "retry_scheduled",
    requestId,
    metadata: { row_id: postId, error_code: delivery.kind }
  });

  await recordAudit({
    actorId: gate.session.userId,
    actorRole: gate.session.role,
    action: "promotion_prepared",
    entityType: "content_post",
    entityId: postId,
    detail: { campaign_id: campaignId, delivered: false, reason: delivery.kind, attempts }
  });

  return NextResponse.json(
    {
      success: true,
      sent: false,
      duplicate: false,
      queued: !dead,
      reason: delivery.kind,
      campaignId,
      eventId: outbox.event_id,
      outboxStatus: dead ? "dead" : "pending",
      retryInSeconds: dead ? null : nextAttemptDelaySeconds(attempts)
    },
    { status: 202 }
  );
}
