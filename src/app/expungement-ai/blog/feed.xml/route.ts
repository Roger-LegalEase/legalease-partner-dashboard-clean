import { listPublishedArticles } from "@/lib/content/repository";
import { buildRssFeed, RSS_HEADERS } from "@/lib/content/rss";
import { articleHref } from "@/components/content/brand";

/**
 * RSS feed: expungement.ai/blog/feed.xml.
 *
 * Titles, links, dates, and summaries only — never the rendered article HTML (see rss.ts). When
 * Supabase is unconfigured the repository returns an empty list and this still serves a valid,
 * empty channel rather than failing the request.
 */
export async function GET() {
  const articles = await listPublishedArticles({ destination: "expungement_ai", limit: 50 });

  const xml = buildRssFeed({
    surface: "expungement_ai",
    title: "Expungement.ai — Record-clearing articles",
    description:
      "Plain-language articles about clearing a criminal record: how the process works, what to prepare, and what to expect from the court. Self-help information — not legal advice.",
    indexPath: "/blog",
    feedPath: "/blog/feed.xml",
    articles,
    itemPath: (article) => articleHref("expungement_ai", article.contentType, article.slug)
  });

  return new Response(xml, { headers: RSS_HEADERS });
}
