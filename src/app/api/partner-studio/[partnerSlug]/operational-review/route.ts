import type {NextRequest} from "next/server";
import {requireStudioContext} from "@/lib/partners/onboarding/studio-authorization";
import {getSupabaseAdminClient} from "@/lib/supabase/server";
import {assertSameOrigin,readBoundedJson,requireRequestId} from "@/lib/partners/onboarding/request-security";
import {onboardingJson,onboardingHttpError} from "@/lib/partners/onboarding/http";
import {Phase1OnboardingError} from "@/lib/partners/onboarding/errors";
export async function POST(request:NextRequest,{params}:{params:Promise<{partnerSlug:string}>}){try{
 assertSameOrigin(request);const context=await requireStudioContext((await params).partnerSlug,"review_operational_material");const body=await readBoundedJson(request);const requestId=requireRequestId(body.requestId);const versionId=requireRequestId(body.versionId);
 if(!["approve","reject","request_changes"].includes(String(body.decision)))throw new Phase1OnboardingError("invalid_input","Choose a review decision.");
 const admin=getSupabaseAdminClient();if(!admin)throw new Phase1OnboardingError("persistence_failed","Review unavailable.");const {error}=await admin.rpc("rcap_service_review_operational_artifact",{p_partner_slug:context.partnerSlug,p_actor_user_id:context.authUserId,p_version:versionId,p_decision:body.decision,p_request_id:requestId});if(error)throw new Phase1OnboardingError("forbidden","Only current assigned operational materials can be reviewed.");return onboardingJson({success:true});
}catch(error){return onboardingHttpError(error);}}
