import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ArticleList } from "@/components/content/ArticleList";
import { AuthorCard } from "@/components/content/AuthorCard";
import { JsonLd } from "@/components/content/JsonLd";
import { SurfaceCta } from "@/components/content/SurfaceCta";
import { EXPUNGEMENT_BRAND } from "@/components/content/brand";
import { getPublicAuthor, listArticlesByAuthor } from "@/lib/content/repository";
import { buildAuthorJsonLd, buildBreadcrumbJsonLd } from "@/lib/content/seo";
import { absoluteExpungementAiUrl } from "@/lib/app-url";

/**
 * Public route: expungement.ai/authors/<slug>.
 *
 * Lists only this author's posts on THIS destination's reading surface. An author with no published
 * posts still renders (the profile is the point), with an honest empty state.
 */

function canonicalFor(slug: string) {
  return absoluteExpungementAiUrl(`/authors/${slug}`);
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getPublicAuthor(slug);

  if (!author) {
    return { title: "Author not found | Expungement.ai", robots: { index: false, follow: false } };
  }

  const title = `${author.name} | Expungement.ai`;
  const description =
    author.bio?.trim() ||
    `Articles by ${author.name}${author.title ? `, ${author.title}` : ""} on Expungement.ai — plain-language, self-help record-clearing information.`;

  return {
    title,
    description,
    alternates: { canonical: canonicalFor(slug) },
    openGraph: {
      title: author.name,
      description,
      url: canonicalFor(slug),
      siteName: "Expungement.ai",
      type: "profile"
    }
  };
}

export default async function ExpungementAuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await getPublicAuthor(slug);

  if (!author) {
    notFound();
  }

  const brand = EXPUNGEMENT_BRAND;
  const all = await listArticlesByAuthor(slug);
  // An author can write for both destinations; this page only shows the consumer surface's posts.
  const articles = all.filter((article) => article.destination === "expungement_ai");

  return (
    <ConsumerPageShell wilmaContext="landing" headerVariant="marketing">
      <JsonLd data={buildAuthorJsonLd(author, "expungement_ai", canonicalFor(slug))} />
      <JsonLd
        data={buildBreadcrumbJsonLd("expungement_ai", [
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: author.name, path: `/authors/${slug}` }
        ])}
      />

      <div className={brand.cls.shellPadding}>
        <AuthorCard author={author} surface="expungement_ai" linkToProfile={false} headingLevel="h1" />

        <section className="mt-12" aria-labelledby="author-articles">
          <h2 id="author-articles" className={`${brand.cls.heading} text-[22px] md:text-[26px]`}>
            {articles.length ? `Articles by ${author.name}` : "Articles"}
          </h2>
          <div className="mt-6">
            <ArticleList
              articles={articles}
              surface="expungement_ai"
              featureFirst={false}
              emptyTitle="No published articles yet"
              emptyMessage={`${author.name} has not published on Expungement.ai yet. Check back soon.`}
            />
          </div>
        </section>

        <SurfaceCta surface="expungement_ai" />
      </div>
    </ConsumerPageShell>
  );
}
