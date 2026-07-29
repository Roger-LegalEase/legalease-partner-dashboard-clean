import "server-only";

import crypto from "node:crypto";
import type { PartnerOnboardingContext } from "./auth-context";
import {
  isOnboardingAssetCategory,
  validateOnboardingAssetFile,
  type OnboardingAssetCategory
} from "./asset-security";
import { Phase1OnboardingError } from "./errors";
import { getPartnerOnboardingPortal, type OnboardingAssetView } from "./service";
import {
  buildOnboardingObjectPath,
  createPrivateOnboardingAssetUrl,
  deletePrivateOnboardingAsset,
  uploadPrivateOnboardingAsset
} from "./storage";
import { deriveOnboardingSummary } from "./derivations";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type AssetMutationRow = {
  asset_id: string;
  superseded_object_path?: string | null;
  object_path?: string | null;
  workspace_aggregate_version: number;
  duplicate: boolean;
};

type ConfirmedAssetCommit = {
  asset: OnboardingAssetView;
  workspaceVersion: number;
};

export async function uploadPartnerOnboardingAsset(
  context: PartnerOnboardingContext,
  input: {
    category: unknown;
    file: File;
    requestId: string;
    expectedWorkspaceVersion: number;
  }
): Promise<{ asset: OnboardingAssetView; workspaceVersion: number; duplicate: boolean }> {
  if (context.role !== "partner_admin" || !isOnboardingAssetCategory(input.category)) {
    throw new Phase1OnboardingError("forbidden", "Partner administrator access is required.");
  }

  const portal = await getPartnerOnboardingPortal(context);
  if (!portal.canEdit) {
    throw new Phase1OnboardingError(
      portal.workspace.commercialGateStatus === "blocked"
        ? "commercially_blocked"
        : "invalid_transition",
      "Organizational assets cannot be changed in the current setup state."
    );
  }

  let validated;
  try {
    validated = await validateOnboardingAssetFile(input.file, input.category);
  } catch (error) {
    throw new Phase1OnboardingError(
      "invalid_input",
      error instanceof Error ? error.message : "The organizational asset is not valid."
    );
  }

  // The request UUID is also the immutable object UUID. A retry therefore
  // addresses the same private object and cannot create duplicate metadata or
  // an unbounded series of orphan objects.
  const assetId = input.requestId;
  const objectPath = buildOnboardingObjectPath({
    partnerId: portal.workspace.partnerRecordId,
    workspaceId: portal.workspace.id,
    category: input.category,
    extension: validated.extension,
    objectId: assetId
  });
  const sha256Hex = crypto.createHash("sha256").update(validated.bytes).digest("hex");
  const payloadHash = assetPayloadHash({
    workspaceId: portal.workspace.id,
    assetId,
    category: input.category,
    objectPath,
    originalFileName: validated.originalFileName,
    contentType: validated.contentType,
    extension: validated.extension,
    sizeBytes: validated.sizeBytes,
    width: validated.width,
    height: validated.height,
    sha256Hex,
    expectedWorkspaceVersion: input.expectedWorkspaceVersion
  });
  const nextAssetCategories = Array.from(
    new Set([
      ...portal.assets.map((asset) => asset.category),
      input.category
    ])
  );
  const nextDerivation = derivePortalWithAssetCategories(
    portal,
    nextAssetCategories
  );
  const admin = requireAdmin();
  const { data: priorAsset } = await admin
    .from("partner_onboarding_assets")
    .select("id, category, original_filename, media_type, byte_size, width_pixels, height_pixels, sha256_hex, lifecycle_status, review_status, uploaded_at")
    .eq("id", assetId)
    .eq("workspace_id", portal.workspace.id)
    .maybeSingle();
  let prior: {
    id: string;
    category: OnboardingAssetCategory;
    original_filename: string;
    media_type: string;
    byte_size: number;
    width_pixels: number | null;
    height_pixels: number | null;
    sha256_hex: string | null;
    lifecycle_status: string;
    review_status: string;
    uploaded_at: string;
  } | null = null;
  if (priorAsset) {
    prior = priorAsset as {
      id: string;
      category: OnboardingAssetCategory;
      original_filename: string;
      media_type: string;
      byte_size: number;
      width_pixels: number | null;
      height_pixels: number | null;
      sha256_hex: string | null;
      lifecycle_status: string;
      review_status: string;
      uploaded_at: string;
    };
    if (
      prior.category !== input.category ||
      prior.sha256_hex !== sha256Hex
    ) {
      throw new Phase1OnboardingError(
        "duplicate_request",
        "This upload request ID was already used for a different organizational asset."
      );
    }
  } else if (
    input.expectedWorkspaceVersion !== portal.workspace.aggregateVersion
  ) {
    throw new Phase1OnboardingError(
      "revision_conflict",
      "Newer saved information exists.",
      {
        currentWorkspaceVersion: portal.workspace.aggregateVersion
      }
    );
  }

  let uploadedThisAttempt = false;
  if (!prior) {
    try {
      await uploadPrivateOnboardingAsset(objectPath, validated);
      uploadedThisAttempt = true;
    } catch {
      // A previous attempt may have uploaded this deterministic object but
      // failed before metadata persisted. No metadata exists (checked above),
      // so only this task-owned orphan can be removed and retried.
      try {
        await deletePrivateOnboardingAsset(objectPath);
        await uploadPrivateOnboardingAsset(objectPath, validated);
        uploadedThisAttempt = true;
      } catch {
        throw new Phase1OnboardingError(
          "storage_failed",
          "The private organizational asset could not be uploaded."
        );
      }
    }
  }

  try {
    const { data, error } = await admin.rpc("rcap_service_record_onboarding_asset", {
      p_partner_slug: context.partnerSlug,
      p_actor_user_id: context.authUserId,
      p_workspace_id: portal.workspace.id,
      p_asset_id: assetId,
      p_expected_workspace_version: input.expectedWorkspaceVersion,
      p_category: input.category,
      p_object_path: objectPath,
      p_original_filename: validated.originalFileName,
      p_safe_filename: `${input.category}.${validated.extension}`,
      p_media_type: validated.contentType,
      p_file_extension: validated.extension,
      p_byte_size: validated.sizeBytes,
      p_width_pixels: validated.width,
      p_height_pixels: validated.height,
      p_sha256_hex: sha256Hex,
      p_payload_hash: payloadHash,
      p_workspace_completion: nextDerivation.completion.percentage,
      p_blocker_code: nextDerivation.blockerCode,
      p_next_action_code: nextDerivation.nextActionCode,
      p_next_action_owner: nextDerivation.nextActionOwner,
      p_request_id: input.requestId
    });
    if (error) {
      throw assetMutationError(error);
    }
    const row = firstRow(data);
    if (!row) {
      throw new Phase1OnboardingError("persistence_failed", "Asset metadata could not be saved.");
    }

    if (row.superseded_object_path && row.superseded_object_path !== objectPath) {
      try {
        await deletePrivateOnboardingAsset(row.superseded_object_path);
      } catch {
        // The superseded metadata makes this object inaccessible. A later
        // idempotent replacement/delete may safely retry physical cleanup.
      }
    }

    return {
      asset: prior
        ? {
            id: prior.id,
            category: prior.category,
            originalFileName: prior.original_filename,
            mediaType: prior.media_type,
            byteSize: Number(prior.byte_size),
            width: prior.width_pixels,
            height: prior.height_pixels,
            lifecycleStatus: prior.lifecycle_status,
            reviewStatus: prior.review_status,
            uploadedAt: prior.uploaded_at
          }
        : {
            id: assetId,
            category: input.category,
            originalFileName: validated.originalFileName,
            mediaType: validated.contentType,
            byteSize: validated.sizeBytes,
            width: validated.width,
            height: validated.height,
            lifecycleStatus: "pending_review",
            reviewStatus: "pending",
            uploadedAt: new Date().toISOString()
          },
      workspaceVersion: Number(row.workspace_aggregate_version),
      duplicate: row.duplicate === true
    };
  } catch (error) {
    if (uploadedThisAttempt) {
      const confirmation = await confirmCommittedAssetUpload(admin, {
        workspaceId: portal.workspace.id,
        assetId,
        category: input.category,
        objectPath,
        payloadHash,
        requestId: input.requestId,
        sha256Hex
      });
      if (confirmation.kind === "committed") {
        return {
          asset: confirmation.result.asset,
          workspaceVersion: confirmation.result.workspaceVersion,
          duplicate: true
        };
      }
      if (confirmation.kind === "absent") {
        try {
          await deletePrivateOnboardingAsset(objectPath);
        } catch {
          // The transaction is confirmed absent and no metadata row or signed
          // operation can expose this server-generated orphan. Physical cleanup
          // remains best effort so the persistence error is not obscured.
        }
      }
    }
    throw error;
  }
}

export async function deletePartnerOnboardingAsset(
  context: PartnerOnboardingContext,
  input: {
    assetId: string;
    requestId: string;
    expectedWorkspaceVersion: number;
  }
): Promise<{ workspaceVersion: number; duplicate: boolean }> {
  if (context.role !== "partner_admin") {
    throw new Phase1OnboardingError("forbidden", "Partner administrator access is required.");
  }
  const portal = await getPartnerOnboardingPortal(context);
  if (!portal.canEdit) {
    throw new Phase1OnboardingError("invalid_transition", "Assets cannot be changed in the current setup state.");
  }
  const currentAsset = portal.assets.find(
    (asset) => asset.id === input.assetId
  );
  const admin = requireAdmin();
  const { data: persistedAsset, error: persistedAssetError } = await admin
    .from("partner_onboarding_assets")
    .select("id, workspace_id, deleted_at")
    .eq("id", input.assetId)
    .eq("workspace_id", portal.workspace.id)
    .maybeSingle();
  if (persistedAssetError || !persistedAsset) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Organizational asset not found."
    );
  }
  const alreadyDeleted =
    (persistedAsset as { deleted_at?: string | null }).deleted_at != null;
  if (!currentAsset && !alreadyDeleted) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Organizational asset not found."
    );
  }
  if (
    !alreadyDeleted &&
    input.expectedWorkspaceVersion !== portal.workspace.aggregateVersion
  ) {
    throw new Phase1OnboardingError(
      "revision_conflict",
      "Newer saved information exists.",
      {
        currentWorkspaceVersion: portal.workspace.aggregateVersion
      }
    );
  }
  const nextDerivation = derivePortalWithAssetCategories(
    portal,
    portal.assets
      .filter((asset) => asset.id !== input.assetId)
      .map((asset) => asset.category)
  );
  const payloadHash = assetPayloadHash({
    workspaceId: portal.workspace.id,
    assetId: input.assetId,
    expectedWorkspaceVersion: input.expectedWorkspaceVersion,
    operation: "delete"
  });
  const { data, error } = await admin.rpc("rcap_service_delete_onboarding_asset", {
    p_partner_slug: context.partnerSlug,
    p_actor_user_id: context.authUserId,
    p_workspace_id: portal.workspace.id,
    p_asset_id: input.assetId,
    p_expected_workspace_version: input.expectedWorkspaceVersion,
    p_payload_hash: payloadHash,
    p_workspace_completion: nextDerivation.completion.percentage,
    p_blocker_code: nextDerivation.blockerCode,
    p_next_action_code: nextDerivation.nextActionCode,
    p_next_action_owner: nextDerivation.nextActionOwner,
    p_request_id: input.requestId
  });
  if (error) {
    throw assetMutationError(error);
  }
  const row = firstRow(data);
  if (!row?.object_path) {
    throw new Phase1OnboardingError("persistence_failed", "The organizational asset could not be removed.");
  }

  try {
    await deletePrivateOnboardingAsset(row.object_path);
  } catch {
    throw new Phase1OnboardingError(
      "storage_failed",
      "The asset was made inaccessible, but private storage cleanup must be retried."
    );
  }
  return {
    workspaceVersion: Number(row.workspace_aggregate_version),
    duplicate: row.duplicate === true
  };
}

export async function getPartnerOnboardingAssetDownload(
  context: PartnerOnboardingContext,
  assetId: string
): Promise<{ url: string; mediaType: string; fileName: string }> {
  const portal = await getPartnerOnboardingPortal(context);
  const safeAsset = portal.assets.find((asset) => asset.id === assetId);
  if (!safeAsset) {
    throw new Phase1OnboardingError("workspace_not_found", "Organizational asset not found.");
  }

  const admin = requireAdmin();
  const { data, error } = await admin
    .from("partner_onboarding_assets")
    .select("object_path, original_filename, media_type")
    .eq("id", assetId)
    .eq("workspace_id", portal.workspace.id)
    .is("deleted_at", null)
    .in("lifecycle_status", ["pending_review", "active"])
    .maybeSingle();
  if (error || !data) {
    throw new Phase1OnboardingError("workspace_not_found", "Organizational asset not found.");
  }
  const row = data as {
    object_path: string;
    original_filename: string;
    media_type: string;
  };
  const isImage = row.media_type.startsWith("image/");
  const url = await createPrivateOnboardingAssetUrl({
    objectPath: row.object_path,
    downloadFileName: isImage ? undefined : row.original_filename
  });
  return { url, mediaType: row.media_type, fileName: row.original_filename };
}

function assetPayloadHash(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(stableJson(value))
    .digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function assetMutationError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  if (error.code === "40001" || /revision conflict/i.test(message)) {
    return new Phase1OnboardingError(
      "revision_conflict",
      "Newer saved information exists."
    );
  }
  if (error.code === "23505" || /idempotency/i.test(message)) {
    return new Phase1OnboardingError(
      "duplicate_request",
      "This request was already used for different asset data."
    );
  }
  if (error.code === "42501") {
    return new Phase1OnboardingError(
      "forbidden",
      "This account cannot change the onboarding workspace."
    );
  }
  return new Phase1OnboardingError(
    "persistence_failed",
    "The organizational asset change could not be saved."
  );
}

function requireAdmin() {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Phase1OnboardingError("persistence_failed", "Onboarding persistence is not configured.");
  }
  return admin;
}

function firstRow(data: unknown): AssetMutationRow | null {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === "object" ? (value as AssetMutationRow) : null;
}

async function confirmCommittedAssetUpload(
  admin: ReturnType<typeof requireAdmin>,
  input: {
    workspaceId: string;
    assetId: string;
    category: OnboardingAssetCategory;
    objectPath: string;
    payloadHash: string;
    requestId: string;
    sha256Hex: string;
  }
): Promise<
  | { kind: "committed"; result: ConfirmedAssetCommit }
  | { kind: "absent" }
  | { kind: "unknown" }
> {
  const { data: idempotency, error: idempotencyError } = await admin
    .from("partner_onboarding_idempotency")
    .select(
      "workspace_id, operation_key, payload_hash, result_status, result_workspace_version"
    )
    .eq("request_id", input.requestId)
    .maybeSingle();
  if (idempotencyError) return { kind: "unknown" };
  if (!idempotency) return { kind: "absent" };

  const request = idempotency as {
    workspace_id: string;
    operation_key: string;
    payload_hash: string;
    result_status: string;
    result_workspace_version: number | null;
  };
  if (
    request.workspace_id !== input.workspaceId ||
    request.operation_key !== `asset:record:${input.category}` ||
    request.payload_hash !== input.payloadHash
  ) {
    return { kind: "unknown" };
  }
  if (
    request.result_status !== "succeeded" ||
    request.result_workspace_version === null
  ) {
    return { kind: "unknown" };
  }

  const { data: asset, error: assetError } = await admin
    .from("partner_onboarding_assets")
    .select(
      "id, category, object_path, original_filename, media_type, byte_size, width_pixels, height_pixels, sha256_hex, lifecycle_status, review_status, uploaded_at"
    )
    .eq("id", input.assetId)
    .eq("workspace_id", input.workspaceId)
    .eq("object_path", input.objectPath)
    .eq("sha256_hex", input.sha256Hex)
    .is("deleted_at", null)
    .maybeSingle();
  if (assetError || !asset) return { kind: "unknown" };

  const row = asset as {
    id: string;
    category: OnboardingAssetCategory;
    original_filename: string;
    media_type: string;
    byte_size: number;
    width_pixels: number | null;
    height_pixels: number | null;
    lifecycle_status: string;
    review_status: string;
    uploaded_at: string;
  };
  if (row.category !== input.category) return { kind: "unknown" };

  return {
    kind: "committed",
    result: {
      asset: {
        id: row.id,
        category: row.category,
        originalFileName: row.original_filename,
        mediaType: row.media_type,
        byteSize: Number(row.byte_size),
        width: row.width_pixels,
        height: row.height_pixels,
        lifecycleStatus: row.lifecycle_status,
        reviewStatus: row.review_status,
        uploadedAt: row.uploaded_at
      },
      workspaceVersion: Number(request.result_workspace_version)
    }
  };
}

export function parseOnboardingAssetCategory(value: unknown): OnboardingAssetCategory {
  if (!isOnboardingAssetCategory(value)) {
    throw new Phase1OnboardingError("invalid_input", "Choose a supported organizational asset category.");
  }
  return value;
}

function derivePortalWithAssetCategories(
  portal: Awaited<ReturnType<typeof getPartnerOnboardingPortal>>,
  presentAssetCategories: OnboardingAssetCategory[]
) {
  return deriveOnboardingSummary(portal.data, {
    workspaceStatus: portal.workspace.status,
    commercialGateOutcome: portal.workspace.commercialGateStatus,
    sectionStatuses: Object.fromEntries(
      portal.sections.map((section) => [section.key, section.status])
    ),
    presentAssetCategories,
    unresolvedChangeRequests: portal.sections.flatMap((section) =>
      section.changeRequestStatus
        ? [
            {
              sectionKey: section.key,
              status: section.changeRequestStatus
            }
          ]
        : []
    ),
    procurementRequired: portal.procurementRequired,
    recordShieldInScope: portal.recordShieldInScope,
    overageApprovalRequired: portal.overageApprovalRequired
  });
}
