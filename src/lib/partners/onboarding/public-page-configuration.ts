import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getAuthoritativelyPublicPartnerRecord } from "@/lib/partners/public-partner-page";
import { loadArtifactSourceInput } from "./artifact-service";
import { ARTIFACT_GENERATOR_VERSIONS, detectArtifactDrift, projectArtifactSource } from "./artifact-domain";
import type { CoBrandedPagePreview, RenderedDocument } from "./artifact-generator";
import { isRcapLaunchStudioEnabled } from "./feature";

/** Only assets actually selected for the approved public composition are public. */
export function visiblePublicPageAssetIds(preview: Pick<CoBrandedPagePreview, "logo" | "heroImage" | "showPartnerLogo">): string[] {
  return [...new Set([
    preview.showPartnerLogo ? preview.logo.assetId : null,
    preview.heroImage.assetId
  ].filter((id): id is string => Boolean(id)))];
}

/** Public reads require activation, publication and the exact current approvals. */
export async function getApprovedPublicPageConfiguration(partnerSlug: string) {
  if (!isRcapLaunchStudioEnabled()) return null;
  const partner = await getAuthoritativelyPublicPartnerRecord(partnerSlug);
  if (!partner) return null;
  const admin = getSupabaseAdminClient();
  if (!admin) return null;
  try {
    const source = await loadArtifactSourceInput(admin, partner.partnerSlug);
    const access = source.data.access_sponsorship_capacity?.participant_access_model;
    if (!access || access !== source.partnerRecord.accessMode) return null;
    const artifact = await admin.from("partner_onboarding_artifacts").select("current_version_id")
      .eq("workspace_id", source.workspace.id).eq("artifact_type", "co_branded_page_configuration").maybeSingle();
    if (artifact.error || !artifact.data?.current_version_id) return null;
    const version = await admin.from("partner_onboarding_artifact_versions")
      .select("rendered_content, normalized_snapshot, generator_version, generation_status, approval_status, partner_review_status, superseded_at, source_drift_invalidated_at")
      .eq("id", artifact.data.current_version_id).eq("workspace_id", source.workspace.id).maybeSingle();
    const row = version.data;
    if (version.error || !row || row.generation_status !== "succeeded" || row.approval_status !== "approved" || row.partner_review_status !== "approved" || row.superseded_at || row.source_drift_invalidated_at) return null;
    const drift = detectArtifactDrift({ storedSnapshot: row.normalized_snapshot,
      storedGeneratorVersion: row.generator_version,
      current: projectArtifactSource("co_branded_page_configuration", source),
      currentGeneratorVersion: ARTIFACT_GENERATOR_VERSIONS.co_branded_page_configuration });
    if (drift.stale) return null;
    const document = row.rendered_content as RenderedDocument;
    if (!document?.pagePreview || document.pagePreview.missing.length) return null;
    if (visiblePublicPageAssetIds(document.pagePreview).some(id => !source.assets.some(asset => asset.id === id && asset.lifecycleStatus === "active" && asset.reviewStatus === "approved"))) return null;
    return { preview: document.pagePreview, workspaceId: source.workspace.id, partnerSlug: partner.partnerSlug };
  } catch { return null; }
}
