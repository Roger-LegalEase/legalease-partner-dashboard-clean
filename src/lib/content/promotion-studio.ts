import {
  SOCIAL_CHANNEL_LIMITS,
  type ContentType,
  type SocialAssetSizeKey,
  type SocialChannel,
  type SocialTemplate
} from "@/lib/content/types";

/**
 * Promotion Studio's isomorphic product registry.
 *
 * Channel language, limits, tracking defaults, field labels, and creative recommendations live in
 * one place so the browser, APIs, export, and verifiers cannot quietly drift apart.
 */

export const PROMOTION_CLASSIFICATIONS = [
  "Product announcement",
  "Founder thought leadership",
  "Legal education",
  "Record-clearing resource",
  "State resource",
  "Partner spotlight",
  "Testimonial or participant story",
  "Program impact",
  "Data or research",
  "How-to guide",
  "General editorial"
] as const;
export type PromotionClassification = (typeof PROMOTION_CLASSIFICATIONS)[number];

export const PROMOTION_OBJECTIVES = [
  "Awareness",
  "Education",
  "Product adoption",
  "Partner acquisition",
  "Community engagement",
  "Event or launch promotion",
  "Resource distribution",
  "Thought leadership"
] as const;
export type PromotionObjective = (typeof PROMOTION_OBJECTIVES)[number];

export const PROMOTION_TONES = [
  "Professional",
  "Warm",
  "Direct",
  "Founder",
  "Partner-facing",
  "Community",
  "Educational",
  "Launch announcement"
] as const;
export type PromotionTone = (typeof PROMOTION_TONES)[number];

export const PROMOTION_VARIANTS = [
  "primaryCaption",
  "alternateCaption",
  "founderVoiceCaption",
  "partnerCaption"
] as const;
export type PromotionVariant = (typeof PROMOTION_VARIANTS)[number];
export type PromotionGeneratedField = PromotionVariant | "hashtags";

export type PromotionChannelRule = {
  label: string;
  description: string;
  limit: number;
  strategy: string;
  utmSource: string;
  utmMedium: string;
  preferredAsset: SocialAssetSizeKey;
  assetRequired: boolean;
  hashtagLimit: number;
  variantLabels: Record<PromotionVariant, string>;
};

const STANDARD_VARIANT_LABELS: Record<PromotionVariant, string> = {
  primaryCaption: "Primary",
  alternateCaption: "A/B alternate",
  founderVoiceCaption: "Founder voice",
  partnerCaption: "Partner-facing"
};

export const PROMOTION_CHANNEL_REGISTRY: Readonly<Record<SocialChannel, PromotionChannelRule>> = {
  linkedin: {
    label: "LinkedIn",
    description: "Professional, insight-led copy for institutional audiences.",
    limit: SOCIAL_CHANNEL_LIMITS.linkedin,
    strategy: "Lead with a strong insight, use short paragraphs, state one takeaway, and close with one CTA. Avoid excessive hashtags.",
    utmSource: "linkedin",
    utmMedium: "social",
    preferredAsset: "og",
    assetRequired: false,
    hashtagLimit: 5,
    variantLabels: STANDARD_VARIANT_LABELS
  },
  x: {
    label: "X",
    description: "One concise idea with a materially different alternate.",
    limit: SOCIAL_CHANNEL_LIMITS.x,
    strategy: "Prioritize one core idea, stay within the configured limit, and do not create a thread.",
    utmSource: "x",
    utmMedium: "social",
    preferredAsset: "og",
    assetRequired: false,
    hashtagLimit: 3,
    variantLabels: STANDARD_VARIANT_LABELS
  },
  facebook: {
    label: "Facebook",
    description: "Accessible, community-oriented copy in plain language.",
    limit: SOCIAL_CHANNEL_LIMITS.facebook,
    strategy: "Be conversational, community-oriented, and clear about the next step.",
    utmSource: "facebook",
    utmMedium: "social",
    preferredAsset: "og",
    assetRequired: false,
    hashtagLimit: 4,
    variantLabels: STANDARD_VARIANT_LABELS
  },
  instagram: {
    label: "Instagram",
    description: "A strong hook, scannable caption, and precise hashtags.",
    limit: SOCIAL_CHANNEL_LIMITS.instagram,
    strategy: "Use a strong hook, scannable copy, a clear CTA, and relevant hashtags. Never claim ‘link in bio’ unless the source says so.",
    utmSource: "instagram",
    utmMedium: "social",
    preferredAsset: "portrait",
    assetRequired: true,
    hashtagLimit: 8,
    variantLabels: STANDARD_VARIANT_LABELS
  },
  threads: {
    label: "Threads",
    description: "Human, conversational copy without corporate jargon.",
    limit: SOCIAL_CHANNEL_LIMITS.threads,
    strategy: "Sound human and conversational, with less formality than LinkedIn and no corporate jargon.",
    utmSource: "threads",
    utmMedium: "social",
    preferredAsset: "square",
    assetRequired: false,
    hashtagLimit: 4,
    variantLabels: STANDARD_VARIANT_LABELS
  },
  email: {
    label: "Email",
    description: "Subject, introduction, and newsletter-ready forwarding copy.",
    limit: SOCIAL_CHANNEL_LIMITS.email,
    strategy: "Write a clear subject line, useful introduction, and one direct CTA. The excerpt becomes the preheader.",
    utmSource: "newsletter",
    utmMedium: "email",
    preferredAsset: "og",
    assetRequired: false,
    hashtagLimit: 0,
    variantLabels: {
      primaryCaption: "Subject line",
      alternateCaption: "Alternate subject line",
      founderVoiceCaption: "Founder introduction",
      partnerCaption: "Forwardable partner copy"
    }
  },
  partner_kit: {
    label: "Partner kit",
    description: "Approved copy partners can adapt across their channels.",
    limit: SOCIAL_CHANNEL_LIMITS.partner_kit,
    strategy: "Make the language easy for an approved partner to reuse without inventing quotes, handles, outcomes, or impact claims.",
    utmSource: "partner",
    utmMedium: "partner",
    preferredAsset: "square",
    assetRequired: false,
    hashtagLimit: 5,
    variantLabels: {
      primaryCaption: "Suggested partner social post",
      alternateCaption: "Alternate partner social post",
      founderVoiceCaption: "Approved founder quote",
      partnerCaption: "Suggested partner email/newsletter copy"
    }
  }
};

export function defaultPromotionTracking(channel: SocialChannel, slug: string) {
  const rule = PROMOTION_CHANNEL_REGISTRY[channel];
  return {
    utmSource: rule.utmSource,
    utmMedium: rule.utmMedium,
    utmCampaign: normalizePromotionCampaign(slug)
  };
}

export function buildPromotionTrackedUrl(
  canonicalUrl: string,
  channel: SocialChannel,
  tracking: { utmSource: string; utmMedium: string; utmCampaign: string }
): string {
  try {
    const url = new URL(canonicalUrl);
    const defaults = PROMOTION_CHANNEL_REGISTRY[channel];
    url.searchParams.set("utm_source", tracking.utmSource.trim() || defaults.utmSource);
    url.searchParams.set("utm_medium", tracking.utmMedium.trim() || defaults.utmMedium);
    url.searchParams.set("utm_campaign", tracking.utmCampaign.trim());
    return url.toString();
  } catch {
    return canonicalUrl;
  }
}

export function normalizePromotionCampaign(slug: string): string {
  return slug
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeHashtags(values: readonly string[], channel: SocialChannel): string[] {
  const limit = PROMOTION_CHANNEL_REGISTRY[channel].hashtagLimit;
  if (limit === 0) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of values) {
    const words = raw
      .trim()
      .replace(/^#+/, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
    if (!words.length) continue;
    const tag = `#${words.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join("")}`.slice(0, 80);
    const key = tag.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
    if (normalized.length >= limit) break;
  }
  return normalized;
}

export function verifiedMentionHandles(
  candidates: readonly string[],
  verified: Readonly<Record<string, string>>
): { handles: string[]; unresolved: string[] } {
  const byName = new Map(
    Object.entries(verified).map(([name, handle]) => [name.trim().toLocaleLowerCase("en-US"), handle.trim()])
  );
  const handles: string[] = [];
  const unresolved: string[] = [];

  for (const candidate of candidates) {
    const handle = byName.get(candidate.trim().toLocaleLowerCase("en-US"));
    if (!handle || !/^@[A-Za-z0-9._-]{1,79}$/.test(handle)) {
      unresolved.push(candidate);
      continue;
    }
    if (!handles.includes(handle)) handles.push(handle);
  }
  return { handles, unresolved };
}

export function classificationForContentType(contentType: ContentType): PromotionClassification {
  const mapping: Record<ContentType, PromotionClassification> = {
    blog_article: "General editorial",
    product_announcement: "Product announcement",
    founder_note: "Founder thought leadership",
    partner_insight: "Partner spotlight",
    partner_story: "Partner spotlight",
    testimonial_story: "Testimonial or participant story",
    state_resource: "State resource",
    downloadable_resource: "Record-clearing resource",
    resource_guide: "How-to guide"
  };
  return mapping[contentType];
}

export function objectiveForClassification(classification: PromotionClassification): PromotionObjective {
  if (["Legal education", "How-to guide"].includes(classification)) return "Education";
  if (["Record-clearing resource", "State resource"].includes(classification)) return "Resource distribution";
  if (classification === "Product announcement") return "Product adoption";
  if (classification === "Partner spotlight") return "Partner acquisition";
  if (classification === "Founder thought leadership" || classification === "Data or research") return "Thought leadership";
  return "Awareness";
}

export function recommendedPromotionTemplate(contentType: ContentType): SocialTemplate {
  const templates: Record<ContentType, SocialTemplate> = {
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
  return templates[contentType];
}
