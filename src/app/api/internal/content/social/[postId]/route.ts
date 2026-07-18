import { NextResponse } from "next/server";
import { z } from "zod";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { buildTrackedLink } from "@/lib/content/command-center";
import {
  guardPromotionDraftForApproval,
  loadPromotionProviderSource
} from "@/lib/content/promotion-generation";
import {
  canonicalUrlForPost,
  defaultCampaignName,
  loadPromotionPost,
  promotionPostIsInScope
} from "@/lib/content/promotion-package";
import { normalizeHashtags, PROMOTION_CHANNEL_REGISTRY } from "@/lib/content/promotion-studio";
import { jsonError, readJsonBody, requireSupabase, storageFailure, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import {
  SOCIAL_CHANNELS,
  SOCIAL_CHANNEL_LIMITS,
  requiresLegalReview,
  type SocialChannel
} from "@/lib/content/types";
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
type ExistingDraft = {
  channel: SocialChannel;
  primary_caption: string | null;
  alternate_caption: string | null;
  founder_voice_caption: string | null;
  partner_caption: string | null;
  hashtags: unknown;
  mention_tags: unknown;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  social_asset_id: string | null;
  approval_state: string;
};

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

  const post = await loadPromotionPost(client, postId);
  if (!post || !promotionPostIsInScope(gate.session, post)) return jsonError(404, "Post not found.");

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
  if (!promotionPostIsInScope(gate.session, post)) return jsonError(404, "Post not found.");

  const canonical = canonicalUrlForPost(post);
  const campaign = input.campaign ?? defaultCampaignName(post);

  const { data: existingData, error: existingError } = await client
    .from("content_social_drafts")
    .select(DRAFT_SELECT)
    .eq("post_id", postId)
    .in("channel", input.channels.map((channel) => channel.channel));
  if (existingError) return storageFailure(context, "content social draft comparison read failed", existingError);
  const existingByChannel = new Map(
    ((existingData ?? []) as unknown as ExistingDraft[]).map((draft) => [draft.channel, draft])
  );

  const selectedAssetIds = input.channels
    .map((channel) => channel.socialAssetId)
    .filter((assetId): assetId is string => Boolean(assetId));
  const validAssetIds = new Set<string>();
  if (selectedAssetIds.length) {
    const { data: assetRows, error: assetError } = await client
      .from("content_social_assets")
      .select("social_asset_id")
      .eq("post_id", postId)
      .in("social_asset_id", selectedAssetIds);
    if (assetError) return storageFailure(context, "content social asset validation failed", assetError);
    for (const row of (assetRows ?? []) as { social_asset_id: string }[]) validAssetIds.add(row.social_asset_id);
    if (selectedAssetIds.some((assetId) => !validAssetIds.has(assetId))) {
      return jsonError(400, "The selected social asset is not available for this post.");
    }
  }

  const legalPromotionBlocked =
    requiresLegalReview(post.content_type, post.legal_sensitive) && !post.legal_approved_at;
  const approvalRequested = input.channels.some((channel) => channel.approvalState === "approved");
  const approvalSource = approvalRequested ? await loadPromotionProviderSource(client, postId) : null;
  if (approvalRequested && !approvalSource) {
    return storageFailure(context, "content promotion approval source read failed", null);
  }
  const resetChannels: SocialChannel[] = [];

  const now = new Date().toISOString();
  const rows = input.channels.map((channel) => {
    const existing = existingByChannel.get(channel.channel);
    const normalized = {
      primary_caption: channel.primaryCaption ?? null,
      alternate_caption: channel.alternateCaption ?? null,
      founder_voice_caption: channel.founderVoiceCaption ?? null,
      partner_caption: channel.partnerCaption ?? null,
      hashtags: normalizeHashtags(channel.hashtags ?? [], channel.channel),
      mention_tags: channel.mentionTags ?? [],
      utm_source: channel.utmSource ?? PROMOTION_CHANNEL_REGISTRY[channel.channel].utmSource,
      utm_medium: channel.utmMedium ?? PROMOTION_CHANNEL_REGISTRY[channel.channel].utmMedium,
      utm_campaign: channel.utmCampaign ?? campaign,
      social_asset_id: channel.socialAssetId ?? null
    };
    const changed = existing ? draftContentChanged(existing, normalized) : true;
    let approvalState = channel.approvalState ?? "draft";
    if (existing && ["approved", "sent", "failed"].includes(existing.approval_state) && changed) {
      approvalState = "draft";
      resetChannels.push(channel.channel);
    }
    return {
      post_id: postId,
      channel: channel.channel,
      ...normalized,
      approval_state: approvalState,
      approved_by: approvalState === "approved" ? gate.session.userId : null,
      approved_at: approvalState === "approved" ? now : null
    };
  });

  for (const row of rows) {
    if (row.approval_state !== "approved") continue;
    if (!row.primary_caption?.trim()) {
      return jsonError(422, `${PROMOTION_CHANNEL_REGISTRY[row.channel].label} needs primary copy before approval.`, {
        code: "primary_copy_required"
      });
    }
    if (legalPromotionBlocked) {
      return jsonError(422, "Legally sensitive promotion cannot be approved before the article completes legal review.", {
        code: "legal_review_required"
      });
    }
    if (PROMOTION_CHANNEL_REGISTRY[row.channel].assetRequired && !row.social_asset_id) {
      return jsonError(422, `${PROMOTION_CHANNEL_REGISTRY[row.channel].label} needs a selected branded asset before approval.`, {
        code: "social_asset_required"
      });
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(row.utm_campaign)) {
      return jsonError(422, "UTM campaign must use letters, numbers, dots, underscores, or dashes.", {
        code: "invalid_utm_campaign"
      });
    }
    const groundingIssues = guardPromotionDraftForApproval(approvalSource!.source, row.channel, {
      primaryCaption: row.primary_caption,
      alternateCaption: row.alternate_caption,
      founderVoiceCaption: row.founder_voice_caption,
      partnerCaption: row.partner_caption,
      mentionTags: row.mention_tags
    }).filter((issue) => issue.severity === "blocker");
    if (groundingIssues.length) {
      return jsonError(422, `${PROMOTION_CHANNEL_REGISTRY[row.channel].label} has source-grounding issues that block approval.`, {
        code: "promotion_grounding_blocked",
        problems: groundingIssues.map((issue) => ({
          channel: issue.channel,
          field: issue.field,
          code: issue.code,
          message: issue.message
        }))
      });
    }
  }

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

  return NextResponse.json({ success: true, drafts: data ?? [], links, campaign, approvalReset: resetChannels });
}

function draftContentChanged(
  existing: ExistingDraft,
  next: {
    primary_caption: string | null;
    alternate_caption: string | null;
    founder_voice_caption: string | null;
    partner_caption: string | null;
    hashtags: string[];
    mention_tags: string[];
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string;
    social_asset_id: string | null;
  }
): boolean {
  const arrays = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return (
    existing.primary_caption !== next.primary_caption ||
    existing.alternate_caption !== next.alternate_caption ||
    existing.founder_voice_caption !== next.founder_voice_caption ||
    existing.partner_caption !== next.partner_caption ||
    JSON.stringify(arrays(existing.hashtags)) !== JSON.stringify(next.hashtags) ||
    JSON.stringify(arrays(existing.mention_tags)) !== JSON.stringify(next.mention_tags) ||
    existing.utm_source !== next.utm_source ||
    existing.utm_medium !== next.utm_medium ||
    existing.utm_campaign !== next.utm_campaign ||
    existing.social_asset_id !== next.social_asset_id
  );
}
