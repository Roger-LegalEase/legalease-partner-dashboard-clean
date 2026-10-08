import { CoBrandedPageView } from "@/components/partners/onboarding/CoBrandedPageView";
import { getApprovedPublicPageConfiguration } from "@/lib/partners/onboarding/public-page-configuration";
import { isRcapLaunchStudioEnabled } from "@/lib/partners/onboarding/feature";
import { partnerIntake } from "@/lib/partners/routes";
import { headers } from "next/headers";
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
  const partner = await getAuthoritativelyPublicPartnerRecord(partnerSlug,(await headers()).get("x-rcap-synthetic-verification"));

  if (!partner) {
    notFound();
  }

  if (isRcapLaunchStudioEnabled()) {
    const configuration = await getApprovedPublicPageConfiguration(partner.partnerSlug,(await headers()).get("x-rcap-synthetic-verification"));
    if (!configuration) notFound();
    const assetHref = (id: string | null) => id ? `/api/partners/public-page/${encodeURIComponent(partner.partnerSlug)}/assets/${encodeURIComponent(id)}` : null;
    return <CoBrandedPageView preview={configuration.preview} variant="desktop"
      logoSrc={assetHref(configuration.preview.logo.assetId)} heroSrc={assetHref(configuration.preview.heroImage.assetId)}
      liveCtaHref={partnerIntake(partner.partnerSlug)} />;
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
