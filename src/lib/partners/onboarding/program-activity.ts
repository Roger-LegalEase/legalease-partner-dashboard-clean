import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { InternalOnboardingContext } from "./auth-context";
import { Phase1OnboardingError } from "./errors";
import { workspaceReadError } from "./workspace-loading";

/** Aggregate counts only, scoped to the workspace already authorized by the route. */
export async function getProgramActivity(context: InternalOnboardingContext) {
  if (context.role !== "internal_admin") throw new Phase1OnboardingError("forbidden", "Platform Admin access required.");
  const db = getSupabaseAdminClient();
  if (!db) throw new Phase1OnboardingError("persistence_failed", "Activity is unavailable.");
  const [screenings, clinics] = await Promise.all([
    db.from("screening_sessions").select("session_id", {count: "exact", head: true}).eq("partner_slug", context.partnerSlug).eq("flow_mode", "rcap"),
    db.from("clinic_events").select("id", {count: "exact", head: true}).eq("partner_slug", context.partnerSlug).eq("status", "published")
  ]);
  if (screenings.error || clinics.error || screenings.count === null || clinics.count === null) throw workspaceReadError("program_activity.count", screenings.error ?? clinics.error, "Program activity is unavailable. Reload to retry.");
  return {screenings: screenings.count, publishedClinics: clinics.count};
}
