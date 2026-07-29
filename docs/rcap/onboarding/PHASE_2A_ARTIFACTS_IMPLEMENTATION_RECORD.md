# RCAP Partner Onboarding Phase 2A artifact implementation record

## Baseline

- Base: PR #81 merge `9063a38c22868f6f5d56facef489fc0d86efc5fa` on `main`.
- Branch `feat/rcap-onboarding-artifacts`, worktree `/workspaces/legalease-partner-dashboard-clean-rcap-artifacts`, starting SHA `9063a38`.
- Lane B1 scope. Lane A (`feat/rcap-first-admin-provisioning`) owns first-admin provisioning and is not touched here.

## Scope change recorded

The original Lane B1 brief asked for two generators. Roger narrowed it mid-task: **only the Implementation Brief generator is implemented in this lane.** `operations_escalation_plan` is registered as an artifact type and renders as *not yet available in this release*, exactly like the other four. Its generator moves to B2.

## Artifact type registry, and how it maps onto Phase 1's consumer vocabulary

Phase 1 already ships an artifact-consumer taxonomy on every registry field
(`OnboardingArtifactConsumer` in `src/lib/partners/onboarding/types.ts`, and the
`consumers` property on all 110 entries of `ONBOARDING_SCHEMA_REGISTRY`). Phase 2A does
not invent a second taxonomy; it maps onto that one.

| Phase 2A `artifact_type` | Phase 1 consumer key(s) | Generator |
| --- | --- | --- |
| `implementation_brief` | `implementation_brief` | **this lane** |
| `operations_escalation_plan` | `operations_plan` | B2 |
| `dashboard_user_reporting_matrix` | `dashboard_user_matrix`, `reporting_package` | B2 |
| `staff_quick_start_guide` | `staff_quick_start` | B2 |
| `partner_launch_kit` | `launch_kit` | B2 |
| `co_branded_page_configuration` | `public_partner_page` | B2 |

Two Phase 1 consumer keys deliberately have no Phase 2A artifact type: `order_form`
(a Phase 1 commercial document) and `launch_readiness` (B2's launch-readiness *engine*,
which is a computation over artifacts rather than an artifact).

## Source-of-truth and invalidation table

This table is the specification for stale detection. It is generated from
`ONBOARDING_SCHEMA_REGISTRY` so that every path names a column or key path that exists
in the code today, plus hand-written rows for values that have no registry home.

Artifact codes: **IB** implementation brief · **OEP** operations and escalation plan ·
**DURM** dashboard user and reporting matrix · **SQSG** staff quick-start guide ·
**PLK** partner launch kit · **CBPC** co-branded page configuration.

`sections` below always means `public.partner_onboarding_sections`, whose row is
identified by `unique (workspace_id, section_key)` and which carries its own
`revision bigint` counter (enforced monotonic by the phase-43 trigger at line 279:
`if new.revision <> old.revision + 1 then ... raise`).

### Detection rule

A revision counter alone is **not** the test, because saving any field in a section
bumps that section's revision even when no field this artifact consumes changed. Detection
is two-stage:

1. **Trigger.** The recorded `source_section_revisions` / row revisions / asset
   identities differ from current. This is cheap and catches every candidate.
2. **Materiality.** The artifact's *projected* value set — only the fields whose
   `consumers` include this artifact type, run through the same
   `normalization` rules Phase 1 applies on save — is compared value by value against
   `normalized_snapshot` on the recorded version. Only a difference here is material.

Stage 2 is what makes the formatting exemption real and testable: because both sides are
compared after `trim` / `single_line` / `email_lowercase` / `date_only` normalization, a
re-save that changes only untrimmed whitespace or letter case in an email produces an
identical projection and is **non-material by construction**. That is the only
formatting-only exemption, and it is encoded in one place rather than per field.

Comparing whole snapshot blobs for equality is explicitly not used.

#### Organization and contacts — `organization_contacts`

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Legal organization name | `partner_onboarding_sections.response_data → organization_contacts → legal_organization_name` | IB | Material | `partner_onboarding_sections.revision` for `organization_contacts`, then value compare of this key |
| Public organization name | `partner_onboarding_sections.response_data → organization_contacts → public_organization_name` | IB, OEP, DURM, SQSG, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `organization_contacts`, then value compare of this key |
| Organization type | `partner_onboarding_sections.response_data → organization_contacts → organization_type` | IB, OEP | Material | `partner_onboarding_sections.revision` for `organization_contacts`, then value compare of this key |
| Organization website | `partner_onboarding_sections.response_data → organization_contacts → website` | IB, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `organization_contacts`, then value compare of this key |
| Primary address | `partner_onboarding_sections.response_data → organization_contacts → primary_address` | IB | Material | `partner_onboarding_sections.revision` for `organization_contacts`, then value compare of this key |
| Main phone | `partner_onboarding_sections.response_data → organization_contacts → main_phone` | IB, SQSG, CBPC | Material | `partner_onboarding_sections.revision` for `organization_contacts`, then value compare of this key |
| Public program name | `partner_onboarding_sections.response_data → organization_contacts → public_program_name` | IB, OEP, DURM, SQSG, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `organization_contacts`, then value compare of this key |
| Preferred public-page address | `partner_onboarding_sections.response_data → organization_contacts → partner_slug_preference` | CBPC | Material | `partner_onboarding_sections.revision` for `organization_contacts`, then value compare of this key |
| Program contacts | `partner_onboarding_sections.response_data → organization_contacts → contacts` | IB, OEP, DURM, SQSG | Material | `partner_onboarding_sections.revision` for `organization_contacts`, then value compare of this key |
| Contact record ID (per row) | `partner_onboarding_contacts.id` (surfaced as `stable_row_id` by `mapContact()`) | IB, OEP, DURM | Non-material — row identity only; a delete-and-recreate that yields identical projected content is not a change | row `partner_onboarding_contacts.revision` and `deleted_at`, then value compare of the projected collection |
| Contact role (per row) | `partner_onboarding_contacts.role` | IB, OEP | Material | row `partner_onboarding_contacts.revision` and `deleted_at`, then value compare of the projected collection |
| Contact name (per row) | `partner_onboarding_contacts.name` | IB, OEP | Material | row `partner_onboarding_contacts.revision` and `deleted_at`, then value compare of the projected collection |
| Contact title (per row) | `partner_onboarding_contacts.title` | IB, OEP | Material | row `partner_onboarding_contacts.revision` and `deleted_at`, then value compare of the projected collection |
| Contact organization (per row) | `partner_onboarding_contacts.organization` | IB, OEP | Material | row `partner_onboarding_contacts.revision` and `deleted_at`, then value compare of the projected collection |
| Work email (per row) | `partner_onboarding_contacts.work_email` | IB, OEP | Material | row `partner_onboarding_contacts.revision` and `deleted_at`, then value compare of the projected collection |
| Contact phone (per row) | `partner_onboarding_contacts.phone` | IB, OEP | Material | row `partner_onboarding_contacts.revision` and `deleted_at`, then value compare of the projected collection |

#### Program goals — `program_goals`

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Primary program goal | `partner_onboarding_sections.response_data → program_goals → primary_goal` | IB, OEP | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Definition of success | `partner_onboarding_sections.response_data → program_goals → definition_of_success` | IB, OEP, DURM | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Target population | `partner_onboarding_sections.response_data → program_goals → target_population` | IB, OEP, DURM, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Expected screening volume | `partner_onboarding_sections.response_data → program_goals → expected_screening_volume` | IB, OEP, DURM | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Screening volume period | `partner_onboarding_sections.response_data → program_goals → expected_screening_period` | IB, OEP, DURM | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Expected packet volume | `partner_onboarding_sections.response_data → program_goals → expected_packet_volume` | IB, OEP, DURM | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Packet volume period | `partner_onboarding_sections.response_data → program_goals → expected_packet_period` | IB, OEP, DURM | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Program model | `partner_onboarding_sections.response_data → program_goals → program_model` | IB, OEP, PLK | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Program start date | `partner_onboarding_sections.response_data → program_goals → program_start_date` | IB, OEP, DURM, PLK | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Program end date | `partner_onboarding_sections.response_data → program_goals → program_end_date` | IB, OEP, DURM, PLK | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| This is an ongoing program | `partner_onboarding_sections.response_data → program_goals → ongoing` | IB, OEP, DURM | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Outreach channels | `partner_onboarding_sections.response_data → program_goals → outreach_channels` | IB, OEP, PLK | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Current workflow | `partner_onboarding_sections.response_data → program_goals → current_workflow` | IB, OEP | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Known barriers | `partner_onboarding_sections.response_data → program_goals → known_barriers` | IB, OEP | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Other known barrier | `partner_onboarding_sections.response_data → program_goals → known_barriers_other` | IB, OEP | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |
| Partner-side outcome tracking | `partner_onboarding_sections.response_data → program_goals → partner_side_outcome_tracking` | OEP, DURM | Material | `partner_onboarding_sections.revision` for `program_goals`, then value compare of this key |

#### Geography, audience, language, accessibility — `geography_audience_language_accessibility`

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Jurisdictions | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → jurisdictions` | IB, OEP, DURM, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Service area description | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → service_area_description` | IB, OEP, DURM, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Counties | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → counties` | IB, OEP, DURM, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Default county | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → default_county` | OEP, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Out-of-area policy | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → out_of_area_policy` | OEP, SQSG, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Primary participant language | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → primary_language` | IB, OEP, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Enable Spanish participant experience | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → enable_spanish` | IB, OEP, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Additional languages | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → additional_languages` | IB, OEP, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Accessibility accommodations | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → accessibility_accommodations` | IB, OEP, SQSG, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Community-specific terminology | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → community_specific_terminology` | IB, OEP, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |
| Population restrictions | `partner_onboarding_sections.response_data → geography_audience_language_accessibility → population_restrictions` | IB, OEP, SQSG, CBPC | Material | `partner_onboarding_sections.revision` for `geography_audience_language_accessibility`, then value compare of this key |

#### Access, sponsorship, capacity — `access_sponsorship_capacity`

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Participant access model | `partner_onboarding_sections.response_data → access_sponsorship_capacity → participant_access_model` | IB, OEP, SQSG | Material | `partner_onboarding_sections.revision` for `access_sponsorship_capacity`, then value compare of this key |
| Planned code structure | `partner_onboarding_sections.response_data → access_sponsorship_capacity → code_structure` | IB, OEP, SQSG | Material | `partner_onboarding_sections.revision` for `access_sponsorship_capacity`, then value compare of this key |
| Planned code source groups | `partner_onboarding_sections.response_data → access_sponsorship_capacity → code_source_groups` | IB, OEP, DURM | Material | `partner_onboarding_sections.revision` for `access_sponsorship_capacity`, then value compare of this key |
| Planned code expiration | `partner_onboarding_sections.response_data → access_sponsorship_capacity → code_expiration` | OEP, SQSG | Material | `partner_onboarding_sections.revision` for `access_sponsorship_capacity`, then value compare of this key |
| Planned code-level capacity | `partner_onboarding_sections.response_data → access_sponsorship_capacity → code_level_capacity` | OEP, DURM | Material | `partner_onboarding_sections.revision` for `access_sponsorship_capacity`, then value compare of this key |
| Overage approver | `partner_onboarding_sections.response_data → access_sponsorship_capacity → overage_approver_contact_id` | OEP | Material | `partner_onboarding_sections.revision` for `access_sponsorship_capacity`, then value compare of this key |
| Sponsored screening scope | derived — see *Values with no section-payload home* below | IB, OEP | Material | value compare only (no revision counter covers it) |
| Sponsored packet scope | derived — see *Values with no section-payload home* below | IB, OEP | Material | value compare only (no revision counter covers it) |
| Screening allocation | derived — see *Values with no section-payload home* below | OEP, DURM | Material | value compare only (no revision counter covers it) |
| Packet credits | derived — see *Values with no section-payload home* below | OEP, DURM | Material | value compare only (no revision counter covers it) |
| RecordShield pathway | derived — see *Values with no section-payload home* below | IB, OEP | Material | value compare only (no revision counter covers it) |
| Overage behavior | derived — see *Values with no section-payload home* below | OEP | Material | value compare only (no revision counter covers it) |
| Overage approver authorization | derived — see *Values with no section-payload home* below | OEP | Material | value compare only (no revision counter covers it) |

#### Brand and public page — `brand_public_page`

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Approved organization description | `partner_onboarding_sections.response_data → brand_public_page → approved_organization_description` | IB, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `brand_public_page`, then value compare of this key |
| Program headline | `partner_onboarding_sections.response_data → brand_public_page → program_headline` | IB, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `brand_public_page`, then value compare of this key |
| Program subheadline | `partner_onboarding_sections.response_data → brand_public_page → program_subheadline` | IB, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `brand_public_page`, then value compare of this key |
| Primary action label | `partner_onboarding_sections.response_data → brand_public_page → primary_cta_label` | PLK, CBPC | Material | `partner_onboarding_sections.revision` for `brand_public_page`, then value compare of this key |
| Participant support copy | `partner_onboarding_sections.response_data → brand_public_page → participant_support_copy` | OEP, SQSG, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `brand_public_page`, then value compare of this key |
| Partner privacy URL | `partner_onboarding_sections.response_data → brand_public_page → partner_privacy_url` | CBPC | Material | `partner_onboarding_sections.revision` for `brand_public_page`, then value compare of this key |
| Accessibility URL | `partner_onboarding_sections.response_data → brand_public_page → accessibility_url` | CBPC | Material | `partner_onboarding_sections.revision` for `brand_public_page`, then value compare of this key |
| Impact reporting URL | `partner_onboarding_sections.response_data → brand_public_page → impact_reporting_url` | DURM, CBPC | Material | `partner_onboarding_sections.revision` for `brand_public_page`, then value compare of this key |

#### Staff dashboard plan — `staff_dashboard_plan`

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Planned dashboard users | `partner_onboarding_sections.response_data → staff_dashboard_plan → planned_users` | OEP, DURM, SQSG | Material | `partner_onboarding_sections.revision` for `staff_dashboard_plan`, then value compare of this key |
| Planned user record ID (per row) | `partner_onboarding_planned_users.id` (surfaced as `stable_row_id` by `mapPlannedUser()`) | OEP, DURM, SQSG | Non-material — row identity only; a delete-and-recreate that yields identical projected content is not a change | row `partner_onboarding_planned_users.revision` and `deleted_at`, then value compare of the projected collection |
| Planned user name (per row) | `partner_onboarding_planned_users.name` | OEP, DURM, SQSG | Material | row `partner_onboarding_planned_users.revision` and `deleted_at`, then value compare of the projected collection |
| Planned user work email (per row) | `partner_onboarding_planned_users.work_email` | OEP, DURM, SQSG | Material | row `partner_onboarding_planned_users.revision` and `deleted_at`, then value compare of the projected collection |
| Requested role (per row) | `partner_onboarding_planned_users.requested_role` | OEP, DURM, SQSG | Material | row `partner_onboarding_planned_users.revision` and `deleted_at`, then value compare of the projected collection |
| Special permissions (per row) | `partner_onboarding_planned_users.special_permissions` | OEP, DURM, SQSG | Material | row `partner_onboarding_planned_users.revision` and `deleted_at`, then value compare of the projected collection |
| Training attendee (per row) | `partner_onboarding_planned_users.training_attendee` | OEP, DURM, SQSG | Material | row `partner_onboarding_planned_users.revision` and `deleted_at`, then value compare of the projected collection |
| Primary dashboard administrator | `partner_onboarding_sections.response_data → staff_dashboard_plan → primary_dashboard_administrator_row_id` | OEP, DURM, SQSG | Material | `partner_onboarding_sections.revision` for `staff_dashboard_plan`, then value compare of this key |
| User invitation authority role | `partner_onboarding_sections.response_data → staff_dashboard_plan → user_invitation_authority_role` | OEP, DURM, SQSG | Material | `partner_onboarding_sections.revision` for `staff_dashboard_plan`, then value compare of this key |
| Code management authority role | `partner_onboarding_sections.response_data → staff_dashboard_plan → code_management_authority_role` | OEP, DURM, SQSG | Material | `partner_onboarding_sections.revision` for `staff_dashboard_plan`, then value compare of this key |
| Report export authority role | `partner_onboarding_sections.response_data → staff_dashboard_plan → report_export_authority_role` | OEP, DURM, SQSG | Material | `partner_onboarding_sections.revision` for `staff_dashboard_plan`, then value compare of this key |
| Access review frequency | `partner_onboarding_sections.response_data → staff_dashboard_plan → access_review_frequency` | OEP, DURM, SQSG | Material | `partner_onboarding_sections.revision` for `staff_dashboard_plan`, then value compare of this key |
| Training status | derived — see *Values with no section-payload home* below | OEP, DURM, SQSG | Material | value compare only (no revision counter covers it) |
| Training completed at | derived — see *Values with no section-payload home* below | OEP, DURM, SQSG | Material | value compare only (no revision counter covers it) |
| Invitation status | derived — see *Values with no section-payload home* below | OEP, DURM, SQSG | Material | value compare only (no revision counter covers it) |
| Membership status | derived — see *Values with no section-payload home* below | OEP, DURM, SQSG | Material | value compare only (no revision counter covers it) |

#### Support, referrals, reporting — `support_referrals_reporting`

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Participant support email | `partner_onboarding_sections.response_data → support_referrals_reporting → participant_support_email` | OEP, SQSG, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Participant support phone | `partner_onboarding_sections.response_data → support_referrals_reporting → participant_support_phone` | OEP, SQSG, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Partner staff support contact | `partner_onboarding_sections.response_data → support_referrals_reporting → partner_staff_support_contact_id` | OEP, SQSG | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Legal services referral organization | `partner_onboarding_sections.response_data → support_referrals_reporting → legal_services_referral_organization` | IB, OEP, SQSG, PLK, CBPC | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Referral intake method | `partner_onboarding_sections.response_data → support_referrals_reporting → referral_intake_method` | IB, OEP, SQSG | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Referral intake details | `partner_onboarding_sections.response_data → support_referrals_reporting → referral_intake_details` | IB, OEP, SQSG | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Contested-matter procedure | `partner_onboarding_sections.response_data → support_referrals_reporting → contested_matter_procedure` | IB, OEP, SQSG | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Urgent escalation contact | `partner_onboarding_sections.response_data → support_referrals_reporting → urgent_escalation_contact_id` | OEP, SQSG | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Report recipients | `partner_onboarding_sections.response_data → support_referrals_reporting → report_recipients` | OEP, DURM | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Report recipient record ID (per row) | `partner_onboarding_report_recipients.id` (surfaced as `stable_row_id` by `mapRecipient()`) | OEP, DURM | Non-material — row identity only; a delete-and-recreate that yields identical projected content is not a change | row `partner_onboarding_report_recipients.revision` and `deleted_at`, then value compare of the projected collection |
| Report recipient name (per row) | `partner_onboarding_report_recipients.name` | OEP, DURM | Material | row `partner_onboarding_report_recipients.revision` and `deleted_at`, then value compare of the projected collection |
| Report recipient work email (per row) | `partner_onboarding_report_recipients.work_email` | OEP, DURM | Material | row `partner_onboarding_report_recipients.revision` and `deleted_at`, then value compare of the projected collection |
| Reporting cadence | `partner_onboarding_sections.response_data → support_referrals_reporting → reporting_cadence` | OEP, DURM | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Funder-required metrics | `partner_onboarding_sections.response_data → support_referrals_reporting → funder_required_metrics` | OEP, DURM | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| Data-use restrictions | `partner_onboarding_sections.response_data → support_referrals_reporting → data_use_restrictions` | IB, OEP, DURM | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| External outcome data description | `partner_onboarding_sections.response_data → support_referrals_reporting → external_outcome_data_description` | OEP, DURM | Material | `partner_onboarding_sections.revision` for `support_referrals_reporting`, then value compare of this key |
| LegalEase technical support route | derived — see *Values with no section-payload home* below | OEP, SQSG | Material | value compare only (no revision counter covers it) |

#### Review and authorization — `review_authorization`

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Organization information is accurate | `partner_onboarding_sections.response_data → review_authorization → organization_information_accurate` | IB | Material | `partner_onboarding_sections.revision` for `review_authorization`, then value compare of this key |
| Program scope is approved for configuration | `partner_onboarding_sections.response_data → review_authorization → program_scope_approved_for_configuration` | IB | Material | `partner_onboarding_sections.revision` for `review_authorization`, then value compare of this key |
| Brand assets are authorized for use | `partner_onboarding_sections.response_data → review_authorization → brand_assets_authorized_for_use` | IB | Material | `partner_onboarding_sections.revision` for `review_authorization`, then value compare of this key |
| No eligibility or outcome guarantee is understood | `partner_onboarding_sections.response_data → review_authorization → no_eligibility_or_outcome_guarantee_understood` | IB | Material | `partner_onboarding_sections.revision` for `review_authorization`, then value compare of this key |
| Contested and representation matters follow the escalation plan | `partner_onboarding_sections.response_data → review_authorization → contested_and_representation_matters_follow_escalation_plan` | IB | Material | `partner_onboarding_sections.revision` for `review_authorization`, then value compare of this key |
| Planned dashboard users are authorized | `partner_onboarding_sections.response_data → review_authorization → dashboard_users_authorized` | IB | Material | `partner_onboarding_sections.revision` for `review_authorization`, then value compare of this key |
| LegalEase may prepare draft implementation materials | `partner_onboarding_sections.response_data → review_authorization → legalease_may_prepare_draft_implementation_materials` | IB | Material | `partner_onboarding_sections.revision` for `review_authorization`, then value compare of this key |
| Approver name | `partner_onboarding_sections.response_data → review_authorization → approver_name` | IB | Material | `partner_onboarding_sections.revision` for `review_authorization`, then value compare of this key |
| Approver title | `partner_onboarding_sections.response_data → review_authorization → approver_title` | IB | Material | `partner_onboarding_sections.revision` for `review_authorization`, then value compare of this key |
| Approver user ID | derived — see *Values with no section-payload home* below | IB | Material | value compare only (no revision counter covers it) |
| Approver work email | derived — see *Values with no section-payload home* below | IB | Material | value compare only (no revision counter covers it) |
| Authorization timestamp | derived — see *Values with no section-payload home* below | IB | Material | value compare only (no revision counter covers it) |
| Terms or schema version | derived — see *Values with no section-payload home* below | IB | Material | value compare only (no revision counter covers it) |

### Values with no section-payload home

These appear in `ONBOARDING_SCHEMA_REGISTRY` as `internal_read_only` or `system_derived`
`internal_value` entries, so the registry lists them as artifact consumers, but they are
**not stored in `sections.response_data`**. They are read from elsewhere at projection
time. None of them is covered by any revision counter, so each is detected by value
comparison against `normalized_snapshot` only.

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Sponsored screening scope | derived by `deriveRecordShieldScope()` (`src/lib/partners/onboarding/scope.ts`) from `partner_records.selected_package_id` + the component registry in `src/lib/partners/packages.ts` | IB | Material | value compare |
| Sponsored packet scope | same derivation as above | IB | Material | value compare |
| RecordShield pathway | same derivation as above | IB | Material | value compare |
| Screening allocation | `partner_entitlement.screenings_allowed` | OEP, DURM | Material | value compare |
| Packet credits | `partner_entitlement` packet-cap columns | OEP, DURM | Material | value compare |
| Overage behaviour | `partner_entitlement.overage_enabled`, `partner_entitlement.pause_at_cap` | OEP | Material | value compare |
| Overage approver authorization | `partner_entitlement` + resolved contact row | OEP | Material | value compare |
| Training status / completed at | `partner_onboarding_planned_users.training_status`, `.training_completed_at` | OEP, DURM, SQSG | Material | value compare per row |
| Invitation status | `partner_onboarding_planned_users.invitation_status` | OEP, DURM, SQSG | Material | value compare per row — **Lane A coupling, see below** |
| Membership status | `partner_onboarding_planned_users.membership_status` | OEP, DURM, SQSG | Material | value compare per row — **Lane A coupling, see below** |
| LegalEase technical support route | constant in the projection layer, not partner data | OEP, SQSG | Non-material — LegalEase-controlled boilerplate with no per-partner value; changing it is a template change, handled by the template version, not by staleness | template version compare |
| Approver user ID / work email / authorization timestamp / terms version | `partner_onboarding_authorizations` (append-only; `unique (workspace_id, request_id)`) | IB | Material | newest authorization row `id` compare |

### Workspace-level and out-of-aggregate values

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| **Target launch date** | `partner_onboarding.target_launch_date` (added by phase-43 line 27) | IB, OEP, DURM, SQSG, PLK, CBPC | Material | value compare, with `partner_onboarding.aggregate_version` as the trigger. **This is acceptance step 5.** |
| Target launch date reason / changed at / changed by | `partner_onboarding.target_launch_date_reason`, `.target_launch_date_changed_at`, `.target_launch_date_changed_by` | none | Non-material — internal audit metadata; never rendered into a partner document, and the date itself already invalidates | not compared |
| Commercial gate status | `partner_onboarding.commercial_gate_status` | IB, OEP | Material | value compare + `aggregate_version` trigger |
| Public display name | `partner_onboarding.public_display_name` | CBPC, IB | Material | value compare — **LegalEase-edited, see flags** |
| Public headline | `partner_onboarding.public_headline` | CBPC, IB | Material | value compare — **LegalEase-edited** |
| Public subheadline | `partner_onboarding.public_subheadline` | CBPC, IB | Material | value compare — **LegalEase-edited** |
| Support instructions | `partner_onboarding.support_instructions` | CBPC, OEP | Material | value compare — **LegalEase-edited** |
| Show partner logo / show powered-by | `partner_onboarding.show_partner_logo`, `.show_powered_by` | CBPC | Material | value compare — **LegalEase-edited** |
| Live participant access mode | `partner_records.access_mode` | OEP, CBPC | Material | value compare — distinct from the *planned* `participant_access_model` in the section payload; see flags |
| Section approval / waiver status | `partner_onboarding_sections.status`, `.approved_at`, `.waived_at` | none | Non-material — workflow state, not document content. A LegalEase approval changes no rendered value | not compared |
| Open change request | `partner_onboarding_change_requests.status` | none | Non-material — workflow state. It blocks *approval* of an artifact through the blocker rule, but does not make an existing version stale | not compared |

### Assets

Assets are not registry fields; they come from `ONBOARDING_ASSET_DEFINITIONS`
(`src/lib/partners/onboarding/schema.ts`) and live in `public.partner_onboarding_assets`.
That table has **no `revision` column**, so detection uses content identity instead.

| Field (label shown in the portal) | Where the value actually lives | Invalidates | Material? | Detected by |
| --- | --- | --- | --- | --- |
| Transparent logo | `partner_onboarding_assets` where `category = 'transparent_logo'` | IB, SQSG, PLK, CBPC | Material | tuple compare of `(id, sha256_hex, lifecycle_status, review_status, deleted_at)` |
| Brand guide | `category = 'brand_guide'` | IB, PLK, CBPC | Material | same tuple compare |
| Hero or community image | `category = 'hero_or_community_image'` | PLK, CBPC | Material | same tuple compare |
| Organizer or program lead image | `category = 'organizer_or_program_lead_image'` | PLK, CBPC | Material | same tuple compare |
| Approved partner description attachment | `category = 'approved_partner_description_attachment'` | IB, PLK, CBPC | Material | same tuple compare |
| Procurement document | `category = 'procurement_document'` | IB | Material | same tuple compare |
| Other approved organizational asset | `category = 'other_approved_organizational_asset'` | IB, PLK | Material | same tuple compare |
| Asset `object_path` / `safe_filename` | `partner_onboarding_assets.object_path`, `.safe_filename` | none | Non-material — server-generated storage location; the bytes are identified by `sha256_hex`, and a re-path with an identical hash is the same asset | not compared |

### Fields named in the brief that have **no home in the current schema**

Recorded explicitly rather than invented or dropped. All of these belong to the Operations
and Escalation Plan, whose generator is deferred to B2; B2 must add these to
`ONBOARDING_SCHEMA_REGISTRY` before it can generate a complete OEP.

| Field named in the brief | Status | Nearest existing value |
| --- | --- | --- |
| Media contact | **No home.** `CONTACT_ROLES` in `src/lib/partners/onboarding/types.ts` has seven roles and none is media or press | `communications_lead` is the closest, but it is a program-communications role, not a press contact |
| Privacy request route | **No home.** No field or contact role names a privacy-request destination | `technical_security_contact` exists for security only |
| Security concern route | **Partial.** The contact exists; the *route* (how to reach it, expected response) does not | `contacts` row with `role = 'technical_security_contact'` |
| Program pause route | **No home.** `partner_onboarding.paused_at` records that a pause happened; no field records who may request one or how | none |
| Capacity escalation | **Partial.** The approver and the cap exist; the escalation procedure text does not | `access_sponsorship_capacity.overage_approver_contact_id`, `.code_level_capacity` |
| Owner and response expectations per route | **No home.** No response-time or ownership field exists on any contact | none |
| General participant support | Exists | `support_referrals_reporting.participant_support_email`, `.participant_support_phone` |
| Technical support | Exists | `legalease_technical_support_route` (LegalEase constant) |
| Legal-services referral | Exists | `legal_services_referral_organization`, `referral_intake_method`, `referral_intake_details` |
| Prosecutor objection / contested hearing procedure | Exists | `support_referrals_reporting.contested_matter_procedure` |

### Fields where a partner edit and a LegalEase edit must be treated differently

1. **Public page copy is split across two owners.** `brand_public_page.*` in
   `sections.response_data` is partner-editable. `partner_onboarding.public_display_name`,
   `.public_headline`, `.public_subheadline`, `.support_instructions`,
   `.show_partner_logo`, `.show_powered_by` are the phase-42 LegalEase-controlled page
   configuration. A partner edit to the former invalidates the partner's own factual and
   branding approval; a LegalEase edit to the latter must **not** silently clear a partner
   approval of content the partner never controlled. The review row records
   `reviewer_type`, so invalidation is scoped to the approval whose owner owns the changed
   value.
2. **`LEGALEASE_CONTROLLED_PUBLIC_PAGE_CONTENT`** (`src/lib/partners/onboarding/schema.ts`,
   line 152) enumerates seven categories — legal disclaimers, the self-help and service
   boundary language, eligibility and outcome claims, platform privacy and security
   representations, payment logic, participant routing, platform legal links — that the
   partner may never approve or edit. A change to any of these invalidates the **LegalEase**
   approval only.
3. **Target launch date is LegalEase-only.** It is writable solely through
   `rcap_service_review_onboarding` with `action = 'target_launch_date'`; there is no
   partner path to it. It nonetheless invalidates the partner's approval too, because the
   date is rendered in the partner-visible document.
4. **Internal read-only scope values** (`sponsored_screening_scope`,
   `sponsored_packet_scope`, `recordshield_pathway`, allocation and credits) are LegalEase-
   controlled and invalidate both approvals.
5. **Planned-user `invitation_status` and `membership_status`** are written by
   provisioning, which is **Lane A's** territory. This lane reads them for the DURM
   projection only and writes nothing. B2 should confirm the final column semantics with
   Lane A before generating the matrix.
6. **Section approval and waiver by LegalEase** change `sections.status` but no rendered
   value, and so are non-material by rule 2 of the detection rule above.
