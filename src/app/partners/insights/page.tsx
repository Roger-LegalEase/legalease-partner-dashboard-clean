import type { Metadata } from "next";
import Link from "next/link";
import { PartnerContentShell } from "@/components/content/PartnerContentShell";
import { ArticleList } from "@/components/content/ArticleList";
import { JsonLd } from "@/components/content/JsonLd";
import { SurfaceCta } from "@/components/content/SurfaceCta";
import { PARTNER_BRAND, PARTNER_INSIGHT_TYPES, articleHref } from "@/components/content/brand";
import { listPublishedArticles } from "@/lib/content/repository";
import { buildBreadcrumbJsonLd, buildCollectionJsonLd } from "@/lib/content/seo";
import { absolutePartnerAppUrl } from "@/lib/app-url";

/**
 * Public route: legaleasepartner.com/insights  (host mapped in src/proxy.ts → /partners/insights).
 *
 * "Insights" is everything on the partner destination EXCEPT partner stories, which have their own
 * hub. That split mirrors repository.ts's canonical rule (partner_story → /partner-stories/<slug>,
 * everything else → /insights/<slug>), so a post is only ever reachable at one canonical URL.
 */

const CANONICAL = absolutePartnerAppUrl("/insights");
const TITLE = "Partner insights";
const DESCRIPTION =
  "How courts, nonprofits, employers, and community organizations expand record-clearing access: program design, operations, funding, and what changes for the people they serve.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: CANONICAL,
    types: { "application/rss+xml": absolutePartnerAppUrl("/insights/feed.xml") }
  },
  openGraph: {
    title: `${TITLE} | LegalEase Partner`,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "LegalEase Partner",
    type: "website"
  }
};

export default async function PartnerInsightsPage() {
  const brand = PARTNER_BRAND;
  const articles = await listPublishedArticles({
    destination: "legalease_partner",
    contentTypes: PARTNER_INSIGHT_TYPES,
    limit: 50
  });

  const collectionJsonLd = buildCollectionJsonLd({
    surface: "legalease_partner",
    name: TITLE,
    description: DESCRIPTION,
    canonical: CANONICAL,
    items: articles.map((article) => ({
      title: article.title,
      path: articleHref("legalease_partner", article.contentType, article.slug)
    }))
  });

  return (
    <PartnerContentShell>
      <JsonLd data={collectionJsonLd} />
      <JsonLd
        data={buildBreadcrumbJsonLd("legalease_partner", [
          { name: "Home", path: "/" },
          { name: "Insights", path: "/insights" }
        ])}
      />

      <div className={brand.cls.shellPadding}>
        <header className="max-w-3xl">
          <p className={brand.cls.eyebrow}>{brand.hubName}</p>
          <h1 className={`mt-5 ${brand.cls.heading} text-[36px] leading-[1.08] md:text-[50px]`}>{TITLE}</h1>
          <p className={`mt-5 ${brand.cls.body}`}>{DESCRIPTION}</p>
          <p className="mt-5 flex flex-wrap items-center gap-5 text-[14px]">
            <Link href="/partner-stories" className={brand.cls.link}>
              Read partner stories
            </Link>
            <a href="/insights/feed.xml" className={brand.cls.link}>
              RSS feed
            </a>
          </p>
        </header>

        <div className="mt-12">
          <ArticleList
            articles={articles}
            surface="legalease_partner"
            emptyTitle="No insights published yet"
            emptyMessage="Program design notes, operational guidance, and partner research will appear here as they are published."
          />
        </div>

        <SurfaceCta surface="legalease_partner" />
      </div>
    </PartnerContentShell>
  );
}
