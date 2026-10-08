import "server-only";
import {isDisposableLaunchEnvironment,acceptsSyntheticVerification} from "./onboarding/synthetic-launch-security";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPartnerRecordBySlug } from "./partner-repository";
import { isPublicPartnerEligible } from "./partner-public-eligibility";
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
        .select("payment_status, qualification_status, provisioning_status")
        .eq("partner_slug", slug)
        .maybeSingle<ActivationRow>(),
      supabase
        .from("partner_onboarding")
        .select("status, landing_page_ready, internal_approved_at, launched_at")
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
    if (!eligible) return undefined;

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
