import {
  ONBOARDING_SCHEMA_REGISTRY,
  ONBOARDING_SECTION_DEFINITIONS,
  ONBOARDING_SECTION_ORDER
} from "./schema";
import type {
  OnboardingFieldKey,
  OnboardingSectionKey,
  OnboardingValidationIssue
} from "./types";

export const GUIDED_STEP_QUERY_PARAMETER = "step" as const;
export const SECTION_CHANGE_REQUEST_STEP = "requested-update" as const;

export type PartnerFacingChangeRequest = {
  id: string;
  sectionKey: OnboardingSectionKey;
  status: "open" | "partner_responded" | "resolved" | "cancelled";
  requestedByLabel: "LegalEase";
  requestedAt: string;
  requestedCorrection: string;
  partnerResponse: string | null;
  respondedAt: string | null;
  resolvedAt: string | null;
  targetFieldKey: string | null;
};

export type GuidedSubstepSurface =
  | "fields"
  | "canonical_reuse"
  | "private_assets"
  | "private_preview"
  | "program_summary"
  | "exceptions"
  | "submission";

export type GuidedSubstepCompletionCondition =
  | {
      kind: "owned_fields";
      description: string;
    }
  | {
      kind: "review_task";
      description: string;
    };

export type GuidedSubstepDefinition = {
  id: string;
  title: string;
  purpose: string;
  outcome: string;
  ownedFieldKeys: readonly OnboardingFieldKey[];
  validationFieldKeys: readonly OnboardingFieldKey[];
  completionCondition: GuidedSubstepCompletionCondition;
  surface: GuidedSubstepSurface;
  route: {
    queryParameter: typeof GUIDED_STEP_QUERY_PARAMETER;
    value: string;
  };
  previousSubstep: string | null;
  nextSubstep: string | null;
};

export type GuidedSectionDefinition = {
  sectionKey: OnboardingSectionKey;
  sectionTitle: string;
  sectionPurpose: string;
  substeps: readonly GuidedSubstepDefinition[];
};

type RawGuidedSubstep = Omit<
  GuidedSubstepDefinition,
  "route" | "previousSubstep" | "nextSubstep" | "validationFieldKeys"
> & {
  validationFieldKeys?: readonly OnboardingFieldKey[];
};

type RawGuidedSection = {
  sectionKey: OnboardingSectionKey;
  substeps: readonly RawGuidedSubstep[];
};

const fields = (
  ...ownedFieldKeys: OnboardingFieldKey[]
): Pick<
  RawGuidedSubstep,
  "ownedFieldKeys" | "completionCondition" | "surface"
> => ({
  ownedFieldKeys,
  completionCondition: {
    kind: "owned_fields",
    description:
      "The required information in this task is present and valid."
  },
  surface: "fields"
});

const reviewTask = (
  surface: Exclude<GuidedSubstepSurface, "fields">,
  description: string
): Pick<
  RawGuidedSubstep,
  "ownedFieldKeys" | "completionCondition" | "surface"
> => ({
  ownedFieldKeys: [],
  completionCondition: { kind: "review_task", description },
  surface
});

const RAW_GUIDED_SECTIONS = [
  {
    sectionKey: "organization_contacts",
    substeps: [
      {
        id: "organization-identity",
        title: "Organization identity",
        purpose:
          "Record the legal identity and primary location used for implementation records.",
        outcome:
          "LegalEase will use these details to prepare the implementation record.",
        ...fields(
          "legal_organization_name",
          "organization_type",
          "primary_address"
        )
      },
      {
        id: "public-identity",
        title: "Public identity and website",
        purpose:
          "Confirm the names and contact details participants may see.",
        outcome:
          "These values will be available to the later private-page review.",
        ...fields(
          "public_organization_name",
          "website",
          "main_phone",
          "public_program_name",
          "partner_slug_preference"
        )
      },
      {
        id: "implementation-contacts",
        title: "Executive sponsor and operational contacts",
        purpose:
          "Name the people responsible for executive, program, communications, reporting, legal, finance, security, and media decisions.",
        outcome:
          "Saving the roster records responsibilities. It does not create accounts or send invitations.",
        ...fields("contacts")
      }
    ]
  },
  {
    sectionKey: "program_goals",
    substeps: [
      {
        id: "goal-and-success",
        title: "Program goal and definition of success",
        purpose:
          "Describe the result this program should pursue and how your organization will recognize progress.",
        outcome:
          "LegalEase will use this language to align implementation decisions and reporting.",
        ...fields("primary_goal", "definition_of_success")
      },
      {
        id: "target-population",
        title: "Target population",
        purpose:
          "Describe the community this program is intended to reach without promising legal eligibility or an outcome.",
        outcome:
          "This description will inform outreach and the participant experience.",
        ...fields("target_population")
      },
      {
        id: "expected-reach",
        title: "Expected reach",
        purpose:
          "Provide planning estimates for screenings and record-clearing packets.",
        outcome:
          "The estimates guide planning and do not change contracted allocations.",
        ...fields(
          "expected_screening_volume",
          "expected_screening_period",
          "expected_packet_volume",
          "expected_packet_period"
        )
      },
      {
        id: "timing-and-model",
        title: "Program timing and model",
        purpose:
          "Choose the operating model and the dates your organization currently expects.",
        outcome:
          "LegalEase will compare this plan with readiness and scheduling decisions.",
        ...fields(
          "program_model",
          "program_start_date",
          "ongoing",
          "program_end_date"
        )
      },
      {
        id: "outreach-workflow-barriers",
        title: "Outreach, workflow, and barriers",
        purpose:
          "Describe how people learn about the program, how work moves today, and what may prevent participation.",
        outcome:
          "These details will shape implementation tasks and operating guidance.",
        ...fields(
          "outreach_channels",
          "current_workflow",
          "known_barriers",
          "known_barriers_other"
        )
      },
      {
        id: "partner-measurement",
        title: "Partner-side measurement",
        purpose:
          "Explain what your organization will measure outside LegalEase reporting.",
        outcome:
          "The saved answer will define the partner-side measurement responsibility.",
        ...fields("partner_side_outcome_tracking")
      }
    ]
  },
  {
    sectionKey: "geography_audience_language_accessibility",
    substeps: [
      {
        id: "jurisdiction-service-area",
        title: "Jurisdiction and service area",
        purpose:
          "Identify the jurisdictions and describe the intended service area.",
        outcome:
          "LegalEase will use this information for participant routing and implementation review.",
        ...fields("jurisdictions", "service_area_description")
      },
      {
        id: "counties-restrictions",
        title: "Counties and geographic restrictions",
        purpose:
          "Record county coverage, a default county when needed, and the out-of-area policy.",
        outcome:
          "These settings guide routing and reporting. They do not promise eligibility.",
        ...fields("counties", "default_county", "out_of_area_policy")
      },
      {
        id: "participant-language",
        title: "Participant language",
        purpose:
          "Record the primary language, Spanish configuration, additional languages, and community terminology.",
        outcome:
          "LegalEase will use this plan to identify language work before launch.",
        ...fields(
          "primary_language",
          "enable_spanish",
          "additional_languages",
          "community_specific_terminology"
        )
      },
      {
        id: "accessibility-accommodations",
        title: "Accessibility accommodations",
        purpose:
          "Describe the accommodations participants may need to use this program.",
        outcome:
          "The saved answer will be reviewed during participant-experience readiness.",
        ...fields("accessibility_accommodations")
      },
      {
        id: "population-restrictions",
        title: "Population restrictions",
        purpose:
          "Record any program-specific population restrictions without changing legal screening rules.",
        outcome:
          "LegalEase will review the restriction before configuring participant routing.",
        ...fields("population_restrictions")
      }
    ]
  },
  {
    sectionKey: "access_sponsorship_capacity",
    substeps: [
      {
        id: "participant-access-model",
        title: "Participant access model",
        purpose:
          "Choose how participants are expected to enter the program.",
        outcome:
          "This records the implementation plan. It does not create a code or release an invitation.",
        ...fields("participant_access_model")
      },
      {
        id: "sponsorship-rules",
        title: "Sponsorship rules",
        purpose:
          "When codes or invitations are planned, describe their structure, source groups, and expiration.",
        outcome:
          "LegalEase will use the saved rules when access configuration is authorized.",
        ...fields("code_structure", "code_source_groups", "code_expiration")
      },
      {
        id: "capacity-allocation",
        title: "Capacity and allocation",
        purpose:
          "Record the planned code-level capacity and review the authoritative sponsored scope.",
        outcome:
          "Partner planning is saved without changing contract, billing, or credit records.",
        ...fields(
          "code_level_capacity",
          "sponsored_screening_scope",
          "sponsored_packet_scope",
          "screening_allocation",
          "packet_credits",
          "recordshield_pathway"
        )
      },
      {
        id: "overage-stop-behavior",
        title: "Grace, overage, or stop behavior",
        purpose:
          "Review the authoritative overage behavior and identify an approver when the plan requires one.",
        outcome:
          "The contact choice supports escalation and cannot change commercial terms.",
        ...fields(
          "overage_approver_contact_id",
          "overage_behavior",
          "overage_approver_authorization"
        )
      },
      {
        id: "capacity-escalation",
        title: "Capacity escalation",
        purpose:
          "Explain what happens near capacity and how quickly the responsible person should respond.",
        outcome:
          "The saved procedure will appear in the operating plan.",
        ...fields(
          "capacity_escalation_procedure",
          "capacity_escalation_response_expectation"
        )
      }
    ]
  },
  {
    sectionKey: "brand_public_page",
    substeps: [
      {
        id: "reused-public-identity",
        title: "Reused public identity",
        purpose:
          "Review the public organization, program, jurisdiction, and language values that are owned by earlier sections.",
        outcome:
          "Use the source links to correct a reused value without creating a duplicate copy.",
        ...reviewTask(
          "canonical_reuse",
          "The reused canonical values have been reviewed in their source sections."
        )
      },
      {
        id: "approved-public-copy",
        title: "Approved public copy",
        purpose:
          "Provide organization-approved description, headline, supporting line, and primary action label.",
        outcome:
          "LegalEase will review the copy before it appears in an authorized private preview.",
        ...fields(
          "approved_organization_description",
          "program_headline",
          "program_subheadline",
          "primary_cta_label"
        )
      },
      {
        id: "participant-support-copy",
        title: "Participant support information",
        purpose:
          "Provide the approved support message participants should receive.",
        outcome:
          "The saved message remains private until publication is separately approved.",
        ...fields("participant_support_copy")
      },
      {
        id: "privacy-accessibility-links",
        title: "Privacy and accessibility links",
        purpose:
          "Provide organization-owned privacy, accessibility, and impact-reporting links when available.",
        outcome:
          "LegalEase will verify the links during private-page review.",
        ...fields(
          "partner_privacy_url",
          "accessibility_url",
          "impact_reporting_url"
        )
      },
      {
        id: "private-assets",
        title: "Private organizational assets",
        purpose:
          "Upload only approved organization and brand materials. Never upload participant or case files.",
        outcome:
          "Files stay in private onboarding storage and remain subject to review.",
        ...reviewTask(
          "private_assets",
          "The required private asset is present and available for review."
        )
      },
      {
        id: "private-preview-approval",
        title: "Private preview and approval",
        purpose:
          "Review what happens after brand information is saved and before any publication decision.",
        outcome:
          "Task 3 will provide the full split-screen editor. This handoff keeps the page private and inactive.",
        ...reviewTask(
          "private_preview",
          "The private-preview transition has been reviewed."
        )
      }
    ]
  },
  {
    sectionKey: "staff_dashboard_plan",
    substeps: [
      {
        id: "team-roster",
        title: "Program staff and reporting viewers",
        purpose:
          "Plan the people, requested roles, permissions, and training attendance for the dashboard.",
        outcome:
          "Saving the roster does not create memberships or send invitations.",
        ...fields("planned_users")
      },
      {
        id: "primary-administrator",
        title: "Primary administrator",
        purpose:
          "Choose the planned user who will own administrator decisions.",
        outcome:
          "The selection records the plan and does not change the active membership.",
        ...fields("primary_dashboard_administrator_row_id")
      },
      {
        id: "permission-expectations",
        title: "Permission expectations",
        purpose:
          "Record which role should invite users, manage codes, and export reports.",
        outcome:
          "LegalEase will compare these expectations with the authorized role model.",
        ...fields(
          "user_invitation_authority_role",
          "code_management_authority_role",
          "report_export_authority_role"
        )
      },
      {
        id: "access-review-cadence",
        title: "Access review cadence",
        purpose:
          "Set the planned review cadence and read the current training, invitation, and membership status.",
        outcome:
          "The cadence is saved without changing authoritative account status.",
        ...fields(
          "access_review_frequency",
          "training_status",
          "training_completed_at",
          "invitation_status",
          "membership_status"
        )
      }
    ]
  },
  {
    sectionKey: "support_referrals_reporting",
    substeps: [
      {
        id: "participant-support",
        title: "Participant support",
        purpose:
          "Record the participant support address, phone, and response expectation.",
        outcome:
          "These details will guide participant-facing support materials.",
        ...fields(
          "participant_support_email",
          "participant_support_phone",
          "participant_support_response_expectation"
        )
      },
      {
        id: "staff-support",
        title: "Staff support",
        purpose:
          "Choose the saved partner contact who supports staff and review the LegalEase technical support route.",
        outcome:
          "The saved owner will appear in implementation guidance.",
        ...fields(
          "partner_staff_support_contact_id",
          "legalease_technical_support_route"
        )
      },
      {
        id: "legal-referral",
        title: "Legal referral",
        purpose:
          "Describe the approved referral organization, intake method, details, and response expectation.",
        outcome:
          "The saved process will be used when a matter leaves the self-help path.",
        ...fields(
          "legal_services_referral_organization",
          "referral_intake_method",
          "referral_intake_details",
          "referral_response_expectation"
        )
      },
      {
        id: "contested-escalation",
        title: "Contested-matter escalation",
        purpose:
          "Explain when self-help stops, who receives the escalation, and how quickly they respond.",
        outcome:
          "LegalEase will validate this procedure before launch readiness can pass.",
        ...fields(
          "contested_matter_procedure",
          "urgent_escalation_contact_id",
          "contested_matter_response_expectation"
        )
      },
      {
        id: "privacy-security-media",
        title: "Privacy, security, and media routes",
        purpose:
          "Describe how privacy and security concerns are routed and record the media response expectation.",
        outcome:
          "The operating plan will identify each route, owner, and response expectation.",
        ...fields(
          "privacy_request_route",
          "privacy_request_owner_contact_id",
          "privacy_request_response_expectation",
          "security_concern_route",
          "security_concern_response_expectation",
          "media_inquiry_response_expectation"
        )
      },
      {
        id: "program-continuity",
        title: "Program continuity",
        purpose:
          "Describe who may request a pause, how they ask, and the expected response.",
        outcome:
          "This records an escalation route and does not pause or activate the program.",
        ...fields(
          "program_pause_route",
          "program_pause_authority_contact_id",
          "program_pause_response_expectation"
        )
      },
      {
        id: "reporting-recipients",
        title: "Reporting recipients",
        purpose:
          "List the people intended to receive program reporting.",
        outcome:
          "Saving recipients records the plan and sends no report or invitation.",
        ...fields("report_recipients")
      },
      {
        id: "reporting-plan",
        title: "Reporting cadence and restrictions",
        purpose:
          "Record reporting cadence, funder metrics, data-use restrictions, and external outcome data.",
        outcome:
          "LegalEase will use these details to prepare reporting materials.",
        ...fields(
          "reporting_cadence",
          "funder_required_metrics",
          "data_use_restrictions",
          "external_outcome_data_description"
        )
      }
    ]
  },
  {
    sectionKey: "review_authorization",
    substeps: [
      {
        id: "program-summary",
        title: "Program summary",
        purpose:
          "Review the section-level decisions before providing authorization.",
        outcome:
          "Use the source section links for any correction.",
        ...reviewTask(
          "program_summary",
          "The program summary has been reviewed."
        )
      },
      {
        id: "exceptions-unresolved-items",
        title: "Exceptions and unresolved items",
        purpose:
          "Review missing information, requested changes, and actions still owned by LegalEase.",
        outcome:
          "Partner blockers must be cleared before final submission is available.",
        ...reviewTask(
          "exceptions",
          "The current exceptions and unresolved items have been reviewed."
        )
      },
      {
        id: "partner-acknowledgments",
        title: "Partner acknowledgments",
        purpose:
          "Confirm each implementation statement after reviewing the package.",
        outcome:
          "These acknowledgments authorize implementation preparation and are not an e-signature.",
        ...fields(
          "organization_information_accurate",
          "program_scope_approved_for_configuration",
          "brand_assets_authorized_for_use",
          "no_eligibility_or_outcome_guarantee_understood",
          "contested_and_representation_matters_follow_escalation_plan",
          "dashboard_users_authorized",
          "legalease_may_prepare_draft_implementation_materials"
        )
      },
      {
        id: "authorized-approver",
        title: "Authorized approver",
        purpose:
          "Record the name and title of the person authorizing implementation review.",
        outcome:
          "The authenticated identity and server time are recorded only when the full package is submitted.",
        ...fields("approver_name", "approver_title")
      },
      {
        id: "submission",
        title: "Submission",
        purpose:
          "Review the server-recorded audit details and continue to the package decision summary.",
        outcome:
          "Submitting starts LegalEase review. It does not approve, publish, or activate the program.",
        ...reviewTask(
          "submission",
          "The package is ready for final submission review."
        ),
        ownedFieldKeys: [
          "approver_user_id",
          "approver_work_email",
          "authorization_timestamp",
          "terms_or_schema_version"
        ]
      }
    ]
  }
] as const satisfies readonly RawGuidedSection[];

export const GUIDED_ONBOARDING_SECTIONS: readonly GuidedSectionDefinition[] =
  RAW_GUIDED_SECTIONS.map((section) => {
    const sectionDefinition = ONBOARDING_SECTION_DEFINITIONS.find(
      (candidate) => candidate.key === section.sectionKey
    );
    if (!sectionDefinition) {
      throw new Error(`Missing onboarding section definition: ${section.sectionKey}`);
    }
    return {
      sectionKey: section.sectionKey,
      sectionTitle: sectionDefinition.label,
      sectionPurpose: sectionDefinition.purpose,
      substeps: section.substeps.map((substep, index) => ({
        ...substep,
        validationFieldKeys:
          (substep as RawGuidedSubstep).validationFieldKeys ??
          substep.ownedFieldKeys.filter((fieldKey) =>
            isPartnerEditableField(section.sectionKey, fieldKey)
          ),
        route: {
          queryParameter: GUIDED_STEP_QUERY_PARAMETER,
          value: substep.id
        },
        previousSubstep: section.substeps[index - 1]?.id ?? null,
        nextSubstep: section.substeps[index + 1]?.id ?? null
      }))
    };
  });

export type GuidedStepResolution = {
  section: GuidedSectionDefinition;
  substep: GuidedSubstepDefinition;
  index: number;
  containsRequestedChange: boolean;
  mayEdit: boolean;
  requestedFieldKey: string | null;
  sectionLevelRequest: boolean;
  requestOverview: boolean;
};

export type ResolveGuidedStepInput = {
  sectionKey: OnboardingSectionKey;
  requestedStep?: string | null;
  missingRequiredKeys?: readonly string[];
  pendingPrefillFieldKeys?: readonly string[];
  changeRequest?: {
    status: "open" | "partner_responded" | "resolved" | "cancelled";
    targetFieldKey?: string | null;
  } | null;
  canEdit: boolean;
};

export function getGuidedSection(
  sectionKey: OnboardingSectionKey
): GuidedSectionDefinition {
  const section = GUIDED_ONBOARDING_SECTIONS.find(
    (candidate) => candidate.sectionKey === sectionKey
  );
  if (!section) {
    throw new Error(`Missing guided onboarding section: ${sectionKey}`);
  }
  return section;
}

export function resolveGuidedStep(
  input: ResolveGuidedStepInput
): GuidedStepResolution {
  const section = getGuidedSection(input.sectionKey);
  const activeRequest =
    input.changeRequest?.status === "open" ||
    input.changeRequest?.status === "partner_responded"
      ? input.changeRequest
      : null;
  const requestedFieldKey = activeRequest?.targetFieldKey ?? null;
  const targetSubstep = requestedFieldKey
    ? guidedSubstepForField(input.sectionKey, requestedFieldKey)
    : null;
  const requestOverview = Boolean(activeRequest && !targetSubstep);

  if (
    input.requestedStep === SECTION_CHANGE_REQUEST_STEP &&
    requestOverview
  ) {
    return resolution(section, section.substeps[0], 0, input, {
      requestOverview: true,
      requestedFieldKey: null,
      containsRequestedChange: true,
      sectionLevelRequest: true
    });
  }

  const explicitIndex = section.substeps.findIndex(
    (substep) => substep.id === input.requestedStep
  );
  if (explicitIndex >= 0) {
    const explicit = section.substeps[explicitIndex];
    return resolution(section, explicit, explicitIndex, input, {
      requestOverview: false,
      requestedFieldKey,
      containsRequestedChange: Boolean(
        activeRequest &&
          targetSubstep &&
          targetSubstep.id === explicit.id
      ),
      sectionLevelRequest: false
    });
  }

  if (activeRequest) {
    if (targetSubstep) {
      const targetIndex = section.substeps.findIndex(
        (substep) => substep.id === targetSubstep.id
      );
      return resolution(section, targetSubstep, targetIndex, input, {
        requestOverview: false,
        requestedFieldKey,
        containsRequestedChange: true,
        sectionLevelRequest: false
      });
    }
    return resolution(section, section.substeps[0], 0, input, {
      requestOverview: true,
      requestedFieldKey: null,
      containsRequestedChange: true,
      sectionLevelRequest: true
    });
  }

  const attentionKeys = [
    ...(input.pendingPrefillFieldKeys ?? []),
    ...(input.missingRequiredKeys ?? [])
  ];
  const incompleteIndex = section.substeps.findIndex((substep) =>
    attentionKeys.some((fieldKey) =>
      substepOwnsField(substep, fieldKey)
    )
  );
  const index = incompleteIndex >= 0 ? incompleteIndex : 0;
  return resolution(section, section.substeps[index], index, input, {
    requestOverview: false,
    requestedFieldKey: null,
    containsRequestedChange: false,
    sectionLevelRequest: false
  });
}

export function guidedSectionHref(
  sectionKey: OnboardingSectionKey,
  stepId: string,
  anchor?: string | null
): string {
  const query = new URLSearchParams({
    [GUIDED_STEP_QUERY_PARAMETER]: stepId
  });
  return `/partner/onboarding/${encodeURIComponent(
    sectionKey
  )}?${query.toString()}${anchor ? `#${anchor.replace(/^#/, "")}` : ""}`;
}

export function guidedSectionResumeHref(
  input: ResolveGuidedStepInput
): string {
  const resolved = resolveGuidedStep(input);
  return guidedSectionHref(
    input.sectionKey,
    resolved.requestOverview
      ? SECTION_CHANGE_REQUEST_STEP
      : resolved.substep.id
  );
}

export function guidedSubstepForField(
  sectionKey: OnboardingSectionKey,
  fieldKey: string
): GuidedSubstepDefinition | null {
  const section = getGuidedSection(sectionKey);
  return (
    section.substeps.find((substep) =>
      substepOwnsField(substep, fieldKey)
    ) ?? null
  );
}

export function substepOwnsField(
  substep: GuidedSubstepDefinition,
  fieldKey: string
): boolean {
  const root = guidedFieldRoot(fieldKey);
  return substep.ownedFieldKeys.some(
    (ownedFieldKey) => guidedFieldRoot(String(ownedFieldKey)) === root
  );
}

export function guidedFieldRoot(fieldKey: string): string {
  const collectionIndex = fieldKey.indexOf("[]");
  if (collectionIndex >= 0) return fieldKey.slice(0, collectionIndex);
  const dotIndex = fieldKey.indexOf(".");
  return dotIndex >= 0 ? fieldKey.slice(0, dotIndex) : fieldKey;
}

export function filterValidationIssuesForGuidedStep(
  sectionKey: OnboardingSectionKey,
  stepId: string,
  issues: readonly OnboardingValidationIssue[]
): OnboardingValidationIssue[] {
  const step = getGuidedSection(sectionKey).substeps.find(
    (candidate) => candidate.id === stepId
  );
  if (!step) return [];
  const validationRoots = new Set(
    step.validationFieldKeys.map((fieldKey) => guidedFieldRoot(String(fieldKey)))
  );
  return issues.filter((issue) =>
    validationRoots.has(guidedFieldRoot(issue.fieldKey))
  );
}

export function guidedSubstepProgress(
  sectionKey: OnboardingSectionKey,
  missingRequiredKeys: readonly string[],
  pendingPrefillFieldKeys: readonly string[],
  values: Readonly<Record<string, unknown>>
): Array<{
  id: string;
  complete: boolean;
  needsAttention: boolean;
}> {
  const missing = new Set(missingRequiredKeys.map(guidedFieldRoot));
  const pending = new Set(pendingPrefillFieldKeys.map(guidedFieldRoot));
  return getGuidedSection(sectionKey).substeps.map((substep) => {
    const roots = substep.ownedFieldKeys.map((fieldKey) =>
      guidedFieldRoot(String(fieldKey))
    );
    const needsAttention = roots.some(
      (root) => missing.has(root) || pending.has(root)
    );
    const hasOwnedValues = roots.some((root) => hasMeaningfulValue(values[root]));
    return {
      id: substep.id,
      complete:
        substep.completionCondition.kind === "review_task"
          ? false
          : !needsAttention && hasOwnedValues,
      needsAttention
    };
  });
}

export function guidedChangeRequestHref(input: {
  sectionKey: OnboardingSectionKey;
  targetFieldKey?: string | null;
}): string {
  const target = input.targetFieldKey
    ? guidedSubstepForField(input.sectionKey, input.targetFieldKey)
    : null;
  if (!target) {
    return guidedSectionHref(
      input.sectionKey,
      SECTION_CHANGE_REQUEST_STEP
    );
  }
  return guidedSectionHref(
    input.sectionKey,
    target.id,
    `field-${slugFieldKey(input.targetFieldKey ?? "")}`
  );
}

export function slugFieldKey(fieldKey: string): string {
  return (
    fieldKey
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "value"
  );
}

export function assertGuidedSubstepContract(): void {
  if (GUIDED_ONBOARDING_SECTIONS.length !== ONBOARDING_SECTION_ORDER.length) {
    throw new Error("Every canonical onboarding section needs guided substeps.");
  }
  for (const sectionKey of ONBOARDING_SECTION_ORDER) {
    const section = getGuidedSection(sectionKey);
    const ids = new Set<string>();
    for (const substep of section.substeps) {
      if (ids.has(substep.id)) {
        throw new Error(`Duplicate guided substep: ${sectionKey}/${substep.id}`);
      }
      ids.add(substep.id);
      for (const fieldKey of substep.ownedFieldKeys) {
        const definition = fieldDefinitionForRoot(sectionKey, String(fieldKey));
        if (!definition) {
          throw new Error(
            `Unknown guided field: ${sectionKey}/${String(fieldKey)}`
          );
        }
        if (definition.sectionKey !== sectionKey) {
          throw new Error(
            `Guided field moved sections: ${String(fieldKey)}`
          );
        }
      }
    }

    const ownedRoots = new Set(
      section.substeps.flatMap((substep) =>
        substep.ownedFieldKeys.map((fieldKey) =>
          guidedFieldRoot(String(fieldKey))
        )
      )
    );
    const canonicalRoots = new Set(
      ONBOARDING_SCHEMA_REGISTRY.filter(
        (field) => field.sectionKey === sectionKey && !field.parentCollection
      ).map((field) => guidedFieldRoot(String(field.key)))
    );
    for (const root of canonicalRoots) {
      if (!ownedRoots.has(root)) {
        throw new Error(`Canonical field has no guided substep: ${sectionKey}/${root}`);
      }
    }
  }
}

function resolution(
  section: GuidedSectionDefinition,
  substep: GuidedSubstepDefinition,
  index: number,
  input: ResolveGuidedStepInput,
  request: Pick<
    GuidedStepResolution,
    | "requestOverview"
    | "requestedFieldKey"
    | "containsRequestedChange"
    | "sectionLevelRequest"
  >
): GuidedStepResolution {
  return {
    section,
    substep,
    index,
    mayEdit: input.canEdit,
    ...request
  };
}

function isPartnerEditableField(
  sectionKey: OnboardingSectionKey,
  fieldKey: OnboardingFieldKey
): boolean {
  return (
    fieldDefinitionForRoot(sectionKey, String(fieldKey))?.ownership ===
    "partner_editable"
  );
}

function fieldDefinitionForRoot(
  sectionKey: OnboardingSectionKey,
  fieldKey: string
) {
  const root = guidedFieldRoot(fieldKey);
  return ONBOARDING_SCHEMA_REGISTRY.find(
    (field) =>
      field.sectionKey === sectionKey &&
      !field.parentCollection &&
      guidedFieldRoot(String(field.key)) === root
  );
}

function hasMeaningfulValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}
