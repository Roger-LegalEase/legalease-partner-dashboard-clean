import "server-only";
import {getSupabaseAdminClient} from "@/lib/supabase/server";
import type {InternalOnboardingContext} from "./auth-context";
import {getLaunchPreflight} from "./launch-preflight";
import {LAUNCH_EXCEPTION_POLICY} from "./launch-exception-policy";
import {Phase1OnboardingError} from "./errors";
export async function recordLaunchException(context:InternalOnboardingContext,input:{kind:"grant"|"revoke";requestId:string;checkKey:string;grantId?:string;reason:string;authorityReference:string;snapshotHash:string;expiresAt:string}){
 if(context.role!=="internal_admin")throw new Phase1OnboardingError("forbidden","Exception authority remains restricted to internal administrators.");
 const policy=LAUNCH_EXCEPTION_POLICY[input.checkKey];
 if(!policy || policy.classification==="hard_stop")throw new Phase1OnboardingError("forbidden","This required authority or review cannot be waived.");
 // Conditional alternatives require a separately recorded policy authorization;
 // a text field or administrator role alone is not that authority.
 if(input.kind==="grant" && policy.classification==="conditional")throw new Phase1OnboardingError("forbidden","A separately authorized alternate program policy is required; conditional authority has not been granted.");
 if(input.reason.trim().length<10 || input.authorityReference.trim().length<10 || !Number.isFinite(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt)<=Date.now() || Date.parse(input.expiresAt)>Date.now()+30*86400000)throw new Phase1OnboardingError("invalid_input","Record a specific reason, authority reference and an expiry within 30 days.");
 const view=await getLaunchPreflight(context);if(view.snapshotHash!==input.snapshotHash)throw new Phase1OnboardingError("revision_conflict","Program source changed; review the current exception scope.");
 const admin=getSupabaseAdminClient()!;
 const event={kind:input.kind,grant_id:input.kind==="revoke"?input.grantId:null,workspace_id:view.workspaceId,partner_slug:context.partnerSlug,check_key:input.checkKey,actor_auth_user_id:context.authUserId,actor_role:"internal_admin",request_id:input.requestId,reason:input.reason.trim(),authority_reference:input.authorityReference.trim(),snapshot_hash:view.snapshotHash,expires_at:input.expiresAt};
 const prior=await admin.from("rcap_launch_exception_events").select("*").eq("workspace_id",view.workspaceId).eq("request_id",input.requestId).maybeSingle();if(prior.error)throw new Phase1OnboardingError("persistence_failed","Exception history unavailable.");
 if(prior.data){if(Object.entries(event).some(([key,value])=>key!=="expires_at" && prior.data[key]!==value) || Date.parse(prior.data.expires_at)!==Date.parse(input.expiresAt))throw new Phase1OnboardingError("duplicate_request","Request identity was used for a different exception.");return {eventId:prior.data.id,duplicate:true};}
 const {data,error}=await admin.from("rcap_launch_exception_events").insert(event).select("id").single();if(error)throw new Phase1OnboardingError("persistence_failed","The scoped exception could not be recorded.");return {eventId:data.id,duplicate:false};
}
