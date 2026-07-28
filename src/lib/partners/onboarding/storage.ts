import "server-only";

import crypto from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  isOnboardingAssetCategory,
  type OnboardingAssetCategory,
  type ValidatedOnboardingAsset
} from "@/lib/partners/onboarding/asset-security";

export const ONBOARDING_STORAGE_BUCKET = "rcap-partner-onboarding-private";
export const ONBOARDING_SIGNED_URL_TTL_SECONDS = 600;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class OnboardingStorageError extends Error {
  constructor(
    readonly code:
      | "storage_unconfigured"
      | "invalid_identifier"
      | "upload_failed"
      | "delete_failed"
      | "signed_url_failed",
    message: string
  ) {
    super(message);
    this.name = "OnboardingStorageError";
  }
}

export function buildOnboardingObjectPath(input: {
  partnerId: string;
  workspaceId: string;
  category: OnboardingAssetCategory;
  extension: ValidatedOnboardingAsset["extension"];
  objectId?: string;
}): string {
  assertUuid(input.partnerId);
  assertUuid(input.workspaceId);
  const objectId = input.objectId ?? crypto.randomUUID();
  assertUuid(objectId);

  return `partners/${input.partnerId}/onboarding/${input.workspaceId}/${input.category}/${objectId}.${input.extension}`;
}

export async function uploadPrivateOnboardingAsset(
  objectPath: string,
  asset: ValidatedOnboardingAsset
): Promise<void> {
  assertSafeObjectPath(objectPath);
  const client = requireStorageClient();
  const { error } = await client.storage
    .from(ONBOARDING_STORAGE_BUCKET)
    .upload(objectPath, asset.bytes, {
      contentType: asset.contentType,
      cacheControl: "0",
      upsert: false
    });

  if (error) {
    throw new OnboardingStorageError("upload_failed", "The private asset could not be uploaded.");
  }
}

export async function deletePrivateOnboardingAsset(objectPath: string): Promise<void> {
  assertSafeObjectPath(objectPath);
  const client = requireStorageClient();
  const { error } = await client.storage.from(ONBOARDING_STORAGE_BUCKET).remove([objectPath]);

  if (error) {
    throw new OnboardingStorageError("delete_failed", "The private asset could not be removed.");
  }
}

export async function createPrivateOnboardingAssetUrl(input: {
  objectPath: string;
  downloadFileName?: string;
}): Promise<string> {
  assertSafeObjectPath(input.objectPath);
  const client = requireStorageClient();
  const safeDownloadName = input.downloadFileName
    ? input.downloadFileName.replace(/[\u0000-\u001f\u007f"\\/]/g, "_").slice(0, 200)
    : undefined;
  const { data, error } = await client.storage
    .from(ONBOARDING_STORAGE_BUCKET)
    .createSignedUrl(
      input.objectPath,
      ONBOARDING_SIGNED_URL_TTL_SECONDS,
      safeDownloadName ? { download: safeDownloadName } : undefined
    );

  if (error || !data?.signedUrl) {
    throw new OnboardingStorageError("signed_url_failed", "A private download could not be prepared.");
  }
  return data.signedUrl;
}

function requireStorageClient(): NonNullable<ReturnType<typeof getSupabaseAdminClient>> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new OnboardingStorageError(
      "storage_unconfigured",
      "Private onboarding storage is not configured."
    );
  }
  return client;
}

function assertUuid(value: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new OnboardingStorageError("invalid_identifier", "A valid immutable identifier is required.");
  }
}

function assertSafeObjectPath(value: string): void {
  const parts = value.split("/");
  if (
    parts.length !== 6 ||
    parts[0] !== "partners" ||
    !UUID_PATTERN.test(parts[1] ?? "") ||
    parts[2] !== "onboarding" ||
    !UUID_PATTERN.test(parts[3] ?? "") ||
    !isOnboardingAssetCategory(parts[4]) ||
    !/^[0-9a-f-]+\.(?:png|jpg|webp|pdf|docx)$/i.test(parts[5] ?? "") ||
    value.includes("..")
  ) {
    throw new OnboardingStorageError("invalid_identifier", "The private object path is not valid.");
  }
}
