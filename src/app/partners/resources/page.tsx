import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PartnerContentShell } from "@/components/content/PartnerContentShell";
import { JsonLd } from "@/components/content/JsonLd";
import { SurfaceCta } from "@/components/content/SurfaceCta";
import { PARTNER_BRAND } from "@/components/content/brand";
import { buildBreadcrumbJsonLd } from "@/lib/content/seo";
import { listPublishableJurisdictions } from "@/lib/content/state-resources";
import { absolutePartnerAppUrl, productionExpungementAiUrl } from "@/lib/app-url";

/**
 * Public route: legaleasepartner.com/resources — the partner-facing nationwide directory.
 *
 * ── ONE CANONICAL HOME FOR STATE CONTENT ────────────────────────────────────────────────────────
 * This page is a DIRECTORY, not a second copy of the state content. Every row links out to the
 * canonical Expungement.ai resource page (https://expungement.ai/resources/<slug>). Duplicating the
 * state material on this domain would create two indexable pages for the same content, split their
 * ranking, and — far worse — create a second place where the legal vocabulary could drift out of
 * sync with the engine. There is exactly one home for state content, and it is not here.
 *
 * The cross-domain links use `productionExpungementAiUrl` rather than the env-aware
 * absoluteExpungementAiUrl(), for the same reason state-resources.ts pins its canonical to it: a
 * canonical cross-domain link must point at the real domain, not at whatever host this deployment
 * happens to be served from (in dev that helper resolves to localhost, which would be a broken link
 * on a public page).
 *
 * Reaches state data ONLY through state-resources.ts — never the engine or the state packs.
 */

const CANONICAL = absolutePartnerAppUrl("/resources");
const TITLE = "Record-clearing resources, state by state";
const DESCRIPTION =
  "A nationwide directory of record-clearing resources your community can use. Every state has its own vocabulary and its own process — each link opens the plain-language guide for that state on Expungement.ai.";

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

export default function PartnerResourcesPage() {
  const brand = PARTNER_BRAND;
  const jurisdictions = listPublishableJurisdictions();

  return (
    <PartnerContentShell>
      <JsonLd
        data={buildBreadcrumbJsonLd("legalease_partner", [
          { name: "Home", path: "/" },
          { name: "State resources", path: "/resources" }
        ])}
      />

      <div className={brand.cls.shellPadding}>
        <header className="max-w-3xl">
          <p className={brand.cls.eyebrow}>Nationwide directory</p>
          <h1 className={`mt-5 ${brand.cls.heading} text-[36px] leading-[1.08] md:text-[50px]`}>{TITLE}</h1>
          <p className={`mt-5 ${brand.cls.body}`}>{DESCRIPTION}</p>
          <p className="mt-4 text-[14px] leading-6 text-[#54546B]">
            Share these with the people you serve. A record-clearing path may be available in some situations and not in
            others. LegalEase is not a law firm, this is self-help document preparation and not legal advice, and the
            court or agency makes the final decision.
          </p>
        </header>

        {jurisdictions.length ? (
          <section className="mt-12" aria-labelledby="state-directory">
            <h2 id="state-directory" className={`${brand.cls.heading} text-[20px] md:text-[24px]`}>
              {jurisdictions.length} {jurisdictions.length === 1 ? "jurisdiction" : "jurisdictions"}
            </h2>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jurisdictions.map((jurisdiction) => (
                <li key={jurisdiction.slug}>
                  <a
                    href={`${productionExpungementAiUrl}/resources/${jurisdiction.slug}`}
                    className={`group flex items-center justify-between gap-3 ${brand.cls.card} ${brand.cls.cardHover} px-5 py-4 ${brand.cls.focus}`}
                  >
                    <span className="flex flex-col">
                      <span className="text-[16px] font-extrabold text-[#101046]">{jurisdiction.name}</span>
                      <span className="text-[13px] text-[#54546B]">{jurisdiction.displayTerm}</span>
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-[#1F8F88] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                    <span className="sr-only">(opens Expungement.ai)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className={`mt-12 ${brand.cls.card} px-6 py-14 text-center`}>
            <h2 className={`${brand.cls.subheading} text-[18px]`}>State resources are on the way</h2>
            <p className={`mx-auto mt-2 max-w-md text-[15px] leading-7 ${brand.cls.muted}`}>
              State-by-state resource pages are being reviewed before they go live. Ask for a walkthrough and we will
              show you what is coming for your jurisdiction.
            </p>
          </section>
        )}

        <SurfaceCta surface="legalease_partner" />
      </div>
    </PartnerContentShell>
  );
}
