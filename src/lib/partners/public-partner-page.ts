import "server-only";

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
  partner_slug?: string | null;
  status: string | null;
  landing_page_ready: boolean | null;
  internal_approved_at: string | null;
  launched_at: string | null;
};

type ActivationListRow = ActivationRow & { partner_slug: string | null };

/**
 * Resolves only partners whose separate publication and activation gates are
 * both authoritative. Every lookup failure returns the same absent result.
 */
export async function getAuthoritativelyPublicPartnerRecord(
  partnerSlug: string
): Promise<PartnerRecord | undefined> {
  const slug = normalizePartnerSlug(partnerSlug);
  if (!slug) return undefined;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return undefined;

  try {
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

/**
 * The partner sitemap uses the same two independent authority gates as the
 * public route. Query failures omit every partner instead of publishing a
 * partially checked tenant.
 */
export async function listAuthoritativelyPublicPartnerSlugs(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  try {
    const [activationResult, publicationResult] = await Promise.all([
      supabase
        .from("partner_records")
        .select("partner_slug, payment_status, qualification_status, provisioning_status")
        .in("payment_status", ["paid", "demo_paid"])
        .eq("qualification_status", "qualified")
        .in("provisioning_status", ["provisioned", "active"]),
      supabase
        .from("partner_onboarding")
        .select("partner_slug, status, landing_page_ready, internal_approved_at, launched_at")
        .eq("status", "live")
        .eq("landing_page_ready", true)
        .not("internal_approved_at", "is", null)
        .not("launched_at", "is", null)
    ]);

    if (activationResult.error || publicationResult.error) return [];
    const activated = new Set(
      ((activationResult.data ?? []) as ActivationListRow[])
        .map((row) => normalizePartnerSlug(row.partner_slug ?? ""))
        .filter(Boolean)
    );

    return Array.from(new Set(
      ((publicationResult.data ?? []) as PublicationRow[])
        .map((row) => normalizePartnerSlug(row.partner_slug ?? ""))
        .filter((slug) => slug && activated.has(slug))
    )).sort();
  } catch {
    return [];
  }
}

function normalizePartnerSlug(value: string) {
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9_-]+$/.test(slug) ? slug : "";
}
