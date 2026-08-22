import { listPublishedArticles } from "@/lib/content/repository";
import { buildRssFeed, RSS_HEADERS } from "@/lib/content/rss";
import { PARTNER_INSIGHT_TYPES, articleHref } from "@/components/content/brand";

/**
 * RSS feed: legaleasepartner.com/insights/feed.xml.
 *
 * Mirrors the /insights hub exactly — same content types, same canonical item paths — so a
 * subscriber sees what a visitor sees. Partner stories are not in this feed; they are a separate hub
 * with a separate canonical prefix.
 */
export async function GET() {
  const articles = await listPublishedArticles({
    destination: "legalease_partner",
    contentTypes: PARTNER_INSIGHT_TYPES,
    limit: 50
  });

  const xml = buildRssFeed({
    surface: "legalease_partner",
    title: "LegalEase Partner Insights",
    description:
      "How courts, nonprofits, employers, and community organizations expand record-clearing access: program design, operations, funding, and outcomes.",
    indexPath: "/insights",
    feedPath: "/insights/feed.xml",
    articles,
    itemPath: (article) => articleHref("legalease_partner", article.contentType, article.slug)
  });

  return new Response(xml, { headers: RSS_HEADERS });
}
