import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const typescript = require("typescript");
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const previousTypeScriptLoader = Module._extensions[".ts"];
Module._extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename,
    reportDiagnostics: true
  });
  const diagnostics = output.diagnostics ?? [];
  assert.equal(
    diagnostics.length,
    0,
    `TypeScript transpilation failed for ${path.relative(repositoryRoot, filename)}`
  );
  module._compile(output.outputText, filename);
};

const schema = require(
  path.join(repositoryRoot, "src/lib/partners/onboarding/schema.ts")
);
const validation = require(
  path.join(repositoryRoot, "src/lib/partners/onboarding/validation.ts")
);
const derivations = require(
  path.join(repositoryRoot, "src/lib/partners/onboarding/derivations.ts")
);
const scope = require(
  path.join(repositoryRoot, "src/lib/partners/onboarding/scope.ts")
);

if (previousTypeScriptLoader) {
  Module._extensions[".ts"] = previousTypeScriptLoader;
} else {
  delete Module._extensions[".ts"];
}

const {
  LEGALEASE_CONTROLLED_PUBLIC_PAGE_CONTENT,
  ONBOARDING_ASSET_DEFINITIONS,
  ONBOARDING_FIELD_LIMITS,
  ONBOARDING_SCHEMA_REGISTRY,
  ONBOARDING_SCHEMA_VERSION,
  ONBOARDING_SECTION_ORDER
} = schema;
const {
  validateFinalOnboardingSubmission,
  validateOnboardingSection
} = validation;
const {
  calculateOnboardingCompletion,
  deriveOnboardingSummary,
  evaluateSectionTransition,
  evaluateWorkspaceTransition,
  isFieldActive
} = derivations;
const { deriveRecordShieldScope } = scope;

const expectedSectionOrder = [
  "organization_contacts",
  "program_goals",
  "geography_audience_language_accessibility",
  "access_sponsorship_capacity",
  "brand_public_page",
  "staff_dashboard_plan",
  "support_referrals_reporting",
  "review_authorization"
];

const expectedTopLevelFields = {
  organization_contacts: [
    "legal_organization_name",
    "public_organization_name",
    "organization_type",
    "website",
    "primary_address",
    "main_phone",
    "public_program_name",
    "partner_slug_preference",
    "contacts"
  ],
  program_goals: [
    "primary_goal",
    "definition_of_success",
    "target_population",
    "expected_screening_volume",
    "expected_screening_period",
    "expected_packet_volume",
    "expected_packet_period",
    "program_model",
    "program_start_date",
    "program_end_date",
    "ongoing",
    "outreach_channels",
    "current_workflow",
    "known_barriers",
    "known_barriers_other",
    "partner_side_outcome_tracking"
  ],
  geography_audience_language_accessibility: [
    "jurisdictions",
    "service_area_description",
    "counties",
    "default_county",
    "out_of_area_policy",
    "primary_language",
    "enable_spanish",
    "additional_languages",
    "accessibility_accommodations",
    "community_specific_terminology",
    "population_restrictions"
  ],
  access_sponsorship_capacity: [
    "participant_access_model",
    "code_structure",
    "code_source_groups",
    "code_expiration",
    "code_level_capacity",
    "overage_approver_contact_id",
    "sponsored_screening_scope",
    "sponsored_packet_scope",
    "screening_allocation",
    "packet_credits",
    "recordshield_pathway",
    "overage_behavior",
    "overage_approver_authorization"
  ],
  brand_public_page: [
    "approved_organization_description",
    "program_headline",
    "program_subheadline",
    "primary_cta_label",
    "participant_support_copy",
    "partner_privacy_url",
    "accessibility_url",
    "impact_reporting_url"
  ],
  staff_dashboard_plan: [
    "planned_users",
    "primary_dashboard_administrator_row_id",
    "user_invitation_authority_role",
    "code_management_authority_role",
    "report_export_authority_role",
    "access_review_frequency",
    "training_status",
    "training_completed_at",
    "invitation_status",
    "membership_status"
  ],
  support_referrals_reporting: [
    "participant_support_email",
    "participant_support_phone",
    "partner_staff_support_contact_id",
    "legal_services_referral_organization",
    "referral_intake_method",
    "referral_intake_details",
    "contested_matter_procedure",
    "urgent_escalation_contact_id",
    "report_recipients",
    "reporting_cadence",
    "funder_required_metrics",
    "data_use_restrictions",
    "external_outcome_data_description",
    "legalease_technical_support_route"
  ],
  review_authorization: [
    "organization_information_accurate",
    "program_scope_approved_for_configuration",
    "brand_assets_authorized_for_use",
    "no_eligibility_or_outcome_guarantee_understood",
    "contested_and_representation_matters_follow_escalation_plan",
    "dashboard_users_authorized",
    "legalease_may_prepare_draft_implementation_materials",
    "approver_name",
    "approver_title",
    "approver_user_id",
    "approver_work_email",
    "authorization_timestamp",
    "terms_or_schema_version"
  ]
};

const expectedRowFields = [
  "contacts[].stable_row_id",
  "contacts[].role",
  "contacts[].name",
  "contacts[].title",
  "contacts[].organization",
  "contacts[].work_email",
  "contacts[].phone",
  "planned_users[].stable_row_id",
  "planned_users[].name",
  "planned_users[].work_email",
  "planned_users[].requested_role",
  "planned_users[].special_permissions",
  "planned_users[].training_attendee",
  "report_recipients[].stable_row_id",
  "report_recipients[].name",
  "report_recipients[].work_email"
];

const expectedReadOnlyFields = new Set([
  "sponsored_screening_scope",
  "sponsored_packet_scope",
  "screening_allocation",
  "packet_credits",
  "recordshield_pathway",
  "overage_behavior",
  "overage_approver_authorization",
  "training_status",
  "training_completed_at",
  "invitation_status",
  "membership_status",
  "legalease_technical_support_route",
  "approver_user_id",
  "approver_work_email",
  "authorization_timestamp",
  "terms_or_schema_version"
]);

function findField(key) {
  const field = ONBOARDING_SCHEMA_REGISTRY.find(
    (candidate) => candidate.key === key
  );
  assert.ok(field, `Missing schema definition for ${key}`);
  return field;
}

function fullPackage() {
  const programContactId = "11111111-1111-4111-8111-111111111111";
  const escalationContactId = "22222222-2222-4222-8222-222222222222";
  const plannedAdminId = "33333333-3333-4333-8333-333333333333";
  const reportRecipientId = "44444444-4444-4444-8444-444444444444";

  return {
    organization_contacts: {
      legal_organization_name: "  Community   Justice Alliance  ",
      public_organization_name: "Community Justice Alliance",
      organization_type: "legal_services",
      website: "https://partner.example.org",
      primary_address: "100 Main Street\nSuite 200",
      main_phone: "+1 (555) 010-1000",
      public_program_name: "Fresh Start Program",
      partner_slug_preference: "fresh-start",
      contacts: [
        {
          stable_row_id: programContactId,
          role: "program_operator",
          name: "Jordan Lee",
          title: "Program Director",
          organization: null,
          work_email: "JORDAN@EXAMPLE.ORG",
          phone: null
        },
        {
          stable_row_id: escalationContactId,
          role: "legal_services_referral_contact",
          name: "Morgan Reed",
          title: "Supervising Attorney",
          organization: "Community Justice Alliance",
          work_email: "morgan@example.org",
          phone: "+1 555 010 2000"
        }
      ]
    },
    program_goals: {
      primary_goal: "Help community members understand record-clearing options.",
      definition_of_success: "Deliver accessible screenings and useful referrals.",
      target_population: "Adults served by the partner’s workforce program.",
      expected_screening_volume: 250,
      expected_screening_period: "program year",
      expected_packet_volume: 75,
      expected_packet_period: "program year",
      program_model: "year_round",
      program_start_date: "2026-09-01",
      program_end_date: null,
      ongoing: true,
      outreach_channels: ["Workshops", "Partner website"],
      current_workflow: "Staff currently make warm referrals by email.",
      known_barriers: [],
      known_barriers_other: null,
      partner_side_outcome_tracking: "The partner tracks aggregate referrals."
    },
    geography_audience_language_accessibility: {
      jurisdictions: ["Mississippi"],
      service_area_description: "Statewide, with an initial focus on Hinds County.",
      counties: ["Hinds"],
      default_county: "Hinds",
      out_of_area_policy: "case_by_case",
      primary_language: "English",
      enable_spanish: true,
      additional_languages: [],
      accessibility_accommodations: "Phone support and accessible event locations.",
      community_specific_terminology: "",
      population_restrictions: "Adults enrolled in partner programs."
    },
    access_sponsorship_capacity: {
      participant_access_model: "open",
      code_expiration: null,
      code_level_capacity: null,
      overage_approver_contact_id: null
    },
    brand_public_page: {
      approved_organization_description:
        "Community Justice Alliance connects residents with trusted support.",
      program_headline: "A clearer path forward",
      program_subheadline: "Understand available record-clearing pathways.",
      primary_cta_label: "Start screening",
      participant_support_copy: "Contact the partner team for program support.",
      partner_privacy_url: "https://partner.example.org/privacy",
      accessibility_url: null,
      impact_reporting_url: null
    },
    staff_dashboard_plan: {
      planned_users: [
        {
          stable_row_id: plannedAdminId,
          name: "Jordan Lee",
          work_email: "jordan@example.org",
          requested_role: "partner_administrator",
          special_permissions: ["manage_codes", "manage_users"],
          training_attendee: true
        }
      ],
      primary_dashboard_administrator_row_id: plannedAdminId,
      user_invitation_authority_role: "partner_administrator",
      code_management_authority_role: "partner_administrator",
      report_export_authority_role: "partner_administrator",
      access_review_frequency: "Quarterly"
    },
    support_referrals_reporting: {
      participant_support_email: "support@example.org",
      participant_support_phone: null,
      partner_staff_support_contact_id: programContactId,
      legal_services_referral_organization: "Community Justice Alliance",
      referral_intake_method: "Warm email referral",
      referral_intake_details: "Staff send the approved referral summary.",
      contested_matter_procedure:
        "When a prosecutor objects, a contested hearing is scheduled, or individualized legal advocacy is required, the self-help path stops and the approved referral or escalation process applies.",
      urgent_escalation_contact_id: escalationContactId,
      report_recipients: [
        {
          stable_row_id: reportRecipientId,
          name: "Taylor Kim",
          work_email: "reports@example.org"
        }
      ],
      reporting_cadence: "Monthly",
      funder_required_metrics: [],
      data_use_restrictions: [],
      external_outcome_data_description: ""
    },
    review_authorization: {
      organization_information_accurate: true,
      program_scope_approved_for_configuration: true,
      brand_assets_authorized_for_use: true,
      no_eligibility_or_outcome_guarantee_understood: true,
      contested_and_representation_matters_follow_escalation_plan: true,
      dashboard_users_authorized: true,
      legalease_may_prepare_draft_implementation_materials: true,
      approver_name: "Jordan Lee",
      approver_title: "Program Director"
    }
  };
}

function validContext(overrides = {}) {
  return {
    commercialGateOutcome: "cleared_by_paid_invoice",
    workspaceStatus: "setup_in_progress",
    presentAssetCategories: ["transparent_logo"],
    unresolvedChangeRequests: [],
    procurementRequired: false,
    recordShieldInScope: false,
    overageApprovalRequired: false,
    ...overrides
  };
}

assert.equal(
  ONBOARDING_SCHEMA_VERSION,
  "rcap_partner_onboarding_phase_1_v1"
);
assert.deepEqual(ONBOARDING_SECTION_ORDER, expectedSectionOrder);
assert.deepEqual(ONBOARDING_FIELD_LIMITS, {
  nameOrTitle: 120,
  organizationOrProgramName: 200,
  email: 254,
  phone: 32,
  url: 2048,
  shortText: 500,
  longText: 5000,
  arrayRows: 100
});

const registryKeys = ONBOARDING_SCHEMA_REGISTRY.map((field) => field.key);
assert.equal(
  new Set(registryKeys).size,
  registryKeys.length,
  "Canonical field keys must be unique"
);

for (const [sectionKey, expectedKeys] of Object.entries(
  expectedTopLevelFields
)) {
  const actualKeys = ONBOARDING_SCHEMA_REGISTRY.filter(
    (field) => field.sectionKey === sectionKey && !field.parentCollection
  ).map((field) => field.key);
  assert.deepEqual(
    new Set(actualKeys),
    new Set(expectedKeys),
    `${sectionKey} field inventory drifted`
  );
}
assert.deepEqual(
  new Set(
    ONBOARDING_SCHEMA_REGISTRY.filter(
      (field) => field.parentCollection
    ).map((field) => field.key)
  ),
  new Set(expectedRowFields)
);

for (const field of ONBOARDING_SCHEMA_REGISTRY) {
  assert.ok(field.label, `${field.key} requires a partner-facing label`);
  assert.ok(field.dataType, `${field.key} requires a data type`);
  assert.ok(field.ownership, `${field.key} requires ownership`);
  assert.ok(field.requirement, `${field.key} requires requirement metadata`);
  assert.ok(field.normalization, `${field.key} requires normalization`);
  assert.ok(field.sensitivity, `${field.key} requires sensitivity`);
  assert.ok(
    Array.isArray(field.consumers),
    `${field.key} requires an artifact consumer map`
  );
  assert.ok(
    Number.isFinite(field.completionWeight),
    `${field.key} requires a completion weight`
  );
  if (expectedReadOnlyFields.has(field.key)) {
    assert.notEqual(
      field.ownership,
      "partner_editable",
      `${field.key} must not be partner editable`
    );
    assert.equal(field.completionWeight, 0);
  }
}

const recordShieldField = findField("recordshield_pathway");
assert.deepEqual(deriveRecordShieldScope("community-access-program"), {
  inScope: true,
  source: "selected_partner_package"
});
assert.deepEqual(deriveRecordShieldScope("unknown-package"), {
  inScope: false,
  source: "unavailable"
});
assert.deepEqual(deriveRecordShieldScope(null), {
  inScope: false,
  source: "unavailable"
});
assert.equal(
  isFieldActive(recordShieldField, fullPackage(), {
    recordShieldInScope: false
  }),
  false,
  "RecordShield-dependent fields must stay hidden when authoritative scope is unavailable."
);
assert.equal(
  isFieldActive(recordShieldField, fullPackage(), {
    recordShieldInScope: true
  }),
  true,
  "RecordShield-dependent fields must appear only when the selected authoritative package includes RecordShield."
);

for (const canonicalKey of [
  "public_organization_name",
  "website",
  "public_program_name",
  "enable_spanish"
]) {
  assert.equal(
    registryKeys.filter((key) => key === canonicalKey).length,
    1,
    `${canonicalKey} must have one authoritative registry entry`
  );
}
for (const forbiddenDuplicate of [
  "partner_website",
  "spanish_enabled",
  "organization_public_name",
  "program_public_name"
]) {
  assert.equal(registryKeys.includes(forbiddenDuplicate), false);
}

assert.equal(
  LEGALEASE_CONTROLLED_PUBLIC_PAGE_CONTENT.length,
  7,
  "LegalEase-controlled public content must remain explicit"
);
assert.deepEqual(
  ONBOARDING_ASSET_DEFINITIONS.map((asset) => asset.category),
  [
    "transparent_logo",
    "brand_guide",
    "hero_or_community_image",
    "organizer_or_program_lead_image",
    "approved_partner_description_attachment",
    "procurement_document",
    "other_approved_organizational_asset"
  ]
);
assert.equal(findField("approver_work_email").ownership, "system_derived");
assert.equal(findField("authorization_timestamp").ownership, "system_derived");
assert.equal(
  ONBOARDING_ASSET_DEFINITIONS.find(
    (asset) => asset.category === "transparent_logo"
  ).requirement,
  "required"
);
assert.equal(
  ONBOARDING_ASSET_DEFINITIONS.find(
    (asset) => asset.category === "procurement_document"
  ).requiredWhen,
  "procurement_is_required"
);
assert.ok(
  ONBOARDING_ASSET_DEFINITIONS.every(
    (asset) => !asset.allowedExtensions.includes("svg")
  ),
  "SVG must remain rejected in Phase 1"
);

const draft = validateOnboardingSection(
  "organization_contacts",
  {
    public_organization_name: "  Community   Justice Alliance  ",
    contacts: [
      {
        stable_row_id: "11111111-1111-4111-8111-111111111111",
        role: "program_operator",
        work_email: "PERSON@EXAMPLE.ORG"
      },
      {
        stable_row_id: "22222222-2222-4222-8222-222222222222",
        role: "executive_sponsor",
        work_email: "PERSON@EXAMPLE.ORG"
      }
    ]
  },
  "draft_save"
);
assert.equal(draft.success, true, "Draft save must allow incomplete fields");
assert.equal(
  draft.data.public_organization_name,
  "Community Justice Alliance"
);
assert.equal(draft.data.contacts[0].work_email, "person@example.org");

const canonicalJurisdictions = validateOnboardingSection(
  "geography_audience_language_accessibility",
  { jurisdictions: ["Mississippi", "DC"] },
  "draft_save"
);
assert.equal(canonicalJurisdictions.success, true);
assert.deepEqual(canonicalJurisdictions.data.jurisdictions, ["MS", "DC"]);
const unsupportedJurisdiction = validateOnboardingSection(
  "geography_audience_language_accessibility",
  { jurisdictions: ["Atlantis"] },
  "draft_save"
);
assert.equal(
  unsupportedJurisdiction.success,
  false,
  "Jurisdictions must come from the repository's canonical all-51 dataset."
);

const duplicatedContact = validateOnboardingSection(
  "organization_contacts",
  {
    contacts: [
      {
        stable_row_id: "11111111-1111-4111-8111-111111111111",
        role: "program_operator",
        work_email: "person@example.org"
      },
      {
        stable_row_id: "22222222-2222-4222-8222-222222222222",
        role: "program_operator",
        work_email: "PERSON@example.org"
      }
    ]
  },
  "draft_save"
);
assert.equal(duplicatedContact.success, false);
assert.ok(
  duplicatedContact.issues.some((entry) => entry.code === "duplicate")
);

const massAssignment = validateOnboardingSection(
  "access_sponsorship_capacity",
  {
    participant_access_model: "open",
    screening_allocation: 999999
  },
  "draft_save"
);
assert.equal(massAssignment.success, false);
assert.ok(
  massAssignment.issues.some(
    (entry) =>
      entry.fieldKey === "screening_allocation" &&
      entry.code === "read_only_field"
  )
);

const unsafeUrl = validateOnboardingSection(
  "brand_public_page",
  { partner_privacy_url: "javascript:alert(1)" },
  "draft_save"
);
assert.equal(unsafeUrl.success, false);

const controlCharacter = validateOnboardingSection(
  "brand_public_page",
  { program_headline: "Unsafe\u0000copy" },
  "draft_save"
);
assert.equal(controlCharacter.success, false);

const codePlanIncomplete = validateOnboardingSection(
  "access_sponsorship_capacity",
  { participant_access_model: "required_code" },
  "section_complete"
);
assert.equal(codePlanIncomplete.success, false);
assert.ok(
  codePlanIncomplete.issues.some(
    (entry) => entry.fieldKey === "code_structure"
  )
);
assert.ok(
  codePlanIncomplete.issues.some(
    (entry) => entry.fieldKey === "code_source_groups"
  )
);

const openAccessComplete = validateOnboardingSection(
  "access_sponsorship_capacity",
  { participant_access_model: "open" },
  "section_complete"
);
assert.equal(
  openAccessComplete.success,
  true,
  "Open access must not require code planning"
);

const packageInput = fullPackage();
const finalResult = validateFinalOnboardingSubmission(
  packageInput,
  validContext()
);
assert.equal(
  finalResult.success,
  true,
  finalResult.success
    ? undefined
    : JSON.stringify(finalResult.issues, null, 2)
);
assert.equal(
  finalResult.data.organization_contacts.public_organization_name,
  "Community Justice Alliance"
);
assert.equal(
  finalResult.data.organization_contacts.contacts[0].work_email,
  "jordan@example.org"
);

const completion = calculateOnboardingCompletion(
  finalResult.data,
  validContext()
);
assert.equal(completion.percentage, 100);
assert.equal(completion.missingRequirements.length, 0);

const finalBlocked = validateFinalOnboardingSubmission(
  packageInput,
  validContext({
    commercialGateOutcome: "blocked",
    presentAssetCategories: []
  })
);
assert.equal(finalBlocked.success, false);
assert.ok(
  finalBlocked.issues.some(
    (entry) => entry.code === "commercial_gate_blocked"
  )
);
assert.ok(
  finalBlocked.issues.some(
    (entry) => entry.code === "required_asset_missing"
  )
);

const falseAcknowledgment = fullPackage();
falseAcknowledgment.review_authorization.dashboard_users_authorized = false;
const invalidAuthorization = validateFinalOnboardingSubmission(
  falseAcknowledgment,
  validContext()
);
assert.equal(invalidAuthorization.success, false);
assert.ok(
  invalidAuthorization.issues.some(
    (entry) =>
      entry.fieldKey === "dashboard_users_authorized" &&
      entry.code === "missing_required"
  )
);

const summaryCommercial = deriveOnboardingSummary(
  {},
  validContext({
    commercialGateOutcome: "blocked",
    unresolvedChangeRequests: [
      {
        sectionKey: "program_goals",
        status: "open"
      }
    ],
    presentAssetCategories: []
  })
);
assert.equal(summaryCommercial.blockerCode, "commercial_gate_blocked");

const summaryChanges = deriveOnboardingSummary(
  {},
  validContext({
    unresolvedChangeRequests: [
      {
        sectionKey: "program_goals",
        status: "open"
      }
    ],
    presentAssetCategories: []
  })
);
assert.equal(summaryChanges.blockerCode, "partner_changes_requested");
assert.equal(summaryChanges.nextSectionKey, "program_goals");

const summaryAsset = deriveOnboardingSummary(
  {},
  validContext({ presentAssetCategories: [] })
);
assert.equal(summaryAsset.blockerCode, "required_asset_missing");
assert.equal(summaryAsset.missingAssetCategory, "transparent_logo");

const summaryIncomplete = deriveOnboardingSummary(
  {},
  validContext()
);
assert.equal(summaryIncomplete.blockerCode, "required_section_incomplete");
assert.equal(summaryIncomplete.nextSectionKey, "organization_contacts");

const summaryReady = deriveOnboardingSummary(
  finalResult.data,
  validContext()
);
assert.equal(summaryReady.blockerCode, null);
assert.equal(summaryReady.nextActionCode, "submit_for_review");

const completedSectionStatuses = Object.fromEntries(
  expectedSectionOrder.map((sectionKey) => [sectionKey, "submitted"])
);
const summaryPartnerResponded = deriveOnboardingSummary(
  finalResult.data,
  validContext({
    workspaceStatus: "ready_for_review",
    sectionStatuses: completedSectionStatuses,
    unresolvedChangeRequests: [
      {
        sectionKey: "program_goals",
        status: "partner_responded"
      }
    ]
  })
);
assert.equal(summaryPartnerResponded.blockerCode, null);
assert.equal(summaryPartnerResponded.nextActionCode, "await_legalease_review");
assert.equal(summaryPartnerResponded.nextActionOwner, "legalease");

const summarySectionNotCompleted = deriveOnboardingSummary(
  finalResult.data,
  validContext({
    sectionStatuses: {
      ...completedSectionStatuses,
      program_goals: "in_progress"
    }
  })
);
assert.equal(
  summarySectionNotCompleted.nextActionCode,
  "complete_section",
  "Field completion cannot bypass explicit section completion."
);
assert.equal(summarySectionNotCompleted.nextSectionKey, "program_goals");

assert.deepEqual(
  evaluateWorkspaceTransition({
    from: null,
    to: "draft",
    actor: "internal",
    cause: "workspace_created",
    commercialGateOutcome: "blocked"
  }),
  { allowed: true }
);
assert.equal(
  evaluateWorkspaceTransition({
    from: null,
    to: "draft",
    actor: "partner",
    cause: "workspace_created",
    commercialGateOutcome: "blocked"
  }).allowed,
  false
);
assert.equal(
  evaluateWorkspaceTransition({
    from: "setup_in_progress",
    to: "ready_for_review",
    actor: "partner",
    cause: "partner_submitted",
    commercialGateOutcome: "cleared_by_paid_invoice",
    partnerRequirementsComplete: true,
    hasUnresolvedChangeRequests: false
  }).allowed,
  true
);
assert.equal(
  evaluateWorkspaceTransition({
    from: "setup_in_progress",
    to: "ready_for_review",
    actor: "partner",
    cause: "partner_submitted",
    commercialGateOutcome: "blocked",
    partnerRequirementsComplete: true,
    hasUnresolvedChangeRequests: false
  }).allowed,
  false
);
assert.equal(
  evaluateWorkspaceTransition({
    from: "ready_for_review",
    to: "ready_to_launch",
    actor: "partner",
    cause: "review_approved",
    commercialGateOutcome: "cleared_by_paid_invoice",
    reviewApproved: true
  }).allowed,
  false
);
assert.equal(
  evaluateWorkspaceTransition({
    from: "ready_for_review",
    to: "ready_to_launch",
    actor: "internal",
    cause: "review_approved",
    commercialGateOutcome: "cleared_by_paid_invoice",
    reviewApproved: true,
    hasUnresolvedChangeRequests: false
  }).allowed,
  true
);
for (const protectedStatus of ["live", "paused"]) {
  assert.equal(
    evaluateWorkspaceTransition({
      from: protectedStatus,
      to: "closed",
      actor: "internal",
      cause: "workspace_closed",
      commercialGateOutcome: "cleared_by_paid_invoice"
    }).allowed,
    false,
    `Phase 1 must not expose transitions out of ${protectedStatus}`
  );
}

assert.equal(
  evaluateSectionTransition({
    from: "in_progress",
    to: "submitted",
    actor: "partner",
    cause: "partner_completed",
    sectionComplete: true
  }).allowed,
  true
);
assert.equal(
  evaluateSectionTransition({
    from: "in_progress",
    to: "submitted",
    actor: "partner",
    cause: "partner_completed",
    sectionComplete: false
  }).allowed,
  false
);
assert.equal(
  evaluateSectionTransition({
    from: "submitted",
    to: "approved",
    actor: "partner",
    cause: "section_approved",
    internalReasonPresent: true
  }).allowed,
  false
);
assert.equal(
  evaluateSectionTransition({
    from: "submitted",
    to: "needs_changes",
    actor: "internal",
    cause: "change_requested",
    partnerSafeInstructionsPresent: true
  }).allowed,
  true
);

console.log(
  `RCAP onboarding domain verification passed: ${ONBOARDING_SCHEMA_REGISTRY.length} fields, ${ONBOARDING_ASSET_DEFINITIONS.length} asset categories, ${ONBOARDING_SECTION_ORDER.length} sections.`
);
