import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartnerContentShell } from "@/components/content/PartnerContentShell";
import { ArticleList } from "@/components/content/ArticleList";
import { AuthorCard } from "@/components/content/AuthorCard";
import { JsonLd } from "@/components/content/JsonLd";
import { SurfaceCta } from "@/components/content/SurfaceCta";
import { PARTNER_BRAND } from "@/components/content/brand";
import { getPublicAuthor, listArticlesByAuthor } from "@/lib/content/repository";
import { buildAuthorJsonLd, buildBreadcrumbJsonLd } from "@/lib/content/seo";
import { absolutePartnerAppUrl } from "@/lib/app-url";

/**
 * Public route: legaleasepartner.com/authors/<slug>.
 *
 * Shows only this author's posts on the PARTNER destination. The same person can also write for
 * Expungement.ai; those posts belong to that surface's author page and are filtered out here, so a
 * consumer article is never surfaced (or indexed) on the partner domain.
 */

function canonicalFor(slug: string) {
  return absolutePartnerAppUrl(`/authors/${slug}`);
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getPublicAuthor(slug);

  if (!author) {
    return { title: "Author not found", robots: { index: false, follow: false } };
  }

  const description =
    author.bio?.trim() ||
    `Insights and partner stories by ${author.name}${author.title ? `, ${author.title}` : ""} on LegalEase Partner.`;

  return {
    title: author.name,
    description,
    alternates: { canonical: canonicalFor(slug) },
    openGraph: {
      title: `${author.name} | LegalEase Partner`,
      description,
      url: canonicalFor(slug),
      siteName: "LegalEase Partner",
      type: "profile"
    }
  };
}

export default async function PartnerAuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await getPublicAuthor(slug);

  if (!author) {
    notFound();
  }

  const brand = PARTNER_BRAND;
  const all = await listArticlesByAuthor(slug);
  const articles = all.filter((article) => article.destination === "legalease_partner");

  return (
    <PartnerContentShell>
      <JsonLd data={buildAuthorJsonLd(author, "legalease_partner", canonicalFor(slug))} />
      <JsonLd
        data={buildBreadcrumbJsonLd("legalease_partner", [
          { name: "Home", path: "/" },
          { name: "Insights", path: "/insights" },
          { name: author.name, path: `/authors/${slug}` }
        ])}
      />

      <div className={brand.cls.shellPadding}>
        <AuthorCard author={author} surface="legalease_partner" linkToProfile={false} headingLevel="h1" />

        <section className="mt-12" aria-labelledby="author-articles">
          <h2 id="author-articles" className={`${brand.cls.heading} text-[22px] md:text-[26px]`}>
            {articles.length ? `Published by ${author.name}` : "Published work"}
          </h2>
          <div className="mt-6">
            <ArticleList
              articles={articles}
              surface="legalease_partner"
              featureFirst={false}
              emptyTitle="No published work yet"
              emptyMessage={`${author.name} has not published on LegalEase Partner yet. Check back soon.`}
            />
          </div>
        </section>

        <SurfaceCta surface="legalease_partner" />
      </div>
    </PartnerContentShell>
  );
}
