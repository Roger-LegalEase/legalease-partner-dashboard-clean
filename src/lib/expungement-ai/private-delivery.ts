import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

const grantShape = /^[A-Za-z0-9_-]{43}$/;
const grantLifetimeMs = 5 * 60 * 1000;

export type ConsumerArtifactDownloadAuthority = {
  grantId: string;
  storagePath: string;
  expectedSha256: string;
  fileName: string;
  contentType: string;
  renderJobId: string | null;
};

export async function issueConsumerArtifactDownloadGrant(input: {
  userId: string;
  briefcaseItemId: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + grantLifetimeMs).toISOString();
  const { data, error } = await supabase.rpc("issue_consumer_artifact_download_grant", {
    p_consumer_auth_user_id: input.userId,
    p_briefcase_item_id: input.briefcaseItemId,
    p_token_hash: tokenHash(token),
    p_expires_at: expiresAt
  });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.grant_id || typeof row.expires_at !== "string") return null;
  return { token, grantId: String(row.grant_id), expiresAt: row.expires_at };
}

export async function authorizeConsumerArtifactDownload(input: {
  userId: string;
  briefcaseItemId: string;
  token: string;
}): Promise<ConsumerArtifactDownloadAuthority | null> {
  if (!grantShape.test(input.token)) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("authorize_consumer_artifact_download", {
    p_consumer_auth_user_id: input.userId,
    p_briefcase_item_id: input.briefcaseItemId,
    p_token_hash: tokenHash(input.token)
  });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.grant_id
    || typeof row.artifact_storage_path !== "string"
    || !/^[a-f0-9]{64}$/.test(String(row.artifact_sha256 ?? ""))
    || typeof row.file_name !== "string"
    || typeof row.content_type !== "string") return null;
  return {
    grantId: String(row.grant_id),
    storagePath: row.artifact_storage_path,
    expectedSha256: row.artifact_sha256,
    fileName: row.file_name,
    contentType: row.content_type,
    renderJobId: typeof row.render_job_id === "string" ? row.render_job_id : null
  };
}

export function consumerArtifactSha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

