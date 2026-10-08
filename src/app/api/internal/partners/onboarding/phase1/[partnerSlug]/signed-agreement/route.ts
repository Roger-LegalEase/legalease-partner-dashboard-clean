import "server-only";
import { createHash, randomUUID } from "node:crypto";
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
  ONBOARDING_STORAGE_BUCKET, buildOnboardingObjectPath, uploadPrivateOnboardingAsset, deletePrivateOnboardingAsset
} from "@/lib/partners/onboarding/storage";
import { getInternalOnboardingSnapshot } from "@/lib/partners/onboarding/service";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 64 * 1024;

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
  let commitAttempted = false;
  let transactionRejected = false;
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
      || new Date(effectiveDate).toISOString().slice(0, 10) !== effectiveDate
      || Date.parse(effectiveDate) > Date.now()
      || typeof reviewReason !== "string" || reviewReason.trim().length < 10
      || reviewReason.trim().length > 5000 || !confirmed) {
      throw new Phase1OnboardingError("invalid_input",
        "Select the executed agreement type, effective date and inspected signed document, then confirm the review.");
    }
    const file = form.get("file");
    const existing = form.get("existingAssetId");
    if (file instanceof File && file.size > MAX_FILE_BYTES) {
      throw new Phase1OnboardingError("invalid_input", "Upload a signed PDF/DOCX of at most 4 MB, or select an existing approved document.");
    }
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

    const confirmedSnapshot = async () => {
      const { data: agreement, error: rereadError } = await admin
        .from("partner_onboarding_agreements")
        .select("status,signed_receipt_id")
        .eq("workspace_id", workspace.id).eq("agreement_type", type).single();
      if (rereadError) throw new Phase1OnboardingError("persistence_failed", "Agreement confirmation could not be reread. Retry the unchanged request.");
      if (agreement?.status !== "executed" || agreement.signed_receipt_id !== requestId) {
        throw new Phase1OnboardingError("revision_conflict", "This agreement review has been superseded. Reload the current evidence.");
      }
      return getInternalOnboardingSnapshot(context);
    };

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
      // A retried request can only confirm the exact previously reviewed bytes.
      // Reusing a UUID with a different document must not report a false save.
      if (file instanceof File && file.size > 0) {
        const validated = await validateOnboardingAssetFile(file,"procurement_document");
        const digest = createHash("sha256").update(validated.bytes).digest("hex");
        if (digest !== prior.data.asset_sha256) {
          throw new Phase1OnboardingError("duplicate_request",
            "This signed-agreement request ID was already used for different document contents.");
        }
      } else if (prior.data.asset_id !== existing) {
        throw new Phase1OnboardingError("duplicate_request",
          "This signed-agreement request ID belongs to another document.");
      }
      const snapshot = await confirmedSnapshot();
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
      assetId = randomUUID();
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
      const { data: privateCopy, error: downloadError } = await admin.storage
        .from(ONBOARDING_STORAGE_BUCKET).download(a.object_path);
      if (downloadError || !privateCopy) {
        throw new Phase1OnboardingError("invalid_input", "The approved document's private copy is unavailable.");
      }
      const validated = await validateOnboardingAssetFile(
        new File([privateCopy], a.original_filename, { type: a.media_type }), "procurement_document"
      );
      const actualHash = createHash("sha256").update(validated.bytes).digest("hex");
      if (actualHash !== a.sha256_hex || validated.sizeBytes !== a.byte_size
        || validated.contentType !== a.media_type || validated.extension !== a.file_extension) {
        throw new Phase1OnboardingError("invalid_input", "The private document does not match its recorded identity.");
      }
      sha256=actualHash;
      objectPath=a.object_path;
      filename=a.original_filename;
      mediaType=a.media_type;
      extension=a.file_extension;
      byteSize=a.byte_size;
    }

    commitAttempted = true;
    const {data,error}=await admin.rpc("rcap_service_record_signed_agreement",{
      p_slug:context.partnerSlug,p_actor:context.authUserId,
      p_expected_version:expectedVersion,p_request:requestId,
      p_agreement_type:type,p_asset:assetId,p_new_asset:newAsset,
      p_object_path:objectPath,p_filename:filename,p_media_type:mediaType,
      p_extension:extension,p_byte_size:byteSize,p_sha256:sha256,
      p_effective_date:effectiveDate,p_review_reason:reviewReason.trim(),p_confirmed:true
    });
    if (error) {
      transactionRejected = ["22023", "42501", "40001", "23505", "23514", "55000"].includes(error.code);
      throw new Phase1OnboardingError("invalid_transition",
      "Agreement confirmation was interrupted or refused. Retry the unchanged form to reconcile its request ID.");
    }
    if (newAsset && data?.[0]?.duplicate === true && orphanPath) {
      // This attempt owns a unique object; an idempotent replay did not attach it.
      try { await deletePrivateOnboardingAsset(orphanPath); } catch { /* private orphan */ }
    }
    orphanPath=null; // Only committed asset storage is retained.
    const snapshot=await confirmedSnapshot();
    return onboardingJson({success:true,duplicate:data?.[0]?.duplicate===true,
      workspaceVersion:data?.[0]?.workspace_version,snapshot});
  } catch(error) {
    if(orphanPath && (!commitAttempted || transactionRejected)) {
      // Only a positively rejected transaction can be cleaned up. A timeout
      // may follow a committed transaction: preserve its private document.
      try{await deletePrivateOnboardingAsset(orphanPath);}catch{/* private orphan remains inaccessible */}
    }
    return onboardingHttpError(error);
  }
}
