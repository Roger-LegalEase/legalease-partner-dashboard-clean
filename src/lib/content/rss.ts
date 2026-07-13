import type { PublicArticle } from "@/lib/content/types";
import { absoluteContentUrl, siteNameFor } from "@/lib/content/seo";
import type { ContentDestination } from "@/lib/content/types";

/**
 * RSS 2.0 feed builder for the public editorial surfaces.
 *
 * The feed carries titles, links, dates, and the plain-text description ONLY — never the rendered
 * article HTML. Two reasons: a feed reader is a third-party rendering context we do not control, and
 * the full body carries CTAs and disclaimers whose meaning depends on the page they sit on. Every
 * value is XML-escaped on the way out (same fail-closed posture as the HTML renderer).
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date(0).toUTCString() : date.toUTCString();
}

export function buildRssFeed(options: {
  surface: ContentDestination;
  title: string;
  description: string;
  /** Public path of the feed's own index page, e.g. "/blog". */
  indexPath: string;
  /** Public path of the feed document, e.g. "/blog/feed.xml". */
  feedPath: string;
  articles: PublicArticle[];
  /** Maps an article to its public path — differs per surface (insights vs partner-stories). */
  itemPath: (article: PublicArticle) => string;
}): string {
  const indexUrl = absoluteContentUrl(options.surface, options.indexPath);
  const feedUrl = absoluteContentUrl(options.surface, options.feedPath);

  const items = options.articles
    .map((article) => {
      const url = absoluteContentUrl(options.surface, options.itemPath(article));
      const author = article.author?.name ? `<dc:creator>${escapeXml(article.author.name)}</dc:creator>` : "";
      return [
        "    <item>",
        `      <title>${escapeXml(article.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(article.seo.description)}</description>`,
        `      <pubDate>${rfc822(article.publishedAt)}</pubDate>`,
        author ? `      ${author}` : "",
        "    </item>"
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const lastBuild = options.articles[0]?.publishedAt ?? new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(options.title)}</title>
    <link>${escapeXml(indexUrl)}</link>
    <description>${escapeXml(options.description)}</description>
    <language>en-us</language>
    <copyright>${escapeXml(siteNameFor(options.surface))}</copyright>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

/** Shared response headers for a feed document. */
export const RSS_HEADERS = {
  "content-type": "application/rss+xml; charset=utf-8",
  "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
} as const;
