import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { absoluteExpungementAiUrl, absolutePartnerAppUrl } from "@/lib/app-url";
import {
  buildTrackedLink,
  type PromotionChannelPackage,
  type PromotionPackage
} from "@/lib/content/command-center";
import {
  type ContentDestination,
  type ContentType,
  type SocialChannel,
  isSocialChannel
} from "@/lib/content/types";

/**
 * Assembling the promotion package is shared by three routes (social draft save, promotion export,
 * promotion send) so all three agree on the canonical URL, the UTM campaign name, and the channel
 * ordering. A divergence here would mean the JSON an editor exports is not the JSON we actually
 * hand to the Command Center.
 */

export type PromotionPostRow = {
  post_id: string;
  slug: string;
  destination: ContentDestination;
  content_type: ContentType;
  status: string;
  title: string;
  subtitle: string | null;
  canonical_url: string | null;
  published_at: string | null;
  content_authors: { name: string } | { name: string }[] | null;
};

const POST_SELECT =
  "post_id, slug, destination, content_type, status, title, subtitle, canonical_url, published_at, content_authors:author_id ( name )";

type SocialDraftRow = {
  social_draft_id: string;
  channel: string;
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

type SocialAssetRow = {
  social_asset_id: string;
  template: string;
  size_key: string;
  width: number;
  height: number;
  image_url: string | null;
};

/**
 * The public URL of a post. A post may carry an explicit canonical_url; otherwise it is derived from
 * the destination, exactly as the public reader derives it (src/lib/content/repository.ts).
 */
export function canonicalUrlForPost(post: {
  destination: ContentDestination;
  content_type: ContentType;
  slug: string;
  canonical_url?: string | null;
}): string {
  if (post.canonical_url?.trim()) {
    return post.canonical_url.trim();
  }
  if (post.destination === "expungement_ai") {
    return absoluteExpungementAiUrl(`/blog/${post.slug}`);
  }
  const segment = post.content_type === "partner_story" ? "partner-stories" : "insights";
  return absolutePartnerAppUrl(`/${segment}/${post.slug}`);
}

/** The default UTM campaign name for a post. Stable, so re-running promotion keeps one campaign. */
export function defaultCampaignName(post: { slug: string }): string {
  return post.slug;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function loadPromotionPost(
  client: SupabaseClient,
  postId: string
): Promise<PromotionPostRow | null> {
  const { data, error } = await client
    .from("content_posts")
    .select(POST_SELECT)
    .eq("post_id", postId)
    .limit(1);

  if (error || !data || !data.length) return null;
  return data[0] as unknown as PromotionPostRow;
}

/**
 * Build the promotion package for a post from its saved social drafts and rendered social assets.
 * Works with zero drafts (an empty channel list) — the export route must still produce a file.
 */
export async function buildPromotionPackage(
  client: SupabaseClient,
  post: PromotionPostRow,
  campaignName: string
): Promise<PromotionPackage> {
  const [{ data: draftData }, { data: assetData }] = await Promise.all([
    client
      .from("content_social_drafts")
      .select(
        "social_draft_id, channel, primary_caption, alternate_caption, founder_voice_caption, partner_caption, hashtags, mention_tags, utm_source, utm_medium, utm_campaign, social_asset_id, approval_state"
      )
      .eq("post_id", post.post_id)
      .order("channel", { ascending: true }),
    client
      .from("content_social_assets")
      .select("social_asset_id, template, size_key, width, height, image_url")
      .eq("post_id", post.post_id)
  ]);

  const drafts = ((draftData ?? []) as unknown as SocialDraftRow[]).filter((row) => isSocialChannel(row.channel));
  const assets = (assetData ?? []) as unknown as SocialAssetRow[];
  const assetById = new Map(assets.map((asset) => [asset.social_asset_id, asset]));

  const canonical = canonicalUrlForPost(post);

  const channels: PromotionChannelPackage[] = drafts.map((draft) => {
    const channel = draft.channel as SocialChannel;
    const asset = draft.social_asset_id ? assetById.get(draft.social_asset_id) : undefined;

    return {
      channel,
      primary_caption: draft.primary_caption,
      alternate_caption: draft.alternate_caption,
      founder_voice_caption: draft.founder_voice_caption,
      partner_caption: draft.partner_caption,
      hashtags: stringArray(draft.hashtags),
      mention_tags: stringArray(draft.mention_tags),
      link: buildTrackedLink(canonical, channel, campaignName, {
        source: draft.utm_source,
        medium: draft.utm_medium,
        campaign: draft.utm_campaign
      }),
      asset:
        asset && asset.image_url
          ? { url: asset.image_url, width: asset.width, height: asset.height, template: asset.template }
          : null
    };
  });

  return {
    post: {
      id: post.post_id,
      slug: post.slug,
      destination: post.destination,
      content_type: post.content_type,
      title: post.title,
      subtitle: post.subtitle,
      canonical_url: canonical,
      published_at: post.published_at,
      author: firstRelation(post.content_authors)?.name ?? null
    },
    channels
  };
}
