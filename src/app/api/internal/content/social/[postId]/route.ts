import { NextResponse } from "next/server";
import { z } from "zod";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { buildTrackedLink } from "@/lib/content/command-center";
import { canonicalUrlForPost, defaultCampaignName, loadPromotionPost } from "@/lib/content/promotion-package";
import { jsonError, readJsonBody, requireSupabase, storageFailure, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import { SOCIAL_CHANNELS, SOCIAL_CHANNEL_LIMITS, type SocialChannel } from "@/lib/content/types";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/social/[postId]";

const DRAFT_SELECT =
  "social_draft_id, post_id, channel, primary_caption, alternate_caption, founder_voice_caption, partner_caption, hashtags, mention_tags, utm_source, utm_medium, utm_campaign, social_asset_id, approval_state, approved_by, approved_at, created_at, updated_at";

const ASSET_SELECT = "social_asset_id, post_id, template, size_key, width, height, image_url, headline, created_at";

const channelSchema = z.strictObject({
  channel: z.enum(SOCIAL_CHANNELS),
  primaryCaption: z.string().nullish(),
  alternateCaption: z.string().nullish(),
  founderVoiceCaption: z.string().nullish(),
  partnerCaption: z.string().nullish(),
  hashtags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  mentionTags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  utmSource: z.string().trim().max(80).nullish(),
  utmMedium: z.string().trim().max(80).nullish(),
  utmCampaign: z.string().trim().max(120).nullish(),
  socialAssetId: z.string().regex(UUID_PATTERN, "Must be a UUID.").nullish(),
  // Delivery-owned states (sent/failed) may only arrive through the signed Command Center callback.
  approvalState: z.enum(["draft", "approved"]).optional()
});

const upsertSchema = z.strictObject({
  campaign: z.string().trim().min(1).max(120).optional(),
  channels: z.array(channelSchema).min(1).max(SOCIAL_CHANNELS.length)
});

/** The caption fields a channel limit applies to. */
const CAPTION_FIELDS = [
  ["primaryCaption", "primary_caption"],
  ["alternateCaption", "alternate_caption"],
  ["founderVoiceCaption", "founder_voice_caption"],
  ["partnerCaption", "partner_caption"]
] as const;

type ChannelInput = z.infer<typeof channelSchema>;

/**
 * Hard per-channel caption limits. A 300-character caption sent to X is not a warning: the network
 * would reject or truncate it, so we refuse it here and name the channel that is over.
 */
function overLimitProblems(input: ChannelInput): { channel: SocialChannel; field: string; length: number; limit: number; message: string }[] {
  const limit = SOCIAL_CHANNEL_LIMITS[input.channel];
  const problems: { channel: SocialChannel; field: string; length: number; limit: number; message: string }[] = [];

  for (const [camel] of CAPTION_FIELDS) {
    const value = input[camel];
    if (typeof value !== "string") continue;
    if (value.length > limit) {
      problems.push({
        channel: input.channel,
        field: camel,
        length: value.length,
        limit,
        message: `The ${input.channel} ${camel} is ${value.length} characters; the limit is ${limit}.`
      });
    }
  }

  return problems;
}

export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.read", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { postId } = await params;
  if (!UUID_PATTERN.test(postId)) return jsonError(400, "Invalid post id.");

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const [drafts, assets] = await Promise.all([
    client.from("content_social_drafts").select(DRAFT_SELECT).eq("post_id", postId).order("channel"),
    client.from("content_social_assets").select(ASSET_SELECT).eq("post_id", postId).order("created_at")
  ]);

  if (drafts.error) return storageFailure(context, "content social drafts read failed", drafts.error);
  if (assets.error) return storageFailure(context, "content social assets read failed", assets.error);

  return NextResponse.json({
    success: true,
    limits: SOCIAL_CHANNEL_LIMITS,
    drafts: drafts.data ?? [],
    assets: assets.data ?? []
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("social.draft", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { postId } = await params;
  if (!UUID_PATTERN.test(postId)) return jsonError(400, "Invalid post id.");

  const parsed = await readJsonBody(request, upsertSchema, context);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  if (input.channels.some((channel) => channel.approvalState === "approved")) {
    const approvalGate = await denyUnlessContentCapability("social.approve", ROUTE, requestId);
    if (approvalGate.denied) return approvalGate.denied;
  }

  // One channel may appear once per request.
  const seen = new Set<string>();
  for (const channel of input.channels) {
    if (seen.has(channel.channel)) {
      return jsonError(400, `The ${channel.channel} channel appears more than once.`);
    }
    seen.add(channel.channel);
  }

  const problems = input.channels.flatMap(overLimitProblems);
  if (problems.length) {
    logSecurityWarn({ event: "content social draft over limit", route: ROUTE, outcome: "caption_too_long", requestId });
    return jsonError(422, problems[0].message, { code: "caption_too_long", problems });
  }

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const post = await loadPromotionPost(client, postId);
  if (!post) return jsonError(404, "Post not found.");

  const canonical = canonicalUrlForPost(post);
  const campaign = input.campaign ?? defaultCampaignName(post);

  const now = new Date().toISOString();
  const rows = input.channels.map((channel) => ({
    post_id: postId,
    channel: channel.channel,
    primary_caption: channel.primaryCaption ?? null,
    alternate_caption: channel.alternateCaption ?? null,
    founder_voice_caption: channel.founderVoiceCaption ?? null,
    partner_caption: channel.partnerCaption ?? null,
    hashtags: channel.hashtags ?? [],
    mention_tags: channel.mentionTags ?? [],
    utm_source: channel.utmSource ?? null,
    utm_medium: channel.utmMedium ?? null,
    utm_campaign: channel.utmCampaign ?? campaign,
    social_asset_id: channel.socialAssetId ?? null,
    approval_state: channel.approvalState ?? "draft",
    approved_by: channel.approvalState === "approved" ? gate.session.userId : null,
    approved_at: channel.approvalState === "approved" ? now : null
  }));

  const { data, error } = await client
    .from("content_social_drafts")
    .upsert(rows, { onConflict: "post_id,channel" })
    .select(DRAFT_SELECT);

  if (error) return storageFailure(context, "content social draft upsert failed", error);

  // The tracked link each channel will actually share.
  const links = input.channels.map((channel) => ({
    channel: channel.channel,
    link: buildTrackedLink(canonical, channel.channel, campaign, {
      source: channel.utmSource,
      medium: channel.utmMedium,
      campaign: channel.utmCampaign ?? campaign
    })
  }));

  logSecurityInfo({ event: "content social drafts saved", route: ROUTE, outcome: "ok", requestId, metadata: { row_id: postId } });

  return NextResponse.json({ success: true, drafts: data ?? [], links, campaign });
}
