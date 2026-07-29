/**
 * One synthetic partner, complete enough that every Phase 2A generator has real
 * data to render. It is the same shape `loadArtifactSourceInput()` returns, so a
 * generator that works here works against the real shared read.
 *
 * No real partner data, no PII, and nothing environment-specific.
 */
export function artifactSourceFixture() {
  return {
    workspace: {
      id: "10000000-0000-4000-8000-000000000001",
      partnerSlug: "demo-partner",
      aggregateVersion: 11,
      status: "ready_for_review",
      targetLaunchDate: "2026-09-15",
      commercialGateStatus: "cleared_by_paid_invoice",
      publicDisplayName: null,
      publicHeadline: null,
      publicSubheadline: null,
      supportInstructions: null,
      showPartnerLogo: true,
      showPoweredBy: true
    },
    partnerRecord: {
      organizationName: "Demo Justice Access Partner",
      programName: "Fresh Start Program",
      accessMode: "optional_code"
    },
    data: {
      organization_contacts: {
        legal_organization_name: "Demo Justice Access Partner, Inc.",
        public_organization_name: "Demo Justice Access Partner",
        organization_type: "nonprofit",
        website: "https://demo.test",
        primary_address: "1 Main Street",
        main_phone: "555-010-1234",
        public_program_name: "Fresh Start Program",
        partner_slug_preference: "demo-partner",
        contacts: [
          {
            stable_row_id: "c1000000-0000-4000-8000-000000000001",
            role: "program_operator",
            name: "Dana Ruiz",
            title: "Program Manager",
            work_email: "dana@demo.test",
            phone: "555-010-9999"
          },
          {
            stable_row_id: "c1000000-0000-4000-8000-000000000002",
            role: "technical_security_contact",
            name: "Sam Okafor",
            title: "IT Director",
            work_email: "sam@demo.test",
            phone: null
          },
          {
            stable_row_id: "c1000000-0000-4000-8000-000000000003",
            role: "media_contact",
            name: "Priya Raman",
            title: "Press Officer",
            work_email: "press@demo.test",
            phone: "555-010-7777"
          },
          {
            stable_row_id: "c1000000-0000-4000-8000-000000000004",
            role: "legal_services_referral_contact",
            name: "Alex Chen",
            title: "Staff Attorney",
            work_email: "alex@legalaid.test",
            phone: null
          }
        ]
      },
      program_goals: {
        primary_goal: "Clear eligible records for local residents.",
        definition_of_success: "500 residents complete a filing.",
        target_population: "Residents with old, eligible convictions.",
        expected_screening_volume: 800,
        expected_screening_period: "year",
        expected_packet_volume: 500,
        expected_packet_period: "year",
        program_model: "year_round",
        program_start_date: "2026-09-15",
        ongoing: true,
        outreach_channels: ["Community events"],
        current_workflow: "Walk-in clinic twice a month.",
        known_barriers: ["Transportation"],
        partner_side_outcome_tracking: "Quarterly survey."
      },
      geography_audience_language_accessibility: {
        jurisdictions: ["MS"],
        service_area_description: "Statewide, with clinics in two counties.",
        counties: ["Hinds", "Madison"],
        default_county: "Hinds",
        out_of_area_policy: "redirected",
        primary_language: "English",
        enable_spanish: true,
        additional_languages: ["Vietnamese"],
        accessibility_accommodations: "Interpreters on request.",
        community_specific_terminology: "We say neighbors, not clients.",
        population_restrictions: "Adults only."
      },
      access_sponsorship_capacity: {
        participant_access_model: "optional_code",
        code_structure: "limited_use",
        code_source_groups: ["Clinic sign-ups"],
        code_expiration: "2027-06-30",
        code_level_capacity: 250,
        overage_approver_contact_id: "c1000000-0000-4000-8000-000000000001",
        capacity_escalation_procedure:
          "At 80 percent of the cap the program operator is notified and decides whether to request more capacity.",
        capacity_escalation_response_expectation: "A decision within two business days"
      },
      brand_public_page: {
        approved_organization_description:
          "Demo Justice Access Partner helps neighbors clear old records.",
        program_headline: "Clear your record, for free",
        program_subheadline: "We help you prepare and file your own paperwork.",
        primary_cta_label: "See if you qualify",
        participant_support_copy:
          "Call or email us and a program staff member will help you.",
        partner_privacy_url: "https://demo.test/privacy",
        accessibility_url: "https://demo.test/accessibility",
        impact_reporting_url: "https://demo.test/impact"
      },
      staff_dashboard_plan: {
        planned_users: [
          {
            stable_row_id: "p1000000-0000-4000-8000-000000000001",
            name: "Dana Ruiz",
            work_email: "dana@demo.test",
            requested_role: "partner_administrator",
            special_permissions: ["manage_users", "export_reports"],
            training_attendee: true,
            training_status: "complete",
            training_completed_at: "2026-08-01T00:00:00.000Z",
            invitation_status: "planned",
            membership_status: "planned"
          },
          {
            stable_row_id: "p1000000-0000-4000-8000-000000000002",
            name: "Jordan Blake",
            work_email: "jordan@demo.test",
            requested_role: "program_staff",
            special_permissions: ["view_reports"],
            training_attendee: true,
            training_status: "scheduled",
            training_completed_at: null,
            invitation_status: "not_invited",
            membership_status: "planned"
          }
        ],
        primary_dashboard_administrator_row_id:
          "p1000000-0000-4000-8000-000000000001",
        user_invitation_authority_role: "partner_administrator",
        code_management_authority_role: "partner_administrator",
        report_export_authority_role: "reporting_viewer",
        access_review_frequency: "Every quarter"
      },
      support_referrals_reporting: {
        participant_support_email: "help@demo.test",
        participant_support_phone: "555-010-2222",
        partner_staff_support_contact_id: "c1000000-0000-4000-8000-000000000001",
        legal_services_referral_organization: "Capital Area Legal Aid",
        referral_intake_method: "Email referral form",
        referral_intake_details: "Send the referral form to intake@legalaid.test.",
        contested_matter_procedure:
          "The self-help path stops when a prosecutor objects, a contested hearing is scheduled, or individualized advocacy is needed, and the approved referral escalation applies.",
        urgent_escalation_contact_id: "c1000000-0000-4000-8000-000000000001",
        participant_support_response_expectation: "One business day",
        referral_response_expectation: "Three business days",
        contested_matter_response_expectation: "Same business day",
        privacy_request_route:
          "Privacy requests arrive at privacy@demo.test and are logged and answered by the privacy owner.",
        privacy_request_owner_contact_id: "c1000000-0000-4000-8000-000000000002",
        privacy_request_response_expectation: "Ten business days",
        security_concern_route:
          "Suspected security problems go to the IT director immediately by phone, then in writing.",
        security_concern_response_expectation: "Within four hours",
        media_inquiry_response_expectation: "One business day",
        program_pause_route:
          "The executive sponsor or the program operator may ask LegalEase to pause the program in writing.",
        program_pause_authority_contact_id: "c1000000-0000-4000-8000-000000000001",
        program_pause_response_expectation: "Two business days",
        report_recipients: [
          {
            stable_row_id: "r1000000-0000-4000-8000-000000000001",
            name: "Dana Ruiz",
            work_email: "dana@demo.test"
          }
        ],
        reporting_cadence: "Monthly",
        funder_required_metrics: ["Filings completed"],
        data_use_restrictions: ["No participant names in public reporting"],
        external_outcome_data_description: "Court disposition data, twice a year."
      },
      review_authorization: {
        organization_information_accurate: true,
        approver_name: "Dana Ruiz",
        approver_title: "Program Manager"
      }
    },
    readOnlyValues: {
      sponsored_screening_scope: "800 sponsored screenings",
      sponsored_packet_scope: "Sponsored packets follow the selected package",
      recordshield_pathway: "RecordShield included",
      overage_behavior: "Pauses at cap",
      screening_allocation: 800,
      packet_credits: 500,
      legalease_technical_support_route:
        "Partner staff contact LegalEase platform support through the partner dashboard support link. LegalEase does not provide legal advice or representation to participants."
    },
    assets: [
      {
        id: "a1000000-0000-4000-8000-000000000001",
        category: "transparent_logo",
        sha256Hex: null,
        lifecycleStatus: "active",
        reviewStatus: "approved"
      },
      {
        id: "a1000000-0000-4000-8000-000000000002",
        category: "hero_or_community_image",
        sha256Hex: null,
        lifecycleStatus: "active",
        reviewStatus: "approved"
      }
    ],
    sectionRevisions: {
      organization_contacts: 4,
      program_goals: 3,
      geography_audience_language_accessibility: 2,
      access_sponsorship_capacity: 2,
      brand_public_page: 3,
      staff_dashboard_plan: 2,
      support_referrals_reporting: 5,
      review_authorization: 1
    },
    collectionRevisions: {
      contacts: {},
      plannedUsers: {},
      reportRecipients: {}
    }
  };
}

/** Every raw machine value a partner-facing document must never show. */
export const FORBIDDEN_MACHINE_VALUES = [
  "year_round",
  "optional_code",
  "limited_use",
  "nonprofit",
  "partner_administrator",
  "program_staff",
  "reporting_viewer",
  "manage_users",
  "export_reports",
  "view_reports",
  "not_invited",
  "not_started",
  "in_progress",
  "response_data",
  "partner_onboarding_sections",
  "partner_onboarding_planned_users",
  "stable_row_id",
  "workspace_id",
  "snapshot_hash"
];
