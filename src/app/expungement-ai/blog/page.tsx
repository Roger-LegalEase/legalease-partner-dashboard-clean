import type { Metadata } from "next";
import Link from "next/link";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ArticleList } from "@/components/content/ArticleList";
import { JsonLd } from "@/components/content/JsonLd";
import { SurfaceCta } from "@/components/content/SurfaceCta";
import { EXPUNGEMENT_BRAND, articleHref } from "@/components/content/brand";
import { listPublishedArticles } from "@/lib/content/repository";
import { buildBreadcrumbJsonLd, buildCollectionJsonLd } from "@/lib/content/seo";
import { absoluteExpungementAiUrl } from "@/lib/app-url";

/**
 * Public route: expungement.ai/blog  (host mapped in src/proxy.ts → /expungement-ai/blog).
 *
 * Statically generated. When Supabase is not configured — which is the case in a bare build — the
 * repository returns an empty list rather than throwing, and this page renders an honest empty
 * state. It must never crash the build and must never invent placeholder articles.
 */

const CANONICAL = absoluteExpungementAiUrl("/blog");
const TITLE = "Record-clearing articles, explained in plain language";
const DESCRIPTION =
  "Plain-language articles about clearing a criminal record: how the process works, what to prepare, and what to expect from the court. Self-help information from Expungement.ai, not legal advice.";

export const metadata: Metadata = {
  title: `${TITLE} | Expungement.ai`,
  description: DESCRIPTION,
  alternates: {
    canonical: CANONICAL,
    types: { "application/rss+xml": absoluteExpungementAiUrl("/blog/feed.xml") }
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "Expungement.ai",
    type: "website"
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION }
};

export default async function BlogIndexPage() {
  const brand = EXPUNGEMENT_BRAND;
  const articles = await listPublishedArticles({ destination: "expungement_ai", limit: 50 });

  const collectionJsonLd = buildCollectionJsonLd({
    surface: "expungement_ai",
    name: TITLE,
    description: DESCRIPTION,
    canonical: CANONICAL,
    items: articles.map((article) => ({
      title: article.title,
      path: articleHref("expungement_ai", article.contentType, article.slug)
    }))
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd("expungement_ai", [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" }
  ]);

  return (
    <ConsumerPageShell wilmaContext="landing" headerVariant="marketing">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className={brand.cls.shellPadding}>
        <header className="mx-auto max-w-3xl text-center">
          <p className={brand.cls.eyebrow}>{brand.hubName}</p>
          <h1 className={`mt-5 ${brand.cls.heading} text-[36px] leading-[1.06] md:text-[52px]`}>{TITLE}</h1>
          <p className={`mx-auto mt-5 max-w-2xl ${brand.cls.body}`}>{DESCRIPTION}</p>
          <p className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[13px]">
            <Link href="/resources" className={brand.cls.link}>
              Browse resources by state
            </Link>
            <a href="/blog/feed.xml" className={brand.cls.link}>
              RSS feed
            </a>
          </p>
        </header>

        <div className="mt-14">
          <ArticleList
            articles={articles}
            surface="expungement_ai"
            emptyTitle="No articles published yet"
            emptyMessage="New plain-language articles about clearing a record will appear here as they are published. In the meantime, you can browse record-clearing resources by state."
          />
        </div>

        <SurfaceCta surface="expungement_ai" />
      </div>
    </ConsumerPageShell>
  );
}
