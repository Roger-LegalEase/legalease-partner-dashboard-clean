import "server-only";
import {randomUUID} from "node:crypto";
import {getSupabaseAdminClient} from "@/lib/supabase/server";
import type {InternalOnboardingContext} from "./auth-context";
import {getLaunchPreflight} from "./launch-preflight";
import {isDisposableLaunchEnvironment,syntheticVerificationToken} from "./synthetic-launch-security";
import {Phase1OnboardingError} from "./errors";
export async function executeSyntheticLaunch(context:InternalOnboardingContext,input:{requestId:string;snapshotHash:string;confirmed:boolean}){
 if(!isDisposableLaunchEnvironment())throw new Phase1OnboardingError("feature_disabled","Live launch is disabled. Only registered disposable loopback targets may launch.");
 if(context.role!=="internal_admin" || !input.confirmed)throw new Phase1OnboardingError("forbidden","An internal administrator must explicitly confirm synthetic launch.");
 const admin=getSupabaseAdminClient()!;
 const prior=await admin.from("rcap_launch_operation_events").select("*").eq("partner_slug",context.partnerSlug).eq("request_id",input.requestId).order("created_at",{ascending:false});
 if(prior.error)throw new Phase1OnboardingError("persistence_failed","Launch journal unavailable.");
 if(prior.data?.length){const last=prior.data[0];if(last.snapshot_hash!==input.snapshotHash || last.actor_auth_user_id!==context.authUserId)throw new Phase1OnboardingError("duplicate_request","Request identity was used with different inputs.");if(last.step==="complete")return {status:"complete",operationId:last.operation_id,publicUrl:last.evidence.publicUrl,duplicate:true};if(last.step!=="failed") {
 const rollback=await admin.rpc("rcap_service_compensate_synthetic_launch",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_operation:last.operation_id,p_hash:input.snapshotHash});
 if(rollback.error)throw new Phase1OnboardingError("persistence_failed","Interrupted operation compensation requires operator inspection.");
 const recovery=await admin.from("rcap_launch_operation_events").insert({workspace_id:last.workspace_id,partner_slug:context.partnerSlug,operation_id:last.operation_id,request_id:input.requestId,actor_auth_user_id:context.authUserId,snapshot_hash:input.snapshotHash,authority_reference:last.authority_reference,step:"failed",evidence:{failedStep:last.step,compensated:true,message:"Interrupted operation safely compensated on retry."}});
 if(recovery.error)throw new Phase1OnboardingError("persistence_failed","Interrupted operation recovery receipt unavailable.");
 }
 throw new Phase1OnboardingError("invalid_transition","The prior operation failed and is held. Refresh preflight and use a new request to retry.");}
 const preflight=await getLaunchPreflight(context);
 if(input.snapshotHash!==preflight.snapshotHash)throw new Phase1OnboardingError("revision_conflict","The reviewed program changed. Reload preflight.");
 if(!preflight.canLaunch)throw new Phase1OnboardingError("invalid_transition",preflight.heldReason??"Launch is held.");
 const target=await admin.from("rcap_synthetic_launch_targets").select("authority_reference,failure_step").eq("partner_slug",context.partnerSlug).single();
 if(target.error)throw new Phase1OnboardingError("forbidden","Synthetic target authority unavailable.");
 const previous=await admin.from("partner_onboarding").select("status,landing_page_ready,internal_approved_at,launched_at").eq("id",preflight.workspaceId).single();
 if(previous.error || previous.data.status==="live")throw new Phase1OnboardingError("invalid_transition","Only an unpublished synthetic partner may start launch.");
 const authorityBefore=await admin.from("partner_records").select("payment_status,qualification_status,provisioning_status,access_mode").eq("partner_slug",context.partnerSlug).single();
 const capacityBefore=await admin.from("partner_entitlement").select("screenings_allowed,screenings_used").eq("partner_slug",context.partnerSlug).single();
 if(authorityBefore.error||capacityBefore.error)throw new Phase1OnboardingError("persistence_failed","Activation and screening authority unavailable.");
 const operationId=randomUUID();const publicUrl=new URL(`/p/${context.partnerSlug}`,process.env.RCAP_SYNTHETIC_PUBLIC_ORIGIN!).href;
 const base={workspace_id:preflight.workspaceId,partner_slug:context.partnerSlug,operation_id:operationId,request_id:input.requestId,actor_auth_user_id:context.authUserId,snapshot_hash:preflight.snapshotHash,authority_reference:target.data.authority_reference};
 async function receipt(step:string,evidence:Record<string,unknown>){const {error}=await admin.from("rcap_launch_operation_events").insert({...base,step,evidence});if(error)throw new Error(`Receipt ${step} failed.`);}
 let failedStep="prepared";
 try{
  await receipt("prepared",{previousPublication:previous.data,workspaceVersion:preflight.workspaceVersion});
  failedStep="publication_staged";
  const staged=await admin.rpc("rcap_service_stage_synthetic_launch",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_operation:operationId,p_version:preflight.workspaceVersion,p_hash:preflight.snapshotHash,p_versions:preflight.reviewedVersions.filter(v=>v.type!=="partner_launch_kit")});
  if(staged.error)throw new Error("Publication staging refused current authority or source.");
  failedStep="public_verified";
  if(target.data.failure_step==="public_verified")throw new Error("Registered synthetic partial-failure fixture.");
  const hidden=await fetch(publicUrl,{cache:"no-store",redirect:"manual"});if(hidden.status!==404)throw new Error("Premature public visibility detected.");
  const readback=await fetch(publicUrl,{headers:{"x-rcap-synthetic-verification":syntheticVerificationToken(context.partnerSlug,operationId)},cache:"no-store",redirect:"manual"});const html=await readback.text();
  if(readback.status!==200 || !html.includes(`/partner/intake/${context.partnerSlug}`) && !html.includes(`/intake/${context.partnerSlug}`))throw new Error("Staged public route or attribution verification failed.");
  const publication=await admin.from("partner_onboarding").select("status,landing_page_ready").eq("id",preflight.workspaceId).single();
  const authorityAfter=await admin.from("partner_records").select("payment_status,qualification_status,provisioning_status,access_mode").eq("partner_slug",context.partnerSlug).single();
  const capacityAfter=await admin.from("partner_entitlement").select("screenings_allowed,screenings_used").eq("partner_slug",context.partnerSlug).single();
  if(publication.error||publication.data.status!=="live"||!publication.data.landing_page_ready||authorityAfter.error||capacityAfter.error||JSON.stringify(authorityBefore.data)!==JSON.stringify(authorityAfter.data)||JSON.stringify(capacityBefore.data)!==JSON.stringify(capacityAfter.data))throw new Error("Publication or immutable activation/capacity readback failed.");
  await receipt("public_verified",{publicUrl,status:readback.status,anonymousStatusBeforeComplete:hidden.status,attributionVerified:true,activationUnchanged:true,screeningCapacityUnchanged:true,accessMode:preflight.program?.access.configured});
  failedStep="public_readback";const publicReadback=await fetch(publicUrl,{cache:"no-store",redirect:"manual"});if(publicReadback.status!==200)throw new Error("Public readback failed.");
  failedStep="complete";await receipt("complete",{publicUrl,verified:true,anonymousStatus:publicReadback.status});
  return {status:"complete",operationId,publicUrl,duplicate:false};
 }catch(error){
  // Even if final readback fails, publication is held. An immutable completion
  // receipt is not silently rewritten; the later failed receipt remains visible.
  const rollback=await admin.rpc("rcap_service_compensate_synthetic_launch",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_operation:operationId,p_hash:preflight.snapshotHash});
  try{await receipt("failed",{failedStep,compensated:!rollback.error,message:error instanceof Error?error.message:"Launch failed"});}catch{/* Original receipt error remains the refusal; no success is returned. */}
  throw new Phase1OnboardingError("persistence_failed",`Synthetic launch failed at ${failedStep}; ${rollback.error?"publication compensation requires operator inspection":"publication held"}.`,{operationId,failedStep});
 }
}
