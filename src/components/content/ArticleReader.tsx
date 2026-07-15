/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArticleCard } from "@/components/content/ArticleCard";
import { ArticleViewBeacon } from "@/components/content/ArticleViewBeacon";
import { AuthorByline } from "@/components/content/AuthorByline";
import { AuthorCard } from "@/components/content/AuthorCard";
import { ContentCtaTracker } from "@/components/content/ContentCtaTracker";
import { ShareBar } from "@/components/content/ShareBar";
import { SurfaceCta } from "@/components/content/SurfaceCta";
import { contentTypeLabel } from "@/components/content/ArticleCard";
import { brandFor, indexHref, type ContentSurface } from "@/components/content/brand";
import type { PublicArticle } from "@/lib/content/types";

/**
 * The reading experience. Server component — no client JS beyond the three small islands it mounts
 * (view beacon, CTA tracker, share bar).
 *
 * ── Why dangerouslySetInnerHTML is correct here ────────────────────────────────────────────────
 * `article.html` is NOT editor-supplied HTML. The CMS stores a structured block document, and
 * src/lib/content/renderer.ts is the only thing that turns it into markup: it walks an allowlist of
 * node types, escapes every text value, re-emits every attribute individually, and validates every
 * URL against a scheme allowlist. There is no code path by which a string in the document becomes
 * markup, and there is no raw-HTML block type. So the HTML reaching this component is already
 * allowlisted and sanitized server-side, and injecting it is safe by construction. Do not "improve"
 * this by sanitizing the string again at render time — that would imply the renderer's output is
 * untrusted, which would be the actual bug.
 *
 * Layout: a 720px reading column (within the 680–760px range Medium-style body text reads best at),
 * with wide/full images breaking out of the column. The breakout is contained by `overflow-x: clip`
 * on .content-article so the page body never scrolls sideways. See globals.css.
 */
export function ArticleReader({
  article,
  surface,
  canonicalUrl,
  related = []
}: {
  article: PublicArticle;
  surface: ContentSurface;
  canonicalUrl: string;
  related?: PublicArticle[];
}) {
  const brand = brandFor(surface);
  const isExpungement = surface === "expungement_ai";
  // One container for the beacon/tracker to attach to: the delegated CTA listener covers both the
  // rendered body and the closing CTA panel, so every data-cta-id on the page is instrumented once.
  const containerId = `content-article-${article.slug}`;
  const hubHref = indexHref(surface, article.contentType);
  const hubLabel =
    surface === "expungement_ai"
      ? "All articles"
      : article.contentType === "partner_story"
        ? "All partner stories"
        : "All insights";

  return (
    <>
      <ArticleViewBeacon articleSlug={article.slug} surface={surface} contentType={article.contentType} />
      <ContentCtaTracker containerId={containerId} articleSlug={article.slug} surface={surface} />

      <article id={containerId} className="content-article pb-24 pt-12 md:pt-16">
        {/* --- Header ------------------------------------------------------------------------- */}
        <header className="mx-auto w-full max-w-[720px] px-4">
          <Link
            href={hubHref}
            className={`inline-flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.08em] ${
              isExpungement ? "text-[#00A99D]" : "text-[#1F8F88]"
            } ${brand.cls.focus} rounded-[4px]`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {hubLabel}
          </Link>

          <p className={`mt-6 ${brand.cls.tag}`}>{contentTypeLabel(article.contentType)}</p>

          <h1
            className={`mt-4 ${brand.cls.heading} text-[34px] leading-[1.1] md:text-[48px] md:leading-[1.06]`}
          >
            {article.title}
          </h1>

          {article.subtitle ? (
            <p className={`mt-5 text-[19px] leading-8 ${brand.cls.muted}`}>{article.subtitle}</p>
          ) : null}

          <div className={`mt-8 border-t pt-6 ${brand.cls.divider}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <AuthorByline
                author={article.author}
                surface={surface}
                publishedAt={article.publishedAt}
                updatedAt={article.updatedAt}
                readingMinutes={article.readingMinutes}
              />
              <ShareBar
                url={canonicalUrl}
                title={article.title}
                articleSlug={article.slug}
                surface={surface}
              />
            </div>
          </div>
        </header>

        {/* --- Featured image ------------------------------------------------------------------ */}
        {article.featuredImage ? (
          <figure className="mx-auto mt-10 w-full max-w-[1040px] px-4">
            <img
              src={article.featuredImage.src}
              alt={article.featuredImage.alt}
              // Above the fold: load eagerly and give it layout priority over body images.
              loading="eager"
              decoding="async"
              className={`w-full object-cover ${isExpungement ? "rounded-[18px]" : "rounded-[2px]"}`}
            />
            {article.featuredImage.caption || article.featuredImage.credit ? (
              <figcaption className="mx-auto mt-3 flex max-w-[720px] flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
                {article.featuredImage.caption ? (
                  <span className={brand.cls.muted}>{article.featuredImage.caption}</span>
                ) : null}
                {article.featuredImage.credit ? (
                  <span className={`italic opacity-75 ${brand.cls.muted}`}>{article.featuredImage.credit}</span>
                ) : null}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {/* --- Body --------------------------------------------------------------------------- */}
        <div className="mx-auto mt-12 w-full max-w-[720px] px-4">
          <div
            className="content-body"
            data-surface={surface}
            // SAFE: allowlisted, escaped HTML produced server-side by renderContentDoc(). See the
            // module comment above — this is not editor-authored markup.
            dangerouslySetInnerHTML={{ __html: article.html }}
          />

          {/* --- Footer: share, author, related, CTA ------------------------------------------ */}
          <footer className="mt-14">
            <div className={`flex flex-wrap items-center justify-between gap-4 border-t pt-6 ${brand.cls.divider}`}>
              <p className={`text-[13px] font-bold uppercase tracking-[0.08em] ${brand.cls.muted}`}>
                Share this article
              </p>
              <ShareBar url={canonicalUrl} title={article.title} articleSlug={article.slug} surface={surface} />
            </div>

            {article.author ? (
              <div className="mt-8">
                <AuthorCard author={article.author} surface={surface} />
              </div>
            ) : null}

            {related.length ? (
              <section className="mt-14" aria-labelledby={`${containerId}-related`}>
                <h2
                  id={`${containerId}-related`}
                  className={`${brand.cls.heading} text-[22px] md:text-[26px]`}
                >
                  Keep reading
                </h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {related.map((item) => (
                    <ArticleCard key={item.slug} article={item} surface={surface} />
                  ))}
                </div>
              </section>
            ) : null}

            <SurfaceCta surface={surface} />
          </footer>
        </div>
      </article>
    </>
  );
}
