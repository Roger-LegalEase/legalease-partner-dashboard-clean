import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { brandFor, type ContentSurface } from "@/components/content/brand";

/**
 * The contextual product CTA that closes an article, an index, or a resource page.
 *
 * Both anchors carry `data-cta-id`, so when this sits inside a container watched by
 * ContentCtaTracker its clicks land in analytics through the same delegated listener that handles
 * in-body CTAs — one code path, one event shape, no per-link handlers.
 *
 * Copy safety: the microcopy here is a possibility, never a promise. No "qualify", no "eligible",
 * no "approved", no "guarantee" — the court or agency makes the final decision, and we say so.
 */
export function SurfaceCta({
  surface,
  heading,
  body,
  footnote
}: {
  surface: ContentSurface;
  heading?: string;
  body?: string;
  footnote?: string;
}) {
  const brand = brandFor(surface);
  const isExpungement = surface === "expungement_ai";

  const defaultHeading = isExpungement
    ? "See what may be available in your state."
    : "Bring record-clearing access to the people you serve.";

  const defaultBody = isExpungement
    ? "The screening is free. No account or payment is required to begin. If a supported self-help packet is available, review your information before deciding whether to pay $50 to generate it."
    : "LegalEase partners with courts, nonprofits, employers, and community organizations to make record clearing reachable. LegalEase provides self-help document preparation. It is not a law firm and does not give legal advice.";

  const defaultFootnote = isExpungement
    ? "Self-help document preparation. Not a law firm, and not legal advice. A record-clearing path may be available in some situations and not in others; the court or agency makes the final decision."
    : "Self-help document preparation. LegalEase is not a law firm and does not provide legal advice. The court or agency makes the final decision on every record.";

  return (
    <section className={brand.cls.ctaPanel} aria-label="Next step">
      <h2 className={brand.cls.ctaPanelHeading}>{heading ?? defaultHeading}</h2>
      <p className={brand.cls.ctaPanelBody}>{body ?? defaultBody}</p>

      <div className={`mt-6 flex flex-col gap-3 sm:flex-row ${isExpungement ? "sm:justify-center" : ""}`}>
        <Link
          href={brand.ctas.primary.href}
          data-cta-id={brand.ctas.primary.ctaId}
          className={brand.cls.ctaPrimary}
        >
          {brand.ctas.primary.label}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        <Link
          href={brand.ctas.secondary.href}
          data-cta-id={brand.ctas.secondary.ctaId}
          className={
            isExpungement
              ? `inline-flex min-h-14 items-center justify-center rounded-[14px] border border-white/25 px-6 py-4 text-base font-bold text-white transition hover:bg-white/10 ${brand.cls.focus}`
              : `inline-flex min-h-12 items-center justify-center rounded-[2px] border border-[#B8D8D8] px-6 py-3.5 text-[15px] font-bold text-white transition hover:bg-white hover:text-[#101046] ${brand.cls.focus}`
          }
        >
          {brand.ctas.secondary.label}
        </Link>
      </div>

      <p className={`mt-5 text-[12.5px] leading-6 ${isExpungement ? "text-center text-[#8A93A6]" : "max-w-2xl text-[#8A8AA5]"}`}>
        {footnote ?? defaultFootnote}
      </p>
    </section>
  );
}
