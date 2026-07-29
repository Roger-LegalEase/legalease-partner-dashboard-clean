import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartnerContentShell } from "@/components/content/PartnerContentShell";
import { ArticleReader } from "@/components/content/ArticleReader";
import { JsonLd } from "@/components/content/JsonLd";
import { getPublishedArticle, listPublishedArticles, listPublishedSlugs } from "@/lib/content/repository";
import { extractRelatedSlugs } from "@/lib/content/related";
import { authorJsonLdNode, breadcrumbItems, publisherJsonLdNode } from "@/lib/content/seo";
import type { PublicArticle } from "@/lib/content/types";

/**
 * Public route: legaleasepartner.com/partner-stories/<slug>.
 *
 * Only `partner_story` posts are canonical here; anything else 404s and lives under /insights.
 */

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await listPublishedSlugs("legalease_partner");
  return slugs.filter((entry) => entry.contentType === "partner_story").map(({ slug }) => ({ slug }));
}

async function loadStory(slug: string): Promise<PublicArticle | null> {
  const article = await getPublishedArticle({ destination: "legalease_partner", slug });
  if (!article || article.contentType !== "partner_story") return null;
  return article;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadStory(slug);

  if (!article) {
    return { title: "Partner story not found", robots: { index: false, follow: false } };
  }

  return {
    title: article.seo.title,
    description: article.seo.description,
    alternates: { canonical: article.seo.canonical },
    authors: article.author ? [{ name: article.author.name }] : undefined,
    openGraph: {
      title: article.seo.ogTitle,
      description: article.seo.ogDescription,
      url: article.seo.canonical,
      siteName: "LegalEase Partner",
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: article.author ? [article.author.name] : undefined,
      images: article.seo.ogImage ? [article.seo.ogImage] : undefined
    },
    twitter: {
      card: article.seo.ogImage ? "summary_large_image" : "summary",
      title: article.seo.ogTitle,
      description: article.seo.ogDescription
    }
  };
}

export default async function PartnerStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await loadStory(slug);

  if (!article) {
    notFound();
  }

  const canonical = article.seo.canonical;
  const related = await loadRelated(article);

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
    author: authorJsonLdNode(article.author, "legalease_partner"),
    publisher: publisherJsonLdNode("legalease_partner"),
    image: article.seo.ogImage ? [article.seo.ogImage] : undefined,
    isAccessibleForFree: true,
    inLanguage: "en-US"
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems("legalease_partner", [
      { name: "Home", path: "/" },
      { name: "Partner stories", path: "/partner-stories" },
      { name: article.title, path: `/partner-stories/${article.slug}` }
    ])
  };

  return (
    <PartnerContentShell>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ArticleReader article={article} surface="legalease_partner" canonicalUrl={canonical} related={related} />
    </PartnerContentShell>
  );
}

async function loadRelated(article: PublicArticle): Promise<PublicArticle[]> {
  const picks = extractRelatedSlugs(article.html, article.slug);

  const resolved = (
    await Promise.all(picks.map((slug) => getPublishedArticle({ destination: "legalease_partner", slug })))
  ).filter((item): item is PublicArticle => Boolean(item));

  if (resolved.length >= 2) {
    return resolved.slice(0, 2);
  }

  const seen = new Set([article.slug, ...resolved.map((item) => item.slug)]);
  const recent = await listPublishedArticles({
    destination: "legalease_partner",
    contentTypes: ["partner_story"],
    limit: 6
  });

  return [...resolved, ...recent.filter((item) => !seen.has(item.slug))].slice(0, 2);
}
