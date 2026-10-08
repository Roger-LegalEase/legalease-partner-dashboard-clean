import "server-only";
import {randomUUID,createHash} from "node:crypto";
import {getSupabaseAdminClient} from "@/lib/supabase/server";
import type {InternalOnboardingContext} from "./auth-context";
import {getLaunchPreflight} from "./launch-preflight";
import {isDisposableLaunchEnvironment,syntheticVerificationToken} from "./synthetic-launch-security";
import {realLaunchOrigin,realVerificationToken} from "./real-launch-security";
import {Phase1OnboardingError} from "./errors";
export async function executeSyntheticLaunch(context:InternalOnboardingContext,input:{requestId:string;snapshotHash:string;confirmed:boolean}){
 return executeLaunch(context,input,false);
}
export async function executeRealLaunch(context:InternalOnboardingContext,input:{requestId:string;snapshotHash:string;confirmed:boolean}){
 return executeLaunch(context,input,true);
}
async function executeLaunch(context:InternalOnboardingContext,input:{requestId:string;snapshotHash:string;confirmed:boolean},real:boolean){
 const origin=real?realLaunchOrigin():process.env.RCAP_SYNTHETIC_PUBLIC_ORIGIN;
 const compensate=real?"rcap_service_compensate_real_launch":"rcap_service_compensate_synthetic_launch";
 if(real&&!origin)throw new Phase1OnboardingError("feature_disabled","Real launch requires separate release authorization.");
 if(!real&&!isDisposableLaunchEnvironment())throw new Phase1OnboardingError("feature_disabled","Live launch is disabled. Only registered disposable loopback targets may launch.");
 if(context.role!=="internal_admin" || !input.confirmed)throw new Phase1OnboardingError("forbidden","An internal administrator must explicitly confirm this exact partner launch.");
 const admin=getSupabaseAdminClient()!;
 async function verifyIntake(jurisdiction:string,accessMode:string){
  const response=await fetch(new URL(`/intake/${context.partnerSlug}`,origin!),{cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20000)});const html=await response.text();
  if(response.status!==200||!html.includes(`data-rcap-intake-partner="${context.partnerSlug}"`)||!html.includes(`data-rcap-access="${accessMode}"`)||!html.includes(`data-rcap-jurisdiction="${jurisdiction}"`))throw new Error("Public CTA, intake access, jurisdiction, or attribution readback failed.");
 }
 async function verifyBranding(html:string,token:string|null=null){
  const assets=[...html.matchAll(/data-rcap-asset="([a-f0-9-]+)"/g)].map(match=>match[1]);
  if(!assets.length)throw new Error("Approved branding absent from public readback.");
  for(const id of assets){
   const response=await fetch(new URL(`/api/partners/public-page/${context.partnerSlug}/assets/${id}`,origin!),{headers:token?{"x-rcap-synthetic-verification":token}:{},cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20000)});
   if(response.status!==200||!response.headers.get("content-type")?.startsWith("image/"))throw new Error("Approved branding asset readback failed.");
   const asset=await admin.from("partner_onboarding_assets").select("sha256_hex").eq("id",id).eq("workspace_id",(await admin.from("partner_onboarding").select("id").eq("partner_slug",context.partnerSlug).single()).data?.id??"").single();
   if(asset.error||!asset.data.sha256_hex||createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex")!==asset.data.sha256_hex)throw new Error("Approved branding bytes mismatch.");
  }
 }
 const prior=await admin.from("rcap_launch_operation_events").select("*").eq("partner_slug",context.partnerSlug).eq("request_id",input.requestId).order("created_at",{ascending:false});
 if(prior.error)throw new Phase1OnboardingError("persistence_failed","Launch journal unavailable.");
 if(prior.data?.length){const last=prior.data[0];if(last.snapshot_hash!==input.snapshotHash || last.actor_auth_user_id!==context.authUserId)throw new Phase1OnboardingError("duplicate_request","Request identity was used with different inputs.");if(last.step==="complete"){
 if(real){const url=new URL(`/p/${context.partnerSlug}`,origin!);const response=await fetch(url,{cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20000)});const html=await response.text();if(response.status!==200||!html.includes(`data-rcap-operation="${last.operation_id}"`))throw new Phase1OnboardingError("invalid_transition","The completion receipt exists, but current public verification is held.");
 const current=await getLaunchPreflight(context);
 if(!last.evidence.activationRecord||Object.entries(last.evidence.activationRecord).some(([key,value])=>(current.reviewedSnapshot.activationRecord as Record<string,unknown>|null)?.[key]!==value))throw new Phase1OnboardingError("invalid_transition","The completion receipt exists, but the authoritative partner record changed.");
 const packageNow=current.reviewedVersions.filter(v=>v.type!=="partner_launch_kit");
 if(!Array.isArray(last.evidence.reviewedVersions)||packageNow.length!==last.evidence.reviewedVersions.length||packageNow.some(v=>!last.evidence.reviewedVersions.some((old:Record<string,unknown>)=>old.type===v.type&&old.id===v.id&&old.hash===v.hash&&old.freshness===v.freshness&&old.approval===v.approval&&old.partnerApproval===v.partnerApproval)))throw new Phase1OnboardingError("invalid_transition","The completion receipt exists, but the approved launch package changed.");
 if(!html.includes(`data-rcap-page-hash="${last.evidence.pageHash}"`)||!html.includes(`data-rcap-access="${last.evidence.accessMode}"`))throw new Phase1OnboardingError("invalid_transition","The completed public snapshot changed.");
 try{await verifyBranding(html);await verifyIntake(String(last.evidence.intakeJurisdiction),String(last.evidence.accessMode));}catch{throw new Phase1OnboardingError("invalid_transition","The completion receipt exists, but current branding verification is held.");}}
 return {status:"complete",operationId:last.operation_id,publicUrl:last.evidence.publicUrl,duplicate:true,mode:last.evidence.mode??"synthetic"};}if(last.step!=="failed") {
 if(real && Date.now()-Date.parse(last.created_at)<15*60*1000)throw new Phase1OnboardingError("request_in_progress","This launch is already running. Retry this request after it completes.");
 const rollback=await admin.rpc(compensate,{p_slug:context.partnerSlug,p_actor:context.authUserId,p_operation:last.operation_id,p_hash:input.snapshotHash});
 if(rollback.error)throw new Phase1OnboardingError("persistence_failed","Interrupted operation compensation requires operator inspection.");
 const recovery=await admin.from("rcap_launch_operation_events").insert({workspace_id:last.workspace_id,partner_slug:context.partnerSlug,operation_id:last.operation_id,request_id:input.requestId,actor_auth_user_id:context.authUserId,snapshot_hash:input.snapshotHash,authority_reference:last.authority_reference,step:"failed",evidence:{failedStep:last.step,compensated:true,message:"Interrupted operation safely compensated on retry."}});
 if(recovery.error)throw new Phase1OnboardingError("persistence_failed","Interrupted operation recovery receipt unavailable.");
 }
 throw new Phase1OnboardingError("invalid_transition","The prior operation failed and is held. Refresh preflight and use a new request to retry.");}
 const preflight=await getLaunchPreflight(context);
 if(input.snapshotHash!==preflight.snapshotHash)throw new Phase1OnboardingError("revision_conflict","The reviewed program changed. Reload preflight.");
 if(real && preflight.mode!=="real")throw new Phase1OnboardingError("feature_disabled","Real launch authorization is disabled.");
 if(!preflight.canLaunch)throw new Phase1OnboardingError("invalid_transition",preflight.heldReason??"Launch is held.");
 const target=real?{error:null,data:{authority_reference:preflight.commercialAuthority!.authority_reference,failure_step:null}}:await admin.from("rcap_synthetic_launch_targets").select("authority_reference,failure_step").eq("partner_slug",context.partnerSlug).single();
 if(target.error)throw new Phase1OnboardingError("forbidden","Synthetic target authority unavailable.");
 const previous=await admin.from("partner_onboarding").select("status,landing_page_ready,internal_approved_at,launched_at").eq("id",preflight.workspaceId).single();
 if(previous.error || previous.data.status==="live")throw new Phase1OnboardingError("invalid_transition","Only an unpublished partner may start launch.");
 const authorityBefore=await admin.from("partner_records").select("payment_status,qualification_status,provisioning_status,access_mode").eq("partner_slug",context.partnerSlug).single();
 const capacityBefore=await admin.from("partner_entitlement").select("screenings_allowed,screenings_used").eq("partner_slug",context.partnerSlug).single();
 if(authorityBefore.error||capacityBefore.error)throw new Phase1OnboardingError("persistence_failed","Activation and screening authority unavailable.");
 const legacyOnboarding=real?await admin.from("partner_records").select("onboarding_status,onboarding_completed_at").eq("partner_slug",context.partnerSlug).single():{data:null,error:null};
 if(legacyOnboarding.error)throw new Phase1OnboardingError("persistence_failed","Legacy onboarding reconciliation source unavailable.");
 const operationId=randomUUID();const publicUrl=new URL(`/p/${context.partnerSlug}`,origin!).href;
 const base={workspace_id:preflight.workspaceId,partner_slug:context.partnerSlug,operation_id:operationId,request_id:input.requestId,actor_auth_user_id:context.authUserId,snapshot_hash:preflight.snapshotHash,authority_reference:target.data.authority_reference};
 async function receipt(step:string,evidence:Record<string,unknown>){const {error}=await admin.from("rcap_launch_operation_events").insert({...base,step,evidence:{...evidence,...(real?{mode:"real",commercialAuthorityId:preflight.commercialAuthority!.id}:{})}});if(error)throw new Error(`Receipt ${step} failed.`);}
 let failedStep="prepared",prepared=false;
 try{
  await receipt("prepared",{previousPublication:previous.data,workspaceVersion:preflight.workspaceVersion,...(real?{mode:"real",snapshot:preflight.reviewedSnapshot,intakeJurisdiction:preflight.intakeJurisdiction,previousLegacyOnboarding:legacyOnboarding.data,commercialAuthorityId:preflight.commercialAuthority!.id,releaseAuthorization:process.env.RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION,checks:preflight.readiness.checks.map(c=>({key:c.key,status:c.status,checkedAt:c.checkedAt}))}:{})});
  prepared=true;
  failedStep="publication_staged";
  const staged=await admin.rpc(real?"rcap_service_stage_real_launch":"rcap_service_stage_synthetic_launch",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_operation:operationId,p_version:preflight.workspaceVersion,p_hash:preflight.snapshotHash,p_versions:preflight.reviewedVersions.filter(v=>v.type!=="partner_launch_kit"),...(real?{p_authority:preflight.commercialAuthority!.id}:{})});
  if(staged.error)throw new Error("Publication staging refused current authority or source.");
  failedStep="public_verified";
  if(target.data.failure_step==="public_verified")throw new Error("Registered synthetic partial-failure fixture.");
  const hidden=await fetch(publicUrl,{cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20000)});if(hidden.status!==404)throw new Error("Premature public visibility detected.");
  const readback=await fetch(publicUrl,{headers:{"x-rcap-synthetic-verification":(real?realVerificationToken:syntheticVerificationToken)(context.partnerSlug,operationId)},cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20000)});const html=await readback.text();
  if(readback.status!==200 || !html.includes(`/partner/intake/${context.partnerSlug}`) && !html.includes(`/intake/${context.partnerSlug}`))throw new Error("Staged public route or attribution verification failed.");
  if(real){
   const expectedPage=preflight.reviewedVersions.find(v=>v.type==="co_branded_page_configuration");
   if(!expectedPage||!html.includes(`data-rcap-page-hash="${expectedPage.hash}"`))throw new Error("Approved co-brand snapshot readback mismatch.");
   const page=await admin.from("partner_onboarding_artifact_versions").select("rendered_content").eq("id",expectedPage.id).eq("workspace_id",preflight.workspaceId).single();
   const composition=page.data?.rendered_content?.pagePreview;
   const escape=(value:string)=>value.replaceAll("&","&amp;").replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#x27;");
   if(page.error||!composition||![composition.publicName?.value,composition.headline?.value,composition.primaryActionLabel?.value].every(value=>typeof value==="string"&&html.includes(escape(value))))throw new Error("Approved partner name, headline, or CTA readback mismatch.");
   const marker=`data-rcap-partner="${context.partnerSlug}"`;
   if(!html.includes(marker)||!html.includes(`data-rcap-access="${preflight.commercialAuthority!.access_mode}"`)||!html.includes(`data-rcap-operation="${operationId}"`))throw new Error("Partner identity, access, or attribution readback mismatch.");
   await verifyBranding(html,realVerificationToken(context.partnerSlug,operationId));
  }
  const publication=await admin.from("partner_onboarding").select("status,landing_page_ready").eq("id",preflight.workspaceId).single();
  const authorityAfter=await admin.from("partner_records").select("payment_status,qualification_status,provisioning_status,access_mode").eq("partner_slug",context.partnerSlug).single();
  const capacityAfter=await admin.from("partner_entitlement").select("screenings_allowed,screenings_used").eq("partner_slug",context.partnerSlug).single();
  if(publication.error||publication.data.status!=="live"||!publication.data.landing_page_ready||authorityAfter.error||capacityAfter.error||JSON.stringify(authorityBefore.data)!==JSON.stringify(authorityAfter.data)||JSON.stringify(capacityBefore.data)!==JSON.stringify(capacityAfter.data))throw new Error("Publication or immutable activation/capacity readback failed.");
  await receipt("public_verified",{publicUrl,status:readback.status,anonymousStatusBeforeComplete:hidden.status,attributionVerified:true,activationUnchanged:true,screeningCapacityUnchanged:true,accessMode:preflight.program?.access.configured});
  failedStep="public_readback";const publicReadback=await fetch(publicUrl,{cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20000)});const publicHtml=await publicReadback.text();if(publicReadback.status!==200 || (real && (!publicHtml.includes(`data-rcap-operation="${operationId}"`) || !publicHtml.includes(`/intake/${context.partnerSlug}`))))throw new Error("Public readback failed.");
  if(real){await verifyBranding(publicHtml);await verifyIntake(preflight.intakeJurisdiction!,preflight.commercialAuthority!.access_mode);}
  failedStep="complete";await receipt("complete",{publicUrl,verified:true,anonymousStatus:publicReadback.status,...(real?{mode:"real",commercialAuthorityId:preflight.commercialAuthority!.id,snapshotHash:preflight.snapshotHash,activationRecord:preflight.reviewedSnapshot.activationRecord,reviewedVersions:preflight.reviewedVersions.filter(v=>v.type!=="partner_launch_kit"),intakeJurisdiction:preflight.intakeJurisdiction,pageHash:preflight.reviewedVersions.find(v=>v.type==="co_branded_page_configuration")?.hash,accessMode:preflight.commercialAuthority!.access_mode}: {})});
  return {status:"complete",operationId,publicUrl,duplicate:false,mode:real?"real":"synthetic"};
 }catch(error){
  if(!prepared)throw new Phase1OnboardingError("request_in_progress","Another launch owns this workspace or the preparation receipt was refused. Refresh the journal.");
  // Even if final readback fails, publication is held. An immutable completion
  // receipt is not silently rewritten; the later failed receipt remains visible.
  const rollback=await admin.rpc(compensate,{p_slug:context.partnerSlug,p_actor:context.authUserId,p_operation:operationId,p_hash:preflight.snapshotHash});
  try{await receipt("failed",{failedStep,compensated:!rollback.error,message:error instanceof Error?error.message:"Launch failed"});}catch{/* Original receipt error remains the refusal; no success is returned. */}
  throw new Phase1OnboardingError("persistence_failed",`Partner launch failed at ${failedStep}; ${rollback.error?"publication compensation requires operator inspection":"publication held"}.`,{operationId,failedStep});
 }
}
