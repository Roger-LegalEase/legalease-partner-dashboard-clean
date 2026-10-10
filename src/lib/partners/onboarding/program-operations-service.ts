import "server-only";
import { createHash,randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { InternalOnboardingContext } from "./auth-context";
import { Phase1OnboardingError } from "./errors";
import { enableProgramPolicy,getProgramExperience,prepareProgramReview,programDecision,recordProgramDecision } from "./program-experience-service";
import { getProgramWorkspaceIdentity } from "./program-workspace";
import { recoverWorkspaceLoad, requireWorkspaceLoad, workspaceReadError } from "./workspace-loading";
import { getLaunchPreflight } from "./launch-preflight";
import { executeRealLaunch } from "./synthetic-launch-service";
import { getProgramConfiguration,saveProgramConfiguration } from "./program-configuration-service";
import type { ProgramPatch } from "./program-configuration";
import type { OnboardingSectionKey } from "./types";
import { getPartnerSupportContact } from "./support-contact";
import type { ProgramAction, ProgramDecision } from "./program-experience";
export async function getProgramOperations(context:InternalOnboardingContext){
 const identity=await requireWorkspaceLoad("operations.identity","getProgramWorkspaceIdentity",()=>getProgramWorkspaceIdentity(context));
 const [experience,launch,decision]=await Promise.all([
  recoverWorkspaceLoad("operations.experience","getProgramExperience","Program details are temporarily unavailable. Reload to retry.",()=>getProgramExperience(context)),
  recoverWorkspaceLoad("operations.preflight","getLaunchPreflight","Launch readiness is unavailable. Preparation remains available; Start program is disabled. Reload to retry.",()=>getLaunchPreflight(context)),
  recoverWorkspaceLoad("operations.policy","rcap_service_evaluate_program","Program authority could not be verified. Privileged actions are disabled. Reload to retry.",()=>programDecision(context,"publish_partner_page"))
 ]);
 for(const value of [experience.value?.decision,decision.value])if(value&&(value.workspaceId!==identity.workspaceId||value.partnerSlug!==identity.partnerSlug))throw new Phase1OnboardingError("forbidden","Program identity does not match this workspace.");
 const db=getSupabaseAdminClient()!;
 const [history,exceptionHistory]=await Promise.all([
  recoverWorkspaceLoad("operations.decisions","partner_onboarding_launch_approvals.read","Authorization history is unavailable. Reload to retry.",async()=>{
   const result=await db.from("partner_onboarding_launch_approvals").select("id,approval_type,decision,recorded_at,policy_details").eq("workspace_id",identity.workspaceId).order("recorded_at",{ascending:false}).limit(30);
   if(result.error)throw workspaceReadError("partner_onboarding_launch_approvals.read",result.error,"Authorization history is unavailable.");return result.data??[];
  }),
  recoverWorkspaceLoad("operations.exceptions","rcap_launch_exception_events.read","Exception history is unavailable. Reload to retry.",async()=>{
   const result=await db.from("rcap_launch_exception_events").select("id,kind,grant_id,requirement_keys,requested_action,resolution,reason,expires_at,dependency_hashes").eq("workspace_id",identity.workspaceId).eq("policy_version","rcap2.2").order("created_at",{ascending:false}).limit(100);
   if(result.error)throw workspaceReadError("rcap_launch_exception_events.read",result.error,"Exception history is unavailable.");return result.data??[];
  })
 ]);
 const policies=await Promise.all((["publish_clinic","view_reporting"] as const).map(async action=>[action,await recoverWorkspaceLoad(`operations.policy.${action}`,"rcap_service_evaluate_program","Some business decisions are unavailable. Reload to retry.",()=>programDecision(context,action))] as const));
 if(launch.value&&(launch.value.workspaceId!==identity.workspaceId||launch.value.partnerSlug!==identity.partnerSlug))throw new Phase1OnboardingError("forbidden","Launch identity does not match this workspace.");
 const issues=[experience.issue,launch.issue,decision.issue,history.issue,exceptionHistory.issue,...policies.map(([,result])=>result.issue)].filter((issue)=>issue!==null);
 const policyMap:Record<string,ProgramDecision|null>={publish_partner_page:decision.value,...Object.fromEntries(policies.map(([action,result])=>[action,result.value]))};
 return {identity,view:experience.value,preflight:launch.value,launchDecision:decision.value,policies:policyMap,decisions:history.value,exceptions:exceptionHistory.value,issues,
  canStart:Boolean(experience.value&&decision.value&&launch.value?.canAuthorizeStart&&experience.value.version===identity.version&&decision.value.sourceVersion===identity.version&&launch.value.workspaceVersion===identity.version)};
}
export async function prepareInternalProgram(context:InternalOnboardingContext){
 if((await getProgramWorkspaceIdentity(context)).policyVersion!=="rcap2.2")throw new Phase1OnboardingError("invalid_transition","Choose Use five-step setup explicitly before preparing standard defaults.");
 const snapshot=await getProgramConfiguration(context);
 const name=String(snapshot.data.organization_contacts?.public_organization_name??snapshot.data.organization_contacts?.legal_organization_name??"Your organization");
 const defaults:Partial<Record<OnboardingSectionKey,Record<string,unknown>>>={
  organization_contacts:{public_organization_name:name,public_program_name:`${name} RCAP`},
  program_goals:{participation_mode:"online",target_population:"People in the program service area"},
  geography_audience_language_accessibility:{primary_language:"English",enable_spanish:false},
  support_referrals_reporting:{participant_support_email:getPartnerSupportContact().email,referral_arrangement:"no_referrals",contested_matter_procedure:"Stop the self-help process for prosecutor objections, contested hearings, or requests for individualized representation. Notify the participant and contact LegalEase support. LegalEase does not provide representation."},
  brand_public_page:{program_headline:"Explore your record-clearing options",program_subheadline:"Answer clear questions to understand possible next steps.",approved_organization_description:`A record-clearing access program from ${name}.`,primary_cta_label:"Start free screening",participant_support_copy:"Contact program support if you need help getting started."}
 };
 const patches:ProgramPatch[]=[];
 for(const [section,values] of Object.entries(defaults)){
  const key=section as OnboardingSectionKey,current=(snapshot.data[key]??{}) as Record<string,unknown>;
  const missing=Object.fromEntries(Object.entries(values).filter(([field])=>current[field]===undefined||current[field]===null||current[field]===""));
  if(Object.keys(missing).length)patches.push({section:key,values:missing,base:current});
 }
 if(patches.length)await saveProgramConfiguration(context,{patches,requestId:randomUUID(),expectedVersion:snapshot.version});
 if((await programDecision(context,"complete_setup")).allowed)await prepareProgramReview(context);
}
function childRequest(request:string,purpose:string){const h=createHash("sha256").update(`${request}:${purpose}`).digest("hex");return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}
export async function runProgramOperation(context:InternalOnboardingContext,body:Record<string,unknown>,requestId:string){
 const db=getSupabaseAdminClient()!;
 if(body.action==="upgrade_policy"){await enableProgramPolicy(context,{confirmed:body.confirmed===true,requestId,expectedVersion:Number(body.version)});return;}
 if(body.action==="prepare"){await prepareInternalProgram(context);return;}
 if(body.action==="review"){await prepareProgramReview(context);return;}
 if(body.action==="start"){
  if(body.confirmed!==true)throw new Phase1OnboardingError("invalid_input","Review the program and its genuine authority before starting.");
  const identity=await getProgramWorkspaceIdentity(context);
  // The immutable receipt is the recovery authority after a lost response.
  const prior=await db.from("rcap_launch_operation_events").select("snapshot_hash").eq("partner_slug",context.partnerSlug).eq("request_id",requestId).eq("step","prepared").maybeSingle();
  if(prior.error)throw new Phase1OnboardingError("persistence_failed","The previous publication could not be checked.");
  if(prior.data){await executeRealLaunch(context,{requestId,snapshotHash:prior.data.snapshot_hash,confirmed:true});return;}
  if(body.version!==identity.version)throw new Phase1OnboardingError("revision_conflict","The program changed. Reload before starting.");
  if(identity.policyVersion==="legacy"){
   const preflight=await getLaunchPreflight(context);
   if(!preflight.canLaunch)throw new Phase1OnboardingError("invalid_transition",preflight.heldReason??"The program cannot start yet.");
   await executeRealLaunch(context,{requestId,snapshotHash:preflight.snapshotHash,confirmed:true});return;
  }
 }
 const current=await programDecision(context,"publish_partner_page");
 if(current.policyVersion!=="rcap2.2")throw new Phase1OnboardingError("invalid_transition","This operation requires an explicit five-step policy upgrade.");
 if(body.action==="start"){const preflight=await getLaunchPreflight(context);if(!preflight.canAuthorizeStart)throw new Phase1OnboardingError("invalid_transition",preflight.heldReason??"Current launch authority is unavailable.");}
 if(body.version!==current.sourceVersion||body.scopeHash!==current.scopeHash)throw new Phase1OnboardingError("revision_conflict","This program changed. Reload and review the current details.");
 if(body.action==="delegate"||body.action==="start"||body.action==="withdraw_delegation"||body.action==="revoke_authority"){
  const type=body.action==="revoke_authority"?"commercial_revocation":body.action==="start"?"legalease_final_review":"standing_launch_authorization";
  const withdraw=body.action==="withdraw_delegation"||body.action==="revoke_authority";
  await recordProgramDecision(context,type,withdraw?"withdraw":"approve",{policy_version:"rcap2.2",scope_hash:current.scopeHash,authority_id:current.authorityId,expires_at:body.expiresAt,authority_basis:body.reason,capabilities:["publish_partner_page","accept_screenings","create_clinic","publish_clinic"]},body.action==="start"?childRequest(requestId,"review"):requestId);
  if(body.action==="start"){const preflight=await getLaunchPreflight(context);if(!preflight.canLaunch)throw new Phase1OnboardingError("invalid_transition",preflight.heldReason??"The program cannot start yet.");await executeRealLaunch(context,{requestId,snapshotHash:preflight.snapshotHash,confirmed:true});}
  return;
 }
 if(body.action==="exception"){
  const action=body.capability as ProgramAction;const decision=await programDecision(context,action);
  const result=await db.rpc("rcap_service_record_program_exception",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_action:action,p_keys:body.keys,p_resolution:body.resolution,p_reason:body.reason,p_version:current.sourceVersion,p_hashes:body.hashes,p_request:requestId,p_expires:body.expiresAt??null,p_grant:body.grantId??null});
  void decision;if(result.error)throw new Phase1OnboardingError("invalid_transition","The complete selection must be current, eligible business requirements. No partial exception was recorded.");return;
 }
 if(body.action==="limited_authority"){
  const result=await db.rpc("rcap_service_record_limited_program_authority",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_document:body.documentId,p_reference:body.reason,p_basis:body.basis,p_expires:body.expiresAt,p_screenings:body.screenings,p_version:current.sourceVersion,p_request:requestId});
  if(result.error)throw new Phase1OnboardingError("invalid_transition","Verify the reviewed document, qualification, required agreements, and actual limited-service terms.");return;
 }
 throw new Phase1OnboardingError("invalid_input","Choose a program operation.");
}
