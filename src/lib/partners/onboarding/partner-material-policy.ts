import type { ArtifactBoardEntry } from "./artifact-service";

// Matches the partner-owned reviews enforced by rcap_service_stage_real_launch.
export const PARTNER_LAUNCH_REVIEW_TYPES = [
  "implementation_brief",
  "co_branded_page_configuration"
] as const;

export function requiresPartnerLaunchReview(artifactType: string) {
  return PARTNER_LAUNCH_REVIEW_TYPES.some(type => type === artifactType);
}

export function partnerLaunchMaterialsApproved(entries: ArtifactBoardEntry[]) {
  return PARTNER_LAUNCH_REVIEW_TYPES.every(type => entries.some(entry =>
    entry.artifactType === type && entry.sourceFreshness === "current" &&
    entry.currentVersion?.approvalStatus === "approved" &&
    entry.currentVersion.partnerReviewStatus === "approved"
  ));
}
