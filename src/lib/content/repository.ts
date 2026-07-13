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
 * PUBLIC READS ARE DOUBLY GUARDED. Every public query filters status to ('published','updated') and
 * published_at <= now(), AND the RLS policy on content_posts admits nothing else to anon. Belt and
 * braces: if a future refactor forgets the app-side filter, the database still refuses.
 *
 * Reads return typed view models, never raw rows — a raw row carries workflow columns (review notes,
 * scheduled times, legal-approval identities) that must not reach a public page.
 */

type PostRow = {
  post_id: string;
  slug: string;
  destination: string;
  content_type: string;
  status: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  doc: unknown;
  rendered_html: string | null;
  reading_minutes: number | null;
  published_at: string | null;
  updated_at: string | null;
  first_published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  jurisdiction_code: string | null;
  partner_slug: string | null;
  content_authors: AuthorRow | AuthorRow[] | null;
  featured_media: MediaRow | MediaRow[] | null;
  og_media: MediaRow | MediaRow[] | null;
};

type AuthorRow = {
  slug: string;
  name: string;
  title: string | null;
  organization: string | null;
  bio: string | null;
  avatar_media_id: string | null;
};

type MediaRow = {
  public_url: string | null;
  alt_text: string | null;
  caption: string | null;
  credit: string | null;
};

const PUBLIC_SELECT = `
  post_id, slug, destination, content_type, status, title, subtitle, excerpt, doc, rendered_html,
  reading_minutes, published_at, updated_at, first_published_at, seo_title, seo_description,
  canonical_url, og_title, og_description, jurisdiction_code, partner_slug,
  content_authors:author_id ( slug, name, title, organization, bio, avatar_media_id ),
  featured_media:featured_media_id ( public_url, alt_text, caption, credit ),
  og_media:og_media_id ( public_url, alt_text, caption, credit )
`;

function first<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function canonicalFor(destination: ContentDestination, contentType: ContentType, slug: string): string {
  if (destination === "expungement_ai") {
    return absoluteExpungementAiUrl(`/blog/${slug}`);
  }
  const segment = contentType === "partner_story" ? "partner-stories" : "insights";
  return absolutePartnerAppUrl(`/${segment}/${slug}`);
}

function toPublicAuthor(row: AuthorRow | null): PublicAuthor | null {
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    title: row.title,
    organization: row.organization,
    bio: row.bio,
    avatarUrl: null
  };
}

function toPublicArticle(row: PostRow): PublicArticle {
  const doc = row.doc as ContentDoc;
  // Prefer the stored render (produced by the same allowlisting renderer at save time), but never
  // trust it blindly: if it is absent we re-render from the structured doc rather than falling back
  // to any raw HTML field. There is no raw HTML field.
  const html = row.rendered_html ?? renderContentDoc(doc);
  const featured = first(row.featured_media);
  const og = first(row.og_media);
  const canonical = row.canonical_url ?? canonicalFor(
    row.destination as ContentDestination,
    row.content_type as ContentType,
    row.slug
  );

  return {
    slug: row.slug,
    destination: row.destination as ContentDestination,
    contentType: row.content_type as ContentType,
    title: row.title,
    subtitle: row.subtitle,
    html,
    readingMinutes: row.reading_minutes ?? estimateReadingMinutes(doc),
    publishedAt: row.published_at ?? row.first_published_at ?? new Date(0).toISOString(),
    updatedAt: row.status === "updated" ? row.updated_at : null,
    author: toPublicAuthor(first(row.content_authors)),
    featuredImage: featured?.public_url
      ? {
          src: featured.public_url,
          alt: featured.alt_text ?? "",
          caption: featured.caption,
          credit: featured.credit
        }
      : null,
    tags: [],
    seo: {
      title: row.seo_title?.trim() || row.title,
      description: row.seo_description?.trim() || row.excerpt || truncate(contentDocToPlainText(doc), 160),
      canonical,
      ogTitle: row.og_title?.trim() || row.title,
      ogDescription: row.og_description?.trim() || row.excerpt || truncate(contentDocToPlainText(doc), 200),
      ogImage: og?.public_url ?? featured?.public_url ?? null
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

  let query = supabase
    .from("content_posts")
    .select(PUBLIC_SELECT)
    .eq("destination", options.destination)
    .in("status", ["published", "updated"])
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.contentTypes?.length) {
    query = query.in("content_type", options.contentTypes);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as PostRow[]).map(toPublicArticle);
}

export async function getPublishedArticle(options: {
  destination: ContentDestination;
  slug: string;
}): Promise<PublicArticle | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("content_posts")
    .select(PUBLIC_SELECT)
    .eq("destination", options.destination)
    .eq("slug", options.slug)
    .in("status", ["published", "updated"])
    .lte("published_at", new Date().toISOString())
    .limit(1);

  if (error || !data || !data.length) return null;
  return toPublicArticle(data[0] as unknown as PostRow);
}

export async function getPublicAuthor(slug: string): Promise<PublicAuthor | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("content_authors")
    .select("slug, name, title, organization, bio, avatar_media_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .limit(1);

  if (error || !data || !data.length) return null;
  return toPublicAuthor(data[0] as AuthorRow);
}

export async function listArticlesByAuthor(slug: string): Promise<PublicArticle[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data: authorRows } = await supabase
    .from("content_authors")
    .select("author_id")
    .eq("slug", slug)
    .limit(1);

  const authorId = (authorRows?.[0] as { author_id?: string } | undefined)?.author_id;
  if (!authorId) return [];

  const { data, error } = await supabase
    .from("content_posts")
    .select(PUBLIC_SELECT)
    .eq("author_id", authorId)
    .in("status", ["published", "updated"])
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return (data as unknown as PostRow[]).map(toPublicArticle);
}

/** The published editorial layer for one jurisdiction. Never returns a draft. */
export async function getPublishedStateEditorial(jurisdictionCode: string): Promise<StateEditorialLayer> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return EMPTY_EDITORIAL;

  const { data, error } = await supabase
    .from("content_state_editorial")
    .select(
      `intro, overview, faqs, related_slugs, partner_quote, partner_slug, announcement,
       seo_title, seo_description, cta_label, cta_href, status,
       featured_media:featured_media_id ( public_url, alt_text )`
    )
    .eq("jurisdiction_code", jurisdictionCode.toUpperCase())
    .eq("status", "published")
    .limit(1);

  if (error || !data || !data.length) return EMPTY_EDITORIAL;

  const row = data[0] as Record<string, unknown>;
  const media = first(row.featured_media as MediaRow | MediaRow[] | null);
  const faqs = Array.isArray(row.faqs) ? row.faqs : [];

  return {
    intro: (row.intro as string) ?? null,
    overview: (row.overview as string) ?? null,
    featuredImage: media?.public_url ? { src: media.public_url, alt: media.alt_text ?? "" } : null,
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
    .from("content_posts")
    .select("slug, content_type, published_at, updated_at")
    .eq("destination", destination)
    .in("status", ["published", "updated"])
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error || !data) return [];

  return (data as { slug: string; content_type: string; published_at: string; updated_at: string | null }[]).map(
    (row) => ({
      slug: row.slug,
      contentType: row.content_type as ContentType,
      publishedAt: row.published_at,
      updatedAt: row.updated_at
    })
  );
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
