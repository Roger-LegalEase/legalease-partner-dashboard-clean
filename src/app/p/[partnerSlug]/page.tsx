import { notFound } from "next/navigation";
import { FunnelBeacon } from "@/components/analytics/FunnelBeacon";
import { PartnerLandingPageTemplate } from "@/components/partners/PartnerLandingPageTemplate";
import { buildPartnerLandingPageData } from "@/lib/partners/landing-page";
import { getAuthoritativelyPublicPartnerRecord } from "@/lib/partners/public-partner-page";

export const dynamic = "force-dynamic";

export default async function CoBrandedPartnerPage({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const partner = await getAuthoritativelyPublicPartnerRecord(partnerSlug);

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
