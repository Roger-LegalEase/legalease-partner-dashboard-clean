/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  articleHref,
  brandFor,
  formatPublishDate,
  type ContentSurface
} from "@/components/content/brand";
import type { PublicArticle } from "@/lib/content/types";

/**
 * One article in an index listing.
 *
 * The whole card is one link (the title anchor stretches over the card) so there is exactly one tab
 * stop per article and screen readers announce one accessible name — rather than the three
 * overlapping links (image, title, "read more") that index pages usually end up with.
 *
 * Featured images are remote media-library URLs, so plain <img>: see the note in AuthorByline.
 */
export function ArticleCard({
  article,
  surface,
  variant = "row"
}: {
  article: PublicArticle;
  surface: ContentSurface;
  variant?: "row" | "lead";
}) {
  const brand = brandFor(surface);
  const href = articleHref(surface, article.contentType, article.slug);
  const published = formatPublishDate(article.publishedAt);
  const isLead = variant === "lead";
  const isExpungement = surface === "expungement_ai";

  return (
    <article
      className={`group relative isolate overflow-hidden ${brand.cls.card} ${brand.cls.cardHover} ${
        isLead ? "md:grid md:grid-cols-2 md:items-stretch" : ""
      }`}
    >
      {article.featuredImage ? (
        <div className={`overflow-hidden ${isLead ? "md:h-full" : ""}`}>
          <img
            src={article.featuredImage.src}
            alt={article.featuredImage.alt}
            loading="lazy"
            decoding="async"
            className={`w-full object-cover transition duration-300 group-hover:scale-[1.02] ${
              isLead ? "h-56 md:h-full md:min-h-[320px]" : "h-44"
            }`}
          />
        </div>
      ) : null}

      <div className={`flex flex-col p-6 ${isLead ? "md:justify-center md:p-8" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={brand.cls.tag}>{contentTypeLabel(article.contentType)}</span>
          {published ? (
            <span className={`text-[12px] ${brand.cls.muted}`}>
              <time dateTime={article.publishedAt}>{published}</time>
            </span>
          ) : null}
        </div>

        <h3
          className={`mt-3 ${brand.cls.heading} ${
            isLead ? "text-[26px] leading-[1.15] md:text-[32px]" : "text-[20px] leading-[1.2]"
          }`}
        >
          {/* Stretched link: one tab stop, one accessible name, whole card clickable. */}
          <Link href={href} className={`after:absolute after:inset-0 ${brand.cls.focus}`}>
            {article.title}
          </Link>
        </h3>

        {article.subtitle ? (
          <p className={`mt-2 line-clamp-3 text-[15px] leading-7 ${brand.cls.muted}`}>{article.subtitle}</p>
        ) : (
          <p className={`mt-2 line-clamp-3 text-[15px] leading-7 ${brand.cls.muted}`}>{article.seo.description}</p>
        )}

        <p className={`mt-4 flex items-center gap-2 text-[13px] font-semibold ${brand.cls.muted}`}>
          {article.author ? <span>{article.author.name}</span> : <span>{brand.siteName} Editorial</span>}
          <span aria-hidden="true" className="opacity-50">
            ·
          </span>
          <span>{article.readingMinutes} min read</span>
        </p>

        <span
          aria-hidden="true"
          className={`mt-4 text-[13px] font-extrabold uppercase tracking-[0.08em] ${
            isExpungement ? "text-[#FF3B00]" : "text-[#F04800]"
          }`}
        >
          Read
        </span>
      </div>
    </article>
  );
}

export function contentTypeLabel(contentType: PublicArticle["contentType"]): string {
  switch (contentType) {
    case "partner_story":
      return "Partner story";
    case "partner_insight":
      return "Insight";
    case "product_announcement":
      return "Announcement";
    case "founder_note":
      return "Founder note";
    case "testimonial_story":
      return "Story";
    case "state_resource":
      return "State resource";
    case "downloadable_resource":
      return "Resource";
    case "resource_guide":
      return "Guide";
    case "blog_article":
    default:
      return "Article";
  }
}
