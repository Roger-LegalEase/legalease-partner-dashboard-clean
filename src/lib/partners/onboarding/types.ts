export type OnboardingSectionKey =
  | "organization_contacts"
  | "program_goals"
  | "geography_audience_language_accessibility"
  | "access_sponsorship_capacity"
  | "brand_public_page"
  | "staff_dashboard_plan"
  | "support_referrals_reporting"
  | "review_authorization";

export type OnboardingWorkspaceStatus =
  | "draft"
  | "commercially_blocked"
  | "setup_in_progress"
  | "waiting_on_partner"
  | "ready_for_review"
  | "ready_to_launch"
  | "live"
  | "paused"
  | "closed";

export type OnboardingSectionStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "needs_changes"
  | "approved"
  | "waived"
  | "not_applicable";

// Mirrors partner_onboarding_agreements_status_check in
// supabase/phase-43-rcap-partner-onboarding-phase1.sql.
export type OnboardingAgreementStatus =
  | "not_required"
  | "not_started"
  | "requested"
  | "under_review"
  | "finalized"
  | "executed"
  | "approved"
  | "waived";

export type OnboardingValidationMode =
  | "draft_save"
  | "section_complete"
  | "final_submit";

export type OnboardingFieldOwnership =
  | "partner_editable"
  | "internal_read_only"
  | "system_derived";

export type OnboardingFieldSensitivity =
  | "public"
  | "partner_confidential"
  | "personal_contact"
  | "commercial"
  | "system";

export type OnboardingArtifactConsumer =
  | "order_form"
  | "implementation_brief"
  | "operations_plan"
  | "dashboard_user_matrix"
  | "launch_readiness"
  | "staff_quick_start"
  | "launch_kit"
  | "reporting_package"
  | "public_partner_page";

export type OnboardingFieldDataType =
  | "string"
  | "long_text"
  | "email"
  | "phone"
  | "url"
  | "date"
  | "boolean"
  | "integer"
  | "enum"
  | "string_array"
  | "contact_collection"
  | "planned_user_collection"
  | "report_recipient_collection"
  | "contact_reference"
  | "planned_user_reference"
  | "internal_value";

export type OnboardingNormalizationRule =
  | "trim"
  | "single_line"
  | "multiline"
  | "email_lowercase"
  | "url"
  | "phone"
  | "date_only"
  | "dedupe_preserve_order"
  | "none";

export type OnboardingRequirement =
  | "required"
  | "optional"
  | "conditional";

export type OnboardingConditionalRule =
  | "program_has_fixed_end"
  | "known_barriers_include_other"
  | "access_model_requires_code_plan"
  | "counties_are_configured"
  | "recordshield_is_in_scope"
  | "overage_approval_is_required"
  | "procurement_is_required";

export type OrganizationType =
  | "nonprofit"
  | "government"
  | "legal_services"
  | "workforce"
  | "faith_based"
  | "other";

export type OnboardingContactRole =
  | "executive_sponsor"
  | "program_operator"
  | "communications_lead"
  | "reporting_evaluation_lead"
  | "legal_services_referral_contact"
  | "finance_procurement_contact"
  | "technical_security_contact"
  // A press contact is not a program-communications contact: the communications
  // lead runs participant outreach, while this role answers media inquiries
  // about the program. The Operations and Escalation Plan names them separately.
  | "media_contact";

export type ProgramModel =
  | "year_round"
  | "clinic"
  | "event"
  | "campaign"
  | "referral_only"
  | "cohort";

export type OutOfAreaPolicy = "allowed" | "redirected" | "case_by_case";

export type ParticipantAccessModel =
  | "open"
  | "optional_code"
  | "required_code"
  | "invite_only";

export type AccessCodeStructure =
  | "shared"
  | "limited_use"
  | "single_use"
  | "mixed";

export type RequestedDashboardRole =
  | "partner_administrator"
  | "program_staff"
  | "reporting_viewer";

export type DashboardSpecialPermission =
  | "manage_codes"
  | "view_reports"
  | "export_reports"
  | "manage_users";

export type OrganizationalAssetCategory =
  | "transparent_logo"
  | "brand_guide"
  | "hero_or_community_image"
  | "organizer_or_program_lead_image"
  | "approved_partner_description_attachment"
  | "procurement_document"
  | "other_approved_organizational_asset";

export type CommercialGateOutcome =
  | "blocked"
  | "cleared_by_paid_invoice"
  | "cleared_by_approved_purchase_order"
  | "cleared_by_authorized_internal_override";

export type OnboardingActorType = "partner" | "internal" | "system";

export type OnboardingNextActionOwner = "partner" | "legalease" | "none";

export type OnboardingBlockerCode =
  | "commercial_gate_blocked"
  | "commercial_gate_partner_step"
  | "partner_changes_requested"
  | "pending_prefill_review"
  | "required_asset_missing"
  | "required_procurement_item_missing"
  | "required_section_incomplete";

export type OnboardingNextActionCode =
  | "complete_commercial_requirements"
  | "complete_partner_commercial_step"
  | "address_change_request"
  | "review_prefilled_information"
  | "upload_required_asset"
  | "complete_procurement_item"
  | "complete_section"
  | "submit_for_review"
  | "await_legalease_review"
  | "prepare_for_launch"
  | "program_live"
  | "program_paused"
  | "onboarding_closed";

export type OnboardingContact = {
  stable_row_id: string;
  role?: OnboardingContactRole;
  name?: string;
  title?: string;
  organization?: string | null;
  work_email?: string;
  phone?: string | null;
};

export type PlannedDashboardUser = {
  stable_row_id: string;
  name?: string;
  work_email?: string;
  requested_role?: RequestedDashboardRole;
  special_permissions?: DashboardSpecialPermission[];
  training_attendee?: boolean;
};

export type OnboardingReportRecipient = {
  stable_row_id: string;
  name?: string | null;
  work_email?: string;
};

export type OrganizationContactsSectionData = {
  legal_organization_name?: string;
  public_organization_name?: string;
  organization_type?: OrganizationType;
  website?: string;
  primary_address?: string;
  main_phone?: string;
  public_program_name?: string;
  partner_slug_preference?: string;
  contacts?: OnboardingContact[];
};

export type ProgramGoalsSectionData = {
  primary_goal?: string;
  definition_of_success?: string;
  target_population?: string;
  expected_screening_volume?: number;
  expected_screening_period?: string;
  expected_packet_volume?: number;
  expected_packet_period?: string;
  program_model?: ProgramModel;
  program_start_date?: string;
  program_end_date?: string | null;
  ongoing?: boolean;
  outreach_channels?: string[];
  current_workflow?: string;
  known_barriers?: string[];
  known_barriers_other?: string | null;
  partner_side_outcome_tracking?: string;
};

export type GeographyAudienceLanguageAccessibilitySectionData = {
  jurisdictions?: string[];
  service_area_description?: string;
  counties?: string[];
  default_county?: string | null;
  out_of_area_policy?: OutOfAreaPolicy;
  primary_language?: string;
  enable_spanish?: boolean;
  additional_languages?: string[];
  accessibility_accommodations?: string;
  community_specific_terminology?: string;
  population_restrictions?: string;
};

export type AccessSponsorshipCapacitySectionData = {
  participant_access_model?: ParticipantAccessModel;
  code_structure?: AccessCodeStructure;
  code_source_groups?: string[];
  code_expiration?: string | null;
  code_level_capacity?: number | null;
  overage_approver_contact_id?: string | null;
  // The cap and its approver already existed; the escalation procedure and the
  // response expectation did not, so the Operations and Escalation Plan could
  // only render a permanent gap for them.
  capacity_escalation_procedure?: string;
  capacity_escalation_response_expectation?: string;
};

export type BrandPublicPageSectionData = {
  approved_organization_description?: string;
  program_headline?: string;
  program_subheadline?: string;
  primary_cta_label?: string;
  participant_support_copy?: string;
  partner_privacy_url?: string | null;
  accessibility_url?: string | null;
  impact_reporting_url?: string | null;
};

export type StaffDashboardPlanSectionData = {
  planned_users?: PlannedDashboardUser[];
  primary_dashboard_administrator_row_id?: string;
  user_invitation_authority_role?: RequestedDashboardRole;
  code_management_authority_role?: RequestedDashboardRole;
  report_export_authority_role?: RequestedDashboardRole;
  access_review_frequency?: string;
};

export type SupportReferralsReportingSectionData = {
  participant_support_email?: string;
  participant_support_phone?: string | null;
  partner_staff_support_contact_id?: string;
  legal_services_referral_organization?: string;
  referral_intake_method?: string;
  referral_intake_details?: string;
  contested_matter_procedure?: string;
  urgent_escalation_contact_id?: string;
  // Routes the Operations and Escalation Plan names that had no schema home
  // before this release, plus the per-route response expectations. Each is a
  // partner-editable operational fact, not LegalEase-controlled language.
  privacy_request_route?: string;
  privacy_request_owner_contact_id?: string;
  privacy_request_response_expectation?: string;
  security_concern_route?: string;
  security_concern_response_expectation?: string;
  media_inquiry_response_expectation?: string;
  program_pause_route?: string;
  program_pause_authority_contact_id?: string;
  program_pause_response_expectation?: string;
  participant_support_response_expectation?: string;
  referral_response_expectation?: string;
  contested_matter_response_expectation?: string;
  report_recipients?: OnboardingReportRecipient[];
  reporting_cadence?: string;
  funder_required_metrics?: string[];
  data_use_restrictions?: string[];
  external_outcome_data_description?: string;
};

export type ReviewAuthorizationSectionData = {
  organization_information_accurate?: boolean;
  program_scope_approved_for_configuration?: boolean;
  brand_assets_authorized_for_use?: boolean;
  no_eligibility_or_outcome_guarantee_understood?: boolean;
  contested_and_representation_matters_follow_escalation_plan?: boolean;
  dashboard_users_authorized?: boolean;
  legalease_may_prepare_draft_implementation_materials?: boolean;
  approver_name?: string;
  approver_title?: string;
};

export type OnboardingSectionDataMap = {
  organization_contacts: OrganizationContactsSectionData;
  program_goals: ProgramGoalsSectionData;
  geography_audience_language_accessibility: GeographyAudienceLanguageAccessibilitySectionData;
  access_sponsorship_capacity: AccessSponsorshipCapacitySectionData;
  brand_public_page: BrandPublicPageSectionData;
  staff_dashboard_plan: StaffDashboardPlanSectionData;
  support_referrals_reporting: SupportReferralsReportingSectionData;
  review_authorization: ReviewAuthorizationSectionData;
};

export type OnboardingPartnerData = {
  [Section in OnboardingSectionKey]?: OnboardingSectionDataMap[Section];
};

export type OnboardingReadOnlyValues = {
  sponsored_screening_scope?: string;
  sponsored_packet_scope?: string;
  screening_allocation?: number | null;
  packet_credits?: number | null;
  recordshield_pathway?: string | null;
  overage_behavior?: string;
  overage_approver_authorization?: boolean;
  training_status?: string;
  training_completed_at?: string | null;
  invitation_status?: string;
  membership_status?: string;
  legalease_technical_support_route?: string;
  approver_user_id?: string;
  approver_work_email?: string;
  authorization_timestamp?: string;
  terms_or_schema_version?: string;
};

export type OnboardingFieldKey =
  | keyof OrganizationContactsSectionData
  | keyof ProgramGoalsSectionData
  | keyof GeographyAudienceLanguageAccessibilitySectionData
  | keyof AccessSponsorshipCapacitySectionData
  | keyof BrandPublicPageSectionData
  | keyof StaffDashboardPlanSectionData
  | keyof SupportReferralsReportingSectionData
  | keyof ReviewAuthorizationSectionData
  | keyof OnboardingReadOnlyValues
  | "contacts[].stable_row_id"
  | "contacts[].role"
  | "contacts[].name"
  | "contacts[].title"
  | "contacts[].organization"
  | "contacts[].work_email"
  | "contacts[].phone"
  | "planned_users[].stable_row_id"
  | "planned_users[].name"
  | "planned_users[].work_email"
  | "planned_users[].requested_role"
  | "planned_users[].special_permissions"
  | "planned_users[].training_attendee"
  | "report_recipients[].stable_row_id"
  | "report_recipients[].name"
  | "report_recipients[].work_email";

export type OnboardingCollectionKey =
  | "contacts"
  | "planned_users"
  | "report_recipients";

export type OnboardingFieldDefinition = {
  key: OnboardingFieldKey;
  dataKey: string;
  sectionKey: OnboardingSectionKey;
  dataType: OnboardingFieldDataType;
  label: string;
  helperCopy?: string;
  ownership: OnboardingFieldOwnership;
  requirement: OnboardingRequirement;
  requiredWhen?: OnboardingConditionalRule;
  activeWhen?: OnboardingConditionalRule;
  maxLength?: number;
  maxCount?: number;
  minCount?: number;
  normalization: OnboardingNormalizationRule;
  sensitivity: OnboardingFieldSensitivity;
  completionWeight: number;
  consumers: readonly OnboardingArtifactConsumer[];
  enumValues?: readonly string[];
  parentCollection?: OnboardingCollectionKey;
  requiredValue?: boolean;
};

export type OrganizationalAssetDefinition = {
  category: OrganizationalAssetCategory;
  label: string;
  requirement: OnboardingRequirement;
  requiredWhen?: OnboardingConditionalRule;
  allowedExtensions: readonly string[];
  maxBytes: number;
  consumers: readonly OnboardingArtifactConsumer[];
};

export type OnboardingValidationIssueCode =
  | "invalid_type"
  | "invalid_value"
  | "invalid_format"
  | "too_long"
  | "too_many"
  | "missing_required"
  | "duplicate"
  | "unknown_field"
  | "read_only_field"
  | "invalid_reference"
  | "commercial_gate_blocked"
  | "change_request_unresolved"
  | "required_asset_missing";

export type OnboardingValidationIssue = {
  code: OnboardingValidationIssueCode;
  sectionKey: OnboardingSectionKey;
  fieldKey: string;
  message: string;
  rowId?: string;
};

export type OnboardingValidationResult<T> =
  | {
      success: true;
      data: T;
      issues: readonly [];
    }
  | {
      success: false;
      data?: T;
      issues: readonly OnboardingValidationIssue[];
    };

export type OnboardingChangeRequestSummary = {
  sectionKey: OnboardingSectionKey;
  status: "open" | "partner_responded";
};

export type OnboardingDerivationContext = {
  commercialGateOutcome: CommercialGateOutcome;
  workspaceStatus: OnboardingWorkspaceStatus;
  sectionStatuses?: Partial<Record<OnboardingSectionKey, OnboardingSectionStatus>>;
  presentAssetCategories?: readonly OrganizationalAssetCategory[];
  unresolvedChangeRequests?: readonly OnboardingChangeRequestSummary[];
  pendingPrefillSections?: readonly OnboardingSectionKey[];
  procurementRequired?: boolean;
  procurementItemsMissing?: boolean;
  /**
   * True only when the canonical commercial record shows a step the partner owes, such as
   * an agreement in `requested`. A commercial gate with nothing outstanding on the partner
   * side belongs to LegalEase, and must not be presented to a partner as their work.
   */
  partnerOwedCommercialStep?: boolean;
  recordShieldInScope?: boolean;
  overageApprovalRequired?: boolean;
};

export type OnboardingValidationContext = Partial<OnboardingDerivationContext> & {
  workspaceStatus?: OnboardingWorkspaceStatus;
  allSections?: OnboardingPartnerData;
};

export type OnboardingRequirementProgress = {
  sectionKey: OnboardingSectionKey;
  fieldKey: string;
  label: string;
  completed: boolean;
  weight: number;
  rowId?: string;
};

export type OnboardingCompletion = {
  completedWeight: number;
  totalWeight: number;
  percentage: number;
  requirements: readonly OnboardingRequirementProgress[];
  missingRequirements: readonly OnboardingRequirementProgress[];
};

export type OnboardingDerivedSummary = {
  completion: OnboardingCompletion;
  blockerCode: OnboardingBlockerCode | null;
  blockerCopy: string | null;
  nextActionCode: OnboardingNextActionCode;
  nextActionCopy: string;
  nextActionOwner: OnboardingNextActionOwner;
  nextSectionKey?: OnboardingSectionKey;
  missingAssetCategory?: OrganizationalAssetCategory;
};

export type WorkspaceTransitionCause =
  | "workspace_created"
  | "commercial_gate_blocked"
  | "commercial_gate_cleared"
  | "partner_submitted"
  | "change_requested"
  | "partner_resumed"
  | "review_approved"
  | "workspace_closed";

export type WorkspaceTransitionInput = {
  from: OnboardingWorkspaceStatus | null;
  to: OnboardingWorkspaceStatus;
  actor: OnboardingActorType;
  cause: WorkspaceTransitionCause;
  commercialGateOutcome: CommercialGateOutcome;
  partnerRequirementsComplete?: boolean;
  hasUnresolvedChangeRequests?: boolean;
  reviewApproved?: boolean;
};

export type WorkspaceTransitionDecision =
  | { allowed: true }
  | {
      allowed: false;
      code:
        | "actor_not_allowed"
        | "transition_not_allowed"
        | "commercial_gate_blocked"
        | "requirements_incomplete"
        | "change_request_required"
        | "change_request_unresolved"
        | "review_not_approved";
      message: string;
    };

export type SectionTransitionCause =
  | "partner_started"
  | "partner_completed"
  | "partner_resubmitted"
  | "change_requested"
  | "section_approved"
  | "section_waived"
  | "section_not_applicable";

export type SectionTransitionInput = {
  from: OnboardingSectionStatus;
  to: OnboardingSectionStatus;
  actor: OnboardingActorType;
  cause: SectionTransitionCause;
  sectionComplete?: boolean;
  partnerSafeInstructionsPresent?: boolean;
  internalReasonPresent?: boolean;
};

export type SectionTransitionDecision =
  | { allowed: true }
  | {
      allowed: false;
      code:
        | "actor_not_allowed"
        | "transition_not_allowed"
        | "section_incomplete"
        | "instructions_required"
        | "reason_required";
      message: string;
    };
