/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, ListChecks, MessageSquareQuote, Scale, ShieldCheck } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ContentCtaTracker } from "@/components/content/ContentCtaTracker";
import { JsonLd } from "@/components/content/JsonLd";
import { EXPUNGEMENT_BRAND } from "@/components/content/brand";
import { getPublishedStateEditorial } from "@/lib/content/repository";
import { buildBreadcrumbJsonLd } from "@/lib/content/seo";
import {
  getPublicStateResource,
  listPublishableJurisdictionSlugs,
  type PublicStateResource
} from "@/lib/content/state-resources";

/**
 * Public route: expungement.ai/resources/<jurisdiction>.
 *
 * ── SAFETY MODEL ───────────────────────────────────────────────────────────────────────────────
 * This page renders TWO layers and keeps them visually and structurally distinct:
 *
 *   LOCKED    — displayTerm, termBlurb, allowedStateTerms, pathwayHighlights. Derived from the
 *               approved engine projection via state-resources.ts, which is the ONLY door between
 *               the record-clearing engine and a public page. It is not editable in the CMS.
 *   EDITORIAL — intro, overview, FAQs, announcement, partner quote. Authored in the CMS. It carries
 *               no legal rules and can never contradict the locked layer, because it cannot write to
 *               it.
 *
 * This file therefore imports NOTHING from the record-clearing engine, the compiled profiles, the
 * state packs, or the engine's own "public" projection helpers (which are a screening contract, not
 * a publishing one). It goes through state-resources.ts, which runs a publish gate (the jurisdiction
 * must be cleared for live on this channel) and a leak gate (assertNoInternalLeak throws rather than
 * render internal corpus text).
 *
 * Copy rules, asserted against the rendered page by scripts/verify-content-visual.mjs: we never
 * promise an outcome, and we never invent waiting periods, exclusions, fees, forms, or filing steps.
 * A path "may be available". The court or agency makes the final decision. LegalEase is not a law
 * firm and this is self-help, not legal advice.
 *
 * This page is editorial only: no pricing, no payment surface, no checkout of any kind.
 */

export function generateStaticParams(): { jurisdiction: string }[] {
  return listPublishableJurisdictionSlugs().map((jurisdiction) => ({ jurisdiction }));
}

// Only approved, live jurisdictions exist here. Anything else is a real 404 — never a generic page.
export const dynamicParams = false;

export async function generateMetadata({
  params
}: {
  params: Promise<{ jurisdiction: string }>;
}): Promise<Metadata> {
  const { jurisdiction } = await params;
  const resource = await loadResource(jurisdiction);

  if (!resource) {
    return { title: "Record-clearing resources | Expungement.ai", robots: { index: false, follow: false } };
  }

  return {
    title: resource.seo.title,
    description: resource.seo.description,
    alternates: { canonical: resource.seo.canonical },
    openGraph: {
      title: resource.seo.ogTitle,
      description: resource.seo.ogDescription,
      url: resource.seo.canonical,
      siteName: "Expungement.ai",
      type: "website",
      images: resource.editorial.featuredImage ? [resource.editorial.featuredImage.src] : undefined
    }
  };
}

export default async function StateResourcePage({
  params
}: {
  params: Promise<{ jurisdiction: string }>;
}) {
  const { jurisdiction } = await params;
  const resource = await loadResource(jurisdiction);

  if (!resource) {
    notFound();
  }

  const brand = EXPUNGEMENT_BRAND;
  const { locked, editorial } = resource;
  const containerId = `state-resource-${locked.slug}`;

  // An editor supplies this href, so it is validated against the same URL allowlist the renderer
  // uses (no javascript:, no data:, no protocol-relative). An unsafe href degrades to the standard
  // free-check CTA rather than rendering a link we cannot vouch for.

  return (
    <ConsumerPageShell wilmaContext="landing" headerVariant="marketing">
      <JsonLd
        data={buildBreadcrumbJsonLd("expungement_ai", [
          { name: "Home", path: "/" },
          { name: "Resources", path: "/resources" },
          { name: locked.name, path: `/resources/${locked.slug}` }
        ])}
      />
      <ContentCtaTracker containerId={containerId} articleSlug={locked.slug} surface="expungement_ai" />

      <div id={containerId} className={brand.cls.shellPadding}>
        {/* --- Hero ---------------------------------------------------------------------------- */}
        <header className="mx-auto max-w-3xl text-center">
          <p className={brand.cls.eyebrow}>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {locked.name} record clearing
          </p>

          <h1 className={`mt-5 ${brand.cls.heading} text-[36px] leading-[1.06] md:text-[52px]`}>
            {locked.name} {locked.displayTerm}: what to know before you start
          </h1>

          {/* EDITORIAL intro, with a copy-safe fallback that promises nothing. */}
          <p className={`mx-auto mt-5 max-w-2xl ${brand.cls.body}`}>
            {editorial.intro?.trim() ||
              `Here is how record clearing works in ${locked.name}, in plain language. A record-clearing path may be available in some situations and not in others. The free guided check walks you through what ${locked.name} looks at.`}
          </p>

          <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={locked.screeningHref}
              data-cta-id="state_resource_start_free_check"
              className={brand.cls.ctaPrimary}
            >
              Start free
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href={brand.ctas.secondary.href}
              data-cta-id={brand.ctas.secondary.ctaId}
              className={brand.cls.ctaSecondary}
            >
              {brand.ctas.secondary.label}
            </Link>
          </div>

          <p className="mt-3 text-[13px]">
            <Link className={brand.cls.link} href={locked.statePickerHref}>
              Choose a different state
            </Link>
          </p>
        </header>

        {/* --- EDITORIAL announcement ---------------------------------------------------------- */}
        {editorial.announcement?.trim() ? (
          <aside className="mt-10 rounded-[16px] border border-[#B9E7E1] bg-[#E7F7F4] px-5 py-4 text-[14px] leading-6 text-[#0B1320]">
            {editorial.announcement}
          </aside>
        ) : null}

        {/* --- LOCKED LAYER -------------------------------------------------------------------- */}
        {/* Everything in this block comes from the approved engine projection. Not CMS-editable. */}
        <section className={`mt-12 ${brand.cls.card} p-6 md:p-8`} aria-labelledby="state-vocabulary">
          <h2 id="state-vocabulary" className={`flex items-center gap-3 ${brand.cls.heading} text-[20px]`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E7F7F4] text-[#00A99D]">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </span>
            What {locked.name} calls it: {locked.displayTerm}
          </h2>

          <p className={`mt-4 text-[15px] leading-7 ${brand.cls.muted}`}>{locked.termBlurb}</p>

          {locked.allowedStateTerms.length ? (
            <div className="mt-5">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A93A6]">
                Words used in {locked.name}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {locked.allowedStateTerms.map((term) => (
                  <li key={term} className={brand.cls.tag}>
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {locked.pathwayHighlights.length ? (
          <section className={`mt-8 ${brand.cls.card} p-6 md:p-8`} aria-labelledby="state-pathways">
            <h2 id="state-pathways" className={`flex items-center gap-3 ${brand.cls.heading} text-[20px]`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E7F7F4] text-[#00A99D]">
                <ListChecks className="h-5 w-5" aria-hidden="true" />
              </span>
              Record-clearing paths Expungement.ai supports in {locked.name}
            </h2>

            <p className={`mt-3 text-[14px] leading-6 ${brand.cls.muted}`}>
              These are the options the free check asks about in {locked.name}. Whether one fits depends on the
              details of your situation, and the court or agency makes the final decision.
            </p>

            <ul className="mt-4 grid gap-2">
              {locked.pathwayHighlights.map((pathway) => (
                <li
                  key={pathway}
                  className="flex items-start gap-3 rounded-[12px] border border-[#ECEFF4] bg-[#FBFAF7] px-4 py-3 text-[14px] leading-6 text-[#0B1320]"
                >
                  <span className="mt-2 h-[7px] w-[7px] shrink-0 rounded-full bg-[#00A99D]" aria-hidden="true" />
                  <span>{pathway}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* --- EDITORIAL LAYER ----------------------------------------------------------------- */}
        {editorial.overview?.trim() || editorial.featuredImage ? (
          <section className={`mt-8 ${brand.cls.card} p-6 md:p-8`} aria-labelledby="state-overview">
            <h2 id="state-overview" className={`flex items-center gap-3 ${brand.cls.heading} text-[20px]`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E7F7F4] text-[#00A99D]">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              {locked.name} overview
            </h2>

            {editorial.featuredImage ? (
              <img
                src={editorial.featuredImage.src}
                alt={editorial.featuredImage.alt}
                loading="lazy"
                decoding="async"
                className="mt-5 w-full rounded-[16px] object-cover"
              />
            ) : null}

            {editorial.overview?.trim() ? (
              <div className="mt-5 grid gap-4">
                {editorial.overview
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index} className={`text-[15px] leading-7 ${brand.cls.muted}`}>
                      {paragraph}
                    </p>
                  ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {editorial.faqs.length ? (
          <section className={`mt-8 ${brand.cls.card} p-6 md:p-8`} aria-labelledby="state-faq">
            <h2 id="state-faq" className={`${brand.cls.heading} text-[20px]`}>
              Common questions about {locked.name} record clearing
            </h2>
            <div className="mt-4 grid gap-3">
              {editorial.faqs.map((faq) => (
                <details key={faq.question} className="rounded-[12px] border border-[#ECEFF4] bg-white px-4 py-3">
                  <summary
                    className={`cursor-pointer list-none text-[15px] font-bold text-[#0B1320] marker:content-none ${brand.cls.focus}`}
                  >
                    {faq.question}
                  </summary>
                  <p className={`mt-2 text-[14px] leading-7 ${brand.cls.muted}`}>{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {editorial.partnerQuote?.trim() ? (
          <section className={`mt-8 ${brand.cls.card} p-6 md:p-8`} aria-label="From a partner">
            <blockquote className="flex gap-4">
              <MessageSquareQuote className="h-6 w-6 shrink-0 text-[#00A99D]" aria-hidden="true" />
              <p className="text-[17px] font-semibold leading-8 text-[#0B1320]">{editorial.partnerQuote}</p>
            </blockquote>
          </section>
        ) : null}

        {/* --- Standing disclaimer (fixed copy — an editor cannot author or remove it) ---------- */}
        <section className="mt-10 rounded-[16px] border border-dashed border-[#D9DEE8] bg-white px-6 py-5">
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A93A6]">
            Before you rely on this page
          </h2>
          <p className={`mt-2 text-[13.5px] leading-7 ${brand.cls.muted}`}>{resource.disclaimer}</p>
          <p className={`mt-2 text-[13.5px] leading-7 ${brand.cls.muted}`}>
            Expungement.ai is a self-help document preparation service. It does not decide whether a court will grant
            record clearing, and nothing here is a promise about the outcome of your case.
          </p>
        </section>

        {/* --- Closing CTA --------------------------------------------------------------------- */}
        <section className={brand.cls.ctaPanel} aria-label="Next step">
          <h2 className={brand.cls.ctaPanelHeading}>See what may be available in {locked.name}.</h2>
          <p className={brand.cls.ctaPanelBody}>
            No account or payment is required to begin. The free guided check walks through what {locked.name}{" "}
            looks at and shows whether a supported self-help packet may be available.
          </p>

          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={locked.screeningHref}
              data-cta-id="state_resource_final_cta"
              className={brand.cls.ctaPrimary}
            >
              Start free
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href={locked.statePickerHref}
              data-cta-id="state_resource_change_state"
              className={`inline-flex min-h-14 items-center justify-center rounded-[14px] border border-white/25 px-6 py-4 text-base font-bold text-white transition hover:bg-white/10 ${brand.cls.focus}`}
            >
              Choose a different state
            </Link>
          </div>

          <p className="mx-auto mt-5 max-w-xl text-center text-[12.5px] leading-6 text-[#8A93A6]">
            Self-help document preparation. LegalEase is not a law firm, and this is not legal advice. The court or
            agency makes the final decision.
          </p>
        </section>
      </div>
    </ConsumerPageShell>
  );
}

/**
 * Build the payload. The editorial layer is keyed by jurisdiction CODE, which only the locked layer
 * knows — so resolve the locked layer first (pure, no I/O), then load the editorial layer, then
 * rebuild with both. Everything crosses through state-resources.ts; nothing reaches around it.
 */
async function loadResource(slug: string): Promise<PublicStateResource | null> {
  const base = getPublicStateResource(slug);
  if (!base) return null;

  const editorial = await getPublishedStateEditorial(base.locked.code);
  return getPublicStateResource(slug, editorial);
}
