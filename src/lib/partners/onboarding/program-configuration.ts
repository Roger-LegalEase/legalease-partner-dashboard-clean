import type { OnboardingSectionKey, OnboardingPartnerData } from "./types";

// Ordinary program configuration. Commercial terms, permissions and approvals
// have their own evidence-bearing operations and cannot be written here.
export const PROGRAM_CONFIGURATION_FIELDS: Partial<Record<OnboardingSectionKey, readonly string[]>> = {
  organization_contacts: ["legal_organization_name", "public_organization_name", "public_program_name", "website", "primary_address", "contacts"],
  program_goals: ["participation_mode", "target_population"],
  geography_audience_language_accessibility: ["jurisdictions", "service_area_description", "counties", "primary_language", "enable_spanish"],
  access_sponsorship_capacity: ["participant_access_model"],
  support_referrals_reporting: ["participant_support_email", "referral_arrangement", "contested_matter_procedure"],
  brand_public_page: ["program_headline", "program_subheadline", "approved_organization_description", "primary_cta_label", "participant_support_copy", "program_headline_es", "program_subheadline_es", "approved_organization_description_es", "primary_cta_label_es", "participant_support_copy_es", "service_area_es", "target_audience_es"]
};

export type ProgramPatch = { section: OnboardingSectionKey; values: Record<string, unknown>; base: Record<string, unknown> };
export type ProgramConfiguration = {
  workspaceId: string;
  partnerSlug: string;
  version: number;
  policyVersion: "legacy" | "rcap2.2";
  status: string;
  legalIdentityLocked: boolean;
  data: OnboardingPartnerData;
};
