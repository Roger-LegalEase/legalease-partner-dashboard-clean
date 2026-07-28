import type {
  AccessCodeStructure,
  DashboardSpecialPermission,
  OnboardingArtifactConsumer,
  OnboardingContactRole,
  OnboardingFieldDefinition,
  OnboardingSectionKey,
  OrganizationType,
  OrganizationalAssetDefinition,
  OutOfAreaPolicy,
  ParticipantAccessModel,
  ProgramModel,
  RequestedDashboardRole
} from "./types";

export const ONBOARDING_SCHEMA_VERSION = "rcap_partner_onboarding_phase_1_v1";

export const ONBOARDING_FIELD_LIMITS = {
  nameOrTitle: 120,
  organizationOrProgramName: 200,
  email: 254,
  phone: 32,
  url: 2_048,
  shortText: 500,
  longText: 5_000,
  arrayRows: 100
} as const;

export const ONBOARDING_SECTION_ORDER = [
  "organization_contacts",
  "program_goals",
  "geography_audience_language_accessibility",
  "access_sponsorship_capacity",
  "brand_public_page",
  "staff_dashboard_plan",
  "support_referrals_reporting",
  "review_authorization"
] as const satisfies readonly OnboardingSectionKey[];

export const ONBOARDING_SECTION_DEFINITIONS = [
  {
    key: "organization_contacts",
    number: 1,
    label: "Organization and contacts",
    purpose: "Tell us who the program represents and who will help make it successful."
  },
  {
    key: "program_goals",
    number: 2,
    label: "Program goals",
    purpose: "Define the program’s goals, audience, timing, and expected reach."
  },
  {
    key: "geography_audience_language_accessibility",
    number: 3,
    label: "Geography, audience, language, and accessibility",
    purpose: "Describe where and how the participant program should serve your community."
  },
  {
    key: "access_sponsorship_capacity",
    number: 4,
    label: "Access, sponsorship, and capacity plan",
    purpose: "Plan participant access while keeping contract and billing terms read-only."
  },
  {
    key: "brand_public_page",
    number: 5,
    label: "Brand and public-page content",
    purpose: "Provide approved plain-language copy and organizational brand materials."
  },
  {
    key: "staff_dashboard_plan",
    number: 6,
    label: "Staff and dashboard plan",
    purpose: "Plan dashboard access without creating memberships or sending invitations."
  },
  {
    key: "support_referrals_reporting",
    number: 7,
    label: "Support, legal referrals, and reporting",
    purpose: "Set the support, escalation, legal-referral, and reporting operating plan."
  },
  {
    key: "review_authorization",
    number: 8,
    label: "Review and authorization",
    purpose: "Confirm the package is accurate and authorized for implementation review."
  }
] as const;

export const ORGANIZATION_TYPES = [
  "nonprofit",
  "government",
  "legal_services",
  "workforce",
  "faith_based",
  "other"
] as const satisfies readonly OrganizationType[];

export const CONTACT_ROLES = [
  "executive_sponsor",
  "program_operator",
  "communications_lead",
  "reporting_evaluation_lead",
  "legal_services_referral_contact",
  "finance_procurement_contact",
  "technical_security_contact"
] as const satisfies readonly OnboardingContactRole[];

export const PROGRAM_MODELS = [
  "year_round",
  "clinic",
  "event",
  "campaign",
  "referral_only",
  "cohort"
] as const satisfies readonly ProgramModel[];

export const OUT_OF_AREA_POLICIES = [
  "allowed",
  "redirected",
  "case_by_case"
] as const satisfies readonly OutOfAreaPolicy[];

export const PARTICIPANT_ACCESS_MODELS = [
  "open",
  "optional_code",
  "required_code",
  "invite_only"
] as const satisfies readonly ParticipantAccessModel[];

export const ACCESS_CODE_STRUCTURES = [
  "shared",
  "limited_use",
  "single_use",
  "mixed"
] as const satisfies readonly AccessCodeStructure[];

export const REQUESTED_DASHBOARD_ROLES = [
  "partner_administrator",
  "program_staff",
  "reporting_viewer"
] as const satisfies readonly RequestedDashboardRole[];

export const DASHBOARD_SPECIAL_PERMISSIONS = [
  "manage_codes",
  "view_reports",
  "export_reports",
  "manage_users"
] as const satisfies readonly DashboardSpecialPermission[];

export const LEGALEASE_CONTROLLED_PUBLIC_PAGE_CONTENT = [
  "legal_disclaimers",
  "self_help_and_service_boundary_language",
  "eligibility_and_outcome_claims",
  "platform_privacy_and_security_representations",
  "payment_logic",
  "participant_routing",
  "platform_legal_links"
] as const;

const ORDER_AND_IMPLEMENTATION = [
  "order_form",
  "implementation_brief"
] as const satisfies readonly OnboardingArtifactConsumer[];

const OPERATIONS_AND_LAUNCH = [
  "implementation_brief",
  "operations_plan",
  "launch_readiness"
] as const satisfies readonly OnboardingArtifactConsumer[];

const PUBLIC_PAGE = [
  "implementation_brief",
  "launch_kit",
  "public_partner_page"
] as const satisfies readonly OnboardingArtifactConsumer[];

const DASHBOARD_PLAN = [
  "operations_plan",
  "dashboard_user_matrix",
  "launch_readiness",
  "staff_quick_start"
] as const satisfies readonly OnboardingArtifactConsumer[];

const REPORTING = [
  "operations_plan",
  "launch_readiness",
  "reporting_package"
] as const satisfies readonly OnboardingArtifactConsumer[];

function defineField(
  definition: OnboardingFieldDefinition
): OnboardingFieldDefinition {
  return definition;
}

export const ONBOARDING_SCHEMA_REGISTRY = [
  defineField({
    key: "legal_organization_name",
    dataKey: "legal_organization_name",
    sectionKey: "organization_contacts",
    dataType: "string",
    label: "Legal organization name",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.organizationOrProgramName,
    normalization: "single_line",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ORDER_AND_IMPLEMENTATION
  }),
  defineField({
    key: "public_organization_name",
    dataKey: "public_organization_name",
    sectionKey: "organization_contacts",
    dataType: "string",
    label: "Public organization name",
    helperCopy: "This is the organization name participants will see.",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.organizationOrProgramName,
    normalization: "single_line",
    sensitivity: "public",
    completionWeight: 1,
    consumers: [
      "implementation_brief",
      "operations_plan",
      "launch_readiness",
      "staff_quick_start",
      "launch_kit",
      "reporting_package",
      "public_partner_page"
    ]
  }),
  defineField({
    key: "organization_type",
    dataKey: "organization_type",
    sectionKey: "organization_contacts",
    dataType: "enum",
    label: "Organization type",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "public",
    completionWeight: 1,
    consumers: OPERATIONS_AND_LAUNCH,
    enumValues: ORGANIZATION_TYPES
  }),
  defineField({
    key: "website",
    dataKey: "website",
    sectionKey: "organization_contacts",
    dataType: "url",
    label: "Organization website",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.url,
    normalization: "url",
    sensitivity: "public",
    completionWeight: 1,
    consumers: PUBLIC_PAGE
  }),
  defineField({
    key: "primary_address",
    dataKey: "primary_address",
    sectionKey: "organization_contacts",
    dataType: "long_text",
    label: "Primary address",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ORDER_AND_IMPLEMENTATION
  }),
  defineField({
    key: "main_phone",
    dataKey: "main_phone",
    sectionKey: "organization_contacts",
    dataType: "phone",
    label: "Main phone",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.phone,
    normalization: "phone",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "staff_quick_start", "public_partner_page"]
  }),
  defineField({
    key: "public_program_name",
    dataKey: "public_program_name",
    sectionKey: "organization_contacts",
    dataType: "string",
    label: "Public program name",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.organizationOrProgramName,
    normalization: "single_line",
    sensitivity: "public",
    completionWeight: 1,
    consumers: [
      "implementation_brief",
      "operations_plan",
      "launch_readiness",
      "staff_quick_start",
      "launch_kit",
      "reporting_package",
      "public_partner_page"
    ]
  }),
  defineField({
    key: "partner_slug_preference",
    dataKey: "partner_slug_preference",
    sectionKey: "organization_contacts",
    dataType: "string",
    label: "Preferred public-page address",
    helperCopy:
      "This is a preference only. It does not change your current partner or public-page address.",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "trim",
    sensitivity: "public",
    completionWeight: 0,
    consumers: ["launch_readiness", "public_partner_page"]
  }),
  defineField({
    key: "contacts",
    dataKey: "contacts",
    sectionKey: "organization_contacts",
    dataType: "contact_collection",
    label: "Program contacts",
    helperCopy:
      "A person may hold more than one role. Use a separate row for each role; the same email may be reused across different roles.",
    ownership: "partner_editable",
    requirement: "required",
    minCount: 1,
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    normalization: "none",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: [
      "order_form",
      "implementation_brief",
      "operations_plan",
      "launch_readiness",
      "staff_quick_start",
      "reporting_package"
    ]
  }),
  defineField({
    key: "contacts[].stable_row_id",
    dataKey: "stable_row_id",
    sectionKey: "organization_contacts",
    dataType: "string",
    label: "Contact record ID",
    ownership: "system_derived",
    requirement: "required",
    maxLength: 36,
    normalization: "trim",
    sensitivity: "system",
    completionWeight: 0,
    consumers: ["implementation_brief", "operations_plan", "dashboard_user_matrix"],
    parentCollection: "contacts"
  }),
  defineField({
    key: "contacts[].role",
    dataKey: "role",
    sectionKey: "organization_contacts",
    dataType: "enum",
    label: "Contact role",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: OPERATIONS_AND_LAUNCH,
    enumValues: CONTACT_ROLES,
    parentCollection: "contacts"
  }),
  defineField({
    key: "contacts[].name",
    dataKey: "name",
    sectionKey: "organization_contacts",
    dataType: "string",
    label: "Contact name",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: OPERATIONS_AND_LAUNCH,
    parentCollection: "contacts"
  }),
  defineField({
    key: "contacts[].title",
    dataKey: "title",
    sectionKey: "organization_contacts",
    dataType: "string",
    label: "Contact title",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: OPERATIONS_AND_LAUNCH,
    parentCollection: "contacts"
  }),
  defineField({
    key: "contacts[].organization",
    dataKey: "organization",
    sectionKey: "organization_contacts",
    dataType: "string",
    label: "Contact organization",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.organizationOrProgramName,
    normalization: "single_line",
    sensitivity: "personal_contact",
    completionWeight: 0,
    consumers: OPERATIONS_AND_LAUNCH,
    parentCollection: "contacts"
  }),
  defineField({
    key: "contacts[].work_email",
    dataKey: "work_email",
    sectionKey: "organization_contacts",
    dataType: "email",
    label: "Work email",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.email,
    normalization: "email_lowercase",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: OPERATIONS_AND_LAUNCH,
    parentCollection: "contacts"
  }),
  defineField({
    key: "contacts[].phone",
    dataKey: "phone",
    sectionKey: "organization_contacts",
    dataType: "phone",
    label: "Contact phone",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.phone,
    normalization: "phone",
    sensitivity: "personal_contact",
    completionWeight: 0,
    consumers: OPERATIONS_AND_LAUNCH,
    parentCollection: "contacts"
  }),

  defineField({
    key: "primary_goal",
    dataKey: "primary_goal",
    sectionKey: "program_goals",
    dataType: "long_text",
    label: "Primary program goal",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: OPERATIONS_AND_LAUNCH
  }),
  defineField({
    key: "definition_of_success",
    dataKey: "definition_of_success",
    sectionKey: "program_goals",
    dataType: "long_text",
    label: "Definition of success",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "reporting_package"]
  }),
  defineField({
    key: "target_population",
    dataKey: "target_population",
    sectionKey: "program_goals",
    dataType: "long_text",
    label: "Target population",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_kit", "reporting_package", "public_partner_page"]
  }),
  defineField({
    key: "expected_screening_volume",
    dataKey: "expected_screening_volume",
    sectionKey: "program_goals",
    dataType: "integer",
    label: "Expected screening volume",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["order_form", "implementation_brief", "operations_plan", "launch_readiness", "reporting_package"]
  }),
  defineField({
    key: "expected_screening_period",
    dataKey: "expected_screening_period",
    sectionKey: "program_goals",
    dataType: "string",
    label: "Screening volume period",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["order_form", "implementation_brief", "operations_plan", "reporting_package"]
  }),
  defineField({
    key: "expected_packet_volume",
    dataKey: "expected_packet_volume",
    sectionKey: "program_goals",
    dataType: "integer",
    label: "Expected packet volume",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["order_form", "implementation_brief", "operations_plan", "launch_readiness", "reporting_package"]
  }),
  defineField({
    key: "expected_packet_period",
    dataKey: "expected_packet_period",
    sectionKey: "program_goals",
    dataType: "string",
    label: "Packet volume period",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["order_form", "implementation_brief", "operations_plan", "reporting_package"]
  }),
  defineField({
    key: "program_model",
    dataKey: "program_model",
    sectionKey: "program_goals",
    dataType: "enum",
    label: "Program model",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "launch_kit"],
    enumValues: PROGRAM_MODELS
  }),
  defineField({
    key: "program_start_date",
    dataKey: "program_start_date",
    sectionKey: "program_goals",
    dataType: "date",
    label: "Program start date",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "date_only",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "launch_kit", "reporting_package"]
  }),
  defineField({
    key: "program_end_date",
    dataKey: "program_end_date",
    sectionKey: "program_goals",
    dataType: "date",
    label: "Program end date",
    ownership: "partner_editable",
    requirement: "conditional",
    requiredWhen: "program_has_fixed_end",
    activeWhen: "program_has_fixed_end",
    normalization: "date_only",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "launch_kit", "reporting_package"]
  }),
  defineField({
    key: "ongoing",
    dataKey: "ongoing",
    sectionKey: "program_goals",
    dataType: "boolean",
    label: "This is an ongoing program",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "reporting_package"]
  }),
  defineField({
    key: "outreach_channels",
    dataKey: "outreach_channels",
    sectionKey: "program_goals",
    dataType: "string_array",
    label: "Outreach channels",
    ownership: "partner_editable",
    requirement: "required",
    minCount: 1,
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "dedupe_preserve_order",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_kit"]
  }),
  defineField({
    key: "current_workflow",
    dataKey: "current_workflow",
    sectionKey: "program_goals",
    dataType: "long_text",
    label: "Current workflow",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan"]
  }),
  defineField({
    key: "known_barriers",
    dataKey: "known_barriers",
    sectionKey: "program_goals",
    dataType: "string_array",
    label: "Known barriers",
    helperCopy: "Choose any known barriers, or save an empty list when none are known.",
    ownership: "partner_editable",
    requirement: "required",
    minCount: 0,
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "dedupe_preserve_order",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: OPERATIONS_AND_LAUNCH
  }),
  defineField({
    key: "known_barriers_other",
    dataKey: "known_barriers_other",
    sectionKey: "program_goals",
    dataType: "long_text",
    label: "Other known barrier",
    ownership: "partner_editable",
    requirement: "conditional",
    requiredWhen: "known_barriers_include_other",
    activeWhen: "known_barriers_include_other",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: OPERATIONS_AND_LAUNCH
  }),
  defineField({
    key: "partner_side_outcome_tracking",
    dataKey: "partner_side_outcome_tracking",
    sectionKey: "program_goals",
    dataType: "long_text",
    label: "Partner-side outcome tracking",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: REPORTING
  }),

  defineField({
    key: "jurisdictions",
    dataKey: "jurisdictions",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "string_array",
    label: "Jurisdictions",
    ownership: "partner_editable",
    requirement: "required",
    minCount: 1,
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "dedupe_preserve_order",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["order_form", "implementation_brief", "operations_plan", "launch_readiness", "launch_kit", "reporting_package", "public_partner_page"]
  }),
  defineField({
    key: "service_area_description",
    dataKey: "service_area_description",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "long_text",
    label: "Service area description",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_kit", "reporting_package", "public_partner_page"]
  }),
  defineField({
    key: "counties",
    dataKey: "counties",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "string_array",
    label: "Counties",
    helperCopy: "County selection configures routing and reporting; it is not an eligibility promise.",
    ownership: "partner_editable",
    requirement: "optional",
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "dedupe_preserve_order",
    sensitivity: "public",
    completionWeight: 0,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "reporting_package", "public_partner_page"]
  }),
  defineField({
    key: "default_county",
    dataKey: "default_county",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "string",
    label: "Default county",
    ownership: "partner_editable",
    requirement: "optional",
    activeWhen: "counties_are_configured",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "public",
    completionWeight: 0,
    consumers: ["operations_plan", "launch_readiness", "public_partner_page"]
  }),
  defineField({
    key: "out_of_area_policy",
    dataKey: "out_of_area_policy",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "enum",
    label: "Out-of-area policy",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["operations_plan", "launch_readiness", "staff_quick_start", "public_partner_page"],
    enumValues: OUT_OF_AREA_POLICIES
  }),
  defineField({
    key: "primary_language",
    dataKey: "primary_language",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "string",
    label: "Primary participant language",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "enable_spanish",
    dataKey: "enable_spanish",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "boolean",
    label: "Enable Spanish participant experience",
    helperCopy: "This configures the participant program; it does not change the partner portal language.",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "additional_languages",
    dataKey: "additional_languages",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "string_array",
    label: "Additional languages",
    ownership: "partner_editable",
    requirement: "optional",
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "dedupe_preserve_order",
    sensitivity: "public",
    completionWeight: 0,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "accessibility_accommodations",
    dataKey: "accessibility_accommodations",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "long_text",
    label: "Accessibility accommodations",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "staff_quick_start", "launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "community_specific_terminology",
    dataKey: "community_specific_terminology",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "long_text",
    label: "Community-specific terminology",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "public",
    completionWeight: 0,
    consumers: ["implementation_brief", "operations_plan", "launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "population_restrictions",
    dataKey: "population_restrictions",
    sectionKey: "geography_audience_language_accessibility",
    dataType: "long_text",
    label: "Population restrictions",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["order_form", "implementation_brief", "operations_plan", "launch_readiness", "staff_quick_start", "public_partner_page"]
  }),

  defineField({
    key: "participant_access_model",
    dataKey: "participant_access_model",
    sectionKey: "access_sponsorship_capacity",
    dataType: "enum",
    label: "Participant access model",
    helperCopy: "This records the implementation plan only. It does not create or release access codes.",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["order_form", "implementation_brief", "operations_plan", "launch_readiness", "staff_quick_start"],
    enumValues: PARTICIPANT_ACCESS_MODELS
  }),
  defineField({
    key: "code_structure",
    dataKey: "code_structure",
    sectionKey: "access_sponsorship_capacity",
    dataType: "enum",
    label: "Planned code structure",
    ownership: "partner_editable",
    requirement: "conditional",
    requiredWhen: "access_model_requires_code_plan",
    activeWhen: "access_model_requires_code_plan",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "staff_quick_start"],
    enumValues: ACCESS_CODE_STRUCTURES
  }),
  defineField({
    key: "code_source_groups",
    dataKey: "code_source_groups",
    sectionKey: "access_sponsorship_capacity",
    dataType: "string_array",
    label: "Planned code source groups",
    ownership: "partner_editable",
    requirement: "conditional",
    requiredWhen: "access_model_requires_code_plan",
    activeWhen: "access_model_requires_code_plan",
    minCount: 1,
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "dedupe_preserve_order",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "launch_readiness", "reporting_package"]
  }),
  defineField({
    key: "code_expiration",
    dataKey: "code_expiration",
    sectionKey: "access_sponsorship_capacity",
    dataType: "date",
    label: "Planned code expiration",
    ownership: "partner_editable",
    requirement: "optional",
    activeWhen: "access_model_requires_code_plan",
    normalization: "date_only",
    sensitivity: "partner_confidential",
    completionWeight: 0,
    consumers: ["operations_plan", "launch_readiness", "staff_quick_start"]
  }),
  defineField({
    key: "code_level_capacity",
    dataKey: "code_level_capacity",
    sectionKey: "access_sponsorship_capacity",
    dataType: "integer",
    label: "Planned code-level capacity",
    ownership: "partner_editable",
    requirement: "optional",
    activeWhen: "access_model_requires_code_plan",
    normalization: "none",
    sensitivity: "commercial",
    completionWeight: 0,
    consumers: ["operations_plan", "launch_readiness", "reporting_package"]
  }),
  defineField({
    key: "overage_approver_contact_id",
    dataKey: "overage_approver_contact_id",
    sectionKey: "access_sponsorship_capacity",
    dataType: "contact_reference",
    label: "Overage approver",
    helperCopy: "Choose a saved contact. This does not change the contracted overage policy.",
    ownership: "partner_editable",
    requirement: "conditional",
    requiredWhen: "overage_approval_is_required",
    activeWhen: "overage_approval_is_required",
    maxLength: 36,
    normalization: "trim",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: ["order_form", "operations_plan", "launch_readiness"]
  }),
  defineField({
    key: "sponsored_screening_scope",
    dataKey: "sponsored_screening_scope",
    sectionKey: "access_sponsorship_capacity",
    dataType: "internal_value",
    label: "Sponsored screening scope",
    ownership: "internal_read_only",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "none",
    sensitivity: "commercial",
    completionWeight: 0,
    consumers: ["order_form", "implementation_brief", "operations_plan", "launch_readiness"]
  }),
  defineField({
    key: "sponsored_packet_scope",
    dataKey: "sponsored_packet_scope",
    sectionKey: "access_sponsorship_capacity",
    dataType: "internal_value",
    label: "Sponsored packet scope",
    ownership: "internal_read_only",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "none",
    sensitivity: "commercial",
    completionWeight: 0,
    consumers: ["order_form", "implementation_brief", "operations_plan", "launch_readiness"]
  }),
  defineField({
    key: "screening_allocation",
    dataKey: "screening_allocation",
    sectionKey: "access_sponsorship_capacity",
    dataType: "internal_value",
    label: "Screening allocation",
    ownership: "internal_read_only",
    requirement: "optional",
    normalization: "none",
    sensitivity: "commercial",
    completionWeight: 0,
    consumers: ["order_form", "operations_plan", "launch_readiness", "reporting_package"]
  }),
  defineField({
    key: "packet_credits",
    dataKey: "packet_credits",
    sectionKey: "access_sponsorship_capacity",
    dataType: "internal_value",
    label: "Packet credits",
    ownership: "internal_read_only",
    requirement: "optional",
    normalization: "none",
    sensitivity: "commercial",
    completionWeight: 0,
    consumers: ["order_form", "operations_plan", "launch_readiness", "reporting_package"]
  }),
  defineField({
    key: "recordshield_pathway",
    dataKey: "recordshield_pathway",
    sectionKey: "access_sponsorship_capacity",
    dataType: "internal_value",
    label: "RecordShield pathway",
    ownership: "internal_read_only",
    requirement: "optional",
    activeWhen: "recordshield_is_in_scope",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "none",
    sensitivity: "commercial",
    completionWeight: 0,
    consumers: ["order_form", "implementation_brief", "operations_plan", "launch_readiness"]
  }),
  defineField({
    key: "overage_behavior",
    dataKey: "overage_behavior",
    sectionKey: "access_sponsorship_capacity",
    dataType: "internal_value",
    label: "Overage behavior",
    ownership: "internal_read_only",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "none",
    sensitivity: "commercial",
    completionWeight: 0,
    consumers: ["order_form", "operations_plan", "launch_readiness"]
  }),
  defineField({
    key: "overage_approver_authorization",
    dataKey: "overage_approver_authorization",
    sectionKey: "access_sponsorship_capacity",
    dataType: "internal_value",
    label: "Overage approver authorization",
    ownership: "internal_read_only",
    requirement: "optional",
    activeWhen: "overage_approval_is_required",
    normalization: "none",
    sensitivity: "commercial",
    completionWeight: 0,
    consumers: ["order_form", "operations_plan", "launch_readiness"]
  }),

  defineField({
    key: "approved_organization_description",
    dataKey: "approved_organization_description",
    sectionKey: "brand_public_page",
    dataType: "long_text",
    label: "Approved organization description",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "public",
    completionWeight: 1,
    consumers: PUBLIC_PAGE
  }),
  defineField({
    key: "program_headline",
    dataKey: "program_headline",
    sectionKey: "brand_public_page",
    dataType: "string",
    label: "Program headline",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "single_line",
    sensitivity: "public",
    completionWeight: 1,
    consumers: PUBLIC_PAGE
  }),
  defineField({
    key: "program_subheadline",
    dataKey: "program_subheadline",
    sectionKey: "brand_public_page",
    dataType: "string",
    label: "Program subheadline",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "single_line",
    sensitivity: "public",
    completionWeight: 1,
    consumers: PUBLIC_PAGE
  }),
  defineField({
    key: "primary_cta_label",
    dataKey: "primary_cta_label",
    sectionKey: "brand_public_page",
    dataType: "string",
    label: "Primary action label",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "participant_support_copy",
    dataKey: "participant_support_copy",
    sectionKey: "brand_public_page",
    dataType: "long_text",
    label: "Participant support copy",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["operations_plan", "staff_quick_start", "launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "partner_privacy_url",
    dataKey: "partner_privacy_url",
    sectionKey: "brand_public_page",
    dataType: "url",
    label: "Partner privacy URL",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.url,
    normalization: "url",
    sensitivity: "public",
    completionWeight: 0,
    consumers: ["launch_readiness", "public_partner_page"]
  }),
  defineField({
    key: "accessibility_url",
    dataKey: "accessibility_url",
    sectionKey: "brand_public_page",
    dataType: "url",
    label: "Accessibility URL",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.url,
    normalization: "url",
    sensitivity: "public",
    completionWeight: 0,
    consumers: ["launch_readiness", "public_partner_page"]
  }),
  defineField({
    key: "impact_reporting_url",
    dataKey: "impact_reporting_url",
    sectionKey: "brand_public_page",
    dataType: "url",
    label: "Impact reporting URL",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.url,
    normalization: "url",
    sensitivity: "public",
    completionWeight: 0,
    consumers: ["reporting_package", "public_partner_page"]
  }),

  defineField({
    key: "planned_users",
    dataKey: "planned_users",
    sectionKey: "staff_dashboard_plan",
    dataType: "planned_user_collection",
    label: "Planned dashboard users",
    helperCopy: "This is a plan only. Saving a row does not create a membership or send an invitation.",
    ownership: "partner_editable",
    requirement: "required",
    minCount: 1,
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    normalization: "none",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN
  }),
  defineField({
    key: "planned_users[].stable_row_id",
    dataKey: "stable_row_id",
    sectionKey: "staff_dashboard_plan",
    dataType: "string",
    label: "Planned user record ID",
    ownership: "system_derived",
    requirement: "required",
    maxLength: 36,
    normalization: "trim",
    sensitivity: "system",
    completionWeight: 0,
    consumers: DASHBOARD_PLAN,
    parentCollection: "planned_users"
  }),
  defineField({
    key: "planned_users[].name",
    dataKey: "name",
    sectionKey: "staff_dashboard_plan",
    dataType: "string",
    label: "Planned user name",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN,
    parentCollection: "planned_users"
  }),
  defineField({
    key: "planned_users[].work_email",
    dataKey: "work_email",
    sectionKey: "staff_dashboard_plan",
    dataType: "email",
    label: "Planned user work email",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.email,
    normalization: "email_lowercase",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN,
    parentCollection: "planned_users"
  }),
  defineField({
    key: "planned_users[].requested_role",
    dataKey: "requested_role",
    sectionKey: "staff_dashboard_plan",
    dataType: "enum",
    label: "Requested role",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN,
    enumValues: REQUESTED_DASHBOARD_ROLES,
    parentCollection: "planned_users"
  }),
  defineField({
    key: "planned_users[].special_permissions",
    dataKey: "special_permissions",
    sectionKey: "staff_dashboard_plan",
    dataType: "string_array",
    label: "Special permissions",
    ownership: "partner_editable",
    requirement: "required",
    minCount: 0,
    maxCount: DASHBOARD_SPECIAL_PERMISSIONS.length,
    normalization: "dedupe_preserve_order",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN,
    enumValues: DASHBOARD_SPECIAL_PERMISSIONS,
    parentCollection: "planned_users"
  }),
  defineField({
    key: "planned_users[].training_attendee",
    dataKey: "training_attendee",
    sectionKey: "staff_dashboard_plan",
    dataType: "boolean",
    label: "Training attendee",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN,
    parentCollection: "planned_users"
  }),
  defineField({
    key: "primary_dashboard_administrator_row_id",
    dataKey: "primary_dashboard_administrator_row_id",
    sectionKey: "staff_dashboard_plan",
    dataType: "planned_user_reference",
    label: "Primary dashboard administrator",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: 36,
    normalization: "trim",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN
  }),
  defineField({
    key: "user_invitation_authority_role",
    dataKey: "user_invitation_authority_role",
    sectionKey: "staff_dashboard_plan",
    dataType: "enum",
    label: "User invitation authority role",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN,
    enumValues: REQUESTED_DASHBOARD_ROLES
  }),
  defineField({
    key: "code_management_authority_role",
    dataKey: "code_management_authority_role",
    sectionKey: "staff_dashboard_plan",
    dataType: "enum",
    label: "Code management authority role",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN,
    enumValues: REQUESTED_DASHBOARD_ROLES
  }),
  defineField({
    key: "report_export_authority_role",
    dataKey: "report_export_authority_role",
    sectionKey: "staff_dashboard_plan",
    dataType: "enum",
    label: "Report export authority role",
    ownership: "partner_editable",
    requirement: "required",
    normalization: "none",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN,
    enumValues: REQUESTED_DASHBOARD_ROLES
  }),
  defineField({
    key: "access_review_frequency",
    dataKey: "access_review_frequency",
    sectionKey: "staff_dashboard_plan",
    dataType: "string",
    label: "Access review frequency",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "single_line",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: DASHBOARD_PLAN
  }),
  ...[
    ["training_status", "Training status"],
    ["training_completed_at", "Training completed at"],
    ["invitation_status", "Invitation status"],
    ["membership_status", "Membership status"]
  ].map(([key, label]) =>
    defineField({
      key: key as
        | "training_status"
        | "training_completed_at"
        | "invitation_status"
        | "membership_status",
      dataKey: key,
      sectionKey: "staff_dashboard_plan",
      dataType: "internal_value",
      label,
      ownership: "internal_read_only",
      requirement: "optional",
      normalization: "none",
      sensitivity: "system",
      completionWeight: 0,
      consumers: DASHBOARD_PLAN
    })
  ),

  defineField({
    key: "participant_support_email",
    dataKey: "participant_support_email",
    sectionKey: "support_referrals_reporting",
    dataType: "email",
    label: "Participant support email",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.email,
    normalization: "email_lowercase",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["operations_plan", "staff_quick_start", "launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "participant_support_phone",
    dataKey: "participant_support_phone",
    sectionKey: "support_referrals_reporting",
    dataType: "phone",
    label: "Participant support phone",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.phone,
    normalization: "phone",
    sensitivity: "public",
    completionWeight: 0,
    consumers: ["operations_plan", "staff_quick_start", "launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "partner_staff_support_contact_id",
    dataKey: "partner_staff_support_contact_id",
    sectionKey: "support_referrals_reporting",
    dataType: "contact_reference",
    label: "Partner staff support contact",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: 36,
    normalization: "trim",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: ["operations_plan", "staff_quick_start", "launch_readiness"]
  }),
  defineField({
    key: "legal_services_referral_organization",
    dataKey: "legal_services_referral_organization",
    sectionKey: "support_referrals_reporting",
    dataType: "string",
    label: "Legal services referral organization",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.organizationOrProgramName,
    normalization: "single_line",
    sensitivity: "public",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "staff_quick_start", "launch_kit", "public_partner_page"]
  }),
  defineField({
    key: "referral_intake_method",
    dataKey: "referral_intake_method",
    sectionKey: "support_referrals_reporting",
    dataType: "string",
    label: "Referral intake method",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "single_line",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "staff_quick_start", "launch_readiness"]
  }),
  defineField({
    key: "referral_intake_details",
    dataKey: "referral_intake_details",
    sectionKey: "support_referrals_reporting",
    dataType: "long_text",
    label: "Referral intake details",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "staff_quick_start", "launch_readiness"]
  }),
  defineField({
    key: "contested_matter_procedure",
    dataKey: "contested_matter_procedure",
    sectionKey: "support_referrals_reporting",
    dataType: "long_text",
    label: "Contested-matter procedure",
    helperCopy:
      "State that the self-help path stops when a prosecutor objects, a contested hearing is scheduled, or individualized legal advocacy is required, and that the approved referral or escalation process then applies.",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: ["implementation_brief", "operations_plan", "staff_quick_start", "launch_readiness"]
  }),
  defineField({
    key: "urgent_escalation_contact_id",
    dataKey: "urgent_escalation_contact_id",
    sectionKey: "support_referrals_reporting",
    dataType: "contact_reference",
    label: "Urgent escalation contact",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: 36,
    normalization: "trim",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: ["operations_plan", "staff_quick_start", "launch_readiness"]
  }),
  defineField({
    key: "report_recipients",
    dataKey: "report_recipients",
    sectionKey: "support_referrals_reporting",
    dataType: "report_recipient_collection",
    label: "Report recipients",
    ownership: "partner_editable",
    requirement: "required",
    minCount: 1,
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    normalization: "none",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: REPORTING
  }),
  defineField({
    key: "report_recipients[].stable_row_id",
    dataKey: "stable_row_id",
    sectionKey: "support_referrals_reporting",
    dataType: "string",
    label: "Report recipient record ID",
    ownership: "system_derived",
    requirement: "required",
    maxLength: 36,
    normalization: "trim",
    sensitivity: "system",
    completionWeight: 0,
    consumers: REPORTING,
    parentCollection: "report_recipients"
  }),
  defineField({
    key: "report_recipients[].name",
    dataKey: "name",
    sectionKey: "support_referrals_reporting",
    dataType: "string",
    label: "Report recipient name",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "personal_contact",
    completionWeight: 0,
    consumers: REPORTING,
    parentCollection: "report_recipients"
  }),
  defineField({
    key: "report_recipients[].work_email",
    dataKey: "work_email",
    sectionKey: "support_referrals_reporting",
    dataType: "email",
    label: "Report recipient work email",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.email,
    normalization: "email_lowercase",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: REPORTING,
    parentCollection: "report_recipients"
  }),
  defineField({
    key: "reporting_cadence",
    dataKey: "reporting_cadence",
    sectionKey: "support_referrals_reporting",
    dataType: "string",
    label: "Reporting cadence",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "single_line",
    sensitivity: "partner_confidential",
    completionWeight: 1,
    consumers: REPORTING
  }),
  defineField({
    key: "funder_required_metrics",
    dataKey: "funder_required_metrics",
    sectionKey: "support_referrals_reporting",
    dataType: "string_array",
    label: "Funder-required metrics",
    ownership: "partner_editable",
    requirement: "optional",
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "dedupe_preserve_order",
    sensitivity: "partner_confidential",
    completionWeight: 0,
    consumers: REPORTING
  }),
  defineField({
    key: "data_use_restrictions",
    dataKey: "data_use_restrictions",
    sectionKey: "support_referrals_reporting",
    dataType: "string_array",
    label: "Data-use restrictions",
    ownership: "partner_editable",
    requirement: "optional",
    maxCount: ONBOARDING_FIELD_LIMITS.arrayRows,
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "dedupe_preserve_order",
    sensitivity: "partner_confidential",
    completionWeight: 0,
    consumers: ["order_form", "implementation_brief", "operations_plan", "reporting_package"]
  }),
  defineField({
    key: "external_outcome_data_description",
    dataKey: "external_outcome_data_description",
    sectionKey: "support_referrals_reporting",
    dataType: "long_text",
    label: "External outcome data description",
    ownership: "partner_editable",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.longText,
    normalization: "multiline",
    sensitivity: "partner_confidential",
    completionWeight: 0,
    consumers: REPORTING
  }),
  defineField({
    key: "legalease_technical_support_route",
    dataKey: "legalease_technical_support_route",
    sectionKey: "support_referrals_reporting",
    dataType: "internal_value",
    label: "LegalEase technical support route",
    ownership: "system_derived",
    requirement: "optional",
    maxLength: ONBOARDING_FIELD_LIMITS.shortText,
    normalization: "none",
    sensitivity: "system",
    completionWeight: 0,
    consumers: ["operations_plan", "staff_quick_start", "launch_readiness"]
  }),

  ...[
    ["organization_information_accurate", "Organization information is accurate"],
    ["program_scope_approved_for_configuration", "Program scope is approved for configuration"],
    ["brand_assets_authorized_for_use", "Brand assets are authorized for use"],
    ["no_eligibility_or_outcome_guarantee_understood", "No eligibility or outcome guarantee is understood"],
    [
      "contested_and_representation_matters_follow_escalation_plan",
      "Contested and representation matters follow the escalation plan"
    ],
    ["dashboard_users_authorized", "Planned dashboard users are authorized"],
    [
      "legalease_may_prepare_draft_implementation_materials",
      "LegalEase may prepare draft implementation materials"
    ]
  ].map(([key, label]) =>
    defineField({
      key: key as
        | "organization_information_accurate"
        | "program_scope_approved_for_configuration"
        | "brand_assets_authorized_for_use"
        | "no_eligibility_or_outcome_guarantee_understood"
        | "contested_and_representation_matters_follow_escalation_plan"
        | "dashboard_users_authorized"
        | "legalease_may_prepare_draft_implementation_materials",
      dataKey: key,
      sectionKey: "review_authorization",
      dataType: "boolean",
      label,
      ownership: "partner_editable",
      requirement: "required",
      normalization: "none",
      sensitivity: "partner_confidential",
      completionWeight: 1,
      consumers: ["order_form", "implementation_brief", "launch_readiness"],
      requiredValue: true
    })
  ),
  defineField({
    key: "approver_name",
    dataKey: "approver_name",
    sectionKey: "review_authorization",
    dataType: "string",
    label: "Approver name",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: ["order_form", "implementation_brief", "launch_readiness"]
  }),
  defineField({
    key: "approver_title",
    dataKey: "approver_title",
    sectionKey: "review_authorization",
    dataType: "string",
    label: "Approver title",
    ownership: "partner_editable",
    requirement: "required",
    maxLength: ONBOARDING_FIELD_LIMITS.nameOrTitle,
    normalization: "single_line",
    sensitivity: "personal_contact",
    completionWeight: 1,
    consumers: ["order_form", "implementation_brief", "launch_readiness"]
  }),
  ...[
    ["approver_user_id", "Approver user ID"],
    ["approver_work_email", "Approver work email"],
    ["authorization_timestamp", "Authorization timestamp"],
    ["terms_or_schema_version", "Terms or schema version"]
  ].map(([key, label]) =>
    defineField({
      key: key as
        | "approver_user_id"
        | "approver_work_email"
        | "authorization_timestamp"
        | "terms_or_schema_version",
      dataKey: key,
      sectionKey: "review_authorization",
      dataType: "internal_value",
      label,
      helperCopy:
        key === "authorization_timestamp"
          ? "Recorded from the server clock when the package is submitted."
          : undefined,
      ownership: "system_derived",
      requirement: "optional",
      maxLength:
        key === "approver_work_email"
          ? ONBOARDING_FIELD_LIMITS.email
          : ONBOARDING_FIELD_LIMITS.shortText,
      normalization: "none",
      sensitivity: key === "approver_work_email" ? "personal_contact" : "system",
      completionWeight: 0,
      consumers: ["order_form", "implementation_brief", "launch_readiness"]
    })
  )
] as const satisfies readonly OnboardingFieldDefinition[];

export const ONBOARDING_ASSET_DEFINITIONS = [
  {
    category: "transparent_logo",
    label: "Transparent logo",
    requirement: "required",
    allowedExtensions: ["png", "jpg", "jpeg", "webp"],
    maxBytes: 10 * 1024 * 1024,
    consumers: ["implementation_brief", "staff_quick_start", "launch_kit", "public_partner_page"]
  },
  {
    category: "brand_guide",
    label: "Brand guide",
    requirement: "optional",
    allowedExtensions: ["pdf", "docx"],
    maxBytes: 20 * 1024 * 1024,
    consumers: ["implementation_brief", "launch_kit", "public_partner_page"]
  },
  {
    category: "hero_or_community_image",
    label: "Hero or community image",
    requirement: "optional",
    allowedExtensions: ["png", "jpg", "jpeg", "webp"],
    maxBytes: 10 * 1024 * 1024,
    consumers: ["launch_kit", "public_partner_page"]
  },
  {
    category: "organizer_or_program_lead_image",
    label: "Organizer or program lead image",
    requirement: "optional",
    allowedExtensions: ["png", "jpg", "jpeg", "webp"],
    maxBytes: 10 * 1024 * 1024,
    consumers: ["launch_kit", "public_partner_page"]
  },
  {
    category: "approved_partner_description_attachment",
    label: "Approved partner description attachment",
    requirement: "optional",
    allowedExtensions: ["pdf", "docx"],
    maxBytes: 20 * 1024 * 1024,
    consumers: ["implementation_brief", "launch_kit", "public_partner_page"]
  },
  {
    category: "procurement_document",
    label: "Requested procurement document",
    requirement: "conditional",
    requiredWhen: "procurement_is_required",
    allowedExtensions: ["pdf", "docx"],
    maxBytes: 20 * 1024 * 1024,
    consumers: ["order_form", "implementation_brief", "launch_readiness"]
  },
  {
    category: "other_approved_organizational_asset",
    label: "Other approved organizational asset",
    requirement: "optional",
    allowedExtensions: ["png", "jpg", "jpeg", "webp", "pdf", "docx"],
    maxBytes: 20 * 1024 * 1024,
    consumers: ["implementation_brief", "launch_kit"]
  }
] as const satisfies readonly OrganizationalAssetDefinition[];

export function getOnboardingFieldsForSection(
  sectionKey: OnboardingSectionKey
): readonly OnboardingFieldDefinition[] {
  return ONBOARDING_SCHEMA_REGISTRY.filter(
    (field) => field.sectionKey === sectionKey
  );
}

export function getPartnerEditableTopLevelFields(
  sectionKey: OnboardingSectionKey
): readonly OnboardingFieldDefinition[] {
  return ONBOARDING_SCHEMA_REGISTRY.filter(
    (field) =>
      field.sectionKey === sectionKey &&
      field.ownership === "partner_editable" &&
      !field.parentCollection
  );
}

export function getFieldDefinition(
  key: OnboardingFieldDefinition["key"]
): OnboardingFieldDefinition | undefined {
  return ONBOARDING_SCHEMA_REGISTRY.find((field) => field.key === key);
}
