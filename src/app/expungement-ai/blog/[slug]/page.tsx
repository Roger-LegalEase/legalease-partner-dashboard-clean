import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ArticleReader } from "@/components/content/ArticleReader";
import { JsonLd } from "@/components/content/JsonLd";
import { getPublishedArticle, listPublishedArticles, listPublishedSlugs } from "@/lib/content/repository";
import { extractRelatedSlugs } from "@/lib/content/related";
import { authorJsonLdNode, breadcrumbItems, publisherJsonLdNode } from "@/lib/content/seo";
import type { PublicArticle } from "@/lib/content/types";

/**
 * Public route: expungement.ai/blog/<slug>  (host mapped in src/proxy.ts).
 *
 * Prerendered for every published slug. `dynamicParams` is left at its default (true) — unlike the
 * state pages, whose universe is fixed at build time, a post published after the last deploy must be
 * reachable without a redeploy. An unknown slug still 404s, because getPublishedArticle() returns
 * null for anything that is not published (and RLS refuses it a second time at the database).
 */

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  // Empty when Supabase is unconfigured (e.g. a bare CI build). Pages then render on demand.
  const slugs = await listPublishedSlugs("expungement_ai");
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticle({ destination: "expungement_ai", slug });

  if (!article) {
    return { title: "Article not found | Expungement.ai", robots: { index: false, follow: false } };
  }

  return {
    title: `${article.seo.title} | Expungement.ai`,
    description: article.seo.description,
    alternates: { canonical: article.seo.canonical },
    authors: article.author ? [{ name: article.author.name }] : undefined,
    openGraph: {
      title: article.seo.ogTitle,
      description: article.seo.ogDescription,
      url: article.seo.canonical,
      siteName: "Expungement.ai",
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: article.author ? [article.author.name] : undefined,
      images: article.seo.ogImage ? [article.seo.ogImage] : undefined
    },
    twitter: {
      card: article.seo.ogImage ? "summary_large_image" : "summary",
      title: article.seo.ogTitle,
      description: article.seo.ogDescription,
      images: article.seo.ogImage ? [article.seo.ogImage] : undefined
    }
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticle({ destination: "expungement_ai", slug });

  if (!article) {
    notFound();
  }

  const related = await loadRelated(article);
  const canonical = article.seo.canonical;

  // Article + BreadcrumbList structured data. Typed as a plain `Article` with an `Organization`
  // publisher — never LegalService or Attorney, which would imply we practice law.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    alternativeHeadline: article.subtitle ?? undefined,
    description: article.seo.description,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: authorJsonLdNode(article.author, "expungement_ai"),
    publisher: publisherJsonLdNode("expungement_ai"),
    image: article.seo.ogImage ? [article.seo.ogImage] : undefined,
    isAccessibleForFree: true,
    inLanguage: "en-US"
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems("expungement_ai", [
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: article.title, path: `/blog/${article.slug}` }
    ])
  };

  return (
    <ConsumerPageShell wilmaContext="landing" headerVariant="marketing">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <ArticleReader article={article} surface="expungement_ai" canonicalUrl={canonical} related={related} />
    </ConsumerPageShell>
  );
}

/**
 * Related posts: the editor's explicit picks first (resolved from real records — the renderer never
 * lets an editor supply another post's title), topped up with the most recent posts so the rail is
 * never a lonely single card.
 */
async function loadRelated(article: PublicArticle): Promise<PublicArticle[]> {
  const picks = extractRelatedSlugs(article.html, article.slug);

  const resolved = (
    await Promise.all(
      picks.map((slug) => getPublishedArticle({ destination: "expungement_ai", slug }))
    )
  ).filter((item): item is PublicArticle => Boolean(item));

  if (resolved.length >= 2) {
    return resolved.slice(0, 2);
  }

  const seen = new Set([article.slug, ...resolved.map((item) => item.slug)]);
  const recent = await listPublishedArticles({ destination: "expungement_ai", limit: 6 });

  return [...resolved, ...recent.filter((item) => !seen.has(item.slug))].slice(0, 2);
}
