import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { InternalOnboardingContext } from "./auth-context";
import { Phase1OnboardingError } from "./errors";
import { workspaceReadError } from "./workspace-loading";

export async function getProgramWorkspaceIdentity(context: InternalOnboardingContext) {
  if (context.role !== "internal_admin") throw new Phase1OnboardingError("forbidden", "Internal administrator access is required.");
  const db = getSupabaseAdminClient();
  if (!db) throw new Phase1OnboardingError("persistence_failed", "Program information is unavailable.");
  const actor = await db.rpc("rcap_service_assert_internal_actor", { p_actor_user_id: context.authUserId });
  if (actor.error) throw workspaceReadError("rcap_service_assert_internal_actor", actor.error, "Internal administrator access could not be verified.");
  const { data, error } = await db.from("partner_onboarding").select("id,partner_slug,partner_record_id,rcap_policy_version,aggregate_version,status,landing_page_ready").eq("partner_slug", context.partnerSlug).maybeSingle();
  if (error) throw workspaceReadError("partner_onboarding.identity", error, "Program identity is unavailable.");
  if (!data || data.partner_slug !== context.partnerSlug || !data.id || !data.partner_record_id || !["legacy", "rcap2.2"].includes(data.rcap_policy_version) || !Number.isSafeInteger(Number(data.aggregate_version))) {
    throw new Phase1OnboardingError("workspace_not_found", "A valid program workspace could not be found.");
  }
  const partner = await db.from("partner_records").select("id,partner_slug").eq("id", data.partner_record_id).maybeSingle();
  if (partner.error) throw workspaceReadError("partner_records.identity", partner.error, "Program identity is unavailable.");
  if (partner.data?.partner_slug !== context.partnerSlug) throw new Phase1OnboardingError("workspace_not_found", "The program identity could not be verified.");
  return { workspaceId: String(data.id), partnerSlug: context.partnerSlug, policyVersion: data.rcap_policy_version as "legacy" | "rcap2.2", version: Number(data.aggregate_version), status: String(data.status), landingPageReady: data.landing_page_ready === true };
}
