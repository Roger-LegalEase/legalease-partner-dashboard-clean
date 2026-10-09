import "server-only";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { InternalOnboardingContext, PartnerOnboardingContext } from "./auth-context";
import { getAuthoritativelyPublicPartnerRecord } from "../public-partner-page";
import { isRcap2Enabled } from "./feature";
import { Phase1OnboardingError } from "./errors";
import { getPartnerOnboardingPortal, savePartnerOnboardingSection } from "./service";
import { artifactGeneratorVersion, detectArtifactDrift, projectArtifactSource } from "./artifact-domain";
import { generateArtifactVersion, loadArtifactSourceInput } from "./artifact-service";
import { getPartnerSupportContact } from "./support-contact";
import { PROGRAM_ACTIONS, type ProgramAction, type ProgramDecision, type ProgramExperience, type ProgramMaterial } from "./program-experience";
import type { OnboardingPartnerData, OnboardingSectionKey } from "./types";
import { executeRealLaunch } from "./synthetic-launch-service";
import { getLaunchPreflight } from "./launch-preflight";

type Context=InternalOnboardingContext|PartnerOnboardingContext;
const requiredMaterials=["implementation_brief","co_branded_page_configuration"] as const;
function db(){const client=getSupabaseAdminClient();if(!client)throw new Phase1OnboardingError("persistence_failed","Program information is unavailable. Please retry.");return client;}
function enabled(){if(!isRcap2Enabled())throw new Phase1OnboardingError("feature_disabled","Program setup is unavailable.");}
export async function programDecision(context:Context,action:ProgramAction):Promise<ProgramDecision>{
 enabled();const result=await db().rpc("rcap_service_evaluate_program",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_action:action});
 if(result.error||!result.data)throw new Phase1OnboardingError(result.error?.code==="42501"?"forbidden":"persistence_failed","This program action is unavailable for your account. Please retry.");
 return result.data as ProgramDecision;
}
export async function enableProgramPolicy(context:Context){
 enabled();const result=await db().rpc("rcap_service_enable_program_policy",{p_slug:context.partnerSlug,p_actor:context.authUserId});
 if(result.error)throw new Phase1OnboardingError("invalid_transition","This program cannot change setup policy in its current state.");
}
function reviewToken(context:Context,decision:ProgramDecision){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Phase1OnboardingError("persistence_failed","Review is temporarily unavailable.");
 return createHmac("sha256",key).update(JSON.stringify([context.authUserId,context.partnerSlug,decision.materialsHash,"rcap2-final-review-v1"])).digest("hex");
}
export async function getProgramExperience(context:Context):Promise<ProgramExperience>{
 const decision=await programDecision(context,context.role==="partner_staff"?"view_reporting":"complete_setup");
 if(decision.policyVersion==="legacy"&&decision.status==="live")decision.live=Boolean(await getAuthoritativelyPublicPartnerRecord(context.partnerSlug));
 const source=await loadArtifactSourceInput(db(),context.partnerSlug);
 const [versions,screening,authority,decisions]=await Promise.all([
  db().from("partner_onboarding_artifacts").select("artifact_type,current_version_id").eq("workspace_id",decision.workspaceId).in("artifact_type",[...requiredMaterials]),
  db().from("partner_entitlement").select("screenings_allowed,screenings_used").eq("partner_slug",context.partnerSlug).maybeSingle(),
  db().from("rcap_commercial_authorizations").select("kind,expires_at,packet_entitlement_id").eq("workspace_id",decision.workspaceId).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle(),
  Promise.all(PROGRAM_ACTIONS.filter(a=>context.role!=="partner_staff"||a==="view_reporting"||a==="assist_participant"||a==="offer_paid_packet").map(async action=>[action,(await programDecision(context,action)).allowed] as const))
 ]);
 if(versions.error||authority.error)throw new Phase1OnboardingError("persistence_failed","Your program could not be loaded. Please retry.");
 const materialRows=versions.data?.length?await db().from("partner_onboarding_artifact_versions").select("id,version_number,rendered_content,generator_version,normalized_snapshot,snapshot_hash,generation_status,source_drift_invalidated_at,superseded_at").in("id",versions.data.map(v=>v.current_version_id).filter(Boolean)):{data:[],error:null};
 const materials:ProgramMaterial[]=[];
 for(const material of versions.data??[]){
  const row=materialRows.data?.find(v=>v.id===material.current_version_id);
  const type=material.artifact_type as typeof requiredMaterials[number];
  if(!row||row.generation_status!=="succeeded"||row.source_drift_invalidated_at||row.superseded_at)continue;
  if(detectArtifactDrift({storedSnapshot:row.normalized_snapshot,storedGeneratorVersion:row.generator_version,current:projectArtifactSource(type,source),currentGeneratorVersion:artifactGeneratorVersion(type,source)}).stale)continue;
  if(type==="co_branded_page_configuration"&&row.rendered_content?.pagePreview?.missing?.length)continue;
  materials.push({type,version:row.version_number,document:row.rendered_content});
 }
 let packets:number|null=null;
 if(authority.data?.kind==="screening_only")packets=0;
 else if(authority.data?.packet_entitlement_id){
  const [allocation,usage]=await Promise.all([db().from("partner_packet_entitlement").select("packet_cap").eq("id",authority.data.packet_entitlement_id).single(),db().from("packet_credit_ledger").select("id",{count:"exact",head:true}).eq("entitlement_id",authority.data.packet_entitlement_id).in("event_type",["reserved","consumed"])]);
  if(!allocation.error&&!usage.error)packets=Math.max(0,allocation.data.packet_cap-(usage.count??0));
 }
 return {partnerSlug:context.partnerSlug,organizationName:source.data.organization_contacts?.public_organization_name??source.partnerRecord.organizationName,version:decision.sourceVersion,data:source.data,legalIdentityLocked:source.workspace.agreementStatus==="signed"||Boolean(authority.data),canEdit:context.role!=="partner_staff"&&!["paused","closed"].includes(decision.status),decision,capabilities:Object.fromEntries(decisions),materials,reviewToken:materials.length===2?reviewToken(context,decision):null,
 publicUrl:decision.live?`/p/${encodeURIComponent(context.partnerSlug)}`:null,
 commercial:{label:authority.data?.kind==="screening_only"?"Screening-only program. Sponsored packets are unavailable.":authority.data?"Documented program terms":"LegalEase is finalizing your program terms",screenings:screening.error||!screening.data?null:Math.max(0,screening.data.screenings_allowed-screening.data.screenings_used),packets,expiresAt:authority.data?.expires_at??null}};
}

export type ProgramPatch={section:OnboardingSectionKey;values:Record<string,unknown>;base:Record<string,unknown>};
const editable:Partial<Record<OnboardingSectionKey,readonly string[]>>={
 organization_contacts:["legal_organization_name","public_organization_name","public_program_name","website","primary_address","contacts"],
 program_goals:["participation_mode","target_population"],
 geography_audience_language_accessibility:["jurisdictions","service_area_description","counties","primary_language","enable_spanish"],
 access_sponsorship_capacity:["participant_access_model"],
 support_referrals_reporting:["participant_support_email","referral_arrangement","contested_matter_procedure"],
 brand_public_page:["program_headline","program_subheadline","approved_organization_description","primary_cta_label","participant_support_copy","program_headline_es","program_subheadline_es","approved_organization_description_es","primary_cta_label_es","participant_support_copy_es","service_area_es","target_audience_es"]
};
function same(a:unknown,b:unknown){return JSON.stringify(a??null)===JSON.stringify(b??null);}
export async function saveProgramPatches(context:PartnerOnboardingContext,patches:ProgramPatch[],requestId:string){
 enabled();if(context.role!=="partner_admin")throw new Phase1OnboardingError("forbidden","A program administrator must save these details.");
 await enableProgramPolicy(context);
 if(!Array.isArray(patches)||patches.length>7)throw new Phase1OnboardingError("invalid_input","Choose the program fields to save.");
 for(const [index,patch] of patches.entries()){
  if(!editable[patch.section]||!patch.values||typeof patch.values!=="object"||!patch.base)throw new Phase1OnboardingError("invalid_input","Check the program information.");
  const portal=await getPartnerOnboardingPortal(context);const current=(portal.data[patch.section]??{}) as Record<string,unknown>;
  for(const [key,value] of Object.entries(patch.values)){
   if(portal.workspace.status==="live"&&((patch.section==="geography_audience_language_accessibility")||(patch.section==="access_sponsorship_capacity")||(patch.section==="program_goals"&&key==="participation_mode"))&&!same(current[key],value))throw new Phase1OnboardingError("forbidden","Contact LegalEase to change the service scope of your live program.");
   if(!editable[patch.section]?.includes(key))throw new Phase1OnboardingError("forbidden","This program field is managed by LegalEase.");
   if(!same(current[key],patch.base[key])&&!same(current[key],value))throw new Phase1OnboardingError("revision_conflict","Someone updated this information. Review the latest version.");
   if(key==="legal_organization_name"&&current[key]&&!same(current[key],value)&&(await getProgramExperience(context)).legalIdentityLocked)throw new Phase1OnboardingError("forbidden","Contact LegalEase to correct the legal organization name.");
  }
  if(Object.entries(patch.values).every(([k,v])=>same(current[k],v)))continue;
  const section=portal.sections.find(s=>s.key===patch.section)!;
  const childRequest=createHash("sha256").update(`${requestId}:${index}`).digest("hex");
  const id=`${childRequest.slice(0,8)}-${childRequest.slice(8,12)}-4${childRequest.slice(13,16)}-8${childRequest.slice(17,20)}-${childRequest.slice(20,32)}`;
  await savePartnerOnboardingSection(context,{sectionKey:patch.section,expectedRevision:section.revision,expectedWorkspaceVersion:portal.workspace.aggregateVersion,requestId:id,mode:"draft_save",data:{...current,...patch.values}});
 }
 return getProgramExperience(context);
}
export async function prepareProgramDefaults(context:PartnerOnboardingContext,requestId:string){
 await enableProgramPolicy(context);const portal=await getPartnerOnboardingPortal(context);const data=portal.data;const support=getPartnerSupportContact();
 const defaults:OnboardingPartnerData={
  organization_contacts:{public_organization_name:data.organization_contacts?.legal_organization_name??portal.organizationName,public_program_name:`${data.organization_contacts?.public_organization_name??portal.organizationName} RCAP`},
  program_goals:{participation_mode:"online",target_population:"People in the program service area"},
  geography_audience_language_accessibility:{primary_language:"English",enable_spanish:false},
  support_referrals_reporting:{participant_support_email:support.email,referral_arrangement:"no_referrals",contested_matter_procedure:"Stop the self-help process for prosecutor objections, contested hearings, or requests for individualized representation. Notify the participant and contact LegalEase support for the appropriate next step. LegalEase does not provide representation."},
  brand_public_page:{program_headline:"Explore your record-clearing options",program_subheadline:"Answer clear questions to understand possible next steps.",approved_organization_description:`A record-clearing access program from ${data.organization_contacts?.public_organization_name??portal.organizationName}.`,primary_cta_label:"Start free screening",participant_support_copy:"Contact program support if you need help getting started."}
 };
 const patches:ProgramPatch[]=[];
 for(const [section,values] of Object.entries(defaults)){
  const key=section as OnboardingSectionKey;const current=(data[key]??{}) as Record<string,unknown>;
  const missing=Object.fromEntries(Object.entries(values).filter(([k])=>current[k]===undefined||current[k]===null||current[k]===""));
  if(Object.keys(missing).length)patches.push({section:key,base:current,values:missing});
 }
 return saveProgramPatches(context,patches,requestId);
}
export async function prepareProgramReview(context:Context){
 const decision=await programDecision(context,"complete_setup");
 if(!decision.allowed)throw new Phase1OnboardingError("invalid_input",decision.primaryNextAction);
 const source=await loadArtifactSourceInput(db(),context.partnerSlug);
 const ensured=await db().rpc("rcap_service_ensure_onboarding_artifacts",{p_partner_slug:context.partnerSlug,p_workspace_id:decision.workspaceId,p_generatable_types:[...requiredMaterials]});
 if(ensured.error)throw new Phase1OnboardingError("persistence_failed","Your review documents could not be prepared. Please retry.");
 const view=await getProgramExperience(context);
 for(const type of requiredMaterials){if(view.materials.some(m=>m.type===type))continue;
  const result=await generateArtifactVersion(context,{artifactType:type,requestId:randomUUID()});
  if(!result.versionId)throw new Phase1OnboardingError("persistence_failed","Your review documents could not be prepared.");
 }
 // Page generation uses exactly the source-bound standard template; a custom
 // LegalEase override remains in the canonical source and the final real review.
 void source;
 return getProgramExperience(context);
}
export async function recordProgramDecision(context:Context,type:string,decision:"approve"|"withdraw",details:Record<string,unknown>,requestId:string){
 const view=await programDecision(context,"complete_setup");
 const result=await db().rpc("rcap_service_record_program_decision",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_type:type,p_decision:decision,p_version:view.sourceVersion,p_details:details,p_request:requestId});
 if(result.error)throw new Phase1OnboardingError(result.error.code==="40001"?"revision_conflict":"invalid_transition","This decision could not be recorded. Review the current program and its real authority.");
 return result.data as string;
}
export async function finishProgramSetup(context:PartnerOnboardingContext,input:{reviewToken:string;requestId:string;confirmed:boolean}){
 if(context.role!=="partner_admin"||input.confirmed!==true)throw new Phase1OnboardingError("forbidden","Review and confirm your program information.");
 const view=await getProgramExperience(context);
 if(!view.reviewToken||input.reviewToken!==view.reviewToken)throw new Phase1OnboardingError("revision_conflict","Your program information changed. Review the updated version.");
 await recordProgramDecision(context,"partner_launch_approval","approve",{policy_version:"rcap2.2",materials_hash:view.decision.materialsHash,statement_version:"rcap2-final-review-v1"},input.requestId);
 const grants=await db().from("partner_onboarding_launch_approvals").select("id,reviewer_user_id,decision,invalidated_at,policy_details").eq("workspace_id",view.decision.workspaceId).eq("approval_type","standing_launch_authorization").order("recorded_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle();
 if(grants.error)throw new Phase1OnboardingError("persistence_failed","Your confirmation was saved. Return to your dashboard to check program status.");
 const grant=grants.data;
 if(grant?.decision==="approve"&&!grant.invalidated_at&&grant.policy_details.scope_hash===view.decision.scopeHash&&Date.parse(grant.policy_details.expires_at)>Date.now()){
  // The actor is the actual delegating operator, never a borrowed browser session.
  // The SQL stage independently checks this exact delegation again under lock.
  const executor:InternalOnboardingContext={partnerSlug:context.partnerSlug,authUserId:grant.reviewer_user_id,role:"internal_admin"};
  const prior=await db().from("rcap_launch_operation_events").select("snapshot_hash").eq("partner_slug",context.partnerSlug).eq("request_id",input.requestId).eq("step","prepared").maybeSingle();
  if(prior.error)throw new Phase1OnboardingError("persistence_failed","Publication status could not be checked. Your confirmation is saved.");
  if(prior.data){await executeRealLaunch(executor,{requestId:input.requestId,snapshotHash:prior.data.snapshot_hash,confirmed:true});return getProgramExperience(context);}
  const preflight=await getLaunchPreflight(executor);
  if(preflight.canLaunch)await executeRealLaunch(executor,{requestId:input.requestId,snapshotHash:preflight.snapshotHash,confirmed:true});
 }
 return getProgramExperience(context);
}
