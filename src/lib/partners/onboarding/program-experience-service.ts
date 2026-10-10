import { prepareProgramSpanish } from "./program-spanish-service";
import { renderCoBrandedPageConfiguration, programPageIssues } from "./artifact-generator";
import { workspaceReadError } from "./workspace-loading";
import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { InternalOnboardingContext, PartnerOnboardingContext } from "./auth-context";
import { getAuthoritativelyPublicPartnerRecord } from "../public-partner-page";
import { isRcap2Enabled } from "./feature";
import { Phase1OnboardingError } from "./errors";
import { artifactGeneratorVersion, detectArtifactDrift, projectArtifactSource } from "./artifact-domain";
import { generateArtifactVersion, loadArtifactSourceInput } from "./artifact-service";
import { getPartnerSupportContact } from "./support-contact";
import { PROGRAM_ACTIONS, type ProgramAction, type ProgramDecision, type ProgramExperience, type ProgramMaterial } from "./program-experience";
import { getProgramConfiguration, saveProgramConfiguration } from "./program-configuration-service";
import type { ProgramPatch } from "./program-configuration";
export type { ProgramPatch } from "./program-configuration";
import type { OnboardingPartnerData, OnboardingSectionKey } from "./types";
import { executeRealLaunch } from "./synthetic-launch-service";
import { getLaunchPreflight } from "./launch-preflight";

type Context=InternalOnboardingContext|PartnerOnboardingContext;
const requiredMaterials=["implementation_brief","co_branded_page_configuration"] as const;
function db(){const client=getSupabaseAdminClient();if(!client)throw new Phase1OnboardingError("persistence_failed","Program information is unavailable. Please retry.");return client;}
function enabled(){if(!isRcap2Enabled())throw new Phase1OnboardingError("feature_disabled","Program setup is unavailable.");}
export async function programDecision(context:Context,action:ProgramAction):Promise<ProgramDecision>{
 enabled();const result=await db().rpc("rcap_service_evaluate_program",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_action:action});
 if(result.error||!result.data)throw workspaceReadError("rcap_service_evaluate_program",result.error,"This program action is unavailable for your account. Please retry.");
 const decision=result.data as ProgramDecision;
 if(decision.partnerSlug!==context.partnerSlug||decision.actor!==context.authUserId||decision.role!==context.role||!decision.workspaceId||!["legacy","rcap2.2"].includes(decision.policyVersion))throw new Phase1OnboardingError("forbidden","Program identity could not be verified.");
 if(decision.action!==action||typeof decision.allowed!=="boolean"||!Number.isSafeInteger(Number(decision.sourceVersion))||!Array.isArray(decision.requirements)||!Array.isArray(decision.blockers)||typeof decision.scopeHash!=="string"||!decision.requirements.every(r=>r&&typeof r.key==="string"&&typeof r.label==="string"&&typeof r.effective==="boolean")||!decision.blockers.every(r=>r&&typeof r.key==="string"&&typeof r.label==="string"))throw new Phase1OnboardingError("persistence_failed","The program authority response is invalid.",{operation:"rcap_service_evaluate_program"});
 return decision;
}
export async function enableProgramPolicy(context:Context,input:{confirmed:boolean;requestId:string;expectedVersion:number}){
 const current=await programDecision(context,"complete_setup");
 if(context.role==="partner_staff"||input.confirmed!==true)throw new Phase1OnboardingError("forbidden","Explicit administrator authorization is required to change setup policy.");
 if(current.policyVersion==="rcap2.2")return;
 if(current.sourceVersion!==input.expectedVersion)throw new Phase1OnboardingError("revision_conflict","The program changed. Reload before choosing five-step setup.");
 if(["live","paused","closed"].includes(current.status))throw new Phase1OnboardingError("invalid_transition","This existing program retains its current policy.");
 // Durable intent is written before the existing actor-checked RPC. A failed RPC
 // remains a request, never a fabricated success. Opening the workspace calls neither.
 const prior=await db().from("partner_events").select("partner_slug,event_type,event_payload").eq("id",input.requestId).maybeSingle();
 if(prior.error)throw workspaceReadError("partner_events.policy_upgrade",prior.error,"The policy request could not be verified.");
 if(prior.data&&(prior.data.partner_slug!==context.partnerSlug||prior.data.event_type!=="rcap_program_policy_upgrade_requested"||prior.data.event_payload?.actor!==context.authUserId))throw new Phase1OnboardingError("forbidden","The policy request belongs to another operation.");
 if(!prior.data){const audit=await db().from("partner_events").insert({id:input.requestId,partner_slug:context.partnerSlug,event_type:"rcap_program_policy_upgrade_requested",event_label:"Five-step program setup requested",event_payload:{actor:context.authUserId,workspaceId:current.workspaceId,sourceVersion:current.sourceVersion,from:"legacy",to:"rcap2.2"}});if(audit.error)throw workspaceReadError("partner_events.policy_upgrade",audit.error,"The policy request could not be recorded.");}
 const result=await db().rpc("rcap_service_enable_program_policy",{p_slug:context.partnerSlug,p_actor:context.authUserId});
 if(result.error)throw new Phase1OnboardingError(result.error.code==="42501"?"forbidden":"invalid_transition","This program cannot change setup policy in its current state.");
}
async function requireCurrentProgramPolicy(context:Context){
 if((await programDecision(context,"complete_setup")).policyVersion!=="rcap2.2")throw new Phase1OnboardingError("invalid_transition","Choose Use five-step setup explicitly before changing this program through the five-step workflow.");
}

function reviewToken(context:Context,decision:ProgramDecision){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Phase1OnboardingError("persistence_failed","Review is temporarily unavailable.");
 return createHmac("sha256",key).update(JSON.stringify([context.authUserId,context.partnerSlug,decision.materialsHash,"rcap2-final-review-v1"])).digest("hex");
}
export async function getProgramExperience(context:Context):Promise<ProgramExperience>{
 const decision=await programDecision(context,context.role==="partner_staff"?"view_reporting":"complete_setup");
 if(decision.policyVersion==="legacy"&&decision.status==="live")decision.live=Boolean(await getAuthoritativelyPublicPartnerRecord(context.partnerSlug));
 const source=await loadArtifactSourceInput(db(),context.partnerSlug);
 const [versions,screening,authority,decisions,jurisdictionScope,screeningCapacity]=await Promise.all([
  db().from("partner_onboarding_artifacts").select("artifact_type,current_version_id").eq("workspace_id",decision.workspaceId).in("artifact_type",[...requiredMaterials]),
  db().from("partner_entitlement").select("screenings_allowed,screenings_used").eq("partner_slug",context.partnerSlug).maybeSingle(),
  db().from("rcap_commercial_authorizations").select("kind,expires_at,packet_entitlement_id").eq("workspace_id",decision.workspaceId).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle(),
  Promise.all(PROGRAM_ACTIONS.filter(a=>context.role!=="partner_staff"||a==="view_reporting"||a==="assist_participant"||a==="offer_paid_packet").map(async action=>[action,await programDecision(context,action)] as const)),
  context.role==="internal_admin" ? Promise.resolve({data:null,error:null}) : db().rpc("rcap_program_partner_jurisdictions",{p_workspace:decision.workspaceId}),
  db().rpc("rcap_program_screening_capacity",{p_slug:context.partnerSlug})
 ]);
 if(screeningCapacity.error)throw workspaceReadError("program_experience.screening_capacity",screeningCapacity.error,"The current screening allowance could not be verified.");
 if(jurisdictionScope.error || (context.role!=="internal_admin" && (!Array.isArray(jurisdictionScope.data) || !jurisdictionScope.data.every(code=>typeof code==="string"))))throw workspaceReadError("program_experience.jurisdiction_scope",jurisdictionScope.error,"The permitted service area could not be verified. Please retry.");
 if(versions.error||authority.error)throw workspaceReadError("program_experience.materials_or_authority",[versions.error,authority.error],"Your program could not be loaded. Please retry.");
 const materialRows=versions.data?.length?await db().from("partner_onboarding_artifact_versions").select("id,version_number,rendered_content,generator_version,normalized_snapshot,snapshot_hash,generation_status,source_drift_invalidated_at,superseded_at").in("id",versions.data.map(v=>v.current_version_id).filter(Boolean)):{data:[],error:null};
 if(materialRows.error)throw workspaceReadError("program_experience.material_versions",materialRows.error,"Current material versions could not be checked.");
 const materials:ProgramMaterial[]=[];
 const draftMaterials:NonNullable<ProgramExperience["draftMaterials"]>=[];
 for(const material of versions.data??[]){
  const row=materialRows.data?.find(v=>v.id===material.current_version_id);
  const type=material.artifact_type as typeof requiredMaterials[number];
  if(!row||row.generation_status!=="succeeded"||row.source_drift_invalidated_at||row.superseded_at)continue;
  if(detectArtifactDrift({storedSnapshot:row.normalized_snapshot,storedGeneratorVersion:row.generator_version,current:projectArtifactSource(type,source),currentGeneratorVersion:artifactGeneratorVersion(type,source)}).stale)continue;
  if(type==="co_branded_page_configuration") {
   const issues=programPageIssues(source,row.rendered_content?.pagePreview);
   if(issues.length){draftMaterials.push({type,id:row.id,hash:row.snapshot_hash,version:row.version_number,document:row.rendered_content,issues});continue;}
  }
  materials.push({type,id:row.id,hash:row.snapshot_hash,version:row.version_number,document:row.rendered_content});
 }
 // The policy confirmation is necessary, but every rendered source and generator
 // fingerprint must also match before the workspace can call setup complete.
 decision.setupComplete=decision.setupComplete&&materials.length===requiredMaterials.length;
 let packets:number|null=null;
 let entitlementId=authority.data?.packet_entitlement_id;
 if(decision.operatingModel==="legalease_managed") {
  const allocation=await db().from("partner_packet_entitlement").select("id,partner_records!inner(partner_slug)").eq("partner_records.partner_slug",context.partnerSlug).eq("entitlement_scope","sponsored_packets").is("expires_at",null).maybeSingle();
  entitlementId=allocation.error?null:allocation.data?.id;
 }

 if(decision.serviceMode==="screening_only"||authority.data?.kind==="screening_only")packets=0;
 else if(entitlementId){
  const [allocation,usage]=await Promise.all([db().from("partner_packet_entitlement").select("packet_cap").eq("id",entitlementId).single(),db().from("packet_credit_ledger").select("id",{count:"exact",head:true}).eq("entitlement_id",entitlementId).in("event_type",["reserved","consumed"])]);
  if(!allocation.error&&!usage.error)packets=Math.max(0,allocation.data.packet_cap-(usage.count??0));
 }
 const publication=decisions.find(([action])=>action==="publish_partner_page")?.[1];
 const blocker=publication?.blockers[0];
 const configurationKeys=["organization_facts","program_scope","geographic_presentation","support_and_referral_contacts_configured"];
 const publicationNextAction:ProgramExperience["publicationNextAction"]=!decision.live&&blocker ? configurationKeys.includes(blocker.key)
  ? {reason:blocker.label,href:"/partner/settings?step=program",label:"Review program settings",labelEs:"Revisar la configuración"}
  : !decision.setupComplete && ["partner_launch_approval_received","artifact_versions_current"].includes(blocker.key)
   ? {reason:blocker.label,href:"/partner/settings?step=start",label:"Review current materials",labelEs:"Revisar los materiales actuales"}
   : {reason:blocker.label,href:getPartnerSupportContact().mailtoHref,label:"Contact LegalEase about publication",labelEs:"Contactar a LegalEase sobre la publicación"}
  : null;
 return {partnerSlug:context.partnerSlug,organizationName:source.data.organization_contacts?.public_organization_name??source.partnerRecord.organizationName,version:decision.sourceVersion,data:source.data,permittedJurisdictions:jurisdictionScope.data??undefined,publicationNextAction,legalIdentityLocked:source.workspace.agreementStatus==="signed"||Boolean(authority.data),canEdit:context.role!=="partner_staff"&&!["paused","closed"].includes(decision.status),decision,capabilities:Object.fromEntries(decisions.map(([action,result])=>[action,result.allowed])),materials,draftMaterials,reviewToken:materials.length===2?reviewToken(context,decision):null,
 publicUrl:decision.live?`/p/${encodeURIComponent(context.partnerSlug)}`:null,
 commercial:{label:decision.operatingModel==="legalease_managed"?(decision.authorityId?"LegalEase internal operating authority recorded.":"Confirm LegalEase operating authority with Start Program."):authority.data&&Date.parse(authority.data.expires_at)<=Date.now()?"Recorded service authority has expired.":authority.data?.kind==="screening_only"?"Screening-only terms recorded. Sponsored packets are unavailable.":authority.data?"Documented program terms recorded":"Current service authority has not been recorded",screenings:screeningCapacity.data?.limited===true?screeningCapacity.data.remaining:screening.error||!screening.data?null:Math.max(0,screening.data.screenings_allowed-screening.data.screenings_used),packets,expiresAt:authority.data?.expires_at??null}};
}

export async function saveProgramPatches(context:PartnerOnboardingContext,patches:ProgramPatch[],requestId:string,expectedVersion?:number,confirmPublicationHold=false){
 await saveProgramConfiguration(context,{patches,requestId,expectedVersion,confirmPublicationHold});
 return getProgramExperience(context);
}
export async function prepareProgramDefaults(context:PartnerOnboardingContext,requestId:string){
 await requireCurrentProgramPolicy(context);const portal=await getProgramConfiguration(context);const data=portal.data;const organizationName=data.organization_contacts?.public_organization_name??data.organization_contacts?.legal_organization_name??"";const support=getPartnerSupportContact();
 const defaults:OnboardingPartnerData={
  organization_contacts:{public_organization_name:data.organization_contacts?.legal_organization_name??organizationName,public_program_name:`${data.organization_contacts?.public_organization_name??organizationName} RCAP`},
  program_goals:{participation_mode:"online",target_population:"People in the program service area"},
  geography_audience_language_accessibility:{primary_language:"English",enable_spanish:false},
  support_referrals_reporting:{participant_support_email:support.email,referral_arrangement:"no_referrals",contested_matter_procedure:"Stop the self-help process for prosecutor objections, contested hearings, or requests for individualized representation. Notify the participant and contact LegalEase support for the appropriate next step. LegalEase does not provide representation."},
  brand_public_page:{program_headline:"Explore your record-clearing options",program_subheadline:"Answer clear questions to understand possible next steps.",approved_organization_description:`A record-clearing access program from ${data.organization_contacts?.public_organization_name??organizationName}.`,primary_cta_label:"Start free screening",participant_support_copy:"Contact program support if you need help getting started."}
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
 await requireCurrentProgramPolicy(context);
 const decision=await programDecision(context,"complete_setup");
 if(!decision.allowed)throw new Phase1OnboardingError("invalid_input",decision.blockers.map(b=>b.label).join(" "));
 const before=await getProgramExperience(context);
 if(before.materials.length===requiredMaterials.length)return before;
 if(!before.materials.some(m=>m.type==="co_branded_page_configuration"))await prepareProgramSpanish(context);
 const source=await loadArtifactSourceInput(db(),context.partnerSlug);
 const draft=renderCoBrandedPageConfiguration(source);
 if(!draft.pagePreview || draft.pagePreview.missing.length)throw new Phase1OnboardingError("invalid_input",draft.pagePreview?.missing[0] ? `${draft.pagePreview.missing[0].label}. ${draft.pagePreview.missing[0].whereToSet}.` : "Participant Page content could not be verified. Retry Update Materials.");
 const ensured=await db().rpc("rcap_service_ensure_onboarding_artifacts",{p_partner_slug:context.partnerSlug,p_workspace_id:decision.workspaceId,p_generatable_types:[...requiredMaterials]});
 if(ensured.error)throw new Phase1OnboardingError("persistence_failed","Your review documents could not be prepared. Please retry.");
 const view=await getProgramExperience(context);
 for(const type of requiredMaterials){if(view.materials.some(m=>m.type===type))continue;
  await generateArtifactVersion(context,{artifactType:type,requestId:randomUUID()});
 }
 const result=await getProgramExperience(context);
 if(result.materials.length!==requiredMaterials.length)throw new Phase1OnboardingError("revision_conflict","Materials are not yet complete and current. The program may have changed during preparation. Retry Update Materials.");
 return result;
}
export async function recordProgramDecision(context:Context,type:string,decision:"approve"|"withdraw",details:Record<string,unknown>,requestId:string){
 const view=await programDecision(context,"complete_setup");
 const result=await db().rpc("rcap_service_record_program_decision",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_type:type,p_decision:decision,p_version:view.sourceVersion,p_details:details,p_request:requestId});
 if(result.error)throw new Phase1OnboardingError(["PT409","40001"].includes(result.error.code)?"revision_conflict":"invalid_transition","This decision could not be recorded. Review the current program and its real authority.");
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
