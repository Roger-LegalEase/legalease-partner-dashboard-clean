-- Forward-only step 1 of 8 in the Production schema upgrade.
--
-- Start: supabase/migrations/20260728213131_remote_schema.sql, the recovered and
--        validated Production baseline (44 tables, 35 functions, 5 views, 44 RLS
--        tables, 1 forced-RLS table, 73 policies).
-- End:   the accepted repository schema — that baseline with every repository SQL
--        input in supabase/ applied on top, in the order
--        scripts/rcap-schema-upgrade-lab.sh implements.
--
-- The chain was derived by diffing the two locally built databases, not by hand,
-- and is proven by replay in scripts/verify-rcap-production-schema-upgrade.mjs.
-- Steps are split by dependency order: tables, functions, constraints and indexes,
-- views, triggers, RLS and policies, grants, storage.
--
-- Adds the 29 new tables and every new column and column default. Nothing here
-- drops a table or a column, and no column type changes.

create table "public"."consumer_packet_payment_consumption" (
    "id" uuid not null default gen_random_uuid(),
    "consumer_briefcase_item_id" uuid not null,
    "consumer_auth_user_id" uuid not null,
    "provider_event_id" text,
    "person_id" uuid,
    "matter_id" uuid not null,
    "first_render_job_id" uuid not null,
    "consumption_unit_hash" text not null,
    "created_at" timestamp with time zone not null default now(),
    "product_id" text not null,
    "checkout_session_id" text not null,
    "amount_cents" integer not null,
    "currency" text not null
);

create table "public"."packet_credit_ledger" (
    "id" uuid not null default gen_random_uuid(),
    "entitlement_id" uuid,
    "partner_id" uuid,
    "person_id" uuid,
    "matter_id" uuid,
    "render_job_id" uuid not null,
    "event_type" text not null,
    "consumption_unit_hash" text not null,
    "created_at" timestamp with time zone not null default now(),
    "metadata" jsonb not null default '{}'::jsonb
);

create table "public"."packet_delivery_events" (
    "id" uuid not null default gen_random_uuid(),
    "render_job_id" uuid not null,
    "event_type" text not null,
    "actor_user_id" uuid,
    "request_context" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
);

create table "public"."packet_render_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "packet_id" uuid not null,
    "route_id" text not null,
    "renderer_kind" text not null,
    "source_sha256" text,
    "profile_id" text not null,
    "profile_version" text not null,
    "input_hash" text not null,
    "status" text not null default 'queued'::text,
    "attempt_count" integer not null default 0,
    "output_storage_path" text,
    "output_sha256" text,
    "normalized_output_sha256" text,
    "page_count" integer,
    "error_code" text,
    "claimed_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "claimed_at" timestamp with time zone,
    "rendering_at" timestamp with time zone,
    "validating_at" timestamp with time zone,
    "artifact_validated_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "renderer_version" text not null default '0.0.0'::text,
    "briefcase_item_id" uuid,
    "partner_id" uuid,
    "person_id" uuid,
    "matter_id" uuid,
    "max_attempts" integer not null default 5,
    "next_attempt_at" timestamp with time zone,
    "claim_expires_at" timestamp with time zone,
    "fencing_token" uuid,
    "failure_disposition" text,
    "last_error_detail" text,
    "manual_requeue_authorized_by" text,
    "output_byte_count" integer,
    "container_digest" text,
    "delivery_eligibility" text not null default 'not_evaluated'::text,
    "accounting_result" text,
    "credit_ledger_id" uuid,
    "consumer_briefcase_item_id" uuid,
    "consumer_auth_user_id" uuid
);

create table "public"."partner_access_codes" (
    "id" uuid not null default gen_random_uuid(),
    "partner_slug" text not null,
    "code_hash" text not null,
    "code_display_hint" text,
    "campaign_name" text,
    "description" text,
    "code_type" text not null default 'shared'::text,
    "max_uses" integer,
    "uses_count" integer not null default 0,
    "is_active" boolean not null default true,
    "starts_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_used_at" timestamp with time zone
);

create table "public"."partner_email_deliveries" (
    "id" uuid not null default gen_random_uuid(),
    "partner_slug" text not null,
    "email_type" text not null,
    "recipient_email" text,
    "recipient_name" text,
    "subject" text not null,
    "status" text not null default 'draft'::text,
    "provider" text,
    "provider_message_id" text,
    "preview_url" text,
    "sent_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "error_message" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);

create table "public"."partner_onboarding" (
    "id" uuid not null default gen_random_uuid(),
    "partner_slug" text not null,
    "status" text not null default 'draft'::text,
    "agreement_status" text not null default 'not_sent'::text,
    "agreement_date" date,
    "billing_contact_name" text,
    "billing_contact_email" text,
    "package_name" text,
    "internal_billing_notes" text,
    "internal_notes" text,
    "public_display_name" text,
    "public_headline" text,
    "public_subheadline" text,
    "support_instructions" text,
    "show_partner_logo" boolean not null default true,
    "show_powered_by" boolean not null default true,
    "profile_ready" boolean not null default false,
    "billing_ready" boolean not null default false,
    "access_controls_ready" boolean not null default false,
    "landing_page_ready" boolean not null default false,
    "admin_users_ready" boolean not null default false,
    "launch_materials_ready" boolean not null default false,
    "training_review_ready" boolean not null default false,
    "internal_approved_at" timestamp with time zone,
    "launched_at" timestamp with time zone,
    "paused_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "partner_record_id" uuid,
    "schema_version" text not null default 'rcap-partner-onboarding-v1'::text,
    "aggregate_version" bigint not null default 1,
    "completion_percentage" integer not null default 0,
    "blocker_code" text,
    "next_action_code" text,
    "next_action_owner" text not null default 'partner'::text,
    "target_launch_date" date,
    "target_launch_date_reason" text,
    "target_launch_date_changed_at" timestamp with time zone,
    "target_launch_date_changed_by" uuid,
    "commercial_gate_status" text not null default 'blocked'::text,
    "commercial_gate_evidence_reference" text,
    "commercial_gate_override_reason" text,
    "commercial_gate_changed_at" timestamp with time zone,
    "commercial_gate_changed_by" uuid,
    "submitted_at" timestamp with time zone,
    "submitted_by" uuid,
    "submission_request_id" uuid,
    "submitted_schema_version" text,
    "internal_approved_by" uuid,
    "internal_approval_reason" text,
    "closed_at" timestamp with time zone,
    "closed_by" uuid,
    "closed_reason" text,
    "last_meaningful_activity_at" timestamp with time zone,
    "launch_readiness_state" text
);

create table "public"."partner_onboarding_activity" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "event_type" text not null,
    "section_key" text,
    "status_code" text,
    "summary_code" text not null,
    "owner_type" text not null default 'partner'::text,
    "actor_user_id" uuid,
    "request_id" uuid,
    "dedupe_key" text,
    "occurred_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "artifact_version_id" uuid
);

create table "public"."partner_onboarding_agreements" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "agreement_type" text not null,
    "status" text not null default 'not_required'::text,
    "is_required" boolean not null default false,
    "partner_safe_detail" text,
    "finalized_asset_id" uuid,
    "internal_reference" text,
    "internal_notes" text,
    "effective_date" date,
    "recorded_by" uuid,
    "recorded_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_artifact_reviews" (
    "id" uuid not null default gen_random_uuid(),
    "artifact_version_id" uuid not null,
    "workspace_id" uuid not null,
    "reviewer_type" text not null,
    "reviewer_user_id" uuid not null,
    "decision" text not null,
    "comments" text,
    "reviewed_at" timestamp with time zone not null default now(),
    "request_id" uuid not null
);

create table "public"."partner_onboarding_artifact_versions" (
    "id" uuid not null default gen_random_uuid(),
    "artifact_id" uuid not null,
    "workspace_id" uuid not null,
    "version_number" integer not null,
    "source_workspace_version" bigint not null,
    "source_section_revisions" jsonb not null default '{}'::jsonb,
    "source_asset_versions" jsonb not null default '{}'::jsonb,
    "normalized_snapshot" jsonb not null default '{}'::jsonb,
    "snapshot_hash" text not null,
    "generator_version" text not null,
    "rendered_content" jsonb not null default '{}'::jsonb,
    "generation_status" text not null default 'pending'::text,
    "generation_error_code" text,
    "approval_status" text not null default 'draft'::text,
    "partner_review_status" text not null default 'not_requested'::text,
    "partner_visible_instructions" text,
    "source_drift_invalidated_at" timestamp with time zone,
    "source_drift_fields" text[] not null default '{}'::text[],
    "invalidated_against_snapshot_hash" text,
    "generated_by" uuid not null,
    "generated_at" timestamp with time zone not null default now(),
    "superseded_at" timestamp with time zone,
    "request_id" uuid not null
);

create table "public"."partner_onboarding_artifacts" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "partner_record_id" uuid not null,
    "artifact_type" text not null,
    "current_version_id" uuid,
    "lifecycle_status" text not null default 'not_generated'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_assets" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "partner_record_id" uuid not null,
    "category" text not null,
    "bucket_id" text not null default 'rcap-partner-onboarding-private'::text,
    "object_path" text not null,
    "original_filename" text not null,
    "safe_filename" text not null,
    "media_type" text not null,
    "file_extension" text not null,
    "byte_size" bigint not null,
    "width_pixels" integer,
    "height_pixels" integer,
    "sha256_hex" text,
    "lifecycle_status" text not null default 'pending_review'::text,
    "review_status" text not null default 'pending'::text,
    "review_reason" text,
    "replaced_by_asset_id" uuid,
    "uploaded_by" uuid not null,
    "uploaded_at" timestamp with time zone not null default now(),
    "deleted_by" uuid,
    "deleted_at" timestamp with time zone,
    "deletion_reason" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_authorizations" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "organization_information_accurate" boolean not null,
    "program_scope_approved_for_configuration" boolean not null,
    "brand_assets_authorized_for_use" boolean not null,
    "no_eligibility_or_outcome_guarantee_understood" boolean not null,
    "contested_and_representation_matters_follow_escalation_plan" boolean not null,
    "dashboard_users_authorized" boolean not null,
    "legalease_may_prepare_draft_implementation_materials" boolean not null,
    "approver_name" text not null,
    "approver_title" text not null,
    "approver_user_id" uuid not null,
    "approver_work_email" text not null,
    "authorization_timestamp" timestamp with time zone not null,
    "terms_or_schema_version" text not null,
    "request_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_change_request_internal_notes" (
    "id" uuid not null default gen_random_uuid(),
    "change_request_id" uuid not null,
    "note" text not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_change_requests" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "section_id" uuid not null,
    "status" text not null default 'open'::text,
    "partner_safe_instructions" text not null,
    "requested_by" uuid not null,
    "requested_at" timestamp with time zone not null default now(),
    "partner_response" text,
    "responded_by" uuid,
    "responded_at" timestamp with time zone,
    "resolved_by" uuid,
    "resolved_at" timestamp with time zone,
    "resolution_reason" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_contacts" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "role" text not null,
    "name" text not null,
    "title" text not null,
    "organization" text,
    "work_email" text not null,
    "phone" text,
    "revision" bigint not null default 1,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_idempotency" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "operation_key" text not null,
    "request_id" uuid not null,
    "actor_user_id" uuid not null,
    "payload_hash" text not null,
    "result_status" text not null default 'started'::text,
    "result_workspace_version" bigint,
    "result_section_revision" bigint,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone
);

create table "public"."partner_onboarding_integration_events" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "partner_record_id" uuid not null,
    "event_type" text not null,
    "event_schema_version" text not null default '1'::text,
    "workspace_aggregate_version" bigint not null,
    "workspace_status" text not null,
    "completion_percentage" integer not null,
    "blocker_code" text,
    "next_action_code" text,
    "next_action_owner" text not null,
    "target_launch_date" date,
    "section_key" text,
    "section_status" text,
    "artifact_category" text,
    "artifact_status" text,
    "idempotency_key" text not null,
    "occurred_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_launch_approvals" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "approval_type" text not null,
    "reviewer_type" text not null,
    "reviewer_user_id" uuid not null,
    "decision" text not null,
    "comments" text,
    "recorded_at" timestamp with time zone not null default now(),
    "invalidated_at" timestamp with time zone,
    "request_id" uuid not null
);

create table "public"."partner_onboarding_launch_checks" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "partner_record_id" uuid not null,
    "check_key" text not null,
    "category" text not null,
    "owner_type" text not null,
    "determination" text not null,
    "blocking" boolean not null,
    "status" text not null default 'not_started'::text,
    "evidence_summary" text,
    "evidence_reference" text,
    "checked_at" timestamp with time zone,
    "checked_by" uuid,
    "invalidated_at" timestamp with time zone,
    "invalidated_reason" text,
    "request_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_planned_users" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "name" text not null,
    "work_email" text not null,
    "requested_role" text not null,
    "special_permissions" text[] not null default '{}'::text[],
    "training_attendee" boolean not null default false,
    "revision" bigint not null default 1,
    "training_status" text not null default 'not_started'::text,
    "training_completed_at" timestamp with time zone,
    "invitation_status" text not null default 'not_invited'::text,
    "membership_status" text not null default 'planned'::text,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_prefill_batches" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "partner_record_id" uuid not null,
    "status" text not null default 'draft'::text,
    "source_summary" text not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "applied_at" timestamp with time zone,
    "superseded_at" timestamp with time zone,
    "aggregate_version" bigint not null default 1,
    "request_id" uuid not null
);

create table "public"."partner_onboarding_prefill_values" (
    "id" uuid not null default gen_random_uuid(),
    "batch_id" uuid not null,
    "workspace_id" uuid not null,
    "section_key" text not null,
    "field_key" text not null,
    "proposed_value" jsonb not null,
    "source_type" text not null,
    "source_reference_id" text,
    "source_label" text not null,
    "confidence" numeric(5,4),
    "review_status" text not null default 'proposed'::text,
    "base_value_hash" text not null,
    "proposed_value_hash" text not null,
    "base_section_revision" bigint not null,
    "applied_value_hash" text,
    "applied_section_revision" bigint,
    "applied_workspace_version" bigint,
    "partner_review_status" text not null default 'not_applied'::text,
    "partner_reviewed_at" timestamp with time zone,
    "partner_reviewed_section_revision" bigint,
    "partner_modified" boolean not null default false,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "reviewed_by" uuid,
    "reviewed_at" timestamp with time zone,
    "applied_at" timestamp with time zone,
    "superseded_at" timestamp with time zone
);

create table "public"."partner_onboarding_report_recipients" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "contact_id" uuid,
    "name" text,
    "work_email" text not null,
    "revision" bigint not null default 1,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."partner_onboarding_sections" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "section_key" text not null,
    "response_data" jsonb not null default '{}'::jsonb,
    "revision" bigint not null default 1,
    "status" text not null default 'not_started'::text,
    "completion_percentage" integer not null default 0,
    "missing_required_keys" text[] not null default '{}'::text[],
    "first_started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "approved_by" uuid,
    "waived_at" timestamp with time zone,
    "waived_by" uuid,
    "waiver_reason" text,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "review_reason" text
);

create table "public"."partner_onboarding_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "partner_slug" text not null,
    "task_key" text not null,
    "title" text not null,
    "description" text,
    "status" text not null default 'not_started'::text,
    "owner" text not null default 'legalease'::text,
    "required" boolean not null default true,
    "completed_at" timestamp with time zone,
    "completed_by" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."partner_packet_entitlement" (
    "id" uuid not null default gen_random_uuid(),
    "partner_id" uuid not null,
    "entitlement_scope" text not null default 'sponsored_packets'::text,
    "packet_cap" integer not null,
    "overage_enabled" boolean not null default false,
    "overage_cap" integer not null default 0,
    "pause_at_cap" boolean not null default true,
    "contract_note" text,
    "effective_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."rcap_screening_analytics_events" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" uuid not null,
    "partner_slug" text not null,
    "partner_access_code_id" uuid,
    "campaign_name" text,
    "event_type" text not null,
    "outcome_category" text,
    "packet_route_available" boolean,
    "occurred_at" timestamp with time zone not null default now(),
    "metadata" jsonb not null default '{}'::jsonb
);

alter table "public"."consumer_briefcase_items" add column "currency" text;

alter table "public"."consumer_briefcase_items" add column "payment_authority" text;

alter table "public"."consumer_briefcase_items" add column "payment_matter_id" uuid;

alter table "public"."consumer_briefcase_items" add column "payment_person_id" uuid;

alter table "public"."consumer_briefcase_items" add column "payment_product_id" text;

alter table "public"."consumer_briefcase_items" add column "payment_recorded_at" timestamp with time zone;

alter table "public"."consumer_briefcase_items" add column "payment_recorded_by" text;

alter table "public"."consumer_briefcase_items" add column "provider_event_id" text;

alter table "public"."partner_entitlement" add column "overage_amount_cents" integer not null default 0;

alter table "public"."partner_entitlement" add column "overage_enabled" boolean not null default false;

alter table "public"."partner_entitlement" add column "overage_packet_price_cents" integer not null default 5000;

alter table "public"."partner_entitlement" add column "overage_packets" integer not null default 0;

alter table "public"."partner_entitlement" add column "pause_at_cap" boolean not null default false;

alter table "public"."partner_records" add column "access_mode" text not null default 'open'::text;

alter table "public"."partner_records" add column "paid_at" timestamp with time zone;

alter table "public"."partner_records" add column "payment_amount" integer;

alter table "public"."partner_records" add column "payment_currency" text;

alter table "public"."partner_records" add column "selected_package_id" text;

alter table "public"."partner_records" add column "selected_package_name" text;

alter table "public"."partner_records" add column "stripe_checkout_session_id" text;

alter table "public"."partner_records" add column "stripe_customer_id" text;

alter table "public"."partner_records" add column "stripe_payment_intent_id" text;

alter table "public"."partner_records" alter column "payment_status" set default 'unpaid'::text;

alter table "public"."partner_records" alter column "provisioning_status" set default 'blocked_payment_required'::text;

alter table "public"."rcap_document_packets" add column "arrest_or_case_numbers" text;

alter table "public"."rcap_document_packets" add column "cannabis_signal" boolean;

alter table "public"."rcap_document_packets" add column "cook_county_district" text;

alter table "public"."rcap_document_packets" add column "date_of_birth_private_placeholder" text;

alter table "public"."rcap_document_packets" add column "disposition" text;

alter table "public"."rcap_document_packets" add column "education_waiver_signal" boolean;

alter table "public"."rcap_document_packets" add column "excluded_offense_signal" boolean;

alter table "public"."rcap_document_packets" add column "gender_private_placeholder" text;

alter table "public"."rcap_document_packets" add column "has_rap_sheet" boolean;

alter table "public"."rcap_document_packets" add column "needs_rap_sheet" boolean;

alter table "public"."rcap_document_packets" add column "other_names_used" text;

alter table "public"."rcap_document_packets" add column "qualified_probation_completed_date" text;

alter table "public"."rcap_document_packets" add column "race_private_placeholder" text;

alter table "public"."rcap_document_packets" add column "remedy_type" text;

alter table "public"."rcap_document_packets" add column "sentence_termination_date" text;

alter table "public"."rcap_document_packets" add column "supervision_completed_date" text;

alter table "public"."screening_sessions" add column "attribution_source" text;

alter table "public"."screening_sessions" add column "campaign_name" text;

alter table "public"."screening_sessions" add column "nudge_opted_out_at" timestamp with time zone;

alter table "public"."screening_sessions" add column "nudge_touch1_claimed_at" timestamp with time zone;

alter table "public"."screening_sessions" add column "nudge_touch1_sent_at" timestamp with time zone;

alter table "public"."screening_sessions" add column "nudge_touch2_claimed_at" timestamp with time zone;

alter table "public"."screening_sessions" add column "nudge_touch2_sent_at" timestamp with time zone;

alter table "public"."screening_sessions" add column "partner_access_code_id" uuid;

alter table "public"."screening_sessions" add column "partner_benefit_active" boolean not null default false;
