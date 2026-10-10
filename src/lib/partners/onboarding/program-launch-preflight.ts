import "server-only";
import { programPageIssues } from "./artifact-generator";
import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { InternalOnboardingContext } from "./auth-context";
import { loadInternalArtifactBoardWithSource } from "./artifact-service";
import { programDecision } from "./program-experience-service";
import { resolveProgramPresentation } from "./program-presentation";
import { realLaunchOrigin } from "./real-launch-security";
import type { CommercialAuthority } from "./commercial-authority";
import type { LaunchCheckEvaluation, LaunchReadiness } from "./launch-readiness";
import type { LaunchExceptionEvent } from "./launch-exception-policy";
import { workspaceReadError } from "./workspace-loading";
export async function getProgramLaunchPreflight(context:InternalOnboardingContext){
 const admin=getSupabaseAdminClient()!;
 const {board,source}=await loadInternalArtifactBoardWithSource(context, { readOnly: true });
 const decision=await programDecision(context,"publish_partner_page");
 const [authority,documents,activation,screening,allocations,journal,delegations]=await Promise.all([
  admin.from("rcap_commercial_authorizations").select("*").eq("workspace_id",decision.workspaceId).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle(),
  admin.from("partner_onboarding_assets").select("id,original_filename,sha256_hex").eq("workspace_id",decision.workspaceId).eq("category","procurement_document").eq("review_status","approved").eq("lifecycle_status","active").is("deleted_at",null),
  admin.from("partner_records").select("id,payment_status,qualification_status,stripe_payment_intent_id,paid_at,payment_amount,target_state,state,access_mode,provisioning_status").eq("partner_slug",context.partnerSlug).single(),
  admin.from("partner_entitlement").select("screenings_allowed,screenings_used").eq("partner_slug",context.partnerSlug).maybeSingle(),
  admin.from("partner_packet_entitlement").select("id,packet_cap,effective_at,expires_at").eq("partner_id",(await admin.from("partner_records").select("id").eq("partner_slug",context.partnerSlug).single()).data?.id ?? "00000000-0000-0000-0000-000000000000"),
  admin.from("rcap_launch_operation_events").select("operation_id,request_id,snapshot_hash,actor_auth_user_id,step,created_at,evidence").eq("workspace_id",decision.workspaceId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
  admin.from("partner_onboarding_launch_approvals").select("id,reviewer_user_id,decision,invalidated_at,policy_details").eq("workspace_id",decision.workspaceId).eq("approval_type","standing_launch_authorization").order("recorded_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle()
 ]);
 for(const [operation,result] of Object.entries({authority,documents,activation,screening,allocations,journal,delegations}))if(result.error)throw workspaceReadError(`program_preflight.${operation}`,result.error,"The current program authority could not be verified.");
 const checks:LaunchCheckEvaluation[]=decision.requirements.map(r=>({key:r.key,label:r.label,category:"configuration",owner:r.owner_domain==="participant_consent"?"partner":"legalease",determination:"automated",blocking:!r.default_applied,status:r.passing?"passing":"failing",partnerVisible:true,nextAction:r.label,evidenceSummary:r.default_applied?"Approved standard program default":r.effective?"Current scoped authority":"Required fact is not yet established",evidenceReference:"program-policy",checkedAt:null,invalidatedAt:null,invalidatedReason:null}));
 const readiness:LaunchReadiness={ready:decision.allowed,checks,groups:[{category:"configuration",label:"Program capabilities",checks}],blockingFailures:decision.blockers.length,primaryNextAction:decision.blockers.length?{checkKey:decision.blockers[0].key,label:decision.blockers[0].label,owner:"legalease",action:decision.primaryNextAction}:null};
 const versions=board.entries.filter(e=>["implementation_brief","co_branded_page_configuration"].includes(e.artifactType)).map(e=>({type:e.artifactType,id:e.currentVersion?.id,hash:e.currentVersion?.snapshotHash,freshness:e.sourceFreshness,approval:e.currentVersion?.approvalStatus,partnerApproval:e.currentVersion?.partnerReviewStatus}));
 const grant=delegations.data;
 const delegationId=grant?.decision==="approve"&&!grant.invalidated_at&&grant.reviewer_user_id===context.authUserId&&grant.policy_details.scope_hash===decision.scopeHash&&Date.parse(grant.policy_details.expires_at)>Date.now()?grant.id:null;
 const managed=decision.operatingModel==="legalease_managed";
 const intakeJurisdictions=source.data.geography_audience_language_accessibility?.jurisdictions??[];
 const launchAuthority={id:managed?decision.authorityId:authority.data?.id,reference:managed?source.data.program_goals?.operator_authority_reference:authority.data?.authority_reference,accessMode:managed?source.data.access_sponsorship_capacity?.participant_access_model:authority.data?.access_mode,operatingModel:decision.operatingModel??"partner_managed"};
 const reviewedInputs={operatingModel:decision.operatingModel,operatingDecisionId:managed?decision.authorityId:null,intakeJurisdictions,partnerSlug:context.partnerSlug,workspaceVersion:decision.sourceVersion,activationRecord:activation.data,scopeHash:decision.scopeHash,materialsHash:decision.materialsHash,delegationId,commercialAuthority:authority.data,screeningCapacity:screening.data,versions};
 const snapshotHash=createHash("sha256").update(JSON.stringify(reviewedInputs)).digest("hex");
 const latestOperation=journal.data;const inProgress=Boolean(latestOperation&&["prepared","publication_staged","public_verified"].includes(latestOperation.step));
 const releaseAuthorized=Boolean(realLaunchOrigin());
 const contentIssues=programPageIssues(source,board.entries.find(e=>e.artifactType==="co_branded_page_configuration")?.currentVersion?.document?.pagePreview);
 const canLaunch=contentIssues.length===0&&releaseAuthorized&&decision.allowed&&!inProgress&&!decision.live&&!["live","paused","closed"].includes(decision.status)&&versions.length===2&&versions.every(v=>v.freshness==="current");
 const canAuthorizeStart=contentIssues.length===0&&releaseAuthorized&&!inProgress&&!decision.live&&!["live","paused","closed"].includes(decision.status)&&versions.length===2&&versions.every(v=>v.freshness==="current")&&(managed?decision.canAuthorizeStart===true:decision.setupComplete&&(decision.allowed||(decision.blockers.length===1&&decision.blockers[0].key==="legalease_final_review_complete")));
 return {launchAuthority,intakeJurisdictions,canAuthorizeStart,mode:"real" as const,releaseAuthorized,qualificationVerified:activation.data?.qualification_status==="qualified",intakeJurisdiction:intakeJurisdictions.length===1?intakeJurisdictions[0]:null,reviewedSnapshot:reviewedInputs,latestOperation,canRecover:Boolean(inProgress&&latestOperation?.actor_auth_user_id===context.authUserId&&Date.now()-Date.parse(latestOperation.created_at)>=15*60*1000),realAuthorityRequirements:decision.requirements.map(r=>({label:r.label,passing:r.effective===true})),commercialAuthority:authority.data as CommercialAuthority|null,commercialValid:decision.requirements.find(r=>r.key==="commercial_gate_cleared")?.effective===true,commercialDocuments:documents.data??[],packetAllocations:allocations.data??[],commercialSourceAvailable:true,partnerSlug:context.partnerSlug,workspaceId:decision.workspaceId,workspaceVersion:decision.sourceVersion,operatorAuthUserId:context.authUserId,asOf:new Date().toISOString(),snapshotHash,readiness,effective:{raw:readiness,activeExceptions:[] as LaunchExceptionEvent[],remainingHardStops:checks.filter(c=>decision.blockers.some(b=>b.key===c.key)),ready:decision.allowed,label:decision.allowed?"Ready to start":"Program needs attention"},program:resolveProgramPresentation(source,readiness),reviewedVersions:versions,operationStatus:canLaunch?"prepared" as const:"held" as const,canLaunch,heldReason:inProgress?"Program publication is in progress. Check the operation before retrying.":decision.live?"Your program is live.":!releaseAuthorized?"This application release is not authorized to publish programs.":contentIssues.length?contentIssues[0]:!decision.allowed?decision.primaryNextAction:versions.some(v=>v.freshness!=="current")?"Review the updated program materials.":null};
}
