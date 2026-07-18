import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  CONTENT_STATUSES,
  EMPTY_DOC,
  type ContentDestination,
  type ContentDoc,
  type ContentRole,
  type ContentStatus,
  type ContentType,
  type MediaPermission,
  type SocialApprovalState,
  type SocialChannel,
  isContentRole,
  isContentStatus,
  isMediaPermission
} from "@/lib/content/types";
import type { MediaRecord } from "@/lib/content/media";

/**
 * CMS-side reads (server only).
 *
 * The public reads live in repository.ts and are deliberately narrow. The admin surface needs the
 * workflow columns those reads strip (review state, schedule, legal approval, versions), so it gets
 * its own module rather than loosening the public one.
 *
 * Every function degrades to an empty result when Supabase is unconfigured, so the CMS renders (and
 * builds) with no environment at all. Writes never happen here — the CMS writes through
 * /api/internal/content/*, which re-checks capabilities server-side.
 */

export type CmsPostSummary = {
  postId: string;
  slug: string;
  destination: ContentDestination;
  contentType: ContentType;
  status: ContentStatus;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  legalSensitive: boolean;
  jurisdictionCode: string | null;
  partnerSlug: string | null;
  authorId: string | null;
  authorName: string | null;
  version: number;
  publishedAt: string | null;
  scheduledFor: string | null;
  legalApprovedAt: string | null;
  editorialApprovedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export type CmsPostDetail = CmsPostSummary & {
  doc: ContentDoc;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  featuredMediaId: string | null;
  ogMediaId: string | null;
};

export type CmsVersion = {
  version: number;
  title: string;
  subtitle: string | null;
  status: string;
  note: string | null;
  createdAt: string | null;
};

export type CmsAuthor = {
  authorId: string;
  slug: string;
  name: string;
  title: string | null;
  organization: string | null;
  bio: string | null;
  isActive: boolean;
};

export type CmsTestimonial = {
  testimonialId: string;
  quote: string;
  attribution: string;
  roleTitle: string | null;
  partnerSlug: string | null;
  consentStatus: string;
  consentReference: string | null;
  approved: boolean;
  createdAt: string | null;
};

export type CmsMediaAsset = MediaRecord & {
  publicUrl: string | null;
  storagePath: string;
  createdAt: string | null;
  usageCount: number;
};

export type CmsSocialDraft = {
  socialDraftId: string;
  postId: string;
  channel: SocialChannel;
  primaryCaption: string | null;
  alternateCaption: string | null;
  founderVoiceCaption: string | null;
  partnerCaption: string | null;
  hashtags: string[];
  mentionTags: string[];
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  socialAssetId: string | null;
  approvalState: SocialApprovalState;
  approvedAt: string | null;
  updatedAt: string | null;
};

export type CmsSocialAsset = {
  socialAssetId: string;
  template: string;
  sizeKey: string;
  width: number;
  height: number;
  imageUrl: string | null;
  headline: string | null;
};

export type CmsStateEditorialRow = {
  jurisdictionCode: string;
  status: string;
  intro: string | null;
  overview: string | null;
  featuredMediaId: string | null;
  faqs: { question: string; answer: string }[];
  relatedSlugs: string[];
  partnerQuote: string | null;
  partnerSlug: string | null;
  announcement: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  legalApprovedAt: string | null;
  updatedAt: string | null;
};

export type CmsAuditEvent = {
  action: string;
  entityType: string;
  entityId: string | null;
  actorRole: ContentRole | null;
  createdAt: string | null;
};

export type CmsRoleAssignment = {
  authUserId: string;
  role: ContentRole;
  partnerSlug: string | null;
  displayName: string | null;
  status: string;
};

const POST_SELECT = `
  post_id, slug, destination, content_type, status, title, subtitle, excerpt, legal_sensitive,
  jurisdiction_code, partner_slug, author_id, version, published_at, scheduled_for,
  legal_approved_at, editorial_approved_at, updated_at, created_at,
  content_authors:author_id ( name )
`;

const POST_DETAIL_SELECT = `${POST_SELECT}, doc, seo_title, seo_description, canonical_url, og_title, og_description, featured_media_id, og_media_id`;

type RawPost = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function firstOf<T>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

function toSummary(row: RawPost): CmsPostSummary {
  const author = firstOf<{ name?: unknown }>(row.content_authors);
  const status = row.status;
  return {
    postId: String(row.post_id),
    slug: String(row.slug ?? ""),
    destination: (row.destination as ContentDestination) ?? "expungement_ai",
    contentType: (row.content_type as ContentType) ?? "blog_article",
    status: isContentStatus(status) ? status : "draft",
    title: String(row.title ?? "Untitled"),
    subtitle: str(row.subtitle),
    excerpt: str(row.excerpt),
    legalSensitive: row.legal_sensitive === true,
    jurisdictionCode: str(row.jurisdiction_code),
    partnerSlug: str(row.partner_slug),
    authorId: str(row.author_id),
    authorName: author ? str(author.name) : null,
    version: num(row.version, 1),
    publishedAt: str(row.published_at),
    scheduledFor: str(row.scheduled_for),
    legalApprovedAt: str(row.legal_approved_at),
    editorialApprovedAt: str(row.editorial_approved_at),
    updatedAt: str(row.updated_at),
    createdAt: str(row.created_at)
  };
}

// --- Posts -------------------------------------------------------------------------------------

export async function listCmsPosts(filters?: {
  destination?: ContentDestination | null;
  status?: ContentStatus | null;
  contentType?: ContentType | null;
  contentTypes?: ContentType[];
  statuses?: ContentStatus[];
  limit?: number;
}): Promise<CmsPostSummary[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from("content_posts")
    .select(POST_SELECT)
    .order("updated_at", { ascending: false })
    .limit(filters?.limit ?? 200);

  if (filters?.destination) query = query.eq("destination", filters.destination);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.contentType) query = query.eq("content_type", filters.contentType);
  if (filters?.contentTypes?.length) query = query.in("content_type", filters.contentTypes);
  if (filters?.statuses?.length) query = query.in("status", filters.statuses);

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as RawPost[]).map(toSummary);
}

export async function getCmsPost(postId: string): Promise<CmsPostDetail | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("content_posts")
    .select(POST_DETAIL_SELECT)
    .eq("post_id", postId)
    .limit(1);

  if (error || !data?.length) return null;

  const row = data[0] as RawPost;
  const doc = row.doc && typeof row.doc === "object" ? (row.doc as ContentDoc) : EMPTY_DOC;

  return {
    ...toSummary(row),
    doc,
    seoTitle: str(row.seo_title),
    seoDescription: str(row.seo_description),
    canonicalUrl: str(row.canonical_url),
    ogTitle: str(row.og_title),
    ogDescription: str(row.og_description),
    featuredMediaId: str(row.featured_media_id),
    ogMediaId: str(row.og_media_id)
  };
}

export async function countPostsByStatus(): Promise<Record<ContentStatus, number>> {
  const counts = Object.fromEntries(CONTENT_STATUSES.map((status) => [status, 0])) as Record<
    ContentStatus,
    number
  >;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return counts;

  const { data, error } = await supabase.from("content_posts").select("status").limit(5000);
  if (error || !data) return counts;

  for (const row of data as { status: unknown }[]) {
    if (isContentStatus(row.status)) counts[row.status] += 1;
  }
  return counts;
}

export async function listScheduledPosts(): Promise<CmsPostSummary[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_posts")
    .select(POST_SELECT)
    .eq("status", "scheduled")
    .order("scheduled_for", { ascending: true })
    .limit(100);

  if (error || !data) return [];
  return (data as RawPost[]).map(toSummary);
}

/** The two review queues. Editorial and legal are separate decisions and are never merged. */
export async function listReviewQueues(): Promise<{
  editorial: CmsPostSummary[];
  legal: CmsPostSummary[];
  changesRequested: CmsPostSummary[];
}> {
  const [editorial, legal, changesRequested] = await Promise.all([
    listCmsPosts({ status: "in_editorial_review", limit: 100 }),
    listCmsPosts({ status: "in_legal_review", limit: 100 }),
    listCmsPosts({ status: "changes_requested", limit: 100 })
  ]);
  return { editorial, legal, changesRequested };
}

export async function listPostVersions(postId: string): Promise<CmsVersion[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_post_versions")
    .select("version, title, subtitle, status, note, created_at")
    .eq("post_id", postId)
    .order("version", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return (data as RawPost[]).map((row) => ({
    version: num(row.version),
    title: String(row.title ?? "Untitled"),
    subtitle: str(row.subtitle),
    status: String(row.status ?? "draft"),
    note: str(row.note),
    createdAt: str(row.created_at)
  }));
}

// --- Media -------------------------------------------------------------------------------------

export async function listCmsMedia(): Promise<CmsMediaAsset[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_media")
    .select(
      "media_id, storage_path, public_url, mime_type, byte_size, width, height, alt_text, caption, credit, source_info, permission_status, archived, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error || !data) return [];

  const rows = data as RawPost[];
  const usage = await countMediaUsage(rows.map((row) => String(row.media_id)));

  return rows.map((row) => {
    const permission = row.permission_status;
    const mediaId = String(row.media_id);
    return {
      mediaId,
      storagePath: String(row.storage_path ?? ""),
      publicUrl: str(row.public_url),
      mimeType: String(row.mime_type ?? ""),
      byteSize: num(row.byte_size),
      width: typeof row.width === "number" ? row.width : null,
      height: typeof row.height === "number" ? row.height : null,
      altText: str(row.alt_text),
      caption: str(row.caption),
      credit: str(row.credit),
      sourceInfo: str(row.source_info),
      permissionStatus: (isMediaPermission(permission) ? permission : "unknown") as MediaPermission,
      archived: row.archived === true,
      createdAt: str(row.created_at),
      usageCount: usage.get(mediaId) ?? 0
    };
  });
}

async function countMediaUsage(mediaIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const supabase = getSupabaseAdminClient();
  if (!supabase || !mediaIds.length) return counts;

  const { data, error } = await supabase
    .from("content_media_usages")
    .select("media_id")
    .in("media_id", mediaIds);

  if (error || !data) return counts;

  for (const row of data as { media_id: unknown }[]) {
    const id = String(row.media_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

// --- Authors, testimonials ---------------------------------------------------------------------

export async function listCmsAuthors(): Promise<CmsAuthor[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_authors")
    .select("author_id, slug, name, title, organization, bio, is_active")
    .order("name", { ascending: true })
    .limit(200);

  if (error || !data) return [];

  return (data as RawPost[]).map((row) => ({
    authorId: String(row.author_id),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    title: str(row.title),
    organization: str(row.organization),
    bio: str(row.bio),
    isActive: row.is_active !== false
  }));
}

export async function listCmsTestimonials(): Promise<CmsTestimonial[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_testimonials")
    .select(
      "testimonial_id, quote, attribution, role_title, partner_slug, consent_status, consent_reference, approved, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  return (data as RawPost[]).map((row) => ({
    testimonialId: String(row.testimonial_id),
    quote: String(row.quote ?? ""),
    attribution: String(row.attribution ?? ""),
    roleTitle: str(row.role_title),
    partnerSlug: str(row.partner_slug),
    consentStatus: String(row.consent_status ?? "unknown"),
    consentReference: str(row.consent_reference),
    approved: row.approved === true,
    createdAt: str(row.created_at)
  }));
}

// --- Social ------------------------------------------------------------------------------------

export async function listSocialDrafts(postId: string): Promise<CmsSocialDraft[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_social_drafts")
    .select(
      "social_draft_id, post_id, channel, primary_caption, alternate_caption, founder_voice_caption, partner_caption, hashtags, mention_tags, utm_source, utm_medium, utm_campaign, social_asset_id, approval_state, approved_at, updated_at"
    )
    .eq("post_id", postId)
    .limit(20);

  if (error || !data) return [];
  return (data as RawPost[]).map(toSocialDraft);
}

/** All drafts awaiting promotion, for the social queue page. */
export async function listSocialQueue(): Promise<
  { post: CmsPostSummary; drafts: CmsSocialDraft[] }[]
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_social_drafts")
    .select(
      "social_draft_id, post_id, channel, primary_caption, alternate_caption, founder_voice_caption, partner_caption, hashtags, mention_tags, utm_source, utm_medium, utm_campaign, social_asset_id, approval_state, approved_at, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(300);

  if (error || !data) return [];

  const drafts = (data as RawPost[]).map(toSocialDraft);
  const postIds = [...new Set(drafts.map((draft) => draft.postId))];
  if (!postIds.length) return [];

  const { data: postRows } = await supabase.from("content_posts").select(POST_SELECT).in("post_id", postIds);
  const posts = new Map<string, CmsPostSummary>();
  for (const row of (postRows as RawPost[] | null) ?? []) {
    const summary = toSummary(row);
    posts.set(summary.postId, summary);
  }

  return postIds
    .map((postId) => {
      const post = posts.get(postId);
      if (!post) return null;
      return { post, drafts: drafts.filter((draft) => draft.postId === postId) };
    })
    .filter((entry): entry is { post: CmsPostSummary; drafts: CmsSocialDraft[] } => Boolean(entry));
}

function toSocialDraft(row: RawPost): CmsSocialDraft {
  const stringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

  return {
    socialDraftId: String(row.social_draft_id),
    postId: String(row.post_id),
    channel: row.channel as SocialChannel,
    primaryCaption: str(row.primary_caption),
    alternateCaption: str(row.alternate_caption),
    founderVoiceCaption: str(row.founder_voice_caption),
    partnerCaption: str(row.partner_caption),
    hashtags: stringArray(row.hashtags),
    mentionTags: stringArray(row.mention_tags),
    utmSource: str(row.utm_source),
    utmMedium: str(row.utm_medium),
    utmCampaign: str(row.utm_campaign),
    socialAssetId: str(row.social_asset_id),
    approvalState: (row.approval_state as SocialApprovalState) ?? "draft",
    approvedAt: str(row.approved_at),
    updatedAt: str(row.updated_at)
  };
}

export async function listSocialAssets(postId: string): Promise<CmsSocialAsset[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_social_assets")
    .select("social_asset_id, template, size_key, width, height, image_url, headline")
    .eq("post_id", postId)
    .limit(30);

  if (error || !data) return [];

  return (data as RawPost[]).map((row) => ({
    socialAssetId: String(row.social_asset_id),
    template: String(row.template ?? ""),
    sizeKey: String(row.size_key ?? ""),
    width: num(row.width),
    height: num(row.height),
    imageUrl: str(row.image_url),
    headline: str(row.headline)
  }));
}

// --- State editorial ---------------------------------------------------------------------------

export async function listStateEditorialRows(): Promise<Map<string, CmsStateEditorialRow>> {
  const rows = new Map<string, CmsStateEditorialRow>();
  const supabase = getSupabaseAdminClient();
  if (!supabase) return rows;

  const { data, error } = await supabase
    .from("content_state_editorial")
    .select(
      "jurisdiction_code, status, intro, overview, featured_media_id, faqs, related_slugs, partner_quote, partner_slug, announcement, seo_title, seo_description, cta_label, cta_href, legal_approved_at, updated_at"
    )
    .limit(60);

  if (error || !data) return rows;

  for (const raw of data as RawPost[]) {
    const row = toStateEditorial(raw);
    rows.set(row.jurisdictionCode, row);
  }
  return rows;
}

export async function getStateEditorialRow(code: string): Promise<CmsStateEditorialRow | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("content_state_editorial")
    .select(
      "jurisdiction_code, status, intro, overview, featured_media_id, faqs, related_slugs, partner_quote, partner_slug, announcement, seo_title, seo_description, cta_label, cta_href, legal_approved_at, updated_at"
    )
    .eq("jurisdiction_code", code.toUpperCase())
    .limit(1);

  if (error || !data?.length) return null;
  return toStateEditorial(data[0] as RawPost);
}

function toStateEditorial(row: RawPost): CmsStateEditorialRow {
  const faqs = Array.isArray(row.faqs) ? row.faqs : [];
  return {
    jurisdictionCode: String(row.jurisdiction_code ?? "").toUpperCase(),
    status: String(row.status ?? "draft"),
    intro: str(row.intro),
    overview: str(row.overview),
    featuredMediaId: str(row.featured_media_id),
    faqs: faqs
      .filter(
        (item): item is { question: string; answer: string } =>
          Boolean(item) &&
          typeof (item as { question?: unknown }).question === "string" &&
          typeof (item as { answer?: unknown }).answer === "string"
      )
      .map((item) => ({ question: item.question, answer: item.answer })),
    relatedSlugs: Array.isArray(row.related_slugs)
      ? (row.related_slugs as unknown[]).filter((slug): slug is string => typeof slug === "string")
      : [],
    partnerQuote: str(row.partner_quote),
    partnerSlug: str(row.partner_slug),
    announcement: str(row.announcement),
    seoTitle: str(row.seo_title),
    seoDescription: str(row.seo_description),
    ctaLabel: str(row.cta_label),
    ctaHref: str(row.cta_href),
    legalApprovedAt: str(row.legal_approved_at),
    updatedAt: str(row.updated_at)
  };
}

// --- Activity and roles ------------------------------------------------------------------------

export async function listRecentActivity(limit = 20): Promise<CmsAuditEvent[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_audit_events")
    .select("action, entity_type, entity_id, actor_role, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as RawPost[]).map((row) => ({
    action: String(row.action ?? ""),
    entityType: String(row.entity_type ?? ""),
    entityId: str(row.entity_id),
    actorRole: isContentRole(row.actor_role) ? row.actor_role : null,
    createdAt: str(row.created_at)
  }));
}

export async function listRoleAssignments(): Promise<CmsRoleAssignment[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_admin_users")
    .select("auth_user_id, content_role, partner_slug, display_name, status")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error || !data) return [];

  return (data as RawPost[])
    .map((row) => {
      const role = row.content_role;
      if (!isContentRole(role)) return null;
      return {
        authUserId: String(row.auth_user_id),
        role,
        partnerSlug: str(row.partner_slug),
        displayName: str(row.display_name),
        status: String(row.status ?? "active")
      };
    })
    .filter((row): row is CmsRoleAssignment => Boolean(row));
}

/** True when Supabase is wired up at all. Drives the honest "storage not configured" banners. */
export function isContentStorageConfigured(): boolean {
  return Boolean(getSupabaseAdminClient());
}
