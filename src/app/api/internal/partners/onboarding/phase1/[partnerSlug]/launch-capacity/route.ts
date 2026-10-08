import {createHash} from "node:crypto";
import type {NextRequest} from "next/server";
import {getSupabaseAdminClient} from "@/lib/supabase/server";
import {requireInternalOnboardingContext} from "@/lib/partners/onboarding/auth-context";
import {onboardingHttpError,onboardingJson} from "@/lib/partners/onboarding/http";
import {readBoundedJson,requireRequestId,assertSameOrigin} from "@/lib/partners/onboarding/request-security";
import {Phase1OnboardingError} from "@/lib/partners/onboarding/errors";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Existing allocation records, from the authenticated Studio, with documentary scope. */
export async function POST(request:NextRequest,{params}:{params:Promise<{partnerSlug:string}>}){
 try{
 assertSameOrigin(request);const context=await requireInternalOnboardingContext((await params).partnerSlug);
 const body=await readBoundedJson(request);requireRequestId(body.requestId);
 if(body.confirmed!==true||!Number.isSafeInteger(body.screeningsAllowed)||!Number.isSafeInteger(body.packetCap)||Number(body.screeningsAllowed)<=0||Number(body.packetCap)<=0||String(body.authorityReference??"").trim().length<10)throw new Phase1OnboardingError("invalid_input","Confirm the documented screening and packet allocations.");
 const admin=getSupabaseAdminClient()!;
 const workspace=await admin.from("partner_onboarding").select("id,status,landing_page_ready,aggregate_version,agreement_status").eq("partner_slug",context.partnerSlug).single();
 if(workspace.error||workspace.data.status==="live"||workspace.data.landing_page_ready||workspace.data.agreement_status!=="signed")throw new Phase1OnboardingError("revision_conflict","Capacity preparation requires the current unpublished program and signed agreement.");
 const active=await admin.from("rcap_launch_operation_events").select("operation_id,step").eq("workspace_id",workspace.data.id);
 if(active.error||active.data?.some(e=>e.step==="prepared"&&!active.data.some(t=>t.operation_id===e.operation_id&&["complete","held","failed"].includes(t.step))))throw new Phase1OnboardingError("request_in_progress","Capacity cannot change during a launch operation.");
 const asset=await admin.from("partner_onboarding_assets").select("bucket_id,object_path,sha256_hex").eq("id",String(body.documentId)).eq("workspace_id",workspace.data.id).eq("category","procurement_document").eq("lifecycle_status","active").eq("review_status","approved").single();
 if(asset.error)throw new Phase1OnboardingError("forbidden","Approved partner procurement evidence is required.");
 const stored=await admin.storage.from(asset.data.bucket_id).download(asset.data.object_path);
 if(stored.error||!stored.data||createHash("sha256").update(Buffer.from(await stored.data.arrayBuffer())).digest("hex")!==asset.data.sha256_hex)throw new Phase1OnboardingError("storage_failed","Procurement evidence byte verification failed.");
 const configured=await admin.rpc("rcap_service_configure_launch_capacity",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_document:String(body.documentId),p_hash:asset.data.sha256_hex,p_screenings:body.screeningsAllowed,p_packets:body.packetCap,p_reference:String(body.authorityReference).trim(),p_request:body.requestId,p_version:body.workspaceVersion});
 if(configured.error)throw new Phase1OnboardingError("invalid_transition","Current documented capacity authorization was refused; no publication is permitted.");
 return onboardingJson({success:true});
 }catch(error){return onboardingHttpError(error);}
}
