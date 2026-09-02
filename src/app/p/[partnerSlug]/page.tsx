import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FunnelBeacon } from "@/components/analytics/FunnelBeacon";
import { PartnerLandingPageTemplate } from "@/components/partners/PartnerLandingPageTemplate";
import { buildPartnerLandingPageData } from "@/lib/partners/landing-page";
import { getAuthoritativelyPublicPartnerRecord } from "@/lib/partners/public-partner-page";

export const dynamic = "force-dynamic";

const loadPublicPartner = cache(getAuthoritativelyPublicPartnerRecord);

export async function generateMetadata({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}): Promise<Metadata> {
  const { partnerSlug } = await params;
  const partner = await loadPublicPartner(partnerSlug);
  if (!partner) {
    return {
      title: "Page not found | LegalEase",
      robots: { index: false, follow: false }
    };
  }
  return {
    title: `${partner.partnerName} | LegalEase`,
    robots: { index: true, follow: true }
  };
}

export default async function CoBrandedPartnerPage({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const partner = await loadPublicPartner(partnerSlug);

  if (!partner) {
    notFound();
  }

  return (
    <>
      <FunnelBeacon
        event="partner_landing_viewed"
        meta={{ partner_slug: partnerSlug, product_surface: "legalease_partner" }}
      />
      <PartnerLandingPageTemplate {...buildPartnerLandingPageData(partner)} />
    </>
  );
}
