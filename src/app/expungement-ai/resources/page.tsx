import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { JsonLd } from "@/components/content/JsonLd";
import { SurfaceCta } from "@/components/content/SurfaceCta";
import { EXPUNGEMENT_BRAND } from "@/components/content/brand";
import { buildBreadcrumbJsonLd, buildCollectionJsonLd } from "@/lib/content/seo";
import { listPublishableJurisdictions } from "@/lib/content/state-resources";
import { absoluteExpungementAiUrl } from "@/lib/app-url";

/**
 * Public route: expungement.ai/resources — the canonical nationwide record-clearing directory.
 *
 * Every jurisdiction shown here has passed the publishing gate in state-resources.ts (approved AND
 * live AND approved for the Expungement.ai channel). States that are merely built do not appear, and
 * this page never invents one: if the manifest approves none, it says so plainly.
 *
 * This page reaches state data ONLY through state-resources.ts — never the record-clearing engine,
 * the compiled profiles, or the state packs.
 */

const CANONICAL = absoluteExpungementAiUrl("/resources");
const TITLE = "Record-clearing resources by state";
const DESCRIPTION =
  "Plain-language record-clearing resources for every state we support. Each state uses its own vocabulary — expungement, sealing, set-aside — and its own process. Self-help information from Expungement.ai. LegalEase is not a law firm.";

export const metadata: Metadata = {
  title: `${TITLE} | Expungement.ai`,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "Expungement.ai",
    type: "website"
  }
};

export default function ResourcesHubPage() {
  const brand = EXPUNGEMENT_BRAND;
  const jurisdictions = listPublishableJurisdictions();

  const collectionJsonLd = buildCollectionJsonLd({
    surface: "expungement_ai",
    name: TITLE,
    description: DESCRIPTION,
    canonical: CANONICAL,
    items: jurisdictions.map((j) => ({ title: `${j.name} record clearing`, path: `/resources/${j.slug}` }))
  });

  return (
    <ConsumerPageShell wilmaContext="landing" headerVariant="marketing">
      <JsonLd data={collectionJsonLd} />
      <JsonLd
        data={buildBreadcrumbJsonLd("expungement_ai", [
          { name: "Home", path: "/" },
          { name: "Resources", path: "/resources" }
        ])}
      />

      <div className={brand.cls.shellPadding}>
        <header className="mx-auto max-w-3xl text-center">
          <p className={brand.cls.eyebrow}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Nationwide directory
          </p>
          <h1 className={`mt-5 ${brand.cls.heading} text-[36px] leading-[1.06] md:text-[52px]`}>{TITLE}</h1>
          <p className={`mx-auto mt-5 max-w-2xl ${brand.cls.body}`}>
            Every state clears records differently, and each one has its own word for it. Choose your state to see how
            the process works there in plain language, what to prepare, and what a court looks at. A record-clearing
            path may be available in some situations and not in others.
          </p>
          <p className={`mx-auto mt-4 max-w-2xl text-[13px] leading-6 ${brand.cls.muted}`}>
            Expungement.ai is self-help document preparation. LegalEase is not a law firm and this is not legal advice.
            The court or agency makes the final decision.
          </p>
        </header>

        {jurisdictions.length ? (
          <section className="mt-14" aria-labelledby="state-directory">
            <h2 id="state-directory" className={`${brand.cls.heading} text-[22px] md:text-[26px]`}>
              Choose your state
            </h2>
            <p className={`mt-2 text-[14px] ${brand.cls.muted}`}>
              {jurisdictions.length} {jurisdictions.length === 1 ? "jurisdiction" : "jurisdictions"} available.
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jurisdictions.map((jurisdiction) => (
                <li key={jurisdiction.slug}>
                  <Link
                    href={`/resources/${jurisdiction.slug}`}
                    className={`group flex items-center justify-between gap-3 ${brand.cls.card} ${brand.cls.cardHover} px-5 py-4 ${brand.cls.focus}`}
                  >
                    <span className="flex flex-col">
                      <span className="text-[16px] font-extrabold text-[#0B1320]">{jurisdiction.name}</span>
                      <span className={`text-[13px] ${brand.cls.muted}`}>{jurisdiction.displayTerm}</span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-[#00A99D] transition group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className={`mt-14 ${brand.cls.card} px-6 py-14 text-center`}>
            <h2 className={`${brand.cls.subheading} text-[18px]`}>State resources are on the way</h2>
            <p className={`mx-auto mt-2 max-w-md text-[15px] leading-7 ${brand.cls.muted}`}>
              State-by-state resource pages are being reviewed before they go live. In the meantime, the free check can
              tell you what may be available in your situation.
            </p>
          </section>
        )}

        <SurfaceCta surface="expungement_ai" />
      </div>
    </ConsumerPageShell>
  );
}
