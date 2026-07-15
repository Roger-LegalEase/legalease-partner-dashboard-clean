import type { Metadata } from "next";
import Link from "next/link";
import { PartnerContentShell } from "@/components/content/PartnerContentShell";
import { ArticleList } from "@/components/content/ArticleList";
import { JsonLd } from "@/components/content/JsonLd";
import { SurfaceCta } from "@/components/content/SurfaceCta";
import { PARTNER_BRAND, articleHref } from "@/components/content/brand";
import { listPublishedArticles } from "@/lib/content/repository";
import { buildBreadcrumbJsonLd, buildCollectionJsonLd } from "@/lib/content/seo";
import { absolutePartnerAppUrl } from "@/lib/app-url";

/**
 * Public route: legaleasepartner.com/partner-stories.
 *
 * Only `partner_story` posts live here — that is the content type whose canonical URL repository.ts
 * puts under /partner-stories/<slug>. Keeping the hub and the canonical rule in lockstep is what
 * stops a post from being indexed at two URLs.
 */

const CANONICAL = absolutePartnerAppUrl("/partner-stories");
const TITLE = "Partner stories";
const DESCRIPTION =
  "What record-clearing access looks like on the ground: the organizations running it, how they built the program, and what changed for the people they serve.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: `${TITLE} | LegalEase Partner`,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "LegalEase Partner",
    type: "website"
  }
};

export default async function PartnerStoriesPage() {
  const brand = PARTNER_BRAND;
  const articles = await listPublishedArticles({
    destination: "legalease_partner",
    contentTypes: ["partner_story"],
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
          { name: "Partner stories", path: "/partner-stories" }
        ])}
      />

      <div className={brand.cls.shellPadding}>
        <header className="max-w-3xl">
          <p className={brand.cls.eyebrow}>Partner stories</p>
          <h1 className={`mt-5 ${brand.cls.heading} text-[36px] leading-[1.08] md:text-[50px]`}>{TITLE}</h1>
          <p className={`mt-5 ${brand.cls.body}`}>{DESCRIPTION}</p>
          <p className="mt-5 text-[14px]">
            <Link href="/insights" className={brand.cls.link}>
              Read partner insights
            </Link>
          </p>
        </header>

        <div className="mt-12">
          <ArticleList
            articles={articles}
            surface="legalease_partner"
            emptyTitle="No partner stories published yet"
            emptyMessage="Stories from the courts, nonprofits, and community organizations running record-clearing programs will appear here as they are published."
          />
        </div>

        <SurfaceCta surface="legalease_partner" />
      </div>
    </PartnerContentShell>
  );
}
