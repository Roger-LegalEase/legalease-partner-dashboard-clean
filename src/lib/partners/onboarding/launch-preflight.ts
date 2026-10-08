import "server-only";
import {createHash} from "node:crypto";
import type {InternalOnboardingContext} from "./auth-context";
import {getInternalLaunchReadiness} from "./launch-readiness-service";
import {getSupabaseAdminClient} from "@/lib/supabase/server";
import {resolveEffectiveReadiness,type LaunchExceptionEvent} from "./launch-exception-policy";
import {isPartnerActivationAuthorized} from "../partner-public-eligibility";
import {isDisposableLaunchEnvironment} from "./synthetic-launch-security";
import {Phase1OnboardingError} from "./errors";
export async function getLaunchPreflight(context:InternalOnboardingContext){
 if(context.role!=="internal_admin")throw new Phase1OnboardingError("forbidden","Internal launch authority is required.");
 const view=await getInternalLaunchReadiness(context);const admin=getSupabaseAdminClient()!;
 const {data:workspace,error:workspaceError}=await admin.from("partner_onboarding").select("id,aggregate_version").eq("partner_slug",context.partnerSlug).single();
 if(workspaceError)throw new Phase1OnboardingError("persistence_failed","Program source unavailable.");
 const reviewedInputs={partnerSlug:context.partnerSlug,workspaceVersion:workspace.aggregate_version,program:view.program,checks:view.readiness.checks.map(check=>({key:check.key,status:check.status,evidence:check.evidenceReference,checkedAt:check.checkedAt})),versions:view.board.entries.map(entry=>({type:entry.artifactType,id:entry.currentVersion?.id,hash:entry.currentVersion?.snapshotHash,freshness:entry.sourceFreshness,approval:entry.currentVersion?.approvalStatus,partnerApproval:entry.currentVersion?.partnerReviewStatus}))};
 const snapshotHash=createHash("sha256").update(JSON.stringify(reviewedInputs)).digest("hex");
 const {data:rows,error}=await admin.from("rcap_launch_exception_events").select("*").eq("workspace_id",workspace.id);
 if(error)throw new Phase1OnboardingError("persistence_failed","Launch audit source unavailable.");
 const events:LaunchExceptionEvent[]=(rows??[]).map(row=>({id:row.id,kind:row.kind,grantId:row.grant_id,partnerSlug:row.partner_slug,workspaceId:row.workspace_id,checkKey:row.check_key,actorAuthUserId:row.actor_auth_user_id,actorRole:row.actor_role,requestId:row.request_id,reason:row.reason,authorityReference:row.authority_reference,snapshotHash:row.snapshot_hash,createdAt:row.created_at,expiresAt:row.expires_at}));
 const effective=resolveEffectiveReadiness({raw:view.readiness,events,partnerSlug:context.partnerSlug,workspaceId:workspace.id,snapshotHash,now:new Date().toISOString(),policyAuthorized:true});
 const activation=await admin.from("partner_records").select("payment_status,qualification_status,provisioning_status,access_mode").eq("partner_slug",context.partnerSlug).single();
 const target=isDisposableLaunchEnvironment()?await admin.from("rcap_synthetic_launch_targets").select("authority_reference").eq("partner_slug",context.partnerSlug).maybeSingle():{data:null};
 const activationAuthorized=!activation.error && isPartnerActivationAuthorized(activation.data?{paymentStatus:activation.data.payment_status,qualificationStatus:activation.data.qualification_status,provisioningStatus:activation.data.provisioning_status}:null);
 const canLaunch=Boolean(target.data && effective.ready && activationAuthorized && !view.program?.access.conflict);
 return {partnerSlug:context.partnerSlug,workspaceId:workspace.id,workspaceVersion:workspace.aggregate_version,operatorAuthUserId:context.authUserId,asOf:new Date().toISOString(),snapshotHash,readiness:view.readiness,effective,program:view.program,reviewedVersions:reviewedInputs.versions,operationStatus:canLaunch?"prepared" as const:"held" as const,canLaunch,heldReason:!target.data?"Synthetic launch is permitted only for registered disposable loopback targets; live launch is disabled.":!activationAuthorized?"Existing authenticated activation and payment records are required; launch never changes payment.":!effective.ready?"Required approvals or operational checks remain incomplete.":view.program?.access.conflict?"Access sources conflict.":null};
}
