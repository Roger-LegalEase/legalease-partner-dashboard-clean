import {createHash} from "node:crypto";
import type {NextRequest} from "next/server";
import {getSupabaseAdminClient} from "@/lib/supabase/server";
import {requireInternalOnboardingContext} from "@/lib/partners/onboarding/auth-context";
import {onboardingHttpError,onboardingJson} from "@/lib/partners/onboarding/http";
import {readBoundedJson,requireRequestId,assertSameOrigin} from "@/lib/partners/onboarding/request-security";
import {Phase1OnboardingError} from "@/lib/partners/onboarding/errors";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{partnerSlug:string}>}){
 try{
 assertSameOrigin(request);const context=await requireInternalOnboardingContext((await params).partnerSlug);
 const body=await readBoundedJson(request),requestId=requireRequestId(body.requestId);
 if(!["verified_paid","sponsored","purchase_order"].includes(String(body.kind))||body.confirmed!==true||String(body.authorityReference??"").trim().length<10||!Number.isSafeInteger(body.workspaceVersion))throw new Phase1OnboardingError("invalid_input","Confirm documented contractual authority and approved access reconciliation.");
 const admin=getSupabaseAdminClient()!;
 const workspace=await admin.from("partner_onboarding").select("id").eq("partner_slug",context.partnerSlug).single();
 const asset=await admin.from("partner_onboarding_assets").select("id,bucket_id,object_path,sha256_hex").eq("id",String(body.documentId)).eq("workspace_id",workspace.data?.id??"").eq("category","procurement_document").eq("lifecycle_status","active").eq("review_status","approved").single();
 if(workspace.error||asset.error)throw new Phase1OnboardingError("forbidden","Approved partner-owned procurement document required.");
 const stored=await admin.storage.from(asset.data.bucket_id).download(asset.data.object_path);
 if(stored.error||!stored.data||createHash("sha256").update(Buffer.from(await stored.data.arrayBuffer())).digest("hex")!==asset.data.sha256_hex)throw new Phase1OnboardingError("storage_failed","Procurement document byte verification failed.");
 const result=await admin.rpc("rcap_service_record_commercial_authority",{p_slug:context.partnerSlug,p_actor:context.authUserId,p_kind:body.kind,p_document:asset.data.id,p_hash:asset.data.sha256_hex,p_reference:String(body.authorityReference).trim(),p_expires:body.expiresAt,p_packet:body.packetEntitlementId,p_request:requestId,p_version:body.workspaceVersion,p_reconcile:true});
 if(result.error)throw new Phase1OnboardingError("commercially_blocked","Documented authority, current agreement, allocation, or source reconciliation was refused.");
 return onboardingJson({success:true,authorizationId:result.data});
 }catch(error){return onboardingHttpError(error);}
}
