import "server-only";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { requireInternalOnboardingContext, type InternalOnboardingContext } from "./auth-context";
import { Phase1OnboardingError } from "./errors";
import { isRcapLaunchStudioEnabled } from "./feature";
import { canAssignedSuccessManagerAct, type SuccessManagerAssignment } from "./launch-exception-policy";
export type StudioContext = InternalOnboardingContext | {role:"partner_success_manager";authUserId:string;partnerSlug:string};
export async function assertStudioCapability(context:StudioContext, capability:"prepare"|"review_operational_material") {
  if(context.role==="internal_admin") return;
  const admin=getSupabaseAdminClient();
  if(!admin || !isRcapLaunchStudioEnabled()) throw new Phase1OnboardingError("forbidden","Assigned program access is unavailable.");
  const {data,error}=await admin.from("rcap_partner_operator_assignments").select("auth_user_id,partner_slug,capabilities,expires_at,revoked_at").eq("auth_user_id",context.authUserId).eq("partner_slug",context.partnerSlug);
  const assignments:SuccessManagerAssignment[]=(data??[]).map(row=>({authUserId:row.auth_user_id,partnerSlug:row.partner_slug,capabilities:row.capabilities,expiresAt:row.expires_at,revokedAt:row.revoked_at}));
  if(error || !canAssignedSuccessManagerAct({authUserId:context.authUserId,partnerSlug:context.partnerSlug,capability,assignments,now:new Date().toISOString(),delegationAuthorized:true})) throw new Phase1OnboardingError("forbidden","You are not assigned to this program with that permission.");
}
export async function requireStudioContext(partnerSlug:string, capability:"prepare"|"review_operational_material"="prepare"):Promise<StudioContext> {
  const slug=partnerSlug.trim().toLowerCase();
  if(!/^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/.test(slug)) throw new Phase1OnboardingError("workspace_not_found","Program not found.");
  try {return await requireInternalOnboardingContext(slug);} catch(error) {if(!(error instanceof Phase1OnboardingError) || error.code!=="forbidden") throw error;}
  if(!isRcapLaunchStudioEnabled()) throw new Phase1OnboardingError("feature_disabled","Assigned program preparation is unavailable.");
  const auth=await createServerSupabaseAuthClient(); const {data,error}=await auth.auth.getUser();
  if(error || !data.user) throw new Phase1OnboardingError("unauthenticated","Sign in to continue.");
  const context:StudioContext={role:"partner_success_manager",authUserId:data.user.id,partnerSlug:slug};
  await assertStudioCapability(context,capability); return context;
}
