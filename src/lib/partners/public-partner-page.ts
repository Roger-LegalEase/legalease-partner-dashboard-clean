import { isRcap2Enabled } from "./onboarding/feature";
import "server-only";
import {isDisposableLaunchEnvironment,acceptsSyntheticVerification} from "./onboarding/synthetic-launch-security";

import {acceptsRealVerification,realLaunchLeaseActive} from "./onboarding/real-launch-security";
import {commercialAuthorityValid,type CommercialAuthority} from "./onboarding/commercial-authority";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPartnerRecordBySlug } from "./partner-repository";
import { isPublicPartnerEligible,isPartnerPublicationAuthorized } from "./partner-public-eligibility";
import type { PartnerRecord } from "./types";

type ActivationRow = {
  payment_status: string | null;
  qualification_status: string | null;
  provisioning_status: string | null;
};

type PublicationRow = {
  status: string | null;
  landing_page_ready: boolean | null;
  internal_approved_at: string | null;
  launched_at: string | null;
  rcap_launch_operation_id?:string|null;
  rcap_policy_version?:string;
};

/**
 * Resolves only partners whose separate publication and activation gates are
 * both authoritative. Every lookup failure returns the same absent result.
 */
export async function getAuthoritativelyPublicPartnerRecord(
  partnerSlug: string, verificationToken: string | null = null
): Promise<PartnerRecord | undefined> {
  const slug = normalizePartnerSlug(partnerSlug);
  if (!slug) return undefined;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return undefined;

  try {
    if(isDisposableLaunchEnvironment()) {
      const target=await supabase.from("rcap_synthetic_launch_targets").select("partner_slug").eq("partner_slug",slug).maybeSingle();
      if(target.error)return undefined;
      if(target.data){const receipt=await supabase.from("rcap_launch_operation_events").select("operation_id,step").eq("partner_slug",slug).order("created_at",{ascending:false}).limit(1).maybeSingle();
        if(receipt.error || !receipt.data || (!["complete","public_verified"].includes(receipt.data.step) && !(receipt.data.step==="publication_staged" && acceptsSyntheticVerification(slug,receipt.data.operation_id,verificationToken))))return undefined;
      }
    }
    const [activationResult, publicationResult] = await Promise.all([
      supabase
        .from("partner_records")
        .select("*")
        .eq("partner_slug", slug)
        .maybeSingle<ActivationRow>(),
      supabase
        .from("partner_onboarding")
        .select("*")
        .eq("partner_slug", slug)
        .maybeSingle<PublicationRow>()
    ]);

    if (
      activationResult.error ||
      publicationResult.error ||
      !activationResult.data ||
      !publicationResult.data
    ) {
      return undefined;
    }

    const operation=publicationResult.data.rcap_launch_operation_id;
    let documentedActivation=false;
    if(operation){
      const receipt=await supabase.from("rcap_launch_operation_events").select("step,evidence,created_at").eq("partner_slug",slug).eq("operation_id",operation).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(receipt.error||!receipt.data||(!["complete","public_verified"].includes(receipt.data.step)&&!(receipt.data.step==="publication_staged"&&acceptsRealVerification(slug,operation,verificationToken))))return undefined;
      if(receipt.data.step!=="complete"&&!realLaunchLeaseActive(receipt.data.created_at))return undefined;
      const authority=await supabase.from("rcap_commercial_authorizations").select("*").eq("id",String(receipt.data.evidence.commercialAuthorityId??"")).maybeSingle();
      const row=activationResult.data as ActivationRow & {access_mode:string;stripe_payment_intent_id:string;paid_at:string;payment_amount:number};
      const validAuthority = isRcap2Enabled() && publicationResult.data.rcap_policy_version === "rcap2.2"
        ? (await supabase.rpc("rcap_program_commercial_valid",{p_workspace:authority.data?.workspace_id})).data === true
        : commercialAuthorityValid(authority.data as CommercialAuthority|null,row);
      if(authority.error||!validAuthority||authority.data?.access_mode!==row.access_mode||!["active","provisioned"].includes(row.provisioning_status??""))return undefined;
      const document=await supabase.from("partner_onboarding_assets").select("id").eq("id",authority.data.document_id).eq("sha256_hex",authority.data.document_hash).eq("review_status","approved").eq("lifecycle_status","active").maybeSingle();
      if(document.error||!document.data)return undefined;
      documentedActivation=true;
    }
    const eligible = isPublicPartnerEligible({
      activation: {
        paymentStatus: activationResult.data.payment_status,
        qualificationStatus: activationResult.data.qualification_status,
        provisioningStatus: activationResult.data.provisioning_status
      },
      publication: {
        status: publicationResult.data.status,
        landingPageReady: publicationResult.data.landing_page_ready === true,
        internalApprovedAt: publicationResult.data.internal_approved_at,
        launchedAt: publicationResult.data.launched_at
      }
    });
    if (!eligible && !(documentedActivation&&isPartnerPublicationAuthorized({status:publicationResult.data.status,landingPageReady:publicationResult.data.landing_page_ready===true,internalApprovedAt:publicationResult.data.internal_approved_at,launchedAt:publicationResult.data.launched_at}))) return undefined;

    const partner = await getPartnerRecordBySlug(slug);
    return partner?.partnerSlug === slug ? partner : undefined;
  } catch {
    return undefined;
  }
}

function normalizePartnerSlug(value: string) {
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9_-]+$/.test(slug) ? slug : "";
}
