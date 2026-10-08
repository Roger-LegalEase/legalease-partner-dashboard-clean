import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { isRcapLaunchStudioEnabled } from "@/lib/partners/onboarding/feature";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import {
  assertSameOrigin, readBoundedMultipartFormData, requireRequestId
} from "@/lib/partners/onboarding/request-security";
import { validateOnboardingAssetFile } from "@/lib/partners/onboarding/asset-security";
import {
  buildOnboardingObjectPath, uploadPrivateOnboardingAsset, deletePrivateOnboardingAsset
} from "@/lib/partners/onboarding/storage";
import { getInternalOnboardingSnapshot } from "@/lib/partners/onboarding/service";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const MAX_MULTIPART_BYTES = 21 * 1024 * 1024;

/**
 * One scoped internal-admin operation: record a reviewed, executed agreement
 * with its signed private document. It cannot sign on the partner's behalf,
 * grant capacity or record payment. The database commits asset + agreement +
 * signed gate + receipt atomically after the private object is uploaded.
 */
export async function POST(request: NextRequest, { params }: {
  params: Promise<{ partnerSlug: string }>
}) {
  let orphanPath: string | null = null;
  try {
    assertSameOrigin(request);
    if (!isRcapLaunchStudioEnabled()) {
      throw new Phase1OnboardingError("feature_disabled", "Launch Studio is unavailable.");
    }
    const context = await requireInternalOnboardingContext((await params).partnerSlug);
    const form = await readBoundedMultipartFormData(request, MAX_MULTIPART_BYTES);
    const requestId = requireRequestId(form.get("requestId"));
    const versionRaw = form.get("expectedWorkspaceVersion");
    const expectedVersion = typeof versionRaw === "string" && /^\d+$/.test(versionRaw)
      ? Number(versionRaw) : NaN;
    const type = form.get("agreementType");
    const effectiveDate = form.get("effectiveDate");
    const reviewReason = form.get("reviewReason");
    const confirmed = form.get("confirmed") === "true";
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1
      || !["order_form", "master_services_agreement"].includes(String(type))
      || typeof effectiveDate !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
      || !Number.isFinite(Date.parse(effectiveDate))
      || Date.parse(effectiveDate) > Date.now()
      || typeof reviewReason !== "string" || reviewReason.trim().length < 10
      || reviewReason.trim().length > 5000 || !confirmed) {
      throw new Phase1OnboardingError("invalid_input",
        "Select the executed agreement type, effective date and inspected signed document, then confirm the review.");
    }
    const file = form.get("file");
    const existing = form.get("existingAssetId");
    if ((file instanceof File && file.size > 0) === (typeof existing === "string" && existing.length > 0)) {
      throw new Phase1OnboardingError("invalid_input",
        "Choose either a signed PDF/DOCX file or an existing approved document, not both.");
    }
    const admin = getSupabaseAdminClient();
    if (!admin) throw new Phase1OnboardingError("persistence_failed", "Private program storage is unavailable.");
    const {data:workspace,error:workspaceError} = await admin.from("partner_onboarding")
      .select("id,partner_record_id,aggregate_version,status").eq("partner_slug",context.partnerSlug).single();
    if(workspaceError || !workspace?.id || !workspace.partner_record_id) {
      throw new Phase1OnboardingError("workspace_not_found", "This partner workspace is unavailable.");
    }

    const prior = await admin.from("rcap_signed_agreement_receipts")
      .select("workspace_id,actor_auth_user_id,agreement_type,asset_id,asset_sha256,effective_date,reviewed_reason,workspace_version")
      .eq("id",requestId).maybeSingle();
    if (prior.error) throw new Phase1OnboardingError("persistence_failed","Signed agreement audit is unavailable.");
    if (prior.data) {
      if (prior.data.workspace_id!==workspace.id || prior.data.actor_auth_user_id!==context.authUserId
        || prior.data.agreement_type!==type || prior.data.effective_date!==effectiveDate
        || prior.data.reviewed_reason!==reviewReason.trim()) {
        throw new Phase1OnboardingError("duplicate_request","This request ID belongs to a different agreement review.");
      }
      const snapshot = await getInternalOnboardingSnapshot(context);
      return onboardingJson({success:true,duplicate:true,workspaceVersion:prior.data.workspace_version,snapshot});
    }

    if (workspace.aggregate_version !== expectedVersion || ["live","paused","closed"].includes(workspace.status)) {
      throw new Phase1OnboardingError("revision_conflict","Program information changed. Reload the agreement review.");
    }

    let assetId:string;
    let sha256:string;
    let objectPath="";
    let filename="";
    let mediaType="";
    let extension="";
    let byteSize=0;
    let newAsset=false;
    if (file instanceof File && file.size > 0) {
      const validated = await validateOnboardingAssetFile(file,"procurement_document");
      assetId = requestId;
      sha256 = createHash("sha256").update(validated.bytes).digest("hex");
      objectPath = buildOnboardingObjectPath({
        partnerId:String(workspace.partner_record_id),workspaceId:String(workspace.id),
        category:"procurement_document",extension:validated.extension,objectId:assetId
      });
      filename=validated.originalFileName;
      mediaType=validated.contentType;
      extension=validated.extension;
      byteSize=validated.sizeBytes;
      await uploadPrivateOnboardingAsset(objectPath,validated);
      orphanPath=objectPath;
      newAsset=true;
    } else {
      assetId=requireRequestId(existing);
      const {data:a,error:aerr}=await admin.from("partner_onboarding_assets")
        .select("id,sha256_hex,original_filename,media_type,file_extension,byte_size,object_path")
        .eq("id",assetId).eq("workspace_id",workspace.id).eq("category","procurement_document")
        .eq("review_status","approved").eq("lifecycle_status","active").is("deleted_at",null)
        .maybeSingle();
      if(aerr||!a?.sha256_hex)throw new Phase1OnboardingError("invalid_input",
        "Select an approved, current procurement document or upload the signed PDF/DOCX.");
      sha256=a.sha256_hex;
      objectPath=a.object_path;
      filename=a.original_filename;
      mediaType=a.media_type;
      extension=a.file_extension;
      byteSize=a.byte_size;
    }

    const {data,error}=await admin.rpc("rcap_service_record_signed_agreement",{
      p_slug:context.partnerSlug,p_actor:context.authUserId,
      p_expected_version:expectedVersion,p_request:requestId,
      p_agreement_type:type,p_asset:assetId,p_new_asset:newAsset,
      p_object_path:objectPath,p_filename:filename,p_media_type:mediaType,
      p_extension:extension,p_byte_size:byteSize,p_sha256:sha256,
      p_effective_date:effectiveDate,p_review_reason:reviewReason.trim(),p_confirmed:true
    });
    if (error) throw new Phase1OnboardingError("invalid_transition",
      "The signed agreement was not recorded. Recheck the file, existing agreement and workspace version.");
    orphanPath=null; // Only committed asset storage is retained.
    const snapshot=await getInternalOnboardingSnapshot(context);
    return onboardingJson({success:true,duplicate:data?.[0]?.duplicate===true,
      workspaceVersion:data?.[0]?.workspace_version,snapshot});
  } catch(error) {
    if(orphanPath) {
      // A failed database transaction cannot make this deterministic private
      // object visible. Cleanup is best effort and never masks the error.
      try{await deletePrivateOnboardingAsset(orphanPath);}catch{/* private orphan remains inaccessible */}
    }
    return onboardingHttpError(error);
  }
}
