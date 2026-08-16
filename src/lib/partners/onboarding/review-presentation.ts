export const DEFAULT_ONBOARDING_REVIEW_DETAIL_MODE = "summary" as const;

export function isOnboardingReviewAuditOpen(
  mode: "summary" | "audit" = DEFAULT_ONBOARDING_REVIEW_DETAIL_MODE
): boolean {
  return mode === "audit";
}

export type PartnerOnboardingRoleSurface =
  | "administrator_editor"
  | "staff_summary";

export function onboardingRoleSurface(
  role: "partner_admin" | "partner_staff"
): PartnerOnboardingRoleSurface {
  return role === "partner_staff" ? "staff_summary" : "administrator_editor";
}
