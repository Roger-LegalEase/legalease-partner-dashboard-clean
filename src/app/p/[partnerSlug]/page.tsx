import {getSupabaseAdminClient} from "@/lib/supabase/server";
import {isDisposableLaunchEnvironment} from "@/lib/partners/onboarding/synthetic-launch-security";
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
    if (!configuration) {
      const admin=getSupabaseAdminClient();
      const publication=await admin?.from("partner_onboarding").select("*").eq("partner_slug",partner.partnerSlug).single();
      const synthetic=isDisposableLaunchEnvironment()?await admin?.from("rcap_synthetic_launch_targets").select("partner_slug").eq("partner_slug",partner.partnerSlug).maybeSingle():null;
      if(!publication||publication.error||publication.data?.rcap_launch_operation_id||synthetic?.error||synthetic?.data)notFound();
      // Previously published partners keep their existing approved public route.
      return <><FunnelBeacon event="partner_landing_viewed" meta={{partner_slug:partnerSlug,product_surface:"legalease_partner"}}/><PartnerLandingPageTemplate {...buildPartnerLandingPageData(partner)}/></>;
    }
    const assetHref = (id: string | null) => id ? `/api/partners/public-page/${encodeURIComponent(partner.partnerSlug)}/assets/${encodeURIComponent(id)}` : null;
    return <div data-rcap-partner={partner.partnerSlug} data-rcap-access={configuration.accessMode} data-rcap-operation={configuration.operationId} data-rcap-page-hash={configuration.pageHash}>
      {configuration.preview.showPartnerLogo&&configuration.preview.logo.assetId?<span hidden data-rcap-asset={configuration.preview.logo.assetId}/>:null}
      {configuration.preview.heroImage.assetId?<span hidden data-rcap-asset={configuration.preview.heroImage.assetId}/>:null}
      <CoBrandedPageView preview={configuration.preview} variant="desktop"
      logoSrc={assetHref(configuration.preview.logo.assetId)} heroSrc={assetHref(configuration.preview.heroImage.assetId)}
      liveCtaHref={partnerIntake(partner.partnerSlug)} /></div>;
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
