import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StateLandingPage } from "@/components/expungement-ai/state-landing/StateLandingPage";
import {
  getStateLandingDataBySlug,
  listStateLandingSlugs
} from "@/lib/expungement-ai/state-landing/state-landing-data";

/**
 * Public route: expungement.ai/states/<stateSlug>  (host mapped in src/proxy.ts → /expungement-ai/states/…).
 *
 * Statically generated per supported jurisdiction (50 states + DC). Unknown slugs 404 via notFound()
 * — there is no generic fallback state. All copy is data-driven from state-landing-data.ts.
 */

export function generateStaticParams(): { stateSlug: string }[] {
  return listStateLandingSlugs().map((stateSlug) => ({ stateSlug }));
}

// Only the pre-generated slugs are valid; anything else is a real 404.
export const dynamicParams = false;

export async function generateMetadata({
  params
}: {
  params: Promise<{ stateSlug: string }>;
}): Promise<Metadata> {
  const { stateSlug } = await params;
  const data = getStateLandingDataBySlug(stateSlug);
  if (!data) {
    return { title: "Record clearing by state | Expungement.ai" };
  }
  return {
    title: data.seo.title,
    description: data.seo.description,
    alternates: { canonical: data.seo.canonical },
    openGraph: {
      title: data.seo.ogTitle,
      description: data.seo.ogDescription,
      url: data.seo.canonical,
      type: "website"
    }
  };
}

export default async function StateLanding({ params }: { params: Promise<{ stateSlug: string }> }) {
  const { stateSlug } = await params;
  const data = getStateLandingDataBySlug(stateSlug);
  if (!data) {
    notFound();
  }

  // FAQPage structured data. Deliberately limited to the Q&A content — no Organization,
  // LegalService, Attorney, or GovernmentService typing, so we never imply Expungement.ai is a
  // law firm or an official agency.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Content is our own copy-safe FAQ strings; no user input is interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <StateLandingPage data={data} />
    </>
  );
}
