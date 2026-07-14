import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { contentDocToPlainText, estimateReadingMinutes, renderContentDoc } from "@/lib/content/renderer";
import { EMPTY_EDITORIAL, type StateEditorialLayer } from "@/lib/content/state-resources";
import {
  type ContentDestination,
  type ContentDoc,
  type ContentStatus,
  type ContentType,
  type PublicArticle,
  type PublicAuthor
} from "@/lib/content/types";
import { absoluteExpungementAiUrl, absolutePartnerAppUrl } from "@/lib/app-url";

/**
 * Content data access.
 *
 * PUBLIC READS NEVER TOUCH A BASE TABLE.
 *
 * Every public query below goes through the content_public_* VIEWS created in phase 43. Those views
 * name each public column explicitly; the base tables carry workflow columns (staff ids, review
 * timestamps, scheduling, search text, the structured document) that must not reach a public page,
 * and anon has had its privileges on them REVOKED outright.
 *
 * This is not belt-and-braces duplication of an app-side filter — it is the actual boundary. RLS is
 * row-scoped, so a "published rows only" policy on content_posts would still hand out every COLUMN
 * of those rows. The audit that produced this design found exactly that: created_by,
 * legal_approved_by, scheduled_for and search_text were all public. The narrow interface is the fix,
 * and selecting * from a view is now safe by construction.
 *
 * Do NOT "optimize" these back onto the base tables with a column list. A column list in JavaScript
 * is a convention; a view is a privilege.
 */

/** Rows as they come off public.content_public_posts. There is no status/doc/created_by here. */
type PublicPostRow = {
  post_id: string;
  slug: string;
  destination: string;
  locale: string;
  content_type: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  rendered_html: string | null;
  reading_minutes: number | null;
  author_id: string | null;
  category_id: string | null;
  featured_media_id: string | null;
  og_media_id: string | null;
  jurisdiction_code: string | null;
  partner_slug: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  published_at: string;
  content_updated_at: string | null;
};

type PublicAuthorRow = {
  author_id: string;
  slug: string;
  name: string;
  title: string | null;
  organization: string | null;
  bio: string | null;
  avatar_media_id: string | null;
};

type PublicMediaRow = {
  media_id: string;
  alt_text: string | null;
  caption: string | null;
  credit: string | null;
};

/** Views carry no PostgREST foreign-key relationships, so related rows are hydrated explicitly. */
const PUBLIC_POST_SELECT = "*";

/**
 * The bucket is PRIVATE. Bytes are served by /api/content/media/[mediaId], which re-checks that the
 * asset is referenced by published content before minting a short-lived signed URL. There is
 * deliberately no direct storage URL anywhere in the public payload.
 */
export function publicMediaUrl(mediaId: string): string {
  return `/api/content/media/${mediaId}`;
}

function first<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Fetch the public projection of a set of media ids. Draft-only assets simply do not come back. */
async function loadPublicMedia(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  mediaIds: (string | null)[]
): Promise<Map<string, PublicMediaRow>> {
  const ids = [...new Set(mediaIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return new Map();

  const { data } = await supabase
    .from("content_public_media")
    .select("media_id, alt_text, caption, credit")
    .in("media_id", ids);

  return new Map((data ?? []).map((row) => [(row as PublicMediaRow).media_id, row as PublicMediaRow]));
}

async function loadPublicAuthors(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  authorIds: (string | null)[]
): Promise<Map<string, PublicAuthorRow>> {
  const ids = [...new Set(authorIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return new Map();

  const { data } = await supabase
    .from("content_public_authors")
    .select("author_id, slug, name, title, organization, bio, avatar_media_id")
    .in("author_id", ids);

  return new Map((data ?? []).map((row) => [(row as PublicAuthorRow).author_id, row as PublicAuthorRow]));
}

/** Assemble the public view models for a page of posts, hydrating authors and media in one round each. */
async function hydrateArticles(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  rows: PublicPostRow[]
): Promise<PublicArticle[]> {
  if (!rows.length) return [];

  const [authors, media] = await Promise.all([
    loadPublicAuthors(supabase, rows.map((row) => row.author_id)),
    loadPublicMedia(supabase, rows.flatMap((row) => [row.featured_media_id, row.og_media_id]))
  ]);

  return rows.map((row) => toPublicArticle(row, authors, media));
}

function canonicalFor(destination: ContentDestination, contentType: ContentType, slug: string): string {
  if (destination === "expungement_ai") {
    return absoluteExpungementAiUrl(`/blog/${slug}`);
  }
  const segment = contentType === "partner_story" ? "partner-stories" : "insights";
  return absolutePartnerAppUrl(`/${segment}/${slug}`);
}

function toPublicAuthor(row: PublicAuthorRow | null | undefined): PublicAuthor | null {
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    title: row.title,
    organization: row.organization,
    bio: row.bio,
    avatarUrl: row.avatar_media_id ? publicMediaUrl(row.avatar_media_id) : null
  };
}

function toPublicArticle(
  row: PublicPostRow,
  authors: Map<string, PublicAuthorRow>,
  media: Map<string, PublicMediaRow>
): PublicArticle {
  // The public view carries the server-rendered, allowlist-sanitized body. The structured document
  // is NOT public, so there is nothing to re-render from here — and nothing to re-render from is the
  // correct state: rendered_html is written by savePostBody() through the same renderer.
  const html = row.rendered_html ?? "";

  // A media id resolves only if the asset is actually public (the view enforces that). A featured
  // image on an unpublished asset therefore renders as no image rather than leaking an embargoed one.
  const featured = row.featured_media_id ? media.get(row.featured_media_id) : undefined;
  const og = row.og_media_id ? media.get(row.og_media_id) : undefined;

  const canonical = row.canonical_url ?? canonicalFor(
    row.destination as ContentDestination,
    row.content_type as ContentType,
    row.slug
  );

  const fallbackText = row.excerpt ?? "";

  return {
    slug: row.slug,
    destination: row.destination as ContentDestination,
    contentType: row.content_type as ContentType,
    title: row.title,
    subtitle: row.subtitle,
    html,
    readingMinutes: row.reading_minutes ?? 1,
    publishedAt: row.published_at,
    updatedAt: row.content_updated_at,
    author: toPublicAuthor(row.author_id ? authors.get(row.author_id) : null),
    featuredImage: featured
      ? {
          src: publicMediaUrl(featured.media_id),
          alt: featured.alt_text ?? "",
          caption: featured.caption,
          credit: featured.credit
        }
      : null,
    tags: [],
    seo: {
      title: row.seo_title?.trim() || row.title,
      description: row.seo_description?.trim() || truncate(fallbackText, 160),
      canonical,
      ogTitle: row.og_title?.trim() || row.title,
      ogDescription: row.og_description?.trim() || truncate(fallbackText, 200),
      ogImage: og
        ? publicMediaUrl(og.media_id)
        : featured
          ? publicMediaUrl(featured.media_id)
          : null
    }
  };
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

// --- Public reads -----------------------------------------------------------------------------------

export async function listPublishedArticles(options: {
  destination: ContentDestination;
  contentTypes?: ContentType[];
  limit?: number;
}): Promise<PublicArticle[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  // content_public_posts already restricts to published/updated and published_at <= now(). The view
  // IS the filter; there is no status column here to get wrong.
  let query = supabase
    .from("content_public_posts")
    .select(PUBLIC_POST_SELECT)
    .eq("destination", options.destination)
    .order("published_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.contentTypes?.length) {
    query = query.in("content_type", options.contentTypes);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return hydrateArticles(supabase, data as unknown as PublicPostRow[]);
}

export async function getPublishedArticle(options: {
  destination: ContentDestination;
  slug: string;
}): Promise<PublicArticle | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("content_public_posts")
    .select(PUBLIC_POST_SELECT)
    .eq("destination", options.destination)
    .eq("slug", options.slug)
    .limit(1);

  if (error || !data || !data.length) return null;

  const [article] = await hydrateArticles(supabase, data as unknown as PublicPostRow[]);
  return article ?? null;
}

export async function getPublicAuthor(slug: string): Promise<PublicAuthor | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("content_public_authors")
    .select("author_id, slug, name, title, organization, bio, avatar_media_id")
    .eq("slug", slug)
    .limit(1);

  if (error || !data || !data.length) return null;
  return toPublicAuthor(data[0] as PublicAuthorRow);
}

export async function listArticlesByAuthor(slug: string): Promise<PublicArticle[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data: authorRows } = await supabase
    .from("content_public_authors")
    .select("author_id")
    .eq("slug", slug)
    .limit(1);

  const authorId = (authorRows?.[0] as { author_id?: string } | undefined)?.author_id;
  if (!authorId) return [];

  const { data, error } = await supabase
    .from("content_public_posts")
    .select(PUBLIC_POST_SELECT)
    .eq("author_id", authorId)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return hydrateArticles(supabase, data as unknown as PublicPostRow[]);
}

/** The published editorial layer for one jurisdiction. Never returns a draft. */
export async function getPublishedStateEditorial(jurisdictionCode: string): Promise<StateEditorialLayer> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return EMPTY_EDITORIAL;

  // The view already restricts to status = 'published' and drops legal_approved_by / updated_by.
  const { data, error } = await supabase
    .from("content_public_state_editorial")
    .select(
      `intro, overview, faqs, related_slugs, partner_quote, partner_slug, announcement,
       seo_title, seo_description, cta_label, cta_href, featured_media_id`
    )
    .eq("jurisdiction_code", jurisdictionCode.toUpperCase())
    .limit(1);

  if (error || !data || !data.length) return EMPTY_EDITORIAL;

  const row = data[0] as Record<string, unknown>;
  const featuredMediaId = typeof row.featured_media_id === "string" ? row.featured_media_id : null;
  const media = featuredMediaId
    ? (await loadPublicMedia(supabase, [featuredMediaId])).get(featuredMediaId)
    : undefined;
  const faqs = Array.isArray(row.faqs) ? row.faqs : [];

  return {
    intro: (row.intro as string) ?? null,
    overview: (row.overview as string) ?? null,
    featuredImage: media ? { src: publicMediaUrl(media.media_id), alt: media.alt_text ?? "" } : null,
    faqs: faqs
      .filter(
        (item): item is { question: string; answer: string } =>
          Boolean(item) &&
          typeof (item as { question?: unknown }).question === "string" &&
          typeof (item as { answer?: unknown }).answer === "string"
      )
      .map((item) => ({ question: item.question, answer: item.answer })),
    relatedSlugs: Array.isArray(row.related_slugs)
      ? (row.related_slugs as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
    partnerQuote: (row.partner_quote as string) ?? null,
    partnerSlug: (row.partner_slug as string) ?? null,
    announcement: (row.announcement as string) ?? null,
    seoTitle: (row.seo_title as string) ?? null,
    seoDescription: (row.seo_description as string) ?? null,
    ctaLabel: (row.cta_label as string) ?? null,
    ctaHref: (row.cta_href as string) ?? null
  };
}

/** Published slugs for the sitemap and RSS. */
export async function listPublishedSlugs(destination: ContentDestination): Promise<
  { slug: string; contentType: ContentType; publishedAt: string; updatedAt: string | null }[]
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_public_posts")
    .select("slug, content_type, published_at, content_updated_at")
    .eq("destination", destination)
    .order("published_at", { ascending: false });

  if (error || !data) return [];

  return (
    data as { slug: string; content_type: string; published_at: string; content_updated_at: string | null }[]
  ).map((row) => ({
    slug: row.slug,
    contentType: row.content_type as ContentType,
    publishedAt: row.published_at,
    updatedAt: row.content_updated_at
  }));
}

// --- CMS writes -------------------------------------------------------------------------------------

/**
 * Save a post body. Re-renders HTML server-side from the structured doc — the client never supplies
 * HTML — and snapshots the previous version so nothing is ever lost.
 */
export async function savePostBody(options: {
  postId: string;
  doc: ContentDoc;
  title: string;
  subtitle: string | null;
  actorId: string;
  note?: string | null;
}): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Storage is not configured." };

  const { data: existing, error: readError } = await supabase
    .from("content_posts")
    .select("post_id, version, title, subtitle, doc, rendered_html, status")
    .eq("post_id", options.postId)
    .limit(1);

  if (readError || !existing?.length) {
    return { ok: false, error: "Post not found." };
  }

  const current = existing[0] as {
    version: number;
    title: string;
    subtitle: string | null;
    doc: unknown;
    rendered_html: string | null;
    status: ContentStatus;
  };

  // Snapshot the version we are about to replace.
  const { error: versionError } = await supabase.from("content_post_versions").insert({
    post_id: options.postId,
    version: current.version,
    title: current.title,
    subtitle: current.subtitle,
    doc: current.doc,
    rendered_html: current.rendered_html,
    status: current.status,
    note: options.note ?? null,
    created_by: options.actorId
  });

  if (versionError && !versionError.message.includes("duplicate key")) {
    return { ok: false, error: `Could not snapshot the previous version: ${versionError.message}` };
  }

  const html = renderContentDoc(options.doc);
  const plain = contentDocToPlainText(options.doc);

  const { error: updateError } = await supabase
    .from("content_posts")
    .update({
      title: options.title,
      subtitle: options.subtitle,
      doc: options.doc,
      rendered_html: html,
      search_text: plain.slice(0, 20000),
      reading_minutes: estimateReadingMinutes(options.doc),
      version: current.version + 1
    })
    .eq("post_id", options.postId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true, version: current.version + 1 };
}

/**
 * Restore a prior version. Deliberately writes a NEW version rather than rewinding the counter, so
 * the history remains a complete, append-only record of what happened.
 */
export async function restoreVersion(options: {
  postId: string;
  version: number;
  actorId: string;
}): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Storage is not configured." };

  const { data, error } = await supabase
    .from("content_post_versions")
    .select("title, subtitle, doc")
    .eq("post_id", options.postId)
    .eq("version", options.version)
    .limit(1);

  if (error || !data?.length) {
    return { ok: false, error: "That version does not exist." };
  }

  const snapshot = data[0] as { title: string; subtitle: string | null; doc: ContentDoc };

  return savePostBody({
    postId: options.postId,
    doc: snapshot.doc,
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    actorId: options.actorId,
    note: `Restored from version ${options.version}`
  });
}
